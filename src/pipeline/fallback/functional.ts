
import { extractFeatures } from "../../generator/aux-map.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { PipelineAssemblerMixin } from "../assembler.js";
import { kaMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { hasHardTerminalPunctuationClass } from "../head-tail/boundary/punctuation.js";
import type { FunctionalChainKind, LookupTables } from "../lookup-tables.js";
import { isCopulaAuxToken } from "../semantics/copula-tail-runtime.js";
import { FunctionalKind, TranslationUnit, UnitType, emitsOutput } from "../translation/unit.js";
import type { RenderPlan } from "../../types/render-plan.js";


import { POS0, POS01, POS4, POS5A, 意志推量形_, 記号, 助詞, 助詞_終助詞, 助動詞, 助動詞_タ, 助動詞_マス, 補助記号, 부사, 조사, 기호 } from "../../types/pos.js";
function minimalCopulaFallbackPlan(options: {
  readonly polite: boolean;
  readonly past: boolean;
  readonly question: boolean;
}, lookups: LookupTables): RenderPlan {
  const kind = options.past && options.polite
    ? "deshita"
    : options.past
      ? "datta"
      : options.polite
        ? "desu"
        : "da";
  return registerFunctionalChainPlan(kind, options.question, lookups);
}

function minimalMasuFallbackPlan(options: {
  readonly past: boolean;
  readonly question: boolean;
}, lookups: LookupTables): RenderPlan {
  return registerFunctionalChainPlan(options.past ? "mashita" : "masu", options.question, lookups);
}

function registerFunctionalChainPlan(kind: FunctionalChainKind, question: boolean, lookups: LookupTables): RenderPlan {
  const casual = lookups.functionalChainRealization(kind, { formal: false, question });
  const formal = lookups.functionalChainRealization(kind, { formal: true, question });
  return casual === formal
    ? { kind: "fixedText", text: casual, koreanPos: 조사 }
    : { kind: "registerText", casual, formal, koreanPos: 조사 };
}

function isFunctionalFallbackQuestionKa(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  return kaMarkerRelationAt(tokens, index, ["functional_fallback"]) !== null;
}

function detectFunctionalQuestion(
  tokens: readonly RuntimeHaruToken[],
  cursor: number,
  end: number
): number {
  if (cursor >= end || !isFunctionalFallbackQuestionKa(tokens, cursor)) {
    return 0;
  }
  if (
    cursor + 1 < end
    && hasHardTerminalPunctuationClass(tokens[cursor + 1], cursor + 1, ["question", "japanese_period"], ["functional_fallback"])
  ) {
    return 2;
  }
  return 1;
}

function emitFunctionalUnits(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  auxLen: number,
  cursor: number,
  questionConsumed: number,
  units: TranslationUnit[],
  plan: RenderPlan
): number {
  units.push(PipelineAssemblerMixin.makeUnit(tokens, index, auxLen, "", {
    unitType: UnitType.FUNCTIONAL,
    koreanPos: 조사,
    functionalKind: FunctionalKind.CONTEXTUAL,
    renderPlan: plan
  }));
  if (questionConsumed > 0) {
    units.push(PipelineAssemblerMixin.makeUnit(tokens, cursor, questionConsumed, "?", {
      unitType: UnitType.SYMBOL,
      koreanPos: 기호,
      attachLeft: true,
      attachRight: true
    }));
  }
  return auxLen + questionConsumed;
}

export function tryEmitFunctionalCopulaChunk(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  end: number,
  units: TranslationUnit[],
  options: { readonly lookups: LookupTables }
): number | undefined {
  const token = tokens[index];
  if (token === undefined || !isCopulaAuxToken(token)) {
    return undefined;
  }

  let cursor = index + 1;
  const tokenPos5a = token.pos & POS5A;
  if (tokenPos5a !== 意志推量形_ && cursor < end && ((tokens[cursor]?.pos ?? 0) & POS4) === 助動詞_タ) {
    cursor += 1;
  }

  const auxTokens = tokens.slice(index, cursor);
  const questionConsumed = detectFunctionalQuestion(tokens, cursor, end);
  const features = extractFeatures(auxTokens, { lookups: options.lookups });
  const plan = minimalCopulaFallbackPlan({
    polite: features.polite,
    past: features.past,
    question: questionConsumed > 0
  }, options.lookups);
  return emitFunctionalUnits(tokens, index, auxTokens.length, cursor, questionConsumed, units, plan);
}

export function tryEmitFunctionalMasuChunk(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  end: number,
  units: TranslationUnit[],
  options: { readonly lookups: LookupTables }
): number | undefined {
  const token = tokens[index];
  if (token === undefined || (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_マス)) {
    return undefined;
  }

  let cursor = index + 1;
  if (cursor < end && ((tokens[cursor]?.pos ?? 0) & POS4) === 助動詞_タ) {
    cursor += 1;
  }

  const auxTokens = tokens.slice(index, cursor);
  const questionConsumed = detectFunctionalQuestion(tokens, cursor, end);
  const features = extractFeatures(auxTokens, { lookups: options.lookups });
  const plan = minimalMasuFallbackPlan({
    past: features.past,
    question: questionConsumed > 0
  }, options.lookups);
  return emitFunctionalUnits(tokens, index, auxTokens.length, cursor, questionConsumed, units, plan);
}

function absorbTrailingShuujoshi(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  end: number,
  units: TranslationUnit[]
): number {
  const lastUnit = units[units.length - 1];
  if (lastUnit === undefined) return index;
  while (index < end) {
    const t = tokens[index];
    if (t === undefined) break;
    if ((t.pos & POS01) === 助詞_終助詞) {
      lastUnit.jpIndices.push(index);
      index += 1;
      continue;
    }
    break;
  }
  return index;
}

export function buildFunctionalUnitsForRange(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number,
  options: { readonly includeSymbols?: boolean; readonly lookups: LookupTables }
): TranslationUnit[] | undefined {
  const fallbackUnits: TranslationUnit[] = [];
  let index = start;
  while (index < end) {
    const token = tokens[index];
    const p0 = (token?.pos ?? 0) & POS0;

    if (p0 === 補助記号 || p0 === 記号) {
      if (options.includeSymbols !== false && token !== undefined) {
        if (token.surface.length > 0) {
          fallbackUnits.push(PipelineAssemblerMixin.makeUnit(tokens, index, 1, token.surface, {
            unitType: UnitType.SYMBOL,
            koreanPos: 기호,
            attachLeft: true,
            attachRight: true
          }));
        } else {
          const prev = fallbackUnits[fallbackUnits.length - 1];
          if (prev !== undefined && !prev.jpIndices.includes(index)) {
            prev.jpIndices.push(index);
          }
        }
      }
      index += 1;
      continue;
    }

    const copulaChunk = tryEmitFunctionalCopulaChunk(tokens, index, end, fallbackUnits, { lookups: options.lookups });
    if (copulaChunk !== undefined) {
      index += copulaChunk;
      index = absorbTrailingShuujoshi(tokens, index, end, fallbackUnits);
      continue;
    }

    const masuChunk = tryEmitFunctionalMasuChunk(tokens, index, end, fallbackUnits, { lookups: options.lookups });
    if (masuChunk !== undefined) {
      index += masuChunk;
      index = absorbTrailingShuujoshi(tokens, index, end, fallbackUnits);
      continue;
    }

    if (isFunctionalFallbackQuestionKa(tokens, index)) {
      fallbackUnits.push(PipelineAssemblerMixin.makeUnit(tokens, index, 1, "?", {
        unitType: UnitType.SYMBOL,
        koreanPos: 기호,
        attachLeft: true,
        attachRight: true
      }));
      index += 1;
      continue;
    }

    if (p0 === 助動詞 || p0 === 助詞) {
      fallbackUnits.push(PipelineAssemblerMixin.makeUnit(tokens, index, 1, token?.surface ?? "", {
        unitType: UnitType.CONTENT,
        koreanPos: 부사,
        attachLeft: false,
        attachRight: false
      }));
      index += 1;
      continue;
    }

    index += 1;
  }

  return fallbackUnits.length === 0 ? undefined : fallbackUnits;
}

export function buildFunctionalMinimalFallbackUnits(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  options: { readonly lookups: LookupTables }
): TranslationUnit[] | undefined {
  if (units.some((unit) => emitsOutput(unit) && unit.unitType !== UnitType.SYMBOL)) {
    return undefined;
  }
  return buildFunctionalUnitsForRange(tokens, 0, tokens.length, {
    includeSymbols: true,
    lookups: options.lookups
  });
}

export function buildLeadingFunctionalPrefixUnits(
  tokens: readonly RuntimeHaruToken[],
  units: readonly TranslationUnit[],
  options: { readonly lookups: LookupTables }
): { readonly units: TranslationUnit[]; readonly replaceEndExclusive: number } | undefined {
  let firstOutputIndex: number | undefined;
  for (const unit of units) {
    if (!emitsOutput(unit) || unit.unitType === UnitType.SYMBOL) {
      continue;
    }
    const unitStart = Math.min(...unit.jpIndices);
    if (unitStart < 0) {
      continue;
    }
    if (firstOutputIndex === undefined || unitStart < firstOutputIndex) {
      firstOutputIndex = unitStart;
    }
  }
  if (firstOutputIndex === undefined || firstOutputIndex <= 0) {
    return undefined;
  }

  if (units.some((unit) => emitsOutput(unit) && unit.unitType !== UnitType.SYMBOL && Math.max(...unit.jpIndices) < firstOutputIndex)) {
    return undefined;
  }

  const allowedPos0 = new Set<number>([助動詞, 助詞, 補助記号, 記号]);
  for (let index = 0; index < firstOutputIndex; index += 1) {
    if (!allowedPos0.has((tokens[index]?.pos ?? 0) & POS0)) {
      return undefined;
    }
  }

  const prefixUnits = buildFunctionalUnitsForRange(tokens, 0, firstOutputIndex, {
    includeSymbols: true,
    lookups: options.lookups
  });
  if (prefixUnits === undefined || !prefixUnits.some((unit) => emitsOutput(unit) && unit.unitType !== UnitType.SYMBOL)) {
    return undefined;
  }
  return { units: prefixUnits, replaceEndExclusive: firstOutputIndex };
}
