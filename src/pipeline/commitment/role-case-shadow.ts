
import type { FrameMatch, FrameSpec } from "./role-case.js";

export const BUCKET_OVERRIDE_REDUNDANT_WITH_DEFAULT = "override_redundant_with_default";
export const BUCKET_OVERRIDE_OVERRIDES_DEFAULT = "override_overrides_default";
export const BUCKET_OVERRIDE_WITHOUT_DEFAULT = "override_without_default";
export const BUCKET_DEFAULT_MATCHES_EXPLICIT = "default_matches_explicit";
export const BUCKET_DEFAULT_NO_EXPLICIT_PREFERENCE = "default_no_explicit_preference";
export const BUCKET_MISSING_DEFAULT = "missing_default";
export const BUCKET_EMPTY_REALIZATION = "empty_realization";
export const BUCKET_DIRECT_CASE_PREFERENCES_ON_FRAME = "direct_case_preferences_on_frame";
export const BUCKET_FALLBACK_SURFACE_PREFERENCE = "fallback_surface_preference";
export const BUCKET_MULTI_PARTICLE_UNSUPPORTED = "multi_particle_unsupported";
export const BUCKET_NO_FILLED_SLOT = "no_filled_slot";

type CaseValue = string | null;
type CaseSpec = string | {
  readonly allomorphKey?: string;
  readonly korean?: string;
  readonly role?: string;
};
type CaseRealization = Record<string, CaseSpec | Record<string, CaseSpec>>;
type CasePreferences = Record<string, CaseSpec>;

export interface RoleCasePrediction {
  readonly lemma: string | null;
  readonly frameId: string | null;
  readonly role: string;
  readonly particle: string;
  readonly predicted: CaseValue;
  readonly source: string;
  readonly confidence: string | null;
  readonly bucket: string;
  readonly default: CaseValue;
}

export interface RoleCaseShadowTranslation {
  readonly caseRealization?: CaseRealization;
  readonly casePreferences?: CasePreferences;
}

export type RoleCaseTraceValue =
  | string
  | number
  | null
  | readonly string[]
  | RoleCaseTraceRoles;

export type RoleCaseTraceRoles = Record<string, RoleCaseTraceRole>;

export interface RoleCaseTraceRole {
  readonly particle: string;
  readonly surfaceParticle: string;
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly slotCategories: readonly string[];
  readonly fillerCategories: readonly string[];
  readonly predicted: CaseValue;
  readonly predictionSource: string;
  readonly default: CaseValue;
  readonly confidence: string | null;
  readonly current: CaseSpec | null;
  readonly currentSource: string;
  readonly bucket: string;
}

export interface RoleCaseTraceDetail {
  readonly frameId: string;
  readonly translationIdx: number;
  readonly priorityGroup: number;
  readonly priorityInGroup: number;
  readonly roles: RoleCaseTraceRoles;
  readonly senseIndex?: number;
  readonly clauseIdx?: number;
}

const PERSON_LIKE_CATEGORIES = new Set(["person", "animate"]);

export function predictRoleCase(options: {
  readonly lemma: string | null;
  readonly frameId: string | null;
  readonly role: string;
  readonly particle: string;
  readonly slotCategories?: readonly string[];
  readonly fillerCategories?: readonly string[];
  readonly explicitCaseRealization?: CaseRealization | null;
}): RoleCasePrediction {
  const slotCategories = options.slotCategories ?? [];
  const fillerCategories = options.fillerCategories ?? [];
  const effectiveCategories = new Set([...slotCategories, ...fillerCategories]);
  const [defaultCase, confidence] = defaultRoleCase(options.role, options.particle, effectiveCategories);
  let explicitPresent = options.explicitCaseRealization !== undefined &&
    options.explicitCaseRealization !== null &&
    options.role in options.explicitCaseRealization;
  let explicit: CaseSpec | undefined;
  if (explicitPresent) {
    explicit = caseRealizationForParticle(options.explicitCaseRealization?.[options.role], options.particle);
    if (explicit === undefined) {
      explicitPresent = false;
    }
  }
  if (explicitPresent) {
    if (explicit === "") {
      return prediction(options, explicit, "case_realization", confidence, BUCKET_EMPTY_REALIZATION, defaultCase);
    }
    const bucket = defaultCase === null
      ? BUCKET_OVERRIDE_WITHOUT_DEFAULT
      : explicit === defaultCase
        ? BUCKET_OVERRIDE_REDUNDANT_WITH_DEFAULT
        : BUCKET_OVERRIDE_OVERRIDES_DEFAULT;
    return prediction(options, typeof explicit === "string" ? explicit : null, "case_realization", confidence, bucket, defaultCase);
  }

  if (defaultCase === null) {
    return prediction(options, null, "none", null, BUCKET_MISSING_DEFAULT, null);
  }
  return prediction(options, defaultCase, "role_default", confidence, BUCKET_DEFAULT_NO_EXPLICIT_PREFERENCE, defaultCase);
}

