# Architecture: 
![alt text](images/architecture.png)

## Overview

The PII Redaction Pipeline is a serverless, event-driven architecture designed to automatically detect and redact Protected Health Information (PHI) and Personally Identifiable Information (PII) from documents. The architecture leverages multiple AWS services to create a scalable, secure, and maintainable solution for processing sensitive documents.

## Architecture Diagram

The architecture diagram illustrates the components, interactions, and data flows of the PII Redaction Pipeline. Key components include AWS Lambda functions, Step Functions for workflow orchestration, S3 buckets for document storage, and AWS AI services for document analysis and PII detection.

## Key Components

### Frontend Components

- **Amazon Cognito**: Provides user authentication and authorization with support for different user roles (Admin Group, Customer Group)
- **AWS Amplify**: Hosts the React UI application and integrates with Cognito for authentication
- **S3 Static Web Files**: Stores the web application static files
- **Dashboard**: Web interface for users to upload documents and view processing status
- **Amazon QuickSight**: Provides analytics and reporting capabilities

### Backend Components

- **Amazon S3 Buckets**: Multiple buckets store documents at different stages of processing:
  - Original document storage
  - Textract output storage
  - PHI detection results
  - Redacted document storage

- **AWS Step Functions**: Orchestrates the document processing workflow with state management
  - Implements Map State for parallel processing of documents

- **AWS Lambda Functions**:
  - **Machine-State Function**: Triggers workflow and manages document batch processing
  - **Extract Function**: Processes documents with Amazon Textract
  - **Textract-Output Function**: Processes Textract results and prepares for PHI detection
  - **PHI-Detection Function**: Submits documents to Amazon Comprehend Medical
  - **Prep-Doc-For-Redaction**: Maps document paths for redaction processing
  - **Redact Function**: Applies redactions to documents
  - **Get-Workflow Function**: Retrieves workflow status information

- **Amazon SQS**: Queues documents for processing with configurable batch sizes
  - Each message contains workflow ID, document name, and input path
  - Maximum of 10 messages retrieved per batch

- **Amazon SNS**: Handles asynchronous notifications from Textract when jobs complete
  - Required by Textract's asynchronous API design

- **Amazon DynamoDB**: Stores workflow information and status updates
  - Tracks document processing status
  - Stores workflow metadata

- **AWS AI Services**:
  - **Amazon Textract**: Extracts text, forms, and tables from documents
  - **Amazon Comprehend Medical**: Detects PHI/PII entities in document text

- **Amazon CloudWatch**: Stores logs from all functions for monitoring and troubleshooting

## Architectural Patterns

### Serverless Architecture

The solution is entirely serverless, with no servers to provision or manage. This provides automatic scaling, high availability, and a pay-per-use cost model.

### Event-Driven Processing

Components communicate through events:
- S3 uploads trigger Lambda functions
- SNS notifications signal Textract job completions
- Step Functions coordinate event-based workflows

### Asynchronous Processing

Multiple asynchronous processing patterns are implemented:
1. **Textract Asynchronous API**:
   - Submits jobs asynchronously
   - Uses SNS for job completion notifications
   - Processes large documents without Lambda timeout concerns

2. **Step Functions Wait-for-Task-Token Pattern**:
   - Step Functions provides task tokens to Lambda functions
   - Lambda stores token in DynamoDB
   - When processing completes, the token is returned to Step Functions
   - Enables long-running operations beyond Lambda limits

### Batch Processing

1. **Input Batch Processing**:
   - Documents are uploaded in batches
   - SQS manages document processing queue
   - Maximum of 10 messages per batch

2. **Parallel Processing**:
   - Step Functions Map State enables parallel document processing
   - Each execution handles document redaction independently
   - Up to 40 parallel executions possible

3. **Status-Driven Processing**:
   - System tracks document status in DynamoDB
   - Processing continues until all documents complete

## Processing Model

The architecture implements a multi-phase processing model:

1. **Document Upload and Queue Management**:
   - Users upload documents through the Amplify frontend
   - Documents are stored in S3 and queued in SQS
   - Machine-State function triggers the Step Functions workflow

2. **Text Extraction**:
   - Extract function processes document batches from SQS
   - Submits asynchronous jobs to Textract
   - Textract sends completion notifications through SNS
   - Results stored as JSON in S3

3. **PHI/PII Detection**:
   - Textract-Output function generates text from Textract results
   - PHI-Detection function submits to Comprehend Medical
   - Results stored as JSON in S3

4. **Document Redaction**:
   - Prep-Doc-For-Redaction maps document paths
   - Step Functions Map State distributes redaction workload
   - Redact function applies redactions based on PHI entities and document layout
   - Redacted documents stored in S3

