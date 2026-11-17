
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import {
  POS0,
  POS4,
  POS5A,
  isNominalLike,
  isVoiceOrCausativeAuxiliaryToken,
  動詞,
  助動詞,
  助動詞_レル,
  助詞,
  意志推量形_
} from "../../types/pos.js";
import { matrixPredicateReachAt } from "../head-tail/boundary/modifier-field.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import {
  VOLITIONAL_ATTEMPT_CARRIER_PREDICATES,
  VOLITIONAL_INTENT_CONTENT_PREDICATES
} from "../head-tail/data/semantic-helper-sets.js";
import type { VolitionalAttemptFocusParticle } from "../head-tail/tail/predicate-root/grammar.js";
import {
  isAffirmativeCopulaSupportVerbToken,
  isSahenLightVerbPredicateKeyAt,
  volitionalIntentMarkerShapeAt
} from "../head-tail/tail/predicate-root/classifiers/tokens.js";

export type VolitionalLexicalBindingConstruction = "attempt" | "intent_content";

export interface VolitionalIntentBindingEvidence {
  readonly kind: "volitional_intent_binding";
  readonly markerIdx: number;
  readonly hostIdx: number;
  readonly predicateIdx: number;
  readonly construction: VolitionalLexicalBindingConstruction;
  readonly tokenCount: 1 | 2;
  readonly focusParticle?: VolitionalAttemptFocusParticle;
}

interface BindingToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
}

export function volitionalLexicalBindingAt(
  tokens: readonly BindingToken[],
  markerIdx: number,
  clauseStart: number,
  lookups: LookupTables
): VolitionalIntentBindingEvidence | null {
  const hostIdx = markerIdx - 1;
  const host = tokens[hostIdx];
  if (host === undefined || hostIdx < clauseStart || !isVolitionalWillHost(host, lookups)) {
    return null;
  }
  const marker = volitionalIntentMarkerShapeAt(tokens, markerIdx);
  if (marker === null) {
    return null;
  }
  if (marker.focusParticle === "は" || marker.focusParticle === "も") {
    return null;
  }
  const start = markerIdx + marker.tokenCount;
  if (start >= tokens.length) {
    return null;
  }
  let predicateIdx: number | null = null;
  let construction: VolitionalLexicalBindingConstruction | null = null;
  const reach = matrixPredicateReachAt(tokens as readonly RuntimeHaruToken[], start, tokens.length, {
    registeredPredicateStart: (candidates, idx) => {
      const found = lexicalBindingConstructionAt(candidates, idx, lookups);
      if (found !== null) {
        predicateIdx = idx;
        construction = found;
        return true;
      }
      return false;
    },
    openPredicateStart: () => false
  });
  if (reach !== "predicate" || predicateIdx === null || construction === null) {
    return null;
  }
  if (hasFreeChoiceConcessiveLicence(tokens, clauseStart, hostIdx, lookups)) {
    return null;
  }
  if (hasOwnSubjectOnBothSides(tokens, clauseStart, hostIdx, start, predicateIdx)) {
    return null;
  }
  return {
    kind: "volitional_intent_binding",
    markerIdx,
    hostIdx,
    predicateIdx,
    construction,
    tokenCount: marker.tokenCount,
    ...(marker.focusParticle === undefined ? {} : { focusParticle: marker.focusParticle })
  };
}

function isVolitionalWillHost(token: BindingToken, lookups: LookupTables): boolean {
  if ((token.pos & POS5A) !== 意志推量形_) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 助動詞) {
    return isVoiceOrCausativeAuxiliaryToken({ pos: token.pos, dictionaryForm: token.dictionaryForm ?? "" }) &&
      (token.pos & POS4) !== 助動詞_レル;
  }
  if (pos0 !== 動詞 || isAffirmativeCopulaSupportVerbToken(token)) {
    return false;
  }
  return !lookups.SPEECH_ACT_TE_IISASHI_NONVOLITIONAL_VERBS.has(token.dictionaryForm || token.surface);
}

function lexicalBindingConstructionAt(
  tokens: readonly BindingToken[],
  idx: number,
  lookups: LookupTables
): VolitionalLexicalBindingConstruction | null {
  const token = tokens[idx];
  if (token === undefined) {
    return null;
  }
  const key = (token.pos & POS0) === 動詞
    ? token.dictionaryForm || token.surface
    : isSahenLightVerbPredicateKeyAt(tokens, idx);
  if (key === null) {
    return null;
  }
  if (lookups.QUOTE_HOST_REGISTRY.kind("direct", key) !== undefined) {
    return null;
  }
  if (VOLITIONAL_ATTEMPT_CARRIER_PREDICATES.has(key)) {
    return "attempt";
  }
  return VOLITIONAL_INTENT_CONTENT_PREDICATES.has(key) ? "intent_content" : null;
}

function hasOwnSubjectOnBothSides(
  tokens: readonly BindingToken[],
  clauseStart: number,
  hostIdx: number,
  fieldStart: number,
  predicateIdx: number
): boolean {
  let matrixSubject = false;
  for (let idx = fieldStart; idx < predicateIdx && !matrixSubject; idx += 1) {
    matrixSubject = isNominativeSubjectMarkerAt(tokens, idx);
  }
  if (!matrixSubject) {
    return false;
  }
  for (let idx = Math.max(0, clauseStart); idx < hostIdx; idx += 1) {
    if (isNominativeSubjectMarkerAt(tokens, idx)) {
      return true;
    }
  }
  return false;
}

function isNominativeSubjectMarkerAt(tokens: readonly BindingToken[], idx: number): boolean {
  const token = tokens[idx];
  const host = tokens[idx - 1];
  if (token === undefined || host === undefined || !isNominalLike(host)) {
    return false;
  }
  return caseParticleMarkerRelationForToken(token, idx, { acceptedSurfaces: ["が"], consumers: ["clause_layout"] }) !== null;
}

function hasFreeChoiceConcessiveLicence(
  tokens: readonly BindingToken[],
  clauseStart: number,
  hostIdx: number,
  lookups: LookupTables
): boolean {
  const hosts = lookups.set("volitional_concessive", "licensing_hosts");
  const modifiers = lookups.set("volitional_concessive", "licensing_host_modifiers");
  const adverbs = lookups.set("volitional_concessive", "licensing_adverbs");
  for (let idx = Math.max(0, clauseStart); idx < hostIdx; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const form = token.dictionaryForm || token.surface;
    if (adverbs.has(form) || adverbs.has(token.surface) || modifiers.has(form)) {
      return true;
    }
    if (hosts.has(form) && !indefiniteMarkerSpanFollows(tokens, idx + 1, lookups)) {
      return true;
    }
  }
  return false;
}

function indefiniteMarkerSpanFollows(
  tokens: readonly BindingToken[],
  start: number,
  lookups: LookupTables
): boolean {
  const markers = lookups.set("volitional_concessive", "indefinite_markers");
  let surface = "";
  for (let idx = start; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 !== 助詞 && pos0 !== 助動詞) {
      return false;
    }
    surface += token.surface;
    if (markers.has(surface)) {
      return true;
    }
    if (![...markers].some((marker) => marker.startsWith(surface))) {
      return false;
    }
  }
  return false;
}

