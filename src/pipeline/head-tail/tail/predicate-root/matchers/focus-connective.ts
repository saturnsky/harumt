import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isAdjNai, isClassicalNariMizenNaraToken, isClassicalNuRenyouZuToken } from "../../../../matchers.js";
import { POS0, POS01, POS4, POS5, POS5A, 助動詞_ダ, 助動詞_タ, 助動詞_ナイ, 助動詞_ヌ, 助動詞 as 助動詞0, 助詞, 助詞_副助詞, 副助詞, 仮定形_, 終止形_, 連体形_, 連用形_, 連用形_促音便, isIAdjectivePredicateToken, isNaAdjCapable, isNominalLike, isPronounToken, isSahenVerbalizableNominalOrCompound, isVerbPredicateToken } from "../../../../../types/pos.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, dewaScopeBridgeRelationAt, focusDakeDeScopeBridgeRelationAt, focusReversalDokoroKaRelationAt, kaMarkerRelationAt } from "../../../boundary/marker.js";
import type { ScopeBridgeFocusKind } from "../../../data/scope-bridge-focus-table.js";
import type { ConditionalFlavor, ConnectiveKind } from "../grammar.js";
import { isAruVerbToken, isCopulaJaNegativeBridgeToken } from "../classifiers/tokens.js";
import { matchNegationEnding } from "./negation-ending.js";
import { isSecondaryParticle } from "../../../../particles/secondary-particle.js";
import { isAssemblerResumableScopeCarrierHead } from "../structural-attributive-head-table.js";

type FocusConnectiveKind = Extract<
  ConnectiveKind,
  | "focus_additive_denaku"
  | "focus_additive_negative"
  | "focus_limit_de"
  | "focus_limit_nara"
  | "recent_past_bakari_ni_reason"
  | "focus_reversal_dokoro_ka"
>;

export interface FocusConnectiveMatch {
  readonly connective: FocusConnectiveKind;
  readonly surface: string;
  readonly consumed: number;
  readonly conditionalFlavor?: ConditionalFlavor;
}

export function isDakeFocusParticle(token: RuntimeHaruToken | undefined): boolean {
  return isSecondaryParticle(token, "だけ");
}

export function isFocusParticle(token: RuntimeHaruToken | undefined, surface: string): boolean {
  return isSecondaryParticle(token, surface);
}

function isDaRenyouToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_);
}

function isWaParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "は" &&
    (token.pos & POS0) === 助詞;
}

export function matchDakeDeFocusBridge(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number; readonly surface: string; readonly focusParticle: ScopeBridgeFocusKind | null } | null {
  const bridge = focusDakeDeScopeBridgeRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (bridge !== null && (bridge.focusParticle === undefined ||
    bridge.focusParticle === "wa" || bridge.focusParticle === "mo")) {
    return {
      consumed: bridge.span.endExclusive - pos,
      surface: bridge.surface,
      focusParticle: bridge.focusParticle ?? null
    };
  }
  const demo = tokens[pos + 1];
  if (demo?.surface === "でも" && (demo.pos & POS01) === 助詞_副助詞) {
    return { consumed: 2, surface: "だけでも", focusParticle: "mo" };
  }
  return null;
}

function isLinkingRenyouNegationToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const isNegation =
    pos4 === 助動詞_ナイ ||
    pos4 === 助動詞_ヌ ||
    isAdjNai(token);
  if (!isNegation) {
    return false;
  }
  return (token.pos & POS5A) === 連用形_ && (token.pos & POS5) !== 連用形_促音便;
}

function buildFocusConnectiveMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  consumed: number,
  connective: FocusConnectiveKind
): FocusConnectiveMatch {
  return {
    connective,
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

function isPastTaToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & POS4) === 助動詞_タ;
}

function startsDearuCarrierRemainder(token: RuntimeHaruToken | undefined): boolean {
  if (!isAruVerbToken(token)) {
    return false;
  }
  const pos5A = token.pos & POS5A;
  return pos5A === 終止形_ ||
    pos5A === 連体形_ ||
    pos5A === 連用形_ ||
    pos5A === 連用形_促音便;
}

function matchBakariFocusConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): FocusConnectiveMatch | null {
  if (!isFocusParticle(tokens[pos], "ばかり")) {
    return null;
  }
  if (
    isPastTaToken(tokens[pos - 1]) &&
    caseParticleMarkerRelationForToken(tokens[pos + 1], pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null
  ) {
    return buildFocusConnectiveMatch(tokens, pos, 2, "recent_past_bakari_ni_reason");
  }
  if (kaMarkerRelationAt(tokens, pos + 1, ["tail_multi_clause"])?.particleSubtype1 === 副助詞) {
    return buildFocusConnectiveMatch(tokens, pos, 2, "focus_additive_denaku");
  }
  const bridge = tokens[pos + 1];
  if (bridge?.surface === "じゃ" && isDaRenyouToken(bridge) && isLinkingRenyouNegationToken(tokens[pos + 2])) {
    return buildFocusConnectiveMatch(tokens, pos, 3, "focus_additive_negative");
  }
  if (bridge?.surface !== "で" || !isDaRenyouToken(bridge)) {
    return null;
  }
  if (isWaParticle(tokens[pos + 2]) && isLinkingRenyouNegationToken(tokens[pos + 3])) {
    return buildFocusConnectiveMatch(tokens, pos, 4, "focus_additive_negative");
  }
  if (isLinkingRenyouNegationToken(tokens[pos + 2])) {
    return buildFocusConnectiveMatch(tokens, pos, 3, "focus_additive_denaku");
  }
  return null;
}

function matchNomiNarazuFocusConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): FocusConnectiveMatch | null {
  if (
    !isFocusParticle(tokens[pos], "のみ") ||
    !isClassicalNariMizenNaraToken(tokens[pos + 1]) ||
    !isClassicalNuRenyouZuToken(tokens[pos + 2])
  ) {
    return null;
  }
  return buildFocusConnectiveMatch(tokens, pos, 3, "focus_additive_denaku");
}

export type DokoroNegativeHostClass =
  | "situation_deictic"
  | "situation_sahen"
  | "situation_verb"
  | "scalar";

export function dokoroNegativeHostClass(
  stemToken: RuntimeHaruToken | undefined,
  lookups?: LookupTables
): DokoroNegativeHostClass | null {
  if (stemToken === undefined) {
    return null;
  }
  if (dokoroSituationDeicticBase(stemToken, lookups) !== undefined) {
    return "situation_deictic";
  }
  if (isSahenVerbalizableNominalOrCompound(stemToken)) {
    return "situation_sahen";
  }
  if (isVerbPredicateToken(stemToken)) {
    return "situation_verb";
  }
  if (isNominalLike(stemToken) || isIAdjectivePredicateToken(stemToken) || isNaAdjCapable(stemToken)) {
    return "scalar";
  }
  return null;
}

export function dokoroSituationDeicticBase(
  stemToken: RuntimeHaruToken | undefined,
  lookups?: LookupTables
): string | undefined {
  if (stemToken === undefined || !isPronounToken(stemToken)) {
    return undefined;
  }
  return lookups?.SECONDARY_PARTICLE_KOSOADO_DOKORO_SITUATION.get(stemToken.dictionaryForm);
}

export function matchDokoroNegativeCarrierSpanAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number; readonly polite: boolean } | null {
  if (!isFocusParticle(tokens[pos], "どころ")) {
    return null;
  }
  const bridgeConsumed = dokoroNegativeCopulaBridgeConsumed(tokens, pos + 1);
  if (bridgeConsumed === null) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, pos + 1 + bridgeConsumed, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  return { consumed: 1 + bridgeConsumed + negEnd.consumed, polite: negEnd.polite };
}

