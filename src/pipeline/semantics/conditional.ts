import {
  hasHardTerminalPunctuationRelation,
  hasWeakPunctuationClass,
  type BoundaryToken
} from "../head-tail/boundary/punctuation.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { buildProtoLayout } from "../clause-layout/index.js";
import { clauseProjectionEvidenceWindowForToken, type ClauseProjectionEvidenceWindow } from "../clause-layout/navigation.js";
import type { ProjectionEvidenceLayout } from "../clause-layout/layout-types.js";
import type { LookupTables } from "../lookup-tables.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { DETACHED_SEPARATIONS, previousNonSpaceIndex, separatedAs } from "../clause-layout/trivia.js";
import { quoteStructuralRelationsForHost } from "../structural-relation/quote.js";
import type { RuntimeHaruToken, SeparationEvidence } from "../../types/token.js";
import { auxHasPast } from "../matchers.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";


import { NOMINAL_KEIJOU_BITS, POS0, pos0in, POS4, POS5A, isSahenCapableNominal, 記号, 形状詞, 形容詞0, 助詞, 助動詞, 名詞, 代名詞, 助動詞_タ, 助動詞_ダ, 助動詞_ナイ, 助動詞_ヌ, 動詞, 非自立可能, 補助記号, 連用形_, POS01 } from "../../types/pos.js";
export interface ConditionalSemanticToken extends BoundaryToken {
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly whitespaceBefore?: SeparationEvidence;
  readonly transparentPauseAfter?: boolean;
}

export type ConditionalEvidenceWindow = ClauseProjectionEvidenceWindow;

export function conditionalEvidenceWindowForToken(
  tokens: readonly ConditionalSemanticToken[],
  tokenIdx: number,
  lookups: LookupTables,
  layout: ProjectionEvidenceLayout | null = activeProtoLayout()
): ConditionalEvidenceWindow | undefined {
  return conditionalEvidenceWindowForTokenInternal(tokens, tokenIdx, layout, false, lookups);
}

export function conditionalDiscoveryEvidenceWindowForToken(
  tokens: readonly ConditionalSemanticToken[],
  tokenIdx: number,
  lookups: LookupTables,
  layout: ProjectionEvidenceLayout | null = activeProtoLayout()
): ConditionalEvidenceWindow | undefined {
  return conditionalEvidenceWindowForTokenInternal(tokens, tokenIdx, layout, true, lookups);
}

function conditionalEvidenceWindowForTokenInternal(
  tokens: readonly ConditionalSemanticToken[],
  tokenIdx: number,
  layout: ProjectionEvidenceLayout | null,
  allowRelativeParentWindow: boolean,
  lookups: LookupTables
): ConditionalEvidenceWindow | undefined {
  if (tokenIdx < 0) {
    return undefined;
  }
  const evidenceLayout = layout ?? buildProtoLayout(tokens, lookups);
  const clause = evidenceLayout.clauseOfToken(tokenIdx);
  const evidenceTokenIdx = clause === undefined ? tokenIdx + 1 : clause.end;
  if (evidenceTokenIdx >= tokens.length) {
    return undefined;
  }
  const window = clauseProjectionEvidenceWindowForToken(evidenceLayout, tokens, evidenceTokenIdx);
  let evidenceClause = evidenceLayout.clauseOfToken(evidenceTokenIdx);
  let hostWindow: ConditionalEvidenceWindow | undefined;
  for (let step = 0; allowRelativeParentWindow && step < tokens.length; step += 1) {
    if (
      evidenceClause === undefined ||
      evidenceClause.kind !== "relative" ||
      evidenceClause.parentIdx === null ||
      evidenceClause.end >= tokens.length
    ) {
      break;
    }
    const parentClauseIndex = evidenceLayout.clauseIndexOfToken(evidenceClause.end);
    if (parentClauseIndex !== evidenceClause.parentIdx) {
      break;
    }
    if (separatedAs(tokens, evidenceClause.end, DETACHED_SEPARATIONS)) {
      break;
    }
    const parentWindow = clauseProjectionEvidenceWindowForToken(evidenceLayout, tokens, evidenceClause.end);
    if (parentWindow === undefined) {
      break;
    }
    hostWindow = { start: parentWindow.start, end: parentWindow.end };
    evidenceClause = evidenceLayout.clauseOfToken(evidenceClause.end);
  }
  return hostWindow ?? window;
}

