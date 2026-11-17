import type {
  AspectKind,
  AuxLayerNode,
  BenefactiveAspectOp,
  AuxOpNode,
  HeadProjectionKind,
  KoreanRealizationCategory,
  MiseruAspectOp,
  NegationOp,
  OpSource,
  PostverbAuxiliaryOp,
  SimpleAspectOp,
  StemMood,
  StemNode,
  TailNode,
  TailRoot,
  VoiceOp
} from "./grammar.js";
import { isKaFamilyQuestionSfpEffect, koreanRealizationCategoryForProjectionKind } from "./grammar.js";
import { stemCandidateIdentitiesEqual } from "./stem-candidate-identity.js";
import { derivationalSuffixProfileById, type DerivationalSuffixHostCategory } from "./derivational-suffix-table.js";
import {
  POS0,
  POS5A,
  命令形_,
  isClauseClosingInflection,
  isVerbPredicateToken,
  isVoicedTeFormHostToken,
  isVolitionalInflection,
  stemFormName
} from "../../../../types/pos.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { AuxToken } from "../../../../generator/aux-map.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { tailOpsPreferTameReason } from "./tame-reason-evidence.js";
import { isHeadOp, isSimpleAspectOpKind } from "./operator-head.js";

export type RequestAspectOp = Extract<
  AuxLayerNode["ops"][number],
  { readonly kind: "aspect"; readonly aspect: "te_kudasai" | "te_kure_tanomu" }
>;

export function auxLayerConsumedSourceTokens(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"]
): ReadonlyMap<number, RuntimeHaruToken> {
  const byIndex = new Map<number, RuntimeHaruToken>();
  const collect = (source: OpSource | undefined): void => {
    if (source === undefined) return;
    source.tokenIndices.forEach((tokenIndex, position) => {
      const token = source.tokens[position];
      if (token === undefined) return;
      byIndex.set(tokenIndex, token);
    });
  };
  collect(layer.stem.source);
  for (const op of layer.ops) collect(op.source);
  if (layer.terminalPayload !== undefined && layer.terminalPayload.kind !== "attributiveBoundary") {
    collect(layer.terminalPayload.source);
  }
  if (layer.terminalPayload?.kind === "attributiveBoundary") {
    collect(layer.terminalPayload.explicitAdnominalMarker);
  }
  collect(layer.consumedSource);
  if (sfp !== null) collect(sfp.source);
  return byIndex;
}

export function auxLayerConsumedSourceSequence(
  layer: AuxLayerNode,
  sfp: TailRoot["sfp"]
): readonly (readonly [number, RuntimeHaruToken])[] {
  return [...auxLayerConsumedSourceTokens(layer, sfp).entries()]
    .sort(([left], [right]) => left - right);
}

export function absorbedPassiveAuxStemMood(ops: readonly AuxOpNode[]): StemMood | undefined {
  const passiveOp = ops.find((op): op is VoiceOp =>
    op.kind === "voice" && (op.voice === "passive" || op.voice === "causative_passive")
  );
  const lastSourceToken = passiveOp?.source.tokens[passiveOp.source.tokens.length - 1];
  return lastSourceToken !== undefined && isVolitionalInflection(lastSourceToken.pos)
    ? "volitional"
    : undefined;
}

export function firstAuxLayer(node: TailNode): AuxLayerNode | null {
  return node.kind === "auxLayer" ? node : firstAuxLayer(node.inner);
}

export function candidateBearingAuxLayer(layer: AuxLayerNode): AuxLayerNode {
  const base = layer.stem.derivationalBase;
  if (base === undefined) {
    return layer;
  }
  const hostLayer = firstAuxLayer(base.host.tail);
  return hostLayer === null ? layer : { ...hostLayer, ops: [...hostLayer.ops, base.suffix] };
}

export function tailRootClosesWithAttributiveTerminal(root: TailRoot): boolean {
  return firstAuxLayer(root.tail)?.terminal === "attributive";
}

export function tailRootExplicitAdnominalMarkerIndices(root: TailRoot): readonly number[] {
  const layer = firstAuxLayer(root.tail);
  const payload = layer?.terminalPayload;
  return layer?.terminal === "attributive" && payload?.kind === "attributiveBoundary"
    ? payload.explicitAdnominalMarker?.tokenIndices ?? []
    : [];
}

