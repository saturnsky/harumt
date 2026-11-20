
import {
  type RuntimeHaruToken,
  inheritedSourceIdentity,
  morphSurface,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  type UtteranceClosureKind
} from "../clause-layout/utterance-closure.js";
import { isSourceSeparatedFromPreviousToken } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  POS0,
  POS01,
  POS1,
  POS4,
  pos0in,
  POS5,
  POS5A,
  POS5B,
  _撥音便,
  仮定形_,
  形状詞,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ヌ,
  文語助動詞_ム,
  文語助動詞_ンス,
  終止形_一般,
  終止形_撥音便,
  助詞_接続助詞,
  動詞,
  意志推量形_,
  未然形_,
  未然形_一般,
  終止形_,
  連体形_,
  連体形_一般,
  名詞,
  命令形_,
  連用形_,
  五段_ラ行,
  助詞_終助詞,
  助詞_準体助詞,
  助動詞語幹,
  連用形_ニ,
  動詞_非自立可能,
  意志推量形,
  isBungoVolitionalMuHatsuonToken,
  isCaseParticleToken,
  isConjunctiveParticleToken,
  isNuAttachmentHostToken,
  isVerbPredicateToken,
  isVolitionalInflection,
  INFLECTABLE_AUX_BITS
} from "../../types/pos.js";
import { isSuruVerbToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { replacementTokenFrom } from "./synthetic-token.js";

export function expandBungoGotoshi(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const [index, token] of tokens.entries()) {
    const copulaForm = gotoshiCopulaForm(token);
    if (copulaForm === undefined || !followsNominalNo(tokens, index)) {
      result.push(token);
      continue;
    }
    dirty = true;
    const identity = inheritedSourceIdentity(token);
    result.push({
      surface: "よう",
      dictionaryForm: "よう",
      reading: "ヨウ",
      dictionaryFormReading: "ヨウ",
      pos: 形状詞 | 助動詞語幹,
      dictionaryId: 0,
      ...identity,
      syntheticReason: "bungo_gotoshi"
    }, {
      surface: copulaForm.surface,
      dictionaryForm: "だ",
      reading: copulaForm.reading,
      dictionaryFormReading: "ダ",
      pos: 助動詞 | 助動詞_ダ | copulaForm.pos5,
      dictionaryId: 0,
      ...identity,
      syntheticReason: "bungo_gotoshi"
    });
  }
  return dirty ? result : [...tokens];
}

function followsNominalNo(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const marker = tokens[index - 1];
  const host = tokens[index - 2];
  return marker !== undefined && marker.surface === "の" && (marker.pos & POS0) === 助詞 &&
    host !== undefined && (host.pos & POS0) !== 形状詞;
}

function gotoshiCopulaForm(
  token: RuntimeHaruToken
): { readonly surface: string; readonly reading: string; readonly pos5: number } | undefined {
  if ((token.pos & POS0) !== 助動詞 || (token.dictionaryForm !== "如し" && token.dictionaryForm !== "ごとし")) {
    return undefined;
  }
  switch (token.pos & POS5A) {
    case 連用形_:
      return { surface: "に", reading: "ニ", pos5: 連用形_ニ };
    case 連体形_:
      return { surface: "な", reading: "ナ", pos5: 連体形_一般 };
    case 終止形_:
      return { surface: "だ", reading: "ダ", pos5: 終止形_一般 };
    default:
      return undefined;
  }
}

function isCopulaKateiNaraToken(token: RuntimeHaruToken): boolean {
  return token.surface === "なら" && token.dictionaryForm === "だ" &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) && (token.pos & POS5A) === 仮定形_;
}

function isParticleTaggedHatsuonN(token: RuntimeHaruToken): boolean {
  if (token.surface !== "ん") {
    return false;
  }
  const pos01 = token.pos & POS01;
  return pos01 === 助詞_終助詞 || pos01 === 助詞_準体助詞;
}

const CLAUSE_FINAL_RETAG_CLOSING_KINDS: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "weak_pause"
]);

