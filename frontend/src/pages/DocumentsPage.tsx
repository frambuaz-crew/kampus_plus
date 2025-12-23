/**
 * Documents Management Page
 *
 * T087 Implementation - Full document management interface
 *
 * Features:
 * - PDF upload form (UploadForm component)
 * - Document list (DocumentList component)
 * - Auto-refresh after upload
 * - Responsive layout
 *
 * @component
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadForm from '../components/documents/UploadForm';
import DocumentList from '../components/documents/DocumentList';
import './DocumentsPage.css';

const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handle upload completion - refresh document list
  const handleUploadComplete = (documentId: string) => {
    console.log('Upload completed:', documentId);
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle document deletion - refresh document list
  const handleDocumentDeleted = () => {
    console.log('Document deleted');
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="documents-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button
            onClick={() => navigate('/dashboard')}
            className="back-btn"
            aria-label="Back to dashboard"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="header-text">
            <h1>My Documents</h1>
            <p className="header-subtitle">
              Upload and manage your PDF documents
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-content">
        {/* Upload Section */}
        <section className="upload-section">
          <div className="section-header">
            <h2>Upload New Document</h2>
            <p className="section-description">
              Upload a PDF file to add it to your document library
            </p>
          </div>
          <div className="upload-container">
            <UploadForm
              onUploadComplete={handleUploadComplete}
              maxFileSize={25 * 1024 * 1024} // 25MB
            />
          </div>
        </section>

        {/* Documents List Section */}
        <section className="documents-section">
          <div className="section-header">
            <h2>Your Documents</h2>
            <p className="section-description">
              View, download, and manage your uploaded documents
            </p>
          </div>
          <DocumentList
            refreshTrigger={refreshTrigger}
            onDocumentDeleted={handleDocumentDeleted}
          />
        </section>
      </main>
    </div>
  );
};

export default DocumentsPage;
