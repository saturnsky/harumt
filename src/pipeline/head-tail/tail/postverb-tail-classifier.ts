import type { RuntimeHaruToken } from "../../../types/token.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../clause-layout/trivia.js";
import { isPastGoodEvaluationPredicateAt, matchPermissionPredicateAt } from "../../semantics/permission-idiom.js";
import { nominalizerAdversativeConnectiveRelationAt } from "../boundary/marker.js";
import type { LookupTables } from "../../lookup-tables.js";
import type {
  BoundaryRelationConsumer,
  TeDeContinuationRelation
} from "../boundary/relation.js";

import {
  TE_TAIL_CONTINUATION_IMPERATIVE_ENTRY_BY_FORM,
  TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM,
  TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM,
  TE_TAIL_CONTINUATION_POTENTIAL_ENTRY_BY_FORM,
  type TeTailContinuationDirection,
  type TeTailContinuationLexemeEntry
} from "./te-tail-continuation-table.js";
import type { BenefactiveAspectOp } from "./predicate-root/grammar.js";
import { honorificFormulaicArmForms } from "../data/honorific-formulaic-arm-table.js";
import { predicateSuffixKindForDictionaryForm } from "./predicate-root/derivational-suffix-table.js";
import { isTeAuxActivationAccepted } from "./predicate-root/postverb-auxiliary-parser.js";
import { matchProhibitionPredicateAt } from "../../semantics/prohibition-idiom.js";

import { POS0, POS01, POS1, POS4, POS5A, 助動詞_マス, 意志推量形_, 形容詞0, 助詞, 助詞_接続助詞, 助動詞, 動詞, 非自立可能, 名詞, 命令形_, 連用形_, 動詞_非自立可能, isAdjectivalRenyouTeFormHostToken, isAuxiliaryToken, isIAdjectivePredicateToken, isNonInflectingHostToken, isVerbPredicateToken, isAdjectivalDerivationalSuffix } from "../../../types/pos.js";
export type TeTailContinuationKind =
  | "simple_aspect"
  | "benefactive"
  | "request"
  | "prohibition"
  | "forbidden"
  | "desiderative"
  | "miseru"
  | "permission"
  | "evaluation"
  | "degree_intensifier";

export type TeTailContinuationToken =
  Pick<RuntimeHaruToken, "surface" | "pos"> &
  Readonly<Partial<Pick<RuntimeHaruToken, "dictionaryForm">>>;

export interface TeTailContinuationMatch {
  readonly kind: TeTailContinuationKind;
  readonly consumed: number;
}

export interface TeBenefactiveContinuationMetadata {
  readonly aspect: BenefactiveAspectOp["aspect"];
  readonly honorific: boolean;
  readonly potential: boolean;
  readonly recipientPivot: boolean;
}

export interface TeConnectiveHeadMatch {
  readonly consumed: number;
  readonly markerSurface: TeDeContinuationRelation["markerSurface"];
  readonly focusParticle?: "は" | "も";
}

export interface TeDeContinuationRelationOptions {
  readonly requirement?: "parser_adjacent_tail" | "layout_nonspace_tail";
  readonly consumers?: readonly BoundaryRelationConsumer[];
  readonly lookups: LookupTables;
}

export type TeTailSourcePredicateEvidence =
  | "source_verbal"
  | "source_nonverbal"
  | "unknown";

export function teTailContinuationRequiresSourceVerbalHost(
  kind: TeTailContinuationKind
): boolean {
  switch (kind) {
    case "simple_aspect":
    case "benefactive":
    case "request":
    case "prohibition":
    case "desiderative":
    case "miseru":
      return true;
    case "forbidden":
    case "permission":
    case "evaluation":
    case "degree_intensifier":
      return false;
  }
}

export function teTailContinuationHostAdmitted(
  kind: TeTailContinuationKind,
  evidence: TeTailSourcePredicateEvidence
): boolean {
  return evidence !== "source_nonverbal" || !teTailContinuationRequiresSourceVerbalHost(kind);
}

const TE_MAWARU_ITINERANT_FORMS = new Set(["回る", "廻る", "まわる"]);

const REQUEST_LEMMAS = new Set(["くださる", "下さる", "くれる", "呉れる"]);

