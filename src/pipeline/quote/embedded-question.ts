
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TokenCursor } from "../token-cursor.js";
import { isVerbLemma } from "../matchers.js";
import { nextNonSpaceIndex, nextTransparentEvidenceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import {
  caseParticleMarkerRelationForToken,
  isQuestionParticleKaToken,
  questionContentContinuationAfterKaRelationAt
} from "../head-tail/boundary/marker.js";
import { isPoliteTerminalQuestionKaAt, conjectureCopulaQuestionKaClosesUtteranceAt } from "../head-tail/boundary/ka-ownership.js";
import {
  isTransparentBoundaryTokenForConsumer,
  transparentBoundaryAdvance
} from "../head-tail/boundary/window.js";
import { isHardTerminalPunctuationToken, isTrailingPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { activeProtoScopedScanEnd, activeProtoScopedScanStart } from "../clause-layout/proto-state.js";
import {
  adverbialConcessiveMoBindingMarkerForToken,
  nominalPhraseBindingMarkerForToken
} from "../clause-layout/nominal-binding.js";
import {
  isInterrogativeQuantitySourceToken,
  kaOwnershipKindAt,
  whIndefiniteKaKindAt
} from "../head-tail/boundary/ka-ownership.js";
import type { ClausePhraseScope } from "../clause-layout/phrase-enumeration.js";


import {
  POS0,
  POS01,
  POS012,
  感動詞,
  記号,
  形状詞,
  形容詞0,
  助詞,
  助詞_格助詞,
  助詞_係助詞,
  助詞_接続助詞,
  助詞_副助詞,
  助動詞,
  接続詞,
  代名詞,
  動詞,
  副詞,
  補助記号,
  名詞,
  名詞_普通名詞_形状詞可能,
  連体詞,
  NOMINAL_BITS,
  pos0in,
  INFLECTABLE_BITS,
  isPrefixAffixToken
} from "../../types/pos.js";
export type ConnKaPostAuxSemanticClass =
  | "conn_ka:ka_douka_fragment"
  | "conn_ka:question_external_suffix"
  | "conn_ka:question_quote_to"
  | "conn_ka:wh_adverb_marker"
  | "conn_ka:predicate_question_content"
  | "conn_ka:nominal_question_content"
  | "conn_ka:question_content_candidate"
  | "conn_ka:indefinite_nominal_or_choice"
  | "conn_ka:question_nominalized_by_particle"
  | "conn_ka:predicate_choice_or_clause_boundary"
  | "conn_ka:unclassified"
  | "conn_ka:non_ka_trace"
  | "conn_ka:missing_trigger";

type QuestionTakingScanOptions = {
  readonly verbs: ReadonlySet<string>;
  readonly sahen: ReadonlySet<string>;
  readonly adjDa: ReadonlySet<string>;
  readonly maxSkip?: number;
  readonly sahenRequiresPredicate?: boolean;
  readonly skipNominalArguments?: boolean;
  readonly scope?: ClausePhraseScope;
};

const QUESTION_TAKING_SCAN_MAX_NOMINAL_SKIPS = 3;

const QUESTION_TAKING_SCAN_DEFAULT_SCOPE: ClausePhraseScope = "evidence_window";

interface InterrogativeClauseScope {
  clauseOfToken(tokenIdx: number): { readonly start: number; readonly end: number } | undefined;
}

export function clauseContainsInterrogativeBefore(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number,
  lookups: LookupTables,
  layout?: InterrogativeClauseScope,
  options: {
    readonly lowerBoundInclusive?: number;
    readonly scope?: ClausePhraseScope;
  } = {},
): boolean {
  const structuralFloor = interrogativeScanFloor(tokens, beforeIdx, layout, options.scope);
  const floor = Math.max(structuralFloor, options.lowerBoundInclusive ?? 0);
  for (let index = beforeIdx - 1; index >= floor; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return false;
    }
    if (
      tokenIsInterrogativeLexeme(token, lookups) &&
      !interrogativeLexemeHasNonQuestionBinding(tokens, index, beforeIdx, lookups, layout, floor)
    ) {
      return true;
    }
  }
  return false;
}

export function tokenIsInterrogativeLexeme(token: RuntimeHaruToken, lookups: LookupTables): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 副詞 || pos0 === 形状詞) {
    return lookupContainsTokenForm(lookups.INTERROGATIVE_ADVERBIAL_FORMS, token);
  }
  if (pos0 === 代名詞) {
    return lookupContainsTokenForm(lookups.INTERROGATIVE_PRONOMINAL_FORMS, token);
  }
  if (pos0 === 連体詞) {
    return lookupContainsTokenForm(lookups.INTERROGATIVE_PRENOMINAL_FORMS, token);
  }
  return pos0 === 名詞 && (
    lookupContainsTokenForm(lookups.INTERROGATIVE_NOMINAL_FORMS, token) ||
    isInterrogativeQuantitySourceToken(token, lookups)
  );
}

