import type { PatternDictionary } from "../../dictionary/pattern.js";
import type { MorphemeEntry } from "../../types/dictionary.js";
import type { RuleResult } from "../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import type { NumericTables } from "../../generator/numeric-lookup.js";
import type { ContentCtx, ContentTerminalCtx } from "../content-types.js";

export type TailRule = (
  resolver: TailResolver,
  ctx: ContentCtx,
  isPotential: boolean,
  lookups: LookupTables
) => RuleResult | null | Promise<RuleResult | null>;

export type TailTerminalRule = (
  resolver: TailResolver,
  ctx: ContentTerminalCtx,
  isPotential: boolean,
  lookups: LookupTables
) => RuleResult | null | Promise<RuleResult | null>;

export interface TailResolver {
  readonly numeric: NumericTables;
  readonly dictionary?: {
    lookupTokenRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined>;
  };
  readonly patterns?: PatternDictionary;
  readonly _patterns?: PatternDictionary;
  readonly _sahenInfo?: (tokens: readonly RuntimeHaruToken[], start: number) => readonly [isSahen: boolean, sahenNoun: string | null] | Promise<readonly [isSahen: boolean, sahenNoun: string | null]>;
}
