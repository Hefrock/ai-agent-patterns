# AI Agent Design Patterns — Project Spec

## What this project is

An interactive reference site covering all major AI agent design patterns —
single-agent and multi-agent architectures — intended for multiple output
formats: GitHub Pages (interactive), LinkedIn images, PPTX presentations,
and PDF exports.

Source of truth: `index.html` — a fully self-contained interactive reference.
Do not modify the pattern content or color semantics without checking this file.

---

## Repo & deployment

**Repo name:** `ai-agent-patterns`
**GitHub Pages:** deploy from `main` branch, root `/`
**Live URL (after setup):** `https://<username>.github.io/ai-agent-patterns`

### GitHub Pages setup steps (run once)
```bash
git init
git add .
git commit -m "init: AI agent design patterns reference"
gh repo create ai-agent-patterns --public --push --source=.
# Then enable GitHub Pages in repo Settings → Pages → Deploy from branch → main / root
```

---

## Design token system

All colors are CSS custom properties defined in `index.html` `:root`.
Dark mode is handled by `@media (prefers-color-scheme: dark)` — do not
hardcode any hex values outside the token definitions.

### Color semantics (do not change without reason)
| Token role   | Light value | Purpose |
|---|---|---|
| `--accent`   | `#534AB7`   | LLM / reasoning nodes |
| `--teal-mid` | `#1D9E75`   | Data / memory nodes |
| `--coral-mid`| `#D85A30`   | Tool / action nodes |
| `--amber-mid`| `#EF9F27`   | Multi-agent nodes |
| `--bg`       | `#ffffff`   | Page background |
| `--bg2`      | `#F7F6F2`   | Surface / toolbar |
| `--bg3`      | `#EFEDE8`   | Hover / badge fill |

### Theme variants (applied as body classes)
- `.theme-ocean`  — blue accent, green teal, amber secondary
- `.theme-slate`  — gray accent, green teal, blue secondary
- `.theme-warm`   — pink accent, amber teal, coral secondary
- (default)       — purple accent

### Typography
- Body: `'Inter', 'Helvetica Neue', Arial, sans-serif`
- Mono (flow badges): `'JetBrains Mono', 'Fira Code', monospace`

---

## Pattern data

15 patterns across 8 sections. All defined in the `PATTERNS` array in
`index.html`. Fields per pattern:

```js
{
  section: string,      // section heading
  group: 'single'|'multi',
  name: string,
  sub: string,          // short subtitle
  cat: 'llm'|'tool'|'data'|'multi',
  catLabel: string,
  desc: string,         // full description (shown on expand)
  uses: string,         // common use cases
  complexity: string,   // Low / Medium / High / Very high
  agents: string,       // count or range
  loops: string,
  statefulness: string,
  loop: boolean,         // optional — renders a loop-back-to-step-2 + Done node
  flow: {                // ordered steps, each rendered as an SVG diagram node
    label: string,
    cat: 'neutral'|'llm'|'tool'|'data'|'multi',
    kind: 'parallel'|'branch',  // optional — renders this step as a fan-out cluster
    members: string[]           // required when kind is set — sub-node labels
  }[]
}
```

The `flow` array drives the per-pattern SVG diagram (`flowDiagramSVG` in
`index.html`) shown in the expanded card view. `cat` maps to the same
color legend as the card's `cat` field (`neutral` = gray, `llm` = purple,
`tool` = coral, `data` = teal, `multi` = amber). Steps with `kind` render
as a dashed group box containing one node per `members` entry — `parallel`
draws solid fan-out/fan-in edges (AND semantics), `branch` draws dashed
edges (exclusive-OR / "choose one" semantics).

### Statefulness tooltips

`STATEFULNESS_INFO` (in `index.html`, alongside `PATTERNS`) maps each
`statefulness` value to a one-sentence explanation, shown as a hover/focus
tooltip on the "At a glance" panel's Statefulness row. Every distinct
`statefulness` value used in `PATTERNS` must have an entry here —
`scripts/validate-patterns.js` enforces this.

The tooltip text is also exposed to assistive tech: the Statefulness value
has `aria-describedby` pointing at a visually-hidden (`.sr-only`) span
holding the same string, since the `data-tip`/`::after` CSS tooltip content
isn't reliably read by screen readers on its own.

### Deep dive button

Each expanded card has a "Deep dive" button (`copyDeepDive` /
`deepDivePrompt` in `index.html`). It copies a prompt built from the
pattern's name, description, flow, and common uses to the clipboard
(for pasting into a separate Claude conversation), and briefly shows
"Copied ✓" on the button as feedback. It does not call any API or
navigate away — the site has no backend.

---

## Export targets & tasks for Claude Code

### 1. GitHub Pages (already done by init above)
- Deploy `index.html` from repo root on `main`
- No build step required — fully self-contained HTML

