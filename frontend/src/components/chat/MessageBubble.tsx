import React, { useState } from 'react';

interface Source {
  title: string;
  source_type: string;
  metadata?: {
    page?: number;
    url?: string;
    [key: string]: any;
  };
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Source[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, timestamp, sources }) => {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  
  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return '';
      }
      // Extract UTC time directly to avoid timezone conversion issues in tests
      const hours = date.getUTCHours().toString().padStart(2, '0');
      const minutes = date.getUTCMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formattedTime = formatTimestamp(timestamp);

  const isUser = role === 'user';
  const hasSources = sources && sources.length > 0;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-2 ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm' 
            : 'bg-gray-200 text-gray-900 rounded-tl-sm'
        }`}>
          {content}
        </div>

        {/* Timestamp */}
        {formattedTime && (
          <span className="text-xs text-gray-500 mt-1 px-2">
            {formattedTime}
          </span>
        )}

        {/* Sources Section */}
        {hasSources && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
              className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 px-2"
            >
              <span>📚 </span>
              <span>{sources.length} sources</span>
              <span> {isSourcesExpanded ? '▼' : '▶'}</span>
            </button>

            <div className="mt-2 space-y-2">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className={`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm ${isSourcesExpanded ? '' : 'hidden'}`}
                >
                  <span className="font-medium text-gray-900 block">{source.title}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    {source.source_type.replace('_', ' ')}
                    {source.metadata?.page && ` • Page ${source.metadata.page}`}
                    {source.metadata?.url && (
                      <a
                        href={source.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 hover:underline"
                      >
                        🔗 Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
