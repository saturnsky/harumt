import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { auxHasNegativePolite, auxHasNegation, auxHasPast, auxHasPolite, collectAuxTokens, isAdjNai, isVerbLemma } from "../../../../matchers.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS } from "../../../data/semantic-helper-sets.js";
import { isBaSufficiencyConditionalAt, matchPermissionPredicateAt } from "../../../../semantics/permission-idiom.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { caseParticleMarkerRelationForToken, copulaDeMarkerRelationForToken, dewaScopeBridgeRelationAt } from "../../../boundary/marker.js";
import { nextNonSpaceIndex, previousNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { hasRealContentAfterIndex } from "../../../boundary/punctuation.js";
import { classifyTeTailContinuation, isTeConnectiveToken, teDeContinuationRelationAt } from "../../postverb-tail-classifier.js";
import type { AuxOpNode, CannotRefrainIdiomOp, DecisionKotoNiSuruIdiomOp, OutcomeKotoNiNaruIdiomOp, DegreeIntensifierIdiomOp, DegreeIntensifierMode, DegreeIntensifierVariant, ExperienceIdiomOp, InevitableIdiomOp, MethodYouGaNaiIdiomOp, NegativeNecessityKotoWaIdiomOp, NegativeNecessitySumuIdiomOp, OnlyOptionIdiomOp, PermissionIdiomOp, SufficiencyConditionalIdiomOp, TeEvaluationIdiomOp, OpSource, PotentialKotoGaDekiruIdiomOp, PotentialKotoDekiruFocusParticle, PotentialKotoDekiruParticleKind, StemNode, WakeImpossibleIdiomOp, NegativeNecessityMadeMoIdiomOp } from "../grammar.js";
import { srcSlice } from "../source.js";
import { isAruVerbToken, isKotoNounToken, isSuruVerbToken } from "../classifiers/tokens.js";
import { matchOutcomeKotoNiNaruSurfaceAt } from "./outcome-koto-ni-naru.js";
import { matchNegationEnding } from "./negation-ending.js";
import { fusedVolitionalMethodYouIdiomShapeAt, matchNegativeExistentialEndingWithPast, methodYouGaNaiIdiomShapeAt, methodYouIdiomHostIsVerbalRenyouAt } from "./method-you-idiom.js";
import { secondaryParticleCanonical } from "../../../../particles/secondary-particle.js";
import { matchCompositeConnectiveAt } from "./connective.js";
import { negativeCopulaBridgeOpensAt } from "./copula.js";
import { auxOpCarriesTypedNegation } from "../inspect.js";
import { NOMINAL_BITS, POS0, POS01, pos0in, POS1, POS4, POS5A, PUNCTUATION_BITS, 意志推量形_, 仮定形_, 格助詞, 係助詞, 形容詞0, 終止形_, 助詞, 助詞_終助詞, 助動詞_タ, 助動詞_ダ, 助動詞_デス, 助動詞_ヌ, 助動詞_マス, 助動詞_レル, 動詞, 副助詞, 未然形_, 名詞, 連体形_, 連用形_, 連用形_促音便, 助詞_接続助詞, 助詞_係助詞 } from "../../../../../types/pos.js";
import { createIdiomOp } from "../op-builders.js";
import { isNegationToken } from "../parser.js";
import { previousOpsHaveExperiencePastAttributive, opLastSourceToken } from "../parse-stem.js";
import { hostChainAttachesAsVerbalRenyou } from "../postverb-host-attachment.js";

const ARU_POLITE_EXISTENTIAL_VERB_FORMS = new Set(["ござる"]);
const IRU_VERB_FORMS = new Set(["いる", "居る"]);
type AruOrGozaruVerbToken = RuntimeHaruToken & { readonly dictionaryForm: "ある" | "有る" | "ござる" };
type IruVerbToken = RuntimeHaruToken & { readonly dictionaryForm: "いる" | "居る" };

function isAruOrGozaruVerbToken(token: RuntimeHaruToken | undefined): token is AruOrGozaruVerbToken {
  if (isAruVerbToken(token)) {
    return true;
  }
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return ARU_POLITE_EXISTENTIAL_VERB_FORMS.has(form);
}

function isIruVerbToken(token: RuntimeHaruToken | undefined): token is IruVerbToken {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  return IRU_VERB_FORMS.has(token.dictionaryForm || token.surface);
}


export function matchDegreeIntensifierIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): DegreeIntensifierIdiomOp | null {
  const { tokens, pos } = cursor;
  const connector = tokens[pos];
  if (connector === undefined || !isDegreeHostConnector(connector)) {
    return null;
  }
  const tailPos = pos + 1;
  const core = cursor.lookahead(tailPos - pos, c => matchDegreeIntensifierCore(c, lookups));
  if (core === null) {
    return null;
  }
  const consumed = 1 + core.consumed;
  cursor.advance(consumed);
  return buildDegreeIntensifierIdiomOp(
    srcSlice(tokens, pos, consumed),
    core.mode,
    core.variant,
    core.polite,
    core.past
  );
}

export function buildDegreeIntensifierIdiomOp(
  source: OpSource,
  mode: DegreeIntensifierMode,
  variant: DegreeIntensifierVariant,
  polite = false,
  past = false
): DegreeIntensifierIdiomOp {
  return createIdiomOp({

    idiom: "degree_intensifier",
    source,
    polarity: "affirmative",
    polite,
    past,
    mode,
    variant
  });
}

