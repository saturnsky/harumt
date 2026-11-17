
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { LookupTables } from "../../lookup-tables.js";
import { quoteStructuralRelationAt } from "../../structural-relation/quote.js";
import { classifyDatteMarkerAt } from "../../semantics/marker-roles.js";
import {
  caseParticleMarkerRelationForToken,
  copulaDeMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationAt,
  kaMarkerRelationForToken,
  nominalLinkMarkerRelationAt,
  predicateNominalizerRelationForToken,
  topicFocusMarkerRelationForToken
} from "../boundary/marker.js";
import { datteQuoteMarkerRelationAt, quoteMarkerRelationAt } from "../boundary/quote-marker.js";
import { hasWeakPunctuationRelation } from "../boundary/punctuation.js";
import type { CaseParticleMarkerSurface, QuoteMarkerRelation } from "../boundary/relation.js";
import { isTeConnectiveToken, matchTeConnectiveHeadAt } from "./postverb-tail-classifier.js";
import { detectNoCopulaChain } from "../../semantics/grammar-runtime.js";
import { auxHasNegation, auxHasPast, auxHasPolite, isCopulaDaOrDesuDictionaryForm } from "../../matchers.js";
import { matchNodaNoKaNegativeConfirmTerminalTail } from "../../semantics/terminal-negative-confirm.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import { TokenCursor } from "../../token-cursor.js";

import { POS0, POS01, POS1, POS4, POS5, POS5A, 意志推量形_, 仮定形_, 記号, 形状詞, 形容詞0, 終止形_, 終助詞, 助詞, 助詞_接続助詞, 助動詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_タイ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_ヤ, 接続助詞, 動詞, 副詞, 補助記号, 未然形_, 名詞, 連体形_, 連用形_, 連用形_一般, 連用形_促音便, 連用形_融合, 動詞_非自立可能, 助詞_終助詞, NOMINAL_BITS, 五段_ガ行, 下一段_サ行, 下一段_マ行, 連用形_イ音便, 連用形_撥音便, pos0in, isNominalLike, is上一段, is下一段 } from "../../../types/pos.js";
export type Span = readonly [start: number, end: number];
export type LexicalTailAbsorptionKind =
  | "embedded_juda"
  | "honorific_jusida"
  | "recipient_side_humble"
  | "request_absorption"
  | "causative_drop";
export type PostVerbFailureReason = "vocabulary_gap" | "not_postverb_anchor" | "known_family_missed" | "scope_exempt";

export interface PostVerbToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
}

type PVCursor = TokenCursor<PostVerbToken>;

export interface BoundaryProvider {
  lookaheadEnd(tokenIdx: number): number | undefined;
}

export interface PostVerbParserContext {
  readonly boundaryProvider?: BoundaryProvider | null;
  readonly clauseId?: string | number | null;
  readonly selectedEntry?: PostVerbEntry | null;
  readonly selectedTranslation?: PostVerbTranslation | null;
  readonly mainAuxTokens?: readonly PostVerbToken[];
  readonly tailAuxTokens?: readonly PostVerbToken[];
  readonly benefactiveContext?: BenefactiveContext | null;
  readonly particleEvidence?: PostVerbParticleEvidence | null;
  readonly voiceContext?: PostVerbContextPayload | null;
  readonly quoteContext?: PostVerbContextPayload | null;
  readonly postAuxSeed?: PostAuxSeed | null;
  readonly lexicalTailAbsorptions?: readonly LexicalTailAbsorption[];
  readonly expectedConsumedUntil?: number | null;
}

export interface BenefactiveContext {
  readonly recipientSideHumble?: boolean;
  readonly recipient_side_humble?: boolean;
}

export interface LexicalTailAbsorption {
  readonly kind: LexicalTailAbsorptionKind;
  readonly mainLemma?: string | null;
  readonly tailFamily?: string | null;
  readonly recipientSide?: boolean;
  readonly dropFirstCausativeAux?: boolean;
  readonly source?: string;
}

export interface PostVerbParticleEvidence {
  readonly surface?: string | null;
  readonly role?: string | null;
  readonly state?: string | null;
  readonly renderStrategy?: TeAruRenderStrategy | null;
}

export interface PostVerbHandoff {
  readonly kind: "quote_request" | "quote_reason_question" | "quote_content";
  readonly terminalSpan?: Span | null;
  readonly quoteMarkerSpan: Span;
  readonly hostStart?: number | null;
  readonly consumedUntil: number;
  readonly ownsQuestionTerminal: boolean;
  readonly hostType?: string | null;
  readonly hostVoice?: string | null;
}

export type PostVerbFamilyPayload =
  | RequestFamilyPayload
  | DesiderativeFamilyPayload
  | TeAruFamilyPayload
  | NodaFamilyPayload
  | LikenessFamilyPayload;

export interface RequestFamilyPayload {
  readonly kind: "kudasai" | "request" | "hoshii" | "chodai";
  readonly register: "plain" | "polite" | "colloquial";
  readonly polite: boolean;
}

export interface DesiderativeFamilyPayload {
  readonly kind: "hoshii" | "tai";
  readonly desireNegative: boolean;
  readonly desirePast: boolean;
  readonly polite: boolean;
  readonly conditional: boolean;
  readonly desiredPredicateNegative: boolean;
}

export interface TeAruFamilyPayload {
  readonly state: "resultative" | "prepared" | "unknown";
  readonly renderStrategy: TeAruRenderStrategy;
  readonly particle?: string | null;
  readonly role?: string | null;
}

export type TeAruRenderStrategy =
  | "context_required"
  | "resultative_state"
  | "prepared_te_oku";

export interface NodaFamilyPayload {
  readonly chainKind?: string;
  readonly chain_kind?: string;
  readonly chainPast?: boolean;
  readonly chain_past?: boolean;
  readonly chainPolite?: boolean;
  readonly chain_polite?: boolean;
  readonly bridge_particle?: string | null;
  readonly copula_aux_tokens?: readonly PostVerbToken[];
  readonly negative_copula_aux_tokens?: readonly PostVerbToken[];
  readonly negative_copula_modal_aux_tokens?: readonly PostVerbToken[];
  readonly source?: string;
}

export interface LikenessFamilyPayload {
  kind?: string;
  pre_aux_tokens?: readonly PostVerbToken[];
  modal_aux_tokens?: readonly PostVerbToken[];
  likeness_copula_continuation?: string;
  focus_particle?: string | null;
  continuation_aux_tokens?: readonly PostVerbToken[];
  continuation_connective?: string;
  external_nominalizer_connective?: string;
  connective_suffix?: string;
}

export interface PostVerbContextPayload {
  readonly kind?: string | null;
  readonly value?: string | number | boolean | null;
}

export interface OperatorEventPayload {
  readonly family: string;
  readonly incomingConnective?: string | null;
  readonly connectorSpan?: Span | null;
  readonly sourceSurface?: string | null;
  readonly lexicalTailAbsorptions?: readonly LexicalTailAbsorption[];
  readonly state?: string | null;
  readonly renderStrategy?: string | null;
  readonly familyPayload?: PostVerbFamilyPayload | null;
}

export interface TerminalEventPayload {
  readonly kind: string;
  readonly auxTokens?: readonly PostVerbToken[];
  readonly connective?: string | null;
  readonly sfp?: string | null;
  readonly modal?: string | null;
  readonly conditionalFlavor?: string | null;
  readonly polarity?: string | null;
  readonly tense?: string | null;
  readonly register?: string | null;
  readonly familyPayload?: PostVerbFamilyPayload | null;
}

export interface FollowerEventPayload {
  readonly kind: string;
  readonly span: Span;
  readonly hostType?: string | null;
  readonly handoff?: PostVerbHandoff | null;
}

export interface PostAuxSeed {
  readonly kind: string;
  readonly span: Span;
  readonly payload?: PostAuxSeedPayload | null;
}

export interface PostAuxSeedPayload {
  readonly polite?: boolean;
  readonly desiredPredicateNegative?: boolean;
  readonly kind?: "hoshii" | "tai";
  readonly desireNegative?: boolean;
  readonly desirePast?: boolean;
  readonly conditional?: boolean;
}

export type PostVerbEvent =
  | { readonly kind: "operator"; readonly family: string; readonly span: Span; readonly payload: OperatorEventPayload }
  | { readonly kind: "terminal"; readonly family: string; readonly span: Span; readonly payload: TerminalEventPayload }
  | { readonly kind: "follower"; readonly family: string; readonly span: Span; readonly payload: FollowerEventPayload };

export interface PostVerbTrace {
  readonly stage: string;
  readonly span: Span;
  readonly message: string;
  readonly detail?: PostVerbTraceDetail;
}

export type PostVerbTraceValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | readonly number[]
  | readonly boolean[]
  | readonly (string | number | boolean | null)[];

export interface PostVerbTraceDetail {
  readonly family?: string;
  readonly reason?: string;
  readonly cursor?: number;
  readonly [key: string]: PostVerbTraceValue | undefined;
}

export interface PostVerbEventStream {
  readonly events: readonly PostVerbEvent[];
  readonly consumedUntil: number;
  readonly trace?: readonly PostVerbTrace[];
}


export interface PostVerbParseFailure {
  readonly reason: PostVerbFailureReason;
  readonly span: Span;
  readonly cursor: number;
  readonly trace?: readonly PostVerbTrace[];
}

export type PostVerbEventStreamResult = PostVerbEventStream | PostVerbParseFailure;


export const BENEFACTIVE_DICT_FORMS = new Set([
  "くれる", "呉れる", "くださる", "下さる", "もらう", "貰う", "もらえる", "貰える",
  "いただく", "頂く", "いただける", "頂ける", "あげる", "上げる", "やる"
]);

export const ASPECT_DICT_FORMS: Record<string, string> = {
  "いる": "te_iru",
  "おる": "te_oru",
  "ある": "te_aru",
  "有る": "te_aru",
  "おく": "te_oku",
  "置く": "te_oku",
  "しまう": "te_shimau",
  "仕舞う": "te_shimau",
  "いく": "te_iku",
  "行く": "te_iku",
  "まいる": "te_iku",
  "参る": "te_iku",
  "くる": "te_kuru",
  "来る": "te_kuru"
};

const COLLAPSED_TE_OKU_DICT_FORMS = new Set(["とく", "どく"]);
export const CONNECTIVE_SURFACES = new Set(["て", "で", "まして"]);
export const QUOTE_MARKERS = new Set(["と", "って"]);
export const NODA_COPULA_POS4 = new Set([助動詞_ダ, 助動詞_デス, 助動詞_ジャ, 助動詞_ヤ]);
export const PERMISSIVE_FOLLOWERS = new Set(["いい", "良い", "よい", "宜しい", "よろしい", "構わない", "かまわない"]);
export const CHAIN_FOLLOWER_LEMMAS = new Set(["しまう", "おく", "置く", "いる", "居る", "おる", "くれる", "呉れる", "くださる", "下さる", "もらう", "貰う", "もらえる", "貰える", "いただく", "頂く", "いただける", "頂ける"]);

interface PostVerbTranslation {
  readonly korean: string;
  readonly koreanPos?: number;
  readonly dropFirstCausativeAux?: boolean;
  readonly senseFrame?: unknown;
  readonly senseFrames?: readonly unknown[];
}

interface PostVerbEntry {
  readonly dictionaryForm?: string;
  readonly dictionary_form?: string;
  readonly senses?: readonly PostVerbTranslation[];
}


function isPostVerbCaseParticle(
  tokens: readonly PostVerbToken[],
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return isPostVerbCaseParticleToken(tokens[index], index, surface, acceptedParticleSubtypes);
}

function isPostVerbCaseParticleToken(
  token: PostVerbToken | undefined,
  index: number,
  surface: CaseParticleMarkerSurface,
  acceptedParticleSubtypes?: readonly string[]
): boolean {
  return caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: [surface],
    ...(acceptedParticleSubtypes === undefined ? {} : { acceptedParticleSubtypes }),
    consumers: ["postverb_chain"]
  }) !== null;
}

export function isConnector(token: PostVerbToken): boolean {
  return CONNECTIVE_SURFACES.has(token.surface) && (token.pos & POS01) === 助詞_接続助詞;
}


export function selectedTranslationHasCausativeContext(entry: PostVerbEntry | null | undefined, koreanLemma: string): boolean {
  const translation = selectedTranslationForLemma(entry, koreanLemma);
  return senseChainCondition(translation, "causative") === true;
}

export function lexicalTailAbsorptionsFromEntry(
  entry: PostVerbEntry | null | undefined,
  koreanLemma: string,
  options: {
    readonly tailRole?: "benefactive" | "request" | null;
    readonly tailFamily?: string | null;
    readonly benefactiveContext?: BenefactiveContext | null;
  } = {}
): readonly LexicalTailAbsorption[] {
  const translation = selectedTranslationForLemma(entry, koreanLemma);
  if (translation === undefined) {
    return [];
  }
  const tailRole = options.tailRole ?? null;
  const tailFamily = options.tailFamily ?? null;
  const benefactiveContext = options.benefactiveContext ?? null;
  const absorptions: LexicalTailAbsorption[] = [];

  if (translation.dropFirstCausativeAux === true) {
    const requestTail = senseChainCondition(translation, "requestTail") ?? senseChainCondition(translation, "request_tail");
    const benefactiveTail = senseChainCondition(translation, "benefactiveTail") ?? senseChainCondition(translation, "benefactive_tail");
    const blocked = (tailRole === "request" && requestTail === false)
      || (tailRole === "benefactive" && benefactiveTail === false)
      || (tailRole === null && (requestTail === false || benefactiveTail === false));
    if (!blocked) {
      absorptions.push({
        kind: "causative_drop",
        mainLemma: koreanLemma,
        tailFamily,
        dropFirstCausativeAux: true,
        source: "selected_translation"
      });
    }
  }

  if (tailRole === "benefactive" && koreanLemma.endsWith("주다")) {
    const honorificFamilies = new Set(["te_itadaku", "te_itadaku_de", "te_itadakeru", "te_itadakeru_de", "te_kudasaru", "te_kudasaru_de"]);
    absorptions.push({
      kind: honorificFamilies.has(tailFamily ?? "") ? "honorific_jusida" : "embedded_juda",
      mainLemma: koreanLemma,
      tailFamily,
      source: "selected_translation"
    });
  }

  if (tailRole === "benefactive" && (benefactiveContext?.recipientSideHumble ?? benefactiveContext?.recipient_side_humble) === true) {
    absorptions.push({
      kind: "recipient_side_humble",
      mainLemma: koreanLemma,
      tailFamily,
      recipientSide: true,
      source: "selected_translation"
    });
  }

  if (tailRole === "request" && (koreanLemma.endsWith("주다") || koreanLemma.endsWith("드리다"))) {
    absorptions.push({
      kind: "request_absorption",
      mainLemma: koreanLemma,
      tailFamily,
      source: "selected_translation"
    });
  }

  return absorptions;
}

