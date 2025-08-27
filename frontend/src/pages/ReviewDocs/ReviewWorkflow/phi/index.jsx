import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import PhiDisplay from './PhiDisplay';
import { useWorkflows } from 'src/hooks/useWorkflows';
import { useRoleBasedPhi } from 'src/hooks/useRoleBasedPhi';
import { useUserRole } from 'src/context/UserRoleContext';
import StorageService from 'src/services/storage_services';
import { FaSpinner, FaExclamationTriangle, FaInfoCircle } from 'react-icons/fa';
import './styles.css';

const PhiTab = () => {
  const { wfid } = useParams();
  const { data, isError, isFetching } = useWorkflows("workflow-list-exact", wfid);
  const { userRole, isAdmin } = useUserRole(); // Move hook to component top level
  const storage = new StorageService();
  
  // State for document selection and display
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedDocName, setSelectedDocName] = useState(null);
  const [selectedDocPath, setSelectedDocPath] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [docMime, setDocMime] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  
  // Use the role-based PHI hook with the selected document ID and name
  const { 
    data: roleBasedPhiData, 
    isLoading: phiLoading, 
    isError: phiError,
    error: phiErrorDetails
  } = useRoleBasedPhi(wfid, selectedDocId, selectedDocName);
  
  // Debug log for data availability and enhance documents with proper paths
  useEffect(() => {
    if (data && data.phi_data) {
      console.log("PHI Tab - PHI Data loaded:", data.phi_data);
      console.log("PHI Tab - Has redacted_documents:", !!data.phi_data.redacted_documents);
      
      // Check if we have documents in the expected format
      if (data.phi_data.documents && data.phi_data.documents.length > 0) {
        console.log("PHI Tab - Documents available:", data.phi_data.documents.length);
        
        // If documents don't have the expected fields, enhance them with the necessary paths
        const enhancedDocuments = data.phi_data.documents.map(doc => {
          if (!doc.doc_path || !doc.phi_json) {
            const jobId = doc.jobid;
            const documentName = doc.document;
            const enhancedDoc = {
              ...doc,
              doc_path: `output/${wfid}/${jobId}/orig-doc/${documentName}`, 
              phi_json: `output/${wfid}/${jobId}/${documentName.split('.')[0]}.comp-med`
            };
            
            console.log("PHI Tab - Enhanced document paths:", enhancedDoc);
            return enhancedDoc;
          }
          return doc;
        });
        
        // Update the data structure with enhanced documents
        data.phi_data.redacted_documents = enhancedDocuments;
        console.log("PHI Tab - Enhanced redacted_documents:", data.phi_data.redacted_documents);
      }
      
      // If we have redacted_documents from Lambda, log them
      if (data.phi_data.redacted_documents && data.phi_data.redacted_documents.length > 0) {
        console.log("PHI Tab - Original redacted_documents from Lambda:", 
          data.phi_data.redacted_documents);
      }
    }
  }, [data, wfid]);
  
  // Effect to handle document URL fetching when a document is selected
  useEffect(() => {
    async function fetchDocumentUrl() {
      if (selectedDocPath) {
        console.log("PHI Tab - Attempting to fetch URL for document path:", selectedDocPath);
        
        const pathsToTry = [
          selectedDocPath // Primary path (should already be normalized)
        ];
        
        // Also try both orig-doc and redacted-doc paths
        if (selectedDocPath.includes('orig-doc')) {
          pathsToTry.push(selectedDocPath.replace('orig-doc', 'redacted-doc'));
        } else if (selectedDocPath.includes('redacted-doc')) {
          pathsToTry.push(selectedDocPath.replace('redacted-doc', 'orig-doc'));
        }
        
        console.log("PHI Tab - Will try these document paths:", pathsToTry);
        
        let docUrlFound = false;
        let lastError = null;
        
        // Try each path until one works
        for (const path of pathsToTry) {
          try {
            console.log("PHI Tab - Trying document path:", path);
            const docurl = await storage.genSignedURL(path, false);
            
            if (docurl && docurl.url) {
              console.log("PHI Tab - Successfully generated URL for path:", path);
              setDocUrl(docurl.url);
              setDocMime(docurl.contentType || 'application/pdf');
              docUrlFound = true;
              setFetchError(null);
              break;
            } else {
              console.warn("PHI Tab - No URL returned for path:", path);
            }
          } catch (error) {
            console.warn(`PHI Tab - Failed to fetch URL for path ${path}:`, error.message);
            lastError = error;
          }
        }
        
        if (!docUrlFound) {
          console.error("PHI Tab - Could not fetch document URL from any path");
          setDocUrl(null);
          
          const errorMessage = lastError?.message || "Unknown error";
          console.error("PHI Tab - Error details:", errorMessage);
          
          // Provide a more detailed error message based on what went wrong
          if (errorMessage === "NotFound") {
            setFetchError(
              <div>
                <p><strong>Document Not Found</strong></p>
                <p>The document couldn't be located in storage. This might be because:</p>
                <ul style={{ marginLeft: '20px', listStyle: 'disc' }}>
                  <li>The document has been deleted or moved</li>
                  <li>The S3 path is incorrect</li>
                  <li>The workflow processing hasn't completed yet</li>
                </ul>
                <p>Path tried: <code>{selectedDocPath}</code></p>
                <p><small>Try selecting another document from the list or refreshing the page.</small></p>
              </div>
            );
          } else {
            setFetchError(`Error loading document: ${errorMessage}`);
          }
        }
      }
    }
    
    fetchDocumentUrl();
  }, [selectedDocPath, storage]);
  
  // Effect to handle errors from the PHI data hook with better error reporting
  useEffect(() => {
    if (phiError && phiErrorDetails) {
      console.warn('PHI data fetch error details:', phiErrorDetails);
      
      if (phiErrorDetails.message === 'NotFound') {
        // Handle NotFound errors - likely just means no PHI data yet
        setFetchError(
          <div>
            <p>No PHI detection results found for this document. This could be because:</p>
            <ul style={{ marginLeft: '20px', listStyle: 'disc' }}>
              <li>The PHI detection process is still in progress</li>
              <li>The document doesn't contain any PHI data to detect</li>
              <li>There was an error during PHI detection</li>
            </ul>
            <p>You can still view the original document by clicking on it in the list.</p>
          </div>
        );
      } else if (phiErrorDetails.message?.includes('403')) {
        setFetchError(
          <div>
            <p>You do not have permission to access PHI data (403 Forbidden).</p>
            <p>The admin role has been enabled for development - please refresh the page.</p>
          </div>
        );
      } else {
        // For other errors, use generic message with details
        setFetchError(`Failed to fetch PHI data: ${phiErrorDetails.message}`);
      }
    } else {
      setFetchError(null);
    }
  }, [phiError, phiErrorDetails]);

  if (!data?.phi_data) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <FaSpinner className="fa-spin" />
        </div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (!data.phi_data.redact) {
    return (
      <div className="info-message">
        <FaInfoCircle style={{ marginRight: '8px' }} />
        <strong>Not available</strong>: Redaction is disabled for the documents in this analysis job
      </div>
    );
  }

  if (data.phi_data.redact && data.phi_data.redaction_status === 'processing') {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <FaSpinner className="fa-spin" />
        </div>
        <div className="processing-status">
          <strong>
            <div className="phi-status-text">
              <span>Redaction in progress</span>
            </div>
          </strong>
          <p className="auto-refresh-notice">Page will auto-refresh every 10 seconds</p>
        </div>
      </div>
    );
  }

  if (data.phi_data.redact && data.phi_data.redaction_status === 'failed') {
    return (
      <div className="error-message">
        <FaExclamationTriangle style={{ marginRight: '8px' }} />
        <strong>Failed to perform PHI redaction</strong>
      </div>
    );
  }

  // This function handles selecting a document to view
  const selectDocument = (doc_path, documentName, phi_json_path = null) => {
    console.log("PHI Tab - Selecting document:", documentName);
    
    // IMPORTANT: Normalize the path by removing any "public/" prefix
    // Storage service will add it automatically, so we avoid double prefixing
    const normalizedPath = doc_path.startsWith('public/') 
      ? doc_path.substring(7) // Remove 'public/' prefix
      : doc_path;
      
    console.log("PHI Tab - Original document path:", doc_path);
    console.log("PHI Tab - Normalized document path:", normalizedPath);
    
    // Extract document ID from the normalized path
    // Format should be: output/{workflowId}/{documentId}/[orig|redacted]-doc/{documentName}
    const pathSegments = normalizedPath.split('/');
    const documentId = pathSegments[2]; // output/workflowId/documentId
    
    console.log("PHI Tab - Extracted document ID:", documentId);
    
    // Update state with normalized path (without public/ prefix)
    setSelectedDocId(documentId);
    setSelectedDocName(documentName);
    setSelectedDocPath(normalizedPath);
    
    // If we also have the PHI json path, normalize it too
    if (phi_json_path) {
      // Normalize PHI path by removing any public/ prefix
      const normalizedPhiPath = phi_json_path.startsWith('public/') 
        ? phi_json_path.substring(7)
        : phi_json_path;
        
      console.log("PHI Tab - Original PHI data path:", phi_json_path);
      console.log("PHI Tab - Normalized PHI data path:", normalizedPhiPath);
    } else {
      // Construct PHI path for the document - with correct file extension handling
      const baseName = documentName.replace(/\.[^/.]+$/, '');
      
      // PHI data is in parent folder (not in redacted-doc), with .comp-med extension
      const constructedPath = `output/${wfid}/${documentId}/${baseName}.comp-med`;
      console.log("PHI Tab - Constructed PHI path (without public/ prefix):", constructedPath);
    }
  };

  return (
    <div>
      {/* Summary Card */}
      <div className="summary-card">
        <h4>Summary</h4>
        <div className="summary-stats">
          <div className="summary-stat">
            <span>Total files:</span> <strong>{data.phi_data.totalFiles}</strong>
          </div>
          <div className="summary-stat-divider"></div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="documents-card">
        <table className="document-table">
          <thead>
            <tr>
              <th>Redacted Documents</th>
            </tr>
          </thead>
          <tbody>
            {data.phi_data.documents?.map((doc, index) => (
              <tr 
                key={index} 
                onClick={() => selectDocument(doc.doc_path, doc.document, doc.phi_json)}
                className={selectedDocName === doc.document ? 'selected-row' : ''}
              >
                <td>
                  {doc.document}
                  {doc.phi_json && (
                    <small style={{ display: 'block', color: '#6c757d', fontSize: '0.8em' }}>
                      PHI data available
                    </small>
                  )}
                </td>
              </tr>
            ))}
            {(!data.phi_data.documents || data.phi_data.documents.length === 0) && (
              <tr>
                <td className="no-data">No redacted documents found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Error message if document fetching fails - enhanced styling */}
      {/* Hide the "Document not found" error since we now handle this gracefully */}
      {fetchError && !fetchError.toString().includes('Document not found') && (
        <div className="error-message" style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          border: '1px solid #f8d7da', 
          borderRadius: '4px',
          backgroundColor: '#fff3f5',
          color: '#721c24'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <FaExclamationTriangle style={{ marginRight: '10px', marginTop: '3px', color: '#dc3545' }} />
            <div>{fetchError}</div>
          </div>
        </div>
      )}

      {/* PHI Display - Show document even without PHI data */}
      {phiLoading ? (
        <div className="loading-container">
          <div className="loading-spinner">
            <FaSpinner className="fa-spin" />
          </div>
          <p>Loading document and PHI data...</p>
        </div>
      ) : (
        docUrl && (
          <div>
            {/* Role indicator - using variables from the hook at component level */}
            <div style={{ 
              background: isAdmin ? '#e8f5e9' : '#fff3e0', 
              padding: '8px 12px', 
              marginBottom: '16px',
              fontSize: '13px',
              borderRadius: '4px',
              border: `1px solid ${isAdmin ? '#a5d6a7' : '#ffe0b2'}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>
                  <FaInfoCircle style={{ marginRight: '6px' }} />
                  User Access Level: <strong>{isAdmin ? 'Administrator' : 'Customer'}</strong>
                </p>
                <p style={{ margin: '0', fontSize: '12px' }}>
                  {isAdmin 
                    ? 'You have full access to PHI data and original document content.' 
                    : 'You have access to view redacted documents, but PHI information will be masked for data protection.'}
                </p>
              </div>
              <div style={{
                backgroundColor: isAdmin ? '#43a047' : '#ff9800',
                color: 'white',
                padding: '6px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {isAdmin ? 'ADMIN' : 'STANDARD'}
              </div>
            </div>
            
            {/* Log the PHI data being passed to the display component */}
            {console.log("PHI Tab - Passing PHI data to display:", 
              roleBasedPhiData ? JSON.stringify(roleBasedPhiData).substring(0, 200) + '...' : 'null')}
            
            <PhiDisplay 
              docUrl={docUrl} 
              // Ensure we pass a valid phiData object even if roleBasedPhiData is null
              phiData={(roleBasedPhiData && roleBasedPhiData.data) || { Entities: [] }} 
              mimeType={docMime} 
              docName={selectedDocName}
              // No need to pass isAdmin - component will get it from context
            />
          </div>
        )
      )}
    </div>
  );
};

export default PhiTab;
