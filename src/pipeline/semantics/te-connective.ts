import { pairKey } from "../lookup-tables.js";
import type { LookupTables } from "../lookup-tables.js";
import { derivationForSense } from "../../dictionary/derivation.js";
import type { MorphemeDerivation, MorphemeEntry } from "../../types/dictionary.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import type { MatcherToken } from "../matchers.js";
import { getReferentTokenBeforeParticle } from "./helpers.js";
import { TokenCursor } from "../token-cursor.js";


import { NOMINAL_BITS, POS0, POS01, POS012, pos0in, 助詞_終助詞, 名詞_普通名詞_サ変可能, PREDICATE_AUX_BITS } from "../../types/pos.js";
export interface TeConnectiveToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export interface TeConnectiveEntry {
  readonly senses?: MorphemeEntry["senses"];
  readonly derivations?: readonly MorphemeDerivation[];
  readonly derivation?: {
    readonly id?: string;
    readonly type?: string;
  } | null;
}

export type TeConnectiveRelation =
  | "sequential"
  | "coordinate"
  | "cause"
  | "means"
  | "attendant"
  | "result_chain";

export type TeConnectiveSurfaceRole =
  | "linkage"
  | "listing"
  | "reason"
  | "adverbial"
  | "manner"
  | "result_chain";

export interface TeConnectiveEvidence {
  readonly source:
  | "lexical_prior"
  | "predicate_pair"
  | "next_predicate_category"
  | "argument_particles"
  | "clause_layout"
  | "tail_parser"
  | "voice"
  | "benefactive"
  | "surface_carrier"
  | "semantic_frame"
  | "translation_preference";
  readonly detail: string;
}

export interface TeConnectiveEvidenceRequirement {
  readonly source: TeConnectiveEvidence["source"];
  readonly predicate: string;
}

export interface TeConnectiveHypothesis {
  readonly id: string;
  readonly relation: TeConnectiveRelation;
  readonly surfaceRole: TeConnectiveSurfaceRole;
  readonly requiredEvidence?: readonly TeConnectiveEvidenceRequirement[];
  readonly blockers?: readonly TeConnectiveEvidenceRequirement[];
  readonly evidence: readonly TeConnectiveEvidence[];
}

export type TeConnectiveHypothesisGroup = readonly TeConnectiveHypothesis[];

export interface TeConnectiveDecisionStep {
  readonly action: "keep" | "prune" | "commit" | "fallback";
  readonly hypothesisId?: string;
  readonly reason: string;
}

export interface TeConnectiveClassification {
  readonly relation: TeConnectiveRelation;
  readonly surfaceRole: TeConnectiveSurfaceRole;
  readonly evidence: readonly TeConnectiveEvidence[];
  readonly committedBy: string;
  readonly decisionPath: readonly TeConnectiveDecisionStep[];
}

export interface TeConnectiveClassificationState {
  readonly groups: readonly TeConnectiveHypothesisGroup[];
  readonly committed: TeConnectiveClassification | null;
  readonly decisionPath: readonly TeConnectiveDecisionStep[];
}

