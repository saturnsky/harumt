import { bareAdverbialKeijoujiHostAt, isAdverbialKeijoujiMarkerHostPos } from "./adverbial-host.js";
import { adjectivalConcessiveTomoRelationAt, copulaElidedNegativeBodyRelationAt, kaMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { tailRootCarriesPropositionModal, tailRootClosesWithAttributiveTerminal } from "../head-tail/tail/predicate-root/inspect.js";
import { derivationalSuffixProfileById } from "../head-tail/tail/predicate-root/derivational-suffix-table.js";
import { tailRootHasAdverbialModifierTerminal } from "../head-tail/tail/predicate-root/fragment-recovery.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { isTariListingParticleToken } from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { matchNegationEnding } from "../head-tail/tail/predicate-root/matchers/negation-ending.js";
import { methodYouGaNaiIdiomShapeAt } from "../head-tail/tail/predicate-root/matchers/method-you-idiom.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./trivia.js";
import { POS0, POS01, POS4, POS5A, POS5B, isNaAdjCapable, 形状詞, 形容詞0, 助動詞, 助動詞_ダ, 助動詞_デス, 接頭辞, 接尾辞, 非自立可能, 動詞, 名詞, 連用形_, 連用形_ニ, 連用形_融合, 助詞_格助詞, 助詞_係助詞, 動詞_非自立可能, 形状詞_助動詞語幹 } from "../../types/pos.js";
import { tailRootIsNeutralStandaloneCopulaNiAdverbialFragment } from "../head-tail/tail/predicate-root/inspect.js";
import { tailRootHostLayerGovernsCopulaNiComplement } from "../head-tail/tail/predicate-root/postverb-host-attachment.js";
import type { TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import type { ClauseToken } from "./layout-types.js";
import type { ProtoClauseLayout } from "./proto-layout.js";
import { sourceSahenPotentialDifficultyPredicateAt, sourceTokenIsTeDeRequestTail, sourceNegativeAdjectiveIsCopulaTail, naAttributivePredicateAt, nominalZeroCopulaPredicateAt, isVerbalizedSahenPredicate, isPastTaToken, isCopulaPredicateClose } from "./predicate-token-shape.js";

export interface PredicateLike {
  koreanPos?: number;
  unitType?: string;
  consumed?: number;
  particleRole?: string | null;
  renderPlan?: {
    readonly kind?: string;
    readonly adverbial?: string;
    readonly clauseRole?: object;
    readonly realization?: {
      readonly kind?: string;
      readonly root?: unknown;
      readonly hostProjection?: { readonly kind?: string };
    };
  } | null;
  benefactive?: {
    readonly recipientParticleIdx?: number | null;
    readonly recipient_particle_idx?: number | null;
  } | null;
  entry?: {
    readonly senses?: readonly {
      readonly koreanPos?: number;
    }[];
  } | null;
  candidates?: readonly {
    readonly koreanPos?: number;
  }[];
}

export function sourceContextMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  options: { readonly limit?: number } = {}
): boolean {
  if (span.renderPlan?.adverbial !== undefined && span.renderPlan.adverbial !== null) {
    return false;
  }
  const plan = span.renderPlan;
  if (plan?.kind === "headTailChain" && plan.realization?.kind === "nominal") {
    const root = plan.realization.root;
    if (
      typeof root === "object" && root !== null &&
      (root as { readonly kind?: unknown }).kind === "renyouNominalHead" &&
      !renyouNominalHeadKeepsVerbalValency(root as { readonly evidence?: { readonly kind?: unknown; readonly profileId?: unknown } })
    ) {
      return false;
    }
  }
  if (plan?.kind === "headTailChain" && plan.realization?.kind === "nominal" && plan.clauseRole !== undefined) {
    const root = plan.realization.root;
    if (typeof root === "object" && root !== null && (root as { readonly kind?: unknown }).kind === "hostBearingLikeness") {
      return true;
    }
  }
  const clausePredicateRoot = clausePredicateChainRoot(span);
  if (
    clausePredicateRoot !== null &&
    (span.renderPlan?.realization?.hostProjection?.kind === "numeral" ||
      modalPredicateNucleusChain(clausePredicateRoot))
  ) {
    return true;
  }
  const limit = options.limit ?? tokens.length;
  if (methodYouIdiomRecoveredNominalHostPredicate(tokens, idx, span, limit)) {
    return true;
  }
  return sourceTokenMayBePredicateAt(tokens, sourcePredicateAnchorIndexForSpan(tokens, idx, span, limit), limit);
}

function renyouNominalHeadKeepsVerbalValency(
  root: { readonly evidence?: { readonly kind?: unknown; readonly profileId?: unknown } }
): boolean {
  const evidence = root.evidence;
  return evidence?.kind === "derivational_suffix" &&
    typeof evidence.profileId === "string" &&
    derivationalSuffixProfileById(evidence.profileId)?.sourceVerbalValency === true;
}

function clausePredicateChainRoot(span: PredicateLike): TailRoot | null {
  const plan = span.renderPlan;
  if (
    plan?.kind !== "headTailChain" ||
    plan.realization?.kind !== "predicate" ||
    plan.clauseRole === undefined
  ) {
    return null;
  }
  const root = plan.realization.root;
  if (typeof root !== "object" || root === null) {
    return null;
  }
  return tailRootClosesWithAttributiveTerminal(root as TailRoot) ? null : root as TailRoot;
}

function modalPredicateNucleusChain(root: TailRoot): boolean {
  return tailRootCarriesPropositionModal(root) && !tailRootHasAdverbialModifierTerminal(root);
}

function sourcePredicateAnchorIndexForSpan(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  limit: number
): number {
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 接頭辞) {
    return idx;
  }
  const consumedLimit = Math.min(limit, idx + Math.max(1, span.consumed ?? 2));
  const localHead = nextNonSpaceIndex(tokens, idx + 1, consumedLimit);
  if (localHead !== null) {
    return localHead;
  }
  const followingHead = nextNonSpaceIndex(tokens, idx + 1, limit);
  return followingHead ?? idx;
}

