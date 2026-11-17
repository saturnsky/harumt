import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { MorphemeDictionary } from "../../../dictionary/morpheme.js";
import type { MorphemeEntry } from "../../../types/dictionary.js";
import type { RenderPlan } from "../../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { ContentResult } from "../../content-types.js";
import type { ContentHeadHydrationMetadata } from "./content-head-metadata.js";
import type {
  HeadOwnerCandidateCommitmentPayload,
  HeadOwnerCandidateCommitmentPayloadSlot
} from "../../deferred-commitment.js";
import type { ProjectionEvidenceLayout } from "../../clause-layout/index.js";
import type { TraceDetailValue } from "../../trace.js";
import { tailChunkCandidateObservationTraceValue } from "../tail/predicate-root/trace.js";
import type { TailRoot } from "../tail/predicate-root/grammar.js";
import { predicateSuffixKindForDictionaryForm } from "../tail/predicate-root/derivational-suffix-table.js";
import type { TailChainAssemblyDescriptor } from "./tail-assembly.js";
import type { UnitType } from "../../translation/unit.js";
import {
  collectHeadProfileContinuationCapabilities,
  COMMITMENT_FALLBACK_PROFILE_ORDER,
  type HeadProfileArbitrationDecision,
  type HeadProfileDispatchMetadata,
  type HeadTailCandidateTraceDescriptor,
  type HeadOwnerCandidateDescriptor,
  type HeadContinuationCapability,
  type HeadOwnerEvidencePolicyDescriptor,
  type HeadProfileDescriptor,
  type HeadProfileMatch,
  headProfileArbitrationTraceDetail,
  headTailCandidateTraceValue,
  selectCandidateByOwnerEvidenceDecisionOrder
} from "../head/profile.js";
import type { HeadTailCandidate } from "../tail/chain.js";
import {
  defineHeadFamilyRunner,
  type HeadFamilyRegistration,
  type HeadFamilyRunnerDescriptor
} from "../head/family-runner.js";
import {
  attachHeadOwnerCandidateSetToSpan,
  type HeadOwnerCandidateSetWritableSpan
} from "../candidate/owner-payload.js";
import {
  bareStemNominalUseSlotVerdictPolicies,
  predicateTailOwnerEvidencePolicies,
  predicateTailOwnerEvidence,
  sourceBearingNominalFrameOwnerEvidencePolicies,
  sourceBearingNominalFrameOwnerEvidence
} from "../candidate/evidence.js";
import {
  explainNominalTailChainAssemblyBridgeBlock,
  tryBuildNominalTailChainAssemblyBridge,
  type NominalTailChainAssemblyBridgeBlockResult,
  type NominalTailChainAssemblyBridgeResult,
  type NominalTailChainAssemblyDescriptor
} from "./nominal-assembly.js";
import { collectSharedHeadedContentCandidates } from "../candidate/collect.js";
import { describeNominalTailChainProfiles } from "../head/adapters/nominal/integration.js";
import { firstAuxLayer } from "../tail/predicate-root/inspect.js";
import { opChainCanHostBareNounStemBeforeCommitment } from "../tail/predicate-root/bare-noun-stem-hosting.js";
import {
  describePredicateTailHeadProfiles,
  profileParsedTailHeadChunk,
  tryParseTailHeadProfileChunk,
  type TailChunkCandidateObservation,
  type TailChunkIntakeVerdict,
  type PredicateTailSyntheticEntryResolver,
  type TailChunkResult,
  type TailHeadProfileChunkResult
} from "../tail/predicate-root/integration.js";
import type { BenefactiveContext, DekiruReading, NareruReading, RareruReading } from "../../../types/pipeline.js";

import type { Voice } from "../../../types/render-plan.js";
import type { TokenCursor } from "../../token-cursor.js";

import { 구, 명사, isAdjectivalDerivationalSuffix } from "../../../types/pos.js";
import type { NumericHostReservation } from "../tail/predicate-root/integration.js";
interface ContentHeadDispatchContext {
  readonly build: () => ContentHeadBuildPayload | null | Promise<ContentHeadBuildPayload | null>;
}

