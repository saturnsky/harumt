# HaruMT — Haru Machine Translator (하루)

[한국어](README.md)

**An open-source, rule-based Japanese-to-Korean translator that runs on the CPU alone**

[![npm](https://img.shields.io/npm/v/harumt)](https://www.npmjs.com/package/harumt)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE.Apache)
[![Bundled data](https://img.shields.io/badge/bundled%20data-Apache--2.0%20%7C%20CC--BY--SA--4.0%20%7C%20Unicode--3.0-lightgrey)](#license)

```ts
import { createTranslationPipeline } from "harumt";

const pipeline = await createTranslationPipeline();
await pipeline.translate("駅まで歩いて行きました。");
// → 역까지 걸어서 갔어요.
```

**Try it now** — translate in your browser without installing anything: **[harumt.saturnsky.io](https://harumt.saturnsky.io)**
(downloads about 110 MB of dictionary data once; translation runs entirely in the browser).

This is a short English overview. The [Korean README](README.md) is the full documentation
(all options, the browser entry point, the diagnostic CLI).

## About

Japanese and Korean share much of their word order and grammar, which makes the pair unusually well suited to
rule-based machine translation (RBMT). HaruMT is not a general-purpose RBMT engine. It goes deep into the
correspondences specific to **Japanese and Korean** to get better output for this one pair.

The name means "mayfly". Yesterday, one person could not have built a translator like this. Tomorrow, LLMs will
make RBMT unnecessary. It is a project that can only live in this moment.

**Strengths**

- **Runs on the CPU alone** — no GPU, no external API.
- **Reproducible** — the same version with the same dictionary always gives the same output. Pin the package
  version if you need the output to stay fixed.
- **Private** — the text you translate never leaves your machine.

**Limitations**

- It does not understand context or nuance in depth.
- Ambiguous expressions are often translated wrongly.
- New words and expressions are not handled until the dictionary is updated.

These come from the rule-based approach itself and will not go away in later versions. Improvements from here
will be gradual: one word and one sentence pattern at a time.

On a set of 167 LLM-written synthetic items graded blind against Google Translate (HaruMT 0.1.1, Google output collected 2026-11-11),
HaruMT alone was rated OK on 31 items, Google alone on 18, both on 57 and neither on 61. On this set HaruMT was rated OK more often on
single sentences with clear grammar, and Google on web-novel style, proper names and multi-sentence text.
The grading is a single LLM pass, so treat it as a reference. All sentences, both outputs and the criteria are in
[COMPARISON.md](https://github.com/saturnsky/harumt/blob/main/COMPARISON.md) (Korean).

## Install

Requires Node.js 22 or later.

```bash
npm install harumt
npx harumt-fetch-dictionary
```

The system dictionary (about 300 MB) is distributed separately from the npm package.
`npx harumt-fetch-dictionary` downloads it from the Releases of the
[HaruMT GitHub repository](https://github.com/saturnsky/harumt) into your user data directory, so it survives
package updates and reinstalls:

- **Linux** — `$XDG_DATA_HOME/harumt/dict/` (default `~/.local/share/harumt/dict/`)
- **macOS** — `~/Library/Application Support/harumt/dict/`
- **Windows** — `%LOCALAPPDATA%\harumt\dict\`

`npm uninstall harumt` does not remove the dictionary; delete the `harumt/` directory above yourself.

In 0.x versions the API may change between releases. Changes are listed in the [changelog](CHANGELOG.md).

## Usage

```ts
import { createTranslationPipeline } from "harumt";

const pipeline = await createTranslationPipeline();
console.log(await pipeline.translate("駅まで歩いて行きました。"));
// 역까지 걸어서 갔어요.

const formal = await createTranslationPipeline({
  register: "formal",
});
console.log(await formal.translate("駅まで歩いて行きました。"));
// 역까지 걸어서 갔습니다.
```

Creating the first pipeline takes about a second while the dictionary loads. As a reference (Apple M4, Node.js 22,
one process, single thread): about 180 sentences (5,500 characters) per second, about 0.5 GB of memory right after
loading and up to about 0.7 GB during continuous translation.

`translateWithWarnings(text)` also returns warnings raised during translation, which helps pick out sentences
whose quality may have suffered. A user dictionary for personal names, the browser entry point
(`harumt/webext`) and the diagnostic CLI (`npx harumt-diagnose`) are described in the
[Korean README](README.md).

The output speech level follows the `register` option together with the politeness of the source sentence:

| `register` | Polite source (ます/です) | Plain source (だ/る) | Suited to |
|------------|--------------------------|----------------------|-----------|
| `"casual"` (default) | 해요체 — 갔어요 | 해체 — 갔어 | conversation, subtitles |
| `"formal"` | 합쇼체 — 갔습니다 | 서술체 — 갔다 | written text, news, reports |

## Development and feedback

HaruMT is developed in a separate internal repository. This public repository is a snapshot generated from it
on each release, so the commit history is per release only, and comments and tests are not included yet (they
will be published in stages once cleaned up).

The project was designed by its author; a large part of the code and of the Korean renderings in the dictionary
was written with the help of LLMs. Every change is checked by comparing the translation of the whole internal
corpus against the previous version for improvements and regressions.

Because of this workflow, pull requests are not accepted yet. Bug reports and suggestions are welcome through
[GitHub Issues](https://github.com/saturnsky/harumt/issues); see [CONTRIBUTING](CONTRIBUTING.md) for how to
report and how reports are handled.

You can also support development through [GitHub Sponsors](https://github.com/sponsors/saturnsky).

## Acknowledgements

Many thanks to [lifthrasiir](https://github.com/lifthrasiir) for major contributions to the data structures, the
dictionary data and the annotation interface.

HaruMT's morphological analysis stands on [Sudachi](https://github.com/WorksApplications/Sudachi) by Works
Applications: the analyzer is a TypeScript port of [sudachi.rs](https://github.com/WorksApplications/sudachi.rs),
and the system dictionary is converted from [SudachiDict](https://github.com/WorksApplications/SudachiDict).
Kanji readings are handled with [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) by the EDRDG.

## License

HaruMT's code and dictionary data are distributed under the [Apache License 2.0](LICENSE.Apache).
Two parts keep the license of the work they are derived from:

- `src/third-party/kanjidic2/` (kanji reading tables) — from [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) (EDRDG), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- `src/third-party/unihan/` (Korean readings of kanji) — from [Unihan](https://www.unicode.org/charts/unihan.html) (Unicode, Inc.), under the [Unicode License v3](https://www.unicode.org/license.txt)

The source and license notices for these parts are in `src/third-party/kanjidic2/LICENSE` and `src/third-party/unihan/LICENSE`.
For notices of the other bundled third-party data and code, see [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and
[`licenses/`](licenses/).