export function lexicalTailAbsorptionsDropCausative(absorptions: readonly LexicalTailAbsorption[]): boolean {
  return absorptions.some((absorption) => absorption.dropFirstCausativeAux === true);
}

export function nextAfterWeakBoundary(tokens: readonly PostVerbToken[], cursor: number, end = tokens.length): number | null {
  let index = (nextNonSpaceIndex(tokens, cursor, end) ?? end);
  if (
    index < end &&
    hasWeakPunctuationRelation(tokens[index], index, ["postverb_chain"])
  ) {
    index = (nextNonSpaceIndex(tokens, index + 1, end) ?? end);
  }
  return index < end ? index : null;
}

export function classifyTeFollowerKind(tokens: readonly PostVerbToken[], connectorPos: number, end: number, lookups: LookupTables): string | null {
  if (connectorPos >= end || !isConnector(tokens[connectorPos]!)) {
    return null;
  }
  const immediate = (nextNonSpaceIndex(tokens, connectorPos + 1, end) ?? end);
  if (immediate >= end) {
    return null;
  }
  const immediateSurface = tokens[immediate]?.surface ?? "";
  if (immediateSurface === "も") {
    const afterMo = nextAfterWeakBoundary(tokens, immediate + 1, end);
    if (afterMo !== null) {
      const follower = tokens[afterMo];
      const followerForm = follower === undefined ? "" : follower.dictionaryForm || follower.surface;
      if (PERMISSIVE_FOLLOWERS.has(followerForm)) {
        return "permissive";
      }
    }
    return "terminal_concessive";
  }
  if (immediateSurface === "から") {
    return "temporal_after";
  }
  const immediateToken = tokens[immediate];
  if (immediateToken !== undefined && (immediateToken.pos & POS0) === 動詞 && CHAIN_FOLLOWER_LEMMAS.has(immediateToken.dictionaryForm || immediateToken.surface)) {
    return "chain_continuation";
  }
  return findTeEvaluationFollowerIndex(tokens, connectorPos + 1, end, lookups) !== undefined ? "reason_evaluation" : null;
}

export function findTeEvaluationFollowerIndex(tokens: readonly PostVerbToken[], start: number, end: number, lookups: LookupTables): number | undefined {
  let cursor = nextAfterWeakBoundary(tokens, start, end);
  while (cursor !== null && cursor < end) {
    const token = tokens[cursor];
    if (token === undefined) {
      return undefined;
    }
    const surface = token.surface;
    if (lookups.TE_EVALUATION_FOLLOWERS.has(token.dictionaryForm || token.surface)) {
      return cursor;
    }
    if ((token.pos & POS0) === 補助記号) {
      if (hasWeakPunctuationRelation(token, cursor, ["postverb_chain"])) {
        cursor = (nextNonSpaceIndex(tokens, cursor + 1, end) ?? end);
        continue;
      }
      return undefined;
    }
    if ((token.pos & POS0) === 副詞) {
      cursor = nextAfterWeakBoundary(tokens, cursor + 1, end);
      continue;
    }
    if (pos0in(token.pos, NOMINAL_BITS)) {
      const particleIdx = (nextNonSpaceIndex(tokens, cursor + 1, end) ?? end);
      const particle = tokens[particleIdx];
      if (particle !== undefined && (particle.pos & POS0) === 助詞 && ["は", "も", "が", "なら", "でも"].includes(particle.surface)) {
        cursor = nextAfterWeakBoundary(tokens, particleIdx + 1, end);
        continue;
      }
      if (isPostVerbCaseParticleToken(particle, particleIdx, "に")) {
        const afterParticle = nextAfterWeakBoundary(tokens, particleIdx + 1, end);
        if (afterParticle !== null && afterParticle < end && isEvaluationOrAdverbForPostVerb(tokens[afterParticle], lookups)) {
          cursor = afterParticle;
          continue;
        }
      }
      let chunkEnd = nextAfterWeakBoundary(tokens, cursor + 1, end);
      while (chunkEnd !== null && chunkEnd < end && isWeakEvaluationPhraseToken(tokens[chunkEnd])) {
        chunkEnd = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
      }
      if (chunkEnd !== null && chunkEnd < end) {
        if (isEvaluationOrAdverbForPostVerb(tokens[chunkEnd], lookups)) {
          cursor = chunkEnd;
          continue;
        }
        if ((tokens[chunkEnd]!.pos & POS0) === 助詞 && ["は", "も", "が"].includes(tokens[chunkEnd]?.surface ?? "")) {
          cursor = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
          continue;
        }
        if (isPostVerbCaseParticle(tokens, chunkEnd, "に")) {
          const afterParticle = nextAfterWeakBoundary(tokens, chunkEnd + 1, end);
          if (afterParticle !== null && isEvaluationOrAdverbForPostVerb(tokens[afterParticle], lookups)) {
            cursor = afterParticle;
            continue;
          }
        }
      }
      const nextIdx = nextAfterWeakBoundary(tokens, cursor + 1, end);
      if (nextIdx !== null && isEvaluationOrAdverbForPostVerb(tokens[nextIdx], lookups)) {
        cursor = nextIdx;
        continue;
      }
      return undefined;
    }
    if ((token.pos & POS0) === 助詞 && ["は", "も", "が"].includes(surface)) {
      cursor = nextAfterWeakBoundary(tokens, cursor + 1, end);
      continue;
    }
    return undefined;
  }
  return undefined;
}

function isEvaluationOrAdverbForPostVerb(token: PostVerbToken | undefined, lookups: LookupTables): boolean {
  return token !== undefined && (lookups.TE_EVALUATION_FOLLOWERS.has(token.dictionaryForm || token.surface) || (token.pos & POS0) === 副詞);
}

function isWeakEvaluationPhraseToken(token: PostVerbToken | undefined): boolean {
  return token !== undefined && isNominalLike(token);
}



export function parsePostverbEventStream(
  cursor: TokenCursor<PostVerbToken>,
  options: {
    readonly anchor?: number;
    readonly context?: PostVerbParserContext;
    readonly lookups: LookupTables;
  }
): PostVerbEventStreamResult {
  const tokens = cursor.tokens;
  const initialCursor = cursor.pos;
  const context = options.context ?? {};
  const lookups = options.lookups;
  const end = lookaheadEnd(tokens, context, initialCursor) ?? cursor.end;
  const cur = cursor.fork((nextNonSpaceIndex(tokens, initialCursor, end) ?? end), end, initialCursor);
  const events: PostVerbEvent[] = [];
  const trace: PostVerbTrace[] = [];

  while (cur.pos < cur.end) {
    const operatorEvent = parseOperator(tokens, cur, context);
    if (operatorEvent === undefined) {
      break;
    }
    events.push(operatorEvent);
    trace.push(traceForEvent("operator", operatorEvent));
    const impliedEvent = operatorImpliedTerminal(tokens, operatorEvent, cur);
    if (impliedEvent !== undefined) {
      events.push(impliedEvent);
      trace.push(traceForEvent("terminal", impliedEvent));
      const quoteEvent = maybeQuoteFollower(tokens, cur, lookups, impliedEvent);
      if (quoteEvent !== undefined) {
        events.push(quoteEvent);
        trace.push(traceForEvent("follower", quoteEvent));
      }
      return { events, consumedUntil: cur.pos, trace };
    }
    const terminalEvent = context.postAuxSeed !== undefined && context.postAuxSeed !== null && operatorEvent.family === "desiderative_request"
      ? parseTerminalKind(tokens, cur, lookups)
      : undefined;
    if (terminalEvent !== undefined) {
      events.push(terminalEvent);
      trace.push(traceForEvent("terminal", terminalEvent));
      const followerEvent = maybeFollower(tokens, cur, terminalEvent, lookups);
      if (followerEvent !== undefined) {
        events.push(followerEvent);
        trace.push(traceForEvent("follower", followerEvent));
      }
      return { events, consumedUntil: cur.pos, trace };
    }
    const quoteEvent = maybeQuoteFollower(tokens, cur, lookups);
    if (quoteEvent !== undefined) {
      events.push(quoteEvent);
      trace.push(traceForEvent("follower", quoteEvent));
      return { events, consumedUntil: cur.pos, trace };
    }
    const nextPos = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
    if (nextPos <= cur.pos) break;
    cur.advance(nextPos - cur.pos);
    continue;
  }

  if (events.length === 0) {
    const terminalEvent = parseTerminalKind(tokens, cur, lookups);
    if (terminalEvent === undefined) {
      return failure("not_postverb_anchor", initialCursor);
    }
    events.push(terminalEvent);
    trace.push(traceForEvent("terminal", terminalEvent));
    const followerEvent = maybeFollower(tokens, cur, terminalEvent, lookups);
    if (followerEvent !== undefined) {
      events.push(followerEvent);
      trace.push(traceForEvent("follower", followerEvent));
    }
    return { events, consumedUntil: cur.pos, trace };
  }

  const terminalEvent = parseTerminalKind(tokens, cur, lookups);
  if (terminalEvent !== undefined) {
    events.push(terminalEvent);
    trace.push(traceForEvent("terminal", terminalEvent));
    const followerEvent = maybeFollower(tokens, cur, terminalEvent, lookups);
    if (followerEvent !== undefined) {
      events.push(followerEvent);
      trace.push(traceForEvent("follower", followerEvent));
      return { events, consumedUntil: cur.pos, trace };
    }
  }

  return { events, consumedUntil: cur.pos, trace };
}




function postVerbTokensToRuntime(tokens: readonly PostVerbToken[]): readonly RuntimeHaruToken[] {
  return tokens.map((token) => ({
    surface: token.surface,
    dictionaryForm: token.dictionaryForm,
    reading: token.reading ?? token.surface,
    dictionaryFormReading: token.dictionaryFormReading ?? token.reading ?? token.surface,
    pos: token.pos,
    dictionaryId: -1
  }));
}


function selectedTranslationForLemma(entry: PostVerbEntry | null | undefined, koreanLemma: string): PostVerbTranslation | undefined {
  return (entry?.senses ?? []).find((translation) => translation.korean === koreanLemma);
}

function senseFrames(translation: PostVerbTranslation | undefined): readonly unknown[] {
  if (translation === undefined) {
    return [];
  }
  if (Array.isArray(translation.senseFrames)) {
    return translation.senseFrames;
  }
  return [translation.senseFrame].filter((frame) => frame !== undefined && frame !== null);
}

