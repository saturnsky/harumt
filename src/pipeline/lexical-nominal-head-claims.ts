import type { MorphemeDictionary } from "../dictionary/morpheme.js";
import type { RuntimeHaruToken } from "../types/token.js";
import { POS0, 名詞, 동사, 형용사 } from "../types/pos.js";
import type { LexicalNominalHeadClaims } from "./clause-layout/layout-types.js";
import type { LookupTables } from "./lookup-tables.js";
import {
  adnominalNoRelationSlotAcceptsHost,
  frameSpecFromDict,
  isAdnominalNoRelationSlot,
  adnominalHeadBearerSlotAcceptsHead,
  isAdnominalHeadBearerSlot,
  type FrameJsonMap,
  type FrameSlotSpec,
  type FrameSpec
} from "./semantics/frame.js";

interface FrameSlotDeclaration {
  readonly frame: FrameSpec;
  readonly slot: FrameSlotSpec;
}

export async function collectLexicalNominalHeadClaims(
  dictionary: MorphemeDictionary,
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): Promise<LexicalNominalHeadClaims> {
  const relationDeclarations = new Map<number, readonly FrameSlotDeclaration[]>();
  const bearerDeclarations = new Map<number, readonly FrameSlotDeclaration[]>();
  const predicateSenseHosts = new Set<number>();
  for (const [index, token] of tokens.entries()) {
    if ((token.pos & POS0) !== 名詞) {
      continue;
    }
    const entry = await dictionary.lookupTokenExact(token);
    const relation: FrameSlotDeclaration[] = [];
    const bearer: FrameSlotDeclaration[] = [];
    for (const sense of entry?.senses ?? []) {
      if (sense.koreanPos === 형용사 || sense.koreanPos === 동사) {
        predicateSenseHosts.add(index);
      }
      const frames = sense.senseFrames ?? (sense.senseFrame === undefined ? [] : [sense.senseFrame]);
      for (const frameData of frames) {
        const frame = frameSpecFromDict(frameData as FrameJsonMap);
        for (const slot of frame.slots) {
          if (isAdnominalNoRelationSlot(slot)) {
            relation.push({ frame, slot });
          } else if (isAdnominalHeadBearerSlot(slot)) {
            bearer.push({ frame, slot });
          }
        }
      }
    }
    if (relation.length > 0) {
      relationDeclarations.set(index, relation);
    }
    if (bearer.length > 0) {
      bearerDeclarations.set(index, bearer);
    }
  }
  return {
    adnominalNoRelationSlotAccepts(headIdx: number, hostIdx: number): boolean {
      const host = tokens[hostIdx];
      const declared = relationDeclarations.get(headIdx);
      return host !== undefined && declared !== undefined &&
        declared.some(({ frame, slot }) => adnominalNoRelationSlotAcceptsHost(frame, slot, host, lookups));
    },
    adnominalHeadBearerSlotAccepts(hostIdx: number, headIdx: number): boolean {
      const head = tokens[headIdx];
      const declared = bearerDeclarations.get(hostIdx);
      return head !== undefined && declared !== undefined &&
        declared.some(({ frame, slot }) => adnominalHeadBearerSlotAcceptsHead(frame, slot, head, lookups));
    },
    predicateSenseDeclaredAt(hostIdx: number): boolean {
      return predicateSenseHosts.has(hostIdx);
    }
  };
}
