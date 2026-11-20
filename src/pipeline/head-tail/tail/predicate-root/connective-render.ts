import { RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE, type ConnectiveOp } from "./grammar.js";
import type { ClauseBoundary } from "./commit.js";
import type { RenderContext } from "./renderers/base-model.js";

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

export function teConnectiveClosesUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (ctx.outgoingBoundary?.kind !== "terminal" || ctx.layout === undefined) {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  return Number.isFinite(teIdx) && ctx.layout.chuushiClosureAt(teIdx + 1)?.right === "detached";
}

export function renyouChuushiClosesUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || connective.surface !== RENYOU_CHUUSHI_SYNTHETIC_TE_SURFACE || ctx.layout === undefined) {
    return false;
  }
  const hostIdx = Math.max(...connective.source.tokenIndices);
  return Number.isFinite(hostIdx) &&
    ctx.layout.chuushiClosureAt(hostIdx + 1)?.hostKind === "renyou" &&
    teConnectiveClosesUtterance(connective, ctx);
}

export function teConnectiveClosesAsIisashi(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || ctx.layout === undefined) {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  const act = Number.isFinite(teIdx) ? ctx.layout.teUtteranceActAt(teIdx) : undefined;
  return act?.position === "utterance_final" && act.scope !== "quoted_content" && act.iisashiSignals.length > 0;
}

export function teConnectiveClosesQuotedUtterance(connective: ConnectiveOp, ctx: RenderContext): boolean {
  if (connective.connective !== "te_form" || (connective.surface !== "て" && connective.surface !== "で") || ctx.layout === undefined) {
    return false;
  }
  if (connective.teFormRole !== undefined && connective.teFormRole !== "linkage" && connective.teFormRole !== "listing") {
    return false;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  const act = Number.isFinite(teIdx) ? ctx.layout.teUtteranceActAt(teIdx) : undefined;
  return act?.position === "utterance_final" && act.scope === "quoted_content";
}

export function utteranceFinalTeConnectiveForRender(connective: ConnectiveOp, ctx: RenderContext): ConnectiveOp {
  if (
    connective.connective !== "te_form" ||
    (connective.teFormRole !== undefined && connective.teFormRole !== "linkage") ||
    ctx.layout === undefined ||
    isTerminalTeFormConnective(connective, ctx) ||
    teConnectiveClosesQuotedUtterance(connective, ctx)
  ) {
    return connective;
  }
  const teIdx = Math.max(...connective.source.tokenIndices);
  if (!Number.isFinite(teIdx) || ctx.layout.teUtteranceActAt(teIdx)?.position !== "utterance_final") {
    return connective;
  }
  return { ...connective, teFormRole: teConnectiveClosesAsIisashi(connective, ctx) ? "linkage" : "listing" };
}

export function isVolitionalPurposeToConnective(connective: ConnectiveOp): boolean {
  return connective.connective === "conditional" || connective.connective === "volitional_purpose";
}