export function teConnectivePrefersAseo(
  mainVerb: string | null | undefined,
  nextPredicateKey: string | null | undefined,
  options: {
    readonly nextPredicateCategory?: string | null;
    readonly nextPredicateDictForm?: string | null;
    readonly sourceNegated?: boolean;
  } = {},
  lookups: LookupTables
): boolean {
  if (mainVerb === undefined || mainVerb === null || mainVerb.length === 0) {
    return false;
  }
  if (options.sourceNegated !== true && lookups.TE_PRECEDING_CAUSAL_VERBS.has(mainVerb)) {
    return true;
  }
  const precedingCategory = tePrecedingCategory(mainVerb, lookups);
  if (
    options.nextPredicateCategory === "movement" &&
    (precedingCategory === "involuntary_state" || precedingCategory === "manner")
  ) {
    return true;
  }
  if (
    options.nextPredicateCategory === "reaction" &&
    (precedingCategory === "involuntary_state" || lookups.TE_PRECEDING_EMOTIVE_SOURCE_VERBS.has(mainVerb))
  ) {
    return true;
  }
  const nextKeys = [nextPredicateKey, options.nextPredicateDictForm].filter((key): key is string => key != null && key.length > 0);
  if (nextKeys.length === 0) {
    return false;
  }
  if (nextKeys.some((nextKey) => lookups.TE_SEQUENTIAL_VERB_PAIRS.has(pairKey(mainVerb, nextKey)))) {
    return true;
  }
  if (nextKeys.some((nextKey) => lookups.TE_CAUSAL_VERB_PAIRS.has(pairKey(mainVerb, nextKey)))) {
    return true;
  }
  if (nextKeys.some((nextKey) => lookups.TE_SEQUENTIAL_FOLLOWING_VERBS.has(nextKey))) {
    return lookups.TE_PRECEDING_INVOLUNTARY_STATE_VERBS.has(mainVerb) || lookups.TE_PRECEDING_MANNER_VERBS.has(mainVerb);
  }
  if (
    (lookups.TE_PRECEDING_INVOLUNTARY_STATE_VERBS.has(mainVerb) || lookups.TE_PRECEDING_EMOTIVE_SOURCE_VERBS.has(mainVerb)) &&
    nextKeys.some((nextKey) => lookups.TE_FOLLOWING_REACTION_PREDICATES.has(nextKey))
  ) {
    return true;
  }
  return false;
}

export function followerInabilityPrefersAseo(options: {
  readonly nextEntry?: TeConnectiveEntry | null;
  readonly nextKoreanLemma?: string | null;
  readonly nextIsNegative?: boolean;
  readonly nextIsPotential?: boolean;
}): boolean {
  if (options.nextIsNegative !== true) {
    return false;
  }
  const derivationType = derivationForSense(options.nextEntry?.senses?.[0] ?? null, options.nextEntry).id;
  return options.nextIsPotential === true ||
    derivationType === "potential" ||
    (options.nextKoreanLemma != null && options.nextKoreanLemma.endsWith(" 수 있다"));
}

export function tePrecedingCategory(mainVerb: string | null | undefined, lookups: LookupTables): string | null {
  if (mainVerb === undefined || mainVerb === null || mainVerb.length === 0) {
    return null;
  }
  if (lookups.TE_PRECEDING_MANNER_VERBS.has(mainVerb)) {
    return "manner";
  }
  if (lookups.TE_PRECEDING_INVOLUNTARY_STATE_VERBS.has(mainVerb)) {
    return "involuntary_state";
  }
  if (lookups.TE_PRECEDING_CAUSAL_VERBS.has(mainVerb)) {
    return "causal";
  }
  return null;
}

function extractSahenPredicateHead(
  tokens: readonly TeConnectiveToken[],
  predIdx: number | null | undefined,
  predicateDictForm: string | null | undefined
): string | null {
  if (predicateDictForm !== "する" || predIdx === undefined || predIdx === null || predIdx <= 0) {
    return null;
  }
  const noun = tokens[predIdx - 1];
  const nounPos = noun?.pos ?? 0;
  if (noun !== undefined && (nounPos & POS012) === 名詞_普通名詞_サ変可能) {
    return noun.dictionaryForm || noun.surface;
  }
  return null;
}

export function buildPredicateLookupKey(
  tokens: readonly TeConnectiveToken[],
  predicateDictForm: string | null | undefined,
  particleIndices: ReadonlySet<number> | null | undefined,
  options: { readonly predIdx?: number | null } = {},
  lookups: LookupTables
): string | null {
  if (predicateDictForm == null || predicateDictForm.length === 0) {
    return null;
  }
  if (particleIndices != null && particleIndices.size > 0) {
    for (const particleIdx of [...particleIndices].sort((left, right) => left - right)) {
      const token = tokens[particleIdx];
      if (caseParticleMarkerRelationForToken(token, particleIdx, {
        acceptedSurfaces: ["を"],
        consumers: ["connective_helpers"]
      }) === null) {
        continue;
      }
      const referent = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
      if (referent === null) {
        continue;
      }
      if (!pos0in(referent.pos, NOMINAL_BITS)) {
        continue;
      }
      const noun = referent.dictionaryForm || referent.surface;
      if (noun.length > 0) {
        return `${noun}を${predicateDictForm}`;
      }
    }
  }
  const sahenHead = extractSahenPredicateHead(tokens, options.predIdx, predicateDictForm);
  if (sahenHead !== null) {
    return `${sahenHead}する`;
  }
  return predicateDictForm;
}

