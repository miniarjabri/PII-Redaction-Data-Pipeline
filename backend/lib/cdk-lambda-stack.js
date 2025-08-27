const { Stack, CfnOutput, Duration } = require('aws-cdk-lib');
const { S3EventSource, SnsEventSource } = require('aws-cdk-lib/aws-lambda-event-sources');
const iam = require('aws-cdk-lib/aws-iam');
const s3 = require('aws-cdk-lib/aws-s3');
const lambda = require('aws-cdk-lib/aws-lambda');
const cr = require('aws-cdk-lib/custom-resources');
const path = require('path');

class PIILambdaStack extends Stack{
    
    static TextractAsync;
    static InitWorkflow;
    static GetWorkflowFn;
    static ProcessTextractOp;
    static UpdateWorkflow;
    static TextractAsyncBulk;
    static PhiDetection;
    static PhiStatusCheck;
    static PhiProcessOutput;
    static PrepRedact;
    static RedactDocuments;    

    constructor(scope, id, props){
        super(scope, id, props);
        
        const inputBucketName = props.inputBucket.bucketName;

        /**
         * Lambda as S3 trigger to invoke Step Function PII flow
         */

        const initSMFn = new lambda.DockerImageFunction(this, 'med-init-state-machine',{
            functionName: 'med-init-state-machine',
            description: 'PII Redaction Lambda Function set as S3 trigger to invoke AWS Step Function State Machine',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "machine-state.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            role: props.lambdaRole,
            timeout: Duration.minutes(1),
            memorySize: 128
        });

        this.InitWorkflow = initSMFn;

        //Add the Lambda as a trigger to the PII Input bucket prefix public/workflows/
        /**
         * Adding S3 Trigger with the S3 bucket object directly causes cyclic dependency in the stacks
         * as explained here - 
         * https://aws.amazon.com/blogs/mt/resolving-circular-dependency-in-provisioning-of-amazon-s3-buckets-with-aws-lambda-event-notifications/
         * So we will import a bucket using fromBucketName and use that instead
         */

        const inputBucket = s3.Bucket.fromBucketName(this, 'temp-input-bkt', inputBucketName)
        
        initSMFn.addEventSource(new S3EventSource(inputBucket, {
            events: [s3.EventType.OBJECT_CREATED],
            filters: [{ prefix: 'public/workflows/'}]
        }));
        
        
        const initTextractFn = new lambda.DockerImageFunction(this, 'med-init-textract-process',{
            functionName: 'med-init-textract-process',
            description: 'PII Lambda Function to process docs using StartDocumentAnalysis from Step Function',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "extract.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            role: props.lambdaRole,
            timeout: Duration.minutes(5),
            memorySize: 128
        });

        this.TextractAsync = initTextractFn;


        /**
         * Lambda function for the UI (client) to get data from DynamoDB table
         */
        const getWorkflowFn = new lambda.DockerImageFunction(this, 'med-get-workflow',{
            functionName: 'med-get-workflow',
            description: 'Lambda Function to get workflow records from DynamoDB',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "get-workflows.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                PII_TABLE: props.table.tableName,                
                BKT: inputBucketName
            },
            role: props.lambdaRole,
            timeout: Duration.seconds(10),
            memorySize: 128
        });        

        const getWorkflowFnURL = getWorkflowFn.addFunctionUrl({
            authType: lambda.FunctionUrlAuthType.AWS_IAM,
            cors:{
                allowedOrigins: ['*'],
                allowedMethods: ['GET','POST'],
                allowedHeaders: ['*'],
                // CORS / 
                allowCredentials: true
            }
        });

        new CfnOutput(this, 'get-wf-lambda-url', {
            value: getWorkflowFnURL.url,
            description: 'Get Workflows Lambda URL',
            exportName: 'getWfFunctionUrl'
        });