export function teMawaruItinerantVetoed(
  stemLemma: string,
  continuationLemma: string,
  lookups: LookupTables
): boolean {
  return TE_MAWARU_ITINERANT_FORMS.has(continuationLemma) &&
    lookups.TE_MAWARU_ROTATION_MANNER_VETO_VERBS.has(stemLemma);
}
const DESIDERATIVE_LEMMAS = new Set(["ほしい", "欲しい"]);
const MISERU_LEMMAS = new Set(["みせる", "見せる"]);
const DEGREE_HELPLESS_ADJECTIVE_LEMMAS = new Set(["仕方ない", "仕様がない", "しょうがない"]);
const DEGREE_HELPLESS_NOUN_SURFACES = new Set(["しょう", "仕方"]);

export function isHelplessEvaluativeAdjectiveToken(token: TeTailContinuationToken | undefined): boolean {
  return token !== undefined && (token.pos & POS0) === 形容詞0 &&
    DEGREE_HELPLESS_ADJECTIVE_LEMMAS.has(token.dictionaryForm || token.surface);
}

export function isTeConnectiveToken(token: TeTailContinuationToken | undefined): boolean {
  return token !== undefined && (token.pos & POS01) === 助詞_接続助詞 && (token.surface === "て" || token.surface === "で");
}

export function matchTeConnectiveHeadAt(
  tokens: readonly TeTailContinuationToken[],
  pos: number
): TeConnectiveHeadMatch | null {
  const head = teConnectiveHeadAt(tokens, pos, "parser_adjacent_tail");
  if (head === null) {
    return null;
  }
  return head.focusParticle === undefined
    ? { consumed: head.consumed, markerSurface: head.markerSurface }
    : { consumed: head.consumed, markerSurface: head.markerSurface, focusParticle: head.focusParticle };
}

export function teMarkerOpensProhibitionPredicateAt(
  tokens: readonly TeTailContinuationToken[],
  markerIdx: number
): boolean {
  const head = teConnectiveHeadAt(tokens, markerIdx, "layout_nonspace_tail");
  return head?.focusParticle === "は" &&
    matchProhibitionPredicateAt(tokens as readonly RuntimeHaruToken[], head.continuationIdx) !== null;
}

export function teDeContinuationRelationAt(
  tokens: readonly TeTailContinuationToken[],
  markerIdx: number,
  options: TeDeContinuationRelationOptions
): TeDeContinuationRelation | null {
  const requirement = options.requirement ?? "parser_adjacent_tail";
  const head = teConnectiveHeadAt(tokens, markerIdx, requirement);
  if (head === null) {
    return null;
  }
  const continuation = matchTeTailContinuationAt(tokens, head.continuationIdx, options.lookups, {
    ...(head.focusParticle === undefined ? {} : { focusParticle: head.focusParticle })
  });
  if (continuation === null) {
    return null;
  }
  const stemIdx = previousNonSpaceIndex(tokens, markerIdx);
  const stemToken = stemIdx === null ? undefined : tokens[stemIdx];
  if (
    continuation.kind === "simple_aspect" &&
    stemToken !== undefined &&
    (stemToken.pos & POS4) === 助動詞_マス &&
    (stemToken.pos & POS5A) === 連用形_
  ) {
    return null;
  }
  const sourcePredicateEvidence = sourcePredicateEvidenceForHostToken(stemToken);
  if (!teTailContinuationHostAdmitted(continuation.kind, sourcePredicateEvidence)) {
    return null;
  }
  if (
    teMiruPredicateSuffixAttachmentVetoed(
      tokens,
      head.continuationIdx,
      continuation,
      sourcePredicateEvidence
    )
  ) {
    return null;
  }
  if (
    continuation.kind === "benefactive" &&
    teYaruContinuationOpensTeKuruChainAt(tokens, head.continuationIdx, options.lookups)
  ) {
    return null;
  }
  if (continuation.kind === "simple_aspect") {
    const continuationToken = tokens[head.continuationIdx];
    if (
      continuationToken !== undefined &&
      stemToken !== undefined &&
      teMawaruItinerantVetoed(
        stemToken.dictionaryForm || stemToken.surface,
        continuationToken.dictionaryForm || continuationToken.surface,
        options.lookups
      )
    ) {
      return null;
    }
  }
  return {
    kind: "te_de_continuation",
    span: {
      start: markerIdx,
      endExclusive: head.continuationIdx + continuation.consumed
    },
    strength: "readiness",
    reason: `te/de marker opens ${continuation.kind} postverb operator tail`,
    consumers: options.consumers ?? ["tail_boundary_readiness", "tail_multi_clause", "clause_layout"],
    surface: head.markerSurface,
    role: "postverb_operator_tail",
    markerSurface: head.markerSurface,
    ...(head.focusParticle === undefined ? {} : { focusParticle: head.focusParticle }),
    continuationKind: continuation.kind,
    continuationIdx: head.continuationIdx,
    continuationConsumed: continuation.consumed,
    requirement
  };
}