export function sourceTokenMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || idx >= limit) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    const previous = previousNonSpaceIndex(tokens, idx);
    if (
      previous !== null &&
      sourceSahenPotentialDifficultyPredicateAt(tokens, previous, limit)
    ) {
      return false;
    }
    if (sourceTokenIsTeDeRequestTail(tokens, idx)) {
      return false;
    }
    return true;
  }
  if (pos0 === 形容詞0) {
    return sourceAdjectiveTokenMayBePredicateAt(tokens, idx, limit);
  }
  if (pos0 === 名詞 || pos0 === 形状詞) {
    return isVerbalizedSahenPredicate(tokens, idx) ||
      sourceSahenPotentialDifficultyPredicateAt(tokens, idx, limit) ||
      nominalCopulaPredicateAt(tokens, idx, limit) ||
      naAttributivePredicateAt(tokens, idx, limit) ||
      nominalEmbeddedQuestionPredicateAt(tokens, idx, limit) ||
      nominalZeroCopulaPredicateAt(tokens, idx, limit);
  }
  return false;
}

function methodYouIdiomRecoveredNominalHostPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  span: PredicateLike,
  limit: number
): boolean {
  if (span.renderPlan?.kind !== "headTailChain") {
    return false;
  }
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 名詞) {
    return false;
  }
  const youIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  return youIdx !== null &&
    methodYouGaNaiIdiomShapeAt(tokens as readonly RuntimeHaruToken[], youIdx) !== null;
}

function sourceAdjectiveTokenMayBePredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || (token.pos & POS0) !== 形容詞0) {
    return false;
  }
  const isNonJiritsu = (token.pos & POS01) === (形容詞0 | 非自立可能);
  const isNegationNai = isNonJiritsu &&
    (token.dictionaryForm === "ない" || token.dictionaryForm === "無い");
  if (isNegationNai) {
    if (sourceNegativeAdjectiveIsCopulaTail(tokens, idx)) return false;
    return true;
  }
  if ((token.pos & POS5A) !== 連用形_) {
    return true;
  }
  return adjectiveRenyouFollowerEstablishesPredicateAt(tokens, idx, limit, isNonJiritsu);
}

export function adjectiveRenyouFollowerEstablishesPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number,
  isNonJiritsu: boolean
): boolean {
  const nextIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (isPastTaToken(next) || isTeConnectiveToken(next)) {
    return true;
  }
  if (
    nextIdx !== null &&
    adjectivalConcessiveTomoRelationAt(tokens, nextIdx, { consumers: ["clause_layout"] }) !== null
  ) {
    return true;
  }
  if (isTariListingParticleToken(next)) {
    return true;
  }
  if (sourceAdjectiveRenyouArimasenPredicateAt(tokens, idx, limit)) {
    return true;
  }
  if (
    !isDependentAdjectiveOnTeHost(tokens, idx, isNonJiritsu) &&
    next !== undefined &&
    (next.pos & POS01) === (形容詞0 | 非自立可能) &&
    (next.dictionaryForm === "ない" || next.dictionaryForm === "無い")
  ) {
    return true;
  }
  return next !== undefined &&
    (next.pos & POS0) === 動詞 &&
    (next.dictionaryForm === "なる" ||
      next.dictionaryForm === "なれる" ||
      next.dictionaryForm === "成る" ||
      next.dictionaryForm === "する");
}

