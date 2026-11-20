import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { morphSurface } from "../../../../../types/token.js";
import { consumeAdjacentYoThenTrailingSfpRun, detectSfp, postKaCombinedTerminalSfpAt } from "../../../../semantics/grammar-runtime.js";
import { isColloquialNaiNeeSurface, isFusedSelfQuestionSfpSurface, isNeutralTerminalSfpToken, isPlainNaParticleSurface, isTerminalNeSfpSurface, isTerminalWaSfpSurface, isTerminalYoSfpSurface, terminalSfpLexeme } from "../../../../semantics/sfp-surface.js";
import { TokenCursor } from "../../../../token-cursor.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { quoteBoundarySurfaceFromRelation, quoteConsumedMarkerSpanFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteStructuralRelationAt } from "../../../../structural-relation/quote.js";
import { dewaScopeBridgeRelationAt, kaMarkerRelationAt, predicateNominalizerRelationForToken } from "../../../boundary/marker.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import type { UtteranceClosureKind } from "../../../../clause-layout/utterance-closure.js";
import { janaiConfirmationKaOwnershipKindAt, kaOwnershipKindAt, selfQuestionDiscourseSfpKaRelationAt, terminalQuestionKaRelationAt } from "../../../boundary/ka-ownership.js";
import { participatesInStructuralKaParallel } from "../../../../structural-relation/ka-parallel-ownership.js";
import { type AuxLayerNode, type AuxOpNode, type SfpEffect, type SfpNode, type ConnectiveOp, opVolitionalMoodConsumedByCompanionConjecture } from "../grammar.js";
import { lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import { isKaFamilyQuestionSfpEffect } from "../grammar.js";
import type { ParseInput } from "../parse-input.js";
import { srcSingle, srcSlice } from "../source.js";
import { isBungoProhibitiveNakareToken } from "../classifiers/tokens.js";
import { isPlainNominalizerParticleFollowerAt } from "./nominalizer.js";
import { matchNegationEnding } from "./negation-ending.js";
import { isDegreeExtentParticle } from "../../../../particles/secondary-particle.js";
import { POS0, POS01, pos0in, POS1, POS4, POS5A, PUNCTUATION_BITS, 意志推量形_, isNaAdjCapable, 形容詞0, 終止形_, 終助詞, 準体助詞, 助詞, 助詞_終助詞, 助動詞, 助動詞_ダ, 動詞, 副助詞, 代名詞, 名詞, 命令形_, 連体形_, 連用形_, 助詞_接続助詞, 助詞_副助詞 } from "../../../../../types/pos.js";
import { createConnectiveOp } from "../op-builders.js";
import { adjacentNegationClosesBeforeColloquialNe, isColloquialNaiConnectionForm } from "../parser.js";
import { terminalDiscourseSfpRunClosesUtterance, remainingChunkIsTerminalSfpRun, utteranceClosureAfterParsePosition } from "../parse-closure.js";
import { sourceIndexForInputPosition, contextAlignedPosition, contextCursorForInputPosition } from "../parse-coordinates.js";
import { isSplitTeIruVolitionalStemAt } from "./te-host.js";

export const TERMINAL_SFP_RUN_BRIDGE_LIMIT = 4;

export function matchTerminalSfpArbitration(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemTok: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return matchPredicateConfirmationJanaiSfp(input, cursor, stemTok, ops) ??
    matchTerminalSfp(input, cursor, stemTok, ops) ??
    matchConnectiveFinalSfp(input, cursor, stemTok, ops) ??
    matchTailFinalQuestionSfp(cursor, ops, input.lookups);
}

export function matchPlainNominalizerTerminal(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  allowSliceFinalNominalizer: boolean,
  lookups: LookupTables
): AuxLayerNode["terminalPayload"] | null {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  const nominalizer = predicateNominalizerRelationForToken(token, pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (
    nominalizer?.nominalizerKind !== "no" ||
    (token === undefined || (token.pos & POS1) !== 準体助詞)
  ) {
    return null;
  }
  const next = tokens[pos + 1];
  if (next === undefined) {
    if (pos !== n - 1 || !allowSliceFinalNominalizer) {
      return null;
    }
  } else {
    const context = contextAlignedPosition(input, cursor, pos);
    if (!isPlainNominalizerParticleFollowerAt(
      context.tokens,
      context.index + 1,
      lookups,
      ["tail_boundary_readiness"]
    )) {
      return null;
    }
  }
  cursor.advance();
  return { kind: "nominalized", nominalizerSource: "overt_no", source: srcSingle(token, pos) };
}

function matchTailFinalQuestionSfp(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const speakerAcknowledgment = isSpeakerAcknowledgmentTerminalKa(c, lookups);
    if (!isTailFinalQuestionSfpStart(c, lookups)) return null;
    const marker = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]);
    if (
      !speakerAcknowledgment &&
      marker !== null &&
      terminalQuestionKaRelationAt(tokens, pos, { lookups }) === null &&
      selfQuestionDiscourseSfpKaRelationAt(tokens, pos) === null
    ) {
      return null;
    }
    const token = tokens[pos]!;

    let effect: SfpNode["effect"];
    let surface = token.surface;
    const kaMarker = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"]);
    if (
      kaMarker?.particleSubtype1 === 終助詞 ||
      (kaMarker?.particleSubtype1 === 副助詞 && (
        speakerAcknowledgment ||
        isMistaggedTerminalQuestionKa(c) ||
        isZeroCopulaNominalTerminalQuestionKa(c, lookups)
      ))
    ) {
      const combined = postKaCombinedTerminalSfpAt(tokens, pos);
      if (combined !== null) {
        effect = combined.effect;
        c.advance(1 + combined.consumed);
        surface = tokens.slice(pos, pos + 1 + combined.consumed).map((sourceToken) => sourceToken.surface).join("");
      } else {
        effect = "ka";
        c.advance(1);
      }
    } else if (isFusedSelfQuestionSfpSurface(token)) {
      effect = "kana";
      const kanaNe = tokens[pos + 1];
      if (
        kanaNe !== undefined &&
        (kanaNe.pos & POS01) === 助詞_終助詞 &&
        isTerminalNeSfpSurface(kanaNe)
      ) {
        c.advance(2);
        surface = `${token.surface}${kanaNe.surface}`;
      } else {
        c.advance(1);
      }
    } else {
      return null;
    }

    if (!opsCanAcceptTerminalSfp(ops)) {
      return null;
    }

    return {
      effect,
      surface,
      consumed: c.pos - pos,
      repeatCount: 1,
      ...(speakerAcknowledgment ? { speakerAcknowledgment: true as const } : {}),
      source: srcSlice(tokens, pos, c.pos - pos)
    };
  });
}

function isSpeakerAcknowledgmentTerminalKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  return lookups !== undefined &&
    kaOwnershipKindAt(cursor.tokens, cursor.pos, lookups) === "speaker_acknowledgment" &&
    kaFollowerIsTerminalOnly(cursor);
}

export function isTailFinalQuestionSfpStart(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  if (token === undefined || pos >= n) return false;
  const kaSubtype = kaMarkerRelationAt(tokens, pos, ["tail_multi_clause"])?.particleSubtype1;
  if (isSpeakerAcknowledgmentTerminalKa(cursor, lookups)) return true;
  if (kaSubtype === 副助詞) {
    return isMistaggedTerminalQuestionKa(cursor) ||
      isZeroCopulaNominalTerminalQuestionKa(cursor, lookups);
  }
  if ((token.pos & POS01) !== 助詞_終助詞) return false;
  return kaSubtype === 終助詞 || isFusedSelfQuestionSfpSurface(token);
}

function isMistaggedTerminalQuestionKa(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos } = cursor;
  const prev = previousNonSpaceIndex(tokens, pos);
  if (prev === null) {
    return false;
  }
  const prevTok = tokens[prev];
  if (prevTok === undefined) {
    return false;
  }
  if (isDegreeExtentParticle(prevTok)) {
    return kaFollowerIsTerminalOnly(cursor);
  }
  const prevPos0 = prevTok.pos & POS0;
  if (prevPos0 !== 動詞 && prevPos0 !== 形容詞0 && prevPos0 !== 助動詞) {
    return false;
  }
  const prevForm = prevTok.pos & POS5A;
  if (prevForm !== 終止形_ && prevForm !== 意志推量形_) {
    return false;
  }
  return kaFollowerIsTerminalOnly(cursor);
}

function isZeroCopulaNominalTerminalQuestionKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups?: LookupTables
): boolean {
  if (lookups === undefined) {
    return false;
  }
  const { tokens, pos } = cursor;
  const prev = previousNonSpaceIndex(tokens, pos);
  if (prev === null) {
    return false;
  }
  const prevPos0 = (tokens[prev]?.pos ?? 0) & POS0;
  if (prevPos0 !== 名詞 && prevPos0 !== 代名詞) {
    return false;
  }
  const kind = kaOwnershipKindAt(tokens, pos, lookups);
  if (kind !== "question" && kind !== "self_question_kana") {
    return false;
  }
  if (participatesInStructuralKaParallel(cursor.fork(pos, tokens.length, pos), lookups)) {
    return false;
  }
  return kaFollowerIsTerminalOnly(cursor);
}

function kaFollowerIsTerminalOnly(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function isTerminalNanteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function nanteContextFollowerCloses(input: ParseInput, pos: number): boolean {
  const contextTokens = input.contextTokens ?? input.tokens;
  let idx = nextNonSpaceIndex(
    contextTokens,
    sourceIndexForInputPosition(input, pos) + 1,
    contextTokens.length
  );
  while (idx !== null) {
    const token = contextTokens[idx];
    if (token === undefined) {
      return true;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS)) {
      return true;
    }
    if ((token.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
    idx = nextNonSpaceIndex(contextTokens, idx + 1, contextTokens.length);
  }
  return true;
}

function isTerminalBareTteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const scan = cursor.fork(cursor.pos + 1);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function isTerminalInsistentTteFollower(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const ba = cursor.tokens[cursor.pos + 1];
  if (ba === undefined || (ba.pos & POS01) !== 助詞_接続助詞 || ba.dictionaryForm !== "ば") {
    return false;
  }
  const scan = cursor.fork(cursor.pos + 2);
  while (scan.pos < scan.end) {
    const token = scan.current();
    if (token === undefined) {
      break;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS) || (token.pos & POS01) === 助詞_終助詞) {
      scan.advance();
      continue;
    }
    return false;
  }
  return true;
}

function matchTerminalSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    if (!opsCanAcceptTerminalSfp(ops)) return null;
    const token = tokens[pos];
    const precedingIdx = previousNonSpaceIndex(tokens, pos);
    const precedingToken = precedingIdx === null ? undefined : tokens[precedingIdx];
    if (
      token !== undefined &&
      isColloquialNaiNeeSurface(token.surface) &&
      (token.pos & POS01) === 助詞_終助詞 &&
      precedingToken !== undefined &&
      isColloquialNaiConnectionForm(precedingToken) &&
      !adjacentNegationClosesBeforeColloquialNe(ops)
    ) {
      return null;
    }
    if (
      token !== undefined &&
      token.surface === "なんて" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      isTerminalNanteFollower(c) &&
      nanteContextFollowerCloses(input, pos)
    ) {
      c.advance();
      consumeAdjacentYoThenTrailingSfpRun(c, stemToken.pos & POS0, ops.length > 0);
      const consumed = c.pos - pos;
      return {
        effect: "nante_excl",
        surface: tokens.slice(pos, pos + consumed).map((sourceToken) => sourceToken.surface).join(""),
        consumed,
        repeatCount: 1,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      token !== undefined &&
      token.surface === "って" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      isTerminalInsistentTteFollower(c)
    ) {
      c.advance(2);
      return {
        effect: "quotative_insistent",
        surface: "ってば",
        consumed: 2,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 2)
      };
    }
    if (
      token !== undefined &&
      token.surface === "って" &&
      (token.pos & POS01) === 助詞_副助詞 &&
      (stemToken.pos & POS5A) === 命令形_ &&
      isTerminalBareTteFollower(c)
    ) {
      c.advance();
      return {
        effect: "quotative_command",
        surface: "って",
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1)
      };
    }
    const followingSfp = tokens[pos + 1];
    if (
      token !== undefined &&
      followingSfp !== undefined &&
      isTerminalWaSfpSurface(token) &&
      isTerminalNeSfpSurface(followingSfp) &&
      (token.pos & POS01) === 助詞_終助詞 &&
      (followingSfp.pos & POS01) === 助詞_終助詞
    ) {
      c.advance(2);
      const discursiveNeHost =
        (stemToken.pos & POS0) === 名詞 ||
        (stemToken.pos & POS0) === 形容詞0 ||
        isNaAdjCapable(stemToken);
      return {
        effect: discursiveNeHost ? "ne" : null,
        surface: `${token.surface}${followingSfp.surface}`,
        consumed: 2,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 2)
      };
    }
    if (
      token !== undefined &&
      isBungoProhibitiveNakareToken(token) &&
      ops.length === 0 &&
      (stemToken.pos & POS0) === 動詞 &&
      canAttachNaProhibitiveTerminalSfp(stemToken, ops)
    ) {
      c.advance();
      return {
        effect: "na_prohib",
        surface: token.surface,
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1),
        unambiguousProhibitive: true
      };
    }
    const detected = detectSfp(c, stemToken.pos & POS0, ops.length > 0);
    let consumed = c.pos - pos;
    if (consumed <= 0) {
      return matchNeutralTerminalSfp(c);
    }
    let parsed = sfpEffectFromDetected(detected);
    if (parsed === null) return null;
    const finalOp = ops.at(-1);
    if (
      parsed.effect === "na_excl" &&
      isPlainNaParticleSurface(token?.surface) &&
      finalOp?.kind === "aspect" &&
      (finalOp.aspect === "te_kuru" || finalOp.aspect === "te_iku")
    ) {
      parsed = { ...parsed, effect: "na_prohib" };
    }
    if (
      (parsed.effect === "jan" || parsed.effect === "yone_confirm") &&
      (isVolitionalTerminalContext(stemToken, ops) ||
        (isTerminalYoSfpSurface(token) && isImperativeTerminalContext(stemToken, ops)))
    ) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      parsed.effect === "speaker_assertion" &&
      (isVolitionalTerminalContext(stemToken, ops) || isImperativeTerminalContext(stemToken, ops))
    ) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (parsed.effect === "na_prohib" && !canAttachNaProhibitiveTerminalSfp(stemToken, ops)) {
      return {
        effect: null,
        surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
        consumed,
        repeatCount: parsed.repeatCount,
        source: srcSlice(tokens, pos, consumed)
      };
    }
    if (
      isKaFamilyQuestionSfpEffect(parsed.effect) ||
      parsed.effect === "kana" ||
      parsed.effect === "polite_q" ||
      parsed.effect === "neg_confirm_q" ||
      parsed.effect === "neg_invite_q" ||
      parsed.effect === "neg_plain_q"
    ) {
      return null;
    }
    if (parsed.effect === "na_prohib") {
      consumeAdjacentYoThenTrailingSfpRun(c, stemToken.pos & POS0, ops.length > 0);
      consumed = c.pos - pos;
    }
    return {
      effect: parsed.effect,
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed,
      repeatCount: parsed.repeatCount,
      source: srcSlice(tokens, pos, consumed)
    };
  });
}

