import { extractFeatures as auxExtractFeatures, nounCopula, nounCopulaConnective, type AuxToken } from "../generator/aux-map.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { BoundaryToken } from "./head-tail/boundary/punctuation.js";
import { collectAuxTokens } from "./matchers.js";
import { matchCopulaNegation } from "./rules/copula.js";
import { looksPronominalNoNi } from "./semantics/helpers.js";
import { looksPronominalNoTo, pronominalNoCopulaDeFollows } from "./head-tail/boundary/pronominal-no.js";
import { toiuAttributiveTailEnd } from "./semantics/marker-roles.js";
import { isPlainNominalizerParticleFollowerAt } from "./head-tail/tail/predicate-root/matchers/nominalizer.js";
import { previousNonSpaceIndex } from "./clause-layout/trivia.js";
import type { TokenCursor } from "./token-cursor.js";
import { trailingCopulaConnectiveTail } from "./semantics/copula-tail-runtime.js";
import { terminalQuestionKaRelationAt } from "./head-tail/boundary/ka-ownership.js";
import { classifyFollowConnective, detectKamoShirenaiAfterChain } from "./semantics/grammar-runtime.js";
import {
  caseParticleMarkerRelationForToken,
  copulaDeMarkerRelationForToken,
  pronominalNoDeScopeBridgeRelationAt,
  pronominalNoMarkerRelationForToken,
  topicFocusMarkerRelationForToken
} from "./head-tail/boundary/marker.js";
import {
  defineHeadedParserEngine,
  headProfileDispatchSelection,
  type HeadProfile,
  type HeadProfileArbitrationDecision,
  type HeadProfileDispatchMetadata,
  type HeadProfileDescriptor
} from "./head-tail/head/profile.js";
import { FunctionalKind, UnitType } from "./translation/unit.js";
import type { LookupTables } from "./lookup-tables.js";
import type { RenderPlan } from "../types/render-plan.js";


import {
  POS0,
  POS01,
  POS1,
  POS4,
  POS5,
  POS5A,
  PREDICATE_AUX_BITS,
  NOMINAL_ATTR_BITS,
  pos0in,
  助詞,
  助詞_終助詞,
  助動詞,
  助動詞_ジャ,
  助動詞_ダ,
  助動詞_デス,
  代名詞,
  名詞,
  副助詞,
  命令形_,
  準体助詞,
  連体詞,
  連用形_一般,
  관형사,
  명사,
  조사,
} from "../types/pos.js";
export const PRONOUN_POSSESSIVE_CONTRACTIONS: Record<string, string> = {
  "나": "내",
  "너": "네",
  "저": "제"
};

export const PRONOUN_SUBJECT_CONTRACTIONS: Record<string, string> = {
  "누구": "누"
};

interface PronominalNoDispatchOptions {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly previousUnitExists: boolean;
  readonly previousPossessiveContraction: string | null;
  readonly previousIsPronominalNominal: boolean;
  readonly previousPredicateAttributivePlan: RenderPlan | null;
  readonly previousPredicateUnitTokenIndex: number | null;
  readonly lookups: LookupTables;
}

export interface PronominalNoAppendAction {
  readonly kind: "append";
  readonly start: number;
  readonly consumed: number;
  readonly korean: string;
  readonly unitType: UnitType;
  readonly koreanPos: number;
  readonly attachLeft: boolean;
  readonly functionalKind?: FunctionalKind;
  readonly allomorphKey?: string;
  readonly renderPlan?: RenderPlan;
}

export interface PronominalNoRewritePreviousAction {
  readonly kind: "rewrite_previous";
  readonly tokenIndex: number;
  readonly renderPlan: RenderPlan;
  readonly rule: string;
}

export type PronominalNoAction = PronominalNoAppendAction | PronominalNoRewritePreviousAction;

export interface PronominalNoBuildPayload {
  readonly kind:
  | "copula"
  | "copula_negative"
  | "demo"
  | "particle"
  | "bare_adnominal"
  | "aux_de";
  readonly consumed: number;
  readonly actions: readonly PronominalNoAction[];
}

export type PronominalNoDispatchResult =
  PronominalNoBuildPayload & HeadProfileDispatchMetadata<PronominalNoBuildPayload>;

export type PronominalNoParticleContinuation =
  | { readonly kind: "case"; readonly surface: "を" | "が" | "に" | "で" | "と" }
  | { readonly kind: "topic_focus"; readonly surface: "は" | "も" };

