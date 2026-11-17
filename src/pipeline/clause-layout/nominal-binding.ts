import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, 代名詞, 副詞, 名詞, 連体詞, NOMINAL_BITS, pos0in } from "../../types/pos.js";
import {
  caseParticleMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  kaMarkerRelationForToken,
  topicFocusMarkerRelationForToken
} from "../head-tail/boundary/marker.js";
import { nextNonSpaceIndex } from "./trivia.js";
import { TokenCursor } from "../token-cursor.js";
import { matchNegativeTailStart } from "../head-tail/boundary/connective-start.js";
import { leadingNominalHeadAfterToken, prenominalMarkerHeadReachAfterToken, type PrenominalMarkerHeadReachLayout } from "./index.js";
import type { LookupTables } from "../lookup-tables.js";
import type { PhraseEnumerationLayout } from "./phrase-enumeration.js";

export interface NominalBindingClauseScope {
  clauseOfToken(tokenIdx: number): { readonly start: number; readonly end: number } | undefined;
}

export interface NominalPhraseBindingMarker {
  readonly markerIdx: number;
  readonly surface: "か" | "も";
  readonly span: { readonly start: number; readonly endExclusive: number };
}

export function nominalPhraseBindingMarkerForToken(
  layout: NominalBindingClauseScope,
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  beforeIdx: number
): NominalPhraseBindingMarker | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined || tokenIdx < clause.start || tokenIdx >= clause.end) {
    return null;
  }
  const endExclusive = Math.min(clause.end, beforeIdx);
  const token = tokens[tokenIdx];
  if (token === undefined) {
    return null;
  }
  const tokenPos0 = token.pos & POS0;
  if (tokenPos0 === 副詞) {
    const markerIdx = nextNonSpaceIndex(tokens, tokenIdx + 1, endExclusive);
    return markerIdx === null ? null : bindingMarkerAt(tokens, markerIdx);
  }
  let nominalStart = tokenIdx;
  if (tokenPos0 === 連体詞) {
    nominalStart = nextNonSpaceIndex(tokens, tokenIdx + 1, endExclusive) ?? -1;
  }
  if (nominalStart < 0 || !pos0in((tokens[nominalStart]?.pos ?? 0) & POS0, NOMINAL_BITS)) {
    return null;
  }

  while (nominalStart < endExclusive) {
    const nominalEnd = nominalRunEnd(tokens, nominalStart, endExclusive);
    if (nominalEnd === null) {
      return null;
    }
    const markerIdx = nextNonSpaceIndex(tokens, nominalEnd, endExclusive);
    if (markerIdx === null) {
      return null;
    }
    const directDeMo = deMoBindingMarkerAt(tokens, markerIdx, endExclusive);
    if (directDeMo !== null) {
      return directDeMo;
    }
    const marker = bindingMarkerAt(tokens, markerIdx);
    if (marker !== null) {
      return marker;
    }
    const caseMarker = caseParticleMarkerRelationForToken(tokens[markerIdx], markerIdx, {
      consumers: ["clause_layout"]
    });
    if (caseMarker === null) {
      return null;
    }
    const afterCaseIdx = nextNonSpaceIndex(tokens, caseMarker.span.endExclusive, endExclusive);
    if (afterCaseIdx !== null) {
      const deMo = deMoBindingMarkerAt(tokens, afterCaseIdx, endExclusive);
      if (deMo !== null) {
        return deMo;
      }
      const focusMo = bindingMarkerAt(tokens, afterCaseIdx);
      if (focusMo?.surface === "も") {
        return focusMo;
      }
    }
    if (caseMarker.caseSurface !== "の") {
      return null;
    }
    nominalStart = afterCaseIdx ?? -1;
    if (nominalStart < 0 || !pos0in((tokens[nominalStart]?.pos ?? 0) & POS0, NOMINAL_BITS)) {
      return null;
    }
  }
  return null;
}

