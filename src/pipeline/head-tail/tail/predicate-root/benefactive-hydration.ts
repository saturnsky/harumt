import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { ClauseLayout } from "../../../clause-layout/index.js";
import { buildBenefactiveContext, HonorificLevel, hydrateBenefactiveContextFromLayout, resolveBenefactiveTail } from "../../../semantics/honorific.js";
import { PredicateArgumentView } from "../../candidate/semantic-classifiers.js";
import type {
  AuxLayerNode,
  BenefactiveAspectOp,
  BenefactivePayload,
  TailNode,
  TailRootBase
} from "./grammar.js";
import { isBenefactiveAspectOp } from "./inspect.js";
import { 동사 } from "../../../../types/pos.js";

export function hydrateBenefactivePayloads<Root extends TailRootBase>(
  root: Root,
  options: {
    readonly tokens: readonly RuntimeHaruToken[] | undefined;
    readonly predicateTokenIdx: number | undefined;
    readonly lookups: LookupTables;
    readonly layout: ClauseLayout | null | undefined;
  }
): Root {
  const tokens = options.tokens;
  const predicateTokenIdx = options.predicateTokenIdx;
  if (tokens === undefined || predicateTokenIdx === undefined) {
    return root;
  }
  const tail = hydrateBenefactiveTailNode(root.tail, {
    tokens,
    predicateTokenIdx,
    lookups: options.lookups,
    layout: options.layout
  });
  return tail === root.tail ? root : { ...root, tail };
}

function hydrateBenefactiveTailNode(
  node: TailNode,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly predicateTokenIdx: number;
    readonly lookups: LookupTables;
    readonly layout: ClauseLayout | null | undefined;
  }
): TailNode {
  if (node.kind === "connective") {
    const inner = hydrateBenefactiveAuxLayer(node.inner, options);
    const outer = hydrateBenefactiveTailNode(node.outer, options);
    return inner === node.inner && outer === node.outer ? node : { ...node, inner, outer };
  }
  return hydrateBenefactiveAuxLayer(node, options);
}

function hydrateBenefactiveAuxLayer(
  layer: AuxLayerNode,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly predicateTokenIdx: number;
    readonly lookups: LookupTables;
    readonly layout: ClauseLayout | null | undefined;
  }
): AuxLayerNode {
  let changed = false;
  const ops = layer.ops.map((op) => {
    if (!isBenefactiveAspectOp(op)) {
      return op;
    }
    const hydrated = hydrateBenefactiveAspectOp(op, layer, options);
    if (hydrated !== op) changed = true;
    return hydrated;
  });

  return changed ? { ...layer, ops } : layer;
}

function hydrateBenefactiveAspectOp(
  op: BenefactiveAspectOp,
  layer: AuxLayerNode,
  options: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly predicateTokenIdx: number;
    readonly lookups: LookupTables;
    readonly layout: ClauseLayout | null | undefined;
  }
): BenefactiveAspectOp {
  const patternId = benefactivePatternIdForAspect(op.aspect);
  if (options.layout === undefined || options.layout === null) {
    const ctx = buildBenefactiveContext(options.tokens, options.predicateTokenIdx, patternId, options.lookups);
    const payload: BenefactivePayload = {
      kind: benefactiveKindForPattern(patternId),
      pivot: "unresolved",
      honorific: ctx.honorificLevel === HonorificLevel.RESPECT,
      potential: op.aspect === "te_moraeru" || op.aspect === "te_itadakeru",
      tailLemma: op.benefactive.tailLemma,
      tailIrregular: op.benefactive.tailIrregular,
      tailKoreanPos: op.benefactive.tailKoreanPos,
      lexicalTailAbsorptionKind: op.benefactive.lexicalTailAbsorptionKind,
      agentParticleIdx: null,
      recipientParticleIdx: null,
      needsBenefactivePivot: ctx.needsBenefactivePivot,
      recipientSideHumble: false,
      causativeAgentPolicy: null,
      causativeRenderPolicy: null
    };
    return { ...op, benefactive: payload };
  }

  const ctx = hydrateBenefactiveContextFromLayout(options.tokens, options.predicateTokenIdx, patternId, options.lookups, {
    layout: options.layout,
    connectiveRoles: options.layout.connectiveRoles
  });
  const explicitTailLemma = op.benefactive.tailLemma;
  const [tailLemma, tailIrregular, tailKoreanPos] = explicitTailLemma !== null
    ? [explicitTailLemma, op.benefactive.tailIrregular, op.benefactive.tailKoreanPos ?? 동사] as const
    : resolveBenefactiveTail(
      patternId,
      "주다",
      null,
      동사,
      ctx
    );
  return hydrateBenefactiveOpFromResolvedContext(op, layer, {
    honorific: ctx.honorificLevel === HonorificLevel.RESPECT,
    tailLemma,
    tailIrregular,
    tailKoreanPos,
    agentParticleIdx: ctx.agentParticleIdx,
    recipientParticleIdx: ctx.recipientParticleIdx,
    needsBenefactivePivot: ctx.needsBenefactivePivot,
    recipientSideHumble: ctx.recipientSideHumble,
    hasObjectParticle: hasOwnedObjectParticle(options.tokens, options.predicateTokenIdx, options.layout, options.lookups)
  });
}

