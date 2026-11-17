/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/config.rs
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
import { InfoSubset } from "./subset.js";
import { SudachiError } from "./error.js";

export enum SurfaceProjection {
  Surface = "surface",
  Normalized = "normalized",
  Reading = "reading",
  Dictionary = "dictionary",
  DictionaryAndSurface = "dictionary_and_surface",
  NormalizedAndSurface = "normalized_and_surface",
  NormalizedNouns = "normalized_nouns"
}

export interface RawConfig {
  path?: string;
  systemDict?: string;
  system?: string;
  userDict?: string[];
  user?: string[];
  characterDefinitionFile?: string;
  projection?: SurfaceProjection;
  config?: InlineRuntimeConfig;
}

export interface InlineRuntimeConfigFile {
  config: InlineRuntimeConfig;
}

export interface InlineRegexOovConfig {
  pos?: string[];
  leftId?: number;
  rightId?: number;
  cost?: number;
  regex?: string;
  maxLength?: number;
  boundaries?: "strict" | "relaxed";
}

export interface InlineRuntimeConfig {
  oovProvider?: {
    mecab?: Record<string, unknown>;
    simple?: InlineSimpleOovConfig;
    regex?: InlineRegexOovConfig[];
  };
  charCategories?: InlineCharCategories;
  unknowns?: InlineUnknownConfig[];
  ignoreNormalize?: string[];
  replaceChars?: Record<string, string>;
}

export type InlineCharCategories = Record<string, InlineCharCategoryConfig>;

export interface InlineCharCategoryConfig {
  invoke?: boolean;
  group?: boolean;
  length?: number;
  mapping?: string;
}

export interface InlineSimpleOovConfig {
  pos?: string[];
  posId?: string[] | number;
  leftId?: number;
  rightId?: number;
  cost?: number;
}

export interface InlineUnknownConfig {
  category?: string;
  pos?: string[];
  posId?: string[] | number;
  leftId?: number;
  rightId?: number;
  cost?: number;
}

export class Config {
  readonly systemDict: string | undefined;
  readonly userDicts: string[];
  readonly characterDefinitionFile: string;
  readonly projection: SurfaceProjection;
  readonly inlineRuntimeConfig: InlineRuntimeConfig | undefined;

  constructor(raw: RawConfig) {
    this.systemDict = raw.systemDict ?? raw.system;
    this.userDicts = raw.userDict ?? raw.user ?? [];
    this.characterDefinitionFile = raw.characterDefinitionFile ?? "char.def";
    this.projection = raw.projection ?? SurfaceProjection.Surface;
    this.inlineRuntimeConfig = isRecord(raw.config) ? raw.config : undefined;
  }

  static fromJson(raw: RawConfig): Config {
    return new Config(raw);
  }

  requireSystemDict(): string {
    if (this.systemDict === undefined) {
      throw new SudachiError({
        code: "ConfigError",
        message: "Argument systemDict is missing"
      });
    }
    return this.systemDict;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSurfaceProjection(value: string): SurfaceProjection {
  if (Object.values(SurfaceProjection).includes(value as SurfaceProjection)) {
    return value as SurfaceProjection;
  }
  throw new SudachiError({
    code: "ConfigError",
    message: `Invalid format: unknown projection: ${value}`
  });
}

export function requiredInfoSubsetForProjection(
  projection: SurfaceProjection
): InfoSubset {
  switch (projection) {
    case SurfaceProjection.Surface:
      return InfoSubset.empty();
    case SurfaceProjection.Normalized:
    case SurfaceProjection.NormalizedAndSurface:
    case SurfaceProjection.NormalizedNouns:
      return InfoSubset.NORMALIZED_FORM;
    case SurfaceProjection.Reading:
      return InfoSubset.READING_FORM;
    case SurfaceProjection.Dictionary:
    case SurfaceProjection.DictionaryAndSurface:
      return InfoSubset.DIC_FORM_WORD_ID;
  }
}
