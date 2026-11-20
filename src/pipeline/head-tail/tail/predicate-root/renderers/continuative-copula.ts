import type { LookupTables } from "../../../../lookup-tables.js";
import { POS0, POS4, 助動詞, 助動詞_ダ } from "../../../../../types/pos.js";
import type { AuxLayerNode, StemNode, TailRoot } from "../grammar.js";
import { stemSupportsProjectionCategory } from "../inspect.js";
import { isTerminalSkipSfpSurface } from "../../../../semantics/sfp-surface.js";

export function copulaContinuativeExplanatoryClosureApplies(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  lookups: LookupTables
): boolean {
  if (!isCopulaContinuativeExplanatoryLayer(layer)) {
    return false;
  }
  if (copulaContinuativeObliqueHostKind(layer, lookups) !== null) {
    return false;
  }
  return (
    sfp.effect === "ne" ||
    sfp.effect === "na_excl" ||
    (sfp.effect === null && isTerminalSkipSfpSurface(sfp.surface))
  );
}

type CopulaContinuativeObliqueHostKind = "place" | "instrument" | "temporal";

export function copulaContinuativeObliqueRecoveryApplies(
  layer: AuxLayerNode,
  sfp: Exclude<TailRoot["sfp"], null>,
  lookups: LookupTables
): boolean {
  return (
    sfp.effect === "ne" ||
    sfp.effect === "na_excl" ||
    (sfp.effect === null && isTerminalSkipSfpSurface(sfp.surface))
  ) &&
    layer.stem.kind === "noun" &&
    copulaContinuativeObliqueHostKind(layer, lookups) !== null;
}

export function copulaContinuativeObliqueHostKind(
  layer: AuxLayerNode,
  lookups: LookupTables
): CopulaContinuativeObliqueHostKind | null {
  if (!isCopulaContinuativeExplanatoryLayer(layer)) {
    return null;
  }
  const hostNounForm = continuativeExplanatoryHostNounForm(layer.stem);
  if (
    hostNounForm === undefined ||
    lookups.COPULA_DE_PREDICATE_EXTRA_HOST_NOUNS.has(hostNounForm)
  ) {
    return null;
  }
  if (lookups.PLACE_NOUNS.has(hostNounForm)) {
    return "place";
  }
  if (lookups.INSTRUMENT_NOUNS.has(hostNounForm)) {
    return "instrument";
  }
  if (lookups.AFTER_DE_TEMPORAL_HEADS.has(hostNounForm)) {
    return "temporal";
  }
  return null;
}

function continuativeExplanatoryHostNounForm(stem: StemNode): string | undefined {
  if (!stemSupportsProjectionCategory(stem, "nominal")) {
    return undefined;
  }
  return stem.source.tokens[stem.semanticAnchors[0] ?? 0]?.dictionaryForm;
}

function isCopulaContinuativeExplanatoryLayer(layer: AuxLayerNode): boolean {
  if (layer.terminal !== "renyou_chuushi") {
    return false;
  }
  if (
    layer.stem.kind !== "noun" &&
    layer.stem.kind !== "adj" &&
    layer.stem.kind !== "verb" &&
    layer.stem.kind !== "candidateSet"
  ) {
    return false;
  }
  const payload = layer.terminalPayload;
  const markerTokens = payload?.kind === "renyouChuushi" ? payload.source.tokens : [];
  return markerTokens.some((token) =>
    token.surface === "で" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)
  );
}
