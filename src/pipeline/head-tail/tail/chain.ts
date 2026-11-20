import type { MorphemeDictionary } from "../../../dictionary/morpheme.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { Warning } from "../../../types/warning.js";
import {
  headOffersForm,
  type HeadAnchor,
  type HeadAnchorSpan
} from "../head/anchor.js";
import type {
  HeadOwnerCandidateCommitmentEvidenceDescriptor,
  HeadTailCandidateTraceDescriptor
} from "../head/profile.js";
import {
  predicateTailOwnerEvidence,
  sourceBearingNominalFrameOwnerEvidence
} from "../candidate/evidence.js";
import {
  nominalFrameSurfaceSpecAdmittedAt,
  nominalFrameTailSurfaceSpecsBySurface,
  type NominalFrameSurfaceSpec
} from "./segments/nominal-frame.js";
import { quoteFocusLimitNegationTailStartingAt } from "./segments/quote-focus.js";
import { TokenCursor } from "../../token-cursor.js";
import type { ProjectionEvidenceLayout } from "../../clause-layout/layout-types.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import {
  firstFollowingProjectionContextToken,
  projectionContextBoundsForToken
} from "../candidate/context.js";
import { nominalLinkMarkerRelationAt } from "../boundary/marker.js";
import { tailParserSemanticReadinessBlocker, tryParseTailChunkCandidates } from "./predicate-root/integration.js";
import type { PredicateTailSyntheticEntryResolver, TailChunkResult } from "./predicate-root/integration/contracts.js";
import type { BoundaryReadinessRelation } from "./predicate-root/boundary-semantics.js";
import type {
  AuxOpNode,
  StemNode,
  TailRoot
} from "./predicate-root/grammar.js";
import { auxOpsInTailNode, firstAuxLayer } from "./predicate-root/inspect.js";
import type { RuntimeHaruToken } from "../../../types/token.js";


import { POS0, POS1, 助詞, 助動詞, 助動詞語幹, 接続詞 } from "../../../types/pos.js";
import type { NumericHostReservation } from "./predicate-root/integration/contracts.js";
export type TailChainSegmentKind =
  | "likeness"
  | "nominal_frame"
  | "tail_stem"
  | "aux_chain"
  | "copula"
  | "negation"
  | "past"
  | "polite"
  | "modal"
  | "scope_bridge"
  | "connective"
  | "quote"
  | "quote_focus_limit_negation"
  | "sfp";

export interface TailChainSegment {
  readonly kind: TailChainSegmentKind;
  readonly sourceSpan: HeadAnchorSpan;
  readonly opKind?: string;
  readonly capabilityId: string;
  readonly markerSurface?: string;
  readonly frameId?: string;
  readonly frameKind?: string;
  readonly focus?: "は" | "も" | "の" | "に" | null;
  readonly requiresFollowingContent?: boolean;
}

export interface NominalFrameTailMatch {
  readonly spec: NominalFrameSurfaceSpec;
  readonly sourceSpan: HeadAnchorSpan;
  readonly nextIndex: number;
}

export type TailChainRealization =
  | {
    readonly kind: "predicate_root";
    readonly root: TailRoot;
    readonly tailChunk: Extract<TailChunkResult, { readonly ok: true }>;
  }
  | {
    readonly kind: "nominal_frame";
    readonly nominalFrame: NominalFrameTailMatch;
  };

export interface TailChainPlan {
  readonly head: HeadAnchor;
  readonly segments: readonly TailChainSegment[];
  readonly sourceSpan: HeadAnchorSpan;
  readonly tailStart: number;
  readonly tailEndExclusive: number;
  readonly tailRootStart: number;
  readonly requiredCapabilities: readonly string[];
  readonly evidence: readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[];
  readonly warnings: readonly Warning[];
  readonly realization: TailChainRealization;
}

