import type { LookupTables } from "../lookup-tables.js";
import { QUOTED_REPORTING_ADVERSATIVE_SURFACES } from "../quote/reporting-passive.js";
import {
  nominalizerAdversativeConnectiveRelationAt,
  predicateNominalizerRelationForToken
} from "../head-tail/boundary/marker.js";
import { TokenCursor } from "../token-cursor.js";

import { POS0, 助詞, 名詞, 助詞_接続助詞, POS01 } from "../../types/pos.js";
export interface ConnectiveToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly reading?: string;
  readonly pos: number;
}

export function matchFollowingConnective(
  cursor: TokenCursor<ConnectiveToken>,
  lookups: LookupTables,
  options: { readonly includeWakeTailMarkers?: boolean } = {}
): string | null {
  if (options.includeWakeTailMarkers === true) {
    if (
      cursor.pos + 1 < cursor.end &&
      predicateNominalizerRelationForToken(cursor.current(), cursor.pos, {
        requirement: "tail_connective_marker",
        consumers: ["connective_helpers"]
      })?.nominalizerKind === "no" &&
      cursor.peek(1)?.surface === "が" &&
      ((cursor.peek(1)?.pos ?? 0) & POS0) === 助詞
    ) {
      cursor.advance(2);
      return "nominal_ga";
    }
    if (
      cursor.pos + 1 < cursor.end &&
      nominalizerAdversativeConnectiveRelationAt(cursor.tokens, cursor.pos, {
        consumers: ["connective_helpers"]
      }) !== null
    ) {
      cursor.advance(2);
      return "는데";
    }
    if (
      cursor.currentIs((token) =>
        (token.pos & POS0) === 名詞 &&
        (token.surface === "ため" || token.surface === "為" || token.reading === "タメ")
      )
    ) {
      cursor.advance();
      return "기 때문에";
    }
  }
  if (
    cursor.currentIs((token) =>
      (token.pos & POS01) === 助詞_接続助詞
    )
  ) {
    const ending = lookups.DEARU_CONN_ENDINGS.get(cursor.current()?.surface ?? "");
    if (ending !== undefined) {
      cursor.advance();
      return ending;
    }
  }
  return null;
}

export function matchFollowingAdversativeConnective(
  cursor: TokenCursor<ConnectiveToken>
): string | null {
  const token = cursor.current();
  if (
    token === undefined ||
    (token.pos & POS01) !== 助詞_接続助詞 ||
    !QUOTED_REPORTING_ADVERSATIVE_SURFACES.has(token.surface)
  ) {
    return null;
  }

  let consumed = 1;
  if (
    (token.surface === "けど" || token.surface === "けれど") &&
    cursor.peek(1)?.surface === "も" &&
    ((cursor.peek(1)?.pos ?? 0) & POS0) === 助詞
  ) {
    consumed = 2;
  }
  cursor.advance(consumed);
  return "지만";
}
