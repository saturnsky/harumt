import type { RuntimeHaruToken } from "../../../types/token.js";
import {
  clauseProjectionEvidenceWindowForToken,
  type ProjectionEvidenceLayout
} from "../../clause-layout/index.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../../clause-layout/trivia.js";
import { prenominalModifierChainHeadIndex } from "../../clause-layout/attributive-head.js";
import { nounCompoundSuffixRunEnd } from "../tail/predicate-root/integration/readiness.js";
import { isSecondaryParticleToken } from "../../../types/pos.js";
import { isBoundaryPunctuationCategoryToken, transparentTokenRelationForConsumer } from "../boundary/punctuation.js";
import { isTransparentBoundaryTokenForConsumer } from "../boundary/window.js";
import type { ProjectionBoundaryClass, ProjectionEvidenceScope } from "../grammar.js";
import type { ProjectionBoundaryContext } from "./selector.js";

export interface ProjectionContextBounds {
  readonly lowerBound: number;
  readonly upperBound: number | undefined;
}

export function projectionContextBoundsForToken(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tokenIdx: number;
  readonly layout?: ProjectionEvidenceLayout;
  readonly fallbackLowerBound?: number;
  readonly fallbackUpperBound?: number;
}): ProjectionContextBounds {
  const window = options.layout === undefined
    ? undefined
    : clauseProjectionEvidenceWindowForToken(options.layout, options.tokens, options.tokenIdx);
  return {
    lowerBound: window?.start ?? options.fallbackLowerBound ?? 0,
    upperBound: window?.end ?? options.fallbackUpperBound
  };
}

export function projectionSelectorBoundsForToken(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tokenIdx: number;
  readonly layout?: ProjectionEvidenceLayout;
  readonly scope?: ProjectionEvidenceScope;
  readonly fallbackLowerBound?: number;
  readonly fallbackUpperBound?: number;
}): ProjectionContextBounds {
  const scope = options.scope ?? "same_clause";
  if (scope === "cross_weak_punctuation") {
    return projectionContextBoundsForToken(options);
  }
  if (scope === "adjacent_token") {
    return {
      lowerBound: options.fallbackLowerBound ?? 0,
      upperBound: options.fallbackUpperBound
    };
  }
  const bounds = projectionSameClauseBoundsForToken(options);
  if (bounds !== undefined) {
    return bounds;
  }
  return {
    lowerBound: options.fallbackLowerBound ?? 0,
    upperBound: options.fallbackUpperBound
  };
}

function projectionSameClauseBoundsForToken(options: {
  readonly tokenIdx: number;
  readonly layout?: ProjectionEvidenceLayout;
}): ProjectionContextBounds | undefined {
  const clause = options.layout?.clauseOfToken(options.tokenIdx);
  if (clause === undefined) {
    return undefined;
  }
  return {
    lowerBound: clause.start,
    upperBound: clause.end
  };
}

export function collectFollowingProjectionContextTokens(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly limit?: number;
    readonly maxCount: number;
  }
): readonly RuntimeHaruToken[] {
  const limit = options.limit ?? tokens.length;
  const items: RuntimeHaruToken[] = [];
  for (let index = start; index < limit && items.length < options.maxCount; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (projectionContextTokenShouldSkip(token)) {
      continue;
    }
    if (projectionContextTokenBreaksEvidenceWindow(token)) {
      break;
    }
    items.push(token);
  }
  return items;
}

export function firstFollowingProjectionContextToken(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly limit?: number;
  } = {}
): RuntimeHaruToken | undefined {
  const limit = options.limit ?? tokens.length;
  for (let index = start; index < limit; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      return undefined;
    }
    if (projectionContextTokenShouldSkip(token)) {
      continue;
    }
    if (projectionContextTokenBreaksEvidenceWindow(token)) {
      return undefined;
    }
    return token;
  }
  return undefined;
}

export function collectFollowingProjectionBoundaryContext(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly limit?: number;
  } = {}
): ProjectionBoundaryContext | undefined {
  const limit = options.limit ?? tokens.length;
  const classes: ProjectionBoundaryClass[] = [];
  if (start < limit && separatedAs(tokens, start, DETACHED_SEPARATIONS)) {
    pushBoundaryClass(classes, "detached_separation");
  }
  for (let index = start; index < limit; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (projectionBoundaryClassForToken(token, index) === "weak_punctuation") {
      pushBoundaryClass(classes, "weak_punctuation");
      continue;
    }
    break;
  }
  return classes.length === 0 ? undefined : { classes };
}

export function collectPrecedingProjectionContextTokens(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly lowerBound?: number;
    readonly maxCount: number;
  }
): readonly RuntimeHaruToken[] {
  const items: RuntimeHaruToken[] = [];
  const lowerBound = options.lowerBound ?? 0;
  for (let index = start; index >= lowerBound && items.length < options.maxCount; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (projectionContextTokenShouldSkip(token)) {
      continue;
    }
    if (projectionContextTokenBreaksEvidenceWindow(token)) {
      break;
    }
    items.push(token);
  }
  return items;
}

export function collectPrecedingProjectionBoundaryContext(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly lowerBound?: number;
  } = {}
): ProjectionBoundaryContext | undefined {
  const classes: ProjectionBoundaryClass[] = [];
  const lowerBound = options.lowerBound ?? 0;
  for (let index = start; index >= lowerBound; index -= 1) {
    const token = tokens[index];
    if (token === undefined) {
      break;
    }
    if (projectionBoundaryClassForToken(token, index) === "weak_punctuation") {
      pushBoundaryClass(classes, "weak_punctuation");
      continue;
    }
    break;
  }
  return classes.length === 0 ? undefined : { classes };
}

function pushBoundaryClass(classes: ProjectionBoundaryClass[], value: ProjectionBoundaryClass): void {
  if (!classes.includes(value)) {
    classes.push(value);
  }
}

function projectionContextTokenShouldSkip(token: RuntimeHaruToken): boolean {
  return isTransparentBoundaryTokenForConsumer(token, -1, "projection_context");
}

function projectionContextTokenBreaksEvidenceWindow(token: RuntimeHaruToken): boolean {
  return isBoundaryPunctuationCategoryToken(token);
}

function projectionBoundaryClassForToken(
  token: RuntimeHaruToken,
  index: number
): ProjectionBoundaryClass | null {
  const relation = transparentTokenRelationForConsumer(token, index, "projection_context");
  return relation === null ? null : "weak_punctuation";
}

export function collectFollowingNounPhraseTokens(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  options: {
    readonly limit?: number;
  } = {}
): readonly RuntimeHaruToken[] {
  const limit = options.limit ?? tokens.length;
  let phraseStart = start;
  while (phraseStart < limit) {
    const token = tokens[phraseStart];
    if (token === undefined || projectionBoundaryClassForToken(token, phraseStart) !== "weak_punctuation") {
      break;
    }
    phraseStart += 1;
  }
  const headIdx = prenominalModifierChainHeadIndex(tokens, phraseStart, limit, {
    auxiliaryStem: "opaque",
    separationRefused: DETACHED_SEPARATIONS,
    reach: "adnominal_stack"
  });
  if (headIdx === null) {
    return [];
  }
  let end = Math.min(nounCompoundSuffixRunEnd(tokens, headIdx + 1, tokens[headIdx]), limit);
  const closing = tokens[end];
  if (end < limit && closing !== undefined && isSecondaryParticleToken(closing)) {
    end += 1;
  }
  return tokens.slice(phraseStart, end);
}
