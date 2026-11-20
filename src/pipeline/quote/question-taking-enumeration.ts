import {
  enumerateClausePhrasesAfter,
  type PhraseEnumerationLayout
} from "../clause-layout/phrase-enumeration.js";
import type { ClauseToken } from "../clause-layout/layout-types.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  caseParticleMarkerRelationForToken,
  predicateNominalizerRelationForToken,
  topicFocusMarkerRelationForToken
} from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import {
  POS0,
  POS01,
  形状詞,
  形容詞0,
  助詞,
  助詞_格助詞,
  助詞_係助詞,
  助詞_副助詞,
  助動詞,
  接続詞,
  感動詞,
  動詞,
  副詞,
  代名詞,
  連体詞,
  名詞,
} from "../../types/pos.js";

export function looksQuestionTakingAfterViaLayout(
  layout: PhraseEnumerationLayout,
  tokens: readonly ClauseToken[],
  startIdx: number,
  endExclusive: number,
  lookups: LookupTables,
  options: {
    readonly scope?: "clause" | "sentence";
    readonly traverseMatrixArguments?: boolean;
    readonly hostCapability?: "broad" | "content";
  } = {}
): boolean {
  const contentHosts = options.hostCapability === "content";
  const verbs = contentHosts
    ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS
    : lookups.EMBEDDED_QUESTION_BROAD_VERBS;
  const sahen = contentHosts
    ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS
    : lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS;
  const adjDa = contentHosts
    ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA
    : lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, startIdx - 1, { scope: options.scope ?? "clause" })) {
    if (item.span.start >= endExclusive) {
      break;
    }
    if (item.kind === "punctuation_weak" || item.kind === "opaque_span") {
      continue;
    }
    for (let i = item.span.start; i < item.span.endExclusive; i += 1) {
      const token = tokens[i];
      if (token === undefined) {
        return false;
      }
      const p0 = token.pos & POS0;
      if (p0 === 助詞 || p0 === 助動詞 || p0 === 副詞 || p0 === 接続詞 || p0 === 感動詞) {
        continue;
      }
      if (i >= endExclusive) {
        return false;
      }
      const dictForm = token.dictionaryForm || token.surface || "";
      if (p0 === 動詞) {
        if (verbs.has(dictForm)) {
          return true;
        }
        if (options.traverseMatrixArguments === true && predicatePhraseIsNominalizedArgument(tokens, item.span.endExclusive)) {
          break;
        }
        return false;
      }
      if (p0 === 形容詞0) {
        return false;
      }
      if (p0 === 形状詞) {
        return adjDa.has(dictForm);
      }
      if (p0 === 名詞) {
        if (sahen.has(dictForm)) return true;
        if (options.traverseMatrixArguments === true && item.markerParticleIdx !== null) continue;
        return false;
      }
      if (p0 === 代名詞 && options.traverseMatrixArguments === true && item.markerParticleIdx !== null) {
        continue;
      }
      return false;
    }
  }
  return false;
}

export function looksAttributiveQuoteSiblingQuestionContentAfterViaLayout(
  layout: PhraseEnumerationLayout,
  tokens: readonly ClauseToken[],
  kaIdx: number,
  endExclusive: number,
  lookups: LookupTables,
): boolean {
  let quotedNominalSeen = false;
  let attributiveCarrierSeen = false;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, kaIdx, { scope: "sentence" })) {
    if (item.span.start >= endExclusive) break;
    if (item.kind === "punctuation_weak") continue;
    if (!quotedNominalSeen) {
      const markerIdx = item.kind === "nominal" ? item.markerParticleIdx : null;
      const marker = markerIdx === null
        ? null
        : quoteMarkerRelationAt(tokens, markerIdx, {
          consumers: ["embedded_question_question_taking_scan"],
        });
      if (marker?.canonicalSurface !== "と" && marker?.canonicalSurface !== "って") {
        return false;
      }
      quotedNominalSeen = true;
      continue;
    }
    if (attributiveCarrierSeen) {
      return item.kind === "nominal";
    }
    if (item.kind !== "predicate_evidence" && item.kind !== "predicate") return false;
    for (let index = item.span.start; index < item.span.endExclusive; index += 1) {
      const token = tokens[index];
      const form = token?.dictionaryForm || token?.surface || "";
      if (!lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", form, "attributive_quote_carrier")) {
        continue;
      }
      attributiveCarrierSeen = true;
      break;
    }
    if (!attributiveCarrierSeen) return false;
  }
  return false;
}

