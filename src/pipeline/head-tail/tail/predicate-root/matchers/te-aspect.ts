import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isAdjNai } from "../../../../matchers.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { copulaDeMarkerRelationForToken } from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { sourceVerbalPredicateAfterAuxOp } from "../operator-head.js";
import { classifyTeTailContinuation, isChoudaiRequestContinuationToken, isSimpleAspectAuxActivationAccepted, isTeConnectiveToken, matchTeTailContinuationAt, teBenefactiveContinuationMetadataForToken, teTailContinuationLexemeEntryForToken, teTailContinuationDerivationForToken, teTailImperativeFormEntryForToken, teTailContinuationDirectionForToken, teMawaruItinerantVetoed, teYaruContinuationOpensTeKuruChainAt } from "../../postverb-tail-classifier.js";
import type { AuxOpNode, BenefactiveAspectOp, BenefactivePayload, DesiderativeAspectOp, DesiderativePayload, MiseruAspectOp, ProhibitionAspectOp, ProhibitionPayload, RequestAspectOp, SimpleAspectOp, OpSource, PostverbAuxiliaryOp, VoiceOp, StemNode } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { isTeAuxActivationAccepted, isTeBenefactiveActivationAccepted, postverbAuxiliaryDeclaresHostAttachForm, postverbAuxiliaryPayloadForForm } from "../postverb-auxiliary-parser.js";
import { srcSingle, srcSlice } from "../source.js";
import { collapsedAspectAuxKind, isAruVerbToken, isNaiOrNuToken } from "../classifiers/tokens.js";
import { matchNegationEnding } from "./negation-ending.js";
import { stemHasSourceVerbalPredicateEvidence, stemHasVoicedTeFormHostEvidence } from "../inspect.js";
import { POS0, POS01, POS2, POS4, POS5A, is上一段, is下一段, PUNCTUATION_BITS, サ変可能, isPastAuxiliaryPos, isRenyouInflection, isTerminalOrAttributiveInflection, 形容詞0, 終止形_, 助動詞, 助動詞_タ, 動詞, 動詞_非自立可能, 非自立可能, 未然形_, 名詞, 命令形_, 連用形_, 連用形_促音便, 동사 } from "../../../../../types/pos.js";
import { isSeruCausativeAuxToken, isShimeruCausativeAuxToken } from "../classifiers/causative-aux.js";
import { buildVoiceOp, buildPostverbAuxiliaryOp, buildRequestAspectOp, createAspectOp, type RequestAspectKind } from "../op-builders.js";
import { isNegationToken } from "../parser.js";
import { matchNoda } from "./modal-tail.js";
import { matchVolitionalConfirmationJanaiKa, matchJaNaiConfirmationSequence, matchDewaNaiKaConfirmationSequence, matchDirectDewaNaiKaConfirmationSequence } from "./terminal-sfp.js";
import { matchPredicateQuoteCarrier, quoteRequestComplementBoundaryForInput } from "./predicate-quote.js";
import { type TeConnectiveHead, teFamilyContinuationHostAdmitted, matchTeConnectiveHead, isSplitTeIruVolitionalStemAt } from "./te-host.js";

