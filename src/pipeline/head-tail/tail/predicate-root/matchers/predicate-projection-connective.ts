import { isDegreeExtentParticle } from "../../../../particles/secondary-particle.js";
import { activeProtoLayout, activeProtoUtteranceClosureRunAt } from "../../../../clause-layout/proto-state.js";
import { clauseContainsInterrogativeBefore } from "../../../../quote/embedded-question.js";
import { isLikenessTransparentFormalNounHead } from "../structural-attributive-head-table.js";
import { isSubstantiveNounToken } from "../../../../../types/pos.js";
import { isBoundaryPunctuationToken, type BoundaryToken } from "../../../boundary/punctuation.js";
import { INFLECTABLE_BITS, POS0, POS01, POS4, POS5A, pos0in, isAdjectivalDerivationalSuffix, 下一段_サ行, 形状詞, 助詞, 助詞_格助詞, 助詞_終助詞, 助詞_副助詞, 助動詞 as 助動詞0, 助動詞_タ, 助動詞_ダ, 助動詞_タイ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 接尾辞, 動詞, 形容詞0, 文語助動詞_ゴトシ, 文語助動詞_ベシ, 補助記号, 名詞, 命令形_, 終止形_, 連体形_, 連用形_, 記号, POS1, 副助詞, 助動詞語幹, isAdverbCapableNominal, isCaseParticleToken, isGeneralRenyouInflectedToken, isLexicalPureNaAdjStem, isVerbPredicateToken, isRareruAuxiliaryToken, 形状詞_助動詞語幹, 助詞_係助詞, isPastAuxiliaryPos, isPoliteAuxiliaryPos, isTerminalOrAttributiveInflection, isVoiceOrCausativeAuxiliaryToken } from "../../../../../types/pos.js";
import { type LookupTables } from "../../../../lookup-tables.js";

import {
  caseParticleMarkerRelationForToken,
  caseParticleNiClauseConnectiveRelationAt,
  copulaNiMarkerRelationForToken,
  kaMarkerRelationAt,
  nominalLinkMarkerRelationAt,
  predicateNominalizerRelationForToken
} from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { matrixPredicateReachAt } from "../../../boundary/modifier-field.js";
import { kaNoYouNiSimileRelationAt, kaOwnershipKindAt } from "../../../boundary/ka-ownership.js";
import { isNeutralTerminalSfpToken } from "../../../../semantics/sfp-surface.js";
import { admitsYouZeroDirectiveHostEnd, isYouNiQuoteDirectivePredicateStart, youZeroDirectivePredicateKey } from "../../../../semantics/you-zero-directive.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { YOU_NI_SIMILE_MANNER_HOSTS, YOU_NI_SPEECH_MANNER_HOSTS, YOU_NI_VOLITIONAL_MANNER_HOSTS } from "../../../data/semantic-helper-sets.js";
import { NI_COMPLEMENT_M_EXTENT_MATRICES, NI_COMPLEMENT_OUTCOME_MATRICES, NI_COMPLEMENT_SKIP_MATRICES, NI_COMPLEMENT_WORTH_MATRICES, NI_COMPLEMENT_CANNOT_BEAR_MATRICES } from "../../../data/ni-predicate-complement-table.js";
import { appearancePerceptionReadingForToken } from "../appearance-perception-carrier-table.js";
import { isTeAuxActivationAccepted } from "../postverb-auxiliary-parser.js";
import { compositeConnectivePatternRelationAt } from "../../connective-span-scanner.js";
import { isNiSeriesConcessiveConditionalSurface } from "../connective-surface-table.js";
import { lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import type { ConnectiveKind, QuoteAttributiveFlavor, QuotativeMood } from "../grammar.js";
import { collapsedAspectAuxKind, isAdnominalCopulaToken, isTeSurfaceConnectiveToken } from "../classifiers/tokens.js";
import { isTeConnectiveToken, teBenefactiveContinuationMetadataForToken } from "../../postverb-tail-classifier.js";
import {
  loadTailAttachmentRegistry,
  nominalFrameDataGeneration
} from "../../../head/adapters/nominal/frame-table.js";
import type { TailAttachmentTePolicy } from "../../../head/adapters/nominal/grammar.js";
import { createConnectiveOp } from "../op-builders.js";
import { tokensShareLemma, type RuntimeHaruToken } from "../../../../../types/token.js";
import { matchQuantityExtentDakeAt, type QuantityExtentDakeBinding, type QuantityExtentLayout } from "./quantity-extent.js";
import type { QuoteAttributiveHeadFrame } from "../quote-attributive-head-frame.js";
import type { UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";

export interface PredicateProjectionConnectiveMatch {
  readonly connective: Extract<
    ConnectiveKind,
    | "predicate_projection_degree_extent"
    | "predicate_projection_quantity_extent"
    | "predicate_projection_proportional_reason"
    | "predicate_projection_comparison"
    | "predicate_projection_parallel_change"
    | "predicate_projection_repeated_occasion"
    | "predicate_projection_occasion"
    | "predicate_projection_intentional_purpose"
    | "predicate_projection_concession_echo"
    | "predicate_projection_until"
    | "predicate_projection_until_attributive"
    | "predicate_projection_as_far_as"
    | "predicate_projection_ni_complement"
    | "predicate_projection_ni_complement_m"
    | "predicate_projection_ni_complement_outcome"
    | "predicate_projection_ni_complement_worth"
    | "predicate_projection_ni_complement_cannot_bear"
    | "predicate_projection_no_quote_reporting"
    | "predicate_projection_additive_ue_ni"
    | "predicate_projection_ue_de"
    | "predicate_projection_ue_de_attributive"
    | "predicate_projection_gatera"
    | "predicate_projection_purpose_beku"
    | "purpose_motion"
    | "even_if"
    | "predicate_projection_quote_attributive"
    | "predicate_projection_simultaneous_time"
  >;
  readonly surface: string;
  readonly consumed: number;
  readonly quoteAttributiveFlavor?: QuoteAttributiveFlavor;
  readonly quantityBinding?: QuantityExtentDakeBinding;
}

export interface YouNiPredicateProjectionConnectiveMatch {
  readonly connective: Extract<
    ConnectiveKind,
    | "predicate_projection_purpose"
    | "predicate_projection_wish_terminal"
    | "predicate_projection_manner_simile"
    | "predicate_projection_manner_volitional"
    | "predicate_projection_manner_simile_action"
  >;
  readonly surface: "ように" | "よう" | "みたいに";
  readonly consumed: 1 | 2;
}

export function perceptionCarrierVerbMatch<T extends BoundaryToken>(
  verb: T | undefined,
  next: T | undefined
): { reading: "visual" | "inferential" | "inferential_passive" | "felt"; span: number; terminal: T } | null {
  if (verb === undefined || (verb.pos & POS0) !== 動詞) {
    return null;
  }
  const single = appearancePerceptionReadingForToken(verb);
  if (single !== null) {
    return { reading: single, span: 1, terminal: verb };
  }
  if (
    (verb.dictionaryForm ?? verb.surface) === "思う" &&
    next !== undefined &&
    (next.pos & POS4) === 助動詞_レル
  ) {
    return { reading: "inferential_passive", span: 2, terminal: next };
  }
  return null;
}

export function fusedNoYouNiPerceptionCarrierAt(
  tokens: readonly BoundaryToken[],
  markerPos: number
): { readonly reading: "visual" | "inferential" | "inferential_passive" | "felt"; readonly consumed: number } | null {
  const marker = tokens[markerPos];
  const carrier = perceptionCarrierVerbMatch(tokens[markerPos + 1], tokens[markerPos + 2]);
  if (
    marker === undefined ||
    marker.surface !== "のように" ||
    (marker.pos & POS0) !== 助詞 ||
    carrier === null ||
    !isTeAuxActivationAccepted(carrier.terminal, tokens[markerPos + 1 + carrier.span])
  ) {
    return null;
  }
  return { reading: carrier.reading, consumed: 1 + carrier.span };
}

export interface KaNoYouNiPerceptionCarrierAdmission {
  readonly reading: "visual" | "inferential" | "inferential_passive" | "felt";
  readonly consumed: number;
}

export function kaNoYouNiPerceptionCarrierAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number
): KaNoYouNiPerceptionCarrierAdmission | null {
  if (kaMarkerRelationAt(tokens, kaIdx, ["tail_multi_clause"])?.particleSubtype1 !== 副助詞) {
    return null;
  }
  const fused = fusedNoYouNiPerceptionCarrierAt(tokens, kaIdx + 1);
  if (fused !== null) {
    return { reading: fused.reading, consumed: 1 + fused.consumed };
  }
  const you = tokens[kaIdx + 2];
  const carrier = perceptionCarrierVerbMatch(tokens[kaIdx + 4], tokens[kaIdx + 5]);
  if (
    nominalLinkMarkerRelationAt(tokens, kaIdx + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    you === undefined ||
    (you.surface !== "よう" && you.surface !== "様") ||
    (you.pos & POS1) !== 助動詞語幹 ||
    copulaNiMarkerRelationForToken(tokens[kaIdx + 3], kaIdx + 3, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    carrier === null ||
    !isTeAuxActivationAccepted(carrier.terminal, tokens[kaIdx + 4 + carrier.span])
  ) {
    return null;
  }
  return { reading: carrier.reading, consumed: 4 + carrier.span };
}

export type KeijoujiAttributiveMarkerKind = "na" | "no";

export function keijoujiAttributiveMarkerAt(
  tokens: readonly BoundaryToken[],
  pos: number
): KeijoujiAttributiveMarkerKind | null {
  const marker = tokens[pos];
  if (marker === undefined) {
    return null;
  }
  if (
    marker.surface === "な" &&
    (marker.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return "na";
  }
  return nominalLinkMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] }) !== null &&
    precedesLexicalPureKeijoujiHost(tokens, pos)
    ? "no"
    : null;
}

export function fusedNoYouNiKeijoujiAttributiveAt(
  tokens: readonly BoundaryToken[],
  pos: number
): boolean {
  const marker = tokens[pos];
  return marker !== undefined &&
    marker.surface === "のように" &&
    (marker.pos & POS01) === 助詞_格助詞 &&
    precedesLexicalPureKeijoujiHost(tokens, pos);
}

function precedesLexicalPureKeijoujiHost(
  tokens: readonly BoundaryToken[],
  markerPos: number
): boolean {
  const host = tokens[markerPos - 1];
  return host !== undefined && isLexicalPureNaAdjStem(host);
}

const EASE_DIFFICULTY_ADJ_SUFFIXES: ReadonlySet<string> = new Set(["やすい", "にくい", "づらい", "がたい"]);

function isPredicateProjectionHostEndToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) return false;
  if (pos0in(token.pos, INFLECTABLE_BITS)) return true;
  if (
    isAdjectivalDerivationalSuffix(token) &&
    token.dictionaryForm !== undefined &&
    EASE_DIFFICULTY_ADJ_SUFFIXES.has(token.dictionaryForm)
  ) {
    return true;
  }
  if (collapsedAspectAuxKind(token) !== null) return true;
  const pos4 = token.pos & POS4;
  if (
    (token.pos & POS0) === 助動詞0 &&
    pos4 === 文語助動詞_ベシ &&
    ((token.pos & POS5A) === 連体形_ || (token.pos & POS5A) === 終止形_)
  ) {
    return true;
  }
  if (
    (token.pos & POS0) === 助動詞0 &&
    pos4 === 下一段_サ行 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる")
  ) {
    return true;
  }
  return (token.pos & POS0) === 助動詞0 &&
    (
      pos4 === 助動詞_タ ||
      pos4 === 助動詞_ナイ ||
      pos4 === 助動詞_ヌ ||
      pos4 === 助動詞_レル ||
      pos4 === 助動詞_タイ ||
      pos4 === 助動詞_ダ ||
      pos4 === 助動詞_デス ||
      pos4 === 助動詞_マス
    );
}

function isMitaiSimileHostEndToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) return false;
  if (isPredicateProjectionHostEndToken(token)) return true;
  return (token.pos & POS0) === 形状詞;
}

export function matchYouNiPredicateProjectionConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number,
  options: {
    readonly requireEnd?: boolean;
    readonly allowZeroNiPurpose?: boolean;
    readonly lookups: LookupTables;
  }
): YouNiPredicateProjectionConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const zeroNi = matchZeroNiPurposeProjectionConnectiveAt(tokens, pos, {
    requireEnd,
    allow: options.allowZeroNiPurpose === true
  });
  if (zeroNi !== null) {
    return zeroNi;
  }
  if (fusedNoYouNiKeijoujiAttributiveAt(tokens, pos)) {
    if (fusedNoYouNiPerceptionCarrierAt(tokens, pos) !== null) {
      return null;
    }
    if (requireEnd && !youNiTerminalWishFollower(new TokenCursor(tokens, pos + 1, tokens.length))) {
      return null;
    }
    return { connective: "predicate_projection_manner_simile", surface: "ように", consumed: 1 };
  }
  const previous = tokens[pos - 1];
  const you = tokens[pos];
  const ni = tokens[pos + 1];
  const isMitai = you !== undefined && you.surface === "みたい";
  const keijoujiNoBridged = !isMitai && keijoujiAttributiveMarkerAt(tokens, pos - 1) === "no";
  if (
    !keijoujiNoBridged &&
    !(isMitai ? isMitaiSimileHostEndToken(previous) : isPredicateProjectionHostEndToken(previous))
  ) {
    return null;
  }
  if (isToIuYouNiDiscourseSequence(tokens, pos)) return null;

  if (
    you === undefined || (you.surface !== "よう" && !isMitai) || (you.pos & POS01) !== 形状詞_助動詞語幹
  ) {
    return null;
  }
  if (
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null
  ) {
    return null;
  }
  const youCursor = new TokenCursor(tokens, pos, tokens.length);
  const volitionalHost =
    !isMitai &&
    isVolitionalMannerHostToken(volitionalMannerClassHostToken(tokens, pos)) &&
    !directiveFollowerVetoesVolitionalManner(youCursor, options.lookups);
  const follower = tokens[pos + 2];
  if (isYouNiPostverbCarrierFollower(follower) && !(volitionalHost && isSuruFollowerToken(follower))) {
    return null;
  }
  const terminalFollower = youNiTerminalWishFollower(youCursor.fork(pos + 2));
  if (requireEnd && !terminalFollower) {
    return null;
  }
  return {
    connective: keijoujiNoBridged || isMitai
      ? "predicate_projection_manner_simile"
      : terminalFollower && isFormulaicTerminalWishYouNiHostEnd(tokens, pos)
        ? "predicate_projection_wish_terminal"
        : isPastAuxiliaryToken(previous)
          ? "predicate_projection_manner_simile"
          : volitionalHost
            ? "predicate_projection_manner_volitional"
            : isSimileMannerHostToken(previous) &&
              !simileMannerYieldsToDirectiveCoordinate(tokens, pos, youCursor, options.lookups)
              ? "predicate_projection_manner_simile_action"
              : "predicate_projection_purpose",
    surface: isMitai ? "みたいに" : "ように",
    consumed: 2
  };
}

