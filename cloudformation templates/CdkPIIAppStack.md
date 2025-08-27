```yaml
{
  "Resources": {
    "medboxbucketC1428341": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketEncryption": {
          "ServerSideEncryptionConfiguration": [
            {
              "ServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
              }
            }
          ]
        },
        "BucketName": "redaction-pipeline-bucket00",
        "CorsConfiguration": {
          "CorsRules": [
            {
              "AllowedHeaders": [
                "*"
              ],
              "AllowedMethods": [
                "GET",
                "HEAD",
                "POST",
                "PUT",
                "DELETE"
              ],
              "AllowedOrigins": [
                "*"
              ],
              "ExposedHeaders": [
                "x-amz-server-side-encryption",
                "x-amz-request-id",
                "x-amz-id-2",
                "ETag"
              ],
              "MaxAge": 3000
            }
          ]
        },
        "LifecycleConfiguration": {
          "Rules": [
            {
              "Id": "phi-output-lifecycle",
              "Prefix": "public/phi-output/",
              "Status": "Enabled",
              "Transitions": [
                {
                  "StorageClass": "GLACIER",
                  "TransitionInDays": 90
                }
              ]
            },
            {
              "Id": "processed-docs-lifecycle",
              "Prefix": "public/output/",
              "Status": "Enabled",
              "Transitions": [
                {
                  "StorageClass": "GLACIER",
                  "TransitionInDays": 90
                }
              ]
            },
            {
              "Id": "workflows-lifecycle",
              "Prefix": "public/workflows/",
              "Status": "Enabled",
              "Transitions": [
                {
                  "StorageClass": "GLACIER",
                  "TransitionInDays": 90
                }
              ]
            }
          ]
        },
        "Tags": [
          {
            "Key": "aws-cdk:auto-delete-objects",
            "Value": "true"
          }
        ],
        "VersioningConfiguration": {
          "Status": "Enabled"
        }
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/medbox-bucket/Resource"
      }
    },
    "medboxbucketPolicy50F1EA3B": {
      "Type": "AWS::S3::BucketPolicy",
      "Properties": {
        "Bucket": {
          "Ref": "medboxbucketC1428341"
        },
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "s3:DeleteObject*",
                "s3:GetBucket*",
                "s3:List*",
                "s3:PutBucketPolicy"
              ],
              "Effect": "Allow",
              "Principal": {
                "AWS": {
                  "Fn::GetAtt": [
                    "CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092",
                    "Arn"
                  ]
                }
              },
              "Resource": [
                {
                  "Fn::GetAtt": [
                    "medboxbucketC1428341",
                    "Arn"
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      {
                        "Fn::GetAtt": [
                          "medboxbucketC1428341",
                          "Arn"
                        ]
                      },
                      "/*"
                    ]
                  ]
                }
              ]
            }
          ],
          "Version": "2012-10-17"
        }
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/medbox-bucket/Policy/Resource"
      }
    },
    "medboxbucketAutoDeleteObjectsCustomResource4545CBE5": {
      "Type": "Custom::S3AutoDeleteObjects",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F",
            "Arn"
          ]
        },
        "BucketName": {
          "Ref": "medboxbucketC1428341"
        }
      },
      "DependsOn": [
        "medboxbucketPolicy50F1EA3B"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/medbox-bucket/AutoDeleteObjectsCustomResource/Default"
      }
    },
    "CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              }
            }
          ]
        },
        "ManagedPolicyArns": [
          {
            "Fn::Sub": "arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/Custom::S3AutoDeleteObjectsCustomResourceProvider/Role"
      }
    },
    "CustomS3AutoDeleteObjectsCustomResourceProviderHandler9D90184F": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "Code": {
          "S3Bucket": "cdk-hnb659fds-assets-135511470273-us-east-1",
          "S3Key": "faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6.zip"
        },
        "Timeout": 900,
        "MemorySize": 128,
        "Handler": "index.handler",
        "Role": {
          "Fn::GetAtt": [
            "CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092",
            "Arn"
          ]
        },
        "Runtime": "nodejs22.x",
        "Description": {
          "Fn::Join": [
            "",
            [
              "Lambda function for auto-deleting objects in ",
              {
                "Ref": "medboxbucketC1428341"
              },
              " S3 bucket."
            ]
          ]
        }
      },
      "DependsOn": [
        "CustomS3AutoDeleteObjectsCustomResourceProviderRole3B1BD092"
      ],
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/Custom::S3AutoDeleteObjectsCustomResourceProvider/Handler",
        "aws:asset:path": "asset.faa95a81ae7d7373f3e1f242268f904eb748d8d0fdd306e8a6fe515a1905a7d6",
        "aws:asset:property": "Code"
      }
    },
    "userpool38E431F2": {
      "Type": "AWS::Cognito::UserPool",
      "Properties": {
        "AccountRecoverySetting": {
          "RecoveryMechanisms": [
            {
              "Name": "verified_email",
              "Priority": 1
            }
          ]
        },
        "AdminCreateUserConfig": {
          "AllowAdminCreateUserOnly": true
        },
        "AutoVerifiedAttributes": [
          "email"
        ],
        "EmailVerificationMessage": "The verification code to your new account is {####}",
        "EmailVerificationSubject": "Verify your new account",
        "Policies": {
          "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": true,
            "RequireUppercase": true
          }
        },
        "Schema": [
          {
            "Mutable": true,
            "Name": "given_name",
            "Required": true
          },
          {
            "Mutable": true,
            "Name": "family_name",
            "Required": true
          },
          {
            "Mutable": false,
            "Name": "email",
            "Required": true
          },
          {
            "AttributeDataType": "String",
            "Mutable": true,
            "Name": "userRole",
            "StringAttributeConstraints": {
              "MaxLength": "255",
              "MinLength": "1"
            }
          }
        ],
        "SmsVerificationMessage": "The verification code to your new account is {####}",
        "UserPoolName": "redaction-pipeline-cognito90-userpool",
        "UsernameAttributes": [
          "email"
        ],
        "VerificationMessageTemplate": {
          "DefaultEmailOption": "CONFIRM_WITH_CODE",
          "EmailMessage": "The verification code to your new account is {####}",
          "EmailSubject": "Verify your new account",
          "SmsMessage": "The verification code to your new account is {####}"
        }
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/user-pool/Resource"
      }
    },
    "userpoolmedappclient4695652E": {
      "Type": "AWS::Cognito::UserPoolClient",
      "Properties": {
        "AllowedOAuthFlows": [
          "code"
        ],
        "AllowedOAuthFlowsUserPoolClient": true,
        "AllowedOAuthScopes": [
          "email",
          "phone",
          "profile",
          "openid"
        ],
        "CallbackURLs": [
          "https://example.com"
        ],
        "EnableTokenRevocation": true,
        "ExplicitAuthFlows": [
          "ALLOW_ADMIN_USER_PASSWORD_AUTH",
          "ALLOW_CUSTOM_AUTH",
          "ALLOW_USER_SRP_AUTH",
          "ALLOW_REFRESH_TOKEN_AUTH"
        ],
        "GenerateSecret": false,
        "ReadAttributes": [
          "email",
          "email_verified",
          "family_name",
          "given_name",
          "locale",
          "phone_number"
        ],
        "SupportedIdentityProviders": [
          "COGNITO"
        ],
        "UserPoolId": {
          "Ref": "userpool38E431F2"
        },
        "WriteAttributes": [
          "email",
          "family_name",
          "given_name",
          "locale",
          "phone_number"
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/user-pool/med-app-client/Resource"
      }
    },
    "medidentitypool": {
      "Type": "AWS::Cognito::IdentityPool",
      "Properties": {
        "AllowUnauthenticatedIdentities": false,
        "CognitoIdentityProviders": [
          {
            "ClientId": {
              "Ref": "userpoolmedappclient4695652E"
            },
            "ProviderName": {
              "Fn::GetAtt": [
                "userpool38E431F2",
                "ProviderName"
              ]
            }
          }
        ],
        "IdentityPoolName": "med_identity_pool"
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/med-identity-pool"
      }
    },
    "CreateAdminGroupB942A542": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"createGroup\",\"parameters\":{\"GroupName\":\"admin\",\"Description\":\"Admin group with full access to PII/PHI data\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Precedence\":0},\"physicalResourceId\":{\"id\":\"admin-group-creation\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"updateGroup\",\"parameters\":{\"GroupName\":\"admin\",\"Description\":\"Admin group with full access to PII/PHI data\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Precedence\":0},\"physicalResourceId\":{\"id\":\"admin-group-update\"}}"
            ]
          ]
        },
        "Delete": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"deleteGroup\",\"parameters\":{\"GroupName\":\"admin\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "CreateAdminGroupCustomResourcePolicy87DBD29B"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/CreateAdminGroup/Resource/Default"
      }
    },
    "CreateAdminGroupCustomResourcePolicy87DBD29B": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-idp:CreateGroup",
                "cognito-idp:DeleteGroup",
                "cognito-idp:UpdateGroup"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "CreateAdminGroupCustomResourcePolicy87DBD29B",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/CreateAdminGroup/CustomResourcePolicy/Resource"
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
        "aws:cdk:path": "CdkPIIAppStack/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource"
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
        "aws:cdk:path": "CdkPIIAppStack/AWS679f53fac002430cb0da5b7982bd2287/Resource",
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
        "aws:cdk:path": "CdkPIIAppStack/AWS679f53fac002430cb0da5b7982bd2287/LogGroup/Resource"
      }
    },
    "CreateCustomerGroup577C1C5F": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"createGroup\",\"parameters\":{\"GroupName\":\"customer\",\"Description\":\"Customer group with limited access to PII/PHI data\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Precedence\":10},\"physicalResourceId\":{\"id\":\"customer-group-creation\"}}"
            ]
          ]
        },
        "Update": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"updateGroup\",\"parameters\":{\"GroupName\":\"customer\",\"Description\":\"Customer group with limited access to PII/PHI data\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Precedence\":10},\"physicalResourceId\":{\"id\":\"customer-group-update\"}}"
            ]
          ]
        },
        "Delete": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"deleteGroup\",\"parameters\":{\"GroupName\":\"customer\",\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "CreateCustomerGroupCustomResourcePolicy72001FE4"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/CreateCustomerGroup/Resource/Default"
      }
    },
    "CreateCustomerGroupCustomResourcePolicy72001FE4": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-idp:CreateGroup",
                "cognito-idp:DeleteGroup",
                "cognito-idp:UpdateGroup"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "CreateCustomerGroupCustomResourcePolicy72001FE4",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/CreateCustomerGroup/CustomResourcePolicy/Resource"
      }
    },
    "piicognitounauthroleF2A192D4": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRoleWithWebIdentity",
              "Condition": {
                "StringEquals": {
                  "cognito-identity.amazonaws.com:aud": {
                    "Ref": "medidentitypool"
                  }
                },
                "ForAnyValue:StringLike": {
                  "cognito-identity.amazonaws.com:amr": "unauthenticated"
                }
              },
              "Effect": "Allow",
              "Principal": {
                "Federated": "cognito-identity.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "Description": "Default role for anonymous users",
        "RoleName": "pii-cognito-unauth-role"
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/pii-cognito-unauth-role/Resource"
      }
    },
    "piicognitounauthroleDefaultPolicy51BE0499": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-sync:*",
                "mobileanalytics:PutEvents"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "piicognitounauthroleDefaultPolicy51BE0499",
        "Roles": [
          {
            "Ref": "piicognitounauthroleF2A192D4"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/pii-cognito-unauth-role/DefaultPolicy/Resource"
      }
    },
    "piicognitoauthroleBC449F3C": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRoleWithWebIdentity",
              "Condition": {
                "StringEquals": {
                  "cognito-identity.amazonaws.com:aud": {
                    "Ref": "medidentitypool"
                  }
                },
                "ForAnyValue:StringLike": {
                  "cognito-identity.amazonaws.com:amr": "authenticated"
                }
              },
              "Effect": "Allow",
              "Principal": {
                "Federated": "cognito-identity.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        },
        "Description": "Default role for authenticated users",
        "RoleName": "pii-cognito-auth-role"
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/pii-cognito-auth-role/Resource"
      }
    },
    "piicognitoauthroleDefaultPolicy261F3E62": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-identity:*",
                "cognito-sync:*",
                "mobileanalytics:PutEvents"
              ],
              "Effect": "Allow",
              "Resource": "*"
            },
            {
              "Action": [
                "s3:DeleteObject",
                "s3:GetObject",
                "s3:PutObject"
              ],
              "Effect": "Allow",
              "Resource": [
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:aws:s3:::",
                      {
                        "Ref": "medboxbucketC1428341"
                      },
                      "/private/${cognito-identity.amazonaws.com:sub}/*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:aws:s3:::",
                      {
                        "Ref": "medboxbucketC1428341"
                      },
                      "/protected/${cognito-identity.amazonaws.com:sub}/*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:aws:s3:::",
                      {
                        "Ref": "medboxbucketC1428341"
                      },
                      "/public/*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:aws:s3:::",
                      {
                        "Ref": "medboxbucketC1428341"
                      },
                      "/public/output/*"
                    ]
                  ]
                },
                {
                  "Fn::Join": [
                    "",
                    [
                      "arn:aws:s3:::",
                      {
                        "Ref": "medboxbucketC1428341"
                      },
                      "/public/phi-output/*"
                    ]
                  ]
                }
              ]
            },
            {
              "Action": "s3:PutObject",
              "Effect": "Allow",
              "Resource": {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::",
                    {
                      "Ref": "medboxbucketC1428341"
                    },
                    "/uploads/*"
                  ]
                ]
              }
            },
            {
              "Action": "s3:GetObject",
              "Effect": "Allow",
              "Resource": {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::i",
                    {
                      "Ref": "medboxbucketC1428341"
                    },
                    "/protected/*"
                  ]
                ]
              }
            },
            {
              "Action": "s3:ListBucket",
              "Condition": {
                "StringLike": {
                  "s3:prefix": [
                    "public/",
                    "public/*",
                    "public/phi-output/",
                    "public/phi-output/*",
                    "protected/",
                    "protected/*",
                    "private/${cognito-identity.amazonaws.com:sub}/",
                    "private/${cognito-identity.amazonaws.com:sub}/*"
                  ]
                }
              },
              "Effect": "Allow",
              "Resource": {
                "Fn::Join": [
                  "",
                  [
                    "arn:aws:s3:::",
                    {
                      "Ref": "medboxbucketC1428341"
                    }
                  ]
                ]
              }
            },
            {
              "Action": "lambda:InvokeFunctionUrl",
              "Condition": {
                "StringEquals": {
                  "lambda:FunctionUrlAuthType": "AWS_IAM"
                }
              },
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "piicognitoauthroleDefaultPolicy261F3E62",
        "Roles": [
          {
            "Ref": "piicognitoauthroleBC449F3C"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/pii-cognito-auth-role/DefaultPolicy/Resource"
      }
    },
    "piiidentitypoolroleattachment": {
      "Type": "AWS::Cognito::IdentityPoolRoleAttachment",
      "Properties": {
        "IdentityPoolId": {
          "Ref": "medidentitypool"
        },
        "Roles": {
          "authenticated": {
            "Fn::GetAtt": [
              "piicognitoauthroleBC449F3C",
              "Arn"
            ]
          },
          "unauthenticated": {
            "Fn::GetAtt": [
              "piicognitounauthroleF2A192D4",
              "Arn"
            ]
          }
        }
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/pii-identity-pool-role-attachment"
      }
    },
    "userpooladminuserAwsCustomResourceCreateUserBB9FA583": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminCreateUser\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"miniarja@amazon.fr\",\"MessageAction\":\"SUPPRESS\",\"TemporaryPassword\":\"Password1234@\",\"UserAttributes\":[{\"Name\":\"email\",\"Value\":\"miniarja@amazon.fr\"},{\"Name\":\"given_name\",\"Value\":\"Admin\"},{\"Name\":\"family_name\",\"Value\":\"User\"},{\"Name\":\"custom:userRole\",\"Value\":\"admin\"}]},\"physicalResourceId\":{\"id\":\"AwsCustomResource-CreateUser-miniarja@amazon.fr\"}}"
            ]
          ]
        },
        "Delete": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminDeleteUser\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"miniarja@amazon.fr\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_admin_user/AwsCustomResource-CreateUser/Resource/Default"
      }
    },
    "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminDeleteUser"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_admin_user/AwsCustomResource-CreateUser/CustomResourcePolicy/Resource"
      }
    },
    "userpooladminuserAwsCustomResourceForcePassword896F3435": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminSetUserPassword\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"miniarja@amazon.fr\",\"Password\":\"Password1234@\",\"Permanent\":true},\"physicalResourceId\":{\"id\":\"AwsCustomResource-ForcePassword-miniarja@amazon.fr\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598",
        "userpooladminuserAwsCustomResourceCreateUserBB9FA583",
        "userpooladminuserAwsCustomResourceForcePasswordCustomResourcePolicyEEEE6891"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_admin_user/AwsCustomResource-ForcePassword/Resource/Default"
      }
    },
    "userpooladminuserAwsCustomResourceForcePasswordCustomResourcePolicyEEEE6891": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "cognito-idp:AdminSetUserPassword",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "userpooladminuserAwsCustomResourceForcePasswordCustomResourcePolicyEEEE6891",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "DependsOn": [
        "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598",
        "userpooladminuserAwsCustomResourceCreateUserBB9FA583"
      ],
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_admin_user/AwsCustomResource-ForcePassword/CustomResourcePolicy/Resource"
      }
    },
    "userpoolcustomeruserAwsCustomResourceCreateUserE9B9E034": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminCreateUser\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"jabriminyar@gmail.com\",\"MessageAction\":\"SUPPRESS\",\"TemporaryPassword\":\"Customer1234@\",\"UserAttributes\":[{\"Name\":\"email\",\"Value\":\"jabriminyar@gmail.com\"},{\"Name\":\"given_name\",\"Value\":\"Customer\"},{\"Name\":\"family_name\",\"Value\":\"User\"},{\"Name\":\"custom:userRole\",\"Value\":\"customer\"}]},\"physicalResourceId\":{\"id\":\"AwsCustomResource-CreateUser-jabriminyar@gmail.com\"}}"
            ]
          ]
        },
        "Delete": {
          "Fn::Join": [
            "",
            [
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminDeleteUser\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"jabriminyar@gmail.com\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_customer_user/AwsCustomResource-CreateUser/Resource/Default"
      }
    },
    "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": [
                "cognito-idp:AdminCreateUser",
                "cognito-idp:AdminDeleteUser"
              ],
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_customer_user/AwsCustomResource-CreateUser/CustomResourcePolicy/Resource"
      }
    },
    "userpoolcustomeruserAwsCustomResourceForcePassword0FC55506": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminSetUserPassword\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"jabriminyar@gmail.com\",\"Password\":\"Customer1234@\",\"Permanent\":true},\"physicalResourceId\":{\"id\":\"AwsCustomResource-ForcePassword-jabriminyar@gmail.com\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596",
        "userpoolcustomeruserAwsCustomResourceCreateUserE9B9E034",
        "userpoolcustomeruserAwsCustomResourceForcePasswordCustomResourcePolicy81EEBB4A"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_customer_user/AwsCustomResource-ForcePassword/Resource/Default"
      }
    },
    "userpoolcustomeruserAwsCustomResourceForcePasswordCustomResourcePolicy81EEBB4A": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "cognito-idp:AdminSetUserPassword",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "userpoolcustomeruserAwsCustomResourceForcePasswordCustomResourcePolicy81EEBB4A",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "DependsOn": [
        "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596",
        "userpoolcustomeruserAwsCustomResourceCreateUserE9B9E034"
      ],
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/userpool_customer_user/AwsCustomResource-ForcePassword/CustomResourcePolicy/Resource"
      }
    },
    "AddAdminToGroup47AF815A": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminAddUserToGroup\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"miniarja@amazon.fr\",\"GroupName\":\"admin\"},\"physicalResourceId\":{\"id\":\"admin-user-group-assignment\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "AddAdminToGroupCustomResourcePolicyAF740893",
        "CreateAdminGroupCustomResourcePolicy87DBD29B",
        "CreateAdminGroupB942A542",
        "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598",
        "userpooladminuserAwsCustomResourceCreateUserBB9FA583",
        "userpooladminuserAwsCustomResourceForcePasswordCustomResourcePolicyEEEE6891",
        "userpooladminuserAwsCustomResourceForcePassword896F3435"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/AddAdminToGroup/Resource/Default"
      }
    },
    "AddAdminToGroupCustomResourcePolicyAF740893": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "cognito-idp:AdminAddUserToGroup",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "AddAdminToGroupCustomResourcePolicyAF740893",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "DependsOn": [
        "CreateAdminGroupCustomResourcePolicy87DBD29B",
        "CreateAdminGroupB942A542",
        "userpooladminuserAwsCustomResourceCreateUserCustomResourcePolicy2381D598",
        "userpooladminuserAwsCustomResourceCreateUserBB9FA583",
        "userpooladminuserAwsCustomResourceForcePasswordCustomResourcePolicyEEEE6891",
        "userpooladminuserAwsCustomResourceForcePassword896F3435"
      ],
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/AddAdminToGroup/CustomResourcePolicy/Resource"
      }
    },
    "AddCustomerToGroup7658ECC3": {
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
              "{\"service\":\"CognitoIdentityServiceProvider\",\"action\":\"adminAddUserToGroup\",\"parameters\":{\"UserPoolId\":\"",
              {
                "Ref": "userpool38E431F2"
              },
              "\",\"Username\":\"jabriminyar@gmail.com\",\"GroupName\":\"customer\"},\"physicalResourceId\":{\"id\":\"customer-user-group-assignment\"}}"
            ]
          ]
        },
        "InstallLatestAwsSdk": true
      },
      "DependsOn": [
        "AddCustomerToGroupCustomResourcePolicy08714EA7",
        "CreateCustomerGroupCustomResourcePolicy72001FE4",
        "CreateCustomerGroup577C1C5F",
        "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596",
        "userpoolcustomeruserAwsCustomResourceCreateUserE9B9E034",
        "userpoolcustomeruserAwsCustomResourceForcePasswordCustomResourcePolicy81EEBB4A",
        "userpoolcustomeruserAwsCustomResourceForcePassword0FC55506"
      ],
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/AddCustomerToGroup/Resource/Default"
      }
    },
    "AddCustomerToGroupCustomResourcePolicy08714EA7": {
      "Type": "AWS::IAM::Policy",
      "Properties": {
        "PolicyDocument": {
          "Statement": [
            {
              "Action": "cognito-idp:AdminAddUserToGroup",
              "Effect": "Allow",
              "Resource": "*"
            }
          ],
          "Version": "2012-10-17"
        },
        "PolicyName": "AddCustomerToGroupCustomResourcePolicy08714EA7",
        "Roles": [
          {
            "Ref": "AWS679f53fac002430cb0da5b7982bd2287ServiceRoleC1EA0FF2"
          }
        ]
      },
      "DependsOn": [
        "CreateCustomerGroupCustomResourcePolicy72001FE4",
        "CreateCustomerGroup577C1C5F",
        "userpoolcustomeruserAwsCustomResourceCreateUserCustomResourcePolicy90AAD596",
        "userpoolcustomeruserAwsCustomResourceCreateUserE9B9E034",
        "userpoolcustomeruserAwsCustomResourceForcePasswordCustomResourcePolicy81EEBB4A",
        "userpoolcustomeruserAwsCustomResourceForcePassword0FC55506"
      ],
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/AddCustomerToGroup/CustomResourcePolicy/Resource"
      }
    },
    "CDKMetadata": {
      "Type": "AWS::CDK::Metadata",
      "Properties": {
        "Analytics": "v2:deflate64:H4sIAAAAAAAA/+1YS2/bOBD+LeWxYLRpcln4piRuGiBtDMvZi2EENDmWmVCklg87rqD/XlAkFeWxC2S73WYLH2yJH2c4Mx85I5JH2dHhh+zwHdmaA8ruDgRfZk1hCb3DZGtuGnOcNSeO3oGdN2jZvXwhFaAReo8w0lCpDRETJTjdoRFiYKxWO4QRcVadgQALV8tboNagkdUOMAJJ9a62XEk0QsXxzef8S34+PkMYbUAbriSwJEqVNmg0bxARQm2BfQa7VsxD6Hw8Qxh9GudecXJV+Nbk2v+fjS/HszFa4KR1pXnJpYkeR/ATEAY6gXBfK/MUrMh9XoZA2wVGgq+A7qiAqRMQ3OIsitYaVvw+Nqwm0nAfYBipxT9AcuFlCWOnShvv0NugCXfIe5S8uxxy9irK3vBAC3y6kiElcHiE5d/nR1oyvVjoj8InxMB80WKqSsmtypprA3qilJg3yMXXQYYZEKuCl/K6HkuyFD45VkQYwMjwUl7IXHBi/HpsEFSEi5A7bUjAP0Dz1e55n7FEMqJZbq3mS2c7/RYj6oxV1RANzBBjtkqzlOYNqri8BFnadV8H/nRcw6XagqbEQMrgiJ/xkj9UgAhe1/WLwsWuWiphHgKhVDlpp0DVBvQOjY7+uu4E1hOjOL2cCg7SDghOC7qjdKbuQE5hoygJZSm4U4IETSwUQLWf1Eg7cXb9UahtRzlhFQ/mIkV96eqYTC33SCIO5MFC132cGgh7Rv1WcwvPUJU7T32DVr0jzq6V5l+7CE4Vg3NNpH2YcKrqqN0+5ihQ45ELBtJyu+uYe9KeKuG9IHRdgbQtFqRaMpI1BZelAKvkRyepN+05dn1KBbGJ075upHoBldK7gn9NgOUVKGfTSlIidQhVnmvl6thcRROD5NjU9OGtcEsJNlFEFUtSayKZAJ0MOOkt9gWXMF8wCSOW+Ir5HmHP2eLlrlRJ9jHuY9zHuI9xH+M+xlfFuMCDL+WbCqfbFSTnWsxJlTX9xtZYYsF/+s0w9mKAzpv+TPIauNtTzNS0C3Xeb9Rfht+CF5641/r9otl/baCfAn//VPyomf+PV9T/LYyfP25XaOKR2OP+4sIYVwE76c6WteaS8pqIPBz8YrEKMt1BhMbbo+5YXhFJSghnUx4vZobYLtdRduDRhRRcQjo+PnH3l+j0H4/B54GBoZrXPXH4OziPy2CmeqMPOTJTkzTUs959LP/Q2K+i0mW+n4EWm+MbYgxYk+X+gYUqTdZcxm3OvOl3PP28B+0k0bb4tLtimYJRTlNIW6y/+wX7UeGJ/kSrDWeg/fUc7nwqLCm5LL3OlbO1szhc6tzoqGKyfGsej4JfcmfRYqkYZLfmt82H37Ojw+zo3a3h/CDuv7JpeH4D9KAwdIsXAAA="
      },
      "Metadata": {
        "aws:cdk:path": "CdkPIIAppStack/CDKMetadata/Default"
      }
    }
  },
  "Outputs": {
    "RootBucket": {
      "Description": "Root S3 Bucket",
      "Value": {
        "Ref": "medboxbucketC1428341"
      },
      "Export": {
        "Name": "RootBucket"
      }
    },
    "userPoolId": {
      "Description": "User Pool ID",
      "Value": {
        "Ref": "userpool38E431F2"
      },
      "Export": {
        "Name": "userPoolId"
      }
    },
    "userPoolWebClientId": {
      "Description": "User Pool Web Client ID",
      "Value": {
        "Ref": "userpoolmedappclient4695652E"
      },
      "Export": {
        "Name": "userPoolWebClientId"
      }
    },
    "identityPoolId": {
      "Description": "Identity Pool  ID",
      "Value": {
        "Ref": "medidentitypool"
      },
      "Export": {
        "Name": "IdentityPoolId"
      }
    },
    "region": {
      "Description": "User Pool Region",
      "Value": "us-east-1",
      "Export": {
        "Name": "region"
      }
    },
    "ExportsOutputRefmedboxbucketC1428341547D34A6": {
      "Value": {
        "Ref": "medboxbucketC1428341"
      },
      "Export": {
        "Name": "CdkPIIAppStack:ExportsOutputRefmedboxbucketC1428341547D34A6"
      }
    },
    "ExportsOutputFnGetAttpiicognitoauthroleBC449F3CArnACB63701": {
      "Value": {
        "Fn::GetAtt": [
          "piicognitoauthroleBC449F3C",
          "Arn"
        ]
      },
      "Export": {
        "Name": "CdkPIIAppStack:ExportsOutputFnGetAttpiicognitoauthroleBC449F3CArnACB63701"
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