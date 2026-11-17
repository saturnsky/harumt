import type { IrregularType } from "../../../generator/conjugator.js";
import { DEFAULT_RENYOU_CHUUSHI_ROLE, auxOpClosesNegativeCopulaBridge, DEFAULT_TE_FORM_ROLE, type AuxLayerNode, type AuxOpKind, type AuxOpNode, type ConnectiveOp, type CopulaOp, type StemNode, type TailNode, type TailRoot, type TeFormConnectiveRole } from "../tail/predicate-root/grammar.js";
import { absorbedPassiveAuxStemMood } from "../tail/predicate-root/inspect.js";
import { tosuruPassiveRefinesToJudgmentQuote } from "../tail/predicate-root/tosuru-construction-mode.js";
import { shortNegationPolicyForTranslation } from "../tail/predicate-root/short-negation-policy.js";
import { stemCandidateIdentitiesEqual, stemCandidateIdentity } from "../tail/predicate-root/stem-candidate-identity.js";
import type { PredicateHeadTailChainRenderPlan } from "./head-tail-render-plan.js";
import type { LemmaRealization } from "../../../types/render-plan.js";
import { isAdjectivalDerivationalSuffix, isIAdjectivePredicateToken, 동사, 명사, 형용사 } from "../../../types/pos.js";
import { createConnectiveOp } from "../tail/predicate-root/op-builders.js";

export interface TailChainLemmaReplacementOptions {
  readonly koreanLemma: string;
  readonly irregular: IrregularType | null;
  readonly koreanPos?: number | null;
  readonly dropFirstPassiveAux?: boolean;
  readonly absorbedPassiveAux?: boolean;
  readonly dropFirstCausativeAux?: boolean;
  readonly dropFirstNegativeAux?: boolean;
}

export function replaceTailRootStemLemma(
  root: TailRoot,
  options: TailChainLemmaReplacementOptions
): TailRoot | undefined {
  const tail = replaceTailNodeStemLemma(root.tail, options);
  return tail === undefined ? undefined : { ...root, tail };
}

export function replaceTailChainConnective(
  plan: PredicateHeadTailChainRenderPlan,
  connective: string,
  teFormRole?: TeFormConnectiveRole
): PredicateHeadTailChainRenderPlan | undefined {
  const role = teFormRole ?? koreanConnectiveToTeFormRole(connective);
  if (role === null) {
    return undefined;
  }
  const existingRole = findTeFormRoleInTailNode(plan.realization.root.tail);
  if (role === "listing" && existingRole !== null && existingRole !== "listing" && existingRole !== "linkage") {
    return undefined;
  }
  return replaceTailChainTeFormRole(plan, role);
}

export function replaceBareTteCarrierWithQuotativeConnective(
  plan: PredicateHeadTailChainRenderPlan
): PredicateHeadTailChainRenderPlan | undefined {
  const root = plan.realization.root;
  const tail = root.tail;
  if (tail.kind !== "auxLayer" || root.sfp !== null || tail.terminal !== null) {
    return undefined;
  }
  const last = tail.ops[tail.ops.length - 1];
  if (
    last === undefined ||
    last.kind !== "predicateQuoteCarrier" ||
    last.style !== "compact_toiu" ||
    last.surface !== "って"
  ) {
    return undefined;
  }
  const connective = createConnectiveOp({
    connective: "quotative",
    surface: last.surface,
    source: last.source
  });
  return {
    ...plan,
    realization: {
      ...plan.realization,
      root: { ...root, tail: { ...tail, ops: [...tail.ops.slice(0, -1), connective] } }
    }
  };
}