export function teTailContinuationDirectionForToken(
  token: TeTailContinuationToken
): TeTailContinuationDirection | undefined {
  return teTailContinuationLexemeEntryForToken(token)?.direction;
}

export function isSimpleAspectAuxActivationAccepted(
  token: TeTailContinuationToken,
  next?: TeTailContinuationToken
): boolean {
  if (teTailContinuationDerivationForToken(token) === "potential") {
    return isTeAuxActivationAccepted(token, next);
  }
  return isTeAuxActivationAccepted(token, next) ||
    (token.pos & POS5A) === 意志推量形_ ||
    ((token.pos & POS5A) === 命令形_ && isSimpleAspectTeTailContinuationToken(token));
}

export function teYaruContinuationOpensTeKuruChainAt(
  tokens: readonly TeTailContinuationToken[],
  yaruIdx: number,
  lookups: LookupTables
): boolean {
  const yaru = tokens[yaruIdx];
  const te = tokens[yaruIdx + 1];
  const kuru = tokens[yaruIdx + 2];
  if (
    yaru === undefined ||
    te === undefined ||
    kuru === undefined ||
    !lookups.TE_KURU_YARU_SOURCE_LEMMAS.has(yaru.dictionaryForm || yaru.surface) ||
    classifyTeTailContinuation(yaru, lookups) !== "benefactive" ||
    !isTeConnectiveToken(te) ||
    (kuru.pos & POS01) !== 動詞_非自立可能 ||
    !isSimpleAspectAuxActivationAccepted(kuru, tokens[yaruIdx + 3])
  ) {
    return false;
  }
  return teTailContinuationDirectionForToken(kuru) === "te_kuru" &&
    classifyTeTailContinuation(kuru, lookups) === "simple_aspect";
}

export function sourcePredicateEvidenceForHostToken(
  token: TeTailContinuationToken | undefined
): TeTailSourcePredicateEvidence {
  if (token === undefined) {
    return "unknown";
  }
  if (isVerbPredicateToken(token)) {
    return "source_verbal";
  }
  if (
    isIAdjectivePredicateToken(token) ||
    (
      isAdjectivalDerivationalSuffix(token) &&
      predicateSuffixKindForDictionaryForm(token.dictionaryForm ?? "") !== null
    ) ||
    isAdjectivalRenyouTeFormHostToken(token)
  ) {
    return "source_nonverbal";
  }
  if (isAuxiliaryToken(token)) {
    return "unknown";
  }
  if (isNonInflectingHostToken(token)) {
    return "source_nonverbal";
  }
  return "unknown";
}

function teMiruPredicateSuffixAttachmentVetoed(
  tokens: readonly TeTailContinuationToken[],
  continuationIdx: number,
  continuation: TeTailContinuationMatch,
  sourcePredicateEvidence: TeTailSourcePredicateEvidence
): boolean {
  if (
    continuation.kind !== "simple_aspect" ||
    sourcePredicateEvidence !== "source_nonverbal"
  ) {
    return false;
  }
  const continuationToken = tokens[continuationIdx];
  if (
    continuationToken === undefined ||
    teTailContinuationLexemeEntryForToken(continuationToken)?.predicateSuffixCompetition !==
      "lexical_predicate"
  ) {
    return false;
  }
  const suffix = tokens[continuationIdx + continuation.consumed];
  return suffix !== undefined &&
    isAdjectivalDerivationalSuffix(suffix) &&
    predicateSuffixKindForDictionaryForm(suffix.dictionaryForm ?? "") !== null;
}

