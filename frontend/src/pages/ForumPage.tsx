/**
 * ForumPage Component - T109
 * 
 * Full forum interface with thread list, search, create button, and thread view.
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/config';
import { ThreadList } from '../components/forum/ThreadList';
import { ThreadView } from '../components/forum/ThreadView';
import { NewThreadForm } from '../components/forum/NewThreadForm';
import { SearchBar } from '../components/forum/SearchBar';
import { Header } from '../components/layout/Header';
import type { ThreadListItem, ThreadWithReplies, SearchResult } from '../types/forum';

export const ForumPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'thread' | 'new' | 'search'>('list');
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadWithReplies | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadThreads();
  }, [page]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/threads?page=${page}&page_size=20`);
      setThreads(response.data.items);
      setHasMore(response.data.items.length === 20);
    } catch (err) {
      console.error('Failed to load threads:', err);
      setError('Failed to load threads');
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/threads/${threadId}`);
      setCurrentThread(response.data);
      setView('thread');
    } catch (err) {
      console.error('Failed to load thread:', err);
      setError('Failed to load thread');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (title: string | null, content: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.post('/forum/threads', { title, content });
      setView('list');
      setPage(1);
      await loadThreads();
    } catch (err) {
      console.error('Failed to create thread:', err);
      throw new Error('Failed to create thread');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (content: string) => {
    if (!currentThread) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await apiClient.post(`/forum/threads/${currentThread.thread.id}/replies`, { content });
      // Reload thread to show new reply
      await loadThread(currentThread.thread.id);
    } catch (err) {
      console.error('Failed to post reply:', err);
      throw new Error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagPost = async (postId: string) => {
    try {
      await apiClient.post(`/forum/posts/${postId}/flag`);
      // Reload current thread if viewing one
      if (currentThread) {
        await loadThread(currentThread.thread.id);
      }
    } catch (err) {
      console.error('Failed to flag post:', err);
      setError('Failed to flag post');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query) {
      setView('list');
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.results);
      setView('search');
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    const threadId = result.thread_id || result.id;
    loadThread(threadId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              💬 Anonymous Forum
            </h1>
            {view !== 'list' && (
              <button
                onClick={() => {
                  setView('list');
                  setCurrentThread(null);
                  setSearchResults([]);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Back to threads
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <SearchBar onSearch={handleSearch} disabled={loading} />
          </div>

          {/* New Thread Button */}
          {view === 'list' && (
            <button
              onClick={() => setView('new')}
              className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ✨ Start New Thread
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        {view === 'list' && (
          <div>
            <ThreadList
              threads={threads}
              onThreadClick={loadThread}
              loading={loading}
            />
            {hasMore && !loading && (
              <button
                onClick={() => setPage(page + 1)}
                className="mt-4 w-full py-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Load more threads
              </button>
            )}
          </div>
        )}

        {view === 'new' && (
          <NewThreadForm
            onSubmit={handleCreateThread}
            onCancel={() => setView('list')}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'thread' && currentThread && (
          <ThreadView
            threadData={currentThread}
            onReplySubmit={handleReplySubmit}
            onFlagPost={handleFlagPost}
            loading={loading}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'search' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500">No results found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 text-left"
                  >
                    {result.title && (
                      <h3 className="font-semibold text-gray-900 mb-2">{result.title}</h3>
                    )}
                    <p className="text-gray-700 line-clamp-2">{result.content}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>Anonymous {result.anonymous_id.slice(0, 8)}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(result.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
