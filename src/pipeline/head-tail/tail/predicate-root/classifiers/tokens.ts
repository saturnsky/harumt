import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { BoundaryToken } from "../../../boundary/punctuation.js";
import { isHardTerminalPunctuationToken } from "../../../boundary/punctuation.js";
import { copulaDeMarkerRelationForToken, kaMarkerRelationAt, predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { isFusedSelfQuestionSfpSurface } from "../../../../semantics/sfp-surface.js";
import { isAdjNai } from "../../../../matchers.js";
import { secondaryParticleCanonical } from "../../../../particles/secondary-particle.js";
import { appearancePerceptionProjectionForToken } from "../appearance-perception-carrier-table.js";
import {
  COPULA_INTRINSIC_HONORIFIC_SUPPORT_VERBS,
  COPULA_MIZEN_VOICE_HONORIFIC_SUPPORT_VERBS,
  RETROSPECTIVE_THOUGHT_VERBS
} from "../../../data/modality-sets.js";
import { EQUIVALENCE_CARRIER_NOUNS } from "../../../data/semantic-helper-sets.js";
import { IU_LEXEME_FORMS } from "../../../data/quoted-reporting-sets.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import {
  COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA,
  COLLAPSED_POTENTIAL_ASPECT_AUX_CONTRACTION_BY_LEMMA,
  TE_CONNECTIVE_FUSED_CONTRACTION_BY_MARKER,
  type CollapsedAspectAuxContraction,
  type CollapsedAspectAuxKind
} from "../../te-tail-continuation-table.js";
import {
  POS0,
  POS01,
  POS1,
  POS1_OF_NAME,
  POS4,
  POS5A,
  PREDICATE_BITS,
  isClassicalNegativeAuxiliaryToken,
  isNaAdjCapable,
  isSaHenPredicateToken,
  isSahenVerbalizableNominal,
  isSubstantiveNounToken,
  isAssertiveCopulaFamilyPos,
  isPoliteAuxiliaryPos,
  isRenyouInflection,
  isAuxiliaryToken,
  is五段,
  五段_ラ行,
  is文語形容詞,
  isTerminalAssertiveCopulaToken,
  isTerminalInflection,
  isTerminalOrAttributiveInflection,
  pos0in,
  動詞,
  動詞_非自立可能,
  副詞,
  名詞,
  形容詞0,
  形状詞,
  助詞,
  助動詞,
  助動詞_ジャ,
  助動詞_ダ,
  助動詞_タイ,
  助動詞_マス,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_レル,
  下一段_マ行,
  命令形_,
  文語助動詞_ズ,
  接頭辞,
  意志推量形_,
  終止形_,
  助詞_係助詞,
  格助詞,
  接続助詞,
  助詞_副助詞,
  助詞_終助詞,
  終助詞,
  補助記号_読点,
  未然形_,
  仮定形_,
  連体形_,
  連体詞,
  連用形_,
  isGodanRaVerbToken,
  isVoiceOrCausativeAuxiliaryToken
} from "../../../../../types/pos.js";
import type { AffirmativeSupportFocus, NegationFocusParticle, VolitionalAttemptFocusParticle } from "../grammar.js";
import { affirmativeSupportFocusForMarker, lookupConnectiveBySurface, negationFocusParticleForMarker } from "../grammar.js";
import {
  isTeConnectiveToken,
  type TeTailContinuationToken
} from "../../postverb-tail-classifier.js";
import {
  compositeConnectivePatternRelationAt,
  tokenMatchesConnectiveKind
} from "../../connective-span-scanner.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { isClausePunctuationToken } from "../../../../clause-layout/punctuation.js";
import { lookupFusedCopulaSupportConnective } from "../grammar.js";

const ARU_VERB_FORMS = new Set(["ある", "有る"]);

export type AruVerbToken = BoundaryToken & { readonly dictionaryForm: "ある" | "有る" };

export function isAruVerbToken(token: BoundaryToken | undefined): token is AruVerbToken {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return ARU_VERB_FORMS.has(token.dictionaryForm || token.surface);
}

