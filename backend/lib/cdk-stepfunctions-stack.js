/**
 * This file defines the AWS Step Functions state machine that orchestrates the PII/PHI redaction pipeline.
 * The state machine coordinates a series of Lambda functions to process documents through multiple stages:
 * 1. Text extraction with Amazon Textract
 * 2. PHI (Protected Health Information) detection with Amazon Comprehend Medical
 * 3. Document preparation for redaction
 * 4. Actual redaction of sensitive information
 * 
 * The workflow handles asynchronous operations, parallel processing, and error conditions.
 */

const { Stack } = require('aws-cdk-lib');
const sfn = require('aws-cdk-lib/aws-stepfunctions');
const cr = require('aws-cdk-lib/custom-resources');
const tasks = require('aws-cdk-lib/aws-stepfunctions-tasks');
const path = require('path');


/**
 * PIIStepFunctionStack creates the Step Functions state machine and all associated resources
 * for orchestrating the document processing workflow from upload to redaction
 */
class PIIStepFunctionStack extends Stack{    
    constructor(scope, id, props){
        super(scope, id, props);
        const inputBucketName = props.inputBucket.bucketName;

        /**
         * Step Functions Task Definitions
         * Each task invokes a specific Lambda function that performs part of the workflow
         */                
        /**
         * STEP 1: Document Text Extraction
         * Invokes Lambda that starts Textract jobs and waits for their completion
         * Uses WAIT_FOR_TASK_TOKEN integration pattern for asynchronous processing:
         * - Step Functions pauses execution and provides a task token
         * - Lambda starts Textract job and includes token in notification configuration
         * - When job completes, SNS notification triggers callback that returns the token
         * - Step Functions then resumes execution with results
         */
        const textractAsyncStep = new tasks.LambdaInvoke(this, "textract-async-sm", {
          comment: "Process Docs Textract Async",
          lambdaFunction: props.initTextractSM1,
          integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
          payload: sfn.TaskInput.fromObject({
              // SNS Notification must contain this task token, workflow id (part_key) and document ID (sort_key). We will use AsyncJobs ClientRequestToken and JobTag
              // The job tag will be included in the SNS notification message
              token: sfn.JsonPath.taskToken,  
              // the lambda function is invoked with json { 'data': { 'workflow_id': 'xxxx', 'bucket': 'xxx' } 
              // which is the payload used to invoke the state machine       
              workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
              bucket: sfn.JsonPath.stringAt('$.bucket')
          }),
          outputPath: '$.Payload',                                            
        });

        /**
         * STEP 2: Update Workflow Status
         * Updates DynamoDB with current workflow status after Textract processing
         * Records paths to extracted text files for PHI detection in the next step
         */
        const textractAsyncStatusUpdateStep = new tasks.LambdaInvoke(this, "update-workflow-status", {
          comment: "Update workflow status",
          lambdaFunction: props.updateWorkflow,
          payload: sfn.TaskInput.fromObject({                                              
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            bucket: sfn.JsonPath.stringAt('$.bucket'),
            tmp_process_dir: sfn.JsonPath.stringAt('$.tmp_process_dir'),
            phi_input_dir: sfn.JsonPath.stringAt('$.phi_input_dir')
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 3: PHI Detection
         * Starts Amazon Comprehend Medical asynchronous PHI detection job
         * Analyzes extracted text to identify Protected Health Information
         * Returns a job ID that will be used to check status and retrieve results
         */
        const phiDetectionStep = new tasks.LambdaInvoke(this, "phi-detection", {
          comment: "Start PHI detection Job",
          lambdaFunction: props.phiDetection,
          payload: sfn.TaskInput.fromObject({                                              
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            bucket: sfn.JsonPath.stringAt('$.bucket'),
            redact: sfn.JsonPath.stringAt('$.redact'),
            phi_input_dir: sfn.JsonPath.stringAt('$.phi_input_dir')
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 4: Check PHI Job Status
         * Polls the Comprehend Medical PHI detection job status
         * This step may be called repeatedly in a loop until the job completes
         * After completion, flow proceeds to process results or handle failures
         */
        const phiStatusCheckStep = new tasks.LambdaInvoke(this, "phi-detection-status-check", {                                                                            
          comment: "phi-detection-status-check",
          lambdaFunction: props.phiStatusCheck,
          payload: sfn.TaskInput.fromObject({                                              
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            phi_job_id: sfn.JsonPath.stringAt('$.phi_job_id'),
            phi_output_dir: sfn.JsonPath.stringAt('$.phi_output_dir'),
            bucket: sfn.JsonPath.stringAt('$.bucket')
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 5: Process PHI Detection Results
         * Processes the output files from PHI detection job
         * Prepares the detected PHI entities for use in redaction
         * Creates structured data that maps PHI entities to document locations
         */
        const phiPostProcess = new tasks.LambdaInvoke(this, "phi-post-process", {                                                                            
          comment: "phi-post-process",
          lambdaFunction: props.phiProcessOutput,
          payload: sfn.TaskInput.fromObject({                                              
            bucket: sfn.JsonPath.stringAt('$.bucket'),
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            phi_output_dir: sfn.JsonPath.stringAt('$.phi_output_dir')
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 6: Prepare Documents for Redaction
         * Prepares document files for the redaction process
         * Converts TIFF files to PDF format if needed
         * Ensures documents are in proper format for redaction
         */
        const prepRedactDocuments = new tasks.LambdaInvoke(this, "prep-documents-for-redaction", {                                                                            
          comment: "prep-documents-for-redaction",
          lambdaFunction: props.prepRedact,
          payload: sfn.TaskInput.fromObject({                                              
            bucket: sfn.JsonPath.stringAt('$.bucket'),
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            retain_docs: sfn.JsonPath.stringAt('$.retain_docs'),
            doc_prefixes: sfn.JsonPath.stringAt('$.doc_prefixes'),
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 7: Redact Documents
         * Uses PHI entities and Textract geometry to apply redactions
         * Creates new versions of documents with sensitive information removed
         * The actual redaction technique uses visual blocks or text replacement
         */
        const redactDocuments = new tasks.LambdaInvoke(this, "pii-redact-documents", {                                                                            
          comment: "pii-redact-documents",
          lambdaFunction: props.redactDocuments,
          payload: sfn.TaskInput.fromObject({                                              
            bucket: sfn.JsonPath.stringAt('$.bucket'),
            workflow_id: sfn.JsonPath.stringAt('$.workflow_id'),
            retain_docs: sfn.JsonPath.stringAt('$.retain_docs'),
            redact_data: sfn.JsonPath.stringAt('$.redact_data'),
          }),
          outputPath: '$.Payload'
        });

        /**
         * STEP 8: Update Final Workflow Status
         * Updates DynamoDB directly to mark workflow as complete
         * Uses DynamoUpdateItem instead of Lambda for this simple update
         * Sets redaction_status to 'processed' to indicate completion
         */
        const phiStatusUpdate = new tasks.DynamoUpdateItem(this, 'phi-status-finalize', {                    
          key:{
            part_key: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.workflow_id')),
            sort_key: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.input_prefix'))
          },
          table: props.piiTable,
          expressionAttributeValues: {
            ':status': tasks.DynamoAttributeValue.fromString('processed')
          },
          updateExpression: 'SET redaction_status = :status'
        });

        /**
         * Success Completion State
         * Terminal state that marks successful workflow completion
         */
        const finalStep = new sfn.Succeed(this, "processSuccess", {comment: "End Flow"});

        /**
         * Error Handling States
         * These states handle various failure scenarios in the workflow
         * Each provides specific error information for troubleshooting
         */
        const phiJobFailed =  new sfn.Fail(this, 'PhiJobFailed', {
                                  error: 'PHIJobFailure',
                                  cause: "Amazon Comprehend Medical Detect PHI Job failed or stopped",
                                  });
        

        const phiJobLaunchFail= new sfn.Fail(this, 'PhiJobLaunchFail', {
                                                          error: 'PHIJobLaunchFailure',
                                                          cause: "Unable to Launch PHI detection Job",
                                                        });

        const phiPostProcessFail= new sfn.Fail(this, 'PhiPostProcessFail', {
                                                                error: 'PhiPostProcessFail',
                                                                cause: "PHI Output Post-processing failed",
                                                              });

        /**
         * Workflow Chain Definitions
         * These sections define how the individual task states connect together
         * to form the complete workflow with decision points and parallel processing
         */
        
        /**
         * Document Redaction Chain
         * Simple two-step sequence for redaction process:
         * 1. Prepare document for redaction
         * 2. Apply redactions to document
         */
        const redactionChain = sfn.Chain.start(prepRedactDocuments)
                               .next(redactDocuments);

        /**
         * Parallel Document Processing (Map State)
         * Processes multiple documents simultaneously using a Map state
         * For each document in doc_list, execute the redactionChain
         */
        const redactMap = new sfn.Map(this, 'redact-documents', {
                                                  inputPath: sfn.JsonPath.stringAt('$'),
                                                  itemsPath: sfn.JsonPath.stringAt('$.doc_list'),                                                  
                                                  parameters:{
                                                    "workflow_id": sfn.JsonPath.stringAt('$.workflow_id'),
                                                    "retain_docs": sfn.JsonPath.stringAt('$.retain_docs'),
                                                    "bucket": sfn.JsonPath.stringAt('$.bucket'),
                                                    "doc_prefixes": sfn.JsonPath.stringAt("$$.Map.Item.Value")                                                    
                                                  },
                                                  // DISCARD sends the Map Task input to its Output which goes as input to next state i.e. phiStatusUpdate
                                                  resultPath: sfn.JsonPath.DISCARD 
                                                });
        redactMap.iterator(redactionChain);

        /**
         * Post-Redaction Chain
         * Steps to execute after all documents are processed:
         * 1. Process all documents in parallel via Map state
         * 2. Construct the proper sort key for DynamoDB update
         * 3. Update final status in DynamoDB
         * 4. Mark workflow as successfully completed
         */
        // Add a Pass state to explicitly construct the input_prefix
        const constructSortKeyPass = new sfn.Pass(this, 'ConstructSortKey', {
          parameters: {
            'workflow_id': sfn.JsonPath.stringAt('$.workflow_id'),
            'bucket': sfn.JsonPath.stringAt('$.bucket'),
            'input_prefix': sfn.JsonPath.stringAt("States.Format('input/{}/', $.workflow_id)")
          }
        });

        const redactMapChain = sfn.Chain.start(redactMap)
                               .next(constructSortKeyPass)
                               .next(phiStatusUpdate)
                               .next(finalStep);

        /**
         * PHI Post-Processing Chain
         * Process PHI results and check for errors:
         * - If error is present, transition to failure state
         * - Otherwise, proceed to document redaction
         */
        const postProcessChain = sfn.Chain.start(phiPostProcess)
                                 .next(new sfn.Choice(this, "Post-processing successful?")
                                       .when(sfn.Condition.isPresent('$.error'), phiPostProcessFail)
                                       .otherwise(redactMapChain));

        /**
         * PHI Status Polling Chain
         * Check PHI job status and determine next action:
         * - If job still running (IN_PROGRESS/SUBMITTED/STOP_REQUESTED), loop back and check again
         * - If job failed (FAILED/STOPPED), transition to failure state
         * - If job completed (COMPLETED), proceed to post-processing
         * This implements a polling loop to monitor the asynchronous PHI detection job
         */
        const phiStatusCheckChain = sfn.Chain.start(phiStatusCheckStep)
                                    .next(new sfn.Choice(this, "Job in-progress?")
                                          .when(sfn.Condition.or(sfn.Condition.stringEquals('$.status', 'IN_PROGRESS'), 
                                                                  sfn.Condition.stringEquals('$.status', 'SUBMITTED'), 
                                                                  sfn.Condition.stringEquals('$.status', 'STOP_REQUESTED')), 
                                                phiStatusCheckStep)
                                          .when(sfn.Condition.or(sfn.Condition.stringEquals('$.status', 'FAILED'), 
                                                                  sfn.Condition.stringEquals('$.status', 'STOPPED')), 
                                                phiJobFailed)
                                          .otherwise(postProcessChain));

        /**
         * PHI Processing Chain
         * Start PHI detection and verify it launched successfully:
         * - If phi_job_id is null (job failed to start), go to failure state
         * - Otherwise, proceed to status checking chain
         */
        const phiProcessChain = sfn.Chain.start(phiDetectionStep)
                                .next(new sfn.Choice(this, "Job launched successfully?")
                                      .when(sfn.Condition.isNull('$.phi_job_id'),
                                            phiJobLaunchFail)
                                      .otherwise(phiStatusCheckChain));
                                  
        /**
         * Main Workflow Definition
         * The complete workflow starting from Textract processing:
         * 1. Extract text with Textract
         * 2. Update workflow status
         * 3. Check if redaction is requested:
         *    - If YES, proceed to PHI detection and redaction
         *    - If NO, complete the workflow
         */
        const sfDefinitions = textractAsyncStep                                       
                              .next(textractAsyncStatusUpdateStep)
                              .next(new sfn.Choice(this, "Redact documents?")
                                    .when(sfn.Condition.booleanEquals('$.redact', true), phiProcessChain)
                                    .otherwise(finalStep));

        /**
         * Create the Step Function State Machine
         * This deploys the actual state machine using our workflow definition
         */
        const stateMachine = new sfn.StateMachine(this, 'workflow-state-machine', {
                                            stateMachineName: 'workflow-state-machine',                        
                                            definition: sfDefinitions
                                        });


        /**
         * Service Integration Configuration
         * The following sections update Lambda environment variables using custom resources
         * This dynamically wires together all components of the workflow at deployment time
         */
        
        /**
         * Configure Initial Workflow Lambda
         * Updates environment variables for the Lambda function that starts the workflow:
         * - Provides DynamoDB table name for workflow tracking
         * - Sets the Step Functions state machine ARN for invocation
         * - Configures SQS queue for job submission
         */
        const physicalResourcePolicy = cr.AwsCustomResourcePolicy.fromSdkCalls({
                                            resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                                        });
        const sdkAction1 = {
            service: 'Lambda',
            action: 'updateFunctionConfiguration',
            parameters: {
              FunctionName: props.initWorkflow.functionArn,
              Environment: {
                Variables: {
                    LOG_LEVEL: 'DEBUG',
                    PII_TABLE: props.piiTable.tableName,
                    STATE_MACHINE: stateMachine.stateMachineArn,
                    PII_QUEUE: props.sqsQueue, 
                },
              },
            },
            physicalResourceId: cr.PhysicalResourceId.of(`lambda-initWorkflow-update`),
          };
        new cr.AwsCustomResource(this, 'update-init-lambda-environ', {
            onCreate: sdkAction1,
            onUpdate: sdkAction1,
            policy: physicalResourcePolicy,
            installLatestAwsSdk: true
        });

        /**
         * Configure Textract Processing Lambda
         * Updates environment variables for the Lambda function that processes documents:
         * - Sets SQS queue for job submission
         * - Configures DynamoDB table for status tracking
         * - Provides S3 bucket name for document storage
         * - Sets SNS topic and role for Textract job notifications
         */
        const sdkAction2 = {
            service: 'Lambda',
            action: 'updateFunctionConfiguration',
            parameters: {
              FunctionName: props.initTextractSM1.functionArn,
              Environment: {
                Variables: {
                    LOG_LEVEL: 'DEBUG',
                    PII_QUEUE: props.sqsQueue,
                    PII_TABLE: props.piiTable.tableName,
                    INPUT_BKT: inputBucketName,
                    SNS_TOPIC: props.snsTopic.topicArn,
                    SNS_ROLE: props.snsRole.roleArn
                },
              },
            },
            physicalResourceId: cr.PhysicalResourceId.of(`lambda-textractasync-update`),
          };
        
        new cr.AwsCustomResource(this, 'update-textractasync-lambda-environ', {
                onCreate: sdkAction2,
                onUpdate: sdkAction2,
                policy: physicalResourcePolicy,
                installLatestAwsSdk: true
        });

        /**
         * Configure Textract Bulk Processing Lambda
         * Updates environment variables for the Lambda that handles bulk document processing:
         * - Sets all necessary connections to other services
         * - Critically, configures which Lambda to call for post-processing
         */
         const sdkAction3 = {
          service: 'Lambda',
          action: 'updateFunctionConfiguration',
          parameters: {
            FunctionName: props.textractAsyncBulk.functionArn,
              Environment: {
                Variables: {
                    LOG_LEVEL: 'DEBUG',
                    PII_QUEUE: props.sqsQueue,
                    PII_TABLE: props.piiTable.tableName,
                    INPUT_BKT: inputBucketName,
                    SNS_TOPIC: props.snsTopic.topicArn,
                    SNS_ROLE: props.snsRole.roleArn,
                  LAMBDA_POST_PROCESS: props.processTextractOp.functionName
              },
            },
          },
          physicalResourceId: cr.PhysicalResourceId.of(`lambda-textractasyncbulk-update`),
        };
      
      new cr.AwsCustomResource(this, 'update-textractasyncbulk-lambda-environ', {
              onCreate: sdkAction3,
              onUpdate: sdkAction3,
              policy: physicalResourcePolicy,
              installLatestAwsSdk: true
      });

      /**
       * Configure Lambda Invocation Permissions
       * Grants the Textract Async Bulk Lambda permission to invoke the post-processing Lambda
       * This is required for the asynchronous callback pattern where one Lambda invokes another
       */
       const sdkAction4 = {
        service: 'Lambda',
        action: 'addPermission',
        parameters: {
          FunctionName: props.processTextractOp.functionArn,
          StatementId: "invoke-permission-for-post-process",
          Action: "lambda:InvokeFunction",
          Principal: "lambda.amazonaws.com",
          SourceArn: props.textractAsyncBulk.functionArn 
        },
        physicalResourceId: cr.PhysicalResourceId.of(`lambda-textractasyncbulk-update`),
      };

      new cr.AwsCustomResource(this, 'update-textractasyncbulk-lambda-invoke', {
        onCreate: sdkAction4,
        onUpdate: sdkAction4,
        policy: physicalResourcePolicy,
        installLatestAwsSdk: true
      });
    }
}

module.exports = { PIIStepFunctionStack }
