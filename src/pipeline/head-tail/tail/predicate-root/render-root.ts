import { pronominalNoHeadStemSurface } from "../../../nominal-phrase-surface.js";
import { unsupportedGrammarRawWarning } from "../../../fallback/unsupported-raw.js";
import type { RenderedTarget } from "../../../../types/projection.js";
import { headRequiresNominalKiComplement } from "./attributive-head-policy.js";
import { auxOpClosesNegativeCopulaBridge, type AuxLayerNode, type TailRoot } from "./grammar.js";
import { auxLayerConsumedSourceSequence } from "./inspect.js";
import { tailTraceSegmentsToTargetSegments, traceSfpTailFromBaseSegments, tracedText, type RenderContext, type RenderOutcome, applyStemAffixToOutcome } from "./renderers/base-model.js";
import { PRODUCTION_REGISTRY, retiredLegacyProductionFamilyId, resolveProductionDispatch } from "./production-registry.js";
import { lowerProductionMatch } from "./production-lowering-bindings.js";
import { createConnectiveOp } from "./op-builders.js";
import { renderCommittedAttributiveTerminalLayer } from "./render.js";
import { renderCommittedTailTerminalLayer } from "./render-sfp-terminal.js";
import { isQuestionContentConnective } from "./bare-noun-stem-hosting.js";

function withPronominalNoHeadStemResolved(root: TailRoot, formal: boolean): TailRoot {
  if (root.tail.kind !== "auxLayer") {
    return root;
  }
  const layer = root.tail;
  const stem = layer.stem;
  if (stem.kind !== "noun" || stem.pronominalNoHeadBase === undefined) {
    return root;
  }
  const { pronominalNoHeadBase, ...rest } = stem;
  return {
    ...root,
    tail: {
      ...layer,
      stem: {
        ...rest,
        lemma: pronominalNoHeadStemSurface(pronominalNoHeadBase, {
          formal,
          fullForm: !pronominalNoHeadTakesContractedForm(layer)
        })
      }
    }
  };
}

function pronominalNoHeadTakesContractedForm(layer: AuxLayerNode): boolean {
  if (layer.terminal !== null) {
    return false;
  }
  const first = layer.ops[0];
  if (
    first === undefined ||
    first.kind !== "copula" ||
    first.polarity !== "affirmative" ||
    (first.variant !== "basic" && first.variant !== "conditional_nara")
  ) {
    return false;
  }
  return layer.ops.every((op) =>
    op.kind === "copula" ||
    op.kind === "tense" ||
    (op.kind === "connective" && !isQuestionContentConnective(op)));
}

function withNegativeCopulaCorrectionTeRole(root: TailRoot): TailRoot {
  const layer = root.tail;
  if (layer.kind !== "auxLayer") {
    return root;
  }
  const teIdx = layer.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  const te = teIdx > 0 ? layer.ops[teIdx] : undefined;
  if (te?.kind !== "connective" || te.teFormRole !== undefined || !auxOpClosesNegativeCopulaBridge(layer.ops[teIdx - 1])) {
    return root;
  }
  const ops = layer.ops.map((op, index) => index === teIdx ? { ...te, teFormRole: "listing" as const } : op);
  return { ...root, tail: { ...layer, ops } };
}

export function renderTail(root: TailRoot, ctx: RenderContext): RenderOutcome {
  root = withNegativeCopulaCorrectionTeRole(withPronominalNoHeadStemResolved(root, ctx.formal));
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "ConnectiveNode (nested tree IR) rendering not supported — Phase 5+ 영역" };
  }
  if (headRequiresNominalKiComplement(root.tail)) {
    return renderTailPredicateGerundProjection(root, ctx);
  }
  return applyStemAffixToOutcome(renderTailWithoutStemAffix(root, ctx), root.tail.stem);
}