function interrogativeLexemeHasNonQuestionBinding(
  tokens: readonly RuntimeHaruToken[],
  interrogativeIdx: number,
  beforeIdx: number,
  lookups: LookupTables,
  layout: InterrogativeClauseScope | undefined,
  clauseStart: number
): boolean {
  const scope = layout ?? {
    clauseOfToken: () => ({ start: clauseStart, end: beforeIdx })
  };
  if (nominalPhraseBindingMarkerForToken(scope, tokens, interrogativeIdx, beforeIdx) !== null) {
    return true;
  }
  if (isLexicalizedIndefiniteAt(tokens, interrogativeIdx, lookups)) {
    return true;
  }
  if (concessiveTeMoClauseBindsInterrogative(tokens, interrogativeIdx, beforeIdx)) {
    return true;
  }
  const token = tokens[interrogativeIdx];
  return token !== undefined &&
    (token.pos & POS0) === 副詞 &&
    lookupContainsTokenForm(lookups.INTERROGATIVE_CONCESSIVE_ADVERBIAL_FORMS, token) &&
    adverbialConcessiveMoBindingMarkerForToken(scope, tokens, interrogativeIdx, beforeIdx) !== null;
}

function isLexicalizedIndefiniteAt(
  tokens: readonly RuntimeHaruToken[],
  interrogativeIdx: number,
  lookups: LookupTables
): boolean {
  const token = tokens[interrogativeIdx];
  const nextIdx = nextNonSpaceIndex(tokens, interrogativeIdx + 1, tokens.length);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (token === undefined || next === undefined) {
    return false;
  }
  const combined = `${token.dictionaryForm || token.surface}${next.dictionaryForm || next.surface}`;
  return lookups.INTERROGATIVE_INDEFINITE_FORMS.has(combined);
}

function concessiveTeMoClauseBindsInterrogative(
  tokens: readonly RuntimeHaruToken[],
  interrogativeIdx: number,
  beforeIdx: number
): boolean {
  for (let index = interrogativeIdx + 1; index < beforeIdx; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if ((token.pos & POS01) !== 助詞_接続助詞) {
      continue;
    }
    const form = token.dictionaryForm || token.surface;
    if (form !== "て" && form !== "で") {
      continue;
    }
    const moIdx = nextNonSpaceIndex(tokens, index + 1, beforeIdx);
    const mo = moIdx === null ? undefined : tokens[moIdx];
    if (mo !== undefined && mo.surface === "も" && (mo.pos & POS01) === 助詞_係助詞) {
      return true;
    }
  }
  return false;
}

export function clauseContainsInterrogativeBeforeKa(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables,
  layout?: InterrogativeClauseScope,
  options: { readonly scope?: ClausePhraseScope } = {}
): boolean {
  return clauseContainsInterrogativeBefore(tokens, kaIdx, lookups, layout, options);
}

function interrogativeScanFloor(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number,
  layout: InterrogativeClauseScope | undefined,
  scope: ClausePhraseScope | undefined
): number {
  if (scope !== undefined && scope !== "clause") {
    return activeProtoScopedScanStart(tokens, beforeIdx, scope) ?? 0;
  }
  return layout?.clauseOfToken(beforeIdx)?.start ??
    activeProtoScopedScanStart(tokens, beforeIdx, "clause") ??
    0;
}