export interface KaNoYouNiMannerSimileConnectiveMatch {
  readonly connective: Extract<ConnectiveKind, "predicate_projection_manner_simile">;
  readonly surface: string;
  readonly consumed: 2 | 4;
}

export function matchKaNoYouNiMannerSimileConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number,
  lookups: LookupTables
): KaNoYouNiMannerSimileConnectiveMatch | null {
  const relation = kaNoYouNiSimileRelationAt(tokens, pos, lookups);
  if (relation === null || relation.form !== "adverbial") {
    return null;
  }
  if (kaOwnershipKindAt(tokens, pos, lookups) !== "simile") {
    return null;
  }
  if (kaNoYouNiPerceptionCarrierAt(tokens, pos) !== null) {
    return null;
  }
  const consumed: 2 | 4 = relation.consumed === 2 ? 2 : 4;
  return {
    connective: "predicate_projection_manner_simile",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

export interface GotokuMannerSimileConnectiveMatch {
  readonly connective: Extract<ConnectiveKind, "predicate_projection_manner_simile">;
  readonly surface: string;
  readonly consumed: 1;
}

export function matchGotokuMannerSimileConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number
): GotokuMannerSimileConnectiveMatch | null {
  const token = tokens[pos];
  if (
    token === undefined ||
    (token.pos & (POS0 | POS4 | POS5A)) !== (助動詞0 | 文語助動詞_ゴトシ | 連用形_) ||
    lookupConnectiveBySurface(token.surface) !== "predicate_projection_manner_simile"
  ) {
    return null;
  }
  if (
    keijoujiAttributiveMarkerAt(tokens, pos - 1) !== "no" &&
    !isPredicateProjectionHostEndToken(tokens[pos - 1])
  ) {
    return null;
  }
  return {
    connective: "predicate_projection_manner_simile",
    surface: token.surface,
    consumed: 1
  };
}

export interface QuotativeMannerSimileConnectiveMatch {
  readonly connective: Extract<
    ConnectiveKind,
    | "predicate_projection_quotative_manner_simile"
    | "predicate_projection_quotative_manner_simile_attributive"
  >;
  readonly surface: "みたいに" | "みたいな";
  readonly consumed: 2;
  readonly mood: QuotativeMood;
  readonly closure: "neutral_terminal_sfp" | "terminal_particle_run" | "noda_formal_noun";
  readonly leadingSfpCount: number;
}

export function buildQuotativeMannerSimileConnectiveOp(
  source: Parameters<typeof createConnectiveOp>[0]["source"],
  sfpSurface: string,
  match: QuotativeMannerSimileConnectiveMatch
) {
  return createConnectiveOp({
    connective: match.connective,
    surface: `${sfpSurface}${match.surface}`,
    quotativeMood: match.mood,
    source
  });
}

function quotativeClauseMoodForHost(token: BoundaryToken | undefined): QuotativeMood {
  if (token !== undefined && (token.pos & (POS0 | POS5A)) === (動詞 | 命令形_)) {
    return "imperative";
  }
  return "declarative";
}

function isQuotativeClauseTerminalSfpToken(token: BoundaryToken | undefined): boolean {
  return isNeutralTerminalSfpToken(token);
}

export function isLikenessCarrierHeadToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    token.surface === "みたい" &&
    (token.pos & POS01) === 形状詞_助動詞語幹;
}

export function matchQuotativeMannerSimileConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): QuotativeMannerSimileConnectiveMatch | null {
  if (!isLikenessCarrierHeadToken(tokens[pos])) {
    return null;
  }
  const marker = tokens[pos + 1];
  if (marker === undefined) {
    return null;
  }
  let leadingSfpCount = 1;
  let closureKind: QuotativeMannerSimileConnectiveMatch["closure"] = "neutral_terminal_sfp";
  let mood: QuotativeMood = quotativeClauseMoodForHost(tokens[pos - 2]) === "imperative"
    ? "imperative"
    : clauseContainsInterrogativeBefore(
      tokens, pos - 1, lookups, activeProtoLayout() ?? undefined, { scope: "clause" }
    ) ? "interrogative" : "declarative";
  if (!isQuotativeClauseTerminalSfpToken(tokens[pos - 1]) || !isMitaiSimileHostEndToken(tokens[pos - 2])) {
    const closure = activeProtoUtteranceClosureRunAt(pos);
    const head = tokens[pos + 2];
    if (
      closure !== null &&
      closure.run === "terminal_particle_run" &&
      closure.endIdx === pos &&
      closure.terminalParticleStartIdx !== undefined &&
      closure.terminalParticleStartIdx < pos
    ) {
      const sfpStartIdx = closure.terminalParticleStartIdx;
      leadingSfpCount = pos - sfpStartIdx;
      closureKind = "terminal_particle_run";
      mood = quotativeClauseMoodForHost(tokens[closure.hostIdx]) === "imperative"
        ? "imperative"
        : Array.from({ length: leadingSfpCount }, (_, offset) => sfpStartIdx + offset)
            .some((idx) => kaMarkerRelationAt(tokens, idx) !== null) ||
          clauseContainsInterrogativeBefore(
            tokens, closure.hostIdx + 1, lookups, activeProtoLayout() ?? undefined, { scope: "clause" }
          )
          ? "interrogative"
          : "declarative";
      return quotativeMannerSimileMatchForMarker(marker, pos, mood, closureKind, leadingSfpCount);
    }
    if (
      closure === null ||
      (closure.run !== "terminal_copula_run" && closure.run !== "interrogative_noda_run" && closure.run !== "formal_noun_dependent") ||
      predicateNominalizerRelationForToken(tokens[closure.hostIdx + 1], closure.hostIdx + 1, {
        requirement: "terminal_noda_marker", consumers: ["tail_multi_clause"]
      })?.nominalizerKind !== "no" ||
      !isAdnominalCopulaToken(marker) ||
      head === undefined || !isSubstantiveNounToken(head) || !isLikenessTransparentFormalNounHead(head)
    ) return null;
    leadingSfpCount = 0;
    closureKind = "noda_formal_noun";
    mood = closure.run === "interrogative_noda_run" || clauseContainsInterrogativeBefore(
      tokens, closure.hostIdx + 1, lookups, activeProtoLayout() ?? undefined, { scope: "clause" }
    ) ? "interrogative" : "declarative";
  }
  return quotativeMannerSimileMatchForMarker(marker, pos, mood, closureKind, leadingSfpCount);
}

