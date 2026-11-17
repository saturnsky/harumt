import type { MorphemeDictionary } from "../../../../dictionary/morpheme.js";
import { derivationForSense } from "../../../../dictionary/derivation.js";
import { mergeDirectionVerb } from "../../../pattern-runtime.js";
import { firstTranslationCandidate, translationCandidateProjectionOrdinals } from "../../../candidate-runtime.js";

import type { MorphemeEntry, MorphemeSense } from "../../../../types/dictionary.js";
import type { BenefactiveContext, TranslationCandidate } from "../../../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { asIrregular, type IrregularType } from "../../../../generator/conjugator.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import { benefactiveAbsorptionKind, hasCounterfactualCueAfter } from "../../../content-resolver/runtime-helpers.js";
import { senseSourceFrameMatch, type ContextSense } from "../../../context.js";
import {
  contentHeadDictionaryContainsLemma,
  selectedContentHeadCandidate,
  type ContentHeadHydrationMetadata
} from "../../integration/content-head-metadata.js";
import {
  conditionalDiscoveryEvidenceWindowForToken,
  conditionalEvidenceWindowForToken,
  conditionalSourceAllowsRetrospectiveDiscovery,
  hasCounterfactualResultCueAfter,
  hasRetrospectiveDiscoveryCueAfter
} from "../../../semantics/conditional.js";
import { quoteHostHandoffKindForHost, quoteStructuralRelationContainingContentToken } from "../../../structural-relation/quote.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { TokenCursor } from "../../../token-cursor.js";
import { lexicalTailAbsorptionsDropCausative, lexicalTailAbsorptionsFromEntry } from "../postverb-events.js";
import { isNounToSareruContext, isSahenBoundVerbAfterSahen } from "../../../predicate-helpers.js";
import { isNoSeiNiSuruContext } from "../../boundary/no-sei.js";
import { hydrateAspectSemanticOps } from "./aspect-semantics.js";
import {
  benefactivePatternIdForAspect
} from "./span-metadata.js";
import type {
  AuxLayerNode,
  AuxOpNode,
  BenefactiveAspectOp,
  BenefactiveLexicalTailAbsorptionKind,
  HeadHypothesisCarrier,
  SimpleAspectOp,
  StemCandidate,
  StemNode,
  TailNode,
  TailRoot
} from "./grammar.js";
import {
  firstAuxLayer,
  isBenefactiveAspectOp,
  isRequestAspectOp,
  negationOpAdmitsShortForm,
  stemSupportsProjectionCategory
} from "./inspect.js";
import { shortNegationPolicyForCommittedStem } from "./short-negation-policy.js";
import {
  findStemCandidateByTranslationIdentity,
  rewriteStemCandidatesPreservingIdentity,
  stemCandidateIdentitiesEqual,
  stemCandidateIdentity,
  stemCandidateProvenanceForTranslation,
  stemCandidatePatchFromTranslationCandidate
} from "./stem-candidate-identity.js";

import { POS5, 連用形_促音便, 동사, 명사, 형용사 } from "../../../../types/pos.js";
export async function hydrateTailChainRootWithHeadMetadata(
  root: TailRoot,
  headResult: ContentHeadHydrationMetadata,
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateTokenIdx: number,
  dictionary: MorphemeDictionary,
  lookups: LookupTables,
  numeric: NumericTables
): Promise<TailRoot> {
  const tail = await hydrateTailNodeWithHeadMetadata(root.tail, headResult, tokens, cursor, predicateTokenIdx, dictionary, lookups, numeric);
  const layer = firstAuxLayer(tail);
  const headHypothesis = layer?.stem.kind === "candidateSet" &&
    layer.stem.headHypothesis !== undefined &&
    !headHypothesisMatchesStemCandidates(root.headHypothesis, layer.stem.candidates)
    ? layer.stem.headHypothesis
    : undefined;
  return tail === root.tail && headHypothesis === undefined
    ? root
    : {
        ...root,
        tail,
        ...(headHypothesis === undefined ? {} : { headHypothesis })
      };
}

function headHypothesisMatchesStemCandidates(
  headHypothesis: HeadHypothesisCarrier | undefined,
  candidates: readonly StemCandidate[]
): boolean {
  return headHypothesis !== undefined &&
    headHypothesis.candidates.length === candidates.length &&
    candidates.every((candidate, index) => {
      const hypothesis = headHypothesis.candidates[index];
      return hypothesis !== undefined && stemCandidateIdentitiesEqual(
        stemCandidateIdentity(candidate),
        { provenance: hypothesis.provenance, projectionOrdinal: hypothesis.projectionOrdinal }
      );
    });
}

async function hydrateTailNodeWithHeadMetadata(
  node: TailNode,
  headResult: ContentHeadHydrationMetadata,
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateTokenIdx: number,
  dictionary: MorphemeDictionary,
  lookups: LookupTables,
  numeric: NumericTables
): Promise<TailNode> {
  if (node.kind === "connective") {
    const inner = await hydrateTailNodeWithHeadMetadata(node.inner, headResult, tokens, cursor, predicateTokenIdx, dictionary, lookups, numeric);
    const outer = await hydrateTailNodeWithHeadMetadata(node.outer, headResult, tokens, cursor, predicateTokenIdx, dictionary, lookups, numeric);
    return inner === node.inner && outer === node.outer
      ? node
      : { ...node, inner: inner as AuxLayerNode, outer };
  }
  return await hydrateAuxLayerWithHeadMetadata(node, headResult, tokens, cursor, predicateTokenIdx, dictionary, lookups, numeric);
}

