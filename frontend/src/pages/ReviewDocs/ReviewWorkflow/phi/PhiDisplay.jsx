import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FaDownload, FaExpand, FaSpinner, FaLock, FaShieldAlt } from 'react-icons/fa';
import { useUserRole } from 'src/context/UserRoleContext';
import './styles.css';

/**
 * Component that displays PDF documents with PHI data
 * Enhanced version without rsuite dependencies
 */
const PhiDisplay = ({ docUrl, phiData, mimeType, docName }) => {
  // Get role from context - this ensures consistency across the application
  const { isAdmin: contextIsAdmin } = useUserRole();
  
  // Use the context value for admin access
  const hasAdminAccess = contextIsAdmin;
  
  const [entities, setEntities] = useState([]);
  const [docURL, setDocURL] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pdfViewerRef = useRef(null);
  
  useEffect(() => {
    // Extract entities from PHI data - Handle multiple possible formats
    console.log('PHI Display - Attempting to process PHI data:', phiData);
    console.log('PHI Display - PHI data keys:', phiData ? Object.keys(phiData) : 'null');
    
    try {
      let entityArray = [];
      
      // Format 1: Direct Entities array (AWS Comprehend Medical format)
      if (phiData && Array.isArray(phiData.Entities)) {
        console.log('PHI Display - Found standard Entities array format');
        entityArray = phiData.Entities;
      } 
      // Format 2: Nested in data.Entities
      else if (phiData && phiData.data && Array.isArray(phiData.data.Entities)) {
        console.log('PHI Display - Found nested data.Entities format');
        entityArray = phiData.data.Entities;
      }
      // Format 3: AWS Comprehend Medical specific format with Entities
      else if (phiData && phiData.Entities && Array.isArray(phiData.Entities.PHI)) {
        console.log('PHI Display - Found comp-med file format with PHI array');
        entityArray = phiData.Entities.PHI.map(phi => ({
          Text: phi.Text || phi.text || '[UNKNOWN]',
          Type: phi.Type || phi.type || 'UNKNOWN',
          Score: phi.Score || phi.score || 0.5
        }));
      }
      // Format 4: AWS Comprehend Medical format with direct PHI array
      else if (phiData && Array.isArray(phiData.PHI)) {
        console.log('PHI Display - Found direct PHI array format');
        entityArray = phiData.PHI.map(phi => ({
          Text: phi.Text || phi.text || '[UNKNOWN]',
          Type: phi.Type || phi.type || 'UNKNOWN',
          Score: phi.Score || phi.score || 0.5
        }));
      }
      // Format 5: Try to find any array that might contain entities
      else if (phiData) {
        console.log('PHI Display - Searching for any entity-like arrays in the data');
        // Look through all properties to find any arrays
        Object.keys(phiData).forEach(key => {
          if (Array.isArray(phiData[key]) && phiData[key].length > 0) {
            console.log(`PHI Display - Found array at key "${key}" with ${phiData[key].length} items`);
            
            // Check if this looks like an entities array (has Text and Type properties)
            const sample = phiData[key][0];
            if (sample && (sample.Text || sample.text || sample.Type || sample.type)) {
              console.log(`PHI Display - Array at "${key}" appears to contain entities`);
              entityArray = phiData[key].map(item => ({
                Text: item.Text || item.text || '[UNKNOWN]',
                Type: item.Type || item.type || 'UNKNOWN',
                Score: item.Score || item.score || 0.5
              }));
            }
          }
        });
      }
      
      // If still no entities found, look for different AWS Comprehend Medical formats
      if (entityArray.length === 0 && phiData) {
        console.log('PHI Display - No standard entity format found, trying AWS specific formats');
        
        // Deep search for any entities-like arrays
        const deepSearchForEntities = (obj, path = '') => {
          if (!obj || typeof obj !== 'object') return;
          
          Object.keys(obj).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (Array.isArray(obj[key])) {
              if (obj[key].length > 0) {
                console.log(`PHI Display - Found array at deep path: ${currentPath}`);
                // Check first item to see if it looks like an entity
                const sample = obj[key][0];
                if (sample && typeof sample === 'object') {
                  // Log sample structure to help debug
                  console.log('PHI Display - Sample item structure:', Object.keys(sample));
                  
                  if (sample.Type || sample.type || sample.Category || sample.category) {
                    console.log(`PHI Display - Found potential entities at: ${currentPath}`);
                    entityArray = obj[key].map(item => ({
                      Text: item.Text || item.text || item.Value || item.value || '[UNKNOWN]',
                      Type: item.Type || item.type || item.Category || item.category || 'UNKNOWN',
                      Score: item.Score || item.score || item.Confidence || item.confidence || 0.5
                    }));
                    return; // Stop if we found entities
                  }
                }
              }
            } else if (obj[key] && typeof obj[key] === 'object') {
              // Recurse for nested objects
              deepSearchForEntities(obj[key], currentPath);
            }
          });
        };
        
        deepSearchForEntities(phiData);
      }
      
      console.log(`PHI Display - Found ${entityArray.length} entities to process`);
      
      if (entityArray.length > 0) {
        // Process entities for display
        const dataset = entityArray.map(entity => {
          if (!entity || (!entity.Text && !entity.text) || (!entity.Type && !entity.type)) {
            console.warn('Invalid entity data:', entity);
            return {
              entity: '[UNKNOWN]',
              raw_entity: '[UNKNOWN]',
              entity_type: 'UNKNOWN',
              score: '0%'
            };
          }
          
          const entityText = entity.Text || entity.text || '[UNKNOWN]';
          const entityType = entity.Type || entity.type || 'UNKNOWN';
          const entityScore = entity.Score || entity.score || 0.5;
          
          // For frontend display, check if we need to mask the entity text
          // Backend should already handle this, but we do it here as well for safety
          const displayEntity = hasAdminAccess 
            ? entityText 
            : (entityText.startsWith('[REDACTED') ? entityText : `[REDACTED ${entityType}]`);
            
          return {
            entity: displayEntity,
            raw_entity: entityText, // Store original for potential admin-only features
            entity_type: entityType,
            score: typeof entityScore === 'number' ? `${Math.round(entityScore * 100)}%` : 'N/A'
          };
        });
        
        setEntities(dataset);
        console.log('PHI Display - Successfully processed entities:', dataset.length);
      } else {
        console.warn('PHI Display - No PHI entities found in the data');
        if (phiData) {
          console.log('PHI Display - Available data structure:', JSON.stringify(phiData).substring(0, 500) + '...');
        }
        setEntities([]);
      }
    } catch (error) {
      console.error('PHI Display - Error processing PHI entities:', error);
      setEntities([]);
    }
    
    // Set document URL for displaying
    if (docUrl) {
      setIsLoading(true);
      setDocURL(docUrl);
      console.log("PHI Display - Document URL set:", docUrl);
      console.log("PHI Display - MIME type:", mimeType);
      
      // Simulate PDF load complete
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [phiData, docUrl, mimeType, hasAdminAccess]);

  // Function to handle full-screen view
  const toggleFullScreen = () => {
    const elem = pdfViewerRef.current;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Check if we have a valid document URL
  const hasValidDocUrl = docURL && docURL.startsWith('http');

  return (
    <div>
      {/* Document name display */}
      <div className="document-info-card">
        <span>Displaying document: <strong>{docName || "No document selected"}</strong></span>
        {hasValidDocUrl && mimeType === 'application/pdf' && (
          <button className="fullscreen-button" onClick={toggleFullScreen}>
            <FaExpand style={{ marginRight: '4px' }} /> Fullscreen
          </button>
        )}
      </div>
      
      {/* Document viewer */}
      <div className="document-viewer-container" ref={pdfViewerRef}>
        {isLoading ? (
          <div className="loading-document">
            <FaSpinner className="fa-spin" />
            <p>Loading document...</p>
          </div>
        ) : !hasValidDocUrl ? (
          <div className="empty-document">
            <p>Document URL not available. Please ensure the document exists and you have permissions to access it.</p>
            <p><small>Try clicking on a document in the list to view it.</small></p>
          </div>
        ) : mimeType === "image/tiff" ? (
          <div className="tif-viewer">
            <p>TIF file cannot be viewed in the browser. Please download to view.</p>
            <a href={docURL} className="download-button" download>
              <FaDownload style={{ marginRight: '8px' }} /> Download file
            </a>
          </div>
        ) : (
          <embed 
            src={`${docURL}#view=FitH`} 
            type={mimeType || 'application/pdf'} 
            style={{
              height: '100%',
              width: '100%'
            }}
            className="pdf-embed"
            data-testid="pdf-viewer"
          />
        )}
      </div>

      {/* PHI entities display - ONLY shown to admin users */}
      {hasAdminAccess && (
        <div className="entities-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4>PHI Detection Results</h4>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              padding: '3px 8px', 
              borderRadius: '4px', 
              fontSize: '12px' 
            }}>
              <FaLock style={{ marginRight: '5px' }} /> 
              Admin Access
            </div>
          </div>
          
          {entities.length > 0 ? (
            <div>
              <p>Detected <strong>{entities.length}</strong> PHI entities:</p>
              <ul className="entities-list">
                {/* Removed the slice(0,5) limit to show all entities */}
                {entities.map((entity, idx) => (
                  <li key={idx}>
                    <strong>{entity.entity_type}</strong>: {entity.entity} ({entity.score})
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{
              padding: '15px',
              backgroundColor: '#e8f5e9',
              border: '1px solid #a5d6a7',
              borderRadius: '4px',
              marginTop: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span role="img" aria-label="check" style={{ fontSize: '20px', marginRight: '10px' }}>✅</span>
                <h4 style={{ margin: 0 }}>No PHI entities detected</h4>
              </div>
              
          <p style={{ margin: '5px 0' }}>
            This document was processed successfully. No Protected Health Information (PHI) was found in the content.
          </p>
          
          {/* DEBUG INFO - Only shown in admin mode */}
          <div style={{ 
            marginTop: '10px',
            padding: '8px 12px',
            backgroundColor: '#f1f8e9', 
            border: '1px solid #c5e1a5',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <h5 style={{ margin: '0 0 5px 0', color: '#33691e' }}>Advanced Debug Info</h5>
            <pre style={{ 
              margin: '0',
              padding: '8px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #e0e0e0',
              borderRadius: '3px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px'
            }}>{JSON.stringify({
              documentName: docName,
              phiDataKeys: phiData ? Object.keys(phiData) : 'null',
              noPhiDataFound: phiData?.noPhiDataFound,
              loadedPhiPath: phiData?.loadedPhiPath || 'null',
              entityCount: phiData?.Entities?.length || 0,
              phiStatus: phiData?._phiStatus || 'UNKNOWN',
              attemptedPaths: phiData?._attemptedPaths || [],
              isAdmin: hasAdminAccess
            }, null, 2)}</pre>
          </div>
              
              {phiData && phiData.noPhiDataFound && (
                <div style={{ 
                  marginTop: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}>
                  <p style={{ margin: '0' }}>
                    <strong>Technical Note:</strong> The PHI detection data file at {phiData.loadedPhiPath || "specified path"} 
                    was loaded successfully but contained no PHI entities.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Message for customer users explaining limited access */}
      {!hasAdminAccess && entities.length > 0 && (
        <div style={{ 
          marginTop: '20px', 
          padding: '12px', 
          backgroundColor: '#fff3e0', 
          border: '1px solid #ffe0b2',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FaShieldAlt style={{ marginRight: '8px', color: '#ff9800' }} />
            <div>
              <p style={{ fontWeight: 'bold', margin: '0 0 4px 0' }}>Protected Health Information</p>
              <p style={{ margin: '0' }}>
                This document contains protected health information (PHI) that requires admin access to view.
                Contact an administrator if you need access to this data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhiDisplay;