function quotativeMannerSimileMatchForMarker(
  marker: RuntimeHaruToken,
  pos: number,
  mood: QuotativeMood,
  closure: QuotativeMannerSimileConnectiveMatch["closure"],
  leadingSfpCount: number
): QuotativeMannerSimileConnectiveMatch | null {
  if (
    marker.surface === "な" && (marker.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return {
      connective: "predicate_projection_quotative_manner_simile_attributive",
      surface: "みたいな",
      consumed: 2,
      mood,
      closure,
      leadingSfpCount
    };
  }
  if (
    copulaNiMarkerRelationForToken(marker, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) !== null
  ) {
    return {
      connective: "predicate_projection_quotative_manner_simile",
      surface: "みたいに",
      consumed: 2,
      mood,
      closure,
      leadingSfpCount
    };
  }
  return null;
}

function volitionalMannerClassHostToken(
  tokens: readonly BoundaryToken[],
  youPos: number
): BoundaryToken | undefined {
  const previous = tokens[youPos - 1];
  if (
    previous !== undefined && (previous.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 助動詞_ダ | 連体形_)
  ) {
    return tokens[youPos - 2];
  }
  return previous;
}

function isVolitionalMannerHostToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    ((token.pos & POS0) === 動詞 || (token.pos & POS0) === 形状詞) &&
    YOU_NI_VOLITIONAL_MANNER_HOSTS.has(token.dictionaryForm || token.surface);
}

function isSimileMannerHostToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    YOU_NI_SIMILE_MANNER_HOSTS.has(token.dictionaryForm || token.surface);
}

function isSpeechMannerHostToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 動詞 &&
    YOU_NI_SPEECH_MANNER_HOSTS.has(token.dictionaryForm || token.surface);
}

function youNiQuoteMarkerFollowsDirectly(tokens: readonly BoundaryToken[], youPos: number): boolean {
  const markerIdx = youPos + 2;
  const quote = quoteMarkerRelationAt(tokens, markerIdx, { consumers: ["tail_multi_clause"] });
  return quote !== null &&
    quote.span.start === markerIdx &&
    quote.tokenCount === 1 &&
    (quote.canonicalSurface === "と" || quote.canonicalSurface === "って");
}

function directivePredicateHasRecipientSubject(
  cursor: TokenCursor<BoundaryToken>
): boolean {
  const { tokens } = cursor;
  const predicateSpan = ((tokens[cursor.pos]?.pos ?? 0) & POS0) === 動詞 ? 1 : 2;
  let idx = cursor.pos + predicateSpan;
  while (idx < cursor.end) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isRareruAuxiliaryToken(token)) {
      return true;
    }
    if (isTeConnectiveToken(token)) {
      const auxiliary = tokens[idx + 1];
      return auxiliary !== undefined &&
        teBenefactiveContinuationMetadataForToken(auxiliary)?.recipientPivot === true;
    }
    if ((token.pos & POS0) !== 助動詞0) {
      return false;
    }
    idx += 1;
  }
  return false;
}

function simileMannerYieldsToDirectiveCoordinate(
  tokens: readonly BoundaryToken[],
  youPos: number,
  cursor: TokenCursor<BoundaryToken>,
  lookups: LookupTables
): boolean {
  if (youNiQuoteMarkerFollowsDirectly(tokens, youPos)) {
    return true;
  }
  const followerCursor = cursor.fork(youPos + 2);
  const key = youZeroDirectivePredicateKey(followerCursor, lookups);
  if (key === null || !lookups.YOU_NI_MANNER_YIELD_PREDICATES.has(key)) {
    return false;
  }
  if (directivePredicateHasRecipientSubject(followerCursor)) {
    return true;
  }
  return !(
    isSpeechMannerHostToken(tokens[youPos - 1]) &&
    lookups.YOU_NI_SPEECH_MANNER_WIN_FOLLOWERS.has(key)
  );
}

function isSuruFollowerToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) return false;
  return (token.pos & POS0) === 動詞 && (token.dictionaryForm || token.surface) === "する";
}

export interface YouNiQuoteDirectiveProjectionSpan {
  readonly youIdx: number;
  readonly markerEndExclusive: number;
}

export function youNiQuoteDirectiveProjectionSpanAt(
  tokens: readonly BoundaryToken[],
  youIdx: number,
  lookups: LookupTables
): YouNiQuoteDirectiveProjectionSpan | null {
  const match = matchYouNiPredicateProjectionConnectiveAt(tokens, youIdx, { requireEnd: false, lookups });
  if (match === null || match.connective !== "predicate_projection_purpose" || match.surface !== "ように") {
    return null;
  }
  const quoteIdx = youIdx + match.consumed;
  const quote = quoteMarkerRelationAt(tokens, quoteIdx, { consumers: ["tail_multi_clause"] });
  if (
    quote === null ||
    quote.span.start !== quoteIdx ||
    quote.tokenCount !== 1 ||
    (quote.canonicalSurface !== "と" && quote.canonicalSurface !== "って")
  ) {
    return null;
  }
  return { youIdx, markerEndExclusive: quote.span.endExclusive };
}

export function youNiQuoteDirectiveFollowerAt(
  tokens: readonly BoundaryToken[],
  followerIdx: number,
  lookups: LookupTables
): boolean {
  return isYouNiQuoteDirectivePredicateStart(
    new TokenCursor(tokens, followerIdx, tokens.length),
    lookups
  );
}

function directiveFollowerVetoesVolitionalManner(
  cursor: TokenCursor<BoundaryToken>,
  lookups: LookupTables
): boolean {
  const followerCursor = cursor.fork(cursor.pos + 2);
  return isYouNiQuoteDirectivePredicateStart(followerCursor, lookups);
}

function youNiTerminalWishFollower(
  cursor: TokenCursor<BoundaryToken>
): boolean {
  while (cursor.pos < cursor.end) {
    const token = cursor.current();
    if (token === undefined) {
      cursor.advance();
      continue;
    }
    if ((token.pos & POS01) === 助詞_終助詞) {
      cursor.advance();
      continue;
    }
    if ((token.pos & POS0) !== 補助記号 && (token.pos & POS0) !== 記号) {
      return false;
    }
    cursor.advance();
    while (cursor.pos < cursor.end) {
      const trailing = cursor.current();
      if (
        trailing === undefined ||
        (trailing.pos & POS0) === 補助記号 ||
        (trailing.pos & POS0) === 記号 ||
        (trailing.pos & POS01) === 助詞_終助詞
      ) {
        cursor.advance();
        continue;
      }
      return false;
    }
    return true;
  }
  return true;
}

function isFormulaicTerminalWishYouNiHostEnd(
  tokens: readonly BoundaryToken[],
  youPos: number
): boolean {
  const previous = tokens[youPos - 1];
  if (
    previous !== undefined && (previous.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_マス)
  ) {
    return true;
  }
  const beforePrevious = tokens[youPos - 2];
  return previous !== undefined && beforePrevious !== undefined && (previous.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_ヌ) && (beforePrevious.pos & (POS0 | POS4)) === (助動詞0 | 助動詞_マス);
}

export function matchZeroNiPurposeProjectionConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number,
  options: {
    readonly requireEnd?: boolean;
    readonly allow?: boolean;
  } = {}
): YouNiPredicateProjectionConnectiveMatch | null {
  if (options.allow !== true) {
    return null;
  }
  const requireEnd = options.requireEnd ?? true;
  const previous = tokens[pos - 1];
  if (!isPredicateProjectionHostEndToken(previous) || !admitsYouZeroDirectiveHostEnd(previous)) {
    return null;
  }
  const you = tokens[pos];
  if (
    you === undefined || you.surface !== "よう" || (you.pos & POS01) !== 形状詞_助動詞語幹
  ) {
    return null;
  }
  if (requireEnd && tokens[pos + 1] !== undefined) {
    return null;
  }
  return {
    connective: "predicate_projection_purpose",
    surface: "よう",
    consumed: 1
  };
}

export function isPastAuxiliaryToken(token: BoundaryToken | undefined): boolean {
  return token !== undefined && (token.pos & POS4) === 助動詞_タ;
}