function predicatePhraseIsNominalizedArgument(tokens: readonly ClauseToken[], phraseEndExclusive: number): boolean {
  const nominalizerIdx = nextNonSpaceTokenIndex(tokens, phraseEndExclusive);
  if (nominalizerIdx === null || predicateNominalizerRelationForToken(tokens[nominalizerIdx], nominalizerIdx, {
    requirement: "head_anchor",
    consumers: ["embedded_question_question_taking_scan"]
  }) === null) {
    return false;
  }
  const markerIdx = nextNonSpaceTokenIndex(tokens, nominalizerIdx + 1);
  if (markerIdx === null) {
    return false;
  }
  return caseParticleMarkerRelationForToken(tokens[markerIdx], markerIdx, {
    consumers: ["embedded_question_question_taking_scan"]
  }) !== null || topicFocusMarkerRelationForToken(tokens[markerIdx], markerIdx, {
    consumers: ["embedded_question_question_taking_scan"]
  }) !== null;
}

export function looksQuoteQuestionTakingAfterViaLayout(
  layout: PhraseEnumerationLayout,
  tokens: readonly ClauseToken[],
  startIdx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const verbs = lookups.EMBEDDED_QUESTION_BROAD_VERBS;
  const sahen = lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS;
  const adjDa = lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA;
  const timeAdverbNouns = lookups.EMBEDDED_QUESTION_TIME_ADVERB_NOUNS;
  const niSuruNouns = lookups.EMBEDDED_QUESTION_NI_SURU_NOUNS;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, startIdx - 1, { scope: "clause_with_np_bridge" })) {
    if (item.span.start >= endExclusive) {
      break;
    }
    if (item.kind === "punctuation_weak" || item.kind === "opaque_span") {
      continue;
    }
    for (let i = item.span.start; i < item.span.endExclusive; i += 1) {
      const token = tokens[i];
      if (token === undefined) {
        return false;
      }
      const p0 = token.pos & POS0;
      if (
        p0 === 助詞 || p0 === 助動詞 || p0 === 副詞 ||
        p0 === 接続詞 || p0 === 感動詞 || p0 === 連体詞 || p0 === 代名詞
      ) {
        continue;
      }
      if (i >= endExclusive) {
        return false;
      }
      const dictForm = token.dictionaryForm || token.surface || "";
      if (p0 === 動詞) {
        return verbs.has(dictForm);
      }
      if (p0 === 形容詞0) {
        return false;
      }
      if (p0 === 形状詞) {
        return adjDa.has(dictForm);
      }
      if (p0 === 名詞) {
        if (sahen.has(dictForm)) {
          return true;
        }
        if (timeAdverbNouns.has(dictForm)) {
          continue;
        }
        if (niSuruNouns.has(dictForm) && followedByNiSuru(tokens, i)) {
          return true;
        }
        const nextIdx = nextNonSpaceTokenIndex(tokens, i + 1);
        if (nextIdx !== null) {
          const nextPos01 = (tokens[nextIdx]?.pos ?? 0) & POS01;
          if (nextPos01 === 助詞_格助詞 || nextPos01 === 助詞_係助詞 || nextPos01 === 助詞_副助詞) {
            continue;
          }
        }
        return false;
      }
      return false;
    }
  }
  return false;
}

function nextNonSpaceTokenIndex(tokens: readonly ClauseToken[], from: number): number | null {
  return from < tokens.length && tokens[from] !== undefined ? from : null;
}

function followedByNiSuru(tokens: readonly ClauseToken[], nounIdx: number): boolean {
  const niIdx = nextNonSpaceTokenIndex(tokens, nounIdx + 1);
  if (niIdx === null) {
    return false;
  }
  const ni = tokens[niIdx];
  if (ni === undefined || ni.surface !== "に" || (ni.pos & POS01) !== 助詞_格助詞) {
    return false;
  }
  const suruIdx = nextNonSpaceTokenIndex(tokens, niIdx + 1);
  if (suruIdx === null) {
    return false;
  }
  const suru = tokens[suruIdx];
  if (suru === undefined || (suru.pos & POS0) !== 動詞) {
    return false;
  }
  const suruForm = suru.dictionaryForm || suru.surface || "";
  return suruForm === "する" || suruForm === "為る";
}
