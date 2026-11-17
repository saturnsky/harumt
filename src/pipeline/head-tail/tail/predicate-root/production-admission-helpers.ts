import type { AuxOpNode, ConnectiveOp } from "./grammar.js";

export function isQuoteTerminalOp(op: AuxOpNode | undefined): op is ConnectiveOp {
  return op?.kind === "connective" &&
    (op.connective === "quotative" || op.connective === "question_quotative");
}

export function isPlainTeHoshiiAspect(op: AuxOpNode | undefined): boolean {
  return op?.kind === "aspect" &&
    op.aspect === "te_hoshii" &&
    op.desiderative.kind === "te_hoshii" &&
    op.desiderative.desiredPredicateNegative === false &&
    op.desiderative.desireNegative === false &&
    op.desiderative.desirePast === false &&
    op.desiderative.polite === false &&
    op.desiderative.desiredClauseForm === "default";
}
