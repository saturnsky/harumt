import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  POS01,
  POS4,
  POS5A,
  isVerbPredicateToken,
  isVerbRenyouPredicateToken,
  isVolitionalInflection,
  助動詞_ジャ,
  助動詞_タ,
  助動詞_ダ,
  助動詞_デス,
  接尾辞_名詞的,
  連用形_
} from "../../../../../types/pos.js";
import { caseParticleMarkerRelationForToken, topicFocusMarkerRelationForToken } from "../../../boundary/marker.js";
import { matchNegationEnding } from "./negation-ending.js";

export function matchNegativeExistentialEndingWithPast(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly polite: boolean; readonly past: boolean; readonly consumed: number } | null {
  const negEnd = matchNegationEnding(tokens, pos, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  let consumed = negEnd.consumed;
  const next = tokens[pos + consumed];
  if (next !== undefined && (next.pos & POS4) === 助動詞_タ) {
    consumed += 1;
    return { polite: negEnd.polite, past: true, consumed };
  }
  const desu = next;
  const ta = tokens[pos + consumed + 1];
  let past = false;
  if (
    desu?.dictionaryForm === "です" &&
    (desu.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_) &&
    ta !== undefined &&
    (ta.pos & POS4) === 助動詞_タ
  ) {
    past = true;
    consumed += 2;
  }
  return { polite: negEnd.polite, past, consumed };
}

export interface MethodYouIdiomShape {
  readonly surface: "you" | "sama";
  readonly particleKind: "ga" | "mo";
  readonly polite: boolean;
  readonly past: boolean;
  readonly consumed: number;
}

export function methodYouGaNaiIdiomShapeAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): MethodYouIdiomShape | null {
  const you = tokens[pos];
  if (
    you === undefined ||
    (you.pos & POS01) !== 接尾辞_名詞的 ||
    (you.surface !== "よう" && you.surface !== "様")
  ) {
    return null;
  }
  const particleKind = methodYouFocusSlotKindAt(tokens, pos + 1);
  if (particleKind === null) {
    return null;
  }
  const negEnd = matchNegativeExistentialEndingWithPast(tokens, pos + 2);
  if (negEnd === null) {
    return null;
  }
  return {
    surface: you.surface === "様" ? "sama" : "you",
    particleKind,
    polite: negEnd.polite,
    past: negEnd.past,
    consumed: 2 + negEnd.consumed
  };
}

export function fusedVolitionalMethodYouIdiomShapeAt(
  tokens: readonly RuntimeHaruToken[],
  particlePos: number
): MethodYouIdiomShape | null {
  const host = tokens[particlePos - 1];
  if (
    host === undefined ||
    !isVerbPredicateToken(host) ||
    !isVolitionalInflection(host.pos)
  ) {
    return null;
  }
  const particleKind = methodYouFocusSlotKindAt(tokens, particlePos);
  if (particleKind !== "mo") {
    return null;
  }
  const negEnd = matchNegativeExistentialEndingWithPast(tokens, particlePos + 1);
  if (negEnd === null || isCopulaRenyouShellStart(tokens[particlePos + 1 + negEnd.consumed])) {
    return null;
  }
  return {
    surface: "you",
    particleKind,
    polite: negEnd.polite,
    past: negEnd.past,
    consumed: 1 + negEnd.consumed
  };
}

function isCopulaRenyouShellStart(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return (pos4 === 助動詞_ダ || pos4 === 助動詞_ジャ) && (token.pos & POS5A) === 連用形_;
}

export function methodYouIdiomHostIsVerbalRenyouAt(
  tokens: readonly RuntimeHaruToken[],
  youIdx: number
): boolean {
  const host = tokens[youIdx - 1];
  return host !== undefined && isVerbRenyouPredicateToken(host);
}

function methodYouFocusSlotKindAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): MethodYouIdiomShape["particleKind"] | null {
  const particle = tokens[pos];
  if (particle === undefined) {
    return null;
  }
  if (
    caseParticleMarkerRelationForToken(particle, pos, {
      acceptedSurfaces: ["が"],
      consumers: ["tail_multi_clause"]
    }) !== null
  ) {
    return "ga";
  }
  return topicFocusMarkerRelationForToken(particle, pos, {
    acceptedSurfaces: ["も"],
    consumers: ["tail_multi_clause"]
  }) !== null
    ? "mo"
    : null;
}
