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
import { Config, type InlineRuntimeConfig } from "./config.js";
import { SudachiError } from "./error.js";
import { ConnectionMatrix } from "./connect.js";
import {
  type DictionaryDataSource,
  type DictionaryProvider
} from "./dictionary-provider.js";
import { Grammar, type PartOfSpeech } from "./grammar.js";
import { InfoSubset } from "./subset.js";
import type { LexiconEntry } from "./lexicon-set.js";
import { Trie } from "./read/trie.js";
import { WordInfo, type WordInfoData } from "./word-info.js";
import type { LexiconLike } from "./lexicon-set.js";
import { BinaryReader } from "./read/index.js";
import { WordId } from "./word-id.js";

const HARU_DIC_MAGIC = "1daaeeb1aae20c2d";
const HARU_IDX_MAGIC = "1daaeeb1aae2217d";

export interface HaruDictionarySourceProvider {
  openBinary(path: string): DictionaryDataSource;
  readText(path: string): string;
}

interface HaruMetadata {
  readonly version: number;
  readonly source?: { readonly description?: string; readonly hasSynonymGroupIds?: boolean };
  readonly config: InlineRuntimeConfig;
  readonly strings: HaruStringTables;
  readonly posList: HaruSection & { readonly count: number };
  readonly connections: HaruSection & {
    readonly quantBits: number;
    readonly leftIdSize: number;
    readonly rightIdSize: number;
  };
  readonly trie: HaruSection & { readonly count: number };
  readonly wordIdTable: HaruSection;
  readonly wordParams: HaruSection & { readonly count: number };
  readonly wordInfo: HaruSection;
}

interface HaruSection {
  readonly start: number;
  readonly size: number;
}

interface HaruStringTables {
  readonly singleByteSymbols: readonly number[];
  readonly miscHighBytes: readonly number[];
}

export class HaruDictionaryProvider implements DictionaryProvider {
  private metadataCache: HaruMetadata | undefined;

  constructor(
    private dictionaryPath: string,
    private readonly sourceProvider: HaruDictionarySourceProvider
  ) {}

  async readConfiguration(path: string): Promise<Config> {
    this.dictionaryPath = path;
    const metadata = this.metadata();
    return Config.fromJson({
      systemDict: this.dictionaryPath,
      config: metadata.config
    });
  }

  async readGrammar(_config: Config): Promise<Grammar> {
    const metadata = this.metadata();
    const strings = new HaruStringCodec(metadata.strings);
    const source = this.dictionarySource();
    const posList = readHaruPosList(
      source.slice(metadata.posList.start, metadata.posList.size),
      metadata.posList.count,
      strings
    );
    const connection = this.readConnectionMatrix(source, metadata);
    return Grammar.fromParts(posList, connection, metadata.posList.size + metadata.connections.size);
  }

  async readLexicon(_config: Config): Promise<LexiconLike> {
    const metadata = this.metadata();
    const strings = new HaruStringCodec(metadata.strings);
    const trieSource = this.sourceForSection(metadata.trie.start);
    const wordIdTableSource = this.sourceForSection(metadata.wordIdTable.start);
    const wordParamSource = this.sourceForSection(metadata.wordParams.start);
    const wordInfoSource = this.sourceForSection(metadata.wordInfo.start);
    const trie = Trie.fromSource(
      trieSource,
      sectionOffset(metadata.trie.start),
      metadata.trie.count
    );
    const wordParams = new HaruWordParams(
      wordParamSource,
      sectionOffset(metadata.wordParams.start),
      metadata.wordParams.count
    );
    const wordInfos = new HaruWordInfos(
      wordInfoSource,
      sectionOffset(metadata.wordInfo.start),
      metadata.wordParams.count,
      wordParams,
      strings
    );
    const lexicon = new HaruLexicon(
      trie,
      new HaruWordIdTable(
        wordIdTableSource,
        sectionOffset(metadata.wordIdTable.start)
      ),
      wordParams,
      wordInfos,
      strings
    );
    wordInfos.setSurfaceLookup((surface) => lexicon.wordIdsForExactSurface(surface));
    return lexicon;
  }

  async readUserLexicons(_config: Config, _grammar: Grammar): Promise<LexiconLike[]> {
    return [];
  }

  async readText(path: string): Promise<string> {
    return this.sourceProvider.readText(path);
  }