export interface HeadTailCandidate {
  readonly head: HeadAnchor;
  readonly tail: TailChainPlan;
  readonly sourceSpan: HeadAnchorSpan;
  readonly segmentation: {
    readonly headSpan: HeadAnchorSpan;
    readonly tailSpan: HeadAnchorSpan;
  };
  readonly evidence: readonly HeadOwnerCandidateCommitmentEvidenceDescriptor[];
  readonly warnings: readonly Warning[];
}

export interface HeadTailSourceEnvelope {
  readonly headTailCandidate?: HeadTailCandidateTraceDescriptor;
  readonly headTailSourceCandidate?: HeadTailCandidate;
}

export interface TailChainPartialArtifact {
  readonly kind: "source_bearing_connective_prefix" | "source_bearing_tail_prefix" | "assembler_resumable_prefix";
  readonly decision: "functional_suffix_handoff" | "unresolved_suffix_warning" | "weak_attachment_warning";
  readonly parsedPrefixSpan: {
    readonly start: number;
    readonly end: number;
  };
  readonly unresolvedSuffixSpan: {
    readonly start: number;
    readonly end: number;
  };
  readonly attachmentSpan?: {
    readonly start: number;
    readonly end: number;
    readonly surface: string;
  };
  readonly suffixCanStayInAssembler: boolean;
  readonly auditReason: string;
}

export interface TailChainParseOptions {
  readonly head: HeadAnchor;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly dictionary: MorphemeDictionary;
  readonly previewFormal: boolean;
  readonly synthesizeEntry?: PredicateTailSyntheticEntryResolver;
  readonly limit?: number;
  readonly layout?: ProjectionEvidenceLayout;
  readonly numericHostReservation?: NumericHostReservation;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}

const TAIL_CHAIN_SEGMENT_CAPABILITIES = {
  likeness: "tail_segment_likeness",
  nominal_frame: "tail_segment_nominal_frame",
  tail_stem: "tail_segment_stem",
  aux_chain: "tail_segment_aux_chain",
  copula: "tail_segment_copula",
  negation: "tail_segment_negation",
  past: "tail_segment_past",
  polite: "tail_segment_polite",
  modal: "tail_segment_modal",
  scope_bridge: "tail_segment_scope_bridge",
  connective: "tail_segment_connective",
  quote: "tail_segment_quote",
  quote_focus_limit_negation: "tail_segment_quote_focus_limit_negation",
  sfp: "tail_segment_sfp"
} as const satisfies Record<TailChainSegmentKind, string>;

const MAX_NOMINAL_FRAME_TAIL_SURFACE_ITEMS = 8;

export async function parseTailAfterHead(options: TailChainParseOptions): Promise<readonly TailChainPlan[]> {
  const limit = options.limit ?? options.tokens.length;
  const cursor = options.cursor.fork(options.cursor.pos, limit, options.cursor.origin);
  const plans: TailChainPlan[] = nominalFrameTailMatchesForHead({
    head: options.head,
    cursor,
    lookups: options.lookups,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  })
    .map((match) => tailChainPlanForNominalFrameMatch(options.head, match));
  const attachment = tailAttachmentForHead(options.head, cursor);
  if (attachment === null || attachment.tailRootStart < 0 || attachment.tailRootStart >= limit) {
    return plans;
  }
  if (!canAttachTailChainToHead({
    head: options.head,
    tokens: options.tokens,
    attachment
  })) {
    return plans;
  }
  const chunks = await tryParseTailChunkCandidates({
    tokens: options.tokens,
    cursor,
    dictionary: options.dictionary,
    formal: options.previewFormal,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.synthesizeEntry === undefined ? {} : { synthesizeEntry: options.synthesizeEntry }),
    ...(options.numericHostReservation === undefined ? {} : { numericHostReservation: options.numericHostReservation })
  }, attachment.tailRootStart, { maxEndExclusive: limit });
  for (const chunk of chunks) {
    const plan = tailChainPlanForChunk({
      head: options.head,
      cursor,
      chunk,
      attachment,
      lookups: options.lookups
    });
    if (plan !== null) {
      plans.push(plan);
    }
  }
  return plans;
}

