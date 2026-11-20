import { toiuAttributiveHeadIndex } from "../semantics/marker-roles.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import { caseParticleMarkerRelationForToken, predicateNominalizerRelationForToken, quoteHostSearchBridgeArgumentRelationAt } from "../head-tail/boundary/marker.js";
import { quoteMarkerContinuationRelationAt, quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { nextNonSpaceIndex } from "./trivia.js";
import { POS0, POS1, isSahenCapableNominal, pos0in, TRIVIA_BITS, 格助詞, 形状詞, 形容詞0, 助詞, 動詞, 副詞 } from "../../types/pos.js";
import type { QuoteSpanLabel, QuoteSpanConfidence, MarkedPredicateKind, ToiuNounShape, QuoteTailKind, NominalizingTailKind, InternalPredicatePosClass, SpanLengthBucket, ClauseToken } from "./layout-types.js";
import { isSubjectTopicParticle, isNounishToken } from "./token-evidence.js";
import { indicesInRange } from "./trivia.js";
import { type PredicateLike, sourceContextMayBePredicateAt } from "./predicate-shape.js";

const SAFE_REPORTING_LEMMA = new Set([
  "言う", "いう",
  "述べる", "告げる", "話す", "語る", "喋る", "叫ぶ", "囁く", "伝える",
  "書く", "記す", "答える", "応える", "主張する", "報告する", "宣言する"
]);
const THOUGHT_REPORTING_LEMMA = new Set(["思う", "考える", "信じる", "感じる", "予想する", "予測する", "推測する", "想像する", "期待する", "望む", "願う", "祈る"]);
const NAMING_PRONE_LEMMA = new Set(["呼ぶ", "名付ける", "称する", "定義する", "見なす", "扱う", "位置付ける"]);
const CLEAR_DESCRIPTIVE_LEMMA = new Set(["表す", "表現する", "形容する", "見える", "聞こえる", "響く"]);
const SPEECH_CONTENT_HEAD = new Set([
  "話", "言葉", "発言", "意見", "噂", "主張", "報告", "証言", "説明",
  "記録", "記事", "発表", "声明", "申告", "答え", "返事", "質問", "命令",
  "指示", "内容", "情報", "知らせ", "文言", "理由", "定説", "主旨", "訴え",
  "考え", "認識", "判断", "結論"
]);

export class QuoteSpanSignals {
  constructor(
    readonly options: {
      hasNamingFrame?: boolean;
      toiuNounShape?: ToiuNounShape;
      hasInternalCaseFrame?: boolean;
      hasInternalSubjectFrame?: boolean;
      hasExplicitQuotativeMarker?: boolean;
      nearbyReportingPredicate?: boolean;
      internalHeadIsSahenCapableNoun?: boolean;
      tailKind?: QuoteTailKind;
      spanLengthBucket?: SpanLengthBucket;
      markedPredicateKind?: MarkedPredicateKind;
    } = {}
  ) { }

  get hasNamingFrame(): boolean { return this.options.hasNamingFrame ?? false; }
  get toiuNounShape(): ToiuNounShape { return this.options.toiuNounShape ?? "none"; }
  get hasInternalCaseFrame(): boolean { return this.options.hasInternalCaseFrame ?? false; }
  get hasInternalSubjectFrame(): boolean { return this.options.hasInternalSubjectFrame ?? false; }
  get hasExplicitQuotativeMarker(): boolean { return this.options.hasExplicitQuotativeMarker ?? false; }
  get nearbyReportingPredicate(): boolean { return this.options.nearbyReportingPredicate ?? false; }
  get internalHeadIsSahenCapableNoun(): boolean { return this.options.internalHeadIsSahenCapableNoun ?? false; }
  get tailKind(): QuoteTailKind { return this.options.tailKind ?? "none"; }
  get spanLengthBucket(): SpanLengthBucket { return this.options.spanLengthBucket ?? "1_3"; }
  get markedPredicateKind(): MarkedPredicateKind { return this.options.markedPredicateKind ?? "unknown"; }
}

export class QuoteSpanInfo {
  constructor(
    readonly span: readonly [number, number],
    readonly label: QuoteSpanLabel,
    readonly confidence: QuoteSpanConfidence,
    readonly signals: QuoteSpanSignals = new QuoteSpanSignals()
  ) { }
}

export function classifyQuoteSpans(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  quoteSpans: readonly (readonly [number, number])[]
): readonly QuoteSpanInfo[] {
  return quoteSpans.map((span) => classifyQuoteSpan(tokens, contentEntries, span));
}

function classifyQuoteSpan(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  span: readonly [number, number]
): QuoteSpanInfo {
  const [start, end] = span;
  const innerIndices = quoteInnerTokenIndices(tokens, start, end);
  let predicateCount = 0;
  for (const [idx, contentSpan] of contentEntries) {
    if (start < idx && idx < end && sourceContextMayBePredicateAt(tokens, idx, contentSpan, { limit: end })) {
      predicateCount += 1;
    }
  }
  const hasInternalCaseFrame = predicateCount >= 1 && innerIndices.some((idx) => isCaseParticle(tokens[idx]!));
  const hasInternalSubjectFrame = predicateCount >= 1 && innerIndices.some((idx) => isSubjectTopicParticle(tokens[idx]!));
  const internalShape = quoteInternalShape(tokens, innerIndices, predicateCount);
  const internalHead = quoteInternalHead(tokens, innerIndices);
  const internalHeadIsSahenCapableNoun = internalHead !== undefined && isSahenCapableNominal(internalHead);
  const internalPredicatePosClass = quoteInternalPredicatePosClass(tokens, innerIndices, predicateCount);
  const [tailKind] = tailAfterQuote(tokens, end);
  const nominalizingTailKind = nominalizingTailAfterQuote(tokens, end);
  const hasNominalizingTail = nominalizingTailKind !== "none";
  const [hasPrecedingObjectWo, precedingObjectNounish] = precedingObjectWoContext(tokens, start);
  const hasDescriptive = hasDescriptiveFrame(tokens, end);
  const toiuHead = toiuNounHead(tokens, end);
  const toiuNounShape = tailKind === "toiu_noun" ? internalShape : "none";
  const hasNonToiuNamingFrame = hasNonToiuNamingFrameAfterQuote(tokens, end);
  const hasNamingFrame = hasNonToiuNamingFrame || tailKind === "toiu_noun";
  const hasExplicitQuotativeMarker = tailKind === "to_safe_reporting" || tailKind === "to_thought" || tailKind === "to_other" || tailKind === "toiu_noun";
  const nearbyReportingPredicate = hasNearbyReportingPredicate(tokens, end);
  const spanLengthBucketValue = spanLengthBucket(innerIndices.length);

  let label: QuoteSpanLabel = "unknown";
  let confidence: QuoteSpanConfidence = "low";
  let markedPredicateKind: MarkedPredicateKind = "unknown";

  if (hasNonToiuNamingFrame) {
    label = "nominal_quote";
    confidence = "high";
  } else if (tailKind === "toiu_noun") {
    if (toiuNounShape === "nominal_like") {
      label = "nominal_quote";
      confidence = "high";
    } else if (toiuNounShape === "subject_predicate" && toiuHead !== undefined && SPEECH_CONTENT_HEAD.has(toiuHead.dictionaryForm || toiuHead.surface)) {
      label = "full_quote_island";
      confidence = "medium";
    }
  } else if (tailKind === "to_safe_reporting") {
    label = "full_quote_island";
    confidence = hasInternalSubjectFrame ? "high" : "medium";
  } else if (tailKind === "to_thought") {
    label = "full_quote_island";
    confidence = "medium";
  } else if (hasSahenSuruFrame(tokens, end, internalHeadIsSahenCapableNoun)) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "sahen_action_noun";
  } else if (hasNominalizingTail && predicateCount >= 1) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "nominalized_predicate";
  } else if (
    hasPrecedingObjectWo &&
    precedingObjectNounish &&
    internalPredicatePosClass === "verb"
  ) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "verb_or_stem";
  } else if ((internalPredicatePosClass === "adjective" || internalPredicatePosClass === "mimetic_or_adverb") && hasDescriptive) {
    label = "marked_predicate";
    confidence = "medium";
    markedPredicateKind = "adjective_or_mimetic";
  } else if (tailKind === "wo" || tailKind === "ga_ha_mo" || tailKind === "no" || tailKind === "toshite" || tailKind === "other_particle") {
    label = "nominal_quote";
    confidence = "medium";
  } else if (
    hasInternalSubjectFrame &&
    tailKind !== "none" &&
    (hasExplicitQuotativeMarker || (toiuHead !== undefined && SPEECH_CONTENT_HEAD.has(toiuHead.dictionaryForm || toiuHead.surface)))
  ) {
    label = "full_quote_island";
    confidence = "medium";
  }

  return new QuoteSpanInfo(
    span,
    label,
    confidence,
    new QuoteSpanSignals({
      hasNamingFrame,
      toiuNounShape,
      hasInternalCaseFrame,
      hasInternalSubjectFrame,
      hasExplicitQuotativeMarker,
      nearbyReportingPredicate,
      internalHeadIsSahenCapableNoun,
      tailKind,
      spanLengthBucket: spanLengthBucketValue,
      markedPredicateKind
    })
  );
}

