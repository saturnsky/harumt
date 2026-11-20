import { resolveContext } from "../../context.js";
import type { MorphemeDictionary } from "../../../dictionary/morpheme.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { AuxToken } from "../../../generator/aux-map.js";
import type { MorphemeEntry } from "../../../types/dictionary.js";
import type { RenderPlan } from "../../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { ProjectionEvidenceLayout } from "../../clause-layout/layout-types.js";
import { contentResultKoreanCache, contentResultKoreanPos, ResolvedContentResult, StagedContentResult, type ContentResult, type TranslationCandidate as ContentTranslationCandidate } from "../../content-types.js";
import type { TranslationCandidate } from "../../../types/pipeline.js";
import type { TokenCursor } from "../../token-cursor.js";
import { normalizeCandidateConditions, translationCandidateFromDict, translationCandidateProjectionOrdinals } from "../../candidate-runtime.js";
import { contentTranslationCandidateFrom } from "../../content-resolver/candidate-ordering.js";
import {
  contentHeadHydrationMetadataFromResult,
  type ContentHeadHydrationMetadata
} from "./content-head-metadata.js";
import type { BenefactiveContext, DekiruReading, NareruReading, RareruReading } from "../../../types/pipeline.js";
import type { Voice } from "../../../types/render-plan.js";
import type { AuxLayerNode, OpSource, TailRoot } from "../tail/predicate-root/grammar.js";
import { TranslationUnit, UnitType, updateKoreanPhase1, type TranslationUnitProvenance } from "../../translation/unit.js";
import { firstAuxLayer, tailRootHasRequestTail } from "../tail/predicate-root/inspect.js";
import { probeProductionDispatch } from "../tail/predicate-root/production-registry.js";
import type { NominalFrameParse, NominalHeadLexicalForms } from "../head/adapters/nominal/grammar.js";
import type {
  NominalHeadTailChainPlan,
  PredicateHeadTailChainRenderPlan
} from "../lifecycle/head-tail-render-plan.js";
import {
  tailRootBenefactiveContext,
  tailRootRareruReadings,
  tailRootSpanVoice,
  tailRootVoiceOpen
} from "../tail/predicate-root/span-metadata.js";
import { tryParseTailPredicateProjectionHost } from "../tail/predicate-root/integration.js";
import {
  nominalTailChainContentAttachLeft,
  nominalTailChainContentKoreanPos,
  nominalTailChainContentProvenance,
  explainNominalTailChainBlock,
  tryBuildNominalTailChainPlan,
  type NominalTailChainBlockResult,
  type NominalTailChainBuildResult,
  type PredicateNominalHostResolution
} from "../head/adapters/nominal/integration.js";
import { hasActiveSahenLightVerbProjection } from "../tail/predicate-root/sahen-light-verb-evidence.js";
import {
  candidateSetCandidates,
  candidateSetMembers,
  candidateSetSharedConsumed,
  commitmentLaneCandidateSet,
  createSourceCandidateSet,
  dropCandidate,
  isResolvedCandidateSet,
  keepCandidate,
  stagedCandidate,
  transformCandidateSet,
  type SourceCandidateSet
} from "../../source-candidate-set.js";
import { 명사 } from "../../../types/pos.js";
import type { NumericHostReservation } from "../tail/predicate-root/integration/contracts.js";

export interface NominalTailChainAssemblyBridgeOptions {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly limit?: number;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly numericHostReservation?: NumericHostReservation;

  readonly layout?: ProjectionEvidenceLayout;
  readonly resolveHeadMetadata: (start: number, end: number) => ContentResult | Promise<ContentResult>;
  readonly hydrateTailRoot: (root: TailRoot, headResult: ContentHeadHydrationMetadata, predicateTokenIdx: number) => TailRoot | Promise<TailRoot>;
}

export type NominalTailChainAssemblyBridgeResult = NominalTailChainBuildResult & {
  readonly assembly: NominalTailChainAssemblyDescriptor;
};