export function roleCaseShadowTraceDetail(options: {
  readonly lemma: string | null;
  readonly frame: FrameSpec;
  readonly match: FrameMatch;
  readonly translation: RoleCaseShadowTranslation;
  readonly clauseIdx?: number | null;
}): RoleCaseTraceDetail | null {
  if (Object.keys(options.match.slots).length === 0) {
    return null;
  }

  const explicitCaseRealization = options.translation.caseRealization;
  const casePreferences = options.translation.casePreferences ?? {};
  const slotCategories = slotCategoriesByRole(options.frame);

  const roles: RoleCaseTraceRoles = {};
  for (const [role, filler] of Object.entries(options.match.slots).sort(([left], [right]) => left.localeCompare(right))) {
    if ((filler.slotType ?? "noun") === "clause") {
      continue;
    }
    const particle = filler.frameParticle;
    const slotRoleCategories = slotCategories[role] ?? [];
    const predictionResult = predictRoleCase({
      lemma: options.lemma,
      frameId: options.frame.frameId,
      role,
      particle,
      slotCategories: slotRoleCategories,
      fillerCategories: filler.categories ?? [],
      explicitCaseRealization: explicitCaseRealization ?? null
    });
    const [current, currentSource] = currentCaseSpec(role, particle, explicitCaseRealization, casePreferences);
    let bucket = predictionResult.bucket;
    if (explicitCaseRealization === undefined && particle in casePreferences) {
      bucket = predictionResult.default !== null && current === predictionResult.default
        ? BUCKET_DEFAULT_MATCHES_EXPLICIT
        : BUCKET_DIRECT_CASE_PREFERENCES_ON_FRAME;
    }
    roles[role] = {
      particle,
      surfaceParticle: filler.surfaceParticle,
      surface: filler.surface,
      dictionaryForm: filler.dictionaryForm ?? "",
      slotCategories: slotRoleCategories,
      fillerCategories: filler.categories ?? [],
      predicted: predictionResult.predicted,
      predictionSource: predictionResult.source,
      default: predictionResult.default,
      confidence: predictionResult.confidence,
      current,
      currentSource,
      bucket
    };
  }
  if (Object.keys(roles).length === 0) {
    return null;
  }

  return {
    frameId: options.match.frameId,
    translationIdx: options.match.translationIdx,
    priorityGroup: options.match.priorityGroup,
    priorityInGroup: options.match.priorityInGroup ?? 0,
    roles,
    ...(options.match.senseIndex === undefined || options.match.senseIndex === null ? {} : { senseIndex: options.match.senseIndex }),
    ...(options.clauseIdx === undefined || options.clauseIdx === null || options.clauseIdx < 0 ? {} : { clauseIdx: options.clauseIdx })
  };
}