export interface ContentHeadDispatchOptions {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly limit?: number;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly layout?: ProjectionEvidenceLayout;
  readonly synthesizeEntry?: PredicateTailSyntheticEntryResolver;
  readonly resolveNominalHeadMetadata: (start: number, end: number) => ContentResult | Promise<ContentResult>;
  readonly hydrateTailRoot: (root: TailRoot, headResult: ContentHeadHydrationMetadata, predicateTokenIdx: number) => TailRoot | Promise<TailRoot>;
  readonly numericHostReservation?: NumericHostReservation;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

export type ContentHeadDispatchResult =
  | ({
      readonly kind: "nominal";
      readonly built: NominalTailChainAssemblyBridgeResult;
      readonly payloadCandidates: readonly ContentHeadPayloadCandidate[];
      readonly ownerCandidates: readonly HeadOwnerCandidateDescriptor[];
      readonly sharedHeadTailCandidates: readonly HeadTailCandidateTraceDescriptor[];
      readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
    } & HeadProfileDispatchMetadata<ContentHeadBuildPayload>)
  | ({
      readonly kind: "tail";
      readonly tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
      readonly payloadCandidates: readonly ContentHeadPayloadCandidate[];
      readonly ownerCandidates: readonly HeadOwnerCandidateDescriptor[];
      readonly sharedHeadTailCandidates: readonly HeadTailCandidateTraceDescriptor[];
      readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
      readonly nominalBlock: NominalTailChainAssemblyBridgeBlockResult | null;
    } & HeadProfileDispatchMetadata<ContentHeadBuildPayload>)
  | {
      readonly kind: "none";
      readonly reason: string;
      readonly predicateIntake?: TailChunkIntakeVerdict;
      readonly tailObservation?: TailChunkCandidateObservation;
      readonly dispatchDecision: HeadProfileArbitrationDecision<ContentHeadBuildPayload>;
      readonly sharedHeadTailCandidates: readonly HeadTailCandidateTraceDescriptor[];
      readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
      readonly nominalBlock: NominalTailChainAssemblyBridgeBlockResult | null;
    };

export type ContentHeadDispatchMatchedResult = Extract<ContentHeadDispatchResult, { readonly kind: "nominal" | "tail" }>;
type ContentHeadDispatchNominalResult = Extract<ContentHeadDispatchResult, { readonly kind: "nominal" }>;

type ContentHeadPayloadCandidate =
  | {
      readonly kind: "nominal";
      readonly profile: HeadProfileDescriptor;
      readonly built: NominalTailChainAssemblyBridgeResult;
      readonly requiredContinuationCapabilityIds: readonly string[];
      readonly ownerCandidate: HeadOwnerCandidateDescriptor;
    }
  | {
      readonly kind: "tail";
      readonly profile: HeadProfileDescriptor;
      readonly tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
      readonly requiredContinuationCapabilityIds: readonly string[];
      readonly ownerCandidate: HeadOwnerCandidateDescriptor;
    };

export interface ContentHeadTailCandidateRecord {
  readonly candidate: HeadTailCandidate;
  readonly descriptor: HeadTailCandidateTraceDescriptor;
}

function sharedPredicateRootTailChunkAt(
  records: readonly ContentHeadTailCandidateRecord[],
  index: number
): Extract<TailChunkResult, { readonly ok: true }> | null {
  for (const record of records) {
    const tail = record.candidate.tail;
    if (
      tail.realization.kind === "predicate_root" &&
      tail.tailRootStart === index &&
      record.candidate.sourceSpan.start === index
    ) {
      return tail.realization.tailChunk;
    }
  }
  return null;
}

export interface ContentHeadOwnerCandidatePayloadSlotOptions {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly dispatchIndex: number;
  readonly selectedSpanStart: number;
  readonly contentHead: ContentHeadDispatchMatchedResult;
  readonly selectedNominalPayload?: ContentHeadAppendPayload;
  readonly selectedTailDescriptor?: TailChainAssemblyDescriptor;
  readonly buildTailPayloadSource: (
    tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>
  ) => { readonly start: number; readonly descriptor: TailChainAssemblyDescriptor } | null | Promise<{ readonly start: number; readonly descriptor: TailChainAssemblyDescriptor } | null>;
}

export type ContentHeadOwnerCandidateLifecycleSpan = HeadOwnerCandidateSetWritableSpan;

export interface ContentHeadOwnerCandidateLifecycleOptions extends ContentHeadOwnerCandidatePayloadSlotOptions {
  readonly span: ContentHeadOwnerCandidateLifecycleSpan;
  readonly applyDispatchDefault?: boolean;
}

export interface ContentHeadAppendPayload {
  readonly consumed: number;
  readonly korean: "";
  readonly koreanBase?: string | null;
  readonly koreanPos: NominalTailChainAssemblyDescriptor["koreanPos"];
  readonly entry: MorphemeEntry | null;
  readonly unitType: UnitType.CONTENT;
  readonly attachLeft: false;
  readonly provenance: "nominal_head";
  readonly renderPlan: RenderPlan;
  readonly previewPlan: RenderPlan;
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
  readonly sourceCandidates?: HeadOwnerCandidateCommitmentPayload["sourceCandidates"];
}

type ContentHeadBuildPayload =
  ({
      readonly kind: "nominal";
      readonly built: NominalTailChainAssemblyBridgeResult;
    }
  | {
      readonly kind: "tail";
      readonly tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
    }) & {
      readonly payloadCandidates: readonly ContentHeadPayloadCandidate[];
      readonly selectedPayloadCandidateIndex: number;
      readonly requiredContinuationCapabilityIds: readonly string[];
    };

let _nominalContentHeadOwnerProfile: HeadProfileDescriptor | undefined;
function getNominalContentHeadOwnerProfile(): HeadProfileDescriptor {
  _nominalContentHeadOwnerProfile ??= {
    id: "nominal_head_tail_candidate",
    fallbackOrderKey: "nominal_head_tail_candidate",
    owner: "nominal_head",
    continuationCapabilities: collectHeadProfileContinuationCapabilities(describeNominalTailChainProfiles()),
    ownerEvidencePolicies: sourceBearingNominalFrameOwnerEvidencePolicies()
  };
  return _nominalContentHeadOwnerProfile;
}

let _predicateContentHeadOwnerProfile: HeadProfileDescriptor | undefined;
function getPredicateContentHeadOwnerProfile(): HeadProfileDescriptor {
  _predicateContentHeadOwnerProfile ??= {
    id: "predicate_root_tail_candidate",
    fallbackOrderKey: "predicate_root_tail_candidate",
    owner: "predicate_tail",
    continuationCapabilities: collectHeadProfileContinuationCapabilities(describePredicateTailHeadProfiles()),
    ownerEvidencePolicies: predicateTailOwnerEvidencePolicies()
  };
  return _predicateContentHeadOwnerProfile;
}

let _contentHeadDispatchContinuationCapabilities: readonly HeadContinuationCapability[] | undefined;
function getContentHeadDispatchContinuationCapabilities(): readonly HeadContinuationCapability[] {
  _contentHeadDispatchContinuationCapabilities ??= uniqueContinuationCapabilities([
    ...getNominalContentHeadOwnerProfile().continuationCapabilities,
    ...getPredicateContentHeadOwnerProfile().continuationCapabilities
  ]);
  return _contentHeadDispatchContinuationCapabilities;
}

let _contentHeadDispatchOwnerEvidencePolicies: readonly HeadOwnerEvidencePolicyDescriptor[] | undefined;
function getContentHeadDispatchOwnerEvidencePolicies(): readonly HeadOwnerEvidencePolicyDescriptor[] {
  _contentHeadDispatchOwnerEvidencePolicies ??= [
    ...(getNominalContentHeadOwnerProfile().ownerEvidencePolicies ?? []),
    ...(getPredicateContentHeadOwnerProfile().ownerEvidencePolicies ?? [])
  ];
  return _contentHeadDispatchOwnerEvidencePolicies;
}

function uniqueContinuationCapabilities(
  capabilities: readonly HeadContinuationCapability[]
): readonly HeadContinuationCapability[] {
  const byId = new Map<string, HeadContinuationCapability>();
  for (const capability of capabilities) {
    const existing = byId.get(capability.id);
    if (existing === undefined) {
      byId.set(capability.id, capability);
      continue;
    }
    const mergedSurfaces = [...existing.surfaces];
    for (const surface of capability.surfaces) {
      if (!mergedSurfaces.includes(surface)) {
        mergedSurfaces.push(surface);
      }
    }
    byId.set(capability.id, { ...existing, surfaces: mergedSurfaces });
  }
  return [...byId.values()];
}

let _contentHeadDispatchRunner: ReturnType<typeof defineHeadFamilyRunner<ContentHeadDispatchContext, ContentHeadBuildPayload>> | undefined;
function getContentHeadDispatchRunner() {
  if (_contentHeadDispatchRunner === undefined) {
    const families: readonly HeadFamilyRegistration<ContentHeadDispatchContext, ContentHeadBuildPayload>[] = [
      {
        id: "head_tail_candidate_entry",
        owner: "head_tail",
        continuationCapabilities: getContentHeadDispatchContinuationCapabilities(),
        ownerEvidencePolicies: getContentHeadDispatchOwnerEvidencePolicies(),
        requiredContinuationCapabilityIds: (result) => result.requiredContinuationCapabilityIds,
        tryBuild: (context) => context.build(),
        ownerCandidate: ({ match, selectedProfileId, dispatchStart }) =>
          selectedContentHeadCandidateOwnerCandidate(match, selectedProfileId, dispatchStart)
      }
    ] as const;
    _contentHeadDispatchRunner = defineHeadFamilyRunner({
      id: "content_head_dispatch",
      families,
      allowArbitrationGroupTies: true
    });
  }
  return _contentHeadDispatchRunner;
}

export function describeContentHeadDispatchProfiles(): readonly HeadProfileDescriptor[] {
  return getContentHeadDispatchRunner().describe();
}

export function describeContentHeadDispatchRunner(): HeadFamilyRunnerDescriptor {
  return getContentHeadDispatchRunner().describeRunner();
}

export async function tryBuildContentHeadDispatch(options: ContentHeadDispatchOptions): Promise<ContentHeadDispatchResult> {
  const { tokens, pos: index } = options.cursor;
  const limit = options.limit ?? options.cursor.end;
  let nominalCache: Promise<NominalTailChainAssemblyBridgeResult | null> | undefined;
  let nominalBlockCache: NominalTailChainAssemblyBridgeBlockResult | null | undefined;
  let tailCache: Promise<TailHeadProfileChunkResult> | undefined;
  const nominalOptions = {
    cursor: options.cursor,
    limit,
    dictionary: options.dictionary,
    previewFormal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.numericHostReservation === undefined
      ? {}
      : { numericHostReservation: options.numericHostReservation }),
    ...(options.layout === undefined ? {} : { layout: options.layout }),
    resolveHeadMetadata: options.resolveNominalHeadMetadata,
    hydrateTailRoot: options.hydrateTailRoot
  };
  const tailInput = {
    tokens,
    cursor: options.cursor,
    dictionary: options.dictionary,
    formal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.synthesizeEntry === undefined ? {} : { synthesizeEntry: options.synthesizeEntry }),
    ...(options.numericHostReservation === undefined ? {} : { numericHostReservation: options.numericHostReservation })
  };
  const sharedHeadTail = await collectSharedHeadedContentCandidates({
    cursor: options.cursor.fork(options.cursor.pos, limit, options.cursor.origin),
    dictionary: options.dictionary,
    previewFormal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.synthesizeEntry === undefined ? {} : { synthesizeEntry: options.synthesizeEntry }),
    ...(options.numericHostReservation === undefined ? {} : { numericHostReservation: options.numericHostReservation }),
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  const sharedHeadTailCandidates = sharedHeadTail.descriptors;
  const sharedHeadTailCandidateRecords = sharedHeadTail.candidates.map((candidate, candidateIndex) => ({
    candidate,
    descriptor: sharedHeadTailCandidates[candidateIndex]!
  }));
  const nominal = () => {
    nominalCache ??= tryBuildNominalTailChainAssemblyBridge(nominalOptions);
    return nominalCache;
  };
  const tail = () => {
    tailCache ??= (async () => {
      const sharedTailChunk = sharedPredicateRootTailChunkAt(sharedHeadTailCandidateRecords, index);
      if (sharedTailChunk !== null) {
        return await profileParsedTailHeadChunk(tailInput, index, sharedTailChunk);
      }
      return await tryParseTailHeadProfileChunk(tailInput, index, { maxEndExclusive: limit });
    })();
    return tailCache;
  };
  const context: ContentHeadDispatchContext = {
    build: () => buildContentHeadCandidatePayload({
      tokens,
      lookups: options.lookups,
      nominal,
      tail,
      dispatchStart: index,
      sharedHeadTailCandidateRecords
    })
  };
  const decision = await getContentHeadDispatchRunner().arbitrate(context);
  const ownerCandidates = decision.winner?.result.payloadCandidates.map((candidate) => candidate.ownerCandidate) ?? [];
  const selection = getContentHeadDispatchRunner().select(decision, { ownerCandidates });
  if (selection !== null) {
    const result = {
      ...selection.match.result,
      ...selection.metadata,
      ownerCandidates,
      sharedHeadTailCandidates,
      sharedHeadTailCandidateRecords
    };
    if (result.kind === "tail") {
      nominalBlockCache ??= explainNominalTailChainAssemblyBridgeBlock(nominalOptions);
      return {
        ...result,
        nominalBlock: nominalBlockCache
      };
    }
    return result;
  }
  const tailResult = await tail();
  nominalBlockCache ??= explainNominalTailChainAssemblyBridgeBlock(nominalOptions);
  return {
    kind: "none",
    reason: nominalBlockCache?.block.reason ?? (tailResult.ok ? "content head dispatch profile not matched" : tailResult.reason),
    ...(tailResult.ok || tailResult.intake === undefined ? {} : { predicateIntake: tailResult.intake }),
    ...(tailResult.ok
      ? tailResult.candidateObservation === undefined ? {} : { tailObservation: tailResult.candidateObservation }
      : tailResult.observation === undefined ? {} : { tailObservation: tailResult.observation }),
    dispatchDecision: decision,
    sharedHeadTailCandidates,
    sharedHeadTailCandidateRecords,
    nominalBlock: nominalBlockCache
  };
}

