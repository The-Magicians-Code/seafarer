# Seafarer — interactive web edition

An [Astro](https://astro.build) site that re-publishes the bachelor's thesis
*Improving situational awareness of autonomous vessels using computer vision*
(Tanel Treuberg, TalTech 2023) as a bilingual reading experience, alongside the
existing PDF builds.

- **Live charts** — the model-comparison figures (results chapter) are rendered
  as interactive [Observable Plot](https://observablehq.com/plot/) SVGs instead
  of static screenshots.
- **Bilingual** — Estonian and English, driven by a `[lang]` route segment
  (`/et/…`, `/en/…`); content comes straight from the LaTeX sources.
- **Math** — KaTeX via `remark-math` + `rehype-katex`.
- **Citations & cross-references** — `\cite` / `\ref` survive the conversion as
  working links (numbered references with hover titles; figure/table xrefs).
- Deployed under `https://themagicianscode.dev/seafarer/`; the embedded-PDF
  fallback stays at `/seafarer/pdf/`.

## Project layout

```
web/
  scripts/generate.mjs     content pipeline (LaTeX -> MDX + references.json)
  src/
    content/{et,en}/*.mdx   generated chapters (committed; do not hand-edit)
    data/
      references.json       generated from references.bib
      benchmarks.json       hand-digitised chart data (see provenance note)
    components/             Figure, ModelChart (island), Cite, Ref, LangToggle
    layouts/ThesisLayout.astro
    pages/                  index (redirect), [lang]/index, [lang]/[chapter], [lang]/references
  public/media/            figure images (copied from ../faithful-en/media)
```

## Develop

```sh
cd web
npm install
npm run dev      # http://localhost:4321/seafarer/
npm run build    # -> dist/
```

## Regenerating content

The chapter MDX and `references.json` are **generated** from the LaTeX sources
(`../faithful` for Estonian, `../faithful-en` for English) and committed so that
CI can build the site without extra tooling. To regenerate after editing the
sources:

```sh
# requires pandoc >= 3.1 on PATH
npm run gen
```

`generate.mjs` pre-processes the `.tex` (strips `>{...}` column decorators that
otherwise make pandoc drop leading numbers in table cells; swaps the
accuracy-formula image for real math; tokenises `\cite`/`\ref`), runs
`pandoc latex -> gfm`, then rewrites the result into MDX components.

## Chart data provenance

The author never published the raw 1000-run inference CSVs (the repo linked in
the thesis, `github.com/The-Magicians-Code/yolo-dualdev`, contains only
tooling). The numbers in `src/data/benchmarks.json` were therefore **digitised
by hand from the original chart screenshots** (`faithful/media/image24-27.png`)
and are approximate read-offs, not the underlying measurements. They reproduce
the published figures and cross-check against the prose (e.g. the fastest-minus-
slowest FP16 deltas of 108 / 40 / 52 / 16 FPS). See the `_provenance` field in
that file.
