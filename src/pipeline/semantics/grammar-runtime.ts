import { parse } from "smol-toml";

import { type DataLoader } from "../../data-loader.js";
import {
  extractFeatures as extractAuxFeatures,
  isKoreanPotentialLemma,
  potentialPhrasePrefix,
  rashiiAttributive,
  resolvePassiveLemma,
  type AuxFeatures
} from "../../generator/aux-map.js";
import { conjugate, irregularType, type IrregularType } from "../../generator/conjugator.js";
import { hasBatchim } from "../../generator/particles.js";
import { resolveDataSection } from "../../dictionary/data-section.js";
import { conjugateNegAttributive } from "../attributive.js";
import { KAMO_SHIRENAI_LEMMAS } from "../lookup-tables.js";
import type { LookupTables } from "../lookup-tables.js";
import type { PassiveClass } from "../voice-class.js";
import { auxHasNegation, auxHasPast, auxIsPolite, collectAuxTokens, isVerbLemma, runtimeTokens, type MatcherToken } from "../matchers.js";
import {
  canonicalTerminalSfpSurface,
  isKanaQuestionNaParticleSurface,
  isPlainNaParticleSurface,
  isTerminalNeSfpSurface,
  isTerminalSkipSfpSurface,
  isTerminalWaSfpSurface,
  isTerminalYoSfpSurface,
  isNeutralTerminalSfpToken,
  registerTerminalSfpLexicon,
  terminalSfpLexeme,
  type TerminalSfpIdentitySource
} from "./sfp-surface.js";
import {
  copulaDeMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationAt,
  registeredClauseConnectiveRelationForToken
} from "../head-tail/boundary/marker.js";
import type { BoundaryRelationConsumer, ScopeBridgeFocusKind } from "../head-tail/boundary/relation.js";
import { isSourceSeparatedFromPreviousToken } from "../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import type { AttributiveRealization, LemmaRealization, RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TokenCursor } from "../token-cursor.js";
import { SFP_INVENTORY, type SfpEffect, type SfpNode } from "../head-tail/tail/predicate-root/grammar.js";

import { POS0, POS01, POS1, POS4, POS5, POS5A, pos0in, 意志推量形_, 仮定形_, 形状詞, 形状詞_助動詞語幹, 形容詞0, 終止形_, 終助詞, 助詞, 助詞_接続助詞, 助詞_終助詞, 助詞_準体助詞, 助動詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_ヤ, 助動詞_ラシイ, 助動詞_レル, 代名詞, 動詞, 非自立可能, 補助記号, 名詞, 連体形_, 連用形_, 連用形_一般, 連用形_促音便, 대명사, 동사, 명사, 형용사 } from "../../types/pos.js";
export type CopulaDeDetection = readonly [nextIsContent: boolean, nextIsPunct: boolean];

interface AuxExtractOptions {
  readonly verbConjType?: number | null;
  readonly jpDictForm?: string | null;
  readonly forcePassive?: boolean;
  readonly lookups: LookupTables;
}

let _sfpTomlText: string | undefined;
let sfpConfig: SfpConfig | null = null;

export async function initGrammarRuntime(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("config"), "sfp.toml");
  _sfpTomlText = await loader.readTextFile(filePath);
  const raw = parse(_sfpTomlText) as SfpTomlRoot;
  const lexemes = [
    ...(raw.lexeme?.surfaces ?? []),
    ...(raw.simple ?? []).flatMap((entry) => entry.surface === undefined ? [] : [entry.surface]),
    ...(raw.skip?.surfaces ?? []),
    ...(raw.transparent?.surfaces ?? []),
    ...(raw.post_ka ?? []).flatMap((entry) => entry.surface === undefined ? [] : [entry.surface])
  ];
  registerTerminalSfpLexicon(
    lexemes,
    (raw.lexical_variant ?? []).flatMap((entry) =>
      entry.surface === undefined || entry.lexeme === undefined ? [] : [[entry.surface, entry.lexeme] as const]
    )
  );
}

function isGrammarRuntimeTerminalKaMarker(tokens: readonly MatcherToken[], index: number): boolean {
  const relation = kaMarkerRelationAt(tokens, index, ["grammar_runtime"]);
  return relation?.particleSubtype1 === 終助詞;
}

export function rashiiAuxIndex(auxTokens: readonly MatcherToken[]): number | null {
  for (const [idx, token] of auxTokens.entries()) {
    if ((token.pos & POS4) === 助動詞_ラシイ) {
      return idx;
    }
  }
  return null;
}

export function dearuNounRashiiRenderPlan(
  noun: string,
  aruAux: readonly MatcherToken[],
  sfp?: string | null,
  options: { readonly headNounToken?: MatcherToken | null } = {}
): RenderPlan | null {
  const rashiiIdx = rashiiAuxIndex(aruAux);
  if (rashiiIdx === null) {
    return null;
  }
  const postRashiiAux = runtimeTokens(aruAux.slice(rashiiIdx + 1));
  const rashiiToken = runtimeTokens([aruAux[rashiiIdx]!])[0]!;
  const headNounToken = options.headNounToken === undefined || options.headNounToken === null
    ? null
    : runtimeTokens([options.headNounToken])[0] ?? null;
  const prefix = `${noun}인 것 `;
  if (headNounToken !== null) {
    return {
      kind: "attributive",
      koreanLemma: "같다",
      koreanPos: 형용사,
      irregular: null,
      prefix,
      auxTokens: postRashiiAux,
      contentToken: rashiiToken,
      headNounToken
    } satisfies AttributiveRealization;
  }
  return {
    kind: "lemma",
    entry: null,
    koreanLemma: "같다",
    koreanPos: 형용사,
    irregular: null,
    prefix,
    auxTokens: postRashiiAux,
    ...(sfp === undefined || sfp === null ? {} : { sfp })
  } satisfies LemmaRealization;
}

