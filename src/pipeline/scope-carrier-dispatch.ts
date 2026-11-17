import {
  isPredicateHeadTailChainRenderPlan,
  type CopulaPredicatePlan,
  type ParticleizedLemmaPlan,
  type RenderPlan
} from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { LookupTables } from "./lookup-tables.js";
import type { PredicateHeadTailChainRenderPlan } from "./head-tail/lifecycle/head-tail-render-plan.js";
import type { AuxOpNode, PredicateQuoteCarrierOp } from "./head-tail/tail/predicate-root/grammar.js";
import { collectAuxTokens } from "./matchers.js";
import { TokenCursor } from "./token-cursor.js";
import { matchCopulaNegation } from "./rules/copula.js";
import { isCopulaAuxToken, terminalQuestionTail } from "./semantics/copula-tail-runtime.js";
import { hasTerminalSentenceMark } from "./semantics/terminal-runtime.js";
import {
  trailingCopulaConnectiveTail,
  trailingCopulaSfpTail,
  trailingCopulaTariTail
} from "./semantics/copula-tail-runtime.js";
import {
  defineHeadedParserEngine,
  headProfileDispatchSelection,
  type HeadProfile,
  type HeadProfileDispatchMetadata,
  type HeadProfileDescriptor
} from "./head-tail/head/profile.js";
import { focusDakeDeScopeBridgeRelationAt } from "./head-tail/boundary/marker.js";


import { POS0, POS5A, 助動詞, 動詞, 連用形_, 명사, 부사, 조사, 名詞_普通名詞 } from "../types/pos.js";
import { createPredicateQuoteCarrierOp } from "./head-tail/tail/predicate-root/op-builders.js";
export type ScopeCarrierKind =
  | "focus_dake_additive_scope"
  | "focus_dake_de_scope"
  | "quoted_concessive_reason_dake_de_scope"
  | "quoted_concessive_reason_dake_copula_scope"
  | "focus_dake_nara_scope"
  | "focus_dake_copula_scope";

export interface ScopeCarrierDispatchContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly previousPlan: RenderPlan | null;
  readonly previousKoreanPos: number;
  readonly lookups: LookupTables;
}

export interface ScopeCarrierBuildPayload {
  readonly kind: ScopeCarrierKind;
  readonly consumed: number;
  readonly renderPlan: RenderPlan;
  readonly rule: string;
  readonly appendQuestionMark?: boolean;
}

export type ScopeCarrierDispatchResult =
  | (ScopeCarrierBuildPayload & HeadProfileDispatchMetadata<ScopeCarrierBuildPayload>)
  | { readonly kind: "none" };

