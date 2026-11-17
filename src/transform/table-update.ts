import type {
  AnnotationEntry,
  AnnotationMetadata,
  AnnotationTableAction,
  AnnotationTableUpdate,
} from "../types/annotation.js";

export const EMPTY_TABLE_UPDATE: AnnotationTableUpdate = [];

export function composeTableUpdates(
  ...updates: readonly AnnotationTableUpdate[]
): AnnotationTableUpdate {
  if (updates.length === 0) return EMPTY_TABLE_UPDATE;
  if (updates.length === 1) return updates[0]!;
  const actions: AnnotationTableAction[] = [];
  for (const update of updates) {
    for (const action of update) {
      actions.push(action);
    }
  }
  return actions.length === 0 ? EMPTY_TABLE_UPDATE : actions;
}

export function applyTableUpdate(
  table: ReadonlyMap<number, AnnotationEntry>,
  metadata: ReadonlyMap<number, AnnotationMetadata> | undefined,
  update: AnnotationTableUpdate,
): {
  table: Map<number, AnnotationEntry>;
  metadata: Map<number, AnnotationMetadata> | undefined;
} {
  if (update.length === 0) {
    return {
      table: new Map(table),
      metadata: metadata !== undefined ? new Map(metadata) : undefined,
    };
  }
  const newTable = new Map(table);
  let newMetadata = metadata !== undefined ? new Map(metadata) : undefined;
  for (const action of update) {
    switch (action.kind) {
      case "set":
        newTable.set(action.key, action.entry);
        break;
      case "delete":
        newTable.delete(action.key);
        break;
      case "setMetadata":
        if (newMetadata === undefined) newMetadata = new Map();
        newMetadata.set(action.key, action.metadata);
        break;
      case "deleteMetadata":
        newMetadata?.delete(action.key);
        break;
    }
  }
  return { table: newTable, metadata: newMetadata };
}

export function diffTableUpdate(
  inputTable: ReadonlyMap<number, AnnotationEntry>,
  inputMetadata: ReadonlyMap<number, AnnotationMetadata> | undefined,
  outputTable: ReadonlyMap<number, AnnotationEntry>,
  outputMetadata: ReadonlyMap<number, AnnotationMetadata> | undefined,
): AnnotationTableUpdate {
  const actions: AnnotationTableAction[] = [];

  for (const key of inputTable.keys()) {
    if (!outputTable.has(key)) {
      actions.push({ kind: "delete", key });
    }
  }
  for (const [key, entry] of outputTable) {
    if (!inputTable.has(key) || inputTable.get(key) !== entry) {
      actions.push({ kind: "set", key, entry });
    }
  }

  if (inputMetadata !== undefined) {
    for (const key of inputMetadata.keys()) {
      if (outputMetadata === undefined || !outputMetadata.has(key)) {
        actions.push({ kind: "deleteMetadata", key });
      }
    }
  }
  if (outputMetadata !== undefined) {
    for (const [key, metadata] of outputMetadata) {
      if (inputMetadata === undefined || !inputMetadata.has(key) || inputMetadata.get(key) !== metadata) {
        actions.push({ kind: "setMetadata", key, metadata });
      }
    }
  }

  return actions.length === 0 ? EMPTY_TABLE_UPDATE : actions;
}

export function nextAnnotationKey(table: ReadonlyMap<number, unknown>): number {
  let max = -1;
  for (const k of table.keys()) {
    if (k > max) max = k;
  }
  return max + 1;
}
