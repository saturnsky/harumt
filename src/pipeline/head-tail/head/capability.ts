export interface ProjectionContinuationCapabilityIdMapping {
  readonly negation?: string;
  readonly past?: string;
  readonly polite?: string;
  readonly scopeBridge?: string;
  readonly connective?: string;
  readonly quote?: string;
  readonly attributiveQuote?: string;
}

export interface ProjectionAuxOpLike {
  readonly kind: string;
  readonly polarity?: string;
  readonly tense?: string;
  readonly connective?: string;
  readonly quoteBoundary?: unknown;
  readonly past?: boolean;
  readonly polite?: boolean;
}

export function projectionOpContinuationCapabilityIds(
  ops: readonly ProjectionAuxOpLike[],
  mapping: ProjectionContinuationCapabilityIdMapping
): readonly string[] {
  const ids = new Set<string>();
  for (const op of ops) {
    if (mapping.negation !== undefined && projectionOpIsNegation(op)) {
      ids.add(mapping.negation);
    }
    if (mapping.past !== undefined && projectionOpCarriesPast(op)) {
      ids.add(mapping.past);
    }
    if (mapping.polite !== undefined && projectionOpCarriesPolite(op)) {
      ids.add(mapping.polite);
    }
    if (mapping.scopeBridge !== undefined && op.kind === "scopeBridge") {
      ids.add(mapping.scopeBridge);
    }
    if (mapping.connective !== undefined && op.kind === "connective" && !projectionOpIsQuoteBoundary(op)) {
      ids.add(mapping.connective);
    }
    if (mapping.quote !== undefined && projectionOpIsQuoteBoundary(op)) {
      ids.add(mapping.quote);
    }
    if (mapping.attributiveQuote !== undefined && op.kind === "predicateQuoteCarrier") {
      ids.add(mapping.attributiveQuote);
    }
  }
  return [...ids];
}

export function projectionOpIsNegation(op: ProjectionAuxOpLike): boolean {
  return op.kind === "negation" ||
    (op.kind === "copula" && op.polarity === "negative") ||
    (op.kind === "scopeBridge" && op.polarity === "negative");
}

export function projectionOpCarriesPast(op: ProjectionAuxOpLike): boolean {
  return (op.kind === "tense" && op.tense === "past") ||
    (op.kind === "modal" && op.past === true) ||
    (op.kind === "predicateProjectionCarrier" && op.past === true);
}

export function projectionOpCarriesPolite(op: ProjectionAuxOpLike): boolean {
  return op.kind === "polite" || op.polite === true;
}

export function projectionOpIsQuoteBoundary(op: ProjectionAuxOpLike): boolean {
  if (op.kind !== "connective") {
    return false;
  }
  return op.quoteBoundary !== undefined ||
    op.connective === "quotative" ||
    op.connective === "question_quotative" ||
    op.connective === "cognitive_complement" ||
    op.connective === "wish_complement" ||
    op.connective === "request_complement";
}
