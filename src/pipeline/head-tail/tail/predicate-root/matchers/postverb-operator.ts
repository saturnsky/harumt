import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { lookupSetMatches } from "../../../../lookup-tables.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { copulaStartsPredicateAt } from "../integration/readiness.js";
import { caseParticleMarkerRelationForToken, copulaNiMarkerRelationForToken } from "../../../boundary/marker.js";
import { nextNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import type { AuxOpNode, PredicateSuffixOp, PostverbAuxiliaryKind, PostverbAuxiliaryPayload, PostverbAuxiliaryOp, HeadProjectionKind, SfpNode, StemNode } from "../grammar.js";
import { isPostverbAuxiliaryActivationAccepted, isPostverbAuxiliaryToken, postverbAuxiliarySourceTokenClassMatches, isStateChangePostverbAuxiliaryKind, isTeAuxActivationAccepted, postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadForForm, postverbAuxiliaryPayloadsForForm } from "../postverb-auxiliary-parser.js";
import { appearancePerceptionProjectionForToken } from "../appearance-perception-carrier-table.js";
import { srcSlice } from "../source.js";
import { isAffirmativeCopulaSupportVerbToken } from "../classifiers/tokens.js";
import { matchNegationEnding } from "./negation-ending.js";
import { fusedNoYouNiKeijoujiAttributiveAt, fusedNoYouNiPerceptionCarrierAt, keijoujiAttributiveMarkerAt, kaNoYouNiPerceptionCarrierAt, perceptionCarrierVerbMatch, isPastAuxiliaryToken } from "./predicate-projection-connective.js";
import { matchEpistemicHedgePostverbAuxiliary as matchEpistemicHedgePostverbAuxiliaryAt } from "./epistemic-hedge.js";
import { isFusedJaCopulaToken } from "./copula.js";
import { headContractForPostverbAuxiliary } from "../head-contract-table.js";
import { chainFinalOpHostCategory, stemHasSourceVerbalPredicateEvidence, stemSupportsAnyProjectionCategory, stemSupportsProjectionCategory } from "../inspect.js";
import { POS0, POS01, POS1, POS4, POS5A, 意志推量形_, 終止形_, 助動詞, 助動詞_タ, 助動詞語幹, isAdjectivalDerivationalSuffix, isNaAdjectiveDerivationalSuffix, isNominalDerivationalSuffix, isVerbalDerivationalSuffixToken, 動詞, 補助記号, 命令形_, 連用形_, 助詞_接続助詞, 助詞_格助詞, isAdverbCapable } from "../../../../../types/pos.js";
import { reanchoringDerivationalProfile } from "../derivational-suffix-lowering.js";
import { derivationalSuffixProfileById, derivationalSuffixProfileFor, resolveDerivationalSuffixProfile, type DerivationalSuffixProfile } from "../derivational-suffix-table.js";
import { buildPostverbAuxiliaryOp, buildPredicateSuffixOp } from "../op-builders.js";
import { isCarrierTerminalMoodPosition, type CarrierTerminalContext } from "../parse-closure.js";
import { hostChainAttachesAsRenyou, hostChainAttachesForPostverbAuxiliary } from "../postverb-host-attachment.js";

export function matchAttributiveBridgedYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  if (fusedNoYouNiKeijoujiAttributiveAt(cursor.tokens, cursor.pos)) {
    const fused = fusedNoYouNiPerceptionCarrierAt(cursor.tokens, cursor.pos);
    if (fused === null) {
      return null;
    }
    const start = cursor.pos;
    cursor.advance(fused.consumed);
    return buildAppearancePerceptionPostverbOp(cursor.tokens, start, fused.consumed, fused.reading);
  }
  if (keijoujiAttributiveMarkerAt(cursor.tokens, cursor.pos) === null) {
    return null;
  }
  const inner = cursor.fork(cursor.pos + 1, cursor.end, cursor.pos + 1);
  const match =
    matchYouNiPerceptionPostverbAuxiliary(inner) ??
    matchKaNoYouNiPerceptionPostverbAuxiliary(inner);
  if (match === null) {
    return null;
  }
  cursor.advance(1 + inner.consumed);
  return match;
}