const SCOPE_CARRIER_PROFILES: readonly HeadProfile<ScopeCarrierDispatchContext, ScopeCarrierBuildPayload>[] = [
  {
    id: "focus_dake_scope_carrier",
    owner: "predicate_tail",
    continuationCapabilities: [
      {
        id: "focus_dake_additive_scope_marker",
        kind: "connective",
        surfaces: ["Pだけでなく"],
        description: ""
      },
      {
        id: "focus_dake_de_scope_marker",
        kind: "scope_bridge",
        surfaces: ["Pだけで", "Pだけでは", "Pだけでも"],
        description: ""
      },
      {
        id: "quoted_concessive_reason_dake_de_scope_marker",
        kind: "scope_bridge",
        surfaces: ["Pからってだけで", "Pからってだけでは", "Pからってだけでも"],
        description: ""
      },
      {
        id: "quoted_concessive_reason_dake_copula_scope_marker",
        kind: "scope_bridge",
        surfaces: [
          "Pからってだけだ",
          "Pからってだけではない",
          "Pからってだけだった",
          "Pからってだけど",
          "Pからってだけか"
        ],
        description: ""
      },
      {
        id: "focus_dake_nara_scope_marker",
        kind: "connective",
        surfaces: ["Pだけなら"],
        description: ""
      },
      {
        id: "focus_dake_copula_scope_marker",
        kind: "scope_bridge",
        surfaces: ["Pだけだ", "Pだけではない", "Pだけだった", "Pだけど", "Pだけか"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: (result) => {
      switch (result.kind) {
        case "focus_dake_additive_scope":
          return ["focus_dake_additive_scope_marker"];
        case "focus_dake_de_scope":
          return ["focus_dake_de_scope_marker"];
        case "quoted_concessive_reason_dake_de_scope":
          return ["quoted_concessive_reason_dake_de_scope_marker"];
        case "quoted_concessive_reason_dake_copula_scope":
          return ["quoted_concessive_reason_dake_copula_scope_marker"];
        case "focus_dake_nara_scope":
          return ["focus_dake_nara_scope_marker"];
        case "focus_dake_copula_scope":
          return ["focus_dake_copula_scope_marker"];
      }
    },
    tryBuild: tryBuildFocusDakeScopeCarrier
  }
] as const;

const SCOPE_CARRIER_ENGINE = defineHeadedParserEngine({
  id: "scope_carrier_dispatch",
  profiles: SCOPE_CARRIER_PROFILES
});

export function describeScopeCarrierDispatchProfiles(): readonly HeadProfileDescriptor[] {
  return SCOPE_CARRIER_ENGINE.describe();
}

export async function tryBuildScopeCarrierDispatch(
  context: ScopeCarrierDispatchContext
): Promise<ScopeCarrierDispatchResult> {
  const decision = await SCOPE_CARRIER_ENGINE.arbitrate(context);
  const selection = headProfileDispatchSelection(decision);
  if (selection === null) {
    return { kind: "none" };
  }
  return {
    ...selection.match.result,
    ...selection.metadata
  };
}

export function supportsFocusScopePlan(plan: RenderPlan | null): plan is RenderPlan {
  if (plan === null) {
    return false;
  }
  if (plan.kind === "lemma") {
    return true;
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    return headTailPlanHasFocusScopeCompatibleBoundary(plan);
  }
  return false;
}

function headTailPlanHasFocusScopeCompatibleBoundary(plan: PredicateHeadTailChainRenderPlan): boolean {
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return true;
  }
  const connectiveOps = plan.realization.root.tail.ops.filter((op) => op.kind === "connective");
  if (connectiveOps.length === 0) {
    return true;
  }
  return connectiveOps.every((op) => (
    op.connective === "question_content" ||
    op.connective === "question_content_alternative" ||
    (
      op.connective === "quoted_concessive" &&
      op.surface.startsWith("から")
    )
  ));
}

function tryBuildFocusDakeScopeCarrier(
  context: ScopeCarrierDispatchContext
): ScopeCarrierBuildPayload | null {
  const { tokens, pos: index, end: limit } = context.cursor;
  const { previousPlan } = context;
  if (!supportsFocusScopePlan(previousPlan)) {
    return null;
  }
  if (tokens[index]?.surface === "だけでなく") {
    return {
      kind: "focus_dake_additive_scope",
      consumed: 1,
      rule: "focus_dake_additive_scope",
      renderPlan: {
        kind: "predicateScopeCarrier",
        koreanPos: 부사,
        projection: {
          kind: "predicateScope",
          base: previousPlan,
          ending: "ㄹ/을",
          suffix: " "
        },
        suffix: "뿐만 아니라"
      }
    };
  }
  if (tokens[index]?.surface !== "だけ") {
    return null;
  }
  const dearuCopulaScope = buildFocusDakeDearuCopulaScope(context, previousPlan);
  if (dearuCopulaScope !== null) {
    return dearuCopulaScope;
  }
  const dakeDeScopeBridge = focusDakeDeScopeBridgeRelationAt(tokens, index, {
    consumers: ["scope_carrier_dispatch"]
  });
  if (dakeDeScopeBridge !== null && dakeDeScopeBridge.span.endExclusive <= limit) {
    const blocked = context.cursor.lookahead(
      dakeDeScopeBridge.markerIdx - context.cursor.pos,
      c => matchCopulaNegation(c) !== undefined
    ) ||
      startsDearuCopula(context.cursor.fork(dakeDeScopeBridge.markerIdx, limit));
    if (!blocked) {
      const additiveWa = dakeDeScopeBridge.focusParticle === "wa";
      const additiveMo = dakeDeScopeBridge.focusParticle === "mo";
      const consumed = dakeDeScopeBridge.span.endExclusive - index;
      const suffix = additiveWa ? "만으로는" : additiveMo ? "만으로도" : "만으로";
      const quotedReasonScope = buildQuotedConcessiveReasonDakeDeScope(previousPlan, suffix, consumed);
      if (quotedReasonScope !== null) {
        return quotedReasonScope;
      }
      if (isIntrinsicQuestionNominalScope(previousPlan)) {
        return {
          kind: "focus_dake_de_scope",
          consumed,
          rule: "focus_dake_de_scope",
          renderPlan: {
            kind: "predicateScopeCarrier",
            koreanPos: 조사,
            projection: {
              kind: "direct",
              base: previousPlan
            },
            suffix
          }
        };
      }
      return {
        kind: "focus_dake_de_scope",
        consumed,
        rule: "focus_dake_de_scope",
        renderPlan: {
          kind: "predicateScopeCarrier",
          koreanPos: 조사,
          projection: {
            kind: "predicateNominalScope",
            base: previousPlan,
            suffix: " 것"
          },
          suffix
        }
      };
    }
  }
  if (index + 1 < limit && tokens[index + 1]?.surface === "なら" && ((tokens[index + 1]?.pos ?? 0) & POS0) === 助動詞) {
    return {
      kind: "focus_dake_nara_scope",
      consumed: 2,
      rule: "focus_dake_nara_scope",
      renderPlan: isIntrinsicQuestionNominalScope(previousPlan)
        ? {
          kind: "predicateScopeCarrier",
          koreanPos: 조사,
          projection: {
            kind: "direct",
            base: previousPlan
          },
          suffix: "만이라면"
        }
        : {
          kind: "predicateScopeCarrier",
          koreanPos: 조사,
          projection: {
            kind: "predicateNominalScope",
            base: previousPlan,
            suffix: " 것"
          },
          suffix: "만이라면"
        }
    };
  }

  return buildFocusDakeCopulaScope(context, previousPlan);
}

function buildQuotedConcessiveReasonDakeDeScope(
  previousPlan: RenderPlan,
  suffix: string,
  consumed: number
): ScopeCarrierBuildPayload | null {
  const attributiveReason = quotedConcessiveReasonAttributivePlan(previousPlan);
  if (attributiveReason === null) {
    return null;
  }
  return {
    kind: "quoted_concessive_reason_dake_de_scope",
    consumed,
    rule: "quoted_concessive_reason_dake_de_scope",
    renderPlan: {
      kind: "predicateScopeCarrier",
      koreanPos: 조사,
      projection: {
        kind: "direct",
        base: attributiveReason
      },
      suffix: ` 이유${suffix}`,
      connectiveRoleSource: "semantic"
    }
  };
}

function buildQuotedConcessiveReasonDakeCopulaScope(
  context: ScopeCarrierDispatchContext,
  previousPlan: RenderPlan,
  tailPlan: RenderPlan,
  consumed: number,
  appendQuestionMark: boolean,
  rule: string
): ScopeCarrierBuildPayload | null {
  const attributiveReason = quotedConcessiveReasonAttributivePlan(previousPlan);
  if (attributiveReason === null) {
    return null;
  }
  return {
    kind: "quoted_concessive_reason_dake_copula_scope",
    consumed,
    appendQuestionMark,
    rule,
    renderPlan: {
      kind: "predicateScopeCarrier",
      koreanPos: context.previousKoreanPos,
      projection: {
        kind: "direct",
        base: attributiveReason
      },
      suffix: {
        kind: "predicateScopeCarrier",
        koreanPos: 명사,
        projection: {
          kind: "direct",
          base: { kind: "fixedText", text: " 이유일 ", koreanPos: 명사 }
        },
        suffix: tailPlan
      },
      connectiveRoleSource: "semantic"
    }
  };
}

function quotedConcessiveReasonAttributivePlan(
  plan: RenderPlan
): PredicateHeadTailChainRenderPlan | null {
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return null;
  }
  if (plan.realization.root.tail.kind !== "auxLayer") {
    return null;
  }
  const layer = plan.realization.root.tail;
  const lastOp = layer.ops[layer.ops.length - 1];
  if (
    lastOp?.kind !== "connective" ||
    lastOp.connective !== "quoted_concessive" ||
    !lastOp.surface.startsWith("から")
  ) {
    return null;
  }
  const quoteCarrier: PredicateQuoteCarrierOp = createPredicateQuoteCarrierOp({

    style: "compact_toiu",
    surface: lastOp.surface,
    source: lastOp.source
  });
  const ops: AuxOpNode[] = [
    ...layer.ops.slice(0, -1),
    quoteCarrier
  ];
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: {
          ...layer,
          ops,
          terminal: "attributive"
        }
      }
    },
    clauseRole: { ...plan.clauseRole, outgoingBoundary: { kind: "terminal" } }
  };
}

