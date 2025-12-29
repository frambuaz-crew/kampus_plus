/**
 * Settings Page - Placeholder
 * TODO: Implement user settings and preferences
 */

import React from 'react';
import { MainLayout } from '../components/layout/MainLayout';

export const SettingsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600 mb-6">
            Settings page is under construction.
          </p>
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-800 font-medium mb-2">Coming Soon:</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Profile settings</li>
              <li>• Notification preferences</li>
              <li>• Privacy controls</li>
              <li>• Language selection</li>
              <li>• Account management</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