export function replaceBareTteQuoteWithTopicExclamativeSfp(
  plan: PredicateHeadTailChainRenderPlan
): PredicateHeadTailChainRenderPlan | undefined {
  const root = plan.realization.root;
  const tail = root.tail;
  if (tail.kind !== "auxLayer" || root.sfp !== null || tail.terminal !== null) {
    return undefined;
  }
  const last = tail.ops[tail.ops.length - 1];
  const isBareTteQuote = last !== undefined && (
    (last.kind === "predicateQuoteCarrier" && last.style === "compact_toiu" && last.surface === "って") ||
    (last.kind === "connective" && last.connective === "quotative" && last.surface === "って")
  );
  if (last === undefined || !isBareTteQuote) {
    return undefined;
  }
  const newRoot: TailRoot = {
    ...root,
    tail: { ...tail, ops: tail.ops.slice(0, -1) },
    sfp: {
      effect: "quotative_topic_excl",
      surface: last.surface,
      consumed: last.source.tokens.length > 0 ? last.source.tokens.length : 1,
      repeatCount: 1,
      source: last.source
    }
  };
  return { ...plan, realization: { ...plan.realization, root: newRoot } };
}

export function replaceTosuruPassiveWithJudgmentQuote(
  plan: PredicateHeadTailChainRenderPlan,
  hasAgentPhrase: () => boolean
): PredicateHeadTailChainRenderPlan | undefined {
  const root = tailRootWithTosuruPassiveJudgmentQuote(plan.realization.root, hasAgentPhrase);
  return root === undefined
    ? undefined
    : { ...plan, realization: { ...plan.realization, root } };
}

export function tailRootWithTosuruPassiveJudgmentQuote(
  root: TailRoot,
  hasAgentPhrase: () => boolean
): TailRoot | undefined {
  const tail = root.tail;
  if (tail.kind !== "auxLayer") {
    return undefined;
  }
  const carrierIdx = tail.ops.findIndex((op) =>
    op.kind === "predicateQuoteCarrier" &&
    op.style === "suru_attributive" &&
    (op.tosuruMode === "resultative_make" || op.tosuruMode === "treat_as")
  );
  if (carrierIdx < 0) {
    return undefined;
  }
  const carrier = tail.ops[carrierIdx];
  if (carrier?.kind !== "predicateQuoteCarrier" || carrier.tosuruMode === undefined) {
    return undefined;
  }
  const passiveVoice = tail.ops.slice(carrierIdx + 1).some((op) =>
    op.kind === "voice" && op.voice === "passive"
  );
  if (!tosuruPassiveRefinesToJudgmentQuote({ mode: carrier.tosuruMode, passiveVoice, hasAgentPhrase })) {
    return undefined;
  }
  const ops = [...tail.ops];
  ops[carrierIdx] = { ...carrier, tosuruMode: "quote" };
  return { ...root, tail: { ...tail, ops } };
}

export function tailChainTeFormConnective(plan: PredicateHeadTailChainRenderPlan): string | null {
  const role = findTeFormRoleInTailNode(plan.realization.root.tail);
  return role === null ? null : teFormRoleToKoreanConnective(role);
}

export interface TailChainCopulaHostPredication {
  readonly copula: CopulaOp;
  readonly past: boolean;
}

export function tailChainCopulaHostPredicationForConnectiveKind(
  plan: PredicateHeadTailChainRenderPlan,
  kind: string
): TailChainCopulaHostPredication | null {
  return findCopulaHostPredicationInTailNode(plan.realization.root.tail, kind);
}

function findCopulaHostPredicationInTailNode(
  node: TailNode,
  kind: string
): TailChainCopulaHostPredication | null {
  if (node.kind === "connective") {
    return findCopulaHostPredicationInTailNode(node.inner, kind) ??
      findCopulaHostPredicationInTailNode(node.outer, kind);
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === kind);
  if (connectiveIdx < 0) {
    return null;
  }
  let past = false;
  for (let i = connectiveIdx - 1; i >= 0; i--) {
    const op = node.ops[i];
    if (op === undefined) {
      return null;
    }
    if (op.kind === "tense") {
      past = true;
      continue;
    }
    if (op.kind === "polite") {
      continue;
    }
    return op.kind === "copula" ? { copula: op, past } : null;
  }
  return null;
}

const STEM_INFLECTION_OP_KINDS: readonly AuxOpKind[] = ["tense", "polite"];

export function tailChainTeConnectiveAttachesToStem(
  plan: PredicateHeadTailChainRenderPlan
): boolean {
  return teConnectiveAttachesToStemInTailNode(plan.realization.root.tail);
}