export function classifyTeTailContinuation(token: TeTailContinuationToken, lookups: LookupTables): TeTailContinuationKind | null {
  const p0 = token.pos & POS0;
  const p1 = token.pos & POS1;
  const lemma = token.dictionaryForm || token.surface;
  const p5a = token.pos & POS5A;

  if (p0 === 形容詞0 && DESIDERATIVE_LEMMAS.has(lemma)) {
    return "desiderative";
  }
  if (p0 === 形容詞0 && DEGREE_HELPLESS_ADJECTIVE_LEMMAS.has(lemma)) {
    return "degree_intensifier";
  }
  if (p0 === 名詞 && DEGREE_HELPLESS_NOUN_SURFACES.has(token.surface)) {
    return "degree_intensifier";
  }
  if (p0 === 動詞 && lookups.DEGREE_INTENSIFIER_TAIL_VERBS.has(lemma)) {
    return "degree_intensifier";
  }
  if (isPermissionGoodContinuationToken(token)) {
    return "permission";
  }
  if (isChoudaiRequestContinuationToken(token)) {
    return "request";
  }
  const imperativeFormEntry = teTailImperativeFormEntryForToken(token);
  if (imperativeFormEntry !== undefined) {
    return imperativeFormEntry.kind;
  }
  if (p0 !== 動詞) {
    return null;
  }
  if (REQUEST_LEMMAS.has(lemma) && p5a === 命令形_) {
    return "request";
  }
  if (MISERU_LEMMAS.has(lemma)) {
    return "miseru";
  }
  const externalizedKind = TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM.get(lemma) ??
    TE_TAIL_CONTINUATION_POTENTIAL_ENTRY_BY_FORM.get(lemma)?.kind;
  if (externalizedKind === "benefactive") {
    return externalizedKind;
  }
  if (p5a === 命令形_ && TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(lemma)?.auxiliaryHonorific === "respect") {
    return null;
  }
  if (p1 !== 非自立可能) {
    return null;
  }
  if (externalizedKind !== undefined) {
    return externalizedKind;
  }
  return null;
}

export function isSimpleAspectTeTailContinuationToken(token: TeTailContinuationToken): boolean {
  const lemma = token.dictionaryForm || token.surface;
  return (token.pos & POS01) === 動詞_非自立可能 && TE_TAIL_CONTINUATION_LEXEME_KIND_BY_FORM.get(lemma) === "simple_aspect";
}

export function teTailContinuationLexemeEntryForToken(
  token: TeTailContinuationToken
): TeTailContinuationLexemeEntry | undefined {
  const lemma = token.dictionaryForm || token.surface;
  return TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.get(lemma) ?? TE_TAIL_CONTINUATION_POTENTIAL_ENTRY_BY_FORM.get(lemma);
}

export function teTailContinuationDerivationForToken(
  token: TeTailContinuationToken
): "potential" | undefined {
  const lemma = token.dictionaryForm || token.surface;
  return TE_TAIL_CONTINUATION_LEXEME_ENTRY_BY_FORM.has(lemma) || !TE_TAIL_CONTINUATION_POTENTIAL_ENTRY_BY_FORM.has(lemma)
    ? undefined
    : "potential";
}

export function teTailImperativeFormEntryForToken(
  token: TeTailContinuationToken
): TeTailContinuationLexemeEntry | undefined {
  return TE_TAIL_CONTINUATION_IMPERATIVE_ENTRY_BY_FORM.get(token.dictionaryForm || token.surface);
}

export function isHonorificNasaruImperativeToken(token: RuntimeHaruToken): boolean {
  if ((token.pos & (POS0 | POS5A)) !== (動詞 | 命令形_)) {
    return false;
  }
  const forms = honorificFormulaicArmForms("honorific_nasaru");
  return forms.has(token.dictionaryForm || token.surface) || forms.has(token.surface);
}

