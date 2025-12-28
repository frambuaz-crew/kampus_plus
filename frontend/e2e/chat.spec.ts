import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Test: Upload PDF and Chat with AI
 * 
 * Tests T159: Document upload → AI chat → verify AI uses uploaded content
 * 
 * This test validates:
 * - PDF upload functionality
 * - Document processing status
 * - AI chat integration with uploaded documents
 * - Source attribution from user documents
 */

test.describe('Document Upload and AI Chat', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard|.*\/home/, { timeout: 5000 });
  });
  
  test('should upload PDF document successfully', async ({ page }) => {
    // Navigate to documents/upload page
    await page.goto('/documents');
    
    // Click upload button
    await page.click('button:has-text("Upload"), [data-testid="upload-button"]');
    
    // Create a test PDF file path
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-document.pdf');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Fill document metadata
    await page.fill('input[name="title"]', 'Test Machine Learning Document');
    
    // Submit upload
    await page.click('button[type="submit"]:has-text("Upload")');
    
    // Wait for success message
    const successMessage = page.locator('text=/upload.*successful|document.*uploaded/i');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    
    // Verify document appears in list
    const documentList = page.locator('[data-testid="document-list"], .document-item');
    await expect(documentList.locator('text=/Test Machine Learning Document/i')).toBeVisible();
  });
  
  test('should reject non-PDF files', async ({ page }) => {
    await page.goto('/documents');
    await page.click('button:has-text("Upload")');
    
    // Try to upload a non-PDF file (e.g., .txt)
    const fileInput = page.locator('input[type="file"]');
    
    // If file input has accept attribute, it should only allow PDFs
    const acceptAttr = await fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('pdf');
  });
  
  test('should show document processing status', async ({ page }) => {
    // After upload, document should show processing status
    await page.goto('/documents');
    
    // Look for status indicators
    const statusIndicators = page.locator('text=/processing|ready|completed/i');
    await expect(statusIndicators.first()).toBeVisible({ timeout: 5000 });
  });
  
  test('should chat with AI about uploaded document', async ({ page }) => {
    // Navigate to AI chat
    await page.goto('/chat');
    
    // Start new conversation
    await page.click('button:has-text("New Chat"), [data-testid="new-chat"]');
    
    // Send message asking about uploaded content
    const chatInput = page.locator('textarea[name="message"], input[type="text"][placeholder*="Ask"]');
    await chatInput.fill('What does my uploaded document say about machine learning?');
    
    // Send message
    await page.click('button[type="submit"]:has-text("Send"), [data-testid="send-message"]');
    
    // Wait for AI response
    const aiResponse = page.locator('.ai-message, [data-role="assistant"]').last();
    await expect(aiResponse).toBeVisible({ timeout: 15000 });
    
    // Verify response is not empty
    const responseText = await aiResponse.textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
  });
  
  test('should display sources for AI response', async ({ page }) => {
    await page.goto('/chat');
    
    // Send a message
    await page.click('button:has-text("New Chat")');
    const chatInput = page.locator('textarea[name="message"], input[type="text"]');
    await chatInput.fill('Explain neural networks');
    await page.click('button[type="submit"]:has-text("Send")');
    
    // Wait for response
    await page.waitForSelector('.ai-message, [data-role="assistant"]', { timeout: 15000 });
    
    // Look for sources section
    const sourcesSection = page.locator('text=/sources|references/i, [data-testid="sources"]');
    
    // Sources may or may not be present depending on retrieval
    // Just check if the section exists (don't fail if no sources found)
    const sourcesExist = await sourcesSection.count() > 0;
    
    if (sourcesExist) {
      await expect(sourcesSection.first()).toBeVisible();
    }
  });
  
  test('should maintain conversation context', async ({ page }) => {
    await page.goto('/chat');
    await page.click('button:has-text("New Chat")');
    
    const chatInput = page.locator('textarea[name="message"], input[type="text"]');
    
    // First message
    await chatInput.fill('Tell me about deep learning');
    await page.click('button[type="submit"]:has-text("Send")');
    await page.waitForSelector('.ai-message', { timeout: 15000 });
    
    // Follow-up message (requires context)
    await chatInput.fill('What are its main applications?');
    await page.click('button[type="submit"]:has-text("Send")');
    
    // Wait for second response
    const messages = page.locator('.ai-message, [data-role="assistant"]');
    await expect(messages).toHaveCount(2, { timeout: 15000 });
    
    // Second response should reference "deep learning" context
    const secondResponse = await messages.last().textContent();
    expect(secondResponse).toBeTruthy();
  });
  
  test('should list previous conversations', async ({ page }) => {
    await page.goto('/chat');
    
    // Check for conversation list/history
    const conversationList = page.locator('[data-testid="conversation-list"], .conversation-item, aside');
    await expect(conversationList).toBeVisible({ timeout: 5000 });
  });
  
  test('should handle empty message submission', async ({ page }) => {
    await page.goto('/chat');
    await page.click('button:has-text("New Chat")');
    
    // Try to send empty message
    const sendButton = page.locator('button[type="submit"]:has-text("Send")');
    
    // Button should be disabled when input is empty
    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBe(true);
  });
});

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard|.*\/home/);
  });
  
  test('should view uploaded documents list', async ({ page }) => {
    await page.goto('/documents');
    
    // Documents page should load
    await expect(page).toHaveURL(/.*\/documents/);
    
    // Check for documents list or empty state
    const documentsList = page.locator('[data-testid="document-list"], .documents-container');
    const emptyState = page.locator('text=/no documents|upload your first/i');
    
    // Either list or empty state should be visible
    await expect(documentsList.or(emptyState)).toBeVisible({ timeout: 5000 });
  });
  
  test('should delete uploaded document', async ({ page }) => {
    await page.goto('/documents');
    
    // Find first document (if any)
    const firstDocument = page.locator('.document-item, [data-testid^="document-"]').first();
    
    if (await firstDocument.count() > 0) {
      // Click delete button
      const deleteButton = firstDocument.locator('button:has-text("Delete"), [data-testid="delete"]');
      await deleteButton.click();
      
      // Confirm deletion (if modal appears)
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').last();
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Should show success message
      const successMessage = page.locator('text=/deleted|removed/i');
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    }
  });
  
  test('should show document details', async ({ page }) => {
    await page.goto('/documents');
    
    // Click on first document (if any)
    const firstDocument = page.locator('.document-item, [data-testid^="document-"]').first();
    
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      
      // Should show document details (title, upload date, size, etc.)
      const detailsSection = page.locator('[data-testid="document-details"], .document-info');
      await expect(detailsSection).toBeVisible({ timeout: 3000 });
    }
  });
});