export function isCopulaJaNegativeBridgeSurface(surface: string): boolean {
  return /^じゃ(?:[あぁー]+)?$/u.test(surface);
}

export function isFusedCopulaDewaFocusToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_) &&
    isCopulaJaNegativeBridgeSurface(token.surface);
}

export function isCopulaJaNegativeBridgeToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined || !isCopulaJaNegativeBridgeSurface(token.surface)) {
    return false;
  }
  const pos4 = token.pos & POS4;
  const pos5A = token.pos & POS5A;
  if (pos4 === 助動詞_ダ && pos5A === 連用形_) {
    return true;
  }
  return pos4 === 助動詞_ジャ && pos5A === 終止形_;
}

const GOZARU_VERB_FORMS = new Set(["ござる", "御座る"]);

const COPULA_SUPPORT_VERB_FORMS = new Set([...ARU_VERB_FORMS, ...GOZARU_VERB_FORMS]);

export function isGozaruPoliteSupportToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    GOZARU_VERB_FORMS.has(token.dictionaryForm || token.surface);
}

export function isAffirmativeCopulaSupportVerbToken(
  token: BoundaryToken | undefined
): token is BoundaryToken {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return COPULA_SUPPORT_VERB_FORMS.has(token.dictionaryForm || token.surface);
}

export function isIntrinsicHonorificCopulaSupportVerbToken(
  token: BoundaryToken | undefined
): token is BoundaryToken {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    COPULA_INTRINSIC_HONORIFIC_SUPPORT_VERBS.has(token.dictionaryForm || token.surface);
}

export function isMizenVoiceHonorificCopulaSupportVerbToken(
  token: BoundaryToken | undefined
): token is BoundaryToken {
  return token !== undefined &&
    isGodanRaVerbToken(token) &&
    COPULA_MIZEN_VOICE_HONORIFIC_SUPPORT_VERBS.has(token.dictionaryForm || token.surface);
}

export function copulaHonorificVoiceClusterLength(
  tokens: readonly BoundaryToken[],
  pos: number
): number | null {
  const first = tokens[pos];
  if (first === undefined || (first.pos & POS0) !== 助動詞) {
    return null;
  }
  if ((first.pos & POS4) === 助動詞_レル) {
    return 1;
  }
  if (first.dictionaryForm === "せる" && (first.pos & POS5A) === 未然形_) {
    const second = tokens[pos + 1];
    if (second !== undefined && (second.pos & POS0) === 助動詞 && (second.pos & POS4) === 助動詞_レル) {
      return 2;
    }
  }
  return null;
}

export interface TerminalAssertiveCopulaSpan {
  readonly start: number;
  readonly endExclusive: number;
  readonly supported: boolean;
}

export function terminalAssertiveCopulaSpanEndingBefore(
  tokens: readonly BoundaryToken[],
  endExclusive: number
): TerminalAssertiveCopulaSpan | null {
  const last = tokens[endExclusive - 1];
  if (last === undefined) {
    return null;
  }
  if (isTerminalAssertiveCopulaToken(last)) {
    return { start: endExclusive - 1, endExclusive, supported: false };
  }
  const supportIdx = isPoliteAuxiliaryPos(last.pos) && isTerminalInflection(last.pos)
    ? endExclusive - 2
    : endExclusive - 1;
  const support = tokens[supportIdx];
  if (
    support === undefined ||
    !isAffirmativeCopulaSupportVerbToken(support) ||
    !(supportIdx === endExclusive - 1
      ? isTerminalInflection(support.pos)
      : isRenyouInflection(support.pos))
  ) {
    return null;
  }
  const deIdx = supportIdx - 1;
  const de = tokens[deIdx];
  if (
    de === undefined ||
    !isAssertiveCopulaFamilyPos(de.pos) ||
    !isRenyouInflection(de.pos) ||
    copulaDeMarkerRelationForToken(de, deIdx, { consumers: ["copula_rules"] }) === null
  ) {
    return null;
  }
  return { start: deIdx, endExclusive, supported: true };
}