function isStateChangeCarrierImperativeTerminal(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  token: RuntimeHaruToken,
  context: CarrierTerminalContext | null
): boolean {
  if ((token.pos & POS5A) !== 命令形_) return false;
  if (token.dictionaryForm !== "なる" && token.dictionaryForm !== "する") return false;
  return isCarrierTerminalMoodPosition(tokens, pos + 1, context, false);
}

function isStateChangeCarrierVolitionalTerminal(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  token: RuntimeHaruToken,
  context: CarrierTerminalContext | null
): boolean {
  if ((token.pos & POS5A) !== 意志推量形_) return false;
  if (token.dictionaryForm !== "なる" && token.dictionaryForm !== "する") return false;
  const nextIdx = nextNonSpaceIndex(tokens, pos + 1, tokens.length);
  if (
    nextIdx !== null &&
    nextIdx !== undefined &&
    quoteMarkerRelationAt(tokens, nextIdx, { consumers: ["tail_boundary_readiness"] }) !== null
  ) {
    return true;
  }
  return isCarrierTerminalMoodPosition(tokens, pos + 1, context, true);
}

function isHonorificNasaiImperativeToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) return false;
  if ((token.pos & (POS0 | POS5A)) !== (動詞 | 命令形_)) return false;
  const form = token.dictionaryForm || token.surface;
  return form === "なさる" || form === "為さる" || token.surface === "なさい";
}

export function matchPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  lookups: LookupTables,
  precedingPrefixForm: string | null,
  carrierTerminalContext: CarrierTerminalContext | null = null,
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const token = cursor.current();
  if (token === undefined || !isPostverbAuxiliaryToken(token)) return null;
  const accustomedAuxiliary = accustomedAuxiliaryPayloadForToken(token, stem, ops);
  const auxiliaries = accustomedAuxiliary === undefined
    ? postverbAuxiliaryPayloadsForForm(token.dictionaryForm)
    : [accustomedAuxiliary];
  if (auxiliaries.length === 0) return null;
  const activationAccepted = isPostverbAuxiliaryActivationAccepted(token, tokens[pos + 1]);
  const carrierImperativeTerminal = !activationAccepted &&
    isStateChangeCarrierImperativeTerminal(tokens, pos, token, carrierTerminalContext);
  const declaredImperativeTerminal = !activationAccepted &&
    !carrierImperativeTerminal &&
    (token.pos & POS5A) === 命令形_ &&
    isCarrierTerminalMoodPosition(tokens, pos + 1, carrierTerminalContext, false);
  if (!activationAccepted && !carrierImperativeTerminal && !declaredImperativeTerminal) {
    return null;
  }
  const followsStateChange = previousOpIsStateChangePostverbAuxiliary(ops);
  const followsCopulaSupportRenyou = previousOpIsCopulaSupportRenyouHost(ops);
  for (const auxiliary of auxiliaries) {
    if (!postverbAuxiliarySourceTokenClassMatches(auxiliary, token)) {
      continue;
    }
    if (declaredImperativeTerminal && auxiliary.admitsImperativeTerminal !== true) {
      continue;
    }
    if (!postverbAuxiliaryChainStateAdmitted(auxiliary, ops)) {
      continue;
    }
    if (
      auxiliary.requiredPrefixForms !== undefined &&
      (precedingPrefixForm === null || !auxiliary.requiredPrefixForms.includes(precedingPrefixForm))
    ) {
      continue;
    }
    if (!hostChainAttachesForPostverbAuxiliary(stem, ops, auxiliary.requiredHostForms ?? [])) {
      continue;
    }
    if (
      auxiliary.followingAuxiliaryKind !== undefined &&
      !postverbAuxiliaryPayloadsForForm(tokens[pos + 1]?.dictionaryForm).some(
        (following) => following.kind === auxiliary.followingAuxiliaryKind
      )
    ) {
      continue;
    }
    if (auxiliary.kind === "determined_completion") {
      continue;
    }
    if (auxiliary.kind === "accustomed" && !stemCanHostAccustomedPostverb(stem)) {
      continue;
    }
    if (auxiliary.kind === "appearance_control" && !stemCanProjectAdjectivalPredicate(stem)) {
      continue;
    }
    if (!postverbAuxiliaryHostMatches(auxiliary, stemTok, lookups)) {
      continue;
    }
    if (isStateChangePostverbAuxiliaryKind(auxiliary.kind)) {
      if (!stemCanProjectStateChange(stem) || !canOpenStateChangePostverb(stem, ops)) {
        continue;
      }
    } else if (auxiliary.kind === "make_state_change") {
      const makeStateChangeNext = tokens[pos + 1];
      if (
        canOpenMakeStateChangeCausativePostverb(stem, stemTok, ops, makeStateChangeNext) &&
        !isCausativeItadakuHumbleFollower(tokens, pos)
      ) {
        cursor.advance(2);
        return buildPostverbAuxiliaryOp(
          srcSlice(tokens, pos, 2),
          { ...auxiliary, kind: "make_state_change_causative" }
        );
      }
      if (!canOpenMakeStateChangePostverb(stem, stemTok, ops, makeStateChangeNext)) {
        continue;
      }
    } else if (
      !followsStateChange &&
      !(auxiliary.kind === "potential" && followsCopulaSupportRenyou) &&
      !stemCanHostPostverbAuxiliary(auxiliary, stem)
    ) {
      continue;
    }
    if (auxiliary.kind === "difficulty") {
      const negative = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
      if (negative !== null) {
        cursor.advance(1 + negative.consumed);
        return buildPostverbAuxiliaryOp(
          srcSlice(tokens, pos, 1 + negative.consumed),
          {
            ...auxiliary,
            kind: "risk_potential",
            ...(negative.polite ? { polite: true } : {})
          }
        );
      }
    }
    cursor.advance(1);
    return buildPostverbAuxiliaryOp(
      srcSlice(tokens, pos, 1),
      auxiliary,
      auxiliary.kind === "potential" && followsCopulaSupportRenyou
        ? { hostAttach: "copula_support" }
        : {}
    );
  }
  return null;
}

