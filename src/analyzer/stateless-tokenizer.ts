/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/stateless_tokenizer.rs
 *
 * Copyright (c) 2021-2024 Works Applications Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file has been modified: ported from Rust to TypeScript and adapted
 * for HaruMT.
 */
import type { Dictionary } from "./dictionary.js";
import type { InputBuffer } from "./input-text.js";
import { Mode } from "./mode.js";
import { MorphemeList, type Morpheme } from "./morpheme.js";
import type { InputTextPlugin } from "./plugin.js";
import type { ProlongedReductionContract } from "./reduction-variant.js";
import { StatefulTokenizer } from "./stateful-tokenizer.js";

export class StatelessTokenizer {
  constructor(readonly dictionary: Dictionary) {}

  tokenize(
    text: string,
    mode: Mode = Mode.C,
    inputPlugins?: readonly InputTextPlugin[],
    prolongedReduction?: ProlongedReductionContract
  ): MorphemeList {
    const { nodes, input } = new StatefulTokenizer(this.dictionary, mode, prolongedReduction)
      .tokenizeWithInput(text, mode, inputPlugins);
    const morphemes = this.rewritePath(
      MorphemeList.fromResultNodes(this.dictionary, nodes, input),
      input
    );
    if (mode === Mode.C) {
      return morphemes;
    }

    return new MorphemeList(
      this.dictionary,
      morphemes.flatMap((morpheme) => {
        const splits = morpheme.split(mode);
        return splits.length > 0 ? [...splits] : [morpheme];
      }),
      input
    );
  }

  private rewritePath(morphemes: MorphemeList, input: InputBuffer): MorphemeList {
    const segments = barrierFreeSegments(morphemes, input);
    if (segments.length <= 1) {
      return this.rewriteSegment(morphemes, input);
    }
    const rewritten = segments.flatMap((segment) => [
      ...this.rewriteSegment(new MorphemeList(this.dictionary, segment, input), input)
    ]);
    return new MorphemeList(this.dictionary, rewritten, input);
  }

  private rewriteSegment(segment: MorphemeList, input: InputBuffer): MorphemeList {
    let path = segment;
    for (const plugin of this.dictionary.pathRewritePlugins) {
      path = plugin.rewrite(path, input);
    }
    return path;
  }
}

function barrierFreeSegments(
  morphemes: MorphemeList,
  input: InputBuffer
): readonly (readonly Morpheme[])[] {
  const segments: Morpheme[][] = [];
  let current: Morpheme[] = [];
  for (const morpheme of morphemes) {
    if (current.length > 0 && input.hasBarrierBefore(morpheme.currentBeginC)) {
      segments.push(current);
      current = [];
    }
    current.push(morpheme);
  }
  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
}
