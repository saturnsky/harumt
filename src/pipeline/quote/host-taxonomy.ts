
import type { LookupTables, QuoteHostKind } from "../lookup-tables.js";
import {
  caseParticleMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  nominalLinkMarkerRelationForToken,
  predicateNominalizerRelationForToken,
  quoteHostSearchBridgeArgumentRelationAt,
  topicFocusMarkerRelationForToken
} from "../head-tail/boundary/marker.js";
import { quoteBridgePunctuationRelationAt } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt, tokaTteCompositeQuoteCandidateAt } from "../head-tail/boundary/quote-marker.js";
import { kaMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { classifyAttributiveHeadKind } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { terminalAssertiveCopulaSpanEndingBefore } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { TYPIFICATION_QUOTATIVE_HEADS } from "../head-tail/data/semantic-helper-sets.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { isChainedNaiToken } from "../semantics/grammar-runtime.js";
import {
  isClauseSpaceOrAdverbToken,
  nextNonSpaceIndex,
  nextTransparentEvidenceIndex,
  previousNonSpaceIndex,
  previousTransparentEvidenceIndex
} from "../clause-layout/trivia.js";
import { quoteMarkerPrecededByRequestCommandContent } from "./prohibitive-request.js";
import type { QuoteHostEvidenceSetId } from "./host-registry.js";
import { closesWithClauseFinalPredicate } from "../clause-layout/speech-act.js";
import { quoteMarkerSpanAbsorbsScopeBridgeFocus } from "../head-tail/data/scope-bridge-focus-table.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { TokenCursor } from "../token-cursor.js";
import type { RuntimeHaruToken } from "../../types/token.js";


import { toiuIuStandsAsAttributiveCarrier } from "../semantics/marker-roles.js";
import { POS0, POS1, 記号, 係助詞, 形状詞, 形容詞0, 助詞, 助動詞, 代名詞, 動詞, 副詞, 補助記号, 名詞, 連体詞, isPoliteAuxiliaryPos, isRareruAuxiliaryToken, isSahenLightVerbToken, isTerminalInflection, isTerminalParticleToken, isNominalLike, isBindingParticleToken, isSecondaryParticleToken, pos0in, PREDICATE_BITS, POS01, 接尾辞_名詞的 } from "../../types/pos.js";
export class QuoteHostMatch {
  constructor(
    readonly kind: QuoteHostKind,
    readonly hostForm: string,
    readonly hostIdx: number,
    readonly supportIdx: number | null = null,
    readonly requestReportingRole: "speech" | null = null,
    readonly accusativeObjectRealization: boolean = false,
  ) { }

  get isNounSuru(): boolean {
    return this.supportIdx !== null;
  }
}

export function quoteHostMatchBlockedByNegativeCondition(
  cursor: TokenCursor<RuntimeHaruToken>,
  match: QuoteHostMatch,
  lookups?: LookupTables
): boolean {
  const { tokens, pos: markerPos } = cursor;
  const marker = tokens[markerPos];
  if ((marker?.dictionaryForm || marker?.surface) !== "と") {
    return false;
  }
  if (!markerPrecededByNegativeChain(tokens, markerPos)) {
    return false;
  }
  if (markerFollowedByQuotedPropositionTopicFocus(tokens, markerPos)) {
    return false;
  }
  return (
    quoteHostPrefersConditionalAfterNegative(match, lookups) ||
    cursor.lookahead(match.hostIdx - markerPos, hostFollowedByNegativeAux)
  );
}

function markerFollowedByQuotedPropositionTopicFocus(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number
): boolean {
  const focusIdx = markerPos + 1;
  return topicFocusMarkerRelationForToken(tokens[focusIdx], focusIdx, {
    acceptedSurfaces: ["は", "も"],
    acceptedParticleSubtypes: [係助詞],
    consumers: ["quote_host_taxonomy"]
  }) !== null;
}

export function quoteHostMatchIsAttributiveIu(
  tokens: readonly RuntimeHaruToken[],
  match: { readonly hostForm: string; readonly hostIdx: number },
): boolean {
  if (!IU_LEXEME_FORMS.has(match.hostForm)) {
    return false;
  }
  return toiuIuStandsAsAttributiveCarrier(tokens, match.hostIdx);
}

export interface QuoteHostSearchOptions {
  readonly searchEnd?: number;
  readonly markerSpanEndExclusive?: number;
  readonly admitPronominalNoNounPhraseBridge?: boolean;
}

export function quoteHostMatchAfterMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  searchOptions: QuoteHostSearchOptions = {}
): QuoteHostMatch | null {
  const { tokens, pos: markerPos } = cursor;
  const markerRelation = tokaTteCompositeQuoteCandidateAt(tokens, markerPos, {
    consumers: ["quote_host_taxonomy"]
  }) ?? quoteMarkerRelationAt(tokens, markerPos, {
    consumers: ["quote_host_taxonomy"]
  });
  const markerSpanEndExclusive = searchOptions.markerSpanEndExclusive ??
    markerRelation?.span.endExclusive ?? markerPos + 1;
  let index = markerSpanEndExclusive;
  const immediateHostIdx = nextNonSpaceIndex(tokens, index, tokens.length);
  const immediateTypification = immediateHostIdx === null
    ? null
    : matchAttributiveTypificationHost(tokens, immediateHostIdx);
  if (immediateTypification !== null) return immediateTypification;
  let end = searchOptions.searchEnd ?? cursor.lookahead(index - cursor.pos, quoteHostSearchEnd);
  const markerIsContractedQuote = markerRelation?.canonicalSurface === "とかって" ||
    (tokens[markerPos]?.dictionaryForm || tokens[markerPos]?.surface) !== "と";
  let punctuationBridgeArmed = false;
  let markerAdjacent = true;
  const plainVerbMarker = plainVerbQuoteMarkerEvidenceAt(tokens, markerPos, lookups);
  const assertiveCopulaContent =
    !quoteMarkerCompositeCarriesEnumerationKa(tokens, markerPos, markerSpanEndExclusive) &&
    quoteContentClosedByAssertiveCopula(tokens, markerPos);
  const markerLeftIdx = previousNonSpaceIndex(tokens, markerPos);
  const quoteContentClosedByPredicate = markerLeftIdx !== null &&
    closesWithClauseFinalPredicate(tokens, markerLeftIdx);
  const pronominalNoClosedContent = searchOptions.admitPronominalNoNounPhraseBridge !== true &&
    markerLeftIdx !== null &&
    predicateNominalizerRelationForToken(tokens[markerLeftIdx], markerLeftIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["quote_host_taxonomy"]
    })?.nominalizerKind === "no";
  if (
    pronominalNoClosedContent &&
    markerBoundRelationalHeadFollows(tokens, markerSpanEndExclusive, end, lookups)
  ) {
    return null;
  }
  let extendedReach = false;
  let sawZeroCopulaPredicateStem = false;
  while (index < end) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    const pos0 = token.pos & POS0;
    if (
      (index === markerSpanEndExclusive || punctuationBridgeArmed) &&
      quoteBridgePunctuationRelationAt(tokens, index, { consumers: ["quote_host_taxonomy"] }) !== null
    ) {
      punctuationBridgeArmed = false;
      markerAdjacent = false;
      index += 1;
      if (index >= end) {
        end = searchOptions.searchEnd ?? cursor.lookahead(index - cursor.pos, quoteHostSearchEnd);
      }
      continue;
    }
    if (pos0 === 形容詞0 && isTerminalInflection(token.pos)) {
      return null;
    }
    if (sawZeroCopulaPredicateStem && isTerminalParticleToken(token)) {
      return null;
    }
    if (markerAdjacent) {
      const scopeBridge = dewaScopeBridgeRelationAt(tokens, index, { consumers: ["quote_host_taxonomy"] });
      if (scopeBridge !== null && quoteMarkerSpanAbsorbsScopeBridgeFocus(scopeBridge.focusParticle)) {
        punctuationBridgeArmed = true;
        markerAdjacent = false;
        index = scopeBridge.span.endExclusive;
        continue;
      }
    }
    if (
      pos0 === 助詞 || pos0 === 副詞 || pos0 === 代名詞 || pos0 === 形容詞0 ||
      pos0 === 形状詞 || (pos0 === 連体詞 && assertiveCopulaContent)
    ) {
      if (pos0 === 形容詞0 || pos0 === 形状詞) {
        sawZeroCopulaPredicateStem = true;
      }
      if (pos0 === 連体詞) {
        extendedReach = true;
      }
      punctuationBridgeArmed = markerAdjacent &&
        quoteContentClosedByPredicate &&
        isBindingParticleToken(token);
      markerAdjacent = false;
      index += 1;
      continue;
    }
    if (pos0 === 助動詞) {
      if (
        assertiveCopulaContent &&
        copulaNiMarkerRelationForToken(token, index, { consumers: ["quote_host_taxonomy"] }) !== null
      ) {
        sawZeroCopulaPredicateStem = false;
        extendedReach = true;
        punctuationBridgeArmed = false;
        markerAdjacent = false;
        index += 1;
        continue;
      }
      return null;
    }
    if (pos0 === 名詞) {
      markerAdjacent = false;
      const match = matchNounSuruHost(tokens, index, end, lookups);
      if (match !== null) {
        const propositionalAttitudeHost = match.kind === "thought";
        const predicateIdx = match.supportIdx ?? match.hostIdx;
        if (extendedReach && hostInsideForeignRelativeClause(markerPos, predicateIdx)) {
          punctuationBridgeArmed = false;
          index = predicateIdx + 1;
          continue;
        }
        return match.accusativeObjectRealization &&
          plainVerbMarker.plainVerbTerminal &&
          !(propositionalAttitudeHost && plainVerbMarker.quoteCue)
          ? null
          : match;
      }
      if (isQuoteBridgeTimeAdverbToken(token, lookups)) {
        punctuationBridgeArmed = true;
        index += 1;
        continue;
      }
      const bridge = nounPhraseBridgeEndToQuoteHost(tokens, index, end, assertiveCopulaContent);
      if (bridge !== null) {
        punctuationBridgeArmed = markerIsContractedQuote && classifyAttributiveHeadKind(token) === "ordinary_nominal";
        extendedReach ||= bridge.extended;
        index = bridge.endExclusive;
        continue;
      }
      return null;
    }
    if (pos0 === 補助記号 || pos0 === 記号) {
      return null;
    }
    if (pos0 === 動詞) {
      const typification = matchAttributiveTypificationHost(tokens, index);
      if (typification !== null) return typification;
      const form = token.dictionaryForm || token.surface;
      const kind = lookups.QUOTE_HOST_REGISTRY.kind("direct", form);
      if (kind !== undefined && extendedReach && hostInsideForeignRelativeClause(markerPos, index)) {
        punctuationBridgeArmed = false;
        index += 1;
        continue;
      }
      if (
        kind === undefined ||
        directQuoteHostBlockedByPlainVerbTo(tokens, markerPos, index, form, lookups, plainVerbMarker) ||
        directQuoteHostBlockedByNonImperativeRequestContent(tokens, markerPos, form, kind, lookups)
      ) {
        return null;
      }
      const requestReportingRole = lookups.QUOTE_HOST_REGISTRY.hasCapability(
        "direct",
        form,
        "bare_nominal_hearsay_quote",
      ) ? "speech" : null;
      return new QuoteHostMatch(kind, form, index, null, requestReportingRole);
    }
    return null;
  }
  return null;
}

