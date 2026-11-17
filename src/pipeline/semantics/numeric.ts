
import {
  ATTRIBUTIVE_TSU,
  COUNTER,
  DISTRIBUTIVE_TSU,
  GENITIVE_TSU,
  KIND_TSU,
  LONE_KIRI,
  LONE_SHITE,
  ORDINAL_TSU,
  selectCounterFamily,
  type TsuRelation
} from "../../generator/counter-families.js";
import type { NumeralPlan } from "../../types/render-plan.js";
import {
  analyzeNumeralSurface,
  formatApproxCounterPhrase,
  formatCounterPhrase,
  getCounterKorean,
  getIndefiniteNumeralReading,
  parseJapaneseNumber,
  readNumeralToken,
  resolveNumeralTokenValue,
  sinoKorean,
  type JapaneseNumber,
  type NumeralSurfaceAnalysis,
  type NumeralSurfaceRealization,
  type NumeralTokenReadOptions
} from "../../generator/numerals.js";
import type { NumericTables, QuantityApproximationMarker } from "../../generator/numeric-lookup.js";
import { isCopulaDaOrDesuDictionaryForm, type MatcherToken } from "../matchers.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationAt, nominalLinkMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { CaseParticleMarkerSurface } from "../head-tail/boundary/relation.js";
import { isDemoMinimumContextForParticle } from "../particles/common.js";
import { secondaryParticleCanonical } from "../particles/secondary-particle.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";


import {
  NOMINAL_BITS,
  POS0,
  POS01,
  pos0in,
  POS5A,
  形状詞,
  形容詞0,
  助詞,
  助詞_接続助詞,
  接頭辞,
  接尾辞,
  接尾辞_名詞的,
  動詞,
  副詞,
  名詞,
  名詞_数詞,
  isCounterCapableToken,
  連体形_,
  連体詞,
  連用形_,
  수사,
} from "../../types/pos.js";
export interface NumericSyntheticToken extends MatcherToken {
  reading: string;
  dictionaryFormReading: string;
  koreanOverride: string;
  syntheticReason: string;
  collocDone: boolean;
}

export function isSymbolicNumericChar(ch: string): boolean {
  if ("一" <= ch && ch <= "鿿") {
    return false;
  }
  return isNumericChar(ch) && !isDecimalDigit(ch);
}

export function splitSymbolicNumericPrefix(surface: string): readonly [prefix: string, rest: string] | null {
  if (surface.length === 0) {
    return null;
  }
  let idx = 0;
  for (const ch of surface) {
    if (!isSymbolicNumericChar(ch)) {
      break;
    }
    idx += ch.length;
  }
  if (idx === 0 || idx === surface.length) {
    return null;
  }
  return [surface.slice(0, idx), surface.slice(idx)];
}

export function isCounterCountedNoun(token: Pick<MatcherToken, "pos">): boolean {
  return token.pos !== 0 && pos0in(token.pos, NOMINAL_BITS);
}

function numericCaseParticleAt(
  tokens: readonly MatcherToken[],
  index: number,
  acceptedSurfaces: readonly CaseParticleMarkerSurface[]
): boolean {
  return caseParticleMarkerRelationForToken(tokens[index], index, {
    acceptedSurfaces,
    consumers: ["numeric_semantics"]
  }) !== null;
}

function numericNominalLinkAt(tokens: readonly MatcherToken[], index: number): boolean {
  return nominalLinkMarkerRelationAt(tokens, index, {
    consumers: ["numeric_semantics"]
  }) !== null;
}

function isDateDayEquativeContext(cursor: TokenCursor<MatcherToken>, numberIndex: number, counterKey: string): boolean {
  if (counterKey !== "日") {
    return false;
  }
  const { tokens, end: n } = cursor;
  const afterCounter = numberIndex + 2 < n ? tokens[numberIndex + 2] : undefined;
  if (afterCounter === undefined) {
    return false;
  }
  return isCopulaDaOrDesuDictionaryForm(afterCounter);
}

function forceArabicByTargetConvention(
  cursor: TokenCursor<MatcherToken>,
  counterKey: string,
  numeric: NumericTables
): boolean {
  return numeric.TARGET_ARABIC_COUNTERS.has(counterKey) ||
    isDateDayEquativeContext(cursor, cursor.pos, counterKey);
}

export function simpleAdnominalModifierWidth(cursor: TokenCursor<MatcherToken>, idx: number): number {
  const { tokens, end: n } = cursor;
  const token = tokens[idx];
  if (idx >= n || token === undefined) {
    return 0;
  }
  if (token.pos === 0) {
    return 0;
  }
  if ((token.pos & POS0) === 連体詞) {
    return 1;
  }
  if ((token.pos & (POS0 | POS5A)) === (形容詞0 | 連体形_)) {
    return 1;
  }
  const next = tokens[idx + 1];
  if (
    (token.pos & POS0) === 形状詞 &&
    idx + 1 < n &&
    next?.dictionaryForm === "だ" &&
    (next.pos & POS5A) === 連体形_
  ) {
    return 2;
  }
  return 0;
}