export function contentHeadSelectedHeadTailCandidate(
  result: ContentHeadDispatchMatchedResult
): HeadTailCandidate | null {
  return selectedContentHeadTailCandidateRecord(result)?.candidate ?? null;
}

export function contentHeadSelectedHeadTailCandidateDescriptor(
  result: ContentHeadDispatchMatchedResult
): HeadTailCandidateTraceDescriptor | null {
  return selectedContentHeadOwnerCandidate(result)?.headTailCandidate ?? null;
}

export function attachContentHeadSharedHeadTailCandidateToPlan(
  result: ContentHeadDispatchMatchedResult,
  plan: RenderPlan | null | undefined
): void {
  const record = selectedContentHeadTailCandidateRecord(result);
  if (
    record === null ||
    plan?.kind !== "headTailChain"
  ) {
    return;
  }
  const writable = plan as {
    headTailCandidate?: HeadTailCandidateTraceDescriptor;
    headTailSourceCandidate?: HeadTailCandidate;
  };
  writable.headTailCandidate = record.descriptor;
  writable.headTailSourceCandidate = contentHeadSourceCandidateForPlan(record.candidate, plan);
}

function contentHeadSourceCandidateForPlan(candidate: HeadTailCandidate, plan: RenderPlan): HeadTailCandidate {
  const realization = candidate.tail.realization;
  if (
    plan.kind !== "headTailChain" ||
    plan.realization.kind !== "predicate" ||
    realization.kind !== "predicate_root"
  ) {
    return candidate;
  }
  const planRoot = plan.realization.root;
  const tail = {
    ...candidate.tail,
    realization: {
      ...realization,
      root: planRoot,
      tailChunk: {
        ...realization.tailChunk,
        root: planRoot
      }
    }
  };
  return {
    ...candidate,
    tail
  };
}

