import type { SfpEffect } from "../head-tail/tail/predicate-root/grammar.js";

export function quoteProjectionForSfpEffect(
  effect: SfpEffect | null,
  imperative: boolean,
): "assertive" | "terminal_mood" | "prohibitive" {
  if (effect === "na_prohib") return "prohibitive";
  if (imperative) return "terminal_mood";
  if (effect === null) return "assertive";
  switch (effect) {
    case "na_excl":
    case "na_soft_imperative":
    case "kana":
    case "kke":
    case "volitional_resolve":
    case "ka":
    case "ka_ne":
    case "kai":
    case "kayo":
    case "realization":
    case "quotative_command":
      return "terminal_mood";
    case "ne":
    case "jan":
    case "yone_confirm":
    case "explanatory":
    case "speaker_assertion":
    case "plain_q":
    case "polite_q":
    case "neg_confirm_q":
    case "neg_invite_q":
    case "neg_plain_q":
    case "role_cat_nya":
    case "nante_excl":
    case "quotative_insistent":
    case "quotative_topic_excl":
      return "assertive";
    default: {
      const exhaustive: never = effect;
      return exhaustive;
    }
  }
}

export function quotedTerminalMoodComplementizer(
  moodText: string,
  form: "terminal" | "attributive" = "terminal",
): string {
  return `${moodText}${form === "attributive" ? "라는" : "라고"}`;
}
