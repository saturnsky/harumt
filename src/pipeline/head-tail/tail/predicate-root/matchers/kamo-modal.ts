import type { RuntimeHaruToken } from "../../../../../types/token.js";
import {
  POS0,
  POS01,
  POS1,
  POS4,
  POS5A,
  助詞_終助詞,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_マス,
  係助詞,
  動詞,
  副助詞,
  未然形_,
  終止形_,
  連体形_,
  連用形_
} from "../../../../../types/pos.js";
import { kaMarkerRelationAt } from "../../../boundary/marker.js";
import { isBoundaryPunctuationCategoryToken, isOpeningPunctuationToken } from "../../../boundary/punctuation.js";
import { TokenCursor } from "../../../../token-cursor.js";

export interface BareKamoAdmissionContext {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly kaIndex: number;
  readonly clauseContainsInterrogative: boolean;
  readonly clauseContainsPredicateChoiceKa: boolean;
}

export function isKamoShirenaiModalStartAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  bareContext?: BareKamoAdmissionContext
): boolean {
  return cursor.lookahead(0, c => matchKamoShirenaiSequence(c, bareContext)) !== null;
}

export function isKamoShirenaiModalStartAtToken(
  tokens: readonly RuntimeHaruToken[],
  idx: number,
  bareContext?: BareKamoAdmissionContext
): boolean {
  if (tokens[idx] === undefined || kaMarkerRelationAt(tokens, idx, ["tail_multi_clause"])?.particleSubtype1 !== 副助詞) return false;
  const t1 = tokens[idx + 1];
  const t2 = tokens[idx + 2];
  if (t1?.surface !== "も" || (t1.pos & POS1) !== 係助詞) return false;
  if (t2 === undefined || !isKamoShirenaiLemma(t2) || (t2.pos & POS0) !== 動詞) {
    return bareKamoModalAdmitted(tokens, idx, bareContext);
  }

  const t2pos5A = t2.pos & POS5A;
  if (t2pos5A === 未然形_) {
    const t3 = tokens[idx + 3];
    if (t3 !== undefined && t3.dictionaryForm === "ない" && (t3.pos & POS4) === 助動詞_ナイ) {
      const t3pos5A = t3.pos & POS5A;
      return t3pos5A === 終止形_ || t3pos5A === 連用形_ || t3pos5A === 連体形_;
    }
    if (t3 !== undefined && t3.surface === "ん" && (t3.pos & POS4) === 助動詞_ヌ) {
      return true;
    }
  }
  if (t2pos5A === 連用形_) {
    const t3 = tokens[idx + 3];
    const t4 = tokens[idx + 4];
    return t3 !== undefined &&
      (t3.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_) &&
      t4 !== undefined && (t4.pos & POS4) === 助動詞_ヌ;
  }
  return bareKamoModalAdmitted(tokens, idx, bareContext);
}

export interface KamoModalMatch {
  readonly polite: boolean;
  readonly bare: boolean;
}

export function matchKamoShirenaiSequence(
  cursor: TokenCursor<RuntimeHaruToken>,
  bareContext?: BareKamoAdmissionContext
): KamoModalMatch | null {
  if (cursor.current() === undefined || kaMarkerRelationAt(cursor.tokens, cursor.pos, ["tail_multi_clause"])?.particleSubtype1 !== 副助詞) return null;
  const t1 = cursor.peek(1);
  const t2 = cursor.peek(2);
  if (t1?.surface !== "も" || (t1.pos & POS1) !== 係助詞) return null;
  const bare = (): KamoModalMatch | null => {
    if (cursor.pos + 2 > cursor.end || !bareKamoModalAdmitted(cursor.tokens, cursor.pos, bareContext)) {
      return null;
    }
    cursor.advance(2);
    return { polite: false, bare: true };
  };
  if (t2 === undefined || !isKamoShirenaiLemma(t2) || (t2.pos & POS0) !== 動詞) {
    return bare();
  }

  const t2pos5A = t2.pos & POS5A;
  if (t2pos5A === 未然形_) {
    const t3 = cursor.peek(3);
    if (t3 !== undefined && t3.dictionaryForm === "ない" && (t3.pos & POS4) === 助動詞_ナイ) {
      const t3pos5A = t3.pos & POS5A;
      if (t3pos5A === 終止形_ || t3pos5A === 連用形_ || t3pos5A === 連体形_) {
        cursor.advance(4);
        return { polite: false, bare: false };
      }
    }
    if (t3 !== undefined && t3.surface === "ん" && (t3.pos & POS4) === 助動詞_ヌ) {
      cursor.advance(4);
      return { polite: false, bare: false };
    }
  }
  if (t2pos5A === 連用形_) {
    const t3 = cursor.peek(3);
    const t4 = cursor.peek(4);
    if (
      t3 !== undefined &&
      (t3.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_) &&
      t4 !== undefined && (t4.pos & POS4) === 助動詞_ヌ
    ) {
      cursor.advance(5);
      return { polite: true, bare: false };
    }
  }
  return bare();
}

function bareKamoModalAdmitted(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number,
  bareContext: BareKamoAdmissionContext | undefined
): boolean {
  if (bareContext === undefined) {
    return false;
  }
  if (bareContext.clauseContainsInterrogative || bareContext.clauseContainsPredicateChoiceKa) {
    return false;
  }
  if (!bareKamoHostPrecedesKa(bareContext.tokens, bareContext.kaIndex)) {
    return false;
  }
  return utteranceClosesAfterBareKamo(tokens, kaIdx + 2);
}

function bareKamoHostPrecedesKa(
  tokens: readonly RuntimeHaruToken[],
  kaIdx: number
): boolean {
  const hostIdx = previousSubstantiveIndex(tokens, kaIdx);
  const host = hostIdx === null ? undefined : tokens[hostIdx];
  return host !== undefined && !isOpeningPunctuationToken(host);
}

function previousSubstantiveIndex(
  tokens: readonly RuntimeHaruToken[],
  index: number
): number | null {
  return index - 1 >= 0 && tokens[index - 1] !== undefined ? index - 1 : null;
}

function utteranceClosesAfterBareKamo(
  tokens: readonly RuntimeHaruToken[],
  idx: number
): boolean {
  for (let i = idx; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      return true;
    }
    return (token.pos & POS01) === 助詞_終助詞 || isBoundaryPunctuationCategoryToken(token);
  }
  return true;
}

export function isKamoShirenaiLemma(token: RuntimeHaruToken): boolean {
  const lemma = token.dictionaryForm || token.surface;
  return lemma === "しれる" || lemma === "知れる" || lemma === "知る";
}
