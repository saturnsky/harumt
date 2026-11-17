import {
  caseParticleMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationForToken,
  nominalLinkMarkerRelationForToken,
  predicateNominalizerRelationForToken
} from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import {
  isBoundaryPunctuationToken,
  isHardTerminalPunctuationToken,
  isOpeningPunctuationToken,
  isWeakPunctuationToken
} from "../head-tail/boundary/punctuation.js";
import { compositeConnectivePatternRelationAt } from "../head-tail/tail/connective-span-scanner.js";
import { TokenCursor } from "../token-cursor.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { TAME_FORMS } from "../lookup-tables.js";
import { collectAuxTokens, isVerbLemma, isVerbLemmaIn } from "../matchers.js";
import { isCopulaAuxToken } from "../semantics/copula-tail-runtime.js";
import type { RuntimeHaruToken, HaruTokenRuntimeFields } from "../../types/token.js";
import { rewriteRuntimeTokenSurface } from "../../types/token.js";
import { hasTerminalSentenceMark, isTerminalishAfter } from "../semantics/terminal-runtime.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { terminalOnlyInflectionClosesUtteranceAfter } from "../head-tail/tail/predicate-root/integration/readiness.js";


import {
  POS0,
  POS01,
  POS012,
  POS4,
  POS4_NAME,
  POS4_SHIFT,
  POS5A,
  意志推量形_,
  感動詞,
  記号,
  形状詞,
  終助詞,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  接続詞,
  代名詞,
  動詞,
  副詞,
  補助記号,
  名詞,
  名詞_普通名詞_サ変可能,
  連体形_,
  連体詞,
  連用形_,
  連用形_一般,
  isAdverbCapableNominal, 補助記号_括弧開, 名詞_数詞, 助詞_接続助詞, 助詞_係助詞,
} from "../../types/pos.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
export interface RescueToken extends HaruTokenRuntimeFields {
  surface: string;
  dictionaryForm: string;
  reading: string;
  dictionaryFormReading: string;
  pos: number;
  dictionaryId?: number;
}

export type RescueResult = RescueToken;

export const NI_OUJI_RESPONSE_NOUNS = new Set(["要請", "要望", "依頼", "面談", "サイン", "相談", "取材"]);
export const NI_OUJI_RESPONSE_FORMS = new Set(["応じ", "おうじ"]);

const KONO_SONO = new Set(["この", "その"]);

function isTerminalishAt(cursor: TokenCursor<RescueToken>, pos: number): boolean {
  return cursor.lookahead(pos - cursor.pos, isTerminalishAfter);
}


export const GODAN_RENYOU: Record<string, string> = {
  "す": "し",
  "く": "き",
  "ぐ": "ぎ",
  "ぶ": "び",
  "む": "み",
  "ぬ": "に",
  "る": "り",
  "う": "い",
  "つ": "ち"
};

export function computeRenyoukei(dictionaryForm: string, pos: number): string | undefined {
  if (dictionaryForm.length === 0) {
    return undefined;
  }
  const pos4 = pos & POS4;
  if (pos4 === 0) {
    return undefined;
  }
  const last = dictionaryForm.at(-1);
  if (last === undefined) {
    return undefined;
  }
  const conjugationType = POS4_NAME[pos4 >> POS4_SHIFT];
  if (conjugationType === undefined || conjugationType === "*") {
    return undefined;
  }
  if (conjugationType.startsWith("五段")) {
    const renyouLast = GODAN_RENYOU[last];
    return renyouLast === undefined ? undefined : `${dictionaryForm.slice(0, -1)}${renyouLast}`;
  }
  if (conjugationType.startsWith("上一段") || conjugationType.startsWith("下一段")) {
    return last === "る" ? dictionaryForm.slice(0, -1) : undefined;
  }
  if (conjugationType === "カ行変格") {
    return undefined;
  }
  if (conjugationType.startsWith("サ行変格")) {
    return dictionaryForm.endsWith("する") ? `${dictionaryForm.slice(0, -2)}し` : undefined;
  }
  return undefined;
}


