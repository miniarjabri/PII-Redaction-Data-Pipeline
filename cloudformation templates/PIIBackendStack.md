```yaml 
{
  "Resources": {
    "medredactionBEEAD873": {
      "Type": "AWS::DynamoDB::Table",
      "Properties": {
        "AttributeDefinitions": [
          {
            "AttributeName": "part_key",
            "AttributeType": "S"
          },
          {
            "AttributeName": "sort_key",
            "AttributeType": "S"
          }
        ],
        "KeySchema": [
          {
            "AttributeName": "part_key",
            "KeyType": "HASH"
          },
          {
            "AttributeName": "sort_key",
            "KeyType": "RANGE"
          }
        ],
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 5,
          "WriteCapacityUnits": 5
        },
        "SSESpecification": {
          "SSEEnabled": true
        },
        "TableName": "med-redaction"
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-redaction/Resource"
      }
    },
    "medredactionReadScalingTarget99C9843F": {
      "Type": "AWS::ApplicationAutoScaling::ScalableTarget",
      "Properties": {
        "MaxCapacity": 100,
        "MinCapacity": 5,
        "ResourceId": {
          "Fn::Join": [
            "",
            [
              "table/",
              {
                "Ref": "medredactionBEEAD873"
              }
            ]
          ]
        },
        "RoleARN": "arn:aws:iam::135511470273:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
        "ScalableDimension": "dynamodb:table:ReadCapacityUnits",
        "ServiceNamespace": "dynamodb"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-redaction/ReadScaling/Target/Resource"
      }
    },
    "medredactionReadScalingTargetTrackingE5FDD89B": {
      "Type": "AWS::ApplicationAutoScaling::ScalingPolicy",
      "Properties": {
        "PolicyName": "PIIBackendStackmedredactionReadScalingTargetTrackingAC564C97",
        "PolicyType": "TargetTrackingScaling",
        "ScalingTargetId": {
          "Ref": "medredactionReadScalingTarget99C9843F"
        },
        "TargetTrackingScalingPolicyConfiguration": {
          "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
          },
          "TargetValue": 50
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-redaction/ReadScaling/Target/Tracking/Resource"
      }
    },
    "medredactionWriteScalingTargetCFC137C4": {
      "Type": "AWS::ApplicationAutoScaling::ScalableTarget",
      "Properties": {
        "MaxCapacity": 100,
        "MinCapacity": 5,
        "ResourceId": {
          "Fn::Join": [
            "",
            [
              "table/",
              {
                "Ref": "medredactionBEEAD873"
              }
            ]
          ]
        },
        "RoleARN": "arn:aws:iam::135511470273:role/aws-service-role/dynamodb.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_DynamoDBTable",
        "ScalableDimension": "dynamodb:table:WriteCapacityUnits",
        "ServiceNamespace": "dynamodb"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-redaction/WriteScaling/Target/Resource"
      }
    },
    "medredactionWriteScalingTargetTrackingA41A826E": {
      "Type": "AWS::ApplicationAutoScaling::ScalingPolicy",
      "Properties": {
        "PolicyName": "PIIBackendStackmedredactionWriteScalingTargetTracking574358C8",
        "PolicyType": "TargetTrackingScaling",
        "ScalingTargetId": {
          "Ref": "medredactionWriteScalingTargetCFC137C4"
        },
        "TargetTrackingScalingPolicyConfiguration": {
          "PredefinedMetricSpecification": {
            "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
          },
          "TargetValue": 50
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-redaction/WriteScaling/Target/Tracking/Resource"
      }
    },
    "medsnsredaction3227B669": {
      "Type": "AWS::SNS::Topic",
      "Properties": {
        "TopicName": "med-sns-redaction"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-sns-redaction/Resource"
      }
    },
    "piiaiservicesnsrole4D905AC6": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": [
                  "comprehendmedical.amazonaws.com",
                  "textract.amazonaws.com"
                ]
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "RoleName": "pii-ai-sns-role"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/pii-ai-service-sns-role/Resource"
      }
    },
    "piiaiservicesnsroleDefaultPolicyF248EBE7": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "sns:Publish",
              "Effect": "Allow",
              "Resource": {
                "Ref": "medsnsredaction3227B669"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "piiaiservicesnsroleDefaultPolicyF248EBE7",
        "Roles": [
          {
            "Ref": "piiaiservicesnsrole4D905AC6"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/pii-ai-service-sns-role/DefaultPolicy/Resource"
      }
    },
    "medsqsredactionFE9F5C27": {
      "Type": "AWS::SQS::Queue",
      "Properties": {
        "KmsMasterKeyId": "alias/aws/sqs",
        "MessageRetentionPeriod": 1209600,
        "QueueName": "med-sqs-redaction",
        "VisibilityTimeout": 30
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/med-sqs-redaction/Resource"
      }
    },
    "compmeddatarole224C996D": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "comprehendmedical.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "Policies": [
          {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "comprehend:StartPiiEntitiesDetectionJob",
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:PutObject"
                  ],
                  "Effect": "Allow",
                  "Resource": "*",
                  "Sid": "CompMedS3Access"
                }
              ],
              "Version": "2012-10-17"
            },
            "PolicyName": "s3-comprehend-access-policies"
          }
        ],
        "RoleName": "comp-med-data-role"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/comp-med-data-role/Resource"
      }
    },
    "piimedlambdaexecutionrole176F985C": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "ManagedPolicyArns": [
          {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
              ]
            ]
          },
          {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
              ]
            ]
          },
          {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":iam::aws:policy/AmazonCognitoPowerUser"
              ]
            ]
          },
          {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":iam::aws:policy/ComprehendFullAccess"
              ]
            ]
          },
          {
            "Fn::Join": [
              "",
              [
                "arn:",
                {
                  "Ref": "AWS::Partition"
                },
                ":iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
              ]
            ]
          }
        ],
        "Policies": [
          {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "comprehendmedical:DescribePHIDetectionJob",
                    "comprehendmedical:DetectPHI",
                    "comprehendmedical:ListPHIDetectionJobs",
                    "comprehendmedical:StartPHIDetectionJob",
                    "comprehendmedical:StopPHIDetectionJob",
                    "textract:AnalyzeDocument",
                    "textract:DetectDocumentText",
                    "textract:GetDocumentAnalysis",
                    "textract:GetDocumentTextDetection",
                    "textract:StartDocumentAnalysis",
                    "textract:StartDocumentTextDetection"
                  ],
                  "Effect": "Allow",
                  "Resource": "*",
                  "Sid": "AiServicesAccess"
                }
              ],
              "Version": "2012-10-17"
            },
            "PolicyName": "ai-policy"
          },
          {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "dynamodb:PartiQLDelete",
                    "dynamodb:PartiQLInsert",
                    "dynamodb:PartiQLSelect",
                    "dynamodb:PartiQLUpdate"
                  ],
                  "Effect": "Allow",
                  "Resource": "*",
                  "Sid": "DynamoDBTableAccess"
                }
              ],
              "Version": "2012-10-17"
            },
            "PolicyName": "lambda-dynamodb-policy"
          },
          {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "s3:DeleteObject",
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:PutObject",
                    "s3:PutObjectAcl"
                  ],
                  "Effect": "Allow",
                  "Resource": "*",
                  "Sid": "LambdaS3Access"
                }
              ],
              "Version": "2012-10-17"
            },
            "PolicyName": "lambda-s3-policy"
          },
          {
            "PolicyDocument": {
              "Statement": [
                {
                  "Action": [
                    "lambda:InvokeAsync",
                    "lambda:InvokeFunction",
                    "sqs:ListQueues",
                    "sqs:SendMessage",
                    "states:DescribeStateMachine",
                    "states:GetExecutionHistory",
                    "states:ListActivities",
                    "states:ListExecutions",
                    "states:ListStateMachines",
                    "states:SendTaskSuccess",
                    "states:StartExecution",
                    "states:StopExecution"
                  ],
                  "Effect": "Allow",
                  "Resource": "*",
                  "Sid": "LambdaSQSSFAccess"
                }
              ],
              "Version": "2012-10-17"
            },
            "PolicyName": "lambda-sqs-sf-policy"
          }
        ],
        "RoleName": "pii-med-lambda-execution-role"
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/pii-med-lambda-execution-role/Resource"
      }
    },
    "piimedlambdaexecutionroleDefaultPolicyE9FC1BD9": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "iam:PassRole",
              "Effect": "Allow",
              "Resource": {
                "Fn::GetAtt": [
                  "compmeddatarole224C996D",
                  "Arn"
                ]
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "piimedlambdaexecutionroleDefaultPolicyE9FC1BD9",
        "Roles": [
          {
            "Ref": "piimedlambdaexecutionrole176F985C"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/pii-med-lambda-execution-role/DefaultPolicy/Resource"
      }
    },
    "CDKMetadata": {
      "Type": "AWS::CDK::Metadata",
      "Properties": {
        "Analytics": "v2:deflate64:H4sIAAAAAAAA/+VV30/bMBD+W7hHZDLo09S3AtOEEIi11XioKnS1j+4gsYPttIus/O+TnSZthrbxwPayh8jJ/fbd911G2ej0LDs9wq07ker5JOdVFmYe5bPArXsIqtZYGLXKwhxXOS0CWCrMBvM7k7OsYQyKnLemBgE+WtxiQTCGYxBQovXs2ehrqmEcQO9Vvi7j6wwaAc5Y/3sL0tLWZYwEY5jczx5uJreTz58uQcDWsqcLLFGyr5NrIwJg5c1MYk5TQrXXLgIUrAfWAgr8PvRfDiLcDxO8NcRSXDzq1LJGYFnmLDHWH8M6iTnrdRbO0VHMEa0m3lteVZ5EJ5mjXZNfBHBkNyxTY12JMnalmwoIcDvzSy5Iu7ZFsSZLzlRW0pXqBCbvevuGG4iQItPczC3K5xvyliWMF9E6QJmGfzBqxS4WkTp21ZXg2q8LY3Jltp3Up3t9xbzqcWJJ0SNrUl2afgz/7d0TfoZQEO2RamK9nrUwannYWfeCRjjtsjA3JctFAB/PvuYdOqOsEYxFFqam5bYZEBidqwpS54mbpWUtucR8IqWptB/YRP+J9N0ImkQhpeamWxOLsONVEnahXmm9R/ntSuesqdfBMfxZ+W6VC+B9BibXQ+IdMxSocU1qnyJulQNZPbG6z/vXFctfXvnfTTABMjZKtPId11qHuZkm/v4U57VYqZlHTwVp77qS3itQqrDn1ovLwpeKqkial3geIGPDjlecs6/nXJCpfL+VPOkIgzuybLrVNPi3Xd/s/21txpSkacR0t9JSYw6eZSO0UZQ9uQ+bs4/Z6DQbHT055hNbac8FZdP2/AGDJJmz6AcAAA=="
      },
      "Metadata": {
        "aws:cdk:path": "PIIBackendStack/CDKMetadata/Default"
      }
    }
  },
  "Outputs": {
    "ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36": {
      "Value": {
        "Fn::GetAtt": [
          "piimedlambdaexecutionrole176F985C",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
      }
    },
    "ExportsOutputRefmedredactionBEEAD873A33EC71C": {
      "Value": {
        "Ref": "medredactionBEEAD873"
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
      }
    },
    "ExportsOutputRefmedsnsredaction3227B66963EE6E83": {
      "Value": {
        "Ref": "medsnsredaction3227B669"
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
      }
    },
    "ExportsOutputFnGetAttcompmeddatarole224C996DArn704339F2": {
      "Value": {
        "Fn::GetAtt": [
          "compmeddatarole224C996D",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputFnGetAttcompmeddatarole224C996DArn704339F2"
      }
    },
    "ExportsOutputRefmedsqsredactionFE9F5C272B5225DD": {
      "Value": {
        "Ref": "medsqsredactionFE9F5C27"
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
      }
    },
    "ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710": {
      "Value": {
        "Fn::GetAtt": [
          "piiaiservicesnsrole4D905AC6",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIIBackendStack:ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710"
      }
    }
  },
  "Parameters": {
    "BootstrapVersion": {
      "Type": "AWS::SSM::Parameter::Value<String>",
      "Default": "/cdk-bootstrap/hnb659fds/version",
      "Description": "Version of the CDK Bootstrap resources in this environment, automatically retrieved from SSM Parameter Store. [cdk:skip]"
    }
  },
  "Rules": {
    "CheckBootstrapVersion": {
      "Assertions": [
        {
          "Assert": {
            "Fn::Not": [
              {
                "Fn::Contains": [
                  [
                    "1",
                    "2",
                    "3",
                    "4",
                    "5"
                  ],
                  {
                    "Ref": "BootstrapVersion"
                  }
                ]
              }
            ]
          },
          "AssertDescription": "CDK bootstrap stack version 6 required. Please run 'cdk bootstrap' with a recent version of the CDK CLI."
        }
      ]
    }
  }
}
```