async function hydrateAuxLayerWithHeadMetadata(
  layer: AuxLayerNode,
  headResult: ContentHeadHydrationMetadata,
  tokens: readonly RuntimeHaruToken[],
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateTokenIdx: number,
  dictionary: MorphemeDictionary,
  lookups: LookupTables,
  numeric: NumericTables
): Promise<AuxLayerNode> {
  let changed = false;
  let stem: StemNode = hydrateTailStemWithHeadResult(layer.stem, headResult, {
    allowPostVerbMainOverride: !layer.ops.some((op) => op.kind === "voice" && op.voice === "causative")
  });
  if (stem !== layer.stem) {
    changed = true;
  }
  let ops: AuxLayerNode["ops"] = layer.ops;

  const sahenBoundStem = await hydrateSahenBoundVerbStem(stem, tokens, predicateTokenIdx, dictionary);
  if (sahenBoundStem !== null) {
    stem = sahenBoundStem;
    changed = true;
  }

  const nounToSareruHydration = hydrateNounToSareruStem(stem, ops, tokens, predicateTokenIdx);
  if (nounToSareruHydration !== null) {
    stem = nounToSareruHydration.stem;
    ops = nounToSareruHydration.ops;
    changed = true;
  }

  const teHoshiiMainOverride = hydrateTeHoshiiMainLemmaOverride({ ...layer, stem, ops }, lookups);
  if (teHoshiiMainOverride !== null) {
    stem = teHoshiiMainOverride;
    changed = true;
  }

  const lexicalizedTeHoshii = lexicalizedCausativeTeHoshii(layer, lookups);
  if (lexicalizedTeHoshii !== null) {
    stem = lexicalizedTeHoshii.stem;
    ops = layer.ops.filter((_, idx) => idx !== lexicalizedTeHoshii.causativeOpIdx);
    changed = true;
  }

  const lexicalizedCausative = lexicalizedCausativeFromHeadResult(stem, ops, headResult);
  if (lexicalizedCausative !== null) {
    stem = lexicalizedCausative.stem;
    ops = lexicalizedCausative.ops;
    changed = true;
  }

  const passiveQuestionQuoteHost = hydratePassiveQuestionQuoteHost(stem, ops, headResult, cursor, predicateTokenIdx, lookups);
  if (passiveQuestionQuoteHost !== null) {
    stem = passiveQuestionQuoteHost.stem;
    ops = passiveQuestionQuoteHost.ops;
    changed = true;
  }

  const hydratedOps = ops.map((op) => {
    if (!isBenefactiveAspectOp(op)) {
      return op;
    }
    const hydrated = hydrateBenefactiveLexicalAbsorption(op, headResult, stem);
    if (hydrated !== op) {
      changed = true;
    }
    return hydrated;
  });
  if (hydratedOps.some((op, idx) => op !== ops[idx])) {
    ops = hydratedOps;
  }

  const lexicalizedDirectional = hydrateLexicalizedDirectionalAspect(stem, ops, tokens, predicateTokenIdx, lookups, numeric);
  if (lexicalizedDirectional !== null) {
    stem = lexicalizedDirectional.stem;
    ops = lexicalizedDirectional.ops;
    changed = true;
  }

  const aspectHydration = hydrateAspectSemanticOps({
    ops,
    stem,
    headEntry: headResult.entry,
    tokens,
    predicateTokenIdx,
    lookups,
    numeric
  });
  if (aspectHydration !== null) {
    stem = aspectHydration.stem;
    ops = aspectHydration.ops;
    changed = true;
  }
  const noSeiHydration = hydrateNoSeiNiSuruStem(stem, ops, tokens, predicateTokenIdx);
  if (noSeiHydration !== null) {
    stem = noSeiHydration;
    changed = true;
  }
  const connectiveHydration = hydrateAspectConnectiveSemantics(ops);
  const benefactiveConnectiveHydration = hydrateBenefactiveConditionalSemantics(
    connectiveHydration ?? ops,
    tokens,
    lookups
  );
  const resultConditionalHydration = hydrateResultConditionalSemantics(
    benefactiveConnectiveHydration ?? connectiveHydration ?? ops,
    tokens,
    lookups,
    cursor
  );
  if (connectiveHydration !== null || benefactiveConnectiveHydration !== null || resultConditionalHydration !== null) {
    ops = resultConditionalHydration ?? benefactiveConnectiveHydration ?? connectiveHydration ?? ops;
    changed = true;
  }

  return changed ? { ...layer, stem, ops } : layer;
}

function hydrateTailStemWithHeadResult(
  stem: StemNode,
  headResult: ContentHeadHydrationMetadata,
  options: { readonly allowPostVerbMainOverride: boolean }
): StemNode {
  if (stem.kind === "candidateSet") {
    return stem;
  }
  if (stem.koreanPrefix !== undefined || stem.koreanSuffix !== undefined) {
    return stem;
  }
  const override = tailStemOverrideFromHeadResult(headResult, options);
  if (stem.commitment === "suppletive_negation") {
    return stem;
  }
  if (
    stem.commitment === "resolved_sense" &&
    (override === null || contentHeadDictionaryContainsLemma(headResult, override.lemma))
  ) {
    return stem;
  }
  if (
    override === null ||
    !tailStemHasSingleLexicalSource(stem) ||
    !tailStemCanUseHeadOverride(stem, override.koreanPos)
  ) {
    return stem;
  }
  return rewriteTailStemLemmaFromContentCandidate(stem, override.candidate);
}

function hydrateAspectConnectiveSemantics(ops: readonly AuxOpNode[]): AuxLayerNode["ops"] | null {
  let changed = false;
  const nextOps = ops.map((op, index) => {
    if (
      op.kind !== "connective" ||
      op.connective !== "conditional" ||
      op.surface !== "たら" ||
      op.conditionalFlavor === "counterfactual"
    ) {
      return op;
    }
    const previous = ops[index - 1];
    if (
      previous?.kind !== "aspect" ||
      previous.aspect !== "te_aru" ||
      previous.semantic === undefined ||
      !teAruAuxIsSokuonPastAnchor(previous)
    ) {
      return op;
    }
    changed = true;
    return { ...op, conditionalFlavor: "counterfactual" as const };
  });
  return changed ? nextOps : null;
}

