import { kanjiPrefixCompatibleForReadingFallback } from "../../dictionary/morpheme.js";
import type { CompoundResolverDictionary } from "./index.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { RuntimeHaruToken } from "../../types/token.js";

import { POS0, POS5A, isSahenCapableNominal, 動詞, 連用形_, isCommonNounToken } from "../../types/pos.js";
import {
  compoundDispatchFormsForHint,
  compoundDispatchHintForForm,
  postverbAuxiliaryDeclaresHostAttachForm,
  postverbAuxiliaryPayloadsForForm
} from "../head-tail/tail/predicate-root/postverb-auxiliary-table.js";
import { compoundBlockedTailForms } from "./compound-following-forms.js";
import { isDetachedFromPreviousToken, type ClauseAdjacencyToken } from "../clause-layout/trivia.js";
import { containsKanji } from "../../utils/char-class.js";
export interface CompoundVerbToken extends ClauseAdjacencyToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
  readonly pos: number;
  readonly splitA?: readonly CompoundVerbToken[];
  readonly splitB?: readonly CompoundVerbToken[];
  readonly dictionaryId?: number;
  readonly syntheticReason?: string;
  readonly compoundCandidateKind?: string;
  readonly compoundHead?: CompoundVerbToken;
  readonly compoundTail?: CompoundVerbToken;
}

export class CompoundVerbCandidate {
  readonly kind: string;
  readonly start: number;
  readonly consumed: number;
  readonly surface: string;
  readonly head: CompoundVerbToken;
  readonly tail: CompoundVerbToken;
  readonly whole: CompoundVerbToken | null;

  constructor(options: {
    readonly kind: string;
    readonly start: number;
    readonly consumed: number;
    readonly surface: string;
    readonly head: CompoundVerbToken;
    readonly tail: CompoundVerbToken;
    readonly whole?: CompoundVerbToken | null;
  }) {
    this.kind = options.kind;
    this.start = options.start;
    this.consumed = options.consumed;
    this.surface = options.surface;
    this.head = options.head;
    this.tail = options.tail;
    this.whole = options.whole ?? null;
  }
}

export class CompoundVerbDiagnostic {
  readonly candidate: CompoundVerbCandidate;
  readonly virtualToken: CompoundVerbToken;
  readonly lookupHit: boolean;
  readonly entry: MorphemeEntry | null;
  readonly knownResolverHint: string | null;
  readonly reason: string;

  constructor(options: {
    readonly candidate: CompoundVerbCandidate;
    readonly virtualToken: CompoundVerbToken;
    readonly lookupHit: boolean;
    readonly entry: MorphemeEntry | null;
    readonly knownResolverHint: string | null;
    readonly reason: string;
  }) {
    this.candidate = options.candidate;
    this.virtualToken = options.virtualToken;
    this.lookupHit = options.lookupHit;
    this.entry = options.entry;
    this.knownResolverHint = options.knownResolverHint;
    this.reason = options.reason;
  }
}

export function findCompoundVerbCandidates(
  tokens: readonly CompoundVerbToken[],
  options: {
    readonly includeSingleSplitA?: boolean;
    readonly includeStreamVv?: boolean;
    readonly includeSahenShiV?: boolean;
    readonly includeNounIntensiveTail?: boolean;
  } = {}
): CompoundVerbCandidate[] {
  const includeSingleSplitA = options.includeSingleSplitA ?? true;
  const includeStreamVv = options.includeStreamVv ?? true;
  const includeSahenShiV = options.includeSahenShiV ?? true;
  const includeNounIntensiveTail = options.includeNounIntensiveTail ?? true;
  const candidates: CompoundVerbCandidate[] = [];
  const n = tokens.length;

  if (includeSingleSplitA) {
    for (let idx = 0; idx < n; idx += 1) {
      candidates.push(...findCompoundVerbCandidatesAt(tokens, idx, {
        includeSingleSplitA: true,
        includeStreamVv: false,
        includeSahenShiV: false,
        includeNounIntensiveTail: false
      }));
    }
  }

  if (includeStreamVv || includeSahenShiV || includeNounIntensiveTail) {
    for (let idx = 0; idx < n; idx += 1) {
      candidates.push(...findCompoundVerbCandidatesAt(tokens, idx, {
        includeSingleSplitA: false,
        includeStreamVv,
        includeSahenShiV,
        includeNounIntensiveTail
      }));
    }
  }

  return candidates;
}