export function conditionalSourceAllowsRetrospectiveDiscovery(
  tokens: readonly ConditionalSemanticToken[],
  tokenIdx: number,
  lookups: LookupTables,
  layout: ProjectionEvidenceLayout | null = activeProtoLayout()
): boolean {
  if (tokenIdx < 0) {
    return true;
  }
  const evidenceLayout = layout ?? buildProtoLayout(tokens, lookups);
  const clause = evidenceLayout.clauseOfToken(tokenIdx);
  if (clause === undefined) {
    return false;
  }
  const start = clause.start;
  const baseCursor = new TokenCursor(tokens as readonly RuntimeHaruToken[], start, tokens.length);
  for (let index = tokenIdx - 1; index >= start; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 助詞 || pos0 === 補助記号 || pos0 === 記号) {
      continue;
    }
    if (pos0 === 動詞) {
      const form = tokenForm(token);
      const directKind = lookups.QUOTE_HOST_REGISTRY.kind("direct", form);
      if (
        (directKind === "thought" || directKind === "report" || directKind === "question") &&
        predicateHasQuoteStructuralRelation(baseCursor, index, lookups)
      ) {
        return false;
      }
      if (form === "する" || form === "為る") {
        const nounIdx = previousNonSpaceIndex(tokens, index, start);
        const noun = nounIdx === null ? undefined : tokens[nounIdx];
        const nounKind = noun === undefined ? undefined : lookups.QUOTE_HOST_REGISTRY.kind("noun_suru", tokenForm(noun));
        if (
          (nounKind === "thought" || nounKind === "report" || nounKind === "question") &&
          predicateHasQuoteStructuralRelation(baseCursor, index, lookups)
        ) {
          return false;
        }
      }
      return true;
    }
    if ((pos0 === 形容詞0) || (pos0 === 形状詞)) {
      return true;
    }
  }
  return true;
}

export function followingConditionalClauseWindow(
  tokens: readonly ConditionalSemanticToken[],
  start: number,
  window: ConditionalEvidenceWindow | undefined,
  maxTokens = 10
): readonly ConditionalSemanticToken[] {
  if (window === undefined) {
    return [];
  }
  const result: ConditionalSemanticToken[] = [];
  let index = Math.max(start, window.start);
  const end = Math.min(tokens.length, window.end);
  let seenPredicateLike = false;
  while (index < end && result.length < maxTokens) {
    const token = tokens[index];
    if (token === undefined) break;
    if (hasHardTerminalPunctuationRelation(token, index, ["content_resolver"])) {
      break;
    }
    if (hasWeakPunctuationClass(token, index, ["japanese_comma", "ascii_comma"], ["content_resolver"])) {
      index += 1;
      continue;
    }
    if (
      seenPredicateLike &&
      quoteMarkerRelationAt(tokens, index, { consumers: ["content_resolver"] }) !== null
    ) {
      break;
    }
    result.push(token);
    if (isPredicateLikeToken(token)) {
      seenPredicateLike = true;
    }
    index += 1;
  }
  return result;
}

function predicateHasQuoteStructuralRelation(
  cursor: TokenCursor<RuntimeHaruToken>,
  predicateIdx: number,
  lookups: LookupTables
): boolean {
  return quoteStructuralRelationsForHost(
    cursor.fork(predicateIdx),
    lookups
  ).some((relation) =>
    relation.quote.hostMatch.kind === "thought" ||
    relation.quote.hostMatch.kind === "report" ||
    relation.quote.hostMatch.kind === "question"
  );
}

export function hasRetrospectiveDiscoveryCueAfter(
  tokens: readonly ConditionalSemanticToken[],
  start: number,
  window: ConditionalEvidenceWindow | undefined,
  lookups: LookupTables,
  mode: "to_strict" | "tara_legacy" | "tara_te_iru" = "to_strict"
): boolean {
  const following = followingConditionalClauseWindow(tokens, start, window);
  if (following.length === 0) {
    return false;
  }
  if (windowHasTeIruPast(following)) {
    return true;
  }
  if (windowHasCopulaPastState(following)) {
    return true;
  }
  const firstPredicate = firstPredicateLikeToken(following);
  if (firstPredicate === undefined) {
    return false;
  }
  if (!windowHasPastAux(following)) {
    return false;
  }
  if (mode === "tara_legacy") {
    const firstForm = tokenForm(firstPredicate);
    if (lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS.has(firstForm) || lookups.CONDITIONAL_DISCOVERY_RESULT_FORMS.has(firstForm)) {
      return true;
    }
    return following.some((token) => {
      if (!isPredicateLikeToken(token)) {
        return false;
      }
      const candidateForm = tokenForm(token);
      return lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS.has(candidateForm) || lookups.CONDITIONAL_DISCOVERY_RESULT_FORMS.has(candidateForm);
    });
  }
  for (const [index, token] of following.entries()) {
    if (!isPredicateLikeToken(token)) {
      continue;
    }
    if (isTeAspectIruToken(following, index)) {
      continue;
    }
    const close = predicateAuxCloseInfo(following, index);
    if (!close.past) {
      continue;
    }
    if (close.attributive) {
      continue;
    }
    if (mode === "tara_te_iru") {
      return !pastResultHasCounterfactualModalCloser(tokens, tokens.indexOf(token), lookups);
    }
    const candidateForm = tokenForm(token);
    return lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS.has(candidateForm) ||
      lookups.CONDITIONAL_DISCOVERY_RESULT_FORMS.has(candidateForm);
  }
  return false;
}