function rebuildsPredicateBaseForPostverbAdmission(op: AuxOpNode): boolean {
  return op.kind === "postverbAuxiliary" || op.kind === "predicateQuoteCarrier";
}

function postverbAuxiliaryChainStateAdmitted(
  auxiliary: PostverbAuxiliaryPayload,
  ops: readonly AuxOpNode[]
): boolean {
  for (let index = ops.length - 1; index >= 0; index--) {
    const op = ops[index]!;
    if (rebuildsPredicateBaseForPostverbAdmission(op)) {
      return true;
    }
    if (op.kind === "tense" || op.kind === "polite") {
      return false;
    }
    if (op.kind === "negation" && auxiliary.admitsPrecedingNegation !== true) {
      return false;
    }
  }
  return true;
}

function postverbAuxiliaryHostMatches(
  auxiliary: PostverbAuxiliaryPayload,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  const lookupName = auxiliary.hostLookup;
  if (lookupName === undefined) {
    return true;
  }
  const lookup = lookups.named(lookupName);
  if (lookup === undefined) {
    return false;
  }
  return lookupSetMatches(lookup, stemTok.dictionaryForm) ||
    lookupSetMatches(lookup, stemTok.surface);
}

function accustomedAuxiliaryPayloadForToken(
  token: RuntimeHaruToken,
  stem: StemNode,
  ops: readonly AuxOpNode[]
): PostverbAuxiliaryPayload | undefined {
  if (
    token.dictionaryForm !== "なれる" ||
    !stemCanHostAccustomedPostverb(stem) ||
    followsCopulaProjection(ops)
  ) {
    return undefined;
  }
  return postverbAuxiliaryPayloadForForm("慣れる");
}

function followsCopulaProjection(ops: readonly AuxOpNode[]): boolean {
  return ops.some((op) => op.kind === "copula");
}

function stemCanHostAccustomedPostverb(stem: StemNode): boolean {
  return stemCanHostVerbPostverbAuxiliary(stem);
}

function stemCanHostVerbPostverbAuxiliary(stem: StemNode): boolean {
  return stemHasSourceVerbalPredicateEvidence(stem) &&
    stemSupportsProjectionCategory(stem, "verbal_predicate");
}

