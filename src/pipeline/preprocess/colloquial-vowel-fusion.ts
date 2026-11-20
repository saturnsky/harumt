
import { toKatakana } from "../../utils/char-class.js";
import {
  type RuntimeHaruToken,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import {
  POS0,
  POS01,
  POS4,
  POS5A,
  感動詞,
  形状詞,
  形容詞0,
  形容詞4,
  助詞,
  助動詞,
  助動詞_ナイ,
  助動詞_ヤ,
  終止形_一般,
  代名詞,
  動詞,
  副詞,
  接頭辞,
  終止形_,
  連体形_一般,
  名詞,
  名詞_普通名詞,
  非自立可能,
  助詞_終助詞
} from "../../types/pos.js";
import { isColloquialNaiNeeSurface } from "../semantics/sfp-surface.js";
import { hasAttributiveFollower } from "./follower-context.js";

const CONTRACTED_NAI_TAIL_SURFACES: ReadonlySet<string> = new Set(["ねぇ", "ねえ", "ねー"]);
const CONTRACTED_BAI_TAIL_SURFACES: ReadonlySet<string> = new Set(["べぇ", "べえ", "べー"]);

function isContractedIAdjectiveSplit(
  prev: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index]!;
  if (separatedAs(tokens, index, DETACHED_SEPARATIONS)) {
    return false;
  }
  if (CONTRACTED_NAI_TAIL_SURFACES.has(token.surface)) {
    const tailIsNaiOrSfp = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) ||
      (token.pos & POS01) === 助詞_終助詞;
    return tailIsNaiOrSfp && (prev.pos & POS0) === 動詞 && (prev.pos & POS5A) === 終止形_;
  }
  if (CONTRACTED_BAI_TAIL_SURFACES.has(token.surface)) {
    return (token.pos & POS01) === 助詞_終助詞 &&
      (prev.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤ);
  }
  return false;
}

export async function mergeContractedColloquialIAdjectives(
  tokens: readonly RuntimeHaruToken[],
  isRestorableIAdjective: (candidate: RuntimeHaruToken) => Promise<boolean>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    if (prev === undefined || !isContractedIAdjectiveSplit(prev, tokens, i)) {
      result.push(token);
      continue;
    }
    const mergedReading = `${prev.reading}${toKatakana(token.surface)}`;
    const mergedBase = mergeRuntimeTokenSourceIdentity(
      rewriteRuntimeTokenSurface(prev, { kind: "merge", sources: [prev, token] }),
      [prev, token]
    );
    const merged: RuntimeHaruToken = {
      ...mergedBase,
      dictionaryForm: `${prev.surface}${token.surface}`,
      reading: mergedReading,
      dictionaryFormReading: mergedReading,
      pos: 形容詞0 | 形容詞4 | (hasAttributiveFollower(tokens[i + 1]) ? 連体形_一般 : 終止形_一般),
      dictionaryId: 0,
      syntheticReason: "colloquial_i_adjective_remerge"
    };
    if (!await isRestorableIAdjective(merged)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result[result.length - 1] = merged;
  }
  return dirty ? result : [...tokens];
}

const FUSED_LONG_E_TO_BASE_A_KANA: ReadonlyMap<string, string> = new Map([
  ["え", "あ"], ["け", "か"], ["げ", "が"], ["せ", "さ"], ["ぜ", "ざ"],
  ["て", "た"], ["で", "だ"], ["ね", "な"], ["へ", "は"], ["べ", "ば"],
  ["ぺ", "ぱ"], ["め", "ま"], ["れ", "ら"]
]);

const AUTHORED_LONG_E_TAIL_CHARS: ReadonlySet<string> = new Set(["え", "ぇ", "ー"]);

const ALL_KANA_SURFACE = /^[\p{sc=Hiragana}\p{sc=Katakana}ーゝゞヽヾ]+$/u;

