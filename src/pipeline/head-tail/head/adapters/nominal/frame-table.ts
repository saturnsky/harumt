import { type DataLoader } from "../../../../../data-loader.js";
import { resolveDataSection } from "../../../../../dictionary/data-section.js";
import { PARTICLE_PAIRS, type ParticleKey } from "../../../../../generator/particles.js";
import {
  JA_HOST_FORMS,
  NOMINAL_FRAME_FOCUS_VALUES,
  NOMINAL_FRAME_KINDS,
  NOMINAL_FRAME_OWNER_MODE_VALUES,
  TAIL_ATTACHMENT_COERCIONS,
  TAIL_ATTACHMENT_HOST_CLASSES,
  TAIL_ATTACHMENT_TE_POLICIES,
  type CandidateNominalProjectionCandidate,
  type CandidateNominalProjectionValue,
  type HeadLexicalFormNominalProjection,
  type JaHostForm,
  type NominalFrameConsumeFollowing,
  type NominalFrameConsumeFollowingRule,
  type NominalFrameFocus,
  type NominalFrameKind,
  type NominalFrameOwnerMode,
  type NominalFrameMatrixKey,
  type NominalFrameOwnerArbitrationPolicy,
  type NominalFramePredicatePreference,
  type NominalFrameProjection,
  type NominalFrameSpec,
  type TailAttachmentContract,
  type TailAttachmentCoercion,
  type TailAttachmentDeclaration,
  type TailAttachmentHostClass,
  type TailAttachmentHostRealization,
  type TailAttachmentPredicateMatch,
  type TailAttachmentTePolicy
} from "./grammar.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import {
  PROJECTION_EVIDENCE_SCOPES,
  PROJECTION_BOUNDARY_CLASSES,
  PROJECTION_HEAD_MODIFIER_KINDS,
  PROJECTION_TOKEN_SEMANTIC_CLASSES,
  type ProjectionBoundaryClass,
  type ProjectionCandidateSelector,
  type ProjectionHeadModifierSelector,
  type ProjectionPredicateSelector,
  type ProjectionLookupSpec,
  type ProjectionTokenSelector,
  type ProjectionTokenSemanticClass
} from "../../../grammar.js";
import { KOPOS_OF_NAME, 명사, 조사, 구 } from "../../../../../types/pos.js";
import { SOURCE_PREDICATE_SHAPE_VALUES } from "../../../tail/predicate-root/grammar.js";

const FRAME_TABLE_RELATIVE_PATH = "head-tail/tail_frames.jsonl";

export interface NominalFrameSurfaceMetadata {
  readonly id: string;
  readonly kind: NominalFrameKind;
  readonly surface: string;
  readonly focus: NominalFrameFocus;
  readonly requiresFollowingContent?: boolean;
  readonly ownerMode?: NominalFrameOwnerMode;
  readonly attachLeft?: boolean;
  readonly head?: ProjectionTokenSelector;
  readonly markerTokens?: readonly ProjectionTokenSelector[];
  readonly markerVerbOwnsObjectArgument?: boolean;
  readonly ownsKaMarker?: boolean;
  readonly match?: readonly ProjectionCandidateSelector[];
  readonly reject?: readonly ProjectionCandidateSelector[];
}

let cachedSpecs = new WeakMap<LookupTables, readonly NominalFrameSpec[]>();
let cachedSpecsBySurface = new WeakMap<LookupTables, ReadonlyMap<string, readonly NominalFrameSpec[]>>();
let lastParsedSpecs: readonly NominalFrameSpec[] | null = null;
let _cache: string | undefined;
let _nominalFrameDataGeneration = 0;
export function nominalFrameDataGeneration(): number { return _nominalFrameDataGeneration; }
let cachedSurfaceMetadata: readonly NominalFrameSurfaceMetadata[] | null = null;
let cachedAttachDeclarations: readonly TailAttachmentDeclaration[] | null = null;

export async function initNominalFrameData(loader: DataLoader, lookups: LookupTables): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), FRAME_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
  buildNominalFrameSpecs(lookups);
}

function parseNominalFrameSpec(line: string, lineNumber: number, lookups: LookupTables): NominalFrameSpec {
  return parseNominalFrameSpecRaw(JSON.parse(line) as Record<string, unknown>, lineNumber, lookups);
}

