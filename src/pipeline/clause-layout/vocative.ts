import { isContentInternalConnectorToken, isWeakPunctuationToken } from "../head-tail/boundary/punctuation.js";
import type { LookupTables } from "../lookup-tables.js";
import { isClausePunctuationToken } from "./punctuation.js";
import { DETACHED_SEPARATIONS, separatedAs } from "./trivia.js";
import { isPersonToken } from "../head-tail/candidate/semantic-classifiers.js";
import { POS0, pos0in, 接頭辞, 接尾辞, NOMINAL_BITS, isCounterCapableToken } from "../../types/pos.js";
import type { ClauseToken } from "./layout-types.js";
import { skipTerminalParticleRun } from "./trivia.js";

export function isPostposedVocativeHead(
  tokens: readonly ClauseToken[],
  idx: number,
  lookups: LookupTables,
  extent: "head" | "noun_phrase" = "head"
): boolean {
  const head = tokens[idx];
  if (head === undefined) {
    return false;
  }
  if (extent === "head") {
    if (!isPersonToken(head, lookups)) {
      return false;
    }
    const cursor = skipTerminalParticleRun(tokens, idx + 1);
    return cursor === null || isClausePunctuationToken(tokens[cursor]);
  }
  if (!pos0in(head.pos, NOMINAL_BITS)) {
    return false;
  }
  const end = vocativeNounPhraseEnd(tokens, idx);
  let headIdx = end;
  while (headIdx > idx && (tokens[headIdx]!.pos & POS0) === 接尾辞 && !isCounterCapableToken(tokens[headIdx]!)) {
    headIdx -= 1;
  }
  const headToken = tokens[headIdx];
  if (headToken === undefined || isCounterCapableToken(headToken) ||
    !(isPersonReferringHeadToken(headToken, lookups) || isPersonReferringHeadToken(tokens[end]!, lookups))) {
    return false;
  }
  const cursor = skipTerminalParticleRun(tokens, end + 1);
  if (cursor === null) {
    return true;
  }
  const edge = tokens[cursor];
  if (!isClausePunctuationToken(edge)) {
    return false;
  }
  return !(edge !== undefined && isWeakPunctuationToken(edge) && nominalCoordinationRunFollows(tokens, cursor + 1, lookups));
}

function nominalCoordinationRunFollows(
  tokens: readonly ClauseToken[],
  start: number,
  lookups: LookupTables
): boolean {
  const lemmas = lookups.NOMINAL_COORDINATION_CONNECTIVE_LEMMAS;
  const isNominalElement = (token: ClauseToken | undefined): boolean =>
    token !== undefined && (pos0in(token.pos, NOMINAL_BITS) || (token.pos & POS0) === 接尾辞 || (token.pos & POS0) === 接頭辞);
  let sawItem = false;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (isNominalElement(token)) {
      sawItem = true;
      continue;
    }
    if (token !== undefined && sawItem && lemmas.has(token.dictionaryForm) && isNominalElement(tokens[index + 1])) {
      return true;
    }
    return false;
  }
  return false;
}


function vocativeNounPhraseEnd(tokens: readonly ClauseToken[], idx: number): number {
  let end = idx;
  for (;;) {
    const next = tokens[end + 1];
    if (next === undefined || separatedAs(tokens, end + 1, DETACHED_SEPARATIONS)) {
      return end;
    }
    if (isContentInternalConnectorToken(next)) {
      const after = tokens[end + 2];
      if (after !== undefined && (pos0in(after.pos, NOMINAL_BITS) || (after.pos & POS0) === 接尾辞)) {
        end += 2;
        continue;
      }
      return end;
    }
    if (pos0in(next.pos, NOMINAL_BITS) || (next.pos & POS0) === 接尾辞) {
      end += 1;
      continue;
    }
    return end;
  }
}

export function isPostposedVocativeNounPhraseAt(
  tokens: readonly ClauseToken[],
  idx: number,
  lookups: LookupTables
): boolean {
  return isPostposedVocativeHead(tokens, idx, lookups, "noun_phrase");
}

export function isPersonReferringHeadToken(token: ClauseToken, lookups: LookupTables): boolean {
  if (isPersonToken(token, lookups)) {
    return true;
  }
  const form = token.dictionaryForm.length > 0 ? token.dictionaryForm : token.surface;
  return Array.from(lookups.TRANSCRIPTION_SPEAKER_LABEL_TITLE_SUFFIXES)
    .some((suffix) => form.endsWith(suffix));
}
