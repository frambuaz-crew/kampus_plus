/**
 * Unit Tests for RegisterForm Component (T046)
 * 
 * Tests cover:
 * - Form validation (email domain, password, required fields)
 * - Konya university email domain validation (5 allowed domains)
 * - Student ID required validation
 * - Successful registration flow (API call)
 * - Error handling (400, 409, network errors)
 * - Loading states during submission
 * - Form field interactions
 * - Password confirmation matching
 * 
 * Testing Tools:
 * - Vitest (test runner)
 * - React Testing Library (component testing)
 * - @testing-library/user-event (user interactions)
 * 
 * Note: role field removed - all users registered as students
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../RegisterForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import { apiClient } from '../../../api/config';
import type { Mock } from 'vitest';

// Mock apiClient
vi.mock('../../../api/config', () => {
  const mockPost = vi.fn();
  return {
    apiClient: {
      post: mockPost,
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
      },
    },
  };
});

// Access the mocked post function after mocking
const mockPost = (apiClient as unknown as { post: Mock }).post;

describe('RegisterForm Component', () => {
  const mockOnSuccess = vi.fn();
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    mockPost.mockReset();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderRegisterForm = () => {
    return render(
      <AuthProvider>
        <RegisterForm onSuccess={mockOnSuccess} />
      </AuthProvider>
    );
  };

  const getAllowedEmail = () => {
    // Return one of the allowed Konya university domains
    const allowedDomains = [
      'ogr.selcuk.edu.tr',
      'ktun.edu.tr',
      'ogr.erbakan.edu.tr',
      'karatay.edu.tr',
      'ogr.gidatarim.edu.tr'
    ];
    return `test@${allowedDomains[0]}`;
  };

  const getValidFormData = () => ({
    email: getAllowedEmail(),
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    first_name: 'Test',
    last_name: 'Student',
    student_id: '202112345'
  });

  describe('Form Rendering', () => {
    it('should render all required input fields', () => {
      renderRegisterForm();
      
      expect(screen.getByLabelText(/university email|email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/student id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderRegisterForm();
      
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should render password inputs with type="password"', () => {
      renderRegisterForm();
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('should have email input with type="email"', () => {
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error for email from non-allowed domain', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, 'student@mit.edu');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/konya university|allowed.*domains/i)).toBeInTheDocument();
      });
    });

    it('should accept all 5 allowed Konya university domains', async () => {
      const user = userEvent.setup();
      const allowedDomains = [
        'ogr.selcuk.edu.tr',
        'ktun.edu.tr',
        'ogr.erbakan.edu.tr',
        'karatay.edu.tr',
        'ogr.gidatarim.edu.tr'
      ];

      for (const domain of allowedDomains) {
        renderRegisterForm();
        const emailInput = screen.getByLabelText(/university email|email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
        const firstNameInput = screen.getByLabelText(/first name/i);
        const lastNameInput = screen.getByLabelText(/last name/i);
        const studentIdInput = screen.getByLabelText(/student id/i);

        await user.type(emailInput, `test@${domain}`);
        await user.type(passwordInput, 'SecurePass123!');
        await user.type(confirmPasswordInput, 'SecurePass123!');
        await user.type(firstNameInput, 'Test');
        await user.type(lastNameInput, 'Student');
        await user.type(studentIdInput, '202112345');

        // Should not show email domain error
        expect(screen.queryByText(/konya university|allowed.*domains/i)).not.toBeInTheDocument();
        
        // Clean up for next iteration
        vi.clearAllMocks();
      }
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is less than 8 characters', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.type(passwordInput, 'short');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password.*at least 8/i)).toBeInTheDocument();
      });
    });

    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'DifferentPass456!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
      });
    });

    it('should show error when first name is empty', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/first name.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when last name is empty', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/last name.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when student_id is empty', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, getAllowedEmail());
      await user.type(passwordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'SecurePass123!');
      await user.type(firstNameInput, 'Test');
      await user.type(lastNameInput, 'Student');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/student.*id.*required/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when all fields are valid', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      
      // Should not show any error messages
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/match/i)).not.toBeInTheDocument();
    });
  });

  describe('Successful Registration Flow', () => {
    it('should call register API with correct data (without role field)', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: getAllowedEmail(),
          message: 'Verification email sent'
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/register', {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          student_id: formData.student_id,
          // role field should NOT be present
        });
      });
    });

    it('should show success message after successful registration', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: getAllowedEmail(),
          message: 'Verification email sent'
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/registration successful|check your email/i)).toBeInTheDocument();
      });
    });

    it('should reset form after successful registration', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: getAllowedEmail(),
          message: 'Verification email sent'
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(emailInput).toHaveValue('');
        expect(passwordInput).toHaveValue('');
        expect(confirmPasswordInput).toHaveValue('');
        expect(firstNameInput).toHaveValue('');
        expect(lastNameInput).toHaveValue('');
        expect(studentIdInput).toHaveValue('');
      });
    });

    it('should call onSuccess callback after successful registration', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: getAllowedEmail(),
          message: 'Verification email sent'
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      // onSuccess is called after 2 second delay
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for 409 Conflict (email already exists)', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 409,
          data: {
            error: {
              code: 'CONFLICT',
              message: 'Email already registered'
            }
          }
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/email.*already.*registered|already exists/i)).toBeInTheDocument();
      });
    });

    it('should display error message for 400 Bad Request', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid registration data'
            }
          }
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid.*registration|validation.*error/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for network errors', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network.*error|connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during registration', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      mockPost.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            email: getAllowedEmail(),
            message: 'Verification email sent'
          }
        }), 1000))
      );
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });

    it('should disable submit button during registration', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      mockPost.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            user_id: '123e4567-e89b-12d3-a456-426614174000',
            email: getAllowedEmail(),
            message: 'Verification email sent'
          }
        }), 1000))
      );
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const firstNameInput = screen.getByLabelText(/first name/i);
      const lastNameInput = screen.getByLabelText(/last name/i);
      const studentIdInput = screen.getByLabelText(/student id/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      await user.type(emailInput, formData.email);
      await user.type(passwordInput, formData.password);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      await user.type(firstNameInput, formData.first_name);
      await user.type(lastNameInput, formData.last_name);
      await user.type(studentIdInput, formData.student_id);
      await user.click(submitButton);
      
      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Field Interactions', () => {
    it('should clear error messages when user starts typing', async () => {
      const user = userEvent.setup();
      renderRegisterForm();
      
      const emailInput = screen.getByLabelText(/university email|email/i);
      const submitButton = screen.getByRole('button', { name: /register|create account/i });
      
      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
      
      // Start typing - error should clear
      await user.type(emailInput, 's');
      expect(screen.queryByText(/email.*required/i)).not.toBeInTheDocument();
    });

    it('should allow keyboard navigation (Tab and Enter)', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          user_id: '123e4567-e89b-12d3-a456-426614174000',
          email: getAllowedEmail(),
          message: 'Verification email sent'
        }
      });
      
      renderRegisterForm();
      
      const formData = getValidFormData();
      const emailInput = screen.getByLabelText(/university email|email/i);
      
      // Focus email input
      emailInput.focus();
      
      // Type email
      await user.type(emailInput, formData.email);
      
      // Tab through fields
      await user.tab();
      const firstNameInput = screen.getByLabelText(/first name/i);
      expect(firstNameInput).toHaveFocus();
      
      await user.type(firstNameInput, formData.first_name);
      await user.tab();
      
      // Continue tabbing and filling form
      const lastNameInput = screen.getByLabelText(/last name/i);
      await user.type(lastNameInput, formData.last_name);
      await user.tab();
      
      const studentIdInput = screen.getByLabelText(/student id/i);
      await user.type(studentIdInput, formData.student_id);
      await user.tab();
      
      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, formData.password);
      await user.tab();
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      await user.type(confirmPasswordInput, formData.confirmPassword);
      
      // Press Enter to submit
      await user.keyboard('{Enter}');
      
      // Form should submit (no validation errors)
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalled();
      });
    });
  });
});

