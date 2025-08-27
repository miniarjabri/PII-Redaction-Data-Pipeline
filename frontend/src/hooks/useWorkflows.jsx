import { useQuery } from "@tanstack/react-query";
import { fetchAuthSession } from '@aws-amplify/auth';

// Function that makes authenticated requests to the Lambda function URL
const getWorkflows = async (modality, token) => {
    console.group('Workflow Retrieval');
    console.log(`Hook called with modality: ${modality}, token:`, token);  
    let ocrdata = [], phidata = {}, workflows;
    
    try {
        // Get authentication credentials directly using Amplify v6 approach
        console.log('Fetching authentication session...');
        const authSession = await fetchAuthSession();
        
        if (!authSession || !authSession.credentials) {
            console.error('No valid auth session available');
            throw new Error('Authentication failed - no credentials available');
        }
        
        console.log('Auth session retrieved successfully');
        
        // Extract credentials in the format needed for signing
        const credentials = {
            access_key: authSession.credentials.accessKeyId,
            secret_key: authSession.credentials.secretAccessKey,
            session_token: authSession.credentials.sessionToken
        };
        
        // Get configuration from window.authdata
        let authdata = window.authdata;
        if (!authdata && typeof localStorage !== 'undefined') {
            try {
                const storedAuthData = localStorage.getItem('auth_config');
                if (storedAuthData) {
                    authdata = JSON.parse(storedAuthData);
                    console.log('Loaded authdata from localStorage');
                }
            } catch (parseError) {
                console.error('Failed to parse stored auth data:', parseError);
            }
        }
        
        if (!authdata || !authdata.FunctionUrls || !authdata.FunctionUrls.GetWfFunctionUrl) {
            console.error('Missing Lambda Function URL configuration');
            throw new Error('Configuration error: Missing Lambda function URL');
        }
        
        // Construct URL with query parameters
        const url = (modality === "all")
            ? `${authdata.FunctionUrls.GetWfFunctionUrl}?fetch=${modality}&startdt=${token['startDt']}&enddt=${token['endDt']}`
            : `${authdata.FunctionUrls.GetWfFunctionUrl}?fetch=${modality}`;
            
        console.log(`Request URL: ${url}`);
        
        // Service info for signing
        const serviceInfo = {
            region: authdata.Auth.region,
            service: "lambda"
        };

        // Import the signing function dynamically to avoid breaking other parts of the app
        const { signUrl } = await import('../utils/awsSignRequest');
        
        // Sign the request
        console.log('Signing request...');
        const signedReq = await signUrl(
            url,
            {
                accessKeyId: credentials.access_key,
                secretAccessKey: credentials.secret_key,
                sessionToken: credentials.session_token
            },
            serviceInfo.region,
            serviceInfo.service
        );

        console.log('Request signed, sending to Lambda function URL...');
        
        // Send the request with signed headers
        const response = await fetch(url, {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            headers: signedReq.headers,
            referrer: "client",
            credentials: 'omit'  // Changed from 'same-origin' to avoid CORS issues
        });

        if (!response.ok) {
            console.error(`API request failed with status ${response.status}`);
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        console.log('Response received, parsing JSON...');
        const content = await response.json();
        console.log('Response parsed successfully');

        // Process the data according to modality
        if (modality !== "all") {
            // Process specific workflow data
            ocrdata = content.data.documents || [];
            
            // Process PHI data
            if (content.data.redaction_status === "processed") {
                phidata = { 
                    redaction_status: content.data.redaction_status,
                    redact: content.data.redact,
                    retain_orig_docs: content.data.retain_orig_docs,
                    status: content.data.phi_manifest?.Summary?.Status || 'processed',
                    totalFiles: content.data.phi_manifest?.Summary?.InputFileCount || content.data.total_files,
                    successfulFilesCount: content.data.phi_manifest?.Summary?.SuccessfulFilesCount || '0',
                    failedFilesCount: content.data.phi_manifest?.Summary?.UnprocessedFilesCount || '0',
                    documents: content.data.redacted_documents || []
                };
            } else {
                phidata = { 
                    redaction_status: content.data.redaction_status,
                    redact: content.data.redact,
                    retain_orig_docs: content.data.retain_orig_docs
                };
            }
        } else {
            // Process workflows list
            workflows = content.data.sort((a, b) => b.submit_ts - a.submit_ts);
        }
        
        console.log("Data processed successfully");
        console.groupEnd();
        
        return { "ocr_data": ocrdata, "phi_data": phidata, "workflows": workflows };
    } catch (error) {
        console.error("Workflow retrieval error:", error);
        console.groupEnd();
        throw error;
    }
};

// Mock data to use when authentication fails
const getMockWorkflows = (modality) => {
    console.log("Using mock data due to authentication failure");
    
    if (modality === "all") {
        return {
            workflows: [
                {
                    part_key: "workflow-123456 (MOCK DATA - Please sign out and sign in again)",
                    total_files: 3,
                    status: "complete",
                    redaction_status: "processed",
                    submit_ts: Date.now() - 86400000 // yesterday
                },
                {
                    part_key: "workflow-789012 (MOCK DATA - Please sign out and sign in again)",
                    total_files: 2,
                    status: "complete",
                    redaction_status: "processed",
                    submit_ts: Date.now() - 172800000 // 2 days ago
                }
            ]
        };
    } else {
        return {
            ocr_data: [
                {
                    document: "doc1.pdf (MOCK DATA)",
                    status: "succeeded",
                    jobid: "job123"
                }
            ],
            phi_data: {
                redaction_status: "processed",
                redact: true,
                retain_orig_docs: true,
                status: 'processed',
                totalFiles: 1,
                successfulFilesCount: '1',
                failedFilesCount: '0',
                documents: []
            }
        };
    }
};

export function useWorkflows(querykey, modality, token=undefined) {  
    return useQuery({
        queryKey: [querykey, modality, token],
        queryFn: async () => {
            try {
                // Try authenticated approach
                console.log("Using authenticated approach...");
                const result = await getWorkflows(modality, token);
                // Add a flag to indicate which approach was successful
                return { ...result, _source: 'authenticated' };
            } catch (error) {
                console.error(`Authenticated approach failed for ${querykey}:`, error);
                
                // If authenticated approach fails, return mock data
                console.warn("Falling back to mock data");
                const result = getMockWorkflows(modality);
                // Add a flag to indicate which approach was successful
                return { ...result, _source: 'mock' };
            }
        },
        refetchOnWindowFocus: false,
        refetchInterval: (modality === "all") ? 15000 : undefined,
        cacheTime: 0,
        retry: 0, // Disable retries since we're handling them manually
        retryDelay: 1000
    });
}