function isDegreeHostConnector(token: RuntimeHaruToken): boolean {
  if (isTeConnectiveToken(token) && token.surface.charAt(0) === "て") {
    return true;
  }
  return (isTeConnectiveToken(token) && token.surface.charAt(0) === "で") ||
    (copulaDeMarkerRelationForToken(token, -1, { consumers: ["tail_multi_clause"] }) !== null && (token.pos & POS4) === 助動詞_ダ);
}

function collectAuxAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  pos: number
): readonly RuntimeHaruToken[] {
  const aux = cursor.lookahead(pos - cursor.pos, c => collectAuxTokens(c)) as readonly RuntimeHaruToken[];
  const bridgeOffset = aux.findIndex(
    (_, offset) => negativeCopulaBridgeOpensAt(cursor.tokens, pos + offset)
  );
  return bridgeOffset < 0 ? aux : aux.slice(0, bridgeOffset);
}

function matchDegreeIntensifierCore(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): {
  readonly consumed: number;
  readonly mode: DegreeIntensifierMode;
  readonly variant: DegreeIntensifierVariant;
  readonly polite: boolean;
  readonly past: boolean;
} | null {
  const { tokens, pos, end: n } = cursor;
  const tail = tokens[pos];
  if (tail === undefined || pos >= n) {
    return null;
  }

  if ((tail.pos & POS0) === 動詞 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    const aux = collectAuxAt(cursor, pos + 1);
    if (!auxHasNegation(aux) && !auxHasNegativePolite(aux)) {
      return null;
    }
    const afterAux = pos + 1 + aux.length;
    const become = cursor.lookahead(afterAux - pos, matchDegreeBecomeCarrier);
    if (become !== null) {
      return {
        consumed: 1 + aux.length + become.consumed,
        mode: "become",
        variant: "bear",
        polite: become.polite,
        past: become.past
      };
    }
    return {
      consumed: 1 + aux.length,
      mode: "terminal",
      variant: "bear",
      polite: auxHasPolite(aux),
      past: auxHasPast(aux)
    };
  }

  if ((tail.pos & POS0) === 形容詞0 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    const aux = collectAuxAt(cursor, pos + 1);
    const tailPos5A = tail.pos & POS5A;
    if ((tailPos5A & POS5A) === 連用形_) {
      const become = cursor.lookahead(1, matchDegreeBecomeCarrier);
      if (become !== null) {
        return {
          consumed: 1 + become.consumed,
          mode: "become",
          variant: "helpless",
          polite: become.polite,
          past: become.past
        };
      }
    }
    return {
      consumed: 1 + aux.length,
      mode: "terminal",
      variant: "helpless",
      polite: auxHasPolite(aux),
      past: auxHasPast(aux) || tailPos5A === 連用形_促音便
    };
  }

  if ((tail.pos & POS0) === 名詞 && classifyTeTailContinuation(tail, lookups) === "degree_intensifier") {
    let scan = pos + 1;
    const marker = tokens[scan];
    if (marker !== undefined && marker.surface === "が" && (marker.pos & POS0) === 助詞) {
      scan += 1;
    }
    const head = tokens[scan];
    if (head === undefined) {
      return null;
    }
    const headPos5A = head.pos & POS5A;
    if (isAdjNai(head)) {
      if ((headPos5A & POS5A) === 連用形_) {
        const become = cursor.lookahead(scan + 1 - pos, matchDegreeBecomeCarrier);
        if (become !== null) {
          return {
            consumed: (scan - pos) + 1 + become.consumed,
            mode: "become",
            variant: "helpless",
            polite: become.polite,
            past: become.past
          };
        }
      }
      const aux = collectAuxAt(cursor, scan + 1);
      return {
        consumed: (scan - pos) + 1 + aux.length,
        mode: "terminal",
        variant: "helpless",
        polite: auxHasPolite(aux),
        past: auxHasPast(aux) || headPos5A === 連用形_促音便
      };
    }
    if (isVerbLemma(head, "なくなる")) {
      const aux = collectAuxAt(cursor, scan + 1);
      return {
        consumed: (scan - pos) + 1 + aux.length,
        mode: "become",
        variant: "helpless",
        polite: auxHasPolite(aux),
        past: auxHasPast(aux) || headPos5A === 連用形_促音便
      };
    }
    if (isAruOrGozaruVerbToken(head)) {
      const masu = tokens[scan + 1];
      const nu = tokens[scan + 2];
      if (masu === undefined || nu === undefined || (masu.pos & POS4) !== 助動詞_マス || (nu.pos & POS4) !== 助動詞_ヌ) {
        return null;
      }
      const aux = collectAuxAt(cursor, scan + 3);
      return {
        consumed: (scan - pos) + 3 + aux.length,
        mode: "terminal",
        variant: "helpless",
        polite: true,
        past: auxHasPast(aux)
      };
    }
  }

  return null;
}

function matchDegreeBecomeCarrier(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly consumed: number; readonly polite: boolean; readonly past: boolean } | null {
  const { tokens, pos, end: n } = cursor;
  const naru = tokens[pos];
  if (naru === undefined || pos >= n || !isVerbLemma(naru, "なる")) {
    return null;
  }
  const aux = collectAuxAt(cursor, pos + 1);
  return {
    consumed: 1 + aux.length,
    polite: auxHasPolite(aux),
    past: auxHasPast(aux)
  };
}