function unfuseLongEKanaSurface(surface: string): string | undefined {
  let head = surface.length;
  while (head > 0 && AUTHORED_LONG_E_TAIL_CHARS.has(surface[head - 1]!)) {
    head -= 1;
  }
  if (head === surface.length || head === 0) {
    return undefined;
  }
  const base = FUSED_LONG_E_TO_BASE_A_KANA.get(surface[head - 1]!);
  return base === undefined ? undefined : `${surface.slice(0, head - 1)}${base}い`;
}

function isFusedRunAncillaryToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助詞 || pos0 === 助動詞;
}

function isFusedRunHeadToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 名詞 || pos0 === 動詞 || pos0 === 副詞 || pos0 === 形状詞 ||
    pos0 === 代名詞 || pos0 === 形容詞0 || pos0 === 接頭辞;
}

function isFusedLongETailToken(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  return pos0 === 助詞 || pos0 === 助動詞 || pos0 === 感動詞;
}

function fusedLongEVowelRunLength(
  emitted: readonly RuntimeHaruToken[],
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | undefined {
  const token = tokens[index]!;
  if (!isFusedLongETailToken(token) || separatedAs(tokens, index, DETACHED_SEPARATIONS) ||
    !AUTHORED_LONG_E_TAIL_CHARS.has(token.surface.slice(-1))) {
    return undefined;
  }
  let consumed = 0;
  while (consumed < 3) {
    const candidateIdx = emitted.length - 1 - consumed;
    const candidate = emitted[candidateIdx];
    if (candidate === undefined || separatedAs(emitted, candidateIdx, DETACHED_SEPARATIONS)) {
      return undefined;
    }
    consumed += 1;
    if (isFusedRunHeadToken(candidate)) {
      return consumed;
    }
    if (!isFusedRunAncillaryToken(candidate)) {
      return undefined;
    }
  }
  return undefined;
}

export async function mergeFusedColloquialNonAdjectives(
  tokens: readonly RuntimeHaruToken[],
  restoreNominal: (
    head: RuntimeHaruToken,
    candidate: RuntimeHaruToken
  ) => Promise<number | undefined>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const runLength = fusedLongEVowelRunLength(result, tokens, index);
    if (runLength === undefined) {
      result.push(token);
      continue;
    }
    const head = result[result.length - runLength]!;
    const sources: readonly [RuntimeHaruToken, ...RuntimeHaruToken[]] = [
      head,
      ...result.slice(result.length - runLength + 1),
      token
    ];
    const fusedSurface = sources.map((source) => source.surface).join("");
    const unfusedSurface = ALL_KANA_SURFACE.test(fusedSurface)
      ? unfuseLongEKanaSurface(fusedSurface)
      : undefined;
    if (unfusedSurface === undefined) {
      result.push(token);
      continue;
    }
    const unfusedReading = toKatakana(unfusedSurface);
    const merged: RuntimeHaruToken = {
      ...mergeRuntimeTokenSourceIdentity(
        rewriteRuntimeTokenSurface(head, { kind: "merge", sources }),
        sources
      ),
      dictionaryForm: unfusedSurface,
      reading: unfusedReading,
      dictionaryFormReading: unfusedReading,
      pos: 名詞 | 名詞_普通名詞,
      dictionaryId: 0,
      syntheticReason: "colloquial_long_e_fusion_remerge"
    };
    const pos = await restoreNominal(head, merged);
    if (pos === undefined) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.splice(result.length - runLength, runLength, { ...merged, pos });
  }
  return dirty ? result : [...tokens];
}

export function normalizeColloquialNaiAdjectiveTokens(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  return tokens.map((token) => {
    if ((token.pos & POS01) !== (形容詞0 | 非自立可能) || !isColloquialNaiNeeSurface(token.surface)) {
      return token;
    }
    return {
      ...token,
      dictionaryForm: "ない",
      dictionaryFormReading: "ナイ"
    };
  });
}