export function niOujiResponsePrevToken(tokens: readonly RescueToken[], start: number): RescueToken | undefined {
  if (start <= 0) {
    return undefined;
  }
  const prevIndex = previousNonSpaceIndex(tokens, start);
  if (prevIndex === null) {
    return undefined;
  }
  const prev = tokens[prevIndex];
  if (prev === undefined) {
    return undefined;
  }
  const prevForm = prev.dictionaryForm || prev.surface;
  return NI_OUJI_RESPONSE_NOUNS.has(prevForm) ? prev : undefined;
}


export function isSentenceOrQuoteInitial(tokens: readonly RescueToken[], index: number): boolean {
  const prevIndex = previousNonSpaceIndex(tokens, index);
  if (prevIndex === null) {
    return true;
  }
  const prev = tokens[prevIndex];
  if (prev === undefined) {
    return true;
  }
  if (isHardTerminalPunctuationToken(prev) || isOpeningPunctuationToken(prev)) {
    return true;
  }
  const pp01 = prev.pos & POS01;
  return pp01 === 補助記号_括弧開;
}


export function isDemonstrativeTameDiscourseWithoutComma(cursor: TokenCursor<RescueToken>): boolean {
  const next = cursor.current();
  if (next === undefined) {
    return false;
  }
  if (["に", "の", "だけ", "なら", "でも", "か", "だ", "です"].includes(next.surface)) {
    return false;
  }
  const np0 = next.pos & POS0;
  return np0 !== 助詞 && np0 !== 助動詞 && np0 !== 補助記号 && np0 !== 記号;
}


export function isBareUchiRangeContext(cursor: TokenCursor<RescueToken>): boolean {
  const token = cursor.current();
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS01) === 名詞_数詞) {
    return true;
  }
  return ["一人", "二人", "三人", "四人", "五人", "六人", "七人", "八人", "九人", "十人", "何人"].includes(token.dictionaryForm);
}


export function hasNegativeSignalAfter(cursor: TokenCursor<RescueToken>): boolean {
  const { tokens, end: n } = cursor;
  let steps = 0;
  let index = (nextNonSpaceIndex(tokens, cursor.pos, n) ?? n);
  while (index < n && steps < 8) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (isBoundaryPunctuationToken(token)) {
      return false;
    }
    const tp4 = token.pos & POS4;
    if (["ない", "ぬ", "ん"].includes(token.dictionaryForm) || tp4 === 助動詞_ナイ || tp4 === 助動詞_ヌ) {
      return true;
    }
    index += 1;
    steps += 1;
  }
  return false;
}


export function hasConcessiveTemoAfter(cursor: TokenCursor<RescueToken>): boolean {
  const { tokens, end: n } = cursor;
  let steps = 0;
  let index = (nextNonSpaceIndex(tokens, cursor.pos, n) ?? n);
  while (index < n && steps < 8) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (isBoundaryPunctuationToken(token)) {
      return false;
    }
    const composite = compositeConnectivePatternRelationAt(cursor.fork(index, n, index), {
      consumers: ["connective_span_scanner"]
    });
    if (composite !== null && (composite.surface === "ても" || composite.surface === "でも")) {
      return true;
    }
    index += 1;
    steps += 1;
  }
  return false;
}