export function contentHeadDispatchTraceDetail(
  result: ContentHeadDispatchMatchedResult
): { readonly [key: string]: TraceDetailValue } {
  return {
    ...result.traceDetail,
    shared_head_tail_candidates: result.sharedHeadTailCandidates.map(headTailCandidateTraceValue),
    ...(result.kind !== "tail" || result.nominalBlock === null
      ? {}
      : {
          nominal_owner_block: {
            profile: result.nominalBlock.profile.id,
            kind: result.nominalBlock.block.kind,
            reason: result.nominalBlock.block.reason
          }
        })
  };
}

export function contentHeadDispatchFailureTraceDetail(
  result: Extract<ContentHeadDispatchResult, { readonly kind: "none" }>
): { readonly [key: string]: TraceDetailValue } {
  return {
    reason: result.reason,
    ...(result.predicateIntake === undefined ? {} : { predicate_intake: result.predicateIntake }),
    ...headProfileArbitrationTraceDetail({
      decision: result.dispatchDecision
    }),
    shared_head_tail_candidates: result.sharedHeadTailCandidates.map(headTailCandidateTraceValue),
    ...(result.nominalBlock === null
      ? {}
      : {
          nominal_owner_block: {
            profile: result.nominalBlock.profile.id,
            kind: result.nominalBlock.block.kind,
            reason: result.nominalBlock.block.reason
          }
        }),
    ...(result.tailObservation === undefined
      ? {}
      : { tail_candidate_observation: tailChunkCandidateObservationTraceValue(result.tailObservation) })
  };
}

function selectedContentHeadOwnerCandidate(
  result: ContentHeadDispatchMatchedResult
): HeadOwnerCandidateDescriptor | null {
  return result.ownerCandidates.find((candidate) => candidate.selectedByDispatch) ?? null;
}

function selectedContentHeadTailCandidateRecord(
  result: ContentHeadDispatchMatchedResult
): ContentHeadTailCandidateRecord | null {
  const descriptor = contentHeadSelectedHeadTailCandidateDescriptor(result);
  if (descriptor === null) {
    return null;
  }
  return result.sharedHeadTailCandidateRecords.find((record) => record.descriptor === descriptor) ?? null;
}

function matchingSharedHeadTailCandidate(
  ownerCandidate: Pick<HeadOwnerCandidateDescriptor, "sourceSpan" | "requiredContinuationCapabilityIds">,
  sharedHeadTailCandidates: readonly HeadTailCandidateTraceDescriptor[]
): HeadTailCandidateTraceDescriptor | undefined {
  const sameSpan = sharedHeadTailCandidates.filter((candidate) =>
    candidate.sourceSpan.start === ownerCandidate.sourceSpan.start &&
    candidate.sourceSpan.endExclusive === ownerCandidate.sourceSpan.endExclusive
  );
  if (sameSpan.length === 0) {
    return undefined;
  }
  const requiredCapabilities = ownerCandidate.requiredContinuationCapabilityIds;
  if (requiredCapabilities.length === 0) {
    return sameSpan.length === 1 ? sameSpan[0] : undefined;
  }
  const capabilityMatches = sameSpan.filter((candidate) =>
    ownerCandidate.requiredContinuationCapabilityIds.every((capabilityId) =>
      candidate.requiredContinuationCapabilityIds.includes(capabilityId)
    )
  );
  return capabilityMatches.length === 1 ? capabilityMatches[0] : undefined;
}

function selectedContentHeadCandidateOwnerCandidate(
  candidate: HeadProfileMatch<ContentHeadBuildPayload>,
  selectedProfileId: string | null,
  start: number
): HeadOwnerCandidateDescriptor {
  return candidate.result.payloadCandidates[candidate.result.selectedPayloadCandidateIndex]?.ownerCandidate ?? {
    kind: candidate.result.kind,
    profile: candidate.profile,
    planKind: "headTailChain",
    sourceSpan: { start, endExclusive: start },
    requiredContinuationCapabilityIds: candidate.requiredContinuationCapabilityIds,
    selectedByDispatch: candidate.profile.id === selectedProfileId
  };
}

