/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/dic/grammar.rs
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
import { SudachiError } from "./error.js";
import { CharacterCategory } from "./character-category.js";
import type { ConnectionMatrix } from "./connect.js";

export const POS_DEPTH = 6;
export type PartOfSpeech = readonly [
  string,
  string,
  string,
  string,
  string,
  string
];

export class Grammar {
  static readonly INHIBITED_CONNECTION = 0x7fff;
  static readonly BOS_PARAMETER = [0, 0, 0] as const;
  static readonly EOS_PARAMETER = [0, 0, 0] as const;

  readonly posList: PartOfSpeech[];
  readonly storageSize: number;
  characterCategory = CharacterCategory.default();
  readonly connection: ConnectionMatrix;

  private constructor(
    posList: PartOfSpeech[],
    storageSize: number,
    connection: ConnectionMatrix
  ) {
    this.posList = posList;
    this.storageSize = storageSize;
    this.connection = connection;
  }

  static fromParts(
    posList: PartOfSpeech[],
    connection: ConnectionMatrix,
    storageSize = 0
  ): Grammar {
    return new Grammar(posList, storageSize, connection);
  }

  connectCost(leftId: number, rightId: number): number {
    return this.connection.cost(leftId, rightId);
  }

  setConnectCost(leftId: number, rightId: number, cost: number): void {
    this.connection.update(leftId, rightId, cost);
  }

  getPartOfSpeechId(pos: readonly string[]): number | undefined {
    if (pos.length !== POS_DEPTH) {
      return undefined;
    }

    return this.posList.findIndex((candidate) =>
      candidate.every((component, index) => component === pos[index])
    );
  }

  registerPos(pos: readonly string[]): number {
    if (pos.length !== POS_DEPTH) {
      throw new SudachiError({
        code: "InvalidPartOfSpeech",
        message: `Invalid part of speech: ${pos.join(",")}`
      });
    }

    const existing = this.getPartOfSpeechId(pos);
    if (existing !== undefined && existing >= 0) {
      return existing;
    }

    if (this.posList.length > 0xffff) {
      throw new SudachiError({
        code: "InvalidPartOfSpeech",
        message: "Invalid part of speech: Too much POS tags registered"
      });
    }

    this.posList.push(toPartOfSpeech([...pos]));
    return this.posList.length - 1;
  }

  posComponents(posId: number): PartOfSpeech {
    const pos = this.posList[posId];
    if (pos === undefined) {
      throw SudachiError.invalidRange(posId, this.posList.length);
    }
    return pos;
  }

  merge(other: Grammar): void {
    this.posList.push(...other.posList);
  }
}

function toPartOfSpeech(components: string[]): PartOfSpeech {
  if (components.length !== POS_DEPTH) {
    throw new SudachiError({
      code: "InvalidPartOfSpeech",
      message: `Invalid part of speech: ${components.join(",")}`
    });
  }
  return [
    components[0] ?? unreachablePartOfSpeech(),
    components[1] ?? unreachablePartOfSpeech(),
    components[2] ?? unreachablePartOfSpeech(),
    components[3] ?? unreachablePartOfSpeech(),
    components[4] ?? unreachablePartOfSpeech(),
    components[5] ?? unreachablePartOfSpeech()
  ];
}

function unreachablePartOfSpeech(): never {
  throw new SudachiError({
    code: "InvalidPartOfSpeech",
    message: "Invalid part of speech: missing component"
  });
}
