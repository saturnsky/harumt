import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { BoundaryRelationConsumer } from "../../../boundary/relation.js";
import {
  caseParticleMarkerRelationForToken,
  nominalizerQuestionContentConnectiveRelationAt,
  predicateNominalizerRelationForToken,
  pronominalNoDeScopeBridgeRelationAt
} from "../../../boundary/marker.js";
import { looksPronominalNoNi, looksPronominalNoTo } from "../../../boundary/pronominal-no.js";
import { TokenCursor } from "../../../../token-cursor.js";
import {
  NOMINALIZER_FOLLOWERS,
  type NominalizerFollowerArbitrationKey
} from "../nominalizer-follower-table.js";
import { isPredicateScopeCarrierSuffixStart } from "./focus-connective.js";
import { canCloseBareBekiBeforeBoundary } from "./obligation.js";
import { pronominalNoScopeBridgeClaimsAt } from "./scope-bridge.js";
import {
  isCaseParticleToken,
  isDependentWordToken,
  isNominalScopeParticleToken,
  POS0,
  POS4,
  POS5A,
  助詞,
  文語助動詞_ベシ,
  連体形_
} from "../../../../../types/pos.js";
import { isBoundaryPunctuationCategoryToken, type BoundaryToken } from "../../../boundary/punctuation.js";

const NOMINALIZER_FOLLOWER_ARBITRATIONS: {
  readonly [K in NominalizerFollowerArbitrationKey]: (
    tokens: readonly RuntimeHaruToken[],
    index: number,
    lookups: LookupTables
  ) => boolean;
} = {
  pronominal_no_to: (tokens, index, lookups) => looksPronominalNoTo(tokens, index, lookups),
  pronominal_no_ni: (tokens, index, lookups) =>
    looksPronominalNoNi(new TokenCursor(tokens, index - 1, tokens.length, index - 1), lookups),
  question_content_ka: (tokens, index) =>
    isBekiRentaiToken(tokens[index - 1])
      ? !canCloseBareBekiBeforeBoundary(new TokenCursor(tokens, index, tokens.length, index))
      : nominalizerQuestionContentConnectiveRelationAt(tokens, index - 1, {
        consumers: ["tail_multi_clause"]
      }) === null,
  predicate_scope_carrier_dake: (tokens, index) => !isPredicateScopeCarrierSuffixStart(tokens, index),
  pronominal_no_de_scope_bridge: (tokens, index, lookups) =>
    !pronominalNoScopeBridgeClaimsAt(tokens, index - 1, lookups)
};

export function isNominalizerFunctionalContinuationToken(token: BoundaryToken): boolean {
  return isDependentWordToken(token) || isBoundaryPunctuationCategoryToken(token);
}

export function plainNominalizerFollowerVerdictAt(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables,
  consumers: readonly BoundaryRelationConsumer[]
): "particle_follower" | "zero_follower" | null {
  const token = tokens[index];
  if (token === undefined) {
    return null;
  }
  if (isPlainNominalizerParticleFollowerAt(tokens, index, lookups, consumers)) {
    return "particle_follower";
  }
  if (isNominalizerFunctionalContinuationToken(token)) {
    return null;
  }
  return "zero_follower";
}

export function isPlainNominalizerParticleFollowerAt(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables,
  consumers: readonly BoundaryRelationConsumer[]
): boolean {
  const token = tokens[index];
  if (token === undefined) {
    return false;
  }
  if ((token.pos & POS0) !== 助詞) {
    return isPronominalNoCopulaDeFollowerAt(tokens, index, lookups);
  }
  const spec = NOMINALIZER_FOLLOWERS.get(token.surface);
  if (!isNominalScopeParticleToken(token)) {
    return false;
  }
  if (
    isCaseParticleToken(token) &&
    caseParticleMarkerRelationForToken(token, index, { consumers }) === null
  ) {
    return false;
  }
  if (spec === undefined) {
    return true;
  }
  return NOMINALIZER_FOLLOWER_ARBITRATIONS[spec.ownerArbitration](tokens, index, lookups);
}

function isPronominalNoCopulaDeFollowerAt(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): boolean {
  const relation = pronominalNoDeScopeBridgeRelationAt(tokens, index - 1, {
    consumers: ["tail_multi_clause"]
  });
  if (relation === null || relation.markerKind !== "copula" || relation.focusParticle === undefined) {
    return false;
  }
  return !pronominalNoScopeBridgeClaimsAt(tokens, index - 1, lookups);
}

function isBekiRentaiToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.pos & (POS4 | POS5A)) === (文語助動詞_ベシ | 連体形_);
}

export function isBekiRentaiNominalizedFrameEnd(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): boolean {
  if (!isBekiRentaiToken(tokens[end])) {
    return false;
  }
  return isPlainNominalizerParticleFollowerAt(tokens, end + 1, lookups, ["tail_multi_clause"]);
}

export function plainNominalizerFrameEndVerdictAt(
  tokens: readonly RuntimeHaruToken[],
  end: number,
  lookups: LookupTables
): "particle_follower" | "zero_follower" | null {
  const nominalizer = tokens[end];
  if (predicateNominalizerRelationForToken(nominalizer, end, {
    requirement: "tail_connective_marker",
    consumers: ["tail_multi_clause"]
  })?.nominalizerKind !== "no") {
    return null;
  }
  return plainNominalizerFollowerVerdictAt(tokens, end + 1, lookups, ["tail_multi_clause"]);
}