export function matchSimpleAspect(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): readonly [SimpleAspectOp] | readonly [SimpleAspectOp, VoiceOp] | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = tokens[pos + teHead.consumed];
  if (t1 === undefined) return null;
  const imperativeFormEntry = teTailImperativeFormEntryForToken(t1);
  if (imperativeFormEntry === undefined) {
    if ((t1.pos & POS01) !== 動詞_非自立可能) return null;
    if (!isSimpleAspectAuxActivationAccepted(t1, tokens[pos + teHead.consumed + 1])) return null;
  }
  if (classifyTeTailContinuation(t1, lookups) !== "simple_aspect") return null;
  const potentialDerivation = teTailContinuationDerivationForToken(t1) === "potential";
  const aspectLemma = imperativeFormEntry?.forms[0] ??
    (potentialDerivation ? teTailContinuationLexemeEntryForToken(t1)?.forms[0] : undefined) ??
    t1.dictionaryForm;

  let aspect: SimpleAspectOp["aspect"];
  const directionalAspect = directionalTeAspectFromAux(t1, tokens, pos + teHead.consumed);
  if (directionalAspect !== null) {
    const t1Form = t1.dictionaryForm || t1.surface;
    if (
      (t1Form === "まいる" || t1Form === "参る") &&
      ["ある", "有る"].includes(stemTok.dictionaryForm || "")
    ) {
      return null;
    }
    aspect = directionalAspect;
  } else switch (aspectLemma) {
    case "いる":
    case "居る":
    case "おる":
    case "いらっしゃる":
    case "いらしゃる":
    case "ござる":
    case "御座る":
      aspect = "te_iru";
      break;
    case "ある":
    case "有る":
      aspect = "te_aru";
      break;
    case "おく":
    case "置く":
      aspect = "te_oku";
      break;
    case "しまう":
      aspect = "te_shimau";
      break;
    case "みる":
    case "見る":
      aspect = "te_miru";
      break;
    case "回る":
    case "廻る":
    case "まわる":
      if (teMawaruItinerantVetoed(stemTok.dictionaryForm || stemTok.surface, t1.dictionaryForm || t1.surface, lookups)) {
        return null;
      }
      aspect = "te_mawaru";
      break;
    default:
      return null;
  }
  if (
    aspect === "te_kuru" &&
    lookups.TE_PRECEDING_BENEFACTIVE_REQUEST_VERBS.has(teKuruRequestSourceKey(stemTok)) &&
    teKuruAuxHasFollowingBenefactiveTail(tokens, pos + teHead.consumed, lookups)
  ) {
    return null;
  }
  const splitVolitionalConsumed = splitTeIruVolitionalSuffixConsumed(cursor, pos + teHead.consumed, aspect, lookups);
  const consumed = teHead.consumed + 1 + splitVolitionalConsumed;
  const terminalMood = imperativeFormEntry !== undefined || (t1.pos & POS5A) === 命令形_ ? "imperative" : undefined;
  const lexemeEntry = teTailContinuationLexemeEntryForToken(t1);
  const followingRareruReading = lexemeEntry?.followingRareruReading;
  const auxiliaryHonorific = lexemeEntry?.auxiliaryHonorific;
  if (auxiliaryHonorific === "respect" && (t1.pos & POS5A) === 命令形_) {
    return null;
  }
  cursor.advance(consumed);
  const aspectOp = buildSimpleAspectOp(srcSlice(tokens, pos, consumed), aspect, {
    ...(auxiliaryHonorific === undefined ? {} : { auxiliaryHonorific }),
    ...(terminalMood === undefined ? {} : { terminalMood }),
    ...(followingRareruReading === undefined ? {} : { followingRareruReading }),
    ...(teHead.focusParticle === undefined ? {} : { teFocusParticle: teHead.focusParticle })
  });
  return potentialDerivation
    ? [aspectOp, buildVoiceOp(srcSingle(t1, pos + teHead.consumed), "potential")]
    : [aspectOp];
}

function teKuruRequestSourceKey(token: RuntimeHaruToken): string {
  const form = token.dictionaryForm || token.surface;
  return (token.pos & (POS0 | POS2)) === (名詞 | サ変可能) ? `${form}する` : form;
}

function teKuruAuxHasFollowingBenefactiveTail(
  tokens: readonly RuntimeHaruToken[],
  auxPos: number,
  lookups: LookupTables
): boolean {
  const tePos = auxPos + 1;
  const nextAuxPos = auxPos + 2;
  const te = tokens[tePos];
  const nextAux = tokens[nextAuxPos];
  return te !== undefined &&
    isTeConnectiveToken(te) &&
    nextAux !== undefined &&
    (nextAux.pos & POS01) === 動詞_非自立可能 &&
    isTeBenefactiveActivationAccepted(nextAux, tokens[nextAuxPos + 1]) &&
    classifyTeTailContinuation(nextAux, lookups) === "benefactive";
}

function splitTeIruVolitionalSuffixConsumed(
  cursor: TokenCursor<RuntimeHaruToken>,
  auxPos: number,
  aspect: SimpleAspectOp["aspect"],
  lookups: LookupTables
): number {
  const { tokens } = cursor;
  if (aspect !== "te_iru" || !isSplitTeIruVolitionalStemAt(tokens, auxPos + 1)) {
    return 0;
  }
  const afterYou = auxPos + 2;
  const confirmationCursor = cursor.fork(afterYou, tokens.length, afterYou);
  if (
    confirmationCursor.lookahead(0, matchVolitionalConfirmationJanaiKa) !== null ||
    confirmationCursor.lookahead(0, c => matchJaNaiConfirmationSequence(c, lookups)) !== null ||
    confirmationCursor.lookahead(0, c => matchDewaNaiKaConfirmationSequence(c, lookups)) !== null ||
    confirmationCursor.lookahead(0, c => matchDirectDewaNaiKaConfirmationSequence(c, lookups)) !== null
  ) {
    return 1;
  }
  const next = tokens[afterYou];
  if (next !== undefined && (next.pos & PUNCTUATION_BITS) !== 0) {
    return 1;
  }
  if (
    next !== undefined &&
    next.surface === "と" &&
    quoteMarkerRelationAt(tokens, afterYou, { consumers: ["quote_content"] }) !== null
  ) {
    return 1;
  }
  return 0;
}