export function detectCopulaDe(
  auxTokens: readonly MatcherToken[],
  cursor: TokenCursor<MatcherToken>,
  options: {
    readonly contentPosBits: number;
    readonly passthroughPosBits: number;
  }
): CopulaDeDetection | null {
  if (auxTokens.length === 0) {
    return null;
  }
  const last = auxTokens[auxTokens.length - 1];
  if (
    last === undefined || (last.pos & (POS4 | POS5)) !== (助動詞_ダ | 連用形_一般) || copulaDeMarkerRelationForToken(last, -1, { consumers: ["grammar_runtime"] }) === null
  ) {
    return null;
  }
  if (auxTokens.length >= 2 && ((auxTokens[auxTokens.length - 2]?.pos ?? 0) & POS4) === 助動詞_ナイ) {
    return null;
  }
  const next = cursor.current();
  const nextPos0 = (next?.pos ?? 0) & POS0;
  const nextIsContent = cursor.pos < cursor.end && next !== undefined && pos0in(nextPos0, options.contentPosBits) && !(nextPos0 === 動詞 && next.dictionaryForm === "ある");
  const nextIsPunct = cursor.pos >= cursor.end || (next !== undefined && pos0in(nextPos0, options.passthroughPosBits));
  return [nextIsContent, nextIsPunct];
}

export function nodaAttributive(
  koreanLemma: string,
  irregular: IrregularType | null,
  koreanPos: number,
  auxTokens: readonly MatcherToken[],
  _contentToken: MatcherToken | null = null,
  options: {
    readonly verbConjType?: number | null;
    readonly jpDictForm?: string | null;
    readonly forcePassive?: boolean;
    readonly passiveClass?: PassiveClass;
    readonly isPotential?: boolean;
    readonly lookups: LookupTables;
  }
): string {
  if (koreanPos === 동사 || koreanPos === 형용사) {
    const features = auxTokens.length > 0
      ? auxExtractFeatures(auxTokens, {
        verbConjType: options.verbConjType ?? null,
        jpDictForm: options.jpDictForm ?? null,
        forcePassive: options.forcePassive ?? false,
        lookups: options.lookups
      })
      : null;
    if (options.isPotential === true || features?.potential === true) {
      return buildPotentialPropositionAttributive(koreanLemma, irregular, auxTokens);
    }
    if (options.forcePassive === true || features?.passive === true) {
      return buildPassivePropositionAttributive(koreanLemma, irregular, auxTokens, {
        lookups: options.lookups,
        ...(options.passiveClass === undefined ? {} : { passiveClass: options.passiveClass })
      });
    }
    return rashiiAttributive(koreanLemma, irregularType(irregular), koreanPos, auxTokens, options.lookups);
  }
  if (koreanPos === 명사 || koreanPos === 대명사) {
    const batchim = hasBatchim(koreanLemma) === true;
    const preFeatures = auxTokens.length > 0 ? auxExtractFeatures(auxTokens, { lookups: options.lookups }) : null;
    if (preFeatures?.past === true) {
      return koreanLemma + (batchim ? "이었던" : "였던");
    }
    return `${koreanLemma}인`;
  }
  return koreanLemma;
}

export function buildPotentialPropositionAttributive(koreanLemma: string, irregular: IrregularType | null, auxTokens: readonly MatcherToken[]): string {
  const prefix = isKoreanPotentialLemma(koreanLemma)
    ? potentialPhrasePrefix(koreanLemma)
    : `${conjugate(koreanLemma, irregularType(irregular), "ㄹ/을")} 수 `;
  const hasNegative = auxHasNegation(auxTokens);
  const hasPast = auxHasPast(auxTokens);
  if (hasNegative) {
    return prefix + (hasPast ? "없었던" : "없는");
  }
  return prefix + (hasPast ? "있었던" : "있는");
}

export function buildPassivePropositionAttributive(
  koreanLemma: string,
  irregular: IrregularType | null,
  auxTokens: readonly MatcherToken[],
  options: { readonly passiveClass?: PassiveClass; readonly lookups: LookupTables }
): string {
  const [passiveLemma, passiveIrregular] = resolvePassiveLemma(koreanLemma, irregularType(irregular), options);
  const hasNegative = auxHasNegation(auxTokens);
  const hasPast = auxHasPast(auxTokens);
  if (hasNegative) {
    return conjugateNegAttributive(passiveLemma, passiveIrregular, hasPast ? "ㄴ/은" : "ㄴ/는");
  }
  return conjugate(passiveLemma, passiveIrregular, hasPast ? "ㄴ/은" : "ㄴ/는");
}