function matchAttributiveTypificationHost(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
): QuoteHostMatch | null {
  const host = tokens[hostIdx];
  const hostForm = host?.dictionaryForm || host?.surface;
  if (
    host === undefined ||
    (host.surface !== "いっ" && host.surface !== "言っ") ||
    (hostForm !== "いく" && !IU_LEXEME_FORMS.has(hostForm ?? ""))
  ) return null;
  const layout = activeProtoLayout();
  const clauseIdx = layout?.clauseIndexOfToken(hostIdx) ?? -1;
  const clause = clauseIdx < 0 ? undefined : layout?.protoClauses[clauseIdx];
  const parent = clause?.parentIdx === null || clause?.parentIdx === undefined
    ? undefined
    : layout?.protoClauses[clause.parentIdx];
  const head = parent === undefined ? undefined : tokens[parent.start];
  if (
    clause?.kind !== "relative" ||
    parent === undefined ||
    clause.end !== parent.start ||
    head === undefined ||
    !TYPIFICATION_QUOTATIVE_HEADS.has(head.dictionaryForm || head.surface)
  ) return null;
  return new QuoteHostMatch("report", "いう", hostIdx);
}

interface PlainVerbQuoteMarkerEvidence {
  readonly plainVerbTerminal: boolean;
  readonly quoteCue: boolean;
  readonly topicSubjectCue: boolean;
}

