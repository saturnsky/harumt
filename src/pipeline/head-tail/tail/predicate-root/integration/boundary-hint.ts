import type { ClauseBoundary } from "../commit.js";
import type { TailRootBase } from "../grammar.js";
import { firstAuxLayer, isCommandAspectOp } from "../inspect.js";
import type { ParseOutgoingBoundaryHint } from "../parse-boundary-hint.js";

export function parseOutgoingBoundaryHint(boundary: ClauseBoundary | undefined): ParseOutgoingBoundaryHint | undefined {
  if (boundary === undefined || boundary.kind === "terminal") return undefined;
  return {
    connectiveKind: boundary.connectiveKind,
    surface: boundary.surface,
    ...(boundary.surfaceAllomorph === undefined
      ? {}
      : { surfaceAllomorph: boundary.surfaceAllomorph }),
    tokenIdx: boundary.tokenIdx,
    tokenSpan: boundary.tokenSpan,
    ...(boundary.quoteBoundary === undefined ? {} : { quoteBoundary: boundary.quoteBoundary }),
    ...(boundary.quotativeMood === undefined ? {} : { quotativeMood: boundary.quotativeMood }),
    ...(boundary.retrospectiveQuotativeFlavor === undefined
      ? {}
      : { retrospectiveQuotativeFlavor: boundary.retrospectiveQuotativeFlavor }),
    ...(boundary.retrospectiveDiscoveryStyle === undefined
      ? {}
      : { retrospectiveDiscoveryStyle: boundary.retrospectiveDiscoveryStyle }),
    ...(boundary.pairedConcessive === undefined
      ? {}
      : { pairedConcessive: boundary.pairedConcessive }),
    ...(boundary.attributiveBoundary === undefined
      ? {}
      : { attributiveBoundary: boundary.attributiveBoundary }),
    ...(boundary.quotedQuestionContext === undefined ? {} : { quotedQuestionContext: boundary.quotedQuestionContext }),
    ...(boundary.boundNominalReasonMonoNoun === undefined
      ? {}
      : { boundNominalReasonMonoNoun: boundary.boundNominalReasonMonoNoun }),
    ...(boundary.attemptFocusParticle === undefined
      ? {}
      : { attemptFocusParticle: boundary.attemptFocusParticle })
  };
}

export function refineRequestTerminalOutgoingBoundary(
  root: TailRootBase,
  boundary: ClauseBoundary
): ClauseBoundary {
  if (
    boundary.kind === "terminal" ||
    boundary.connectiveKind !== "conditional" ||
    boundary.surface !== "と"
  ) {
    return boundary;
  }
  const layer = firstAuxLayer(root.tail);
  if (layer === null) {
    return boundary;
  }
  const connectiveIndex = layer.ops.findIndex((op) =>
    op.kind === "connective" &&
    op.connective === "conditional" &&
    op.source.tokenIndices.includes(boundary.tokenIdx)
  );
  if (connectiveIndex <= 0 || connectiveIndex !== layer.ops.length - 1) {
    return boundary;
  }
  const preceding = layer.ops[connectiveIndex - 1];
  if (preceding === undefined || !isCommandAspectOp(preceding)) {
    return boundary;
  }
  return {
    ...boundary,
    connectiveKind: "quotative",
    quotativeMood: "imperative"
  };
}