function opsAreStemInflectionOnly(ops: readonly AuxOpNode[]): boolean {
  return ops.every((op) => STEM_INFLECTION_OP_KINDS.includes(op.kind));
}

function teConnectiveAttachesToStemInTailNode(node: TailNode): boolean {
  if (node.kind === "connective") {
    if (node.connective === "te_form") {
      return opsAreStemInflectionOnly(node.inner.ops);
    }
    return teConnectiveAttachesToStemInTailNode(node.inner) ||
      teConnectiveAttachesToStemInTailNode(node.outer);
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  if (connectiveIdx < 0) {
    return false;
  }
  return opsAreStemInflectionOnly(node.ops.slice(0, connectiveIdx));
}

export function tailChainTeFormClosesNegativeCopulaBridge(
  plan: PredicateHeadTailChainRenderPlan
): boolean {
  return teFormClosesNegativeCopulaBridgeInTailNode(plan.realization.root.tail);
}

function teFormClosesNegativeCopulaBridgeInTailNode(node: TailNode): boolean {
  if (node.kind === "connective") {
    if (node.connective === "te_form") {
      return auxOpClosesNegativeCopulaBridge(node.inner.ops.at(-1));
    }
    return teFormClosesNegativeCopulaBridgeInTailNode(node.inner) ||
      teFormClosesNegativeCopulaBridgeInTailNode(node.outer);
  }
  if (node.terminal === "renyou_chuushi") {
    return auxOpClosesNegativeCopulaBridge(node.ops.at(-1));
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  return connectiveIdx > 0 && auxOpClosesNegativeCopulaBridge(node.ops[connectiveIdx - 1]);
}

export function tailChainPredicationIsStative(plan: PredicateHeadTailChainRenderPlan): boolean {
  return predicationIsStativeInTailNode(plan.realization.root.tail);
}

const STATIVE_TRANSPARENT_OP_KINDS: readonly AuxOpKind[] = ["tense", "polite", "negation", "connective"];

function predicationIsStativeInTailNode(node: TailNode): boolean {
  if (node.kind === "connective") {
    return predicationIsStativeInTailNode(node.inner);
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  const hostOps = connectiveIdx < 0 ? node.ops : node.ops.slice(0, connectiveIdx);
  for (let index = hostOps.length - 1; index >= 0; index -= 1) {
    const op = hostOps[index]!;
    if (STATIVE_TRANSPARENT_OP_KINDS.includes(op.kind)) {
      continue;
    }
    if (op.kind === "copula" || op.kind === "scopeBridge") {
      return true;
    }
    if (op.kind === "predicateSuffix") {
      return op.source.tokens.some((token) => isAdjectivalDerivationalSuffix(token));
    }
    return false;
  }
  const stem = node.stem;
  if (stem.kind === "adj") {
    return true;
  }
  if (stem.kind === "candidateSet") {
    return stem.sourcePredicateShape === "i_adjective" || stem.sourcePredicateShape === "na_adjective";
  }
  return stem.kind !== "verb" && "source" in stem && stem.source.tokens.some((token) => isIAdjectivePredicateToken(token));
}

export function tailChainTeFormIsNegativeNaide(plan: PredicateHeadTailChainRenderPlan): boolean {
  return teFormIsNegativeNaideInTailNode(plan.realization.root.tail);
}

function teFormIsNegativeNaideInTailNode(node: TailNode): boolean {
  if (node.kind === "connective") {
    return teFormIsNegativeNaideInTailNode(node.inner) || teFormIsNegativeNaideInTailNode(node.outer);
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  const connective = connectiveIdx < 0 ? undefined : node.ops[connectiveIdx];
  return connective?.kind === "connective" && connective.surface === "で" && node.ops[connectiveIdx - 1]?.kind === "negation";
}

export function tailChainClosesStateChange(plan: PredicateHeadTailChainRenderPlan): boolean {
  return closesStateChangeInTailNode(plan.realization.root.tail);
}

function closesStateChangeInTailNode(node: TailNode): boolean {
  if (node.kind === "connective") {
    return closesStateChangeInTailNode(node.inner);
  }
  const connectiveIdx = node.ops.findIndex((op) => op.kind === "connective" && op.connective === "te_form");
  const hostOps = connectiveIdx < 0 ? node.ops : node.ops.slice(0, connectiveIdx);
  for (let index = hostOps.length - 1; index >= 0; index -= 1) {
    const op = hostOps[index]!;
    if (STATIVE_TRANSPARENT_OP_KINDS.includes(op.kind)) {
      continue;
    }
    return op.kind === "postverbAuxiliary" && op.auxiliary.kind === "state_change";
  }
  return false;
}

export function tailChainHasConnectiveKind(
  plan: PredicateHeadTailChainRenderPlan,
  kind: string
): boolean {
  return findConnectiveKindInTailNode(plan.realization.root.tail, kind);
}

export function tailChainProjectsCopulaPredicate(plan: PredicateHeadTailChainRenderPlan): boolean {
  return tailNodeHasCopulaOp(plan.realization.root.tail);
}

function tailNodeHasCopulaOp(node: TailNode): boolean {
  if (node.kind === "connective") {
    return tailNodeHasCopulaOp(node.inner) || tailNodeHasCopulaOp(node.outer);
  }
  return node.ops.some((op) => op.kind === "copula");
}

export function replaceTailChainProjectionConnective(
  plan: PredicateHeadTailChainRenderPlan,
  fromKind: string,
  toKind: string
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = replaceConnectiveKindInTailNode(plan.realization.root.tail, fromKind, toKind);
  const boundary = plan.clauseRole.outgoingBoundary;
  const boundaryMatches = boundary.kind !== "terminal" && boundary.connectiveKind === fromKind;
  if (!rewritten.changed && !boundaryMatches) {
    return undefined;
  }
  const root = { ...plan.realization.root, tail: rewritten.node };
  return {
    ...plan,
    realization: { ...plan.realization, root },
    ...(boundaryMatches
      ? {
        clauseRole: {
          ...plan.clauseRole,
          outgoingBoundary: { ...boundary, connectiveKind: toKind as typeof boundary.connectiveKind }
        }
      }
      : {})
  };
}

export function tailChainEndsInOpenConnective(plan: PredicateHeadTailChainRenderPlan): boolean {
  return plan.realization.root.sfp == null && tailNodeEndsInConnective(plan.realization.root.tail);
}

function tailNodeEndsInConnective(node: TailNode): boolean {
  return node.kind === "connective" ? tailNodeEndsInConnective(node.outer) : node.ops.at(-1)?.kind === "connective";
}

function findConnectiveKindInTailNode(node: TailNode, kind: string): boolean {
  if (node.kind === "connective") {
    if (node.connective === kind) {
      return true;
    }
    return findConnectiveKindInTailNode(node.inner, kind) || findConnectiveKindInTailNode(node.outer, kind);
  }
  return node.ops.some((op) => op.kind === "connective" && op.connective === kind);
}

export function tailChainHasConnectiveSurface(
  plan: PredicateHeadTailChainRenderPlan,
  surface: string
): boolean {
  return findConnectiveSurfaceInTailNode(plan.realization.root.tail, surface);
}

export function replaceTailChainConnectiveSurface(
  plan: PredicateHeadTailChainRenderPlan,
  fromSurface: string,
  toSurface: string
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = replaceConnectiveSurfaceInTailNode(plan.realization.root.tail, fromSurface, toSurface);
  const boundary = plan.clauseRole.outgoingBoundary;
  const boundaryMatches = boundary.kind !== "terminal" && boundary.surface === fromSurface;
  if (!rewritten.changed && !boundaryMatches) {
    return undefined;
  }
  const root = { ...plan.realization.root, tail: rewritten.node };
  return {
    ...plan,
    realization: { ...plan.realization, root },
    ...(boundaryMatches
      ? {
        clauseRole: {
          ...plan.clauseRole,
          outgoingBoundary: { ...boundary, surface: toSurface }
        }
      }
      : {})
  };
}

function findConnectiveSurfaceInTailNode(node: TailNode, surface: string): boolean {
  if (node.kind === "connective") {
    if (node.surface === surface) {
      return true;
    }
    return findConnectiveSurfaceInTailNode(node.inner, surface) || findConnectiveSurfaceInTailNode(node.outer, surface);
  }
  return node.ops.some((op) => op.kind === "connective" && op.surface === surface);
}

function replaceConnectiveSurfaceInTailNode(
  node: TailNode,
  fromSurface: string,
  toSurface: string
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = replaceConnectiveSurfaceInTailNode(node.inner, fromSurface, toSurface);
    const outer = replaceConnectiveSurfaceInTailNode(node.outer, fromSurface, toSurface);
    const selfChanged = node.surface === fromSurface;
    const changed = selfChanged || inner.changed || outer.changed;
    if (!changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        ...(selfChanged ? { surface: toSurface } : {}),
        inner: inner.node as AuxLayerNode,
        outer: outer.node
      },
      changed
    };
  }
  let changed = false;
  const ops = node.ops.map((op): AuxOpNode => {
    if (op.kind !== "connective" || op.surface !== fromSurface) {
      return op;
    }
    changed = true;
    return { ...op, surface: toSurface };
  });
  if (!changed) {
    return { node, changed: false };
  }
  return { node: { ...node, ops }, changed };
}

function replaceConnectiveKindInTailNode(
  node: TailNode,
  fromKind: string,
  toKind: string
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = replaceConnectiveKindInTailNode(node.inner, fromKind, toKind);
    const outer = replaceConnectiveKindInTailNode(node.outer, fromKind, toKind);
    const selfChanged = node.connective === fromKind;
    const changed = selfChanged || inner.changed || outer.changed;
    if (!changed) {
      return { node, changed: false };
    }
    return {
      node: {
        ...node,
        ...(selfChanged ? { connective: toKind as typeof node.connective } : {}),
        inner: inner.node as AuxLayerNode,
        outer: outer.node
      },
      changed
    };
  }
  let changed = false;
  const ops = node.ops.map((op): AuxOpNode => {
    if (op.kind !== "connective" || op.connective !== fromKind) {
      return op;
    }
    changed = true;
    return replaceProjectionConnectiveOp(op, fromKind, toKind);
  });
  return changed ? { node: { ...node, ops }, changed } : { node, changed: false };
}

export function replaceProjectionConnectiveOp(
  op: ConnectiveOp,
  fromKind: string,
  toKind: string
): ConnectiveOp {
  return op.connective === fromKind
    ? { ...op, connective: toKind as ConnectiveOp["connective"] }
    : op;
}

function replaceTailNodeStemLemma(
  node: TailNode,
  options: TailChainLemmaReplacementOptions
): TailNode | undefined {
  if (node.kind === "auxLayer") {
    return replaceAuxLayerStemLemma(node, options);
  }
  const inner = replaceAuxLayerStemLemma(node.inner, options);
  return inner === undefined ? undefined : { ...node, inner };
}

function replaceAuxLayerStemLemma(
  layer: AuxLayerNode,
  options: TailChainLemmaReplacementOptions
): AuxLayerNode | undefined {
  const replaced = replaceStemLemma(layer.stem, options);
  if (replaced === undefined) {
    return undefined;
  }
  if (options.dropFirstPassiveAux !== true) {
    return { ...layer, stem: replaced, ops: layer.ops };
  }
  const absorbedMood = absorbedPassiveAuxStemMood(layer.ops);
  const stem = replaced.stemMood === undefined && absorbedMood !== undefined
    ? { ...replaced, stemMood: absorbedMood }
    : replaced;
  return { ...layer, stem, ops: dropFirstPassiveVoiceOp(layer.ops) };
}

function dropFirstPassiveVoiceOp(ops: readonly AuxOpNode[]): readonly AuxOpNode[] {
  let dropped = false;
  const filtered: AuxOpNode[] = [];
  for (const op of ops) {
    if (!dropped && op.kind === "voice" && op.voice === "passive") {
      dropped = true;
      continue;
    }
    filtered.push(op);
  }
  return dropped ? filtered : ops;
}

function replaceStemLemma(
  stem: StemNode,
  options: TailChainLemmaReplacementOptions
): StemNode | undefined {
  if (stem.commitment === "suppletive_negation") {
    return stem;
  }
  const koreanPos = options.koreanPos ?? null;
  if (stem.kind === "verb") {
    if (koreanPos !== null && koreanPos !== 동사) {
      return undefined;
    }
    const shortNegationPolicy = shortNegationPolicyForTranslation(options.koreanLemma, {
      stemKind: "verb",
      ...(stem.shortNegationPolicy === undefined ? {} : { explicitPolicy: stem.shortNegationPolicy }),
      ...(options.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true } : {})
    });
    return {
      ...stem,
      lemma: options.koreanLemma,
      irregular: options.irregular,
      commitment: "resolved_sense",
      ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy }),
      ...(options.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {})
    };
  }
  if (stem.kind === "adj") {
    if (koreanPos !== null && koreanPos !== 형용사) {
      return undefined;
    }
    return {
      ...stem,
      lemma: options.koreanLemma,
      irregular: options.irregular,
      commitment: "resolved_sense"
    };
  }
  if (stem.kind === "noun") {
    if (koreanPos !== null && koreanPos !== 명사) {
      return undefined;
    }
    return {
      ...stem,
      lemma: options.koreanLemma,
      commitment: "resolved_sense"
    };
  }
  if (stem.kind === "candidateSet") {
    const replacementStemKind = candidateSetPredicateReplacementStemKind(stem);
    if (replacementStemKind === null || stem.committedSense === undefined) {
      return undefined;
    }
    const shortNegationPolicy = replacementStemKind === "verb"
      ? shortNegationPolicyForTranslation(options.koreanLemma, {
        stemKind: "verb",
        ...(stem.shortNegationPolicy === undefined ? {} : { explicitPolicy: stem.shortNegationPolicy }),
        ...(options.dropFirstCausativeAux === true ? { dropFirstCausativeAux: true } : {})
      })
      : undefined;
    const selectedIndex = stem.candidates.findIndex((candidate) =>
      stemCandidateIdentitiesEqual(stemCandidateIdentity(candidate), stem.committedSense!)
    );
    const selected = stem.candidates[selectedIndex];
    if (selected === undefined) {
      return undefined;
    }
    return {
      ...stem,
      candidates: stem.candidates.map((candidate, candidateIndex) => candidateIndex === selectedIndex
        ? {
          ...candidate,
          lemma: options.koreanLemma,
          irregular: options.irregular,
          ...(replacementStemKind === "verb" ? { conj: selected.conj ?? "godan" } : {}),
          ...(options.dropFirstPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
          ...(options.absorbedPassiveAux === true ? { dropFirstPassiveAux: true as const } : {}),
          ...(shortNegationPolicy === undefined ? {} : { shortNegationPolicy })
        }
        : candidate),
      commitment: "resolved_sense",
      ...(options.absorbedPassiveAux === true ? { absorbedPassiveAux: true as const } : {})
    };
  }
}

