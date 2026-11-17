
import type { ClauseLayout } from "../clause-layout/index.js";
import {
  enumerateClausePhrasesBefore,
  type ClausePhraseItem,
  type PhraseEnumerationLayout
} from "../clause-layout/phrase-enumeration.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";

export interface MonoModalClauseEvidence {
  readonly frequencyAdverb: boolean;
  readonly evaluativeFrequencyAdverb: boolean;
  readonly admirativeAdverb: boolean;
}

export interface MonoModalEvidenceOptions {
  readonly finalLayout?: ClauseLayout | null;
  readonly hostPredicateIdx?: number | null;
}

function tokenForm(token: RuntimeHaruToken): string {
  return token.dictionaryForm || token.surface;
}

function combinedAdverbForm(tokens: readonly RuntimeHaruToken[], item: ClausePhraseItem): string | null {
  const head = tokens[item.headIdx];
  const next = tokens[item.headIdx + 1];
  if (head === undefined || next === undefined) {
    return null;
  }
  return `${tokenForm(head)}${next.surface}`;
}

export function monoModalClauseEvidence(
  tokens: readonly RuntimeHaruToken[],
  carrierIdx: number,
  lookups: LookupTables,
  layout: PhraseEnumerationLayout | null,
  options: MonoModalEvidenceOptions = {}
): MonoModalClauseEvidence {
  let frequencyAdverb = false;
  let evaluativeFrequencyAdverb = false;
  let admirativeAdverb = false;
  for (const item of enumerateClausePhrasesBefore(layout, tokens, carrierIdx, { scope: "clause" })) {
    if (item.kind !== "adverbial" && !(item.kind === "nominal" && item.markerParticleIdx === null)) {
      continue;
    }
    const head = tokens[item.headIdx];
    if (head === undefined) {
      continue;
    }
    const form = tokenForm(head);
    const combined = item.kind === "adverbial" ? combinedAdverbForm(tokens, item) : null;
    if (
      lookups.MONO_MODAL_ADMIRATIVE_ADVERBS.has(form) ||
      (combined !== null && lookups.MONO_MODAL_ADMIRATIVE_ADVERBS.has(combined))
    ) {
      admirativeAdverb = true;
    } else if (lookups.MONO_MODAL_FREQUENCY_ADVERBS.has(form)) {
      frequencyAdverb = true;
      if (lookups.MONO_MODAL_EVALUATIVE_FREQUENCY_ADVERBS.has(form)) {
        evaluativeFrequencyAdverb = true;
      }
    }
  }
  const finalLayout = options.finalLayout ?? null;
  const hostPredicateIdx = options.hostPredicateIdx ?? null;
  if (finalLayout !== null && hostPredicateIdx !== null) {
    for (const adjunctIdx of finalLayout.adverbialAdjunctsOf(hostPredicateIdx)) {
      const adjunct = tokens[adjunctIdx];
      if (adjunct !== undefined && lookups.MONO_MODAL_ADMIRATIVE_ADVERBS.has(`${tokenForm(adjunct)}に`)) {
        admirativeAdverb = true;
      }
    }
  }
  return { frequencyAdverb, evaluativeFrequencyAdverb, admirativeAdverb };
}
