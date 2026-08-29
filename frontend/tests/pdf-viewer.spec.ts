import { test, expect } from '@playwright/test';

test.describe('PDF Viewer Test', () => {
  test('renders PDF, zooms in and out without layout collapse', async ({ page }) => {
    // 1. Log in
    await page.goto('/login');
    const cookieAcceptButton = page.locator('button', { hasText: /understand|begrijp/i });
    if (await cookieAcceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await cookieAcceptButton.click();
    }
    const manualLoginToggle = page.locator('button', { hasText: /manually|handmatig/i });
    await manualLoginToggle.click();
    await page.locator('input#username').fill('john_user');
    await page.locator('input#password').fill('kitten');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });

    // 2. Go to document 103
    await page.goto('/document/103');
    await page.waitForLoadState('networkidle');

    // 3. Wait for the PDF canvas to be rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });

    // 4. Check initial size
    const boxBefore = await canvas.boundingBox();
    expect(boxBefore).not.toBeNull();
    expect(boxBefore!.width).toBeGreaterThan(100);

    // 5. Test Zoom In
    const zoomInBtn = page.locator('button[aria-label*="zoom.in"], button[title*="Inzoomen"], button[title*="Zoom in"]').first();
    if (await zoomInBtn.isVisible()) {
      await zoomInBtn.click();
      await page.waitForTimeout(300);
      const boxZoomIn = await canvas.boundingBox();
      expect(boxZoomIn!.width).toBeGreaterThan(boxBefore!.width);
    }

    // 6. Test Zoom Out
    const zoomOutBtn = page.locator('button[aria-label*="zoom.out"], button[title*="Uitzoomen"], button[title*="Zoom out"]').first();
    if (await zoomOutBtn.isVisible()) {
      await zoomOutBtn.click();
      await zoomOutBtn.click();
      await page.waitForTimeout(300);
      const boxZoomOut = await canvas.boundingBox();
      expect(boxZoomOut!.width).toBeLessThan(boxBefore!.width);
    }

    // 7. Test Fit Width
    const fitWidthBtn = page.locator('button[aria-label*="Pagina"], button[title*="Pagina"]').first();
    if (await fitWidthBtn.isVisible()) {
      await fitWidthBtn.click();
      await page.waitForTimeout(300);
    }

    // Take screenshot for visual inspection
    await page.screenshot({ path: 'pdf-test.png' });
  });
});
