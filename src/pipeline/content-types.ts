import type { IrregularType } from "../generator/conjugator.js";
import type { AuxTokens } from "./matchers.js";
import { TokenCursor } from "./token-cursor.js";
import { metadataAdverbial, metadataIrregular, metadataKoreanPos, metadataNominalized } from "./translation/metadata.js";
import type { MorphemeEntry, MorphemeSense } from "../types/dictionary.js";
import type { RenderPlan, Voice } from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import { candidateSetAgreedKoreanPos, type SourceCandidateSet } from "./source-candidate-set.js";
import type { Warning } from "../types/warning.js";
import type { SfpNode } from "./head-tail/tail/predicate-root/grammar.js";
import type {
  BenefactiveContext,
  CandidateConditionValue,
  DekiruReading,
  LexicalParticleAdverbialCandidateCommitment,
  NareruReading,
  NominalProjectionKind,
  RareruReading,
  RuleTraceDetailValue,
  RenderPlanPolicy,
  SourceVerbalPredicateVerdict,
  TranslationCandidate as PipelineTranslationCandidate
} from "../types/pipeline.js";

import { POS4, POS5 } from "../types/pos.js";
export {
  type DekiruReading,
  type NareruReading,
  type RareruReading
} from "../types/pipeline.js";

export class TranslationCandidate {
  constructor(
    readonly priority: number,
    readonly conditions: readonly (readonly [string, CandidateConditionValue])[],
    readonly entry: MorphemeEntry,
    readonly translation: MorphemeSense,
    readonly koreanLemma: string,
    readonly koreanPos: number,
    readonly irregular: IrregularType | null,
    readonly renderPlan: RenderPlan | null = null,
    readonly korean = "",
    readonly voice: Voice | null = null,
    readonly rareruReadings: ReadonlySet<RareruReading> = new Set(),
    readonly nareruReadings: ReadonlySet<NareruReading> = new Set(),
    readonly dekiruReadings: ReadonlySet<DekiruReading> = new Set(),
    readonly hasNegative = false,
    readonly hasCausative = false,
    readonly hasCausativePassive = false,
    readonly hasRequestTail = false,
    readonly hasBenefactiveTail = false,
    readonly connectiveRole: string | null = null,
    readonly benefactive: BenefactiveContext = {},
    readonly warnings: readonly Warning[] = [],
    readonly renderPlanPolicy: RenderPlanPolicy = "normal",
    readonly lexicalParticleAdverbial: LexicalParticleAdverbialCandidateCommitment | null = null,
    readonly projectionOrdinal = 0,
    readonly sourceVerbalPredicateVerdict: SourceVerbalPredicateVerdict | null = null,
    readonly nominalProjection: NominalProjectionKind | undefined = undefined
  ) { }

}

export class RuleTraceEvent {
  constructor(
    readonly ruleName: string,
    readonly detail: { readonly [key: string]: RuleTraceDetailValue },
    readonly phase = "special",
    readonly matched = true,
    readonly tokenIdx: number | null = null
  ) { }
}

export class RuleResult {
  static fixedText(
    consumed: number,
    text: string,
    spaceAfter: boolean,
    koreanPos: number | null = null,
    traceTag: string | null = null,
    traceEvents: readonly RuleTraceEvent[] = []
  ): RuleResult {
    return new RuleResult(consumed, "", spaceAfter, { kind: "fixedText", text, koreanPos }, traceTag, traceEvents);
  }

  static registerText(
    consumed: number,
    casual: string,
    formal: string,
    spaceAfter: boolean,
    koreanPos: number | null = null,
    traceTag: string | null = null,
    traceEvents: readonly RuleTraceEvent[] = []
  ): RuleResult {
    return new RuleResult(consumed, "", spaceAfter, { kind: "registerText", casual, formal, koreanPos }, traceTag, traceEvents);
  }

  constructor(
    readonly consumed: number,
    readonly korean: string,
    readonly spaceAfter: boolean,
    readonly renderPlan: RenderPlan | null = null,
    readonly traceTag: string | null = null,
    readonly traceEvents: readonly RuleTraceEvent[] = [],
    readonly benefactive: BenefactiveContext = {},
    readonly warnings: readonly Warning[] = [],
    readonly renderPlanPolicy: RenderPlanPolicy = "normal",
    readonly sourceVerbalPredicateVerdict: SourceVerbalPredicateVerdict | null = null,
    readonly rawSourceSurface: true | undefined = undefined
  ) { }

  withTraceEvents(...events: readonly RuleTraceEvent[]): RuleResult {
    if (events.length === 0) {
      return this;
    }
    return new RuleResult(
      this.consumed,
      this.korean,
      this.spaceAfter,
      this.renderPlan,
      this.traceTag,
      [...this.traceEvents, ...events],
      this.benefactive,
      this.warnings,
      this.renderPlanPolicy,
      this.sourceVerbalPredicateVerdict,
      this.rawSourceSurface
    );
  }
}

export class ResolvedContentResult {
  readonly sourceState = "resolved" as const;

  constructor(
    readonly consumed: number,
    readonly korean: string,
    readonly koreanPos: number,
    readonly entry: MorphemeEntry | null,
    readonly renderPlan: RenderPlan | null = null,
    readonly voice: Voice | null = "active",
    readonly rareruReadings: ReadonlySet<RareruReading> = new Set(),
    readonly nareruReadings: ReadonlySet<NareruReading> = new Set(),
    readonly dekiruReadings: ReadonlySet<DekiruReading> = new Set(),
    readonly hasNegative = false,
    readonly hasCausative = false,
    readonly hasCausativePassive = false,
    readonly hasRequestTail = false,
    readonly hasBenefactiveTail = false,
    readonly connectiveRole: string | null = null,
    readonly benefactive: BenefactiveContext = {},
    readonly sourceCandidates: SourceCandidateSet<PipelineTranslationCandidate> | null = null,
    readonly warnings: readonly Warning[] = [],
    readonly renderPlanPolicy: RenderPlanPolicy = "normal"
  ) { }

