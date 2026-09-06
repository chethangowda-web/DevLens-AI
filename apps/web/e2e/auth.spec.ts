import { test, expect } from '@playwright/test';

test.describe('Authentication & Dashboard Flow', () => {
  test('should render login page and validate input controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/DevLens AI/i);

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=/create an account/i');
    await expect(page).toHaveURL(/.*register/);
  });
});