export function classifyNextPredicateCategory(
  tokens: readonly TeConnectiveToken[],
  predIdx: number,
  predicateDictForm: string | null | undefined,
  predicateKey: string | null | undefined,
  lookups: LookupTables
): string | null {
  if (predicateKey != null && lookups.TE_FOLLOWING_REACTION_PREDICATES.has(predicateKey)) {
    return "reaction";
  }
  if (predicateDictForm != null && lookups.TE_SEQUENTIAL_FOLLOWING_VERBS.has(predicateDictForm)) {
    return "movement";
  }
  if (predicateKey != null && predicateKey.endsWith("する")) {
    const sahenHead = predicateKey.slice(0, -"する".length);
    if (lookups.TE_MOVEMENT_SAHEN_NOUNS.has(sahenHead)) {
      return "movement";
    }
  }
  const sahenHead = extractSahenPredicateHead(tokens, predIdx, predicateDictForm);
  if (sahenHead !== null && lookups.TE_MOVEMENT_SAHEN_NOUNS.has(sahenHead)) {
    return "movement";
  }
  return null;
}

export function adjectiveConnectivePrefersAseo(options: {
  readonly nextEntry?: TeConnectiveEntry | null;
  readonly nextKoreanLemma?: string | null;
  readonly nextPredicateDictForm?: string | null;
  readonly nextIsNegative?: boolean;
  readonly nextIsPotential?: boolean;
} = {}, lookups: LookupTables): boolean {
  if (followerInabilityPrefersAseo(options)) {
    return true;
  }
  if (options.nextPredicateDictForm != null && lookups.ADJECTIVE_CONNECTIVE_REACTION_VERBS.has(options.nextPredicateDictForm)) {
    return true;
  }
  if (options.nextPredicateDictForm != null && lookups.INVOLUNTARY_RESULT_VERBS.has(options.nextPredicateDictForm)) {
    return true;
  }
  return false;
}


function hasVerbalBeforeBoundary(cursor: TokenCursor<MatcherToken>): boolean {
  for (let index = cursor.pos; index < cursor.end; index += 1) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      continue;
    }
    const pos0 = token.pos & POS0;
    if (isHardTerminalPunctuationToken(token)) {
      return false;
    }
    if ((token.pos & POS01) === 助詞_終助詞) {
      return false;
    }
    if (pos0in(pos0, PREDICATE_AUX_BITS)) {
      return true;
    }
  }
  return false;
}

export interface TeClauseConnectorMatch {
  readonly ending: string;
  readonly boundaryScan: { readonly anchorIdx: number; readonly endExclusive: number } | null;
}

export function matchClauseConnector(cursor: TokenCursor<MatcherToken>): TeClauseConnectorMatch | undefined {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const token = cursor.current();
  if (token === undefined) {
    return undefined;
  }
  if (isTeConnectiveToken(token)) {
    const next = tokens[pos + 1];
    const nextIsEnd = next === undefined ||
      isHardTerminalPunctuationToken(next) ||
      (next.pos & POS01) === 助詞_終助詞;
    if (nextIsEnd) {
      cursor.advance();
      return { ending: "아/어", boundaryScan: null };
    }
    cursor.advance();
    return {
      ending: hasVerbalBeforeBoundary(cursor.fork(pos + 1, n)) ? "고" : "아/어",
      boundaryScan: { anchorIdx: pos + 1, endExclusive: n }
    };
  }
  return undefined;
}
