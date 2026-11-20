
import { isDegreeExtentParticle } from "../particles/secondary-particle.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { isClauseEvidenceTransparentPunctuation, isClausePunctuationToken } from "../clause-layout/punctuation.js";
import { isExplicitQuoteClosingToken } from "../clause-layout/quote-delimiters.js";
import { activeProtoScopedScanEnd } from "../clause-layout/proto-state.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import {
  conditionalDiscoveryEvidenceWindowForToken,
  conditionalSourceAllowsRetrospectiveDiscovery,
  hasRetrospectiveDiscoveryCueAfter
} from "../semantics/conditional.js";
import {
  classifyConnKaPostAuxSemanticClass,
  isRawKaDouKaSecondKaDuplicate,
  isWhAdverbKaMarker,
  looksPredicateChoiceKaClauseBoundary,
  looksQuestionTakingAfter,
  looksQuoteQuestionTakingAfter
} from "../quote/embedded-question.js";
import {
  kaMarkerRelationAt,
  conditionalToConnectiveRelationAt,
  nominalLinkMarkerRelationAt,
  nominalizerQuestionContentConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  questionContentContinuationAfterKaRelationAt
} from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { kaOwnershipKindAt } from "../head-tail/boundary/ka-ownership.js";
import { type MatcherToken, runtimeTokensFromMatcher } from "../matchers.js";
import {
  hokaBareNounContinuationLooksAdditive,
  looksLikePurposeEvaluationNoNi,
  looksPronominalNoDe,
  looksPronominalNoNi,
  matchHokaAdditiveConnectiveStart,
  matchMonoNoConcessiveConnectiveStart,
  matchNegativeTailStart,
  matchNoNiConcessiveConnectiveStart,
  shouldSuppressConnMonoNo
} from "../semantics/helpers.js";
import { quoteStructuralRelationAt } from "../structural-relation/quote.js";
import type { QuoteStructuralRelation } from "../structural-relation/quote-payload.js";
import { participatesInStructuralKaParallel } from "../structural-relation/ka-parallel-ownership.js";
import { TokenCursor } from "../token-cursor.js";
import { isNominalEvidentialRashiiPredicateStart } from "../head-tail/tail/predicate-root/integration/readiness.js";
import { matchPreEntryKaNoYouFamilyStart } from "./pre-entry.js";
import type { PostAuxPatternLike, PostAuxPatternResolverLike } from "./postaux-types.js";


import {
  INFLECTABLE_BITS,
  POS0,
  pos0in,
  POS1,
  POS4,
  POS5,
  POS5A,
  PREDICATE_BITS,
  形状詞,
  形容詞0,
  助動詞,
  助動詞_ジャ,
  助動詞_ダ,
  助動詞_デス,
  接尾辞,
  代名詞,
  動詞,
  非自立可能,
  補助記号,
  名詞,
  連用形_,
  連用形_一般,
  대명사,
  동사,
  명사,
  수사,
  형용사, 助詞_格助詞,
} from "../../types/pos.js";
export interface PostAuxUnsupportedContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly token: RuntimeHaruToken;
  readonly pos0: number;
  readonly koreanLemma: string;
  readonly koreanPos: number;
  readonly auxTokens: readonly MatcherToken[];
  readonly consumed: number;
  readonly after: number;
}

function asRuntimeCursor(cursor: TokenCursor<MatcherToken>): TokenCursor<RuntimeHaruToken> {
  return cursor as unknown as TokenCursor<RuntimeHaruToken>;
}

function questionContentRelationForPostAux(ctx: PostAuxUnsupportedContext, postAuxPattern: { readonly id: string }, lookups: LookupTables): QuoteStructuralRelation | null {
  if (postAuxPattern.id === "conn_kadouka") {
    const relation = quoteStructuralRelationAt(ctx.cursor, lookups);
    if (relation === undefined || relation.quote.slotKind !== "question_content") {
      return null;
    }
    return relation;
  }
  if (postAuxPattern.id !== "conn_kato") {
    return null;
  }
  const markerIdx = ctx.after + 1;
  const marker = quoteMarkerRelationAt(ctx.tokens, markerIdx, {
    consumers: ["post_aux", "quote_content"]
  });
  if (marker?.canonicalSurface !== "と" || marker.tokenCount !== 1) {
    return null;
  }
  const relation = quoteStructuralRelationAt(ctx.cursor.fork(markerIdx, ctx.cursor.end, markerIdx), lookups);
  if (relation === undefined || relation.quote.slotKind !== "question_content") {
    return null;
  }
  return relation;
}

