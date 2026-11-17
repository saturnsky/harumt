import { type DataLoader, lazyValue } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { makeParseErrorContext, parseString } from "../../data/jsonl-parse-helpers.js";
import { HEAD_PROJECTION_KIND_VALUES } from "./grammar.js";
import type {
  CarrierHeadContract,
  HeadCommitPolicy,
  HeadLicensing,
  HeadProjectionKind,
  PostverbAuxiliaryKind
} from "./grammar.js";

const HEAD_CONTRACT_TABLE_RELATIVE_PATH = "head-tail/head_contracts.jsonl";
const ctx = makeParseErrorContext("head contract", HEAD_CONTRACT_TABLE_RELATIVE_PATH);

export type HeadContractOwnerKind =
  | "connective"
  | "postverb_auxiliary"
  | "predicate_quote_carrier"
  | "quote_boundary";

export interface HeadContractOwner {
  readonly kind: HeadContractOwnerKind;
  readonly key: string;
}

export interface HeadContractRow {
  readonly owner: HeadContractOwner;
  readonly contract: CarrierHeadContract;
}

const ROW_KEYS = new Set(["owner", "contract"]);
const OWNER_KEYS = new Set(["kind", "key"]);
const CONTRACT_KEYS = new Set([
  "relation",
  "accepts",
  "candidatePreference",
  "realizationOrder",
  "requires",
  "commitPolicy",
  "contextReason"
]);
const REQUIRES_KEYS = new Set(["adjectivalInflection"]);
const COMMIT_POLICY_KEYS = new Set(["adverbial", "opChainHost"]);
const PROJECTION_KINDS: ReadonlySet<HeadProjectionKind> = new Set<HeadProjectionKind>(HEAD_PROJECTION_KIND_VALUES);

let _cache: string | undefined;

export async function initHeadContractData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), HEAD_CONTRACT_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const HEAD_CONTRACT_ROWS: readonly HeadContractRow[] = lazyValue(() => {
  if (_cache === undefined) throw new Error("Data not initialized");
  return parseHeadContractRowsText(_cache);
});

export function headContractForConnective(key: string): CarrierHeadContract | undefined {
  return lookupContract({ kind: "connective", key });
}

export function headContractForPostverbAuxiliary(kind: PostverbAuxiliaryKind): CarrierHeadContract | undefined {
  return lookupContract({ kind: "postverb_auxiliary", key: kind });
}

export function headContractForPredicateQuoteCarrier(style: string): CarrierHeadContract | undefined {
  return lookupContract({ kind: "predicate_quote_carrier", key: style }) ??
    lookupContract({ kind: "predicate_quote_carrier", key: "*" });
}

export function headContractForQuoteBoundary(key: string): CarrierHeadContract | undefined {
  return lookupContract({ kind: "quote_boundary", key });
}

