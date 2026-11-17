import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS0, POS4, POS5A, 助詞, 助動詞 as 助動詞0, 助動詞_ダ, 助動詞_デス, 動詞, 連用形_ } from "../../../../../types/pos.js";
import {
  caseParticleMarkerRelationForToken,
  dewaScopeBridgeRelationAt
} from "../../../boundary/marker.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import {
  isAffirmativeCopulaSupportVerbToken,
  isAruVerbToken,
  isIntrinsicHonorificCopulaSupportVerbToken,
  isKotoNounToken,
  isLikenessModalAdnominalTailEnd,
  isMizenVoiceHonorificCopulaSupportVerbToken,
  isMonoReasonNounToken,
  isNaiOrNuToken,
  isTeSurfaceConnectiveToken
} from "../classifiers/tokens.js";
import { IU_LEXEME_FORMS } from "../../../data/quoted-reporting-sets.js";
import { MONO_REASON_COPULA_DE_FORMS } from "../../../data/semantic-helper-sets.js";

export interface BoundNominalReasonConnectiveMatch {
  readonly connective: "bound_nominal_reason";
  readonly surface: string;
  readonly consumed: number;
  readonly requiresClauseContinuation?: true;
  readonly formalNoun: BoundNominalReasonFormalNoun;
}

export type BoundNominalReasonFormalNoun = "mono" | "koto";

export interface BoundNominalListingConnectiveMatch {
  readonly connective: "bound_nominal_listing";
  readonly surface: string;
  readonly consumed: number;
}

function boundNominalReasonMatch(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  end: number,
  formalNoun: BoundNominalReasonFormalNoun,
  options: { readonly requiresClauseContinuation?: true } = {}
): BoundNominalReasonConnectiveMatch {
  const consumed = end - pos;
  return {
    connective: "bound_nominal_reason",
    surface: tokens.slice(pos, end).map((t) => t.surface).join(""),
    consumed,
    formalNoun,
    ...(options.requiresClauseContinuation === true
      ? { requiresClauseContinuation: true as const }
      : {})
  };
}

export function boundNominalReasonQuoteCarrierAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  const quoteMarker = quoteMarkerRelationAt(tokens, pos, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface === "って") {
    return true;
  }
  if (quoteMarker?.canonicalSurface !== "と") {
    return false;
  }
  const say = tokens[quoteMarker.span.endExclusive];
  return say !== undefined && (say.pos & POS0) === 動詞 && IU_LEXEME_FORMS.has(say.dictionaryForm);
}

export function boundNominalReasonQuoteCarrierStemAt(
  tokens: readonly RuntimeHaruToken[],
  stemIdx: number
): boolean {
  const stem = tokens[stemIdx];
  if (stem === undefined || (stem.pos & POS0) !== 動詞 || !IU_LEXEME_FORMS.has(stem.dictionaryForm)) {
    return false;
  }
  const marker = quoteMarkerRelationAt(tokens, stemIdx - 1, {
    consumers: ["tail_multi_clause"]
  });
  return marker?.canonicalSurface === "と" || marker?.canonicalSurface === "って";
}

function isMonoReasonCopulaRenyouDeAt(
  tokens: readonly RuntimeHaruToken[],
  deIdx: number
): boolean {
  const de = tokens[deIdx];
  if (
    de === undefined ||
    de.surface !== "で" ||
    (de.pos & POS0) !== 助動詞0 ||
    (de.pos & (POS4 | POS5A)) !== (助動詞_ダ | 連用形_)
  ) {
    return false;
  }
  const follower = tokens[deIdx + 1];
  if (follower === undefined) {
    return true;
  }
  return !isAffirmativeCopulaSupportVerbToken(follower) &&
    !isIntrinsicHonorificCopulaSupportVerbToken(follower) &&
    !isMizenVoiceHonorificCopulaSupportVerbToken(follower) &&
    dewaScopeBridgeRelationAt(tokens, deIdx) === null &&
    !isNaiOrNuToken(follower);
}

function boundNominalReasonNounIndexAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): number | null {
  let cursor = pos;
  if (tokens[cursor] === undefined) return null;
  const quoteMarker = quoteMarkerRelationAt(tokens, cursor, {
    consumers: ["tail_multi_clause"]
  });
  if (quoteMarker?.canonicalSurface === "って") {
    cursor = quoteMarker.span.endExclusive;
    const say = tokens[cursor];
    if (say !== undefined && (say.pos & POS0) === 動詞 && IU_LEXEME_FORMS.has(say.dictionaryForm)) {
      cursor += 1;
    }
  } else if (quoteMarker?.canonicalSurface === "と") {
    if (!boundNominalReasonQuoteCarrierAt(tokens, cursor)) {
      return null;
    }
    cursor = quoteMarker.span.endExclusive + 1;
  }
  return cursor;
}

