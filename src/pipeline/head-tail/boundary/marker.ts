import { isHardTerminalPunctuationToken, isTerminalishPunctuationToken, type BoundaryToken } from "./punctuation.js";
import { isCopularTokaKaMarker, isTokaListingKaMarker } from "./ka-ownership.js";
import { isParentheticalClosingToken, parentheticalSpanEndingAt } from "./parenthetical.js";
import { quoteMarkerRelationAt } from "./quote-marker.js";
import { compositeConnectivePatternRelationAt } from "../tail/connective-span-scanner.js";
import { terminalPunctuationRunQuestionTokenIndex } from "../../clause-layout/punctuation.js";
import { activeProtoLayout } from "../../clause-layout/proto-state.js";
import {
  nextNonSpaceIndex,
  previousNonSpaceIndex
} from "../../clause-layout/trivia.js";
import { TokenCursor } from "../../token-cursor.js";
import { lookupConnectiveBySurface, lookupConnectiveParticleSubtypesBySurface } from "../tail/predicate-root/connective-surface-lookup.js";
import type { ConnectiveKind } from "../tail/predicate-root/grammar.js";
import { nominalFrameTailSurfaceSpecs } from "../tail/segments/nominal-frame.js";
import { loadTailAttachmentRegistry, nominalFrameDataGeneration } from "../head/adapters/nominal/frame-table.js";
import type { TailAttachmentTePolicy } from "../head/adapters/nominal/grammar.js";
import { canonicalTerminalSfpSurface } from "../../semantics/sfp-surface.js";
import {
  demoDiscourseConnectiveSpanCovering,
  type DemoDiscourseToken
} from "../../demo-discourse.js";
import type {

  BoundaryRelationConsumer,
  CaseParticleMarkerRelation,
  CaseParticleMarkerSurface,
  CopulaDeMarkerRelation,
  CopulaHonorificSupportRelation,
  CopulaElidedNegativeBodyRelation,
  CopulaNiMarkerRelation,
  ExternalNominalizerConnectiveKind,
  BridgeArgumentRelation,
  KaContinuationRelation,
  KaMarkerRelation,
  MarkerBoundaryRelation,
  NominalLinkMarkerRelation,
  NominalizerContinuationRelation,
  NominalizerRelation,
  PredicateNominalizerRelationKind,
  PronominalNoMarkerRelation,
  PronominalNoMarkerRequirement,
  ScopeBridgeMarkerRelation,
  TopicFocusMarkerRelation,
  TopicFocusMarkerSurface
} from "./relation.js";
import { isExternalNominalizerConnectiveKind } from "./relation.js";
import { RETROSPECTIVE_THOUGHT_VERBS } from "../data/modality-sets.js";
import { IU_LEXEME_FORMS } from "../data/quoted-reporting-sets.js";
import { scopeBridgeFocusKindForSurface, type ScopeBridgeFocusKind } from "../data/scope-bridge-focus-table.js";
import { fusedCopulaSupportConnectiveAt, isAffirmativeCopulaSupportVerbToken, isClauseClosingPredicateTailToken, isGozaruPoliteSupportToken, isIntrinsicHonorificCopulaSupportVerbToken } from "../tail/predicate-root/classifiers/tokens.js";
import type { FusedCopulaSupportConnectiveKind } from "../tail/predicate-root/classifiers/tokens.js";
import { isInferentialBoundAttributiveHead } from "../tail/predicate-root/structural-attributive-head-table.js";

import { prolongationMarkIdentityForm } from "../../../types/token.js";
import { POS0, POS01, POS1, POS1_OF_NAME, POS4, POS5, POS5A, 仮定形_, 格助詞, 係助詞, 終助詞, 準体助詞, 助詞, 助詞_係助詞, 助詞_格助詞, 助詞_接続助詞, 助詞_副助詞, 助詞_終助詞, 助詞_準体助詞, 助動詞, 助動詞_ジャ, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 接続助詞, 動詞, 形容詞0, 副助詞, 連用形_, 連用形_一般, 連用形_ニ, NOMINAL_BITS, pos0in, isAdverbCapableNominal, isAssertiveCopulaFamilyPos, isAdjectivalInflectionRenyouToken, isBindingParticleToken, isCaseParticleToken, isConjunctiveParticleToken, isCounterCapableToken, isNumeralToken } from "../../../types/pos.js";
const QUOTE_HOST_PREFIX_ARGUMENT_PARTICLES = new Set(["に", "から"]);
const QUOTE_HOST_SEARCH_BRIDGE_ARGUMENT_PARTICLES: ReadonlySet<string> = new Set([
  "は", "が", "も", "を", "に", "へ", "で", "の", "と"
]);

const QUESTION_CONTENT_NOMINALIZER_PARTICLES = new Set(["が", "を", "は", "も", "で", "に", "の"]);

const DEFAULT_CASE_PARTICLE_MARKER_SURFACES: ReadonlySet<CaseParticleMarkerSurface> = new Set([
  "が",
  "を",
  "に",
  "で",
  "から",
  "より",
  "へ",
  "と",
  "の"
]);
const DEFAULT_TOPIC_FOCUS_MARKER_SURFACES: ReadonlySet<TopicFocusMarkerSurface> = new Set(["は", "も"]);
const QUESTION_CONTENT_EXTERNAL_SUFFIX_FORMS = new Set(["など", "等"]);

function isQuestionContentExternalSuffixToken(token: BoundaryToken): boolean {
  const form = tokenForm(token);
  if (QUESTION_CONTENT_EXTERNAL_SUFFIX_FORMS.has(form) || QUESTION_CONTENT_EXTERNAL_SUFFIX_FORMS.has(token.surface)) {
    return true;
  }
  return nominalFrameTailSurfaceSpecs().some(spec => spec.surface === token.surface);
}

const PREDICATE_NOMINALIZER_BY_SURFACE: Readonly<Record<string, PredicateNominalizerRelationKind>> = {
  "こと": "koto",
  "の": "no",
  "もの": "mono",
  "ため": "tame"
};
const TAIL_CONNECTIVE_NOMINALIZER_BY_SURFACE: Readonly<Record<string, PredicateNominalizerRelationKind>> = {
  ...PREDICATE_NOMINALIZER_BY_SURFACE,
  "ん": "no"
};

const PRONOMINAL_NO_MARKER_SURFACES: ReadonlySet<string> = new Set(
  Object.entries(TAIL_CONNECTIVE_NOMINALIZER_BY_SURFACE)
    .filter(([, kind]) => kind === "no")
    .map(([surface]) => surface)
);

export function kaMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["embedded_question", "clause_layout", "quote_content"]
): KaMarkerRelation | null {
  return kaMarkerRelationForToken(tokens[index], index, consumers);
}

type KaMarkerParticleSubtype = KaMarkerRelation["particleSubtype1"];
type ParticleSubtypeOption = number | string;

const DEFAULT_KA_MARKER_PARTICLE_SUBTYPES: ReadonlySet<KaMarkerParticleSubtype> = new Set([
  副助詞,
  終助詞
]);