async function buildContentHeadCandidatePayload(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly nominal: () => NominalTailChainAssemblyBridgeResult | null | Promise<NominalTailChainAssemblyBridgeResult | null>;
  readonly tail: () => TailHeadProfileChunkResult | Promise<TailHeadProfileChunkResult>;
  readonly dispatchStart: number;
  readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
}): Promise<ContentHeadBuildPayload | null> {
  const rawCandidates = await collectContentHeadPayloadCandidates(options);
  if (rawCandidates.length === 0) {
    return null;
  }
  const selectedPayloadCandidateIndex = selectContentHeadPayloadCandidateIndex(rawCandidates);
  const payloadCandidates = rawCandidates.map((candidate, index) =>
    finalizeContentHeadPayloadCandidate(candidate, index === selectedPayloadCandidateIndex)
  );
  const selected = payloadCandidates[selectedPayloadCandidateIndex]!;
  const base = {
    payloadCandidates,
    selectedPayloadCandidateIndex,
    requiredContinuationCapabilityIds: selected.requiredContinuationCapabilityIds
  };
  return selected.kind === "nominal"
    ? { kind: "nominal", built: selected.built, ...base }
    : { kind: "tail", tailChunk: selected.tailChunk, ...base };
}

type RawContentHeadPayloadCandidate =
  | {
      readonly kind: "nominal";
      readonly profile: HeadProfileDescriptor;
      readonly built: NominalTailChainAssemblyBridgeResult;
      readonly requiredContinuationCapabilityIds: readonly string[];
      readonly commitmentEvidence: readonly ReturnType<typeof sourceBearingNominalFrameOwnerEvidence>[number][];
      readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
    }
  | {
      readonly kind: "tail";
      readonly profile: HeadProfileDescriptor;
      readonly tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
      readonly dispatchStart: number;
      readonly requiredContinuationCapabilityIds: readonly string[];
      readonly commitmentEvidence: readonly ReturnType<typeof predicateTailOwnerEvidence>[number][];
      readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
    };

async function collectContentHeadPayloadCandidates(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly lookups: LookupTables;
  readonly nominal: () => NominalTailChainAssemblyBridgeResult | null | Promise<NominalTailChainAssemblyBridgeResult | null>;
  readonly tail: () => TailHeadProfileChunkResult | Promise<TailHeadProfileChunkResult>;
  readonly dispatchStart: number;
  readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
}): Promise<readonly RawContentHeadPayloadCandidate[]> {
  const candidates: RawContentHeadPayloadCandidate[] = [];
  const sharedHeadTailCandidates = options.sharedHeadTailCandidateRecords.map((record) => record.descriptor);
  const nominal = await yieldRenyouNominalHeadToPredicateClaim(await options.nominal(), options.tail, options.tokens, options.lookups);
  if (nominal !== null) {
    const plan = nominal.plan;
    const ownerCandidate = nominalContentHeadOwnerCandidateFromPayload({
      profile: getNominalContentHeadOwnerProfile(),
      built: nominal,
      requiredContinuationCapabilityIds: nominal.requiredContinuationCapabilityIds,
      selectedByDispatch: false,
      sharedHeadTailCandidates
    });
    candidates.push({
      kind: "nominal",
      profile: getNominalContentHeadOwnerProfile(),
      built: nominal,
      requiredContinuationCapabilityIds: nominal.requiredContinuationCapabilityIds,
      commitmentEvidence: sourceBearingNominalFrameOwnerEvidence(plan.realization.root.kind),
      ...(ownerCandidate.headTailCandidate === undefined ? {} : { headTailCandidate: ownerCandidate.headTailCandidate })
    });
  }
  const tail = await options.tail();
  if (tail.ok && shouldExposePredicateTailPayload({
    tokens: options.tokens,
    tail,
    dispatchStart: options.dispatchStart,
    sharedHeadTailCandidateRecords: options.sharedHeadTailCandidateRecords
  })) {
    const ownerCandidate = tailContentHeadOwnerCandidateFromPayload({
      profile: getPredicateContentHeadOwnerProfile(),
      tailChunk: tail,
      dispatchStart: options.dispatchStart,
      requiredContinuationCapabilityIds: tail.requiredContinuationCapabilityIds,
      selectedByDispatch: false,
      sharedHeadTailCandidates
    });
    candidates.push({
      kind: "tail",
      profile: getPredicateContentHeadOwnerProfile(),
      tailChunk: tail,
      dispatchStart: options.dispatchStart,
      requiredContinuationCapabilityIds: tail.requiredContinuationCapabilityIds,
      commitmentEvidence: predicateTailOwnerEvidence({
        rootKind: tail.root.tail.kind,
        requiredContinuationCapabilityIds: tail.requiredContinuationCapabilityIds,
        weakAttachment: tail.partial?.decision === "weak_attachment_warning"
      }),
      ...(ownerCandidate.headTailCandidate === undefined ? {} : { headTailCandidate: ownerCandidate.headTailCandidate })
    });
  }
  return candidates;
}

async function yieldRenyouNominalHeadToPredicateClaim(
  nominal: NominalTailChainAssemblyBridgeResult | null,
  tail: () => TailHeadProfileChunkResult | Promise<TailHeadProfileChunkResult>,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): Promise<NominalTailChainAssemblyBridgeResult | null> {
  const root = nominal?.plan.realization.root;
  if (nominal === null || root?.kind !== "renyouNominalHead") {
    return nominal;
  }
  const predicate = await tail();
  if (!predicate.ok || predicate.consumed < nominal.consumed) {
    return nominal;
  }
  switch (root.evidence.kind) {
    case "derivational_suffix":
    case "noun_compound_suffix":
    case "lexical_noun_compound":
    case "bare_case_particle":
      return null;
    case "honorific_prefix":
    case "honorific_prefix_compound": {
      const layer = firstAuxLayer(predicate.root.tail);
      return layer !== null && opChainCanHostBareNounStemBeforeCommitment(layer.ops, tokens, lookups) ? null : nominal;
    }
  }
}

