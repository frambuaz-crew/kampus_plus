// T094: Frontend tests for ThreadView component

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThreadView } from '../ThreadView';
import type { ThreadWithReplies } from '../../../types/forum';

describe('ThreadView', () => {
  const mockThreadData: ThreadWithReplies = {
    thread: {
      id: 'thread-1',
      thread_id: null,
      title: 'Test Thread Title',
      content: 'This is test thread content',
      anonymous_id: 'anon123456789',
      is_flagged: false,
      created_at: '2025-12-24T10:00:00Z',
    },
    replies: [
      {
        id: 'reply-1',
        thread_id: 'thread-1',
        title: null,
        content: 'This is a reply',
        anonymous_id: 'anon987654321',
        is_flagged: false,
        created_at: '2025-12-24T11:00:00Z',
      },
    ],
  };

  it('renders thread content with anonymous author', () => {
    const mockOnReply = vi.fn();
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
      />
    );

    // Check thread title and content are rendered
    expect(screen.getByText('Test Thread Title')).toBeInTheDocument();
    expect(screen.getByText('This is test thread content')).toBeInTheDocument();
    
    // Check anonymous ID is displayed (first 8 chars)
    expect(screen.getByText(/Anonymous anon1234/)).toBeInTheDocument();
  });

  it('renders replies with correct count', () => {
    const mockOnReply = vi.fn();
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
      />
    );

    // Check reply is rendered
    expect(screen.getByText('This is a reply')).toBeInTheDocument();
    expect(screen.getByText('1 Reply')).toBeInTheDocument();
  });

  it('shows reply form when reply button clicked', async () => {
    const mockOnReply = vi.fn();
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
      />
    );

    // Click reply button
    const replyButton = screen.getByTestId('show-reply-form');
    fireEvent.click(replyButton);

    // Reply form should appear
    await waitFor(() => {
      expect(screen.getByTestId('reply-form')).toBeInTheDocument();
    });
  });

  it('submits reply with content', async () => {
    const mockOnReply = vi.fn().mockResolvedValue(undefined);
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
      />
    );

    // Show reply form
    fireEvent.click(screen.getByTestId('show-reply-form'));

    // Fill in reply content
    const textarea = screen.getByTestId('reply-content-input');
    fireEvent.change(textarea, { target: { value: 'My test reply' } });

    // Submit reply
    const submitButton = screen.getByTestId('submit-reply-button');
    fireEvent.click(submitButton);

    // Verify callback was called with correct content
    await waitFor(() => {
      expect(mockOnReply).toHaveBeenCalledWith('My test reply');
    });
  });

  it('calls onFlagPost when flag button clicked', () => {
    const mockOnReply = vi.fn();
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
      />
    );

    // Click flag button on thread
    const flagButtons = screen.getAllByTestId('flag-button');
    fireEvent.click(flagButtons[0]);

    expect(mockOnFlag).toHaveBeenCalledWith('thread-1');
  });

  it('displays loading state', () => {
    const mockOnReply = vi.fn();
    const mockOnFlag = vi.fn();

    render(
      <ThreadView
        threadData={mockThreadData}
        onReplySubmit={mockOnReply}
        onFlagPost={mockOnFlag}
        loading={true}
      />
    );

    // Should show loading skeleton
    expect(screen.queryByText('Test Thread Title')).not.toBeInTheDocument();
  });
});