function senseChainCondition(translation: PostVerbTranslation | undefined, key: string): boolean | undefined {
  for (const frame of senseFrames(translation)) {
    if (typeof frame !== "object" || frame === null || Array.isArray(frame)) {
      continue;
    }
    const chain = (frame as { readonly chainConditions?: Record<string, unknown>; readonly chain_conditions?: Record<string, unknown> }).chainConditions ??
      (frame as { readonly chain_conditions?: Record<string, unknown> }).chain_conditions;
    const value = chain?.[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return undefined;
}

function operatorFamily(
  token: PostVerbToken,
  tokens?: readonly PostVerbToken[],
  tokenIdx?: number
): string | undefined {
  const form = token.dictionaryForm || token.surface;
  if (BENEFACTIVE_DICT_FORMS.has(form)) {
    return "benefactive";
  }
  if (form === "居る") {
    return token.surface.startsWith("お") ? "te_oru" : "te_iru";
  }
  if ((form === "まいる" || form === "参る") && tokens !== undefined && tokenIdx !== undefined) {
    const n1 = tokens[tokenIdx + 1];
    const followedByTa = n1 !== undefined && (
      (n1.pos & POS4) === 助動詞_タ ||
      (n1.dictionaryForm === "ます" && ((tokens[tokenIdx + 2]?.pos ?? 0) & POS4) === 助動詞_タ)
    );
    if (followedByTa) return "te_kuru";
  }
  return ASPECT_DICT_FORMS[form];
}

function directOperatorFamily(
  tokens: readonly PostVerbToken[],
  cursor: number
): string | undefined {
  const token = tokens[cursor];
  if (token === undefined) {
    return undefined;
  }
  const form = token.dictionaryForm || token.surface;
  if (
    COLLAPSED_TE_OKU_DICT_FORMS.has(form) &&
    (token.pos & POS0) === 助動詞 &&
    hasCollapsedTeOkuTeFormHost(tokens, cursor)
  ) {
    return "te_oku";
  }
  return operatorFamily(token, tokens, cursor);
}

function hasCollapsedTeOkuTeFormHost(
  tokens: readonly PostVerbToken[],
  auxPos: number
): boolean {
  const aux = tokens[auxPos];
  const previous = tokens[auxPos - 1];
  if (aux === undefined || previous === undefined) {
    return false;
  }
  if (!collapsedTeOkuMarkerAgreesWithHost(aux, previous)) {
    return false;
  }
  if (isCausativeAuxTeFormHost(previous) || isCollapsedShimauAuxTeFormHost(previous)) {
    return true;
  }
  if ((previous.pos & POS0) !== 動詞) {
    return false;
  }
  const form = previous.pos & POS5A;
  return form === 連用形_ ||
    (form === 未然形_ && (is上一段(previous.pos) || is下一段(previous.pos)));
}

function collapsedTeOkuMarkerAgreesWithHost(
  aux: PostVerbToken,
  host: PostVerbToken
): boolean {
  const hostForm = host.pos & POS5;
  const hostClass = host.pos & POS4;
  const requiresVoicedTe = hostForm === 連用形_撥音便 ||
    (hostClass === 五段_ガ行 && hostForm === 連用形_イ音便);
  const expected = requiresVoicedTe ? "ど" : "と";
  return aux.surface.startsWith(expected) && (aux.dictionaryForm || aux.surface).startsWith(expected);
}

function isCausativeAuxTeFormHost(token: PostVerbToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const isCausativeAux =
    (
      pos4 === 下一段_サ行 &&
      (token.dictionaryForm === "せる" || token.dictionaryForm === "させる")
    ) ||
    (
      pos4 === 下一段_マ行 &&
      (token.dictionaryForm === "しめる" || token.surface === "しめ")
    );
  if (!isCausativeAux) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ || form === 未然形_;
}

function isCollapsedShimauAuxTeFormHost(token: PostVerbToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return (form === 連用形_ || form === 連用形_促音便) &&
    (
      token.dictionaryForm === "ちゃう" ||
      token.dictionaryForm === "じゃう" ||
      token.dictionaryForm === "ちまう" ||
      token.dictionaryForm === "じまう"
    );
}

function lookaheadEnd(tokens: readonly PostVerbToken[], context: PostVerbParserContext, anchor: number): number | undefined {
  const provider = context.boundaryProvider ?? context.boundaryProvider;
  const boundary = provider?.lookaheadEnd(anchor) ?? provider?.lookaheadEnd(anchor);
  return boundary === undefined ? undefined : Math.min(boundary, tokens.length);
}

function failure(reason: PostVerbFailureReason, cursor: number): PostVerbParseFailure {
  return {
    reason,
    span: [cursor, cursor],
    cursor,
    trace: [{ stage: "failure", span: [cursor, cursor], message: "no post-verb event at cursor" }]
  };
}

function traceForEvent(stage: "operator" | "terminal" | "follower", event: PostVerbEvent): PostVerbTrace {
  return { stage, span: event.span, message: event.family };
}

function parseOperator(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  context: PostVerbParserContext
): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const seed = context.postAuxSeed;
  if (seed !== undefined && seed !== null) {
    const seeded = eventFromPostAuxSeed(tokens, seed, cur, context);
    if (seeded !== undefined) {
      return seeded;
    }
  }
  const negativeDesire = parseNegativeDesiderativeRequest(tokens, cur);
  if (negativeDesire !== undefined) {
    return negativeDesire;
  }
  const connector = tokens[cursor];
  if (connector === undefined || cursor >= cur.end || !isConnector(connector)) {
    return parseDirectOperator(tokens, cur, context);
  }
  const desire = parseDesiderativeRequest(tokens, cur);
  if (desire !== undefined) {
    return desire;
  }
  const operatorIndex = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
  const operator = tokens[operatorIndex];
  if (operatorIndex >= cur.end || operator === undefined) {
    return undefined;
  }

  const family = operatorFamily(operator, tokens, operatorIndex);
  if (family !== undefined && family !== "benefactive") {
    const teAru = family === "te_aru" ? teAruPayloadFromContext(context) : null;
    const payload: OperatorEventPayload = {
      family,
      incomingConnective: connector.surface,
      connectorSpan: [cursor, operatorIndex],
      sourceSurface: operator.surface,
      ...(teAru === null ? {} : {
        state: teAru.state,
        renderStrategy: teAru.renderStrategy,
        familyPayload: teAru
      })
    };
    cur.advance(operatorIndex + 1 - cur.pos);
    return { kind: "operator", family, span: [cursor, operatorIndex + 1], payload };
  }

  if (family === "benefactive") {
    const absorptions = context.lexicalTailAbsorptions ?? [];
    cur.advance(operatorIndex + 1 - cur.pos);
    return {
      kind: "operator",
      family: "benefactive",
      span: [cursor, operatorIndex + 1],
      payload: {
        family: "benefactive",
        incomingConnective: connector.surface,
        connectorSpan: [cursor, operatorIndex],
        sourceSurface: operator.surface,
        lexicalTailAbsorptions: absorptions
      }
    };
  }

  return undefined;
}

function parseDirectOperator(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  context: PostVerbParserContext
): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const token = tokens[cursor];
  if (token === undefined || cursor >= cur.end) {
    return undefined;
  }
  const family = directOperatorFamily(tokens, cursor);
  if (family !== undefined && family !== "benefactive") {
    const teAru = family === "te_aru" ? teAruPayloadFromContext(context) : null;
    cur.advance(1);
    return {
      kind: "operator",
      family,
      span: [cursor, cursor + 1],
      payload: {
        family,
        sourceSurface: token.surface,
        ...(teAru === null ? {} : {
          state: teAru.state,
          renderStrategy: teAru.renderStrategy,
          familyPayload: teAru
        })
      }
    };
  }
  if (family === "benefactive") {
    cur.advance(1);
    return {
      kind: "operator",
      family: "benefactive",
      span: [cursor, cursor + 1],
      payload: {
        family: "benefactive",
        sourceSurface: token.surface,
        lexicalTailAbsorptions: context.lexicalTailAbsorptions ?? []
      }
    };
  }
  return undefined;
}

function parseNegativeDesiderativeRequest(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const negative = tokens[cursor];
  if (
    negative === undefined ||
    !(
      (negative.pos & POS4) === 助動詞_ナイ ||
      (negative.pos & POS4) === 助動詞_ヌ ||
      ["ない", "無い", "ぬ"].includes(negative.dictionaryForm || negative.surface)
    )
  ) {
    return undefined;
  }
  const connectorIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
  const connector = tokens[connectorIdx];
  if (connectorIdx >= cur.end || connector === undefined || !isTeConnectiveToken(connector) || connector.surface.charAt(0) !== "で" || !isConnector(connector)) {
    return undefined;
  }
  const desireResult = cur.lookahead(connectorIdx - cur.pos, (c) => {
    const parsed = parseDesiderativeRequest(tokens, c);
    if (parsed === undefined || parsed.kind !== "operator") {
      return undefined;
    }
    const payload = parsed.payload.familyPayload;
    if (payload === undefined || payload === null || !isDesiderativePayload(payload)) {
      return undefined;
    }
    return { parsed, payload, endPos: c.pos };
  });
  if (desireResult === undefined) {
    return undefined;
  }
  cur.advance(desireResult.endPos - cur.pos);
  return {
    ...desireResult.parsed,
    span: [cursor, cur.pos],
    payload: {
      ...desireResult.parsed.payload,
      familyPayload: {
        ...desireResult.payload,
        desiredPredicateNegative: true
      }
    }
  };
}

function parseDesiderativeRequest(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const connector = tokens[cursor];
  const desireIndex = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
  const desire = tokens[desireIndex];
  if (connector === undefined || desire === undefined || !isConnector(connector) || (desire.pos & POS0) !== 形容詞0 || !["ほしい", "欲しい"].includes(desire.dictionaryForm || desire.surface)) {
    return undefined;
  }

  let desireNegative = false;
  let auxTokens: readonly PostVerbToken[];
  let auxEndPos = desireIndex + 1;
  const form = desire.pos & POS5;
  if ((form & POS5A) === 終止形_ || (form & POS5A) === 連体形_ || form === 連用形_促音便) {
    const result = cur.lookahead(desireIndex + 1 - cur.pos, (auxCur) => {
      const collected = collectDesireAux(tokens, auxCur);
      return { collected, endPos: auxCur.pos };
    });
    auxTokens = result.collected;
    auxEndPos = result.endPos;
  } else if ((form & POS5A) === 仮定形_) {
    auxTokens = [];
  } else if ((form & POS5A) === 連用形_) {
    const negativeIndex = (nextNonSpaceIndex(tokens, desireIndex + 1, cur.end) ?? cur.end);
    const negative = tokens[negativeIndex];
    if (negative !== undefined && (negative.pos & POS0) === 形容詞0 && ["ない", "無い"].includes(negative.dictionaryForm || negative.surface)) {
      desireNegative = true;
      const negResult = cur.lookahead(negativeIndex + 1 - cur.pos, (negAuxCur) => {
        const collected = collectDesireAux(tokens, negAuxCur);
        return { collected, endPos: negAuxCur.pos };
      });
      auxTokens = (negative.pos & POS5) === 連用形_促音便 ? [negative, ...negResult.collected] : negResult.collected;
      auxEndPos = negResult.endPos;
    } else if (negative !== undefined && (negative.pos & POS0) === 動詞 && (negative.dictionaryForm || negative.surface) === "ある") {
      const negResult = cur.lookahead(negativeIndex + 1 - cur.pos, (negAuxCur) => {
        const collected = collectDesireAux(tokens, negAuxCur);
        return { collected, endPos: negAuxCur.pos };
      });
      if (!auxHasNegation(negResult.collected)) {
        return undefined;
      }
      desireNegative = true;
      auxTokens = negResult.collected;
      auxEndPos = negResult.endPos;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
  const conditional = auxTokens.some((token) => (token.dictionaryForm || token.surface) === "た" && (token.pos & POS5A) === 仮定形_);
  let desirePast = auxTokens.some((token) => (token.dictionaryForm || token.surface) === "た" && (token.pos & POS5A) !== 仮定形_);
  if (form === 連用形_促音便) {
    desirePast ||= !conditional;
  }
  const polite = auxHasPolite(auxTokens);

  const familyPayload: DesiderativeFamilyPayload = {
    kind: "hoshii",
    desireNegative,
    desirePast: conditional ? false : desirePast,
    polite,
    conditional,
    desiredPredicateNegative: false
  };
  cur.advance(auxEndPos - cur.pos);
  return {
    kind: "operator",
    family: "desiderative_request",
    span: [cursor, cur.pos],
    payload: {
      family: "desiderative_request",
      incomingConnective: connector.surface,
      connectorSpan: [cursor, desireIndex],
      sourceSurface: desire.surface,
      familyPayload
    }
  };
}

function eventFromPostAuxSeed(
  tokens: readonly PostVerbToken[],
  seed: PostAuxSeed,
  cur: PVCursor,
  context: PostVerbParserContext
): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const payload = seed.payload;
  if (cursor !== seed.span[0] || seed.span[1] > cur.end) {
    return undefined;
  }
  if (seed.kind === "te_kudasai") {
    const connector = tokens[cursor];
    if (connector === undefined || !isConnector(connector)) {
      return undefined;
    }
    const tailIndex = (nextNonSpaceIndex(tokens, cursor + 1, seed.span[1]) ?? seed.span[1]);
    const tail = tokens[tailIndex];
    if (tail === undefined || tailIndex >= seed.span[1]) {
      return undefined;
    }
    const polite = payload?.polite ?? true;
    const familyPayload: RequestFamilyPayload = {
      kind: polite ? "kudasai" : "chodai",
      register: polite ? "polite" : "colloquial",
      polite
    };
    cur.advance(seed.span[1] - cur.pos);
    return {
      kind: "operator",
      family: "request",
      span: seed.span,
      payload: {
        family: "request",
        incomingConnective: connector.surface,
        connectorSpan: [cursor, tailIndex],
        sourceSurface: tail.surface,
        lexicalTailAbsorptions: context.lexicalTailAbsorptions ?? [],
        familyPayload
      }
    };
  }
  if (seed.kind === "te_hoshii" || seed.kind === "benefactive_tai") {
    if (seed.kind === "benefactive_tai") {
      const tai = tokens[cursor];
      if (tai === undefined || (tai.pos & POS4) !== 助動詞_タイ) {
        return undefined;
      }
    } else {
      const seedResult = cur.tryParse((c) => {
        const parsed = parseDesiderativeRequest(tokens, c);
        if (parsed === undefined || parsed.kind !== "operator" || parsed.span[0] !== seed.span[0] || parsed.span[1] !== seed.span[1]) {
          return undefined;
        }
        const parsedPayload = parsed.payload.familyPayload;
        if (parsedPayload === undefined || parsedPayload === null || !isDesiderativePayload(parsedPayload)) {
          return undefined;
        }
        return { parsed, parsedPayload };
      });
      if (seedResult === undefined) {
        return undefined;
      }
      const seedPayload = seed.payload;
      const familyPayload: DesiderativeFamilyPayload = {
        ...seedResult.parsedPayload,
        desiredPredicateNegative: seedPayload?.desiredPredicateNegative ?? seedResult.parsedPayload.desiredPredicateNegative,
        desireNegative: seedPayload?.desireNegative ?? seedResult.parsedPayload.desireNegative,
        desirePast: seedPayload?.desirePast ?? seedResult.parsedPayload.desirePast,
        polite: seedPayload?.polite ?? seedResult.parsedPayload.polite,
        conditional: (seedPayload as (PostAuxSeedPayload & { readonly conditional?: boolean }) | null | undefined)?.conditional ?? seedResult.parsedPayload.conditional
      };
      return {
        ...seedResult.parsed,
        payload: {
          ...seedResult.parsed.payload,
          familyPayload
        }
      };
    }
    const kind = payload?.kind;
    if (kind === undefined) {
      return undefined;
    }
    const desireNegative = payload?.desireNegative ?? false;
    const desirePast = payload?.desirePast ?? false;
    const polite = payload?.polite ?? false;
    const desiredPredicateNegative = payload?.desiredPredicateNegative ?? false;
    const conditional = (payload as (PostAuxSeedPayload & { readonly conditional?: boolean }) | null | undefined)?.conditional ?? false;
    const familyPayload: DesiderativeFamilyPayload = {
      kind,
      desireNegative,
      desirePast,
      polite,
      conditional,
      desiredPredicateNegative
    };
    const consumedEnd = seed.span[1] > cursor ? seed.span[1] : cursor + Math.max(seed.span[1] - seed.span[0], 1);
    cur.advance(consumedEnd - cur.pos);
    return {
      kind: "operator",
      family: "desiderative_request",
      span: seed.span,
      payload: {
        family: "desiderative_request",
        sourceSurface: tokens[cursor]?.surface ?? null,
        familyPayload
      }
    };
  }
  if (tokens[cursor] === undefined) {
    return undefined;
  }
  return undefined;
}

function collectDesireAux(tokens: readonly PostVerbToken[], cur: PVCursor): readonly PostVerbToken[] {
  const collected: PostVerbToken[] = [];
  while (cur.pos < cur.end && (tokens[cur.pos]!.pos & POS0) === 助動詞) {
    const token = tokens[cur.pos]!;
    if ((token.pos & POS4) === 助動詞_タ) {
      collected.push(token);
      cur.advance();
      continue;
    }
    if (((token.pos & POS4) === 助動詞_マス || (token.pos & POS4) === 助動詞_デス) && (token.pos & POS5A) !== 意志推量形_) {
      collected.push(token);
      cur.advance();
      continue;
    }
    if ((token.pos & POS4) === 助動詞_ヌ && collected.length > 0) {
      collected.push(token);
      cur.advance();
      continue;
    }
    break;
  }
  return collected;
}


function parseTerminalKind(tokens: readonly PostVerbToken[], cur: PVCursor, lookups: LookupTables): PostVerbEvent | undefined {
  return parseModalTerminal(tokens, cur, lookups) ??
    parseLikenessTerminal(tokens, cur, lookups) ??
    parseAuxConnectiveTerminal(tokens, cur, lookups) ??
    parseNodaTerminal(tokens, cur) ??
    parseSimpleTerminal(tokens, cur);
}

function parseModalTerminal(tokens: readonly PostVerbToken[], cur: PVCursor, lookups: LookupTables): PostVerbEvent | undefined {
  const cursor = cur.pos;
  return cur.tryParse((cur) => {
    const auxTokens: PostVerbToken[] = [];
    let current = cur.pos;
    while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞) {
      const token = tokens[current]!;
      if (((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス) && (token.pos & POS5A) === 意志推量形_) {
        const nextIdx = (nextNonSpaceIndex(tokens, current + 1, cur.end) ?? cur.end);
        let end = current + 1;
        let connective: string | null = null;
        if (
          nextIdx < cur.end &&
          ["が", "けど", "けれど"].includes(tokens[nextIdx]?.surface ?? "") &&
          (tokens[nextIdx]!.pos & POS1) === 接続助詞
        ) {
          connective = "지만";
          end = nextIdx + 1;
          if (tokens[nextIdx]?.surface === "けど" || tokens[nextIdx]?.surface === "けれど") {
            const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
            if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
              end = maybeMo + 1;
            }
          }
        } else if (nextIdx < cur.end && (tokens[nextIdx]!.pos & POS0) !== 補助記号) {
          return undefined;
        }
        cur.advance(end - cur.pos);
        return {
          kind: "terminal" as const,
          family: "modal",
          span: [cursor, end] as Span,
          payload: {
            kind: "modal",
            auxTokens: [...auxTokens, token],
            connective,
            modal: "darou",
            register: (token.pos & POS4) === 助動詞_デス ? "polite" : null
          }
        };
      }
      if (["た", "ない", "無い", "ぬ"].includes(token.dictionaryForm || token.surface) || ["なかっ", "ん"].includes(token.surface)) {
        auxTokens.push(token);
        current += 1;
        continue;
      }
      break;
    }
    const kamoIdx = current;
    const likenessFromAux = parseLikenessTerminalAt(tokens, kamoIdx, cur, cursor, auxTokens, lookups);
    if (likenessFromAux !== undefined) {
      return likenessFromAux;
    }
    const kaNoYou = cur.lookahead(kamoIdx - cur.pos, matchKaNoYouStart);
    if (kaNoYou !== null) {
      const fromKaNoYou = parseLikenessTerminalAt(tokens, kaNoYou, cur, cursor, auxTokens, lookups, true);
      if (fromKaNoYou !== undefined) {
        return fromKaNoYou;
      }
    }
    if (
      kamoIdx + 2 < cur.end &&
      isPostVerbKaMarker(tokens, kamoIdx) &&
      tokens[kamoIdx + 1]?.surface === "も" &&
      (tokens[kamoIdx + 1]!.pos & POS0) === 助詞 &&
      ["しれる", "知れる"].includes(tokens[kamoIdx + 2]?.dictionaryForm || tokens[kamoIdx + 2]?.surface || "")
    ) {
      let modalCurrent = kamoIdx + 3;
      const modalAux: PostVerbToken[] = [];
      while (modalCurrent < cur.end && ((tokens[modalCurrent]?.pos ?? 0) & POS0) === 助動詞) {
        modalAux.push(tokens[modalCurrent]!);
        modalCurrent += 1;
      }
      cur.advance(modalCurrent - cur.pos);
      return {
        kind: "terminal" as const,
        family: "modal",
        span: [cursor, modalCurrent] as Span,
        payload: {
          kind: "modal",
          auxTokens,
          modal: "kamo",
          tense: modalAux.some((token) => (token.dictionaryForm || token.surface) === "た") ? "past" : null,
          polarity: auxTokens.some((token) => ["ない", "無い", "ぬ"].includes(token.dictionaryForm || token.surface)) ? "negative" : null,
          register: modalAux.some((token) => ["ます", "です"].includes(token.dictionaryForm || token.surface)) ? "polite" : null
        }
      };
    }
    return undefined;
  });
}

