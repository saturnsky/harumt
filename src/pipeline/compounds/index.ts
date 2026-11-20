import { legacySurfaceCompositionPlan } from "../../types/render-plan.js";
import { attachTeConnectiveBoundaryChoice } from "../rendering/render-plan-rewrite.js";
import { conjugate, irregularType, type IrregularType } from "../../generator/conjugator.js";
import { adverbialToCapableKeijoujiHost } from "../semantics/tari-adverbial-marker.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import { selectParticle } from "../../generator/particles.js";
import type { PatternEntry } from "../../dictionary/pattern.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { AttributiveRealization, ConjugatedLemmaPlan, PlanTextSource, RenderPlan, StemDerivation, StemDerivationOp } from "../../types/render-plan.js";
import type { TranslationCandidate } from "../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import {
  detectNaitoBridgeFromAux,
  isConditionalFollower,
  isObligationMarker,
  matchObligationTail,
  matchTerminalNaitoAfterTo
} from "../semantics/colloquial-obligation.js";
import { firstTranslationCandidate } from "../candidate-runtime.js";
import { isFallbackCandidate } from "../commitment/span-evidence.js";
import { deriveStem, verifiedStemDerivation } from "../rendering/stem-derivation.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { PASSTHROUGH_POS_BITS } from "../fallback/index.js";
import { resolveContext } from "../context.js";
import { hasRentaikei, isTameReasonHeadContext, nominalAttributiveEvidenceFrom, resolveAttributive, selectPlainVerbAttributiveEnding } from "../attributive.js";
import { auxHasNegation, auxHasPast, auxHasPolite, collectAuxTokens, isVerbLemma, runtimeToken, type MatcherToken, runtimeTokens } from "../matchers.js";
import { matchClauseConnector } from "../semantics/te-connective.js";
import { matchSouDaHearsay } from "../semantics/souda.js";
import { matchCopulaNegation } from "../rules/copula.js";
import { classifyFollowConnective, detectCopulaDe, detectKamoShirenaiAfterChain, detectNoCopulaChain, detectSfp } from "../semantics/grammar-runtime.js";
import { CONTENT_POS_BITS, KAMO_SHIRENAI_LEMMAS } from "../lookup-tables.js";
import type { LookupTables } from "../lookup-tables.js";
import { isQuotativeToTokensWide, matchNoNiConcessiveConnectiveStart } from "../semantics/helpers.js";
import { TokenCursor } from "../token-cursor.js";
import { adjustTeConnectiveEnding, buildSyntheticAux, postverbAspectOperatorKind, postverbPatternRequiresTailRootOwnership } from "../pattern-runtime.js";
import { buildUnsupportedPostAuxWarning, matchRemovedPostAuxPattern } from "../rules/postaux-unsupported.js";
import type { PostAuxPatternLike } from "../rules/postaux-types.js";
import {
  buildVirtualCompoundToken,
  type CompoundVerbCandidate,
  findCompoundVerbCandidatesAt,
  knownResolverHint,
  lookupNominalRenyouVerbHead,
  lookupVirtualCompoundEntry
} from "./compound-verbs.js";
import {
  isKoroTemporalNiHeadContext,
  isTokoroConcessiveDeHeadContext,
  isTokoroResultHeadContext,
  isTokoroTemporalDeHeadContext
} from "../semantics/tokoro.js";
import { isAdverbial } from "../predicate-helpers.js";
import { longNegativeLemma } from "../rendering/negative-polish.js";
import { collapseTeIruAuxTokens, matchSimpleTeIru } from "../semantics/te-iru.js";
import { derivationalSuffixProfileFor, predicateSuffixKindForDictionaryForm } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import {
  caseParticleMarkerRelationForToken,
  copulaDeMarkerRelationForToken,
  copulaNiMarkerRelationForToken,
  kaMarkerRelationAt,
  predicateNominalizerRelationForToken
} from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { isTeConnectiveToken, teDeContinuationRelationAt } from "../head-tail/tail/postverb-tail-classifier.js";

import {
  POS0,
  POS01,
  POS1,
  POS4,
  POS5,
  POS5A,
  isNaAdjCapable,
  isSahenCapableNominal,
  pos0in,
  posToString,
  サ行変格,
  形状詞,
  形容詞0,
  語幹_,
  終助詞,
  助詞,
  助動詞,
  助動詞_ダ,
  助動詞_デス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  助動詞_レル,
  接頭辞,
  代名詞,
  動詞,
  動詞_非自立可能,
  非自立可能,
  副詞,
  副助詞,
  名詞,
  連体形_,
  連体詞,
  連用形_,
  接尾辞_形容詞的,
  接尾辞_名詞的,
  동사,
  명사,
  부사,
  접미사,
  형용사,
  NOMINAL_BITS,
  接尾辞_動詞的
} from "../../types/pos.js";
import { type CompoundResult, type CompoundCandidateDerivation, type CompoundHeadCandidate, entryWithOnlyCandidate, compoundSourceCandidates, compoundResultFromCandidates, compoundResultFromHeadCandidates, compoundResultFromStateHeadCandidates, compoundResultFromVerbAdjSuffixPairs, compoundDerivationFromResult, compoundHeadCandidatesFromEntry, compoundStateHeadCandidatesFromEntry, prioritizeHeadCandidates, prioritizeStateHeadCandidates, prioritizeSourceCandidates } from "./compound-translation-candidates.js";
import { isAuxiliaryVerbToken, isKireruToken, isSugiruAuxiliaryToken, isKiruToken, isOeruAuxiliaryToken, isSahenProductiveFollowingToken, isTailOnlyProductiveFollowingToken, isUruPotentialTailToken, isColloquialIntensiveTailToken, isReciprocalAuTailToken, isSahenSuruRenyou } from "./compound-tail-tokens.js";
const ATTRIBUTIVE_HEAD_BITS = (1 << 名詞) | (1 << 代名詞) | (1 << 形容詞0) | (1 << 連体詞);
const NOMINAL_HEAD_BITS = (1 << 名詞) | (1 << 代名詞);

function predicateSuffixKoreanBase(
  dictionaryForm: string
): { readonly koreanLemma: string; readonly irregular: IrregularType | null; readonly koreanPos: typeof 형용사 } | null {
  const profile = derivationalSuffixProfileFor(dictionaryForm, "verbal_predicate") ??
    derivationalSuffixProfileFor(dictionaryForm, "adjectival_predicate");
  if (profile?.finalLemma === undefined || profile.sourcePos !== "接尾辞-形容詞的") {
    return null;
  }
  return {
    koreanLemma: profile.finalLemma,
    irregular: profile.irregular ?? null,
    koreanPos: 형용사
  };
}

interface CompoundNominalPrefixCandidate {
  readonly head: CompoundHeadCandidate;
  readonly nounKorean: string;
  readonly objPrefix: string;
  readonly giPrefix: string;
}

export interface CompoundStatePredicateHeadCandidate {
  readonly source: TranslationCandidate;
  readonly entry: MorphemeEntry;
  readonly token: MatcherToken;
  readonly continuationLemma: string;
  readonly continuationIrregular: IrregularType | null;
  readonly continuationPos: number;
  readonly onsetLemma: string;
  readonly onsetIrregular: IrregularType | null;
  readonly onsetPos: number;
  readonly continuationDerivation: StemDerivation | null;
}

function isDerivedFromHadaPredicateAdverb(korean: string): boolean {
  return korean.endsWith("히") || korean.endsWith("이");
}

function buildMissingAdjectivalSuffixWarning(start: number, suffixTok: MatcherToken): Warning {
  return {
    type: "render_fallback",
    severity: "error",
    opKind: "verb_adjectival_suffix_missing_entry",
    span: { start, end: start + 2 },
    message: `productive verb adjectival suffix used surface fallback; suffix=${suffixTok.surface}`
  };
}

function stateChangeStemDerivation(
  headCandidate: CompoundStatePredicateHeadCandidate,
  foldedLemma: string,
  options: { readonly longNegativeApplied: boolean }
): StemDerivation | null {
  const base = headCandidate.continuationDerivation;
  if (base === null) {
    return null;
  }
  const ops: readonly StemDerivationOp[] = options.longNegativeApplied
    ? [...base.ops, "long_negative"]
    : base.ops;
  return verifiedStemDerivation(foldedLemma, base.host, ops);
}

function withStemDerivation(
  result: CompoundResult | null,
  derivation: StemDerivation | null
): CompoundResult | null {
  if (result === null || derivation === null) {
    return result;
  }
  const [consumed, korean, koreanPos, renderPlan, warnings, candidates] = result;
  if (renderPlan === null || renderPlan === undefined) {
    return result;
  }
  if (renderPlan.kind !== "lemma" && renderPlan.kind !== "attributive") {
    return result;
  }
  return [
    consumed,
    korean,
    koreanPos,
    { ...renderPlan, stemDerivation: derivation },
    warnings ?? [],
    candidates ?? []
  ];
}

async function buildStatePredicateHeadFromEntry(
  dictionary: CompoundResolverDictionary,
  lookups: LookupTables,
  numeric: NumericTables,
  head: MatcherToken,
  tokens: readonly MatcherToken[],
  start: number,
  config: {
    readonly consumed: number;
    readonly candidateExtractor: (entry: MorphemeEntry) => TranslationCandidate | undefined;
    readonly callbackMapper: (
      sourceCandidate: TranslationCandidate,
      stateChange: string
    ) => Omit<CompoundStatePredicateHeadCandidate, "source" | "entry" | "token">;
    readonly origin: string;
    readonly naruToken: MatcherToken;
    readonly nonAdjectiveRealization: "state_change" | "identity";
  }
): Promise<StatePredicateHead | null> {
  let entry = await dictionary.lookupTokenRelaxed(head);
  if (entry === undefined || entry === null) {
    return null;
  }
  entry = resolveContext(entry, runtimeTokens(tokens), start, { final: false, lookups, numeric });
  const candidate = config.candidateExtractor(entry);
  const rawEntry = await dictionary.lookupTokenRelaxed(head);
  if (rawEntry === undefined || rawEntry === null) {
    return null;
  }
  const stateHeadCandidate = (sourceCandidate: TranslationCandidate) => {
    const stateChange = PipelineCompoundMixin.stateChangeLemma(
      sourceCandidate.koreanLemma,
      sourceCandidate.irregular,
      sourceCandidate.koreanPos
    );
    if (stateChange === null) {
      return null;
    }
    return config.callbackMapper(sourceCandidate, stateChange);
  };
  const identityHeadCandidate = (sourceCandidate: TranslationCandidate) => {
    if (sourceCandidate.koreanPos !== 동사) {
      return null;
    }
    return {
      continuationLemma: sourceCandidate.koreanLemma,
      continuationIrregular: sourceCandidate.irregular,
      continuationPos: 동사,
      onsetLemma: sourceCandidate.koreanLemma,
      onsetIrregular: sourceCandidate.irregular,
      onsetPos: 동사,
      continuationDerivation: null
    };
  };
  const admittedHeadCandidates = compoundStateHeadCandidatesFromEntry(rawEntry, head, (sourceCandidate) => {
    if (sourceCandidate.koreanPos === 형용사) {
      return stateHeadCandidate(sourceCandidate);
    }
    return config.nonAdjectiveRealization === "identity"
      ? identityHeadCandidate(sourceCandidate)
      : stateHeadCandidate(sourceCandidate);
  });
  if (!admittedHeadCandidates.some((headCandidate) => headCandidate.source.koreanPos === 형용사)) {
    return null;
  }
  const headCandidates = prioritizeStateHeadCandidates(admittedHeadCandidates, candidate);
  const selected = headCandidates[0];
  if (selected === undefined) {
    return null;
  }
  if (
    compoundSourceCandidates(rawEntry).some(isFallbackCandidate) &&
    !headCandidates.some((headCandidate) => isFallbackCandidate(headCandidate.source))
  ) {
    return null;
  }
  return new StatePredicateHead(
    config.consumed,
    head,
    rawEntry,
    selected.continuationLemma,
    selected.continuationIrregular,
    selected.continuationPos,
    selected.onsetLemma,
    selected.onsetIrregular,
    selected.onsetPos,
    config.origin,
    (config.naruToken.pos & POS4) || null,
    headCandidates
  );
}

export class PredicateRenyouHead {
  constructor(
    readonly consumed: number,
    readonly token: MatcherToken,
    readonly entry: MorphemeEntry,
    readonly koreanLemma: string,
    readonly irregular: IrregularType | null,
    readonly koreanPos: number,
    readonly jpPos0: number,
    readonly verbConjType: number | null = null,
    readonly headCandidates: readonly CompoundHeadCandidate[] = []
  ) { }
}

export class StatePredicateHead {
  constructor(
    readonly consumed: number,
    readonly token: MatcherToken,
    readonly entry: MorphemeEntry | null,
    readonly continuationLemma: string,
    readonly continuationIrregular: IrregularType | null,
    readonly continuationPos: number,
    readonly onsetLemma: string,
    readonly onsetIrregular: IrregularType | null,
    readonly onsetPos: number,
    readonly shapeKind: string,
    readonly verbConjType: number | null = null,
    readonly headCandidates: readonly CompoundStatePredicateHeadCandidate[] = []
  ) { }
}

export interface CompoundResolverDictionary {
  lookupTokenRelaxed(token: MatcherToken): Promise<MorphemeEntry | null | undefined>;
  lookup(dictionaryForm: string, reading: string, pos: number | string | readonly string[]): Promise<MorphemeEntry | null | undefined>;
}

export interface PipelineCompoundResolver {
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly patterns: {
    matchPostVerb(tokens: readonly RuntimeHaruToken[], pos: number): PatternEntry | undefined;
    matchPostAux(tokens: readonly RuntimeHaruToken[], pos: number, auxTokens?: readonly RuntimeHaruToken[]): PatternEntry | undefined;
  };
  readonly dictionary: CompoundResolverDictionary;
  extractRenyouPredicateHead(
    this: PipelineCompoundResolver,
    cursor: TokenCursor<MatcherToken>
  ): Promise<PredicateRenyouHead | null>;
  resolveCompoundTail(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    cursor: TokenCursor<MatcherToken>,
    koreanLemma: string,
    irregular: IrregularType | null,
    koreanPos: number,
    auxTokens: readonly MatcherToken[],
    contentToken: MatcherToken,
    options?: ResolveCompoundTailOptions
  ): CompoundResult | null;
}

export interface ResolveCompoundTailOptions {
  readonly rentaiCheckToken?: MatcherToken | null;
  readonly rentaiPresent?: boolean;
  readonly verbConjType?: number | null;
  readonly entry?: MorphemeEntry | null;
  readonly jpPos0?: number;
  readonly prefix?: string;
  readonly prefixSource?: PlanTextSource | null;
  readonly tailLemmaMode?: boolean;
  readonly voice?: "active" | "passive" | "potential";
}

export interface BuildPredicatePlanOptions {
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly auxTokens: readonly MatcherToken[];
  readonly auxiliaryLemma: string;
  readonly prefix?: string;
  readonly prefixSource?: PlanTextSource | null;
  readonly connective?: string | null;
  readonly sfp?: string | null;
  readonly verbConjType?: number | null;
  readonly voice?: "active" | "passive" | "potential";
}

export interface BuildAttributivePlanOptions {
  readonly cursor: TokenCursor<MatcherToken>;
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly auxTokens: readonly MatcherToken[];
  readonly contentToken: MatcherToken;
  readonly fallbackToken?: MatcherToken | null;
  readonly contentIdx?: number | null;
  readonly forceNominalHead?: boolean;
  readonly tailLemmaMode?: boolean;
  readonly voice?: "active" | "passive" | "potential";
}

interface CompoundTailInput {
  readonly cursor: TokenCursor<MatcherToken>;
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly auxTokens: readonly MatcherToken[];
  readonly contentToken: MatcherToken;
  readonly options: ResolveCompoundTailOptions;
  readonly tokens: TokenCursor<MatcherToken>["tokens"];
  readonly after: number;
  readonly n: number;
  readonly consumed: number;
  readonly voice: NonNullable<ResolveCompoundTailOptions["voice"]>;
}

type CompoundCopulaNegationMatch = { readonly match: NonNullable<ReturnType<typeof matchCopulaNegation>>; readonly consumed: number };

const NO_COMPOUND_SHAPE: unique symbol = Symbol("compound tail: shape not applicable");

export class PipelineCompoundMixin {
  static fixedLemmaPlan(koreanLemma: string, koreanPos: number, options: { readonly irregular?: IrregularType | null } = {}): RenderPlan {
    return {
      kind: "lemma",
      entry: null,
      koreanLemma,
      koreanPos,
      irregular: options.irregular ?? null,
      auxTokens: []
    };
  }