export function detectSfp(
  cursor: TokenCursor<MatcherToken>,
  contentPos0: number,
  hasAux: boolean,
  afterTransparentSfp = false,
  followsOwnedEffect = false
): string | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  if (pos >= n) {
    if (n > 0) {
      const trailing = tokens[n - 1] as TerminalRoleToken | undefined;
      const role = trailing?.terminal_role_sfp_after ?? trailing?.terminalRoleSfpAfter;
      if (role !== undefined && role !== null) {
        const count = trailing?.terminal_role_sfp_after_count ?? trailing?.terminalRoleSfpAfterCount ?? 1;
        return count > 1 ? `${role}:${count}` : role;
      }
    }
    return null;
  }
  const token = tokens[pos];
  const roleToken = token as TerminalRoleToken | undefined;
  const role = roleToken?.terminal_role_sfp_before ?? roleToken?.terminalRoleSfpBefore;
  if (role !== undefined && role !== null) {
    const count = roleToken?.terminal_role_sfp_before_count ?? roleToken?.terminalRoleSfpBeforeCount ?? 1;
    return count > 1 ? `${role}:${count}` : role;
  }
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const pos1 = token.pos & POS1;
  if ((pos1 !== 終助詞)) {
    return null;
  }
  if (isGrammarRuntimeTerminalKaMarker(tokens, pos)) {
    const next = tokens[pos + 1];
    if (next !== undefined && ((next.pos & POS0) === 助詞 && isKanaQuestionNaParticleSurface(next))) {
      cursor.advance(2);
      return "kana";
    }
    return null;
  }
  const isDerivationalAuxProhibitive = (): boolean => {
    if (pos <= 0) {
      return false;
    }
    const prev = tokens[pos - 1];
    if (prev === undefined || (prev.pos & POS0) !== 助動詞) {
      return false;
    }
    const prevPos4 = prev.pos & POS4;
    const prevCf5A = prev.pos & POS5A;
    if (prevCf5A !== 終止形_ && prevCf5A !== 連体形_) {
      return false;
    }
    return prevPos4 === 助動詞_レル || prev.dictionaryForm === "せる" || prev.dictionaryForm === "させる";
  };
  if (isKanaQuestionNaParticleSurface(token)) {
    const naHost = pos > 0 ? tokens[pos - 1] : undefined;
    const naAfterRenyouVerb = naHost !== undefined && (naHost.pos & (POS0 | POS5A)) === (動詞 | 連用形_);
    if (isPlainNaParticleSurface(token.surface) && contentPos0 === 動詞 && naAfterRenyouVerb) {
      cursor.advance();
      const yoToken = tokens[cursor.pos];
      if (
        yoToken !== undefined && (yoToken.pos & POS01) === 助詞_終助詞 && isTerminalYoSfpSurface(yoToken)
      ) {
        cursor.advance();
      }
      return "na_soft_imperative";
    }
    if (
      !afterTransparentSfp &&
      isPlainNaParticleSurface(token.surface) && (contentPos0 === 動詞) && (!hasAux || isDerivationalAuxProhibitive())
    ) {
      cursor.advance();
      return "na_prohib";
    }
    cursor.advance();
    return "na_excl";
  }
  if (isTerminalWaSfpSurface(token)) {
    const consumeWaRun = (): void => {
      cursor.advance();
      consumeAdjacentYoThenTrailingSfpRun(cursor, contentPos0, hasAux);
    };
    if ((contentPos0 === 形容詞0) || (contentPos0 === 形状詞)) {
      consumeWaRun();
      return "ne";
    }
    consumeWaRun();
    return null;
  }
  if (isTerminalYoSfpSurface(token)) {
    const next = tokens[pos + 1];
    const afterNext = tokens[pos + 2];
    if (
      next !== undefined && (next.pos & POS01) === 助詞_終助詞 &&
      (
        pos + 2 >= n ||
        ((afterNext?.pos ?? 0) & POS0) === 補助記号 ||
        quoteMarkerRelationAt(tokens, pos + 2, { consumers: ["grammar_runtime"] }) !== null
      )
    ) {
      if (isTerminalNeSfpSurface(next)) {
        cursor.advance(2);
        return "yone_confirm";
      }
      if (isPlainNaParticleSurface(next.surface)) {
        cursor.advance(2);
        return "jan";
      }
    }
  }
  if (isTerminalYoSfpSurface(token) && !hasAux && ((contentPos0 === 名詞) || (contentPos0 === 代名詞))) {
    return null;
  }
  const config = loadSfpConfig();
  const canonicalSurface = terminalSfpLexeme(token) ?? token.surface;
  const simpleType = config.simple.get(canonicalSurface);
  if (simpleType !== undefined) {
    cursor.advance();
    if (config.simpleCedingToTrailingEffect.has(canonicalSurface)) {
      if (isSourceSeparatedFromPreviousToken(cursor.tokens, cursor.pos)) {
        return simpleType;
      }
      const probe = cursor.fork(cursor.pos, cursor.end, cursor.pos);
      const trailing = detectSfp(probe, contentPos0, hasAux, true, false);
      cursor.advance(probe.pos - cursor.pos);
      return trailing ?? simpleType;
    }
    if (config.simpleCedingToListenerDirected.has(canonicalSurface)) {
      const probe = cursor.fork(cursor.pos, cursor.end, cursor.pos);
      const trailing = isSourceSeparatedFromPreviousToken(cursor.tokens, cursor.pos)
        ? null
        : detectSfp(probe, contentPos0, hasAux, true, false);
      if (trailing !== null && config.listenerDirectedEffects.has(trailing)) {
        cursor.advance(probe.pos - cursor.pos);
        return trailing;
      }
    }
    if (config.simpleConsumingTrailingYo.has(canonicalSurface)) {
      consumeAdjacentYoThenTrailingSfpRun(cursor, contentPos0, hasAux);
      return simpleType;
    }
    consumeTrailingTerminalSfpRun(
      cursor, contentPos0, hasAux,
      !followsOwnedEffect && config.simpleConsumingTrailingKa.has(canonicalSurface)
    );
    return simpleType;
  }
  if (config.transparentSurfaces.has(canonicalSurface)) {
    cursor.advance();
    return detectSfp(cursor, contentPos0, hasAux, true, followsOwnedEffect);
  }
  if (isTerminalSkipSfpSurface(token) || config.skipSurfaces.has(canonicalSurface)) {
    cursor.advance();
    return detectSfp(cursor, contentPos0, hasAux, true, followsOwnedEffect);
  }
  return null;
}