export function tailRootFirstLayerOpConsumesToken(root: TailRoot, tokenIdx: number): boolean {
  const layer = firstAuxLayer(root.tail);
  return layer?.ops.some((op) => op.source.tokenIndices.includes(tokenIdx)) === true;
}

export function tailRootClosesWithOvertNominalizerTerminal(root: TailRoot): boolean {
  const layer = firstAuxLayer(root.tail);
  return layer?.terminal === "nominalized" &&
    layer.terminalPayload?.kind === "nominalized" &&
    (layer.terminalPayload.nominalizerSource ?? "overt_no") === "overt_no";
}

export function tailRootClosesWithCopulaAttributive(root: TailRoot): boolean {
  const layer = firstAuxLayer(root.tail);
  return layer?.terminal === "attributive" && layer.ops[0]?.kind === "copula";
}

export function tailRootClosesWithBareKeijoujiAttributive(root: TailRoot): boolean {
  const terminalPayload = firstAuxLayer(root.tail)?.terminalPayload;
  return terminalPayload?.kind === "attributiveBoundary" &&
    terminalPayload.bareKeijoujiDirectAttributive === true;
}

export function tailRootIsStandaloneCopulaNiAdverbialFragment(root: TailRoot): boolean {
  if (
    root.quoteBinding !== "unbound" ||
    root.sfp === null ||
    root.tail.kind !== "auxLayer"
  ) {
    return false;
  }
  const layer = root.tail;
  if (
    layer.terminal !== "renyou_chuushi" ||
    layer.terminalPayload?.kind !== "renyouChuushi" ||
    layer.ops.length !== 1
  ) {
    return false;
  }
  const op = layer.ops[0];
  return op?.kind === "copula" &&
    op.variant === "basic" &&
    op.basicForm === "adverbial_ni" &&
    op.polarity === "affirmative";
}

export function tailRootIsNeutralStandaloneCopulaNiAdverbialFragment(root: TailRoot): boolean {
  return root.sfp?.effect === null &&
    tailRootIsStandaloneCopulaNiAdverbialFragment(root);
}

type CopulaNiAdverbialLemmaPlan = {
  readonly adverbialCopulaNi?: true;
  readonly prefix?: unknown;
  readonly connective?: unknown;
  readonly suffix?: unknown;
  readonly auxTokens?: readonly AuxToken[];
  readonly terminalSfp?: unknown;
};

export function lemmaPlanIsCopulaNiAdverbial(plan: CopulaNiAdverbialLemmaPlan): boolean {
  if (
    plan.adverbialCopulaNi !== true ||
    plan.prefix !== undefined ||
    plan.connective != null ||
    plan.suffix !== undefined ||
    (plan.auxTokens?.length ?? 0) !== 1
  ) {
    return false;
  }
  return true;
}

export function lemmaPlanIsStandaloneCopulaNiAdverbialFragment(
  plan: CopulaNiAdverbialLemmaPlan
): boolean {
  return plan.terminalSfp != null && lemmaPlanIsCopulaNiAdverbial(plan);
}

export function plainNounStemAdverbialLemma(stem: StemNode | undefined): string | null {
  return stem?.kind === "noun" &&
    stem.koreanPrefix === undefined &&
    stem.koreanSuffix === undefined
    ? stem.lemma
    : null;
}

export function stemSupportsProjectionKind(stem: StemNode, projectionKind: HeadProjectionKind): boolean {
  switch (stem.kind) {
    case "verb":
      return projectionKind === "direct_verbal" ||
        projectionKind === "adverbialized_verbal";
    case "adj":
      return projectionKind === "direct_adjectival" ||
        projectionKind === "adverbialized_adjectival";
    case "noun":
      return projectionKind === "direct_nominal";
    case "adverb":
      return projectionKind === "direct_adverbial";
    case "candidateSet": {
      if (stem.committedSenseRealization !== undefined && stem.committedSenseRealization !== null) {
        return stem.committedSenseRealization.projectionKinds.includes(projectionKind);
      }
      return stem.headHypothesis?.candidates.some((candidate) =>
        candidate.status === "admitted" &&
        candidate.headProfile?.capabilities.some((capability) =>
          capability.choices.some((choice) => choice.projectionKind === projectionKind)
        ) === true
      ) === true;
    }
  }
}

