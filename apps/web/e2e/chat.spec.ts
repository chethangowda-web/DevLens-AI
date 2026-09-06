import { test, expect } from '@playwright/test';

test.describe('AI Chat Streaming & RAG Intelligence', () => {
  test('should render chat sidebar panel', async ({ page }) => {
    await page.goto('/workspace');

    // Chat input area should be present
    const chatInput = page.locator('textarea[placeholder*="Ask"]').or(
      page.locator('input[placeholder*="Ask"]')
    );
    await expect(chatInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow user to type a message in chat input', async ({ page }) => {
    await page.goto('/workspace');

    const chatInput = page
      .locator('textarea[placeholder*="Ask"]')
      .or(page.locator('input[placeholder*="Ask"]'));
    const input = chatInput.first();
    await expect(input).toBeVisible({ timeout: 10000 });

    await input.fill('How does the authentication middleware work?');
    await expect(input).toHaveValue('How does the authentication middleware work?');
  });

  test('should display DevLens brand on workspace page', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page.locator('text=DevLens')).toBeVisible({ timeout: 10000 });
  });

  test('should show intelligence toolbar buttons in workspace', async ({ page }) => {
    await page.goto('/workspace');

    // All intelligence tool buttons should be visible
    await expect(page.locator('button[title*="Explain"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[title*="Debug"]')).toBeVisible({ timeout: 10000 });
  });

  test('should open commit generator modal', async ({ page }) => {
    await page.goto('/workspace');

    const commitBtn = page.locator('button[title*="Commit"]');
    await expect(commitBtn).toBeVisible({ timeout: 10000 });
    await commitBtn.click();

    await expect(
      page.locator('text=Conventional Commit').or(page.locator('text=Commit Message'))
    ).toBeVisible({ timeout: 5000 });
  });
});
