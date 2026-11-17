import type { LookupTables } from "../../../../lookup-tables.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import { POS01, POS1, POS4, POS5A, 助詞_終助詞, 係助詞, 助動詞_タ, 助動詞_ダ, 助動詞_マイ, 副助詞, 準体助詞, 終止形_, 連体形_, 連用形_, isConditionalInflection } from "../../../../../types/pos.js";
import {
  conditionalTailConnectiveRelationForToken,
  dewaScopeBridgeRelationAt,
  predicateNominalizerRelationForToken,
  pronominalNoDeScopeBridgeRelationAt
} from "../../../boundary/marker.js";
import {
  type AuxOpNode,
  type OpSource,
  type ScopeBridgeForm,
  type ScopeBridgeHead,
  type ScopeBridgeParticle,
  type ScopeBridgeOp,
  type StemNode
} from "../grammar.js";
import { srcSlice } from "../source.js";
import {
  isAffirmativeCopulaSupportVerbToken,
  isGozaruPoliteSupportToken,
  isUnrealizableCopulaPoliteAuxiliaryMood,
  isFusedCopulaDewaFocusToken,
  isKotoNounToken,
  isFusedNegativeStateChangeVerbToken,
  isNaiOrNuToken,
  isWakeNounToken
} from "../classifiers/tokens.js";
import { WH_INDEFINITE_DEMO_HOSTS } from "../../../data/semantic-helper-sets.js";
import { consumeNegationEnding, matchNegationEnding } from "./negation-ending.js";
import { TokenCursor } from "../../../../token-cursor.js";
import { nextNonSpaceIndex } from "../../../../clause-layout/trivia.js";
import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import {
  closesUtteranceAs,
  utteranceClosureAfter,
  utteranceClosureRunAfter,
  utteranceClosureTokenIdx,
  type UtteranceClosureKind
} from "../../../../clause-layout/utterance-closure.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { appearancePerceptionProjectionForToken } from "../appearance-perception-carrier-table.js";
import { createScopeBridgeOp } from "../op-builders.js";

function whIndefiniteDemoHostBefore(
  tokens: readonly RuntimeHaruToken[],
  markerPos: number
): boolean {
  for (let i = markerPos - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token === undefined) {
      return false;
    }
    if (token.surface.trim() === "") {
      continue;
    }
    return WH_INDEFINITE_DEMO_HOSTS.has(token.dictionaryForm || token.surface) ||
      WH_INDEFINITE_DEMO_HOSTS.has(token.surface);
  }
  return false;
}

export function buildScopeBridgeOp(
  source: OpSource,
  head: ScopeBridgeHead,
  form: ScopeBridgeForm,
  particle: ScopeBridgeOp["particle"],
  polarity: ScopeBridgeOp["polarity"],
  chainDepth: number,
  polite: boolean,
  markerTagging?: ScopeBridgeOp["markerTagging"],
  conjecture?: boolean
): ScopeBridgeOp {
  return createScopeBridgeOp({
    source, head, form, particle, polarity, chainDepth, polite, markerTagging,
    ...(conjecture === true ? { conjecture: true } : {})
  });
}

export interface ScopeBridgeMatchOptions {
  readonly allowElidedNegativeBody?: boolean;
  readonly allowFocusIdentityParticles?: boolean;
}

export function quoteMarkerClosesUtteranceAfter(
  scope: Parameters<typeof utteranceClosureRunAfter>[0],
  tokens: readonly RuntimeHaruToken[],
  afterIdx: number
): boolean {
  const run = utteranceClosureRunAfter(scope, tokens, afterIdx);
  if (run.endedBy !== "content") {
    return false;
  }
  return quoteMarkerRelationAt(tokens, run.endIdx, { consumers: ["tail_multi_clause"] }) !== null;
}