export function buildHeadTailCandidate(plan: TailChainPlan): HeadTailCandidate {
  return {
    head: plan.head,
    tail: plan,
    sourceSpan: plan.sourceSpan,
    segmentation: {
      headSpan: plan.head.sourceSpan,
      tailSpan: {
        start: plan.tailStart,
        endExclusive: plan.tailEndExclusive
      }
    },
    evidence: plan.evidence,
    warnings: plan.warnings
  };
}

export async function buildHeadTailCandidates(options: TailChainParseOptions): Promise<readonly HeadTailCandidate[]> {
  return (await parseTailAfterHead(options)).map((plan) => buildHeadTailCandidate(plan));
}

interface TailAttachment {
  readonly tailRootStart: number;
  readonly prefixSegments: readonly TailChainSegment[];
  readonly representedBoundaryRelations: readonly BoundaryReadinessRelation["kind"][];
  readonly likeness?: {
    readonly markerStart: number;
    readonly likenessIndex: number;
    readonly form: "youda" | "mitai";
  };
}

function tailAttachmentForHead(
  head: HeadAnchor,
  cursor: TokenCursor<RuntimeHaruToken>
): TailAttachment | null {
  switch (head.kind) {
    case "predicate":
      return {
        tailRootStart: head.sourceSpan.start,
        prefixSegments: [],
        representedBoundaryRelations: []
      };
    case "nominal":
      return nominalTailAttachmentForHead(head, cursor) ?? {
        tailRootStart: head.tailStart,
        prefixSegments: [],
        representedBoundaryRelations: []
      };
    case "predicate_nominalized":
    case "marker_adapter":
      return {
        tailRootStart: head.tailStart,
        prefixSegments: [],
        representedBoundaryRelations: []
      };
  }
}

function nominalTailAttachmentForHead(
  head: HeadAnchor,
  cursor: TokenCursor<RuntimeHaruToken>
): TailAttachment | null {
  const { tokens, end: limit } = cursor;
  const markerStart = head.tailStart;
  const marker = tokens[markerStart];
  if (marker === undefined || markerStart >= limit) {
    return null;
  }
  const nominalLink = nominalLinkMarkerRelationAt(tokens, markerStart, {
    consumers: ["tail_boundary_readiness"]
  });
  if (nominalLink !== null) {
    const likenessIndex = nominalLink.span.endExclusive;
    const likeness = tokens[likenessIndex];
    if (
      likenessIndex < limit &&
      likeness !== undefined &&
      likeness.surface === "よう" &&
      (likeness.pos & POS1) === 助動詞語幹
    ) {
      return {
        tailRootStart: likenessIndex,
        prefixSegments: [segment("likeness", { start: markerStart, endExclusive: likenessIndex + 1 }, "youda")],
        representedBoundaryRelations: ["nominal_host_likeness"],
        likeness: { markerStart, likenessIndex, form: "youda" }
      };
    }
    return null;
  }
  if (
    marker.surface === "みたい" &&
    (marker.pos & POS1) === 助動詞語幹
  ) {
    return {
      tailRootStart: markerStart,
      prefixSegments: [segment("likeness", { start: markerStart, endExclusive: markerStart + 1 }, "mitai")],
      representedBoundaryRelations: [],
      likeness: { markerStart, likenessIndex: markerStart, form: "mitai" }
    };
  }
  return null;
}

