import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex, isClauseSpaceOrAdverbToken } from "./trivia.js";
import { POS0, POS01, POS1, POS4, POS5A, isNaAdjCapable, isTerminalOrAttributiveFormPredicateToken, isSahenCapableNominal, isGeneralRenyouInflectedToken, isIAdjectivePredicateToken, isParticleToken, 形状詞, 形容詞0, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 助動詞_ヌ, 非自立可能, 代名詞, 動詞, 副詞, 副助詞, 助詞_終助詞, 補助記号, 名詞, 連用形_, 未然形_, 動詞_非自立可能, isAuxiliaryStemToken } from "../../types/pos.js";
import { activeProtoLayout } from "./proto-state.js";
import { isAdverbialReachTransparentToken, isAdverbialFocusParticle } from "./reachability.js";
import type { ClauseToken } from "./layout-types.js";
import { reduplicatedPredicatePairClass } from "./predicate-parallel.js";
import { sourceTokenMayBePredicateAt, adjectiveRenyouFollowerEstablishesPredicateAt, nominalPredicateClosedByCopula } from "./predicate-shape.js";
import { isPastTaToken } from "./predicate-token-shape.js";

export interface AdverbialModifierPredicateToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly pos: number;
}

export function findAdverbialModifierPredicate(
  tokens: readonly AdverbialModifierPredicateToken[],
  niIdx: number,
  opts?: {
    readonly allowLightVerbPredicate?: boolean;
    readonly deicticProPredicates?: ReadonlySet<string>;
  }
): number | null {
  const clause = activeProtoLayout()?.clauseOfToken(niIdx);
  const limit = clause?.end ?? tokens.length;
  let idx = nextNonSpaceIndex(tokens, niIdx + 1, limit);
  let traversedTransparent = false;
  while (idx !== null && idx < limit) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 動詞) {
      if ((token.pos & POS01) !== 動詞_非自立可能) {
        return idx;
      }
      const nonJiritsuDf = token.dictionaryForm;
      if (nonJiritsuDf === "できる" || nonJiritsuDf === "出来る") {
        return idx;
      }
      if (nonJiritsuDf === "ある" || nonJiritsuDf === "有る") {
        const aruAuxIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
        const aruAux = aruAuxIdx !== null ? tokens[aruAuxIdx] : undefined;
        const negated =
          aruAux !== undefined &&
          (((aruAux.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_)) ||
            (aruAux.pos & POS4) === 助動詞_ヌ);
        return negated ? null : idx;
      }
      if (nonJiritsuDf === "なる" || nonJiritsuDf === "成る" || nonJiritsuDf === "なれる") {
        return traversedTransparent ? idx : null;
      }
      if (nonJiritsuDf === "する") {
        return traversedTransparent || opts?.allowLightVerbPredicate === true ? idx : null;
      }
      return idx;
    }
    if (pos0 === 形容詞0) {
      const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
      const isNegationNai = isNonJiritsu &&
        (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
      if (!isNegationNai) {
        if ((token.pos & POS5A) !== 連用形_) {
          return idx;
        }
        if ((token.pos & POS5A) === 連用形_) {
          const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
          const nextTok = nextIdx !== null ? tokens[nextIdx] : undefined;
          if (nextTok !== undefined && isPastTaToken(nextTok)) {
            return idx;
          }
          if (
            !isNonJiritsu &&
            nextTok !== undefined &&
            (nextTok.pos & POS01) === (形容詞0 | 非自立可能) &&
            nextTok.dictionaryForm === "ない"
          ) {
            return idx;
          }
          if (
            nextIdx !== null &&
            nextTok !== undefined &&
            (nextTok.pos & POS0) === 動詞 &&
            (nextTok.dictionaryForm === "なる" ||
              nextTok.dictionaryForm === "なれる" ||
              nextTok.dictionaryForm === "成る" ||
              nextTok.dictionaryForm === "する")
          ) {
            traversedTransparent = true;
            idx = nextIdx;
            continue;
          }
          const coAdjunctPredicate = adjectiveAdverbialModifiedPredicate(
            tokens,
            idx,
            opts?.deicticProPredicates === undefined ? undefined : { deicticProPredicates: opts.deicticProPredicates }
          );
          if (coAdjunctPredicate !== null) {
            return coAdjunctPredicate;
          }
        }
      }
    }
    if (pos0 === 名詞 || pos0 === 形状詞) {
      if (pos0 === 名詞 && isSahenCapableNominal(token)) {
        const suIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
        if (suIdx !== null && tokens[suIdx]?.dictionaryForm === "する") {
          return idx;
        }
      }
      if (nominalPredicateClosedByCopula(tokens, idx, limit)) {
        return idx;
      }
    }
    if (pos0 === 副詞 && opts?.deicticProPredicates?.has(token.dictionaryForm || token.surface) === true) {
      const afterIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
      const after = afterIdx !== null ? tokens[afterIdx] : undefined;
      const afterClosesPredicate =
        after === undefined ||
        (after.pos & POS0) === 補助記号 ||
        (after.pos & POS01) === 助詞_終助詞 ||
        (after.pos & POS4) === 助動詞_ダ ||
        (after.pos & POS4) === 助動詞_デス;
      if (afterClosesPredicate) {
        return idx;
      }
    }
    const isIndefinitePronounKa =
      (token.pos & POS1) === 副助詞 &&
      token.surface === "か" &&
      (() => {
        const prevIdx = previousNonSpaceIndex(tokens, idx);
        return prevIdx !== null && ((tokens[prevIdx]?.pos ?? 0) & POS0) === 代名詞;
      })();
    if (
      isClauseSpaceOrAdverbToken(token) ||
      isAdverbialReachTransparentToken(token) ||
      isAdverbialFocusParticle(token) ||
      isIndefinitePronounKa
    ) {
      traversedTransparent = true;
      idx = nextNonSpaceIndex(tokens, idx + 1, limit);
      continue;
    }
    return null;
  }
  return null;
}