export function pronominalNoParticleContinuationForToken(
  token: BoundaryToken | undefined,
  index: number,
): PronominalNoParticleContinuation | null {
  const caseRelation = caseParticleMarkerRelationForToken(token, index, {
    acceptedSurfaces: ["を", "が", "に", "で", "と"],
    consumers: ["pronominal_no_dispatch"],
  });
  if (caseRelation !== null) {
    return { kind: "case", surface: caseRelation.caseSurface as "を" | "が" | "に" | "で" | "と" };
  }
  const topicRelation = topicFocusMarkerRelationForToken(token, index, {
    acceptedSurfaces: ["は", "も"],
    consumers: ["pronominal_no_dispatch"],
  });
  return topicRelation === null
    ? null
    : { kind: "topic_focus", surface: topicRelation.markerSurface };
}

function appendContent(
  start: number,
  consumed: number,
  korean: string,
  options: {
    readonly koreanPos?: number;
    readonly attachLeft?: boolean;
    readonly renderPlan?: RenderPlan;
  } = {}
): PronominalNoAppendAction {
  return {
    kind: "append",
    start,
    consumed,
    korean,
    unitType: UnitType.CONTENT,
    koreanPos: options.koreanPos ?? 명사,
    attachLeft: options.attachLeft ?? false,
    ...(options.renderPlan === undefined ? {} : { renderPlan: options.renderPlan })
  };
}

function pronominalNoNominalPlan(koreanPos = 명사, options: { readonly casualNoun?: "geo" | "geot" | null } = {}): RenderPlan {
  return {
    kind: "pronominalNoNominal",
    casualNoun: options.casualNoun ?? null,
    koreanPos
  };
}

function pronominalNoCopulaNegationSuffixPlan(options: {
  readonly polite: boolean;
  readonly past: boolean;
  readonly connective: boolean;
  readonly additiveMo: boolean;
  readonly conditionalNara: boolean;
  readonly question?: boolean;
  readonly auxTokens?: readonly AuxToken[];
  readonly modalKind?: "kamo_shirenai" | null;
  readonly modalPolite?: boolean;
  readonly modalPast?: boolean;
  readonly followKind?: "conditional" | "contrastive" | "causal" | null;
  readonly koreanPos?: number;
}): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "no_dewa_nai",
      ...options,
      koreanPos: options.koreanPos ?? 명사
    }
  };
}

function appendFunctional(
  start: number,
  consumed: number,
  korean: string,
  options: {
    readonly functionalKind: FunctionalKind;
    readonly allomorphKey?: string;
  }
): PronominalNoAppendAction {
  return {
    kind: "append",
    start,
    consumed,
    korean,
    unitType: UnitType.FUNCTIONAL,
    koreanPos: 조사,
    attachLeft: true,
    functionalKind: options.functionalKind,
    ...(options.allomorphKey === undefined ? {} : { allomorphKey: options.allomorphKey })
  };
}

function possessivePrefixActions(
  options: PronominalNoDispatchOptions,
  previousToken: RuntimeHaruToken | undefined
): readonly PronominalNoAction[] | null {
  if (!options.previousUnitExists) {
    return null;
  }
  if (((previousToken?.pos ?? 0) & POS0) === 連体詞) {
    return [];
  }
  if (options.previousPossessiveContraction !== null) {
    return [{
      kind: "rewrite_previous",
      tokenIndex: options.cursor.pos - 1,
      renderPlan: {
        kind: "fixedText",
        text: options.previousPossessiveContraction,
        koreanPos: 관형사
      },
      rule: "NO-PRONOMINAL"
    }];
  }
  return [appendFunctional(options.cursor.pos, 1, "의", { functionalKind: FunctionalKind.CONTEXTUAL })];
}

function copulaAuxStartsAt(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const copulaAux = cursor.lookahead(0, collectAuxTokens);
  if (copulaAux.length === 0) {
    return false;
  }
  const first = copulaAux[0];
  const firstPos4 = ((first?.pos ?? 0) & POS4);
  const firstPos5 = ((first?.pos ?? 0) & POS5);
  if ((firstPos4 & POS4) !== 助動詞_ダ && (firstPos4 & POS4) !== 助動詞_デス && (firstPos4 & POS4) !== 助動詞_ジャ) {
    return false;
  }
  return !((firstPos4 & POS4) === 助動詞_ダ && (firstPos5 & POS5) === 連用形_一般);
}


