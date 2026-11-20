import type { ClauseLayout } from "../../clause-layout/final-layout.js";
import type { ContextGrammar } from "../../context.js";
import type { LookupTables } from "../../lookup-tables.js";
import type { NumericTables } from "../../../generator/numeric-lookup.js";
import type { RuntimeHaruToken } from "../../../types/token.js";
import type { ProjectionSpan } from "../grammar.js";
import type { ClauseTailIR, CommitContext } from "../tail/predicate-root/commit.js";
import type { TailRoot } from "../tail/predicate-root/grammar.js";
import type { HeadTailClauseRole } from "./head-tail-render-plan.js";

export function clauseRoleCommitContext(options: {
  readonly clauseRole: HeadTailClauseRole;
  readonly root: TailRoot;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
  readonly grammar?: ContextGrammar;
  readonly layoutOverride?: ClauseLayout;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
}): CommitContext {
  const role = options.clauseRole;
  const own: ClauseTailIR = {
    root: options.root,
    clauseIndex: role.clauseIndex,
    tokenSpan: role.tokenSpan,
    contentSpan: role.contentSpan,
    predicateTokenIdx: role.predicateTokenIdx,
    outgoingBoundary: role.outgoingBoundary
  };
  const layout = role.layout ?? options.layoutOverride;
  return {
    clauseIndex: role.clauseIndex,
    predicateTokenIdx: role.predicateTokenIdx,
    peerClauses: role.peerClauses === undefined
      ? [own]
      : role.peerClauses.map((peer) =>
        peer.clauseIndex === own.clauseIndex && peer.predicateTokenIdx === own.predicateTokenIdx
          ? own
          : peer
      ),
    ownClause: own,
    lookups: options.lookups,
    numeric: options.numeric,
    ...(options.sourceTokens === undefined ? {} : { tokens: options.sourceTokens }),
    ...(layout === undefined ? {} : { layout }),
    ...(options.grammar === undefined ? {} : { grammar: options.grammar })
  };
}

export function syntheticTerminalClauseRole(options: {
  readonly tokenSpan: ProjectionSpan;
  readonly predicateTokenIdx: number;
}): HeadTailClauseRole {
  return {
    clauseIndex: 0,
    tokenSpan: options.tokenSpan,
    contentSpan: options.tokenSpan,
    predicateTokenIdx: options.predicateTokenIdx,
    outgoingBoundary: { kind: "terminal" }
  };
}
