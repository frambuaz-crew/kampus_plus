/**
 * Test setup file for Vitest + React Testing Library.
 * 
 * This file is automatically loaded before each test file.
 * It configures:
 * - @testing-library/jest-dom custom matchers
 * - Global test utilities
 * - Mock configurations
 */

import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock scrollIntoView (not available in jsdom)
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Suppress console errors/warnings in tests (optional)
// Uncomment if tests become too noisy:
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// }
