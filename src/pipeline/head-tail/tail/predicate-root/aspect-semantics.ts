import type { IrregularType } from "../../../../generator/conjugator.js";
import { resolvePassiveLemma } from "../../../../generator/aux-map.js";
import { pairKey } from "../../../lookup-tables.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import type { MorphemeEntry } from "../../../../types/dictionary.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { POS0, 動詞, 동사 } from "../../../../types/pos.js";
import { teIruProgressiveChangeEvidence } from "../../../semantics/te-iru.js";
import { teAruCaseParticleSurface, teAruStateEvidence } from "../../../content-resolver/runtime-helpers.js";
import { translationFrameAlternativeMatchesWithoutLayout, type ContextSense } from "../../../context.js";
import type { AspectKind, AspectSemanticPayload, AuxLayerNode, AuxOpNode, MiseruAspectOp, SimpleAspectOp, StemCandidate, StemNode, TailNode, TailRoot } from "./grammar.js";
import { hasFollowingNegationAfter } from "./grammar.js";
import { rewriteStemCandidatesPreservingIdentity } from "./stem-candidate-identity.js";

export interface AspectSemanticHydrationResult {
  readonly stem: StemNode;
  readonly ops: AuxLayerNode["ops"];
}

export interface AspectSemanticOwnershipRequirement {
  readonly aspect: AspectKind;
  readonly source: "legacy_compound_auxiliary" | "legacy_postverb_operator";
  readonly reason: string;
}

const LEGACY_COMPOUND_AUXILIARY_ASPECT_REQUIREMENTS = new Map<string, AspectKind>([
  ["오다", "te_kuru"],
  ["가다", "te_iku"]
]);

const POSTVERB_ASPECT_REQUIRES_READY_SEMANTIC = new Set<AspectKind>([
  "te_aru",
  "te_kuru",
  "te_iku",
  "te_miseru"
]);

export function legacyCompoundAuxiliaryAspectRequirement(
  auxiliaryLemma: string
): AspectSemanticOwnershipRequirement | null {
  const aspect = LEGACY_COMPOUND_AUXILIARY_ASPECT_REQUIREMENTS.get(auxiliaryLemma);
  return aspect === undefined
    ? null
    : {
      aspect,
      source: "legacy_compound_auxiliary",
      reason: `full-context compound owner '${auxiliaryLemma}' not yet represented in TailRoot`
    };
}

export function legacyPostVerbAspectRequirement(
  operatorKind: string
): AspectSemanticOwnershipRequirement | null {
  if (!isAspectKind(operatorKind) || !POSTVERB_ASPECT_REQUIRES_READY_SEMANTIC.has(operatorKind)) {
    return null;
  }
  return {
    aspect: operatorKind,
    source: "legacy_postverb_operator",
    reason: `post-verb operator '${operatorKind}' requires semantic payload before tail-parser ownership`
  };
}

export function tailRootIntrinsicAspectReadinessBlocker(root: TailRoot): string | null {
  const unreadyMiseru = tailRootAspectOps(root).find((op) =>
    op.aspect === "te_miseru" && op.semantic === undefined
  );
  if (unreadyMiseru !== undefined) {
    return "te_miseru requires semantic payload before tail-parser ownership";
  }
  return null;
}

export type AspectSemanticDecision =
  | "directional_generic"
  | "directional_sequential"
  | "directional_movement_acquisition"
  | "te_iru_resultative"
  | "te_iru_negative_inability"
  | "te_iru_negative_long_negation"
  | "te_iru_negative_completion"
  | "te_shimau_passive_completion"
  | "te_aru_prepared"
  | "te_aru_resultative"
  | "miseru_generic"
  | "miseru_volitional_showing";

export function applyAspectSemanticDecision<T extends SimpleAspectOp | MiseruAspectOp>(
  op: T,
  decision: AspectSemanticDecision
): T {
  return { ...op, semantic: aspectSemanticPayloadForDecision(decision) };
}

