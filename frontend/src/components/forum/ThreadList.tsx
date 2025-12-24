/**
 * ThreadList Component - T104
 * 
 * Displays forum threads in list/card format with:
 * - Anonymous author display
 * - Reply count
 * - Timestamps
 * - Click to view thread details
 */

import React from 'react';
import type { ThreadListItem } from '../../types/forum';
import { formatDistanceToNow } from 'date-fns';

interface ThreadListProps {
  threads: ThreadListItem[];
  onThreadClick: (threadId: string) => void;
  loading?: boolean;
}

export const ThreadList: React.FC<ThreadListProps> = ({ 
  threads, 
  onThreadClick, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-6xl mb-4">💬</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          No threads yet
        </h3>
        <p className="text-gray-500">
          Be the first to start a discussion!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onThreadClick(thread.id)}
          className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left"
          data-testid={`thread-${thread.id}`}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {thread.title || '(No title)'}
          </h3>
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <svg 
                  className="w-4 h-4 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
                {thread.anonymous_id.slice(0, 8)}...
              </span>
              
              <span className="flex items-center">
                <svg 
                  className="w-4 h-4 mr-1" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                  />
                </svg>
                {thread.reply_count} {thread.reply_count === 1 ? 'reply' : 'replies'}
              </span>
            </div>
            
            <span className="flex items-center">
              <svg 
                className="w-4 h-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              {formatDistanceToNow(new Date(thread.last_activity), { addSuffix: true })}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