function isToIuYouNiDiscourseSequence(
  tokens: readonly BoundaryToken[],
  youIdx: number
): boolean {
  const iu = tokens[youIdx - 1];
  const marker = tokens[youIdx - 2];
  if (iu === undefined || marker === undefined) return false;
  const iuLemma = iu.dictionaryForm || iu.surface;
  const quoteMarker = quoteMarkerRelationAt(tokens, youIdx - 2, {
    consumers: ["tail_multi_clause"]
  });
  return (iu.surface === "いう" || iuLemma === "言う") &&
    (quoteMarker?.canonicalSurface === "と" || quoteMarker?.canonicalSurface === "って");
}

function isYouNiPostverbCarrierFollower(token: BoundaryToken | undefined): boolean {
  if (token === undefined) return false;
  const form = token.dictionaryForm || token.surface;
  return form === "なる" ||
    form === "なれる" ||
    form === "する" ||
    appearancePerceptionReadingForToken(token) !== null ||
    form === "よる" ||
    form === "因る";
}

type NiMatrixProjectionConnective = PredicateProjectionConnectiveMatch["connective"];

const NI_MATRIX_PROJECTION_CONNECTIVES: ReadonlySet<string> = new Set([
  "predicate_projection_parallel_change",
  "predicate_projection_occasion",
  "predicate_projection_repeated_occasion"
] as const satisfies readonly NiMatrixProjectionConnective[]);

function isNiMatrixProjectionConnective(value: string): value is NiMatrixProjectionConnective {
  return NI_MATRIX_PROJECTION_CONNECTIVES.has(value);
}

const NP_MODIFYING_PROJECTION_CONNECTIVES: ReadonlySet<string> = new Set([
  "predicate_projection_parallel_change",
  "predicate_projection_occasion",
  "predicate_projection_repeated_occasion",
  "predicate_projection_until_attributive",
  "predicate_projection_ue_de",
  "predicate_projection_ue_de_attributive"
] as const satisfies readonly PredicateProjectionConnectiveMatch["connective"][]);

export function connectiveLicensesNpModifyingContinuation(value: string): boolean {
  return NP_MODIFYING_PROJECTION_CONNECTIVES.has(value);
}

export function matchLicensesNpModifyingContinuation(match: PredicateProjectionConnectiveMatch): boolean {
  return connectiveLicensesNpModifyingContinuation(match.connective) || match.quantityBinding === "nominal";
}

const ROW_DRIVEN_PROJECTION_CONNECTIVES = [
  "predicate_projection_comparison",
  "predicate_projection_degree_extent",
  "predicate_projection_proportional_reason",
  "predicate_projection_until",
  "predicate_projection_ue_de",
  "predicate_projection_ue_de_attributive"
] as const satisfies readonly PredicateProjectionConnectiveMatch["connective"][];

function isRowDrivenProjectionConnective(
  value: string
): value is (typeof ROW_DRIVEN_PROJECTION_CONNECTIVES)[number] {
  return (ROW_DRIVEN_PROJECTION_CONNECTIVES as readonly string[]).includes(value);
}

const CASE_PARTICLE_NI_PROJECTION_CONNECTIVES = [
  "even_if"
] as const satisfies readonly PredicateProjectionConnectiveMatch["connective"][];

function isCaseParticleNiProjectionConnective(
  value: string
): value is (typeof CASE_PARTICLE_NI_PROJECTION_CONNECTIVES)[number] {
  return (CASE_PARTICLE_NI_PROJECTION_CONNECTIVES as readonly string[]).includes(value);
}

function rowDrivenProjectionConnectiveAdmitted(
  kind: (typeof ROW_DRIVEN_PROJECTION_CONNECTIVES)[number],
  tokens: readonly BoundaryToken[],
  markerIndex: number,
  followerIndex: number
): boolean {
  if (kind === "predicate_projection_ue_de") {
    return ueDeProjectionAdmitted(tokens, markerIndex, followerIndex);
  }
  if (kind === "predicate_projection_ue_de_attributive") {
    return ueDeAttributiveProjectionAdmitted(tokens, markerIndex, followerIndex);
  }
  return kind !== "predicate_projection_proportional_reason" ||
    proportionalReasonDakeNiAdmitted(tokens, followerIndex);
}

export function ueDeProjectionAdmitted(
  tokens: readonly BoundaryToken[],
  markerIndex: number,
  followerIndex: number
): boolean {
  return ueDeVerbalEventHostAdmitted(tokens, markerIndex) &&
    nominalLinkMarkerRelationAt(tokens, followerIndex, { consumers: ["tail_multi_clause"] }) === null;
}

export function ueDeAttributiveProjectionAdmitted(
  tokens: readonly BoundaryToken[],
  markerIndex: number,
  followerIndex: number
): boolean {
  return ueDeVerbalEventHostAdmitted(tokens, markerIndex) &&
    nominalLinkMarkerRelationAt(tokens, followerIndex - 1, { consumers: ["tail_multi_clause"] }) !== null;
}

function ueDeVerbalEventHostAdmitted(tokens: readonly BoundaryToken[], markerIndex: number): boolean {
  const host = tokens[markerIndex - 1];
  if (host === undefined || !isTerminalOrAttributiveInflection(host.pos)) {
    return false;
  }
  const verbalHost = isPastAuxiliaryPos(host.pos) ? tokens[markerIndex - 2] : host;
  return isUeDeVerbalChainToken(verbalHost);
}

function isUeDeVerbalChainToken(token: BoundaryToken | undefined): boolean {
  if (token === undefined) return false;
  return isVerbalEventEndToken(token) ||
    isPoliteAuxiliaryPos(token.pos) ||
    collapsedAspectAuxKind(token) !== null;
}

function isVerbalEventEndToken(token: BoundaryToken): boolean {
  return isVerbPredicateToken(token) ||
    isVoiceOrCausativeAuxiliaryToken({ pos: token.pos, dictionaryForm: token.dictionaryForm ?? token.surface });
}

export function proportionalReasonDakeNiAdmitted(
  tokens: readonly BoundaryToken[],
  followerIndex: number
): boolean {
  const follower = tokens[followerIndex];
  return follower === undefined || isBoundaryPunctuationToken(follower);
}

interface NiMatrixAttachmentSpec {
  readonly connective: NiMatrixProjectionConnective;
  readonly te: TailAttachmentTePolicy;
}

let cachedNiMatrixSpecsGeneration = -1;
let cachedNiMatrixSpecsByLemma: ReadonlyMap<string, NiMatrixAttachmentSpec> | null = null;

function niMatrixAttachmentSpecs(): ReadonlyMap<string, NiMatrixAttachmentSpec> {
  const generation = nominalFrameDataGeneration();
  if (cachedNiMatrixSpecsByLemma !== null && cachedNiMatrixSpecsGeneration === generation) {
    return cachedNiMatrixSpecsByLemma;
  }
  const byLemma = new Map<string, NiMatrixAttachmentSpec>();
  for (const entry of loadTailAttachmentRegistry()) {
    const predicate = entry.attach.hostRealizations.predicate;
    if (predicate?.kind !== "predicate_projection" || predicate.coercion !== "none") {
      continue;
    }
    const match = predicate.match;
    if (match?.particle !== "に" || match.verbLemmas === undefined) {
      continue;
    }
    if (!isNiMatrixProjectionConnective(predicate.connective)) {
      throw new Error(`unsupported attach connective '${predicate.connective}' for '${entry.id}'`);
    }
    const te = match.te ?? "optional";
    for (const lemma of match.verbLemmas) {
      const existing = byLemma.get(lemma);
      if (existing !== undefined && (existing.connective !== predicate.connective || existing.te !== te)) {
        throw new Error(`conflicting attach declarations for matrix lemma '${lemma}' ('${entry.id}')`);
      }
      byLemma.set(lemma, { connective: predicate.connective, te });
    }
  }
  cachedNiMatrixSpecsByLemma = byLemma;
  cachedNiMatrixSpecsGeneration = generation;
  return byLemma;
}

