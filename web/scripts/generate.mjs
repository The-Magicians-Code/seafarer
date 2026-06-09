#!/usr/bin/env node
/**
 * generate.mjs — Content pipeline for the Astro thesis site.
 *
 * Reads the LaTeX sources that are the single source of truth
 * (../faithful for Estonian, ../faithful-en for English) and produces:
 *   - src/content/{et,en}/NN-slug.mdx   (one file per chapter)
 *   - src/data/references.json          (parsed from references.bib)
 *   - public/media/*                     (figure images, copied verbatim)
 *
 * The benchmark data for the interactive charts lives in
 * src/data/benchmarks.json and is NOT generated here — it was digitised by
 * hand from the original chart screenshots (see that file's `_provenance`).
 *
 * Requires `pandoc` (>= 3.2) on PATH.
 *
 * Conversion strategy (validated against pandoc 3.5):
 *   1. Pre-process the .tex: strip `>{...}` column decorators (they make
 *      pandoc drop leading numbers in table cells), swap the accuracy-formula
 *      image for real LaTeX math, and tokenise \cite / \ref so they survive
 *      pandoc (which otherwise drops them).
 *   2. pandoc latex -> gfm (--wrap=none) keeps figures as <figure> blocks
 *      (preserving \label as the id) and math as $...$.
 *   3. Post-process the markdown into MDX: <figure> -> <Figure>/<ModelChart>,
 *      CITE/REF tokens -> <Cite>/<Ref>, and tidy a few pandoc artefacts.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO = join(ROOT, '..');

const LANGS = {
  et: { dir: join(REPO, 'faithful'), figure: 'Joonis', table: 'Tabel' },
  en: { dir: join(REPO, 'faithful-en'), figure: 'Figure', table: 'Table' },
};

// Chapter source file -> stable, language-neutral slug + ordinal.
// Order matches chapters_main.tex.
const CHAPTERS = [
  { src: 'introduction.tex', slug: '01-introduction' },
  { src: 'first_chapter.tex', slug: '02-sea-trials' },
  { src: 'second_chapter.tex', slug: '03-computer-vision' },
  { src: 'third_chapter.tex', slug: '04-hardware' },
  { src: 'fourth_chapter.tex', slug: '05-software' },
  { src: 'fifth_chapter.tex', slug: '06-application' },
  { src: 'sixth_chapter.tex', slug: '07-results' },
  { src: 'summary.tex', slug: '08-summary' },
];

// Figures in the results chapter that become interactive charts instead of
// static images. Keyed by image basename -> benchmarks.json dataset key.
const CHART_FIGURES = {
  'image24.png': 'image24',
  'image25.png': 'image25',
  'image26.png': 'image26',
  'image27.png': 'image27',
};

// The accuracy formula (image23.png) rendered as KaTeX math, per language.
const ACCURACY_FORMULA = {
  et: '\\[\\alpha = \\frac{\\text{Korrektsed tuvastused}}{\\text{K\\~oik tuvastused}},\\ 0 \\le \\alpha \\le 1\\]',
  en: '\\[\\alpha = \\frac{\\text{Correct detections}}{\\text{All detections}},\\ 0 \\le \\alpha \\le 1\\]',
};

/* ------------------------------------------------------------------ */
/* references.bib -> JSON                                              */
/* ------------------------------------------------------------------ */

function extractBraced(text, fromIndex) {
  // text[fromIndex] must be '{'. Returns the balanced content (no braces).
  let depth = 0;
  let out = '';
  for (let i = fromIndex; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      depth++;
      if (depth === 1) continue;
    } else if (c === '}') {
      depth--;
      if (depth === 0) return { value: out, end: i };
    }
    out += c;
  }
  return { value: out, end: text.length };
}

function cleanField(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\\'/g, "'")
    .replace(/\\&/g, '&')
    .replace(/\\_/g, '_')
    .replace(/\\%/g, '%')
    .replace(/[{}]/g, '')
    .trim();
}

