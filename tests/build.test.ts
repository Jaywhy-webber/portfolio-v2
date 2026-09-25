import { describe, test, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const PROJECT_IDS = ["kart-telemetry", "daily-briefing", "routlette", "ec1101-rag-chatbot"];

/** Projects whose demo is bundled or external, so a Live demo trigger renders. */
const PROJECTS_WITH_DEMOS = ["kart-telemetry", "daily-briefing"];

const ROUTES = [
  "dist/index.html",
  "dist/work/index.html",
  "dist/projects/index.html",
  "dist/research/index.html",
  "dist/workflow/index.html",
  "dist/pipeline/index.html",
  "dist/404.html",
  ...PROJECT_IDS.map((id) => `dist/projects/${id}/index.html`),
];

function read(path: string): string {
  return readFileSync(path, "utf-8");
}

function readCss(): string {
  return readdirSync("dist/_astro")
    .filter((f) => f.endsWith(".css"))
    .map((f) => read(`dist/_astro/${f}`))
    .join("\n");
}

/** Every <article class="project-row"> block in a page. */
function projectRows(html: string): string[] {
  return html.match(/<article class="project-row"[\s\S]*?<\/article>/g) ?? [];
}

function countOccurrences(html: string, needle: RegExp): number {
  return (html.match(needle) ?? []).length;
}

beforeAll(() => {
  execSync("npm run build", { stdio: "pipe" });
}, 180000);

describe("routes", () => {
  test("every wireframe route emits a page", () => {
    for (const route of ROUTES) {
      expect(existsSync(route), `missing ${route}`).toBe(true);
    }
  });

  test("the old separate readme route is gone - readme is a tab now", () => {
    for (const id of PROJECT_IDS) {
      expect(existsSync(`dist/projects/${id}/readme/index.html`)).toBe(false);
    }
  });

  test("each page is a valid responsive document", () => {
    for (const route of ROUTES) {
      const html = read(route);
      expect(html.toLowerCase()).toContain("<!doctype html>");
      expect(html).toContain('<html lang="en">');
      expect(html).toContain("width=device-width");
    }
  });
});

describe("site chrome", () => {
  test("the primary nav lists all five destinations on every page", () => {
    for (const route of ROUTES) {
      const html = read(route);
      for (const href of ["/work", "/projects", "/research", "/workflow", "/pipeline"]) {
        expect(html, `${route} missing nav link ${href}`).toContain(`href="${href}"`);
      }
    }
  });

  test("the active nav item is marked as current", () => {
    const pairs: [string, string][] = [
      ["dist/work/index.html", "/work"],
      ["dist/research/index.html", "/research"],
      ["dist/workflow/index.html", "/workflow"],
      ["dist/pipeline/index.html", "/pipeline"],
    ];
    for (const [route, href] of pairs) {
      const html = read(route);
      expect(html).toMatch(new RegExp(`href="${href}"[^>]*aria-current="page"`));
    }
  });

  test("project pages keep Projects as the current nav item", () => {
    const html = read("dist/projects/kart-telemetry/index.html");
    expect(html).toMatch(/href="\/projects"[^>]*aria-current="page"/);
  });

  test("the mobile bottom bar renders five slots", () => {
    const html = read("dist/index.html");
    expect(html).toContain('class="mobile-nav"');
    expect(countOccurrences(html, /class="mobile-link[^"]*"/g)).toBe(5);
  });

  test("the resume button points at the PDF and the file ships", () => {
    expect(read("dist/index.html")).toContain('href="/resume.pdf"');
    expect(existsSync("dist/resume.pdf")).toBe(true);
  });

  test("the footer carries the contact links", () => {
    const html = read("dist/index.html");
    expect(html).toContain("https://github.com/Jaywhy-webber");
    expect(html).toContain("https://www.linkedin.com/in/jerome-yeoh-35a738217");
    expect(html).toContain("mailto:jeromeyeohhc@gmail.com");
  });

  test("the footer's icon links are named for assistive tech", () => {
    const html = read("dist/index.html");
    const footer = html.slice(html.indexOf('class="site-footer'));
    expect(countOccurrences(footer, /class="[^"]*has-tip[^"]*icon-link[^"]*"/g)).toBe(3);
    // Right-aligned so a centred tip cannot run off the edge of the viewport.
    expect(countOccurrences(footer, /class="tip tip--end"/g)).toBe(3);
    for (const name of ["GitHub", "LinkedIn", "Email"]) {
      expect(footer).toMatch(new RegExp(`class="visually-hidden"[^>]*>${name}<`));
    }
  });
});

describe("home", () => {
  test("renders the masthead, pitch and degree line", () => {
    const html = read("dist/index.html");
    expect(html).toContain("Jerome Yeoh");
    expect(html).toContain("Business Analytics student at NUS");
    expect(html).toContain("Bachelor of Science (Business Analytics)");
    expect(html).toContain("National University of Singapore");
  });

  test("the hero action row offers resume, copy email, GitHub and LinkedIn", () => {
    const html = read("dist/index.html");
    const hero = html.slice(html.indexOf('class="hero'), html.indexOf("</section>"));
    expect(hero).toContain('href="/resume.pdf"');
    expect(hero).toContain('data-copy-value="jeromeyeohhc@gmail.com"');
    expect(hero).toContain("https://github.com/Jaywhy-webber");
    expect(hero).toContain("linkedin.com/in/jerome-yeoh-35a738217");
  });

  test("the icon-only hero controls still carry an accessible name", () => {
    const html = read("dist/index.html");
    const hero = html.slice(html.indexOf('class="hero'), html.indexOf("</section>"));

    // Icon buttons render an <svg> plus a visually-hidden label, so screen
    // readers get a name even though nothing legible is on the control.
    for (const name of ["GitHub", "LinkedIn", "Copy email"]) {
      expect(hero, `${name} has no visually-hidden label`).toMatch(
        new RegExp(`class="visually-hidden"[^>]*>${name}<`),
      );
    }

    // Every icon control uses the styled tooltip, so no native ones remain.
    // (Matched as a tag attribute — "title=" also occurs in the inlined script.)
    expect(hero).not.toMatch(/<[^>]+\stitle="/);
  });

  test("all three hero icons show a destination and a prompt on hover", () => {
    const html = read("dist/index.html");
    const hero = html.slice(html.indexOf('class="hero'), html.indexOf("</section>"));

    const expected: [string, string][] = [
      ["jeromeyeohhc@gmail.com", "(click to copy)"],
      ["github.com/Jaywhy-webber", "(opens in a new tab)"],
      ["linkedin.com/in/jerome-yeoh-35a738217", "(opens in a new tab)"],
    ];

    for (const [value, hint] of expected) {
      expect(hero, `no tip for ${value}`).toContain(value);
      expect(hero).toContain(hint);
    }

    expect(countOccurrences(hero, /class="tip"/g)).toBe(3);
    expect(countOccurrences(hero, /class="[^"]*has-tip[^"]*"/g)).toBe(3);
  });

  test("the email icon shows the address and a copy prompt on hover", () => {
    const html = read("dist/index.html");
    const hero = html.slice(html.indexOf('class="hero'), html.indexOf("</section>"));

    expect(hero).toMatch(/class="tip__value"[^>]*>jeromeyeohhc@gmail\.com</);
    expect(hero).toMatch(/class="tip__hint"[^>]*>\(click to copy\)</);
  });

  test("tooltips are hidden from the accessibility tree", () => {
    const html = read("dist/index.html");
    // Each trigger already ships a visually-hidden label; an exposed tip would
    // make screen readers announce the control twice.
    const tips = html.match(/<span class="tip(?: tip--end)?"[^>]*>/g) ?? [];
    expect(tips.length).toBeGreaterThan(0);
    for (const tip of tips) {
      expect(tip, tip).toContain('aria-hidden="true"');
    }
  });

  test("the tooltip is revealed by keyboard focus, not hover alone", () => {
    // Component CSS is inlined into the page, and Astro scopes the selector
    // with a data-astro-cid attribute.
    // The tooltip styles are global now, so they land in the shared bundle.
    expect(readCss()).toContain(".has-tip:focus-visible");
  });

  test("the copy-email button ships both the mail and tick glyphs", () => {
    const html = read("dist/index.html");
    expect(html).toContain('data-copy-glyph="idle"');
    expect(html).toMatch(/data-copy-glyph="done"[^>]*hidden/);
  });
});

describe("project list", () => {
  test("home and /projects render one row per collection entry", () => {
    expect(projectRows(read("dist/index.html"))).toHaveLength(PROJECT_IDS.length);
    expect(projectRows(read("dist/projects/index.html"))).toHaveLength(PROJECT_IDS.length);
  });

  test("rows are numbered from 01 in sortOrder order", () => {
    const rows = projectRows(read("dist/index.html"));
    const titles = ["Routlette", "Kart Telemetry Dashboard", "Daily Briefing", "EC1101"];
    rows.forEach((row, i) => {
      expect(row).toContain(`>${String(i + 1).padStart(2, "0")}<`);
      expect(row).toContain(titles[i]);
    });
  });

  test("every row links to its detail page", () => {
    const html = read("dist/index.html");
    for (const id of PROJECT_IDS) {
      expect(html).toContain(`href="/projects/${id}/"`);
    }
  });

  test("a row contains exactly one anchor, so the demo control cannot nest inside it", () => {
    for (const row of projectRows(read("dist/index.html"))) {
      expect(countOccurrences(row, /<a\s/g)).toBe(1);
    }
  });

  test("the Live demo control is a button carrying the overlay target", () => {
    const rows = projectRows(read("dist/index.html"));
    const withTrigger = rows.filter((row) => row.includes("data-demo-src"));
    expect(withTrigger).toHaveLength(PROJECTS_WITH_DEMOS.length);
    for (const row of withTrigger) {
      expect(row).toMatch(/<button[^>]*data-demo-src="[^"]+"/);
    }
  });

  test("projects with demo.kind none render no Live demo trigger", () => {
    const html = read("dist/index.html");
    const routlette = projectRows(html).find((row) => row.includes("Routlette"));
    expect(routlette).toBeDefined();
    expect(routlette).not.toContain("data-demo-src");
  });

  test("each row shows a thumbnail sourced from the project poster", () => {
    for (const row of projectRows(read("dist/index.html"))) {
      expect(row).toMatch(/<img[^>]*src="\/assets\/posters\/[^"]+\.png"/);
    }
  });

  test("stack tags render on each row", () => {
    const html = read("dist/index.html");
    for (const tech of ["Python", "Astro", "React Native", "Chroma"]) {
      expect(html).toContain(tech);
    }
  });
});

describe("project detail", () => {
  test("shows a breadcrumb with the row index", () => {
    const html = read("dist/projects/kart-telemetry/index.html");
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain(">02<");
  });

  test("renders both tabs with More details selected", () => {
    for (const id of PROJECT_IDS) {
      const html = read(`dist/projects/${id}/index.html`);
      expect(html).toMatch(/data-tab="details"[^>]*aria-selected="true"/);
      expect(html).toMatch(/data-tab="readme"[^>]*aria-selected="false"/);
    }
  });

  test("both panels ship in the same document, with readme hidden until switched", () => {
    const html = read("dist/projects/kart-telemetry/index.html");
    expect(html).toMatch(/data-tab-panel="details"/);
    expect(html).toMatch(/data-tab-panel="readme"[^>]*hidden/);
  });

  test("the facts panel follows the reader down a long case study", () => {
    // Component styles are inlined into the page, not the shared bundle.
    const css = read("dist/projects/kart-telemetry/index.html");
    // Sticky below the sticky header, so Stack and Links survive past the
    // first screen of prose.
    expect(css).toMatch(/\.facts\[data-astro-cid-[^\]]+\]\{[^}]*position:sticky/);
    expect(css).toContain("var(--header-height) + 1.5rem");
    // Sticky needs a grid item that doesn't stretch to fill the row.
    expect(css).toMatch(/\.detail-body\[data-astro-cid-[^\]]+\]\{[^}]*align-items:start/);
  });

  test("the facts panel stops being sticky once it stacks on mobile", () => {
    // Above the prose at that width, so there is nothing to stick beside.
    const css = read("dist/projects/kart-telemetry/index.html");
    expect(css).toMatch(/@media[^{]*max-width:860px[\s\S]*?\.facts\[[^\]]+\]\{[^}]*position:static/);
  });

  test("scrollbars are slimmed down but still visible", () => {
    const css = readCss();
    expect(css).toContain("scrollbar-width:thin");
    // Not "none": an invisible scrollbar hides page length and can't be grabbed.
    expect(css).not.toMatch(/html\{[^}]*scrollbar-width:none/);
    expect(css).toMatch(/scrollbar-color:var\(--color-border-strong\)/);
  });

  test("the case-study prose keeps its labelled blocks", () => {
    for (const id of PROJECT_IDS) {
      const html = read(`dist/projects/${id}/index.html`);
      expect(html).toContain('id="problem"');
      expect(html).toContain('id="approach"');
      expect(html).toContain('id="outcome"');
    }
  });

  test("the readme tab offers a working clone command", () => {
    const html = read("dist/projects/kart-telemetry/index.html");
    expect(html).toContain(
      'data-copy-value="git clone https://github.com/Jaywhy-webber/kart-telemetry.git"',
    );
  });

  test("the facts panel lists stack and links, and omits fields with no content yet", () => {
    const html = read("dist/projects/kart-telemetry/index.html");
    expect(html).toMatch(/<dt class="label"[^>]*>Stack<\/dt>/);
    expect(html).toMatch(/<dt class="label"[^>]*>Links<\/dt>/);
    // role/timeline/status are not in the content yet, so no empty rows appear.
    expect(html).not.toMatch(/<dt class="label"[^>]*>Role<\/dt>/);
  });

  test("Launch demo renders only for projects that have one", () => {
    for (const id of PROJECTS_WITH_DEMOS) {
      expect(read(`dist/projects/${id}/index.html`)).toContain("Launch demo");
    }
    expect(read("dist/projects/routlette/index.html")).not.toContain("Launch demo");
  });

  test("previous and next link to the neighbouring projects", () => {
    const first = read("dist/projects/routlette/index.html");
    expect(first).not.toContain("Previous");
    expect(first).toContain('href="/projects/kart-telemetry/"');

    const middle = read("dist/projects/kart-telemetry/index.html");
    expect(middle).toContain("Previous");
    expect(middle).toContain('href="/projects/routlette/"');
    expect(middle).toContain('href="/projects/daily-briefing/"');

    const last = read("dist/projects/ec1101-rag-chatbot/index.html");
    expect(last).toContain("Previous");
    expect(last).toContain('href="/projects/daily-briefing/"');
  });

  test("each detail page carries its own OG metadata", () => {
    for (const id of PROJECT_IDS) {
      const html = read(`dist/projects/${id}/index.html`);
      expect(html).toMatch(/<meta\s[^>]*property="og:type"\s[^>]*content="article"/);
      expect(html).toMatch(/<meta\s[^>]*property="og:image"/);
    }
  });
});

describe("demo overlay", () => {
  test("the overlay ships on every page", () => {
    for (const route of ROUTES) {
      expect(read(route), `${route} has no overlay`).toContain('id="demo-overlay"');
    }
  });

  test("the overlay is a modal dialog, closed by default", () => {
    const html = read("dist/index.html");
    expect(html).toMatch(/id="demo-overlay"[^>]*role="dialog"/);
    expect(html).toMatch(/id="demo-overlay"[\s\S]{0,300}?hidden/);
  });

  test("the overlay offers Open in new tab and Close", () => {
    const html = read("dist/index.html");
    expect(html).toContain("Open in new tab");
    expect(html).toContain("data-overlay-close");
  });
});

describe("research", () => {
  test("renders one section per entry, indexed R1 and R2", () => {
    const html = read("dist/research/index.html");
    expect(html).toContain(">R1<");
    expect(html).toContain(">R2<");
    expect(html).toContain("Financial Run Dynamics");
    expect(html).toContain("Beijing Property Market Analysis");
  });

  test("the image viewer renders a thumbnail per slide plus a counter", () => {
    const html = read("dist/research/index.html");
    expect(countOccurrences(html, /class="slide-thumb(?: [^"]*)?"/g)).toBe(30);
    expect(html).toContain("1 / 30");
  });

  test("slide paths with spaces are URL-encoded", () => {
    const html = read("dist/research/index.html");
    expect(html).toContain("/research/beijing%20prop%20mkt/Title.png");
    expect(html).not.toContain("/research/beijing prop mkt/");
  });

  test("the deck-backed entry uses the office embed and offers a download", () => {
    const html = read("dist/research/index.html");
    expect(html).toContain("view.officeapps.live.com");
    expect(html).toContain("Download slides");
    expect(html).toContain("/research/databusters.pptx");
  });
});

describe("workflow and pipeline", () => {
  test("workflow renders seven steps", () => {
    const html = read("dist/workflow/index.html");
    expect(countOccurrences(html, /class="step-node"/g)).toBe(7);
    expect(html).toContain("Ideation");
    expect(html).toContain("QA / Review");
    expect(html).toContain("research.md");
  });

  test("the stats strip is gone, per the handoff", () => {
    const html = read("dist/workflow/index.html");
    expect(html).not.toContain("sub-issues shipped");
    expect(html).not.toContain("tests passing");
  });

  test("pipeline renders four steps and links the repo", () => {
    const html = read("dist/pipeline/index.html");
    expect(countOccurrences(html, /class="step-node"/g)).toBe(4);
    expect(html).toContain("Ingest");
    expect(html).toContain("Export");
    expect(html).toContain("https://github.com/Jaywhy-webber/data-cleaning-pipeline");
  });

  test("the sample output box is omitted while it has no real content", () => {
    expect(read("dist/pipeline/index.html")).not.toContain("Sample output");
  });
});

describe("work", () => {
  test("renders the section header and the resume foot", () => {
    const html = read("dist/work/index.html");
    expect(html).toContain("Experience");
    expect(html).toContain("education");
    expect(html).toContain("See all projects");
    expect(html).toContain('href="/resume.pdf"');
  });
});

describe("launch readiness", () => {
  test("the favicon is a JY monogram in the accent colour", () => {
    const svg = read("dist/favicon.svg");

    expect(svg).toContain('aria-label="JY"');
    // v1's icon read "JW" in its blue. Both were carried over by mistake.
    expect(svg).not.toContain("JW");
    expect(svg).toContain("#1c4f4a");
    expect(svg).not.toContain("#2563eb");

    // Paths, not <text>: a favicon can't load a webfont, so text would fall
    // back to whatever the OS has and shift between machines.
    expect(svg).not.toContain("<text");
    expect(svg).toContain("<path");
  });

  test("favicon, robots, sitemap and 404 are in place", () => {
    expect(existsSync("dist/favicon.svg")).toBe(true);
    expect(existsSync("dist/robots.txt")).toBe(true);
    expect(existsSync("dist/sitemap-index.xml") || existsSync("dist/sitemap-0.xml")).toBe(true);
    expect(read("dist/404.html")).toMatch(/not found/i);
  });

  test("every page has a unique title and a description", () => {
    const titles = new Set<string>();
    for (const route of ROUTES) {
      const html = read(route);
      const match = html.match(/<title>([^<]*)<\/title>/);
      expect(match, `${route} has no title`).not.toBeNull();
      if (match) titles.add(match[1]);
      expect(html).toMatch(/<meta\s[^>]*name="description"/);
    }
    expect(titles.size).toBe(ROUTES.length);
  });

  test("OG and Twitter cards are present, with absolute image URLs", () => {
    const html = read("dist/index.html");
    expect(html).toMatch(/<meta\s[^>]*property="og:title"/);
    expect(html).toMatch(/<meta\s[^>]*name="twitter:card"/);
    const image = html.match(/property="og:image"\s+content="([^"]+)"/);
    expect(image).not.toBeNull();
    if (image) expect(image[1]).toMatch(/^https?:\/\//);
  });

  test("analytics and view transitions are wired", () => {
    const html = read("dist/index.html");
    expect(html).toContain("cloudflareinsights.com/beacon.min.js");
    expect(html).toContain("view-transition");
  });
});

describe("design system", () => {
  test("the palette is defined once, with no OS dark-mode override", () => {
    const css = readCss();
    expect(css).toContain("--color-accent");
    // The site is light only; a prefers-color-scheme block would let a
    // dark-set OS repaint it.
    expect(css).not.toContain("prefers-color-scheme");
  });

  test("the page opts into a light colour scheme", () => {
    // Minified, so no space after the colon.
    expect(readCss()).toMatch(/color-scheme:\s*light/);
  });

  test("motion is disabled for users who ask for reduced motion", () => {
    expect(readCss()).toContain("prefers-reduced-motion");
  });
});
