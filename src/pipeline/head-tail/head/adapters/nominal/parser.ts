import { activeProtoLayout } from "../../../../clause-layout/proto-state.js";
import type { IrregularType } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { PredicateProjectionKind, ProjectionEvidenceScope, ProjectionHeadModifierKind } from "../../../grammar.js";
import { formatCategoryMemberSurface, type NumericTables } from "../../../../../generator/numeric-lookup.js";
import { readNumeralToken } from "../../../../../generator/numerals.js";
import { loadNominalFrameSpecsBySurface } from "./frame-table.js";
import { TAME_FORMS, type LookupTables } from "../../../../lookup-tables.js";
import { isPersonToken } from "../../../candidate/semantic-classifiers.js";
import type { ProjectionEvidenceLayout } from "../../../../clause-layout/layout-types.js";
import {
  SEPARATION_BREAKS_MORPHEME_CHAIN,
  nextNonSpaceIndex,
  previousNonSpaceIndex,
  separatedAs
} from "../../../../clause-layout/trivia.js";
import {
  collectFollowingNounPhraseTokens,
  collectFollowingProjectionBoundaryContext,
  collectFollowingProjectionContextTokens,
  collectPrecedingProjectionBoundaryContext,
  collectPrecedingProjectionContextTokens,
  projectionSelectorBoundsForToken
} from "../../../candidate/context.js";
import type { ClauseBoundary } from "../../../tail/predicate-root/commit.js";
import type {
  HostBearingLikenessModal,
  NominalFrame,
  NominalFrameKind,
  NominalFrameParse,
  NominalFrameSpec,
  NominalHeadAllomorphHintSource,
  NominalHead,
  NominalHeadLexicalForms,
  NominalFrameCommitContext,
  NominalSourceSpan,
  HostBearingLikenessNode,
  NominalPhraseNode,
  NominalRoot,
  PredicateNominalHostNode,
  PredicateNominalProjectionHost,
  ProductiveAdjectivalSuffixKind
} from "./grammar.js";
import { whIndefiniteKaConstructionAdmittedAt } from "./owner-arbitration.js";
import { renyouNominalHeadFrameHostAt } from "./renyou-nominal-head.js";
import type { NominalHeadTailChainPlan } from "../../../lifecycle/head-tail-render-plan.js";
import type { TailRoot } from "../../../tail/predicate-root/grammar.js";
import { projectionCandidateSelectorMatches, projectionTokenMatches, type ProjectionHeadModifierContext } from "../../../candidate/selector.js";
import { quoteClauseBoundaryFromRelation } from "../../../../structural-relation/quote-clause-boundary.js";
import { quoteStructuralRelationStartingAt } from "../../../../structural-relation/quote.js";
import {
  quoteFocusLimitNegationTailStartingAt,
  quoteFocusMarkerStartingAt
} from "../../../tail/segments/quote-focus.js";
import { TokenCursor } from "../../../../token-cursor.js";
import {
  isParentheticalClosingToken,
  parentheticalSpanEndingAt
} from "../../../boundary/parenthetical.js";
import {
  dewaScopeBridgeRelationAt,
  kaMarkerRelationAt,
  nominalLinkMarkerRelationAt,
  predicateNominalizerRelationForToken
} from "../../../boundary/marker.js";
import { tokenMatchesConnectiveKind } from "../../../tail/connective-span-scanner.js";
import { quoteMarkerRelationAt } from "../../../boundary/quote-marker.js";
import { closesWithClauseFinalPredicate } from "../../../../clause-layout/speech-act.js";

import {
  POS0,
  POS01,
  pos0in,
  POS1,
  POS4,
  POS5,
  POS5A,
  形状詞,
  形容詞0,
  固有名詞,
  終止形_,
  助詞,
  助動詞 as 助動詞0,
  助動詞_ダ,
  助動詞語幹,
  数詞,
  接尾辞,
  接尾辞_名詞的,
  代名詞,
  動詞,
  副詞,
  補助記号,
  名詞,
  連体形_,
  連用形_,
  連用形_ニ,
  連体詞,
  명사,
  형용사, 名詞_数詞,
} from "../../../../../types/pos.js";
import { createConnectiveOp, createModalOp } from "../../../tail/predicate-root/op-builders.js";
const NOMINAL_HEAD_POS0_SET = new Set([名詞, 代名詞, 数詞]);
const CONTENT_MODIFIER_POS0_BITS: number = (1 << 名詞) | (1 << 代名詞) | (1 << 数詞) | (1 << 連体詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 助動詞0) | (1 << 接尾辞);
const MAX_NOMINAL_FRAME_SURFACE_ITEMS = 8;

interface SurfaceItem {
  readonly index: number;
  readonly surface: string;
}

export interface PredicateNominalHostFrameCandidate {
  readonly hostEnd: number;
  readonly nominalizerStart: number;
  readonly nominalizerEnd: number;
  readonly nominalizerKind: PredicateNominalHostNode["nominalizer"]["kind"];
  readonly hostProjection: PredicateProjectionKind;
  readonly frame: NominalFrame;
  readonly nextIndex: number;
}

type NominalFrameParseCache = Map<string, NominalFrameParse | null>;

const NO_LAYOUT = {};
const nominalFrameParseCache = new WeakMap<readonly RuntimeHaruToken[], WeakMap<object, WeakMap<object, NominalFrameParseCache>>>();

function buildNominalFrameFromSpec(
  spec: NominalFrameSpec,
  tokens: readonly RuntimeHaruToken[],
  markerStart: number,
  lastIndex: number
): NominalFrame {
  return {
    kind: "nominalFrame",
    id: spec.id,
    frameKind: spec.kind,
    markerSurface: spec.surface,
    projection: spec.projection,
    ...(spec.outputPos === undefined ? {} : { outputPos: spec.outputPos }),
    focus: spec.focus,
    ...(spec.ownerMode === undefined ? {} : { ownerMode: spec.ownerMode }),
    ...(spec.ownerArbitration === undefined ? {} : { ownerArbitration: spec.ownerArbitration }),
    ...(spec.predicatePreference === undefined ? {} : { predicatePreference: spec.predicatePreference }),
    ...(spec.requiresFollowingContent === undefined ? {} : { requiresFollowingContent: spec.requiresFollowingContent }),
    ...(spec.attachLeft === undefined ? {} : { attachLeft: spec.attachLeft }),
    source: {
      start: markerStart,
      end: lastIndex + 1,
      tokens: tokens.slice(markerStart, lastIndex + 1)
    }
  };
}

export function tryParseNominalFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly layout?: ProjectionEvidenceLayout; readonly lookups: LookupTables; readonly numeric: NumericTables }
): NominalFrameParse | null {
  const cacheKey = `${cursor.pos}:${cursor.end}`;
  const cache = nominalFrameParseCacheFor(cursor.tokens, options.layout, options.lookups);
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }
  const result = tryParseNominalFrameUncached(cursor, options);
  cache.set(cacheKey, result);
  return result;
}

function tryParseNominalFrameUncached(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly layout?: ProjectionEvidenceLayout; readonly lookups: LookupTables; readonly numeric: NumericTables }
): NominalFrameParse | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const host = previousNominalHead(tokens, markerStart - 1, options.lookups);
  const relaxedHost = host ?? previousNominalHead(tokens, markerStart - 1, options.lookups, { allowTrailingHostTokens: true });
  if (relaxedHost === null) {
    return null;
  }
  const apposition = host === null ? null : tryParseAppositionFrame(cursor, host, options.lookups);
  if (apposition !== null) {
    return apposition;
  }
  const categoryMember = host === null ? null : tryParseCategoryMemberFrame(cursor, host, options.numeric);
  if (categoryMember !== null) {
    return categoryMember;
  }
  const match = matchNominalFrameSpec(
    cursor,
    nominalHeadSelectorToken(relaxedHost),
    options.lookups,
    options,
    nominalHeadModifierContext(tokens, relaxedHost, options.layout)
  );
  if (match === null) {
    return host === null ? null : tryParseLocationNounModifierFrame(cursor, host, options.lookups);
  }
  if (isNominalizerNoHead(relaxedHost) && !nominalizerNoHostCanUseFrame(match.spec)) {
    return null;
  }
  if (
    host === null &&
    !isStructuredNominalHead(relaxedHost) &&
    !isNominalizerNoHead(relaxedHost) &&
    !(isQuotedNominalHead(relaxedHost) && quotedHeadFrameEligible(match.spec.kind)) &&
    match.spec.kind !== "host_bearing_likeness"
  ) {
    return null;
  }
  const lastIndex = consumeFollowingLastIndex(
    match.spec,
    tokens,
    nominalHeadSelectorToken(relaxedHost),
    match.lastIndex,
    limit,
    options.lookups
  );
  const frame = buildNominalFrameFromSpec(match.spec, tokens, markerStart, lastIndex);
  const root: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: relaxedHost,
    frames: [frame],
    source: {
      start: nominalHeadSourceStart(relaxedHost),
      end: lastIndex + 1,
      tokens: tokens.slice(nominalHeadSourceStart(relaxedHost), lastIndex + 1)
    }
  };
  return {
    root,
    frame,
    consumed: lastIndex + 1 - markerStart,
    nextIndex: nextNonSpaceIndex(tokens, lastIndex + 1, limit) ?? limit
  };
}

