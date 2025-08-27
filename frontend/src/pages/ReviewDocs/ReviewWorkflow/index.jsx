import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWorkflows } from 'src/hooks/useWorkflows';
import { useUserRole } from 'src/context/UserRoleContext';
import StorageService from 'src/services/storage_services';
import Textract from './textract';
import PhiTab from './phi';
import { FaCheck, FaSpinner, FaExclamationTriangle, FaAngleRight, FaFileAlt, FaFileCode } from 'react-icons/fa';
import './styles.css';

const ReviewWorkflow = () => {
  const { isAdmin } = useUserRole();
  const [activeTab, setActiveTab] = useState(isAdmin ? 'textract' : 'phi');
  const { wfid } = useParams();
  const { data, isError, isFetching, error, refetch } = useWorkflows("workflow-list-exact", wfid);
  
  // Auto refresh data every 10 seconds if workflow is still processing
  useEffect(() => {
    let intervalId;
    
    // Check if any workflow is in processing state
    if (data && data.phi_data && data.phi_data.redaction_status !== 'processed') {
      console.log('Setting up auto-refresh for in-progress workflow');
      intervalId = setInterval(() => {
        console.log('Auto-refreshing workflow data...');
        refetch();
      }, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [data, refetch]);
  
  // Ensure non-admin users can't access textract tab
  useEffect(() => {
    if (!isAdmin && activeTab === 'textract') {
      setActiveTab('phi');
      console.log('Non-admin user redirected from textract to phi tab');
    }
  }, [isAdmin, activeTab]);
  
  // Add debug logging for data structure
  useEffect(() => {
    if (data) {
      console.group('ReviewWorkflow Data Structure');
      console.log('Full data object:', data);
      console.log('OCR Data:', data.ocr_data);
      console.log('PHI Data:', data.phi_data);
      if (data.phi_data && data.phi_data.documents) {
        console.log('PHI Documents:', data.phi_data.documents);
      }
      console.groupEnd();
    }
  }, [data]);
  
  // Log detailed error information
  useEffect(() => {
    if (isError) {
      console.error('Workflow detail error:', error);
    }
  }, [isError, error]);

  const renderProgressSteps = () => {
    if (!data) return null;

    let phiStatus = 'processing';
    let phiIcon = <FaSpinner className="fa-spin" />;
    let completeStep = false;

    if (data.phi_data.redaction_status === 'processed') {
      phiStatus = 'complete';
      phiIcon = <FaCheck />;
      completeStep = true;
    } else if (data.phi_data.redaction_status === 'failed') {
      phiStatus = 'error';
      phiIcon = <FaExclamationTriangle />;
    }

    return (
      <div className="progress-steps">
        <div className="progress-step">
          <div className="progress-step-icon complete">
            <FaCheck />
          </div>
          <div>
            <div style={{ color: 'white' }}>Bulk OCR</div>
            <div style={{ color: 'white', fontSize: '12px' }}>Complete</div>
          </div>
        </div>

        <div className="progress-step-connector"></div>

        <div className="progress-step">
          <div className={`progress-step-icon ${phiStatus}`}>
            {phiIcon}
          </div>
      <div>
        <div style={{ color: 'white' }}>PHI Redaction</div>
      </div>
        </div>

        <div className="progress-step-connector"></div>

        <div className="progress-step">
          <div className={`progress-step-icon ${completeStep ? 'complete' : ''}`}>
            {completeStep && <FaCheck />}
          </div>
          <div>
            <div style={{ color: 'white' }}>Complete</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="rwf-header">
        <div>
          <h3>Redacted Documents for workflow : {wfid}</h3>
          {data && renderProgressSteps()}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="rwf-breadcrumb">
        <Link to="/review">Redacted Documents</Link>
        <span className="rwf-breadcrumb-separator">
          <FaAngleRight />
        </span>
        <span className="rwf-breadcrumb-active">{wfid}</span>
      </div>

      <div className="rwf-content">
        {/* Error message */}
        {isError && (
          <div className="error-message">
            <strong>Error:</strong> Failed to load workflow details. Please refresh or try again.
            <br />
            <small>{error?.message || 'Unknown error'}</small>
          </div>
        )}

        {/* Tabs - conditionally show textract tab for admins only */}
        <div className="rwf-tabs">
          {isAdmin && (
            <button
              className={`rwf-tab ${activeTab === 'textract' ? 'active' : ''}`}
              onClick={() => setActiveTab('textract')}
            >
              Extracted Text
            </button>
          )}
          <button
            className={`rwf-tab ${activeTab === 'phi' ? 'active' : ''}`}
            onClick={() => setActiveTab('phi')}
          >
             Redaction
          </button>
        </div>

        {/* Tab content */}
        <div className="rwf-card">
          {activeTab === 'textract' ? (
            <Textract />
          ) : (
            <PhiTab />
          )}
        </div>
      </div>
    </div>
  );
};

// Component that generates download links directly from workflow data
const DownloadLinks = ({ wfId, jobId, document }) => {
  const [jsonUrl, setJsonUrl] = useState(null);
  const [excelUrl, setExcelUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const storage = new StorageService();

  useEffect(() => {
    const getSignedUrls = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`Getting signed URLs for ${document} (JobID: ${jobId})`);
        
        // Generate paths for JSON and Excel files
        const jsonPath = `output/${wfId}/${jobId}/${document}.json`;
        const excelPath = `output/${wfId}/${jobId}/${document}-report.xlsx`;
        
        console.log('JSON path:', jsonPath);
        console.log('Excel path:', excelPath);
        
        // Get signed URLs using Storage Service
        const jsonResp = await storage.genSignedURL(jsonPath, false);
        const excelResp = await storage.genSignedURL(excelPath, false);
        
        setJsonUrl(jsonResp?.url);
        setExcelUrl(excelResp?.url);
        
        console.log('Generated JSON URL:', jsonResp?.url ? 'Success' : 'Failed');
        console.log('Generated Excel URL:', excelResp?.url ? 'Success' : 'Failed');
      } catch (err) {
        console.error('Error generating signed URLs:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (wfId && jobId && document) {
      getSignedUrls();
    }
  }, [wfId, jobId, document]);

  return (
    <div className="download-buttons">
      <a 
        href={excelUrl}
        className={`download-link ${!excelUrl ? 'disabled' : ''}`}
        download
        onClick={(e) => {
          if (!excelUrl) {
            e.preventDefault();
            console.log("Excel URL not available");
          } else {
            console.log("Downloading Excel from:", excelUrl);
          }
        }}
      >
        {isLoading ? (
          <FaSpinner className="fa-spin" style={{ marginRight: '4px' }} />
        ) : (
          <FaFileAlt style={{ marginRight: '4px' }} />
        )}
        Download Report
      </a>
      
      <a 
        href={jsonUrl}
        className={`download-link ${!jsonUrl ? 'disabled' : ''}`}
        download
        onClick={(e) => {
          if (!jsonUrl) {
            e.preventDefault();
            console.log("JSON URL not available");
          } else {
            console.log("Downloading JSON from:", jsonUrl);
          }
        }}
      >
        {isLoading ? (
          <FaSpinner className="fa-spin" style={{ marginRight: '4px' }} />
        ) : (
          <FaFileCode style={{ marginRight: '4px' }} />
        )}
        Download JSON
      </a>
    </div>
  );
};

export default ReviewWorkflow;