function candidateSetPredicateReplacementStemKind(
  stem: Extract<StemNode, { readonly kind: "candidateSet" }>
): "verb" | "adj" | null {
  const category = stem.committedSenseRealization?.category;
  if (category !== undefined) {
    return category === "verbal_predicate"
      ? "verb"
      : category === "adjectival_predicate" ? "adj" : null;
  }
  switch (stem.sourcePredicateShape) {
    case "verb":
    case "sahen_verbalization":
      return "verb";
    case "i_adjective":
    case "na_adjective":
      return "adj";
    case "nominal":
    case "particle_phrase":
    case "lexical_adverb":
    case undefined:
      return null;
  }
  return null;
}

function koreanConnectiveToTeFormRole(connective: string): TeFormConnectiveRole | null {
  if (connective === "고") return "listing";
  if (connective === "아/어서") return "reason";
  if (connective === "게") return "adverbial";
  if (connective === "__te_result_chain") return "result_chain";
  return null;
}

export function teFormRoleToKoreanConnective(role: TeFormConnectiveRole | undefined): string | null {
  switch (role ?? DEFAULT_TE_FORM_ROLE) {
    case "linkage":
      return "아/어서";
    case "listing":
      return "고";
    case "reason":
      return "아/어서";
    case "adverbial":
      return "게";
    case "manner":
      return null;
    case "result_chain":
      return "__te_result_chain";
    case "compound_serial":
      return "아/어";
  }
}

