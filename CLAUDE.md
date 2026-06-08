# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Archive of a completed BSc thesis (Tallinn University of Technology, 2023):
"Improving situational awareness of autonomous vessels using computer vision"
by Tanel Treuberg. Not a living codebase — treat the submitted content as
read-only unless the user explicitly asks to revise it.

## Layout

- `current-state/thesis.tex` — main LaTeX source (pandoc-converted from the original `.docx`, then hand-cleaned).
- `current-state/thesis.pdf` — compiled output.
- `current-state/thesis_with_media/media/media/` — figures (triple-nested path is a pandoc artifact; preserve it when editing image refs).
- `source-files/Treuberg_Lõputöö.docx` / `.pdf` — original as-submitted authoring files. Do not modify.

## Build

LaTeX-only, no Makefile:

```
cd current-state && pdflatex thesis.tex && pdflatex thesis.tex
```

Two passes are needed for the ToC and cross-references. `xelatex` / `lualatex`
also work if a package needs them.

## Conventions

- The `.tex` preamble disables microtype, uses `parskip`, and redefines
  `\paragraph` — leave these alone unless the user asks.
- Primary language is English; some Estonian appears in source filenames and
  front matter.