function parseSimpleTerminal(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const token = tokens[cursor];
  if (token === undefined || cursor >= cur.end) {
    return undefined;
  }
  if ((token.surface === "ば" && (token.pos & POS0) === 助詞) || token.surface === "たら" || token.surface === "なら" || token.surface === "れば" || (token.dictionaryForm || token.surface) === "なら") {
    cur.advance(1);
    return {
      kind: "terminal",
      family: "conditional",
      span: [cursor, cursor + 1],
      payload: { kind: "conditional" }
    };
  }
  if (["が", "けど", "けれど"].includes(token.surface) && (token.pos & POS1) === 接続助詞) {
    let end = cursor + 1;
    if (token.surface === "けど" || token.surface === "けれど") {
      const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
      if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
        end = maybeMo + 1;
      }
    }
    cur.advance(end - cur.pos);
    return {
      kind: "terminal",
      family: "concessive",
      span: [cursor, end],
      payload: { kind: "concessive", connective: "지만" }
    };
  }
  if (isPostVerbKaMarker(tokens, cursor)) {
    cur.advance(1);
    return {
      kind: "terminal",
      family: "question",
      span: [cursor, cursor + 1],
      payload: { kind: "question" }
    };
  }
  if (token.surface === "ましょう" || token.surface === "ましょうか") {
    let end = cursor + 1;
    let sfp: string | null = token.surface.endsWith("か") ? "か" : null;
    const nextIdx = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
    if (sfp === null && nextIdx < cur.end && isPostVerbKaMarker(tokens, nextIdx)) {
      sfp = "か";
      end = nextIdx + 1;
    }
    cur.advance(end - cur.pos);
    return {
      kind: "terminal",
      family: "hortative",
      span: [cursor, end],
      payload: { kind: "hortative", sfp, register: "polite" }
    };
  }
  if (token.surface === "まし" && (token.dictionaryForm || token.surface) === "ます") {
    const nextIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
    if (nextIdx < cur.end && tokens[nextIdx]?.surface === "た" && (tokens[nextIdx].pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ)) {
      const afterTa = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
      if (afterTa < cur.end && isPostVerbKaMarker(tokens, afterTa)) {
        cur.advance(afterTa + 1 - cur.pos);
        return {
          kind: "terminal",
          family: "question",
          span: [cursor, afterTa + 1],
          payload: { kind: "question", tense: "past", register: "polite" }
        };
      }
      cur.advance(nextIdx + 1 - cur.pos);
      return {
        kind: "terminal",
        family: "declarative_polite",
        span: [cursor, nextIdx + 1],
        payload: { kind: "declarative_polite", tense: "past", register: "polite" }
      };
    }
    if (nextIdx < cur.end && isPostVerbBareTeConnectiveAt(tokens, nextIdx)) {
      cur.advance(nextIdx + 1 - cur.pos);
      return {
        kind: "terminal",
        family: "gerund",
        span: [cursor, nextIdx + 1],
        payload: { kind: "gerund", register: "polite" }
      };
    }
  }
  if (token.surface === "ます" || token.surface === "ました" || token.surface === "です") {
    const nextIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
    if (nextIdx < cur.end && isPostVerbKaMarker(tokens, nextIdx)) {
      cur.advance(nextIdx + 1 - cur.pos);
      return {
        kind: "terminal",
        family: "question",
        span: [cursor, nextIdx + 1],
        payload: { kind: "question", tense: token.surface === "ました" ? "past" : null, register: "polite" }
      };
    }
    cur.advance(1);
    return {
      kind: "terminal",
      family: "declarative_polite",
      span: [cursor, cursor + 1],
      payload: { kind: "declarative_polite", tense: token.surface === "ました" ? "past" : null, register: "polite" }
    };
  }
  if (token.surface === "ません" || token.surface === "ませ") {
    let nextIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
    let end = cursor + 1;
    let tense: string | null = null;
    if (token.surface === "ませ" && (nextIdx >= cur.end || tokens[nextIdx]?.surface !== "ん")) {
      cur.advance(1);
      return {
        kind: "terminal",
        family: "polite_imperative",
        span: [cursor, cursor + 1],
        payload: { kind: "polite_imperative", register: "polite" }
      };
    }
    if (token.surface === "ませ" && nextIdx < cur.end && tokens[nextIdx]?.surface === "ん") {
      end = nextIdx + 1;
      nextIdx = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
    }
    if (nextIdx < cur.end && tokens[nextIdx]?.surface === "でした") {
      tense = "past";
      end = nextIdx + 1;
      nextIdx = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
    } else if (nextIdx + 1 < cur.end && tokens[nextIdx]?.surface === "でし" && tokens[nextIdx + 1]?.surface === "た") {
      tense = "past";
      end = nextIdx + 2;
      nextIdx = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
    }
    if (nextIdx < cur.end && isPostVerbKaMarker(tokens, nextIdx)) {
      end = nextIdx + 1;
      cur.advance(end - cur.pos);
      return {
        kind: "terminal",
        family: "question",
        span: [cursor, end],
        payload: { kind: "question", polarity: "negative", tense, register: "polite" }
      };
    }
    cur.advance(end - cur.pos);
    return {
      kind: "terminal",
      family: "declarative_polite",
      span: [cursor, end],
      payload: { kind: "declarative_polite", polarity: "negative", tense, register: "polite" }
    };
  }
  if (["ない", "無い"].includes(token.dictionaryForm || token.surface)) {
    const nextIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
    if (nextIdx < cur.end && tokens[nextIdx]?.surface === "です") {
      const maybeKa = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
      if (maybeKa < cur.end && isPostVerbKaMarker(tokens, maybeKa)) {
        cur.advance(maybeKa + 1 - cur.pos);
        return {
          kind: "terminal",
          family: "question",
          span: [cursor, maybeKa + 1],
          payload: { kind: "question", polarity: "negative", register: "polite" }
        };
      }
    }
  }
  if (isTeConnectiveToken(token) || token.surface === "まして") {
    cur.advance(1);
    return {
      kind: "terminal",
      family: "gerund",
      span: [cursor, cursor + 1],
      payload: { kind: "gerund" }
    };
  }
  return undefined;
}

function isPostVerbKaMarker(tokens: readonly PostVerbToken[], index: number): boolean {
  return kaMarkerRelationForToken(tokens[index], index, ["postverb_chain"], {
    acceptedParticleSubtypes: ["副助詞", "終助詞", "係助詞"]
  }) !== null;
}

function isPostVerbTerminalKaMarker(tokens: readonly PostVerbToken[], index: number): boolean {
  return kaMarkerRelationAt(tokens, index, ["postverb_chain"])?.particleSubtype1 === 終助詞;
}

function consumeNodaNoKaNegativeConfirmTail(
  tokens: readonly PostVerbToken[],
  cursor: number,
  end: number
): number | null {
  const match = matchNodaNoKaNegativeConfirmTerminalTail(tokens, cursor, end, {
    consumers: ["postverb_chain"],
    nominalizerRequirement: "postverb_chain_marker",
    requireTerminalNo: true
  });
  return match?.contentEndExclusive ?? null;
}

function isPostVerbBareTeConnectiveAt(tokens: readonly PostVerbToken[], index: number): boolean {
  return matchTeConnectiveHeadAt(tokens, index)?.markerSurface === "て";
}

function postVerbQuoteMarkerRelationAt(
  cursor: TokenCursor<PostVerbToken>,
  index: number,
  lookups: LookupTables
): QuoteMarkerRelation | null {
  const { tokens, end } = cursor;
  if (index >= end) {
    return null;
  }
  const relation = quoteMarkerRelationAt(tokens, index, { consumers: ["postverb_chain"] });
  if (relation?.canonicalSurface === "と" || relation?.canonicalSurface === "って") {
    return relation;
  }
  const runtimeTokens = postVerbTokensToRuntime(tokens);
  const runtimeCursor = cursor.retarget(runtimeTokens, index, end, index);
  if (classifyDatteMarkerAt(runtimeCursor, lookups).isQuote) {
    return datteQuoteMarkerRelationAt(tokens, index, { consumers: ["postverb_chain"] });
  }
  return null;
}

function isPostVerbQuoteMarker(cursor: TokenCursor<PostVerbToken>, index: number, lookups: LookupTables): boolean {
  return postVerbQuoteMarkerRelationAt(cursor, index, lookups) !== null;
}

function parseLikenessTerminal(tokens: readonly PostVerbToken[], cur: PVCursor, lookups: LookupTables): PostVerbEvent | undefined {
  return parseLikenessTerminalAt(tokens, cur.pos, cur, cur.pos, [], lookups, true);
}

