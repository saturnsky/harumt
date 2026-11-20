import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { NegationOp } from "../grammar.js";
import { applyNegationDepthToLemmaBase, type BaseResult, type BaseSourceTrace, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type TailTraceSegment } from "./base-model.js";
import { splitTeBridgeSourceTokens } from "./tail-host-trace.js";

export function desireBase(
  stemLemma: string,
  stemIrregular: IrregularType | null
): KoreanPredicateBase {
  return {
    prefix: `${conjugate(stemLemma, stemIrregular, "고")} `,
    final: { kind: "lemma", lemma: "싶다", irregular: null, isVerb: false },
    policy: { kind: "desire", nodaConnectiveFlatten: true }
  };
}

export function desireBaseResult(
  stemLemma: string,
  stemIrregular: IrregularType | null
): BaseResult {
  return {
    ok: true,
    base: desireBase(stemLemma, stemIrregular),
    chainOnFinalSupported: true,
    interOpPastProjection: "committed"
  };
}

export function composeDesiderativeStem(
  stemLemma: string,
  stemIrregular: IrregularType | null
): string {
  const stemKi = conjugate(stemLemma, stemIrregular, "기");
  return stemKi.replace(/기$/, "길");
}

export function desiderativeBaseFromPredicateBase(
  predicate: KoreanLemmaPredicateBase,
  desiredPredicateNegation: NegationOp | null = null
): KoreanLemmaPredicateBase | null {
  const desiredPredicate = desiredPredicateNegation === null
    ? predicate
    : applyNegationDepthToLemmaBase(predicate, desiredPredicateNegation.chainDepth);
  if (desiredPredicate === null) {
    return null;
  }
  return {
    prefix: `${desiredPredicate.prefix}${composeDesiderativeStem(desiredPredicate.final.lemma, desiredPredicate.final.irregular)} `,
    final: { kind: "lemma", lemma: "바라다", irregular: null, isVerb: true },
    policy: {
      kind: "desire",
      nodaConnectiveFlatten: true,
      requestComplementBase: predicate,
      ...(desiredPredicateNegation === null
        ? {}
        : { requestComplementMode: "prohibition" as const })
    }
  };
}

export function teHoshiiSourceTrace(
  resultBase: KoreanLemmaPredicateBase,
  sourceTokens: readonly RuntimeHaruToken[],
  desiredPredicateNegation: NegationOp | null
): BaseSourceTrace | undefined {
  if (resultBase.prefix.length === 0 || sourceTokens.length === 0) {
    return undefined;
  }
  const split = splitTeBridgeSourceTokens(sourceTokens);
  const inputProjectionText = resultBase.prefix.trimEnd();
  const spacing = resultBase.prefix.slice(inputProjectionText.length);
  const carrierPrefixSegments: TailTraceSegment[] = [];
  if (spacing.length > 0) {
    carrierPrefixSegments.push({
      text: spacing,
      sourceTokens: split.bridgeTokens,
      kind: "aux",
      projectionConfidence: "semantic"
    });
  }
  return {
    inputProjectionText,
    inputProjectionExtraSourceTokens: [
      ...(desiredPredicateNegation?.source.tokens ?? []),
      ...split.bridgeTokens
    ],
    carrierPrefixSegments,
    finalSourceTokens: split.finalTokens,
    finalKind: "modal"
  };
}