export function lemmaEffectiveConnective(plan: LemmaRealization): string | null {
  if (plan.connective !== undefined && plan.connective !== null) {
    return plan.connective;
  }
  return plan.renyouChuushiRole === undefined ? null : teFormRoleToKoreanConnective(plan.renyouChuushiRole);
}

export function tailChainTeFormRole(plan: PredicateHeadTailChainRenderPlan): TeFormConnectiveRole | null {
  return findTeFormRoleInTailNode(plan.realization.root.tail);
}

function findTeFormRoleInTailNode(node: TailNode): TeFormConnectiveRole | null {
  if (node.kind === "connective") {
    if (node.connective === "te_form") {
      return DEFAULT_TE_FORM_ROLE;
    }
    return findTeFormRoleInTailNode(node.inner) ?? findTeFormRoleInTailNode(node.outer);
  }
  if (node.terminal === "renyou_chuushi") {
    return node.terminalPayload?.kind === "renyouChuushi"
      ? node.terminalPayload.teFormRole ?? DEFAULT_RENYOU_CHUUSHI_ROLE
      : DEFAULT_RENYOU_CHUUSHI_ROLE;
  }
  for (const op of node.ops) {
    if (op.kind === "connective" && op.connective === "te_form") {
      return op.teFormRole ?? DEFAULT_TE_FORM_ROLE;
    }
  }
  return null;
}