function directionalTeAspectFromAux(
  token: RuntimeHaruToken,
  tokens?: readonly RuntimeHaruToken[],
  tokenIdx?: number
): "te_kuru" | "te_iku" | null {
  switch (teTailContinuationDirectionForToken(token)) {
    case "te_kuru":
      return "te_kuru";
    case "te_iku":
      return "te_iku";
    case "by_tense":
      return tokens !== undefined && tokenIdx !== undefined &&
        auxFollowedByPastTa(tokens, tokenIdx)
        ? "te_kuru"
        : "te_iku";
    case undefined:
      return null;
  }
}

function auxFollowedByPastTa(tokens: readonly RuntimeHaruToken[], auxIdx: number): boolean {
  const n1 = tokens[auxIdx + 1];
  if (n1 === undefined) return false;
  if ((n1.pos & POS4) === 助動詞_タ) return true;
  if (n1.dictionaryForm === "ます") {
    const n2 = tokens[auxIdx + 2];
    return n2 !== undefined && (n2.pos & POS4) === 助動詞_タ;
  }
  return false;
}

export function matchTsutsuAruAspect(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  const t1 = cursor.peek(1);
  if (
    t0 === undefined ||
    t1 === undefined ||
    t0.surface !== "つつ" ||
    !isAruVerbToken(t1)
  ) {
    return null;
  }
  cursor.advance(2);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 2), "tsutsu_aru", {
    semantic: {
      reading: "progressive",
      renderStrategy: "resultative_state",
      projection: "default"
    }
  });
}

export function matchTeYaruDeterminedCompletion(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  lookups: LookupTables
): PostverbAuxiliaryOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchTeConnectiveHead(tokens, pos);
  if (teHead === null) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const support = tokens[pos + teHead.consumed];
  if (support === undefined || (support.pos & POS01) !== 動詞_非自立可能) return null;
  const auxiliary = postverbAuxiliaryPayloadForForm(support.dictionaryForm);
  if (auxiliary?.kind !== "determined_completion") return null;
  if (!postverbAuxiliaryDeclaresHostAttachForm(auxiliary, "te_form")) return null;
  if (!isTeBenefactiveActivationAccepted(support, tokens[pos + teHead.consumed + 1])) return null;
  if (stemTok.dictionaryForm !== support.dictionaryForm && !(stemTok.dictionaryForm === "遣る" && support.dictionaryForm === "やる")) {
    return null;
  }
  cursor.advance(teHead.consumed + 1);
  return buildPostverbAuxiliaryOp(srcSlice(tokens, pos, teHead.consumed + 1), auxiliary);
}

export function matchBenefactive(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  lookups: LookupTables,
  previousOps: readonly AuxOpNode[]
): BenefactiveAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined) return null;

  const contractedRequest = cursor.lookahead(0, c => matchRequest(c, lookups));
  if (
    contractedRequest?.aspect === "te_kure_tanomu" &&
    cursor.lookahead(2, c => matchNoda(c, stemToken, {
      previousOps: [...previousOps, contractedRequest],
      lookups
    })) !== null
  ) {
    cursor.advance(2);
    return buildParserBenefactiveAspectOp(contractedRequest.source, "te_kureru");
  }

  const isDirectiveAgeruImperative =
    (t1.pos & POS5A) === 命令形_ && isAgeruClassBenefactiveTail(t1);
  if (!isTeBenefactiveActivationAccepted(t1, tokens[pos + 2]) && !isDirectiveAgeruImperative) {
    return null;
  }
  if (classifyTeTailContinuation(t1, lookups) !== "benefactive") return null;

  const metadata = teBenefactiveContinuationMetadataForToken(t1);
  if (metadata === null) return null;
  if (metadata.aspect === "te_ageru" && (t1.dictionaryForm === "やる" || t1.dictionaryForm === "遣る")) {
    if (stemToken.dictionaryForm === "やる" || stemToken.dictionaryForm === "遣る") return null;
    if (teYaruContinuationOpensTeKuruChainAt(tokens, pos + 1, lookups)) return null;
  }

  const terminalMood = (t1.pos & POS5A) === 命令形_ ? "imperative" : undefined;
  cursor.advance(2);
  return buildParserBenefactiveAspectOp(
    srcSlice(tokens, pos, 2),
    metadata.aspect,
    terminalMood,
    isSashiageruBenefactiveTail(t1)
  );
}