        this.GetWorkflowFn = getWorkflowFn;
        new cr.AwsCustomResource(this, 'update-getwf-url-lambda-permission', {
            onCreate: {
                service: 'Lambda',
                action: 'addPermission',
                parameters: {
                    FunctionName: getWorkflowFn.functionArn,
                    Action: "lambda:InvokeFunctionUrl",
                    Principal: props.cognitoAuthRole,
                    StatementId: "lambda-function-url-invoke-policy",
                    FunctionUrlAuthType: "AWS_IAM"
                },
                physicalResourceId: cr.PhysicalResourceId.of(`lambda-getwf-url-update`),
                },
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                            resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                        }),
                installLatestAwsSdk: true
        });

        /**
         * Lambda function to update the workflow Item in Dynamo DB 
         */
         const updateWorkflowFn = new lambda.DockerImageFunction(this, 'med-update-workflow',{
            functionName: 'med-update-workflow',
            description: 'Updates the workflow status in Dynamo db',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "update-wf-status.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                PII_TABLE: props.table.tableName
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(2),
            memorySize: 128
        }); 

        this.UpdateWorkflow = updateWorkflowFn;

        /**
         * Lambda function to generate textract JSON and Excel report. Called from PIITextractAsyncBulk asynchronously
         */
        const processTextractOpFn = new lambda.DockerImageFunction(this, 'med-process-textract-op',{
            functionName: 'med-process-textract-op',
            description: 'Lambda Function to to Process Textract outputs',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "textract-output.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                PII_TABLE: props.table.tableName,
                BKT: inputBucketName
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(10),
            memorySize: 256
        }); 

        this.ProcessTextractOp = processTextractOpFn;                

        /**
         * Lambda function subscribes to the Textract SNS topic to get job completion notifications, call the post process lambda to genereate report, and process remaining documents
         * for the workflow (if any)
         */
         const initTextractBulkFn = new lambda.DockerImageFunction(this, 'med-init-textract-process-bulk',{
            functionName: 'med-init-textract-process-bulk',
            description: 'Lambda Function to process docs using StartDocumentAnalysis from Step Function and post process output from job completions',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "textract-bulk.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            role: props.lambdaRole,
            timeout: Duration.minutes(10),
            memorySize: 128
        });

        this.TextractAsyncBulk = initTextractBulkFn;

        // Subscribe to the SNS Topic where Textract will send notifications
        initTextractBulkFn.addEventSource(new SnsEventSource(props.snsTopic));

        /**
         * Lambda function to detect PHI entities
         */
         const phiDetection = new lambda.DockerImageFunction(this, 'med-phi-detection', {
            functionName: 'med-phi-detection',
            description: 'Lambda function to detect PHI using Amazon Comprehend Medical StartPHIDetectionJob async API',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "pii-detection.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                IAM_ROLE: props.compMedDataRole.roleArn,
                PII_TABLE: props.table.tableName
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(10),
            memorySize: 512
        });

        this.PhiDetection = phiDetection;

        /**
         * Lambda function to check PHI detection Job status
         */

         const phiStatusCheck = new lambda.DockerImageFunction(this, 'med-phi-status-check', {
            functionName: 'med-phi-status-check',
            description: 'Lambda function to check status of Amazon Comprehend Medical PHI Detection Job',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "status-check.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                PII_TABLE: props.table.tableName
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(13),
            memorySize: 128
        });

        this.PhiStatusCheck = phiStatusCheck;

        /**
         * Lambda function to process the PHI output files
         */

         const phiProcessOutput = new lambda.DockerImageFunction(this, 'med-phi-process-output', {
            functionName: 'med-phi-process-output',
            description: 'Lambda function to process output of Amazon Comprehend Medical PHI Detection Job and copy original documents',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "pii-output.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                PII_TABLE: props.table.tableName
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(10),
            memorySize: 512
        });

        this.PhiProcessOutput = phiProcessOutput;


        /**
         * Lambda function to prep documents for redaction
         */

         const prepRedact = new lambda.DockerImageFunction(this, 'med-prep-redact', {
            functionName: 'med-prep-redact',
            description: 'Lambda function to prepare documents for redaction and converts TIFF files to PDF (if any)',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "prep-doc-for-redaction.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG'
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(15),
            memorySize: 1024 // Increased memory for better performance
        });

        this.PrepRedact = prepRedact;

        /**
         * Lambda function to redact documents
         */

         const redactDocuments = new lambda.DockerImageFunction(this, 'med-redact-documents', {
            functionName: 'med-redact-documents',
            description: 'Lambda function that uses PHI entities and Amazon Textract geometry to redact documents',
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../src/lambda'), {
                        cmd: [ "redact.lambda_handler" ],
                        entrypoint: ["/lambda-entrypoint.sh"],
                        platform: "linux/amd64"
                    }),
            environment:{
                LOG_LEVEL: 'DEBUG',
                FORCE_RECREATE: 'true'
            },
            role: props.lambdaRole,
            timeout: Duration.minutes(15),
            memorySize: 2048, // Significantly increased memory for the redaction process
            reservedConcurrentExecutions: 10 // Reserve concurrent executions to prevent throttling
        });
        
        // Add provisioned concurrency to eliminate cold starts
        const version = redactDocuments.currentVersion;
        const alias = new lambda.Alias(this, 'RedactDocumentsAlias', {
            aliasName: 'production',
            version: version
        });
        
        // Set provisioned concurrency to 5 to handle multiple document processing requests without cold starts
        alias.addAutoScaling({
            minCapacity: 2,
            maxCapacity: 10,
            utilizationTarget: 0.7
        });

        this.RedactDocuments = redactDocuments;
        
    }
}

module.exports = { PIILambdaStack }
