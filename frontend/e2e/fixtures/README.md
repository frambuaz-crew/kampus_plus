# E2E Test Fixtures

This directory contains test fixtures for Playwright E2E tests.

## Files

- `test-document.pdf` - Sample PDF document for upload tests
  - Contains basic text about machine learning concepts
  - Used in chat.spec.ts for document upload testing

## Usage

Fixtures are loaded using Node.js `path.join(__dirname, 'fixtures', 'filename')` in test files.

## Creating Test Fixtures

When adding new fixtures:
1. Keep files small (< 1MB)
2. Use realistic but safe content
3. Document the fixture purpose here
4. Commit fixtures to version control for test consistency
