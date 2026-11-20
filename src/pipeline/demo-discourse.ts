import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import {
  isSourceSeparatedFromPreviousToken,
  isTransparentPauseSeparatedFromPreviousToken,
  previousNonSpaceIndex,
  nextNonSpaceIndex
} from "./clause-layout/trivia.js";
import { isCopulaDaOrDesuDictionaryForm } from "./matchers.js";
import { TokenCursor } from "./token-cursor.js";
import {
  isBoundaryPunctuationToken,
  isHardTerminalPunctuationToken,
  isLabelSeparatorPunctuationToken,
  isNonTerminalClauseBreakPunctuationToken,
  isOpeningPunctuationToken,
  isTrailingPunctuationToken,
  isWeakPunctuationToken
} from "./head-tail/boundary/punctuation.js";
import { activeProtoLayout } from "./clause-layout/proto-state.js";
import { isKaDouKaMarker } from "./head-tail/boundary/ka-ownership.js";
import { runClosesUtteranceAs, utteranceClosureRunAfter } from "./clause-layout/utterance-closure.js";
import type { UtteranceClosureKind, UtteranceClosureToken } from "./clause-layout/utterance-closure.js";
import type { ClauseAdjacencyToken } from "./clause-layout/trivia.js";
import { kaChoiceAlternativeCounterpartAfter } from "./structural-relation/ka-parallel-ownership.js";
import type { DemoDiscourseLeftBoundaryEvidenceKind } from "./clause-layout/layout-types.js";
import { type LookupTables } from "./lookup-tables.js";
import type { RuntimeHaruToken, HaruTokenRuntimeFields } from "../types/token.js";
import {
  POS0,
  POS01,
  POS1,
  POS2,
  POS3,
  POS4,
  POS5,
  POS5A,
  posFromStrings,
  格助詞,
  記号,
  係助詞,
  終止形_,
  助詞,
  助詞_格助詞,
  助動詞,
  動詞,
  副助詞,
  補助記号,
  命令形_,
  名詞,
  形状詞,
  形容詞0,
  連体形_,
  感動詞,
  is助動詞,
  isAdverbCapableNominal,
  isClauseClosingInflection,
  isIAdjectivePredicateToken,
  isBareNaAdjSet,
  isNaAdjCapable,
  isNaAdjectiveDerivationalSuffix,
  isNominalLike,
  isTerminalParticleToken,
  isVerbPredicateToken,
  KOPOS_OF_NAME, 助詞_終助詞
} from "../types/pos.js";

const DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH = "discourse/demo_discourse_connectives.jsonl";

export interface DemoDiscourseToken extends HaruTokenRuntimeFields {
  surface: string;
  dictionaryForm: string;
  pos: number;
}

interface DemoDiscourseMatchAtom {
  readonly surface: string;
  readonly posValue: number;
  readonly posMask: number;
}

interface DemoDiscourseRendering {
  readonly korean: string;
  readonly koreanPos: number;
}

export type DemoDiscoursePosition = "any" | "clause_initial" | "utterance_initial" | "post_boundary";
export type DemoDiscourseVeto =
  | "attributive_ahead" | "imperative_ahead" | "acceptability_ahead" | "kadouka_marker" | "ka_choice_member"
  | "utterance_closing_question_ka";
export type DemoDiscourseLeftBoundary = "question_ka_choice";

export interface DemoDiscourseConnectiveEntry {
  readonly key: string;
  readonly match: readonly DemoDiscourseMatchAtom[];
  readonly connective: DemoDiscourseRendering | null;
  readonly predicative: DemoDiscourseRendering | null;
  readonly realizationOwner: string | null;
  readonly position: DemoDiscoursePosition;
  readonly punctuationOnsetSuffices: boolean;
  readonly pauseOnsetRequiresEdge: boolean;
  readonly leftBoundary: DemoDiscourseLeftBoundary | null;
  readonly requirePauseAfter: boolean;
  readonly requireContentAfterPause: boolean;
  readonly vetoes: readonly DemoDiscourseVeto[];
  readonly vetoFollowingVerbLemmas: ReadonlySet<string>;
}

export interface DemoDiscourseResolution {
  readonly key: string;
  readonly consumed: number;
  readonly reading: "connective" | "predicative";
  readonly korean: string;
  readonly koreanPos: number;
}

export interface DemoDiscourseResolutionOptions {
  readonly leftBoundaryEvidence?: DemoDiscourseLeftBoundaryEvidenceKind;
}

const DAME_FORMS = new Set(["だめ", "ダメ", "駄目", "無理"]);

const ACCEPTABILITY_FORMS = new Set(["いい", "良い", "よい", "構う", "大丈夫"]);

let _entriesBySurface: Map<string, readonly DemoDiscourseConnectiveEntry[]> | undefined;
let _demoAnaphorAnchors: ReadonlySet<string> = new Set();
let _clauseBreakDashSurfaces: ReadonlySet<string> = new Set();
let _maxMatchLength = 1;
let _lookupTables: LookupTables | null = null;

export async function initDemoDiscourseConnectiveData(loader: DataLoader, lookups: LookupTables): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH);
  _entriesBySurface = indexEntries(parseDemoDiscourseConnectiveText(await loader.readTextFile(filePath)));
  await initHostlessInterjectionData(loader);
  _demoAnaphorAnchors = lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS;
  _clauseBreakDashSurfaces = lookups.GRAMMAR_BOUNDARY_CLAUSE_BREAK_DASH_SURFACES;
  _lookupTables = lookups;
}