function canApplyPostAux(ctx: PostAuxUnsupportedContext): boolean {
  return (ctx.koreanPos === 동사 || ctx.koreanPos === 형용사) && ctx.koreanLemma.length > 0 && ctx.koreanLemma.endsWith("다");
}

function isColloquialNoniTail(token: MatcherToken): boolean {
  return ["にっ", "にぃ", "にい"].includes(token.surface) && ["ニッ", "ニィ", "ニイ"].includes(token.reading ?? "");
}

export function postAuxPatternFamily(id: string): string {
  if (id.startsWith("conn_") || id.startsWith("conc_")) {
    return "connective";
  }
  if (id.startsWith("proh_")) {
    return "prohibition";
  }
  if (id.startsWith("modal_zaru_")) {
    return "obligation";
  }
  if (id.startsWith("dblneg_")) {
    return "double_negation";
  }
  if (
    id.startsWith("modal_") ||
    id.includes("kamo_shirenai") ||
    id.startsWith("hodo_kamo") ||
    id.startsWith("noka_mo")
  ) {
    return "scope_modal";
  }
  if (id.startsWith("tai_")) {
    return "desiderative";
  }
  if (id.startsWith("you_ni")) {
    return "you_ni";
  }
  if (id.startsWith("quoted_to_")) {
    return "quote_boundary";
  }
  if (id === "naide_kudasai") {
    return "request";
  }
  if (id === "naide" || id === "zuni" || id === "zu_bare") {
    return "negative_connective";
  }
  return "other";
}

function matchColloquialNoni(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly hostPos0: number; readonly hasAux: boolean }
): boolean {
  if (cursor.peek(1) === undefined) {
    return false;
  }
  const niToken = cursor.peek(1);
  const noToken = predicateNominalizerRelationForToken(cursor.current(), cursor.pos, {
    requirement: "tail_connective_marker",
    consumers: ["post_aux"]
  });
  if (noToken?.nominalizerKind !== "no" || niToken === undefined) {
    return false;
  }
  if (!isColloquialNoniTail(niToken)) {
    return false;
  }
  return options.hasAux || pos0in(options.hostPos0, PREDICATE_BITS);
}

function normalizeColloquialNoniTokens(tokens: readonly RuntimeHaruToken[], after: number): readonly RuntimeHaruToken[] {
  const normalized = [...tokens];
  const target = normalized[after + 1];
  if (target !== undefined) {
    normalized[after + 1] = {
      ...target,
      surface: "に",
      dictionaryForm: "に",
      reading: "ニ",
      pos: 助詞_格助詞
    };
  }
  return normalized;
}

export interface RemovedPostAuxUnsupportedMatch {
  readonly pattern: PostAuxPatternLike;
  readonly effectivePattern: PostAuxPatternLike;
  readonly consumed: number;
  readonly triggerStart: number;
  readonly triggerEnd: number;
  readonly family: string;
  readonly colloquialNoni: boolean;
}

