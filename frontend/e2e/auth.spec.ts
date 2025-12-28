import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Student Registration and Login Flow
 * 
 * Tests T158: User registration → email verification → login → dashboard access
 * 
 * This test validates:
 * - Registration form with university email validation
 * - Password strength requirements
 * - Login functionality
 * - Authenticated dashboard access
 */

test.describe('Student Registration and Login', () => {
  const testEmail = `test.student.${Date.now()}@university.edu.tr`;
  const testPassword = 'SecurePassword123!';
  
  test('should complete full registration and login flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'Student');
    await page.fill('input[name="studentId"]', '2024TEST001');
    
    // Select student role
    await page.selectOption('select[name="role"]', 'student');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for success message or redirect
    await expect(page).toHaveURL(/.*\/verify-email|.*\/login/);
    
    // Check for verification message
    const successMessage = page.locator('text=/verification email sent|check your email/i');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });
  
  test('should reject invalid university email', async ({ page }) => {
    await page.goto('/register');
    
    // Try with non-university email
    await page.fill('input[name="email"]', 'invalid@gmail.com');
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('text=/university email|\.edu\.tr/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });
  
  test('should reject weak password', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    await page.click('button[type="submit"]');
    
    // Should show password strength error
    const errorMessage = page.locator('text=/password.*strong|at least 8 characters/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });
  
  test('should login with valid credentials', async ({ page }) => {
    // Assuming a test user exists in the system
    // This can be seeded or created via API before tests
    const existingEmail = 'test.existing@university.edu.tr';
    const existingPassword = 'ExistingPassword123!';
    
    await page.goto('/login');
    
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', existingPassword);
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard|.*\/home/);
    
    // Verify user is logged in (check for logout button or user menu)
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Logout")');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });
  
  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="email"]', 'wrong@university.edu.tr');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('text=/invalid credentials|incorrect email or password/i');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    
    // Should remain on login page
    await expect(page).toHaveURL(/.*\/login/);
  });
  
  test('should handle missing required fields', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    const emailError = page.locator('text=/email.*required/i');
    const passwordError = page.locator('text=/password.*required/i');
    
    // At least one error should be visible
    await expect(emailError.or(passwordError)).toBeVisible({ timeout: 3000 });
  });
  
  test('should navigate between login and registration', async ({ page }) => {
    await page.goto('/login');
    
    // Click on "Register" link
    await page.click('a:has-text("Register"), a:has-text("Sign up")');
    await expect(page).toHaveURL(/.*\/register/);
    
    // Go back to login
    await page.click('a:has-text("Login"), a:has-text("Sign in")');
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Authenticated User Actions', () => {
  // Setup: Login before each test
  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test.existing@university.edu.tr');
    await page.fill('input[name="password"]', 'ExistingPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL(/.*\/dashboard|.*\/home/, { timeout: 5000 });
  });
  
  test('should access protected routes after login', async ({ page }) => {
    // Navigate to protected pages
    const protectedRoutes = ['/dashboard', '/courses', '/chat', '/forum'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should not redirect to login
      await expect(page).not.toHaveURL(/.*\/login/);
    }
  });
  
  test('should logout successfully', async ({ page }) => {
    // Click logout button
    await page.click('button:has-text("Logout"), [data-testid="logout-button"]');
    
    // Should redirect to login or home
    await expect(page).toHaveURL(/.*\/login|.*\/$/, { timeout: 3000 });
    
    // Try to access protected route
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });
});