function consumeFollowingLastIndex(
  spec: NominalFrameSpec,
  tokens: readonly RuntimeHaruToken[],
  head: RuntimeHaruToken | undefined,
  lastIndex: number,
  limit: number,
  lookups: LookupTables
): number {
  const rules = spec.consumeFollowing;
  if (rules === undefined) {
    return lastIndex;
  }
  for (const rule of rules) {
    if (!projectionTokenMatches(head, rule.head, lookups)) {
      continue;
    }
    const surfaces = new Set(rule.surfaces);
    let joined = "";
    let idx = nextNonSpaceIndex(tokens, lastIndex + 1, limit);
    for (let step = 0; step < rule.maxTokens && idx !== null; step += 1) {
      const token = tokens[idx];
      if (token === undefined) {
        break;
      }
      joined += token.surface;
      if (surfaces.has(joined) || (step === 0 && surfaces.has(token.dictionaryForm))) {
        return idx;
      }
      idx = nextNonSpaceIndex(tokens, idx + 1, limit);
    }
  }
  return lastIndex;
}

function nominalFrameParseCacheFor(
  tokens: readonly RuntimeHaruToken[],
  layout: ProjectionEvidenceLayout | undefined,
  lookups: LookupTables
): NominalFrameParseCache {
  let byLayout = nominalFrameParseCache.get(tokens);
  if (byLayout === undefined) {
    byLayout = new WeakMap();
    nominalFrameParseCache.set(tokens, byLayout);
  }
  const layoutKey = layout ?? NO_LAYOUT;
  let byContext = byLayout.get(layoutKey);
  if (byContext === undefined) {
    byContext = new WeakMap();
    byLayout.set(layoutKey, byContext);
  }
  const contextKey = activeProtoLayout() ?? lookups;
  let cache = byContext.get(contextKey);
  if (cache === undefined) {
    cache = new Map();
    byContext.set(contextKey, cache);
  }
  return cache;
}

function tryParseLocationNounModifierFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  host: NominalHead,
  lookups: LookupTables
): NominalFrameParse | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const marker = tokens[markerStart];
  if (marker === undefined || nominalLinkMarkerRelationAt(tokens, markerStart, { consumers: ["nominal_head_parser"] }) === null) {
    return null;
  }
  const locationIndex = nextNonSpaceIndex(tokens, markerStart + 1, limit) ?? limit;
  const location = tokens[locationIndex];
  if (location === undefined || (location.pos & POS0) !== 名詞) {
    return null;
  }
  const locationForm = location.dictionaryForm || location.surface;
  if (!lookups.SEMANTIC_NOMINAL_LOCATION_HEADS.has(locationForm) && !lookups.SEMANTIC_NOMINAL_LOCATION_HEADS.has(location.surface)) {
    return null;
  }
  const frame: NominalFrame = {
    kind: "nominalFrame",
    id: "nominal_modifier_no_location_head",
    frameKind: "nominal_modifier",
    markerSurface: marker.surface,
    projection: { kind: "deterministic", korean: "" },
    focus: null,
    source: sourceSpan(tokens, markerStart, markerStart + 1)
  };
  const root: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: host,
    frames: [frame],
    source: sourceSpan(tokens, nominalHeadSourceStart(host), markerStart + 1)
  };
  return {
    root,
    frame,
    consumed: 1,
    nextIndex: locationIndex
  };
}

function tryParseAppositionFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  host: NominalHead,
  lookups: LookupTables
): NominalFrameParse | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const marker = tokens[markerStart];
  if (marker === undefined || nominalLinkMarkerRelationAt(tokens, markerStart, { consumers: ["nominal_head_parser"] }) === null) {
    return null;
  }
  if (!isPersonToken(host.token, lookups)) {
    return null;
  }
  const nextIndex = nextNonSpaceIndex(tokens, markerStart + 1, limit) ?? limit;
  const next = tokens[nextIndex];
  if (next === undefined) {
    return null;
  }
  const isReferentFixedPronoun = (next.pos & POS0) === 代名詞 &&
    lookups.APPOSITION_REFERENT_FIXED_PRONOUNS.has(next.dictionaryForm);
  if ((next.pos & POS1) !== 固有名詞 && !isReferentFixedPronoun) {
    return null;
  }
  const properSplitB = next.splitB ?? [];
  const isMistaggedProperCompound = properSplitB.length >= 2
    && properSplitB.every((sub) => (sub.pos & POS0) === 名詞 && (sub.pos & POS1) !== 固有名詞);
  if (isMistaggedProperCompound) {
    return null;
  }
  const frame: NominalFrame = {
    kind: "nominalFrame",
    id: "nominal_apposition_person_proper",
    frameKind: "apposition",
    markerSurface: marker.surface,
    projection: { kind: "deterministic", korean: "인" },
    focus: null,
    source: {
      start: markerStart,
      end: markerStart + 1,
      tokens: [marker]
    }
  };
  const root: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: host,
    frames: [frame],
    source: {
      start: nominalHeadSourceStart(host),
      end: markerStart + 1,
      tokens: tokens.slice(nominalHeadSourceStart(host), markerStart + 1)
    }
  };
  return {
    root,
    frame,
    consumed: 1,
    nextIndex
  };
}

function tryParseCategoryMemberFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  host: NominalHead,
  numeric: NumericTables
): NominalFrameParse | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const marker = tokens[markerStart];
  if (marker === undefined || nominalLinkMarkerRelationAt(tokens, markerStart, { consumers: ["nominal_head_parser"] }) === null) {
    return null;
  }
  const numberIndex = nextNonSpaceIndex(tokens, markerStart + 1, limit) ?? limit;
  const numberToken = tokens[numberIndex];
  if (
    numberToken === undefined || (numberToken.pos & POS01) !== 名詞_数詞
  ) {
    return null;
  }
  const counterIndex = nextNonSpaceIndex(tokens, numberIndex + 1, limit) ?? limit;
  const counterToken = tokens[counterIndex];
  const counterKey = counterToken?.dictionaryForm;
  if (counterToken === undefined || counterKey === undefined || !numeric.CATEGORY_MEMBER_COUNTERS.has(counterKey)) {
    return null;
  }
  const reading = readNumeralToken(numberToken, {
    zeroQuantitySurfaces: numeric.ZERO_QUANTITY_NUMERALS,
    counterCombined: true
  });
  const parsed = reading?.value;
  if (typeof parsed !== "number") {
    return null;
  }
  const maybeOrdinalIndex = nextNonSpaceIndex(tokens, counterIndex + 1, limit) ?? limit;
  const ordinal = counterKey === "つ" && tokens[maybeOrdinalIndex]?.surface === "目";
  const end = ordinal ? maybeOrdinalIndex + 1 : counterIndex + 1;
  const memberSurface = formatCategoryMemberSurface(parsed, counterKey, {
    ordinal,
    positional: reading?.positional === true,
    arabicSurface: reading?.realization ?? null
  });
  if (memberSurface === undefined) {
    return null;
  }
  const sourceTokens = tokens.slice(markerStart, end);
  const markerSurface = sourceTokens.map((token) => token.surface).join("");
  const frame: NominalFrame = {
    kind: "nominalFrame",
    id: `nominal_category_member:${markerSurface}`,
    frameKind: "category_member",
    markerSurface,
    projection: { kind: "deterministic", korean: ` 중 ${memberSurface}` },
    outputPos: 명사,
    focus: null,
    source: {
      start: markerStart,
      end,
      tokens: sourceTokens
    }
  };
  const root: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: host,
    frames: [frame],
    source: {
      start: nominalHeadSourceStart(host),
      end,
      tokens: tokens.slice(nominalHeadSourceStart(host), end)
    }
  };
  return {
    root,
    frame,
    consumed: end - markerStart,
    nextIndex: nextNonSpaceIndex(tokens, end, limit) ?? limit
  };
}

