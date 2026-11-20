import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { matchTeConnectiveHeadAt, teDeContinuationRelationAt } from "../../postverb-tail-classifier.js";
import type { AuxOpNode, StemNode } from "../grammar.js";
import { POS01, POS5A, 動詞_非自立可能, 連用形_, 形状詞_助動詞語幹 } from "../../../../../types/pos.js";


export interface TeConnectiveHead {
  readonly consumed: number;
  readonly focusParticle?: "は" | "も";
}

export function teFamilyContinuationHostAdmitted(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): boolean {
  return teDeContinuationRelationAt(tokens, pos, {
    consumers: ["tail_boundary_readiness"],
    lookups
  }) !== null;
}

export function matchTeConnectiveHead(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): TeConnectiveHead | null {
  const head = matchTeConnectiveHeadAt(tokens, pos);
  if (head === null) {
    return null;
  }
  return head.focusParticle === undefined
    ? { consumed: head.consumed }
    : { consumed: head.consumed, focusParticle: head.focusParticle };
}

export function isSplitTeIruVolitionalStemAt(tokens: readonly RuntimeHaruToken[], youPos: number): boolean {
  const iru = tokens[youPos - 1];
  const you = tokens[youPos];
  if (
    iru === undefined ||
    you === undefined ||
    (iru.pos & (POS01 | POS5A)) !== (動詞_非自立可能 | 連用形_)
  ) {
    return false;
  }
  const form = iru.dictionaryForm || iru.surface;
  if (form !== "いる" && form !== "居る" && form !== "おる") {
    return false;
  }
  return you.surface === "よう" &&
    (you.pos & POS01) === 形状詞_助動詞語幹;
}

export function stemSourceCannotHostDirectionalIku(
  stem: StemNode,
  precedingOps: readonly AuxOpNode[]
): boolean {
  switch (stem.sourcePredicateShape) {
    case "na_adjective":
    case "nominal":
    case "particle_phrase":
      {
        const previous = precedingOps.at(-1);
        return previous?.kind === "copula" &&
          previous.variant === "basic" &&
          previous.polarity === "affirmative";
      }
    case "i_adjective":
    case "verb":
    case "sahen_verbalization":
    case "lexical_adverb":
    case undefined:
      return false;
  }
  return false;
}
