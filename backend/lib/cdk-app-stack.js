/**
 * Creates Resources required for the front-end app
 * - Amazon S3 Bucket for Web UI File uploads
 * - Amazon Cognito UserPool and Identity Pool
 * - IAM Roles For the cognito Identity Pool
 */

const {Stack, CfnOutput, RemovalPolicy, Duration } = require('aws-cdk-lib');
const cognito = require('aws-cdk-lib/aws-cognito');
const s3 = require('aws-cdk-lib/aws-s3');
const iam = require('aws-cdk-lib/aws-iam');
const cr = require('aws-cdk-lib/custom-resources');
const UserPoolUser = require("./CognitoUserPoolUser");
class CdkPIIAppStack extends Stack {
  static RootBucket;
  static UserPool;
  static UserPoolClient;
  static CognitoAuthRole;
  /**
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {    
    super(scope, id, props);
    
    /**
     * Root S3 bucket for the app
     */
    const root_bucket = new s3.Bucket(this, 'medbox-bucket', {
      bucketName: `${process.env.ROOT_BUCKET}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      cors: [
              {      
                allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.DELETE
                      ],
                allowedOrigins: ['*'],
                allowedHeaders: ['*'],
                exposedHeaders: [
                  "x-amz-server-side-encryption",
                  "x-amz-request-id",
                  "x-amz-id-2",
                  "ETag"
                ],
                maxAge: 3000
              }
            ],
      // HIPAA-compliant lifecycle rules for PHI/PII data
      lifecycleRules: [
        {
          // Rule for PHI detection results (most sensitive data)
          id: 'phi-output-lifecycle',
          prefix: 'public/phi-output/',
          transitions: [
            {
              // Move directly to Glacier after 90 days
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
          // No expiration rule - manual deletion process required for HIPAA compliance
        },
        {
          // Rule for processed documents
          id: 'processed-docs-lifecycle',
          prefix: 'public/output/',
          transitions: [
            {
              // Move directly to Glacier after 90 days
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
          // No expiration rule - manual deletion process required for HIPAA compliance
        },
        {
          // Rule for workflows
          id: 'workflows-lifecycle',
          prefix: 'public/workflows/',
          transitions: [
            {
              // Move directly to Glacier after 90 days
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
          // No expiration rule - manual deletion process required for HIPAA compliance
        }
      ]
    });

    this.RootBucket = root_bucket;

    new CfnOutput(this, 'RootBucket', {
      value: root_bucket.bucketName,
      description: 'Root S3 Bucket',
      exportName: 'RootBucket'
    });

    /**
     * Cognito UserPool for the App
     */

     const user_pool = new cognito.UserPool(this, 'user-pool', {
      userPoolName: `${process.env.DOMAIN_COGNITO}-userpool`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
        email:{
          required: true,
          mutable: false
        }
      },
      customAttributes:{
        userRole: new cognito.StringAttribute({minLen: 1, maxLen: 255, mutable: true})
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.UserPool = user_pool;

    //export user pool id
    new CfnOutput(this, 'userPoolId', {
      value: user_pool.userPoolId,
      description: 'User Pool ID',
      exportName: 'userPoolId',
    });

    // User Pool Client Attributes
    const standardCognitoAttributes = {       
      email: true,
      familyName: true,
      givenName: true,
      locale: true,
      phoneNumber: true,
      emailVerified: true
    };

    const standardCognitoWriteAttributes = {       
      email: true,
      familyName: true,
      givenName: true,
      locale: true,
      phoneNumber: true
    };

    const clientReadAttributes = new cognito.ClientAttributes()
    .withStandardAttributes(standardCognitoAttributes);

    const clientWriteAttributes = new cognito.ClientAttributes()
    .withStandardAttributes(standardCognitoWriteAttributes);

    const userpool_client = user_pool.addClient('med-app-client', {
      enableTokenRevocation: true,
      generateSecret: false,
      authFlows:{        
        adminUserPassword: true,
        custom: true,
        userPassword: false,
        userSrp: true
      },      
      readAttributes: clientReadAttributes,
      writeAttributes: clientWriteAttributes,
      oAuth:{
        flows:{
          authorizationCodeGrant: true
        },
        scopes:[cognito.OAuthScope.EMAIL, cognito.OAuthScope.PHONE, cognito.OAuthScope.PROFILE, cognito.OAuthScope.OPENID]
      }
    });
    const clientId = userpool_client.userPoolClientId;
    this.UserPoolClient = clientId;

    //export web client id
    new CfnOutput(this, 'userPoolWebClientId', {
      value: clientId,
      description: 'User Pool Web Client ID',
      exportName: 'userPoolWebClientId',
    }); 

    //Create a Cognito Identity Pool
    const identity_pool = new cognito.CfnIdentityPool(this, 'med-identity-pool', {
      identityPoolName: 'med_identity_pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: clientId,
          providerName: user_pool.userPoolProviderName,
        },
      ],            
    });

    identity_pool.applyRemovalPolicy(RemovalPolicy.DESTROY)
    
    // Create user groups: admin and customer using custom resources
    const createAdminGroup = new cr.AwsCustomResource(this, 'CreateAdminGroup', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'createGroup',
        parameters: {
          GroupName: 'admin',
          Description: 'Admin group with full access to PII/PHI data',
          UserPoolId: user_pool.userPoolId,
          Precedence: 0  // Lower precedence takes priority (0 is highest)
        },
        physicalResourceId: cr.PhysicalResourceId.of('admin-group-creation'),
      },
      onUpdate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'updateGroup',
        parameters: {
          GroupName: 'admin',
          Description: 'Admin group with full access to PII/PHI data',
          UserPoolId: user_pool.userPoolId,
          Precedence: 0
        },
        physicalResourceId: cr.PhysicalResourceId.of('admin-group-update'),
      },
      onDelete: {
        service: 'CognitoIdentityServiceProvider',
        action: 'deleteGroup',
        parameters: {
          GroupName: 'admin',
          UserPoolId: user_pool.userPoolId,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: true,
    });

    const createCustomerGroup = new cr.AwsCustomResource(this, 'CreateCustomerGroup', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'createGroup',
        parameters: {
          GroupName: 'customer',
          Description: 'Customer group with limited access to PII/PHI data',
          UserPoolId: user_pool.userPoolId,
          Precedence: 10
        },
        physicalResourceId: cr.PhysicalResourceId.of('customer-group-creation'),
      },
      onUpdate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'updateGroup',
        parameters: {
          GroupName: 'customer',
          Description: 'Customer group with limited access to PII/PHI data',
          UserPoolId: user_pool.userPoolId,
          Precedence: 10
        },
        physicalResourceId: cr.PhysicalResourceId.of('customer-group-update'),
      },
      onDelete: {
        service: 'CognitoIdentityServiceProvider',
        action: 'deleteGroup',
        parameters: {
          GroupName: 'customer',
          UserPoolId: user_pool.userPoolId,
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: true,
    });

    //export Identity id
    new CfnOutput(this, 'identityPoolId', {
      value: identity_pool.ref,
      description: 'Identity Pool  ID',
      exportName: 'IdentityPoolId',
    });

      //Create Unauth Role for the identity pool
    const identityUnauthRole = new iam.Role(
      this,
      'pii-cognito-unauth-role',
      {
        roleName: 'pii-cognito-unauth-role',
        description: 'Default role for anonymous users',
        assumedBy: new iam.FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identity_pool.ref,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'unauthenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity',
        ),
      },
    );

    identityUnauthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["mobileanalytics:PutEvents", "cognito-sync:*"],
        resources: ["*"],
    }));

    //Create Auth Role for the identity pool
    const identityAuthRole = new iam.Role(
      this, 
      'pii-cognito-auth-role', 
      {
        roleName: 'pii-cognito-auth-role',
        description: 'Default role for authenticated users',
        assumedBy: new iam.FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identity_pool.ref,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity',
        ),
    });

    identityAuthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["mobileanalytics:PutEvents",
                  "cognito-sync:*",
                  "cognito-identity:*"],
        resources: ["*"],
    }));

    identityAuthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ],
        resources: [
          `arn:aws:s3:::${root_bucket.bucketName}/public/*`,
          `arn:aws:s3:::${root_bucket.bucketName}/public/phi-output/*`,  // Explicit permission for PHI output data
          `arn:aws:s3:::${root_bucket.bucketName}/public/output/*`,       // Explicit permission for output data
          `arn:aws:s3:::${root_bucket.bucketName}/protected/${"${cognito-identity.amazonaws.com:sub}"}/*`,
          `arn:aws:s3:::${root_bucket.bucketName}/private/${"${cognito-identity.amazonaws.com:sub}"}/*`
        ]
    }));

    identityAuthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [          
          "s3:PutObject"
        ],
        resources: [
          `arn:aws:s3:::${root_bucket.bucketName}/uploads/*`
        ]
    }));

    identityAuthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [          
          "s3:GetObject"
        ],
        resources: [
          `arn:aws:s3:::i${root_bucket.bucketName}/protected/*`
        ]
    }))

    identityAuthRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [          
          "s3:ListBucket"
        ],
        resources: [
          `arn:aws:s3:::${root_bucket.bucketName}`
        ],
        conditions: {
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
        }
    }));

    /**
     * Allow the User to call Lambda Rest Endpoints (Lambda Function URLs) once logged in
     * https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html
     */
    identityAuthRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["lambda:InvokeFunctionUrl"],
      resources: ["*"],
      conditions: {
        "StringEquals":{
          "lambda:FunctionUrlAuthType": "AWS_IAM"
        }
      }
    }));

    this.CognitoAuthRole = identityAuthRole.roleArn;

    // Add IAM Roles to Cognito Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      'pii-identity-pool-role-attachment',
      {
        identityPoolId: identity_pool.ref,
        roles: {
          authenticated: identityAuthRole.roleArn,
          unauthenticated: identityUnauthRole.roleArn,
        },
      },
    );

    //export User Pool Region
    new CfnOutput(this, 'region', {
      value: process.env.PII_REGION,
      description: 'User Pool Region',
      exportName: 'region',
    });   

    // Create the admin user
    const adminUser = new UserPoolUser(this, 'userpool_admin_user', {
      userPool: user_pool.userPoolId,
      username: process.env.ADMIN_USER,
      password: process.env.ADMIN_PASSWORD,
      userRole: 'admin'
    });
    
    // Create the customer user
    const customerUser = new UserPoolUser(this, 'userpool_customer_user', {
      userPool: user_pool.userPoolId,
      username: process.env.CUSTOMER_USER,
      password: process.env.CUSTOMER_PASSWORD,
      userRole: process.env.CUSTOMER_ROLE || 'customer'
    });
    
    // Add users to groups using custom resources
    const addAdminToGroup = new cr.AwsCustomResource(this, 'AddAdminToGroup', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminAddUserToGroup',
        parameters: {
          UserPoolId: user_pool.userPoolId,
          Username: process.env.ADMIN_USER,
          GroupName: 'admin',
        },
        physicalResourceId: cr.PhysicalResourceId.of('admin-user-group-assignment'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: true,
    });
    
    // Add dependency to ensure user is created before being added to group
    addAdminToGroup.node.addDependency(adminUser);
    addAdminToGroup.node.addDependency(createAdminGroup);
    
    const addCustomerToGroup = new cr.AwsCustomResource(this, 'AddCustomerToGroup', {
      onCreate: {
        service: 'CognitoIdentityServiceProvider',
        action: 'adminAddUserToGroup',
        parameters: {
          UserPoolId: user_pool.userPoolId,
          Username: process.env.CUSTOMER_USER,
          GroupName: 'customer',
        },
        physicalResourceId: cr.PhysicalResourceId.of('customer-user-group-assignment'),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: true,
    });
    
    // Add dependency to ensure user is created before being added to group
    addCustomerToGroup.node.addDependency(customerUser);
    addCustomerToGroup.node.addDependency(createCustomerGroup);
  }
}

module.exports = { CdkPIIAppStack }