function parseLikenessTerminalAt(
  tokens: readonly PostVerbToken[],
  modalIndex: number,
  cur: PVCursor,
  spanStart: number,
  preAuxTokens: readonly PostVerbToken[],
  lookups: LookupTables,
  allowDatteParticleTerminal = false
): PostVerbEvent | undefined {
  const modalToken = tokens[modalIndex];
  if (modalToken === undefined || modalIndex >= cur.end || (modalToken.pos & POS0) !== 形状詞 || (modalToken.surface !== "よう" && modalToken.surface !== "みたい")) {
    return undefined;
  }
  const auxCursor = cur.fork(modalIndex + 1, cur.end, modalIndex + 1);
  const auxTokens: PostVerbToken[] = [];
  while (auxCursor.currentIs((token) => (token.pos & POS0) === 助動詞)) {
    auxTokens.push(auxCursor.current()!);
    auxCursor.advance();
  }
  let pos = auxCursor.pos;
  const initialPos = pos;
  const modal = modalToken.surface === "みたい" ? "mitai" : "yoda";
  let connective: string | null = null;
  const familyPayload: LikenessFamilyPayload = {
    kind: "noda",
    pre_aux_tokens: preAuxTokens,
    modal_aux_tokens: auxTokens
  };
  const nextIdx = (nextNonSpaceIndex(tokens, pos, cur.end) ?? cur.end);
  const next = tokens[nextIdx];
  const lastModalAux = auxTokens.at(-1);
  let terminalFamilyPayload: LikenessFamilyPayload = {};
  if (
    lastModalAux !== undefined &&
    (
      copulaDeMarkerRelationForToken(lastModalAux, -1, { consumers: ["postverb_chain"] }) !== null ||
      lastModalAux.surface === "じゃ"
    ) &&
    ((lastModalAux.pos & POS4) === 助動詞_ダ || (lastModalAux.pos & POS4) === 助動詞_デス) &&
    (lastModalAux.pos & POS5A) === 連用形_
  ) {
    const contResult = cur.lookahead(nextIdx - cur.pos, (contCur) => {
      const continuation = parseLikenessCopulaContinuation(tokens, contCur);
      if (continuation !== null) {
        Object.assign(familyPayload, continuation.payload);
        consumeLikenessOuterConnective(tokens, contCur, familyPayload);
        return { endPos: contCur.pos, connective: continuation.terminalConnectiveOverride ?? null };
      }
      return null;
    });
    if (contResult !== null) {
      pos = contResult.endPos;
      connective = contResult.connective;
    } else {
      connective = "아/어서";
    }
  }
  if (pos === initialPos && next !== undefined && nextIdx < cur.end) {
    if ((next.surface === "が" || next.surface === "けど" || next.surface === "けれど") && (next.pos & POS1) === 接続助詞) {
      connective = "지만";
      pos = nextIdx + 1;
      if (next.surface === "けど" || next.surface === "けれど") {
        const maybeMo = (nextNonSpaceIndex(tokens, pos, cur.end) ?? cur.end);
        if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
          pos = maybeMo + 1;
        }
      }
    } else if (isPostVerbCaseParticleToken(next, nextIdx, "から", ["接続助詞"])) {
      connective = "(으)니까";
      pos = nextIdx + 1;
    } else {
      const subResult = cur.lookahead(nextIdx - cur.pos, (subCur) => {
        const pointReason = consumeLikenessPointReason(tokens, subCur);
        const tameReason = pointReason === null ? consumeLikenessTameReason(tokens, subCur) : null;
        const nominal = pointReason === null && tameReason === null ? consumeLikenessNominalConnective(tokens, subCur) : null;
        return { pointReason, tameReason, nominal, endPos: subCur.pos };
      });
      const { pointReason, tameReason, nominal } = subResult;
      if (pointReason !== null) {
        connective = pointReason.connective;
        pos = subResult.endPos;
        terminalFamilyPayload = { connective_suffix: pointReason.suffix };
      } else if (tameReason !== null) {
        connective = tameReason.connective;
        pos = subResult.endPos;
        terminalFamilyPayload = { connective_suffix: tameReason.suffix };
      } else if (allowDatteParticleTerminal && next.surface === "だって" && classifyDatteMarkerAt(cur.retarget(postVerbTokensToRuntime(tokens), nextIdx, cur.end, nextIdx), lookups).role === "focus_particle") {
        const afterDatte = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
        if (afterDatte < cur.end && tokens[afterDatte] !== undefined && (tokens[afterDatte].pos & POS0) !== 補助記号 && (tokens[afterDatte].pos & POS0) !== 記号) {
          return undefined;
        }
        connective = "아/어";
        pos = nextIdx + 1;
        terminalFamilyPayload = { connective_suffix: "도" };
      } else if (
        lastModalAux !== undefined &&
        ((lastModalAux.pos & POS4) === 助動詞_ダ || (lastModalAux.pos & POS4) === 助動詞_デス) &&
        (lastModalAux.pos & POS5A) === 連体形_ &&
        (pos0in(next.pos, NOMINAL_BITS))
      ) {
        connective = "ㄴ/은";
      } else if (nominal !== null) {
        connective = nominal.connective;
        pos = subResult.endPos;
        if (nominal.suffix !== null) {
          terminalFamilyPayload = { connective_suffix: nominal.suffix };
        }
        if (connective === "아/어서") {
          const maybeDe = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
          const afterDe = (nextNonSpaceIndex(tokens, maybeDe + 1, cur.end) ?? cur.end);
          const contResult = cur.lookahead(afterDe - cur.pos, (contCur) => {
            const continuation = parseLikenessCopulaContinuation(tokens, contCur);
            if (continuation !== null) {
              Object.assign(familyPayload, continuation.payload);
              consumeLikenessOuterConnective(tokens, contCur, familyPayload);
              return { endPos: contCur.pos, connective: continuation.terminalConnectiveOverride ?? null };
            }
            return null;
          });
          if (contResult !== null) {
            pos = contResult.endPos;
            connective = contResult.connective;
          }
        }
      } else if (followsExternalLikenessNominalizer(tokens, nextIdx, cur.end)) {
        connective = "ㄴ/은";
        familyPayload.external_nominalizer_connective = "ㄴ/은";
      } else if ((next.pos & POS0) !== 補助記号 && (next.pos & POS0) !== 記号 && !isPostVerbQuoteMarker(cur, nextIdx, lookups) && connective === null) {
        return undefined;
      }
    }
  }
  cur.advance(pos - cur.pos);
  return {
    kind: "terminal",
    family: "modal",
    span: [spanStart, cur.pos],
    payload: {
      kind: "modal",
      auxTokens: preAuxTokens,
      modal,
      connective,
      familyPayload: { ...terminalFamilyPayload, ...familyPayload }
    }
  };
}

function parseLikenessCopulaContinuation(
  tokens: readonly PostVerbToken[],
  cur: PVCursor
): { readonly payload: LikenessFamilyPayload; readonly terminalConnectiveOverride?: string | null } | null {
  let current = cur.pos;
  let focus: string | null = null;
  if (current < cur.end && (tokens[current]?.surface === "は" || tokens[current]?.surface === "も")) {
    focus = tokens[current]?.surface ?? null;
    current = (nextNonSpaceIndex(tokens, current + 1, cur.end) ?? cur.end);
  }
  const negResult = cur.lookahead(current - cur.pos, (negCur) => {
    const negative = consumeLikenessNegativeContinuation(tokens, negCur);
    if (negative === null) return null;
    return { negative, endPos: negCur.pos };
  });
  if (negResult !== null) {
    let terminalConnectiveOverride: string | null = null;
    const maybeQuestion = (nextNonSpaceIndex(tokens, negResult.endPos, cur.end) ?? cur.end);
    if (maybeQuestion < cur.end && isPostVerbTerminalKaMarker(tokens, maybeQuestion)) {
      terminalConnectiveOverride = "는지";
      cur.advance(maybeQuestion + 1 - cur.pos);
    } else {
      cur.advance(negResult.endPos - cur.pos);
    }
    return {
      payload: {
        likeness_copula_continuation: "negative",
        focus_particle: focus,
        continuation_aux_tokens: negResult.negative.tokens
      },
      terminalConnectiveOverride
    };
  }
  const token = tokens[current];
  if (
    token === undefined ||
    !(
      ["ある", "有る", "ござる"].includes(token.dictionaryForm || token.surface) ||
      ["ある", "あり", "あっ", "ござい", "ござっ"].includes(token.surface)
    )
  ) {
    return null;
  }
  const continuationAux: PostVerbToken[] = [];
  let auxEnd = current + 1;
  while (auxEnd < cur.end && ((tokens[auxEnd]?.pos ?? 0) & POS0) === 助動詞) {
    continuationAux.push(tokens[auxEnd]!);
    auxEnd += 1;
  }
  cur.advance(auxEnd - cur.pos);
  return {
    payload: {
      likeness_copula_continuation: focus === "も" ? "additive" : "emphasis",
      focus_particle: focus,
      continuation_aux_tokens: continuationAux
    }
  };
}

function consumeLikenessNegativeContinuation(tokens: readonly PostVerbToken[], cur: PVCursor): { readonly tokens: readonly PostVerbToken[] } | null {
  const token = tokens[cur.pos];
  if (token === undefined || cur.pos >= cur.end) {
    return null;
  }
  if ((token.pos & POS0) === 形容詞0 && ((token.dictionaryForm || token.surface) === "ない" || (token.dictionaryForm || token.surface) === "無い")) {
    const aux = [token];
    let current = cur.pos + 1;
    while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞) {
      aux.push(tokens[current]!);
      current += 1;
    }
    cur.advance(current - cur.pos);
    return { tokens: aux };
  }
  return cur.tx((cur) => {
    const token = tokens[cur.pos]!;
    if ((token.pos & POS0) === 動詞 && ["ある", "有る", "ござる"].includes(token.dictionaryForm || token.surface)) {
      const aux = [token];
      let current = cur.pos + 1;
      while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞) {
        aux.push(tokens[current]!);
        current += 1;
      }
      if (auxHasNegation(aux)) {
        cur.advance(current - cur.pos);
        return { tokens: aux };
      }
    }
    return null;
  });
}

function consumeLikenessOuterConnective(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  familyPayload: LikenessFamilyPayload
): void {
  const nextIdx = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  if (
    nextIdx < cur.end &&
    ["が", "けど", "けれど"].includes(tokens[nextIdx]?.surface ?? "") &&
    (tokens[nextIdx]!.pos & POS1) === 接続助詞
  ) {
    familyPayload.continuation_connective = "지만";
    let end = nextIdx + 1;
    if (tokens[nextIdx]?.surface === "けど" || tokens[nextIdx]?.surface === "けれど") {
      const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
      if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
        end = maybeMo + 1;
      }
    }
    cur.advance(end - cur.pos);
    return;
  }
  if (isPostVerbCaseParticle(tokens, nextIdx, "から", ["接続助詞"])) {
    familyPayload.continuation_connective = "(으)니까";
    cur.advance(nextIdx + 1 - cur.pos);
    return;
  }
  const subResult = cur.lookahead(nextIdx - cur.pos, (subCur) => {
    const pointReason = consumeLikenessPointReason(tokens, subCur);
    const tameReason = pointReason === null ? consumeLikenessTameReason(tokens, subCur) : null;
    const nominal = pointReason === null && tameReason === null ? consumeLikenessNominalConnective(tokens, subCur) : null;
    return { pointReason, tameReason, nominal, endPos: subCur.pos };
  });
  if (subResult.pointReason !== null) {
    familyPayload.continuation_connective = subResult.pointReason.connective;
    familyPayload.connective_suffix = subResult.pointReason.suffix;
    cur.advance(subResult.endPos - cur.pos);
    return;
  }
  if (subResult.tameReason !== null) {
    familyPayload.continuation_connective = subResult.tameReason.connective;
    familyPayload.connective_suffix = subResult.tameReason.suffix;
    cur.advance(subResult.endPos - cur.pos);
    return;
  }
  if (subResult.nominal !== null) {
    familyPayload.continuation_connective = subResult.nominal.connective;
    if (subResult.nominal.suffix !== null) {
      familyPayload.connective_suffix = subResult.nominal.suffix;
    }
    cur.advance(subResult.endPos - cur.pos);
    return;
  }
  if (followsExternalLikenessNominalizer(tokens, nextIdx, cur.end)) {
    familyPayload.external_nominalizer_connective = "ㄴ/은";
  }
}

function consumeLikenessPointReason(
  tokens: readonly PostVerbToken[],
  cur: PVCursor
): { readonly connective: string; readonly suffix: string } | null {
  const idx = cur.pos;
  if (
    idx + 2 >= cur.end || tokens[idx]?.surface !== "こと" || (tokens[idx].pos & POS0) !== 名詞 || tokens[idx + 1]?.surface !== "も" || (tokens[idx + 1]!.pos & POS0) !== 助詞 || (tokens[idx + 2]!.pos & (POS0 | POS5A)) !== (動詞 | 連用形_)
  ) {
    return null;
  }
  const tailForm = (tokens[idx + 2]!.dictionaryForm || tokens[idx + 2]!.surface);
  if (tailForm === "ある") {
    const afterTail = (nextNonSpaceIndex(tokens, idx + 3, cur.end) ?? cur.end);
    if (afterTail < cur.end && isPostVerbBareTeConnectiveAt(tokens, afterTail)) {
      cur.advance(afterTail + 1 - cur.pos);
      return { connective: "다는", suffix: " 점도 있어서" };
    }
    cur.advance(idx + 3 - cur.pos);
    return { connective: "다는", suffix: " 점도 있고" };
  }
  if (tailForm === "手伝う") {
    const afterTail = (nextNonSpaceIndex(tokens, idx + 3, cur.end) ?? cur.end);
    if (afterTail < cur.end && isPostVerbBareTeConnectiveAt(tokens, afterTail)) {
      cur.advance(afterTail + 1 - cur.pos);
      return { connective: "다는", suffix: " 점도 있어서" };
    }
  }
  return null;
}

function consumeLikenessTameReason(
  tokens: readonly PostVerbToken[],
  cur: PVCursor
): { readonly connective: string; readonly suffix: string } | null {
  const idx = cur.pos;
  if (idx >= cur.end || (tokens[idx]!.pos & POS0) !== 名詞 || !["ため", "為"].includes(tokens[idx]!.dictionaryForm || tokens[idx]!.surface)) {
    return null;
  }
  let end = idx + 1;
  let afterHead = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
  if (isPostVerbCaseParticle(tokens, afterHead, "に")) {
    end = afterHead + 1;
    afterHead = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
  }
  if (afterHead < cur.end && (tokens[afterHead]!.pos & POS0) !== 補助記号 && (tokens[afterHead]!.pos & POS0) !== 記号) {
    return null;
  }
  cur.advance(end - cur.pos);
  return { connective: "기", suffix: " 때문에" };
}