export function countedNounAfterTsuNo(cursor: TokenCursor<MatcherToken>, startIdx: number): readonly [nounForm: string | null, skippedModifier: boolean] {
  const { tokens, end: n } = cursor;
  const start = tokens[startIdx];
  if (startIdx < n && start !== undefined && isCounterCountedNoun(start)) {
    return [start.dictionaryForm, false];
  }
  let idx = startIdx;
  let modifierUnits = 0;
  while (idx < n && modifierUnits < 3) {
    const width = simpleAdnominalModifierWidth(cursor, idx);
    if (width === 0) {
      break;
    }
    idx += width;
    modifierUnits += 1;
    const token = tokens[idx];
    if (idx < n && token !== undefined && isCounterCountedNoun(token)) {
      return [token.dictionaryForm, true];
    }
  }
  return [null, false];
}

export class TsuCounterContext {
  constructor(
    readonly relation: TsuRelation,
    readonly countedNounForm: string | null = null
  ) { }
}

export const DEGREE_MEASURE_CONTEXT = new Set([
  "温度", "気温", "体温", "水温", "室温", "乾球温度", "海水温", "体感温度",
  "角度", "仰角", "天頂角", "高度角", "回転角", "分岐角度", "観察角度",
  "傾斜", "傾斜角", "赤道傾斜角", "軌道傾斜角", "方位", "位相",
  "音域", "オクターヴ",
  "緯度", "経度", "北緯", "南緯", "東経", "西経", "赤道", "経線",
  "マイナス", "氷点下", "高熱", "熱", "発熱"
]);
export const DEGREE_MEASURE_TAIL = new Set(["以上", "以下", "未満", "前後", "付近", "近い", "くらい", "位", "程度", "まで", "から", "より"]);
export const DEGREE_MEASURE_PREDICATES = new Set(["設定", "固定", "回転", "変える", "変わる", "曲がる", "傾く", "傾ける", "上昇", "下がる", "超える", "測る", "測定", "調整", "動かす", "反転"]);
export const DEGREE_REPEAT_PREV = new Set(["もう", "再び", "過去", "これまで", "初めて"]);
export const DEGREE_REPEAT_TAIL = new Set(["も", "は", "だけ", "しか", "きり", "に", "の", "で", "から", "まで"]);
export const DEGREE_REPEAT_EVENT_NOUNS = new Set(["失敗", "成功", "経験", "会話", "遅刻", "流行", "受賞", "接種", "試験", "会議", "再婚", "履修", "挑戦", "説明", "確認", "旅行", "面接", "ノーベル賞", "バランス", "崩壊", "BAN"]);
export const DEGREE_REPEAT_EVENT_PREDICATES = new Set(["発生", "接種", "選出", "選ぶ", "選ばれる", "経験", "失敗", "成功", "見る", "見", "来る", "行く", "戻る", "確認", "話し合う", "相談", "受賞", "発表", "会う", "往復"]);
export const DEGREE_NI_RO_PREDICATES = new Set(["設定", "固定", "調整", "変える", "動かす", "回転", "反転"]);
export const DEGREE_EYE_OBJECT_PREDICATES = new Set(["伏せる", "つける", "付ける", "閉じる", "細める", "そらす", "逸らす"]);

export function isDegreeFollowedByMeasureObject(cursor: TokenCursor<MatcherToken>, degreeIdx: number): boolean {
  const { tokens, end: n } = cursor;
  return (
    degreeIdx + 3 < n &&
    DEGREE_MEASURE_CONTEXT.has(tokens[degreeIdx + 1]?.dictionaryForm ?? "") &&
    numericCaseParticleAt(tokens, degreeIdx + 2, ["を"]) &&
    (((tokens[degreeIdx + 3]?.pos ?? 0) & POS0) === 名詞 || ((tokens[degreeIdx + 3]?.pos ?? 0) & POS0) === 動詞)
  );
}

export function tsuCounterContext(
  cursor: TokenCursor<MatcherToken>,
  particleToken: MatcherToken | null,
  numeric: NumericTables
): TsuCounterContext {
  const { tokens, pos: numeralIdx, end: n } = cursor;
  if (numeralIdx + 1 >= n || tokens[numeralIdx + 1]?.dictionaryForm !== "つ") {
    return new TsuCounterContext("none");
  }
  if (
    numeralIdx >= 2 &&
    numericNominalLinkAt(tokens, numeralIdx - 1) &&
    isCounterCountedNoun(tokens[numeralIdx - 2]!)
  ) {
    return new TsuCounterContext("prev_no", tokens[numeralIdx - 2]?.dictionaryForm ?? null);
  }
  if (
    numeralIdx >= 2 &&
    ((tokens[numeralIdx - 1]?.pos ?? 0) & POS0) === 助詞 &&
    numeric.TSU_PREV_CASE_PARTICLES.has(tokens[numeralIdx - 1]?.surface ?? "") &&
    isCounterCountedNoun(tokens[numeralIdx - 2]!)
  ) {
    return new TsuCounterContext("prev_case", tokens[numeralIdx - 2]?.dictionaryForm ?? null);
  }
  if (particleToken === null) {
    return new TsuCounterContext("none");
  }
  const particleIdx = numeralIdx + 2;
  if (nominalLinkMarkerRelationForToken(particleToken, particleIdx, {
    consumers: ["numeric_semantics"]
  }) !== null) {
    const [nounForm, modified] = countedNounAfterTsuNo(cursor, particleIdx + 1);
    if (nounForm !== null) {
      return new TsuCounterContext(modified ? "after_no_modified" : "after_no", nounForm);
    }
    return new TsuCounterContext("none");
  }
  if (
    caseParticleMarkerRelationForToken(particleToken, particleIdx, {
      acceptedSurfaces: ["で"],
      consumers: ["numeric_semantics"]
    }) !== null &&
    particleIdx + 1 < n &&
    tokens[particleIdx + 1]?.surface === "も"
  ) {
    for (let idx = particleIdx + 2; idx < Math.min(n - 1, particleIdx + 6); idx += 1) {
      if (!numericNominalLinkAt(tokens, idx)) {
        continue;
      }
      const nounIdx = idx + 1;
      if (nounIdx < n && isCounterCountedNoun(tokens[nounIdx]!)) {
        return new TsuCounterContext("focus_no", tokens[nounIdx]?.dictionaryForm ?? null);
      }
    }
  }
  return new TsuCounterContext("none");
}