function tailChainSegmentsFromTailRoot(options: {
  readonly root: TailRoot;
  readonly head: HeadAnchor;
  readonly tailRootStart: number;
  readonly tailStart: number;
}): readonly TailChainSegment[] {
  const segments: TailChainSegment[] = [];
  const layer = firstAuxLayer(options.root.tail);
  if (layer !== null) {
    const stemSpan = stemSourceSpan(layer.stem);
    if (stemSpan !== null && stemSpan.start >= options.tailStart) {
      segments.push(segment("tail_stem", stemSpan, layer.stem.kind));
    }
  }
  for (const op of auxOpsInTailNode(options.root.tail)) {
    const mappedSegments = segmentKindsForAuxOp(op);
    if (mappedSegments.length === 0) {
      continue;
    }
    const span = sourceTokenSpan(op.source.tokenIndices);
    if (span === null || span.endExclusive <= options.tailStart) {
      continue;
    }
    for (const mapped of mappedSegments) {
      segments.push(segment(mapped.kind, span, mapped.opKind));
    }
  }
  if (options.root.sfp !== null) {
    const span = sourceTokenSpan(options.root.sfp.source.tokenIndices);
    if (span !== null && span.endExclusive > options.tailStart) {
      segments.push(segment("sfp", span, options.root.sfp.effect ?? "null"));
    }
  }
  return segments;
}

function tailChainPlanForChunk(options: {
  readonly head: HeadAnchor;
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly chunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly attachment: TailAttachment;
  readonly lookups: LookupTables;
}): TailChainPlan | null {
  const { tokens, end: limit } = options.cursor;
  const extension = tailChainExtensionForChunk({
    cursor: options.cursor,
    chunk: options.chunk,
    attachment: options.attachment
  });
  const representedBoundaryRelations = extension === null
    ? options.attachment.representedBoundaryRelations
    : [...options.attachment.representedBoundaryRelations, ...extension.representedBoundaryRelations];
  const readinessBlocker = tailParserSemanticReadinessBlocker({
    tailChunk: options.chunk,
    root: options.chunk.root,
    cursor: options.cursor,
    start: options.attachment.tailRootStart,
    representedBoundaryRelations,
    lookups: options.lookups
  });
  if (readinessBlocker !== null) {
    return null;
  }
  const parsedTailEndExclusive = options.attachment.tailRootStart + options.chunk.consumed;
  const tailEndExclusive = Math.max(parsedTailEndExclusive, extension?.tailEndExclusive ?? parsedTailEndExclusive);
  if (tailEndExclusive <= options.head.tailStart || tailEndExclusive > limit) {
    return null;
  }
  const segments = tailChainSegmentsFromTailRoot({
    root: options.chunk.root,
    head: options.head,
    tailRootStart: options.attachment.tailRootStart,
    tailStart: options.head.tailStart
  });
  const allSegments = [
    ...options.attachment.prefixSegments,
    ...segments,
    ...(extension?.segments ?? [])
  ];
  if (!canAttachTailChainToHead({
    head: options.head,
    tokens,
    attachment: options.attachment
  })) {
    return null;
  }
  const requiredCapabilities = tailChainRequiredCapabilities(allSegments, options.chunk);
  return {
    head: options.head,
    segments: allSegments,
    sourceSpan: {
      start: options.head.sourceSpan.start,
      endExclusive: tailEndExclusive
    },
    tailStart: options.head.tailStart,
    tailEndExclusive,
    tailRootStart: options.attachment.tailRootStart,
    requiredCapabilities,
    evidence: predicateTailOwnerEvidence({
      rootKind: options.chunk.root.tail.kind,
      requiredContinuationCapabilityIds: requiredCapabilities
    }),
    warnings: [],
    realization: {
      kind: "predicate_root",
      root: options.chunk.root,
      tailChunk: options.chunk
    }
  };
}

