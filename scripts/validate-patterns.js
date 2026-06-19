const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');

const GROUPS = new Set(['single', 'multi']);
const CATS = new Set(['llm', 'tool', 'data', 'multi']);
const FLOW_CATS = new Set(['neutral', 'llm', 'tool', 'data', 'multi']);
const KINDS = new Set(['parallel', 'branch']);
const REQUIRED_STRING_FIELDS = [
  'section', 'group', 'name', 'sub', 'cat', 'catLabel',
  'desc', 'uses', 'complexity', 'agents', 'loops', 'statefulness',
];

function errorsForPattern(p, i) {
  const errs = [];
  const where = `PATTERNS[${i}]${p && p.name ? ` (${p.name})` : ''}`;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof p[field] !== 'string' || p[field].trim() === '') {
      errs.push(`${where}: missing or empty "${field}"`);
    }
  }
  if (!GROUPS.has(p.group)) errs.push(`${where}: invalid group "${p.group}"`);
  if (!CATS.has(p.cat)) errs.push(`${where}: invalid cat "${p.cat}"`);
  if (p.loop !== undefined && typeof p.loop !== 'boolean') {
    errs.push(`${where}: "loop" must be a boolean if present`);
  }
  if (!Array.isArray(p.flow) || p.flow.length === 0) {
    errs.push(`${where}: "flow" must be a non-empty array`);
    return errs;
  }

  p.flow.forEach((step, j) => {
    const stepWhere = `${where}.flow[${j}]`;
    if (typeof step.label !== 'string' || step.label.trim() === '') {
      errs.push(`${stepWhere}: missing or empty "label"`);
    }
    if (!FLOW_CATS.has(step.cat)) {
      errs.push(`${stepWhere}: invalid cat "${step.cat}"`);
    }
    if (step.kind !== undefined) {
      if (!KINDS.has(step.kind)) {
        errs.push(`${stepWhere}: invalid kind "${step.kind}"`);
      }
      if (!Array.isArray(step.members) || step.members.length === 0) {
        errs.push(`${stepWhere}: "members" must be a non-empty array when "kind" is set`);
      } else if (step.members.some((m) => typeof m !== 'string' || m.trim() === '')) {
        errs.push(`${stepWhere}: "members" must contain only non-empty strings`);
      }
    }
  });

  return errs;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`file://${INDEX_HTML}`);
  const { patterns, statefulnessInfo } = await page.evaluate(() => ({
    patterns: PATTERNS,
    statefulnessInfo: typeof STATEFULNESS_INFO !== 'undefined' ? STATEFULNESS_INFO : null,
  }));
  await browser.close();

  const errors = [];

  if (!Array.isArray(patterns) || patterns.length === 0) {
    errors.push('PATTERNS must be a non-empty array');
  } else {
    patterns.forEach((p, i) => errors.push(...errorsForPattern(p, i)));

    const names = patterns.map((p) => p.name).filter(Boolean);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) {
      errors.push(`Duplicate pattern name(s): ${[...new Set(dupes)].join(', ')}`);
    }

    if (statefulnessInfo) {
      const statefulnessValues = new Set(patterns.map((p) => p.statefulness).filter(Boolean));
      for (const value of statefulnessValues) {
        if (!statefulnessInfo[value]) {
          errors.push(`No STATEFULNESS_INFO entry for statefulness value "${value}" — the tooltip will be empty`);
        }
      }
    }
  }

  if (errors.length) {
    console.error(`Found ${errors.length} problem(s) in PATTERNS:\n`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`PATTERNS schema OK (${patterns.length} patterns).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