export function pronominalNoScopeBridgeClaimsAt(
  tokens: readonly RuntimeHaruToken[],
  noIdx: number,
  lookups: LookupTables
): boolean {
  const relation = pronominalNoDeScopeBridgeRelationAt(tokens, noIdx, {
    consumers: ["tail_multi_clause"]
  });
  if (relation === null) {
    return false;
  }
  if (relation.focusParticle === undefined) {
    return true;
  }
  if (relation.focusParticle !== "wa") {
    return true;
  }
  const form: ScopeBridgeForm = "dewa";
  const bodyStart = relation.span.endExclusive;
  if (scopeBridgeBodyClosesAt(new TokenCursor(tokens, bodyStart, tokens.length, bodyStart), form, noIdx + 1)) {
    return true;
  }
  if (copulaFocusScopeBodyIdentityAt(tokens, bodyStart, lookups)) {
    return true;
  }
  const closure = utteranceClosureAfter(activeProtoLayout(), tokens, bodyStart);
  return closesUtteranceAs(closure, ELIDED_NEGATIVE_BODY_CLOSURES) ||
    quoteMarkerClosesUtteranceAfter(activeProtoLayout(), tokens, bodyStart) ||
    quoteMarkerClosesUtteranceAfter(activeProtoLayout(), tokens, bodyStart - 1);
}

const ELIDED_NEGATIVE_BODY_CLOSURES: ReadonlySet<UtteranceClosureKind> = new Set([
  "eos",
  "hard_terminal",
  "matched_delimiter_close",
  "unmatched_trailing"
]);

export function matchScopeBridge(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: ScopeBridgeMatchOptions = {}
): ScopeBridgeOp | null {
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  const base = cursor.pos;

  if (isWakeNounToken(t0)) {
    const result = cursor.tx(c => {
      c.advance();
      const tail = matchScopeBridgeTail(c, "wake");
      if (tail === null) return null;
      return { ...tail, source: srcSlice(c.tokens, base, c.pos - base) };
    });
    if (result !== null) return result;
  }
  if (isKotoNounToken(t0)) {
    const result = cursor.tx(c => {
      c.advance();
      const tail = matchScopeBridgeTail(c, "koto");
      if (tail === null || tail.polarity !== "negative") return null;
      return { ...tail, source: srcSlice(c.tokens, base, c.pos - base) };
    });
    if (result !== null) return result;
  }
  const nominalizer = predicateNominalizerRelationForToken(t0, cursor.pos, {
    requirement: "terminal_noda_marker",
    consumers: ["tail_multi_clause"]
  });
  if (nominalizer?.nominalizerKind === "no" && (t0.pos & POS1) === 準体助詞) {
    const result = cursor.tx(c => {
      c.advance();
      const tail = matchScopeBridgeTail(c, "no", options);
      if (tail === null) return null;
      return { ...tail, source: srcSlice(c.tokens, base, c.pos - base) };
    });
    if (result !== null) return result;
  }
  return matchScopeBridgeTail(cursor, null);
}

export function matchScopeBridgeTail(
  cursor: TokenCursor<RuntimeHaruToken>,
  head: ScopeBridgeHead,
  options: ScopeBridgeMatchOptions = {}
): ScopeBridgeOp | null {
  const t0 = cursor.current();
  if (t0 === undefined) return null;
  const base = cursor.pos;
  const t0pos4 = t0.pos & POS4;
  const t0pos5A = t0.pos & POS5A;

  let form: ScopeBridgeForm;
  let particle: ScopeBridgeParticle;
  let markerTagging: ScopeBridgeOp["markerTagging"];

  if (head === "koto" && (t0.surface === "は" || t0.surface === "も") && (t0.pos & POS1) === 係助詞) {
    form = "topic";
    particle = t0.surface === "も" ? "mo" : "wa";
    cursor.advance();
  } else if (t0.surface === "じゃ" && (t0pos4 & POS4) === 助動詞_ダ && t0pos5A === 連用形_) {
    if (head === null) {
      return null;
    }
    form = "ja";
    particle = null;
    markerTagging = "copula";
    cursor.advance();
  } else if (t0.surface === "でも" && (t0.pos & POS1) === 副助詞) {
    form = "demo";
    particle = "mo";
    markerTagging = "particle";
    cursor.advance();
  } else {
    const focusBridge = dewaScopeBridgeRelationAt(cursor.tokens, cursor.pos, {
      anchorIdx: cursor.pos,
      consumers: ["tail_multi_clause"]
    });
    if (focusBridge === null || focusBridge.focusParticle === undefined) {
      return null;
    }
    form = focusBridge.focusParticle === "mo" ? "demo" : "dewa";
    particle = focusBridge.focusParticle;
    markerTagging = focusBridge.markerKind;
    if (
      (particle === "shika" || particle === "sae") &&
      !(head === null && options.allowFocusIdentityParticles === true)
    ) {
      return null;
    }
    cursor.advance(focusBridge.span.endExclusive - cursor.pos);
  }

  const tail = cursor.current();
  if (
    options.allowElidedNegativeBody === true &&
    head === "no" &&
    form === "dewa" &&
    (
      tail === undefined ||
      nextNonSpaceIndex(cursor.tokens, cursor.pos, cursor.end) === null ||
      quoteMarkerClosesUtteranceAfter(null, cursor.tokens, cursor.pos)
    )
  ) {
    return buildScopeBridgeOp(
      srcSlice(cursor.tokens, base, cursor.pos - base),
      head,
      form,
      particle,
      "negative",
      1,
      false,
      markerTagging
    );
  }
  if (tail === undefined) {
    return null;
  }

  const body = consumeScopeBridgeBody(cursor, form, base);
  if (body === null) {
    return null;
  }
  return buildScopeBridgeOp(
    srcSlice(cursor.tokens, base, cursor.pos - base),
    head,
    form,
    particle,
    body.polarity,
    body.chainDepth,
    body.polite,
    markerTagging,
    body.conjecture
  );
}