  private metadata(): HaruMetadata {
    if (this.metadataCache !== undefined) return this.metadataCache;
    const source = this.dictionarySource();
    try {
      assertMagic(source.slice(0, 8), HARU_DIC_MAGIC, "HaruMT dictionary");
      const lenBytes = source.slice(8, 2);
      const length = new DataView(lenBytes.buffer, lenBytes.byteOffset, 2).getUint16(0, true);
      this.metadataCache = JSON.parse(new TextDecoder().decode(source.slice(10, length))) as HaruMetadata;
      return this.metadataCache;
    } finally {
      source.close();
    }
  }

  private readConnectionMatrix(source: DictionaryDataSource, metadata: HaruMetadata): ConnectionMatrix {
    if (metadata.connections.quantBits !== 16) {
      throw new SudachiError({
        code: "InvalidDictionaryGrammar",
        message: `Unsupported HaruMT connection quantization: ${metadata.connections.quantBits}`
      });
    }
    return ConnectionMatrix.fromSource(
      source,
      metadata.connections.start,
      metadata.connections.leftIdSize,
      metadata.connections.rightIdSize
    );
  }

  private dictionarySource(): DictionaryDataSource {
    return this.sourceProvider.openBinary(this.dictionaryPath);
  }

  private indexSource(): DictionaryDataSource {
    const idxPath = extname(this.dictionaryPath) === ".hrdic"
      ? `${this.dictionaryPath.slice(0, -".hrdic".length)}.hridx`
      : join(dirname(this.dictionaryPath), "system.hridx");
    const source = this.sourceProvider.openBinary(idxPath);
    assertMagic(source.slice(0, 8), HARU_IDX_MAGIC, "HaruMT index");
    return source;
  }

  private sourceForSection(start: number): DictionaryDataSource {
    return start < 0 ? this.indexSource() : this.dictionarySource();
  }
}

class HaruLexicon implements LexiconLike {
  private lexId = 0xff;
  private readonly utf8Encoder = new TextEncoder();
  private cachedLookupText: string | undefined;
  private cachedLookupBytes: Uint8Array | undefined;

  constructor(
    private readonly trie: Trie,
    private readonly wordIdTable: HaruWordIdTable,
    private readonly wordParams: HaruWordParams,
    private readonly wordInfos: HaruWordInfos,
    private readonly strings: HaruStringCodec
  ) {}

  setDicId(id: number): void {
    this.lexId = id;
  }

  lookup(input: string | Uint8Array, offset = 0): LexiconEntry[] {
    const bytes = typeof input === "string" ? this.utf8ForLookup(input) : input;
    if (offset < 0 || offset > bytes.byteLength || (offset < bytes.byteLength && (bytes[offset]! & 0xc0) === 0x80)) {
      return [];
    }

    const utf8Ends: number[] = [];
    let pending: readonly number[] = [];
    let pendingIndex = 0;
    let produced = 0;
    let bytePos = offset;
    const nextKey = (): number => {
      if (pendingIndex >= pending.length) {
        const decoded = decodeUtf8CodePoint(bytes, bytePos);
        if (decoded === undefined) return -1;
        const encoded = this.strings.encodeCodePoint(decoded.codePoint);
        if (encoded.length === 0) return -1;
        bytePos += decoded.byteLength;
        pending = encoded;
        pendingIndex = 0;
        utf8Ends[produced + encoded.length] = bytePos;
      }
      produced += 1;
      return pending[pendingIndex++]!;
    };

    const result: LexiconEntry[] = [];
    for (const entry of this.trie.commonPrefixEntriesOfStream(nextKey)) {
      const end = utf8Ends[entry.end];
      if (end === undefined) continue;
      for (const wordId of this.wordIdTable.entries(entry.value)) {
        const [leftId, rightId] = this.wordParams.getParams(wordId);
        if (leftId === 0xffff || rightId === 0xffff) continue;
        result.push({ wordId: WordId.new(this.lexId, wordId), end });
      }
    }
    return result;
  }

  getWordInfo(wordId: number, subset: InfoSubset): WordInfo {
    return this.wordInfos.getWordInfo(wordId, subset);
  }

  getWordParam(wordId: number): readonly [number, number, number] {
    return this.wordParams.getParams(wordId);
  }

  wordIdsForExactSurface(surface: string): readonly number[] {
    const starts = utf8ByteOffsets(surface);
    const encoded = this.strings.encodeWithEndMap(surface, starts);
    const result: number[] = [];
    for (const entry of this.trie.commonPrefixEntries(encoded.bytes, 0)) {
      if (entry.end !== encoded.bytes.byteLength) {
        continue;
      }
      for (const wordId of this.wordIdTable.entries(entry.value)) {
        result.push(wordId);
      }
    }
    return result;
  }

