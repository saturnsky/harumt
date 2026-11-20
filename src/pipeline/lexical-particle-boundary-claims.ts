import type { MorphemeDictionary } from "../dictionary/morpheme.js";
import type { MorphemeSense } from "../types/dictionary.js";
import type { RuntimeHaruToken } from "../types/token.js";
import { POS0, 助詞, 補助記号 } from "../types/pos.js";
import type { LexicalParticleBoundaryClaim } from "./clause-layout/layout-types.js";
import {
  activeProtoLayout,
  activeProtoPostposedModifiedPredicateIndexBefore,
  activeProtoUtteranceRange
} from "./clause-layout/proto-state.js";
import { nextNonSpaceIndex } from "./clause-layout/trivia.js";
import { questionContentContinuationAfterKaRelationAt } from "./head-tail/boundary/marker.js";
import { kaOwnershipKindAt } from "./head-tail/boundary/ka-ownership.js";
import { hasRealContentAfterIndex } from "./head-tail/boundary/punctuation.js";
import type { LookupTables } from "./lookup-tables.js";
import { looksNarrowQuestionTakingAfter } from "./quote/embedded-question.js";
import { requestOrImperativeExpressionAfter } from "./semantics/request-evidence.js";
import { TokenCursor } from "./token-cursor.js";

export async function collectLexicalParticleBoundaryClaims(
  dictionary: MorphemeDictionary,
  tokens: readonly RuntimeHaruToken[]
): Promise<readonly LexicalParticleBoundaryClaim[]> {
  const claims: LexicalParticleBoundaryClaim[] = [];
  for (let index = 0; index + 1 < tokens.length; index += 1) {
    const head = tokens[index];
    const particle = tokens[index + 1];
    if (
      head === undefined ||
      particle === undefined ||
      (particle.pos & POS0) !== 助詞
    ) {
      continue;
    }
    const entry = await dictionary.lookupTokenRelaxed(head);
    for (const sense of entry?.senses ?? []) {
      for (const adverbialization of sense.adverbializations ?? []) {
        if (
          adverbialization.particle !== particle.surface ||
          adverbialization.consumeParticle === false
        ) {
          continue;
        }
        claims.push({
          headIdx: index,
          particleIdx: index + 1,
          particle: adverbialization.particle,
          kind: adverbialization.kind,
          ...(adverbialization.following?.requestOrImperative === true
            ? { followingRequestOrImperative: true }
            : {})
        });
      }
    }
  }
  return claims;
}

export function adverbializationActivationMatches(
  adverbialization: NonNullable<MorphemeSense["adverbializations"]>[number],
  context: {
    readonly cursor: TokenCursor<RuntimeHaruToken>;
    readonly particleIdx: number;
    readonly lookups: LookupTables;
  }
): boolean {
  const { tokens, end: n } = context.cursor;
  const following = adverbialization.following;
  if (following === undefined || following === null) {
    return true;
  }
  if (following.adverbialScope === true && !hasAdverbialScope(context)) {
    return false;
  }
  if (following.requestOrImperative === true) {
    if (
      !isRequestAdjunctAffiliation(context.particleIdx) &&
      !followsRequestOrImperativeExpression(context.cursor, context.particleIdx + 1, context.particleIdx, context.lookups)
    ) {
      return false;
    }
  }
  if (following.blockedNextDictionaryForms !== undefined && following.blockedNextDictionaryForms.length > 0) {
    const nextIdx = nextNonSpaceIndex(tokens, context.particleIdx + 1, n);
    const next = nextIdx === null ? undefined : tokens[nextIdx];
    const nextForm = tokenDictionaryFormLocal(next);
    if (nextForm.length > 0 && following.blockedNextDictionaryForms.includes(nextForm)) {
      return false;
    }
  }
  return true;
}

function hasAdverbialScope(context: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly particleIdx: number;
  readonly lookups: LookupTables;
}): boolean {
  const { tokens, end: n } = context.cursor;
  const range = activeProtoUtteranceRange(context.particleIdx);
  if (range === null) {
    return false;
  }
  if (questionParticleIsOwnedElsewhere(context)) {
    return false;
  }
  if (hasRealContentAfterIndex(tokens, context.particleIdx + 1, { limit: Math.min(n, range.endExclusive) })) {
    return true;
  }
  return activeProtoPostposedModifiedPredicateIndexBefore(tokens, context.particleIdx) !== null;
}

function questionParticleIsOwnedElsewhere(context: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly particleIdx: number;
  readonly lookups: LookupTables;
}): boolean {
  const { tokens, end: n } = context.cursor;
  const kaKind = kaOwnershipKindAt(tokens, context.particleIdx, context.lookups);
  if (kaKind === null || kaKind === "wh_indefinite") {
    return false;
  }
  if (kaKind !== "question") {
    return true;
  }
  const continuation = questionContentContinuationAfterKaRelationAt(tokens, context.particleIdx, {
    consumers: ["embedded_question"],
    limit: n,
    requireAdjacent: true
  });
  if (continuation !== null) {
    return true;
  }
  return looksNarrowQuestionTakingAfter(
    context.cursor.fork(context.particleIdx + 1, n, context.particleIdx + 1),
    context.lookups,
    { sahenRequiresPredicate: true }
  );
}

function isRequestAdjunctAffiliation(particleIdx: number): boolean {
  return activeProtoLayout()?.lexicalAdverbialAffiliationAt(particleIdx)?.relation === "request_adjunct";
}

function followsRequestOrImperativeExpression(
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number,
  particleIdx: number,
  lookups: LookupTables
): boolean {
  const window = cursor.lookahead(pos - cursor.pos, c => particleAdverbialActivationWindow(c, particleIdx));
  return cursor.lookahead(window.start - cursor.pos, c =>
    requestOrImperativeExpressionAfter(c, lookups, {
      allowLeadingWeakPunctuation: window.allowLeadingWeakPunctuation,
      limit: window.end
    })
  );
}

interface ParticleAdverbialActivationWindow {
  readonly start: number;
  readonly end: number;
  readonly allowLeadingWeakPunctuation: boolean;
}

function particleAdverbialActivationWindow(
  cursor: TokenCursor<RuntimeHaruToken>,
  particleIdx: number
): ParticleAdverbialActivationWindow {
  const { tokens, pos, end: n } = cursor;
  const proto = activeProtoLayout();
  const clause = proto?.clauseContaining(particleIdx);
  if (clause !== undefined) {
    return {
      start: pos,
      end: Math.min(clause.end, n),
      allowLeadingWeakPunctuation: true
    };
  }
  for (let cursor = particleIdx + 1; cursor < n; cursor += 1) {
    const token = tokens[cursor];
    if (token !== undefined && (token.pos & POS0) === 補助記号) {
      return { start: pos, end: cursor, allowLeadingWeakPunctuation: false };
    }
  }
  return { start: pos, end: n, allowLeadingWeakPunctuation: false };
}

function tokenDictionaryFormLocal(token: Pick<RuntimeHaruToken, "surface" | "dictionaryForm"> | undefined): string {
  return token?.dictionaryForm || token?.surface || "";
}