export function aspectSemanticPayloadForDecision(
  decision: AspectSemanticDecision
): AspectSemanticPayload {
  return (() => {
    switch (decision) {
      case "directional_generic":
        return { reading: "generic", candidates: ["generic"], renderStrategy: null, projection: "default" };
      case "directional_sequential":
        return {
          reading: "sequential_motion",
          candidates: ["sequential_motion", "generic"],
          role: "carried_state",
          renderStrategy: "sequential_motion",
          projection: "default"
        };
      case "directional_movement_acquisition":
        return {
          reading: "movement_acquisition",
          candidates: ["movement_acquisition", "generic"],
          role: "movement_acquisition",
          renderStrategy: "movement_reason",
          projection: "default"
        };
      case "te_iru_resultative":
        return { reading: "resultative_state", renderStrategy: "resultative_state", projection: "default" };
      case "te_iru_negative_inability":
        return { reading: "negative_inability", renderStrategy: "negative_inability", projection: "default" };
      case "te_iru_negative_long_negation":
        return { reading: "negative_long_negation", renderStrategy: "negative_long_negation", projection: "default" };
      case "te_iru_negative_completion":
        return { reading: "negative_completion", renderStrategy: "negative_completion", projection: "default" };
      case "te_shimau_passive_completion":
        return { reading: "passive_completion", renderStrategy: "passive_completion", projection: "default" };
      case "te_aru_prepared":
        return {
          reading: "prepared_state",
          particle: "を",
          role: "te_aru_prepared",
          renderStrategy: "prepared_te_oku",
          projection: "stative_perfect"
        };
      case "te_aru_resultative":
        return {
          reading: "resultative_state",
          particle: "が",
          role: "te_aru_resultative",
          renderStrategy: "resultative_state",
          projection: "default"
        };
      case "miseru_generic":
        return { reading: "generic", candidates: ["generic"], renderStrategy: null, projection: "default" };
      case "miseru_volitional_showing":
        return {
          reading: "volitional_showing",
          candidates: ["volitional_showing", "generic"],
          renderStrategy: "volitional_showing",
          projection: "default"
        };
      default:
        decision satisfies never;
        throw new Error(`unsupported aspect semantic decision: ${decision}`);
    }
  })();
}

export function tailRootAspectOps(root: TailRoot): readonly (SimpleAspectOp | MiseruAspectOp)[] {
  const ops: (SimpleAspectOp | MiseruAspectOp)[] = [];
  visitTailNodeAspectOps(root.tail, ops);
  return ops;
}

