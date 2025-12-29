/**
 * Statistics Page - Placeholder
 * TODO: Implement user statistics and analytics
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const StatisticsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Statistics</h1>
          <p className="text-gray-600 mb-6">
            Statistics and analytics page is under construction.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left">
            <p className="text-sm text-purple-800 font-medium mb-2">Coming Soon:</p>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Study time tracking</li>
              <li>• AI usage statistics</li>
              <li>• Document upload history</li>
              <li>• Forum activity</li>
              <li>• Performance insights</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

