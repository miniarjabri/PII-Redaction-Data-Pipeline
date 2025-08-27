```yaml
{
  "Resources": {
    "workflowstatemachineRole28CD11D0": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "states.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/workflow-state-machine/Role/Resource"
      }
    },
    "workflowstatemachineRoleDefaultPolicy5A9A046F": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:InvokeFunction",
              "Effect": "Allow",
              "Resource": [
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphidetection23DE89E3ArnF862252B"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphiprocessoutput6DF35AE1Arn6EFC1F9B"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphistatuscheck43BB5549ArnA7693166"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedprepredactC79F7D6FArnBD16169B"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedredactdocuments9492A23FArn7CDE355F"
                },
                {
                  "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedupdateworkflowD38FD88DArn277A783D"
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphidetection23DE89E3ArnF862252B"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphiprocessoutput6DF35AE1Arn6EFC1F9B"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphistatuscheck43BB5549ArnA7693166"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedprepredactC79F7D6FArnBD16169B"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedredactdocuments9492A23FArn7CDE355F"
                      },
                      ":*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedupdateworkflowD38FD88DArn277A783D"
                      },
                      ":*"
                    ]
                  ]
                }
              ]
            },
            {
              "Action": "dynamodb:UpdateItem",
              "Effect": "Allow",
              "Resource": {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:dynamodb:us-east-1:135511470273:table/",
                    {
                      "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
                    }
                  ]
                ]
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "workflowstatemachineRoleDefaultPolicy5A9A046F",
        "Roles": [
          {
            "Ref": "workflowstatemachineRole28CD11D0"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/workflow-state-machine/Role/DefaultPolicy/Resource"
      }
    },
    "workflowstatemachineC90B670A": {
      "Type": "AWS::StepFunctions::StateMachine",
      "Properties": {
        "DefinitionString": {
          "Fn::Join": [
            "",
            [
              "{\"StartAt\":\"textract-async-sm\",\"States\":{\"textract-async-sm\":{\"Next\":\"update-workflow-status\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"Process Docs Textract Async\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke.waitForTaskToken\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
              },
              "\",\"Payload\":{\"token.$\":\"$$.Task.Token\",\"workflow_id.$\":\"$.workflow_id\",\"bucket.$\":\"$.bucket\"}}},\"update-workflow-status\":{\"Next\":\"Redact documents?\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"Update workflow status\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedupdateworkflowD38FD88DArn277A783D"
              },
              "\",\"Payload\":{\"workflow_id.$\":\"$.workflow_id\",\"bucket.$\":\"$.bucket\",\"tmp_process_dir.$\":\"$.tmp_process_dir\",\"phi_input_dir.$\":\"$.phi_input_dir\"}}},\"Redact documents?\":{\"Type\":\"Choice\",\"Choices\":[{\"Variable\":\"$.redact\",\"BooleanEquals\":true,\"Next\":\"phi-detection\"}],\"Default\":\"processSuccess\"},\"processSuccess\":{\"Type\":\"Succeed\",\"Comment\":\"End Flow\"},\"phi-status-finalize\":{\"Next\":\"processSuccess\",\"Type\":\"Task\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::dynamodb:updateItem\",\"Parameters\":{\"Key\":{\"part_key\":{\"S.$\":\"$.workflow_id\"},\"sort_key\":{\"S.$\":\"$.input_prefix\"}},\"TableName\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"ExpressionAttributeValues\":{\":status\":{\"S\":\"processed\"}},\"UpdateExpression\":\"SET redaction_status = :status\"}},\"ConstructSortKey\":{\"Type\":\"Pass\",\"Parameters\":{\"workflow_id.$\":\"$.workflow_id\",\"bucket.$\":\"$.bucket\",\"input_prefix.$\":\"States.Format('input/{}/', $.workflow_id)\"},\"Next\":\"phi-status-finalize\"},\"redact-documents\":{\"Type\":\"Map\",\"ResultPath\":null,\"Next\":\"ConstructSortKey\",\"InputPath\":\"$\",\"Parameters\":{\"workflow_id.$\":\"$.workflow_id\",\"retain_docs.$\":\"$.retain_docs\",\"bucket.$\":\"$.bucket\",\"doc_prefixes.$\":\"$$.Map.Item.Value\"},\"ItemsPath\":\"$.doc_list\",\"Iterator\":{\"StartAt\":\"prep-documents-for-redaction\",\"States\":{\"prep-documents-for-redaction\":{\"Next\":\"pii-redact-documents\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"prep-documents-for-redaction\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedprepredactC79F7D6FArnBD16169B"
              },
              "\",\"Payload\":{\"bucket.$\":\"$.bucket\",\"workflow_id.$\":\"$.workflow_id\",\"retain_docs.$\":\"$.retain_docs\",\"doc_prefixes.$\":\"$.doc_prefixes\"}}},\"pii-redact-documents\":{\"End\":true,\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"pii-redact-documents\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedredactdocuments9492A23FArn7CDE355F"
              },
              "\",\"Payload\":{\"bucket.$\":\"$.bucket\",\"workflow_id.$\":\"$.workflow_id\",\"retain_docs.$\":\"$.retain_docs\",\"redact_data.$\":\"$.redact_data\"}}}}}},\"phi-detection\":{\"Next\":\"Job launched successfully?\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"Start PHI detection Job\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphidetection23DE89E3ArnF862252B"
              },
              "\",\"Payload\":{\"workflow_id.$\":\"$.workflow_id\",\"bucket.$\":\"$.bucket\",\"redact.$\":\"$.redact\",\"phi_input_dir.$\":\"$.phi_input_dir\"}}},\"Job launched successfully?\":{\"Type\":\"Choice\",\"Choices\":[{\"Variable\":\"$.phi_job_id\",\"IsNull\":true,\"Next\":\"PhiJobLaunchFail\"}],\"Default\":\"phi-detection-status-check\"},\"phi-detection-status-check\":{\"Next\":\"Job in-progress?\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"phi-detection-status-check\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphistatuscheck43BB5549ArnA7693166"
              },
              "\",\"Payload\":{\"workflow_id.$\":\"$.workflow_id\",\"phi_job_id.$\":\"$.phi_job_id\",\"phi_output_dir.$\":\"$.phi_output_dir\",\"bucket.$\":\"$.bucket\"}}},\"Job in-progress?\":{\"Type\":\"Choice\",\"Choices\":[{\"Or\":[{\"Variable\":\"$.status\",\"StringEquals\":\"IN_PROGRESS\"},{\"Variable\":\"$.status\",\"StringEquals\":\"SUBMITTED\"},{\"Variable\":\"$.status\",\"StringEquals\":\"STOP_REQUESTED\"}],\"Next\":\"phi-detection-status-check\"},{\"Or\":[{\"Variable\":\"$.status\",\"StringEquals\":\"FAILED\"},{\"Variable\":\"$.status\",\"StringEquals\":\"STOPPED\"}],\"Next\":\"PhiJobFailed\"}],\"Default\":\"phi-post-process\"},\"phi-post-process\":{\"Next\":\"Post-processing successful?\",\"Retry\":[{\"ErrorEquals\":[\"Lambda.ClientExecutionTimeoutException\",\"Lambda.ServiceException\",\"Lambda.AWSLambdaException\",\"Lambda.SdkClientException\"],\"IntervalSeconds\":2,\"MaxAttempts\":6,\"BackoffRate\":2}],\"Type\":\"Task\",\"Comment\":\"phi-post-process\",\"OutputPath\":\"$.Payload\",\"Resource\":\"arn:",
              {
                "Ref": "AWS::Partition"
              },
              ":states:::lambda:invoke\",\"Parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedphiprocessoutput6DF35AE1Arn6EFC1F9B"
              },
              "\",\"Payload\":{\"bucket.$\":\"$.bucket\",\"workflow_id.$\":\"$.workflow_id\",\"phi_output_dir.$\":\"$.phi_output_dir\"}}},\"Post-processing successful?\":{\"Type\":\"Choice\",\"Choices\":[{\"Variable\":\"$.error\",\"IsPresent\":true,\"Next\":\"PhiPostProcessFail\"}],\"Default\":\"redact-documents\"},\"PhiPostProcessFail\":{\"Type\":\"Fail\",\"Error\":\"PhiPostProcessFail\",\"Cause\":\"PHI Output Post-processing failed\"},\"PhiJobFailed\":{\"Type\":\"Fail\",\"Error\":\"PHIJobFailure\",\"Cause\":\"Amazon Comprehend Medical Detect PHI Job failed or stopped\"},\"PhiJobLaunchFail\":{\"Type\":\"Fail\",\"Error\":\"PHIJobLaunchFailure\",\"Cause\":\"Unable to Launch PHI detection Job\"}}}"
            ]
          ]
        },
        "RoleArn": {
          "Fn::GetAtt": [
            "workflowstatemachineRole28CD11D0",
            "Arn"
          ]
        },
        "StateMachineName": "workflow-state-machine"
      },
      "DependsOn": [
        "workflowstatemachineRoleDefaultPolicy5A9A046F",
        "workflowstatemachineRole28CD11D0"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/workflow-state-machine/Resource"
      }
    },
    "updateinitlambdaenviron0652641E": {
      "Type": "Custom::AWS",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "AWS679f53fac002430cb0da5b7982bd22872D164C4C",
            "Arn"
          ]
        },
        "Create": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinitstatemachine30F217BAArn56D13C23"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"STATE_MACHINE\":\"",
              {
                "Ref": "workflowstatemachineC90B670A"
              },
              "\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-initWorkflow-update\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinitstatemachine30F217BAArn56D13C23"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"STATE_MACHINE\":\"",
              {
                "Ref": "workflowstatemachineC90B670A"
              },
              "\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-initWorkflow-update\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "updateinitlambdaenvironCustomResourcePolicyDA6A8F06"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-init-lambda-environ/Resource/Default"
      }
    },
    "updateinitlambdaenvironCustomResourcePolicyDA6A8F06": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:UpdateFunctionConfiguration",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "updateinitlambdaenvironCustomResourcePolicyDA6A8F06",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-init-lambda-environ/CustomResourcePolicy/Resource"
      }
    },
    "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2": {
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
                ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
              ]
            ]
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource"
      }
    },
    "AWS679f53fac002430cb0da5b7982bd22872D164C4C": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "S3Bucket": "cdk-hnb659fds-assets-135511470273-us-east-1",
          "S3Key": "c099eb4e32cbf1c3da9c45a3b280efe2bed38d27d74aa72702b67d86d1b52354.zip"
        },
        "Handler": "index.handler",
        "MemorySize": 512,
        "Role": {
          "Fn::GetAtt": [
            "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2",
            "Arn"
          ]
        },
        "Runtime": "nodejs22.x",
        "Timeout": 120
      },
      "DependsOn": [
        "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
      ],
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/AWS679f53fac002430cb0da5b7982bd2287/Resource",
        "aws:asset:path": "asset.c099eb4e32cbf1c3da9c45a3b280efe2bed38d27d74aa72702b67d86d1b52354",
        "aws:asset:is-bundled": false,
        "aws:asset:property": "Code"
      }
    },
    "AWS679f53fac002430cb0da5b7982bd2287LogGroup449FB7C2": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "AWS679f53fac002430cb0da5b7982bd22872D164C4C"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/AWS679f53fac002430cb0da5b7982bd2287/LogGroup/Resource"
      }
    },
    "updatetextractasynclambdaenvironC1EA6ED4": {
      "Type": "Custom::AWS",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "AWS679f53fac002430cb0da5b7982bd22872D164C4C",
            "Arn"
          ]
        },
        "Create": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"INPUT_BKT\":\"",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
              },
              "\",\"SNS_TOPIC\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
              },
              "\",\"SNS_ROLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-textractasync-update\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"INPUT_BKT\":\"",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
              },
              "\",\"SNS_TOPIC\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
              },
              "\",\"SNS_ROLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-textractasync-update\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "updatetextractasynclambdaenvironCustomResourcePolicyD4F2832A"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasync-lambda-environ/Resource/Default"
      }
    },
    "updatetextractasynclambdaenvironCustomResourcePolicyD4F2832A": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:UpdateFunctionConfiguration",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "updatetextractasynclambdaenvironCustomResourcePolicyD4F2832A",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasync-lambda-environ/CustomResourcePolicy/Resource"
      }
    },
    "updatetextractasyncbulklambdaenviron7A1865CC": {
      "Type": "Custom::AWS",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "AWS679f53fac002430cb0da5b7982bd22872D164C4C",
            "Arn"
          ]
        },
        "Create": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"INPUT_BKT\":\"",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
              },
              "\",\"SNS_TOPIC\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
              },
              "\",\"SNS_ROLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710"
              },
              "\",\"LAMBDA_POST_PROCESS\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputRefmedprocesstextractop6553CAD9629B36EF"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-textractasyncbulk-update\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"updateFunctionConfiguration\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A"
              },
              "\",\"Environment\":{\"Variables\":{\"LOG_LEVEL\":\"DEBUG\",\"PII_QUEUE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsqsredactionFE9F5C272B5225DD"
              },
              "\",\"PII_TABLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
              },
              "\",\"INPUT_BKT\":\"",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
              },
              "\",\"SNS_TOPIC\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
              },
              "\",\"SNS_ROLE\":\"",
              {
                "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiiaiservicesnsrole4D905AC6Arn946D8710"
              },
              "\",\"LAMBDA_POST_PROCESS\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputRefmedprocesstextractop6553CAD9629B36EF"
              },
              "\"}}},\"physicalResourceId\":{\"id\":\"lambda-textractasyncbulk-update\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "updatetextractasyncbulklambdaenvironCustomResourcePolicy8E2FF296"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasyncbulk-lambda-environ/Resource/Default"
      }
    },
    "updatetextractasyncbulklambdaenvironCustomResourcePolicy8E2FF296": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:UpdateFunctionConfiguration",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "updatetextractasyncbulklambdaenvironCustomResourcePolicy8E2FF296",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasyncbulk-lambda-environ/CustomResourcePolicy/Resource"
      }
    },
    "updatetextractasyncbulklambdainvokeCD28D1CD": {
      "Type": "Custom::AWS",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "AWS679f53fac002430cb0da5b7982bd22872D164C4C",
            "Arn"
          ]
        },
        "Create": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"addPermission\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedprocesstextractop6553CAD9Arn480671FD"
              },
              "\",\"StatementId\":\"invoke-permission-for-post-process\",\"Action\":\"lambda:InvokeFunction\",\"Principal\":\"lambda.amazonaws.com\",\"SourceArn\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A"
              },
              "\"},\"physicalResourceId\":{\"id\":\"lambda-textractasyncbulk-update\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"Lambda\",\"action\":\"addPermission\",\"parameters\":{\"FunctionName\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedprocesstextractop6553CAD9Arn480671FD"
              },
              "\",\"StatementId\":\"invoke-permission-for-post-process\",\"Action\":\"lambda:InvokeFunction\",\"Principal\":\"lambda.amazonaws.com\",\"SourceArn\":\"",
              {
                "Fn::ImportValue": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A"
              },
              "\"},\"physicalResourceId\":{\"id\":\"lambda-textractasyncbulk-update\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "updatetextractasyncbulklambdainvokeCustomResourcePolicy48E301A5"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasyncbulk-lambda-invoke/Resource/Default"
      }
    },
    "updatetextractasyncbulklambdainvokeCustomResourcePolicy48E301A5": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "lambda:AddPermission",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "updatetextractasyncbulklambdainvokeCustomResourcePolicy48E301A5",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/update-textractasyncbulk-lambda-invoke/CustomResourcePolicy/Resource"
      }
    },
    "CDKMetadata": {
      "Type": "AWS::CDK::Metadata",
      "Properties": {
        "Analytics": "v2:deflate64:H4sIAAAAAAAA/+1WS08bMRD+LfiIBhfCpeIWUlFFKlXEtqdVFA32kJjs2qsdG5Ra+9+rfTgkAlWF9gBSTt755v3teGdHcnR6Jk+P8JFPlF6fFOZWxsyjWgM+8iKyp+ouWOWNs7zwyGuW8RuWtxqn9sGtCb5sLJbuZ6XR09RT2cCej4xZUIpIwxWaAq6xghkyw2TljCLIPHq6RrUylvIoeEf8jiWJC3EsQGi6M9a08cRFFEYPMHusfRdhAMjqTuRObhqIArX+4W5cQTNXGLURF3ls5h9NMYfJnd2lqgGDpYytYR4FMoeS9OWmZaeqjVWmwmKslAvWD9T0Nq3DWPVE7jE0S17PCvIe1WpqC2OfahLH4i+Uf477EbVv5hlEiRaXpLuQph3QPO5hm3E92P4r7W9TdiPWlg093qJbh34kn8V5Duv+/pVkPe+x+r5h3sG61/XquK+i6ZDuf6XrprYf2AaKbi3JmBm7LMg7ezUsoTyKELZbozebhbpynBZHSaWrN5n5lQBvSnIhXeq6S9l7u+XX2oVqENOe21lWD5V6esrCraWBCRDK6WS1QqsLqlOCYNuMu4Rdk0eNHvtWwdeB5i+rEkGHHg89foge57BzM99VO933JBXXAJ8vkJk8y3F7AJ/Ly6DW5C+RKZ9D4Zbt7/BQVx63JW5r6iMmi6aBG2IXakVbNkAF9q5c1IOC5fiRJx2WbGFfTK6wDdGu7mTbVZp5XBq7bMA6TfKePz2cfZajUzk6umdjToae5U1//gYJYIB7BQwAAA=="
      },
      "Metadata": {
        "aws:cdk:path": "PIIStepFunctionStack/CDKMetadata/Default"
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