import type { IrregularType } from "../../generator/conjugator.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { MorphemeEntry, MorphemeSense } from "../../types/dictionary.js";
import type { BenefactiveContext, RenderPlanPolicy, RuleTraceEvent } from "../../types/pipeline.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import type { ContentCtx, RuleResult } from "../content-types.js";
import type { LookupTables } from "../lookup-tables.js";
import type { AuxTokens } from "../matchers.js";
import type { PatternRuntimeToken } from "../pattern-runtime.js";
import type { EntryAuxResolver } from "../rules/entry-aux.js";
import type { PostAuxPatternResolverLike as PostAuxResolverLike } from "../rules/postaux-types.js";
import type { TraceCollector } from "../trace.js";

export interface ContentResolverEntryAuxResolver extends EntryAuxResolver {
  readonly patterns: NonNullable<PostAuxResolverLike["patterns"]>;
}

export interface ContentResolverTranslation extends MorphemeSense {
  readonly senseIndex?: number;
}

export interface ContentResolverEntry extends MorphemeEntry {
  readonly senses?: readonly ContentResolverTranslation[];
  readonly matchReason?: string;
}

export interface TranslationCandidateDedupeMarker {
  readonly kind: "sense" | "frame";
  readonly value: number | string;
}

export interface ContentPatternLike {
  readonly id: string;
  readonly mainVerbEnding?: string | null;
  readonly tailLemma?: string | null;
  readonly tailIrregular?: IrregularType | null;
  readonly tailKoreanPos?: number | null;
  readonly tailText?: string | null;
  readonly outputMode?: string | null;
  readonly triggerLength?: number;
  readonly transparentTail?: boolean;
  readonly incomingConnective?: string | null;
  readonly renderStrategy?: string | null;
  readonly state?: string | null;
}

export interface LexicalTailAbsorptionLike {
  readonly kind: string;
}

export interface ContentResolverPatternAccess {
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly patterns: {
    matchAt?(tokens: readonly PatternRuntimeToken[], pos: number): ContentPatternLike | null | undefined;
    matchPostVerb(tokens: readonly PatternRuntimeToken[], pos: number): ContentPatternLike | null | undefined;
    matchPostAux(tokens: readonly PatternRuntimeToken[], pos: number, auxTokens?: readonly PatternRuntimeToken[] | AuxTokens): ContentPostAuxPatternLike | null | undefined;
  };
}

export interface ContentResolverRuntimeAccess extends ContentResolverPatternAccess {
  readonly dictionary?: {
    lookup(dictionaryForm: string, reading: string, pos: number | readonly string[]): ContentResolverEntry | null | undefined | Promise<ContentResolverEntry | null | undefined>;
    translateToken?(token: RuntimeHaruToken): Promise<readonly (readonly [koreanLemma: string, entry: ContentResolverEntry | undefined])[]>;
    lookupTokenRelaxed?(token: RuntimeHaruToken): ContentResolverEntry | null | undefined | Promise<ContentResolverEntry | null | undefined>;
  };
  _renderSplitFallback?(token: RuntimeHaruToken): string | null | undefined | Promise<string | null | undefined>;
  _synthesizeEntry?(token: RuntimeHaruToken, options?: { readonly nextToken?: RuntimeHaruToken | null }): ContentResolverEntry | Promise<ContentResolverEntry>;
  readonly _sahenInfo?: (tokens: readonly RuntimeHaruToken[], start: number) => readonly [isSahen: boolean, sahenNoun: string | null] | Promise<readonly [isSahen: boolean, sahenNoun: string | null]>;
  _resolveEntryAuxPhase?(ctx: ContentCtx, isPotential: boolean, trace?: TraceCollector | null): RuleResult | null | Promise<RuleResult | null>;
}

export interface ContentPostAuxPatternLike {
  readonly id?: string;
  readonly outputMode?: string | null;
  readonly mainVerbEnding?: string | null;
  readonly connectiveEnding?: string | null;
  readonly tailLemma?: string | null;
  readonly tailIrregular?: IrregularType | null;
  readonly tailKoreanPos?: number | null;
  readonly tailText?: string | null;
  readonly middleText?: string | null;
  readonly triggerLength?: number;
  readonly auxPrecondition?: { matches(auxTokens: readonly RuntimeHaruToken[] | AuxTokens): boolean } | null;
}

export interface TeAruStateEvidence {
  readonly particleSurface: "が" | "を";
  readonly koreanLemma: string;
  readonly irregular?: IrregularType | null;
  readonly sourceNote: string;
  readonly sourceMatchReason: string;
  readonly state: "resultative" | "prepared";
  readonly renderStrategy: "resultative_state" | "prepared_te_oku";
}

export interface RuleChainPhaseStepLike {
  readonly result: RuleResultLike | null;
}

export type RuleChainResultLike = RuleResultLike | RuleChainPhaseStepLike;

export interface AuxTokenArrayElement {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
  readonly pos: number;
  readonly dictionaryId?: number;
}

export interface TranslationAffixSource {
  readonly kind: "dictionary";
  readonly text: string;
  readonly jpSurface?: string;
  readonly jpDictionaryForm?: string;
  readonly koreanPos?: number;
  readonly matchReason?: string;
  readonly note: string;
}

export interface RuleResultLike {
  readonly consumed: number;
  readonly korean: string;
  readonly spaceAfter: boolean;
  readonly renderPlan?: RenderPlan | null;
  readonly renderPlanPolicy?: RenderPlanPolicy;
  readonly traceTag?: string | null;
  readonly traceEvents?: readonly RuleTraceEvent[];
  readonly sourceVerbalPredicateVerdict?: import("../../types/pipeline.js").SourceVerbalPredicateVerdict | null;
  readonly benefactive?: BenefactiveContext | null;
  readonly warnings?: readonly Warning[];
  readonly rawSourceSurface?: true | undefined;
}