export function trySplitNumeralCounterSurface(surface: string): readonly [parsed: JapaneseNumber, counterSurface: string] | null {
  for (let splitPos = 1; splitPos < surface.length; splitPos += 1) {
    const parsed = parseJapaneseNumber(surface.slice(0, splitPos));
    if (parsed === undefined) {
      continue;
    }
    return [parsed, surface.slice(splitPos)];
  }
  return null;
}

export function formatDegreeMeasurement(
  token: MatcherToken,
  parsed: JapaneseNumber | null,
  options: DegreeSurfaceOptions
): string | null {
  const surface = token.surface;
  if (parsed !== null) {
    const numeral = options.positional
      ? (options.arabicSurface?.text ?? String(parsed))
      : (sinoKorean(parsed) ?? String(parsed));
    return `${numeral}도`;
  }
  if (surface.length > 0 && isDecimalSurface(surface.replace(".", ""))) {
    return `${surface}도`;
  }
  if (token.dictionaryForm === "数") {
    return "수도";
  }
  return null;
}

export function formatDegreeRepetition(
  token: MatcherToken,
  parsed: JapaneseNumber | null,
  options: DegreeSurfaceOptions
): string | null {
  if (token.dictionaryForm === "数") {
    return "수차례";
  }
  if (parsed === null) {
    return null;
  }
  return formatCounterPhraseForJapaneseNumber(parsed, "回", {
    forceArabic: options.positional,
    arabicSurface: options.arabicSurface ?? null
  });
}

export function hasDegreeMeasureSignal(cursor: TokenCursor<MatcherToken>, parsed: JapaneseNumber | null): boolean {
  const { tokens, pos: i, end: n } = cursor;
  if (isOneTwoThree(parsed) && isDegreeFollowedByMeasureObject(cursor, i + 1)) {
    return false;
  }
  const lo = Math.max(0, i - 5);
  const hi = Math.min(n, i + 8);
  const forms = new Set(tokens.slice(lo, hi).map((token) => token.dictionaryForm));
  if (hasSetIntersection(forms, DEGREE_MEASURE_CONTEXT)) {
    return true;
  }
  if (i + 2 < n && (tokens[i + 2]?.dictionaryForm === "分" || tokens[i + 2]?.dictionaryForm === "秒")) {
    return true;
  }
  if (
    i + 3 < n &&
    ((tokens[i + 2]?.pos ?? 0) & POS01) === 名詞_数詞 &&
    (tokens[i + 3]?.dictionaryForm === "分" || tokens[i + 3]?.dictionaryForm === "秒")
  ) {
    return true;
  }
  const after = i + 2 < n ? tokens[i + 2]?.dictionaryForm : undefined;
  const after2 = i + 3 < n ? tokens[i + 3]?.dictionaryForm : undefined;
  if (parsedGe(parsed, 10) && after !== undefined && DEGREE_MEASURE_TAIL.has(after)) {
    return true;
  }
  if ((after !== undefined && DEGREE_MEASURE_PREDICATES.has(after)) || (after2 !== undefined && DEGREE_MEASURE_PREDICATES.has(after2))) {
    return true;
  }
  if (parsedGe(parsed, 10) && (after === "に" || after === "を" || after === "で")) {
    return true;
  }
  return false;
}