function matchNeutralTerminalSfp(
  cursor: TokenCursor<RuntimeHaruToken>
): SfpNode | null {
  const { tokens, pos, end: n } = cursor;
  const token = tokens[pos];
  if (
    token === undefined ||
    pos >= n ||
    !isNeutralTerminalSfpToken(token)
  ) {
    return null;
  }
  cursor.advance();
  return {
    effect: null,
    surface: token.surface,
    consumed: 1,
    repeatCount: 1,
    source: srcSlice(tokens, pos, 1)
  };
}

function canAttachNaProhibitiveTerminalSfp(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if (ops.length > 0) {
    return true;
  }
  const conjugationForm5A = stemToken.pos & POS5A;
  return conjugationForm5A === 終止形_ ||
    conjugationForm5A === 連体形_ ||
    (
      conjugationForm5A === 0 &&
      stemToken.dictionaryForm.length > 0 &&
      morphSurface(stemToken) === stemToken.dictionaryForm
    );
}

export function matchPredicateConfirmationJanaiSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  const { pos, end: n } = cursor;
  if (!opsCanAcceptTerminalSfp(ops) || pos >= n) {
    return null;
  }
  const volitional = isVolitionalTerminalContext(stemToken, ops);
  if (ops.length === 0 && !volitional) {
    return null;
  }
  const ownershipTokens = input.contextTokens ?? input.tokens;
  const kaOwnershipAt = (pos: number) => janaiConfirmationKaOwnershipKindAt(
    ownershipTokens,
    sourceIndexForInputPosition(input, pos)
  );
  const jaMatch = cursor.tx(c => matchJaNaiConfirmationSequence(c, input.lookups, kaOwnershipAt));
  if (jaMatch !== null) {
    return volitional ? neutralizeSfpNodeEffect(jaMatch) : jaMatch;
  }
  const dewaMatch = cursor.tx(c => matchDewaNaiKaConfirmationSequence(c, input.lookups));
  if (dewaMatch !== null) {
    return volitional ? neutralizeSfpNodeEffect(dewaMatch) : dewaMatch;
  }
  const directDewaMatch = volitional
    ? cursor.tx(c => matchDirectDewaNaiKaConfirmationSequence(c, input.lookups))
    : null;
  if (directDewaMatch === null) return null;
  return neutralizeSfpNodeEffect(directDewaMatch);
}

