"""
Textract Document Processing Lambda Function

This Lambda function is invoked by the Step Functions state machine and is responsible for:
1. Retrieving document processing messages from SQS
2. Starting asynchronous Textract document analysis jobs for each document
3. Updating the workflow status in DynamoDB
4. Returning job IDs to the Step Functions state machine

The function uses Amazon Textract to extract text, forms, and tables from documents.
Results are stored in S3 and notifications are sent to SNS when jobs complete.
"""
import botocore.exceptions
import boto3
import json
import logging
import os
from boto3.dynamodb.types import TypeDeserializer
from botocore.config import Config

# Disable Boto3 retries since the message will be processed
# via notification channel
retry_config = Config(
   retries = {
      'max_attempts': 0,
      'mode': 'standard'
   }
)

# Initialize AWS service clients
deserializer = TypeDeserializer()
sfn = boto3.client('stepfunctions')
sqs = boto3.client('sqs')
textract = boto3.client('textract', config=retry_config)
ddb = boto3.client('dynamodb')
s3 = boto3.client('s3')
logger = logging.getLogger(__name__)

def get_msg_submit(event, env_vars, num_msgs):
    """
    Retrieves messages from SQS and submits Textract jobs for each document.
    
    Args:
        event: Event data from Step Functions
        env_vars: Environment variables
        num_msgs: Maximum number of messages to retrieve from SQS
        
    Returns:
        list: List of Textract job IDs
    """
    try:
        logger.debug("Getting messages from SQS Queue")
        sqsresponse = sqs.receive_message(QueueUrl=env_vars['PII_QUEUE'],
                                          MaxNumberOfMessages=num_msgs,
                                          VisibilityTimeout=10,
                                          WaitTimeSeconds=5)   # Long poll to get as many messages as possible (max 10)
        logger.debug(json.dumps(sqsresponse))

        messages = [{"doc": json.loads(msg['Body']), "ReceiptHandle": msg['ReceiptHandle']} for msg in sqsresponse['Messages']]
        logger.debug(json.dumps(messages))

        jobs=[]        
        for message in messages:
            doc = message['doc']
            msg_handle = message['ReceiptHandle']

            logger.debug(f"Starting Async Textract job for workflow: {doc['workflow_id']}, document: {doc['document_name']}")
            try:
                # Start asynchronous Textract document analysis job
                # - Extract text, forms, and tables from the document
                # - Configure SNS notification for job completion
                # - Store results in S3
                txrct_response = textract.start_document_analysis(
                                        DocumentLocation={
                                            'S3Object': {
                                                'Bucket': env_vars['INPUT_BKT'],
                                                'Name': f"public/{doc['input_path']}{doc['document_name']}",
                                            }
                                        },
                                        FeatureTypes=['TABLES','FORMS'],
                                        JobTag=doc['workflow_id'],
                                        NotificationChannel={
                                            'SNSTopicArn': env_vars['SNS_TOPIC'],
                                            'RoleArn': env_vars['SNS_ROLE']
                                        },
                                        OutputConfig={
                                            'S3Bucket': env_vars['INPUT_BKT'],
                                            'S3Prefix': f"public/output/{doc['workflow_id']}"
                                        }
                                    )
                logger.debug(json.dumps(txrct_response))            
                jobs.append(txrct_response['JobId'])                
            except botocore.exceptions.ClientError as error:
                if (error.response['Error']['Code'] == 'LimitExceededException'
                    or error.response['Error']['Code'] == 'ThrottlingException'
                    or error.response['Error']['Code'] == 'ProvisionedThroughputExceededException'
                    ):
                    logger.warn('API call limit exceeded; backing off...')
                    raise error
                else:
                    pass

            # delete SQS Messages here
            sqs.delete_message(QueueUrl=env_vars['PII_QUEUE'], ReceiptHandle=msg_handle)
            logger.debug(f"Textract Analyze document job submitted with job id : {txrct_response['JobId']}, and SQS Message deleted.")
        
        return jobs
    except Exception as error:
        raise error

def sf_invoked(event, env_vars):
    """
    Handles invocation from Step Functions state machine.
    
    Updates the workflow status in DynamoDB with the Step Functions callback token
    and submits Textract jobs for documents in the workflow.
    
    Args:
        event: Event data from Step Functions
        env_vars: Environment variables
        
    Returns:
        list: List of Textract job IDs or the original event if an error occurs
    """
    # Pickup messages from the queue and check the workflow_id and submit Textract Async Jobs    
    try:        
        logger.debug(f"Starting Processing for Workflow ID: {event['workflow_id']}")
        # Store the Step Functions callback token in DynamoDB
        # This token will be used later to resume the state machine execution
        wf_update = f"UPDATE \"{env_vars['PII_TABLE']}\" SET workflow_token=? WHERE part_key=? AND sort_key=?"
        ddb.execute_statement(Statement=wf_update, Parameters=[
                                                        {'S': event['token']},
                                                        {'S': event['workflow_id']},
                                                        {'S': f"input/{event['workflow_id']}/"}
                                                    ])
        logger.debug("Updated DynamoDB Item with Step Function Callback Token")
        # Get messages from SQS and submit Textract jobs
        jobs = get_msg_submit(event, env_vars, 10)
        return jobs
    except Exception as error:        
        logger.error(error)
        return event

def lambda_handler(event, context):
    """
    Lambda handler function invoked by Step Functions state machine.
    
    Args:
        event: Event data from Step Functions containing workflow_id, token, and bucket
        context: Lambda context
        
    Returns:
        list: List of Textract job IDs
    """
    log_level = os.environ.get('LOG_LEVEL', 'INFO')    
    logger.setLevel(log_level)
    logger.info(json.dumps(event))
    
    # Collect environment variables
    env_vars = {}
    for name, value in os.environ.items():
        env_vars[name] = value

    # Process the Step Functions invocation
    return sf_invoked(event, env_vars)