export function clauseContainsLexicalizedInterrogativeBefore(
  tokens: readonly RuntimeHaruToken[],
  beforeIdx: number,
  lookups: LookupTables,
  layout?: InterrogativeClauseScope,
  options: { readonly scope?: ClausePhraseScope } = {}
): boolean {
  const floor = interrogativeScanFloor(tokens, beforeIdx, layout, options.scope);
  for (let index = beforeIdx - 1; index >= floor; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return false;
    }
    if (lookupContainsTokenForm(lookups.INTERROGATIVE_LEXICALIZED_COMPOUND_FORMS, token)) {
      return true;
    }
  }
  return false;
}

export function clauseContainsPredicateChoiceKaBefore(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  layout?: InterrogativeClauseScope
): boolean {
  const floor = layout?.clauseOfToken(kaIdx)?.start ??
    activeProtoScopedScanStart(tokens, kaIdx, "clause") ??
    0;
  const pairedIdx = previousPairedQuestionKaIndex(tokens, kaIdx);
  return pairedIdx !== null &&
    pairedIdx >= floor &&
    isPredicateLikeBeforeKa(tokens, pairedIdx);
}

function lookupContainsTokenForm(set: ReadonlySet<string>, token: RuntimeHaruToken): boolean {
  return token.dictionaryForm.length > 0
    ? set.has(token.dictionaryForm)
    : set.has(token.surface);
}

function scopeQuestionTakingScan(
  cursor: TokenCursor<RuntimeHaruToken>,
  scope: ClausePhraseScope
): TokenCursor<RuntimeHaruToken> {
  const end = activeProtoScopedScanEnd(cursor.tokens, cursor.pos, scope);
  return end === null ? cursor : cursor.fork(cursor.pos, Math.min(cursor.end, end));
}

function looksQuestionTakingAfterImpl(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: QuestionTakingScanOptions
): boolean {
  const scanCursor = scopeQuestionTakingScan(cursor, options.scope ?? QUESTION_TAKING_SCAN_DEFAULT_SCOPE);
  const { tokens } = scanCursor;
  const n = scanCursor.end;
  let index = scanCursor.pos;
  const seen = 0;
  const maxSkip = options.maxSkip ?? 6;
  let skippedNominals = 0;
  while (index < n && seen < maxSkip) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: n,
      maxSkip: maxSkip - seen,
      isTransparentToken: (token) => {
        const p0 = token.pos & POS0;
        return p0 === 助詞 ||
          p0 === 助動詞 ||
          p0 === 副詞 ||
          p0 === 接続詞 ||
          p0 === 感動詞 ||
          isPrefixAffixToken(token);
      },
      transparentSpanEndExclusive: (candidateTokens, candidateIndex, limit) => {
        if (options.skipNominalArguments === true && isHardTerminalPunctuationToken(candidateTokens[candidateIndex])) {
          return null;
        }
        return transparentBoundaryAdvance(candidateTokens, candidateIndex, "embedded_question_question_taking_scan", {
          requirement: "token_or_parenthetical_span",
          limit
        })?.nextIndex ?? null;
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
    const p0 = token.pos & POS0;
    const surface = token.surface || "";
    const dictForm = token.dictionaryForm || surface;
    if (p0 === 動詞) {
      return options.verbs.has(dictForm);
    }
    if (p0 === 形容詞0) {
      return false;
    }
    if (p0 === 形状詞) {
      return options.adjDa.has(dictForm);
    }
    if (p0 === 名詞) {
      if (options.sahen.has(dictForm)) {
        return options.sahenRequiresPredicate === true
          ? scanCursor.lookahead(index + 1 - scanCursor.pos, nextIsSuru)
          : true;
      }
      if (options.skipNominalArguments === true && skippedNominals < QUESTION_TAKING_SCAN_MAX_NOMINAL_SKIPS) {
        skippedNominals += 1;
        index += 1;
        continue;
      }
      return false;
    }
    if (
      options.skipNominalArguments === true &&
      pos0in(p0, NOMINAL_BITS) &&
      skippedNominals < QUESTION_TAKING_SCAN_MAX_NOMINAL_SKIPS
    ) {
      skippedNominals += 1;
      index += 1;
      continue;
    }
    return false;
  }
  return false;
}