export function isPredicativeCopulaSupportVerbAt(
  tokens: readonly BoundaryToken[],
  supportIdx: number
): boolean {
  const support = tokens[supportIdx];
  if (!isAffirmativeCopulaSupportVerbToken(support)) {
    return false;
  }
  const form = support.pos & POS5A;
  if (form === 終止形_ || form === 連体形_) {
    return true;
  }
  return form === 連用形_ && isBoundCarrierPoliteAuxiliaryToken(tokens[supportIdx + 1]);
}

export const DEARU_SIMULTANEOUS_CONNECTIVE_SURFACE = "でありながら";

export function isAdverbialMannerNounHead(
  token: { readonly pos: number; readonly surface: string; readonly dictionaryForm?: string } | undefined,
  mannerNouns: ReadonlySet<string>
): boolean {
  return token !== undefined &&
    isSubstantiveNounToken(token) &&
    mannerNouns.has(token.dictionaryForm || token.surface);
}

export const DEARI_LISTING_CONNECTIVE_SURFACE = "であり";

export type FusedCopulaSupportConnectiveKind = "conditional" | "concessive";

export interface FusedCopulaSupportConnective {
  readonly kind: FusedCopulaSupportConnectiveKind;
  readonly surface: string;
}

export function fusedCopulaSupportConnectiveAt(
  token: BoundaryToken | undefined
): FusedCopulaSupportConnective | null {
  if (token === undefined || (token.pos & POS0) !== 助詞) {
    return null;
  }
  const surface = token.dictionaryForm || token.surface;
  const row = lookupFusedCopulaSupportConnective(surface);
  if (row === undefined) {
    return null;
  }
  const subtype = token.pos & POS1;
  if (!row.particleSubtypes.some((name) => (POS1_OF_NAME[name] ?? -1) === subtype)) {
    return null;
  }
  const kind: FusedCopulaSupportConnectiveKind | null =
    row.kind === "conditional" ? "conditional" : row.kind === "even_if" ? "concessive" : null;
  return kind === null ? null : { kind, surface };
}

export function fusedCopulaSupportConnectiveKindOf(
  token: BoundaryToken | undefined
): FusedCopulaSupportConnectiveKind | null {
  return fusedCopulaSupportConnectiveAt(token)?.kind ?? null;
}

export type FusedCopulaSupportHostSlot = "copula_host" | "nominalized_host" | "none";

export function fusedCopulaSupportHostSlotAt(
  tokens: readonly BoundaryToken[],
  fusedIdx: number
): FusedCopulaSupportHostSlot {
  const hostIdx = previousNonSpaceIndex(tokens, fusedIdx);
  if (hostIdx === null) {
    return "none";
  }
  const nominalizer = predicateNominalizerRelationForToken(tokens[hostIdx], hostIdx, {
    requirement: "tail_connective_marker",
    consumers: ["clause_layout", "tail_multi_clause"]
  });
  return nominalizer?.nominalizerKind === "no" ? "nominalized_host" : "copula_host";
}

export function isFusedCopulaSupportConditionalToken(token: BoundaryToken | undefined): boolean {
  return fusedCopulaSupportConnectiveKindOf(token) === "conditional";
}

export const DEARU_CONCESSIVE_CONNECTIVE_SURFACE = "であっても";

export const DEARE_CONCESSIVE_CONNECTIVE_SURFACE = "であれ";

export const DEAROU_CONCESSIVE_CONNECTIVE_SURFACE = "であろうと";

export function volitionalConcessiveMarkerTokenCountAt(
  tokens: readonly BoundaryToken[],
  idx: number
): number | null {
  const marker = tokens[idx];
  if (marker === undefined || (marker.pos & POS0) !== 助詞) {
    return null;
  }
  if (marker.surface === "とも") {
    return 1;
  }
  if (marker.surface !== "と") {
    return null;
  }
  if (volitionalAttemptMarkerAt(tokens, idx) !== null) {
    return null;
  }
  const following = tokens[idx + 1];
  if (following !== undefined && (following.pos & POS0) === 助詞) {
    if ((following.pos & POS01) === 助詞_係助詞 && following.surface === "も") {
      return 2;
    }
    if (following.surface === "か" || following.surface === "は" || following.surface === "の") {
      return null;
    }
  }
  return 1;
}