function tailChainPlanForNominalFrameMatch(
  head: HeadAnchor,
  match: NominalFrameTailMatch
): TailChainPlan {
  const nominalFrameSegment = nominalFrameSegmentFromMatch(match);
  const requiredCapabilities = nominalFrameRequiredCapabilities(head, nominalFrameSegment);
  return {
    head,
    segments: [nominalFrameSegment],
    sourceSpan: {
      start: head.sourceSpan.start,
      endExclusive: match.sourceSpan.endExclusive
    },
    tailStart: head.tailStart,
    tailEndExclusive: match.sourceSpan.endExclusive,
    tailRootStart: head.tailStart,
    requiredCapabilities,
    evidence: sourceBearingNominalFrameOwnerEvidence(`nominal_frame:${match.spec.kind}`),
    warnings: [],
    realization: {
      kind: "nominal_frame",
      nominalFrame: match
    }
  };
}

function tailChainRequiredCapabilities(
  segments: readonly TailChainSegment[],
  tailChunk: Extract<TailChunkResult, { readonly ok: true }>
): readonly string[] {
  const ids = new Set<string>();
  for (const segment of segments) {
    ids.add(segment.capabilityId);
    for (const capabilityId of continuationCapabilityIdsForSegment(segment)) {
      ids.add(capabilityId);
    }
  }
  for (const capabilityId of boundaryCapabilityIdsForTailChunk(tailChunk)) {
    ids.add(capabilityId);
  }
  return [...ids];
}

function canAttachTailChainToHead(options: {
  readonly head: HeadAnchor;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly attachment: TailAttachment;
}): boolean {
  if (options.head.kind === "predicate") {
    return true;
  }
  if (
    options.attachment.likeness !== undefined &&
    startsNominalLikenessTail(options.tokens, options.attachment.tailRootStart)
  ) {
    return true;
  }
  return false;
}

function nominalFrameTailMatchesForHead(
  options: {
    readonly head: HeadAnchor;
    readonly cursor: TokenCursor<RuntimeHaruToken>;
    readonly layout?: ProjectionEvidenceLayout;
    readonly lookups: LookupTables;
  }
): readonly NominalFrameTailMatch[] {
  const head = options.head;
  const { tokens, end: limit } = options.cursor;
  if (!headOffersForm(head, "taigen")) {
    return [];
  }
  const sequence = collectNonSpaceSurfaceItems(options.cursor.fork(head.tailStart, limit), MAX_NOMINAL_FRAME_TAIL_SURFACE_ITEMS);
  if (sequence.length === 0) {
    return [];
  }
  const headToken = nominalFrameSelectorToken(head);
  const matches: NominalFrameTailMatch[] = [];
  const specsBySurface = nominalFrameTailSurfaceSpecsBySurface();
  let joined = "";
  for (const item of sequence) {
    joined += item.surface;
    const specs = specsBySurface.get(joined);
    if (specs === undefined) {
      continue;
    }
    const endExclusive = item.index + 1;
    for (const spec of specs) {
      if (!nominalFrameSurfaceSpecAdmittedAt({
        spec,
        tokens,
        markerStart: head.tailStart,
        markerEndExclusive: endExclusive,
        limit,
        lookups: options.lookups,
        ...(headToken === undefined ? {} : { headToken }),
        ...(options.layout === undefined ? {} : { layout: options.layout })
      })) {
        continue;
      }
      if (
        spec.requiresFollowingContent === true &&
        !hasFollowingContentForNominalFrameTail(options.cursor.fork(endExclusive, limit), {
          tokenIdx: head.tailStart,
          ...(options.layout === undefined ? {} : { layout: options.layout })
        })
      ) {
        continue;
      }
      matches.push({
        spec,
        sourceSpan: {
          start: head.tailStart,
          endExclusive
        },
        nextIndex: nextNonSpaceIndex(tokens, endExclusive, limit) ?? limit
      });
    }
  }
  return matches.sort((left, right) =>
    right.sourceSpan.endExclusive - left.sourceSpan.endExclusive ||
    right.spec.surface.length - left.spec.surface.length
  );
}

function nominalFrameSelectorToken(head: HeadAnchor): RuntimeHaruToken | undefined {
  if (head.base.kind === "predicate_nominalized") {
    return head.base.nominalizer;
  }
  return head.base.token;
}