function plainTePermissionContextAllowed(
  tokens: readonly RuntimeHaruToken[],
  predicatePos: number,
  predicateConsumed: number
): boolean {
  const predicate = tokens[predicatePos];
  if (predicate === undefined) {
    return true;
  }
  const nextIdx = nextNonSpaceIndex(tokens, predicatePos + predicateConsumed);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  if (next === undefined || pos0in(next.pos, PUNCTUATION_BITS)) {
    return true;
  }
  if (!pos0in(next.pos, NOMINAL_BITS)) {
    return true;
  }
  const predicateForm5A = predicate.pos & POS5A;
  if (predicateForm5A !== 連体形_ && predicateForm5A !== 終止形_) {
    return true;
  }
  const nextForm = next.dictionaryForm || next.surface;
  return PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(nextForm) ||
    PLAIN_TE_PERMISSION_ATTRIBUTIVE_HEADS.has(next.surface);
}

export function matchPermissionIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemNode: StemNode,
  previousOps: readonly AuxOpNode[],
  lookups: LookupTables
): PermissionIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const connective = matchCompositeConnectiveAt(cursor, { requireEnd: false });
  const teDe = tokens[pos];
  const plainVerbTePermission =
    connective === null &&
    teDe !== undefined &&
    (teDe.pos & POS01) === 助詞_接続助詞 &&
    (teDe.surface === "て" || teDe.surface === "で") &&
    hostChainAttachesAsVerbalRenyou(stemNode, previousOps) &&
    !isAruOrGozaruVerbToken(tokens[pos - 1]);
  const previousOp = previousOps.at(-1);
  const negativeTePermission =
    connective === null &&
    teDe?.surface === "て" &&
    (teDe.pos & POS01) === 助詞_接続助詞 &&
    previousOp !== undefined &&
    auxOpCarriesTypedNegation(previousOp);
  if (
    (connective === null || (connective.surface !== "ても" && connective.surface !== "でも")) &&
    !negativeTePermission &&
    !plainVerbTePermission
  ) {
    return null;
  }
  const connectiveConsumed = (negativeTePermission || plainVerbTePermission) ? 1 : connective!.consumed;
  const predicatePos = pos + connectiveConsumed;
  const predicate = matchPermissionPredicateAt(tokens, predicatePos);
  if (predicate === null) {
    return null;
  }
  const continuation = teDeContinuationRelationAt(tokens, pos, {
    requirement: "parser_adjacent_tail",
    consumers: ["tail_boundary_readiness"],
    lookups
  });
  if (
    continuation !== null &&
    continuation.continuationIdx === predicatePos &&
    continuation.continuationKind !== "permission"
  ) {
    return null;
  }
  if (plainVerbTePermission && !plainTePermissionContextAllowed(tokens, predicatePos, predicate.consumed)) {
    return null;
  }
  const consumed = connectiveConsumed + predicate.consumed;
  cursor.advance(consumed);
  return buildPermissionIdiomOp(
    srcSlice(tokens, pos, consumed),
    predicate.variant,
    (negativeTePermission || plainVerbTePermission) ? "ても" : connective!.surface === "でも" ? "でも" : "ても"
  );
}

