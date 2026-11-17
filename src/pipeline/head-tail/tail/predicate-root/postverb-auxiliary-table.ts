import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { makeParseErrorContext, parseNullableIrregular, parseString } from "../../data/jsonl-parse-helpers.js";
import {
  COMPOUND_DISPATCH_HINT_VALUES,
  POSTVERB_AUXILIARY_INVENTORY,
  POSTVERB_HOST_ATTACH_FORM_VALUES,
  POSTVERB_SOURCE_TOKEN_CLASS_VALUES,
  type CompletionFollowingPassiveStrategy,
  type CompletionTeIruNegativeStrategy,
  type CompoundDispatchHint,
  type PostverbAuxiliaryKind,
  type PostverbCompoundDispatch,
  type PostverbHostAttachForm,
  type PostverbSourceTokenClass,
  type PostverbAuxiliaryPayload
} from "./grammar.js";

const POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH = "head-tail/postverb_auxiliary_forms.jsonl";
const ctx = makeParseErrorContext("postverb auxiliary", POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH);

export interface PostverbAuxiliaryFormInventoryEntry {
  readonly forms: readonly string[];
  readonly payload: PostverbAuxiliaryPayload;
}

const POSTVERB_AUXILIARY_KINDS = new Set<PostverbAuxiliaryKind>(
  POSTVERB_AUXILIARY_INVENTORY.map((entry) => entry.auxiliary)
);

const POSTVERB_AUXILIARY_ROW_KEYS = new Set(["forms", "payload"]);

const POSTVERB_AUXILIARY_PAYLOAD_KEYS = new Set([
  "kind",
  "opChainHost",
  "followingAuxiliaryKind",
  "requiredPrefixForms",
  "requiredHostForms",
  "compoundDispatch",
  "admitsPrecedingNegation",
  "sourceTokenClass",
  "admitsImperativeTerminal",
  "completionTeIruNegativeStrategy",
  "completionFollowingPassiveStrategy",
  "completionAdverb",
  "hostAdverb",
  "hostLookup",
  "sahenHostProjection",
  "koreanActionLemma",
  "koreanActionIrregular",
  "followingRareruDefault",
  "perception"
]);

let _cache: string | undefined;

export async function initPostverbAuxiliaryData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

export const POSTVERB_AUXILIARY_FORM_INVENTORY: readonly PostverbAuxiliaryFormInventoryEntry[] = lazyValue(() => loadPostverbAuxiliaryFormInventory());

let _postverbAuxByForm: Map<string, readonly PostverbAuxiliaryPayload[]> | undefined;

export function postverbAuxiliaryPayloadForForm(form: string | undefined): PostverbAuxiliaryPayload | undefined {
  return postverbAuxiliaryPayloadsForForm(form)[0];
}

export function postverbAuxiliaryPayloadsForForm(form: string | undefined): readonly PostverbAuxiliaryPayload[] {
  if (_postverbAuxByForm === undefined) {
    const map = new Map<string, PostverbAuxiliaryPayload[]>();
    for (const entry of POSTVERB_AUXILIARY_FORM_INVENTORY) {
      for (const entryForm of entry.forms) {
        const payloads = map.get(entryForm);
        if (payloads === undefined) {
          map.set(entryForm, [entry.payload]);
        } else {
          payloads.push(entry.payload);
        }
      }
    }
    _postverbAuxByForm = map;
  }
  return _postverbAuxByForm.get(form ?? "") ?? [];
}

export function postverbAuxiliaryDeclaresHostAttachForm(
  auxiliary: PostverbAuxiliaryPayload,
  form: PostverbHostAttachForm
): boolean {
  return auxiliary.requiredHostForms?.includes(form) === true;
}

export type CompoundDispatchLane = keyof PostverbCompoundDispatch;

const COMPOUND_DISPATCH_LANES = ["stream", "sahen"] as const satisfies readonly CompoundDispatchLane[];

let _compoundDispatchByForm: ReadonlyMap<CompoundDispatchLane, ReadonlyMap<string, CompoundDispatchHint>> | undefined;

