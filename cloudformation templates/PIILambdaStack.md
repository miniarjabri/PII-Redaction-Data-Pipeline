```yaml
{
  "Resources": {
    "medinitstatemachine30F217BA": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "PII Redaction Lambda Function set as S3 trigger to invoke AWS Step Function State Machine",
        "FunctionName": "med-init-state-machine",
        "ImageConfig": {
          "Command": [
            "machine-state.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 60
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-state-machine/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medinitstatemachineLogGroupB34AC9D0": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medinitstatemachine30F217BA"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-state-machine/LogGroup/Resource"
      }
    },
    "tempinputbktNotificationsD17E7DC2": {
      "Type": "Custom::S3BucketNotifications",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691",
            "Arn"
          ]
        },
        "BucketName": {
          "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
        },
        "NotificationConfiguration": {
          "LambdaFunctionConfigurations": [
            {
              "Events": [
                "s3:ObjectCreated:*"
              ],
              "Filter": {
                "Key": {
                  "FilterRules": [
                    {
                      "Name": "prefix",
                      "Value": "public/workflows/"
                    }
                  ]
                }
              },
              "LambdaFunctionArn": {
                "Fn::GetAtt": [
                  "medinitstatemachine30F217BA",
                  "Arn"
                ]
              }
            }
          ]
        },
        "Managed": false,
        "SkipDestinationValidation": false
      },
      "DependsOn": [
        "tempinputbktAllowBucketNotificationsToPIILambdaStackmedinitstatemachineD18434A227522CC9"
      ],
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/temp-input-bkt/Notifications/Resource"
      }
    },
    "tempinputbktAllowBucketNotificationsToPIILambdaStackmedinitstatemachineD18434A227522CC9": {
      "Type": "AWS::Lambda::Permission",
      "Properties": {
        "Action": "lambda:InvokeFunction",
        "FunctionName": {
          "Fn::GetAtt": [
            "medinitstatemachine30F217BA",
            "Arn"
          ]
        },
        "Principal": "s3.amazonaws.com",
        "SourceAccount": "135511470273",
        "SourceArn": {
          "Fn::Join": [
            "",
            [
              "arn:aws:s3:::",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
              }
            ]
          ]
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/temp-input-bkt/AllowBucketNotificationsToPIILambdaStackmedinitstatemachineD18434A2"
      }
    },
    "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC": {
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
        "aws:cdk:path": "PIILambdaStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource"
      }
    },
    "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "s3:GetBucketNotification",
                "s3:PutBucketNotification"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36",
        "Roles": [
          {
            "Ref": "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource"
      }
    },
    "BucketNotificationsHandler050a0587b7544547bf325f094a3db8347ECC3691": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Description": "AWS CloudFormation handler for \"Custom::S3BucketNotifications\" resources (@aws-cdk/aws-s3)",
        "Code": {
          "ZipFile": "import boto3  # type: ignore\nimport json\nimport logging\nimport urllib.request\n\ns3 = boto3.client(\"s3\")\n\nEVENTBRIDGE_CONFIGURATION = 'EventBridgeConfiguration'\nCONFIGURATION_TYPES = [\"TopicConfigurations\", \"QueueConfigurations\", \"LambdaFunctionConfigurations\"]\n\ndef handler(event: dict, context):\n  response_status = \"SUCCESS\"\n  error_message = \"\"\n  try:\n    props = event[\"ResourceProperties\"]\n    notification_configuration = props[\"NotificationConfiguration\"]\n    managed = props.get('Managed', 'true').lower() == 'true'\n    skipDestinationValidation = props.get('SkipDestinationValidation', 'false').lower() == 'true'\n    stack_id = event['StackId']\n    old = event.get(\"OldResourceProperties\", {}).get(\"NotificationConfiguration\", {})\n    if managed:\n      config = handle_managed(event[\"RequestType\"], notification_configuration)\n    else:\n      config = handle_unmanaged(props[\"BucketName\"], stack_id, event[\"RequestType\"], notification_configuration, old)\n    s3.put_bucket_notification_configuration(Bucket=props[\"BucketName\"], NotificationConfiguration=config, SkipDestinationValidation=skipDestinationValidation)\n  except Exception as e:\n    logging.exception(\"Failed to put bucket notification configuration\")\n    response_status = \"FAILED\"\n    error_message = f\"Error: {str(e)}. \"\n  finally:\n    submit_response(event, context, response_status, error_message)\n\ndef handle_managed(request_type, notification_configuration):\n  if request_type == 'Delete':\n    return {}\n  return notification_configuration\n\ndef handle_unmanaged(bucket, stack_id, request_type, notification_configuration, old):\n  def get_id(n):\n    n['Id'] = ''\n    sorted_notifications = sort_filter_rules(n)\n    strToHash=json.dumps(sorted_notifications, sort_keys=True).replace('\"Name\": \"prefix\"', '\"Name\": \"Prefix\"').replace('\"Name\": \"suffix\"', '\"Name\": \"Suffix\"')\n    return f\"{stack_id}-{hash(strToHash)}\"\n  def with_id(n):\n    n['Id'] = get_id(n)\n    return n\n\n  external_notifications = {}\n  existing_notifications = s3.get_bucket_notification_configuration(Bucket=bucket)\n  for t in CONFIGURATION_TYPES:\n    if request_type == 'Update':\n        old_incoming_ids = [get_id(n) for n in old.get(t, [])]\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not get_id(n) in old_incoming_ids]      \n    elif request_type == 'Delete':\n        external_notifications[t] = [n for n in existing_notifications.get(t, []) if not n['Id'].startswith(f\"{stack_id}-\")]\n    elif request_type == 'Create':\n        external_notifications[t] = [n for n in existing_notifications.get(t, [])]\n  if EVENTBRIDGE_CONFIGURATION in existing_notifications:\n    external_notifications[EVENTBRIDGE_CONFIGURATION] = existing_notifications[EVENTBRIDGE_CONFIGURATION]\n\n  if request_type == 'Delete':\n    return external_notifications\n\n  notifications = {}\n  for t in CONFIGURATION_TYPES:\n    external = external_notifications.get(t, [])\n    incoming = [with_id(n) for n in notification_configuration.get(t, [])]\n    notifications[t] = external + incoming\n\n  if EVENTBRIDGE_CONFIGURATION in notification_configuration:\n    notifications[EVENTBRIDGE_CONFIGURATION] = notification_configuration[EVENTBRIDGE_CONFIGURATION]\n  elif EVENTBRIDGE_CONFIGURATION in external_notifications:\n    notifications[EVENTBRIDGE_CONFIGURATION] = external_notifications[EVENTBRIDGE_CONFIGURATION]\n\n  return notifications\n\ndef submit_response(event: dict, context, response_status: str, error_message: str):\n  response_body = json.dumps(\n    {\n      \"Status\": response_status,\n      \"Reason\": f\"{error_message}See the details in CloudWatch Log Stream: {context.log_stream_name}\",\n      \"PhysicalResourceId\": event.get(\"PhysicalResourceId\") or event[\"LogicalResourceId\"],\n      \"StackId\": event[\"StackId\"],\n      \"RequestId\": event[\"RequestId\"],\n      \"LogicalResourceId\": event[\"LogicalResourceId\"],\n      \"NoEcho\": False,\n    }\n  ).encode(\"utf-8\")\n  headers = {\"content-type\": \"\", \"content-length\": str(len(response_body))}\n  try:\n    req = urllib.request.Request(url=event[\"ResponseURL\"], headers=headers, data=response_body, method=\"PUT\")\n    with urllib.request.urlopen(req) as response:\n      print(response.read().decode(\"utf-8\"))\n    print(\"Status code: \" + response.reason)\n  except Exception as e:\n      print(\"send(..) failed executing request.urlopen(..): \" + str(e))\n\ndef sort_filter_rules(json_obj):\n  if not isinstance(json_obj, dict):\n      return json_obj\n  for key, value in json_obj.items():\n      if isinstance(value, dict):\n          json_obj[key] = sort_filter_rules(value)\n      elif isinstance(value, list):\n          json_obj[key] = [sort_filter_rules(item) for item in value]\n  if \"Filter\" in json_obj and \"Key\" in json_obj[\"Filter\"] and \"FilterRules\" in json_obj[\"Filter\"][\"Key\"]:\n      filter_rules = json_obj[\"Filter\"][\"Key\"][\"FilterRules\"]\n      sorted_filter_rules = sorted(filter_rules, key=lambda x: x[\"Name\"])\n      json_obj[\"Filter\"][\"Key\"][\"FilterRules\"] = sorted_filter_rules\n  return json_obj"
        },
        "Handler": "index.handler",
        "Role": {
          "Fn::GetAtt": [
            "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC",
            "Arn"
          ]
        },
        "Runtime": "python3.11",
        "Timeout": 300
      },
      "DependsOn": [
        "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleDefaultPolicy2CF63D36",
        "BucketNotificationsHandler050a0587b7544547bf325f094a3db834RoleB6FB88EC"
      ],
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Resource"
      }
    },
    "medinittextractprocess18CC719B": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "PII Lambda Function to process docs using StartDocumentAnalysis from Step Function",
        "FunctionName": "med-init-textract-process",
        "ImageConfig": {
          "Command": [
            "extract.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 300
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medinittextractprocessLogGroupF4EF95ED": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medinittextractprocess18CC719B"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process/LogGroup/Resource"
      }
    },
    "medgetworkflow582C9480": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda Function to get workflow records from DynamoDB",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            },
            "BKT": {
              "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
            }
          }
        },
        "FunctionName": "med-get-workflow",
        "ImageConfig": {
          "Command": [
            "get-workflows.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 10
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-get-workflow/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medgetworkflowLogGroup8EC7D53F": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medgetworkflow582C9480"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-get-workflow/LogGroup/Resource"
      }
    },
    "medgetworkflowFunctionUrl62C11C80": {
      "Type": "AWS::Lambda::Url",
      "Properties": {
        "AuthType": "AWS_IAM",
        "Cors": {
          "AllowCredentials": true,
          "AllowHeaders": [
            "*"
          ],
          "AllowMethods": [
            "GET",
            "POST"
          ],
          "AllowOrigins": [
            "*"
          ]
        },
        "TargetFunctionArn": {
          "Fn::GetAtt": [
            "medgetworkflow582C9480",
            "Arn"
          ]
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-get-workflow/FunctionUrl/Resource"
      }
    },
    "updategetwfurllambdapermission50853190": {
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
                "Fn::GetAtt": [
                  "medgetworkflow582C9480",
                  "Arn"
                ]
              },
              "\",\"Action\":\"lambda:InvokeFunctionUrl\",\"Principal\":\"",
              {
                "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputFnGetAttpiicognitoauthroleBC449F3CArnACB63701"
              },
              "\",\"StatementId\":\"lambda-function-url-invoke-policy\",\"FunctionUrlAuthType\":\"AWS_IAM\"},\"physicalResourceId\":{\"id\":\"lambda-getwf-url-update\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "updategetwfurllambdapermissionCustomResourcePolicy4B37E56C"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/update-getwf-url-lambda-permission/Resource/Default"
      }
    },
    "updategetwfurllambdapermissionCustomResourcePolicy4B37E56C": {
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
        "PolicyName": "updategetwfurllambdapermissionCustomResourcePolicy4B37E56C",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/update-getwf-url-lambda-permission/CustomResourcePolicy/Resource"
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
        "aws:cdk:path": "PIILambdaStack/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource"
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
        "aws:cdk:path": "PIILambdaStack/AWS679f53fac002430cb0da5b7982bd2287/Resource",
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
        "aws:cdk:path": "PIILambdaStack/AWS679f53fac002430cb0da5b7982bd2287/LogGroup/Resource"
      }
    },
    "medupdateworkflowD38FD88D": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Updates the workflow status in Dynamo db",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            }
          }
        },
        "FunctionName": "med-update-workflow",
        "ImageConfig": {
          "Command": [
            "update-wf-status.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 120
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-update-workflow/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medupdateworkflowLogGroup13049ABF": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medupdateworkflowD38FD88D"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-update-workflow/LogGroup/Resource"
      }
    },
    "medprocesstextractop6553CAD9": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda Function to to Process Textract outputs",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            },
            "BKT": {
              "Fn::ImportValue": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
            }
          }
        },
        "FunctionName": "med-process-textract-op",
        "ImageConfig": {
          "Command": [
            "textract-output.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 256,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 600
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-process-textract-op/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medprocesstextractopLogGroup879421DC": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medprocesstextractop6553CAD9"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-process-textract-op/LogGroup/Resource"
      }
    },
    "medinittextractprocessbulkA11F2F7D": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda Function to process docs using StartDocumentAnalysis from Step Function and post process output from job completions",
        "FunctionName": "med-init-textract-process-bulk",
        "ImageConfig": {
          "Command": [
            "textract-bulk.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 600
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process-bulk/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medinittextractprocessbulkLogGroup6106C9FB": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medinittextractprocessbulkA11F2F7D"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process-bulk/LogGroup/Resource"
      }
    },
    "medinittextractprocessbulkAllowInvokePIIBackendStackmedsnsredaction021F9AAFCF537892": {
      "Type": "AWS::Lambda::Permission",
      "Properties": {
        "Action": "lambda:InvokeFunction",
        "FunctionName": {
          "Fn::GetAtt": [
            "medinittextractprocessbulkA11F2F7D",
            "Arn"
          ]
        },
        "Principal": "sns.amazonaws.com",
        "SourceArn": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process-bulk/AllowInvoke:PIIBackendStackmedsnsredaction021F9AAF"
      }
    },
    "medinittextractprocessbulkmedsnsredactionA687D724": {
      "Type": "AWS::SNS::Subscription",
      "Properties": {
        "Endpoint": {
          "Fn::GetAtt": [
            "medinittextractprocessbulkA11F2F7D",
            "Arn"
          ]
        },
        "Protocol": "lambda",
        "TopicArn": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedsnsredaction3227B66963EE6E83"
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-init-textract-process-bulk/med-sns-redaction/Resource"
      }
    },
    "medphidetection23DE89E3": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda function to detect PHI using Amazon Comprehend Medical StartPHIDetectionJob async API",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "IAM_ROLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttcompmeddatarole224C996DArn704339F2"
            },
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            }
          }
        },
        "FunctionName": "med-phi-detection",
        "ImageConfig": {
          "Command": [
            "pii-detection.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 512,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 600
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-detection/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medphidetectionLogGroupC9099C37": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medphidetection23DE89E3"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-detection/LogGroup/Resource"
      }
    },
    "medphistatuscheck43BB5549": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda function to check status of Amazon Comprehend Medical PHI Detection Job",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            }
          }
        },
        "FunctionName": "med-phi-status-check",
        "ImageConfig": {
          "Command": [
            "status-check.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 128,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 780
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-status-check/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medphistatuscheckLogGroup8AEE4A08": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medphistatuscheck43BB5549"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-status-check/LogGroup/Resource"
      }
    },
    "medphiprocessoutput6DF35AE1": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda function to process output of Amazon Comprehend Medical PHI Detection Job and copy original documents",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG",
            "PII_TABLE": {
              "Fn::ImportValue": "PIIBackendStack:ExportsOutputRefmedredactionBEEAD873A33EC71C"
            }
          }
        },
        "FunctionName": "med-phi-process-output",
        "ImageConfig": {
          "Command": [
            "pii-output.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 512,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 600
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-process-output/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medphiprocessoutputLogGroup13513F84": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medphiprocessoutput6DF35AE1"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-phi-process-output/LogGroup/Resource"
      }
    },
    "medprepredactC79F7D6F": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda function to prepare documents for redaction and converts TIFF files to PDF (if any)",
        "Environment": {
          "Variables": {
            "LOG_LEVEL": "DEBUG"
          }
        },
        "FunctionName": "med-prep-redact",
        "ImageConfig": {
          "Command": [
            "prep-doc-for-redaction.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 1024,
        "PackageType": "Image",
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 900
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-prep-redact/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medprepredactLogGroup39C672B2": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medprepredactC79F7D6F"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-prep-redact/LogGroup/Resource"
      }
    },
    "medredactdocuments9492A23F": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "ImageUri": {
            "Fn::Sub": "135511470273.dkr.ecr.us-east-1.${AWS::URLSuffix}/cdk-hnb659fds-container-assets-135511470273-us-east-1:be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970"
          }
        },
        "Description": "Lambda function that uses PHI entities and Amazon Textract geometry to redact documents",
        "Environment": {
          "Variables": {
            "FORCE_RECREATE": "true",
            "LOG_LEVEL": "DEBUG"
          }
        },
        "FunctionName": "med-redact-documents",
        "ImageConfig": {
          "Command": [
            "redact.lambda_handler"
          ],
          "EntryPoint": [
            "/lambda-entrypoint.sh"
          ]
        },
        "MemorySize": 2048,
        "PackageType": "Image",
        "ReservedConcurrentExecutions": 10,
        "Role": {
          "Fn::ImportValue": "PIIBackendStack:ExportsOutputFnGetAttpiimedlambdaexecutionrole176F985CArnC18B7D36"
        },
        "Timeout": 900
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-redact-documents/Resource",
        "aws:asset:path": "asset.be10937ab4140b866bf789264c1c1fed6742fff2537132cca7b981f382739970",
        "aws:asset:dockerfile-path": "Dockerfile",
        "aws:asset:property": "Code.ImageUri"
      }
    },
    "medredactdocumentsLogGroupD232A8BF": {
      "Type": "AWS::Logs::LogGroup",
      "Properties": {
        "LogGroupName": {
          "Fn::Join": [
            "",
            [
              "/aws/lambda/",
              {
                "Ref": "medredactdocuments9492A23F"
              }
            ]
          ]
        },
        "RetentionInDays": 731
      },
      "UpdateReplacePolicy": "Retain",
      "DeletionPolicy": "Retain",
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-redact-documents/LogGroup/Resource"
      }
    },
    "medredactdocumentsCurrentVersionD5892D92bba3c4beb964c40cbe3e72586e8cf64a": {
      "Type": "AWS::Lambda::Version",
      "Properties": {
        "FunctionName": {
          "Ref": "medredactdocuments9492A23F"
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/med-redact-documents/CurrentVersion/Resource"
      }
    },
    "RedactDocumentsAlias4D26467F": {
      "Type": "AWS::Lambda::Alias",
      "Properties": {
        "FunctionName": {
          "Ref": "medredactdocuments9492A23F"
        },
        "FunctionVersion": {
          "Fn::GetAtt": [
            "medredactdocumentsCurrentVersionD5892D92bba3c4beb964c40cbe3e72586e8cf64a",
            "Version"
          ]
        },
        "Name": "production"
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/RedactDocumentsAlias/Resource"
      }
    },
    "RedactDocumentsAliasAliasScalingTarget05F5539E": {
      "Type": "AWS::ApplicationAutoScaling::ScalableTarget",
      "Properties": {
        "MaxCapacity": 10,
        "MinCapacity": 2,
        "ResourceId": {
          "Fn::Join": [
            "",
            [
              "function:",
              {
                "Fn::Select": [
                  6,
                  {
                    "Fn::Split": [
                      ":",
                      {
                        "Ref": "RedactDocumentsAlias4D26467F"
                      }
                    ]
                  }
                ]
              },
              ":production"
            ]
          ]
        },
        "RoleARN": "arn:aws:iam::135511470273:role/aws-service-role/lambda.application-autoscaling.amazonaws.com/AWSServiceRoleForApplicationAutoScaling_LambdaConcurrency",
        "ScalableDimension": "lambda:function:ProvisionedConcurrency",
        "ServiceNamespace": "lambda"
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/RedactDocumentsAlias/AliasScaling/Target/Resource"
      }
    },
    "CDKMetadata": {
      "Type": "AWS::CDK::Metadata",
      "Properties": {
        "Analytics": "v2:deflate64:H4sIAAAAAAAA/+1XUW/bNhD+LeVjwGhp9jL4TXG7LkCzeJG7PhhGcCYvMhuKFHhkUk/Qfy8oibK8pms2DGvXBggQ8jvy7r473p18mp2ePM9OnsE9HQt5e6zVJmsKD+KWwz1dNxqqjYSseWHFLbrzCkr8ORjhlTWrht0My1+hQjZjR4wziSScqiM6IMLKJHRWp6VXFdrgh12FlXW7Qv3Ri1v+pPvf0I3mTjlrKjT+71sb//5bs1+C5LfP8Osn+X/V/V0k56nGnhh+s/Q4c0jo7lDOrRHBOTT+5XsUIRqiL5bjx7i15vMbkz7I4nqBrlJEcZfgN05PPtUG1RD8drmro6X8bXF9nl90bjtis4aB1vYe5aVTpRos8QReoN9aSWy2Yq9eLhlni8tiydaj/BcEie7g0tyhROMVaGIz7wK2vd9vnOaFMqVGb83kqzIEJYf7/efnIrjaEn4qTIdRnIRX2/KVs6Eetg+k7q4W+1URNgY9fZzDLRip0SUDwUSL40MFGYMCEjzEqBwxHjmuHxaxI7Zu13zC9quis+a/o6PesT72k3c2iHiuFdAqPhMFNLXey6eByYO3hQCtTMlmkawyc6hBKL9L2YT3B0i77o11RlqOwl0DEXrKJj9B8ohEWXaFtSXlrdudAeFqzbUtKWteD6GKNIbl6Gh07XsAuzCmQLScfszOgrhFPwRKQZU1V1ZjzCRRqFCe7WL1104ZoWrQuRA2jG2rPxMv5PtG0qZXDgZKlAurldj1mZ4iuTMpuf35pV0kK/s7g9R7ENtzo5XBUdaVzWeFf633H3PkB2QU0mcJftLLLidRP+/xriekC0t71RX7n9h+DEtZePAYZwpNCD4M0wTbF+aDCh7vRcejpxBfVirRvi7JUNYUYTNOxVXDvK1V6k1oZG3VGPTaWW+F1WyWWg5nN0p7dCl2fbubQG+V314gEZR4ZmU64bDcDziJIF+j9+h+CximJTH1rOVQ11oJiBsI3lLfrLImVknsXLDRmHvv1CZ45AlZgivRrxoWB7QSGKuOahA4JUHD4ReqQkN71xySDU7geZpykx7/mAbZkThwpG15F/rCQ6lM2T2ywQhPizR+uhEUT1wGXwfPRSBvq+vkFGX5Pc07bFRxuB0ehrESs3f0w93zn7LTk+z02TtS6niYJtlV//8D6MID6V8SAAA="
      },
      "Metadata": {
        "aws:cdk:path": "PIILambdaStack/CDKMetadata/Default"
      }
    }
  },
  "Outputs": {
    "getwflambdaurl": {
      "Description": "Get Workflows Lambda URL",
      "Value": {
        "Fn::GetAtt": [
          "medgetworkflowFunctionUrl62C11C80",
          "FunctionUrl"
        ]
      },
      "Export": {
        "Name": "getWfFunctionUrl"
      }
    },
    "ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18": {
      "Value": {
        "Fn::GetAtt": [
          "medinittextractprocess18CC719B",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocess18CC719BArnE6159E18"
      }
    },
    "ExportsOutputFnGetAttmedupdateworkflowD38FD88DArn277A783D": {
      "Value": {
        "Fn::GetAtt": [
          "medupdateworkflowD38FD88D",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedupdateworkflowD38FD88DArn277A783D"
      }
    },
    "ExportsOutputFnGetAttmedphidetection23DE89E3ArnF862252B": {
      "Value": {
        "Fn::GetAtt": [
          "medphidetection23DE89E3",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedphidetection23DE89E3ArnF862252B"
      }
    },
    "ExportsOutputFnGetAttmedphistatuscheck43BB5549ArnA7693166": {
      "Value": {
        "Fn::GetAtt": [
          "medphistatuscheck43BB5549",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedphistatuscheck43BB5549ArnA7693166"
      }
    },
    "ExportsOutputFnGetAttmedphiprocessoutput6DF35AE1Arn6EFC1F9B": {
      "Value": {
        "Fn::GetAtt": [
          "medphiprocessoutput6DF35AE1",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedphiprocessoutput6DF35AE1Arn6EFC1F9B"
      }
    },
    "ExportsOutputFnGetAttmedprepredactC79F7D6FArnBD16169B": {
      "Value": {
        "Fn::GetAtt": [
          "medprepredactC79F7D6F",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedprepredactC79F7D6FArnBD16169B"
      }
    },
    "ExportsOutputFnGetAttmedredactdocuments9492A23FArn7CDE355F": {
      "Value": {
        "Fn::GetAtt": [
          "medredactdocuments9492A23F",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedredactdocuments9492A23FArn7CDE355F"
      }
    },
    "ExportsOutputFnGetAttmedinitstatemachine30F217BAArn56D13C23": {
      "Value": {
        "Fn::GetAtt": [
          "medinitstatemachine30F217BA",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedinitstatemachine30F217BAArn56D13C23"
      }
    },
    "ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A": {
      "Value": {
        "Fn::GetAtt": [
          "medinittextractprocessbulkA11F2F7D",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedinittextractprocessbulkA11F2F7DArn4FEB9E9A"
      }
    },
    "ExportsOutputRefmedprocesstextractop6553CAD9629B36EF": {
      "Value": {
        "Ref": "medprocesstextractop6553CAD9"
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputRefmedprocesstextractop6553CAD9629B36EF"
      }
    },
    "ExportsOutputFnGetAttmedprocesstextractop6553CAD9Arn480671FD": {
      "Value": {
        "Fn::GetAtt": [
          "medprocesstextractop6553CAD9",
          "Arn"
        ]
      },
      "Export": {
        "Name": "PIILambdaStack:ExportsOutputFnGetAttmedprocesstextractop6553CAD9Arn480671FD"
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
