import type { RuntimeHaruToken } from "../../../types/token.js";
import { nextNonSpaceIndex } from "../../clause-layout/trivia.js";
import { copulaDeMarkerRelationForToken, predicateNominalizerRelationForToken } from "../boundary/marker.js";
import { TokenCursor } from "../../token-cursor.js";


import { NOMINAL_BITS, POS0, pos0in, POS5A, PREDICATE_BITS, 終止形_, 連体形_ } from "../../../types/pos.js";
export interface HeadAnchorSpan {
  readonly start: number;
  readonly endExclusive: number;
}

export type HeadAnchorKind =
  | "predicate"
  | "nominal"
  | "predicate_nominalized"
  | "marker_adapter";

export type PredicateNominalizerKind = "koto" | "no" | "mono" | "tame";

export type HeadBase =
  | {
      readonly kind: "token";
      readonly token: RuntimeHaruToken;
      readonly tokenIdx: number;
      readonly surface: string;
      readonly dictionaryForm: string;
      readonly pos0: number;
    }
  | {
      readonly kind: "predicate_nominalized";
      readonly predicate: RuntimeHaruToken;
      readonly predicateTokenIdx: number;
      readonly nominalizer: RuntimeHaruToken;
      readonly nominalizerTokenIdx: number;
      readonly nominalizerKind: PredicateNominalizerKind;
    };

export interface HeadAnchor {
  readonly kind: HeadAnchorKind;
  readonly adapterId: string;
  readonly sourceSpan: HeadAnchorSpan;
  readonly headTokenIdx: number;
  readonly tailStart: number;
  readonly base: HeadBase;
}


export type JaHostFormOffer = "taigen" | "rentai" | "shushi";

export interface HeadFormOffer {
  readonly form: JaHostFormOffer;
  readonly provenance: "native" | "explicit_coercion";
  readonly nominalizerKind?: PredicateNominalizerKind;
}

const PREDICATE_FORM_OFFERS: readonly HeadFormOffer[] = [
  { form: "shushi", provenance: "native" },
  { form: "rentai", provenance: "native" }
];

const NOMINAL_FORM_OFFERS: readonly HeadFormOffer[] = [
  { form: "taigen", provenance: "native" }
];

export function headFormOffers(head: HeadAnchor): readonly HeadFormOffer[] {
  switch (head.kind) {
    case "predicate":
      return PREDICATE_FORM_OFFERS;
    case "nominal":
    case "marker_adapter":
      return NOMINAL_FORM_OFFERS;
    case "predicate_nominalized":
      return [{
        form: "taigen",
        provenance: "explicit_coercion",
        ...(head.base.kind === "predicate_nominalized" ? { nominalizerKind: head.base.nominalizerKind } : {})
      }];
  }
}

export function headOffersForm(head: HeadAnchor, form: JaHostFormOffer): boolean {
  return headFormOffers(head).some((offer) => offer.form === form);
}

export interface HeadAnchorAdapterContext {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
}

export interface HeadAnchorAdapterDescriptor {
  readonly id: string;
  readonly kind: HeadAnchorKind;
  readonly description: string;
}

export interface HeadAnchorAdapter {
  readonly descriptor: HeadAnchorAdapterDescriptor;
  readonly collect: (context: HeadAnchorAdapterContext) => readonly HeadAnchor[];
}

export interface HeadAnchorAdapterAuditIssue {
  readonly adapterId: string;
  readonly reason: string;
}

const PREDICATE_HEAD_ADAPTER: HeadAnchorAdapter = {
  descriptor: {
    id: "predicate_head_adapter",
    kind: "predicate",
    description: ""
  },
  collect: (context) => {
    const { cursor } = context;
    const limit = cursor.end;
    if (cursor.pos < 0 || cursor.pos >= limit) {
      return [];
    }
    if (!isPredicateHeadToken(cursor)) {
      return [];
    }
    return [tokenHeadAnchor({
      kind: "predicate",
      adapterId: "predicate_head_adapter",
      tokens: cursor.tokens,
      tokenIdx: cursor.pos
    })];
  }
};

const NOMINAL_HEAD_ADAPTER: HeadAnchorAdapter = {
  descriptor: {
    id: "nominal_head_adapter",
    kind: "nominal",
    description: ""
  },
  collect: (context) => {
    const { cursor } = context;
    const limit = cursor.end;
    if (cursor.pos < 0 || cursor.pos >= limit) {
      return [];
    }
    const token = cursor.current();
    if (!isNominalHeadToken(token)) {
      return [];
    }
    const phraseEnd = scanNominalPhraseEnd(cursor);
    const anchors = [tokenHeadAnchor({
      kind: "nominal",
      adapterId: "nominal_head_adapter",
      tokens: cursor.tokens,
      tokenIdx: cursor.pos
    })];
    if (phraseEnd > cursor.pos + 1) {
      anchors.push(tokenHeadAnchor({
        kind: "nominal",
        adapterId: "nominal_head_adapter",
        tokens: cursor.tokens,
        tokenIdx: cursor.pos,
        endExclusive: phraseEnd
      }));
    }
    return anchors;
  }
};

