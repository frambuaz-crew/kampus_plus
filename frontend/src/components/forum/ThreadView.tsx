/**
 * ThreadView Component - T105
 * 
 * Displays full thread with replies, nested reply structure, anonymous identities.
 * Includes ReplyForm for adding new replies.
 */

import React, { useState } from 'react';
import type { ThreadWithReplies, ForumPost } from '../../types/forum';
import { ReplyForm } from './ReplyForm';
import { formatDistanceToNow } from 'date-fns';

interface ThreadViewProps {
  threadData: ThreadWithReplies;
  onReplySubmit: (content: string) => Promise<void>;
  onFlagPost: (postId: string) => void;
  loading?: boolean;
  isSubmitting?: boolean;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ 
  threadData, 
  onReplySubmit, 
  onFlagPost,
  loading = false,
  isSubmitting = false
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  const { thread, replies } = threadData;

  const handleReplySubmit = async (content: string) => {
    await onReplySubmit(content);
    setShowReplyForm(false);
  };

  const PostCard: React.FC<{ post: ForumPost; isThread?: boolean }> = ({ post, isThread = false }) => (
    <div 
      className={`bg-white rounded-lg shadow p-6 ${isThread ? 'border-l-4 border-indigo-500' : ''}`}
      data-testid={isThread ? "thread-content" : "reply-content"}
    >
      {post.title && (
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{post.title}</h2>
      )}
      
      <div className="prose max-w-none mb-4">
        <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-3">
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
            Anonymous {post.anonymous_id.slice(0, 8)}
          </span>
          
          <span>•</span>
          
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
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </span>
        </div>

        <button
          onClick={() => onFlagPost(post.id)}
          className="flex items-center text-gray-400 hover:text-red-500 transition-colors"
          title="Flag this post"
          data-testid="flag-button"
        >
          <svg 
            className="w-4 h-4 mr-1" 
            fill={post.is_flagged ? "currentColor" : "none"}
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" 
            />
          </svg>
          {post.is_flagged && <span className="text-xs">Flagged</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Thread Post */}
      <PostCard post={thread} isThread />

      {/* Reply Button */}
      {!showReplyForm && (
        <button
          onClick={() => setShowReplyForm(true)}
          className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-3 px-4 rounded-lg transition-colors"
          data-testid="show-reply-form"
        >
          💬 Reply to this thread
        </button>
      )}

      {/* Reply Form */}
      {showReplyForm && (
        <div className="bg-indigo-50 rounded-lg p-4">
          <ReplyForm
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-3 pl-6 border-l-2 border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h3>
          {replies.map((reply) => (
            <PostCard key={reply.id} post={reply} />
          ))}
        </div>
      )}

      {/* No replies state */}
      {replies.length === 0 && !showReplyForm && (
        <div className="text-center py-8 text-gray-500">
          <p>No replies yet. Be the first to reply!</p>
        </div>
      )}
    </div>
  );
};
