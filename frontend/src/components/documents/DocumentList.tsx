/**
 * Document List Component (DocumentList)
 *
 * T086 Implementation - Display user's uploaded documents
 *
 * Features:
 * - Table/grid view of uploaded documents
 * - Status badges (pending/processing/completed/failed)
 * - Download and delete buttons
 * - Responsive design
 * - Error handling
 * - Empty state
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/config';
import './DocumentList.css';

interface Document {
  id: string;
  filename: string;
  file_size: number;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  page_count?: number;
  chunk_count?: number;
  error_message?: string;
}

interface DocumentListProps {
  refreshTrigger?: number; // Change this to refresh the list
  onDocumentDeleted?: () => void;
}

/**
 * DocumentList Component - T086 Full Implementation
 *
 * Props:
 * - refreshTrigger: Number that changes to trigger a refresh
 * - onDocumentDeleted: Callback when a document is deleted
 */
const DocumentList: React.FC<DocumentListProps> = ({
  refreshTrigger = 0,
  onDocumentDeleted
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Fetch documents
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/documents');
      setDocuments(response.data.documents || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to load documents';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load documents on mount and when refreshTrigger changes
  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  // Handle download
  const handleDownload = async (documentId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}/download`);
      const { url } = response.data;
      
      // Open pre-signed URL in new tab
      window.open(url, '_blank');
    } catch (err: any) {
      alert('Failed to download document');
    }
  };

  // Handle delete
  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeletingIds(prev => new Set(prev).add(documentId));
      await apiClient.delete(`/documents/${documentId}`);
      
      // Remove from local state
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      if (onDocumentDeleted) {
        onDocumentDeleted();
      }
    } catch (err: any) {
      alert('Failed to delete document');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class and text
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { class: 'status-pending', text: 'Pending', icon: '⏳' };
      case 'processing':
        return { class: 'status-processing', text: 'Processing', icon: '⚙️' };
      case 'completed':
        return { class: 'status-completed', text: 'Completed', icon: '✓' };
      case 'failed':
        return { class: 'status-failed', text: 'Failed', icon: '✗' };
      default:
        return { class: 'status-unknown', text: status, icon: '?' };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="document-list" data-testid="document-list">
        <div className="loading-state">
          <div className="spinner" data-testid="loading-spinner"></div>
          <p>Loading documents...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="document-list" data-testid="document-list">
        <div className="error-state" data-testid="error-state">
          <svg
            className="error-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>{error}</p>
          <button onClick={fetchDocuments} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <div className="document-list" data-testid="document-list">
        <div className="empty-state" data-testid="empty-state">
          <svg
            className="empty-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3>No documents yet</h3>
          <p>Upload your first PDF document to get started</p>
        </div>
      </div>
    );
  }

  // Documents table
  return (
    <div className="document-list" data-testid="document-list">
      <div className="document-table-container">
        <table className="document-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Size</th>
              <th>Status</th>
              <th>Upload Date</th>
              <th>Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const statusInfo = getStatusInfo(doc.processing_status);
              const isDeleting = deletingIds.has(doc.id);
              
              return (
                <tr key={doc.id} data-testid={`document-row-${doc.id}`}>
                  <td className="document-name">
                    <svg
                      className="file-icon"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span data-testid="document-filename">{doc.filename}</span>
                  </td>
                  <td data-testid="document-size">{formatFileSize(doc.file_size)}</td>
                  <td>
                    <span 
                      className={`status-badge ${statusInfo.class}`}
                      data-testid="document-status"
                      title={doc.error_message || statusInfo.text}
                    >
                      <span className="status-icon">{statusInfo.icon}</span>
                      {statusInfo.text}
                    </span>
                  </td>
                  <td data-testid="document-date">{formatDate(doc.upload_date)}</td>
                  <td className="document-details" data-testid="document-details">
                    {doc.page_count && doc.chunk_count ? (
                      <span className="details-text">
                        {doc.page_count} pages · {doc.chunk_count} chunks
                      </span>
                    ) : (
                      <span className="details-text text-muted">—</span>
                    )}
                  </td>
                  <td className="document-actions">
                    <div className="action-buttons">
                      <button
                        onClick={() => handleDownload(doc.id, doc.filename)}
                        className="action-btn download-btn"
                        data-testid="download-btn"
                        title="Download document"
                        disabled={isDeleting}
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="action-btn delete-btn"
                        data-testid="delete-btn"
                        title="Delete document"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <div className="btn-spinner"></div>
                        ) : (
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentList;
