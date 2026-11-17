import type { OwnedSelectedFrameSlotFill } from "../commitment/semantic-frame.js";
import type { LookupTables } from "../lookup-tables.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { isPredicateHeadTailChainRenderPlan, type RenderPlan } from "../../types/render-plan.js";
import { renyouChuushiClosureLeftAt } from "./chuushi-closure.js";
import type { ClauseLayout } from "./index.js";

export type RenyouVerbReadingWitness =
  | { readonly kind: "object"; readonly particleIdx: number }
  | ({ readonly kind: "owned_frame_slot" } & OwnedSelectedFrameSlotFill);

export interface RenyouVerbReading {
  readonly hostIdx: number;
  readonly predicateIdx: number;
  readonly witness: RenyouVerbReadingWitness;
}

export type OwnedFrameSlotQuery = (predicateIdx: number) => readonly OwnedSelectedFrameSlotFill[];

export type RenyouVerbReadingFacts = ReadonlyMap<number, RenyouVerbReading>;

interface ContentPlanSpan {
  readonly start: number;
  readonly consumed: number;
  readonly renderPlan: RenderPlan | null;
}

export function collectRenyouVerbReadingProposals(
  tokens: readonly RuntimeHaruToken[],
  layout: ClauseLayout,
  lookups: LookupTables,
  frameSlots: OwnedFrameSlotQuery
): Map<number, RenyouVerbReading> {
  const proposals = new Map<number, RenyouVerbReading>();
  for (let idx = 0; idx < tokens.length; idx += 1) {
    const left = renyouChuushiClosureLeftAt(tokens, idx, lookups);
    if (left === null || layout.chuushiClosureAt(left.splitAt) !== undefined || layout.renyouJunctureAt(left.splitAt) !== undefined) {
      continue;
    }
    const witness = verbReadingWitnessOf(layout, left.predicateIdx, frameSlots);
    if (witness === null) {
      continue;
    }
    proposals.set(idx, { hostIdx: idx, predicateIdx: left.predicateIdx, witness });
  }
  return proposals;
}

export function reverifiedRenyouVerbReadings(
  tokens: readonly RuntimeHaruToken[],
  proposed: RenyouVerbReadingFacts,
  layout: ClauseLayout,
  contentMap: ReadonlyMap<number, ContentPlanSpan>,
  lookups: LookupTables,
  frameSlots: OwnedFrameSlotQuery
): Map<number, RenyouVerbReading> {
  const kept = new Map<number, RenyouVerbReading>();
  for (const [hostIdx, reading] of proposed) {
    const left = renyouChuushiClosureLeftAt(tokens, hostIdx, lookups);
    if (
      left === null ||
      left.predicateIdx !== reading.predicateIdx ||
      layout.chuushiClosureAt(left.splitAt)?.hostKind !== "renyou" ||
      !witnessStandsAgain(layout, reading, frameSlots) ||
      !isPredicateHeadTailChainRenderPlan(contentSpanCovering(contentMap, hostIdx)?.renderPlan)
    ) {
      continue;
    }
    kept.set(hostIdx, reading);
  }
  return kept;
}

export function sameRenyouVerbReadingFacts(left: RenyouVerbReadingFacts, right: RenyouVerbReadingFacts): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [hostIdx, reading] of left) {
    const other = right.get(hostIdx);
    if (
      other === undefined ||
      other.predicateIdx !== reading.predicateIdx ||
      !sameWitness(other.witness, reading.witness)
    ) {
      return false;
    }
  }
  return true;
}

function verbReadingWitnessOf(
  layout: ClauseLayout,
  predicateIdx: number,
  frameSlots: OwnedFrameSlotQuery
): RenyouVerbReadingWitness | null {
  const objectParticleIdx = ownedObjectParticleOf(layout, predicateIdx);
  if (objectParticleIdx !== null && objectParticleIdx < predicateIdx) {
    return { kind: "object", particleIdx: objectParticleIdx };
  }
  const fill = frameSlots(predicateIdx).find((candidate) => candidate.particleIdx < predicateIdx);
  return fill === undefined ? null : { kind: "owned_frame_slot", ...fill };
}

function witnessStandsAgain(layout: ClauseLayout, reading: RenyouVerbReading, frameSlots: OwnedFrameSlotQuery): boolean {
  const witness = reading.witness;
  if (witness.kind === "object") {
    return ownedObjectParticleOf(layout, reading.predicateIdx) === witness.particleIdx;
  }
  return frameSlots(reading.predicateIdx).some((fill) => sameWitness({ kind: "owned_frame_slot", ...fill }, witness));
}

function sameWitness(left: RenyouVerbReadingWitness, right: RenyouVerbReadingWitness): boolean {
  if (left.kind === "object" || right.kind === "object") {
    return left.kind === right.kind && left.particleIdx === right.particleIdx;
  }
  return left.particleIdx === right.particleIdx &&
    left.role === right.role &&
    left.frameId === right.frameId &&
    left.translationIdx === right.translationIdx &&
    left.senseIndex === right.senseIndex &&
    left.priorityGroup === right.priorityGroup &&
    left.priorityInGroup === right.priorityInGroup;
}

function ownedObjectParticleOf(layout: ClauseLayout, predicateIdx: number): number | null {
  const assignment = layout.argumentRolesOf(predicateIdx).find((candidate) =>
    candidate.role === "object" && layout.ownerPredicateOfParticle(candidate.particleIdx) === predicateIdx
  );
  return assignment?.particleIdx ?? null;
}

function contentSpanCovering(contentMap: ReadonlyMap<number, ContentPlanSpan>, idx: number): ContentPlanSpan | undefined {
  for (const span of contentMap.values()) {
    if (span.start <= idx && idx < span.start + Math.max(1, span.consumed)) {
      return span;
    }
  }
  return undefined;
}