function closesPlainVerbPredicate(token: RuntimeHaruToken): boolean {
  if (!isTerminalInflection(token.pos)) {
    return false;
  }
  return (token.pos & POS0) === 動詞 ||
    isPoliteAuxiliaryPos(token.pos) ||
    isRareruAuxiliaryToken(token);
}

const NO_PLAIN_VERB_QUOTE_MARKER_EVIDENCE: PlainVerbQuoteMarkerEvidence = {
  plainVerbTerminal: false,
  quoteCue: false,
  topicSubjectCue: false
};

function plainVerbQuoteMarkerEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  lookups: LookupTables
): PlainVerbQuoteMarkerEvidence {
  const marker = tokens[markerPos];
  if (marker === undefined || (marker.dictionaryForm || marker.surface) !== "と") {
    return NO_PLAIN_VERB_QUOTE_MARKER_EVIDENCE;
  }
  const previousIdx = previousNonSpaceIndex(tokens, markerPos);
  if (previousIdx === null) {
    return NO_PLAIN_VERB_QUOTE_MARKER_EVIDENCE;
  }
  const previous = tokens[previousIdx];
  if (
    previous === undefined ||
    (previous.dictionaryForm || previous.surface) === "か" ||
    !closesPlainVerbPredicate(previous) ||
    terminalAssertiveCopulaSpanEndingBefore(tokens, previousIdx + 1)?.supported === true
  ) {
    return NO_PLAIN_VERB_QUOTE_MARKER_EVIDENCE;
  }
  const cues = plainVerbToQuoteCues(tokens, markerPos, previousIdx, lookups);
  return {
    plainVerbTerminal: true,
    quoteCue: cues.general,
    topicSubjectCue: cues.topicSubject
  };
}