function consumeTrailingTerminalSfpRun(
  cursor: TokenCursor<MatcherToken>,
  contentPos0: number,
  hasAux: boolean,
  firstEffectConsumesKa = false
): void {
  const config = loadSfpConfig();
  for (;;) {
    const next = cursor.current();
    if (next === undefined) {
      return;
    }
    if (isSourceSeparatedFromPreviousToken(cursor.tokens, cursor.pos)) {
      return;
    }
    const canonicalNext = terminalSfpLexeme(next) ?? next.surface;
    if (
      !config.transparentSurfaces.has(canonicalNext) &&
      (isTerminalSkipSfpSurface(next) || config.skipSurfaces.has(canonicalNext))
    ) {
      return;
    }
    if (
      firstEffectConsumesKa && canonicalNext === "か" && isGrammarRuntimeTerminalKaMarker(cursor.tokens, cursor.pos)
    ) {
      cursor.advance();
      firstEffectConsumesKa = false;
      continue;
    }
    const probe = cursor.fork(cursor.pos, cursor.end, cursor.pos);
    detectSfp(probe, contentPos0, hasAux, true, true);
    if (probe.pos <= cursor.pos) {
      return;
    }
    cursor.advance(probe.pos - cursor.pos);
  }
}

export function consumeAdjacentYoThenTrailingSfpRun(
  cursor: TokenCursor<MatcherToken>,
  contentPos0: number,
  hasAux: boolean
): void {
  const yoToken = cursor.tokens[cursor.pos];
  if (
    yoToken !== undefined && (yoToken.pos & POS01) === 助詞_終助詞 && isTerminalYoSfpSurface(yoToken) &&
    !isSourceSeparatedFromPreviousToken(cursor.tokens, cursor.pos)
  ) {
    cursor.advance();
  }
  consumeTrailingTerminalSfpRun(cursor, contentPos0, hasAux);
}

export function postKaCombinedTerminalSfpAt(
  tokens: readonly MatcherToken[],
  kaIdx: number
): { readonly effect: SfpEffect; readonly consumed: number } | null {
  const next = tokens[kaIdx + 1];
  if (next === undefined || (next.pos & POS0) !== 助詞) {
    return null;
  }
  let effect: SfpEffect;
  switch (postKaTerminalSfpType(next)) {
    case "kana":
      effect = "kana";
      break;
    case "ka_ne":
      effect = "ka_ne";
      break;
    case "kai":
      effect = "kai";
      break;
    case "kayo":
      effect = "kayo";
      break;
    default:
      return null;
  }
  const toneNe = tokens[kaIdx + 2];
  const hasToneNe = toneNe !== undefined && (toneNe.pos & POS01) === 助詞_終助詞 && isTerminalNeSfpSurface(toneNe);
  return { effect, consumed: hasToneNe ? 2 : 1 };
}

export function terminalSfpRunConsumedThrough(
  tokens: readonly MatcherToken[],
  start: number,
  endInclusive: number
): boolean {
  const head = tokens[start];
  if (head === undefined || terminalSfpLexeme(head) === null) {
    return false;
  }
  const end = endInclusive + 1;
  const prev = start > 0 ? tokens[start - 1] : undefined;
  const contentPos0 = prev === undefined ? 0 : prev.pos & POS0;
  const hasAux = contentPos0 === 助動詞;
  const cursor = new TokenCursor(tokens, start, end, start);
  if (start > 0 && isGrammarRuntimeTerminalKaMarker(tokens, start - 1)) {
    const combined = postKaCombinedTerminalSfpAt(tokens, start - 1);
    return combined !== null && start + combined.consumed >= end;
  } else if (prev !== undefined && (prev.pos & POS01) === 助詞_終助詞) {
    if (isSourceSeparatedFromPreviousToken(tokens, start)) {
      return false;
    }
    consumeAdjacentYoThenTrailingSfpRun(cursor, contentPos0, hasAux);
    return cursor.pos >= end;
  } else {
    detectSfp(cursor, contentPos0, hasAux);
    if (cursor.pos === start) {
      if (!isGrammarRuntimeTerminalKaMarker(tokens, start) && !isNeutralTerminalSfpToken(head)) {
        return false;
      }
      cursor.advance();
    }
  }
  consumeAdjacentYoThenTrailingSfpRun(cursor, contentPos0, hasAux);
  return cursor.pos >= end;
}

