const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const EXPORTS_DIR = path.join(ROOT, 'exports');

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'single', label: 'Single-agent' },
  { key: 'multi', label: 'Multi-agent' },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function clickFilter(page, label) {
  await page.evaluate((text) => {
    const btn = Array.from(document.querySelectorAll('#filter-btns .tbtn'))
      .find((b) => b.textContent.trim() === text);
    if (!btn) throw new Error(`Filter button "${text}" not found`);
    btn.click();
  }, label);
  await page.waitForTimeout(150);
}

async function main() {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`file://${INDEX_HTML}`);

  for (const filter of FILTERS) {
    await clickFilter(page, filter.label);
    const file = path.join(EXPORTS_DIR, `linkedin-${filter.key}.png`);
    await page.screenshot({ path: file });
    console.log(`Saved ${file}`);
  }

  // Back to 'all' so every card is reachable for the per-card screenshots.
  await clickFilter(page, 'All');

  const names = await page.evaluate(() => PATTERNS.map((p) => p.name));

  for (let i = 0; i < names.length; i++) {
    await page.evaluate((idx) => toggleCard(idx), i);
    await page.waitForTimeout(150);

    const card = await page.$('.card.expanded');
    if (!card) {
      console.warn(`Could not expand card ${i} (${names[i]}), skipping`);
      continue;
    }

    const file = path.join(EXPORTS_DIR, `card-${slugify(names[i])}.png`);
    await card.screenshot({ path: file });
    console.log(`Saved ${file}`);

    await page.evaluate((idx) => toggleCard(idx), i);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
