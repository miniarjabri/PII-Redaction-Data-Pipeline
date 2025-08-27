/**
 * Deploys resources required for the backend orchestration
 * - Amazon SQS Queue for job submission
 * - Amazon SNS Topic for Async Job completion notification
 * - IAM Role that is assumable by Textract and Comprehend for SNS
 * - IAM Role for Lambda Function
 * - Amazon DynamoDB table required to keep track of the workflow
 */

const { Stack, RemovalPolicy, Duration } = require('aws-cdk-lib');
const dynamodb = require('aws-cdk-lib/aws-dynamodb');
const iam = require('aws-cdk-lib/aws-iam');
const sqs = require('aws-cdk-lib/aws-sqs');
const sns = require('aws-cdk-lib/aws-sns');

class PIIBackendStack extends Stack{

    static PIITable;    
    static SQSQueue;
    static SNSTopic;
    static SNSRole;
    static LambdaRole;
    static CompMedDataRole;

    constructor(scope, id, props){
        super(scope, id, props);

        /******
         * DynamoDB Table
         *****/
        const piiTable = new dynamodb.Table(this, `med-${process.env.DOMAIN_NAME}`, {
                                                removalPolicy: RemovalPolicy.DESTROY,
                                                tableName: `med-${process.env.DOMAIN_NAME}`,
                                                partitionKey: {
                                                    name: 'part_key',
                                                    type: dynamodb.AttributeType.STRING
                                                },
                                                sortKey:{
                                                    name: 'sort_key',
                                                    type: dynamodb.AttributeType.STRING
                                                },
                                                encryption: dynamodb.TableEncryption.AWS_MANAGED,
                                                //write capacity of 10 considering 10 updates per second for 10 concurrent jobs
                                                writeCapacity: 5,                                                
                                                
                                                // The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
                                                // the new table, and it will remain in your account until manually deleted. By setting the policy to 
                                                // DESTROY, cdk destroy will delete the table (even if it has data in it)

                                                /* removalPolicy: RemovalPolicy.DESTROY*/
                                            });
                                            
        const readScaling = piiTable.autoScaleReadCapacity({minCapacity: 5, maxCapacity: 100});
        readScaling.scaleOnUtilization({ targetUtilizationPercent: 50 });

        const writeScaling = piiTable.autoScaleWriteCapacity({ minCapacity: 5, maxCapacity: 100});
        writeScaling.scaleOnUtilization({ targetUtilizationPercent: 50 });
        this.PIITable = piiTable;

        /******
         * SNS Topic
         *****/    
        const snsTopic = new sns.Topic(this, `med-sns-${process.env.DOMAIN_NAME}`, {
                                            topicName: `med-sns-${process.env.DOMAIN_NAME}`                                            
                                        });
        this.SNSTopic = snsTopic;

        // This role will be used in calls to Textract or Comprehend APIs
        // so that async jobs can send job status notifications to SNS

        const aiSNSRole = new iam.Role(this, 'pii-ai-service-sns-role', {
                                            roleName: 'pii-ai-sns-role',
                                            assumedBy: new iam.CompositePrincipal(
                                                        new iam.ServicePrincipal('textract.amazonaws.com'),
                                                        new iam.ServicePrincipal('comprehendmedical.amazonaws.com'))               
                                        });

        aiSNSRole.addToPolicy(new iam.PolicyStatement({
                                            effect: iam.Effect.ALLOW,
                                            resources: [snsTopic.topicArn],
                                            actions: ["sns:Publish"]
                                        }));
        this.SNSRole = aiSNSRole;
        /******
         * SQS Queues
         *****/

        //SQS Queue for Textract Async Job Submission
        const sqsQueue = new sqs.Queue(this, `med-sqs-${process.env.DOMAIN_NAME}`, {
                                            queueName: `med-sqs-${process.env.DOMAIN_NAME}`,
                                            visibilityTimeout: Duration.seconds(30),
                                            retentionPeriod: Duration.seconds(1209600),
                                            encryption: sqs.QueueEncryption.KMS_MANAGED
                                        });
        this.SQSQueue = sqsQueue.queueUrl;

        /**
         * IAM Data access role for Comprehend Medical
         * 
         */
        // IAM Roles    
        const comprehendMedDataRole = new iam.Role(this, 'comp-med-data-role',{
            roleName: 'comp-med-data-role',
            assumedBy: new iam.ServicePrincipal('comprehendmedical.amazonaws.com'),
            inlinePolicies: {
                "s3-comprehend-access-policies": new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            sid: "CompMedS3Access",
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "s3:GetObject",
                                "s3:ListBucket",
                                "s3:PutObject",
                                "comprehend:StartPiiEntitiesDetectionJob"
                            ],
                            resources: ["*"]
                        })
                    ]
                })
            }
        });

        this.CompMedDataRole = comprehendMedDataRole;

        /******
         * IAM Role for Lambda Functions
         *****/
        // Custom IAM Role for Lambda Functions
        const lambdaRole = new iam.Role(this, 'pii-med-lambda-execution-role',{
            roleName: 'pii-med-lambda-execution-role',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonCognitoPowerUser"),                                
                                // iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonTextractFullAccess"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("ComprehendFullAccess"),
                                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaSQSQueueExecutionRole")
                            ],
            inlinePolicies:{
                "ai-policy": new iam.PolicyDocument({
                    statements: [                    
                        new iam.PolicyStatement({
                            sid: "AiServicesAccess",
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "textract:AnalyzeDocument",
                                "textract:DetectDocumentText",
                                "textract:GetDocumentAnalysis",
                                "textract:GetDocumentTextDetection",
                                "textract:StartDocumentAnalysis",
                                "textract:StartDocumentTextDetection",
                                "comprehendmedical:DetectPHI",
                                "comprehendmedical:StartPHIDetectionJob",
                                "comprehendmedical:StopPHIDetectionJob",
                                "comprehendmedical:ListPHIDetectionJobs",
                                "comprehendmedical:DescribePHIDetectionJob"
                            ],
                            resources: ["*"]
                        })
                    ]
                }),
                "lambda-dynamodb-policy": new iam.PolicyDocument({
                    statements: [                    
                        new iam.PolicyStatement({
                            sid: "DynamoDBTableAccess",
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "dynamodb:PartiQLInsert",
                                "dynamodb:PartiQLUpdate",
                                "dynamodb:PartiQLDelete",
                                "dynamodb:PartiQLSelect"
                            ],
                            resources: ["*"]
                        })
                    ]
                }),
                "lambda-s3-policy": new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            sid: "LambdaS3Access",
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "s3:ListBucket",
                                "s3:DeleteObject",
                                "s3:GetObject",
                                "s3:PutObject",
                                "s3:PutObjectAcl"
                            ],
                            resources: ["*"]
                        })
                    ]
                }),
                "lambda-sqs-sf-policy": new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            sid: "LambdaSQSSFAccess",
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "sqs:SendMessage",
                                "sqs:ListQueues",
                                "states:ListStateMachines",
                                "states:ListActivities",
                                "states:DescribeStateMachine",
                                "states:StartExecution",
                                "states:SendTaskSuccess",
                                "states:ListExecutions",
                                "states:StopExecution",
                                "states:GetExecutionHistory",
                                "lambda:InvokeAsync",
                                "lambda:InvokeFunction"
                            ],
                            resources: ["*"]
                        })
                    ]
                })
            }
        });

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["iam:PassRole"],
            resources: [comprehendMedDataRole.roleArn],
        }))

        this.LambdaRole = lambdaRole;        
    }
}

module.exports = { PIIBackendStack }