export interface DetectedSfpNode {
  readonly sfpType: string | null;
  readonly node: SfpNode;
}

export function detectSfpWithNode(
  cursor: TokenCursor<MatcherToken>,
  contentPos0: number,
  hasAux: boolean,
): DetectedSfpNode | null {
  const start = cursor.pos;
  const detected = detectSfp(cursor, contentPos0, hasAux);
  if (cursor.pos === start) {
    if (detected !== null) {
      const [effectName, repeatText] = detected.split(":", 2);
      const effect = SFP_INVENTORY.some((entry) => entry.effect === effectName)
        ? effectName as SfpEffect
        : null;
      const sourceIndex = start < cursor.end ? start : cursor.end - 1;
      const sourceToken = sourceIndex >= 0 ? cursor.tokens[sourceIndex] : undefined;
      return { sfpType: detected, node: {
        effect,
        surface: sourceToken?.surface ?? "",
        consumed: 0,
        repeatCount: repeatText === undefined ? 1 : Number.parseInt(repeatText, 10) || 1,
        source: {
          tokens: sourceToken === undefined ? [] : [sourceToken as RuntimeHaruToken],
          tokenIndices: sourceIndex < 0 ? [] : [sourceIndex],
        },
      } };
    }
    const token = cursor.tokens[start];
    if (
      token !== undefined &&
      (token.pos & POS01) === 助詞_終助詞 &&
      terminalSfpLexeme(token) === "か" &&
      token.surface !== "か"
    ) {
      cursor.advance();
      return { sfpType: "ka", node: {
        effect: "ka", surface: token.surface, consumed: 1, repeatCount: 1,
        source: { tokens: [token as RuntimeHaruToken], tokenIndices: [start] },
      } };
    }
    return null;
  }
  const [effectName, repeatText] = detected?.split(":", 2) ?? [];
  const effect = effectName !== undefined && SFP_INVENTORY.some((entry) => entry.effect === effectName)
    ? effectName as SfpEffect
    : null;
  const tokenIndices = Array.from({ length: cursor.pos - start }, (_, offset) => start + offset);
  return { sfpType: detected, node: {
    effect,
    surface: tokenIndices.map((index) => cursor.tokens[index]?.surface ?? "").join(""),
    consumed: tokenIndices.length,
    repeatCount: repeatText === undefined ? 1 : Math.max(1, Number.parseInt(repeatText, 10) || 1),
    source: {
      tokens: tokenIndices.flatMap((index) => cursor.tokens[index] === undefined ? [] : [cursor.tokens[index] as RuntimeHaruToken]),
      tokenIndices,
    },
  } };
}

interface TerminalRoleToken extends MatcherToken {
  readonly terminal_role_sfp_before?: string | null;
  readonly terminalRoleSfpBefore?: string | null;
  readonly terminal_role_sfp_before_count?: number | null;
  readonly terminalRoleSfpBeforeCount?: number | null;
  readonly terminal_role_sfp_after?: string | null;
  readonly terminalRoleSfpAfter?: string | null;
  readonly terminal_role_sfp_after_count?: number | null;
  readonly terminalRoleSfpAfterCount?: number | null;
}

interface SfpTomlSimpleEntry {
  readonly surface?: string;
  readonly type?: string;
  readonly aliases?: readonly string[];
  readonly consumes_trailing_ka?: boolean;
  readonly consumes_trailing_yo?: boolean;
  readonly yields_to_authored_question?: boolean;
  readonly cedes_to_listener_directed?: boolean;
  readonly cedes_to_trailing_effect?: boolean;
}

interface SfpTomlRoot {
  readonly simple?: readonly SfpTomlSimpleEntry[];
  readonly lexeme?: { readonly surfaces?: readonly string[] };
  readonly lexical_variant?: readonly { readonly surface?: string; readonly lexeme?: string }[];
  readonly post_ka?: readonly SfpTomlSimpleEntry[];
  readonly skip?: {
    readonly surfaces?: readonly string[];
  };
  readonly transparent?: {
    readonly surfaces?: readonly string[];
  };
  readonly effect_class?: {
    readonly listener_directed?: readonly string[];
  };
}

interface SfpConfig {
  readonly simple: ReadonlyMap<string, string>;
  readonly simpleConsumingTrailingKa: ReadonlySet<string>;
  readonly simpleConsumingTrailingYo: ReadonlySet<string>;
  readonly simpleCedingToListenerDirected: ReadonlySet<string>;
  readonly simpleCedingToTrailingEffect: ReadonlySet<string>;
  readonly listenerDirectedEffects: ReadonlySet<string>;
  readonly simpleYieldingToAuthoredQuestion: ReadonlySet<string>;
  readonly postKa: ReadonlyMap<string, string>;
  readonly skipSurfaces: ReadonlySet<string>;
  readonly transparentSurfaces: ReadonlySet<string>;
}

