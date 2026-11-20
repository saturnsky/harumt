
import type { ContentCtx } from "../../../content-types.js";
import { detectSfp, isYouToken } from "../../../semantics/grammar-runtime.js";
import { collectAuxTokens, runtimeToken, type MatcherToken, runtimeTokens } from "../../../matchers.js";
import { hasRentaikei } from "../../../attributive.js";
import { matchFollowingAdversativeConnective } from "../../../rules/connective-helpers.js";
import type { RuleResult } from "../../../../types/pipeline.js";
import type { RenderPlan } from "../../../../types/render-plan.js";

import type { LookupTables } from "../../../lookup-tables.js";

import { POS0, POS01, POS4, POS5, 助動詞_タ, 助動詞_ダ, 代名詞, 動詞_非自立可能, 補助記号, 名詞, 連用形_ニ, 동사, 형용사 } from "../../../../types/pos.js";
export interface YoudaResolver { }

export function resolveYouda(
  _resolver: YoudaResolver,
  ctx: ContentCtx,
  options: { readonly isPotential?: boolean } = {},
  _lookups: LookupTables
): RuleResult | null {
  return ctx.cursor.tx(cursor => {
    const youToken = cursor.current();
    if (youToken === undefined || !isYouToken(youToken)) {
      return null;
    }
    if (ctx.koreanPos !== 동사 && ctx.koreanPos !== 형용사) {
      return null;
    }
    cursor.advance();
    const youAux = collectAuxTokens(cursor);
    const youEnd = cursor.pos;
    if (
      ((youAux.at(-1)?.pos ?? 0) & POS5) === 連用形_ニ &&
      ctx.auxTokens.at(-1)?.surface === "な" &&
      ((ctx.auxTokens.at(-1)?.pos ?? 0) & POS4) === 助動詞_ダ
    ) {
      return null;
    }
    const lastYouAux = youAux.at(youAux.length - 1);

    const carrierVerb = ctx.tokens[youEnd];
    if (
      ((youAux.at(-1)?.pos ?? 0) & POS5) === 連用形_ニ &&
      carrierVerb !== undefined &&
      (carrierVerb.pos & POS01) === 動詞_非自立可能 &&
      (carrierVerb.dictionaryForm === "なる" ||
        carrierVerb.dictionaryForm === "成る" ||
        carrierVerb.dictionaryForm === "なれる") &&
      ((ctx.auxTokens.at(-1)?.pos ?? 0) & POS4) !== 助動詞_タ
    ) {
      return {
        consumed: cursor.consumed,
        korean: "",
        spaceAfter: true,
        renderPlan: {
          kind: "lemma",
          entry: ctx.entry,
          koreanLemma: ctx.koreanLemma,
          koreanPos: ctx.koreanPos,
          irregular: ctx.irregular,
          auxTokens: runtimeTokens(ctx.auxTokens),
          connective: "게",
          jpDictForm: ctx.token.dictionaryForm,
          verbConjType: ctx.verbCt4,
          voice: ctx.forcePassive ? "passive" : options.isPotential === true ? "potential" : "active"
        }
      };
    }

    if (lastYouAux !== undefined && hasRentaikei(lastYouAux) && youEnd < ctx.n && (((ctx.tokens[youEnd]?.pos ?? 0) & POS0) === 名詞 || ((ctx.tokens[youEnd]?.pos ?? 0) & POS0) === 代名詞)) {
      return {
        consumed: cursor.consumed, korean: "", spaceAfter: true, renderPlan: buildYoudaModalityPlan(ctx, {
          isPotential: options.isPotential ?? false,
          mode: "attributive",
          modalAux: youAux
        })
      };
    }

    const atEos = youEnd >= ctx.n || ((ctx.tokens[youEnd]?.pos ?? 0) & POS0) === 補助記号;
    if (lastYouAux !== undefined && hasRentaikei(lastYouAux) && atEos) {
      return {
        consumed: cursor.consumed,
        korean: "",
        spaceAfter: true,
        renderPlan: buildYoudaModalityPlan(ctx, {
          isPotential: options.isPotential ?? false,
          mode: "attributive",
          modalAux: youAux
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
      sfpType = detectSfp(cursor, ctx.pos0, true);
    }
    return {
      consumed: cursor.consumed,
      korean: "",
      spaceAfter: true,
      renderPlan: buildYoudaModalityPlan(ctx, {
        isPotential: options.isPotential ?? false,
        mode: "predicative",
        modalAux: youAux,
        connective,
        sfp: sfpType
      })
    };
  });
}

function buildYoudaModalityPlan(
  ctx: ContentCtx,
  options: {
    readonly isPotential: boolean;
    readonly mode: "predicative" | "attributive";
    readonly modalAux: readonly MatcherToken[];
    readonly connective?: string | null;
    readonly sfp?: string | null;
  }
): RenderPlan {
  return {
    kind: "youdaModality",
    payload: {
      entry: ctx.entry,
      koreanLemma: ctx.koreanLemma,
      irregular: ctx.irregular,
      koreanPos: ctx.koreanPos,
      auxTokens: runtimeTokens(ctx.auxTokens),
      contentToken: runtimeToken(ctx.token),
      voice: ctx.forcePassive ? "passive" : options.isPotential ? "potential" : "active",
      verbConjType: ctx.verbCt4,
      jpDictForm: ctx.token.dictionaryForm,
      mode: options.mode,
      modalAux: runtimeTokens(options.modalAux),
      connective: options.connective ?? null,
      sfp: options.sfp ?? null
    }
  };
}


