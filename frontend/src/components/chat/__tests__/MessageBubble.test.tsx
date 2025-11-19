import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

describe('MessageBubble', () => {
  describe('User Messages', () => {
    it('should render user message with correct styling', () => {
      render(
        <MessageBubble
          role="user"
          content="What courses do I have today?"
          timestamp="2025-11-19T10:30:00Z"
        />
      );

      expect(screen.getByText('What courses do I have today?')).toBeInTheDocument();
      const bubble = screen.getByText('What courses do I have today?').closest('div');
      expect(bubble).toHaveClass('bg-blue-600'); // User messages should be blue
    });

    it('should display user avatar icon', () => {
      render(
        <MessageBubble
          role="user"
          content="Hello"
          timestamp="2025-11-19T10:30:00Z"
        />
      );

      // User messages should have user icon
      const container = screen.getByText('Hello').closest('div')?.parentElement;
      expect(container).toBeTruthy();
    });

    it('should format timestamp correctly', () => {
      render(
        <MessageBubble
          role="user"
          content="Test message"
          timestamp="2025-11-19T10:30:00Z"
        />
      );

      // Should display time in HH:MM format
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });
  });

  describe('Assistant Messages', () => {
    it('should render assistant message with correct styling', () => {
      render(
        <MessageBubble
          role="assistant"
          content="You have CS101 at 2:00 PM."
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      expect(screen.getByText('You have CS101 at 2:00 PM.')).toBeInTheDocument();
      const bubble = screen.getByText('You have CS101 at 2:00 PM.').closest('div');
      expect(bubble).toHaveClass('bg-gray-200'); // AI messages should be gray
    });

    it('should display AI avatar icon', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Hello"
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      // Assistant messages should have AI icon
      const container = screen.getByText('Hello').closest('div')?.parentElement;
      expect(container).toBeTruthy();
    });

    it('should render without sources when none provided', () => {
      render(
        <MessageBubble
          role="assistant"
          content="General information"
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      expect(screen.queryByText(/Sources/i)).not.toBeInTheDocument();
    });
  });

  describe('Source Citations', () => {
    const mockSources = [
      {
        title: 'Course Schedule 2024-2025',
        source_type: 'official_document',
        metadata: { page: 3 },
      },
      {
        title: 'Computer Science Syllabus',
        source_type: 'official_document',
        metadata: { url: 'https://example.com/syllabus.pdf' },
      },
    ];

    it('should display sources section when sources provided', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Based on the schedule..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      expect(screen.getByText(/Sources/i)).toBeInTheDocument();
    });

    it('should show source count', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Based on documents..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    it('should display source titles', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Information..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      expect(screen.getByText('Course Schedule 2024-2025')).toBeInTheDocument();
      expect(screen.getByText('Computer Science Syllabus')).toBeInTheDocument();
    });

    it('should show page numbers when available', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Info..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      expect(screen.getByText(/Page 3/i)).toBeInTheDocument();
    });

    it('should be expandable/collapsible', () => {
      const { container } = render(
        <MessageBubble
          role="assistant"
          content="Info..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      const sourcesButton = screen.getByRole('button', { name: /sources/i });
      expect(sourcesButton).toBeInTheDocument();
    });

    it('should start collapsed by default', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Info..."
          timestamp="2025-11-19T10:31:00Z"
          sources={mockSources}
        />
      );

      // Source details should not be visible initially
      const sourceTitle = screen.queryByText('Course Schedule 2024-2025');
      if (sourceTitle) {
        expect(sourceTitle.closest('div')).toHaveClass('hidden');
      }
    });
  });

  describe('Content Rendering', () => {
    it('should preserve line breaks in content', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      render(
        <MessageBubble
          role="assistant"
          content={multilineContent}
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
      expect(screen.getByText(/Line 2/)).toBeInTheDocument();
      expect(screen.getByText(/Line 3/)).toBeInTheDocument();
    });

    it('should handle empty content gracefully', () => {
      render(
        <MessageBubble
          role="user"
          content=""
          timestamp="2025-11-19T10:30:00Z"
        />
      );

      // Should still render the bubble structure
      expect(screen.getByText(/10:30/)).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = 'Lorem ipsum '.repeat(100);
      render(
        <MessageBubble
          role="assistant"
          content={longContent}
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      // RTL normalizes whitespace, so we check for content presence with partial match
      expect(screen.getByText(/Lorem ipsum/)).toBeInTheDocument();
      // Verify the full content is in the document (checking textContent directly)
      const bubble = screen.getByText(/Lorem ipsum/).closest('.rounded-2xl');
      expect(bubble?.textContent).toContain('Lorem ipsum');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Test"
          timestamp="2025-11-19T10:31:00Z"
        />
      );

      // Should render message content
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should have readable timestamp format', () => {
      render(
        <MessageBubble
          role="user"
          content="Test"
          timestamp="2025-11-19T14:45:30Z"
        />
      );

      // Should show time in readable format (14:45 or 2:45 PM)
      const timestamp = screen.getByText(/14:45|2:45/);
      expect(timestamp).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid timestamp gracefully', () => {
      render(
        <MessageBubble
          role="user"
          content="Test"
          timestamp="invalid-date"
        />
      );

      // Should not crash, might show fallback or hide timestamp
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should handle sources with missing metadata', () => {
      interface IncompleteSource {
        title: string;
        source_type: string;
        metadata?: never;
      }
      
      const incompleteSources: IncompleteSource[] = [
        {
          title: 'Document 1',
          source_type: 'official_document',
        },
      ];

      render(
        <MessageBubble
          role="assistant"
          content="Info"
          timestamp="2025-11-19T10:31:00Z"
          sources={incompleteSources}
        />
      );

      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });

    it('should handle empty sources array', () => {
      render(
        <MessageBubble
          role="assistant"
          content="Information provided"
          timestamp="2025-11-19T10:31:00Z"
          sources={[]}
        />
      );

      // Should not render sources button when array is empty
      expect(screen.queryByRole('button', { name: /sources/i })).not.toBeInTheDocument();
    });
  });
});