function loadSfpConfig(): SfpConfig {
  if (sfpConfig !== null) {
    return sfpConfig;
  }
  if (_sfpTomlText === undefined) {
    throw new Error("Grammar runtime not initialized — call initGrammarRuntime() first");
  }
  const raw = parse(_sfpTomlText) as SfpTomlRoot;
  const simple = new Map<string, string>();
  const simpleConsumingTrailingKa = new Set<string>();
  const simpleConsumingTrailingYo = new Set<string>();
  const simpleYieldingToAuthoredQuestion = new Set<string>();
  const simpleCedingToListenerDirected = new Set<string>();
  const simpleCedingToTrailingEffect = new Set<string>();
  for (const entry of raw.simple ?? []) {
    if (entry.surface === undefined || entry.type === undefined) {
      continue;
    }
    simple.set(entry.surface, entry.type);
    for (const alias of entry.aliases ?? []) {
      simple.set(alias, entry.type);
    }
    if (entry.consumes_trailing_ka === true) {
      simpleConsumingTrailingKa.add(entry.surface);
      for (const alias of entry.aliases ?? []) {
        simpleConsumingTrailingKa.add(alias);
      }
    }
    if (entry.cedes_to_listener_directed === true) {
      simpleCedingToListenerDirected.add(entry.surface);
      for (const alias of entry.aliases ?? []) {
        simpleCedingToListenerDirected.add(alias);
      }
    }
    if (entry.cedes_to_trailing_effect === true) {
      simpleCedingToTrailingEffect.add(entry.surface);
      for (const alias of entry.aliases ?? []) {
        simpleCedingToTrailingEffect.add(alias);
      }
    }
    if (entry.yields_to_authored_question === true) {
      simpleYieldingToAuthoredQuestion.add(entry.surface);
      for (const alias of entry.aliases ?? []) {
        simpleYieldingToAuthoredQuestion.add(alias);
      }
    }
    if (entry.consumes_trailing_yo === true) {
      simpleConsumingTrailingYo.add(entry.surface);
      for (const alias of entry.aliases ?? []) {
        simpleConsumingTrailingYo.add(alias);
      }
    }
  }
  const postKa = new Map<string, string>();
  for (const entry of raw.post_ka ?? []) {
    if (entry.surface === undefined || entry.type === undefined) {
      continue;
    }
    postKa.set(entry.surface, entry.type);
    for (const alias of entry.aliases ?? []) {
      postKa.set(alias, entry.type);
    }
  }
  sfpConfig = {
    simple,
    simpleConsumingTrailingKa,
    simpleConsumingTrailingYo,
    simpleYieldingToAuthoredQuestion,
    simpleCedingToListenerDirected,
    simpleCedingToTrailingEffect,
    listenerDirectedEffects: new Set(raw.effect_class?.listener_directed ?? []),
    postKa,
    skipSurfaces: new Set(raw.skip?.surfaces ?? []),
    transparentSurfaces: new Set(raw.transparent?.surfaces ?? [])
  };
  return sfpConfig;
}

export function postKaTerminalSfpType(source: TerminalSfpIdentitySource): string | null {
  const surface = typeof source === "string" ? source : source?.surface;
  if (surface === undefined || surface === null || surface.length === 0) {
    return null;
  }
  const config = loadSfpConfig();
  const direct = config.postKa.get(surface);
  if (direct !== undefined) {
    return direct;
  }
  const canonical = typeof source === "string" ? canonicalTerminalSfpSurface(source) : terminalSfpLexeme(source);
  return canonical === null ? null : config.postKa.get(canonical) ?? null;
}

export function sfpNodeYieldsToAuthoredQuestion(node: Pick<SfpNode, "effect" | "source">): boolean {
  const firstToken = node.source.tokens[0];
  const first = firstToken?.surface;
  if (first === undefined || first.length === 0) {
    return false;
  }
  const config = loadSfpConfig();
  const canonical = terminalSfpLexeme(firstToken) ?? first;
  const yielding = config.simpleYieldingToAuthoredQuestion.has(first) || config.simpleYieldingToAuthoredQuestion.has(canonical);
  if (node.effect === null) {
    return yielding;
  }
  return yielding && (config.simple.get(first) ?? config.simple.get(canonical)) === node.effect;
}

export function trailingSfpEffectAfterFirst(
  node: Pick<SfpNode, "source">,
  contentPos0: number,
  hasAux: boolean
): SfpEffect | null {
  const tokens = node.source.tokens as readonly MatcherToken[];
  if (tokens.length < 2) {
    return null;
  }
  const cursor = new TokenCursor(tokens, 1, tokens.length, 1);
  const detected = detectSfp(cursor, contentPos0, hasAux, true, false);
  return detected !== null && SFP_INVENTORY.some((entry) => entry.effect === detected) ? detected as SfpEffect : null;
}

export function isSfpSkipSurface(surface: string | null | undefined): boolean {
  if (surface === undefined || surface === null || surface.length === 0) {
    return false;
  }
  const config = loadSfpConfig();
  if (config.skipSurfaces.has(surface)) {
    return true;
  }
  const canonical = canonicalTerminalSfpSurface(surface);
  return canonical !== null && config.skipSurfaces.has(canonical);
}

