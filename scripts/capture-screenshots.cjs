/**
 * Captures the README / portfolio screenshots by driving the real UI end to end
 * (customer journey -> back-office journey). It also doubles as a smoke test:
 * every step asserts on what appears on screen, so a broken flow fails loudly.
 *
 * Prerequisites: API + frontend running and the database seeded (see README), then:
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/capture-screenshots.cjs
 *
 * Env: WEB_URL (default http://127.0.0.1:4173), API_DOCS_URL (default http://127.0.0.1:3000/api/docs)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const WEB = process.env.WEB_URL ?? 'http://127.0.0.1:4173';
const DOCS = process.env.API_DOCS_URL ?? 'http://127.0.0.1:3000/api/docs';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const shot = async (page, name, opts = {}) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 8000 }).catch(() => {}); // wait for toasts to expire
  await page.waitForTimeout(250); // let transitions settle
  await page.screenshot({ path: path.join(OUT, `${name}.png`), ...opts });
  console.log('  saved', `${name}.png`);
};

const loginAs = async (page, label) => {
  await page.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await page.click(`button.demo-account:has-text("${label}")`);
  await page.click('form.auth-card button.btn-lg');
};

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const watch = (page) => {
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && !/favicon/.test(m.text()) && problems.push(`console: ${m.text()}`));
  };

  /* ---------------- Customer journey ---------------- */
  console.log('Customer journey');
  const cust = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const c = await cust.newPage();
  watch(c);

  await c.goto(WEB, { waitUntil: 'networkidle' });
  await shot(c, '01-home');

  await c.goto(`${WEB}/login`, { waitUntil: 'networkidle' });
  await shot(c, '02-login-demo-accounts');

  await loginAs(c, 'Customer');
  await c.waitForURL(`${WEB}/`);

  await c.goto(`${WEB}/shop?sort=name`, { waitUntil: 'networkidle' });
  await c.click('.filter-list button:has-text("Rice & Grains")');
  await c.waitForSelector('.product-card');
  await shot(c, '03-shop-category-filter');

  await c.locator('.product-card .product-name').first().click();
  await c.waitForSelector('.product-detail');
  await shot(c, '04-product-detail');

  // Build a cart: a few items from the shop, enough to unlock free delivery.
  await c.goto(`${WEB}/shop?sort=price_desc&inStock=true`, { waitUntil: 'networkidle' });
  const adds = c.locator('.product-card .btn-primary:not([disabled])');
  for (let i = 0; i < 3; i++) await adds.first().click();
  await c.locator('.product-card .stepper button[aria-label="Increase"]').first().click();
  await c.click('button.cart-btn');
  await c.waitForSelector('.drawer.open .cart-line');
  assert((await c.locator('.drawer .cart-line').count()) >= 3, 'cart should hold the added items');
  await shot(c, '05-cart-drawer');

  await c.click('.drawer-foot .btn-primary');
  await c.waitForURL('**/checkout');
  await c.fill('input[placeholder="077 123 4567"]', '077 123 4567');
  await c.fill('input[placeholder="No. / street / area"]', '12/A Galle Road, Dehiwala');
  await c.fill('input[placeholder="e.g. Call at the gate"], textarea', 'Please call at the gate');
  await shot(c, '06-checkout');

  await c.click('.checkout .btn-lg');
  await c.waitForURL(/\/orders\/[0-9a-f-]{36}/);
  await c.waitForSelector('.alert-success');
  await shot(c, '07-order-placed', { fullPage: true });
  const orderNumber = (await c.locator('h1').first().innerText()).trim();
  assert(/^SFC-\d{6}$/.test(orderNumber), `unexpected order number ${orderNumber}`);
  console.log('  placed', orderNumber);

  await c.goto(`${WEB}/orders`, { waitUntil: 'networkidle' });
  await shot(c, '08-my-orders');

  // RBAC check: a customer must not see the back office.
  await c.goto(`${WEB}/admin`, { waitUntil: 'networkidle' });
  assert(!c.url().includes('/admin'), 'customers must be redirected away from /admin');
  await cust.close();

  /* ---------------- Back-office journey ---------------- */
  console.log('Back office journey');
  const adm = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await adm.newPage();
  watch(a);

  await loginAs(a, 'Admin');
  await a.waitForURL('**/admin');
  await a.waitForSelector('.kpi-grid');
  await a.waitForSelector('.chart rect');
  await shot(a, '09-admin-dashboard', { fullPage: true });

  await a.goto(`${WEB}/admin/orders`, { waitUntil: 'networkidle' });
  await a.click('.tabs button:has-text("Pending")');
  await a.waitForSelector('.data-table tbody tr');
  await a.fill('input[aria-label="Search orders"]', orderNumber.replace('SFC-', '').replace(/^0+/, ''));
  await a.waitForFunction(() => document.querySelectorAll('.data-table tbody tr').length === 1); // debounced search applied
  await shot(a, '10-admin-orders');

  await a.locator(`.data-table tr:has-text("${orderNumber}") button:has-text("View")`).click();
  await a.waitForSelector('.modal .timeline');
  await shot(a, '11-admin-order-detail');
  await a.click('.modal .btn-primary:has-text("Confirm order")');
  await a.waitForSelector('.modal .timeline li.current:has-text("Confirmed")');
  console.log('  order moved to Confirmed');
  await a.keyboard.press('Escape');

  await a.goto(`${WEB}/admin/products`, { waitUntil: 'networkidle' });
  await a.waitForSelector('.data-table tbody tr');
  await shot(a, '12-admin-products');
  await a.locator('.data-table tbody tr').first().locator('button:has-text("Edit")').click();
  await a.waitForSelector('.modal form');
  await shot(a, '13-admin-product-edit');
  await a.keyboard.press('Escape');

  await a.goto(`${WEB}/admin/inventory`, { waitUntil: 'networkidle' });
  await a.waitForSelector('.data-table tbody tr');
  await shot(a, '14-admin-inventory-low-stock');
  await a.locator('.data-table tbody tr').first().locator('button:has-text("Restock")').click();
  await a.fill('.modal input[type=number]', '40');
  await a.fill('.modal input[placeholder^="e.g."]', 'Weekly supplier delivery');
  await shot(a, '15-admin-adjust-stock');
  await a.click('.modal .btn-primary:has-text("Save adjustment")');
  await a.waitForSelector('.toast');
  await a.waitForSelector('.modal', { state: 'detached' });
  await a.click('.tabs button:has-text("Stock history")');
  await a.waitForSelector('.data-table .pos');
  await shot(a, '16-admin-stock-history');

  await a.goto(`${WEB}/admin/customers`, { waitUntil: 'networkidle' });
  await a.waitForSelector('.data-table tbody tr');
  await shot(a, '17-admin-customers');
  await adm.close();

  /* ---------------- API docs ---------------- */
  console.log('API docs');
  const docs = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const d = await docs.newPage();
  await d.goto(DOCS, { waitUntil: 'networkidle' });
  await d.waitForSelector('.swagger-ui .opblock-tag');
  await shot(d, '18-api-docs-swagger');
  await docs.close();

  /* ---------------- Mobile ---------------- */
  console.log('Mobile');
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const m = await mob.newPage();
  watch(m);
  await m.goto(WEB, { waitUntil: 'networkidle' });
  await shot(m, '19-mobile-home');
  await m.goto(`${WEB}/shop?sort=name`, { waitUntil: 'networkidle' });
  await m.waitForSelector('.product-card');
  await shot(m, '20-mobile-shop');
  await mob.close();

  await browser.close();
  if (problems.length) {
    console.error('\nBrowser errors seen during the run:\n' + [...new Set(problems)].join('\n'));
    process.exit(1);
  }
  console.log('\nDone - all steps passed, no browser errors.');
})().catch((e) => { console.error(e); process.exit(1); });
