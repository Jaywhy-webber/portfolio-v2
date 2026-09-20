import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import { remarkStripLeadingHeading } from "./src/lib/remark-strip-leading-heading.ts";

export default defineConfig({
  output: "static",
  site: "https://portfolio.wawjerome.workers.dev",
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkStripLeadingHeading],
    }),
  },
});
