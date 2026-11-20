import { extractFeatures as auxExtractFeatures, nounCopulaConnective } from "../../generator/aux-map.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { hasRentaikei, isTameReasonHeadContext } from "../attributive.js";
import { isKaDouKaMarker, terminalQuestionKaRelationAt } from "../head-tail/boundary/ka-ownership.js";
import { looksEmbeddedQuestionKaNominalizedBoundary } from "../quote/embedded-question.js";
import { isUnrealizableCopulaPoliteAuxiliaryMood } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { PREDICATE_POS } from "../commitment/types.js";
import { POS0, POS01, POS4, 助詞, 助詞_格助詞, 助動詞_マス, 補助記号, 대명사, 명사, 수사, 구 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import type { AuxTokens } from "../matchers.js";
import type { PredicateHeadTailChainHostTextPart } from "../head-tail/lifecycle/head-tail-render-plan.js";
import { trailingCopulaSfpTail } from "../semantics/copula-tail-runtime.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { emitsOutput, lastOutputUnit, lastUnit, type TranslationUnit, UnitType } from "../translation/unit.js";
import { hasHardTerminalPunctuationClass, isTrailingPunctuationToken } from "../head-tail/boundary/punctuation.js";
import { isParentheticalClosingToken, parentheticalSpanEndingAt } from "../head-tail/boundary/parenthetical.js";
import { sourceSpanForTokenIndexes } from "../source-coordinate.js";
import { isClauseCommaPunctuationUnit } from "../rendering/terminal-unit-punctuation.js";

export function canCarryCopulaHostPlan(unit: TranslationUnit): boolean {
  return unit.unitType !== UnitType.SYMBOL && unit.allomorphKey === null;
}

export function decorationSurfaceParts(
  tokens: readonly RuntimeHaruToken[],
  span: { readonly start: number; readonly endExclusive: number },
  decorationUnits: readonly TranslationUnit[]
): readonly PredicateHeadTailChainHostTextPart[] {
  const parts: PredicateHeadTailChainHostTextPart[] = [];
  for (let idx = span.start; idx < span.endExclusive; idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    const owner = decorationUnits.find((unit) => unit.jpIndices.includes(idx)) ?? null;
    parts.push({
      kind: "hostText",
      text: token.surface,
      sourceSpan: sourceSpanForTokenIndexes(tokens, [idx]),
      unit: owner,
      decoration: true
    });
  }
  return parts;
}

export function isQuoteClosingCopulaHostAt(
  tokens: readonly RuntimeHaruToken[],
  deIdx: number
): boolean {
  const closeIdx = previousNonSpaceIndex(tokens, deIdx);
  return closeIdx !== null &&
    isParentheticalClosingToken(tokens[closeIdx]) &&
    parentheticalSpanEndingAt(tokens, closeIdx, { consumers: ["assembler"] }) !== null;
}

export function isNominalizedQuestionCopulaComplementAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  kaIdx: number
): boolean {
  return looksEmbeddedQuestionKaNominalizedBoundary(cursor.fork(kaIdx, cursor.end, kaIdx)) ||
    isKaDouKaMarker(cursor.tokens, kaIdx);
}

export function politeCopulaSupportTailIsRealizable(
  tokens: readonly RuntimeHaruToken[],
  aruAux: AuxTokens,
  afterAux: number,
  end: number,
  lookups: LookupTables
): boolean {
  if (aruAux.length === 0) {
    return true;
  }
  if (aruAux.some(aux => isUnrealizableCopulaPoliteAuxiliaryMood(aux))) {
    return false;
  }
  const lastAux = aruAux[aruAux.length - 1];
  if (lastAux !== undefined && (lastAux.pos & POS4) === 助動詞_マス && hasRentaikei(lastAux)) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, afterAux, end);
  if (
    kaIdx !== null &&
    terminalQuestionKaRelationAt(tokens, kaIdx, { lookups }) !== null
  ) {
    return false;
  }
  if (trailingCopulaSfpTail(new TokenCursor(tokens, afterAux, end)) !== null) {
    return false;
  }
  return true;
}

interface NominalDakeCopulaHost {
  readonly mode: "inline" | "suffix";
  readonly unit: TranslationUnit;
  readonly renderPlan: RenderPlan;
}

