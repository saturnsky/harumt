import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS4, 形状詞, 形容詞0, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 動詞, 補助記号, 부사 } from "../../types/pos.js";
import { isContentAdmissionToken } from "../lookup-tables.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { TokenCursor } from "../token-cursor.js";
import { UnitType } from "../translation/unit.js";
import { hasHardTerminalPunctuationClass, hasHardTerminalPunctuationRelation } from "../head-tail/boundary/punctuation.js";
import { type AssemblyContentSpan, makeAssemblyContentSpan } from "../assembly-content-span.js";
import { isAssemblerTerminalQuestionKa } from "./question-plan.js";

const NANDE_INSTRUMENT_PREDICATE_FOR_OBJECT = new Set([
  "書く",
  "描く",
  "切る",
  "撮る",
  "録る",
  "写す",
  "拭く",
  "洗う",
  "磨く",
  "掃除",
  "清掃",
  "洗濯",
  "撮影",
  "録音",
  "録画"
]);

const NANDE_INSTRUMENT_SAHEN_NOUNS = new Set(["掃除", "清掃", "洗濯", "撮影", "録音", "録画"]);

function nextNonSymbolTokenIndex(tokens: readonly RuntimeHaruToken[], start: number, end: number): number | undefined {
  for (let index = start; index < end; index += 1) {
    if (((tokens[index]?.pos ?? 0) & POS0) !== 補助記号) {
      return index;
    }
  }
  return undefined;
}

function hasNegativePoliteBenefactiveQuestionAfter(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const c = cursor.fork();
  while (true) {
    const token = c.current();
    if (token === undefined) {
      return false;
    }
    if (hasHardTerminalPunctuationRelation(token, c.pos, ["assembler"])) {
      return false;
    }
    if (token.dictionaryForm !== "くれる" && token.dictionaryForm !== "いただける") {
      c.advance();
      continue;
    }
    let hasPolite = false;
    let hasNegative = false;
    const inner = c.fork(c.pos + 1);
    while (true) {
      const tail = inner.current();
      if (tail === undefined) {
        return false;
      }
      if (hasHardTerminalPunctuationRelation(tail, inner.pos, ["assembler"])) {
        return false;
      }
      if (isAssemblerTerminalQuestionKa(cursor.tokens, inner.pos)) {
        return hasPolite && hasNegative;
      }
      const pos4 = (tail.pos & POS4);
      if ((pos4 === 助動詞_マス) || (pos4 === 助動詞_デス)) {
        hasPolite = true;
      }
      if ((pos4 === 助動詞_ナイ) || (pos4 === 助動詞_ヌ)) {
        hasNegative = true;
      }
      inner.advance();
    }
    return false;
  }
  return false;
}

function hasReasonQuestionContextAfter(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  let sawArgumentContent = false;
  let sawInstrumentArgument = false;
  let firstPredicateDictionaryForm: string | undefined;
  let previousContentDictionaryForm: string | undefined;
  const c = cursor.fork();
  while (true) {
    const token = c.current();
    if (token === undefined) {
      return false;
    }
    const surface = token.surface;
    const pos0 = token.pos & POS0;
    if ((pos0 === 補助記号)) {
      if (!hasHardTerminalPunctuationClass(token, c.pos, ["question"], ["assembler"])) {
        return false;
      }
      if (!sawArgumentContent) {
        return false;
      }
      return !(sawInstrumentArgument && firstPredicateDictionaryForm !== undefined && NANDE_INSTRUMENT_PREDICATE_FOR_OBJECT.has(firstPredicateDictionaryForm));
    }
    if (isAssemblerTerminalQuestionKa(cursor.tokens, c.pos)) {
      if (!sawArgumentContent) {
        return false;
      }
      return !(sawInstrumentArgument && firstPredicateDictionaryForm !== undefined && NANDE_INSTRUMENT_PREDICATE_FOR_OBJECT.has(firstPredicateDictionaryForm));
    }
    if (
      sawArgumentContent &&
      caseParticleMarkerRelationForToken(token, c.pos, {
        acceptedSurfaces: ["を", "に", "で"],
        consumers: ["assembler"]
      }) !== null
    ) {
      sawInstrumentArgument = true;
      c.advance();
      continue;
    }
    if ((pos0 === 動詞) || (pos0 === 形容詞0) || (pos0 === 形状詞)) {
      if (firstPredicateDictionaryForm === undefined) {
        const dictionaryForm = token.dictionaryForm || surface;
        firstPredicateDictionaryForm = dictionaryForm === "する" && previousContentDictionaryForm !== undefined && NANDE_INSTRUMENT_SAHEN_NOUNS.has(previousContentDictionaryForm)
          ? previousContentDictionaryForm
          : dictionaryForm;
      }
      c.advance();
      continue;
    }
    if (isContentAdmissionToken(token)) {
      sawArgumentContent = true;
      previousContentDictionaryForm = token.dictionaryForm || surface;
    }
    c.advance();
  }
  return false;
}

export function trySplitNandeReasonSpan(cursor: TokenCursor<RuntimeHaruToken>): AssemblyContentSpan | undefined {
  const tokens = cursor.tokens;
  const index = cursor.pos;
  const n = cursor.end;
  const token = cursor.current();
  if (token === undefined) {
    return undefined;
  }
  if (!["何", "なん"].includes(token.surface) && !["何", "なん"].includes(token.dictionaryForm)) {
    return undefined;
  }
  const deIndex = nextNonSymbolTokenIndex(tokens, index + 1, n);
  if (deIndex === undefined) {
    return undefined;
  }
  const deToken = tokens[deIndex];
  if (caseParticleMarkerRelationForToken(deToken, deIndex, {
    acceptedSurfaces: ["で"],
    acceptedParticleSubtypes: ["格助詞", "接続助詞", "副助詞"],
    consumers: ["assembler"]
  }) === null) {
    return undefined;
  }
  const reasonProbeOffset = deIndex + 1 - index;
  if (
    !cursor.lookahead(reasonProbeOffset, hasNegativePoliteBenefactiveQuestionAfter) &&
    !cursor.lookahead(reasonProbeOffset, hasReasonQuestionContextAfter)
  ) {
    return undefined;
  }
  const consumed = deIndex - index + 1;
  const span = makeAssemblyContentSpan(index, consumed, "왜", 부사, null, UnitType.CONTENT);
  cursor.advance(consumed);
  return span;
}