interface ScopeBridgeBody {
  readonly polarity: ScopeBridgeOp["polarity"];
  readonly chainDepth: number;
  readonly polite: boolean;
  readonly conjecture?: boolean;
}

function consumeScopeBridgeBody(
  cursor: TokenCursor<RuntimeHaruToken>,
  form: ScopeBridgeForm,
  markerBase: number
): ScopeBridgeBody | null {
  const tail = cursor.current();
  if (tail === undefined) {
    return null;
  }

  const politeNeg = consumePoliteNegationEnding(cursor);
  if (politeNeg !== null && politeNeg.polite) {
    return { polarity: "negative", chainDepth: 1, polite: true };
  }

  const negChain = collectScopeBridgeNegationChain(cursor);
  if (negChain !== null) {
    return {
      polarity: "negative",
      chainDepth: negChain.depth,
      polite: false,
      ...(negChain.conjecture ? { conjecture: true } : {})
    };
  }

  if (isAffirmativeCopulaSupportVerbToken(tail)) {
    if (form === "demo" && whIndefiniteDemoHostBefore(cursor.tokens, markerBase)) {
      return null;
    }
    const tailPos5A = tail.pos & POS5A;
    if (
      tailPos5A === 連用形_ &&
      isUnrealizableCopulaPoliteAuxiliaryMood(cursor.tokens[cursor.pos + 1])
    ) {
      return null;
    }
    if (
      tailPos5A === 終止形_ ||
      tailPos5A === 連用形_ ||
      tailPos5A === 連体形_
    ) {
      cursor.advance();
      return { polarity: "affirmative", chainDepth: 0, polite: isGozaruPoliteSupportToken(tail) };
    }
  }

  return null;
}

export function scopeBridgeBodyClosesAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  form: ScopeBridgeForm,
  markerBase: number
): boolean {
  return consumeScopeBridgeBody(cursor, form, markerBase) !== null;
}

export function matchScopeBridgeBeforeBasicCopula(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly allowFocusIdentityBridge?: boolean } = {}
): ScopeBridgeOp | null {
  return cursor.tx(c => {
    const bridge = matchScopeBridgeTail(c, null, {
      allowFocusIdentityParticles: options.allowFocusIdentityBridge === true
    });
    if (bridge === null) return null;
    if (bridge.form === "demo") return bridge;
    if (bridge.particle === "shika" || bridge.particle === "sae") return bridge;
    if (bridge.form === "dewa" && bridge.polarity === "affirmative") {
      const followingIdx = nextNonSpaceIndex(c.tokens, c.pos, c.end);
      const following = followingIdx === null ? undefined : c.tokens[followingIdx];
      if (following !== undefined && (following.pos & POS4) === 助動詞_マイ) {
        return null;
      }
      return bridge;
    }
    return null;
  });
}

export function focusBodyOverNegativeScopeBridgeAt(
  tokens: readonly RuntimeHaruToken[],
  hostIdx: number
): boolean {
  const bridge = matchScopeBridgeBeforeBasicCopula(new TokenCursor(tokens, hostIdx + 1));
  if (bridge === null || bridge.head !== null || bridge.polarity !== "negative") {
    return false;
  }
  const indices = bridge.source.tokenIndices;
  const negIdx = indices[indices.length - 1];
  if (negIdx === undefined || ((tokens[negIdx]?.pos ?? 0) & POS5A) !== 連用形_) {
    return false;
  }
  const focus = tokens[negIdx + 1];
  if (
    focus === undefined ||
    (focus.pos & POS1) !== 係助詞 ||
    (focus.surface !== "は" && focus.surface !== "も")
  ) {
    return false;
  }
  return scopeBridgeBodyClosesAt(
    new TokenCursor(tokens, negIdx + 2),
    "topic",
    negIdx + 1
  );
}

