
import { isTeConnectiveToken } from "../head-tail/tail/postverb-tail-classifier.js";
import { TokenCursor } from "../token-cursor.js";
import { activeProtoLayout } from "../clause-layout/proto-state.js";
import { enumerateClausePhrasesBefore, type ClausePhraseItem } from "../clause-layout/phrase-enumeration.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";

import { POS0, POS1, POS5, 助動詞, 動詞, 格助詞 } from "../../types/pos.js";
export interface TeIruToken {
  surface: string;
  dictionaryForm: string;
  pos: number;
  reading?: string;
  dictionaryFormReading?: string;
  dictionaryId?: number;
}

export function collapseTeIruAuxTokens(auxTokens: readonly TeIruToken[]): readonly TeIruToken[] {
  if (auxTokens.length >= 2) {
    const teTok = auxTokens[auxTokens.length - 2];
    const iruTok = auxTokens[auxTokens.length - 1];
    if (
      teTok !== undefined &&
      iruTok !== undefined &&
      isTeConnectiveToken(teTok) &&
      (iruTok.pos & POS0) === 動詞 &&
      ["いる", "おる"].includes(iruTok.dictionaryForm)
    ) {
      return [
        ...auxTokens.slice(0, -2),
        {
          surface: teTok.surface + iruTok.surface,
          dictionaryForm: "てる",
          pos: 助動詞 | (iruTok.pos & POS5)
        }
      ];
    }
  }
  const onlyAux = auxTokens[0];
  if (auxTokens.length === 1 && onlyAux?.dictionaryForm === "でる") {
    return [{ ...onlyAux, dictionaryForm: "てる" }];
  }
  return auxTokens;
}

export function matchSimpleTeIru(
  cursor: TokenCursor<TeIruToken>
): readonly TeIruToken[] | undefined {
  const tokens = cursor.tokens;
  const pos = cursor.pos;
  const n = cursor.end;
  if (pos < n) {
    const teru = tokens[pos];
    if (
      teru !== undefined &&
      (teru.pos & POS0) === 助動詞 &&
      (["てる", "でる"].includes(teru.dictionaryForm) || ["てる", "でる"].includes(teru.surface))
    ) {
      const collapsed = collapseTeIruAuxTokens([teru]);
      cursor.advance();
      return [collapsed[0] ?? teru];
    }
  }

  if (pos + 1 >= n) {
    return undefined;
  }
  const teTok = tokens[pos];
  const auxTok = tokens[pos + 1];
  if (
    teTok === undefined ||
    auxTok === undefined ||
    !isTeConnectiveToken(teTok) ||
    (auxTok.pos & POS0) !== 動詞 ||
    !["いる", "おる"].includes(auxTok.dictionaryForm)
  ) {
    return undefined;
  }
  cursor.advance(2);
  return [teTok, auxTok];
}

function phraseSurface(tokens: readonly RuntimeHaruToken[], item: ClausePhraseItem): string {
  return tokens.slice(item.span.start, item.span.endExclusive).map((token) => token.surface).join("");
}

export function teIruProgressiveChangeEvidence(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly predicateTokenIdx: number;
  readonly hostDictForm: string;
  readonly stemResultComplement: string | null;
  readonly lookups: LookupTables;
}): boolean {
  const { tokens, predicateTokenIdx, lookups } = options;
  const gradualAdverbs = lookups.TE_IRU_GRADUAL_CHANGE_ADVERBS;
  const complementNouns = lookups.TE_IRU_PROGRESSIVE_RESULT_COMPLEMENT_NOUNS;
  const takesResultComplement = lookups.TE_IRU_RESULT_COMPLEMENT_HOSTS.has(options.hostDictForm);
  if (takesResultComplement && options.stemResultComplement !== null && complementNouns.has(options.stemResultComplement)) {
    return true;
  }
  let nearer: ClausePhraseItem | null = null;
  for (const item of enumerateClausePhrasesBefore(activeProtoLayout(), tokens, predicateTokenIdx, { scope: "clause" })) {
    const head = tokens[item.headIdx];
    if (head === undefined) {
      nearer = item;
      continue;
    }
    if (
      takesResultComplement &&
      options.stemResultComplement === null &&
      nearer === null &&
      item.kind === "nominal" &&
      item.span.endExclusive === predicateTokenIdx &&
      item.markerParticleIdx !== null &&
      isResultComplementMarker(tokens[item.markerParticleIdx]) &&
      complementNouns.has(head.dictionaryForm || head.surface)
    ) {
      return true;
    }
    const surface = phraseSurface(tokens, item);
    if (
      gradualAdverbs.has(head.dictionaryForm || head.surface) ||
      gradualAdverbs.has(surface) ||
      (nearer !== null && gradualAdverbs.has(`${surface}${phraseSurface(tokens, nearer)}`))
    ) {
      return true;
    }
    nearer = item;
  }
  return false;
}

function isResultComplementMarker(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.surface === "に" || token.surface === "と") && (token.pos & POS1) === 格助詞;
}
