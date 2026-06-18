const path = require('path');
const fs = require('fs');
const pptxgen = require('pptxgenjs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const OUTPUT_FILE = path.join(ROOT, 'exports', 'ai-agent-patterns.pptx');

// Accent per group (legend: purple = single-agent / LLM core, amber = multi-agent).
const GROUP_ACCENT = { single: '7F77DD', multi: 'EF9F27' };

// Pill colors lifted straight from the .pill-* rules in index.html's token system.
const CAT_PILL = {
  llm: { fg: '534AB7', bg: 'EEEDFE', label: 'LLM core' },
  tool: { fg: '993C1D', bg: 'FAECE7', label: 'Tool / action' },
  data: { fg: '0F6E56', bg: 'E1F5EE', label: 'Data / memory' },
  multi: { fg: '854F0B', bg: 'FAEEDA', label: 'Multi-agent' },
};

async function loadPatterns() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${INDEX_HTML}`);
  const patterns = await page.evaluate(() => PATTERNS);
  await browser.close();
  return patterns;
}

function groupBySection(patterns) {
  const sections = [];
  const bySection = new Map();
  for (const p of patterns) {
    if (!bySection.has(p.section)) {
      const entry = { section: p.section, group: p.group, patterns: [] };
      bySection.set(p.section, entry);
      sections.push(entry);
    }
    bySection.get(p.section).patterns.push(p);
  }
  return sections;
}

function addPatternCard(slide, p, x, y, w, h) {
  const pill = CAT_PILL[p.cat] || CAT_PILL.llm;
  const pillW = 1.5;
  const pillH = 0.3;

  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: 'F7F6F2' },
    line: { color: 'EFEDE8', width: 0.75 },
    rectRadius: 0.06,
  });

  slide.addText(p.name, {
    x: x + 0.2, y: y + 0.15, w: w - pillW - 0.4, h: 0.4,
    fontFace: 'Arial', fontSize: 14, bold: true, color: '1A1917',
  });

  slide.addShape('roundRect', {
    x: x + w - pillW - 0.2, y: y + 0.18, w: pillW, h: pillH,
    fill: { color: pill.bg },
    line: { type: 'none' },
    rectRadius: 0.15,
  });
  slide.addText(pill.label.toUpperCase(), {
    x: x + w - pillW - 0.2, y: y + 0.18, w: pillW, h: pillH,
    fontFace: 'Arial', fontSize: 8, bold: true, color: pill.fg,
    align: 'center', valign: 'middle',
  });

  slide.addText(p.sub, {
    x: x + 0.2, y: y + 0.55, w: w - 0.4, h: 0.3,
    fontFace: 'Arial', fontSize: 10, color: '5C5A55',
  });

  slide.addText(p.flow.join('  '), {
    x: x + 0.2, y: y + 0.9, w: w - 0.4, h: h - 1.05,
    fontFace: 'Courier New', fontSize: 9, color: '5C5A55', valign: 'top',
  });
}

async function main() {
  const patterns = await loadPatterns();
  const sections = groupBySection(patterns);

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'WIDE';

  for (const sec of sections) {
    const slide = pptx.addSlide();
    const accent = GROUP_ACCENT[sec.group] || GROUP_ACCENT.single;

    slide.addShape('rect', {
      x: 0, y: 0, w: 0.12, h: 7.5,
      fill: { color: accent }, line: { type: 'none' },
    });

    slide.addText(sec.section, {
      x: 0.5, y: 0.3, w: 12.3, h: 0.6,
      fontFace: 'Arial', fontSize: 26, bold: true, color: '1A1917',
    });

    const cols = 2;
    const cardW = 5.9;
    const cardH = 2.5;
    const gapX = 0.5;
    const gapY = 0.3;
    const startX = 0.5;
    const startY = 1.2;

    sec.patterns.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      addPatternCard(slide, p, x, y, cardW, cardH);
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  await pptx.writeFile({ fileName: OUTPUT_FILE });
  console.log(`Saved ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