  private utf8ForLookup(text: string): Uint8Array {
    if (this.cachedLookupText !== text || this.cachedLookupBytes === undefined) {
      this.cachedLookupText = text;
      this.cachedLookupBytes = this.utf8Encoder.encode(text);
    }
    return this.cachedLookupBytes;
  }
}

class HaruWordIdTable {
  constructor(
    private readonly source: DictionaryDataSource,
    private readonly offset: number
  ) {}

  *entries(index: number): Iterable<number> {
    let offset = this.offset + index * 4;
    while (offset + 4 <= this.source.byteLength) {
      const bytes = this.source.slice(offset, 4);
      const raw = new DataView(bytes.buffer, bytes.byteOffset, 4).getUint32(0, true);
      yield raw & 0x7fff_ffff;
      offset += 4;
      if ((raw & 0x8000_0000) === 0) return;
    }
  }
}

class HaruWordParams {
  private readonly view: DataView;
  private readonly overrides = new Map<number, number>();

  constructor(
    source: DictionaryDataSource,
    offset: number,
    readonly size: number
  ) {
    const bytes = source.slice(offset, size * 10);
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  getParams(wordId: number): readonly [number, number, number] {
    const base = wordId * 10;
    const cost = (this.overrides.size > 0 ? this.overrides.get(wordId) : undefined) ?? this.view.getInt16(base + 4, true);
    return [this.view.getUint16(base, true), this.view.getUint16(base + 2, true), cost];
  }

  wordInfoOffset(wordId: number): number {
    return this.view.getUint32(wordId * 10 + 6, true);
  }

  setCost(wordId: number, cost: number): void {
    this.overrides.set(wordId, cost);
  }
}

class HaruWordInfos {
  private surfaceLookup: ((surface: string) => readonly number[]) | undefined;

  constructor(
    private readonly source: DictionaryDataSource,
    private readonly offset: number,
    private readonly wordSize: number,
    private readonly wordParams: HaruWordParams,
    private readonly strings: HaruStringCodec
  ) {}

  setSurfaceLookup(lookup: (surface: string) => readonly number[]): void {
    this.surfaceLookup = lookup;
  }

  getWordInfo(wordId: number, subset: InfoSubset): WordInfo {
    const info = this.parseWordInfo(wordId, subset);
    const dictionaryFormWordId = info.dictionaryFormWordId;
    if (
      dictionaryFormWordId >= 0 &&
      dictionaryFormWordId !== wordId &&
      dictionaryFormWordId < this.wordSize
    ) {
      info.dictionaryForm = this.parseWordInfo(dictionaryFormWordId, InfoSubset.SURFACE).surface;
    }
    return new WordInfo(info);
  }

  private parseWordInfo(wordId: number, _subset: InfoSubset): WordInfoData {
    const bytes = this.source.slice(this.offset + this.wordParams.wordInfoOffset(wordId), 2048);
    const reader = new BinaryReader(bytes);
    const surfaceLength = reader.readStringLength();
    const surfaceBytes = reader.readBytes(surfaceLength);
    const { surface, splitMarkers } = this.strings.decodeSurface(surfaceBytes);
    const headWordLength = reader.readStringLength();
    const posId = reader.readUint16();
    const dictionaryFormWordId = reader.readInt32();
    const readingLength = reader.readStringLength();
    const readingForm = this.strings.decodeReading(reader.readBytes(readingLength));
    const normalizedPatchLength = reader.readStringLength();
    const normalizedForm = this.strings.decodeNormalizedPatch(
      surface,
      reader.readBytes(normalizedPatchLength)
    );
    return {
      surface,
      headWordLength,
      posId,
      normalizedForm,
      dictionaryFormWordId,
      dictionaryForm: dictionaryFormWordId < 0 || dictionaryFormWordId === wordId ? surface : "",
      readingForm,
      aUnitSplit: this.resolveSplitWordIds(surface, splitMarkers.filter((marker) => marker.kind === "a")),
      bUnitSplit: this.resolveSplitWordIds(surface, splitMarkers.filter((marker) => marker.kind === "b")),
      wordStructure: [],
      synonymGroupIds: []
    };
  }