export function kaBindingModifiesFollowingNominal(
  layout: PhraseEnumerationLayout,
  tokens: readonly RuntimeHaruToken[],
  nominalIdx: number,
  kaIdx: number
): boolean {
  const binding = nominalPhraseBindingMarkerForToken(
    layout,
    tokens,
    nominalIdx,
    kaIdx + 1
  );
  if (binding?.markerIdx !== kaIdx || binding.surface !== "か") {
    return false;
  }
  const followingHead = leadingNominalHeadAfterToken(layout, tokens, kaIdx);
  if (followingHead === null) {
    return false;
  }
  const owningClause = layout.clauseOfToken(kaIdx);
  return owningClause?.kind === "relative" && owningClause.parentIdx !== null
    ? layout.clauseIndexOfToken(followingHead) === owningClause.parentIdx
    : layout.clauseIndexOfToken(followingHead) === layout.clauseIndexOfToken(kaIdx);
}

export function kaOpensGenitiveNominalPhrase(
  layout: PrenominalMarkerHeadReachLayout,
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  lookups: LookupTables
): boolean {
  const linkIdx = nextNonSpaceIndex(tokens, kaIdx + 1, tokens.length);
  return linkIdx !== null &&
    prenominalMarkerHeadReachAfterToken(layout, tokens, linkIdx, lookups) !== null;
}

export function adverbialConcessiveMoBindingMarkerForToken(
  layout: NominalBindingClauseScope,
  tokens: readonly RuntimeHaruToken[],
  tokenIdx: number,
  beforeIdx: number
): NominalPhraseBindingMarker | null {
  const clause = layout.clauseOfToken(tokenIdx);
  if (clause === undefined || tokenIdx < clause.start || tokenIdx >= clause.end) {
    return null;
  }
  const endExclusive = Math.min(clause.end, beforeIdx);
  let markerIdx = nextNonSpaceIndex(tokens, tokenIdx + 1, endExclusive);
  while (markerIdx !== null && markerIdx < endExclusive) {
    const focus = topicFocusMarkerRelationForToken(tokens[markerIdx], markerIdx, {
      acceptedSurfaces: ["も"],
      consumers: ["clause_layout"]
    });
    if (focus !== null) {
      const negativeIdx = nextNonSpaceIndex(tokens, focus.span.endExclusive, endExclusive);
      if (
        negativeIdx !== null &&
        matchNegativeTailStart(new TokenCursor(tokens, negativeIdx, endExclusive, negativeIdx)) !== null
      ) {
        return { markerIdx, surface: "も", span: focus.span };
      }
      return null;
    }
    markerIdx = nextNonSpaceIndex(tokens, markerIdx + 1, endExclusive);
  }
  return null;
}

function nominalRunEnd(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  endExclusive: number
): number | null {
  const firstPos0 = (tokens[start]?.pos ?? 0) & POS0;
  if (firstPos0 !== 名詞 && firstPos0 !== 代名詞) {
    return null;
  }
  let end = start + 1;
  while (end < endExclusive) {
    const nextIdx = nextNonSpaceIndex(tokens, end, endExclusive);
    if (nextIdx === null || !pos0in((tokens[nextIdx]?.pos ?? 0) & POS0, NOMINAL_BITS)) {
      break;
    }
    end = nextIdx + 1;
  }
  return end;
}

function bindingMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number
): NominalPhraseBindingMarker | null {
  const ka = kaMarkerRelationForToken(tokens[markerIdx], markerIdx, ["clause_layout"]);
  if (ka !== null) {
    return { markerIdx, surface: "か", span: ka.span };
  }
  const focus = topicFocusMarkerRelationForToken(tokens[markerIdx], markerIdx, {
    acceptedSurfaces: ["も"],
    consumers: ["clause_layout"]
  });
  return focus === null
    ? null
    : { markerIdx, surface: "も", span: focus.span };
}

function deMoBindingMarkerAt(
  tokens: readonly RuntimeHaruToken[],
  deIdx: number,
  endExclusive: number
): NominalPhraseBindingMarker | null {
  const bridge = dewaScopeBridgeRelationAt(tokens, deIdx, { consumers: ["clause_layout"] });
  if (bridge === null || bridge.focusParticle !== "mo" || bridge.span.endExclusive > endExclusive) {
    return null;
  }
  return {
    markerIdx: bridge.span.endExclusive - 1,
    surface: "も",
    span: bridge.span
  };
}
