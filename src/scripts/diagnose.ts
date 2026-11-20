#!/usr/bin/env node
import type { IrregularType } from "../generator/conjugator.js";
import { argv, exit, stderr } from "node:process";
import { applyInitialDueum } from "../generator/hanja.js";
import * as transform from "../transform/index.js";
import type { AnnotatedText } from "../types/annotation.js";
import {
  formatCounterPhrase,
  parseJapaneseNumber,
  sinoKorean,
} from "../generator/numerals.js";
import {
  EXTENSION_KANA_PAIRS,
  SOKUON_FOLLOWERS,
  TRANSLITERATION_SIMILARITY_THRESHOLD,
  estimateTransliterationSimilarity,
  generateKoreanReadings,
  isLoanwordKatakana,
  normalizeKana,
  tokenizeKana,
} from "../generator/readings.js";
import { diagnoseCompoundVerbCandidates } from "../pipeline/compounds/compound-verbs.js";
import {
  JP_POS_TO_KR,
  NONPREDICATE_CONTENT_POS,
  PASSTHROUGH_POS,
  isNonLexicalSymbolToken,
  isPersonGivenName,
  isPersonSurname,
  splitFallbackKorean,
  tryNumeralCompound,
  type ChainSegment,
} from "../pipeline/fallback/index.js";
import { buildClauseLayoutFromProto, type ClauseLayout } from "../pipeline/clause-layout/final-layout.js";
import { buildProtoLayout, nextNonSpaceIndex, useActiveProtoLayout } from "../pipeline/clause-layout/index.js";
import { resolveDeferredReanalysisProposals } from "../pipeline/commitment/deferred-reanalysis.js";
import { attachMoraStutterPrefixes } from "../pipeline/disfluency/stutter-prefix.js";
import { collectAuxTokens } from "../pipeline/matchers.js";
import { TokenCursor } from "../pipeline/token-cursor.js";
import { collectLexicalParticleBoundaryClaims } from "../pipeline/lexical-particle-boundary-claims.js";
import { collectLexicalRenyouHeadClaims } from "../pipeline/lexical-renyou-head-claims.js";
import { resolveContext } from "../pipeline/context.js";
import { commitDecisions } from "../pipeline/deferred-commitment.js";
import type { CommitmentCandidate, CommitmentSpan } from "../pipeline/commitment/types.js";
import { commitSharedTailParserChain } from "../pipeline/head-tail/lifecycle/render.js";
import { headEvidenceDecisionTraceValue } from "../pipeline/head-tail/tail/predicate-root/trace.js";
import type { AuxLayerNode, TailNode, TailRoot } from "../pipeline/head-tail/tail/predicate-root/grammar.js";
import type { LookupTables } from "../pipeline/lookup-tables.js";
import type { NumericTables } from "../generator/numeric-lookup.js";
import { lookupCarrierIdiom } from "../pipeline/semantics/carrier-idiom.js";
import { PredicateArgumentView, isAnimateReferentBeforeNi } from "../pipeline/semantics/helpers.js";
import { TranslationPipeline } from "../pipeline/index.js";
import { createTranslationPipeline } from "../default-provider.js";
import { formatTranslationWarning } from "./lib/format-warning.js";
import { realizeHostRenderPlan, realizeRenderPlan } from "../pipeline/rendering/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../types/render-plan.js";
import type { PlanTextSource, RenderPlan, Voice } from "../types/render-plan.js";
import type { PassiveClass } from "../pipeline/voice-class.js";
import { TranslationUnit, UnitType } from "../pipeline/translation/unit.js";
import { TraceCollector, type TraceDetailValue, type TraceEvent } from "../pipeline/trace.js";
import { retagKeijoujiCopulaRenyou } from "../pipeline/preprocess/keijouji-copula-de-retag.js";
import type { RuntimeHaruToken } from "../types/token.js";

import type { MorphemeEntry, MorphemeSense } from "../types/dictionary.js";
import type { CandidateConditionValue, ParticleAssignment } from "../types/pipeline.js";

import {
  is五段,
  POS0,
  POS0_NAME,
  POS1,
  POS1_NAME,
  POS1_SHIFT,
  POS2,
  POS4,
  POS4_NAME,
  POS4_SHIFT,
  posToString,
  サ行変格,
  サ変可能,
  サ変形状詞可能,
  固有名詞,
  助動詞,
  助動詞_レル,
  数詞,
  接頭辞,
  動詞,
  名詞,
  동사,
  명사,
  형용사,
} from "../types/pos.js";
interface ColorTable {
  h: string;
  k: string;
  v: string;
  ko: string;
  dim: string;
  r: string;
  warn: string;
  sep: string;
}

const COLOR: ColorTable = {
  h: "\x1b[1;36m",
  k: "\x1b[33m",
  v: "\x1b[37m",
  ko: "\x1b[1;32m",
  dim: "\x1b[2m",
  r: "\x1b[0m",
  warn: "\x1b[1;31m",
  sep: "\x1b[2;37m",
};
const NO_COLOR: ColorTable = {
  h: "",
  k: "",
  v: "",
  ko: "",
  dim: "",
  r: "",
  warn: "",
  sep: "",
};

type TraceDetail = TraceEvent["detail"];
type TraceDetailMap = { readonly [key: string]: TraceDetailValue };

interface ContentSnapshot {
  readonly korean: string;
  readonly koreanPos: number;
  readonly voice: Voice | null | undefined;
  readonly passiveClass: PassiveClass | undefined;
  readonly hasNegative: boolean | undefined;
  readonly renderPlanSummary: string;
  readonly fallbacks: readonly string[];
}

interface ResolvedTranslationView {
  readonly korean?: string;
  readonly koreanPos?: number;
  readonly irregular?: IrregularType | null;
}

interface CommitmentDiagnosticState {
  readonly trace: TraceCollector;
  readonly contentMap: ReadonlyMap<number, CommitmentSpan>;
  readonly layout: ClauseLayout;
}

interface PipelineDiagnosticsAccess {
  selectLexicalLayoutHypothesis?: (
    tokens: readonly RuntimeHaruToken[],
    options?: { readonly trace?: TraceCollector | null },
  ) => Promise<{ readonly contentMap: Map<number, CommitmentSpan>; readonly contentPassMap: Map<number, CommitmentSpan>; readonly layout: ClauseLayout;
    readonly protoLayout: ReturnType<typeof buildProtoLayout> }>;
  analyze?: (text: string) => RuntimeHaruToken[];
  mergeKatakanaNameChains?: (tokens: readonly RuntimeHaruToken[]) => RuntimeHaruToken[];
  expandNumericSplits?: (tokens: readonly RuntimeHaruToken[]) => RuntimeHaruToken[];
  recoverOovFunctionalSplits?: (tokens: readonly RuntimeHaruToken[]) => Promise<RuntimeHaruToken[]>;
  preprocessCollocations?: (tokens: readonly RuntimeHaruToken[]) => RuntimeHaruToken[];
  proposeDeferredReanalysis?: (tokens: RuntimeHaruToken[]) => RuntimeHaruToken[];
  expandOovSplits?: (tokens: readonly RuntimeHaruToken[]) => Promise<RuntimeHaruToken[]>;
  contentPass?: (
    tokens: readonly RuntimeHaruToken[],
    options?: { readonly trace?: TraceCollector | null },
  ) => Promise<Map<number, CommitmentSpan>>;
  renderSplitFallback?: (token: RuntimeHaruToken) => Promise<string | null | undefined>;
  _renderSplitFallback?: (token: RuntimeHaruToken) => Promise<string | null | undefined>;
  synthesizeEntry?: (
    token: RuntimeHaruToken,
    options?: { readonly nextToken?: RuntimeHaruToken | null },
  ) => Promise<MorphemeEntry>;
  _synthesizeEntry?: (
    token: RuntimeHaruToken,
    options?: { readonly nextToken?: RuntimeHaruToken | null },
  ) => Promise<MorphemeEntry>;
  diagnoseRenderPlaceNameFallback?: (token: RuntimeHaruToken) => Promise<string | null | undefined>;
  diagnoseGetReadingFallback?: (token: RuntimeHaruToken) => Promise<string | null | undefined>;
  diagnoseGetHanjaFallback?: (
    token: RuntimeHaruToken,
    options?: { readonly allowSuffix?: boolean },
  ) => Promise<string | null | undefined>;
  lookups: LookupTables;
  numeric: NumericTables;
}

export interface DiagnosticTransformInput {
  readonly originalText: string;
  readonly analysisText: string;
  readonly transformed: boolean;
  readonly annotations: readonly { readonly key: number; readonly kind: string }[];
}

export function diagnosticInputForText(text: string): DiagnosticTransformInput {
  const plain: AnnotatedText = { segments: [{ text }], table: new Map() };
  const forwarded = transform.forward(plain);
  const annotations = [...forwarded.table.entries()]
    .sort(([left], [right]) => left - right)
    .map(([key, annotation]) => ({ key, kind: annotation.kind }));
  return {
    originalText: text,
    analysisText: forwarded.segments.map((segment) => segment.text).join(""),
    transformed: forwarded !== plain,
    annotations
  };
}

function diagnosticsAccess(pipeline: TranslationPipeline): PipelineDiagnosticsAccess {
  return pipeline as TranslationPipeline & PipelineDiagnosticsAccess;
}

async function resolveSplitFallback(
  access: PipelineDiagnosticsAccess,
  token: RuntimeHaruToken,
): Promise<string | null> {
  const primary = await access.renderSplitFallback?.(token);
  if (primary !== null && primary !== undefined) {
    return primary;
  }
  return await access._renderSplitFallback?.(token) ?? null;
}

async function resolveSyntheticEntry(
  access: PipelineDiagnosticsAccess,
  token: RuntimeHaruToken,
  nextToken: RuntimeHaruToken | null,
): Promise<MorphemeEntry | undefined> {
  const primary = await access.synthesizeEntry?.(token, { nextToken });
  if (primary !== undefined) {
    return primary;
  }
  return await access._synthesizeEntry?.(token, { nextToken });
}

function traceString(detail: TraceDetail, key: string): string | undefined {
  const value = detail[key];
  return typeof value === "string" ? value : undefined;
}

function traceNumber(detail: TraceDetail, key: string): number | undefined {
  const value = detail[key];
  return typeof value === "number" ? value : undefined;
}

function traceBoolean(detail: TraceDetail, key: string): boolean | undefined {
  const value = detail[key];
  return typeof value === "boolean" ? value : undefined;
}

function traceArray(detail: TraceDetail, key: string): readonly TraceDetailValue[] {
  const value = detail[key];
  return Array.isArray(value) ? value : [];
}

function isTraceDetailArray(value: TraceDetailValue): value is readonly TraceDetailValue[] {
  return Array.isArray(value);
}

function traceMap(value: TraceDetailValue | undefined): TraceDetailMap | undefined {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return undefined;
  }
  if (isTraceDetailArray(value)) return undefined;
  return value;
}

type ContextValue = TraceDetailValue | CandidateConditionValue | undefined;

function formatContextValue(value: ContextValue): string {
  if (value === null) return "None";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) {
    if (value.length > 0 && Array.isArray(value[0])) {
      return `[${value.map((item) => (Array.isArray(item) ? item.map(formatContextValue).join("/") : formatContextValue(item))).join("; ")}]`;
    }
    return `[${value.map(formatContextValue).join(", ")}]`;
  }
  return String(value);
}

