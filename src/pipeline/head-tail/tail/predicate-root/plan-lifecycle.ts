import type { ClauseLayout } from "../../../clause-layout/index.js";
import type { CommitmentSpan } from "../../../deferred-commitment.js";
import {
  attachTailChainRenderPlanLayout,
  finalizeTailChainRenderPlanWarnings,
  hydrateTailChainRenderPlanPeerClauses,
  type ClauseRoleBearingPlan
} from "../../lifecycle/plan-context.js";
import type { HeadedPlanCarrier, HeadedPlanLifecycleHook } from "../../lifecycle/hooks.js";
import { hasClauseRole, isNominalHeadTailChainRenderPlan, isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../../../types/render-plan.js";
import type { HeadNounRequiredComplement, HeadNounRequiredComplementForm, LookupTables } from "../../../lookup-tables.js";
import { PredicateArgumentView } from "../../candidate/semantic-classifiers.js";
import { enumerateClausePhrasesAfter, enumerateClausePhrasesBefore, type ClausePhraseItem } from "../../../clause-layout/phrase-enumeration.js";
import { isIAdjectivePredicateToken, isNaAdjCapable } from "../../../../types/pos.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { isAdverbialMannerNounHead } from "./classifiers/tokens.js";
import { contextGrammarFromContentSpan } from "./commitment-bridge.js";
import type { AdnominalEnding, AuxLayerNode, AuxOpNode, HeadRequiredComplement, OpSource } from "./grammar.js";
import type { PredicateHeadTailChainRenderPlan } from "../../lifecycle/head-tail-render-plan.js";
import { tailRootHasConditionalCompactQuoteMannerShape } from "./mid-chain-connective-license.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "./stem-candidate-identity.js";
import { classifyTemporalIntervalHeadVariant } from "./temporal-interval-head.js";
import { layerFinalScopeCarriesSourcePast } from "./inspect.js";

export function tailParserHeadedPlanLifecycleHooks(): readonly HeadedPlanLifecycleHook[] {
  return [
    {
      id: "predicate_tail_layout_context",
      owner: "predicate_tail",
      contentOrder: 10,
      assemblyOrder: 5,
      description: "",
      runContent: (context) => attachTailChainLayout(context.spans, context.layout, context.lookups, context.numeric),
      runAssembly: (context) => attachTailChainRenderPlanLayout(
        clauseRoleBearingPlans(context.units),
        context.layout
      )
    },
    {
      id: "predicate_tail_temporal_interval_variant",
      owner: "predicate_tail",
      contentOrder: 25,
      description: "",
      runContent: (context) => hydrateTemporalIntervalVariants(context.spans, context.lookups)
    },
    {
      id: "predicate_tail_commitment_grammar",
      owner: "predicate_tail",
      contentOrder: 50,
      description: "",
      runContent: (context) => syncTailChainCommitmentGrammar(context.spans)
    },
    {
      id: "predicate_tail_conditional_wish_manner_host",
      owner: "predicate_tail",
      contentOrder: 45,
      description: "",
      runContent: (context) => hydrateConditionalWishMannerHosts(context.spans, context.layout, context.lookups)
    },
    {
      id: "predicate_tail_head_required_complement",
      owner: "predicate_tail",
      contentOrder: 65,
      description: "",
      runContent: (context) => hydrateHeadRequiredComplements(
        context.tokens,
        context.contentMap,
        context.layout,
        context.lookups
      )
    },
    {
      id: "predicate_tail_peer_clauses",
      owner: "predicate_tail",
      contentOrder: 60,
      assemblyOrder: 30,
      description: "",
      runContent: (context) => hydrateTailChainPeerClauses(context.spans, context.layout, context.tokens),
      runAssembly: (context) => hydrateTailChainRenderPlanPeerClauses(
        clauseRoleBearingPlans(context.units),
        context.layout,
        context.tokens
      )
    },
    {
      id: "predicate_tail_warning_finalization",
      owner: "predicate_tail",
      contentOrder: 70,
      description: "",
      runContent: (context) => finalizeTailChainWarnings(context.spans, context.lookups, context.numeric)
    }
  ];
}

export function hydrateConditionalWishMannerHosts(
  spans: Iterable<CommitmentSpan>,
  layout: ClauseLayout,
  lookups: LookupTables,
): void {
  const allSpans = [...spans];
  const spansByStart = new Map(allSpans.map((span) => [span.start, span] as const));
  for (const span of allSpans) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
      continue;
    }
    const layer = plan.realization.root.tail;
    const payload = layer.terminalPayload;
    if (payload?.kind !== "attributiveBoundary") {
      continue;
    }
    const candidate = tailRootHasConditionalCompactQuoteMannerShape(plan.realization.root) &&
      isAdverbialMannerNounHead(payload.head, lookups.ADVERBIAL_MODIFIER_MANNER_NOUNS);
    if (!candidate) {
      clearConditionalWishMannerHostKind(plan);
      continue;
    }
    const ownerIdx = layout.predicateOfAdverbialAdjunct(payload.head.tokenIdx);
    const ownerPlan = ownerIdx === undefined ? null : spansByStart.get(ownerIdx)?.renderPlan ?? null;
    const hostEntries = isPredicateHeadTailChainRenderPlan(ownerPlan) && ownerPlan.realization.root.tail.kind === "auxLayer"
      ? ownerPlan.realization.root.tail.stem.semanticAnchors.flatMap((anchor) => {
        const ownerStem = ownerPlan.realization.root.tail.kind === "auxLayer"
          ? ownerPlan.realization.root.tail.stem
          : null;
        const token = ownerStem?.source.tokens[anchor];
        const form = token?.dictionaryForm || token?.surface || "";
        const entry = ownerStem?.sourcePredicateShape === "sahen_verbalization"
          ? lookups.QUOTE_HOST_REGISTRY.entry("noun_suru", form)
          : lookups.QUOTE_HOST_REGISTRY.entry("direct", form);
        return entry === undefined ? [] : [entry];
      })
      : ownerPlan?.kind === "attributive"
        ? [lookups.QUOTE_HOST_REGISTRY.entry(
          "direct",
          ownerPlan.contentToken.dictionaryForm || ownerPlan.contentToken.surface,
        )].filter((entry) => entry !== undefined)
        : [];
    const hostKind = hostEntries.map((entry) => entry.kind)
      .find((kind): kind is "thought" | "wish" => kind === "thought" || kind === "wish");
    if (hostKind === undefined) {
      clearConditionalWishMannerHostKind(plan);
      continue;
    }
    plan.realization = {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: {
          ...layer,
          terminalPayload: { ...payload, conditionalWishMannerHostKind: hostKind },
        },
      },
    };
  }
}