function directQuoteHostBlockedByPlainVerbTo(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  hostIdx: number,
  hostForm: string,
  lookups: LookupTables,
  plainVerbMarker: PlainVerbQuoteMarkerEvidence
): boolean {
  const marker = tokens[markerPos];
  if (marker === undefined || (marker.dictionaryForm || marker.surface) !== "と") {
    return false;
  }
  const previousIdx = previousNonSpaceIndex(tokens, markerPos);
  if (previousIdx === null) {
    return false;
  }
  const companionRelation = quoteHostSearchBridgeArgumentRelationAt(tokens, markerPos, {
    consumers: ["quote_host_taxonomy", "quote_content"],
    headIdx: previousIdx,
  });
  const proto = activeProtoLayout();
  const companionOwner = companionRelation === null || proto === null
    ? null
    : proto.followingPredicateEvidenceIndexAfter(tokens, markerPos, { limit: hostIdx + 1 });
  if (
    lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", hostForm, "bare_nominal_companion_to") &&
    companionRelation !== null &&
    companionOwner === hostIdx
  ) {
    return true;
  }
  if (!lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", hostForm, "plain_verb_to_blocked")) {
    return false;
  }
  if (!plainVerbMarker.plainVerbTerminal) {
    return false;
  }
  if (lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", hostForm, "plain_verb_to_strictly_blocked")) {
    return true;
  }
  return !plainVerbMarker.quoteCue && !plainVerbMarker.topicSubjectCue;
}