function hydrateBenefactiveConditionalSemantics(
  ops: readonly AuxOpNode[],
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): AuxLayerNode["ops"] | null {
  let changed = false;
  const nextOps = ops.map((op, index) => {
    if (
      op.kind !== "connective" ||
      op.connective !== "conditional" ||
      !benefactiveBefore(ops, index)
    ) {
      return op;
    }
    const tokenIdx = op.source.tokenIndices.length > 0
      ? Math.max(...op.source.tokenIndices)
      : -1;
    const evidenceWindow = conditionalEvidenceWindowForToken(tokens, tokenIdx, lookups);
    const hasCounterfactualCue = hasCounterfactualCueAfter(
      { tokens, pos: tokenIdx + 1, end: tokens.length },
      evidenceWindow
    );
    const hasPotentialBenefactive = benefactivePotentialBefore(ops, index);
    const flavor = hasPotentialBenefactive
      ? (hasCounterfactualCue ? ("counterfactual" as const) : ("plain" as const))
      : (
        op.conditionalFlavor === "counterfactual" || hasCounterfactualCue
          ? ("counterfactual" as const)
          : ("plain" as const)
      );
    if (op.conditionalFlavor === flavor) {
      return op;
    }
    changed = true;
    return { ...op, conditionalFlavor: flavor };
  });
  return changed ? nextOps : null;
}

function conditionalHostIsCopulaPredicate(ops: readonly AuxOpNode[], conditionalIndex: number): boolean {
  for (let index = conditionalIndex - 1; index >= 0; index -= 1) {
    const op = ops[index];
    if (op === undefined || op.kind === "negation" || op.kind === "polite" || op.kind === "tense") {
      continue;
    }
    return op.kind === "copula" || op.kind === "adjCopulaBridge";
  }
  return false;
}

function hydrateResultConditionalSemantics(
  ops: readonly AuxOpNode[],
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  cursor: TokenCursor<RuntimeHaruToken>
): AuxLayerNode["ops"] | null {
  let changed = false;
  const nextOps = ops.map((op, index) => {
    if (op.kind !== "connective" || op.connective !== "conditional") {
      return op;
    }
    const tokenIdx = op.source.tokenIndices.length > 0
      ? Math.max(...op.source.tokenIndices)
      : -1;
    if (tokenIdx < 0) {
      return op;
    }
    const quoteRelation = quoteStructuralRelationContainingContentToken(cursor, tokenIdx, lookups);
    const evidenceWindow = quoteRelation === undefined
      ? conditionalEvidenceWindowForToken(tokens, tokenIdx, lookups)
      : clipConditionalEvidenceWindowToQuoteContent(
        conditionalEvidenceWindowForToken(tokens, tokenIdx, lookups),
        quoteRelation.quote.contentSpan,
      );
    if (teIruAspectBefore(ops, index) && hasCounterfactualResultCueAfter(tokens, tokenIdx + 1, evidenceWindow, lookups)) {
      if (op.conditionalFlavor === "counterfactual") {
        return op;
      }
      changed = true;
      return hydrateConditionalConnectiveOp(op, "counterfactual");
    }
    if (
      op.surface === "たら" &&
      op.conditionalFlavor !== "counterfactual" &&
      !conditionalHostIsCopulaPredicate(ops, index) &&
      conditionalSourceAllowsRetrospectiveDiscovery(tokens, tokenIdx, lookups) &&
      hasRetrospectiveDiscoveryCueAfter(
        tokens,
        tokenIdx + 1,
        evidenceWindow,
        lookups,
        teIruAspectBefore(ops, index) ? "tara_te_iru" : "tara_legacy"
      )
    ) {
      if (op.retrospectiveTara === true) {
        return op;
      }
      changed = true;
      return hydrateConditionalConnectiveOp(op, "retrospective_tara");
    }
    if (
      op.surface === "と" &&
      op.conditionalFlavor !== "counterfactual" &&
      conditionalSourceAllowsRetrospectiveDiscovery(tokens, tokenIdx, lookups) &&
      hasRetrospectiveDiscoveryCueAfter(
        tokens,
        tokenIdx + 1,
        quoteRelation === undefined
          ? conditionalDiscoveryEvidenceWindowForToken(tokens, tokenIdx, lookups)
          : clipConditionalEvidenceWindowToQuoteContent(
            conditionalDiscoveryEvidenceWindowForToken(tokens, tokenIdx, lookups),
            quoteRelation.quote.contentSpan,
          ),
        lookups,
      )
    ) {
      if (op.retrospectiveDiscoveryStyle === "ja") {
        return op;
      }
      changed = true;
      return hydrateConditionalConnectiveOp(op, "retrospective_ja");
    }
    return op;
  });
  return changed ? nextOps : null;
}

export type ConditionalHeadHydration = "counterfactual" | "retrospective_tara" | "retrospective_ja";

export function hydrateConditionalConnectiveOp(
  op: Extract<AuxOpNode, { readonly kind: "connective" }>,
  hydration: ConditionalHeadHydration
): Extract<AuxOpNode, { readonly kind: "connective" }> {
  switch (hydration) {
    case "counterfactual":
      return op.conditionalFlavor === "counterfactual"
        ? op
        : { ...op, conditionalFlavor: "counterfactual" };
    case "retrospective_tara":
      return op.retrospectiveTara === true ? op : { ...op, retrospectiveTara: true };
    case "retrospective_ja":
      return op.retrospectiveDiscoveryStyle === "ja"
        ? op
        : { ...op, retrospectiveDiscoveryStyle: "ja" };
    default:
      hydration satisfies never;
      return op;
  }
}

function clipConditionalEvidenceWindowToQuoteContent(
  window: import("../../../semantics/conditional.js").ConditionalEvidenceWindow | undefined,
  contentSpan: { readonly start: number; readonly endExclusive: number },
): import("../../../semantics/conditional.js").ConditionalEvidenceWindow | undefined {
  if (window === undefined) {
    return undefined;
  }
  return {
    start: Math.max(window.start, contentSpan.start),
    end: Math.min(window.end, contentSpan.endExclusive),
  };
}

function teIruAspectBefore(ops: readonly AuxOpNode[], connectiveIndex: number): boolean {
  return ops.slice(0, connectiveIndex).some((op) =>
    op.kind === "aspect" &&
    op.aspect === "te_iru"
  );
}

