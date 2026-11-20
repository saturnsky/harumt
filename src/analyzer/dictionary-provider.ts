import type { Config } from "./config.js";
import type { Grammar } from "./grammar.js";
import type { LexiconLike } from "./lexicon-set.js";

export interface DictionaryDataSource {
  readonly byteLength: number;
  slice(offset: number, length: number): Uint8Array;
  readSection?(offset: number, length: number): Uint8Array;
  close(): void;
}

export function readDictionarySection(source: DictionaryDataSource, offset: number, length: number): Uint8Array {
  return source.readSection !== undefined ? source.readSection(offset, length) : source.slice(offset, length);
}

export interface DictionaryProvider {
  readConfiguration(path: string): Promise<Config>;
  readGrammar(config: Config): Promise<Grammar>;
  readLexicon(config: Config): Promise<LexiconLike>;
  readUserLexicons(config: Config, grammar: Grammar): Promise<LexiconLike[]>;
  readText(path: string): Promise<string>;
}

export class EagerDataSource implements DictionaryDataSource {
  readonly byteLength: number;

  constructor(private readonly bytes: Uint8Array) {
    this.byteLength = bytes.byteLength;
  }

  slice(offset: number, length: number): Uint8Array {
    const end = Math.min(offset + length, this.byteLength);
    return this.bytes.subarray(offset, end);
  }

  close(): void {}
}
