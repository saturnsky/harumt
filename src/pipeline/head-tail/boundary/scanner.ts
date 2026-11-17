import type { BoundaryToken } from "./punctuation.js";
import {
  caseParticleMarkerRelationAt,
  conditionalTailConnectiveRelationForToken,
  copulaDeMarkerRelationForToken,
  copulaElidedNegativeBodyRelationAt,
  copulaHonorificSupportRelationAt,
  copulaNiMarkerRelationForToken,
  dewaScopeBridgeRelationAt,
  externalNominalizerContinuationRelationAt,
  kaMarkerRelationAt,
  nominalLinkMarkerRelationAt,
  nominalizerAdversativeConnectiveRelationAt,
  nominalizerQuestionContentConnectiveRelationAt,
  nominalizerReasonConnectiveRelationAt,
  focusDakeDeScopeBridgeRelationAt,
  pronominalNoDeScopeBridgeRelationAt,
  questionContentContinuationAfterKaRelationAt,
  registeredClauseConnectiveRelationForToken,
  quoteHostSearchBridgeArgumentRelationAt,
  topicFocusMarkerRelationAt
} from "./marker.js";
import { parentheticalSpanEndingAt } from "./parenthetical.js";
import { quoteMarkerContinuationRelationAt, quoteMarkerRelationAt } from "./quote-marker.js";
import { compositeConnectivePatternRelationAt } from "../tail/connective-span-scanner.js";
import { TokenCursor } from "../../token-cursor.js";
import { teDeContinuationRelationAt } from "../tail/postverb-tail-classifier.js";
import {
  boundaryRelationsAt,
  isTransparentTokenForConsumer
} from "./punctuation.js";
import { copulaFocusContinuationRelationAt } from "./window.js";
import type { BoundaryRelation, BoundaryRelationConsumer } from "./relation.js";
import type { LookupTables } from "../../lookup-tables.js";

export interface BoundaryRelationScanOptions {
  readonly consumers?: readonly BoundaryRelationConsumer[];
  readonly lookups: LookupTables;
}

type BoundaryRelationProducer = (
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
) => readonly BoundaryRelation[];

const BOUNDARY_RELATION_PRODUCERS: readonly BoundaryRelationProducer[] = [
  (tokens, index, options) => boundaryRelationsAt(tokens, index, options),
  markerBoundaryRelationsAt,
  bridgeBoundaryRelationsAt,
  scopeBoundaryRelationsAt,
  copulaBoundaryRelationsAt,
  parentheticalBoundaryRelationsAt,
  teDeBoundaryRelationsAt,
  compositeConnectiveBoundaryRelationsAt
];

export function scanBoundaryRelations(
  tokens: readonly BoundaryToken[],
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const relations: BoundaryRelation[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    relations.push(...boundaryRelationsForToken(tokens, index, options));
  }
  return relations;
}

export function boundaryRelationsForToken(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  return BOUNDARY_RELATION_PRODUCERS.flatMap((producer) => producer(tokens, index, options));
}

function markerBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const relations: BoundaryRelation[] = [];
  const relationOptions = options.consumers === undefined ? {} : { consumers: options.consumers };
  const ka = kaMarkerRelationAt(tokens, index, options.consumers);
  if (ka !== null) {
    relations.push(ka);
  }
  const kaContinuation = questionContentContinuationAfterKaRelationAt(tokens, index, relationOptions);
  if (kaContinuation !== null) {
    relations.push(kaContinuation);
  }
  const quote = quoteMarkerRelationAt(tokens, index, relationOptions);
  if (quote !== null) {
    relations.push(quote);
  }
  const quoteContinuation = quoteMarkerContinuationRelationAt(tokens, index, relationOptions);
  if (quoteContinuation !== null) {
    relations.push(quoteContinuation);
  }
  const nominalizerReason = nominalizerReasonConnectiveRelationAt(tokens, index, relationOptions);
  if (nominalizerReason !== null) {
    relations.push(nominalizerReason);
  }
  const nominalizerQuestionContent = nominalizerQuestionContentConnectiveRelationAt(tokens, index, relationOptions);
  if (nominalizerQuestionContent !== null) {
    relations.push(nominalizerQuestionContent);
  }
  const nominalizerAdversative = nominalizerAdversativeConnectiveRelationAt(tokens, index, relationOptions);
  if (nominalizerAdversative !== null) {
    relations.push(nominalizerAdversative);
  }
  const externalNominalizer = externalNominalizerContinuationRelationAt(tokens, index, {
    ...relationOptions,
    requireEnd: false
  });
  if (externalNominalizer !== null) {
    relations.push(externalNominalizer);
  }
  const registeredConnective = registeredClauseConnectiveRelationForToken(tokens[index], index, relationOptions);
  if (registeredConnective !== null) {
    relations.push(registeredConnective);
  }
  const conditionalTail = conditionalTailConnectiveRelationForToken(tokens[index], index, relationOptions);
  if (
    conditionalTail !== null &&
    !relations.some((relation) => relation.kind === conditionalTail.kind &&
      relation.span.start === conditionalTail.span.start &&
      relation.span.endExclusive === conditionalTail.span.endExclusive &&
      relation.surface === conditionalTail.surface &&
      relation.connectiveKind === conditionalTail.connectiveKind)
  ) {
    relations.push(conditionalTail);
  }
  const nominalLink = nominalLinkMarkerRelationAt(tokens, index, relationOptions);
  if (nominalLink !== null) {
    relations.push(nominalLink);
  }
  const caseParticle = caseParticleMarkerRelationAt(tokens, index, relationOptions);
  if (caseParticle !== null) {
    relations.push(caseParticle);
  }
  const topicFocus = topicFocusMarkerRelationAt(tokens, index, relationOptions);
  if (topicFocus !== null) {
    relations.push(topicFocus);
  }
  return relations;
}

function bridgeBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const relation = quoteHostSearchBridgeArgumentRelationAt(tokens, index, options.consumers === undefined
    ? {}
    : { consumers: options.consumers });
  return relation === null ? [] : [relation];
}

function scopeBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const relationOptions = options.consumers === undefined ? {} : { consumers: options.consumers };
  const relations: BoundaryRelation[] = [];
  const pronominalNoDe = pronominalNoDeScopeBridgeRelationAt(tokens, index, relationOptions);
  if (pronominalNoDe !== null) {
    relations.push(pronominalNoDe);
  }
  const focusDakeDe = focusDakeDeScopeBridgeRelationAt(tokens, index, relationOptions);
  if (focusDakeDe !== null) {
    relations.push(focusDakeDe);
  }
  const dewa = dewaScopeBridgeRelationAt(tokens, index, relationOptions);
  if (dewa !== null) {
    relations.push(dewa);
  }
  return relations;
}

function copulaBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const relationOptions = options.consumers === undefined ? {} : { consumers: options.consumers };
  const relations: BoundaryRelation[] = [];
  const copulaDe = copulaDeMarkerRelationForToken(tokens[index], index, relationOptions);
  if (copulaDe !== null) {
    relations.push(copulaDe);
  }
  const copulaNi = copulaNiMarkerRelationForToken(tokens[index], index, relationOptions);
  if (copulaNi !== null) {
    relations.push(copulaNi);
  }
  const copulaHonorificSupport = copulaHonorificSupportRelationAt(tokens, index, relationOptions);
  if (copulaHonorificSupport !== null) {
    relations.push(copulaHonorificSupport);
  }
  const copulaElidedNegativeBody = copulaElidedNegativeBodyRelationAt(tokens, index, relationOptions);
  if (copulaElidedNegativeBody !== null) {
    relations.push(copulaElidedNegativeBody);
  }
  const copulaFocus = copulaFocusContinuationRelationAt(tokens, index, options.consumers === undefined
    ? { lookups: options.lookups }
    : { consumers: options.consumers, lookups: options.lookups });
  if (copulaFocus !== null) {
    relations.push(copulaFocus);
  }
  return relations;
}

function parentheticalBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const parenthetical = parentheticalSpanEndingAt(tokens, index, options.consumers === undefined
    ? {}
    : { consumers: options.consumers });
  if (parenthetical !== null) {
    return [parenthetical];
  }
  return [];
}

function teDeBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const teDeContinuation = teDeContinuationRelationAt(tokens, index, options.consumers === undefined
    ? { requirement: "layout_nonspace_tail", lookups: options.lookups }
    : { requirement: "layout_nonspace_tail", consumers: options.consumers, lookups: options.lookups });
  if (teDeContinuation !== null) {
    return [teDeContinuation];
  }
  return [];
}

function compositeConnectiveBoundaryRelationsAt(
  tokens: readonly BoundaryToken[],
  index: number,
  options: BoundaryRelationScanOptions
): readonly BoundaryRelation[] {
  const compositeConnective = compositeConnectivePatternRelationAt(new TokenCursor(tokens, index), options.consumers === undefined
    ? {}
    : { consumers: options.consumers });
  if (compositeConnective !== null) {
    return [compositeConnective];
  }
  return [];
}

export {
  isTransparentTokenForConsumer
};