function hasBenefactiveQuestionRequestAfter(cursor: TokenCursor<RescueToken>): boolean {
  const { tokens, end: n } = cursor;
  let index = (nextNonSpaceIndex(tokens, cursor.pos, n) ?? n);
  let steps = 0;
  const requestTails = new Set(["くれる", "呉れる", "いただける", "頂ける", "もらえる", "貰える"]);
  while (index < n && steps < 14) {
    const token = tokens[index];
    if (token === undefined) {
      return false;
    }
    if (isBoundaryPunctuationToken(token)) {
      return false;
    }
    if (requestTails.has(token.dictionaryForm || token.surface)) {
      let auxIndex = (nextNonSpaceIndex(tokens, index + 1, n) ?? n);
      let sawPolite = false;
      let sawNegative = false;
      let auxSteps = 0;
      while (auxIndex < n && auxSteps < 5) {
        const aux = tokens[auxIndex];
        if (aux === undefined) {
          break;
        }
        if (kaMarkerRelationForToken(aux, auxIndex, ["embedded_question"])?.particleSubtype1 === 終助詞) {
          return sawPolite && sawNegative;
        }
        if ((aux.pos & POS0) !== 助動詞) {
          break;
        }
        const ap4 = aux.pos & POS4;
        if (ap4 === 助動詞_マス || ap4 === 助動詞_デス) {
          sawPolite = true;
        }
        if (ap4 === 助動詞_ナイ || ap4 === 助動詞_ヌ) {
          sawNegative = true;
        }
        auxIndex += 1;
        auxSteps += 1;
      }
    }
    index += 1;
    steps += 1;
  }
  return false;
}

function syntheticFrom(
  base: RescueToken,
  patch: Omit<RescueToken, "dictionaryId">,
  sources?: readonly RescueToken[]
): RescueToken {
  const rewritten = rewriteRuntimeTokenSurface(
    base,
    sources === undefined
      ? { kind: "replace", surface: patch.surface }
      : { kind: "merge", sources }
  );
  const { longVowelReduction, ...rest } = rewritten;
  return {
    ...rest,
    ...patch,
    ...(longVowelReduction === undefined ? {} : { longVowelReduction })
  };
}

export function tryResolveNiOujiResponse(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const ni = tokens[i];
  const ouji = tokens[i + 1];
  if (i + 1 >= n || ni === undefined || ouji === undefined) {
    return undefined;
  }
  if (
    caseParticleMarkerRelationForToken(ni, i, {
      acceptedSurfaces: ["に"],
      consumers: ["collocation_rescue"]
    }) === null ||
    niOujiResponsePrevToken(tokens, i) === undefined
  ) {
    return undefined;
  }
  if (!NI_OUJI_RESPONSE_FORMS.has(ouji.surface) || (ouji.pos & POS0) !== 動詞) {
    return undefined;
  }
  let consumed: number;
  let surface: string;
  let reading: string;
  if (isTeConnectiveToken(tokens[i + 2])) {
    consumed = 3;
    surface = "に応じて_response";
    reading = "ニオウジテ";
  } else {
    const after = (nextNonSpaceIndex(tokens, i + 2, n) ?? n);
    const afterPos = tokens[after]?.pos ?? 0;
    if (after >= n || (afterPos & POS0) === 助動詞) {
      return undefined;
    }
    consumed = 2;
    surface = "に応じ_response";
    reading = "ニオウジ";
  }
  cursor.advance(consumed);
  return syntheticFrom(ni, {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: 助詞_格助詞,
    collocDone: true,
    syntheticReason: "ni_ouji_response"
  });
}


export function tryRescueSentenceInitialNandes(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const na = tokens[i];
  const nominalizer = tokens[i + 1];
  const copula = tokens[i + 2];
  if (i + 2 >= n || na === undefined || nominalizer === undefined || copula === undefined) {
    return undefined;
  }
  if (na.surface !== "な" || na.dictionaryForm !== "だ" || (na.pos & (POS0 | POS5A)) !== (助動詞 | 連体形_)) {
    return undefined;
  }
  if (
    predicateNominalizerRelationForToken(nominalizer, i + 1, {
      requirement: "tail_connective_marker",
      acceptedSurfaces: ["ん"],
      consumers: ["collocation_rescue"]
    })?.nominalizerKind !== "no" ||
    !isCopulaAuxToken(copula as RuntimeHaruToken)
  ) {
    return undefined;
  }
  const prevIndex = previousNonSpaceIndex(tokens, i);
  const prevPos0 = (tokens[prevIndex ?? 0]?.pos ?? 0) & POS0;
  if (prevIndex !== null && prevPos0 !== 補助記号 && prevPos0 !== 記号) {
    return undefined;
  }
  cursor.advance(2);
  return syntheticFrom(na, {
    surface: "なん",
    dictionaryForm: "何",
    reading: "ナン",
    dictionaryFormReading: "ナン",
    pos: 代名詞,
    collocDone: true,
    syntheticReason: "sentence_initial_nandes"
  });
}

