import type { RuntimeHaruToken } from "../../../../types/token.js";
import type {
  AuxLayerNode,
  AuxOpNode,
  ConnectiveOp,
  OpSource,
  StemNode,
  TailRootBase,
  TeFormConnectiveRole
} from "./grammar.js";
import { stemSupportsAnyProjectionCategory, stemSupportsProjectionCategory } from "./inspect.js";

import { POS0, POS4, POS5A, isGeneralRenyouInflectedToken, 仮定形_, 助動詞, 助動詞_ダ, 連用形_ } from "../../../../types/pos.js";
import { createConnectiveOp } from "./op-builders.js";
export interface FragmentRecoveryOptions {
  readonly allowRenyouChuushiTerminal?: boolean;
  readonly allowMalformedConditionalFragmentTerminal?: boolean;
  readonly allowRenyouCompoundPrenominalTerminal?: boolean;
}

export function canOpenStemRenyouCompoundPrenominalTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  token: RuntimeHaruToken
): boolean {
  if (input.allowRenyouCompoundPrenominalTerminal !== true) return false;
  if (!isGeneralRenyouInflectedToken(token)) return false;
  return stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate"]);
}

export function canOpenOpsRenyouCompoundPrenominalTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  token: RuntimeHaruToken
): boolean {
  if (input.allowRenyouCompoundPrenominalTerminal !== true) return false;
  if (ops.length !== 1 || ops[0]?.kind !== "voice") return false;
  if (!isGeneralRenyouInflectedToken(token)) return false;
  return stemSupportsProjectionCategory(stem, "verbal_predicate");
}

export function canOpenStemRenyouChuushiTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  token: RuntimeHaruToken
): boolean {
  if (input.allowRenyouChuushiTerminal !== true) return false;
  if ((token.pos & POS5A) !== 連用形_) return false;
  return stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate"]);
}

export function canOpenRenyouChuushiTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  ops: readonly AuxOpNode[],
  op: AuxOpNode,
  token: RuntimeHaruToken
): boolean {
  if (input.allowRenyouChuushiTerminal !== true) return false;
  if ((token.pos & POS5A) !== 連用形_) return false;
  const stemIsNominalOnly =
    stemSupportsProjectionCategory(stem, "nominal") &&
    !stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate"]);
  const lastOpClosesNoun = op.kind === "copula" ||
    op.kind === "predicateQuoteCarrier" ||
    (op.kind === "scopeBridge" && op.head === null);
  const verbalizedReportingRenyou =
    (
      (op.kind === "modal" &&
        (op.modal === "wake" || (op.modal === "souda_hearsay" && op.reading === "hearsay"))) ||
      (op.kind === "scopeBridge" && op.head !== null)
    ) &&
    ops.some((chained) => chained.kind === "copula" || chained.kind === "predicateQuoteCarrier");
  if (stemIsNominalOnly && !lastOpClosesNoun && !verbalizedReportingRenyou) {
    return false;
  }
  return renyouChuushiTerminalClosesOp(op);
}

export function renyouChuushiTerminalClosesOp(op: AuxOpNode): boolean {
  switch (op.kind) {
    case "copula":
    case "negation":
    case "voice":
    case "aspect":
    case "desire":
    case "modal":
    case "postverbAuxiliary":
    case "predicateSuffix":
    case "predicateQuoteCarrier":
    case "scopeBridge":
      return true;
    case "idiom":
      return op.idiom === "obligation" ||
        op.idiom === "potential_koto_ga_dekiru" ||
        op.idiom === "inevitable_zaru_o_enai" ||
        op.idiom === "cannot_refrain_negative_dewa_irarenai" ||
        op.idiom === "method_you_ga_nai" ||
        op.idiom === "only_option_shika_nai" ||
        op.idiom === "degree_intensifier" ||
        op.idiom === "experience_koto_ga_aru" ||
        op.idiom === "decision_koto_ni_suru" ||
        op.idiom === "outcome_koto_ni_naru" ||
        op.idiom === "wake_impossible" ||
        op.idiom === "negative_necessity_made_mo" ||
        (op.idiom === "forbidden" && op.sourceAllomorph === "copular_dame");
    default:
      return false;
  }
}

export function canOpenMalformedConditionalFragmentTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  op: AuxOpNode,
  token: RuntimeHaruToken
): boolean {
  if (input.allowMalformedConditionalFragmentTerminal !== true) return false;
  if ((token.pos & POS5A) !== 仮定形_) return false;
  if (stemSupportsProjectionCategory(stem, "nominal")) {
    return false;
  }
  return op.kind === "negation";
}

export function canOpenStemMalformedConditionalFragmentTerminal(
  input: FragmentRecoveryOptions,
  stem: StemNode,
  token: RuntimeHaruToken
): boolean {
  if (input.allowMalformedConditionalFragmentTerminal !== true) return false;
  if ((token.pos & POS5A) !== 仮定形_) return false;
  return stemSupportsAnyProjectionCategory(stem, ["verbal_predicate", "adjectival_predicate"]);
}

export function missingConditionalMarkerConnective(source: OpSource): ConnectiveOp {
  return createConnectiveOp({

    connective: "conditional",
    surface: "ば",
    recovery: "missing_conditional_marker",
    conditionalFlavor: "plain",
    source
  });
}

export function renyouChuushiPayloadForOp(
  op: AuxOpNode,
  teFormRole?: TeFormConnectiveRole
): AuxLayerNode["terminalPayload"] {
  if (op.kind === "modal" && op.modal === "youda") {
    return renyouChuushiPayloadForSource(op.source, teFormRole ?? "reason");
  }
  if (
    op.kind === "modal" &&
    op.modal === "souda_hearsay" &&
    op.source.tokens.some((token) =>
      token.surface === "で" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)
    )
  ) {
    return renyouChuushiPayloadForSource(op.source, teFormRole ?? "reason");
  }
  if (
    op.kind === "modal" &&
    op.modal === "wake" &&
    op.variant === "explanatory" &&
    op.polarity === "affirmative" &&
    op.source.tokens.some((token) =>
      token.surface === "で" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ)
    )
  ) {
    return renyouChuushiPayloadForSource(op.source, teFormRole ?? "reason");
  }
  return renyouChuushiPayloadForSource(op.source, teFormRole);
}

export function renyouChuushiPayloadForSource(
  source: OpSource,
  teFormRole?: TeFormConnectiveRole
): AuxLayerNode["terminalPayload"] {
  return {
    kind: "renyouChuushi",
    ...(teFormRole === undefined ? {} : { teFormRole }),
    source
  };
}

export function tailRootHasRenyouChuushiTerminal(root: TailRootBase): boolean {
  return root.tail.kind === "auxLayer" && root.tail.terminal === "renyou_chuushi";
}

export function tailRootHasAdverbialModifierTerminal(root: TailRootBase): boolean {
  return root.tail.kind === "auxLayer" && root.tail.terminal === "adverbial_modifier";
}