function compoundDispatchIndex(): ReadonlyMap<CompoundDispatchLane, ReadonlyMap<string, CompoundDispatchHint>> {
  if (_compoundDispatchByForm !== undefined) {
    return _compoundDispatchByForm;
  }
  const index = new Map<CompoundDispatchLane, Map<string, CompoundDispatchHint>>(
    COMPOUND_DISPATCH_LANES.map((lane) => [lane, new Map<string, CompoundDispatchHint>()])
  );
  for (const { forms, payload } of POSTVERB_AUXILIARY_FORM_INVENTORY) {
    const dispatch = payload.compoundDispatch;
    if (dispatch === undefined) {
      continue;
    }
    for (const lane of COMPOUND_DISPATCH_LANES) {
      const hint = dispatch[lane];
      if (hint === undefined) {
        continue;
      }
      const laneIndex = index.get(lane)!;
      for (const form of forms) {
        const existing = laneIndex.get(form);
        if (existing !== undefined && existing !== hint) {
          throw new Error(
            `conflicting postverb auxiliary compoundDispatch.${lane} for '${form}' at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}`
          );
        }
        laneIndex.set(form, hint);
      }
    }
  }
  _compoundDispatchByForm = index;
  return index;
}

export function compoundDispatchHintForForm(
  form: string | undefined,
  lane: CompoundDispatchLane
): CompoundDispatchHint | null {
  return compoundDispatchIndex().get(lane)?.get(form ?? "") ?? null;
}

export function compoundDispatchFormsForHint(
  lane: CompoundDispatchLane,
  hint: CompoundDispatchHint
): ReadonlySet<string> {
  const forms = new Set<string>();
  for (const [form, declared] of compoundDispatchIndex().get(lane) ?? []) {
    if (declared === hint) {
      forms.add(form);
    }
  }
  return forms;
}

function loadPostverbAuxiliaryFormInventory(): readonly PostverbAuxiliaryFormInventoryEntry[] {
  if (_cache === undefined) throw new Error("Data not initialized");
  const text = _cache;
  return parsePostverbAuxiliaryFormInventoryText(text);
}

export function parsePostverbAuxiliaryFormInventoryText(text: string): readonly PostverbAuxiliaryFormInventoryEntry[] {
  const entries: PostverbAuxiliaryFormInventoryEntry[] = [];
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as unknown;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw new Error(`invalid postverb auxiliary row at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const row = raw as { readonly [key: string]: unknown };
    for (const key of Object.keys(row)) {
      if (!POSTVERB_AUXILIARY_ROW_KEYS.has(key)) {
        throw new Error(`unknown postverb auxiliary row key '${key}' at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const forms = parsePostverbAuxiliaryForms(row.forms, lineNumber);
    entries.push({
      forms,
      payload: parsePostverbAuxiliaryPayload(row.payload, lineNumber)
    });
  }
  return entries;
}

