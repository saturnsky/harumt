import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS0, POS1, POS4, POS5A, PUNCTUATION_BITS, pos0in, 助詞, 接続助詞, 副助詞, 助動詞_ダ, 助動詞_デス, 助動詞_マス, 助動詞_ヌ, 動詞, 名詞, 終止形_, 補助記号, 連体形_, 連用形_ } from "../../../../../types/pos.js";
import { detectSfp } from "../../../../semantics/grammar-runtime.js";
import { OBLIGATION_PATTERNS, type ObligationPattern, type TokenPredicate } from "../obligation-pattern-table.js";
import { lookupConnectiveBySurface } from "../connective-surface-lookup.js";
import type { ObligationIdiomOp, ObligationVariant, OpSource, Polarity } from "../grammar.js";
import {
  kaMarkerRelationForToken,
  predicateNominalizerRelationForToken,
  registeredClauseConnectiveRelationForToken
} from "../../../boundary/marker.js";
import { srcSlice } from "../source.js";
import { isCopulaJaNegativeBridgeToken, isNaiOrNuToken } from "../classifiers/tokens.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { quoteFocusLimitNegationTailStartingAt } from "../../segments/quote-focus.js";
import { createIdiomOp } from "../op-builders.js";

export type ElidedColloquialObligationContext = "none" | "terminal" | "quote_content_terminal";

export interface ObligationMatchOptions {
  readonly excludeLexicalBodyForms?: boolean;
}

export function isObligationSpanStartingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  allowElidedColloquialObligation: boolean | ElidedColloquialObligationContext = true,
  options: ObligationMatchOptions = {}
): boolean {
  return cursor.lookahead(0, c => tryMatchObligation(c, allowElidedColloquialObligation, options)) !== null;
}

export function isObligationSpanStartingAtToken(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  allowElidedColloquialObligation: boolean | ElidedColloquialObligationContext = true,
  options: ObligationMatchOptions = {}
): boolean {
  return isObligationSpanStartingAt(new TokenCursor(tokens, startIdx), allowElidedColloquialObligation, options);
}

export function obligationSpanEndExclusiveAt(
  tokens: readonly RuntimeHaruToken[],
  startIdx: number,
  allowElidedColloquialObligation: boolean | ElidedColloquialObligationContext = true,
  options: ObligationMatchOptions = {}
): number | null {
  const cursor = new TokenCursor(tokens, startIdx);
  const op = tryMatchObligation(cursor, allowElidedColloquialObligation, options);
  return op === null ? null : cursor.pos;
}

export function isObligationSpanContaining(
  tokens: readonly RuntimeHaruToken[],
  boundaryIdx: number
): boolean {
  for (let look = 1; look <= getObligationPrefixMaxLength(); look++) {
    const startIdx = boundaryIdx - look;
    if (startIdx < 0) break;
    const tok = tokens[startIdx];
    if (tok === undefined) continue;
    if (!isNaiOrNuToken(tok)) continue;
    if (isObligationSpanStartingAtToken(tokens, startIdx)) return true;
  }
  return false;
}

let obligationPrefixMaxLength: number | undefined;

function getObligationPrefixMaxLength(): number {
  return (obligationPrefixMaxLength ??= OBLIGATION_PATTERNS.reduce(
    (max, pattern) => Math.max(max, pattern.prefix.length),
    0
  ));
}

export function tryMatchObligation(
  cursor: TokenCursor<RuntimeHaruToken>,
  allowElidedColloquialObligation: boolean | ElidedColloquialObligationContext,
  options: ObligationMatchOptions = {}
): ObligationIdiomOp | null {
  const elidedContext = normalizeElidedColloquialObligationContext(allowElidedColloquialObligation);
  for (const pattern of OBLIGATION_PATTERNS) {
    const result = cursor.tx(c => {
      const base = c.pos;
      for (const pred of pattern.prefix) {
        const tok = c.current();
        if (tok === undefined || !tokenMatches(tok, pred)) {
          return null;
        }
        c.advance();
      }

      if (pattern.bodyVerbs.length === 0) {
        if (!admitsElidedObligationBody(pattern, elidedContext, c)) return null;
        return buildObligationIdiomOp(
          srcSlice(c.tokens, base, c.pos - base),
          pattern.variant
        );
      }

      const polite = matchObligationBody(c, pattern, options);
      if (polite === null) return null;
      return buildObligationIdiomOp(
        srcSlice(c.tokens, base, c.pos - base),
        pattern.variant,
        "affirmative",
        polite
      );
    });
    if (result !== null) return result;
  }
  return null;
}

export function admitsElidedObligationByCopulaShellAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const cursor = new TokenCursor(tokens, idx, tokens.length, idx);
  for (const pattern of OBLIGATION_PATTERNS) {
    if (pattern.bodyVerbs.length > 0) continue;
    if (!isColloquialContractedObligationVariant(pattern.variant)) continue;
    const fired = cursor.lookahead(0, c => {
      for (const pred of pattern.prefix) {
        const tok = c.current();
        if (tok === undefined || !tokenMatches(tok, pred)) return false;
        c.advance();
      }
      return elidedObligationCopulaShellAhead(c);
    });
    if (fired) return true;
  }
  return false;
}

export function buildObligationIdiomOp(
  source: OpSource,
  variant: ObligationVariant,
  polarity: Polarity = "affirmative",
  polite = false,
  past = false
): ObligationIdiomOp {
  return createIdiomOp({

    idiom: "obligation",
    variant,
    polarity,
    polite,
    past,
    source
  });
}

export function normalizeElidedColloquialObligationContext(
  allowElidedColloquialObligation: boolean | ElidedColloquialObligationContext
): ElidedColloquialObligationContext {
  if (typeof allowElidedColloquialObligation === "string") {
    return allowElidedColloquialObligation;
  }
  return allowElidedColloquialObligation ? "terminal" : "none";
}

function admitsElidedObligationBody(
  pattern: ObligationPattern,
  context: ElidedColloquialObligationContext,
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const markerIdx = cursor.pos - 1;
  if (
    markerIdx >= 0 &&
    quoteFocusLimitNegationTailStartingAt(cursor.fork(markerIdx, cursor.tokens.length, markerIdx)) !== null
  ) {
    return false;
  }
  if (
    isColloquialContractedObligationVariant(pattern.variant) &&
    elidedObligationCopulaShellAhead(cursor)
  ) {
    return true;
  }
  if (!patternAllowsElidedColloquialObligation(pattern, context)) return false;
  const nextTok = cursor.current();
  const nextIsConnective =
    nextTok !== undefined &&
    (nextTok.pos & POS0) === 助詞 &&
    lookupConnectiveBySurface(nextTok.surface) !== undefined;
  return nextTok === undefined ||
    (nextTok.pos & POS0) === 補助記号 ||
    nextIsConnective ||
    isTerminalSfpBeforeClauseEnd(cursor);
}

function isColloquialContractedObligationVariant(variant: ObligationVariant): boolean {
  return variant === "colloquial_nakya" || variant === "colloquial_nakucha";
}

function elidedObligationCopulaShellAhead(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const tok = cursor.current();
  if (tok === undefined) return false;
  if (isCopulaJaNegativeBridgeToken(tok)) return false;
  const pos4 = tok.pos & POS4;
  if (pos4 !== 助動詞_ダ && pos4 !== 助動詞_デス) return false;
  const pos5A = tok.pos & POS5A;
  if (pos5A === 終止形_) return true;
  return pos5A === 連体形_ && adnominalCopulaFeedsTerminalNoda(cursor);
}

function patternAllowsElidedColloquialObligation(
  pattern: ObligationPattern,
  context: ElidedColloquialObligationContext
): boolean {
  if (context === "none") {
    return false;
  }
  if (context === "terminal") {
    return true;
  }
  return isColloquialContractedObligationVariant(pattern.variant);
}

export function matchObligationBody(
  cursor: TokenCursor<RuntimeHaruToken>,
  pattern: ObligationPattern,
  options: ObligationMatchOptions = {}
): boolean | null {
  const bodyKind = evaluativeBodyKindAt(cursor, pattern, options);
  if (bodyKind === null) return null;
  cursor.advance();
  if (bodyKind === "dame") {
    return matchDameObligationCopula(cursor);
  }
  return matchVerbNegativeBodyEnding(cursor);
}

export type EvaluativeBodyKind = "verb" | "dialect_verb" | "dame";

export function evaluativeBodyKindAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  pattern: ObligationPattern,
  options: ObligationMatchOptions = {}
): EvaluativeBodyKind | null {
  const bodyTok = cursor.current();
  if (bodyTok === undefined) return null;
  const bodyDict = bodyTok.dictionaryForm;
  const bodySurface = bodyTok.surface;
  const bodyIsLexicalForm =
    options.excludeLexicalBodyForms === true &&
    (pattern.lexicalBodyForms ?? []).includes(bodyDict);
  const bodyMatches =
    (!bodyIsLexicalForm && pattern.bodyVerbs.includes(bodyDict)) ||
    (bodySurface === "なら" && cursor.peek(1) !== undefined && isNaiOrNuToken(cursor.peek(1)!));
  if (bodyMatches) return "verb";
  if ((pattern.dialectBodyVerbs ?? []).includes(bodyDict) && dialectBodyNegationFollows(cursor)) {
    return "dialect_verb";
  }
  if (pattern.allowDameBody === true && isDameObligationBodyToken(bodyTok)) {
    return "dame";
  }
  return null;
}