export type NominalTailChainAssemblyBridgeBlockResult = NominalTailChainBlockResult;

export interface NominalTailChainAssemblyDescriptor {
  readonly korean: "";
  readonly koreanBase?: string | null;
  readonly koreanPos: NonNullable<NominalHeadTailChainPlan["realization"]["frame"]["outputPos"]>;
  readonly entry: MorphemeEntry | null;
  readonly unitType: UnitType.CONTENT;
  readonly attachLeft: false;
  readonly provenance: Extract<TranslationUnitProvenance, "nominal_head">;
  readonly renderPlan: RenderPlan;
  readonly voice?: Voice | null;
  readonly rareruReadings?: ReadonlySet<RareruReading>;
  readonly nareruReadings?: ReadonlySet<NareruReading>;
  readonly dekiruReadings?: ReadonlySet<DekiruReading>;
  readonly hasNegative?: boolean;
  readonly hasCausative?: boolean;
  readonly hasCausativePassive?: boolean;
  readonly hasRequestTail?: boolean;
  readonly hasBenefactiveTail?: boolean;
  readonly connectiveRole?: string | null;
  readonly benefactive?: BenefactiveContext | null;
  readonly sourceCandidates?: SourceCandidateSet<TranslationCandidate> | null;
}

interface NominalHeadResolutionCandidatePayload {
  readonly korean: string;
  readonly canonicalKorean?: string;
  readonly koreanPos?: number;
  readonly entry: MorphemeEntry | null;
  readonly sourceCandidateIdx: number;
  readonly sourceCandidate: TranslationCandidate;
}

export function withParticleStemProjection(plan: RenderPlan): RenderPlan {
  if (plan.kind !== "headTailChain" || plan.realization.kind !== "nominal") {
    return plan;
  }
  if (plan.realization.projection !== undefined && plan.realization.projection !== null) {
    return plan;
  }
  return { ...plan, realization: { ...plan.realization, projection: { kind: "particle_stem" } } };
}

export interface NominalFrameCopulaChain {
  readonly consumed: number;
  readonly plan: PredicateHeadTailChainRenderPlan;
  readonly familyId: string;
}

export interface NominalFrameCopulaChainInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly parse: NominalFrameParse;
  readonly framePlan: NominalHeadTailChainPlan;
  readonly followingPredicate: {
    readonly tokenIndex: number;
    readonly consumed: number;
    readonly plan: PredicateHeadTailChainRenderPlan;
  };
}

export function tryBuildNominalFrameCopulaChain(
  input: NominalFrameCopulaChainInput
): NominalFrameCopulaChain | null {
  const { markerStart, parse, followingPredicate } = input;
  const frameEndExclusive = markerStart + parse.consumed;
  const headStart = markerStart + 1;
  if (headStart >= frameEndExclusive) {
    return null;
  }
  if (parse.frame.outputPos !== 명사) {
    return null;
  }
  const predicatePlan = followingPredicate.plan;
  const existingHostProjection = predicatePlan.realization.hostProjection;
  if (existingHostProjection !== undefined && existingHostProjection.kind !== "numeral") {
    return null;
  }
  const layer = firstAuxLayer(predicatePlan.realization.root.tail);
  if (layer === null) {
    return null;
  }
  const stem = layer.stem;
  if (stem.kind !== "noun" || stem.sourcePredicateShape !== "nominal") {
    return null;
  }
  const stemIndices = stem.source.tokenIndices;
  if (
    stemIndices.length !== frameEndExclusive - headStart ||
    stemIndices.some((idx, offset) => idx !== headStart + offset)
  ) {
    return null;
  }
  const leadingCopula = layer.ops[0];
  if (leadingCopula === undefined || leadingCopula.kind !== "copula") {
    return null;
  }
  if (leadingCopula.source.tokenIndices[0] !== parse.nextIndex) {
    return null;
  }
  const chainEndExclusive = followingPredicate.tokenIndex + followingPredicate.consumed;
  if (chainEndExclusive <= frameEndExclusive) {
    return null;
  }
  const dispatch = probeProductionDispatch(predicatePlan.realization.root, {
    intake: { site: "committed_render", partial: false }
  });
  if (dispatch.kind !== "registry") {
    return null;
  }
  const root = withNominalFrameStemSource(
    predicatePlan.realization.root,
    input.tokens,
    markerStart,
    frameEndExclusive
  );
  return {
    consumed: chainEndExclusive - markerStart,
    familyId: dispatch.match.familyId,
    plan: {
      ...predicatePlan,
      ...withRebasedSourceCandidateRoot(predicatePlan, root),
      realization: {
        ...predicatePlan.realization,
        root,
        hostProjection: { kind: "nominal_frame", base: input.framePlan }
      }
    }
  };
}