### 2. PNG/JPG exports (for LinkedIn, social)
Use Playwright headless to screenshot each section:
```bash
npm install -D playwright
npx playwright install chromium
```
Script target: `export-images.js`
- Open `index.html` locally
- Set viewport to 1200×630 (LinkedIn OG image size)
- For each filter ('all', 'single', 'multi'), screenshot and save as
  `exports/linkedin-{filter}.png`
- For each expanded card, screenshot and save as
  `exports/card-{slug}.png`

### 3. PPTX export
Use `pptxgenjs` to generate a slide per pattern section.
Each slide: title = section name, body = card grid (name + pill + flow).
Color each slide accent from the token system.
Output: `exports/ai-agent-patterns.pptx`

### 4. PDF export
Script target: `export-pdf.js`. Opens `index.html`, switches to `print`
media emulation (a `@media print` block in `index.html` hides the toolbar
and keeps cards from splitting across page breaks), and prints to A4 via
Playwright's `page.pdf()`.
Output: `exports/ai-agent-patterns.pdf`

### 5. SVG per pattern card
Script target: `export-svg.js`. Expands each card in turn and pulls its
`svg.diagram` flow diagram (the same SVG shown on the page), then bakes
every element's resolved `fill`/`stroke`/`font-*`/`filter` etc. into
inline `style` attributes via `getComputedStyle` and inlines the shared
`#arrow` marker and `#nodeShadow` filter `<defs>` — so each file has zero
dependency on `index.html`'s stylesheet or CSS custom properties and
renders correctly opened on its own or pasted into docs/slides.
Output: `exports/svg/pattern-{slug}.svg`

---

## Folder structure (target)

```
ai-agent-patterns/
├── index.html          ← main interactive site (source of truth)
├── CLAUDE.md           ← this file
├── README.md           ← to be generated by Claude Code
├── docs/
│   └── preview.png      ← committed screenshot for README (exports/ is gitignored)
├── exports/
│   ├── linkedin-all.png
│   ├── linkedin-single.png
│   ├── linkedin-multi.png
│   ├── ai-agent-patterns.pptx
│   ├── ai-agent-patterns.pdf
│   └── svg/
│       └── pattern-*.svg
├── scripts/
│   ├── validate-patterns.js
│   ├── export-images.js
│   ├── export-pptx.js
│   ├── export-pdf.js
│   └── export-svg.js
└── .github/
    └── workflows/
        ├── deploy.yml   ← GitHub Pages deploy action
        └── ci.yml       ← PR validation (schema + export smoke test)
```

---

## GitHub Actions — Pages deploy (create this file)

Path: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## GitHub Actions — PR validation

Path: `.github/workflows/ci.yml`

Runs on every pull request targeting `main`. Two layers of validation,
both driven by loading `index.html` in headless Chromium so they exercise
the real `PATTERNS` data and renderer rather than a separate copy:

1. `npm run validate` (`scripts/validate-patterns.js`) — checks every
   pattern against the schema documented above (required fields, valid
   `cat`/`group`/`kind` enums, `members` present when `kind` is set,
   no duplicate names, and that every distinct `statefulness` value has
   a matching entry in `STATEFULNESS_INFO` so the tooltip never renders
   empty).
2. `npm run export:images` / `npm run export:pptx` / `npm run export:pdf` /
   `npm run export:svg` — runs all four real export scripts end-to-end as
   a smoke test. A thrown error here means the renderer or PATTERNS data
   broke something the schema check can't see (e.g. a layout exception),
   not just a malformed field.

This does not catch visual regressions (e.g. a node clipped at the edge
of its SVG `viewBox`) — only crashes and schema violations. Visual
changes to the diagrams still need a manual screenshot check.

---

## README (generate this)

Claude Code should generate a `README.md` that includes:
- Project description
- Live URL badge
- Screenshot of the site
- Pattern list with links
- How to run export scripts
- License (MIT)

---

## Constraints

- Never hardcode hex values outside the `:root` token block
- Always test dark mode when modifying CSS
- The `PATTERNS` array is the single source of truth for content —
  all exports derive from it, do not duplicate data
- Keep `index.html` fully self-contained (no external dependencies)
- All export scripts go in `scripts/` — do not modify `index.html` from scripts

---

## First session prompt for Claude Code

Paste this into claude.ai/code after connecting the repo:

> Read CLAUDE.md and index.html to understand the project.
> Then do the following in order:
> 1. Create the GitHub Actions deploy workflow at .github/workflows/deploy.yml
> 2. Generate a README.md with project description, live URL placeholder, and pattern list
> 3. Create scripts/export-images.js using Playwright to export LinkedIn-sized PNGs
> 4. Create scripts/export-pptx.js using pptxgenjs to export a PPTX
> 5. Commit everything and push to main
