"""
Machine State Lambda Function

This Lambda function is triggered when a workflow configuration file is uploaded to the S3 bucket.
It serves as the entry point for the PII redaction workflow by:
1. Reading the workflow configuration from S3
2. Storing workflow metadata in DynamoDB
3. Sending messages to SQS for each document to be processed
4. Starting the Step Functions state machine to orchestrate the workflow

The workflow configuration file should be a JSON file with information about the documents
to be processed and redaction settings.
"""
import json
import urllib.parse
import boto3
import json
import logging
import os

# Initialize AWS service clients
s3 = boto3.client('s3')
ddb = boto3.client('dynamodb')
sqs = boto3.client('sqs')
sfn = boto3.client('stepfunctions')

logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    """
    Lambda handler function triggered by S3 event when a workflow file is uploaded.
    
    Args:
        event: S3 event containing information about the uploaded file
        context: Lambda context
        
    Returns:
        dict: Success status
    """
    log_level = os.environ.get('LOG_LEVEL', 'INFO')    
    logger.setLevel(log_level)
    logger.info(json.dumps(event))
    
    # Get environment variables
    piiTable = os.environ.get('PII_TABLE')
    sqsUrl = os.environ.get('PII_QUEUE')
    sfnArn = os.environ.get('STATE_MACHINE')

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    # root_prefix = event['Records'][0]['s3']['object']['key'].split("/")[0]
    try:
        response = s3.get_object(Bucket=bucket, Key=key)        
        content = response['Body']
        jsonObject = json.loads(content.read())
        logger.debug(json.dumps(jsonObject))

        # Store workflow metadata in DynamoDB for tracking
        stmt = f"INSERT INTO \"{piiTable}\" VALUE {{'part_key' : ?, 'sort_key' : ?, 'status': ?, 'docs': ?, 'submit_ts': ?, 'total_files': ?, 'redact': ?, 'retain_orig_docs': ?, 'redaction_status': ?}}"
        logger.debug(stmt)
        ddresponse = ddb.execute_statement(Statement=stmt, Parameters=jsonObject);
        logger.debug(json.dumps(ddresponse))

        # Extract workflow information from the JSON object
        workflow_id=jsonObject[0]['S']  # Unique identifier for this workflow
        input_path=jsonObject[1]['S']   # Path to input documents
        docs=jsonObject[3]['M']         # Dictionary of documents to process

        # Send a message to SQS for each document to be processed
        # These messages will be picked up by the Textract processing Lambda
        logger.debug("Sending messages to SQS")
        for doc in docs.keys():
            msg = dict(workflow_id= workflow_id, input_path= input_path, document_name= doc)
            logger.debug(json.dumps(msg))
            sqsresponse = sqs.send_message(QueueUrl=sqsUrl, MessageBody=json.dumps(msg))            
            logger.debug(sqsresponse)

            # Commented out code for creating temporary processing files
            # logger.debug(f"Creating temp processing file {root_prefix}/temp/{workflow_id}/{doc}.json")
            # obj = {doc: {"S": "ready"}}
            # s3.put_object(Body=json.dumps(obj),Bucket=bucket,Key=f'{root_prefix}/temp/{workflow_id}/{doc}.json')
            
        # Prepare payload for Step Functions state machine
        sfnPayload = dict(workflow_id=workflow_id, bucket=bucket)
        
        # Start Step Functions state machine to orchestrate the workflow
        # This will coordinate the document processing, PII detection, and redaction
        logger.debug("Starting Step function state machine")
        logger.debug(sfnPayload)
        sfnResponse = sfn.start_execution(
                            stateMachineArn=sfnArn,
                            name=f'workflow-{workflow_id}',
                            input=json.dumps(sfnPayload)
                        )
        logger.debug(sfnResponse)
        logger.debug("Done...")

        return dict(Success=True)
    except Exception as e:        
        logger.error('Error: {}'.format(e))
        raise e
