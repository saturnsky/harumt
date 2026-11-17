import type { LookupTables } from "../../lookup-tables.js";
import type { MatcherToken } from "../../matchers.js";
import { TokenCursor } from "../../token-cursor.js";

import {
  MONO_NO_ADVERSATIVE_ADVERBS,
  MONO_NO_ADVERSATIVE_HEAD_NOUNS,
  MONO_NO_GENITIVE_HEAD_NOUNS
} from "../data/semantic-helper-sets.js";
import {
  caseParticleMarkerRelationForToken,
  nominalLinkMarkerRelationAt,
  nominalLinkMarkerRelationForToken,
  nominalizerAdversativeConnectiveRelationAt
} from "./marker.js";
import {
  looksLikePurposeEvaluationNoNi,
  noNiResultVerbHasFiniteAuxiliaryTail,
  looksPronominalNoNi
} from "./pronominal-no.js";

import {
  POS0,
  pos0in,
  POS2,
  POS4,
  POS5,
  POS5A,
  PREDICATE_AUX_BITS,
  PREDICATE_BITS,
  サ変可能,
  記号,
  形容詞0,
  助詞,
  助動詞,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  接続詞,
  接尾辞,
  代名詞,
  動詞,
  補助記号,
  未然形_,
  名詞,
  連用形_,
  isNominalLike,
} from "../../../types/pos.js";
export function looksLikeAdversativeMonoNo(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly allowChunkEos?: boolean } = {}
): boolean {
  const tokens = cursor.tokens;
  const monoIdx = cursor.pos;
  const n = cursor.end;
  if (monoIdx + 1 >= n) {
    return false;
  }
  const mono = tokens[monoIdx];
  const no = tokens[monoIdx + 1];
  if (
    mono?.dictionaryForm !== "もの" ||
    nominalLinkMarkerRelationForToken(no, monoIdx + 1, {
      consumers: ["semantic_helpers"]
    }) === null
  ) {
    return false;
  }
  const nextIdx = monoIdx + 2;
  if (nextIdx >= n) {
    return options.allowChunkEos === true;
  }
  const next = tokens[nextIdx];
  if (next === undefined) {
    return false;
  }
  const pos0 = next.pos & POS0;
  if (pos0 === 補助記号) {
    return true;
  }
  if (pos0 === 接続詞 || MONO_NO_ADVERSATIVE_ADVERBS.has(next.surface)) {
    return true;
  }
  if (pos0in(next.pos, PREDICATE_BITS)) {
    let scan = nextIdx + 1;
    while (scan < n && (tokens[scan]!.pos & POS0) === 助動詞) {
      scan += 1;
    }
    return !(scan < n && ((tokens[scan]!.pos & POS0) === 名詞 || (tokens[scan]!.pos & POS0) === 接尾辞));
  }
  if (pos0 === 名詞) {
    const nounForm = next.dictionaryForm || next.surface;
    if (MONO_NO_GENITIVE_HEAD_NOUNS.has(nounForm)) {
      return false;
    }
    const next2 = tokens[nextIdx + 1];
    if (next2 !== undefined && (next2.pos & POS0) === 動詞 && (next2.dictionaryForm === "できる" || next2.dictionaryForm === "する" || next2.dictionaryForm === "なる") && (next.pos & POS2) === サ変可能) {
      return true;
    }
    if (next2 !== undefined && (next2.pos & POS0) === 助詞 && (next2.surface === "は" || next2.surface === "が" || next2.surface === "も")) {
      return true;
    }
    if (
      MONO_NO_ADVERSATIVE_HEAD_NOUNS.has(nounForm) &&
      caseParticleMarkerRelationForToken(next2, nextIdx + 1, {
        acceptedSurfaces: ["を"],
        consumers: ["semantic_helpers"]
      }) !== null
    ) {
      return true;
    }
  }
  return false;
}

export function shouldSuppressConnMonoNo(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly hostPos0?: number | null } = {}
): boolean {
  if (options.hostPos0 !== undefined && options.hostPos0 !== null && !pos0in(options.hostPos0, PREDICATE_BITS)) {
    return true;
  }
  return !looksLikeAdversativeMonoNo(cursor);
}

export function matchNegativeTailStart(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly allowPoliteSuppletive?: boolean } = {}
): number | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  if (pos >= n) {
    return null;
  }
  const token = tokens[pos];
  const pos0 = (token?.pos ?? 0) & POS0;
  const pos4 = (token?.pos ?? 0) & POS4;
  if (
    pos0 === 形容詞0 &&
    (token?.dictionaryForm === "ない" || token?.dictionaryForm === "無い" || token?.reading === "ナイ")
  ) {
    return 1;
  }
  if (
    pos0 === 助動詞 &&
    (token?.dictionaryForm === "ない" || token?.dictionaryForm === "ぬ" || pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ)
  ) {
    return 1;
  }
  if (options.allowPoliteSuppletive === false || pos + 2 >= n) {
    return null;
  }
  const token1 = tokens[pos + 1];
  const token2 = tokens[pos + 2];
  if (
    token?.dictionaryForm === "ある" &&
    (token.pos & POS0) === 動詞 &&
    token1?.dictionaryForm === "ます" &&
    (token1.pos & POS0) === 助動詞 &&
    (token2?.dictionaryForm === "ぬ" || ((token2?.pos ?? 0) & POS4) === 助動詞_ヌ)
  ) {
    return 3;
  }
  return null;
}