export function looksQuestionTakingAfter(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: {
    readonly maxSkip?: number;
    readonly skipNominalArguments?: boolean;
    readonly scope?: ClausePhraseScope;
    readonly hostCapability?: "broad" | "content";
  } = {}
): boolean {
  const contentHosts = options.hostCapability === "content";
  const implOptions: QuestionTakingScanOptions = {
    verbs: contentHosts
      ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_VERBS
      : lookups.EMBEDDED_QUESTION_BROAD_VERBS,
    sahen: contentHosts
      ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_SAHEN_NOUNS
      : lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS,
    adjDa: contentHosts
      ? lookups.EMBEDDED_QUESTION_CONTENT_HOST_ADJ_DA
      : lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA,
    ...(options.maxSkip === undefined ? {} : { maxSkip: options.maxSkip }),
    ...(options.skipNominalArguments === undefined ? {} : { skipNominalArguments: options.skipNominalArguments }),
    ...(options.scope === undefined ? {} : { scope: options.scope })
  };
  return looksQuestionTakingAfterImpl(cursor, implOptions);
}

function isQuestionParticleKa(token: RuntimeHaruToken | undefined): boolean {
  return isQuestionParticleKaToken(token);
}

function isTransparentKaPairScanToken(token: RuntimeHaruToken | undefined, index: number): boolean {
  return isTransparentBoundaryTokenForConsumer(token, index, "embedded_question_ka_pair_scan");
}

function hasQuestionQuoteToContinuation(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  return questionContentContinuationAfterKaRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["embedded_question"],
    limit: cursor.end
  })?.continuationKind === "question_quote_marker";
}

function isBareNominalBeforeKa(tokens: readonly RuntimeHaruToken[], kaIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return false;
  }
  const p0 = (tokens[prevIdx]?.pos ?? 0) & POS0;
  return pos0in(p0, NOMINAL_BITS);
}

function isBareAdjectivalNounBeforeKa(tokens: readonly RuntimeHaruToken[], kaIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined || (prev.pos & POS0) !== 名詞) {
    return false;
  }
  return (prev.pos & POS012) === 名詞_普通名詞_形状詞可能;
}

export function isPredicateLikeBeforeKa(tokens: readonly RuntimeHaruToken[], kaIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined) return false;
  const p0 = prev.pos & POS0;
  return p0 === 動詞 ||
    p0 === 形容詞0 ||
    p0 === 形状詞 ||
    p0 === 助動詞 ||
    (p0 === 名詞 && (prev.pos & POS012) === 名詞_普通名詞_形状詞可能);
}

function tokenForm(token: RuntimeHaruToken | undefined): string {
  return token?.dictionaryForm || token?.surface || "";
}

function isKaDouKaTail(tokens: readonly RuntimeHaruToken[], kaIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined || (tokenForm(prev) !== "どう" && prev.surface !== "どう")) {
    return false;
  }
  const beforeDouIdx = previousNonSpaceIndex(tokens, prevIdx);
  return isQuestionParticleKa(tokens[beforeDouIdx ?? -1]);
}

function isWhAdverbLikeBeforeKa(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return false;
  }
  const prev = tokens[prevIdx];
  if (prev === undefined) {
    return false;
  }
  if (kaOwnershipKindAt(tokens, kaIdx, lookups) === "wh_indefinite") {
    return false;
  }
  if (!tokenIsInterrogativeLexeme(prev, lookups)) {
    return false;
  }
  const p0 = prev.pos & POS0;
  return p0 === 副詞 || pos0in(p0, NOMINAL_BITS);
}

export function isWhAdverbKaMarker(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return isWhAdverbLikeBeforeKa(tokens, kaIdx, lookups);
}

function previousPairedQuestionKaIndex(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  options: { readonly maxSkip?: number } = {}
): number | null {
  let index = kaIdx - 1;
  let seen = 0;
  const maxSkip = options.maxSkip ?? 16;
  while (index >= 0 && seen < maxSkip) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (isQuestionParticleKa(token) && nextPairedQuestionKaIndex(tokens, index + 1, kaIdx + 1, options) === kaIdx) {
      return index;
    }
    const p0 = token.pos & POS0;
    if ((p0 === 補助記号 || p0 === 記号) && !isTransparentKaPairScanToken(token, index)) {
      return null;
    }
    index -= 1;
    seen += 1;
  }
  return null;
}

function hasWhPronounLikeBeforeKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  for (let offset = 1; offset <= cursor.pos; offset += 1) {
    const token = cursor.peek(-offset);
    if (token === undefined) {
      return false;
    }
    const p0 = token.pos & POS0;
    if (p0 === 補助記号 || p0 === 記号) {
      return false;
    }
    if (p0 === 代名詞) {
      if (lookupContainsTokenForm(lookups.INTERROGATIVE_PRONOMINAL_FORMS, token)) {
        return true;
      }
    }
  }
  return false;
}

function startsCompositeQuestionBoundaryAfterKa(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const continuation = questionContentContinuationAfterKaRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["embedded_question"],
    limit: cursor.end
  })?.continuationKind;
  return continuation === "question_quote_marker" ||
    continuation === "question_alternative_marker";
}

function startsKamoShirenaiModalAfterKa(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  const n = cursor.end;
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, n);
  if (nextIdx === null || tokens[nextIdx]?.surface !== "も") {
    return false;
  }
  const afterMoIdx = nextNonSpaceIndex(tokens, nextIdx + 1, n);
  const afterMo = afterMoIdx === null ? undefined : tokens[afterMoIdx];
  const form = tokenForm(afterMo);
  return form === "知れる" || afterMo?.surface === "しれ" || afterMo?.surface === "知れ";
}

function hasPredicateContinuationAfterKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly maxSkip?: number } = {}
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  const n = cursor.end;
  let index = nextNonSpaceIndex(tokens, kaIdx + 1, n);
  let seen = 0;
  const maxSkip = options.maxSkip ?? 20;
  while (index !== null && index < n && seen < maxSkip) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: n,
      maxSkip: maxSkip - seen,
      transparentSpanEndExclusive: (candidateTokens, candidateIndex, limit) =>
        transparentBoundaryAdvance(candidateTokens, candidateIndex, "embedded_question_predicate_continuation", {
          requirement: "token_or_parenthetical_span",
          limit
        })?.nextIndex ?? null
    });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    seen += evidence.skipped;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const p0 = token.pos & POS0;
    const surface = token.surface || "";
    if (p0 === 補助記号 || p0 === 記号) {
      return false;
    }
    if (isQuestionParticleKa(token)) {
      return false;
    }
    if (p0 === 助詞 && (surface === "は" || surface === "が" || surface === "も")) {
      return false;
    }
    if (pos0in(p0, INFLECTABLE_BITS)) {
      return true;
    }
    if (p0 === 名詞) {
      const nextIdx = nextNonSpaceIndex(tokens, index + 1, n);
      const next = nextIdx === null ? undefined : tokens[nextIdx];
      if (next !== undefined && isVerbLemma(next, "する")) {
        return true;
      }
    }
    index = nextNonSpaceIndex(tokens, index + 1, n);
    seen += 1;
  }
  return false;
}

function hasQuestionKaBeforeStrongBoundary(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens } = cursor;
  const n = cursor.end;
  let index = cursor.pos;
  while (index < n) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const p0 = token.pos & POS0;
    if (p0 === 補助記号 || p0 === 記号) {
      return false;
    }
    if (isQuestionParticleKa(token)) {
      return true;
    }
    index += 1;
  }
  return false;
}

function nextPairedQuestionKaIndex(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  options: { readonly maxSkip?: number } = {}
): number | null {
  let index = start;
  let seen = 0;
  const maxSkip = options.maxSkip ?? 16;
  while (index < end && seen < maxSkip) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (isQuestionParticleKa(token)) {
      return index;
    }
    const p0 = token.pos & POS0;
    if ((p0 === 補助記号 || p0 === 記号) && !isTransparentKaPairScanToken(token, index)) {
      return null;
    }
    index += 1;
    seen += 1;
  }
  return null;
}

export function looksEmbeddedQuestionKaBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly maxSkip?: number; readonly scope?: ClausePhraseScope } = {}
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  if (!isPredicateQuestionContentKaCandidate(cursor, lookups)) {
    return false;
  }
  if (isPoliteTerminalQuestionKaAt(tokens, kaIdx, lookups)) {
    return false;
  }
  if (cursor.lookahead(1, c => looksQuestionTakingAfter(c, lookups, options))) {
    return true;
  }
  return false;
}