  static wrapCompoundSurface(
    surface: string,
    koreanPos: number,
    options: {
      readonly prefix?: string;
      readonly suffix?: string;
      readonly prefixSource?: PlanTextSource | null;
      readonly suffixSource?: PlanTextSource | null;
    } = {}
  ): RenderPlan {
    return legacySurfaceCompositionPlan("candidate_compound", {
      korean: surface,
      koreanPos,
      ...(options.prefix === undefined || options.prefix.length === 0 ? {} : { prefix: options.prefix }),
      ...(options.suffix === undefined || options.suffix.length === 0 ? {} : { suffix: options.suffix }),
      ...(options.prefixSource === undefined || options.prefixSource === null ? {} : { prefixSource: options.prefixSource }),
      ...(options.suffixSource === undefined || options.suffixSource === null ? {} : { suffixSource: options.suffixSource })
    });
  }

  static composePrefixWithPredicate(
    prefix: RenderPlan | string | null | undefined,
    predicate: RenderPlan,
    options: {
      readonly koreanPos: number;
      readonly prefixSource?: PlanTextSource | null;
      readonly prefixCarrierAuxiliaryLemma?: string | null;
    }
  ): RenderPlan {
    return legacySurfaceCompositionPlan("candidate_compound", {
      korean: "",
      koreanPos: options.koreanPos,
      ...(prefix === undefined || prefix === null || prefix === "" ? {} : { prefix }),
      suffix: predicate,
      ...(options.prefixSource === undefined || options.prefixSource === null ? {} : { prefixSource: options.prefixSource }),
      ...(options.prefixCarrierAuxiliaryLemma === undefined || options.prefixCarrierAuxiliaryLemma === null ? {} : { prefixCarrierAuxiliaryLemma: options.prefixCarrierAuxiliaryLemma }),
      rewritePrefixOnLemmaReplace: true,
      rewriteSuffixOnLemmaReplace: false,
      rewritePrefixOnConnectiveReplace: false,
      rewriteSuffixOnConnectiveReplace: true
    });
  }

  static composePredicateWithSuffix(
    predicate: RenderPlan,
    suffix: RenderPlan | string,
    options: {
      readonly koreanPos: number;
      readonly suffixSource?: PlanTextSource | null;
    }
  ): RenderPlan {
    return legacySurfaceCompositionPlan("candidate_compound", {
      korean: "",
      koreanPos: options.koreanPos,
      prefix: predicate,
      suffix,
      ...(options.suffixSource === undefined || options.suffixSource === null ? {} : { suffixSource: options.suffixSource }),
      rewritePrefixOnLemmaReplace: false,
      rewriteSuffixOnLemmaReplace: false,
      rewritePrefixOnConnectiveReplace: true,
      rewriteSuffixOnConnectiveReplace: false
    });
  }

  static rulePlanSource(text: string, note: string): PlanTextSource {
    return {
      kind: "rule_fixed",
      text,
      note
    };
  }

  static entryPlanSource(token: MatcherToken, entry: MorphemeEntry, text: string, options: { readonly note?: string | null } = {}): PlanTextSource {
    const candidate = firstTranslationCandidate(entry);
    const translation = candidate?.translation;
    const translationWithPos = translation as (typeof translation & { readonly pos?: number }) | undefined;
    return {
      kind: entry.synthetic === true ? "oov" : "dictionary",
      text,
      jpSurface: token.surface,
      jpDictionaryForm: token.dictionaryForm,
      ...(translationWithPos?.koreanPos === undefined && translationWithPos?.pos === undefined ? {} : { koreanPos: translationWithPos.koreanPos ?? translationWithPos.pos }),
      matchReason: entry.matchReason ?? null,
      note: options.note || entry.syntheticReason || null
    };
  }

  async processVerbAdjSuffix(this: PipelineCompoundResolver, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const verbHead = await this.extractRenyouPredicateHead(cursor);
    if (verbHead === null) {
      return null;
    }
    const suffixIndex = start + verbHead.consumed;
    if (suffixIndex >= n || ((tokens[suffixIndex]?.pos ?? 0) & POS01) !== 接尾辞_形容詞的) {
      return null;
    }
    const suffixTok = tokens[suffixIndex]!;
    const verbCandidates = verbHead.headCandidates;

    const suffixCandidatesForEntry = (entry: MorphemeEntry): readonly TranslationCandidate[] =>
      compoundSourceCandidates(entry, {
        filter: (candidate) =>
          candidate.koreanPos === 동사 ||
          candidate.koreanPos === 형용사 ||
          (candidate.koreanPos === 접미사 && candidate.koreanLemma.endsWith("다"))
      });
    const suffixCandidates = async (): Promise<readonly TranslationCandidate[]> => {
      const validSuffix = (candidate: TranslationCandidate): boolean =>
        candidate.koreanPos === 동사 ||
        candidate.koreanPos === 형용사 ||
        (candidate.koreanPos === 접미사 && candidate.koreanLemma.endsWith("다"));
      const suffixEntry = await this.dictionary.lookupTokenRelaxed(suffixTok);
      if (suffixEntry === undefined || suffixEntry === null) {
        return [];
      }
      let candidates = compoundSourceCandidates(suffixEntry, { filter: validSuffix });
      if (candidates.length === 0 && suffixTok.dictionaryForm !== suffixTok.surface) {
        const lemmaEntry = await this.dictionary.lookup(
          suffixTok.dictionaryForm,
          suffixTok.dictionaryFormReading ?? "",
          suffixTok.pos
        );
        if (lemmaEntry !== undefined && lemmaEntry !== null) {
          candidates = suffixCandidatesForEntry(lemmaEntry);
        }
      }
      return candidates;
    };

    const rawSuffixEntry = await this.dictionary.lookupTokenRelaxed(suffixTok);
    if (rawSuffixEntry === undefined || rawSuffixEntry === null) {
      const warning = buildMissingAdjectivalSuffixWarning(start, suffixTok);
      return compoundResultFromHeadCandidates(verbCandidates, (verbCandidate) => {
        const verbTranslation = verbCandidate.source.translation;
        const giForm = `${verbTranslation.koreanPrefix ?? ""}${conjugate(verbCandidate.koreanLemma, irregularType(verbCandidate.irregular), "기")}${verbTranslation.koreanSuffix ?? ""}`;
        const giFormSource = PipelineCompoundMixin.entryPlanSource(verbCandidate.token, entryWithOnlyCandidate(verbCandidate.source), `${giForm} `, { note: "verb_gi_form" });
        const plan = PipelineCompoundMixin.wrapCompoundSurface(suffixTok.surface, 형용사, {
          prefix: `${giForm} `,
          prefixSource: giFormSource
        });
        return {
          result: [verbHead.consumed + 1, "", 형용사, plan, [warning]],
          koreanLemma: verbCandidate.koreanLemma,
          koreanPos: 형용사,
          irregular: null
        };
      });
    }
    const suffixCandidateList = await suffixCandidates();
    if (suffixCandidateList.length === 0) {
      return null;
    }
    const pairCandidates = verbCandidates.flatMap((verbCandidate) =>
      suffixCandidateList.map((suffixCandidate) => ({ verb: verbCandidate, suffix: suffixCandidate }))
    );

    const auxTokens = cursor.lookahead(suffixIndex + 1 - cursor.pos, collectAuxTokens);
    const nominalizerToken = tokens[suffixIndex + 1];
    const nominalizedSa = (
      auxTokens.length === 0 &&
      (suffixTok.pos & POS5A) === 語幹_ &&
      nominalizerToken !== undefined &&
      (nominalizerToken.pos & POS01) === 接尾辞_名詞的 &&
      nominalizerToken.dictionaryForm === "さ"
    );
    const consumed = verbHead.consumed + (nominalizedSa ? 2 : 1) + auxTokens.length;
    const headIdx = cursor.lookahead(start + consumed - cursor.pos, skipPrefixLocal);
    const headToken = headIdx < n ? tokens[headIdx] : undefined;
    const headPos0 = (headToken?.pos ?? 0) & POS0;

    return compoundResultFromVerbAdjSuffixPairs(pairCandidates, ({ verb: verbCandidate, suffix: suffixCandidate }) => {
      const suffixTranslation = suffixCandidate.translation;
      const predicateSuffixBase = predicateSuffixKoreanBase(suffixTok.dictionaryForm);
      const suffixKorean = predicateSuffixBase?.koreanLemma ?? suffixTranslation.korean;
      let suffixKoreanPos = predicateSuffixBase?.koreanPos ?? suffixTranslation.koreanPos ?? 형용사;
      if (suffixKoreanPos !== 동사 && suffixKoreanPos !== 형용사) {
        suffixKoreanPos = 형용사;
      }
      const suffixIrregular = predicateSuffixBase?.irregular ?? suffixTranslation.irregular ?? (suffixKorean === "쉽다" || suffixKorean === "어렵다" ? "ㅂ" : null);
      const suffixPlanEntry = entryWithOnlyCandidate(suffixCandidate);
      const verbTranslation = verbCandidate.source.translation;
      const giForm = `${verbTranslation.koreanPrefix ?? ""}${conjugate(verbCandidate.koreanLemma, irregularType(verbCandidate.irregular), "기")}${verbTranslation.koreanSuffix ?? ""}`;
      const phraseLemma = suffixKorean.endsWith("다") ? `${giForm} ${suffixKorean}` : null;
      const giFormSource = PipelineCompoundMixin.entryPlanSource(verbCandidate.token, entryWithOnlyCandidate(verbCandidate.source), `${giForm} `, { note: "verb_gi_form" });
      const isAttributive = (
        !nominalizedSa &&
        ((auxTokens.length > 0 && hasRentaikei(auxTokens[auxTokens.length - 1]!)) || hasRentaikei(suffixTok)) &&
        pos0in(headPos0, ATTRIBUTIVE_HEAD_BITS) &&
        (
          phraseLemma === null ||
          resolveAttributive(
            phraseLemma,
            suffixIrregular,
            suffixKoreanPos,
            auxTokens,
            suffixTok,
            {
              headNounToken: pos0in(headPos0, NOMINAL_BITS) ? headToken ?? null : null,
              tokens,
              contentIdx: start + 1,
              lookups: this.lookups
            }
          ) !== null
        )
      );

      let suffixPlan: RenderPlan;
      if (nominalizedSa && phraseLemma !== null) {
        suffixPlan = {
          kind: "conjugatedLemma",
          koreanLemma: phraseLemma,
          irregular: suffixIrregular,
          koreanPos: suffixKoreanPos,
          ending: "ㅁ/음"
        } satisfies ConjugatedLemmaPlan;
        return {
          result: [consumed, "", 명사, suffixPlan],
          koreanLemma: phraseLemma,
          koreanPos: 명사,
          irregular: null
        };
      }
      if (isAttributive) {
        if (phraseLemma !== null) {
          const headTokenForContext = pos0in(headPos0, NOMINAL_BITS) ? headToken ?? null : null;
          suffixPlan = {
            kind: "attributive",
            koreanLemma: phraseLemma,
            irregular: suffixIrregular,
            koreanPos: suffixKoreanPos,
            auxTokens: runtimeTokens(auxTokens),
            contentToken: suffixTok as RuntimeHaruToken,
            ...((headPos0 === 名詞) || (headPos0 === 代名詞) ? { headNounToken: headToken as RuntimeHaruToken } : {}),
            tameReasonHead: isTameReasonHeadContext(headTokenForContext, tokens, start + 1, this.lookups),
            tokoroResultHead: isTokoroResultHeadContext(headTokenForContext, tokens, start + 1, this.lookups),
            tokoroTemporalDeHead: isTokoroTemporalDeHeadContext(headTokenForContext, tokens, start + 1, this.lookups),
            koroTemporalNiHead: isKoroTemporalNiHeadContext(headTokenForContext, tokens, start + 1),
            tokoroConcessiveDeHead: isTokoroConcessiveDeHeadContext(headTokenForContext, tokens, start + 1, this.lookups)
          } satisfies AttributiveRealization;
        } else {
          suffixPlan = legacySurfaceCompositionPlan("candidate_compound", { korean: suffixKorean, koreanPos: suffixKoreanPos });
        }
        const compoundPlan = phraseLemma !== null
          ? suffixPlan
          : PipelineCompoundMixin.composePrefixWithPredicate(`${giForm} `, suffixPlan, {
            koreanPos: 형용사,
            prefixSource: giFormSource
          });
        return {
          result: [consumed, "", 형용사, compoundPlan],
          koreanLemma: phraseLemma ?? verbCandidate.koreanLemma,
          koreanPos: 형용사,
          irregular: phraseLemma === null ? null : suffixIrregular
        };
      }

      if (auxTokens.length > 0) {
        suffixPlan = phraseLemma !== null ? {
          kind: "lemma",
          entry: suffixPlanEntry,
          koreanLemma: phraseLemma,
          koreanPos: suffixKoreanPos,
          irregular: suffixIrregular,
          auxTokens: runtimeTokens(auxTokens)
        } : {
          kind: "lemma",
          entry: suffixPlanEntry,
          koreanLemma: suffixKorean,
          koreanPos: suffixKoreanPos,
          irregular: suffixIrregular,
          auxTokens: runtimeTokens(auxTokens)
        };
      } else if (suffixKorean.endsWith("다") && (suffixTok.pos & POS5A) === 連用形_) {
        suffixPlan = {
          kind: "conjugatedLemma",
          koreanLemma: phraseLemma ?? suffixKorean,
          irregular: suffixIrregular,
          koreanPos: suffixKoreanPos,
          ending: "게"
        } satisfies ConjugatedLemmaPlan;
      } else {
        suffixPlan = suffixKorean.endsWith("다")
          ? PipelineCompoundMixin.fixedLemmaPlan(phraseLemma ?? suffixKorean, suffixKoreanPos, { irregular: suffixIrregular })
          : legacySurfaceCompositionPlan("candidate_compound", { korean: suffixKorean, koreanPos: suffixKoreanPos });
      }

      const compoundPlan = phraseLemma !== null
        ? suffixPlan
        : PipelineCompoundMixin.composePrefixWithPredicate(`${giForm} `, suffixPlan, {
          koreanPos: 형용사,
          prefixSource: giFormSource
        });
      return {
        result: [consumed, "", 형용사, compoundPlan],
        koreanLemma: phraseLemma ?? verbCandidate.koreanLemma,
        koreanPos: 형용사,
        irregular: phraseLemma === null ? null : suffixIrregular
      };
    });
  }

  async processNounCopulaNoNiConcessive(this: PipelineCompoundResolver, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    if (!pos0in(tokens[start]?.pos ?? 0, NOMINAL_HEAD_BITS)) {
      return null;
    }
    const copula = tokens[start + 1];
    if (copula === undefined || (copula.pos & (POS0 | POS4 | POS5A)) !== (助動詞 | 助動詞_ダ | 連体形_)) {
      return null;
    }
    const noniConsumed = cursor.lookahead(start + 2 - cursor.pos, c =>
      matchNoNiConcessiveConnectiveStart(c, this.lookups)
    );
    if (noniConsumed === null) {
      return null;
    }
    const nounTok = tokens[start]!;
    const entry = await this.dictionary.lookupTokenRelaxed(nounTok);
    const buildForCandidate = (candidate: TranslationCandidate | null): CompoundCandidateDerivation => {
      const korean = candidate?.koreanLemma ?? nounTok.surface;
      const result: CompoundResult = [2 + noniConsumed, `${korean}인데`, 명사];
      return { result, koreanLemma: korean, koreanPos: 명사, irregular: null };
    };
    if (entry === undefined || entry === null) {
      return buildForCandidate(null).result;
    }
    return compoundResultFromCandidates(
      compoundSourceCandidates(entry, { slot: "noun_only_compound" }),
      buildForCandidate
    );
  }

  async processGaruCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    if (start + 1 >= n) {
      return null;
    }
    const head = tokens[start]!;
    const garu = tokens[start + 1]!;
    let sourceCandidates: readonly TranslationCandidate[] = [];
    let deriveTerms: ((candidate: TranslationCandidate) => readonly [lemma: string, irregular: IrregularType | null, koreanPos: number] | null) | null = null;
    let directTerms: readonly [lemma: string, irregular: IrregularType | null, koreanPos: number] | null = null;

    const isSuffixGaru = (garu.pos & POS01) === 接尾辞_動詞的 &&
      garu.dictionaryForm === "がる";
    const isAuxTagaru = (head.pos & POS0) === 動詞 &&
      (garu.pos & POS0) === 助動詞 &&
      garu.dictionaryForm === "たがる";