function withNominalFrameStemSource(
  root: TailRoot,
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  frameEndExclusive: number
): TailRoot {
  const source: OpSource = {
    tokens: tokens.slice(markerStart, frameEndExclusive),
    tokenIndices: Array.from(
      { length: frameEndExclusive - markerStart },
      (_unused, offset) => markerStart + offset
    )
  };
  const tail = root.tail.kind === "connective"
    ? { ...root.tail, inner: withNominalFrameStemSourceLayer(root.tail.inner, source, markerStart) }
    : withNominalFrameStemSourceLayer(root.tail, source, markerStart);
  return { ...root, tail };
}

function withNominalFrameStemSourceLayer(
  layer: AuxLayerNode,
  source: OpSource,
  markerStart: number
): AuxLayerNode {
  const stem = layer.stem;
  if (stem.kind !== "noun") {
    return layer;
  }
  const rebase = (position: number): number => {
    const absolute = stem.source.tokenIndices[position];
    return absolute === undefined ? 0 : absolute - markerStart;
  };
  return {
    ...layer,
    stem: {
      ...stem,
      source,
      conjugationAnchor: rebase(stem.conjugationAnchor),
      semanticAnchors: stem.semanticAnchors.map(rebase)
    }
  };
}

function withRebasedSourceCandidateRoot(
  plan: PredicateHeadTailChainRenderPlan,
  root: TailRoot
): Pick<PredicateHeadTailChainRenderPlan, "headTailSourceCandidate"> | Record<string, never> {
  const candidate = plan.headTailSourceCandidate;
  const realization = candidate?.tail.realization;
  if (
    candidate === undefined ||
    realization?.kind !== "predicate_root" ||
    realization.root !== plan.realization.root
  ) {
    return {};
  }
  return {
    headTailSourceCandidate: {
      ...candidate,
      tail: { ...candidate.tail, realization: { ...realization, root } }
    }
  };
}

export function applyHeadedPlanTrailingCopula(
  unit: TranslationUnit,
  value: string,
  options: {
    readonly auxTokens: readonly AuxToken[];
    readonly baseText?: string;
    readonly connective?: string | null;
    readonly pastConnective?: string | null;
    readonly politeConnective?: string | null;
    readonly politeFormalConnective?: string | null;
    readonly sfp?: string | null;
  }
): void {
  if (unit.renderPlan === null) {
    if (options.baseText !== undefined && options.baseText.length > 0) {
      unit.setRenderPlan({
        kind: "copulaPredicate",
        polarity: "affirmative",
        base: { kind: "fixedText", text: options.baseText },
        auxTokens: options.auxTokens,
        connective: options.connective ?? null,
        pastConnective: options.pastConnective ?? null,
        politeConnective: options.politeConnective ?? null,
        politeFormalConnective: options.politeFormalConnective ?? null,
        sfp: options.sfp ?? null
      }, { rule: "headed_plan_trailing_copula", cacheValue: "" });
      return;
    }
    updateKoreanPhase1(unit, value);
    return;
  }
  unit.setRenderPlan({
    kind: "copulaPredicate",
    polarity: "affirmative",
    base: withParticleStemProjection(unit.renderPlan),
    auxTokens: options.auxTokens,
    connective: options.connective ?? null,
    pastConnective: options.pastConnective ?? null,
    politeConnective: options.politeConnective ?? null,
    politeFormalConnective: options.politeFormalConnective ?? null,
    sfp: options.sfp ?? null
  }, { rule: "headed_plan_trailing_copula", cacheValue: "" });
}