export interface VolitionalAttemptMarker {
  readonly tokenCount: 1 | 2;
  readonly focusParticle?: VolitionalAttemptFocusParticle;
}

export function volitionalAttemptMarkerAt(
  tokens: readonly BoundaryToken[],
  idx: number
): VolitionalAttemptMarker | null {
  const marker = volitionalIntentMarkerShapeAt(tokens, idx);
  if (marker === null) {
    return null;
  }
  if (marker.focusParticle !== undefined) {
    const carrier = tokens[idx + 2];
    return carrier !== undefined && isSuruVerbToken(carrier) ? marker : null;
  }
  let carrierIdx = idx + 1;
  while (carrierIdx < tokens.length && isClausePunctuationToken(tokens[carrierIdx])) {
    carrierIdx += 1;
  }
  const carrier = tokens[carrierIdx];
  return carrier !== undefined && isSuruVerbToken(carrier) ? marker : null;
}

export function volitionalIntentMarkerShapeAt(
  tokens: readonly BoundaryToken[],
  idx: number
): VolitionalAttemptMarker | null {
  const marker = tokens[idx];
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS0) !== 助詞 ||
    ((marker.pos & POS1) !== 格助詞 && (marker.pos & POS1) !== 接続助詞)
  ) {
    return null;
  }
  const focusParticle = volitionalAttemptFocusParticleOf(tokens[idx + 1]);
  return focusParticle === null ? { tokenCount: 1 } : { tokenCount: 2, focusParticle };
}

export function isSahenLightVerbPredicateKeyAt(tokens: readonly BoundaryToken[], idx: number): string | null {
  const token = tokens[idx];
  const light = tokens[idx + 1];
  if (token === undefined || light === undefined || !isSahenVerbalizableNominal(token) || !isSuruVerbToken(light)) {
    return null;
  }
  return `${token.dictionaryForm || token.surface}する`;
}

function volitionalAttemptFocusParticleOf(token: BoundaryToken | undefined): VolitionalAttemptFocusParticle | null {
  if (token === undefined) {
    return null;
  }
  const pos01 = token.pos & POS01;
  if (pos01 === 助詞_係助詞) {
    return token.surface === "は" ? "は" : token.surface === "も" ? "も" : null;
  }
  return pos01 === 助詞_副助詞 && token.surface === "さえ" ? "さえ" : null;
}

export function copulaSupportSimultaneousConnectiveTokenCountAt(
  tokens: readonly BoundaryToken[],
  supportIdx: number
): number | null {
  const support = tokens[supportIdx];
  if (!isAffirmativeCopulaSupportVerbToken(support)) {
    return null;
  }
  if ((support.pos & POS5A) !== 連用形_) {
    return null;
  }
  const connective = tokens[supportIdx + 1];
  if (
    connective === undefined ||
    (connective.pos & POS0) !== 助詞 ||
    !tokenMatchesConnectiveKind(connective, "simultaneous")
  ) {
    return null;
  }
  const span = compositeConnectivePatternRelationAt(
    new TokenCursor(tokens, supportIdx + 1, tokens.length),
    { consumers: ["tail_multi_clause"] }
  );
  return span === null ? 1 : span.span.endExclusive - (supportIdx + 1);
}

export function isUnrealizableCopulaPoliteAuxiliaryMood(token: BoundaryToken | undefined): boolean {
  if (token === undefined || (token.pos & POS4) !== 助動詞_マス) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 意志推量形_ || form === 命令形_;
}

function isBoundCarrierPoliteAuxiliaryToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS4) === 助動詞_マス &&
    !isUnrealizableCopulaPoliteAuxiliaryMood(token);
}