export function matchRemovedPostAuxPattern(
  resolver: Pick<PostAuxPatternResolverLike, "patterns">,
  ctx: PostAuxUnsupportedContext,
  lookups: LookupTables
): RemovedPostAuxUnsupportedMatch | null {
  let colloquialNoni = false;
  let postAuxPattern = resolver.patterns?.matchPostAux?.(ctx.tokens, ctx.after, ctx.auxTokens) ?? null;
  if (
    postAuxPattern === null &&
    matchColloquialNoni(ctx.cursor, {
      hostPos0: ctx.pos0,
      hasAux: ctx.auxTokens.length > 0
    })
  ) {
    colloquialNoni = true;
    postAuxPattern = resolver.patterns?.matchPostAux?.(normalizeColloquialNoniTokens(ctx.tokens, ctx.after), ctx.after, ctx.auxTokens) ?? null;
  }
  if (postAuxPattern === null) {
    return null;
  }
  if (shouldSuppressPostAuxPattern(postAuxPattern, ctx, lookups)) {
    return null;
  }
  if (
    postAuxPattern.outputMode !== undefined &&
    postAuxPattern.outputMode !== null &&
    ["compound", "standard"].includes(postAuxPattern.outputMode) &&
    !canApplyPostAux(ctx)
  ) {
    return null;
  }
  if (
    postAuxPattern.outputMode === "connective" &&
    !canApplyPostAux(ctx) &&
    ctx.pos0 !== 名詞 &&
    ctx.pos0 !== 形状詞
  ) {
    return null;
  }
  const effectivePattern = adjustPostAuxPattern(postAuxPattern, ctx, lookups);
  const consumed = colloquialNoni ? ctx.consumed + 2 : ctx.consumed + postAuxPattern.triggerLength;
  return {
    pattern: postAuxPattern,
    effectivePattern,
    consumed,
    triggerStart: ctx.after,
    triggerEnd: ctx.start + consumed,
    family: postAuxPatternFamily(effectivePattern.id ?? postAuxPattern.id ?? "unknown"),
    colloquialNoni
  };
}

export function buildUnsupportedPostAuxWarning(ctx: PostAuxUnsupportedContext, match: RemovedPostAuxUnsupportedMatch): Warning {
  const patternId = match.effectivePattern.id ?? match.pattern.id ?? "unknown";
  const surface = ctx.tokens
    .slice(match.triggerStart, match.triggerEnd)
    .map((token) => token.surface)
    .join("");
  return {
    type: "unsupported_grammar",
    severity: "error",
    opKind: "legacy_post_aux_rule_removed",
    span: { start: match.triggerStart, end: match.triggerEnd },
    message: `unsupported grammar exposed after removed post-aux router; router=post_aux_removed pattern=${patternId} family=${match.family} surface=${surface}`
  };
}

