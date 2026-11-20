
export function normalizeBenefactiveTail(mainText: string, koreanLemma: string, tailText: string): string {
  if (!koreanLemma.endsWith("주다")) {
    return `${mainText} ${tailText}`;
  }
  if (tailText === "다오" && mainText.endsWith(" 줘")) {
    return `${mainText.slice(0, -2).trimEnd()} ${tailText}`;
  }
  if (tailText === "다오" && mainText.endsWith("줘")) {
    return `${mainText.slice(0, -1).trimEnd()} ${tailText}`;
  }
  if (mainText.endsWith(" 줘")) {
    return `${mainText.slice(0, -2)}${tailText}`;
  }
  if (mainText.endsWith("줘")) {
    return `${mainText.slice(0, -1)}${tailText}`;
  }
  return `${mainText} ${tailText}`;
}

export function normalizeGiveRequest(mainText: string, koreanLemma: string, requestText: string): string {
  return normalizeBenefactiveTail(mainText, koreanLemma, requestText);
}

export function normalizeRequestQuotative(mainText: string, koreanLemma: string): string {
  if (!koreanLemma.endsWith("주다")) {
    return `${mainText} 달라고`;
  }
  if (mainText.endsWith(" 줘")) {
    return `${mainText.slice(0, -2)} 달라고`;
  }
  if (mainText.endsWith("줘")) {
    return `${mainText.slice(0, -1)} 달라고`;
  }
  return `${mainText} 달라고`;
}

export function normalizeRequestQuoteNominal(mainText: string, koreanLemma: string): string {
  if (!koreanLemma.endsWith("주다")) {
    return `${mainText} 달라는 말을`;
  }
  if (mainText.endsWith(" 줘")) {
    return `${mainText.slice(0, -2)} 달라는 말을`;
  }
  if (mainText.endsWith("줘")) {
    return `${mainText.slice(0, -1)} 달라는 말을`;
  }
  return `${mainText} 달라는 말을`;
}

export type RequestQuoteAttributiveAbsorption = "retained" | "partial" | "full";

export interface RequestQuoteSourceSegment<S extends object, M> {
  readonly text: string;
  readonly sources: readonly S[];
  readonly metadata: M;
}

export interface RequestQuoteAttributiveSourceProjection<S extends object, M> {
  readonly commandSources: readonly S[];
  readonly commandPrefix: readonly RequestQuoteSourceSegment<S, M>[];
  readonly commandFinalSources: readonly S[];
  readonly commandFinalMetadata: M;
  readonly requestSources: readonly S[];
  readonly carrierSources: readonly S[];
}

export interface RequestQuoteAttributiveRecipe<S extends object, M> {
  readonly absorption: RequestQuoteAttributiveAbsorption;
  readonly projection: "exact" | "collapsed";
  readonly predicate: {
    readonly text: string;
    readonly segments: readonly RequestQuoteSourceSegment<S, M>[];
  };
  readonly request: {
    readonly text: " 달";
    readonly sources: readonly S[];
  };
  readonly carrier: {
    readonly text: "라는";
    readonly sources: readonly S[];
  };
  readonly text: string;
}

function uniqueSources<S extends object>(sources: readonly S[]): S[] {
  const seen = new Set<S>();
  const unique: S[] = [];
  for (const source of sources) {
    if (seen.has(source)) continue;
    seen.add(source);
    unique.push(source);
  }
  return unique;
}

function normalizedRequestQuotePredicate(
  mainText: string,
  koreanLemma: string
): { readonly text: string; readonly absorption: RequestQuoteAttributiveAbsorption } {
  if (!koreanLemma.endsWith("주다")) {
    return { text: mainText, absorption: "retained" };
  }
  const text = mainText.endsWith(" 줘")
    ? mainText.slice(0, -2)
    : mainText.endsWith("줘")
      ? mainText.slice(0, -1)
      : mainText;
  if (text === mainText) {
    return { text, absorption: "retained" };
  }
  return { text, absorption: text.length === 0 ? "full" : "partial" };
}

function trimSegmentsToText<S extends object, M>(
  segments: readonly RequestQuoteSourceSegment<S, M>[],
  target: string
): readonly RequestQuoteSourceSegment<S, M>[] | null {
  const sourceText = segments.map(({ text }) => text).join("");
  if (sourceText === target) return segments;
  if (sourceText.trimEnd() !== target) return null;

  const trimmed: RequestQuoteSourceSegment<S, M>[] = [];
  let remaining = target.length;
  for (const segment of segments) {
    if (remaining <= 0) break;
    const text = segment.text.slice(0, remaining);
    remaining -= text.length;
    if (text.length > 0) trimmed.push({ ...segment, text });
  }
  return remaining === 0 ? trimmed : null;
}

function appendSourcesToLastSegment<S extends object, M>(
  segments: readonly RequestQuoteSourceSegment<S, M>[],
  sources: readonly S[],
  fallback: { readonly text: string; readonly metadata: M }
): readonly RequestQuoteSourceSegment<S, M>[] {
  if (sources.length === 0) return segments;
  if (segments.length === 0) {
    return [{ text: fallback.text, sources, metadata: fallback.metadata }];
  }
  const last = segments[segments.length - 1]!;
  return [
    ...segments.slice(0, -1),
    { ...last, sources: [...last.sources, ...sources] }
  ];
}

