/**
 * Unit Tests for LoginForm Component (T037)
 * 
 * Tests cover:
 * - Form validation (email format, password required)
 * - Successful login flow (API call, JWT storage)
 * - Error handling (401, 403, network errors)
 * - Loading states during submission
 * - JWT token storage in context/localStorage
 * - Form field interactions
 * 
 * Testing Tools:
 * - Vitest (test runner)
 * - React Testing Library (component testing)
 * - @testing-library/user-event (user interactions)
 * - MSW (Mock Service Worker) for API mocking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import axios from 'axios';
import type { Mock } from 'vitest';

// Mock axios for API calls
vi.mock('axios', () => {
  const mockPost = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({
        post: mockPost,
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        },
      })),
      post: mockPost,
      isAxiosError: vi.fn((error: unknown) => {
        return error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError === true;
      }),
    },
  };
});

// Access the mocked post function after mocking
const mockedAxios = axios as unknown as { post: Mock; isAxiosError: Mock };
const mockPost = mockedAxios.post;

describe('LoginForm Component', () => {
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

  const renderLoginForm = () => {
    return render(
      <AuthProvider>
        <LoginForm onSuccess={mockOnSuccess} />
      </AuthProvider>
    );
  };

  describe('Form Rendering', () => {
    it('should render email and password input fields', () => {
      renderLoginForm();
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderLoginForm();
      
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should render password input with type="password"', () => {
      renderLoginForm();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should have email input with type="email"', () => {
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
    });
  });

  describe('Form Validation', () => {
    it('should show error when email is empty', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      await user.click(submitButton);
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error when password is empty', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      // Use email without domain - should fail regex but pass type="email" HTML5 validation
      await user.type(emailInput, 'invalid@domain');
      await user.type(passwordInput, 'SomePassword123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('should not show errors when fields are valid', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      
      // Should not show any error messages
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/invalid/i)).not.toBeInTheDocument();
    });
  });

  describe('Successful Login Flow', () => {
    it('should call API with correct credentials on submit', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          access_token: 'mock_access_token',
          token_type: 'bearer',
          expires_in: 900,
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'student@university.edu.tr',
            first_name: 'Test',
            last_name: 'Student',
            role: 'student',
            is_verified: true
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith(
          '/auth/login',
          {
            email: 'student@university.edu.tr',
            password: 'ValidPassword123!'
          }
        );
      });
    });

    it('should store JWT token on successful login', async () => {
      const user = userEvent.setup();
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      
      mockPost.mockResolvedValueOnce({
        data: {
          access_token: mockToken,
          token_type: 'bearer',
          expires_in: 900,
          user: {
            id: '123',
            email: 'student@university.edu.tr',
            first_name: 'Test',
            last_name: 'Student',
            role: 'student',
            is_verified: true
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        // Token should be stored (either in localStorage or context)
        const storedToken = localStorage.getItem('access_token') || 
                           localStorage.getItem('token') ||
                           localStorage.getItem('auth_token');
        
        expect(storedToken).toBe(mockToken);
      });
    });

    it('should call onSuccess callback after successful login', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          access_token: 'mock_token',
          token_type: 'bearer',
          expires_in: 900,
          user: {
            id: '123',
            email: 'student@university.edu.tr',
            first_name: 'Test',
            last_name: 'Student',
            role: 'student',
            is_verified: true
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for 401 Unauthorized', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid email or password'
            }
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/invalid.*email.*password/i)).toBeInTheDocument();
      });
    });

    it('should display error message for 403 Forbidden (unverified email)', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 403,
          data: {
            error: {
              code: 'EMAIL_NOT_VERIFIED',
              message: 'Please verify your email before logging in'
            }
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'unverified@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/verify.*email/i)).toBeInTheDocument();
      });
    });

    it('should display generic error message for network errors', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/network.*error|connection.*failed|something.*wrong/i)).toBeInTheDocument();
      });
    });

    it('should display error for 500 Internal Server Error', async () => {
      const user = userEvent.setup();
      
      mockPost.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          status: 500,
          data: {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Internal server error'
            }
          }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/server.*error|something.*wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator during login', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      mockPost.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            access_token: 'mock_token',
            token_type: 'bearer',
            expires_in: 900,
            user: {
              id: '123',
              email: 'student@university.edu.tr',
              first_name: 'Test',
              last_name: 'Student',
              role: 'student',
              is_verified: true
            }
          }
        }), 1000))
      );
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText(/loading|signing in|wait/i)).toBeInTheDocument();
    });

    it('should disable submit button during login', async () => {
      const user = userEvent.setup();
      
      mockPost.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: {
            access_token: 'mock_token',
            token_type: 'bearer',
            expires_in: 900,
            user: { id: '123', email: 'test@test.edu.tr', first_name: 'T', last_name: 'S', role: 'student', is_verified: true }
          }
        }), 1000))
      );
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      await user.type(emailInput, 'student@university.edu.tr');
      await user.type(passwordInput, 'ValidPassword123!');
      await user.click(submitButton);
      
      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Field Interactions', () => {
    it('should clear error messages when user starts typing', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      
      // Trigger validation error
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      });
      
      // Start typing - error should clear
      await user.type(emailInput, 's');
      expect(screen.queryByText(/email.*required/i)).not.toBeInTheDocument();
    });

    it('should allow toggling password visibility', async () => {
      const user = userEvent.setup();
      renderLoginForm();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Look for show/hide password button (if implemented)
      const toggleButton = screen.queryByRole('button', { name: /show|hide|toggle.*password/i });
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');
        
        await user.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
      }
    });

    it('should accept keyboard navigation (Tab and Enter)', async () => {
      const user = userEvent.setup();
      
      mockPost.mockResolvedValueOnce({
        data: {
          access_token: 'mock_token',
          token_type: 'bearer',
          expires_in: 900,
          user: { id: '123', email: 'test@test.edu.tr', first_name: 'T', last_name: 'S', role: 'student', is_verified: true }
        }
      });
      
      renderLoginForm();
      
      const emailInput = screen.getByLabelText(/email/i);
      
      // Focus email input
      emailInput.focus();
      
      // Type email
      await user.type(emailInput, 'student@university.edu.tr');
      
      // Tab to password
      await user.tab();
      
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveFocus();
      
      // Type password
      await user.type(passwordInput, 'ValidPassword123!');
      
      // Press Enter to submit
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockPost).toHaveBeenCalled();
      });
    });
  });
});
