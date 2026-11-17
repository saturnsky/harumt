import { TokenCursor } from "./token-cursor.js";
import { legacySurfaceCompositionPlan } from "../types/render-plan.js";
import { derivationForSense } from "../dictionary/derivation.js";
import {
  candidateObservabilityTraceValue,
  fallbackPriorityGroup,
  slotEvidenceObservabilityTraceValue
} from "./candidate-observability.js";
import { type DataLoader } from "../data-loader.js";
import type { MorphemeSense } from "../types/dictionary.js";
import type { DekiruReading, NareruReading, RareruReading, RuleTraceDetailValue, TranslationCandidate } from "../types/pipeline.js";
import type { LemmaRealization, RenderPlan, Voice } from "../types/render-plan.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { Warning } from "../types/warning.js";
import { ContentCtx, ContentPhaseState, type ContentResult, ContentTerminalCtx, PhaseStep, ResolvedContentResult, RuleResult, StagedContentResult, TranslationCandidate as ContentTranslationCandidate } from "./content-types.js";
import {
  isStagedSourceDomain,
  resolveContext,
  translationFrameAlternativeMatchesWithoutLayout,
  senseSourceFrameMatch,
  type ContextContentMap
} from "./context.js";
import { TraceEvent, type TraceCollector, type TraceDetailValue } from "./trace.js";
import { conjugate, isKnownEnding } from "../generator/conjugator.js";
import { extractFeatures as auxExtractFeatures, rashiiAttributive } from "../generator/aux-map.js";
import { JP_POS_TO_KR_NUM, NONPREDICATE_CONTENT_POS_BITS, isNonLexicalSymbolTokenAt } from "./fallback/index.js";
import { bareStemLexicalMentionSpanAt, bareStemNominalUseHostClass, candidateHasStemRootNominalProjection, candidateProjectionSource, isBareStemNominalUseHostToken, mixedPosSlot, nominalizedNounProjectionAllowedForSlot, normalizeCandidateConditions, pruneCandidatesBySlotOrder, stemRootNominalProjectionAllowedForSlot, translationCandidateProjectionOrdinals, verbalNominalMProjectionAllowedForSlot, type CandidateGrammar } from "./candidate-runtime.js";
import { buildSyntheticAux, isPotentialDerivation, type PatternRuntimeToken } from "./pattern-runtime.js";
import { firstTranslationCandidate, iterTranslationCandidates } from "./candidate-runtime.js";
import { auxHasNegation, auxHasPast, auxHasPolite, collectAuxTokens, isAdjNai, isVerbLemma, runtimeAuxTokens, runtimeTokens, type AuxTokens } from "./matchers.js";
import { matchCopulaNegation } from "./rules/copula.js";
import type { LookupTables } from "./lookup-tables.js";
import { activeProtoLayout } from "./clause-layout/proto-state.js";
import { detectSfpWithNode } from "./semantics/grammar-runtime.js";
import { findDekiruReferent } from "./semantics/dekiru.js";
import { getReferentTokenBeforeParticle, isPlaceNoun, isQuotativeToTokens } from "./semantics/helpers.js";
import { isAdverbial } from "./predicate-helpers.js";
import { PRE_ENTRY_RULES, type PreEntryResolver } from "./rules/pre-entry.js";
import { buildUnsupportedPostAuxWarning, matchRemovedPostAuxPattern, type RemovedPostAuxUnsupportedMatch } from "./rules/postaux-unsupported.js";
import { CONNECTIVE_RENDER_MAP } from "./head-tail/tail/predicate-root/connective-render-table.js";
import { hasActiveSahenLightVerbProjection } from "./head-tail/tail/predicate-root/sahen-light-verb-evidence.js";
import { ENTRY_AUX_RULES } from "./rules/entry-aux.js";
import {
  contentRuleResultFromLike,
  type ContentResolverRuleAdapterBridge,
  entryAuxResolverAdapter,
  modalityResolverAdapter,
  tailResolverAdapter
} from "./content-resolver/rule-adapters.js";
import { auxTokensArray, normalizeContentPostAuxPattern } from "./content-resolver/adapter-helpers.js";
import { buildReportingPlan, composePredicateWithSuffix, composePrefixWithPredicate, contentQuestionOrPeriodAt } from "./content-resolver/runtime-helpers.js";
import { sahenInfoFromRuntime, stateAdjectiveNegativeRenderPlan } from "./content-resolver/postaux-pattern-rendering.js";
import { resolveSpecialContentPhase } from "./content-resolver/special-content-phase.js";
import {
  candidateDedupeKey,
  candidateGrammarTraceDetail,
  contentCandidateDerivationOrderIndex,
  contentCandidatePriorityGroup,
  contentTranslationCandidateFrom,
  firstMatchPriorityGroupIndex,
  entryHasDeferredFrameConditionCandidates,
  hasBenefactiveTail,
  hasRequestTail,
  lexicalParticleAdverbialVariantFromCandidate,
  nominalizedNounProjectionVariantFromCandidate,
  stemRootNominalProjectionVariantFromCandidate,
  verbalNominalMProjectionVariantFromCandidate,
  translationHasDeferredFrameConditions,
  translationHasSourceFrameConditions,
  translationNeedsFinalClauseLayoutForSourceMatch
} from "./content-resolver/candidate-ordering.js";
import {
  candidateSetSharedConsumed,
  createSourceCandidateSet,
  frameSourceConditionMatchOf,
  isResolvedCandidateSet,
  resolveSourceCandidateSet,
  resolvedWinner,
  resolvedWinnerConsumed,
  stagedCandidate,
  type SourceCandidateSet,
  type StagedCandidate
} from "./source-candidate-set.js";
import type { ContentResolverEntry, ContentResolverEntryAuxResolver, ContentResolverRuntimeAccess, ContentResolverTranslation, RuleChainResultLike, RuleResultLike, TranslationAffixSource } from "./content-resolver/types.js";
import {
  isNormalFunctionalChain,
  splitFunctionalAuxChunks
} from "./rendering/functional-chain.js";
import {
  createStemCandidateProjectionOrdinalAllocator,
  stemCandidateProvenanceForTranslation,
  translationCandidateIdentity
} from "./head-tail/tail/predicate-root/stem-candidate-identity.js";
import { resolveTailDefault, ruleKeijoujiBare, ruleSentencefinalNaAttributive } from "./rules/tail-finalization.js";
import { sourceVerbalPredicateVerdictForPurposeMotion } from "./rules/tail-nominalization.js";
import { ruleCauseHeadMoAru } from "./rules/tail-ka.js";
import type { TailResolver, TailRule, TailTerminalRule } from "./rules/tail-types.js";
import { replaceLemmaRenderPlan } from "./rendering/render-plan.js";
import { metadataIrregular, metadataKoreanPos } from "./translation/metadata.js";
import { detectNoda, detectSfp, isYouToken } from "./semantics/grammar-runtime.js";
import { isKanaQuestionNaParticleSurface } from "./semantics/sfp-surface.js";
import { detectNaitoBridge, matchObligationTail } from "./semantics/colloquial-obligation.js";
import { resolveYouda } from "./semantics/youda.js";
import { matchSouDaHearsay } from "./semantics/souda.js";
import { caseParticleMarkerRelationForToken, copulaNiMarkerRelationForToken, kaMarkerRelationAt } from "./head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "./head-tail/boundary/quote-marker.js";
import { predicateStemRoot } from "../generator/conjugator.js";

import { POS0, POS1, POS4, POS5, POS5A, isLexicalAdverb, isNaAdjCapableNoun, is五段, pos0in, posToString, サ行変格, 意志推量形_, 仮定形_, 形状詞, 形容詞0, 終助詞, 助詞, 助動詞, 助動詞語幹, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 動詞, 補助記号, 名詞, 대명사, 동사, 명사, 부사, 수사, 형용사, 기호 } from "../types/pos.js";
import { teDeContinuationRelationAt } from "./head-tail/tail/postverb-tail-classifier.js";

export async function initContentResolver(_loader: DataLoader): Promise<void> {
}

const ENTRY_TAIL_PRE_SFP_RULES = [
  ["rule_cause_head_mo_aru", ruleCauseHeadMoAru as TailRule]
] as const satisfies readonly (readonly [pythonName: string, rule: TailRule])[];

const ENTRY_TAIL_POST_SFP_RULES = [
  ["rule_sentencefinal_na_attributive", ruleSentencefinalNaAttributive],
  ["rule_keijouji_bare", ruleKeijoujiBare]
] as const satisfies readonly (readonly [pythonName: string, rule: TailTerminalRule])[];

const PASS2_NEG_QUESTION_RULE_NAME = "_pass_2_neg_question_rule";
const PASS2_POLITE_QUESTION_RULE_NAME = "_pass_2_polite_question_rule";
const RESOLVE_TAIL_DEFAULT_RULE_NAME = "resolve_tail_default";
const UNSUPPORTED_POST_AUX_REMOVED_RULE_NAME = "unsupported_post_aux_removed";

const PRE_ENTRY_PHASE_RULES = PRE_ENTRY_RULES.map((rule) => [pythonRuleName(rule.name), rule] as const);
const ENTRY_AUX_PHASE_RULES = ENTRY_AUX_RULES.map((rule) => [pythonRuleName(rule.name), rule] as const);

function translationEligibleForLocalVoice(
  translation: ContentResolverTranslation,
  grammar: CandidateGrammar
): boolean {
  if (translation.dropFirstPassiveAux !== true) {
    return true;
  }
  return grammar.voice === null || grammar.voice === "passive";
}

function candidateTracePriorityInGroup(candidate: TranslationCandidate): number {
  const value = candidate.translation.priorityInGroup;
  return typeof value === "number" && Number.isInteger(value) ? value : candidate.priority ?? 0;
}