function benefactiveBefore(ops: readonly AuxOpNode[], connectiveIndex: number): boolean {
  return ops.slice(0, connectiveIndex).some((op) => isBenefactiveAspectOp(op));
}

function benefactivePotentialBefore(ops: readonly AuxOpNode[], connectiveIndex: number): boolean {
  return ops.slice(0, connectiveIndex).some((op) =>
    isBenefactiveAspectOp(op) && op.benefactive.potential === true
  );
}

function teAruAuxIsSokuonPastAnchor(op: SimpleAspectOp): boolean {
  const aux = op.source.tokens[op.source.tokens.length - 1];
  return aux !== undefined &&
    aux.dictionaryForm === "ある" &&
    (aux.pos & POS5) === 連用形_促音便;
}

interface TailStemOverride {
  readonly lemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos: number;
  readonly candidate: TranslationCandidate;
}

function tailStemOverrideFromHeadResult(
  headResult: ContentHeadHydrationMetadata,
  options: {
    readonly allowPostVerbMainOverride: boolean;
    readonly allowEntryAdjacentReorderCoordinate?: boolean;
  }
): TailStemOverride | null {
  void options.allowPostVerbMainOverride;
  const candidate = selectedContentHeadCandidate(headResult) ?? (
    options.allowEntryAdjacentReorderCoordinate === true && headResult.entry !== null
      ? firstTranslationCandidate(headResult.entry) ?? null
      : null
  );
  if (candidate === null || candidate === undefined) {
    return null;
  }
  return {
    lemma: candidate.koreanLemma,
    irregular: candidate.irregular,
    koreanPos: candidate.koreanPos,
    candidate
  };
}

function hydrateLexicalizedDirectionalAspect(
  stem: StemNode,
  ops: AuxLayerNode["ops"],
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): { readonly stem: StemNode; readonly ops: AuxLayerNode["ops"] } | null {
  const stemLemmas = activeTailStemKoreanLemmaCandidates(stem, tokens, predicateTokenIdx, lookups, numeric);
  if (stemLemmas.length === 0) {
    return null;
  }
  let merged: readonly [lemma: string, irregular: IrregularType | null] | null = null;
  let matched = false;
  let matchedTailLemma: "오다" | "가다" | null = null;
  const nextOps = ops.map((op) => {
    if (op.kind !== "aspect" || (op.aspect !== "te_kuru" && op.aspect !== "te_iku")) {
      return op;
    }
    const tailLemma = op.aspect === "te_kuru" ? "오다" : "가다";
    const mergedCandidates = uniqueDirectionVerbMerges(stemLemmas, tailLemma);
    const nextMerged = mergedCandidates.length === 1 ? mergedCandidates[0]! : null;
    if (nextMerged === null) {
      return op;
    }
    merged = nextMerged;
    matchedTailLemma = tailLemma;
    matched = true;
    return hydrateLexicalizedDirectionalAspectOp(op);
  });
  if (!matched) {
    return null;
  }
  const [lemma, irregular] = merged!;
  return { stem: rewriteDirectionalAspectStem(stem, matchedTailLemma ?? "오다", lemma, irregular), ops: nextOps };
}

export function hydrateLexicalizedDirectionalAspectOp(op: SimpleAspectOp): SimpleAspectOp {
  if (op.aspect !== "te_kuru" && op.aspect !== "te_iku") {
    return op;
  }
  return {
    ...op,
    semantic: {
      reading: "lexicalized_motion",
      candidates: ["lexicalized_motion"],
      renderStrategy: null,
      projection: "default"
    }
  };
}

export function hydrateAbsorbedPassiveAttributiveAspectOp(op: SimpleAspectOp): SimpleAspectOp {
  if (op.aspect !== "te_iru") {
    return op;
  }
  return {
    ...op,
    semantic: {
      reading: "drop_aux",
      renderStrategy: "attributive_drop_aux",
      projection: "default"
    }
  };
}

function rewriteDirectionalAspectStem(
  stem: StemNode,
  tailLemma: "오다" | "가다",
  fallbackLemma: string,
  fallbackIrregular: IrregularType | null
): StemNode {
  if (stem.kind !== "candidateSet") {
    return rewriteTailStemLemma(stem, fallbackLemma, fallbackIrregular);
  }
  let changed = false;
  const candidates = stem.candidates.map((candidate) => {
    const merged = mergeDirectionVerb(candidate.lemma, candidate.irregular ?? null, tailLemma);
    if (merged === null) {
      return candidate;
    }
    changed = true;
    return {
      ...candidate,
      lemma: merged[0],
      irregular: merged[1]
    };
  });
  return changed ? { ...stem, candidates } : stem;
}

function activeTailStemKoreanLemmaCandidates(
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  lookups: LookupTables,
  numeric: NumericTables
): readonly { readonly lemma: string; readonly irregular: IrregularType | null }[] {
  if (stem.kind === "verb" || stem.kind === "adj") {
    return [{ lemma: stem.lemma, irregular: stem.irregular }];
  }
  if (stem.kind === "candidateSet") {
    const framed = stem.candidates.filter((candidate) =>
      stemCandidateHasFrame(candidate) &&
      senseSourceFrameMatch(candidate as ContextSense, tokens, predicateTokenIdx, null, lookups, numeric) === "match"
    );
    const candidates = framed.length > 0
      ? framed
      : stem.candidates.filter((candidate) => !stemCandidateHasFrame(candidate));
    return candidates.map((candidate) => ({
      lemma: candidate.lemma,
      irregular: candidate.irregular ?? null
    }));
  }
  return [];
}

function stemCandidateHasFrame(candidate: { readonly senseFrame?: unknown; readonly senseFrames?: unknown }): boolean {
  return candidate.senseFrame !== undefined || candidate.senseFrames !== undefined;
}