function defaultRoleCase(role: string, particle: string, categories: ReadonlySet<string>): readonly [CaseValue, string | null] {
  if (["theme", "patient", "content"].includes(role) && particle === "を") {
    return ["을/를", "high"];
  }
  if (["subject", "eye"].includes(role) && particle === "が") {
    return ["이/가", "high"];
  }
  if (role === "event" && particle === "に") {
    return ["을/를", "medium"];
  }
  if (role === "stimulus" && particle === "に") {
    return ["에", "medium"];
  }
  if ([
    "standard",
    "trap_location",
    "seat_location",
    "state_entry",
    "rank_goal",
    "work_domain",
    "preference_target",
    "perception_location",
    "perception_stimulus",
    "duration_span",
    "dispatch_destination"
  ].includes(role) && particle === "に") {
    return ["에", "medium"];
  }
  if (["assignment", "work_start_object", "awareness_target", "attention_object"].includes(role) && particle === "に") {
    return ["을/를", "medium"];
  }
  if (role === "attention_object" && particle === "を") {
    return ["을/를", "high"];
  }
  if (role === "office_role" && particle === "に") {
    return ["으로/로", "medium"];
  }
  if (role === "interlocutor" && particle === "に" && hasCategory(categories, PERSON_LIKE_CATEGORIES)) {
    return ["에게", "medium"];
  }
  if (role === "source" && particle === "から") {
    if (hasCategory(categories, PERSON_LIKE_CATEGORIES)) {
      return ["에게서", "medium"];
    }
    return ["에서", "low"];
  }
  if (role === "goal" && (particle === "に" || particle === "へ")) {
    return ["에", "medium"];
  }
  if (role === "identity_return_goal" && particle === "に") {
    return ["으로/로", "medium"];
  }
  if (role === "goal_limit" && particle === "まで") {
    return ["까지", "high"];
  }
  if (["vehicle", "platform", "carrier"].includes(role) && particle === "に") {
    return ["에", "medium"];
  }
  if (role === "location" && particle === "で") {
    return ["에서", "medium"];
  }
  if (role === "instrument" && particle === "で") {
    return ["으로/로", "medium"];
  }
  return [null, null];
}

function slotCategoriesByRole(frame: FrameSpec): Record<string, readonly string[]> {
  const categoriesByRole: Record<string, string[]> = {};
  for (const slot of frame.slots) {
    if (slot.categories === undefined || slot.categories.length === 0) {
      continue;
    }
    const target = categoriesByRole[slot.role] ?? [];
    for (const category of slot.categories) {
      if (!target.includes(category)) {
        target.push(category);
      }
    }
    categoriesByRole[slot.role] = target;
  }
  return categoriesByRole;
}

function currentCaseSpec(
  role: string,
  particle: string,
  explicitCaseRealization: CaseRealization | undefined,
  casePreferences: CasePreferences
): readonly [CaseSpec | null, string] {
  if (explicitCaseRealization !== undefined && role in explicitCaseRealization) {
    const particleValue = caseRealizationForParticle(explicitCaseRealization[role], particle);
    if (particleValue !== undefined) {
      return [particleValue, "case_realization"];
    }
  }
  if (particle in casePreferences) {
    return [casePreferences[particle] ?? null, "case_preferences"];
  }
  return [null, "global_particle_renderer"];
}

function caseRealizationForParticle(value: CaseSpec | Record<string, CaseSpec> | undefined, particle: string): CaseSpec | undefined {
  if (value !== undefined && typeof value !== "string" && !isRoleWideCaseSpec(value)) {
    return value[particle];
  }
  return value;
}

function isRoleWideCaseSpec(value: Record<string, CaseSpec>): value is Exclude<CaseSpec, string> {
  return "allomorphKey" in value || "korean" in value || "role" in value;
}

function prediction(
  options: {
    readonly lemma: string | null;
    readonly frameId: string | null;
    readonly role: string;
    readonly particle: string;
  },
  predicted: CaseValue,
  source: string,
  confidence: string | null,
  bucket: string,
  defaultCase: CaseValue
): RoleCasePrediction {
  return {
    lemma: options.lemma,
    frameId: options.frameId,
    role: options.role,
    particle: options.particle,
    predicted,
    source,
    confidence,
    bucket,
    default: defaultCase
  };
}

function hasCategory(categories: ReadonlySet<string>, targets: ReadonlySet<string>): boolean {
  return [...categories].some((category) => targets.has(category));
}
