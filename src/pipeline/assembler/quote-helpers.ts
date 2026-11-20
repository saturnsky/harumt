import type { ParticleKey } from "../../generator/particles.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { quoteStructuralRelationAt } from "../structural-relation/quote.js";
import { INFLECTABLE_BITS, POS0, POS01, pos0in, 助詞_終助詞, 助動詞 } from "../../types/pos.js";
import type { LookupTables } from "../lookup-tables.js";
import type { ConnectiveOp } from "../head-tail/tail/predicate-root/grammar.js";
import type { TokenCursor } from "../token-cursor.js";
import { createConnectiveOp } from "../head-tail/tail/predicate-root/op-builders.js";

export function isQuoteUtteranceClauseEndToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  if (pos0in(token.pos, INFLECTABLE_BITS)) {
    return true;
  }
  if ((token.pos & POS0) === 助動詞) {
    return true;
  }
  return (token.pos & POS01) === 助詞_終助詞;
}

export function quoteMarkerFocusRealizationAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): { readonly consumed: number; readonly allomorphKey: ParticleKey } | null {
  const quote = quoteStructuralRelationAt(cursor, lookups)?.quote;
  if (quote === undefined || quote.focusParticle === undefined || quote.markerIdx !== cursor.pos) {
    return null;
  }
  const consumed = quote.markerSpan.endExclusive - (quote.markerIdx + 1);
  if (consumed <= 0) {
    return null;
  }
  const allomorphKey = quote.focusParticle === "でも"
    ? "이라도/라도"
    : quote.focusParticle === "も" ? "도" : "은/는";
  return { consumed, allomorphKey };
}

export function quotedDesireRenderPlan(plan: RenderPlan | null, marker: RuntimeHaruToken, markerIndex: number): RenderPlan | null {
  if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  if (!layer.ops.some((op) => op.kind === "desire") || layer.ops.some((op) => op.kind === "connective")) {
    return null;
  }
  const connective: ConnectiveOp = createConnectiveOp({

    connective: "quotative",
    surface: marker.surface,
    source: { tokens: [marker], tokenIndices: [markerIndex] }
  });
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: {
          ...layer,
          ops: [...layer.ops, connective]
        }
      }
    },
    clauseRole: {
      ...plan.clauseRole,
      outgoingBoundary: {
        kind: "接続助詞",
        connectiveKind: "quotative",
        surface: marker.surface,
        tokenIdx: markerIndex,
        tokenSpan: { start: markerIndex, end: markerIndex }
      }
    }
  };
}