export function stemSupportsAnyProjectionKind(stem: StemNode, projectionKinds: readonly HeadProjectionKind[]): boolean {
  return projectionKinds.some((projectionKind) => stemSupportsProjectionKind(stem, projectionKind));
}

export function stemClosesClause(stem: StemNode): boolean {
  return tokenClosesClause(stem.source.tokens.at(-1));
}

export function auxOpClosesClause(op: AuxOpNode): boolean {
  return tokenClosesClause(op.source.tokens.at(-1));
}

export function opsEndWithNegativeCopulaBridgeMarker(ops: readonly AuxOpNode[]): boolean {
  const last = ops.at(-1);
  if (last === undefined) return false;
  if (last.kind === "adjCopulaBridge") return true;
  if (last.kind === "negation") return ops.at(-2)?.kind === "adjCopulaBridge";
  return last.kind === "copula" &&
    last.polarity === "negative" &&
    last.negativeBridgeForm !== undefined;
}

function tokenClosesClause(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  return stemFormName(token.pos) === null || isClauseClosingInflection(token.pos);
}

export function stemSupportsProjectionCategory(
  stem: StemNode,
  category: KoreanRealizationCategory
): boolean {
  switch (stem.kind) {
    case "verb":
      return category === "verbal_predicate";
    case "adj":
      return category === "adjectival_predicate";
    case "noun":
      return category === "nominal";
    case "adverb":
      return category === "adverbial";
    case "candidateSet": {
      if (stem.committedSenseRealization !== undefined && stem.committedSenseRealization !== null) {
        return stem.committedSenseRealization.category === category;
      }
      return stem.headHypothesis?.candidates.some((candidate) =>
        candidate.status === "admitted" &&
        candidate.headProfile?.capabilities.some((capability) =>
          capability.choices.some((choice) =>
            koreanRealizationCategoryForProjectionKind(choice.projectionKind) === category
          )
        ) === true
      ) === true;
    }
  }
}

export function negationOpAdmitsShortForm(negation: NegationOp): boolean {
  return negation.focusParticle === undefined && negation.inability !== true;
}

export function stemSourcePos0(stem: StemNode): number {
  return (stem.source.tokens[stem.conjugationAnchor]?.pos ?? stem.source.tokens[0]?.pos ?? 0) & POS0;
}

export function stemHasSourceVerbalPredicate(stem: StemNode): boolean {
  if (stem.commitment === "suppletive_negation" && stem.sourcePredicateShape !== undefined) {
    return stem.sourcePredicateShape === "verb";
  }
  const token = stem.source.tokens[stem.conjugationAnchor] ?? stem.source.tokens[0];
  return token !== undefined && isVerbPredicateToken(token);
}

export function stemHasSourceVerbalPredicateEvidence(stem: StemNode): boolean {
  return stem.sourcePredicateShape === "verb" || stemHasSourceVerbalPredicate(stem);
}

export function stemHasVoicedTeFormHostEvidence(stem: StemNode): boolean {
  const token = stem.source.tokens[stem.conjugationAnchor] ?? stem.source.tokens[0];
  return token !== undefined && isVoicedTeFormHostToken(token);
}

export function stemHasSahenSourcePredicate(stem: StemNode): boolean {
  return stem.sourcePredicateShape === "sahen_verbalization";
}

export function stemIsAdjectivalSourceWithNominalTarget(stem: StemNode): boolean {
  return stem.kind === "noun" && stem.nominalTargetForVerbalSource === true;
}

export function stemHasAdmittedProjectionCategory(
  stem: StemNode,
  category: KoreanRealizationCategory
): boolean {
  if (stem.kind !== "candidateSet") {
    return stemSupportsProjectionCategory(stem, category);
  }
  if (category === "adjectival_predicate") {
    return stem.headHypothesis?.candidates.some((candidate) =>
      candidate.status === "admitted" && candidate.projectedStemKind === "adj"
    ) === true;
  }
  return stem.headHypothesis?.candidates.some((candidate) =>
    candidate.status === "admitted" &&
    candidate.headProfile?.capabilities.some((capability) =>
      capability.choices.some((choice) =>
        koreanRealizationCategoryForProjectionKind(choice.projectionKind) === category
      )
    ) === true
  ) === true;
}

