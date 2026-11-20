import type { MorphemeDictionary } from "../../../../../dictionary/morpheme.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";

import type { TranslationCandidate } from "../../../../../types/pipeline.js";
import {
  createSourceCandidateSet,
  stagedCandidate,
  type SourceCandidateSet
} from "../../../../source-candidate-set.js";
import { conjugate, irregularType, type IrregularType } from "../../../../../generator/conjugator.js";
import {
  defineHeadedParserEngine,
  headProfileDispatchSelection,
  type HeadProfile,
  type HeadProfileDescriptor
} from "../../profile.js";
import { isClausePunctuationToken, protoLayoutForTokens } from "../../../../clause-layout/index.js";
import type { ProjectionEvidenceLayout } from "../../../../clause-layout/layout-types.js";
import { nextNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import type { ContentResult } from "../../../../content-types.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type {
  HostBearingLikenessModal,
  KoreanNominalBase,
  NominalFrameParse,
  NominalHeadAllomorphHintSource,
  NominalHeadLexicalForms,
  NominalFramePredicateCommitContext,
  PredicateNominalProjectionHost,
  ProductiveAdjectivalSuffixKind
} from "./grammar.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import { loadNominalFrameSurfaceMetadata } from "./frame-table.js";
import {
  buildRenyouNominalHeadTailChainPlan,
  renyouNominalHeadAdmissionAt,
  renyouDerivationalNominalHost,
  renyouNominalHeadHostEnd,
  renyouNominalHeadHostShapeAdmitted,
  renyouLexicalNounCompoundCandidateEnds,
  type RenyouNominalHeadAdmission
} from "./renyou-nominal-head.js";
import { lazyValue } from "../../../../../data-loader.js";
import {
  buildNominalTailChainPlan,
  buildPredicateNominalFramePlan,
  buildProductiveAdjectivalSuffixTailChainPlan,
  tryParseNominalFrame,
  tryBuildHostBearingLikenessTailChainPlanFromModal,
  tryBuildHostBearingLikenessTailChainPlanFromNominalHost,
  tryMatchPredicateNominalHostFrame,
  type PredicateNominalHostFrameCandidate
} from "./parser.js";
import { nominalTerminalQuestionClaimsHeadAt } from "../../../tail/predicate-root/integration/head-admission.js";
import { tryParseNominalHostLikenessContinuation } from "../../../tail/predicate-root/integration.js";
import { parseTail } from "../../../tail/predicate-root/parse-tail.js";
import type { ParsedTailRoot, TailRoot } from "../../../tail/predicate-root/grammar.js";
import { cachedQuoteBindingForContentRoot } from "../../../../structural-relation/quote.js";
import { stemSupportsAnyProjectionCategory, stemSupportsProjectionCategory } from "../../../tail/predicate-root/inspect.js";
import { projectionOpContinuationCapabilityIds } from "../../capability.js";
import type { NumericHostReservation } from "../../../tail/predicate-root/integration/contracts.js";
import {
  nominalFrameMarkerAdapterBlock,
  nominalPhraseFrameFollowingContentBlock,
  type NominalOwnerArbitrationBlock,
  uncertainCauseKaConstructionAdmittedAt,
  predicateNominalFrameStayOutsideBlock,
  type NominalFrameCommittedParticleAssignment
} from "./owner-arbitration.js";

import {
  _促音便,
  NOMINAL_BITS,
  POS0,
  pos0in,
  POS5A,
  POS5B,
  形容詞0,
  形容詞4,
  語幹_,
  終止形_一般,
  接尾辞,
  isAdjectivalDerivationalSuffix,
  連体形_,
  連用形_,
  대명사,
  명사,
  조사,
  형용사,
  구
} from "../../../../../types/pos.js";
export type NominalTailChainTraceKind =
  | "nominal_tail_chain_renyou_nominal_head"
  | "nominal_tail_chain_predicate_host"
  | "nominal_tail_chain_host_likeness"
  | "nominal_tail_chain_productive_adjectival_suffix"
  | "nominal_tail_chain_phrase_frame";

export interface PredicateNominalHostResolution {
  readonly host: PredicateNominalProjectionHost;
  readonly entry: MorphemeEntry | null;
  readonly headResult?: ContentResult;
}

export interface NominalTailChainBuildResult {
  readonly plan: NominalHeadTailChainPlan;
  readonly consumed: number;
  readonly entry: MorphemeEntry | null;
  readonly predicateHostHeadResult?: ContentResult;
  readonly sourceCandidates?: SourceCandidateSet<TranslationCandidate> | null;
  readonly profile: HeadProfileDescriptor;
  readonly requiredContinuationCapabilityIds: readonly string[];
}

export interface NominalTailChainBlockResult {
  readonly profile: HeadProfileDescriptor;
  readonly block: NominalOwnerArbitrationBlock;
}

export interface NominalFrameMarkerAdapterBuildResult {
  readonly parse: NominalFrameParse;
  readonly plan: NominalHeadTailChainPlan;
  readonly consumed: number;
  readonly profile: HeadProfileDescriptor;
  readonly requiredContinuationCapabilityIds: readonly string[];
}

export interface NominalFrameMarkerAdapterBlockResult {
  readonly parse: NominalFrameParse;
  readonly block: NominalOwnerArbitrationBlock;
}

export interface NominalTailChainBuildOptions {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly numericHostReservation?: NumericHostReservation;
  readonly layout?: ProjectionEvidenceLayout;
  readonly followingPredicate?: NominalFramePredicateCommitContext;
  readonly resolvePredicateHost: (candidate: PredicateNominalHostFrameCandidate) => PredicateNominalHostResolution | null | Promise<PredicateNominalHostResolution | null>;
  readonly resolveNominalHead?: (hostTokenIdx: number) => NominalHeadResolution | null | Promise<NominalHeadResolution | null>;
  readonly resolveRenyouNominalHost?: (start: number, endInclusive: number) => PredicateNominalHostResolution | null | Promise<PredicateNominalHostResolution | null>;
  readonly lookupRenyouLexicalNoun?: (start: number, endInclusive: number) => MorphemeEntry | null | Promise<MorphemeEntry | null>;
}

export interface NominalHeadResolution {
  readonly korean: string;
  readonly canonicalKorean?: string;
  readonly koreanPos?: number;
  readonly lexicalForms?: NominalHeadLexicalForms;
  readonly entry: MorphemeEntry | null;
  readonly candidates?: readonly NominalHeadResolutionCandidate[];
  readonly selectedCandidateIdx?: number | null;
}

export interface NominalHeadResolutionCandidate {
  readonly korean: string;
  readonly canonicalKorean?: string;
  readonly koreanPos?: number;
  readonly entry: MorphemeEntry | null;
  readonly sourceCandidateIdx: number;
  readonly sourceCandidate: TranslationCandidate;
}

export interface NominalFrameMarkerAdapterBuildOptions {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly markerStart: number;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly layout?: ProjectionEvidenceLayout;
  readonly allomorphHint?: string | null;
  readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
  readonly committedParticleAssignment?: NominalFrameCommittedParticleAssignment | null;
  readonly followingPredicate?: NominalFramePredicateCommitContext;
}

