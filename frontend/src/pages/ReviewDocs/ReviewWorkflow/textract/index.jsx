import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useWorkflows } from 'src/hooks/useWorkflows';
import { useUserRole } from 'src/context/UserRoleContext';
import { FaCheck, FaSpinner, FaExclamationTriangle, FaLock } from 'react-icons/fa';
import DownloadButtons from './DownloadButtons';
import './styles.css';

/**
 * Textract component displays extracted text and enables downloading documents
 * Enhanced version without rsuite dependencies
 * Access restricted to admin users only
 */
const Textract = () => {
  const { isAdmin } = useUserRole();
  const { wfid } = useParams();
  const { data, isError, isFetching } = useWorkflows("workflow-list-exact", wfid);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Debug data loading - IMPORTANT: All hooks must be called at the top level
  useEffect(() => {
    if (data && data.ocr_data) {
      console.log("OCR data loaded:", data.ocr_data.length, "documents");
    }
    
    if (isError) {
      console.error("Error loading workflow data:", isError);
    }
  }, [data, isError]);
  
  // Render access denied message for non-admin users
  if (!isAdmin) {
    console.warn("Non-admin user attempted to access Textract component directly");
    return (
      <div className="access-denied">
        <FaLock size={24} style={{ marginBottom: '16px', color: '#dc3545' }} />
        <h3>Access Denied</h3>
        <p>You do not have permission to view extracted text data.</p>
        <p>This action has been logged.</p>
      </div>
    );
  }

  // Error handling
  if (isError) {
    return (
      <div className="error-message">
        <FaExclamationTriangle style={{ marginRight: '8px' }} />
        <div>
          <strong>Error:</strong> Something went wrong while trying to process this request. 
          <br />
          Please refresh or try again. If the problem persists, please check your internet connection and log back in.
        </div>
      </div>
    );
  }

  // Loading state
  if (!data || isFetching) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <FaSpinner className="fa-spin" />
        </div>
        <p>Loading document data...</p>
      </div>
    );
  }

  // Status indicator based on document status
  const getStatusIndicator = (status) => {
    switch (status) {
      case "succeeded":
        return (
          <div className="status-badge">
            <FaCheck style={{ marginRight: '4px' }} /> processed
          </div>
        );
      case "processing":
        return (
          <div className="status-badge processing">
            <FaSpinner className="fa-spin" style={{ marginRight: '4px' }} /> 
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span role="img" aria-label="search">🔍</span> {status}
            </span>
          </div>
        );
      case "error":
      case "failed":
        return (
          <div className="status-badge error">
            <FaExclamationTriangle style={{ marginRight: '4px' }} /> {status}
          </div>
        );
      default:
        return (
          <div className="status-badge warning">
            {status}
          </div>
        );
    }
  };

  return (
    <div>
      <table className="document-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Status</th>
            <th>Amazon Textract Async Job ID</th>
            <th>Download Data</th>
          </tr>
        </thead>
        <tbody>
          {data?.ocr_data?.map((item, index) => (
            <tr 
              key={index}
              className={selectedDoc === item.document ? 'selected-row' : ''}
              onClick={() => {
                setSelectedDoc(item.document);
                console.log("Selected document:", item.document, "Job ID:", item.jobid);
              }}
            >
              <td>{item.document}</td>
              <td>
                {getStatusIndicator(item.status)}
              </td>
              <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                {item.jobid}
              </td>
              <td>
                {/* Use the DownloadButtons component that properly fetches URLs */}
                <DownloadButtons 
                  wfId={wfid}
                  jobId={item.jobid}
                  document={item.document}
                />
              </td>
            </tr>
          ))}
          {(!data?.ocr_data || data.ocr_data.length === 0) && (
            <tr>
              <td colSpan={4} className="no-data">
                No documents found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Textract;