export function buildPermissionIdiomOp(
  source: OpSource,
  variant: PermissionIdiomOp["variant"],
  connectiveSurface: PermissionIdiomOp["connectiveSurface"]
): PermissionIdiomOp {
  return createIdiomOp({

    idiom: "permission",
    variant,
    connectiveSurface,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

export function matchTeEvaluationIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): AuxOpNode | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const relation = teDeContinuationRelationAt(tokens, pos, {
    requirement: "parser_adjacent_tail",
    consumers: ["tail_boundary_readiness"],
    lookups
  });
  if (
    relation === null ||
    relation.continuationKind !== "evaluation" ||
    relation.span.endExclusive > cursor.end
  ) {
    return null;
  }
  if (relation.markerSurface !== "て" && relation.markerSurface !== "で") {
    return null;
  }
  const consumed = relation.span.endExclusive - pos;
  cursor.advance(consumed);
  return buildTeEvaluationIdiomOp(
    srcSlice(tokens, pos, consumed),
    relation.markerSurface
  );
}

export function buildTeEvaluationIdiomOp(
  source: OpSource,
  connectiveSurface: TeEvaluationIdiomOp["connectiveSurface"]
): TeEvaluationIdiomOp {
  return createIdiomOp({

    idiom: "te_evaluation",
    evaluation: "good",
    connectiveSurface,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

export function matchBaSufficiencyConditionalIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): SufficiencyConditionalIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if (!isBaSufficiencyConditionalAt(tokens, pos)) {
    return null;
  }
  cursor.advance(2);
  return buildSufficiencyConditionalIdiomOp(srcSlice(tokens, pos, 2));
}

export function buildSufficiencyConditionalIdiomOp(
  source: OpSource
): SufficiencyConditionalIdiomOp {
  return createIdiomOp({

    idiom: "sufficiency_conditional",
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

export function matchNegativeNecessitySumuIdiom(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemNode: StemNode
): NegativeNecessitySumuIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const previous = previousOps.at(-1);
  const previousTok = previous === undefined ? undefined : opLastSourceToken(previous);
  const followsNegativeOp = previous?.kind === "negation";
  const followsSuppletiveZuStem =
    previous === undefined &&
    stemNode.commitment === "suppletive_negation" &&
    tokens[pos - 1]?.surface === "ず";
  const marker = tokens[pos];
  let connectiveConsumed = 0;
  let variant: NegativeNecessitySumuIdiomOp["variant"] | null = null;
  if (
    followsNegativeOp &&
    marker !== undefined &&
    (marker.surface === "て" || marker.surface === "で") &&
    (marker.pos & POS01) === 助詞_接続助詞
  ) {
    const focus = tokens[pos + 1];
    const baseVariant = marker.surface === "で" ? "naide_sumu" : "nakute_sumu";
    const focusVariant = marker.surface === "で" ? "naidemo_sumu" : "nakutemo_sumu";
    if (focus !== undefined && focus.surface === "も" && (focus.pos & POS0) === 助詞) {
      connectiveConsumed = 2;
      variant = focusVariant;
    } else {
      connectiveConsumed = 1;
      variant = baseVariant;
    }
  } else if (
    (
      followsSuppletiveZuStem ||
      (followsNegativeOp && (previousTok?.surface === "ず" || previousTok?.surface === "ぬ"))
    ) &&
    marker !== undefined &&
    caseParticleMarkerRelationForToken(marker, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null
  ) {
    connectiveConsumed = 1;
    variant = "zuni_sumu";
  }
  if (variant === null || !isSumuNeedAvoidancePredicate(tokens[pos + connectiveConsumed])) {
    return null;
  }
  const consumed = connectiveConsumed + 1;
  cursor.advance(consumed);
  return buildNegativeNecessitySumuIdiomOp(srcSlice(tokens, pos, consumed), variant);
}

export function buildNegativeNecessitySumuIdiomOp(
  source: OpSource,
  variant: NegativeNecessitySumuIdiomOp["variant"]
): NegativeNecessitySumuIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_sumu",
    variant,
    source,
    polarity: "affirmative",
    polite: false,
    past: false
  });
}

function isSumuNeedAvoidancePredicate(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || (token.pos & POS0) !== 動詞) {
    return false;
  }
  const lemma = token.dictionaryForm || token.surface;
  return lemma === "済む";
}

export function matchKotoGaDekiru(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): PotentialKotoGaDekiruIdiomOp | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isKotoNounToken(t0)) return null;

  let scan = pos + 1;
  let focusParticle: PotentialKotoDekiruFocusParticle | null = null;
  const focusCanonical = secondaryParticleCanonical(tokens[scan]);
  if (focusCanonical !== null && isPotentialKotoDekiruFocusParticle(focusCanonical, lookups)) {
    focusParticle = focusCanonical;
    scan += 1;
  }

  let particleKind: PotentialKotoDekiruParticleKind | null = null;
  const particle = tokens[scan];
  if (particle !== undefined && (particle.pos & POS0) === 助詞) {
    const particlePos1 = particle.pos & POS1;
    if ((particle.surface === "が" || particle.surface === "の") && (particlePos1 & POS1) === 格助詞) {
      particleKind = "ga";
      scan += 1;
    } else if (particle.surface === "は" && (particlePos1 & POS1) === 係助詞) {
      particleKind = "wa";
      scan += 1;
    } else if (particle.surface === "も" && (particlePos1 & POS1) === 係助詞) {
      particleKind = "mo";
      scan += 1;
    }
  }

  if (particleKind === null) {
    if (focusParticle === null) {
      return null;
    }
    particleKind = "focus";
  }
  if (focusParticle !== null && particleKind === "ga") {
    return null;
  }

  const dekiru = tokens[scan];
  if (dekiru === undefined || !isPotentialDekiruToken(dekiru)) return null;
  const dekiruPos5A = dekiru.pos & POS5A;
  if (
    dekiruPos5A !== 終止形_ &&
    dekiruPos5A !== 連体形_ &&
    dekiruPos5A !== 連用形_ &&
    dekiruPos5A !== 未然形_ &&
    dekiruPos5A !== 仮定形_
  ) {
    return null;
  }
  const consumed = (scan - pos) + 1;
  cursor.advance(consumed);
  return buildPotentialKotoGaDekiruIdiomOp(
    srcSlice(tokens, pos, consumed),
    particleKind,
    focusParticle
  );
}

export function buildPotentialKotoGaDekiruIdiomOp(
  source: OpSource,
  particleKind: PotentialKotoDekiruParticleKind,
  focusParticle: PotentialKotoDekiruFocusParticle | null
): PotentialKotoGaDekiruIdiomOp {
  return createIdiomOp({

    idiom: "potential_koto_ga_dekiru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    particleKind,
    focusParticle
  });
}