const PREDICATE_NOMINALIZED_HEAD_ADAPTER: HeadAnchorAdapter = {
  descriptor: {
    id: "predicate_nominalized_head_adapter",
    kind: "predicate_nominalized",
    description: ""
  },
  collect: (context) => {
    const { cursor } = context;
    const limit = cursor.end;
    if (cursor.pos < 0 || cursor.pos >= limit) {
      return [];
    }
    const predicate = cursor.current();
    if (predicate === undefined) {
      return [];
    }
    if (!isPredicateNominalizableHead(predicate)) {
      return [];
    }
    const nominalizerIdx = nextNonSpaceIndex(cursor.tokens, cursor.pos + 1, limit);
    if (nominalizerIdx === null) {
      return [];
    }
    const nominalizer = cursor.tokens[nominalizerIdx];
    if (nominalizer === undefined) {
      return [];
    }
    const nominalizerKind = nominalizerKindForToken(nominalizer);
    if (nominalizerKind === null) {
      return [];
    }
    return [{
      kind: "predicate_nominalized",
      adapterId: "predicate_nominalized_head_adapter",
      sourceSpan: { start: cursor.pos, endExclusive: nominalizerIdx + 1 },
      headTokenIdx: cursor.pos,
      tailStart: nominalizerIdx + 1,
      base: {
        kind: "predicate_nominalized",
        predicate,
        predicateTokenIdx: cursor.pos,
        nominalizer,
        nominalizerTokenIdx: nominalizerIdx,
        nominalizerKind
      }
    }];
  }
};

const HEAD_ANCHOR_ADAPTERS = [
  PREDICATE_HEAD_ADAPTER,
  NOMINAL_HEAD_ADAPTER,
  PREDICATE_NOMINALIZED_HEAD_ADAPTER
] as const;

const REQUIRED_HEAD_ANCHOR_ADAPTERS: Readonly<Record<string, {
  readonly kind: HeadAnchorKind;
}>> = {
  predicate_head_adapter: { kind: "predicate" },
  nominal_head_adapter: { kind: "nominal" },
  predicate_nominalized_head_adapter: { kind: "predicate_nominalized" }
};

export function describeHeadAnchorAdapters(): readonly HeadAnchorAdapterDescriptor[] {
  return HEAD_ANCHOR_ADAPTERS.map((adapter) => adapter.descriptor);
}

export function collectHeadAnchors(context: HeadAnchorAdapterContext): readonly HeadAnchor[] {
  return HEAD_ANCHOR_ADAPTERS.flatMap((adapter) => adapter.collect(context));
}

export function auditHeadAnchorAdapters(
  descriptors: readonly HeadAnchorAdapterDescriptor[] = describeHeadAnchorAdapters()
): readonly HeadAnchorAdapterAuditIssue[] {
  const issues: HeadAnchorAdapterAuditIssue[] = [];
  const adapterIds = new Set<string>();
  const byId = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  for (const [adapterId, required] of Object.entries(REQUIRED_HEAD_ANCHOR_ADAPTERS)) {
    const descriptor = byId.get(adapterId);
    if (descriptor === undefined) {
      issues.push({ adapterId, reason: "required head anchor adapter missing" });
      continue;
    }
    if (descriptor.kind !== required.kind) {
      issues.push({
        adapterId,
        reason: `required head anchor adapter kind '${descriptor.kind}' != '${required.kind}'`
      });
    }
  }
  for (const descriptor of descriptors) {
    if (adapterIds.has(descriptor.id)) {
      issues.push({ adapterId: descriptor.id, reason: "duplicate head anchor adapter id" });
    }
    adapterIds.add(descriptor.id);
  }
  return issues;
}

function tokenHeadAnchor(options: {
  readonly kind: "predicate" | "nominal";
  readonly adapterId: string;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly tokenIdx: number;
  readonly endExclusive?: number;
}): HeadAnchor {
  const token = options.tokens[options.tokenIdx]!;
  const endExclusive = options.endExclusive ?? options.tokenIdx + 1;
  return {
    kind: options.kind,
    adapterId: options.adapterId,
    sourceSpan: { start: options.tokenIdx, endExclusive },
    headTokenIdx: options.tokenIdx,
    tailStart: endExclusive,
    base: {
      kind: "token",
      token,
      tokenIdx: options.tokenIdx,
      surface: token.surface,
      dictionaryForm: token.dictionaryForm,
      pos0: token.pos & POS0
    }
  };
}

function isPredicateHeadToken(
  cursor: TokenCursor<RuntimeHaruToken>
): boolean {
  const { tokens, pos: index } = cursor;
  const token = cursor.current();
  if (token === undefined) return false;
  if (pos0in(token.pos, PREDICATE_BITS)) {
    return true;
  }
  if (!pos0in(token.pos, NOMINAL_BITS)) {
    return false;
  }
  const nextIdx = nextNonSpaceIndex(tokens, index + 1, cursor.end);
  const next = nextIdx === null ? undefined : tokens[nextIdx];
  return next !== undefined && isCopulaLikeToken(next);
}

function isPredicateNominalizableHead(token: RuntimeHaruToken | undefined): boolean {
  if (token === undefined || !pos0in(token.pos, PREDICATE_BITS)) {
    return false;
  }
  const form5a = token.pos & POS5A;
  return form5a === 0 || form5a === 連体形_ || form5a === 終止形_;
}

function isNominalHeadToken(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && pos0in(token.pos, NOMINAL_BITS);
}

function scanNominalPhraseEnd(
  cursor: TokenCursor<RuntimeHaruToken>
): number {
  let scan = cursor.pos + 1;
  while (scan < cursor.end) {
    const token = cursor.tokens[scan];
    if (!isNominalHeadToken(token)) {
      break;
    }
    scan += 1;
  }
  return scan;
}

function nominalizerKindForToken(token: RuntimeHaruToken | undefined): PredicateNominalizerKind | null {
  return predicateNominalizerRelationForToken(token, -1, {
    requirement: "head_anchor",
    consumers: ["nominal_head"]
  })?.nominalizerKind ?? null;
}

function isCopulaLikeToken(token: RuntimeHaruToken): boolean {
  return token.dictionaryForm === "だ" ||
    token.dictionaryForm === "です" ||
    copulaDeMarkerRelationForToken(token, -1, { consumers: ["nominal_head"] }) !== null ||
    token.surface === "じゃ";
}