function formatFrameSummary(frame: unknown): string {
  if (frame === null || frame === undefined || typeof frame !== "object" || Array.isArray(frame)) return "default";
  const entries = Object.entries(frame as Record<string, ContextValue>);
  if (entries.length === 0) return "default";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${formatContextValue(value)}`)
    .join(", ");
}

function translationFrameSummary(translation: MorphemeSense): string {
  const frames = Array.isArray(translation.senseFrames)
    ? translation.senseFrames
    : [translation.senseFrame];
  const summaries = frames
    .filter((frame) => frame !== undefined && frame !== null)
    .map(formatFrameSummary)
    .filter((summary) => summary !== "default");
  return summaries.length === 0 ? "default" : summaries.join(" | ");
}

function translationKoreanPos(translation: MorphemeSense): string {
  return translation.koreanPos !== undefined ? posToString(translation.koreanPos) : "?";
}

function translationPriorityGroup(translation: MorphemeSense): number | undefined {
  return translation.priorityGroup;
}

function translationPriorityInGroup(translation: MorphemeSense): number | undefined {
  return translation.priorityInGroup;
}

function formatTranslationOption(translation: MorphemeSense): string {
  const korean = translation.korean ?? "?";
  const koreanPos = translationKoreanPos(translation);
  const group = translationPriorityGroup(translation);
  const order = translationPriorityInGroup(translation);
  const groupLabel = typeof group === "number" && typeof order === "number"
    ? ` group=${group} order=${order}`
    : "";
  return `${korean}/${koreanPos}${groupLabel} (${translationFrameSummary(translation)})`;
}

function formatCandidateConditions(conditions: readonly (readonly [string, CandidateConditionValue])[]): string {
  if (conditions.length === 0) return "default";
  return conditions
    .map(([key, value]) => `${key}=${formatContextValue(value)}`)
    .join(", ");
}

interface RareruResult {
  verdict: string;
  reruSurfaces: readonly string[];
  reason: string;
}

function describeRareru(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  n: number,
  lookups: LookupTables,
): RareruResult | null {
  const auxCursor = new TokenCursor(tokens, pos + 1, n);
  const auxTokens = collectAuxTokens(auxCursor);
  const reruSurfs: string[] = [];
  for (const t of auxTokens) {
    if ((t.pos & POS4) === 助動詞_レル) {
      reruSurfs.push(t.surface);
    }
  }
  if (reruSurfs.length === 0) return null;
  const verbCt4 = tokens[pos]!.pos & POS4;
  const dictForm = tokens[pos]!.dictionaryForm;
  if (is五段(tokens[pos]!.pos) || verbCt4 === サ行変格) {
    return { verdict: "수동", reruSurfaces: reruSurfs, reason: `五段/サ変+れる (${POS4_NAME[(verbCt4) >> POS4_SHIFT] ?? "*"})` };
  }
  if (lookups.RARERU_PASSIVE_PREFERRED.has(dictForm)) {
    return { verdict: "수동", reruSurfaces: reruSurfs, reason: `RPP (${dictForm})` };
  }
  return {
    verdict: "보류",
    reruSurfaces: reruSurfs,
    reason: "一段+られる: clause structure/commitment 확인 필요",
  };
}

function quoteText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const COMMITMENT_SOURCE_LABELS: Readonly<Record<string, string>> = {
  role_case_opt_in: "frame-role",
  translation_case_preference: "entry-case",
  noun_side_default_role_inference: "noun-default",
  causative_neutral_trigger: "neutral-trigger",
  fallback: "global-fallback",
};

export function formatCommitmentSource(source: string | number | boolean | null | undefined): string {
  const text = String(source);
  const label = COMMITMENT_SOURCE_LABELS[text];
  if (label === undefined) {
    return text;
  }
  return `${text}(${label})`;
}

function summarizeRenderPlan(plan: RenderPlan | null | undefined): string {
  if (plan === null || plan === undefined) return "-";
  return renderPlanTypeName(plan);
}

function findPlanFallbacks(plan: RenderPlan | null | undefined): string[] {
  if (plan === null || plan === undefined) return [];
  if (plan.kind === "legacySurfaceComposition") return ["legacy_surface_composition"];
  return [];
}

function formatFallbacks(plan: RenderPlan | null | undefined, c: ColorTable): string {
  const fallbacks = findPlanFallbacks(plan);
  if (fallbacks.length === 0) return `${c.dim}-${c.r}`;
  const labels: string[] = [];
  for (const marker of fallbacks) {
    if (marker === "legacy_surface_composition") labels.push(`${c.warn}LEGACY_SURFACE_COMPOSITION${c.r}`);
    else labels.push(`${c.warn}${marker}${c.r}`);
  }
  return labels.join(", ");
}

function renderPlanTypeName(plan: RenderPlan): string {
  switch (plan.kind) {
    case "lemma":
      return "LemmaRealization";
    case "attributive":
      return "AttributiveRealization";
    case "headTailChain":
      return plan.realization.kind === "nominal"
        ? "NominalHeadTailChainPlan"
        : "PredicateHeadTailChainRenderPlan";
    case "fixedText":
      return "FixedTextPlan";
    case "registerText":
      return "RegisterTextPlan";
    case "giveRequest":
      return "GiveRequestPlan";
    case "discourseConnective":
      return "DiscourseConnectivePlan";
    case "legacySurfaceComposition":
      return "LegacySurfaceCompositionPlan";
    case "noda":
      return "NodaPlan";
    case "keijoujiAdverb":
      return "KeijoujiAdverbPlan";
    case "keijoujiState":
      return "KeijoujiStatePlan";
    case "predicateScope":
      return "PredicateScopePlan";
    case "predicateNominalScope":
      return "PredicateNominalScopePlan";
    case "copulaPredicate":
      return "CopulaPredicatePlan";
    case "particleizedLemma":
      return "ParticleizedLemmaPlan";
    case "conjugatedLemma":
      return "ConjugatedLemmaPlan";
    case "wakeExplanation":
      return "WakeExplanationPlan";
    default:
      return "Unknown";
  }
}

function voicePlanName(voice: Voice | undefined): string | null {
  if (voice === undefined || voice === "active") return null;
  return voice.toUpperCase();
}

function legacySurfaceCompositionText(plan: Extract<RenderPlan, { kind: "legacySurfaceComposition" }>): string {
  return "text" in plan && plan.text !== undefined ? plan.text : plan.korean ?? "";
}

function describeRenderPlan(plan: RenderPlan | null | undefined): string {
  if (plan === null || plan === undefined) return "-";
  switch (plan.kind) {
    case "lemma": {
      const parts: string[] = [`korean_lemma="${quoteText(plan.koreanLemma)}"`];
      if (plan.connective !== null && plan.connective !== undefined) parts.push(`connective="${quoteText(plan.connective)}"`);
      if (plan.sfp !== null && plan.sfp !== undefined) parts.push(`sfp="${quoteText(plan.sfp)}"`);
      const voice = voicePlanName(plan.voice);
      if (voice !== null) parts.push(`voice=${voice}`);
      if (plan.passiveClass !== undefined) parts.push(`passive_class=${plan.passiveClass}`);
      return `LemmaRealization(${parts.join(", ")})`;
    }
    case "attributive": {
      const parts: string[] = [`korean_lemma="${quoteText(plan.koreanLemma)}"`];
      const voice = voicePlanName(plan.voice);
      if (voice !== null) parts.push(`voice=${voice}`);
      if (plan.passiveClass !== undefined) parts.push(`passive_class=${plan.passiveClass}`);
      if (plan.tailLemmaMode) parts.push("tail_lemma_mode=True");
      return `AttributiveRealization(${parts.join(", ")})`;
    }
    case "legacySurfaceComposition": {
      const parts: string[] = [`text="${quoteText(legacySurfaceCompositionText(plan))}"`];
      if (typeof plan.prefix === "string" && plan.prefix) parts.push(`prefix="${quoteText(plan.prefix)}"`);
      if (typeof plan.suffix === "string" && plan.suffix) parts.push(`suffix="${quoteText(plan.suffix)}"`);
      return `LegacySurfaceCompositionPlan(${parts.join(", ")})`;
    }
    case "noda": {
      const parts: string[] = [];
      if (typeof plan.prefix === "string") parts.push(`prefix="${quoteText(plan.prefix)}"`);
      else if (plan.prefix !== undefined) parts.push(`prefix=${describeRenderPlan(plan.prefix)}`);
      if (plan.sfp !== null && plan.sfp !== undefined) parts.push(`sfp="${quoteText(plan.sfp)}"`);
      return `NodaPlan(${parts.join(", ")})`;
    }
    case "keijoujiAdverb":
      return `KeijoujiAdverbPlan(stem="${quoteText(plan.stem)}", mode="${quoteText(plan.mode)}")`;
    case "keijoujiState":
      return `KeijoujiStatePlan(stem="${quoteText(plan.stem)}")`;
    case "giveRequest":
      return `GiveRequestPlan(${describeRenderPlan(plan.base)}, korean_lemma="${quoteText(plan.koreanLemma)}")`;
    case "discourseConnective": {
      const payload = "payload" in plan ? plan.payload : plan;
      return `DiscourseConnectivePlan(id="${quoteText(payload.id)}")`;
    }
    default:
      return renderPlanTypeName(plan);
  }
}

function entrySourceSummary(entry: MorphemeEntry | null | undefined): string {
  if (!entry) return "entry=none";
  const translation = entry.senses?.[0];
  const korean = translation?.korean ?? "?";
  const koreanPos = translation?.koreanPos !== undefined ? posToString(translation.koreanPos) : "?";
  if (entry.synthetic) {
    const reason = entry.syntheticReason ?? "oov";
    return `OOV[${reason}] "${quoteText(korean)}" pos=${koreanPos}`;
  }
  let matchReason = entry.matchReason ?? "exact";
  const ambiguous = entry.ambiguousCount ?? 0;
  if (ambiguous > 0) matchReason += `, candidates=${ambiguous + 1}`;
  return `dict[${matchReason}] "${quoteText(korean)}" pos=${koreanPos}`;
}

function planTextSourceSummary(source: PlanTextSource | null | undefined, text: string): string {
  if (source === null || source === undefined) {
    return `untracked "${quoteText(text)}"`;
  }
  const labelMap: Readonly<Record<string, string>> = {
    dictionary: "dict",
    oov: "OOV",
    rule_fixed: "rule",
  };
  const sourceKind = source.kind ?? "?";
  const parts: string[] = [labelMap[sourceKind] ?? sourceKind];
  if (source.matchReason) parts[0] += `[${source.matchReason}]`;
  if (source.jpSurface || source.jpDictionaryForm) {
    const jpSurface = source.jpSurface ?? "?";
    const jpDict = source.jpDictionaryForm ?? jpSurface;
    parts.push(`jp=${jpSurface}/${jpDict}`);
  }
  parts.push(`text="${quoteText(source.text ?? text)}"`);
  if (source.koreanPos != null) parts.push(`pos=${posToString(source.koreanPos)}`);
  if (source.note) parts.push(`note=${source.note}`);
  return parts.join("  ");
}

async function collectPlanSourceLines(
  plan: RenderPlan | null | undefined,
  pipeline: TranslationPipeline,
  fallbackEntry: MorphemeEntry | null | undefined = null,
  path = "main",
): Promise<string[]> {
  const lines: string[] = [];
  if (plan === null || plan === undefined) {
    return lines;
  }

  if (plan.kind === "legacySurfaceComposition") {
    if (plan.prefix) {
      if (typeof plan.prefix === "string") {
        lines.push(`${path}.prefix = ${planTextSourceSummary(plan.prefixSource, plan.prefix)}`);
      } else {
        lines.push(...await collectPlanSourceLines(plan.prefix, pipeline, fallbackEntry, `${path}.prefix`));
      }
    }
    lines.push(`${path} = surface "${quoteText(legacySurfaceCompositionText(plan))}"`);
    if (plan.suffix) {
      if (typeof plan.suffix === "string") {
        lines.push(`${path}.suffix = ${planTextSourceSummary(plan.suffixSource, plan.suffix)}`);
      } else {
        lines.push(...await collectPlanSourceLines(plan.suffix, pipeline, fallbackEntry, `${path}.suffix`));
      }
    }
    return lines;
  }

  if (plan.kind === "lemma") {
    const sourceEntry = plan.entry ?? fallbackEntry;
    const sourceKorean = sourceEntry?.senses?.[0]?.korean;
    if (sourceEntry !== null && sourceEntry !== undefined && sourceKorean === plan.koreanLemma) {
      lines.push(`${path} = ${entrySourceSummary(sourceEntry)}`);
    } else {
      lines.push(`${path} = lemma "${quoteText(plan.koreanLemma)}" pos=${posToString(plan.koreanPos)}`);
    }
    return lines;
  }

  if (plan.kind === "fixedText") {
    lines.push(`${path} = fixed_text "${quoteText(plan.text)}"`);
    return lines;
  }

  if (plan.kind === "registerText") {
    lines.push(`${path} = register_text casual="${quoteText(plan.casual)}" formal="${quoteText(plan.formal)}"`);
    return lines;
  }

  if (plan.kind === "attributive") {
    const sourceEntry = await pipeline.dictionary.lookupTokenRelaxed(plan.contentToken);
    const sourceKorean = sourceEntry?.senses?.[0]?.korean;
    if (sourceEntry !== undefined && sourceKorean === plan.koreanLemma) {
      lines.push(`${path} = ${entrySourceSummary(sourceEntry)}`);
    } else {
      lines.push(`${path} = attributive "${quoteText(plan.koreanLemma)}" pos=${posToString(plan.koreanPos)} token=${quoteText(plan.contentToken.dictionaryForm)}`);
    }
    return lines;
  }

  if (plan.kind === "discourseConnective") {
    const payload = "payload" in plan ? plan.payload : plan;
    lines.push(`${path} = discourse_connective id=${payload.id}`);
    return lines;
  }

  if (plan.kind === "wakeExplanation") {
    const payload = "payload" in plan ? plan.payload : plan;
    lines.push(`${path} = wake_explanation head=${payload.headKind} tail=${payload.tailKind}`);
    lines.push(...await collectPlanSourceLines(payload.prefix, pipeline, fallbackEntry, `${path}.prefix`));
    return lines;
  }

  if (plan.kind === "noda") {
    if (typeof plan.prefix === "string") {
      lines.push(`${path}.prefix = untracked "${quoteText(plan.prefix)}"`);
    } else if (plan.prefix !== undefined) {
      lines.push(...await collectPlanSourceLines(plan.prefix, pipeline, fallbackEntry, `${path}.prefix`));
    }
    return lines;
  }

  if (plan.kind === "giveRequest") {
    lines.push(...await collectPlanSourceLines(plan.base, pipeline, fallbackEntry, `${path}.base`));
    lines.push(`${path}.request = rule "${quoteText(plan.requestKind)}"`);
    return lines;
  }

  lines.push(`${path} = ${renderPlanTypeName(plan)}`);
  return lines;
}

function unitSourceSummary(unit: TranslationUnit): string {
  if (unit.allomorphKey !== null) return `allomorph=${unit.allomorphKey}`;
  if (unit.entry) return entrySourceSummary(unit.entry);
  const plan = unit.renderPlan;
  if (plan !== null) return describeRenderPlan(plan);
  return "surface_passthrough";
}

function pyReprString(text: string): string {
  return `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function pythonReprTraceValue(value: TraceDetailValue | TraceDetail): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "string") return pyReprString(value);
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(pythonReprTraceValue).join(", ")}]`;
  }
  const entries = Object.entries(value)
    .map(([key, item]) => `${pyReprString(key)}: ${pythonReprTraceValue(item)}`);
  return `{${entries.join(", ")}}`;
}

function formatTranslationUnitRepr(unit: TranslationUnit): string {
  let label = unit.unitType.toUpperCase();
  if (unit.functionalKind !== null) {
    label += `/${unit.functionalKind.toUpperCase()[0] ?? ""}`;
  }
  const flags: string[] = [];
  if (unit.attachLeft) flags.push("attach_left");
  if (unit.attachRight) flags.push("attach_right");
  if (unit.suppressed) flags.push("suppressed");
  if (unit.allomorphKey !== null) flags.push(`key=${pyReprString(unit.allomorphKey)}`);
  if (unit.register !== "none") flags.push(`register=${pyReprString(unit.register)}`);
  if (unit.history.length > 0) flags.push(`history=${unit.history.length}`);
  const flagSuffix = flags.length > 0 ? ` [${flags.join(" ")}]` : "";
  return `${label} jp=[${unit.jpIndices.join(",")}:${pyReprString(unit.jpHead.surface)}] base=${pyReprString(unit.koreanBase)} -> ${pyReprString(unit.korean)}${flagSuffix}`;
}

function pyBool(value: boolean): string {
  return value ? "True" : "False";
}

function collectExceptionUnits(
  units: readonly TranslationUnit[],
): (readonly [number, TranslationUnit, readonly string[]])[] {
  const rows: (readonly [number, TranslationUnit, readonly string[]])[] = [];
  for (let idx = 0; idx < units.length; idx++) {
    const unit = units[idx]!;
    const fallbacks = findPlanFallbacks(unit.renderPlan);
    if (fallbacks.length > 0) rows.push([idx, unit, fallbacks] as const);
  }
  return rows;
}

function printExceptionSummary(units: readonly TranslationUnit[], c: ColorTable): void {
  const rows = collectExceptionUnits(units);
  console.log(`${c.h}[7.5] Fallback / Exception Summary${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  if (rows.length === 0) {
    console.log(`  ${c.dim}예외 fallback unit 없음${c.r}\n`);
    return;
  }
  for (const [idx, unit] of rows) {
    const head = unit.jpHead.surface;
    const flags = formatFallbacks(unit.renderPlan, c);
    console.log(
      `  ${c.k}${String(idx).padStart(2)}${c.r}  ${c.v}${head.padEnd(10)}${c.r} -> ${c.ko}${unit.korean}${c.r}`,
    );
    console.log(`      plan=${summarizeRenderPlan(unit.renderPlan)}  fallback=${flags}`);
  }
  console.log();
}

function isAffixOrFunctional(unit: TranslationUnit): boolean {
  const t = unit.unitType;
  return (
    (t === UnitType.PREFIX || t === UnitType.SUFFIX || t === UnitType.FUNCTIONAL) &&
    !unit.suppressed
  );
}