export function renderTailWithoutStemAffix(
  root: TailRoot,
  ctx: RenderContext,
  options: {
    readonly skipFamilyId?: string;
    readonly bypassRegistry?: boolean;
  } = {}
): RenderOutcome {
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "production lowering requires aux layer root" };
  }
  const committedRenderContext = {
    intake: { site: "committed_render", partial: false }
  } as const;
  if (
    options.bypassRegistry === true ||
    options.skipFamilyId !== undefined
  ) {
    const retiredFamilyId = retiredLegacyProductionFamilyId(
      root,
      committedRenderContext
    );
    if (
      retiredFamilyId !== null &&
      (
        options.bypassRegistry === true ||
        options.skipFamilyId === retiredFamilyId
      )
    ) {
      return {
        ok: false,
        reason: `legacy renderer retired for production family '${retiredFamilyId}'`
      };
    }
  }
  if (options.bypassRegistry !== true) {
    const registry = options.skipFamilyId === undefined
      ? PRODUCTION_REGISTRY
      : PRODUCTION_REGISTRY.filter((family) => family.id !== options.skipFamilyId);
    const productionDispatch = resolveProductionDispatch(root, committedRenderContext, registry);
    if (productionDispatch.kind === "registry") {
      return lowerProductionMatch(
        root,
        productionDispatch.match,
        ctx,
        renderTailWithoutStemAffix,
        renderCommittedAttributiveTerminalLayer,
        renderCommittedTailTerminalLayer
      );
    }
    if (productionDispatch.kind === "non_admission") {
      if (options.skipFamilyId !== undefined) {
        return {
          ok: false,
          reason:
            `nested production redispatch reached non-admission ` +
            `${productionDispatch.familyId}/${productionDispatch.policy}`
        };
      }
      throw new Error(
        `production registry invariant violation: committed render reached non-admission ` +
        `${productionDispatch.familyId}/${productionDispatch.policy}`
      );
    }
    if (
      productionDispatch.kind === "legacy_dispatch" &&
      options.skipFamilyId === undefined
    ) {
      return unclaimedTailRawOutcome(root);
    }
  }
  return renderCommittedTailTerminalLayer(root.tail, root.sfp, ctx);
}

const UNCLAIMED_TAIL_RAW_OP_KIND = "unclaimed_tail_raw";

function committedTailRootSourceTokens(
  root: TailRoot
): readonly (readonly [number, string])[] {
  if (root.tail.kind !== "auxLayer") return [];
  return auxLayerConsumedSourceSequence(root.tail, root.sfp)
    .map(([tokenIndex, token]) => [tokenIndex, token.surface] as const);
}

function committedTailRootSourceSpan(
  root: TailRoot
): { readonly start: number; readonly end: number } | null {
  const tokens = committedTailRootSourceTokens(root);
  const first = tokens[0];
  const last = tokens.at(-1);
  return first === undefined || last === undefined
    ? null
    : { start: first[0], end: last[0] };
}

function unclaimedTailRawOutcome(root: TailRoot): RenderOutcome {
  const tokens = committedTailRootSourceTokens(root);
  const span = committedTailRootSourceSpan(root);
  const text = tokens.map(([, surface]) => surface).join("");
  return {
    ok: true,
    text,
    polite: false,
    rawSourceSurface: true,
    warnings: [
      unsupportedGrammarRawWarning(
        UNCLAIMED_TAIL_RAW_OP_KIND,
        span,
        `unsupported grammar: no production family claimed this tail; ` +
        `the consumed source span was kept raw. surface=${text}`
      )
    ]
  };
}

export function renderTailWithSourceTargetTrace(
  root: TailRoot,
  ctx: RenderContext
): RenderedTarget | null {
  if (root.tail.kind !== "auxLayer") {
    return null;
  }
  const rendered = renderTail(root, ctx);
  if (!rendered.ok) {
    return null;
  }
  if (
    rendered.traced !== undefined &&
    tracedText(rendered.traced) === rendered.text &&
    !rendered.traced.some((piece) => piece.chainFinalPlaceholder === true)
  ) {
    return {
      text: rendered.text,
      segments: tailTraceSegmentsToTargetSegments(rendered.traced)
    };
  }
  if (root.sfp !== null) {
    const baseRendered = renderTail({ tail: root.tail, sfp: null, quoteBinding: root.quoteBinding }, ctx);
    if (!baseRendered.ok) {
      return null;
    }
    if (
      baseRendered.traced === undefined ||
      tracedText(baseRendered.traced) !== baseRendered.text ||
      baseRendered.traced.some((piece) => piece.chainFinalPlaceholder === true)
    ) {
      return null;
    }
    return traceSfpTailFromBaseSegments(
      tailTraceSegmentsToTargetSegments(baseRendered.traced),
      baseRendered.text,
      rendered.text,
      root.sfp
    );
  }
  return null;
}

export function renderTailPredicateGerundProjection(root: TailRoot, ctx: RenderContext): RenderOutcome {
  if (root.tail.kind !== "auxLayer") {
    return { ok: false, reason: "predicate gerund projection requires aux layer tail root" };
  }
  const baseTail = root.tail.terminal === "attributive"
    ? { ...root.tail, terminal: null }
    : root.tail;
  const projected: TailRoot = {
    ...root,
    tail: {
      ...baseTail,
      ops: [
        ...baseTail.ops,
        createConnectiveOp({

          connective: "predicate_projection_tame_gerund",
          surface: "",
          source: { tokens: [], tokenIndices: [] }
        })
      ]
    },
    sfp: null
  };
  return renderTail(projected, ctx);
}