export function adjectiveAdverbialModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  opts?: {
    readonly deicticProPredicates?: ReadonlySet<string>;
    readonly rentaiDegreeHosts?: ReadonlySet<string>;
  }
): number | null {
  const token = tokens[idx];
  if (token === undefined || !isIAdjectivePredicateToken(token)) {
    return null;
  }
  const clause = activeProtoLayout()?.clauseOfToken(idx);
  const limit = clause?.end ?? tokens.length;
  if (isTerminalOrAttributiveFormPredicateToken(token)) {
    return rentaiDegreeAdverbialModifiedPredicate(tokens, idx, opts);
  }
  if (!isGeneralRenyouInflectedToken(token)) {
    return null;
  }
  const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
  if (adjectiveRenyouFollowerEstablishesPredicateAt(tokens, idx, limit, isNonJiritsu)) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || isParticleToken(next)) {
    return null;
  }
  return findAdverbialModifierPredicate(
    tokens,
    idx,
    opts?.deicticProPredicates === undefined ? undefined : { deicticProPredicates: opts.deicticProPredicates }
  );
}

export function adjectiveAdverbialModifierLookupOptions(lookups: LookupTables): {
  readonly deicticProPredicates: ReadonlySet<string>;
  readonly rentaiDegreeHosts: ReadonlySet<string>;
} {
  return {
    deicticProPredicates: lookups.ADVERB_COPULA_DEICTIC_EXCLUSIONS,
    rentaiDegreeHosts: lookups.ADVERBIAL_MODIFIER_RENTAI_DEGREE_ADJECTIVE_HOSTS
  };
}

export function rentaiDegreeAdverbialModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  opts?: { readonly rentaiDegreeHosts?: ReadonlySet<string> }
): number | null {
  const token = tokens[idx];
  if (token === undefined || !isIAdjectivePredicateToken(token) || !isTerminalOrAttributiveFormPredicateToken(token)) {
    return null;
  }
  const limit = activeProtoLayout()?.clauseOfToken(idx)?.end ?? tokens.length;
  return rentaiDegreeAdjectiveModifiedPredicate(tokens, idx, limit, opts?.rentaiDegreeHosts);
}

function rentaiDegreeAdjectiveModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number,
  hosts: ReadonlySet<string> | undefined
): number | null {
  const token = tokens[idx];
  if (token === undefined || hosts?.has(token.dictionaryForm || token.surface) !== true) {
    return null;
  }
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (nextIdx === null || next === undefined) {
    return null;
  }
  if (!isIAdjectivePredicateToken(next) && !isNaAdjCapable(next)) {
    return null;
  }
  if (isAuxiliaryStemToken(next)) {
    return null;
  }
  if (reduplicatedPredicatePairClass(token, next) !== null) {
    return null;
  }
  return sourceTokenMayBePredicateAt(tokens, nextIdx, limit) ? nextIdx : null;
}