function uniqueDirectionVerbMerges(
  stems: readonly { readonly lemma: string; readonly irregular: IrregularType | null }[],
  tailLemma: string
): readonly (readonly [lemma: string, irregular: IrregularType | null])[] {
  const byLemma = new Map<string, readonly [lemma: string, irregular: IrregularType | null]>();
  for (const stem of stems) {
    const merged = mergeDirectionVerb(stem.lemma, stem.irregular, tailLemma);
    if (merged !== null) {
      byLemma.set(`${merged[0]}\u0000${merged[1] ?? ""}`, merged);
    }
  }
  return [...byLemma.values()];
}

function tailStemCanUseHeadOverride(stem: StemNode, koreanPos: number): boolean {
  switch (stem.kind) {
    case "verb":
      return koreanPos === 동사;
    case "adj":
      return koreanPos === 형용사;
    case "noun":
      return koreanPos === 명사;
    case "adverb":
      return false;
    case "candidateSet":
      return (koreanPos === 동사 && stemSupportsProjectionCategory(stem, "verbal_predicate")) ||
        (koreanPos === 형용사 && stemSupportsProjectionCategory(stem, "adjectival_predicate")) ||
        (koreanPos === 명사 && stemSupportsProjectionCategory(stem, "nominal"));
  }
}

function tailStemHasSingleLexicalSource(stem: StemNode): boolean {
  return stem.source.tokens.length === 1 && stem.conjugationAnchor === 0;
}

function lexicalizedCausativeTeHoshii(
  layer: AuxLayerNode,
  lookups: LookupTables
): { readonly stem: StemNode; readonly causativeOpIdx: number } | null {
  const causativeOpIdx = layer.ops.findIndex((op) => op.kind === "voice" && op.voice === "causative");
  if (causativeOpIdx < 0) {
    return null;
  }
  const hoshiiOpIdx = layer.ops.findIndex((op) => op.kind === "aspect" && op.aspect === "te_hoshii");
  if (hoshiiOpIdx <= causativeOpIdx) {
    return null;
  }
  const dictForm = tailStemDictionaryForm(layer.stem);
  if (dictForm === null) {
    return null;
  }
  const lexicalized = lookups.TE_HOSHII_LEXICALIZED_CAUSATIVE_LEMMAS.get(dictForm);
  if (lexicalized === undefined) {
    return null;
  }
  const [lemma, irregular] = lexicalized;
  return {
    stem: rewriteTailStemLemma(layer.stem, lemma, asIrregular(irregular)),
    causativeOpIdx
  };
}

function hydrateTeHoshiiMainLemmaOverride(layer: AuxLayerNode, lookups: LookupTables): StemNode | null {
  const hoshiiOpIdx = layer.ops.findIndex((op) => op.kind === "aspect" && op.aspect === "te_hoshii");
  if (hoshiiOpIdx < 0) {
    return null;
  }
  if (layer.ops.slice(0, hoshiiOpIdx).some((op) => op.kind === "voice" && op.voice === "causative")) {
    return null;
  }
  const dictForm = tailStemDictionaryForm(layer.stem);
  if (dictForm === null) {
    return null;
  }
  const override = lookups.TE_HOSHII_MAIN_LEMMA_OVERRIDES.get(dictForm);
  if (override === undefined) {
    return null;
  }
  const [lemma, irregular] = override;
  return markTailStemResolvedContext(rewriteTailStemLemma(layer.stem, lemma, asIrregular(irregular)));
}

function lexicalizedCausativeFromHeadResult(
  stem: StemNode,
  ops: AuxLayerNode["ops"],
  headResult: ContentHeadHydrationMetadata
): { readonly stem: StemNode; readonly ops: AuxLayerNode["ops"] } | null {
  const causativeOpIdx = ops.findIndex((op) => op.kind === "voice" && op.voice === "causative");
  if (causativeOpIdx < 0) {
    return null;
  }
  const override = tailStemOverrideFromHeadResult(headResult, {
    allowPostVerbMainOverride: true,
    allowEntryAdjacentReorderCoordinate: true
  });
  if (
    override === null ||
    !tailStemHasSingleLexicalSource(stem) ||
    !tailStemCanUseHeadOverride(stem, override.koreanPos)
  ) {
    return null;
  }

  const tail = lexicalizedCausativeTailContext(ops, causativeOpIdx);
  if (!headResultDropsFirstCausative(headResult, override.lemma, tail)) {
    return null;
  }

  return {
    stem: rewriteTailStemLemmaFromContentCandidate(stem, override.candidate),
    ops: preferShortNegationAfterLexicalAbsorption(ops.filter((_, idx) => idx !== causativeOpIdx))
  };
}

function hydratePassiveQuestionQuoteHost(
  stem: StemNode,
  ops: AuxLayerNode["ops"],
  headResult: ContentHeadHydrationMetadata,
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateTokenIdx: number,
  lookups: LookupTables
): { readonly stem: StemNode; readonly ops: AuxLayerNode["ops"] } | null {
  const passiveOpIdx = ops.findIndex((op) => op.kind === "voice" && op.voice === "passive");
  if (passiveOpIdx < 0) {
    return null;
  }
  if (quoteHostHandoffKindForHost(cursor.fork(predicateTokenIdx, cursor.end, predicateTokenIdx), lookups) !== "question_passive") {
    return null;
  }
  const candidate = selectedContentHeadCandidate(headResult);
  if (
    candidate === null ||
    candidate.translation.sourceFormat !== "senses" ||
    candidate.translation.dropFirstPassiveAux !== true
  ) {
    return null;
  }
  if (!tailStemHasSingleLexicalSource(stem) || !tailStemCanUseHeadOverride(stem, candidate.koreanPos)) {
    return null;
  }
  const rewritten = markTailStemResolvedContext(rewriteTailStemLemmaFromContentCandidate(stem, candidate, {
    dropFirstPassiveAux: true
  }));
  return {
    stem: { ...rewritten, absorbedPassiveAux: true },
    ops: preferShortNegationAfterLexicalAbsorption(ops.filter((_, idx) => idx !== passiveOpIdx))
  };
}