export async function tryBuildNominalTailChainAssemblyBridge(
  options: NominalTailChainAssemblyBridgeOptions
): Promise<NominalTailChainAssemblyBridgeResult | null> {
  const { tokens, pos: index } = options.cursor;
  const built = await tryBuildNominalTailChainPlan({
    tokens,
    cursor: options.cursor,
    dictionary: options.dictionary,
    previewFormal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.numericHostReservation === undefined
      ? {}
      : { numericHostReservation: options.numericHostReservation }),
    ...(options.layout === undefined ? {} : { layout: options.layout }),
    resolvePredicateHost: async (candidate): Promise<PredicateNominalHostResolution | null> => {
      const host = await tryParseTailPredicateProjectionHost(
        {
          tokens,
          cursor: options.cursor,
          dictionary: options.dictionary,
          formal: options.previewFormal,
          lookups: options.lookups,
          numeric: options.numeric,
          ...(options.numericHostReservation === undefined
            ? {}
            : { numericHostReservation: options.numericHostReservation })
        },
        index,
        candidate.hostEnd,
        { projection: candidate.hostProjection }
      );
      if (!host.ok) {
        return null;
      }
      const headResult = activeSahenAdjustedContentResult(
        options.cursor.tokens,
        index,
        await options.resolveHeadMetadata(index, candidate.nominalizerStart)
      );
      const headMetadata = activeSahenAdjustedContentHeadHydrationMetadata(
        options.cursor.tokens,
        index,
        contentHeadHydrationMetadataFromResult(headResult)
      );
      return {
        host: {
          ...host.host,
          root: await options.hydrateTailRoot(
            host.host.root,
            headMetadata,
            host.predicateTokenIdx
          )
        },
        entry: headResult.entry,
        headResult
      };
    },
    resolveRenyouNominalHost: async (start, endInclusive): Promise<PredicateNominalHostResolution | null> => {
      const host = await tryParseTailPredicateProjectionHost(
        {
          tokens,
          cursor: options.cursor,
          dictionary: options.dictionary,
          formal: options.previewFormal,
          lookups: options.lookups,
          numeric: options.numeric
        },
        start,
        endInclusive,
        { projection: "nominal_head" }
      );
      if (!host.ok) {
        return null;
      }
      const headResult = await options.resolveHeadMetadata(start, host.predicateTokenIdx + 1);
      return {
        host: {
          ...host.host,
          root: await options.hydrateTailRoot(
            host.host.root,
            contentHeadHydrationMetadataFromResult(headResult),
            host.predicateTokenIdx
          )
        },
        entry: headResult.entry,
        headResult
      };
    },
    lookupRenyouLexicalNoun: async (start, endInclusive) => {
      const span = tokens.slice(start, endInclusive + 1);
      const surface = span.map((token) => token.surface).join("");
      const reading = span.map((token) => token.reading).join("");
      if (span.length === 0 || surface.length === 0) {
        return null;
      }
      const entry = await options.dictionary.lookup(surface, reading, "名詞") ?? null;
      return entry === null
        ? null
        : resolveContext(entry, tokens, start, { lookups: options.lookups, numeric: options.numeric });
    },
    resolveNominalHead: async (hostTokenIdx) => {
      const headResult = await options.resolveHeadMetadata(hostTokenIdx, hostTokenIdx + 1);
      const candidates = nominalHeadResolutionCandidates(headResult);
      const selectedCandidateIdx = nominalHeadSelectedCandidateIdx(options.cursor.tokens, hostTokenIdx, headResult, candidates);
      const selectedCandidate = selectedCandidateIdx === null
        ? null
        : candidates.find((candidate) => candidate.sourceCandidateIdx === selectedCandidateIdx) ?? null;
      const headKoreanPos = selectedCandidate?.koreanPos ?? contentResultKoreanPos(headResult);
      const lexicalForms = nominalHeadLexicalForms(selectedCandidate, headResult);
      return {
        korean: selectedCandidate?.korean ?? nominalHeadResolutionKorean(headResult),
        canonicalKorean: selectedCandidate?.canonicalKorean ?? nominalHeadResolutionCanonicalKorean(headResult),
        ...(headKoreanPos === null ? {} : { koreanPos: headKoreanPos }),
        ...(lexicalForms === null ? {} : { lexicalForms }),
        entry: headResult.entry,
        candidates,
        selectedCandidateIdx
      };
    }
  });
  if (built === null) {
    return null;
  }
  const koreanBase = nominalTailChainFallbackKoreanBase(built);
  return {
    ...built,
    assembly: {
      korean: "",
      ...(koreanBase.length === 0 ? {} : { koreanBase }),
      koreanPos: nominalTailChainContentKoreanPos(built.plan),
      entry: built.entry,
      unitType: UnitType.CONTENT,
      attachLeft: nominalTailChainContentAttachLeft(built.plan),
      provenance: nominalTailChainContentProvenance(built.plan),
      renderPlan: built.plan,
      ...predicateHostTailAssemblyMetadata(built, options),
      ...(built.sourceCandidates === undefined ? {} : { sourceCandidates: built.sourceCandidates })
    }
  };
}