export function hydrateAspectSemanticOps(options: {
  readonly ops: readonly AuxOpNode[];
  readonly stem: StemNode;
  readonly headEntry: MorphemeEntry | null;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateTokenIdx: number;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): AspectSemanticHydrationResult | null {
  let changed = false;
  let nextStem = options.stem;
  const hasPrecedingPassiveVoice = (index: number): boolean =>
    options.ops.slice(0, index).some((op) => op.kind === "voice" && op.voice === "passive");
  const hasPrecedingStateChangeCarrier = (index: number): boolean => {
    const prevOp = options.ops[index - 1];
    return prevOp !== undefined &&
      prevOp.kind === "postverbAuxiliary" &&
      (prevOp.auxiliary.kind === "adverbial_change" || prevOp.auxiliary.kind === "adverbial_change_potential");
  };
  const precedingChangeVerbCarrier = (index: number): string | null => {
    const prevOp = options.ops[index - 1];
    if (prevOp?.kind !== "postverbAuxiliary" || prevOp.auxiliary.kind !== "state_change") {
      return null;
    }
    const carrierVerb = [...prevOp.source.tokens].reverse().find((token) => (token.pos & POS0) === 動詞);
    return carrierVerb?.dictionaryForm ?? null;
  };

  const nextOps = options.ops.map((op, index) => {
    if (op.kind !== "aspect") {
      return op;
    }
    if (isSimpleAspectOp(op)) {
      const hydrated = hydrateSimpleAspectSemanticOp({
        op,
        stem: nextStem,
        headEntry: options.headEntry,
        tokens: options.tokens,
        predicateTokenIdx: options.predicateTokenIdx,
        hasFollowingNegation: hasFollowingNegationAfter(options.ops, index),
        hasPrecedingPassiveVoice: hasPrecedingPassiveVoice(index),
        hasPrecedingStateChangeCarrier: hasPrecedingStateChangeCarrier(index),
        precedingChangeVerbCarrier: precedingChangeVerbCarrier(index),
        lookups: options.lookups,
        numeric: options.numeric
      });
      if (hydrated === null) {
        return op;
      }
      nextStem = hydrated.stem;
      changed = true;
      return hydrated.op;
    }
    if (op.aspect === "te_miseru") {
      const hydrated = hydrateMiseruSemanticOp(op, options.tokens, options.predicateTokenIdx, options.ops, index);
      if (hydrated !== op) {
        changed = true;
      }
      return hydrated;
    }
    return op;
  });

  return changed ? { stem: nextStem, ops: nextOps } : null;
}

export function isSimpleAspectOp(op: AuxLayerNode["ops"][number]): op is SimpleAspectOp {
  return op.kind === "aspect" && (
    op.aspect === "te_iru" ||
    op.aspect === "te_aru" ||
    op.aspect === "te_iku" ||
    op.aspect === "te_kuru" ||
    op.aspect === "te_oku" ||
    op.aspect === "te_shimau" ||
    op.aspect === "te_miru" ||
    op.aspect === "te_mawaru" ||
    op.aspect === "tsutsu_aru"
  );
}

function isAspectKind(value: string): value is AspectKind {
  return value === "te_iru" ||
    value === "te_aru" ||
    value === "te_iku" ||
    value === "te_kuru" ||
    value === "te_oku" ||
    value === "te_shimau" ||
    value === "te_miru" ||
    value === "te_mawaru" ||
    value === "tsutsu_aru" ||
    value === "te_ageru" ||
    value === "te_kureru" ||
    value === "te_kudasaru" ||
    value === "te_morau" ||
    value === "te_itadaku" ||
    value === "te_moraeru" ||
    value === "te_itadakeru" ||
    value === "te_kudasai" ||
    value === "te_kure_tanomu" ||
    value === "te_hoshii" ||
    value === "naide_kudasai" ||
    value === "te_miseru";
}

function visitTailNodeAspectOps(node: TailNode, ops: (SimpleAspectOp | MiseruAspectOp)[]): void {
  if (node.kind === "connective") {
    visitTailNodeAspectOps(node.inner, ops);
    visitTailNodeAspectOps(node.outer, ops);
    return;
  }
  for (const op of node.ops) {
    if (isSimpleAspectOp(op) || isMiseruAspectOp(op)) {
      ops.push(op);
    }
  }
}

function isMiseruAspectOp(op: AuxOpNode): op is MiseruAspectOp {
  return op.kind === "aspect" && op.aspect === "te_miseru";
}

function hydrateSimpleAspectSemanticOp(options: {
  readonly op: SimpleAspectOp;
  readonly stem: StemNode;
  readonly headEntry: MorphemeEntry | null;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateTokenIdx: number;
  readonly hasFollowingNegation: boolean;
  readonly hasPrecedingPassiveVoice: boolean;
  readonly hasPrecedingStateChangeCarrier?: boolean;
  readonly precedingChangeVerbCarrier?: string | null;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): { readonly stem: StemNode; readonly op: SimpleAspectOp } | null {
  if (options.op.semantic !== undefined) {
    return null;
  }
  switch (options.op.aspect) {
    case "te_aru":
      return hydrateTeAruSemanticOp(options);
    case "te_iru":
      return hydrateTeIruSemanticOp(options);
    case "te_shimau":
      return hydrateTeShimauSemanticOp(options);
    case "te_kuru":
    case "te_iku": {
      const hydrated = directionalAspectSemantic(options.op, options.stem, options.headEntry, options.tokens, options.predicateTokenIdx, options.lookups, options.numeric);
      return hydrated === null ? null : { stem: hydrated.stem, op: { ...options.op, semantic: hydrated.semantic } };
    }
    default:
      return null;
  }
}

function hydrateTeAruSemanticOp(options: {
  readonly op: SimpleAspectOp;
  readonly stem: StemNode;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateTokenIdx: number;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): { readonly stem: StemNode; readonly op: SimpleAspectOp } | null {
  const previousParticle = teAruCaseParticleSurface(
    options.tokens,
    options.predicateTokenIdx
  );
  if (previousParticle !== "が" && previousParticle !== "を") {
    return null;
  }
  const evidence = teAruStateEvidence(
    options.tokens,
    options.predicateTokenIdx,
    previousParticle,
    options.lookups
  );
  if (evidence === null) {
    if (previousParticle === "を") {
      return {
        stem: options.stem,
        op: applyAspectSemanticDecision(options.op, "te_aru_prepared")
      };
    }
    return {
      stem: options.stem,
      op: applyAspectSemanticDecision(options.op, "te_aru_resultative")
    };
  }
  const reading = evidence.state === "prepared" ? "prepared_state" : "resultative_state";
  const sourceCandidate = stemCandidateForRewrittenLemma(
    options.stem,
    evidence.koreanLemma,
    evidence.irregular ?? null,
    options.tokens,
    options.predicateTokenIdx,
    options.lookups,
    options.numeric
  );
  return {
    stem: rewriteTailStemLemma(options.stem, evidence.koreanLemma, evidence.irregular ?? null, {
      structuralCandidate: sourceCandidate
    }),
    op: {
      ...options.op,
      semantic: {
        reading,
        particle: evidence.particleSurface,
        role: `te_aru_${evidence.state}`,
        renderStrategy: evidence.renderStrategy,
        projection: evidence.state === "prepared" ? "stative_perfect" : "default"
      }
    }
  };
}

function hydrateTeShimauSemanticOp(options: {
  readonly op: SimpleAspectOp;
  readonly stem: StemNode;
  readonly hasPrecedingPassiveVoice: boolean;
}): { readonly stem: StemNode; readonly op: SimpleAspectOp } | null {
  if (!options.hasPrecedingPassiveVoice) {
    return null;
  }
  return {
    stem: options.stem,
    op: applyAspectSemanticDecision(options.op, "te_shimau_passive_completion")
  };
}

function hydrateTeIruSemanticOp(options: {
  readonly op: SimpleAspectOp;
  readonly stem: StemNode;
  readonly headEntry: MorphemeEntry | null;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateTokenIdx: number;
  readonly hasFollowingNegation: boolean;
  readonly hasPrecedingPassiveVoice: boolean;
  readonly hasPrecedingStateChangeCarrier?: boolean;
  readonly precedingChangeVerbCarrier?: string | null;
  readonly lookups: LookupTables;
}): { readonly stem: StemNode; readonly op: SimpleAspectOp } | null {
  if (options.hasPrecedingStateChangeCarrier === true) {
    if (
      !options.hasFollowingNegation &&
      teIruProgressiveChangeEvidence({
        tokens: options.tokens,
        predicateTokenIdx: options.predicateTokenIdx,
        hostDictForm: "",
        stemResultComplement: null,
        lookups: options.lookups
      })
    ) {
      return null;
    }
    return {
      stem: options.stem,
      op: {
        ...options.op,
        semantic: {
          reading: "resultative_state",
          role: "state_change_carrier_result",
          renderStrategy: options.hasFollowingNegation ? "negative_resultative_state" : "resultative_state",
          projection: "default"
        }
      }
    };
  }
  const stemDictForm = tailStemDictionaryForm(options.stem) ?? options.headEntry?.dictionaryForm ?? "";
  const carrierDictForm = options.precedingChangeVerbCarrier ?? null;
  const dictForm = carrierDictForm ?? stemDictForm;
  const semantic = classifyTeIruSemanticPayload({
    dictForm,
    hasFollowingNegation: options.hasFollowingNegation,
    hasPrecedingPassiveVoice: options.hasPrecedingPassiveVoice,
    progressiveChangeEvidence: () => teIruProgressiveChangeEvidence({
      tokens: options.tokens,
      predicateTokenIdx: options.predicateTokenIdx,
      hostDictForm: dictForm,
      stemResultComplement: carrierDictForm === null ? null : stemDictForm,
      lookups: options.lookups
    }),
    lookups: options.lookups
  });
  if (semantic === null) {
    return null;
  }
  return {
    stem: options.stem,
    op: {
      ...options.op,
      semantic
    }
  };
}

function directionalAspectSemantic(
  op: SimpleAspectOp,
  stem: StemNode,
  headEntry: MorphemeEntry | null,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): { readonly stem: StemNode; readonly semantic: AspectSemanticPayload } | null {
  if (op.aspect !== "te_kuru" && op.aspect !== "te_iku") {
    return null;
  }
  const stemDictForm = tailStemDictionaryForm(stem) ?? headEntry?.dictionaryForm ?? "";
  const embeddedDirectional = embeddedDirectionalLemmaFor(op.aspect, stemDictForm, lookups);
  if (
    embeddedDirectional !== null &&
    stemKoreanLemmaAllowsEmbeddedDirectional(op.aspect, stem, tokens, predicateTokenIdx, stemDictForm, lookups, numeric)
  ) {
    const [lemma, irregular] = embeddedDirectional;
    return {
      stem: rewriteTailStemLemma(stem, lemma, irregular),
      semantic: {
        reading: "lexicalized_motion",
        candidates: ["lexicalized_motion", "generic"],
        role: "embedded_directional_motion",
        renderStrategy: "drop_aux",
        projection: "default"
      }
    };
  }
  const roundTrip = op.aspect === "te_kuru" ? lookups.TE_KURU_ROUND_TRIP_LEMMAS.get(stemDictForm) ?? null : null;
  if (
    roundTrip !== null &&
    stemKoreanLemmaMatchesActiveCandidate(stem, tokens, predicateTokenIdx, roundTrip.sourceKorean, lookups, numeric)
  ) {
    return {
      stem: rewriteTailStemLemma(stem, roundTrip.targetKorean, roundTrip.targetIrregular),
      semantic: {
        reading: "lexicalized_motion",
        candidates: ["lexicalized_motion", "generic"],
        role: "round_trip_motion",
        renderStrategy: "drop_aux",
        projection: "default"
      }
    };
  }
  if (op.aspect === "te_iku" && lookups.TE_IKU_GRADUAL_CHANGE_VERBS.has(stemDictForm)) {
    return {
      stem,
      semantic: {
        reading: "generic",
        candidates: ["generic", "drop_aux"],
        role: "gradual_change",
        renderStrategy: null,
        projection: "default"
      }
    };
  }
  if (op.aspect === "te_iku" && opSourceContainsForm(op, "ゆく")) {
    return {
      stem,
      semantic: {
        reading: "drop_aux",
        role: "transparent_tail",
        renderStrategy: "drop_aux",
        projection: "default"
      }
    };
  }
  if (op.aspect === "te_kuru" && teKuruStrongBarePairCanDropAux(stemDictForm, op, stem, tokens, predicateTokenIdx, lookups, numeric)) {
    return {
      stem,
      semantic: {
        reading: "drop_aux",
        role: "lexicalized_directional_tail",
        renderStrategy: "drop_aux",
        projection: "default"
      }
    };
  }
  if (op.aspect === "te_kuru" && lookups.TE_KURU_CARRIED_STATE_VERBS.has(stemDictForm)) {
    return {
      stem,
      semantic: applyAspectSemanticDecision(op, "directional_sequential").semantic!
    };
  }
  if (lookups.TE_MOVEMENT_ACQUISITION_VERBS.has(stemDictForm)) {
    return {
      stem,
      semantic: applyAspectSemanticDecision(op, "directional_movement_acquisition").semantic!
    };
  }
  if (lookups.TE_PRECEDING_MANNER_VERBS.has(stemDictForm) && op.aspect === "te_iku") {
    return {
      stem,
      semantic: {
        reading: "generic",
        candidates: ["generic"],
        role: "manner_motion",
        renderStrategy: "movement_reason",
        projection: "default"
      }
    };
  }
  return {
    stem,
    semantic: applyAspectSemanticDecision(op, "directional_generic").semantic!
  };
}

function embeddedDirectionalLemmaFor(
  aspect: "te_kuru" | "te_iku",
  stemDictForm: string,
  lookups: LookupTables
): readonly [lemma: string, irregular: IrregularType | null] | null {
  const table = aspect === "te_kuru"
    ? lookups.TE_KURU_EMBEDDED_DIRECTIONAL_LEMMAS
    : lookups.TE_IKU_EMBEDDED_DIRECTIONAL_LEMMAS;
  return table.get(stemDictForm) ?? null;
}

function stemKoreanLemmaAllowsEmbeddedDirectional(
  aspect: "te_kuru" | "te_iku",
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  stemDictForm: string,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const motionBase = embeddedDirectionalLemmaFor(aspect, stemDictForm, lookups);
  return motionBase !== null && stemKoreanLemmaMatchesActiveCandidate(
    stem,
    tokens,
    predicateTokenIdx,
    motionBase[0],
    lookups,
    numeric
  );
}

function stemKoreanLemmaMatchesActiveCandidate(
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lemma: string,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const lemmas = activeStemCandidateLemmas(stem, tokens, predicateTokenIdx, lookups, numeric);
  return lemmas.length > 0 && lemmas.every((candidateLemma) => candidateLemma === lemma);
}

function teKuruStrongBarePairCanDropAux(
  stemDictForm: string,
  op: SimpleAspectOp,
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const tailForms = op.source.tokens
    .map((token) => token.dictionaryForm || token.surface)
    .filter((form) => form.length > 0);
  if (!stemKoreanLemmaAllowsStrongBareDrop(stem, tokens, predicateTokenIdx, lookups, numeric)) {
    return false;
  }
  return tailForms.some((form) => lookups.TE_MOVEMENT_STRONG_BARE_PAIRS.has(pairKey(stemDictForm, form)));
}

function stemKoreanLemmaAllowsStrongBareDrop(
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): boolean {
  const lemmas = activeStemCandidateLemmas(stem, tokens, predicateTokenIdx, lookups, numeric);
  return lemmas.length > 0 && lemmas.every((lemma) =>
    lookups.TE_MOVEMENT_STRONG_BARE_DROP_KOREAN_LEMMAS.has(lemma)
  );
}

function activeStemCandidateLemmas(
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): readonly string[] {
  if (stem.kind === "verb") {
    return [stem.lemma];
  }
  if (stem.kind !== "candidateSet") {
    return [];
  }
  return activeStemCandidates(stem, tokens, predicateTokenIdx, lookups, numeric)
    .map((candidate) => candidate.lemma);
}

function activeStemCandidates(
  stem: Extract<StemNode, { readonly kind: "candidateSet" }>,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): readonly StemCandidate[] {
  const matchedFramed = stem.candidates.filter((candidate) =>
    stemCandidateHasFrame(candidate) &&
    translationFrameAlternativeMatchesWithoutLayout(candidate as ContextSense, tokens, predicateTokenIdx, null, lookups, numeric)
  );
  return matchedFramed.length > 0
    ? matchedFramed
    : stem.candidates.filter((candidate) => !stemCandidateHasFrame(candidate));
}

function stemCandidateHasFrame(candidate: { readonly senseFrame?: unknown; readonly senseFrames?: unknown }): boolean {
  return candidate.senseFrame !== undefined || candidate.senseFrames !== undefined;
}

function opSourceContainsForm(op: SimpleAspectOp, form: string): boolean {
  return op.source.tokens.some((token) =>
    token.dictionaryForm === form || token.surface === form
  );
}

export function hydrateMiseruSemanticOp(
  op: MiseruAspectOp,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  ops: readonly AuxOpNode[],
  opIndex: number
): MiseruAspectOp {
  const miseruToken = op.source.tokens[op.source.tokens.length - 1];
  if (miseruToken?.dictionaryForm !== "見せる" && miseruToken?.dictionaryForm !== "みせる") {
    return op;
  }
  void ops;
  void opIndex;
  const hasCompletionCue = tokens
    .slice(Math.max(0, predicateTokenIdx - 4), predicateTokenIdx)
    .some((token) => token.surface === "必ず");
  const stemToken = tokens[predicateTokenIdx];
  const hasYaruDemonstrationCue =
    stemToken?.dictionaryForm === "やる" || stemToken?.surface === "やっ";
  if (!hasCompletionCue && !hasYaruDemonstrationCue) {
    return applyAspectSemanticDecision(op, "miseru_generic");
  }
  return applyAspectSemanticDecision(op, "miseru_volitional_showing");
}

function tailStemDictionaryForm(stem: StemNode): string | null {
  const semanticAnchor = stem.semanticAnchors[0];
  if (stemUsesSahenSemanticAnchor(stem) && semanticAnchor !== undefined) {
    const semanticToken = stem.source.tokens[semanticAnchor];
    return semanticToken?.dictionaryForm ?? semanticToken?.surface ?? null;
  }
  const token = stem.source.tokens[stem.conjugationAnchor];
  return token?.dictionaryForm ?? null;
}

function stemUsesSahenSemanticAnchor(stem: StemNode): boolean {
  if (stem.kind === "verb") {
    return stem.conj === "sahen";
  }
  if (stem.kind === "candidateSet") {
    return stem.candidates.some((candidate) => candidate.conj === "sahen");
  }
  return false;
}

function rewriteTailStemLemma(
  stem: StemNode,
  lemma: string,
  irregular: IrregularType | null,
  options: { readonly structuralCandidate?: StemCandidate | null } = {}
): StemNode {
  if (stem.kind === "verb" || stem.kind === "adj") {
    return { ...stem, lemma, irregular };
  }
  if (stem.kind === "candidateSet") {
    return {
      ...stem,
      candidates: rewriteStemCandidatesPreservingIdentity(
        stem.candidates,
        lemma,
        irregular,
        options
      )
    };
  }
  return stem;
}

function stemCandidateForRewrittenLemma(
  stem: StemNode,
  lemma: string,
  irregular: IrregularType | null,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): StemCandidate | null {
  if (stem.kind !== "candidateSet") {
    return null;
  }
  const candidates = activeStemCandidates(stem, tokens, predicateTokenIdx, lookups, numeric);
  const exact = candidates.filter((candidate) =>
    candidate.lemma === lemma &&
    (candidate.irregular ?? null) === irregular
  );
  if (exact.length === 1) {
    return exact[0]!;
  }
  const passiveDerived = candidates.filter((candidate) => {
    if (candidate.koreanPos !== 동사) {
      return false;
    }
    const [passiveLemma, passiveIrregular] = resolvePassiveLemma(candidate.lemma, candidate.irregular, { lookups });
    return passiveLemma === lemma && passiveIrregular === irregular;
  });
  return passiveDerived.length === 1 ? passiveDerived[0]! : null;
}

export function classifyTeIruSemanticPayload(options: {
  readonly dictForm: string;
  readonly hasFollowingNegation: boolean;
  readonly hasPrecedingPassiveVoice: boolean;
  readonly progressiveChangeEvidence?: () => boolean;
  readonly lookups: LookupTables;
}): AspectSemanticPayload | null {
  const lookups = options.lookups;
  const baseResultative = lookups.isTeIruResultativeVerb(options.dictForm, { passive: options.hasPrecedingPassiveVoice });
  const negativeResultative = lookups.isTeIruNegativeResultativeVerb(options.dictForm, { passive: options.hasPrecedingPassiveVoice });

  if ((baseResultative || negativeResultative) && options.progressiveChangeEvidence?.() === true) {
    return null;
  }
  if (options.hasFollowingNegation) {
    if (negativeResultative) {
      return {
        reading: "resultative_state",
        renderStrategy: "negative_resultative_state",
        projection: "default"
      };
    }
    if (lookups.TE_IRU_NEGATIVE_INABILITY_VERBS.has(options.dictForm)) {
      return aspectSemanticPayloadForDecision("te_iru_negative_inability");
    }
    if (lookups.TE_IRU_NEGATIVE_LONG_NEGATION_VERBS.has(options.dictForm)) {
      return aspectSemanticPayloadForDecision("te_iru_negative_long_negation");
    }
    if (baseResultative) {
      return aspectSemanticPayloadForDecision("te_iru_negative_completion");
    }
    return null;
  }

  if (!baseResultative) {
    return null;
  }
  return aspectSemanticPayloadForDecision("te_iru_resultative");
}

export function reclassifyTeIruSemanticWithoutPassive(
  op: SimpleAspectOp,
  stem: StemNode,
  hasFollowingNegation: boolean,
  lookups: LookupTables
): SimpleAspectOp {
  if (op.aspect !== "te_iru" || op.followingRareruReading !== "honorific") {
    return op;
  }
  const dictForm = tailStemDictionaryForm(stem) ?? "";
  const semantic = classifyTeIruSemanticPayload({
    dictForm,
    hasFollowingNegation,
    hasPrecedingPassiveVoice: false,
    lookups
  });
  if (semantic === null) {
    const { semantic: _semantic, ...withoutSemantic } = op;
    return withoutSemantic;
  }
  return { ...op, semantic };
}
