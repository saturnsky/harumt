import type { LookupTables } from "../lookup-tables.js";
import { previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { previousClauseNonPunctuationIndex } from "../clause-layout/navigation.js";
import type { RequestQuoteTailKind } from "../head-tail/tail/predicate-root/grammar.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { hardTerminalPunctuationRelation, weakPunctuationRelation } from "../head-tail/boundary/punctuation.js";
import { previousRequestCommandContentToken, quoteMarkerPrecededByRequestCommandContent } from "../quote/prohibitive-request.js";
import { teBenefactiveContinuationMetadataForToken, teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";
import { tokensShareLemma, type RuntimeHaruToken } from "../../types/token.js";
import type { StructuralQuoteRequestPayload } from "./types.js";
import { isAuxiliaryToken, isNegativeAuxiliaryPos, isNonIndependentVerbToken, isVerbPredicateToken } from "../../types/pos.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { quoteRelationHostHasPassiveAux } from "./quote-nominal-and-passive.js";
import type { QuoteStructuralRelation } from "./quote-payload.js";

export type QuoteRequestSourceEvidence = Pick<StructuralQuoteRequestPayload, "kind" | "politenessEvidence"> & { readonly tailScope?: "passive_iu_only" };

function requestAuxPolitenessEvidence(token: RuntimeHaruToken, polite: boolean) {
  const honorific = teBenefactiveContinuationMetadataForToken(token)?.honorific === true;
  return { polite: polite || honorific, honorific };
}

function classifyQuoteRequestTailKind(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  if (relation.quote.explicitQuotation === true) {
    return null;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  const passive = quoteRelationHostHasPassiveAux(tokens, relation);
  if (relation.quote.slotKind === "question_content") {
    return registry.hostHasCapability(host, "question_request")
      ? passive ? "question_passive" : "question"
      : null;
  }
  if (registry.hostHasCapability(host, "strong_request_quote")) {
    return "tanomu";
  }
  if (registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (
    relation.quote.slotKind !== "request_content" &&
    registry.hostHasCapability(host, "request_quote")
  ) {
    return passive ? "iu_passive" : "iu";
  }
  if (registry.hostHasCapability(host, "passive_request")) {
    if (passive) {
      return IU_LEXEME_FORMS.has(hostForm) ? "iu_passive" : "question_passive";
    }
    return IU_LEXEME_FORMS.has(hostForm) ? "iu" : null;
  }
  return null;
}

export function quoteHostHandoffKindFromRelation(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  end: number,
  lookups: LookupTables
): RequestQuoteTailKind | null {
  if (relation.quote.request?.tailKind !== undefined && relation.quote.request.tailKind !== null) {
    return relation.quote.request.tailKind;
  }
  const hostForm = relation.quote.hostMatch.hostForm;
  const registry = lookups.QUOTE_HOST_REGISTRY;
  const host = relation.quote.hostMatch;
  const passive = quoteRelationHostHasPassiveAux(tokens, relation, end);
  if (relation.quote.slotKind === "question_content" && registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (relation.quote.slotKind !== "quoted_content") {
    return null;
  }
  if (registry.hostHasCapability(host, "question_request")) {
    return passive ? "question_passive" : "question";
  }
  if (!registry.hostHasCapability(host, "passive_request")) {
    return null;
  }
  if (passive) {
    return IU_LEXEME_FORMS.has(hostForm) ? "iu_passive" : "question_passive";
  }
  return IU_LEXEME_FORMS.has(hostForm) ? "iu" : null;
}

function requestQuestionSourceEvidence(
  tokens: readonly RuntimeHaruToken[],
  questionMarkerIdx: number,
  lookups: LookupTables
): QuoteRequestSourceEvidence | null {
  if (hasReasonInterrogativeBeforeQuestionMarker(tokens, questionMarkerIdx)) {
    return null;
  }
  const prev = previousNonSpaceIndex(tokens, questionMarkerIdx, 0);
  const prevTok = prev !== null ? tokens[prev] : undefined;
  if (prevTok === undefined) return null;
  const prevForm = prevTok.dictionaryForm || prevTok.surface;
  const polite = prevTok.surface.endsWith("ん") && isNegativeAuxiliaryPos(prevTok.pos);
  const plain = (prevForm === "ない" || prevForm === "無い") && isNegativeAuxiliaryPos(prevTok.pos);
  if (!polite && !plain) {
    return null;
  }
  const hostIdx = requestQuestionAuxHostBeforePoliteNegative(tokens, (prev ?? 0) - 1, lookups);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  if (host === undefined || hostIdx === null || !requestQuestionHasBenefactiveBridge(tokens, hostIdx, lookups)) {
    return null;
  }
  return {
    kind: "benefactive_request",
    politenessEvidence: requestAuxPolitenessEvidence(host, polite),
  };
}

function requestQuestionHasBenefactiveBridge(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  lookups: LookupTables,
): boolean {
  const direct = previousNonSpaceIndex(tokens, hostIdx, 0);
  if (direct !== null && teDeBridgeRelationTargets(tokens, direct, hostIdx, ["benefactive", "request"], lookups)) return true;
  const proto = activeProtoLayout();
  const clauseIdx = proto?.clauseIndexOfToken(hostIdx) ?? -1;
  const current = proto?.protoClauses[clauseIdx];
  const previous = proto?.protoClauses[clauseIdx - 1];
  if (current?.start !== hostIdx || previous?.end !== current.start) return false;
  const repeated = previousClauseNonPunctuationIndex(tokens, previous.end - 1, previous.start);
  const repeatedBridge = repeated === null ? null : previousNonSpaceIndex(tokens, repeated, previous.start);
  return repeated !== null && repeatedBridge !== null &&
    tokensShareLemma(tokens[repeated], tokens[hostIdx]) &&
    teDeBridgeRelationTargets(tokens, repeatedBridge, repeated, ["benefactive", "request"], lookups);
}

function requestQuestionAuxHostBeforePoliteNegative(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): number | null {
  for (let idx = previousNonSpaceIndex(tokens, startIdx + 1, 0); idx !== null; idx = previousNonSpaceIndex(tokens, idx, 0)) {
    const tok = tokens[idx];
    if (tok === undefined) return null;
    const form = tok.dictionaryForm || tok.surface;
    if (
      isAuxiliaryToken(tok) ||
      (isNonIndependentVerbToken(tok) && (form === "ます" || form === "ござる"))
    ) {
      continue;
    }
    return isVerbPredicateToken(tok) && lookups.QUOTE_HOST_REGISTRY.auxHostHasCapability(form, "request_question_aux")
      ? idx
      : null;
  }
  return null;
}

export function requestKoreanClauseForm(requestTailKind: RequestQuoteTailKind | null): "달라고" | "달라는 말을" {
  return requestTailKind === "iu_passive"
    ? "달라는 말을"
    : "달라고";
}

function hasReasonInterrogativeBeforeQuestionMarker(
  tokens: readonly RuntimeHaruToken[],
  questionMarkerIdx: number
): boolean {
  const clauseStart = activeProtoLayout()?.clauseOfToken(questionMarkerIdx)?.start ?? 0;
  let idx = questionMarkerIdx - 1;
  while (idx >= clauseStart) {
    const tok = tokens[idx];
    if (tok === undefined) return false;
    const surface = tok.surface;
    if (
      weakPunctuationRelation(tok, idx, ["quote_content"]) !== null ||
      hardTerminalPunctuationRelation(tok, idx, ["quote_content"]) !== null
    ) {
      return false;
    }
    const form = tok.dictionaryForm || surface;
    if (surface === "なぜ" || surface === "何故" || surface === "どうして" || surface === "なんで" || form === "なぜ" || form === "何故") {
      return true;
    }
    if (caseParticleMarkerRelationForToken(tok, idx, {
      acceptedSurfaces: ["で"],
      acceptedParticleSubtypes: ["格助詞", "接続助詞", "副助詞"],
      consumers: ["quote_content"]
    }) !== null) {
      const prev = previousNonSpaceIndex(tokens, idx, 0);
      const prevTok = prev !== null ? tokens[prev] : undefined;
      const prevForm = prevTok?.dictionaryForm || prevTok?.surface;
      if (prevForm === "何") {
        return true;
      }
    }
    idx -= 1;
  }
  return false;
}

export function quoteRequestPayloadAtProduction(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  requestSource: QuoteRequestSourceEvidence | null,
  lookups: LookupTables,
): StructuralQuoteRequestPayload | null {
  const questionStart = relation.quote.explicitQuotation === true
    ? previousClauseNonPunctuationIndex(tokens, relation.quote.contentSpan.endExclusive - 1, relation.quote.contentSpan.start)
    : relation.quote.questionBoundarySpan?.start;
  const questionSource = questionStart == null || relation.quote.markerBaseSurface === "かどうか"
    ? null
    : requestQuestionSourceEvidence(tokens, questionStart, lookups);
  const source = questionSource ?? (
    relation.quote.slotKind === "question_content"
      ? null
      : requestSource
  );
  if (source === null) {
    if (relation.quote.slotKind !== "request_content") return null;
    return {
      kind: "directive_request",
      politenessEvidence: null,
      tailKind: classifyQuoteRequestTailKind(tokens, relation, lookups),
    };
  }
  const { tailScope, ...payload } = source;
  const hostForm = relation.quote.hostMatch.hostForm;
  return {
    ...payload,
    tailKind: tailScope === "passive_iu_only"
      ? IU_LEXEME_FORMS.has(hostForm) && quoteRelationHostHasPassiveAux(tokens, relation)
        ? "iu_passive"
        : null
      : classifyQuoteRequestTailKind(tokens, relation, lookups),
  };
}

export function quoteRelationWithRequestSourceEvidence(
  tokens: readonly RuntimeHaruToken[],
  relation: QuoteStructuralRelation,
  source: QuoteRequestSourceEvidence,
  lookups: LookupTables,
): QuoteStructuralRelation {
  const request = quoteRequestPayloadAtProduction(tokens, relation, source, lookups);
  return request === null ? relation : { ...relation, quote: { ...relation.quote, request } };
}

export function quoteRequestSourceBeforeMarker(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lowerBoundInclusive: number,
  lookups: LookupTables,
  options: {
    readonly includeDesiderative?: boolean;
    readonly includeBareDirective?: boolean;
  } = {}
): QuoteRequestSourceEvidence | null {
  const beforeMarker = previousRequestCommandContentToken(tokens, markerIdx - 1);
  if (beforeMarker === null) {
    return null;
  }
  const beforeMarkerToken = tokens[beforeMarker];
  const beforeMarkerForm = beforeMarkerToken?.dictionaryForm || beforeMarkerToken?.surface;
  const bridge = previousNonSpaceIndex(tokens, beforeMarker, lowerBoundInclusive);
  if (beforeMarkerForm === "たい" && bridge !== null) {
    const benefactive = tokens[bridge];
    const benefactiveForm = benefactive?.dictionaryForm || benefactive?.surface || "";
    const teDeIdx = previousNonSpaceIndex(tokens, bridge, lowerBoundInclusive);
    return teDeIdx !== null &&
      lookups.QUOTE_HOST_REGISTRY.auxHostHasCapability(benefactiveForm, "request_question_aux") &&
      teDeBridgeRelationTargets(tokens, teDeIdx, bridge, ["benefactive"], lookups)
      ? { kind: "benefactive_request", politenessEvidence: null, tailScope: "passive_iu_only" }
      : null;
  }
  const continuation = bridge === null
    ? null
    : teDeBridgeRelationTo(tokens, bridge, beforeMarker, ["benefactive", "desiderative", "request"], lookups);
  if (beforeMarkerForm === "欲しい" || beforeMarkerForm === "ほしい") {
    return options.includeDesiderative !== false && continuation?.continuationKind === "desiderative"
      ? { kind: "benefactive_request", politenessEvidence: null }
      : null;
  }
  const politeness = beforeMarkerToken === undefined
    ? null
    : requestAuxPolitenessEvidence(beforeMarkerToken, false);
  if (continuation !== null && (
    continuation.continuationKind === "request" ||
    quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
  )) {
    return { kind: "benefactive_request", politenessEvidence: politeness };
  }
  return options.includeBareDirective !== false && quoteMarkerPrecededByRequestCommandContent(tokens, markerIdx)
    ? { kind: "directive_request", politenessEvidence: null }
    : null;
}

function teDeBridgeRelationTargets(
  tokens: readonly RuntimeHaruToken[],
  bridgeIdx: number,
  continuationIdx: number,
  continuationKinds: readonly string[],
  lookups: LookupTables
): boolean {
  return teDeBridgeRelationTo(tokens, bridgeIdx, continuationIdx, continuationKinds, lookups) !== null;
}

function teDeBridgeRelationTo(
  tokens: readonly RuntimeHaruToken[],
  bridgeIdx: number,
  continuationIdx: number,
  continuationKinds: readonly string[],
  lookups: LookupTables
): ReturnType<typeof teDeContinuationRelationAt> {
  const relation = teDeContinuationRelationAt(tokens, bridgeIdx, {
    consumers: ["quote_content"],
    requirement: "layout_nonspace_tail",
    lookups
  });
  if (relation === null || relation.continuationIdx !== continuationIdx) {
    return null;
  }
  return continuationKinds.includes(relation.continuationKind) ? relation : null;
}