export function tryRescueSentenceInitialToiuWakeda(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const to = tokens[i];
  const iu = tokens[i + 1];
  const wake = tokens[i + 2];
  if (i + 3 >= n || to === undefined || iu === undefined || wake === undefined) {
    return undefined;
  }
  const quoteMarker = quoteMarkerRelationAt(tokens, i, { consumers: ["collocation_rescue"] });
  if (quoteMarker?.canonicalSurface !== "と" || (to.pos & POS0) !== 助詞) {
    return undefined;
  }
  if (!isVerbLemmaIn(iu, IU_LEXEME_FORMS)) {
    return undefined;
  }
  if (wake.reading !== "ワケ" || (wake.pos & POS0) !== 名詞) {
    return undefined;
  }
  const previousIndex = previousNonSpaceIndex(tokens, i);
  const prevPos0B = (tokens[previousIndex ?? 0]?.pos ?? 0) & POS0;
  if (previousIndex !== null && prevPos0B !== 補助記号 && prevPos0B !== 記号) {
    return undefined;
  }
  const auxCursor = cursor.fork(i + 3);
  const aux = collectAuxTokens(auxCursor);
  const firstAux = tokens[i + 3];
  if (aux.length === 0 || firstAux === undefined || !isCopulaAuxToken(firstAux as RuntimeHaruToken)) {
    return undefined;
  }
  if (!auxCursor.lookahead(0, hasTerminalSentenceMark)) {
    return undefined;
  }
  const consumed = 3 + aux.length;
  cursor.advance(consumed);
  const wakedaSources = tokens.slice(i, i + consumed);
  return syntheticFrom(wake, {
    surface: wakedaSources.map((token) => token.surface).join(""),
    dictionaryForm: "というわけだ_discourse",
    reading: "トイウワケダ",
    dictionaryFormReading: "トイウワケダ",
    pos: 感動詞,
    collocDone: true,
    syntheticReason: "sentence_initial_toiu_wakeda"
  }, wakedaSources);
}


export function tryRescueSentenceInitialToiuWakede(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i } = cursor;
  if (!isSentenceOrQuoteInitial(tokens, i)) {
    return undefined;
  }
  const marker = tokens[i];
  if (marker === undefined || (marker.pos & POS0) !== 助詞) {
    return undefined;
  }
  let wakeIdx: number;
  if (marker.surface === "って") {
    wakeIdx = i + 1;
  } else {
    const quoteMarker = quoteMarkerRelationAt(tokens, i, { consumers: ["collocation_rescue"] });
    const iu = tokens[i + 1];
    if (quoteMarker?.canonicalSurface !== "と" || iu === undefined || !isVerbLemmaIn(iu, IU_LEXEME_FORMS)) {
      return undefined;
    }
    wakeIdx = i + 2;
  }
  const wake = tokens[wakeIdx];
  const de = tokens[wakeIdx + 1];
  if (
    wake === undefined || de === undefined ||
    wake.reading !== "ワケ" || (wake.pos & POS0) !== 名詞 ||
    de.surface !== "で"
  ) {
    return undefined;
  }
  const after = tokens[wakeIdx + 2];
  if (after !== undefined && (after.surface === "は" || after.surface === "も" || isVerbLemma(after, "ある"))) {
    return undefined;
  }
  const consumed = wakeIdx + 2 - i;
  cursor.advance(consumed);
  const wakedeSources = tokens.slice(i, i + consumed);
  return syntheticFrom(wake, {
    surface: wakedeSources.map((token) => token.surface).join(""),
    dictionaryForm: "というわけで_discourse",
    reading: "トイウワケデ",
    dictionaryFormReading: "トイウワケデ",
    pos: 接続詞,
    koreanOverride: "그런 이유로",
    collocDone: true,
    syntheticReason: "sentence_initial_toiu_wakede"
  }, wakedeSources);
}