export function buildNominalTailChainPlan(
  parse: NominalFrameParse,
  options: NominalFrameHydrationOptions = {}
): NominalHeadTailChainPlan {
  const hydrated = hydrateNominalFrameParse(parse, options);
  const root = hydrated.root;
  const headTokenIdx = nominalRootHeadTokenIdx(root);
  return {
    kind: "headTailChain",
    realization: {
      kind: "nominal",
      root,
      frame: hydrated.frame,
      markerSpan: { start: hydrated.frame.source.start, end: hydrated.frame.source.end },
      headMarkerSpan: { start: root.source.start, end: root.source.end },
      owner: root.kind === "predicateNominalHost" || hydrated.frame.ownerMode === "phrase_owner"
        ? {
          kind: "phrase_owner",
          provenance: "nominal_head"
        }
        : {
          kind: "marker_adapter",
          provenance: "assembler"
        },
      hostTokenIdx: headTokenIdx,
      markerTokenIdx: hydrated.frame.source.start,
      ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
    }
  };
}

export function tryMatchPredicateNominalHostFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
): PredicateNominalHostFrameCandidate | null {
  const { tokens, end: limit } = cursor;
  const quoted = tryMatchQuotedPredicateNominalHostFrame(cursor, lookups);
  if (quoted !== null) {
    return quoted;
  }
  const nominalizer = findPredicateNominalHostMarker(cursor);
  if (nominalizer === null) {
    return null;
  }
  const frameMatch = tryMatchNominalFrameAt(
    cursor.fork(nominalizer.frameStart, limit),
    lookups,
    tokens[nominalizer.nominalizerStart]
  );
  if (frameMatch === null) {
    return null;
  }
  return {
    hostEnd: nominalizer.hostEnd,
    nominalizerStart: nominalizer.nominalizerStart,
    nominalizerEnd: nominalizer.nominalizerEnd,
    nominalizerKind: nominalizer.kind,
    hostProjection: nominalizer.hostProjection,
    frame: frameMatch.frame,
    nextIndex: frameMatch.nextIndex
  };
}

function tryMatchQuotedPredicateNominalHostFrame(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): PredicateNominalHostFrameCandidate | null {
  const { tokens, pos: predicateStart, end: limit } = cursor;
  const maxScan = Math.min(limit, predicateStart + 12);
  for (let index = predicateStart + 1; index < maxScan; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    if (quoteMarkerRelationAt(tokens, index, { consumers: ["nominal_head_parser"] })?.canonicalSurface === "と") {
      const leftIdx = previousNonSpaceIndex(tokens, index, predicateStart);
      const left = leftIdx === null ? undefined : tokens[leftIdx];
      if (
        leftIdx === null ||
        left === undefined ||
        !(closesWithClauseFinalPredicate(tokens, leftIdx) || (left.pos & POS0) === 形状詞)
      ) {
        return null;
      }
      const frameMatch = tryMatchNominalFrameAt(cursor.fork(index, limit), lookups);
      if (frameMatch === null || frameMatch.frame.frameKind !== "definition_topic") {
        return null;
      }
      return {
        hostEnd: index,
        nominalizerStart: index,
        nominalizerEnd: index + 1,
        nominalizerKind: "quote",
        hostProjection: "quoted_nominalizer",
        frame: frameMatch.frame,
        nextIndex: frameMatch.nextIndex
      };
    }
    if (
      (token.pos & POS0) !== 動詞 &&
      (token.pos & POS0) !== 形容詞0 &&
      (token.pos & POS0) !== 形状詞 &&
      (token.pos & POS0) !== 助動詞0 &&
      (token.pos & POS0) !== 助詞 &&
      (token.pos & POS0) !== 接尾辞
    ) {
      return null;
    }
  }
  return null;
}

export function buildPredicateNominalFramePlan(
  tokens: readonly RuntimeHaruToken[],
  candidate: PredicateNominalHostFrameCandidate,
  host: PredicateNominalProjectionHost,
  options: NominalFrameHydrationOptions = {}
): { readonly plan: NominalHeadTailChainPlan; readonly parse: NominalFrameParse; readonly consumed: number } {
  const parse = buildPredicateNominalFrameParse({
    tokens,
    host,
    nominalizerStart: candidate.nominalizerStart,
    nominalizerEnd: candidate.nominalizerEnd,
    nominalizerKind: candidate.nominalizerKind,
    frame: candidate.frame,
    nextIndex: candidate.nextIndex
  });
  return {
    parse,
    plan: buildNominalTailChainPlan(parse, options),
    consumed: parse.root.source.end - parse.root.source.start
  };
}

export function buildHostBearingLikenessTailChainPlan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hostTokenIdx: number;
  readonly markerStart: number;
  readonly modal: HostBearingLikenessModal;
  readonly head?: {
    readonly allomorphHint?: string | null;
    readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
    readonly allomorphCanonicalKorean?: string | null;
    readonly allomorphKoreanPos?: number | null;
  };
  readonly commitContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly nextIndex: number;
  } & Pick<NominalFrameCommitContext, "layout">;
}): NominalHeadTailChainPlan {
  const hostToken = options.tokens[options.hostTokenIdx];
  if (hostToken === undefined) {
    throw new Error(`host-bearing likeness host token missing at ${options.hostTokenIdx}`);
  }
  const sourceStart = options.hostTokenIdx;
  const sourceEnd = options.modal.source.end;
  const markerTokens = options.tokens.slice(options.markerStart, sourceEnd);
  const hint = options.head?.allomorphHint;
  const host: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: {
      kind: "token",
      tokenIndex: options.hostTokenIdx,
      token: hostToken,
      allomorphHint: hint === undefined || hint === null
        ? null
        : {
          korean: hint,
          source: options.head?.allomorphHintSource ?? "assembler_previous_unit",
          ...(options.head?.allomorphCanonicalKorean === undefined || options.head.allomorphCanonicalKorean === null
            ? {}
            : { canonicalKorean: options.head.allomorphCanonicalKorean }),
          ...(options.head?.allomorphKoreanPos === undefined || options.head.allomorphKoreanPos === null
            ? {}
            : { koreanPos: options.head.allomorphKoreanPos })
        }
    },
    frames: [],
    source: {
      start: options.hostTokenIdx,
      end: options.hostTokenIdx + 1,
      tokens: [hostToken]
    }
  };
  const root: HostBearingLikenessNode = {
    kind: "hostBearingLikeness",
    frame: {
      kind: "hostBearingLikenessFrame",
      host,
      modal: options.modal,
      source: {
        start: sourceStart,
        end: sourceEnd,
        tokens: options.tokens.slice(sourceStart, sourceEnd)
      }
    },
    source: {
      start: sourceStart,
      end: sourceEnd,
      tokens: options.tokens.slice(sourceStart, sourceEnd)
    }
  };
  const clauseBoundary = hostBearingLikenessClauseBoundary(options.modal);
  const frame: NominalFrame = {
    kind: "nominalFrame",
    id: `host_bearing_likeness:${markerTokens.map((token) => token.surface).join("")}`,
    frameKind: "host_bearing_likeness",
    markerSurface: markerTokens.map((token) => token.surface).join(""),
    projection: { kind: "deterministic", korean: "" },
    focus: null,
    source: {
      start: options.markerStart,
      end: sourceEnd,
      tokens: markerTokens
    }
  };
  return {
    kind: "headTailChain",
    ...(clauseBoundary === undefined ? {} : {
      clauseRole: {
        clauseIndex: 0,
        tokenSpan: { start: sourceStart, end: sourceEnd - 1 },
        contentSpan: { start: sourceStart, end: sourceEnd - 1 },
        predicateTokenIdx: options.hostTokenIdx,
        outgoingBoundary: clauseBoundary
      }
    }),
    realization: {
      kind: "nominal",
      root,
      frame,
      markerSpan: { start: frame.source.start, end: frame.source.end },
      headMarkerSpan: { start: root.source.start, end: root.source.end },
      owner: {
        kind: "phrase_owner",
        provenance: "nominal_head"
      },
      hostTokenIdx: options.hostTokenIdx,
      markerTokenIdx: options.markerStart,
      ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
    }
  };
}

