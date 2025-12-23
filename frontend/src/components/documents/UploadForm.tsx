/**
 * PDF Upload Form Component (UploadForm)
 *
 * T085 Implementation - Full featured PDF upload with drag-and-drop
 *
 * Features:
 * - File selection via input or drag-and-drop
 * - File validation (type, size)
 * - Upload progress tracking
 * - Error handling with user-friendly messages
 * - Success feedback and form reset
 * - Accessibility support
 *
 * @component
 */

import React, { useState, useRef } from 'react';
import { apiClient } from '../../api/config';
import './UploadForm.css';

interface UploadFormProps {
  onUploadComplete?: (documentId: string) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // bytes, default 25MB
}

/**
 * UploadForm Component - T085 Full Implementation
 *
 * Tests in: frontend/src/components/documents/__tests__/UploadForm.test.tsx
 */
const UploadForm: React.FC<UploadFormProps> = ({
  onUploadComplete,
  onError,
  maxFileSize = 25 * 1024 * 1024
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = (file: File): string | null => {
    // Check file type
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = Math.round(maxFileSize / (1024 * 1024));
      return `File size exceeds ${maxSizeMB}MB limit`;
    }

    return null;
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setError(null);
    setSuccess(false);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onError) onError(validationError);
      return;
    }

    setSelectedFile(file);
  };

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await apiClient.post('/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          }
        },
      });

      // Upload successful
      setSuccess(true);
      setSelectedFile(null);
      setProgress(0);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadComplete && response.data.id) {
        onUploadComplete(response.data.id);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to upload file';
      setError(errorMessage);
      setProgress(0);
      
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div data-testid="upload-form" className="upload-form">
      {/* Drag and drop zone */}
      <div
        data-testid="drop-zone"
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload PDF file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          disabled={uploading}
          style={{ display: 'none' }}
          data-testid="file-input"
        />

        {!selectedFile && !uploading && (
          <div className="drop-zone-content">
            <svg
              className="upload-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="drop-zone-text">
              <strong>Choose a file</strong> or drag it here
            </p>
            <p className="drop-zone-hint">PDF files only, max {Math.round(maxFileSize / (1024 * 1024))}MB</p>
          </div>
        )}

        {selectedFile && !uploading && (
          <div className="selected-file" data-testid="selected-file">
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
            <div className="file-info">
              <p className="file-name" data-testid="file-name">{selectedFile.name}</p>
              <p className="file-size" data-testid="file-size">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="remove-file-btn"
              data-testid="remove-file-btn"
              aria-label="Remove file"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {uploading && (
          <div className="upload-progress" data-testid="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              />
            </div>
            <p className="progress-text" data-testid="progress-text">
              Uploading... {progress}%
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message" data-testid="error-message" role="alert">
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
          <span>{error}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="success-message" data-testid="success-message" role="status">
          <svg
            className="success-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>File uploaded successfully!</span>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && !uploading && (
        <button
          type="button"
          onClick={handleUpload}
          className="upload-btn"
          data-testid="upload-btn"
          disabled={uploading}
        >
          Upload PDF
        </button>
      )}
    </div>
  );
};

export default UploadForm;