export function hasDegreeRepeatSignal(cursor: TokenCursor<MatcherToken>, parsed: JapaneseNumber | null): boolean {
  const { tokens, pos: i, end: n } = cursor;
  const lo = Math.max(0, i - 5);
  const hi = Math.min(n, i + 8);
  const forms = new Set(tokens.slice(lo, hi).map((token) => token.dictionaryForm));
  const after = i + 2 < n ? tokens[i + 2]?.dictionaryForm : undefined;
  const prev = i > 0 ? tokens[i - 1]?.dictionaryForm : undefined;
  const prev2 = i > 1 ? tokens[i - 2]?.dictionaryForm : undefined;
  if (after === "と") {
    return true;
  }
  if ((prev !== undefined && DEGREE_REPEAT_PREV.has(prev)) || (prev2 !== undefined && DEGREE_REPEAT_PREV.has(prev2))) {
    return true;
  }
  if (hasSetIntersection(forms, DEGREE_REPEAT_EVENT_NOUNS)) {
    return true;
  }
  if (hasSetIntersection(forms, DEGREE_REPEAT_EVENT_PREDICATES)) {
    return true;
  }
  if (isOneTwoThree(parsed) && after !== undefined && DEGREE_REPEAT_TAIL.has(after)) {
    return true;
  }
  if (isOneTwoThree(parsed) && after !== "分" && after !== "秒") {
    return true;
  }
  if (tokens[i]?.dictionaryForm === "数" && hasSetIntersection(forms, DEGREE_REPEAT_EVENT_PREDICATES)) {
    return true;
  }
  return false;
}

export function degreeMeasureConsumesNi(cursor: TokenCursor<MatcherToken>, degreeIdx: number): boolean {
  const { tokens, end: n } = cursor;
  if (degreeIdx + 1 >= n || !numericCaseParticleAt(tokens, degreeIdx + 1, ["に"])) {
    return false;
  }
  for (const idx of [degreeIdx + 2, degreeIdx + 3]) {
    if (idx < n && DEGREE_NI_RO_PREDICATES.has(tokens[idx]?.dictionaryForm ?? "")) {
      return true;
    }
  }
  return false;
}

export function isFalseDegreeOrdinalEyePhrase(cursor: TokenCursor<MatcherToken>, degreeOrdinalIdx: number): boolean {
  const { tokens, end: n } = cursor;
  if (degreeOrdinalIdx + 1 >= n || !numericCaseParticleAt(tokens, degreeOrdinalIdx + 1, ["を"])) {
    return false;
  }
  for (const idx of [degreeOrdinalIdx + 2, degreeOrdinalIdx + 3]) {
    if (idx < n && DEGREE_EYE_OBJECT_PREDICATES.has(tokens[idx]?.dictionaryForm ?? "")) {
      return true;
    }
  }
  return false;
}

export interface DegreeSurfaceOptions {
  readonly positional: boolean;
  readonly arabicSurface?: NumeralSurfaceRealization | null;
  readonly approximationMarkers?: ReadonlyMap<string, QuantityApproximationMarker>;
}

export function tryDegreeCounter(
  cursor: TokenCursor<MatcherToken>,
  parsed: JapaneseNumber | null,
  options: DegreeSurfaceOptions
): string | undefined {
  const tokens = cursor.tokens;
  const i = cursor.pos;
  const n = cursor.end;
  const counterSpanEnd = i + 2;
  const finish = (consumed: number, korean: string): string => {
    const marker = quantityApproximationAfterCounterSpan(
      cursor,
      counterSpanEnd,
      i + consumed,
      options.approximationMarkers
    );
    if (marker !== undefined) {
      cursor.advance(consumed + 1);
      return `${korean} ${marker.korean}`;
    }
    cursor.advance(consumed);
    return korean;
  };
  if (i + 1 >= n) {
    return undefined;
  }
  const nextToken = tokens[i + 1]!;
  const nextForm = nextToken.dictionaryForm;
  const nextSurface = nextToken.surface;

  if (nextForm === "度目" || nextSurface === "度目") {
    if (parsed === null) {
      return undefined;
    }
    if (isFalseDegreeOrdinalEyePhrase(cursor, i + 1)) {
      const repeat = formatDegreeRepetition(tokens[i]!, parsed, options);
      return repeat === null ? undefined : finish(3, repeat);
    }
    const rendered = ORDINAL_TSU.render(parsed, "つ", {
      forceArabic: options.positional,
      arabicSurface: options.arabicSurface ?? null
    });
    if (rendered === undefined) {
      return undefined;
    }
    let consumed = 2;
    if (i + 2 < n && numericNominalLinkAt(tokens, i + 2)) {
      consumed = 3;
    }
    return finish(consumed, rendered[0]);
  }

  if (nextForm !== "度" && nextSurface !== "度") {
    return undefined;
  }

  if (hasDegreeMeasureSignal(cursor, parsed)) {
    const measure = formatDegreeMeasurement(tokens[i]!, parsed, options);
    if (measure === null) {
      return undefined;
    }
    if (degreeMeasureConsumesNi(cursor, i + 1)) {
      return finish(3, `${measure}로`);
    }
    return finish(2, measure);
  }

  if (hasDegreeRepeatSignal(cursor, parsed)) {
    const repeat = formatDegreeRepetition(tokens[i]!, parsed, options);
    if (repeat === null) {
      return undefined;
    }
    if (i + 2 < n && numericCaseParticleAt(tokens, i + 2, ["と"])) {
      return finish(3, `${repeat} 다시`);
    }
    return finish(2, repeat);
  }

  const measure = formatDegreeMeasurement(tokens[i]!, parsed, options);
  return measure === null ? undefined : finish(2, measure);
}

export type NumeralOutput = string | NumeralPlan;

export interface NumeralResolutionContext {
  readonly copulaPredicateStartsAt?: (index: number) => boolean;
}

export function isCounterCombinedNext(token: MatcherToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return isCounterCapableToken(token) || getCounterKorean(token.dictionaryForm) !== undefined;
}