function hostBearingLikenessClauseBoundary(modal: HostBearingLikenessModal): ClauseBoundary | undefined {
  switch (modal.kind) {
    case "nominalHostLikenessContinuationProjection": {
      if (modal.boundary.kind !== "terminal") {
        return modal.boundary;
      }
      const youda = modal.ops.find((op) => op.kind === "modal" && op.modal === "youda");
      return youda !== undefined && "terminal" in youda && youda.terminal === "predicative"
        ? modal.boundary
        : undefined;
    }
    case "nominalHostLikenessQuoteFocusLimitNegationProjection":
      return { kind: "terminal" };
    case "nominalHostLikenessProjection":
      return modal.terminal === "predicative" ? { kind: "terminal" } : undefined;
  }
}

export function buildProductiveAdjectivalSuffixTailChainPlan(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hostTokenIdx: number;
  readonly suffixTokenIdx: number;
  readonly suffixKind: ProductiveAdjectivalSuffixKind;
  readonly suffixKoreanLemma: string;
  readonly suffixKoreanIrregular: IrregularType | null;
  readonly projection: ProductiveAdjectivalSuffixNodeProjectionInput;
  readonly sourceEnd: number;
  readonly head?: {
    readonly allomorphHint?: string | null;
    readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
    readonly allomorphCanonicalKorean?: string | null;
    readonly allomorphKoreanPos?: number | null;
  };
  readonly commitContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly nextIndex: number;
  } & Pick<NominalFrameCommitContext, "layout">;
}): NominalHeadTailChainPlan {
  const hostToken = options.tokens[options.hostTokenIdx];
  const suffixToken = options.tokens[options.suffixTokenIdx];
  if (hostToken === undefined) {
    throw new Error(`productive adjectival suffix host token missing at ${options.hostTokenIdx}`);
  }
  if (suffixToken === undefined) {
    throw new Error(`productive adjectival suffix token missing at ${options.suffixTokenIdx}`);
  }
  const hint = options.head?.allomorphHint;
  const host: NominalPhraseNode = {
    kind: "nominalPhrase",
    head: {
      kind: "token",
      tokenIndex: options.hostTokenIdx,
      token: hostToken,
      allomorphHint: hint === undefined || hint === null
        ? null
        : {
          korean: hint,
          source: options.head?.allomorphHintSource ?? "assembler_previous_unit",
          ...(options.head?.allomorphCanonicalKorean === undefined || options.head.allomorphCanonicalKorean === null
            ? {}
            : { canonicalKorean: options.head.allomorphCanonicalKorean }),
          ...(options.head?.allomorphKoreanPos === undefined || options.head.allomorphKoreanPos === null
            ? {}
            : { koreanPos: options.head.allomorphKoreanPos })
        }
    },
    frames: [],
    source: sourceSpan(options.tokens, options.hostTokenIdx, options.hostTokenIdx + 1)
  };
  const markerSource = sourceSpan(options.tokens, options.suffixTokenIdx, options.sourceEnd);
  const root: NominalRoot = {
    kind: "productiveAdjectivalSuffix",
    frame: {
      kind: "productiveAdjectivalSuffixFrame",
      host,
      suffix: {
        kind: options.suffixKind,
        surface: suffixToken.surface,
        source: sourceSpan(options.tokens, options.suffixTokenIdx, options.suffixTokenIdx + 1),
        koreanLemma: options.suffixKoreanLemma,
        koreanPos: 형용사,
        irregular: options.suffixKoreanIrregular
      },
      projection: options.projection,
      source: sourceSpan(options.tokens, options.hostTokenIdx, options.sourceEnd)
    },
    source: sourceSpan(options.tokens, options.hostTokenIdx, options.sourceEnd)
  };
  const frame: NominalFrame = {
    kind: "nominalFrame",
    id: `productive_adjectival_suffix:${suffixToken.dictionaryForm}`,
    frameKind: "productive_adjectival_suffix",
    markerSurface: markerSource.tokens.map((token) => token.surface).join(""),
    projection: { kind: "deterministic", korean: "" },
    focus: null,
    source: markerSource
  };
  return {
    kind: "headTailChain",
    realization: {
      kind: "nominal",
      root,
      frame,
      markerSpan: { start: markerSource.start, end: markerSource.end },
      headMarkerSpan: { start: root.source.start, end: root.source.end },
      owner: {
        kind: "phrase_owner",
        provenance: "nominal_head"
      },
      hostTokenIdx: options.hostTokenIdx,
      markerTokenIdx: options.suffixTokenIdx,
      ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
    }
  };
}

type ProductiveAdjectivalSuffixNodeProjectionInput =
  | {
    readonly kind: "tailRoot";
    readonly root: TailRoot;
  }
  | {
    readonly kind: "adverbial";
    readonly fragment?: boolean;
  }
  | {
    readonly kind: "nominalized";
    readonly nominalizer: {
      readonly surface: string;
      readonly source: NominalSourceSpan;
    };
  };

export function tryBuildHostBearingLikenessTailChainPlanFromModal(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly hostTokenIdx: number;
  readonly modal: HostBearingLikenessModal;
  readonly head?: {
    readonly allomorphHint?: string | null;
    readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
  };
  readonly commitContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly nextIndex: number;
  } & Pick<NominalFrameCommitContext, "layout">;
}): NominalHeadTailChainPlan | null {
  const markerStart = nominalHostLikenessMarkerStart(options.modal);
  if (markerStart === null) {
    return null;
  }
  return buildHostBearingLikenessTailChainPlan({
    tokens: options.tokens,
    hostTokenIdx: options.hostTokenIdx,
    markerStart,
    modal: options.modal,
    ...(options.head === undefined ? {} : { head: options.head }),
    ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
  });
}

export function tryBuildHostBearingLikenessTailChainPlanFromNominalHost(options: {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly lookups: LookupTables;
  readonly head?: {
    readonly allomorphHint?: string | null;
    readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
  };
  readonly commitContext?: {
    readonly tokens: readonly RuntimeHaruToken[];
    readonly nextIndex: number;
  } & Pick<NominalFrameCommitContext, "layout">;
}): NominalHeadTailChainPlan | null {
  const cursor = options.cursor;
  const { tokens, pos: hostTokenIdx } = cursor;
  const match = matchDirectNominalHostLikenessProjection(
    cursor,
    options.lookups
  );
  if (match === null) {
    return null;
  }
  return buildHostBearingLikenessTailChainPlan({
    tokens,
    hostTokenIdx,
    markerStart: match.markerStart,
    modal: match.projection,
    ...(options.head === undefined ? {} : { head: options.head }),
    ...(options.commitContext === undefined ? {} : { commitContext: options.commitContext })
  });
}

function matchDirectNominalHostLikenessProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: hostTokenIdx, end: limit } = cursor;
  const host = cursor.current();
  if (host === undefined || !NOMINAL_HEAD_POS0_SET.has(host.pos & POS0)) {
    return null;
  }
  const markerStart = hostTokenIdx + 1;
  if (markerStart >= limit) {
    return null;
  }
  const first = tokens[markerStart];
  if (first === undefined) {
    return null;
  }
  if (first.surface === "のように" && (first.pos & POS0) === 助詞) {
    return {
      markerStart,
      projection: {
        kind: "nominalHostLikenessProjection",
        form: "youda",
        terminal: "adverbial_ni",
        source: sourceSpan(tokens, markerStart, markerStart + 1)
      }
    };
  }
  const hasNoMarker = nominalLinkMarkerRelationAt(tokens, markerStart, {
    consumers: ["nominal_head_parser"]
  }) !== null;
  const likenessIndex = hasNoMarker ? markerStart + 1 : markerStart;
  const likeness = tokens[likenessIndex];
  if (
    likeness === undefined ||
    (likeness.surface !== "よう" && likeness.surface !== "みたい") ||
    (likeness.pos & POS1) !== 助動詞語幹
  ) {
    return null;
  }
  if (!hasNoMarker && likeness.surface !== "みたい") {
    return null;
  }
  const questionContentRelationProjection = matchCopulaLessLikenessQuestionContentRelation(
    cursor.fork(markerStart, limit),
    likenessIndex,
    lookups
  );
  if (questionContentRelationProjection !== null) {
    return questionContentRelationProjection;
  }
  const copulaLessQuoteFocusLimitProjection = matchCopulaLessLikenessQuoteFocusLimitNegationProjection(
    cursor.fork(markerStart, limit),
    likenessIndex
  );
  if (copulaLessQuoteFocusLimitProjection !== null) {
    return copulaLessQuoteFocusLimitProjection;
  }
  const copulaLessQuoteFocusProjection = matchCopulaLessLikenessQuoteFocusProjection(
    cursor.fork(markerStart, limit),
    likenessIndex
  );
  if (copulaLessQuoteFocusProjection !== null) {
    return copulaLessQuoteFocusProjection;
  }
  const copulaIndex = likenessIndex + 1;
  const copula = tokens[copulaIndex];
  if (copula === undefined || copulaIndex >= limit || (copula.pos & POS4) !== 助動詞_ダ) {
    return null;
  }
  const predicativeQuoteFocusLimitProjection = matchPredicativeLikenessQuoteFocusLimitNegationProjection(
    cursor.fork(markerStart, limit),
    likenessIndex,
    copulaIndex
  );
  if (predicativeQuoteFocusLimitProjection !== null) {
    return predicativeQuoteFocusLimitProjection;
  }
  const predicativeQuoteFocusProjection = matchPredicativeLikenessQuoteFocusProjection(
    cursor.fork(markerStart, limit),
    likenessIndex,
    copulaIndex
  );
  if (predicativeQuoteFocusProjection !== null) {
    return predicativeQuoteFocusProjection;
  }
  const inflection5A = copula.pos & POS5A;
  if (copula.surface === "で" && (copula.pos & POS4) === 助動詞_ダ && inflection5A === 連用形_) {
    return {
      markerStart,
      projection: {
        kind: "nominalHostLikenessContinuationProjection",
        ops: [
          createModalOp({

            modal: "youda",
            source: opSource(tokens, markerStart, likenessIndex + 1),
            form: likeness.surface === "よう" ? "youda" : "mitai",
            terminal: "predicative",
            reading: "likeness",
            candidates: ["likeness"],
            polite: false,
            past: false
          }),
          createConnectiveOp({

            connective: "te_form",
            surface: copula.surface,
            source: opSource(tokens, copulaIndex, copulaIndex + 1)
          })
        ],
        boundary: {
          kind: "接続助詞",
          connectiveKind: "te_form",
          surface: copula.surface,
          tokenIdx: copulaIndex,
          tokenSpan: { start: copulaIndex, end: copulaIndex }
        },
        source: sourceSpan(tokens, markerStart, copulaIndex + 1),
        warnings: []
      }
    };
  }
  const terminal = inflection5A === 連体形_
    ? "attributive_na"
    : (copula.pos & POS5) === 連用形_ニ
      ? "adverbial_ni"
      : null;
  if (terminal === null) {
    return null;
  }
  return {
    markerStart,
    projection: {
      kind: "nominalHostLikenessProjection",
      form: likeness.surface === "よう" ? "youda" : "mitai",
      terminal,
      source: sourceSpan(tokens, markerStart, copulaIndex + 1)
    }
  };
}

function matchCopulaLessLikenessQuestionContentRelation(
  cursor: TokenCursor<RuntimeHaruToken>,
  likenessIndex: number,
  lookups: LookupTables
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const questionIdx = likenessIndex + 1;
  const quoteIdx = likenessIndex + 2;
  if (quoteIdx >= limit) {
    return null;
  }
  const likeness = tokens[likenessIndex];
  if (kaMarkerRelationAt(tokens, questionIdx, ["nominal_head_parser"]) === null) {
    return null;
  }
  const relation = quoteStructuralRelationStartingAt(cursor.fork(questionIdx, tokens.length, questionIdx), lookups, {
    lowerBoundInclusive: markerStart
  });
  const boundary = relation === undefined
    ? null
    : quoteClauseBoundaryFromRelation(tokens, relation, lookups, { lowerBoundInclusive: markerStart });
  if (boundary === null || boundary.kind !== "接続助詞" || boundary.connectiveKind !== "question_quotative") {
    return null;
  }
  return {
    markerStart,
    projection: {
      kind: "nominalHostLikenessContinuationProjection",
      ops: [
        createModalOp({

          modal: "youda",
          source: opSource(tokens, markerStart, likenessIndex + 1),
          form: likeness?.surface === "みたい" ? "mitai" : "youda",
          terminal: "predicative",
          reading: "likeness",
          polite: false,
          past: false
        }),
        createConnectiveOp({

          connective: boundary.connectiveKind,
          surface: boundary.surface,
          source: opSource(tokens, boundary.tokenSpan.start, boundary.tokenSpan.end + 1),
          ...(boundary.quoteBoundary === undefined ? {} : { quoteBoundary: boundary.quoteBoundary })
        })
      ],
      boundary,
      source: sourceSpan(tokens, markerStart, boundary.tokenSpan.end + 1),
      warnings: []
    }
  };
}

function matchCopulaLessLikenessQuoteFocusLimitNegationProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  likenessIndex: number
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const quoteIdx = likenessIndex + 1;
  if (quoteIdx >= limit) {
    return null;
  }
  const frame = quoteFocusLimitNegationTailStartingAt(cursor.fork(quoteIdx, limit));
  if (frame === null) {
    return null;
  }
  return buildLikenessQuoteFocusLimitNegationProjection({
    tokens,
    markerStart,
    likenessIndex,
    sourceEndExclusive: frame.sourceSpan.end,
    focusSurface: frame.marker.focusSurface,
    polite: frame.polite,
    past: frame.past
  });
}

function matchCopulaLessLikenessQuoteFocusProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  likenessIndex: number
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const quoteIdx = likenessIndex + 1;
  if (quoteIdx >= limit) {
    return null;
  }
  const frame = quoteFocusMarkerStartingAt(cursor.fork(quoteIdx, cursor.tokens.length));
  if (frame === null) {
    return null;
  }
  return buildLikenessQuoteFocusProjection({
    tokens,
    markerStart,
    likenessIndex,
    modalEndExclusive: likenessIndex + 1,
    quoteIdx: frame.quoteIdx
  });
}

function matchPredicativeLikenessQuoteFocusLimitNegationProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  likenessIndex: number,
  copulaIndex: number
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const copula = tokens[copulaIndex];
  if (copula === undefined || (copula.pos & POS5A) !== 終止形_) {
    return null;
  }
  const quoteIdx = copulaIndex + 1;
  if (quoteIdx >= limit) {
    return null;
  }
  const frame = quoteFocusLimitNegationTailStartingAt(cursor.fork(quoteIdx, limit));
  if (frame === null) {
    return null;
  }
  return buildLikenessQuoteFocusLimitNegationProjection({
    tokens,
    markerStart,
    likenessIndex,
    sourceEndExclusive: frame.sourceSpan.end,
    focusSurface: frame.marker.focusSurface,
    polite: frame.polite,
    past: frame.past
  });
}

function matchPredicativeLikenessQuoteFocusProjection(
  cursor: TokenCursor<RuntimeHaruToken>,
  likenessIndex: number,
  copulaIndex: number
): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const copula = tokens[copulaIndex];
  if (copula === undefined || (copula.pos & POS5A) !== 終止形_) {
    return null;
  }
  const quoteIdx = copulaIndex + 1;
  if (quoteIdx >= limit) {
    return null;
  }
  const frame = quoteFocusMarkerStartingAt(cursor.fork(quoteIdx, cursor.tokens.length));
  if (frame === null) {
    return null;
  }
  return buildLikenessQuoteFocusProjection({
    tokens,
    markerStart,
    likenessIndex,
    modalEndExclusive: copulaIndex + 1,
    quoteIdx: frame.quoteIdx
  });
}

function buildLikenessQuoteFocusLimitNegationProjection(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly likenessIndex: number;
  readonly sourceEndExclusive: number;
  readonly focusSurface: "は" | "も";
  readonly polite: boolean;
  readonly past: boolean;
}): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } {
  const likeness = options.tokens[options.likenessIndex];
  return {
    markerStart: options.markerStart,
    projection: {
      kind: "nominalHostLikenessQuoteFocusLimitNegationProjection",
      form: likeness?.surface === "みたい" ? "mitai" : "youda",
      focusSurface: options.focusSurface,
      polite: options.polite,
      past: options.past,
      source: sourceSpan(options.tokens, options.markerStart, options.sourceEndExclusive),
      warnings: []
    }
  };
}

