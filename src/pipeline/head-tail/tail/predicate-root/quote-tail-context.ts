import type { RuntimeHaruToken } from "../../../../types/token.js";
import { toiuAttributiveTailEnd } from "../../../semantics/marker-roles.js";
import { TokenCursor } from "../../../token-cursor.js";
import { type AuxOpNode, type OpSource, type SfpNode, type QuotedPropositionMood, moodBearingOpBlocksVolitionalSpeechAct, opSourceIsVolitionalInChain, type ConnectiveOp } from "./grammar.js";
import { quotedMoodForClosingSfpEffect } from "./grammar.js";
import type { ParseInput } from "./parse-input.js";
import { isVerbPredicateToken, isVolitionalInflection, isImperativeInflection } from "../../../../types/pos.js";
import { createConnectiveOp } from "./op-builders.js";
import { sourceIndexForInputPosition, contextAlignedPosition } from "./parse-coordinates.js";
import { inflectionCarriesVolitionalSpeechAct, opLastSourceToken } from "./parse-stem.js";

export function installsPredicateHeadOverStem(op: AuxOpNode): boolean {
  return op.kind === "predicateQuoteCarrier" ||
    op.kind === "predicateProjectionCarrier" ||
    op.kind === "postverbAuxiliary" ||
    op.kind === "idiom" ||
    op.kind === "modal" ||
    op.kind === "scopeBridge";
}

export function isOutgoingQuoteMarkerPosition(
  input: ParseInput | undefined,
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): boolean {
  const hint = input?.outgoingBoundaryHint;
  if (input === undefined || hint === undefined || hint.quoteBoundary === undefined) {
    return false;
  }
  const context = contextAlignedPosition(input, cursor, pos);
  if (hint.tokenSpan.start !== sourceIndexForInputPosition(input, pos)) {
    return false;
  }
  return toiuAttributiveTailEnd(context.tokens, context.index, context.tokens.length) === null;
}

export function buildReportedRequestQuotativeOp(source: OpSource): ConnectiveOp {
  return createConnectiveOp({
    connective: "quotative",
    surface: "だって",
    quotativeMood: "imperative",
    quotativeClosure: "reported_request",
    source
  });
}

export function quotedPropositionMood(
  hostStem: RuntimeHaruToken | undefined,
  previousOps: readonly AuxOpNode[],
  quotedSfp?: SfpNode | null,
  closedByQuestionMarker = false
): QuotedPropositionMood {
  const sfpMood = closedByQuestionMarker ? "interrogative" : quotedMoodForClosingSfpEffect(quotedSfp?.effect);
  if (sfpMood !== null) {
    return sfpMood;
  }
  if (hostStem !== undefined && isImperativeInflection(hostStem.pos)) {
    return "imperative";
  }
  if (moodBearingOpBlocksVolitionalSpeechAct(previousOps.at(-1))) {
    return "declarative";
  }
  if (inflectionCarriesVolitionalSpeechAct(hostStem)) {
    return "volitional";
  }
  const moodBearer = previousOps.at(-1);
  if (
    moodBearer !== undefined &&
    hostStem !== undefined &&
    isVerbPredicateToken(hostStem) &&
    opSourceIsVolitionalInChain(moodBearer, previousOps)
  ) {
    return "volitional";
  }
  const closing = previousOps.at(-1);
  if (
    closing?.kind === "polite" &&
    hostStem !== undefined &&
    isVerbPredicateToken(hostStem) &&
    isVolitionalInflection(opLastSourceToken(closing)?.pos ?? 0)
  ) {
    return "volitional";
  }
  return "declarative";
}