export function kaMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] = ["embedded_question"],
  options: {
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
  } = {}
): KaMarkerRelation | null {
  if (token === undefined || canonicalTerminalSfpSurface(token.surface) !== "か" || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const particleSubtype1 = kaMarkerParticleSubtype(token.pos & POS1);
  const accepted = options.acceptedParticleSubtypes === undefined
    ? DEFAULT_KA_MARKER_PARTICLE_SUBTYPES
    : numericParticleSubtypeSet(options.acceptedParticleSubtypes);
  if (particleSubtype1 === null || !accepted.has(particleSubtype1)) {
    return null;
  }
  return {
    kind: "ka_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: particleSubtype1 === 副助詞
      ? "question/choice ka particle tagged as fukujoshi"
      : particleSubtype1 === 終助詞
        ? "question/choice ka particle tagged as shuujoshi"
        : "question/choice ka particle accepted for consumer-local kakarijoshi fixture",
    consumers,
    surface: token.surface,
    role: "question_particle",
    particleSubtype1
  };
}

export function isQuestionParticleKaToken(token: BoundaryToken | undefined): boolean {
  return kaMarkerRelationForToken(token, -1) !== null;
}

function opensLexicalizedDiscourseConnectiveAt(
  tokens: readonly BoundaryToken[],
  index: number
): boolean {
  const span = demoDiscourseConnectiveSpanCovering(
    tokens as unknown as readonly DemoDiscourseToken[],
    index
  );
  return span !== null && span.start === index;
}

export function questionContentContinuationAfterKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly limit?: number;
    readonly requireAdjacent?: boolean;
  } = {}
): KaContinuationRelation | null {
  const consumers = options.consumers ?? ["embedded_question", "clause_layout", "tail_multi_clause"];
  const ka = kaMarkerRelationAt(tokens, kaIdx, consumers);
  if (ka === null) {
    return null;
  }
  const continuationIdx = nextNonSpaceIndex(tokens, ka.span.endExclusive, options.limit ?? tokens.length);
  if (continuationIdx === null) {
    return null;
  }
  if (options.requireAdjacent === true && continuationIdx !== ka.span.endExclusive) {
    return null;
  }
  const continuation = tokens[continuationIdx];
  if (continuation === undefined) {
    return null;
  }
  if (opensLexicalizedDiscourseConnectiveAt(tokens, continuationIdx)) {
    return null;
  }
  if (options.requireAdjacent !== true && isHardTerminalPunctuationToken(continuation)) {
    let punctuationEndExclusive = continuationIdx + 1;
    let bridgedIdx = nextNonSpaceIndex(tokens, punctuationEndExclusive, options.limit ?? tokens.length);
    while (bridgedIdx !== null && isHardTerminalPunctuationToken(tokens[bridgedIdx])) {
      punctuationEndExclusive = bridgedIdx + 1;
      bridgedIdx = nextNonSpaceIndex(tokens, punctuationEndExclusive, options.limit ?? tokens.length);
    }
    const bridged = bridgedIdx === null ? undefined : tokens[bridgedIdx];
    if (
      bridgedIdx !== null &&
      bridged !== undefined &&
      ((bridged.pos & POS01) === 助詞_格助詞 || (bridged.pos & POS01) === 助詞_係助詞) &&
      !opensLexicalizedDiscourseConnectiveAt(tokens, bridgedIdx) &&
      dewaScopeBridgeRelationAt(tokens, bridgedIdx, { consumers }) === null &&
      QUESTION_CONTENT_NOMINALIZER_PARTICLES.has(bridged.surface)
    ) {
      return buildKaContinuationRelation({
        kaIdx,
        continuationIdx: bridgedIdx,
        continuation: bridged,
        continuationKind: "question_nominalizer_particle",
        endExclusive: bridgedIdx + 1,
        bridgePunctuationSpan: { start: continuationIdx, endExclusive: punctuationEndExclusive },
        reason: "question content ka reaches a nominalizing particle through hard terminal punctuation",
        consumers
      });
    }
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, continuationIdx, {
    consumers
  });
  if (quoteMarker?.canonicalSurface === "と" || quoteMarker?.canonicalSurface === "って") {
    return buildKaContinuationRelation({
      kaIdx,
      continuationIdx,
      continuation,
      continuationKind: "question_quote_marker",
      reason: `question content ka is followed by quotative ${quoteMarker.canonicalSurface}`,
      consumers
    });
  }
  const closeIdx = isParentheticalClosingToken(continuation)
    ? continuationIdx
    : isTerminalishPunctuationToken(continuation)
      ? nextNonSpaceIndex(tokens, continuationIdx + 1, options.limit ?? tokens.length)
      : null;
  if (closeIdx !== null && isParentheticalClosingToken(tokens[closeIdx])) {
    const quotedSpan = parentheticalSpanEndingAt(tokens, closeIdx, { consumers });
    const markerIdx = nextNonSpaceIndex(tokens, closeIdx + 1, options.limit ?? tokens.length);
    const bracketedQuoteMarker = markerIdx === null
      ? null
      : quoteMarkerRelationAt(tokens, markerIdx, { consumers });
    if (
      quotedSpan?.role === "explicit_quote_span" &&
      quotedSpan.openingIdx < kaIdx &&
      !isJanaiConfirmationKaBaseAt(tokens, kaIdx, quotedSpan.openingIdx + 1) &&
      (bracketedQuoteMarker?.canonicalSurface === "と" || bracketedQuoteMarker?.canonicalSurface === "って")
    ) {
      const markerToken = tokens[markerIdx!];
      if (markerToken !== undefined) {
        return buildKaContinuationRelation({
          kaIdx,
          continuationIdx: markerIdx!,
          continuation: markerToken,
          continuationKind: "question_quote_marker",
          reason: `bracketed question content ka is followed by quotative ${bracketedQuoteMarker.canonicalSurface}`,
          consumers
        });
      }
    }
  }
  const alternative = matchQuestionAlternativeContinuation({
    tokens,
    pos: continuationIdx,
    end: options.limit ?? tokens.length
  }, consumers);
  if (alternative !== null) {
    return buildKaContinuationRelation({
      kaIdx,
      continuationIdx,
      continuation,
      continuationKind: "question_alternative_marker",
      continuationSurface: alternative.surface,
      endExclusive: alternative.endExclusive,
      reason: "question content ka is followed by alternative marker どうか",
      consumers
    });
  }
  if (isQuestionContentCopulaDeContinuationToken(continuation)) {
    return buildKaContinuationRelation({
      kaIdx,
      continuationIdx,
      continuation,
      continuationKind: "question_copula_de",
      reason: "question content ka is followed by copula で, so the question phrase remains nominalized",
      consumers
    });
  }
  if ((continuation.pos & POS0) !== 助詞) {
    return null;
  }
  if (isQuestionContentExternalSuffixToken(continuation)) {
    return buildKaContinuationRelation({
      kaIdx,
      continuationIdx,
      continuation,
      continuationKind: "question_external_suffix",
      reason: "question content ka is followed by an external suffix or nominal frame tail",
      consumers
    });
  }
  if (
    QUESTION_CONTENT_NOMINALIZER_PARTICLES.has(continuation.surface) &&
    isQuestionContentNominalizerParticleSubtype(continuation)
  ) {
    return buildKaContinuationRelation({
      kaIdx,
      continuationIdx,
      continuation,
      continuationKind: "question_nominalizer_particle",
      reason: "question content ka is followed by a nominalizing case/topic particle",
      consumers
    });
  }
  return null;
}

function isQuestionContentNominalizerParticleSubtype(continuation: BoundaryToken): boolean {
  const subtype = continuation.pos & POS01;
  return subtype === 助詞_格助詞 || subtype === 助詞_係助詞 || subtype === 助詞_準体助詞;
}

export function questionContentPunctuationBridgeRelationAt(
  tokens: readonly BoundaryToken[],
  punctuationIdx: number,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): KaContinuationRelation | null {
  if (!isHardTerminalPunctuationToken(tokens[punctuationIdx])) return null;
  let cursor = punctuationIdx;
  let previous = previousNonSpaceIndex(tokens, cursor);
  while (previous !== null && isHardTerminalPunctuationToken(tokens[previous])) {
    cursor = previous;
    previous = previousNonSpaceIndex(tokens, cursor);
  }
  if (previous === null) return null;
  const relation = questionContentContinuationAfterKaRelationAt(tokens, previous, {
    ...(options.consumers === undefined ? {} : { consumers: options.consumers })
  });
  const span = relation?.bridgePunctuationSpan;
  return span !== undefined && span.start <= punctuationIdx && punctuationIdx < span.endExclusive
    ? relation
    : null;
}

export function isJanaiConfirmationKaBaseAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lowerBoundInclusive = 0
): boolean {
  const negativeIdx = previousNonSpaceIndex(tokens, kaIdx, lowerBoundInclusive);
  const negative = negativeIdx === null ? undefined : tokens[negativeIdx];
  if (
    negativeIdx === null || negative === undefined ||
    ((negative.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ナイ) &&
      tokenForm(negative) !== "ない" && negative.surface !== "ない")
  ) {
    return false;
  }
  const bridgeIdx = previousNonSpaceIndex(tokens, negativeIdx, lowerBoundInclusive);
  const bridge = bridgeIdx === null ? undefined : tokens[bridgeIdx];
  if (bridgeIdx === null || bridge === undefined) {
    return false;
  }
  if ((bridge.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ジャ) || bridge.surface === "じゃ") {
    return true;
  }
  if (tokenForm(bridge) !== "は") {
    return false;
  }
  const copulaIdx = previousNonSpaceIndex(tokens, bridgeIdx, lowerBoundInclusive);
  const copula = copulaIdx === null ? undefined : tokens[copulaIdx];
  return copula !== undefined && copula.surface === "で";
}

export function quoteHostPrefixArgumentRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly markerIdx: number;
    readonly hostIdx: number;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  }
): BridgeArgumentRelation | null {
  const token = tokens[index];
  if (
    token === undefined ||
    (token.pos & POS0) !== 助詞 ||
    !QUOTE_HOST_PREFIX_ARGUMENT_PARTICLES.has(token.surface)
  ) {
    return null;
  }
  const previous = previousNonSpaceIndex(tokens, index);
  if (previous === null || !isNounishBoundaryToken(tokens[previous])) {
    return null;
  }
  return {
    kind: "bridge_argument",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "quote host prefix argument belongs to the quote-taking host, not the quoted content",
    consumers: options.consumers ?? ["clause_layout", "quote_content"],
    surface: token.surface,
    role: "quote_host_prefix_argument",
    argumentKind: bridgeArgumentKindForSurface(token.surface),
    markerIdx: options.markerIdx,
    hostIdx: options.hostIdx
  };
}

export function quoteHostSearchBridgeArgumentRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly headIdx?: number;
    readonly consumers?: readonly BoundaryRelationConsumer[];
    readonly admitCompoundCaseMarker?: boolean;
  } = {}
): BridgeArgumentRelation | null {
  const token = tokens[index];
  if (
    token === undefined ||
    !closesQuoteHostSearchBridgeNounPhrase(token, index, options.admitCompoundCaseMarker === true)
  ) {
    return null;
  }
  if (options.headIdx !== undefined && !isNounishBoundaryToken(tokens[options.headIdx])) {
    return null;
  }
  return {
    kind: "bridge_argument",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "quote host search can bridge this particle-bearing noun phrase before the host",
    consumers: options.consumers ?? ["quote_host_taxonomy", "quote_content"],
    surface: token.surface,
    role: "quote_host_search_bridge_argument",
    argumentKind: bridgeArgumentKindForSurface(token.surface),
    ...(options.headIdx === undefined ? {} : { headIdx: options.headIdx })
  };
}

function closesQuoteHostSearchBridgeNounPhrase(
  token: BoundaryToken,
  index: number,
  admitCompoundCaseMarker: boolean
): boolean {
  if ((token.pos & POS0) === 助詞 && QUOTE_HOST_SEARCH_BRIDGE_ARGUMENT_PARTICLES.has(token.surface)) {
    return true;
  }
  return admitCompoundCaseMarker && isCaseParticleToken(token);
}

function bridgeArgumentKindForSurface(surface: string): BridgeArgumentRelation["argumentKind"] {
  if (surface === "が" || surface === "は" || surface === "も") {
    return "subject_topic";
  }
  if (surface === "を") {
    return "object";
  }
  return "other";
}

export function predicateNominalizerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly requirement?: "head_anchor" | "strict_particle" | "tail_connective_marker" | "quote_tail_marker" | "terminal_noda_marker" | "postverb_chain_marker";
    readonly acceptedSurfaces?: readonly string[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): NominalizerRelation | null {
  if (token === undefined) {
    return null;
  }
  const requirement = options.requirement ?? "head_anchor";
  const kind = predicateNominalizerKindForToken(token, requirement);
  if (kind === null) {
    return null;
  }
  if (options.acceptedSurfaces !== undefined && !options.acceptedSurfaces.includes(token.surface)) {
    return null;
  }
  return {
    kind: "nominalizer",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: `predicate nominalizer (${kind}) accepted for ${requirement}`,
    consumers: options.consumers ?? ["nominal_head", "nominal_head_parser", "content_head_dispatch"],
    surface: token.surface,
    role: "predicate_nominalizer",
    nominalizerKind: kind,
    requirement
  };
}

export function nominalLinkMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): NominalLinkMarkerRelation | null {
  return nominalLinkMarkerRelationForToken(tokens[index], index, options);
}

export function nominalLinkMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): NominalLinkMarkerRelation | null {
  if (token === undefined || token.surface !== "の" || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const particleSubtype1 = token.pos & POS1;
  if (particleSubtype1 === 準体助詞 || particleSubtype1 === 終助詞) {
    return null;
  }
  return {
    kind: "nominal_link_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "adnominal/genitive の links a nominal modifier to the following nominal head",
    consumers: options.consumers ?? ["content_head_dispatch", "nominal_head", "nominal_head_parser"],
    surface: token.surface,
    role: "adnominal_no_marker",
    linkKind: particleSubtype1 === 格助詞 ? "genitive" : "adnominal_modifier",
    particleSubtype1
  };
}

export function caseParticleMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly acceptedSurfaces?: readonly CaseParticleMarkerSurface[];
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CaseParticleMarkerRelation | null {
  return caseParticleMarkerRelationForToken(tokens[index], index, options);
}

export function caseParticleMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly acceptedSurfaces?: readonly CaseParticleMarkerSurface[];
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CaseParticleMarkerRelation | null {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const particleSubtype1 = token.pos & POS1;
  const acceptedParticleSubtypes = options.acceptedParticleSubtypes === undefined
    ? new Set([格助詞])
    : numericParticleSubtypeSet(options.acceptedParticleSubtypes);
  if (!acceptedParticleSubtypes.has(particleSubtype1)) {
    return null;
  }
  const caseSurface = caseParticleMarkerSurface(token.surface);
  const accepted = options.acceptedSurfaces === undefined
    ? DEFAULT_CASE_PARTICLE_MARKER_SURFACES
    : new Set(options.acceptedSurfaces);
  if (caseSurface === null || !accepted.has(caseSurface)) {
    return null;
  }
  return {
    kind: "case_particle_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: `case particle ${caseSurface} accepted for boundary consumer`,
    consumers: options.consumers ?? ["content_head_dispatch", "deferred_commitment"],
    surface: token.surface,
    role: "case_particle_marker",
    caseSurface,
    particleSubtype1
  };
}

export function topicFocusMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly acceptedSurfaces?: readonly TopicFocusMarkerSurface[];
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): TopicFocusMarkerRelation | null {
  return topicFocusMarkerRelationForToken(tokens[index], index, options);
}

export function topicFocusMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly acceptedSurfaces?: readonly TopicFocusMarkerSurface[];
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): TopicFocusMarkerRelation | null {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const particleSubtype1 = token.pos & POS1;
  const acceptedParticleSubtypes = options.acceptedParticleSubtypes === undefined
    ? new Set([係助詞, 副助詞])
    : numericParticleSubtypeSet(options.acceptedParticleSubtypes);
  if (!acceptedParticleSubtypes.has(particleSubtype1)) {
    return null;
  }
  const markerSurface = topicFocusMarkerSurface(token.surface);
  const accepted = options.acceptedSurfaces === undefined
    ? DEFAULT_TOPIC_FOCUS_MARKER_SURFACES
    : new Set(options.acceptedSurfaces);
  if (markerSurface === null || !accepted.has(markerSurface)) {
    return null;
  }
  return {
    kind: "topic_focus_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: `topic/focus particle ${markerSurface} accepted for boundary consumer`,
    consumers: options.consumers ?? ["deferred_commitment"],
    surface: token.surface,
    role: "topic_focus_marker",
    markerSurface,
    focusKind: markerSurface === "は" ? "topic" : "additive",
    particleSubtype1
  };
}

