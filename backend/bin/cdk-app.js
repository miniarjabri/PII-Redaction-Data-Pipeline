/**
 * PII Redaction Pipeline - CDK Application Entry Point
 * 
 * This file defines the AWS CDK stacks for the PII Redaction Pipeline.
 * The application uses AWS services to detect and redact PII/PHI from documents.
 */
require('dotenv').config()
const cdk = require('aws-cdk-lib');
const { CdkPIIAppStack } = require('../lib/cdk-app-stack');
const { PIIWebDeployStack } = require('../lib/cdk-web-stack');
const { PIIBackendStack } = require('../lib/cdk-backend-stack');
const { PIILambdaStack } = require('../lib/cdk-lambda-stack');
const { PIIStepFunctionStack } = require('../lib/cdk-stepfunctions-stack');

const app = new cdk.App();

const deployEnv = {account: process.env.AWS_ACCOUNT_ID, region: process.env.PII_REGION}
console.log(deployEnv)

/**
 * Creates App stack : Cognito, S3 Buckets, IAM Roles for Cognito for the React Web App
 * Sets up user authentication and secure document storage with HIPAA-compliant rules
 */
const appStack = new CdkPIIAppStack(app, 'CdkPIIAppStack', { env: deployEnv });



/**
 * Creates a Web stack: Amplify Web App and deploys the React app as front end deployment.
 * Provides the user interface for document upload and workflow management
 */
const webappStack = new PIIWebDeployStack(app, 'PIIWebDeployStack', { env: deployEnv });


/**
 * Creates Backend Stack: S3 Buckets, SQS Queue, SNS Topic, DynamoDB Table, IAM Role for Lambda, IAM Role for AI Services to publish to SNS Topic
 * Provides the backend infrastructure for document processing and workflow tracking
 */
const backendStack = new PIIBackendStack(app, 'PIIBackendStack', { env: deployEnv });
// backendStack.addDependency(appStack);

/**
 * Defines and deploys all the Lambda functions used in this application. Adds Lambda as trigger to the input bucket in S3
 * Creates functions for document processing, PII detection, and redaction
 */

const lambdaStack = new PIILambdaStack(app, 'PIILambdaStack', {    
    env: deployEnv,
    inputBucket: appStack.RootBucket,
    lambdaRole: backendStack.LambdaRole,
    compMedDataRole: backendStack.CompMedDataRole,
    snsTopic: backendStack.SNSTopic,
    cognitoAuthRole: appStack.CognitoAuthRole,
    table: backendStack.PIITable,
    userPool: appStack.UserPool
});
lambdaStack.addDependency(backendStack);

/**
 * Creates Step Functions state machine for the Workflow
 * Orchestrates the document processing pipeline from upload to redaction
 */

const sfnStack = new PIIStepFunctionStack(app, 'PIIStepFunctionStack', {
    env: deployEnv,
    // Lambda functions
    initTextractSM1: lambdaStack.TextractAsync,
    textractAsyncBulk: lambdaStack.TextractAsyncBulk,
    initWorkflow: lambdaStack.InitWorkflow,
    getWorkflow: lambdaStack.GetWorkflowFn,
    processTextractOp: lambdaStack.ProcessTextractOp,
    updateWorkflow: lambdaStack.UpdateWorkflow,
    phiDetection: lambdaStack.PhiDetection,
    phiStatusCheck: lambdaStack.PhiStatusCheck,
    phiProcessOutput: lambdaStack.PhiProcessOutput,
    prepRedact: lambdaStack.PrepRedact,
    redactDocuments: lambdaStack.RedactDocuments,
    //Shared resources
    inputBucket: appStack.RootBucket,
    piiTable: backendStack.PIITable,
    sqsQueue: backendStack.SQSQueue,    
    snsTopic: backendStack.SNSTopic,
    snsRole: backendStack.SNSRole
});
sfnStack.addDependency(lambdaStack);