export function isPredicateQuestionContentKaCandidate(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
): boolean {
  return isQuestionParticleKa(cursor.tokens[cursor.pos]) &&
    !conjectureCopulaQuestionKaClosesUtteranceAt(cursor.tokens, cursor.pos) &&
    kaOwnershipKindAt(cursor.tokens, cursor.pos, lookups) !== "self_question_kana" &&
    !isBareNominalBeforeKa(cursor.tokens, cursor.pos) &&
    !startsCompositeQuestionBoundaryAfterKa(cursor);
}

export function looksEmbeddedQuestionKaNominalizedBoundary(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  if (!isPredicateLikeBeforeKa(tokens, kaIdx)) {
    return false;
  }
  if (startsCompositeQuestionBoundaryAfterKa(cursor)) {
    return false;
  }
  if (startsKamoShirenaiModalAfterKa(cursor)) {
    return false;
  }
  return looksQuestionContentNominalizedAfterKa(cursor);
}

export function looksQuestionContentNominalizedAfterKa(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  if (startsKamoShirenaiModalAfterKa(cursor)) {
    return false;
  }
  return questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["embedded_question"],
    limit: cursor.end
  }) !== null;
}

export function looksEmbeddedQuestionKaExternalSuffixBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  if (!isPredicateLikeBeforeKa(tokens, kaIdx)) {
    return false;
  }
  if (hasWhPronounLikeBeforeKa(cursor, lookups)) {
    return false;
  }
  if (startsCompositeQuestionBoundaryAfterKa(cursor)) {
    return false;
  }
  if (startsKamoShirenaiModalAfterKa(cursor)) {
    return false;
  }
  return questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["embedded_question"],
    limit: cursor.end
  })?.continuationKind === "question_external_suffix";
}

export function looksPredicateChoiceKaClauseBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly scope?: ClausePhraseScope } = {}
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  const n = cursor.end;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  if (!isPredicateLikeBeforeKa(tokens, kaIdx)) {
    return false;
  }
  if (conjectureCopulaQuestionKaClosesUtteranceAt(tokens, kaIdx, lookups)) {
    return false;
  }
  if (startsCompositeQuestionBoundaryAfterKa(cursor)) {
    return false;
  }
  if (startsKamoShirenaiModalAfterKa(cursor)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, n);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined) {
    return false;
  }
  if (questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["embedded_question"],
    limit: n
  })?.continuationKind === "question_copula_de") {
    return false;
  }
  if ((next.pos & POS0) === 助詞) {
    return false;
  }
  if (cursor.lookahead(1, hasQuestionKaBeforeStrongBoundary)) {
    return false;
  }
  if (previousPairedQuestionKaIndex(tokens, kaIdx, { maxSkip: 80 }) !== null) {
    return false;
  }
  if (cursor.lookahead(1, c => looksQuestionTakingAfter(c, lookups, options))) {
    return false;
  }
  return hasPredicateContinuationAfterKa(cursor);
}

export function looksEmbeddedQuestionKaAdjectivalNounBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly maxSkip?: number; readonly scope?: ClausePhraseScope } = {}
): boolean {
  const { tokens, pos: kaIdx } = cursor;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  if (!isBareAdjectivalNounBeforeKa(tokens, kaIdx)) {
    return false;
  }
  if (startsCompositeQuestionBoundaryAfterKa(cursor)) {
    return false;
  }
  if (startsKamoShirenaiModalAfterKa(cursor)) {
    return false;
  }
  return cursor.lookahead(1, c =>
    looksQuestionTakingAfter(c, lookups, options) ||
    looksNarrowQuestionTakingAfter(c, lookups, options)
  );
}

export function isRawKaDouKaSecondKaDuplicate(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number
): boolean {
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return false;
  }
  const douIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (douIdx === null) {
    return false;
  }
  const dou = tokens[douIdx];
  if (dou === undefined || (dou.surface !== "どう" && dou.dictionaryForm !== "どう")) {
    return false;
  }
  const firstKaIdx = previousNonSpaceIndex(tokens, douIdx);
  const firstKa = firstKaIdx === null ? undefined : tokens[firstKaIdx];
  return isQuestionParticleKa(firstKa) && ((firstKa?.pos ?? 0) & POS01) === 助詞_副助詞;
}