export function matchVolitionalConfirmationQuotativeConnective(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): ConnectiveOp | null {
  return cursor.tx(cursor => {
    const pos = cursor.pos;
    if (!opsCanAcceptTerminalSfp(ops) || !isVolitionalTerminalContext(stemToken, ops)) {
      return null;
    }
    if (matchVolitionalConfirmationJanaiKa(cursor) === null) {
      return null;
    }
    const quotePos = cursor.pos;
    const contextTokens = input.contextTokens ?? input.tokens;
    const absoluteQuotePos = sourceIndexForInputPosition(input, quotePos);
    const relation = quoteStructuralRelationAt(contextCursorForInputPosition(input, quotePos), input.lookups);
    if (relation === undefined || relation.quote.slotKind !== "quoted_content") {
      return null;
    }
    const markerSpan = quoteConsumedMarkerSpanFromRelation(contextTokens, relation, input.lookups, {
      lowerBoundInclusive: absoluteQuotePos
    });
    const surface = quoteBoundarySurfaceFromRelation(contextTokens, relation, input.lookups, {
      lowerBoundInclusive: absoluteQuotePos
    });
    if (markerSpan === null || surface === null || markerSpan.start !== absoluteQuotePos) {
      return null;
    }
    const sourceStart = sourceIndexForInputPosition(input, pos);
    const markerConsumed = consumedForSourceTokenSpan(input, pos, {
      start: sourceStart,
      endExclusive: markerSpan.endExclusive
    });
    if (markerConsumed === null) {
      return null;
    }
    cursor.advance(markerConsumed - (cursor.pos - pos));
    return createConnectiveOp({

      connective: "quotative",
      surface,
      source: srcSlice(input.tokens, pos, markerConsumed)
    });
  });
}

