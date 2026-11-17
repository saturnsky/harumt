import type { ClauseTerminalPunctuationRunEvidence } from "../clause-layout/punctuation.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { HonorificLevel, RenderPlanPolicy } from "../../types/pipeline.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { SourceTokenSpan } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";


export enum UnitType {
  CONTENT = "content",
  FUNCTIONAL = "functional",
  SYMBOL = "symbol",
  NUMERAL = "numeral",
  PREFIX = "prefix",
  SUFFIX = "suffix"
}

export enum FunctionalKind {
  PARTICLE = "particle",
  CONTEXTUAL = "contextual",
  MULTI_TOKEN = "multi_token"
}

export type { HonorificLevel };

export type TranslationUnitProvenance =
  | "assembler"
  | "structural_relation_owner"
  | "nominal_head"
  | "predicate_tail"
  | "tail_parser_blocked"
  | "legacy_tail"
  | "fallback";

export class KoreanChange {
  constructor(
    readonly rule: string,
    readonly old: string,
    readonly newValue: string
  ) {}

  get new(): string {
    return this.newValue;
  }
}

export class TranslationUnit<E extends MorphemeEntry = MorphemeEntry> {
  readonly _history: KoreanChange[];
  jpIndices: number[];
  sourceSpan: SourceTokenSpan | null;
  jpHead: RuntimeHaruToken;
  readonly sourceRawSurface: string | null;
  jpPos: number;
  koreanBase: string;
  korean: string;
  koreanPos: number;
  entry: E | null;
  renderPlan: RenderPlan | null;
  renderPlanPolicy: RenderPlanPolicy;
  unitType: UnitType;
  attachLeft: boolean;
  attachRight: boolean;
  functionalKind: FunctionalKind | null;
  allomorphKey: string | null;
  particleRole: string | null;
  register: HonorificLevel;
  suppressed: boolean;
  provenance: TranslationUnitProvenance;
  provenanceReason: string | null;
  renderFallbackReason: string | null;
  discourseConnective: boolean;
  particleMarkerKind: string | null;
  particleCopulaBase: string | null;
  warnings: readonly Warning[];
  terminalPunctuationRun: ClauseTerminalPunctuationRunEvidence | null;

  constructor(options: {
    jpIndices: readonly number[];
    sourceSpan?: SourceTokenSpan | null;
    jpHead: RuntimeHaruToken;
    sourceRawSurface?: string | null;
    jpPos: number;
    koreanBase: string;
    korean: string;
    koreanPos: number;
    entry: E | null;
    renderPlan: RenderPlan | null;
    renderPlanPolicy?: RenderPlanPolicy;
    unitType: UnitType;
    attachLeft?: boolean;
    attachRight?: boolean;
    functionalKind?: FunctionalKind | null;
    allomorphKey?: string | null;
    particleRole?: string | null;
    register?: HonorificLevel;
    suppressed?: boolean;
    provenance?: TranslationUnitProvenance;
    provenanceReason?: string | null;
    renderFallbackReason?: string | null;
    discourseConnective?: boolean;
    particleMarkerKind?: string | null;
    particleCopulaBase?: string | null;
    warnings?: readonly Warning[];
    history?: readonly KoreanChange[];
    terminalPunctuationRun?: ClauseTerminalPunctuationRunEvidence | null;
  }) {
    this.jpIndices = [...options.jpIndices];
    this.sourceSpan = options.sourceSpan ?? options.jpHead.sourceSpan ?? null;
    this.jpHead = options.jpHead;
    this.sourceRawSurface = options.sourceRawSurface ?? null;
    this.jpPos = options.jpPos;
    this.koreanBase = options.koreanBase;
    this.korean = options.korean;
    this.koreanPos = options.koreanPos;
    this.entry = options.entry;
    this.renderPlan = options.renderPlan;
    this.renderPlanPolicy = options.renderPlanPolicy ?? "normal";
    this.unitType = options.unitType;
    this.attachLeft = options.attachLeft ?? false;
    this.attachRight = options.attachRight ?? false;
    this.functionalKind = options.functionalKind ?? null;
    this.allomorphKey = options.allomorphKey ?? null;
    this.particleRole = options.particleRole ?? null;
    this.register = options.register ?? "none";
    this.suppressed = options.suppressed ?? false;
    this.provenance = options.provenance ?? "assembler";
    this.provenanceReason = options.provenanceReason ?? null;
    this.renderFallbackReason = options.renderFallbackReason ?? null;
    this.discourseConnective = options.discourseConnective ?? false;
    this.particleMarkerKind = options.particleMarkerKind ?? null;
    this.particleCopulaBase = options.particleCopulaBase ?? null;
    this.warnings = [...options.warnings ?? []];
    this.terminalPunctuationRun = options.terminalPunctuationRun ?? null;
    this._history = [...options.history ?? []];
  }

  get history(): readonly KoreanChange[] {
    return this._history;
  }

  setKorean(value: string, options: { rule: string }): void {
    if (value === this.korean) {
      return;
    }
    this._history.push(new KoreanChange(options.rule, this.korean, value));
    this.korean = value;
    this.renderPlan = null;
    this.renderPlanPolicy = "normal";
  }

  setRenderPlan(plan: RenderPlan, options: { rule: string; cacheValue: string; renderPlanPolicy?: RenderPlanPolicy }): void {
    const cacheValue = options.cacheValue;
    const renderPlanPolicy = options.renderPlanPolicy ?? "normal";
    if (plan === this.renderPlan && cacheValue === this.korean && cacheValue === this.koreanBase && renderPlanPolicy === this.renderPlanPolicy) {
      return;
    }
    this._history.push(new KoreanChange(options.rule, this.korean, cacheValue));
    this.renderPlan = plan;
    this.renderPlanPolicy = renderPlanPolicy;
    this.korean = cacheValue;
    this.koreanBase = cacheValue;
  }