export function isYouToken(token: MatcherToken): boolean {
  return (token.pos & POS01) === 形状詞_助動詞語幹 && token.surface === "よう";
}

function auxExtractFeatures(
  auxTokens: readonly MatcherToken[],
  options: AuxExtractOptions
): AuxFeatures {
  const normalized: Parameters<typeof extractAuxFeatures>[1] = { lookups: options.lookups };
  if (options.verbConjType !== undefined && options.verbConjType !== null) {
    normalized.verbConjType = options.verbConjType;
  }
  if (options.jpDictForm !== undefined && options.jpDictForm !== null) {
    normalized.jpDictForm = options.jpDictForm;
  }
  if (options.forcePassive !== undefined) {
    normalized.forcePassive = options.forcePassive;
  }
  return extractAuxFeatures(auxTokens, normalized);
}

const NODA_COPULA_POS4 = new Set([助動詞_ダ, 助動詞_デス, 助動詞_ジャ, 助動詞_ヤ]);

export function detectNoda(cursor: TokenCursor<MatcherToken>): readonly MatcherToken[] | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || (token.pos & POS01) !== 助詞_準体助詞) {
    return null;
  }
  if (pos > 0 && (((tokens[pos - 1]?.pos ?? 0) & POS0) === 名詞 || ((tokens[pos - 1]?.pos ?? 0) & POS0) === 代名詞)) {
    return null;
  }
  const copulaAux = cursor.lookahead(1, collectAuxTokens);
  if (copulaAux.length > 0) {
    const first = copulaAux.at(0);
    const firstPos4 = (first?.pos ?? 0) & POS4;
    const firstPos5 = (first?.pos ?? 0) & POS5;
    if (NODA_COPULA_POS4.has(firstPos4) &&
      !(firstPos4 === 助動詞_ダ && firstPos5 === 連用形_一般)) {
      cursor.advance(1 + copulaAux.length);
      return copulaAux;
    }
  }
  const next = tokens[pos + 1];
  if (next !== undefined && (next.pos & POS01) === 助詞_終助詞) {
    cursor.advance();
    return [];
  }
  return null;
}

export function detectNoCopulaChain(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly consumers?: readonly BoundaryRelationConsumer[] } = {}
): readonly [kind: string, past: boolean, polite: boolean, bridgeParticle: ScopeBridgeFocusKind | null] | null {
  const consumers = options.consumers ?? ["grammar_runtime"];
  const tokens = cursor.tokens;
  const start = cursor.pos;
  const n = cursor.end;
  const first = tokens[start];
  const pos = first?.pos ?? 0;
  const pos4 = pos & POS4;
  if (first === undefined || (pos & POS0) !== 助動詞 || (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス)) {
    return null;
  }
  const form5 = pos & POS5;
  if ((form5 & POS5A) === 意志推量形_) {
    const polite = pos4 === 助動詞_デス;
    const followKind = cursor.lookahead(1, classifyFollowConnective);
    if (followKind === "contrastive") {
      cursor.advance(2);
      return ["conjecture_contrastive", false, polite, null];
    }
    if (followKind === "causal") {
      cursor.advance(2);
      return ["conjecture_causal", false, polite, null];
    }
    cursor.advance();
    return ["conjecture", false, polite, null];
  }
  if ((form5 & POS5A) === 仮定形_ && (first.surface === "なら" || first.surface === "ならば")) {
    cursor.advance();
    return ["conditional", false, false, null];
  }
  if (form5 === 連用形_促音便 && first.surface === "だっ" && start + 1 < n) {
    const next = tokens[start + 1];
    if (next !== undefined && (next.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_タ | 仮定形_)) {
      cursor.advance(2);
      return ["conditional", true, false, null];
    }
  }
  if ((form5 & POS5A) === 連用形_ && copulaDeMarkerRelationForToken(first, start, { consumers }) !== null && start + 1 < n) {
    let scan = start + 1;
    let bridgeParticle: ScopeBridgeFocusKind | null = null;
    const dewaBridge = dewaScopeBridgeRelationAt(tokens, start, {
      anchorIdx: start,
      consumers
    });
    if (dewaBridge !== null) {
      if (dewaBridge.focusParticle !== undefined &&
        dewaBridge.focusParticle !== "wa" && dewaBridge.focusParticle !== "mo") {
        return null;
      }
      bridgeParticle = dewaBridge.focusParticle ?? null;
      scan = dewaBridge.span.endExclusive;
    }
    const aru = tokens[scan];
    if (aru !== undefined && isVerbLemma(aru, "ある", "ござる")) {
      const bridgeLen = scan - (start + 1);
      const aruForm5A = aru.pos & POS5A;
      if (aruForm5A === 意志推量形_) {
        const followKind = cursor.lookahead(scan + 1 - cursor.pos, classifyFollowConnective);
        if (followKind === "contrastive") {
          cursor.advance(3 + bridgeLen);
          return ["conjecture_contrastive", false, false, bridgeParticle];
        }
        if (followKind === "causal") {
          cursor.advance(3 + bridgeLen);
          return ["conjecture_causal", false, false, bridgeParticle];
        }
        cursor.advance(2 + bridgeLen);
        return ["emphasis_conjecture", false, false, bridgeParticle];
      }
      let auxCursor = scan + 1;
      const auxStart = auxCursor;
      let polite = false;
      let past = false;
      if (aruForm5A === 連用形_) {
        while (auxCursor < n) {
          const aux = tokens[auxCursor];
          const auxPos = aux?.pos ?? 0;
          const auxPos4 = auxPos & POS4;
          if ((auxPos & POS0) !== 助動詞 || (auxPos4 !== 助動詞_マス && auxPos4 !== 助動詞_タ && auxPos4 !== 助動詞_デス)) {
            break;
          }
          if (auxPos4 === 助動詞_マス) {
            polite = true;
          } else if (auxPos4 === 助動詞_タ) {
            past = true;
          } else {
            polite = true;
          }
          auxCursor += 1;
        }
      }
      if (aru.dictionaryForm === "ござる") {
        polite = true;
      }
      const followKind = cursor.lookahead(auxCursor - cursor.pos, classifyFollowConnective);
      if (followKind !== null) {
        auxCursor += 1;
      }
      let kind: string;
      if (followKind === "conditional") {
        kind = "emphasis_conditional";
      } else if (followKind === "contrastive") {
        kind = "emphasis_contrastive";
      } else if (followKind === "causal") {
        kind = "emphasis_causal";
      } else if (bridgeParticle === "wa") {
        kind = "emphasis_limited";
      } else if (bridgeParticle === "mo") {
        kind = "emphasis_additive";
      } else {
        kind = "emphasis";
      }
      cursor.advance(2 + bridgeLen + (auxCursor - auxStart));
      return [kind, past, polite, bridgeParticle];
    }
  }
  return null;
}

