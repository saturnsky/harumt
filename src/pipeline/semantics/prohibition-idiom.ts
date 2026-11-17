import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, isNegativeAuxiliaryPos, isNonIndependentVerbToken, 動詞 } from "../../types/pos.js";
import { TokenCursor } from "../token-cursor.js";
import { prohibitionBodyPattern } from "../head-tail/tail/predicate-root/obligation-pattern-table.js";
import {
  evaluativeBodyKindAt,
  matchDameObligationCopula,
  type EvaluativeBodyKind
} from "../head-tail/tail/predicate-root/matchers/obligation.js";
import { matchForbiddenNegationEndingAfterBody } from "../head-tail/tail/predicate-root/matchers/negation-ending.js";

export interface ProhibitionPredicateMatch {
  readonly body: EvaluativeBodyKind;
  readonly bodyLemma: string;
  readonly polite: boolean;
  readonly past: boolean;
  readonly consumed: number;
}

export interface ProhibitionPredicateOptions {
  readonly hostCannotHostDirectionalIku?: boolean;
}

export function matchProhibitionPredicateAt(
  tokens: readonly RuntimeHaruToken[],
  bodyPos: number,
  options: ProhibitionPredicateOptions = {}
): ProhibitionPredicateMatch | null {
  const body = tokens[bodyPos];
  if (body === undefined) {
    return null;
  }
  const bodyKind = evaluativeBodyKindAt(
    new TokenCursor(tokens, bodyPos),
    prohibitionBodyPattern(),
    { excludeLexicalBodyForms: true }
  );
  if (bodyKind === null) {
    return null;
  }
  const bodyLemma = body.dictionaryForm || body.surface;
  if (bodyKind === "dame") {
    const copulaCursor = new TokenCursor(tokens, bodyPos + 1, tokens.length, bodyPos + 1);
    const polite = matchDameObligationCopula(copulaCursor);
    return { body: bodyKind, bodyLemma, polite, past: false, consumed: 1 + copulaCursor.consumed };
  }
  if ((body.pos & POS0) !== 動詞) {
    return null;
  }
  if (bodyLemma === "いく" && !ikuProhibitionBodyAdmitted(tokens, bodyPos, options)) {
    return null;
  }
  const negEnd = matchForbiddenNegationEndingAfterBody(tokens, bodyPos);
  if (negEnd === null) {
    return null;
  }
  return { body: bodyKind, bodyLemma, polite: negEnd.polite, past: negEnd.past, consumed: 1 + negEnd.consumed };
}

function ikuProhibitionBodyAdmitted(
  tokens: readonly RuntimeHaruToken[],
  bodyPos: number,
  options: ProhibitionPredicateOptions
): boolean {
  const body = tokens[bodyPos];
  const negation = tokens[bodyPos + 1];
  return options.hostCannotHostDirectionalIku === true &&
    body !== undefined &&
    isNonIndependentVerbToken(body) &&
    body.surface === "いか" &&
    negation !== undefined &&
    isNegativeAuxiliaryPos(negation.pos) &&
    (negation.surface === "ない" || negation.surface === "ぬ");
}