function directQuoteHostBlockedByNonImperativeRequestContent(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  hostForm: string,
  kind: QuoteHostKind,
  lookups: LookupTables
): boolean {
  if (kind !== "request" || !lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", hostForm, "command_request")) {
    return false;
  }
  return !quoteMarkerPrecededByRequestCommandContent(tokens, markerPos);
}

function isQuoteBridgeTimeAdverbToken(token: RuntimeHaruToken, lookups: LookupTables): boolean {
  if ((token.pos & POS0) !== 名詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return lookups.EMBEDDED_QUESTION_TIME_ADVERB_NOUNS.has(form);
}

function plainVerbToQuoteCues(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousVerbIdx: number,
  lookups: LookupTables
): { readonly general: boolean; readonly topicSubject: boolean } {
  const beforeVerbIdx = previousNonSpaceIndex(tokens, previousVerbIdx);
  const beforeVerb = beforeVerbIdx === null ? undefined : tokens[beforeVerbIdx];
  const previousVerb = tokens[previousVerbIdx];
  if (
    beforeVerb !== undefined &&
    (previousVerb?.dictionaryForm || previousVerb?.surface) === "する" &&
    (beforeVerb.pos & POS0) === 名詞 &&
    lookups.QUOTE_HOST_REGISTRY.evidenceSetHas("plain_verb_to_quote_cue_sahen_nouns", beforeVerb.dictionaryForm || beforeVerb.surface)
  ) {
    return { general: true, topicSubject: false };
  }
  for (let index = Math.max(0, markerPos - 4); index < markerPos; index += 1) {
    const token = tokens[index];
    if (token !== undefined && isQuoteBridgeTimeAdverbToken(token, lookups)) {
      return { general: true, topicSubject: false };
    }
  }
  const subject = plainVerbToContentExplicitNonFirstPersonSubject(tokens, markerPos, previousVerbIdx, lookups);
  return { general: subject === "nominative", topicSubject: subject === "topic" };
}

type PlainVerbToSubjectEvidence = "nominative" | "topic" | null;

function plainVerbToContentExplicitNonFirstPersonSubject(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  previousVerbIdx: number,
  lookups: LookupTables
): PlainVerbToSubjectEvidence {
  const proto = activeProtoLayout();
  const verbClause = proto?.clauseContaining(previousVerbIdx);
  const markerClause = proto?.clauseContaining(markerPos);
  if (verbClause !== undefined && markerClause !== undefined && verbClause !== markerClause) {
    return null;
  }
  const lowerBound = verbClause?.start ?? 0;
  let index = previousVerbIdx - 1;
  while (index >= lowerBound) {
    const evidence = previousTransparentEvidenceIndex(tokens, index + 1, {
      lowerBoundInclusive: lowerBound,
      isTransparentToken: isClauseSpaceOrAdverbToken
    });
    if (evidence === null) {
      return null;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    const subjectMarker = caseParticleMarkerRelationForToken(token, index, {
      acceptedSurfaces: ["が"],
      consumers: ["quote_host_taxonomy"]
    });
    const topicMarker = token.surface === "は" && (token.pos & POS1) === 係助詞;
    if (subjectMarker !== null || topicMarker) {
      if (!markerParticleBelongsToPredicate(tokens, index, previousVerbIdx, proto)) {
        return null;
      }
      const headIdx = previousContentHeadToken(tokens, index - 1, lowerBound);
      const head = headIdx === null ? undefined : tokens[headIdx];
      if (head === undefined) {
        return null;
      }
      const headForm = head.dictionaryForm || head.surface;
      if (lookups.HONORIFIC_FIRST_PERSON_PRONOUNS.has(headForm)) {
        return null;
      }
      return subjectMarker !== null ? "nominative" : "topic";
    }
    if ((token.pos & POS0) === 補助記号 || (token.pos & POS0) === 記号) {
      return null;
    }
    index -= 1;
  }
  return null;
}

function markerParticleBelongsToPredicate(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number,
  predicateIdx: number,
  proto: ReturnType<typeof activeProtoLayout>
): boolean {
  const owner = proto?.followingPredicateEvidenceIndexAfter(tokens, particleIdx, {
    limit: predicateIdx + 1
  });
  if (owner !== undefined) {
    return owner === predicateIdx;
  }
  let index = particleIdx + 1;
  while (index <= predicateIdx) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: predicateIdx + 1,
      isTransparentToken: (token) => {
        const p0 = token.pos & POS0;
        return p0 === 助詞 ||
          p0 === 副詞 ||
          p0 === 名詞 ||
          p0 === 代名詞 ||
          p0 === 連体詞;
      }
    });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (pos0in(token.pos, PREDICATE_BITS)) {
      return index === predicateIdx;
    }
    if ((token.pos & POS0) === 補助記号 || (token.pos & POS0) === 記号) {
      return false;
    }
    index += 1;
  }
  return false;
}

