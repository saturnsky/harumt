import type { RuntimeHaruToken } from "../../../../types/token.js";
import {
  derivationalHostStemRootOf,
  derivationalHostStemShapeForCandidate,
  derivationalSuffixProfileById,
  type DerivationalSuffixProfile
} from "./derivational-suffix-table.js";
import { 명사 } from "../../../../types/pos.js";
import type {
  AuxLayerNode,
  AuxOpNode,
  OpSource,
  ParsedTailRoot,
  PredicateSuffixOp,
  QuoteBinding,
  StemNode,
  TailNode,
  TailRoot
} from "./grammar.js";
import { tailRootHasAdmissibleCommitmentCandidate } from "./commitment-bridge.js";
import { probeProductionDispatch } from "./production-registry.js";

export function reanchoringDerivationalProfile(op: AuxOpNode): DerivationalSuffixProfile | null {
  if (op.kind !== "predicateSuffix") {
    return null;
  }
  const profile = derivationalSuffixProfileById(op.profileId);
  if (profile === undefined || profile.hostForm === "noun_compound") {
    return null;
  }
  return profile.sourcePos === "接尾辞-形状詞的" || profile.sourcePos === "接尾辞-名詞的"
    ? profile
    : null;
}

export function rootHasReanchoringDerivationalSuffix(root: ParsedTailRoot): boolean {
  return firstAuxLayerOf(root.tail).ops.some((op) => reanchoringDerivationalProfile(op) !== null);
}

function firstAuxLayerOf(node: TailNode): AuxLayerNode {
  return node.kind === "auxLayer" ? node : node.inner;
}

function auxLayersOf(node: TailNode): readonly AuxLayerNode[] {
  return node.kind === "auxLayer" ? [node] : [node.inner, ...auxLayersOf(node.outer)];
}

function withFirstAuxLayer(node: TailNode, replacement: AuxLayerNode): TailNode {
  return node.kind === "auxLayer" ? replacement : { ...node, inner: replacement };
}

export const DERIVATIONAL_SUFFIX_FAIL_CLOSED_PREFIX = "derivational suffix: ";

export type DerivationalSuffixLowering =
  | { readonly kind: "none" }
  | { readonly kind: "lowered"; readonly root: ParsedTailRoot }
  | { readonly kind: "rejected"; readonly reason: string };

export function lowerDerivationalSuffixRoot(
  root: ParsedTailRoot,
  options: { readonly quoteBinding: QuoteBinding }
): DerivationalSuffixLowering {
  const layer = firstAuxLayerOf(root.tail);
  if (auxLayersOf(root.tail).slice(1).some((outer) =>
    outer.ops.some((op) => reanchoringDerivationalProfile(op) !== null)
  )) {
    return { kind: "rejected", reason: "derivational suffix outside the candidate-bearing aux layer" };
  }
  if (rootHasLexicalStemRootDerivation(root) && !lexicalStemRootHostAdmitted(root)) {
    return { kind: "rejected", reason: "derivational host stem has no lexical root base" };
  }
  const suffixIdx = layer.ops.findIndex((op) => reanchoringDerivationalProfile(op) !== null);
  if (suffixIdx < 0) {
    return { kind: "none" };
  }
  const suffixOp = layer.ops[suffixIdx] as PredicateSuffixOp;
  const profile = reanchoringDerivationalProfile(suffixOp);
  if (profile === null) {
    return { kind: "none" };
  }
  if (layer.ops.slice(suffixIdx + 1).some((op) => reanchoringDerivationalProfile(op) !== null)) {
    return { kind: "rejected", reason: "stacked derivational suffixes are outside the profile domain" };
  }
  const hostOps = layer.ops.slice(0, suffixIdx);
  if (hostOps.some((op) => op.kind === "connective")) {
    return { kind: "rejected", reason: "derivational host chain crosses a clause connective" };
  }
  const host: TailRoot = {
    tail: { kind: "auxLayer", stem: layer.stem, ops: hostOps, terminal: null },
    sfp: null,
    quoteBinding: options.quoteBinding
  };
  const resultStemKind = layer.terminal === "adverbial_modifier" && profile.adverbialTemplate !== undefined
    ? "adverb"
    : profile.resultStemKind;
  const stem = derivedStem(layer.stem, hostOps, suffixOp, profile, resultStemKind);
  if (stem === null) {
    return { kind: "rejected", reason: `derivational suffix result stem kind '${resultStemKind}' is not materializable` };
  }
  const outerOps = layer.ops.slice(suffixIdx + 1);
  if (stem.kind === "noun" && outerOps.length > 0 && outerOps[0]?.kind !== "copula") {
    return { kind: "rejected", reason: "nominal derivational result requires a copula as its first op" };
  }
  if (options.quoteBinding === "quoted_content" && root.sfp !== null) {
    return { kind: "rejected", reason: "derivational result does not support quoted terminal mood projection" };
  }
  if (outerOps.slice(1).some((op) => op.kind === "copula")) {
    return { kind: "rejected", reason: "derivational result does not support a stacked copula projection" };
  }
  const lowered: ParsedTailRoot = {
    ...root,
    tail: withFirstAuxLayer(root.tail, {
      ...layer,
      stem: { ...stem, derivationalBase: { profileId: profile.id, host, suffix: suffixOp } },
      ops: outerOps
    })
  };
  const probeRoot: TailRoot = { ...lowered, quoteBinding: options.quoteBinding };
  if (!tailRootHasAdmissibleCommitmentCandidate(probeRoot)) {
    return { kind: "rejected", reason: "derivational host has no admissible commitment candidate" };
  }
  const dispatch = probeProductionDispatch(
    probeRoot,
    { intake: { site: "committed_render", partial: false } }
  );
  if (dispatch.kind !== "registry") {
    return { kind: "rejected", reason: `derivational suffix chain is not claimed by a production family (${dispatch.kind})` };
  }
  return { kind: "lowered", root: lowered };
}