function shouldSuppressPostAuxPattern(pattern: PostAuxPatternLike, ctx: PostAuxUnsupportedContext, lookups: LookupTables): boolean {
  const id = pattern.id ?? "";
  const end = ctx.cursor.end;
  if (
    id === "conn_node" &&
    (
      (ctx.after + 2 < end && (ctx.tokens[ctx.after + 2]?.surface === "は" || ctx.tokens[ctx.after + 2]?.surface === "が")) ||
      (
        ctx.after + 1 < end &&
        ((ctx.tokens[ctx.after + 1]?.pos ?? 0) & POS0) === 助動詞 &&
        (((ctx.tokens[ctx.after + 1]?.pos ?? 0) & POS4) === 助動詞_ダ || ((ctx.tokens[ctx.after + 1]?.pos ?? 0) & POS4) === 助動詞_デス || ((ctx.tokens[ctx.after + 1]?.pos ?? 0) & POS4) === 助動詞_ジャ) &&
        ((ctx.tokens[ctx.after + 1]?.pos ?? 0) & POS5) !== 連用形_一般
      )
    )
  ) {
    return true;
  }
  if (id === "conn_noni" && looksPronominalNoNi(ctx.cursor, lookups)) {
    return true;
  }
  if (id === "conn_noni" && matchNoNiConcessiveConnectiveStart(ctx.cursor, lookups) !== null) {
    return true;
  }
  if (id === "conn_nimo_kakawarazu" && ctx.pos0 !== 動詞 && ctx.pos0 !== 形容詞0 && ctx.auxTokens.length === 0) {
    return true;
  }
  if ((id === "conn_hoka_additive" || id === "conn_katawara_parallel") && ctx.pos0 !== 動詞) {
    return true;
  }
  if (
    [
      "conn_ni_atatte_predicate",
      "conn_ni_atari_predicate",
      "conn_ni_saishite_predicate",
      "conn_ni_saishi_predicate",
      "conn_ni_shitagatte_predicate",
      "conn_ni_shitagai_predicate"
    ].includes(id) &&
    ctx.pos0 !== 動詞
  ) {
    return true;
  }
  if (id === "conn_made_predicate" && ctx.pos0 !== 動詞 && ctx.pos0 !== 形容詞0) {
    return true;
  }
  if (isDegreeExtentPostAuxPredicate(id) && shouldSuppressDegreeExtentPostAuxPredicate(ctx, lookups)) {
    return true;
  }
  if (
    id === "conn_hoka_additive" &&
    ctx.cursor.lookahead(ctx.after + pattern.triggerLength - ctx.cursor.pos, c => matchNegativeTailStart(c)) !== null
  ) {
    return true;
  }
  if (
    id === "conn_hoka_additive" &&
    nominalLinkMarkerRelationAt(ctx.tokens, ctx.after + pattern.triggerLength, {
      consumers: ["post_aux"]
    }) !== null
  ) {
    return true;
  }
  if (
    id === "conn_hoka_additive" &&
    pos0in(ctx.tokens[ctx.after + pattern.triggerLength]?.pos ?? 0, (1 << 名詞) | (1 << 代名詞) | (1 << 接尾辞)) &&
    !ctx.cursor.lookahead(ctx.after + pattern.triggerLength - ctx.cursor.pos, hokaBareNounContinuationLooksAdditive)
  ) {
    return true;
  }
  if (id === "conn_hoka_additive" && matchHokaAdditiveConnectiveStart(ctx.cursor) !== null) {
    return true;
  }
  if (id === "conn_node" && looksPronominalNoDe(ctx.cursor)) {
    return true;
  }
  if (id === "conn_ka" && matchPreEntryKaNoYouFamilyStart(ctx.cursor)) {
    return true;
  }
  if (id === "conn_ka" && isRawKaDouKaSecondKaDuplicate(runtimeTokensFromMatcher(ctx.tokens), ctx.after)) {
    return true;
  }
  if (id === "conn_ka" && isWhAdverbKaMarker(runtimeTokensFromMatcher(ctx.tokens), ctx.after, lookups)) {
    return true;
  }
  if (id === "conn_ka" && participatesInStructuralKaParallel(ctx.cursor, lookups)) {
    return true;
  }
  if (id === "conn_ka" && looksPredicateChoiceKaClauseBoundary(ctx.cursor, lookups)) {
    return true;
  }
  if (
    (id === "conn_ka" && isDirectQuoteTerminalKa(ctx.cursor)) ||
    (
      id === "conn_noka" &&
      (
        hasTerminalNoKaNear(ctx.cursor, lookups) ||
        isDirectQuoteTerminalKa(ctx.cursor) ||
        ctx.cursor.lookahead(1, isDirectQuoteTerminalKa) ||
        ctx.cursor.lookahead(pattern.triggerLength - 1, isDirectQuoteTerminalKa)
      )
    )
  ) {
    return true;
  }
  if (id === "conn_kato" && questionContentRelationForPostAux(ctx, { id }, lookups) !== null) {
    return true;
  }
  if (
    id === "conn_kadouka" &&
    kaOwnershipKindAt(runtimeTokensFromMatcher(ctx.tokens), ctx.after, lookups) !== "kadouka"
  ) {
    return true;
  }
  if (
    id === "conn_kadouka" &&
    ctx.auxTokens.length === 0 &&
    (ctx.koreanPos === 명사 || ctx.koreanPos === 대명사 || ctx.koreanPos === 수사) &&
    tailKaCanOwnNominalKadouka(ctx)
  ) {
    return true;
  }
  if (id === "conn_kadouka" && questionContentRelationForPostAux(ctx, { id }, lookups) !== null) {
    return true;
  }
  if (
    id === "conn_kato" &&
    ctx.auxTokens.length === 0 &&
    (() => {
      const kaContinuation = questionContentContinuationAfterKaRelationAt(ctx.tokens, ctx.after, {
        consumers: ["quote_content"],
        limit: end,
        requireAdjacent: true
      });
      return kaContinuation?.continuationKind === "question_quote_marker" &&
        ctx.cursor.lookahead(kaContinuation.span.endExclusive - ctx.cursor.pos, c => looksQuoteQuestionTakingAfter(c, lookups));
    })()
  ) {
    return true;
  }
  if (id === "conn_ka") {
    const connKaClass = classifyConnKaPostAuxSemanticClass(ctx.cursor, lookups);
    if ([
      "conn_ka:question_external_suffix",
      "conn_ka:question_quote_to",
      "conn_ka:predicate_question_content",
      "conn_ka:nominal_question_content",
      "conn_ka:question_content_candidate",
      "conn_ka:question_nominalized_by_particle"
    ].includes(connKaClass)) {
      return true;
    }
    if (connKaClass === "conn_ka:indefinite_nominal_or_choice") {
      return true;
    }
  }
  if (id === "conn_node" && ctx.after + 2 < end) {
    const emphTail = ctx.tokens[ctx.after + 2];
    if (
      emphTail !== undefined &&
      pos0in(emphTail.pos, INFLECTABLE_BITS) &&
      (emphTail.pos & POS1) === 非自立可能 &&
      (emphTail.dictionaryForm === "ある" || emphTail.dictionaryForm === "ない")
    ) {
      return true;
    }
  }
  if (id === "conn_mono_no" && shouldSuppressConnMonoNo(ctx.cursor, { hostPos0: ctx.pos0 })) {
    return true;
  }
  if (id === "conn_mono_no" && matchMonoNoConcessiveConnectiveStart(ctx.cursor) !== null) {
    return true;
  }
  if (id === "conn_to" && shouldSuppressConnToForQuoteHost(ctx.cursor, lookups)) {
    return true;
  }
  if (
    id === "conn_to" &&
    canApplyPostAux(ctx) &&
    conditionalToConnectiveRelationAt(ctx.tokens, ctx.after, { consumers: ["post_aux"] }) !== null
  ) {
    return true;
  }
  if (id === "conn_to") {
    const evidenceWindow = conditionalDiscoveryEvidenceWindowForToken(ctx.tokens, ctx.after, lookups);
    if (
      conditionalSourceAllowsRetrospectiveDiscovery(ctx.tokens, ctx.after, lookups) &&
      hasRetrospectiveDiscoveryCueAfter(ctx.tokens, ctx.after + 1, evidenceWindow, lookups)
    ) {
      return true;
    }
  }
  if (id === "conc_mo" && ctx.pos0 !== 動詞) {
    return true;
  }
  if ((id === "modal_shika_nai" || id === "modal_shika_nai_polite") && ctx.pos0 !== 動詞) {
    return true;
  }
  if (
    [
      "modal_hoka_nai",
      "modal_hoka_nai_kanji",
      "modal_hoka_nu",
      "modal_hoka_nu_kanji",
      "modal_hoka_nai_polite"
    ].includes(id) &&
    ctx.pos0 !== 動詞
  ) {
    return true;
  }
  return false;
}