export function tailRootAdmitsOnlyProjectionCategory(
  root: TailRoot,
  category: KoreanRealizationCategory
): boolean {
  const layer = firstAuxLayer(root.tail);
  if (layer === null) return false;

  const decision = root.headEvidenceDecision;
  if (decision !== undefined) {
    const openChoices = decision.candidates.flatMap((candidate) => {
      const isOpen = decision.candidateOpenSet.some((identity) =>
        stemCandidateIdentitiesEqual(identity, {
          provenance: candidate.provenance,
          projectionOrdinal: candidate.projectionOrdinal
        })
      );
      if (!isOpen) return [];
      return candidate.realizationChoices?.filter((choice) => choice.state !== "rejected") ?? [];
    });
    return openChoices.length > 0 && openChoices.every((choice) => choice.category === category);
  }

  const hypothesis = root.headHypothesis ??
    (layer.stem.kind === "candidateSet" ? layer.stem.headHypothesis : undefined);
  if (hypothesis !== undefined) {
    const admittedCategories = hypothesis.candidates.flatMap((candidate) => {
      if (candidate.status !== "admitted") return [];
      const choices = candidate.headProfile?.capabilities.flatMap((capability) => capability.choices) ?? [];
      if (choices.length > 0) {
        return choices.map((choice) => koreanRealizationCategoryForProjectionKind(choice.projectionKind));
      }
      switch (candidate.projectedStemKind) {
        case "verb": return ["verbal_predicate" as const];
        case "adj": return ["adjectival_predicate" as const];
        case "noun": return ["nominal" as const];
        case "adverb": return ["adverbial" as const];
        case undefined: return [];
      }
    });
    return admittedCategories.length > 0 && admittedCategories.every((item) => item === category);
  }

  return stemSupportsProjectionCategory(layer.stem, category);
}

export function stemSupportsAnyProjectionCategory(
  stem: StemNode,
  categories: readonly KoreanRealizationCategory[]
): boolean {
  return categories.some((category) => stemSupportsProjectionCategory(stem, category));
}

export function opsDeclareNominalHostConstruction(ops: readonly AuxOpNode[]): boolean {
  const first = ops[0];
  return first !== undefined &&
    first.kind === "predicateQuoteCarrier" &&
    first.style === "suru_attributive" &&
    (first.tosuruMode === "treat_as" || first.tosuruMode === "resultative_make");
}

export function auxOpsInTailNode(node: TailNode): readonly AuxOpNode[] {
  if (node.kind === "connective") {
    return [...auxOpsInTailNode(node.inner), ...auxOpsInTailNode(node.outer)];
  }
  return node.ops;
}

export function auxOpsHaveCausativePassiveSequence(ops: readonly AuxOpNode[]): boolean {
  let causativeSeen = false;
  for (const op of ops) {
    if (op.kind !== "voice") {
      continue;
    }
    if (op.voice === "causative_passive") {
      return true;
    }
    if (op.voice === "causative") {
      causativeSeen = true;
    } else if (op.voice === "passive" && causativeSeen) {
      return true;
    }
  }
  return false;
}

export function tailNodeHasCausativePassiveSequence(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasCausativePassiveSequence(node.inner) || tailNodeHasCausativePassiveSequence(node.outer);
  }
  return auxOpsHaveCausativePassiveSequence(node.ops);
}

export function tailRootVoiceOps(root: TailRoot): readonly VoiceOp[] {
  const voices: VoiceOp[] = [];
  visitTailNodeVoiceOps(root.tail, voices);
  return voices;
}

function visitTailNodeVoiceOps(node: TailNode, voices: VoiceOp[]): void {
  if (node.kind === "connective") {
    visitTailNodeVoiceOps(node.inner, voices);
    visitTailNodeVoiceOps(node.outer, voices);
    return;
  }
  for (const op of node.ops) {
    if (op.kind === "voice") {
      voices.push(op);
    }
  }
}

export function tailRootRequestOps(root: TailRoot): readonly RequestAspectOp[] {
  const ops: RequestAspectOp[] = [];
  visitTailNodeRequestOps(root.tail, ops);
  return ops;
}

export function tailRootHasRequestTail(root: TailRoot): boolean {
  return tailRootRequestOps(root).length > 0;
}