function nominalFrameSegmentFromMatch(match: NominalFrameTailMatch): TailChainSegment {
  return {
    kind: "nominal_frame",
    sourceSpan: match.sourceSpan,
    opKind: match.spec.kind,
    capabilityId: TAIL_CHAIN_SEGMENT_CAPABILITIES.nominal_frame,
    markerSurface: match.spec.surface,
    frameId: match.spec.id,
    frameKind: match.spec.kind,
    focus: match.spec.focus,
    ...(match.spec.requiresFollowingContent === undefined ? {} : {
      requiresFollowingContent: match.spec.requiresFollowingContent
    })
  };
}

function nominalFrameRequiredCapabilities(
  head: HeadAnchor,
  segment: TailChainSegment
): readonly string[] {
  const ids = new Set<string>();
  ids.add(segment.capabilityId);
  if (head.kind === "predicate_nominalized") {
    ids.add("predicate_nominal_frame_marker");
  } else {
    ids.add("nominal_phrase_owner_frame");
  }
  return [...ids];
}


function startsNominalLikenessTail(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  const token = tokens[start];
  if (token === undefined) {
    return false;
  }
  if (token.surface === "のように" && (token.pos & POS0) === 助詞) {
    return true;
  }
  return (token.surface === "よう" || token.surface === "みたい") &&
    (token.pos & POS1) === 助動詞語幹;
}

function continuationCapabilityIdsForSegment(segment: TailChainSegment): readonly string[] {
  switch (segment.kind) {
    case "negation":
      return ["predicate_tail_negation"];
    case "past":
      return ["predicate_tail_past"];
    case "polite":
      return ["predicate_tail_polite"];
    case "scope_bridge":
      return ["predicate_tail_scope_bridge"];
    case "connective":
      return ["predicate_tail_connective"];
    case "quote":
    case "quote_focus_limit_negation":
      return ["predicate_tail_quote"];
    case "likeness":
    case "nominal_frame":
    case "tail_stem":
    case "aux_chain":
    case "copula":
    case "modal":
    case "sfp":
      return [];
  }
}

function boundaryCapabilityIdsForTailChunk(
  tailChunk: Extract<TailChunkResult, { readonly ok: true }>
): readonly string[] {
  if (tailChunk.outgoingBoundary.kind === "terminal") {
    return ["predicate_tail_terminal"];
  }
  if (tailChunk.outgoingBoundary.connectiveKind === "question_quotative") {
    return ["predicate_tail_connective", "predicate_tail_quote"];
  }
  if (
    tailChunk.outgoingBoundary.connectiveKind === "quotative" ||
    tailChunk.outgoingBoundary.quoteBoundary !== undefined
  ) {
    return ["predicate_tail_quote"];
  }
  return ["predicate_tail_connective"];
}

function tailChainExtensionForChunk(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly chunk: Extract<TailChunkResult, { readonly ok: true }>;
  readonly attachment: TailAttachment;
}): {
  readonly segments: readonly TailChainSegment[];
  readonly tailEndExclusive: number;
  readonly representedBoundaryRelations: readonly BoundaryReadinessRelation["kind"][];
} | null {
  if (options.attachment.likeness === undefined || options.chunk.outgoingBoundary.kind === "terminal") {
    return null;
  }
  if (options.chunk.outgoingBoundary.connectiveKind !== "quotative") {
    return null;
  }
  const frame = quoteFocusLimitNegationTailStartingAt(options.cursor.fork(
    options.chunk.outgoingBoundary.tokenIdx,
    options.cursor.tokens.length,
    options.chunk.outgoingBoundary.tokenIdx
  ));
  if (frame === null) {
    return null;
  }
  return {
    segments: [segment("quote_focus_limit_negation", {
      start: frame.sourceSpan.start,
      endExclusive: frame.sourceSpan.end
    }, `limit_negation:${frame.marker.focusSurface}`)],
    tailEndExclusive: frame.sourceSpan.end,
    representedBoundaryRelations: ["external_quote_focus_limit_negation"]
  };
}

