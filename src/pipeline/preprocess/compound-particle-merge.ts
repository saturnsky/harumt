import type { RuntimeHaruToken } from "../../types/token.js";
import { mergeRuntimeTokenSourceIdentity } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  loadCompoundParticleMergeSpecs,
  type CompoundParticleMergeSpec
} from "../head-tail/head/adapters/nominal/frame-table.js";
import { projectionTokenMatches } from "../head-tail/candidate/selector.js";
import { SEPARATION_BREAKS_MORPHEME_CHAIN, separatedAs } from "../clause-layout/trivia.js";
import type { ProjectionCandidateSelector } from "../head-tail/grammar.js";
import {
  POS0,
  POS1,
  POS5A,
  助詞,
  格助詞,
  接続助詞,
  係助詞,
  動詞,
  助動詞,
  名詞,
  形容詞0,
  普通名詞,
  終止形_,
  連体形_
} from "../../types/pos.js";


const 助詞格助詞 = 助詞 | 格助詞;

function isCaseParticle(token: RuntimeHaruToken | undefined, surface: string): boolean {
  return token !== undefined &&
    token.surface === surface &&
    (token.pos & (POS0 | POS1)) === 助詞格助詞;
}

function isMatrixVerb(token: RuntimeHaruToken | undefined, lemma: string): boolean {
  return token !== undefined && (token.pos & POS0) === 動詞 && token.dictionaryForm === lemma;
}

function isTrailingTe(token: RuntimeHaruToken | undefined, surface: string): boolean {
  return token !== undefined &&
    token.surface === surface &&
    (token.pos & (POS0 | POS1)) === (助詞 | 接続助詞);
}

function isPoliteMasuInfix(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助動詞 &&
    token.dictionaryForm === "ます";
}

function focusParticleSurface(token: RuntimeHaruToken | undefined): string | null {
  if (token === undefined || (token.pos & (POS0 | POS1)) !== (助詞 | 係助詞)) {
    return null;
  }
  return token.surface === "は" || token.surface === "も" ? token.surface : null;
}

function isFusedVariant(token: RuntimeHaruToken | undefined, fused: readonly string[] | undefined): boolean {
  return token !== undefined && fused !== undefined && fused.includes(token.surface);
}

function isBarePredicateForNominalization(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

function makeKotoToken(): RuntimeHaruToken {
  return {
    surface: "こと",
    dictionaryForm: "こと",
    reading: "コト",
    dictionaryFormReading: "コト",
    pos: 名詞 | 普通名詞,
    dictionaryId: 0,
    syntheticReason: "compound_particle_koto_unelision"
  };
}

const FOCUS_READING: Readonly<Record<string, string>> = { "は": "ハ", "も": "モ" };

function followingTokenRejectsMerge(
  reject: readonly ProjectionCandidateSelector[] | undefined,
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  lookups: LookupTables
): boolean {
  if (reject === undefined) {
    return false;
  }
  for (const selector of reject) {
    if (selector.kind !== "following_token" || selector.token === undefined) {
      continue;
    }
    const window = selector.window ?? 5;
    for (let w = 0; w < window; w += 1) {
      const token = tokens[startIdx + w];
      if (token === undefined) {
        break;
      }
      if (
        projectionTokenMatches(
          { surface: token.surface, dictionaryForm: token.dictionaryForm, pos: token.pos },
          selector.token,
          lookups
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function precedingHeadRejectsMerge(
  reject: readonly ProjectionCandidateSelector[] | undefined,
  tokens: readonly RuntimeHaruToken[],
  niIdx: number,
  lookups: LookupTables
): boolean {
  if (reject === undefined) {
    return false;
  }
  let headIdx = niIdx - 1;
  while (headIdx >= 0 && tokens[headIdx]?.surface.trim() === "") {
    headIdx -= 1;
  }
  const head = tokens[headIdx];
  if (head === undefined) {
    return false;
  }
  for (const selector of reject) {
    if (selector.kind !== "head" || selector.head === undefined) {
      continue;
    }
    if (
      projectionTokenMatches(
        { surface: head.surface, dictionaryForm: head.dictionaryForm, pos: head.pos },
        selector.head,
        lookups
      )
    ) {
      return true;
    }
  }
  return false;
}

function mergeSpanIsDetached(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  consumed: number
): boolean {
  for (let index = start + 1; index < start + consumed; index += 1) {
    if (separatedAs(tokens, index, SEPARATION_BREAKS_MORPHEME_CHAIN)) {
      return true;
    }
  }
  return false;
}

export function mergeCompoundParticles(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  const specs = loadCompoundParticleMergeSpecs(lookups);
  if (specs.length === 0) {
    return [...tokens];
  }
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const ni = tokens[i]!;
    let matched: { spec: CompoundParticleMergeSpec; coreConsumed: number; verb: RuntimeHaruToken; te: RuntimeHaruToken | undefined } | null = null;
    for (const spec of specs) {
      if (!isCaseParticle(ni, spec.matrixKey.particle)) {
        continue;
      }
      if (isMatrixVerb(tokens[i + 1], spec.matrixKey.verbLemma) && isTrailingTe(tokens[i + 2], spec.matrixKey.trailingParticle)) {
        matched = { spec, coreConsumed: 3, verb: tokens[i + 1]!, te: tokens[i + 2]! };
        break;
      }
      if (isMatrixVerb(tokens[i + 1], spec.matrixKey.verbLemma) && isPoliteMasuInfix(tokens[i + 2]) && isTrailingTe(tokens[i + 3], spec.matrixKey.trailingParticle)) {
        matched = { spec, coreConsumed: 4, verb: tokens[i + 1]!, te: tokens[i + 3]! };
        break;
      }
      if (isFusedVariant(tokens[i + 1], spec.matrixKey.fusedVariants)) {
        matched = { spec, coreConsumed: 2, verb: tokens[i + 1]!, te: undefined };
        break;
      }
    }
    if (matched === null) {
      result.push(ni);
      continue;
    }
    if (followingTokenRejectsMerge(matched.spec.reject, tokens, i + matched.coreConsumed, lookups)) {
      result.push(ni);
      continue;
    }
    if (precedingHeadRejectsMerge(matched.spec.reject, tokens, i, lookups)) {
      result.push(ni);
      continue;
    }
    const focusToken = tokens[i + matched.coreConsumed];
    const focus = focusParticleSurface(focusToken);
    const consumed = matched.coreConsumed + (focus !== null ? 1 : 0);
    if (mergeSpanIsDetached(tokens, i, consumed)) {
      result.push(ni);
      continue;
    }
    const mergedSurface = matched.spec.surface + (focus ?? "");
    const mergedReading = ni.reading + matched.verb.reading + (matched.te?.reading ?? "") + (focus !== null ? FOCUS_READING[focus] ?? "" : "");
    if (isBarePredicateForNominalization(result[result.length - 1])) {
      result.push(makeKotoToken());
    }
    const consumedTokens: [RuntimeHaruToken, RuntimeHaruToken, ...RuntimeHaruToken[]] = [
      ni,
      matched.verb
    ];
    if (matched.te !== undefined) {
      consumedTokens.push(matched.te);
    }
    if (focus !== null && focusToken !== undefined) {
      consumedTokens.push(focusToken);
    }
    result.push(mergeRuntimeTokenSourceIdentity({
      surface: mergedSurface,
      dictionaryForm: mergedSurface,
      reading: mergedReading,
      dictionaryFormReading: mergedReading,
      pos: 助詞格助詞,
      dictionaryId: 0,
      syntheticReason: "compound_particle_merge"
    }, consumedTokens));
    i += consumed - 1;
  }
  return result;
}
