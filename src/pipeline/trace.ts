export type TraceDetailValue =
  | string
  | number
  | boolean
  | null
  | readonly TraceDetailValue[]
  | { readonly [key: string]: TraceDetailValue };

export class TraceEvent {
  constructor(
    readonly tokenIdx: number,
    readonly phase: string,
    readonly ruleName: string,
    readonly matched: boolean,
    readonly detail: { readonly [key: string]: TraceDetailValue } = {}
  ) {}
}

export class TraceCollector {
  constructor(
    readonly events: TraceEvent[] = []
  ) {}

  record(event: TraceEvent): void {
    this.events.push(event);
  }

  eventsFor(tokenIdx: number, options: { readonly phase?: string | null } = {}): TraceEvent[] {
    return this.events.filter((event) =>
      event.tokenIdx === tokenIdx && (options.phase === undefined || options.phase === null || event.phase === options.phase)
    );
  }

  entryPoint(tokenIdx: number): TraceEvent | null {
    for (const event of this.events) {
      if (event.tokenIdx === tokenIdx && event.phase === "content_pass") {
        return event;
      }
    }
    return null;
  }

  matchedRule(tokenIdx: number): TraceEvent | null {
    for (const event of this.events) {
      if (
        event.tokenIdx === tokenIdx &&
        event.matched &&
        (event.phase === "special" ||
          event.phase === "pre_entry" ||
          event.phase === "entry_aux" ||
          event.phase === "tail")
      ) {
        return event;
      }
    }
    return null;
  }

  analysisEvent(tokenIdx: number): TraceEvent | null {
    for (const event of this.events) {
      if (event.tokenIdx === tokenIdx && event.phase === "analysis") {
        return event;
      }
    }
    return null;
  }

  commitmentEvents(tokenIdx: number): TraceEvent[] {
    return this.eventsFor(tokenIdx, { phase: "commitment" });
  }
}
