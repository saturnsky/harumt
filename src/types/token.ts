import type { ChainSegment } from "../pipeline/fallback/index.js";
import type { WhitespaceKind } from "../analyzer/whitespace-policy.js";
import { LONG_VOWEL_MARKS } from "../analyzer/reduction-variant.js";
import type { TransparentPauseRunEvidence, WhitespaceJunctureBoundaryEvidence } from "../pipeline/clause-layout/juncture-verdict.js";

export type SeparationKind = "letter_spacing" | "word_separator" | "chunk_break" | "authored_pause";

export interface SeparationEvidence {
  readonly separation: SeparationKind;
  readonly kind?: WhitespaceKind;
  readonly width?: number;
  readonly reason: string;
  readonly runOrdinal?: number;
  readonly chunkBreakWitnesses?: readonly WhitespaceJunctureBoundaryEvidence[];
}

export interface HaruTokenRuntimeFields {
  sourceOrdinal?: number;
  sourceSpan?: SourceTokenSpan | null;
  sourceCharSpan?: SourceCharSpan;
  syntheticReason?: string;
  collocDone?: boolean;
  adverbialShite?: boolean;
  koreanOverride?: string;
  koreanOverrideByRegister?: RegisterKoreanOverride;
  leadingSokuon?: number;
  trailingSokuon?: number;
  sourceVoiceMarkOffsets?: readonly number[];
  terminalRoleSfpBefore?: string;
  terminalRoleSfpBeforeCount?: number;
  terminalRoleSfpAfter?: string;
  terminalRoleSfpAfterCount?: number;
  transparentPauseBefore?: boolean;
  transparentPauseAfter?: boolean;
  transparentPauseRunAfter?: TransparentPauseRunEvidence;
  preferLongNegation?: boolean;
  chainSegments?: readonly ChainSegment[];
  baseForm?: string;
  baseReading?: string;
  numericCounterHeadForm?: string;
  stutterPrefix?: StutterPrefixRuntimeMetadata;
  stutterPrefixSuppressed?: boolean;
  longVowelReduction?: LongVowelReductionMetadata;
  sourceRubyReadingFragments?: readonly SourceRubyReadingFragment[];
  sourceCompoundContinuation?: boolean;
  sourceReduplication?: boolean;
  sourceCompoundSplitPiece?: boolean;
  sourceCompoundProjectionBoundaries?: readonly SourceCompoundProjectionBoundary[];
  whitespaceBefore?: SeparationEvidence;
  whitespaceAfter?: SeparationEvidence;
  sourceLineBreakBefore?: true;
  reanalysisProposals?: readonly TokenReanalysisProposal[];
  reanalysisReadingPins?: readonly string[];
  latinNotationTransliteration?: string;
}

export interface SourceRubyReadingFragment {
  readonly sourceOrdinal: number;
  readonly sourceSurface: string;
  readonly coveredStart: number;
  readonly coveredEnd: number;
  readonly readingsByCharacter: readonly string[];
}

export interface TokenReanalysisProposal {
  readonly rowId: string;
  readonly consumed: number;
  readonly flipKind: "token_substitution" | "rule_reading_pin";
  readonly conditionId: string;
  readonly blockerIds: readonly string[];
  readonly anchorSourceOrdinal: number | null;
}

export interface SourceTokenSpan {
  readonly startOrdinal: number;
  readonly endOrdinal: number;
}

export interface SourceCharSpan {
  readonly start: number;
  readonly end: number;
}

export interface RuntimeSourceIdentityCarrier extends HaruTokenRuntimeFields {
  readonly splitA?: readonly RuntimeSourceIdentityCarrier[];
  readonly splitB?: readonly RuntimeSourceIdentityCarrier[];
}

export interface LemmaBearingToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
}

export function tokenLemma(token: LemmaBearingToken): string {
  return (token.dictionaryForm ?? "") || token.surface;
}

export function tokensShareLemma(
  left: LemmaBearingToken | undefined,
  right: LemmaBearingToken | undefined
): boolean {
  return left !== undefined && right !== undefined && tokenLemma(left) === tokenLemma(right);
}

export function runtimeTokenSourceSpan(
  token: Pick<HaruTokenRuntimeFields, "sourceOrdinal" | "sourceSpan">
): SourceTokenSpan | null | undefined {
  if (token.sourceSpan !== undefined) {
    return token.sourceSpan;
  }
  return token.sourceOrdinal === undefined
    ? undefined
    : { startOrdinal: token.sourceOrdinal, endOrdinal: token.sourceOrdinal + 1 };
}

