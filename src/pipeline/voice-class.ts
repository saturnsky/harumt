export type PassiveClass =
  | "lexical_event"
  | "resultative_state"
  | "adversative"
  | "possessor"
  | "reporting"
  | "reporting_label"
  | "causative_coercive"
  | "causative_passive_neutral";
export const PASSIVE_CLASS_VALUES = [
  "lexical_event",
  "resultative_state",
  "adversative",
  "possessor",
  "reporting",
  "reporting_label",
  "causative_coercive",
  "causative_passive_neutral"
] as const satisfies readonly PassiveClass[];
type _PassiveClassExhaustive = [PassiveClass] extends [
  (typeof PASSIVE_CLASS_VALUES)[number]
] ? true : never;
const _passiveClassCoverage: _PassiveClassExhaustive = true;
void _passiveClassCoverage;

export type SubjectAnimacyEvidence = "animate" | "inanimate" | "unknown" | "absent";

export interface PassiveSurfacePolicyEvidence {
  readonly isReportingPassive: boolean;
  readonly isReportingLabel: boolean;
  readonly isPassive: boolean;
  readonly isCausativePassive: boolean;
  readonly predicateInPassiveResultativeSet: boolean;
  readonly predicateInPossessorSet: boolean;
  readonly predicateInIntransitiveAdversativeSet: boolean;
  readonly predicateInCausativeCoerciveSet: boolean;
  readonly predicateInCausativeNeutralSet: boolean;
  readonly hasProgressiveTeIru: boolean;
  readonly hasPast: boolean;
  readonly hasNegative: boolean;
  readonly isAttributive: boolean;
  readonly hasExplicitWoObject: boolean;
  readonly hasPossessorWoObject: boolean;
  readonly hasAdversativeSource: boolean;
  readonly hasAnimateNiAgent: boolean;
  readonly consumesPassiveAux: boolean;
  readonly subjectAnimacy: SubjectAnimacyEvidence;
}

export function classifyPassiveSurfacePolicy(evidence: PassiveSurfacePolicyEvidence): PassiveClass {
  if (evidence.isReportingPassive) {
    return evidence.isReportingLabel ? "reporting_label" : "reporting";
  }
  if (evidence.isCausativePassive) {
    if (
      evidence.predicateInCausativeCoerciveSet &&
      !evidence.predicateInCausativeNeutralSet &&
      evidence.hasAnimateNiAgent &&
      evidence.hasPast &&
      !evidence.hasNegative &&
      !evidence.isAttributive &&
      evidence.hasExplicitWoObject
    ) {
      return "causative_coercive";
    }
    return "causative_passive_neutral";
  }
  if (
    evidence.isPassive &&
    evidence.hasProgressiveTeIru &&
    evidence.predicateInPassiveResultativeSet
  ) {
    if (evidence.subjectAnimacy === "inanimate") {
      return "resultative_state";
    }
    if (evidence.subjectAnimacy === "absent" && !evidence.hasAnimateNiAgent) {
      return "resultative_state";
    }
  }
  if (
    evidence.isPassive &&
    evidence.predicateInPossessorSet &&
    evidence.hasPossessorWoObject &&
    evidence.subjectAnimacy !== "inanimate"
  ) {
    return "possessor";
  }
  if (
    evidence.isPassive &&
    (evidence.hasAnimateNiAgent || (evidence.hasAdversativeSource && evidence.predicateInIntransitiveAdversativeSet)) &&
    !evidence.consumesPassiveAux &&
    (evidence.predicateInIntransitiveAdversativeSet || evidence.hasExplicitWoObject)
  ) {
    return "adversative";
  }
  return "lexical_event";
}
