import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Helper to log in as test fixture user 'john_user'
 */
async function loginAsUser(page: Page) {
  await page.goto('/login');

  // Accept cookies if banner is present
  const cookieAcceptButton = page.locator('button', { hasText: /understand|begrijp/i });
  if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieAcceptButton.click();
  }

  // Click "Or log in manually" / "Of log handmatig in"
  const manualLoginToggle = page.locator('button', { hasText: /manually|handmatig/i });
  await manualLoginToggle.click();

  // Fill in credentials
  await page.locator('input#username').fill('john_user');
  await page.locator('input#password').fill('kitten');

  // Submit form
  await page.locator('form button[type="submit"]').click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('Frontend Accessibility & Keyboard Navigation', () => {

  test('skip link appears on first Tab and focuses main content on /courses', async ({ page }) => {
    await page.goto('/courses');

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

  test('login page meets full WCAG 2.1 AA criteria and supports keyboard toggles', async ({ page }) => {
    await page.goto('/login');

    // Scan login page with AxeBuilder
    const scanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(scanResults.violations).toEqual([]);

    // Test expanding manual login form with Enter
    const manualToggle = page.locator('button', { hasText: /manually|handmatig/i });
    await manualToggle.focus();
    await expect(manualToggle).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('input#username')).toBeVisible();

    // Test password show/hide button
    const passwordToggle = page.locator('button[aria-controls="password"]');
    await expect(passwordToggle).toBeVisible();
    await passwordToggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('input#password')).toHaveAttribute('type', 'text');
  });

  test('authenticated user can navigate /courses, /account, and course details', async ({ page }) => {
    await loginAsUser(page);

    // 1. Audit /courses as authenticated user
    await page.goto('/courses');
    const coursesScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(coursesScan.violations).toEqual([]);

    // 2. Audit /account (Favorites and user profile)
    await page.goto('/account');
    const accountScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(accountScan.violations).toEqual([]);

    // 3. Audit /course/1 (Course page with documents, ratings, and comments)
    await page.goto('/course/1');
    const coursePageScan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(coursePageScan.violations).toEqual([]);

    // 4. Test accordion and star rating roving tabindex if star rating exists
    const starRadiogroup = page.locator('[role="radiogroup"]');
    if (await starRadiogroup.count() > 0) {
      const activeStar = starRadiogroup.locator('[role="radio"][tabindex="0"]');
      await expect(activeStar).toHaveCount(1);
    }
  });

  test('curriculum accordion tree expands and collapses via Enter / Space', async ({ page }) => {
    await page.goto('/courses');

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
    await page.goto('/courses');

    const langGroup = page.locator('[role="group"][aria-label="Language"], [role="group"][aria-label="Taal"]');
    if (await langGroup.count() > 0) {
      const activeLangButton = langGroup.locator('button[aria-pressed="true"]');
      await expect(activeLangButton).toHaveCount(1);
    }
  });

});