const SOURCE_IDENTITY_FIELDS = [
  "sourceOrdinal",
  "sourceSpan",
  "sourceCharSpan"
] as const satisfies readonly (keyof HaruTokenRuntimeFields)[];

export function inheritedSourceIdentity(
  token: HaruTokenRuntimeFields
): Partial<HaruTokenRuntimeFields> {
  const inherited: Partial<HaruTokenRuntimeFields> = {};
  copyDefinedRuntimeFields(inherited, token, SOURCE_IDENTITY_FIELDS);
  return inherited;
}

export function computeSourceCharSpan(
  tokens: Iterable<Pick<HaruTokenRuntimeFields, "sourceCharSpan">>
): SourceCharSpan | undefined {
  let start: number | undefined;
  let end: number | undefined;
  let count = 0;
  for (const token of tokens) {
    const span = token.sourceCharSpan;
    if (span === undefined) {
      return undefined;
    }
    count += 1;
    start = start === undefined ? span.start : Math.min(start, span.start);
    end = end === undefined ? span.end : Math.max(end, span.end);
  }
  return count === 0 || start === undefined || end === undefined ? undefined : { start, end };
}

export function computeSourceSpan(
  tokens: Iterable<Pick<HaruTokenRuntimeFields, "sourceOrdinal" | "sourceSpan">>,
): SourceTokenSpan | undefined {
  let startOrdinal: number | undefined;
  let endOrdinal: number | undefined;
  for (const token of tokens) {
    const span = runtimeTokenSourceSpan(token);
    if (span === null) {
      continue;
    }
    if (span !== undefined) {
      startOrdinal = startOrdinal === undefined ? span.startOrdinal : Math.min(startOrdinal, span.startOrdinal);
      endOrdinal = endOrdinal === undefined ? span.endOrdinal : Math.max(endOrdinal, span.endOrdinal);
    }
  }
  return startOrdinal === undefined || endOrdinal === undefined
    ? undefined
    : { startOrdinal, endOrdinal };
}

const TRAILING_BOUNDARY_RUNTIME_FIELDS = [
  "terminalRoleSfpAfter",
  "terminalRoleSfpAfterCount",
  "transparentPauseAfter",
  "transparentPauseRunAfter",
  "whitespaceAfter",
  "trailingSokuon"
] as const satisfies readonly (keyof HaruTokenRuntimeFields)[];

const LEADING_BOUNDARY_RUNTIME_FIELDS = [
  "terminalRoleSfpBefore",
  "terminalRoleSfpBeforeCount",
  "transparentPauseBefore",
  "leadingSokuon",
  "whitespaceBefore",
  "sourceLineBreakBefore"
] as const satisfies readonly (keyof HaruTokenRuntimeFields)[];

export function splitBoundaryRuntimeStateForPieces<T extends HaruTokenRuntimeFields>(
  token: T
): {
  readonly head: Partial<HaruTokenRuntimeFields>;
  readonly inner: Partial<HaruTokenRuntimeFields>;
  readonly tail: Partial<HaruTokenRuntimeFields>;
} {
  const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
  const inner = { ...leading } as Record<string, unknown>;
  for (const field of LEADING_BOUNDARY_RUNTIME_FIELDS) {
    delete inner[field];
  }
  return { head: leading, inner: inner as Partial<HaruTokenRuntimeFields>, tail: trailing };
}

export function splitTrailingBoundaryRuntimeState<T extends HaruTokenRuntimeFields>(
  token: T
): { readonly leading: T; readonly trailing: Partial<HaruTokenRuntimeFields> } {
  const leading = { ...token };
  const trailing: Record<string, unknown> = {};
  for (const field of TRAILING_BOUNDARY_RUNTIME_FIELDS) {
    if (token[field] === undefined) {
      continue;
    }
    trailing[field] = token[field];
    delete leading[field];
  }
  return { leading, trailing };
}

export interface RuntimeSourceSpanAssignmentOptions {
  readonly attachLeft?: boolean;
  readonly projectionBoundaries?: readonly SourceCompoundProjectionBoundary[];
  readonly rubySourceOrdinal?: (sourceOrdinal: number) => number;
}