function shouldExposePredicateTailPayload(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tail: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
  readonly dispatchStart: number;
  readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
}): boolean {
  if (options.tail.partial?.decision === "weak_attachment_warning") {
    return true;
  }
  if (hasUnconsumedPredicateSuffixContinuation(options)) {
    return false;
  }
  if (hasWiderPredicateSuffixOwnerCandidate(options)) {
    return false;
  }
  if (options.sharedHeadTailCandidateRecords.length === 0) {
    return true;
  }
  const endExclusive = options.dispatchStart + options.tail.consumed;
  const matchingPredicateRootCandidates = options.sharedHeadTailCandidateRecords.filter((record) =>
    record.candidate.tail.realization.kind === "predicate_root" &&
    record.candidate.sourceSpan.start === options.dispatchStart &&
    record.candidate.sourceSpan.endExclusive === endExclusive
  );
  if (matchingPredicateRootCandidates.length === 0) {
    return true;
  }
  return matchingPredicateRootCandidates.some((record) => record.candidate.head.kind !== "nominal");
}

function hasWiderPredicateSuffixOwnerCandidate(options: {
  readonly tail: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
  readonly dispatchStart: number;
  readonly sharedHeadTailCandidateRecords: readonly ContentHeadTailCandidateRecord[];
}): boolean {
  const endExclusive = options.dispatchStart + options.tail.consumed;
  return options.sharedHeadTailCandidateRecords.some((record) =>
    record.candidate.sourceSpan.start === options.dispatchStart &&
    record.candidate.sourceSpan.endExclusive > endExclusive &&
    record.candidate.tail.segments.some((segment) => segment.opKind === "predicateSuffix")
  );
}

function hasUnconsumedPredicateSuffixContinuation(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tail: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
  readonly dispatchStart: number;
}): boolean {
  if (!options.tail.requiredContinuationCapabilityIds.includes("predicate_tail_terminal")) {
    return false;
  }
  const next = options.tokens[options.dispatchStart + options.tail.consumed];
  return next !== undefined && isAdjectivalDerivationalSuffix(next) && predicateSuffixKindForDictionaryForm(next.dictionaryForm) !== null;
}

function selectContentHeadPayloadCandidateIndex(candidates: readonly RawContentHeadPayloadCandidate[]): number {
  const ownerEvidenceSelection = selectCandidateByOwnerEvidenceDecisionOrder(
    candidates.map((candidate) => candidate.commitmentEvidence)
  );
  const ownerEvidenceCandidates = ownerEvidenceSelection === null
    ? candidates.map((candidate, index) => ({ candidate, index }))
    : [{ candidate: candidates[ownerEvidenceSelection.candidateIndex]!, index: ownerEvidenceSelection.candidateIndex }];
  for (const fallbackKey of COMMITMENT_FALLBACK_PROFILE_ORDER) {
    const matched = ownerEvidenceCandidates.find((item) =>
      (item.candidate.profile.fallbackOrderKey ?? item.candidate.profile.id) === fallbackKey
    );
    if (matched !== undefined) {
      return matched.index;
    }
  }
  return ownerEvidenceCandidates[0]?.index ?? 0;
}

function finalizeContentHeadPayloadCandidate(
  candidate: RawContentHeadPayloadCandidate,
  selectedByDispatch: boolean
): ContentHeadPayloadCandidate {
  return candidate.kind === "nominal"
    ? {
        kind: "nominal",
        profile: candidate.profile,
        built: candidate.built,
        requiredContinuationCapabilityIds: candidate.requiredContinuationCapabilityIds,
        ownerCandidate: nominalContentHeadOwnerCandidateFromPayload({
          profile: candidate.profile,
          built: candidate.built,
          requiredContinuationCapabilityIds: candidate.requiredContinuationCapabilityIds,
          selectedByDispatch,
          ...(candidate.headTailCandidate === undefined ? {} : { headTailCandidate: candidate.headTailCandidate })
        })
      }
    : {
      kind: "tail",
      profile: candidate.profile,
      tailChunk: candidate.tailChunk,
      requiredContinuationCapabilityIds: candidate.requiredContinuationCapabilityIds,
      ownerCandidate: tailContentHeadOwnerCandidateFromPayload({
        profile: candidate.profile,
        tailChunk: candidate.tailChunk,
        dispatchStart: candidate.dispatchStart,
        requiredContinuationCapabilityIds: candidate.requiredContinuationCapabilityIds,
        selectedByDispatch,
          ...(candidate.headTailCandidate === undefined ? {} : { headTailCandidate: candidate.headTailCandidate })
        })
      };
}

function nominalContentHeadOwnerCandidateFromPayload(options: {
  readonly profile: HeadProfileDescriptor;
  readonly built: NominalTailChainAssemblyBridgeResult;
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly selectedByDispatch: boolean;
  readonly sharedHeadTailCandidates?: readonly HeadTailCandidateTraceDescriptor[];
  readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
}): HeadOwnerCandidateDescriptor {
  const plan = options.built.plan;
  const sourceSpan = {
    start: plan.realization.headMarkerSpan.start,
    endExclusive: plan.realization.headMarkerSpan.end
  };
  const headTailCandidate = options.headTailCandidate ?? (
    options.sharedHeadTailCandidates === undefined
      ? undefined
      : matchingSharedHeadTailCandidate({
          requiredContinuationCapabilityIds: options.requiredContinuationCapabilityIds,
          sourceSpan
        }, options.sharedHeadTailCandidates)
  );
  return {
    kind: "nominal",
    profile: options.profile,
    planKind: plan.kind,
    sourceSpan,
    payloadSummary: {
      kind: "headTailChain",
      consumed: options.built.consumed,
      rootKind: plan.realization.root.kind
    },
    commitmentEvidence: sourceBearingNominalFrameOwnerEvidence(plan.realization.root.kind),
    requiredContinuationCapabilityIds: options.requiredContinuationCapabilityIds,
    ...(headTailCandidate === undefined ? {} : { headTailCandidate }),
    selectedByDispatch: options.selectedByDispatch
  };
}

