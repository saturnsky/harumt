
import { PARTICLE_PAIRS } from "../../generator/particles.js";

type CaseSpec = string | {
  readonly allomorphKey?: string;
  readonly korean?: string;
  readonly role?: string;
};

type RoleCaseRealization = Record<string, CaseSpec | Record<string, CaseSpec>>;
type CasePreferences = Record<string, CaseSpec>;

export interface ArgumentFiller {
  readonly surfaceParticle: string;
  readonly frameParticle: string;
  readonly particleIdx: number;
  readonly headIdx: number;
  readonly surface: string;
  readonly dictionaryForm?: string;
  readonly categories?: readonly string[];
  readonly borrowed?: boolean;
  readonly voiceTransform?: string | null;
  readonly slotType?: string;
  readonly markerIdx?: number | null;
  readonly contentTokenStart?: number | null;
  readonly contentTokenEnd?: number | null;
  readonly hostIdx?: number | null;
}

export interface FrameSlotSpec {
  readonly role: string;
  readonly particles: readonly string[];
  readonly required?: boolean;
  readonly nounLookup?: readonly (string | Record<string, string | number | boolean | null>)[];
  readonly categories?: readonly string[];
  readonly surfaces?: readonly string[];
  readonly particlePosition?: string | null;
  readonly allowBorrowed?: boolean;
  readonly binding?: string | null;
  readonly slotType?: string;
  readonly markers?: readonly string[];
}

export interface FrameSpec {
  readonly frameId: string;
  readonly slots: readonly FrameSlotSpec[];
  readonly chainConditions?: Record<string, string | number | boolean | null> | null;
  readonly lexicalConditions?: Record<string, string | number | boolean | null> | null;
  readonly participantConditions?: readonly {
    readonly position: string;
    readonly categories: readonly string[];
  }[];
  readonly connectiveRole?: readonly string[];
  readonly minEvidence?: number;
  readonly default?: boolean;
}

export interface FrameMatch {
  readonly predicateIdx: number;
  readonly translationIdx: number;
  readonly frameId: string;
  readonly slots: Readonly<Record<string, ArgumentFiller>>;
  readonly priorityGroup: number;
  readonly priorityInGroup?: number;
  readonly senseIndex?: number | null;
  readonly tieBreakReason?: readonly string[];
}

export interface RoleCaseTranslation {
  readonly korean?: string;
  readonly caseRealization?: RoleCaseRealization;
  readonly casePreferences?: CasePreferences;
}

const OPT_IN_ALLOMORPH_CASES = new Map<string, string>([
  [key("assignment", "に"), "을/를"],
  [key("attention_object", "に"), "을/를"],
  [key("attention_object", "を"), "을/를"],
  [key("awareness_target", "に"), "을/를"],
  [key("event", "に"), "을/를"],
  [key("eye", "が"), "이/가"],
  [key("office_role", "に"), "으로/로"],
  [key("subject", "が"), "이/가"],
  [key("theme", "を"), "을/를"],
  [key("content", "を"), "을/를"],
  [key("interlocutor", "に"), "에게"],
  [key("work_start_object", "に"), "을/를"]
]);

const OPT_IN_FIXED_CASES = new Map<string, string>([
  [key("dispatch_destination", "に"), "에"],
  [key("perception_location", "に"), "에"],
  [key("perception_stimulus", "に"), "에"],
  [key("preference_target", "に"), "에"],
  [key("rank_goal", "に"), "에"],
  [key("seat_location", "に"), "에"],
  [key("source", "から"), "에게서"],
  [key("standard", "に"), "에"],
  [key("state_entry", "に"), "에"],
  [key("trap_location", "に"), "에"],
  [key("goal_limit", "まで"), "까지"],
  [key("vehicle", "に"), "에"],
  [key("platform", "に"), "에"],
  [key("carrier", "に"), "에"],
  [key("stimulus", "に"), "에"],
  [key("work_domain", "に"), "에"],
  [key("duration_span", "に"), "에"]
]);

const OPT_IN_PERSON_LIKE_REQUIRED = new Set([
  key("interlocutor", "に"),
  key("source", "から")
]);
const PERSON_LIKE_CATEGORIES = new Set(["person", "animate"]);
const OPT_IN_CATEGORY_REQUIRED = new Map<string, ReadonlySet<string>>([
  [key("duration_span", "に"), new Set(["time"])]
]);

export class RoleCaseAssignment {
  readonly commitmentSource: string;

  constructor(
    readonly options: {
      readonly role: string;
      readonly allomorphKey?: string | null;
      readonly korean?: string | null;
      readonly commitmentSource?: string;
    }
  ) {
    this.commitmentSource = options.commitmentSource ?? "role_case_opt_in";
    if ((this.allomorphKey === null) === (this.korean === null)) {
      throw new Error("exactly one of allomorphKey or korean is required");
    }
  }

  get role(): string {
    return this.options.role;
  }

  get allomorphKey(): string | null {
    return this.options.allomorphKey ?? null;
  }

  get korean(): string | null {
    return this.options.korean ?? null;
  }
}