export function tryResolveSentenceInitialTokoroDiscourse(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const tokoro = tokens[i];
  const suffix = tokens[i + 1];
  if (i + 1 >= n || tokoro === undefined || suffix === undefined || !isSentenceOrQuoteInitial(tokens, i)) {
    return undefined;
  }
  if (tokoro.surface !== "ところ" || tokoro.dictionaryForm !== "ところ" || ![undefined, "トコロ"].includes(tokoro.dictionaryFormReading) || (tokoro.pos & POS0) !== 名詞) {
    return undefined;
  }
  if (!["が", "で"].includes(suffix.surface) || (suffix.pos & POS0) !== 助詞) {
    return undefined;
  }
  const surface = `${tokoro.surface}${suffix.surface}`;
  const reading = suffix.surface === "が" ? "トコロガ" : "トコロデ";
  cursor.advance(2);
  return syntheticFrom(tokoro, {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: 接続詞,
    koreanOverride: "그런데",
    collocDone: true,
    syntheticReason: "sentence_initial_tokoro_discourse"
  });
}


export function tryResolveDemonstrativeTame(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const demo = tokens[i];
  const tame = tokens[i + 1];
  if (i + 1 >= n || demo === undefined || tame === undefined) {
    return undefined;
  }
  if (!KONO_SONO.has(demo.surface) || (demo.pos & POS0) !== 連体詞 || !TAME_FORMS.has(tame.dictionaryForm)) {
    return undefined;
  }

  let consumed = 2;
  let surface = `${demo.surface}${tame.surface}`;
  let korean: string | undefined;
  let posNum: number;
  let reason: string;

  const next = tokens[i + 2];
  if (caseParticleMarkerRelationForToken(next, i + 2, {
    acceptedSurfaces: ["に"],
    consumers: ["collocation_rescue"]
  }) !== null) {
    consumed += 1;
    const focus = tokens[i + 3];
    if (focus?.surface === "は" && (focus.pos & POS0) === 助詞) {
      consumed += 1;
      korean = "이를 위해서는";
    } else if (focus?.surface === "も" && (focus.pos & POS0) === 助詞) {
      consumed += 1;
      korean = "이를 위해서도";
    } else {
      korean = "이를 위해";
    }
    surface += tokens.slice(i + 2, i + consumed).map((token) => token.surface).join("");
    posNum = 副詞;
    reason = "demonstrative_tame_ni";
  } else if (
    next !== undefined &&
    nominalLinkMarkerRelationForToken(next, i + 2, {
      consumers: ["content_head_dispatch"]
    }) !== null
  ) {
    consumed += 1;
    surface += next.surface;
    korean = "이를 위한";
    posNum = 連体詞;
    reason = "demonstrative_tame_no";
  } else if (isWeakPunctuationToken(next)) {
    posNum = 副詞;
    reason = "demonstrative_tame_discourse";
  } else if (isDemonstrativeTameDiscourseWithoutComma(cursor.fork(i + 2, n))) {
    posNum = 副詞;
    reason = "demonstrative_tame_discourse";
  } else {
    return undefined;
  }

  const reading = demo.surface === "その" ? "ソノタメ" : "コノタメ";
  cursor.advance(consumed);
  return syntheticFrom(tame, {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: posNum,
    ...(korean === undefined ? {} : { koreanOverride: korean }),
    collocDone: true,
    syntheticReason: reason
  }, tokens.slice(i, i + consumed));
}