function tailContentHeadOwnerCandidateFromPayload(options: {
  readonly profile: HeadProfileDescriptor;
  readonly tailChunk: Extract<TailHeadProfileChunkResult, { readonly ok: true }>;
  readonly dispatchStart: number;
  readonly requiredContinuationCapabilityIds: readonly string[];
  readonly selectedByDispatch: boolean;
  readonly sharedHeadTailCandidates?: readonly HeadTailCandidateTraceDescriptor[];
  readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
}): HeadOwnerCandidateDescriptor {
  const rootKind = options.tailChunk.root.tail.kind;
  const sourceSpan = {
    start: options.dispatchStart,
    endExclusive: options.dispatchStart + options.tailChunk.consumed
  };
  const headTailCandidate = options.headTailCandidate ?? (
    options.sharedHeadTailCandidates === undefined
      ? undefined
      : matchingSharedHeadTailCandidate({
          requiredContinuationCapabilityIds: options.requiredContinuationCapabilityIds,
          sourceSpan
        }, options.sharedHeadTailCandidates)
  );
  return {
    kind: "tail",
    profile: options.profile,
    planKind: "headTailChain",
    sourceSpan,
    payloadSummary: {
      kind: "headTailChain",
      consumed: options.tailChunk.consumed,
      rootKind
    },
    commitmentEvidence: predicateTailOwnerEvidence({
      rootKind,
      requiredContinuationCapabilityIds: options.requiredContinuationCapabilityIds,
      weakAttachment: options.tailChunk.partial?.decision === "weak_attachment_warning"
    }),
    requiredContinuationCapabilityIds: options.requiredContinuationCapabilityIds,
    ...(headTailCandidate === undefined ? {} : { headTailCandidate }),
    selectedByDispatch: options.selectedByDispatch
  };
}

export function contentHeadDispatchNominalAppendPayload(
  result: ContentHeadDispatchNominalResult
): ContentHeadAppendPayload {
  const assembly = result.built.assembly;
  return {
    consumed: result.built.consumed,
    korean: assembly.korean,
    ...(assembly.koreanBase === undefined ? {} : { koreanBase: assembly.koreanBase }),
    koreanPos: assembly.koreanPos,
    entry: assembly.entry,
    unitType: assembly.unitType,
    attachLeft: assembly.attachLeft,
    provenance: assembly.provenance,
    renderPlan: assembly.renderPlan,
    previewPlan: result.built.plan,
    ...(assembly.voice === undefined ? {} : { voice: assembly.voice }),
    ...(assembly.rareruReadings === undefined ? {} : { rareruReadings: assembly.rareruReadings }),
    ...(assembly.nareruReadings === undefined ? {} : { nareruReadings: assembly.nareruReadings }),
    ...(assembly.dekiruReadings === undefined ? {} : { dekiruReadings: assembly.dekiruReadings }),
    ...(assembly.hasNegative === undefined ? {} : { hasNegative: assembly.hasNegative }),
    ...(assembly.hasCausative === undefined ? {} : { hasCausative: assembly.hasCausative }),
    ...(assembly.hasCausativePassive === undefined ? {} : { hasCausativePassive: assembly.hasCausativePassive }),
    ...(assembly.hasRequestTail === undefined ? {} : { hasRequestTail: assembly.hasRequestTail }),
    ...(assembly.hasBenefactiveTail === undefined ? {} : { hasBenefactiveTail: assembly.hasBenefactiveTail }),
    ...(assembly.connectiveRole === undefined ? {} : { connectiveRole: assembly.connectiveRole }),
    ...(assembly.benefactive === undefined ? {} : { benefactive: assembly.benefactive }),
    ...(assembly.sourceCandidates === undefined ? {} : { sourceCandidates: assembly.sourceCandidates })
  };
}

export async function contentHeadOwnerCandidateCommitmentPayloadSlots(
  options: ContentHeadOwnerCandidatePayloadSlotOptions
): Promise<readonly HeadOwnerCandidateCommitmentPayloadSlot[]> {
  return Promise.all(options.contentHead.payloadCandidates.map(async (candidate, candidateIndex): Promise<HeadOwnerCandidateCommitmentPayloadSlot> => {
    if (candidate.kind === "nominal") {
      const payload = nominalOwnerCandidatePayload(candidate.profile.id, candidate.built, options);
      return {
        candidateIndex,
        profileId: candidate.profile.id,
        candidateKind: "nominal",
        payload
      };
    }
    const tailPayloadSource = options.selectedTailDescriptor === undefined
      ? await options.buildTailPayloadSource(candidate.tailChunk)
      : { start: options.selectedSpanStart, descriptor: options.selectedTailDescriptor };
    if (tailPayloadSource === null) {
      return {
        candidateIndex,
        profileId: candidate.profile.id,
        candidateKind: "tail",
        payload: null,
        unavailableReason: "tail owner payload source unavailable"
      };
    }
    return {
      candidateIndex,
      profileId: candidate.profile.id,
      candidateKind: "tail",
      payload: tailOwnerCandidatePayload(candidate.profile.id, tailPayloadSource.start, tailPayloadSource.descriptor, options)
    };
  }));
}

let _contestedContentLaneOwnerProfile: HeadProfileDescriptor | undefined;
function getContestedContentLaneOwnerProfile(): HeadProfileDescriptor {
  _contestedContentLaneOwnerProfile ??= {
    id: "content_lane_bare_stem_nominal_use",
    owner: "assembler",
    traceKind: "content_lane_bare_stem_nominal_use",
    continuationCapabilities: [],
    ownerEvidencePolicies: bareStemNominalUseSlotVerdictPolicies()
  };
  return _contestedContentLaneOwnerProfile;
}

