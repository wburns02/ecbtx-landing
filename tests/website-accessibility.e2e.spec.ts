import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * ECB, TX LLC - Accessibility Enforcement Test Suite
 * Tests against live www.ecbtx.com to verify WCAG 2.2 AA compliance
 *
 * Validates:
 * 1. axe-core automated WCAG checks (all pages)
 * 2. Skip-to-content link (all pages)
 * 3. Main landmark (all pages)
 * 4. Footer landmark label (all pages)
 * 5. Heading hierarchy (all pages)
 * 6. Focus-visible styles (all pages)
 * 7. Homepage-specific: nav, SVGs, form ARIA, mobile menu, sections, external links
 * 8. County page-specific: checkmarks, nav wrapper
 * 9. Reduced motion support
 */

const BASE_URL = 'https://www.ecbtx.com';

// Known non-critical console errors to filter out
const KNOWN_ERRORS = [
  'favicon',
  'analytics',
  'googletagmanager',
  'google-analytics',
];

// All page types to test
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
        // Report violations with details
        const violations = results.violations.map(v => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        }));
        expect(violations, `axe violations on ${pg.name}`).toEqual([]);
      });

      test(`skip-to-content link - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`);
        const skipLink = page.locator('.skip-link');
        await expect(skipLink).toHaveAttribute('href', '#main-content');
        await expect(skipLink).toBeAttached();
      });

      test(`main landmark exists - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`);
        const main = page.locator('main#main-content');
        await expect(main).toHaveCount(1);
      });

      test(`footer has aria-label - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`);
        const footer = page.locator('footer[aria-label]');
        await expect(footer).toHaveCount(1);
      });

      test(`heading order is sequential - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`);
        const headings = await page.evaluate(() => {
          const els = document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6');
          return Array.from(els).map(el => ({
            level: parseInt(el.tagName[1]),
            text: el.textContent?.trim().substring(0, 50) || '',
            visible: window.getComputedStyle(el).display !== 'none',
          }));
        });

        const visibleHeadings = headings.filter(h => h.visible);
        if (visibleHeadings.length === 0) return; // Legal pages may have headings outside main

        // First heading should be h1
        expect(visibleHeadings[0].level).toBe(1);

        // No level skips going down
        for (let i = 1; i < visibleHeadings.length; i++) {
          const prev = visibleHeadings[i - 1].level;
          const curr = visibleHeadings[i].level;
          if (curr > prev) {
            expect(
              curr - prev,
              `Heading "${visibleHeadings[i].text}" skips from h${prev} to h${curr}`
            ).toBeLessThanOrEqual(1);
          }
        }
      });

      test(`focus-visible styles applied - ${pg.name}`, async ({ page }) => {
        await page.goto(`${BASE_URL}${pg.path}`);
        // Tab to first interactive element
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Verify focused element has visible outline
        const hasOutline = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.outlineStyle !== 'none' || style.outlineWidth !== '0px';
        });
        expect(hasOutline).toBe(true);
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

  test('logo links to homepage, not "#"', async ({ page }) => {
    const logo = page.locator('nav .logo');
    const href = await logo.getAttribute('href');
    expect(href).not.toBe('#');
    expect(href).toBe('/');
  });

  test('all decorative SVGs have aria-hidden', async ({ page }) => {
    const untaggedSvgs = await page.evaluate(() => {
      const svgs = document.querySelectorAll('main svg');
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

  test('sections have aria-labelledby or aria-label', async ({ page }) => {
    const sections = await page.evaluate(() => {
      const mainSections = document.querySelectorAll('main > section');
      return Array.from(mainSections).map(s => ({
        hasLabel: s.hasAttribute('aria-label') || s.hasAttribute('aria-labelledby'),
        className: s.className,
      }));
    });

    for (const section of sections) {
      expect(section.hasLabel, `Section "${section.className}" missing label`).toBe(true);
    }
  });

  test('mobile menu button has aria-expanded', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    const menuBtn = page.locator('.mobile-menu-btn');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(menuBtn).toHaveAttribute('aria-controls', 'navLinks');

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
  });

  test('form required fields have aria-required', async ({ page }) => {
    const nameInput = page.locator('#name');
    await expect(nameInput).toHaveAttribute('aria-required', 'true');

    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  test('form has autocomplete attributes', async ({ page }) => {
    await expect(page.locator('#name')).toHaveAttribute('autocomplete', 'name');
    await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#phone')).toHaveAttribute('autocomplete', 'tel');
  });

  test('form success is a live region', async ({ page }) => {
    const success = page.locator('#formSuccess');
    await expect(success).toHaveAttribute('role', 'status');
    await expect(success).toHaveAttribute('aria-live', 'polite');
  });

  test('form error container is a live region', async ({ page }) => {
    const error = page.locator('#formError');
    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).toHaveAttribute('aria-live', 'assertive');
  });

  test('Client Portal links warn about new tab', async ({ page }) => {
    const portalLinks = page.locator('a[href="https://react.ecbtx.com"]');
    const count = await portalLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = portalLinks.nth(i);
      const srText = link.locator('.sr-only');
      await expect(srText).toContainText('opens in new tab');
    }
  });

  test('stats section does not use heading elements for numbers', async ({ page }) => {
    const statHeadings = await page.evaluate(() => {
      const statsBar = document.querySelector('.stats-bar');
      if (!statsBar) return 0;
      return statsBar.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    });
    expect(statHeadings).toBe(0);
  });

  test('keyboard tab navigation works without traps', async ({ page }) => {
    const focusedElements: string[] = [];
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : 'none';
      });
      focusedElements.push(focused);
    }
    const unique = new Set(focusedElements);
    expect(unique.size).toBeGreaterThan(5);
  });
});

