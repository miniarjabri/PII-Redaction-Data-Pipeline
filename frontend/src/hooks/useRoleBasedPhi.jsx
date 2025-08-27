/**
 * Role-based PHI/PII data access hook
 * Enforces access control based on user role (admin vs customer)
 */

import { useQuery } from "@tanstack/react-query";
import StorageService from 'src/services/storage_services';
import { fetchAuthSession } from '@aws-amplify/auth';
import { useUserRole } from 'src/context/UserRoleContext';

/**
 * Fetch PHI/PII data with role-based access controls
 * @param {string} workflowId - The ID of the workflow to fetch entities for
 * @param {string} documentId - Optional: specific document ID within the workflow
 * @param {boolean} isAdmin - Whether the user has admin access
 * @param {string} documentName - Optional: real document name for accurate path construction
 * @returns Object containing entity data, isAdmin flag, loading state, and error if any
 */
const getRoleBasedPhiData = async (workflowId, documentId = null, isAdmin = true, documentName = null) => {
  try {
    console.log(`Fetching PHI data for workflow: ${workflowId}, document: ${documentId || 'none'}`);
    
    // If no document is selected yet, return an empty data structure
    if (!documentId) {
      return { 
        isAdmin: isAdmin,
        data: { Entities: [] },
        documentUrl: null
      };
    }
    
    const storage = new StorageService();
    const authSession = await fetchAuthSession();
    
    if (!authSession?.credentials) {
      throw new Error('Not authenticated');
    }
    
    // Fetch workflow data to get document information
    const apiUrl = window.authdata?.FunctionUrls?.GetWfFunctionUrl;
    if (!apiUrl) {
      throw new Error('Missing Lambda Function URL configuration');
    }
    
    // Import the signing function and prepare credentials
    const { signUrl } = await import('../utils/awsSignRequest');
    const credentials = {
      accessKeyId: authSession.credentials.accessKeyId,
      secretAccessKey: authSession.credentials.secretAccessKey,
      sessionToken: authSession.credentials.sessionToken
    };
    
    // Sign and fetch workflow data
    const region = window.authdata?.Auth?.region || 'us-east-1';
    const queryParams = new URLSearchParams({ fetch: workflowId });
    const url = `${apiUrl}?${queryParams.toString()}`;
    const signedReq = await signUrl(url, credentials, region, 'lambda');
    
    const workflowResponse = await fetch(url, {
      method: 'GET',
      headers: signedReq.headers,
      cache: 'no-cache',
      mode: 'cors',
      credentials: 'omit'
    });
    
    // Handle errors in workflow data fetch
    if (!workflowResponse.ok) {
      throw new Error(`Workflow API error: ${workflowResponse.status}`);
    }
    
    // Extract document info from workflow data
    const workflowData = await workflowResponse.json();
    console.log('PHI DEBUG - Full workflow API response:', JSON.stringify(workflowData).substring(0, 500) + '...');
    
    // IMPORTANT: Lambda returns nested data structure - need to access data.body.data
    const responseData = workflowData.body?.data || workflowData.data || {};
    console.log('PHI DEBUG - Extracted workflow data:', JSON.stringify(responseData).substring(0, 500) + '...');
    
    // Check redacted_documents first as they contain the phi_json paths
    const documents = responseData.redacted_documents || responseData.documents || [];
    console.log('PHI DEBUG - Available documents:', documents.length);
    
    // Debug log to check if phi_json fields are present
    if (documents && documents.length > 0) {
      console.log('PHI DEBUG - Sample document structure:', 
        JSON.stringify(documents[0]).substring(0, 200) + '...');
      
      const docWithPhiJson = documents.find(doc => doc.phi_json);
      if (docWithPhiJson) {
        console.log('PHI DEBUG - Found document with phi_json path:', docWithPhiJson.phi_json);
      } else {
        console.log('PHI DEBUG - No documents have phi_json paths');
      }
    }
    
    // Find the document we're looking for
    let document = documents.find(doc => doc.jobid === documentId);
    
    // If no exact match by jobid, try finding by document name
    if (!document) {
      document = documents.find(doc => doc.document && doc.document.includes(documentId));
    }
    
    console.log('PHI DEBUG - Found document:', document ? `document with id ${document.jobid}` : 'no matching document');
    
    // If still no document found, create a default document object
    if (!document) {
      // Use the provided documentName parameter if available, otherwise fall back to generated name
      const docName = documentName || `document-${documentId}.pdf`;
      console.log('PHI DEBUG - Creating default document with name:', docName);
      
      document = {
        jobid: documentId,
        document: docName
      };
    } else {
      console.log('PHI DEBUG - Document phi_json path:', document.phi_json || 'not present');
    }
    
    // Generate a signed URL for viewing the document
    let documentUrl = null;
    try {
      // Determine document path - IMPORTANT: Remove public/ prefix if storage service adds it automatically
      let docPath;
      if (document.doc_path) {
        // Remove public/ prefix to avoid duplicates
        docPath = document.doc_path.startsWith('public/') 
          ? document.doc_path.substring(7)  // Remove 'public/' prefix
          : document.doc_path;
      } else {
        docPath = `output/${workflowId}/${document.jobid}/orig-doc/${document.document}`;
      }
      
      console.log('PHI DEBUG - Document path:', docPath);
      
      const signedUrlResponse = await storage.genSignedURL(docPath);
      documentUrl = signedUrlResponse?.url;
      
      if (documentUrl) {
        console.log('PHI DEBUG - Successfully generated document URL');
      } else {
        console.error('PHI DEBUG - Failed to generate document URL');
      }
    } catch (error) {
      console.error('Error getting signed URL for document:', error);
    }
    
    // Try to fetch real PHI data - Note that .comp-med files contain JSON data
    let phiData = { Entities: [] };
    
    // Only fetch PHI data for admin users
    if (isAdmin) {
      try {
        // Determine the file name for the PHI data
        const docName = document.document;
        // IMPORTANT: Fix for baseName extraction
        const baseName = docName.split('.')[0]; // Simpler, more reliable way to get base name
        
        console.log('PHI DEBUG - Document name:', docName);
        console.log('PHI DEBUG - Base name (without extension):', baseName);
        
        // CRITICAL: First check if we have the exact PHI JSON path from the workflow data
        // Track all attempted paths for debugging
        const phiPathsToTry = [];
        
        // Check if document object has the phi_json field provided by Lambda - USE THIS FIRST!
        if (document.phi_json) {
          // CRITICAL: From Lambda logs, phi_json path is at the document ID level, NOT in redacted-doc
          // "output/workflowId/documentId/basename.comp-med"
          
          // Use the exact path provided by the backend - THIS IS THE CORRECT PATH
          const normalizedPhiPath = document.phi_json.startsWith('public/') 
            ? document.phi_json.substring(7) // Remove 'public/' prefix if present
            : document.phi_json;
            
          console.log(`PHI DEBUG - CRITICAL: Using EXACT Lambda-provided PHI path: ${normalizedPhiPath}`);
          phiPathsToTry.push(normalizedPhiPath);
        }
        
        // Only add fallback paths if no phi_json is provided
        if (!document.phi_json) {
          // These paths are at document ID level, NOT in redacted-doc folder
          const fallbackPaths = [
            `output/${workflowId}/${documentId}/${baseName}.comp-med`,
            `output/${workflowId}/${documentId}/${baseName}.json`
          ];
          
          phiPathsToTry.push(...fallbackPaths);
        }
        
        console.log('PHI DEBUG - Will try these PHI data paths:', phiPathsToTry);
        
        // Store attempted paths - make sure we do this before attempting any fetches
        phiData._attemptedPaths = [...phiPathsToTry];
        
        // Try each path until we find PHI data
        let pathsChecked = false;
        for (const phiPath of phiPathsToTry) {
          pathsChecked = true;
          try {
            console.log(`PHI DEBUG - Trying PHI data path: ${phiPath}`);
            
            // Get signed URL for PHI data file - ensure no double public/ prefix
            console.log(`PHI DEBUG - Attempting to get signed URL for PHI data path: ${phiPath}`);
            const phiUrlResponse = await storage.genSignedURL(phiPath);
            
            if (phiUrlResponse && phiUrlResponse.url) {
              console.log(`PHI DEBUG - Successfully got signed URL for PHI data: ${phiPath}`);
              console.log(`PHI DEBUG - PHI URL: ${phiUrlResponse.url.substring(0, 100)}...`);
              
              // Fetch the PHI data
              const phiResponse = await fetch(phiUrlResponse.url);
              
              if (phiResponse.ok) {
                // Parse JSON data from the .comp-med file
                const responseText = await phiResponse.text();
                console.log(`PHI DEBUG - Raw PHI data (first 100 chars): ${responseText.substring(0, 100)}...`);
                
                try {
                  const parsedData = JSON.parse(responseText);
                  console.log('PHI DEBUG - Successfully parsed PHI data from:', phiPath);
                  console.log('PHI DEBUG - Data structure keys:', Object.keys(parsedData));
                  console.log(`PHI DEBUG - Full data sample: ${JSON.stringify(parsedData).substring(0, 500)}...`);
                  
                  // Normalize data format
                  if (parsedData.Entities) {
                    phiData = parsedData;
                    // Store the path that was successfully loaded in two places
                    phiData._loadedPath = phiPath;
                    phiData.loadedPhiPath = phiPath; // Directly in phiData for UI access
                    console.log(`PHI DEBUG - Found ${phiData.Entities.length} entities`);
                    break; // Stop trying more paths
                  } else if (parsedData.PHI) {
                    phiData = { 
                      Entities: parsedData.PHI,
                      _loadedPath: phiPath, // Store the path that was successfully loaded
                      loadedPhiPath: phiPath // Directly in phiData for UI access
                    };
                    console.log(`PHI DEBUG - Found ${phiData.Entities.length} entities in PHI array`);
                    break;
                  } else {
                    // Deep scan for entities in complex JSON structure
                    console.log('PHI DEBUG - Complex JSON structure, scanning for entities');
                    const entitiesFound = scanForEntities(parsedData);
                    if (entitiesFound && entitiesFound.length > 0) {
                      phiData = { 
                        Entities: entitiesFound,
                        _loadedPath: phiPath, // Store the path that was successfully loaded
                        loadedPhiPath: phiPath // Directly in phiData for UI access
                      };
                      console.log(`PHI DEBUG - Found ${phiData.Entities.length} entities in deep scan`);
                      break;
                    }
                  }
                } catch (parseError) {
                  console.error(`PHI DEBUG - Failed to parse JSON from ${phiPath}:`, parseError);
                }
                } else {
                  console.warn(`PHI DEBUG - Failed to fetch PHI data for ${phiPath}: HTTP status ${phiResponse.status}`);
                  
                  // If we get 403 Forbidden or 404 Not Found, log more details
                  if (phiResponse.status === 403) {
                    console.warn(`PHI DEBUG - Access denied (403 Forbidden) for path: ${phiPath}`);
                    console.warn('PHI DEBUG - This may be a permissions issue - check IAM roles');
                  } 
                  else if (phiResponse.status === 404) {
                    console.warn(`PHI DEBUG - File not found (404) for path: ${phiPath}`);
                    console.warn('PHI DEBUG - The comp-med file may not exist in the expected location');
                    
                    // If this is the Lambda-provided path and we get 404, the file likely doesn't exist
                    // This is normal if the document genuinely has no PHI entities
                    if (document.phi_json && (phiPath === document.phi_json || (document.phi_json.startsWith('public/') && phiPath === document.phi_json.substring(7)))) {
                      console.log('PHI DEBUG - Lambda-provided PHI path not found - likely no PHI detected');
                      // Add an empty Entities array to indicate no PHI found (don't treat as error)
                      phiData = { 
                        Entities: [], 
                        _loadedPath: phiPath,
                        loadedPhiPath: phiPath,
                        _phiStatus: 'NO_PHI_DETECTED'
                      };
                    }
                  }
                }
            }
          } catch (pathError) {
            console.warn(`PHI DEBUG - Error trying PHI path ${phiPath}:`, pathError);
            // Continue to next path
          }
        }
        
        if (!phiData._phiStatus && (!phiData.Entities || phiData.Entities.length === 0)) {
          console.warn('PHI DEBUG - No PHI data found in any of the attempted paths');
          // Check if we were able to access the phi_json path from the workflow data
          if (document.phi_json) {
            console.warn(`PHI DEBUG - Backend provided a PHI path (${document.phi_json}) but no entities were found`);
            console.warn('PHI DEBUG - This may indicate the document truly has no PHI entities detected');
            // If document.phi_json exists but we couldn't load entities, set a special status
            phiData._phiStatus = 'NO_PHI_IN_FILE';
            phiData.loadedPhiPath = document.phi_json;
          } else {
            console.warn('PHI DEBUG - No phi_json path was provided by the backend API');
            console.warn('PHI DEBUG - This may indicate the workflow data is incomplete or PHI detection is still processing');
          }
        }
      } catch (phiError) {
        console.error('PHI DEBUG - Error in PHI data fetch process:', phiError);
      }
    } else {
      // For non-admin users, clear the PHI data
      console.log('PHI DEBUG - User is not admin, returning empty PHI data');
    }
    
    // Return the response with the correct admin status and data
    // IMPORTANT: Include loadedPhiPath inside the data object, not at top level
    // Add phiJsonFromLambda for debugging
    const loadedPath = phiData._loadedPath || document.phi_json || null;
    
    // Enhanced debug logging
    console.log('PHI DEBUG - Final response preparation:');
    console.log('PHI DEBUG - document.phi_json:', document.phi_json);
    console.log('PHI DEBUG - phiData._loadedPath:', phiData._loadedPath);
    console.log('PHI DEBUG - Final loadedPath:', loadedPath);
    console.log('PHI DEBUG - Entities found:', phiData.Entities?.length || 0);
    
    // Store loadedPhiPath inside phiData so it's accessible to components
    if (loadedPath) {
      phiData.loadedPhiPath = loadedPath;
    }
    
    // If we tried paths but still have UNKNOWN status, set a default status
    if (!phiData._phiStatus && phiData._attemptedPaths && phiData._attemptedPaths.length > 0) {
      console.log('PHI DEBUG - Setting default NO_PHI_DETECTED status after checking paths');
      phiData._phiStatus = 'NO_PHI_DETECTED';
    }
    
    return { 
      isAdmin: isAdmin,
      data: phiData,
      documentUrl,
      noPhiDataFound: !phiData.Entities || phiData.Entities.length === 0,
      // Store debug information
      debug: {
        phiJsonFromLambda: document.phi_json || null,
        loadedPath: loadedPath,
        documentInfo: {
          jobid: document.jobid,
          document: document.document,
          doc_path: document.doc_path,
          phi_json: document.phi_json
        },
        hasEntities: phiData.Entities && phiData.Entities.length > 0
      }
    };
    
  } catch (error) {
    console.error('Error fetching role-based PHI data:', error);
    throw error;
  }
};