export function requestQuoteAttributiveRecipe<S extends object = object, M = unknown>(
  mainText: string,
  koreanLemma: string,
  source?: RequestQuoteAttributiveSourceProjection<S, M>
): RequestQuoteAttributiveRecipe<S, M> {
  const predicate = normalizedRequestQuotePredicate(mainText, koreanLemma);
  if (source === undefined) {
    return {
      absorption: predicate.absorption,
      projection: "exact",
      predicate: { text: predicate.text, segments: [] },
      request: { text: " 달", sources: [] },
      carrier: { text: "라는", sources: [] },
      text: `${predicate.text} 달라는`
    };
  }

  const commandSources = uniqueSources(source.commandSources);
  const requestSources = uniqueSources(source.requestSources);
  const carrierSources = uniqueSources(source.carrierSources);
  const commandSourceSet = new Set(commandSources);
  const assigned = new Set<S>();
  const takeUnassigned = (sources: readonly S[]): S[] => {
    const taken: S[] = [];
    for (const item of sources) {
      if (assigned.has(item)) continue;
      assigned.add(item);
      taken.push(item);
    }
    return taken;
  };
  const sourceOrder = new Map(commandSources.map((item, index) => [item, index]));

  let projection: "exact" | "collapsed" = "exact";
  let predicateSegments: readonly RequestQuoteSourceSegment<S, M>[] = [];
  if (predicate.absorption === "retained") {
    const prefixText = source.commandPrefix.map(({ text }) => text).join("");
    if (predicate.text.startsWith(prefixText)) {
      predicateSegments = source.commandPrefix.map((segment) => ({
        ...segment,
        sources: takeUnassigned(segment.sources.filter((item) => commandSourceSet.has(item)))
      }));
      const finalText = predicate.text.slice(prefixText.length);
      if (finalText.length > 0) {
        predicateSegments = [
          ...predicateSegments,
          {
            text: finalText,
            sources: takeUnassigned(source.commandFinalSources),
            metadata: source.commandFinalMetadata
          }
        ];
      }
    } else {
      projection = "collapsed";
      predicateSegments = [{
        text: predicate.text,
        sources: takeUnassigned(commandSources),
        metadata: source.commandFinalMetadata
      }];
    }
    predicateSegments = appendSourcesToLastSegment(
      predicateSegments,
      takeUnassigned(commandSources),
      { text: predicate.text, metadata: source.commandFinalMetadata }
    );
  } else if (predicate.absorption === "partial") {
    const prefixText = source.commandPrefix.map(({ text }) => text).join("");
    if (predicate.text.startsWith(prefixText) && predicate.text.length > prefixText.length) {
      predicateSegments = source.commandPrefix.map((segment) => ({
        ...segment,
        sources: takeUnassigned(segment.sources.filter((item) => commandSourceSet.has(item)))
      }));
      predicateSegments = [
        ...predicateSegments,
        {
          text: predicate.text.slice(prefixText.length),
          sources: takeUnassigned(source.commandFinalSources),
          metadata: source.commandFinalMetadata
        }
      ];
      predicateSegments = appendSourcesToLastSegment(
        predicateSegments,
        takeUnassigned(commandSources),
        { text: predicate.text, metadata: source.commandFinalMetadata }
      );
    } else {
      const trimmed = trimSegmentsToText(source.commandPrefix, predicate.text);
      if (trimmed === null) {
        projection = "collapsed";
        const prefixOwned = new Set(source.commandPrefix.flatMap(({ sources }) => sources));
        const lastOwnedIndex = commandSources.reduce(
          (last, item, index) => prefixOwned.has(item) ? index : last,
          -1
        );
        const retainedSources = lastOwnedIndex < 0
          ? commandSources.filter((item) => !source.commandFinalSources.includes(item))
          : commandSources.slice(0, lastOwnedIndex + 1);
        predicateSegments = [{
          text: predicate.text,
          sources: takeUnassigned(retainedSources),
          metadata: source.commandFinalMetadata
        }];
      } else {
        const prefixOwnedIndices = trimmed
          .flatMap(({ sources }) => sources)
          .flatMap((item) => sourceOrder.has(item) ? [sourceOrder.get(item)!] : []);
        const lastOwnedIndex = prefixOwnedIndices.length === 0
          ? -1
          : Math.max(...prefixOwnedIndices);
        const retainedSourceSet = new Set(
          lastOwnedIndex < 0 ? [] : commandSources.slice(0, lastOwnedIndex + 1)
        );
        predicateSegments = trimmed.map((segment) => ({
          ...segment,
          sources: takeUnassigned(segment.sources.filter((item) => retainedSourceSet.has(item)))
        }));
        predicateSegments = appendSourcesToLastSegment(
          predicateSegments,
          takeUnassigned(commandSources.filter((item) => retainedSourceSet.has(item))),
          { text: predicate.text, metadata: source.commandFinalMetadata }
        );
      }
    }
  }

  const requestHead = requestSources.slice(0, 1);
  const requestTail = requestSources.slice(1);
  if (predicateSegments.length > 0) {
    predicateSegments = appendSourcesToLastSegment(
      predicateSegments,
      takeUnassigned(requestHead),
      { text: predicate.text, metadata: source.commandFinalMetadata }
    );
  }
  const requestAllocation = takeUnassigned([
    ...commandSources,
    ...requestHead,
    ...requestTail
  ]);
  const carrierAllocation = takeUnassigned(carrierSources);

  return {
    absorption: predicate.absorption,
    projection,
    predicate: { text: predicate.text, segments: predicateSegments },
    request: { text: " 달", sources: requestAllocation },
    carrier: { text: "라는", sources: carrierAllocation },
    text: `${predicate.text} 달라는`
  };
}
