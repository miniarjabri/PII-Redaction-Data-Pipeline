# Troubleshooting

This guide provides solutions to common issues that may arise while deploying and running the PII Redaction Pipeline.

## Common Deployment Issues

1. **CDK Bootstrap Error**

   ```
   Error: This stack uses assets, so the toolkit stack must be deployed to the environment
   ```

   **Solution**: Run `cdk bootstrap aws://ACCOUNT-NUMBER/REGION`

2. **S3 Bucket Name Conflict**

   ```
   Error: Creating CloudFormation changeset failed: Resource handler returned message: "The bucket name [name] already exists"
   ```

   **Solution**: Change the `ROOT_BUCKET` name in your `.env` file

3. **IAM Permission Issues**

   ```
   Error: User: [user] is not authorized to perform: [action] on resource: [resource]
   ```

   **Solution**: Ensure your AWS CLI is configured with credentials that have administrator access

## Runtime Issues

1. **Document Processing Stuck**

   Check:
   - Step Functions execution in AWS Console
   - CloudWatch logs for Lambda functions
   - SQS queue for stuck messages

2. **Authentication Issues**

   - Verify Cognito user pool and identity pool settings
   - Check user group assignments
   - Review CloudWatch logs for authentication errors

3. **Lambda Function Errors**

   - Check CloudWatch logs for each function
   - Verify IAM roles and permissions
   - Ensure environment variables are correctly set
