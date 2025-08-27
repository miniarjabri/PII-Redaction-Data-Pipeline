import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from 'src/hooks/useWorkflows';
import isAfter from 'date-fns/isAfter';
import getTime from 'date-fns/getTime';
import startOfDay from 'date-fns/startOfDay';
import endOfDay from 'date-fns/endOfDay';
import './styles.css';
import { 
  FaCheck as CheckIcon,
  FaCalendarAlt as CalendarIcon,
  FaSpinner,
  FaExclamationTriangle,
  FaClock
} from 'react-icons/fa';

const ReviewDocs = () => {
  const [startDt, setstartDt] = useState(getTime(startOfDay(new Date())));
  const [endDt, setendDt] = useState(getTime(endOfDay(new Date())));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateInputRef = useRef(null);
  const { data, isError, isFetching, error } = useWorkflows("workflow-list-global", "all", { startDt, endDt });
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isError) {
      console.error('Review page error details:', error);
    }
  }, [isError, error]);
  
  const setDateRange = (event) => {
    const dt = new Date(event.target.value);
    setSelectedDate(dt);
    const dtStr = format(dt, 'MM/dd/yyyy');
    const start = getTime(startOfDay(new Date(dtStr)));
    const end = getTime(endOfDay(new Date(dtStr)));
    setstartDt(start);
    setendDt(end);
  };

  const navigateToDetail = (status, part_key) => {
    if (status === "complete") {
      navigate(`/review/wf/${part_key}`);
    }
  };
  
  // Status badge for OCR status
  const StatusBadge = ({ status }) => {
    switch (status) {
      case "processing":
        return (
          <div className="status-badge" style={{ backgroundColor: '#007bff' }}>
            <FaSpinner className="fa-spin" style={{ marginRight: '6px' }} />
            <span>Processing</span>
          </div>
        );
      case "complete":
        return (
          <div className="status-badge">
            <CheckIcon style={{ marginRight: '4px' }} />
            <span>Complete</span>
          </div>
        );
      default:
        return (
          <div className="status-badge" style={{ backgroundColor: '#6c757d' }}>
            <FaExclamationTriangle style={{ marginRight: '4px' }} />
            <span>{status}</span>
          </div>
        );
    }
  };
  
  const DeidStatusBadge = ({ workflow }) => {
    // If workflow is processing, show queued status
    if (workflow.status === "processing") {
      return (
        <div className="status-badge" style={{ backgroundColor: '#ffc107', color: '#212529' }}>
          <FaClock style={{ marginRight: '4px' }} />
          <span>Queued</span>
        </div>
      );
    }
    
    const deidStatus = workflow.redaction_status || workflow.redaction_status;
    
    switch (deidStatus) {
      case "processing":
        return (
          <div className="status-badge" style={{ backgroundColor: '#007bff' }}>
            <FaSpinner className="fa-spin" style={{ marginRight: '6px' }} />
            <span>Processing</span>
          </div>
        );
      case "processed":
        return (
          <div className="status-badge">
            <CheckIcon style={{ marginRight: '4px' }} />
            <span>Complete</span>
          </div>
        );
      case "queued":
        return (
          <div className="status-badge" style={{ backgroundColor: '#ffc107', color: '#212529' }}>
            <FaClock style={{ marginRight: '4px' }} />
            <span>Queued</span>
          </div>
        );
      case "not_requested":
        return (
          <div className="status-badge" style={{ backgroundColor: '#6c757d' }}>
            <span>Not Requested</span>
          </div>
        );
      default:
        return deidStatus ? (
          <div className="status-badge" style={{ backgroundColor: '#6c757d' }}>
            <FaExclamationTriangle style={{ marginRight: '4px' }} />
            <span>{deidStatus}</span>
          </div>
        ) : null;
    }
  };
  
  return (
    <div style={{ width: '100%' }}>
      {/* Header */}
      <div className="rd-header">
        <div>
          <h3 className="shield-icon" style={{ marginBottom: '0.5rem', color: 'white' }}>Review Document Status</h3>
          <p style={{ color: 'white', fontWeight: 'bold' }}>
          </p>
        </div>
      </div>

      {/* Error message */}
      {isError && (
        <div className="error-message">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontWeight: 'bold', color: '#d13212' }}>
              Error: {error?.message?.includes('Authentication failed') ? 
                'Authentication error. Please sign out and sign in again to refresh your credentials.' : 
                'Something went wrong while trying to process this request. Please refresh or try again.'}
            </p>
            <p style={{ fontSize: 'small' }}>{error?.message || 'Unknown error'}</p>
            
            {error?.message?.includes('Authentication failed') && (
              <div style={{ marginTop: '16px' }}>
                <p>
                  <span style={{ fontWeight: 'bold' }}>Note:</span> If you're seeing mock workflows (like "workflow-123456"), 
                  this is because the application cannot authenticate with AWS to fetch your real workflows. 
                  Please sign out and sign in again.
                </p>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: '#0066cc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Sign Out and Clear Cache
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content - White Card */}
      <div className="rd-card">
        {/* Date picker */}
        <div className="date-picker-container">
          <div className="date-picker-wrapper">
            <input
              type="text"
              value={format(selectedDate, 'MM/dd/yyyy')}
              readOnly
              className="date-display"
              onClick={() => dateInputRef.current.click()}
            />
            <button 
              className="calendar-button"
              onClick={() => dateInputRef.current.click()}
              type="button"
            >
              <CalendarIcon />
            </button>
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={setDateRange}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="date-input"
              ref={dateInputRef}
            />
          </div>
        </div>
        
        {/* Table */}
        <div className="workflow-table-container">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>Workflow ID</th>
                <th>Number of Docs</th>
                <th>OCR Status</th>
                <th>Redaction Status</th>
                <th>Time Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data?.workflows && data.workflows.length > 0 ? (
                data.workflows.map((workflow, index) => (
                  <tr 
                    key={workflow.part_key || index}
                    onClick={() => navigateToDetail(workflow.status, workflow.part_key)}
                    className={workflow.status === "complete" ? "clickable-row" : ""}
                  >
                    <td>{workflow.part_key}</td>
                    <td>{workflow.total_files || 1}</td>
                    <td>
                      <StatusBadge status={workflow.status} />
                    </td>
                    <td>
                      <DeidStatusBadge workflow={workflow} />
                    </td>
                    <td>{format(workflow.submit_ts, 'MM/dd/yyyy h:mm a')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="no-data">
                    No workflow data found for the selected date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReviewDocs;
