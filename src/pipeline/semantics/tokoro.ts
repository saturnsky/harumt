import { 助動詞, 助動詞_マス, 助動詞_タ, 終止形_一般, 連用形_一般, 명사, 부사, 형용사 } from "../../types/pos.js";

export * from "../head-tail/tail/families/tokoro-semantics.js";

import type { ContentCtx } from "../content-types.js";
import { ContentPhaseState, PhaseStep, RuleResult } from "../content-types.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RenderPlan } from "../../types/render-plan.js";
import { proposeRuleReanalysis } from "../../types/reanalysis.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import {
  koroTemporalNiSuffixConsumedAndText,
  TOKORO_DISCOVERY_PIN_ID,
  TOKORO_READING_CLAIMS,
  tokoroAlmostTailInfo,
  tokoroCopulaTailInfo,
  tokoroEvidenceHeadShape,
  tokoroProgressCopulaTailInfo,
  tokoroSuffixConsumed,
  type TokoroReadingClaimInput
} from "../head-tail/tail/families/tokoro-semantics.js";


export function ruleTokoroHeadDispatch(_resolver: object, ctx: ContentCtx, _isPotential: boolean, lookups: LookupTables): PhaseStep | null {
  const isTokoroHead = ctx.token.dictionaryForm === "ところ" || ctx.token.dictionaryForm === "所" || ctx.token.reading === "トコロ";
  const isKoroHead = ctx.token.dictionaryForm === "ころ" || ctx.token.dictionaryForm === "頃" || ctx.token.surface === "ころ" || ctx.token.surface === "頃";
  if (!isTokoroHead && !isKoroHead) {
    return null;
  }
  let consumed = ctx.consumed;
  let renderPlan: RenderPlan | null = null;
  const claim: TokoroReadingClaimInput = {
    tokens: ctx.tokens,
    headIdx: ctx.start,
    headToken: ctx.token,
    lookups
  };
  if (TOKORO_READING_CLAIMS.koro_temporal_ni(claim)) {
    const suffix = koroTemporalNiSuffixConsumedAndText(ctx.tokens, ctx.start);
    if (suffix === null) {
      return null;
    }
    consumed = suffix[0];
    renderPlan = tokoroFixedTextPlan(suffix[1], 부사);
  } else if (TOKORO_READING_CLAIMS.origin_from(claim)) {
    consumed = tokoroSuffixConsumed(ctx.tokens, ctx.start);
    renderPlan = tokoroFixedTextPlan("데서", 부사);
  } else if (TOKORO_READING_CLAIMS.limit_until(claim)) {
    consumed = tokoroSuffixConsumed(ctx.tokens, ctx.start);
    renderPlan = tokoroFixedTextPlan("데까지", 부사);
  } else if (TOKORO_READING_CLAIMS.report_source(claim)) {
    renderPlan = tokoroFixedTextPlan("바", 명사);
  } else if (TOKORO_READING_CLAIMS.evidence(claim)) {
    renderPlan = tokoroFixedTextPlan("바로는", 부사);
  } else if (TOKORO_READING_CLAIMS.situation(claim)) {
    renderPlan = tokoroFixedTextPlan("데", 명사);
  } else if (TOKORO_READING_CLAIMS.temporal_or_concessive_de(claim)) {
    const nextIdx = nextNonSpaceIndex(ctx.tokens, ctx.start + 1);
    consumed = nextIdx === null ? ctx.consumed : (nextIdx - ctx.start) + 1;
  } else if (TOKORO_READING_CLAIMS.almost(claim)) {
    const tail = tokoroAlmostTailInfo(ctx.tokens, ctx.start);
    if (tail === null) {
      return null;
    }
    const [tailConsumed, polite, past] = tail;
    consumed = tailConsumed;
    renderPlan = {
      kind: "lemma",
      entry: null,
      koreanLemma: "뻔하다",
      koreanPos: 형용사,
      irregular: "여",
      auxTokens: syntheticAux(polite, past)
    };
  } else if (TOKORO_READING_CLAIMS.teiru_copula_progress(claim)) {
    const tail = tokoroProgressCopulaTailInfo(ctx.tokens, ctx.start);
    if (tail === null) {
      return null;
    }
    const [tailConsumed, polite, past, connector] = tail;
    consumed = tailConsumed;
    renderPlan = connector === "ので"
      ? tokoroNominalCopulaPlan("중", polite, past, 명사, { connective: "아/어서", pastConnective: "기 때문에" })
      : tokoroNominalCopulaPlan("중", polite, past, 명사);
  } else if (TOKORO_READING_CLAIMS.about_to(claim)) {
    const tail = tokoroCopulaTailInfo(ctx.tokens, ctx.start);
    if (tail === null) {
      return null;
    }
    const [tailConsumed, polite, past] = tail;
    consumed = tailConsumed;
    renderPlan = tokoroNominalCopulaPlan("참", polite, past, 명사);
  } else if (TOKORO_READING_CLAIMS.desired_result(claim)) {
    const tail = tokoroCopulaTailInfo(ctx.tokens, ctx.start);
    if (tail === null) {
      return null;
    }
    const [tailConsumed, polite, past] = tail;
    consumed = tailConsumed;
    renderPlan = tokoroNominalCopulaPlan("바", polite, past, 명사);
  } else if (TOKORO_READING_CLAIMS.kininaru(claim)) {
    const tail = tokoroCopulaTailInfo(ctx.tokens, ctx.start);
    if (tail === null) {
      return null;
    }
    const [tailConsumed, polite, past] = tail;
    consumed = tailConsumed;
    renderPlan = tokoroNominalCopulaPlan("부분", polite, past, 명사);
  } else if (TOKORO_READING_CLAIMS.progress_ni(claim)) {
    consumed = ctx.consumed;
    renderPlan = tokoroFixedTextPlan("중", 명사);
  } else if (TOKORO_READING_CLAIMS.progress_wo_interruption(claim)) {
    const nextIdx = nextNonSpaceIndex(ctx.tokens, ctx.start + 1);
    consumed = nextIdx === null ? ctx.consumed : (nextIdx - ctx.start) + 1;
    renderPlan = tokoroFixedTextPlan("중에", 부사);
  } else if (TOKORO_READING_CLAIMS.progress_wo_observation(claim)) {
    const nextIdx = nextNonSpaceIndex(ctx.tokens, ctx.start + 1);
    consumed = nextIdx === null ? ctx.consumed : (nextIdx - ctx.start) + 1;
    renderPlan = tokoroFixedTextPlan("모습을", 명사);
  } else if (TOKORO_READING_CLAIMS.trait_ga(claim)) {
    consumed = ctx.consumed;
    renderPlan = tokoroFixedTextPlan("점", 명사);
  } else if (!TOKORO_READING_CLAIMS.result(claim)) {
    if (tokoroEvidenceHeadShape(ctx.tokens, ctx.start) !== null) {
      proposeRuleReanalysis(ctx.token, {
        ruleId: TOKORO_DISCOVERY_PIN_ID,
        conditionId: "following_clause_chain_discovery_matrix"
      });
    }
    return null;
  }
  const state = new ContentPhaseState(consumed, ctx.start + consumed, ctx.auxTokens);
  return new PhaseStep(state, new RuleResult(consumed, "", true, renderPlan));
}

function tokoroNominalCopulaPlan(
  noun: string,
  polite: boolean,
  past: boolean,
  koreanPos: number,
  connective?: { connective: string; pastConnective?: string | null }
): RenderPlan {
  return {
    kind: "copulaPredicate",
    polarity: "affirmative",
    base: { kind: "fixedText", text: noun, koreanPos },
    auxTokens: syntheticAux(polite, past),
    ...(connective === undefined ? {} : connective)
  };
}

function tokoroFixedTextPlan(text: string, koreanPos: number): RenderPlan {
  return { kind: "fixedText", text, koreanPos };
}

function syntheticAux(polite: boolean, past: boolean): readonly RuntimeHaruToken[] {
  const tokens: RuntimeHaruToken[] = [];
  if (polite) {
    tokens.push({
      surface: "ます",
      dictionaryForm: "ます",
      reading: "マス",
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | 終止形_一般,
      dictionaryId: 0
    });
  }
  if (past) {
    tokens.push({
      surface: "た",
      dictionaryForm: "た",
      reading: "タ",
      dictionaryFormReading: "タ",
      pos: 助動詞 | 助動詞_タ | 連用形_一般,
      dictionaryId: 0
    });
  }
  return tokens;
}
