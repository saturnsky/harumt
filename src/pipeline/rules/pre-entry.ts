import type { MatcherToken } from "../matchers.js";
import type { ContentCtx, PhaseStep } from "../content-types.js";
import type { LookupTables } from "../lookup-tables.js";
import { TokenCursor } from "../token-cursor.js";
import { ruleTokoroHeadDispatch } from "../semantics/tokoro.js";
import { kaMarkerRelationAt, nominalLinkMarkerRelationAt } from "../head-tail/boundary/marker.js";
import { POS0, 形状詞, 助詞 } from "../../types/pos.js";

function isPreEntryKaMarker(tokens: readonly MatcherToken[], index: number): boolean {
  return kaMarkerRelationAt(tokens, index, ["pre_entry_rules"]) !== null;
}

export type PreEntryRule = (resolver: PreEntryResolver, ctx: ContentCtx, isPotential: boolean, lookups: LookupTables) => PhaseStep | null;

export interface PreEntryResolver {
  readonly lookups: LookupTables;
}

export type PreEntryRuleName =
  | "ruleTokoroHeadDispatch";

const PRE_ENTRY_RULE_TABLE = [
  ["ruleTokoroHeadDispatch", ruleTokoroHeadDispatch]
] as const satisfies readonly (readonly [PreEntryRuleName, PreEntryRule])[];

export const PRE_ENTRY_RULE_NAMES: readonly PreEntryRuleName[] =
  PRE_ENTRY_RULE_TABLE.map(([name]) => name);

export const PRE_ENTRY_RULES: readonly PreEntryRule[] =
  PRE_ENTRY_RULE_TABLE.map(([, rule]) => rule);

export function matchPreEntryKaNoYouFamilyStart(cursor: TokenCursor<MatcherToken>): boolean {
  if (cursor.current() === undefined || isPreEntryKaMarker(cursor.tokens, cursor.pos) === false) {
    return false;
  }
  if (cursor.peek(1) === undefined) {
    return false;
  }
  if (cursor.peek(1)?.surface === "のように" && ((cursor.peek(1)?.pos ?? 0) & POS0) === 助詞) {
    return true;
  }
  return cursor.peek(2) !== undefined &&
    nominalLinkMarkerRelationAt(cursor.tokens, cursor.pos + 1, { consumers: ["pre_entry_rules"] }) !== null &&
    cursor.peek(2)?.surface === "よう" &&
    ((cursor.peek(2)?.pos ?? 0) & POS0) === 形状詞;
}
