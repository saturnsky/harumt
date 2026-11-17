import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { PostverbAuxiliaryKind, PostverbAuxiliaryPayload } from "./grammar.js";
import { postverbAuxiliaryPayloadsForForm } from "./postverb-auxiliary-table.js";
export {
  postverbAuxiliaryDeclaresHostAttachForm,
  postverbAuxiliaryPayloadForForm,
  postverbAuxiliaryPayloadsForForm
} from "./postverb-auxiliary-table.js";

import type { BoundaryToken } from "../../boundary/punctuation.js";
import { POS0, POS01, POS5A, 意志推量形_, 仮定形_, 終止形_, 接尾辞_動詞的, 動詞, 助動詞, 未然形_, 連体形_, 連用形_, 助詞_接続助詞 } from "../../../../types/pos.js";

export function isTeAuxActivationAccepted(
  token: BoundaryToken,
  next?: BoundaryToken
): boolean {
  const pos5a = token.pos & POS5A;
  return pos5a === 終止形_ ||
    pos5a === 連用形_ ||
    pos5a === 連体形_ ||
    pos5a === 未然形_ ||
    (pos5a === 仮定形_ && isConditionalBaFollower(next));
}

export function isTeBenefactiveActivationAccepted(
  token: RuntimeHaruToken,
  next?: RuntimeHaruToken
): boolean {
  return isTeAuxActivationAccepted(token, next) || (token.pos & POS5A) === 意志推量形_;
}

export function isPostverbAuxiliaryActivationAccepted(
  token: RuntimeHaruToken,
  next?: RuntimeHaruToken
): boolean {
  return isTeAuxActivationAccepted(token, next) || (token.pos & POS5A) === 意志推量形_;
}

export function isPostverbAuxiliaryToken(token: RuntimeHaruToken): boolean {
  return isVerbalPostverbAuxiliaryToken(token) ||
    postverbAuxiliaryPayloadsForForm(token.dictionaryForm).some((auxiliary) =>
      postverbAuxiliarySourceTokenClassMatches(auxiliary, token)
    );
}

export function postverbAuxiliarySourceTokenClassMatches(
  auxiliary: PostverbAuxiliaryPayload,
  token: RuntimeHaruToken
): boolean {
  return auxiliary.sourceTokenClass === "auxiliary_verb"
    ? (token.pos & POS0) === 助動詞
    : isVerbalPostverbAuxiliaryToken(token);
}

function isVerbalPostverbAuxiliaryToken(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 動詞 ||
    (token.pos & POS01) === 接尾辞_動詞的;
}

export function isStateChangePostverbAuxiliaryKind(kind: PostverbAuxiliaryKind): boolean {
  return kind === "state_change" || kind === "state_change_potential";
}

function isConditionalBaFollower(token: BoundaryToken | undefined): token is BoundaryToken {
  return token !== undefined && token.surface === "ば" && (token.pos & POS01) === 助詞_接続助詞;
}
