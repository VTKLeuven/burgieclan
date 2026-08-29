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

    // 2. Go to document 116 (7-page PDF)
    await page.goto('/document/116');
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

  test('keeps the reader on the same page while zooming', async ({ page }) => {
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

    // 2. Open a document long enough to read into (116 is 7 pages)
    await page.goto('/document/116');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-pdf-page="7"]')).toBeAttached({ timeout: 10000 });

    // Which page sits under a given point in the window.
    const pageUnder = (clientY: number) => page.evaluate((y) => {
      let closest = 0;
      let smallestGap = Number.POSITIVE_INFINITY;

      for (const el of document.querySelectorAll<HTMLElement>('[data-pdf-page]')) {
        const rect = el.getBoundingClientRect();
        const gap = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
        if (gap < smallestGap) {
          smallestGap = gap;
          closest = Number(el.dataset.pdfPage);
        }
      }
      return closest;
    }, clientY);

    // 3. Read the last page
    await page.locator('[data-pdf-page="7"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const viewport = page.viewportSize()!;
    const pointerX = Math.round(viewport.width / 2);
    const pointerY = Math.round(viewport.height / 2);
    expect(await pageUnder(pointerY)).toBe(7);

    // 4. Zoom the way a reader does mid-document: ctrl / ⌘ with the wheel, over the page itself.
    //    The pages grow, so a scroll offset left where it was would drift back towards page 1.
    await page.mouse.move(pointerX, pointerY);
    await page.keyboard.down('Control');

    for (let step = 0; step < 6; step++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(120);
      expect(await pageUnder(pointerY)).toBe(7);
    }

    // 5. And back out again
    for (let step = 0; step < 6; step++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(120);
      expect(await pageUnder(pointerY)).toBe(7);
    }

    await page.keyboard.up('Control');

    // 6. The keyboard shortcut anchors on the middle of the viewer rather than on a pointer
    await page.keyboard.press('Control+Equal');
    await page.waitForTimeout(300);
    expect(await pageUnder(pointerY)).toBe(7);
  });
});