    if (isAuxTagaru) {
      const entry = await this.dictionary.lookupTokenRelaxed(head);
      if (entry === undefined || entry === null) {
        return null;
      }
      sourceCandidates = compoundSourceCandidates(entry, {
        filter: (candidate) => candidate.koreanPos === 동사
      });
      deriveTerms = (candidate) => [
        `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "고")} 싶어하다`,
        "여",
        동사
      ];
    } else if (isSuffixGaru) {
      const lexicalEntry = await this.lookupLexicalizedGaru(head, garu);
      if (lexicalEntry !== null) {
        sourceCandidates = compoundSourceCandidates(lexicalEntry, {
          filter: (candidate) => candidate.koreanPos === 동사
        });
        deriveTerms = (candidate) => [candidate.koreanLemma, candidate.irregular, candidate.koreanPos];
      } else if (head.dictionaryForm === "欲する") {
        directTerms = ["갖고 싶어하다", "여", 동사];
      } else if ((head.pos & POS0) === 形容詞0 || (head.pos & POS0) === 形状詞) {
        const entry = await this.dictionary.lookupTokenRelaxed(head);
        if (entry === undefined || entry === null) {
          return null;
        }
        sourceCandidates = compoundSourceCandidates(entry, {
          filter: (candidate) => candidate.koreanPos === 동사 || candidate.koreanPos === 형용사
        });
        deriveTerms = (candidate) => [
          `${conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "아/어")}하다`,
          "여",
          동사
        ];
      } else {
        return null;
      }
    } else {
      return null;
    }

    const garuConjugationType4 = (garu.pos & POS4) || null;
    const tailCursor = cursor.fork(start + 2, n, start);

