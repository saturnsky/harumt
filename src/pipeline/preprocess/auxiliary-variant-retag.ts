
import { toKatakana } from "../../utils/char-class.js";
import {
  type RuntimeHaruToken,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  POS0,
  POS01,
  POS4,
  POS5,
  POS5A,
  助動詞,
  助動詞_タ,
  助動詞_デス,
  助動詞_マス,
  助動詞_ヤス,
  助動詞_タイ,
  助動詞_レル,
  終止形_一般,
  終止形_促音便,
  助詞_接続助詞,
  動詞,
  意志推量形_,
  未然形_,
  終止形_,
  連体形_,
  連用形_促音便,
  連用形_一般,
  連用形_,
  五段_タ行,
  五段_ワア行,
  下一段_サ行,
  助詞_終助詞
} from "../../types/pos.js";
import { isPreprocessClauseTerminalBoundary, NO_WHITESPACE_BOUNDARY_EVIDENCE } from "./follower-context.js";
import { replacementTokenFrom } from "./synthetic-token.js";

function isMizenPredicateHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 助動詞) && (token.pos & POS5A) === 未然形_;
}

export function retagInfantileResuCopula(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const isRareru = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_レル) && token.surface === "れ";
    const isDesuSu = next !== undefined &&
      (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_デス) && next.surface === "す";
    if (!isRareru || !isDesuSu || isMizenPredicateHostToken(result[result.length - 1])) {
      result.push(token);
      continue;
    }
    dirty = true;
    const mergedBase = mergeRuntimeTokenSourceIdentity(
      rewriteRuntimeTokenSurface(token, { kind: "merge", sources: [token, next!] }),
      [token, next!]
    );
    result.push({
      ...mergedBase,
      dictionaryForm: "です",
      reading: "レス",
      dictionaryFormReading: "デス",
      pos: 助動詞 | 助動詞_デス | (next!.pos & POS5),
      dictionaryId: 0,
      syntheticReason: "infantile_resu_copula_retag"
    });
    index += 1;
  }
  return dirty ? result : [...tokens];
}

function isRenyouPredicateHostToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  const pos0 = token.pos & POS0;
  return (pos0 === 動詞 || pos0 === 助動詞) && (token.pos & POS5A) === 連用形_;
}

function isKansaiMassePoliteHost(
  token: RuntimeHaruToken,
  previous: RuntimeHaruToken | undefined,
  lookups: LookupTables
): boolean {
  if ((token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_マス) && (token.pos & POS5) === 終止形_促音便) {
    return true;
  }
  return (token.pos & (POS0 | POS4)) === (動詞 | 五段_タ行) &&
    (token.pos & POS5) === 連用形_促音便 &&
    lookups.KANSAI_POLITE_MASSE_MASU_MISTAG_LEMMAS.has(token.dictionaryForm) &&
    isRenyouPredicateHostToken(previous);
}

export function retagBenefactiveTeeAsConjunctiveTe(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const previous = result[result.length - 1];
    const isTeeDesire = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タイ) &&
      lookups.BENEFACTIVE_TEE_TE_RETAG_DESIRE_LEMMAS.has(token.dictionaryForm);
    const isBenefactiveHost = previous !== undefined &&
      isRenyouPredicateHostToken(previous) &&
      lookups.BENEFACTIVE_TEE_TE_RETAG_HOST_LEMMAS.has(previous.dictionaryForm);
    if (!isTeeDesire || !isBenefactiveHost ||
      !isPreprocessClauseTerminalBoundary(tokens, index + 1, {
        admittedSeparations: NO_WHITESPACE_BOUNDARY_EVIDENCE
      })) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(mergeRuntimeTokenSourceIdentity(
      replacementTokenFrom(token, {
        surface: "て",
        dictionaryForm: "て",
        reading: "テ",
        dictionaryFormReading: "テ",
        pos: 助詞_接続助詞,
        syntheticReason: "benefactive_tee_conjunctive_te_retag"
      }),
      [token]
    ));
  }
  return dirty ? result : [...tokens];
}

export function retagMistaggedDesireTee(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const previous = result[result.length - 1];
    if ((token.pos & (POS0 | POS4)) !== (助動詞 | 五段_ワア行) ||
      !lookups.DESIRE_TEE_RETAG_MISTAGGED_SURFACES.has(token.surface) ||
      !isRenyouPredicateHostToken(previous) || (previous!.pos & POS5) !== 連用形_一般) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "たい",
      dictionaryForm: "たい",
      reading: "タイ",
      dictionaryFormReading: "タイ",
      pos: 助動詞 | 助動詞_タイ | (token.pos & POS5),
      syntheticReason: "desire_tee_uncontraction"
    }));
  }
  return dirty ? result : [...tokens];
}

export function expandKansaiPoliteMasseContraction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const isMasuSokuonbin = isKansaiMassePoliteHost(token, result[result.length - 1], lookups);
    const isCausativeSe = next !== undefined &&
      (next.pos & (POS0 | POS4)) === (助動詞 | 下一段_サ行) &&
      next.dictionaryForm === "せる" &&
      lookups.KANSAI_POLITE_MASSE_SE_SURFACES.has(next.surface) &&
      isPreprocessClauseTerminalBoundary(tokens, index + 2);
    if (!isMasuSokuonbin || !isCausativeSe) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "ます",
      dictionaryForm: "ます",
      reading: "マス",
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | 終止形_一般,
      syntheticReason: "kansai_masse_uncontraction:masu"
    }));
    result.push(replacementTokenFrom(next!, {
      surface: "ぜ",
      dictionaryForm: "ぜ",
      reading: "ゼ",
      dictionaryFormReading: "ゼ",
      pos: 助詞_終助詞,
      syntheticReason: "kansai_masse_uncontraction:sfp"
    }));
    index += 1;
  }
  return dirty ? result : [...tokens];
}

function masuFormAdmitsFollower(masu: RuntimeHaruToken, next: RuntimeHaruToken | undefined): boolean {
  const form = masu.pos & POS5A;
  if (form !== 連用形_ && form !== 意志推量形_ && form !== 終止形_ && form !== 連体形_) {
    return false;
  }
  if (form === 連用形_) {
    return next !== undefined && (
      (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ) ||
      ((next.pos & POS01) === 助詞_接続助詞 && (next.surface === "て" || next.surface === "で"))
    );
  }
  return next === undefined || (next.pos & POS0) !== 助動詞;
}

export function retagYasuPoliteAsMasu(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!, next = tokens[index + 1];
    const masuSurface = (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤス)
      ? lookups.YASU_POLITE_MASU_SURFACES.get(token.surface)
      : undefined;
    if (masuSurface === undefined || !isRenyouPredicateHostToken(result[result.length - 1]) ||
      !masuFormAdmitsFollower(token, next)) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: masuSurface,
      dictionaryForm: "ます",
      reading: toKatakana(masuSurface),
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | (token.pos & POS5),
      syntheticReason: "yasu_polite_masu_retag"
    }));
  }
  return dirty ? result : [...tokens];
}