function previousContentHeadToken(tokens: readonly RuntimeHaruToken[], start: number, lowerBound: number): number | null {
  const index = previousNonSpaceIndex(tokens, start + 1, lowerBound);
  if (index === null) {
    return null;
  }
  const token = tokens[index];
  if (token === undefined || (token.pos & POS0) === 助詞 || (token.pos & POS0) === 補助記号 || (token.pos & POS0) === 記号) {
    return null;
  }
  return index;
}

const MARKER_BOUND_RELATIONAL_HEAD_SETS: readonly QuoteHostEvidenceSetId[] =
  ["bare_nominal_hearsay_companion_cues", "marker_bound_relational_heads"];

export function markerBoundRelationalHeadSpanEndAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  endExclusive: number,
  lookups: LookupTables,
  setIds: readonly QuoteHostEvidenceSetId[]
): number | null {
  const registry = lookups.QUOTE_HOST_REGISTRY;
  let maxLength = 0;
  for (const setId of setIds) {
    for (const form of registry.evidenceSet(setId)) {
      maxLength = Math.max(maxLength, form.length);
    }
  }
  const has = (form: string | null): boolean =>
    form !== null && setIds.some(setId => registry.evidenceSetHas(setId, form));
  let joined = "";
  let matchedEnd: number | null = null;
  for (let j = idx; j < endExclusive; j += 1) {
    const token = tokens[j];
    if (token === undefined) {
      break;
    }
    joined += token.surface;
    if (joined.length > maxLength) {
      break;
    }
    const singleForm = j === idx ? token.dictionaryForm || token.surface : null;
    if (has(joined) || has(singleForm)) {
      matchedEnd = j + 1;
    }
  }
  return matchedEnd;
}

function markerBoundRelationalHeadFollows(
  tokens: readonly RuntimeHaruToken[],
  markerSpanEndExclusive: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const evidence = nextTransparentEvidenceIndex(tokens, markerSpanEndExclusive, {
    endExclusive,
    isTransparentToken: (token) => {
      const pos0 = token.pos & POS0;
      return pos0 === 補助記号 || pos0 === 記号;
    }
  });
  if (evidence === null) {
    return false;
  }
  return markerBoundRelationalHeadSpanEndAt(
    tokens, evidence.index, endExclusive, lookups, MARKER_BOUND_RELATIONAL_HEAD_SETS
  ) !== null;
}

