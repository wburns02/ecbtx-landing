import { test, expect } from '@playwright/test';

/**
 * ECB, TX LLC - SEO Verification Test Suite
 * Tests against live ecbtx.com to verify SEO elements
 */

const BASE_URL = 'https://ecbtx-landing.netlify.app';

test.describe('ECB TX SEO Verification', () => {

  test.describe('Homepage SEO Elements', () => {

    test('should have proper page title', async ({ page }) => {
      await page.goto(BASE_URL);
      const title = await page.title();
      expect(title).toContain('ECB');
      expect(title.length).toBeGreaterThan(30);
      expect(title.length).toBeLessThan(80);
    });

    test('should have meta description with sufficient length', async ({ page }) => {
      await page.goto(BASE_URL);
      const description = await page.$eval(
        'meta[name="description"]',
        (el) => el.getAttribute('content')
      );
      expect(description).toBeTruthy();
      expect(description!.length).toBeGreaterThan(80);
      expect(description!.length).toBeLessThan(200);
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

    test('should have ProfessionalService schema', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );

      const business = schemas.find((s) => s['@type'] === 'ProfessionalService');
      expect(business).toBeTruthy();
      expect(business.name).toBe('ECB, TX LLC');
      expect(business.telephone).toBeTruthy();
      expect(business.email).toBe('info@ecbtx.com');
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

    test('should have at least 3 schema blocks', async ({ page }) => {
      await page.goto(BASE_URL);

      const schemaCount = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.length
      );

      expect(schemaCount).toBeGreaterThanOrEqual(3);
    });

  });

  test.describe('Homepage Content', () => {

    test('should have portfolio section with 3 case studies', async ({ page }) => {
      await page.goto(BASE_URL);
      const cards = await page.locator('.portfolio-card').count();
      expect(cards).toBe(3);
    });

    test('should have services section with Build/Host/Support', async ({ page }) => {
      await page.goto(BASE_URL);
      const serviceCards = await page.locator('.service-card').count();
      expect(serviceCards).toBe(3);

      const content = await page.textContent('#services');
      expect(content).toContain('Build');
      expect(content).toContain('Host');
      expect(content).toContain('Support');
    });

    test('should have 4 process steps', async ({ page }) => {
      await page.goto(BASE_URL);
      const steps = await page.locator('.process-step').count();
      expect(steps).toBe(4);
    });

    test('should have FAQ section with 6 questions', async ({ page }) => {
      await page.goto(BASE_URL);
      const questions = await page.locator('.faq-question').count();
      expect(questions).toBe(6);
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

      const criticalErrors = errors.filter(
        (e) => !e.includes('favicon') && !e.includes('analytics') && !e.includes('googletagmanager')
      );
      expect(criticalErrors.length).toBe(0);
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000);
    });

  });

  test.describe('Mobile Responsiveness', () => {

    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);

      const nav = await page.locator('nav').isVisible();
      expect(nav).toBe(true);

      const mobileMenuBtn = await page.locator('.nav-toggle').isVisible();
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

    test('should have Blanco County page with schema', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/counties/blanco.html`);
      expect(response?.status()).toBe(200);

      const title = await page.title();
      expect(title).toContain('Blanco County');

      const schemas = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => JSON.parse(s.textContent || '{}'))
      );
      const business = schemas.find((s) =>
        s['@type'] === 'ProfessionalService' || s['@type'] === 'LocalBusiness'
      );
      expect(business).toBeTruthy();
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
