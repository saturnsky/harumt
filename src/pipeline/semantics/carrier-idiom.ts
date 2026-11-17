import type { IrregularType } from "../../generator/conjugator.js";
import { selectedSpanTranslation } from "../commitment/span-evidence.js";
import type { CommitmentSpan } from "../commitment/types.js";

export interface CarrierIdiomEntry {
  readonly particle: string;
  readonly verb: string;
  readonly koreanCarrier: string;
  readonly irregular?: IrregularType | null;
}

export function lookupCarrierIdiom(
  nounSpan: CommitmentSpan | null | undefined,
  particleSurface: "を",
  predicateDictForm: string
): CarrierIdiomEntry | null {
  if (nounSpan === null || nounSpan === undefined) {
    return null;
  }
  const construction = selectedSpanTranslation(nounSpan)?.constructions?.find((candidate) =>
    candidate.type === "carrier_idiom" &&
    candidate.particle === particleSurface &&
    candidate.verb === predicateDictForm
  );
  if (construction === undefined) {
    return null;
  }
  return {
    particle: construction.particle,
    verb: construction.verb,
    koreanCarrier: construction.koreanCarrier,
    ...(construction.irregular === undefined ? {} : { irregular: construction.irregular })
  };
}
