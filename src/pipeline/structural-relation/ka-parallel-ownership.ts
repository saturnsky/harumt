import type { RuntimeHaruToken } from "../../types/token.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../clause-layout/trivia.js";
import type { ClauseAdjacencyToken } from "../clause-layout/trivia.js";
import { runClosesUtteranceAs, utteranceClosureRunAfter } from "../clause-layout/utterance-closure.js";
import type {
  UtteranceClosureKind,
  UtteranceClosureScope,
  UtteranceClosureToken
} from "../clause-layout/utterance-closure.js";
import type { BoundaryToken } from "../head-tail/boundary/punctuation.js";
import { hasWeakPunctuationClass } from "../head-tail/boundary/punctuation.js";
import { kaMarkerRelationAt, predicateNominalizerRelationForToken } from "../head-tail/boundary/marker.js";
import { enumerateClausePhrasesAfter, type PhraseEnumerationLayout } from "../clause-layout/phrase-enumeration.js";
import { isPredicateLikeBeforeKa } from "../quote/embedded-question.js";
import { isKamoShirenaiModalStartAt } from "../head-tail/tail/predicate-root/matchers/kamo-modal.js";
import { TokenCursor } from "../token-cursor.js";
import { nominalFrameOwnsKaMarkerAt } from "../head-tail/tail/segments/nominal-frame.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  isFusedWhIndefiniteParticleToken,
  kaOwnershipKindAt,
  kaOwnershipKindBeforeAcknowledgmentAt,
  selfQuestionDiscourseSfpKaRelationAt,
  speakerAcknowledgmentKaHostRelationAt
} from "../head-tail/boundary/ka-ownership.js";

import { POS0, pos0in, 記号, 助詞, 助動詞, 補助記号 } from "../../types/pos.js";

function isStructuralKaMarker(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  return kaMarkerRelationAt(cursor.tokens, cursor.pos, ["structural_relation_ka_parallel"]) !== null &&
    !isKamoShirenaiModalStartAt(cursor);
}

export function isStructuralKaParallelMarkerAt(
  tokens: readonly BoundaryToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  return kaMarkerRelationAt(tokens, kaIdx, ["structural_relation_ka_parallel"]) !== null &&
    selfQuestionDiscourseSfpKaRelationAt(tokens, kaIdx) === null &&
    kaOwnershipKindAt(tokens, kaIdx, lookups) === "question" &&
    !nominalFrameOwnsKaMarkerAt(tokens as readonly RuntimeHaruToken[], kaIdx, lookups);
}

function cursorIsStructuralKaParallelMarker(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  return isStructuralKaParallelMarkerAt(cursor.tokens, cursor.pos, lookups) &&
    !isKamoShirenaiModalStartAt(cursor);
}

function isKaDouKaCompositeMember(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const { tokens, pos: kaIdx } = cursor;
  const n = cursor.end;
  if (!isStructuralKaMarker(cursor)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, kaIdx + 1, n);
  if (nextIdx !== null && tokens[nextIdx]?.surface === "どう") {
    const afterDou = nextNonSpaceIndex(tokens, nextIdx + 1, n);
    return afterDou !== null && cursor.lookahead(afterDou - cursor.pos, isStructuralKaMarker);
  }
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null || tokens[prevIdx]?.surface !== "どう") {
    return false;
  }
  const beforeDou = previousNonSpaceIndex(tokens, prevIdx);
  return beforeDou !== null && cursor.lookahead(beforeDou - cursor.pos, isStructuralKaMarker);
}

export function hasPreviousStructuralKaParallelMarkerInSameExpression(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  return previousStructuralKaParallelMarkerInSameExpression(cursor, lookups) !== null;
}

function previousStructuralKaParallelMarkerInSameExpression(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): number | null {
  const { tokens, pos: kaIdx } = cursor;
  let sawChoiceContent = false;
  for (let index = kaIdx - 1; index >= 0 && kaIdx - index <= 12; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (pos0in(token.pos, (1 << 助動詞))) {
      continue;
    }
    if (cursor.lookahead(index - cursor.pos, isStructuralKaMarker)) {
      if (
        kaOwnershipKindBeforeAcknowledgmentAt(tokens, index, lookups) === "wh_indefinite" ||
        cursor.lookahead(index - cursor.pos, isKaDouKaCompositeMember)
      ) {
        return null;
      }
      return sawChoiceContent ? index : null;
    }
    if ((token.pos & POS0) === 助詞) {
      return null;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 補助記号 || pos0 === 記号) {
      if (hasWeakPunctuationClass(token, index, ["japanese_comma", "ascii_comma"], ["structural_relation_ka_parallel"])) {
        continue;
      }
      return null;
    }
    sawChoiceContent = true;
  }
  return null;
}