function dokoroNegativeCopulaBridgeConsumed(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  if (isCopulaJaNegativeBridgeToken(tokens[pos])) {
    return 1;
  }
  const dewa = dewaScopeBridgeRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (dewa !== null) {
    return dewa.span.endExclusive - pos;
  }
  return copulaDeMarkerRelationForToken(tokens[pos], pos, { consumers: ["tail_multi_clause"] }) === null
    ? null
    : 1;
}

function matchDokoroKaFocusConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): FocusConnectiveMatch | null {
  if (
    !isFocusParticle(tokens[pos], "どころ") ||
    focusReversalDokoroKaRelationAt(tokens, pos + 1, ["tail_multi_clause"]) === null
  ) {
    return null;
  }
  return buildFocusConnectiveMatch(tokens, pos, 2, "focus_reversal_dokoro_ka");
}

export function matchFocusConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): FocusConnectiveMatch | null {
  const compact = tokens[pos];
  if (compact?.surface === "だけでなく") {
    return {
      connective: "focus_additive_denaku",
      surface: compact.surface,
      consumed: 1
    };
  }
  const bakari = matchBakariFocusConnectiveAt(tokens, pos);
  if (bakari !== null) {
    return bakari;
  }
  const dokoroKa = matchDokoroKaFocusConnectiveAt(tokens, pos);
  if (dokoroKa !== null) {
    return dokoroKa;
  }
  const nomiNarazu = matchNomiNarazuFocusConnectiveAt(tokens, pos);
  if (nomiNarazu !== null) {
    return nomiNarazu;
  }
  if (!isDakeFocusParticle(compact)) {
    return null;
  }

  const ja = tokens[pos + 1];
  if (ja?.surface === "じゃ" && (ja.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)) {
    const neg = tokens[pos + 2];
    if (isLinkingRenyouNegationToken(neg)) {
      return {
        connective: "focus_additive_negative",
        surface: tokens.slice(pos, pos + 3).map((token) => token.surface).join(""),
        consumed: 3
      };
    }
  }

  const bridge = matchDakeDeFocusBridge(tokens, pos);
  if (bridge !== null) {
    const neg = tokens[pos + bridge.consumed];
    if (isLinkingRenyouNegationToken(neg)) {
      return {
        connective: bridge.focusParticle === null
          ? "focus_additive_denaku"
          : "focus_additive_negative",
        surface: tokens.slice(pos, pos + bridge.consumed + 1).map((token) => token.surface).join(""),
        consumed: bridge.consumed + 1
      };
    }
    if (matchNegationEnding(tokens, pos + bridge.consumed, { allowAttributive: true }) === null) {
      if (startsDearuCarrierRemainder(tokens[pos + bridge.consumed])) {
        return null;
      }
      return {
        connective: "focus_limit_de",
        surface: bridge.surface,
        consumed: bridge.consumed
      };
    }
  }

  const nara = tokens[pos + 1];
  if (
    nara !== undefined &&
    (nara.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_)
  ) {
    return {
      connective: "focus_limit_nara",
      surface: `${tokens[pos]!.surface}${nara.surface}`,
      consumed: 2,
      conditionalFlavor: "plain"
    };
  }
  return null;
}

export function isPredicateScopeCarrierSuffixStart(
  tokens: readonly RuntimeHaruToken[],
  suffixStart: number
): boolean {
  const suffix = tokens[suffixStart];
  if (suffix === undefined) {
    return false;
  }
  if (isAssemblerResumableScopeCarrierHead(suffix)) {
    return true;
  }
  if (matchFocusConnectiveAt(tokens, suffixStart) !== null) {
    return true;
  }
  if (suffix.surface !== "だけ" || (suffix.pos & POS01) !== 助詞_副助詞) {
    return false;
  }
  if (focusDakeDeScopeBridgeRelationAt(tokens, suffixStart, {
    consumers: ["scope_carrier_dispatch"]
  }) !== null) {
    return true;
  }
  const next = tokens[suffixStart + 1];
  return next !== undefined &&
    (next.surface === "なら" || (next.pos & POS0) === 助動詞0);
}
