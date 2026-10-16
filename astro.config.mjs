import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { remarkStripLeadingHeading } from "./src/lib/remark-strip-leading-heading.ts";

export default defineConfig({
  output: "static",
  // The public address, and what the CV sends people to. Canonical tags, OG
  // image URLs and the sitemap are all built from this, so it has to be the
  // custom domain rather than the workers.dev one the worker also answers on.
  site: "https://jeromeyeoh.com",
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkStripLeadingHeading],
    }),
  },
});
