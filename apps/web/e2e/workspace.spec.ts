import { test, expect } from '@playwright/test';

test.describe('Developer Workspace & Intelligence Tools', () => {
  test('should render 3-pane IDE workspace layout', async ({ page }) => {
    await page.goto('/workspace');

    // Header brand logo & title
    await expect(page.locator('text=DevLens')).toBeVisible();

    // Editor tab & sample file
    await expect(page.locator('text=jwt.service.ts')).toBeVisible();

    // Toolbar action buttons
    await expect(page.locator('button[title*="Explain"]')).toBeVisible();
    await expect(page.locator('button[title*="Review"]')).toBeVisible();
    await expect(page.locator('button[title*="Tests"]')).toBeVisible();
    await expect(page.locator('button[title*="Commit"]')).toBeVisible();
    await expect(page.locator('button[title*="PR"]')).toBeVisible();
  });

  test('should open Code Review modal on button click', async ({ page }) => {
    await page.goto('/workspace');
    await page.click('button[title*="Review"]');
    await expect(page.locator('text=Automated Code Review & OWASP Scanner')).toBeVisible();
  });

  test('should open Unit Test Generator modal on button click', async ({ page }) => {
    await page.goto('/workspace');
    await page.click('button[title*="Tests"]');
    await expect(page.locator('text=Automated Unit Test Generator')).toBeVisible();
  });
});
