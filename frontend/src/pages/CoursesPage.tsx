/**
 * Courses Page - Placeholder
 * TODO: Implement course listing and details
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const CoursesPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Courses</h1>
          <p className="text-gray-600 mb-6">
            Course listing page is under construction.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 font-medium mb-2">Coming Soon:</p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• View all enrolled courses</li>
              <li>• Course details and materials</li>
              <li>• Assignment submissions</li>
              <li>• Grade tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

