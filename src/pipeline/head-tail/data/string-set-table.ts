import { type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";

export type HeadTailStringSetTable<Id extends string> = ReadonlyMap<Id, ReadonlySet<string>>;

const STRING_SET_ROW_KEYS = new Set(["id", "values"]);

const _fileCache = new Map<string, string>();

export async function initHeadTailStringSetData(loader: DataLoader, relativePath: string): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), `head-tail/${relativePath}`);
  _fileCache.set(relativePath, await loader.readTextFile(filePath));
}

export function loadHeadTailStringSetRows(relativePath: string): ReadonlyMap<string, ReadonlySet<string>> {
  return loadHeadTailStringSetTable<string>(relativePath, null);
}

export function loadHeadTailStringSetTable<Id extends string>(
  relativePath: string,
  allowedIds: ReadonlySet<Id> | null
): HeadTailStringSetTable<Id> {
  const text = _fileCache.get(relativePath);
  if (text === undefined) {
    throw new Error(`Data not initialized for head-tail/${relativePath}`);
  }
  const table = new Map<Id, ReadonlySet<string>>();
  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!STRING_SET_ROW_KEYS.has(key)) {
        throw new Error(`unknown head-tail string set key '${key}' at head-tail/${relativePath}:${lineNumber}`);
      }
    }
    if (typeof raw.id !== "string" || raw.id.length === 0 || (allowedIds !== null && !allowedIds.has(raw.id as Id))) {
      throw new Error(`invalid head-tail string set id at head-tail/${relativePath}:${lineNumber}`);
    }
    if (
      !Array.isArray(raw.values) ||
      !raw.values.every((value): value is string => typeof value === "string" && value.length > 0)
    ) {
      throw new Error(`invalid head-tail string set values at head-tail/${relativePath}:${lineNumber}`);
    }
    if (table.has(raw.id as Id)) {
      throw new Error(`duplicate head-tail string set id '${raw.id}' at head-tail/${relativePath}:${lineNumber}`);
    }
    table.set(raw.id as Id, new Set(raw.values));
  }
  for (const id of allowedIds ?? []) {
    if (!table.has(id)) {
      throw new Error(`missing head-tail string set '${id}' at head-tail/${relativePath}`);
    }
  }
  return table;
}

export function requireHeadTailStringSet<Id extends string>(
  table: HeadTailStringSetTable<Id>,
  id: Id
): ReadonlySet<string> {
  const values = table.get(id);
  if (values === undefined) {
    throw new Error(`missing loaded head-tail string set '${id}'`);
  }
  return values;
}

export function requireHeadTailStringArray<Id extends string>(
  table: HeadTailStringSetTable<Id>,
  id: Id
): readonly string[] {
  return [...requireHeadTailStringSet(table, id)];
}
