import type { Warning } from "../../types/warning.js";

export function formatTranslationWarning(input: string, warning: Warning): string {
  return `[${warning.severity}] "${input}" → ${warning.type} (${warning.opKind}): ${warning.message}`;
}
