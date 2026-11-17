import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { isBoundaryPunctuationToken, type BoundaryToken } from "../../../boundary/punctuation.js";
import {
  POS0,
  助詞,
  名詞
} from "../../../../../types/pos.js";
import { isTameHead, TAME_FORMS, type LookupTables } from "../../../../lookup-tables.js";
import { matchQuotedJudgmentPassiveTail } from "../../../../semantics/modality-specs.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import {
  caseParticleMarkerRelationForToken,
  nominalLinkMarkerRelationAt
} from "../../../boundary/marker.js";
import type { AuxOpNode } from "../grammar.js";
import { tailOpsPreferTameReason } from "../tame-reason-evidence.js";

export interface TameConnectiveMatch {
  readonly connective: "tame_reason" | "tame_purpose";
  readonly surface: string;
  readonly consumed: number;
}

export interface TameQuotedJudgmentPassiveConnectiveMatch {
  readonly connective: "reason_quoted_judgment_passive";
  readonly surface: string;
  readonly consumed: number;
}

export function matchTameConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: {
    readonly requireEnd?: boolean;
    readonly previousOps?: readonly AuxOpNode[];
    readonly stemToken?: RuntimeHaruToken;
    readonly lookups: LookupTables;
  }
): TameConnectiveMatch | null {
  const tame = tokens[pos];
  if (tame === undefined || !TAME_FORMS.has(tame.dictionaryForm || tame.surface)) {
    return null;
  }
  const prevIdx = previousNonSpaceIndex(tokens, pos);
  if (prevIdx !== null && nominalLinkMarkerRelationAt(tokens, prevIdx, { consumers: ["tail_multi_clause"] }) !== null) {
    return null;
  }
  const next = tokens[pos + 1];
  if (nominalLinkMarkerRelationAt(tokens, pos + 1, { consumers: ["tail_multi_clause"] }) !== null) {
    return null;
  }
  const nextNi = caseParticleMarkerRelationForToken(next, pos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) !== null;
  if (next !== undefined && (next.pos & POS0) === 助詞 && !nextNi) {
    return null;
  }
  const consumed = nextNi ? 2 : 1;
  if ((options.requireEnd ?? true) && tokens[pos + consumed] !== undefined) {
    return null;
  }
  const stemLemma = options.stemToken?.dictionaryForm || options.stemToken?.surface;
  const connective = tailOpsPreferTameReason({
    ops: options.previousOps ?? [],
    tokens,
    tameIndex: pos,
    lookups: options.lookups,
    stemLemma,
    negationPolicy: "strict_negation_op"
  })
    ? "tame_reason"
    : "tame_purpose";
  return {
    connective,
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

export function matchTameQuotedJudgmentPassiveConnectiveAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly requireEnd?: boolean } = {}
): TameQuotedJudgmentPassiveConnectiveMatch | null {
  const { tokens, pos } = cursor;
  const tame = tokens[pos];
  if (tame === undefined || !TAME_FORMS.has(tame.dictionaryForm || tame.surface)) {
    return null;
  }
  const judgment = cursor.lookahead(1, matchQuotedJudgmentPassiveTail);
  if (judgment === null) {
    return null;
  }
  const consumed = judgment.passivePos + 1 - pos;
  if ((options.requireEnd ?? false) && pos + consumed < cursor.end) {
    return null;
  }
  return {
    connective: "reason_quoted_judgment_passive",
    surface: tokens.slice(pos, pos + consumed).map((token) => token.surface).join(""),
    consumed
  };
}

export function boundNominalReasonCompositeFollowerAdmitted(
  tokens: readonly BoundaryToken[],
  spanEndExclusive: number
): boolean {
  const boundNominal = tokens[spanEndExclusive - 1];
  if (boundNominal === undefined || (boundNominal.pos & POS0) !== 名詞) {
    return true;
  }
  if (isTameHead({ ...boundNominal, dictionaryForm: boundNominal.dictionaryForm ?? boundNominal.surface })) {
    return true;
  }
  if (nominalLinkMarkerRelationAt(tokens, spanEndExclusive, { consumers: ["tail_multi_clause"] }) !== null) {
    return false;
  }
  const follower = tokens[spanEndExclusive];
  return follower === undefined || isBoundaryPunctuationToken(follower);
}