function isClauseFinalRetagFollower(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return true;
  }
  if ((token.pos & POS01) === 助詞_終助詞) {
    return true;
  }
  const pos04 = token.pos & (POS0 | POS4);
  if ((pos04 === (助動詞 | 助動詞_デス) || pos04 === (助動詞 | 助動詞_ダ)) &&
    (token.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return closesUtteranceAs(
    utteranceClosureAfter(null, tokens, index),
    CLAUSE_FINAL_RETAG_CLOSING_KINDS
  );
}

export function retagCopulaNaraBeforeParticleNAsNaruNegation(
  tokens: readonly RuntimeHaruToken[]
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const nToken = tokens[index + 1];
    const host = result[result.length - 1];
    if (!isCopulaKateiNaraToken(token) || nToken === undefined || !isParticleTaggedHatsuonN(nToken) ||
      host === undefined || (host.pos & POS0) !== 名詞 ||
      !isClauseFinalRetagFollower(tokens, index + 2)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: token.surface,
      dictionaryForm: "なる",
      reading: "ナラ",
      dictionaryFormReading: "ナル",
      pos: 動詞_非自立可能 | 五段_ラ行 | 未然形_一般,
      syntheticReason: "copula_nara_particle_n_negation_retag:naru"
    }));
    result.push(replacementTokenFrom(nToken, {
      surface: nToken.surface,
      dictionaryForm: "む",
      reading: "ン",
      dictionaryFormReading: "ム",
      pos: 助動詞 | 文語助動詞_ム | 終止形_撥音便,
      syntheticReason: "copula_nara_particle_n_negation_retag:mu"
    }));
    index += 1;
  }
  return dirty ? result : [...tokens];
}

export function expandDroppedVolitionalAru(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const isMistaggedAro = token.surface === "あろ" && token.dictionaryForm === "ある" &&
      (token.pos & POS0) === 動詞 && (token.pos & POS5A) === 命令形_ &&
      isClauseFinalRetagFollower(tokens, index + 1);
    if (!isMistaggedAro) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "あろう",
      dictionaryForm: "ある",
      reading: "アロウ",
      dictionaryFormReading: "アル",
      pos: (token.pos & (POS0 | POS1 | POS4)) | 意志推量形,
      syntheticReason: "dropped_volitional_aru_expand"
    }));
  }
  return dirty ? result : [...tokens];
}

export function restoreDroppedVolitionalQuoteMarker(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    result.push(token);
    const follower = tokens[index + 1];
    if (
      follower === undefined ||
      !isVerbPredicateToken(token) || !isVolitionalInflection(token.pos) ||
      isSourceSeparatedFromPreviousToken(tokens, index + 1) ||
      !(isSuruVerbToken(follower) ||
        (isVerbPredicateToken(follower) &&
          lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", follower.dictionaryForm, "volitional_content_complement")))
    ) {
      continue;
    }
    dirty = true;
    result.push({
      surface: "と", dictionaryForm: "と", reading: "ト", dictionaryFormReading: "ト",
      pos: 助詞_格助詞, dictionaryId: 0, ...inheritedSourceIdentity(follower),
      syntheticReason: "dropped_volitional_to_restore"
    });
  }
  return dirty ? result : [...tokens];
}

export function retagBungoVolitionalNAsNegative(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    if (isVolitionalPurposeToSuruAt(tokens, index + 1)) {
      if (isFusedBungoVolitionalNVerbToken(token)) {
        dirty = true;
        result.push({
          ...token,
          pos: (token.pos & ~POS5) | 意志推量形,
          syntheticReason: "bungo_volitional_n_purpose_normalize"
        });
        continue;
      }
      if (isNuHatsuonToken(token) && host !== undefined && isNuAttachmentHostToken(host)) {
        dirty = true;
        result[result.length - 1] = normalizeBungoVolitionalPurposeHost(host, token);
        continue;
      }
    }
    const licensor = tokens[index + 1];
    const isFossilLicensed = licensor !== undefined &&
      lookups.BUNGO_VOLITIONAL_N_LICENSOR_SURFACES.has(licensor.surface);
    if (!isBungoVolitionalMuHatsuonToken(token) || host === undefined ||
      !isNuAttachmentHostToken(host) || isFossilLicensed) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (isVolitionalPurposeToSuruAt(tokens, index + 1)) {
      result[result.length - 1] = normalizeBungoVolitionalPurposeHost(host, token);
      continue;
    }
    result.push({
      ...token,
      dictionaryForm: "ぬ",
      dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | (token.pos & POS5),
      syntheticReason: "bungo_volitional_n_negative_retag"
    });
  }
  return dirty ? result : [...tokens];
}