export function numeralTokenReadOptions(
  cursor: TokenCursor<MatcherToken>,
  idx: number,
  numeric: NumericTables
): NumeralTokenReadOptions {
  return {
    zeroQuantitySurfaces: numeric.ZERO_QUANTITY_NUMERALS,
    counterCombined: idx + 1 < cursor.end && isCounterCombinedNext(cursor.tokens[idx + 1])
  };
}

function numeralBodySurface(analysis: NumeralSurfaceAnalysis): string {
  return analysis.realization?.text ?? String(analysis.value);
}

export function quantityApproximationMarker(
  token: MatcherToken | undefined,
  numeric: NumericTables
): QuantityApproximationMarker | undefined {
  return markerFrom(numeric.QUANTITY_APPROXIMATION_MARKERS, token);
}

function markerFrom(
  markers: ReadonlyMap<string, QuantityApproximationMarker>,
  token: MatcherToken | undefined
): QuantityApproximationMarker | undefined {
  if (token === undefined) {
    return undefined;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 接尾辞 && pos0 !== 名詞) {
    return undefined;
  }
  return markers.get(token.dictionaryForm) ?? markers.get(token.surface);
}

function quantityApproximationAfterCounterSpan(
  cursor: TokenCursor<MatcherToken>,
  counterSpanEndExclusive: number,
  consumed: number,
  markers: ReadonlyMap<string, QuantityApproximationMarker> | undefined
): QuantityApproximationMarker | undefined {
  if (markers === undefined || consumed !== counterSpanEndExclusive || counterSpanEndExclusive >= cursor.end) {
    return undefined;
  }
  return markerFrom(markers, cursor.tokens[counterSpanEndExclusive]);
}

function numeralChainBreaksAt(tokens: readonly MatcherToken[], idx: number): boolean {
  return separatedAs(tokens, idx, DETACHED_SEPARATIONS);
}

function numeralChainBreaksWithin(tokens: readonly MatcherToken[], start: number, end: number): boolean {
  for (let idx = start + 1; idx < end; idx += 1) {
    if (numeralChainBreaksAt(tokens, idx)) {
      return true;
    }
  }
  return false;
}

