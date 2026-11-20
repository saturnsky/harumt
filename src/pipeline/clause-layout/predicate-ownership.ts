import { cachedQuoteStructuralRelationIndex, quoteStructuralRelationIndex } from "../structural-relation/quote.js";
import type { QuoteStructuralRelation } from "../structural-relation/quote-payload.js";
import { TokenCursor } from "../token-cursor.js";
import { isCopulaDaDeRenyouToken } from "../matchers.js";
import { useActiveProtoLayout } from "./proto-state.js";
import { caseParticleMarkerRelationForToken, nominalLinkMarkerRelationForToken, quoteHostPrefixArgumentRelationAt, quoteHostSearchBridgeArgumentRelationAt, topicFocusMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { tailRootExplicitAdnominalMarkerIndices } from "../head-tail/tail/predicate-root/inspect.js";
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { isStreamVvCompoundPairAt } from "../compounds/compound-verbs.js";
import type { LookupTables } from "../lookup-tables.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "./trivia.js";
import { POS0, POS1, 助詞, 副助詞 } from "../../types/pos.js";
import type { TailRoot } from "../head-tail/tail/predicate-root/grammar.js";
import type { ClauseToken, PredicateArgumentRole, PredicateArgumentRoleAssignment } from "./layout-types.js";
import { SUBJECT_TOPIC_SURFACE, clauseTokensAsRuntime, isNounishToken } from "./token-evidence.js";
import type { Clause } from "./final-layout.js";
import type { ProtoClause, ProtoClauseLayout } from "./proto-layout.js";
import { type PredicateLike, adverbialKeijoujiModifiedPredicate } from "./predicate-shape.js";
import { adjectiveAdverbialModifiedPredicate, adjectiveAdverbialModifierLookupOptions } from "./adverbial-predicate.js";

export function initialConnectiveRoles(tokens: readonly ClauseToken[], clauses: readonly Clause[]): Map<number, string> {
  return new Map(clauses.flatMap((clause) => clause.predicates.flatMap((predicate) => {
    const token = tokens[nextNonSpaceIndex(tokens, predicate + 1) ?? -1];
    return token !== undefined && isCopulaDaDeRenyouToken(token) ? [[predicate, "adverbial"] as const] : [];
  })));
}

export function predicateArgumentRolesForClause(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  clause: ProtoClause,
  predicates: readonly number[],
  particlesByPredicate: readonly (readonly [number, readonly number[]])[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  quoteArgumentCandidacy: QuoteArgumentCandidacyVerdict,
): readonly (readonly [number, readonly PredicateArgumentRoleAssignment[]])[] {
  const roles = new Map(predicates.map((predicate) => [predicate, [] as PredicateArgumentRoleAssignment[]]));
  for (const [predicate, particleIndices] of particlesByPredicate) {
    for (const particleIdx of particleIndices) {
      const relation = quoteHostSearchBridgeArgumentRelationAt(tokens, particleIdx, {
        consumers: ["clause_layout"],
      });
      if (relation !== null) {
        roles.get(predicate)?.push({ particleIdx, role: relation.argumentKind });
      }
    }
  }
  const topics: Array<{ particleIdx: number; predicate: number; hasOwnedObliqueCase: boolean; hasPrefixedFocus: boolean }> = [];
  for (let particleIdx = clause.start; particleIdx < clause.end; particleIdx += 1) {
    if (particleIdx === clause.start && isTeConnectiveToken(tokens[particleIdx - 1])) {
      continue;
    }
    if (topicFocusMarkerRelationForToken(tokens[particleIdx], particleIdx, { consumers: ["clause_layout"] }) === null) {
      continue;
    }
    const candidates = predicates.filter((candidate) =>
      candidate > particleIdx &&
      quoteArgumentCandidacy.allows(particleIdx, candidate)
    );
    const hasOwnedObliqueCase = topicHasOwnedCaseParticle(tokens, particleIdx, clause.particleIndices);
    const hasPrefixedFocus = ((tokens[previousNonSpaceIndex(tokens, particleIdx) ?? -1]?.pos ?? 0) & (POS0 | POS1)) === (助詞 | 副助詞);
    const predicate = !hasOwnedObliqueCase && !hasPrefixedFocus
      ? candidates.find((candidate) => contentEntries.find(([idx]) => idx === candidate)?.[1].renderPlan?.kind !== "attributive") ?? candidates[0]
      : candidates[0];
    if (predicate === undefined || proto.isQuoteTrapped(particleIdx, predicate)) {
      continue;
    }
    topics.push({
      particleIdx,
      predicate,
      hasOwnedObliqueCase,
      hasPrefixedFocus,
    });
  }
  for (const { particleIdx, predicate, hasOwnedObliqueCase, hasPrefixedFocus } of topics) {
    const assignments = roles.get(predicate);
    if (assignments === undefined || assignments.some((assignment) => assignment.particleIdx === particleIdx)) {
      continue;
    }
    const predicateParticles = particlesByPredicate.find(([candidate]) => candidate === predicate)?.[1] ?? [];
    const hasExplicitGaSubject = predicateParticles.some((idx) => tokens[idx]?.surface === "が");
    const pureTopics = topics.filter((topic) => topic.predicate === predicate && !topic.hasOwnedObliqueCase && !topic.hasPrefixedFocus);
    const role: PredicateArgumentRole =
      hasOwnedObliqueCase
        ? "oblique_topic"
        : hasPrefixedFocus
          ? "prefixed_focus"
        : clause.kind === "relative" && hasExplicitGaSubject
          ? "theme_topic"
          : hasExplicitGaSubject
            ? "other"
            : pureTopics.length > 1
              ? "other"
              : "subject_topic";
    assignments.push({ particleIdx, role });
  }
  for (const { particleIdx, predicate: embeddedPredicate } of topics) {
    for (const matrixPredicate of predicates) {
      if (
        matrixPredicate <= embeddedPredicate ||
        !quoteArgumentCandidacy.allows(particleIdx, matrixPredicate) ||
        !predicateOwnsQuotedNominalSubject(tokens, matrixPredicate, particlesByPredicate)
      ) continue;
      const assignments = roles.get(matrixPredicate);
      if (assignments !== undefined && !assignments.some((assignment) => assignment.particleIdx === particleIdx)) {
        assignments.push({ particleIdx, role: "other" });
      }
    }
  }
  return [...roles.entries()].map(([predicate, assignments]) => [
    predicate,
    assignments.sort((left, right) => left.particleIdx - right.particleIdx),
  ] as const);
}

function topicHasOwnedCaseParticle(
  tokens: readonly ClauseToken[],
  topicParticleIdx: number,
  predicateParticles: readonly number[],
): boolean {
  const ownedParticles = new Set(predicateParticles);
  let index = previousNonSpaceIndex(tokens, topicParticleIdx);
  while (index !== null) {
    const token = tokens[index];
    if (token === undefined) return false;
    if (ownedParticles.has(index)) {
      return caseParticleMarkerRelationForToken(token, index, {
        consumers: ["clause_layout"],
      }) !== null;
    }
    if ((token.pos & POS0) !== 助詞 || (token.pos & POS1) !== 副助詞) {
      return false;
    }
    index = previousNonSpaceIndex(tokens, index);
  }
  return false;
}

function predicateOwnsQuotedNominalSubject(
  tokens: readonly ClauseToken[],
  predicate: number,
  particlesByPredicate: readonly (readonly [number, readonly number[]])[],
): boolean {
  const particleIndices = particlesByPredicate.find(([candidate]) => candidate === predicate)?.[1] ?? [];
  return particleIndices.some((particleIdx) => {
    if (!SUBJECT_TOPIC_SURFACE.has(tokens[particleIdx]?.surface ?? "")) return false;
    const headIdx = previousNonSpaceIndex(tokens, particleIdx);
    if (headIdx === null || tokens[headIdx] === undefined || !isNounishToken(tokens[headIdx]!)) return false;
    const nominalLinkIdx = previousNonSpaceIndex(tokens, headIdx);
    if (
      nominalLinkIdx === null ||
      nominalLinkMarkerRelationForToken(tokens[nominalLinkIdx], nominalLinkIdx, { consumers: ["clause_layout"] }) === null
    ) return false;
    const quoteMarkerIdx = previousNonSpaceIndex(tokens, nominalLinkIdx);
    return quoteMarkerIdx !== null &&
      quoteMarkerRelationAt(tokens, quoteMarkerIdx, { consumers: ["clause_layout"] }) !== null;
  });
}

export function predicateLikeHasPredicateQuoteCarrier(span: PredicateLike, embeddedSpeechActOnly = false): boolean {
  const plan = span.renderPlan;
  if (plan?.kind !== "headTailChain" || plan.realization?.kind !== "predicate") return false;
  const root = plan.realization.root;
  if (typeof root !== "object" || root === null) return false;
  return tailShapeHasPredicateQuoteCarrier((root as { readonly tail?: unknown }).tail, embeddedSpeechActOnly);
}

function tailShapeHasPredicateQuoteCarrier(value: unknown, embeddedSpeechActOnly = false): boolean {
  if (typeof value !== "object" || value === null) return false;
  const node = value as {
    readonly kind?: unknown;
    readonly ops?: readonly unknown[];
    readonly inner?: unknown;
    readonly outer?: unknown;
  };
  if (node.kind === "connective") {
    return tailShapeHasPredicateQuoteCarrier(node.inner, embeddedSpeechActOnly) ||
      tailShapeHasPredicateQuoteCarrier(node.outer, embeddedSpeechActOnly);
  }
  return Array.isArray(node.ops) && node.ops.some((op) =>
    typeof op === "object" && op !== null &&
    (op as { readonly kind?: unknown }).kind === "predicateQuoteCarrier" &&
    (!embeddedSpeechActOnly || (op as { readonly style?: unknown }).style !== "suru_attributive")
  );
}

export function compoundPredicatePairsForClauses(
  tokens: readonly ClauseToken[],
  clauses: readonly Clause[]
): ReadonlyMap<number, number> {
  const pairs = new Map<number, number>();
  for (const clause of clauses) {
    for (let i = 0; i + 1 < clause.predicates.length; i += 1) {
      const head = clause.predicates[i];
      const tail = clause.predicates[i + 1];
      if (head === undefined || tail === undefined || tail !== head + 1) {
        continue;
      }
      if (!isStreamVvCompoundPairAt(tokens, head)) {
        continue;
      }
      pairs.set(tail, head);
    }
  }
  return pairs;
}

export function quoteStructuralRelationsForLayout(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  lookups: LookupTables,
  requireCached: boolean
): readonly QuoteStructuralRelation[] {
  if (tokens.length === 0) {
    return [];
  }
  const runtimeTokens = clauseTokensAsRuntime(tokens);
  const cursor = new TokenCursor(runtimeTokens, 0, tokens.length);
  return useActiveProtoLayout(proto, () => {
    const cached = cachedQuoteStructuralRelationIndex(runtimeTokens);
    if (cached !== undefined) {
      return Array.from(cached.winners());
    }
    if (requireCached) {
      throw new Error("ClauseLayout requires the canonical cached quote relation index");
    }
    return Array.from(quoteStructuralRelationIndex(cursor, lookups).winners());
  });
}

export class QuoteArgumentCandidacyVerdict {
  constructor(
    private readonly relations: readonly QuoteStructuralRelation[],
    private readonly hostPrefixOwner: ReadonlyMap<number, number>
  ) {}

  allows(particleIdx: number, predicateIdx: number): boolean {
    if (this.hostPrefixOwner.get(particleIdx) === predicateIdx) {
      return true;
    }
    return this.relations.every((relation) => {
      const { contentSpan } = relation.quote;
      const particleInContent =
        contentSpan.start <= particleIdx &&
        particleIdx < contentSpan.endExclusive;
      if (!particleInContent) {
        return true;
      }
      return contentSpan.start <= predicateIdx && predicateIdx < contentSpan.endExclusive;
    });
  }
}

export function quoteHostPrefixParticlesByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  relations: readonly QuoteStructuralRelation[]
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  for (const relation of relations) {
    if (relation.quote.slotKind !== "question_content" || relation.quote.hostMatch.kind !== "question") {
      continue;
    }
    const hostIdx = relation.quote.hostMatch.hostIdx;
    const protoClause = proto.clauseContaining(hostIdx);
    if (protoClause === undefined) {
      continue;
    }
    for (const particleIdx of protoClause.particleIndices) {
      if (particleIdx >= relation.quote.markerIdx) {
        continue;
      }
      const bridgeArgument = quoteHostPrefixArgumentRelationAt(tokens, particleIdx, {
        markerIdx: relation.quote.markerIdx,
        hostIdx,
        consumers: ["clause_layout", "quote_content"]
      });
      if (bridgeArgument === null) {
        continue;
      }
      const particles = byPredicate.get(hostIdx) ?? [];
      particles.push(particleIdx);
      byPredicate.set(hostIdx, particles);
    }
  }
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, particles]) => [predicate, uniqueInOrder(particles)] as const);
}

export function benefactiveRecipientTopicParticlesByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  contentEntriesByClause: readonly (readonly (readonly [number, PredicateLike])[])[]
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  for (const [clauseIndex, protoClause] of proto.protoClauses.entries()) {
    const contentEntries = contentEntriesByClause[clauseIndex] ?? [];
    for (const [predicateIdx, span] of contentEntries) {
      const benefactive = span.benefactive ?? null;
      if (benefactive === null) {
        continue;
      }
      const particleIdx = benefactive.recipientParticleIdx ?? benefactive.recipient_particle_idx ?? null;
      if (particleIdx === null || particleIdx < protoClause.start || particleIdx >= protoClause.end) {
        continue;
      }
      const particle = tokens[particleIdx];
      if (particle?.surface !== "は" && particle?.surface !== "も") {
        continue;
      }
      const particles = byPredicate.get(predicateIdx) ?? [];
      particles.push(particleIdx);
      byPredicate.set(predicateIdx, particles);
    }
  }
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, particles]) => [predicate, uniqueInOrder(particles)] as const);
}

function uniqueInOrder(values: readonly number[]): readonly number[] {
  return Array.from(new Set(values));
}

export function consumedLexicalParticleIndices(
  tokens: readonly ClauseToken[],
  contentEntries: readonly (readonly [number, PredicateLike])[],
  explicitConsumed: ReadonlySet<number> | readonly number[] | undefined
): Set<number> {
  const consumed = new Set(explicitConsumed ?? []);
  for (const [start, span] of contentEntries) {
    const plan = span.renderPlan;
    if (plan?.kind === "headTailChain" && plan.realization?.kind === "predicate") {
      const root = plan.realization.root;
      if (typeof root === "object" && root !== null) {
        for (const markerIdx of tailRootExplicitAdnominalMarkerIndices(root as TailRoot)) {
          consumed.add(markerIdx);
        }
      }
    }
    if (span.renderPlan?.kind !== "lexicalParticleAdverbial" && span.particleRole !== "adverbializer") {
      continue;
    }
    const end = start + Math.max(1, span.consumed ?? 1);
    for (let index = start + 1; index < end; index += 1) {
      const token = tokens[index];
      if (token !== undefined && (token.pos & POS0) === 助詞) {
        consumed.add(index);
      }
    }
  }
  return consumed;
}