export function pronominalNoMarkerRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly requirement: PronominalNoMarkerRequirement;
    readonly acceptedSurfaces?: readonly string[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  }
): PronominalNoMarkerRelation | null {
  return pronominalNoMarkerRelationForToken(tokens[index], index, options);
}

export function pronominalNoMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly requirement: PronominalNoMarkerRequirement;
    readonly acceptedSurfaces?: readonly string[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  }
): PronominalNoMarkerRelation | null {
  const accepted = options.acceptedSurfaces === undefined
    ? PRONOMINAL_NO_MARKER_SURFACES
    : new Set(options.acceptedSurfaces);
  if (token === undefined || !accepted.has(token.surface) || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const particleSubtype1 = token.pos & POS1;
  if (options.requirement === "bare_adnominal_tail" && particleSubtype1 !== 準体助詞) {
    return null;
  }
  return {
    kind: "pronominal_no_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: `pronominal ${token.surface} accepted for ${options.requirement}`,
    consumers: options.consumers ?? ["nominal_head", "nominal_head_parser"],
    surface: token.surface,
    role: "pronominal_no_marker",
    requirement: options.requirement,
    particleSubtype1
  };
}

export function pronominalNoDeScopeBridgeRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly allowLooseCopulaDe?: boolean;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): ScopeBridgeMarkerRelation | null {
  const no = pronominalNoMarkerRelationAt(tokens, index, {
    requirement: "scope_bridge_tail",
    consumers: options.consumers ?? ["nominal_head", "nominal_head_parser"]
  });
  if (no === null) {
    return null;
  }
  const deIdx = index + 1;
  const de = tokens[deIdx];
  const markerKind = scopeBridgeDeMarkerKind(de, { allowLooseCopulaDe: options.allowLooseCopulaDe === true });
  if (markerKind === null) {
    return null;
  }
  const focus = scopeBridgeFocusParticle(tokens[deIdx + 1]);
  const focusSurface = focus === undefined ? "" : tokens[deIdx + 1]?.surface ?? "";
  return {
    kind: "scope_bridge_marker",
    span: { start: index, endExclusive: focus === undefined ? deIdx + 1 : deIdx + 2 },
    strength: "readiness",
    reason: "pronominal の plus で opens a scope bridge tail",
    consumers: options.consumers ?? ["nominal_head_parser"],
    surface: `の${de?.surface ?? ""}${focusSurface}`,
    role: "scope_bridge_marker",
    carrierKind: "pronominal_no_de",
    anchorIdx: index,
    markerIdx: deIdx,
    markerSurface: "で",
    markerKind,
    ...(focus === undefined ? {} : { focusParticle: focus })
  };
}

export function focusDakeDeScopeBridgeRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): ScopeBridgeMarkerRelation | null {
  const anchor = tokens[index];
  if (anchor === undefined || anchor.surface !== "だけ") {
    return null;
  }
  const deIdx = index + 1;
  const de = tokens[deIdx];
  const markerKind = scopeBridgeDeMarkerKind(de);
  if (markerKind === null) {
    return null;
  }
  const focus = scopeBridgeFocusParticle(tokens[deIdx + 1]);
  const focusSurface = focus === undefined ? "" : tokens[deIdx + 1]?.surface ?? "";
  return {
    kind: "scope_bridge_marker",
    span: { start: index, endExclusive: focus === undefined ? deIdx + 1 : deIdx + 2 },
    strength: "readiness",
    reason: "head-focus だけ plus で opens a scope bridge tail",
    consumers: options.consumers ?? ["tail_boundary_readiness"],
    surface: `だけ${de?.surface ?? ""}${focusSurface}`,
    role: "scope_bridge_marker",
    carrierKind: "focus_dake_de",
    anchorIdx: index,
    markerIdx: deIdx,
    markerSurface: "で",
    markerKind,
    ...(focus === undefined ? {} : { focusParticle: focus })
  };
}

export function dewaScopeBridgeRelationAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number,
  options: {
    readonly anchorIdx?: number;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): ScopeBridgeMarkerRelation | null {
  const markerKind = scopeBridgeDeMarkerKind(tokens[markerIdx]);
  if (markerKind === null) {
    return null;
  }
  const focus = scopeBridgeFocusParticle(tokens[markerIdx + 1]);
  if (focus === undefined) {
    return null;
  }
  return {
    kind: "scope_bridge_marker",
    span: { start: markerIdx, endExclusive: markerIdx + 2 },
    strength: "readiness",
    reason: "で plus focus particle opens a scope bridge tail",
    consumers: options.consumers ?? ["tail_boundary_readiness"],
    surface: `で${tokens[markerIdx + 1]?.surface ?? ""}`,
    role: "scope_bridge_marker",
    carrierKind: "dewa_focus",
    anchorIdx: options.anchorIdx ?? markerIdx,
    markerIdx,
    markerSurface: "で",
    markerKind,
    focusParticle: focus
  };
}

export function copulaDeMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CopulaDeMarkerRelation | null {
  if (token === undefined || token.surface !== "で" || (token.pos & POS0) !== 助動詞) {
    return null;
  }
  return {
    kind: "copula_de_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "copula auxiliary で opens a copula continuation",
    consumers: options.consumers ?? ["copula_rules"],
    surface: token.surface,
    role: "copula_de_marker",
    auxiliaryFamily: token.pos & POS4,
    isAssertiveCopulaFamily: isAssertiveCopulaFamilyPos(token.pos)
  };
}

export function isRealizedQuantityPhraseHead(
  tokens: readonly BoundaryToken[],
  index: number,
  preceding: BoundaryToken | undefined = tokens[index - 1]
): boolean {
  const head = tokens[index];
  if (head === undefined) {
    return false;
  }
  if (isNumeralToken(head)) {
    return true;
  }
  return isCounterCapableToken(head) && preceding !== undefined && isNumeralToken(preceding);
}

export function copulaDeHostProvesAdjunctReading(
  tokens: readonly BoundaryToken[],
  hostIdx: number,
  preceding: BoundaryToken | undefined = tokens[hostIdx - 1]
): boolean {
  const host = tokens[hostIdx];
  return host !== undefined &&
    (isAdverbCapableNominal(host) || isRealizedQuantityPhraseHead(tokens, hostIdx, preceding));
}

export function copulaDeHostExcludedFromElidedNegativeBody(
  tokens: readonly BoundaryToken[],
  hostIdx: number,
  preceding: BoundaryToken | undefined = tokens[hostIdx - 1]
): boolean {
  const host = tokens[hostIdx];
  return host === undefined ||
    copulaDeHostProvesAdjunctReading(tokens, hostIdx, preceding) ||
    isInferentialBoundAttributiveHead(host);
}

export function copulaHonorificSupportRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CopulaHonorificSupportRelation | null {
  const copula = tokens[index];
  if (
    copula === undefined ||
    copula.surface !== "で" ||
    (copula.pos & POS01) !== 助詞_格助詞
  ) {
    return null;
  }
  const supportIdx = index + 1;
  const support = tokens[supportIdx];
  if (!isIntrinsicHonorificCopulaSupportVerbToken(support)) {
    return null;
  }
  const host = tokens[index - 1];
  if (host === undefined || copulaDeHostProvesAdjunctReading(tokens, index - 1)) {
    return null;
  }
  return {
    kind: "copula_honorific_support",
    span: { start: index, endExclusive: supportIdx + 1 },
    strength: "readiness",
    reason: "case-marked で followed by an honorific copula support opens a copula chain",
    consumers: options.consumers ?? ["copula_rules"],
    surface: `${copula.surface}${support.surface}`,
    role: "copula_de_honorific_support",
    copulaIdx: index,
    supportIdx
  };
}

export function copulaElidedNegativeBodyHostAdmits(
  tokens: readonly BoundaryToken[],
  copulaIdx: number,
  preceding: BoundaryToken | undefined = tokens[copulaIdx - 2]
): boolean {
  const host = tokens[copulaIdx - 1];
  return host !== undefined &&
    pos0in(host.pos, NOMINAL_BITS) &&
    !copulaDeHostExcludedFromElidedNegativeBody(tokens, copulaIdx - 1, preceding);
}

export function copulaElidedNegativeBodyRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CopulaElidedNegativeBodyRelation | null {
  const copula = tokens[index];
  if (
    copula === undefined ||
    copula.surface !== "で" ||
    (copula.pos & POS01) !== 助詞_格助詞
  ) {
    return null;
  }
  const bridge = dewaScopeBridgeRelationAt(tokens, index, { consumers: options.consumers ?? ["copula_rules"] });
  if (bridge?.focusParticle !== "wa" || bridge.markerKind !== "particle") {
    return null;
  }
  if (!copulaElidedNegativeBodyHostAdmits(tokens, index)) {
    return null;
  }
  const focusIdx = bridge.span.endExclusive - 1;
  const run = activeProtoLayout()?.terminalPunctuationRunAfter(focusIdx);
  const questionIdx = run === undefined ? null : terminalPunctuationRunQuestionTokenIndex(run);
  if (questionIdx === null) {
    return null;
  }
  return {
    kind: "copula_elided_negative_body",
    span: { start: index, endExclusive: focusIdx + 1 },
    strength: "readiness",
    reason: "case-marked で plus contrastive は closed by a question run elides the negative copula body",
    consumers: options.consumers ?? ["copula_rules"],
    surface: `${copula.surface}${tokens[focusIdx]?.surface ?? ""}`,
    role: "copula_de_elided_negative_body",
    copulaIdx: index,
    focusIdx,
    questionIdx
  };
}

export function copulaNiMarkerRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CopulaNiMarkerRelation | null {
  if (
    token === undefined || token.surface !== "に" || (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ダ) || (token.pos & POS5) === 連用形_ニ !== true
  ) {
    return null;
  }
  return {
    kind: "copula_ni_marker",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "copula auxiliary に opens a copula adverbial continuation",
    consumers: options.consumers ?? ["copula_rules"],
    surface: token.surface,
    role: "copula_ni_marker",
    auxiliaryFamily: token.pos & POS4
  };
}