function rootHasLexicalStemRootDerivation(root: ParsedTailRoot): boolean {
  return auxLayersOf(root.tail).some((layer) =>
    layer.ops.some((op) =>
      op.kind === "predicateSuffix" &&
      derivationalSuffixProfileById(op.profileId)?.hostForm === "stem_root"
    )
  );
}

function lexicalStemRootHostAdmitted(root: ParsedTailRoot): boolean {
  return auxLayersOf(root.tail).every((layer) => stemAdmitsLexicalRootBase(layer.stem));
}

function stemAdmitsLexicalRootBase(stem: StemNode): boolean {
  if (stem.kind === "candidateSet") {
    return stem.candidates
      .filter((candidate) => candidate.koreanPos !== 명사)
      .every((candidate) =>
        derivationalHostStemRootOf(derivationalHostStemShapeForCandidate(stem, candidate)) !== null
      );
  }
  return (stem.kind === "adj" || stem.kind === "verb") && derivationalHostStemRootOf(stem) !== null;
}

function derivedStem(
  hostStem: StemNode,
  hostOps: readonly AuxOpNode[],
  suffixOp: PredicateSuffixOp,
  profile: DerivationalSuffixProfile,
  resultStemKind: DerivationalSuffixProfile["resultStemKind"]
): StemNode | null {
  const source = derivedStemSource(hostStem, hostOps, suffixOp);
  const lemma = source.tokens.map((token) => token.surface).join("");
  const anchors = {
    conjugationAnchor: source.tokens.length - 1,
    semanticAnchors: source.tokens.map((_token, index) => index),
    sourcePredicateShape: profile.sourcePos === "接尾辞-名詞的" ? "nominal" : "na_adjective"
  } as const;
  switch (resultStemKind) {
    case "adj":
      return { kind: "adj", lemma, irregular: profile.irregular ?? null, source, ...anchors };
    case "noun":
      return { kind: "noun", lemma, sahen: false, source, ...anchors };
    case "adverb":
      return { kind: "adverb", lemma, source, ...anchors };
    case "verb":
      return null;
  }
}

function derivedStemSource(
  hostStem: StemNode,
  hostOps: readonly AuxOpNode[],
  suffixOp: PredicateSuffixOp
): OpSource {
  const tokens: RuntimeHaruToken[] = [];
  const tokenIndices: number[] = [];
  for (const part of [hostStem.source, ...hostOps.map((op) => op.source), suffixOp.source]) {
    tokens.push(...part.tokens);
    tokenIndices.push(...part.tokenIndices);
  }
  return { tokens, tokenIndices };
}
