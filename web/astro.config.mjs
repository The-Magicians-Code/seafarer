// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Deployed under https://themagicianscode.dev/seafarer/
// (GitHub Pages with a custom domain). The Astro site is the landing page;
// the embedded-PDF fallback lives at /seafarer/pdf/.
export default defineConfig({
  site: 'https://themagicianscode.dev',
  base: '/seafarer',
  trailingSlash: 'ignore',
  markdown: {
    // Astro 6: remark/rehype plugins are configured on the unified() processor.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },
  integrations: [mdx()],
  // Tailwind v4 is wired through PostCSS (postcss.config.mjs) rather than the
  // Vite plugin, which is incompatible with Astro 6's Rolldown-based bundler.
});
