
import type { CommitmentSpan, ParticleAssignment } from "../deferred-commitment.js";
import type { TranslationUnit } from "../translation/unit.js";
import type { UnitType } from "../translation/unit.js";
import type { Clause } from "../clause-layout/index.js";
import type { RenderPlan } from "../../types/render-plan.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { TokenCursor } from "../token-cursor.js";

export type ParticleDecisionKind = "emit" | "map_fallback";

export interface ContentSpan extends CommitmentSpan {
  start: number;
  consumed: number;
  korean: string;
  koreanPos: number;
  renderPlan: RenderPlan | null;
  unitType: UnitType;
  attachLeft: boolean;
}

export type ContentMap = ReadonlyMap<number, ContentSpan>;

export class ParticleCtx {
  constructor(
    readonly cursor: TokenCursor<RuntimeHaruToken>,
    readonly units: TranslationUnit[],
    readonly preceding: string,
    readonly referent: RuntimeHaruToken | null,
    readonly nextVerb: string | null,
    readonly nextPredicate: ContentSpan | null,
    readonly committedParticle: ParticleAssignment | null,
    readonly isAssigned: boolean,
    readonly clause: Clause | null
  ) { }

  get tokens(): readonly RuntimeHaruToken[] {
    return this.cursor.tokens;
  }

  get i(): number {
    return this.cursor.pos;
  }

  get n(): number {
    return this.cursor.end;
  }
}

export class ParticleDecision {
  constructor(
    readonly kind: ParticleDecisionKind,
    readonly consumed = 1
  ) { }
}

export type ParticleHandler = (ctx: ParticleCtx) => ParticleDecision | null | Promise<ParticleDecision | null>;