export function tryResolveKonosonoUchi(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  const uchi = tokens[i + 1];
  if (i + 1 >= n || head === undefined || uchi === undefined) {
    return undefined;
  }
  if (!KONO_SONO.has(head.surface) || (head.pos & POS0) !== 連体詞 || uchi.surface !== "うち" || (uchi.pos & POS0) !== 名詞) {
    return undefined;
  }
  const nextIndex = (nextNonSpaceIndex(tokens, i + 2, n) ?? n);
  const next = tokens[nextIndex];
  if (
    next === undefined ||
    caseParticleMarkerRelationForToken(next, nextIndex, {
      acceptedSurfaces: ["に"],
      consumers: ["collocation_rescue"]
    }) !== null ||
    nominalLinkMarkerRelationForToken(next, nextIndex, {
      consumers: ["content_head_dispatch"]
    }) !== null
  ) {
    return undefined;
  }
  const dictionaryForm = head.surface === "この" ? "このうち" : (isBareUchiRangeContext(cursor.fork(nextIndex, n)) ? "そのうち_range" : "そのうち");
  const reading = head.surface === "この" ? "コノウチ" : "ソノウチ";
  cursor.advance(2);
  return {
    surface: `${head.surface}${uchi.surface}`,
    dictionaryForm: dictionaryForm,
    reading,
    dictionaryFormReading: reading,
    pos: 副詞,
    collocDone: true,
    syntheticReason: "kono_sono_uchi"
  };
}


export function tryFixSentenceFinalDore(cursor: TokenCursor<RescueToken>): RescueToken | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const token = tokens[i];
  const next = tokens[i + 1];
  if (token === undefined || next === undefined || i + 1 >= n || token.surface !== "どれ" || (token.pos & POS0) !== 感動詞) {
    return undefined;
  }
  if (!["？", "?"].includes(next.surface)) {
    return undefined;
  }
  cursor.advance();
  return syntheticFrom(token, {
    surface: token.surface,
    dictionaryForm: "どれ",
    reading: "ドレ",
    dictionaryFormReading: "ドレ",
    pos: 代名詞,
    collocDone: true
  });
}

export function tryResolveMamaDewa(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  if (head === undefined || i >= n) {
    return undefined;
  }
  const dictForm = head.dictionaryForm;
  const reading = head.dictionaryFormReading || head.reading || "";
  let consumed = 0;
  let surface: string | undefined;
  let outDictionaryForm: string | undefined;
  let outReading: string | undefined;
  if (dictForm === "このまま" || dictForm === "そのまま" || dictForm === "あのまま") {
    const dewa = dewaScopeBridgeRelationAt(tokens, i + 1, {
      anchorIdx: i,
      consumers: ["collocation_rescue"]
    });
    if (dewa?.focusParticle === "wa" && dewa.span.endExclusive <= n) {
      surface = `${head.surface}では`;
      consumed = dewa.span.endExclusive - i;
      outDictionaryForm = `${dictForm}では`;
      outReading = `${reading}デハ`;
    } else if (i + 1 < n && tokens[i + 1]?.surface === "じゃ") {
      surface = `${head.surface}じゃ`;
      consumed = 2;
      outDictionaryForm = `${dictForm}じゃ`;
      outReading = `${reading}ジャ`;
    }
  } else if (head.surface === "この" || head.surface === "あの") {
    const dewa = dewaScopeBridgeRelationAt(tokens, i + 2, {
      anchorIdx: i,
      consumers: ["collocation_rescue"]
    });
    if (i + 1 < n && tokens[i + 1]?.surface === "まま" && dewa?.focusParticle === "wa" && dewa.span.endExclusive <= n) {
      surface = `${head.surface}ままでは`;
      consumed = dewa.span.endExclusive - i;
      outDictionaryForm = `${head.surface}ままでは`;
      outReading = `${head.reading || ""}ママデハ`;
    } else if (i + 2 < n && tokens[i + 1]?.surface === "まま" && tokens[i + 2]?.surface === "じゃ") {
      surface = `${head.surface}ままじゃ`;
      consumed = 3;
      outDictionaryForm = `${head.surface}ままじゃ`;
      outReading = `${head.reading || ""}ママジャ`;
    }
  }
  if (surface === undefined || consumed === 0 || outDictionaryForm === undefined || outReading === undefined) {
    return undefined;
  }
  cursor.advance(consumed);
  return {
    surface,
    dictionaryForm: outDictionaryForm,
    reading: outReading,
    dictionaryFormReading: outReading,
    pos: 副詞,
    collocDone: true,
    syntheticReason: "mama_dewa"
  };
}