function consumeLikenessNominalConnective(
  tokens: readonly PostVerbToken[],
  cur: PVCursor
): { readonly connective: string; readonly suffix: string | null } | null {
  const idx = cur.pos;
  if (idx >= cur.end || !isPostVerbNoNominalizer(tokens, idx)) {
    return null;
  }
  const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, cur.end) ?? cur.end);
  const next = tokens[nextIdx];
  if (next === undefined || nextIdx >= cur.end) {
    return null;
  }
  if (copulaDeMarkerRelationForToken(next, nextIdx, { consumers: ["postverb_chain"] }) !== null && (next.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)) {
    cur.advance(nextIdx + 1 - cur.pos);
    return { connective: "아/어서", suffix: null };
  }
  if ((next.surface === "に比べ" || next.surface === "に比べて") && (next.pos & POS0) === 助詞) {
    cur.advance(nextIdx + 1 - cur.pos);
    return { connective: "ㄴ/은", suffix: " 데 비해" };
  }
  if (next.surface === "にもかかわらず" && (next.pos & POS0) === 助詞) {
    cur.advance(nextIdx + 1 - cur.pos);
    return { connective: "는데", suffix: "도" };
  }
  if (isPostVerbCaseParticleToken(next, nextIdx, "に", ["格助詞", "接続助詞", "係助詞"])) {
    const afterNi = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
    if (followsLikenessTaisuruNominalModifier(tokens, afterNi, cur.end) || followsLikenessTaisuruPredicate(tokens, afterNi, cur.end)) {
      return null;
    }
    if (afterNi < cur.end && tokens[afterNi]?.surface === "対し" && (tokens[afterNi].dictionaryForm || tokens[afterNi].surface) === "対する" && (tokens[afterNi].pos & (POS0 | POS5A)) === (動詞 | 連用形_)) {
      let consumed = afterNi + 1;
      const maybeTe = (nextNonSpaceIndex(tokens, consumed, cur.end) ?? cur.end);
      if (maybeTe < cur.end && tokens[maybeTe]?.surface === "た" && (tokens[maybeTe].pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ)) {
        return null;
      }
      const teHead = maybeTe < cur.end ? matchTeConnectiveHeadAt(tokens, maybeTe) : null;
      if (teHead !== null) {
        if (teHead.markerSurface === "ては") {
          cur.advance(maybeTe + teHead.consumed - cur.pos);
          return { connective: "ㄴ/은", suffix: " 데 반해서는" };
        }
        if (teHead.markerSurface === "ても") {
          cur.advance(maybeTe + teHead.consumed - cur.pos);
          return { connective: "ㄴ/은", suffix: " 데 반해서도" };
        }
        if (teHead.markerSurface !== "て") {
          cur.advance(consumed - cur.pos);
          return { connective: "ㄴ/은", suffix: " 데 반해" };
        }
        consumed = maybeTe + teHead.consumed;
        cur.advance(consumed - cur.pos);
        return { connective: "ㄴ/은", suffix: " 데 반해" };
      }
      cur.advance(consumed - cur.pos);
      return { connective: "ㄴ/은", suffix: " 데 반해" };
    }
    cur.advance(nextIdx + 1 - cur.pos);
    return { connective: "는데", suffix: null };
  }
  if ((next.surface === "だ" || next.surface === "です") && (next.pos & POS0) === 助動詞 && ((next.pos & POS4) === 助動詞_ダ || (next.pos & POS4) === 助動詞_デス)) {
    const afterDa = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
    if (afterDa < cur.end && ["が", "けど", "けれど"].includes(tokens[afterDa]?.surface ?? "") && (tokens[afterDa]!.pos & POS1) === 接続助詞) {
      let consumed = afterDa + 1;
      if (tokens[afterDa]?.surface === "けど" || tokens[afterDa]?.surface === "けれど") {
        const maybeMo = (nextNonSpaceIndex(tokens, consumed, cur.end) ?? cur.end);
        if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
          consumed = maybeMo + 1;
        }
      }
      cur.advance(consumed - cur.pos);
      return { connective: "는데", suffix: null };
    }
    if (isPostVerbCaseParticle(tokens, afterDa, "から", ["接続助詞"])) {
      cur.advance(afterDa + 1 - cur.pos);
      return { connective: "(으)니까", suffix: null };
    }
  }
  return null;
}

function followsExternalLikenessNominalizer(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end || !isPostVerbNoNominalizer(tokens, idx)) {
    return false;
  }
  const particleIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
  const particle = tokens[particleIdx];
  if (particle === undefined || particleIdx >= end || (particle.pos & POS0) !== 助詞) {
    return false;
  }
  if (
    ["は", "も"].includes(particle.surface) ||
    isPostVerbCaseParticleToken(particle, particleIdx, "を") ||
    isPostVerbCaseParticleToken(particle, particleIdx, "が") ||
    isPostVerbCaseParticleToken(particle, particleIdx, "で")
  ) {
    return true;
  }
  if (isPostVerbCaseParticleToken(particle, particleIdx, "に")) {
    const afterNi = (nextNonSpaceIndex(tokens, particleIdx + 1, end) ?? end);
    return followsLikenessTaisuruNominalModifier(tokens, afterNi, end) || followsLikenessTaisuruPredicate(tokens, afterNi, end);
  }
  return false;
}

function isLikenessAuxiliaryTail(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end) {
    return false;
  }
  const token = tokens[idx]!;
  const form = token.dictionaryForm || token.surface;
  return (
    ((token.pos & POS01) === 動詞_非自立可能 || ["しまう", "みる", "見る", "くる", "来る", "いく", "行く", "おく", "置く", "いる", "居る", "ある", "有る"].includes(form)) ||
    (token.pos & POS0) === 助動詞 ||
    ((token.pos & POS0) === 形容詞0 && (form === "ない" || form === "無い"))
  );
}

function isLikenessAuxiliaryPredicateStart(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end) {
    return false;
  }
  const token = tokens[idx]!;
  const form = token.dictionaryForm || token.surface;
  return (token.pos & POS01) === 動詞_非自立可能 || ["しまう", "みる", "見る", "くる", "来る", "いく", "行く", "おく", "置く", "いる", "居る", "ある", "有る"].includes(form);
}

function isLikenessContractedTeAux(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  return idx < end && (tokens[idx]!.pos & POS0) === 助動詞 && (tokens[idx]!.dictionaryForm || tokens[idx]!.surface) === "てる";
}

function likenessAuxiliaryTailModifiesNoun(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (!isLikenessAuxiliaryTail(tokens, idx, end)) {
    return false;
  }
  let current = idx;
  while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
    current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
  }
  return current < end && (tokens[current]!.pos & (POS0 | POS5A)) === (名詞 | 連体形_);
}

function followsLikenessTaisuruNominalModifier(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end || (tokens[idx]!.dictionaryForm || tokens[idx]!.surface) !== "対する" || (tokens[idx]!.pos & POS0) !== 動詞) {
    return false;
  }
  const token = tokens[idx]!;
  if (token.surface === "対する" && (token.pos & POS5A) === 連体形_) {
    const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
    return nextIdx < end && (tokens[nextIdx]!.pos & POS0) === 名詞;
  }
  if (token.surface === "対し" && (token.pos & POS5A) === 未然形_) {
    const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
    return likenessAuxiliaryTailModifiesNoun(tokens, nextIdx, end);
  }
  if (token.surface !== "対し" || (token.pos & POS5A) !== 連用形_) {
    return false;
  }
  const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
  if (nextIdx < end && tokens[nextIdx]?.surface === "た" && (tokens[nextIdx].pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 連体形_)) {
    const nounIdx = (nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end);
    return nounIdx < end && (tokens[nounIdx]!.pos & POS0) === 名詞;
  }
  if (nextIdx < end && isPostVerbBareTeConnectiveAt(tokens, nextIdx)) {
    const noIdx = (nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end);
    if (noIdx < end && nominalLinkMarkerRelationAt(tokens, noIdx, { consumers: ["postverb_chain"] }) !== null) {
      const nounIdx = (nextNonSpaceIndex(tokens, noIdx + 1, end) ?? end);
      return nounIdx < end && (tokens[nounIdx]!.pos & POS0) === 名詞;
    }
    if (noIdx < end && (tokens[noIdx]?.surface === "は" || tokens[noIdx]?.surface === "も") && (tokens[noIdx].pos & POS0) === 助詞) {
      const afterFocus = (nextNonSpaceIndex(tokens, noIdx + 1, end) ?? end);
      return likenessAuxiliaryTailModifiesNoun(tokens, afterFocus, end);
    }
    const afterTe = (nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end);
    return likenessAuxiliaryTailModifiesNoun(tokens, afterTe, end);
  }
  if (nextIdx < end && tokens[nextIdx]?.surface === "ては" && (tokens[nextIdx].pos & POS1) === 接続助詞) {
    const afterFocus = (nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end);
    return likenessAuxiliaryTailModifiesNoun(tokens, afterFocus, end);
  }
  if (isLikenessContractedTeAux(tokens, nextIdx, end) || isLikenessAuxiliaryTail(tokens, nextIdx, end)) {
    return likenessAuxiliaryTailModifiesNoun(tokens, nextIdx, end);
  }
  return false;
}

function isPostVerbNoNominalizer(tokens: readonly PostVerbToken[], idx: number): boolean {
  return predicateNominalizerRelationForToken(tokens[idx], idx, {
    requirement: "postverb_chain_marker",
    consumers: ["postverb_chain"]
  })?.nominalizerKind === "no";
}

function isLikenessPredicateBoundary(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end) {
    return true;
  }
  const token = tokens[idx]!;
  if ((token.pos & POS0) === 補助記号 || (token.pos & POS0) === 記号 || (token.pos & POS1) === 接続助詞) {
    return true;
  }
  if (predicateNominalizerRelationForToken(token, idx, {
    requirement: "tail_connective_marker",
    consumers: ["postverb_chain"]
  })?.nominalizerKind === "no") {
    const afterNo = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
    if (afterNo >= end) {
      return false;
    }
    const after = tokens[afterNo]!;
    if (caseParticleMarkerRelationForToken(after, afterNo, {
      acceptedSurfaces: ["に", "を", "が"],
      consumers: ["postverb_chain"]
    }) !== null) {
      return true;
    }
    if (topicFocusMarkerRelationForToken(after, afterNo, {
      acceptedSurfaces: ["は", "も"],
      consumers: ["postverb_chain"]
    }) !== null) {
      return true;
    }
    if (copulaDeMarkerRelationForToken(after, afterNo, { consumers: ["postverb_chain"] }) !== null) {
      return true;
    }
    return (after.pos & POS0) === 助動詞 && isCopulaDaOrDesuDictionaryForm(after);
  }
  return false;
}

function followsLikenessTaisuruPredicate(tokens: readonly PostVerbToken[], idx: number, end: number): boolean {
  if (idx >= end || (tokens[idx]!.dictionaryForm || tokens[idx]!.surface) !== "対する" || (tokens[idx]!.pos & POS0) !== 動詞) {
    return false;
  }
  const token = tokens[idx]!;
  if (token.surface === "対する") {
    const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
    if ((token.pos & POS5A) === 連体形_ && nextIdx < end && (tokens[nextIdx]!.pos & POS0) === 名詞) {
      return false;
    }
    return isLikenessPredicateBoundary(tokens, nextIdx, end);
  }
  if (token.surface === "対し" && (token.pos & POS5A) === 未然形_) {
    let current = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
    if (!isLikenessAuxiliaryTail(tokens, current, end)) {
      return false;
    }
    while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
      current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
    }
    return isLikenessPredicateBoundary(tokens, current, end);
  }
  if (token.surface !== "対し" || (token.pos & POS5A) !== 連用形_) {
    return false;
  }
  const nextIdx = (nextNonSpaceIndex(tokens, idx + 1, end) ?? end);
  if (nextIdx < end && tokens[nextIdx]?.surface === "た" && (tokens[nextIdx].pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 終止形_)) {
    return isLikenessPredicateBoundary(tokens, (nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end), end);
  }
  if (isLikenessAuxiliaryTail(tokens, nextIdx, end)) {
    let current = nextIdx;
    while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
      current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
    }
    return isLikenessPredicateBoundary(tokens, current, end);
  }
  const teHead = nextIdx < end ? matchTeConnectiveHeadAt(tokens, nextIdx) : null;
  if (teHead?.markerSurface === "て" || teHead?.markerSurface === "ては" || teHead?.markerSurface === "ても") {
    const afterTe = (nextNonSpaceIndex(tokens, nextIdx + teHead.consumed, end) ?? end);
    if (teHead.markerSurface === "ては" || teHead.markerSurface === "ても") {
      if (likenessAuxiliaryTailModifiesNoun(tokens, afterTe, end)) {
        return true;
      }
      let current = afterTe;
      if (!isLikenessAuxiliaryTail(tokens, current, end)) {
        return false;
      }
      while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
        current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
      }
      return isLikenessPredicateBoundary(tokens, current, end);
    }
    if (!isLikenessAuxiliaryPredicateStart(tokens, afterTe, end)) {
      return false;
    }
    let current = afterTe;
    while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
      current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
    }
    return isLikenessPredicateBoundary(tokens, current, end);
  }
  if (isLikenessContractedTeAux(tokens, nextIdx, end)) {
    let current = nextIdx;
    while (current < end && isLikenessAuxiliaryTail(tokens, current, end)) {
      current = (nextNonSpaceIndex(tokens, current + 1, end) ?? end);
    }
    return isLikenessPredicateBoundary(tokens, current, end);
  }
  return false;
}

function matchKaNoYouStart(cursor: PVCursor): number | null {
  const { tokens, pos, end } = cursor;
  if (
    pos + 2 < end &&
    isPostVerbKaMarker(tokens, pos) &&
    nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["postverb_chain"] }) !== null &&
    tokens[pos + 2]?.surface === "よう" &&
    (tokens[pos + 2]!.pos & POS0) === 形状詞
  ) {
    return pos + 2;
  }
  return null;
}