export function isTeTailImperativeFormClosureAt(
  tokens: readonly TeTailContinuationToken[],
  idx: number
): boolean {
  const token = tokens[idx];
  return token !== undefined &&
    teTailImperativeFormEntryForToken(token) !== undefined &&
    isTeConnectiveToken(tokens[idx - 1]);
}

export function isStativeTeTailContinuationToken(token: TeTailContinuationToken): boolean {
  return teTailContinuationLexemeEntryForToken(token)?.denotation === "state";
}

export function teBenefactiveContinuationMetadataForToken(
  token: TeTailContinuationToken
): TeBenefactiveContinuationMetadata | null {
  const aspect = teTailContinuationLexemeEntryForToken(token)?.benefactiveAspect;
  return aspect === undefined ? null : {
    aspect,
    honorific: aspect === "te_kudasaru" || aspect === "te_itadaku" || aspect === "te_itadakeru",
    potential: aspect === "te_moraeru" || aspect === "te_itadakeru",
    recipientPivot: aspect === "te_morau" || aspect === "te_moraeru" ||
      aspect === "te_itadaku" || aspect === "te_itadakeru",
  };
}

export interface TeTailContinuationContext {
  readonly focusParticle?: "は" | "も";
}

export function matchTeTailContinuationAt(
  tokens: readonly TeTailContinuationToken[],
  pos: number,
  lookups: LookupTables,
  context: TeTailContinuationContext = {}
): TeTailContinuationMatch | null {
  const prohibition = matchProhibitionContinuationAt(tokens, pos, lookups);
  if (prohibition !== null) {
    return prohibition;
  }
  if (context.focusParticle === "は") {
    const forbidden = matchProhibitionPredicateAt(tokens as readonly RuntimeHaruToken[], pos);
    if (forbidden !== null) {
      return { kind: "forbidden", consumed: forbidden.consumed };
    }
  }
  const permission = matchPermissionPredicateForTeTail(tokens, pos);
  if (permission !== null) {
    return {
      kind: teTailPermissionEvidenceAt(tokens, pos, context) === null ? "evaluation" : "permission",
      consumed: permission.consumed
    };
  }
  const token = tokens[pos];
  if (token === undefined) {
    return null;
  }
  const kind = classifyTeTailContinuation(token, lookups);
  if (kind === null) {
    return null;
  }
  if (kind === "degree_intensifier" && context.focusParticle === "も") {
    return null;
  }
  return { kind, consumed: 1 };
}

export function isChoudaiRequestContinuationToken(token: TeTailContinuationToken): boolean {
  const lemma = token.dictionaryForm || token.surface;
  return (token.surface === "ちょうだい" || lemma === "頂戴" || lemma === "ちょうだい") &&
    ((token.pos & POS0) === 名詞 || (token.pos & POS0) === 動詞);
}

function isPermissionGoodContinuationToken(token: TeTailContinuationToken): boolean {
  if ((token.pos & POS0) !== 形容詞0) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  return token.surface === "いい" ||
    token.surface === "良い" ||
    token.surface === "よい" ||
    token.surface === "好い" ||
    lemma === "いい" ||
    lemma === "良い" ||
    lemma === "よい" ||
    lemma === "好い";
}

function matchProhibitionContinuationAt(
  tokens: readonly TeTailContinuationToken[],
  pos: number,
  lookups: LookupTables
): TeTailContinuationMatch | null {
  const neg = tokens[pos];
  const connector = tokens[pos + 1];
  const request = tokens[pos + 2];
  if (
    neg === undefined || connector === undefined || request === undefined || !isNaiOrNuContinuationToken(neg) || connector.surface !== "で" || (connector.pos & POS01) !== 助詞_接続助詞 || classifyTeTailContinuation(request, lookups) !== "request"
  ) {
    return null;
  }
  return { kind: "prohibition", consumed: 3 };
}

function isNaiOrNuContinuationToken(token: TeTailContinuationToken): boolean {
  const lemma = token.dictionaryForm || token.surface;
  return (token.pos & POS0) === 助動詞 && (lemma === "ない" || lemma === "無い" || lemma === "ぬ");
}