type NominalTailChainBuildPayload = Omit<NominalTailChainBuildResult, "profile" | "requiredContinuationCapabilityIds">;
type NominalFrameMarkerAdapterBuildPayload = Omit<
  NominalFrameMarkerAdapterBuildResult,
  "profile" | "requiredContinuationCapabilityIds"
>;

type NominalTailChainProfile = HeadProfile<NominalTailChainBuildOptions, NominalTailChainBuildPayload> & {
  readonly traceKind: NominalTailChainTraceKind;
};

type NominalFrameMarkerAdapterProfile = HeadProfile<NominalFrameMarkerAdapterBuildOptions, NominalFrameMarkerAdapterBuildPayload> & {
  readonly traceKind: "nominal_frame_marker_adapter";
};

export function nominalTailChainKoreanPos(plan: NominalHeadTailChainPlan): KoreanNominalBase["koreanPos"] {
  return plan.realization.frame.outputPos ?? 조사;
}

export function nominalTailChainAttachLeft(plan: NominalHeadTailChainPlan): boolean {
  return plan.realization.frame.attachLeft ?? true;
}

export function nominalTailChainContentKoreanPos(
  plan: NominalHeadTailChainPlan
): NonNullable<NominalHeadTailChainPlan["realization"]["frame"]["outputPos"]> {
  if (plan.realization.owner.kind !== "phrase_owner") {
    throw new Error(`nominal parser content span requires phrase owner, got ${plan.realization.owner.kind}`);
  }
  return plan.realization.frame.outputPos ?? 구;
}

export function nominalTailChainContentAttachLeft(plan: NominalHeadTailChainPlan): false {
  if (plan.realization.owner.kind !== "phrase_owner") {
    throw new Error(`nominal parser content span requires phrase owner, got ${plan.realization.owner.kind}`);
  }
  return false;
}

export function nominalTailChainContentProvenance(plan: NominalHeadTailChainPlan): "nominal_head" {
  if (plan.realization.owner.kind !== "phrase_owner") {
    throw new Error(`nominal parser content span requires phrase owner, got ${plan.realization.owner.kind}`);
  }
  return plan.realization.owner.provenance;
}