function segment(
  kind: TailChainSegmentKind,
  sourceSpan: HeadAnchorSpan,
  opKind: string
): TailChainSegment {
  return {
    kind,
    sourceSpan,
    opKind,
    capabilityId: TAIL_CHAIN_SEGMENT_CAPABILITIES[kind]
  };
}

interface SurfaceItem {
  readonly index: number;
  readonly surface: string;
}

function collectNonSpaceSurfaceItems(
  cursor: TokenCursor<RuntimeHaruToken>,
  maxCount: number
): readonly SurfaceItem[] {
  const items: SurfaceItem[] = [];
  for (let index = cursor.pos; index < cursor.end && items.length < maxCount; index += 1) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      break;
    }
    items.push({ index, surface: token.surface });
  }
  return items;
}

function hasFollowingContentForNominalFrameTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: {
    readonly tokenIdx: number;
    readonly layout?: ProjectionEvidenceLayout;
  }
): boolean {
  const { tokens, pos: start, end: limit } = cursor;
  const bounds = projectionContextBoundsForToken({
    tokens,
    tokenIdx: options.tokenIdx,
    fallbackUpperBound: limit,
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
  const token = firstFollowingProjectionContextToken(tokens, start, {
    limit: bounds.upperBound ?? limit
  });
  return token === undefined ? false : tokenIsNominalFrameFollowingContent(token);
}

function tokenIsNominalFrameFollowingContent(token: RuntimeHaruToken): boolean {
  const p0 = token.pos & POS0;
  return p0 !== 助詞 && p0 !== 助動詞 && p0 !== 接続詞;
}

function segmentKindsForAuxOp(op: AuxOpNode): readonly { readonly kind: TailChainSegmentKind; readonly opKind: string }[] {
  switch (op.kind) {
    case "copula":
      return op.polarity === "negative"
        ? [
            { kind: "copula", opKind: "copula_negative" },
            { kind: "negation", opKind: "copula_negative" }
          ]
        : [{ kind: "copula", opKind: "copula" }];
    case "negation":
      return [{ kind: "negation", opKind: "negation" }];
    case "tense":
      return op.tense === "past" ? [{ kind: "past", opKind: "past" }] : [];
    case "polite":
      return [{ kind: "polite", opKind: "polite" }];
    case "modal":
      return [{ kind: "modal", opKind: op.modal }];
    case "scopeBridge":
      return [{ kind: "scope_bridge", opKind: op.head ?? "scope_bridge" }];
    case "connective":
      return [{
        kind: isQuoteConnective(op.connective) ? "quote" : "connective",
        opKind: op.connective
      }];
    case "desire":
    case "voice":
    case "conjecture":
    case "adjCopulaBridge":
    case "aspect":
    case "postverbAuxiliary":
    case "predicateProjectionCarrier":
    case "predicateSuffix":
    case "classicalAuxResidue":
    case "idiom":
      return [{ kind: "aux_chain", opKind: op.kind }];
    case "predicateQuoteCarrier":
      return [{ kind: "quote", opKind: op.style }];
  }
}

function isQuoteConnective(connective: string): boolean {
  return connective === "quotative" ||
    connective === "question_quotative" ||
    connective === "question_content" ||
    connective === "wish_complement" ||
    connective === "request_complement";
}

function stemSourceSpan(stem: StemNode): HeadAnchorSpan | null {
  return sourceTokenSpan(stem.source.tokenIndices);
}

function sourceTokenSpan(tokenIndices: readonly number[]): HeadAnchorSpan | null {
  if (tokenIndices.length === 0) {
    return null;
  }
  const sorted = [...tokenIndices].sort((left, right) => left - right);
  return {
    start: sorted[0]!,
    endExclusive: sorted[sorted.length - 1]! + 1
  };
}