function candidateTraceSenseIndex(candidate: TranslationCandidate): number | null {
  const value = candidate.translation.senseIndex;
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function contentCandidateTraceValue(
  candidate: TranslationCandidate,
  match: string,
  fallbackGroup: number | null
): TraceDetailValue {
  const priorityGroup = contentCandidatePriorityGroup(candidate);
  const lexicalParticleAdverbial = candidate.lexicalParticleAdverbial;
  const nominalized = candidate.translation.nominalized;
  return candidateObservabilityTraceValue({
    lemma: candidate.koreanLemma,
    koreanPos: candidate.koreanPos,
    koreanPosName: posToString(candidate.koreanPos),
    priorityGroup,
    priorityInGroup: candidateTracePriorityInGroup(candidate),
    fallbackGroup: fallbackGroup !== null && priorityGroup === fallbackGroup,
    senseIndex: candidateTraceSenseIndex(candidate),
    projectionOrdinal: candidate.projectionOrdinal,
    projectionOrdinalSource: "runtime_candidate",
    match,
    derivation: candidate.derivation?.id ?? derivationForSense(candidate.translation, candidate.entry).id,
    projectionSource: candidateProjectionSource(candidate),
    renderPlanKind: candidate.renderPlan?.kind ?? null,
    nominalized: candidateHasStemRootNominalProjection(candidate) ? null : nominalized ?? null
  });
}

function candidateFallbackGroup(candidates: readonly TranslationCandidate[]): number | null {
  return fallbackPriorityGroup(candidates, contentCandidatePriorityGroup);
}

function bareStemNominalUseAdmitsCandidatePath(
  cursor: TokenCursor<RuntimeHaruToken>,
  token: RuntimeHaruToken,
  entry: ContentResolverEntry,
  lookups: LookupTables
): boolean {
  if (!isBareStemNominalUseHostToken(token)) {
    return false;
  }
  const senses = entry.senses ?? [];
  const hasStemRootRealizableSense = senses.some((sense) =>
    (sense.koreanPos ?? 명사) === 형용사 && predicateStemRoot(sense.korean ?? "") !== null
  );
  const hasVerbalNominalizableSense = senses.some((sense) =>
    (sense.koreanPos ?? 명사) === 동사 && (sense.korean ?? "").endsWith("다")
  );
  if (!hasStemRootRealizableSense && !hasVerbalNominalizableSense) {
    return false;
  }
  const auxCursor = cursor.fork();
  const auxTokens = collectAuxTokens(auxCursor);
  if (auxTokens.length > 0) {
    return false;
  }
  const slot = auxCursor.lookahead(cursor.origin - auxCursor.pos, (slotCursor) =>
    PipelineContentResolverMixin.mixedPosSlot(slotCursor, auxTokens, lookups)
  );
  if (bareStemNominalUseHostClass(token, slot) === null) {
    return false;
  }
  if (
    hasStemRootRealizableSense &&
    stemRootNominalProjectionAllowedForSlot(slot, {
      lexicalMentionSpan: bareStemLexicalMentionSpanAt(cursor.tokens, cursor.origin)
    })
  ) {
    return true;
  }
  return hasVerbalNominalizableSense && verbalNominalMProjectionAllowedForSlot(slot);
}

export class PipelineContentResolverMixin {
  static translationAffixSource(token: PatternRuntimeToken, entry: ContentResolverEntry, text: string, options: { readonly note: string }): TranslationAffixSource {
    const candidate = firstTranslationCandidate(entry);
    const translation = candidate?.translation;
    return {
      kind: "dictionary",
      text,
      jpSurface: token.surface,
      jpDictionaryForm: token.dictionaryForm,
      ...(translation?.koreanPos === undefined ? {} : { koreanPos: translation.koreanPos }),
      ...(entry.matchReason === undefined ? {} : { matchReason: entry.matchReason }),
      note: options.note
    };
  }

  wrapTranslationAffixes(renderPlan: RenderPlan, translation: Pick<MorphemeSense, "koreanPrefix" | "koreanSuffix" | "koreanPos">, entry: ContentResolverEntry, token: PatternRuntimeToken): RenderPlan {
    const prefix = translation.koreanPrefix;
    const suffix = translation.koreanSuffix;
    if ((prefix === undefined || prefix.length === 0) && (suffix === undefined || suffix.length === 0)) {
      return renderPlan;
    }
    const koreanPos = translation.koreanPos ?? metadataKoreanPos(entry, undefined, { default: 명사 });
    let plan = renderPlan;
    if (prefix !== undefined && prefix.length > 0) {
      plan = legacySurfaceCompositionPlan("content_resolver", {
        korean: "",
        koreanPos,
        prefix,
        prefixSource: PipelineContentResolverMixin.translationAffixSource(token, entry, prefix, { note: "translation_korean_prefix" }),
        suffix: plan,
        rewritePrefixOnLemmaReplace: false,
        rewriteSuffixOnLemmaReplace: true,
        rewritePrefixOnConnectiveReplace: false,
        rewriteSuffixOnConnectiveReplace: true
      });
    }
    if (suffix !== undefined && suffix.length > 0) {
      plan = legacySurfaceCompositionPlan("content_resolver", {
        korean: "",
        koreanPos,
        prefix: plan,
        suffix,
        suffixSource: PipelineContentResolverMixin.translationAffixSource(token, entry, suffix, { note: "translation_korean_suffix" }),
        rewritePrefixOnLemmaReplace: true,
        rewriteSuffixOnLemmaReplace: false,
        rewritePrefixOnConnectiveReplace: true,
        rewriteSuffixOnConnectiveReplace: false
      });
    }
    return plan;
  }

  static wrapTranslationAffixSurface(base: string, translation: Pick<MorphemeSense, "koreanPrefix" | "koreanSuffix">): string {
    return `${translation.koreanPrefix ?? ""}${base}${translation.koreanSuffix ?? ""}`;
  }

  applyTranslationAffixes(
    phaseResult: { readonly rawSourceSurface?: true | undefined },
    renderPlan: RenderPlan | null,
    korean: string,
    translation: Pick<MorphemeSense, "koreanPrefix" | "koreanSuffix" | "koreanPos">,
    entry: ContentResolverEntry,
    token: PatternRuntimeToken,
    fixedTextKoreanPos: number
  ): { readonly renderPlan: RenderPlan | null; readonly korean: string } {
    if (
      phaseResult.rawSourceSurface === true ||
      (translation.koreanPrefix === undefined && translation.koreanSuffix === undefined)
    ) {
      return { renderPlan, korean };
    }
    if (renderPlan !== null) {
      return {
        renderPlan: PipelineContentResolverMixin.prototype.wrapTranslationAffixes.call(
          this,
          renderPlan,
          translation,
          entry,
          token
        ),
        korean
      };
    }
    return {
      renderPlan: {
        kind: "fixedText",
        text: PipelineContentResolverMixin.wrapTranslationAffixSurface(korean, translation),
        koreanPos: fixedTextKoreanPos
      },
      korean: ""
    };
  }

  static featuresToVoice(features: { readonly passive?: boolean; readonly potential?: boolean }): Voice {
    if (features.passive === true) {
      return "passive";
    }
    if (features.potential === true) {
      return "potential";
    }
    return "active";
  }

  static requiresEarlyContextResolution(renderPlan: RenderPlan): boolean {
    return renderPlan.kind === "copulaPredicate" || renderPlan.kind === "legacySurfaceComposition" || renderPlan.kind === "noda" || renderPlan.kind === "giveRequest";
  }

  static supportsTranslationCandidates(entry: ContentResolverEntry, pos0: number, token?: Pick<PatternRuntimeToken, "dictionaryForm" | "pos"> | null): boolean {
    const senses = entry.senses ?? [];
    if (senses.some((sense) => (sense.adverbializations?.length ?? 0) > 0)) {
      return true;
    }
    if (
      token !== undefined &&
      token !== null &&
      senses.some((sense) =>
        typeof sense.nominalized === "string" &&
        sense.nominalized.length > 0 &&
        (sense.koreanPos === 형용사 || sense.koreanPos === 동사)
      ) &&
      (pos0 === 形状詞 || pos0 === 形容詞0 || (pos0 === 名詞 && isNaAdjCapableNoun(token)))
    ) {
      return true;
    }
    if (senses.length <= 1) {
      return false;
    }
    if (entryHasDeferredFrameConditionCandidates(entry)) {
      return true;
    }
    if (pos0 === 動詞) {
      const basePos = senses[0]?.koreanPos ?? 명사;
      if (senses.every((translation) => (translation.koreanPos ?? 명사) === basePos)) {
        return true;
      }
      return token !== undefined && token !== null && ["できる", "出来る", "似る", "にる"].includes(token.dictionaryForm);
    }
    if (pos0 === 形容詞0 || pos0 === 形状詞) {
      const posSet = new Set(senses.map((translation) => translation.koreanPos ?? 명사));
      return (posSet.has(형용사) || posSet.has(동사)) && posSet.size > 1;
    }
    if (pos0 === 名詞 && token !== undefined && token !== null) {
      if (!isNaAdjCapableNoun(token)) {
        return false;
      }
      const posSet = new Set(senses.map((translation) => translation.koreanPos ?? 명사));
      return posSet.has(명사) && (posSet.has(형용사) || posSet.has(동사));
    }
    return false;
  }

  static mixedPosSlot(
    cursor: TokenCursor<PatternRuntimeToken>,
    auxTokens: readonly PatternRuntimeToken[] | AuxTokens,
    lookups?: LookupTables
  ): string | null {
    return (lookups === undefined
      ? mixedPosSlot(cursor, auxTokens)
      : mixedPosSlot(cursor, auxTokens, { lookups })) ?? null;
  }

  static pruneMixedPosCandidates(
    candidates: readonly TranslationCandidate[],
    candidateMatches: readonly string[],
    slot: string | null
  ): readonly [candidates: readonly TranslationCandidate[], candidateMatches: readonly string[]] {
    return pruneCandidatesBySlotOrder(candidates, candidateMatches, slot, { final: false });
  }

  static isVoiceUnknownCandidate(token: Pick<PatternRuntimeToken, "dictionaryForm" | "pos">, auxTokens: AuxTokens, voice: Voice, lookups: LookupTables): boolean {
    if (voice === "passive" || (token.pos & POS0) !== 動詞 || auxTokens.length === 0) {
      return false;
    }
    if (!auxTokens.some((aux) => (aux.pos & POS4) === 助動詞_レル)) {
      return false;
    }
    const verbCt4 = token.pos & POS4;
    if (is五段(verbCt4) || verbCt4 === サ行変格) {
      return false;
    }
    if (lookups.RARERU_PASSIVE_PREFERRED.has(token.dictionaryForm)) {
      return false;
    }
    return voice === "potential";
  }

  buildLocalCandidateGrammar(
    this: Pick<ContentResolverRuntimeAccess, "lookups">,
    cursor: TokenCursor<PatternRuntimeToken>,
    token: PatternRuntimeToken,
    auxTokens: AuxTokens,
    options: { readonly forcePassive?: boolean } = {}
  ): CandidateGrammar {
    const { tokens, end: n } = cursor;
    const start = cursor.pos - cursor.consumed;
    const features = auxExtractFeatures(auxTokens, {
      lookups: this.lookups,
      verbConjType: token.pos & POS4,
      jpDictForm: token.dictionaryForm,
      forcePassive: options.forcePassive === true
    });
    const voice = PipelineContentResolverMixin.featuresToVoice(features);
    const baseVoiceValue = PipelineContentResolverMixin.isVoiceUnknownCandidate(token, auxTokens, voice, this.lookups) ? null : voice;
    const voiceValue = baseVoiceValue === null && hasActiveSahenLightVerbProjection(tokens, start)
      ? "active"
      : baseVoiceValue;
    return {
      voice: voiceValue,
      nareruReading: PipelineContentResolverMixin.serializeNareruReadings(PipelineContentResolverMixin.initialNareruReadings(tokens, start, token, this.lookups)),
      dekiruReading: PipelineContentResolverMixin.serializeDekiruReadings(PipelineContentResolverMixin.initialDekiruReadings(tokens, start, n, token, auxTokens, this.lookups)),
      negative: features.negative,
      past: features.past,
      polite: features.polite,
      causative: features.causative,
      causativePassive: features.causativePassive,
      requestTail: hasRequestTail(cursor, this.lookups),
      benefactiveTail: hasBenefactiveTail(cursor, this.lookups),
      connectiveRole: null
    };
  }

  initialRareruReadings(this: Pick<ContentResolverRuntimeAccess, "lookups">, token: Pick<PatternRuntimeToken, "dictionaryForm" | "pos">, auxTokens: AuxTokens, voice: Voice): ReadonlySet<RareruReading> {
    if ((token.pos & POS0) !== 動詞 || auxTokens.length === 0) {
      return new Set();
    }
    if (!auxTokens.some((aux) => (aux.pos & POS4) === 助動詞_レル)) {
      return new Set();
    }
    const readings = new Set<RareruReading>();
    if (PipelineContentResolverMixin.isVoiceUnknownCandidate(token, auxTokens, voice, this.lookups)) {
      readings.add("passive");
      readings.add("potential");
    } else if (voice === "passive") {
      readings.add("passive");
    } else if (voice === "potential") {
      readings.add("potential");
    }
    return readings;
  }

  static serializeNareruReadings(readings: ReadonlySet<NareruReading>): string | readonly string[] | null {
    return serializeReadingSet(readings);
  }

  static initialNareruReadings(tokens: readonly PatternRuntimeToken[], start: number, token: Pick<PatternRuntimeToken, "dictionaryForm" | "pos">, lookups: LookupTables): ReadonlySet<NareruReading> {
    const dictForm = token.dictionaryForm;
    if (dictForm === "慣れる") {
      return new Set(["familiarize"]);
    }
    if (dictForm !== "なれる") {
      return new Set();
    }
    if (start <= 0) {
      return new Set(["familiarize"]);
    }
    const prev = tokens[start - 1];
    if (prev !== undefined && (prev.pos & POS0) === 助動詞 && prev.dictionaryForm === "だ") {
      return new Set(["become_potential"]);
    }
    if (((prev?.pos ?? 0) & POS0) !== 助詞) {
      return new Set(["familiarize"]);
    }
    const referent = getReferentTokenBeforeParticle(tokens, start - 1, lookups);
    if (referent === null) {
      return new Set(["familiarize"]);
    }
    const referentForm = referent.dictionaryForm || referent.surface;
    if (isPlaceNoun(referent, lookups) || lookups.NARERU_FAMILIARIZE_NOUNS.has(referentForm)) {
      return new Set(["familiarize"]);
    }
    return new Set(["become_potential"]);
  }

  static serializeDekiruReadings(readings: ReadonlySet<DekiruReading>): string | readonly string[] | null {
    return serializeReadingSet(readings);
  }

  static dekiruScanStart(_tokens: readonly PatternRuntimeToken[], predicatePos: number): number {
    const proto = activeProtoLayout();
    if (proto !== null) {
      const protoClause = proto.clauseContaining(predicatePos);
      if (protoClause !== undefined) {
        return protoClause.start;
      }
    }
    return Math.max(0, predicatePos - 6);
  }

  static initialDekiruReadings(
    tokens: readonly PatternRuntimeToken[],
    start: number,
    _n: number,
    token: Pick<PatternRuntimeToken, "dictionaryForm" | "pos">,
    _auxTokens: AuxTokens,
    lookups: LookupTables
  ): ReadonlySet<DekiruReading> {
    if (token.dictionaryForm !== "できる" && token.dictionaryForm !== "出来る") {
      return new Set();
    }
    const memberships = new Set<DekiruReading>();
    const scanStart = PipelineContentResolverMixin.dekiruScanStart(tokens, start);
    const match = findDekiruReferent(tokens, start, { scanStart, lookups });
    const referent = match.referent;
    const bareCompound = match.bareCompound;
    if (referent !== null) {
      const referentForm = referent.dictionaryForm || referent.surface;
      if (lookups.DEKIRU_ABILITY_NOUNS.has(referentForm)) {
        memberships.add("ability");
      }
      if (lookups.DEKIRU_POSSIBILITY_NOUNS.has(referentForm)) {
        memberships.add("availability");
        memberships.add("completion");
      }
      if (lookups.DEKIRU_COMPLETION_STRONG_NOUNS.has(referentForm)) {
        memberships.add("completion");
      }
      if (lookups.DEKIRU_COMPLETION_DO_NOUNS.has(referentForm)) {
        memberships.add("ability");
        memberships.add("completion");
      }
      if (lookups.DEKIRU_COMPLETION_AMBIGUOUS_NOUNS.has(referentForm)) {
        memberships.add("ability");
        memberships.add("completion");
      }
      if (lookups.DEKIRU_EMERGENCE_NOUNS.has(referentForm)) {
        memberships.add("emergence");
      }
      if (bareCompound) {
        memberships.add("ability");
      }
      if (memberships.size === 0) {
        memberships.add("ability");
        memberships.add("completion");
        memberships.add("emergence");
      }
    }
    if (memberships.size === 0) {
      memberships.add("ability");
    }
    return memberships;
  }

  static hasNaraAux(auxTokens: readonly Pick<PatternRuntimeToken, "surface" | "dictionaryForm" | "pos">[] | AuxTokens): boolean {
    const tokens = auxTokens;
    return tokens.some((token) =>
      token.surface === "なら" &&
      token.dictionaryForm === "だ" &&
      token.pos !== 0 && (token.pos & POS5A) === 仮定形_
    );
  }


  static makeContentCtx(
    cursor: TokenCursor<RuntimeHaruToken>,
    token: RuntimeHaruToken,
    pos0: number,
    entry: ContentResolverEntry,
    koreanLemma: string,
    auxTokens: AuxTokens,
    consumed: number,
    options: { readonly forcePassive?: boolean } = {}
  ): ContentCtx {
    return new ContentCtx(
      cursor,
      token,
      pos0,
      entry,
      koreanLemma,
      auxTokens,
      consumed,
      options.forcePassive ?? false
    );
  }

  static async runRuleChain<T extends RuleChainResultLike>(options: {
    readonly rules: readonly (readonly [ruleName: string, rule: () => T | null | Promise<T | null>])[];
    readonly phase: string;
    readonly tokenIdx: number;
    readonly trace?: TraceCollector | null;
    readonly detailFn?: (result: T) => { readonly [key: string]: TraceDetailValue };
  }): Promise<T | null> {
    for (const [ruleName, rule] of options.rules) {
      const result = await rule();
      if (options.trace !== undefined && options.trace !== null) {
        const detail = result !== null && options.detailFn !== undefined ? options.detailFn(result) : {};
        const classResult = result === null ? null : result instanceof PhaseStep ? result.result : "result" in result ? result.result : result;
        const traceResult =
          classResult instanceof RuleResult
            ? classResult
            : classResult !== null && typeof classResult === "object"
              ? classResult as RuleResultLike
              : null;
        PipelineContentResolverMixin.recordRuleTrace(options.trace, {
          tokenIdx: options.tokenIdx,
          phase: options.phase,
          ruleName,
          matched: result !== null,
          detail,
          result: traceResult
        });
      }
      if (result !== null) {
        return result;
      }
    }
    return null;
  }

  static recordRuleTrace(
    trace: TraceCollector,
    options: {
      readonly tokenIdx: number;
      readonly phase: string;
      readonly ruleName: string;
      readonly matched: boolean;
      readonly detail: { readonly [key: string]: TraceDetailValue };
      readonly result?: RuleResult | RuleResultLike | null;
    }
  ): void {
    trace.record(new TraceEvent(
      options.tokenIdx,
      options.phase,
      options.ruleName,
      options.matched,
      options.detail
    ));
    if (options.result !== undefined && options.result !== null) {
      PipelineContentResolverMixin.recordRuleTraceEvents(trace, options.tokenIdx, options.result);
    }
  }

  static recordRuleTraceEvents(trace: TraceCollector, tokenIdx: number, result: RuleResult | RuleResultLike): void {
    for (const event of result.traceEvents ?? []) {
      trace.record(new TraceEvent(
        event.tokenIdx ?? tokenIdx,
        event.phase ?? "special",
        event.ruleName,
        event.matched ?? true,
        { ...event.detail }
      ));
    }
  }

  static traceAuxToken(token: PatternRuntimeToken): { readonly surface: string; readonly pos4: string } {
    return {
      surface: token.surface,
      pos4: posToString(token.pos & POS4)
    };
  }

  static traceDetailFromRuleResult(result: RuleResult | RuleResultLike): { readonly [key: string]: RuleTraceDetailValue } {
    const detail: { trace_tag?: string } = {};
    if (result.traceTag !== undefined && result.traceTag !== null) {
      detail.trace_tag = result.traceTag;
    }
    return detail;
  }

  static traceDetailFromPhaseStep(result: PhaseStep): { readonly [key: string]: RuleTraceDetailValue } {
    const detail: { voice: string; has_negative: boolean; trace_tag?: string } = {
      voice: result.voice ?? "open",
      has_negative: result.hasNegative
    };
    if (result.result !== null) {
      const ruleDetail = PipelineContentResolverMixin.traceDetailFromRuleResult(result.result);
      if (typeof ruleDetail.trace_tag === "string") {
        detail.trace_tag = ruleDetail.trace_tag;
      }
    }
    return detail;
  }

  _resolveYoudaCase(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx,
    options: { readonly isPotential?: boolean } = {}
  ): RuleResultLike | null {
    return resolveYouda(modalityResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE), ctx, {
      isPotential: options.isPotential === true
    }, this.lookups);
  }

  async _resolveAdverbialAdjectiveCase(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx
  ): Promise<RuleResultLike | null> {
    const adverbialPrefix = (): RenderPlan | null => {
      if (ctx.koreanPos !== 형용사) {
        return null;
      }
      if (
        ctx.auxTokens.length === 0 &&
        (ctx.token.pos & POS0) === 形容詞0 &&
        isAdverbial(ctx.token)
      ) {
        return {
          kind: "conjugatedLemma",
          koreanLemma: ctx.koreanLemma,
          irregular: ctx.irregular,
          koreanPos: ctx.koreanPos,
          ending: "아/어"
        };
      }
      if (
        ctx.auxTokens.length > 0 &&
        ctx.auxTokens.length === 1 &&
        copulaNiMarkerRelationForToken(ctx.auxTokens.at(0), ctx.start + ctx.consumed, {
          consumers: ["content_resolver"]
        }) !== null
      ) {
        return {
          kind: "conjugatedLemma",
          koreanLemma: ctx.koreanLemma,
          irregular: ctx.irregular,
          koreanPos: ctx.koreanPos,
          ending: "아/어"
        };
      }
      return null;
    };

    const bareRenyouAdverbialResult = (): RuleResult | null => {
      const cursor = ctx.freshCursor();
      if ((ctx.token.pos & POS0) !== 形容詞0 || ctx.auxTokens.length > 0) {
        return null;
      }
      const isClauseBreak = cursor.pos >= cursor.end || ((cursor.tokens[cursor.pos]?.pos ?? 0) & POS0) === 補助記号;
      const ending = isClauseBreak ? "고" : "게";
      const adverbial = ctx.adverbial ?? undefined;
      const plan: RenderPlan = {
        kind: "conjugatedLemma",
        koreanLemma: ctx.koreanLemma,
        irregular: ctx.irregular,
        koreanPos: ctx.koreanPos,
        ending,
        ...(adverbial === undefined ? {} : { adverbial })
      };
      return new RuleResult(
        ctx.consumed,
        "",
        true,
        plan
      );
    };

    const adverbialPrefixPlan = adverbialPrefix();

    if (ctx.auxTokens.length > 0 || (ctx.token.pos & POS0) !== 形容詞0 || !isAdverbial(ctx.token)) {
      if (adverbialPrefixPlan === null) {
        return null;
      }
    }
    if (
      ctx.auxTokens.length > 0 &&
      !(
        ctx.auxTokens.length === 1 &&
        copulaNiMarkerRelationForToken(ctx.auxTokens.at(0), ctx.start + ctx.consumed, {
          consumers: ["content_resolver"]
        }) !== null
      )
    ) {
      return null;
    }

    const cursor = ctx.freshCursor();

    if (cursor.currentIs(isAdjNai)) {
      if (ctx.entry.synthetic !== true) {
        const naiToken = cursor.current()!;
        const baseEntry = ctx.entry;
        const baseLemma = ctx.koreanLemma;
        const baseIrreg = ctx.irregular;
        cursor.advance();
        const naiAux = collectAuxTokens(cursor);
        const bridge = naiAux.length === 0
          ? detectNaitoBridge(naiToken, cursor)
          : null;
        if (bridge !== null) {
          const [kind, follower] = bridge;
          const obligationMatch = cursor.lookahead(follower - cursor.pos, c => {
            const base = c.pos;
            const obligation = matchObligationTail(c);
            return obligation === null ? null : { obligation, consumed: c.pos - base };
          });
          if (obligationMatch !== null) {
            const extra = obligationMatch.consumed;
            const obligation = obligationMatch.obligation;
            const [polite, past] = obligation;
            const baseForm = conjugate(baseLemma, baseIrreg, "아/어");
            const consumedTo = (kind === "naito" ? 1 : 0) + extra;
            const tailPlan: LemmaRealization = {
              kind: "lemma",
              entry: null,
              koreanLemma: "하다",
              koreanPos: 동사,
              irregular: "여",
              auxTokens: buildSyntheticAux(polite, past)
            };
            return new RuleResult(
              cursor.consumed + consumedTo,
              "",
              true,
              composePrefixWithPredicate(`${baseForm}야 `, tailPlan, { koreanPos: 동사 })
            );
          }
        }
        const souMatch = matchSouDaHearsay(cursor);
        if (souMatch !== undefined) {
          const souAux = souMatch;
          const neg = conjugate(baseLemma, baseIrreg, "지");
          return new RuleResult(
            cursor.consumed,
            "",
            true,
            composePrefixWithPredicate(
              `${neg} 않다고 `,
              buildReportingPlan({ polite: auxHasPolite(souAux) }),
              { koreanPos: 동사 }
            )
          );
        }
        const nodaStart = cursor.pos;
        const noda = detectNoda(cursor);
        if (noda !== null) {
          const copulaAux = noda;
          const nodaConsumed = cursor.pos - nodaStart;
          const hasConjecture = copulaAux.some((token) =>
            ((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス) &&
            (token.pos & POS5A) === 意志推量形_
          );
          const polite = auxHasPolite(copulaAux);
          const cnAfter = cursor.pos + nodaConsumed;
          const hasQuestion = (
            cnAfter < cursor.end &&
            kaMarkerRelationAt(cursor.tokens, cnAfter, ["content_resolver"])?.particleSubtype1 === 終助詞
          );
          if (hasConjecture) {
            cursor.advance(nodaConsumed + (hasQuestion ? 1 : 0));
            if (hasQuestion) {
              if (
                cursor.pos < cursor.end &&
                contentQuestionOrPeriodAt(cursor.tokens, cursor.pos)
              ) {
                cursor.advance();
              }
            }
            const naiPast = auxHasPast(naiAux);
            const plan: RenderPlan = {
              kind: "copulaPredicate",
              koreanLemma: baseLemma,
              entry: baseEntry,
              irregular: baseIrreg,
              past: naiPast,
              polite,
              jpPos: ctx.token.pos,
              conjecture: true,
              conjectureQuestion: hasQuestion
            };
            return new RuleResult(cursor.consumed, "", true, plan);
          }
          cursor.advance(nodaConsumed);
          const sfpType = detectSfp(cursor, ctx.pos0, true);
          const negStem = conjugate(baseLemma, baseIrreg, "지");
          const negAttr = rashiiAttributive(`${negStem} 않다`, null, 형용사, auxTokensArray(naiAux), this.lookups);
          return new RuleResult(
            cursor.consumed,
            "",
            true,
            {
              kind: "noda",
              prefix: `${negAttr} `,
              copulaAux: auxTokensArray(copulaAux),
              sfp: sfpType
            }
          );
        }
        const quoteMarker = quoteMarkerRelationAt(cursor.tokens, cursor.pos, { consumers: ["content_resolver"] });
        if (
          cursor.pos < cursor.end &&
          (quoteMarker?.canonicalSurface === "と" || quoteMarker?.canonicalSurface === "って") &&
          ((cursor.tokens[cursor.pos]?.pos ?? 0) & POS0) === 助詞 &&
          isQuotativeToTokens(cursor, this.lookups)
        ) {
          cursor.advance();
          const negStem = conjugate(baseLemma, baseIrreg, "지");
          const plan: LemmaRealization = {
            kind: "lemma",
            entry: baseEntry,
            koreanLemma: `${negStem} 않다`,
            koreanPos: 형용사,
            irregular: null,
            auxTokens: auxTokensArray(naiAux),
            connective: "다고"
          };
          return new RuleResult(cursor.consumed, "", true, plan);
        }
        const rawPostAux = this.patterns.matchPostAux(cursor.tokens, cursor.pos, naiAux) ?? null;
        const postAux = rawPostAux === null ? null : normalizeContentPostAuxPattern(rawPostAux);
        if (
          postAux !== null &&
          postAux.outputMode === "hybrid" &&
          typeof postAux.tailLemma === "string" &&
          typeof postAux.middleText === "string" &&
          typeof postAux.connectiveEnding === "string"
        ) {
          cursor.advance(postAux.triggerLength);
          const trailingAux = collectAuxTokens(cursor);
          const negStem = conjugate(baseLemma, baseIrreg, "지");
          const connectiveEnding = postAux.connectiveEnding;
          const content: LemmaRealization = {
            kind: "lemma",
            entry: baseEntry,
            koreanLemma: `${negStem} 않다`,
            koreanPos: 형용사,
            irregular: null,
            auxTokens: auxTokensArray(naiAux),
            connective: connectiveEnding
          };
          const plan: RenderPlan = {
            kind: "hybridPostAux",
            content,
            middleText: postAux.middleText,
            tailLemma: postAux.tailLemma,
            tailKoreanPos: postAux.tailKoreanPos ?? 동사,
            tailIrregular: postAux.tailIrregular ?? null,
            tailAuxTokens: runtimeTokens(trailingAux),
            ...(postAux.tailLemma === "모르다"
              ? {
                modalKind: "kamo_shirenai" as const,
                modalPolite: auxHasPolite(trailingAux),
                modalPast: auxHasPast(trailingAux)
              }
              : {})
          };
          return new RuleResult(cursor.consumed, "", true, plan);
        }
        if (postAux !== null && typeof postAux.connectiveEnding === "string") {
          cursor.advance(postAux.triggerLength);
          const negStem = conjugate(baseLemma, baseIrreg, "지");
          const plan: LemmaRealization = {
            kind: "lemma",
            entry: baseEntry,
            koreanLemma: `${negStem} 않다`,
            koreanPos: 형용사,
            irregular: null,
            auxTokens: auxTokensArray(naiAux),
            connective: postAux.connectiveEnding
          };
          return new RuleResult(cursor.consumed, "", true, plan);
        }
        const sfpType = detectSfp(cursor, ctx.pos0, naiAux.length > 0);
        const negStem = conjugate(baseLemma, baseIrreg, "지");
        const plan: LemmaRealization = {
          kind: "lemma",
          entry: baseEntry,
          koreanLemma: `${negStem} 않다`,
          koreanPos: 형용사,
          irregular: null,
          auxTokens: auxTokensArray(naiAux),
          ...(sfpType === null ? {} : { sfp: sfpType })
        };
        return new RuleResult(cursor.consumed, "", true, plan);
      }
    }

    if (cursor.currentIs((tok) => isVerbLemma(tok, "ある"))) {
      const ariAux = cursor.lookahead(1, collectAuxTokens);
      const hasNeg = auxHasNegation(ariAux);
      if (hasNeg) {
        if (ctx.entry.synthetic !== true) {
          const baseEntry = ctx.entry;
          const baseLemma = ctx.koreanLemma;
          const baseIrreg = ctx.irregular;
          const clean = ariAux.filter((token) => (token.pos & POS4) !== 助動詞_ナイ && (token.pos & POS4) !== 助動詞_ヌ);
          cursor.advance(1 + ariAux.length);
          const sfpType = detectSfp(cursor, ctx.pos0, clean.length > 0);
          const negStem = conjugate(baseLemma, baseIrreg, "지");
          const plan: LemmaRealization = {
            kind: "lemma",
            entry: baseEntry,
            koreanLemma: `${negStem} 않다`,
            koreanPos: 형용사,
            irregular: null,
            auxTokens: auxTokensArray(clean),
            ...(sfpType === null ? {} : { sfp: sfpType })
          };
          return new RuleResult(cursor.consumed, "", true, plan);
        }
      }
    }

    if (adverbialPrefixPlan !== null) {
      if (cursor.currentIs((tok) => isVerbLemma(tok, "なる", "なれる"))) {
        const next = cursor.current()!;
        cursor.advance();
        const naruAux = collectAuxTokens(cursor);
        if (
          naruAux.length === 0 &&
          cursor.pos < cursor.end &&

          cursor.tokens[cursor.pos]?.surface === "まで" &&

          ((cursor.tokens[cursor.pos]?.pos ?? 0) & POS0) === 助詞
        ) {
          const nextDict = next.dictionaryForm;
          const tailLemma = nextDict === "なれる" ? "질 수 있다" : "지다";
          const plan = composePrefixWithPredicate(
            adverbialPrefixPlan,
            {
              kind: "conjugatedLemma",
              koreanLemma: tailLemma,
              irregular: null,
              koreanPos: 동사,
              ending: "ㄹ/을",
              suffix: " 때까지"
            },
            { koreanPos: 동사 }
          );
          return new RuleResult(
            cursor.consumed + 1,
            "",
            true,
            plan
          );
        }
        const sfpType = detectSfp(cursor, 動詞, naruAux.length > 0);
        const nextDict = next.dictionaryForm;
        return new RuleResult(
          cursor.consumed,
          "",
          true,
          composePrefixWithPredicate(
            adverbialPrefixPlan,
            {
              kind: "lemma",
              entry: null,
              koreanLemma: nextDict === "なれる" ? "질 수 있다" : "지다",
              koreanPos: 동사,
              irregular: null,
              auxTokens: auxTokensArray(naruAux),
              sfp: sfpType
            },
            { koreanPos: 동사 }
          )
        );
      }
      return bareRenyouAdverbialResult();
    }
    if (ctx.adverbial !== null && ctx.adverbial !== undefined) {
      return bareRenyouAdverbialResult();
    }

    return null;
  }

  async _unsupportedPostAuxFinalizer(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx
  ): Promise<RuleResultLike | null> {
    const match = matchRemovedPostAuxPattern(entryAuxResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE), ctx, this.lookups);
    if (match === null) {
      return null;
    }

    if (match.family === "connective" && PipelineContentResolverMixin.retiredConnectiveAcceptanceAt(ctx, match)) {
      return PipelineContentResolverMixin.unsupportedPostAuxRawFallback(ctx, match);
    }

    const terminalCtx = new ContentTerminalCtx(
      ctx.cursor.fork(ctx.start + match.consumed),
      ctx.token,
      ctx.pos0,
      ctx.entry,
      ctx.koreanLemma,
      ctx.auxTokens,
      match.consumed,
      ctx.forcePassive,
      null,
      null,
    );
    const base = await resolveTailDefault(tailResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE), terminalCtx, this.lookups);
    return {
      consumed: base.consumed,
      korean: base.korean,
      spaceAfter: base.spaceAfter,
      renderPlan: base.renderPlan ?? null,
      renderPlanPolicy: base.renderPlanPolicy ?? "normal",
      traceTag: base.traceTag ?? null,
      traceEvents: base.traceEvents ?? [],
      benefactive: base.benefactive ?? {},
      warnings: [
        ...(base.warnings ?? []),
        PipelineContentResolverMixin.unsupportedPostAuxWarning(ctx, match)
      ]
    };
  }

  static retiredConnectiveAcceptanceAt(ctx: ContentCtx, match: RemovedPostAuxUnsupportedMatch): boolean {
    const connectiveSurface = ctx.tokens
      .slice(match.triggerStart, match.triggerEnd)
      .map((token) => token.surface)
      .join("");
    const connectiveEnding = CONNECTIVE_RENDER_MAP.get(connectiveSurface)?.korean
      ?? match.effectivePattern.connectiveEnding
      ?? match.effectivePattern.mainVerbEnding
      ?? null;
    if (connectiveEnding === null) {
      return false;
    }
    const effectiveKoreanPos =
      ctx.koreanPos === 부사 &&
        ctx.koreanLemma.endsWith("다") &&
        isLexicalAdverb({ pos: ctx.pos0 })
        ? 형용사
        : ctx.koreanPos;
    const nominalHost =
      effectiveKoreanPos === 명사 || effectiveKoreanPos === 대명사 || effectiveKoreanPos === 수사;
    const canRenderPredicate = effectiveKoreanPos === 동사 || effectiveKoreanPos === 형용사;
    const canRenderCopula = (nominalHost || effectiveKoreanPos === 부사) && ctx.auxTokens.length > 0;
    if (canRenderPredicate || canRenderCopula) {
      return isKnownEnding(connectiveEnding);
    }
    return nominalHost && (match.effectivePattern.tailText ?? null) !== null;
  }

  static unsupportedPostAuxRawFallback(ctx: ContentCtx, match: RemovedPostAuxUnsupportedMatch): RuleResultLike {
    const raw = ctx.tokens
      .slice(ctx.start, ctx.start + match.consumed)
      .map((token) => token.surface)
      .join("");
    return {
      consumed: match.consumed,
      korean: raw,
      spaceAfter: true,
      renderPlan: null,
      warnings: [PipelineContentResolverMixin.unsupportedPostAuxWarning(ctx, match)]
    };
  }

  static unsupportedPostAuxWarning(ctx: ContentCtx, match: RemovedPostAuxUnsupportedMatch): Warning {
    return buildUnsupportedPostAuxWarning(ctx, match);
  }

  async _resolveEntryTailFinalizationPhase(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx,
    isPotential: boolean,
    options: { readonly trace?: TraceCollector | null } = {}
  ): Promise<RuleResultLike | null> {
    const resolver = tailResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE);
    const trace = options.trace ?? null;
    const preSfpResult = trace === null
      ? await runEntryTailPreSfpRules(resolver, ctx, isPotential, this.lookups)
      : await PipelineContentResolverMixin.runRuleChain({
        rules: ENTRY_TAIL_PRE_SFP_RULES.map(([ruleName, rule]) =>
          [ruleName, () => rule(resolver, ctx, isPotential, this.lookups)] as const
        ),
        phase: "tail",
        tokenIdx: ctx.start,
        trace,
        detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
      });
    if (preSfpResult !== null) {
      return preSfpResult;
    }

    const sfpPos = ctx.start + ctx.consumed;
    const sfpMatch = ctx.cursor.lookahead(sfpPos - ctx.cursor.pos, cursor => {
      const detected = detectSfpWithNode(cursor, ctx.pos0, ctx.auxTokens.length > 0);
      return { sfpType: detected?.sfpType ?? null, sfpNode: detected?.node ?? null, consumed: cursor.pos - sfpPos };
    });
    const sfpType = sfpMatch.sfpType;
    const sfpConsumed = sfpMatch.consumed;
    const terminalCtx = ContentTerminalCtx.fromContentCtx(ctx, { sfpType, sfpNode: sfpMatch.sfpNode, sfpConsumed });
    const postSfpResult = trace === null
      ? await runEntryTailPostSfpRules(resolver, terminalCtx, isPotential, this.lookups)
      : await PipelineContentResolverMixin.runRuleChain({
        rules: ENTRY_TAIL_POST_SFP_RULES.map(([ruleName, rule]) =>
          [ruleName, () => rule(resolver, terminalCtx, isPotential, this.lookups)] as const
        ),
        phase: "tail",
        tokenIdx: ctx.start,
        trace,
        detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
      });
    if (postSfpResult !== null) {
      return postSfpResult;
    }

    return await PipelineContentResolverMixin.runRuleChain({
      rules: [[RESOLVE_TAIL_DEFAULT_RULE_NAME, () => resolveTailDefault(resolver, terminalCtx, this.lookups, isPotential)]],
      phase: "tail",
      tokenIdx: ctx.start,
      trace,
      detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
    });
  }

  async _resolveEntryAuxPhase(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx,
    isPotential: boolean,
    trace: TraceCollector | null = null
  ): Promise<RuleResultLike | null> {
    const resolver = entryAuxResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE);
    const phaseResult = trace === null
      ? await runEntryAuxRules(resolver, ctx, isPotential, this.lookups)
      : await PipelineContentResolverMixin.runRuleChain({
        rules: ENTRY_AUX_PHASE_RULES.map(([ruleName, rule]) =>
          [ruleName, () => rule(resolver, ctx, isPotential, this.lookups)] as const
        ),
        phase: "entry_aux",
        tokenIdx: ctx.start,
        trace,
        detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
      });
    if (phaseResult !== null) {
      return phaseResult;
    }

    const unsupportedPostAuxResult = await PipelineContentResolverMixin.runRuleChain({
      rules: [[UNSUPPORTED_POST_AUX_REMOVED_RULE_NAME, () => PipelineContentResolverMixin.prototype._unsupportedPostAuxFinalizer.call(this, ctx)]],
      phase: "entry_aux",
      tokenIdx: ctx.start,
      trace,
      detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
    });
    if (unsupportedPostAuxResult !== null) {
      return unsupportedPostAuxResult;
    }

    return await PipelineContentResolverMixin.prototype._resolveEntryTailFinalizationPhase.call(this, ctx, isPotential, { trace });
  }

  async _resolveHeadMetadataTailPhase(
    this: ContentResolverRuntimeAccess,
    ctx: ContentCtx,
    isPotential: boolean,
    trace: TraceCollector | null = null
  ): Promise<RuleResultLike | null> {
    void isPotential;
    const resolver = tailResolverAdapter(this, CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE);
    const sfpPos = ctx.start + ctx.consumed;
    const sfpMatch = ctx.cursor.lookahead(sfpPos - ctx.cursor.pos, cursor => {
      const detected = detectSfpWithNode(cursor, ctx.pos0, ctx.auxTokens.length > 0);
      return { sfpType: detected?.sfpType ?? null, sfpNode: detected?.node ?? null, consumed: cursor.pos - sfpPos };
    });
    const sfpType = sfpMatch.sfpType;
    const sfpConsumed = sfpMatch.consumed;
    const terminalCtx = ContentTerminalCtx.fromContentCtx(ctx, { sfpType, sfpNode: sfpMatch.sfpNode, sfpConsumed });
    const tailResult = await PipelineContentResolverMixin.runRuleChain({
      rules: [[RESOLVE_TAIL_DEFAULT_RULE_NAME, () => resolveTailDefault(resolver, terminalCtx, this.lookups)]],
      phase: "tail_metadata",
      tokenIdx: ctx.start,
      trace,
      detailFn: PipelineContentResolverMixin.traceDetailFromRuleResult
    });
    const sourceVerbalPredicateVerdict =
      sourceVerbalPredicateVerdictForPurposeMotion(ctx, this.lookups);
    return tailResult === null || sourceVerbalPredicateVerdict === null
      ? tailResult
      : { ...tailResult, sourceVerbalPredicateVerdict };
  }

  async _tryProcessContentWithCandidates(
    this: ContentResolverRuntimeAccess,
    cursor: TokenCursor<RuntimeHaruToken>,
    token: RuntimeHaruToken,
    pos0: number,
    entry: ContentResolverEntry,
    options: {
      readonly forcePassive?: boolean;
      readonly trace?: TraceCollector | null;
      readonly entryAuxMode?: "normal" | "head_metadata";
      readonly contentMap?: ContextContentMap | null;
    } = {}
  ): Promise<ContentResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.origin;
    const n = cursor.end;
    const forcePassive = options.forcePassive === true;
    const trace = options.trace ?? null;
    if (
      !PipelineContentResolverMixin.supportsTranslationCandidates(entry, pos0, token) &&
      !bareStemNominalUseAdmitsCandidatePath(cursor, token, entry, this.lookups)
    ) {
      return null;
    }
    const initialCursor = cursor.fork();
    const auxCursor = cursor;
    if (
      (pos0 === 名詞) &&
      isNaAdjCapableNoun(token) &&
      start + 1 < n &&
      auxCursor.lookahead(0, c => matchCopulaNegation(c)) !== undefined
    ) {
      return null;
    }
    if (
      (pos0 === 名詞) &&
      isNaAdjCapableNoun(token) &&
      start + 1 < n &&
      ((tokens[start + 1]?.pos ?? 0) & POS0) === 助詞 &&
      caseParticleMarkerRelationForToken(tokens[start + 1], start + 1, {
        acceptedSurfaces: ["で"],
        consumers: ["content_resolver"]
      }) !== null
    ) {
      return null;
    }

    const auxTokens = collectAuxTokens(auxCursor);
    const grammar = PipelineContentResolverMixin.prototype.buildLocalCandidateGrammar.call(
      this,
      auxCursor,
      token,
      auxTokens,
      { forcePassive }
    );

    const entrySenses = entry.senses ?? [];
    const projectionOrdinals = translationCandidateProjectionOrdinals(entry, entrySenses);
    const allocateProjectionOrdinal = createStemCandidateProjectionOrdinalAllocator(
      entrySenses.map((translation, index) => ({
        provenance: stemCandidateProvenanceForTranslation(
          translation,
          derivationForSense(translation, entry)
        ),
        projectionOrdinal: projectionOrdinals[index]!
      }))
    );
    let candidates: ContentTranslationCandidate[] = [];
    const candidateMatches: string[] = [];
    let consumedValue: number | null = null;
    for (const [index, translation] of entrySenses.entries()) {
      if (!translationEligibleForLocalVoice(translation, grammar)) {
        continue;
      }
      const hasFrameConditions = translationHasSourceFrameConditions(translation);
      const hasDeferredFrameConditions = translationHasDeferredFrameConditions(translation);
      const useDirectSourceFrame = hasFrameConditions &&
        !translationNeedsFinalClauseLayoutForSourceMatch(translation);
      let match: "match" | "fail" | "unknown";
      if (useDirectSourceFrame) {
        match = senseSourceFrameMatch(
          translation,
          tokens,
          start,
          grammar,
          this.lookups,
          this.numeric,
          options.contentMap ?? null
        );
      } else {
        match = "match";
        if (hasFrameConditions) {
          match = translationFrameAlternativeMatchesWithoutLayout(translation, tokens, start, grammar, this.lookups, this.numeric, options.contentMap ?? null)
            ? "match"
            : "fail";
        }
      }
      if (match === "fail") {
        if (hasFrameConditions && hasDeferredFrameConditions && !useDirectSourceFrame) {
          match = "unknown";
        } else {
          continue;
        }
      }
      const candidateTranslation = translation;
      const candidateEntry: ContentResolverEntry = { ...entry, senses: [candidateTranslation] };
      const koreanLemma = candidateTranslation.korean;
      const isPotential = isPotentialDerivation(candidateEntry);
      const [phaseResult, voice, hasNegative] = await PipelineContentResolverMixin.prototype.resolveContentPhases.call(
        this,
        initialCursor.fork(),
        token,
        pos0,
        candidateEntry,
        koreanLemma,
        isPotential,
        { forcePassive, trace, entryAuxMode: options.entryAuxMode ?? "normal" }
      );

      const renderPlanPolicy = phaseResult.renderPlanPolicy ?? "normal";
      let renderPlan: RenderPlan | null = phaseResult.renderPlan ?? null;
      if (candidateTranslation.dropFirstPassiveAux === true) {
        const rewrittenPlan = renderPlan === null ? undefined : replaceLemmaRenderPlan(renderPlan, {
          koreanLemma,
          irregular: candidateTranslation.irregular ?? null,
          koreanPos: candidateTranslation.koreanPos ?? 명사,
          dropFirstPassiveAux: true
        });
        if (rewrittenPlan !== undefined) {
          renderPlan = rewrittenPlan;
        }
      }
      if (candidateTranslation.dropFirstCausativeAux === true) {
        const rewrittenPlan = renderPlan === null ? undefined : replaceLemmaRenderPlan(renderPlan, {
          koreanLemma,
          irregular: candidateTranslation.irregular ?? null,
          koreanPos: candidateTranslation.koreanPos ?? 명사,
          dropFirstCausativeAux: true
        });
        if (rewrittenPlan !== undefined) {
          renderPlan = rewrittenPlan;
        }
      }
      if (candidateTranslation.dropFirstNegativeAux === true) {
        const rewrittenPlan = renderPlan === null ? undefined : replaceLemmaRenderPlan(renderPlan, {
          koreanLemma,
          irregular: candidateTranslation.irregular ?? null,
          koreanPos: candidateTranslation.koreanPos ?? 명사,
          dropFirstNegativeAux: true
        });
        if (rewrittenPlan !== undefined) {
          renderPlan = rewrittenPlan;
        }
      }
      if (
        renderPlan !== null &&
        PipelineContentResolverMixin.requiresEarlyContextResolution(renderPlan) &&
        !["できる", "出来る", "似る", "にる"].includes(token.dictionaryForm)
      ) {
        return null;
      }
      const affixed = PipelineContentResolverMixin.prototype.applyTranslationAffixes.call(
        this,
        phaseResult,
        renderPlan,
        renderPlan === null ? phaseResult.korean : "",
        candidateTranslation,
        candidateEntry,
        token,
        candidateTranslation.koreanPos ?? 명사
      );
      renderPlan = affixed.renderPlan;
      const korean = affixed.korean;
      if (consumedValue === null) {
        consumedValue = phaseResult.consumed;
      }
      const candidateVoice = isPotential && voice === "active" ? "potential" : voice;
      const contentCandidate = new ContentTranslationCandidate(
        index,
        normalizeCandidateConditions(null),
        candidateEntry,
        candidateTranslation,
        koreanLemma,
        candidateTranslation.koreanPos ?? 명사,
        candidateTranslation.irregular ?? null,
        renderPlan,
        korean,
        candidateVoice,
        PipelineContentResolverMixin.prototype.initialRareruReadings.call(this, token, auxTokens, candidateVoice ?? "active"),
        PipelineContentResolverMixin.initialNareruReadings(tokens, start, token, this.lookups),
        PipelineContentResolverMixin.initialDekiruReadings(tokens, start, n, token, auxTokens, this.lookups),
        hasNegative,
        grammar.causative,
        grammar.causativePassive,
        grammar.requestTail,
        grammar.benefactiveTail,
        grammar.connectiveRole,
        phaseResult.benefactive,
        phaseResult.warnings,
        renderPlanPolicy,
        null,
        projectionOrdinals[index]!,
        phaseResult.sourceVerbalPredicateVerdict ?? null
      );
      const particleAdverbialCandidate = auxCursor.lookahead(
        start - auxCursor.pos,
        cursor => lexicalParticleAdverbialVariantFromCandidate(
          contentCandidate,
          cursor,
          this.lookups,
          () => allocateProjectionOrdinal(
            translationCandidateIdentity(contentCandidate).provenance
          )
        )
      );
      if (particleAdverbialCandidate !== null) {
        candidates.push(particleAdverbialCandidate);
        candidateMatches.push(match);
      }
      candidates.push(contentCandidate);
      candidateMatches.push(match);
    }

    if (candidates.length === 0) {
      return null;
    }

    const dedupedCandidates: ContentTranslationCandidate[] = [];
    const dedupedMatches: string[] = [];
    const seenConditions = new Set<string>();
    for (const [index, candidateItem] of candidates.entries()) {
      const dedupeKey = candidateDedupeKey(candidateItem);
      if (seenConditions.has(dedupeKey)) {
        continue;
      }
      seenConditions.add(dedupeKey);
      dedupedCandidates.push(candidateItem);
      dedupedMatches.push(candidateMatches[index] ?? "unknown");
    }
    candidates = dedupedCandidates;
    const mixedPosSlotValue = auxCursor.lookahead(start - auxCursor.pos, cursor =>
      PipelineContentResolverMixin.mixedPosSlot(cursor, auxTokens, this.lookups)
    );
    let slotMatches = dedupedMatches;
    const bareStemNominalHost = auxTokens.length === 0 &&
      bareStemNominalUseHostClass(token, mixedPosSlotValue) !== null;
    const stemRootProjectionAllowed = bareStemNominalHost &&
      stemRootNominalProjectionAllowedForSlot(mixedPosSlotValue, {
        lexicalMentionSpan: bareStemLexicalMentionSpanAt(runtimeTokens(tokens), start)
      });
    const verbalNominalMProjectionAllowed = bareStemNominalHost &&
      verbalNominalMProjectionAllowedForSlot(mixedPosSlotValue);
    if (
      nominalizedNounProjectionAllowedForSlot(mixedPosSlotValue) ||
      stemRootProjectionAllowed ||
      verbalNominalMProjectionAllowed
    ) {
      const projectedCandidates: ContentTranslationCandidate[] = [];
      const projectedMatches: string[] = [];
      const nominalLemmaRenderPlan = (koreanLemma: string, entry: ContentTranslationCandidate["entry"]): Extract<RenderPlan, { readonly kind: "lemma" }> => ({
        kind: "lemma",
        entry,
        koreanLemma,
        koreanPos: 명사,
        irregular: null,
        auxTokens: runtimeAuxTokens(auxTokens),
        jpDictForm: token.dictionaryForm,
        verbConjType: null
      });
      for (const [candidateIndex, candidateItem] of candidates.entries()) {
        const match = dedupedMatches[candidateIndex] ?? "unknown";
        projectedCandidates.push(candidateItem);
        projectedMatches.push(match);
        const nextOrdinal = (): number => allocateProjectionOrdinal(
          translationCandidateIdentity(candidateItem).provenance
        );
        const nominalized = candidateItem.translation.nominalized;
        const nominalizedProjection = nominalizedNounProjectionAllowedForSlot(mixedPosSlotValue) &&
          typeof nominalized === "string" && nominalized.length > 0
          ? nominalizedNounProjectionVariantFromCandidate(
            candidateItem,
            nominalLemmaRenderPlan(nominalized, candidateItem.entry),
            nextOrdinal
          )
          : null;
        if (nominalizedProjection !== null) {
          projectedCandidates.push(nominalizedProjection);
          projectedMatches.push(match);
        }
        const stemRootProjection = stemRootProjectionAllowed
          ? stemRootNominalProjectionVariantFromCandidate(
            candidateItem,
            (root) => nominalLemmaRenderPlan(root, candidateItem.entry),
            nextOrdinal
          )
          : null;
        if (stemRootProjection !== null) {
          projectedCandidates.push(stemRootProjection);
          projectedMatches.push(match);
        }
        const verbalNominalMProjection = verbalNominalMProjectionAllowed
          ? verbalNominalMProjectionVariantFromCandidate(
            candidateItem,
            (nominalM) => nominalLemmaRenderPlan(nominalM, candidateItem.entry),
            nextOrdinal
          )
          : null;
        if (verbalNominalMProjection !== null) {
          projectedCandidates.push(verbalNominalMProjection);
          projectedMatches.push(match);
        }
      }
      candidates = projectedCandidates;
      slotMatches = projectedMatches;
    }
    const preSlotPruneCandidates = trace === null ? [] : candidates;
    const preSlotPruneMatches = trace === null ? [] : slotMatches;
    const pruned = PipelineContentResolverMixin.pruneMixedPosCandidates(candidates, slotMatches, mixedPosSlotValue);
    candidates = pruned[0].map(contentTranslationCandidateFrom);
    const prunedMatches = [...pruned[1]];

    if (trace !== null) {
      const preSlotFallbackGroup = candidateFallbackGroup(preSlotPruneCandidates);
      const postSlotCandidates = pruned[0];
      const postSlotCandidateSet = new Set(postSlotCandidates);
      const slotDroppedCandidates = preSlotPruneCandidates.filter((candidateItem) => !postSlotCandidateSet.has(candidateItem));
      const slotReordered =
        slotDroppedCandidates.length === 0 &&
        postSlotCandidates.some((candidateItem, index) => candidateItem !== preSlotPruneCandidates[index]);
      trace.record(new TraceEvent(start, "analysis", "candidate_enumeration", true, {
        candidate_count: candidates.length,
        pre_slot_prune_candidate_count: preSlotPruneCandidates.length,
        slot_pruned_candidate_count: slotDroppedCandidates.length,
        slot_reordered_candidate_count: slotReordered ? postSlotCandidates.length : 0,
        lemmas: candidates.map((candidateItem) => candidateItem.koreanLemma),
        mixed_pos_slot: mixedPosSlotValue ?? null,
        grammar: candidateGrammarTraceDetail(grammar),
        candidates: candidates.map((candidateItem, index) =>
          contentCandidateTraceValue(candidateItem, prunedMatches[index] ?? "fail", preSlotFallbackGroup)
        ),
        pre_slot_prune_candidates: preSlotPruneCandidates.map((candidateItem, index) =>
          contentCandidateTraceValue(candidateItem, preSlotPruneMatches[index] ?? "fail", preSlotFallbackGroup)
        ),
        slot_dropped_candidates: slotDroppedCandidates.map((candidateItem) =>
          contentCandidateTraceValue(candidateItem, preSlotPruneMatches[preSlotPruneCandidates.indexOf(candidateItem)] ?? "fail", preSlotFallbackGroup)
        ),
        evidence: mixedPosSlotValue === undefined
          ? []
          : [slotEvidenceObservabilityTraceValue({
            owner: "content_resolver",
            evidence: "mixed_pos_slot",
            slot: mixedPosSlotValue,
            classification: "preference",
            effect: slotDroppedCandidates.length > 0 ? "prune" : slotReordered ? "reorder" : "observe",
            final: false,
            fallbackLoweredToReorder: false,
            droppedCount: slotDroppedCandidates.length,
            droppedCandidates: slotDroppedCandidates.map((candidateItem) => candidateItem.koreanLemma)
          })]
      }));
    }

    const producedSet = createSourceCandidateSet(
      candidates.map((candidateItem, index) => stagedCandidate(
        candidateItem,
        frameSourceConditionMatchOf(prunedMatches[index]),
        { consumed: candidateItem.lexicalParticleAdverbial?.consumed ?? null }
      )),
      { sharedConsumed: consumedValue ?? 1 }
    );

    const skeleton = laneACandidateChainWinner(producedSet);
    if (skeleton === undefined) {
      return null;
    }
    if (isStagedSourceDomain(entrySenses)) {
      return new StagedContentResult(
        candidateSetSharedConsumed(producedSet, 1),
        skeleton.candidate.entry,
        skeleton.candidate.renderPlan ?? null,
        skeleton.candidate.voice ?? null,
        skeleton.candidate.rareruReadings ?? new Set(),
        skeleton.candidate.nareruReadings ?? new Set(),
        skeleton.candidate.dekiruReadings ?? new Set(),
        skeleton.candidate.hasNegative ?? false,
        skeleton.candidate.hasCausative ?? false,
        skeleton.candidate.hasCausativePassive ?? false,
        false,
        false,
        null,
        skeleton.candidate.benefactive,
        producedSet,
        skeleton.candidate.warnings ?? [],
        skeleton.candidate.renderPlanPolicy ?? "normal"
      );
    }

    const sourceCandidates = resolveSourceCandidateSet(producedSet, {
      kind: "unstaged_domain",
      entrySenseCount: entrySenses.length,
      stagedPriorityDomain: false,
      verdict: skeleton.identity
    });
    if (!isResolvedCandidateSet(sourceCandidates)) {
      return null;
    }
    const selected = resolvedWinner(sourceCandidates).candidate;

    const laneAResult = new ResolvedContentResult(
      resolvedWinnerConsumed(sourceCandidates),
      selected.korean ?? "",
      selected.koreanPos,
      selected.entry,
      selected.renderPlan ?? null,
      selected.voice ?? null,
      selected.rareruReadings ?? new Set(),
      selected.nareruReadings ?? new Set(),
      selected.dekiruReadings ?? new Set(),
      selected.hasNegative ?? false,
      selected.hasCausative ?? false,
      selected.hasCausativePassive ?? false,
      false,
      false,
      null,
      selected.benefactive,
      sourceCandidates,
      selected.warnings ?? [],
      selected.renderPlanPolicy ?? "normal"
    );
    return laneAResult;
  }

  async _processContent(
    this: ContentResolverRuntimeAccess,
    cursor: TokenCursor<RuntimeHaruToken>,
    options: {
      readonly forcePassive?: boolean;
      readonly trace?: TraceCollector | null;
      readonly entryAuxMode?: "normal" | "head_metadata";
      readonly contentMap?: ContextContentMap | null;
    } = {}
  ): Promise<ContentResult> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const forcePassive = options.forcePassive === true;
    const trace = options.trace ?? null;
    const token = tokens[start];
    if (token === undefined) {
      throw new Error("content token index out of range");
    }
    const pos0 = token.pos & POS0;
    const initialCursor = cursor.fork(start + 1, n, start);
    if (isNonLexicalSymbolTokenAt(tokens, start)) {
      return new ResolvedContentResult(
        1,
        token.surface,
        기호,
        null,
        null,
        "active"
      );
    }

    const specialPhaseCandidate =
      (
        (pos0 === 形状詞) &&
        token.pos !== 0 &&
        (token.pos & POS1) === 助動詞語幹 &&
        token.surface === "そう"
      ) ||
      isYouToken(token);
    const specialPhase = specialPhaseCandidate
      ? await resolveSpecialContentPhase.call(
        this,
        initialCursor.fork(),
        token,
        pos0
      )
      : null;
    if (specialPhase !== null) {
      if (trace !== null) {
        PipelineContentResolverMixin.recordRuleTrace(trace, {
          tokenIdx: start,
          phase: "special",
          ruleName: isYouToken(token) ? "rule_special_you" : "rule_special_sou",
          matched: true,
          detail: PipelineContentResolverMixin.traceDetailFromRuleResult(specialPhase),
          result: specialPhase
        });
      }
      const consumed = specialPhase.consumed;
      const koreanPos = token.surface === "そう" ? 동사 : 형용사;
      const specialRenderPlanPolicy = specialPhase.renderPlanPolicy ?? "normal";
      const renderPlan = specialPhase.renderPlan ?? null;
      return new ResolvedContentResult(
        consumed,
        renderPlan === null ? specialPhase.korean : "",
        koreanPos,
        null,
        renderPlan,
        "active",
        new Set(),
        new Set(),
        new Set(),
        false,
        false,
        false,
        false,
        false,
        null,
        specialPhase.benefactive ?? {},
        null,
        specialPhase.warnings ?? [],
        specialRenderPlanPolicy
      );
    }

    const segments = await translateTokenWithResolver(this, token);
    let entry: ContentResolverEntry | null = segments.length === 1 ? segments[0]?.[1] ?? null : null;

    const splitOutput = pos0in(pos0, NONPREDICATE_CONTENT_POS_BITS)
      ? await renderSplitFallbackWithResolver(this, token)
      : null;
    if (splitOutput !== null && (segments.length > 1 || entry === null)) {
      const koreanPos = JP_POS_TO_KR_NUM.get(pos0) ?? 명사;
      entry = {
        dictionaryForm: token.dictionaryForm,
        senses: [{ korean: splitOutput, koreanPos }],
        synthetic: true,
        syntheticReason: "split_fallback"
      };
    }

    if (entry === null) {
      entry = await synthesizeEntryWithResolver(this, token, tokens[start + 1] ?? null);
    }
    if (entry.dictionaryForm === undefined) {
      entry = { ...entry, dictionaryForm: token.dictionaryForm };
    }

    const candidateResult = await PipelineContentResolverMixin.prototype._tryProcessContentWithCandidates.call(
      this,
      initialCursor.fork(),
      token,
      pos0,
      entry,
      {
        forcePassive,
        trace,
        entryAuxMode: options.entryAuxMode ?? "normal",
        contentMap: options.contentMap ?? null
      }
    );
    if (candidateResult !== null) {
      return candidateResult;
    }

    const fallbackCursor = initialCursor.fork();
    const fallbackAuxTokens = collectAuxTokens(fallbackCursor);
    const localGrammar = PipelineContentResolverMixin.prototype.buildLocalCandidateGrammar.call(
      this,
      fallbackCursor,
      token,
      fallbackAuxTokens,
      { forcePassive }
    );
    if ((entry.senses?.length ?? 0) > 1) {
      const resolvedEntry = resolveContext(entry, tokens, start, {
        grammar: localGrammar,
        final: true,
        contentMap: options.contentMap ?? null,
        lookups: this.lookups,
        numeric: this.numeric
      });
      if (firstTranslationCandidate(resolvedEntry) !== undefined) {
        entry = resolvedEntry;
      }
    }

    let members = laneBStagedCandidates(entry);
    if (members.length === 0) {
      entry = await synthesizeEntryWithResolver(this, token, null);
      members = laneBStagedCandidates(entry);
      if (members.length === 0) {
        throw new Error("synthetic entry must have a translation");
      }
    }
    const candidate = members[0]!.candidate;
    const koreanLemma = candidate.koreanLemma;
    const isPotential = isPotentialDerivation(entry);
    const [phaseResult, voice, hasNegative] = await PipelineContentResolverMixin.prototype.resolveContentPhases.call(
      this,
      initialCursor.fork(),
      token,
      pos0,
      entry,
      koreanLemma,
      isPotential,
      {
        forcePassive,
        trace,
        entryAuxMode: options.entryAuxMode ?? "normal"
      }
    );
    let renderPlan: RenderPlan | null = phaseResult.renderPlan ?? null;

    const translation = candidate.translation;
    const senseFrame = translation.senseFrame;
    if (
      token.dictionaryForm === "なる" &&
      candidate.koreanPos === 형용사 &&
      senseFrame !== undefined
    ) {
      renderPlan = stateAdjectiveNegativeRenderPlan(renderPlan);
    }
    if (translation.dropFirstPassiveAux === true && renderPlan !== null) {
      const rewrittenPlan = replaceLemmaRenderPlan(renderPlan, {
        koreanLemma: candidate.koreanLemma,
        irregular: candidate.irregular,
        koreanPos: candidate.koreanPos,
        dropFirstPassiveAux: true
      });
      if (rewrittenPlan !== undefined) {
        renderPlan = rewrittenPlan;
      }
    }
    if (translation.dropFirstCausativeAux === true && renderPlan !== null) {
      const rewrittenPlan = replaceLemmaRenderPlan(renderPlan, {
        koreanLemma: candidate.koreanLemma,
        irregular: candidate.irregular,
        koreanPos: candidate.koreanPos,
        dropFirstCausativeAux: true
      });
      if (rewrittenPlan !== undefined) {
        renderPlan = rewrittenPlan;
      }
    }
    if (translation.dropFirstNegativeAux === true && renderPlan !== null) {
      const rewrittenPlan = replaceLemmaRenderPlan(renderPlan, {
        koreanLemma: candidate.koreanLemma,
        irregular: candidate.irregular,
        koreanPos: candidate.koreanPos,
        dropFirstNegativeAux: true
      });
      if (rewrittenPlan !== undefined) {
        renderPlan = rewrittenPlan;
      }
    }
    const renderPlanPolicy = phaseResult.renderPlanPolicy ?? "normal";
    const affixed = PipelineContentResolverMixin.prototype.applyTranslationAffixes.call(
      this,
      phaseResult,
      renderPlan,
      renderPlan === null ? phaseResult.korean : "",
      translation,
      entry,
      token,
      candidate.koreanPos
    );
    renderPlan = affixed.renderPlan;
    const korean = affixed.korean;

    const consumed = phaseResult.consumed;
    const koreanPos = translation.koreanPos ?? 명사;
    const resultVoice = isPotential && voice === "active" ? "potential" : voice;
    const producedSet = createSourceCandidateSet(members, { sharedConsumed: consumed, origin: "entry_reorder_lane" });
    if (isStagedSourceDomain(entry.senses)) {
      return new StagedContentResult(
        consumed,
        entry,
        stagedFusedSurfacePlan(renderPlan ?? null, korean, koreanLemma, candidate.koreanPos),
        resultVoice,
        PipelineContentResolverMixin.prototype.initialRareruReadings.call(this, token, fallbackAuxTokens, resultVoice ?? "active"),
        PipelineContentResolverMixin.initialNareruReadings(tokens, start, token, this.lookups),
        PipelineContentResolverMixin.initialDekiruReadings(tokens, start, n, token, fallbackAuxTokens, this.lookups),
        hasNegative,
        localGrammar.causative,
        localGrammar.causativePassive,
        localGrammar.requestTail,
        localGrammar.benefactiveTail,
        localGrammar.connectiveRole,
        phaseResult.benefactive,
        producedSet,
        phaseResult.warnings,
        renderPlanPolicy
      );
    }
    const sourceCandidates = resolveSourceCandidateSet(producedSet, {
      kind: "unstaged_domain",
      entrySenseCount: entry.senses?.length ?? 0,
      stagedPriorityDomain: false,
      verdict: members[0]!.identity
    });
    const laneBResult = new ResolvedContentResult(
      consumed,
      korean,
      koreanPos,
      entry,
      renderPlan ?? null,
      resultVoice,
      PipelineContentResolverMixin.prototype.initialRareruReadings.call(this, token, fallbackAuxTokens, resultVoice ?? "active"),
      PipelineContentResolverMixin.initialNareruReadings(tokens, start, token, this.lookups),
      PipelineContentResolverMixin.initialDekiruReadings(tokens, start, n, token, fallbackAuxTokens, this.lookups),
      hasNegative,
      localGrammar.causative,
      localGrammar.causativePassive,
      localGrammar.requestTail,
      localGrammar.benefactiveTail,
      localGrammar.connectiveRole,
      phaseResult.benefactive,
      sourceCandidates,
      phaseResult.warnings,
      renderPlanPolicy
    );
    return laneBResult;
  }

  async resolvePreEntryPhase(
    this: ContentResolverRuntimeAccess,
    initialCursor: TokenCursor<RuntimeHaruToken>,
    token: RuntimeHaruToken,
    pos0: number,
    entry: ContentResolverEntry,
    koreanLemma: string,
    isPotential: boolean,
    options: {
      readonly forcePassive?: boolean;
      readonly trace?: TraceCollector | null;
      readonly entryAuxMode?: "normal" | "head_metadata";
    } = {}
  ): Promise<PhaseStep> {
    const tokens = initialCursor.tokens;
    const start = initialCursor.origin;
    const n = initialCursor.end;
    const forcePassive = options.forcePassive === true;
    const emptyAux: AuxTokens = [];
    const initialState = new ContentPhaseState(1, start + 1, emptyAux);
    const preCtx = PipelineContentResolverMixin.makeContentCtx(
      initialCursor.fork(),
      token,
      pos0,
      entry,
      koreanLemma,
      initialState.auxTokens,
      initialState.consumed
    );
    const preEntryResolver: PreEntryResolver = { lookups: this.lookups };
    const trace = options.trace ?? null;
    const phaseResult = trace === null
      ? runPreEntryRules(preEntryResolver, preCtx, isPotential, this.lookups)
      : await PipelineContentResolverMixin.runRuleChain({
        rules: PRE_ENTRY_PHASE_RULES.map(([ruleName, rule]) =>
          [ruleName, () => rule(preEntryResolver, preCtx, isPotential, this.lookups)] as const
        ),
        phase: "pre_entry",
        tokenIdx: start,
        trace,
        detailFn: PipelineContentResolverMixin.traceDetailFromPhaseStep
      });
    if (phaseResult !== null) {
      return phaseResult;
    }

    const cursor = initialCursor;
    let auxTokens = collectAuxTokens(cursor);

    const normalizedAux = auxTokens.slice();
    const deruIndex = normalizedAux.findIndex((aux) => aux.dictionaryForm === "でる" && (aux.pos & POS0) === 助動詞);
    if (deruIndex >= 0) {
      const deru = normalizedAux[deruIndex];
      if (deru !== undefined) {
        normalizedAux[deruIndex] = { ...deru, dictionaryForm: "てる" };
        auxTokens = normalizedAux;
      }
    }

    const simpleAspectTail = (pos0 === 動詞)
      ? teDeContinuationRelationAt(tokens, cursor.pos, { consumers: ["content_resolver"], lookups: this.lookups })
      : null;
    const simpleAspectContinuation = simpleAspectTail === null ? undefined : tokens[simpleAspectTail.continuationIdx];
    if (
      simpleAspectTail?.continuationKind === "simple_aspect" &&
      simpleAspectTail.continuationIdx === cursor.pos + 1 &&
      (simpleAspectContinuation?.dictionaryForm === "いる" || simpleAspectContinuation?.dictionaryForm === "おる")
    ) {
      const connector = cursor.current();
      const iru = cursor.peek(1);
      if (connector !== undefined && iru !== undefined) {
        const synthTeru: RuntimeHaruToken = {
          surface: connector.surface + iru.surface,
          dictionaryForm: "てる",
          reading: "",
          dictionaryFormReading: "",
          pos: 助動詞 | (iru.pos & POS5),
          dictionaryId: 0
        };
        auxTokens = [...auxTokens, synthTeru];
        cursor.advance(2);
        const trailing = collectAuxTokens(cursor);
        auxTokens = [...auxTokens, ...trailing];
      }
    }

    const features = auxExtractFeatures(auxTokens, {
      lookups: this.lookups,
      verbConjType: token.pos & POS4,
      jpDictForm: token.dictionaryForm,
      forcePassive
    });
    const voice = PipelineContentResolverMixin.featuresToVoice(features);
    const hasNegative = features.negative;
    const entryCandidate = firstTranslationCandidate(entry);
    const entryKoreanPos = entryCandidate?.koreanPos ?? 명사;
    if (options.trace !== undefined && options.trace !== null) {
      options.trace.record(new TraceEvent(start, "analysis", "feature_extract", true, {
        aux: auxTokens.map((aux) => PipelineContentResolverMixin.traceAuxToken(aux)),
        voice,
        has_negative: hasNegative
      }));
    }

    const pass2NegQuestionRule = (): PhaseStep | null => {
      if (auxTokens.length === 0 || entryKoreanPos !== 동사 || cursor.pos >= cursor.end) {
        return null;
      }
      if (kaMarkerRelationAt(tokens, cursor.pos, ["content_resolver"])?.particleSubtype1 !== 終助詞) {
        return null;
      }
      const kaNext = cursor.pos + 1;
      if (
        kaNext < cursor.end &&
        ((tokens[kaNext]?.pos ?? 0) & POS0) === 助詞 &&
        isKanaQuestionNaParticleSurface(tokens[kaNext])
      ) {
        return null;
      }
      const negIndices: number[] = [];
      let teruIdx: number | null = null;
      let hasPastAfterNeg = false;
      let hasConjecture = false;
      let negSeen = false;
      auxTokens.forEach((aux, index) => {
        const pos4 = aux.pos & POS4;
        const pos5 = aux.pos & POS5;
        if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ) {
          negIndices.push(index);
          negSeen = true;
        } else if (aux.dictionaryForm === "てる") {
          teruIdx = index;
        } else if (negSeen && pos4 === 助動詞_タ) {
          hasPastAfterNeg = true;
        } else if ((pos4 === 助動詞_ダ || pos4 === 助動詞_デス) && (pos5 & POS5A) === 意志推量形_) {
          hasConjecture = true;
        }
      });

      if (negIndices.length === 0 || hasPastAfterNeg || hasConjecture) {
        return null;
      }
      const hasPolite = auxTokens.some((aux) => (aux.pos & POS4) === 助動詞_マス);

      const sfpType = teruIdx !== null ? "neg_confirm_q" : hasPolite ? "neg_invite_q" : "neg_plain_q";
      const stripIndices = new Set(negIndices);

      if (teruIdx !== null) {
        stripIndices.add(teruIdx);
      }
      const cleanAux = auxTokens.filter((_aux, index) => !stripIndices.has(index));
      let total = cursor.consumed + 1;
      const qAfter = start + total;
      if (
        qAfter < n &&
        contentQuestionOrPeriodAt(tokens, qAfter)
      ) {
        total += 1;
      }
      const negQuestionPlan: LemmaRealization = {
        kind: "lemma",
        entry,
        koreanLemma,
        koreanPos: entryKoreanPos,
        irregular: metadataIrregular(entry, koreanLemma) ?? null,
        auxTokens: runtimeTokens(cleanAux),
        sfp: sfpType,
        jpDictForm: token.dictionaryForm,
        forcePassive,
        ...((token.pos & POS4) === 0 ? {} : { verbConjType: token.pos & POS4 })
      };
      return new PhaseStep(
        new ContentPhaseState(total, start + total, auxTokens),
        new RuleResult(
          total,
          "",
          true,
          composePredicateWithSuffix(negQuestionPlan, "?", { koreanPos: entryKoreanPos })
        ),
        voice,
        true
      );
    };

    const pass2PoliteQuestionRule = (): PhaseStep | null => {
      if (auxTokens.length === 0 || cursor.pos >= cursor.end) {
        return null;
      }
      if (kaMarkerRelationAt(tokens, cursor.pos, ["content_resolver"])?.particleSubtype1 !== 終助詞) {
        return null;
      }
      if (auxHasNegation(auxTokens)) {
        return null;
      }
      if (
        cursor.pos + 1 < cursor.end &&
        ((cursor.peek(1)?.pos ?? 0) & POS0) === 助詞 &&
        isKanaQuestionNaParticleSurface(cursor.peek(1))
      ) {
        return null;
      }
      const hasPolite = auxHasPolite(auxTokens);
      if (!hasPolite || entryKoreanPos === 부사) {
        return null;
      }
      const functionalChunks = splitFunctionalAuxChunks(auxTokens);
      const stutterChunks = functionalChunks !== null && !isNormalFunctionalChain(functionalChunks) ? functionalChunks : null;
      const effectiveAux = stutterChunks !== null ? stutterChunks[0] ?? [] : auxTokens;
      let total = cursor.consumed + 1;
      const qAfter = start + total;
      if (
        qAfter < n &&
        contentQuestionOrPeriodAt(tokens, qAfter)
      ) {
        total += 1;
      }
      const irregular = metadataIrregular(entry, koreanLemma) ?? null;
      if (stutterChunks === null) {
        const politeQuestionPlan: LemmaRealization = {
          kind: "lemma",
          entry,
          koreanLemma,
          koreanPos: entryKoreanPos,
          irregular,
          auxTokens: runtimeTokens(effectiveAux),
          sfp: "polite_q",
          jpDictForm: token.dictionaryForm,
          forcePassive,
          ...((token.pos & POS4) === 0 ? {} : { verbConjType: token.pos & POS4 }),
          ...(isPotential || voice === "potential" ? { voice: "potential" as const } : voice === "passive" ? { voice: "passive" as const } : {})
        };
        return new PhaseStep(
          new ContentPhaseState(total, start + total, auxTokens),
          new RuleResult(
            total,
            "",
            true,
            composePredicateWithSuffix(politeQuestionPlan, "?", { koreanPos: entryKoreanPos })
          ),
          voice,
          hasNegative
        );
      }
      return new PhaseStep(
        new ContentPhaseState(total, start + total, auxTokens),
        new RuleResult(total, "", true, {
          kind: "functionalChainResidual",
          koreanLemma,
          irregular,
          koreanPos: entryKoreanPos,
          chunks: stutterChunks.map((chunk) => runtimeTokens(chunk)),
          question: true,
          jpDictForm: token.dictionaryForm,
          verbConjType: token.pos & POS4,
          forcePassive
        }, "functional_chain_residual"),
        voice,
        hasNegative
      );
    };

    const pass2Result = await PipelineContentResolverMixin.runRuleChain({
      rules: [
        [PASS2_NEG_QUESTION_RULE_NAME, pass2NegQuestionRule],
        [PASS2_POLITE_QUESTION_RULE_NAME, pass2PoliteQuestionRule]
      ],
      phase: "pre_entry",
      tokenIdx: start,
      trace: options.trace ?? null,
      detailFn: PipelineContentResolverMixin.traceDetailFromPhaseStep
    });
    if (pass2Result !== null) {
      return pass2Result;
    }

    const state = new ContentPhaseState(cursor.consumed, cursor.pos, auxTokens);
    const contentCtx = PipelineContentResolverMixin.makeContentCtx(
      cursor.fork(),
      token,
      pos0,
      entry,
      koreanLemma,
      state.auxTokens,
      state.consumed,
      { forcePassive }
    );
    const tailResult = (options.entryAuxMode ?? "normal") === "head_metadata"
      ? await PipelineContentResolverMixin.prototype._resolveHeadMetadataTailPhase.call(this, contentCtx, isPotential, options.trace ?? null)
      : await PipelineContentResolverMixin.prototype._resolveEntryAuxPhase.call(this, contentCtx, isPotential, options.trace ?? null);
    return new PhaseStep(
      state,
      contentRuleResultFromLike(tailResult),
      voice,
      hasNegative
    );
  }

  async resolveContentPhases(
    this: ContentResolverRuntimeAccess,
    cursor: TokenCursor<RuntimeHaruToken>,
    token: RuntimeHaruToken,
    pos0: number,
    entry: ContentResolverEntry,
    koreanLemma: string,
    isPotential: boolean,
    options: {
      readonly forcePassive?: boolean;
      readonly trace?: TraceCollector | null;
      readonly entryAuxMode?: "normal" | "head_metadata";
    } = {}
  ): Promise<readonly [result: RuleResult, voice: Voice | null, hasNegative: boolean]> {
    const preEntryStep = await PipelineContentResolverMixin.prototype.resolvePreEntryPhase.call(
      this,
      cursor,
      token,
      pos0,
      entry,
      koreanLemma,
      isPotential,
      {
        forcePassive: options.forcePassive === true,
        trace: options.trace ?? null,
        entryAuxMode: options.entryAuxMode ?? "normal"
      }
    );
    if (preEntryStep.result === null) {
      throw new Error("entry phase must resolve a result");
    }
    return [preEntryStep.result, preEntryStep.voice, preEntryStep.hasNegative];
  }
}