function buildLikenessQuoteFocusProjection(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly markerStart: number;
  readonly likenessIndex: number;
  readonly modalEndExclusive: number;
  readonly quoteIdx: number;
}): { readonly markerStart: number; readonly projection: HostBearingLikenessModal } {
  const likeness = options.tokens[options.likenessIndex];
  return {
    markerStart: options.markerStart,
    projection: {
      kind: "nominalHostLikenessContinuationProjection",
      ops: [
        createModalOp({

          modal: "youda",
          source: opSource(options.tokens, options.markerStart, options.modalEndExclusive),
          form: likeness?.surface === "みたい" ? "mitai" : "youda",
          terminal: "predicative",
          reading: "likeness",
          polite: false,
          past: false
        }),
        createConnectiveOp({

          connective: "quotative",
          surface: "と",
          source: opSource(options.tokens, options.quoteIdx, options.quoteIdx + 1)
        })
      ],
      boundary: {
        kind: "接続助詞",
        connectiveKind: "quotative",
        surface: "と",
        tokenIdx: options.quoteIdx,
        tokenSpan: { start: options.quoteIdx, end: options.quoteIdx }
      },
      source: sourceSpan(options.tokens, options.markerStart, options.quoteIdx + 1),
      warnings: []
    }
  };
}

function sourceSpan(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  end: number
): NominalSourceSpan {
  return {
    start,
    end,
    tokens: tokens.slice(start, end)
  };
}

function opSource(tokens: readonly RuntimeHaruToken[], start: number, end: number): { readonly tokens: readonly RuntimeHaruToken[]; readonly tokenIndices: readonly number[] } {
  return {
    tokens: tokens.slice(start, end),
    tokenIndices: Array.from({ length: end - start }, (_, offset) => start + offset)
  };
}

export interface NominalFrameHydrationOptions {
  readonly head?: {
    readonly allomorphHint?: string | null;
    readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
    readonly allomorphCanonicalKorean?: string | null;
    readonly allomorphKoreanPos?: number | null;
    readonly lexicalForms?: NominalHeadLexicalForms | null;
  };
  readonly commitContext?: NominalFrameCommitContext;
}

export function hydrateNominalFrameParse(
  parse: NominalFrameParse,
  options: {
    readonly head?: {
      readonly allomorphHint?: string | null;
      readonly allomorphHintSource?: NominalHeadAllomorphHintSource;
      readonly allomorphCanonicalKorean?: string | null;
      readonly allomorphKoreanPos?: number | null;
      readonly lexicalForms?: NominalHeadLexicalForms | null;
    };
  } = {}
): NominalFrameParse {
  if (parse.root.kind !== "nominalPhrase") {
    return parse;
  }
  const hint = options.head?.allomorphHint;
  const head: NominalHead = {
    ...parse.root.head,
    allomorphHint: hint === undefined || hint === null
      ? parse.root.head.allomorphHint ?? null
      : {
        korean: hint,
        source: options.head?.allomorphHintSource ?? "assembler_previous_unit",
        ...(options.head?.allomorphCanonicalKorean === undefined || options.head.allomorphCanonicalKorean === null
          ? {}
          : { canonicalKorean: options.head.allomorphCanonicalKorean }),
        ...(options.head?.allomorphKoreanPos === undefined || options.head.allomorphKoreanPos === null
          ? {}
          : { koreanPos: options.head.allomorphKoreanPos })
      },
    ...(options.head?.lexicalForms === undefined || options.head.lexicalForms === null
      ? {}
      : { lexicalForms: options.head.lexicalForms })
  };
  const root: NominalPhraseNode = {
    ...parse.root,
    head
  };
  return {
    ...parse,
    root,
    frame: parse.frame
  };
}

export function tryMatchNominalFrameAt(
  cursor: TokenCursor<RuntimeHaruToken>,
  lookups: LookupTables,
  head?: RuntimeHaruToken
): { readonly frame: NominalFrame; readonly consumed: number; readonly nextIndex: number } | null {
  const { tokens, pos: markerStart, end: limit } = cursor;
  const match = matchNominalFrameSpec(cursor, head, lookups);
  if (match === null) {
    return null;
  }
  const frame = buildNominalFrameFromSpec(match.spec, tokens, markerStart, match.lastIndex);
  return {
    frame,
    consumed: match.lastIndex + 1 - markerStart,
    nextIndex: nextNonSpaceIndex(tokens, match.lastIndex + 1, limit) ?? limit
  };
}

export function buildPredicateNominalFrameParse(options: {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly host: PredicateNominalProjectionHost;
  readonly nominalizerStart: number;
  readonly nominalizerEnd: number;
  readonly nominalizerKind: PredicateNominalHostNode["nominalizer"]["kind"];
  readonly frame: NominalFrame;
  readonly nextIndex: number;
}): NominalFrameParse {
  const nominalizerTokens = options.tokens.slice(options.nominalizerStart, options.nominalizerEnd);
  const sourceStart = options.host.source.start;
  const sourceEnd = options.frame.source.end;
  const root: PredicateNominalHostNode = {
    kind: "predicateNominalHost",
    host: options.host,
    nominalizer: {
      kind: options.nominalizerKind,
      surface: nominalizerTokens.map((token) => token.surface).join(""),
      source: {
        start: options.nominalizerStart,
        end: options.nominalizerEnd,
        tokens: nominalizerTokens
      }
    },
    frames: [options.frame],
    source: {
      start: sourceStart,
      end: sourceEnd,
      tokens: options.tokens.slice(sourceStart, sourceEnd)
    }
  };
  return {
    root,
    frame: options.frame,
    consumed: sourceEnd - sourceStart,
    nextIndex: options.nextIndex
  };
}

interface PredicateNominalHostMarker {
  readonly hostEnd: number;
  readonly nominalizerStart: number;
  readonly nominalizerEnd: number;
  readonly frameStart: number;
  readonly kind: PredicateNominalHostNode["nominalizer"]["kind"];
  readonly hostProjection: PredicateProjectionKind;
}

function findPredicateNominalHostMarker(
  cursor: TokenCursor<RuntimeHaruToken>
): PredicateNominalHostMarker | null {
  const { tokens, pos: predicateStart, end: limit } = cursor;
  const maxScan = Math.min(limit, predicateStart + 12);
  for (let index = predicateStart + 1; index < maxScan; index += 1) {
    const token = tokens[index];
    if (token === undefined) {
      continue;
    }
    const nominalizer = predicateNominalizerRelationForToken(token, index, {
      requirement: "strict_particle",
      consumers: ["nominal_head_parser"]
    });
    if (nominalizer?.nominalizerKind === "no") {
      return {
        hostEnd: index - 1,
        nominalizerStart: index,
        nominalizerEnd: index + 1,
        frameStart: index + 1,
        kind: "no",
        hostProjection: "attributive_nominalizer"
      };
    }
    if (token.surface === "こと" && (token.pos & POS0) === 名詞) {
      return {
        hostEnd: index - 1,
        nominalizerStart: index,
        nominalizerEnd: index + 1,
        frameStart: index + 1,
        kind: "koto",
        hostProjection: "attributive_nominalizer"
      };
    }
    if (token.surface === "もの" && (token.pos & POS0) === 名詞) {
      return {
        hostEnd: index - 1,
        nominalizerStart: index,
        nominalizerEnd: index + 1,
        frameStart: index + 1,
        kind: "mono",
        hostProjection: "attributive_nominalizer"
      };
    }
    if (TAME_FORMS.has(token.dictionaryForm || token.surface)) {
      return {
        hostEnd: index - 1,
        nominalizerStart: index,
        nominalizerEnd: index + 1,
        frameStart: index,
        kind: "tame",
        hostProjection: "gerund_nominalizer"
      };
    }
    if (
      (token.pos & POS0) !== 動詞 &&
      (token.pos & POS0) !== 形容詞0 &&
      (token.pos & POS0) !== 形状詞 &&
      (token.pos & POS0) !== 助動詞0 &&
      (token.pos & POS0) !== 助詞 &&
      (token.pos & POS0) !== 接尾辞 &&
      (token.pos & POS0) !== 補助記号
    ) {
      break;
    }
  }
  return null;
}

