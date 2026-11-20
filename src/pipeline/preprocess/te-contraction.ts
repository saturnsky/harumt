
import {
  type RuntimeHaruToken,
  inheritedSourceIdentity,
  splitTrailingBoundaryRuntimeState
} from "../../types/token.js";
import {
  POS0,
  POS01,
  POS4,
  POS5,
  助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_ジャ,
  文語助動詞_ケリ,
  終止形_一般,
  助詞_係助詞,
  接尾辞_形状詞的,
  助詞_接続助詞,
  連体形_一般,
  連用形_促音便,
  連用形_一般,
  五段_ワア行,
  下一段_ガ行,
  動詞_非自立可能,
  isDesireAuxiliaryPos,
  isTeFormFusionHostToken,
  isAdjectivalTeFormFusionHostToken,
  isVoicedTeFormHostToken
} from "../../types/pos.js";
import { hasAttributiveFollower } from "./follower-context.js";
import { teParticleToken, replacementTokenFrom } from "./synthetic-token.js";

function benefactiveAgeruToken(
  surface: string,
  reading: string,
  pos5: number,
  source: RuntimeHaruToken,
  reason: string
): RuntimeHaruToken {
  return {
    surface,
    dictionaryForm: "あげる",
    reading,
    dictionaryFormReading: "アゲル",
    pos: 動詞_非自立可能 | 下一段_ガ行 | pos5,
    dictionaryId: 0,
    ...inheritedSourceIdentity(source),
    syntheticReason: reason
  };
}

function isContractedTeAgeruAux(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 下一段_ガ行) && token.dictionaryForm === "たげる";
}

function isVoicedPastAuxDa(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_タ) && token.surface === "だ";
}

function contractedDaAgeruTail(
  token: RuntimeHaruToken,
  follower: RuntimeHaruToken | undefined
): { readonly surface: string; readonly reading: string; readonly pos5: number } | undefined {
  if (token.surface === "げる" && (token.pos & (POS0 | POS4)) === (助動詞 | 文語助動詞_ケリ)) {
    return {
      surface: "あげる",
      reading: "アゲル",
      pos5: hasAttributiveFollower(follower) ? 連体形_一般 : 終止形_一般
    };
  }
  if (token.surface === "げ" && (token.pos & POS01) === 接尾辞_形状詞的) {
    return { surface: "あげ", reading: "アゲ", pos5: 連用形_一般 };
  }
  return undefined;
}

function hasAdjectivalStateFollower(next: RuntimeHaruToken | undefined): boolean {
  if (next === undefined) {
    return false;
  }
  return (next.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) ||
    ((next.pos & POS0) === 助詞 && next.surface === "に");
}

export function expandTeAgeruContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevIsFusionHost = prev !== undefined && isTeFormFusionHostToken(prev);
    if (
      isContractedTeAgeruAux(token) && prevIsFusionHost && !isVoicedTeFormHostToken(prev!) &&
      !hasAdjectivalStateFollower(tokens[i + 1]) &&
      token.surface.startsWith("た") && token.reading.startsWith("タ")
    ) {
      dirty = true;
      const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
      result.push(teParticleToken(false, leading, "te_ageru_contraction:te"));
      result.push({
        ...benefactiveAgeruToken(
          `あ${token.surface.slice(1)}`,
          `ア${token.reading.slice(1)}`,
          token.pos & POS5,
          token,
          "te_ageru_contraction:ageru"
        ),
        ...trailing
      });
      continue;
    }
    const next = tokens[i + 1];
    if (isVoicedPastAuxDa(token) && prevIsFusionHost && isVoicedTeFormHostToken(prev!) && next !== undefined) {
      const tail = contractedDaAgeruTail(next, tokens[i + 2]);
      if (tail !== undefined) {
        dirty = true;
        result.push(teParticleToken(
          true,
          splitTrailingBoundaryRuntimeState(token).leading,
          "te_ageru_contraction:te"
        ));
        result.push({
          ...benefactiveAgeruToken(
            tail.surface,
            tail.reading,
            tail.pos5,
            next,
            "te_ageru_contraction:ageru"
          ),
          ...splitTrailingBoundaryRuntimeState(next).trailing
        });
        i += 1;
        continue;
      }
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}

export function expandTeWaContraction(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const isChaJaParticle = (token.pos & POS01) === 助詞_接続助詞 &&
      ((token.surface === "ちゃ" && token.reading === "チャ") ||
        (token.surface === "じゃ" && token.reading === "ジャ"));
    const hostIsFusionHost = prev !== undefined &&
      (isTeFormFusionHostToken(prev) || isAdjectivalTeFormFusionHostToken(prev));
    const voiced = hostIsFusionHost && isVoicedTeFormHostToken(prev!);
    if (!isChaJaParticle || !hostIsFusionHost || token.surface !== (voiced ? "じゃ" : "ちゃ")) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (isDesireAuxiliaryPos(prev!.pos)) {
      const marker = voiced ? "では" : "ては";
      result.push(replacementTokenFrom(token, {
        surface: marker,
        dictionaryForm: marker,
        reading: voiced ? "デハ" : "テハ",
        dictionaryFormReading: voiced ? "デハ" : "テハ",
        pos: 助詞_接続助詞,
        syntheticReason: "te_wa_contraction:tewa"
      }));
      continue;
    }
    const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
    result.push(teParticleToken(voiced, leading, "te_wa_contraction:te"));
    result.push({
      surface: "は",
      dictionaryForm: "は",
      reading: "ハ",
      dictionaryFormReading: "ハ",
      pos: 助詞_係助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      ...trailing,
      syntheticReason: "te_wa_contraction:wa"
    });
  }
  return dirty ? result : [...tokens];
}

export function restoreDroppedSokuonChauAspect(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const prev = result[result.length - 1];
    const next = tokens[index + 1];
    const voiced = prev !== undefined && isVoicedTeFormHostToken(prev);
    if (
      (token.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ジャ) ||
      token.surface !== (voiced ? "じゃ" : "ちゃ") ||
      prev === undefined || !isTeFormFusionHostToken(prev) ||
      next === undefined || next.surface !== "て" || (next.pos & POS01) !== 助詞_接続助詞
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: voiced ? "じゃっ" : "ちゃっ",
      dictionaryForm: voiced ? "じゃう" : "ちゃう",
      reading: voiced ? "ジャッ" : "チャッ",
      dictionaryFormReading: voiced ? "ジャウ" : "チャウ",
      pos: 助動詞 | 五段_ワア行 | 連用形_促音便,
      syntheticReason: "chau_dropped_sokuon_restore"
    }));
  }
  return dirty ? result : [...tokens];
}