export function detectKamoShirenaiAfterChain(
  cursor: TokenCursor<MatcherToken>
): readonly [polite: boolean, past: boolean] | null {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  if (
    pos + 2 >= n ||
    kaMarkerRelationAt(tokens, pos, ["grammar_runtime"]) === null ||
    tokens[pos + 1]?.surface !== "も" ||
    ((tokens[pos + 1]?.pos ?? 0) & POS0) !== 助詞 ||
    !KAMO_SHIRENAI_LEMMAS.has(tokens[pos + 2]?.dictionaryForm ?? "")
  ) {
    return null;
  }
  const modalAux = cursor.lookahead(3, collectModalAuxTokens);
  cursor.advance(3 + modalAux.length);
  return [auxIsPolite(modalAux), auxHasPast(modalAux)];
}

function collectModalAuxTokens(cursor: TokenCursor<MatcherToken>): readonly MatcherToken[] {
  const aux: MatcherToken[] = [];
  const c = cursor.fork();
  while (true) {
    const token = c.current();
    if (token === undefined || (token.pos & POS0) !== 助動詞) {
      break;
    }
    if (
      (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_) && (token.surface === "なら" || token.surface === "ならば")
    ) {
      break;
    }
    aux.push(token);
    c.advance();
  }
  return aux;
}

export function classifyFollowConnective(
  cursor: TokenCursor<{ readonly surface: string; readonly pos: number }>
): "conditional" | "contrastive" | "causal" | null {
  const token = cursor.current();
  if (token === undefined) {
    return null;
  }
  if (
    token.pos !== 0 && (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 仮定形_) && (token.surface === "なら" || token.surface === "ならば")
  ) {
    cursor.advance();
    return "conditional";
  }
  if ((token.pos & POS01) === 助詞_接続助詞) {
    if (token.surface === "けど" || token.surface === "けれど" || token.surface === "けれども" || token.surface === "けども" || token.surface === "が") {
      cursor.advance();
      return "contrastive";
    }
    if (registeredClauseConnectiveRelationForToken(token, cursor.pos, {
      acceptedSurfaces: ["から"],
      consumers: ["grammar_runtime"]
    }) !== null) {
      cursor.advance();
      return "causal";
    }
  }
  return null;
}

export function renderKamoShirenaiTail(polite: boolean, past: boolean, formal: boolean, outerNegation = false): string {
  if (outerNegation) {
    if (formal) {
      if (past && polite) {
        return "모르지 않았습니다";
      }
      if (polite) {
        return "모르지 않습니다";
      }
      if (past) {
        return "모르지 않았다";
      }
      return "모르지 않다";
    }
    if (past && polite) {
      return "모르지 않았어요";
    }
    if (polite) {
      return "모르지 않아요";
    }
    if (past) {
      return "모르지 않았어";
    }
    return "모르지 않아";
  }
  if (past && polite) {
    return formal ? "몰랐습니다" : "몰랐어요";
  }
  if (past) {
    return formal ? "몰랐다" : "몰랐어";
  }
  if (polite) {
    return formal ? "모릅니다" : "몰라요";
  }
  return formal ? "모른다" : "몰라";
}

const NEGATION_CHAIN_LEMMAS = new Set(["ない", "無い"]);

export function isChainedNaiToken(token: MatcherToken): boolean {
  const pos = token.pos;
  if (pos === 0) {
    return false;
  }
  const pos0 = pos & POS0;
  const pos4 = pos & POS4;
  if (pos0 === 助動詞 && (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ)) {
    return true;
  }
  if (pos0 === 形容詞0 && (pos & POS1) === 非自立可能 && NEGATION_CHAIN_LEMMAS.has(token.dictionaryForm)) {
    return true;
  }
  return false;
}