export function isCopulaSupportCapableToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  return isAffirmativeCopulaSupportVerbToken(token) || isAdjNai(token);
}

export function isSuruVerbToken(token: BoundaryToken): boolean {
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  if (token.dictionaryForm === "する" || token.dictionaryForm === "為る") {
    return true;
  }
  return token.dictionaryForm === "す" && isSaHenPredicateToken(token);
}

export function isKansaiHonorificHaruAfterVerbHost(
  token: BoundaryToken,
  host: BoundaryToken | undefined
): boolean {
  if (
    (token.pos & POS0) !== 助動詞 ||
    (token.pos & POS4) !== 五段_ラ行 ||
    token.dictionaryForm !== "はる" ||
    host === undefined ||
    (host.pos & POS0) !== 動詞
  ) {
    return false;
  }
  const hostForm = host.pos & POS5A;
  return hostForm === 連用形_ || hostForm === 未然形_;
}

export function isTagaruTailAuxToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    isAuxiliaryToken(token) &&
    is五段(token.pos) &&
    token.dictionaryForm === "たがる";
}

export function isBungoProhibitiveNakareToken(token: BoundaryToken): boolean {
  return (token.pos & POS0) === 形容詞0 &&
    (token.pos & POS5A) === 命令形_ &&
    is文語形容詞(token.pos) &&
    token.dictionaryForm === "なし";
}

export function isSayVerbToken(token: BoundaryToken): boolean {
  return (token.pos & POS0) === 動詞 && IU_LEXEME_FORMS.has(token.dictionaryForm ?? "");
}

export function isThoughtVerbToken(token: BoundaryToken): boolean {
  return (token.pos & POS0) === 動詞 && RETROSPECTIVE_THOUGHT_VERBS.has(token.dictionaryForm ?? "");
}

export function isUnrealizableCopulaMizenSupportAuxiliary(token: BoundaryToken | undefined): boolean {
  return token !== undefined && isVoiceAuxiliaryToken(token);
}

function isVoiceAuxiliaryToken(token: BoundaryToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  return (token.pos & POS4) === 助動詞_レル ||
    token.dictionaryForm === "せる" ||
    token.dictionaryForm === "させる";
}

export function isClauseClosingPredicateTailToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 助動詞 && !pos0in(pos0, PREDICATE_BITS)) {
    return false;
  }
  return isTerminalOrAttributiveInflection(token.pos);
}

export function isBareMoConcessivePreviousToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const form5A = token.pos & POS5A;
  if (isVoiceAuxiliaryToken(token)) {
    return form5A === 終止形_ || form5A === 連体形_;
  }
  if (isClassicalNegativeAuxiliaryToken(token)) {
    return form5A === 終止形_;
  }
  if ((token.pos & POS0) !== 動詞 && (token.pos & POS0) !== 形容詞0) {
    return false;
  }
  return form5A === 終止形_ || form5A === 連用形_ || form5A === 連体形_;
}

export function focusedNegationMarkerCanonical(marker: BoundaryToken | undefined): string | undefined {
  if (marker === undefined) {
    return undefined;
  }
  if ((marker.pos & POS01) === 助詞_係助詞) {
    return marker.surface;
  }
  return secondaryParticleCanonical(marker) ?? undefined;
}

export interface FocusedNegationShape {
  readonly focusParticle: NegationFocusParticle;
  readonly supportConsumed: number;
  readonly politeConsumed: number;
}

function isNegativeSupportSuruToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 動詞_非自立可能 &&
    isSuruVerbToken(token) &&
    (token.pos & POS5A) === 未然形_;
}

function isPoliteNegativeSupportSuruToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 動詞_非自立可能 &&
    isSuruVerbToken(token) &&
    (token.pos & POS5A) === 連用形_;
}

export function isSplitPoliteNegationEndingAt(
  tokens: readonly BoundaryToken[],
  idx: number
): boolean {
  const masu = tokens[idx];
  const nu = tokens[idx + 1];
  return masu !== undefined &&
    (masu.pos & POS4) === 助動詞_マス &&
    (masu.pos & POS5A) === 未然形_ &&
    nu !== undefined &&
    (nu.pos & POS4) === 助動詞_ヌ;
}

