import { NOMINAL_BITS, POS0, POS5A, 名詞, 連体形_, isBareNaAdjSet, pos0in } from "../../../../types/pos.js";
import { type RuntimeHaruToken } from "../../../../types/token.js";
import { type StemNode, type TosuruConstructionMode } from "./grammar.js";
import { TOSURU_RESULTATIVE_MAKE_HEADS } from "./tosuru-resultative-head-table.js";

export function isTosuruResultativeMakeForm(...forms: readonly (string | undefined)[]): boolean {
  return forms.some((form) => form !== undefined && form.length > 0 && TOSURU_RESULTATIVE_MAKE_HEADS.has(form));
}

function stemHasResultativeMakeHead(stem: StemNode): boolean {
  return stem.source.tokens.some((token) => isTosuruResultativeMakeForm(token.dictionaryForm, token.surface));
}

function tokenIsTreatAsNoun(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 && isBareNaAdjSet(token);
}

export function tosuruConstructionModeForToken(token: RuntimeHaruToken | undefined): TosuruConstructionMode {
  if (token === undefined) {
    return "quote";
  }
  if (isTosuruResultativeMakeForm(token.dictionaryForm, token.surface)) {
    return "resultative_make";
  }
  if (tokenIsTreatAsNoun(token)) {
    return "treat_as";
  }
  return "quote";
}

export function tosuruPassiveRefinesToJudgmentQuote(options: {
  readonly mode: TosuruConstructionMode;
  readonly passiveVoice: boolean;
  readonly hasAgentPhrase: () => boolean;
}): boolean {
  if (!options.passiveVoice) {
    return false;
  }
  if (options.mode === "treat_as") {
    return true;
  }
  return options.mode === "resultative_make" && !options.hasAgentPhrase();
}

export function tosuruResultativeMakeYieldsToAttributiveQuoteHead(
  carrier: RuntimeHaruToken,
  follower: RuntimeHaruToken | undefined
): boolean {
  if ((carrier.pos & POS5A) !== 連体形_ || follower === undefined) {
    return false;
  }
  const followerForm = follower.dictionaryForm || follower.surface;
  if (followerForm === "ため" || followerForm === "為" || followerForm === "こと" || followerForm === "事") {
    return false;
  }
  return pos0in(follower.pos, NOMINAL_BITS);
}

export function tosuruConstructionModeForNounStem(stem: StemNode): TosuruConstructionMode {
  return stemHasResultativeMakeHead(stem) ? "resultative_make" : "treat_as";
}

export function stemIsTosuruResultativeMakeHead(stem: StemNode): boolean {
  return stemHasResultativeMakeHead(stem);
}