function tryPronominalNoParticle(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  const noMarker = pronominalNoMarkerRelationForToken(token, cursor.pos, {
    requirement: "case_particle_tail",
    consumers: ["pronominal_no_dispatch"]
  });
  if (
    cursor.pos === 0 ||
    cursor.pos + 1 >= cursor.end ||
    noMarker === null
  ) {
    return null;
  }
  const previousToken = cursor.tokens[cursor.pos - 1];
  const nextToken = cursor.tokens[cursor.pos + 1];
  if (previousToken === undefined || nextToken === undefined || !options.previousUnitExists) {
    return null;
  }
  const previousPos0 = previousToken.pos & POS0;
  const prevPrevIdx = previousNonSpaceIndex(cursor.tokens, cursor.pos - 1);
  const afterParticleToken = cursor.tokens[cursor.pos + 2];
  const bareTteAttributiveCarrier = previousToken.surface === "って" &&
    (previousToken.pos & (POS0 | POS1)) === (助詞 | 副助詞) &&
    token?.surface === "の" &&
    prevPrevIdx !== null &&
    pos0in((cursor.tokens[prevPrevIdx]?.pos ?? 0) & POS0, PREDICATE_AUX_BITS) &&
    ((cursor.tokens[prevPrevIdx]?.pos ?? 0) & POS5A) !== 命令形_ &&
    (afterParticleToken === undefined || (afterParticleToken.pos & POS01) !== 助詞_終助詞);
  const predicateNominalizer = noMarker.particleSubtype1 === 準体助詞 &&
    (pos0in(previousPos0, PREDICATE_AUX_BITS) || bareTteAttributiveCarrier);
  if (!pos0in(previousPos0, NOMINAL_ATTR_BITS) && !predicateNominalizer) {
    return null;
  }
  if (
    pronominalNoParticleContinuationForToken(nextToken, cursor.pos + 1) === null &&
    !(
      predicateNominalizer &&
      isPlainNominalizerParticleFollowerAt(cursor.tokens, cursor.pos + 1, options.lookups, [
        "pronominal_no_dispatch"
      ])
    )
  ) {
    return null;
  }
  if (
    predicateNominalizer &&
    caseParticleMarkerRelationForToken(nextToken, cursor.pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["pronominal_no_dispatch"]
    }) !== null &&
    !looksPronominalNoNi(cursor, options.lookups)
  ) {
    return null;
  }
  if (
    caseParticleMarkerRelationForToken(nextToken, cursor.pos + 1, {
      acceptedSurfaces: ["と"],
      consumers: ["pronominal_no_dispatch"]
    }) !== null &&
    !looksPronominalNoTo(cursor.tokens, cursor.pos + 1, options.lookups)
  ) {
    return null;
  }
  const noDeScopeBridge = pronominalNoDeScopeBridgeRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["pronominal_no_dispatch"]
  });
  if (noDeScopeBridge?.focusParticle === "mo") {
    return null;
  }
  const possessive = predicateNominalizer ? [] : possessivePrefixActions(options, previousToken);
  if (possessive === null) {
    return null;
  }
  return {
    kind: "particle",
    consumed: 1,
    actions: [
      ...possessive,
      appendContent(cursor.pos, 1, "것", {
        renderPlan: pronominalNoNominalPlan(명사, { casualNoun: "geot" })
      })
    ]
  };
}

function tryPronominalNoBareAdnominal(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  if (
    cursor.pos === 0 ||
    cursor.pos >= cursor.end ||
    pronominalNoMarkerRelationForToken(token, cursor.pos, {
      requirement: "bare_adnominal_tail",
      consumers: ["pronominal_no_dispatch"]
    }) === null
  ) {
    return null;
  }
  const previousToken = cursor.tokens[cursor.pos - 1];
  if (((previousToken?.pos ?? 0) & POS0) !== 連体詞 || !options.previousUnitExists) {
    return null;
  }
  const nextToken = cursor.pos + 1 < cursor.end ? cursor.tokens[cursor.pos + 1] : undefined;
  const nextIsCopulaDe = pronominalNoCopulaDeFollows(nextToken);
  if (nextToken !== undefined) {
    if (
      (((nextToken?.pos ?? 0) & POS0) === 助動詞 || ((nextToken?.pos ?? 0) & POS0) === 助詞) &&
      !nextIsCopulaDe
    ) {
      return null;
    }
  }
  return {
    kind: "bare_adnominal",
    consumed: 1,
    actions: [appendContent(cursor.pos, 1, nextIsCopulaDe ? "것" : "거", {
      renderPlan: pronominalNoNominalPlan(명사, { casualNoun: nextIsCopulaDe ? "geot" : "geo" })
    })]
  };
}