export function matchExperienceKotoGaAru(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): ExperienceIdiomOp | null {
  const { tokens, pos } = cursor;
  const t0 = tokens[pos];
  if (t0 === undefined || !isKotoNounToken(t0) || t0.surface !== "こと") return null;
  if (!previousOpsHaveExperiencePastAttributive(previousOps)) return null;

  const particle = tokens[pos + 1];
  if (
    particle === undefined ||
    (particle.pos & POS0) !== 助詞 ||
    !(particle.surface === "が" || particle.surface === "も")
  ) {
    return null;
  }
  const particleKind: ExperienceIdiomOp["particleKind"] = particle.surface === "も" ? "mo" : "ga";

  const predicatePos = pos + 2;
  const predicate = tokens[predicatePos];
  if (predicate === undefined) return null;

  if (isAruVerbToken(predicate)) {
    const pos5A = predicate.pos & POS5A;
    if (
      pos5A !== 終止形_ &&
      pos5A !== 連体形_ &&
      pos5A !== 連用形_
    ) {
      return null;
    }
    const nextAfterPredicate = tokens[predicatePos + 1];
    if (
      pos5A === 連用形_ &&
      isTeConnectiveToken(nextAfterPredicate)
    ) {
      return null;
    }

    const negativeEnding = matchNegationEnding(tokens, predicatePos);
    if (negativeEnding !== null && negativeEnding.consumed > 1) {
      let consumed = 2 + negativeEnding.consumed;
      let past = false;
      const desu = tokens[pos + consumed];
      const ta = tokens[pos + consumed + 1];
      if (
        desu?.dictionaryForm === "です" &&
        (desu.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_) &&
        ta !== undefined &&
        (ta.pos & (POS4 | POS5A)) === (助動詞_タ | 終止形_)
      ) {
        consumed += 2;
        past = true;
      }
      cursor.advance(consumed);
      return buildExperienceIdiomOp(
        srcSlice(tokens, pos, consumed),
        particleKind,
        "negative",
        true,
        past
      );
    }

    cursor.advance(3);
    return buildExperienceIdiomOp(srcSlice(tokens, pos, 3), particleKind);
  }

  const negativeEnding = matchNegationEnding(tokens, predicatePos, { allowAttributive: true });
  if (negativeEnding !== null) {
    const consumed = 2 + negativeEnding.consumed;
    cursor.advance(consumed);
    return buildExperienceIdiomOp(
      srcSlice(tokens, pos, consumed),
      particleKind,
      "negative",
      negativeEnding.polite
    );
  }

  return null;
}

export function buildExperienceIdiomOp(
  source: OpSource,
  particleKind: ExperienceIdiomOp["particleKind"],
  polarity: ExperienceIdiomOp["polarity"] = "affirmative",
  polite = false,
  past = false
): ExperienceIdiomOp {
  return createIdiomOp({

    idiom: "experience_koto_ga_aru",
    source,
    polarity,
    polite,
    past,
    particleKind
  });
}

export function matchDecisionKotoNiSuru(
  cursor: TokenCursor<RuntimeHaruToken>
): DecisionKotoNiSuruIdiomOp | null {
  const { tokens, pos } = cursor;
  const koto = tokens[pos];
  if (koto === undefined || !isKotoNounToken(koto) || koto.surface !== "こと") return null;
  const ni = tokens[pos + 1];
  if (caseParticleMarkerRelationForToken(ni, pos + 1, {
    acceptedSurfaces: ["に"],
    consumers: ["tail_multi_clause"]
  }) === null) return null;
  const suru = tokens[pos + 2];
  if (suru === undefined || !isVerbLemma(suru, "する")) return null;
  const suruPos5A = suru.pos & POS5A;
  if (
    suruPos5A !== 終止形_ &&
    suruPos5A !== 連用形_ &&
    suruPos5A !== 連体形_ &&
    !(suruPos5A === 意志推量形_ && !hasRealContentAfterIndex(tokens, pos + 3) && !kotoStemIsPastAttributive(tokens, pos))
  ) {
    return null;
  }
  const close = tokens[pos + 3];
  const volitionalClose =
    suruPos5A === 終止形_ &&
    close !== undefined &&
    (close.pos & POS01) === 助詞_終助詞 &&
    ["か", "かな", "かね"].includes(close.surface) &&
    !hasRealContentAfterIndex(tokens, pos + 4);
  cursor.advance(3);
  return buildDecisionKotoNiSuruIdiomOp(srcSlice(tokens, pos, 3), volitionalClose);
}

export function buildDecisionKotoNiSuruIdiomOp(
  source: OpSource,
  volitionalClose = false
): DecisionKotoNiSuruIdiomOp {
  return createIdiomOp({

    idiom: "decision_koto_ni_suru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    ...(volitionalClose ? { volitionalClose: true as const } : {})
  });
}

function kotoStemIsPastAttributive(tokens: readonly RuntimeHaruToken[], kotoIdx: number): boolean {
  const prevIdx = previousNonSpaceIndex(tokens, kotoIdx);
  if (prevIdx === null) return false;
  return ((tokens[prevIdx]?.pos ?? 0) & POS4) === 助動詞_タ;
}

export function matchOutcomeKotoNiNaru(
  cursor: TokenCursor<RuntimeHaruToken>
): OutcomeKotoNiNaruIdiomOp | null {
  const { tokens, pos } = cursor;
  const match = matchOutcomeKotoNiNaruSurfaceAt(tokens, pos);
  if (match === null) return null;
  cursor.advance(match.consumed);
  return buildOutcomeKotoNiNaruIdiomOp(
    srcSlice(tokens, pos, match.consumed),
    match.stative
  );
}

