/**
 * Temporary Chat Test Page - T066 Testing
 * Quick page to test ChatInterface component with backend
 */

import React, { useState, useEffect } from 'react';
import { ChatInterface } from '../components/chat/ChatInterface';
import { apiClient } from '../api/config';

export const ChatTestPage: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = async () => {
    try {
      setIsCreating(true);
      setError(null);
      const response = await apiClient.post('/chat/sessions', {
        title: 'Test Chat Session',
      });
      setSessionId(response.data.id);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create chat session. Make sure you are logged in.');
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    createSession();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={createSession}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isCreating || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Creating chat session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white px-6 py-4">
            <h1 className="text-2xl font-bold">KAMPÜS+ AI Assistant</h1>
            <p className="text-sm opacity-90">T066 Test - ChatInterface Component</p>
          </div>
          <div className="h-[600px]">
            <ChatInterface sessionId={Number(sessionId)} />
          </div>
        </div>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-800">
            <strong>Test Sayfası:</strong> Bu sayfa ChatInterface component'ini test etmek için oluşturuldu.
            Session ID: <code className="bg-yellow-100 px-2 py-1 rounded">{sessionId}</code>
          </p>
        </div>
      </div>
    </div>
  );
};