export function hydrateTemporalIntervalVariants(
  spans: Iterable<CommitmentSpan>,
  lookups: LookupTables,
): void {
  for (const span of spans) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
      continue;
    }
    const layer = plan.realization.root.tail;
    const payload = layer.terminalPayload;
    if (payload?.kind !== "attributiveBoundary") {
      continue;
    }
    const variant = classifyTemporalIntervalHeadVariant(layer, payload, lookups);
    if ((variant ?? undefined) === payload.temporalIntervalVariant) {
      continue;
    }
    const { temporalIntervalVariant: _previous, ...rest } = payload;
    plan.realization = {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: {
          ...layer,
          terminalPayload: variant === null ? rest : { ...rest, temporalIntervalVariant: variant },
        },
      },
    };
  }
}

export function hydrateHeadRequiredComplements(
  tokens: readonly RuntimeHaruToken[],
  contentMap: ReadonlyMap<number, CommitmentSpan>,
  layout: ClauseLayout,
  lookups: LookupTables,
): void {
  const required = lookups.HEAD_NOUN_REQUIRED_COMPLEMENTS;
  for (const span of contentMap.values()) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan) || plan.realization.root.tail.kind !== "auxLayer") {
      continue;
    }
    const layer = plan.realization.root.tail;
    const payload = layer.terminalPayload;
    if (payload?.kind !== "attributiveBoundary") {
      continue;
    }
    if (payload.headRequiredComplement?.kind === "nominal_ki") {
      continue;
    }
    const headLemma = headNounKoreanRealization(contentMap.get(payload.head.tokenIdx)?.renderPlan);
    const requirement = headLemma === null ? undefined : required.get(headLemma);
    const form = requirement !== undefined &&
      (requirement.sourceHeads.has(payload.head.dictionaryForm) || requirement.sourceHeads.has(payload.head.surface)) &&
      !headReadsAsDurationEntity(plan, payload.head.tokenIdx, requirement, tokens, layout, lookups)
      ? requirement.form
      : undefined;
    const complement = form === undefined ? null : headRequiredComplementOf(form);
    if (
      form === undefined ||
      complement === null ||
      (form.kind === "nominal_ki" && form.nonPastOnly && layerFinalScopeCarriesSourcePast(layer))
    ) {
      clearHeadRequiredComplement(plan);
      continue;
    }
    const constrained = form.kind === "nominal_ki" ? nominalComplementConstrainedLayer(layer, form) : layer;
    plan.realization = {
      ...plan.realization,
      root: {
        ...plan.realization.root,
        tail: {
          ...constrained,
          terminalPayload: { ...payload, headRequiredComplement: complement },
        },
      },
    };
  }
}