export function findCompoundVerbCandidatesAt(
  tokens: readonly CompoundVerbToken[],
  idx: number,
  options: {
    readonly includeSingleSplitA?: boolean;
    readonly includeStreamVv?: boolean;
    readonly includeSahenShiV?: boolean;
    readonly includeNounIntensiveTail?: boolean;
  } = {}
): CompoundVerbCandidate[] {
  const includeSingleSplitA = options.includeSingleSplitA ?? true;
  const includeStreamVv = options.includeStreamVv ?? true;
  const includeSahenShiV = options.includeSahenShiV ?? true;
  const includeNounIntensiveTail = options.includeNounIntensiveTail ?? true;
  const candidates: CompoundVerbCandidate[] = [];
  const n = tokens.length;
  if (idx < 0 || idx >= n) {
    return candidates;
  }

  if (includeSingleSplitA) {
    const candidate = candidateFromSingleSplitA(tokens[idx], idx);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  if (includeStreamVv && idx + 1 < n) {
    const candidate = candidateFromStreamVv(tokens, idx);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  if (includeNounIntensiveTail && idx + 1 < n) {
    const candidate = candidateFromNounIntensiveTail(tokens, idx);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  if (includeSahenShiV && idx + 2 < n) {
    const candidate = candidateFromSahenShiV(tokens, idx);
    if (candidate !== null) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

export async function diagnoseCompoundVerbCandidates(
  tokens: readonly CompoundVerbToken[],
  dictionary: CompoundResolverDictionary,
  options: {
    readonly includeSingleSplitA?: boolean;
    readonly includeStreamVv?: boolean;
    readonly includeSahenShiV?: boolean;
    readonly includeNounIntensiveTail?: boolean;
  } = {}
): Promise<CompoundVerbDiagnostic[]> {
  const diagnostics: CompoundVerbDiagnostic[] = [];
  for (const candidate of findCompoundVerbCandidates(tokens, options)) {
    const virtual = buildVirtualCompoundToken(candidate);
    const entry = await lookupVirtualCompoundEntry(dictionary, virtual);
    let knownHint = knownResolverHint(candidate);
    if (
      candidate.kind === "noun_intensive_tail" &&
      knownHint !== null &&
      (await lookupNominalRenyouVerbHead(dictionary, candidate.head)) === null
    ) {
      knownHint = null;
    }
    diagnostics.push(new CompoundVerbDiagnostic({
      candidate,
      virtualToken: virtual,
      lookupHit: entry !== null,
      entry,
      knownResolverHint: knownHint,
      reason: entry !== null
        ? "virtual_lookup_hit"
        : knownHint !== null
          ? "existing_known_resolver"
          : "no_known_compound_or_productive_tail"
    }));
  }
  return diagnostics;
}

export async function lookupVirtualCompoundEntry(dictionary: CompoundResolverDictionary, virtualToken: CompoundVerbToken): Promise<MorphemeEntry | null> {
  const entry = await dictionary.lookupTokenRelaxed(runtimeCompatibleToken(virtualToken));
  if (entry === undefined || entry === null) {
    return null;
  }
  const reason = entry.matchReason;
  if (reason !== "lemma_family" && reason !== "reading_kana_oov" && reason !== "reading_prefix") {
    return entry;
  }

  const tokenForm = virtualToken.dictionaryForm;
  const entryForm = entry.dictionaryForm ?? "";
  if (tokenForm === entryForm) {
    return entry;
  }
  if (!containsKanji(tokenForm)) {
    return entry;
  }
  if (containsKanji(entryForm) && kanjiPrefixCompatibleForReadingFallback(tokenForm, entryForm)) {
    return entry;
  }
  return null;
}

export function knownResolverHint(candidate: CompoundVerbCandidate): string | null {
  const tailForm = candidate.tail.dictionaryForm;
  if (candidate.kind === "sahen_shi_v") {
    return compoundDispatchHintForForm(tailForm, "sahen");
  }
  if (candidate.kind === "single_split_a" || candidate.kind === "stream_vv" || candidate.kind === "noun_intensive_tail") {
    return compoundDispatchHintForForm(tailForm, "stream");
  }
  return null;
}

export function buildVirtualCompoundToken(candidate: CompoundVerbCandidate): CompoundVerbToken {
  if (candidate.whole !== null) {
    return {
      ...candidate.whole,
      syntheticReason: "compound_verb_virtual",
      compoundCandidateKind: candidate.kind,
      compoundHead: candidate.head,
      compoundTail: candidate.tail
    };
  }

  const head = candidate.head;
  const tail = candidate.tail;
  const joinReading = candidate.kind === "sahen_shi_v" ? "シ" : "";
  return {
    surface: candidate.surface,
    dictionaryForm: virtualDictionaryForm(candidate),
    reading: `${head.reading ?? ""}${joinReading}${tail.reading ?? ""}`,
    dictionaryFormReading: `${head.reading ?? ""}${joinReading}${tail.dictionaryFormReading ?? tail.reading ?? ""}`,
    pos: tail.pos,
    syntheticReason: "compound_verb_virtual",
    compoundCandidateKind: candidate.kind,
    compoundHead: head,
    compoundTail: tail
  };
}

function candidateFromSingleSplitA(token: CompoundVerbToken | undefined, idx: number): CompoundVerbCandidate | null {
  if (token === undefined || !isVerb(token)) {
    return null;
  }
  const splitA = token.splitA ?? [];
  if (splitA.length !== 2) {
    return null;
  }
  const [head, tail] = splitA;
  if (head === undefined || tail === undefined || !(isVerbRenyou(head) && isVerb(tail))) {
    return null;
  }
  if (isNonCompoundStreamTail(tail)) {
    return null;
  }
  return new CompoundVerbCandidate({
    kind: "single_split_a",
    start: idx,
    consumed: 1,
    surface: token.surface,
    head,
    tail,
    whole: token
  });
}

export function isStreamVvCompoundPairAt(tokens: readonly CompoundVerbToken[], idx: number): boolean {
  return candidateFromStreamVv(tokens, idx) !== null && !isDetachedFromPreviousToken(tokens, idx + 1);
}

export function isStreamVvCompoundShapeAt(tokens: readonly CompoundVerbToken[], idx: number): boolean {
  return candidateFromStreamVv(tokens, idx) !== null;
}

export async function streamVvCompoundShapeHasRegisteredOwnerAt(
  tokens: readonly CompoundVerbToken[],
  idx: number,
  dictionary: CompoundResolverDictionary
): Promise<boolean> {
  const candidate = candidateFromStreamVv(tokens, idx);
  if (candidate === null) {
    return false;
  }
  if (knownResolverHint(candidate) !== null) {
    return true;
  }
  if (
    postverbAuxiliaryPayloadsForForm(candidate.tail.dictionaryForm)
      .some((payload) => postverbAuxiliaryDeclaresHostAttachForm(payload, "verb_renyou"))
  ) {
    return true;
  }
  return (await lookupVirtualCompoundEntry(dictionary, buildVirtualCompoundToken(candidate))) !== null;
}

export async function streamVvCompoundPairLacksRegisteredOwnerAt(
  tokens: readonly CompoundVerbToken[],
  idx: number,
  dictionary: CompoundResolverDictionary
): Promise<boolean> {
  if (!isStreamVvCompoundPairAt(tokens, idx)) {
    return false;
  }
  const candidate = candidateFromStreamVv(tokens, idx);
  if (candidate === null || knownResolverHint(candidate) !== null) {
    return false;
  }
  if (
    postverbAuxiliaryPayloadsForForm(candidate.tail.dictionaryForm)
      .some((payload) => postverbAuxiliaryDeclaresHostAttachForm(payload, "verb_renyou"))
  ) {
    return false;
  }
  return (await lookupVirtualCompoundEntry(dictionary, buildVirtualCompoundToken(candidate))) === null;
}

function candidateFromStreamVv(tokens: readonly CompoundVerbToken[], idx: number): CompoundVerbCandidate | null {
  const head = tokens[idx];
  const tail = tokens[idx + 1];
  if (head === undefined || tail === undefined || !(isVerbRenyou(head) && isVerb(tail))) {
    return null;
  }
  if (isNonCompoundStreamTail(tail)) {
    return null;
  }
  if (idx > 0 && isSahenNoun(tokens[idx - 1]) && isSuruRenyou(head)) {
    return null;
  }
  return new CompoundVerbCandidate({
    kind: "stream_vv",
    start: idx,
    consumed: 2,
    surface: `${head.surface}${tail.surface}`,
    head,
    tail
  });
}

function candidateFromNounIntensiveTail(tokens: readonly CompoundVerbToken[], idx: number): CompoundVerbCandidate | null {
  const head = tokens[idx];
  const tail = tokens[idx + 1];
  if (head === undefined || tail === undefined || !(isCommonNounToken(head) && isColloquialIntensiveTail(tail))) {
    return null;
  }
  return new CompoundVerbCandidate({
    kind: "noun_intensive_tail",
    start: idx,
    consumed: 2,
    surface: `${head.surface}${tail.surface}`,
    head,
    tail
  });
}

function candidateFromSahenShiV(tokens: readonly CompoundVerbToken[], idx: number): CompoundVerbCandidate | null {
  const noun = tokens[idx];
  const suru = tokens[idx + 1];
  const tail = tokens[idx + 2];
  if (noun === undefined || suru === undefined || tail === undefined || !(isSahenNoun(noun) && isSuruRenyou(suru) && isVerb(tail))) {
    return null;
  }
  if (isNonCompoundStreamTail(tail)) {
    return null;
  }
  return new CompoundVerbCandidate({
    kind: "sahen_shi_v",
    start: idx,
    consumed: 3,
    surface: `${noun.surface}${suru.surface}${tail.surface}`,
    head: noun,
    tail
  });
}

function virtualDictionaryForm(candidate: CompoundVerbCandidate): string {
  const head = candidate.head;
  const tail = candidate.tail;
  if (candidate.kind === "sahen_shi_v") {
    return `${head.surface}し${tail.dictionaryForm || tail.surface}`;
  }
  return `${head.surface}${tail.dictionaryForm || tail.surface}`;
}

function isNonCompoundStreamTail(token: CompoundVerbToken): boolean {
  const form = token.dictionaryForm || token.surface || "";
  return compoundBlockedTailForms().has(form);
}

function isVerb(token: CompoundVerbToken | undefined): token is CompoundVerbToken {
  return token !== undefined && (token.pos & POS0) === 動詞;
}

function isVerbRenyou(token: CompoundVerbToken): boolean {
  return (token.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
}

function isSahenNoun(token: CompoundVerbToken | undefined): boolean {
  return token !== undefined && isSahenCapableNominal(token);
}

function isSuruRenyou(token: CompoundVerbToken): boolean {
  return isVerbRenyou(token) && token.dictionaryForm === "する";
}

function isColloquialIntensiveTail(token: CompoundVerbToken): boolean {
  return (token.pos & POS0) === 動詞 &&
    compoundDispatchFormsForHint("stream", "colloquial_intensive").has(token.dictionaryForm);
}

export async function lookupNominalRenyouVerbHead(
  dictionary: CompoundResolverDictionary,
  token: CompoundVerbToken
): Promise<readonly [entry: MorphemeEntry, verbToken: CompoundVerbToken] | null> {
  for (const [dictionaryForm, reading] of nominalRenyouVerbKeys(token)) {
    const entry = await dictionary.lookup(dictionaryForm, reading, "動詞");
    if (entry === undefined || entry === null) {
      continue;
    }
    const verbToken: CompoundVerbToken = {
      ...token,
      dictionaryForm,
      dictionaryFormReading: reading,
      pos: 動詞 | (entry.conjugationType ?? 0) | 連用形_,
      syntheticReason: "nominal_renyou_rescue"
    };
    return [entry, verbToken];
  }
  return null;
}

function nominalRenyouVerbKeys(token: CompoundVerbToken): readonly (readonly [dictionaryForm: string, reading: string])[] {
  const surface = token.surface || token.dictionaryForm || "";
  const reading = token.reading ?? token.dictionaryFormReading ?? "";
  if (surface.length === 0 || reading.length === 0) {
    return [];
  }

  const keys: [string, string][] = [[`${surface}る`, `${reading}ル`]];
  const godan = godanRenyouDictionaryEnding(surface.at(-1), reading.at(-1));
  if (godan !== null) {
    keys.push([
      `${surface.slice(0, -godan.surfaceSource.length)}${godan.surfaceTarget}`,
      `${reading.slice(0, -godan.readingSource.length)}${godan.readingTarget}`
    ]);
  }
  if (surface.endsWith("り") && reading.endsWith("リ")) {
    keys.push([`${surface.slice(0, -1)}る`, `${reading.slice(0, -1)}ル`]);
  }
  return dedupeNominalRenyouVerbKeys(keys);
}

function godanRenyouDictionaryEnding(
  surfaceEnding: string | undefined,
  readingEnding: string | undefined
): {
  readonly surfaceSource: string;
  readonly surfaceTarget: string;
  readonly readingSource: string;
  readonly readingTarget: string;
} | null {
  if (surfaceEnding === undefined || readingEnding === undefined) {
    return null;
  }
  const surfaceTarget = GODAN_RENYOU_SURFACE_ENDINGS.get(surfaceEnding);
  const readingTarget = GODAN_RENYOU_READING_ENDINGS.get(readingEnding);
  if (surfaceTarget === undefined || readingTarget === undefined) {
    return null;
  }
  return {
    surfaceSource: surfaceEnding,
    surfaceTarget,
    readingSource: readingEnding,
    readingTarget
  };
}

const GODAN_RENYOU_SURFACE_ENDINGS = new Map([
  ["い", "う"],
  ["き", "く"],
  ["ぎ", "ぐ"],
  ["し", "す"],
  ["ち", "つ"],
  ["に", "ぬ"],
  ["び", "ぶ"],
  ["み", "む"],
  ["り", "る"]
]);

const GODAN_RENYOU_READING_ENDINGS = new Map([
  ["イ", "ウ"],
  ["キ", "ク"],
  ["ギ", "グ"],
  ["シ", "ス"],
  ["チ", "ツ"],
  ["ニ", "ヌ"],
  ["ビ", "ブ"],
  ["ミ", "ム"],
  ["リ", "ル"]
]);

function dedupeNominalRenyouVerbKeys(
  keys: readonly (readonly [dictionaryForm: string, reading: string])[]
): readonly (readonly [dictionaryForm: string, reading: string])[] {
  const seen = new Set<string>();
  return keys.filter(([dictionaryForm, reading]) => {
    const key = `${dictionaryForm}\u0000${reading}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function runtimeCompatibleToken(token: CompoundVerbToken): RuntimeHaruToken {
  const runtime: RuntimeHaruToken = {
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? "",
    dictionaryFormReading: token.dictionaryFormReading ?? token.reading ?? "",
    pos: token.pos,
    dictionaryId: token.dictionaryId ?? -1
  };
  if (token.splitA !== undefined) {
    runtime.splitA = token.splitA.map(runtimeCompatibleToken);
  }
  if (token.splitB !== undefined) {
    runtime.splitB = token.splitB.map(runtimeCompatibleToken);
  }
  return runtime;
}

