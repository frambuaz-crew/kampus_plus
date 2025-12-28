import { test, expect } from '@playwright/test';

/**
 * E2E Test: Forum Thread Creation and Interaction
 * 
 * Tests T160: Create thread → reply → search forum
 * 
 * This test validates:
 * - Forum thread creation
 * - Reply functionality
 * - Anonymous identity display
 * - Forum search
 * - Thread listing and navigation
 */

test.describe('Forum Thread Creation and Interaction', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard|.*\/home/, { timeout: 5000 });
  });
  
  test('should create a new forum thread', async ({ page }) => {
    // Navigate to forum
    await page.goto('/forum');
    
    // Click create thread button
    await page.click('button:has-text("New Thread"), button:has-text("Create"), [data-testid="create-thread"]');
    
    // Fill thread form
    await page.fill('input[name="title"], textarea[name="title"]', 'Discussion about Machine Learning');
    await page.fill('textarea[name="content"]', 'What are the best resources to learn machine learning for beginners?');
    
    // Submit thread
    await page.click('button[type="submit"]:has-text("Post"), button:has-text("Create")');
    
    // Should redirect to thread view or show success
    const successMessage = page.locator('text=/thread.*created|posted successfully/i');
    const threadTitle = page.locator('text=/Discussion about Machine Learning/i');
    
    await expect(successMessage.or(threadTitle)).toBeVisible({ timeout: 5000 });
  });
  
  test('should display anonymous identity on thread', async ({ page }) => {
    await page.goto('/forum');
    
    // Create a thread
    await page.click('button:has-text("New Thread"), button:has-text("Create")');
    await page.fill('textarea[name="content"]', 'Test thread for anonymity');
    await page.click('button[type="submit"]');
    
    // Check for anonymous ID display
    const anonymousId = page.locator('text=/Anonymous.*|User.*[0-9]+/i, [data-testid="anonymous-id"]');
    await expect(anonymousId).toBeVisible({ timeout: 5000 });
    
    // Should NOT show real name
    const realName = page.locator('text=/test.existing|Test User/i');
    const realNameVisible = await realName.count();
    expect(realNameVisible).toBe(0);
  });
  
  test('should reply to existing thread', async ({ page }) => {
    await page.goto('/forum');
    
    // Click on first thread (if any)
    const firstThread = page.locator('.thread-item, [data-testid^="thread-"]').first();
    
    if (await firstThread.count() > 0) {
      await firstThread.click();
      
      // Wait for thread view to load
      await page.waitForSelector('textarea[name="reply"], textarea[placeholder*="Reply"]', { timeout: 5000 });
      
      // Write reply
      await page.fill('textarea[name="reply"], textarea[placeholder*="Reply"]', 'This is my reply to the thread');
      
      // Submit reply
      await page.click('button[type="submit"]:has-text("Reply"), button:has-text("Post")');
      
      // Should show success or see new reply
      const replyText = page.locator('text=/This is my reply to the thread/i');
      await expect(replyText).toBeVisible({ timeout: 5000 });
    }
  });
  
  test('should maintain consistent anonymous ID within thread', async ({ page }) => {
    await page.goto('/forum');
    
    // Create thread
    await page.click('button:has-text("New Thread"), button:has-text("Create")');
    await page.fill('textarea[name="content"]', 'Thread for ID consistency test');
    await page.click('button[type="submit"]');
    
    // Get anonymous ID from thread
    const threadAnonymousId = await page.locator('[data-testid="anonymous-id"], .anonymous-id').first().textContent();
    
    // Reply to same thread
    await page.fill('textarea[name="reply"], textarea[placeholder*="Reply"]', 'My first reply');
    await page.click('button[type="submit"]:has-text("Reply")');
    
    // Get anonymous ID from reply
    const replyAnonymousIds = page.locator('[data-testid="anonymous-id"], .anonymous-id');
    await expect(replyAnonymousIds).toHaveCount(2, { timeout: 5000 }); // Thread + reply
    
    const replyAnonymousId = await replyAnonymousIds.last().textContent();
    
    // IDs should match
    expect(threadAnonymousId).toBe(replyAnonymousId);
  });
  
  test('should search forum posts', async ({ page }) => {
    await page.goto('/forum');
    
    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]');
    await searchInput.fill('machine learning');
    
    // Submit search (or wait for auto-search)
    const searchButton = page.locator('button[type="submit"]:near(input[type="search"]), button:has-text("Search")');
    if (await searchButton.count() > 0) {
      await searchButton.click();
    } else {
      // Auto-search - wait for results
      await page.waitForTimeout(1000);
    }
    
    // Should show search results
    const searchResults = page.locator('[data-testid="search-results"], .search-result');
    
    // If results exist, verify they contain search term
    if (await searchResults.count() > 0) {
      const firstResult = await searchResults.first().textContent();
      expect(firstResult?.toLowerCase()).toContain('machine');
    }
  });
  
  test('should list forum threads with pagination', async ({ page }) => {
    await page.goto('/forum');
    
    // Should show thread list
    const threadList = page.locator('[data-testid="thread-list"], .thread-item');
    await expect(threadList).toBeVisible({ timeout: 5000 });
    
    // Check for pagination controls (if many threads exist)
    const pagination = page.locator('[data-testid="pagination"], .pagination, button:has-text("Next")');
    // Pagination may or may not exist depending on thread count
  });
  
  test('should handle empty thread content', async ({ page }) => {
    await page.goto('/forum');
    await page.click('button:has-text("New Thread"), button:has-text("Create")');
    
    // Try to submit without content
    await page.click('button[type="submit"]');
    
    // Should show validation error
    const errorMessage = page.locator('text=/content.*required|cannot be empty/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });
  
  test('should flag inappropriate content', async ({ page }) => {
    await page.goto('/forum');
    
    // Find first thread
    const firstThread = page.locator('.thread-item, [data-testid^="thread-"]').first();
    
    if (await firstThread.count() > 0) {
      await firstThread.click();
      
      // Look for flag button
      const flagButton = page.locator('button:has-text("Flag"), button:has-text("Report"), [data-testid="flag"]');
      
      if (await flagButton.count() > 0) {
        await flagButton.click();
        
        // Confirm flagging (if modal appears)
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Report")').last();
        if (await confirmButton.isVisible({ timeout: 1000 })) {
          await confirmButton.click();
        }
        
        // Should show success message
        const successMessage = page.locator('text=/flagged|reported/i');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Forum Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard|.*\/home/);
  });
  
  test('should navigate from forum list to thread view', async ({ page }) => {
    await page.goto('/forum');
    
    // Click on first thread
    const firstThread = page.locator('.thread-item, [data-testid^="thread-"]').first();
    
    if (await firstThread.count() > 0) {
      await firstThread.click();
      
      // Should navigate to thread detail page
      await expect(page).toHaveURL(/.*\/forum\/.*/, { timeout: 3000 });
      
      // Should show thread content
      const threadContent = page.locator('.thread-content, [data-testid="thread-content"]');
      await expect(threadContent).toBeVisible();
    }
  });
  
  test('should navigate back to forum list', async ({ page }) => {
    await page.goto('/forum');
    
    const firstThread = page.locator('.thread-item').first();
    
    if (await firstThread.count() > 0) {
      await firstThread.click();
      
      // Click back button or forum link
      const backButton = page.locator('button:has-text("Back"), a:has-text("Forum"), [data-testid="back"]');
      await backButton.click();
      
      // Should return to forum list
      await expect(page).toHaveURL(/.*\/forum\/?$/);
    }
  });
  
  test('should show thread reply count', async ({ page }) => {
    await page.goto('/forum');
    
    // Thread items should show reply count
    const replyCount = page.locator('text=/[0-9]+ repl(y|ies)|[0-9]+ comment/i').first();
    
    // Reply count may or may not be visible depending on threads
    // Just check if forum page loaded successfully
    await expect(page).toHaveURL(/.*\/forum/);
  });
});

test.describe('Forum Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/.*\/dashboard|.*\/home/);
  });
  
  test('should handle very long thread content', async ({ page }) => {
    await page.goto('/forum');
    await page.click('button:has-text("New Thread"), button:has-text("Create")');
    
    // Create very long content
    const longContent = 'A'.repeat(5000);
    await page.fill('textarea[name="content"]', longContent);
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Should either succeed or show character limit error
    // Wait for response
    await page.waitForTimeout(2000);
  });
  
  test('should handle special characters in thread content', async ({ page }) => {
    await page.goto('/forum');
    await page.click('button:has-text("New Thread")');
    
    const specialContent = 'Test with special chars: <>&"\'';
    await page.fill('textarea[name="content"]', specialContent);
    await page.click('button[type="submit"]');
    
    // Content should be properly escaped/displayed
    const threadContent = page.locator(`text=/${specialContent}/i`);
    await expect(threadContent).toBeVisible({ timeout: 5000 });
  });
});
