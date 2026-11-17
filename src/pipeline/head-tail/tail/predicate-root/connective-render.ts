import { RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE, type ConnectiveOp } from "./grammar.js";
import type { ClauseBoundary } from "./commit.js";

export interface ConnectiveRenderContext {
  readonly outgoingBoundary?: ClauseBoundary;
}

export function shouldCarryConnectivePoliteness(ctx: ConnectiveRenderContext): boolean {
  return ctx.outgoingBoundary?.kind !== "terminal" ? false : true;
}

export function connectiveForRender(connective: ConnectiveOp, ctx: ConnectiveRenderContext): ConnectiveOp {
  const boundary = ctx.outgoingBoundary;
  if (boundary === undefined || boundary.kind === "terminal") {
    return connective;
  }
  if (!connective.source.tokenIndices.includes(boundary.tokenIdx)) {
    return connective;
  }
  if (connective.surface === RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE && connective.connective === "te_form") {
    return connective;
  }
  if (connectiveSurfaceSpecializesBoundary(connective, boundary.surface)) {
    return connective;
  }
  if (connective.connective === boundary.connectiveKind && connective.surface === boundary.surface) {
    return connective;
  }
  return {
    ...connective,
    connective: boundary.connectiveKind,
    surface: boundary.surface,
    ...(boundary.boundNominalReasonMonoNoun === undefined
      ? {}
      : { boundNominalReasonMonoNoun: boundary.boundNominalReasonMonoNoun })
  };
}

export function isTerminalTeFormConnective(connective: ConnectiveOp, ctx: ConnectiveRenderContext): boolean {
  return connective.connective === "te_form" &&
    (connective.surface === "て" || connective.surface === "で") &&
    ctx.outgoingBoundary?.kind !== "接続助詞";
}

function connectiveSurfaceSpecializesBoundary(connective: ConnectiveOp, boundarySurface: string): boolean {
  return (
    (connective.surface === "でありながら" && boundarySurface === "ながら") ||
    (connective.surface === "__renyou_mo" && boundarySurface === "も") ||
    (connective.connective === "exemplification" && connective.surface.endsWith("とか") && boundarySurface === "か")
  );
}