test.describe('Accessibility: County Pages', () => {
  test('county page has nav wrapper in header', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const nav = page.locator('header nav[aria-label="Main navigation"]');
    await expect(nav).toHaveCount(1);
  });

  test('county page SVGs are hidden from screen readers', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const untagged = await page.evaluate(() => {
      const svgs = document.querySelectorAll('main svg');
      let count = 0;
      for (const svg of svgs) {
        if (svg.getAttribute('aria-hidden') !== 'true') count++;
      }
      return count;
    });
    expect(untagged).toBe(0);
  });

  test('county page checkmarks use aria-hidden spans', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const checkmarks = await page.$$eval(
      '.local-info li .check-icon[aria-hidden="true"]',
      els => els.length
    );
    const listItems = await page.$$eval('.local-info li', els => els.length);
    expect(checkmarks).toBe(listItems);
  });

  test('county page sections have labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const sections = await page.evaluate(() => {
      const mainSections = document.querySelectorAll('main > section');
      return Array.from(mainSections).map(s => ({
        hasLabel: s.hasAttribute('aria-label') || s.hasAttribute('aria-labelledby'),
      }));
    });
    for (const section of sections) {
      expect(section.hasLabel).toBe(true);
    }
  });

  test('county page phone link has aria-label', async ({ page }) => {
    await page.goto(`${BASE_URL}/counties/blanco.html`);
    const phoneLink = page.locator('a.phone-link');
    await expect(phoneLink).toHaveAttribute('aria-label');
  });
});

test.describe('Accessibility: Reduced Motion', () => {
  test('homepage respects prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(BASE_URL);
    await page.waitForTimeout(1000);

    // All fade-in elements should be visible (opacity 1)
    const hiddenFadeIns = await page.evaluate(() => {
      const fadeIns = document.querySelectorAll('.fade-in');
      let hidden = 0;
      for (const el of fadeIns) {
        const style = window.getComputedStyle(el);
        if (parseFloat(style.opacity) < 1) hidden++;
      }
      return hidden;
    });
    expect(hiddenFadeIns).toBe(0);
  });
});
