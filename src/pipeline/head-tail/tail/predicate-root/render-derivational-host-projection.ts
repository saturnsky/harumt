import type { AttributiveBoundaryPayload, AuxLayerNode, AuxOpNode, OpSource, TailRoot } from "./grammar.js";
import { type RenderContext, type RenderOutcome, applyStemAffixToOutcome } from "./renderers/base-model.js";
import { createConnectiveOp } from "./op-builders.js";
import { renderCommittedAttributiveTerminalLayer } from "./render.js";
import { renderTail, renderTailPredicateGerundProjection } from "./render-root.js";

export function renderDerivationalSuffixHostProjection(options: {
  readonly host: TailRoot;
  readonly hostForm: "nominal_ki" | "nominal_m" | "attributive_present" | "attributive_completed";
  readonly suffixSource: OpSource;
  readonly ctx: RenderContext;
}): RenderOutcome {
  if (options.hostForm === "nominal_ki") {
    return renderTailPredicateGerundProjection(options.host, options.ctx);
  }
  const layer = options.host.tail;
  if (layer.kind !== "auxLayer") {
    return { ok: false, reason: "derivational suffix host projection requires an aux layer host" };
  }
  if (options.hostForm === "nominal_m") {
    return renderDerivationalSuffixNominalMProjection(layer, options.ctx, options.host);
  }
  const boundary = options.hostForm === "attributive_completed"
    ? derivationalSuffixAttributiveBoundary(options.suffixSource)
    : null;
  return applyStemAffixToOutcome(
    renderCommittedAttributiveTerminalLayer(
      {
        ...layer,
        terminal: "attributive",
        ...(boundary === null ? {} : { terminalPayload: boundary })
      },
      options.ctx
    ),
    layer.stem
  );
}

function renderDerivationalSuffixNominalMProjection(
  layer: AuxLayerNode,
  ctx: RenderContext,
  host: TailRoot
): RenderOutcome {
  const stem = layer.stem;
  if (stem.kind === "noun" && layer.ops.length === 0 && layer.terminal === null) {
    return applyStemAffixToOutcome({ ok: true, text: stem.lemma, polite: false }, stem);
  }
  return renderTail(
    {
      ...host,
      tail: {
        ...layer,
        terminal: null,
        ops: [...layer.ops, buildDerivationalNominalMProjectionConnective()]
      },
      sfp: null
    },
    ctx
  );
}

export function buildDerivationalNominalMProjectionConnective(): Extract<AuxOpNode, { readonly kind: "connective" }> {
  return createConnectiveOp({
    connective: "predicate_projection_derivational_nominal_m",
    surface: "",
    source: { tokens: [], tokenIndices: [] }
  });
}

function derivationalSuffixAttributiveBoundary(source: OpSource): AttributiveBoundaryPayload | null {
  const head = source.tokens[source.tokens.length - 1];
  const tokenIdx = source.tokenIndices[source.tokenIndices.length - 1];
  if (head === undefined || tokenIdx === undefined) {
    return null;
  }
  return {
    kind: "attributiveBoundary",
    source,
    head: {
      surface: head.surface,
      dictionaryForm: head.dictionaryForm,
      pos: head.pos,
      tokenIdx
    },
    headKind: "scope_or_bound",
    projectionContext: { tokens: [], contentIdx: 0 },
    projection: "ordinary_nominal",
    headRequiredComplement: { kind: "adnominal", ending: "ㄴ/은" }
  };
}
