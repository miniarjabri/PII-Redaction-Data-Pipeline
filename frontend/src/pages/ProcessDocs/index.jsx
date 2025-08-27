import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import StorageService from 'src/services/storage_services';
import { FaUpload, FaQuestionCircle, FaCheck, FaInfoCircle, FaExclamationTriangle, FaSpinner } from 'react-icons/fa';
import { ClassifierTooltip, ErTooltip } from 'src/components/Tooltips';
import getTime from 'date-fns/getTime';
import './styles.css';
// Import configureAmplify and verifyAmplifyStorageConfig to ensure Amplify is configured correctly
import { configureAmplify, verifyAmplifyStorageConfig } from 'src/services/aws_services';

/**
 * 
 * @param {{endToend: Boolean}} props
  * 
 * @returns 
 * 
 * React.node()
 */
const ProcessDocs = ({ endToend = false }) => {
  console.log('ProcessDocs component rendering');
  
  // Track if Amplify is fully configured including Storage
  const [amplifyConfigured, setAmplifyConfigured] = useState(false);
  
  // Ensure Amplify is configured before any storage operations
  useEffect(() => {
    console.log('ProcessDocs component: Configuring Amplify');
    
    // Configure Amplify and verify Storage settings
    const configureAndVerify = async () => {
      // Run the improved configuration function
      const configResult = configureAmplify();
      
      // Check if configuration was successful
      if (configResult && configResult.bucket) {
        console.log('ProcessDocs: Amplify configured successfully with bucket:', configResult.bucket);
        setAmplifyConfigured(true);
        return true;
      }
      
      // If configuration failed, check if we can verify the storage config separately
      const isVerified = verifyAmplifyStorageConfig();
      if (isVerified) {
        console.log('ProcessDocs: Amplify storage verified successfully');
        setAmplifyConfigured(true);
        return true;
      }
      
      console.warn('ProcessDocs: Amplify storage configuration failed');
      return false;
    };
    
    // First attempt immediately
    configureAndVerify().then(success => {
      if (!success) {
        // If failed, try again after a short delay
        const timer = setTimeout(() => {
          console.log('ProcessDocs: Retrying Amplify configuration');
          configureAndVerify();
        }, 500);
        
        return () => clearTimeout(timer);
      }
    });
  }, []);
  
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [manifestFile, setManifestFile] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedTotal, setUploadedTotal] = useState(1);
  const [completionPct, setCompletionPct] = useState(0);
  const [activeUploadingFile, setActiveUploadingFile] = useState("");
  const [redact, setRedact] = useState(true);
  const [retain, setRetain] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const manifestFileInputRef = useRef(null);

  // Create storage service only after Amplify is configured
  const [storage, setStorage] = useState(null);
  
  useEffect(() => {
    // Only create the storage service when Amplify is properly configured
    if (amplifyConfigured) {
      console.log('Creating StorageService instance now that Amplify is configured');
      setStorage(new StorageService());
    }
  }, [amplifyConfigured]);

  useEffect(() => {
    // Log storage instance to verify bucket is set
    if (storage) {
      console.log('Storage instance in ProcessDocs:', storage);
      console.log('Storage bucket:', storage.bucket);
    }
  }, [storage]);

  // Removed checkbox handlers as options are now enabled by default

  useEffect(() => {
    if (filesToUpload.length > 0) {
      const totalPct = (uploadedTotal / filesToUpload.length) * 100;
      setCompletionPct(totalPct.toFixed(0));
    }
  }, [uploadedTotal, filesToUpload.length]);

  // Helper to show notifications
  const showNotification = (type, header, message, duration = 8000) => {
    const id = Date.now();
    const notification = { id, type, header, message };
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after duration
    if (duration) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(item => item.id !== id));
      }, duration);
    }
  };

  const handleFileInput = (event) => {
    const files = Array.from(event.target.files);
    if (files.length > 500) {
      showNotification('warning', 'File Limit', 'A maximum of 500 files are allowed to be uploaded at a time.');
      return;
    }

    // Filter file types
    const filteredFiles = files.filter((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'png', 'jpeg', 'pdf', 'tif', 'tiff'].includes(extension);
    });

    const fileObjects = filteredFiles.map(file => ({
      blobFile: file,
      name: file.name,
      size: file.size
    }));

    setFilesToUpload(fileObjects);
  };

  const handleManifestInput = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      const fileReader = new FileReader();
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = e => {
        try {
          console.log(JSON.parse(e.target.result));
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      };
      
      setManifestFile([{
        blobFile: file,
        name: file.name,
        size: file.size
      }]);
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    
    if (!event.dataTransfer.files) return;
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 500) {
      showNotification('warning', 'File Limit', 'A maximum of 500 files are allowed to be uploaded at a time.');
      return;
    }

    // Filter file types
    const filteredFiles = files.filter((file) => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['jpg', 'png', 'jpeg', 'pdf', 'tif', 'tiff'].includes(extension);
    });

    const fileObjects = filteredFiles.map(file => ({
      blobFile: file,
      name: file.name,
      size: file.size
    }));

    setFilesToUpload(fileObjects);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const genWorkflow = (prefix) => {
    const workflow = [];
    // Always set redact and retain to true as they are default settings now
    const useRedact = true;
    const useRetain = true;
    
    workflow.push({'S': prefix});
    workflow.push({'S': `input/${prefix}/`});
    workflow.push({'S': 'processing'});
    const docs = {};
    for (const file of filesToUpload) {
      docs[file.blobFile.name] = {'S': 'ready'};
    }
    workflow.push({'M': docs});
    workflow.push({'N': `${getTime(new Date())}`});
    workflow.push({'N': `${filesToUpload.length}`});
    workflow.push({'BOOL': useRedact});
    workflow.push({'BOOL': useRetain});
    workflow.push({'S': (useRedact) ? 'processing' : 'not_requested'});
    return workflow;
  };

  // Helper to scroll to top
  const scrollTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const uploadFiles = async () => {
    console.log('uploadFiles called with', filesToUpload.length, 'files');
    scrollTop();
    
    // Verify storage instance exists and has bucket before proceeding
    if (!storage || !storage.bucket) {
      console.error('Storage is not properly initialized before upload!');
      
      // Make sure Amplify is fully configured
      const isConfigured = verifyAmplifyStorageConfig();
      
      if (!isConfigured) {
        console.error('Failed to verify Amplify storage configuration');
        showNotification('error', 'S3 Bucket Error', 'Unable to configure Amplify Storage properly');
        return;
      }
      
      // Try to reinitialize storage
      if (!storage) {
        const newStorage = new StorageService();
        setStorage(newStorage);
        
        if (!newStorage.bucket) {
          showNotification('error', 'S3 Bucket Error', 'Storage service created but bucket not configured');
          return;
        }
      } else if (!storage.bucket) {
        // Try to explicitly set bucket based on configuration
        const config = window.Amplify?.getConfig?.()?.Storage?.S3;
        if (config && config.bucket) {
          storage.bucket = config.bucket;
          storage.region = config.region;
        } else {
          showNotification('error', 'S3 Bucket Error', 'Missing bucket configuration');
          return;
        }
      }
    }
    
    const setUploadProgress = (progress) => {
      setActiveUploadingFile(progress.filename);
    };
    
    setIsUploading(true);
    try {
      console.log('Starting upload with bucket:', storage.bucket);
      const prefix = uuidv4();
      console.log('Generated prefix:', prefix);
      
      let total = 1;
      for (const file of filesToUpload) {
        console.log(`Uploading file ${total}/${filesToUpload.length}:`, file.blobFile.name);
        try {
          await storage.upload(file.blobFile, `input/${prefix}/`, setUploadProgress);
          console.log(`File ${file.blobFile.name} uploaded successfully`);
        } catch (uploadError) {
          console.error('Error uploading file:', file.blobFile.name, uploadError);
          if (uploadError.name === 'NoBucket') {
            showNotification('error', 'S3 Bucket Error', 'Missing bucket name while accessing object');
            throw uploadError;
          }
        }
        total = total + 1;
        setUploadedTotal(total);
      }
      
      console.log('All files uploaded, generating workflow JSON');
      const wf = genWorkflow(prefix);
      await storage.writeFile(JSON.stringify(wf), `workflows/${prefix}.json`);
      console.log('Workflow JSON uploaded successfully');
      
      // Keep redact and retain true as they are default settings
      showNotification('success', 'Complete', 'Documents have been uploaded successfully!');
    } catch (error) {
      console.error('Upload process failed:', error);
      setIsUploading(false);
      // More specific error message based on error type
      if (error.name === 'NoBucket') {
        showNotification('error', 'S3 Bucket Error', error.message);
      } else {
        showNotification('error', 'Error', 'File upload failed. Please check your network connection and try again!');
      }
    }

    //update states
    setIsUploading(false);
    setCompletionPct(0.1);
    setUploadedTotal(1);
    setFilesToUpload([]);
    setActiveUploadingFile("");
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper components
  const Message = ({ type, header, children, showIcon = true }) => {
    let icon = null;
    if (showIcon) {
      switch (type) {
        case 'info':
          icon = <FaInfoCircle className="message-icon" />;
          break;
        case 'warning':
          icon = <FaExclamationTriangle className="message-icon" />;
          break;
        case 'error':
          icon = <FaExclamationTriangle className="message-icon" />;
          break;
        default:
          icon = <FaInfoCircle className="message-icon" />;
      }
    }
    
    return (
      <div className={`message message-${type}`}>
        {showIcon && icon}
        <div className="message-content">
          {header && <div className="message-header">{header}</div>}
          <div>{children}</div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ percent, status }) => (
    <div className="progress-container">
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      <div className="progress-text">{percent}%</div>
    </div>
  );

  return (
    <div>
      <header className="pd-header">
        <div>
          <h3>Redact Documents</h3>
          <span><b>Upload documents for redaction. Documents uploaded together will be processed in a single batch.</b></span>
        </div>
      </header>
      
      {!amplifyConfigured && (
        <Message type="warning" header={<b>Configuration in progress:</b>}>
          Setting up AWS configuration. Please wait a moment...
        </Message>
      )}
      
      <Message type="info" header={<b>NOTE:</b>}>
        (.pdf, .png, .jpg, .jpeg, and .tiff files supported)
      </Message>
      
      {/* Display notifications */}
      {notifications.map(notification => (
        <Message 
          key={notification.id}
          type={notification.type}
          header={notification.header}
        >
          {notification.message}
        </Message>
      ))}
      
      <section className="pd-content">
        <h4>Bulk PII (Personally Identifiable Information) Redaction</h4>
     
        
        {isUploading && (
          <div style={{ width: '100%', marginTop: '10px' }}>            
            <Message type="warning">
              <b>Upload in progress!</b> Please do not close or refresh this page. Uploading file {activeUploadingFile} ...
            </Message>
            <ProgressBar percent={completionPct} status={completionPct < 100 ? "active" : "success"} />
          </div>          
        )}
        
        {/* Custom file uploader */}
        <div 
          className="uploader-container"
          onClick={() => fileInputRef.current.click()}
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".png,.jpeg,.jpg,.pdf,.tiff,.tif"
            onChange={handleFileInput}
            disabled={isUploading}
          />
          <div className="uploader-drag-area">
            <FaUpload className="uploader-icon" />
            <div className="uploader-text">
              Click or Drag files to this area<br />
              (.pdf, .png, .jpg, .jpeg, and .tiff files supported)
            </div>
          </div>
        </div>
        
        {/* File list */}
        {filesToUpload.length > 0 && (
          <ul className="uploader-file-list">
            {filesToUpload.map((file, index) => (
              <li key={index} className="uploader-file-item">
                <span className="uploader-file-name">{file.name}</span>
                <span className="uploader-file-size">{formatBytes(file.size)}</span>
              </li>
            ))}
          </ul>
        )}
        
        {endToend && (
          <div>
            <div className="form-group">
              <label className="form-label">
                <b>Amazon Comprehend classifier ARN: <i>(optional)</i></b>
                <FaQuestionCircle className="help-icon" title="Amazon Comprehend Custom Classifier ARN" />
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="arn:aws:comprehend::1234567890:document-classifier/myClassifier/version/1" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                <b>Amazon Comprehend entity recognizer ARN: <i>(optional)</i></b>
                <FaQuestionCircle className="help-icon" title="Amazon Comprehend Entity Recognizer ARN" />
              </label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="arn:aws:comprehend::1234567890:entity-recognizer/myEntityRec/version/1" 
              />
            </div>
            
            <div className="form-group">
              <div 
                className="uploader-container" 
                style={{ padding: '10px', height: 'auto' }}
                onClick={() => manifestFileInputRef.current.click()}
              >
                <input
                  type="file"
                  ref={manifestFileInputRef}
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={handleManifestInput}
                  disabled={isUploading}
                />
                <span>Upload manifest file <i>(optional)</i></span>
              </div>
              <span style={{ fontSize: '11px' }}>
                If manifest file is not provided then only WORD, LINE, FORM, and TABLE will be extracted from all documents. 
                <Link to="/" target="_blank" rel="noopener noreferrer"> Learn more.</Link>
              </span>
            </div>
          </div>
        )}
      </section>
      
      <section className="pd-content">
       
        
        
        <button 
          className={`button button-primary float-right ${isUploading ? 'button-loading' : ''}`}
          disabled={filesToUpload.length <= 0 || filesToUpload.length > 200 || isUploading}
          onClick={uploadFiles}
        >
          {isUploading ? (
            <>
              <FaSpinner className="button-icon fa-spin" /> Uploading...
            </>
          ) : (
            <>
              <FaCheck className="button-icon" /> Submit for processing
            </>
          )}
        </button>
      </section>
    </div>
  );
};

export default ProcessDocs;