export function buildOutcomeKotoNiNaruIdiomOp(
  source: OpSource,
  stative = false
): OutcomeKotoNiNaruIdiomOp {
  return createIdiomOp({

    idiom: "outcome_koto_ni_naru",
    source,
    polarity: "affirmative",
    polite: false,
    past: false,
    ...(stative ? { stative: true as const } : {})
  });
}

export function matchDecisionToSuru(
  cursor: TokenCursor<RuntimeHaruToken>,
  ops: readonly AuxOpNode[],
  stemTok: RuntimeHaruToken | undefined
): DecisionKotoNiSuruIdiomOp | null {
  if (ops.length !== 0 || stemTok === undefined) return null;
  if ((stemTok.pos & (POS0 | POS5A)) !== (動詞 | 終止形_)) return null;
  const { tokens, pos } = cursor;
  const marker = quoteMarkerRelationAt(tokens, pos, { consumers: ["tail_multi_clause"] });
  if (marker?.canonicalSurface !== "と") return null;
  const suruIdx = marker.span.endExclusive;
  const suru = tokens[suruIdx];
  if (suru === undefined || !isVerbLemma(suru, "する") || !isSuruVerbToken(suru)) return null;
  const suruPos5A = suru.pos & POS5A;
  if (suruPos5A !== 意志推量形_ && suruPos5A !== 終止形_) return null;
  const close = tokens[suruIdx + 1];
  if (
    close === undefined ||
    (close.pos & POS01) !== 助詞_終助詞 ||
    !["か", "かな", "かね"].includes(close.surface) ||
    hasRealContentAfterIndex(tokens, suruIdx + 2)
  ) {
    return null;
  }
  const consumed = suruIdx + 1 - pos;
  cursor.advance(consumed);
  return buildDecisionKotoNiSuruIdiomOp(
    srcSlice(tokens, pos, consumed),
    suruPos5A === 終止形_
  );
}

function previousOpsBlockKotoWaNeedless(previousOps: readonly AuxOpNode[]): boolean {
  return previousOps.some((op) =>
    op.kind === "negation" ||
    op.kind === "tense"
  );
}

function matchKotoWaPoliteNegativeExistential(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly polite: boolean; readonly past: boolean; readonly consumed: number } | null {
  const { tokens, pos } = cursor;
  const aru = tokens[pos];
  if (
    !isAruVerbToken(aru) ||
    (aru.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  const masu = tokens[pos + 1];
  const n = tokens[pos + 2];
  if (
    masu === undefined ||
    n === undefined ||
    (masu.pos & (POS4 | POS5A)) !== (助動詞_マス | 未然形_) ||
    (n.pos & POS4) !== 助動詞_ヌ
  ) {
    return null;
  }
  const desu = tokens[pos + 3];
  const ta = tokens[pos + 4];
  if (
    desu !== undefined &&
    ta !== undefined &&
    desu.dictionaryForm === "です" &&
    (desu.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_) &&
    (ta.pos & POS4) === 助動詞_タ
  ) {
    cursor.advance(5);
    return { polite: true, past: true, consumed: 5 };
  }
  cursor.advance(3);
  return { polite: true, past: false, consumed: 3 };
}

export function matchNegativeNecessityKotoWa(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[],
  stemToken: RuntimeHaruToken
): NegativeNecessityKotoWaIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const koto = cursor.current();
  const topic = cursor.peek(1);
  if (
    koto === undefined ||
    topic === undefined ||
    !isKotoNounToken(koto) ||
    topic.surface !== "は" ||
    (topic.pos & POS01) !== 助詞_係助詞
  ) {
    return null;
  }
  if ((stemToken.pos & POS0) !== 動詞 || previousOpsBlockKotoWaNeedless(previousOps)) {
    return null;
  }

  const tail = tokens[pos + 2];
  if (tail === undefined) {
    return null;
  }
  if (isNegationToken(tail)) {
    cursor.advance(2);
    return buildNegativeNecessityKotoWaIdiomOp(srcSlice(tokens, pos, 2));
  }
  const politeNegative = cursor.lookahead(2, matchKotoWaPoliteNegativeExistential);
  if (politeNegative !== null) {
    const consumed = 2 + politeNegative.consumed;
    cursor.advance(consumed);
    return buildNegativeNecessityKotoWaIdiomOp(
      srcSlice(tokens, pos, consumed),
      "negative",
      politeNegative.polite,
      politeNegative.past
    );
  }
  return null;
}

export function buildNegativeNecessityKotoWaIdiomOp(
  source: OpSource,
  polarity: NegativeNecessityKotoWaIdiomOp["polarity"] = "affirmative",
  polite = false,
  past = false
): NegativeNecessityKotoWaIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_koto_wa",
    source,
    polarity,
    polite,
    past
  });
}

function isHokaOnlyOptionToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 名詞 &&
    (token.surface === "ほか" || token.surface === "他") &&
    (token.reading === "ホカ" || token.dictionaryForm === "ほか" || token.dictionaryForm === "他");
}

function isShikaOnlyOptionToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined &&
    (token.pos & POS0) === 助詞 &&
    token.surface === "しか";
}

