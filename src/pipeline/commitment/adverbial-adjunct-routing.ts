import type { RenderPlan } from "../../types/render-plan.js";
import { isPredicateHeadTailChainRenderPlan } from "../../types/render-plan.js";
import type { ClauseLayout } from "../clause-layout/final-layout.js";
import { 동사, 명사, 부사, 형용사 } from "../../types/pos.js";
import { conjugate } from "../../generator/conjugator.js";
import { selectParticle } from "../../generator/particles.js";
import { firstAuxLayer, lemmaPlanIsCopulaNiAdverbial, plainNounStemAdverbialLemma, tailRootIsStandaloneCopulaNiAdverbialFragment } from "../head-tail/tail/predicate-root/inspect.js";
import { metadataAdverbial } from "../translation/metadata.js";
import type { CommitmentContentMap, CommitmentSpan } from "./types.js";
import { contentEntries, selectedCommitmentCandidate } from "./span-evidence.js";

export function commitAdverbialAdjunctRouting(
  contentMap: CommitmentContentMap,
  layout: ClauseLayout
): void {
  for (const [idx, span] of contentEntries(contentMap)) {
    const plan = span.renderPlan ?? null;
    const projection = adverbialProjectionForRouting(span, plan);
    if (projection === null) {
      continue;
    }
    const hasModifiedPredicate = layout.predicateOfAdverbialAdjunct(idx) !== undefined;
    const isStandaloneSentenceAdverb = !hasModifiedPredicate && projection.standaloneSentenceAdverb;
    const isAdverbialAdjunct = hasModifiedPredicate && projection.adverbialAdjunct;
    if (!isAdverbialAdjunct && !isStandaloneSentenceAdverb) {
      continue;
    }
    const korean = structuralAdverbialAdjunctKorean(
      projection.koreanLemma,
      projection.koreanPos,
      projection.irregular,
      projection.lexicalAdverbial
    );
    if (korean === null) {
      continue;
    }
    span.renderPlan = {
      kind: "lexicalParticleAdverbial",
      adverbialKind: isStandaloneSentenceAdverb
        ? "standalone_sentence_adverb"
        : "structural_adverbial_adjunct",
      particle: "に",
      korean,
      koreanPos: projection.koreanPos,
      sourceKorean: projection.koreanLemma
    };
    span.korean = korean;
    span.koreanPos = 부사;
  }
}

interface AdverbialProjectionRoutingInput {
  readonly koreanLemma: string;
  readonly koreanPos: number;
  readonly irregular: Parameters<typeof conjugate>[1];
  readonly lexicalAdverbial: string | null;
  readonly adverbialAdjunct: boolean;
  readonly standaloneSentenceAdverb: boolean;
}

function adverbialProjectionForRouting(
  span: CommitmentSpan,
  plan: RenderPlan | null
): AdverbialProjectionRoutingInput | null {
  if (plan === null) {
    return null;
  }
  if (plan.kind === "lemma") {
    if (!lemmaPlanIsCopulaNiAdverbial(plan)) {
      return null;
    }
    const hasTypedTerminalSfp = plan.terminalSfp != null;
    return {
      koreanLemma: plan.koreanLemma,
      koreanPos: plan.koreanPos,
      irregular: plan.irregular,
      lexicalAdverbial: metadataAdverbial(plan.entry, plan.koreanLemma),
      adverbialAdjunct: !hasTypedTerminalSfp,
      standaloneSentenceAdverb: hasTypedTerminalSfp
    };
  }
  if (
    !isPredicateHeadTailChainRenderPlan(plan) ||
    !tailRootIsStandaloneCopulaNiAdverbialFragment(plan.realization.root)
  ) {
    return null;
  }
  const selected = selectedCommitmentCandidate(span);
  const stem = firstAuxLayer(plan.realization.root.tail)?.stem;
  const typedNounLemma = plainNounStemAdverbialLemma(stem);
  const selectedHasDecoration =
    selected?.translation?.koreanPrefix !== undefined ||
    selected?.translation?.koreanSuffix !== undefined;
  if (selectedHasDecoration) {
    return null;
  }
  const typedNounStem = typedNounLemma === null
    ? null
    : {
        koreanLemma: typedNounLemma,
        koreanPos: 명사,
        irregular: null
      };
  const selectedLemma = selected?.koreanLemma ?? selected?.korean ?? null;
  const projection = selectedLemma !== null && selectedLemma.length > 0
    ? {
        koreanLemma: selectedLemma,
        koreanPos: selected?.koreanPos ?? span.koreanPos,
        irregular: selected?.irregular ?? selected?.translation?.irregular ?? null
      }
    : typedNounStem;
  if (projection === null || projection.koreanLemma.length === 0) {
    return null;
  }
  return {
    ...projection,
    lexicalAdverbial: selected?.translation?.adverbial ??
      metadataAdverbial(span.entry, projection.koreanLemma),
    adverbialAdjunct: false,
    standaloneSentenceAdverb: true
  };
}

function structuralAdverbialAdjunctKorean(
  koreanLemma: string,
  koreanPos: number,
  irregular: Parameters<typeof conjugate>[1],
  lexicalAdverbial: string | null
): string | null {
  if (koreanPos === 부사) {
    return koreanLemma;
  }
  if (lexicalAdverbial !== null && lexicalAdverbial.length > 0) {
    return lexicalAdverbial;
  }
  if (koreanPos === 동사 || koreanPos === 형용사) {
    return conjugate(koreanLemma, irregular, "게");
  }
  if (koreanPos === 명사) {
    return koreanLemma + selectParticle(koreanLemma, "으로/로");
  }
  return null;
}