function printAffixAndFunctionalUnits(units: readonly TranslationUnit[], c: ColorTable): void {
  const rows: (readonly [number, TranslationUnit])[] = [];
  for (let idx = 0; idx < units.length; idx++) {
    if (isAffixOrFunctional(units[idx]!)) rows.push([idx, units[idx]!] as const);
  }
  console.log(`${c.h}[7.6] Affix / Functional Units${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  if (rows.length === 0) {
    console.log(`  ${c.dim}해당 unit 없음${c.r}\n`);
    return;
  }
  for (const [idx, unit] of rows) {
    const flags: string[] = [];
    if (unit.attachLeft) flags.push("attach_left");
    if (unit.attachRight) flags.push("attach_right");
    const attach = flags.length > 0 ? flags.join(", ") : "-";
    console.log(
      `  ${c.k}${String(idx).padStart(2)}${c.r}  ${c.v}${unit.jpHead.surface.padEnd(10)}${c.r} type=${unit.unitType} -> ${c.ko}${unit.korean}${c.r}`,
    );
    console.log(`      dict=${unit.jpHead.dictionaryForm}  attach=${attach}  source=${unitSourceSummary(unit)}`);
  }
  console.log();
}

function printTokenLines(tokens: readonly RuntimeHaruToken[], c: ColorTable): void {
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;
    const surface = tok.surface;
    const pos = posStr(tok.pos);
    const dict = tok.dictionaryForm;
    const reading = tok.reading;
    let line = `  ${c.k}${String(i).padStart(2)}${c.r}  ${c.v}${surface.padEnd(10)}${c.r}  ${c.dim}${pos.padEnd(30)}${c.r}`;
    if (dict !== surface) line += `  dict=${dict}`;
    if (reading !== surface) line += `  読=${reading}`;
    const flags: string[] = [];
    if (tok.leadingSokuon) flags.push(`lead=${tok.leadingSokuon}`);
    if (tok.trailingSokuon) flags.push(`trail=${tok.trailingSokuon}`);
    if (tok.syntheticReason) flags.push(tok.syntheticReason);
    if (tok.collocDone) flags.push("collocation");
    if (tok.adverbialShite) flags.push("adverbial_shite");
    if (flags.length > 0) line += `  ${c.warn}← ${flags.join(" ")}${c.r}`;
    console.log(line);
    for (const [splitKey, label] of [["splitB", "B"], ["splitA", "A"]] as const) {
      const subs = tok[splitKey];
      if (subs === undefined || subs.length === 0) continue;
      const subStrs = subs.map((sub) => `${sub.surface}(${posStr(sub.pos)})`);
      console.log(`      ${c.dim}  └ ${label}: ${subStrs.join(" + ")}${c.r}`);
    }
  }
}

const CONTENT_LOOKUP_POS0: ReadonlySet<string> = new Set([
  "名詞", "動詞", "形容詞", "形状詞", "副詞", "連体詞", "代名詞", "接続詞", "感動詞",
]);

function posStr(pos: number): string {
  return posToString(pos).split("|").filter((part) => part !== "*").join("-");
}

function tokensEqual(left: readonly RuntimeHaruToken[], right: readonly RuntimeHaruToken[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function entryRepresentativeTranslation(entry: MorphemeEntry | null | undefined): string {
  const translation = entry?.senses?.[0];
  if (translation === undefined) return "-";
  return `${translation.korean}/${translationKoreanPos(translation)}`;
}

function formatVirtualLookup(
  diag: Awaited<ReturnType<typeof diagnoseCompoundVerbCandidates>>[number],
  c: ColorTable,
): string {
  if (diag.lookupHit) {
    return `${c.ko}hit${c.r} ${c.dim}${entryRepresentativeTranslation(diag.entry)}${c.r}`;
  }
  if (diag.knownResolverHint) {
    return `${c.warn}miss${c.r} ${c.dim}known-resolver=${diag.knownResolverHint}${c.r}`;
  }
  return `${c.warn}miss${c.r} ${c.dim}→ compound_oov candidate${c.r}`;
}

async function printCompoundVerbDiagnostics(
  pipeline: TranslationPipeline,
  tokens: readonly RuntimeHaruToken[],
  c: ColorTable,
  title: string,
): Promise<void> {
  const rows = await diagnoseCompoundVerbCandidates(tokens, pipeline.dictionary, {
    includeSingleSplitA: true,
    includeStreamVv: true,
    includeSahenShiV: true,
  });
  console.log(`${c.h}${title}${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  if (rows.length === 0) {
    console.log(`  ${c.dim}복합동사 후보 없음${c.r}\n`);
    return;
  }
  for (const diag of rows) {
    const cand = diag.candidate;
    const virtual = diag.virtualToken;
    const tailPos = posStr(diag.candidate.tail.pos);
    console.log(
      `  ${c.k}${String(cand.start).padStart(2)}${c.r}  ${c.v}${cand.surface.padEnd(12)}${c.r} kind=${cand.kind} consumed=${cand.consumed}`,
    );
    console.log(
      `      head=${cand.head.surface}/${cand.head.dictionaryForm}  tail=${cand.tail.surface}/${cand.tail.dictionaryForm} ${c.dim}[${tailPos}]${c.r}`,
    );
    console.log(
      `      virtual=${virtual.dictionaryForm} 読=${virtual.dictionaryFormReading ?? virtual.reading ?? "?"}  lookup=${formatVirtualLookup(diag, c)}`,
    );
    if (!diag.lookupHit && diag.knownResolverHint) {
      console.log(`      known_resolver=${c.dim}${diag.knownResolverHint}${c.r}`);
    }
    if (diag.reason !== "virtual_lookup_hit") {
      console.log(`      reason=${c.dim}${diag.reason}${c.r}`);
    }
  }
  console.log();
}

function isPureKatakanaReading(reading: string): boolean {
  if (reading.length === 0) return false;
  return Array.from(reading).every((ch) => ("゠" <= ch && ch <= "ヿ") || ch === "ー");
}

function loanwordSignalReasons(kana: string, surface = ""): string[] {
  const reasons: string[] = [];
  if (kana.includes("ー")) reasons.push("ー 장음");
  if (kana.includes("ヴ")) reasons.push("ヴ");
  for (let i = 0; i < kana.length - 1; i++) {
    const pair = kana.slice(i, i + 2);
    if (EXTENSION_KANA_PAIRS.has(pair)) {
      reasons.push(`확장카나 ${pair}`);
      break;
    }
  }
  if (kana.length >= 2 && kana.at(-2) === "ッ" && SOKUON_FOLLOWERS.has(kana.at(-1) ?? "")) {
    reasons.push(`어말 ッ${kana.at(-1) ?? ""}`);
  }
  const surfaceHasKanji = Array.from(surface).some((ch) => {
    const code = ch.codePointAt(0) ?? 0;
    return (0x4e00 <= code && code <= 0x9fff) || (0x3400 <= code && code <= 0x4dbf);
  });
  if (!surfaceHasKanji) {
    for (let i = 0; i < kana.length - 2; i++) {
      if (kana[i] === "ッ" && SOKUON_FOLLOWERS.has(kana[i + 1] ?? "")) {
        reasons.push(`어중 ッ${kana[i + 1] ?? ""}`);
        break;
      }
    }
  }
  return reasons;
}

interface SubstringMixSegment {
  readonly kana: string;
  readonly korean: string | null;
  readonly similarity: number | null;
  readonly transliterationFlag: boolean | null;
}

async function traceSubstringMix(
  pipeline: TranslationPipeline,
  reading: string,
  _surface: string,
  _minMatches: number,
): Promise<SubstringMixSegment[]> {
  const normalized = normalizeKana(reading);
  if (normalized.length === 0) return [];
  const tokens = tokenizeKana(normalized);
  if (tokens === undefined || tokens.length === 0) return [];

  const positions: number[] = [0];
  for (const token of tokens) {
    positions.push((positions.at(-1) ?? 0) + token.length);
  }
  const n = tokens.length;
  const minMorae = 2;

  const prefix: { readonly start: number; readonly end: number; readonly kana: string; readonly korean: string }[] = [];
  let i = 0;
  while (i < n) {
    let matched = false;
    for (let j = n; j >= i + minMorae; j--) {
      if (j - i < minMorae) break;
      const seg = normalized.slice(positions[i], positions[j]);
      const korean = await pipeline.dictionary.findKatakanaTransliteration(seg);
      if (korean !== undefined) {
        prefix.push({ start: i, end: j, kana: seg, korean });
        i = j;
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  const leftEnd = i;

  const suffix: { readonly start: number; readonly end: number; readonly kana: string; readonly korean: string }[] = [];
  i = n;
  while (i > leftEnd) {
    let matched = false;
    for (let start = leftEnd; start <= i - minMorae; start++) {
      if (i - start < minMorae) break;
      const seg = normalized.slice(positions[start], positions[i]);
      const korean = await pipeline.dictionary.findKatakanaTransliteration(seg);
      if (korean !== undefined) {
        suffix.push({ start, end: i, kana: seg, korean });
        i = start;
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  const rightStart = i;
  suffix.reverse();

  const out: SubstringMixSegment[] = [];
  for (const item of prefix) {
    out.push({
      kana: item.kana,
      korean: item.korean,
      similarity: estimateTransliterationSimilarity(item.kana, item.korean),
      transliterationFlag: dictTransliterationFlag(pipeline, item.kana, item.korean),
    });
  }
  if (rightStart > leftEnd) {
    out.push({
      kana: normalized.slice(positions[leftEnd], positions[rightStart]),
      korean: null,
      similarity: null,
      transliterationFlag: null,
    });
  }
  for (const item of suffix) {
    out.push({
      kana: item.kana,
      korean: item.korean,
      similarity: estimateTransliterationSimilarity(item.kana, item.korean),
      transliterationFlag: dictTransliterationFlag(pipeline, item.kana, item.korean),
    });
  }
  return out;
}

function dictTransliterationFlag(
  pipeline: TranslationPipeline,
  kana: string,
  korean: string,
): boolean | null {
  const entries = pipeline.dictionary.formOnlyEntries.get(kana);
  if (entries === undefined) return null;
  for (const entry of entries) {
    const pos = entry.pos;
    if (pos === undefined) continue;
    const posNum = typeof pos === "number" ? pos : 0;
    if ((posNum & POS0) !== 名詞) continue;
    for (const translation of entry.senses ?? []) {
      if (translation.korean.trim() === korean) {
        return typeof translation.transliteration === "boolean" ? translation.transliteration : null;
      }
    }
  }
  return null;
}

const SPLIT_RESOLVING_LABELS = new Set([
  "dict",
  "numeral_compound",
  "reading_fallback",
  "hanja_fallback",
  "counter_phrase",
  "sino_after_dai",
]);

interface SplitSpan {
  readonly start: number;
  readonly end: number;
  readonly output: string;
  readonly reason: string;
}

async function traceSplitGroup(
  pipeline: TranslationPipeline,
  subtokens: readonly RuntimeHaruToken[],
): Promise<SplitSpan[]> {
  const access = diagnosticsAccess(pipeline);
  const spans: SplitSpan[] = [];
  let hanjaDueumApplied = false;
  let i = 0;
  while (i < subtokens.length) {
    const sub = subtokens[i]!;
    const pos0 = POS0_NAME[sub.pos & POS0] ?? "";

    if (
      i > 0 &&
      spans.length > 0 &&
      isPersonGivenName(sub) &&
      isPersonSurname(subtokens[i - 1]!)
    ) {
      spans.push({ start: i, end: i, output: " ", reason: "space(姓+名)" });
    }

    if (PASSTHROUGH_POS.has(pos0)) {
      spans.push({ start: i, end: i + 1, output: sub.surface, reason: "passthrough" });
      i += 1;
      continue;
    }

    if (pos0 === "名詞" && (sub.pos & POS1) === 数詞 && i + 1 < subtokens.length) {
      const parsed = parseJapaneseNumber(sub.surface);
      if (parsed !== undefined) {
        const counter = formatCounterPhrase(parsed, subtokens[i + 1]?.dictionaryForm ?? "");
        if (counter !== undefined) {
          spans.push({ start: i, end: i + 2, output: counter, reason: "counter_phrase" });
          i += 2;
          continue;
        }
        if (i >= 1 && subtokens[i - 1]?.surface === "第" && ((subtokens[i - 1]?.pos ?? 0) & POS0) === 接頭辞) {
          const sino = sinoKorean(parsed);
          if (sino !== undefined) {
            spans.push({ start: i, end: i + 1, output: sino, reason: "sino_after_dai" });
            i += 1;
            continue;
          }
        }
      }
    }

    const entry = await pipeline.dictionary.lookupTokenRelaxed(sub);
    if (entry !== undefined) {
      spans.push({ start: i, end: i + 1, output: splitFallbackKorean(entry), reason: "dict" });
      i += 1;
      continue;
    }

    const numeral = tryNumeralCompound(sub);
    if (numeral !== undefined) {
      spans.push({ start: i, end: i + 1, output: numeral, reason: "numeral_compound" });
      i += 1;
      continue;
    }

    const readingFallback = await access.diagnoseGetReadingFallback?.(sub) ?? null;
    if (readingFallback !== null) {
      spans.push({ start: i, end: i + 1, output: readingFallback, reason: "reading_fallback" });
      i += 1;
      continue;
    }

    let hanjaFallback = await access.diagnoseGetHanjaFallback?.(sub, { allowSuffix: true }) ?? null;
    if (hanjaFallback !== null) {
      if (!hanjaDueumApplied) {
        hanjaFallback = applyInitialDueum(hanjaFallback);
        hanjaDueumApplied = true;
      }
      spans.push({ start: i, end: i + 1, output: hanjaFallback, reason: "hanja_fallback" });
      i += 1;
      continue;
    }

    spans.push({ start: i, end: i + 1, output: sub.surface, reason: "surface_fallback" });
    i += 1;
  }

  return spans;
}

async function printSplitFallbackDiagnosis(
  pipeline: TranslationPipeline,
  tok: RuntimeHaruToken,
  splitOutput: string,
  c: ColorTable,
): Promise<void> {
  const access = diagnosticsAccess(pipeline);
  const pos0 = POS0_NAME[tok.pos & POS0] ?? "";
  const koreanPos = JP_POS_TO_KR[pos0] ?? 명사;

  console.log(
    `      ${c.warn}OOV${c.r} → ${c.ko}${splitOutput}${c.r}  ${c.dim}(split_fallback (B/A 서브토큰 재조립), korean_pos=${posToString(koreanPos)})${c.r}`,
  );

  const placeResult = await access.diagnoseRenderPlaceNameFallback?.(tok) ?? null;
  if (placeResult !== null) {
    console.log(
      `      ${c.dim}branch: 固有名詞-地名 행정접미사 분리 (B-segment별 place+admin 분해)${c.r}`,
    );
    return;
  }

  for (const [subtokens, label] of [[tok.splitB, "B"], [tok.splitA, "A"]] as const) {
    if (subtokens === undefined || subtokens.length === 0) continue;
    const spans = await traceSplitGroup(pipeline, subtokens);
    const anyResolved = spans.some((span) => SPLIT_RESOLVING_LABELS.has(span.reason));
    if (!anyResolved) continue;

    console.log(
      `      ${c.dim}branch: split_${label.toLowerCase()} 서브토큰 개별 fallback 재조립${c.r}`,
    );
    for (const span of spans) {
      const displayResult = span.output.length > 0 ? span.output : "-";
      const reasonColor =
        ["dict", "numeral_compound", "counter_phrase", "sino_after_dai"].includes(span.reason)
          ? c.ko
          : ["surface_fallback", "hanja_fallback"].includes(span.reason)
            ? c.warn
            : c.dim;
      if (span.start === span.end) {
        console.log(
          `        ${c.dim}· ${label}:${c.r} (공백 삽입) → ${c.dim}' '${c.r}  ${c.dim}(${span.reason})${c.r}`,
        );
        continue;
      }
      if (span.end - span.start >= 2) {
        const surf = subtokens.slice(span.start, span.end).map((subtoken) => subtoken.surface).join("");
        const poses = subtokens.slice(span.start, span.end).map((subtoken) => POS0_NAME[subtoken.pos & POS0] ?? "?").join("+");
        console.log(
          `        ${c.dim}· ${label}:${c.r} ${surf} [${poses}] → ${reasonColor}${displayResult}${c.r}  ${c.dim}(${span.reason})${c.r}`,
        );
        continue;
      }
      const sub = subtokens[span.start]!;
      const subPos0 = POS0_NAME[sub.pos & POS0] ?? "?";
      console.log(
        `        ${c.dim}· ${label}:${c.r} ${sub.surface} [${subPos0}] → ${reasonColor}${displayResult}${c.r}  ${c.dim}(${span.reason})${c.r}`,
      );
    }
    return;
  }
}

async function printOovDiagnosis(
  pipeline: TranslationPipeline,
  tok: RuntimeHaruToken,
  c: ColorTable,
  nextToken: RuntimeHaruToken | null = null,
): Promise<boolean> {
  const access = diagnosticsAccess(pipeline);
  const pos0 = POS0_NAME[tok.pos & POS0] ?? "";

  if (NONPREDICATE_CONTENT_POS.has(pos0)) {
    const splitOutput = await resolveSplitFallback(access, tok);
    if (splitOutput !== null) {
      await printSplitFallbackDiagnosis(pipeline, tok, splitOutput, c);
      return true;
    }
  }

  const synthetic = await resolveSyntheticEntry(access, tok, nextToken);
  const translation = synthetic?.senses?.[0];
  const reason = synthetic?.syntheticReason ?? "?";
  const result = translation?.korean ?? tok.surface;
  const koreanPos = translation?.koreanPos ?? 명사;

  const reasonLabel = {
    lemma_fallback: "lemma_fallback (dict_form + 다)",
    reading_fallback: "reading_fallback (가나 독음 → 한글)",
    numeral_compound: "numeral_compound (수사+조수사 병합 복원)",
    hanja_fallback: "hanja_fallback (한자 → 한국 한자음)",
    surface_fallback: "surface_fallback (표층형 그대로)",
    symbol_passthrough: "symbol_passthrough (비어휘 기호 보존)",
  }[reason] ?? reason;

  console.log(
    `      ${c.warn}OOV${c.r} → ${c.ko}${result}${c.r}  ${c.dim}(${reasonLabel}, korean_pos=${posToString(koreanPos)})${c.r}`,
  );

  const surface = tok.surface;
  const reading = tok.reading;
  const isAscii = surface.length > 0 && Array.from(surface).every((ch) => /^[\x00-\x7F]$/u.test(ch));

  if (reason === "symbol_passthrough") {
    console.log(
      `      ${c.dim}gate: Unicode punctuation/symbol-only surface → lexical/OOV 명사 합성 차단${c.r}`,
    );
    return false;
  }

  if (reason === "lemma_fallback") {
    console.log(
      `      ${c.dim}gate: korean_pos∈{동사,형용사} → dict_form '${tok.dictionaryForm}' + 다${c.r}`,
    );
    return false;
  }

  if (reason === "reading_fallback") {
    const chainSegments = tok.chainSegments;
    if (chainSegments !== undefined && chainSegments.length > 0) {
      const mergedKata = chainSegments
        .filter((segment): segment is Extract<ChainSegment, { readonly kind: "kata" }> => segment.kind === "kata")
        .map((segment) => segment.reading)
        .join("・");
      const chainLoanword = isLoanwordKatakana(mergedKata, mergedKata);
      const sigColor = chainLoanword ? c.ko : c.warn;
      console.log(`      ${c.dim}gate: 카타카나 체인 병합 → _chain_segments 전용 렌더${c.r}`);
      console.log(
        `      chain_loanword=${sigColor}${chainLoanword ? "yes" : "no"}${c.r}  ${c.dim}(merged kata '${mergedKata}' 기준)${c.r}`,
      );
      for (const segment of chainSegments) {
        if (segment.kind === "kata") {
          console.log(`        · kata[${segment.reading}]`);
        } else if (segment.kind === "consume") {
          console.log(`        · ${c.dim}consume[${segment.text} → 공백]${c.r}`);
        } else {
          console.log(`        · ${c.warn}preserve[${segment.text}]${c.r}`);
        }
      }
      return false;
    }

    const isKoyuu = (tok.pos & POS1) === 固有名詞;
    const hasKatakana = Array.from(surface).some((ch) => ("゠" <= ch && ch <= "ヿ") || ch === "ー");
    const gateReason: string[] = [];
    if (isKoyuu) gateReason.push(POS1_NAME[(tok.pos & POS1) >> POS1_SHIFT] ?? "");
    if (hasKatakana) gateReason.push("surface 카타카나 포함");
    console.log(
      `      ${c.dim}gate: ${gateReason.join(", ") || "-"} → reading 기반 표기${c.r}`,
    );

    if (isPureKatakanaReading(reading)) {
      const loanword = isLoanwordKatakana(reading, surface);
      const signals = loanwordSignalReasons(reading, surface);
      const minMatches = loanword ? 1 : 2;
      const sigColor = loanword ? c.ko : c.warn;
      console.log(
        `      loanword=${sigColor}${loanword ? "yes" : "no"}${c.r}  (${signals.join(", ") || "신호 없음"})  ${c.dim}→ min_matches=${minMatches}${c.r}`,
      );

      const trace = await traceSubstringMix(pipeline, reading, surface, minMatches);
      const dictHits = trace.filter((segment) => segment.korean !== null).length;
      if (trace.length > 0) {
        const accepted = dictHits >= Math.max(1, minMatches);
        const verdict = accepted
          ? `${c.ko}채택${c.r}`
          : `${c.warn}폐기${c.r} (matches=${dictHits} < ${minMatches})`;
        console.log(`      substring-mix: ${verdict}  dict_hits=${dictHits}`);
        for (const segment of trace) {
          if (segment.korean === null) {
            console.log(`        ${c.dim}· phon[${segment.kana}]${c.r}`);
          } else {
            const flagLabel = segment.transliterationFlag === true
              ? "flag=true"
              : segment.transliterationFlag === false
                ? "flag=false"
                : segment.similarity !== null
                  ? `sim=${segment.similarity.toFixed(2)}≥${TRANSLITERATION_SIMILARITY_THRESHOLD}`
                  : "sim=?";
            console.log(
              `        ${c.ko}· dict[${segment.kana} → ${segment.korean}]${c.r}  ${c.dim}(${flagLabel})${c.r}`,
            );
          }
        }
      } else {
        console.log("      substring-mix: dict 매칭 없음");
      }

      const plain = generateKoreanReadings(reading, { surface });
      console.log(
        `      plain: reading=${reading}  official=${c.ko}${plain.official ?? "-"}${c.r}  common=${c.ko}${plain.common ?? "-"}${c.r}`,
      );
    } else if (reading.length > 0) {
      const plain = generateKoreanReadings(reading, { surface });
      console.log(
        `      reading=${reading}  official=${c.ko}${plain.official ?? "-"}${c.r}  common=${c.ko}${plain.common ?? "-"}${c.r}`,
      );
    }
    return false;
  }

  if (reason === "hanja_fallback") {
    console.log(
      `      ${c.dim}gate: 비활용 내용어(${pos0}) + 한자 surface → hanja_to_hangul${c.r}`,
    );
    return false;
  }

  if (reason === "surface_fallback") {
    const gateNotes: string[] = [];
    if (isAscii) gateNotes.push("ASCII surface (음역 차단)");
    if (!isPureKatakanaReading(reading)) gateNotes.push("reading 비-카타카나/공란");
    if (pos0.length > 0 && (tok.pos & POS1) !== 固有名詞) {
      gateNotes.push(`${pos0}-${POS1_NAME[(tok.pos & POS1) >> POS1_SHIFT] ?? "-"} 게이트 실패`);
    }
    console.log(
      `      ${c.dim}gate: ${gateNotes.join(", ") || "모든 fallback 거절"}${c.r}`,
    );
  }
  return false;
}

function snapshotContentMap(contentMap: ReadonlyMap<number, CommitmentSpan>): Map<number, ContentSnapshot> {
  const snapshot = new Map<number, ContentSnapshot>();
  for (const [idx, span] of contentMap.entries()) {
    snapshot.set(idx, {
      korean: span.korean,
      koreanPos: span.koreanPos,
      voice: span.voice,
      passiveClass: span.passiveClass,
      hasNegative: span.hasNegative,
      renderPlanSummary: summarizeRenderPlan(span.renderPlan),
      fallbacks: findPlanFallbacks(span.renderPlan),
    });
  }
  return snapshot;
}

function formatNameList(values: TraceDetailValue | undefined): string {
  if (!Array.isArray(values) || values.length === 0) return "[]";
  return `[${values.map(String).join(", ")}]`;
}

function traceCandidateList(value: TraceDetailValue | undefined, selectedIndex: number | null = null): string {
  const candidates = Array.isArray(value) ? value : [];
  if (candidates.length === 0) return "[]";
  return `[${candidates.map((candidate, index) => {
    const item = traceMap(candidate);
    if (item === undefined) return "?";
    const marker = selectedIndex !== null && index === selectedIndex ? "*" : "-";
    const lemma = typeof item.lemma === "string" ? item.lemma : "?";
    const pos = typeof item.korean_pos_name === "string" ? posStrForTrace(item.korean_pos_name) : "?";
    const group = typeof item.priority_group === "number" ? item.priority_group : "?";
    const order = typeof item.priority_in_group === "number" ? item.priority_in_group : "?";
    const sense = typeof item.sense_index === "number" ? item.sense_index : "?";
    const projectionOrdinal = typeof item.projection_ordinal === "number" ? item.projection_ordinal : "?";
    const fallback = item.fallback_group === true ? "/fallback" : "";
    const match = typeof item.match === "string" ? `/${item.match}` : "";
    const derivation = typeof item.derivation === "string" ? `/${item.derivation}` : "";
    const projection = typeof item.projection_source === "string" ? `/${item.projection_source}` : "";
    const plan = typeof item.render_plan_kind === "string" ? `/plan=${item.render_plan_kind}` : "";
    const nominalized = typeof item.nominalized === "string" ? `/nom=${item.nominalized}` : "";
    return `${marker}${lemma}/${pos}/g${group}.${order}/s${sense}.p${projectionOrdinal}${fallback}${match}${derivation}${projection}${plan}${nominalized}`;
  }).join(", ")}]`;
}

function formatSlotEvidenceTrace(value: TraceDetailValue | undefined): string {
  const item = traceMap(value);
  if (item === undefined) return "-";
  const owner = typeof item.owner === "string" ? item.owner : "?";
  const classification = typeof item.classification === "string" ? item.classification : "unclassified";
  const evidence = typeof item.evidence === "string" ? item.evidence : "?";
  const slot = typeof item.slot === "string" ? item.slot : "-";
  const effect = typeof item.effect === "string" ? item.effect : "?";
  const lowered = item.fallback_lowered_to_reorder === true ? " lowered=yes" : "";
  const dropped = typeof item.dropped_count === "number" ? ` dropped=${item.dropped_count}` : "";
  return `${owner}:${classification}:${evidence} slot=${slot} effect=${effect}${lowered}${dropped}`;
}

export function formatCandidateSelectionTrace(
  analysisEvent: TraceEvent | null,
  commitmentEvent: TraceEvent | null
): readonly string[] {
  const rows: string[] = [];
  if (analysisEvent !== null) {
    const detail = analysisEvent.detail;
    const slot = traceString(detail, "mixed_pos_slot") ?? "-";
    const pre = traceNumber(detail, "pre_slot_prune_candidate_count") ?? traceArray(detail, "pre_slot_prune_candidates").length;
    const post = traceNumber(detail, "candidate_count") ?? traceArray(detail, "candidates").length;
    const pruned = traceNumber(detail, "slot_pruned_candidate_count") ?? Math.max(0, pre - post);
    const evidence = traceArray(detail, "evidence").map(formatSlotEvidenceTrace).join("; ") || "-";
    rows.push(`content slot=${slot} pre=${pre} post=${post} pruned=${pruned} evidence=${evidence}`);
    rows.push(`content pre_candidates=${traceCandidateList(detail.pre_slot_prune_candidates)}`);
    rows.push(`content post_candidates=${traceCandidateList(detail.candidates)} dropped=${traceCandidateList(detail.slot_dropped_candidates)}`);
  }
  if (commitmentEvent !== null) {
    const detail = commitmentEvent.detail;
    const slotPruning = formatSlotEvidenceTrace(detail.slot_pruning);
    const commitmentEvidence = traceBoolean(detail, "head_tail_evidence_selection") === true
      ? "head_tail_evidence_selection"
      : slotPruning;
    const initial = traceNumber(detail, "initial_candidate_count") ?? traceArray(detail, "initial_candidates").length;
    const survivors = traceNumber(detail, "survivor_count") ?? traceArray(detail, "candidates").length;
    const fallbackCompatible = traceNumber(detail, "fallback_compatible_candidate_count");
    const fallbackText = fallbackCompatible === undefined ? "" : ` fallback_compatible=${fallbackCompatible}`;
    const invariant = traceBoolean(detail, "projection_invariant_violation") === true ? " projection_invariant_violation=yes" : "";
    const preRenderFallback = traceNumber(detail, "pre_render_fallback_warning_count");
    const preRenderFallbackText = preRenderFallback === undefined ? "" : ` pre_render_fallback_warnings=${preRenderFallback}`;
    rows.push(`deferred initial=${initial} survivors=${survivors}${fallbackText}${invariant}${preRenderFallbackText} evidence=${commitmentEvidence}`);
    rows.push(`deferred candidates=${traceCandidateList(detail.candidates, 0)} dropped=${traceCandidateList(detail.dropped_candidates)}`);
    if (detail.deferred_head_evidence_decision !== undefined) {
      rows.push(`deferred head_tail_decision=${formatHeadEvidenceDecision(detail.deferred_head_evidence_decision)}`);
    }
    if (traceBoolean(detail, "committed_sense_consumed") === true) {
      rows.push("deferred committed_sense=consumed");
    }
  }
  return rows;
}

function formatGrammarSummary(grammar: TraceDetailValue | undefined): string {
  const map = traceMap(grammar);
  if (map === undefined) return "-";
  const ordered = ["voice", "negative", "past", "polite"];
  const parts: string[] = [];
  for (const key of ordered) {
    if (map[key] !== undefined) parts.push(`${key}=${formatContextValue(map[key])}`);
  }
  for (const key of Object.keys(map).sort()) {
    if (!ordered.includes(key)) parts.push(`${key}=${formatContextValue(map[key])}`);
  }
  return parts.length > 0 ? parts.join(", ") : "-";
}

function findTraceEvent(
  trace: TraceCollector,
  idx: number,
  options: { readonly phase: string; readonly ruleName: string },
): TraceEvent | null {
  return trace.eventsFor(idx, { phase: options.phase }).find((event) => event.ruleName === options.ruleName) ?? null;
}

function findLastTraceEvent(
  trace: TraceCollector,
  idx: number,
  options: { readonly phase: string; readonly ruleName: string },
): TraceEvent | null {
  const events = trace.eventsFor(idx, { phase: options.phase })
    .filter((event) => event.ruleName === options.ruleName);
  return events[events.length - 1] ?? null;
}

export function commitmentEventForDiagnostics(
  trace: TraceCollector,
  idx: number,
  ruleName: string
): TraceEvent | null {
  if (ruleName === "passive_class") {
    return findLastTraceEvent(trace, idx, { phase: "commitment", ruleName });
  }
  return findTraceEvent(trace, idx, { phase: "commitment", ruleName });
}

function formatTraceEntryLabel(trace: TraceCollector, idx: number): string {
  const event = trace.entryPoint(idx);
  if (event === null) return "?";
  if (event.ruleName === "content_pos") {
    const pos0 = traceString(event.detail, "pos0");
    return pos0 ? `content_pos(${pos0})` : "content_pos";
  }
  return event.ruleName;
}

function formatTraceRuleLabel(trace: TraceCollector, idx: number): string {
  const event = trace.matchedRule(idx);
  return event === null ? "-" : `${event.ruleName} (${event.phase})`;
}

function formatTraceAux(trace: TraceCollector, idx: number): string {
  const event = trace.analysisEvent(idx);
  if (event === null) return "-";
  const aux = traceArray(event.detail, "aux");
  if (aux.length === 0) return "-";
  return `[${aux.map((token) => {
    const map = traceMap(token);
    const surface = map === undefined || typeof map.surface !== "string" ? "?" : map.surface;
    const pos4 = map === undefined || typeof map.pos4 !== "string" ? undefined : map.pos4;
    return pos4 ? `${surface}(${pos4})` : surface;
  }).join(", ")}]`;
}

function formatTraceVoiceExtract(trace: TraceCollector, idx: number): string {
  const event = trace.analysisEvent(idx);
  if (event === null) return "-";
  const voice = traceString(event.detail, "voice") ?? "?";
  const hasNegative = traceBoolean(event.detail, "has_negative") ? "yes" : "no";
  return `${voice}  has_negative=${hasNegative}`;
}

export function formatPassiveClassTrace(event: TraceEvent): string {
  const detail = event.detail;
  const passiveClass = traceString(detail, "passive_class") ?? "?";
  const subject = traceString(detail, "subject_animacy") ?? "?";
  const causativePolicy = traceString(detail, "causative_policy") ?? "-";
  const coerciveCandidate = traceBoolean(detail, "coercive_candidate") === true;
  const coerciveReasons = traceArray(detail, "coercive_candidate_reasons").map(String);
  const evidence: string[] = [];
  const flags: readonly [string, string][] = [
    ["reporting", "is_reporting_passive"],
    ["passive", "is_passive"],
    ["causative", "is_causative_passive"],
    ["te_iru", "has_progressive_te_iru"],
    ["past", "has_past"],
    ["negative", "has_negative"],
    ["attributive", "is_attributive"],
    ["wo", "has_explicit_wo_object"],
    ["possessor_wo", "has_possessor_wo_object"],
    ["animate_ni", "has_animate_ni_agent"],
  ];
  for (const [label, key] of flags) {
    const value = traceBoolean(detail, key);
    if (value !== undefined) evidence.push(`${label}=${value ? "yes" : "no"}`);
  }
  return [
    `class=${passiveClass}`,
    `subject=${subject}`,
    `causative=${causativePolicy}`,
    `coercive_candidate=${coerciveCandidate ? `yes(${coerciveReasons.join(",") || "-"})` : "no"}`,
    `evidence=[${evidence.join(", ") || "-"}]`
  ].join("  ");
}

function formatPassiveRuntimeMode(span: CommitmentSpan): string {
  if (span.passiveClass === "adversative") {
    const eMode = Object.values(span.committedParticleRoles ?? {})
      .some((assignment) => assignment.role === "adversative_agent_subject");
    return eMode ? "adversative=E" : "adversative=B";
  }
  if (span.passiveClass === "causative_coercive") return "causative=coercive";
  if (span.passiveClass === "causative_passive_neutral") return "causative=neutral";
  return "-";
}

function voiceLabel(voice: Voice | null | undefined): string {
  if (voice === null || voice === undefined) return "open";
  return voice.toLowerCase();
}

function clauseTag(clauseIdx: number | null | undefined): string {
  return clauseIdx === undefined || clauseIdx === null || clauseIdx < 0 ? "" : `  via c#${clauseIdx}`;
}

function formatAssignmentParticles(predicateIdx: number, layout: ClauseLayout, tokens: readonly RuntimeHaruToken[]): string {
  const clause = layout.clauseOfPredicate(predicateIdx);
  const particleIndices = clause?.particlesOf(predicateIdx) ?? [];
  if (particleIndices.length === 0) return "-";
  return particleIndices.map((idx) => `${idx}:${tokens[idx]?.surface ?? "?"}`).join(", ");
}

function formatCommittedRoles(span: CommitmentSpan): string {
  const roles = span.committedParticleRoles;
  if (roles === undefined || Object.keys(roles).length === 0) return "-";
  return Object.entries(roles)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([idx, assignment]) => `${idx}:${assignment.role}`)
    .join(", ");
}

function formatParticleResolution(
  predicateIdx: number,
  span: CommitmentSpan,
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
): string[] {
  const clause = layout.clauseOfPredicate(predicateIdx);
  const particleIndices = new Set<number>(clause?.particlesOf(predicateIdx) ?? []);
  const committedRoles: Readonly<Record<number, ParticleAssignment>> = span.committedParticleRoles ?? {};
  for (const idx of Object.keys(committedRoles)) particleIndices.add(Number(idx));
  if (particleIndices.size === 0) return ["-"];

  const predClauseIdx = layout.clauseIndexOfPredicate(predicateIdx);
  const rows: string[] = [];
  for (const pIdx of [...particleIndices].sort((left, right) => left - right)) {
    const token = tokens[pIdx];
    const ownerPred = layout.ownerPredicateOfParticle(pIdx);
    const bindTag = ownerPred === predicateIdx
      ? clauseTag(predClauseIdx)
      : `  owner=${ownerPred ?? "?"}${ownerPred === undefined ? "" : `(c#${layout.clauseIndexOfPredicate(ownerPred) ?? "?"})`}`;
    const committed = committedRoles[pIdx];
    if (committed === undefined) {
      rows.push(`${pIdx}:${token?.surface ?? "?"} source=${formatCommitmentSource("fallback")}${bindTag}`);
      continue;
    }
    const out = committed.korean ?? committed.allomorphKey ?? "?";
    const attach = committed.attachLeft === false ? "R" : "L";
    const source = formatCommitmentSource(committed.commitmentSource ?? "commitment");
    rows.push(`${pIdx}:${token?.surface ?? "?"} source=${source} role=${committed.role} out=${out} attach=${attach}${bindTag}`);
  }
  return rows;
}

function formatCommitmentTrace(event: TraceEvent): string {
  const suffix = clauseTag(traceNumber(event.detail, "clause_idx") ?? traceNumber(event.detail, "clauseIdx"));
  if (event.ruleName === "voice_resolution") {
    return `voice: ${traceString(event.detail, "before") ?? "?"} -> ${traceString(event.detail, "after") ?? "?"} (${traceString(event.detail, "reason") ?? "?"})${suffix}`;
  }
  if (event.ruleName === "particle_role") {
    const particleIdx = traceNumber(event.detail, "particle_idx") ?? traceNumber(event.detail, "particleIdx") ?? "?";
    const surface = traceString(event.detail, "surface") ?? "?";
    const role = traceString(event.detail, "role") ?? "?";
    const out = traceString(event.detail, "korean") ?? traceString(event.detail, "allomorph_key") ?? traceString(event.detail, "allomorphKey") ?? "?";
    const source = traceString(event.detail, "commitment_source") ?? traceString(event.detail, "commitmentSource");
    const sourceTag = source === undefined || source === null ? "" : ` source=${formatCommitmentSource(source)}`;
    return `particle: ${particleIdx}:${surface} -> ${role} (${out})${sourceTag}${suffix}`;
  }
  if (event.ruleName === "slot_realization_applied") {
    const role = traceString(event.detail, "role") ?? "?";
    const sourceIdx = traceNumber(event.detail, "source_token_index") ?? "?";
    const sourceSurface = traceString(event.detail, "source_surface") ?? "?";
    const particleIdx = traceNumber(event.detail, "source_particle_index") ?? "?";
    const particle = traceString(event.detail, "source_particle") ?? "?";
    const korean = event.detail.korean_override;
    const caseOverride = event.detail.case_override;
    const koreanText = korean === null || korean === undefined ? "keep" : JSON.stringify(String(korean));
    const caseText = caseOverride === null || caseOverride === undefined ? "keep" : JSON.stringify(String(caseOverride));
    return `slot_realization: ${role} ${sourceIdx}:${sourceSurface}/${particleIdx}:${particle} noun=${koreanText} case=${caseText}${suffix}`;
  }
  if (event.ruleName === "deferred_choice") {
    const condition = traceString(event.detail, "condition") ?? "?";
    const selected = traceString(event.detail, "selected") ?? "?";
    const scopeClause = traceNumber(event.detail, "scope_clause_idx");
    const scopeTag = scopeClause !== undefined && scopeClause >= 0 ? `  scope=c#${scopeClause}` : "";
    return `deferred: ${condition} -> ${selected}${scopeTag}${suffix}`;
  }
  if (event.ruleName === "noun_to_sareru") {
    return `rewrite: noun_to_sareru (${traceString(event.detail, "mode") ?? "?"})${suffix}`;
  }
  if (event.ruleName === "passive_class") {
    return `passive_class: ${formatPassiveClassTrace(event)}${suffix}`;
  }
  if (event.ruleName === "causative_neutral_trigger_candidate") {
    const particleIdx = traceNumber(event.detail, "particle_idx") ?? "?";
    const surface = traceString(event.detail, "surface") ?? "?";
    const triggerKind = traceString(event.detail, "trigger_kind") ?? "?";
    const renderEnabled = traceBoolean(event.detail, "render_enabled") === true;
    const output = traceString(event.detail, "output") ?? "-";
    const reason = traceString(event.detail, "reason") ?? "?";
    return `causative_neutral_trigger: ${particleIdx}:${surface} kind=${triggerKind} render=${renderEnabled ? "enabled" : "audit"} out=${output} reason=${reason}${suffix}`;
  }
  if (event.ruleName === "candidate_commitment") {
    return `candidates: selected=${traceString(event.detail, "selected") ?? "?"}  survivors=${formatNameList(event.detail.survivors)}  dropped=${formatNameList(event.detail.dropped)}${suffix}`;
  }
  if (event.ruleName === "frame_evidence_selection") {
    const candidateDesc: string[] = [];
    for (const candidate of traceArray(event.detail, "candidates")) {
      const map = traceMap(candidate);
      if (map === undefined) continue;
      const name = typeof map.korean === "string" ? map.korean : "?";
      const frameId = typeof map.frame_id === "string" ? map.frame_id : "-";
      const order = typeof map.priority_in_group === "number" ? map.priority_in_group : "?";
      candidateDesc.push(`${name}:${frameId}:order=${order}:evidence=${formatNameList(map.evidence_categories)}`);
    }
    const selectedDetail = traceMap(event.detail.selected_detail);
    const tie = formatNameList(selectedDetail?.tie_break_reason);
    const classification = traceString(event.detail, "classification") ?? "unclassified";
    const effect = traceString(event.detail, "effect") ?? "observe";
    return `frame_evidence: ${classification}/${effect} selected=${traceString(event.detail, "selected") ?? "?"} frame=${traceString(event.detail, "selected_frame_id") ?? "-"} tie=${tie} candidates=[${candidateDesc.join("; ") || "-"}]${suffix}`;
  }
  if (event.ruleName === "semantic_frame_shadow") {
    const frameId = traceString(event.detail, "frame_id") ?? traceString(event.detail, "frameId") ?? "?";
    const group = traceNumber(event.detail, "priority_group") ?? traceNumber(event.detail, "priorityGroup") ?? "?";
    const order = traceNumber(event.detail, "priority_in_group") ?? traceNumber(event.detail, "priorityInGroup") ?? "?";
    const sense = traceNumber(event.detail, "sense_index");
    const groupTag = `group=${group} order=${order}${sense === undefined ? "" : ` sense=${sense}`}`;
    if (!event.matched) return `semantic_frame: ${frameId} ${groupTag} skipped (${traceString(event.detail, "reason") ?? "?"})${suffix}`;
    const slots = traceMap(event.detail.slots);
    const slotDesc: string[] = [];
    if (slots !== undefined) {
      for (const [role, slotValue] of Object.entries(slots).sort(([left], [right]) => left.localeCompare(right))) {
        const slot = traceMap(slotValue);
        if (slot === undefined) continue;
        const particle = typeof slot.frame_particle === "string" ? slot.frame_particle : "?";
        const surface = typeof slot.surface === "string" ? slot.surface : "?";
        slotDesc.push(`${role}=${particle}:${surface}`);
      }
    }
    return `semantic_frame: ${frameId} ${groupTag} slots=[${slotDesc.join(", ") || "-"}] evidence=${formatNameList(event.detail.evidence_categories)} tie=${formatNameList(event.detail.tie_break_reason)}${suffix}`;
  }
  if (event.ruleName === "role_case_shadow") {
    const roles = traceMap(event.detail.roles) ?? {};
    const roleDesc = Object.entries(roles)
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([role, infoValue]) => {
        const info = traceMap(infoValue);
        if (info === undefined) return [];
        const particle = typeof info.particle === "string" ? info.particle : "?";
        const predicted = info.predicted === null || info.predicted === undefined ? "?" : String(info.predicted);
        const bucket = typeof info.bucket === "string" ? info.bucket : "?";
        return [`${role} ${particle}→${predicted}(${bucket})`];
      });
    return `role_case: ${roleDesc.join(", ") || "-"}${suffix}`;
  }
  return `${event.ruleName}: ${pythonReprTraceValue(event.detail)}`;
}

function printTraceRuleAttempts(trace: TraceCollector, idx: number, c: ColorTable): void {
  const phaseLabels: Record<string, string> = {
    special: "special phase",
    pre_entry: "pre_entry phase",
    entry_aux: "entry_aux phase",
    tail: "tail phase",
  };
  for (const phase of ["special", "pre_entry", "entry_aux", "tail"]) {
    const events = trace.eventsFor(idx, { phase });
    if (events.length === 0) continue;
    console.log(`      ${c.dim}── ${phaseLabels[phase]} ──${c.r}`);
    const signatures = events.map((event) => [
      event.ruleName,
      event.matched ? "1" : "0",
      traceString(event.detail, "trace_tag") ?? "",
    ].join("\0"));
    let cycleLen = events.length;
    let repeatCount = 1;
    for (let candidateCycle = 1; candidateCycle < events.length; candidateCycle += 1) {
      if (events.length % candidateCycle !== 0) continue;
      const base = signatures.slice(0, candidateCycle);
      const multiplier = events.length / candidateCycle;
      const expanded = Array.from({ length: multiplier }, () => base).flat();
      if (expanded.every((signature, index) => signature === signatures[index])) {
        cycleLen = candidateCycle;
        repeatCount = multiplier;
        break;
      }
    }
    for (const event of events.slice(0, cycleLen)) {
      const mark = event.matched ? `${c.ko}✓${c.r}` : `${c.dim}✗${c.r}`;
      const traceTag = traceString(event.detail, "trace_tag") ?? traceString(event.detail, "traceTag");
      const tagText = event.matched && traceTag ? `  ${c.dim}${traceTag}${c.r}` : "";
      const repeatText = repeatCount > 1 ? `  ${c.dim}x${repeatCount}${c.r}` : "";
      console.log(`        ${event.ruleName.padEnd(28)} ${mark}${tagText}${repeatText}`);
    }
  }
}

function formatTraceTokenSummary(value: TraceDetailValue | undefined): string {
  const map = traceMap(value);
  if (map === undefined) return "?";
  const idx = map.token_idx === null || map.token_idx === undefined ? "?" : String(map.token_idx);
  const surface = typeof map.surface === "string" ? map.surface : "?";
  const pos = typeof map.pos === "string" ? posStrForTrace(map.pos) : "?";
  return `${idx}:${surface}/${pos}`;
}

function posStrForTrace(pos: string): string {
  return pos.split("|").filter((part) => part !== "*").join("-") || pos;
}

function formatTailStemCandidates(value: TraceDetailValue | undefined): string {
  const candidates = Array.isArray(value) ? value : [];
  if (candidates.length === 0) return "[]";
  return `[${candidates.map((candidate) => {
    const map = traceMap(candidate);
    if (map === undefined) return "?";
    const lemma = typeof map.lemma === "string" ? map.lemma : "?";
    const stem = typeof map.admitted_stem_kind === "string" ? map.admitted_stem_kind : "?";
    const pos = typeof map.korean_pos_name === "string" ? posStrForTrace(map.korean_pos_name) : "-";
    return `${lemma}/${stem}/${pos}`;
  }).join(", ")}]`;
}

function formatHeadHypothesis(value: TraceDetailValue | undefined): string {
  const map = traceMap(value);
  if (map === undefined) return "-";
  const sourceKind = typeof map.source_stem_kind === "string" ? map.source_stem_kind : "?";
  const admittedKind = typeof map.admitted_stem_kind === "string" ? map.admitted_stem_kind : "?";
  const original = typeof map.original_candidate_count === "number" ? map.original_candidate_count : "?";
  const preserved = typeof map.preserved_candidate_count === "number" ? map.preserved_candidate_count : "?";
  const admitted = typeof map.admitted_candidate_count === "number" ? map.admitted_candidate_count : "?";
  const dropped = typeof map.dropped_candidate_count === "number" ? map.dropped_candidate_count : "?";
  const winner = typeof map.current_winner_index === "number" ? String(map.current_winner_index) : "-";
  const caps = formatHeadSourceCapabilities(map.source_capabilities);
  const candidates = Array.isArray(map.candidates) ? map.candidates : [];
  const candidateText = candidates.slice(0, 4).map((candidate) => {
    const item = traceMap(candidate);
    if (item === undefined) return "?";
    const index = typeof item.index === "number" ? item.index : "?";
    const lemma = typeof item.lemma === "string" ? item.lemma : "?";
    const stem = typeof item.projected_stem_kind === "string" ? item.projected_stem_kind : "?";
    const status = typeof item.status === "string" ? item.status : "?";
    const pos = typeof item.korean_pos_name === "string" ? posStrForTrace(item.korean_pos_name) : "-";
    const reason = typeof item.reason === "string" ? `:${item.reason}` : "";
    const preservedFlag = item.preserved_candidate === true ? "/preserved" : "";
    return `${index}:${lemma}/${stem}/${pos}/${status}${preservedFlag}${reason}`;
  }).join(", ");
  const more = candidates.length > 4 ? `, +${candidates.length - 4}` : "";
  return `source=${sourceKind}->${admittedKind} caps=${caps} original=${original} preserved=${preserved} admitted=${admitted} dropped=${dropped} winner=${winner} candidates=[${candidateText}${more}]`;
}

function formatHeadEvidenceDecision(value: TraceDetailValue | undefined): string {
  const map = traceMap(value);
  if (map === undefined) return "-";
  const openSet = traceArray(map, "candidate_open_set").map((value) => {
    const identity = traceMap(value);
    const provenance = traceMap(identity?.provenance);
    if (identity === undefined || provenance === undefined) return "?";
    const entry = typeof provenance.entry_id === "string"
      ? provenance.entry_id
      : typeof provenance.derivation_id === "string"
        ? provenance.derivation_id
        : "?";
    const sense = typeof provenance.sense_index === "number" ? `#${provenance.sense_index}` : "";
    const ordinal = typeof identity.projection_ordinal === "number" ? `.p${identity.projection_ordinal}` : "";
    return `${entry}${sense}${ordinal}`;
  }).join(",");
  const owner = typeof map.contract_owner === "string" ? map.contract_owner : "-";
  const order = Array.isArray(map.contract_realization_order)
    ? ` order=${map.contract_realization_order.map((group) =>
      Array.isArray(group) ? `[${group.filter((item) => typeof item === "string").join("/")}]` : "?"
    ).join(">")}`
    : "";
  const candidates = Array.isArray(map.candidates) ? map.candidates : [];
  const candidateText = candidates.slice(0, 5).map((candidate) => {
    const item = traceMap(candidate);
    if (item === undefined) return "?";
    const index = typeof item.index === "number" ? item.index : "?";
    const lemma = typeof item.lemma === "string" ? item.lemma : "?";
    const state = typeof item.state === "string" ? item.state : "?";
    const group = typeof item.priority_group === "number" ? item.priority_group : "?";
    const order = typeof item.priority_in_group === "number" ? item.priority_in_group : "?";
    const sense = typeof item.sense_index === "number" ? item.sense_index : "?";
    const projectionOrdinal = typeof item.projection_ordinal === "number" ? item.projection_ordinal : "?";
    const stemIndex = typeof item.stem_candidate_index === "number" ? `#${item.stem_candidate_index}` : "-";
    const join = typeof item.stem_candidate_index_source === "string" ? ` join=${item.stem_candidate_index_source}` : "";
    const stemStatus = typeof item.stem_commit_status === "string" ? ` commit=${item.stem_commit_status}` : "";
    const stemReason = typeof item.stem_commit_reason === "string" ? ` commit_reason=${item.stem_commit_reason}` : "";
    const prune = typeof item.prune_reason === "string" ? ` prune=${item.prune_reason}` : "";
    const context = typeof item.context_reason === "string" ? ` context=${item.context_reason}` : "";
    const excluded = typeof item.exclusion_reason === "string" ? ` excluded=${item.exclusion_reason}` : "";
    const choices = Array.isArray(item.realization_choices)
      ? ` choices=${item.realization_choices.map((choice) => {
        const choiceMap = traceMap(choice);
        if (choiceMap === undefined) return "?";
        const projection = typeof choiceMap.projection_kind === "string" ? choiceMap.projection_kind : "?";
        const choiceState = typeof choiceMap.state === "string" ? choiceMap.state : "?";
        return `${projection}:${choiceState}`;
      }).join("|")}`
      : "";
    return `${index}:${lemma}/g${group}.${order}/s${sense}.p${projectionOrdinal}/${stemIndex}/${state}${join}${stemStatus}${stemReason}${prune}${context}${excluded}${choices}`;
  }).join(", ");
  const moreCandidates = candidates.length > 5 ? `, +${candidates.length - 5}` : "";
  const rules = Array.isArray(map.rules) ? map.rules : [];
  const ruleText = rules.slice(0, 6).map((rule) => {
    const item = traceMap(rule);
    if (item === undefined) return "?";
    const name = typeof item.rule === "string" ? item.rule : "?";
    const result = typeof item.result === "string" ? item.result : "?";
    const classification = typeof item.classification === "string" ? item.classification : "?";
    const effect = typeof item.effect === "string" ? item.effect : result;
    return `${classification}:${name}:${effect}/${result}`;
  }).join(", ");
  const moreRules = rules.length > 6 ? `, +${rules.length - 6}` : "";
  return `owner=${owner}${order} open_set=[${openSet}] candidates=[${candidateText}${moreCandidates}] rules=[${ruleText}${moreRules}]`;
}

function firstAuxLayerFromTailNode(node: TailNode): AuxLayerNode {
  return node.kind === "connective" ? firstAuxLayerFromTailNode(node.inner) : node;
}

function formatCommittedTailRootMaterialization(root: TailRoot | undefined): string {
  if (root === undefined) return "";
  const layer = firstAuxLayerFromTailNode(root.tail);
  const stem = layer.stem;
  const lemma = "lemma" in stem ? stem.lemma : "-";
  return ` materialized_stem=${stem.kind}:${lemma}`;
}

function formatHeadSourceCapabilities(value: TraceDetailValue | undefined): string {
  const map = traceMap(value);
  if (map === undefined) return "-";
  const labels: string[] = [];
  const push = (key: string, label: string) => {
    if (map[key] === true) labels.push(label);
  };
  push("nominal_like", "nominal");
  push("na_adjective_capable", "na_adj");
  push("sahen_verbalization_capable", "sahen");
  push("adverbial_capable", "adverbial");
  push("adverb_capable_nominal", "fukushi_possible");
  push("lexical_adverb", "lex_adv");
  const inflect = typeof map.inflection_class === "string" ? map.inflection_class : "";
  const form = typeof map.stem_form === "string" ? map.stem_form : "";
  const base = labels.length === 0 ? "-" : labels.join("|");
  const suffix = [inflect, form].filter((item) => item.length > 0).join("/");
  return suffix.length === 0 ? base : `${base}:${suffix}`;
}

function firstHeadHypothesisFromObservation(value: TraceDetailValue | undefined): TraceDetailValue | undefined {
  const map = traceMap(value);
  if (map === undefined || !Array.isArray(map.attempts)) return undefined;
  for (const attempt of map.attempts) {
    const item = traceMap(attempt);
    if (item?.head_hypothesis !== undefined) {
      return item.head_hypothesis;
    }
  }
  return undefined;
}

function formatTailCandidateObservation(value: TraceDetailValue | undefined): string {
  const map = traceMap(value);
  if (map === undefined) return "-";
  const count = typeof map.candidate_count === "number" ? map.candidate_count : "?";
  const lastReason = typeof map.last_reason === "string" ? map.last_reason : "?";
  const attempts = Array.isArray(map.attempts) ? map.attempts : [];
  const attemptText = attempts.slice(0, 4).map((attempt) => {
    const item = traceMap(attempt);
    if (item === undefined) return "?";
    const end = typeof item.end === "number" ? item.end : "?";
    const status = typeof item.status === "string" ? item.status : "?";
    const reason = typeof item.reason === "string" ? `:${item.reason}` : "";
    return `${end}:${status}${reason}`;
  }).join(", ");
  const more = attempts.length > 4 ? `, +${attempts.length - 4}` : "";
  const interpretations = Array.isArray(map.interpretations) ? map.interpretations : [];
  const interpretationText = interpretations.slice(0, 4).map((candidate) => {
    const item = traceMap(candidate);
    if (item === undefined) return "?";
    const owner = typeof item.owner_key === "string" ? item.owner_key : "?";
    const selected = item.selected === true ? "*" : "-";
    const decision = traceMap(item.head_evidence_decision);
    const commit = typeof decision?.selected_stem_commit_status === "string"
      ? `:${decision.selected_stem_commit_status}`
      : "";
    const rule = typeof item.arbitration_rule === "string" ? `@${item.arbitration_rule}` : "";
    const reason = typeof item.rejection_reason === "string" ? `:${item.rejection_reason}` : "";
    return `${selected}${owner}${commit}${rule}${reason}`;
  }).join(", ");
  const moreInterpretations = interpretations.length > 4 ? `, +${interpretations.length - 4}` : "";
  const interpretationSummary = interpretations.length === 0
    ? ""
    : ` interpretations=[${interpretationText}${moreInterpretations}]`;
  return `count=${count} last=${lastReason} attempts=[${attemptText}${more}]${interpretationSummary}`;
}

function printTailChainObservability(trace: TraceCollector, idx: number, c: ColorTable): void {
  const events = trace.eventsFor(idx, { phase: "tail_chain" });
  if (events.length === 0) return;
  console.log(`      ${c.dim}tail_chain_trace:${c.r}`);
  for (const event of events) {
    if (event.ruleName === "candidate_not_built") {
      console.log(
        `        ${event.ruleName} ✗ source=${formatTraceTokenSummary(event.detail.source_token)} reason=${traceString(event.detail, "reason") ?? "?"}`,
      );
      const observation = event.detail.tail_candidate_observation;
      if (observation !== undefined) {
        console.log(`          observation=${formatTailCandidateObservation(observation)}`);
        const headHypothesis = firstHeadHypothesisFromObservation(observation);
        if (headHypothesis !== undefined) {
          console.log(`          head_hypothesis=${formatHeadHypothesis(headHypothesis)}`);
        }
      }
      continue;
    }
    const mark = event.matched ? "✓" : "✗";
    const source = formatTraceTokenSummary(event.detail.source_token);
    const stem = `${traceString(event.detail, "stem_kind") ?? "?"}/${traceString(event.detail, "admitted_stem_kind") ?? "?"}`;
    const deferred = `${traceString(event.detail, "deferred_commitment_candidate_status") ?? "?"}:${traceNumber(event.detail, "deferred_commitment_candidate_count") ?? "-"}`;
    console.log(
      `        ${event.ruleName} ${mark} source=${source} stem=${stem} candidates=${formatTailStemCandidates(event.detail.stem_candidates)} deferred=${deferred}`,
    );
    const headHypothesis = event.detail.head_hypothesis;
    if (headHypothesis !== undefined && headHypothesis !== null) {
      console.log(`          head_hypothesis=${formatHeadHypothesis(headHypothesis)}`);
    }
    const headEvidenceDecision = event.detail.head_evidence_decision;
    if (headEvidenceDecision !== undefined && headEvidenceDecision !== null) {
      console.log(`          head_evidence_decision=${formatHeadEvidenceDecision(headEvidenceDecision)}`);
    }
    const observation = event.detail.tail_candidate_observation;
    if (observation !== undefined) {
      console.log(`          observation=${formatTailCandidateObservation(observation)}`);
      const observedHeadHypothesis = firstHeadHypothesisFromObservation(observation);
      if (observedHeadHypothesis !== undefined) {
        console.log(`          observed_head_hypothesis=${formatHeadHypothesis(observedHeadHypothesis)}`);
      }
    }
  }
}

function printCommittedHeadEvidenceDecision(
  span: CommitmentSpan,
  c: ColorTable,
  lookups: LookupTables,
  numeric: NumericTables
): void {
  const plan = span.renderPlan;
  if (!isPredicateHeadTailChainRenderPlan(plan)) {
    return;
  }
  const committed = commitSharedTailParserChain({
    plan: plan,
    formal: false,
    lookups,
    numeric,
    realizeHostPlan: realizeHostRenderPlan
  });
  if ("ok" in committed) {
    console.log(`      ${c.dim}tail_evidence_decision=commit_failed:${committed.reason}${c.r}`);
    return;
  }
  const decision = committed.committedTailRoot?.headEvidenceDecision;
  if (decision === undefined) {
    return;
  }
  console.log(
    `      tail_evidence_decision=${formatHeadEvidenceDecision(headEvidenceDecisionTraceValue(decision))}${formatCommittedTailRootMaterialization(committed.committedTailRoot)}`
  );
}

function printSpanCandidates(
  span: CommitmentSpan,
  trace: TraceCollector,
  idx: number,
  lookups: LookupTables,
  options: { readonly verbose: boolean } = { verbose: false }
): void {
  const candidates: readonly CommitmentCandidate[] = candidateSetCandidates(commitmentLaneCandidateSet(span.sourceCandidates));
  if (candidates.length === 0) return;
  const enumEvent = findTraceEvent(trace, idx, { phase: "analysis", ruleName: "candidate_enumeration" });
  const grammar = enumEvent === null ? "" : `  local_grammar=${formatGrammarSummary(enumEvent.detail.grammar)}`;
  console.log(`      candidates=${candidates.length} shown${grammar}`);
  const spanSet = commitmentLaneCandidateSet(span.sourceCandidates);
  const selectedIdx = isResolvedCandidateSet(spanSet)
    ? spanSet.members.indexOf(spanSet.winner)
    : -1;
  for (let candidateIdx = 0; candidateIdx < candidates.length; candidateIdx++) {
    const candidate = candidates[candidateIdx]!;
    const marker = candidateIdx === selectedIdx ? "*" : "-";
    console.log(
      `        ${marker} ${candidate.koreanLemma ?? candidate.korean ?? "?"}/${candidate.koreanPos != null ? posToString(candidate.koreanPos) : "?"}  voice=${voiceLabel(candidate.voice)}  passive_class=${candidate.passiveClass ?? "-"}  negative=${candidate.hasNegative ? "yes" : "no"}`,
    );
    console.log(`          conditions=${formatCandidateConditions(candidate.conditions ?? [])}`);
    const surface = candidate.renderPlan === null || candidate.renderPlan === undefined
      ? candidate.korean ?? ""
      : realizeRenderPlanForDiagnostics(candidate.renderPlan, lookups);
    console.log(`          surface=${surface}  plan=${summarizeRenderPlan(candidate.renderPlan)}`);
  }
  const commitEvent = findTraceEvent(trace, idx, { phase: "commitment", ruleName: "candidate_commitment" });
  if (commitEvent !== null) {
    console.log(
      `      candidate_commitment=selected=${traceString(commitEvent.detail, "selected") ?? "?"}  survivors=${formatNameList(commitEvent.detail.survivors)}  dropped=${formatNameList(commitEvent.detail.dropped)}`,
    );
  }
  if (options.verbose) {
    const candidateSelectionRows = formatCandidateSelectionTrace(enumEvent, commitEvent);
    if (candidateSelectionRows.length > 0) {
      console.log("      candidate_selection:");
      for (const row of candidateSelectionRows) {
        console.log(`        ${row}`);
      }
    }
  }
}

function realizeRenderPlanForDiagnostics(plan: RenderPlan, lookups: LookupTables): string {
  try {
    return realizeRenderPlan(plan, { formal: false, lookups });
  } catch (error) {
    return `[render failed: ${error instanceof Error ? error.message : String(error)}]`;
  }
}

function printCommitmentEvent(trace: TraceCollector, idx: number, ruleName: string): void {
  const event = commitmentEventForDiagnostics(trace, idx, ruleName);
  if (event !== null) console.log(`      ${formatCommitmentTrace(event)}`);
}

function printSlotRealizationEffects(trace: TraceCollector, idx: number): void {
  for (const event of trace.eventsFor(idx, { phase: "commitment" })) {
    if (event.ruleName === "slot_realization_applied") {
      console.log(`      ${formatCommitmentTrace(event)}`);
    }
  }
}


function sahenPredicateVerbIndex(tokens: readonly RuntimeHaruToken[], nounIndex: number): number | null {
  const noun = tokens[nounIndex];
  if (noun === undefined || (noun.pos & POS0) !== 名詞 || ((noun.pos & POS2) !== サ変可能 && (noun.pos & POS2) !== サ変形状詞可能)) {
    return null;
  }
  const verbIndex = nextNonSpaceIndex(tokens, nounIndex + 1);
  const verb = verbIndex === null ? undefined : tokens[verbIndex];
  return verb !== undefined && (verb.pos & POS0) === 動詞 && verb.dictionaryForm === "する" ? verbIndex : null;
}

function formatParticleSurfaceList(tokens: readonly RuntimeHaruToken[], indices: readonly number[]): string {
  if (indices.length === 0) return "-";
  return indices.map((idx) => `${idx}:${tokens[idx]?.surface ?? "?"}`).join(", ");
}

function sensoryLookupNameFromFrame(frameId: string): string {
  switch (frameId) {
    case "sensory_audible":
      return "sensory_noun_audible";
    case "sensory_audible_voice":
      return "sensory_noun_audible_voice";
    case "sensory_olfactory":
      return "sensory_noun_olfactory";
    case "sensory_gustatory":
      return "sensory_noun_gustatory";
    case "sensory_chill":
      return "sensory_noun_chill";
    default:
      return frameId;
  }
}

function candidateCommitmentNames(event: TraceEvent | null): readonly string[] {
  if (event === null) return [];
  const out: string[] = [];
  const selected = traceString(event.detail, "selected");
  if (selected !== undefined && selected.length > 0) out.push(selected);
  for (const key of ["survivors", "dropped"] as const) {
    for (const value of traceArray(event.detail, key)) {
      if (typeof value === "string" && value.length > 0) out.push(value);
    }
  }
  return out;
}

async function printNominalLightVerbDiagnostics(
  tokens: readonly RuntimeHaruToken[],
  state: CommitmentDiagnosticState,
  c: ColorTable,
  lookups: LookupTables,
): Promise<void> {
  const rows: string[] = [];

  for (const [idx, _span] of [...state.contentMap.entries()].sort(([left], [right]) => left - right)) {
    const verbIndex = sahenPredicateVerbIndex(tokens, idx);
    if (verbIndex === null) {
      continue;
    }
    const noun = tokens[idx]!;
    const nounDictForm = noun.dictionaryForm || noun.surface;
    const hit = lookups.SEMANTIC_PATIENT_RESULT_SAHEN_NOUNS.has(nounDictForm);
    const clause = state.layout.clauseOfPredicate(idx);
    const particleIndices = clause?.particlesOf(idx) ?? [];
    const hasObject = particleIndices.some((particleIdx) => tokens[particleIdx]?.surface === "を");
    const commitEvent = findTraceEvent(state.trace, idx, { phase: "commitment", ruleName: "candidate_commitment" });
    const projectionActive = hit && candidateCommitmentNames(commitEvent).some((name) => name.endsWith("되다"));
    rows.push(
      `  ${c.k}${String(idx).padStart(2)}${c.r}  ${c.v}${noun.surface.padEnd(10)}${c.r}` +
      ` sahen_projection_class=${projectionActive ? "patient_result" : "agent_action"}` +
      ` sahen_lookup_hit=${hit ? "patient_result_sahen_nouns" : "-"}` +
      ` projection_runtime=${projectionActive ? "active" : (hit ? "guarded_off_or_default" : "lookup_miss")}` +
      ` context_winner=${projectionActive ? (hasObject ? "agent_object" : "bare_default") : "default"}` +
      ` particles=[${formatParticleSurfaceList(tokens, particleIndices)}]`,
    );
  }

  for (const event of state.trace.events) {
    if (event.phase !== "commitment" || event.ruleName !== "semantic_frame_shadow" || !event.matched) {
      continue;
    }
    const frameId = traceString(event.detail, "frame_id") ?? traceString(event.detail, "frameId") ?? "";
    if (!frameId.startsWith("sensory_")) {
      continue;
    }
    const token = tokens[event.tokenIdx];
    const selected = traceString(
      findTraceEvent(state.trace, event.tokenIdx, { phase: "commitment", ruleName: "candidate_commitment" })?.detail ?? {},
      "selected",
    ) ?? "?";
    rows.push(
      `  ${c.k}${String(event.tokenIdx).padStart(2)}${c.r}  ${c.v}${(token?.surface ?? "?").padEnd(10)}${c.r}` +
      ` sensory_frame=${frameId}` +
      ` sensory_lookup_hit=${sensoryLookupNameFromFrame(frameId)}` +
      ` selected=${selected}`,
    );
  }

  for (let nounIndex = 0; nounIndex < tokens.length; nounIndex++) {
    const noun = tokens[nounIndex];
    if (noun === undefined || (noun.pos & POS0) !== 名詞 || state.contentMap.get(nounIndex) === undefined) {
      continue;
    }
    const particleIndex = nextNonSpaceIndex(tokens, nounIndex + 1);
    if (particleIndex === null || tokens[particleIndex]?.surface !== "を") {
      continue;
    }
    const predicateIndex = nextNonSpaceIndex(tokens, particleIndex + 1);
    if (predicateIndex === null) {
      continue;
    }
    const predicate = tokens[predicateIndex];
    if (predicate === undefined || (predicate.pos & POS0) !== 動詞 || state.contentMap.get(predicateIndex) === undefined) {
      continue;
    }
    if (state.layout.ownerPredicateOfParticle(particleIndex) !== predicateIndex) {
      continue;
    }
    const predicateDictForm = predicate.dictionaryForm || predicate.surface;
    const carrier = lookupCarrierIdiom(state.contentMap.get(nounIndex) ?? null, "を", predicateDictForm);
    if (carrier !== null) {
      rows.push(
        `  ${c.k}${String(nounIndex).padStart(2)}${c.r}  ${c.v}${noun.surface.padEnd(10)}${c.r}` +
        ` carrier_decision=carrier_swap predicate=${predicateDictForm}` +
        ` carrier=${carrier.koreanCarrier}` +
        ` particle=${particleIndex}:を`,
      );
      continue;
    }
    if (predicateDictForm === "する") {
      rows.push(
        `  ${c.k}${String(nounIndex).padStart(2)}${c.r}  ${c.v}${noun.surface.padEnd(10)}${c.r}` +
        ` carrier_decision=preserve_analytic` +
        ` predicate=${predicateDictForm}` +
        ` particle=${particleIndex}:を`,
      );
    }
  }

  console.log(`${c.h}[5.5] Nominal Light-Verb Projection${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  if (rows.length === 0) {
    console.log(`  ${c.dim}해당 projection 후보 없음${c.r}\n`);
    return;
  }
  for (const row of rows) {
    console.log(row);
  }
  console.log();
}

function printBorrowArguments(
  predicateIdx: number,
  layout: ClauseLayout,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
): void {
  const view = new PredicateArgumentView(tokens, predicateIdx, {
    lookups,
    layout,
    connectiveRoles: layout.connectiveRoles.size > 0 ? layout.connectiveRoles : null,
  });
  const own = view.arguments();
  const full = view.arguments({ includeBorrowed: true });
  const borrowedArgs = full.slice(own.length);
  if (borrowedArgs.length === 0) return;

  const parts: string[] = [];
  for (const arg of borrowedArgs) {
    const ownerPred = layout.ownerPredicateOfParticle(arg.particleIdx);
    const ownerClause = ownerPred === undefined ? undefined : layout.clauseIndexOfPredicate(ownerPred);
    const role = ownerPred === undefined ? undefined : layout.connectiveRoles.get(ownerPred);
    const nounForm = arg.noun?.dictionaryForm ?? "?";
    const ownerTag = ownerPred === undefined ? "?" : `c#${ownerClause}/pred ${ownerPred}`;
    parts.push(`${arg.particleIdx}:${arg.particle.surface}=${nounForm} (${ownerTag}, role=${role ?? "?"})`);
  }

  let gateState: string;
  if (layout.connectiveRoles.size === 0) {
    gateState = "te-borrow role 게이트: role data 없음 (같은 절 連用中止 borrow에는 미적용)";
  } else {
    const ownerRoles = new Set(borrowedArgs.map((arg) => {
      const owner = layout.ownerPredicateOfParticle(arg.particleIdx);
      return owner === undefined ? undefined : layout.connectiveRoles.get(owner);
    }));
    if (ownerRoles.size === 1 && ownerRoles.has(undefined)) {
      gateState = "owner role unknown → te-borrow 제외 (連用中止 borrow에는 미적용)";
    } else if (ownerRoles.has("reason")) {
      gateState = "owner role=reason → te-borrow blocked";
    } else {
      gateState = "owner role listing/adverbial → te-borrow allowed";
    }
  }
  const compoundHeadIdx = layout.compoundHeadOfPredicate(predicateIdx);
  const compoundTag = compoundHeadIdx === undefined ? "" : `  compound_pair_head=${compoundHeadIdx} (が/を는 own으로 공유)`;
  console.log(`      borrowed=[${parts.join(", ")}]  ${gateState}${compoundTag}`);
}

async function printCommitmentDiagnostics(
  pipeline: TranslationPipeline,
  tokens: readonly RuntimeHaruToken[],
  c: ColorTable,
  options: { readonly verbose: boolean; readonly showClauseLayout: boolean },
): Promise<CommitmentDiagnosticState> {
  const access = diagnosticsAccess(pipeline);
  const lookups = access.lookups;
  if (lookups === undefined) {
    throw new Error("pipeline does not expose lookups");
  }
  const numeric = access.numeric;
  const trace = new TraceCollector();
  const selected = await access.selectLexicalLayoutHypothesis?.(tokens, { trace });
  const proto = selected?.protoLayout ?? buildProtoLayout(tokens, lookups, {
    lexicalParticleBoundaryClaims: await collectLexicalParticleBoundaryClaims(pipeline.dictionary, tokens),
    lexicalRenyouHeadClaims: await collectLexicalRenyouHeadClaims(pipeline.dictionary, tokens)
  });
  const contentMap = selected?.contentMap ?? await useActiveProtoLayout(proto, async () =>
    await access.contentPass?.(tokens, { trace }) ?? new Map<number, CommitmentSpan>()
  );
  const before = snapshotContentMap(selected?.contentPassMap ?? contentMap);
  const layout = selected?.layout ?? buildClauseLayoutFromProto(proto, tokens, contentMap, lookups);
  if (selected === undefined) commitDecisions(tokens, contentMap, { layout, trace, lookups, numeric });

  console.log(`${c.h}[5] Clause Structure / Commitment${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);

  const reanalysisRecord = resolveDeferredReanalysisProposals(pipeline.reanalysis, {
    tokens,
    contentMap,
    layout,
    lookups,
    numeric
  });
  if (reanalysisRecord !== null) {
    console.log("  deferred reanalysis:");
    for (const proposal of reanalysisRecord.proposals) {
      const blockerDesc = proposal.blockers
        .map((blocker) => `${blocker.id}=${blocker.met ? "MET" : "unmet"}(${blocker.evidenceNote})`)
        .join(", ") || "-";
      console.log(`    row=${proposal.rowId} anchor=${proposal.anchorIndex} confirmed=${proposal.confirmed}${proposal.note === undefined ? "" : ` note=${proposal.note}`}`);
      console.log(`      condition ${proposal.condition.id}=${proposal.condition.met ? "MET" : "unmet"} (${proposal.condition.evidenceNote})`);
      console.log(`      blockers ${blockerDesc}`);
    }
    console.log();
  }

  if (options.showClauseLayout) {
    console.log("  ClauseLayout:");
    for (const [clauseIdx, clause] of layout.clauses.entries()) {
      const surface = tokens.slice(clause.start, clause.end).map((token) => token.surface).join("");
      const particleDesc = clause.particlesByPredicate
        .map(([predIdx, particles]) => `${predIdx}->[${[...particles].join(", ")}]`)
        .join(", ") || "-";
      const adverbialAdjunctDesc = layout.adverbialAdjunctsByPredicate
        .filter(([predIdx]) => clause.predicates.includes(predIdx))
        .map(([predIdx, adjuncts]) => `${predIdx}<-[${[...adjuncts].join(", ")}]`)
        .join(", ");
      console.log(
        `    #${clauseIdx} [${clause.start},${clause.end}) kind=${clause.kind} term=${clause.terminatedBy} preds=[${clause.predicates.join(", ")}] particles=[${clause.particleIndices.join(", ")}] by_pred=${particleDesc}${adverbialAdjunctDesc === "" ? "" : ` adv_adjunct=${adverbialAdjunctDesc}`} parent=${clause.parentIdx ?? "None"} text=${surface}`,
      );
    }
    if (layout.compoundPredicatePairs.size > 0) {
      const pairDesc = [...layout.compoundPredicatePairs.entries()]
        .map(([tailIdx, headIdx]) => `${headIdx}+${tailIdx}`)
        .join(", ");
      console.log(`    compound_pairs(head+tail)=[${pairDesc}]`);
    }
    if (layout.renyouJunctures.size > 0) {
      const junctureDesc = [...layout.renyouJunctures.values()]
        .map((juncture) => {
          const boundary = juncture.boundary.map((evidence) => evidence.right).join("+") || "-";
          const cohesion = juncture.cohesion.map((evidence) => evidence.kind).join("+") || "-";
          return `${juncture.hostIdx}|${juncture.splitAt}:${juncture.verdict}(boundary=${boundary} cohesion=${cohesion})`;
        })
        .join(", ");
      console.log(`    renyou_junctures=[${junctureDesc}]`);
    }
    if (layout.whitespaceJunctures.size > 0) {
      const junctureDesc = [...layout.whitespaceJunctures.values()]
        .map((juncture) => {
          const boundary = juncture.boundary
            .map((evidence) =>
              evidence.kind === "boundary_event" ? `event:${evidence.event}`
                : evidence.kind === "utterance_closure_run" ? `closure:${evidence.run}`
                  : evidence.kind)
            .join("+") || "-";
          const cohesion = juncture.cohesion
            .map((evidence) => evidence.kind === "attributive_head_reach" ? `head@${evidence.headIdx}` : evidence.kind)
            .join("+") || "-";
          const license = juncture.adnominalLicense === undefined
            ? ""
            : ` license=${juncture.adnominalLicense.kind}@${juncture.adnominalLicense.headIdx}`;
          return `${juncture.gapIdx}#${juncture.runOrdinal}:${juncture.verdict}(boundary=${boundary} cohesion=${cohesion}${license})`;
        })
        .join(", ");
      console.log(`    whitespace_junctures=[${junctureDesc}]`);
    }
    if (layout.lexicalAdverbialAffiliations.size > 0) {
      const affiliationDesc = [...layout.lexicalAdverbialAffiliations.values()]
        .map((affiliation) => {
          const evidence = affiliation.evidence;
          const detail = evidence.kind === "intervening_clause_path"
            ? `source@${evidence.sourcePredicateIdx} owner@${evidence.ownerPredicateIdx} force=${evidence.force} path=${JSON.stringify(evidence.steps)}`
            : evidence.kind === "first_predicate_chain"
            ? `chain@${evidence.chainStartIdx} force=${evidence.force ?? "-"}${evidence.anchorIdx === null ? "" : `@${evidence.anchorIdx}`} via=${evidence.intervening.join("+") || "-"}`
            : evidence.kind === "no_predicate_chain"
              ? `no_chain:${evidence.stop}${evidence.stopIdx === null ? "" : `@${evidence.stopIdx}`}`
              : evidence.kind === "elliptic_request_fragment"
                ? `elliptic:${evidence.residue}@${evidence.residueStart} marker@${evidence.markerIdx} closure=${evidence.closure} target=${evidence.target}`
                : `not_adjunct:${evidence.reason}`;
          return `${affiliation.headIdx}+${affiliation.particleIdx}:${affiliation.relation}(pred=${affiliation.predicateIdx ?? "-"} ${detail})`;
        })
        .join(", ");
      console.log(`    lexical_adverbial_affiliations=[${affiliationDesc}]`);
    }
    console.log();
  }

  const rows = [...contentMap.entries()].sort(([left], [right]) => left - right);
  if (rows.length === 0) {
    console.log(`  ${c.dim}content span 없음${c.r}\n`);
    return { trace, contentMap, layout };
  }

  const predicatePos = new Set([동사, 형용사]);
  for (const [idx, span] of rows) {
    const tok = tokens[idx]!;
    const beforeSpan = before.get(idx);
    const isPredicate = predicatePos.has(span.koreanPos);
    const assigned = isPredicate ? formatAssignmentParticles(idx, layout, tokens) : "-";
    const committed = isPredicate ? formatCommittedRoles(span) : "-";
    const auxSummary = formatTraceAux(trace, idx);
    const tokenClauseIdx = layout.clauseIndexOfToken(idx);
    const clauseBadge = tokenClauseIdx >= 0
      ? `${c.dim}[c#${tokenClauseIdx}/${layout.clauses[tokenClauseIdx]?.kind ?? "?"}]${c.r} `
      : "";
    let voiceNote = "-";
    let voiceNoteClause: number | undefined;
    if (isPredicate && auxSummary !== "-" && auxSummary.includes("助動詞-レル")) {
      const predClauseIdx = layout.clauseIndexOfPredicate(idx);
      voiceNoteClause = predClauseIdx;
      const voiceOpenBefore = beforeSpan?.voice === undefined || beforeSpan.voice === null;
      if (voiceOpenBefore && span.voice === "passive") {
        const clause = layout.clauseOfPredicate(idx);
        const particleIndices = clause?.particlesOf(idx) ?? [];
        const animateNi = particleIndices.some((pIdx) => tokens[pIdx]?.surface === "に" && isAnimateReferentBeforeNi(tokens, pIdx, lookups));
        const reason = animateNi ? "animate+に" : "commitment";
        voiceNote = `보류→수동 (${reason})`;
      } else if (voiceOpenBefore) {
        voiceNote = "보류→가능";
      } else if (span.voice === "passive") {
        voiceNote = "수동(초기 확정)";
      } else {
        voiceNote = "가능";
      }
    }
    console.log(
      `  ${c.k}${String(idx).padStart(2)}${c.r}  ${clauseBadge}${c.v}${tok.surface.padEnd(10)}${c.r} dict=${tok.dictionaryForm} ${c.dim}[${beforeSpan?.renderPlanSummary ?? "-"} → ${summarizeRenderPlan(span.renderPlan)}]${c.r}`,
    );
    console.log(`      entry=${formatTraceEntryLabel(trace, idx)}  rule=${formatTraceRuleLabel(trace, idx)}`);
    if (options.verbose) printTraceRuleAttempts(trace, idx, c);
    if (options.verbose) printTailChainObservability(trace, idx, c);
    if (options.verbose) printCommittedHeadEvidenceDecision(span, c, lookups, numeric);
    const voiceExtract = formatTraceVoiceExtract(trace, idx);
    if (auxSummary !== "-" || voiceExtract !== "-") {
      console.log(`      aux=${auxSummary}  voice_extract=${voiceExtract}`);
    }
    console.log(`      plan=${describeRenderPlan(span.renderPlan)}`);
    for (const sourceLine of await collectPlanSourceLines(span.renderPlan, pipeline, span.entry)) {
      console.log(`      source.${sourceLine}`);
    }
    if (isPredicate || options.verbose) {
      printSpanCandidates(span, trace, idx, lookups, { verbose: options.verbose });
    }
    if (!isPredicate) continue;

    const predClauseIdx = layout.clauseIndexOfPredicate(idx);
    const passiveMode = formatPassiveRuntimeMode(span);
    console.log(
      `      voice=${voiceLabel(beforeSpan?.voice)}→${voiceLabel(span.voice)}  passive_class=${beforeSpan?.passiveClass ?? "-"}→${span.passiveClass ?? "-"}${passiveMode === "-" ? "" : `  passive_mode=${passiveMode}`}  assigned=${assigned}  committed=${committed}${clauseTag(predClauseIdx)}`,
    );
    printCommitmentEvent(trace, idx, "passive_class");
    printBorrowArguments(idx, layout, tokens, lookups);
    printCommitmentEvent(trace, idx, "frame_evidence_selection");
    printCommitmentEvent(trace, idx, "semantic_frame_shadow");
    printCommitmentEvent(trace, idx, "role_case_shadow");
    printCommitmentEvent(trace, idx, "causative_neutral_trigger_candidate");
    printSlotRealizationEffects(trace, idx);
    const beforeFallbacks = beforeSpan !== undefined && beforeSpan.fallbacks.length > 0 ? beforeSpan.fallbacks.join(",") : "-";
    const afterFallbacks = findPlanFallbacks(span.renderPlan);
    console.log(`      fallback=${beforeFallbacks}→${afterFallbacks.length > 0 ? afterFallbacks.join(",") : "-"}  detail=${formatFallbacks(span.renderPlan, c)}`);
    if (voiceNote !== "-") {
      console.log(`      voice=${voiceNote}${clauseTag(voiceNoteClause)}`);
    }
    for (const row of formatParticleResolution(idx, span, layout, tokens)) {
      console.log(`      particle=${row}`);
    }
    if (options.verbose) {
      const commitmentEvents = trace.commitmentEvents(idx);
      if (commitmentEvents.length > 0) {
        console.log("      commitment_trace:");
        for (const event of commitmentEvents) {
          console.log(`        ${formatCommitmentTrace(event)}`);
        }
      }
    }
  }
  console.log();
  return { trace, contentMap, layout };
}

async function diagnoseOne(
  pipeline: TranslationPipeline,
  text: string,
  c: ColorTable,
  formalPipeline: TranslationPipeline | null,
  options: { showUnits: boolean; verbose: boolean; showClauseLayout: boolean },
): Promise<void> {
  const diagnosticInput = diagnosticInputForText(text);
  const analysisText = diagnosticInput.analysisText;
  console.log(`\n${c.h}${"=".repeat(64)}`);
  console.log(` 입력: ${text}`);
  if (diagnosticInput.transformed) {
    console.log(` 분석 입력: ${analysisText}`);
  }
  console.log(`${"=".repeat(64)}${c.r}\n`);

  if (diagnosticInput.transformed) {
    console.log(`${c.h}[0] 입력 transform${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    console.log(`  original: ${c.v}${diagnosticInput.originalText}${c.r}`);
    console.log(`  analysis: ${c.ko}${analysisText}${c.r}`);
    const annotationSummary = diagnosticInput.annotations.length === 0
      ? "-"
      : diagnosticInput.annotations.map(({ key, kind }) => `${key}:${kind}`).join(", ");
    console.log(`  annotations: ${c.dim}${annotationSummary}${c.r}`);
    console.log();
  }

  const pipelineAccess = diagnosticsAccess(pipeline);
  const lookups = pipelineAccess.lookups;
  if (lookups === undefined) {
    throw new Error("pipeline does not expose lookups");
  }
  const numeric = pipelineAccess.numeric;

  const rawTokens = pipelineAccess.analyze?.(analysisText) ?? pipeline.tokenize(analysisText);
  console.log(`${c.h}[1] 형태소 분석 (Sudachi C단위)${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  printTokenLines(rawTokens, c);
  console.log();

  const preprocessedTokens = pipeline.tokenize(analysisText);
  if (!tokensEqual(preprocessedTokens, rawTokens)) {
    console.log(`${c.h}[2] 전처리 (촉음 정규화)${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(preprocessedTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[2] 전처리: 변경 없음${c.r}\n`);
  }

  const chainMergedTokens = pipelineAccess.mergeKatakanaNameChains?.(preprocessedTokens) ?? preprocessedTokens;
  if (!tokensEqual(chainMergedTokens, preprocessedTokens)) {
    console.log(`${c.h}[3.2] 카타카나 체인 병합${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(chainMergedTokens, c);
    for (const tok of chainMergedTokens) {
      const segments = tok.chainSegments;
      if (segments === undefined || segments.length === 0) continue;
      console.log(`      ${c.dim}chain segments:${c.r}`);
      for (const segment of segments) {
        if (segment.kind === "kata") {
          console.log(`        · kata[${segment.reading}]`);
        } else if (segment.kind === "consume") {
          console.log(`        · ${c.dim}consume[${segment.text} → 공백]${c.r}`);
        } else {
          console.log(`        · ${c.warn}preserve[${segment.text}]${c.r}`);
        }
      }
    }
    console.log();
  } else {
    console.log(`${c.dim}[3.2] 카타카나 체인 병합: 변경 없음${c.r}\n`);
  }

  const numericTokens = pipelineAccess.expandNumericSplits?.(chainMergedTokens) ?? chainMergedTokens;
  if (!tokensEqual(numericTokens, chainMergedTokens)) {
    console.log(`${c.h}[3] 수사 split (numeric)${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(numericTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[3] 수사 split: 변경 없음${c.r}\n`);
  }

  const functionalSplitTokens = pipelineAccess.recoverOovFunctionalSplits === undefined
    ? numericTokens
    : await pipelineAccess.recoverOovFunctionalSplits(numericTokens);
  if (!tokensEqual(functionalSplitTokens, numericTokens)) {
    console.log(`${c.h}[3.4] OOV functional split recovery${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(functionalSplitTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[3.4] OOV functional split recovery: 변경 없음${c.r}\n`);
  }

  const collocationTokens = pipelineAccess.preprocessCollocations?.(functionalSplitTokens) ?? functionalSplitTokens;
  if (!tokensEqual(collocationTokens, functionalSplitTokens)) {
    console.log(`${c.h}[3.5] 연어 전처리 (collocation)${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(collocationTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[3.5] 연어 전처리: 변경 없음${c.r}\n`);
  }

  const copulaDeRetagTokens = retagKeijoujiCopulaRenyou(collocationTokens);
  if (!tokensEqual(copulaDeRetagTokens, collocationTokens)) {
    console.log(`${c.h}[3.52] 계사 で・に 재태깅 (순수 形状詞 host)${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(copulaDeRetagTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[3.52] 계사 で・に 재태깅: 변경 없음${c.r}\n`);
  }

  const proposedTokens = pipelineAccess.proposeDeferredReanalysis?.([...copulaDeRetagTokens]) ?? copulaDeRetagTokens;
  const proposalLines: string[] = [];
  for (const [index, token] of proposedTokens.entries()) {
    for (const proposal of token.reanalysisProposals ?? []) {
      proposalLines.push(
        `   ${index}  ${token.surface}  row=${proposal.rowId}  span=[${index},${index + proposal.consumed})  condition=${proposal.conditionId}  blockers=[${proposal.blockerIds.join(", ")}]`
      );
    }
  }
  if (proposalLines.length > 0) {
    console.log(`${c.h}[3.55] deferred reanalysis 후보 (propose carrier)${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    for (const line of proposalLines) {
      console.log(line);
    }
    console.log();
  } else {
    console.log(`${c.dim}[3.55] deferred reanalysis 후보: 없음${c.r}\n`);
  }

  await printCompoundVerbDiagnostics(pipeline, proposedTokens, c, "[3.6] 복합동사 후보 (OOV split 전)");

  const oovSplitTokens = pipelineAccess.expandOovSplits === undefined
    ? await pipeline.applyPreprocessChain(preprocessedTokens)
    : await pipelineAccess.expandOovSplits(proposedTokens);
  if (!tokensEqual(oovSplitTokens, proposedTokens)) {
    console.log(`${c.h}[3.7] OOV split 전개${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    printTokenLines(oovSplitTokens, c);
    console.log();
  } else {
    console.log(`${c.dim}[3.7] OOV split 전개: 변경 없음${c.r}\n`);
  }
  const processedTokens = attachMoraStutterPrefixes(oovSplitTokens);

  await printCompoundVerbDiagnostics(pipeline, processedTokens, c, "[3.8] 복합동사 후보 (runtime token stream)");

  const chainTokens = await pipeline.applyPreprocessChain(preprocessedTokens);
  if (!tokensEqual(processedTokens, chainTokens)) {
    console.log(
      `${c.warn}WARNING: 단계별 진단 결과가 runtime preprocess chain과 다릅니다. 이 입력은 translate()/preprocessTokens() 결과를 우선 확인하세요.${c.r}\n`,
    );
  }

  const prepared = await pipeline.prepareTranslation(text);
  const ownerTokens = prepared.tokens;
  const parentheticalIslands = prepared.parentheticalIslands ?? [];
  if (parentheticalIslands.length > 0 || !tokensEqual(ownerTokens, processedTokens)) {
    console.log(`${c.h}[3.9] prepared owner token stream${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    if (parentheticalIslands.length > 0) {
      for (const island of parentheticalIslands) {
        const innerSurface = island.innerPrepared.tokens.map((token) => token.surface).join("");
        console.log(
          `  ${c.dim}${island.id}: source=[${island.sourceSpan.startOrdinal},${island.sourceSpan.endOrdinal}) boundary=${JSON.stringify(island.sourceBoundary)} inner=${innerSurface}${c.r}`,
        );
      }
      console.log();
    }
    printTokenLines(ownerTokens, c);
    console.log();
  }

  console.log(`${c.h}[4] 사전 조회${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  for (let i = 0; i < ownerTokens.length; i++) {
    const tok = ownerTokens[i]!;
    const surface = tok.surface.padEnd(10);
    const pos0 = POS0_NAME[tok.pos & POS0] ?? "";
    if (isNonLexicalSymbolToken(tok)) {
      console.log(`  ${c.k}${String(i).padStart(2)}${c.r}  ${c.dim}${surface}  (${pos0}) — 비어휘 기호, 조회 생략${c.r}`);
      continue;
    }
    if (!CONTENT_LOOKUP_POS0.has(pos0)) {
      console.log(`  ${c.k}${String(i).padStart(2)}${c.r}  ${c.dim}${surface}  (${pos0}) — 기능어, 조회 생략${c.r}`);
      continue;
    }
    const entry = await pipeline.dictionary.lookupTokenRelaxed(tok);
    if (entry === undefined) {
      let headerResolution: string | null | undefined = null;
      if (NONPREDICATE_CONTENT_POS.has(pos0)) {
        headerResolution = await resolveSplitFallback(pipelineAccess, tok);
      }
      if (headerResolution === null || headerResolution === undefined) {
        const nextToken = ownerTokens[i + 1] ?? null;
        const synthetic = await resolveSyntheticEntry(pipelineAccess, tok, nextToken);
        headerResolution = synthetic?.senses?.[0]?.korean ?? tok.surface;
      }
      console.log(
        `  ${c.k}${String(i).padStart(2)}${c.r}  ${c.v}${surface}${c.r}  → ${c.warn}미등록${c.r} → ${c.ko}${headerResolution}${c.r}`,
      );
      const nextToken = ownerTokens[i + 1] ?? null;
      const splitFallbackUsed = await printOovDiagnosis(pipeline, tok, c, nextToken);

      if (!splitFallbackUsed && (tok.splitB !== undefined || tok.splitA !== undefined)) {
        for (const [subtokens, label] of [[tok.splitB, "B"], [tok.splitA, "A"]] as const) {
          if (subtokens === undefined) continue;
          for (const sub of subtokens) {
            const subEntry = await pipeline.dictionary.lookupTokenRelaxed(sub);
            if (subEntry !== undefined) {
              const subKorean = subEntry.senses?.[0]?.korean ?? "?";
              console.log(`      ${c.dim}  └ ${label}: ${sub.surface} → ${c.ko}${subKorean}${c.r}`);
            } else {
              console.log(`      ${c.dim}  └ ${label}: ${sub.surface} → 미등록${c.r}`);
            }
          }
        }
      }
      continue;
    }
    const senses = [...entry.senses ?? []];
    let selectedTranslation: ResolvedTranslationView | undefined;
    if (senses.length > 1) {
      try {
        selectedTranslation = resolveContext(entry, ownerTokens, i, { lookups, numeric }).senses?.[0];
      } catch {
        selectedTranslation = senses[0];
      }
    } else {
      selectedTranslation = senses[0];
    }
    const results = await pipeline.dictionary.translateToken(tok);
    const koreanParts = results.map(([korean]) => korean);
    const korean = selectedTranslation?.korean ?? koreanParts.join(" ") ?? "?";
    const extras: string[] = [];
    const irreg = selectedTranslation?.irregular ?? null;
    if (irreg) extras.push(`불규칙=${irreg}`);
    const matchReason = entry.matchReason;
    if (matchReason) {
      const amb = entry.ambiguousCount ?? 0;
      const reason = amb > 0 ? `${matchReason}, 후보${amb + 1}` : matchReason;
      extras.push(`match=${reason}`);
    }
    const extraStr = extras.length > 0 ? `  ${c.dim}(${extras.join(", ")})${c.r}` : "";
    console.log(`  ${c.k}${String(i).padStart(2)}${c.r}  ${c.v}${surface}${c.r}  → ${c.ko}${korean}${c.r}${extraStr}`);
    if (senses.length > 1) {
      console.log(`      ${c.dim}options:${c.r}`);
      let markerShown = false;
      for (const translation of senses) {
        const marker = !markerShown && translation === selectedTranslation ? "*" : "-";
        if (marker === "*") markerShown = true;
        console.log(`        ${marker} ${formatTranslationOption(translation)}`);
      }
    }
  }
  console.log();

  const rareruRows: { idx: number; tok: RuntimeHaruToken; result: RareruResult }[] = [];
  for (let i = 0; i < ownerTokens.length; i++) {
    const tok = ownerTokens[i]!;
    if ((tok.pos & POS0) !== 動詞) continue;
    const res = describeRareru(ownerTokens, i, ownerTokens.length, lookups);
    if (res === null) continue;
    rareruRows.push({ idx: i, tok, result: res });
  }
  if (rareruRows.length > 0) {
    console.log(`${c.h}[4.5] られる/れる 1차 분류${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    for (const { idx, tok, result } of rareruRows) {
      const vcolor = result.verdict === "가능" || result.verdict === "보류" ? c.ko : c.warn;
      const reruStr = result.reruSurfaces.join("+");
      console.log(
        `  ${c.k}${String(idx).padStart(2)}${c.r}  ${c.v}${tok.surface.padEnd(10)}${c.r} +${c.dim}${reruStr}${c.r}  → ${vcolor}${result.verdict}${c.r}  ${c.dim}(${result.reason})${c.r}`,
      );
    }
    console.log();
  }

  const commitmentState = await printCommitmentDiagnostics(pipeline, ownerTokens, c, {
    verbose: options.verbose,
    showClauseLayout: options.showClauseLayout,
  });
  await printNominalLightVerbDiagnostics(ownerTokens, commitmentState, c, lookups);

  console.log(`${c.h}[6] 패턴 매칭${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  let hasPattern = false;
  for (let i = 0; i < ownerTokens.length; i++) {
    const pv = pipeline.patterns.matchPostVerb(ownerTokens, i);
    if (pv) {
      hasPattern = true;
      const id = pv.id;
      const outputMode = pv.outputMode;
      console.log(`  ${c.k}${String(i).padStart(2)}${c.r}  post_verb: ${c.ko}${id}${c.r}  ${c.dim}(${outputMode})${c.r}`);
    }
    const auxBefore = collectAuxBefore(ownerTokens, i);
    const pa = pipeline.patterns.matchPostAux(ownerTokens, i, auxBefore);
    if (pa) {
      hasPattern = true;
      const id = pa.id;
      const outputMode = pa.outputMode;
      console.log(`  ${c.k}${String(i).padStart(2)}${c.r}  post_aux:  ${c.ko}${id}${c.r}  ${c.dim}(${outputMode})${c.r}`);
    }
  }
  if (!hasPattern) console.log(`  ${c.dim}매칭된 패턴 없음${c.r}`);
  console.log();

  const [resultC, units] = await pipeline.translateWithUnits(text);
  const warningsC = (await pipeline.translateWithWarnings(text)).warnings;
  const formalWithWarnings = formalPipeline ? await formalPipeline.translateWithWarnings(text) : undefined;
  const resultF = formalWithWarnings?.text ?? resultC;
  console.log(`${c.h}[7] 번역 결과${c.r}`);
  console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
  console.log(`  ${c.v}${text}${c.r}`);
  console.log(`  ${c.ko}casual  ${resultC}${c.r}`);
  console.log(`  ${c.ko}formal  ${resultF}${c.r}`);
  for (const [register, warnings] of [["casual", warningsC], ["formal", formalWithWarnings?.warnings ?? []]] as const) {
    for (const warning of warnings) {
      console.log(`  ${c.warn}${register}  ${formatTranslationWarning(text, warning)}${c.r}`);
    }
  }
  console.log();

  printExceptionSummary(units, c);
  printAffixAndFunctionalUnits(units, c);

  if (options.showUnits) {
    console.log(`${c.h}[8] TranslationUnit dump${c.r}`);
    console.log(`${c.sep}${"─".repeat(64)}${c.r}`);
    for (let idx = 0; idx < units.length; idx++) {
      const unit = units[idx]!;
      const planSummary = summarizeRenderPlan(unit.renderPlan);
      const fallbacks = formatFallbacks(unit.renderPlan, c);
      console.log(`  ${c.k}${String(idx).padStart(2)}${c.r}  ${c.v}${formatTranslationUnitRepr(unit)}${c.r}`);
      console.log(
        `      plan=${planSummary}  fallback=${fallbacks}  attach_left=${pyBool(unit.attachLeft)} attach_right=${pyBool(unit.attachRight)}`,
      );
    }
    console.log();
  }
}

function collectAuxBefore(tokens: readonly RuntimeHaruToken[], pos: number): RuntimeHaruToken[] {
  const aux: RuntimeHaruToken[] = [];
  let j = pos - 1;
  while (j >= 0 && (tokens[j]!.pos & POS0) === 助動詞) {
    aux.push(tokens[j]!);
    j -= 1;
  }
  aux.reverse();
  return aux;
}

const HELP_TEXT = `문장 번역 진단 도구.

사용법:
    harumt-diagnose "田中さん、今日は寒すぎるわ"
    harumt-diagnose "食べている" "行きました"
    harumt-diagnose --no-color "食べます"
    harumt-diagnose --verbose "先生に食べられる。"
    harumt-diagnose --units "本を読む。"
    harumt-diagnose --no-clause-layout "先生に褒められて、泣いた。"

옵션:
    --no-color              색상 출력 비활성화
    --units                 [8] TranslationUnit dump 섹션 추가 출력
    --verbose               rule attempt / commitment trace 상세 출력
    --no-clause-layout      [5] ClauseLayout 덤프 섹션만 숨김
                            (각 행의 [c#N] 뱃지와 via c#N 태그는 계속 출력)
    --system-dict <path>    시스템 사전(.hrdic) 경로 (기본: <data-dir>/dict/system.hrdic)
    --data-dir <dir>        데이터 디렉터리 (기본: 패키지의 data/)
`;

export async function main(rawArgs: readonly string[]): Promise<number> {
  const args = [...rawArgs];
  let c = COLOR;
  let showUnits = false;
  let verbose = false;
  let showClauseLayout = true;
  const paths: { dataDir?: string; systemDictPath?: string } = {};

  const filtered: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--data-dir" || a === "--system-dict") {
      const value = args[++i];
      if (value === undefined) {
        stderr.write(`${a} 에 경로가 필요합니다.\n`);
        return 2;
      }
      if (a === "--data-dir") paths.dataDir = value;
      else paths.systemDictPath = value;
    } else if (a === "--no-color") {
      c = NO_COLOR;
    } else if (a === "--units") {
      showUnits = true;
    } else if (a === "--no-clause-layout") {
      showClauseLayout = false;
    } else if (a === "--clauses") {
    } else if (a === "--verbose") {
      verbose = true;
    } else {
      filtered.push(a);
    }
  }

  if (filtered.length === 0 || filtered.includes("--help") || filtered.includes("-h")) {
    console.log(HELP_TEXT);
    return 0;
  }

  const unrecognizedOptions = filtered.filter((a) => a.startsWith("--"));
  if (unrecognizedOptions.length > 0) {
    stderr.write(`알 수 없는 옵션: ${unrecognizedOptions.join(", ")}\n`);
    stderr.write("사용 가능한 옵션은 --help 로 확인하세요.\n");
    return 2;
  }

  const pipeline = await createTranslationPipeline({ ...paths, readingFallbackRule: "common" });
  const formalPipeline = await createTranslationPipeline({ ...paths, readingFallbackRule: "common", register: "formal" });

  for (const text of filtered) {
    await diagnoseOne(pipeline, text, c, formalPipeline, { showUnits, verbose, showClauseLayout });
  }
  return 0;
}

import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  candidateSetCandidates,
  commitmentLaneCandidateSet,
  isResolvedCandidateSet
} from "../pipeline/source-candidate-set.js";

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  exit(await main(argv.slice(2)));
}