function headRequiredComplementOf(form: HeadNounRequiredComplementForm): HeadRequiredComplement | null {
  if (form.kind === "nominal_ki") {
    return { kind: "nominal_ki" };
  }
  return isAdnominalEnding(form.ending) ? { kind: "adnominal", ending: form.ending } : null;
}


function nominalComplementConstrainedLayer(
  layer: AuxLayerNode,
  form: Extract<HeadNounRequiredComplementForm, { readonly kind: "nominal_ki" }>,
): AuxLayerNode {
  const last: AuxOpNode | undefined = layer.ops[layer.ops.length - 1];
  if (!form.expletiveNegation || last?.kind !== "negation") {
    return layer;
  }
  return {
    ...layer,
    ops: layer.ops.slice(0, -1),
    consumedSource: mergedOpSources([layer.consumedSource, last.source]),
  };
}

function mergedOpSources(sources: readonly (OpSource | undefined)[]): OpSource {
  const byIndex = new Map<number, OpSource["tokens"][number]>();
  for (const source of sources) {
    if (source === undefined) continue;
    source.tokenIndices.forEach((tokenIndex, position) => {
      const token = source.tokens[position];
      if (token !== undefined) byIndex.set(tokenIndex, token);
    });
  }
  const entries = [...byIndex.entries()].sort(([left], [right]) => left - right);
  return {
    tokens: entries.map(([, token]) => token),
    tokenIndices: entries.map(([tokenIndex]) => tokenIndex),
  };
}

function headReadsAsDurationEntity(
  plan: PredicateHeadTailChainRenderPlan,
  headIdx: number,
  requirement: HeadNounRequiredComplement,
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
): boolean {
  if (!hasClauseRole(plan)) {
    return false;
  }
  const predicateIdx = plan.clauseRole.predicateTokenIdx;
  const predicateToken = tokens[predicateIdx];
  if (predicateToken === undefined) {
    return false;
  }
  if (headIsDemonstrativeCoModified(headIdx, requirement, tokens, layout, lookups)) {
    return true;
  }
  if (new PredicateArgumentView(tokens, predicateIdx, { layout, lookups }).arguments().length > 0) {
    return false;
  }
  const lemma = predicateToken.dictionaryForm.length > 0 ? predicateToken.dictionaryForm : predicateToken.surface;
  if (requirement.bareEntityModifierSources.has(lemma)) {
    return true;
  }
  return requirement.entityDurationMatrixPredicates.size > 0 &&
    (isIAdjectivePredicateToken(predicateToken) || isNaAdjCapable(predicateToken)) &&
    headIsDurationMatrixArgument(headIdx, requirement, tokens, layout);
}

function headIsDurationMatrixArgument(
  headIdx: number,
  requirement: HeadNounRequiredComplement,
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
): boolean {
  const headPhrase = firstPhraseItemAt(layout, tokens, headIdx);
  if (headPhrase?.headIdx !== headIdx || headPhrase.markerParticleIdx === null) {
    return false;
  }
  for (let idx = headPhrase.markerParticleIdx; idx < headPhrase.span.endExclusive; idx += 1) {
    const marker = tokens[idx];
    if (marker === undefined || (marker.surface !== "が" && marker.surface !== "を")) {
      continue;
    }
    const ownerIdx = layout.ownerPredicateOfParticle(idx);
    const owner = ownerIdx === undefined ? undefined : tokens[ownerIdx];
    if (owner === undefined) {
      continue;
    }
    const ownerLemma = owner.dictionaryForm.length > 0 ? owner.dictionaryForm : owner.surface;
    if (requirement.entityDurationMatrixPredicates.has(ownerLemma)) {
      return true;
    }
  }
  return false;
}

function headIsDemonstrativeCoModified(
  headIdx: number,
  requirement: HeadNounRequiredComplement,
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
): boolean {
  if (!requirement.demonstrativeCoModifierBlock) {
    return false;
  }
  for (const item of enumerateClausePhrasesBefore(layout, tokens, headIdx)) {
    if (item.kind === "nominal" || item.kind === "punctuation_weak" ||
      item.kind === "opaque_span" || item.kind === "marker_particle") {
      return false;
    }
    if (item.kind !== "adverbial") {
      continue;
    }
    const modifier = tokens[item.headIdx];
    if (modifier === undefined) {
      return false;
    }
    const lemma = modifier.dictionaryForm.length > 0 ? modifier.dictionaryForm : modifier.surface;
    return lookups.DEMONSTRATIVE_ADNOMINALS.has(lemma) ||
      lookups.DEMONSTRATIVE_ADNOMINALS.has(modifier.surface);
  }
  return false;
}

function firstPhraseItemAt(
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  headIdx: number,
): ClausePhraseItem | null {
  for (const item of enumerateClausePhrasesAfter(layout, tokens, headIdx - 1)) {
    return item;
  }
  return null;
}

