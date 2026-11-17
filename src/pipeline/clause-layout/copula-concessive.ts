
export interface CopulaConcessiveToken {
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly pos: number;
}

export type CopulaConcessiveLicence =
  | "wh_indefinite_host"
  | "paired_listing"
  | "concessive_condition_adverb";

export interface CopulaConcessiveConditionEvidence {
  readonly kind: "copula_concessive_condition";
  readonly copulaIdx: number;
  readonly supportIdx: number;
  readonly licence: CopulaConcessiveLicence;
  readonly itemCopulaIndices: readonly number[];
  readonly consequentPredicateIdx?: number;
  readonly adverbIdx?: number;
}

export interface CopulaConcessiveClauseReader {
  clauseOfToken(tokenIdx: number): { readonly start: number; readonly end: number } | undefined;
  utteranceRangeOfToken(tokenIdx: number): { readonly start: number; readonly endExclusive: number };
  enclosingQuoteSpan(tokenIdx: number): readonly [number, number] | undefined;
}

export interface CopulaConcessiveLookupSource {
  set(section: string, key: string): ReadonlySet<string>;
}

export interface CopulaConcessiveCollectOptions<Token extends CopulaConcessiveToken> {
  readonly lookups: CopulaConcessiveLookupSource;
  readonly isImperativeSupportShape: (tokens: readonly Token[], copulaIdx: number) => boolean;
  readonly isPredicateStart: (tokens: readonly Token[], index: number) => boolean;
  readonly isImperativeInflection: (token: Token) => boolean;
  readonly isProhibitionHostInflection: (token: Token) => boolean;
  readonly isSentenceFinalParticle: (token: Token) => boolean;
  readonly hasOwnNominativeSubjectAt: (predicateIdx: number) => boolean;
  readonly clauses?: CopulaConcessiveClauseReader | undefined;
}

function tokenForm(token: CopulaConcessiveToken | undefined): string {
  return token === undefined ? "" : (token.dictionaryForm || token.surface);
}

function collectItems<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  options: CopulaConcessiveCollectOptions<Token>
): readonly number[] {
  const items: number[] = [];
  for (let idx = 0; idx < tokens.length; idx += 1) {
    if (options.isImperativeSupportShape(tokens, idx)) {
      items.push(idx);
    }
  }
  return items;
}

function consequentPredicateWithinRange<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  from: number,
  rangeEndExclusive: number,
  items: readonly number[],
  options: CopulaConcessiveCollectOptions<Token>
): number | null {
  const itemSpan = new Set<number>();
  for (const copulaIdx of items) {
    itemSpan.add(copulaIdx);
    itemSpan.add(copulaIdx + 1);
  }
  const limit = Math.min(rangeEndExclusive, tokens.length);
  for (let idx = from; idx < limit; idx += 1) {
    if (itemSpan.has(idx)) {
      continue;
    }
    if (options.isPredicateStart(tokens, idx)) {
      return idx;
    }
  }
  return null;
}

function concessiveAdverbInSameClause<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  copulaIdx: number,
  options: CopulaConcessiveCollectOptions<Token>
): number | null {
  const clause = options.clauses?.clauseOfToken(copulaIdx);
  if (clause === undefined) {
    return null;
  }
  const adverbs = options.lookups.set("copula_concessive", "licensing_adverbs");
  for (let idx = Math.max(0, clause.start); idx < copulaIdx; idx += 1) {
    if (adverbs.has(tokenForm(tokens[idx]))) {
      return idx;
    }
  }
  return null;
}

function hasImperativeSpeechActDevice<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  start: number,
  endExclusive: number,
  options: CopulaConcessiveCollectOptions<Token>
): boolean {
  const prohibitionParticles = options.lookups.set("copula_concessive", "prohibition_final_particles");
  for (let idx = start; idx < Math.min(endExclusive, tokens.length); idx += 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (options.isImperativeInflection(token)) {
      return true;
    }
    if (
      options.isSentenceFinalParticle(token) &&
      prohibitionParticles.has(token.surface) &&
      idx > start
    ) {
      const host = tokens[idx - 1];
      if (host !== undefined && options.isProhibitionHostInflection(host)) {
        return true;
      }
    }
  }
  return false;
}

function hasWhIndefiniteHost<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  copulaIdx: number,
  options: CopulaConcessiveCollectOptions<Token>
): boolean {
  const hosts = options.lookups.set("copula_concessive", "licensing_hosts");
  if (hosts.has(tokenForm(tokens[copulaIdx - 1]))) {
    return true;
  }
  const modifiers = options.lookups.set("copula_concessive", "licensing_host_modifiers");
  return modifiers.has(tokenForm(tokens[copulaIdx - 2]));
}

export function collectCopulaConcessiveConditionEvidence<Token extends CopulaConcessiveToken>(
  tokens: readonly Token[],
  options: CopulaConcessiveCollectOptions<Token>
): ReadonlyMap<number, CopulaConcessiveConditionEvidence> {
  const result = new Map<number, CopulaConcessiveConditionEvidence>();
  const clauses = options.clauses;
  if (clauses === undefined) {
    return result;
  }
  const groups = new Map<string, { readonly endExclusive: number; readonly items: number[] }>();
  for (const copulaIdx of collectItems(tokens, options)) {
    const utterance = clauses.utteranceRangeOfToken(copulaIdx);
    const quote = clauses.enclosingQuoteSpan(copulaIdx);
    const start = quote === undefined ? utterance.start : Math.max(utterance.start, quote[0]);
    const endExclusive = quote === undefined
      ? utterance.endExclusive
      : Math.min(utterance.endExclusive, quote[1]);
    const key = `${start}:${endExclusive}`;
    const group = groups.get(key) ?? { endExclusive, items: [] };
    group.items.push(copulaIdx);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const items = group.items;
    const lastItem = items[items.length - 1];
    const firstItem = items[0];
    if (lastItem === undefined || firstItem === undefined) {
      continue;
    }
    const consequentPredicateIdx = consequentPredicateWithinRange(
      tokens,
      lastItem + 2,
      group.endExclusive,
      items,
      options
    );
    const consequentClause = consequentPredicateIdx === null
      ? undefined
      : clauses.clauseOfToken(consequentPredicateIdx);
    const imperativeConsequent = consequentPredicateIdx !== null && hasImperativeSpeechActDevice(
      tokens,
      consequentPredicateIdx,
      Math.min(consequentClause?.end ?? group.endExclusive, group.endExclusive),
      options
    );
    for (const copulaIdx of items) {
      const adverbIdx = concessiveAdverbInSameClause(tokens, copulaIdx, options);
      const licence: CopulaConcessiveLicence | null = hasWhIndefiniteHost(tokens, copulaIdx, options)
        ? "wh_indefinite_host"
        : adverbIdx !== null
          ? "concessive_condition_adverb"
          : items.length >= 2 &&
              (
                (consequentPredicateIdx !== null && !imperativeConsequent) ||
                options.hasOwnNominativeSubjectAt(firstItem)
              )
            ? "paired_listing"
            : null;
      if (licence === null) {
        continue;
      }
      result.set(copulaIdx, {
        kind: "copula_concessive_condition",
        copulaIdx,
        supportIdx: copulaIdx + 1,
        licence,
        itemCopulaIndices: items,
        ...(consequentPredicateIdx === null ? {} : { consequentPredicateIdx }),
        ...(licence === "concessive_condition_adverb" && adverbIdx !== null ? { adverbIdx } : {})
      });
    }
  }
  return result;
}
