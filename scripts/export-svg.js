const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUTPUT_DIR = path.join(ROOT, 'exports', 'svg');

// CSS properties that style the flow diagram nodes/edges/labels (see the
// .node-*, .edge*, .node-label, .edge-label, .group-box rules in index.html).
// Baked into inline `style` attributes so each exported SVG is standalone —
// no external stylesheet or CSS custom properties required to render it.
const BAKED_PROPS = [
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
  'filter', 'font-family', 'font-size', 'font-weight', 'letter-spacing',
  'text-anchor', 'dominant-baseline',
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${INDEX_HTML}`);

  const names = await page.evaluate(() => PATTERNS.map((p) => p.name));

  for (let i = 0; i < names.length; i++) {
    await page.evaluate((idx) => toggleCard(idx), i);
    await page.waitForTimeout(150);

    const markup = await page.evaluate((bakedProps) => {
      const svg = document.querySelector('.card.expanded .diagram-wrap svg.diagram');
      if (!svg) return null;

      const bakeOne = (el) => {
        const cs = getComputedStyle(el);
        const decls = bakedProps
          .map((prop) => {
            let v = cs.getPropertyValue(prop);
            if (!v) return '';
            if (prop === 'filter' && v.includes('#nodeShadow')) v = 'url(#nodeShadow)';
            return `${prop}:${v}`;
          })
          .filter(Boolean)
          .join(';');
        if (decls) el.setAttribute('style', decls);
        if (el.classList.contains('edge-label')) {
          el.textContent = el.textContent.toUpperCase();
        }
      };

      // Resolve the shared marker/filter defs (var(--border-mid) etc. only
      // resolve while still attached to the live document) before cloning.
      const sprite = document.querySelector('body > svg[aria-hidden="true"]');
      const markerPath = sprite.querySelector('marker#arrow path');
      const filterEl = sprite.querySelector('filter#nodeShadow');
      bakeOne(markerPath);

      svg.querySelectorAll('rect, path, text').forEach(bakeOne);

      const clone = svg.cloneNode(true);
      clone.removeAttribute('class');
      clone.querySelectorAll('[class]').forEach((el) => el.removeAttribute('class'));

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.appendChild(sprite.querySelector('marker#arrow').cloneNode(true));
      defs.appendChild(filterEl.cloneNode(true));
      clone.insertBefore(defs, clone.firstChild);

      const [, , w, h] = clone.getAttribute('viewBox').split(' ');
      clone.setAttribute('width', w);
      clone.setAttribute('height', h);

      return new XMLSerializer().serializeToString(clone);
    }, BAKED_PROPS);

    if (markup) {
      const file = path.join(OUTPUT_DIR, `pattern-${slugify(names[i])}.svg`);
      fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`);
      console.log(`Saved ${file}`);
    } else {
      console.warn(`Could not expand card ${i} (${names[i]}), skipping`);
    }

    await page.evaluate((idx) => toggleCard(idx), i);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