export function matchPredicateProjectionConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number,
  options: {
    readonly requireEnd?: boolean;
    readonly allowNoQuoteReportingProjection?: boolean;
    readonly lookups: LookupTables;
    readonly quoteAttributiveHeadFrame?: QuoteAttributiveHeadFrame;
    readonly purposeMotionReachEnd?: number;
    readonly purposeMotionClosureAfterMarker?: (markerPos: number) => UtteranceClosureKind;
    readonly quantityExtentLayout?: QuantityExtentLayout | null;
  }
): PredicateProjectionConnectiveMatch | null {
  const requireEnd = options.requireEnd ?? true;
  const previous = tokens[pos - 1];
  if (!isPredicateProjectionHostEndToken(previous)) return null;
  const endOk = (consumed: number): boolean => !requireEnd || tokens[pos + consumed] === undefined;
  const t0 = tokens[pos];
  if (t0 === undefined) return null;
  const t1 = tokens[pos + 1];
  const t2 = tokens[pos + 2];
  const t1NominalLink = nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] }) !== null;

  const c: ProjectionConnectiveMatchContext = { tokens, pos, options, previous, endOk, t0, t1, t2, t1NominalLink };
  const noQuoteReportingProjectionArmMatch = matchNoQuoteReportingProjectionArm(c);
  if (noQuoteReportingProjectionArmMatch !== NO_PROJECTION_ARM) {
    return noQuoteReportingProjectionArmMatch;
  }
  const niSeriesMergedConcessiveConditionalMatch = matchNiSeriesMergedConcessiveConditional(c);
  if (niSeriesMergedConcessiveConditionalMatch !== NO_PROJECTION_ARM) {
    return niSeriesMergedConcessiveConditionalMatch;
  }
  const caseParticleNiClauseConnectiveMatch = matchCaseParticleNiClauseConnective(c);
  if (caseParticleNiClauseConnectiveMatch !== NO_PROJECTION_ARM) {
    return caseParticleNiClauseConnectiveMatch;
  }
  const additiveUeNiMatch = matchAdditiveUeNi(c);
  if (additiveUeNiMatch !== NO_PROJECTION_ARM) {
    return additiveUeNiMatch;
  }
  const gateraProjectionMatch = matchGateraProjection(c);
  if (gateraProjectionMatch !== NO_PROJECTION_ARM) {
    return gateraProjectionMatch;
  }
  const quoteMarkerProjectionMatch = matchQuoteMarkerProjection(c);
  if (quoteMarkerProjectionMatch !== NO_PROJECTION_ARM) {
    return quoteMarkerProjectionMatch;
  }
  const purposeBekuProjectionMatch = matchPurposeBekuProjection(c);
  if (purposeBekuProjectionMatch !== NO_PROJECTION_ARM) {
    return purposeBekuProjectionMatch;
  }
  const asFarAsKagiriProjectionMatch = matchAsFarAsKagiriProjection(c);
  if (asFarAsKagiriProjectionMatch !== NO_PROJECTION_ARM) {
    return asFarAsKagiriProjectionMatch;
  }


  const niwaProjectionMatch = matchNiwaProjection(c);
  if (niwaProjectionMatch !== NO_PROJECTION_ARM) {
    return niwaProjectionMatch;
  }
  const rowDrivenProjectionPatternMatch = matchRowDrivenProjectionPattern(c);
  if (rowDrivenProjectionPatternMatch !== NO_PROJECTION_ARM) {
    return rowDrivenProjectionPatternMatch;
  }
  const quantityExtentProjectionMatch = matchQuantityExtentProjection(c);
  if (quantityExtentProjectionMatch !== NO_PROJECTION_ARM) {
    return quantityExtentProjectionMatch;
  }
  const degreeExtentProjectionMatch = matchDegreeExtentProjection(c);
  if (degreeExtentProjectionMatch !== NO_PROJECTION_ARM) {
    return degreeExtentProjectionMatch;
  }
  const untilMadeProjectionMatch = matchUntilMadeProjection(c);
  if (untilMadeProjectionMatch !== NO_PROJECTION_ARM) {
    return untilMadeProjectionMatch;
  }
  const comparisonYoriProjectionMatch = matchComparisonYoriProjection(c);
  if (comparisonYoriProjectionMatch !== NO_PROJECTION_ARM) {
    return comparisonYoriProjectionMatch;
  }
  const niMatrixAttachmentProjectionMatch = matchNiMatrixAttachmentProjection(c);
  if (niMatrixAttachmentProjectionMatch !== NO_PROJECTION_ARM) {
    return niMatrixAttachmentProjectionMatch;
  }
  const niComplementProjectionMatch = matchNiComplementProjection(c);
  if (niComplementProjectionMatch !== NO_PROJECTION_ARM) {
    return niComplementProjectionMatch;
  }
  const purposeMotionProjectionMatch = matchPurposeMotionProjection(c);
  if (purposeMotionProjectionMatch !== NO_PROJECTION_ARM) {
    return purposeMotionProjectionMatch;
  }
  return null;
}

interface ProjectionConnectiveMatchContext {
  readonly tokens: readonly BoundaryToken[];
  readonly pos: number;
  readonly options: Parameters<typeof matchPredicateProjectionConnectiveAt>[2];
  readonly previous: BoundaryToken | undefined;
  readonly endOk: (consumed: number) => boolean;
  readonly t0: BoundaryToken;
  readonly t1: BoundaryToken | undefined;
  readonly t2: BoundaryToken | undefined;
  readonly t1NominalLink: boolean;
}

const NO_PROJECTION_ARM: unique symbol = Symbol("predicate projection connective: arm not applicable");

function matchNoQuoteReportingProjectionArm(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, options, endOk } = c;
  const noQuoteReporting = matchNoQuoteReportingProjectionConnectiveAt(tokens, pos, {
    allow: options.allowNoQuoteReportingProjection === true,
    lookups: options.lookups
  });
  if (noQuoteReporting !== null && endOk(noQuoteReporting.consumed)) {
    return noQuoteReporting;
  }
  return NO_PROJECTION_ARM;
}