export function matchElidedNominalizerScopeBridge(
  cursor: TokenCursor<RuntimeHaruToken>,
  previousOp: AuxOpNode | undefined
): ScopeBridgeOp | null {
  if (previousOp?.kind !== "tense" || previousOp.tense !== "past") {
    return null;
  }
  const t0 = cursor.current();
  if (
    t0 === undefined ||
    t0.surface !== "じゃ" ||
    (t0.pos & POS4) !== 助動詞_ダ ||
    (t0.pos & POS5A) !== 連用形_
  ) {
    return null;
  }
  return cursor.tx(c => {
    const bridge = matchScopeBridgeTail(c, "no");
    if (bridge === null || bridge.polarity !== "negative" || bridge.polite) {
      return null;
    }
    const tail = c.current();
    if (
      tail === undefined ||
      (tail.pos & POS4) !== 助動詞_タ ||
      (tail.pos & POS5A) !== 終止形_
    ) {
      return null;
    }
    return bridge;
  });
}

export function canStartScopeBridgeBeforeBasicCopula(
  tokens: readonly RuntimeHaruToken[],
  pos: number
): boolean {
  return new TokenCursor(tokens, pos)
    .lookahead(0, c => matchScopeBridgeBeforeBasicCopula(c, { allowFocusIdentityBridge: true })) !== null;
}

export function matchImplicitNegativeFocusBridge(
  cursor: TokenCursor<RuntimeHaruToken>,
  stemNode: StemNode,
  previousOp: AuxOpNode | undefined
): ScopeBridgeOp | null {
  const ownsInnerNegative =
    previousOp?.kind === "negation" ||
    (previousOp?.kind === "copula" && previousOp.polarity === "negative") ||
    (previousOp === undefined && stemNode.commitment === "suppletive_negation");
  if (!ownsInnerNegative) {
    return null;
  }
  const particleToken = cursor.current();
  if (
    particleToken === undefined ||
    (particleToken.surface !== "は" && particleToken.surface !== "も") ||
    (particleToken.pos & POS1) !== 係助詞
  ) {
    return null;
  }
  const base = cursor.pos;
  cursor.advance();

  const politeNeg = consumePoliteNegationEnding(cursor);
  if (politeNeg !== null && politeNeg.polite) {
    return buildScopeBridgeOp(
      srcSlice(cursor.tokens, base, cursor.pos - base),
      "implicit",
      "topic",
      particleToken.surface === "も" ? "mo" : "wa",
      "negative",
      1,
      true
    );
  }

  const negChain = collectScopeBridgeNegationChain(cursor);
  if (negChain === null) {
    return null;
  }
  return buildScopeBridgeOp(
    srcSlice(cursor.tokens, base, cursor.pos - base),
    "implicit",
    "topic",
    particleToken.surface === "も" ? "mo" : "wa",
    "negative",
    negChain.depth,
    false,
    undefined,
    negChain.conjecture
  );
}

function consumePoliteNegationEnding(
  cursor: TokenCursor<RuntimeHaruToken>
): ReturnType<typeof consumeNegationEnding> {
  return cursor.tx(c => {
    const match = consumeNegationEnding(c, { allowAttributive: true });
    if (match === null || !match.polite) {
      return null;
    }
    return match;
  });
}

function scopeBridgeConditionalBaFollowsAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  index: number
): boolean {
  if (index >= cursor.end) {
    return false;
  }
  const relation = conditionalTailConnectiveRelationForToken(cursor.tokens[index], index, {
    consumers: ["tail_multi_clause"]
  });
  return relation !== null && relation.connectiveKind === "conditional";
}