export function matchHokaAdditiveConnectiveStart(
  cursor: TokenCursor<MatcherToken>
): number | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const token = tokens[pos];
  if (
    token === undefined ||
    (token.pos & POS0) !== 名詞 ||
    (token.surface !== "ほか" && token.surface !== "他") ||
    (token.reading !== "ホカ" && token.dictionaryForm !== "ほか" && token.dictionaryForm !== "他")
  ) {
    return null;
  }
  const next = tokens[pos + 1];
  if (nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["semantic_helpers"] }) !== null) {
    return null;
  }
  if (looksHokaNaranaiIdentityTail(cursor.fork(pos + 1, n))) {
    return null;
  }
  if (isNominalLike({ pos: next?.pos ?? 0 })) {
    return hokaBareNounContinuationLooksAdditive(cursor.fork(pos + 1, n)) ? 1 : null;
  }
  if (matchNegativeTailStart(cursor.fork(pos + 1, n)) !== null) {
    return null;
  }
  if (caseParticleMarkerRelationForToken(next, pos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["semantic_helpers"]
  }) === null) {
    return 1;
  }
  const focus = tokens[pos + 2];
  if (focus?.surface === "も" && (focus.pos & POS0) === 助詞) {
    return 3;
  }
  return 2;
}

export function matchMonoNoConcessiveConnectiveStart(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly allowChunkEos?: boolean } = {}
): number | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const mono = tokens[pos];
  const no = tokens[pos + 1];
  if (
    mono === undefined ||
    no === undefined ||
    (mono.pos & POS0) !== 名詞 ||
    mono.dictionaryForm !== "もの" ||
    nominalLinkMarkerRelationForToken(no, pos + 1, {
      consumers: ["semantic_helpers"]
    }) === null
  ) {
    return null;
  }
  return looksLikeAdversativeMonoNo(cursor, options) ? 2 : null;
}

export function matchNoNiConcessiveConnectiveStart(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables
): number | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const no = tokens[pos];
  const ni = tokens[pos + 1];
  if (
    no === undefined ||
    ni === undefined ||
    nominalizerAdversativeConnectiveRelationAt(tokens, pos, { consumers: ["semantic_helpers"] }) === null
  ) {
    return null;
  }
  if (looksLikePurposeEvaluationNoNi(cursor.fork(pos, n), lookups) || looksPronominalNoNi(cursor.fork(pos, n), lookups)) {
    return null;
  }
  const afterNi = tokens[pos + 2];
  const afterNiIsFiniteResultPredicate =
    ((afterNi?.pos ?? 0) & POS0) === 動詞 &&
    noNiResultVerbHasFiniteAuxiliaryTail(cursor.fork(pos + 2, n));
  if (
    afterNi !== undefined &&
    (
      afterNi.surface === "も" ||
      afterNi.dictionaryForm === "対する" ||
      (afterNi.dictionaryForm === "比べる" && !afterNiIsFiniteResultPredicate)
    )
  ) {
    return null;
  }
  const prev = tokens[pos - 1];
  if (prev === undefined || !pos0in(prev.pos, PREDICATE_AUX_BITS)) {
    return null;
  }
  return 2;
}

export function hokaBareNounContinuationLooksAdditive(
  cursor: TokenCursor<MatcherToken>
): boolean {
  const tokens = cursor.tokens;
  const n = cursor.end;
  let index = cursor.pos;
  while (index < n) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if ((pos0 === 接尾辞) || (pos0 === 名詞) || (pos0 === 代名詞)) {
      index += 1;
      continue;
    }
    if ((pos0 === 補助記号) || (pos0 === 記号) || (pos0 === 動詞) || (pos0 === 形容詞0)) {
      return false;
    }
    if ((pos0 !== 助詞)) {
      return false;
    }
    if (token.surface === "は" || token.surface === "も" || token.surface === "が") {
      return true;
    }
    return false;
  }
  return false;
}

function looksHokaNaranaiIdentityTail(cursor: TokenCursor<MatcherToken>): boolean {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  const naru = tokens[pos];
  if (
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "成る")
  ) {
    return false;
  }
  const form5 = naru.pos & POS5;
  if ((form5 & POS5A) === 未然形_ && matchNegativeTailStart(cursor.fork(pos + 1, n), { allowPoliteSuppletive: false }) !== null) {
    return true;
  }
  if ((form5 & POS5A) !== 連用形_ || pos + 2 >= n) {
    return false;
  }
  const masu = tokens[pos + 1];
  const nu = tokens[pos + 2];
  return (
    masu?.dictionaryForm === "ます" && (masu.pos & (POS0 | POS4)) === (助動詞 | 助動詞_マス) && (nu?.dictionaryForm === "ぬ" || ((nu?.pos ?? 0) & POS4) === 助動詞_ヌ)
  );
}
