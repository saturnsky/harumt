
import {
  applyEndingToPastStem,
  finalize,
  finalizePast
} from "../../generator/aux-map.js";
import { conjugate } from "../../generator/conjugator.js";
import type { LookupTables } from "../lookup-tables.js";

export function renderHazuNegativeTail(options: {
  readonly formal: boolean;
  readonly polite: boolean;
  readonly past: boolean;
  readonly connective?: string | null;
  readonly lookups: LookupTables;
}): string {
  if (options.connective !== undefined && options.connective !== null) {
    if (options.connective === "nominal_ga") {
      if (options.past) {
        return options.formal ? "없었던 것이" : "없었던 게";
      }
      return options.formal ? "없는 것이" : "없는 게";
    }
    if (options.connective === "기 때문에") {
      return options.past ? "없었기 때문에" : "없기 때문에";
    }
    if (options.past) {
      const pastStem = conjugate("없다", null, "았/었");
      return applyEndingToPastStem(pastStem, options.connective);
    }
    return conjugate("없다", null, options.connective);
  }
  if (options.past) {
    return finalizePast("없었", options.polite, options.formal, options.lookups).text;
  }
  return finalize("없", null, options.polite, false, options.lookups, { formal: options.formal }).text;
}