export function isAdverbialKeijoujiPredicateLike(
  tokens: readonly ClauseToken[],
  idx: number,
  proto: ProtoClauseLayout,
  clauseIndex: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): boolean {
  return adverbialKeijoujiModifiedPredicate(tokens, idx, proto, clauseIndex, contentEntries, lookups, false) !== null;
}

export function adverbialAdjunctsByPredicate(
  tokens: readonly ClauseToken[],
  proto: ProtoClauseLayout,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): readonly (readonly [number, readonly number[]])[] {
  const byPredicate = new Map<number, number[]>();
  proto.protoClauses.forEach((protoClause, clauseIndex) => {
    for (let idx = protoClause.start; idx < protoClause.end; idx += 1) {
      const predicateIdx =
        adverbialKeijoujiModifiedPredicate(tokens, idx, proto, clauseIndex, contentEntries, lookups, true) ??
        adjectiveAdverbialAdjunctPredicateEntry(tokens, idx, contentEntries, lookups);
      if (predicateIdx === null) {
        continue;
      }
      const adjuncts = byPredicate.get(predicateIdx) ?? [];
      adjuncts.push(idx);
      byPredicate.set(predicateIdx, adjuncts);
    }
  });
  return Array.from(byPredicate.entries())
    .sort(([left], [right]) => left - right)
    .map(([predicate, adjuncts]) => [predicate, uniqueInOrder(adjuncts)] as const);
}

function adjectiveAdverbialAdjunctPredicateEntry(
  tokens: readonly ClauseToken[],
  idx: number,
  contentEntries: readonly (readonly [number, PredicateLike])[],
  lookups: LookupTables
): number | null {
  const predicateTokenIdx = adjectiveAdverbialModifiedPredicate(
    tokens,
    idx,
    adjectiveAdverbialModifierLookupOptions(lookups)
  );
  if (predicateTokenIdx === null) {
    return null;
  }
  const covering = contentEntries.find(([start, span]) =>
    start > idx && start <= predicateTokenIdx && predicateTokenIdx < start + Math.max(1, span.consumed ?? 1)
  );
  return covering?.[0] ?? null;
}