function nominalTailChainFallbackKoreanBase(built: NominalTailChainBuildResult): string {
  if (built.predicateHostHeadResult !== undefined) {
    return nominalHeadResolutionKorean(built.predicateHostHeadResult);
  }
  const root = built.plan.realization.root;
  switch (root.kind) {
    case "nominalPhrase":
      return root.head.allomorphHint?.korean ?? "";
    case "hostBearingLikeness":
      return root.frame.host.head.allomorphHint?.korean ?? "";
    case "productiveAdjectivalSuffix":
      return root.frame.host.head.allomorphHint?.korean ?? "";
    case "predicateNominalHost":
    case "renyouNominalHead":
      return "";
  }
}

function nominalHeadResolutionCandidates(
  headResult: ContentResult
): readonly NominalHeadResolutionCandidatePayload[] {
  const resultCandidates = candidateSetCandidates(commitmentLaneCandidateSet(headResult.sourceCandidates));
  const sourceCandidates: readonly TranslationCandidate[] = resultCandidates.length > 0
    ? resultCandidates
    : nominalHeadEntryCandidates(headResult.entry);
  return sourceCandidates
    .map((candidate, candidateIdx): NominalHeadResolutionCandidatePayload | null => {
      const sourceCandidate = candidateWithOnlySenseEntry(candidate);
      const korean = sourceCandidate.koreanLemma || sourceCandidate.korean || "";
      return korean.length === 0
        ? null
        : {
          korean,
          canonicalKorean: sourceCandidate.koreanLemma || korean,
          koreanPos: sourceCandidate.koreanPos,
          entry: sourceCandidate.entry,
          sourceCandidateIdx: candidateIdx,
          sourceCandidate
        };
    })
    .filter((candidate): candidate is NominalHeadResolutionCandidatePayload => candidate !== null);
}

function nominalHeadLexicalForms(
  selected: NominalHeadResolutionCandidatePayload | null,
  headResult: ContentResult
): NominalHeadLexicalForms | null {
  const sense = selected?.sourceCandidate.translation ??
    selectedNominalHeadCandidate(headResult)?.translation ??
    headResult.entry?.senses?.[0];
  const kaForm = sense?.kaForm;
  return kaForm === undefined || kaForm.length === 0 ? null : { kaForm };
}

