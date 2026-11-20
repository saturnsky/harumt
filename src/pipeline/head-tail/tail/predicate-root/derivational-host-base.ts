import type { LookupTables } from "../../../lookup-tables.js";
import type { NumericTables } from "../../../../generator/numeric-lookup.js";
import { commitTail, type CommitContext } from "./commit.js";
import { derivationalHostStemRootOf, derivationalSuffixProfileById, HOST_TEMPLATE_PLACEHOLDER } from "./derivational-suffix-table.js";
import type { StemNode, TailNode, TailRoot } from "./grammar.js";
import { renderDerivationalSuffixHostProjection } from "./render-derivational-host-projection.js";
import type { RenderContext } from "./renderers/base-model.js";

export function withProjectedDerivationalStem(
  root: TailRoot,
  context: {
    readonly formal: boolean;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly commitContext?: CommitContext;
  }
): TailRoot | null {
  const layer = root.tail.kind === "auxLayer" ? root.tail : root.tail.inner;
  const stem = layer.stem;
  const base = stem.derivationalBase;
  if (base === undefined) {
    return null;
  }
  const profile = derivationalSuffixProfileById(base.profileId);
  if (profile === undefined || profile.template === undefined || profile.hostForm === "noun_compound") {
    return null;
  }
  const hostLayer = base.host.tail.kind === "auxLayer" ? base.host.tail : base.host.tail.inner;
  if (hostLayer.stem.kind === "candidateSet" && hostLayer.stem.committedSense === undefined) {
    return null;
  }
  const ctx: RenderContext = { formal: context.formal, lookups: context.lookups };
  const host = commitTail(base.host, {
    ...(context.commitContext ?? {}),
    lookups: context.lookups,
    numeric: context.numeric
  }).root;
  const projected = profile.hostForm === "stem_root"
    ? projectDerivationalHostStemRoot(host)
    : renderDerivationalSuffixHostProjection({
      host,
      hostForm: profile.hostForm,
      suffixSource: { tokens: stem.source.tokens.slice(-1), tokenIndices: stem.source.tokenIndices.slice(-1) },
      ctx
    });
  if (!projected.ok || projected.text.length === 0) {
    return null;
  }
  if (stem.kind === "candidateSet") {
    return null;
  }
  const template = layer.terminal === "adverbial_modifier" && profile.adverbialTemplate !== undefined
    ? profile.adverbialTemplate
    : (context.formal ? profile.formalTemplate : undefined) ?? profile.template;
  const realized = template.replace(HOST_TEMPLATE_PLACEHOLDER, projected.text);
  const finalLemma = stem.kind === "adverb" ? undefined : profile.finalLemma;
  if (finalLemma === undefined) {
    return { ...root, tail: withReplacedFirstLayerStem(root.tail, { ...stem, lemma: realized }) };
  }
  if (stem.kind !== "adj" && stem.kind !== "verb") {
    return null;
  }
  const prefix = realized.slice(0, realized.length - finalLemma.length);
  return {
    ...root,
    tail: withReplacedFirstLayerStem(root.tail, {
      ...stem,
      lemma: finalLemma,
      irregular: profile.irregular ?? null,
      ...(prefix.length === 0 ? {} : { koreanPrefix: prefix })
    })
  };
}

function projectDerivationalHostStemRoot(
  host: TailRoot
): { readonly ok: true; readonly text: string } | { readonly ok: false } {
  if (host.tail.kind !== "auxLayer") {
    return { ok: false };
  }
  const layer = host.tail;
  if (layer.ops.length !== 0 || layer.terminal !== null) {
    return { ok: false };
  }
  const stem = layer.stem;
  if (stem.kind !== "adj" && stem.kind !== "verb") {
    return { ok: false };
  }
  const root = derivationalHostStemRootOf(stem);
  return root === null ? { ok: false } : { ok: true, text: root };
}

function withReplacedFirstLayerStem(node: TailNode, stem: StemNode): TailNode {
  return node.kind === "auxLayer"
    ? { ...node, stem }
    : { ...node, inner: { ...node.inner, stem } };
}


export function withDerivationalStemBaseResolved(
  root: TailRoot,
  context: {
    readonly formal: boolean;
    readonly lookups: LookupTables;
    readonly numeric: NumericTables;
    readonly commitContext?: CommitContext;
  }
): TailRoot | null {
  const layer = root.tail.kind === "auxLayer" ? root.tail : root.tail.inner;
  return layer.stem.derivationalBase === undefined
    ? root
    : withProjectedDerivationalStem(root, context);
}
