# Third-Party Notices

This project incorporates code and data derived from external sources.
Attribution and license obligations for each are listed below. The project
itself — code and dictionary data alike — is licensed under the Apache
License 2.0 (`LICENSE.Apache`), except where a section below states
otherwise.

---

## sudachi.rs

The morphological analyzer in `src/analyzer/` is derived from
[sudachi.rs](https://github.com/WorksApplications/sudachi.rs), the Rust
implementation of the Sudachi Japanese morphological analyzer, ported to
TypeScript.

- **Project**: <https://github.com/WorksApplications/sudachi.rs>
- **Rightsholder**: Works Applications Co., Ltd.
- **License**: Apache License 2.0 —
  <https://www.apache.org/licenses/LICENSE-2.0>.
- **Local notice**: `LICENSE.Apache`.
- **Modifications**: ported from Rust to TypeScript and adapted to the
  project's analyzer interface. Dictionary loading and plugin configuration
  are project-specific; the plugin algorithms themselves are ported. Files
  that contain ported code carry a header naming the upstream source file;
  files in `src/analyzer/` without that header were written for this
  project. The analyzer's default settings are converted from the default
  resources of Sudachi (`sudachi.json`, `char.def`, `unk.def`,
  `rewrite.def`).

---

## SudachiDict

The binary system dictionary used by the analyzer (`system.hrdic`,
`system.hridx`) is converted from the SudachiDict full dictionary
(release 20260116) by a conversion tool that is not part of this
package.
The conjugation templates (`data/dict/analyzer-lexicon/conjugation-templates.json`)
are generated from the same dictionary.

- **Project**: <https://github.com/WorksApplications/SudachiDict>
- **Rightsholder**: Works Applications Co., Ltd.
- **License**: Apache License 2.0 —
  <https://www.apache.org/licenses/LICENSE-2.0>.
- **Upstream resources**: SudachiDict incorporates UniDic (BSD-style
  license, The UniDic Consortium) and mecab-unidic-NEologd (Apache License
  2.0, Toshinori Sato) together with the further sources acknowledged in
  its legal notice.
- **Local notice**: `licenses/SudachiDict-LEGAL.txt` (SudachiDict `LEGAL`,
  verbatim — includes the UniDic redistribution conditions and disclaimer).
- **Modifications**: the dictionary is re-encoded into the project's own
  binary format (lexicon and index files); entry content is not altered.

---

## Japanese WordNet

Part of the morpheme dictionary entries in `data/dict/morpheme/` were
built from Japanese WordNet synsets: Japanese headwords and their sense
grouping are taken from Japanese WordNet, while the Korean renderings were
produced independently for this project.

- **Project**: <https://bond-lab.github.io/wnja/>
- **Rightsholders**: National Institute of Information and Communications
  Technology (NICT); Francis Bond; Takayuki Kuribayashi.
- **License**: Japanese WordNet license (permissive; the copyright notice,
  statements and disclaimer must accompany all copies, including
  modifications).
- **Local notice**: `licenses/japanese-wordnet.txt` (verbatim).
- **Modifications**: synset lemmas are extracted, filtered and merged into
  the project's morpheme dictionary schema with project-authored Korean
  translations.

---

## KANJIDIC2

The kanji reading tables in `src/third-party/kanjidic2/` are derived from
the KANJIDIC2 file. They are consumed at runtime by the kanji-reading
alignment used for long-vowel boundary detection in Japanese-to-Korean
transliteration and by the Sino-Korean reading generator. They are kept in
their own directory so that their independent license terms remain clear.

- **Project**: <https://www.edrdg.org/wiki/index.php/KANJIDIC_Project>
- **Rightsholder**: Electronic Dictionary Research and Development Group
  (EDRDG), Monash University, Australia. <https://www.edrdg.org/>
- **License**: Creative Commons Attribution-ShareAlike 4.0 International
  (CC BY-SA 4.0) — <https://creativecommons.org/licenses/by-sa/4.0/>.
  This license applies to the files in `src/third-party/kanjidic2/` only.
- **Local notice**: `src/third-party/kanjidic2/LICENSE`.
- **Modifications**: only `<ja_on>`, the base portion of `<ja_kun>`
  (okurigana `.` tail and prefix/suffix `-` markers stripped), `<nanori>`
  and `<reading r_type="korean_h">` readings are extracted; Japanese
  readings are normalized to katakana; entries are serialized as
  TypeScript object literals.

EDRDG's attribution requirements are met by this file, the local
`LICENSE` file and the attribution headers in the generated data modules.
Downstream redistributors must preserve all three.

---

## Unihan (kHangul, kKorean)

`src/third-party/unihan/hanja-readings.ts`, a table of representative
Korean readings for CJK unified ideographs not covered by KANJIDIC2, is
generated from the Unihan database.

- **Source**: Unicode Character Database — Unihan
  (<https://www.unicode.org/charts/unihan.html>).
- **Rightsholder**: Unicode, Inc.
- **License**: Unicode License v3 — <https://www.unicode.org/license.txt>.
- **Local notice**: `src/third-party/unihan/LICENSE` (verbatim).
- **Modifications**: one representative reading per character is selected
  from `kHangul`/`kKorean` and serialized as a TypeScript object literal.
