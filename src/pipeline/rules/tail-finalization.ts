import { tariKeijoujiAdverbialToEvidence } from "../semantics/tari-adverbial-marker.js";
import { firstTranslationCandidate } from "../candidate-runtime.js";
import type { ContentCtx, ContentTerminalCtx } from "../content-types.js";
import {
  isNormalFunctionalChain,
  splitFunctionalAuxChunks
} from "../rendering/functional-chain.js";
import { SEPARATION_BREAKS_MORPHEME_CHAIN, nextNonSpaceIndex, separatedAs } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import { runtimeAuxTokens, runtimeToken, type MatcherToken } from "../matchers.js";
import { isSahenBoundVerbAfterSahen } from "../predicate-helpers.js";
import { copulaNiMarkerRelationForToken, kaMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { voiceFromFlags } from "../rendering/render-plan.js";
import { hasTerminalSentenceMark, isSentenceFinal } from "../semantics/terminal-runtime.js";
import type { RuleResult } from "../../types/pipeline.js";
import type { LemmaRealization } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { Warning } from "../../types/warning.js";
import { KEIJOUJI_BARE_RETIRED_OP_KIND } from "../fallback/unsupported-raw.js";
import type { TailResolver } from "./tail-types.js";

import { POS0, POS1, POS4, POS5, 格助詞, 係助詞, 名詞, 助詞, 助動詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ヤ, 終助詞, 副詞, 命令形_, 連体形_一般, 連用形_一般, 동사, 부사, 형용사, isNaAdjCapableNoun, isPureNaAdjStem } from "../../types/pos.js";
import { classifyAttributiveHeadKind } from "../head-tail/tail/predicate-root/structural-attributive-head-table.js";
import { DEFAULT_RENYOU_CHUUSHI_ROLE, DEFAULT_TE_FORM_ROLE, type TeFormConnectiveRole } from "../head-tail/tail/predicate-root/grammar.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { renyouTokenLacksPredicateSense } from "../head-tail/tail/predicate-root/integration.js";
import { buildProtoLayout } from "../clause-layout/index.js";

async function sahenInfo(resolver: TailResolver, ctx: Pick<ContentCtx, "tokens" | "start">): Promise<readonly [isSahen: boolean, sahenNoun: string | null]> {
  const fromResolver = resolver._sahenInfo;
  if (fromResolver !== undefined) {
    return await fromResolver(ctx.tokens, ctx.start);
  }
  const isSahen = isSahenBoundVerbAfterSahen(ctx.tokens, ctx.start);
  if (!isSahen) {
    return [false, null];
  }
  const prev = ctx.tokens[ctx.start - 1];
  if (prev === undefined || resolver.dictionary === undefined) {
    return [true, null];
  }
  const entry = await resolver.dictionary.lookupTokenRelaxed(prev);
  const candidate = entry === undefined ? undefined : firstTranslationCandidate(entry);
  return [true, candidate?.koreanLemma ?? null];
}

function isAdverbialCopulaTerminalAuxChain(tokens: readonly MatcherToken[]): boolean {
  if (tokens.length === 0) {
    return false;
  }
  let sawCopula = false;
  for (const token of tokens) {
    if ((token.pos & POS0) !== 助動詞) {
      return false;
    }
    const pos4 = token.pos & POS4;
    if (pos4 === 助動詞_ダ || pos4 === 助動詞_デス || pos4 === 助動詞_ジャ || pos4 === 助動詞_ヤ) {
      sawCopula = true;
      continue;
    }
    if (sawCopula && pos4 === 助動詞_タ) {
      continue;
    }
    return false;
  }
  return sawCopula;
}

export const KEIJOUJI_COPULA_PARTICLE_ENDINGS: ReadonlyMap<string, string> = new Map([
  ["であっても", "더라도"],
  ["であれば", "다면"]
]);

const KEIJOUJI_BARE_LEGACY_OWNER_KEY = "content:rule_keijouji_bare";

function finishRetiredKeijoujiBare(
  ctx: ContentTerminalCtx,
  accepted: RetiredKeijoujiBareAcceptance
): RuleResult {
  const { branch, consumed } = accepted;
  const raw = ctx.tokens
    .slice(ctx.start, ctx.start + consumed)
    .map((token) => token.surface)
    .join("");
  const warning: Warning = {
    type: "unsupported_grammar",
    severity: "error",
    opKind: KEIJOUJI_BARE_RETIRED_OP_KIND,
    ...(consumed > 0 ? { span: { start: ctx.start, end: ctx.start + consumed - 1 } } : {}),
    message:
      `unsupported grammar exposed after retired legacy realization; ` +
      `owner=${KEIJOUJI_BARE_LEGACY_OWNER_KEY} branch=${branch} surface=${raw}`
  };
  return {
    consumed,
    korean: raw,
    spaceAfter: true,
    renderPlan: null,
    warnings: [warning],
    rawSourceSurface: true
  };
}

interface RetiredKeijoujiBareAcceptance {
  readonly branch: "bare_adnominal" | "copula_particle";
  readonly consumed: number;
}

function retiredKeijoujiBareAcceptance(
  ctx: ContentTerminalCtx,
  hasCopula: boolean,
  nextPos: number
): RetiredKeijoujiBareAcceptance | null {
  const adnominalHeadIdx = nextNonSpaceIndex(ctx.tokens, nextPos, ctx.n);
  if (adnominalHeadIdx !== null && !hasCopula) {
    const headTok = ctx.tokens[adnominalHeadIdx];
    if (
      headTok !== undefined &&
      (headTok.pos & POS0) === 名詞 &&
      !separatedAs(ctx.tokens, adnominalHeadIdx, SEPARATION_BREAKS_MORPHEME_CHAIN) &&
      classifyAttributiveHeadKind(headTok) === "ordinary_nominal"
    ) {
      return {
        branch: "bare_adnominal",
        consumed: ctx.consumed
      };
    }
  }

  if (!isPureNaAdjStem(ctx.token) || hasCopula || keijoujiHasArgument(ctx.tokens, ctx.start)) {
    return null;
  }
  if (nextPos < ctx.n && KEIJOUJI_COPULA_PARTICLE_ENDINGS.has(ctx.tokens[nextPos]?.surface ?? "")) {
    return {
      branch: "copula_particle",
      consumed: ctx.consumed + 1
    };
  }
  return null;
}

export function ruleKeijoujiBare(
  _resolver: TailResolver,
  ctx: ContentTerminalCtx,
  _isPotential: boolean,
  lookups: LookupTables
): RuleResult | null {
  if (
    !((ctx.koreanPos === 동사 || ctx.koreanPos === 형용사) && ctx.koreanLemma.endsWith("하다")) ||
    !(isPureNaAdjStem(ctx.token) || isNaAdjCapableNoun(ctx.token))
  ) {
    return null;
  }
  const hasCopula = keijoujiHasCopula(ctx.auxTokens);
  const nextPos = ctx.start + ctx.consumed;

  if (
    nextPos < ctx.n &&
    tariKeijoujiAdverbialToEvidence(ctx.cursor.fork(nextPos, ctx.n), {
      allowProtoFollowingPredicateEvidence: true,
      lookups
    }) !== null
  ) {
    return null;
  }

  const retired = retiredKeijoujiBareAcceptance(ctx, hasCopula, nextPos);
  if (retired === null) {
    return null;
  }
  return finishRetiredKeijoujiBare(ctx, retired);
}

export function ruleSentencefinalNaAttributive(_resolver: TailResolver, ctx: ContentTerminalCtx, _isPotential: boolean): RuleResult | null {
  if (ctx.sfpType !== null || ctx.auxTokens.length === 0) {
    return null;
  }
  const lastAux = ctx.auxTokens.at(ctx.auxTokens.length - 1);
  if (lastAux === undefined || (lastAux.pos & (POS4 | POS5)) !== (助動詞_ダ | 連体形_一般)) {
    return null;
  }
  if (ctx.koreanPos !== 동사 && ctx.koreanPos !== 형용사) {
    return null;
  }
  const nextPos = ctx.start + ctx.consumed;
  if (!ctx.cursor.lookahead(nextPos - ctx.cursor.pos, isSentenceFinal)) {
    return null;
  }
  return {
    consumed: ctx.consumed,
    korean: "",
    spaceAfter: true,
    renderPlan: {
      kind: "attributive",
      koreanLemma: ctx.koreanLemma,
      irregular: ctx.irregular,
      koreanPos: ctx.koreanPos,
      auxTokens: runtimeAuxTokens(ctx.auxTokens),
      contentToken: runtimeToken(ctx.token),
      voice: voiceFromFlags({ forcePassive: ctx.forcePassive })
    }
  };
}

function resolveAdverbialCopulaTerminal(
  ctx: ContentTerminalCtx
): RuleResult | null {
  if (ctx.koreanPos !== 부사 || !isAdverbialCopulaTerminalAuxChain(ctx.auxTokens)) {
    return null;
  }
  const cursor = ctx.freshCursor();
  let sfpType = ctx.sfpType;
  if (sfpType === null) {
    const kaIndex = nextNonSpaceIndex(ctx.tokens, cursor.pos, ctx.n);
    if (
      kaIndex !== null &&
      kaMarkerRelationAt(ctx.tokens, kaIndex, ["tail_finalization_rules"])?.particleSubtype1 === 終助詞
    ) {
      const afterKa = nextNonSpaceIndex(ctx.tokens, kaIndex + 1, ctx.n) ?? ctx.n;
      if (cursor.lookahead(afterKa - cursor.pos, hasTerminalSentenceMark)) {
        cursor.advance(kaIndex - cursor.pos + 1);
        sfpType = "polite_q";
      }
    }
  }
  const afterTail = nextNonSpaceIndex(ctx.tokens, cursor.pos, ctx.n) ?? ctx.n;
  if (!cursor.lookahead(afterTail - cursor.pos, hasTerminalSentenceMark)) {
    return null;
  }
  const base: LemmaRealization = {
    kind: "lemma",
    entry: ctx.entry,
    koreanLemma: ctx.koreanLemma,
    koreanPos: ctx.koreanPos,
    irregular: ctx.irregular,
    auxTokens: [],
    jpDictForm: ctx.token.dictionaryForm,
    verbConjType: ctx.verbCt4
  };
  return {
    consumed: cursor.consumed,
    korean: "",
    spaceAfter: true,
    renderPlan: {
      kind: "copulaPredicate",
      polarity: "affirmative",
      base,
      auxTokens: runtimeAuxTokens(ctx.auxTokens),
      sfp: sfpType,
      terminalSfp: ctx.sfpNode,
    }
  };
}

export async function resolveTailDefault(
  resolver: TailResolver,
  ctx: ContentTerminalCtx,
  lookups: LookupTables,
  isPotential = false
): Promise<RuleResult> {
  const adverbialCopula = resolveAdverbialCopulaTerminal(ctx);
  if (adverbialCopula !== null) {
    return adverbialCopula;
  }
  const functionalChunks = splitFunctionalAuxChunks(ctx.auxTokens);
  if (functionalChunks !== null && !isNormalFunctionalChain(functionalChunks)) {
    return {
      consumed: ctx.consumed,
      korean: "",
      spaceAfter: true,
      renderPlan: {
        kind: "functionalChainResidual",
        koreanLemma: ctx.koreanLemma,
        irregular: ctx.irregular,
        koreanPos: ctx.koreanPos,
        chunks: functionalChunks.map((chunk) => runtimeAuxTokens(chunk)),
        question: ctx.sfpType === "polite_q",
        jpDictForm: ctx.token.dictionaryForm,
        verbConjType: ctx.verbCt4,
        forcePassive: ctx.forcePassive
      },
      traceTag: "functional_chain_residual"
    };
  }

  const [sahenCompound, sahenNoun] = await sahenInfo(resolver, ctx);
  const adverbialCopulaNi =
    ctx.auxTokens.length === 1 &&
    copulaNiMarkerRelationForToken(ctx.auxTokens[0], -1, {
      consumers: ["tail_finalization_rules"]
    }) !== null;
  const renderPlan: LemmaRealization = {
    kind: "lemma",
    entry: ctx.entry,
    koreanLemma: ctx.koreanLemma,
    koreanPos: ctx.koreanPos,
    irregular: ctx.irregular,
    auxTokens: runtimeAuxTokens(ctx.auxTokens),
    ...(adverbialCopulaNi ? { adverbialCopulaNi: true } : {}),
    sfp: ctx.sfpType,
    terminalSfp: ctx.sfpNode,
    jpDictForm: ctx.token.dictionaryForm,
    verbConjType: ctx.verbCt4,
    isImperative: ctx.verbCf5 === 命令形_,
    sahenCompound,
    sahenNoun,
    ...(await renyouChuushiEndKeepsConnection(resolver, ctx, lookups) ? { renyouChuushiRole: renyouEndConnectiveRole(ctx) } : {}),
    voice: voiceFromFlags({ forcePassive: ctx.forcePassive, isPotential })
  };
  return { consumed: ctx.consumed, korean: "", spaceAfter: true, renderPlan };
}

async function renyouChuushiEndKeepsConnection(
  resolver: TailResolver,
  ctx: ContentTerminalCtx,
  lookups: LookupTables
): Promise<boolean> {
  if (!isRenyouChuushi(ctx)) {
    return false;
  }
  const splitAt = ctx.start + ctx.consumed;
  const juncture = (activeProtoLayout() ?? buildProtoLayout(ctx.tokens, lookups)).renyouJunctureAt(splitAt);
  if (juncture !== undefined && juncture.cohesion.length > 0) {
    return false;
  }
  return ctx.auxTokens.length > 0 ||
    resolver.dictionary === undefined ||
    !(await renyouTokenLacksPredicateSense(resolver.dictionary, ctx.token));
}

function renyouEndConnectiveRole(ctx: ContentTerminalCtx): TeFormConnectiveRole {
  return isTeConnectiveToken(ctx.tokens[ctx.start + ctx.consumed]) ? DEFAULT_TE_FORM_ROLE : DEFAULT_RENYOU_CHUUSHI_ROLE;
}

export function isRenyouChuushi(ctx: Pick<ContentCtx, "auxTokens" | "token" | "start" | "consumed" | "cursor" | "n">): boolean {
  const last = ctx.auxTokens.length > 0 ? ctx.auxTokens.at(ctx.auxTokens.length - 1) : ctx.token;
  const pos5 = (last?.pos ?? 0) & POS5;
  if (pos5 !== 連用形_一般) {
    return false;
  }
  const nextPos = ctx.start + ctx.consumed;
  if (nextPos >= ctx.n) {
    return false;
  }
  return !ctx.cursor.lookahead(nextPos - ctx.cursor.pos, hasTerminalSentenceMark);
}

function keijoujiHasArgument(tokens: readonly RuntimeHaruToken[], start: number): boolean {
  for (let j = start - 1; j >= Math.max(start - 4, -1); j -= 1) {
    const pos0 = (tokens[j]?.pos ?? 0) & POS0;
    if (pos0 === 助詞) {
      const pos1 = (tokens[j]?.pos ?? 0) & POS1;
      return (pos1 === 格助詞) || (pos1 === 係助詞);
    }
    if (pos0 === 副詞) {
      continue;
    }
    break;
  }
  return false;
}

export function keijoujiHasCopula(auxTokens: readonly MatcherToken[]): boolean {
  return auxTokens.some((token) =>
    ((token.pos & POS4) === 助動詞_ダ || (token.pos & POS4) === 助動詞_デス || (token.pos & POS4) === 助動詞_ジャ || (token.pos & POS4) === 助動詞_ヤ)
  );
}