function dialectBodyNegationFollows(cursor: TokenCursor<RuntimeHaruToken>): boolean {
  const t1 = cursor.peek(1);
  if (t1 === undefined) return false;
  if (isNasalNegationToken(t1)) return true;
  const t2 = cursor.peek(2);
  return t1.dictionaryForm === "ます" && (t1.pos & POS4) === 助動詞_マス &&
    t2 !== undefined && isNasalNegationToken(t2);
}

function isNasalNegationToken(token: RuntimeHaruToken): boolean {
  return isNaiOrNuToken(token) && token.surface.startsWith("ん");
}

export function isDameObligationBodyToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 名詞 &&
    (token.dictionaryForm === "だめ" || token.surface === "だめ" || token.surface === "ダメ" || token.surface === "駄目");
}

export function matchDameObligationCopula(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const t0 = cursor.current();
  if (isCopulaJaNegativeBridgeToken(t0)) return false;
  const t0pos4 = (t0?.pos ?? 0) & POS4;
  const t0pos5A = (t0?.pos ?? 0) & POS5A;
  if (
    t0 !== undefined &&
    t0pos5A === 連体形_ &&
    ((t0pos4 & POS4) === 助動詞_ダ || (t0pos4 & POS4) === 助動詞_デス) &&
    adnominalCopulaFeedsTerminalNoda(cursor)
  ) {
    cursor.advance();
    return (t0pos4 & POS4) === 助動詞_デス;
  }
  if (
    t0 !== undefined &&
    (t0pos5A === 終止形_ || t0pos5A === 連用形_) &&
    ((t0pos4 & POS4) === 助動詞_ダ || (t0pos4 & POS4) === 助動詞_デス)
  ) {
    cursor.advance();
    return (t0pos4 & POS4) === 助動詞_デス;
  }
  return false;
}

function adnominalCopulaFeedsTerminalNoda(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const pos = cursor.pos;
  const nominalizer = predicateNominalizerRelationForToken(cursor.tokens[pos + 1], pos + 1, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  return nominalizer?.nominalizerKind === "no";
}

function tokenMatches(token: RuntimeHaruToken, pred: TokenPredicate): boolean {
  if (pred.surface !== undefined && token.surface !== pred.surface) return false;
  if (pred.dictionaryForm !== undefined && token.dictionaryForm !== pred.dictionaryForm) return false;
  if (pred.naiOrNu === true && !isNaiOrNuToken(token)) return false;
  if (pred.pos1 !== undefined && (token.pos & POS1) !== pred.pos1) return false;
  if (pred.pos1In !== undefined && !pred.pos1In.includes(token.pos & POS1)) return false;
  if (pred.pos4 !== undefined && (token.pos & POS4) !== pred.pos4) return false;
  if (pred.pos5Includes !== undefined && !pred.pos5Includes(token.pos)) return false;
  return true;
}

export function isTerminalSfpBeforeClauseEnd(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const consumed = cursor.lookahead(0, c => {
    const base = c.pos;
    detectSfp(c, 動詞, true);
    return c.pos - base;
  });
  if (consumed <= 0) {
    return false;
  }
  const next = cursor.peek(consumed);
  return next === undefined || (next.pos & POS0) === 補助記号;
}

function matchVerbNegativeBodyEnding(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean | null {
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  if (isNaiOrNuToken(t0)) {
    cursor.advance();
    return false;
  }
  const t1 = cursor.peek(1);
  if (
    t0.dictionaryForm === "ます" && (t0.pos & POS4) === 助動詞_マス &&
    t1?.dictionaryForm === "ぬ" && (t1.pos & POS4) === 助動詞_ヌ
  ) {
    cursor.advance(2);
    return true;
  }
  return null;
}

export function canCloseBareBekiBeforeBoundary(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos, end: n } = cursor;
  const next = tokens[pos];
  if (next === undefined || pos >= n) {
    return true;
  }
  if (kaMarkerRelationForToken(next, -1, ["tail_multi_clause"]) !== null) {
    return true;
  }
  if (pos0in(next.pos, PUNCTUATION_BITS)) {
    return true;
  }
  if (registeredClauseConnectiveRelationForToken(next, pos, { consumers: ["tail_multi_clause"] }) !== null) {
    return true;
  }
  return (next.pos & POS0) === 助詞 &&
    ((next.pos & POS1) === 接続助詞 || (next.pos & POS1) === 副助詞);
}
