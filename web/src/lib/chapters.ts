import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';

export type Chapter = CollectionEntry<'chapters'>;

/** All chapters for a language, in reading order. */
export async function getChapters(lang: Lang): Promise<Chapter[]> {
  const all = await getCollection('chapters', (c) => c.data.lang === lang);
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Previous / next neighbours of a chapter within its language. */
export function neighbours(chapters: Chapter[], slug: string) {
  const i = chapters.findIndex((c) => c.data.slug === slug);
  return {
    prev: i > 0 ? chapters[i - 1] : null,
    next: i >= 0 && i < chapters.length - 1 ? chapters[i + 1] : null,
  };
}