function buildFocusDakeDearuCopulaScope(
  context: ScopeCarrierDispatchContext,
  previousPlan: RenderPlan
): ScopeCarrierBuildPayload | null {
  const { tokens, pos: index, end: limit } = context.cursor;
  const { lookups } = context;
  const de = tokens[index + 1];
  const aru = tokens[index + 2];
  if (!startsDearuCopula(context.cursor.fork(index + 1, limit)) || de === undefined || aru === undefined) {
    return null;
  }
  const auxMatch = context.cursor.lookahead(index + 3 - context.cursor.pos, cursor => {
    const aux = collectAuxTokens(cursor) as readonly RuntimeHaruToken[];
    return { aux, afterAux: cursor.pos };
  });
  const aruAux = auxMatch.aux;
  let appendQuestionMark = false;
  const tailPlan = focusDakeCopulaTailPlan(previousPlan, [de, ...aruAux], {
    writtenCopula: true
  });

  const tailMatch = context.cursor.lookahead(auxMatch.afterAux - context.cursor.pos, cursor => {
    const connective = trailingCopulaConnectiveTail(cursor, lookups);
    if (connective !== null) {
      return { kind: "connective" as const, connective, consumed: cursor.pos - index };
    }
    const question = terminalQuestionTail(cursor);
    if (question !== null) {
      return { kind: "question" as const, question, consumed: cursor.pos - index };
    }
    const trailingSfp = trailingCopulaSfpTail(cursor);
    if (trailingSfp !== null) {
      return { kind: "sfp" as const, sfp: trailingSfp, consumed: cursor.pos - index };
    }
    return { kind: "terminal" as const, terminal: hasTerminalSentenceMark(cursor), consumed: cursor.pos - index };
  });
  let finalizedTailPlan: RenderPlan = tailPlan;
  if (tailMatch.kind === "connective") {
    if (finalizedTailPlan.kind === "lemma") {
      finalizedTailPlan = { ...finalizedTailPlan, connective: tailMatch.connective };
    }
  } else {
    if (tailMatch.kind === "question") {
      if (finalizedTailPlan.kind === "lemma") {
        finalizedTailPlan = { ...finalizedTailPlan, sfp: "polite_q" };
      }
      appendQuestionMark = tailMatch.question.absorbPeriod;
    } else {
      if (tailMatch.kind === "sfp" && finalizedTailPlan.kind === "lemma") {
        finalizedTailPlan = { ...finalizedTailPlan, sfp: tailMatch.sfp };
      } else if (tailMatch.kind === "terminal" && !tailMatch.terminal) {
        return null;
      }
    }
  }

  const rule = "focus_dake_dearu_copula_scope";
  const quotedReasonScope = buildQuotedConcessiveReasonDakeCopulaScope(
    context,
    previousPlan,
    finalizedTailPlan,
    tailMatch.consumed,
    appendQuestionMark,
    rule
  );
  if (quotedReasonScope !== null) {
    return quotedReasonScope;
  }

  return {
    kind: "focus_dake_copula_scope",
    consumed: tailMatch.consumed,
    appendQuestionMark,
    rule,
    renderPlan: focusDakeCopulaRenderPlan(context, previousPlan, finalizedTailPlan)
  };
}