function postverbAuxiliaryDeclaresVerbalAttach(auxiliary: PostverbAuxiliaryPayload): boolean {
  return postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "verb_renyou") ||
    postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "te_form") ||
    postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "sahen_stem");
}

function stemCanHostPostverbAuxiliary(
  auxiliary: PostverbAuxiliaryPayload,
  stem: StemNode
): boolean {
  const contract = headContractForPostverbAuxiliary(auxiliary.kind);
  if (contract !== undefined && !stemSupportsAnyProjectionKind(stem, contract.accepts)) {
    return false;
  }
  if (auxiliary.kind === "excessive") {
    return stemCanHostVerbPostverbAuxiliary(stem) || stemCanHostAdjectiveExcessivePostverb(stem);
  }
  if (!postverbAuxiliaryDeclaresVerbalAttach(auxiliary)) {
    return stemCanProjectAdjectivalPredicate(stem);
  }
  return stemCanHostVerbPostverbAuxiliary(stem);
}

function stemCanProjectAdjectivalPredicate(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

function stemSupportsAnyProjectionKind(stem: StemNode, projectionKinds: readonly HeadProjectionKind[]): boolean {
  if (stem.kind === "candidateSet") {
    return stem.headHypothesis?.candidates.some((candidate) =>
      candidate.status === "admitted" &&
      candidate.headProfile?.capabilities.some((capability) =>
        capability.choices.some((choice) => projectionKinds.includes(choice.projectionKind))
      ) === true
    ) === true;
  }
  return projectionKinds.includes(directProjectionKindForStem(stem)) ||
    (stem.kind === "adj" && projectionKinds.includes("adverbialized_adjectival")) ||
    (stem.kind === "verb" && projectionKinds.includes("adverbialized_verbal"));
}

function directProjectionKindForStem(stem: Exclude<StemNode, { readonly kind: "candidateSet" }>): HeadProjectionKind {
  if (stem.kind === "noun") {
    return "direct_nominal";
  }
  if (stem.kind === "adj") {
    return "direct_adjectival";
  }
  if (stem.kind === "verb") {
    return "direct_verbal";
  }
  return "direct_adverbial";
}

function stemCanHostAdjectiveExcessivePostverb(stem: StemNode): boolean {
  return stemCanProjectAdjectivalPredicate(stem);
}

function reanchoringDerivationalSuffixProfileForHost(
  dictionaryForm: string,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): { readonly profile: DerivationalSuffixProfile; readonly hostIsVerbal: boolean } | undefined {
  const chainFinalCategory = chainFinalOpHostCategory(ops.at(-1));
  const profile = chainFinalCategory !== undefined
    ? derivationalSuffixProfileFor(dictionaryForm, chainFinalCategory)
    : resolveDerivationalSuffixProfile(stemTok, dictionaryForm);
  if (profile === undefined || profile.hostForm === "noun_compound") {
    return undefined;
  }
  const hostIsVerbal = chainFinalCategory !== undefined
    ? chainFinalCategory === "verbal_predicate"
    : (profile.hostCategories.length === 1 && profile.hostCategories[0] === "verbal_predicate");
  return { profile, hostIsVerbal };
}

export function matchPredicateSuffix(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  lookups: LookupTables
): PredicateSuffixOp | null {
  const token = cursor.current();
  if (token === undefined) return null;
  if (
    !isAdjectivalDerivationalSuffix(token) &&
    !isNaAdjectiveDerivationalSuffix(token) &&
    !isVerbalDerivationalSuffixToken(token) &&
    !isNominalDerivationalSuffix(token)
  ) return null;
  if (!stemSupportsAnyProjectionCategory(stem, ["adjectival_predicate", "verbal_predicate"])) {
    return null;
  }

  if (isAdjectivalDerivationalSuffix(token) || isVerbalDerivationalSuffixToken(token)) {
    const inChainProfile = derivationalSuffixProfileFor(token.dictionaryForm, "verbal_predicate")
      ?? derivationalSuffixProfileFor(token.dictionaryForm, "adjectival_predicate");
    if (inChainProfile === undefined || inChainProfile.hostForm === "noun_compound") {
      return null;
    }
    if (
      inChainProfile.hostForm !== "nominal_ki" &&
      !lexicalHostAdmitsDerivationalProfile(inChainProfile, stemTok, token.dictionaryForm, ops)
    ) {
      return null;
    }
    return consumePredicateSuffix(cursor, token, inChainProfile);
  }

  const resolved = reanchoringDerivationalSuffixProfileForHost(token.dictionaryForm, stemTok, ops);
  if (resolved === undefined) {
    return null;
  }
  const profile = resolved.profile;
  if (
    profile.hostForm === "stem_root" &&
    !lexicalHostAdmitsDerivationalProfile(profile, stemTok, token.dictionaryForm, ops)
  ) {
    return null;
  }
  if (profile.sourcePos === "接尾辞-名詞的" && resolved.hostIsVerbal && !hostChainAttachesAsRenyou(stem, ops)) {
    return null;
  }
  if (profile.sourcePos === "接尾辞-名詞的" && !copulaStartsPredicateAt(cursor.tokens, cursor.pos + 1, lookups)) {
    return null;
  }
  return consumePredicateSuffix(cursor, token, profile);
}

function lexicalHostAdmitsDerivationalProfile(
  profile: DerivationalSuffixProfile,
  stemTok: RuntimeHaruToken,
  dictionaryForm: string | undefined,
  ops: readonly AuxOpNode[]
): boolean {
  return ops.length === 0 &&
    resolveDerivationalSuffixProfile(stemTok, dictionaryForm)?.id === profile.id;
}

function consumePredicateSuffix(
  cursor: TokenCursor<RuntimeHaruToken>,
  token: RuntimeHaruToken,
  profile: DerivationalSuffixProfile
): PredicateSuffixOp {
  cursor.advance(1);
  return buildPredicateSuffixOp(
    srcSlice(cursor.tokens, cursor.pos - 1, 1),
    profile.legacySuffixKind ?? null,
    profile.id,
    token.surface
  );
}

export function previousOpIsReanchoringDerivationalSuffix(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previous !== undefined && reanchoringDerivationalProfile(previous) !== null;
}

function previousOpIsCopulaSupportRenyouHost(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (previous === undefined) {
    return false;
  }
  if (previous.kind !== "copula" && previous.kind !== "scopeBridge") {
    return false;
  }
  if (previous.polarity !== "affirmative") {
    return false;
  }
  if (previous.kind === "scopeBridge") {
    if (previous.head !== null || (previous.particle !== "wa" && previous.particle !== "mo")) {
      return false;
    }
    if (previous.particle === "wa" && previous.markerTagging !== "copula") {
      return false;
    }
  }
  const attach = previous.source.tokens.at(-1);
  return attach !== undefined &&
    isAffirmativeCopulaSupportVerbToken(attach) &&
    (attach.pos & POS5A) === 連用形_;
}

function previousOpIsStateChangePostverbAuxiliary(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previous?.kind === "postverbAuxiliary" &&
    isStateChangePostverbAuxiliaryKind(previous.auxiliary.kind);
}

export function isFusedJaCopulaTerminalBeforeSfp(
  lastOp: AuxOpNode,
  lastTok: RuntimeHaruToken,
  sfp: SfpNode | null
): boolean {
  return sfp !== null &&
    lastOp.kind === "copula" &&
    lastOp.variant === "basic" &&
    lastOp.polarity === "affirmative" &&
    lastOp.source.tokens.length === 1 &&
    isFusedJaCopulaToken(lastTok);
}

export function previousOpIsAffirmativeCopulaNi(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return previousOpIsAffirmativeBasicCopula(ops) &&
    previous !== undefined &&
    previous.source.tokens.some((token, index) =>
      copulaNiMarkerRelationForToken(token, index, {
        consumers: ["tail_boundary_readiness"]
      }) !== null
    );
}

export function previousOpIsSoudaYotaiAdverbialNi(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (
    previous?.kind !== "modal" ||
    previous.modal !== "souda_hearsay" ||
    previous.reading !== "yotai"
  ) {
    return false;
  }
  return previous.source.tokens.some((token, index) =>
    copulaNiMarkerRelationForToken(token, index, {
      consumers: ["tail_boundary_readiness"]
    }) !== null
  );
}

function previousOpIsAffirmativeBasicCopula(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  return (
    previous?.kind === "copula" &&
    previous.variant === "basic" &&
    previous.polarity === "affirmative"
  );
}

function previousOpFeedsStateChangePostverb(ops: readonly AuxOpNode[]): boolean {
  const previous = ops.at(-1);
  if (previous === undefined) {
    return false;
  }
  if (chainFinalOpHostCategory(previous) === "adjectival_predicate") {
    return true;
  }
  if (previous.kind === "copula" || previous.kind === "scopeBridge") {
    return previous.polarity === "negative";
  }
  return previous.kind === "idiom" && stateChangeCanFollowIdiom(previous);
}

function stateChangeCanFollowIdiom(op: Extract<AuxOpNode, { readonly kind: "idiom" }>): boolean {
  switch (op.idiom) {
    case "obligation":
    case "forbidden":
    case "negative_necessity_sumu":
    case "negative_necessity_koto_wa":
    case "inevitable_zaru_o_enai":
    case "cannot_refrain_negative_dewa_irarenai":
    case "method_you_ga_nai":
    case "wake_impossible":
    case "only_option_shika_nai":
      return true;
    default:
      return false;
  }
}

function canOpenStateChangePostverb(
  stem: StemNode,
  ops: readonly AuxOpNode[]
): boolean {
  if (ops.length === 0) {
    return stem.commitment === "suppletive_negation" || stemCanProjectAdjectivalPredicate(stem);
  }
  if (previousOpIsAffirmativeBasicCopula(ops)) {
    return true;
  }
  return previousOpFeedsStateChangePostverb(ops) && stemCanProjectStateChange(stem);
}

export function stemCanProjectStateChange(stem: StemNode): boolean {
  if (stem.kind === "verb" || stem.kind === "adj" || stem.kind === "noun") {
    return true;
  }
  return stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate", "nominal"]);
}

function stemCanProjectFormalToStateResult(stem: StemNode): boolean {
  return stemSupportsProjectionCategory(stem, "adjectival_predicate");
}

function canOpenMakeStateChangePostverb(
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  nextTok: RuntimeHaruToken | undefined
): boolean {
  return (
    previousOpIsAffirmativeBasicCopula(ops) &&
    (stemCanProjectFormalToStateResult(stem) || copulaHostIsMakeStateDerivationalNoun(ops)) &&
    (stemTok.pos & POS1) !== 助動詞語幹 &&
    (copulaHostIsMakeStateDerivationalNoun(ops) || !isCausativeSuruAuxiliaryFollower(nextTok))
  );
}

function copulaHostIsMakeStateDerivationalNoun(ops: readonly AuxOpNode[]): boolean {
  const host = ops.at(-2);
  return host?.kind === "predicateSuffix" &&
    derivationalSuffixProfileById(host.profileId)?.makeStateCarrier !== undefined;
}

function canOpenMakeStateChangeCausativePostverb(
  stem: StemNode,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[],
  nextTok: RuntimeHaruToken | undefined
): boolean {
  return (
    previousOpIsAffirmativeBasicCopula(ops) &&
    stemCanProjectFormalToStateResult(stem) &&
    (stemTok.pos & POS1) !== 助動詞語幹 &&
    isCausativeSuruAuxiliaryFollower(nextTok)
  );
}

function isCausativeSuruAuxiliaryFollower(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助動詞 &&
    (token.dictionaryForm === "せる" || token.dictionaryForm === "させる");
}

function isCausativeItadakuHumbleFollower(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const te = tokens[pos + 2];
  const receive = tokens[pos + 3];
  return te !== undefined &&
    te.surface === "て" &&
    (te.pos & POS01) === 助詞_接続助詞 &&
    receive !== undefined &&
    (receive.pos & POS0) === 動詞 &&
    (receive.dictionaryForm === "いただく" ||
      receive.dictionaryForm === "頂く" ||
      receive.dictionaryForm === "いただける" ||
      receive.dictionaryForm === "頂ける");
}

export function matchFormalToStateResultPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  options: { readonly suppressToSuruControl?: boolean } = {}
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (ops.length !== 0 || !stemCanProjectFormalToStateResult(stem)) {
    return null;
  }
  const marker = cursor.current();
  const verb = cursor.peek(1);
  if (
    marker === undefined ||
    marker.surface !== "と" ||
    (marker.pos & POS01) !== 助詞_格助詞 ||
    verb === undefined ||
    (verb.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(verb, tokens[pos + 2])
  ) {
    return null;
  }
  let kind: PostverbAuxiliaryKind;
  switch (verb.dictionaryForm) {
    case "なる":
      kind = "adverbial_change";
      break;
    case "なれる":
      kind = "adverbial_change_potential";
      break;
    case "する":
      return null;
    default:
      return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 2),
    { kind, headProjection: "formal_state_result" }
  );
}

