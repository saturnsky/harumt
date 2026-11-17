import type { MorphemeDerivation, MorphemeSense } from "../types/dictionary.js";

export const LEXICAL_DERIVATION_ID = "lexical";

export type KnownDerivationId =
  | typeof LEXICAL_DERIVATION_ID
  | "potential"
  | "passive"
  | "honorific";

export interface ResolvedDerivation {
  readonly id: string;
  readonly baseForm?: string;
  readonly baseReading?: string;
}

export interface DerivationEntryLike {
  readonly derivations?: readonly MorphemeDerivation[] | undefined;
  readonly derivation?: MorphemeDerivation | null | undefined;
  readonly dictionaryForm?: string | undefined;
  readonly surface?: string | undefined;
  readonly reading?: string | undefined;
  readonly baseForm?: string | undefined;
  readonly baseReading?: string | undefined;
  readonly pos?: number | undefined;
  readonly syntheticReason?: string | undefined;
}

export function normalizeDerivationId(value: string | null | undefined): string {
  return value === undefined || value === null || value.length === 0
    ? LEXICAL_DERIVATION_ID
    : value;
}

export function derivationId(value: Pick<MorphemeDerivation, "id" | "type"> | null | undefined): string {
  return normalizeDerivationId(value?.id ?? value?.type);
}

export function entryDerivations(entry: DerivationEntryLike | null | undefined): readonly ResolvedDerivation[] {
  const derivations = entry?.derivations;
  if (derivations !== undefined && derivations.length > 0) {
    return derivations.map((derivation) => ({
      id: derivationId(derivation),
      ...(derivation.baseForm === undefined ? {} : { baseForm: derivation.baseForm }),
      ...(derivation.baseReading === undefined ? {} : { baseReading: derivation.baseReading })
    }));
  }
  const legacy = entry?.derivation;
  if (legacy !== undefined && legacy !== null) {
    return [{
      id: derivationId(legacy),
      ...(legacy.baseForm === undefined ? {} : { baseForm: legacy.baseForm }),
      ...(legacy.baseReading === undefined ? {} : { baseReading: legacy.baseReading })
    }];
  }
  return [{ id: LEXICAL_DERIVATION_ID }];
}

export function senseDerivationId(
  sense: Pick<MorphemeSense, "derivation"> | null | undefined,
  entry: DerivationEntryLike | null | undefined
): string {
  if (sense?.derivation !== undefined && sense.derivation.length > 0) {
    return sense.derivation;
  }
  const derivations = entryDerivations(entry);
  return derivations.length === 1 ? derivations[0]!.id : LEXICAL_DERIVATION_ID;
}

export function derivationForSense(
  sense: Pick<MorphemeSense, "derivation" | "entryId"> | null | undefined,
  entry: DerivationEntryLike | null | undefined
): ResolvedDerivation {
  const id = senseDerivationId(sense, entry);
  if (id === LEXICAL_DERIVATION_ID && sense?.entryId === undefined) {
    const runtimeId = runtimeEntryDerivationId(entry);
    if (runtimeId !== null) {
      return { id: runtimeId };
    }
  }
  return entryDerivations(entry).find((derivation) => derivation.id === id) ?? { id };
}

function runtimeEntryDerivationId(entry: DerivationEntryLike | null | undefined): string | null {
  if (entry === null || entry === undefined) {
    return null;
  }
  const form = entry.dictionaryForm ?? entry.surface ?? entry.baseForm;
  const reading = entry.reading ?? entry.baseReading ?? null;
  if (form === undefined && reading === null && entry.pos === undefined && entry.syntheticReason === undefined) {
    return null;
  }
  return `runtime_entry:${JSON.stringify([
    form ?? null,
    reading,
    entry.pos ?? null,
    entry.syntheticReason ?? null
  ])}`;
}

export function derivationOrder(
  entry: DerivationEntryLike | null | undefined,
  id: string
): number {
  const index = entryDerivations(entry).findIndex((derivation) => derivation.id === id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