function matchNiSeriesMergedConcessiveConditional(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { options, endOk, t0 } = c;
  if (
    isCaseParticleToken(t0) &&
    isNiSeriesConcessiveConditionalSurface(t0.surface, options.lookups) &&
    endOk(1)
  ) {
    const mergedKind = lookupConnectiveBySurface(t0.surface);
    if (mergedKind !== undefined && isCaseParticleNiProjectionConnective(mergedKind)) {
      return { connective: mergedKind, surface: t0.surface, consumed: 1 };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchCaseParticleNiClauseConnective(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, endOk } = c;
  const caseParticleNiConnective = caseParticleNiClauseConnectiveRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (caseParticleNiConnective !== null) {
    const consumed = caseParticleNiConnective.span.endExclusive - pos;
    if (isCaseParticleNiProjectionConnective(caseParticleNiConnective.connectiveKind) && endOk(consumed)) {
      return {
        connective: caseParticleNiConnective.connectiveKind,
        surface: caseParticleNiConnective.surface,
        consumed
      };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchAdditiveUeNi(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { pos, endOk, t0, t1 } = c;
  if (isPredicateProjectionUeNiHead(t0)) {
    const ni = caseParticleMarkerRelationForToken(t1, pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    });
    if (ni !== null && endOk(2)) {
      return {
        connective: "predicate_projection_additive_ue_ni",
        surface: `${t0.surface}${t1?.surface ?? ""}`,
        consumed: 2
      };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchGateraProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { previous, endOk, t0 } = c;
  if (
    t0.surface === "がてら" &&
    (t0.pos & POS0) === 接尾辞 &&
    previous !== undefined &&
    (previous.pos & (POS0 | POS5A)) === (動詞 | 連用形_) &&
    endOk(1)
  ) {
    return { connective: "predicate_projection_gatera", surface: "がてら", consumed: 1 };
  }
  return NO_PROJECTION_ARM;
}

function matchQuoteMarkerProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, options, endOk } = c;
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface === "と") {
    const afterMarker = quoteMarker.span.endExclusive;
    const nominalLink = nominalLinkMarkerRelationAt(tokens, afterMarker, {
      consumers: ["tail_multi_clause"]
    });
    if (nominalLink !== null) {
      const consumed = nominalLink.span.endExclusive - pos;
      if (endOk(consumed)) {
        return {
          connective: "predicate_projection_quote_attributive",
          surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
          consumed,
          ...(options.quoteAttributiveHeadFrame === undefined
            ? {}
            : { quoteAttributiveFlavor: options.quoteAttributiveHeadFrame.flavor })
        };
      }
    }
    const simultaneousHead = tokens[afterMarker];
    const simultaneousNi = tokens[afterMarker + 1];
    if (
      simultaneousHead !== undefined &&
      (simultaneousHead.pos & POS0) === 名詞 &&
      (simultaneousHead.dictionaryForm || simultaneousHead.surface) === "同時" &&
      caseParticleMarkerRelationForToken(simultaneousNi, afterMarker + 1, {
        acceptedSurfaces: ["に"],
        consumers: ["tail_multi_clause"]
      }) !== null
    ) {
      const consumed = afterMarker + 2 - pos;
      if (endOk(consumed)) {
        return {
          connective: "predicate_projection_simultaneous_time",
          surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
          consumed
        };
      }
    }
  }
  return NO_PROJECTION_ARM;
}

function matchPurposeBekuProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { endOk, t0 } = c;
  if (
    t0.surface === "べく" && (t0.pos & (POS0 | POS4 | POS5A)) === (助動詞0 | 文語助動詞_ベシ | 連用形_) && endOk(1)
  ) {
    return { connective: "predicate_projection_purpose_beku", surface: "べく", consumed: 1 };
  }
  return NO_PROJECTION_ARM;
}

function matchAsFarAsKagiriProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, endOk, t0, t1 } = c;
  if (
    t0.surface === "限り" &&
    (t0.pos & POS0) === 名詞 &&
    (t0.dictionaryForm === "限り" || t0.dictionaryForm === undefined) &&
    isAdverbCapableNominal(t0)
  ) {
    const de = caseParticleMarkerRelationForToken(t1, pos + 1, {
      acceptedSurfaces: ["で"],
      consumers: ["tail_multi_clause"]
    });
    const wa = tokens[pos + 2];
    if (
      de !== null && wa?.surface === "は" && (wa.pos & POS01) === 助詞_係助詞 && endOk(3)
    ) {
      return { connective: "predicate_projection_as_far_as", surface: "限りでは", consumed: 3 };
    }
    if (endOk(1)) {
      return { connective: "predicate_projection_as_far_as", surface: "限り", consumed: 1 };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchNiwaProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, previous, endOk, t0, t1 } = c;
  if (
    previous !== undefined &&
    (previous.pos & POS0) === 動詞 &&
    ((previous.pos & POS5A) === 終止形_ || (previous.pos & POS5A) === 連体形_) &&
    caseParticleMarkerRelationForToken(t0, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    t1?.surface === "は" &&
    (t1.pos & POS01) === 助詞_係助詞 &&
    endOk(2)
  ) {
    const follower = tokens[pos + 2];
    const isConcessiveEcho =
      follower !== undefined &&
      (follower.pos & POS0) === 動詞 &&
      tokensShareLemma(follower, previous);
    if (isConcessiveEcho) {
      return { connective: "predicate_projection_concession_echo", surface: "には", consumed: 2 };
    }
    return { connective: "predicate_projection_intentional_purpose", surface: "には", consumed: 2 };
  }
  return NO_PROJECTION_ARM;
}

function matchRowDrivenProjectionPattern(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, endOk } = c;
  const rowPattern = compositeConnectivePatternRelationAt(new TokenCursor(tokens, pos), {
    consumers: ["tail_multi_clause"],
    lookupConnectiveKind: lookupConnectiveBySurface
  });
  if (rowPattern !== null && endOk(rowPattern.tokenCount)) {
    const rowKind = lookupConnectiveBySurface(rowPattern.surface);
    if (
      rowKind !== undefined &&
      isRowDrivenProjectionConnective(rowKind) &&
      rowDrivenProjectionConnectiveAdmitted(rowKind, tokens, pos, pos + rowPattern.tokenCount)
    ) {
      return {
        connective: rowKind,
        surface: rowPattern.surface,
        consumed: rowPattern.tokenCount
      };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchQuantityExtentProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, options, endOk } = c;
  const quantity = matchQuantityExtentDakeAt(
    tokens as readonly RuntimeHaruToken[],
    pos,
    options.lookups,
    options.quantityExtentLayout
  );
  if (quantity !== null && endOk(quantity.consumed)) {
    return {
      connective: "predicate_projection_quantity_extent",
      surface: quantity.surface,
      consumed: quantity.consumed,
      quantityBinding: quantity.binding
    };
  }
  return NO_PROJECTION_ARM;
}

function matchDegreeExtentProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { endOk, t0, t1, t1NominalLink } = c;
  if (
    isDegreeExtentParticle(t0) && t1NominalLink && endOk(2)
  ) {
    return { connective: "predicate_projection_degree_extent", surface: `${t0.surface}${t1?.surface ?? ""}`, consumed: 2 };
  }
  if (
    isDegreeExtentParticle(t0) && endOk(1)
  ) {
    return { connective: "predicate_projection_degree_extent", surface: t0.surface, consumed: 1 };
  }
  return NO_PROJECTION_ARM;
}

function matchUntilMadeProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { pos, endOk, t0, t1, t1NominalLink } = c;
  if (t0.surface === "まで" && (t0.pos & POS01) === 助詞_副助詞) {
    const t1Ni = caseParticleMarkerRelationForToken(t1, pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null;
    if (t1Ni && endOk(2)) {
      return { connective: "predicate_projection_until", surface: "までに", consumed: 2 };
    }
    if (t1NominalLink && endOk(2)) {
      return { connective: "predicate_projection_until_attributive", surface: "までの", consumed: 2 };
    }
    if (!t1Ni && t1?.surface !== "も" && !t1NominalLink && endOk(1)) {
      return { connective: "predicate_projection_until", surface: "まで", consumed: 1 };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchComparisonYoriProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { pos, endOk, t0 } = c;
  if (caseParticleMarkerRelationForToken(t0, pos, {
    acceptedSurfaces: ["より"],
    consumers: ["tail_multi_clause"]
  }) !== null && endOk(1)) {
    return { connective: "predicate_projection_comparison", surface: "より", consumed: 1 };
  }
  return NO_PROJECTION_ARM;
}

function matchNiMatrixAttachmentProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { pos, endOk, t0, t1, t2 } = c;
  if (caseParticleMarkerRelationForToken(t0, pos, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) !== null && t1 !== undefined) {
    const matrixSpec = t1.dictionaryForm === undefined
      ? undefined
      : niMatrixAttachmentSpecs().get(t1.dictionaryForm);
    if (matrixSpec !== undefined && (t1.pos & POS5A) === 連用形_) {
      if (matrixSpec.te !== "forbidden" && isTeSurfaceConnectiveToken(t2) && endOk(3)) {
        return {
          connective: matrixSpec.connective,
          surface: `${t0.surface}${t1.surface}${t2.surface}`,
          consumed: 3
        };
      }
      const claimsBare = matrixSpec.te === "optional" ||
        (matrixSpec.te === "forbidden" && !isTeSurfaceConnectiveToken(t2));
      if (claimsBare && endOk(2)) {
        return {
          connective: matrixSpec.connective,
          surface: `${t0.surface}${t1.surface}`,
          consumed: 2
        };
      }
    }
  }
  return NO_PROJECTION_ARM;
}

function matchNiComplementProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { pos, previous, endOk, t0, t1, t2 } = c;
  if (
    previous !== undefined &&
    (previous.pos & POS0) === 動詞 &&
    ((previous.pos & POS5A) === 終止形_ || (previous.pos & POS5A) === 連体形_) &&
    caseParticleMarkerRelationForToken(t0, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    endOk(1)
  ) {
    const matrixLemma = niComplementMatrixLemma(t1, t2);
    if (matrixLemma !== undefined && !NI_COMPLEMENT_SKIP_MATRICES.has(matrixLemma)) {
      const niComplementKind = NI_COMPLEMENT_OUTCOME_MATRICES.has(matrixLemma)
        ? "predicate_projection_ni_complement_outcome"
        : NI_COMPLEMENT_M_EXTENT_MATRICES.has(matrixLemma)
          ? "predicate_projection_ni_complement_m"
          : (NI_COMPLEMENT_CANNOT_BEAR_MATRICES.has(matrixLemma) && t1 !== undefined && (t1.pos & POS0) === 形容詞0)
            ? "predicate_projection_ni_complement_cannot_bear"
            : (NI_COMPLEMENT_WORTH_MATRICES.has(matrixLemma) && t1 !== undefined && (t1.pos & POS0) === 形容詞0)
              ? "predicate_projection_ni_complement_worth"
              : "predicate_projection_ni_complement";
      return { connective: niComplementKind, surface: t0.surface, consumed: 1 };
    }
  }
  return NO_PROJECTION_ARM;
}

function matchPurposeMotionProjection(c: ProjectionConnectiveMatchContext): PredicateProjectionConnectiveMatch | typeof NO_PROJECTION_ARM {
  const { tokens, pos, options, previous, endOk, t0 } = c;
  if (
    previous !== undefined &&
    isVerbalEventEndToken(previous) &&
    isGeneralRenyouInflectedToken(previous) &&
    caseParticleMarkerRelationForToken(t0, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    endOk(1) &&
    (
      (
        options.purposeMotionReachEnd !== undefined &&
        purposeMotionPredicateFollows(tokens, previous, pos + 1, options.purposeMotionReachEnd, options.lookups)
      ) ||
      (
        options.purposeMotionClosureAfterMarker !== undefined &&
        PURPOSE_MOTION_ELLIPSIS_CLOSURES.has(options.purposeMotionClosureAfterMarker(pos))
      )
    )
  ) {
    return { connective: "purpose_motion", surface: t0.surface, consumed: 1 };
  }
  return NO_PROJECTION_ARM;
}

const PURPOSE_MOTION_ELLIPSIS_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal"
]);

function purposeMotionPredicateFollows(
  tokens: readonly BoundaryToken[],
  host: BoundaryToken,
  start: number,
  reachEnd: number,
  lookups: LookupTables
): boolean {
  if (tokens[start] === undefined || start >= reachEnd) {
    return false;
  }
  const motionVerbs = lookups.PURPOSE_MOTION_VERBS;
  return matrixPredicateReachAt(tokens as readonly RuntimeHaruToken[], start, Math.min(reachEnd, tokens.length), {
    registeredPredicateStart: (candidates, idx) => {
      const token = candidates[idx];
      return token !== undefined &&
        isVerbPredicateToken(token) &&
        motionVerbs.has(token.dictionaryForm || token.surface) &&
        !tokensShareLemma(token, host);
    },
    openPredicateStart: () => false
  }) === "predicate";
}

function niComplementMatrixLemma(
  t1: BoundaryToken | undefined,
  t2: BoundaryToken | undefined
): string | undefined {
  if (t1 === undefined) return undefined;
  if ((t1.pos & POS0) === 動詞 || (t1.pos & POS0) === 形容詞0) return t1.dictionaryForm;
  if (
    (t1.pos & POS0) === 名詞 &&
    t2 !== undefined &&
    (t2.pos & POS0) === 動詞 &&
    t2.dictionaryForm === "する"
  ) {
    return `${t1.dictionaryForm ?? t1.surface}する`;
  }
  return undefined;
}

function matchNoQuoteReportingProjectionConnectiveAt(
  tokens: readonly BoundaryToken[],
  pos: number,
  options: { readonly allow: boolean; readonly lookups: LookupTables }
): PredicateProjectionConnectiveMatch | null {
  if (!options.allow) {
    return null;
  }
  const host = tokens[pos - 1];
  if (!isNoQuoteReportingProjectionHost(host, options.lookups)) {
    return null;
  }
  const direct = noQuoteReportingNiWaConsumed(tokens, pos);
  if (direct !== null) {
    return {
      connective: "predicate_projection_no_quote_reporting",
      surface: tokens.slice(pos, pos + direct).map((token) => token.surface).join(""),
      consumed: direct
    };
  }
  const koto = tokens[pos];
  if (
    koto === undefined ||
    (koto.pos & POS0) !== 名詞 ||
    (koto.dictionaryForm !== "こと" && koto.dictionaryForm !== "事")
  ) {
    return null;
  }
  const kotoNiWa = noQuoteReportingNiWaConsumed(tokens, pos + 1);
  if (kotoNiWa === null) {
    return null;
  }
  const consumed = 1 + kotoNiWa;
  return {
    connective: "predicate_projection_no_quote_reporting",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

function isNoQuoteReportingProjectionHost(token: BoundaryToken | undefined, lookups: LookupTables): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return lookups.QUOTE_HOST_REGISTRY.hasCapability("direct", form, "no_quote_reporting");
}

function noQuoteReportingNiWaConsumed(tokens: readonly BoundaryToken[], start: number): number | null {
  const ni = tokens[start];
  const wa = tokens[start + 1];
  if (
    ni === undefined ||
    wa === undefined ||
    caseParticleMarkerRelationForToken(ni, start, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    wa.surface !== "は" ||
    (wa.pos & POS0) !== 助詞
  ) {
    return null;
  }
  return 2;
}

function isPredicateProjectionUeNiHead(token: BoundaryToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form === "うえ" || form === "上";
}