function tryPronominalNoDemo(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  if (
    cursor.pos === 0 ||
    cursor.pos + 2 >= cursor.end ||
    pronominalNoMarkerRelationForToken(token, cursor.pos, {
      requirement: "scope_bridge_tail",
      consumers: ["pronominal_no_dispatch"]
    }) === null
  ) {
    return null;
  }
  const noDeScopeBridge = pronominalNoDeScopeBridgeRelationAt(cursor.tokens, cursor.pos, {
    consumers: ["pronominal_no_dispatch"]
  });
  if (noDeScopeBridge?.focusParticle !== "mo") {
    return null;
  }
  const possessive = possessivePrefixActions(options, cursor.tokens[cursor.pos - 1]);
  if (possessive === null) {
    return null;
  }
  return {
    kind: "demo",
    consumed: noDeScopeBridge.span.endExclusive - cursor.pos,
    actions: [
      ...possessive,
      appendContent(cursor.pos, 1, "것", {
        renderPlan: pronominalNoNominalPlan(명사, { casualNoun: "geot" })
      }),
      appendFunctional(cursor.pos + 1, 2, "", {
        functionalKind: FunctionalKind.MULTI_TOKEN,
        allomorphKey: "이라도/라도"
      })
    ]
  };
}

function tryPronominalNoCopulaNegative(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  if (cursor.pos === 0 || cursor.pos >= cursor.end) {
    return null;
  }
  const toiuCarrier = previousClosesToiuAttributive(cursor);
  const isJuntaiParticle = token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    (token.pos & POS1) === 準体助詞;
  const noMarker = pronominalNoMarkerRelationForToken(token, cursor.pos, {
    requirement: "copula_tail",
    acceptedSurfaces: ["の"],
    consumers: ["pronominal_no_dispatch"]
  });
  const isNoMarker = noMarker !== null;
  if (!isNoMarker && !(toiuCarrier && isJuntaiParticle)) {
    return null;
  }
  const matchedResult = cursor.lookahead(1, c => {
    const base = c.pos;
    const matched = matchCopulaNegation(c);
    return matched === undefined ? null : { matched, consumed: c.pos - base };
  });
  if (matchedResult === null) {
    return null;
  }
  const previousToken = cursor.tokens[cursor.pos - 1];
  const predicateNominalizer = !toiuCarrier &&
    noMarker?.particleSubtype1 === 準体助詞 &&
    previousToken !== undefined &&
    pos0in(previousToken.pos & POS0, PREDICATE_AUX_BITS);
  if (predicateNominalizer && options.previousPredicateAttributivePlan === null) {
    return null;
  }
  const possessive = toiuCarrier || predicateNominalizer
    ? []
    : possessivePrefixActions(options, previousToken);
  if (possessive === null) {
    return null;
  }
  const { matched, consumed } = matchedResult;
  const [polite, past, connective, additiveMo, conditionalNara, auxTokens] = matched;
  const modalResult = connective
    ? null
    : cursor.lookahead(1 + consumed, c => {
      const base = c.pos;
      const modal = detectKamoShirenaiAfterChain(c);
      return modal === null ? null : { modal, consumed: c.pos - base };
    });
  const modal = modalResult?.modal ?? null;
  const modalConsumed = modalResult?.consumed ?? 0;
  const followKind = connective || conditionalNara
    ? null
    : cursor.lookahead(1 + consumed + modalConsumed, classifyFollowConnective);
  const followConsumed = followKind === null ? 0 : 1;
  const questionIdx = cursor.pos + 1 + consumed + modalConsumed + followConsumed;
  const question = followKind === null && terminalQuestionKaRelationAt(cursor.tokens, questionIdx, { lookups: options.lookups }) !== null;
  let casual: string;
  const renderPlan = pronominalNoCopulaNegationSuffixPlan({
    polite,
    past,
    connective,
    additiveMo,
    conditionalNara,
    question,
    auxTokens,
    followKind,
    ...(modal === null ? {} : {
      modalKind: "kamo_shirenai",
      modalPolite: modal[0],
      modalPast: modal[1]
    })
  });
  if (connective) {
    casual = additiveMo ? "것도 아니고" : "거 아니고";
  } else if (additiveMo) {
    casual = past ? "것도 아니었어" : "것도 아니야";
  } else {
    casual = past ? `거 아니었${polite ? "어요" : "어"}` : `거 아니${polite ? "에요" : "야"}`;
  }
  return {
    kind: "copula_negative",
    consumed: 1 + consumed + modalConsumed + followConsumed,
    actions: [
      ...(predicateNominalizer ? [{
        kind: "rewrite_previous" as const,
        tokenIndex: options.previousPredicateUnitTokenIndex ?? cursor.pos - 1,
        renderPlan: options.previousPredicateAttributivePlan!,
        rule: "NO-PRONOMINAL-PREDICATE",
      }] : []),
      ...possessive,
      appendContent(cursor.pos + 1, consumed + modalConsumed + followConsumed, modal === null ? casual : "", {
        attachLeft: true,
        renderPlan
      })
    ]
  };
}

