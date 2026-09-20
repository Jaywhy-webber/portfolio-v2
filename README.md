# Portfolio v2

A rebuild of the portfolio against `design_handoff_portfolio_wireframes/`. Nothing here is
deployed — no CI, no `wrangler.jsonc`, no git remote. The original site in `../portfolio` is
untouched and still the live one.

## Running it

```bash
npm install
npm run dev -- --port 4322     # http://localhost:4322
```

Port 4322 leaves 4321 free, so v1 and v2 can run side by side for comparison.

To check the artefact that would actually deploy:

```bash
npm run build
npm run preview -- --port 4323
```

## Checks

```bash
npm run test        # vitest — 106 tests, includes a real astro build
npm run typecheck   # astro check
```

## What changed from v1

| | v1 | v2 |
| --- | --- | --- |
| Structure | one scrolling page | seven routes |
| Project list | card grid | full-width indexed rows |
| Project page | two routes (case study / readme) | one page, tabs switch on `#readme` |
| Demos | link to a new page | full-screen overlay with iframe |
| Research | hardcoded in `index.astro` | `research` content collection |
| Work history | none | `/work` + `experience` collection |
| Palette | blue, follows OS light/dark | warm paper, ink, deep teal — light only |
| Type | Inter throughout | Inter throughout; mono reserved for code |
| Contact links | text labels | icons with hidden labels (hero + footer), each showing its destination in a styled tooltip on hover and keyboard focus |

## Content model

- `src/content/projects/*.md` — plus optional `role`, `timeline`, `status` for the facts
  panel. `flagship` was removed: order comes from `sortOrder` and "has a playable demo"
  is already `demo.kind`, so the flag encoded nothing and could drift out of sync.
- `src/content/readmes/*.md` — unchanged from v1
- `src/content/experience/*.md` — new, drives `/work` (currently empty). One flat
  chronological list; `dateNote` carries "Internship" / "BSc" rather than a `kind` field.
- `src/content/research/*.md` — new, drives `/research`
- `src/data/workflow.ts`, `src/data/pipeline.ts` — step copy for the two diagrams

## Outstanding content

These are wired but have no copy yet, so the pages render without them rather than showing
invented text:

1. **`/work` entries.** Add one markdown file per role or degree to `src/content/experience/`:

   ```markdown
   ---
   dateRange: "2024 — 2025"
   dateNote: Internship
   title: Data Analyst Intern
   org: Some Organisation
   tags: [Python, SQL]
   relatedProjects: [kart-telemetry]
   sortOrder: 1
   ---

   One or two lines describing the work.
   ```

   Until then `/work` shows its header and an empty state.

2. **Facts panel fields.** Add `role`, `timeline` and `status` to each project's front matter.
   The panel currently renders only Links and Stack. Once every project has them, the three
   fields can be made required in `src/schemas/projects.ts`.

3. **`## Context` blocks.** The handoff asks for five prose blocks (Context, Problem, Approach,
   Hard parts, Outcome). The project markdown has the last four; add a `## Context` section
   above `## Problem` in each file.

4. **Pipeline sample output.** Set `pipelineSampleOutput` in `src/data/pipeline.ts` to a real
   export or audit-log excerpt. While it is `null` the bordered box is not rendered.

## Known behaviour

- **Databusters slides** load through the Microsoft Office web viewer, which needs a publicly
  reachable URL. The embed is built from `site` in `astro.config.mjs`, so locally it renders
  the deck from the deployed v1 site. Exporting the deck to numbered PNGs would let it use the
  same self-hosted viewer as the Beijing entry.
- **Project preview videos** referenced by `preview.assetPath` (`/assets/previews/*.webm`)
  have never existed in either repo. Rows use the poster image as the 16:9 thumbnail.
- **Light only.** The site does not follow the OS colour scheme: `:root` declares
  `color-scheme: light` and there is no `prefers-color-scheme` block, so a dark-set machine
  still gets the light palette.
- **Mobile layout** is written but has not been checked in a real narrow viewport — verify with
  Chrome DevTools' device toolbar.

## Layout ratios

Column proportions come from the wireframe board (`Portfolio Wireframes.dc.html`), whose cards
are `width:740px` with `26px` gutters — a **688px content column**. Every px figure in the
handoff README is relative to that, so they are expressed here as percentages and hold at any
shell width:

| Element | Board | Ratio |
| --- | --- | --- |
| Project row: index / gap / thumbnail / body | 38 / 22 / 220 / 386 | 5.52% / 3.2% / 31.98% / 56.1% |
| Project detail: prose / channel / facts | 472 / 26 / 196 | 68.6% / 3.8% / 27.6% |
| Facts panel inset | 20 | 2.9% |
| Readme right inset | 190 | 27.6% |
| Work row: date column / gap | 96 / 22 | 13.95% / 3.2% |
| Research: abstract / viewer, gap | 1fr / 1.6fr, 24 | 3.5% gap |
| Diagram band (7-step / 4-step) | 140 / 132 tall | `aspect-ratio` 4.914 / 5.212 |
| Diagram node | 26 | 2.6rem |

Changing `--shell-max` rescales all of it in proportion. The stacked mobile layouts revert to
fixed values — the ratios are a desktop concern.

## Deviations from the handoff

- **Breadcrumb** reads `Projects / 02`, not `Work / 02`. The wireframe predates Work and
  Projects splitting into separate routes; the index belongs to the projects list.
- **Mobile bottom bar** has five slots rather than four plus overflow. The handoff left the
  count open once the split created a fifth destination.
- **`/projects/[id]/readme/`** no longer exists as a route — the readme is a tab on the project
  page, reachable at `#readme`.
- **"Related projects"** on a work entry links to that project when there is exactly one, and
  to `/projects` when there are several.