function tailKaCanOwnNominalKadouka(ctx: PostAuxUnsupportedContext): boolean {
  const continuation = questionContentContinuationAfterKaRelationAt(runtimeTokensFromMatcher(ctx.tokens), ctx.after, {
    consumers: ["post_aux", "tail_ka_rules"],
    limit: ctx.cursor.end
  });
  return continuation?.continuationKind === "question_alternative_marker";
}

function hasTerminalNoKaNear(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  const start = Math.max(0, cursor.pos - 2);
  const end = Math.min(cursor.end, cursor.pos + 4);
  for (let index = start; index + 1 < end; index += 1) {
    const noKa = nominalizerQuestionContentConnectiveRelationAt(cursor.tokens, index, {
      allowTerminalKa: true,
      consumers: ["clause_layout"]
    });
    if (
      noKa !== null &&
      noKa.span.endExclusive <= end &&
      cursor.lookahead(noKa.span.endExclusive - 1 - cursor.pos, c => terminalNoKaHasNoQuestionContentHost(c, lookups))
    ) {
      return true;
    }
  }
  return false;
}

function terminalNoKaHasNoQuestionContentHost(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  const next = nextNonSpaceIndex(cursor.tokens, cursor.pos + 1, cursor.end);
  if (next === null || isDirectQuoteTerminalKa(cursor.fork(cursor.pos, cursor.tokens.length))) {
    return true;
  }
  if (isClausePunctuationToken(cursor.tokens[next])) {
    const skipNominalArguments = isClauseEvidenceTransparentPunctuation(cursor.tokens[next]!);
    return !cursor.lookahead(next - cursor.pos, c => {
      const runtime = asRuntimeCursor(c);
      return looksQuestionTakingAfter(runtime, lookups, skipNominalArguments ? { skipNominalArguments: true, scope: "clause" } : {});
    });
  }
  return false;
}