export interface ResolvedBenefactiveHydrationContext {
  readonly honorific: boolean;
  readonly tailLemma: string | null;
  readonly tailIrregular: BenefactivePayload["tailIrregular"];
  readonly tailKoreanPos: number | null;
  readonly agentParticleIdx: number | null;
  readonly recipientParticleIdx: number | null;
  readonly needsBenefactivePivot: boolean;
  readonly recipientSideHumble: boolean;
  readonly hasObjectParticle: boolean;
}

export function hydrateBenefactiveOpFromResolvedContext(
  op: BenefactiveAspectOp,
  layer: AuxLayerNode,
  ctx: ResolvedBenefactiveHydrationContext
): BenefactiveAspectOp {
  const kind = benefactiveKindForPattern(benefactivePatternIdForAspect(op.aspect));
  const potential = op.aspect === "te_moraeru" || op.aspect === "te_itadakeru";
  const payload: BenefactivePayload = {
    kind,
    pivot: ctx.agentParticleIdx !== null
      ? "agent_side"
      : (ctx.needsBenefactivePivot ? "speaker_side" : "subject_side"),
    honorific: ctx.honorific,
    potential,
    tailLemma: ctx.tailLemma,
    tailIrregular: ctx.tailIrregular,
    tailKoreanPos: ctx.tailKoreanPos,
    lexicalTailAbsorptionKind: op.benefactive.lexicalTailAbsorptionKind,
    agentParticleIdx: ctx.agentParticleIdx,
    recipientParticleIdx: ctx.recipientParticleIdx,
    needsBenefactivePivot: ctx.needsBenefactivePivot,
    recipientSideHumble: ctx.recipientSideHumble,
    causativeAgentPolicy: inferBenefactiveCausativeAgentPolicy({
      kind,
      potential,
      layer,
      agentParticleIdx: ctx.agentParticleIdx
    }),
    causativeRenderPolicy: inferBenefactiveCausativeRenderPolicy({
      kind,
      potential,
      layer,
      agentParticleIdx: ctx.agentParticleIdx,
      hasObjectParticle: ctx.hasObjectParticle
    })
  };
  return { ...op, benefactive: payload };
}

function inferBenefactiveCausativeAgentPolicy(options: {
  readonly kind: BenefactivePayload["kind"];
  readonly potential: boolean;
  readonly layer: AuxLayerNode;
  readonly agentParticleIdx: number | null;
}): BenefactivePayload["causativeAgentPolicy"] {
  if (options.agentParticleIdx === null) {
    return null;
  }
  if (!layerHasCausativeVoice(options.layer)) {
    return null;
  }
  if (options.kind !== "morau" && options.kind !== "itadaku") {
    return null;
  }
  if (!options.potential && sahenStemPrefersLexicalNiUnderCausativeBenefactive(options.layer)) {
    return "lexical_argument_preferred";
  }
  return "benefactive_agent_subject";
}

function inferBenefactiveCausativeRenderPolicy(options: {
  readonly kind: BenefactivePayload["kind"];
  readonly potential: boolean;
  readonly layer: AuxLayerNode;
  readonly agentParticleIdx: number | null;
  readonly hasObjectParticle: boolean;
}): BenefactivePayload["causativeRenderPolicy"] {
  if (!layerHasCausativeVoice(options.layer)) {
    return null;
  }
  if (options.kind !== "morau" && options.kind !== "itadaku") {
    return null;
  }
  if (options.potential) {
    return null;
  }
  if (!sahenStemPrefersLexicalNiUnderCausativeBenefactive(options.layer)) {
    return null;
  }
  if (options.agentParticleIdx !== null) {
    return "lexical_recipient_humble_action";
  }
  return options.hasObjectParticle
    ? "implicit_permission_sahen_periphrastic"
    : "implicit_permission_sahen_lexical_causative";
}

function layerHasCausativeVoice(layer: AuxLayerNode): boolean {
  return layer.ops.some((op) => op.kind === "voice" && op.voice === "causative");
}

function sahenStemPrefersLexicalNiUnderCausativeBenefactive(layer: AuxLayerNode): boolean {
  if (layer.stem.semanticAnchors.length === 0) {
    return false;
  }
  if (layer.stem.kind === "verb") {
    return layer.stem.conj === "sahen";
  }
  return layer.stem.kind === "candidateSet" &&
    layer.stem.candidates.some((candidate) => candidate.conj === "sahen");
}

function hasOwnedObjectParticle(
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  layout: ClauseLayout,
  lookups: LookupTables
): boolean {
  return new PredicateArgumentView(tokens, predicateTokenIdx, { lookups, layout })
    .arguments()
    .some((arg) => !arg.borrowed && arg.particle.surface === "を");
}

function benefactivePatternIdForAspect(aspect: BenefactiveAspectOp["aspect"]): BenefactiveAspectOp["aspect"] {
  switch (aspect) {
    case "te_morau":
      return "te_morau";
    case "te_ageru":
      return "te_ageru";
    case "te_kureru":
      return "te_kureru";
    case "te_kudasaru":
      return "te_kudasaru";
    case "te_itadaku":
      return "te_itadaku";
    case "te_moraeru":
      return "te_moraeru";
    case "te_itadakeru":
      return "te_itadakeru";
  }
}

function benefactiveKindForPattern(patternId: ReturnType<typeof benefactivePatternIdForAspect>): BenefactivePayload["kind"] {
  switch (patternId) {
    case "te_morau":
    case "te_moraeru":
      return "morau";
    case "te_itadaku":
    case "te_itadakeru":
      return "itadaku";
    case "te_kudasaru":
      return "kudasaru";
    case "te_ageru":
      return "ageru";
    case "te_kureru":
      return "kureru";
  }
}