function replaceTailChainTeFormRole(
  plan: PredicateHeadTailChainRenderPlan,
  role: TeFormConnectiveRole
): PredicateHeadTailChainRenderPlan | undefined {
  const rewritten = replaceTeFormRoleInTailNode(plan.realization.root.tail, role);
  if (!rewritten.changed) {
    return undefined;
  }
  const root = { ...plan.realization.root, tail: rewritten.node };
  return { ...plan, realization: { ...plan.realization, root } };
}

export function replaceTeFormRoleInTailNode(
  node: TailNode,
  role: TeFormConnectiveRole
): { readonly node: TailNode; readonly changed: boolean } {
  if (node.kind === "connective") {
    const inner = replaceTeFormRoleInTailNode(node.inner, role);
    const outer = replaceTeFormRoleInTailNode(node.outer, role);
    const changed = inner.changed || outer.changed;
    return changed
      ? { node: { ...node, inner: inner.node as AuxLayerNode, outer: outer.node }, changed }
      : { node, changed: false };
  }
  let changed = false;
  let terminalPayload = node.terminalPayload;
  if (node.terminal === "renyou_chuushi") {
    const source = node.terminalPayload?.kind === "renyouChuushi"
      ? node.terminalPayload.source
      : lastTailNodeSource(node);
    if (source !== null) {
      terminalPayload = {
        kind: "renyouChuushi",
        source,
        teFormRole: role
      };
      changed = true;
    }
  }
  const ops = node.ops.map((op): AuxOpNode => {
    if (op.kind !== "connective" || op.connective !== "te_form") {
      return op;
    }
    changed = true;
    return { ...op, teFormRole: role };
  });
  return changed ? { node: { ...node, ops, ...(terminalPayload === undefined ? {} : { terminalPayload }) }, changed } : { node, changed: false };
}

function lastTailNodeSource(node: AuxLayerNode): AuxOpNode["source"] | null {
  for (let i = node.ops.length - 1; i >= 0; i -= 1) {
    const op = node.ops[i];
    if (op !== undefined) return op.source;
  }
  return node.stem.source;
}
