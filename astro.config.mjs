// @ts-check
import { defineConfig } from 'astro/config';
import preact from "@astrojs/preact";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://icode4freedom.com",
  integrations: [preact(), mdx(), sitemap()],
  output: "static",
  adapter: vercel({
    webAnalytics: { enabled: true }
  })
});