export function spanKeySet(spans: ReadonlySet<readonly [number, number]>): string {
  return [...spans].map(([start, end]) => `${start}:${end}`).sort().join("|");
}

export function sameSpan(left: readonly [number, number], right: readonly [number, number]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function quoteInnerTokenIndices(tokens: readonly ClauseToken[], start: number, end: number): readonly number[] {
  return indicesInRange(start + 1, end);
}

function isContentToken(token: ClauseToken): boolean {
  return !pos0in(token.pos, TRIVIA_BITS);
}

function quoteInternalShape(tokens: readonly ClauseToken[], innerIndices: readonly number[], predicateCount: number): ToiuNounShape {
  const caseCount = innerIndices.filter((idx) => isCaseParticle(tokens[idx]!)).length;
  const subjectCount = innerIndices.filter((idx) => isSubjectTopicParticle(tokens[idx]!)).length;
  if (predicateCount === 0 && caseCount === 0) {
    return "nominal_like";
  }
  if (predicateCount >= 1 && subjectCount >= 1) {
    return "subject_predicate";
  }
  if (predicateCount >= 1 && caseCount >= 1) {
    return "case_predicate";
  }
  if (predicateCount >= 1) {
    return "predicate_no_case";
  }
  if (caseCount >= 1) {
    return "case_no_predicate";
  }
  return "other";
}

function quoteInternalHead(tokens: readonly ClauseToken[], innerIndices: readonly number[]): ClauseToken | undefined {
  for (let offset = innerIndices.length - 1; offset >= 0; offset -= 1) {
    const token = tokens[innerIndices[offset] as number];
    if (token !== undefined && isNounishToken(token)) {
      return token;
    }
  }
  return undefined;
}

function quoteInternalPredicatePosClass(tokens: readonly ClauseToken[], innerIndices: readonly number[], predicateCount: number): InternalPredicatePosClass {
  const contentIndices = innerIndices.filter((idx) => {
    const token = tokens[idx];
    return token !== undefined && isContentToken(token);
  });
  if (contentIndices.length === 0) {
    return "none";
  }
  if (predicateCount >= 1 && contentIndices.some((idx) => isCaseParticle(tokens[idx]!))) {
    return "mixed";
  }
  const pos0Values = new Set(contentIndices.map((idx) => (tokens[idx]?.pos ?? 0) & POS0));
  if (pos0Values.has(動詞)) {
    return "verb";
  }
  if (pos0Values.has(形容詞0) || pos0Values.has(形状詞)) {
    return "adjective";
  }
  if (pos0Values.has(副詞)) {
    return "mimetic_or_adverb";
  }
  if (contentIndices.every((idx) => isNounishToken(tokens[idx]!))) {
    return "nounish";
  }
  return "mixed";
}

function precedingObjectWoContext(tokens: readonly ClauseToken[], start: number, maxContentTokens = 3): readonly [boolean, boolean] {
  let idx = start - 1;
  let seen = 0;
  while (idx >= 0 && seen < maxContentTokens) {
    const token = tokens[idx];
    if (token === undefined || !isContentToken(token)) {
      idx -= 1;
      continue;
    }
    seen += 1;
    if (caseParticleMarkerRelationForToken(token, idx, {
      acceptedSurfaces: ["を"],
      consumers: ["clause_layout"]
    }) !== null) {
      const objectIdx = previousContentIndex(tokens, idx - 1);
      return [true, objectIdx !== undefined && isNounishToken(tokens[objectIdx]!)];
    }
    idx -= 1;
  }
  return [false, false];
}

function previousContentIndex(tokens: readonly ClauseToken[], start: number): number | undefined {
  for (let idx = start; idx >= 0; idx -= 1) {
    const token = tokens[idx];
    if (token !== undefined && isContentToken(token)) {
      return idx;
    }
  }
  return undefined;
}

function isCaseParticle(token: ClauseToken): boolean {
  return (token.pos & POS1) === 格助詞;
}

function consumeQuotativeMarker(tokens: readonly ClauseToken[], start: number): readonly [string | null, number | null] {
  const idx = nextNonSpaceIndex(tokens, start);
  if (idx === null) {
    return [null, null];
  }
  const relation = quoteMarkerRelationAt(tokens, idx, { consumers: ["clause_layout"] });
  if (relation !== null) {
    return [relation.canonicalSurface, relation.span.endExclusive];
  }
  return [null, null];
}

function tailAfterQuote(tokens: readonly ClauseToken[], end: number): readonly [QuoteTailKind, number | null] {
  const idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return ["none", null];
  }
  const token = tokens[idx]!;
  const bridgeArgument = quoteHostSearchBridgeArgumentRelationAt(tokens, idx, {
    consumers: ["clause_layout"]
  });
  if (bridgeArgument?.argumentKind === "object") {
    return ["wo", idx];
  }
  if (bridgeArgument?.argumentKind === "subject_topic") {
    return ["ga_ha_mo", idx];
  }
  if (
    predicateNominalizerRelationForToken(token, idx, {
      requirement: "quote_tail_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind === "no"
  ) {
    return ["no", idx];
  }

  if (quoteMarkerContinuationRelationAt(tokens, idx, { consumers: ["clause_layout"] }) !== null) {
    return ["toshite", idx];
  }

  const [marker, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (marker !== null && afterMarker !== null) {
    const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
    if (nextIdx === null) {
      return ["to_other", idx];
    }
    const nextLemma = tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface;
    if (
      IU_LEXEME_FORMS.has(nextLemma) &&
      toiuAttributiveHeadIndex(tokens, end + 1, tokens.length) !== null
    ) {
      return ["toiu_noun", idx];
    }
    if (SAFE_REPORTING_LEMMA.has(nextLemma)) {
      return ["to_safe_reporting", idx];
    }
    if (THOUGHT_REPORTING_LEMMA.has(nextLemma)) {
      return ["to_thought", idx];
    }
    return ["to_other", idx];
  }

  if ((token.pos & POS0) === 助詞) {
    return ["other_particle", idx];
  }
  return ["other", idx];
}

function nominalizingTailAfterQuote(tokens: readonly ClauseToken[], end: number): NominalizingTailKind {
  const idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return "none";
  }
  const token = tokens[idx]!;
  if (token.surface === "だけ") {
    return "dake";
  }
  if ((token.dictionaryForm || token.surface) === "こと") {
    return "koto";
  }
  if (
    predicateNominalizerRelationForToken(token, idx, {
      requirement: "quote_tail_marker",
      consumers: ["clause_layout"]
    })?.nominalizerKind === "no"
  ) {
    const nextIdx = nextNonSpaceIndex(tokens, idx + 1);
    if (nextIdx === null) {
      return "none";
    }
    const nextSurface = tokens[nextIdx]?.surface;
    if (nextSurface === "が") {
      return "no_ga";
    }
    if (nextSurface === "は") {
      return "no_wa";
    }
  }
  return "none";
}

function toiuNounHead(tokens: readonly ClauseToken[], end: number): ClauseToken | undefined {
  const [, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (afterMarker === null) {
    return undefined;
  }
  const iuIdx = nextNonSpaceIndex(tokens, afterMarker);
  if (iuIdx === null || !IU_LEXEME_FORMS.has(tokens[iuIdx]!.dictionaryForm || tokens[iuIdx]!.surface)) {
    return undefined;
  }
  const headIdx = toiuAttributiveHeadIndex(tokens, end + 1, tokens.length);
  if (headIdx === null || !isNounishToken(tokens[headIdx]!)) {
    return undefined;
  }
  return tokens[headIdx];
}

function hasNonToiuNamingFrameAfterQuote(tokens: readonly ClauseToken[], end: number): boolean {
  const markerIdx = nextNonSpaceIndex(tokens, end + 1);
  const continuation = markerIdx === null
    ? null
    : quoteMarkerContinuationRelationAt(tokens, markerIdx, { consumers: ["clause_layout"] });
  if (continuation !== null) {
    const afterContinuationIdx = nextNonSpaceIndex(tokens, continuation.span.endExclusive);
    if (
      afterContinuationIdx !== null &&
      NAMING_PRONE_LEMMA.has((tokens[afterContinuationIdx]!.dictionaryForm || tokens[afterContinuationIdx]!.surface))
    ) {
      return true;
    }
  }

  const [, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (afterMarker === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
  if (nextIdx === null) {
    return false;
  }
  const nextLemma = tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface;
  return NAMING_PRONE_LEMMA.has(nextLemma);
}

function hasSahenSuruFrame(tokens: readonly ClauseToken[], end: number, internalHeadIsSahenCapableNoun: boolean): boolean {
  if (!internalHeadIsSahenCapableNoun) {
    return false;
  }
  let idx = nextNonSpaceIndex(tokens, end + 1);
  if (idx === null) {
    return false;
  }
  const objectFrame = quoteHostSearchBridgeArgumentRelationAt(tokens, idx, {
    consumers: ["clause_layout"]
  });
  if (objectFrame?.argumentKind === "object") {
    idx = nextNonSpaceIndex(tokens, idx + 1);
    if (idx === null) {
      return false;
    }
  }
  return (tokens[idx]!.dictionaryForm || tokens[idx]!.surface) === "する";
}

function hasDescriptiveFrame(tokens: readonly ClauseToken[], end: number): boolean {
  const [marker, afterMarker] = consumeQuotativeMarker(tokens, end + 1);
  if (marker === null || afterMarker === null) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, afterMarker);
  return nextIdx !== null && CLEAR_DESCRIPTIVE_LEMMA.has(tokens[nextIdx]!.dictionaryForm || tokens[nextIdx]!.surface);
}

function hasNearbyReportingPredicate(tokens: readonly ClauseToken[], end: number, maxContentTokens = 5): boolean {
  let idx = end + 1;
  let seen = 0;
  while (idx < tokens.length && seen < maxContentTokens) {
    const token = tokens[idx];
    if (token !== undefined && isContentToken(token)) {
      seen += 1;
      const lemma = token.dictionaryForm || token.surface;
      if (SAFE_REPORTING_LEMMA.has(lemma) || THOUGHT_REPORTING_LEMMA.has(lemma)) {
        return true;
      }
    }
    idx += 1;
  }
  return false;
}

function spanLengthBucket(length: number): SpanLengthBucket {
  if (length <= 3) {
    return "1_3";
  }
  if (length <= 8) {
    return "4_8";
  }
  return "9_plus";
}
