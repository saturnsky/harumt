import { rawSourceSurfaceText, rawSourceWarningSpan, UNOWNED_TAIL_FALLBACK_RAW_OP_KIND, unsupportedGrammarRawWarning } from "./fallback/unsupported-raw.js";
import type { MorphemeEntry, MorphemeSense } from "../types/dictionary.js";
import type { RuleTraceDetailValue } from "../types/pipeline.js";
import type { RenderPlan } from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { Warning } from "../types/warning.js";
import type { buildProtoLayout } from "./clause-layout/index.js";
import type { CommitmentCandidate, CommitmentSpan } from "./commitment/types.js";
import { candidateSetMembers, candidateSetSize, commitmentLaneCandidateSet, isResolvedCandidateSet, type SourceCandidateSet } from "./source-candidate-set.js";
import { isBareNaAdjSet, 명사 } from "../types/pos.js";
import type { LookupTables } from "./lookup-tables.js";
import type { buildTailParserFallbackAssemblyDescriptor } from "./head-tail/integration/tail-assembly.js";
import { SEPARATION_OPENS_BOUNDARY, previousNonSpaceIndex, separatedAs } from "./clause-layout/trivia.js";
import { commitWinner, hasTranslationAccess } from "./translation/access.js";
import type { TranslationUnit, UnitType, TranslationUnitProvenance } from "./translation/unit.js";
import { isHardTerminalPunctuationToken, isTrailingPunctuationToken } from "./head-tail/boundary/punctuation.js";
import type { CopulaFocusAdjunctRequest } from "./assembler/copula-focus-plan.js";

export function isKeijoujiVerbObjectHost(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && isBareNaAdjSet(token);
}

export function applyTailParserFallbackDescriptorToSpan(
  descriptor: ReturnType<typeof buildTailParserFallbackAssemblyDescriptor>,
  index: number,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): AssemblyContentSpan {
  const span = makeAssemblyContentSpan(
    index,
    descriptor.consumed,
    descriptor.korean,
    descriptor.koreanPos ?? 명사,
    descriptor.entry,
    descriptor.unitType,
    {
      attachLeft: descriptor.attachLeft,
      provenance: descriptor.provenance,
      provenanceReason: descriptor.provenanceReason,
      warnings: descriptor.warnings,
      renderPlanPolicy: descriptor.renderPlanPolicy
    }
  );
  span.renderPlan = descriptor.renderPlan;
  span.voice = descriptor.voice;
  span.rareruReadings = descriptor.rareruReadings;
  span.nareruReadings = descriptor.nareruReadings;
  span.dekiruReadings = descriptor.dekiruReadings;
  span.hasNegative = descriptor.hasNegative;
  span.hasCausative = descriptor.hasCausative;
  span.hasCausativePassive = descriptor.hasCausativePassive;
  span.hasRequestTail = descriptor.hasRequestTail;
  span.hasBenefactiveTail = descriptor.hasBenefactiveTail;
  span.isKeijoujiVerbPredicate = descriptor.isKeijoujiVerbPredicate;
  span.benefactive = descriptor.benefactive;
  span.sourceCandidates = descriptor.sourceCandidates;
  closeUnownedTailFallbackSpanToRaw(span, tokens);
  return span;
}

export function closeUnownedTailFallbackSpanToRaw(span: AssemblyContentSpan, tokens: readonly RuntimeHaruToken[]): void {
  if (span.provenance !== "legacy_tail" && span.provenance !== "fallback") return;
  const raw = rawSourceSurfaceText(tokens, span.start, span.consumed);
  span.korean = raw;
  span.koreanBase = null;
  span.renderPlan = null;
  span.sourceCandidates = null;
  span.warnings = [
    ...span.warnings,
    unsupportedGrammarRawWarning(
      UNOWNED_TAIL_FALLBACK_RAW_OP_KIND,
      rawSourceWarningSpan(span.start, span.consumed),
      `unsupported grammar: head-tail did not own this span (provenance=${span.provenance}); ` +
      `the consumed source span was kept raw. surface=${raw}`
    )
  ];
}

export interface AssemblyContentSpan extends CommitmentSpan {
  renderPlan: RenderPlan | null;
  copulaFocusAdjunct?: CopulaFocusAdjunctRequest | null;
  koreanBase?: string | null;
  unitType: UnitType;
  attachLeft: boolean;
  particleRole: string | null;
  provenance: TranslationUnitProvenance;
  provenanceReason: string | null;
  discourseConnective: boolean;
  warnings: readonly Warning[];
  renderPlanPolicy: import("../types/pipeline.js").RenderPlanPolicy;
  traceEvents: readonly TraceableRuleEvent[];
}

interface TraceableRuleEvent {
  readonly ruleName: string;
  readonly detail: { readonly [key: string]: RuleTraceDetailValue };
  readonly phase?: string;
  readonly matched?: boolean;
  readonly tokenIdx?: number | null;
}