export function tryResolveDoushitemo(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  const shi = tokens[i + 1];
  const te = tokens[i + 2];
  const mo = tokens[i + 3];
  if (i + 3 >= n || head === undefined || shi === undefined || te === undefined || mo === undefined) {
    return undefined;
  }
  if (head.surface !== "どう" || (head.pos & POS0) !== 副詞 || !isVerbLemma(shi, "する")) {
    return undefined;
  }
  if (!isTeConnectiveToken(te) || mo.surface !== "も" || (mo.pos & POS0) !== 助詞) {
    return undefined;
  }
  const negative = hasNegativeSignalAfter(cursor.fork(i + 4, n)) && !hasBenefactiveQuestionRequestAfter(cursor.fork(i + 4, n));
  cursor.advance(4);
  return {
    surface: "どうしても",
    dictionaryForm: negative ? "どうしても_neg" : "どうしても",
    reading: "ドウシテモ",
    dictionaryFormReading: "ドウシテモ",
    pos: 副詞,
    collocDone: true,
    syntheticReason: "doushitemo_context"
  };
}

export function tryResolveDonnaniConcessive(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  const ni = tokens[i + 1];
  if (i + 1 >= n || head === undefined || ni === undefined || head.surface !== "どんな" || (head.pos & POS0) !== 形状詞) {
    return undefined;
  }
  if (
    copulaNiMarkerRelationForToken(ni, i + 1, {
      consumers: ["collocation_rescue"]
    }) === null ||
    !hasConcessiveTemoAfter(cursor.fork(i + 2, n))
  ) {
    return undefined;
  }
  cursor.advance(2);
  return {
    surface: "どんなに",
    dictionaryForm: "どんなに_concessive",
    reading: "ドンナニ",
    dictionaryFormReading: "ドンナニ",
    pos: 副詞,
    collocDone: true,
    syntheticReason: "donnani_concessive"
  };
}

export function tryResolveDoushita(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  if (head === undefined) {
    return undefined;
  }
  if (head.surface !== "どう" || (head.pos & POS0) !== 副詞) {
    return undefined;
  }
  let shiIdx = i + 1;
  const ka = tokens[shiIdx];
  if (ka !== undefined && kaMarkerRelationForToken(ka, shiIdx, ["collocation_rescue"]) !== null) {
    shiIdx += 1;
  }
  const shi = tokens[shiIdx];
  const ta = tokens[shiIdx + 1];
  if (shi === undefined || ta === undefined || shiIdx + 1 >= n) {
    return undefined;
  }
  if (!isVerbLemma(shi, "する")) {
    return undefined;
  }
  if (ta.surface !== "た" || (ta.pos & POS0) !== 助動詞) {
    return undefined;
  }
  let consumed = shiIdx + 2 - i;
  let scanIdx = (nextNonSpaceIndex(tokens, shiIdx + 2, n) ?? n);
  if (
    scanIdx < n &&
    predicateNominalizerRelationForToken(tokens[scanIdx], scanIdx, {
      requirement: "terminal_noda_marker",
      consumers: ["content_head_dispatch"]
    })?.nominalizerKind === "no"
  ) {
    consumed = scanIdx + 1 - i;
    scanIdx = (nextNonSpaceIndex(tokens, scanIdx + 1, n) ?? n);
  }
  if (!isTerminalishAt(cursor, scanIdx)) {
    return undefined;
  }
  cursor.advance(consumed);
  return {
    surface: "どうした",
    dictionaryForm: "どうした",
    reading: "ドウシタ",
    dictionaryFormReading: "ドウシタ",
    pos: 感動詞,
    collocDone: true,
    syntheticReason: "doushita_terminal"
  };
}

