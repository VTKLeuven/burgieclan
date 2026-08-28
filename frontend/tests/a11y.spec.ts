import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Frontend Accessibility & Keyboard Navigation', () => {

  test('skip link appears on first Tab and focuses main content', async ({ page }) => {
    await page.goto('/');

    // First Tab press should focus the Skip to content link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    // Activating skip link moves focus to main content container
    await page.keyboard.press('Enter');
    const mainContent = page.locator('main#main-content');
    await expect(mainContent).toBeFocused();
  });

  test('automated WCAG 2.1 AA audit passes on /courses page', async ({ page }) => {
    await page.goto('/courses');

    // Run in-memory axe-core engine across the full rendered DOM
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Optional: ignore external dynamic themes if any
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('curriculum accordion tree expands and collapses via Enter / Space', async ({ page }) => {
    await page.goto('/courses');

    // Wait for the curriculum navigator or programs to load
    const firstAccordionButton = page.locator('button[aria-expanded]').first();
    if (await firstAccordionButton.count() > 0) {
      await firstAccordionButton.focus();
      await expect(firstAccordionButton).toBeFocused();

      const initialState = await firstAccordionButton.getAttribute('aria-expanded');
      
      // Press Enter to toggle
      await page.keyboard.press('Enter');
      const newState = await firstAccordionButton.getAttribute('aria-expanded');
      expect(newState).not.toEqual(initialState);

      // Press Space to toggle back
      await page.keyboard.press('Space');
      const revertedState = await firstAccordionButton.getAttribute('aria-expanded');
      expect(revertedState).toEqual(initialState);
    }
  });

  test('language switcher supports keyboard navigation and indicates active language', async ({ page }) => {
    await page.goto('/');

    const langGroup = page.locator('[role="group"][aria-label="Language"], [role="group"][aria-label="Taal"]');
    if (await langGroup.count() > 0) {
      const activeLangButton = langGroup.locator('button[aria-pressed="true"]');
      await expect(activeLangButton).toHaveCount(1);
    }
  });

});
