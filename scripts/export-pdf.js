const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUTPUT_FILE = path.join(ROOT, 'exports', 'ai-agent-patterns.pdf');

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1130, height: 900 } });
  await page.goto(`file://${INDEX_HTML}`);
  await page.emulateMedia({ media: 'print' });

  await page.pdf({
    path: OUTPUT_FILE,
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
  });
  console.log(`Saved ${OUTPUT_FILE}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
