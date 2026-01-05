/**
 * Landing Page - Ana Sayfa
 * 
 * Spec: 001-landing-page/spec.md
 * 
 * Public ana sayfa - kimlik doğrulaması gerektirmez
 * 
 * Modüler yapı:
 * - LandingHeader: Header component
 * - HeroSection: Hero section component
 * - LandingFooter: Footer component
 */

import React from 'react';
import { LandingHeader, HeroSection, LandingFooter } from '../components/landing';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <HeroSection />
      <LandingFooter />
    </div>
  );
};