5. **Status Management**:
   - DynamoDB tracks workflow and document status
   - Frontend retrieves status information from DynamoDB

## Technical Constraints and Solutions

### Textract Asynchronous API Limitations

Textract's asynchronous API only supports SNS for job completion notifications. The architecture handles this by:
- Using SNS topics for Textract notifications
- Implementing a Lambda function to process notifications
- Managing document batch processing based on notification events

### Lambda Execution Time Limits

AWS Lambda has a 15-minute execution time limit. The architecture addresses this through:
- Step Functions for workflow orchestration
- Wait-for-task-token pattern for long-running operations
- Asynchronous processing with SNS notifications
- Breaking down document processing into manageable steps

### Large Document Processing

Processing large documents or batches of documents is handled by:
- Batch processing with SQS
- Parallel execution with Step Functions Map State
- Asynchronous AI service APIs
- Document partitioning where necessary

## Security and Compliance

### Authentication and Authorization

- Amazon Cognito provides user authentication
- Different user groups (Admin, Customer) have different access levels
- JWT tokens secure API access

### Data Protection

- S3 bucket policies and encryption for document storage
- IAM roles with least privilege principle
- HTTPS/TLS for all data in transit
- Document access controls based on user roles

### Compliance Considerations

- HIPAA-compliant data lifecycle management
- Audit logging through CloudWatch
- Secure handling of PHI/PII data

## Scalability and Performance

The architecture scales automatically based on load:
- Serverless components scale with demand
- SQS queues manage processing backpressure
- Parallel processing with Step Functions Map State
- Asynchronous AI service APIs handle varying document complexity

## Monitoring and Observability

- CloudWatch logs from all Lambda functions
- Step Functions execution history
- DynamoDB workflow status tracking
- Amazon QuickSight for analytics and reporting

## Deployment and Infrastructure

The architecture is deployed using AWS Cloud Development Kit (CDK), which provides:
- Infrastructure as code
- Repeatable deployments
- Environment-specific configuration
- Dependency management between components

## Conclusion

The PII Redaction Pipeline architecture provides a scalable, secure, and efficient solution for detecting and redacting sensitive information from documents. By leveraging serverless AWS services and implementing advanced architectural patterns, the system can handle complex document processing workflows while maintaining security and compliance requirements.

# Data Flow Diagram 
![alt text](images/Data\ Flow\ Diagram.png)
# PII Redaction Pipeline: Data Flow Diagram with Protocols

This document describes the data flow through the PII Redaction Pipeline, including the specific protocols used at each step, based on the architecture diagram.

## Data Flow Legend

- **Data Flow**: Represents the flow of information through the system
- **Loop**: Indicates repetitive processing patterns
- **Data Store**: Represents data persistence locations
- **Process**: Indicates processing components
- **External**: Represents external systems or actors
- **Decision/Entity Relation**: Shows decision points or entity relationships

## Authentication Flow

### User Authentication
- **Flow**: User → Cognito
- **Protocol**: HTTPS/TLS 1.2+ (encrypted)
- **Data**: Authentication credentials
- **Description**: Users (Customer/Admin) authenticate through Cognito user pools with username/password

### Authorization
- **Flow**: Cognito → React UI App
- **Protocol**: OAuth 2.0/JWT (encrypted)
- **Data**: Authentication tokens
- **Description**: After successful authentication, Cognito issues JWT tokens for authorization

## Document Processing Flow

### Document Upload
- **Flow**: React UI App → S3 Bucket (2. User uploads Batch files)
- **Protocol**: HTTPS/TLS 1.2+ with pre-signed URLs
- **Data**: Document files (PDF, JPEG, PNG, TIFF)
- **Description**: User uploads documents through the web interface to the S3 bucket

### Workflow Initiation
- **Flow**: S3 → Machine-State Lambda (3. Trigger Lambda function)
- **Protocol**: AWS S3 Event Notification
- **Data**: S3 event data (object creation event)
- **Description**: S3 upload event triggers the Lambda function to start the workflow

### Queue Management
- **Flow**: Machine-State → SQS (4. Sends Doc info)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Document metadata and references
- **Description**: Machine-State function sends document information to SQS queue

### Step Function Invocation
- **Flow**: SQS → Step Function (5. Invokes Step Function)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Workflow configuration
- **Description**: Machine-State function starts the Step Functions state machine execution

## Text Extraction Phase

### Extract Function Invocation
- **Flow**: Step Function → Extract Function (6. Invokes)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Workflow ID and task token
- **Description**: Step Functions invokes Lambda using the wait-for-task-token pattern

### Message Retrieval
- **Flow**: SQS → Extract Function (7. Retrieves Messages)
- **Protocol**: AWS SQS Long Polling
- **Data**: Document processing messages
- **Description**: Extract function retrieves queued messages for document processing

