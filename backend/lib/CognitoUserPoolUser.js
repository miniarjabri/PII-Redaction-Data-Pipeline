
/**
 * Cognito User Pool User Construct
 * 
 * This custom CDK construct creates a user in a Cognito user pool and sets up the user's
 * attributes, password, and group membership. It uses AWS Custom Resources to interact
 * with the Cognito API during CloudFormation deployment.
 * 
 * The construct handles:
 * 1. Creating a user in the Cognito user pool
 * 2. Setting a permanent password for the user (bypassing the temporary password flow)
 * 3. Optionally adding the user to a Cognito user pool group
 */
const {Construct} = require("constructs");
const {CfnUserPoolUserToGroupAttachment} = require("aws-cdk-lib/aws-cognito");
const {AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId} = require("aws-cdk-lib/custom-resources");

class CognitoUserPoolUser extends Construct {

    /**
     * Create a new Cognito user pool user.
     * 
     * @param {Construct} scope - The parent construct
     * @param {string} id - The construct ID
     * @param {object} props - The construct properties
     * @param {string} props.userPool - The Cognito user pool ID
     * @param {string} props.username - The username (also used as email)
     * @param {string} props.password - The user's password
     * @param {string} [props.userRole='admin'] - The user's role (custom attribute)
     * @param {string} [props.groupName] - Optional group to add the user to
     */
    constructor(scope, id, props) {
        super(scope, id);

        const username = props.username;
        const password = props.password;
        // Default to admin role if not specified
        const userRole = props.userRole || "admin";

        // Create the user inside the Cognito user pool using Lambda-backed AWS Custom Resource
        // This uses the adminCreateUser API to create a user with the specified attributes
        const adminCreateUser = new AwsCustomResource(this, 'AwsCustomResource-CreateUser', {
            onCreate: {
                service: 'CognitoIdentityServiceProvider',
                action: 'adminCreateUser',
                parameters: {
                    UserPoolId: props.userPool,
                    Username: username,
                    MessageAction: 'SUPPRESS',
                    TemporaryPassword: password,
                    UserAttributes:[
                        {
                            Name: "email",
                            Value: username
                        },
                        {
                            Name: "given_name",
                            Value: userRole === "admin" ? "Admin" : "Customer"
                        },
                        {
                            Name: "family_name",
                            Value: "User"
                        },
                        {
                            Name: "custom:userRole",
                            Value: userRole
                        }
                    ]
                },
                physicalResourceId: PhysicalResourceId.of(`AwsCustomResource-CreateUser-${username}`),
            },
            onDelete: {
                service: "CognitoIdentityServiceProvider",
                action: "adminDeleteUser",
                parameters: {
                    UserPoolId: props.userPool,
                    Username: username,
                },
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({resources: AwsCustomResourcePolicy.ANY_RESOURCE}),
            installLatestAwsSdk: true,
        });

        // Force the password for the user to be permanent
        // By default, new users are created with FORCE_PASSWORD_CHANGE status,
        // but in this case we want to set a permanent password directly
        const adminSetUserPassword = new AwsCustomResource(this, 'AwsCustomResource-ForcePassword', {
            onCreate: {
                service: 'CognitoIdentityServiceProvider',
                action: 'adminSetUserPassword',
                parameters: {
                    UserPoolId: props.userPool,
                    Username: username,
                    Password: password,
                    Permanent: true,
                },
                physicalResourceId: PhysicalResourceId.of(`AwsCustomResource-ForcePassword-${username}`),
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({resources: AwsCustomResourcePolicy.ANY_RESOURCE}),
            installLatestAwsSdk: true,
        });
        adminSetUserPassword.node.addDependency(adminCreateUser);

        // If a Group Name is provided, add the user to this Cognito UserPool Group
        // This is useful for assigning permissions based on group membership
        if (props.groupName) {
            const userToAdminsGroupAttachment = new CfnUserPoolUserToGroupAttachment(this, 'AttachAdminToAdminsGroup', {
                userPoolId: props.userPool,
                groupName: props.groupName,
                username: username,
            });
            userToAdminsGroupAttachment.node.addDependency(adminCreateUser);
            userToAdminsGroupAttachment.node.addDependency(adminSetUserPassword);
            userToAdminsGroupAttachment.node.addDependency(props.userPool);
        }
    }
};

/**
 * Export the CognitoUserPoolUser construct for use in CDK stacks
 * This construct is used in cdk-app-stack.js to create admin and customer users
 */
module.exports = CognitoUserPoolUser;