function nominalHostLikenessMarkerStart(modalHost: HostBearingLikenessModal): number | null {
  if (modalHost.kind === "nominalHostLikenessProjection") {
    return modalHost.source.start;
  }
  if (modalHost.kind === "nominalHostLikenessContinuationProjection") {
    return modalHost.ops[0]?.source.tokenIndices[0] ?? null;
  }
  if (modalHost.kind === "nominalHostLikenessQuoteFocusLimitNegationProjection") {
    return modalHost.source.start;
  }
  return null;
}

function nominalRootHeadTokenIdx(root: NominalPhraseNode | PredicateNominalHostNode): number {
  if (root.kind === "nominalPhrase") {
    return root.head.tokenIndex;
  }
  return root.host.source.start;
}

function nominalHeadSourceStart(head: NominalHead): number {
  return head.source?.start ?? head.tokenIndex;
}

function nominalHeadModifierContext(
  tokens: readonly RuntimeHaruToken[],
  head: NominalHead,
  layout?: ProjectionEvidenceLayout
): ProjectionHeadModifierContext | undefined {
  const kinds = new Set<ProjectionHeadModifierKind>();
  const headStart = nominalHeadSourceStart(head);
  const headClause = layout?.clauseOfToken(head.tokenIndex);
  if (layout !== undefined && headClause !== undefined && headStart > 0) {
    const clauseIndex = layout.clauseIndexOfToken(head.tokenIndex);
    const previousClause = layout.clauseOfToken(headStart - 1);
    if (
      previousClause !== undefined &&
      previousClause.kind === "relative" &&
      previousClause.end === headStart &&
      previousClause.parentIdx === clauseIndex
    ) {
      kinds.add("relative_clause");
    }
  }

  const previousIndex = previousNonSpaceIndex(tokens, headStart, 0);
  const previous = previousIndex === null ? undefined : tokens[previousIndex];
  if (previousIndex !== null && nominalLinkMarkerRelationAt(tokens, previousIndex, { consumers: ["nominal_head_parser"] }) !== null) {
    kinds.add("no_particle");
  } else if (previous !== undefined && pos0in(previous.pos, CONTENT_MODIFIER_POS0_BITS)) {
    kinds.add("content_modifier");
  }

  if (head.source?.tokens.some((token) => isNominalHeadExemplificationParticle(token)) === true) {
    kinds.add("exemplification");
  }

  return kinds.size === 0 ? undefined : { kinds: Array.from(kinds) };
}

function nominalHeadSelectorToken(head: NominalHead): RuntimeHaruToken {
  return head.selectorToken ?? head.token;
}

function isStructuredNominalHead(head: NominalHead): boolean {
  return head.selectorToken !== undefined && head.source !== undefined;
}

function isQuotedNominalHead(head: NominalHead): boolean {
  return isParentheticalClosingToken(head.token);
}

function quotedHeadFrameEligible(kind: NominalFrameKind): boolean {
  return kind !== "lexical_particle";
}

function matchNominalFrameSpec(
  cursor: TokenCursor<RuntimeHaruToken>,
  head: RuntimeHaruToken | undefined,
  lookups: LookupTables,
  options: { readonly layout?: ProjectionEvidenceLayout } = {},
  headModifier?: ProjectionHeadModifierContext
): { readonly spec: NominalFrameSpec; readonly lastIndex: number } | null {
  const sequence = collectNonSpaceSurfaces(cursor, MAX_NOMINAL_FRAME_SURFACE_ITEMS);
  if (sequence.length === 0) {
    return null;
  }
  let best: { readonly spec: NominalFrameSpec; readonly lastIndex: number } | null = null;
  const specsBySurface = loadNominalFrameSpecsBySurface(lookups);
  let joined = "";
  for (let length = 0; length < sequence.length; length += 1) {
    const item = sequence[length];
    if (item === undefined) {
      break;
    }
    joined += nominalFrameLookupSurfaceAt(cursor, item);
    const specs = specsBySurface.get(joined);
    if (specs === undefined) {
      continue;
    }
    for (const spec of specs) {
      if (spec.head !== undefined && !projectionTokenMatches(head, spec.head, lookups)) {
        continue;
      }
      if (!nominalFrameMarkerTokensMatch(spec, cursor, sequence, length, lookups)) {
        continue;
      }
      const followingStart = item.index + 1;
      if (nominalFrameSpecConflictsWithCopulaScopeBridge(cursor, item.index)) {
        continue;
      }
      if (!nominalFrameSpecMatches(spec, cursor, followingStart, head, lookups, options, headModifier)) {
        continue;
      }
      if (nominalFrameSpecRejects(spec, cursor, followingStart, head, lookups, options, headModifier)) {
        continue;
      }
      if (
        spec.ownerArbitration?.whIndefiniteKaOwnership === true &&
        !whIndefiniteKaConstructionAdmittedAt(cursor, item.index, lookups)
      ) {
        continue;
      }
      if (best === null || item.index > best.lastIndex) {
        best = { spec, lastIndex: item.index };
      }
    }
  }
  return best;
}

function nominalFrameLookupSurfaceAt(cursor: TokenCursor<RuntimeHaruToken>, item: SurfaceItem): string {
  return kaMarkerRelationAt(cursor.tokens, item.index, ["nominal_head_parser"]) !== null ? "か" : item.surface;
}

function nominalFrameSpecConflictsWithCopulaScopeBridge(
  cursor: TokenCursor<RuntimeHaruToken>,
  lastIndex: number,
): boolean {
  const { tokens, end: limit } = cursor;
  const bridge = dewaScopeBridgeRelationAt(tokens, lastIndex, {
    consumers: ["nominal_head_parser"]
  });
  if (bridge === null) {
    return false;
  }
  const tailIndex = nextNonSpaceIndex(tokens, bridge.span.endExclusive, limit) ?? limit;
  const tail = tokens[tailIndex];
  if (tail === undefined) {
    return false;
  }
  if (isCopulaScopeNegativeTailToken(tail)) {
    return true;
  }
  if (!isCopulaScopeAruSupportToken(tail)) {
    return false;
  }
  const auxIndex = nextNonSpaceIndex(tokens, tailIndex + 1, limit) ?? limit;
  return isCopulaScopeNegativeAuxToken(tokens[auxIndex]);
}

function isCopulaScopeNegativeTailToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return form === "ない" || form === "無い";
}

function isCopulaScopeAruSupportToken(token: RuntimeHaruToken): boolean {
  const form = token.dictionaryForm || token.surface;
  return ((token.pos & POS0) === 動詞) && (form === "ある" || form === "有る");
}

function isCopulaScopeNegativeAuxToken(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const form = token.dictionaryForm || token.surface;
  return form === "ぬ" || form === "ない" || form === "無い" || token.surface === "ん";
}

function nominalFrameSpecMatches(
  spec: NominalFrameSpec,
  cursor: TokenCursor<RuntimeHaruToken>,
  followingStart: number,
  head: RuntimeHaruToken | undefined,
  lookups: LookupTables,
  options: { readonly layout?: ProjectionEvidenceLayout } = {},
  headModifier?: ProjectionHeadModifierContext
): boolean {
  if (spec.match === undefined || spec.match.length === 0) {
    return true;
  }
  const { tokens, pos: markerStart, end: limit } = cursor;
  return spec.match.every((selector) => {
    const bounds = nominalFrameSelectorBounds(cursor, options, selector.scope);
    return projectionCandidateSelectorMatches(selector, {
      ...(head === undefined ? {} : { head }),
      ...(headModifier === undefined ? {} : { headModifier }),
      precedingTokens: collectPrecedingProjectionContextTokens(tokens, markerStart - 1, {
        maxCount: selector.window ?? 6,
        lowerBound: bounds.lowerBound
      }),
      followingTokens: collectFollowingProjectionContextTokens(tokens, followingStart, {
        limit: bounds.upperBound ?? limit,
        maxCount: selector.window ?? 6
      }),
      precedingBoundary: collectPrecedingProjectionBoundaryContext(tokens, markerStart - 1, {
        lowerBound: bounds.lowerBound
      }),
      followingBoundary: collectFollowingProjectionBoundaryContext(tokens, followingStart, {
        limit: bounds.upperBound ?? limit
      }),
      ...(selector.kind === "following_noun_phrase"
        ? { followingNounPhrase: collectFollowingNounPhraseTokens(tokens, followingStart, { limit }) }
        : {})
    }, lookups);
  });
}

