```yaml 
{
  "Resources": {
    "reactappRoleC6004882": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "amplify.amazonaws.com"
              }
            }
          ],
          "Version": "2012-10-17"
        }
      },
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/react-app/Role/Resource"
      }
    },
    "reactapp95CAD206": {
      "Type": "AWS::Amplify::App",
      "Properties": {
        "BasicAuthConfig": {
          "EnableBasicAuth": false
        },
        "CustomRules": [
          {
            "Source": "</^[^.]+$/>",
            "Status": "200",
            "Target": "/index.html"
          }
        ],
        "IAMServiceRole": {
          "Fn::GetAtt": [
            "reactappRoleC6004882",
            "Arn"
          ]
        },
        "Name": "react-med-app",
        "Platform": "WEB"
      },
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/react-app/Resource"
      }
    },
    "reactappmain21E4C61E": {
      "Type": "AWS::Amplify::Branch",
      "Properties": {
        "AppId": {
          "Fn::GetAtt": [
            "reactapp95CAD206",
            "AppId"
          ]
        },
        "BranchName": "main",
        "EnableAutoBuild": true,
        "EnablePullRequestPreview": true
      },
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/react-app/main/Resource"
      }
    },
    "reactappmainDeploymentResourceA8B3A55E": {
      "Type": "Custom::AmplifyAssetDeployment",
      "Properties": {
        "ServiceToken": {
          "Fn::GetAtt": [
            "comamazonawscdkcustomresourcesamplifyassetdeploymentproviderNestedStackcomamazonawscdkcustomresourcesamplifyassetdeploymentproviderNestedStackResource89BDFEB2",
            "Outputs.PIIWebDeployStackcomamazonawscdkcustomresourcesamplifyassetdeploymentprovideramplifyassetdeploymenthandlerproviderframeworkonEvent9B39490FArn"
          ]
        },
        "AppId": {
          "Fn::GetAtt": [
            "reactapp95CAD206",
            "AppId"
          ]
        },
        "BranchName": "main",
        "S3ObjectKey": "32dd63c60b51cf93a91ce64eafb3a8a1ddeae92b71026e64d16ba3d21fc46415.zip",
        "S3BucketName": "cdk-hnb659fds-assets-135511470273-us-east-1"
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/react-app/main/DeploymentResource/Default"
      }
    },
    "comamazonawscdkcustomresourcesamplifyassetdeploymentproviderNestedStackcomamazonawscdkcustomresourcesamplifyassetdeploymentproviderNestedStackResource89BDFEB2": {
      "Type": "AWS::CloudFormation::Stack",
      "Properties": {
        "TemplateURL": {
          "Fn::Join": [
            "",
            [
              "https://s3.us-east-1.",
              {
                "Ref": "AWS::URLSuffix"
              },
              "/cdk-hnb659fds-assets-135511470273-us-east-1/cfed86d7e9392e4cbdcbefbbaa9d2cbfdd8ee31c5f899cde93642f0e95003870.json"
            ]
          ]
        }
      },
      "UpdateReplacePolicy": "Delete",
      "DeletionPolicy": "Delete",
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/com.amazonaws.cdk.custom-resources.amplify-asset-deployment-provider.NestedStack/com.amazonaws.cdk.custom-resources.amplify-asset-deployment-provider.NestedStackResource",
        "aws:asset:path": "PIIWebDeployStackcomamazonawscdkcustomresourcesamplifyassetdeploymentprovider226D724E.nested.template.json",
        "aws:asset:property": "TemplateURL"
      }
    },
    "CDKMetadata": {
      "Type": "AWS::CDK::Metadata",
      "Properties": {
        "Analytics": "v2:deflate64:H4sIAAAAAAAA/12Py26DMBBFvwUvo8EhZFNlVeADKpElQtHUmMQBbIuxG0WW/73i0U0XoyudO6+b8zw78ZAl+KJUdEM6qm8erg7FAPiiW1A48VCbUTaBIZGfZFe+2SUwOystlMWxEMJ47diFHRjsPctAIZwyesUxtlD1eqERcLKj6t88VL0urF2MckYtHhHofEMi6YgXiwCdeenFIF2JJJs2Qi3J+FnIhh1YC5UnZ6Z/rNd/ANYlV4d3pe+LscWqev3lnfUuQpbiaB/Is+Rzz39cdP9wN0NhbbNm26qF7d31XoygTSf5k44/pw+eZzxPnqRUOnvt1CR5vekv2lANYmgBAAA="
      },
      "Metadata": {
        "aws:cdk:path": "PIIWebDeployStack/CDKMetadata/Default"
      }
    }
  },
  "Outputs": {
    "webappdomain": {
      "Description": "Web App Domain",
      "Value": {
        "Fn::GetAtt": [
          "reactapp95CAD206",
          "DefaultDomain"
        ]
      },
      "Export": {
        "Name": "webAppDomain"
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
