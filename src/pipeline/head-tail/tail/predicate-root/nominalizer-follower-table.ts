import { lazyValue, type DataLoader } from "../../../../data-loader.js";
import { resolveDataSection } from "../../../../dictionary/data-section.js";
import { makeParseErrorContext, parseString } from "../../data/jsonl-parse-helpers.js";

const NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH = "head-tail/nominalizer_followers.jsonl";
const ctx = makeParseErrorContext("nominalizer follower", NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH);

export type NominalizerFollowerArm = "owner_arbitration";

export const NOMINALIZER_FOLLOWER_ARBITRATION_REGISTRY = {
  pronominal_no_to: ["と"],
  pronominal_no_ni: ["に"],
  question_content_ka: ["か"],
  predicate_scope_carrier_dake: ["だけ"],
  pronominal_no_de_scope_bridge: ["で"]
} as const satisfies { readonly [key: string]: readonly string[] };

export type NominalizerFollowerArbitrationKey = keyof typeof NOMINALIZER_FOLLOWER_ARBITRATION_REGISTRY;

export const NOMINALIZER_FOLLOWER_ARBITRATION_KEYS =
  Object.keys(NOMINALIZER_FOLLOWER_ARBITRATION_REGISTRY) as readonly NominalizerFollowerArbitrationKey[];

export interface NominalizerFollowerSpec {
  readonly arm: "owner_arbitration";
  readonly surface: string;
  readonly ownerArbitration: NominalizerFollowerArbitrationKey;
  readonly description?: string;
}

const NOMINALIZER_FOLLOWER_KEYS = new Set(["surface", "arm", "ownerArbitration", "description"]);

let _parsed: ReadonlyMap<string, NominalizerFollowerSpec> | undefined;

export async function initNominalizerFollowerData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH);
  const text = await loader.readTextFile(filePath);
  _parsed = parseNominalizerFollowerSpecsText(text);
}

export const NOMINALIZER_FOLLOWERS: ReadonlyMap<string, NominalizerFollowerSpec> = lazyValue(() => {
  if (_parsed === undefined) throw new Error("Nominalizer follower data not initialized");
  return _parsed;
});

export function parseNominalizerFollowerSpecsText(text: string): ReadonlyMap<string, NominalizerFollowerSpec> {
  const specs = new Map<string, NominalizerFollowerSpec>();
  const seenLines = new Map<string, number>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const parsed = JSON.parse(line) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`invalid nominalizer follower row at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}`);
    }
    const raw = parsed as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!NOMINALIZER_FOLLOWER_KEYS.has(key)) {
        throw new Error(`unknown nominalizer follower key '${key}' at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}`);
      }
    }
    const spec = parseNominalizerFollowerSpec(raw, lineNumber);
    const firstLine = seenLines.get(spec.surface);
    if (firstLine !== undefined) {
      throw new Error(
        `duplicate nominalizer follower surface '${spec.surface}' at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}; first defined at line ${firstLine}`
      );
    }
    seenLines.set(spec.surface, lineNumber);
    specs.set(spec.surface, spec);
  }
  return specs;
}

function parseNominalizerFollowerSpec(
  raw: { readonly [key: string]: unknown },
  lineNumber: number
): NominalizerFollowerSpec {
  const surface = parseString(raw.surface, "surface", ctx, lineNumber);
  const arm = parseArm(raw.arm, lineNumber);
  const description = raw.description === undefined
    ? {}
    : { description: parseString(raw.description, "description", ctx, lineNumber) };
  return {
    arm,
    surface,
    ownerArbitration: parseArbitrationKey(raw.ownerArbitration, surface, lineNumber),
    ...description
  };
}

function parseArm(value: unknown, lineNumber: number): NominalizerFollowerArm {
  if (value === "owner_arbitration") {
    return value;
  }
  throw new Error(`invalid nominalizer follower arm at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}`);
}

function parseArbitrationKey(
  value: unknown,
  surface: string,
  lineNumber: number
): NominalizerFollowerArbitrationKey {
  const key = NOMINALIZER_FOLLOWER_ARBITRATION_KEYS.find((candidate) => candidate === value);
  if (key === undefined) {
    throw new Error(
      `unknown nominalizer follower ownerArbitration at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}`
    );
  }
  const allowed: readonly string[] = NOMINALIZER_FOLLOWER_ARBITRATION_REGISTRY[key];
  if (!allowed.includes(surface)) {
    throw new Error(
      `nominalizer follower ownerArbitration '${key}' does not own surface '${surface}' at ${NOMINALIZER_FOLLOWER_TABLE_RELATIVE_PATH}:${lineNumber}`
    );
  }
  return key;
}