const CONTENT_RESOLVER_RULE_ADAPTER_BRIDGE: ContentResolverRuleAdapterBridge = {
  sahenInfoFromRuntime: (resolver, tokens, start) =>
    sahenInfoFromRuntime(resolver, tokens, start),
  resolveYoudaCase: (resolver, ctx, options) =>
    PipelineContentResolverMixin.prototype._resolveYoudaCase.call(resolver, ctx, options ?? {}),
  resolveAdverbialAdjectiveCase: async (resolver, ctx) =>
    await PipelineContentResolverMixin.prototype._resolveAdverbialAdjectiveCase.call(resolver, ctx)
};

function pythonRuleName(functionName: string): string {
  return functionName
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function runPreEntryRules(
  resolver: PreEntryResolver,
  ctx: ContentCtx,
  isPotential: boolean,
  lookups: LookupTables
): PhaseStep | null {
  for (const [, rule] of PRE_ENTRY_PHASE_RULES) {
    const result = rule(resolver, ctx, isPotential, lookups);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

async function runEntryAuxRules(
  resolver: ContentResolverEntryAuxResolver,
  ctx: ContentCtx,
  isPotential: boolean,
  lookups: LookupTables
): Promise<RuleResultLike | null> {
  for (const [, rule] of ENTRY_AUX_PHASE_RULES) {
    const result = await rule(resolver, ctx, isPotential, lookups);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

async function runEntryTailPreSfpRules(
  resolver: TailResolver,
  ctx: ContentCtx,
  isPotential: boolean,
  lookups: LookupTables
): Promise<RuleResultLike | null> {
  for (const [, rule] of ENTRY_TAIL_PRE_SFP_RULES) {
    const result = await rule(resolver, ctx, isPotential, lookups);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

async function runEntryTailPostSfpRules(
  resolver: TailResolver,
  ctx: ContentTerminalCtx,
  isPotential: boolean,
  lookups: LookupTables
): Promise<RuleResultLike | null> {
  for (const [, rule] of ENTRY_TAIL_POST_SFP_RULES) {
    const result = await rule(resolver, ctx, isPotential, lookups);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

async function translateTokenWithResolver(
  resolver: ContentResolverRuntimeAccess,
  token: RuntimeHaruToken
): Promise<readonly (readonly [koreanLemma: string, entry: ContentResolverEntry | undefined])[]> {
  const translated = await resolver.dictionary?.translateToken?.(token);
  if (translated !== undefined) {
    return translated;
  }
  const relaxed = await resolver.dictionary?.lookupTokenRelaxed?.(token);
  const entry = relaxed
    ?? (await resolver.dictionary?.lookup(token.dictionaryForm, token.dictionaryFormReading ?? token.reading ?? "", token.pos))
    ?? undefined;
  const korean = entry?.senses?.[0]?.korean;
  return [[korean ?? token.surface, entry ?? undefined]];
}

async function renderSplitFallbackWithResolver(resolver: ContentResolverRuntimeAccess, token: RuntimeHaruToken): Promise<string | null> {
  return (await resolver._renderSplitFallback?.(token)) ?? null;
}

async function synthesizeEntryWithResolver(
  resolver: ContentResolverRuntimeAccess,
  token: RuntimeHaruToken,
  nextToken: RuntimeHaruToken | null
): Promise<ContentResolverEntry> {
  const result = await resolver._synthesizeEntry?.(token, { nextToken });
  if (result !== undefined) {
    return result;
  }
  const koreanPos = JP_POS_TO_KR_NUM.get(token.pos & POS0) ?? 명사;
  return {
    dictionaryForm: token.dictionaryForm,
    senses: [{ korean: token.surface, koreanPos }],
    synthetic: true,
    syntheticReason: "content_resolver_fallback"
  };
}

function laneBStagedCandidates(entry: ContentResolverEntry): readonly StagedCandidate<TranslationCandidate>[] {
  return iterTranslationCandidates(entry).map((candidate) => stagedCandidate(candidate, "unknown"));
}

function stagedFusedSurfacePlan(
  renderPlan: RenderPlan | null,
  korean: string,
  koreanLemma: string,
  koreanPos: number
): RenderPlan | null {
  if (renderPlan !== null || korean === "" || korean === koreanLemma) {
    return renderPlan;
  }
  return { kind: "fixedText", text: korean, koreanPos, fusedFromLemma: true };
}

function laneACandidateChainWinner(
  set: SourceCandidateSet<TranslationCandidate>
): StagedCandidate<TranslationCandidate> | undefined {
  const members = set.members;
  const candidates = members.map((member) => member.candidate);
  const matches = members.map((member) => member.sourceCondition);
  const deferredUnknownIdx = matches.findIndex((match, index) => {
    const translation = candidates[index]?.translation;
    return match === "unknown" &&
      translation !== undefined &&
      translationNeedsFinalClauseLayoutForSourceMatch(translation);
  });
  const firstMatchPriorityGroup = firstMatchPriorityGroupIndex(candidates, matches, "match");
  const sourceMatchIdx = matches.findIndex((match, index) => {
    const translation = candidates[index]?.translation;
    return match === "match" &&
      (firstMatchPriorityGroup === null || contentCandidatePriorityGroup(candidates[index]!) === firstMatchPriorityGroup) &&
      translation !== undefined &&
      translationHasSourceFrameConditions(translation);
  });
  const firstMatchIdx = matches.findIndex((match, index) =>
    match === "match" &&
    (firstMatchPriorityGroup === null || contentCandidatePriorityGroup(candidates[index]!) === firstMatchPriorityGroup)
  );
  const derivationMatchIdx = firstMatchIdx >= 0
    ? contentCandidateDerivationOrderIndex(candidates, matches, "match")
    : null;
  const selectedIdx = sourceMatchIdx >= 0
    ? sourceMatchIdx
    : derivationMatchIdx !== null
      ? derivationMatchIdx
      : firstMatchIdx >= 0
        ? firstMatchIdx
        : Math.max(0, deferredUnknownIdx);
  return members[selectedIdx];
}

function serializeReadingSet<T extends string>(readings: ReadonlySet<T>): string | readonly string[] | null {
  if (readings.size === 0) {
    return null;
  }
  const values = Array.from(readings).sort();
  return values.length === 1 ? values[0]! : values;
}