function previousClosesToiuAttributive(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const iuIdx = previousNonSpaceIndex(cursor.tokens, cursor.pos);
  if (iuIdx === null) {
    return false;
  }
  const markerIdx = previousNonSpaceIndex(cursor.tokens, iuIdx);
  if (markerIdx === null) {
    return false;
  }
  return toiuAttributiveTailEnd(cursor.tokens, markerIdx, cursor.end) === iuIdx + 1;
}

function tryPronominalNoCopula(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  if (cursor.pos === 0 || cursor.pos >= cursor.end) {
    return null;
  }
  const toiuCarrier = previousClosesToiuAttributive(cursor);
  const isJuntaiParticle = token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    (token.pos & POS1) === 準体助詞;
  const isNoMarker = pronominalNoMarkerRelationForToken(token, cursor.pos, {
    requirement: "copula_tail",
    acceptedSurfaces: ["の"],
    consumers: ["pronominal_no_dispatch"]
  }) !== null;
  if (!isNoMarker && !(toiuCarrier && isJuntaiParticle)) {
    return null;
  }
  if (toiuCarrier && cursor.lookahead(1, c => matchCopulaNegation(c) ?? null) !== null) {
    return null;
  }
  const previousToken = cursor.tokens[cursor.pos - 1];
  if (!toiuCarrier) {
    if (
      previousToken === undefined ||
      (
        (previousToken.pos & POS0) !== 名詞 &&
        (previousToken.pos & POS0) !== 代名詞 &&
        (previousToken.pos & POS0) !== 連体詞
      )
    ) {
      return null;
    }
  }
  const copulaAuxResult = cursor.lookahead(1, c => {
    const base = c.pos;
    const auxTokens = collectAuxTokens(c);
    return { auxTokens, consumed: c.pos - base };
  });
  const copulaAux = copulaAuxResult.auxTokens;
  if (!cursor.lookahead(1, copulaAuxStartsAt)) {
    return null;
  }
  const possessive = toiuCarrier ? [] : possessivePrefixActions(options, previousToken);
  if (possessive === null) {
    return null;
  }
  const features = auxExtractFeatures(copulaAux, { lookups: options.lookups });
  const connResult = cursor.lookahead(1 + copulaAuxResult.consumed, c => {
    const base = c.pos;
    const connective = trailingCopulaConnectiveTail(c, options.lookups);
    return { connective, consumed: c.pos - base };
  });
  const connective = connResult.connective;
  const casual = connective === null
    ? nounCopula("거", features, false, options.lookups).text
    : nounCopulaConnective("거", connective, features.past);
  const connConsumed = copulaAuxResult.consumed + connResult.consumed;
  return {
    kind: "copula",
    consumed: 1 + connConsumed,
    actions: [
      ...possessive,
      appendContent(cursor.pos + 1, connConsumed, casual, {
        renderPlan: {
          kind: "copulaPredicate",
          polarity: "affirmative",
          base: pronominalNoNominalPlan(),
          auxTokens: copulaAux,
          connective
        }
      })
    ]
  };
}

