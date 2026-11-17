
import { hasRentaikei } from "../attributive.js";
import { legacySurfaceCompositionPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { conjugate } from "../../generator/conjugator.js";
import { collectAuxTokens } from "../matchers.js";
import { TokenCursor } from "../token-cursor.js";
import { auxTokensArray } from "./adapter-helpers.js";
import type { ContentResolverRuntimeAccess, RuleResultLike } from "./types.js";
import { detectSfp, isYouToken } from "../semantics/grammar-runtime.js";
import { matchFollowingAdversativeConnective } from "../rules/connective-helpers.js";
import { nominalLinkMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { POS0, POS1, 形状詞, 形容詞0, 助動詞, 助動詞語幹, 代名詞, 動詞, 補助記号, 名詞, 連体形_一般, 동사, 형용사 } from "../../types/pos.js";

export async function resolveSpecialContentPhase(
  this: ContentResolverRuntimeAccess,
  cursor: TokenCursor<RuntimeHaruToken>,
  token: RuntimeHaruToken,
  pos0: number
): Promise<RuleResultLike | null> {
  const { tokens, end: n } = cursor;
  const start = cursor.pos - 1;
  if (
    pos0 === 形状詞 &&
    token.pos !== 0 && (token.pos & POS1) === 助動詞語幹 &&
    token.surface === "そう"
  ) {
    const auxTokens = collectAuxTokens(cursor);
    const sfpType = detectSfp(cursor, pos0, auxTokens.length > 0);
    return {
      consumed: cursor.consumed,
      korean: "",
      spaceAfter: true,
      renderPlan: {
        kind: "lemma",
        entry: null,
        koreanLemma: "보이다",
        koreanPos: 동사,
        irregular: null,
        auxTokens: auxTokensArray(auxTokens),
        sfp: sfpType
      }
    };
  }

  if (isYouToken(token)) {
    const auxTokens = collectAuxTokens(cursor);
    const prevPos0 = start > 0 ? ((tokens[start - 1]?.pos ?? 0) & POS0) : 0;
    const prefix = (prevPos0 === 動詞) || (prevPos0 === 助動詞) || (prevPos0 === 形容詞0) ? "것 " : "";
    const prevIsNo = start > 0 && nominalLinkMarkerRelationAt(tokens, start - 1, { consumers: ["content_resolver"] }) !== null;
    const youLemma = start > 0 && !prevIsNo ? "듯하다" : "같다";
    const nextPos = cursor.pos;
    const lastAux = auxTokens.at(auxTokens.length - 1);
    if (
      lastAux !== undefined &&
      hasRentaikei(lastAux) &&
      nextPos < n &&
      (((tokens[nextPos]?.pos ?? 0) & POS0) === 名詞 || ((tokens[nextPos]?.pos ?? 0) & POS0) === 代名詞)
    ) {
      return {
        consumed: cursor.consumed,
        korean: "",
        spaceAfter: true,
        renderPlan: legacySurfaceCompositionPlan("special_content_phase", {
          korean: "",
          koreanPos: 형용사,
          prefix,
          suffix: {
            kind: "attributive",
            koreanLemma: youLemma,
            irregular: null,
            koreanPos: 형용사,
            auxTokens: auxTokensArray(auxTokens),
            contentToken: {
              surface: youLemma,
              dictionaryForm: youLemma,
              reading: "",
              dictionaryFormReading: "",
              pos: 形容詞0 | 連体形_一般,
              dictionaryId: -1
            },
            headNounToken: tokens[nextPos] ?? null
          },
          rewriteSuffixOnLemmaReplace: false,
          rewriteSuffixOnConnectiveReplace: true
        })
      };
    }
    const atEos = nextPos >= n || ((tokens[nextPos]?.pos ?? 0) & POS0) === 補助記号;
    if (!prevIsNo && lastAux !== undefined && hasRentaikei(lastAux) && atEos) {
      return {
        consumed: cursor.consumed,
        korean: "",
        spaceAfter: true,
        renderPlan: legacySurfaceCompositionPlan("special_content_phase", {
          korean: conjugate("듯하다", null, "ㄴ/은"),
          koreanPos: 형용사,
          prefix
        })
      };
    }
    let connective: string | null = null;
    const matchedConn = matchFollowingAdversativeConnective(cursor);
    if (matchedConn !== null) {
      connective = matchedConn;
    }
    let sfpType: string | null = null;
    if (connective === null) {
      sfpType = detectSfp(cursor, pos0, auxTokens.length > 0);
    }
    return {
      consumed: cursor.consumed,
      korean: "",
      spaceAfter: true,
      renderPlan: legacySurfaceCompositionPlan("special_content_phase", {
        korean: "",
        koreanPos: 형용사,
        prefix,
        suffix: {
          kind: "lemma",
          entry: null,
          koreanLemma: "같다",
          koreanPos: 형용사,
          irregular: null,
          auxTokens: auxTokensArray(auxTokens),
          connective,
          sfp: sfpType
        },
        rewriteSuffixOnLemmaReplace: false,
        rewriteSuffixOnConnectiveReplace: true
      })
    };
  }
  return null;
}
