
import { parse } from "smol-toml";

import { type DataLoader } from "../data-loader.js";
import { resolveDataSection } from "../dictionary/data-section.js";
import { stableFingerprint } from "../stable-fingerprint.js";
import { ORDINAL_TSU } from "./counter-families.js";
import { formatCounterPhrase, type NumeralSurfaceRealization } from "./numerals.js";

interface NumericTablesData {
  readonly [section: string]: NumericTable | undefined;
}

interface NumericTable {
  readonly values?: readonly string[];
  readonly [key: string]: readonly string[] | QuantityApproximationRow | undefined;
}

interface QuantityApproximationRow {
  readonly kind?: string;
  readonly korean?: string;
}

export type QuantityApproximationKind = "slightly_over" | "slightly_under";

export interface QuantityApproximationMarker {
  readonly surface: string;
  readonly kind: QuantityApproximationKind;
  readonly korean: string;
}

export type IndefiniteNumeralPrefixClass = "interrogative" | "vague_quantity";

export interface IndefiniteNumeralPrefixMetadata {
  readonly sourcePrefix: string;
  readonly prefixClass: IndefiniteNumeralPrefixClass;
}

export class NumericTables {
  private cacheFingerprint: string | undefined;
  private indefiniteNumeralPrefixMetadata: readonly IndefiniteNumeralPrefixMetadata[] | undefined;
  private quantityApproximationMarkers: ReadonlyMap<string, QuantityApproximationMarker> | undefined;

  private constructor(private readonly data: NumericTablesData) {}

  static async load(loader: DataLoader): Promise<NumericTables> {
    const configPath = loader.joinPath(resolveDataSection("config"), "numeric_tables.toml");
    const toml = await loader.readTextFile(configPath);
    return new NumericTables(parse(toml) as NumericTablesData);
  }

  providerCacheKey(): string {
    this.cacheFingerprint ??= stableFingerprint(this.data);
    return this.cacheFingerprint;
  }

  private tableValues(section: string, key = "values"): ReadonlySet<string> {
    const raw = this.data[section]?.[key];
    return new Set(Array.isArray(raw) ? raw.map((item) => String(item)) : []);
  }

  get CATEGORY_MEMBER_COUNTERS(): ReadonlySet<string> {
    return this.tableValues("category_member_counters");
  }

  get TSU_PREV_CASE_PARTICLES(): ReadonlySet<string> {
    return this.tableValues("tsu_prev_case_particles");
  }

  get MOVEMENT_ACTION_PREDICATES(): ReadonlySet<string> {
    return this.tableValues("movement_action_predicates");
  }

  get LONE_PREDICATES(): ReadonlySet<string> {
    return this.tableValues("lone_predicates");
  }

  get OUTCAST_PREDICATES(): ReadonlySet<string> {
    return this.tableValues("outcast_predicates");
  }

  get BARE_TSU_NOUNS(): ReadonlySet<string> {
    return this.tableValues("bare_tsu_nouns");
  }

  get KIND_TSU_NOUNS(): ReadonlySet<string> {
    return this.tableValues("kind_tsu_nouns");
  }

  get GENITIVE_TSU_NOUNS(): ReadonlySet<string> {
    return this.tableValues("genitive_tsu_nouns");
  }

  get EXTENT_NUMERIC_DURATION_COUNTERS(): ReadonlySet<string> {
    return this.tableValues("extent_numeric_duration_counters");
  }

  get EXTENT_NUMERIC_PERSON_COUNTERS(): ReadonlySet<string> {
    return this.tableValues("extent_numeric_person_counters");
  }

  get EXTENT_NUMERIC_REPETITION_COUNTERS(): ReadonlySet<string> {
    return this.tableValues("extent_numeric_repetition_counters");
  }

  get EXTENT_SCALAR_AMOUNT(): ReadonlySet<string> {
    return this.tableValues("extent_scalar_amount");
  }

  get TARGET_ARABIC_COUNTERS(): ReadonlySet<string> {
    return this.tableValues("target_arabic_counters");
  }

  get INDEFINITE_NUMERAL_PREFIX_METADATA(): readonly IndefiniteNumeralPrefixMetadata[] {
    this.indefiniteNumeralPrefixMetadata ??= Object.entries(
      this.data.indefinite_numeral_prefix_classes ?? {}
    ).flatMap(([prefixClass, prefixes]) => (Array.isArray(prefixes) ? prefixes : []).map((sourcePrefix) => ({
      sourcePrefix: String(sourcePrefix),
      prefixClass: prefixClass as IndefiniteNumeralPrefixClass
    })));
    return this.indefiniteNumeralPrefixMetadata;
  }

  get ZERO_QUANTITY_NUMERALS(): ReadonlySet<string> {
    return this.tableValues("zero_quantity_numerals");
  }

  get QUANTITY_APPROXIMATION_MARKERS(): ReadonlyMap<string, QuantityApproximationMarker> {
    this.quantityApproximationMarkers ??= new Map(
      Object.entries(this.data.quantity_approximation_markers ?? {})
        .flatMap(([surface, row]) => {
          if (row === undefined || Array.isArray(row)) {
            return [];
          }
          const { kind, korean } = row as QuantityApproximationRow;
          if ((kind !== "slightly_over" && kind !== "slightly_under") || korean === undefined) {
            return [];
          }
          return [[surface, { surface, kind, korean }] as const];
        })
    );
    return this.quantityApproximationMarkers;
  }

  extentLookupSet(name: string): ReadonlySet<string> | undefined {
    switch (name) {
      case "extent_numeric_duration_counters":
        return this.EXTENT_NUMERIC_DURATION_COUNTERS;
      case "extent_numeric_person_counters":
        return this.EXTENT_NUMERIC_PERSON_COUNTERS;
      case "extent_numeric_repetition_counters":
        return this.EXTENT_NUMERIC_REPETITION_COUNTERS;
      case "extent_scalar_amount":
        return this.EXTENT_SCALAR_AMOUNT;
      default:
        return undefined;
    }
  }

  hasExtentLookupSet(name: string): boolean {
    return EXTENT_LOOKUP_SET_NAMES.has(name);
  }
}

export const EXTENT_LOOKUP_SET_NAMES = new Set([
  "extent_numeric_duration_counters",
  "extent_numeric_person_counters",
  "extent_numeric_repetition_counters",
  "extent_scalar_amount"
]);

export function formatCategoryMemberSurface(
  number: number,
  counterKey: string,
  options: {
    readonly ordinal?: boolean;
    readonly positional?: boolean;
    readonly arabicSurface?: NumeralSurfaceRealization | null;
  } = {}
): string | undefined {
  const counterOptions = {
    forceArabic: options.positional === true,
    arabicSurface: options.arabicSurface ?? null
  };
  if (options.ordinal === true && counterKey === "つ") {
    return ORDINAL_TSU.render(number, counterKey, counterOptions)?.[0];
  }
  if (counterKey === "つ" && number === 1) {
    return "하나";
  }
  if (counterKey === "名") {
    return formatCounterPhrase(number, "人", counterOptions);
  }
  return formatCounterPhrase(number, counterKey, counterOptions);
}