export function buildParserBenefactiveAspectOp(
  source: OpSource,
  aspect: BenefactiveAspectOp["aspect"],
  terminalMood?: BenefactiveAspectOp["terminalMood"],
  sashiageruTail = false
): BenefactiveAspectOp {
  const benefactive: BenefactivePayload = {
    kind: benefactiveKindForAspect(aspect),
    pivot: "unresolved",
    honorific: aspect === "te_kudasaru" || aspect === "te_itadaku" || aspect === "te_itadakeru",
    potential: aspect === "te_moraeru" || aspect === "te_itadakeru",
    tailLemma: sashiageruTail ? "드리다" : null,
    tailIrregular: null,
    tailKoreanPos: sashiageruTail ? 동사 : null,
    lexicalTailAbsorptionKind: null,
    agentParticleIdx: null,
    recipientParticleIdx: null,
    needsBenefactivePivot: false,
    recipientSideHumble: false,
    causativeAgentPolicy: null,
    causativeRenderPolicy: null
  };
  return createAspectOp({

    aspect,
    source,
    ...(terminalMood === undefined ? {} : { terminalMood }),
    benefactive
  });
}

function isSashiageruBenefactiveTail(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "さしあげる" || form === "差し上げる";
}

function isAgeruClassBenefactiveTail(token: RuntimeHaruToken): boolean {
  switch (token.dictionaryForm) {
    case "やる":
    case "遣る":
    case "あげる":
    case "上げる":
    case "さしあげる":
    case "差し上げる":
      return true;
    default:
      return false;
  }
}

function benefactiveKindForAspect(aspect: BenefactiveAspectOp["aspect"]): BenefactivePayload["kind"] {
  switch (aspect) {
    case "te_kureru":
      return "kureru";
    case "te_kudasaru":
      return "kudasaru";
    case "te_ageru":
      return "ageru";
    case "te_morau":
    case "te_moraeru":
      return "morau";
    case "te_itadaku":
    case "te_itadakeru":
      return "itadaku";
  }
}

export function matchDesiderative(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): DesiderativeAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || (t1.pos & POS01) !== (形容詞0 | 非自立可能)) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "desiderative") return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  if (!isTeAuxActivationAccepted(t1, tokens[pos + 2])) return null;

  cursor.advance(2);
  return buildDesiderativeAspectOp(srcSlice(tokens, pos, 2));
}

export function buildDesiderativeAspectOp(source: OpSource): DesiderativeAspectOp {
  const desiderative: DesiderativePayload = {
    kind: "te_hoshii",
    desiredPredicateNegative: false,
    desireNegative: false,
    desirePast: false,
    polite: false,
    desiredClauseForm: "default"
  };
  return createAspectOp({  aspect: "te_hoshii", source, desiderative });
}

export function matchMiseru(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): MiseruAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || (t1.pos & POS01) !== 動詞_非自立可能) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "miseru") return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  if (!isTeAuxActivationAccepted(t1, tokens[pos + 2])) return null;
  cursor.advance(2);
  return buildMiseruAspectOp(srcSlice(tokens, pos, 2));
}

export function buildMiseruAspectOp(
  source: OpSource
): MiseruAspectOp {
  return createAspectOp({ aspect: "te_miseru", source });
}

export function matchCollapsedAspect(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  const aspect = collapsedAspectAuxKind(t0);
  if (aspect === null) return null;
  if (!isSimpleAspectAuxActivationAccepted(t0, tokens[pos + 1])) return null;
  if (aspect === "te_oku" && !hasCollapsedTeOkuTeFormHost(tokens, pos)) return null;
  cursor.advance(1);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 1), aspect);
}

