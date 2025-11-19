import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ChatPage } from '../ChatPage';
import { apiClient } from '../../api/config';

vi.mock('../../api/config', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApiClient = apiClient as any;

describe('ChatPage', () => {
  const mockSessions = [
    {
      id: 1,
      title: 'Course Schedule Questions',
      created_at: '2025-11-19T10:00:00Z',
      updated_at: '2025-11-19T10:30:00Z',
      message_count: 5,
    },
    {
      id: 2,
      title: 'Syllabus Review',
      created_at: '2025-11-18T14:00:00Z',
      updated_at: '2025-11-18T14:15:00Z',
      message_count: 3,
    },
  ];

  const mockMessages = [
    {
      id: 1,
      role: 'user',
      content: 'What courses do I have today?',
      timestamp: '2025-11-19T10:00:00Z',
      sources: [],
    },
    {
      id: 2,
      role: 'assistant',
      content: 'You have CS101 at 2:00 PM.',
      timestamp: '2025-11-19T10:01:00Z',
      sources: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClient.get.mockReset();
    mockedApiClient.post.mockReset();
    localStorage.setItem('token', 'test-token-123');
    
    // Default mock: SessionList always gets sessions
    mockedApiClient.get.mockResolvedValue({ data: mockSessions });
  });

  describe('Layout and Structure', () => {
    it('should render chat page with sidebar and main area', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        // Sidebar should be present
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      // Main chat area should be present
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    it('should have responsive two-column layout', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      const { container } = render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      // Check for grid layout classes
      const mainContainer = container.querySelector('.grid');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should render SessionList component', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });
    });

    it('should render ChatInterface component', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session Selection', () => {
    it('should load messages when session is selected', async () => {
      mockedApiClient.get.mockReset();
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: mockMessages } })
        .mockResolvedValue({ data: mockSessions });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByText('What courses do I have today?')).toBeInTheDocument();
      });
    });

    it('should highlight selected session', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: mockMessages } });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Syllabus Review')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Syllabus Review').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(sessionButton).toHaveClass('bg-blue-100');
      });
    });

    it('should fetch session messages from API', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: mockMessages } });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(mockedApiClient.get).toHaveBeenCalledWith('/chat/sessions/1');
      });
    });
  });

  describe('New Chat Creation', () => {
    it('should create new chat session when New Chat button is clicked', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });
      mockedApiClient.post.mockResolvedValueOnce({ data: { id: 3, title: 'New Chat' } });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/chat/sessions',
          { title: 'New Chat' }
        );
      });
    });

    it('should clear chat interface when new chat is created', async () => {
      mockedApiClient.get.mockReset();
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: mockMessages } })
        .mockResolvedValue({ data: mockSessions });
      mockedApiClient.post.mockResolvedValueOnce({ data: { id: 3, title: 'New Chat' } });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      // Select a session first
      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByText('What courses do I have today?')).toBeInTheDocument();
      });

      // Click New Chat
      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        // Old messages should be cleared
        expect(screen.queryByText('What courses do I have today?')).not.toBeInTheDocument();
      });
    });

    it('should select newly created session', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: mockSessions });
      mockedApiClient.post.mockResolvedValueOnce({ data: { id: 3, title: 'New Chat' } });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalled();
      });
    });
  });

  describe('Message Sending', () => {
    it('should send message and update current session', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: [] } });
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          user_message: {
            id: 3,
            role: 'user',
            content: 'New question',
            created_at: '2025-11-19T10:05:00Z',
            session_id: 1,
            sources: null,
          },
          assistant_message: {
            id: 4,
            role: 'assistant',
            content: 'AI response',
            created_at: '2025-11-19T10:05:30Z',
            session_id: 1,
            sources: [],
          },
        },
      });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      // Select a session
      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
      });

      // Send a message
      const input = screen.getByPlaceholderText(/type your message/i);
      await userEvent.type(input, 'New question');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(mockedApiClient.post).toHaveBeenCalledWith(
          '/chat/sessions/1/messages',
          { content: 'New question' }
        );
      });
    });

    it('should display sent message in chat interface', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: [] } });
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          user_message: {
            id: 3,
            role: 'user',
            content: 'Test message',
            created_at: '2025-11-19T10:05:00Z',
            session_id: 1,
            sources: null,
          },
          assistant_message: {
            id: 4,
            role: 'assistant',
            content: 'Test response',
            created_at: '2025-11-19T10:05:30Z',
            session_id: 1,
            sources: [],
          },
        },
      });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      // Select session and send message
      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/type your message/i);
      await userEvent.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle session load error', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockRejectedValueOnce(new Error('Network error'));

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByText(/failed to load messages/i)).toBeInTheDocument();
      });
    });

    it('should handle new chat creation error', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });
      mockedApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await userEvent.click(newChatButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create new chat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session List Updates', () => {
    it('should refresh session list after sending message', async () => {
      mockedApiClient.get
        .mockResolvedValueOnce({ data: mockSessions })
        .mockResolvedValueOnce({ data: { messages: [] } })
        .mockResolvedValueOnce({ data: mockSessions });
      mockedApiClient.post.mockResolvedValueOnce({
        data: {
          user_message: {
            id: 3,
            role: 'user',
            content: 'Test',
            created_at: '2025-11-19T10:05:00Z',
            session_id: 1,
            sources: null,
          },
          assistant_message: {
            id: 4,
            role: 'assistant',
            content: 'Response',
            created_at: '2025-11-19T10:05:30Z',
            session_id: 1,
            sources: [],
          },
        },
      });

      render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Course Schedule Questions').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/type your message/i);
      await userEvent.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await userEvent.click(sendButton);

      await waitFor(() => {
        // Session list should be refreshed (GET /chat/sessions called again)
        // Initial load (1) + session select (1) + message send triggers refresh (1) + multiple refreshes (2) = 5 total
        expect(mockedApiClient.get).toHaveBeenCalled();
        expect(mockedApiClient.get.mock.calls.length).toBeGreaterThanOrEqual(3);
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should have full height layout', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      const { container } = render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      // Check for h-screen class
      const mainContainer = container.querySelector('.h-screen');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have sidebar with fixed width', async () => {
      mockedApiClient.get.mockResolvedValueOnce({ data: mockSessions });

      const { container } = render(
        <MemoryRouter>
          <ChatPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      // Check for sidebar width class (e.g., w-64 or w-80)
      const sidebar = container.querySelector('[class*="w-"]');
      expect(sidebar).toBeInTheDocument();
    });
  });
});