function parseBib(bibPath) {
  const text = readFileSync(bibPath, 'utf8');
  const entries = [];
  const re = /@online\{([^,]+),/g;
  let m;
  while ((m = re.exec(text))) {
    const id = m[1].trim();
    // Scan fields until the entry's closing brace.
    const body = text.slice(re.lastIndex);
    const fields = {};
    for (const field of ['title', 'url', 'urldate']) {
      const fre = new RegExp(`${field}\\s*=\\s*\\{`);
      const fm = fre.exec(body);
      if (fm) {
        const { value } = extractBraced(body, fm.index + fm[0].length - 1);
        fields[field] = field === 'url' ? value.trim() : cleanField(value);
      }
    }
    const num = Number.parseInt(id.replace(/\D/g, ''), 10);
    entries.push({ id, n: num, title: fields.title || id, url: fields.url || '', urldate: fields.urldate || '' });
  }
  entries.sort((a, b) => a.n - b.n);
  return entries;
}

/* ------------------------------------------------------------------ */
/* Figure / table numbering map (document order, shared across langs) */
/* ------------------------------------------------------------------ */

function buildRefMap() {
  // label -> { kind: 'fig'|'tab', n, slug }
  const map = {};
  let figN = 0;
  let tabN = 0;
  for (const ch of CHAPTERS) {
    const tex = readFileSync(join(LANGS.et.dir, 'chapters', ch.src), 'utf8');
    const re = /\\label\{((fig|tab):[^}]+)\}/g;
    let m;
    while ((m = re.exec(tex))) {
      const label = m[1];
      const kind = m[2];
      const n = kind === 'fig' ? ++figN : ++tabN;
      map[label] = { kind, n, slug: ch.slug };
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/* .tex pre-processing                                                */
/* ------------------------------------------------------------------ */

function preprocessTex(tex, lang) {
  let out = tex;
  // 0. Flatten `\begin{minipage}...\end{minipage}` table cells. Their internal
  //    `\\` line breaks force pandoc into a pipe table it cannot represent, so
  //    it silently drops the cell content (e.g. the Jetson AGX Xavier specs).
  //    Join the lines into one cell and drop layout-only commands.
  out = out.replace(/\\begin\{minipage\}(?:\[[^\]]*\])?\{[^}]*\}([\s\S]*?)\\end\{minipage\}/g, (_, c) =>
    c
      .replace(/\\(raggedright|centering|arraybackslash|strut)\b/g, '')
      .replace(/\\\\(\[[^\]]*\])?/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
  // 1. Strip `>{...}` column decorators inside table preambles. Without this,
  //    pandoc drops leading numbers in cells ("472 GFLOPs" -> "GFLOPs").
  out = out.replace(/>\{[^}]*\}/g, '');
  // 2. Swap the accuracy-formula image for real display math.
  out = out.replace(/\\includegraphics(\[[^\]]*\])?\{media\/image23\.png\}/g, ACCURACY_FORMULA[lang]);
  // 3. Tokenise citations and cross-references so they survive pandoc.
  out = out.replace(/\\cite\{([^}]*)\}/g, (_, keys) => ` CITEMARK(${keys.replace(/\s+/g, '')})`);
  out = out.replace(/\\ref\{([^}]*)\}/g, (_, label) => `REFMARK(${label.trim()})`);
  // 4. \zlabel / \zref are zref-specific page-counting helpers — drop them.
  out = out.replace(/\\z(label|ref)\{[^}]*\}/g, '');
  return out;
}

/* ------------------------------------------------------------------ */
/* markdown post-processing -> MDX                                    */
/* ------------------------------------------------------------------ */

function escapeAttr(s) {
  return JSON.stringify(s);
}