export function expandNegativeNshiConjunction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    const next = tokens[index + 1];
    const isNshi = token.surface === "んし" &&
      (token.pos & (POS0 | POS4)) === (助動詞 | 文語助動詞_ンス) &&
      (token.pos & POS5A) === 連用形_;
    const nextContinuesNsu = next !== undefined &&
      ((next.pos & POS0) === 助動詞 || isConjunctiveParticleToken(next));
    if (!isNshi || host === undefined || !isNuAttachmentHostToken(host) || nextContinuesNsu) {
      result.push(token);
      continue;
    }
    dirty = true;
    if ((host.pos & POS5A) !== 未然形_) {
      result[result.length - 1] = { ...host, pos: (host.pos & ~POS5) | 未然形_一般 };
    }
    result.push({
      surface: "ん",
      dictionaryForm: "ぬ",
      reading: "ン",
      dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | 終止形_一般,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "nshi_negation_conjunction_ns"
    });
    result.push({
      surface: "し",
      dictionaryForm: "し",
      reading: "シ",
      dictionaryFormReading: "シ",
      pos: 助詞_接続助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "nshi_negation_conjunction_shi"
    });
  }
  return dirty ? result : [...tokens];
}

function isVolitionalPurposeToSuruAt(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const marker = tokens[index];
  const follower = tokens[index + 1];
  return marker !== undefined && marker.surface === "と" &&
    (isCaseParticleToken(marker) || isConjunctiveParticleToken(marker)) &&
    follower !== undefined && isSuruVerbToken(follower);
}

function isNuHatsuonToken(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヌ) &&
    (token.pos & POS5B) === _撥音便 &&
    token.surface === "ん";
}

function isFusedBungoVolitionalNVerbToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 動詞 &&
    (token.pos & POS5B) === _撥音便 &&
    token.surface.length >= 2 &&
    token.surface.endsWith("ん");
}

function normalizeBungoVolitionalPurposeHost(
  host: RuntimeHaruToken,
  mu: RuntimeHaruToken
): RuntimeHaruToken {
  const merged = mergeRuntimeTokenSourceIdentity(
    rewriteRuntimeTokenSurface(host, { kind: "merge", sources: [host, mu] }),
    [host, mu]
  );
  return {
    ...merged,
    reading: `${host.reading}${mu.reading}`,
    pos: (host.pos & ~POS5) | 意志推量形,
    syntheticReason: "bungo_volitional_n_purpose_normalize"
  };
}

export function retagMistaggedExplanatoryNAfterFiniteHost(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const auxKind = token.pos & (POS0 | POS4);
    const isNuOrMuTag = token.surface === "ん" &&
      (auxKind === (助動詞 | 助動詞_ヌ) || auxKind === (助動詞 | 文語助動詞_ム));
    const prevIsFiniteInflectingHost = prev !== undefined &&
      pos0in(prev.pos & POS0, INFLECTABLE_AUX_BITS) &&
      ((prev.pos & POS5A) === 終止形_ || (prev.pos & POS5A) === 連体形_) &&
      !morphSurface(prev).endsWith("ん");
    if (!isNuOrMuTag || !prevIsFiniteInflectingHost) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      ...token,
      dictionaryForm: "ん",
      dictionaryFormReading: "ン",
      normalizedForm: "の",
      pos: 助詞_準体助詞,
      syntheticReason: "explanatory_n_after_finite_host_retag"
    });
  }
  return dirty ? result : [...tokens];
}