function parseNominalFrameSpecRaw(rawRow: Record<string, unknown>, lineNumber: number, lookups: LookupTables): NominalFrameSpec {
  const raw = rawRow as Partial<NominalFrameSpec> & {
    readonly korean?: unknown;
    readonly particleStem?: unknown;
    readonly projection?: unknown;
    readonly consumeFollowing?: unknown;
  };
  if (
    typeof raw.id !== "string" ||
    typeof raw.kind !== "string" ||
    typeof raw.surface !== "string" ||
    (typeof raw.korean !== "string" && raw.projection === undefined) ||
    !isNominalFrameKind(raw.kind) ||
    !("focus" in raw) ||
    !isNominalFrameFocus(raw.focus)
  ) {
    throw new Error(`invalid nominal frame spec at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    id: raw.id,
    kind: raw.kind,
    surface: raw.surface,
    projection: parseProjection(raw, lineNumber, lookups),
    ...(raw.outputPos === undefined ? {} : { outputPos: parseOutputPos(raw.outputPos, lineNumber) }),
    ...(raw.head === undefined ? {} : { head: parseProjectionTokenSelector(raw.head, lineNumber, -1, -1, "spec.head", lookups) }),
    ...(raw.markerTokens === undefined ? {} : { markerTokens: parseMarkerTokenSelectors(raw.markerTokens, lineNumber, lookups) }),
    ...(raw.match === undefined ? {} : { match: parseSpecMatchSelectors(raw.match, lineNumber, lookups) }),
    ...(raw.reject === undefined ? {} : { reject: parseSpecRejectSelectors(raw.reject, lineNumber, lookups) }),
    ...(raw.requiresFollowingContent === undefined
      ? {}
      : { requiresFollowingContent: parseBoolean(raw.requiresFollowingContent, lineNumber, "requiresFollowingContent") }),
    ...(raw.consumeFollowing === undefined
      ? {}
      : { consumeFollowing: parseConsumeFollowing(raw.consumeFollowing, lineNumber, lookups) }),
    ...(raw.attachLeft === undefined
      ? {}
      : { attachLeft: parseBoolean(raw.attachLeft, lineNumber, "attachLeft") }),
    ...(raw.matrixKey === undefined
      ? {}
      : { matrixKey: parseMatrixKey(raw.matrixKey, lineNumber) }),
    ...(raw.ownerMode === undefined ? {} : { ownerMode: parseOwnerMode(raw.ownerMode, lineNumber) }),
    ...(raw.ownerArbitration === undefined
      ? {}
      : { ownerArbitration: parseOwnerArbitration(raw.ownerArbitration, lineNumber) }),
    ...(raw.predicatePreference === undefined
      ? {}
      : { predicatePreference: parsePredicatePreference(raw.predicatePreference, lineNumber, lookups) }),
    ...(raw.attach === undefined ? {} : { attach: parseTailAttachmentContract(raw.attach, lineNumber) }),
    ...(raw.attachFamily === undefined ? {} : { attachFamily: parseAttachFamily(raw.attachFamily, lineNumber) }),
    focus: raw.focus,
    ...(typeof raw.description === "string" ? { description: raw.description } : {})
  };
}

function parseAttachFamily(value: unknown, lineNumber: number): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`invalid attachFamily at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}


function parseTailAttachmentContract(value: unknown, lineNumber: number): TailAttachmentContract {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid attach at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  assertKnownObjectKeys(value, ["accepts", "hostRealizations"], lineNumber, "attach");
  const raw = value as { readonly accepts?: unknown; readonly hostRealizations?: unknown };
  if (
    !Array.isArray(raw.accepts) ||
    raw.accepts.length === 0 ||
    !raw.accepts.every((form): form is JaHostForm => (JA_HOST_FORMS as readonly string[]).includes(form as string))
  ) {
    throw new Error(`invalid attach.accepts at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (typeof raw.hostRealizations !== "object" || raw.hostRealizations === null) {
    throw new Error(`invalid attach.hostRealizations at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  assertKnownObjectKeys(raw.hostRealizations, TAIL_ATTACHMENT_HOST_CLASSES, lineNumber, "attach.hostRealizations");
  const hostRealizations: Partial<Record<TailAttachmentHostClass, TailAttachmentHostRealization>> = {};
  for (const hostClass of TAIL_ATTACHMENT_HOST_CLASSES) {
    const entry = (raw.hostRealizations as Record<string, unknown>)[hostClass];
    if (entry !== undefined) {
      hostRealizations[hostClass] = parseTailAttachmentHostRealization(entry, lineNumber, hostClass);
    }
  }
  if (Object.keys(hostRealizations).length === 0) {
    throw new Error(`empty attach.hostRealizations at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { accepts: raw.accepts, hostRealizations };
}

function parseTailAttachmentHostRealization(
  value: unknown,
  lineNumber: number,
  hostClass: TailAttachmentHostClass
): TailAttachmentHostRealization {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid attach.hostRealizations.${hostClass} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const raw = value as Record<string, unknown>;
  if (raw.kind === "identity") {
    assertKnownObjectKeys(value, ["kind", "korean"], lineNumber, `attach.hostRealizations.${hostClass}`);
    if (raw.korean !== undefined && typeof raw.korean !== "string") {
      throw new Error(`invalid attach identity korean at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return { kind: "identity", ...(raw.korean === undefined ? {} : { korean: raw.korean }) };
  }
  if (raw.kind === "predicate_projection") {
    assertKnownObjectKeys(
      value,
      ["kind", "coercion", "connective", "match", "nominalClaim", "projection", "suffix", "korean"],
      lineNumber,
      `attach.hostRealizations.${hostClass}`
    );
    if (raw.nominalClaim !== undefined && raw.nominalClaim !== "arbitrate" && raw.nominalClaim !== "reject") {
      throw new Error(`invalid attach nominalClaim at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (!(TAIL_ATTACHMENT_COERCIONS as readonly string[]).includes(raw.coercion as string)) {
      throw new Error(`invalid attach coercion at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (typeof raw.connective !== "string" || raw.connective.length === 0) {
      throw new Error(`invalid attach connective at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    for (const field of ["projection", "suffix", "korean"] as const) {
      if (raw[field] !== undefined && typeof raw[field] !== "string") {
        throw new Error(`invalid attach ${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    return {
      kind: "predicate_projection",
      coercion: raw.coercion as TailAttachmentCoercion,
      connective: raw.connective,
      ...(raw.match === undefined ? {} : { match: parseTailAttachmentPredicateMatch(raw.match, lineNumber) }),
      ...(raw.nominalClaim === undefined ? {} : { nominalClaim: raw.nominalClaim as "arbitrate" | "reject" }),
      ...(raw.projection === undefined ? {} : { projection: raw.projection as string }),
      ...(raw.suffix === undefined ? {} : { suffix: raw.suffix as string }),
      ...(raw.korean === undefined ? {} : { korean: raw.korean as string })
    };
  }
  if (raw.kind === "adverbial") {
    assertKnownObjectKeys(value, ["kind", "fallback"], lineNumber, `attach.hostRealizations.${hostClass}`);
    if (raw.fallback !== undefined && raw.fallback !== "predicate_adverbialize") {
      throw new Error(`invalid attach adverbial fallback at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return { kind: "adverbial", ...(raw.fallback === undefined ? {} : { fallback: "predicate_adverbialize" }) };
  }
  if (raw.kind === "reject") {
    assertKnownObjectKeys(value, ["kind"], lineNumber, `attach.hostRealizations.${hostClass}`);
    return { kind: "reject" };
  }
  throw new Error(`unknown attach.hostRealizations.${hostClass}.kind at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseTailAttachmentPredicateMatch(value: unknown, lineNumber: number): TailAttachmentPredicateMatch {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid attach match at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  assertKnownObjectKeys(
    value,
    ["particle", "verbLemmas", "verbSurfaces", "tokenSurfaces", "fusedSurfaces", "matchBy", "te", "focusAfterTe"],
    lineNumber,
    "attach.match"
  );
  const raw = value as Record<string, unknown>;
  if (raw.particle !== undefined && typeof raw.particle !== "string") {
    throw new Error(`invalid attach match particle at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  for (const field of ["verbLemmas", "verbSurfaces", "tokenSurfaces", "fusedSurfaces"] as const) {
    const entry = raw[field];
    if (entry !== undefined && (!Array.isArray(entry) || entry.length === 0 || !entry.every((item) => typeof item === "string"))) {
      throw new Error(`invalid attach match ${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  if (raw.te !== undefined && !(TAIL_ATTACHMENT_TE_POLICIES as readonly string[]).includes(raw.te as string)) {
    throw new Error(`invalid attach match te at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (raw.matchBy !== undefined && raw.matchBy !== "surface_and_lemma" && raw.matchBy !== "lemma") {
    throw new Error(`invalid attach match matchBy at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (raw.matchBy === "lemma" && raw.verbSurfaces === undefined) {
    throw new Error(`attach match matchBy "lemma" requires canonical verbSurfaces at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (
    raw.focusAfterTe !== undefined &&
    (!Array.isArray(raw.focusAfterTe) || raw.focusAfterTe.length === 0 ||
      !raw.focusAfterTe.every((item) => item === "は" || item === "も"))
  ) {
    throw new Error(`invalid attach match focusAfterTe at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (raw.verbLemmas === undefined && raw.tokenSurfaces === undefined) {
    throw new Error(`attach match requires verbLemmas or tokenSurfaces at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    ...(raw.particle === undefined ? {} : { particle: raw.particle as string }),
    ...(raw.verbLemmas === undefined ? {} : { verbLemmas: raw.verbLemmas as readonly string[] }),
    ...(raw.verbSurfaces === undefined ? {} : { verbSurfaces: raw.verbSurfaces as readonly string[] }),
    ...(raw.tokenSurfaces === undefined ? {} : { tokenSurfaces: raw.tokenSurfaces as readonly string[] }),
    ...(raw.fusedSurfaces === undefined ? {} : { fusedSurfaces: raw.fusedSurfaces as readonly string[] }),
    ...(raw.matchBy === undefined ? {} : { matchBy: raw.matchBy as "surface_and_lemma" | "lemma" }),
    ...(raw.te === undefined ? {} : { te: raw.te as TailAttachmentTePolicy }),
    ...(raw.focusAfterTe === undefined ? {} : { focusAfterTe: raw.focusAfterTe as readonly ("は" | "も")[] })
  };
}

function parseAttachOnlyDeclaration(line: string, lineNumber: number): TailAttachmentDeclaration {
  const raw = JSON.parse(line) as Record<string, unknown>;
  assertKnownObjectKeys(raw, ["id", "attachOnly", "surface", "attach", "description"], lineNumber, "attachOnly row");
  if (typeof raw.id !== "string" || typeof raw.surface !== "string" || raw.attach === undefined) {
    throw new Error(`invalid attachOnly row at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    id: raw.id,
    surface: raw.surface,
    attach: parseTailAttachmentContract(raw.attach, lineNumber),
    ...(typeof raw.description === "string" ? { description: raw.description } : {})
  };
}

function isAttachOnlyRowLine(line: string): boolean {
  return (JSON.parse(line) as { readonly attachOnly?: unknown }).attachOnly === true;
}

function parseMatrixKey(raw: unknown, lineNumber: number): NominalFrameMatrixKey {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid matrixKey at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.particle !== "string" ||
    typeof obj.verbLemma !== "string" ||
    typeof obj.trailingParticle !== "string"
  ) {
    throw new Error(`invalid matrixKey fields at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const fusedVariants = obj.fusedVariants;
  if (fusedVariants !== undefined && (!Array.isArray(fusedVariants) || fusedVariants.some((v) => typeof v !== "string"))) {
    throw new Error(`invalid matrixKey.fusedVariants at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    particle: obj.particle,
    verbLemma: obj.verbLemma,
    trailingParticle: obj.trailingParticle,
    ...(fusedVariants === undefined ? {} : { fusedVariants: fusedVariants as readonly string[] })
  };
}

function isNominalFrameKind(value: unknown): value is NominalFrameKind {
  return typeof value === "string" && (NOMINAL_FRAME_KINDS as readonly string[]).includes(value);
}

function isNominalFrameFocus(value: unknown): value is NominalFrameFocus {
  return (NOMINAL_FRAME_FOCUS_VALUES as readonly unknown[]).includes(value);
}

function isNominalFrameOwnerMode(value: unknown): value is NominalFrameOwnerMode {
  return (NOMINAL_FRAME_OWNER_MODE_VALUES as readonly unknown[]).includes(value);
}

function parseOutputPos(value: unknown, lineNumber: number): NonNullable<NominalFrameSpec["outputPos"]> {
  const resolved = typeof value === "string" ? KOPOS_OF_NAME[value] : value;
  if (resolved === 명사 || resolved === 조사 || resolved === 구) {
    return resolved;
  }
  throw new Error(`invalid nominal frame outputPos at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseOwnerMode(value: unknown, lineNumber: number): NominalFrameOwnerMode {
  if (isNominalFrameOwnerMode(value)) {
    return value;
  }
  throw new Error(`invalid nominal frame ownerMode at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseOwnerArbitration(value: unknown, lineNumber: number): NominalFrameOwnerArbitrationPolicy {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid nominal frame ownerArbitration at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  assertKnownObjectKeys(
    value,
    [
      "predicateNominalNoLexicalParticle",
      "demoNegativeTail",
      "standpointPerspectiveTail",
      "externalNominalizerPredicate",
      "transparentPauseDiscourseBoundary",
      "boundNominalReasonContinuation",
      "ownedPredicateChainContinuation",
      "markerVerbOwnsObjectArgument",
      "whIndefiniteKaOwnership",
      "uncertainCauseKaOwnership",
      "ownsKaMarker"
    ],
    lineNumber,
    "ownerArbitration"
  );
  const raw = value as {
    readonly predicateNominalNoLexicalParticle?: unknown;
    readonly demoNegativeTail?: unknown;
    readonly standpointPerspectiveTail?: unknown;
    readonly externalNominalizerPredicate?: unknown;
    readonly transparentPauseDiscourseBoundary?: unknown;
    readonly boundNominalReasonContinuation?: unknown;
    readonly ownedPredicateChainContinuation?: unknown;
    readonly markerVerbOwnsObjectArgument?: unknown;
    readonly whIndefiniteKaOwnership?: unknown;
    readonly uncertainCauseKaOwnership?: unknown;
    readonly ownsKaMarker?: unknown;
  };
  return {
    ...(raw.whIndefiniteKaOwnership === undefined
      ? {}
      : {
        whIndefiniteKaOwnership: parseBoolean(
          raw.whIndefiniteKaOwnership,
          lineNumber,
          "ownerArbitration.whIndefiniteKaOwnership"
        )
      }),
    ...(raw.uncertainCauseKaOwnership === undefined
      ? {}
      : {
        uncertainCauseKaOwnership: parseBoolean(
          raw.uncertainCauseKaOwnership,
          lineNumber,
          "ownerArbitration.uncertainCauseKaOwnership"
        )
      }),
    ...(raw.ownsKaMarker === undefined
      ? {}
      : {
        ownsKaMarker: parseBoolean(raw.ownsKaMarker, lineNumber, "ownerArbitration.ownsKaMarker")
      }),
    ...(raw.predicateNominalNoLexicalParticle === undefined
      ? {}
      : {
        predicateNominalNoLexicalParticle: parseBoolean(
          raw.predicateNominalNoLexicalParticle,
          lineNumber,
          "ownerArbitration.predicateNominalNoLexicalParticle"
        )
      }),
    ...(raw.demoNegativeTail === undefined
      ? {}
      : {
        demoNegativeTail: parseBoolean(
          raw.demoNegativeTail,
          lineNumber,
          "ownerArbitration.demoNegativeTail"
        )
      }),
    ...(raw.standpointPerspectiveTail === undefined
      ? {}
      : {
        standpointPerspectiveTail: parseBoolean(
          raw.standpointPerspectiveTail,
          lineNumber,
          "ownerArbitration.standpointPerspectiveTail"
        )
      }),
    ...(raw.externalNominalizerPredicate === undefined
      ? {}
      : {
        externalNominalizerPredicate: parseBoolean(
          raw.externalNominalizerPredicate,
          lineNumber,
          "ownerArbitration.externalNominalizerPredicate"
        )
      }),
    ...(raw.transparentPauseDiscourseBoundary === undefined
      ? {}
      : {
        transparentPauseDiscourseBoundary: parseBoolean(
          raw.transparentPauseDiscourseBoundary,
          lineNumber,
          "ownerArbitration.transparentPauseDiscourseBoundary"
        )
      }),
    ...(raw.boundNominalReasonContinuation === undefined
      ? {}
      : {
        boundNominalReasonContinuation: parseBoolean(
          raw.boundNominalReasonContinuation,
          lineNumber,
          "ownerArbitration.boundNominalReasonContinuation"
        )
      }),
    ...(raw.ownedPredicateChainContinuation === undefined
      ? {}
      : {
        ownedPredicateChainContinuation: parseOwnedPredicateChainContinuation(
          raw.ownedPredicateChainContinuation,
          lineNumber
        )
      }),
    ...(raw.markerVerbOwnsObjectArgument === undefined
      ? {}
      : {
        markerVerbOwnsObjectArgument: parseBoolean(
          raw.markerVerbOwnsObjectArgument,
          lineNumber,
          "ownerArbitration.markerVerbOwnsObjectArgument"
        )
      })
  };
}

function parseOwnedPredicateChainContinuation(
  value: unknown,
  lineNumber: number
): NonNullable<NominalFrameOwnerArbitrationPolicy["ownedPredicateChainContinuation"]> {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid nominal frame ownerArbitration.ownedPredicateChainContinuation at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  assertKnownObjectKeys(
    value,
    ["rejectSourceSurfaces", "rejectPrecedingSurfaces", "rejectPrecedingWindow"],
    lineNumber,
    "ownerArbitration.ownedPredicateChainContinuation"
  );
  const raw = value as {
    readonly rejectSourceSurfaces?: unknown;
    readonly rejectPrecedingSurfaces?: unknown;
    readonly rejectPrecedingWindow?: unknown;
  };
  return {
    ...(raw.rejectSourceSurfaces === undefined
      ? {}
      : {
        rejectSourceSurfaces: parseOwnerArbitrationStringArray(
          raw.rejectSourceSurfaces,
          lineNumber,
          "ownerArbitration.ownedPredicateChainContinuation.rejectSourceSurfaces"
        )
      }),
    ...(raw.rejectPrecedingSurfaces === undefined
      ? {}
      : {
        rejectPrecedingSurfaces: parseOwnerArbitrationStringArray(
          raw.rejectPrecedingSurfaces,
          lineNumber,
          "ownerArbitration.ownedPredicateChainContinuation.rejectPrecedingSurfaces"
        )
      }),
    ...(raw.rejectPrecedingWindow === undefined
      ? {}
      : {
        rejectPrecedingWindow: parseNonNegativeInteger(
          raw.rejectPrecedingWindow,
          lineNumber,
          "ownerArbitration.ownedPredicateChainContinuation.rejectPrecedingWindow"
        )
      })
  };
}

function parseOwnerArbitrationStringArray(raw: unknown, lineNumber: number, field: string): readonly string[] {
  if (!Array.isArray(raw) || !raw.every((value) => typeof value === "string")) {
    throw new Error(`invalid nominal frame ${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return raw;
}

function assertKnownObjectKeys(
  value: object,
  allowedKeys: readonly string[],
  lineNumber: number,
  field: string
): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new Error(`unknown nominal frame ${field}.${key} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
}

function parsePredicatePreference(value: unknown, lineNumber: number, lookups: LookupTables): NominalFramePredicatePreference {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid nominal frame predicatePreference at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const raw = value as {
    readonly kind?: unknown;
    readonly predicate?: unknown;
    readonly candidateKorean?: unknown;
    readonly reason?: unknown;
  };
  if (
    raw.kind !== "stem_candidate" ||
    !Array.isArray(raw.candidateKorean) ||
    !raw.candidateKorean.every((item) => typeof item === "string") ||
    (raw.reason !== undefined && typeof raw.reason !== "string")
  ) {
    throw new Error(`invalid nominal frame predicatePreference at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    kind: "stem_candidate",
    ...(raw.predicate === undefined
      ? {}
      : { predicate: parseProjectionTokenSelector(raw.predicate, lineNumber, -1, -1, "predicatePreference.predicate", lookups) }),
    candidateKorean: raw.candidateKorean,
    ...(raw.reason === undefined ? {} : { reason: raw.reason })
  };
}

function parseBoolean(value: unknown, lineNumber: number, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`invalid nominal frame ${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parseNonNegativeInteger(value: unknown, lineNumber: number, field: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`invalid nominal frame ${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value as number;
}

function parseProjection(
  raw: Partial<NominalFrameSpec> & { readonly korean?: unknown; readonly particleStem?: unknown; readonly projection?: unknown },
  lineNumber: number,
  lookups: LookupTables
): NominalFrameProjection {
  if (raw.projection === undefined) {
    if (typeof raw.korean !== "string") {
      throw new Error(`invalid nominal frame projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return {
      kind: "deterministic",
      korean: raw.korean,
      ...(raw.particleStem === undefined ? {} : { particleStem: parseParticleStem(raw.particleStem, lineNumber) })
    };
  }
  if (typeof raw.projection !== "object" || !("kind" in raw.projection)) {
    throw new Error(`invalid nominal frame projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const projection = raw.projection as Partial<NominalFrameProjection>;
  if (projection.kind === "deterministic") {
    if (typeof projection.korean !== "string") {
      throw new Error(`invalid deterministic nominal projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const particleStem = (projection as { readonly particleStem?: unknown }).particleStem;
    return {
      kind: "deterministic",
      korean: projection.korean,
      ...(particleStem === undefined ? {} : { particleStem: parseParticleStem(particleStem, lineNumber) })
    };
  }
  if (projection.kind === "particle") {
    const particleKey = (projection as { readonly particleKey?: unknown }).particleKey;
    const suffix = (projection as { readonly suffix?: unknown }).suffix;
    if (!isParticleKey(particleKey) || (suffix !== undefined && typeof suffix !== "string")) {
      throw new Error(`invalid particle nominal projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return {
      kind: "particle",
      particleKey,
      ...(suffix === undefined ? {} : { suffix })
    };
  }
  if (projection.kind === "negativeCopulaPredicate") {
    return parseNegativeCopulaPredicateProjection(projection, lineNumber, "nominal projection");
  }
  if (projection.kind === "hostSuffix") {
    return parseHostSuffixProjection(projection, lineNumber, "nominal projection");
  }
  if (projection.kind === "headLexicalForm") {
    return parseHeadLexicalFormProjection(projection, lineNumber);
  }
  if (projection.kind !== "candidateSet") {
    throw new Error(`unknown nominal projection kind at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const quotedClauseHostDefault = (projection as { readonly quotedClauseHostDefaultCandidateId?: unknown })
    .quotedClauseHostDefaultCandidateId;
  if (
    typeof projection.defaultCandidateId !== "string" ||
    !Array.isArray(projection.candidates) ||
    (projection.warnOnDefault !== undefined && typeof projection.warnOnDefault !== "boolean") ||
    (quotedClauseHostDefault !== undefined && typeof quotedClauseHostDefault !== "string")
  ) {
    throw new Error(`invalid candidate nominal projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const candidates = projection.candidates.map((candidate, index) =>
    parseProjectionCandidate(candidate, lineNumber, index, lookups)
  );
  if (!candidates.some((candidate) => candidate.id === projection.defaultCandidateId)) {
    throw new Error(`missing default nominal projection candidate at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (quotedClauseHostDefault !== undefined && !candidates.some((candidate) => candidate.id === quotedClauseHostDefault)) {
    throw new Error(`missing quoted clause host default nominal projection candidate at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    kind: "candidateSet",
    defaultCandidateId: projection.defaultCandidateId,
    candidates,
    ...(projection.warnOnDefault === undefined ? {} : { warnOnDefault: projection.warnOnDefault }),
    ...(quotedClauseHostDefault === undefined ? {} : { quotedClauseHostDefaultCandidateId: quotedClauseHostDefault })
  };
}

function parseHeadLexicalFormProjection(
  projection: object,
  lineNumber: number
): HeadLexicalFormNominalProjection {
  const raw = projection as { readonly field?: unknown; readonly fallback?: unknown };
  if (raw.field !== "kaForm" || raw.fallback !== "host_bare") {
    throw new Error(`invalid headLexicalForm nominal projection at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { kind: "headLexicalForm", field: "kaForm", fallback: "host_bare" };
}

function parseConsumeFollowing(
  value: unknown,
  lineNumber: number,
  lookups: LookupTables
): NominalFrameConsumeFollowing {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`invalid nominal frame consumeFollowing at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value.map((entry, index): NominalFrameConsumeFollowingRule => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`invalid consumeFollowing[${index}] at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    assertKnownObjectKeys(entry, ["head", "surfaces", "maxTokens"], lineNumber, `consumeFollowing[${index}]`);
    const raw = entry as { readonly head?: unknown; readonly surfaces?: unknown; readonly maxTokens?: unknown };
    if (
      raw.head === undefined ||
      !Array.isArray(raw.surfaces) ||
      raw.surfaces.length === 0 ||
      raw.surfaces.some((surface) => typeof surface !== "string" || surface.length === 0)
    ) {
      throw new Error(`invalid consumeFollowing[${index}] fields at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return {
      head: parseProjectionTokenSelector(raw.head, lineNumber, -1, index, `consumeFollowing[${index}].head`, lookups),
      surfaces: raw.surfaces as readonly string[],
      maxTokens: parseNonNegativeInteger(raw.maxTokens, lineNumber, `consumeFollowing[${index}].maxTokens`)
    };
  });
}

function isParticleKey(value: unknown): value is ParticleKey {
  return typeof value === "string" && value in PARTICLE_PAIRS;
}

function parseParticleStem(value: unknown, lineNumber: number): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`invalid nominal frame particleStem at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return value;
}

function parseProjectionCandidate(
  raw: unknown,
  lineNumber: number,
  index: number,
  lookups: LookupTables
): CandidateNominalProjectionCandidate {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid nominal projection candidate ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const candidate = raw as Partial<CandidateNominalProjectionCandidate>;
  if (
    typeof candidate.id !== "string" ||
    (typeof candidate.korean !== "string" && candidate.projection === undefined)
  ) {
    throw new Error(`invalid nominal projection candidate ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  let parsed: CandidateNominalProjectionCandidate = {
    id: candidate.id,
    ...(Array.isArray(candidate.evidence) && candidate.evidence.every((value) => typeof value === "string")
      ? { evidence: candidate.evidence }
      : {})
  };
  if (typeof candidate.korean === "string") {
    parsed = { ...parsed, korean: candidate.korean };
  }
  if (candidate.particleStem !== undefined) {
    parsed = { ...parsed, particleStem: parseParticleStem(candidate.particleStem, lineNumber) };
  }
  if (candidate.projection !== undefined) {
    parsed = { ...parsed, projection: parseCandidateProjection(candidate.projection, lineNumber, index) };
  }
  if (candidate.requiresNominalHost !== undefined) {
    if (typeof candidate.requiresNominalHost !== "boolean") {
      throw new Error(`invalid nominal projection candidate requiresNominalHost ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    parsed = { ...parsed, requiresNominalHost: candidate.requiresNominalHost };
  }
  return Array.isArray(candidate.selectors)
    ? { ...parsed, selectors: parseProjectionCandidateSelectors(candidate.selectors, lineNumber, index, lookups) }
    : parsed;
}

function parseCandidateProjection(
  raw: unknown,
  lineNumber: number,
  index: number
): CandidateNominalProjectionValue {
  if (typeof raw !== "object" || raw === null || !("kind" in raw)) {
    throw new Error(`invalid nominal projection candidate projection ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const projection = raw as Partial<CandidateNominalProjectionValue>;
  if (projection.kind === "deterministic") {
    if (typeof projection.korean !== "string") {
      throw new Error(`invalid deterministic nominal projection candidate ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const particleStem = (projection as { readonly particleStem?: unknown }).particleStem;
    return {
      kind: "deterministic",
      korean: projection.korean,
      ...(particleStem === undefined ? {} : { particleStem: parseParticleStem(particleStem, lineNumber) })
    };
  }
  if (projection.kind === "particle") {
    const particleKey = (projection as { readonly particleKey?: unknown }).particleKey;
    const suffix = (projection as { readonly suffix?: unknown }).suffix;
    if (!isParticleKey(particleKey) || (suffix !== undefined && typeof suffix !== "string")) {
      throw new Error(`invalid particle nominal projection candidate ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return {
      kind: "particle",
      particleKey,
      ...(suffix === undefined ? {} : { suffix })
    };
  }
  if (projection.kind === "negativeCopulaPredicate") {
    return parseNegativeCopulaPredicateProjection(
      projection,
      lineNumber,
      `nominal projection candidate ${index}`
    );
  }
  if (projection.kind === "hostSuffix") {
    return parseHostSuffixProjection(projection, lineNumber, `nominal projection candidate ${index}`);
  }
  throw new Error(`unknown nominal projection candidate kind ${index} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseNegativeCopulaPredicateProjection(
  projection: Partial<CandidateNominalProjectionValue>,
  lineNumber: number,
  label: string
): CandidateNominalProjectionValue {
  const raw = projection as {
    readonly prefix?: unknown;
    readonly polite?: unknown;
    readonly past?: unknown;
  };
  if (
    typeof raw.prefix !== "string" ||
    typeof raw.polite !== "boolean" ||
    typeof raw.past !== "boolean"
  ) {
    throw new Error(`invalid negativeCopulaPredicate ${label} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    kind: "negativeCopulaPredicate",
    prefix: raw.prefix,
    polite: raw.polite,
    past: raw.past
  };
}

function parseHostSuffixProjection(
  projection: Partial<CandidateNominalProjectionValue>,
  lineNumber: number,
  label: string
): CandidateNominalProjectionValue {
  const raw = projection as {
    readonly suffix?: unknown;
  };
  if (typeof raw.suffix !== "string") {
    throw new Error(`invalid hostSuffix ${label} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    kind: "hostSuffix",
    suffix: raw.suffix
  };
}

function parseProjectionCandidateSelectors(
  raw: readonly unknown[],
  lineNumber: number,
  candidateIndex: number,
  lookups: LookupTables
): readonly ProjectionCandidateSelector[] {
  return raw.map((selector, selectorIndex) => {
    if (typeof selector !== "object" || selector === null) {
      throw new Error(`invalid nominal projection selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const item = selector as Partial<ProjectionCandidateSelector>;
    if (
      item.kind !== "head" &&
      item.kind !== "head_modifier" &&
      item.kind !== "following_token" &&
      item.kind !== "following_sequence" &&
      item.kind !== "following_predicate" &&
      item.kind !== "preceding_token" &&
      item.kind !== "preceding_sequence" &&
      item.kind !== "following_boundary" &&
      item.kind !== "preceding_boundary" &&
      item.kind !== "following_noun_phrase"
    ) {
      throw new Error(`unknown nominal projection selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (item.kind === "head" && item.head === undefined) {
      throw new Error(`head nominal projection selector requires head ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (item.kind === "following_noun_phrase" && item.token === undefined) {
      throw new Error(`following_noun_phrase nominal projection selector requires token ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (item.kind === "following_predicate" && item.predicate === undefined) {
      throw new Error(`following_predicate nominal projection selector requires predicate ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    if (item.window !== undefined && (typeof item.window !== "number" || item.window < 1)) {
      throw new Error(`invalid nominal projection selector window ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }

    if (
      item.scope !== undefined &&
      !(PROJECTION_EVIDENCE_SCOPES as readonly string[]).includes(item.scope)
    ) {
      throw new Error(`invalid nominal projection selector scope ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    return {
      kind: item.kind,
      ...(item.window === undefined ? {} : { window: item.window }),
      ...(item.start === undefined ? {} : { start: item.start }),
      ...(item.scope === undefined ? {} : { scope: item.scope }),
      ...(item.head === undefined ? {} : { head: parseProjectionTokenSelector(item.head, lineNumber, candidateIndex, selectorIndex, "head", lookups) }),
      ...(item.token === undefined ? {} : { token: parseProjectionTokenSelector(item.token, lineNumber, candidateIndex, selectorIndex, "token", lookups) }),
      ...(item.sequence === undefined ? {} : { sequence: parseProjectionTokenSelectorSequence(item.sequence, lineNumber, candidateIndex, selectorIndex, lookups) }),
      ...(item.boundary === undefined ? {} : { boundary: parseProjectionBoundarySelector(item.boundary, lineNumber, candidateIndex, selectorIndex) }),
      ...(item.predicate === undefined ? {} : { predicate: parseProjectionPredicateSelector(item.predicate, lineNumber, candidateIndex, selectorIndex, lookups) }),
      ...(item.modifier === undefined ? {} : { modifier: parseProjectionHeadModifierSelector(item.modifier, lineNumber, candidateIndex, selectorIndex) })
    };
  });
}

function parseProjectionHeadModifierSelector(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number
): ProjectionHeadModifierSelector {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`invalid nominal projection head modifier selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const item = raw as { readonly kinds?: unknown };
  if (item.kinds === undefined) {
    return {};
  }
  if (
    !Array.isArray(item.kinds) ||
    !item.kinds.every((kind) => (PROJECTION_HEAD_MODIFIER_KINDS as readonly unknown[]).includes(kind))
  ) {
    throw new Error(`invalid nominal projection head modifier selector kinds ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { kinds: item.kinds as NonNullable<ProjectionHeadModifierSelector["kinds"]> };
}

function parseProjectionPredicateSelector(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  lookups: LookupTables
): ProjectionPredicateSelector {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid nominal projection predicate selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const item = raw as {
    readonly voice?: unknown;
    readonly connectiveRole?: unknown;
    readonly hasNegative?: unknown;
    readonly hasCausative?: unknown;
    readonly hasCausativePassive?: unknown;
    readonly hasRequestTail?: unknown;
    readonly hasBenefactiveTail?: unknown;
    readonly head?: unknown;
    readonly sourcePredicateShape?: unknown;
    readonly owner?: unknown;
  };
  if (item.owner !== undefined && item.owner !== "layout" && item.owner !== "topic_clause" && item.owner !== "any") {
    throw new Error(`invalid nominal projection predicate owner ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (
    item.sourcePredicateShape !== undefined &&
    (!Array.isArray(item.sourcePredicateShape) ||
      !item.sourcePredicateShape.every((value) => (SOURCE_PREDICATE_SHAPE_VALUES as readonly unknown[]).includes(value)))
  ) {
    throw new Error(`invalid nominal projection predicate sourcePredicateShape ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const parsed = {
    ...(item.head === undefined ? {} : { head: parseProjectionTokenSelector(item.head, lineNumber, candidateIndex, selectorIndex, "predicate.head", lookups) }),
    ...(parseOptionalStringArray(item.sourcePredicateShape, "sourcePredicateShape", lineNumber, candidateIndex, selectorIndex, "predicate")),
    ...(item.owner === undefined ? {} : { owner: item.owner as "layout" | "topic_clause" | "any" }),
    ...(parseOptionalStringArray(item.voice, "voice", lineNumber, candidateIndex, selectorIndex, "predicate")),
    ...(parseOptionalStringArray(item.connectiveRole, "connectiveRole", lineNumber, candidateIndex, selectorIndex, "predicate")),
    ...(item.hasNegative === undefined ? {} : { hasNegative: parseBoolean(item.hasNegative, lineNumber, `predicate.hasNegative ${candidateIndex}.${selectorIndex}`) }),
    ...(item.hasCausative === undefined ? {} : { hasCausative: parseBoolean(item.hasCausative, lineNumber, `predicate.hasCausative ${candidateIndex}.${selectorIndex}`) }),
    ...(item.hasCausativePassive === undefined ? {} : { hasCausativePassive: parseBoolean(item.hasCausativePassive, lineNumber, `predicate.hasCausativePassive ${candidateIndex}.${selectorIndex}`) }),
    ...(item.hasRequestTail === undefined ? {} : { hasRequestTail: parseBoolean(item.hasRequestTail, lineNumber, `predicate.hasRequestTail ${candidateIndex}.${selectorIndex}`) }),
    ...(item.hasBenefactiveTail === undefined ? {} : { hasBenefactiveTail: parseBoolean(item.hasBenefactiveTail, lineNumber, `predicate.hasBenefactiveTail ${candidateIndex}.${selectorIndex}`) })
  };
  if (Object.keys(parsed).length === 0) {
    throw new Error(`empty nominal projection predicate selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parsed;
}

function parseProjectionBoundarySelector(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number
): NonNullable<ProjectionCandidateSelector["boundary"]> {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid nominal projection boundary selector ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const item = raw as { readonly classes?: unknown };
  if (item.classes !== undefined && !isBoundaryClassArray(item.classes)) {
    throw new Error(`invalid nominal projection boundary classes ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return {
    ...(item.classes === undefined ? {} : { classes: item.classes })
  };
}

function isBoundaryClassArray(value: unknown): value is readonly ProjectionBoundaryClass[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string" && (PROJECTION_BOUNDARY_CLASSES as readonly string[]).includes(item));
}

function parseSpecRejectSelectors(raw: unknown, lineNumber: number, lookups: LookupTables): readonly ProjectionCandidateSelector[] {
  if (!Array.isArray(raw)) {
    throw new Error(`invalid nominal frame reject selectors at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parseProjectionCandidateSelectors(raw, lineNumber, -1, lookups);
}

function parseMarkerTokenSelectors(raw: unknown, lineNumber: number, lookups: LookupTables): readonly ProjectionTokenSelector[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`invalid nominal frame markerTokens at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return raw.map((token, tokenIndex) =>
    parseProjectionTokenSelector(token, lineNumber, -1, -1, `spec.markerTokens.${tokenIndex}`, lookups)
  );
}

function parseSpecMatchSelectors(raw: unknown, lineNumber: number, lookups: LookupTables): readonly ProjectionCandidateSelector[] {
  if (!Array.isArray(raw)) {
    throw new Error(`invalid nominal frame match selectors at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parseProjectionCandidateSelectors(raw, lineNumber, -1, lookups);
}

function parseProjectionTokenSelectorSequence(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  lookups: LookupTables
): readonly ProjectionTokenSelector[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`invalid nominal projection selector sequence ${candidateIndex}.${selectorIndex} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return raw.map((token, tokenIndex) =>
    parseProjectionTokenSelector(token, lineNumber, candidateIndex, selectorIndex, `sequence.${tokenIndex}`, lookups)
  );
}

function parseProjectionTokenSelector(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string,
  lookups: LookupTables
): ProjectionTokenSelector {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid nominal projection token selector ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const selector = raw as Record<string, unknown>;
  const parsed = {
    ...(parseOptionalStringArray(selector.surface, "surface", lineNumber, candidateIndex, selectorIndex, field)),
    ...(parseOptionalStringArray(selector.dictionaryForm, "dictionaryForm", lineNumber, candidateIndex, selectorIndex, field)),
    ...(selector.lookup === undefined ? {} : { lookup: parseProjectionLookupSpec(selector.lookup, lineNumber, candidateIndex, selectorIndex, field, lookups) }),
    ...(selector.semantic === undefined
      ? {}
      : { semantic: parseProjectionSemanticClasses(selector.semantic, lineNumber, candidateIndex, selectorIndex, field) }),
    ...(parseOptionalStringArray(selector.pos0, "pos0", lineNumber, candidateIndex, selectorIndex, field)),
    ...(parseOptionalStringArray(selector.pos1, "pos1", lineNumber, candidateIndex, selectorIndex, field)),
    ...(parseOptionalStringArray(selector.pos4, "pos4", lineNumber, candidateIndex, selectorIndex, field)),
    ...(parseOptionalStringArray(selector.pos5, "pos5", lineNumber, candidateIndex, selectorIndex, field))
  };
  if (Object.keys(parsed).length === 0) {
    throw new Error(`empty nominal projection token selector ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parsed;
}

function parseProjectionSemanticClasses(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string
): readonly ProjectionTokenSemanticClass[] {
  if (!Array.isArray(raw) || !raw.every((value) => typeof value === "string")) {
    throw new Error(`invalid nominal projection semantic selector ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  for (const value of raw) {
    if (!(PROJECTION_TOKEN_SEMANTIC_CLASSES as readonly string[]).includes(value)) {
      throw new Error(`unknown nominal projection semantic selector ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  return raw as readonly ProjectionTokenSemanticClass[];
}

function parseProjectionLookupSpec(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string,
  lookups: LookupTables
): ProjectionLookupSpec {
  if (typeof raw === "string") {
    validateKnownLookup(raw, lineNumber, candidateIndex, selectorIndex, field, lookups);
    return raw;
  }
  if (Array.isArray(raw)) {
    if (!raw.every((value) => typeof value === "string")) {
      throw new Error(`invalid nominal projection lookup ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    for (const name of raw) {
      validateKnownLookup(name, lineNumber, candidateIndex, selectorIndex, field, lookups);
    }
    return raw;
  }
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`invalid nominal projection lookup ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const value = raw as Record<string, unknown>;
  const parsed = {
    ...(parseLookupSets(value.sets, lineNumber, candidateIndex, selectorIndex, field, lookups)),
    ...(parseOptionalStringArray(value.extras, "extras", lineNumber, candidateIndex, selectorIndex, field)),
    ...(parseOptionalStringArray(value.exclude, "exclude", lineNumber, candidateIndex, selectorIndex, field))
  };
  if (Object.keys(parsed).length === 0) {
    throw new Error(`empty nominal projection lookup ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return parsed;
}

function parseLookupSets(
  raw: unknown,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string,
  lookups: LookupTables
): Record<string, string | readonly string[]> {
  if (raw === undefined) {
    return {};
  }
  if (typeof raw === "string") {
    validateKnownLookup(raw, lineNumber, candidateIndex, selectorIndex, field, lookups);
    return { sets: raw };
  }
  if (!Array.isArray(raw) || !raw.every((value) => typeof value === "string")) {
    throw new Error(`invalid nominal projection lookup sets ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  for (const name of raw) {
    validateKnownLookup(name, lineNumber, candidateIndex, selectorIndex, field, lookups);
  }
  return { sets: raw };
}

function validateKnownLookup(
  name: string,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string,
  lookups: LookupTables
): void {
  if (lookups.named(name) === undefined) {
    throw new Error(`unknown nominal projection lookup ${JSON.stringify(name)} ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
}

function parseOptionalStringArray(
  raw: unknown,
  fieldName: string,
  lineNumber: number,
  candidateIndex: number,
  selectorIndex: number,
  field: string
): Record<string, readonly string[]> {
  if (raw === undefined) {
    return {};
  }
  if (!Array.isArray(raw) || !raw.every((value) => typeof value === "string")) {
    throw new Error(`invalid nominal projection token selector ${fieldName} ${candidateIndex}.${selectorIndex}.${field} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  return { [fieldName]: raw };
}

const EXTERNAL_NOMINALIZER_REJECT_SELECTOR: ProjectionCandidateSelector = {
  kind: "head",
  head: { pos1: ["準体助詞"] }
};

function materializeAttachDerivations(specs: readonly NominalFrameSpec[]): readonly NominalFrameSpec[] {
  const byId = new Map(specs.map((spec) => [spec.id, spec] as const));
  return specs.map((spec) => {
    let base: NominalFrameSpec | undefined = spec;
    if (spec.attachFamily !== undefined) {
      base = byId.get(spec.attachFamily);
      if (base === undefined || base.attach === undefined || base.attachFamily !== undefined) {
        throw new Error(
          `attachFamily '${spec.attachFamily}' of '${spec.id}' must name an attach-bearing base row at ${FRAME_TABLE_RELATIVE_PATH}`
        );
      }
    }
    const predicate = base?.attach?.hostRealizations.predicate;
    if (predicate?.kind !== "predicate_projection" || predicate.coercion !== "explicit_no") {
      return spec;
    }
    if (predicate.nominalClaim === "reject") {
      if (spec.focus === "の") {
        return spec;
      }
      return {
        ...spec,
        reject: [...(spec.reject ?? []), EXTERNAL_NOMINALIZER_REJECT_SELECTOR]
      };
    }
    if (spec.ownerArbitration?.externalNominalizerPredicate === true) {
      return spec;
    }
    return {
      ...spec,
      ownerArbitration: { ...(spec.ownerArbitration ?? {}), externalNominalizerPredicate: true }
    };
  });
}

const FOCUS_VARIANT_ID_SUFFIX: Record<string, string> = { "は": "_wa", "も": "_mo", "の": "_no" };

interface RawFrameRow {
  readonly raw: Record<string, unknown>;
  readonly lineNumber: number;
}

function expandFocusVariantRows(rows: readonly RawFrameRow[]): readonly RawFrameRow[] {
  const out: RawFrameRow[] = [];
  for (const row of rows) {
    const variants = row.raw.focusVariants;
    if (variants === undefined) {
      out.push(row);
      continue;
    }
    if (typeof variants !== "object" || variants === null || Array.isArray(variants)) {
      throw new Error(`invalid focusVariants at ${FRAME_TABLE_RELATIVE_PATH}:${row.lineNumber}`);
    }
    const { focusVariants: _dropped, ...base } = row.raw;
    if (base.focus !== null) {
      throw new Error(`focusVariants requires a focus-null base row at ${FRAME_TABLE_RELATIVE_PATH}:${row.lineNumber}`);
    }
    out.push({ raw: base, lineNumber: row.lineNumber });
    for (const [focus, variant] of Object.entries(variants)) {
      out.push({ raw: deriveFocusVariantRow(base, focus, variant, row.lineNumber), lineNumber: row.lineNumber });
    }
  }
  return out;
}

function deriveFocusVariantRow(
  base: Record<string, unknown>,
  focus: string,
  variant: unknown,
  lineNumber: number
): Record<string, unknown> {
  const idSuffix = FOCUS_VARIANT_ID_SUFFIX[focus];
  if (idSuffix === undefined) {
    throw new Error(`invalid focusVariants focus '${focus}' at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (typeof variant !== "object" || variant === null || Array.isArray(variant)) {
    throw new Error(`invalid focusVariants['${focus}'] at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const spec = variant as {
    readonly id?: unknown;
    readonly korean?: unknown;
    readonly requiresFollowingContent?: unknown;
    readonly attachFamily?: unknown;
  };
  const allowed = new Set(["id", "korean", "requiresFollowingContent", "attachFamily"]);
  for (const key of Object.keys(variant)) {
    if (!allowed.has(key)) {
      throw new Error(`unsupported focusVariants['${focus}'].${key} at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  if (typeof spec.korean !== "string" || spec.korean.length === 0) {
    throw new Error(`focusVariants['${focus}'].korean must be a string at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (spec.id !== undefined && typeof spec.id !== "string") {
    throw new Error(`invalid focusVariants['${focus}'].id at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (spec.attachFamily !== undefined && typeof spec.attachFamily !== "string") {
    throw new Error(`invalid focusVariants['${focus}'].attachFamily at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  if (spec.requiresFollowingContent !== undefined && typeof spec.requiresFollowingContent !== "boolean") {
    throw new Error(`invalid focusVariants['${focus}'].requiresFollowingContent at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const attachFamily = spec.attachFamily ?? (base.attach !== undefined ? base.id : undefined);
  return {
    id: spec.id ?? `${String(base.id)}${idSuffix}`,
    kind: base.kind,
    surface: `${String(base.surface)}${focus}`,
    korean: spec.korean,
    focus,
    ...(spec.requiresFollowingContent === true ? { requiresFollowingContent: true } : {}),
    ...(attachFamily === undefined ? {} : { attachFamily }),
    description: ""
  };
}

function buildNominalFrameSpecs(lookups: LookupTables): readonly NominalFrameSpec[] {
  if (_cache === undefined) {
    throw new Error("Data not initialized");
  }
  const rawRows = _cache
    .split(/\r?\n/u)
    .map((line, index) => [line.trim(), index + 1] as const)
    .filter(([line]) => line.length > 0 && !line.startsWith("#"))
    .filter(([line]) => !isAttachOnlyRowLine(line))
    .map(([line, lineNumber]): RawFrameRow => ({ raw: JSON.parse(line) as Record<string, unknown>, lineNumber }));
  const parsed = expandFocusVariantRows(rawRows)
    .map(({ raw, lineNumber }) => parseNominalFrameSpecRaw(raw, lineNumber, lookups));
  const specs = [...materializeAttachDerivations(parsed)]
    .sort((left, right) => right.surface.length - left.surface.length);
  cachedSpecs.set(lookups, specs);
  lastParsedSpecs = specs;
  return specs;
}

export interface TailAttachmentRegistryEntry {
  readonly id: string;
  readonly surface: string;
  readonly attach: TailAttachmentContract;
  readonly source: "frame_row" | "attach_only";
}

let cachedAttachRegistry: readonly TailAttachmentRegistryEntry[] | null = null;

export function loadTailAttachmentRegistry(): readonly TailAttachmentRegistryEntry[] {
  if (cachedAttachRegistry !== null) {
    return cachedAttachRegistry;
  }
  if (_cache === undefined) {
    throw new Error("Data not initialized");
  }
  const entries: TailAttachmentRegistryEntry[] = [];
  const lines = _cache
    .split(/\r?\n/u)
    .map((line, index) => [line.trim(), index + 1] as const)
    .filter(([line]) => line.length > 0 && !line.startsWith("#"));
  for (const [line, lineNumber] of lines) {
    const raw = JSON.parse(line) as Record<string, unknown>;
    if (raw.attachOnly === true) {
      const declaration = parseAttachOnlyDeclaration(line, lineNumber);
      entries.push({
        id: declaration.id,
        surface: declaration.surface,
        attach: declaration.attach,
        source: "attach_only"
      });
    } else if (raw.attach !== undefined) {
      if (typeof raw.id !== "string" || typeof raw.surface !== "string") {
        throw new Error(`invalid attach row at ${FRAME_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
      entries.push({
        id: raw.id,
        surface: raw.surface,
        attach: parseTailAttachmentContract(raw.attach, lineNumber),
        source: "frame_row"
      });
    }
  }
  cachedAttachRegistry = entries;
  return entries;
}

export function loadTailAttachmentDeclarations(): readonly TailAttachmentDeclaration[] {
  if (cachedAttachDeclarations !== null) {
    return cachedAttachDeclarations;
  }
  cachedAttachDeclarations = loadTailAttachmentRegistry()
    .filter((entry) => entry.source === "attach_only")
    .map((entry): TailAttachmentDeclaration => ({
      id: entry.id,
      surface: entry.surface,
      attach: entry.attach
    }));
  return cachedAttachDeclarations;
}

export function loadNominalFrameSpecs(lookups: LookupTables): readonly NominalFrameSpec[] {
  const cached = cachedSpecs.get(lookups);
  if (cached !== undefined) {
    return cached;
  }
  return buildNominalFrameSpecs(lookups);
}

export function parseNominalFrameSpecForTests(line: string, lookups: LookupTables): NominalFrameSpec {
  return parseNominalFrameSpec(line, 1, lookups);
}

export interface CompoundParticleMergeSpec {
  readonly surface: string;
  readonly matrixKey: NominalFrameMatrixKey;
  readonly reject?: readonly ProjectionCandidateSelector[];
}
export function loadCompoundParticleMergeSpecs(lookups: LookupTables): readonly CompoundParticleMergeSpec[] {
  const out: CompoundParticleMergeSpec[] = [];
  for (const spec of loadNominalFrameSpecs(lookups)) {
    if (spec.matrixKey !== undefined) {
      out.push({
        surface: spec.surface,
        matrixKey: spec.matrixKey,
        ...(spec.reject === undefined ? {} : { reject: spec.reject })
      });
    }
  }
  return out;
}

export function loadNominalFrameSpecsBySurface(lookups: LookupTables): ReadonlyMap<string, readonly NominalFrameSpec[]> {
  const cached = cachedSpecsBySurface.get(lookups);
  if (cached !== undefined) {
    return cached;
  }
  const bySurface = new Map<string, NominalFrameSpec[]>();
  for (const spec of loadNominalFrameSpecs(lookups)) {
    const existing = bySurface.get(spec.surface);
    if (existing === undefined) {
      bySurface.set(spec.surface, [spec]);
    } else {
      existing.push(spec);
    }
  }
  cachedSpecsBySurface.set(lookups, bySurface);
  return bySurface;
}

export function loadNominalFrameSurfaceMetadata(): readonly NominalFrameSurfaceMetadata[] {
  if (lastParsedSpecs !== null) {
    if (cachedSurfaceMetadata !== null) return cachedSurfaceMetadata;
    cachedSurfaceMetadata = lastParsedSpecs.map((spec) => ({
      id: spec.id,
      kind: spec.kind,
      surface: spec.surface,
      focus: spec.focus,
      ...(spec.requiresFollowingContent === undefined ? {} : { requiresFollowingContent: spec.requiresFollowingContent }),
      ...(spec.ownerMode === undefined ? {} : { ownerMode: spec.ownerMode }),
      ...(spec.attachLeft === undefined ? {} : { attachLeft: spec.attachLeft }),
      ...(spec.head === undefined ? {} : { head: spec.head }),
      ...(spec.markerTokens === undefined ? {} : { markerTokens: spec.markerTokens }),
      ...(spec.ownerArbitration?.markerVerbOwnsObjectArgument === true ? { markerVerbOwnsObjectArgument: true } : {}),
      ...(spec.ownerArbitration?.ownsKaMarker === true ? { ownsKaMarker: true } : {}),
      ...(spec.match === undefined ? {} : { match: spec.match }),
      ...(spec.reject === undefined ? {} : { reject: spec.reject })
    }));
    return cachedSurfaceMetadata;
  }
  if (_cache === undefined) {
    throw new Error("Data not initialized");
  }
  const rawRows = _cache
    .split(/\r?\n/u)
    .map((line, index) => [line.trim(), index + 1] as const)
    .filter(([line]) => line.length > 0 && !line.startsWith("#") && !isAttachOnlyRowLine(line))
    .map(([line, lineNumber]): RawFrameRow => ({ raw: JSON.parse(line) as Record<string, unknown>, lineNumber }));
  return expandFocusVariantRows(rawRows)
    .map(({ raw: rawRow }) => {
      const raw = rawRow as {
        readonly id?: unknown;
        readonly kind?: unknown;
        readonly surface?: unknown;
        readonly focus?: unknown;
        readonly requiresFollowingContent?: unknown;
        readonly ownerMode?: unknown;
        readonly attachLeft?: unknown;
        readonly head?: unknown;
        readonly markerTokens?: unknown;
        readonly match?: unknown;
        readonly reject?: unknown;
      };
      if (
        typeof raw.id !== "string" ||
        typeof raw.kind !== "string" ||
        !isNominalFrameKind(raw.kind) ||
        typeof raw.surface !== "string" ||
        !("focus" in raw) ||
        !isNominalFrameFocus(raw.focus)
      ) {
        throw new Error(`invalid nominal frame surface metadata at ${FRAME_TABLE_RELATIVE_PATH}`);
      }
      if (raw.ownerMode !== undefined && !isNominalFrameOwnerMode(raw.ownerMode)) {
        throw new Error(`invalid nominal frame ownerMode at ${FRAME_TABLE_RELATIVE_PATH}`);
      }
      if (raw.requiresFollowingContent !== undefined && typeof raw.requiresFollowingContent !== "boolean") {
        throw new Error(`invalid nominal frame requiresFollowingContent at ${FRAME_TABLE_RELATIVE_PATH}`);
      }
      if (raw.attachLeft !== undefined && typeof raw.attachLeft !== "boolean") {
        throw new Error(`invalid nominal frame attachLeft at ${FRAME_TABLE_RELATIVE_PATH}`);
      }
      return {
        id: raw.id,
        kind: raw.kind,
        surface: raw.surface,
        focus: raw.focus,
        ...(raw.requiresFollowingContent === undefined ? {} : { requiresFollowingContent: raw.requiresFollowingContent }),
        ...(raw.ownerMode === undefined ? {} : { ownerMode: raw.ownerMode }),
        ...(raw.attachLeft === undefined ? {} : { attachLeft: raw.attachLeft }),
        ...(raw.head === undefined ? {} : { head: raw.head as ProjectionTokenSelector }),
        ...(raw.markerTokens === undefined ? {} : { markerTokens: raw.markerTokens as readonly ProjectionTokenSelector[] }),
        ...(raw.match === undefined ? {} : { match: raw.match as readonly ProjectionCandidateSelector[] }),
        ...(raw.reject === undefined ? {} : { reject: raw.reject as readonly ProjectionCandidateSelector[] })
      };
    });
}

export function resetNominalFrameSpecCacheForTests(): void {
  cachedSpecs = new WeakMap<LookupTables, readonly NominalFrameSpec[]>();
  cachedSpecsBySurface = new WeakMap<LookupTables, ReadonlyMap<string, readonly NominalFrameSpec[]>>();
  lastParsedSpecs = null;
  cachedSurfaceMetadata = null;
  cachedAttachDeclarations = null;
  cachedAttachRegistry = null;
  _nominalFrameDataGeneration += 1;
}