export function tailRootQuoteRequestSourceEvidence(root: TailRoot) {
  const ops = auxOpsInTailNode(root.tail);
  const request = ops.findLast(isRequestAspectOp);
  if (request !== undefined) return {
    kind: "benefactive_request" as const,
    politenessEvidence: { polite: request.request.polite, honorific: request.request.honorific },
  };
  const prohibition = ops.findLast((op) => op.kind === "aspect" && op.aspect === "naide_kudasai");
  if (prohibition?.kind === "aspect" && prohibition.aspect === "naide_kudasai" && prohibition.prohibition.requestTail !== "bare") return {
    kind: "benefactive_request" as const,
    politenessEvidence: { polite: prohibition.prohibition.polite, honorific: prohibition.prohibition.requestTail === "kudasai" },
  };
  const layer = firstAuxLayer(root.tail), anchor = layer?.stem.source.tokens[layer.stem.conjugationAnchor];
  return anchor !== undefined && isVerbPredicateToken(anchor) && (anchor.pos & POS5A) === 命令形_
    ? { kind: "directive_request" as const, politenessEvidence: null }
    : null;
}

function visitTailNodeRequestOps(node: TailNode, ops: RequestAspectOp[]): void {
  if (node.kind === "connective") {
    visitTailNodeRequestOps(node.inner, ops);
    visitTailNodeRequestOps(node.outer, ops);
    return;
  }
  for (const op of node.ops) {
    if (isRequestAspectOp(op)) {
      ops.push(op);
    }
  }
}

export function isRequestAspectOp(op: AuxLayerNode["ops"][number]): op is RequestAspectOp {
  return op.kind === "aspect" && (op.aspect === "te_kudasai" || op.aspect === "te_kure_tanomu");
}

export function isCommandAspectOp(
  op: AuxLayerNode["ops"][number]
): boolean {
  return isRequestAspectOp(op) || (op.kind === "aspect" && op.aspect === "naide_kudasai");
}

export function auxOpCarriesCommandIllocution(op: AuxLayerNode["ops"][number]): boolean {
  return isCommandAspectOp(op) ||
    (op.kind === "aspect" && op.terminalMood === "imperative");
}

export type RequestCommandBaseOp =
  | SimpleAspectOp
  | BenefactiveAspectOp
  | MiseruAspectOp
  | PostverbAuxiliaryOp
  | VoiceOp;

export function isRequestCommandBaseOp(op: AuxOpNode): op is RequestCommandBaseOp {
  return (
    (
      op.kind === "aspect" &&
      (isSimpleAspectOpKind(op.aspect) || op.aspect === "te_miseru" || isBenefactiveAspectKind(op.aspect))
    ) ||
    op.kind === "postverbAuxiliary" ||
    op.kind === "voice"
  );
}

export function tailRootHasStateChangeResultTail(root: TailRoot): boolean {
  let found = false;
  const visit = (node: TailNode): void => {
    if (node.kind === "connective") {
      visit(node.inner);
      visit(node.outer);
      return;
    }
    for (const op of node.ops) {
      if (
        op.kind === "postverbAuxiliary" &&
        (op.auxiliary.kind === "state_change" || op.auxiliary.kind === "state_change_potential")
      ) {
        found = true;
      }
    }
  };
  visit(root.tail);
  return found;
}

export function tailRootBenefactiveOps(root: TailRoot): readonly BenefactiveAspectOp[] {
  const ops: BenefactiveAspectOp[] = [];
  visitTailNodeBenefactiveOps(root.tail, ops);
  return ops;
}

function visitTailNodeBenefactiveOps(node: TailNode, ops: BenefactiveAspectOp[]): void {
  if (node.kind === "connective") {
    visitTailNodeBenefactiveOps(node.inner, ops);
    visitTailNodeBenefactiveOps(node.outer, ops);
    return;
  }
  for (const op of node.ops) {
    if (isBenefactiveAspectOp(op)) {
      ops.push(op);
    }
  }
}

export function isBenefactiveAspectOp(op: AuxOpNode): op is BenefactiveAspectOp {
  return op.kind === "aspect" && isBenefactiveAspectKind(op.aspect);
}

export function isBenefactiveAspectKind(aspect: string): aspect is BenefactiveAspectOp["aspect"] {
  switch (aspect) {
    case "te_morau":
    case "te_ageru":
    case "te_kureru":
    case "te_kudasaru":
    case "te_itadaku":
    case "te_moraeru":
    case "te_itadakeru":
      return true;
    default:
      return false;
  }
}

