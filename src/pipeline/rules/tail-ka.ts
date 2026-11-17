
import type { ContentCtx } from "../content-types.js";
import { isVerbLemma } from "../matchers.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import type { RuleResult } from "../../types/pipeline.js";
import type { TailResolver } from "./tail-types.js";
import { nominalLinkMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { hasWeakPunctuationRelation } from "../head-tail/boundary/punctuation.js";

import { POS0, POS5A, 記号, 助詞, 助動詞, 補助記号, 連用形_, 대명사, 명사 } from "../../types/pos.js";

function fixedTailKaResult(consumed: number, text: string, spaceAfter = true): RuleResult {
  return { consumed, korean: "", spaceAfter, renderPlan: { kind: "fixedText", text } };
}

export function ruleCauseHeadMoAru(_resolver: TailResolver, ctx: ContentCtx, _isPotential: boolean): RuleResult | null {
  const head = ctx.token.dictionaryForm;
  if (head !== "せい" && head !== "おかげ") {
    return null;
  }
  if (ctx.koreanPos !== 명사 && ctx.koreanPos !== 대명사) {
    return null;
  }
  if (nominalLinkMarkerRelationAt(ctx.tokens, ctx.start - 1, { consumers: ["tail_ka_rules"] }) !== null) {
    return null;
  }
  const pos = ctx.start + ctx.consumed;
  if (pos + 1 >= ctx.n) {
    return null;
  }
  const moTok = ctx.tokens[pos];
  const aruTok = ctx.tokens[pos + 1];
  if (moTok?.surface !== "も" || (moTok.pos & POS0) !== 助詞) {
    return null;
  }
  if (!aruTok || !isVerbLemma(aruTok, "ある")) {
    return null;
  }
  ctx.cursor.advance(2);
  if (pos + 2 < ctx.n) {
    const teTok = ctx.tokens[pos + 2];
    if (isTeConnectiveToken(teTok)) {
      ctx.cursor.advance();
    } else if (teTok !== undefined && (teTok.pos & POS0) === 助動詞) {
      return null;
    } else if (teTok !== undefined && ((teTok.pos & POS0) === 補助記号 || (teTok.pos & POS0) === 記号)) {
      if (!hasWeakPunctuationRelation(teTok, pos + 2, ["tail_ka_rules"])) {
        return null;
      }
    }
  } else {
    return null;
  }
  if ((aruTok.pos & POS5A) !== 連用形_) {
    return null;
  }
  const text = head === "せい" ? "탓도 있어서" : "덕분도 있어서";
  return fixedTailKaResult(ctx.cursor.consumed, text);
}