function isFocusedNegationSupportHostAt(tokens: readonly BoundaryToken[], hostIdx: number): boolean {
  const host = tokens[hostIdx];
  if (host === undefined) {
    return false;
  }
  if (isVerbalSupportFocusHost(host)) {
    return true;
  }
  const verbal = tokens[hostIdx - 1];
  return (host.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連用形_) &&
    verbal !== undefined &&
    (verbal.pos & POS5A) === 連用形_ &&
    isVerbalSupportFocusHost(verbal);
}

function isVerbalSupportFocusHost(token: BoundaryToken): boolean {
  return (token.pos & POS0) === 動詞 ||
    isVoiceOrCausativeAuxiliaryToken({ pos: token.pos, dictionaryForm: token.dictionaryForm ?? "" });
}

export function focusedNegationShapeAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number
): FocusedNegationShape | null {
  const site = focusSupportMarkerSiteAt(tokens, markerIdx);
  if (site === null) {
    return null;
  }
  const focusParticle = negationFocusParticleForMarker(site.marker);
  if (focusParticle === null) {
    return null;
  }
  const next = tokens[markerIdx + 1];
  if (next === undefined) {
    return null;
  }
  if (isNegativeSupportSuruToken(next)) {
    const negation = tokens[markerIdx + 2];
    return site.supportHost &&
      negation !== undefined &&
      isNaiOrNuToken(negation)
      ? { focusParticle, supportConsumed: 1, politeConsumed: 0 }
      : null;
  }
  if (isPoliteNegativeSupportSuruToken(next)) {
    return site.supportHost && isSplitPoliteNegationEndingAt(tokens, markerIdx + 2)
      ? { focusParticle, supportConsumed: 1, politeConsumed: 1 }
      : null;
  }
  return site.directNegationHost && isNaiOrNuToken(next)
    ? { focusParticle, supportConsumed: 0, politeConsumed: 0 }
    : null;
}

interface FocusSupportMarkerSite {
  readonly marker: string;
  readonly supportHost: boolean;
  readonly directNegationHost: boolean;
}

function focusSupportMarkerSiteAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number
): FocusSupportMarkerSite | null {
  const marker = focusedNegationMarkerCanonical(tokens[markerIdx]);
  if (marker === undefined) {
    return null;
  }
  const host = tokens[markerIdx - 1];
  if (host === undefined || (host.pos & POS5A) !== 連用形_) {
    return null;
  }
  const hostPos0 = host.pos & POS0;
  return {
    marker,
    supportHost: isFocusedNegationSupportHostAt(tokens, markerIdx - 1),
    directNegationHost: hostPos0 === 形容詞0 ||
      (hostPos0 === 助動詞 && (host.pos & POS4) === 助動詞_タイ)
  };
}

export interface AffirmativeFocusSupportShape {
  readonly focus: AffirmativeSupportFocus;
}

function affirmativeSupportSuruFormAt(
  tokens: readonly BoundaryToken[],
  supportIdx: number
): { readonly hypothetical: boolean } | null {
  const token = tokens[supportIdx];
  if (
    token === undefined ||
    (token.pos & POS01) !== 動詞_非自立可能 ||
    !isSuruVerbToken(token)
  ) {
    return null;
  }
  const form5A = token.pos & POS5A;
  if (form5A === 仮定形_) {
    return { hypothetical: true };
  }
  if (form5A === 連用形_) {
    return isSplitPoliteNegationEndingAt(tokens, supportIdx + 1) ? null : { hypothetical: false };
  }
  return form5A === 終止形_ || form5A === 連体形_ ? { hypothetical: false } : null;
}

