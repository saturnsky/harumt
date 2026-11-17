import type { LookupTables } from "../../lookup-tables.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import { POS0, POS4, POS5A, pos0in, isNaAdjCapable, NOMINAL_BITS, 助動詞_ダ, 助詞, 連用形_ } from "../../../types/pos.js";
import { TokenCursor } from "../../token-cursor.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  type UtteranceClosureEvidence,
  type UtteranceClosureKind
} from "../../clause-layout/utterance-closure.js";
import { activeProtoLayout } from "../../clause-layout/proto-state.js";
import { copulaFocusContinuationRelationAt } from "../boundary/window.js";
import { dewaScopeBridgeRelationAt } from "../boundary/marker.js";
import { matchCopula } from "../tail/predicate-root/matchers/copula.js";
import {
  copulaFocusScopeBodyIdentityAt,
  scopeBridgeBodyClosesAt
} from "../tail/predicate-root/matchers/scope-bridge.js";
import {
  copulaClauseContinuationEvidenceAfter,
  elidedDewaNegativeBodyAdmissionStandsAt
} from "../tail/predicate-root/integration.js";
import {
  copulaFocusAdjunctRealizationFor,
  type CopulaFocusAdjunctRealization
} from "../data/copula-focus-adjunct-table.js";

export interface CopulaFocusAdjunctRelation {
  readonly kind: "copula_focus_adjunct";
  readonly hostIdx: number;
  readonly copulaIdx: number;
  readonly focusIdx: number;
  readonly focusSurface: string;
  readonly realization: CopulaFocusAdjunctRealization;
}

export function copulaFocusAdjunctRelationAt(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number,
  lookups: LookupTables
): CopulaFocusAdjunctRelation | null {
  const host = tokens[hostIdx];
  if (host === undefined || !(pos0in(host.pos, NOMINAL_BITS) || isNaAdjCapable(host))) {
    return null;
  }
  const copulaIdx = hostIdx + 1;
  const copula = tokens[copulaIdx];
  if (
    copula === undefined ||
    copula.surface !== "で" ||
    (copula.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
  ) {
    return null;
  }
  const focusIdx = copulaIdx + 1;
  const focus = tokens[focusIdx];
  if (focus === undefined || (focus.pos & POS0) !== 助詞) {
    return null;
  }
  const focusContinuation = copulaFocusContinuationRelationAt(tokens, focusIdx, {
    consumers: ["content_head_dispatch"],
    lookups
  });
  if (focusContinuation === null || focusContinuation.copulaIdx !== copulaIdx) {
    return null;
  }
  const realization = copulaFocusAdjunctRealizationFor(focusContinuation.focusSurface);
  if (realization === null) {
    return null;
  }
  if (!copulaFocusBodyAbsent(tokens, copulaIdx, focusIdx, lookups)) {
    return null;
  }
  const closure = utteranceClosureAfter(activeProtoLayout(), tokens, focusIdx + 1);
  const continuation = elidedDewaNegativeBodyAdmissionStandsAt(tokens, copulaIdx, focusIdx, closure)
    ? null
    : copulaClauseContinuationEvidenceAfter(tokens, focusIdx, lookups);
  if (continuation === null && !closedFocusIdentityFragmentAt(tokens, copulaIdx, closure)) {
    return null;
  }
  if (
    continuation !== null &&
    continuation.predicateIdx !== null &&
    continuation.branch === "content_prelude" &&
    !continuation.punctuationCrossed &&
    copulaFocusScopeBodyIdentityAt(tokens, continuation.predicateIdx, lookups)
  ) {
    return null;
  }
  return {
    kind: "copula_focus_adjunct",
    hostIdx,
    copulaIdx,
    focusIdx,
    focusSurface: focusContinuation.focusSurface,
    realization
  };
}


function closedFocusIdentityFragmentAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  closure: UtteranceClosureEvidence
): boolean {
  const bridge = dewaScopeBridgeRelationAt(tokens, copulaIdx, {
    consumers: ["content_head_dispatch"]
  });
  if (bridge?.focusParticle !== "sae" && bridge?.focusParticle !== "shika") {
    return false;
  }
  return closesUtteranceAs(closure, FOCUS_IDENTITY_FRAGMENT_CLOSURES);
}

const FOCUS_IDENTITY_FRAGMENT_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

function copulaFocusBodyAbsent(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  focusIdx: number,
  lookups: LookupTables
): boolean {
  if (scopeBridgeBodyClosesAt(new TokenCursor(tokens, focusIdx + 1, tokens.length), "topic", focusIdx)) {
    return false;
  }
  if ((matchCopula(tokens, copulaIdx, lookups)?.consumed ?? 1) !== 1) {
    return false;
  }
  return !copulaFocusScopeBodyIdentityAt(tokens, focusIdx + 1, lookups);
}
