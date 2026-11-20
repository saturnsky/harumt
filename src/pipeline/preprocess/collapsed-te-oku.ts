
import type { RuntimeHaruToken } from "../../types/token.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { isHardTerminalPunctuationToken } from "../head-tail/boundary/punctuation.js";
import {
  POS0,
  POS01,
  POS4,
  pos0in,
  POS5,
  POS5A,
  仮定形_融合,
  形容詞0,
  助詞,
  助詞_格助詞,
  助動詞,
  助動詞_ナイ,
  助動詞_ヌ,
  助詞_接続助詞,
  動詞,
  副詞,
  接頭辞,
  意志推量形_,
  未然形_,
  未然形_一般,
  連用形_促音便,
  連用形_イ音便,
  連用形_一般,
  連用形_,
  is上一段,
  is下一段,
  五段_カ行,
  isTeFormFusionHostToken,
  isVoicedTeFormHostToken,
  INFLECTABLE_AUX_BITS,
  連体詞,
  isAttributiveInflection
} from "../../types/pos.js";
import { isCausativeAuxLemma } from "./causative-aux-lemma.js";
import { sourceSpanForTokenSlice } from "../source-coordinate.js";

type SplitCollapsedTeOkuAuxSpec = {
  readonly surfaceTail: string;
  readonly readingTail: string;
  readonly pos5: number;
  readonly requireVerbRenyouHost?: boolean;
  readonly teFormFusionHostOnly?: boolean;
};

function splitCollapsedTeOkuAuxSpec(
  tokens: readonly RuntimeHaruToken[],
  index: number
): SplitCollapsedTeOkuAuxSpec | null {
  const marker = tokens[index];
  const tail = tokens[index + 1];
  if (marker === undefined || tail === undefined) {
    return null;
  }
  const following = tokens[index + 2];
  if (
    (marker.surface !== "と" && marker.surface !== "ど") ||
    marker.dictionaryForm !== marker.surface ||
    ((marker.pos & POS01) !== 助詞_接続助詞 && (marker.pos & POS01) !== 助詞_格助詞)
  ) {
    return null;
  }
  switch (tail.surface) {
    case "こう":
      return (tail.pos & POS0) === 副詞
        ? { surfaceTail: "こう", readingTail: "コウ", pos5: 意志推量形_ }
        : null;
    case "い":
      return (tail.pos & POS0) === 動詞 &&
        tail.dictionaryForm === "いる" &&
        following?.surface === "て" &&
        (following.pos & POS01) === 助詞_接続助詞
        ? { surfaceTail: "い", readingTail: "イ", pos5: 連用形_イ音便 }
        : null;
    case "き":
      return (tail.pos & POS0) === 動詞 &&
        tail.dictionaryForm === "くる"
        ? { surfaceTail: "き", readingTail: "キ", pos5: 連用形_一般 }
        : null;
    case "か": {
      if (
        (tail.pos & POS0) !== 助詞 ||
        following === undefined ||
        !isCollapsedTeOkuNegationTail(following)
      ) {
        return null;
      }
      return collapsedTeOkuObligationNegationTailAt(tokens, index + 2)
        ? { surfaceTail: "か", readingTail: "カ", pos5: 未然形_一般, teFormFusionHostOnly: true }
        : {
          surfaceTail: "か",
          readingTail: "カ",
          pos5: 未然形_一般,
          requireVerbRenyouHost: true,
          teFormFusionHostOnly: true
        };
    }
    default:
      return null;
  }
}

function isCollapsedTeOkuNegationTail(token: RuntimeHaruToken): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 === 助動詞) {
    const pos4 = token.pos & POS4;
    return pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ;
  }
  return pos0 === 形容詞0 && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
}

function collapsedTeOkuObligationNegationTailAt(
  tokens: readonly RuntimeHaruToken[],
  index: number
): boolean {
  const negation = tokens[index];
  if (negation === undefined) {
    return false;
  }
  if ((negation.pos & POS5) === 仮定形_融合) {
    return true;
  }
  const toIdx = nextNonSpaceIndex(tokens, index + 1, tokens.length);
  const to = toIdx === null ? undefined : tokens[toIdx];
  if (toIdx === null || to === undefined || to.surface !== "と" || (to.pos & POS0) !== 助詞) {
    return false;
  }
  const afterIdx = nextNonSpaceIndex(tokens, toIdx + 1, tokens.length);
  const after = afterIdx === null ? undefined : tokens[afterIdx];
  return after === undefined || isHardTerminalPunctuationToken(after);
}