export function matchSplitCollapsedTeIruNegation(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stem: StemNode,
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const teHead = matchEllipticTeIruMarkerHead(tokens, pos, stem);
  const negative = teHead === null ? undefined : tokens[pos + teHead.consumed];
  const precedingMarker = tokens[pos - 1];
  const directMarker = teHead?.focusParticle === undefined && teHead?.consumed === 1;
  const focusedMarker = teHead?.focusParticle !== undefined && teHead.consumed === 2;
  const negativePast = teHead !== null && negative !== undefined &&
    isPastAuxiliaryPos(tokens[pos + teHead.consumed + 1]?.pos ?? 0);
  const negationEnding = teHead === null
    ? null
    : matchNegationEnding(tokens, pos + teHead.consumed, { allowAttributive: true });
  const followingNegativeTeHead = teHead === null || negationEnding === null
    ? null
    : matchTeConnectiveHead(tokens, pos + teHead.consumed + negationEnding.consumed);
  const focusedNegativeTeContinuation = followingNegativeTeHead !== null && (
    followingNegativeTeHead.focusParticle === undefined ||
    (followingNegativeTeHead.focusParticle === "も" && teHead?.focusParticle !== "も")
  );
  const focusedNegativeForm = negative !== undefined &&
    (isTerminalOrAttributiveInflection(negative.pos) ||
      (isRenyouInflection(negative.pos) && (
        negativePast ||
        focusedNegativeTeContinuation
      )));
  if (
    teHead === null ||
    (!directMarker && !focusedMarker) ||
    negative === undefined ||
    !isAdjNai(negative) ||
    !ops.reduce(
      sourceVerbalPredicateAfterAuxOp,
      stemHasSourceVerbalPredicateEvidence(stem),
    ) ||
    (focusedMarker && (
      ops.some((op) => op.kind === "negation") ||
      (precedingMarker !== undefined && isNegationToken(precedingMarker)) ||
      !focusedNegativeForm
    )) ||
    negationEnding === null
  ) {
    return null;
  }
  cursor.advance(teHead.consumed);
  return markEllipticTeIruSourceHost(buildSimpleAspectOp(
    srcSlice(tokens, pos, teHead.consumed),
    "te_iru",
    {
    ...(teHead.focusParticle === undefined ? {} : { teFocusParticle: teHead.focusParticle }),
    ...(teHead.focusParticle === undefined ? {} : { teFocusTarget: "aspect_auxiliary_negation" as const }),
    }
  ));
}

function matchEllipticTeIruMarkerHead(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  stem: StemNode,
): TeConnectiveHead | null {
  const connective = matchTeConnectiveHead(tokens, pos);
  if (connective !== null) {
    return connective;
  }
  const marker = tokens[pos];
  if (
    marker?.surface !== "で" ||
    copulaDeMarkerRelationForToken(marker, pos, { consumers: ["tail_multi_clause"] }) === null ||
    !stemHasVoicedTeFormHostEvidence(stem)
  ) {
    return null;
  }
  return { consumed: 1 };
}

export function markEllipticTeIruSourceHost(aspect: SimpleAspectOp): SimpleAspectOp {
  return {
    ...aspect,
    ellipticTeIruSourceHost: "verbal_predicate",
  };
}

export function collapsedTeIruTokenMarksEllipticNegative(aspect: SimpleAspectOp): boolean {
  const marker = aspect.source.tokens[0];
  return aspect.aspect === "te_iru" &&
    aspect.source.tokens.length === 1 &&
    (marker?.surface === "て" || marker?.surface === "で");
}

function hasCollapsedTeOkuTeFormHost(
  tokens: readonly RuntimeHaruToken[],
  auxPos: number
): boolean {
  const previous = tokens[auxPos - 1];
  if (previous === undefined) {
    return false;
  }
  if (isCausativeAuxTeFormHost(previous) || isCollapsedShimauAuxTeFormHost(previous)) {
    return true;
  }
  if ((previous.pos & POS0) !== 動詞) {
    return false;
  }
  const form = previous.pos & POS5A;
  if (form === 連用形_) {
    return true;
  }
  return form === 未然形_ && (is上一段(previous.pos) || is下一段(previous.pos));
}

function isCausativeAuxTeFormHost(token: RuntimeHaruToken): boolean {
  if (!isSeruCausativeAuxToken(token) && !isShimeruCausativeAuxToken(token)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 連用形_ || form === 未然形_;
}

function isCollapsedShimauAuxTeFormHost(token: RuntimeHaruToken): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const form = token.pos & POS5A;
  return (form === 連用形_ || form === 連用形_促音便) &&
    (
      token.dictionaryForm === "ちゃう" ||
      token.dictionaryForm === "じゃう" ||
      token.dictionaryForm === "ちまう" ||
      token.dictionaryForm === "じまう"
    );
}