export function externalNominalizerContinuationRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly requireEnd?: boolean;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): NominalizerContinuationRelation | null {
  const nominalizer = predicateNominalizerRelationForToken(tokens[index], index, {
    requirement: "tail_connective_marker",
    consumers: options.consumers ?? ["tail_multi_clause", "tail_boundary_readiness"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const match = matchExternalNominalizerContinuationAfterNo(tokens, index, options.requireEnd ?? true);
  if (match === null) {
    return null;
  }
  return {
    kind: "nominalizer_continuation",
    span: { start: index, endExclusive: index + match.consumed },
    strength: "readiness",
    reason: `external nominalizer continuation (${match.surface})`,
    consumers: options.consumers ?? ["tail_multi_clause", "tail_boundary_readiness"],
    surface: match.surface,
    role: "external_nominalizer_continuation",
    nominalizerKind: "no",
    connectiveKind: match.connectiveKind,
    nominalizerIdx: index,
    requirement: "tail_connective_marker"
  };
}

export function nominalizerReasonConnectiveRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  const nominalizer = predicateNominalizerRelationForToken(tokens[index], index, {
    requirement: "tail_connective_marker",
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const copula = tokens[index + 1];
  if (
    copula === undefined || copula.surface !== "で" || (copula.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
  ) {
    return null;
  }
  if (nominalizerCopulaSupportRelationAt(tokens, index) !== null) {
    return null;
  }
  return {
    kind: "clause_connective",
    span: { start: index, endExclusive: index + 2 },
    strength: "readiness",
    reason: "predicate nominalizer plus copula で forms reason connective ので",
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"],
    surface: "ので",
    connectiveKind: "reason"
  };
}

export type NominalizerCopulaSupportRelation =
  | NominalizerSeparateCopulaSupportRelation
  | NominalizerFusedCopulaSupportConnectiveRelation;

export interface NominalizerSeparateCopulaSupportRelation {
  readonly kind: "nominalizer_copula_support";
  readonly form: "separate";
  readonly nominalizerIdx: number;
  readonly copulaIdx: number;
  readonly supportIdx: number;
  readonly polite: boolean;
}

export interface NominalizerFusedCopulaSupportConnectiveRelation {
  readonly kind: "nominalizer_copula_support";
  readonly form: "fused_connective";
  readonly nominalizerIdx: number;
  readonly fusedIdx: number;
  readonly connectiveKind: FusedCopulaSupportConnectiveKind;
  readonly connectiveSurface: string;
  readonly polite: false;
}

export function nominalizerCopulaSupportRelationAt(
  tokens: readonly BoundaryToken[],
  nominalizerIdx: number
): NominalizerCopulaSupportRelation | null {
  const nominalizer = predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "tail_connective_marker",
    consumers: ["clause_layout", "tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind === "no") {
    const fusedIdx = nominalizerIdx + 1;
    const fused = fusedCopulaSupportConnectiveAt(tokens[fusedIdx]);
    if (fused !== null) {
      return {
        kind: "nominalizer_copula_support",
        form: "fused_connective",
        nominalizerIdx,
        fusedIdx,
        connectiveKind: fused.kind,
        connectiveSurface: fused.surface,
        polite: false
      };
    }
  }
  const copulaIdx = nominalizerIdx + 1;
  const supportIdx = nominalizerIdx + 2;
  const copula = tokens[copulaIdx];
  const support = tokens[supportIdx];
  if (
    nominalizer?.nominalizerKind !== "no" ||
    copula === undefined ||
    copula.surface !== "で" ||
    (copula.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_) ||
    !isAffirmativeCopulaSupportVerbToken(support)
  ) {
    return null;
  }
  return {
    kind: "nominalizer_copula_support",
    form: "separate",
    nominalizerIdx,
    copulaIdx,
    supportIdx,
    polite: isGozaruPoliteSupportToken(support)
  };
}

export function nominalizerQuestionContentConnectiveRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly allowTerminalKa?: boolean;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  const nominalizer = predicateNominalizerRelationForToken(tokens[index], index, {
    requirement: "tail_connective_marker",
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const kaIdx = index + 1;
  const ka = kaMarkerRelationAt(tokens, kaIdx, options.consumers ?? ["clause_layout", "tail_multi_clause"]);
  if (ka === null) {
    return null;
  }
  if (ka.particleSubtype1 !== 副助詞 && options.allowTerminalKa !== true) {
    return null;
  }
  return {
    kind: "clause_connective",
    span: { start: index, endExclusive: kaIdx + 1 },
    strength: "readiness",
    reason: "predicate nominalizer plus か forms question-content connective",
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"],
    surface: `${tokens[index]?.surface ?? ""}${tokens[kaIdx]?.surface ?? ""}`,
    connectiveKind: "question_content"
  };
}

export function conditionalTailConnectiveRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  if (token === undefined) {
    return null;
  }
  if (isContractedNegativeConditionalToken(token)) {
    return buildConditionalConnectiveRelation(token, index, options.consumers);
  }
  if ((token.pos & POS0) !== 助詞) {
    return null;
  }
  if (token.surface === "と" && ((token.pos & POS1) === 格助詞 || (token.pos & POS1) === 接続助詞)) {
    return buildConditionalConnectiveRelation(token, index, options.consumers);
  }
  if (token.surface === "ば" && (token.pos & POS1) === 接続助詞) {
    return buildConditionalConnectiveRelation(token, index, options.consumers);
  }
  return null;
}

export function focusReversalDokoroKaRelationAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  consumers: readonly BoundaryRelationConsumer[] = ["clause_layout", "tail_multi_clause"],
): MarkerBoundaryRelation | null {
  const ka = kaMarkerRelationAt(tokens, kaIdx, consumers);
  const dokoroIdx = previousNonSpaceIndex(tokens, kaIdx);
  const dokoro = dokoroIdx === null ? undefined : tokens[dokoroIdx];
  if (
    ka?.particleSubtype1 !== 副助詞 ||
    dokoroIdx === null ||
    dokoro === undefined ||
    dokoro.surface !== "どころ" ||
    (dokoro.pos & POS01) !== 助詞_副助詞
  ) {
    return null;
  }
  return {
    kind: "clause_connective",
    span: { start: dokoroIdx, endExclusive: kaIdx + 1 },
    strength: "readiness",
    reason: "どころか forms a focus reversal connective",
    consumers,
    surface: `${dokoro.surface}${tokens[kaIdx]?.surface ?? ""}`,
    connectiveKind: "focus_reversal_dokoro_ka",
  };
}

export function isNegativeConditionalBoundaryAt(
  tokens: readonly BoundaryToken[],
  index: number,
  lowerBoundInclusive: number,
): boolean {
  const token = tokens[index];
  if (token === undefined) return false;
  if (isContractedNegativeConditionalToken(token)) return true;
  if (token.surface !== "と" && token.surface !== "ば") return false;
  const previousIdx = previousNonSpaceIndex(tokens, index, lowerBoundInclusive);
  const previous = previousIdx === null ? undefined : tokens[previousIdx];
  if (previous === undefined) return false;
  const previousForm = previous.dictionaryForm || previous.surface;
  if (token.surface === "と") {
    return previousForm === "ない" || previousForm === "無い" || previousForm === "ぬ";
  }
  return previousForm === "ぬ";
}

export function registeredClauseConnectiveRelationForToken(
  token: BoundaryToken | undefined,
  index: number,
  options: {
    readonly acceptedSurfaces?: readonly string[];
    readonly acceptedParticleSubtypes?: readonly ParticleSubtypeOption[];
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const acceptedParticleSubtypes = options.acceptedParticleSubtypes ??
    lookupConnectiveParticleSubtypesBySurface(token.surface) ??
    ["接続助詞"];
  if (!numericParticleSubtypeSet(acceptedParticleSubtypes).has(token.pos & POS1)) {
    return null;
  }
  const connectiveKind = lookupConnectiveBySurface(token.surface);
  if (connectiveKind === undefined) {
    return null;
  }
  if (options.acceptedSurfaces !== undefined && !options.acceptedSurfaces.includes(token.surface)) {
    return null;
  }
  return {
    kind: "clause_connective",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: `registered ${connectiveKind} connective particle from connective surface table`,
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"],
    surface: token.surface,
    connectiveKind
  };
}

const CONCESSIVE_TOMO_SURFACE = "とも";

export interface AdjectivalConcessiveTomoRelation extends MarkerBoundaryRelation {
  readonly kind: "clause_connective";
  readonly connectiveKind: ConnectiveKind;
}

export function adjectivalConcessiveTomoRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly lowerBoundInclusive?: number;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): AdjectivalConcessiveTomoRelation | null {
  const connectiveKind = lookupConnectiveBySurface(CONCESSIVE_TOMO_SURFACE);
  if (connectiveKind === undefined) {
    return null;
  }
  const span = concessiveTomoMarkerSpanAt(tokens, index);
  if (span === null) {
    return null;
  }
  const hostIdx = previousNonSpaceIndex(tokens, span.start, options.lowerBoundInclusive ?? 0);
  if (hostIdx === null || !isAdjectivalInflectionRenyouToken(tokens[hostIdx]!)) {
    return null;
  }
  return {
    kind: "clause_connective",
    span,
    strength: "readiness",
    reason: `adjectival renyou host + ${connectiveKind} connective ${CONCESSIVE_TOMO_SURFACE}`,
    consumers: options.consumers ?? ["clause_layout", "tail_multi_clause"],
    surface: CONCESSIVE_TOMO_SURFACE,
    connectiveKind
  };
}

function concessiveTomoMarkerSpanAt(
  tokens: readonly BoundaryToken[],
  index: number
): { readonly start: number; readonly endExclusive: number } | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  if (token.surface === CONCESSIVE_TOMO_SURFACE) {
    if (isConjunctiveParticleToken(token)) {
      return { start: index, endExclusive: index + 1 };
    }
    return isAdverbCapableNominal(token)
      ? { start: index, endExclusive: index + 1 }
      : null;
  }
  if (token.surface === "と") {
    const next = tokens[index + 1];
    return next !== undefined && next.surface === "も" && isBindingParticleToken(next) &&
      isSplitConcessiveToParticleToken(token)
      ? { start: index, endExclusive: index + 2 }
      : null;
  }
  if (token.surface === "も" && isBindingParticleToken(token)) {
    const previous = tokens[index - 1];
    return previous !== undefined && previous.surface === "と" &&
      isSplitConcessiveToParticleToken(previous)
      ? { start: index - 1, endExclusive: index + 1 }
      : null;
  }
  return null;
}

function isSplitConcessiveToParticleToken(token: BoundaryToken): boolean {
  return isCaseParticleToken(token) || isConjunctiveParticleToken(token);
}

export interface CaseParticleNiClauseConnectiveRelation extends MarkerBoundaryRelation {
  readonly kind: "clause_connective";
  readonly connectiveKind: ConnectiveKind;
}

export function caseParticleNiClauseConnectiveRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly lowerBoundInclusive?: number;
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): CaseParticleNiClauseConnectiveRelation | null {
  const consumers = options.consumers ?? ["clause_layout", "tail_multi_clause"];
  if (caseParticleMarkerRelationForToken(tokens[index], index, {
    acceptedSurfaces: ["に"],
    consumers
  }) === null) {
    return null;
  }
  const composite = compositeConnectivePatternRelationAt(new TokenCursor(tokens, index), {
    consumers,
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (composite === null) {
    return null;
  }
  const connectiveKind = lookupConnectiveBySurface(composite.surface);
  if (connectiveKind === undefined) {
    return null;
  }
  if (composite.hostIndex === undefined) {
    const hostIdx = previousNonSpaceIndex(tokens, index, options.lowerBoundInclusive ?? 0);
    if (hostIdx === null || !isClauseClosingPredicateTailToken(tokens[hostIdx]!)) {
      return null;
    }
  }
  return {
    kind: "clause_connective",
    span: composite.span,
    strength: "readiness",
    reason: `${composite.hostIndex === undefined ? "clause-closing predicate" : "row-declared"} host + ${connectiveKind} connective ${composite.surface}`,
    consumers,
    surface: composite.surface,
    connectiveKind
  };
}

export function conditionalToConnectiveRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  const token = tokens[index];
  if (
    token === undefined ||
    token.surface !== "と" ||
    (token.pos & POS0) !== 助詞 ||
    ((token.pos & POS1) !== 格助詞 && (token.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  return buildConditionalConnectiveRelation(token, index, options.consumers);
}

export function nominalizerAdversativeConnectiveRelationAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: {
    readonly consumers?: readonly BoundaryRelationConsumer[];
  } = {}
): MarkerBoundaryRelation | null {
  const consumers = options.consumers ?? ["clause_layout", "tail_multi_clause"];
  const nominalizer = predicateNominalizerRelationForToken(tokens[index], index, {
    requirement: "tail_connective_marker",
    consumers
  });
  if (nominalizer?.nominalizerKind !== "no") {
    return null;
  }
  const niIdx = index + 1;
  const ni = caseParticleMarkerRelationAt(tokens, niIdx, {
    acceptedSurfaces: ["に"],
    consumers
  });
  if (ni === null) {
    return null;
  }
  return {
    kind: "clause_connective",
    span: { start: index, endExclusive: niIdx + 1 },
    strength: "readiness",
    reason: "predicate nominalizer plus に forms adversative connective のに",
    consumers,
    surface: `${tokens[index]?.surface ?? ""}${ni.surface}`,
    connectiveKind: "adversative"
  };
}

function isContractedNegativeConditionalToken(token: BoundaryToken): boolean {
  return token.surface === "なけりゃ" &&
    (token.pos & POS5A) === 仮定形_ &&
    (
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) ||
      ((token.pos & POS0) === 形容詞0 && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い"))
    );
}

function buildConditionalConnectiveRelation(
  token: BoundaryToken,
  index: number,
  consumers: readonly BoundaryRelationConsumer[] | undefined
): MarkerBoundaryRelation {
  return {
    kind: "clause_connective",
    span: { start: index, endExclusive: index + 1 },
    strength: "readiness",
    reason: "caller-confirmed conditional connective",
    consumers: consumers ?? ["tail_multi_clause"],
    surface: token.surface,
    connectiveKind: "conditional"
  };
}

function prolongedTerminalNominalizerKind(
  token: BoundaryToken,
  requirement: string,
  table: Readonly<Record<string, PredicateNominalizerRelationKind>>
): PredicateNominalizerRelationKind | undefined {
  if (requirement !== "terminal_noda_marker") {
    return undefined;
  }
  const identity = prolongationMarkIdentityForm(token);
  return identity === undefined ? undefined : table[identity];
}

function predicateNominalizerKindForToken(
  token: BoundaryToken,
  requirement: "head_anchor" | "strict_particle" | "tail_connective_marker" | "quote_tail_marker" | "terminal_noda_marker" | "postverb_chain_marker"
): PredicateNominalizerRelationKind | null {
  const table = requirement === "tail_connective_marker" || requirement === "terminal_noda_marker" || requirement === "postverb_chain_marker"
    ? TAIL_CONNECTIVE_NOMINALIZER_BY_SURFACE
    : PREDICATE_NOMINALIZER_BY_SURFACE;
  const surfaceKind = table[token.surface] ?? table[token.dictionaryForm ?? ""] ??
    prolongedTerminalNominalizerKind(token, requirement, table);
  if (surfaceKind === undefined) {
    return null;
  }
  if (surfaceKind === "no") {
    if (requirement === "strict_particle" || requirement === "tail_connective_marker") {
      return (token.pos & POS01) === 助詞_準体助詞 ? "no" : null;
    }
    if (requirement === "quote_tail_marker") {
      return (token.pos & POS0) === 助詞 ? "no" : null;
    }
    if (requirement === "postverb_chain_marker") {
      return (token.pos & POS0) === 助詞 ? "no" : null;
    }
    if (requirement === "terminal_noda_marker") {
      return ((token.pos & POS01) === 助詞_準体助詞 || (token.pos & POS01) === 助詞_終助詞) ? "no" : null;
    }
    return (token.pos & POS0) === 助詞 || isNounishBoundaryToken(token) ? "no" : null;
  }
  return isNounishBoundaryToken(token) ? surfaceKind : null;
}

interface ExternalNominalizerAttachmentSpec {
  readonly connectiveKind: ExternalNominalizerConnectiveKind;
  readonly verbSurfaces: readonly string[];
  readonly verbLemmas: readonly string[];
  readonly matchBy: "surface_and_lemma" | "lemma";
  readonly te: TailAttachmentTePolicy;
  readonly focusAfterTe: readonly ("は" | "も")[];
  readonly tokenSurfaces: readonly string[];
  readonly fusedSurfaces: readonly string[];
}


let cachedExternalNominalizerSpecsGeneration = -1;
let cachedExternalNominalizerSpecs: readonly ExternalNominalizerAttachmentSpec[] | null = null;

function externalNominalizerAttachmentSpecs(): readonly ExternalNominalizerAttachmentSpec[] {
  const generation = nominalFrameDataGeneration();
  if (cachedExternalNominalizerSpecs !== null && cachedExternalNominalizerSpecsGeneration === generation) {
    return cachedExternalNominalizerSpecs;
  }
  const specs: ExternalNominalizerAttachmentSpec[] = [];
  for (const entry of loadTailAttachmentRegistry()) {
    const predicate = entry.attach.hostRealizations.predicate;
    if (predicate?.kind !== "predicate_projection" || predicate.coercion !== "explicit_no") {
      continue;
    }
    const match = predicate.match;
    if (match?.particle !== "に") {
      continue;
    }
    if (!isExternalNominalizerConnectiveKind(predicate.connective)) {
      throw new Error(`unsupported external nominalizer connective '${predicate.connective}' for '${entry.id}'`);
    }
    specs.push({
      connectiveKind: predicate.connective,
      verbSurfaces: match.verbSurfaces ?? [],
      verbLemmas: match.verbLemmas ?? [],
      matchBy: match.matchBy ?? "surface_and_lemma",
      te: match.te ?? "optional",
      focusAfterTe: match.focusAfterTe ?? [],
      tokenSurfaces: match.tokenSurfaces ?? [],
      fusedSurfaces: match.fusedSurfaces ?? []
    });
  }
  cachedExternalNominalizerSpecs = specs;
  cachedExternalNominalizerSpecsGeneration = generation;
  return specs;
}

function matchExternalNominalizerContinuationAfterNo(
  tokens: readonly BoundaryToken[],
  index: number,
  requireEnd: boolean
): {
  readonly connectiveKind: ExternalNominalizerConnectiveKind;
  readonly surface: string;
  readonly consumed: number;
} | null {
  const endOk = (consumed: number): boolean => !requireEnd || tokens[index + consumed] === undefined;
  const ni = tokens[index + 1];
  if (ni === undefined) {
    return null;
  }
  const specs = externalNominalizerAttachmentSpecs();

  if (ni.surface === "に" && (ni.pos & POS01) === 助詞_格助詞) {
    const head = tokens[index + 2];
    for (const spec of specs) {
      if (
        head !== undefined &&
        spec.verbSurfaces.length > 0 &&
        (head.pos & POS0) === 動詞 &&
        head.dictionaryForm !== undefined &&
        spec.verbLemmas.includes(head.dictionaryForm) &&
        (spec.matchBy === "lemma" || spec.verbSurfaces.includes(head.surface))
      ) {
        const base = `のに${spec.matchBy === "lemma" ? spec.verbSurfaces[0] ?? head.surface : head.surface}`;
        const follower = tokens[index + 3];
        if (
          spec.focusAfterTe.length > 0 &&
          follower !== undefined &&
          (follower.pos & POS0) === 助詞 &&
          spec.focusAfterTe.some((focus) => follower.surface === `て${focus}`) &&
          endOk(4)
        ) {
          return { connectiveKind: spec.connectiveKind, surface: `${base}${follower.surface}`, consumed: 4 };
        }
        if (follower?.surface === "て" && (follower.pos & POS01) === 助詞_接続助詞) {
          const particle = tokens[index + 4];
          if (
            spec.focusAfterTe.length > 0 &&
            particle !== undefined &&
            (particle.pos & POS0) === 助詞 &&
            (spec.focusAfterTe as readonly string[]).includes(particle.surface) &&
            endOk(5)
          ) {
            return { connectiveKind: spec.connectiveKind, surface: `${base}て${particle.surface}`, consumed: 5 };
          }
          if (endOk(4)) {
            return { connectiveKind: spec.connectiveKind, surface: `${base}て`, consumed: 4 };
          }
        }
        if (spec.te !== "required" && endOk(3)) {
          return { connectiveKind: spec.connectiveKind, surface: base, consumed: 3 };
        }
      }
      if (spec.tokenSurfaces.length > 0 && head?.surface === spec.tokenSurfaces[0]) {
        const rest = spec.tokenSurfaces.slice(1);
        const consumed = 2 + spec.tokenSurfaces.length;
        if (rest.every((surface, offset) => tokens[index + 3 + offset]?.surface === surface) && endOk(consumed)) {
          return {
            connectiveKind: spec.connectiveKind,
            surface: `のに${spec.tokenSurfaces.join("")}`,
            consumed
          };
        }
      }
    }
  }

  for (const spec of specs) {
    for (const fused of spec.fusedSurfaces) {
      if (ni.surface === fused && (ni.pos & POS0) === 助詞 && endOk(2)) {
        return { connectiveKind: spec.connectiveKind, surface: `の${fused}`, consumed: 2 };
      }
    }
  }
  return null;
}

function buildKaContinuationRelation(options: {
  readonly kaIdx: number;
  readonly continuationIdx: number;
  readonly continuation: BoundaryToken;
  readonly continuationKind: KaContinuationRelation["continuationKind"];
  readonly continuationSurface?: string;
  readonly endExclusive?: number;
  readonly bridgePunctuationSpan?: { readonly start: number; readonly endExclusive: number };
  readonly reason: string;
  readonly consumers: readonly BoundaryRelationConsumer[];
}): KaContinuationRelation {
  const continuationSurface = options.continuationSurface ?? options.continuation.surface;
  return {
    kind: "ka_continuation",
    span: { start: options.kaIdx, endExclusive: options.endExclusive ?? options.continuationIdx + 1 },
    strength: "readiness",
    reason: options.reason,
    consumers: options.consumers,
    surface: `か${continuationSurface}`,
    role: "question_content_continuation",
    kaIdx: options.kaIdx,
    continuationIdx: options.continuationIdx,
    continuationSurface,
    continuationKind: options.continuationKind,
    ...(options.bridgePunctuationSpan === undefined ? {} : { bridgePunctuationSpan: options.bridgePunctuationSpan })
  };
}

function isQuestionContentCopulaDeContinuationToken(token: BoundaryToken): boolean {
  return (token.pos & POS0) === 助動詞 &&
    token.surface === "で" &&
    tokenForm(token) === "だ";
}

function matchQuestionAlternativeContinuation(
  cursor: Pick<TokenCursor<BoundaryToken>, "tokens" | "pos" | "end">,
  consumers: readonly BoundaryRelationConsumer[]
): { readonly surface: "どうか"; readonly endExclusive: number } | null {
  const { tokens, pos: continuationIdx, end: limit } = cursor;
  const first = tokens[continuationIdx];
  if (first === undefined) {
    return null;
  }
  const firstForm = tokenForm(first);
  if (first.surface === "どうか" || firstForm === "どうか") {
    return { surface: "どうか", endExclusive: continuationIdx + 1 };
  }
  if (first.surface !== "どう" && firstForm !== "どう") {
    return null;
  }
  const secondKaIdx = nextNonSpaceIndex(tokens, continuationIdx + 1, limit);
  if (secondKaIdx === null || kaMarkerRelationAt(tokens, secondKaIdx, consumers) === null) {
    return null;
  }
  return { surface: "どうか", endExclusive: secondKaIdx + 1 };
}

function tokenForm(token: BoundaryToken): string {
  return token.dictionaryForm || token.surface || "";
}

function kaMarkerParticleSubtype(pos1: number): KaMarkerParticleSubtype | null {
  return pos1 === 副助詞 || pos1 === 終助詞 || pos1 === 係助詞 ? pos1 : null;
}

function numericParticleSubtypeSet(values: readonly ParticleSubtypeOption[]): ReadonlySet<number> {
  return new Set(values.map((value) => typeof value === "number" ? value : POS1_OF_NAME[value] ?? 0));
}

export function caseParticleMarkerSurface(surface: string): CaseParticleMarkerSurface | null {
  switch (surface) {
    case "が":
    case "を":
    case "に":
    case "で":
    case "から":
    case "より":
    case "へ":
    case "と":
    case "の":
      return surface;
    default:
      return null;
  }
}

function topicFocusMarkerSurface(surface: string): TopicFocusMarkerSurface | null {
  switch (surface) {
    case "は":
    case "も":
      return surface;
    default:
      return null;
  }
}

function scopeBridgeDeMarkerKind(
  token: BoundaryToken | undefined,
  options: { readonly allowLooseCopulaDe?: boolean } = {}
): ScopeBridgeMarkerRelation["markerKind"] | null {
  if (token?.surface !== "で") {
    return null;
  }
  if ((token.pos & POS0) === 助詞) {
    return "particle";
  }
  if (
    (token.pos & (POS0 | POS5)) === (助動詞 | 連用形_一般) && ((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス || (token.pos & POS4) === 助動詞_ジャ)
  ) {
    return "copula";
  }
  if (
    options.allowLooseCopulaDe === true &&
    (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "だ" || token.dictionaryForm === "です")
  ) {
    return "copula";
  }
  return null;
}

function scopeBridgeFocusParticle(token: BoundaryToken | undefined): ScopeBridgeFocusKind | undefined {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return undefined;
  }
  return scopeBridgeFocusKindForSurface(token.surface) ?? undefined;
}

function isNounishBoundaryToken(token: BoundaryToken | undefined): boolean {
  const pos0 = (token?.pos ?? 0) & POS0;
  return pos0in(pos0, NOMINAL_BITS);
}

export type RetrospectiveQuoteIdiomKind = "question_reformulation" | "retrospective_conditional" | "change_of_state";

export interface RetrospectiveQuoteIdiomClaim {
  readonly kind: RetrospectiveQuoteIdiomKind;
  readonly kaIdx: number;
  readonly quoteMarkerIdx: number;
  readonly quoteHostIdx: number;
  readonly tailIdx: number;
  readonly span: { readonly start: number; readonly endExclusive: number };
}

export function retrospectiveQuoteIdiomClaimAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): RetrospectiveQuoteIdiomClaim | null {
  const consumers = options.consumers ?? ["modality_rules"];
  if (kaIdx < 0 || kaIdx + 3 >= tokens.length || kaMarkerRelationAt(tokens, kaIdx, consumers) === null) {
    return null;
  }
  if (isTokaListingKaMarker(tokens, kaIdx) || isCopularTokaKaMarker(tokens, kaIdx)) {
    return null;
  }
  const quoteMarkerIdx = kaIdx + 1;
  const quoteMarker = quoteMarkerRelationAt(tokens, quoteMarkerIdx, { consumers });
  if (quoteMarker?.canonicalSurface !== "と" || quoteMarker.tokenCount !== 1) {
    return null;
  }
  const quoteHostIdx = kaIdx + 2;
  const verb = tokens[quoteHostIdx];
  if (verb === undefined || (verb.pos & POS0) !== 動詞) {
    return null;
  }
  const isThoughtVerb = RETROSPECTIVE_THOUGHT_VERBS.has(verb.dictionaryForm ?? "");
  const isSayVerb = IU_LEXEME_FORMS.has(verb.dictionaryForm ?? "");
  if (!isThoughtVerb && !isSayVerb) {
    return null;
  }
  const tailIdx = kaIdx + 3;
  const tail = tokens[tailIdx];
  if (tail === undefined) {
    return null;
  }
  const claim = (kind: RetrospectiveQuoteIdiomKind): RetrospectiveQuoteIdiomClaim => ({
    kind,
    kaIdx,
    quoteMarkerIdx,
    quoteHostIdx,
    tailIdx,
    span: { start: kaIdx, endExclusive: tailIdx + 1 }
  });
  const isConditionalTail =
    conditionalTailConnectiveRelationForToken(tail, tailIdx, { consumers }) !== null;
  if (isSayVerb && !isThoughtVerb) {
    return isConditionalTail ? claim("question_reformulation") : null;
  }
  const isPastTail = (tail.pos & POS0) === 助動詞 && tail.dictionaryForm === "た";
  if (!isConditionalTail && !isPastTail) {
    return null;
  }
  const isTaraTail = isPastTail && (tail.pos & POS5A) === 仮定形_;
  const isBaTail = (tail.pos & POS0) === 助詞 && tail.surface === "ば" && isConditionalTail;
  return claim(isTaraTail || isBaTail ? "retrospective_conditional" : "change_of_state");
}

export function questionReformulationClaimAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): RetrospectiveQuoteIdiomClaim | null {
  const claim = retrospectiveQuoteIdiomClaimAt(tokens, kaIdx, options);
  return claim?.kind === "question_reformulation" ? claim : null;
}

export function quotativeDerivedIdiomClaimAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): RetrospectiveQuoteIdiomClaim | null {
  const claim = retrospectiveQuoteIdiomClaimAt(tokens, kaIdx, options);
  return claim !== null && claim.kind !== "change_of_state" ? claim : null;
}
