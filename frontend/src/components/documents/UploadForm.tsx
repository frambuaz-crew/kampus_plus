/**
 * PDF Upload Form Component (UploadForm)
 *
 * TDD Placeholder: Component will be implemented after tests (T085)
 * This is the RED phase - tests written first, implementation comes next
 *
 * Features to implement:
 * - File selection via input or drag-and-drop
 * - File validation (type, size)
 * - Upload progress tracking
 * - Error handling with user-friendly messages
 * - Success feedback and form reset
 * - Accessibility support
 *
 * @component
 */

import React from 'react';

interface UploadFormProps {
  onUploadComplete?: (documentId: string) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // bytes, default 25MB
}

/**
 * UploadForm Component - Placeholder for T085 implementation
 *
 * Tests in: frontend/src/components/documents/__tests__/UploadForm.test.tsx
 * Implementation in: T085
 *
 * Props:
 * - onUploadComplete: Callback when upload succeeds with document ID
 * - onError: Callback for error handling
 * - maxFileSize: Max file size in bytes (default: 25 * 1024 * 1024)
 */
const UploadForm: React.FC<UploadFormProps> = ({
  onUploadComplete,
  onError,
  maxFileSize = 25 * 1024 * 1024
}) => {
  // TODO: Implementation in T085
  // - State management (file, uploading, error, progress)
  // - File input handler
  // - Drag-and-drop handlers
  // - API call to POST /documents
  // - Progress tracking
  // - Error messages
  // - Success feedback

  return (
    <div data-testid="upload-form">
      {/* Placeholder will be replaced in T085 */}
      <p>Upload Form Component - Implementation pending (T085)</p>
    </div>
  );
};

export default UploadForm;