function nominalHeadResolutionKorean(headResult: ContentResult): string {
  const selected = selectedNominalHeadCandidate(headResult);
  if (selected !== null) {
    return selected.koreanLemma || selected.korean || "";
  }
  const cached = contentResultKoreanCache(headResult);
  if (cached.length > 0) {
    return cached;
  }
  return headResult.entry?.senses?.[0]?.korean ?? "";
}

function activeSahenAdjustedContentResult(
  tokens: readonly RuntimeHaruToken[],
  hostTokenIdx: number,
  result: ContentResult
): ContentResult {
  const metadata = activeSahenAdjustedContentHeadHydrationMetadata(
    tokens,
    hostTokenIdx,
    contentHeadHydrationMetadataFromResult(result)
  );
  if (metadata.sourceCandidates === result.sourceCandidates) {
    return result;
  }
  if (!isResolvedCandidateSet(metadata.sourceCandidates)) {
    return new StagedContentResult(
      result.consumed,
      metadata.entry,
      result.renderPlan,
      result.voice,
      result.rareruReadings,
      result.nareruReadings,
      result.dekiruReadings,
      result.hasNegative,
      result.hasCausative,
      result.hasCausativePassive,
      result.hasRequestTail,
      result.hasBenefactiveTail,
      result.connectiveRole,
      result.benefactive,
      metadata.sourceCandidates,
      result.warnings,
      result.renderPlanPolicy
    );
  }
  const selected = metadata.sourceCandidates.winner.candidate;
  return new ResolvedContentResult(
    result.consumed,
    selected.korean ?? contentResultKoreanCache(result),
    selected.koreanPos ?? contentResultKoreanPos(result) ?? 명사,
    metadata.entry,
    result.renderPlan,
    result.voice,
    result.rareruReadings,
    result.nareruReadings,
    result.dekiruReadings,
    result.hasNegative,
    result.hasCausative,
    result.hasCausativePassive,
    result.hasRequestTail,
    result.hasBenefactiveTail,
    result.connectiveRole,
    result.benefactive,
    metadata.sourceCandidates,
    result.warnings,
    result.renderPlanPolicy
  );
}

function nominalHeadResolutionCanonicalKorean(headResult: ContentResult): string {
  const selected = selectedNominalHeadCandidate(headResult);
  if (selected !== null) {
    return selected.koreanLemma || selected.korean || "";
  }
  const cached = contentResultKoreanCache(headResult);
  return cached.length > 0
    ? cached
    : headResult.entry?.senses?.[0]?.korean ?? "";
}

function selectedNominalHeadCandidate(headResult: ContentResult): TranslationCandidate | null {
  const set = headResult.sourceCandidates;
  return isResolvedCandidateSet(set) ? set.winner.candidate : null;
}

function nominalHeadSelectedCandidateIdx(
  tokens: readonly RuntimeHaruToken[],
  hostTokenIdx: number,
  headResult: ContentResult,
  candidates: readonly NominalHeadResolutionCandidatePayload[]
): number | null {
  const set = commitmentLaneCandidateSet(headResult.sourceCandidates);
  const winnerIdx = isResolvedCandidateSet(set) ? set.members.indexOf(set.winner) : null;
  if (!hasActiveSahenLightVerbProjection(tokens, hostTokenIdx)) {
    return winnerIdx;
  }
  const nonPassive = candidates.find((candidate) =>
    candidate.sourceCandidate.translation.dropFirstPassiveAux !== true
  );
  return nonPassive?.sourceCandidateIdx ?? winnerIdx;
}

