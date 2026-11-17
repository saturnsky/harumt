import {
  defineHeadedParserEngine,
  headProfileDispatchSelection,
  type HeadOwnerCandidateDescriptor,
  type HeadProfile,
  type HeadProfileArbitrationDecision,
  type HeadProfileDispatchSelection,
  type HeadProfileDescriptor,
  type HeadProfileMatch
} from "./profile.js";

export interface HeadFamilyOwnerCandidateOptions<Result> {
  readonly match: HeadProfileMatch<Result>;
  readonly selectedProfileId: string | null;
  readonly dispatchStart: number;
}

export interface HeadFamilyRegistration<Context, Result> extends HeadProfile<Context, Result> {
  readonly ownerCandidate: (options: HeadFamilyOwnerCandidateOptions<Result>) => HeadOwnerCandidateDescriptor;
}

export interface HeadFamilyRunnerDescriptor {
  readonly id: string;
  readonly profileIds: readonly string[];
  readonly allowArbitrationGroupTies: boolean;
}

export interface HeadFamilyRunner<Context, Result> {
  readonly id: string;
  arbitrate(context: Context): Promise<HeadProfileArbitrationDecision<Result>>;
  ownerCandidates(
    decision: HeadProfileArbitrationDecision<Result>,
    options: { readonly dispatchStart: number }
  ): readonly HeadOwnerCandidateDescriptor[];
  select(
    decision: HeadProfileArbitrationDecision<Result>,
    options?: { readonly ownerCandidates?: readonly HeadOwnerCandidateDescriptor[] }
  ): HeadProfileDispatchSelection<Result> | null;
  describe(): readonly HeadProfileDescriptor[];
  describeRunner(): HeadFamilyRunnerDescriptor;
}

export function defineHeadFamilyRunner<Context, Result>(options: {
  readonly id: string;
  readonly families: readonly HeadFamilyRegistration<Context, Result>[];
  readonly allowArbitrationGroupTies?: boolean;
}): HeadFamilyRunner<Context, Result> {
  const engine = defineHeadedParserEngine({
    id: options.id,
    profiles: options.families,
    ...(options.allowArbitrationGroupTies === undefined ? {} : { allowArbitrationGroupTies: options.allowArbitrationGroupTies })
  });
  const familyByProfileId = new Map(options.families.map((family) => [family.id, family]));
  const describeRunner = (): HeadFamilyRunnerDescriptor => ({
    id: options.id,
    profileIds: engine.describe().map((profile) => profile.id),
    allowArbitrationGroupTies: options.allowArbitrationGroupTies === true
  });

  return {
    id: options.id,
    async arbitrate(context: Context): Promise<HeadProfileArbitrationDecision<Result>> {
      return engine.arbitrate(context);
    },
    ownerCandidates(
      decision: HeadProfileArbitrationDecision<Result>,
      ownerOptions: { readonly dispatchStart: number }
    ): readonly HeadOwnerCandidateDescriptor[] {
      const selectedProfileId = decision.winner?.profile.id ?? null;
      return decision.candidates.map((match) => {
        const family = familyByProfileId.get(match.profile.id);
        if (family === undefined) {
          throw new Error(
            `headed family runner '${options.id}' has no owner-candidate adapter for profile '${match.profile.id}'`
          );
        }
        return family.ownerCandidate({
          match,
          selectedProfileId,
          dispatchStart: ownerOptions.dispatchStart
        });
      });
    },
    select(
      decision: HeadProfileArbitrationDecision<Result>,
      selectOptions: { readonly ownerCandidates?: readonly HeadOwnerCandidateDescriptor[] } = {}
    ): HeadProfileDispatchSelection<Result> | null {
      return headProfileDispatchSelection(decision, selectOptions);
    },
    describe(): readonly HeadProfileDescriptor[] {
      return engine.describe();
    },
    describeRunner
  };
}