export function nominalDakeCopulaHostUnit(units: readonly TranslationUnit[]): NominalDakeCopulaHost | null {
  const last = lastOutputUnit(units);
  if (last === undefined) {
    return null;
  }
  const direct = nominalDakeCopulaHostFromUnit(last);
  if (direct !== null) {
    return {
      mode: "inline",
      ...direct,
    };
  }
  if (last.unitType !== UnitType.SYMBOL || !isTrailingPunctuationToken(last.jpHead)) {
    return null;
  }
  for (let index = units.length - 2; index >= 0; index -= 1) {
    const unit = units[index];
    if (unit === undefined || !emitsOutput(unit)) {
      continue;
    }
    if (unit.unitType === UnitType.SYMBOL) {
      if (isTrailingPunctuationToken(unit.jpHead)) {
        continue;
      }
      return null;
    }
    const host = nominalDakeCopulaHostFromUnit(unit);
    return host === null
      ? null
      : {
        mode: "suffix",
        ...host,
      };
  }
  return null;
}

function nominalDakeCopulaHostFromUnit(unit: TranslationUnit): Omit<NominalDakeCopulaHost, "mode"> | null {
  const renderPlan = unit.renderPlan;
  if (
    renderPlan === null ||
    PREDICATE_POS.has(unit.koreanPos) ||
    (unit.koreanPos !== 명사 && unit.koreanPos !== 대명사 && unit.koreanPos !== 수사 && unit.koreanPos !== 구)
  ) {
    return null;
  }
  return { unit, renderPlan };
}

export function punctuatedCopulaTailHostUnit(units: readonly TranslationUnit[]): TranslationUnit | undefined {
  const last = lastUnit(units);
  if (last === undefined || last.unitType !== UnitType.SYMBOL || !isCopulaTailContinuationPunctuationUnit(last)) {
    return undefined;
  }
  for (let index = units.length - 2; index >= 0; index -= 1) {
    const unit = units[index];
    if (unit === undefined || !emitsOutput(unit)) {
      continue;
    }
    if (unit.unitType === UnitType.SYMBOL) {
      if (isCopulaTailContinuationPunctuationUnit(unit)) {
        continue;
      }
      return undefined;
    }
    return unit;
  }
  return undefined;
}

function isCopulaTailContinuationPunctuationUnit(unit: TranslationUnit): boolean {
  return isTrailingPunctuationToken(unit.jpHead) || isClauseCommaPunctuationUnit(unit);
}

export function isEllipticConfirmationParticle(
  token: RuntimeHaruToken,
  particles: ReadonlySet<string>
): boolean {
  return (token.pos & POS0) === 助詞 && particles.has(token.surface);
}

export function isNaniDeConfirmationVeto(
  tokens: readonly RuntimeHaruToken[],
  particleIdx: number
): boolean {
  const particle = tokens[particleIdx];
  if (particle === undefined || particle.surface !== "で" || (particle.pos & POS01) !== 助詞_格助詞) {
    return false;
  }
  const nounIdx = previousNonSpaceIndex(tokens, particleIdx, 0);
  const noun = nounIdx === null ? undefined : tokens[nounIdx];
  if (noun === undefined) {
    return false;
  }
  return noun.surface === "何" ||
    noun.surface === "なに" ||
    noun.dictionaryForm === "何" ||
    noun.reading === "ナニ" ||
    noun.reading === "ナン";
}

export function matchEllipticConfirmationTerminal(
  tokens: readonly RuntimeHaruToken[],
  desuIdx: number,
  end: number
): { readonly kaIdx: number; readonly endExclusive: number } | null {
  const kaIdx = nextNonSpaceIndex(tokens, desuIdx + 1, end);
  if (kaIdx === null) {
    return null;
  }
  const ka = tokens[kaIdx];
  if (ka === undefined || ka.surface !== "か" || (ka.pos & POS0) !== 助詞) {
    return null;
  }
  const afterIdx = nextNonSpaceIndex(tokens, kaIdx + 1, end);
  if (afterIdx === null) {
    return { kaIdx, endExclusive: kaIdx + 1 };
  }
  const after = tokens[afterIdx];
  if (
    after !== undefined &&
    (after.pos & POS0) === 補助記号 &&
    hasHardTerminalPunctuationClass(after, afterIdx, ["japanese_period", "question"], ["assembler"])
  ) {
    return { kaIdx, endExclusive: afterIdx + 1 };
  }
  return null;
}

export function trailingCopulaConnectiveSuffix(
  preceding: string,
  connective: string,
  auxTokens: AuxTokens,
  lookups: LookupTables
): string {
  if (preceding.length === 0) {
    return "";
  }
  const features = auxExtractFeatures(auxTokens, { lookups });
  const full = nounCopulaConnective(preceding, connective, features.past);
  return full.startsWith(preceding) ? full.slice(preceding.length) : "";
}

export function nominalDakeTameReasonTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  contentIdx: number,
  lookups: LookupTables
): boolean {
  const { tokens, pos: start } = cursor;
  const headToken = tokens[start] ?? null;
  if (!isTameReasonHeadContext(headToken, tokens, contentIdx, lookups)) {
    return false;
  }
  cursor.advance(1);
  return true;
}