export function parseDemoDiscourseConnectiveText(text: string): readonly DemoDiscourseConnectiveEntry[] {
  const entries: DemoDiscourseConnectiveEntry[] = [];
  const seenKeys = new Set<string>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    const KNOWN_KEYS = new Set(["key", "match", "connective", "predicative", "realizationOwner", "position", "punctuationOnsetSuffices", "pauseOnsetRequiresEdge", "leftBoundary", "requirePauseAfter", "requireContentAfterPause", "vetoes", "vetoFollowingVerbLemmas"]);
    for (const key of Object.keys(raw)) {
      if (!KNOWN_KEYS.has(key)) {
        throw new Error(`unknown demo discourse key ${JSON.stringify(key)} at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    if (typeof raw.key !== "string" || raw.key.length === 0 || seenKeys.has(raw.key)) {
      throw new Error(`invalid demo discourse entry key at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    seenKeys.add(raw.key);
    const entry: DemoDiscourseConnectiveEntry = {
      key: raw.key,
      match: parseMatchAtoms(raw.match, lineNumber),
      connective: raw.connective === undefined ? null : parseRendering(raw.connective, "connective", lineNumber),
      predicative: raw.predicative === undefined ? null : parseRendering(raw.predicative, "predicative", lineNumber),
      realizationOwner: parseRealizationOwner(raw.realizationOwner, lineNumber),
      position: parsePosition(raw.position, lineNumber),
      punctuationOnsetSuffices: parseBooleanField(raw.punctuationOnsetSuffices, "punctuationOnsetSuffices", lineNumber),
      pauseOnsetRequiresEdge: parseBooleanField(raw.pauseOnsetRequiresEdge, "pauseOnsetRequiresEdge", lineNumber),
      leftBoundary: parseLeftBoundary(raw.leftBoundary, lineNumber),
      requirePauseAfter: parseBooleanField(raw.requirePauseAfter, "requirePauseAfter", lineNumber),
      requireContentAfterPause: parseBooleanField(raw.requireContentAfterPause, "requireContentAfterPause", lineNumber),
      vetoes: parseVetoes(raw.vetoes, lineNumber),
      vetoFollowingVerbLemmas: parseVetoFollowingVerbLemmas(raw.vetoFollowingVerbLemmas, lineNumber)
    };
    if (entry.punctuationOnsetSuffices && entry.position !== "utterance_initial") {
      throw new Error(`demo discourse punctuationOnsetSuffices needs position utterance_initial at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (entry.pauseOnsetRequiresEdge && entry.position !== "utterance_initial") {
      throw new Error(`demo discourse pauseOnsetRequiresEdge needs position utterance_initial at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (entry.punctuationOnsetSuffices && entry.pauseOnsetRequiresEdge) {
      throw new Error(`demo discourse punctuationOnsetSuffices and pauseOnsetRequiresEdge are exclusive at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (entry.realizationOwner !== null && (entry.connective !== null || entry.predicative !== null)) {
      throw new Error(`demo discourse entry with realizationOwner must not carry a rendering at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (entry.realizationOwner === null && entry.connective === null && entry.predicative === null) {
      throw new Error(`demo discourse entry needs connective, predicative or realizationOwner at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    entries.push(entry);
  }
  return entries;
}

function parseRealizationOwner(value: unknown, lineNumber: number): string | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`invalid demo discourse realizationOwner at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function claimsConnectiveFunction(entry: DemoDiscourseConnectiveEntry): boolean {
  return entry.connective !== null || entry.realizationOwner !== null;
}

function parseLeftBoundary(value: unknown, lineNumber: number): DemoDiscourseLeftBoundary | null {
  if (value === undefined) {
    return null;
  }
  if (value !== "question_ka_choice") {
    throw new Error(`invalid demo discourse leftBoundary at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parsePosition(value: unknown, lineNumber: number): DemoDiscoursePosition {
  if (value === undefined) {
    return "any";
  }
  if (value !== "any" && value !== "clause_initial" && value !== "utterance_initial" && value !== "post_boundary") {
    throw new Error(`invalid demo discourse position at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parseBooleanField(value: unknown, field: string, lineNumber: number): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw new Error(`invalid demo discourse ${field} at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parseVetoes(value: unknown, lineNumber: number): readonly DemoDiscourseVeto[] {
  if (value === undefined) {
    return [];
  }
  if (
    !Array.isArray(value) ||
    !value.every((item): item is DemoDiscourseVeto =>
      item === "attributive_ahead" || item === "imperative_ahead" ||
      item === "acceptability_ahead" || item === "kadouka_marker" || item === "ka_choice_member" ||
      item === "utterance_closing_question_ka")
  ) {
    throw new Error(`invalid demo discourse vetoes at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parseVetoFollowingVerbLemmas(value: unknown, lineNumber: number): ReadonlySet<string> {
  if (value === undefined) {
    return new Set();
  }
  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === "string" && item.length > 0)
  ) {
    throw new Error(`invalid demo discourse vetoFollowingVerbLemmas at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return new Set(value);
}

function parseMatchAtoms(value: unknown, lineNumber: number): readonly DemoDiscourseMatchAtom[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new Error(`invalid demo discourse match at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value.map((rawAtom: unknown) => {
    const atom = rawAtom as { readonly [key: string]: unknown };
    if (typeof atom.surface !== "string" || atom.surface.length === 0 || atom.surface === "*") {
      throw new Error(`invalid demo discourse match surface at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const pos = atom.pos;
    if (!Array.isArray(pos) || pos.length === 0 || !pos.every((item): item is string => typeof item === "string" && item.length > 0)) {
      throw new Error(`invalid demo discourse match pos at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const query = posPrefixQuery(pos);
    return { surface: atom.surface, posValue: query.value, posMask: query.mask };
  });
}

function parseRendering(value: unknown, field: string, lineNumber: number): DemoDiscourseRendering {
  const rendering = value as { readonly [key: string]: unknown } | null | undefined;
  if (
    rendering === null ||
    rendering === undefined ||
    typeof rendering.korean !== "string" ||
    rendering.korean.length === 0 ||
    typeof rendering.koreanPos !== "string" ||
    rendering.koreanPos.length === 0
  ) {
    throw new Error(`invalid demo discourse ${field} rendering at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const koreanPos = KOPOS_OF_NAME[rendering.koreanPos];
  if (koreanPos === undefined) {
    throw new Error(`invalid demo discourse ${field} koreanPos ${JSON.stringify(rendering.koreanPos)} at ${DEMO_DISCOURSE_CONNECTIVE_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { korean: rendering.korean, koreanPos };
}

const POS_PREFIX_FIELDS: readonly number[] = [POS0, POS1, POS2, POS3, POS4, POS5];

function posPrefixQuery(pos: readonly string[]): { value: number; mask: number } {
  let mask = 0;
  for (let i = 0; i < pos.length && i < POS_PREFIX_FIELDS.length; i += 1) {
    if (pos[i] !== "*") {
      mask |= POS_PREFIX_FIELDS[i]!;
    }
  }
  return { value: posFromStrings(pos) & mask, mask };
}

function indexEntries(entries: readonly DemoDiscourseConnectiveEntry[]): Map<string, readonly DemoDiscourseConnectiveEntry[]> {
  const index = new Map<string, DemoDiscourseConnectiveEntry[]>();
  _maxMatchLength = 1;
  for (const entry of entries) {
    _maxMatchLength = Math.max(_maxMatchLength, entry.match.length);
    const anchor = entry.match[0]!.surface;
    const bucket = index.get(anchor);
    if (bucket === undefined) {
      index.set(anchor, [entry]);
    } else {
      bucket.push(entry);
    }
  }
  for (const bucket of index.values()) {
    bucket.sort((left, right) => right.match.length - left.match.length);
  }
  return index;
}

export function tryResolveDemoDiscourseConnective<T extends DemoDiscourseToken>(
  cursor: TokenCursor<T>,
  lookups: LookupTables,
  options: DemoDiscourseResolutionOptions = {},
): DemoDiscourseResolution | null {
  const tokens = cursor.tokens;
  const index = cursor.pos;
  if (_entriesBySurface === undefined) {
    throw new Error("Data not initialized");
  }
  const head = tokens[index];
  if (head === undefined) {
    return null;
  }
  const candidates = _entriesBySurface.get(head.surface);
  if (candidates === undefined) {
    return null;
  }
  for (const entry of candidates) {
    if (!matchesEntryAt(tokens, index, entry)) {
      continue;
    }
    const reading = classifyEntryReadingAt(tokens, index, entry, cursor.end, options);
    if (reading === "reject") {
      return null;
    }
    const predicative = entry.predicative;
    if (reading === "predicative" && predicative !== null) {
      cursor.advance(entry.match.length);
      return {
        key: entry.key,
        consumed: entry.match.length,
        reading: "predicative",
        korean: predicative.korean,
        koreanPos: predicative.koreanPos
      };
    }
    if (reading !== "connective" || entry.connective === null) {
      return null;
    }
    cursor.advance(entry.match.length);
    return {
      key: entry.key,
      consumed: entry.match.length,
      reading: "connective",
      korean: entry.connective.korean,
      koreanPos: entry.connective.koreanPos
    };
  }
  return null;
}

type DemoDiscourseEntryReading = "reject" | "connective" | "predicative";

function rejectsCompositeReadingAt(
  tokens: readonly DemoDiscourseToken[],
  index: number,
  entry: DemoDiscourseConnectiveEntry
): boolean {
  if (hasPrenominalEvidenceBefore(tokens, index)) {
    return true;
  }
  const after = index + entry.match.length;
  if (hasParticleContinuationAt(tokens, after)) {
    return true;
  }
  if (entry.vetoes.includes("attributive_ahead") && hasAttributivePredicateAhead(tokens, after)) {
    return true;
  }
  if (entry.vetoes.includes("imperative_ahead") && hasImperativePredicateAhead(tokens, after)) {
    return true;
  }
  if (entry.vetoes.includes("acceptability_ahead") && hasAcceptabilityPredicateAhead(tokens, after)) {
    return true;
  }
  return hasVetoedFollowingVerbLemma(tokens, after, entry.vetoFollowingVerbLemmas);
}

function classifyEntryReadingAt(
  tokens: readonly DemoDiscourseToken[],
  index: number,
  entry: DemoDiscourseConnectiveEntry,
  endExclusive: number,
  options: DemoDiscourseResolutionOptions
): DemoDiscourseEntryReading {
  if (rejectsCompositeReadingAt(tokens, index, entry)) {
    return "reject";
  }
  const after = index + entry.match.length;
  if (entry.vetoes.includes("kadouka_marker") && isKaDouKaMarker(tokens, after - 1)) {
    return "reject";
  }
  if (entry.vetoes.includes("ka_choice_member") && opensStructuralKaChoiceAt(tokens, after - 1)) {
    return "reject";
  }
  if (entry.vetoes.includes("utterance_closing_question_ka") && utteranceClosesAfterMatch(tokens, after)) {
    return "reject";
  }
  if (
    entry.predicative !== null &&
    looksLikePredicativeDemoDewaContext(new TokenCursor(tokens, after, endExclusive, after))
  ) {
    return "predicative";
  }
  if (!claimsConnectiveFunction(entry)) {
    return "reject";
  }
  if (!satisfiesPosition(tokens, index, entry.position, entry.punctuationOnsetSuffices, entry.pauseOnsetRequiresEdge, entry.leftBoundary, options.leftBoundaryEvidence)) {
    return "reject";
  }
  if (entry.requirePauseAfter && !hasPauseOrTerminalAfter(tokens, after)) {
    return "reject";
  }
  if (entry.requireContentAfterPause && !hasContentAfterWeakPause(tokens, after)) {
    return "reject";
  }
  return "connective";
}

export interface DemoDiscourseConnectiveSpan {
  readonly key: string;
  readonly start: number;
  readonly endExclusive: number;
}

export function demoDiscourseConnectiveSpanCovering(
  tokens: readonly DemoDiscourseToken[],
  index: number
): DemoDiscourseConnectiveSpan | null {
  if (_entriesBySurface === undefined) {
    throw new Error("Data not initialized");
  }
  const earliestStart = Math.max(0, index - _maxMatchLength + 1);
  for (let start = index; start >= earliestStart; start -= 1) {
    const head = tokens[start];
    if (head === undefined) {
      continue;
    }
    const candidates = _entriesBySurface.get(head.surface);
    if (candidates === undefined) {
      continue;
    }
    const entry = candidates.find((candidate) => matchesEntryAt(tokens, start, candidate));
    if (
      entry === undefined ||
      start + entry.match.length <= index ||
      classifyEntryReadingAt(tokens, start, entry, tokens.length, {}) !== "connective"
    ) {
      continue;
    }
    return { key: entry.key, start, endExclusive: start + entry.match.length };
  }
  return null;
}

function opensStructuralKaChoiceAt(tokens: readonly DemoDiscourseToken[], kaIdx: number): boolean {
  if (_lookupTables === null) {
    return false;
  }
  return kaChoiceAlternativeCounterpartAfter(
    activeProtoLayout(),
    tokens as unknown as readonly RuntimeHaruToken[],
    kaIdx,
    _lookupTables
  );
}

function utteranceClosesAfterMatch(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  const traversal = utteranceClosureRunAfter(
    activeProtoLayout(),
    tokens as unknown as readonly (UtteranceClosureToken & ClauseAdjacencyToken)[],
    after
  );
  return traversal.endedBy !== "content" && runClosesUtteranceAs(traversal, UTTERANCE_CLOSING_KA_CLOSURES);
}

const UTTERANCE_CLOSING_KA_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal"
]);

function hasVetoedFollowingVerbLemma(
  tokens: readonly DemoDiscourseToken[],
  after: number,
  lemmas: ReadonlySet<string>
): boolean {
  if (lemmas.size === 0) {
    return false;
  }
  const idx = nextNonSpaceIndex(tokens, after, tokens.length);
  if (idx === null) {
    return false;
  }
  const token = tokens[idx];
  return token !== undefined && (token.pos & POS0) === 動詞 && lemmas.has(token.dictionaryForm);
}

function hasPauseOrTerminalAfter(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  const next = tokens[nextNonSpaceIndex(tokens, after, tokens.length) ?? after];
  if (next === undefined) {
    return true;
  }
  return isWeakPunctuationToken(next) || isHardTerminalPunctuationToken(next);
}

function hasContentAfterWeakPause(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  const pauseIdx = nextNonSpaceIndex(tokens, after, tokens.length);
  if (pauseIdx === null) {
    return false;
  }
  if (!isWeakPunctuationToken(tokens[pauseIdx])) {
    return false;
  }
  const contentIdx = nextNonSpaceIndex(tokens, pauseIdx + 1, tokens.length);
  if (contentIdx === null) {
    return false;
  }
  const content = tokens[contentIdx];
  return content !== undefined && !isBoundaryPunctuationToken(content);
}

function hasParticleContinuationAt(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  const next = tokens[nextNonSpaceIndex(tokens, after, tokens.length) ?? after];
  if (next === undefined) {
    return false;
  }
  if (next.dictionaryForm === "ない" && (next.pos & POS0) === 形容詞0) {
    return true;
  }
  if ((next.pos & POS0) !== 助詞) {
    return false;
  }
  const p1 = next.pos & POS1;
  return p1 === 係助詞 || p1 === 副助詞 || p1 === 格助詞;
}

function satisfiesUtteranceInitialPosition(
  tokens: readonly DemoDiscourseToken[],
  index: number,
  punctuationOnsetSuffices: boolean,
  pauseOnsetRequiresEdge: boolean,
  explicitLeftBoundaryEvidence: DemoDiscourseLeftBoundaryEvidenceKind | undefined,
): boolean {
  if (isUtteranceOnsetLeftBoundaryEvidence(
    explicitLeftBoundaryEvidence ?? activeProtoLayout()?.demoDiscourseLeftBoundaryAt(index)?.boundaryKind
  )) {
    return true;
  }
  if (pauseOnsetRequiresEdge && hasPauseTraversedOnsetEvidence(index, explicitLeftBoundaryEvidence)) {
    return true;
  }
  let cursor = index;
  for (let step = 0; step < tokens.length; step += 1) {
    if (punctuationOnsetSuffices && isTransparentPauseSeparatedFromPreviousToken(tokens, cursor)) {
      return true;
    }
    const prevIdx = previousNonSpaceIndex(tokens, cursor);
    if (prevIdx === null) {
      return true;
    }
    const prev = tokens[prevIdx];
    if (prev === undefined) {
      return true;
    }
    if (isTrailingPunctuationToken(prev)) {
      return false;
    }
    if (pauseOnsetRequiresEdge && isWeakPunctuationToken(prev)) {
      return false;
    }
    if (isUtteranceBoundaryPunctuationToken(prev)) {
      return true;
    }
    const p0 = prev.pos & POS0;
    if (p0 === 補助記号) {
      if (punctuationOnsetSuffices) {
        return true;
      }
      cursor = prevIdx;
      continue;
    }
    if (p0 === 記号) {
      cursor = prevIdx;
      continue;
    }
    return activeProtoLayout()?.detachedUtteranceOnsetEdgeAt(index) !== undefined;
  }
  return false;
}

function hasPauseTraversedOnsetEvidence(
  index: number,
  explicitLeftBoundaryEvidence: DemoDiscourseLeftBoundaryEvidenceKind | undefined
): boolean {
  if (explicitLeftBoundaryEvidence !== undefined) {
    return explicitLeftBoundaryEvidence === "pause_traversed_onset";
  }
  return activeProtoLayout()?.demoDiscourseLeftBoundaryKindAt(index, "pause_traversed_onset") ?? false;
}

function isUtteranceOnsetLeftBoundaryEvidence(
  kind: DemoDiscourseLeftBoundaryEvidenceKind | undefined
): boolean {
  return kind === "speaker_label" || kind === "detached_vocative";
}

export function demoDiscourseUtteranceInitialMatchLengthAt(
  tokens: readonly DemoDiscourseToken[],
  index: number
): number | null {
  const head = tokens[index];
  if (head === undefined || _entriesBySurface === undefined) {
    return null;
  }
  const candidates = _entriesBySurface.get(head.surface);
  if (candidates === undefined) {
    return null;
  }
  const matched = candidates.find((entry) =>
    entry.position === "utterance_initial" && matchesEntryAt(tokens, index, entry)
  );
  return matched === undefined || rejectsCompositeReadingAt(tokens, index, matched) ? null : matched.match.length;
}

export function isUtteranceBoundaryPunctuationToken(token: DemoDiscourseToken): boolean {
  return isHardTerminalPunctuationToken(token) ||
    isOpeningPunctuationToken(token) ||
    isWeakPunctuationToken(token) ||
    isLabelSeparatorPunctuationToken(token) ||
    isNonTerminalClauseBreakPunctuationToken(token, _clauseBreakDashSurfaces);
}

export function utteranceInitialDetachedEdgeQualifies(
  tokens: readonly DemoDiscourseToken[],
  edgeIdx: number
): boolean {
  const edge = tokens[edgeIdx];
  if (edge === undefined) {
    return false;
  }
  if ((edge.pos & POS0) === 感動詞) {
    return true;
  }
  if (isQuestionParticleKaSurface(edge)) {
    return hasDemoAnaphorAnchorBefore(tokens, edgeIdx);
  }
  if (isTerminalParticleToken(edge)) {
    return true;
  }
  const predicative = isVerbPredicateToken(edge) ||
    isIAdjectivePredicateToken(edge) ||
    is助動詞(edge.pos);
  return predicative && isClauseClosingInflection(edge.pos);
}

export type UtteranceInitialPauseEdgeGrade = "onset" | "adverbial_nominal" | "complement";

export type UtteranceInitialPauseEdgeComplementShape = "nominal" | "na_adjective";

export type UtteranceInitialPauseEdgeVerdict =
  | { readonly grade: "onset" }
  | { readonly grade: "adverbial_nominal" }
  | {
    readonly grade: "complement";
    readonly complementShape: UtteranceInitialPauseEdgeComplementShape;
  };

export function utteranceInitialPauseEdgeVerdict(
  tokens: readonly DemoDiscourseToken[],
  edgeIdx: number,
  hasOpenSubjectTopicArgument: boolean
): UtteranceInitialPauseEdgeVerdict {
  const edge = tokens[edgeIdx];
  if (edge === undefined) {
    return { grade: "onset" };
  }
  if (isAdverbCapableNominal(edge) && !hasOpenSubjectTopicArgument) {
    return { grade: "adverbial_nominal" };
  }
  const naAdjectiveDerivation = isNaAdjectiveDerivationalSuffix(edge);
  if (!isNominalLike(edge) && !isNaAdjCapable(edge) && !naAdjectiveDerivation) {
    return { grade: "onset" };
  }
  return isBareNaAdjSet(edge) || naAdjectiveDerivation
    ? { grade: "complement", complementShape: "na_adjective" }
    : { grade: "complement", complementShape: "nominal" };
}

function isQuestionParticleKaSurface(token: DemoDiscourseToken): boolean {
  return token.surface === "か" && (token.pos & POS0) === 助詞;
}

function hasDemoAnaphorAnchorBefore(
  tokens: readonly DemoDiscourseToken[],
  kaIdx: number
): boolean {
  const anchorIdx = previousNonSpaceIndex(tokens, kaIdx);
  const anchor = anchorIdx === null ? undefined : tokens[anchorIdx];
  if (anchor === undefined) {
    return false;
  }
  const form = anchor.dictionaryForm !== undefined && anchor.dictionaryForm.length > 0
    ? anchor.dictionaryForm
    : anchor.surface;
  return _demoAnaphorAnchors.has(form);
}

function satisfiesPosition(
  tokens: readonly DemoDiscourseToken[],
  index: number,
  position: DemoDiscoursePosition,
  punctuationOnsetSuffices: boolean,
  pauseOnsetRequiresEdge: boolean,
  leftBoundary: DemoDiscourseLeftBoundary | null,
  explicitLeftBoundaryEvidence: DemoDiscourseLeftBoundaryEvidenceKind | undefined,
): boolean {
  if (position === "any") {
    return true;
  }
  const prevIdx = previousNonSpaceIndex(tokens, index);
  if (prevIdx === null) {
    return true;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined) {
    return true;
  }
  if (isHardTerminalPunctuationToken(prev) || isOpeningPunctuationToken(prev)) {
    return true;
  }
  if (position === "utterance_initial") {
    return satisfiesUtteranceInitialPosition(tokens, index, punctuationOnsetSuffices, pauseOnsetRequiresEdge, explicitLeftBoundaryEvidence);
  }
  if (position === "post_boundary") {
    const p0 = prev.pos & POS0;
    const leftBoundaryEvidence = explicitLeftBoundaryEvidence ??
      activeProtoLayout()?.demoDiscourseLeftBoundaryAt(index)?.boundaryKind;
    return p0 === 補助記号 ||
      p0 === 記号 ||
      leftBoundaryEvidence === "terminal_question_ka" ||
      (leftBoundary === "question_ka_choice" && leftBoundaryEvidence === "question_ka_choice");
  }
  return false;
}

const AHEAD_SCAN_CAP = 10;

function hasAttributivePredicateAhead(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  let index = nextNonSpaceIndex(tokens, after, tokens.length) ?? tokens.length;
  let steps = 0;
  while (index < tokens.length && steps < AHEAD_SCAN_CAP) {
    const token = tokens[index];
    if (token === undefined || isBoundaryPunctuationToken(token)) {
      return false;
    }
    const form = token.pos & POS5A;
    const p0 = token.pos & POS0;
    if (form === 連体形_ && (p0 === 動詞 || p0 === 助動詞)) {
      return true;
    }
    if (form === 終止形_ || form === 命令形_) {
      return false;
    }
    index += 1;
    steps += 1;
  }
  return false;
}

function hasImperativePredicateAhead(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  let index = nextNonSpaceIndex(tokens, after, tokens.length) ?? tokens.length;
  let steps = 0;
  while (index < tokens.length && steps < AHEAD_SCAN_CAP) {
    const token = tokens[index];
    if (token === undefined || isBoundaryPunctuationToken(token)) {
      return false;
    }
    const form = token.pos & POS5A;
    if (form === 命令形_) {
      return true;
    }
    if (form === 終止形_) {
      const next = tokens[index + 1];
      return next !== undefined
        && (token.pos & POS0) === 動詞
        && next.surface === "な"
        && (next.pos & POS01) === 助詞_終助詞;
    }
    index += 1;
    steps += 1;
  }
  return false;
}

function hasAcceptabilityPredicateAhead(tokens: readonly DemoDiscourseToken[], after: number): boolean {
  const idx = nextNonSpaceIndex(tokens, after, tokens.length);
  if (idx === null) {
    return false;
  }
  const token = tokens[idx];
  return token !== undefined && ACCEPTABILITY_FORMS.has(token.dictionaryForm);
}

function matchesEntryAt(tokens: readonly DemoDiscourseToken[], start: number, entry: DemoDiscourseConnectiveEntry): boolean {
  for (let offset = 0; offset < entry.match.length; offset += 1) {
    const atom = entry.match[offset]!;
    const token = tokens[start + offset];
    if (token === undefined || token.surface !== atom.surface || (token.pos & atom.posMask) !== atom.posValue) {
      return false;
    }
  }
  return true;
}

function hasPrenominalEvidenceBefore(tokens: readonly DemoDiscourseToken[], index: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, index);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined) {
    return false;
  }
  if ((prev.pos & POS5A) === 連体形_) {
    return true;
  }
  return prev.surface === "の" && (prev.pos & POS01) === 助詞_格助詞;
}

export function looksLikePredicativeDemoDewaContext(
  cursor: TokenCursor<DemoDiscourseToken>
): boolean {
  const { tokens, pos: start, end: n } = cursor;
  const token = cursor.current();
  if (token === undefined) {
    return false;
  }
  const p0 = token.pos & POS0;
  if (p0 === 補助記号 || p0 === 記号) {
    return false;
  }
  if (token.dictionaryForm === "困る" || token.dictionaryForm === "難しい" || token.dictionaryForm === "遅い") {
    return true;
  }
  if (DAME_FORMS.has(token.surface)) {
    return true;
  }
  if (p0 === 動詞) {
    const next = tokens[start + 1];
    return next !== undefined && (next.pos & POS0) === 助動詞 && (next.dictionaryForm === "ない" || next.dictionaryForm === "ぬ");
  }
  if ((p0 === 名詞 || p0 === 形状詞) && start + 1 < n) {
    const next = tokens[start + 1];
    return next !== undefined
      && (next.pos & POS0) === 助動詞
      && isCopulaDaOrDesuDictionaryForm(next)
      && (DAME_FORMS.has(token.surface) || hasNegativeEvaluativePrefix(token.surface));
  }
  return false;
}

const NEGATIVE_EVALUATIVE_PREFIXES = new Set(["不", "無", "非", "未"]);

function hasNegativeEvaluativePrefix(surface: string): boolean {
  return surface.length >= 2 && NEGATIVE_EVALUATIVE_PREFIXES.has(surface[0] ?? "");
}


const HOSTLESS_INTERJECTION_TABLE_RELATIVE_PATH = "discourse/hostless_interjections.jsonl";

export interface HostlessInterjectionLexeme {
  readonly dictionaryForm: string;
  readonly reading: string;
}

export type HostlessInterjectionCondition = "marker_only_utterance";

export type HostlessInterjectionAdmission = "right_unbound" | "parenthetical_whole";

const HOSTLESS_INTERJECTION_ADMISSIONS: ReadonlySet<string> = new Set<HostlessInterjectionAdmission>([
  "right_unbound",
  "parenthetical_whole"
]);

interface HostlessInterjectionMatchAtom {
  readonly surfaces: ReadonlySet<string>;
  readonly posValue: number;
  readonly posMask: number;
}

interface HostlessInterjectionConditionalRealization {
  readonly when: HostlessInterjectionCondition;
  readonly lexeme: HostlessInterjectionLexeme;
}

export interface HostlessInterjectionEntry {
  readonly key: string;
  readonly match: readonly HostlessInterjectionMatchAtom[];
  readonly lexeme: HostlessInterjectionLexeme;
  readonly conditional: readonly HostlessInterjectionConditionalRealization[];
  readonly admission: readonly HostlessInterjectionAdmission[];
}

export interface HostlessInterjectionRowMatch {
  readonly key: string;
  readonly length: number;
  readonly lexemeIdentity: string;
  readonly admission: readonly HostlessInterjectionAdmission[];
}

export interface HostlessInterjectionVerdictFacts {
  readonly rowKey: string;
  readonly start: number;
  readonly endExclusive: number;
  readonly markerOnlyUtterance: boolean;
}

export interface HostlessInterjectionResolution {
  readonly key: string;
  readonly consumed: number;
  readonly reading: "interjection";
  readonly lexeme: HostlessInterjectionLexeme;
  readonly realization: HostlessInterjectionCondition | "default";
}

let _interjectionEntriesBySurface: Map<string, readonly HostlessInterjectionEntry[]> | undefined;
let _interjectionEntriesByKey: Map<string, HostlessInterjectionEntry> = new Map();

export async function initHostlessInterjectionData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), HOSTLESS_INTERJECTION_TABLE_RELATIVE_PATH);
  indexHostlessInterjectionEntries(parseHostlessInterjectionText(await loader.readTextFile(filePath)));
}

export function indexHostlessInterjectionEntries(entries: readonly HostlessInterjectionEntry[]): void {
  const bySurface = new Map<string, HostlessInterjectionEntry[]>();
  const byKey = new Map<string, HostlessInterjectionEntry>();
  for (const entry of entries) {
    byKey.set(entry.key, entry);
    for (const surface of entry.match[0]!.surfaces) {
      const bucket = bySurface.get(surface);
      if (bucket === undefined) {
        bySurface.set(surface, [entry]);
      } else {
        bucket.push(entry);
      }
    }
  }
  for (const bucket of bySurface.values()) {
    bucket.sort((left, right) => right.match.length - left.match.length);
  }
  _interjectionEntriesBySurface = bySurface;
  _interjectionEntriesByKey = byKey;
}

export function parseHostlessInterjectionText(text: string): readonly HostlessInterjectionEntry[] {
  const entries: HostlessInterjectionEntry[] = [];
  const seenKeys = new Set<string>();
  const where = (lineNumber: number) => `${HOSTLESS_INTERJECTION_TABLE_RELATIVE_PATH}:${lineNumber}`;
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (key !== "key" && key !== "match" && key !== "lexeme" && key !== "conditional" && key !== "admission") {
        throw new Error(`unknown hostless interjection key ${JSON.stringify(key)} at ${where(lineNumber)}`);
      }
    }
    if (typeof raw.key !== "string" || raw.key.length === 0 || seenKeys.has(raw.key)) {
      throw new Error(`invalid hostless interjection entry key at ${where(lineNumber)}`);
    }
    seenKeys.add(raw.key);
    entries.push({
      key: raw.key,
      match: parseHostlessInterjectionAtoms(raw.match, where(lineNumber)),
      lexeme: parseHostlessInterjectionLexeme(raw.lexeme, where(lineNumber)),
      conditional: parseHostlessInterjectionConditionals(raw.conditional, where(lineNumber)),
      admission: parseHostlessInterjectionAdmission(raw.admission, where(lineNumber))
    });
  }
  return entries;
}

function parseHostlessInterjectionAtoms(value: unknown, where: string): readonly HostlessInterjectionMatchAtom[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new Error(`invalid hostless interjection match at ${where}`);
  }
  return value.map((rawAtom: unknown) => {
    const atom = rawAtom as { readonly [key: string]: unknown };
    const surfaces = atom.surface;
    if (
      !Array.isArray(surfaces) || surfaces.length === 0 ||
      !surfaces.every((surface): surface is string => typeof surface === "string" && surface.length > 0)
    ) {
      throw new Error(`invalid hostless interjection match surface at ${where}`);
    }
    const pos = atom.pos;
    if (!Array.isArray(pos) || pos.length === 0 || !pos.every((item): item is string => typeof item === "string" && item.length > 0)) {
      throw new Error(`invalid hostless interjection match pos at ${where}`);
    }
    const query = posPrefixQuery(pos);
    return { surfaces: new Set(surfaces), posValue: query.value, posMask: query.mask };
  });
}

function parseHostlessInterjectionLexeme(value: unknown, where: string): HostlessInterjectionLexeme {
  const lexeme = value as { readonly [key: string]: unknown } | null | undefined;
  if (
    lexeme === null || lexeme === undefined ||
    typeof lexeme.dictionary_form !== "string" || lexeme.dictionary_form.length === 0 ||
    typeof lexeme.reading !== "string" || lexeme.reading.length === 0
  ) {
    throw new Error(`invalid hostless interjection lexeme at ${where}`);
  }
  return { dictionaryForm: lexeme.dictionary_form, reading: lexeme.reading };
}

function parseHostlessInterjectionConditionals(
  value: unknown,
  where: string
): readonly HostlessInterjectionConditionalRealization[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`invalid hostless interjection conditional at ${where}`);
  }
  return value.map((rawItem: unknown) => {
    const item = rawItem as { readonly [key: string]: unknown };
    if (item.when !== "marker_only_utterance") {
      throw new Error(`invalid hostless interjection condition ${JSON.stringify(item.when)} at ${where}`);
    }
    return { when: item.when, lexeme: parseHostlessInterjectionLexeme(item.lexeme, where) };
  });
}

function parseHostlessInterjectionAdmission(value: unknown, where: string): readonly HostlessInterjectionAdmission[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || !value.every((item): item is HostlessInterjectionAdmission => typeof item === "string" && HOSTLESS_INTERJECTION_ADMISSIONS.has(item))) {
    throw new Error(`invalid hostless interjection admission at ${where}`);
  }
  return value;
}

function hostlessInterjectionLexemeIdentity(lexeme: HostlessInterjectionLexeme): string {
  return `${lexeme.dictionaryForm}\u0000${lexeme.reading}`;
}

function matchesHostlessInterjectionEntryAt(
  tokens: readonly DemoDiscourseToken[],
  start: number,
  entry: HostlessInterjectionEntry
): boolean {
  for (let offset = 0; offset < entry.match.length; offset += 1) {
    const atom = entry.match[offset]!;
    const token = tokens[start + offset];
    if (token === undefined || !atom.surfaces.has(token.surface) || (token.pos & atom.posMask) !== atom.posValue) {
      return false;
    }
    if (offset > 0 && isSourceSeparatedFromPreviousToken(tokens, start + offset)) {
      return false;
    }
  }
  return true;
}

export function hostlessInterjectionRowMatchAt(
  tokens: readonly DemoDiscourseToken[],
  index: number
): HostlessInterjectionRowMatch | null {
  const head = tokens[index];
  if (head === undefined || _interjectionEntriesBySurface === undefined) {
    return null;
  }
  const entry = _interjectionEntriesBySurface.get(head.surface)?.find((candidate) =>
    matchesHostlessInterjectionEntryAt(tokens, index, candidate)
  );
  return entry === undefined
    ? null
    : {
      key: entry.key,
      length: entry.match.length,
      lexemeIdentity: hostlessInterjectionLexemeIdentity(entry.lexeme),
      admission: entry.admission
    };
}

export function resolveHostlessInterjectionAt(
  verdict: HostlessInterjectionVerdictFacts | undefined
): HostlessInterjectionResolution | null {
  if (verdict === undefined) {
    return null;
  }
  const entry = _interjectionEntriesByKey.get(verdict.rowKey);
  if (entry === undefined) {
    return null;
  }
  const conditional = entry.conditional.find((candidate) =>
    candidate.when === "marker_only_utterance" && verdict.markerOnlyUtterance
  );
  return {
    key: entry.key,
    consumed: verdict.endExclusive - verdict.start,
    reading: "interjection",
    lexeme: conditional?.lexeme ?? entry.lexeme,
    realization: conditional?.when ?? "default"
  };
}