export function tryNumeral(
  cursor: TokenCursor<MatcherToken>,
  numeric: NumericTables,
  context: NumeralResolutionContext = {}
): NumeralOutput | undefined {
  const tokens = cursor.tokens;
  const i = cursor.pos;
  const n = cursor.end;
  const finish = (consumed: number, output: NumeralOutput): NumeralOutput => {
    cursor.advance(consumed);
    return output;
  };
  const token = tokens[i];
  if (token === undefined) {
    return undefined;
  }
  const ordinalCounters = new Map([["回", "회"], ["次", "차"], ["話", "화"]]);

  const mergedOrdinalAnalysis = token.surface.startsWith("第")
    ? analyzeNumeralSurface(token.surface.slice(1))
    : undefined;
  if (mergedOrdinalAnalysis !== undefined && i + 1 < n && ordinalCounters.has(tokens[i + 1]?.dictionaryForm ?? "")) {
    return finish(2, `제 ${numeralBodySurface(mergedOrdinalAnalysis)}${ordinalCounters.get(tokens[i + 1]!.dictionaryForm)}`);
  }

  if (i >= 1 && ((tokens[i - 1]?.pos ?? 0) & POS0) === 接頭辞 && tokens[i - 1]?.surface === "第") {
    const mergedOrdinal = trySplitNumeralCounterSurface(token.surface);
    if (mergedOrdinal !== null) {
      const [parsed, counterSurface] = mergedOrdinal;
      const koreanCounter = ordinalCounters.get(counterSurface);
      if (koreanCounter !== undefined) {
        const numeralPart = token.surface.slice(0, token.surface.length - counterSurface.length);
        const numeralAnalysis = analyzeNumeralSurface(numeralPart);
        return finish(1, `${numeralAnalysis === undefined ? String(parsed) : numeralBodySurface(numeralAnalysis)}${koreanCounter}`);
      }
    }
  }

  if ((token.pos & POS01) !== 名詞_数詞) {
    return undefined;
  }

  const numeralChainContinues = !numeralChainBreaksAt(tokens, i + 1);

  let symbolicPrefix = "";
  let analysis: NumeralSurfaceAnalysis | undefined = readNumeralToken(
    token,
    numeralTokenReadOptions(cursor, i, numeric)
  );
  if (analysis === undefined) {
    const symbolicSplit = splitSymbolicNumericPrefix(token.surface);
    if (symbolicSplit !== null) {
      symbolicPrefix = symbolicSplit[0];
      analysis = analyzeNumeralSurface(symbolicSplit[1]);
    }
  }
  const parsedRaw = analysis?.value;
  const parsed = asSafeNumber(parsedRaw);
  const surfaceRealization = analysis?.realization ?? null;

  if (numeralChainContinues && parsedRaw !== undefined && i + 2 < n && ((tokens[i + 1]?.pos ?? 0) & POS01) === 名詞_数詞 && tokens[i + 1]?.dictionaryForm === "数") {
    const approxPhrase = formatApproxCounterPhrase(parsedRaw, tokens[i + 2]!.dictionaryForm, { arabicSurface: surfaceRealization });
    if (approxPhrase !== undefined) {
      return finish(3, `${symbolicPrefix}${approxPhrase}`);
    }
  }

  if (numeralChainContinues && parsedRaw !== undefined && i + 1 < n && tokens[i + 1]?.surface === "十分" && (((tokens[i + 1]?.pos ?? 0) & POS0) === 副詞 || ((tokens[i + 1]?.pos ?? 0) & POS0) === 形状詞)) {
    const result30 = formatCounterPhrase(multiplyJapaneseNumber(parsedRaw, 10), "分");
    if (result30 !== undefined) {
      return finish(2, `${symbolicPrefix}${result30}`);
    }
  }

  const positional = analysis?.positional ?? false;
  const isOrdinal = i >= 1 && ((tokens[i - 1]?.pos ?? 0) & POS0) === 接頭辞 && tokens[i - 1]?.surface === "第";
  const degreeCounter = cursor.tryParse(c => tryDegreeCounter(c, parsedRaw ?? null, {
    positional,
    arabicSurface: surfaceRealization,
    approximationMarkers: numeric.QUANTITY_APPROXIMATION_MARKERS
  }));
  if (degreeCounter !== undefined) {
    return degreeCounter;
  }

  if (parsedRaw !== undefined && i + 1 < n && isOrdinal && ordinalCounters.has(tokens[i + 1]?.dictionaryForm ?? "")) {
    return finish(2, `${surfaceRealization?.text ?? String(parsedRaw)}${ordinalCounters.get(tokens[i + 1]!.dictionaryForm)}`);
  }

  if (numeralChainContinues && parsedRaw !== undefined && i + 1 < n) {
    const nextB = tokens[i + 1]!;
    if (nextB.dictionaryForm.length > 1) {
      const nextIndef = getIndefiniteNumeralReading(nextB.dictionaryForm, numeric);
      if (nextIndef !== undefined) {
        const curSino = sinoKorean(parsedRaw);
        if (curSino !== undefined) {
          const combined = `${stripIlPrefix(curSino)}${nextIndef.korean}`;
          if (i + 2 < n) {
            const counter = getCounterKorean(tokens[i + 2]!.dictionaryForm);
            if (counter !== undefined) {
              return finish(3, `${symbolicPrefix}${combined} ${counter}`);
            }
          }
          return finish(2, `${symbolicPrefix}${combined}`);
        }
      }
    }
  }

  if (parsedRaw !== undefined && i + 1 < n) {
    const counterKey = tokens[i + 1]!.dictionaryForm;
    const particleToken = i + 2 < n && ((tokens[i + 2]?.pos ?? 0) & POS0) === 助詞 ? tokens[i + 2]! : null;
    const particleSurface = particleToken === null
      ? null
      : (secondaryParticleCanonical(particleToken) ?? particleToken.surface);
    const particleCaseDe = particleToken !== null && caseParticleMarkerRelationForToken(particleToken, i + 2, {
      acceptedSurfaces: ["で"],
      consumers: ["numeric_semantics"]
    }) !== null;
    const particleNominalLink = particleToken !== null && nominalLinkMarkerRelationForToken(particleToken, i + 2, {
      consumers: ["numeric_semantics"]
    }) !== null;
    const afterParticle = particleToken !== null && i + 3 < n
      ? tokens[i + 3]!
      : (i + 2 < n ? tokens[i + 2]! : null);
    if (
      parsed === 1 &&
      counterKey === "人" &&
      particleCaseDe &&
      i + 3 < n &&
      tokens[i + 3]?.surface === "も" &&
      isDemoMinimumContextForParticle(cursor.fork(i + 3, n, i + 3))
    ) {
      return finish(4, `${symbolicPrefix}한 사람이라도`);
    }

    const particleStartsCopulaPredicate = particleCaseDe &&
      (context.copulaPredicateStartsAt?.(i + 2) ?? false);
    const tsuContext = tsuCounterContext(cursor, particleToken, numeric);
    const family = selectCounterFamily(parsedRaw, counterKey, numeric, {
      countedNounForm: tsuContext.countedNounForm,
      tsuRelation: tsuContext.relation,
      prevToken: i > 0 ? tokens[i - 1]! : null,
      nextToken: afterParticle,
      particle: particleSurface,
      particleStartsCopulaPredicate
    });
    const forceArabicTarget = forceArabicByTargetConvention(cursor, counterKey, numeric);
    const forceArabic = positional || forceArabicTarget;
    const rendered = family.render(parsedRaw, counterKey, { forceArabic });
    if (rendered !== undefined) {
      const [, absorbsParticle] = rendered;
      let consumed = 2;
      let counterSpanEnd = 2;
      if (family === ORDINAL_TSU && i + 2 < n && tokens[i + 2]?.surface === "目") {
        consumed = 3;
        counterSpanEnd = 3;
        if (i + 3 < n && numericNominalLinkAt(tokens, i + 3)) {
          consumed = 4;
        }
      }
      if (
        absorbsParticle &&
        !particleStartsCopulaPredicate &&
        particleToken !== null &&
        (
          particleCaseDe ||
          particleSurface === "きり" ||
          ((family === ATTRIBUTIVE_TSU || family === GENITIVE_TSU || family === KIND_TSU) && particleNominalLink) ||
          (family === DISTRIBUTIVE_TSU && particleSurface === "ずつ")
        )
      ) {
        consumed += 1;
        if (family === LONE_KIRI && particleSurface === "きり" && i + 3 < n && numericCaseParticleAt(tokens, i + 3, ["で"])) {
          consumed += 1;
        }
      }
      const approximation = quantityApproximationAfterCounterSpan(
        cursor,
        i + counterSpanEnd,
        i + consumed,
        numeric.QUANTITY_APPROXIMATION_MARKERS
      );
      if (approximation !== undefined) {
        consumed += 1;
      }
      const plan: NumeralPlan = {
        kind: "numeral",
        family,
        parsedNumber: parsedRaw,
        counterKey,
        symbolicPrefix,
        arabicSurface: surfaceRealization,
        positional,
        ...(analysis?.amountFormatted === true ? { amountFormatted: true } : {}),
        ...(forceArabicTarget ? { forceArabicByTargetConvention: true } : {}),
        ...(approximation === undefined ? {} : { approximation }),
        koreanPos: 수사
      };
      return finish(consumed, plan);
    }
    const fallbackCounter = formatCounterPhraseForJapaneseNumber(parsedRaw, counterKey, { forceArabic });
    if (fallbackCounter !== null) {
      const plan: NumeralPlan = {
        kind: "numeral",
        family: COUNTER,
        parsedNumber: parsedRaw,
        counterKey,
        symbolicPrefix,
        arabicSurface: surfaceRealization,
        positional,
        ...(analysis?.amountFormatted === true ? { amountFormatted: true } : {}),
        ...(forceArabicTarget ? { forceArabicByTargetConvention: true } : {}),
        koreanPos: 수사
      };
      return finish(2, plan);
    }
  }

  const indefinite = getIndefiniteNumeralReading(token.dictionaryForm, numeric);
  if (indefinite !== undefined) {
    if (i + 1 < n) {
      const nextA = tokens[i + 1]!;
      const nextParsedRaw = resolveNumeralTokenValue(nextA, numeralTokenReadOptions(cursor, i + 1, numeric));
      const nextIsNumeral = (nextA.pos & POS01) === 名詞_数詞;
      if (numeralChainContinues && nextParsedRaw !== undefined && nextIsNumeral) {
        const unitSino = sinoKorean(nextParsedRaw);
        if (unitSino !== undefined) {
          const combined = `${indefinite.korean}${stripIlPrefix(unitSino)}`;
          if (i + 2 < n) {
            const counter = getCounterKorean(tokens[i + 2]!.dictionaryForm);
            if (counter !== undefined) {
              return finish(3, `${symbolicPrefix}${combined} ${counter}`);
            }
          }
          return finish(2, `${symbolicPrefix}${combined}`);
        }
      }
      const counter = getCounterKorean(nextA.dictionaryForm);
      if (counter !== undefined) {
        const counterNumeral = indefinite.structure === "bare_prefix" &&
          indefinite.prefixClass === "interrogative"
          ? "몇"
          : indefinite.korean;
        return finish(2, `${symbolicPrefix}${counterNumeral} ${counter}`);
      }
    }
    if (token.dictionaryForm.length > 1) {
      return finish(1, `${symbolicPrefix}${indefinite.korean}`);
    }
    return undefined;
  }

  if (parsedRaw === undefined) {
    return undefined;
  }
  if (symbolicPrefix.length > 0) {
    return undefined;
  }

  const standalonePlan: NumeralPlan = {
    kind: "numeral",
    family: COUNTER,
    parsedNumber: parsedRaw,
    counterKey: "",
    symbolicPrefix: "",
    arabicSurface: surfaceRealization,
    positional,
    ...(analysis?.amountFormatted === true ? { amountFormatted: true } : {}),
    koreanPos: 수사
  };
  return finish(1, standalonePlan);
}

