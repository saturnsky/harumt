import type { CollocationMatchElement } from "../types/dictionary.js";
import type { RuntimeHaruToken } from "../types/token.js";

import { POS0, POS1, POS2, POS3, POS4, POS5, posFromStrings } from "../types/pos.js";
import {
  SEPARATION_BREAKS_MORPHEME_CHAIN,
  previousNonSpaceIndex,
  separatedAs
} from "../pipeline/clause-layout/trivia.js";
import { lookupSetMatches } from "../pipeline/lookup-tables.js";

export interface TokenShapeMatchOptions {
  forbidPrevDictionaryForms?: readonly string[];
  requirePrevPosPrefixAny?: readonly (readonly string[])[];
  requirePrevSurfaceAny?: readonly string[];
  requirePrevLookupAny?: readonly ReadonlySet<string>[];
  requirePrevExists?: boolean;
  forbidNextDictionaryForms?: readonly string[];
  forbidNextPosPrefixAny?: readonly (readonly string[])[];
  requireNextPosPrefixAny?: readonly (readonly string[])[];
  forbidAtTokensEnd?: boolean;
}

export class TokenShapeMatch {
  readonly matchSurfaces: readonly string[];
  readonly matchDictionaryForms: readonly (string | readonly string[] | null | undefined)[];
  readonly matchPosValues: readonly number[];
  readonly matchPosMasks: readonly number[];
  readonly matchWildcards: readonly boolean[];
  readonly length: number;
  readonly anchorIndex: number;
  readonly anchorSurface: string;
  readonly forbidPrevDictionaryForms: ReadonlySet<string>;
  readonly requirePrevPosPrefixAny: readonly { readonly value: number; readonly mask: number }[];
  readonly requirePrevSurfaceAny: ReadonlySet<string>;
  readonly requirePrevLookupAny: readonly ReadonlySet<string>[];
  readonly requirePrevExists: boolean;
  readonly forbidNextDictionaryForms: ReadonlySet<string>;
  readonly forbidNextPosPrefixAny: readonly { readonly value: number; readonly mask: number }[];
  readonly requireNextPosPrefixAny: readonly { readonly value: number; readonly mask: number }[];
  readonly forbidAtTokensEnd: boolean;

  constructor(match: readonly CollocationMatchElement[], options: TokenShapeMatchOptions = {}) {
    this.matchSurfaces = match.map((element) => element.surface);
    this.matchDictionaryForms = match.map((element) => element.dictionaryForm);
    const posQueries = match.map((element) => tokenShapePosQuery(element.pos));
    this.matchPosValues = posQueries.map((q) => q.value);
    this.matchPosMasks = posQueries.map((q) => q.mask);
    this.matchWildcards = match.map((element) => element.surface === "*");
    this.length = match.length;
    this.forbidPrevDictionaryForms = new Set(options.forbidPrevDictionaryForms ?? []);
    this.requirePrevPosPrefixAny = (options.requirePrevPosPrefixAny ?? []).map((prefix) => tokenShapePosQuery(prefix));
    this.requirePrevSurfaceAny = new Set(options.requirePrevSurfaceAny ?? []);
    this.requirePrevLookupAny = options.requirePrevLookupAny ?? [];
    this.requirePrevExists = options.requirePrevExists ?? false;
    this.forbidNextDictionaryForms = new Set(options.forbidNextDictionaryForms ?? []);
    this.forbidNextPosPrefixAny = (options.forbidNextPosPrefixAny ?? []).map((prefix) => tokenShapePosQuery(prefix));
    this.requireNextPosPrefixAny = (options.requireNextPosPrefixAny ?? []).map((prefix) => tokenShapePosQuery(prefix));
    this.forbidAtTokensEnd = options.forbidAtTokensEnd ?? false;

    const anchor = this.matchSurfaces.findIndex((_, index) => !this.matchWildcards[index]);
    this.anchorIndex = anchor < 0 ? 0 : anchor;
    this.anchorSurface = this.matchSurfaces[this.anchorIndex] ?? "";
  }

