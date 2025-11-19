/**
 * Unit Tests for ChatInterface Component (T058) - KAMPÜS+ Phase 4
 * 
 * Tests cover:
 * - Message list rendering (user/assistant messages)
 * - Message input handling (text entry, send button)
 * - Typing indicators during AI response
 * - Source citation display with expandable cards
 * - Loading states during message submission
 * - Error handling (API errors, network failures)
 * - Auto-scroll to latest message
 * - Empty state (no messages)
 * - Message history loading
 * 
 * Testing Tools:
 * - Vitest (test runner)
 * - React Testing Library (component testing)
 * - @testing-library/user-event (user interactions)
 * - Axios mocking for API calls
 * 
 * TDD Approach: Write tests FIRST (RED), then implement component (GREEN).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../ChatInterface';
import { AuthProvider } from '../../../contexts/AuthContext';
import axios from 'axios';
import type { Mock } from 'vitest';

// Mock axios for API calls
vi.mock('axios', () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({
        post: mockPost,
        get: mockGet,
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
        },
      })),
      post: mockPost,
      get: mockGet,
      isAxiosError: vi.fn((error: unknown) => {
        return error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError === true;
      }),
    },
  };
});

const mockedAxios = axios as unknown as { post: Mock; get: Mock; isAxiosError: Mock };
const mockPost = mockedAxios.post;
const mockGet = mockedAxios.get;

// Sample chat session data
const mockSession = {
  id: 'session-123',
  title: 'Test Chat Session',
  created_at: '2025-11-19T10:00:00Z',
  updated_at: '2025-11-19T10:00:00Z',
  is_active: true,
};

// Sample messages
const mockMessages = [
  {
    id: 'msg-1',
    session_id: 'session-123',
    role: 'user',
    content: 'KAMPÜS+ nedir?',
    created_at: '2025-11-19T10:01:00Z',
    sources: null,
  },
  {
    id: 'msg-2',
    session_id: 'session-123',
    role: 'assistant',
    content: 'KAMPÜS+ yapay zeka destekli bir eğitim platformudur.',
    created_at: '2025-11-19T10:01:05Z',
    sources: [
      {
        title: 'KAMPÜS+ Kullanım Kılavuzu',
        source_type: 'official_document',
        content_preview: 'KAMPÜS+ platformu öğrencilere yapay zeka destekli asistan sağlar.',
        metadata: {
          document_id: 'doc-001',
          course_id: null,
        },
      },
    ],
  },
];

describe('ChatInterface Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    mockGet.mockReset();
    localStorage.clear();
    
    // Mock successful authentication
    localStorage.setItem('token', 'mock-jwt-token');
    localStorage.setItem('user', JSON.stringify({
      id: 'user-123',
      email: 'test@university.edu.tr',
      role: 'student',
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Test: Component Rendering
  // ============================================================================

  it('should render chat interface with empty state', async () => {
    mockGet.mockResolvedValueOnce({ data: [] }); // No messages

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument();
  });

  it('should render message input and send button', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /message input/i })).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder');
    expect(sendButton).toBeInTheDocument();
  });

  // ============================================================================
  // Test: Message History Loading
  // ============================================================================

  it('should load and display message history', async () => {
    mockGet.mockResolvedValueOnce({ data: mockMessages });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('KAMPÜS+ nedir?')).toBeInTheDocument();
    });

    expect(screen.getByText('KAMPÜS+ yapay zeka destekli bir eğitim platformudur.')).toBeInTheDocument();
  });

  it('should display user messages with correct styling', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockMessages[0]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      const userMessage = screen.getByText('KAMPÜS+ nedir?');
      expect(userMessage).toBeInTheDocument();
      // User messages should have specific class or data attribute
      const messageContainer = userMessage.closest('[data-role="user"]');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  it('should display assistant messages with correct styling', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockMessages[1]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      const assistantMessage = screen.getByText(/KAMPÜS\+ yapay zeka/i);
      expect(assistantMessage).toBeInTheDocument();
      const messageContainer = assistantMessage.closest('[data-role="assistant"]');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Test: Sending Messages
  // ============================================================================

  it('should send message when send button is clicked', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] }); // Initial load
    mockPost.mockResolvedValueOnce({
      data: {
        id: 'msg-new',
        role: 'assistant',
        content: 'Test response',
        sources: [],
      },
    });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello AI');
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          content: 'Hello AI',
        })
      );
    });
  });

  it('should send message when Enter key is pressed', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockResolvedValueOnce({
      data: {
        id: 'msg-new',
        role: 'assistant',
        content: 'Response',
        sources: [],
      },
    });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'Test message{Enter}');

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  it('should NOT send message when Shift+Enter is pressed (newline)', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i }) as HTMLTextAreaElement;
    await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(mockPost).not.toHaveBeenCalled();
    expect(input.value).toContain('Line 1');
    expect(input.value).toContain('Line 2');
  });

  it('should disable send button when input is empty', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Test');

    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockResolvedValueOnce({
      data: {
        id: 'msg-new',
        role: 'assistant',
        content: 'Response',
        sources: [],
      },
    });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i }) as HTMLTextAreaElement;
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  // ============================================================================
  // Test: Loading States
  // ============================================================================

  it('should show loading indicator while fetching messages', () => {
    mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show typing indicator while waiting for AI response', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'Question');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/typing|thinking|generating/i)).toBeInTheDocument();
    });
  });

  it('should disable input while AI is responding', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Question');
    await user.click(sendButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  // ============================================================================
  // Test: Source Citations
  // ============================================================================

  it('should display source citations for assistant messages', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockMessages[1]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('KAMPÜS+ Kullanım Kılavuzu')).toBeInTheDocument();
    });

    expect(screen.getByText(/official_document/i)).toBeInTheDocument();
  });

  it('should show source preview on citation click', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [mockMessages[1]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('KAMPÜS+ Kullanım Kılavuzu')).toBeInTheDocument();
    });

    const citation = screen.getByText('KAMPÜS+ Kullanım Kılavuzu');
    await user.click(citation);

    await waitFor(() => {
      expect(screen.getByText(/KAMPÜS\+ platformu öğrencilere/i)).toBeInTheDocument();
    });
  });

  it('should not show sources for user messages', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockMessages[0]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('KAMPÜS+ nedir?')).toBeInTheDocument();
    });

    expect(screen.queryByText(/source/i)).not.toBeInTheDocument();
  });

  // ============================================================================
  // Test: Error Handling
  // ============================================================================

  it('should display error message on API failure', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 500, data: { detail: 'Server error' } },
    });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/error|failed|try again/i)).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500 },
      })
      .mockResolvedValueOnce({
        data: {
          user_message: {
            id: 'msg-user-retry',
            role: 'user',
            content: 'Retry',
            created_at: new Date().toISOString(),
            sources: null,
          },
          assistant_message: {
            id: 'msg-retry',
            role: 'assistant',
            content: 'Success after retry',
            created_at: new Date().toISOString(),
            sources: [],
          },
        },
      });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Retry
    await user.type(input, 'Retry');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Success after retry')).toBeInTheDocument();
    });
  });

  it('should display network error message', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValueOnce({ data: [] });
    mockPost.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Network Error',
    });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox', { name: /message input/i });
    await user.type(input, 'Test');
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/network|connection/i)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Test: Auto-scroll Behavior
  // ============================================================================

  it('should auto-scroll to latest message when new message arrives', async () => {
    const scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    mockGet.mockResolvedValueOnce({ data: mockMessages });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/yapay zeka destekli/i)).toBeInTheDocument();
    });

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  // ============================================================================
  // Test: Message Timestamps
  // ============================================================================

  it('should display message timestamps', async () => {
    mockGet.mockResolvedValueOnce({ data: [mockMessages[0]] });

    render(
      <AuthProvider>
        <ChatInterface sessionId={mockSession.id} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('KAMPÜS+ nedir?')).toBeInTheDocument();
    });

    // Should show time (could be relative like "2 minutes ago" or absolute)
    expect(screen.getByText(/\d{1,2}:\d{2}|ago|just now/i)).toBeInTheDocument();
  });
});