  private resolveSplitWordIds(surface: string, markers: readonly HaruSplitMarker[]): WordId[] {
    if (markers.length === 0) {
      return [];
    }
    const result: WordId[] = [];
    const chars = Array.from(surface);
    let start = 0;
    for (const marker of [...markers].sort((left, right) => left.charIndex - right.charIndex)) {
      const segment = chars.slice(start, marker.charIndex).join("");
      const wordId = this.wordIdForSurfaceOrdinal(segment, marker.ordinal);
      if (wordId === undefined) {
        return [];
      }
      result.push(WordId.new(0, wordId));
      start = marker.charIndex;
    }
    return start === chars.length ? result : [];
  }

  private wordIdForSurfaceOrdinal(surface: string, ordinal: number): number | undefined {
    if (surface.length === 0 || ordinal <= 0 || this.surfaceLookup === undefined) {
      return undefined;
    }
    return this.surfaceLookup(surface)[ordinal - 1];
  }
}

interface HaruSplitMarker {
  readonly charIndex: number;
  readonly kind: "a" | "b";
  readonly ordinal: number;
}

class HaruStringCodec {
  constructor(private readonly tables: HaruStringTables) {}

  decodeNormalizedPatch(surface: string, bytes: Uint8Array): string {
    if (bytes.byteLength === 0) {
      return "";
    }
    const first = bytes[0];
    const hasPrefixMarker = first !== undefined && first >= 0x01 && first <= 0x0f;
    const last = bytes[bytes.byteLength - 1];
    const hasSuffixMarker = bytes.byteLength > (hasPrefixMarker ? 1 : 0) &&
      last !== undefined &&
      last >= 0x01 &&
      last <= 0x0f;
    const prefixLength = hasPrefixMarker ? first : 0;
    const suffixLength = hasSuffixMarker ? last : 0;
    const replacementStart = hasPrefixMarker ? 1 : 0;
    const replacementEnd = bytes.byteLength - (hasSuffixMarker ? 1 : 0);
    const surfaceChars = Array.from(surface);
    return [
      ...surfaceChars.slice(0, prefixLength),
      this.decode(bytes.slice(replacementStart, replacementEnd)),
      ...surfaceChars.slice(surfaceChars.length - suffixLength)
    ].join("");
  }

  decodeSurface(bytes: Uint8Array): { surface: string; splitMarkers: HaruSplitMarker[] } {
    let result = "";
    const splitMarkers: HaruSplitMarker[] = [];
    let charIndex = 0;
    for (let index = 0; index < bytes.byteLength; index += 1) {
      const first = bytes[index]!;
      if (first >= 0x01 && first <= 0x0f) {
        const extended = first === 0x0f;
        const marker = extended ? bytes[++index] : first;
        if (marker !== undefined) {
          splitMarkers.push(splitMarkerFromByte(charIndex, marker, extended));
        }
        continue;
      }
      if (first >= 0x11 && first <= 0x63) {
        result += String.fromCharCode(0x3041 + first - 0x11);
        charIndex += 1;
        continue;
      }
      if (first >= 0x64 && first <= 0x6f) {
        result += String.fromCodePoint(this.tables.singleByteSymbols[first - 0x64] ?? 0xfffd);
        charIndex += 1;
        continue;
      }
      const second = bytes[++index];
      if (second === undefined) break;
      if (first >= 0x70 && first <= 0xad) {
        result += String.fromCodePoint(((this.tables.miscHighBytes[first - 0x70] ?? 0) << 8) | second);
      } else {
        result += String.fromCodePoint(((0x4e + first - 0xae) << 8) | second);
      }
      charIndex += 1;
    }
    return { surface: result, splitMarkers };
  }

  decode(bytes: Uint8Array): string {
    let result = "";
    for (let index = 0; index < bytes.byteLength; index += 1) {
      const first = bytes[index]!;
      if (first >= 0x01 && first <= 0x0f) {
        if (first === 0x0f) index += 1;
        continue;
      }
      if (first >= 0x11 && first <= 0x63) {
        result += String.fromCharCode(0x3041 + first - 0x11);
        continue;
      }
      if (first >= 0x64 && first <= 0x6f) {
        result += String.fromCodePoint(this.tables.singleByteSymbols[first - 0x64] ?? 0xfffd);
        continue;
      }
      const second = bytes[++index];
      if (second === undefined) break;
      if (first >= 0x70 && first <= 0xad) {
        result += String.fromCodePoint(((this.tables.miscHighBytes[first - 0x70] ?? 0) << 8) | second);
        continue;
      }
      result += String.fromCodePoint(((0x4e + first - 0xae) << 8) | second);
    }
    return result;
  }

