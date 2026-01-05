/**
 * Landing Footer Component
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Public landing page footer:
 * - Copyright bilgisi
 * - Center aligned
 * - Minimal tasarım
 */

import React from 'react';

export const LandingFooter: React.FC = () => {
  return (
    <footer 
      className="bg-gray-50 border-t border-gray-200 py-6"
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-gray-600">
          © 2025 KAMPÜS+ - Tüm hakları saklıdır
        </p>
      </div>
    </footer>
  );
};