export function tryMergeNumericShite(cursor: TokenCursor<MatcherToken>): NumericSyntheticToken | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const numToken = tokens[i];
  const suffixToken = tokens[i + 1];
  const shiToken = tokens[i + 2];
  const teToken = tokens[i + 3];
  if (i + 3 >= n || numToken === undefined || suffixToken === undefined || shiToken === undefined || teToken === undefined) {
    return undefined;
  }
  if (numeralChainBreaksWithin(tokens, i, i + 4)) {
    return undefined;
  }
  if ((numToken.pos & POS01) !== 名詞_数詞) {
    return undefined;
  }
  if ((suffixToken.pos & POS01) !== 接尾辞_名詞的) {
    return undefined;
  }
  const counterKey = suffixToken.dictionaryForm || suffixToken.surface;
  if (counterKey.length === 0 || getCounterKorean(counterKey) === undefined) {
    return undefined;
  }
  if (shiToken.dictionaryForm !== "する" || (shiToken.pos & (POS0 | POS5A)) !== (動詞 | 連用形_)) {
    return undefined;
  }
  if ((teToken.pos & POS01) !== 助詞_接続助詞) {
    return undefined;
  }
  const parsedRaw = resolveNumeralTokenValue(numToken, { counterCombined: true });
  if (parsedRaw === undefined) {
    return undefined;
  }
  const parsed = asSafeNumber(parsedRaw);
  const rendered = parsed === null ? undefined : LONE_SHITE.render(parsed, counterKey);
  const koreanSurface = rendered?.[0] ?? renderLoneShiteForJapaneseNumber(parsedRaw, counterKey);
  if (koreanSurface === null) {
    return undefined;
  }
  const surface = `${numToken.surface}${suffixToken.surface}して`;
  const reading = `${numToken.reading ?? ""}${suffixToken.reading ?? ""}シテ`;
  cursor.advance(4);
  return {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: 副詞,
    koreanOverride: koreanSurface,
    syntheticReason: "numeric_shite",
    collocDone: true
  };
}