function activeSahenAdjustedContentHeadHydrationMetadata(
  tokens: readonly RuntimeHaruToken[],
  hostTokenIdx: number,
  metadata: ContentHeadHydrationMetadata
): ContentHeadHydrationMetadata {
  if (!hasActiveSahenLightVerbProjection(tokens, hostTokenIdx)) {
    return metadata;
  }
  const laneSet = commitmentLaneCandidateSet(metadata.sourceCandidates);
  const hasNonPassiveMember = candidateSetMembers(laneSet).some((member) =>
    member.candidate.translation.dropFirstPassiveAux !== true
  );
  const candidateSet: SourceCandidateSet<TranslationCandidate> | null = hasNonPassiveMember
    ? laneSet
    : createSourceCandidateSet<TranslationCandidate>(
      nominalHeadEntryCandidates(metadata.entry).map((candidate) => stagedCandidate(candidate, "unknown")),
      { sharedConsumed: candidateSetSharedConsumed(laneSet, 1) }
    );
  if (candidateSet === null) {
    return metadata;
  }
  const narrowed = transformCandidateSet<TranslationCandidate>(candidateSet, {
    map: (member) => member.candidate.translation.dropFirstPassiveAux !== true
      ? keepCandidate(member)
      : dropCandidate("construction_ineligible"),
    failClosedReason: "all_members_dropped"
  });
  return narrowed.state === "fail_closed" ? metadata : { ...metadata, sourceCandidates: narrowed };
}

function candidateWithOnlySenseEntry(candidate: TranslationCandidate): TranslationCandidate {
  return {
    ...candidate,
    entry: { ...candidate.entry, senses: [candidate.translation] }
  };
}

function nominalHeadEntryCandidates(entry: MorphemeEntry | null): readonly ContentTranslationCandidate[] {
  const senses = entry?.senses ?? [];
  if (entry === null || senses.length <= 1) {
    return [];
  }
  const projectionOrdinals = translationCandidateProjectionOrdinals(entry, senses);
  return senses.map((translation, index) => {
    const candidate = translationCandidateFromDict(entry, translation, {
      priority: index,
      conditions: normalizeCandidateConditions(null),
      projectionOrdinal: projectionOrdinals[index]!
    });
    return contentTranslationCandidateFrom(candidateWithOnlySenseEntry(candidate));
  });
}

function predicateHostTailAssemblyMetadata(
  built: NominalTailChainBuildResult,
  options: NominalTailChainAssemblyBridgeOptions
): Partial<NominalTailChainAssemblyDescriptor> {
  const plan = built.plan;
  if (plan.realization.root.kind !== "predicateNominalHost" || built.predicateHostHeadResult === undefined) {
    return {};
  }
  const root = plan.realization.root.host.root;
  const headResult = built.predicateHostHeadResult;
  const fallbackVoiceReadings = headResult.rareruReadings ?? new Set<RareruReading>();
  const voiceReadings = tailRootRareruReadings(root, fallbackVoiceReadings);
  const voiceOpen = tailRootVoiceOpen({
    root,
    fallbackVoice: headResult.voice,
    readings: voiceReadings,
    tokens: options.cursor.tokens,
    index: options.cursor.pos,
    lookups: options.lookups
  });
  const tailHasRequest = tailRootHasRequestTail(root);
  const tailBenefactive = tailRootBenefactiveContext(root);
  return {
    voice: voiceOpen ? null : tailRootSpanVoice(root, headResult.voice, voiceReadings),
    rareruReadings: voiceReadings,
    nareruReadings: headResult.nareruReadings,
    dekiruReadings: headResult.dekiruReadings,
    hasNegative: headResult.hasNegative,
    hasCausative: headResult.hasCausative,
    hasCausativePassive: headResult.hasCausativePassive,
    hasRequestTail: tailHasRequest || headResult.hasRequestTail,
    hasBenefactiveTail: tailHasRequest || tailBenefactive !== undefined || headResult.hasBenefactiveTail,
    connectiveRole: headResult.connectiveRole,
    benefactive: tailBenefactive ?? headResult.benefactive ?? null
  };
}

export function explainNominalTailChainAssemblyBridgeBlock(
  options: NominalTailChainAssemblyBridgeOptions
): NominalTailChainAssemblyBridgeBlockResult | null {
  return explainNominalTailChainBlock({
    tokens: options.cursor.tokens,
    cursor: options.cursor.fork(options.cursor.pos, options.limit ?? options.cursor.end),
    lookups: options.lookups,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
}