function isDependentAdjectiveOnTeHost(
  tokens: readonly ClauseToken[],
  idx: number,
  isNonJiritsu: boolean
): boolean {
  if (!isNonJiritsu) {
    return false;
  }
  const hostIdx = previousNonSpaceIndex(tokens, idx);
  return hostIdx !== null && isTeConnectiveToken(tokens[hostIdx]);
}

function sourceAdjectiveRenyouArimasenPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const aruIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  const aru = aruIdx === null ? undefined : tokens[aruIdx];
  if (
    aruIdx === null ||
    aru === undefined ||
    (aru.pos & POS01) !== 動詞_非自立可能 ||
    (aru.dictionaryForm !== "ある" && aru.dictionaryForm !== "有る")
  ) {
    return false;
  }
  const match = matchNegationEnding(tokens as readonly RuntimeHaruToken[], aruIdx);
  return match !== null && aruIdx + match.consumed <= limit;
}

function nominalEmbeddedQuestionPredicateAt(
  tokens: readonly ClauseToken[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined || !isNaAdjCapable(token)) {
    return false;
  }
  const kaIdx = nextNonSpaceIndex(tokens, idx + 1, limit);
  if (kaIdx === null) {
    return false;
  }
  const ka = tokens[kaIdx];
  if (kaMarkerRelationForToken(ka, kaIdx, ["clause_layout"]) === null) {
    return false;
  }
  return nextNonSpaceIndex(tokens, kaIdx + 1, limit) === null;
}

export function adverbialKeijoujiModifiedPredicate(
  tokens: readonly ClauseToken[],
  idx: number,
  proto: ProtoClauseLayout,
  clauseIndex: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables,
  allowCrossClause: boolean
): number | null {
  const protoClause = proto.protoClauses[clauseIndex];
  if (protoClause === undefined) {
    return null;
  }
  const token = tokens[idx];
  if (token === undefined) {
    return null;
  }
  let hostEndIdx: number;
  if (bareAdverbialKeijoujiHostAt(tokens, idx, lookups.ADVERBIAL_MODIFIER_BARE_KEIJOUJI_HOSTS)) {
    hostEndIdx = idx;
  } else {
    const auxIdx = nextNonSpaceIndex(tokens, idx + 1);
    if (auxIdx === null) {
      return null;
    }
    const aux = tokens[auxIdx];
    if (
      !isAdverbialKeijoujiMarkerHostPos(token) || aux === undefined || (aux.pos & (POS0 | POS5A)) !== (助動詞 | 連用形_) || aux.dictionaryForm !== "だ" || aux.surface !== "に"
    ) {
      return null;
    }
    hostEndIdx = auxIdx;
  }
  const adverbialSpan = contentEntries.find(([candidateIdx]) => candidateIdx === idx)?.[1];
  if (
    adverbialSpan !== undefined &&
    (predicateLikeHasStandaloneCopulaNiTerminalSfp(adverbialSpan) ||
      predicateChainGovernsHostMarker(adverbialSpan))
  ) {
    return null;
  }
  const inClausePredicate = contentEntries.find(([candidateIdx, span]) =>
    candidateIdx > hostEndIdx &&
    candidateIdx < protoClause.end &&
    (sourceContextMayBePredicateAt(tokens, candidateIdx, span, { limit: protoClause.end }) ||
      isVerbalizedSahenPredicate(tokens, candidateIdx) ||
      nominalCopulaPredicateAt(tokens, candidateIdx, protoClause.end))
  );
  if (inClausePredicate !== undefined) {
    return inClausePredicate[0];
  }
  if (!allowCrossClause || protoClause.terminatedBy !== "punctuation") {
    return null;
  }
  for (
    let cursor = nextNonSpaceIndex(tokens, hostEndIdx + 1, protoClause.end);
    cursor !== null;
    cursor = nextNonSpaceIndex(tokens, cursor + 1, protoClause.end)
  ) {
    const between = tokens[cursor];
    if (between === undefined) {
      break;
    }
    if ((between.pos & POS01) === 形状詞_助動詞語幹) {
      return null;
    }
  }
  const nextClause = proto.protoClauses[clauseIndex + 1];
  if (nextClause === undefined) {
    return null;
  }
  const crossClausePredicate = contentEntries.find(([candidateIdx, span]) =>
    candidateIdx >= nextClause.start &&
    candidateIdx < nextClause.end &&
    (sourceContextMayBePredicateAt(tokens, candidateIdx, span, { limit: nextClause.end }) ||
      isVerbalizedSahenPredicate(tokens, candidateIdx) ||
      nominalCopulaPredicateAt(tokens, candidateIdx, nextClause.end))
  );
  return crossClausePredicate?.[0] ?? null;
}

