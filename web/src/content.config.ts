import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const chapters = defineCollection({
  // generateId keeps the language directory in the id; without it the loader
  // derives ids from the bare filename and en/et entries (same filenames)
  // collide, silently dropping one language.
  loader: glob({
    base: './src/content',
    pattern: '{en,et}/*.mdx',
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    slug: z.string(),
    lang: z.enum(['en', 'et']),
  }),
});

export const collections = { chapters };