  get isPassive(): boolean {
    return this.voice === "passive";
  }

  get isPotential(): boolean {
    return this.voice === "potential";
  }

  get voiceOpen(): boolean {
    return this.voice === null;
  }
}

export class StagedContentResult {
  readonly sourceState = "staged" as const;

  constructor(
    readonly consumed: number,
    readonly entry: MorphemeEntry | null,
    readonly renderPlan: RenderPlan | null = null,
    readonly voice: Voice | null = "active",
    readonly rareruReadings: ReadonlySet<RareruReading> = new Set(),
    readonly nareruReadings: ReadonlySet<NareruReading> = new Set(),
    readonly dekiruReadings: ReadonlySet<DekiruReading> = new Set(),
    readonly hasNegative = false,
    readonly hasCausative = false,
    readonly hasCausativePassive = false,
    readonly hasRequestTail = false,
    readonly hasBenefactiveTail = false,
    readonly connectiveRole: string | null = null,
    readonly benefactive: BenefactiveContext = {},
    readonly sourceCandidates: SourceCandidateSet<PipelineTranslationCandidate> | null = null,
    readonly warnings: readonly Warning[] = [],
    readonly renderPlanPolicy: RenderPlanPolicy = "normal"
  ) { }

  get isPassive(): boolean {
    return this.voice === "passive";
  }

  get isPotential(): boolean {
    return this.voice === "potential";
  }

  get voiceOpen(): boolean {
    return this.voice === null;
  }
}

export type ContentResult = ResolvedContentResult | StagedContentResult;

export function isResolvedContentResult(result: ContentResult): result is ResolvedContentResult {
  return result.sourceState === "resolved";
}

export function contentResultKoreanPos(result: ContentResult): number | null {
  if (isResolvedContentResult(result)) {
    return result.koreanPos;
  }
  return candidateSetAgreedKoreanPos(result.sourceCandidates)
    ?? result.entry?.senses?.[0]?.koreanPos
    ?? null;
}

export function contentResultKoreanCache(result: ContentResult): string {
  return isResolvedContentResult(result) ? result.korean : "";
}

export class ContentCtx {
  readonly cursor: TokenCursor<RuntimeHaruToken>;

  constructor(
    cursor: TokenCursor<RuntimeHaruToken>,
    readonly token: RuntimeHaruToken,
    readonly pos0: number,
    readonly entry: MorphemeEntry,
    readonly koreanLemma: string,
    readonly auxTokens: AuxTokens,
    readonly consumed: number,
    readonly forcePassive = false
  ) {
    this.cursor = cursor;
  }

  get start(): number {
    return this.cursor.origin;
  }

  get tokens(): readonly RuntimeHaruToken[] {
    return this.cursor.tokens;
  }

  get n(): number {
    return this.cursor.end;
  }

  get after(): number {
    return this.cursor.pos;
  }

  get irregular(): IrregularType | null {
    return metadataIrregular(this.entry, this.koreanLemma) ?? null;
  }

  get koreanPos(): number {
    return metadataKoreanPos(this.entry, this.koreanLemma);
  }

  get adverbial(): string | null {
    return metadataAdverbial(this.entry, this.koreanLemma);
  }

  get nominalized(): string | null {
    return metadataNominalized(this.entry, this.koreanLemma);
  }

  get verbCt4(): number | null {
    const pos4 = this.token.pos & POS4;
    if (pos4 === 0) return null;
    return pos4;
  }

  get verbCf5(): number | null {
    const pos5 = this.token.pos & POS5;
    if (pos5 === 0) return null;
    return pos5;
  }

  freshCursor(): TokenCursor<RuntimeHaruToken> {
    return this.cursor.fork();
  }
}

export class ContentTerminalCtx extends ContentCtx {
  constructor(
    cursor: TokenCursor<RuntimeHaruToken>,
    token: RuntimeHaruToken,
    pos0: number,
    entry: MorphemeEntry,
    koreanLemma: string,
    auxTokens: AuxTokens,
    consumed: number,
    forcePassive: boolean,
    readonly sfpType: string | null,
    readonly sfpNode: SfpNode | null,
  ) {
    super(cursor, token, pos0, entry, koreanLemma, auxTokens, consumed, forcePassive);
  }

  static fromContentCtx(ctx: ContentCtx, options: { readonly sfpType: string | null; readonly sfpNode: SfpNode | null; readonly sfpConsumed: number }): ContentTerminalCtx {
    return new ContentTerminalCtx(
      ctx.cursor.fork(ctx.after + options.sfpConsumed),
      ctx.token,
      ctx.pos0,
      ctx.entry,
      ctx.koreanLemma,
      ctx.auxTokens,
      ctx.consumed + options.sfpConsumed,
      ctx.forcePassive,
      options.sfpType,
      options.sfpNode,
    );
  }
}

export class ContentPhaseState {
  constructor(
    readonly consumed: number,
    readonly after: number,
    readonly auxTokens: AuxTokens
  ) { }
}

export class PhaseStep {
  constructor(
    readonly state: ContentPhaseState,
    readonly result: RuleResult | null,
    readonly voice: Voice | null = "active",
    readonly hasNegative = false
  ) { }

  get isPassive(): boolean {
    return this.voice === "passive";
  }

  get isPotential(): boolean {
    return this.voice === "potential";
  }
}
