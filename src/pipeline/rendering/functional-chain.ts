import { koreanPredicateAuxChain, renderKoreanPredicateTerminal } from "../../generator/aux-map.js";
import { irregularType, type IrregularType } from "../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";


import { POS0, POS4, POS5A, 意志推量形_, 助動詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_マス } from "../../types/pos.js";
import type { FunctionalChainResidualPlan } from "../../types/render-plan.js";
type FunctionalAuxToken = Pick<RuntimeHaruToken, "pos">;

export type FunctionalChunkKind = "desu" | "deshita" | "deshou" | "masu" | "mashita" | "mashou" | "unknown";

export function splitFunctionalAuxChunks<T extends FunctionalAuxToken>(auxTokens: readonly T[]): readonly (readonly T[])[] | null {
  const chunks: T[][] = [];
  let i = 0;
  const n = auxTokens.length;
  while (i < n) {
    const token = auxTokens[i];
    if (token === undefined || (token.pos & POS0) !== 助動詞) {
      return null;
    }
    const pos4 = token.pos & POS4;
    const pos5a = token.pos & POS5A;

    if (pos4 === 助動詞_デス || pos4 === 助動詞_ダ) {
      const chunk = [token];
      i += 1;
      if (pos5a !== 意志推量形_ && i < n && ((auxTokens[i]?.pos ?? 0) & POS4) === 助動詞_タ) {
        const tail = auxTokens[i];
        if (tail !== undefined) {
          chunk.push(tail);
        }
        i += 1;
      }
      chunks.push(chunk);
      continue;
    }

    if (pos4 === 助動詞_マス) {
      const chunk = [token];
      i += 1;
      if (i < n && ((auxTokens[i]?.pos ?? 0) & POS4) === 助動詞_タ) {
        const tail = auxTokens[i];
        if (tail !== undefined) {
          chunk.push(tail);
        }
        i += 1;
      }
      chunks.push(chunk);
      continue;
    }

    return null;
  }
  return chunks.length > 1 ? chunks : null;
}

export function functionalChunkKind(chunk: readonly FunctionalAuxToken[]): FunctionalChunkKind {
  const head = chunk[0];
  if (head === undefined) {
    return "unknown";
  }
  const pos4 = head.pos & POS4;
  const pos5a = head.pos & POS5A;
  if (pos4 === 助動詞_デス || pos4 === 助動詞_ダ) {
    if (pos5a === 意志推量形_) {
      return "deshou";
    }
    if (chunk.length > 1 && ((chunk[1]?.pos ?? 0) & POS4) === 助動詞_タ) {
      return "deshita";
    }
    return "desu";
  }
  if (pos4 === 助動詞_マス) {
    if (pos5a === 意志推量形_) {
      return "mashou";
    }
    if (chunk.length > 1 && ((chunk[1]?.pos ?? 0) & POS4) === 助動詞_タ) {
      return "mashita";
    }
    return "masu";
  }
  return "unknown";
}

export function isNormalFunctionalChain(chunks: readonly (readonly FunctionalAuxToken[])[]): boolean {
  const kinds = chunks.map((chunk) => functionalChunkKind(chunk));
  if (kinds.some((kind) => kind === "unknown")) {
    return false;
  }
  if (kinds.length === 1) {
    return true;
  }
  return kinds.length === 2 && kinds[0] === "masu" && kinds[1] === "deshita";
}

export function renderRepeatedFunctionalAuxSuffix(
  chunk: readonly FunctionalAuxToken[],
  options: { readonly formal: boolean; readonly question: boolean; readonly lookups: LookupTables }
): string {
  const kind = functionalChunkKind(chunk);
  if (kind === "unknown") {
    return "";
  }
  return options.lookups.functionalChainRealization(kind, {
    formal: options.formal,
    question: options.question,
    suffix: true
  });
}

export function renderRepeatedFunctionalChainText(options: {
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly chunks: readonly (readonly RuntimeHaruToken[])[];
  readonly formal: boolean;
  readonly question: boolean;
  readonly jpDictForm?: string | null;
  readonly verbConjType?: number | null;
  readonly forcePassive: boolean;
  readonly lookups: LookupTables;
}): string {
  const firstChunk = options.chunks[0] ?? [];
  const first = renderKoreanPredicateTerminal(
    options.koreanLemma,
    irregularType(options.irregular),
    options.koreanPos,
    koreanPredicateAuxChain(firstChunk),
    {
      formal: options.formal,
      ...(options.jpDictForm === undefined || options.jpDictForm === null ? {} : { jpDictForm: options.jpDictForm }),
      ...(options.verbConjType === undefined || options.verbConjType === null ? {} : { verbConjType: options.verbConjType }),
      forcePassive: options.forcePassive,
      lookups: options.lookups
    }
  ).text;

  if (options.question) {
    const middle = options.chunks.slice(1, -1)
      .map((chunk) => renderRepeatedFunctionalAuxSuffix(chunk, { formal: options.formal, question: false, lookups: options.lookups }))
      .join("");
    const lastChunk = options.chunks[options.chunks.length - 1] ?? [];
    const tail = renderRepeatedFunctionalAuxSuffix(lastChunk, { formal: options.formal, question: true, lookups: options.lookups });
    return `${first}${middle}${tail}?`;
  }
  const tail = options.chunks.slice(1)
    .map((chunk) => renderRepeatedFunctionalAuxSuffix(chunk, { formal: options.formal, question: false, lookups: options.lookups }))
    .join("");
  return first + tail;
}

export function realizeFunctionalChainResidual(plan: FunctionalChainResidualPlan, formal: boolean, lookups: LookupTables): string {
  return renderRepeatedFunctionalChainText({
    koreanLemma: plan.koreanLemma,
    irregular: plan.irregular,
    koreanPos: plan.koreanPos,
    chunks: plan.chunks,
    formal,
    question: plan.question,
    ...(plan.jpDictForm === undefined || plan.jpDictForm === null ? {} : { jpDictForm: plan.jpDictForm }),
    ...(plan.verbConjType === undefined || plan.verbConjType === null ? {} : { verbConjType: plan.verbConjType }),
    forcePassive: plan.forcePassive === true,
    lookups
  });
}