/**
 * Helper function to scan for entities in complex JSON structures
 */
function scanForEntities(data) {
  if (!data || typeof data !== 'object') return null;
  
  // Look for arrays that might contain entities
  for (const key in data) {
    if (Array.isArray(data[key]) && data[key].length > 0) {
      const sample = data[key][0];
      if (sample && typeof sample === 'object') {
        // Check if this looks like an entity array
        if (sample.Text || sample.Type || sample.Score) {
          return data[key].map(item => ({
            Text: item.Text || item.text || '[UNKNOWN]',
            Type: item.Type || item.type || 'UNKNOWN',
            Score: item.Score || item.score || 0.5
          }));
        }
      }
    } else if (data[key] && typeof data[key] === 'object') {
      // Recurse into nested objects
      const result = scanForEntities(data[key]);
      if (result) return result;
    }
  }
  
  return null;
}

/**
 * React hook for accessing PHI/PII data with role-based access controls
 * @param {string} workflowId - The ID of the workflow
 * @param {string} documentId - Optional specific document ID
 * @param {string} documentName - Optional document name for path construction
 * @returns Object containing query result with PHI data and admin status
 */
export function useRoleBasedPhi(workflowId, documentId = null, documentName = null) {
  // Get the user's role from context
  const { isAdmin } = useUserRole();
  
  return useQuery({
    queryKey: ['role-based-phi', workflowId, documentId, documentName, isAdmin],
    queryFn: () => getRoleBasedPhiData(workflowId, documentId, isAdmin, documentName),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    onError: (error) => {
      console.error('Error in useRoleBasedPhi hook:', error);
    }
  });
}

export default useRoleBasedPhi;
