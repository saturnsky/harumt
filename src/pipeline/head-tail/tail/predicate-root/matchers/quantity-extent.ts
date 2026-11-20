import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  POS0,
  POS01,
  POS4,
  助動詞 as 助動詞0,
  助動詞_タイ,
  助詞,
  助詞_係助詞,
  形容詞0,
  isNaAdjCapable,
  isTerminalOrAttributiveInflection,
  isVerbPredicateToken
} from "../../../../../types/pos.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { prenominalMarkerHeadReachAfterToken } from "../../../../clause-layout/prenominal-head-reach.js";
import type { ClauseToken } from "../../../../clause-layout/layout-types.js";
import type { PrenominalMarkerHeadReachLayout } from "../../../../clause-layout/nominal-anchor-evidence.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { nominalLinkMarkerRelationAt } from "../../../boundary/marker.js";
import { matrixPredicateReachAt } from "../../../boundary/modifier-field.js";
import { isBoundaryPunctuationCategoryToken } from "../../../boundary/punctuation.js";
import { isAdnominalCopulaToken } from "../classifiers/tokens.js";
import { isDakeFocusParticle, matchFocusConnectiveAt } from "./focus-connective.js";
import { matchFocusLimitCarrier } from "./focus-limit-carrier.js";

export interface QuantityExtentLayout extends PrenominalMarkerHeadReachLayout {
  connectiveConsequentReachEnd(tokens: readonly ClauseToken[], tokenIdx: number): number | undefined;
}

export type QuantityExtentDakeBinding = "predicate" | "nominal";

export interface QuantityExtentDakeMatch {
  readonly surface: string;
  readonly consumed: number;
  readonly binding: QuantityExtentDakeBinding;
}

export function matchQuantityExtentDakeAt(
  tokens: readonly RuntimeHaruToken[],
  markerIdx: number,
  lookups: LookupTables,
  layout: QuantityExtentLayout | null | undefined
): QuantityExtentDakeMatch | null {
  if (layout === null || layout === undefined) {
    return null;
  }
  const marker = tokens[markerIdx];
  if (!isDakeFocusParticle(marker)) {
    return null;
  }
  if (!quantityExtentHostEndsAt(tokens, markerIdx - 1, lookups)) {
    return null;
  }
  if (
    matchFocusConnectiveAt(tokens, markerIdx) !== null ||
    matchFocusLimitCarrier(new TokenCursor(tokens, markerIdx, tokens.length)) !== null
  ) {
    return null;
  }
  const follower = tokens[markerIdx + 1];
  if (follower === undefined) {
    return null;
  }
  if (nominalLinkMarkerRelationAt(tokens, markerIdx + 1, { consumers: ["tail_multi_clause"] }) !== null) {
    return prenominalMarkerHeadReachAfterToken(layout, tokens, markerIdx + 1, lookups) === null
      ? null
      : { surface: `${marker!.surface}${follower.surface}`, consumed: 2, binding: "nominal" };
  }
  const topicFocus = follower.surface === "は" && (follower.pos & POS01) === 助詞_係助詞;
  const start = topicFocus ? markerIdx + 2 : markerIdx + 1;
  const first = tokens[start];
  if (
    first === undefined ||
    (first.pos & POS0) === 助詞 ||
    isBoundaryPunctuationCategoryToken(first)
  ) {
    return null;
  }
  const reachEnd = layout.connectiveConsequentReachEnd(tokens, markerIdx);
  if (reachEnd === undefined || start >= reachEnd) {
    return null;
  }
  const reach = matrixPredicateReachAt(tokens, start, Math.min(reachEnd, tokens.length), {
    registeredPredicateStart: () => false,
    openPredicateStart: (candidates, idx) => {
      const candidate = candidates[idx];
      return candidate !== undefined && isVerbPredicateToken(candidate);
    }
  });
  if (reach !== "predicate") {
    return null;
  }
  return topicFocus
    ? { surface: `${marker!.surface}${follower.surface}`, consumed: 2, binding: "predicate" }
    : { surface: marker!.surface, consumed: 1, binding: "predicate" };
}

function quantityExtentHostEndsAt(
  tokens: readonly RuntimeHaruToken[],
  hostEndIdx: number,
  lookups: LookupTables
): boolean {
  const end = tokens[hostEndIdx];
  if (end === undefined) {
    return false;
  }
  const hosts = lookups.set("quantity_extent_dake", "hosts");
  if (isAdnominalCopulaToken(end)) {
    const stem = tokens[hostEndIdx - 1];
    return stem !== undefined &&
      isNaAdjCapable(stem) &&
      hosts.has(stem.dictionaryForm || stem.surface);
  }
  if (!isTerminalOrAttributiveInflection(end.pos)) {
    return false;
  }
  if ((end.pos & POS0) === 助動詞0 && (end.pos & POS4) === 助動詞_タイ) {
    return true;
  }
  return (end.pos & POS0) === 形容詞0 && hosts.has(end.dictionaryForm || end.surface);
}