export function tryResolveDoushiyou(cursor: TokenCursor<RescueToken>): RescueResult | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const head = tokens[i];
  const shiyou = tokens[i + 1];
  if (i + 1 >= n || head === undefined || shiyou === undefined) {
    return undefined;
  }
  if (head.surface !== "どう" || (head.pos & POS0) !== 副詞) {
    return undefined;
  }
  if (shiyou.dictionaryForm !== "する" || (shiyou.pos & (POS0 | POS5A)) !== (動詞 | 意志推量形_)) {
    return undefined;
  }
  let consumed = 2;
  let scanIdx = (nextNonSpaceIndex(tokens, i + 2, n) ?? n);
  if (
    scanIdx + 1 < n
    && kaMarkerRelationForToken(tokens[scanIdx], scanIdx, ["collocation_rescue"]) !== null
    && (tokens[scanIdx + 1]?.surface === "な" || tokens[scanIdx + 1]?.surface === "しら")
    && ((tokens[scanIdx + 1]?.pos ?? 0) & POS0) === 助詞
  ) {
    consumed = scanIdx + 2 - i;
    scanIdx = (nextNonSpaceIndex(tokens, scanIdx + 2, n) ?? n);
  }
  if (scanIdx < n && !terminalOnlyInflectionClosesUtteranceAfter(tokens, i + consumed - 1)) {
    return undefined;
  }
  cursor.advance(consumed);
  return {
    surface: "どうしよう",
    dictionaryForm: "どうしよう",
    reading: "ドウシヨウ",
    dictionaryFormReading: "ドウシヨウ",
    pos: 感動詞,
    collocDone: true,
    syntheticReason: "doushiyou_terminal"
  };
}


export function tryMergeAdverbialShite(cursor: TokenCursor<RescueToken>): readonly RescueToken[] | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const noun = tokens[i];
  const shi = tokens[i + 1];
  const te = tokens[i + 2];
  if (i + 2 >= n || noun === undefined || shi === undefined || te === undefined) {
    return undefined;
  }
  if ((noun.pos & POS0) !== 名詞 || (noun.pos & POS012) === 名詞_普通名詞_サ変可能) {
    return undefined;
  }
  const adverbialCandidate = isAdverbCapableNominal(noun) || !Array.from(noun.surface).some((ch) => "一" <= ch && ch <= "鿿");
  if (!adverbialCandidate) {
    return undefined;
  }
  if (shi.dictionaryForm !== "する" || (shi.pos & (POS0 | POS5A)) !== (動詞 | 連用形_)) {
    return undefined;
  }
  if ((te.pos & POS01) !== 助詞_接続助詞) {
    return undefined;
  }
  cursor.advance(3);
  return [noun, {
    surface: "して",
    dictionaryForm: "して",
    reading: "シテ",
    dictionaryFormReading: "シテ",
    pos: 副詞,
    collocDone: true
  }];
}


export function tryFixRenyouVerbNoun(cursor: TokenCursor<RescueToken>): readonly RescueToken[] | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const noun = tokens[i];
  const mo = tokens[i + 1];
  const verb = tokens[i + 2];
  if (i + 2 >= n || noun === undefined || mo === undefined || verb === undefined) {
    return undefined;
  }
  if ((noun.pos & POS0) !== 名詞 || (mo.pos & POS01) !== 助詞_係助詞 || mo.surface !== "も" || (verb.pos & POS0) !== 動詞) {
    return undefined;
  }
  const expected = computeRenyoukei(verb.dictionaryForm, verb.pos);
  if (expected === undefined || noun.surface !== expected) {
    return undefined;
  }
  cursor.advance();
  return [{
    surface: noun.surface,
    dictionaryForm: verb.dictionaryForm,
    dictionaryFormReading: verb.dictionaryFormReading,
    reading: noun.reading,
    pos: 動詞 | (verb.pos & POS4) | 連用形_一般
  }];
}