export function matchBoundNominalReasonConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): BoundNominalReasonConnectiveMatch | null {
  const cursor = boundNominalReasonNounIndexAt(tokens, pos);
  if (cursor === null) return null;

  const koto = tokens[cursor];
  if (isMonoReasonNounToken(koto)) {
    const copula = tokens[cursor + 1];
    const copulaPos4 = (copula?.pos ?? 0) & POS4;
    if (
      copula !== undefined &&
      (copula.pos & POS0) === 助動詞0 &&
      (copulaPos4 === 助動詞_ダ || copulaPos4 === 助動詞_デス) &&
      caseParticleMarkerRelationForToken(tokens[cursor + 2], cursor + 2, {
        acceptedSurfaces: ["から"],
        acceptedParticleSubtypes: ["格助詞", "接続助詞"],
        consumers: ["tail_multi_clause"]
      }) !== null
    ) {
      let end = cursor + 3;
      if (tokens[end]?.surface === "こそ" && ((tokens[end]?.pos ?? 0) & POS0) === 助詞) {
        end += 1;
      }
      return boundNominalReasonMatch(tokens, pos, end, "mono");
    }
    if (
      MONO_REASON_COPULA_DE_FORMS.has(koto.surface) &&
      !isLikenessModalAdnominalTailEnd(tokens, cursor - 1) &&
      isMonoReasonCopulaRenyouDeAt(tokens, cursor + 1)
    ) {
      return boundNominalReasonMatch(tokens, pos, cursor + 2, "mono", { requiresClauseContinuation: true });
    }
  }

  if (koto === undefined || !isKotoNounToken(koto) || koto.surface !== "こと") {
    return null;
  }

  const afterKoto = tokens[cursor + 1];
  if (caseParticleMarkerRelationForToken(afterKoto, cursor + 1, {
    acceptedSurfaces: ["で"],
    consumers: ["tail_multi_clause"]
  }) !== null) {
    return boundNominalReasonMatch(tokens, pos, cursor + 2, "koto");
  }
  if (
    afterKoto !== undefined &&
    (afterKoto.pos & POS0) === 助詞 &&
    afterKoto.surface === "によって"
  ) {
    const afterMarkerPos4 = (tokens[cursor + 2]?.pos ?? 0) & POS4;
    if (((tokens[cursor + 2]?.pos ?? 0) & POS0) === 助動詞0 && (afterMarkerPos4 === 助動詞_ダ || afterMarkerPos4 === 助動詞_デス)) {
      return null;
    }
    return boundNominalReasonMatch(tokens, pos, cursor + 2, "koto");
  }
  if (caseParticleMarkerRelationForToken(afterKoto, cursor + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) !== null) {
    const yoru = tokens[cursor + 2];
    const te = tokens[cursor + 3];
    if (
      yoru !== undefined &&
      yoru.dictionaryForm === "よる" &&
      (yoru.pos & POS5A) === 連用形_
    ) {
      let end = cursor + 3;
      if (isTeSurfaceConnectiveToken(te)) {
        end += 1;
      }
      return boundNominalReasonMatch(tokens, pos, end, "koto");
    }
  }
  if (caseParticleMarkerRelationForToken(afterKoto, cursor + 1, {
    acceptedSurfaces: ["から"],
    acceptedParticleSubtypes: ["格助詞", "接続助詞"],
    consumers: ["tail_multi_clause"]
  }) !== null) {
    return boundNominalReasonMatch(tokens, pos, cursor + 2, "koto");
  }

  if (afterKoto?.surface !== "も" || (afterKoto.pos & POS0) !== 助詞) {
    return null;
  }
  const carrier = tokens[cursor + 2];
  if (carrier === undefined || (carrier.pos & POS0) !== 動詞) {
    return null;
  }

  if (isAruVerbToken(carrier)) {
    const carrierForm5A = carrier.pos & POS5A;
    if (carrierForm5A !== 連用形_) {
      return null;
    }
    let end = cursor + 3;
    const te = tokens[cursor + 3];
    if (isTeSurfaceConnectiveToken(te)) {
      end += 1;
      return boundNominalReasonMatch(tokens, pos, end, "koto");
    }
    return boundNominalReasonMatch(tokens, pos, end, "koto", { requiresClauseContinuation: true });
  }

  if (carrier.dictionaryForm === "手伝う") {
    const carrierForm5A = carrier.pos & POS5A;
    const te = tokens[cursor + 3];
    if (carrierForm5A !== 連用形_ || !isTeSurfaceConnectiveToken(te)) {
      return null;
    }
    return boundNominalReasonMatch(tokens, pos, cursor + 4, "koto");
  }

  return null;
}

export function matchBoundNominalListingConnectiveAt(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): BoundNominalListingConnectiveMatch | null {
  const koto = tokens[pos];
  if (koto === undefined || !isKotoNounToken(koto) || koto.surface !== "こと") {
    return null;
  }
  const listing = tokens[pos + 1];
  if (listing?.surface !== "や" || (listing.pos & POS0) !== 助詞) {
    return null;
  }
  return {
    connective: "bound_nominal_listing",
    surface: `${koto.surface}${listing.surface}`,
    consumed: 2
  };
}