function nominalFrameSpecRejects(
  spec: NominalFrameSpec,
  cursor: TokenCursor<RuntimeHaruToken>,
  followingStart: number,
  head: RuntimeHaruToken | undefined,
  lookups: LookupTables,
  options: { readonly layout?: ProjectionEvidenceLayout } = {},
  headModifier?: ProjectionHeadModifierContext
): boolean {
  const { tokens, pos: markerStart, end: limit } = cursor;
  return spec.reject?.some((selector) => {
    const bounds = nominalFrameSelectorBounds(cursor, options, selector.scope);
    const precedingTokens = collectPrecedingProjectionContextTokens(tokens, markerStart - 1, {
      maxCount: selector.window ?? 6,
      lowerBound: bounds.lowerBound
    });
    const followingTokens = collectFollowingProjectionContextTokens(tokens, followingStart, {
      limit: bounds.upperBound ?? limit,
      maxCount: selector.window ?? 6
    });
    return projectionCandidateSelectorMatches(selector, {
      ...(head === undefined ? {} : { head }),
      ...(headModifier === undefined ? {} : { headModifier }),
      precedingTokens,
      followingTokens,
      precedingBoundary: collectPrecedingProjectionBoundaryContext(tokens, markerStart - 1, {
        lowerBound: bounds.lowerBound
      }),
      followingBoundary: collectFollowingProjectionBoundaryContext(tokens, followingStart, {
        limit: bounds.upperBound ?? limit
      }),
      ...(selector.kind === "following_noun_phrase"
        ? { followingNounPhrase: collectFollowingNounPhraseTokens(tokens, followingStart, { limit }) }
        : {})
    }, lookups);
  }) === true;
}

function nominalFrameSelectorBounds(
  cursor: TokenCursor<RuntimeHaruToken>,
  options: { readonly layout?: ProjectionEvidenceLayout },
  scope?: ProjectionEvidenceScope
) {
  return projectionSelectorBoundsForToken({
    tokens: cursor.tokens,
    tokenIdx: cursor.pos,
    fallbackUpperBound: cursor.end,
    ...(scope === undefined ? {} : { scope }),
    ...(options.layout === undefined ? {} : { layout: options.layout })
  });
}

function previousNominalHead(
  tokens: readonly RuntimeHaruToken[],
  start: number,
  lookups: LookupTables,
  options: { readonly allowTrailingHostTokens?: boolean } = {}
): NominalHead | null {
  let index = start;
  let trailingEnd = start + 1;
  let skippedTrailingHostToken = false;
  while (index >= 0) {
    const token = tokens[index];
    if (token === undefined) {
      return null;
    }
    if (options.allowTrailingHostTokens === true) {
      const quoted = quotedNominalHeadEndingAt(tokens, index);
      if (quoted !== null) {
        return quoted;
      }
      const structured = structuredNominalHeadEndingAt(tokens, index, lookups);
      if (structured !== null) {
        return structured;
      }
      if (isNominalizerNoToken(token)) {
        return {
          kind: "token",
          tokenIndex: index,
          token,
          source: {
            start: index,
            end: index + 1,
            tokens: [token]
          }
        };
      }
    }
    if (options.allowTrailingHostTokens === true && isNominalHeadTrailingToken(token)) {
      skippedTrailingHostToken = true;
      trailingEnd = Math.max(trailingEnd, index + 1);
      index -= 1;
      continue;
    }
    if (!skippedTrailingHostToken && renyouNominalHeadFrameHostAt(tokens, index, index + 1, lookups)) {
      return { kind: "token", tokenIndex: index, token };
    }
    if (NOMINAL_HEAD_POS0_SET.has(token.pos & POS0)) {
      return skippedTrailingHostToken
        ? {
          kind: "token",
          tokenIndex: index,
          token,
          selectorToken: token,
          source: {
            start: index,
            end: trailingEnd,
            tokens: tokens.slice(index, trailingEnd)
          }
        }
        : { kind: "token", tokenIndex: index, token };
    }
    return null;
  }
  return null;
}

function isNominalizerNoHead(head: NominalHead): boolean {
  return isNominalizerNoToken(head.token);
}

function isNominalizerNoToken(token: RuntimeHaruToken): boolean {
  return predicateNominalizerRelationForToken(token, -1, {
    requirement: "strict_particle",
    consumers: ["nominal_head_parser"]
  })?.nominalizerKind === "no";
}

function nominalizerNoHostCanUseFrame(spec: NominalFrameSpec): boolean {
  return spec.focus === "の" && spec.requiresFollowingContent === true;
}

function isHeadTransparentEnumerationSuffix(
  token: RuntimeHaruToken,
  lookups: LookupTables
): boolean {
  const set = lookups.named("nominal_frame.head_transparent_enumeration_suffixes");
  if (set === undefined) {
    return false;
  }
  return set.has(token.surface) ||
    (token.dictionaryForm !== undefined && set.has(token.dictionaryForm));
}

function structuredNominalHeadEndingAt(
  tokens: readonly RuntimeHaruToken[],
  endIndex: number,
  lookups: LookupTables
): NominalHead | null {
  const token = tokens[endIndex];
  if (
    token === undefined || (token.pos & POS01) !== 接尾辞_名詞的
  ) {
    return null;
  }
  if (isHeadTransparentEnumerationSuffix(token, lookups)) {
    return null;
  }
  const baseIndex = previousNonSpaceIndex(tokens, endIndex);
  if (baseIndex === null) {
    return null;
  }
  const base = tokens[baseIndex];
  if (
    base === undefined ||
    (
      !NOMINAL_HEAD_POS0_SET.has(base.pos & POS0) &&
      (base.pos & POS0) !== 副詞 &&
      (base.pos & POS0) !== 形容詞0 &&
      (base.pos & POS0) !== 形状詞
    )
  ) {
    return null;
  }
  return {
    kind: "token",
    tokenIndex: endIndex,
    token,
    selectorToken: token,
    source: {
      start: baseIndex,
      end: endIndex + 1,
      tokens: tokens.slice(baseIndex, endIndex + 1)
    }
  };
}

function quotedNominalHeadEndingAt(
  tokens: readonly RuntimeHaruToken[],
  closeIndex: number
): NominalHead | null {
  const close = tokens[closeIndex];
  const span = parentheticalSpanEndingAt(tokens, closeIndex, {
    consumers: ["nominal_head_parser"]
  });
  if (close === undefined || span === null) {
    return null;
  }
  return {
    kind: "token",
    tokenIndex: closeIndex,
    token: close,
    source: {
      start: span.span.start,
      end: span.span.endExclusive,
      tokens: tokens.slice(span.span.start, span.span.endExclusive)
    }
  };
}

function isNominalHeadTrailingToken(token: RuntimeHaruToken): boolean {
  return (
    (token.pos & POS01) === 接尾辞_名詞的 ||
    isNominalHeadExemplificationParticle(token) ||
    isParentheticalClosingToken(token)
  );
}

function isNominalHeadExemplificationParticle(token: RuntimeHaruToken): boolean {
  return tokenMatchesConnectiveKind(token, "exemplification");
}

function nominalFrameMarkerTokensMatch(
  spec: NominalFrameSpec,
  cursor: TokenCursor<RuntimeHaruToken>,
  sequence: readonly SurfaceItem[],
  lastItemOffset: number,
  lookups: LookupTables
): boolean {
  const selectors = spec.markerTokens;
  if (selectors === undefined) {
    return true;
  }
  if (selectors.length !== lastItemOffset + 1) {
    return false;
  }
  return selectors.every((selector, offset) => {
    const item = sequence[offset];
    return item !== undefined && projectionTokenMatches(cursor.tokens[item.index], selector, lookups);
  });
}

function collectNonSpaceSurfaces(
  cursor: TokenCursor<RuntimeHaruToken>,
  maxItems: number
): readonly SurfaceItem[] {
  const items: SurfaceItem[] = [];
  let index = cursor.pos;
  while (index < cursor.end && items.length < maxItems) {
    const token = cursor.tokens[index];
    if (token === undefined) {
      break;
    }
    if (index > cursor.pos && separatedAs(cursor.tokens, index, SEPARATION_BREAKS_MORPHEME_CHAIN)) {
      break;
    }
    items.push({ index, surface: token.surface });
    index += 1;
  }
  return items;
}
