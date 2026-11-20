import type { RuntimeHaruToken } from "../../types/token.js";
import { isAdverbialFocusParticle } from "../clause-layout/reachability.js";
import type { LookupTables } from "../lookup-tables.js";
import { isYouNiQuoteDirectivePredicateStart } from "../semantics/you-zero-directive.js";
import { TokenCursor } from "../token-cursor.js";
import { appearancePerceptionReadingForToken } from "../head-tail/tail/predicate-root/appearance-perception-carrier-table.js";
import { nextNonSpaceIndex } from "../clause-layout/trivia.js";
import { copulaNiMarkerRelationForToken } from "../head-tail/boundary/marker.js";
import { quoteMarkerRelationAt } from "../head-tail/boundary/quote-marker.js";
import { IU_LEXEME_FORMS } from "../head-tail/data/quoted-reporting-sets.js";
import {
  postverbAuxiliaryDeclaresHostAttachForm,
  postverbAuxiliaryPayloadsForForm
} from "../head-tail/tail/predicate-root/postverb-auxiliary-parser.js";
import {
  isAttributiveInflection,
  isAuxiliaryStemToken,
  isIndependentWordToken,
  isPrefixAffixToken,
  isVerbPredicateToken,
  名詞_普通名詞_形状詞可能
} from "../../types/pos.js";

export function flipQuotativeMannerNouns(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token, index) => {
    if (!isQuotativeMannerNounCoordinate(tokens, index, lookups)) {
      return token;
    }
    dirty = true;
    return { ...token, pos: 名詞_普通名詞_形状詞可能 };
  });
  return dirty ? result : [...tokens];
}

function isQuotativeMannerNounCoordinate(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): boolean {
  const stem = tokens[index];
  if (
    stem === undefined ||
    !isAuxiliaryStemToken(stem) ||
    (stem.dictionaryForm || stem.surface) !== "よう"
  ) {
    return false;
  }
  if (copulaNiMarkerRelationForToken(tokens[index + 1], index + 1, {
    consumers: ["tail_multi_clause"]
  }) === null) {
    return false;
  }
  return quotativeCarrierEndsAt(tokens, index - 1) &&
    quotativeMannerAdverbialModificandFollows(tokens, index + 2, lookups);
}

function quotativeCarrierEndsAt(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  const iu = tokens[idx];
  if (
    iu === undefined ||
    !isVerbPredicateToken(iu) ||
    !isAttributiveInflection(iu.pos) ||
    !IU_LEXEME_FORMS.has(iu.dictionaryForm || iu.surface)
  ) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, idx - 1, { consumers: ["tail_multi_clause"] });
  return marker?.canonicalSurface === "と";
}

function quotativeMannerAdverbialModificandFollows(
  tokens: readonly RuntimeHaruToken[],
  afterCopulaIdx: number,
  lookups: LookupTables
): boolean {
  for (
    let idx = nextNonSpaceIndex(tokens, afterCopulaIdx, tokens.length);
    idx !== null;
    idx = nextNonSpaceIndex(tokens, idx + 1, tokens.length)
  ) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isAdverbialFocusParticle(token)) {
      continue;
    }
    if (isPrefixAffixToken(token)) {
      continue;
    }
    if (!isIndependentWordToken(token)) {
      return false;
    }
    return !isCopulaNiHostCarrierVerbToken(token) &&
      !isProjectionOwnedMannerFollower(tokens, idx, lookups);
  }
  return false;
}

function isProjectionOwnedMannerFollower(
  tokens: readonly RuntimeHaruToken[],
  followerIdx: number,
  lookups: LookupTables
): boolean {
  if (appearancePerceptionReadingForToken(tokens[followerIdx]) !== null) {
    return true;
  }
  if (isQuotedReportingFollower(tokens[followerIdx])) {
    return false;
  }
  return isYouNiQuoteDirectivePredicateStart(
    new TokenCursor(tokens, followerIdx, tokens.length),
    lookups
  );
}

function isQuotedReportingFollower(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    isVerbPredicateToken(token) &&
    IU_LEXEME_FORMS.has(token.dictionaryForm || token.surface);
}

function isCopulaNiHostCarrierVerbToken(token: RuntimeHaruToken): boolean {
  if (!isVerbPredicateToken(token)) {
    return false;
  }
  return postverbAuxiliaryPayloadsForForm(token.dictionaryForm || token.surface)
    .some((payload) => postverbAuxiliaryDeclaresHostAttachForm(payload, "copula_ni"));
}