function matchOnlyOptionNaruNegative(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly polite: boolean; readonly consumed: number } | null {
  const naru = tokens[pos];
  if (
    naru === undefined ||
    (naru.pos & (POS0 | POS5A)) !== (動詞 | 未然形_) ||
    (naru.dictionaryForm !== "なる" && naru.dictionaryForm !== "成る")
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  return { polite: negEnd.polite, consumed: 1 + negEnd.consumed };
}

export function matchOnlyOption(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemToken: RuntimeHaruToken
): OnlyOptionIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  if ((stemToken.pos & POS0) !== 動詞) {
    return null;
  }
  const markerToken = cursor.current();
  const marker = isShikaOnlyOptionToken(markerToken)
    ? "shika"
    : isHokaOnlyOptionToken(markerToken)
      ? "hoka"
      : null;
  if (marker === null) {
    return null;
  }
  const directNeg = matchNegationEnding(tokens, pos + 1, { allowAttributive: true });
  const hokaNaruNeg = marker === "hoka"
    ? matchOnlyOptionNaruNegative(tokens, pos + 1)
    : null;
  const negEnd = directNeg ?? hokaNaruNeg;
  if (negEnd === null) {
    return null;
  }
  const consumed = 1 + negEnd.consumed;
  cursor.advance(consumed);
  return buildOnlyOptionIdiomOp(srcSlice(tokens, pos, consumed), marker, negEnd.polite);
}

export function buildOnlyOptionIdiomOp(
  source: OpSource,
  marker: OnlyOptionIdiomOp["marker"],
  polite = false
): OnlyOptionIdiomOp {
  return createIdiomOp({

    idiom: "only_option_shika_nai",
    marker,
    source,
    polarity: "negative",
    polite,
    past: false
  });
}

export function matchWakeImpossibleIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): WakeImpossibleIdiomOp | null {
  const { tokens, pos } = cursor;
  const wake = tokens[pos];
  const ni = tokens[pos + 1];
  const focus = tokens[pos + 2];
  const iku = tokens[pos + 3];
  if (
    wake === undefined ||
    (wake.pos & POS0) !== 名詞 ||
    wake.reading !== "ワケ" ||
    caseParticleMarkerRelationForToken(ni, pos + 1, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) === null ||
    (focus?.surface !== "は" && focus?.surface !== "も") ||
    (focus.pos & POS0) !== 助詞 ||
    (iku === undefined || (iku.pos & POS0) !== 動詞) ||
    (iku.dictionaryForm !== "いく" && iku.dictionaryForm !== "ゆく")
  ) {
    return null;
  }

  const aux = cursor.lookahead(4, collectAuxTokens);
  let auxLen = aux.length;
  while (auxLen > 0 && ((aux[auxLen - 1]?.pos ?? 0) & POS5A) === 意志推量形_) {
    auxLen -= 1;
  }
  const idiomAux = aux.slice(0, auxLen);
  if (!auxHasNegation(idiomAux) && !auxHasNegativePolite(idiomAux)) {
    return null;
  }
  const consumed = 4 + auxLen;
  cursor.advance(consumed);
  return buildWakeImpossibleIdiomOp(
    srcSlice(tokens, pos, consumed),
    focus.surface === "も" ? "mo" : "wa",
    auxHasPolite(idiomAux),
    auxHasPast(idiomAux)
  );
}

export function buildWakeImpossibleIdiomOp(
  source: OpSource,
  focus: WakeImpossibleIdiomOp["focus"],
  polite = false,
  past = false
): WakeImpossibleIdiomOp {
  return createIdiomOp({

    idiom: "wake_impossible",
    source,
    polarity: "negative",
    polite,
    past,
    focus
  });
}

export function matchInevitableZaruOEnaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): InevitableIdiomOp | null {
  const { tokens, pos } = cursor;
  const zaru = tokens[pos];
  const possibleParticle = tokens[pos + 1];
  const particleRelation = caseParticleMarkerRelationForToken(possibleParticle, pos + 1, {
    acceptedSurfaces: ["を"],
    consumers: ["tail_multi_clause"]
  });
  const hasParticle = particleRelation !== null;
  const eruOffset = hasParticle ? 2 : 1;
  const eru = tokens[pos + eruOffset];
  if (
    zaru === undefined ||
    zaru.surface !== "ざる" ||
    zaru.dictionaryForm !== "ぬ" ||
    (zaru.pos & (POS4 | POS5A)) !== (助動詞_ヌ | 連体形_) ||
    (eru === undefined || (eru.pos & POS0) !== 動詞) ||
    (eru.dictionaryForm !== "得る" && eru.dictionaryForm !== "える")
  ) {
    return null;
  }
  const eruPos5A = eru.pos & POS5A;
  const auxStart = eruOffset + 1;
  const aux = cursor.lookahead(auxStart, collectAuxTokens);
  if (!auxHasNegation(aux) && !auxHasNegativePolite(aux)) {
    return null;
  }
  const acceptsNegative =
    (eruPos5A & POS5A) === 未然形_ ||
    (auxHasNegativePolite(aux) && (eruPos5A & POS5A) === 連用形_) ||
    (auxHasPolite(aux) && (eruPos5A & POS5A) === 連用形_);
  if (!acceptsNegative) {
    return null;
  }
  const consumed = auxStart + aux.length;
  cursor.advance(consumed);
  return buildInevitableIdiomOp(
    srcSlice(tokens, pos, consumed),
    auxHasPolite(aux),
    auxHasPast(aux)
  );
}

export function buildInevitableIdiomOp(
  source: OpSource,
  polite = false,
  past = false
): InevitableIdiomOp {
  return createIdiomOp({

    idiom: "inevitable_zaru_o_enai",
    source,
    polarity: "negative",
    polite,
    past
  });
}