const NOMINAL_TAIL_CHAIN_PROFILES: readonly NominalTailChainProfile[] = lazyValue(() => [
  {
    id: "predicate_nominal_host_frame",
    owner: "nominal_head",
    traceKind: "nominal_tail_chain_predicate_host",
    continuationCapabilities: [{
      id: "predicate_nominal_frame_marker",
      kind: "nominal_frame",
      surfaces: ["のについて", "ことについて", "ものとして", "ものとは"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["predicate_nominal_frame_marker"],
    tryBuild: tryBuildPredicateNominalHostTailChain
  },
  {
    id: "host_bearing_likeness",
    owner: "nominal_head",
    traceKind: "nominal_tail_chain_host_likeness",
    continuationCapabilities: [
      {
        id: "tail_segment_likeness",
        kind: "likeness",
        surfaces: ["Nのよう", "Nみたい"],
        description: ""
      },
      {
        id: "predicate_tail_terminal",
        kind: "terminal",
        surfaces: ["Nのようだ", "Nみたいだ"],
        description: ""
      },
      {
        id: "predicate_tail_negation",
        kind: "negation",
        surfaces: ["Nのようではない", "Nのようじゃない", "Nみたいではない"],
        description: ""
      },
      {
        id: "predicate_tail_past",
        kind: "past",
        surfaces: ["Nのようだった", "Nみたいだった"],
        description: ""
      },
      {
        id: "predicate_tail_polite",
        kind: "polite",
        surfaces: ["Nのようです", "Nみたいです"],
        description: ""
      },
      {
        id: "predicate_tail_scope_bridge",
        kind: "scope_bridge",
        surfaces: ["Nのようではない", "Nのようじゃない", "Nみたいではない"],
        description: ""
      },
      {
        id: "predicate_tail_connective",
        kind: "connective",
        surfaces: ["Nのようで", "Nのようだけど", "Nのようなので", "Nみたいで"],
        description: ""
      },
      {
        id: "likeness_projection_adverbial",
        kind: "adverbial",
        surfaces: ["Nのように", "Nみたいに"],
        description: ""
      },
      {
        id: "likeness_projection_attributive",
        kind: "attributive",
        surfaces: ["Nのような", "Nみたいな"],
        description: ""
      },
      {
        id: "predicate_tail_quote",
        kind: "quote",
        surfaces: [
          "Nのようだって",
          "Nのようだと",
          "Nのようだとは",
          "Nのようとは",
          "Nのようかと",
          "NのようだというN",
          "Nみたいだって",
          "Nみたいだとは",
          "Nみたいとは",
          "Nみたいかと",
          "NみたいだというN"
        ],
        description: ""
      },
      {
        id: "tail_segment_quote_focus_limit_negation",
        kind: "limit",
        surfaces: [
          "Nのようだとは限らない",
          "Nのようとは限らない",
          "Nみたいだとは限らない",
          "Nみたいとは限らない"
        ],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: hostBearingLikenessRequiredCapabilityIds,
    tryBuild: tryBuildHostBearingLikenessTailChain
  },
  {
    id: "productive_adjectival_suffix",
    owner: "nominal_head",
    traceKind: "nominal_tail_chain_productive_adjectival_suffix",
    continuationCapabilities: [
      {
        id: "productive_adjectival_suffix_terminal",
        kind: "terminal",
        surfaces: ["Nらしい", "Nっぽい"],
        description: ""
      },
      {
        id: "productive_adjectival_suffix_attributive",
        kind: "attributive",
        surfaces: ["NらしいN", "NっぽいN", "NらしくないN", "NっぽくないN"],
        description: ""
      },
      {
        id: "productive_adjectival_suffix_connective",
        kind: "connective",
        surfaces: ["Nらしくて", "Nっぽくて"],
        description: ""
      },
      {
        id: "productive_adjectival_suffix_adverbial",
        kind: "adverbial",
        surfaces: ["NらしくV", "NっぽくV"],
        description: ""
      },
      {
        id: "productive_adjectival_suffix_nominalized",
        kind: "nominal_frame",
        surfaces: ["Nらしさ", "Nっぽさ"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: productiveAdjectivalSuffixRequiredCapabilityIds,
    tryBuild: tryBuildProductiveAdjectivalSuffixTailChain
  },
  {
    id: "renyou_nominal_head",
    owner: "nominal_head",
    traceKind: "nominal_tail_chain_renyou_nominal_head",
    continuationCapabilities: [{
      id: "renyou_nominal_head",
      kind: "nominal_frame",
      surfaces: ["V連用+方", "V連用+中", "V連用+ぶり", "V連用+用", "お+V連用+が", "お+V連用+N", "V連用+N(완성 명사)"],
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["renyou_nominal_head"],
    tryBuild: tryBuildRenyouNominalHeadTailChain
  },
  {
    id: "nominal_phrase_frame",
    owner: "nominal_head",
    traceKind: "nominal_tail_chain_phrase_frame",
    continuationCapabilities: [{
      id: "nominal_phrase_owner_frame",
      kind: "nominal_frame",
      surfaces: nominalPhraseOwnerFrameSurfaces(),
      description: ""
    }],
    requiredContinuationCapabilityIds: () => ["nominal_phrase_owner_frame"],
    tryBuild: tryBuildNominalPhraseFrameTailChain
  }
] as const);

let _nominalFrameMarkerAdapterProfiles: readonly NominalFrameMarkerAdapterProfile[] | undefined;
function getNominalFrameMarkerAdapterProfiles(): readonly NominalFrameMarkerAdapterProfile[] {
  _nominalFrameMarkerAdapterProfiles ??= [
    {
      id: "nominal_frame_marker_adapter",
      owner: "assembler",
      traceKind: "nominal_frame_marker_adapter",
      continuationCapabilities: [{
        id: "nominal_frame_table_marker",
        kind: "nominal_frame",
        surfaces: nominalFrameMarkerSurfaces(),
        description: ""
      }],
      tryBuild: tryBuildNominalFrameMarkerAdapterProfile
    }
  ] as const;
  return _nominalFrameMarkerAdapterProfiles;
}

let _nominalTailChainEngine: ReturnType<typeof defineHeadedParserEngine<NominalTailChainBuildOptions, NominalTailChainBuildPayload>> | undefined;
function getNominalTailChainEngine() {
  _nominalTailChainEngine ??= defineHeadedParserEngine({
    id: "np_nominal_tail_chain",
    profiles: NOMINAL_TAIL_CHAIN_PROFILES
  });
  return _nominalTailChainEngine;
}

let _nominalFrameMarkerAdapterEngine: ReturnType<typeof defineHeadedParserEngine<NominalFrameMarkerAdapterBuildOptions, NominalFrameMarkerAdapterBuildPayload>> | undefined;
function getNominalFrameMarkerAdapterEngine() {
  _nominalFrameMarkerAdapterEngine ??= defineHeadedParserEngine({
    id: "np_nominal_frame_marker_adapter",
    profiles: getNominalFrameMarkerAdapterProfiles()
  });
  return _nominalFrameMarkerAdapterEngine;
}

export async function tryBuildNominalTailChainPlan(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildResult | null> {
  const selection = headProfileDispatchSelection(await getNominalTailChainEngine().arbitrate(options));
  if (selection === null) {
    return null;
  }
  return {
    ...selection.match.result,
    plan: withNominalHeadProfile(selection.match.result.plan, selection.metadata.dispatchProfile),
    profile: selection.metadata.dispatchProfile,
    requiredContinuationCapabilityIds: selection.metadata.requiredContinuationCapabilityIds
  };
}

export function describeNominalTailChainProfiles(): readonly HeadProfileDescriptor[] {
  return getNominalTailChainEngine().describe();
}

export function describeNominalFrameMarkerAdapterProfiles(): readonly HeadProfileDescriptor[] {
  return getNominalFrameMarkerAdapterEngine().describe();
}

export function explainNominalTailChainBlock(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
  readonly layout?: ProjectionEvidenceLayout;
}): NominalTailChainBlockResult | null {
  const predicateHostCandidate = tryMatchPredicateNominalHostFrame(options.cursor, options.lookups);
  if (predicateHostCandidate === null) {
    return null;
  }
  const block = predicateNominalFrameStayOutsideBlock(
    options.cursor,
    predicateHostCandidate,
    predicateHostCandidate.nextIndex,
    {
      lookups: options.lookups,
      ...(options.layout === undefined ? {} : { layout: options.layout })
    }
  );
  if (block === null) {
    return null;
  }
  const profile = describeNominalTailChainProfiles().find((descriptor) => descriptor.id === "predicate_nominal_host_frame");
  if (profile === undefined) {
    throw new Error("missing nominal-owned head profile descriptor: predicate_nominal_host_frame");
  }
  return { profile, block };
}

async function tryBuildPredicateNominalHostTailChain(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildPayload | null> {
  const predicateHostCandidate = tryMatchPredicateNominalHostFrame(options.cursor, options.lookups);
  if (
    predicateHostCandidate === null ||
    predicateNominalFrameStayOutsideBlock(
      options.cursor,
      predicateHostCandidate,
      predicateHostCandidate.nextIndex,
      {
        lookups: options.lookups,
        ...(options.layout === undefined ? {} : { layout: options.layout })
      }
    ) !== null
  ) {
    return null;
  }
  const resolution = await options.resolvePredicateHost(predicateHostCandidate);
  if (resolution === null) {
    return null;
  }
  if (!predicateProjectionHostCanSupportProjection(resolution.host, predicateHostCandidate.hostProjection)) {
    return null;
  }
  const built = buildPredicateNominalFramePlan(
    options.tokens,
    predicateHostCandidate,
    resolution.host,
    {
      commitContext: {
        tokens: options.tokens,
        nextIndex: predicateHostCandidate.nextIndex,
        ...(options.layout === undefined ? {} : { layout: options.layout })
      }
    }
  );
  return {
    plan: built.plan,
    consumed: built.consumed,
    entry: resolution.entry,
    ...(resolution.headResult === undefined ? {} : { predicateHostHeadResult: resolution.headResult })
  };
}

async function tryBuildRenyouNominalHeadTailChain(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildPayload | null> {
  const { tokens, pos: index, end: limit } = options.cursor;
  const lexicalNounCompound = await renyouLexicalNounCompoundAt(tokens, index, options.lookupRenyouLexicalNoun);
  const admission = renyouNominalHeadAdmissionAt(tokens, index, options.lookups, {
    lexicalNounCompoundEnd: lexicalNounCompound?.end ?? null
  });
  if (admission === null || options.resolveRenyouNominalHost === undefined) {
    return null;
  }
  const hostEnd = renyouNominalHeadHostEnd(admission);
  if (hostEnd >= limit) {
    return null;
  }
  const resolution = await options.resolveRenyouNominalHost(index, admission.hostIdx);
  if (resolution === null || !renyouNominalHeadHostShapeAdmitted(resolution.host)) {
    return null;
  }
  const host = admission.kind === "derivational_suffix"
    ? renyouDerivationalNominalHost(admission, resolution.host, tokens)
    : resolution.host;
  if (host === null) {
    return null;
  }
  const lexicalNoun = admission.kind === "lexical_noun_compound"
    ? lexicalNounCompound?.entry ?? null
    : await renyouNominalHeadLexicalNoun(admission, index, hostEnd, options.lookupRenyouLexicalNoun);
  if (admission.kind !== "derivational_suffix" && lexicalNoun === null && !renyouHostCandidatesNominalizable(host)) {
    return null;
  }
  const plan = buildRenyouNominalHeadTailChainPlan({
    tokens,
    admission,
    host,
    lexicalNoun,
    commitContext: {
      tokens,
      nextIndex: hostEnd + 1,
      ...(options.layout === undefined ? {} : { layout: options.layout })
    }
  });
  return {
    plan,
    consumed: hostEnd + 1 - index,
    entry: resolution.entry,
    ...(resolution.headResult === undefined ? {} : { predicateHostHeadResult: resolution.headResult })
  };
}

type RenyouLexicalNounLookup = NonNullable<NominalTailChainBuildOptions["lookupRenyouLexicalNoun"]>;

async function renyouLexicalNounCompoundAt(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  lookup: RenyouLexicalNounLookup | undefined
): Promise<{ readonly end: number; readonly entry: MorphemeEntry } | null> {
  if (lookup === undefined) {
    return null;
  }
  for (const end of renyouLexicalNounCompoundCandidateEnds(tokens, hostIdx)) {
    const entry = await lookup(hostIdx, end);
    if (entry !== null) {
      return { end, entry };
    }
  }
  return null;
}

async function renyouNominalHeadLexicalNoun(
  admission: RenyouNominalHeadAdmission,
  index: number,
  hostEnd: number,
  lookup: RenyouLexicalNounLookup | undefined
): Promise<MorphemeEntry | null> {
  if (lookup === undefined) {
    return null;
  }
  if (admission.kind === "honorific_prefix" || admission.kind === "honorific_prefix_compound") {
    const prefixed = await lookup(admission.prefixIdx, hostEnd);
    if (prefixed !== null) {
      return prefixed;
    }
  }
  return await lookup(index, hostEnd) ?? null;
}

function renyouHostCandidatesNominalizable(host: PredicateNominalProjectionHost): boolean {
  const layer = host.root.tail.kind === "auxLayer" ? host.root.tail : host.root.tail.inner;
  const stem = layer.stem;
  if (stem.kind === "candidateSet") {
    return stem.candidates.length > 0 && stem.candidates.every((candidate) =>
      (candidate.nominalized !== undefined && candidate.nominalized.length > 0) ||
      candidate.koreanPos === 명사 ||
      (candidate.lemma.length > 1 && candidate.lemma.endsWith("다"))
    );
  }
  return stem.kind === "verb" && stem.lemma.length > 1 && stem.lemma.endsWith("다");
}

function predicateProjectionHostCanSupportProjection(
  host: PredicateNominalProjectionHost,
  projection: PredicateNominalProjectionHost["projection"]
): boolean {
  const tail = host.root.tail;
  if (tail.kind !== "auxLayer") {
    return projection !== "gerund_nominalizer" && projection !== "quoted_nominalizer";
  }
  const first = tail.ops[0];
  if (projection === "quoted_nominalizer") {
    const last = tail.ops.at(-1);
    return last?.kind === "predicateQuoteCarrier" && last.style === "compact_toiu";
  }
  if (projection === "gerund_nominalizer") {
    return stemSupportsAnyProjectionCategory(tail.stem, ["verbal_predicate", "adjectival_predicate"]) ||
      first?.kind === "copula" ||
      (first?.kind === "modal" && first.modal === "youda") ||
      first?.kind === "predicateProjectionCarrier" ||
      first?.kind === "scopeBridge" ||
      (first?.kind === "predicateQuoteCarrier" && first.style === "suru_attributive");
  }
  if (!stemSupportsProjectionCategory(tail.stem, "nominal")) {
    return true;
  }
  return first?.kind === "copula" ||
    (first?.kind === "modal" && first.modal === "youda") ||
    (first?.kind === "predicateQuoteCarrier" && first.style === "suru_attributive");
}

async function tryBuildHostBearingLikenessTailChain(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildPayload | null> {
  const { tokens, pos: index } = options.cursor;
  const directPlanWithoutHead = tryBuildHostBearingLikenessTailChainPlanFromNominalHost({
    cursor: options.cursor,
    lookups: options.lookups
  });
  if (
    directPlanWithoutHead !== null &&
    directPlanWithoutHead.realization.root.kind === "hostBearingLikeness" &&
    directPlanWithoutHead.realization.root.frame.modal.kind === "nominalHostLikenessQuoteFocusLimitNegationProjection"
  ) {
    const head = await options.resolveNominalHead?.(index) ?? null;
    const plan = head === null
      ? directPlanWithoutHead
      : tryBuildHostBearingLikenessTailChainPlanFromNominalHost({
        cursor: options.cursor,
        lookups: options.lookups,
        head: {
          allomorphHint: head.korean,
          allomorphHintSource: "assembler_previous_unit"
        }
      }) ?? directPlanWithoutHead;
    return {
      plan,
      consumed: plan.realization.root.source.end - index,
      entry: head?.entry ?? null
    };
  }
  const continuation = await tryResolveHostBearingLikenessContinuation(options);
  if (continuation !== null) {
    const head = await options.resolveNominalHead?.(index) ?? null;
    const plan = tryBuildHostBearingLikenessTailChainPlanFromModal({
      tokens,
      hostTokenIdx: index,
      modal: continuation,
      ...(head === null
        ? {}
        : {
          head: {
            allomorphHint: head.korean,
            allomorphHintSource: "assembler_previous_unit"
          }
        }),
      commitContext: {
        tokens,
        nextIndex: continuation.source.end,
        ...(options.layout === undefined ? {} : { layout: options.layout })
      }
    });
    if (plan !== null) {
      return {
        plan,
        consumed: plan.realization.root.source.end - index,
        entry: head?.entry ?? null
      };
    }
  }
  const initialPlan = directPlanWithoutHead;
  if (initialPlan === null) {
    return null;
  }
  const head = await options.resolveNominalHead?.(index) ?? null;
  const plan = head === null
    ? initialPlan
    : tryBuildHostBearingLikenessTailChainPlanFromNominalHost({
      cursor: options.cursor,
      lookups: options.lookups,
      head: {
        allomorphHint: head.korean,
        allomorphHintSource: "assembler_previous_unit"
      }
    }) ?? initialPlan;
  return {
    plan,
    consumed: plan.realization.root.source.end - index,
    entry: head?.entry ?? null
  };
}

function hostBearingLikenessRequiredCapabilityIds(result: NominalTailChainBuildPayload): readonly string[] {
  const root = result.plan.realization.root;
  if (root.kind !== "hostBearingLikeness") {
    return [];
  }
  const modal = root.frame.modal;
  if (modal.kind === "nominalHostLikenessProjection") {
    switch (modal.terminal) {
      case "predicative":
        return ["tail_segment_likeness", "predicate_tail_terminal"];
      case "adverbial_ni":
        return ["likeness_projection_adverbial"];
      case "attributive_na":
        return ["likeness_projection_attributive"];
    }
  }
  if (modal.kind === "nominalHostLikenessQuoteFocusLimitNegationProjection") {
    return ["tail_segment_likeness", "tail_segment_quote_focus_limit_negation", "predicate_tail_quote"];
  }
  const ids = new Set<string>(["tail_segment_likeness"]);
  for (const id of projectionOpContinuationCapabilityIds(modal.ops, {
    negation: "predicate_tail_negation",
    past: "predicate_tail_past",
    polite: "predicate_tail_polite",
    scopeBridge: "predicate_tail_scope_bridge",
    connective: "predicate_tail_connective",
    quote: "predicate_tail_quote",
    attributiveQuote: "predicate_tail_quote"
  })) {
    ids.add(id);
  }
  if (ids.size === 1) {
    ids.add("predicate_tail_terminal");
  }
  return [...ids];
}

async function tryBuildProductiveAdjectivalSuffixTailChain(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildPayload | null> {
  const { tokens, pos: index, end: limit } = options.cursor;
  const hostToken = tokens[index];
  if (hostToken === undefined) {
    return null;
  }
  const suffixIdx = nextNonSpaceIndex(tokens, index + 1, limit);
  if (suffixIdx === null || suffixIdx !== index + 1) {
    return null;
  }
  const suffixToken = tokens[suffixIdx];
  const suffixSpec = productiveAdjectivalSuffixSpec(suffixToken);
  if (suffixToken === undefined || suffixSpec === null) {
    return null;
  }
  const hostKind = productiveAdjectivalSuffixHostKind(hostToken, suffixSpec.kind);
  if (hostKind === null) {
    return null;
  }
  const head = await options.resolveNominalHead?.(index) ?? null;
  const headOptions = productiveAdjectivalSuffixHeadOptions(head, hostToken, hostKind);
  const selectedHeadIdx = productiveAdjectivalSuffixSelectedHeadIndex(headOptions, head?.selectedCandidateIdx ?? null);
  const selectedHead = headOptions[selectedHeadIdx];
  if (selectedHead === undefined) {
    return null;
  }
  const selectedPlan = buildProductiveAdjectivalSuffixPlanForHead({
    cursor: options.cursor,
    tokens,
    ...(options.layout === undefined ? {} : { layout: options.layout }),
    hostTokenIdx: index,
    suffixTokenIdx: suffixIdx,
    suffixKind: suffixSpec.kind,
    head: selectedHead,
    lookups: options.lookups,
    commitContext: {
      tokens,
      ...(options.layout === undefined ? {} : { layout: options.layout })
    }
  });
  if (selectedPlan === null) {
    return null;
  }
  const candidatePlans = headOptions
    .map((candidateHead) => ({
      candidateHead,
      planned: buildProductiveAdjectivalSuffixPlanForHead({
        cursor: options.cursor,
        tokens,
        ...(options.layout === undefined ? {} : { layout: options.layout }),
        hostTokenIdx: index,
        suffixTokenIdx: suffixIdx,
        suffixKind: suffixSpec.kind,
        head: candidateHead,
        lookups: options.lookups,
        commitContext: {
          tokens,
          ...(options.layout === undefined ? {} : { layout: options.layout })
        }
      })
    }))
    .filter((candidate): candidate is {
      readonly candidateHead: ProductiveAdjectivalSuffixHeadOption;
      readonly planned: ProductiveAdjectivalSuffixPlannedHead;
    } =>
      candidate.planned !== null &&
      candidate.planned.sourceEnd === selectedPlan.sourceEnd &&
      candidate.candidateHead.sourceCandidate !== undefined
    );
  const members = candidatePlans.map(({ candidateHead, planned }) => stagedCandidate(
    productiveAdjectivalSuffixCandidateFromHead(candidateHead.sourceCandidate!, planned.plan),
    "unknown"
  ));
  const consumed = selectedPlan.sourceEnd - index;
  return {
    plan: selectedPlan.plan,
    consumed,
    entry: selectedHead.entry,
    ...(members.length === 0
      ? {}
      : { sourceCandidates: createSourceCandidateSet(members, { sharedConsumed: consumed }) })
  };
}

interface ProductiveAdjectivalSuffixHeadOption {
  readonly hostKind: ProductiveAdjectivalSuffixHostKind;
  readonly korean: string;
  readonly canonicalKorean?: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
  readonly entry: MorphemeEntry | null;
  readonly sourceCandidateIdx?: number;
  readonly sourceCandidate?: TranslationCandidate;
}

interface ProductiveAdjectivalSuffixPlannedHead {
  readonly plan: NominalHeadTailChainPlan;
  readonly sourceEnd: number;
}

interface ProductiveAdjectivalSuffixAdverbialProjection {
  readonly sourceEnd: number;
  readonly fragment: boolean;
}

function productiveAdjectivalSuffixHeadOptions(
  head: NominalHeadResolution | null,
  hostToken: RuntimeHaruToken,
  hostKind: ProductiveAdjectivalSuffixHostKind
): readonly ProductiveAdjectivalSuffixHeadOption[] {
  if (hostKind === "adjectival_stem") {
    return productiveAdjectivalSuffixAdjectivalHeadOptions(head);
  }
  const candidates = (head?.candidates ?? [])
    .filter((candidate) => [명사, 대명사].includes(candidate.koreanPos ?? 명사) && candidate.korean.length > 0)
    .map((candidate) => ({
      hostKind,
      korean: candidate.korean,
      canonicalKorean: candidate.canonicalKorean ?? candidate.korean,
      koreanPos: candidate.koreanPos ?? 명사,
      irregular: candidate.sourceCandidate.irregular,
      entry: candidate.entry,
      sourceCandidateIdx: candidate.sourceCandidateIdx,
      sourceCandidate: candidate.sourceCandidate
    }));
  if (candidates.length > 0) {
    return candidates;
  }
  const fallback = head?.korean ?? hostToken.surface;
  return fallback.length === 0
    ? []
    : [{
      hostKind,
      korean: fallback,
      canonicalKorean: head?.canonicalKorean ?? fallback,
      koreanPos: head?.koreanPos ?? 명사,
      irregular: null,
      entry: head?.entry ?? null
    }];
}

type ProductiveAdjectivalSuffixHostKind = "nominal" | "adjectival_stem";

function productiveAdjectivalSuffixHostKind(
  hostToken: RuntimeHaruToken,
  suffixKind: ProductiveAdjectivalSuffixKind
): ProductiveAdjectivalSuffixHostKind | null {
  if (pos0in(hostToken.pos, NOMINAL_BITS)) {
    return "nominal";
  }
  if (
    suffixKind === "ppoi_trait" &&
    (hostToken.pos & (POS0 | POS5A)) === (形容詞0 | 語幹_)
  ) {
    return "adjectival_stem";
  }
  return null;
}

function productiveAdjectivalSuffixAdjectivalHeadOptions(
  head: NominalHeadResolution | null
): readonly ProductiveAdjectivalSuffixHeadOption[] {
  const candidates = (head?.candidates ?? [])
    .filter((candidate) =>
      candidate.koreanPos === 형용사 &&
      productiveAdjectivalSuffixAttributiveHost(candidate.canonicalKorean ?? candidate.sourceCandidate.koreanLemma, candidate.sourceCandidate.irregular) !== null
    )
    .map((candidate) => ({
      hostKind: "adjectival_stem" as const,
      korean: productiveAdjectivalSuffixAttributiveHost(candidate.canonicalKorean ?? candidate.sourceCandidate.koreanLemma, candidate.sourceCandidate.irregular)!,
      canonicalKorean: candidate.canonicalKorean ?? candidate.sourceCandidate.koreanLemma,
      koreanPos: 형용사,
      irregular: candidate.sourceCandidate.irregular,
      entry: candidate.entry,
      sourceCandidateIdx: candidate.sourceCandidateIdx,
      sourceCandidate: candidate.sourceCandidate
    }));
  if (candidates.length > 0) {
    return candidates;
  }
  const singleSense = productiveAdjectivalSuffixSingleSenseHead(head?.entry);
  const fallbackLemma = nonEmptyString(head?.canonicalKorean) ?? singleSense?.lemma ?? null;
  const fallbackIrregular = singleSense?.irregular ?? null;
  const fallbackAttr = fallbackLemma === null
    ? null
    : productiveAdjectivalSuffixAttributiveHost(fallbackLemma, fallbackIrregular);
  if (fallbackLemma === null || fallbackAttr === null) {
    return [];
  }
  return [{
    hostKind: "adjectival_stem",
    korean: fallbackAttr,
    canonicalKorean: fallbackLemma,
    koreanPos: head?.koreanPos ?? 형용사,
    irregular: fallbackIrregular,
    entry: head?.entry ?? null
  }];
}

function productiveAdjectivalSuffixAttributiveHost(
  koreanLemma: string,
  irregular: IrregularType | null | undefined
): string | null {
  if (!koreanLemma.endsWith("다")) {
    return null;
  }
  return conjugate(koreanLemma, irregularType(irregular ?? null), "ㄴ/은");
}

function productiveAdjectivalSuffixSingleSenseHead(
  entry: MorphemeEntry | null | undefined
): { readonly lemma: string; readonly irregular: IrregularType | null } | null {
  const senses = entry?.senses ?? [];
  if (senses.length !== 1) {
    return null;
  }
  const sense = senses[0]!;
  return sense.koreanPos === 형용사 && sense.korean.endsWith("다")
    ? { lemma: sense.korean, irregular: sense.irregular ?? null }
    : null;
}

function nonEmptyString(value: string | null | undefined): string | null {
  return value === undefined || value === null || value.length === 0 ? null : value;
}

function productiveAdjectivalSuffixSelectedHeadIndex(
  heads: readonly ProductiveAdjectivalSuffixHeadOption[],
  selectedCandidateIdx: number | null
): number {
  if (selectedCandidateIdx !== null) {
    const bySourceIdx = heads.findIndex((head) => head.sourceCandidateIdx === selectedCandidateIdx);
    if (bySourceIdx >= 0) {
      return bySourceIdx;
    }
  }
  return 0;
}

function buildProductiveAdjectivalSuffixPlanForHead(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly layout?: ProjectionEvidenceLayout;
  readonly hostTokenIdx: number;
  readonly suffixTokenIdx: number;
  readonly suffixKind: ProductiveAdjectivalSuffixKind;
  readonly head: ProductiveAdjectivalSuffixHeadOption;
  readonly lookups: LookupTables;
  readonly commitContext: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly layout?: ProjectionEvidenceLayout;
  };
}): ProductiveAdjectivalSuffixPlannedHead | null {
  const suffixKorean = productiveAdjectivalSuffixKoreanPredicate(options.suffixKind, options.head);
  if (suffixKorean === null) {
    return null;
  }
  const suffixKoreanLemma = suffixKorean.lemma;
  const suffixKoreanIrregular = suffixKorean.irregular;
  const parsed = parseProductiveAdjectivalSuffixTailRoot({
    cursor: options.cursor,
    suffixIdx: options.suffixTokenIdx,
    koreanLemma: suffixKoreanLemma,
    irregular: suffixKoreanIrregular,
    lookups: options.lookups
  });
  const nominalized = parsed === null
    ? productiveAdjectivalSuffixNominalizedProjection(options.cursor.fork(options.suffixTokenIdx))
    : null;
  const adverbial = parsed === null && nominalized === null
    ? productiveAdjectivalSuffixAdverbialProjection(
      options.cursor.fork(options.suffixTokenIdx),
      options.layout,
      options.lookups
    )
    : null;
  if (parsed === null && nominalized === null && adverbial === null) {
    return null;
  }
  const sourceEnd = parsed?.sourceEnd ?? nominalized?.sourceEnd ?? adverbial?.sourceEnd ?? options.suffixTokenIdx + 1;
  const projection = parsed !== null
    ? { kind: "tailRoot" as const, root: parsed.root }
    : nominalized !== null
      ? {
        kind: "nominalized" as const,
        nominalizer: {
          surface: nominalized.nominalizer.surface,
          source: {
            start: nominalized.nominalizer.index,
            end: nominalized.nominalizer.index + 1,
            tokens: [nominalized.nominalizer]
          }
        }
      }
      : { kind: "adverbial" as const, ...(adverbial?.fragment === true ? { fragment: true } : {}) };
  return {
    sourceEnd,
    plan: buildProductiveAdjectivalSuffixTailChainPlan({
      tokens: options.tokens,
      hostTokenIdx: options.hostTokenIdx,
      suffixTokenIdx: options.suffixTokenIdx,
      suffixKind: options.suffixKind,
      suffixKoreanLemma,
      suffixKoreanIrregular,
      projection,
      sourceEnd,
      head: {
        allomorphHint: options.head.korean,
        allomorphHintSource: "assembler_previous_unit",
        allomorphCanonicalKorean: options.head.canonicalKorean ?? options.head.korean,
        allomorphKoreanPos: options.head.koreanPos ?? 명사
      },
      commitContext: {
        ...options.commitContext,
        nextIndex: sourceEnd
      }
    })
  };
}

function productiveAdjectivalSuffixKoreanPredicate(
  suffixKind: ProductiveAdjectivalSuffixKind,
  head: ProductiveAdjectivalSuffixHeadOption
): { readonly lemma: string; readonly irregular: IrregularType | null } | null {
  if (head.hostKind === "adjectival_stem") {
    if (suffixKind !== "ppoi_trait") {
      return null;
    }
    return { lemma: `${head.korean} 것 같다`, irregular: null };
  }
  return suffixKind === "rashii_typicality"
    ? { lemma: `${head.korean} 같다`, irregular: null }
    : { lemma: `${head.korean}스럽다`, irregular: "ㅂ" };
}

function productiveAdjectivalSuffixCandidateFromHead(
  source: TranslationCandidate,
  plan: NominalHeadTailChainPlan
): TranslationCandidate {
  const root = plan.realization.root;
  if (root.kind !== "productiveAdjectivalSuffix") {
    return source;
  }
  return {
    ...source,
    entry: { ...source.entry, senses: [source.translation] },
    koreanLemma: root.frame.suffix.koreanLemma,
    koreanPos: 구,
    irregular: root.frame.suffix.irregular,
    renderPlan: plan,
    korean: "",
    renderPlanPolicy: "normal"
  };
}

function productiveAdjectivalSuffixRequiredCapabilityIds(result: NominalTailChainBuildPayload): readonly string[] {
  const root = result.plan.realization.root;
  if (root.kind !== "productiveAdjectivalSuffix") {
    return [];
  }
  const projection = root.frame.projection;
  if (projection.kind === "adverbial") {
    return ["productive_adjectival_suffix_adverbial"];
  }
  if (projection.kind === "nominalized") {
    return ["productive_adjectival_suffix_nominalized"];
  }
  const layer = projection.root.tail.kind === "auxLayer" ? projection.root.tail : null;
  if (layer?.terminal === "attributive") {
    return ["productive_adjectival_suffix_attributive"];
  }
  if (layer?.ops.some((op) => op.kind === "connective") === true) {
    return ["productive_adjectival_suffix_connective"];
  }
  return ["productive_adjectival_suffix_terminal"];
}

function productiveAdjectivalSuffixSpec(token: RuntimeHaruToken | undefined): { readonly kind: ProductiveAdjectivalSuffixKind } | null {
  if (token === undefined || !isAdjectivalDerivationalSuffix(token)) {
    return null;
  }
  if (
    token.dictionaryForm === "らしい" ||
    (token.dictionaryForm === "らし" && token.surface === "らしき")
  ) {
    return { kind: "rashii_typicality" };
  }
  if (token.dictionaryForm === "っぽい") {
    return { kind: "ppoi_trait" };
  }
  return null;
}

function parseProductiveAdjectivalSuffixTailRoot(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly suffixIdx: number;
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly lookups: LookupTables;
}): { readonly root: TailRoot; readonly sourceEnd: number } | null {
  const { tokens, end: limit } = options.cursor;
  const suffix = tokens[options.suffixIdx];
  if (suffix === undefined || (suffix.pos & POS5A) === 語幹_) {
    return null;
  }
  let selected: { readonly root: TailRoot; readonly sourceEnd: number } | null = null;
  for (let sourceEnd = options.suffixIdx + 1; sourceEnd <= limit; sourceEnd += 1) {
    const tailTokens = tokens.slice(options.suffixIdx + 1, sourceEnd);
    const parseSlice = [
      productiveAdjectivalSuffixStemToken(suffix),
      ...tailTokens
    ];
    const sourceIndexMap = [
      options.suffixIdx,
      ...Array.from({ length: tailTokens.length }, (_, offset) => options.suffixIdx + 1 + offset)
    ];
    const parsed = parseTail({
      tokens: parseSlice,
      start: 0,
      stem: {
        kind: "adj",
        lemma: options.koreanLemma,
        irregular: options.irregular,
        sourcePredicateShape: "i_adjective"
      },
      lookups: options.lookups,
      sourceIndexMap,
      contextTokens: tokens,
      stemSourceOverride: { tokens: [suffix], tokenIndices: [options.suffixIdx] }
    });
    if (parsed.ok && parsed.consumed === parseSlice.length) {
      const stagedRoot = shouldProjectProductiveSuffixAttributive(tokens, sourceEnd)
        ? productiveSuffixRootWithTerminal(parsed.root, "attributive")
        : parsed.root;
      const root: TailRoot = {
        ...stagedRoot,
        quoteBinding: cachedQuoteBindingForContentRoot(
          tokens,
          options.suffixIdx,
          sourceEnd - 1,
        ),
      };
      selected = { root, sourceEnd };
      continue;
    }
    if (selected !== null) {
      break;
    }
  }
  return selected;
}

function productiveAdjectivalSuffixStemToken(suffix: RuntimeHaruToken): RuntimeHaruToken {
  const pos5a = suffix.pos & POS5A;
  const pos5b = suffix.pos & POS5B;
  return {
    ...suffix,
    pos: 形容詞0 | 形容詞4 | (pos5a === 0 ? 終止形_一般 : pos5a | pos5b)
  };
}

function shouldProjectProductiveSuffixAttributive(tokens: readonly RuntimeHaruToken[], sourceEnd: number): boolean {
  const head = tokens[sourceEnd];
  if (head === undefined || !pos0in(head.pos, NOMINAL_BITS)) {
    return false;
  }
  const lastToken = tokens[sourceEnd - 1];
  return lastToken !== undefined && (lastToken.pos & POS5A) === 連体形_;
}

function productiveSuffixRootWithTerminal(root: ParsedTailRoot, terminal: "attributive"): ParsedTailRoot {
  if (root.tail.kind !== "auxLayer") {
    return root;
  }
  return {
    ...root,
    tail: {
      ...root.tail,
      terminal
    }
  };
}

function productiveAdjectivalSuffixNominalizedProjection(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly sourceEnd: number; readonly nominalizer: RuntimeHaruToken & { readonly index: number } } | null {
  const { tokens, pos: suffixIdx, end: limit } = cursor;
  const suffix = tokens[suffixIdx];
  const nominalizerIdx = suffixIdx + 1;
  const nominalizer = tokens[nominalizerIdx];
  if (
    suffix === undefined ||
    (suffix.pos & POS5A) !== 語幹_ ||
    nominalizer === undefined ||
    nominalizerIdx >= limit ||
    nominalizer.dictionaryForm !== "さ" ||
    (nominalizer.pos & POS0) !== 接尾辞
  ) {
    return null;
  }
  return {
    sourceEnd: nominalizerIdx + 1,
    nominalizer: { ...nominalizer, index: nominalizerIdx }
  };
}

function productiveAdjectivalSuffixAdverbialProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  layout: ProjectionEvidenceLayout | undefined,
  lookups: LookupTables
): ProductiveAdjectivalSuffixAdverbialProjection | null {
  const { tokens, pos: suffixIdx } = cursor;
  const suffix = tokens[suffixIdx];
  if (
    suffix === undefined ||
    (suffix.pos & POS5A) !== 連用形_ ||
    (suffix.pos & POS5B) === _促音便
  ) {
    return null;
  }
  const predicateIdx = followingPredicateEvidenceIndexAfter(layout, cursor, lookups);
  if (predicateIdx !== null) {
    return { sourceEnd: suffixIdx + 1, fragment: false };
  }
  return productiveAdjectivalSuffixTerminalAdverbialFragment(cursor)
    ? { sourceEnd: suffixIdx + 1, fragment: true }
    : null;
}

function productiveAdjectivalSuffixTerminalAdverbialFragment(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  for (let idx = cursor.pos + 1; idx < cursor.end; idx += 1) {
    const token = cursor.tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isClausePunctuationToken(token)) {
      continue;
    }
    return false;
  }
  return true;
}

function followingPredicateEvidenceIndexAfter(
  layout: ProjectionEvidenceLayout | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): number | null {
  const { tokens, pos: tokenIdx, end: limit } = cursor;
  const withPredicateEvidence = layout as (ProjectionEvidenceLayout & {
    readonly followingPredicateEvidenceIndexAfter?: (
      tokens: readonly RuntimeHaruToken[],
      tokenIdx: number,
      options?: { readonly limit?: number; readonly includeAuxiliary?: boolean }
    ) => number | null;
  }) | undefined;
  const predicateIdx = typeof withPredicateEvidence?.followingPredicateEvidenceIndexAfter !== "function"
    ? protoLayoutForTokens(tokens, lookups).followingPredicateEvidenceIndexAfter(tokens, tokenIdx, {
      limit,
      includeAuxiliary: true
    })
    : withPredicateEvidence.followingPredicateEvidenceIndexAfter(tokens, tokenIdx, {
      limit,
      includeAuxiliary: true
    });
  return predicateIdx === null || predicateIdx >= limit ? null : predicateIdx;
}

async function tryBuildNominalPhraseFrameTailChain(options: NominalTailChainBuildOptions): Promise<NominalTailChainBuildPayload | null> {
  const { tokens, pos: index, end: limit } = options.cursor;
  const markerStart = nextNonSpaceIndex(tokens, index + 1, limit);
  if (markerStart === null) {
    return null;
  }
  const parse = tryParseNominalFrame(options.cursor.fork(markerStart, limit), {
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  if (
    parse === null ||
    parse.root.kind !== "nominalPhrase" ||
    parse.root.source.start !== index ||
    parse.frame.ownerMode !== "phrase_owner"
  ) {
    return null;
  }
  if (nominalPhraseFrameFollowingContentBlock(options.cursor, parse.frame, parse.nextIndex, options.layout) !== null) {
    return null;
  }
  if (
    parse.frame.ownerArbitration?.uncertainCauseKaOwnership === true &&
    (
      !uncertainCauseKaConstructionAdmittedAt(tokens, parse.frame.source.start, options.lookups) ||
      nominalTerminalQuestionClaimsHeadAt(options.cursor, index, options.numeric, options.lookups)
    )
  ) {
    return null;
  }
  const head = await options.resolveNominalHead?.(parse.root.head.tokenIndex) ?? null;
  const plan = buildNominalTailChainPlan(parse, {
    ...(head === null
      ? {}
      : {
        head: {
          allomorphHint: head.korean,
          allomorphHintSource: "assembler_previous_unit",
          allomorphCanonicalKorean: head.canonicalKorean ?? null,
          allomorphKoreanPos: head.koreanPos ?? null,
          lexicalForms: head.lexicalForms ?? null
        }
      }),
    commitContext: {
      tokens: options.tokens,
      nextIndex: parse.nextIndex,
      ...(options.followingPredicate === undefined ? {} : { followingPredicate: options.followingPredicate }),
      ...(options.layout === undefined ? {} : { layout: options.layout })
    }
  });
  return {
    plan,
    consumed: parse.root.source.end - index,
    entry: head?.entry ?? null
  };
}

async function tryResolveHostBearingLikenessContinuation(options: NominalTailChainBuildOptions): Promise<HostBearingLikenessModal | null> {
  const continuation = await tryParseNominalHostLikenessContinuation({
    tokens: options.tokens,
    cursor: options.cursor,
    dictionary: options.dictionary,
    formal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.numericHostReservation === undefined
      ? {}
      : { numericHostReservation: options.numericHostReservation })
  }, options.cursor.pos);
  if (!continuation.ok) {
    return null;
  }
  return {
    kind: "nominalHostLikenessContinuationProjection",
    ops: continuation.ops,
    ...(continuation.predicateHost === undefined ? {} : { predicateHost: continuation.predicateHost }),
    ...(continuation.nominalizedAttributive === true ? { nominalizedAttributive: true as const } : {}),
    boundary: continuation.outgoingBoundary,
    source: continuation.source,
    warnings: continuation.warnings
  };
}

export async function tryBuildNominalFrameMarkerAdapterPlan(
  options: NominalFrameMarkerAdapterBuildOptions
): Promise<NominalFrameMarkerAdapterBuildResult | null> {
  const selection = headProfileDispatchSelection(await getNominalFrameMarkerAdapterEngine().arbitrate(options));
  if (selection === null) {
    return null;
  }
  return {
    ...selection.match.result,
    plan: withNominalHeadProfile(selection.match.result.plan, selection.metadata.dispatchProfile),
    profile: selection.metadata.dispatchProfile,
    requiredContinuationCapabilityIds: selection.metadata.requiredContinuationCapabilityIds
  };
}

function withNominalHeadProfile(
  plan: NominalHeadTailChainPlan,
  profile: HeadProfileDescriptor
): NominalHeadTailChainPlan {
  return {
    ...plan,
    headProfile: profile
  };
}

function tryBuildNominalFrameMarkerAdapterProfile(
  options: NominalFrameMarkerAdapterBuildOptions
): NominalFrameMarkerAdapterBuildPayload | null {
  const parse = tryParseNominalFrame(options.cursor.fork(options.markerStart, options.cursor.end), {
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  if (parse === null) {
    return null;
  }
  const block = nominalFrameMarkerAdapterBlockForParsed(options, parse);
  if (block !== null) {
    return null;
  }
  const plan = buildNominalTailChainPlan(parse, {
    ...(options.allomorphHint === undefined
      ? {}
      : {
        head: {
          allomorphHint: options.allomorphHint,
          allomorphHintSource: options.allomorphHintSource ?? "assembler_previous_unit"
        }
      }),
    commitContext: {
      tokens: options.tokens,
      nextIndex: parse.nextIndex,
      ...(options.followingPredicate === undefined ? {} : { followingPredicate: options.followingPredicate }),
      ...(options.layout === undefined ? {} : { layout: options.layout })
    }
  });
  return {
    parse,
    plan,
    consumed: parse.consumed
  };
}

export function explainNominalFrameMarkerAdapterBlock(
  options: NominalFrameMarkerAdapterBuildOptions
): NominalFrameMarkerAdapterBlockResult | null {
  const parse = tryParseNominalFrame(options.cursor.fork(options.markerStart, options.cursor.end), {
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  if (parse === null) {
    return null;
  }
  const block = nominalFrameMarkerAdapterBlockForParsed(options, parse);
  return block === null ? null : { parse, block };
}

function nominalFrameMarkerAdapterBlockForParsed(
  options: NominalFrameMarkerAdapterBuildOptions,
  parse: NominalFrameParse
): NominalOwnerArbitrationBlock | null {
  if (
    parse.frame.ownerArbitration?.transparentPauseDiscourseBoundary === true &&
    options.tokens[parse.frame.source.start]?.transparentPauseBefore === true
  ) {
    return {
      kind: "transparent_pause_discourse_boundary",
      reason: "transparent pause before でも keeps discourse marker outside nominal frame"
    };
  }
  return nominalFrameMarkerAdapterBlock({
    tokens: options.tokens,
    cursor: options.cursor,
    parse,
    ...(options.layout === undefined ? {} : { layout: options.layout }),
    allomorphHint: options.allomorphHint ?? null,
    committedParticleAssignment: options.committedParticleAssignment ?? null,
    lookups: options.lookups
  });
}

function nominalFrameMarkerSurfaces(): readonly string[] {
  const surfaces = new Set<string>();
  for (const item of loadNominalFrameSurfaceMetadata()) {
    surfaces.add(item.surface);
  }
  for (const dynamicSurface of ["の一つ", "の一人", "の一名", "の一つ目"]) {
    surfaces.add(dynamicSurface);
  }
  return [...surfaces].sort((left, right) => left.localeCompare(right, "ja"));
}

function nominalPhraseOwnerFrameSurfaces(): readonly string[] {
  const surfaces = new Set<string>();
  for (const item of loadNominalFrameSurfaceMetadata()) {
    if (item.ownerMode === "phrase_owner") {
      surfaces.add(item.surface);
    }
  }
  return [...surfaces].sort((left, right) => left.localeCompare(right, "ja"));
}