export function matchAdverbialNiPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  stem: StemNode
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (!isAdverbCapable(stemTok) || !stemSupportsProjectionCategory(stem, "adverbial")) {
    return null;
  }
  const marker = cursor.current();
  const verb = cursor.peek(1);
  if (
    caseParticleMarkerRelationForToken(marker, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    verb === undefined ||
    (verb.pos & POS0) !== 動詞 ||
    !isTeAuxActivationAccepted(verb, tokens[pos + 2])
  ) {
    return null;
  }
  let kind: PostverbAuxiliaryKind;
  switch (verb.dictionaryForm) {
    case "なる":
      kind = "adverbial_change";
      break;
    case "なれる":
      kind = "adverbial_change_potential";
      break;
    case "する":
      if (!isBoundedAdverbialControlSuruCarrier(verb, tokens[pos + 2])) {
        return null;
      }
      kind = "adverbial_control";
      break;
    default:
      return null;
  }
  cursor.advance(2);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 2), { kind });
}

function isBoundedAdverbialControlSuruCarrier(
  verb: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): boolean {
  const form = verb.pos & POS5A;
  if (form === 終止形_) {
    return next === undefined || (next.pos & POS0) === 補助記号;
  }
  return form === 連用形_ &&
    next !== undefined &&
    (next.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_);
}