function rewriteTailStemLemmaFromContentCandidate(
  stem: StemNode,
  candidate: TranslationCandidate,
  candidatePatch: Partial<StemCandidate> = {}
): StemNode {
  return rewriteTailStemLemma(stem, candidate.koreanLemma, candidate.irregular, {
    candidatePatch: {
      ...stemCandidatePatchFromTranslationCandidate(candidate),
      ...candidatePatch
    },
    structuralCandidate: stem.kind === "candidateSet"
      ? findStemCandidateByTranslationIdentity(stem.candidates, candidate)
      : null
  });
}

function preferShortNegationAfterLexicalAbsorption(ops: AuxLayerNode["ops"]): AuxLayerNode["ops"] {
  const negIdx = ops.findIndex((op) => op.kind === "negation");
  if (negIdx < 0) {
    return ops;
  }
  const neg = ops[negIdx];
  if (
    neg === undefined || neg.kind !== "negation" || neg.chainDepth !== 1 ||
    !negationOpAdmitsShortForm(neg)
  ) {
    return ops;
  }
  const allShortTail = ops.every((op) =>
    op.kind === "negation" ||
    op.kind === "tense" ||
    op.kind === "polite" ||
    op.kind === "classicalAuxResidue"
  );
  if (!allShortTail || neg.preferShortNegation === true) {
    return ops;
  }
  const result = [...ops];
  result[negIdx] = { ...neg, preferShortNegation: true };
  return result;
}

function headResultDropsFirstCausative(
  headResult: ContentHeadHydrationMetadata,
  koreanLemma: string,
  tail: {
    readonly tailRole: "benefactive" | "request" | null;
    readonly tailFamily: string | null;
    readonly benefactiveContext: BenefactiveContext | null;
  }
): boolean {
  if (tail.tailRole === null) {
    const selected = headResult.entry?.senses?.find((translation) =>
      translation.korean === koreanLemma
    );
    return selected?.dropFirstCausativeAux === true;
  }
  const absorptions = lexicalTailAbsorptionsFromEntry(
    headResult.entry,
    koreanLemma,
    {
      tailRole: tail.tailRole,
      tailFamily: tail.tailFamily,
      benefactiveContext: tail.benefactiveContext
    }
  );
  return lexicalTailAbsorptionsDropCausative(absorptions);
}

function lexicalizedCausativeTailContext(
  ops: AuxLayerNode["ops"],
  causativeOpIdx: number
): {
  readonly tailRole: "benefactive" | "request" | null;
  readonly tailFamily: string | null;
  readonly benefactiveContext: BenefactiveContext | null;
} {
  for (const op of ops.slice(causativeOpIdx + 1)) {
    if (isRequestAspectOp(op)) {
      return {
        tailRole: "request",
        tailFamily: op.request.kind || op.aspect,
        benefactiveContext: null
      };
    }
    if (isBenefactiveAspectOp(op)) {
      return {
        tailRole: "benefactive",
        tailFamily: benefactivePatternIdForAspect(op.aspect),
        benefactiveContext: benefactiveContextFromPayload(op)
      };
    }
  }
  return { tailRole: null, tailFamily: null, benefactiveContext: null };
}

function hydrateNoSeiNiSuruStem(
  stem: StemNode,
  ops: AuxLayerNode["ops"],
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number
): StemNode | null {
  if (!isNoSeiNiSuruContext(tokens, predicateTokenIdx)) {
    return null;
  }
  if (!tailStemHasSingleLexicalSource(stem) || !tailStemCanUseHeadOverride(stem, 동사)) {
    return null;
  }
  const hasNegativeDesire = ops.some((op) => op.kind === "desire") &&
    ops.some((op) => op.kind === "negation");
  return markTailStemResolvedContext(rewriteTailStemLemma(
    stem,
    hasNegativeDesire ? "삼다" : "돌리다",
    null,
    { candidatePatch: { casePreferences: { "に": "으로/로" } } }
  ));
}

async function hydrateSahenBoundVerbStem(
  stem: StemNode,
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number,
  dictionary: MorphemeDictionary
): Promise<StemNode | null> {
  if (
    !stemCanHydrateFromPreviousSahenNoun(stem, predicateTokenIdx) ||
    !isSahenBoundVerbAfterSahen(tokens, predicateTokenIdx)
  ) {
    return null;
  }
  const nounIdx = predicateTokenIdx - 1;
  const nounToken = tokens[nounIdx];
  if (nounToken === undefined) {
    return null;
  }
  const nounEntry = await dictionary.lookupTokenRelaxed(nounToken);
  if (nounEntry === null || nounEntry === undefined) {
    return null;
  }
  const senses = nounEntry.senses ?? [];
  if (senses.length === 0) {
    return null;
  }
  const source = {
    tokens: [nounToken, ...stem.source.tokens],
    tokenIndices: [nounIdx, ...stem.source.tokenIndices]
  };
  const semanticAnchors = [0];
  const conjugationAnchor = stem.conjugationAnchor + 1;
  const projectionOrdinals = translationCandidateProjectionOrdinals(nounEntry, senses);
  const candidates = senses
    .map((translation, index) => ({ translation, projectionOrdinal: projectionOrdinals[index]! }))
    .filter(({ translation }) => translation.korean.length > 0)
    .map(({ translation, projectionOrdinal }) =>
      sahenBoundVerbCandidateFromNounTranslation(translation, nounEntry, projectionOrdinal)
    );
  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length > 1 || sahenBoundVerbCandidateNeedsCommitment(candidates[0]!)) {
    return {
      kind: "candidateSet",
      source,
      conjugationAnchor,
      semanticAnchors,
      ...(stem.stemMood === undefined ? {} : { stemMood: stem.stemMood }),
      shortNegationPolicy: "sahen_split",
      sourcePredicateShape: "sahen_verbalization",
      candidates,
      headHypothesis: sahenBoundVerbHeadHypothesis(source, candidates)
    };
  }
  const only = candidates[0]!;
  return {
    kind: "verb",
    lemma: only.lemma,
    conj: only.conj ?? "sahen",
    irregular: only.irregular,
    source,
    conjugationAnchor,
    semanticAnchors,
    ...(stem.stemMood === undefined ? {} : { stemMood: stem.stemMood }),
    shortNegationPolicy: only.shortNegationPolicy ?? "sahen_split",
    sourcePredicateShape: "sahen_verbalization",
    ...(only.koreanPrefix === undefined ? {} : { koreanPrefix: only.koreanPrefix }),
    ...(only.koreanSuffix === undefined ? {} : { koreanSuffix: only.koreanSuffix })
  };
}

