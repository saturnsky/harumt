/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/lexicon/word_infos.rs
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
import { WordId } from "./word-id.js";

export interface WordInfoData {
  surface: string;
  headWordLength: number;
  posId: number;
  normalizedForm: string;
  dictionaryFormWordId: number;
  dictionaryForm: string;
  readingForm: string;
  aUnitSplit: WordId[];
  bUnitSplit: WordId[];
  wordStructure: WordId[];
  synonymGroupIds: number[];
}

export class WordInfo {
  constructor(readonly data: WordInfoData) {}

  surface(): string {
    return this.data.surface;
  }

  headWordLength(): number {
    return this.data.headWordLength;
  }

  posId(): number {
    return this.data.posId;
  }

  normalizedForm(): string {
    return this.data.normalizedForm.length === 0
      ? this.surface()
      : this.data.normalizedForm;
  }

  dictionaryFormWordId(): number {
    return this.data.dictionaryFormWordId;
  }

  dictionaryForm(): string {
    return this.data.dictionaryForm.length === 0
      ? this.surface()
      : this.data.dictionaryForm;
  }

  readingForm(): string {
    return this.data.readingForm.length === 0
      ? this.surface()
      : this.data.readingForm;
  }

  aUnitSplit(): readonly WordId[] {
    return this.data.aUnitSplit;
  }

  bUnitSplit(): readonly WordId[] {
    return this.data.bUnitSplit;
  }

  wordStructure(): readonly WordId[] {
    return this.data.wordStructure;
  }

  synonymGroupIds(): readonly number[] {
    return this.data.synonymGroupIds;
  }
}
