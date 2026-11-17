/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/error.rs
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
export type SudachiErrorCode =
  | "ErrWithContext"
  | "Io"
  | "ParseIntError"
  | "FromUtf16"
  | "RegexError"
  | "NomParseError"
  | "InvalidUtf16FromNom"
  | "SerdeError"
  | "InvalidCharacterCategory"
  | "ConfigError"
  | "InvalidHeader"
  | "LexiconSetError"
  | "PluginError"
  | "EosBosDisconnect"
  | "InvalidCharacterCategoryType"
  | "InvalidDataFormat"
  | "InvalidDictionaryGrammar"
  | "InvalidPartOfSpeech"
  | "InvalidRange"
  | "NoOOVPluginProvided"
  | "InputTooLong"
  | "DictionaryCompilationError"
  | "MorphemeListBorrowed";

export interface SudachiErrorOptions {
  code: SudachiErrorCode;
  message: string;
  cause?: unknown;
  context?: string;
}

export class SudachiError extends Error {
  readonly code: SudachiErrorCode;
  readonly context: string | undefined;

  constructor(options: SudachiErrorOptions) {
    super(options.context ? `${options.context}: ${options.message}` : options.message, {
      cause: options.cause
    });
    this.name = "SudachiError";
    this.code = options.code;
    this.context = options.context;
  }

  withContext(context: string): SudachiError {
    return new SudachiError({
      code: this.code === "Io" ? "Io" : "ErrWithContext",
      message: this.message,
      cause: this,
      context
    });
  }

  static io(cause: unknown, context = "IO Error"): SudachiError {
    return new SudachiError({
      code: "Io",
      message: errorMessage(cause),
      cause,
      context
    });
  }

  static invalidCharacterCategoryType(value: string): SudachiError {
    return new SudachiError({
      code: "InvalidCharacterCategoryType",
      message: `Invalid character category type: ${value}`
    });
  }

  static invalidDataFormat(line: number, message: string): SudachiError {
    return new SudachiError({
      code: "InvalidDataFormat",
      message: `Invalid data format: ${message} at line ${line}`
    });
  }

  static invalidRange(start: number, end: number): SudachiError {
    return new SudachiError({
      code: "InvalidRange",
      message: `Invalid range: ${start}..${end}`
    });
  }

  static inputTooLong(actualBytes: number, maxBytes: number): SudachiError {
    return new SudachiError({
      code: "InputTooLong",
      message: `Input is too long, it can't be more than ${maxBytes} bytes, was ${actualBytes}`
    });
  }
}

export type SudachiResult<T> = T;

function errorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}