  decodeReading(bytes: Uint8Array): string {
    return this.decode(bytes).replace(/[\u3041-\u3096]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) + 0x60)
    );
  }

  encodeWithEndMap(text: string, utf8Starts: readonly number[]): { bytes: Uint8Array; utf8Ends: number[] } {
    const bytes: number[] = [];
    const utf8Ends: number[] = [];
    let charIndex = 0;
    for (const char of text) {
      const encoded = this.encodeChar(char);
      if (encoded.length === 0) break;
      bytes.push(...encoded);
      const end = utf8Starts[charIndex + 1];
      if (end !== undefined) {
        utf8Ends[bytes.length] = end;
      }
      charIndex += 1;
    }
    return { bytes: new Uint8Array(bytes), utf8Ends };
  }

  private encodeChar(char: string): number[] {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return [];
    return this.encodeCodePoint(codePoint);
  }

  encodeCodePoint(codePoint: number): number[] {
    if (codePoint >= 0x3041 && codePoint <= 0x3093) {
      return [0x11 + codePoint - 0x3041];
    }
    const symbolIndex = this.tables.singleByteSymbols.indexOf(codePoint);
    if (symbolIndex >= 0) {
      return [0x64 + symbolIndex];
    }
    if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
      return [0xae + ((codePoint >> 8) - 0x4e), codePoint & 0xff];
    }
    const high = codePoint >> 8;
    const highIndex = this.tables.miscHighBytes.indexOf(high);
    if (highIndex >= 0) {
      return [0x70 + highIndex, codePoint & 0xff];
    }
    return [];
  }
}

function splitMarkerFromByte(charIndex: number, marker: number, extended: boolean): HaruSplitMarker {
  if (!extended && marker >= 0x08 && marker <= 0x0e) {
    return { charIndex, kind: "b", ordinal: marker - 0x07 };
  }
  if ((marker & 0x80) !== 0) {
    return { charIndex, kind: "b", ordinal: marker & 0x7f };
  }
  return { charIndex, kind: "a", ordinal: marker };
}

function readHaruPosList(bytes: Uint8Array, count: number, strings: HaruStringCodec): PartOfSpeech[] {
  const reader = new BinaryReader(bytes);
  const result: PartOfSpeech[] = [];
  for (let posIndex = 0; posIndex < count; posIndex += 1) {
    const components: string[] = [];
    for (let part = 0; part < 6; part += 1) {
      const length = reader.readStringLength();
      components.push(strings.decode(reader.readBytes(length)));
    }
    result.push(components as unknown as PartOfSpeech);
  }
  return result;
}

function sectionOffset(start: number): number {
  return Math.abs(start);
}

function assertMagic(bytes: Uint8Array, expectedHex: string, label: string): void {
  if (bytesToHex(bytes) !== expectedHex) {
    throw new SudachiError({
      code: "InvalidDictionaryGrammar",
      message: `Invalid ${label} magic`
    });
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

function dirname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");
  if (index <= 0) return index === 0 ? "/" : ".";
  return normalized.slice(0, index);
}

function extname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const dot = normalized.lastIndexOf(".");
  return dot > slash ? normalized.slice(dot) : "";
}

function join(...segments: string[]): string {
  const joined = segments
    .filter((segment) => segment.length > 0)
    .join("/")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  return joined.length === 0 ? "." : joined;
}

function decodeUtf8CodePoint(bytes: Uint8Array, offset: number): { codePoint: number; byteLength: number } | undefined {
  if (offset >= bytes.byteLength) return undefined;
  const lead = bytes[offset]!;
  if (lead < 0x80) return { codePoint: lead, byteLength: 1 };
  const byteLength = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : lead >= 0xc0 ? 2 : 0;
  if (byteLength === 0 || offset + byteLength > bytes.byteLength) return undefined;
  let codePoint = lead & (0xff >> (byteLength + 1));
  for (let index = 1; index < byteLength; index += 1) {
    const next = bytes[offset + index]!;
    if ((next & 0xc0) !== 0x80) return undefined;
    codePoint = (codePoint << 6) | (next & 0x3f);
  }
  return { codePoint, byteLength };
}

function utf8ByteOffsets(text: string): number[] {
  const offsets: number[] = [];
  let offset = 0;
  for (const char of text) {
    offsets.push(offset);
    const codePoint = char.codePointAt(0) ?? 0;
    offset += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  offsets.push(offset);
  return offsets;
}