  suppress(options: { rule: string }): void {
    this.suppressed = true;
    this._history.push(new KoreanChange(options.rule, this.korean, "[suppressed]"));
  }

  toString(): string {
    let label = this.unitType.toUpperCase();
    if (this.functionalKind !== null) {
      label += `/${this.functionalKind[0]?.toUpperCase() ?? ""}`;
    }
    const flags: string[] = [];
    if (this.attachLeft) {
      flags.push("attachLeft");
    }
    if (this.attachRight) {
      flags.push("attachRight");
    }
    if (this.suppressed) {
      flags.push("suppressed");
    }
    if (this.allomorphKey !== null) {
      flags.push(`key=${JSON.stringify(this.allomorphKey)}`);
    }
    if (this.particleRole !== null) {
      flags.push(`particleRole=${JSON.stringify(this.particleRole)}`);
    }
    if (this.register !== "none") {
      flags.push(`register=${JSON.stringify(this.register)}`);
    }
    if (this.provenance !== "assembler") {
      flags.push(`provenance=${JSON.stringify(this.provenance)}`);
    }
    if (this.provenanceReason !== null) {
      flags.push(`provenanceReason=${JSON.stringify(this.provenanceReason)}`);
    }
    if (this.renderFallbackReason !== null) {
      flags.push(`renderFallbackReason=${JSON.stringify(this.renderFallbackReason)}`);
    }
    if (this.renderPlanPolicy !== "normal") {
      flags.push(`renderPlanPolicy=${JSON.stringify(this.renderPlanPolicy)}`);
    }
    if (this.warnings.length > 0) {
      flags.push(`warnings=${this.warnings.length}`);
    }
    if (this._history.length > 0) {
      flags.push(`history=${this._history.length}`);
    }
    const flagSuffix = flags.length === 0 ? "" : ` [${flags.join(" ")}]`;
    return `${label} jp=[${this.jpIndices.join(",")}:${JSON.stringify(this.jpHead.surface)}] base=${JSON.stringify(this.koreanBase)} -> ${JSON.stringify(this.korean)}${flagSuffix}`;
  }
}

export function updateKoreanPhase1(unit: TranslationUnit, value: string): void {
  unit.korean = value;
  unit.koreanBase = value;
  unit.renderPlan = null;
}

export function clearGeneratedSurfaceCache(unit: TranslationUnit, options: { readonly rule: string }): void {
  if (unit.korean.length === 0 && unit.koreanBase.length === 0) {
    return;
  }
  unit._history.push(new KoreanChange(options.rule, unit.korean, ""));
  unit.korean = "";
  unit.koreanBase = "";
}

export function emitsOutput(unit: TranslationUnit): boolean {
  return !unit.suppressed && (unit.korean.length > 0 || unit.renderPlan !== null || unit.allomorphKey !== null);
}

export function phase3InvariantHolds(units: readonly TranslationUnit[]): boolean {
  return units.every((unit) => unit.suppressed || unit.korean.length > 0 || unit.renderPlan !== null || unit.allomorphKey !== null);
}

export function findAdjacentLeft(units: readonly TranslationUnit[], index: number): TranslationUnit | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const unit = units[cursor];
    if (unit !== undefined && emitsOutput(unit)) {
      return unit;
    }
  }
  return undefined;
}

export function findBatchimSource(units: readonly TranslationUnit[], index: number): TranslationUnit | undefined {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const unit = units[cursor];
    if (unit !== undefined && emitsOutput(unit) && unit.unitType !== UnitType.SYMBOL) {
      return unit;
    }
  }
  return undefined;
}

export function collectAnnotationKeys(
  unit: TranslationUnit,
  tokens: readonly RuntimeHaruToken[]
): number[] {
  const keys = new Set<number>();
  for (const idx of unit.jpIndices) {
    const token = tokens[idx];
    if (token?.annotationKeys !== undefined) {
      for (const key of token.annotationKeys) {
        keys.add(key);
      }
    }
  }
  return Array.from(keys);
}

export class TokenUnitIndex {
  private readonly map = new Map<number, TranslationUnit>();

  static build(units: readonly TranslationUnit[]): TokenUnitIndex {
    const index = new TokenUnitIndex();
    for (const unit of units) {
      for (const jpIndex of unit.jpIndices) {
        index.map.set(jpIndex, unit);
      }
    }
    return index;
  }

  get(tokenIndex: number): TranslationUnit | undefined {
    return this.map.get(tokenIndex);
  }

  set(tokenIndex: number, unit: TranslationUnit): void {
    this.map.set(tokenIndex, unit);
  }
}

export function findUnitCoveringIndex(units: readonly TranslationUnit[], jpIndex: number): TranslationUnit | undefined {
  for (let index = units.length - 1; index >= 0; index -= 1) {
    const unit = units[index];
    if (unit?.jpIndices.includes(jpIndex) === true) {
      return unit;
    }
  }
  return undefined;
}

export function collectUncoveredTokenIndices(
  tokens: readonly { pos: number }[],
  units: readonly TranslationUnit[]
): number[] {
  const covered = new Set(units.flatMap(u => u.jpIndices));
  const uncovered: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!covered.has(i)) {
      uncovered.push(i);
    }
  }
  return uncovered;
}

export function allNonWhitespaceTokensCovered(
  tokens: readonly { pos: number }[],
  units: readonly TranslationUnit[]
): boolean {
  return collectUncoveredTokenIndices(tokens, units).length === 0;
}
