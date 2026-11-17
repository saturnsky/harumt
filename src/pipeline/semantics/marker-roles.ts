
import {
  quoteHostMatchAfterMarker,
  quoteHostMatchBlockedByNegativeCondition,
  quoteHostMatchIsAttributiveIu
} from "../quote/host-taxonomy.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { isClauseEvidenceTransparentPunctuation } from "../clause-layout/punctuation.js";
import { isExplicitQuoteClosingSurface } from "../clause-layout/quote-delimiters.js";
import { NO_SEPARATIONS, nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { activeProtoScopedScanStart } from "../clause-layout/proto-state.js";
import { TokenCursor } from "../token-cursor.js";


import { POS0, POS01, POS1, POS4, POS5A, 助詞, 助詞_接続助詞, 助動詞_ダ, 助動詞_ナイ, 助動詞_ヌ, 格助詞, 記号, 係助詞, 接続詞, 動詞, 副助詞, 補助記号, 名詞, 連体形_, 終止形_, 助詞_格助詞 } from "../../types/pos.js";
import { isHiragana } from "../../utils/char-class.js";
import { isToiuAppositiveContentHead } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { prenominalModifierChainHeadIndex, type PrenominalModifierChainOptions } from "../clause-layout/attributive-head.js";
import { derivedNominalPhraseHeadIndexAt, derivedNominalPhraseStartForHead } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { isAdnominalCopulaToken, isAdverbialMannerNounHead, isLikenessModalAdnominalTailEnd } from "../head-tail/tail/predicate-root/classifiers/tokens.js";

function toiuModifierChainOptions(tokens: readonly MarkerRoleToken[]): PrenominalModifierChainOptions {
  return {
    auxiliaryStem: "transparent",
    separationRefused: NO_SEPARATIONS,
    reach: "head_required_phrase",
    derivedNominalHeadIndexAt: (hostIdx) => derivedNominalPhraseHeadIndexAt(tokens, hostIdx)
  };
}
import { isAdjNai } from "../matchers.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
type MarkerRoleToken = Pick<RuntimeHaruToken, "surface" | "dictionaryForm" | "pos">;

export type DatteRole =
  | "quote_marker"
  | "toiu_attributive_quote"
  | "terminal_reported_request"
  | "hearsay_terminal"
  | "focus_particle"
  | "causal_discourse"
  | "invalid";

export interface DatteMarkerTypedContext {
  readonly precedingRequestAspect?: "te_kudasai" | "te_kure_tanomu";
  readonly terminalBoundary?: true;
}

export class DatteMarkerRole {
  constructor(
    readonly role: DatteRole,
    readonly markerIdx: number,
    readonly consumedUntil: number,
    readonly nextIdx: number | null = null,
    readonly hostIdx: number | null = null,
    readonly supportIdx: number | null = null
  ) { }

  get isQuote(): boolean {
    return this.role === "quote_marker" ||
      this.role === "toiu_attributive_quote" ||
      this.role === "terminal_reported_request";
  }
}

export type TteParticleAllomorphKey =
  | "이라고/라고"
  | "이라는/라는"
  | "은/는";

export function resolveTteParticleAllomorphKey(
  cursor: TokenCursor<MarkerRoleToken>,
  lookups: LookupTables,
): TteParticleAllomorphKey {
  const { tokens, pos: markerIdx, end } = cursor;
  const nextIdx = nextNonSpaceIndex(tokens, markerIdx + 1, end) ?? end;
  const prevIdx = previousNonSpaceIndex(tokens, markerIdx);
  const previous = prevIdx === null ? undefined : tokens[prevIdx];
  if (nextIdx >= end) {
    return previous !== undefined && isExplicitQuoteClosingSurface(previous.surface || "")
      ? "이라고/라고"
      : "은/는";
  }
  const next = tokens[nextIdx];
  if (next === undefined) {
    return previous !== undefined && isExplicitQuoteClosingSurface(previous.surface || "")
      ? "이라고/라고"
      : "은/는";
  }
  if (
    previous !== undefined &&
    isExplicitQuoteClosingSurface(previous.surface || "") &&
    (next.pos & POS0) === 補助記号
  ) {
    return "이라고/라고";
  }
  if (IU_LEXEME_FORMS.has(next.dictionaryForm ?? "") && toiuIuStandsAsAttributiveCarrier(tokens, nextIdx)) {
    return "이라는/라는";
  }
  if ((next.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(next.dictionaryForm || "")) {
    return "이라고/라고";
  }
  if ((next.pos & POS0) === 名詞) {
    const afterNoun = nextNonSpaceIndex(tokens, nextIdx + 1, end) ?? end;
    if (afterNoun < end && ((tokens[afterNoun]?.pos ?? 0) & POS0) === 助詞) {
      return "이라는/라는";
    }
  }
  return "은/는";
}

export function isNanteQuotativeMarker(
  cursor: TokenCursor<MarkerRoleToken>,
  lookups: LookupTables,
): boolean {
  const { tokens, pos: markerIdx, end } = cursor;
  const nextIdx = nextNonSpaceIndex(tokens, markerIdx + 1, end) ?? end;
  if (nextIdx >= end) {
    return false;
  }
  const next = tokens[nextIdx];
  return next !== undefined && (next.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(next.dictionaryForm || "");
}

export function yaraIndefiniteKorean(dictionaryForm: string): string | undefined {
  switch (dictionaryForm) {
    case "何":
    case "なに":
      return "뭔가";
    case "誰":
    case "だれ":
      return "누군가";
    case "どこ":
      return "어딘가";
    case "いつ":
      return "언젠가";
    default:
      return undefined;
  }
}

export function hasNadoNegativeFollower(
  tokens: readonly MarkerRoleToken[],
  markerIdx: number,
  end = tokens.length
): boolean {
  const next = tokens[markerIdx + 1];
  const followedByMo = next !== undefined && next.surface === "も" && (next.pos & POS0) === 助詞;
  if (followedByMo) {
    return false;
  }
  const c = new TokenCursor(tokens, markerIdx + 1, Math.min(markerIdx + 10, end));
  while (c.pos < c.end) {
    const token = c.current();
    if (token === undefined) {
      break;
    }
    if (isClauseEvidenceTransparentPunctuation(token)) {
      c.advance();
      continue;
    }
    if ((token.pos & POS0) === 補助記号 || (token.pos & POS0) === 記号) {
      break;
    }
    const conjugation = (token.pos & POS4);
    if (conjugation === 助動詞_ナイ || conjugation === 助動詞_ヌ) {
      return true;
    }
    if (isAdjNai(token)) {
      return true;
    }
    c.advance();
  }
  return false;
}

const ORPHAN_CONNECTIVE_PARTICLE_KOREAN = new Map([["けど", "하지만"]]);
const KEREDO_CONNECTIVE_SURFACES = new Set(["けれど"]);

export function orphanConnectiveParticleKorean(token: MarkerRoleToken): string | undefined {
  return (token.pos & POS01) === 助詞_接続助詞
    ? ORPHAN_CONNECTIVE_PARTICLE_KOREAN.get(token.surface || "")
    : undefined;
}

export function isKeredoMoTailParticle(
  tokens: readonly MarkerRoleToken[],
  markerIdx: number
): boolean {
  const marker = tokens[markerIdx];
  const previous = markerIdx > 0 ? tokens[markerIdx - 1] : undefined;
  if (marker === undefined || previous === undefined) {
    return false;
  }
  return (
    (marker.pos & POS1) === 係助詞 &&
    marker.surface === "も" &&
    (
      ((previous.pos & POS01) === 助詞_接続助詞) ||
      ((previous.pos & POS0) === 接続詞 && KEREDO_CONNECTIVE_SURFACES.has(previous.surface || ""))
    )
  );
}

function isDiscourseInitial(tokens: readonly MarkerRoleToken[], idx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, idx);
  if (prevIdx === null) {
    return true;
  }
  const previous = tokens[prevIdx];
  return previous !== undefined && ((previous.pos & POS0) === 補助記号 || (previous.pos & POS0) === 記号);
}

export function toiuAttributiveTailEnd(tokens: readonly MarkerRoleToken[], markerIdx: number, end: number): number | null {
  const iuIdx = toiuAttributiveIuIndex(tokens, markerIdx, end);
  return iuIdx === null ? null : iuIdx + 1;
}

export function toiuAttributiveHeadIndex(tokens: readonly MarkerRoleToken[], markerIdx: number, end: number): number | null {
  const iuIdx = toiuAttributiveIuIndex(tokens, markerIdx, end);
  if (iuIdx === null) {
    return null;
  }
  return prenominalModifierChainHeadIndex(tokens, iuIdx + 1, end, toiuModifierChainOptions(tokens));
}

function carrierBoundTypifyingAdnominalTailEndAt(
  tokens: readonly MarkerRoleToken[],
  copulaIdx: number,
  lookups: LookupTables
): boolean {
  if (isLikenessModalAdnominalTailEnd(tokens, copulaIdx)) {
    return true;
  }
  return isAdnominalCopulaToken(tokens[copulaIdx]) &&
    isAdverbialMannerNounHead(tokens[copulaIdx - 1], lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS);
}

export function toiuAttributiveBoundarySplitAt(
  tokens: readonly MarkerRoleToken[],
  markerIdx: number,
  end: number,
  lookups: LookupTables
): number | null {
  const tailEnd = toiuAttributiveTailEnd(tokens, markerIdx, end);
  const headIdx = toiuAttributiveHeadIndex(tokens, markerIdx, end);
  if (tailEnd === null || headIdx === null) {
    return null;
  }
  return carrierBoundTypifyingAdnominalTailEndAt(tokens, tailEnd + 1, lookups)
    ? derivedNominalPhraseStartForHead(tokens, headIdx)
    : tailEnd;
}

export function toiuAttributiveContinuationHeadIndex(
  tokens: readonly MarkerRoleToken[],
  start: number,
  end: number
): number | null {
  return prenominalModifierChainHeadIndex(tokens, start, end, toiuModifierChainOptions(tokens));
}

function toiuAttributiveIuIndex(tokens: readonly MarkerRoleToken[], markerIdx: number, end: number): number | null {
  const iuIdx = toiuMarkerIuIndex(tokens, markerIdx, end);
  return iuIdx !== null && toiuIuStandsAsAttributiveCarrier(tokens, iuIdx, end) ? iuIdx : null;
}

export function toiuIuStandsAsAttributiveCarrier(
  tokens: readonly MarkerRoleToken[],
  iuIdx: number,
  end: number = tokens.length
): boolean {
  const iu = tokens[iuIdx];
  if (iu === undefined || (iu.pos & POS0) !== 動詞) {
    return false;
  }
  if ((iu.pos & POS5A) === 連体形_) {
    return true;
  }
  if ((iu.pos & POS5A) !== 終止形_ || !isKanaOrthography(iu.surface)) {
    return false;
  }
  const headIdx = prenominalModifierChainHeadIndex(tokens, iuIdx + 1, end, toiuModifierChainOptions(tokens));
  const head = headIdx === null ? undefined : tokens[headIdx];
  return head !== undefined && isToiuAppositiveContentHead(head);
}

function isKanaOrthography(surface: string | undefined): boolean {
  return surface !== undefined && surface.length > 0 && [...surface].every(isHiragana);
}

export function isToiuCarrierCandidateIu(tokens: readonly MarkerRoleToken[], iuIdx: number): boolean {
  for (const markerIdx of [iuIdx - 1, iuIdx - 2]) {
    if (markerIdx >= 0 && toiuMarkerIuIndex(tokens, markerIdx, iuIdx + 1) === iuIdx) {
      return true;
    }
  }
  return false;
}

function toiuMarkerIuIndex(tokens: readonly MarkerRoleToken[], markerIdx: number, end: number): number | null {
  const marker = tokens[markerIdx];
  if (markerIdx >= end || marker === undefined) {
    return null;
  }
  const markerSurface = (marker.surface || "");
  let iuSearchStart: number;
  if (markerSurface === "だ" && (marker.pos & POS4) === 助動詞_ダ) {
    const quoteIdx = nextNonSpaceIndex(tokens, markerIdx + 1, end) ?? end;
    const quote = tokens[quoteIdx];
    if (
      quoteIdx >= end || quote === undefined || (quote.pos & POS01) !== 助詞_格助詞 || quote.surface !== "と"
    ) {
      return null;
    }
    iuSearchStart = quoteIdx + 1;
  } else {
    if ((marker.pos & POS0) !== 助詞) {
      return null;
    }
    if (markerSurface === "と") {
      if ((marker.pos & POS1) !== 格助詞) {
        return null;
      }
    } else if (markerSurface === "って") {
      if ((marker.pos & POS1) !== 副助詞) {
        return null;
      }
    } else if (markerSurface !== "だって") {
      return null;
    }
    iuSearchStart = markerIdx + 1;
  }

  const iuIdx = nextNonSpaceIndex(tokens, iuSearchStart, end) ?? end;
  const iu = tokens[iuIdx];
  if (
    iuIdx >= end ||
    iu === undefined ||
    !IU_LEXEME_FORMS.has(iu.dictionaryForm ?? "") ||
    (iu.pos & POS0) !== 動詞
  ) {
    return null;
  }
  return iuIdx;
}

function precedingSiblingDatteFocusInClause(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): boolean {
  const clauseStart = activeProtoScopedScanStart(tokens, markerIdx, "clause");
  if (clauseStart === null) {
    return false;
  }
  for (let idx = markerIdx - 1; idx >= clauseStart; idx -= 1) {
    const token = tokens[idx];
    if (token !== undefined && token.surface === "だって" && (token.pos & POS0) === 助詞) {
      return true;
    }
  }
  return false;
}

export function classifyDatteMarkerAt(
  markerCursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  typedContext: DatteMarkerTypedContext = {}
): DatteMarkerRole {
  const { tokens, pos: markerIdx, end } = markerCursor;
  const marker = tokens[markerIdx];
  if (markerIdx >= end || marker === undefined || marker.surface !== "だって" || (marker.pos & POS0) !== 助詞) {
    return new DatteMarkerRole("invalid", markerIdx, markerIdx);
  }

  const toiuEnd = toiuAttributiveTailEnd(tokens, markerIdx, end);
  if (toiuEnd !== null) {
    return new DatteMarkerRole(
      "toiu_attributive_quote",
      markerIdx,
      toiuEnd,
      (nextNonSpaceIndex(tokens, markerIdx + 1, end) ?? end)
    );
  }

  const nextIdx = nextNonSpaceIndex(tokens, markerIdx + 1, end) ?? end;
  const next = tokens[nextIdx];
  const match = quoteHostMatchAfterMarker(markerCursor, lookups);
  if (
    match !== null &&
    nextIdx < end &&
    next !== undefined &&
    (next.pos & POS0) !== 補助記号 &&
    (next.pos & POS0) !== 記号 &&
    (match.hostIdx === nextIdx || match.supportIdx === nextIdx) &&
    !quoteHostMatchBlockedByNegativeCondition(markerCursor, match, lookups) &&
    !quoteHostMatchIsAttributiveIu(tokens, match)
  ) {
    return new DatteMarkerRole(
      "quote_marker",
      markerIdx,
      markerIdx + 1,
      nextIdx < end ? nextIdx : null,
      match.hostIdx,
      match.supportIdx
    );
  }

  if (
    nextIdx >= end &&
    typedContext.precedingRequestAspect === "te_kudasai" &&
    typedContext.terminalBoundary === true
  ) {
    return new DatteMarkerRole(
      "terminal_reported_request",
      markerIdx,
      markerIdx + 1
    );
  }

  if (isDiscourseInitial(tokens, markerIdx)) {
    return new DatteMarkerRole(
      "causal_discourse",
      markerIdx,
      markerIdx + 1,
      nextIdx < end ? nextIdx : null
    );
  }

  if (typedContext.terminalBoundary === true && !precedingSiblingDatteFocusInClause(tokens, markerIdx)) {
    return new DatteMarkerRole(
      "hearsay_terminal",
      markerIdx,
      markerIdx + 1,
      nextIdx < end ? nextIdx : null
    );
  }

  return new DatteMarkerRole(
    "focus_particle",
    markerIdx,
    markerIdx + 1,
    nextIdx < end ? nextIdx : null
  );
}