function collapsedTeOkuHostBlockedByNominalModifier(
  precedingToken: RuntimeHaruToken | undefined
): boolean {
  if (precedingToken === undefined) {
    return false;
  }
  const pos0 = precedingToken.pos & POS0;
  if (pos0 === 接頭辞 || pos0 === 連体詞) {
    return true;
  }
  if (precedingToken.surface === "の" && (precedingToken.pos & POS01) === 助詞_格助詞) {
    return true;
  }
  return pos0in(precedingToken.pos, INFLECTABLE_AUX_BITS) &&
    isAttributiveInflection(precedingToken.pos);
}

function isCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if (isCausativeAuxCollapsedTeOkuSplitHost(token) || isCollapsedShimauAuxCollapsedTeOkuSplitHost(token)) {
    return true;
  }
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ ||
    (form === 未然形_ && (is上一段(token.pos) || is下一段(token.pos)));
}

function isCausativeAuxCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  if (!isCausativeAuxLemma(token)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ || form === 未然形_;
}

function isCollapsedShimauAuxCollapsedTeOkuSplitHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return (form === 連用形_ || form === 連用形_促音便) &&
    (
      token.dictionaryForm === "ちゃう" ||
      token.dictionaryForm === "じゃう" ||
      token.dictionaryForm === "ちまう" ||
      token.dictionaryForm === "じまう"
    );
}

function collapsedTeOkuMarkerAgreesWithHost(marker: RuntimeHaruToken, host: RuntimeHaruToken): boolean {
  return marker.surface === (isVoicedTeFormHostToken(host) ? "ど" : "と");
}

export async function recoverSplitCollapsedTeOkuAux(
  tokens: readonly RuntimeHaruToken[],
  recoverHost: (token: RuntimeHaruToken) => Promise<readonly RuntimeHaruToken[] | null>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const marker = tokens[index]!;
    const host = result[result.length - 1];
    const tail = tokens[index + 1];
    const spec = tail === undefined
      ? null
      : splitCollapsedTeOkuAuxSpec(tokens, index);
    const hostIsVerbRenyou = host !== undefined && isCollapsedTeOkuSplitHost(host);
    const hostRecoveryBlocked = spec === null ||
      (!hostIsVerbRenyou && collapsedTeOkuHostBlockedByNominalModifier(result[result.length - 2])) ||
      (spec.requireVerbRenyouHost === true && !hostIsVerbRenyou);
    const normalizedHostTokens = host === undefined || spec === null || hostRecoveryBlocked
      ? null
      : hostIsVerbRenyou
        ? [host]
        : await recoverHost(host);
    if (
      host === undefined ||
      spec === null ||
      normalizedHostTokens === null
    ) {
      result.push(marker);
      continue;
    }
    const normalizedHost = normalizedHostTokens.at(-1);
    if (
      normalizedHost === undefined ||
      (spec.teFormFusionHostOnly === true && !isTeFormFusionHostToken(normalizedHost)) ||
      !collapsedTeOkuMarkerAgreesWithHost(marker, normalizedHost)
    ) {
      result.push(marker);
      continue;
    }

    dirty = true;
    if (normalizedHostTokens.length === 1) {
      if (normalizedHost !== host) {
        result[result.length - 1] = normalizedHost;
      }
    } else {
      result.splice(result.length - 1, 1, ...normalizedHostTokens);
    }
    const sourceSpan = sourceSpanForTokenSlice(tokens, index, index + 2);
    const markerReading = marker.reading || (marker.surface === "ど" ? "ド" : "ト");
    result.push({
      surface: `${marker.surface}${spec.surfaceTail}`,
      dictionaryForm: `${marker.surface}く`,
      reading: `${markerReading}${spec.readingTail}`,
      dictionaryFormReading: `${markerReading}ク`,
      pos: 助動詞 | 五段_カ行 | spec.pos5,
      dictionaryId: 0,
      ...(sourceSpan === null ? {} : { sourceSpan }),
      syntheticReason: "split_collapsed_te_oku_aux"
    });
    index += 1;
  }
  return dirty ? result : [...tokens];
}

export async function recoverDirectCollapsedTeOkuAuxHost(
  tokens: readonly RuntimeHaruToken[],
  recoverHost: (token: RuntimeHaruToken) => Promise<RuntimeHaruToken | null>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result = [...tokens];
  for (let index = 1; index < result.length; index += 1) {
    const aux = result[index]!;
    if (
      (aux.pos & POS0) !== 助動詞 ||
      (aux.dictionaryForm !== "とく" && aux.dictionaryForm !== "どく")
    ) {
      continue;
    }
    const host = result[index - 1]!;
    if (isCollapsedTeOkuSplitHost(host)) {
      continue;
    }
    if ((host.pos & POS0) !== 動詞) {
      continue;
    }
    const normalizedHost = await recoverHost(host);
    if (normalizedHost === null) {
      continue;
    }
    result[index - 1] = normalizedHost;
    dirty = true;
  }
  return dirty ? result : [...tokens];
}