function consumedForSourceTokenSpan(
  input: ParseInput,
  pos: number,
  span: { readonly start: number; readonly endExclusive: number }
): number | null {
  if (span.endExclusive <= span.start || sourceIndexForInputPosition(input, pos) !== span.start) {
    return null;
  }
  for (let index = pos; index < input.tokens.length; index += 1) {
    const current = sourceIndexForInputPosition(input, index);
    if (current === span.endExclusive - 1) {
      return index + 1 - pos;
    }
    if (current >= span.endExclusive) {
      return null;
    }
  }
  return null;
}

function matchConfirmationJanaiKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => matchJaNaiConfirmationKa(c) ?? matchDewaNaiKaConfirmationKa(c));
}

export function matchVolitionalConfirmationJanaiKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => matchConfirmationJanaiKa(c) ?? matchDirectDewaNaiKaConfirmationKa(c));
}

function matchJaNaiConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const ja = tokens[pos];
    if (
      ja === undefined ||
      ja.surface !== "じゃ" ||
      (ja.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
    ) {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(1 + negEnd.consumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function matchDewaNaiKaConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const relation = dewaScopeBridgeRelationAt(tokens, pos, {
      anchorIdx: pos,
      consumers: ["tail_multi_clause"]
    });
    if (relation?.focusParticle !== "wa") {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, relation.span.endExclusive, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(relation.span.endExclusive - pos + negEnd.consumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function matchDirectDewaNaiKaConfirmationKa(cursor: TokenCursor<RuntimeHaruToken>): true | null {
  return cursor.tx(c => {
    const baseConsumed = directDewaNaiKaConfirmationBaseConsumed(c.tokens, c.pos);
    if (baseConsumed === null) {
      return null;
    }
    c.advance(baseConsumed);
    return consumeConfirmationKa(c, ["quote_content"]) ? true : null;
  });
}

function directDewaNaiKaConfirmationBaseConsumed(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  const de = tokens[pos];
  const wa = tokens[pos + 1];
  if (
    de === undefined ||
    wa === undefined ||
    de.surface !== "で" ||
    (de.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_) ||
    wa.surface !== "は" ||
    (wa.pos & POS0) !== 助詞
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, pos + 2, { allowAttributive: true });
  if (negEnd === null || negEnd.polite) {
    return null;
  }
  return 2 + negEnd.consumed;
}

function consumeConfirmationKa(
  cursor: TokenCursor<RuntimeHaruToken>,
  consumers: readonly ("quote_content" | "tail_multi_clause")[]
): boolean {
  const kaPos = cursor.pos;
  const ka = cursor.current();
  if (
    ka !== undefined &&
    kaPos < cursor.end &&
    kaMarkerRelationAt(cursor.tokens, kaPos, consumers)?.particleSubtype1 === 終助詞
  ) {
    cursor.advance();
    return true;
  }
  return false;
}

export function isVolitionalTerminalContext(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if ((stemToken.pos & POS5A) === 意志推量形_) {
    return true;
  }
  return ops.some((op) => {
    if (op.kind === "conjecture") {
      return false;
    }
    if (opVolitionalMoodConsumedByCompanionConjecture(op, ops)) {
      return false;
    }
    const sourceToken = op.source.tokens[op.source.tokens.length - 1];
    return ((sourceToken?.pos ?? 0) & POS5A) === 意志推量形_ ||
      isSplitTeIruVolitionalSource(op.source.tokens);
  });
}

function isSplitTeIruVolitionalSource(tokens: readonly RuntimeHaruToken[]): boolean {
  return tokens.length >= 2 && isSplitTeIruVolitionalStemAt(tokens, tokens.length - 1);
}

function isImperativeTerminalContext(
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  if ((stemToken.pos & POS5A) === 命令形_) {
    return true;
  }
  return ops.some((op) => {
    const sourceToken = op.source.tokens[op.source.tokens.length - 1];
    return ((sourceToken?.pos ?? 0) & POS5A) === 命令形_;
  });
}

function neutralizeSfpNodeEffect(
  node: SfpNode
): SfpNode {
  return {
    ...node,
    effect: null
  };
}

export function matchJaNaiConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  kaOwnershipAt?: (pos: number) => ReturnType<typeof janaiConfirmationKaOwnershipKindAt>
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const ja = c.current();
    if (
      ja === undefined ||
      ja.surface !== "じゃ" ||
      (ja.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
    ) {
      return null;
    }
    const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
    if (negEnd === null) {
      return null;
    }
    c.advance(1 + negEnd.consumed);
    if (!finishConfirmationJanai(c, false, lookups, negEnd.polite, kaOwnershipAt)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos, negEnd.polite);
  });
}

export function matchDewaNaiKaConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const relation = dewaScopeBridgeRelationAt(tokens, pos, {
      anchorIdx: pos,
      consumers: ["tail_multi_clause"]
    });
    if (relation?.focusParticle !== "wa") {
      return null;
    }
    const dewaConsumed = relation.span.endExclusive - pos;
    const negEnd = matchNegationEnding(tokens, relation.span.endExclusive, { allowAttributive: true });
    if (negEnd === null || negEnd.polite) {
      return null;
    }
    c.advance(dewaConsumed + negEnd.consumed);
    if (!finishConfirmationJanai(c, true, lookups)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos);
  });
}

export function matchDirectDewaNaiKaConfirmationSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const baseConsumed = directDewaNaiKaConfirmationBaseConsumed(tokens, pos);
    if (baseConsumed === null) {
      return null;
    }
    c.advance(baseConsumed);
    if (!finishConfirmationJanai(c, false, lookups)) {
      return null;
    }
    return buildConfirmationJanaiSfp(tokens, pos, c.pos - pos);
  });
}

const CONFIRMATION_JANAI_ABSORBABLE_SFP_LOOKUP = "janai_confirmation_absorbable_follower_sfp";

function confirmationJanaiDiscourseFollowerRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): number | null {
  const absorbable = lookups.named(CONFIRMATION_JANAI_ABSORBABLE_SFP_LOOKUP);
  if (absorbable === undefined) {
    return null;
  }
  let offset = 0;
  if (cursor.tokens[cursor.pos]?.surface === "の") {
    offset += 1;
  }
  for (let index = cursor.pos + offset; index < cursor.end; index += 1) {
    const token = cursor.tokens[index]!;
    const canonical = terminalSfpLexeme(token);
    if (
      canonical === null ||
      !absorbable.has(canonical)
    ) {
      return null;
    }
    offset += 1;
  }
  return offset === 0 ? null : offset;
}

function finishConfirmationJanai(
  cursor: TokenCursor<RuntimeHaruToken>,
  requireKa: boolean,
  lookups: LookupTables,
  requireReactionMarker = false,
  kaOwnershipAt?: (pos: number) => ReturnType<typeof janaiConfirmationKaOwnershipKindAt>
): boolean {
  if (!requireKa && !requireReactionMarker && cursor.pos === cursor.end) {
    return true;
  }
  if (!requireKa && !requireReactionMarker) {
    const followers = confirmationJanaiDiscourseFollowerRun(cursor, lookups);
    if (followers !== null) {
      cursor.advance(followers);
      return true;
    }
  }
  const kaOwner = kaOwnershipAt?.(cursor.pos) ??
    janaiConfirmationKaOwnershipKindAt(cursor.tokens, cursor.pos);
  if (kaOwner === "question") {
    cursor.advance();
    return true;
  }
  return false;
}

function buildConfirmationJanaiSfp(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  consumed: number,
  polite = false
): SfpNode {
  return {
    effect: "jan",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed,
    repeatCount: 1,
    ...(polite ? { polite: true } : {}),
    source: srcSlice(tokens, pos, consumed)
  };
}

const TE_QUESTION_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "clause_boundary",
  "decorative_terminal"
]);