function predicateChainGovernsHostMarker(span: PredicateLike): boolean {
  const plan = span.renderPlan;
  if (plan?.kind !== "headTailChain" || plan.realization?.kind !== "predicate") {
    return false;
  }
  const root = plan.realization.root;
  return typeof root === "object" && root !== null &&
    !tailRootHasAdverbialModifierTerminal(root as TailRoot) &&
    tailRootHostLayerGovernsCopulaNiComplement(root as TailRoot);
}

function predicateLikeHasStandaloneCopulaNiTerminalSfp(span: PredicateLike): boolean {
  const plan = span.renderPlan;
  if (plan === null || plan === undefined) {
    return false;
  }
  if (plan.kind !== "headTailChain" || plan.realization?.kind !== "predicate") {
    return false;
  }
  const root = plan.realization.root;
  return typeof root === "object" &&
    root !== null &&
    "tail" in root &&
    "sfp" in root &&
    "quoteBinding" in root &&
    tailRootIsNeutralStandaloneCopulaNiAdverbialFragment(root as TailRoot);
}

export function nominalPredicateClosedByCopula<
  T extends { readonly pos: number; readonly surface: string; readonly dictionaryForm?: string }
>(
  tokens: readonly T[],
  idx: number,
  limit: number
): boolean {
  let cursor = nextNonSpaceIndex(tokens, idx + 1, limit);
  while (cursor !== null && (tokens[cursor]!.pos & POS0) === 接尾辞) {
    cursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
  }
  if (cursor === null) {
    return false;
  }
  const close = tokens[cursor];
  if (close === undefined) {
    return false;
  }
  if (isCopulaPredicateClose(close)) {
    return true;
  }
  if ((close.pos & (POS4 | POS5A | POS5B)) === (助動詞_ダ | 連用形_融合)) {
    const negIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const negTok = negIdx !== null ? tokens[negIdx] : undefined;
    if (
      negTok !== undefined &&
      (negTok.pos & POS0) === 形容詞0 &&
      negTok.dictionaryForm === "ない"
    ) {
      return true;
    }
  }
  if (
    close.surface === "で" &&
    (close.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)
  ) {
    return true;
  }
  if (
    close.surface === "に" &&
    (close.pos & (POS4 | POS5A | POS5B)) === (助動詞_ダ | 連用形_ニ)
  ) {
    const carrierIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const carrier = carrierIdx !== null ? tokens[carrierIdx] : undefined;
    if (
      carrier !== undefined &&
      (carrier.pos & POS01) === 動詞_非自立可能 &&
      (carrier.dictionaryForm === "なる" || carrier.dictionaryForm === "なれる" || carrier.dictionaryForm === "する")
    ) {
      return true;
    }
  }
  if (
    (close.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)
  ) {
    const listingIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    const listing = listingIdx !== null ? tokens[listingIdx] : undefined;
    if (isTariListingParticleToken(listing)) {
      return true;
    }
  }
  const closePos4 = close.pos & POS4;
  if (
    (closePos4 === 助動詞_ダ || closePos4 === 助動詞_デス) &&
    (close.pos & POS5A) === 連用形_
  ) {
    const taIdx = nextNonSpaceIndex(tokens, cursor + 1, limit);
    return taIdx !== null && isPastTaToken(tokens[taIdx]);
  }
  if (close.surface === "で" && (close.pos & POS01) === 助詞_格助詞) {
    let negCursor = nextNonSpaceIndex(tokens, cursor + 1, limit);
    if (negCursor !== null && (tokens[negCursor]!.pos & POS01) === 助詞_係助詞) {
      negCursor = nextNonSpaceIndex(tokens, negCursor + 1, limit);
    }
    const negTok = negCursor !== null ? tokens[negCursor] : undefined;
    if (
      negTok !== undefined &&
      (negTok.pos & POS0) === 形容詞0 &&
      negTok.dictionaryForm === "ない"
    ) {
      return true;
    }
    if (copulaElidedNegativeBodyRelationAt(tokens, cursor, { consumers: ["clause_layout"] }) !== null) {
      return true;
    }
  }
  return false;
}

export function nominalCopulaPredicateAt<
  T extends { readonly pos: number; readonly surface: string; readonly dictionaryForm?: string }
>(
  tokens: readonly T[],
  idx: number,
  limit: number
): boolean {
  const token = tokens[idx];
  if (token === undefined) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 !== 名詞 && pos0 !== 形状詞) {
    return false;
  }
  return nominalPredicateClosedByCopula(tokens, idx, limit);
}