export function auxOpCarriesTypedPoliteness(op: AuxOpNode): boolean {
  if (op.kind === "polite") {
    return true;
  }
  if ("polite" in op && op.polite === true) {
    return true;
  }
  if (op.kind === "postverbAuxiliary" && op.auxiliary.polite === true) {
    return true;
  }
  if (op.kind === "aspect") {
    if ("request" in op && op.request.polite) return true;
    if ("desiderative" in op && op.desiderative.polite) return true;
    if ("prohibition" in op && op.prohibition.polite) return true;
  }
  return false;
}

export function auxChainCarriesConjecture(
  ops: readonly AuxOpNode[],
  stem: AuxLayerNode["stem"]
): boolean {
  return stem.stemMood === "conjectural" ||
    ops.some((op) => op.kind === "conjecture" || (op.kind === "copula" && op.variant === "conjecture"));
}

export function auxOpCarriesTypedNegation(op: AuxOpNode): boolean {
  if (op.kind === "negation") {
    return true;
  }
  return "polarity" in op && op.polarity === "negative";
}

export function tailRootHasQuestionSfp(root: TailRoot): boolean {
  const effect = root.sfp?.effect;
  return isKaFamilyQuestionSfpEffect(effect) ||
    effect === "plain_q" ||
    effect === "polite_q" ||
    effect === "neg_confirm_q" ||
    effect === "neg_invite_q" ||
    effect === "neg_plain_q" ||
    root.sfp?.questionRole !== undefined;
}

export function sfpHasSelfDirectedConjectureRole(sfp: NonNullable<TailRoot["sfp"]>): boolean {
  return isKaFamilyQuestionSfpEffect(sfp.effect) || sfp.effect === "kana" || sfp.conjectureQuestionRole === "self_directed";
}

export function tailPredicateHostPrefersTameReason(options: {
  readonly root: TailRoot;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tameIndex: number;
  readonly lookups: LookupTables;
  readonly adnominal?: boolean;
}): boolean {
  const ops = auxOpsInTailNode(options.root.tail);
  const layer = firstAuxLayer(options.root.tail);
  const stemLemma = layer?.stem.kind === "candidateSet" ? undefined : layer?.stem.lemma;
  return tailOpsPreferTameReason({
    ops,
    tokens: options.tokens,
    tameIndex: options.tameIndex,
    lookups: options.lookups,
    stemLemma,
    negationPolicy: "projection_negation",
    ...(options.adnominal === undefined ? {} : { adnominal: options.adnominal })
  });
}

export function chainFinalOpHostCategory(
  op: AuxOpNode | undefined
): DerivationalSuffixHostCategory | undefined {
  if (op === undefined) {
    return undefined;
  }
  switch (op.kind) {
    case "voice":
      return "verbal_predicate";
    case "aspect":
      return aspectResultHostCategory(op.aspect);
    case "postverbAuxiliary":
      return "verbal_predicate";
    case "desire":
      return op.form === "tagaru" ? "verbal_predicate" : "adjectival_predicate";
    case "negation":
      return "adjectival_predicate";
    case "predicateSuffix": {
      const kind = derivationalSuffixProfileById(op.profileId)?.resultStemKind;
      return kind === "adj" ? "adjectival_predicate" : kind === "verb" ? "verbal_predicate" : undefined;
    }
    default:
      return undefined;
  }
}

export function aspectResultHostCategory(aspect: AspectKind): DerivationalSuffixHostCategory {
  switch (aspect) {
    case "te_hoshii":
      return "adjectival_predicate";
    case "te_iru":
    case "te_aru":
    case "te_iku":
    case "te_kuru":
    case "te_oku":
    case "te_shimau":
    case "te_miru":
    case "te_mawaru":
    case "tsutsu_aru":
    case "te_ageru":
    case "te_kureru":
    case "te_kudasaru":
    case "te_morau":
    case "te_itadaku":
    case "te_moraeru":
    case "te_itadakeru":
    case "te_kudasai":
    case "te_kure_tanomu":
    case "naide_kudasai":
    case "te_miseru":
      return "verbal_predicate";
  }
}

export function layerFinalScopeCarriesSourcePast(layer: AuxLayerNode): boolean {
  let finalScopeStart = 0;
  layer.ops.forEach((op, index) => {
    if (isHeadOp(op)) {
      finalScopeStart = index + 1;
    }
  });
  return layer.ops.slice(finalScopeStart).some((op) =>
    (op.kind === "tense" && op.tense === "past") ||
    (op.kind === "negation" && op.chainPast)
  );
}