function collectScopeBridgeNegationChain(
  cursor: TokenCursor<RuntimeHaruToken>
): { readonly depth: number; readonly conjecture: boolean } | null {
  let depth = 0;
  let conjecture = false;
  for (let tok = cursor.current(); tok !== undefined && isNaiOrNuToken(tok); tok = cursor.current()) {
    const pos5A = tok.pos & POS5A;
    if (
      matchNegationEnding(cursor.tokens, cursor.pos, { allowConjecture: true })?.conjecture === true
    ) {
      depth += 1;
      conjecture = true;
      cursor.advance();
      break;
    }
    const accepted =
      pos5A === 終止形_ ||
      pos5A === 連用形_ ||
      pos5A === 連体形_ ||
      (isConditionalInflection(tok.pos) && scopeBridgeConditionalBaFollowsAt(cursor, cursor.pos + 1));
    if (!accepted) break;
    depth += 1;
    cursor.advance();
    if (pos5A === 連用形_) continue;
    break;
  }
  if (depth === 0) return null;
  return { depth, conjecture };
}

export function isLikenessCarrierStemToken(token: RuntimeHaruToken | undefined): boolean {
  return appearancePerceptionProjectionForToken(token) === "attributive_like";
}

export function likenessEvaluativeConditionMarkerEndAt(
  cursor: TokenCursor<RuntimeHaruToken>
): number | null {
  const { tokens, pos: index } = cursor;
  if (!isLikenessCarrierStemToken(tokens[index])) {
    return null;
  }
  const bridgeCloses = (markerConsumed: number, form: ScopeBridgeForm): boolean =>
    cursor.lookahead(
      markerConsumed,
      c => (scopeBridgeBodyClosesAt(c, form, index + 1) ? true : null)
    ) === true;
  if (isFusedCopulaDewaFocusToken(tokens[index + 1])) {
    return index + 2 <= cursor.end &&
      !bridgeCloses(2, "ja") &&
      !likenessNegativeScopeBodyFollowsAt(tokens, index + 2)
      ? index + 2
      : null;
  }
  const dewa = dewaScopeBridgeRelationAt(tokens, index + 1, {
    anchorIdx: index,
    consumers: ["tail_multi_clause"]
  });
  if (dewa === null || dewa.focusParticle !== "wa" || dewa.span.endExclusive > cursor.end) {
    return null;
  }
  if (likenessNegativeScopeBodyFollowsAt(tokens, dewa.span.endExclusive)) {
    return null;
  }
  return bridgeCloses(dewa.span.endExclusive - index, "dewa") ? null : dewa.span.endExclusive;
}

export function copulaFocusScopeBodyIdentityAt(
  tokens: readonly RuntimeHaruToken[],
  bodyIdx: number,
  lookups: LookupTables
): boolean {
  const token = tokens[bodyIdx];
  if (token === undefined) {
    return false;
  }
  return isNaiOrNuToken(token) ||
    isFusedNegativeStateChangeVerbToken(token, lookups) ||
    isAffirmativeCopulaSupportVerbToken(token);
}

export function likenessNegativeScopeBodyFollowsAt(
  tokens: readonly RuntimeHaruToken[],
  bodyIdx: number
): boolean {
  const token = tokens[bodyIdx];
  return token !== undefined && isNaiOrNuToken(token);
}

export const LIKENESS_CONDITION_CONSEQUENT_BLOCKERS: ReadonlySet<UtteranceClosureKind> =
  new Set<UtteranceClosureKind>([
    "eos",
    "hard_terminal",
    "matched_delimiter_close",
    "unmatched_trailing",
    "weak_pause",
    "clause_boundary"
  ]);

export function likenessEvaluativeConditionHasConsequentAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  markerEndExclusive: number
): boolean {
  const scope = activeProtoLayout();
  const tokens = cursor.tokens;
  let probe = markerEndExclusive;
  for (;;) {
    const closure = utteranceClosureAfter(scope, tokens, probe);
    if (closure.closure === "weak_pause") {
      probe = closure.tokenIdx + 1;
      continue;
    }
    const closureIdx = utteranceClosureTokenIdx(closure);
    if (closureIdx === null || closesUtteranceAs(closure, LIKENESS_CONDITION_CONSEQUENT_BLOCKERS)) {
      return false;
    }
    const token = tokens[closureIdx];
    if (token !== undefined && (token.pos & POS01) === 助詞_終助詞) {
      probe = closureIdx + 1;
      continue;
    }
    return true;
  }
}

export function likenessEvaluativeConditionMarkerStartEndingAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  end: number
): number | null {
  for (const markerTokens of [1, 2]) {
    const carrierIdx = end - markerTokens;
    if (carrierIdx < 0) continue;
    const probe = cursor.fork(carrierIdx, cursor.end, carrierIdx);
    if (likenessEvaluativeConditionMarkerEndAt(probe) === end + 1) {
      return carrierIdx + 1;
    }
  }
  return null;
}
