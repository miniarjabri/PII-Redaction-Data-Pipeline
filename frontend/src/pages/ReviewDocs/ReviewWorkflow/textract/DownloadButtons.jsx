import React from 'react';
import { useSignedURL } from 'src/hooks/useSignedURL';
import { FaFileAlt, FaFileCode, FaSpinner } from 'react-icons/fa';

/**
 * Download buttons component that fetches signed URLs
 * Based on the example implementation but without rsuite dependencies
 */
const DownloadButtons = ({ wfId, jobId, document }) => {
  const { data, isError, isFetching } = useSignedURL(`workflow-rep-${jobId}`, wfId, jobId, document);

  console.log("Signed URL data:", data);
  console.log("Document:", document, "JobID:", jobId, "WorkflowID:", wfId);

  return (
    <div className="download-buttons">
      <a 
        href={data?.excelUrl}
        className={`download-link ${(!data?.excelUrl || isError) ? 'disabled' : ''}`}
        download
        onClick={(e) => {
          if (!data?.excelUrl || isError) {
            e.preventDefault();
            console.log("Excel URL not available or error occurred");
          } else {
            console.log("Downloading Excel from:", data.excelUrl);
          }
        }}
      >
        {isFetching ? (
          <FaSpinner className="fa-spin" style={{ marginRight: '4px' }} />
        ) : (
          <FaFileAlt style={{ marginRight: '4px' }} />
        )}
        Download Report
      </a>
      
      <a 
        href={data?.jsonUrl}
        className={`download-link ${(!data?.jsonUrl || isError) ? 'disabled' : ''}`}
        download
        onClick={(e) => {
          if (!data?.jsonUrl || isError) {
            e.preventDefault();
            console.log("JSON URL not available or error occurred");
          } else {
            console.log("Downloading JSON from:", data.jsonUrl);
          }
        }}
      >
        {isFetching ? (
          <FaSpinner className="fa-spin" style={{ marginRight: '4px' }} />
        ) : (
          <FaFileCode style={{ marginRight: '4px' }} />
        )}
        Download JSON
      </a>
    </div>
  );
};

export default DownloadButtons;
