/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/analysis/mod.rs
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

export enum Mode {
  A = "A",
  B = "B",
  C = "C"
}

export function parseMode(value: string): Mode {
  switch (value) {
    case "A":
    case "a":
      return Mode.A;
    case "B":
    case "b":
      return Mode.B;
    case "C":
    case "c":
      return Mode.C;
    default:
      throw new SudachiError({
        code: "InvalidDataFormat",
        message:
          'Mode must be one of "A", "B", or "C" (in lower or upper case).'
      });
  }
}

export function formatMode(mode: Mode): string {
  return mode;
}
