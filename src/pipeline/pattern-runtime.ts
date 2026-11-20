
import { asIrregular, type IrregularType } from "../generator/conjugator.js";
import type { MorphemeEntry } from "../types/dictionary.js";
import { derivationForSense } from "../dictionary/derivation.js";
import type { RuntimeHaruToken } from "../types/token.js";
import type { LookupTables } from "./lookup-tables.js";
import { isTeConnectiveToken } from "./head-tail/tail/postverb-tail-classifier.js";
import { nextVerbDictForm } from "./semantics/helpers.js";
import { teConnectivePrefersAseo } from "./semantics/te-connective.js";
import { type MetadataEntry } from "./translation/metadata.js";
import { TokenCursor } from "./token-cursor.js";

import { 助動詞, 助動詞_タ, 助動詞_マス, 終止形_一般, 連用形_一般 } from "../types/pos.js";

export const POSTVERB_ASPECT_OPERATOR_KINDS = {
  "te_iru": "te_iru",
  "te_iru_de": "te_iru",
  "te_oru": "te_iru",
  "te_oru_de": "te_iru",
  "te_shimau": "te_shimau",
  "te_shimau_de": "te_shimau",
  "te_oku": "te_oku",
  "te_oku_de": "te_oku",
  "te_aru": "te_aru",
  "te_aru_de": "te_aru",
  "te_iku": "te_iku",
  "te_iku_de": "te_iku",
  "te_kuru": "te_kuru",
  "te_kuru_de": "te_kuru"
} as const;
export type PostverbAspectOperatorKind = typeof POSTVERB_ASPECT_OPERATOR_KINDS[keyof typeof POSTVERB_ASPECT_OPERATOR_KINDS];

export const POSTVERB_PERMISSION_PATTERN_IDS = new Set([
  "te_mo_ii",
  "te_mo_ii_de",
  "te_ii",
  "te_ii_de"
]);

const POSTVERB_TAILROOT_OWNED_PATTERN_IDS = new Set([
  ...POSTVERB_PERMISSION_PATTERN_IDS,
  "te_kudasai",
  "te_kudasai_de"
]);

export interface PatternRuntimeToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly dictionaryFormReading?: string;
  pos: number;
}

export interface PatternRuntimeEntry extends MetadataEntry {
  readonly dictionaryForm?: string;
  readonly derivation?: PatternDerivation | null;
}

export interface PatternDerivation {
  readonly id?: string;
  readonly type?: string;
}

export function postverbAspectOperatorKind(patternId: string): PostverbAspectOperatorKind | undefined {
  return Object.hasOwn(POSTVERB_ASPECT_OPERATOR_KINDS, patternId)
    ? POSTVERB_ASPECT_OPERATOR_KINDS[patternId as keyof typeof POSTVERB_ASPECT_OPERATOR_KINDS]
    : undefined;
}

export function postverbPatternRequiresTailRootOwnership(patternId: string | null | undefined): boolean {
  return patternId !== null &&
    patternId !== undefined &&
    (POSTVERB_TAILROOT_OWNED_PATTERN_IDS.has(patternId) || postverbAspectOperatorKind(patternId) !== undefined);
}

export function buildSyntheticAux(polite: boolean, past = false): RuntimeHaruToken[] {
  const aux: RuntimeHaruToken[] = [];
  if (polite) {
    aux.push({
      surface: "ます",
      dictionaryForm: "ます",
      reading: "マス",
      dictionaryFormReading: "マス",
      pos: 助動詞 | 助動詞_マス | 終止形_一般,
      dictionaryId: 0
    });
  }
  if (past) {
    aux.push({
      surface: "た",
      dictionaryForm: "た",
      reading: "タ",
      dictionaryFormReading: "タ",
      pos: 助動詞 | 助動詞_タ | 連用形_一般,
      dictionaryId: 0
    });
  }
  return aux;
}


export function isPotentialDerivation(entry: PatternRuntimeEntry | null | undefined): boolean {
  return derivationForSense(entry?.senses?.[0] ?? null, entry).id === "potential";
}


export function mergeDirectionVerb(
  koreanLemma: string,
  irregular: IrregularType | null | undefined,
  tailLemma: string | null | undefined
): readonly [lemma: string, irregular: IrregularType | null] | null {
  if (tailLemma !== "오다" && tailLemma !== "가다") {
    return null;
  }
  const opposite = tailLemma === "오다" ? "가다" : "오다";
  if (koreanLemma.endsWith(tailLemma)) {
    return [koreanLemma, asIrregular(irregular)];
  }
  if (koreanLemma.endsWith(opposite)) {
    return [`${koreanLemma.slice(0, -opposite.length)}${tailLemma}`, null];
  }
  return null;
}


export function adjustTeConnectiveEnding(
  cursor: TokenCursor<PatternRuntimeToken>,
  entry: Pick<MorphemeEntry, "dictionaryForm"> | null | undefined,
  ending: string,
  lookups: LookupTables
): string {
  if (ending !== "고" || entry === undefined || entry === null || cursor.pos >= cursor.end) {
    return ending;
  }
  const connector = cursor.current();
  if (!isTeConnectiveToken(connector)) {
    return ending;
  }
  const mainVerb = entry.dictionaryForm;
  if (mainVerb === undefined) {
    return ending;
  }
  const nextVerb = nextVerbDictForm(cursor);
  return teConnectivePrefersAseo(mainVerb, nextVerb, {}, lookups) ? "아/어서" : ending;
}