function parseAuxConnectiveTerminal(tokens: readonly PostVerbToken[], cur: PVCursor, lookups: LookupTables): PostVerbEvent | undefined {
  const cursor = cur.pos;
  return cur.tryParse((cur) => {
    const auxTokens: PostVerbToken[] = [];
    const auxCursor = cur.fork();
    while (auxCursor.currentIs((token) => (token.pos & POS0) === 助動詞)) {
      auxTokens.push(auxCursor.current()!);
      auxCursor.advance();
    }
    const currentCursor = auxCursor.fork();
    const current = currentCursor.pos;
    if (auxTokens.some((token) => (token.pos & POS4) === 助動詞_タイ)) {
      return undefined;
    }
    if (auxTokens.some((token) => (token.pos & (POS4 | POS5A)) === (助動詞_ヌ | 連用形_))) {
      return undefined;
    }
    const makeDeclarativeAuxTerminal = (
      endPos: number,
      options: { readonly hasPolite: boolean; readonly polarity: string | null; readonly tense: string | null; readonly register: string | null }
    ): PostVerbEvent => {
      cur.advance(endPos - cur.pos);
      return {
        kind: "terminal",
        family: options.hasPolite ? "declarative_polite" : "declarative_plain",
        span: [cursor, endPos],
        payload: {
          kind: options.hasPolite ? "declarative_polite" : "declarative_plain",
          auxTokens,
          polarity: options.polarity,
          tense: options.tense,
          register: options.hasPolite ? "polite" : options.register
        }
      };
    };
    const genericDeclarativeAuxTerminal = (): PostVerbEvent | undefined => {
      if (auxTokens.length === 0) {
        return undefined;
      }
      if (["ましょう", "ましょうか", "ません", "ませ"].includes(auxTokens[0]?.surface ?? "")) {
        return undefined;
      }
      const hasPolite = auxHasPolite(auxTokens);
      const polarity = auxHasNegation(auxTokens) ? "negative" : null;
      const tense = auxHasPast(auxTokens) ? "past" : null;
      return makeDeclarativeAuxTerminal(current, { hasPolite, polarity, tense, register: hasPolite ? "polite" : null });
    };
    if (auxTokens.length > 0) {
      let conditionalEnd = current;
      if (current < cur.end && tokens[current]?.surface === "ば" && (tokens[current]?.pos & POS0) === 助詞) {
        conditionalEnd = current + 1;
      }
      if (auxTokens.some((token) => (token.pos & POS5A) === 仮定形_)) {
        cur.advance(conditionalEnd - cur.pos);
        return {
          kind: "terminal" as const,
          family: "conditional",
          span: [cursor, conditionalEnd] as Span,
          payload: { kind: "conditional", auxTokens }
        };
      }
    }
    if (current >= cur.end) {
      return genericDeclarativeAuxTerminal();
    }
    const token = tokens[current];
    if (token === undefined) {
      return genericDeclarativeAuxTerminal();
    }
    if (isPostVerbNoNominalizer(tokens, current) && current + 1 < cur.end) {
      const nextIdx = (nextNonSpaceIndex(tokens, current + 1, cur.end) ?? cur.end);
      const next = tokens[nextIdx];
      if (next !== undefined) {
        if ((copulaDeMarkerRelationForToken(next, nextIdx, { consumers: ["postverb_chain"] }) !== null || next.surface === "じゃ") && (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)) {
          const afterDe = (nextNonSpaceIndex(tokens, nextIdx + 1, cur.end) ?? cur.end);
          const hasDeWaBridge = dewaScopeBridgeRelationAt(tokens, nextIdx, {
            anchorIdx: current,
            consumers: ["postverb_chain"]
          })?.focusParticle === "wa";
          const negIdx = next.surface === "じゃ"
            ? afterDe
            : hasDeWaBridge
              ? (nextNonSpaceIndex(tokens, afterDe + 1, cur.end) ?? cur.end)
              : null;
          if (negIdx !== null) {
            const chainResult = cur.lookahead(negIdx - cur.pos, (chain) => {
              const negativeCopula = consumeNodaNegativeCopula(tokens, chain);
              if (negativeCopula === undefined) return undefined;
              const modal = consumeNodaNegativeModal(tokens, chain);
              const nextAfterNeg = (nextNonSpaceIndex(tokens, chain.pos, cur.end) ?? cur.end);
              let confirm = false;
              if (nextAfterNeg < cur.end && isPostVerbTerminalKaMarker(tokens, nextAfterNeg)) {
                confirm = true;
                chain.advance(nextAfterNeg + 1 - chain.pos);
              } else {
                const noKaConfirmUntil = consumeNodaNoKaNegativeConfirmTail(tokens, chain.pos, cur.end);
                if (noKaConfirmUntil !== null) {
                  confirm = true;
                  chain.advance(noKaConfirmUntil - chain.pos);
                }
              }
              let connective: string | null = null;
              if (!confirm) {
                const consumed = consumeNodaNegativeConnective(tokens, chain);
                connective = consumed.connective;
              }
              return { negativeCopula, modal, confirm, connective, endPos: chain.pos };
            });
            if (chainResult !== undefined) {
              cur.advance(chainResult.endPos - cur.pos);
              return {
                kind: "terminal" as const,
                family: "noda",
                span: [cursor, chainResult.endPos] as Span,
                payload: {
                  kind: "noda",
                  auxTokens,
                  connective: chainResult.connective,
                  sfp: chainResult.confirm ? "neg_confirm" : "negative",
                  familyPayload: {
                    negative_copula_aux_tokens: chainResult.negativeCopula.tokens,
                    negative_copula_modal_aux_tokens: chainResult.modal.tokens
                  }
                }
              };
            }
            if (next.surface === "じゃ") {
              return undefined;
            }
            if (hasDeWaBridge) {
              return undefined;
            }
          }
          cur.advance(nextIdx + 1 - cur.pos);
          return {
            kind: "terminal" as const,
            family: "causal",
            span: [cursor, nextIdx + 1] as Span,
            payload: { kind: "causal", auxTokens, connective: "아/어서" }
          };
        }
        if (isPostVerbCaseParticleToken(next, nextIdx, "に", ["格助詞", "接続助詞", "係助詞"])) {
          cur.advance(nextIdx + 1 - cur.pos);
          return {
            kind: "terminal" as const,
            family: "concessive",
            span: [cursor, nextIdx + 1] as Span,
            payload: { kind: "concessive", auxTokens, connective: "지만", familyPayload: { source: "noni" } }
          };
        }
        if (auxTokens.length > 0) {
          const copulaResult = cur.lookahead(nextIdx - cur.pos, (copulaCur) => {
            const copula = collectNodaCopulaAux(tokens, copulaCur);
            if (copula === undefined) return undefined;
            const event = nodaCopulaTerminalEvent(tokens, copulaCur, {
              spanStart: cursor,
              copulaAux: copula.tokens,
              payloadAuxTokens: auxTokens
            });
            if (event === undefined) return undefined;
            return { event, endPos: copulaCur.pos };
          });
          if (copulaResult !== undefined) {
            cur.advance(copulaResult.endPos - cur.pos);
            return copulaResult.event;
          }
        }
      }
    }
    if (auxTokens.length > 0 && ["が", "けど", "けれど"].includes(token.surface) && (token.pos & POS1) === 接続助詞) {
      let end = current + 1;
      if (token.surface === "けど" || token.surface === "けれど") {
        const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
        if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
          end = maybeMo + 1;
        }
      }
      cur.advance(end - cur.pos);
      return {
        kind: "terminal" as const,
        family: "concessive",
        span: [cursor, end] as Span,
        payload: { kind: "concessive", auxTokens, connective: "지만" }
      };
    }
    if (isPostVerbCaseParticleToken(token, current, "から", ["格助詞", "接続助詞"])) {
      cur.advance(current + 1 - cur.pos);
      return {
        kind: "terminal" as const,
        family: "causal",
        span: [cursor, current + 1] as Span,
        payload: { kind: "causal", auxTokens, connective: "아/어서" }
      };
    }
    if (isTeConnectiveToken(token) && auxTokens.length > 0) {
      cur.advance(current + 1 - cur.pos);
      return {
        kind: "terminal" as const,
        family: "gerund",
        span: [cursor, current + 1] as Span,
        payload: { kind: "gerund", auxTokens }
      };
    }
    const quoteMarker = postVerbQuoteMarkerRelationAt(cur, current, lookups);
    if (quoteMarker !== null && auxTokens.length === 1 && auxTokens[0]?.surface === "ませ" && (auxTokens[0].dictionaryForm || auxTokens[0].surface) === "ます") {
      return undefined;
    }
    if (quoteMarker !== null && auxTokens.length > 0) {
      const hasPolite = auxHasPolite(auxTokens);
      const polarity = auxHasNegation(auxTokens) ? "negative" : null;
      const tense = auxHasPast(auxTokens) ? "past" : null;
      return makeDeclarativeAuxTerminal(current, { hasPolite, polarity, tense, register: hasPolite ? "polite" : null });
    }
    if (((token.pos & POS0) === 補助記号 || pos0in(token.pos, NOMINAL_BITS)) && auxTokens.length > 0) {
      return genericDeclarativeAuxTerminal();
    }
    return undefined;
  });
}

function parseNodaTerminal(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const token = tokens[cursor];
  if (
    token === undefined ||
    cursor >= cur.end ||
    !isPostVerbNoNominalizer(tokens, cursor)
  ) {
    return undefined;
  }
  const chainMatch = cur.lookahead(cursor + 1 - cur.pos, c => {
    const base = c.pos;
    const chain = detectNoCopulaChain(c);
    return chain === null ? null : { chain, consumed: c.pos - base };
  });
  const chain = chainMatch?.chain ?? null;
  if (chain !== null) {
    const consumed = chainMatch!.consumed;
    const [kind, past, polite, bridgeParticle] = chain;
    let connective: string | null = null;
    if (kind === "conditional" || kind === "emphasis_conditional") {
      connective = "면";
    } else if (kind === "conjecture_contrastive" || kind === "emphasis_contrastive") {
      connective = "지만";
    } else if (kind === "conjecture_causal" || kind === "emphasis_causal") {
      connective = "(으)니까";
    }
    cur.advance(cursor + 1 + consumed - cur.pos);
    return {
      kind: "terminal",
      family: "noda",
      span: [cursor, cursor + 1 + consumed],
      payload: {
        kind: "noda",
        connective,
        register: polite ? "polite" : null,
        tense: past ? "past" : null,
        familyPayload: {
          chain_kind: kind,
          chain_past: past,
          chain_polite: polite,
          bridge_particle: bridgeParticle
        }
      }
    };
  }
  const copulaResult = cur.lookahead(cursor + 1 - cur.pos, (copulaCur) => {
    const copula = collectNodaCopulaAux(tokens, copulaCur);
    if (copula === undefined) return undefined;
    const event = nodaCopulaTerminalEvent(tokens, copulaCur, {
      spanStart: cursor,
      copulaAux: copula.tokens,
      payloadAuxTokens: copula.tokens
    });
    if (event === undefined) return undefined;
    return { event, endPos: copulaCur.pos };
  });
  if (copulaResult === undefined) {
    return directNodaDeNegativeTerminal(tokens, cur) ?? bareNodaBeforeFinalParticle(tokens, cur);
  }
  cur.advance(copulaResult.endPos - cur.pos);
  return copulaResult.event;
}

function bareNodaBeforeFinalParticle(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const nextIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
  const next = tokens[nextIdx];
  if (next === undefined || nextIdx >= cur.end || (next.pos & POS01) !== 助詞_終助詞) {
    return undefined;
  }
  cur.advance(1);
  return {
    kind: "terminal",
    family: "noda",
    span: [cursor, cursor + 1],
    payload: { kind: "noda", familyPayload: { copula_aux_tokens: [] } }
  };
}

function directNodaDeNegativeTerminal(tokens: readonly PostVerbToken[], cur: PVCursor): PostVerbEvent | undefined {
  const cursor = cur.pos;
  const deIdx = (nextNonSpaceIndex(tokens, cursor + 1, cur.end) ?? cur.end);
  const de = tokens[deIdx];
  if (
    de === undefined ||
    deIdx >= cur.end ||
    (de.pos & POS0) !== 助動詞 ||
    !(
      ((de.pos & POS4) === 助動詞_ダ && ((de.pos & POS5) === 連用形_一般 || (de.pos & POS5) === 連用形_融合)) ||
      ((de.pos & (POS4 | POS5)) === (助動詞_デス | 連用形_一般))
    )
  ) {
    return undefined;
  }
  if ((de.pos & POS4) === 助動詞_デス) {
    const maybeTara = (nextNonSpaceIndex(tokens, deIdx + 1, cur.end) ?? cur.end);
    if (maybeTara < cur.end && (tokens[maybeTara]!.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)) {
      cur.advance(maybeTara + 1 - cur.pos);
      return {
        kind: "terminal",
        family: "noda",
        span: [cursor, maybeTara + 1],
        payload: { kind: "noda", connective: "polite_conditional" }
      };
    }
  }
  const bridgeIdx = (nextNonSpaceIndex(tokens, deIdx + 1, cur.end) ?? cur.end);
  const negIdx = bridgeIdx < cur.end && tokens[bridgeIdx]?.surface === "は" && (tokens[bridgeIdx].pos & POS0) === 助詞
    ? (nextNonSpaceIndex(tokens, bridgeIdx + 1, cur.end) ?? cur.end)
    : bridgeIdx;
  const chainResult = cur.lookahead(negIdx - cur.pos, (chain) => {
    const negativeCopula = consumeNodaNegativeCopula(tokens, chain);
    if (negativeCopula === undefined) return undefined;
    const modal = consumeNodaNegativeModal(tokens, chain);
    const nextIdx = (nextNonSpaceIndex(tokens, chain.pos, cur.end) ?? cur.end);
    let confirm = false;
    if (nextIdx < cur.end && isPostVerbTerminalKaMarker(tokens, nextIdx)) {
      confirm = true;
      chain.advance(nextIdx + 1 - chain.pos);
    } else {
      const noKaConfirmUntil = consumeNodaNoKaNegativeConfirmTail(tokens, chain.pos, cur.end);
      if (noKaConfirmUntil !== null) {
        confirm = true;
        chain.advance(noKaConfirmUntil - chain.pos);
      }
    }
    let connective: string | null = null;
    if (!confirm) {
      const consumed = consumeNodaNegativeConnective(tokens, chain);
      connective = consumed.connective;
    }
    return { negativeCopula, modal, confirm, connective, endPos: chain.pos };
  });
  if (chainResult === undefined) {
    return undefined;
  }
  cur.advance(chainResult.endPos - cur.pos);
  return {
    kind: "terminal",
    family: "noda",
    span: [cursor, chainResult.endPos],
    payload: {
      kind: "noda",
      connective: chainResult.connective,
      sfp: chainResult.confirm ? "neg_confirm" : "negative",
      familyPayload: {
        negative_copula_aux_tokens: chainResult.negativeCopula.tokens,
        negative_copula_modal_aux_tokens: chainResult.modal.tokens
      }
    }
  };
}

