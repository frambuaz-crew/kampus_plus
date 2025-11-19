import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionList } from '../SessionList';
import axios from 'axios';
import type { Mock } from 'vitest';

vi.mock('axios');
const mockedAxios = axios as typeof axios & {
  get: Mock;
  post: Mock;
  delete: Mock;
};

describe('SessionList', () => {
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
    {
      id: 3,
      title: 'Assignment Help',
      created_at: '2025-11-17T09:00:00Z',
      updated_at: '2025-11-17T09:45:00Z',
      message_count: 8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session List Rendering', () => {
    it('should render session list with sessions', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });

      expect(screen.getByText('Syllabus Review')).toBeInTheDocument();
      expect(screen.getByText('Assignment Help')).toBeInTheDocument();
    });

    it('should display message count for each session', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/5 messages/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/3 messages/i)).toBeInTheDocument();
      expect(screen.getByText(/8 messages/i)).toBeInTheDocument();
    });

    it('should display relative timestamps', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        // Should show relative time like "Today", "Yesterday", or date (multiple sessions)
        const timestamps = screen.getAllByText(/today|yesterday|\d{1,2}\/\d{1,2}/i);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Session Selection', () => {
    it('should highlight currently selected session', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={1} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        const selectedSession = screen.getByText('Course Schedule Questions').closest('button');
        expect(selectedSession).toHaveClass('bg-blue-100');
      });
    });

    it('should call onSessionSelect when session is clicked', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });
      const onSessionSelect = vi.fn();

      render(<SessionList currentSessionId={null} onSessionSelect={onSessionSelect} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Syllabus Review')).toBeInTheDocument();
      });

      const sessionButton = screen.getByText('Syllabus Review').closest('button');
      if (sessionButton) {
        await userEvent.click(sessionButton);
      }

      expect(onSessionSelect).toHaveBeenCalledWith(2);
    });

    it('should not have selected styling when no session is active', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        const sessions = screen.getAllByRole('button');
        const sessionButtons = sessions.filter(btn => btn.textContent?.includes('messages'));
        sessionButtons.forEach(btn => {
          expect(btn).not.toHaveClass('bg-blue-100');
        });
      });
    });
  });

  describe('New Chat Button', () => {
    it('should render new chat button', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });
    });

    it('should call onNewChat when new chat button is clicked', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });
      const onNewChat = vi.fn();

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={onNewChat} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await userEvent.click(newChatButton);

      expect(onNewChat).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while fetching sessions', () => {
      mockedAxios.get.mockReturnValueOnce(new Promise(() => {})); // Never resolves

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should hide loading indicator after sessions are loaded', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no sessions exist', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/no chat history/i)).toBeInTheDocument();
      });
    });

    it('should show new chat button in empty state', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: [] });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('should retry fetching sessions when retry button is clicked', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await userEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Course Schedule Questions')).toBeInTheDocument();
      });
    });
  });

  describe('Session Sorting', () => {
    it('should display sessions sorted by updated_at (most recent first)', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        const sessionButtons = screen.getAllByRole('button');
        const sessionTitles = sessionButtons
          .map(btn => btn.textContent)
          .filter(text => text?.includes('Questions') || text?.includes('Review') || text?.includes('Help'));

        // First session should be "Course Schedule Questions" (most recent updated_at)
        expect(sessionTitles[0]).toContain('Course Schedule Questions');
      });
    });
  });

  describe('API Integration', () => {
    it('should call GET /chat/sessions endpoint', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/chat/sessions', expect.any(Object));
      });
    });

    it('should include auth token in request headers', async () => {
      const mockToken = 'test-token-123';
      localStorage.setItem('token', mockToken);
      mockedAxios.get.mockResolvedValueOnce({ data: mockSessions });

      render(<SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith(
          '/chat/sessions',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: `Bearer ${mockToken}`,
            }),
          })
        );
      });

      localStorage.removeItem('token');
    });
  });

  describe('Responsive Design', () => {
    it('should have scrollable container for long session lists', async () => {
      const manySessions = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Session ${i + 1}`,
        created_at: '2025-11-19T10:00:00Z',
        updated_at: '2025-11-19T10:30:00Z',
        message_count: 2,
      }));

      mockedAxios.get.mockResolvedValueOnce({ data: manySessions });

      const { container } = render(
        <SessionList currentSessionId={null} onSessionSelect={vi.fn()} onNewChat={vi.fn()} />
      );

      await waitFor(() => {
        expect(screen.getByText('Session 1')).toBeInTheDocument();
      });

      // Check for overflow-y-auto class for scrolling
      const scrollableContainer = container.querySelector('.overflow-y-auto');
      expect(scrollableContainer).toBeInTheDocument();
    });
  });
});
