import type {
  ConnectiveKind,
  ConnectiveSurfaceAllomorph,
  AttributiveBoundaryPayload,
  QuoteBoundaryPayload,
  QuotativeMood,
  RetrospectiveDiscoveryStyle,
  RetrospectiveQuotativeFlavor,
  VolitionalAttemptFocusParticle
} from "./grammar.js";
import type { PairedVolitionalConcessiveEvidence } from "../../../clause-layout/layout-types.js";

export interface ParseOutgoingBoundaryHint {
  readonly connectiveKind: ConnectiveKind;
  readonly surface: string;
  readonly surfaceAllomorph?: ConnectiveSurfaceAllomorph;
  readonly tokenIdx: number;
  readonly tokenSpan: { readonly start: number; readonly end: number };
  readonly quoteBoundary?: QuoteBoundaryPayload;
  readonly quotativeMood?: QuotativeMood;
  readonly retrospectiveQuotativeFlavor?: RetrospectiveQuotativeFlavor;
  readonly retrospectiveDiscoveryStyle?: RetrospectiveDiscoveryStyle;
  readonly pairedConcessive?: PairedVolitionalConcessiveEvidence;
  readonly attributiveBoundary?: AttributiveBoundaryPayload;
  readonly quotedQuestionContext?: true;
  readonly boundNominalReasonMonoNoun?: true;
  readonly attemptFocusParticle?: VolitionalAttemptFocusParticle;
}