function collectNodaCopulaAux(tokens: readonly PostVerbToken[], cur: PVCursor): { readonly tokens: readonly PostVerbToken[] } | undefined {
  const first = tokens[cur.pos];
  if (first === undefined || cur.pos >= cur.end) {
    return undefined;
  }
  if (
    (first.pos & POS0) === 助動詞 &&
    NODA_COPULA_POS4.has(first.pos & POS4)
  ) {
    if ((first.pos & (POS4 | POS5)) === (助動詞_ダ | 連用形_一般)) {
      return undefined;
    }
    const aux: PostVerbToken[] = [first];
    let current = cur.pos + 1;
    while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞) {
      aux.push(tokens[current]!);
      current += 1;
    }
    cur.advance(current - cur.pos);
    return { tokens: aux };
  }
  return undefined;
}

function nodaCopulaTerminalEvent(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  options: {
    readonly spanStart: number;
    readonly copulaAux: readonly PostVerbToken[];
    readonly payloadAuxTokens: readonly PostVerbToken[];
  }
): PostVerbEvent | undefined {
  if (
    options.copulaAux.length >= 2 &&
    (options.copulaAux.at(-1)!.pos & (POS4 | POS5A)) === (助動詞_タ | 仮定形_)
  ) {
    return {
      kind: "terminal",
      family: "noda",
      span: [options.spanStart, cur.pos],
      payload: { kind: "noda", connective: "polite_conditional" }
    };
  }
  if (
    options.copulaAux.length === 1 &&
    (options.copulaAux[0]!.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)
  ) {
    const negIdx = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
    const chainResult = cur.lookahead(negIdx - cur.pos, (chain) => {
      const negativeCopula = consumeNodaNegativeCopula(tokens, chain);
      if (negativeCopula === undefined) return undefined;
      const modal = consumeNodaNegativeModal(tokens, chain);
      const nextIdx = (nextNonSpaceIndex(tokens, chain.pos, cur.end) ?? cur.end);
      let confirm = false;
      if (nextIdx < cur.end && isPostVerbTerminalKaMarker(tokens, nextIdx)) {
        confirm = true;
        chain.advance(nextIdx + 1 - chain.pos);
      } else {
        const noKaConfirmUntil = consumeNodaNoKaNegativeConfirmTail(tokens, chain.pos, cur.end);
        if (noKaConfirmUntil !== null) {
          confirm = true;
          chain.advance(noKaConfirmUntil - chain.pos);
        }
      }
      let connective: string | null = null;
      if (!confirm) {
        const consumed = consumeNodaNegativeConnective(tokens, chain);
        connective = consumed.connective;
      }
      return { negativeCopula, modal, confirm, connective, endPos: chain.pos };
    });
    if (chainResult !== undefined) {
      cur.advance(chainResult.endPos - cur.pos);
      return {
        kind: "terminal",
        family: "noda",
        span: [options.spanStart, cur.pos],
        payload: {
          kind: "noda",
          auxTokens: options.payloadAuxTokens,
          connective: chainResult.connective,
          sfp: chainResult.confirm ? "neg_confirm" : "negative",
          familyPayload: {
            negative_copula_aux_tokens: chainResult.negativeCopula.tokens,
            negative_copula_modal_aux_tokens: chainResult.modal.tokens
          }
        }
      };
    }
  }
  const nextIdx = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  let connective: string | null = null;
  if (
    nextIdx < cur.end &&
    (tokens[nextIdx]?.surface === "が" || tokens[nextIdx]?.surface === "けど" || tokens[nextIdx]?.surface === "けれど") &&
    (tokens[nextIdx].pos & POS1) === 接続助詞
  ) {
    connective = "는데";
    let end = nextIdx + 1;
    if (tokens[nextIdx].surface === "けど" || tokens[nextIdx].surface === "けれど") {
      const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
      if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
        end = maybeMo + 1;
      }
    }
    cur.advance(end - cur.pos);
  } else if (isPostVerbCaseParticle(tokens, nextIdx, "から", ["接続助詞"])) {
    connective = "(으)니까";
    cur.advance(nextIdx + 1 - cur.pos);
  } else if (nextIdx < cur.end && isPostVerbTerminalKaMarker(tokens, nextIdx)) {
    const hasPolite = auxHasPolite(options.copulaAux);
    cur.advance(nextIdx + 1 - cur.pos);
    return {
      kind: "terminal",
      family: "noda",
      span: [options.spanStart, cur.pos],
      payload: {
        kind: "noda",
        auxTokens: options.payloadAuxTokens,
        sfp: hasPolite ? "polite_q" : "plain_q",
        familyPayload: { copula_aux_tokens: options.copulaAux }
      }
    };
  }
  return {
    kind: "terminal",
    family: "noda",
    span: [options.spanStart, cur.pos],
    payload: {
      kind: "noda",
      auxTokens: options.payloadAuxTokens,
      connective,
      familyPayload: { copula_aux_tokens: options.copulaAux }
    }
  };
}

function consumeNodaNegativeConnective(tokens: readonly PostVerbToken[], cur: PVCursor): { readonly connective: string | null } {
  const nextIdx = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  if (nextIdx >= cur.end || (tokens[nextIdx]!.pos & POS0) !== 助詞) {
    return { connective: null };
  }
  const token = tokens[nextIdx]!;
  if (token.surface === "が" || token.surface === "けど" || token.surface === "けれど") {
    let end = nextIdx + 1;
    if (token.surface === "けど" || token.surface === "けれど") {
      const maybeMo = (nextNonSpaceIndex(tokens, end, cur.end) ?? cur.end);
      if (maybeMo < cur.end && tokens[maybeMo]?.surface === "も") {
        end = maybeMo + 1;
      }
    }
    cur.advance(end - cur.pos);
    return { connective: "지만" };
  }
  if (isPostVerbCaseParticleToken(token, nextIdx, "から", ["格助詞", "接続助詞"])) {
    cur.advance(nextIdx + 1 - cur.pos);
    return { connective: "(으)니까" };
  }
  return { connective: null };
}

function consumeNodaNegativeCopula(tokens: readonly PostVerbToken[], cur: PVCursor): { readonly tokens: readonly PostVerbToken[] } | undefined {
  return cur.tryParse((cur) => {
    let current = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
    const token = tokens[current];
    if (token === undefined || current >= cur.end) {
      return undefined;
    }
    const negativeAux: PostVerbToken[] = [];
    if ((token.pos & POS0) === 形容詞0 && ["ない", "無い"].includes(token.dictionaryForm || token.surface)) {
      negativeAux.push(token);
      current += 1;
      while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞 && (tokens[current]!.pos & POS5A) !== 意志推量形_) {
        negativeAux.push(tokens[current]!);
        current += 1;
      }
      cur.advance(current - cur.pos);
      return { tokens: negativeAux };
    }
    if ((token.pos & POS0) === 動詞 && ["ある", "有る"].includes(token.dictionaryForm || token.surface)) {
      negativeAux.push(token);
      current += 1;
      while (current < cur.end && ((tokens[current]?.pos ?? 0) & POS0) === 助動詞 && (tokens[current]!.pos & POS5A) !== 意志推量形_) {
        negativeAux.push(tokens[current]!);
        current += 1;
      }
      if (auxHasNegation(negativeAux)) {
        cur.advance(current - cur.pos);
        return { tokens: negativeAux };
      }
    }
    return undefined;
  });
}

function consumeNodaNegativeModal(tokens: readonly PostVerbToken[], cur: PVCursor): { readonly tokens: readonly PostVerbToken[] } {
  const current = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  const token = tokens[current];
  if (
    token !== undefined && current < cur.end && (token.pos & (POS0 | POS5A)) === (助動詞 | 意志推量形_) && ((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス)
  ) {
    cur.advance(current + 1 - cur.pos);
    return { tokens: [token] };
  }
  return { tokens: [] };
}

function operatorImpliedTerminal(
  tokens: readonly PostVerbToken[],
  operatorEvent: PostVerbEvent,
  cur: PVCursor
): PostVerbEvent | undefined {
  if (operatorEvent.kind !== "operator") {
    return undefined;
  }
  const operatorIdx = operatorEvent.span[1] - 1;
  if (operatorIdx < 0 || operatorIdx >= tokens.length) {
    return undefined;
  }
  const token = tokens[operatorIdx];
  if (token === undefined || (token.pos & POS5A) !== 意志推量形_) {
    return undefined;
  }
  const cursor = cur.pos;
  const current = (nextNonSpaceIndex(tokens, cursor, cur.end) ?? cur.end);
  let sfp: string | null = null;
  let pos = cursor;
  if (current < cur.end && isPostVerbTerminalKaMarker(tokens, current)) {
    pos = current + 1;
    const maybeNa = (nextNonSpaceIndex(tokens, pos, cur.end) ?? cur.end);
    if (maybeNa < cur.end && tokens[maybeNa]?.surface === "な") {
      pos = maybeNa + 1;
      sfp = "かな";
    } else {
      sfp = "か";
    }
  }
  if (pos > cursor) {
    cur.advance(pos - cursor);
  }
  return {
    kind: "terminal",
    family: "hortative",
    span: [operatorIdx, pos > cursor ? pos : operatorIdx + 1],
    payload: {
      kind: "hortative",
      sfp
    }
  };
}

function maybeQuoteFollower(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  lookups: LookupTables,
  terminalEvent?: PostVerbEvent
): PostVerbEvent | undefined {
  const markerIdx = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  const markerRelation = postVerbQuoteMarkerRelationAt(cur, markerIdx, lookups);
  if (markerRelation === null) {
    return undefined;
  }
  const runtimeTokens = postVerbTokensToRuntime(tokens);
  const quoteKind = quoteStructuralRelationAt(cur.retarget(runtimeTokens, markerIdx, cur.end, markerIdx), lookups)?.quote.request?.tailKind ?? null;
  const hostType = quoteKind;
  const hostStart = quoteHostStart(tokens, markerIdx + 1, cur.end);
  const handoffKind = quoteKind !== null ? "quote_request" : "quote_content";
  if (
    quoteKind === null &&
    hostStart === null &&
    handoffKind === "quote_content" &&
    terminalEvent?.kind === "terminal" &&
    terminalEvent.family === "modal" &&
    (terminalEvent.payload.modal === "yoda" || terminalEvent.payload.modal === "mitai")
  ) {
    return undefined;
  }
  const handoff: PostVerbHandoff = {
    kind: handoffKind,
    terminalSpan: terminalEvent?.span ?? null,
    quoteMarkerSpan: [markerRelation.span.start, markerRelation.span.endExclusive],
    hostStart,
    consumedUntil: markerRelation.span.endExclusive,
    ownsQuestionTerminal: terminalEvent?.kind === "terminal" && terminalEvent.family === "question",
    hostType,
    hostVoice: quoteKind === null ? null : (quoteKind === "iu_passive" || quoteKind === "question_passive" ? "passive" : "active")
  };
  cur.advance(markerRelation.span.endExclusive - cur.pos);
  return {
    kind: "follower",
    family: handoffKind,
    span: [markerRelation.span.start, markerRelation.span.endExclusive],
    payload: { kind: handoffKind, span: [markerRelation.span.start, markerRelation.span.endExclusive], hostType, handoff }
  };
}

function maybeFollower(
  tokens: readonly PostVerbToken[],
  cur: PVCursor,
  terminalEvent: PostVerbEvent,
  lookups: LookupTables
): PostVerbEvent | undefined {
  const current = (nextNonSpaceIndex(tokens, cur.pos, cur.end) ?? cur.end);
  if (current >= cur.end) {
    return undefined;
  }
  if (terminalEvent.family === "gerund") {
    const connectorPos = terminalEvent.span[1] - 1;
    const followerKind = classifyTeFollowerKindForPostVerb(tokens, connectorPos, cur.end, lookups);
    if (followerKind === "terminal_concessive" || followerKind === "permissive" || followerKind === "temporal_after") {
      cur.advance(current + 1 - cur.pos);
      return {
        kind: "follower",
        family: followerKind,
        span: [current, current + 1],
        payload: { kind: followerKind, span: [current, current + 1] }
      };
    }
    if (followerKind === "reason_evaluation") {
      const head = findTeEvaluationFollowerIndex(tokens, current, cur.end, lookups);
      if (head !== undefined) {
        cur.advance(current - cur.pos);
        return {
          kind: "follower",
          family: "evaluation_head",
          span: [head, head + 1],
          payload: { kind: "evaluation_head", span: [head, head + 1] }
        };
      }
    }
  }
  const quoteResult = cur.lookahead(current - cur.pos, (subCur) => {
    const quote = maybeQuoteFollower(tokens, subCur, lookups, terminalEvent);
    if (quote === undefined) return undefined;
    return { quote, endPos: subCur.pos };
  });
  if (quoteResult !== undefined) {
    cur.advance(quoteResult.endPos - cur.pos);
    return quoteResult.quote;
  }
  return undefined;
}

function classifyTeFollowerKindForPostVerb(tokens: readonly PostVerbToken[], connectorPos: number, end: number, lookups: LookupTables): string | null {
  return classifyTeFollowerKind(tokens, connectorPos, end, lookups);
}

function quoteHostStart(tokens: readonly PostVerbToken[], cursor: number, end: number): number | null {
  let current = (nextNonSpaceIndex(tokens, cursor, end) ?? end);
  while (current < end) {
    const token = tokens[current];
    if (token === undefined || (token.pos & POS0) === 補助記号) {
      return null;
    }
    if ((token.pos & POS0) === 動詞) {
      return current;
    }
    current += 1;
  }
  return null;
}

function teAruPayloadFromContext(context: PostVerbParserContext): TeAruFamilyPayload {
  const evidence = context.particleEvidence;
  const state = evidence?.state === "resultative" || evidence?.state === "prepared" ? evidence.state : "unknown";
  const renderStrategy = evidence?.renderStrategy ?? "context_required";
  return {
    state,
    renderStrategy: renderStrategy,
    particle: evidence?.surface ?? null,
    role: evidence?.role ?? null
  };
}

function isDesiderativePayload(payload: PostVerbFamilyPayload): payload is DesiderativeFamilyPayload {
  return "kind" in payload && (payload.kind === "hoshii" || payload.kind === "tai");
}