function sahenBoundVerbHeadHypothesis(
  source: StemNode["source"],
  candidates: readonly StemCandidate[]
): HeadHypothesisCarrier {
  return {
    sourceStemKind: "noun",
    admittedStemKind: "verb",
    source,
    sourceCapabilities: {
      nominalLike: true,
      iAdjectivePredicate: false,
      verbPredicate: false,
      naAdjectiveCapable: false,
      keijouCapable: false,
      naAdjectiveCapableNoun: false,
      bareNaAdjectiveSet: false,
      sahenVerbalizationCapable: true,
      adverbialCapable: false,
      adverbCapableNominal: false,
      lexicalAdverb: false,
      inflectionClass: null,
      stemForm: null
    },
    originalCandidateCount: candidates.length,
    preservedCandidateCount: candidates.length,
    admittedCandidateCount: candidates.length,
    droppedCandidateCount: 0,
    candidates: candidates.map((candidate, index) => ({
      index,
      lemma: candidate.lemma,
      koreanPos: candidate.koreanPos ?? 동사,
      projectedStemKind: "verb" as const,
      irregular: candidate.irregular,
      ...(candidate.priorityGroup === undefined ? {} : { priorityGroup: candidate.priorityGroup }),
      ...(candidate.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.priorityInGroup }),
      ...(candidate.senseIndex === undefined ? {} : { senseIndex: candidate.senseIndex }),
      provenance: candidate.provenance,
      projectionOrdinal: candidate.projectionOrdinal,
      ...(candidate.sourceFormat === undefined ? {} : { sourceFormat: candidate.sourceFormat }),
      status: "admitted" as const,
      stage: "lemma_normalization" as const,
      preservedCandidate: candidate,
      headProfile: {
        capabilities: [{
          id: "sahen_verbal" as const,
          source: "sahen_capability" as const,
          choices: [{
            category: "verbal_predicate" as const,
            projectionKind: "sahen_verbalized_nominal" as const
          }],
          orderKey: {
            ...(candidate.priorityGroup === undefined ? {} : { priorityGroup: candidate.priorityGroup }),
            ...(candidate.priorityInGroup === undefined ? {} : { priorityInGroup: candidate.priorityInGroup }),
            projectionOrder: candidate.projectionOrdinal
          }
        }]
      }
    })),
    currentWinnerIndex: 0
  };
}

function stemCanHydrateFromPreviousSahenNoun(stem: StemNode, predicateTokenIdx: number): boolean {
  const conjugationTokenIdx = stem.source.tokenIndices[stem.conjugationAnchor];
  if (conjugationTokenIdx !== predicateTokenIdx) {
    return false;
  }
  if (stem.kind === "verb") {
    return stem.conj === "sahen" && stem.lemma === "하다";
  }
  if (stem.kind !== "candidateSet") {
    return false;
  }
  const sourceToken = stem.source.tokens[stem.conjugationAnchor];
  if (sourceToken?.dictionaryForm !== "する") {
    return false;
  }
  return stem.candidates.some((candidate) =>
    candidate.lemma === "하다" &&
    candidate.conj === "sahen" &&
    candidate.koreanPos === 동사
  );
}

function sahenBoundVerbCandidateNeedsCommitment(candidate: StemCandidate): boolean {
  return candidate.senseFrame !== undefined ||
    candidate.senseFrames !== undefined ||
    candidate.casePreferences !== undefined ||
    candidate.caseRealization !== undefined ||
    candidate.slotRealization !== undefined ||
    candidate.senseCaseRealization !== undefined ||
    candidate.senseSlotRealization !== undefined;
}

function sahenBoundVerbCandidateFromNounTranslation(
  translation: MorphemeSense,
  entry: MorphemeEntry,
  projectionOrdinal: number
): StemCandidate {
  const translationWithSense = translation;
  const derivation = derivationForSense(translation, entry);
  return {
    provenance: stemCandidateProvenanceForTranslation(translation, derivation),
    lemma: `${translation.korean}하다`,
    irregular: "여",
    conj: "sahen",
    koreanPos: 동사,
    projectionOrdinal,
    derivation,
    shortNegationPolicy: "sahen_split",
    ...(translation.casePreferences === undefined ? {} : { casePreferences: translation.casePreferences }),
    ...(translation.caseRealization === undefined ? {} : { caseRealization: translation.caseRealization }),
    ...(translation.slotRealization === undefined ? {} : { slotRealization: translation.slotRealization }),
    ...(translationWithSense.senseFrame === undefined
      ? {}
      : { senseFrame: translationWithSense.senseFrame }),
    ...(translationWithSense.senseFrames === undefined ? {} : { senseFrames: translationWithSense.senseFrames }),
    ...(translationWithSense.senseCaseRealization === undefined ? {} : { senseCaseRealization: translationWithSense.senseCaseRealization }),
    ...(translationWithSense.senseSlotRealization === undefined ? {} : { senseSlotRealization: translationWithSense.senseSlotRealization }),
    ...(translation.priorityGroup === undefined ? {} : { priorityGroup: translation.priorityGroup }),
    ...(translation.priorityInGroup === undefined ? {} : { priorityInGroup: translation.priorityInGroup }),
    ...(translation.senseIndex === undefined ? {} : { senseIndex: translation.senseIndex }),
    ...(translation.sourceFormat === undefined ? {} : { sourceFormat: translation.sourceFormat }),
    ...(translation.koreanPrefix === undefined ? {} : { koreanPrefix: translation.koreanPrefix }),
    ...(translation.koreanSuffix === undefined ? {} : { koreanSuffix: translation.koreanSuffix })
  };
}