export function matchYouNiNaruPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  context: CarrierTerminalContext | null = null
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const likeness = cursor.current();
  const ni = cursor.peek(1);
  const naru = cursor.peek(2);
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹 ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "なれる") ||
    (!isTeAuxActivationAccepted(naru, tokens[pos + 3]) &&
      !isStateChangeCarrierImperativeTerminal(tokens, pos + 2, naru, context) &&
      !isStateChangeCarrierVolitionalTerminal(tokens, pos + 2, naru, context))
  ) {
    return null;
  }
  const simileBecome =
    isPastAuxiliaryToken(tokens[pos - 1]) && isTeAuxActivationAccepted(naru, tokens[pos + 3]);
  const becomeKind = naru.dictionaryForm === "なれる"
    ? (simileBecome ? "manner_simile_become_potential" : "adverbial_change_potential")
    : (simileBecome ? "manner_simile_become" : "adverbial_change");
  if (
    naru.dictionaryForm === "なる" &&
    (naru.pos & POS5A) === 連用形_ &&
    isHonorificNasaiImperativeToken(tokens[pos + 3])
  ) {
    if (isCarrierTerminalMoodPosition(tokens, pos + 4, context, false)) {
      cursor.advance(4);
      return buildPostverbAuxiliaryOp(
        srcSlice(tokens, pos, 4),
        { kind: "adverbial_change" }
      );
    }
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 3), { kind: becomeKind });
}