    const auxTokens = collectAuxTokens(tailCursor);
    const buildFromTerms = (
      lemma: string,
      irregular: IrregularType | null,
      koreanPos: number,
      entry: MorphemeEntry | null
    ): CompoundResult | null => this.resolveCompoundTail(
      tailCursor,
      lemma,
      irregular,
      koreanPos,
      auxTokens,
      head,
      {
        rentaiCheckToken: garu,
        verbConjType: garuConjugationType4,
        tailLemmaMode: !auxTokens.some((aux) => aux.dictionaryForm === "いる" || aux.dictionaryForm === "てる"),
        entry
      }
    );
    if (directTerms !== null) {
      return buildFromTerms(directTerms[0], directTerms[1], directTerms[2], null);
    }
    if (deriveTerms === null) {
      return null;
    }
    return compoundResultFromCandidates(sourceCandidates, (candidate) => {
      const terms = deriveTerms(candidate) ?? null;
      if (terms === null) {
        return null;
      }
      const [lemma, irregular, koreanPos] = terms;
      const result = buildFromTerms(lemma, irregular, koreanPos, entryWithOnlyCandidate(candidate));
      return result === null
        ? null
        : { result, koreanLemma: lemma, koreanPos, irregular };
    });
  }

  async lookupLexicalizedGaru(this: PipelineCompoundResolver, head: MatcherToken, garu: MatcherToken): Promise<MorphemeEntry | null> {
    const headSurface = head.surface;
    const headReading = head.reading ?? "";
    if (headSurface.length === 0 || headReading.length === 0) {
      return null;
    }
    const token: MatcherToken & { readonly conjugationType: string; readonly conjugationForm: string } = {
      ...garu,
      surface: `${headSurface}${garu.surface}`,
      reading: `${headReading}${garu.reading ?? ""}`,
      dictionaryForm: `${headSurface}がる`,
      dictionaryFormReading: `${headReading}ガル`,
      pos: 動詞 | (garu.pos & (POS4 | POS5)),
      conjugationType: "五段-ラ行",
      conjugationForm: (garu.pos & POS5A) ? posToString(garu.pos).split("|")[5] ?? "*" : "*"
    };
    return await this.dictionary.lookupTokenRelaxed(token) ?? null;
  }
  async processAdverbToSuru(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    if (start + 2 >= n) {
      return null;
    }
    const adv = tokens[start]!;
    const toTok = tokens[start + 1]!;
    const suru = tokens[start + 2]!;
    if (!pos0in(adv.pos, (1 << 副詞) | (1 << 形状詞))) {
      return null;
    }
    if (caseParticleMarkerRelationForToken(toTok, start + 1, {
      acceptedSurfaces: ["と"],
      consumers: ["compounds"]
    }) === null) {
      return null;
    }
    if (!isVerbLemma(suru, "する")) {
      return null;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(adv);
    if (entry === undefined || entry === null) {
      return null;
    }
    const buildForCandidate = (candidate: TranslationCandidate): CompoundCandidateDerivation | null => {
      const koreanAdverb = candidate.koreanLemma;

      const hostIsAdverbialToCapable = adverbialToCapableKeijoujiHost(adv);
      let predicative: string;
      let koreanPos: number;
      let irregular: IrregularType | null;
      if (hostIsAdverbialToCapable && (candidate.koreanPos === 형용사 || candidate.koreanPos === 동사)) {
        predicative = koreanAdverb;
        koreanPos = candidate.koreanPos;
        irregular = candidate.irregular;
      } else if (koreanAdverb.endsWith("하게")) {
        predicative = `${koreanAdverb.slice(0, -1)}다`;
        koreanPos = 형용사;
        irregular = "여";
      } else if (
        hostIsAdverbialToCapable &&
        candidate.koreanPos === 부사 &&
        !isDerivedFromHadaPredicateAdverb(koreanAdverb)
      ) {
        predicative = `${koreanAdverb}하다`;
        koreanPos = 동사;
        irregular = "여";
      } else if (koreanAdverb.endsWith("하다")) {
        predicative = koreanAdverb;
        koreanPos = 형용사;
        irregular = "여";
      } else {
        return null;
      }

      return cursor.lookahead(3, tailCursor => {

        if (
          tailCursor.pos + 2 < n &&
          isTeConnectiveToken(tokens[tailCursor.pos]) &&
          tokens[tailCursor.pos + 1]?.dictionaryForm === "も" &&
          ((tokens[tailCursor.pos + 1]?.pos ?? 0) & POS0) === 助詞 &&
          ["いる", "おる", "てる"].includes(tokens[tailCursor.pos + 2]?.dictionaryForm ?? "")
        ) {
          const iruToken = tokens[tailCursor.pos + 2]!;
          tailCursor.advance(3);
          const iruAux = collectAuxTokens(tailCursor);
          const totalConsumed = tailCursor.consumed;
          const nextPos = start + totalConsumed;
          const tailToken = iruAux[iruAux.length - 1] ?? iruToken;
          const mode = (
            hasRentaikei(tailToken) &&
            nextPos < n &&
            pos0in(tokens[nextPos]?.pos ?? 0, ATTRIBUTIVE_HEAD_BITS)
          )
            ? "attributive"
            : (tailToken.pos & POS5A) === 連用形_ && iruAux.length === 0
              ? "renyou"
              : "terminal";
          const contentPlan: ConjugatedLemmaPlan = {
            kind: "conjugatedLemma",
            koreanLemma: predicative,
            irregular,
            koreanPos,
            ending: "기"
          };
          return {
            result: [
              totalConsumed,
              "",
              동사,
              {
                kind: "nominalDemoAru",
                content: contentPlan,
                auxTokens: runtimeTokens(iruAux),
                mode,
                koreanPos: 동사
              }
            ],
            koreanLemma: "하다",
            koreanPos: 동사,
            irregular: "여"
          };
        }

        if (
          (adv.pos & POS0) === 形状詞 &&
          tailCursor.pos < n &&
          isTeConnectiveToken(tokens[tailCursor.pos]) &&
          tailCursor.pos + 1 < n &&
          tokens[tailCursor.pos + 1]?.dictionaryForm === "も" &&
          ((tokens[tailCursor.pos + 1]?.pos ?? 0) & POS0) === 助詞 &&
          !["いる", "おる", "てる"].includes(tokens[tailCursor.pos + 2]?.dictionaryForm ?? "")
        ) {
          const plan: ConjugatedLemmaPlan = {
            kind: "conjugatedLemma",
            koreanLemma: predicative,
            irregular,
            koreanPos,
            ending: "아/어도"
          };
          return {
            result: [tailCursor.consumed + 2, "", 부사, plan],
            koreanLemma: predicative,
            koreanPos: 부사,
            irregular
          };
        }

        if (
          (adv.pos & POS0) === 形状詞 &&
          tailCursor.pos < n &&
          isTeConnectiveToken(tokens[tailCursor.pos]) &&
          tailCursor.pos + 1 < n &&
          pos0in(tokens[tailCursor.pos + 1]?.pos ?? 0, CONTENT_POS_BITS) &&
          tokens[tailCursor.pos + 1]?.dictionaryForm !== "いる"
        ) {
          const plan: ConjugatedLemmaPlan = {
            kind: "conjugatedLemma",
            koreanLemma: predicative,
            irregular,
            koreanPos,
            ending: "게"
          };
          return {
            result: [tailCursor.consumed + 1, "", 부사, plan],
            koreanLemma: predicative,
            koreanPos: 부사,
            irregular
          };
        }

        let rentaiCheckToken = suru;
        let rentaiPresent = false;

        if (
          tailCursor.pos + 1 < n &&
          teDeContinuationRelationAt(tokens, tailCursor.pos, { consumers: ["compounds"], lookups: this.lookups })?.continuationKind === "simple_aspect" &&
          tokens[tailCursor.pos + 1]?.dictionaryForm === "いる"
        ) {
          tailCursor.advance(2);
          rentaiCheckToken = tokens[tailCursor.pos - 1]!;
          rentaiPresent = true;
        }
        const auxTokens = collectAuxTokens(tailCursor);
        const result = this.resolveCompoundTail(tailCursor, predicative, irregular, koreanPos, auxTokens, adv, {
          rentaiCheckToken,
          rentaiPresent,
          jpPos0: suru.pos & POS0
        });
        return result === null
          ? null
          : { result, koreanLemma: predicative, koreanPos, irregular };
      });
    };

    return compoundResultFromCandidates(
      compoundSourceCandidates(entry),
      buildForCandidate
    );
  }

  async processSugiruCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    if (start + 1 >= n) {
      return null;
    }

    const renyouHead = await this.extractRenyouPredicateHead(cursor);
    if (renyouHead !== null) {
      const sugiPos = start + renyouHead.consumed;
      if (sugiPos >= n) {
        return null;
      }
      const sugi = tokens[sugiPos]!;
      if (!isSugiruAuxiliaryToken(sugi)) {
        return null;
      }
      return cursor.lookahead(renyouHead.consumed + 1, tailCursor => {
        const auxTokens = collectAuxTokens(tailCursor);
        return compoundResultFromHeadCandidates(renyouHead.headCandidates, (headCandidate) =>
          compoundDerivationFromResult(
            this.resolveCompoundTail(
              tailCursor,
              headCandidate.koreanLemma,
              headCandidate.irregular,
              headCandidate.koreanPos,
              auxTokens,
              headCandidate.token,
              {
                rentaiCheckToken: sugi,
                rentaiPresent: true,
                verbConjType: renyouHead.verbConjType,
                entry: entryWithOnlyCandidate(headCandidate.source),
                jpPos0: renyouHead.jpPos0,
                prefix: "너무 ",
                prefixSource: PipelineCompoundMixin.rulePlanSource("너무 ", "sugiru_prefix")
              }
            ),
            headCandidate.koreanLemma,
            headCandidate.koreanPos,
            headCandidate.irregular
          )
        );
      });
    }

    const head = tokens[start]!;
    const sugi = tokens[start + 1]!;

    if (!isSugiruAuxiliaryToken(sugi)) {
      return null;
    }

    if ((head.pos & (POS0 | POS5A)) !== (形容詞0 | 語幹_)) {
      return null;
    }

    let entry = await this.dictionary.lookupTokenRelaxed(head);
    if (entry === undefined || entry === null) {
      return null;
    }
    let sourceCandidates = compoundSourceCandidates(entry, {
      filter: (candidate) => candidate.koreanPos === 동사 || candidate.koreanPos === 형용사
    });
    if (sourceCandidates.length === 0) {
      const fallbackEntry = await this.dictionary.lookup(head.dictionaryForm, head.dictionaryFormReading ?? head.reading ?? "", head.pos);
      if (fallbackEntry === undefined || fallbackEntry === null) {
        return null;
      }
      entry = fallbackEntry;
      sourceCandidates = compoundSourceCandidates(entry, {
        filter: (candidate) => candidate.koreanPos === 동사 || candidate.koreanPos === 형용사
      });
      if (sourceCandidates.length === 0) {
        return null;
      }
    }

    return cursor.lookahead(2, tailCursor => {
      const auxTokens = collectAuxTokens(tailCursor);
      return compoundResultFromCandidates(sourceCandidates, (candidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(
            tailCursor,
            candidate.koreanLemma,
            candidate.irregular,
            candidate.koreanPos,
            auxTokens,
            head,
            {
              rentaiCheckToken: sugi,
              rentaiPresent: true,
              entry: entryWithOnlyCandidate(candidate),
              jpPos0: head.pos & POS0,
              prefix: "너무 ",
              prefixSource: PipelineCompoundMixin.rulePlanSource("너무 ", "sugiru_prefix")
            }
          ),
          candidate.koreanLemma,
          candidate.koreanPos,
          candidate.irregular
        )
      );
    });
  }

  async processKnownCompoundVerbCandidate(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    for (const candidate of findCompoundVerbCandidatesAt(tokens, start, {
      includeSingleSplitA: false,
      includeStreamVv: true,
      includeSahenShiV: true
    })) {
      const hint = knownResolverHint(candidate);
      if (hint === null) {
        continue;
      }
      const result = await this.dispatchKnownCompoundVerbCandidate(candidate, hint, cursor);
      if (result !== null) {
        return result;
      }
      return null;
    }
    return null;
  }

  async processVirtualCompoundDictionaryEntry(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    for (const candidate of findCompoundVerbCandidatesAt(tokens, start, {
      includeSingleSplitA: false,
      includeStreamVv: true,
      includeSahenShiV: true,
      includeNounIntensiveTail: false
    })) {
      const virtual = buildVirtualCompoundToken(candidate);
      const entry = await lookupVirtualCompoundEntry(this.dictionary, virtual);
      if (entry === null) {
        continue;
      }
      const contextTokens = [
        ...tokens.slice(0, start),
        virtual,
        ...tokens.slice(start + candidate.consumed)
      ];
      const resolvedEntry = resolveContext(entry, runtimeTokens(contextTokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
      const sourceCandidates = prioritizeSourceCandidates(
        compoundSourceCandidates(entry, {
          filter: (sourceCandidate) => sourceCandidate.koreanPos === 동사 || sourceCandidate.koreanPos === 형용사
        }),
        firstTranslationCandidate(resolvedEntry)
      );
      if (sourceCandidates.length === 0) {
        continue;
      }
      return cursor.lookahead(candidate.consumed, auxCursor => {
        const auxTokens = collectAuxTokens(auxCursor);
        return compoundResultFromCandidates(
          sourceCandidates,
          (sourceCandidate) =>
            compoundDerivationFromResult(
              this.resolveCompoundTail(
                auxCursor,
                sourceCandidate.koreanLemma,
                sourceCandidate.irregular,
                sourceCandidate.koreanPos,
                auxTokens,
                virtual,
                {
                  rentaiCheckToken: candidate.tail,
                  rentaiPresent: true,
                  verbConjType: entry.conjugationType ?? null,
                  entry: entryWithOnlyCandidate(sourceCandidate)
                }
              ),
              sourceCandidate.koreanLemma,
              sourceCandidate.koreanPos,
              sourceCandidate.irregular
            )
        );
      });
    }
    return null;
  }

  async dispatchKnownCompoundVerbCandidate(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    candidate: CompoundVerbCandidate,
    hint: string,
    cursor: TokenCursor<MatcherToken>
  ): Promise<CompoundResult | null> {
    if (candidate.kind === "stream_vv") {
      if (hint === "dasu_inchoative") {
        return await this.processDasuInchoativeCompound(cursor);
      }
      if (hint === "owaru_completive" || hint === "oeru_completive") {
        const result = await this.processOwaruCompletiveCompound(cursor);
        if (result !== null) {
          return result;
        }
        return await this.processRenyouAuxVerb(cursor);
      }
      if (hint === "renyou_aux" || hint === "kireru_completion" || hint === "kiru_completion") {
        return await this.processRenyouAuxVerb(cursor);
      }
      return null;
    }

    if (
      candidate.kind === "sahen_shi_v" &&
      (hint === "renyou_aux" || hint === "sahen_productive" || hint === "sahen_oeru")
    ) {
      return await this.processRenyouAuxVerb(cursor);
    }

    return null;
  }

  static stateChangeLemma(koreanLemma: string, irregular: IrregularType | null, koreanPos: number): string | null {
    return deriveStem({ koreanLemma, irregular, koreanPos }, ["state_change"])?.koreanLemma ?? null;
  }

  static stateLemmaForAux(
    koreanLemma: string,
    irregular: IrregularType | null,
    koreanPos: number,
    auxTokens: readonly MatcherToken[]
  ): readonly [koreanLemma: string, irregular: IrregularType | null, koreanPos: number, auxTokens: readonly MatcherToken[]] | null {
    return PipelineCompoundMixin.longNegativeLemmaForAux(koreanLemma, irregular, koreanPos, auxTokens);
  }

  static longNegativeLemmaForAux(
    koreanLemma: string,
    irregular: IrregularType | null,
    koreanPos: number,
    auxTokens: readonly MatcherToken[]
  ): readonly [koreanLemma: string, irregular: IrregularType | null, koreanPos: number, auxTokens: readonly MatcherToken[]] | null {
    const stripped: MatcherToken[] = [];
    let removedNegative = false;
    for (const aux of auxTokens) {
      if (!removedNegative && ((aux.pos & POS4) === 助動詞_ナイ || (aux.pos & POS4) === 助動詞_ヌ)) {
        removedNegative = true;
        continue;
      }
      stripped.push(aux);
    }
    if (!removedNegative) {
      return [koreanLemma, irregular, koreanPos, auxTokens];
    }
    const longNegative = longNegativeLemma(koreanLemma, irregularType(irregular));
    if (longNegative === null) {
      return null;
    }
    return [longNegative, null, 형용사, stripped];
  }

  static stateHeadEntrySource(head: StatePredicateHead, text: string, options: { readonly note: string }): PlanTextSource {
    if (head.entry === null) {
      return PipelineCompoundMixin.rulePlanSource(text, options.note);
    }
    return PipelineCompoundMixin.entryPlanSource(head.token, head.entry, text, { note: options.note });
  }

  static keijoujiPredicateCandidate(entry: MorphemeEntry): ReturnType<typeof firstTranslationCandidate> {
    const translation = (entry.senses ?? []).find((candidate) => candidate.koreanPos === 형용사);
    if (translation === undefined) {
      return undefined;
    }
    return firstTranslationCandidate({ ...entry, senses: [translation] });
  }

  async extractStatePredicateHead(
    this: PipelineCompoundResolver,
    cursor: TokenCursor<MatcherToken>,
    options: { readonly requireRenyouNaru?: boolean; readonly includeNaruV2Sense?: boolean } = {}
  ): Promise<StatePredicateHead | null> {
    const { tokens, pos: start, end: n } = cursor;
    const requireRenyouNaru = options.requireRenyouNaru ?? true;
    const includeNaruV2Sense = options.includeNaruV2Sense ?? true;
    if (start >= n) {
      return null;
    }
    const head = tokens[start]!;
    if (
      includeNaruV2Sense &&
      (head.pos & POS0) === 動詞 &&
      head.dictionaryForm === "なる" &&
      (!requireRenyouNaru || (head.pos & POS5A) === 連用形_)
    ) {
      const result = await buildStatePredicateHeadFromEntry(this.dictionary, this.lookups, this.numeric, head, tokens, start, {
        consumed: 1,
        candidateExtractor: firstTranslationCandidate,
        callbackMapper: (sourceCandidate, _stateChange) => ({
          continuationLemma: sourceCandidate.koreanLemma,
          continuationIrregular: sourceCandidate.irregular,
          continuationPos: 형용사,
          onsetLemma: _stateChange,
          onsetIrregular: null,
          onsetPos: 동사,
          continuationDerivation: null
        }),
        origin: "naru_v2_sense",
        naruToken: head,
        nonAdjectiveRealization: "identity"
      });
      if (result !== null) {
        return result;
      }
    }

    if (
      start + 1 < n &&
      (head.pos & POS0) === 形容詞0 &&
      isAdverbial(runtimeToken(head)) &&
      tokens[start + 1]!.dictionaryForm === "なる" &&
      (tokens[start + 1]!.pos & POS0) === 動詞 &&
      (!requireRenyouNaru || (tokens[start + 1]!.pos & POS5A) === 連用形_)
    ) {
      const result = await buildStatePredicateHeadFromEntry(this.dictionary, this.lookups, this.numeric, head, tokens, start, {
        consumed: 2,
        candidateExtractor: firstTranslationCandidate,
        callbackMapper: (sourceCandidate, stateChange) => ({
          continuationLemma: stateChange,
          continuationIrregular: null,
          continuationPos: 동사,
          onsetLemma: stateChange,
          onsetIrregular: null,
          onsetPos: 동사,
          continuationDerivation: verifiedStemDerivation(
            stateChange,
            {
              koreanLemma: sourceCandidate.koreanLemma,
              irregular: sourceCandidate.irregular,
              koreanPos: sourceCandidate.koreanPos
            },
            ["state_change"]
          )
        }),
        origin: "adj_naru",
        naruToken: tokens[start + 1]!,
        nonAdjectiveRealization: "state_change"
      });
      if (result !== null) {
        return result;
      }
    }

    if (
      start + 2 < n &&
      isNaAdjCapable(head) &&
      copulaNiMarkerRelationForToken(tokens[start + 1], start + 1, {
        consumers: ["compounds"]
      }) !== null &&
      tokens[start + 2]!.dictionaryForm === "なる" &&
      (tokens[start + 2]!.pos & POS0) === 動詞 &&
      (!requireRenyouNaru || (tokens[start + 2]!.pos & POS5A) === 連用形_)
    ) {
      const result = await buildStatePredicateHeadFromEntry(this.dictionary, this.lookups, this.numeric, head, tokens, start, {
        consumed: 3,
        candidateExtractor: PipelineCompoundMixin.keijoujiPredicateCandidate,
        callbackMapper: (sourceCandidate, stateChange) => ({
          continuationLemma: stateChange,
          continuationIrregular: null,
          continuationPos: 동사,
          onsetLemma: stateChange,
          onsetIrregular: null,
          onsetPos: 동사,
          continuationDerivation: verifiedStemDerivation(
            stateChange,
            {
              koreanLemma: sourceCandidate.koreanLemma,
              irregular: sourceCandidate.irregular,
              koreanPos: sourceCandidate.koreanPos
            },
            ["state_change"]
          )
        }),
        origin: "keijouji_naru",
        naruToken: tokens[start + 2]!,
        nonAdjectiveRealization: "state_change"
      });
      if (result !== null) {
        return result;
      }
    }

    return null;
  }

  async processStandaloneStateChangeNaru(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractStatePredicateHead(cursor, {
      requireRenyouNaru: false,
      includeNaruV2Sense: false
    });
    if (head === null) {
      return null;
    }
    const naruIdx = start + head.consumed - 1;
    if (!(0 <= naruIdx && naruIdx < n)) {
      return null;
    }
    const naru = tokens[naruIdx]!;
    const afterNaru = start + head.consumed;
    if (afterNaru < n && ((tokens[afterNaru]?.pos ?? 0) & POS0) === 動詞) {
      return null;
    }
    return cursor.lookahead(head.consumed, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      const consumed = auxCursor.consumed;
      const after = start + consumed;
      if (after < n && (tokens[after]?.dictionaryForm === "うち" || tokens[after]?.dictionaryForm === "内")) {
        return null;
      }
      return compoundResultFromStateHeadCandidates(head.headCandidates, (headCandidate) => {
        const terms = PipelineCompoundMixin.stateLemmaForAux(
          headCandidate.continuationLemma,
          headCandidate.continuationIrregular,
          headCandidate.continuationPos,
          auxTokens
        );
        if (terms === null) {
          return null;
        }
        const [koreanLemma, irregular, koreanPos, strippedAux] = terms;
        const derivation = stateChangeStemDerivation(headCandidate, koreanLemma, {
          longNegativeApplied: strippedAux.length !== auxTokens.length
        });
        return compoundDerivationFromResult(
          withStemDerivation(
            this.resolveCompoundTail(
              auxCursor,
              koreanLemma,
              irregular,
              koreanPos,
              strippedAux,
              naru,
              {
                rentaiCheckToken: naru,
                rentaiPresent: true,
                verbConjType: head.verbConjType,
                entry: entryWithOnlyCandidate(headCandidate.source),
                jpPos0: head.token.pos & POS0
              }
            ),
            derivation
          ),
          koreanLemma,
          koreanPos,
          irregular
        );
      });
    });
  }

  async processStatePredicateRenyouAuxTokens(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractStatePredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n) {
      return null;
    }
    const tail = tokens[tailPos]!;
    if ((tail.pos & POS0) !== 動詞) {
      return null;
    }
    const tailDf = tail.dictionaryForm;
    if (tailDf === "続ける" || tailDf === "つづける") {
      return cursor.lookahead(head.consumed + 1, tailCursor => {
        const auxTokens = collectAuxTokens(tailCursor);
        return compoundResultFromStateHeadCandidates(head.headCandidates, (headCandidate) =>
          compoundDerivationFromResult(
            withStemDerivation(
              this.resolveCompoundTail(
                tailCursor,
                headCandidate.continuationLemma,
                headCandidate.continuationIrregular,
                headCandidate.continuationPos,
                auxTokens,
                tail,
                {
                  rentaiCheckToken: tail,
                  rentaiPresent: true,
                  verbConjType: head.verbConjType,
                  entry: entryWithOnlyCandidate(headCandidate.source),
                  prefix: "계속 ",
                  prefixSource: PipelineCompoundMixin.rulePlanSource("계속 ", `state_predicate_${head.shapeKind}_tsuzukeru`)
                }
              ),
              headCandidate.continuationDerivation
            ),
            headCandidate.continuationLemma,
            headCandidate.continuationPos,
            headCandidate.continuationIrregular
          )
        );
      });
    }
    if (tailDf === "始める" || tailDf === "はじめる") {
      const tailEntry = await this.dictionary.lookupTokenRelaxed(tail);
      if (tailEntry === undefined || tailEntry === null) {
        return null;
      }
      const tailCandidate = firstTranslationCandidate(tailEntry);
      if (tailCandidate === undefined) {
        return null;
      }
      return cursor.lookahead(head.consumed + 1, tailCursor => {
        const auxTokens = collectAuxTokens(tailCursor);
        return compoundResultFromStateHeadCandidates(head.headCandidates, (headCandidate) => {
          const headGi = conjugate(headCandidate.onsetLemma, irregularType(headCandidate.onsetIrregular), "기");
          const prefix = `${headGi} `;
          return compoundDerivationFromResult(
            this.resolveCompoundTail(
              tailCursor,
              tailCandidate.koreanLemma,
              tailCandidate.irregular,
              tailCandidate.koreanPos,
              auxTokens,
              tail,
              {
                rentaiCheckToken: tail,
                rentaiPresent: true,
                entry: tailEntry,
                verbConjType: (tail.pos & POS4) || null,
                prefix,
                prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefix, {
                  note: `state_predicate_${head.shapeKind}_hajimeru`
                })
              }
            ),
            tailCandidate.koreanLemma,
            tailCandidate.koreanPos,
            tailCandidate.irregular
          );
        });
      });
    }
    return null;
  }

  async extractRenyouPredicateHead(this: PipelineCompoundResolver, cursor: TokenCursor<MatcherToken>): Promise<PredicateRenyouHead | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    if (start >= n) {
      return null;
    }
    const head = tokens[start]!;
    if ((head.pos & (POS0 | POS5A)) === (動詞 | 連用形_)) {
      let entry = await this.dictionary.lookupTokenRelaxed(head);
      if (entry === undefined || entry === null) {
        return null;
      }
      let resolvedEntry = resolveContext(entry, runtimeTokens(tokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
      let resolvedCandidate = firstTranslationCandidate(resolvedEntry);
      let headCandidates = prioritizeHeadCandidates(compoundHeadCandidatesFromEntry(entry, head, (candidate) =>
        candidate.koreanPos === 동사
          ? {
            koreanLemma: candidate.koreanLemma,
            koreanPos: 동사,
            irregular: candidate.irregular
          }
          : null
      ), resolvedCandidate);
      if (headCandidates.length === 0) {
        const fallbackEntry = await this.dictionary.lookup(head.dictionaryForm, head.dictionaryFormReading ?? "", head.pos);
        if (fallbackEntry !== undefined && fallbackEntry !== null) {
          entry = fallbackEntry;
          resolvedEntry = resolveContext(fallbackEntry, runtimeTokens(tokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
          resolvedCandidate = firstTranslationCandidate(resolvedEntry);
          headCandidates = prioritizeHeadCandidates(compoundHeadCandidatesFromEntry(fallbackEntry, head, (candidate) =>
            candidate.koreanPos === 동사
              ? {
                koreanLemma: candidate.koreanLemma,
                koreanPos: 동사,
                irregular: candidate.irregular
              }
              : null
          ), resolvedCandidate);
        }
      }
      const selected = headCandidates[0];
      if (selected === undefined) {
        return null;
      }
      return new PredicateRenyouHead(
        1,
        head,
        entry,
        selected.koreanLemma,
        selected.irregular,
        동사,
        動詞,
        (head.pos & POS4) || null,
        headCandidates
      );
    }

    const next = tokens[start + 1];
    if (
      (head.pos & POS0) === 名詞 &&
      next !== undefined &&
      (next.pos & POS01) === 接尾辞_形容詞的 &&
      predicateSuffixKindForDictionaryForm(next.dictionaryForm) !== null &&
      head.surface.length > 0 &&
      (head.reading ?? "").length > 0
    ) {
      const inferredLemma = `${head.surface}る`;
      const inferredReading = `${head.reading ?? ""}ル`;
      const entry = await this.dictionary.lookup(inferredLemma, inferredReading, 動詞);
      if (entry !== undefined && entry !== null) {
        const resolvedEntry = resolveContext(entry, runtimeTokens(tokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
        const resolvedCandidate = firstTranslationCandidate(resolvedEntry);
        const headCandidates = prioritizeHeadCandidates(compoundHeadCandidatesFromEntry(entry, head, (candidate) =>
          candidate.koreanPos === 동사
            ? {
              koreanLemma: candidate.koreanLemma,
              koreanPos: 동사,
              irregular: candidate.irregular
            }
            : null
        ), resolvedCandidate);
        const selected = headCandidates[0];
        if (selected !== undefined) {
          return new PredicateRenyouHead(
            1,
            head,
            entry,
            selected.koreanLemma,
            selected.irregular,
            동사,
            動詞,
            null,
            headCandidates
          );
        }
      }
    }

    if (
      !(
        start + 1 < n &&
        isSahenCapableNominal(head) &&
        isSahenSuruRenyou(tokens, start + 1)
      )
    ) {
      return null;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(head);
    if (entry === undefined || entry === null) {
      return null;
    }
    const resolvedEntry = resolveContext(entry, runtimeTokens(tokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
    const resolvedCandidate = firstTranslationCandidate(resolvedEntry);
    const headCandidates = prioritizeHeadCandidates(compoundHeadCandidatesFromEntry(entry, head, (candidate) => {
      if (candidate.koreanPos === 동사) {
        return {
          koreanLemma: candidate.koreanLemma,
          koreanPos: 동사,
          irregular: candidate.irregular
        };
      }
      if (candidate.koreanPos === 명사) {
        return {
          koreanLemma: `${candidate.koreanLemma}하다`,
          koreanPos: 동사,
          irregular: "여"
        };
      }
      return null;
    }), resolvedCandidate);
    const selected = headCandidates[0];
    if (selected === undefined) {
      return null;
    }
    return new PredicateRenyouHead(
      2,
      head,
      resolvedEntry,
      selected.koreanLemma,
      selected.irregular,
      동사,
      動詞,
      サ行変格,
      headCandidates
    );
  }

  async processDasuInchoativeCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    const tail = tailPos < n ? tokens[tailPos] : undefined;
    if (
      !(
        tail !== undefined &&
        (tail.pos & POS01) === 動詞_非自立可能 &&
        (tail.dictionaryForm === "出す" || tail.dictionaryForm === "だす")
      )
    ) {
      return null;
    }
    return cursor.lookahead(head.consumed + 1, tailCursor => {
      const auxTokens = collectAuxTokens(tailCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
        const headGi = conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "기");
        return compoundDerivationFromResult(
          this.resolveCompoundTail(tailCursor, "시작하다", "여", 동사, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            prefix: `${headGi} `,
            prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), `${headGi} `, { note: "verb_gi_form_dasu" })
          }),
          "시작하다",
          동사,
          "여"
        );
      });
    });
  }

  async processOwaruCompletiveCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    const tail = tailPos < n ? tokens[tailPos] : undefined;
    if (
      !(
        tail !== undefined &&
        (tail.pos & POS0) === 動詞 &&
        ((tail.pos & POS1) === 非自立可能 || tail.dictionaryForm === "おわらす") &&
        (tail.dictionaryForm === "終わる" || tail.dictionaryForm === "終える" || tail.dictionaryForm === "おわらす")
      )
    ) {
      return null;
    }
    return cursor.lookahead(head.consumed + 1, tailCursor => {
      const auxTokens = collectAuxTokens(tailCursor);
      if (tail.dictionaryForm === "おわらす" && auxTokens.some((token) => (token.pos & POS4) === 助動詞_レル)) {
        return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
          const prefix = `다 ${conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "게")} `;
          return compoundDerivationFromResult(
            this.resolveCompoundTail(tailCursor, "되다", null, 동사, [], tail, {
              rentaiCheckToken: tail,
              rentaiPresent: true,
              entry: null,
              prefix,
              prefixSource: PipelineCompoundMixin.rulePlanSource("게 ", "owarasu_passive")
            }),
            "되다",
            동사,
            null
          );
        });
      }
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(tailCursor, headCandidate.koreanLemma, headCandidate.irregular, 동사, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            entry: entryWithOnlyCandidate(headCandidate.source),
            prefix: "다 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("다 ", "owaru_completive")
          }),
          headCandidate.koreanLemma,
          동사,
          headCandidate.irregular
        )
      );
    });
  }

  async processRenyouAuxVerb(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const tsuzukeruChain = await this.processTsuzukeruChain(cursor);
    if (tsuzukeruChain !== null) {
      return tsuzukeruChain;
    }

    const giChain = await this.processRenyouAuxGiChain(cursor);
    if (giChain !== null) {
      return giChain;
    }

    const renyouHead = await this.extractRenyouPredicateHead(cursor);
    const tailPos = renyouHead !== null ? start + renyouHead.consumed : n;

    if (tailPos < n && isKireruToken(tokens[tailPos]!)) {
      const result = await this.processKireruCompound(cursor);
      if (result !== null) {
        return result;
      }
    }

    if (tailPos < n && isKiruToken(tokens[tailPos]!)) {
      const result = await this.processKiruCompound(cursor);
      if (result !== null) {
        return result;
      }
    }

    if (tailPos < n && isOeruAuxiliaryToken(tokens[tailPos]!)) {
      const result = await this.processOeruCompound(cursor);
      if (result !== null) {
        return result;
      }
    }

    const potentialResult = await this.processUruPotentialCompound(cursor);
    if (potentialResult !== null) {
      return potentialResult;
    }

    const intensiveResult = await this.processColloquialIntensiveCompound(cursor);
    if (intensiveResult !== null) {
      return intensiveResult;
    }

    const reciprocalResult = await this.processReciprocalAuCompound(cursor);
    if (reciprocalResult !== null) {
      return reciprocalResult;
    }

    const tailOnlyResult = await this.processTailOnlyProductiveCompound(cursor);
    if (tailOnlyResult !== null) {
      return tailOnlyResult;
    }

    if (tailPos < n && isSahenProductiveFollowingToken(tokens[tailPos]!)) {
      const productiveResult = await this.processProductiveFollowingCompound(cursor);
      if (productiveResult !== null) {
        return productiveResult;
      }
    }

    if (tailPos < n && isOeruAuxiliaryToken(tokens[tailPos]!)) {
      const finishResult = await this.processOeruObjectCompletionCompound(cursor);
      if (finishResult !== null) {
        return finishResult;
      }
    }

    return null;
  }

  async processUruPotentialCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isUruPotentialTailToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            verbConjType: head.verbConjType,
            entry: entryWithOnlyCandidate(headCandidate.source),
            voice: "potential"
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async processColloquialIntensiveCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractColloquialIntensiveHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isColloquialIntensiveTailToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            verbConjType: head.verbConjType,
            entry: entryWithOnlyCandidate(headCandidate.source),
            prefix: "무진장 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("무진장 ", "colloquial_intensive_prefix")
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async extractColloquialIntensiveHead(this: PipelineCompoundResolver, cursor: TokenCursor<MatcherToken>): Promise<PredicateRenyouHead | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head !== null) {
      return head;
    }
    if (start + 1 >= n || !isColloquialIntensiveTailToken(tokens[start + 1]!)) {
      return null;
    }
    const recovered = await lookupNominalRenyouVerbHead(this.dictionary, tokens[start]!);
    if (recovered === null) {
      return null;
    }
    const [rawEntry, verbToken] = recovered;
    const entry = resolveContext(rawEntry, runtimeTokens(tokens), start, { final: false, lookups: this.lookups, numeric: this.numeric });
    const headCandidates = prioritizeHeadCandidates(compoundHeadCandidatesFromEntry(rawEntry, verbToken, (sourceCandidate) =>
      sourceCandidate.koreanPos === 동사
        ? {
          koreanLemma: sourceCandidate.koreanLemma,
          koreanPos: 동사,
          irregular: sourceCandidate.irregular
        }
        : null
    ), firstTranslationCandidate(entry));
    const selected = headCandidates[0];
    if (selected === undefined) {
      return null;
    }
    return new PredicateRenyouHead(1, verbToken, entry, selected.koreanLemma, selected.irregular, 동사, 動詞, entry.conjugationType ?? null, headCandidates);
  }

  async processReciprocalAuCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isReciprocalAuTailToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            verbConjType: head.verbConjType,
            entry: entryWithOnlyCandidate(headCandidate.source),
            prefix: "서로 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("서로 ", "reciprocal_au_prefix")
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async processTailOnlyProductiveCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isTailOnlyProductiveFollowingToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      if (tail.dictionaryForm === "忘れる") {
        return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
          const headAttr = conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "ㄴ/는");
          const prefix = `${headAttr} 걸 `;
          return compoundDerivationFromResult(
            this.resolveCompoundTail(auxCursor, "잊다", null, 동사, auxTokens, tail, {
              rentaiCheckToken: tail,
              rentaiPresent: true,
              prefix,
              prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefix, { note: "tail_only_wasureru_object_prefix" })
            }),
            "잊다",
            동사,
            null
          );
        });
      }
      if (tail.dictionaryForm === "損ねる") {
        return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
          const headJi = conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "지");
          const prefix = `${headJi} `;
          return compoundDerivationFromResult(
            this.resolveCompoundTail(auxCursor, "못하다", "여", 동사, auxTokens, tail, {
              rentaiCheckToken: tail,
              rentaiPresent: true,
              prefix,
              prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefix, { note: "tail_only_sokoneru_failure_prefix" }),
              tailLemmaMode: true
            }),
            "못하다",
            동사,
            "여"
          );
        });
      }
      const prefixByTail = new Map<string, readonly [prefix: string, note: string]>([
        ["直す", ["다시 ", "tail_only_naosu_retry_prefix"]],
        ["抜く", ["끝까지 ", "tail_only_nuku_through_prefix"]],
        ["尽くす", ["다 ", "tail_only_tsukusu_exhaustive_prefix"]]
      ]);
      const prefixSpec = prefixByTail.get(tail.dictionaryForm);
      if (prefixSpec !== undefined) {
        const [prefix, note] = prefixSpec;
        return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
          compoundDerivationFromResult(
            this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
              rentaiCheckToken: tail,
              rentaiPresent: true,
              verbConjType: head.verbConjType,
              entry: entryWithOnlyCandidate(headCandidate.source),
              prefix,
              prefixSource: PipelineCompoundMixin.rulePlanSource(prefix, note)
            }),
            headCandidate.koreanLemma,
            headCandidate.koreanPos,
            headCandidate.irregular
          )
        );
      }
      return null;
    });
  }

  async processRenyouAuxGiChain(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n) {
      return null;
    }
    const tail = tokens[tailPos]!;
    if (!((tail.pos & POS0) === 動詞 && isAuxiliaryVerbToken(tail, this.lookups.RENYOU_AUX_VERBS) && (tail.dictionaryForm === "始める" || tail.dictionaryForm === "はじめる" || tail.dictionaryForm === "終わる" || tail.dictionaryForm === "おわる"))) {
      return null;
    }
    const tailEntry = await this.dictionary.lookupTokenRelaxed(tail);
    if (tailEntry === undefined || tailEntry === null) {
      return null;
    }
    const tailCandidate = firstTranslationCandidate(tailEntry);
    if (tailCandidate === undefined) {
      return null;
    }
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
        const headGi = conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "기");
        const prefix = `${headGi} `;
        return compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, tailCandidate.koreanLemma, tailCandidate.irregular, tailCandidate.koreanPos, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            entry: tailEntry,
            verbConjType: (tail.pos & POS4) || null,
            prefix,
            prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefix, { note: "renyou_gi_form" })
          }),
          tailCandidate.koreanLemma,
          tailCandidate.koreanPos,
          tailCandidate.irregular
        );
      });
    });
  }

  async processTsuzukeruChain(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (!(tailPos < n && isVerbLemma(tokens[tailPos]!, "続ける", "つづける"))) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, tailCursor => {
      let auxTokens = collectAuxTokens(tailCursor);
      let potentialChain = false;
      if (startsWithPotentialAux(auxTokens)) {
        potentialChain = true;
        const extended = tailCursor.tx(c => {
          const teIru = matchSimpleTeIru(c);
          if (teIru === undefined) return null;
          const trailingAux = collectAuxTokens(c);
          return { teIru, trailingAux };
        });
        if (extended !== null) {
          auxTokens = [...auxTokens, ...collapseTeIruAuxTokens(extended.teIru), ...extended.trailingAux];
        }
      }
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(tailCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            verbConjType: head.verbConjType,
            entry: entryWithOnlyCandidate(headCandidate.source),
            prefix: "계속 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("계속 ", "tsuzukeru_chain"),
            voice: potentialChain ? "potential" : "active"
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async processOeruCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isOeruAuxiliaryToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            entry: entryWithOnlyCandidate(headCandidate.source),
            verbConjType: head.verbConjType,
            prefix: "다 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("다 ", "oeru_prefix")
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  nominalPrefixesForRenyouHead(_this: PipelineCompoundResolver, head: PredicateRenyouHead): readonly [nounKorean: string, objPrefix: string, giPrefix: string] | null {
    const candidate = this.nominalPrefixCandidatesForRenyouHead(_this, head)[0];
    return candidate === undefined
      ? null
      : [candidate.nounKorean, candidate.objPrefix, candidate.giPrefix];
  }

  nominalPrefixCandidatesForRenyouHead(_this: PipelineCompoundResolver, head: PredicateRenyouHead): readonly CompoundNominalPrefixCandidate[] {
    if (head.consumed !== 2) {
      return [];
    }
    return head.headCandidates
      .map((headCandidate) => {
        let nounKorean: string;
        if (headCandidate.source.koreanPos === 명사) {
          nounKorean = headCandidate.source.koreanLemma;
        } else if (headCandidate.koreanPos === 동사 && headCandidate.koreanLemma.endsWith("하다")) {
          nounKorean = headCandidate.koreanLemma.slice(0, -2);
        } else {
          return null;
        }
        return {
          head: headCandidate,
          nounKorean,
          objPrefix: `${nounKorean}${selectParticle(nounKorean, "을/를")} `,
          giPrefix: `${nounKorean}하기 `
        };
      })
      .filter((candidate): candidate is CompoundNominalPrefixCandidate => candidate !== null);
  }

  async processOeruObjectCompletionCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isOeruAuxiliaryToken(tokens[tailPos]!)) {
      return null;
    }
    const prefixCandidates = this.nominalPrefixCandidatesForRenyouHead(this, head);
    if (prefixCandidates.length === 0) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      return compoundResultFromHeadCandidates(prefixCandidates.map((candidate) => candidate.head), (headCandidate) => {
        const prefixCandidate = prefixCandidates.find((candidate) => candidate.head === headCandidate);
        if (prefixCandidate === undefined) {
          return null;
        }
        return compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, "끝내다", null, 동사, auxTokens, tail, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            prefix: prefixCandidate.objPrefix,
            prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefixCandidate.objPrefix, { note: "renyou_head_oeru_object_prefix" })
          }),
          "끝내다",
          동사,
          null
        );
      });
    });
  }

  async processProductiveFollowingCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isSahenProductiveFollowingToken(tokens[tailPos]!)) {
      return null;
    }
    const prefixCandidates = this.nominalPrefixCandidatesForRenyouHead(this, head);
    if (prefixCandidates.length === 0) {
      return null;
    }
    const tail = tokens[tailPos]!;
    const auxDf = tail.dictionaryForm;

    const normalizeNegativeAux = (auxTokens: readonly MatcherToken[]): readonly [isNegative: boolean, normalizedAux: readonly MatcherToken[]] => {
      if (auxTokens.length > 0 && (auxTokens[0]!.pos & POS4) === 助動詞_ナイ) {
        return [true, auxTokens.slice(1)];
      }
      if (auxTokens.length >= 2 && (auxTokens[0]!.pos & POS4) === 助動詞_マス && (auxTokens[1]!.pos & POS4) === 助動詞_ヌ) {
        const past = auxHasPast(auxTokens.slice(2));
        return [true, buildSyntheticAux(true, past)];
      }
      return [false, auxTokens];
    };

    const renderPrefixedPlan = (prefixCandidate: CompoundNominalPrefixCandidate, options: {
      readonly prefix: string;
      readonly mainLemma: string;
      readonly irregular: IrregularType | null;
      readonly auxTokens: readonly MatcherToken[];
      readonly consumed: number;
      readonly cursor: TokenCursor<MatcherToken>;
      readonly note: string;
      readonly tailLemmaMode?: boolean;
    }): CompoundResult | null => {
      return this.resolveCompoundTail(options.cursor, options.mainLemma, options.irregular, 동사, options.auxTokens, tail, {
        rentaiCheckToken: tail,
        rentaiPresent: true,
        prefix: options.prefix,
        prefixSource: PipelineCompoundMixin.entryPlanSource(prefixCandidate.head.token, entryWithOnlyCandidate(prefixCandidate.head.source), options.prefix, { note: options.note }),
        tailLemmaMode: options.tailLemmaMode ?? false
      });
    };

    const renderPrefixedCandidates = (
      buildOptions: (prefixCandidate: CompoundNominalPrefixCandidate) => Parameters<typeof renderPrefixedPlan>[1]
    ): CompoundResult | null => compoundResultFromHeadCandidates(prefixCandidates.map((candidate) => candidate.head), (headCandidate) => {
      const prefixCandidate = prefixCandidates.find((candidate) => candidate.head === headCandidate);
      if (prefixCandidate === undefined) {
        return null;
      }
      const options = buildOptions(prefixCandidate);
      return compoundDerivationFromResult(
        renderPrefixedPlan(prefixCandidate, options),
        options.mainLemma,
        동사,
        options.irregular
      );
    });

    if (auxDf === "切れる" || auxDf === "きれる" || auxDf === "抜ける") {
      return cursor.lookahead(head.consumed + 1, auxCursor => {
        const auxTokens = collectAuxTokens(auxCursor);
        const consumed = head.consumed + 1 + auxTokens.length;
        const [isNegative, normalizedAux] = normalizeNegativeAux(auxTokens);
        const completionPrefix = auxDf === "抜ける" ? "끝까지 " : "다 ";
        if (isNegative) {
          return renderPrefixedCandidates((prefixCandidate) => ({
            prefix: `${prefixCandidate.objPrefix}${completionPrefix}${conjugate("하다", "여", "지")} `,
            mainLemma: "못하다",
            irregular: "여",
            auxTokens: normalizedAux,
            consumed,
            cursor: auxCursor,
            note: `sahen_productive_${auxDf}_negative_prefix`,
            tailLemmaMode: true
          }));
        }
        return renderPrefixedCandidates((prefixCandidate) => ({
          prefix: `${prefixCandidate.objPrefix}${completionPrefix}`,
          mainLemma: "하다",
          irregular: "여",
          auxTokens,
          consumed,
          cursor: auxCursor,
          note: `sahen_productive_${auxDf}_prefix`
        }));
      });
    }

    if (auxDf === "直せる" || auxDf === "尽くせる" || auxDf === "通せる") {
      return cursor.lookahead(head.consumed + 1, auxCursor => {
        const auxTokens = collectAuxTokens(auxCursor);
        const consumed = head.consumed + 1 + auxTokens.length;
        const [isNegative, normalizedAux] = normalizeNegativeAux(auxTokens);
        let actionPrefix: string;
        if (auxDf === "直せる") {
          actionPrefix = "다시 할 수 ";
        } else if (auxDf === "尽くせる") {
          actionPrefix = "다 할 수 ";
        } else {
          actionPrefix = "끝까지 할 수 ";
        }
        return renderPrefixedCandidates((prefixCandidate) => ({
          prefix: `${prefixCandidate.objPrefix}${actionPrefix}`,
          mainLemma: isNegative ? "없다" : "있다",
          irregular: null,
          auxTokens: normalizedAux,
          consumed,
          cursor: auxCursor,
          note: `sahen_productive_${auxDf}_ability_prefix`
        }));
      });
    }

    let mainLemma: string;
    let irregular: IrregularType | null;
    let prefixFor: (prefixCandidate: CompoundNominalPrefixCandidate) => string;
    if (auxDf === "直す" || auxDf === "返す") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}다시 `;
      mainLemma = "하다";
      irregular = "여";
    } else if (auxDf === "忘れる") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.nounKorean}하는 걸 `;
      mainLemma = "잊다";
      irregular = null;
    } else if (auxDf === "損ねる") {
      prefixFor = (prefixCandidate) => prefixCandidate.objPrefix;
      mainLemma = "못하다";
      irregular = "여";
    } else if (auxDf === "出す" || auxDf === "だす") {
      prefixFor = (prefixCandidate) => prefixCandidate.giPrefix;
      mainLemma = "시작하다";
      irregular = "여";
    } else if (auxDf === "込む") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}한참 `;
      mainLemma = "하다";
      irregular = "여";
    } else if (auxDf === "上げる") {
      prefixFor = (prefixCandidate) => prefixCandidate.objPrefix;
      mainLemma = "해내다";
      irregular = null;
    } else if (auxDf === "尽くす") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}다 `;
      mainLemma = "하다";
      irregular = "여";
    } else if (auxDf === "通す") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}끝까지 `;
      mainLemma = "하다";
      irregular = "여";
    } else if (auxDf === "切る" || auxDf === "きる") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}다 `;
      mainLemma = "하다";
      irregular = "여";
    } else if (auxDf === "抜く") {
      prefixFor = (prefixCandidate) => `${prefixCandidate.objPrefix}끝까지 `;
      mainLemma = "하다";
      irregular = "여";
    } else {
      return null;
    }

    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      const consumed = head.consumed + 1 + auxTokens.length;
      return renderPrefixedCandidates((prefixCandidate) => ({
        prefix: prefixFor(prefixCandidate),
        mainLemma,
        irregular,
        auxTokens,
        consumed,
        cursor: auxCursor,
        note: `sahen_productive_${auxDf}_prefix`
      }));
    });
  }

  async processKireruCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isKireruToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, auxCursor => {
      const auxTokens = collectAuxTokens(auxCursor);
      const isNegative = auxTokens.length > 0 && (auxTokens[0]!.pos & POS4) === 助動詞_ナイ;

      if (isNegative) {
        const negativeAux = auxTokens[0]!;
        const remainingAux = auxTokens.slice(1);
        return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) => {
          const headJi = conjugate(headCandidate.koreanLemma, irregularType(headCandidate.irregular), "지");
          const prefix = `다 ${headJi} `;
          return compoundDerivationFromResult(
            this.resolveCompoundTail(auxCursor, "못하다", "여", 동사, remainingAux, tail, {
              rentaiCheckToken: remainingAux.length === 0 ? negativeAux : null,
              rentaiPresent: remainingAux.length === 0,
              prefix,
              prefixSource: PipelineCompoundMixin.entryPlanSource(headCandidate.token, entryWithOnlyCandidate(headCandidate.source), prefix, { note: "kireru_negative_prefix" }),
              tailLemmaMode: true
            }),
            "못하다",
            동사,
            "여"
          );
        });
      }

      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(auxCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            verbConjType: head.verbConjType,
            entry: entryWithOnlyCandidate(headCandidate.source),
            prefix: "다 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("다 ", "kireru_positive_prefix")
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async processKiruCompound(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    const head = await this.extractRenyouPredicateHead(cursor);
    if (head === null || head.consumed !== 1) {
      return null;
    }
    const tailPos = start + head.consumed;
    if (tailPos >= n || !isKiruToken(tokens[tailPos]!)) {
      return null;
    }
    const tail = tokens[tailPos]!;
    return cursor.lookahead(head.consumed + 1, tailCursor => {
      const auxList: MatcherToken[] = [];
      while (tailCursor.pos < n && ((tailCursor.current()?.pos ?? 0) & POS0) === 助動詞) {
        auxList.push(tailCursor.current()!);
        tailCursor.advance();
      }
      if (
        tailCursor.pos + 1 < n &&
        isTeConnectiveToken(tailCursor.current()) &&
        (tailCursor.peek(1)!.dictionaryForm === "いる" || tailCursor.peek(1)!.dictionaryForm === "おる") &&
        (tailCursor.peek(1)!.pos & POS0) === 動詞
      ) {
        const teToken = tailCursor.current()!;
        const iruToken = tailCursor.peek(1)!;
        const iruPos5A = iruToken.pos & POS5A;
        auxList.push({
          surface: `${teToken.surface}${iruToken.surface}`,
          dictionaryForm: "てる",
          pos: 助動詞 | iruPos5A
        });
        tailCursor.advance(2);
        while (tailCursor.pos < n && ((tailCursor.current()?.pos ?? 0) & POS0) === 助動詞) {
          auxList.push(tailCursor.current()!);
          tailCursor.advance();
        }
      }
      const auxTokens = auxList.map((token) => {
        if (token.dictionaryForm === "でる" && (token.pos & POS0) === 助動詞) {
          return { ...token, dictionaryForm: "てる" };
        }
        return token;
      });

      return compoundResultFromHeadCandidates(head.headCandidates, (headCandidate) =>
        compoundDerivationFromResult(
          this.resolveCompoundTail(tailCursor, headCandidate.koreanLemma, headCandidate.irregular, headCandidate.koreanPos, auxTokens, headCandidate.token, {
            rentaiCheckToken: tail,
            rentaiPresent: true,
            entry: entryWithOnlyCandidate(headCandidate.source),
            verbConjType: head.verbConjType,
            prefix: "다 ",
            prefixSource: PipelineCompoundMixin.rulePlanSource("다 ", "kiru_prefix")
          }),
          headCandidate.koreanLemma,
          headCandidate.koreanPos,
          headCandidate.irregular
        )
      );
    });
  }

  async processTari(this: PipelineCompoundResolver & PipelineCompoundMixin, cursor: TokenCursor<MatcherToken>): Promise<CompoundResult | null> {
    const tokens = cursor.tokens;
    const start = cursor.pos;
    const n = cursor.end;
    if (
      start + 1 >= n ||
      ((tokens[start]?.pos ?? 0) & POS0) !== 動詞 ||
      ((tokens[start + 1]?.pos ?? 0) & POS0) !== 助詞 ||
      (tokens[start + 1]?.surface !== "たり" && tokens[start + 1]?.surface !== "だり")
    ) {
      return null;
    }
    const entry = await this.dictionary.lookupTokenRelaxed(tokens[start]!);
    if (entry !== undefined && entry !== null) {
      return compoundResultFromCandidates(
        compoundSourceCandidates(entry, {
          filter: (candidate) => candidate.koreanPos === 동사
        }),
        (candidate) => {
          const plan = PipelineCompoundMixin.composePredicateWithSuffix(
            PipelineCompoundMixin.fixedLemmaPlan(
              conjugate(candidate.koreanLemma, irregularType(candidate.irregular), "기"),
              명사
            ),
            "도",
            {
              koreanPos: 동사,
              suffixSource: PipelineCompoundMixin.rulePlanSource("도", "tari_suffix")
            }
          );
          return {
            result: [2, "", 동사, plan],
            koreanLemma: candidate.koreanLemma,
            koreanPos: 동사,
            irregular: candidate.irregular
          };
        }
      );
    }
    const plan = PipelineCompoundMixin.wrapCompoundSurface(
      `${tokens[start]!.surface}기도`,
      동사
    );
    return [2, "", 동사, plan];
  }

  resolveCompoundTail(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    cursor: TokenCursor<MatcherToken>,
    koreanLemma: string,
    irregular: IrregularType | null,
    koreanPos: number,
    auxTokens: readonly MatcherToken[],
    contentToken: MatcherToken,
    options: ResolveCompoundTailOptions = {}
  ): CompoundResult | null {
    const tokens = cursor.tokens;
    const after = cursor.pos;
    const n = cursor.end;
    const consumed = cursor.consumed;
    const voice = options.voice ?? "active";
    const t: CompoundTailInput = { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, tokens, after, n, consumed, voice };
    const copulaDeContinuation = this.resolveCompoundCopulaDeContinuation(t);
    if (copulaDeContinuation !== NO_COMPOUND_SHAPE) {
      return copulaDeContinuation;
    }
    const followConnective = this.resolveCompoundFollowConnective(t);
    if (followConnective !== NO_COMPOUND_SHAPE) {
      return followConnective;
    }
    const noNominalizer = this.resolveCompoundNoNominalizer(t);
    if (noNominalizer !== NO_COMPOUND_SHAPE) {
      return noNominalizer;
    }
    const postVerbPattern = this.resolveCompoundPostVerbPattern(t);
    if (postVerbPattern !== NO_COMPOUND_SHAPE) {
      return postVerbPattern;
    }
    const naitoTerminal = this.resolveCompoundNaitoTerminal(t);
    if (naitoTerminal !== NO_COMPOUND_SHAPE) {
      return naitoTerminal;
    }
    const naitoConditional = this.resolveCompoundNaitoConditional(t);
    if (naitoConditional !== NO_COMPOUND_SHAPE) {
      return naitoConditional;
    }
    const runtimeCursor = cursor.retarget(runtimeTokens(tokens), cursor.pos, n, cursor.origin);
    const obligationBridge = this.resolveCompoundObligationBridge(t, runtimeCursor);
    if (obligationBridge !== NO_COMPOUND_SHAPE) {
      return obligationBridge;
    }
    const souHearsay = this.resolveCompoundSouHearsay(t);
    if (souHearsay !== NO_COMPOUND_SHAPE) {
      return souHearsay;
    }
    const quotativeTo = this.resolveCompoundQuotativeTo(t);
    if (quotativeTo !== NO_COMPOUND_SHAPE) {
      return quotativeTo;
    }
    const removedPostAux = this.resolveCompoundRemovedPostAux(t, runtimeCursor);
    if (removedPostAux !== NO_COMPOUND_SHAPE) {
      return removedPostAux;
    }

    const clauseCursor = cursor.fork(after, n, after);
    const clauseConnector = this.resolveCompoundClauseConnector(t, runtimeCursor, clauseCursor);
    if (clauseConnector !== NO_COMPOUND_SHAPE) {
      return clauseConnector;
    }
    const attributive = this.resolveCompoundAttributive(t, clauseCursor);
    if (attributive !== NO_COMPOUND_SHAPE) {
      return attributive;
    }
    return this.realizeCompoundTerminal(t);
  }

  private resolveCompoundCopulaDeContinuation(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, consumed, voice } = t;
    const copulaDe = cursor.tx(c =>
      detectCopulaDe(auxTokens, c, {
        contentPosBits: CONTENT_POS_BITS,
        passthroughPosBits: PASSTHROUGH_POS_BITS
      })
    );
    if (copulaDe !== null) {
      const [nextIsContent, nextIsPunct] = copulaDe;
      if (nextIsContent || nextIsPunct) {
        const plan = this.buildPredicatePlan({
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens: auxTokens.slice(0, -1),
          auxiliaryLemma: contentToken.dictionaryForm,
          prefix: options.prefix ?? "",
          prefixSource: options.prefixSource ?? null,
          connective: "고",
          voice
        });
        return [consumed, "", koreanPos, plan];
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundFollowConnective(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, consumed, voice } = t;
    if (koreanPos === 동사 || koreanPos === 형용사) {
      const followKind = cursor.lookahead(after - cursor.pos, classifyFollowConnective);
      const followConsumed = followKind === null ? 0 : 1;
      if (followKind !== null) {
        const connective = followKind === "conditional"
          ? "면"
          : followKind === "contrastive"
            ? "지만"
            : "(으)니까";
        const plan = this.buildPredicatePlan({
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens,
          auxiliaryLemma: contentToken.dictionaryForm,
          prefix: options.prefix ?? "",
          prefixSource: options.prefixSource ?? null,
          connective,
          verbConjType: options.verbConjType ?? null,
          voice
        });
        return [consumed + followConsumed, "", koreanPos, plan];
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundNoNominalizer(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanPos, tokens, after, n } = t;
    if (
      (koreanPos === 동사 || koreanPos === 형용사) &&
      after < n &&
      predicateNominalizerRelationForToken(tokens[after], after, {
        requirement: "tail_connective_marker",
        consumers: ["compounds"]
      })?.nominalizerKind === "no"
    ) {
      const negMatch = cursor.lookahead(1, c => {
        const base = c.pos;
        const match = matchCopulaNegation(c);
        return match === undefined ? undefined : { match, consumed: c.pos - base };
      });
      const isConnNodeCase = (
        negMatch === undefined &&
        after + 2 < n &&
        isCopulaRenyouDeNi(cursor.peek(1)!) &&
        !(
          after + 3 < n &&
          (cursor.peek(2)?.surface === "は" || cursor.peek(2)?.surface === "も") &&
          ((cursor.peek(2)?.pos ?? 0) & POS0) === 助詞 &&
          (cursor.peek(3)?.dictionaryForm === "ある" || cursor.peek(3)?.dictionaryForm === "ござる")
        ) &&
        cursor.peek(2)?.dictionaryForm !== "ある" &&
        cursor.peek(2)?.dictionaryForm !== "ござる" &&
        !["あり", "あっ", "ござい", "ござっ"].includes(cursor.peek(2)?.surface ?? "")
      );
      const isNoniCase = (
        negMatch === undefined &&
        after + 1 < n &&
        caseParticleMarkerRelationForToken(tokens[after + 1], after + 1, {
          acceptedSurfaces: ["に"],
          acceptedParticleSubtypes: ["格助詞", "接続助詞", "係助詞"],
          consumers: ["compounds"]
        }) !== null
      );
      if (isNoniCase) {
        const noniConcessive = this.realizeCompoundNoniConcessive(t);
        if (noniConcessive !== NO_COMPOUND_SHAPE) {
          return noniConcessive;
        }
      }
      if (!isConnNodeCase && !isNoniCase) {
        return this.realizeCompoundNoNominalization(t, negMatch);
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNoniConcessive(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, consumed, voice } = t;
    const noniConsumed = cursor.lookahead(0, c => matchNoNiConcessiveConnectiveStart(c, this.lookups));
    if (noniConsumed !== null) {
      const plan = this.buildPredicatePlan({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        auxiliaryLemma: contentToken.dictionaryForm,
        prefix: options.prefix ?? "",
        prefixSource: options.prefixSource ?? null,
        connective: "는데",
        verbConjType: options.verbConjType ?? null,
        voice
      });
      return [consumed + noniConsumed, "", koreanPos, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNoNominalization(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    negMatch: CompoundCopulaNegationMatch | undefined
  ): CompoundResult {
    const { consumed } = t;
    const attrPlan = this.compoundNominalizedAttributivePlan(t);
    const noDewaNai = this.realizeCompoundNoDewaNai(t, attrPlan, negMatch);
    if (noDewaNai !== NO_COMPOUND_SHAPE) {
      return noDewaNai;
    }
    const noCopulaChain = this.realizeCompoundNoCopulaChain(t, attrPlan);
    if (noCopulaChain !== NO_COMPOUND_SHAPE) {
      return noCopulaChain;
    }
    const noKamoShirenai = this.realizeCompoundNoKamoShirenai(t, attrPlan);
    if (noKamoShirenai !== NO_COMPOUND_SHAPE) {
      return noKamoShirenai;
    }
    const nodaSfp = this.realizeCompoundNodaSfp(t, attrPlan);
    if (nodaSfp !== NO_COMPOUND_SHAPE) {
      return nodaSfp;
    }
    const noQuestion = this.realizeCompoundNoQuestion(t, attrPlan);
    if (noQuestion !== NO_COMPOUND_SHAPE) {
      return noQuestion;
    }
    const suffix = " 것";
    const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 명사 });
    return [consumed + 1, "", 명사, plan];
  }

  private compoundNominalizedAttributivePlan(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): RenderPlan {
    const { koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, voice } = t;
    const hasPast = auxHasPast(auxTokens);
    const hasNeg = auxHasNegation(auxTokens);
    let attrMainPlan: AttributiveRealization | ConjugatedLemmaPlan;
    if (voice === "potential") {
      attrMainPlan = {
        kind: "attributive",
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens: runtimeTokens(auxTokens),
        contentToken: runtimeToken(contentToken),
        voice
      };
    } else if (hasNeg) {
      const suffix = hasPast ? " 않은" : " 않는";
      attrMainPlan = {
        kind: "conjugatedLemma",
        koreanLemma,
        irregular,
        koreanPos,
        ending: "지",
        suffix
      };
    } else if (hasPast) {
      attrMainPlan = {
        kind: "conjugatedLemma",
        koreanLemma,
        irregular,
        koreanPos,
        ending: "ㄴ/은"
      };
    } else {
      attrMainPlan = {
        kind: "conjugatedLemma",
        koreanLemma,
        irregular,
        koreanPos,
        ending: "ㄴ/는"
      };
    }

    const prefix = options.prefix ?? "";
    const attrPlan = PipelineCompoundMixin.composePrefixWithPredicate(prefix, attrMainPlan, { koreanPos });
    return attrPlan;
  }

  private realizeCompoundNoDewaNai(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    attrPlan: RenderPlan,
    negMatch: CompoundCopulaNegationMatch | undefined
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { cursor, after, consumed } = t;
    if (negMatch !== undefined) {
      const negConsumed = negMatch.consumed;
      const [polite, past, connective, additiveMo, conditionalNara] = negMatch.match;
      const followKind = conditionalNara ? null : cursor.lookahead(after + 1 + negConsumed - cursor.pos, classifyFollowConnective);
      const followConsumed = followKind === null ? 0 : 1;
      const suffixOptions = {
        polite,
        past,
        connective,
        additiveMo,
        conditionalNara,
        followKind
      };
      const suffix = compoundNoDewaNaiSuffixPlan(suffixOptions, 형용사);
      const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
      return [consumed + 1 + negConsumed + followConsumed, "", 형용사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNoCopulaChain(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    attrPlan: RenderPlan
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { cursor, tokens, after, n, consumed } = t;
    const copulaMatch = cursor.lookahead(1, copulaCursor => {
      const match = detectNoCopulaChain(copulaCursor, { consumers: ["compounds"] });
      return match === null ? null : { match, consumed: copulaCursor.consumed };
    });
    if (copulaMatch !== null) {
      const copConsumed = copulaMatch.consumed;
      const [kind, past, polite] = copulaMatch.match;
      const chainAfter = after + 1 + copConsumed;
      const modalKinds = new Set(["emphasis", "emphasis_limited", "emphasis_additive", "conjecture"]);
      const modalMatch = modalKinds.has(kind)
        ? cursor.lookahead(chainAfter - after, modalCursor => {
          const modal = detectKamoShirenaiAfterChain(modalCursor);
          return modal === null ? null : { modal, consumed: modalCursor.pos - chainAfter };
        })
        : null;
      const modal = modalMatch?.modal ?? null;
      if (modal !== null) {
        const modalConsumed = modalMatch!.consumed;
        const [modalPolite, modalPast] = modal;
        const suffix = compoundKamoModalSuffixPlan({
          modalKind: kind === "conjecture" ? "conjecture" : "emphasis",
          emphasisKind: kind,
          emphasisPast: past,
          modalPolite,
          modalPast
        }, 형용사);
        const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
        return [consumed + 1 + copConsumed + modalConsumed, "", 형용사, plan];
      }
      const question = (
        chainAfter < n &&
        kaMarkerRelationAt(tokens, chainAfter, ["compounds"])?.particleSubtype1 === 終助詞
      );
      const suffix = compoundNoCopulaChainSuffixPlan({ chainKind: kind, past, polite, question }, 형용사);
      const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
      return [consumed + 1 + copConsumed, "", 형용사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNoKamoShirenai(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    attrPlan: RenderPlan
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { cursor, tokens, after, n, consumed } = t;
    if (
      after + 4 <= n &&
      kaMarkerRelationAt(tokens, after + 1, ["compounds"])?.particleSubtype1 === 副助詞 &&
      cursor.peek(2)?.surface === "も" &&
      ((cursor.peek(2)?.pos ?? 0) & POS0) === 助詞 &&
      KAMO_SHIRENAI_LEMMAS.has(cursor.peek(3)?.dictionaryForm ?? "") &&
      ((cursor.peek(3)?.pos ?? 0) & POS0) === 動詞
    ) {
      const trailingAux = cursor.lookahead(4, collectAuxTokens);
      const modalPolite = auxHasPolite(trailingAux);
      const modalPast = auxHasPast(trailingAux);
      const suffix = compoundKamoShirenaiSuffixPlan({ modalPolite, modalPast }, 형용사);
      const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
      return [consumed + 4 + trailingAux.length, "", 형용사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNodaSfp(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    attrPlan: RenderPlan
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { cursor, consumed } = t;
    const sfpMatch = cursor.lookahead(1, sfpCursor => {
      const type = detectSfp(sfpCursor, 動詞, false);
      return { type, consumed: sfpCursor.consumed };
    });
    if (sfpMatch.consumed !== 0) {
      const suffix = compoundNodaSfpSuffixPlan({ casualSfp: sfpMatch.type, formalSfp: sfpMatch.type }, 형용사);
      const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
      return [consumed + 1 + sfpMatch.consumed, "", 형용사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundNoQuestion(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    attrPlan: RenderPlan
  ): CompoundResult | typeof NO_COMPOUND_SHAPE {
    const { tokens, after, n, consumed } = t;
    if (
      after + 1 < n &&
      kaMarkerRelationAt(tokens, after + 1, ["compounds"])?.particleSubtype1 === 終助詞
    ) {
      const suffix = compoundNodaSfpSuffixPlan({ casualSfp: null, formalSfp: "plain_q" }, 형용사);
      const plan = PipelineCompoundMixin.composePredicateWithSuffix(attrPlan, suffix, { koreanPos: 형용사 });
      return [consumed + 1, "", 형용사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundPostVerbPattern(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { koreanLemma, irregular, koreanPos, auxTokens, options, tokens, after, consumed } = t;
    let postVerbPattern = this.patterns.matchPostVerb(runtimeTokens(tokens), after);
    if (postVerbPattern !== undefined && postverbPatternRequiresTailRootOwnership(postVerbPattern.id)) {
      const locallyStructuredAspect = postverbAspectOperatorKind(postVerbPattern.id) !== undefined &&
        postVerbPattern.tailLemma !== null;
      if (!locallyStructuredAspect) {
        postVerbPattern = undefined;
      }
    }
    if (postVerbPattern !== undefined && (koreanPos === 동사 || koreanPos === 형용사)) {
      const consumedWithPattern = consumed + postVerbPattern.triggerLength;
      const mainConj = conjugate(koreanLemma, irregularType(irregular), postVerbPattern.mainVerbEnding);
      const mainPart = `${options.prefix ?? ""}${mainConj}`;
      if (postVerbPattern.tailText !== null) {
        const mainPlan = this.buildPredicatePlan({
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens,
          auxiliaryLemma: postVerbPattern.id,
          ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
          ...(options.prefixSource === undefined ? {} : { prefixSource: options.prefixSource }),
          connective: postVerbPattern.mainVerbEnding,
          verbConjType: options.verbConjType ?? null,
          voice: options.voice ?? "active"
        });
        const plan: RenderPlan = postVerbPattern.tailText === " 주세요"
          ? {
            kind: "giveRequest",
            base: mainPlan,
            koreanLemma,
            requestKind: "kudasai"
          }
          : PipelineCompoundMixin.composePredicateWithSuffix(mainPlan, postVerbPattern.tailText, { koreanPos });
        return [consumedWithPattern, "", koreanPos, plan];
      }
      const postVerbTailLemma = this.realizeCompoundPostVerbTailLemma(t, postVerbPattern, mainPart, consumedWithPattern);
      if (postVerbTailLemma !== NO_COMPOUND_SHAPE) {
        return postVerbTailLemma;
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundPostVerbTailLemma(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    postVerbPattern: PatternEntry,
    mainPart: string,
    consumedWithPattern: number
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, contentToken, tokens, after, n } = t;
    if (postVerbPattern.tailLemma !== null) {
      const tailStart = after + postVerbPattern.triggerLength;
      const tailLemma = postVerbPattern.tailLemma;
      return cursor.lookahead(tailStart - cursor.pos, tailAuxCursor => {
        const tailAux = collectAuxTokens(tailAuxCursor);
        const tailPos = postVerbPattern.tailKoreanPos || 동사;
        const tailVerbIndex = after + postVerbPattern.triggerLength - 1;
        const tailVerbToken = 0 <= tailVerbIndex && tailVerbIndex < n ? tokens[tailVerbIndex]! : contentToken;
        const attrPlan = this.buildAttributivePlan({
          cursor: tailAuxCursor,
          koreanLemma: tailLemma,
          irregular: postVerbPattern.tailIrregular ?? null,
          koreanPos: tailPos,
          auxTokens: tailAux,
          contentToken: tailVerbToken,
          tailLemmaMode: true
        });
        if (attrPlan !== null) {
          const plan = PipelineCompoundMixin.composePrefixWithPredicate(`${mainPart} `, attrPlan, { koreanPos: tailPos });
          return [consumedWithPattern + tailAux.length, "", tailPos, plan];
        }
        const nestedAfter = tailStart + tailAux.length;
        if (nestedAfter < n) {
          const nested = this.resolveCompoundTail(
            tailAuxCursor,
            tailLemma,
            postVerbPattern.tailIrregular ?? null,
            tailPos,
            tailAux,
            tailVerbToken,
            {
              rentaiCheckToken: tailVerbToken,
              rentaiPresent: false,
              entry: null,
              jpPos0: 動詞,
              prefix: `${mainPart} `
            }
          );
          if (nested !== null && nested[3] !== undefined && nested[3] !== null && nested[0] > 0) {
            return [consumedWithPattern + nested[0], nested[1], nested[2], nested[3], nested[4] ?? []];
          }
        }
        const plan = this.buildPredicatePlan({
          koreanLemma: tailLemma,
          irregular: postVerbPattern.tailIrregular ?? null,
          koreanPos: tailPos,
          auxTokens: tailAux,
          auxiliaryLemma: tailLemma,
          prefix: `${mainPart} `
        });
        return [consumedWithPattern + tailAux.length, "", tailPos, plan];
      });
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundNaitoTerminal(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, options, consumed } = t;
    const naitoTerminal = cursor.lookahead(0, c =>
      matchStandaloneNaitoTerminal(c, auxTokens) === null ? null : c.consumed
    );
    if (naitoTerminal !== null && (koreanPos === 동사 || koreanPos === 형용사)) {
      const mainConj = conjugate(koreanLemma, irregularType(irregular), "아/어");
      const mainPart = `${options.prefix ?? ""}${mainConj}야 `;
      const plan = this.buildPredicatePlan({
        koreanLemma: "하다",
        irregular: "여",
        koreanPos: 동사,
        auxTokens: [],
        auxiliaryLemma: "하다",
        prefix: mainPart
      });
      return [consumed + naitoTerminal, "", 동사, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundNaitoConditional(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, consumed, voice } = t;
    const naitoConditional = cursor.lookahead(0, c =>
      matchNaitoConditional(c, auxTokens, this.lookups) === null ? null : c.consumed
    );
    if (naitoConditional !== null && (koreanPos === 동사 || koreanPos === 형용사)) {
      const totalConsumed = consumed + naitoConditional;
      if (koreanLemma === "있다" && auxHasNegation(auxTokens) && (options.prefix ?? "").endsWith("고 ")) {
        const prefix = `${options.prefix ?? ""}있지 `;
        const plan = this.buildPredicatePlan({
          koreanLemma: "않다",
          irregular: null,
          koreanPos: 형용사,
          auxTokens: [],
          auxiliaryLemma: contentToken.dictionaryForm,
          prefix,
          prefixSource: options.prefixSource ?? null,
          connective: "면",
          verbConjType: options.verbConjType ?? null,
          voice
        });
        return [totalConsumed, "", 형용사, plan];
      }
      const plan = this.buildPredicatePlan({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        auxiliaryLemma: contentToken.dictionaryForm,
        prefix: options.prefix ?? "",
        prefixSource: options.prefixSource ?? null,
        connective: "면",
        verbConjType: options.verbConjType ?? null
      });
      return [totalConsumed, "", koreanPos, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundObligationBridge(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    runtimeCursor: TokenCursor<RuntimeHaruToken>
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, n, consumed, voice } = t;
    const obligationBridge = cursor.lookahead(after - cursor.pos, c =>
      detectNaitoBridgeFromAux(runtimeTokens(auxTokens), c)
    );
    if (obligationBridge !== null && (koreanPos === 동사 || koreanPos === 형용사)) {
      const follower = obligationBridge[1];
      const obligationCursor = runtimeCursor.fork(follower, n, follower);
      const obligationTail = matchObligationTail(obligationCursor);
      if (obligationTail !== null) {
        const tailConsumed = obligationCursor.consumed;
        const [polite, past] = obligationTail;
        const positiveAux = auxTokens.slice(0, Math.max(0, auxTokens.length - 1));
        const mainPlan = this.buildPredicatePlan({
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens: positiveAux,
          auxiliaryLemma: contentToken.dictionaryForm,
          prefix: options.prefix ?? "",
          prefixSource: options.prefixSource ?? null,
          connective: "아/어야",
          verbConjType: options.verbConjType ?? null,
          voice
        });
        const tailPlan = this.buildPredicatePlan({
          koreanLemma: "하다",
          irregular: "여",
          koreanPos: 동사,
          auxTokens: buildSyntheticAux(polite, past),
          auxiliaryLemma: "하다",
          prefix: " ",
          prefixSource: PipelineCompoundMixin.rulePlanSource(" ", "compound_colloquial_obligation_tail_spacing")
        });
        const plan = PipelineCompoundMixin.composePredicateWithSuffix(mainPlan, tailPlan, {
          koreanPos: 동사,
          suffixSource: PipelineCompoundMixin.rulePlanSource(" 하다", "compound_colloquial_obligation")
        });
        return [consumed + (follower - after) + tailConsumed, "", 동사, plan];
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundSouHearsay(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, options, tokens, after, n, consumed } = t;
    const souCursor = cursor.fork(after, n, after);
    const souMatch = matchSouDaHearsay(souCursor);
    if (souMatch !== undefined && (koreanPos === 동사 || koreanPos === 형용사)) {
      const souExtra = souCursor.consumed;
      const souAux = souMatch;
      const totalConsumed = consumed + souExtra;
      const mainConj = buildModalMainConj(koreanLemma, irregular, "ㄹ/을", {
        hasPast: auxHasPast(auxTokens),
        hasNeg: auxHasNegation(auxTokens)
      });
      const souPrefix = `${options.prefix ?? ""}${mainConj} 것 `;
      const lastSouAux = souAux.length > 0 ? souAux.at(souAux.length - 1) ?? null : null;
      const lastSurface = lastSouAux?.surface ?? "";
      if (lastSurface === "な" && lastSouAux !== null) {
        const attrPlan = this.buildAttributivePlan({
          cursor: souCursor,
          koreanLemma: "같다",
          irregular: null,
          koreanPos: 형용사,
          auxTokens: [],
          contentToken: lastSouAux,
          fallbackToken: lastSouAux,
          forceNominalHead: false
        });
        if (attrPlan !== null) {
          const plan = PipelineCompoundMixin.composePrefixWithPredicate(souPrefix, attrPlan, {
            koreanPos: 형용사,
            prefixSource: options.prefixSource ?? null
          });
          return [totalConsumed, "", 형용사, plan];
        }
      }
      if (lastSurface === "で") {
        const plan = this.buildPredicatePlan({
          koreanLemma: "같다",
          irregular: null,
          koreanPos: 형용사,
          auxTokens: [],
          auxiliaryLemma: "そう",
          prefix: souPrefix,
          prefixSource: options.prefixSource ?? null,
          connective: "아/어서"
        });
        return [totalConsumed, "", 형용사, plan];
      }
      return this.resolveCompoundTail(
        souCursor,
        "같다",
        null,
        형용사,
        buildSyntheticAux(auxHasPolite(souAux), auxHasPast(souAux)),
        tokens[after]!,
        {
          rentaiCheckToken: lastSouAux ?? tokens[after] ?? null,
          entry: null,
          prefix: souPrefix,
          prefixSource: options.prefixSource ?? null
        }
      );
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundQuotativeTo(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, tokens, after, n, consumed, voice } = t;
    const compoundQuoteMarker = quoteMarkerRelationAt(tokens, after, { consumers: ["compounds"] });
    if (
      after < n &&
      compoundQuoteMarker?.canonicalSurface === "と" &&
      (koreanPos === 동사 || koreanPos === 형용사) &&
      cursor.lookahead(after - cursor.pos, c => isQuotativeToTokensWide(c, this.lookups))
    ) {
      const plan = this.buildPredicatePlan({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        auxiliaryLemma: contentToken.dictionaryForm,
        prefix: options.prefix ?? "",
        prefixSource: options.prefixSource ?? null,
        connective: "다고",
        verbConjType: options.verbConjType ?? null,
        voice
      });
      return [consumed + 1, "", koreanPos, plan];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundRemovedPostAux(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    runtimeCursor: TokenCursor<RuntimeHaruToken>
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, n, consumed, voice } = t;
    const postAuxTokens = runtimeCursor.tokens;
    const postAuxContext = {
      cursor: runtimeCursor.fork(after, n, Math.max(0, after - consumed)),
      tokens: postAuxTokens,
      start: Math.max(0, after - consumed),
      n,
      token: runtimeToken(contentToken),
      pos0: options.jpPos0 ?? (contentToken.pos & POS0),
      koreanLemma,
      koreanPos,
      auxTokens,
      consumed,
      after
    };
    const removedPostAux = matchRemovedPostAuxPattern({
      patterns: {
        matchPostAux: (candidateTokens, candidateAfter, candidateAux) =>
          (this.patterns.matchPostAux(candidateTokens, candidateAfter, runtimeTokens(candidateAux ?? [])) ?? null) as PostAuxPatternLike | null
      }
    }, postAuxContext, this.lookups);
    if (removedPostAux !== null) {
      const plan = this.buildPredicatePlan({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        auxiliaryLemma: contentToken.dictionaryForm,
        prefix: options.prefix ?? "",
        prefixSource: options.prefixSource ?? null,
        verbConjType: options.verbConjType ?? null,
        voice
      });
      return [
        removedPostAux.consumed,
        "",
        koreanPos,
        plan,
        [buildUnsupportedPostAuxWarning(postAuxContext, removedPostAux)]
      ];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundClauseConnector(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    runtimeCursor: TokenCursor<RuntimeHaruToken>,
    clauseCursor: TokenCursor<MatcherToken>
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, n, consumed, voice } = t;
    const clause = matchClauseConnector(clauseCursor);
    if (clause !== undefined) {
      const extra = clauseCursor.consumed;
      const transformEnding = (raw: string): string => options.entry !== undefined && options.entry !== null
        ? adjustTeConnectiveEnding(runtimeCursor.fork(after, n, after), options.entry, raw, this.lookups)
        : raw;
      const ending = transformEnding(clause.ending);
      const plan = this.buildPredicatePlan({
        koreanLemma,
        irregular,
        koreanPos,
        auxTokens,
        auxiliaryLemma: contentToken.dictionaryForm,
        prefix: options.prefix ?? "",
        prefixSource: options.prefixSource ?? null,
        connective: ending,
        verbConjType: options.verbConjType ?? null,
        voice
      });
      const planWithChoice = clause.boundaryScan === null ? plan : attachTeConnectiveBoundaryChoice(plan, {
        ...clause.boundaryScan,
        endingIfVerbal: transformEnding("고"),
        endingIfRequest: transformEnding("아/어")
      }) ?? plan;
      return [consumed + extra, "", koreanPos, planWithChoice];
    }
    return NO_COMPOUND_SHAPE;
  }

  private resolveCompoundAttributive(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput,
    clauseCursor: TokenCursor<MatcherToken>
  ): CompoundResult | null | typeof NO_COMPOUND_SHAPE {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, n, consumed, voice } = t;
    const checkRentai = (
      (options.rentaiCheckToken !== undefined && options.rentaiCheckToken !== null && auxTokens.length === 0 && hasRentaikei(options.rentaiCheckToken)) ||
      (auxTokens.length > 0 && hasRentaikei(auxTokens[auxTokens.length - 1]!))
    );
    if (checkRentai) {
      if (options.rentaiPresent === true && auxTokens.length === 0) {
        const attrPlan = this.buildAttributivePlan({
          cursor: clauseCursor,
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens: [],
          contentToken,
          fallbackToken: options.rentaiCheckToken ?? null,
          forceNominalHead: true,
          tailLemmaMode: options.tailLemmaMode ?? false,
          voice
        });
        if (attrPlan !== null) {
          let plan: RenderPlan = attrPlan;
          if ((options.prefix ?? "").length > 0) {
            plan = PipelineCompoundMixin.composePrefixWithPredicate(options.prefix ?? "", attrPlan, {
              koreanPos,
              prefixSource: options.prefixSource ?? null,
              prefixCarrierAuxiliaryLemma: (options.rentaiCheckToken ?? contentToken).dictionaryForm
            });
          }
          return [consumed, "", koreanPos, plan];
        }
      } else {
        const attrPlan = this.buildAttributivePlan({
          cursor: clauseCursor,
          koreanLemma,
          irregular,
          koreanPos,
          auxTokens,
          contentToken,
          fallbackToken: auxTokens.length === 0 ? options.rentaiCheckToken ?? null : null,
          tailLemmaMode: options.tailLemmaMode ?? false,
          voice
        });
        const auxLemma = auxTokens.length > 0
          ? auxTokens[auxTokens.length - 1]!.dictionaryForm
          : (options.rentaiCheckToken ?? contentToken).dictionaryForm;
        if (attrPlan !== null) {
          const plan: RenderPlan = (options.prefix ?? "").length > 0
            ? PipelineCompoundMixin.composePrefixWithPredicate(options.prefix ?? "", attrPlan, {
              koreanPos,
              prefixSource: options.prefixSource ?? null,
              prefixCarrierAuxiliaryLemma: auxLemma
            })
            : attrPlan;
          return [consumed, "", koreanPos, plan];
        }
        const attr = tryAttributiveAt(cursor.fork(after, n, after), koreanLemma, irregular, koreanPos, auxTokens, contentToken, this.lookups);
        if (attr !== null) {
          const plan = PipelineCompoundMixin.wrapCompoundSurface(attr, koreanPos, {
            prefix: options.prefix ?? "",
            prefixSource: options.prefixSource ?? null
          });
          return [consumed, "", koreanPos, plan];
        }
      }
    }
    return NO_COMPOUND_SHAPE;
  }

  private realizeCompoundTerminal(
    this: PipelineCompoundResolver & PipelineCompoundMixin,
    t: CompoundTailInput
  ): CompoundResult {
    const { cursor, koreanLemma, irregular, koreanPos, auxTokens, contentToken, options, after, n, consumed, voice } = t;
    const sfpCursor = cursor.fork(after, n, after);
    const sfpType = detectSfp(sfpCursor, options.jpPos0 ?? 動詞, auxTokens.length > 0);
    const plan = this.buildPredicatePlan({
      koreanLemma,
      irregular,
      koreanPos,
      auxTokens,
      auxiliaryLemma: contentToken.dictionaryForm,
      prefix: options.prefix ?? "",
      prefixSource: options.prefixSource ?? null,
      sfp: sfpType,
      verbConjType: options.verbConjType ?? null,
      voice
    });
    return [consumed + sfpCursor.consumed, "", koreanPos, plan];
  }

  buildPredicatePlan(options: BuildPredicatePlanOptions): RenderPlan {
    const main: RenderPlan = {
      kind: "lemma",
      entry: null,
      koreanLemma: options.koreanLemma,
      koreanPos: options.koreanPos,
      irregular: options.irregular,
      auxTokens: runtimeTokens(options.auxTokens),
      connective: options.connective ?? null,
      sfp: options.sfp ?? null,
      verbConjType: options.verbConjType ?? null,
      voice: options.voice ?? "active"
    };
    const prefix = options.prefix ?? "";
    if (prefix.length > 0) {
      return PipelineCompoundMixin.composePrefixWithPredicate(prefix, main, {
        koreanPos: options.koreanPos,
        prefixSource: options.prefixSource ?? null,
        prefixCarrierAuxiliaryLemma: options.auxiliaryLemma
      });
    }
    return main;
  }

  buildAttributivePlan(this: PipelineCompoundResolver & PipelineCompoundMixin, options: BuildAttributivePlanOptions): AttributiveRealization | null {
    const head = skipPrefixLocal(options.cursor);
    const headToken = head < options.cursor.end ? options.cursor.tokens[head] : undefined;
    const headPos0 = (headToken?.pos ?? 0) & POS0;
    if (options.forceNominalHead === true) {
      if ((headPos0 !== 名詞) && (headPos0 !== 代名詞)) {
        return null;
      }
    } else if (!pos0in(headPos0, ATTRIBUTIVE_HEAD_BITS)) {
      return null;
    }
    const planContentToken = options.fallbackToken ?? options.contentToken;
    let contextIdx = options.contentIdx ?? null;
    if (contextIdx === null) {
      const found = options.cursor.tokens.findIndex((token) => token === options.contentToken);
      contextIdx = found < 0 ? null : found;
    }
    const nominalHead = (headPos0 === 名詞) || (headPos0 === 代名詞) ? headToken ?? null : null;
    const nominalAttributiveEvidence = nominalAttributiveEvidenceFrom(
      planContentToken,
      null,
      options.koreanLemma
    );
    const evidenceOption = nominalAttributiveEvidence === undefined
      ? {}
      : { nominalAttributiveEvidence };
    if (
      options.tailLemmaMode !== true &&
      resolveAttributive(options.koreanLemma, options.irregular, options.koreanPos, options.auxTokens, planContentToken, {
        headNounToken: nominalHead,
        tokens: options.cursor.tokens,
        contentIdx: contextIdx,
        ...evidenceOption,
        lookups: this.lookups
      }) === null
    ) {
      return null;
    }
    return {
      kind: "attributive",
      koreanLemma: options.koreanLemma,
      irregular: options.irregular,
      koreanPos: options.koreanPos,
      auxTokens: runtimeTokens(options.auxTokens),
      contentToken: runtimeToken(planContentToken),
      ...evidenceOption,
      ...(nominalHead === null ? {} : { headNounToken: runtimeToken(nominalHead) }),
      plainVerbEnding: options.auxTokens.length === 0 && options.koreanPos === 동사
        ? selectPlainVerbAttributiveEnding(options.koreanLemma, planContentToken, nominalHead, {
          tokens: options.cursor.tokens,
          contentIdx: contextIdx,
          lookups: this.lookups
        })
        : null,
      tailLemmaMode: options.tailLemmaMode ?? false,
      voice: options.voice ?? "active",
      tameReasonHead: isTameReasonHeadContext(nominalHead, options.cursor.tokens, contextIdx, this.lookups),
      tokoroResultHead: isTokoroResultHeadContext(nominalHead, options.cursor.tokens, contextIdx, this.lookups),
      tokoroTemporalDeHead: isTokoroTemporalDeHeadContext(nominalHead, options.cursor.tokens, contextIdx, this.lookups),
      koroTemporalNiHead: isKoroTemporalNiHeadContext(nominalHead, options.cursor.tokens, contextIdx),
      tokoroConcessiveDeHead: isTokoroConcessiveDeHeadContext(nominalHead, options.cursor.tokens, contextIdx, this.lookups)
    };
  }
}

function compoundNoDewaNaiSuffixPlan(options: {
  readonly polite: boolean;
  readonly past: boolean;
  readonly connective: boolean;
  readonly additiveMo: boolean;
  readonly conditionalNara: boolean;
  readonly followKind?: "conditional" | "contrastive" | "causal" | null;
}, koreanPos: number): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "no_dewa_nai",
      ...options,
      koreanPos
    }
  };
}

function compoundNoCopulaChainSuffixPlan(options: {
  readonly chainKind: string;
  readonly past: boolean;
  readonly polite: boolean;
  readonly question: boolean;
}, koreanPos: number): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "no_copula_chain",
      ...options,
      koreanPos
    }
  };
}

function compoundKamoModalSuffixPlan(options: {
  readonly modalKind: "conjecture" | "emphasis";
  readonly emphasisKind?: string | null;
  readonly emphasisPast?: boolean;
  readonly modalPolite: boolean;
  readonly modalPast: boolean;
}, koreanPos: number): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "kamo_modal",
      ...options,
      koreanPos
    }
  };
}

function compoundKamoShirenaiSuffixPlan(options: {
  readonly modalPolite: boolean;
  readonly modalPast: boolean;
}, koreanPos: number): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "kamo_shirenai",
      ...options,
      koreanPos
    }
  };
}

function compoundNodaSfpSuffixPlan(options: {
  readonly casualSfp?: string | null;
  readonly formalSfp?: string | null;
}, koreanPos: number): RenderPlan {
  return {
    kind: "compoundNominalSuffix",
    payload: {
      kind: "noda_sfp",
      ...options,
      koreanPos
    }
  };
}

export function buildModalMainConj(
  koreanLemma: string,
  irregular: IrregularType | null,
  ending: string,
  options: { readonly hasPast: boolean; readonly hasNeg: boolean }
): string {
  if (ending === "ㄹ/을") {
    if (options.hasNeg && options.hasPast) {
      return `${conjugate(koreanLemma, irregularType(irregular), "지")} 않았을`;
    }
    if (options.hasPast) {
      return `${conjugate(koreanLemma, irregularType(irregular), "았/었")}을`;
    }
    if (options.hasNeg) {
      return `${conjugate(koreanLemma, irregularType(irregular), "지")} 않을`;
    }
  }
  return conjugate(koreanLemma, irregularType(irregular), ending);
}

export function startsWithPotentialAux(auxTokens: readonly Pick<MatcherToken, "pos">[]): boolean {
  return auxTokens.length > 0 && (auxTokens[0]!.pos & POS4) === 助動詞_レル;
}

export function matchStandaloneNaitoTerminal(
  cursor: TokenCursor<MatcherToken>,
  auxTokens: readonly MatcherToken[]
): true | null {
  const { pos } = cursor;
  const bridge = detectNaitoBridgeFromAux(runtimeTokens(auxTokens), cursor);
  if (bridge === null || bridge[0] !== "naito") {
    return null;
  }
  const follower = bridge[1];
  return cursor.tx(c => {
    c.advance(follower - pos);
    return matchTerminalNaitoAfterTo(c) === null ? null : true;
  });
}

export function matchNaitoConditional(
  cursor: TokenCursor<MatcherToken>,
  auxTokens: readonly MatcherToken[],
  lookups: LookupTables
): true | null {
  const { tokens, pos, end: n } = cursor;
  const bridge = detectNaitoBridgeFromAux(runtimeTokens(auxTokens), cursor);
  if (bridge === null || bridge[0] !== "naito") {
    return null;
  }
  const follower = bridge[1];
  if (follower >= n) {
    return null;
  }
  if (isQuotativeToTokensWide(cursor, lookups)) {
    return null;
  }
  const followerToken = runtimeTokens(tokens)[follower];
  if (followerToken === undefined || isObligationMarker(followerToken)) {
    return null;
  }
  return cursor.tx(c => {
    c.advance(follower - pos);
    return isConditionalFollower(c) ? true : null;
  });
}

function skipPrefixLocal(cursor: TokenCursor<MatcherToken>): number {
  const index = nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) ?? cursor.end;
  if (index < cursor.end && ((cursor.tokens[index]?.pos ?? 0) & POS0) === 接頭辞 && index + 1 < cursor.end) {
    return index + 1;
  }
  return index;
}

function isCopulaRenyouDeNi(token: MatcherToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  if ((token.pos & POS4) !== 助動詞_ダ && (token.pos & POS4) !== 助動詞_デス) {
    return false;
  }
  if ((token.pos & POS5A) !== 連用形_) {
    return false;
  }
  return copulaDeMarkerRelationForToken(token, -1, { consumers: ["compounds"] }) !== null ||
    copulaNiMarkerRelationForToken(token, -1, { consumers: ["compounds"] }) !== null;
}

function tryAttributiveAt(
  cursor: TokenCursor<MatcherToken>,
  koreanLemma: string,
  irregular: IrregularType | null,
  koreanPos: number,
  auxTokens: readonly MatcherToken[],
  contentToken: MatcherToken,
  lookups: LookupTables
): string | null {
  const head = skipPrefixLocal(cursor);
  if (head >= cursor.end) {
    return null;
  }
  const headToken = cursor.tokens[head]!;
  const headPos0 = headToken.pos & POS0;
  if ((headPos0 === 名詞) || (headPos0 === 代名詞)) {
    return resolveAttributive(koreanLemma, irregular, koreanPos, auxTokens, contentToken, {
      headNounToken: headToken,
      tokens: cursor.tokens,
      contentIdx: null,
      lookups
    });
  }
  if ((headPos0 === 形容詞0) || (headPos0 === 連体詞) || (headPos0 === 形状詞)) {
    return resolveAttributive(koreanLemma, irregular, koreanPos, auxTokens, contentToken, {
      tokens: cursor.tokens,
      contentIdx: null,
      lookups
    });
  }
  return null;
}

