
import type { LookupTables } from "../../../../lookup-tables.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  collectCopulaConcessiveConditionEvidence,
  type CopulaConcessiveConditionEvidence
} from "../../../../clause-layout/copula-concessive.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import type { ProtoClauseLayout } from "../../../../clause-layout/index.js";
import { copulaDeMarkerRelationForToken } from "../../../boundary/marker.js";
import { isSupportedClauseStart } from "../integration/readiness.js";
import { isAffirmativeCopulaSupportVerbToken } from "./tokens.js";
import { PredicateArgumentView } from "../../../candidate/semantic-classifiers.js";
import {
  isImperativeInflection,
  isRenyouInflection,
  isTerminalOrAttributiveInflection,
  isTerminalParticleToken
} from "../../../../../types/pos.js";

export type { CopulaConcessiveConditionEvidence };

const evidenceCache = new WeakMap<
  readonly RuntimeHaruToken[],
  ReadonlyMap<number, CopulaConcessiveConditionEvidence>
>();

function isCopulaImperativeSupportShapeAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number
): boolean {
  const de = tokens[copulaIdx];
  if (
    de === undefined ||
    !isRenyouInflection(de.pos) ||
    copulaDeMarkerRelationForToken(de, copulaIdx, { consumers: ["tail_multi_clause"] })?.isAssertiveCopulaFamily !== true
  ) {
    return false;
  }
  const support = tokens[copulaIdx + 1];
  return isAffirmativeCopulaSupportVerbToken(support) && isImperativeInflection(support.pos);
}

function evidenceFor(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): ReadonlyMap<number, CopulaConcessiveConditionEvidence> {
  const cached = evidenceCache.get(tokens);
  if (cached !== undefined) {
    return cached;
  }
  const collected = copulaConcessiveConditionEvidenceWithLayout(tokens, lookups, activeProtoLayout());
  evidenceCache.set(tokens, collected);
  return collected;
}

export function copulaConcessiveConditionEvidenceWithLayout(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables,
  proto: ProtoClauseLayout | null
): ReadonlyMap<number, CopulaConcessiveConditionEvidence> {
  return collectCopulaConcessiveConditionEvidence(tokens, {
    lookups,
    isImperativeSupportShape: isCopulaImperativeSupportShapeAt,
    isPredicateStart: (frameTokens, frameIdx) => isSupportedClauseStart(frameTokens, frameIdx, lookups),
    isImperativeInflection: (token) => isImperativeInflection(token.pos),
    isProhibitionHostInflection: (token) => isTerminalOrAttributiveInflection(token.pos),
    isSentenceFinalParticle: (token) => isTerminalParticleToken(token),
    hasOwnNominativeSubjectAt: (predicateIdx) => proto !== null &&
      new PredicateArgumentView(tokens, predicateIdx, { lookups, protoLayout: proto })
        .subjectArguments()
        .some((argument) => {
          const referent = argument.noun ?? argument.referent;
          return referent !== null &&
            !lookups.SECOND_PERSON_PRONOUNS.has(referent.dictionaryForm || referent.surface);
        }),
    clauses: proto === null
      ? undefined
      : {
        clauseOfToken: (idx) => proto.clauseContaining(idx),
        utteranceRangeOfToken: (idx) => proto.utteranceRangeOfToken(idx),
        enclosingQuoteSpan: (idx) => proto.enclosingQuoteSpan(idx)
      }
  });
}

export function copulaConcessiveImperativeEvidenceAt(
  tokens: readonly RuntimeHaruToken[],
  copulaIdx: number,
  lookups: LookupTables | undefined
): CopulaConcessiveConditionEvidence | null {
  if (lookups === undefined) {
    return null;
  }
  return evidenceFor(tokens, lookups).get(copulaIdx) ?? null;
}