### Textract Job Submission
- **Flow**: Extract Function → Textract (8. Start Extract Job)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Document analysis request
- **Description**: Extract function starts asynchronous Textract document analysis jobs

### Textract Result Storage
- **Flow**: Textract → S3 (9. Sends JSON result)
- **Protocol**: HTTPS/TLS 1.2+ (encrypted)
- **Data**: JSON document analysis results
- **Description**: Textract stores the JSON results in S3 bucket

### Textract Output Processing
- **Flow**: Step Function → Textract-Output (10. Invokes)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Job completion data
- **Description**: Step Function invokes Textract-Output to process the results

### Text Storage
- **Flow**: Textract-Output → S3 (11. Sends TXT output)
- **Protocol**: HTTPS/TLS 1.2+ (encrypted)
- **Data**: Extracted text content
- **Description**: Textract-Output function stores processed text in S3

## PHI/PII Detection Phase

### PHI Detection Invocation
- **Flow**: Step Function → PHI-Detection Function (12. Invokes)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Workflow ID and extracted text locations
- **Description**: Step Function invokes PHI-Detection Lambda

### Comprehend Medical Job Submission
- **Flow**: PHI-Detection → Comprehend Medical (13. Start PHI Detection Job)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: PHI detection request
- **Description**: PHI-Detection starts an asynchronous Comprehend Medical PHI detection job

### PHI Result Storage
- **Flow**: Comprehend Medical → S3 (14. Stores JSON Result)
- **Protocol**: HTTPS/TLS 1.2+ (encrypted)
- **Data**: PHI entities detection results
- **Description**: Comprehend Medical stores detection results in S3

## Document Redaction Phase

### Redaction Preparation
- **Flow**: Step Function → Prep-Doc-For-Redaction (15. Invokes)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Document references and PHI detection results
- **Description**: Step Function invokes Lambda to prepare documents for redaction

### Map State Processing
- **Flow**: Prep-Doc-For-Redaction → Step Function Map State (16. Maps between paths)
- **Protocol**: AWS Step Functions Map State
- **Data**: Document batches for parallel processing
- **Description**: Organizes documents for parallel processing (up to 40 parallel executions)

### Redaction Execution
- **Flow**: Step Function → Redact Function (17. Invokes)
- **Protocol**: AWS SDK API calls (encrypted)
- **Data**: Document, Textract JSON, and PHI detection results
- **Description**: Step Function invokes Redact Lambda to apply redactions

### Redacted Document Storage
- **Flow**: Redact Function → S3 (18. Sends Redacted Document)
- **Protocol**: HTTPS/TLS 1.2+ (encrypted)
- **Data**: Redacted document files
- **Description**: Redact function uploads redacted documents to S3

## Status Management and Retrieval

### Status Updates
- **Flow**: Lambda Functions → DynamoDB (Send Updates/Status)
- **Protocol**: AWS SDK API calls (encrypted) - DynamoDB PartiQL
- **Data**: Workflow status information
- **Description**: Lambda functions update workflow status in DynamoDB table

### Status Review
- **Flow**: React UI App → DynamoDB (19. Review Workflow Status)
- **Protocol**: AWS SDK API calls (encrypted) via AppSync or API Gateway
- **Data**: Workflow status queries
- **Description**: UI queries DynamoDB to display current workflow status

### Document Retrieval
- **Flow**: React UI App → S3 (20. Retrieve Documents)
- **Protocol**: HTTPS/TLS 1.2+ with pre-signed URLs
- **Data**: Redacted document requests
- **Description**: UI retrieves redacted documents for user download

## Logging and Monitoring

### Application Logging
- **Flow**: All Functions → CloudWatch (All Functions send logs)
- **Protocol**: AWS CloudWatch Logs API
- **Data**: Application logs, metrics, and errors
- **Description**: All Lambda functions send logs to CloudWatch for monitoring

## Security Protocols

### Data at Rest
- **S3**: Server-side encryption (SSE-S3 or SSE-KMS)
- **DynamoDB**: AWS owned KMS keys for encryption
- **HIPAA Compliance**: Lifecycle policies for PHI data, no automatic deletion

### Data in Transit
- **HTTPS/TLS 1.2+**: For all external communications
- **AWS Service Encryption**: For all internal AWS service communications

### Authentication & Authorization
- **OAuth 2.0**: Token-based authentication
- **JWT**: Secure payload for user claims and roles
- **IAM**: Role-based access control with least privilege principle

### Logging & Auditing
- **CloudTrail**: API call logging
- **CloudWatch**: Application and system logging
- **S3 Access Logging**: Object-level logging for sensitive operations
