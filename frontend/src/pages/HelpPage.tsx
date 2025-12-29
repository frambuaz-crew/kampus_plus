/**
 * Help & Support Page - Placeholder
 * TODO: Implement help documentation and support
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const HelpPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Help & Support</h1>
          <p className="text-gray-600 mb-6">
            Help center is under construction.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
            <p className="text-sm text-green-800 font-medium mb-2">Coming Soon:</p>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• User guides and tutorials</li>
              <li>• FAQ section</li>
              <li>• Contact support</li>
              <li>• Video tutorials</li>
              <li>• Community forum</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