function followingStructuralKaMarkerBeforeStrongBoundary(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): number | null {
  const { tokens, pos: startPos } = cursor;
  const n = cursor.end;
  for (let index = startPos; index < n && index - startPos <= 80; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (cursor.lookahead(index - cursor.pos, isStructuralKaMarker)) {
      return cursor.lookahead(index - cursor.pos, isKaDouKaCompositeMember) ||
        kaOwnershipKindBeforeAcknowledgmentAt(tokens, index, lookups) === "wh_indefinite"
        ? null
        : index;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 補助記号 || pos0 === 記号) {
      if (hasWeakPunctuationClass(token, index, ["japanese_comma", "ascii_comma"], ["structural_relation_ka_parallel"])) {
        continue;
      }
      return null;
    }
  }
  return null;
}

export function participatesInStructuralKaParallel(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): boolean {
  const currentIsKaMarker = isStructuralKaMarker(cursor);
  if (
    (currentIsKaMarker && !cursorIsStructuralKaParallelMarker(cursor, lookups)) ||
    isKaDouKaCompositeMember(cursor)
  ) {
    return false;
  }
  if (hasPreviousStructuralKaParallelMarkerInSameExpression(cursor, lookups)) {
    return true;
  }
  return cursor.lookahead(1, c => followingStructuralKaMarkerBeforeStrongBoundary(c, lookups)) !== null;
}

export function belongsToStructuralKaChoiceGroupAt(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const cursor = new TokenCursor(tokens, kaIdx, tokens.length);
  if (isKaDouKaCompositeMember(cursor)) {
    return false;
  }
  const counterpartIdx = previousStructuralKaParallelMarkerInSameExpression(cursor, lookups) ??
    cursor.lookahead(1, c => followingStructuralKaMarkerBeforeStrongBoundary(c, lookups));
  if (counterpartIdx === null) {
    return false;
  }
  if (speakerAcknowledgmentKaHostRelationAt(tokens, counterpartIdx, lookups) !== null) {
    return false;
  }
  if (selfQuestionDiscourseSfpKaRelationAt(tokens, counterpartIdx) !== null) {
    return false;
  }
  if (kaOwnershipKindAt(tokens, counterpartIdx, lookups) !== "question") {
    return false;
  }
  return isParallelChoiceMemberHost(tokens, counterpartIdx, lookups);
}

function isParallelChoiceMemberHost(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const nominalizedIdx = pronominalNominalizerIndexBeforeKa(tokens, kaIdx);
  const hostAnchorIdx = nominalizedIdx ?? kaIdx;
  if (isPredicateLikeBeforeKa(tokens, hostAnchorIdx)) {
    return true;
  }
  const hostIdx = previousNonSpaceIndex(tokens, hostAnchorIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  return host !== undefined &&
    lookups.SPEECH_ACT_DEMO_ANAPHOR_ANCHORS.has(host.dictionaryForm || host.surface);
}

function pronominalNominalizerIndexBeforeKa(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number
): number | null {
  const prevIdx = previousNonSpaceIndex(tokens, kaIdx);
  if (prevIdx === null) {
    return null;
  }
  return predicateNominalizerRelationForToken(tokens[prevIdx], prevIdx, {
    requirement: "tail_connective_marker",
    consumers: ["structural_relation_ka_parallel"]
  })?.nominalizerKind === "no"
    ? prevIdx
    : null;
}

function closesUtteranceAfterChoiceMember(
  layout: (PhraseEnumerationLayout & UtteranceClosureScope) | null,
  tokens: readonly RuntimeHaruToken[],
  afterIdx: number
): boolean {
  const traversal = utteranceClosureRunAfter(
    layout,
    tokens as unknown as readonly (UtteranceClosureToken & ClauseAdjacencyToken)[],
    afterIdx
  );
  return traversal.endedBy !== "content" && runClosesUtteranceAs(traversal, CHOICE_MEMBER_CLOSING_CLOSURES);
}

const CHOICE_MEMBER_CLOSING_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set<UtteranceClosureKind>([
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing",
  "decorative_terminal"
]);

export function kaChoiceAlternativeCounterpartAfter(
  layout: (PhraseEnumerationLayout & UtteranceClosureScope) | null,
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables,
): boolean {
  let bareNominalEndIdx: number | null = null;
  for (const item of enumerateClausePhrasesAfter(layout, tokens, markerIdx, { scope: "evidence_window" })) {
    if (item.kind === "nominal") {
      if (
        item.markerParticleIdx !== null &&
        kaMarkerRelationAt(tokens, item.markerParticleIdx, ["quote_content"]) !== null
      ) {
        return true;
      }
      bareNominalEndIdx = item.markerParticleIdx === null ? item.span.endExclusive : null;
      continue;
    }
    if (item.kind === "marker_particle") {
      if (isFusedWhIndefiniteParticleToken(tokens[item.span.start], lookups)) {
        return true;
      }
      if (
        bareNominalEndIdx === item.span.start &&
        kaMarkerRelationAt(tokens, item.span.start, ["quote_content"]) !== null &&
        closesUtteranceAfterChoiceMember(layout, tokens, item.span.endExclusive)
      ) {
        return true;
      }
    }
    if (item.kind === "adverbial" || item.kind === "punctuation_weak") {
      continue;
    }
    return false;
  }
  return false;
}