export function classifyConnKaPostAuxSemanticClass(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): ConnKaPostAuxSemanticClass {
  const { tokens, pos: kaIdx } = cursor;
  if (!isQuestionParticleKa(tokens[kaIdx])) {
    return "conn_ka:non_ka_trace";
  }

  if (isKaDouKaTail(tokens, kaIdx)) {
    return "conn_ka:ka_douka_fragment";
  }
  if (looksEmbeddedQuestionKaExternalSuffixBoundary(cursor, lookups)) {
    return "conn_ka:question_external_suffix";
  }
  if (hasQuestionQuoteToContinuation(cursor)) {
    return "conn_ka:question_quote_to";
  }
  const kaContinuation = questionContentContinuationAfterKaRelationAt(tokens, kaIdx, {
    consumers: ["embedded_question"],
    limit: cursor.end
  });
  if (kaContinuation?.continuationKind === "question_alternative_marker") {
    return "conn_ka:ka_douka_fragment";
  }
  const whIndefiniteKind = whIndefiniteKaKindAt(tokens, kaIdx, lookups);
  const whIndefiniteQuestionTaking = (whIndefiniteKind === "pronominal" || whIndefiniteKind === "counter_quantity") &&
    cursor.lookahead(1, c => looksNarrowQuestionTakingAfter(c, lookups, { sahenRequiresPredicate: true }));
  if (
    kaOwnershipKindAt(tokens, kaIdx, lookups) === "wh_indefinite" &&
    !whIndefiniteQuestionTaking
  ) {
    return "conn_ka:indefinite_nominal_or_choice";
  }
  if (isWhAdverbLikeBeforeKa(tokens, kaIdx, lookups)) {
    return "conn_ka:wh_adverb_marker";
  }

  if (conjectureCopulaQuestionKaClosesUtteranceAt(tokens, kaIdx, lookups)) {
    return "conn_ka:unclassified";
  }
  if (looksEmbeddedQuestionKaBoundary(cursor, lookups)) {
    return "conn_ka:predicate_question_content";
  }
  if (looksEmbeddedQuestionKaAdjectivalNounBoundary(cursor, lookups)) {
    return "conn_ka:nominal_question_content";
  }
  const hasQuestionTakingAfter = cursor.lookahead(1, c =>
    looksNarrowQuestionTakingAfter(c, lookups) ||
    looksQuestionTakingAfter(c, lookups)
  );
  if (hasQuestionTakingAfter) {
    return isBareNominalBeforeKa(tokens, kaIdx)
      ? "conn_ka:nominal_question_content"
      : "conn_ka:question_content_candidate";
  }
  if (isBareNominalBeforeKa(tokens, kaIdx)) {
    return "conn_ka:indefinite_nominal_or_choice";
  }
  if (
    looksEmbeddedQuestionKaNominalizedBoundary(cursor)
  ) {
    return "conn_ka:question_nominalized_by_particle";
  }
  if (looksPredicateChoiceKaClauseBoundary(cursor, lookups)) {
    return "conn_ka:predicate_choice_or_clause_boundary";
  }
  if (isPredicateLikeBeforeKa(tokens, kaIdx)) {
    return "conn_ka:predicate_choice_or_clause_boundary";
  }
  return "conn_ka:unclassified";
}

export function looksNarrowQuestionTakingAfter(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: {
    readonly maxSkip?: number;
    readonly sahenRequiresPredicate?: boolean;
    readonly scope?: ClausePhraseScope;
  } = {}
): boolean {
  const implOptions: QuestionTakingScanOptions = {
    verbs: lookups.EMBEDDED_QUESTION_NARROW_VERBS,
    sahen: lookups.EMBEDDED_QUESTION_NARROW_SAHEN_NOUNS,
    adjDa: lookups.EMBEDDED_QUESTION_NARROW_ADJ_DA,
    ...(options.maxSkip === undefined ? {} : { maxSkip: options.maxSkip }),
    ...(options.sahenRequiresPredicate === undefined ? {} : { sahenRequiresPredicate: options.sahenRequiresPredicate }),
    ...(options.scope === undefined ? {} : { scope: options.scope })
  };
  return looksQuestionTakingAfterImpl(cursor, implOptions);
}