function postprocess(md, { lang, slug, refMap, refs }) {
  let out = md;

  // Remove HTML comments — MDX does not support them.
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  // Normalise math delimiters for remark-math:
  //   pandoc gfm emits inline math as $`...`$ and display math as a ```math
  //   fenced block. remark-math wants $...$ and $$...$$.
  out = out.replace(/\$`([^`]+)`\$/g, (_, m) => `$${m}$`);
  out = out.replace(/(^|\n)((?:> ?)?)```\s*math\s*\n([\s\S]*?)\n(?:> ?)?```/g, (_, lead, _q, body) => {
    const clean = body.replace(/^> ?/gm, '').trim();
    return `${lead}\n$$\n${clean}\n$$\n`;
  });

  // Convert <figure> blocks into <Figure> / <ModelChart>. The <img> may be
  // wrapped in a <p> by pandoc.
  const figureRe = /<figure(?:\s+id="([^"]*)")?>\s*(?:<p>)?\s*<img\s+src="media\/([^"]+)"[^>]*\/>\s*(?:<\/p>)?\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/g;
  out = out.replace(figureRe, (_, id, basename, caption) => {
    const cap = caption.trim();
    const entry = id && refMap[id] ? refMap[id] : null;
    const n = entry ? entry.n : 0;
    const word = LANGS[lang].figure;
    if (CHART_FIGURES[basename]) {
      return `\n<ModelChart id=${escapeAttr(id || '')} n={${n}} word=${escapeAttr(word)} lang=${escapeAttr(lang)} dataset=${escapeAttr(CHART_FIGURES[basename])}>\n${cap}\n</ModelChart>\n`;
    }
    return `\n<Figure id=${escapeAttr(id || '')} n={${n}} word=${escapeAttr(word)} src=${escapeAttr(basename)}>\n${cap}\n</Figure>\n`;
  });

  // Strip style/width attributes from any HTML tables pandoc emitted, and drop
  // <colgroup> — string `style="..."` attributes are invalid in MDX/JSX.
  out = out.replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '');
  out = out.replace(/\s+style="[^"]*"/g, '');
  // Wrapper divs pandoc adds around tables carry the table label as id.
  // Keep the id (used as a cross-reference anchor) but it is otherwise inert.

  // CITEMARK(refA,refB) -> <Cite items={[...]} />
  out = out.replace(/CITEMARK\(([^)]*)\)/g, (_, keys) => {
    const items = keys
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
      .map((k) => {
        const ref = refs.find((r) => r.id === k);
        const n = ref ? ref.n : Number.parseInt(k.replace(/\D/g, ''), 10) || 0;
        const title = ref ? ref.title : k;
        return { n, id: k, title };
      });
    return `<Cite lang=${escapeAttr(lang)} items={${JSON.stringify(items)}} />`;
  });

  // REFMARK(label) -> <Ref label="Figure 5" href="en/07-results#fig:imageN" />
  out = out.replace(/REFMARK\(([^)]*)\)/g, (_, label) => {
    const entry = refMap[label];
    if (!entry) return label;
    const word = entry.kind === 'fig' ? LANGS[lang].figure : LANGS[lang].table;
    // Prose already supplies the word ("see Figure ..."), so the link text
    // is just the number; the full label rides along as a title for a11y.
    return `<Ref label=${escapeAttr(String(entry.n))} title=${escapeAttr(`${word} ${entry.n}`)} href=${escapeAttr(`${lang}/${entry.slug}#${label}`)} />`;
  });

  // Collapse 3+ blank lines.
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

/* ------------------------------------------------------------------ */
/* Chapter titles from chapters_main.tex                              */
/* ------------------------------------------------------------------ */

function chapterTitles(lang) {
  const tex = readFileSync(join(LANGS[lang].dir, 'chapters', 'chapters_main.tex'), 'utf8');
  // \chapter{Title}\label{...}\n\input{chapters/file}
  const titles = {};
  const re = /\\chapter\{([^}]*)\}[^\n]*\n\\input\{chapters\/([^}]+)\}/g;
  let m;
  while ((m = re.exec(tex))) {
    let file = m[2];
    if (!file.endsWith('.tex')) file += '.tex';
    titles[file] = m[1].trim();
  }
  return titles;
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

function pandoc(texPath) {
  return execFileSync(
    'pandoc',
    ['-f', 'latex', '-t', 'gfm+tex_math_dollars', '--wrap=none', '--shift-heading-level-by=1', texPath],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
}

function frontmatter(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---`;
}

function main() {
  const refMap = buildRefMap();

  // references.json (single list; the .bib is identical across languages).
  const refs = parseBib(join(LANGS.en.dir, 'references.bib'));
  mkdirSync(join(ROOT, 'src/data'), { recursive: true });
  writeFileSync(join(ROOT, 'src/data/references.json'), JSON.stringify(refs, null, 2) + '\n');
  console.log(`references.json: ${refs.length} entries`);

  // Copy figure media (shared between languages).
  const mediaSrc = join(LANGS.en.dir, 'media');
  const mediaDst = join(ROOT, 'public/media');
  mkdirSync(mediaDst, { recursive: true });
  for (const f of readdirSync(mediaSrc)) copyFileSync(join(mediaSrc, f), join(mediaDst, f));
  console.log(`media: copied ${readdirSync(mediaSrc).length} files`);

  const tmp = join(ROOT, '.gen-tmp.tex');
  const importLine =
    "import Figure from '../../components/Figure.astro';\n" +
    "import ModelChart from '../../components/ModelChart.astro';\n" +
    "import Cite from '../../components/Cite.astro';\n" +
    "import Ref from '../../components/Ref.astro';";

  for (const lang of Object.keys(LANGS)) {
    const titles = chapterTitles(lang);
    const outDir = join(ROOT, 'src/content', lang);
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    CHAPTERS.forEach((ch, i) => {
      const texPath = join(LANGS[lang].dir, 'chapters', ch.src);
      const pre = preprocessTex(readFileSync(texPath, 'utf8'), lang);
      writeFileSync(tmp, pre);
      const md = pandoc(tmp);
      const body = postprocess(md, { lang, slug: ch.slug, refMap, refs });
      const fm = frontmatter({
        title: titles[ch.src] || ch.slug,
        order: i + 1,
        slug: ch.slug,
        lang,
      });
      const mdx = `${fm}\n\n${importLine}\n\n${body}\n`;
      writeFileSync(join(outDir, `${ch.slug}.mdx`), mdx);
    });
    console.log(`content/${lang}: ${CHAPTERS.length} chapters`);
  }
  rmSync(tmp, { force: true });
  console.log('done.');
}

main();