export function tryMergeNumericAgeNishite(cursor: TokenCursor<MatcherToken>): NumericSyntheticToken | undefined {
  const { tokens, pos: i, end: n } = cursor;
  const numToken = tokens[i];
  const daiToken = tokens[i + 1];
  const niToken = tokens[i + 2];
  const shiToken = tokens[i + 3];
  const teToken = tokens[i + 4];
  if (i + 4 >= n || numToken === undefined || daiToken === undefined || niToken === undefined || shiToken === undefined || teToken === undefined) {
    return undefined;
  }
  if (numeralChainBreaksWithin(tokens, i, i + 5)) {
    return undefined;
  }
  if ((numToken.pos & POS01) !== 名詞_数詞) {
    return undefined;
  }
  if (daiToken.dictionaryForm !== "代" || !pos0in(daiToken.pos, (1 << 名詞) | (1 << 接尾辞))) {
    return undefined;
  }
  if (!numericCaseParticleAt(tokens, i + 2, ["に"])) {
    return undefined;
  }
  if (shiToken.dictionaryForm !== "する" || (shiToken.pos & (POS0 | POS5A)) !== (動詞 | 連用形_)) {
    return undefined;
  }
  if ((teToken.pos & POS01) !== 助詞_接続助詞) {
    return undefined;
  }
  const numericSurface = numToken.surface;
  const numericReading = readNumeralToken(numToken, { counterCombined: true });
  const parsedRaw = numericReading?.value;
  if (parsedRaw === undefined) {
    return undefined;
  }
  const ageBand = formatCounterPhraseForJapaneseNumber(parsedRaw, "代", {
    forceArabic: numericReading?.positional === true,
    arabicSurface: numericReading?.realization ?? null
  });
  if (ageBand === null) {
    return undefined;
  }
  const surface = `${numericSurface}${daiToken.surface}にして`;
  const reading = `${numToken.reading ?? ""}${daiToken.reading ?? ""}ニシテ`;
  cursor.advance(5);
  return {
    surface,
    dictionaryForm: surface,
    reading,
    dictionaryFormReading: reading,
    pos: 副詞,
    koreanOverride: `${ageBand}에`,
    syntheticReason: "numeric_age_nishite",
    collocDone: true
  };
}

function asSafeNumber(value: JapaneseNumber | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null;
  }
  return Number.isSafeInteger(value) ? value : null;
}

function formatCounterPhraseForJapaneseNumber(
  value: JapaneseNumber,
  counterKey: string,
  options: { readonly forceArabic: boolean; readonly arabicSurface?: NumeralSurfaceRealization | null }
): string | null {
  return formatCounterPhrase(value, counterKey, {
    forceArabic: options.forceArabic,
    arabicSurface: options.arabicSurface ?? null
  }) ?? null;
}

function renderLoneShiteForJapaneseNumber(value: JapaneseNumber, counterKey: string): string | null {
  const counter = formatCounterPhraseForJapaneseNumber(value, counterKey, { forceArabic: false });
  return counter === null ? null : `${counter}이서`;
}

function multiplyJapaneseNumber(value: JapaneseNumber, factor: number): JapaneseNumber {
  return typeof value === "bigint" ? value * BigInt(factor) : value * factor;
}

function parsedGe(value: JapaneseNumber | null, threshold: number): boolean {
  if (value === null) {
    return false;
  }
  return typeof value === "bigint" ? value >= BigInt(threshold) : value >= threshold;
}

function isOneTwoThree(value: JapaneseNumber | null): boolean {
  return value === 1 || value === 2 || value === 3 || value === 1n || value === 2n || value === 3n;
}

function stripIlPrefix(sino: string): string {
  return sino.length > 1 && sino.startsWith("일") && (sino.slice(1) === "만" || sino.slice(1) === "억" || sino.slice(1) === "조")
    ? sino.slice(1)
    : sino;
}

function hasSetIntersection<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  for (const item of left) {
    if (right.has(item)) {
      return true;
    }
  }
  return false;
}

function isDecimalDigit(ch: string): boolean {
  return /^\p{Decimal_Number}$/u.test(ch);
}

function isDecimalSurface(surface: string): boolean {
  return /^\p{Decimal_Number}+$/u.test(surface);
}

function isNumericChar(ch: string): boolean {
  return /\p{Number}/u.test(ch);
}