export function nounPhraseCanBridgeToQuoteHost(tokens: readonly RuntimeHaruToken[], nounIdx: number, end: number): boolean {
  return nounPhraseBridgeEndToQuoteHost(tokens, nounIdx, end, false) !== null;
}

interface QuoteHostNounPhraseBridge {
  readonly endExclusive: number;
  readonly extended: boolean;
}

function nounPhraseBridgeEndToQuoteHost(
  tokens: readonly RuntimeHaruToken[],
  nounIdx: number,
  end: number,
  admitAssertiveCopulaContentReach: boolean
): QuoteHostNounPhraseBridge | null {
  let crossedNounPhraseInterior = false;
  const particleSearchStart = nextTransparentEvidenceIndex(tokens, nounIdx + 1, {
    endExclusive: end,
    isTransparentToken: (token, particleIndex) => {
      if (isNominalSuffixToken(token)) {
        return true;
      }
      if (
        admitAssertiveCopulaContentReach &&
        isSecondaryParticleToken(token) &&
        secondaryParticleClosedByArgumentMarker(tokens, particleIndex, end)
      ) {
        crossedNounPhraseInterior = true;
        return true;
      }
      if (!admitAssertiveCopulaContentReach || !isNominalLike(token)) {
        return false;
      }
      crossedNounPhraseInterior = true;
      return true;
    }
  })?.index ?? end;
  const particleIdx = nextNonSpaceIndex(tokens, particleSearchStart, end);
  if (particleIdx === null) {
    return null;
  }
  const coreRelation = quoteHostSearchBridgeArgumentRelationAt(tokens, particleIdx, {
    headIdx: nounIdx,
    consumers: ["quote_host_taxonomy", "quote_content"]
  });
  if (coreRelation !== null) {
    return { endExclusive: coreRelation.span.endExclusive, extended: crossedNounPhraseInterior };
  }
  if (!admitAssertiveCopulaContentReach) {
    return null;
  }
  const compoundRelation = quoteHostSearchBridgeArgumentRelationAt(tokens, particleIdx, {
    headIdx: nounIdx,
    consumers: ["quote_host_taxonomy", "quote_content"],
    admitCompoundCaseMarker: true
  });
  if (compoundRelation !== null) {
    return { endExclusive: compoundRelation.span.endExclusive, extended: true };
  }
  const copulaNi = copulaNiMarkerRelationForToken(tokens[particleIdx], particleIdx, {
    consumers: ["quote_host_taxonomy"]
  });
  return copulaNi === null ? null : { endExclusive: copulaNi.span.endExclusive, extended: true };
}

function secondaryParticleClosedByArgumentMarker(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  end: number
): boolean {
  const nextIdx = nextNonSpaceIndex(tokens, index + 1, end);
  if (nextIdx === null) {
    return false;
  }
  if (
    nominalLinkMarkerRelationForToken(tokens[nextIdx], nextIdx, {
      consumers: ["quote_host_taxonomy"]
    }) !== null
  ) {
    return false;
  }
  return quoteHostSearchBridgeArgumentRelationAt(tokens, nextIdx, {
    consumers: ["quote_host_taxonomy", "quote_content"],
    admitCompoundCaseMarker: true
  }) !== null;
}

function quoteMarkerCompositeCarriesEnumerationKa(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number,
  markerSpanEndExclusive: number
): boolean {
  for (let index = markerPos + 1; index < markerSpanEndExclusive; index += 1) {
    if (kaMarkerRelationForToken(tokens[index], index, ["quote_host_taxonomy"]) !== null) {
      return true;
    }
  }
  return false;
}