function headNounKoreanRealization(plan: RenderPlan | null | undefined): string | null {
  if (plan === null || plan === undefined) {
    return null;
  }
  if (plan.kind === "lemma") {
    return plan.koreanLemma;
  }
  if (isNominalHeadTailChainRenderPlan(plan)) {
    const realization = plan.realization;
    if (realization.owner.kind !== "phrase_owner" || realization.root.kind !== "nominalPhrase") {
      return null;
    }
    const hint = realization.root.head.allomorphHint;
    if (hint?.canonicalKorean !== undefined && hint.canonicalKorean.length > 0) {
      return hint.canonicalKorean;
    }
    return hint?.korean !== undefined && hint.korean.length > 0 ? hint.korean : null;
  }
  if (isPredicateHeadTailChainRenderPlan(plan)) {
    const tail = plan.realization.root.tail;
    if (tail.kind !== "auxLayer") {
      return null;
    }
    if (tail.stem.kind === "noun") {
      return tail.stem.lemma;
    }
    if (tail.stem.kind === "candidateSet" && tail.stem.committedSense !== undefined) {
      const committedSense = tail.stem.committedSense;
      const winner = tail.stem.candidates.find((candidate) =>
        stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), committedSense)
      );
      return winner?.lemma ?? null;
    }
  }
  return null;
}

function isAdnominalEnding(value: string): value is AdnominalEnding {
  return value === "ㄴ/는" || value === "ㄴ/은" || value === "ㄹ/을";
}

function clearHeadRequiredComplement(plan: PredicateHeadTailChainRenderPlan): void {
  const tail = plan.realization.root.tail;
  if (tail.kind !== "auxLayer" || tail.terminalPayload?.kind !== "attributiveBoundary") {
    return;
  }
  const payload = tail.terminalPayload;
  if (payload.headRequiredComplement === undefined) {
    return;
  }
  const { headRequiredComplement: _discarded, ...clearedPayload } = payload;
  plan.realization = {
    ...plan.realization,
    root: {
      ...plan.realization.root,
      tail: { ...tail, terminalPayload: clearedPayload },
    },
  };
}

function clearConditionalWishMannerHostKind(plan: PredicateHeadTailChainRenderPlan): void {
  const tail = plan.realization.root.tail;
  if (tail.kind !== "auxLayer" || tail.terminalPayload?.kind !== "attributiveBoundary") {
    return;
  }
  const payload = tail.terminalPayload;
  if (payload.conditionalWishMannerHostKind === undefined) {
    return;
  }
  const { conditionalWishMannerHostKind: _discarded, ...clearedPayload } = payload;
  plan.realization = {
    ...plan.realization,
    root: {
      ...plan.realization.root,
      tail: { ...tail, terminalPayload: clearedPayload },
    },
  };
}

export function syncTailChainCommitmentGrammar(spans: Iterable<CommitmentSpan>): void {
  for (const span of spans) {
    const plan = span.renderPlan;
    if (!isPredicateHeadTailChainRenderPlan(plan)) {
      continue;
    }
    plan.realization = {
      ...plan.realization,
      commitmentGrammar: contextGrammarFromContentSpan(span)
    };
  }
}

export function attachTailChainLayout(spans: Iterable<CommitmentSpan>, layout: ClauseLayout, _lookups: LookupTables, _numeric: NumericTables): void {
  const plans = clauseRoleBearingPlans(spans);
  attachTailChainRenderPlanLayout(plans, layout);
}

export function finalizeTailChainWarnings(spans: Iterable<CommitmentSpan>, lookups: LookupTables, numeric: NumericTables): void {
  finalizeTailChainRenderPlanWarnings(tailChainPlans(spans), lookups, numeric);
}

export function hydrateTailChainPeerClauses(
  spans: Iterable<CommitmentSpan>,
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[]
): void {
  hydrateTailChainRenderPlanPeerClauses(clauseRoleBearingPlans(spans), layout, tokens);
}

function tailChainPlans(spans: Iterable<CommitmentSpan>): PredicateHeadTailChainRenderPlan[] {
  const plans: PredicateHeadTailChainRenderPlan[] = [];
  for (const span of spans) {
    const plan = span.renderPlan;
    if (isPredicateHeadTailChainRenderPlan(plan)) {
      plans.push(plan);
    }
  }
  return plans;
}

function clauseRoleBearingPlans(carriers: Iterable<HeadedPlanCarrier>): ClauseRoleBearingPlan[] {
  const plans: ClauseRoleBearingPlan[] = [];
  const seen = new Set<ClauseRoleBearingPlan>();
  for (const carrier of carriers) {
    const plan = carrier.renderPlan;
    if (hasClauseRole(plan) && !seen.has(plan)) {
      seen.add(plan);
      plans.push(plan);
    }
  }
  return plans;
}