function pastResultHasCounterfactualModalCloser(
  tokens: readonly ConditionalSemanticToken[],
  predicateIndex: number,
  lookups: LookupTables
): boolean {
  if (predicateIndex < 0) {
    return false;
  }
  let index = predicateIndex + 1;
  while (index < tokens.length && (tokens[index]!.pos & POS0) === 助動詞 &&
    (tokens[index]!.pos & POS4) === 助動詞_タ) {
    index += 1;
  }
  const rest = tokens.slice(index, index + 3).map((token) => token.surface).join("");
  return [...lookups.CONDITIONAL_COUNTERFACTUAL_MODAL_CLOSER_SURFACES].some((closer) => rest.startsWith(closer));
}

function predicateAuxCloseInfo(
  following: readonly ConditionalSemanticToken[],
  index: number
): { readonly past: boolean; readonly attributive: boolean } {
  let past = false;
  for (let i = index + 1; i < following.length; i++) {
    const token = following[i];
    if (token === undefined) {
      break;
    }
    if ((token.pos & POS0) !== 助動詞 && token.surface !== "ん") {
      return {
        past,
        attributive: (token.pos & POS0) === 名詞 || (token.pos & POS0) === 代名詞
      };
    }
    if ((token.pos & POS4) === 助動詞_タ) {
      past = true;
    }
  }
  return { past, attributive: false };
}


function isTeAspectIruToken(following: readonly ConditionalSemanticToken[], index: number): boolean {
  const token = following[index];
  if (token === undefined) {
    return false;
  }
  const form = tokenForm(token);
  if (form !== "いる" && form !== "居る") {
    return false;
  }
  const previous = following[index - 1];
  return previous !== undefined && (previous.surface === "て" || previous.surface === "で");
}

export function hasCounterfactualResultCueAfter(
  tokens: readonly ConditionalSemanticToken[],
  start: number,
  window: ConditionalEvidenceWindow | undefined,
  lookups: LookupTables
): boolean {
  const following = followingConditionalClauseWindow(tokens, start, window);
  if (following.length === 0 || !windowHasPastAux(following)) {
    return false;
  }
  if (windowHasNegativePast(following)) {
    return true;
  }
  const firstPredicate = firstPredicateLikeToken(following);
  if (firstPredicate === undefined) {
    return false;
  }
  const form = tokenForm(firstPredicate);
  return lookups.TOKORO_RESULT_EVIDENCE_AFTER_FORMS.has(form) ||
    lookups.CONDITIONAL_COUNTERFACTUAL_RESULT_FORMS.has(form);
}

function firstPredicateLikeToken(tokens: readonly ConditionalSemanticToken[]): ConditionalSemanticToken | undefined {
  return tokens.find(isPredicateLikeToken);
}

function isPredicateLikeToken(token: ConditionalSemanticToken): boolean {
  return (
    (token.pos & POS0) === 動詞 ||
    (token.pos & POS0) === 形容詞0 ||
    (token.pos & POS0) === 形状詞 ||
    isSahenCapableNominal(token)
  );
}

function tokenForm(token: ConditionalSemanticToken): string {
  return token.dictionaryForm || token.surface;
}

function windowHasPastAux(tokens: readonly ConditionalSemanticToken[]): boolean {
  return auxHasPast(tokens);
}

function windowHasNegativePast(tokens: readonly ConditionalSemanticToken[]): boolean {
  return tokens.some((token, index) =>
    isNegativeAuxLikeToken(token) &&
    auxHasPast(tokens.slice(index + 1, index + 3))
  );
}

function windowHasTeIruPast(tokens: readonly ConditionalSemanticToken[]): boolean {
  return tokens.some((token, index) => {
    if (!isTeConnectiveToken(token)) {
      return false;
    }
    const iru = tokens[index + 1];
    if (iru === undefined || (iru.dictionaryForm !== "いる" && iru.dictionaryForm !== "居る")) {
      return false;
    }
    return auxHasPast(tokens.slice(index + 2, index + 5));
  });
}

function windowHasCopulaPastState(tokens: readonly ConditionalSemanticToken[]): boolean {
  return tokens.some((token, index) =>
    pos0in(token.pos, NOMINAL_KEIJOU_BITS) &&
    tokens.slice(index + 1, index + 3).some((next) => (next.pos & (POS4 | POS5A)) === (助動詞_ダ | 連用形_)) &&
    auxHasPast(tokens.slice(index + 1, index + 4))
  );
}

function isNegativeAuxLikeToken(token: ConditionalSemanticToken): boolean {
  const pos4 = token.pos & POS4;
  return (pos4 === 助動詞_ナイ) ||
    (pos4 === 助動詞_ヌ) ||
    (
      (token.pos & POS01) === (形容詞0 | 非自立可能) && (token.dictionaryForm === "ない" || token.dictionaryForm === "無い")
    );
}
