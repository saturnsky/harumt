import type { ClauseBoundary } from "../commit.js";
import { defineHeadedParserEngine, headProfileDispatchSelection, type HeadProfile, type HeadProfileDescriptor } from "../../../head/profile.js";
import { projectionOpContinuationCapabilityIds } from "../../../head/capability.js";
import { auxOpsInTailNode } from "../inspect.js";
import { tryParseTailChunk, bareDemoCandidatePreemptsNegativeScopeTail, tailParserShouldYieldToAssemblerQuoteHost } from "../integration.js";
import type { IntegrationInput, TailChunkResult, ParsedTailChunk, TailChunkCandidateOptions } from "./contracts.js";

export type TailHeadProfileChunkResult =
  | (ParsedTailChunk & {
    readonly profile: HeadProfileDescriptor;
    readonly requiredContinuationCapabilityIds: readonly string[];
  })
  | Extract<TailChunkResult, { readonly ok: false }>;

interface TailHeadProfileContext {
  readonly tailChunk: TailChunkResult;
}

type PredicateTailHeadProfile = HeadProfile<TailHeadProfileContext, ParsedTailChunk>;

const PREDICATE_TAIL_HEAD_PROFILES: readonly PredicateTailHeadProfile[] = [
  {
    id: "predicate_copula_tail",
    owner: "predicate_tail",
    traceKind: "tail_chain",
    continuationCapabilities: [
      {
        id: "predicate_tail_terminal",
        kind: "terminal",
        surfaces: ["V/A/N tail terminal"],
        description: ""
      },
      {
        id: "predicate_tail_negation",
        kind: "negation",
        surfaces: ["Vない", "Aくない", "Nではない"],
        description: ""
      },
      {
        id: "predicate_tail_past",
        kind: "past",
        surfaces: ["Vた", "Aかった", "Nだった"],
        description: ""
      },
      {
        id: "predicate_tail_polite",
        kind: "polite",
        surfaces: ["Vます", "Aです", "Nです"],
        description: ""
      },
      {
        id: "predicate_tail_scope_bridge",
        kind: "scope_bridge",
        surfaces: ["Pではない", "Pじゃない", "Pわけではない", "Pのではない"],
        description: ""
      },
      {
        id: "predicate_tail_connective",
        kind: "connective",
        surfaces: ["Pけど", "Pので", "Pなら"],
        description: ""
      },
      {
        id: "predicate_tail_quote",
        kind: "quote",
        surfaces: ["Pだと", "Pだって", "Pだという", "Pかと"],
        description: ""
      },
      {
        id: "predicate_tail_nominal_frame_host",
        kind: "nominal_frame",
        surfaces: ["Pのについて", "Pことについて"],
        description: ""
      }
    ],
    requiredContinuationCapabilityIds: predicateTailRequiredCapabilityIds,
    tryBuild: (context) => context.tailChunk.ok ? context.tailChunk : null
  }
] as const;

const PREDICATE_TAIL_HEAD_ENGINE = defineHeadedParserEngine({
  id: "predicate_tail_head_chunk",
  profiles: PREDICATE_TAIL_HEAD_PROFILES
});

export function describePredicateTailHeadProfiles(): readonly HeadProfileDescriptor[] {
  return PREDICATE_TAIL_HEAD_ENGINE.describe();
}

function predicateTailRequiredCapabilityIds(tailChunk: ParsedTailChunk): readonly string[] {
  const ids = new Set<string>();
  for (const id of predicateTailBoundaryCapabilityIds(tailChunk.outgoingBoundary)) {
    ids.add(id);
  }
  for (const id of projectionOpContinuationCapabilityIds(auxOpsInTailNode(tailChunk.root.tail), {
    negation: "predicate_tail_negation",
    past: "predicate_tail_past",
    polite: "predicate_tail_polite",
    scopeBridge: "predicate_tail_scope_bridge",
    connective: "predicate_tail_connective",
    quote: "predicate_tail_quote",
    attributiveQuote: "predicate_tail_quote"
  })) {
    ids.add(id);
  }
  return [...ids];
}

function predicateTailBoundaryCapabilityIds(boundary: ClauseBoundary): readonly string[] {
  if (boundary.kind === "terminal") {
    return ["predicate_tail_terminal"];
  }
  if (boundary.connectiveKind === "question_quotative") {
    return ["predicate_tail_connective", "predicate_tail_quote"];
  }
  if (boundary.connectiveKind === "quotative" || boundary.quoteBoundary !== undefined) {
    return ["predicate_tail_quote"];
  }
  return ["predicate_tail_connective"];
}

export async function tryParseTailHeadProfileChunk(
  input: IntegrationInput,
  start: number,
  options: TailChunkCandidateOptions = {}
): Promise<TailHeadProfileChunkResult> {
  const tailChunk = await tryParseTailChunk(input, start, options);
  if (!tailChunk.ok) {
    if (tailParserShouldYieldToAssemblerQuoteHost(input.cursor, start, input.numeric, input.lookups, null)) {
      return { ok: false, reason: "assembler-owned request quote host" };
    }
    return tailChunk;
  }
  return await profileParsedTailHeadChunk(input, start, tailChunk);
}

export async function profileParsedTailHeadChunk(
  input: IntegrationInput,
  start: number,
  tailChunk: Extract<TailChunkResult, { readonly ok: true }>
): Promise<TailHeadProfileChunkResult> {
  if (bareDemoCandidatePreemptsNegativeScopeTail(tailChunk.root, input.cursor.tokens)) {
    return {
      ok: false,
      reason: "bare demo concession cannot preempt a negative scope bridge tail"
    };
  }
  if (tailParserShouldYieldToAssemblerQuoteHost(input.cursor, start, input.numeric, input.lookups, tailChunk)) {
    return {
      ok: false,
      reason: "assembler-owned request quote host",
      ...(tailChunk.candidateObservation === undefined ? {} : { observation: tailChunk.candidateObservation })
    };
  }
  const selection = headProfileDispatchSelection(await PREDICATE_TAIL_HEAD_ENGINE.arbitrate({ tailChunk }));
  if (selection === null) {
    return {
      ok: false,
      reason: "tail-parser head profile not matched",
      ...(tailChunk.candidateObservation === undefined ? {} : { observation: tailChunk.candidateObservation })
    };
  }
  return {
    ...selection.match.result,
    profile: selection.metadata.dispatchProfile,
    requiredContinuationCapabilityIds: selection.metadata.requiredContinuationCapabilityIds
  };
}
