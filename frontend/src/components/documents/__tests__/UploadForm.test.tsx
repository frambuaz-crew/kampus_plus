/**
 * Component Tests: PDF Upload Form (T077)
 *
 * This module tests the UploadForm component behavior including:
 * 1. File selection and validation (type, size)
 * 2. Drag-and-drop functionality
 * 3. Upload progress tracking and feedback
 * 4. Error handling with clear messages
 * 5. Success states and user feedback
 * 6. Accessibility and keyboard navigation
 *
 * TDD Approach: Tests written FIRST (RED), component implemented (GREEN)
 *
 * Constitution Alignment:
 * - Security by default: File type/size validation client-side + server-side
 * - User experience: Clear progress indication and error messages
 * - Test-first development: Tests BEFORE component implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import React from 'react';

// This will be created in the next task (T085)
import UploadForm from '../UploadForm';

// Mock axios for API calls
vi.mock('axios');
const mockedAxios = axios as any;

// Mock react-dropzone or native file input
const mockFileInput = vi.fn();

describe('UploadForm Component (T077)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.post.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // TEST: COMPONENT RENDERING (T077.1)
  // ============================================================================

  it('should render upload form with file input', () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select file|choose file|upload/i });
    expect(fileInput).toBeInTheDocument();
  });

  it('should display file input label "Select PDF file"', () => {
    render(<UploadForm />);
    
    const label = screen.getByText(/select pdf|choose pdf|upload pdf/i);
    expect(label).toBeInTheDocument();
  });

  it('should render upload button initially disabled', () => {
    render(<UploadForm />);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    // Button should be disabled until file is selected
    expect(uploadButton).toBeDisabled();
  });

  it('should display file size limit information', () => {
    render(<UploadForm />);
    
    const sizeInfo = screen.getByText(/25\s*MB|25MB/i);
    expect(sizeInfo).toBeInTheDocument();
  });

  it('should render drag-and-drop zone', () => {
    render(<UploadForm />);
    
    const dropZone = screen.getByText(/drag.*drop|drop.*file|drop.*here/i);
    expect(dropZone).toBeInTheDocument();
  });

  // ============================================================================
  // TEST: FILE SELECTION & VALIDATION (T077.2)
  // ============================================================================

  it('should allow selecting a PDF file', async () => {
    const user = userEvent.setup();
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['PDF content'], 'notes.pdf', { type: 'application/pdf' });
    
    // Simulate file selection
    await userEvent.upload(fileInput, pdfFile);
    
    // File should be displayed in the form
    expect(screen.getByText(/notes.pdf/i)).toBeInTheDocument();
  });

  it('should display selected file name and size', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['PDF content here'], 'important_notes.pdf', { type: 'application/pdf' });
    
    await userEvent.upload(fileInput, pdfFile);
    
    expect(screen.getByText(/important_notes.pdf/i)).toBeInTheDocument();
    // File size should be displayed
    const fileSize = screen.getByText(/bytes|KB|MB/i);
    expect(fileSize).toBeInTheDocument();
  });

  it('should enable upload button after file selection', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(uploadButton).not.toBeDisabled();
  });

  it('should reject non-PDF files with error message', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const txtFile = new File(['text content'], 'notes.txt', { type: 'text/plain' });
    
    await userEvent.upload(fileInput, txtFile);
    
    const errorMessage = screen.getByText(/pdf|only pdf|only.*pdf/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('should reject files > 25MB with size error', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    
    // Create a mock file larger than 25MB
    const largeFile = new File(['x'.repeat(26 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 26 * 1024 * 1024 });
    
    await userEvent.upload(fileInput, largeFile);
    
    const errorMessage = screen.getByText(/25\s*MB|exceeds.*limit|too.*large/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('should validate file extension is .pdf (case insensitive)', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    
    // .PDF uppercase should be accepted
    const pdfFileUpper = new File(['content'], 'NOTES.PDF', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFileUpper);
    
    // Should not show error
    const errorMessage = screen.queryByText(/pdf|only pdf/i);
    expect(errorMessage).not.toBeInTheDocument();
  });

  it('should clear validation error when valid file selected after error', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    
    // First: upload invalid file
    const txtFile = new File(['text'], 'notes.txt', { type: 'text/plain' });
    await userEvent.upload(fileInput, txtFile);
    
    expect(screen.getByText(/pdf|only pdf/i)).toBeInTheDocument();
    
    // Then: upload valid PDF
    const pdfFile = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    // Error should be gone
    const errorMessage = screen.queryByText(/pdf|only pdf/i);
    expect(errorMessage).not.toBeInTheDocument();
  });

  // ============================================================================
  // TEST: DRAG-AND-DROP FUNCTIONALITY (T077.3)
  // ============================================================================

  it('should accept PDF file via drag-and-drop', async () => {
    render(<UploadForm />);
    
    const dropZone = screen.getByText(/drag.*drop|drop.*file/i).closest('div');
    const pdfFile = new File(['PDF content'], 'notes.pdf', { type: 'application/pdf' });
    
    const dataTransfer = {
      files: [pdfFile],
      items: [{ kind: 'file', type: 'application/pdf' }],
      types: ['Files']
    };
    
    // Simulate drag over
    fireEvent.dragOver(dropZone!, { dataTransfer });
    
    // Simulate drop
    fireEvent.drop(dropZone!, { dataTransfer });
    
    await waitFor(() => {
      expect(screen.getByText(/notes.pdf/i)).toBeInTheDocument();
    });
  });

  it('should reject non-PDF files in drag-and-drop with error', async () => {
    render(<UploadForm />);
    
    const dropZone = screen.getByText(/drag.*drop|drop.*file/i).closest('div');
    const txtFile = new File(['text'], 'notes.txt', { type: 'text/plain' });
    
    const dataTransfer = {
      files: [txtFile],
      items: [{ kind: 'file', type: 'text/plain' }],
      types: ['Files']
    };
    
    fireEvent.drop(dropZone!, { dataTransfer });
    
    await waitFor(() => {
      expect(screen.getByText(/pdf|only pdf/i)).toBeInTheDocument();
    });
  });

  it('should show visual feedback when hovering over drop zone', async () => {
    render(<UploadForm />);
    
    const dropZone = screen.getByText(/drag.*drop/i).closest('div');
    
    // Drag over should add visual class or style
    fireEvent.dragOver(dropZone!, {
      dataTransfer: { types: ['Files'] } as any
    });
    
    // Check for hover state (e.g., className with 'drag-active' or border style)
    expect(dropZone).toHaveClass(/drag-active|hovering|highlight/i);
  });

  it('should accept only first file if multiple files dropped', async () => {
    render(<UploadForm />);
    
    const dropZone = screen.getByText(/drag.*drop/i).closest('div');
    const file1 = new File(['content1'], 'notes1.pdf', { type: 'application/pdf' });
    const file2 = new File(['content2'], 'notes2.pdf', { type: 'application/pdf' });
    
    const dataTransfer = {
      files: [file1, file2],
      items: [
        { kind: 'file', type: 'application/pdf' },
        { kind: 'file', type: 'application/pdf' }
      ],
      types: ['Files']
    };
    
    fireEvent.drop(dropZone!, { dataTransfer });
    
    // Should only process first file
    expect(screen.getByText(/notes1.pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/notes2.pdf/i)).not.toBeInTheDocument();
  });

  // ============================================================================
  // TEST: UPLOAD PROGRESS & FEEDBACK (T077.4)
  // ============================================================================

  it('should show loading spinner during upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<UploadForm />);
    
    // Select file
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    // Click upload
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Loading spinner should appear
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toBeInTheDocument();
  });

  it('should display upload progress percentage', async () => {
    const user = userEvent.setup();
    
    // Mock axios with progress events
    mockedAxios.post.mockImplementation((url, data, config) => {
      // Simulate progress events
      if (config.onUploadProgress) {
        config.onUploadProgress({ loaded: 50, total: 100 }); // 50%
        config.onUploadProgress({ loaded: 100, total: 100 }); // 100%
      }
      return Promise.resolve({ data: { document_id: 'doc123' } });
    });
    
    render(<UploadForm />);
    
    // Select and upload file
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Progress percentage should be displayed
    await waitFor(() => {
      const progressText = screen.getByText(/100%|100 %/);
      expect(progressText).toBeInTheDocument();
    });
  });

  it('should show progress bar visual feedback', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation((url, data, config) => {
      if (config.onUploadProgress) {
        config.onUploadProgress({ loaded: 75, total: 100 });
      }
      return Promise.resolve({ data: { document_id: 'doc123' } });
    });
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Progress bar element with width percentage
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('should disable upload button during upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Button should be disabled during upload
    expect(uploadButton).toBeDisabled();
  });

  it('should prevent file selection during upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // File input should be disabled during upload
    expect(fileInput).toBeDisabled();
  });

  // ============================================================================
  // TEST: ERROR HANDLING (T077.5)
  // ============================================================================

  it('should show error message on upload failure', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to upload file. Please try again.';
    mockedAxios.post.mockRejectedValueOnce(new Error(errorMessage));
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Error message should be displayed
    await waitFor(() => {
      expect(screen.getByText(/failed.*upload|upload.*failed/i)).toBeInTheDocument();
    });
  });

  it('should show specific error for 413 (quota exceeded)', async () => {
    const user = userEvent.setup();
    const error = new Error('Payload Too Large');
    (error as any).response = { status: 413, data: { detail: 'Storage quota exceeded' } };
    mockedAxios.post.mockRejectedValueOnce(error);
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Quota error message
    await waitFor(() => {
      expect(screen.getByText(/quota|storage.*limit/i)).toBeInTheDocument();
    });
  });

  it('should show specific error for malware detection', async () => {
    const user = userEvent.setup();
    const error = new Error('Bad Request');
    (error as any).response = { status: 400, data: { detail: 'File contains malware' } };
    mockedAxios.post.mockRejectedValueOnce(error);
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'infected.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/malware|threat/i)).toBeInTheDocument();
    });
  });

  it('should have dismissible error alert', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close|dismiss|x/i });
      expect(closeButton).toBeInTheDocument();
      
      // Click close
      user.click(closeButton);
      
      // Error message should disappear
      expect(screen.queryByText(/upload.*failed/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST: SUCCESS STATES (T077.6)
  // ============================================================================

  it('should show success message after upload completes', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        document_id: 'doc123',
        processing_status: 'pending',
        filename: 'notes.pdf'
      }
    });
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Success message
    await waitFor(() => {
      expect(screen.getByText(/success|uploaded.*successfully/i)).toBeInTheDocument();
    });
  });

  it('should show processing status after upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        document_id: 'doc123',
        processing_status: 'pending',
        filename: 'notes.pdf'
      }
    });
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Status message
    await waitFor(() => {
      expect(screen.getByText(/processing|pending|queued/i)).toBeInTheDocument();
    });
  });

  it('should clear form and reset after successful upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        document_id: 'doc123',
        processing_status: 'pending'
      }
    });
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    expect(screen.getByText(/notes.pdf/i)).toBeInTheDocument();
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // After success, file name should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/notes.pdf/i)).not.toBeInTheDocument();
    });
    
    // Upload button should be disabled again
    expect(uploadButton).toBeDisabled();
  });

  it('should provide retry option after error', async () => {
    const user = userEvent.setup();
    
    // First attempt: failure
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Error shown
    await waitFor(() => {
      expect(screen.getByText(/network.*error/i)).toBeInTheDocument();
    });
    
    // Second attempt: success
    mockedAxios.post.mockResolvedValueOnce({
      data: { document_id: 'doc123' }
    });
    
    // Retry button or just re-click upload
    const retryButton = screen.getByRole('button', { name: /upload|retry/i });
    await user.click(retryButton);
    
    // Success message should appear
    await waitFor(() => {
      expect(screen.getByText(/success|uploaded/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // TEST: ACCESSIBILITY (T077.7)
  // ============================================================================

  it('should have accessible form with ARIA labels', () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    expect(fileInput).toHaveAccessibleName();
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(uploadButton).toHaveAccessibleName();
  });

  it('should announce errors to screen readers', async () => {
    const user = userEvent.setup();
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const txtFile = new File(['text'], 'notes.txt', { type: 'text/plain' });
    
    await userEvent.upload(fileInput, txtFile);
    
    // Error should be in alert role for screen readers
    const alertRole = screen.getByRole('alert');
    expect(alertRole).toBeInTheDocument();
    expect(alertRole).toHaveTextContent(/pdf|only pdf/i);
  });

  it('should be keyboard navigable', async () => {
    const user = userEvent.setup();
    render(<UploadForm />);
    
    // Tab to file input
    const fileInputButton = screen.getByRole('button', { name: /select|choose/i });
    fileInputButton.focus();
    expect(document.activeElement).toBe(fileInputButton);
    
    // Tab to upload button
    await user.keyboard('{Tab}');
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(document.activeElement).toBe(uploadButton);
  });

  // ============================================================================
  // TEST: EDGE CASES (T077.8)
  // ============================================================================

  it('should handle empty file gracefully', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' });
    
    await userEvent.upload(fileInput, emptyFile);
    
    // Should either reject or allow (depends on spec)
    // Here we assume it's allowed but backend will validate
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    expect(uploadButton).not.toBeDisabled();
  });

  it('should handle file names with special characters', async () => {
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const specialFile = new File(['content'], 'notes_ümlaut_字符.pdf', { type: 'application/pdf' });
    
    await userEvent.upload(fileInput, specialFile);
    
    // File name should be displayed correctly
    expect(screen.getByText(/ümlaut|字符/)).toBeInTheDocument();
  });

  it('should handle rapid file selections', async () => {
    const user = userEvent.setup();
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    
    // First selection
    const file1 = new File(['content1'], 'file1.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, file1);
    
    // Rapid second selection (should replace)
    const file2 = new File(['content2'], 'file2.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, file2);
    
    // Only second file should be shown
    expect(screen.getByText(/file2.pdf/i)).toBeInTheDocument();
    expect(screen.queryByText(/file1.pdf/i)).not.toBeInTheDocument();
  });

  it('should handle aborted uploads', async () => {
    const user = userEvent.setup();
    let abortController: AbortController;
    
    mockedAxios.post.mockImplementation((url, data, config) => {
      abortController = config.signal;
      return new Promise((resolve, reject) => {
        setTimeout(() => reject(new Error('Upload aborted')), 50);
      });
    });
    
    render(<UploadForm />);
    
    const fileInput = screen.getByRole('button', { name: /select|choose/i });
    const pdfFile = new File(['content'], 'notes.pdf', { type: 'application/pdf' });
    await userEvent.upload(fileInput, pdfFile);
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await user.click(uploadButton);
    
    // Abort the upload
    abortController!.abort();
    
    // Error message should appear
    await waitFor(() => {
      expect(screen.getByText(/aborted|cancelled/i)).toBeInTheDocument();
    });
  });
});