export function matchSouNiNaruPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const naru = cursor.peek(2);
  if (
    appearancePerceptionProjectionForToken(marker) !== "sou_appearance" ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    naru === undefined ||
    (naru.pos & POS0) !== 動詞 ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "なれる") ||
    !isTeAuxActivationAccepted(naru, tokens[pos + 3])
  ) {
    return null;
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    {
      kind: naru.dictionaryForm === "なれる"
        ? "appearance_state_change_potential"
        : "appearance_state_change",
      perceptionProjection: "sou_appearance"
    }
  );
}

export function matchSouNiSuruAppearanceBehaviorPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const suru = cursor.peek(2);
  if (
    appearancePerceptionProjectionForToken(marker) !== "sou_appearance" ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    suru === undefined ||
    (suru.pos & POS0) !== 動詞 ||
    suru.dictionaryForm !== "する" ||
    !isTeAuxActivationAccepted(suru, tokens[pos + 3])
  ) {
    return null;
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    { kind: "appearance_behavior", perceptionProjection: "sou_appearance" }
  );
}

export function absorbMannerActionControlPastTense(
  ops: AuxOpNode[],
  carrier: PostverbAuxiliaryOp
): void {
  if (carrier.auxiliary.kind !== "manner_action_control") {
    return;
  }
  const carrierStart = carrier.source.tokenIndices[0];
  const last = ops[ops.length - 1];
  if (
    carrierStart === undefined ||
    last?.kind !== "tense" ||
    last.source.tokenIndices.length !== 1 ||
    last.source.tokenIndices[0] !== carrierStart - 1
  ) {
    return;
  }
  ops.pop();
}