function matchConnectiveFinalSfp(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): SfpNode | null {
  return cursor.tx(c => {
    const { tokens, pos } = c;
    const lastOp = ops.at(-1);
    if (lastOp?.kind !== "connective") return null;
    const context = contextAlignedPosition(input, c, pos);
    if (
      lastOp.connective === "te_form" &&
      lookupConnectiveBySurface(lastOp.surface) === "te_form" &&
      terminalQuestionKaRelationAt(context.tokens, context.index, { lookups: input.lookups }) !== null &&
      TE_QUESTION_CLOSURES.has(utteranceClosureAfterParsePosition(input, pos))
    ) {
      c.advance();
      return {
        effect: "ka",
        surface: tokens[pos]!.surface,
        consumed: 1,
        repeatCount: 1,
        source: srcSlice(tokens, pos, 1)
      };
    }
    const detected = detectSfp(c, stemToken.pos & POS0, true);
    const consumed = c.pos - pos;
    if (consumed <= 0) return null;
    const parsed = sfpEffectFromDetected(detected);
    if (parsed === null) return null;
    return {
      effect: lastOp.terminalDiscourseHost === true ? parsed.effect : null,
      surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
      consumed,
      repeatCount: parsed.repeatCount,
      source: srcSlice(tokens, pos, consumed)
    };
  });
}

export function sfpEffectFromDetected(
  detected: string | null
): { readonly effect: SfpEffect | null; readonly repeatCount: number } | null {
  if (detected === null) {
    return { effect: null, repeatCount: 1 };
  }
  if (detected === "role_cat_nya") {
    return { effect: "role_cat_nya", repeatCount: 1 };
  }
  const rolePrefix = "role_cat_nya:";
  if (detected.startsWith(rolePrefix)) {
    const repeatCount = Number.parseInt(detected.slice(rolePrefix.length), 10);
    return Number.isFinite(repeatCount) && repeatCount > 0
      ? { effect: "role_cat_nya", repeatCount }
      : null;
  }
  switch (detected) {
    case "ne":
    case "na_excl":
    case "na_prohib":
    case "na_soft_imperative":
    case "kana":
    case "jan":
    case "yone_confirm":
    case "kke":
    case "explanatory":
    case "volitional_resolve":
    case "speaker_assertion":
    case "ka":
    case "polite_q":
    case "neg_confirm_q":
    case "neg_invite_q":
    case "neg_plain_q":
      return { effect: detected, repeatCount: 1 };
    default:
      return null;
  }
}

export function opsCanAcceptTerminalSfp(ops: readonly AuxOpNode[]): boolean {
  return ops.at(-1)?.kind !== "connective";
}

export function remainderIsChainFinalSfpRun(
  cursor: TokenCursor<RuntimeHaruToken>,
  start: number,
  stemToken: RuntimeHaruToken
): boolean {
  if (start >= cursor.end) {
    return false;
  }
  const probe = cursor.fork(start);
  detectSfp(probe, stemToken.pos & POS0, true);
  return probe.pos > start && probe.pos === cursor.end;
}

export function matchDialectalRedundantTerminalParticle(
  input: ParseInput,
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[]
): boolean {
  const token = cursor.current();
  if (token === undefined) {
    return false;
  }
  const isAdversativeGa = token.surface === "が" && (token.pos & POS01) === 助詞_接続助詞;
  const previousOp = ops[ops.length - 1];
  const isRedundantKa = token.surface === "か" &&
    (token.pos & POS01) === 助詞_終助詞 &&
    previousOp?.kind === "connective" &&
    previousOp.connective === "te_form" &&
    terminalSfpLexeme(cursor.peek(1)) === "さ";
  if (!isAdversativeGa && !isRedundantKa) {
    return false;
  }
  if (isAdversativeGa) {
    const ka = cursor.peek(1);
    if (ka === undefined || ka.surface !== "か" || (ka.pos & POS01) !== 助詞_終助詞) {
      return false;
    }
  }
  if (
    !remainingChunkIsTerminalSfpRun(cursor, 1) &&
    !terminalDiscourseSfpRunClosesUtterance(cursor, input, 1)
  ) {
    return false;
  }
  cursor.advance(1);
  return true;
}