function parsePostverbAuxiliaryForms(value: unknown, lineNumber: number): readonly string[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((form): form is string => typeof form === "string" && form.length > 0)
  ) {
    return value;
  }
  throw new Error(`invalid postverb auxiliary forms at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePostverbAuxiliaryPayload(value: unknown, lineNumber: number): PostverbAuxiliaryPayload {
  if (typeof value !== "object" || value === null) {
    throw new Error(`invalid postverb auxiliary payload at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const raw = value as { readonly [key: string]: unknown };
  for (const key of Object.keys(raw)) {
    if (!POSTVERB_AUXILIARY_PAYLOAD_KEYS.has(key)) {
      throw new Error(`unknown postverb auxiliary payload key '${key}' at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  const kind = parsePostverbAuxiliaryKind(raw.kind, lineNumber);
  return {
    kind,
    opChainHost: parseOpChainHost(raw.opChainHost, lineNumber),
    ...(raw.followingAuxiliaryKind === undefined
      ? {}
      : { followingAuxiliaryKind: parsePostverbAuxiliaryKind(raw.followingAuxiliaryKind, lineNumber) }),
    ...(raw.requiredPrefixForms === undefined
      ? {}
      : { requiredPrefixForms: parseRequiredPrefixForms(raw.requiredPrefixForms, lineNumber) }),
    requiredHostForms: parseRequiredHostForms(raw.requiredHostForms, lineNumber),
    ...(raw.compoundDispatch === undefined
      ? {}
      : { compoundDispatch: parseCompoundDispatch(raw.compoundDispatch, lineNumber) }),
    ...(raw.admitsPrecedingNegation === undefined
      ? {}
      : { admitsPrecedingNegation: parseAdmitsPrecedingNegation(raw.admitsPrecedingNegation, lineNumber) }),
    ...(raw.sourceTokenClass === undefined
      ? {}
      : { sourceTokenClass: parseSourceTokenClass(raw.sourceTokenClass, lineNumber) }),
    ...(raw.admitsImperativeTerminal === undefined
      ? {}
      : { admitsImperativeTerminal: parseAdmitsImperativeTerminal(raw.admitsImperativeTerminal, lineNumber) }),
    ...(raw.completionTeIruNegativeStrategy === undefined
      ? {}
      : { completionTeIruNegativeStrategy: parseCompletionTeIruNegativeStrategy(raw.completionTeIruNegativeStrategy, lineNumber) }),
    ...(raw.completionFollowingPassiveStrategy === undefined
      ? {}
      : { completionFollowingPassiveStrategy: parseCompletionFollowingPassiveStrategy(raw.completionFollowingPassiveStrategy, lineNumber) }),
    ...(raw.completionAdverb === undefined
      ? {}
      : { completionAdverb: parseString(raw.completionAdverb, "completionAdverb", ctx, lineNumber) }),
    ...(raw.hostAdverb === undefined
      ? {}
      : { hostAdverb: parseString(raw.hostAdverb, "hostAdverb", ctx, lineNumber) }),
    ...(raw.hostLookup === undefined
      ? {}
      : { hostLookup: parseString(raw.hostLookup, "hostLookup", ctx, lineNumber) }),
    ...(raw.sahenHostProjection === undefined
      ? {}
      : { sahenHostProjection: parseSahenHostProjection(raw.sahenHostProjection, lineNumber) }),
    ...(raw.koreanActionLemma === undefined
      ? {}
      : { koreanActionLemma: parseString(raw.koreanActionLemma, "koreanActionLemma", ctx, lineNumber) }),
    ...(raw.koreanActionIrregular === undefined
      ? {}
      : { koreanActionIrregular: parseNullableIrregular(raw.koreanActionIrregular, "koreanActionIrregular", ctx, lineNumber) }),
    ...(raw.followingRareruDefault === undefined
      ? {}
      : { followingRareruDefault: parseFollowingRareruDefault(raw.followingRareruDefault, lineNumber) }),
    ...(raw.perception === undefined
      ? {}
      : { perception: parsePerception(raw.perception, lineNumber) })
  };
}

function parseOpChainHost(
  value: unknown,
  lineNumber: number
): NonNullable<PostverbAuxiliaryPayload["opChainHost"]> {
  if (value === "inflecting_predicate_lemma" || value === "unrestricted") {
    return value;
  }
  throw new Error(
    `invalid postverb auxiliary opChainHost at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`
  );
}

function parseRequiredHostForms(
  value: unknown,
  lineNumber: number
): NonNullable<PostverbAuxiliaryPayload["requiredHostForms"]> {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    new Set(value).size === value.length &&
    value.every((item): item is PostverbHostAttachForm =>
      POSTVERB_HOST_ATTACH_FORM_VALUES.includes(item as PostverbHostAttachForm)
    )
  ) {
    return value;
  }
  throw new Error(`invalid postverb auxiliary requiredHostForms at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

const COMPOUND_DISPATCH_KEYS = new Set(["stream", "sahen"]);

function parseCompoundDispatch(value: unknown, lineNumber: number): PostverbCompoundDispatch {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`invalid postverb auxiliary compoundDispatch at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  const raw = value as { readonly [key: string]: unknown };
  const keys = Object.keys(raw);
  if (keys.length === 0) {
    throw new Error(`invalid postverb auxiliary compoundDispatch at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
  }
  for (const key of keys) {
    if (!COMPOUND_DISPATCH_KEYS.has(key)) {
      throw new Error(`unknown postverb auxiliary compoundDispatch lane '${key}' at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
  }
  return {
    ...(raw.stream === undefined ? {} : { stream: parseCompoundDispatchHint(raw.stream, lineNumber) }),
    ...(raw.sahen === undefined ? {} : { sahen: parseCompoundDispatchHint(raw.sahen, lineNumber) })
  };
}

function parseCompoundDispatchHint(value: unknown, lineNumber: number): CompoundDispatchHint {
  if (typeof value === "string" && COMPOUND_DISPATCH_HINT_VALUES.includes(value as CompoundDispatchHint)) {
    return value as CompoundDispatchHint;
  }
  throw new Error(`invalid postverb auxiliary compoundDispatch hint at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseAdmitsPrecedingNegation(value: unknown, lineNumber: number): boolean {
  if (value === true) {
    return value;
  }
  throw new Error(`invalid postverb auxiliary admitsPrecedingNegation at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseSourceTokenClass(value: unknown, lineNumber: number): PostverbSourceTokenClass {
  if (typeof value === "string" && POSTVERB_SOURCE_TOKEN_CLASS_VALUES.includes(value as PostverbSourceTokenClass)) {
    return value as PostverbSourceTokenClass;
  }
  throw new Error(`invalid postverb auxiliary sourceTokenClass at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseAdmitsImperativeTerminal(value: unknown, lineNumber: number): boolean {
  if (value === true) {
    return value;
  }
  throw new Error(`invalid postverb auxiliary admitsImperativeTerminal at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseRequiredPrefixForms(value: unknown, lineNumber: number): readonly string[] {
  if (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((form): form is string => typeof form === "string" && form.length > 0)
  ) {
    return value;
  }
  throw new Error(`invalid postverb auxiliary requiredPrefixForms at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePostverbAuxiliaryKind(value: unknown, lineNumber: number): PostverbAuxiliaryKind {
  if (typeof value === "string" && POSTVERB_AUXILIARY_KINDS.has(value as PostverbAuxiliaryKind)) {
    return value as PostverbAuxiliaryKind;
  }
  throw new Error(`invalid postverb auxiliary kind at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseCompletionTeIruNegativeStrategy(value: unknown, lineNumber: number): CompletionTeIruNegativeStrategy {
  if (value === "negative_completion" || value === "preserve_aspect") {
    return value;
  }
  throw new Error(`invalid postverb auxiliary completionTeIruNegativeStrategy at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseCompletionFollowingPassiveStrategy(value: unknown, lineNumber: number): CompletionFollowingPassiveStrategy {
  if (value === "completion_causative") {
    return value;
  }
  throw new Error(`invalid postverb auxiliary completionFollowingPassiveStrategy at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseSahenHostProjection(value: unknown, lineNumber: number): NonNullable<PostverbAuxiliaryPayload["sahenHostProjection"]> {
  if (value === "object_adverb" || value === "object_action_lemma") {
    return value;
  }
  throw new Error(`invalid postverb auxiliary sahenHostProjection at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseFollowingRareruDefault(value: unknown, lineNumber: number): NonNullable<PostverbAuxiliaryPayload["followingRareruDefault"]> {
  if (value === "potential") {
    return value;
  }
  throw new Error(`invalid postverb auxiliary followingRareruDefault at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parsePerception(value: unknown, lineNumber: number): NonNullable<PostverbAuxiliaryPayload["perception"]> {
  if (value === "visual" || value === "inferential") {
    return value;
  }
  throw new Error(`invalid postverb auxiliary perception at ${POSTVERB_AUXILIARY_TABLE_RELATIVE_PATH}:${lineNumber}`);
}