export function affirmativeFocusSupportShapeAt(
  tokens: readonly BoundaryToken[],
  markerIdx: number
): AffirmativeFocusSupportShape | null {
  const site = focusSupportMarkerSiteAt(tokens, markerIdx);
  if (site === null || !site.supportHost) {
    return null;
  }
  const support = affirmativeSupportSuruFormAt(tokens, markerIdx + 1);
  if (support === null) {
    return null;
  }
  const focus = affirmativeSupportFocusForMarker(site.marker, support.hypothetical ? "hypothetical" : null);
  return focus === null ? null : { focus };
}

export function isMisclassifiedDashiCopulaListingToken(token: RuntimeHaruToken): boolean {
  return token.surface === "だし" &&
    token.dictionaryForm === "だし" &&
    token.reading === "ダシ" &&
    (token.pos & POS0) === 名詞;
}

export function isTeSurfaceConnectiveToken(token: TeTailContinuationToken | undefined): token is TeTailContinuationToken {
  return token !== undefined && isTeConnectiveToken(token) && token.surface.charAt(0) === "て";
}

export function isKotoNounToken(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (token.surface === "こと" || token.surface === "事");
}

export function isMonoReasonNounToken(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (token.surface === "もの" || token.surface === "もん");
}

export function isEquivalenceCarrierPredicativeNoun(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    EQUIVALENCE_CARRIER_NOUNS.has(token.dictionaryForm || token.surface) &&
    isNaAdjCapable(token);
}

export function isEquivalenceCarrierAdnominalToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    EQUIVALENCE_CARRIER_NOUNS.has(token.dictionaryForm || token.surface) &&
    (token.pos & POS0) === 連体詞;
}

export function isWakeNounToken(token: RuntimeHaruToken | undefined): token is RuntimeHaruToken {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (
      token.surface === "わけ" ||
      token.surface === "訳" ||
      token.dictionaryForm === "わけ" ||
      token.dictionaryForm === "訳" ||
      token.reading === "ワケ"
    );
}

export function isNaiOrNuToken(token: BoundaryToken): boolean {
  const pos4 = token.pos & POS4;
  if (pos4 === 助動詞_ナイ || pos4 === 助動詞_ヌ) {
    return true;
  }
  return isAdjNai(token);
}

export function isFusedNegativeStateChangeVerbToken(
  token: BoundaryToken | undefined,
  lookups: LookupTables
): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return lookups
    .set("copula_focus_adjunct", "fused_negative_state_change_verbs")
    .has(token.dictionaryForm || token.surface);
}

export function isAdnominalCopulaToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined && token.surface === "な" && (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連体形_);
}

export function isLikenessModalAdnominalTailEnd(
  tokens: readonly BoundaryToken[],
  adnominalCopulaIdx: number
): boolean {
  return isAdnominalCopulaToken(tokens[adnominalCopulaIdx]) &&
    appearancePerceptionProjectionForToken(tokens[adnominalCopulaIdx - 1]) === "attributive_like";
}

export function isProjectingModalAdnominalTailEnd(
  tokens: readonly RuntimeHaruToken[],
  adnominalCopulaIdx: number
): boolean {
  if (!isAdnominalCopulaToken(tokens[adnominalCopulaIdx])) {
    return false;
  }
  const projection = appearancePerceptionProjectionForToken(tokens[adnominalCopulaIdx - 1]);
  return projection === "attributive_like" || projection === "sou_appearance";
}

export function isAppearanceModalAdnominalTailEnd(
  tokens: readonly RuntimeHaruToken[],
  adnominalCopulaIdx: number
): boolean {
  return isAdnominalCopulaToken(tokens[adnominalCopulaIdx]) &&
    appearancePerceptionProjectionForToken(tokens[adnominalCopulaIdx - 1]) === "sou_appearance";
}

export function isClassicalZuIzenkeiToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS4 | POS5A)) === (文語助動詞_ズ | 命令形_);
}

export function isTariListingParticleToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS01) === 助詞_副助詞 &&
    lookupConnectiveBySurface(token.surface) === "listing";
}

export type { CollapsedAspectAuxContraction, CollapsedAspectAuxKind };

