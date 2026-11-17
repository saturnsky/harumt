import type { TailRoot } from "../grammar.js";
import type { RenderContext, RenderOutcome } from "./base-model.js";

type NormalizedRootRenderer = (
  root: TailRoot,
  renderContext: RenderContext
) => RenderOutcome;

export function composeReasonCopulaConditional(
  normalizedRoot: TailRoot,
  renderContext: RenderContext,
  renderNormalizedRoot: NormalizedRootRenderer
): RenderOutcome {
  return renderNormalizedRoot(normalizedRoot, renderContext);
}