export async function attachContestedNominalUseOwnerCandidateLifecycle(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly dispatchIndex: number;
  readonly contentHead: ContentHeadDispatchMatchedResult;
  readonly contestedNominalUseSlot: string;
  readonly span: ContentHeadOwnerCandidateLifecycleSpan;
  readonly buildTailPayloadSource: ContentHeadOwnerCandidatePayloadSlotOptions["buildTailPayloadSource"];
}): Promise<readonly HeadOwnerCandidateCommitmentPayloadSlot[]> {
  const claimSlots = await contentHeadOwnerCandidateCommitmentPayloadSlots({
    tokens: options.tokens,
    dispatchIndex: options.dispatchIndex,
    selectedSpanStart: options.dispatchIndex,
    contentHead: options.contentHead,
    buildTailPayloadSource: options.buildTailPayloadSource
  });
  const contentLaneCandidate: HeadOwnerCandidateDescriptor = {
    kind: "content_lane",
    profile: getContestedContentLaneOwnerProfile(),
    planKind: null,
    sourceSpan: {
      start: options.dispatchIndex,
      endExclusive: options.dispatchIndex + options.span.consumed
    },
    requiredContinuationCapabilityIds: [],
    selectedByDispatch: true
  };
  return attachHeadOwnerCandidateSetToSpan({
    span: options.span,
    ownerCandidates: [
      contentLaneCandidate,
      ...options.contentHead.ownerCandidates.map((candidate) => ({
        ...candidate,
        selectedByDispatch: false,
        contestedNominalUseSlot: options.contestedNominalUseSlot
      }))
    ],
    payloadSlots: [
      {
        candidateIndex: 0,
        profileId: contentLaneCandidate.profile.id,
        candidateKind: "content_lane",
        payload: null,
        unavailableReason: "content lane owns the span itself; the dispatch default needs no payload"
      },
      ...claimSlots.map((slot) => ({ ...slot, candidateIndex: slot.candidateIndex + 1 }))
    ],
    selectedSpanStart: options.dispatchIndex,
    applyDispatchDefault: false
  });
}

export async function attachContentHeadOwnerCandidateLifecycle(
  options: ContentHeadOwnerCandidateLifecycleOptions
): Promise<readonly HeadOwnerCandidateCommitmentPayloadSlot[]> {
  const slots = await contentHeadOwnerCandidateCommitmentPayloadSlots(options);
  return attachHeadOwnerCandidateSetToSpan({
    span: options.span,
    ownerCandidates: options.contentHead.ownerCandidates,
    payloadSlots: slots,
    selectedSpanStart: options.selectedSpanStart,
    ...(options.applyDispatchDefault === undefined ? {} : { applyDispatchDefault: options.applyDispatchDefault })
  });
}

function nominalOwnerCandidatePayload(
  profileId: string,
  built: NominalTailChainAssemblyBridgeResult,
  options: ContentHeadOwnerCandidatePayloadSlotOptions
): HeadOwnerCandidateCommitmentPayload {
  const payload = options.selectedNominalPayload ?? {
    consumed: built.consumed,
    korean: built.assembly.korean,
    ...(built.assembly.koreanBase === undefined ? {} : { koreanBase: built.assembly.koreanBase }),
    koreanPos: built.assembly.koreanPos,
    entry: built.assembly.entry,
    unitType: built.assembly.unitType,
    attachLeft: built.assembly.attachLeft,
    provenance: built.assembly.provenance,
    renderPlan: built.assembly.renderPlan,
    previewPlan: built.plan
  };
  return {
    kind: "nominal",
    profileId,
    start: options.selectedSpanStart,
    consumed: payload.consumed + options.dispatchIndex - options.selectedSpanStart,
    korean: payload.korean,
    ...(payload.koreanBase === undefined ? {} : { koreanBase: payload.koreanBase }),
    koreanPos: payload.koreanPos,
    entry: payload.entry,
    unitType: payload.unitType,
    attachLeft: payload.attachLeft,
    provenance: payload.provenance,
    renderPlan: payload.renderPlan,
    ...(payload.voice === undefined ? {} : { voice: payload.voice }),
    ...(payload.rareruReadings === undefined ? {} : { rareruReadings: payload.rareruReadings }),
    ...(payload.nareruReadings === undefined ? {} : { nareruReadings: payload.nareruReadings }),
    ...(payload.dekiruReadings === undefined ? {} : { dekiruReadings: payload.dekiruReadings }),
    ...(payload.hasNegative === undefined ? {} : { hasNegative: payload.hasNegative }),
    ...(payload.hasCausative === undefined ? {} : { hasCausative: payload.hasCausative }),
    ...(payload.hasCausativePassive === undefined ? {} : { hasCausativePassive: payload.hasCausativePassive }),
    ...(payload.hasRequestTail === undefined ? {} : { hasRequestTail: payload.hasRequestTail }),
    ...(payload.hasBenefactiveTail === undefined ? {} : { hasBenefactiveTail: payload.hasBenefactiveTail }),
    ...(payload.connectiveRole === undefined ? {} : { connectiveRole: payload.connectiveRole }),
    ...(payload.benefactive === undefined ? {} : { benefactive: payload.benefactive }),
    ...(payload.sourceCandidates === undefined ? {} : { sourceCandidates: payload.sourceCandidates })
  };
}

function tailOwnerCandidatePayload(
  profileId: string,
  start: number,
  descriptor: TailChainAssemblyDescriptor,
  options: ContentHeadOwnerCandidatePayloadSlotOptions
): HeadOwnerCandidateCommitmentPayload {
  return {
    kind: "tail",
    profileId,
    start,
    consumed: descriptor.consumed,
    korean: descriptor.korean,
    koreanPos: descriptor.koreanPos ?? 명사,
    entry: descriptor.entry,
    unitType: descriptor.unitType,
    attachLeft: descriptor.attachLeft,
    provenance: descriptor.provenance,
    renderPlan: descriptor.renderPlan,
    voice: descriptor.voice,
    rareruReadings: descriptor.rareruReadings,
    nareruReadings: descriptor.nareruReadings,
    dekiruReadings: descriptor.dekiruReadings,
    hasNegative: descriptor.hasNegative,
    hasCausative: descriptor.hasCausative,
    hasCausativePassive: descriptor.hasCausativePassive,
    hasRequestTail: descriptor.hasRequestTail,
    hasBenefactiveTail: descriptor.hasBenefactiveTail,
    connectiveRole: descriptor.connectiveRole,
    isKeijoujiVerbPredicate: descriptor.isKeijoujiVerbPredicate,
    benefactive: descriptor.benefactive,
    sourceCandidates: descriptor.sourceCandidates
  };
}
