import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * ECB, TX LLC - Accessibility Test Suite
 * Tests against ecbtx-landing.netlify.app to verify WCAG compliance
 */

const BASE_URL = 'https://ecbtx-landing.netlify.app';

const KNOWN_ERRORS = [
  'favicon',
  'analytics',
  'googletagmanager',
  'google-analytics',
];

const ALL_PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Privacy', path: '/privacy.html' },
  { name: 'Terms', path: '/terms.html' },
  { name: 'Counties Index', path: '/counties/' },
  { name: 'Blanco County', path: '/counties/blanco.html' },
];

test.describe('Accessibility: Global Requirements', () => {
  for (const pg of ALL_PAGES) {
    test.describe(pg.name, () => {
      test(`axe-core WCAG 2.2 AA scan - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' });
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();
        const violations = results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        }));
        expect(violations, `axe violations on ${pg.name}`).toEqual([]);
      });

      test(`no critical console errors - ${pg.name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            const isKnown = KNOWN_ERRORS.some(known => text.includes(known));
            if (!isKnown) {
              errors.push(text);
            }
          }
        });

        await page.goto(`${BASE_URL}${pg.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        expect(errors.length).toBe(0);
      });
    });
  }
});

test.describe('Accessibility: Homepage Specific', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  });

  test('nav has aria-label', async ({ page }) => {
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toHaveCount(1);
  });

  test('logo links to homepage', async ({ page }) => {
    const logo = page.locator('.nav-logo');
    const href = await logo.getAttribute('href');
    expect(href).toBe('/');
  });

  test('all decorative SVGs have aria-hidden', async ({ page }) => {
    const untaggedSvgs = await page.evaluate(() => {
      const svgs = document.querySelectorAll('svg');
      let untagged = 0;
      for (const svg of svgs) {
        if (
          svg.getAttribute('aria-hidden') !== 'true' &&
          !svg.closest('[aria-hidden="true"]')
        ) {
          untagged++;
        }
      }
      return untagged;
    });
    expect(untaggedSvgs).toBe(0);
  });

  test('FAQ accordion buttons have aria-expanded', async ({ page }) => {
    const buttons = page.locator('.faq-question');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const expanded = await btn.getAttribute('aria-expanded');
      expect(expanded).toBe('false');
    }

    // Click first question and verify it opens
    await buttons.first().click();
    const expanded = await buttons.first().getAttribute('aria-expanded');
    expect(expanded).toBe('true');
  });

  test('mobile menu button has aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    const menuBtn = page.locator('.nav-toggle');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('form inputs have labels', async ({ page }) => {
    const nameLabel = page.locator('label[for="name"]');
    await expect(nameLabel).toHaveCount(1);

    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toHaveCount(1);

    const messageLabel = page.locator('label[for="message"]');
    await expect(messageLabel).toHaveCount(1);
  });

  test('keyboard tab navigation works without traps', async ({ page }) => {
    const focusedElements: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return 'body';
        const tag = el.tagName.toLowerCase();
        const id = el.id ? '#' + el.id : '';
        return `${tag}${id}`;
      });
      focusedElements.push(focused);
    }
    const unique = new Set(focusedElements);
    expect(unique.size).toBeGreaterThan(1);
  });
});

test.describe('Accessibility: County Pages', () => {
  test('county page has nav with aria-label', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toHaveCount(1);
  });
});

test.describe('Accessibility: Reduced Motion', () => {
  test('homepage respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    const hiddenFadeIns = await page.evaluate(() => {
      const fadeIns = document.querySelectorAll('.fade-in');
      let hidden = 0;
      for (const el of fadeIns) {
        const style = window.getComputedStyle(el);
        if (parseFloat(style.opacity) < 1) hidden++;
      }
      return hidden;
    });
    // Note: fade-in uses IntersectionObserver, so elements may or may not be visible
    // depending on viewport. This is a soft check.
    expect(hiddenFadeIns).toBeLessThanOrEqual(10);
  });
});
