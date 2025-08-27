"""
PHI Detection Lambda Function

This Lambda function is responsible for starting PHI (Protected Health Information) detection jobs
using Amazon Comprehend Medical. It processes text extracted from documents to identify
sensitive medical information that needs to be redacted.

The function:
1. Takes input from the Step Functions state machine
2. Starts an asynchronous PHI detection job using Amazon Comprehend Medical
3. Updates the workflow status in DynamoDB if an error occurs
4. Returns the job ID and output directory for the next step in the workflow
"""
import boto3
import os
import json
import logging

# Initialize AWS service clients
comp_med = boto3.client('comprehendmedical')
#comp = boto3.client('comprehend')
logger = logging.getLogger(__name__)
role = os.environ.get('IAM_ROLE')
ddb = boto3.client('dynamodb')

def update_error_state(env_vars, event):
    """
    Updates the workflow status in DynamoDB to 'failed' if an error occurs.
    
    Args:
        env_vars: Environment variables
        event: Event data from Step Functions
    """
    logger.debug('Updating redaction status to failed')
    wf_update = f"UPDATE \"{env_vars['PII_TABLE']}\" SET redaction_status=? WHERE part_key=? AND sort_key=?"
    ddb.execute_statement(Statement=wf_update, Parameters=[
                                                    {'S': 'failed'},
                                                    {'S': event['workflow_id']},
                                                    {'S': f"input/{event['workflow_id']}/"}
                                                ])

def lambda_handler(event, context):
    """
    Lambda handler function invoked by Step Functions state machine.
    
    Starts a PHI detection job using Amazon Comprehend Medical to identify
    sensitive medical information in the extracted text.
    
    Args:
        event: Event data from Step Functions containing workflow_id, phi_input_dir, and bucket
        context: Lambda context
        
    Returns:
        dict: Dictionary containing workflow_id, bucket, phi_job_id, and phi_output_dir
    """
    log_level = os.environ.get('LOG_LEVEL', 'INFO')    
    logger.setLevel(log_level)
    logger.info(json.dumps(event))

    # Collect environment variables
    env_vars = {}
    for name, value in os.environ.items():
        env_vars[name] = value

    # Extract parameters from the event
    workflow_id = event["workflow_id"]
    phi_input_dir = event["phi_input_dir"]  # Directory containing text extracted from documents
    bucket = event["bucket"]
    phi_output_dir = f'public/phi-output/{workflow_id}'  # Output directory for PHI detection results
    phi_job_id = None

    try:
        logger.info("Starting PHI detection job")
        # Start an asynchronous PHI detection job using Amazon Comprehend Medical
        # This job will analyze text files in the input directory to identify PHI entities
        # Results will be stored in the output directory in S3
        response = comp_med.start_phi_detection_job(
                         InputDataConfig={
                             'S3Bucket': bucket,
                             'S3Key': phi_input_dir
                         },
                         OutputDataConfig={
                             'S3Bucket': bucket,
                             'S3Key': phi_output_dir
                         },
                         DataAccessRoleArn=role,  # IAM role that allows Comprehend Medical to access S3
                         JobName=f'phi-job-{workflow_id}',
                         LanguageCode='en'
                     )
        logger.debug(response)
        phi_job_id = response['JobId']  # Get the job ID for tracking the job status
    except Exception as e:
        logger.error("Error occured in launching PHI detection job")
        logger.error(e)
        update_error_state(env_vars=env_vars,event=event)

    # Return information needed for the next step in the workflow
    # The phi_job_id will be used to check the job status
    # The phi_output_dir will be used to process the results
    return dict(workflow_id=workflow_id, bucket=bucket, phi_job_id=phi_job_id, phi_output_dir=phi_output_dir)
