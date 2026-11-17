import type { IrregularType } from "../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { NumericStemBase } from "../../../../types/numeric-base.js";
import type { PronominalNoHeadStemBase } from "../../../nominal-phrase-surface.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type {
  ShortNegationPolicy,
  SourcePredicateShape,
  StemCandidate,
  StemCommitment,
  HeadHypothesisCarrier,
  NounStem,
  OpSource,
  TeFormConnectiveRole,
  VerbConjType
} from "./grammar.js";
import type { ElidedColloquialObligationContext } from "./matchers/obligation.js";
import type { ElidedDewaNegativeBodyClosure } from "./matchers/copula.js";
import type { ParseOutgoingBoundaryHint } from "./parse-boundary-hint.js";
import type { QuoteAttributiveHeadFrame } from "./quote-attributive-head-frame.js";
import type { CanonicalReformulationMarkerRelationIndex } from "../../boundary/ka-ownership.js";

export type AdverbialModifierMarker = "copula_ni" | "none";

export interface SingleStemInput {
  readonly kind: "verb" | "adj" | "adverb";
  readonly lemma: string;
  readonly irregular: IrregularType | null;
  readonly conj?: VerbConjType;
  readonly commitment?: StemCommitment;
  readonly shortNegationPolicy?: ShortNegationPolicy;
  readonly absorbedPassiveAux?: boolean;
  readonly sourcePredicateShape?: SourcePredicateShape;
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
}

export interface CandidateSetStemInput {
  readonly kind: "candidateSet";
  readonly candidates: readonly StemCandidate[];
  readonly headHypothesis?: HeadHypothesisCarrier;
  readonly commitment?: StemCommitment;
  readonly shortNegationPolicy?: ShortNegationPolicy;
  readonly absorbedPassiveAux?: boolean;
  readonly sourcePredicateShape?: SourcePredicateShape;
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
}

export interface NounStemInput {
  readonly kind: "noun";
  readonly lemma: string;
  readonly sahen?: boolean;
  readonly numericBase?: NumericStemBase;
  readonly pronominalNoHeadBase?: PronominalNoHeadStemBase;
  readonly commitment?: StemCommitment;
  readonly sourcePredicateShape?: SourcePredicateShape;
  readonly nominalTargetForVerbalSource?: boolean;
  readonly interjection?: NounStem["interjection"];
  readonly koreanPrefix?: string;
  readonly koreanSuffix?: string;
}

export type StemInput = SingleStemInput | CandidateSetStemInput | NounStemInput;

export interface ParseInput {
  readonly tokens: readonly RuntimeHaruToken[];
  readonly start: number;
  readonly stem: StemInput;
  readonly headHypothesis?: HeadHypothesisCarrier;
  readonly lookups: LookupTables;
  readonly allowElidedColloquialObligation?: boolean | ElidedColloquialObligationContext;
  readonly allowElidedNaitoObligation?: boolean;
  readonly allowRenyouChuushiTerminal?: boolean;
  readonly renyouChuushiTerminalRole?: TeFormConnectiveRole;
  readonly allowMalformedConditionalFragmentTerminal?: boolean;
  readonly allowPlainNominalizerTerminal?: boolean;
  readonly allowElidedDewaNegativeBody?: ElidedDewaNegativeBodyClosure;
  readonly allowElidedNominalizerTerminal?: boolean;
  readonly semanticStemToken?: RuntimeHaruToken;
  readonly allowZeroNiPurposeTerminal?: boolean;
  readonly allowAdnominalCopulaTerminal?: boolean;
  readonly allowRenyouCompoundPrenominalTerminal?: boolean;
  readonly allowExplicitAdnominalNoTerminal?: boolean;
  readonly allowNoQuoteReportingProjection?: boolean;
  readonly outgoingBoundaryHint?: ParseOutgoingBoundaryHint;
  readonly streamStart?: number;
  readonly sourceIndexMap?: readonly number[];
  readonly contextTokens?: readonly RuntimeHaruToken[];
  readonly canonicalReformulationMarkerRelations?: CanonicalReformulationMarkerRelationIndex;
  readonly quoteAttributiveHeadFrame?: QuoteAttributiveHeadFrame;
  readonly stemSourceOverride?: OpSource;
  readonly prependSource?: OpSource;
  readonly conjugationAnchor?: number;
  readonly semanticAnchors?: readonly number[];
  readonly suppressFormalToSuruControl?: boolean;
  readonly quotedNominalHost?: boolean;
  readonly stopAtUnparsedTail?: boolean;
  readonly stemTerminalOwnedByCaller?: boolean;
  readonly allowAdverbialModifierTerminal?: AdverbialModifierMarker;
}
