import type { RuntimeHaruToken } from "../../types/token.js";
import { POS0, POS01, pos0in, 助詞, 助詞_終助詞, 補助記号 } from "../../types/pos.js";
import { TokenUnitIndex, type TranslationUnit } from "../translation/unit.js";

export function absorbOrphanShuujoshi(tokens: readonly RuntimeHaruToken[], units: TranslationUnit[]): void {
  const covered = new Set(units.flatMap(u => u.jpIndices));
  const unitIndex = TokenUnitIndex.build(units);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t === undefined || covered.has(i)) continue;
    if ((t.pos & POS01) !== 助詞_終助詞) continue;
    const prev = unitIndex.get(i - 1);
    if (prev !== undefined) {
      prev.jpIndices.push(i);
      unitIndex.set(i, prev);
      covered.add(i);
      continue;
    }
    for (let j = i + 1; j < tokens.length; j++) {
      if (covered.has(j)) {
        const next = unitIndex.get(j);
        if (next !== undefined) {
          next.jpIndices.push(i);
          unitIndex.set(i, next);
          covered.add(i);
        }
        break;
      }
      if (!pos0in((tokens[j]?.pos ?? 0), (1 << 助詞))) break;
    }
  }
}

export function absorbOrphanHojokigou(tokens: readonly RuntimeHaruToken[], units: TranslationUnit[]): void {
  const covered = new Set(units.flatMap(u => u.jpIndices));
  const unitIndex = TokenUnitIndex.build(units);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === undefined || covered.has(i)) continue;
    if ((t.pos & POS0) !== 補助記号) continue;
    const prev = unitIndex.get(i - 1);
    if (prev !== undefined) {
      prev.jpIndices.push(i);
      unitIndex.set(i, prev);
      covered.add(i);
      continue;
    }
    const next = unitIndex.get(i + 1);
    if (next !== undefined) {
      next.jpIndices.push(i);
      unitIndex.set(i, next);
      covered.add(i);
    }
  }
}
