import type { TokenCursor } from "../../../../token-cursor.js";
import type { ContestedBareStemNominalUseSlot } from "../../../../candidate-runtime.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { MorphemeEntry } from "../../../../../types/dictionary.js";
import type { NumericBasePayload } from "../../../../../types/numeric-base.js";
import type { Warning } from "../../../../../types/warning.js";
import type { TailChainPartialArtifact } from "../../chain.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { NumericTables } from "../../../../../generator/numeric-lookup.js";
import type { ClauseBoundary } from "../commit.js";
import type { HeadTailEvidenceDecision, HeadHypothesisCarrier, TailRoot } from "../grammar.js";

export interface DictLookup {
  lookupTokenRelaxed(token: RuntimeHaruToken): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined>;
  lookup?(dictionaryForm: string, reading: string, pos: number | string | readonly string[]): MorphemeEntry | undefined | Promise<MorphemeEntry | undefined>;
}

export type PredicateTailSyntheticEntryResolver = (
  token: RuntimeHaruToken,
  options?: { readonly nextToken?: RuntimeHaruToken | null }
) => MorphemeEntry | Promise<MorphemeEntry>;

export interface IntegrationInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly dictionary: DictLookup;
  readonly formal: boolean;
  readonly synthesizeEntry?: PredicateTailSyntheticEntryResolver;
  readonly lookups: LookupTables;
  readonly numeric: NumericTables;
  readonly numericHostReservation?: NumericHostReservation;
}

export interface NumericHostReservation {
  readonly tokenIdx: number;
  readonly consumed: number;
  readonly plan: NumericBasePayload;
  readonly claimRequired: boolean;
}

export type IntegrationResult =
  | {
    readonly ok: true;
    readonly text: string;
    readonly polite: boolean;
    readonly warnings: readonly Warning[];
  }
  | { readonly ok: false; readonly reason: string };

export type TailChunkResult =
  | {
    readonly ok: true;
    readonly consumed: number;
    readonly root: TailRoot;
    readonly predicateTokenIdx: number;
    readonly outgoingBoundary: ClauseBoundary;
    readonly partial?: TailChainPartialArtifact;
    readonly candidateObservation?: TailChunkCandidateObservation;
    readonly contestedNominalUseSlot?: ContestedBareStemNominalUseSlot;
  }
  | {
    readonly ok: false;
    readonly reason: string;
    readonly observation?: TailChunkCandidateObservation;
    readonly intake?: TailChunkIntakeVerdict;
  };

export type TailChunkIntakeVerdict = "out_of_domain";

export type ParsedTailChunk = Extract<TailChunkResult, { readonly ok: true }>;
export type NonTerminalClauseBoundary = Exclude<ClauseBoundary, { readonly kind: "terminal" }>;

export interface TailChunkCandidateOptions {
  readonly maxEndExclusive?: number;
}

export interface TailChunkCandidateCollection {
  readonly candidates: readonly ParsedTailChunk[];
  readonly lastReason: string;
  readonly observation?: TailChunkCandidateObservation;
  readonly intake?: TailChunkIntakeVerdict;
}

export interface TailChunkCandidateAttemptObservation {
  readonly end: number;
  readonly status:
  | "candidate"
  | "parse_failure"
  | "render_failure"
  | "semantic_filter"
  | "no_boundary"
  | "partial_candidate";
  readonly boundaryKind?: string;
  readonly boundaryConnective?: string | null;
  readonly reason?: string;
  readonly consumed?: number;
  readonly headHypothesis?: HeadHypothesisCarrier;
}

export interface TailChunkCandidateObservation {
  readonly start: number;
  readonly requestedMaxEndExclusive: number;
  readonly scanEnd: number;
  readonly candidateCount: number;
  readonly lastReason: string;
  readonly attempts: readonly TailChunkCandidateAttemptObservation[];
  readonly interpretations?: readonly TailInterpretationCandidateObservation[];
}

export interface TailInterpretationCandidateObservation {
  readonly ownerKey: string;
  readonly source: "predicate_root_parser" | "postverb_competition" | "partial_candidate";
  readonly evidenceKind: string;
  readonly span: { readonly start: number; readonly endExclusive: number };
  readonly specificity: number;
  readonly spanCompleteness: "complete" | "partial";
  readonly structuralEvidence: "postverb_auxiliary" | "tail_root_parse" | "partial_prefix";
  readonly ownerPrecedence: number;
  readonly declarationOrder: number;
  readonly eligible: boolean;
  readonly arbitrationRule: string;
  readonly arbitrationReason: string;
  readonly selected: boolean;
  readonly rejectionReason?: string;
  readonly headEvidenceDecision?: HeadTailEvidenceDecision;
}

export type TailParserSourceStemKind = "verb" | "adj" | "noun";

export type AdverbialSurfacePostverbKind = "change" | "potential" | "control";

export interface ParseSliceSourceHost {
  readonly cursor: TokenCursor<RuntimeHaruToken>;
  readonly start: number;
}