export function tailChainPreviousSahenNounAbsorptionStart(root: TailRoot, predicateTokenIdx: number): number | null {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  const stem = root.tail.stem;
  if (!stemIsSahenVerbProjection(stem)) {
    return null;
  }
  const conjugationTokenIdx = stem.source.tokenIndices[stem.conjugationAnchor];
  if (conjugationTokenIdx !== predicateTokenIdx) {
    return null;
  }
  const previousNounIdx = predicateTokenIdx - 1;
  return stem.semanticAnchors.some((anchor) => stem.source.tokenIndices[anchor] === previousNounIdx)
    ? previousNounIdx
    : null;
}

function stemIsSahenVerbProjection(stem: StemNode): boolean {
  if (stem.kind === "verb") {
    return stem.conj === "sahen" && stem.lemma.endsWith("하다");
  }
  return stem.kind === "candidateSet" &&
    stem.candidates.some((candidate) =>
      candidate.conj === "sahen" &&
      candidate.koreanPos === 동사 &&
      candidate.lemma.endsWith("하다")
    );
}

function hydrateNounToSareruStem(
  stem: StemNode,
  ops: AuxLayerNode["ops"],
  tokens: readonly RuntimeHaruToken[],
  predicateTokenIdx: number
): { readonly stem: StemNode; readonly ops: AuxLayerNode["ops"] } | null {
  if (!isNounToSareruContext(tokens, predicateTokenIdx)) {
    return null;
  }
  if (tailStemDictionaryForm(stem) !== "する") {
    return null;
  }
  const passiveIdx = ops.findIndex((op) =>
    op.kind === "voice" && (op.voice === "passive" || op.voice === "causative_passive")
  );
  if (passiveIdx < 0) {
    return null;
  }
  const rewritten = markTailStemResolvedContext(rewriteTailStemLemma(stem, "여겨지다", null));
  const nextOps = ops
    .filter((_, idx) => idx !== passiveIdx)
    .map((op) => {
      if (op.kind !== "aspect" || op.aspect !== "te_iru") {
        return op;
      }
      return hydrateAbsorbedPassiveAttributiveAspectOp(op);
    });
  return {
    stem: { ...rewritten, absorbedPassiveAux: true },
    ops: nextOps
  };
}

function tailStemDictionaryForm(stem: StemNode): string | null {
  const token = stem.source.tokens[stem.conjugationAnchor];
  return token?.dictionaryForm ?? null;
}

function rewriteTailStemLemma(
  stem: StemNode,
  lemma: string,
  irregular: IrregularType | null,
  options: {
    readonly candidatePatch?: Partial<StemCandidate>;
    readonly structuralCandidate?: StemCandidate | null;
  } = {}
): StemNode {
  if (stem.kind === "verb" || stem.kind === "adj") {
    return { ...stem, lemma, irregular };
  }
  if (stem.kind === "candidateSet") {
    return {
      ...stem,
      candidates: rewriteStemCandidatesPreservingIdentity(
        stem.candidates,
        lemma,
        irregular,
        options
      )
    };
  }
  return stem;
}

function markTailStemResolvedContext(stem: StemNode): StemNode {
  if (stem.kind === "verb") {
    const shortNegationPolicy = shortNegationPolicyForCommittedStem(stem.lemma, stem.shortNegationPolicy);
    return {
      ...stem,
      commitment: "resolved_sense",
      ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy })
    };
  }
  if (stem.kind === "adj" || stem.kind === "noun") {
    return { ...stem, commitment: "resolved_sense" };
  }
  return { ...stem, commitment: "resolved_sense" };
}

export function hydrateBenefactiveLexicalAbsorption(
  op: BenefactiveAspectOp,
  headResult: ContentHeadHydrationMetadata,
  stem: StemNode
): BenefactiveAspectOp {
  if (op.benefactive.lexicalTailAbsorptionKind !== null) {
    return op;
  }
  const absorptionKind = benefactiveLexicalAbsorptionKindForHead(op, headResult, stem);
  if (absorptionKind === null) {
    return op;
  }
  return {
    ...op,
    benefactive: {
      ...op.benefactive,
      lexicalTailAbsorptionKind: absorptionKind
    }
  };
}

function benefactiveLexicalAbsorptionKindForHead(
  op: BenefactiveAspectOp,
  headResult: ContentHeadHydrationMetadata,
  stem: StemNode
): BenefactiveLexicalTailAbsorptionKind | null {
  const koreanLemma = tailStemKoreanLemma(stem);
  if (koreanLemma === null) {
    return null;
  }
  const absorptions = lexicalTailAbsorptionsFromEntry(
    headResult.entry,
    koreanLemma,
    {
      tailRole: "benefactive",
      tailFamily: benefactivePatternIdForAspect(op.aspect),
      benefactiveContext: benefactiveContextFromPayload(op)
    }
  );
  const kind = benefactiveAbsorptionKind(absorptions);
  if (kind === "embedded_juda" || kind === "honorific_jusida") {
    return kind;
  }
  return null;
}

function tailStemKoreanLemma(stem: StemNode): string | null {
  if (stem.kind === "verb" || stem.kind === "adj" || stem.kind === "noun" || stem.kind === "adverb") {
    return stem.lemma;
  }
  return stem.candidates[0]?.lemma ?? null;
}

function benefactiveContextFromPayload(op: BenefactiveAspectOp): BenefactiveContext {
  return {
    patternId: benefactivePatternIdForAspect(op.aspect),
    needsBenefactivePivot: op.benefactive.needsBenefactivePivot,
    agentParticleIdx: op.benefactive.agentParticleIdx,
    recipientParticleIdx: op.benefactive.recipientParticleIdx,
    honorificLevel: op.benefactive.honorific ? "respect" : "none",
    recipientSideHumble: op.benefactive.recipientSideHumble,
    causativeAgentPolicy: op.benefactive.causativeAgentPolicy
  };
}