  matchesAt(tokens: readonly RuntimeHaruToken[], start: number): boolean {
    for (let offset = 0; offset < this.length; offset += 1) {
      const token = tokens[start + offset];
      if (token === undefined) {
        return false;
      }

      if (offset > 0 && separatedAs(tokens, start + offset, SEPARATION_BREAKS_MORPHEME_CHAIN)) {
        return false;
      }

      if (this.matchWildcards[offset] !== true && token.surface !== this.matchSurfaces[offset]) {
        return false;
      }

      const dictionaryForm = this.matchDictionaryForms[offset];
      if (dictionaryForm !== undefined && dictionaryForm !== null) {
        const tokenForm = token.dictionaryForm || token.baseForm || token.surface;
        if (Array.isArray(dictionaryForm)) {
          if (!dictionaryForm.includes(tokenForm)) {
            return false;
          }
        } else if (tokenForm !== dictionaryForm) {
          return false;
        }
      }

      if ((token.pos & this.matchPosMasks[offset]!) !== this.matchPosValues[offset]!) {
        return false;
      }
    }

    if (this.forbidPrevDictionaryForms.size > 0 && start > 0) {
      const prev = tokens[start - 1];
      if (prev !== undefined) {
        const prevForm = prev.dictionaryForm || prev.baseForm || prev.surface;
        if (this.forbidPrevDictionaryForms.has(prevForm)) {
          return false;
        }
      }
    }

    const requiresPrevShape = this.requirePrevPosPrefixAny.length > 0 ||
      this.requirePrevSurfaceAny.size > 0 ||
      this.requirePrevLookupAny.length > 0;
    if (this.requirePrevExists || requiresPrevShape) {
      const prevIndex = previousNonSpaceIndex(tokens, start);
      const prev = prevIndex === null ? undefined : tokens[prevIndex];
      if (prev === undefined) {
        if (this.requirePrevExists) {
          return false;
        }
      } else if (requiresPrevShape) {
        const prevForm = prev.dictionaryForm || prev.baseForm || prev.surface;
        const satisfied = this.requirePrevPosPrefixAny.some(
          (required) => (prev.pos & required.mask) === required.value
        ) ||
          this.requirePrevSurfaceAny.has(prev.surface) ||
          this.requirePrevLookupAny.some((set) => lookupSetMatches(set, prevForm));
        if (!satisfied) {
          return false;
        }
      }
    }

    const nextIndex = start + this.length;
    const next = tokens[nextIndex];
    if (this.forbidAtTokensEnd && next === undefined) {
      return false;
    }
    if (next === undefined) {
      return true;
    }

    if (this.forbidNextDictionaryForms.size > 0) {
      const nextForm = next.dictionaryForm || next.baseForm || next.surface;
      if (this.forbidNextDictionaryForms.has(nextForm)) {
        return false;
      }
    }

    for (const forbidden of this.forbidNextPosPrefixAny) {
      if ((next.pos & forbidden.mask) === forbidden.value) {
        return false;
      }
    }

    if (this.requireNextPosPrefixAny.length > 0) {
      const satisfied = this.requireNextPosPrefixAny.some(
        (required) => (next.pos & required.mask) === required.value
      );
      if (!satisfied) {
        return false;
      }
    }

    return true;
  }
}

const TOKEN_SHAPE_POS_FIELDS: readonly number[] = [POS0, POS1, POS2, POS3, POS4, POS5];

export function tokenShapePosQuery(pos: readonly string[]): { value: number; mask: number } {
  let mask = 0;
  for (let i = 0; i < pos.length && i < 6; i++) {
    if (pos[i] !== "*") mask |= TOKEN_SHAPE_POS_FIELDS[i]!;
  }
  return { value: posFromStrings(pos) & mask, mask };
}