function hostInsideForeignRelativeClause(markerPos: number, hostIdx: number): boolean {
  const layout = activeProtoLayout();
  if (layout === null) {
    return false;
  }
  const hostClauseIdx = layout.clauseIndexOfToken(hostIdx);
  if (hostClauseIdx < 0 || layout.protoClauses[hostClauseIdx]?.kind !== "relative") {
    return false;
  }
  return layout.clauseIndexOfToken(markerPos) !== hostClauseIdx;
}

export function isNominalSuffixToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS01) === 接尾辞_名詞的;
}

function quoteContentClosedByAssertiveCopula(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number
): boolean {
  const previousIdx = previousNonSpaceIndex(tokens, markerPos);
  return previousIdx !== null &&
    terminalAssertiveCopulaSpanEndingBefore(tokens, previousIdx + 1) !== null;
}

function quoteHostSearchEnd(cursor: TokenCursor<RuntimeHaruToken>): number {
  const proto = activeProtoLayout();
  if (proto === null) {
    return cursor.end;
  }
  const clause = proto.clauseContaining(cursor.pos);
  return clause?.end ?? cursor.end;
}

function matchNounSuruHost(tokens: readonly RuntimeHaruToken[], nounIdx: number, end: number, lookups: LookupTables): QuoteHostMatch | null {
  const noun = tokens[nounIdx];
  if (noun === undefined) {
    return null;
  }
  const nounForm = noun.dictionaryForm || noun.surface;
  const kind = lookups.QUOTE_HOST_REGISTRY.kind("noun_suru", nounForm);
  if (kind === undefined) {
    return null;
  }
  let suruIdx = nextNonSpaceIndex(tokens, nounIdx + 1, end);
  if (suruIdx === null) {
    return null;
  }
  let accusative = false;
  if (
    caseParticleMarkerRelationForToken(tokens[suruIdx], suruIdx, {
      acceptedSurfaces: ["を"],
      consumers: ["quote_host_taxonomy"]
    }) !== null
  ) {
    accusative = true;
    suruIdx = nextNonSpaceIndex(tokens, suruIdx + 1, end);
    if (suruIdx === null) {
      return null;
    }
  }
  const suru = tokens[suruIdx];
  if (suru === undefined || (suru.pos & POS0) !== 動詞) {
    return null;
  }
  if (
    !isSahenLightVerbToken(suru) &&
    !lookups.HONORIFIC_SAHEN_LIGHT_VERBS.has(suru.dictionaryForm || suru.surface)
  ) {
    return null;
  }
  return new QuoteHostMatch(kind, `${nounForm}する`, suruIdx, nounIdx, null, accusative);
}

function quoteHostPrefersConditionalAfterNegative(match: QuoteHostMatch, lookups: LookupTables | undefined): boolean {
  if (lookups === undefined || match.supportIdx === null || !match.hostForm.endsWith("する")) {
    return false;
  }
  return lookups.QUOTE_HOST_REGISTRY.hasCapability("noun_suru", match.hostForm.slice(0, -"する".length), "negative_condition_preferred");
}

function markerPrecededByNegativeChain(tokens: readonly RuntimeHaruToken[], markerPos: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, markerPos);
  if (prevIdx === null) {
    return false;
  }
  const token = tokens[prevIdx];
  return token !== undefined && isChainedNaiToken(token);
}

function hostFollowedByNegativeAux(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos: hostIdx } = cursor;
  const end = cursor.lookahead(1, quoteHostSearchEnd);
  let index = hostIdx + 1;
  while (index < end) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, { endExclusive: end });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    const pos = tokens[index]?.pos ?? 0;
    if ((pos & POS0) !== 助動詞) {
      return false;
    }
    const token = tokens[index];
    if (token !== undefined && isChainedNaiToken(token)) {
      return true;
    }
    index += 1;
  }
  return false;
}
