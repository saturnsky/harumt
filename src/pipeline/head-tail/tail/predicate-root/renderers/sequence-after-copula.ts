import type { AuxLayerNode, AuxOpNode, TailRoot } from "../grammar.js";
import type { BaseResult, RenderContext, RenderOutcome } from "./base-model.js";
import { negativeNounCopulaBase, nounCopulaBase } from "./base-support.js";
import { baseResultForNounScopeBridge, committedCarrierPostChainFrame } from "./noun-copula.js";
import { composeCommittedTailTerminal } from "./predicate-terminal-compose.js";
import {
  isTerminalRoleSfpNode,
  loweredTerminalSfpEffect,
  renderTerminalRoleSfpWithFrame
} from "./sfp-question.js";

type NormalizedRootRenderer = (
  root: TailRoot,
  renderContext: RenderContext
) => RenderOutcome;

export function composeSequenceAfterCopula(
  root: TailRoot,
  renderContext: RenderContext,
  renderNormalizedRoot: NormalizedRootRenderer
): RenderOutcome {
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "sequence-after copula requires aux layer root" };
  }
  const ops = root.tail.ops;
  const connectiveIndex = ops.findIndex((op) => op.kind === "connective");
  const connective = connectiveIndex < 0 ? undefined : ops[connectiveIndex];
  const shellOps = ops.slice(connectiveIndex + 1);
  if (
    connective?.kind !== "connective" ||
    connective.connective !== "sequence_after" ||
    shellOps.length === 0
  ) {
    return { ok: false, reason: "sequence-after copula shape not matched" };
  }
  const clauseOps = ops.slice(0, connectiveIndex + 1);
  const clausePolite = clauseOps.some((op) => op.kind === "polite");
  const clauseRoot: TailRoot = {
    ...root,
    tail: {
      ...root.tail,
      ops: clausePolite ? clauseOps.filter((op) => op.kind !== "polite") : clauseOps,
      terminal: null
    },
    sfp: null
  };
  const clause = renderNormalizedRoot(clauseRoot, renderContext);
  if (!clause.ok) {
    return clause;
  }
  const shell = composeCopulaShellOnClauseHost(
    clause.text,
    shellOps,
    clausePolite,
    { ...root.tail, ops: shellOps },
    root.sfp,
    renderContext
  );
  if (!shell.ok) {
    return shell;
  }
  const warnings = [...(clause.warnings ?? []), ...(shell.warnings ?? [])];
  return {
    ok: true,
    text: shell.text,
    polite: shell.polite,
    ...(clause.stemPrefixApplied === true || shell.stemPrefixApplied === true
      ? { stemPrefixApplied: true }
      : {}),
    ...(warnings.length === 0 ? {} : { warnings })
  };
}

function composeCopulaShellOnClauseHost(
  clauseSurface: string,
  shellOps: readonly AuxOpNode[],
  clausePolite: boolean,
  shellLayer: AuxLayerNode,
  sfp: TailRoot["sfp"],
  ctx: RenderContext
): RenderOutcome {
  const head = shellOps[0];
  if (head === undefined) {
    return { ok: false, reason: "sequence-after copula shell is empty" };
  }
  let initialBaseResult: BaseResult;
  let postOps: readonly AuxOpNode[];
  let shellPolite = clausePolite;
  if (head.kind === "copula") {
    if (head.variant !== "basic") {
      return {
        ok: false,
        reason: `sequence-after copula shell variant '${head.variant}' not supported`
      };
    }
    initialBaseResult = {
      ok: true,
      base: head.polarity === "negative"
        ? negativeNounCopulaBase(clauseSurface, 0)
        : nounCopulaBase(clauseSurface, false),
      chainOnFinalSupported: true
    };
    postOps = shellOps.slice(1);
    shellPolite = shellPolite || head.polite;
  } else if (head.kind === "scopeBridge") {
    initialBaseResult = head.particle !== null && head.particle !== "wa"
      ? baseResultForNounScopeBridge(head, clauseSurface, ctx.formal)
      : {
        ok: true,
        base: negativeNounCopulaBase(clauseSurface, Math.max(0, head.chainDepth - 1)),
        chainOnFinalSupported: true
      };
    postOps = shellOps.slice(1);
    shellPolite = shellPolite || head.polite;
  } else {
    initialBaseResult = {
      ok: true,
      base: nounCopulaBase(clauseSurface, false),
      chainOnFinalSupported: true
    };
    postOps = shellOps;
  }
  const carrierFrame = committedCarrierPostChainFrame(
    initialBaseResult,
    postOps,
    shellPolite,
    null,
    ctx
  );
  if ("ok" in carrierFrame) {
    return carrierFrame;
  }
  const frame = {
    baseResult: carrierFrame.baseResult,
    finalNeg: carrierFrame.finalNeg,
    past: carrierFrame.finalPast,
    polite: carrierFrame.terminalPolite
  };
  const loweredSfp = sfp === null ? null : loweredTerminalSfpEffect(sfp);
  if (loweredSfp !== null && loweredSfp.effect !== null) {
    if (!isTerminalRoleSfpNode(loweredSfp)) {
      return {
        ok: false,
        reason: `sequence-after copula does not own SFP effect ${String(loweredSfp.effect)}`
      };
    }
    const terminal = renderTerminalRoleSfpWithFrame(shellLayer, loweredSfp, ctx, frame);
    if (terminal !== null) {
      return terminal;
    }
    return { ok: false, reason: "sequence-after copula lost its typed SFP lowering" };
  }
  return composeCommittedTailTerminal(
    frame.baseResult,
    frame.finalNeg,
    frame.past,
    ctx.formal,
    frame.polite,
    ctx.lookups
  );
}