function buildFocusDakeCopulaScope(
  context: ScopeCarrierDispatchContext,
  previousPlan: RenderPlan
): ScopeCarrierBuildPayload | null {
  const { tokens, pos: index, end: limit } = context.cursor;
  const { lookups } = context;
  let negConnective = false;
  const negMatch = context.cursor.lookahead(index + 1 - context.cursor.pos, cursor => {
    const matched = matchCopulaNegation(cursor);
    return matched === undefined ? undefined : { matched, afterAux: cursor.pos };
  });
  let tailPlan: RenderPlan;
  let afterAux: number;
  if (negMatch !== undefined) {
    const [polite, past, connective, , conditionalNara] = negMatch.matched;
    negConnective = connective;
    afterAux = negMatch.afterAux;
    tailPlan = {
      kind: "copulaPredicate",
      koreanLemma: focusDakeScopeTailLemma(previousPlan),
      entry: null,
      polite,
      past,
      jpPos: 名詞_普通名詞,
      conditionalNara
    };
  } else {
    const copulaToken = tokens[index + 1];
    if (index + 1 >= limit || copulaToken === undefined || !isCopulaAuxToken(copulaToken)) {
      return null;
    }
    const auxMatch = context.cursor.lookahead(index + 1 - context.cursor.pos, cursor => {
      const auxTokens = collectAuxTokens(cursor) as readonly RuntimeHaruToken[];
      return { auxTokens, afterAux: cursor.pos };
    });
    const auxTokens = auxMatch.auxTokens;
    if (auxTokens.length === 0) {
      return null;
    }
    const firstAux = auxTokens[0];
    if (firstAux === undefined || !isCopulaAuxToken(firstAux)) {
      return null;
    }
    afterAux = auxMatch.afterAux;
    tailPlan = focusDakeCopulaTailPlan(previousPlan, auxTokens);
  }
  let appendQuestionMark = false;
  const tailMatch = context.cursor.lookahead(afterAux - context.cursor.pos, cursor => {
    if (trailingCopulaTariTail(cursor)) {
      return { kind: "tari" as const, consumed: cursor.pos - index };
    }
    const connective = trailingCopulaConnectiveTail(cursor, lookups);
    if (connective !== null) {
      return { kind: "connective" as const, connective, consumed: cursor.pos - index };
    }
    const question = terminalQuestionTail(cursor);
    if (question !== null) {
      return { kind: "question" as const, question, consumed: cursor.pos - index };
    }
    const sfp = trailingCopulaSfpTail(cursor);
    if (sfp !== null) {
      return { kind: "sfp" as const, sfp, consumed: cursor.pos - index };
    }
    return { kind: "terminal" as const, terminal: hasTerminalSentenceMark(cursor), consumed: cursor.pos - index };
  });
  if (tailMatch.kind === "tari") {
    if (tailPlan.kind === "copulaPredicate") {
      let normalizedTailPlan: CopulaPredicatePlan | RenderPlan = {
        ...tailPlan,
        past: false,
        connective: "기"
      };
      normalizedTailPlan = {
        kind: "predicateScopeCarrier",
        koreanPos: 조사,
        projection: {
          kind: "direct",
          base: normalizedTailPlan
        },
        suffix: "도"
      };
      tailPlan = normalizedTailPlan;
    } else if (tailPlan.kind === "lemma") {
      const particlePlan: ParticleizedLemmaPlan = {
        kind: "particleizedLemma",
        koreanLemma: tailPlan.koreanLemma,
        koreanPos: tailPlan.koreanPos,
        irregular: tailPlan.irregular,
        particle: "이기/기",
        suffix: "도"
      };
      tailPlan = particlePlan;
    }
  } else {
    if (tailMatch.kind === "connective") {
      if (tailPlan.kind === "copulaPredicate" || tailPlan.kind === "lemma") {
        tailPlan = { ...tailPlan, connective: tailMatch.connective };
      }
    } else {
      let sfp: string | null;
      if (tailMatch.kind === "question") {
        sfp = "polite_q";
        appendQuestionMark = tailMatch.question.absorbPeriod;
      } else {
        sfp = tailMatch.kind === "sfp" ? tailMatch.sfp : null;
        if (sfp === null) {
          if (tailPlan.kind === "copulaPredicate" && negConnective) {
            tailPlan = { ...tailPlan, connective: "아니라" };
          } else if (tailMatch.kind === "terminal" && !tailMatch.terminal) {
            return null;
          }
        }
      }

      if (sfp !== null) {
        if (tailPlan.kind === "copulaPredicate") {
          tailPlan = { ...tailPlan, sfp };
        } else if (tailPlan.kind === "lemma") {
          tailPlan = { ...tailPlan, sfp: sfp === "sfp_yo" ? null : sfp };
        }
      }
    }
  }

  const rule = "focus_dake_copula_scope";
  const quotedReasonScope = buildQuotedConcessiveReasonDakeCopulaScope(
    context,
    previousPlan,
    tailPlan,
    tailMatch.consumed,
    appendQuestionMark,
    rule
  );
  if (quotedReasonScope !== null) {
    return quotedReasonScope;
  }

  return {
    kind: "focus_dake_copula_scope",
    consumed: tailMatch.consumed,
    appendQuestionMark,
    rule,
    renderPlan: focusDakeCopulaRenderPlan(context, previousPlan, tailPlan)
  };
}

