// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
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
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