export function matchCollapsedHonorific(
  cursor: TokenCursor<RuntimeHaruToken>
): SimpleAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  if ((t0.pos & POS0) !== 助動詞) return null;
  if (!isSimpleAspectAuxActivationAccepted(t0, tokens[pos + 1])) return null;
  const form = t0.dictionaryForm || t0.surface;
  if (form !== "てらっしゃる" && form !== "てらしゃる" &&
    form !== "でらっしゃる" && form !== "でらしゃる") return null;
  cursor.advance(1);
  return buildSimpleAspectOp(srcSlice(tokens, pos, 1), "te_iru", { collapsed: "honorific" });
}

export function matchRequest(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): RequestAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined || !isTeConnectiveToken(t0)) return null;
  if (!teFamilyContinuationHostAdmitted(tokens, pos, lookups)) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined) return null;
  if (isChoudaiRequestContinuationToken(t1)) {
    cursor.advance(2);
    return buildRequestAspectOp(srcSlice(tokens, pos, 2), "chodai");
  }
  if ((t1.pos & POS01) !== 動詞_非自立可能) return null;
  const t1pos5A = t1.pos & POS5A;
  if (t1pos5A !== 命令形_) return null;
  if (classifyTeTailContinuation(t1, lookups) !== "request") return null;

  let requestKind: RequestAspectKind;
  switch (t1.dictionaryForm) {
    case "くださる":
    case "下さる":
      requestKind = "te_kudasai";
      break;
    case "くれる":
    case "呉れる":
      requestKind = "te_kure_tanomu";
      break;
    default:
      return null;
  }

  cursor.advance(2);
  return buildRequestAspectOp(srcSlice(tokens, pos, 2), requestKind);
}

export function matchProhibition(
  cursor: TokenCursor<RuntimeHaruToken>,
  input: ParseInput
): ProhibitionAspectOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  if (!isNaiOrNuToken(t0)) return null;
  const t0pos5A = t0.pos & POS5A;
  if (t0pos5A !== 終止形_) return null;
  const t1 = cursor.peek(1);
  if (t1 === undefined || !isTeConnectiveToken(t1) || t1.surface.charAt(0) !== "で") return null;
  const t2 = cursor.peek(2);
  let polite: boolean;
  let requestTail: ProhibitionPayload["requestTail"];
  if (t2 !== undefined && (t2.pos & POS01) === 動詞_非自立可能) {
    const t2pos5A = t2.pos & POS5A;
    if (t2pos5A !== 命令形_) return null;
    if (
      t2.dictionaryForm !== "くださる" &&
      t2.dictionaryForm !== "下さる" &&
      t2.dictionaryForm !== "くれる" &&
      t2.dictionaryForm !== "呉れる"
    ) return null;
    if (matchTeTailContinuationAt(tokens, pos, input.lookups)?.kind !== "prohibition") return null;
    cursor.advance(3);
    requestTail = t2.dictionaryForm === "くださる" || t2.dictionaryForm === "下さる"
      ? "kudasai"
      : "kure";
    polite = requestTail === "kudasai";
  } else {
    const quoteCarrier = cursor.lookahead(2, c => matchPredicateQuoteCarrier(c, input.lookups));
    const requestQuoteMarker = quoteRequestComplementBoundaryForInput(input, pos + 2);
    if (quoteCarrier === null && requestQuoteMarker === null) {
      return null;
    }
    cursor.advance(2);
    polite = false;
    requestTail = "bare";
  }

  return buildProhibitionAspectOp(
    srcSlice(tokens, pos, cursor.pos - pos),
    polite,
    requestTail
  );
}

export function buildProhibitionAspectOp(
  source: OpSource,
  polite: boolean,
  requestTail: ProhibitionPayload["requestTail"]
): ProhibitionAspectOp {
  return createAspectOp({

    aspect: "naide_kudasai",
    source,
    prohibition: { kind: "naide_kudasai", polite, requestTail }
  });
}

export function buildSimpleAspectOp(
  source: OpSource,
  aspect: SimpleAspectOp["aspect"],
  options: Omit<SimpleAspectOp, "kind" | "aspect" | "source"> = {}
): SimpleAspectOp {
  return createAspectOp({  aspect, source, ...options });
}
