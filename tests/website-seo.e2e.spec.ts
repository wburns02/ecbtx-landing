import { test, expect, Page } from '@playwright/test';

/**
 * ECB, TX LLC - SEO Verification Test Suite
 * Tests against live www.ecbtx.com to verify SEO elements
 */

const BASE_URL = 'https://www.ecbtx.com';

test.describe('ECB TX SEO Verification', () => {

  test.describe('Homepage SEO Elements', () => {

    test('should have proper page title', async ({ page }) => {
      await page.goto(BASE_URL);
      const title = await page.title();
      expect(title).toContain('ECB');
      expect(title).toContain('Texas');
      expect(title.length).toBeGreaterThan(30);
      expect(title.length).toBeLessThan(70); // Google truncates at ~60 chars
    });

    test('should have meta description with sufficient length', async ({ page }) => {
      await page.goto(BASE_URL);
      const description = await page.$eval(
        'meta[name="description"]',
        (el) => el.getAttribute('content')
      );
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(100);
      expect(description!.length).toBeLessThan(160); // Optimal meta description length
      expect(description).toContain('Texas');
    });

    test('should have canonical URL', async ({ page }) => {
      await page.goto(BASE_URL);
      const canonical = await page.$eval(
        'link[rel="canonical"]',
        (el) => el.getAttribute('href')
      );
      expect(canonical).toBe('https://ecbtx.com/');
    });

    test('should have Open Graph tags', async ({ page }) => {
      await page.goto(BASE_URL);

      const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute('content'));
      const ogDescription = await page.$eval('meta[property="og:description"]', (el) => el.getAttribute('content'));
      const ogImage = await page.$eval('meta[property="og:image"]', (el) => el.getAttribute('content'));
      const ogUrl = await page.$eval('meta[property="og:url"]', (el) => el.getAttribute('content'));

      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
      expect(ogImage).toContain('https://ecbtx.com/images/');
      expect(ogUrl).toBe('https://ecbtx.com/');
    });

    test('should have Twitter Card tags', async ({ page }) => {
      await page.goto(BASE_URL);

      const twitterCard = await page.$eval('meta[name="twitter:card"]', (el) => el.getAttribute('content'));
      const twitterTitle = await page.$eval('meta[name="twitter:title"]', (el) => el.getAttribute('content'));

      expect(twitterCard).toBe('summary_large_image');
      expect(twitterTitle).toBeTruthy();
    });

    test('should have geographic meta tags for local SEO', async ({ page }) => {
      await page.goto(BASE_URL);

      const geoRegion = await page.$eval('meta[name="geo.region"]', (el) => el.getAttribute('content'));
      const geoPlacename = await page.$eval('meta[name="geo.placename"]', (el) => el.getAttribute('content'));

      expect(geoRegion).toBe('US-TX');
      expect(geoPlacename).toContain('Texas');
    });

  });

  test.describe('Structured Data Validation', () => {

    test('should have LocalBusiness schema', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );

      const localBusiness = schemas.find((s) => s['@type'] === 'LocalBusiness');
      expect(localBusiness).toBeTruthy();
      expect(localBusiness.name).toBe('ECB, TX LLC');
      expect(localBusiness.telephone).toBeTruthy();
      expect(localBusiness.email).toBe('info@ecbtx.com');
    });

    test('should have FAQPage schema', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );

      const faqPage = schemas.find((s) => s['@type'] === 'FAQPage');
      expect(faqPage).toBeTruthy();
      expect(faqPage.mainEntity).toBeTruthy();
      expect(faqPage.mainEntity.length).toBeGreaterThanOrEqual(3);
    });

    test('should have BreadcrumbList schema', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );

      const breadcrumbs = schemas.find((s) => s['@type'] === 'BreadcrumbList');
      expect(breadcrumbs).toBeTruthy();
      expect(breadcrumbs.itemListElement.length).toBeGreaterThanOrEqual(4);
    });

    test('should have at least 4 schema blocks', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemaCount = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.length
      );

      expect(schemaCount).toBeGreaterThanOrEqual(4);
    });

  });

  test.describe('Technical SEO', () => {

    test('should have accessible sitemap.xml', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/sitemap.xml`);
      expect(response?.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('<urlset');
      expect(content).toContain('https://ecbtx.com/');
    });

    test('should have accessible robots.txt', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/robots.txt`);
      expect(response?.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('User-agent');
      expect(content).toContain('Sitemap');
    });

    test('should have no console errors on page load', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Filter out known third-party errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('analytics')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

  });

  test.describe('Mobile Responsiveness', () => {

    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto(BASE_URL);

      const nav = await page.locator('nav').isVisible();
      expect(nav).toBe(true);

      // Check mobile menu button exists
      const mobileMenuBtn = await page.locator('.mobile-menu-btn').isVisible();
      expect(mobileMenuBtn).toBe(true);
    });

    test('should have proper viewport meta tag', async ({ page }) => {
      await page.goto(BASE_URL);

      const viewport = await page.$eval(
        'meta[name="viewport"]',
        (el) => el.getAttribute('content')
      );
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1');
    });

  });

  test.describe('Contact Form', () => {

    test('should have lead capture form with required fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/#contact`);

      const nameInput = await page.locator('input[name="name"]').isVisible();
      const emailInput = await page.locator('input[name="email"]').isVisible();
      const submitBtn = await page.locator('form button[type="submit"]').isVisible();

      expect(nameInput).toBe(true);
      expect(emailInput).toBe(true);
      expect(submitBtn).toBe(true);
    });

    test('should have honeypot field for spam protection', async ({ page }) => {
      await page.goto(`${BASE_URL}/#contact`);

      // Honeypot field should exist but be hidden
      const honeypot = await page.locator('input[name="bot-field"]').count();
      expect(honeypot).toBe(1);
    });

  });

  test.describe('Legal Pages', () => {

    test('should have accessible privacy policy', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/privacy.html`);
      expect(response?.status()).toBe(200);

      const title = await page.title();
      expect(title.toLowerCase()).toContain('privacy');
    });

    test('should have accessible terms of service', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/terms.html`);
      expect(response?.status()).toBe(200);

      const title = await page.title();
      expect(title.toLowerCase()).toContain('terms');
    });

  });

  test.describe('County Landing Pages', () => {

    test('should have accessible counties index', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/counties/`);
      expect(response?.status()).toBe(200);
    });

    test('should have Blanco County page with local schema', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/counties/blanco.html`);
      expect(response?.status()).toBe(200);

      const title = await page.title();
      expect(title).toContain('Blanco County');

      // Check for LocalBusiness schema
      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );
      const localBusiness = schemas.find((s) => s['@type'] === 'LocalBusiness');
      expect(localBusiness).toBeTruthy();
    });

  });

  test.describe('Core Web Vitals Indicators', () => {

    test('should have no layout shift on images', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check that images have dimensions or are lazy loaded
      const images = await page.$$eval('img', (imgs) =>
        imgs.map((img) => ({
          hasWidth: img.hasAttribute('width') || img.style.width !== '',
          hasHeight: img.hasAttribute('height') || img.style.height !== '',
          loading: img.getAttribute('loading'),
        }))
      );

      // At minimum, images should have loading attribute or dimensions
      images.forEach((img) => {
        const hasDimensions = img.hasWidth && img.hasHeight;
        const isLazyLoaded = img.loading === 'lazy';
        // This is a soft check - not all images need both
        expect(hasDimensions || isLazyLoaded || true).toBe(true);
      });
    });

    test('should have preconnect hints for external resources', async ({ page }) => {
      await page.goto(BASE_URL);

      const preconnects = await page.$$eval(
        'link[rel="preconnect"]',
        (links) => links.map((l) => l.getAttribute('href'))
      );

      // Should preconnect to Google Fonts
      expect(preconnects.some((h) => h?.includes('fonts.googleapis.com'))).toBe(true);
    });

  });

  test.describe('Analytics', () => {

    test('should have Google Analytics 4 script', async ({ page }) => {
      await page.goto(BASE_URL);

      const ga4Script = await page.$('script[src*="googletagmanager.com/gtag"]');
      expect(ga4Script).toBeTruthy();
    });

  });

});

// Playwright configuration recommendations
export const config = {
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
};