export function parseHeadContractRowsText(text: string): readonly HeadContractRow[] {
  const rows: HeadContractRow[] = [];
  const seen = new Set<string>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`invalid head contract row at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const row = raw as { readonly [key: string]: unknown };
    for (const key of Object.keys(row)) {
      if (!ROW_KEYS.has(key)) {
        throw new Error(`unknown head contract row key '${key}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const owner = parseOwner(row.owner, lineNumber);
    const ownerKey = owner.kind + ":" + owner.key;
    if (seen.has(ownerKey)) {
      throw new Error(`duplicate head contract owner '${ownerKey}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    seen.add(ownerKey);
    rows.push({
      owner,
      contract: parseContract(row.contract, lineNumber)
    });
  }
  return rows;
}

function lookupContract(owner: HeadContractOwner): CarrierHeadContract | undefined {
  return HEAD_CONTRACT_ROWS.find((row) => row.owner.kind === owner.kind && row.owner.key === owner.key)?.contract;
}

function parseOwner(value: unknown, lineNumber: number): HeadContractOwner {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx("owner", lineNumber));
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!OWNER_KEYS.has(key)) {
      throw new Error(`unknown head contract owner key '${key}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  const kind = parseOwnerKind(raw.kind, lineNumber);
  return {
    kind,
    key: parseString(raw.key, "owner.key", ctx, lineNumber)
  };
}

function parseOwnerKind(value: unknown, lineNumber: number): HeadContractOwnerKind {
  if (
    value === "connective" ||
    value === "postverb_auxiliary" ||
    value === "predicate_quote_carrier" ||
    value === "quote_boundary"
  ) {
    return value;
  }
  throw new Error(ctx("owner.kind", lineNumber));
}

function parseContract(value: unknown, lineNumber: number): CarrierHeadContract {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx("contract", lineNumber));
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!CONTRACT_KEYS.has(key)) {
      throw new Error(`unknown head contract key '${key}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  return {
    relation: parseRelation(raw.relation, lineNumber),
    accepts: parseProjectionKindAccepts(raw.accepts, "accepts", lineNumber),
    ...(raw.candidatePreference === undefined
      ? {}
      : { candidatePreference: parseProjectionKindGroups(raw.candidatePreference, "candidatePreference", lineNumber) }),
    ...(raw.realizationOrder === undefined
      ? {}
      : { realizationOrder: parseProjectionKindGroups(raw.realizationOrder, "realizationOrder", lineNumber) }),
    ...(raw.requires === undefined
      ? {}
      : { requires: parseRequires(raw.requires, lineNumber) }),
    ...(raw.commitPolicy === undefined
      ? {}
      : { commitPolicy: parseCommitPolicy(raw.commitPolicy, lineNumber) }),
    ...(raw.contextReason === undefined
      ? {}
      : { contextReason: parseString(raw.contextReason, "contextReason", ctx, lineNumber) })
  };
}

function parseRelation(value: unknown, lineNumber: number): CarrierHeadContract["relation"] {
  if (value === "modification" || value === "quote_body") {
    return value;
  }
  throw new Error(ctx("relation", lineNumber));
}

function parseProjectionKindAccepts(value: unknown, field: string, lineNumber: number): readonly HeadProjectionKind[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && projectionKindIsExplicit(item))
  ) {
    return uniqueProjectionKinds(value as HeadProjectionKind[]);
  }
  throw new Error(ctx(field, lineNumber));
}

function parseProjectionKindGroups(
  value: unknown,
  field: string,
  lineNumber: number
): readonly (readonly HeadProjectionKind[])[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((group) => Array.isArray(group) && group.length > 0)
  ) {
    return value.flatMap((group, index) => parseProjectionKindGroup(group, `${field}[${index}]`, lineNumber));
  }
  throw new Error(ctx(field, lineNumber));
}

function parseProjectionKindGroup(
  value: unknown,
  field: string,
  lineNumber: number
): readonly (readonly HeadProjectionKind[])[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((item) => typeof item === "string" && projectionKindIsExplicit(item))
  ) {
    throw new Error(ctx(field, lineNumber));
  }
  return [uniqueProjectionKinds(value as HeadProjectionKind[])];
}

function projectionKindIsExplicit(value: string): value is HeadProjectionKind {
  return PROJECTION_KINDS.has(value as HeadProjectionKind);
}

function uniqueProjectionKinds(kinds: readonly HeadProjectionKind[]): HeadProjectionKind[] {
  return kinds.filter((kind, index, all) => all.indexOf(kind) === index);
}

function parseRequires(value: unknown, lineNumber: number): HeadLicensing {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx("requires", lineNumber));
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!REQUIRES_KEYS.has(key)) {
      throw new Error(`unknown head contract requires key '${key}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  const adjectivalInflection = raw.adjectivalInflection;
  const result: HeadLicensing = {};
  if (adjectivalInflection !== undefined) {
    if (adjectivalInflection !== "i" && adjectivalInflection !== "na") {
      throw new Error(ctx("requires.adjectivalInflection", lineNumber));
    }
    Object.assign(result, { adjectivalInflection });
  }
  if (result.adjectivalInflection === undefined) {
    throw new Error(ctx("requires", lineNumber));
  }
  return result;
}

function parseCommitPolicy(value: unknown, lineNumber: number): HeadCommitPolicy {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(ctx("commitPolicy", lineNumber));
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!COMMIT_POLICY_KEYS.has(key)) {
      throw new Error(`unknown head contract commitPolicy key '${key}' at ${HEAD_CONTRACT_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  const adverbial = raw.adverbial;
  const opChainHost = raw.opChainHost;
  const result: HeadCommitPolicy = {};
  if (adverbial !== undefined) {
    if (adverbial !== "explicit_evidence_required" && adverbial !== "ordinary") {
      throw new Error(ctx("commitPolicy.adverbial", lineNumber));
    }
    Object.assign(result, { adverbial });
  }
  if (opChainHost !== undefined) {
    if (opChainHost !== "inflecting_predicate_lemma") {
      throw new Error(ctx("commitPolicy.opChainHost", lineNumber));
    }
    Object.assign(result, { opChainHost });
  }
  if (result.adverbial === undefined && result.opChainHost === undefined) {
    throw new Error(ctx("commitPolicy", lineNumber));
  }
  return result;
}
