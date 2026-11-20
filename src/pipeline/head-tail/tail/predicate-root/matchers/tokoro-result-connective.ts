import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { isClauseSpaceOrAdverbToken, nextNonSpaceIndex, nextTransparentEvidenceIndex } from "../../../../clause-layout/trivia.js";
import { isClauseEvidenceTransparentPunctuation } from "../../../../clause-layout/index.js";
import type { ProtoClauseLayout } from "../../../../clause-layout/proto-layout.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import { firstMainClausePredicateEvidenceAfter } from "../../../../clause-layout/phrase-enumeration.js";
import { isCaseParticleNoToken, isGaNoConvertedSubjectParticle } from "../../../../semantics/gano-conversion.js";
import { pos0in, PREDICATE_BITS, isConjunctiveParticleToken, isSahenCapableNominal } from "../../../../../types/pos.js";
import { isTokoroResultHeadToken, tokoroPastContentIdx } from "../../families/tokoro-semantics.js";
import { hasSupportedClauseContinuation } from "../integration/readiness.js";
import type { AuxOpNode, RetrospectiveDiscoveryStyle } from "../grammar.js";

export interface TokoroResultConnectiveMatch {
  readonly connective: "conditional";
  readonly surface: string;
  readonly consumed: number;
  readonly retrospectiveDiscoveryStyle: Extract<RetrospectiveDiscoveryStyle, "deoni">;
}

export function matchTokoroResultConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  options: {
    readonly lookups: LookupTables;
    readonly previousOps?: readonly AuxOpNode[];
  }
): TokoroResultConnectiveMatch | null {
  if (!isTokoroResultHeadToken(tokens, pos, options.lookups)) {
    return null;
  }
  if (options.previousOps !== undefined && !tailOpsEndInPastTense(options.previousOps)) {
    return null;
  }
  const punctuationIdx = nextNonSpaceIndex(tokens, pos + 1);
  const punctuation = punctuationIdx === null ? undefined : tokens[punctuationIdx];
  if (punctuation === undefined || !isClauseEvidenceTransparentPunctuation(punctuation)) {
    return null;
  }
  const layout = activeProtoLayout();
  if (layout === null) {
    return null;
  }
  if (hostClauseHasGaNoConvertedSubject(tokens, pos, layout, options.lookups)) {
    return null;
  }
  const span = layout.enclosingBalancedSpan(pos);
  const reachEnd = Math.min(
    layout.utteranceRangeOfToken(pos).endExclusive,
    span?.contentEndExclusive ?? Number.POSITIVE_INFINITY
  );
  const consequent = firstMainClausePredicateEvidenceAfter(layout, tokens, punctuationIdx!, { scope: "sentence" });
  if (
    consequent === null ||
    consequent.span.start >= reachEnd ||
    !hasSupportedClauseContinuation(tokens, punctuationIdx! + 1, reachEnd, options.lookups)
  ) {
    return null;
  }
  return {
    connective: "conditional",
    surface: tokens[pos]!.surface,
    consumed: 1,
    retrospectiveDiscoveryStyle: "deoni"
  };
}

export function tailOpsEndInPastTense(ops: readonly AuxOpNode[]): boolean {
  const last = ops.at(-1);
  return (last?.kind === "tense" && last.tense === "past") ||
    (last?.kind === "negation" && last.chainPast === true);
}

function hostClauseHasGaNoConvertedSubject(
  tokens: readonly RuntimeHaruToken[],
  tokoroIdx: number,
  layout: ProtoClauseLayout,
  lookups: LookupTables
): boolean {
  const hostIdx = tokoroPastContentIdx(tokens, tokoroIdx);
  if (hostIdx === null) {
    return false;
  }
  const clause = layout.clauseOfToken(hostIdx);
  if (clause === undefined) {
    return false;
  }
  return clause.particleIndices.some((particleIdx) => {
    if (particleIdx >= hostIdx || !isCaseParticleNoToken(tokens[particleIdx])) {
      return false;
    }
    const predicateIdx = nextTransparentEvidenceIndex(tokens, particleIdx + 1, {
      endExclusive: hostIdx + 1,
      isTransparentToken: isClauseSpaceOrAdverbToken
    })?.index ?? null;
    const predicate = predicateIdx === null ? undefined : tokens[predicateIdx];
    if (predicate === undefined || !(pos0in(predicate.pos, PREDICATE_BITS) || isSahenCapableNominal(predicate))) {
      return false;
    }
    if (clause.particleIndices.some((other) =>
      other > predicateIdx! && other < hostIdx && tokens[other] !== undefined && !isConjunctiveParticleToken(tokens[other]!)
    )) {
      return false;
    }
    return isGaNoConvertedSubjectParticle(tokens, particleIdx, predicateIdx!, { clause, lookups });
  });
}