function assignRuntimeTokenSourceSpan<T extends RuntimeSourceIdentityCarrier>(
  token: T,
  sourceSpan: SourceTokenSpan | null,
  options: RuntimeSourceSpanAssignmentOptions,
  recurseIntoSplits: boolean
): T {
  const {
    sourceOrdinal: _previousOrdinal,
    sourceSpan: previousSpan,
    sourceCharSpan,
    sourceRubyReadingFragments,
    splitA,
    splitB,
    ...base
  } = token;
  const previousSourceStart = previousSpan?.startOrdinal ?? _previousOrdinal;
  const rubySourceOrdinal = options.rubySourceOrdinal ?? (
    sourceSpan === null || previousSourceStart === undefined
      ? (sourceOrdinal: number) => sourceOrdinal
      : (sourceOrdinal: number) => sourceOrdinal + sourceSpan.startOrdinal - previousSourceStart
  );
  return {
    ...base,
    ...(sourceSpan === null || sourceCharSpan === undefined ? {} : { sourceCharSpan }),
    sourceSpan,
    ...(sourceSpan !== null && sourceSpan.endOrdinal === sourceSpan.startOrdinal + 1
      ? { sourceOrdinal: sourceSpan.startOrdinal }
      : {}),
    ...(options.attachLeft === true ? { sourceCompoundContinuation: true } : {}),
    ...(options.projectionBoundaries === undefined || options.projectionBoundaries.length === 0 ? {} : {
      sourceCompoundProjectionBoundaries: options.projectionBoundaries
    }),
    ...(sourceRubyReadingFragments === undefined ? {} : {
      sourceRubyReadingFragments: sourceRubyReadingFragments.map((fragment) => ({
        ...fragment,
        sourceOrdinal: rubySourceOrdinal(fragment.sourceOrdinal)
      }))
    }),
    ...(splitA === undefined ? {} : {
      splitA: recurseIntoSplits
        ? splitA.map((item) => assignRuntimeTokenSourceSpan(item, sourceSpan, { rubySourceOrdinal }, true))
        : splitA
    }),
    ...(splitB === undefined ? {} : {
      splitB: recurseIntoSplits
        ? splitB.map((item) => assignRuntimeTokenSourceSpan(item, sourceSpan, { rubySourceOrdinal }, true))
        : splitB
    })
  } as unknown as T;
}

export function withRuntimeTokenSourceSpan<T extends RuntimeSourceIdentityCarrier>(
  token: T,
  sourceSpan: SourceTokenSpan | null,
  options: RuntimeSourceSpanAssignmentOptions = {}
): T {
  return assignRuntimeTokenSourceSpan(token, sourceSpan, options, true);
}

function copyDefinedRuntimeFields(
  target: Record<string, unknown>,
  source: HaruTokenRuntimeFields | undefined,
  fields: readonly (keyof HaruTokenRuntimeFields)[]
): void {
  if (source === undefined) return;
  for (const field of fields) {
    const value = source[field];
    if (value !== undefined) {
      target[field] = value;
    }
  }
}

export function mergeRuntimeTokenSourceIdentity<T extends RuntimeSourceIdentityCarrier>(
  token: T,
  sources: readonly [RuntimeSourceIdentityCarrier, ...RuntimeSourceIdentityCarrier[]]
): T {
  const merged = { ...token } as Record<string, unknown>;
  for (const field of [...LEADING_BOUNDARY_RUNTIME_FIELDS, ...TRAILING_BOUNDARY_RUNTIME_FIELDS]) {
    delete merged[field];
  }
  delete merged.sourceOrdinal;
  delete merged.sourceSpan;
  delete merged.sourceCharSpan;
  delete merged.sourceRubyReadingFragments;
  delete merged.sourceCompoundProjectionBoundaries;
  delete merged.sourceCompoundContinuation;

  copyDefinedRuntimeFields(merged, sources[0], LEADING_BOUNDARY_RUNTIME_FIELDS);
  copyDefinedRuntimeFields(merged, sources[sources.length - 1], TRAILING_BOUNDARY_RUNTIME_FIELDS);
  if (sources[0].sourceCompoundContinuation === true) {
    merged.sourceCompoundContinuation = true;
  }
  const rubyFragments = sources.flatMap((source) => source.sourceRubyReadingFragments ?? []);
  if (rubyFragments.length > 0) {
    merged.sourceRubyReadingFragments = rubyFragments;
  }
  delete merged.sourceVoiceMarkOffsets;
  const voiceMarkOffsets = sources.flatMap((source) => source.sourceVoiceMarkOffsets ?? []);
  if (voiceMarkOffsets.length > 0) {
    merged.sourceVoiceMarkOffsets = voiceMarkOffsets;
  }
  const projectionBoundaries = sources.flatMap(
    (source) => source.sourceCompoundProjectionBoundaries ?? []
  );
  if (projectionBoundaries.length > 0) {
    merged.sourceCompoundProjectionBoundaries = projectionBoundaries;
  }
  const sourceCharSpan = computeSourceCharSpan(sources);
  if (sourceCharSpan !== undefined) {
    merged.sourceCharSpan = sourceCharSpan;
  }
  const sourceSpan = {
    startOrdinal: Math.min(...sources.map((source) => source.sourceSpan!.startOrdinal)),
    endOrdinal: Math.max(...sources.map((source) => source.sourceSpan!.endOrdinal))
  };
  return withRuntimeTokenSourceSpan(merged as T, sourceSpan, {
    rubySourceOrdinal: (sourceOrdinal) => sourceOrdinal
  });
}