function normalizePermissionTokens(
  tokens: readonly TeTailContinuationToken[]
): readonly { readonly surface: string; readonly dictionaryForm: string; readonly pos: number }[] {
  return tokens.map((token) => ({
    surface: token.surface,
    dictionaryForm: token.dictionaryForm ?? token.surface,
    pos: token.pos
  }));
}

function matchPermissionPredicateForTeTail(
  tokens: readonly TeTailContinuationToken[],
  pos: number
): { readonly consumed: number } | null {
  return matchPermissionPredicateAt(normalizePermissionTokens(tokens), pos);
}

type TeTailPermissionEvidence =
  | "concessive_focus"
  | "nonpast_permission"
  | "counterfactual_deontic";

function teTailPermissionEvidenceAt(
  tokens: readonly TeTailContinuationToken[],
  pos: number,
  context: TeTailContinuationContext
): TeTailPermissionEvidence | null {
  if (context.focusParticle !== undefined) {
    return "concessive_focus";
  }
  if (!isPastGoodEvaluationPredicateAt(normalizePermissionTokens(tokens), pos)) {
    return "nonpast_permission";
  }
  if (closedByCounterfactualAdversativeAt(tokens, pos + 2)) {
    return "counterfactual_deontic";
  }
  return null;
}

function closedByCounterfactualAdversativeAt(
  tokens: readonly TeTailContinuationToken[],
  followerStart: number
): boolean {
  const idx = nextNonSpaceIndex(tokens, followerStart);
  if (idx === null) {
    return false;
  }
  return nominalizerAdversativeConnectiveRelationAt(tokens, idx, {
    consumers: ["tail_boundary_readiness"]
  })?.connectiveKind === "adversative";
}

interface TeConnectiveHeadWithContinuation {
  readonly consumed: number;
  readonly markerSurface: TeDeContinuationRelation["markerSurface"];
  readonly continuationIdx: number;
  readonly focusParticle?: "は" | "も";
}

function teConnectiveHeadAt(
  tokens: readonly TeTailContinuationToken[],
  pos: number,
  requirement: "parser_adjacent_tail" | "layout_nonspace_tail"
): TeConnectiveHeadWithContinuation | null {
  const token = tokens[pos];
  if (token === undefined) {
    return null;
  }
  const next = (start: number): number => requirement === "layout_nonspace_tail"
    ? (nextNonSpaceIndex(tokens, start) ?? tokens.length)
    : start;

  if (isTeConnectiveToken(token)) {
    const focusIdx = next(pos + 1);
    const focus = tokens[focusIdx];
    if (focus !== undefined && (focus.pos & POS0) === 助詞 && (focus.surface === "は" || focus.surface === "も")) {
      const continuationIdx = next(focusIdx + 1);
      const markerSurface = focus.surface === "は"
        ? (token.surface === "て" ? "ては" : "では")
        : (token.surface === "て" ? "ても" : "でも");
      return {
        consumed: continuationIdx - pos,
        markerSurface,
        continuationIdx,
        focusParticle: focus.surface
      };
    }
    if (focus !== undefined && (focus.pos & POS0) === 助詞 && focus.surface === "など") {
      const continuationIdx = next(focusIdx + 1);
      return {
        consumed: continuationIdx - pos,
        markerSurface: token.surface === "て" ? "てなど" : "でなど",
        continuationIdx
      };
    }
    return {
      consumed: focusIdx - pos,
      markerSurface: token.surface === "て" ? "て" : "で",
      continuationIdx: focusIdx
    };
  }

  if ((token.pos & POS01) !== 助詞_接続助詞) {
    return null;
  }
  const continuationIdx = next(pos + 1);
  switch (token.surface) {
    case "ては":
    case "では":
      return { consumed: continuationIdx - pos, markerSurface: token.surface, continuationIdx, focusParticle: "は" };
    case "ちゃ":
      return { consumed: continuationIdx - pos, markerSurface: "ては", continuationIdx, focusParticle: "は" };
    case "じゃ":
      return { consumed: continuationIdx - pos, markerSurface: "では", continuationIdx, focusParticle: "は" };
    case "ても":
    case "でも":
      return { consumed: continuationIdx - pos, markerSurface: token.surface, continuationIdx, focusParticle: "も" };
    default:
      return null;
  }
}