export function semanticRoleCaseAssignments(options: {
  readonly frame: FrameSpec;
  readonly match: FrameMatch;
  readonly translation: RoleCaseTranslation;
}): Map<number, RoleCaseAssignment> {
  const { frame, match, translation } = options;
  if (frame.default === true) {
    return new Map();
  }

  const explicitCaseRealization = translation.caseRealization ?? {};
  const casePreferences = translation.casePreferences ?? {};

  const assignments = new Map<number, RoleCaseAssignment>();
  for (const [role, filler] of Object.entries(match.slots)) {
    if ((filler.slotType ?? "noun") === "clause") {
      continue;
    }
    if (filler.frameParticle in casePreferences) {
      continue;
    }
    const particleOverride = particleCaseSpec(explicitCaseRealization, role, filler.frameParticle);
    if (particleOverride !== undefined) {
      const assignment = roleAssignmentFromCaseSpec(role, particleOverride, "case_realization");
      if (assignment !== undefined) {
        assignments.set(filler.particleIdx, assignment);
      }
      continue;
    }
    const roleOverride = roleCaseSpec(explicitCaseRealization, role);
    if (roleOverride !== undefined) {
      const assignment = roleAssignmentFromCaseSpec(role, roleOverride, "case_realization");
      if (assignment !== undefined) {
        assignments.set(filler.particleIdx, assignment);
      }
      continue;
    }
    const target = key(role, filler.frameParticle);
    if (OPT_IN_PERSON_LIKE_REQUIRED.has(target) && !roleHasPersonLikeCategory(frame, role, filler.categories ?? [])) {
      continue;
    }
    const requiredCategories = OPT_IN_CATEGORY_REQUIRED.get(target);
    if (requiredCategories !== undefined && !roleHasCategory(frame, role, filler.categories ?? [], requiredCategories)) {
      continue;
    }
    const allomorphKey = OPT_IN_ALLOMORPH_CASES.get(target);
    if (allomorphKey !== undefined) {
      assignments.set(filler.particleIdx, new RoleCaseAssignment({ role, allomorphKey }));
      continue;
    }
    const fixedKorean = OPT_IN_FIXED_CASES.get(target);
    if (fixedKorean !== undefined) {
      assignments.set(filler.particleIdx, new RoleCaseAssignment({ role, korean: fixedKorean }));
    }
  }
  return assignments;
}

function particleCaseSpec(caseRealization: RoleCaseRealization, role: string, particle: string): CaseSpec | undefined {
  const roleMap = caseRealization[role];
  if (roleMap === undefined || typeof roleMap === "string" || isRoleWideCaseSpec(roleMap)) {
    return undefined;
  }
  return roleMap[particle];
}

function roleCaseSpec(caseRealization: RoleCaseRealization, role: string): CaseSpec | undefined {
  const value = caseRealization[role];
  if (value !== undefined && typeof value !== "string" && !isRoleWideCaseSpec(value)) {
    return undefined;
  }
  return value;
}

function isRoleWideCaseSpec(value: Record<string, CaseSpec>): value is Exclude<CaseSpec, string> {
  return "allomorphKey" in value || "korean" in value || "role" in value;
}

function roleAssignmentFromCaseSpec(
  role: string,
  value: CaseSpec,
  commitmentSource: string
): RoleCaseAssignment | undefined {
  const allomorphValue = typeof value === "string" ? value : value.allomorphKey;
  const koreanValue = typeof value === "string" ? value : value.korean;

  if (typeof allomorphValue === "string") {
    const allomorphKey = normalizeCasePreferenceAllomorph(allomorphValue);
    if (allomorphKey !== undefined) {
      return new RoleCaseAssignment({ role, allomorphKey, commitmentSource });
    }
  }

  if (typeof koreanValue === "string") {
    return new RoleCaseAssignment({ role, korean: koreanValue, commitmentSource });
  }

  return undefined;
}

function normalizeCasePreferenceAllomorph(value: string): string | undefined {
  if (value in PARTICLE_PAIRS) {
    return value;
  }
  return new Map([
    ["이", "이/가"],
    ["가", "이/가"],
    ["은", "은/는"],
    ["는", "은/는"],
    ["을", "을/를"],
    ["를", "을/를"],
    ["과", "과/와"],
    ["와", "과/와"],
    ["으로", "으로/로"],
    ["로", "으로/로"]
  ]).get(value);
}

function roleHasPersonLikeCategory(frame: FrameSpec, role: string, fillerCategories: readonly string[]): boolean {
  return roleHasCategory(frame, role, fillerCategories, PERSON_LIKE_CATEGORIES);
}

function roleHasCategory(
  frame: FrameSpec,
  role: string,
  fillerCategories: readonly string[],
  acceptedCategories: ReadonlySet<string>
): boolean {
  const categories = new Set(fillerCategories);
  for (const slot of frame.slots) {
    if (slot.role === role) {
      for (const category of slot.categories ?? []) {
        categories.add(category);
      }
    }
  }
  return [...categories].some((category) => acceptedCategories.has(category));
}

function key(role: string, particle: string): string {
  return `${role}\u0000${particle}`;
}