export function shiftSourceSpan(
  span: SourceTokenSpan | null,
  ordinalOffset: number
): SourceTokenSpan | null {
  return span === null
    ? null
    : {
      startOrdinal: span.startOrdinal + ordinalOffset,
      endOrdinal: span.endOrdinal + ordinalOffset
    };
}

export function shiftSourceBoundary(
  boundary: SourceTokenBoundary,
  ordinalOffset: number
): SourceTokenBoundary {
  return {
    beforeOrdinal: boundary.beforeOrdinal === null ? null : boundary.beforeOrdinal + ordinalOffset,
    afterOrdinal: boundary.afterOrdinal === null ? null : boundary.afterOrdinal + ordinalOffset
  };
}

export function shiftRuntimeTokenSourceIdentity<T extends RuntimeSourceIdentityCarrier>(
  token: T,
  ordinalOffset: number
): T {
  const shifted: T = {
    ...token,
    ...(token.sourceCompoundProjectionBoundaries === undefined ? {} : {
      sourceCompoundProjectionBoundaries: token.sourceCompoundProjectionBoundaries.map((boundary) => ({
        ...boundary,
        sourceBoundary: shiftSourceBoundary(boundary.sourceBoundary, ordinalOffset)
      }))
    }),
    ...(token.sourceRubyReadingFragments === undefined ? {} : {
      sourceRubyReadingFragments: token.sourceRubyReadingFragments.map((fragment) => ({
        ...fragment,
        sourceOrdinal: fragment.sourceOrdinal + ordinalOffset
      }))
    }),
    ...(token.reanalysisProposals === undefined ? {} : {
      reanalysisProposals: token.reanalysisProposals.map((proposal) => ({
        ...proposal,
        anchorSourceOrdinal: proposal.anchorSourceOrdinal === null
          ? null
          : proposal.anchorSourceOrdinal + ordinalOffset
      }))
    }),
    ...(token.splitA === undefined ? {} : {
      splitA: token.splitA.map((item) => shiftRuntimeTokenSourceIdentity(item, ordinalOffset))
    }),
    ...(token.splitB === undefined ? {} : {
      splitB: token.splitB.map((item) => shiftRuntimeTokenSourceIdentity(item, ordinalOffset))
    })
  } as T;
  delete shifted.sourceCharSpan;
  const sourceSpan = runtimeTokenSourceSpan(token);
  if (sourceSpan === undefined) {
    return shifted;
  }
  return assignRuntimeTokenSourceSpan(
    shifted,
    shiftSourceSpan(sourceSpan, ordinalOffset),
    { rubySourceOrdinal: (sourceOrdinal) => sourceOrdinal },
    false
  );
}

export interface SourceTokenBoundary {
  readonly beforeOrdinal: number | null;
  readonly afterOrdinal: number | null;
}

export interface SourceCompoundProjectionBoundary {
  readonly rawOffset: number;
  readonly sourceBoundary: SourceTokenBoundary;
  readonly leftTargetText?: string;
  readonly rightTargetText?: string;
  readonly leftSplitTargetText?: string;
  readonly rightSplitTargetText?: string;
}

export interface RegisterKoreanOverride {
  readonly casual: string;
  readonly formal: string;
}

export interface StutterPrefixRuntimeMetadata {
  readonly repeatCount: number;
  readonly sourceMora: string;
  readonly separatorSurface: "、" | "," | "…";
  readonly sourceSpan: {
    readonly start: number;
    readonly endExclusive: number;
  };
}

export interface LongVowelReductionMetadata {
  readonly removedCount: number;
  readonly reducedSurface: string;
}

export interface RuntimeHaruToken extends HaruTokenRuntimeFields {
  surface: string;
  normalizedForm?: string;
  dictionaryForm: string;
  reading: string;
  dictionaryFormReading: string;
  pos: number;
  dictionaryId: number;
  splitA?: readonly RuntimeHaruToken[];
  splitB?: readonly RuntimeHaruToken[];
  annotationKeys?: number[];
}