export function matchCannotRefrainNegativeDewaIrarenai(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOps: readonly AuxOpNode[]
): CannotRefrainIdiomOp | null {
  const { tokens, pos, end: n } = cursor;
  const previous = previousOps[previousOps.length - 1];
  if (previous?.kind !== "negation") {
    return null;
  }
  const marker = matchCannotRefrainFocusMarker(tokens, pos);
  if (marker === null) {
    return null;
  }
  const iruPos = pos + marker.consumed;
  const iru = tokens[iruPos];
  const rareru = tokens[iruPos + 1];
  if (
    !isIruVerbToken(iru) ||
    (iru.pos & POS5A) !== 未然形_ ||
    rareru === undefined ||
    (rareru.pos & POS4) !== 助動詞_レル
  ) {
    return null;
  }
  const negEnd = matchNegationEnding(tokens, iruPos + 2, { allowAttributive: true });
  if (negEnd === null) {
    return null;
  }
  const rareruPos5A = rareru.pos & POS5A;
  const acceptsNegation =
    (rareruPos5A & POS5A) === 未然形_ ||
    (negEnd.startsWithMasen === true && (rareruPos5A & POS5A) === 連用形_);
  if (!acceptsNegation) {
    return null;
  }
  const consumed = marker.consumed + 2 + negEnd.consumed;
  if (pos + consumed > n) {
    return null;
  }
  cursor.advance(consumed);
  return buildCannotRefrainIdiomOp(srcSlice(tokens, pos, consumed), negEnd.polite);
}

export function buildCannotRefrainIdiomOp(
  source: OpSource,
  polite = false
): CannotRefrainIdiomOp {
  return createIdiomOp({

    idiom: "cannot_refrain_negative_dewa_irarenai",
    source,
    polarity: "negative",
    polite,
    past: false
  });
}

function matchCannotRefrainFocusMarker(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): { readonly consumed: number } | null {
  const dewa = dewaScopeBridgeRelationAt(tokens, pos, {
    anchorIdx: pos,
    consumers: ["tail_multi_clause"]
  });
  if (dewa?.focusParticle === "wa") {
    return { consumed: dewa.span.endExclusive - pos };
  }
  const ni = tokens[pos];
  const wa = tokens[pos + 1];
  if (
    caseParticleMarkerRelationForToken(ni, pos, {
      acceptedSurfaces: ["に"],
      consumers: ["tail_multi_clause"]
    }) !== null &&
    wa?.surface === "は" &&
    (wa.pos & POS01) === 助詞_係助詞
  ) {
    return { consumed: 2 };
  }
  return null;
}

export function matchMethodYouGaNaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): MethodYouGaNaiIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = (methodYouIdiomHostIsVerbalRenyouAt(tokens, pos)
    ? methodYouGaNaiIdiomShapeAt(tokens, pos)
    : null) ??
    fusedVolitionalMethodYouIdiomShapeAt(tokens, pos);
  if (shape === null) {
    return null;
  }
  cursor.advance(shape.consumed);
  return buildMethodYouGaNaiIdiomOp(
    srcSlice(tokens, pos, shape.consumed),
    shape.surface,
    shape.particleKind,
    shape.polite,
    shape.past
  );
}

export function buildMethodYouGaNaiIdiomOp(
  source: OpSource,
  surface: MethodYouGaNaiIdiomOp["surface"],
  particleKind: MethodYouGaNaiIdiomOp["particleKind"] = "ga",
  polite = false,
  past = false
): MethodYouGaNaiIdiomOp {
  return createIdiomOp({

    idiom: "method_you_ga_nai",
    source,
    polarity: "negative",
    polite,
    past,
    surface,
    particleKind
  });
}

export function matchMadeMoNaiIdiom(
  cursor: TokenCursor<RuntimeHaruToken>
): NegativeNecessityMadeMoIdiomOp | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const made = cursor.current();
  const mo = cursor.peek(1);
  if (
    made === undefined ||
    made.surface !== "まで" ||
    (made.pos & POS1) !== 副助詞 ||
    mo?.surface !== "も" ||
    (mo.pos & POS01) !== 助詞_係助詞
  ) {
    return null;
  }
  const negEnd = matchNegativeExistentialEndingWithPast(tokens, pos + 2);
  if (negEnd === null) {
    return null;
  }
  const consumed = 2 + negEnd.consumed;
  cursor.advance(consumed);
  return buildNegativeNecessityMadeMoIdiomOp(
    srcSlice(tokens, pos, consumed),
    negEnd.polite,
    negEnd.past
  );
}

export function buildNegativeNecessityMadeMoIdiomOp(
  source: OpSource,
  polite = false,
  past = false
): NegativeNecessityMadeMoIdiomOp {
  return createIdiomOp({

    idiom: "negative_necessity_made_mo",
    source,
    polarity: "negative",
    polite,
    past
  });
}

function isPotentialDekiruToken(token: RuntimeHaruToken): boolean {
  return isVerbLemma(token, "できる", "出来る");
}

function isPotentialKotoDekiruFocusParticle(surface: string, lookups: LookupTables): surface is PotentialKotoDekiruFocusParticle {
  return lookups.KOTO_DEKIRU_FOCUS_PARTICLES.has(surface);
}