export function looksQuoteQuestionTakingAfter(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  options: { readonly maxSkip?: number; readonly scope?: ClausePhraseScope } = {}
): boolean {
  const scanCursor = scopeQuestionTakingScan(cursor, options.scope ?? QUESTION_TAKING_SCAN_DEFAULT_SCOPE);
  const { tokens } = scanCursor;
  const n = scanCursor.end;
  let index = scanCursor.pos;
  let seen = 0;
  const maxSkip = options.maxSkip ?? 12;
  while (index < n && seen < maxSkip) {
    const evidence = nextTransparentEvidenceIndex(tokens, index, {
      endExclusive: n,
      maxSkip: maxSkip - seen,
      isTransparentToken: (token) => {
        const p0 = token.pos & POS0;
        return p0 === 助詞 ||
          p0 === 助動詞 ||
          p0 === 副詞 ||
          p0 === 接続詞 ||
          p0 === 感動詞 ||
          p0 === 連体詞 ||
          p0 === 代名詞;
      },
      transparentSpanEndExclusive: (candidateTokens, candidateIndex, limit) =>
        transparentBoundaryAdvance(candidateTokens, candidateIndex, "quote_content", {
          requirement: "token_or_parenthetical_span",
          limit
        })?.nextIndex ?? null
    });
    if (evidence === null) {
      return false;
    }
    index = evidence.index;
    seen += evidence.skipped;
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const p0 = token.pos & POS0;
    const surface = token.surface || "";
    const dictForm = token.dictionaryForm || surface;
    if (p0 === 動詞) {
      return lookups.EMBEDDED_QUESTION_BROAD_VERBS.has(dictForm);
    }
    if (p0 === 形容詞0) {
      return false;
    }
    if (p0 === 形状詞) {
      return lookups.EMBEDDED_QUESTION_BROAD_ADJ_DA.has(dictForm);
    }
    if (p0 === 名詞) {
      if (lookups.EMBEDDED_QUESTION_TIME_ADVERB_NOUNS.has(dictForm)) {
        index += 1;
        seen += 1;
        continue;
      }
      if (lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS.has(dictForm) && scanCursor.lookahead(index + 1 - scanCursor.pos, nextIsSuru)) {
        return true;
      }
      if (lookups.EMBEDDED_QUESTION_NI_SURU_NOUNS.has(dictForm) && scanCursor.lookahead(index + 1 - scanCursor.pos, nextIsNiSuru)) {
        return true;
      }
      if (lookups.EMBEDDED_QUESTION_BROAD_SAHEN_NOUNS.has(dictForm)) {
        return true;
      }
      if (index + 1 < n) {
        const nextPos01 = (scanCursor.fork(index, n).peek(1)?.pos ?? 0) & POS01;
        if (nextPos01 === 助詞_格助詞 || nextPos01 === 助詞_係助詞 || nextPos01 === 助詞_副助詞) {
          index += 1;
          seen += 1;
          continue;
        }
      }
      return false;
    }
    return false;
  }
  return false;
}

export function quotedSpeakerRealizationKaHostAllows(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  endExclusive: number,
  lookups: LookupTables
): boolean {
  const closeIdx = kaIdx + 1;
  const closeTok = tokens[closeIdx];
  if (closeTok === undefined || !isTrailingPunctuationToken(closeTok)) {
    return true;
  }
  const markerIdx = closeIdx + 1;
  if (markerIdx >= endExclusive || !isQuoteBridgeMarkerToken(tokens, markerIdx)) {
    return true;
  }
  const cursor = new TokenCursor(tokens, markerIdx + 1, endExclusive);
  return !looksQuoteQuestionTakingAfter(cursor, lookups);
}

function isQuoteBridgeMarkerToken(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const marker = quoteMarkerRelationAt(tokens, index, { consumers: ["tail_ka_rules"] });
  return (marker?.canonicalSurface === "と" || marker?.canonicalSurface === "って") &&
    ((tokens[index]?.pos ?? 0) & POS0) === 助詞;
}

function nextIsSuru(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const index = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end);
  const token = index === null ? undefined : cursor.tokens[index];
  return token !== undefined && isVerbLemma(token, "する");
}

function nextIsNiSuru(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const index = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end);
  const token = index === null ? undefined : cursor.tokens[index];
  if (index === null) {
    return false;
  }
  if (caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: ["に"],
    consumers: ["embedded_question_question_taking_scan"]
  }) !== null) {
    return cursor.lookahead(index + 1 - cursor.pos, nextIsSuru);
  }
  return false;
}