export function morphSurface(token: {
  readonly surface: string;
  readonly longVowelReduction?: LongVowelReductionMetadata;
}): string {
  return token.longVowelReduction !== undefined
    ? token.longVowelReduction.reducedSurface
    : token.surface;
}

export function isLongVowelReductionAligned(token: {
  readonly surface: string;
  readonly longVowelReduction?: LongVowelReductionMetadata;
}): boolean {
  const metadata = token.longVowelReduction;
  if (metadata === undefined) {
    return true;
  }
  if (token.surface.length - metadata.reducedSurface.length !== metadata.removedCount) {
    return false;
  }
  let cursor = 0;
  for (const char of metadata.reducedSurface) {
    const found = token.surface.indexOf(char, cursor);
    if (found < 0) {
      return false;
    }
    cursor = found + char.length;
  }
  return true;
}

export function prolongationMarkIdentityForm(token: {
  readonly surface: string;
  readonly normalizedForm?: string;
}): string | undefined {
  const canonical = token.normalizedForm;
  if (canonical === undefined || canonical.length === 0 || canonical === token.surface ||
    !token.surface.startsWith(canonical)) {
    return undefined;
  }
  const prolongation = token.surface.slice(canonical.length);
  return [...prolongation].every((char) => LONG_VOWEL_MARKS.has(char)) ? canonical : undefined;
}

export type RuntimeTokenSurfaceRewrite =
  | { readonly kind: "prefix"; readonly prefix: string }
  | { readonly kind: "remove_prefix"; readonly prefix: string }
  | { readonly kind: "remove_suffix"; readonly suffix: string }
  | { readonly kind: "replace"; readonly surface: string }
  | {
    readonly kind: "merge";
    readonly sources: readonly {
      readonly surface: string;
      readonly longVowelReduction?: LongVowelReductionMetadata;
    }[];
  };

export function rewriteRuntimeTokenSurface<
  T extends {
    readonly surface: string;
    readonly longVowelReduction?: LongVowelReductionMetadata;
  }
>(token: T, rewrite: RuntimeTokenSurfaceRewrite): T {
  const { longVowelReduction: _previousMetadata, ...base } = token;
  let surface: string;
  let longVowelReduction: LongVowelReductionMetadata | undefined;
  switch (rewrite.kind) {
    case "prefix":
      surface = `${rewrite.prefix}${token.surface}`;
      longVowelReduction = token.longVowelReduction === undefined
        ? undefined
        : {
          removedCount: token.longVowelReduction.removedCount,
          reducedSurface: `${rewrite.prefix}${token.longVowelReduction.reducedSurface}`
        };
      break;
    case "remove_prefix": {
      const hasPrefix = rewrite.prefix.length > 0 && token.surface.startsWith(rewrite.prefix);
      surface = hasPrefix
        ? token.surface.slice(rewrite.prefix.length)
        : token.surface;
      const metadata = token.longVowelReduction;
      longVowelReduction = metadata !== undefined &&
        hasPrefix &&
        metadata.reducedSurface.startsWith(rewrite.prefix)
        ? {
          removedCount: metadata.removedCount,
          reducedSurface: metadata.reducedSurface.slice(rewrite.prefix.length)
        }
        : undefined;
      break;
    }
    case "remove_suffix": {
      const hasSuffix = rewrite.suffix.length > 0 && token.surface.endsWith(rewrite.suffix);
      surface = hasSuffix
        ? token.surface.slice(0, -rewrite.suffix.length)
        : token.surface;
      const metadata = token.longVowelReduction;
      longVowelReduction = metadata !== undefined &&
        hasSuffix &&
        metadata.reducedSurface.endsWith(rewrite.suffix)
        ? {
          removedCount: metadata.removedCount,
          reducedSurface: metadata.reducedSurface.slice(0, -rewrite.suffix.length)
        }
        : undefined;
      break;
    }
    case "replace":
      surface = rewrite.surface;
      longVowelReduction = rewrite.surface === token.surface
        ? token.longVowelReduction
        : undefined;
      break;
    case "merge":
      surface = rewrite.sources.map((source) => source.surface).join("");
      longVowelReduction = rewrite.sources.some((source) => source.longVowelReduction !== undefined)
        ? {
          removedCount: rewrite.sources.reduce(
            (total, source) => total + (source.longVowelReduction?.removedCount ?? 0),
            0,
          ),
          reducedSurface: rewrite.sources.map(morphSurface).join("")
        }
        : undefined;
      break;
  }
  return {
    ...base,
    surface,
    ...(longVowelReduction === undefined ? {} : { longVowelReduction })
  } as T;
}