const PRONOMINAL_NO_PROFILES: readonly HeadProfile<PronominalNoDispatchOptions, PronominalNoBuildPayload>[] = [
  {
    id: "pronominal_no_particle",
    owner: "nominal_head",
    traceKind: "pronominal_no_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_particle_marker",
      kind: "nominal_frame",
      surfaces: ["N/Pのを", "N/Pのが", "N/Pのは", "N/Pのも", "N/Pのに", "N/Pので", "N/Pのと"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_particle_marker"],
    tryBuild: tryPronominalNoParticle
  },
  {
    id: "pronominal_no_bare_adnominal",
    owner: "nominal_head",
    traceKind: "pronominal_no_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_bare_adnominal_marker",
      kind: "attributive",
      surfaces: ["連体詞の"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_bare_adnominal_marker"],
    tryBuild: tryPronominalNoBareAdnominal
  },
  {
    id: "pronominal_no_copula_negative",
    owner: "nominal_head",
    traceKind: "pronominal_no_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_copula_negative_marker",
      kind: "scope_bridge",
      surfaces: ["Nのではない", "Nのでもない", "Nのじゃない"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_copula_negative_marker"],
    tryBuild: tryPronominalNoCopulaNegative
  },
  {
    id: "pronominal_no_demo",
    owner: "nominal_head",
    traceKind: "pronominal_no_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_demo_marker",
      kind: "scope_bridge",
      surfaces: ["Nのでも"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_demo_marker"],
    tryBuild: tryPronominalNoDemo
  },
  {
    id: "pronominal_no_copula",
    owner: "nominal_head",
    traceKind: "pronominal_no_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_copula_marker",
      kind: "terminal",
      surfaces: ["Nのだ", "Nのです", "…というのだ", "…というんです"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_copula_marker"],
    tryBuild: tryPronominalNoCopula
  }
] as const;

const PRONOMINAL_NO_ENGINE = defineHeadedParserEngine({
  id: "pronominal_no_dispatch",
  profiles: PRONOMINAL_NO_PROFILES
});

function pronominalNoDispatchResult(
  decision: HeadProfileArbitrationDecision<PronominalNoBuildPayload>
): PronominalNoDispatchResult | null {
  const selection = headProfileDispatchSelection(decision);
  if (selection === null) {
    return null;
  }
  return {
    ...selection.match.result,
    ...selection.metadata
  };
}

export function describePronominalNoDispatchProfiles(): readonly HeadProfileDescriptor[] {
  return PRONOMINAL_NO_ENGINE.describe();
}

export async function tryBuildPronominalNoDispatch(options: PronominalNoDispatchOptions): Promise<PronominalNoDispatchResult | null> {
  return pronominalNoDispatchResult(await PRONOMINAL_NO_ENGINE.arbitrate(options));
}

function tryPronominalNoAuxDe(options: PronominalNoDispatchOptions): PronominalNoBuildPayload | null {
  const cursor = options.cursor;
  const token = cursor.tokens[cursor.pos];
  if (token === undefined || cursor.pos >= cursor.end || !pronominalNoCopulaDeFollows(token)) {
    return null;
  }
  if (!options.previousIsPronominalNominal) {
    return null;
  }
  if (cursor.pos + 1 < cursor.end && ((cursor.tokens[cursor.pos + 1]?.pos ?? 0) & POS0) === 助詞 && cursor.tokens[cursor.pos + 1]?.surface === "も") {
    return {
      kind: "aux_de",
      consumed: 2,
      actions: [appendFunctional(cursor.pos, 2, "", {
        functionalKind: FunctionalKind.MULTI_TOKEN,
        allomorphKey: "이라도/라도"
      })]
    };
  }
  return {
    kind: "aux_de",
    consumed: 1,
    actions: [appendFunctional(cursor.pos, 1, "", {
      functionalKind: FunctionalKind.CONTEXTUAL,
      allomorphKey: "으로/로"
    })]
  };
}

const PRONOMINAL_NO_AUX_DE_PROFILES: readonly HeadProfile<PronominalNoDispatchOptions, PronominalNoBuildPayload>[] = [
  {
    id: "pronominal_no_aux_de",
    owner: "nominal_head",
    traceKind: "pronominal_no_aux_de_dispatch",
    continuationCapabilities: [{
      id: "pronominal_no_aux_de_marker",
      kind: "case_frame",
      surfaces: ["N/Pので", "N/Pでも"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["pronominal_no_aux_de_marker"],
    tryBuild: tryPronominalNoAuxDe
  }
] as const;

const PRONOMINAL_NO_AUX_DE_ENGINE = defineHeadedParserEngine({
  id: "pronominal_no_aux_de_dispatch",
  profiles: PRONOMINAL_NO_AUX_DE_PROFILES
});

export function describePronominalNoAuxDeDispatchProfiles(): readonly HeadProfileDescriptor[] {
  return PRONOMINAL_NO_AUX_DE_ENGINE.describe();
}

export async function tryBuildPronominalNoAuxDeDispatch(options: PronominalNoDispatchOptions): Promise<PronominalNoDispatchResult | null> {
  return pronominalNoDispatchResult(await PRONOMINAL_NO_AUX_DE_ENGINE.arbitrate(options));
}
