import { test, Page, BrowserContext, expect } from '@playwright/test';

/**
 * Screenshots are a debugging aid, not the assertion: set SHOT_DIR to collect them while
 * working on the layout, and the run stays clean without it.
 */
const SHOTS = process.env.SHOT_DIR;
const BACKEND = 'http://localhost:8000';

async function authenticate(context: BrowserContext): Promise<boolean> {
  let data: { token?: string; refresh_token?: string };
  try {
    const response = await fetch(`${BACKEND}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'john_user', password: 'kitten' }),
    });
    if (!response.ok) return false;
    data = await response.json();
  } catch {
    return false;
  }

  if (!data.token || !data.refresh_token) return false;

  await context.addCookies([
    { name: 'BUR_DEV_jwt', value: data.token, domain: 'localhost', path: '/' },
    { name: 'BUR_DEV_refresh_token', value: data.refresh_token, domain: 'localhost', path: '/' },
  ]);
  await context.addInitScript(() => {
    try { localStorage.setItem('BUR_DEV_cookie_consent', 'true'); } catch { }
  });

  return true;
}

async function capture(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => { });
  await page.waitForTimeout(900);
}

/**
 * Nothing in the rail may paint on top of anything else in it.
 *
 * This is the regression that shipped: the folder tree was a flex item the rail was free to
 * squeeze, and its rows kept drawing at full height straight over the favourites below.
 *
 * Only rows actually visible inside the scroll pane count - an element scrolled out of view
 * still reports its full geometry, which is not a collision anyone can see.
 */
async function assertNoSidebarOverlap(page: Page) {
  const boxes = await page.locator('aside a, aside button, aside div[role]').evaluateAll((nodes) => {
    const pane = document.querySelector('aside .overflow-y-auto')?.getBoundingClientRect();

    return nodes
      .map((node) => node.getBoundingClientRect())
      .filter((box) => box.height > 0 && box.width > 0)
      .filter((box) => !pane || (box.top >= pane.top - 1 && box.bottom <= pane.bottom + 1))
      .map((box) => ({ top: box.top, bottom: box.bottom, left: box.left, right: box.right }));
  });

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      // A control wrapped in a padded parent is nesting, not overlap; allow a few pixels of slack
      // so a wrapper that is marginally shorter than its child does not read as a collision.
      const slack = 8;
      const nested = (a.top <= b.top + slack && a.bottom >= b.bottom - slack)
        || (b.top <= a.top + slack && b.bottom >= a.bottom - slack);
      if (!nested && overlapY > 6 && overlapX > 6) {
        throw new Error(`Sidebar rows overlap: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
      }
    }
  }
}

/** The breadcrumb is a kicker, not a paragraph: one line. */
async function assertBreadcrumbOnOneLine(page: Page) {
  const height = await page.locator('nav[aria-label="breadcrumb"] ol').evaluate((node) => node.getBoundingClientRect().height);
  expect(height, 'breadcrumb should fit on one line').toBeLessThan(34);
}

test('walk the curriculum', async ({ page, context }) => {
  test.setTimeout(60_000);

  // These captures need the dev stack with fixtures behind them; without it there is nothing
  // meaningful to assert, so skip rather than fail.
  test.skip(!(await authenticate(context)), 'backend not reachable');
  await page.setViewportSize({ width: 1500, height: 950 });

  await page.goto('/');
  await settle(page);
  await expect(page.locator('aside'), 'home should not render the curriculum sidebar').toHaveCount(0);
  await capture(page, '00-home');

  await page.goto('/courses');
  await settle(page);
  await capture(page, '01-courses');
  await assertNoSidebarOverlap(page);

  const toggleBox = await page.locator('aside nav button[aria-expanded]').first().boundingBox();
  expect(toggleBox?.width, 'tree toggle should be an easy click target').toBeGreaterThanOrEqual(32);
  expect(toggleBox?.height, 'tree toggle should be an easy click target').toBeGreaterThanOrEqual(32);

  const programmeRowHeights = await page.locator('aside nav > div > div > a').evaluateAll((links) =>
    links.map((link) => link.getBoundingClientRect().height)
  );
  expect(programmeRowHeights.length).toBeGreaterThan(0);
  expect(Math.max(...programmeRowHeights), 'programme names should stay on one row').toBeLessThanOrEqual(32);

  // A programme is one click and a real page, not an accordion.
  await page.locator('main').getByRole('link', { name: /Bachelor in de ingenieurswetenschappen/ }).click();
  await page.waitForURL(/\/courses\/program\/\d+/);
  await settle(page);
  await capture(page, '02-program');
  await assertBreadcrumbOnOneLine(page);

  await page.locator('main').getByRole('link', { name: 'Afstudeerrichting werktuigkunde' }).click();
  await page.waitForURL(/\/courses\/module\/\d+/);
  await settle(page);
  await capture(page, '03-module');

  await page.goto('/course/112');
  await settle(page);
  await capture(page, '04-course');
  await assertNoSidebarOverlap(page);
  await assertBreadcrumbOnOneLine(page);

  // Back must land on the module page it came from, not a collapsed tree.
  await page.goBack();
  await settle(page);
  expect(page.url()).toMatch(/\/courses\/module\/\d+/);

  await page.goto('/courses');
  await settle(page);
  await page.getByPlaceholder(/search for courses/i).fill('Polymer');
  await page.getByRole('button', { name: /^search$/i }).click();
  await settle(page);
  await capture(page, '05-search');

  // One click from a search hit to the course.
  await page.locator('main').getByRole('link', { name: /Polymer Composites/ }).first().click();
  await page.waitForURL(/\/course\/\d+/);
  await settle(page);

  // A folder and a file: the tree should follow the reader all the way down, and stepping to
  // the next document in a folder should not mean walking back up to it.
  await page.goto('/course/161/documents/category/8');
  await settle(page);
  await capture(page, '06-category');
  await assertNoSidebarOverlap(page);
  await assertBreadcrumbOnOneLine(page);

  // A course taught in two programmes: the switch is one line, opened on demand.
  await page.goto('/course/134');
  await settle(page);
  await page.locator('main').getByRole('button', { name: /also in/i }).click();
  await page.waitForTimeout(300);
  await capture(page, '07-placement');

  await page.goto('/document/106');
  await settle(page);
  await capture(page, '08-document');
  await assertNoSidebarOverlap(page);
  await assertBreadcrumbOnOneLine(page);
});