export function matchYouNiSuruControlPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>,
  hostIsVolitionalMannerHost: boolean,
  context: CarrierTerminalContext | null = null
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const you = cursor.current();
  const ni = cursor.peek(1);
  const suru = cursor.peek(2);
  if (
    you === undefined ||
    (you.surface !== "よう" && you.surface !== "様") ||
    (you.pos & POS1) !== 助動詞語幹 ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    suru === undefined ||
    (suru.pos & POS0) !== 動詞 ||
    suru.dictionaryForm !== "する" ||
    (!isTeAuxActivationAccepted(suru, tokens[pos + 3]) &&
      !isStateChangeCarrierImperativeTerminal(tokens, pos + 2, suru, context) &&
      !isStateChangeCarrierVolitionalTerminal(tokens, pos + 2, suru, context))
  ) {
    return null;
  }
  const isPast = isPastAuxiliaryToken(tokens[pos - 1]);
  if (isPast && !hostIsVolitionalMannerHost) {
    return null;
  }
  if (!isPast && !hostIsVolitionalMannerHost && (suru.pos & POS5A) === 連用形_ && isHonorificNasaiImperativeToken(tokens[pos + 3])) {
    if (isCarrierTerminalMoodPosition(tokens, pos + 4, context, false)) {
      cursor.advance(4);
      return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, 4), { kind: "scope_control" });
    }
  }
  cursor.advance(3);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 3),
    { kind: isPast ? "manner_action_control" : "scope_control" }
  );
}

export function matchYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const marker = cursor.current();
  const ni = cursor.peek(1);
  const verb = cursor.peek(2);
  const projection = appearancePerceptionProjectionForToken(marker);
  const carrier = perceptionCarrierVerbMatch(verb, cursor.peek(3));
  if (
    projection === null ||
    copulaNiMarkerRelationForToken(ni, pos + 1, {
      consumers: ["tail_boundary_readiness"]
    }) === null ||
    carrier === null ||
    !isTeAuxActivationAccepted(carrier.terminal, tokens[pos + 2 + carrier.span])
  ) {
    return null;
  }
  cursor.advance(2 + carrier.span);
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, 2 + carrier.span),
    {
      kind: "appearance_perception",
      perception: carrier.reading,
      perceptionProjection: projection
    }
  );
}

export function matchKaNoYouNiPerceptionPostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const admission = kaNoYouNiPerceptionCarrierAt(tokens, pos);
  if (admission === null) {
    return null;
  }
  cursor.advance(admission.consumed);
  return buildAppearancePerceptionPostverbOp(tokens, pos, admission.consumed, admission.reading);
}

function buildAppearancePerceptionPostverbOp(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  sourceLength: number,
  perception: "visual" | "inferential" | "inferential_passive" | "felt"
): PostverbAuxiliaryOp {
  return buildPostverbAuxiliaryOp(
    srcSlice(tokens, pos, sourceLength),
    {
      kind: "appearance_perception",
      perception,
      perceptionProjection: "attributive_like"
    }
  );
}

export function matchEpistemicHedgePostverbAuxiliary(
  cursor: TokenCursor<RuntimeHaruToken>
): PostverbAuxiliaryOp | null {
  const match = matchEpistemicHedgePostverbAuxiliaryAt(cursor.tokens, cursor.pos);
  if (match === null) {
    return null;
  }
  cursor.advance(match.consumed);
  return match.op;
}