export function collapsedAspectAuxContraction(
  token: BoundaryToken | undefined
): CollapsedAspectAuxContraction | null {
  if (token === undefined || (token.pos & POS0) !== 助動詞) return null;
  return COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA.get(token.dictionaryForm || token.surface) ?? null;
}

export function collapsedPotentialAspectAuxContraction(
  token: BoundaryToken | undefined
): CollapsedAspectAuxContraction | null {
  if (token === undefined || (token.pos & POS0) !== 助動詞) return null;
  return COLLAPSED_POTENTIAL_ASPECT_AUX_CONTRACTION_BY_LEMMA.get(token.dictionaryForm || token.surface) ?? null;
}

export function teConnectiveFusedAspectContraction(
  marker: BoundaryToken | undefined,
  next: BoundaryToken | undefined
): CollapsedAspectAuxContraction | null {
  if (!isTeConnectiveToken(marker) || !isTeConnectiveToken(next) || next!.surface !== "て") return null;
  return TE_CONNECTIVE_FUSED_CONTRACTION_BY_MARKER.get(marker!.surface) ?? null;
}

export function collapsedAspectAuxKind(token: BoundaryToken | undefined): CollapsedAspectAuxKind | null {
  return collapsedAspectAuxContraction(token)?.kind ?? null;
}

export function isShimeruCausativeAuxToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 下一段_マ行) &&
    (token.dictionaryForm === "しめる" || token.surface === "しめ" || token.surface === "しめる");
}

export interface TteTopicFollowerToken {
  readonly surface: string;
  readonly pos: number;
  readonly dictionaryForm: string;
}

export function bareTteTopicExclamativeFollowerAhead(
  tokens: readonly TteTopicFollowerToken[],
  fromIdx: number,
  lookups: LookupTables,
  options: { readonly requireInterrogativeClose?: boolean } = {}
): boolean {
  let evalIdx = -1;
  for (let i = fromIdx; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    const pos0 = token.pos & POS0;
    if ((token.pos & POS01) === 補助記号_読点 || pos0 === 副詞 || pos0 === 接頭辞) {
      continue;
    }
    if (
      (pos0 === 形容詞0 || pos0 === 形状詞 || pos0 === 名詞) &&
      (token.pos & POS5A) !== 連体形_ &&
      lookups.TTE_TOPIC_EXCLAMATIVE_PREDICATES.has(token.dictionaryForm || token.surface)
    ) {
      evalIdx = i;
      break;
    }
    return false;
  }
  if (evalIdx < 0) {
    return false;
  }
  let sawInterrogative = false;
  for (let i = evalIdx + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    if (isHardTerminalPunctuationToken(token)) {
      return options.requireInterrogativeClose !== true ||
        sawInterrogative || token.surface.includes("？") || token.surface.includes("?");
    }
    const pos0 = token.pos & POS0;
    if (
      pos0 === 助詞 || pos0 === 助動詞 ||
      (token.pos & POS01) === 補助記号_読点 ||
      isAdjNai(token)
    ) {
      if ((token.pos & POS01) === 助詞_終助詞 && ["か", "の", "ね", "かな", "かい"].includes(token.surface)) {
        sawInterrogative = true;
      }
      continue;
    }
    return false;
  }
  return options.requireInterrogativeClose !== true || sawInterrogative;
}

export function isTerminalQuestionSfpParticleStart(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const token = cursor.current();
  if (token === undefined) return false;
  if ((token.pos & POS01) !== 助詞_終助詞) return false;
  return kaMarkerRelationAt(cursor.tokens, cursor.pos, ["tail_multi_clause"])?.particleSubtype1 === 終助詞 ||
    isFusedSelfQuestionSfpSurface(token);
}

export const SYNTHETIC_DEICTIC_STEM_REASON_PREFIX = "synthetic_deictic_stem:";

export function isSyntheticDeicticStemToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    token.syntheticReason?.startsWith(SYNTHETIC_DEICTIC_STEM_REASON_PREFIX) === true &&
    token.surface === "そう" &&
    token.dictionaryForm === "そう";
}