function focusDakeCopulaRenderPlan(
  context: ScopeCarrierDispatchContext,
  previousPlan: RenderPlan,
  tailPlan: RenderPlan
): RenderPlan {
  if (isIntrinsicQuestionNominalScope(previousPlan)) {
    return {
      kind: "predicateScopeCarrier",
      koreanPos: context.previousKoreanPos,
      projection: {
        kind: "direct",
        base: previousPlan
      },
      suffix: tailPlan
    };
  }
  return {
    kind: "predicateScopeCarrier",
    koreanPos: context.previousKoreanPos,
    projection: {
      kind: "predicateScope",
      base: previousPlan,
      ending: "ㄹ/을",
      suffix: " "
    },
    suffix: tailPlan
  };
}

function focusDakeCopulaTailPlan(
  previousPlan: RenderPlan,
  auxTokens: readonly RuntimeHaruToken[],
  options: { readonly writtenCopula?: boolean } = {}
): RenderPlan {
  return {
    kind: "lemma",
    entry: null,
    koreanLemma: focusDakeScopeTailLemma(previousPlan),
    koreanPos: 명사,
    irregular: null,
    auxTokens,
    ...(options.writtenCopula === true ? { formalOverride: true } : {})
  };
}

function focusDakeScopeTailLemma(previousPlan: RenderPlan): string {
  return isIntrinsicQuestionNominalScope(previousPlan) ? "만" : "뿐";
}

function isIntrinsicQuestionNominalScope(plan: RenderPlan): boolean {
  if (plan.kind !== "headTailChain" || plan.realization.kind !== "predicate" || plan.realization.root.tail.kind !== "auxLayer") {
    return false;
  }
  return plan.realization.root.tail.ops.some((op) =>
    op.kind === "connective" &&
    (op.connective === "question_content" || op.connective === "question_content_alternative")
  );
}

function startsDearuCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: index, end: limit } = cursor;
  const de = tokens[index];
  const aru = tokens[index + 1];
  return index + 1 < limit &&
    de !== undefined &&
    aru !== undefined &&
    isCopulaAuxToken(de) &&
    (de.pos & POS5A) === 連用形_ &&
    (aru.pos & POS0) === 動詞 &&
    (aru.dictionaryForm === "ある" || aru.dictionaryForm === "有る");
}