function isDirectQuoteTerminalKa(cursor: TokenCursor<MatcherToken>): boolean {
  if (kaMarkerRelationAt(cursor.tokens, cursor.pos, ["quote_content"]) === null) {
    return false;
  }
  const index = cursor.pos + 1;
  while (index < cursor.end) {
    const token = cursor.tokens[index];
    return isExplicitQuoteClosingToken(token);
  }
  return false;
}

function shouldSuppressDegreeExtentPostAuxPredicate(ctx: PostAuxUnsupportedContext, lookups: LookupTables): boolean {
  const marker = ctx.tokens[ctx.after];
  if (!isDegreeExtentParticle(marker)) {
    return false;
  }
  if (!degreeExtentHasPredicateProjectionHost(ctx)) {
    return true;
  }
  const follower = ctx.tokens[ctx.after + 1];
  return follower === undefined ||
    (follower.pos & POS0) === 補助記号 ||
    nominalLinkMarkerRelationAt(ctx.tokens, ctx.after + 1, {
      consumers: ["post_aux"]
    }) !== null ||
    isSupportedDegreeExtentContinuation(ctx.tokens, ctx.after + 1, lookups);
}

function isDegreeExtentPostAuxPredicate(id: string): boolean {
  return id === "conn_hodo_predicate" ||
    id === "conn_kurai_predicate" ||
    id === "conn_gurai_predicate";
}

function degreeExtentHasPredicateProjectionHost(ctx: PostAuxUnsupportedContext): boolean {
  return ctx.pos0 === 動詞 ||
    ctx.pos0 === 形容詞0 ||
    ctx.auxTokens.length > 0;
}

function isSupportedDegreeExtentContinuation(
  tokens: readonly MatcherToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  if (pos0in(token.pos, PREDICATE_BITS)) {
    return true;
  }
  return isNominalEvidentialRashiiPredicateStart(runtimeTokensFromMatcher(tokens), idx, lookups);
}

function adjustPostAuxPattern(pattern: PostAuxPatternLike, ctx: PostAuxUnsupportedContext, lookups: LookupTables): PostAuxPatternLike {
  if (pattern.id === "conc_mo" && (ctx.token.pos & POS5A) === 連用形_) {
    return {
      ...pattern,
      mainVerbEnding: "아/어도",
      connectiveEnding: "아/어도"
    };
  }
  if (
    pattern.id === "conn_noni" &&
    looksLikePurposeEvaluationNoNi(ctx.cursor, lookups, {
      clause: noNiReachScope(ctx.cursor.tokens, ctx.cursor.pos)
    })
  ) {
    return {
      ...pattern,
      mainVerbEnding: "ㄴ/는",
      connectiveEnding: "ㄴ/는",
      tailText: " 데"
    };
  }
  return pattern;
}

function shouldSuppressConnToForQuoteHost(cursor: TokenCursor<RuntimeHaruToken>, lookups: LookupTables): boolean {
  return quoteStructuralRelationAt(cursor, lookups) !== undefined;
}

function noNiReachScope(
  tokens: readonly ClauseToken[],
  pos: number
): { readonly start: number; readonly end: number } | null {
  const end = activeProtoScopedScanEnd(tokens, pos, "evidence_window");
  return end === null ? null : { start: pos, end };
}