export function contentSpanCoversIndex(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  index: number
): boolean {
  for (const [start, span] of contentMap) {
    if (start <= index && index < start + span.consumed) {
      return true;
    }
  }
  return false;
}

export function applySourceCompoundContinuationToContentMap(
  tokens: readonly RuntimeHaruToken[],
  contentMap: Map<number, AssemblyContentSpan>
): void {
  for (const [start, span] of contentMap) {
    if (tokens[start]?.sourceCompoundContinuation !== true || span.attachLeft) {
      continue;
    }
    (span as { attachLeft: boolean }).attachLeft = true;
  }
}

export function makeAssemblyContentSpan(
  start: number,
  consumed: number,
  korean: string,
  koreanPos: number,
  entry: MorphemeEntry | null,
  unitType: UnitType,
  options: {
    readonly attachLeft?: boolean;
    readonly provenance?: TranslationUnitProvenance;
    readonly provenanceReason?: string | null;
    readonly warnings?: readonly Warning[];
    readonly renderPlanPolicy?: import("../types/pipeline.js").RenderPlanPolicy;
    readonly renderPlan?: RenderPlan | null;
    readonly koreanBase?: string | null;
    readonly particleRole?: string | null;
    readonly discourseConnective?: boolean;
  } = {}
): AssemblyContentSpan {
  const span: AssemblyContentSpan = {
    start,
    consumed,
    korean,
    koreanPos,
    entry,
    renderPlan: options.renderPlan ?? null,
    koreanBase: options.koreanBase ?? null,
    unitType,
    attachLeft: options.attachLeft ?? false,
    particleRole: options.particleRole ?? null,
    provenance: options.provenance ?? "assembler",
    provenanceReason: options.provenanceReason ?? null,
    discourseConnective: options.discourseConnective ?? false,
    warnings: options.warnings ?? [],
    renderPlanPolicy: options.renderPlanPolicy ?? "normal",
    traceEvents: []
  };
  Object.defineProperty(span, "voiceOpen", {
    enumerable: true,
    get() {
      return span.voice === null;
    }
  });
  return span;
}

export function contentMapRepairSeed(
  contentMap: ReadonlyMap<number, AssemblyContentSpan>,
  units: readonly TranslationUnit[],
  repairStart: number
): Map<number, AssemblyContentSpan> {
  const covered = new Set(units.flatMap((unit) => unit.jpIndices));
  const seed = new Map<number, AssemblyContentSpan>();
  for (const [start, span] of contentMap) {
    const endExclusive = start + Math.max(1, span.consumed);
    if (start < repairStart && repairStart < endExclusive) {
      continue;
    }
    if (start >= repairStart && rangeContainsCoveredIndex(start, endExclusive, covered)) {
      continue;
    }
    seed.set(start, span);
  }
  return seed;
}

function rangeContainsCoveredIndex(
  start: number,
  endExclusive: number,
  covered: ReadonlySet<number>
): boolean {
  for (let index = start; index < endExclusive; index += 1) {
    if (covered.has(index)) {
      return true;
    }
  }
  return false;
}

export function selectedIntrinsicHonorificMetadata(
  set: SourceCandidateSet<CommitmentCandidate> | null | undefined,
  entry: MorphemeEntry | null
): boolean | undefined {
  const laneSet = commitmentLaneCandidateSet(set);
  const selected = isResolvedCandidateSet(laneSet)
    ? laneSet.winner
    : candidateSetSize(laneSet) === 1 ? candidateSetMembers(laneSet)[0] : undefined;
  if (selected !== undefined) {
    return selected.candidate.intrinsicHonorific ?? selected.candidate.translation?.intrinsicHonorific;
  }
  const senses = entry?.senses ?? [];
  return senses.length === 1 ? senses[0]?.intrinsicHonorific : undefined;
}

export function contentHeadDispatchLimit(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  protoLayout: ReturnType<typeof buildProtoLayout> | null
): number {
  const clause = protoLayout?.clauseOfToken(index);
  if (clause === undefined) {
    return tokens.length;
  }
  if (separatedAs(tokens, clause.end, SEPARATION_OPENS_BOUNDARY)) {
    return clause.end;
  }
  if (protoLayout?.unmarkedMainClauseBoundaryAt(clause.end) === true) {
    return clause.end;
  }
  let boundary = previousNonSpaceIndex(tokens, clause.end, clause.start);
  while (boundary !== null && isTrailingPunctuationToken(tokens[boundary])) {
    boundary = previousNonSpaceIndex(tokens, boundary, clause.start);
  }
  return boundary !== null && isHardTerminalPunctuationToken(tokens[boundary])
    ? clause.end
    : tokens.length;
}

export function committedLookupEntry(entry: MorphemeEntry | undefined): (MorphemeEntry & { readonly senses: readonly MorphemeSense[]; readonly committed: true }) | null {
  if (entry === undefined || !hasTranslationAccess(entry)) {
    return null;
  }
  return commitWinner(entry);
}
