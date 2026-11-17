
import type { ContentCtx } from "../content-types.js";
import { isVerbLemmaIn } from "../matchers.js";
import type { LookupTables } from "../lookup-tables.js";
import type { SourceVerbalPredicateVerdict } from "../../types/pipeline.js";
import { caseParticleMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import type { RuntimeHaruToken } from "../../types/token.js";

import { POS5A, pos0in, 助詞, 名詞, 連用形_, 동사 } from "../../types/pos.js";
import { TokenCursor } from "../token-cursor.js";

export function sourceVerbalPredicateVerdictForPurposeMotion(
  ctx: ContentCtx,
  lookups: LookupTables
): SourceVerbalPredicateVerdict | null {
  return (
    ctx.auxTokens.length === 0 &&
    ctx.koreanPos === 동사 &&
    (ctx.token.pos & POS5A) === 連用形_ &&
    ctx.cursor.lookahead(
      ctx.start + ctx.consumed - ctx.cursor.pos,
      cursor => matchNiIkuKuru(cursor, lookups.PURPOSE_MOTION_VERBS)
    )
  )
    ? "purpose_motion"
    : null;
}
export function matchNiIkuKuru(
  cursor: TokenCursor<RuntimeHaruToken>,
  motionVerbs: ReadonlySet<string>
): boolean {
  const ni = cursor.current();
  if (caseParticleMarkerRelationForToken(ni, cursor.pos, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_nominalization_rules"]
  }) === null) {
    return false;
  }
  let j = cursor.pos + 1;
  const limit = Math.min(cursor.pos + 5, cursor.end);
  while (j < limit) {
    const token = cursor.tokens[j];
    if (token === undefined) {
      return false;
    }
    if (isVerbLemmaIn(token, motionVerbs)) {
      return true;
    }
    if (pos0in(token.pos, (1 << 名詞) | (1 << 助詞))) {
      j += 1;
      continue;
    }
    break;
  }
  return false;
}
