import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { selectParticle } from "../../../../../generator/particles.js";
import type { RuntimeHaruToken } from "../../../../../types/token.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { AuxOpNode, ConnectiveOp, ExperienceIdiomOp, MethodYouGaNaiIdiomOp, NegationOp, NegativeNecessityKotoWaIdiomOp, OutcomeKotoNiNaruIdiomOp, PermissionIdiomOp, SufficiencyConditionalIdiomOp, TeEvaluationIdiomOp } from "../grammar.js";
import { applyNegationChainToLemmaBase, hostProjectionSourceTrace, stemFusionSourceTrace, type AttributivePastProjection, type BaseResult, type KoreanLemmaPredicateBase, type KoreanPredicateBase, negationLoweringOptionsWithOpFocus } from "./base-model.js";
import { applyExternalNegationDepthToPredicateBase, lowerFinalNegationForCommittedBase } from "./base-support.js";
import { composeBaseWithConnective } from "./connective-compose.js";
import { projectBaseAttributive, projectBaseFutureAttributive, projectBaseNominalized } from "./predicate-base-projection.js";
import { createConnectiveOp } from "../op-builders.js";

export function negativeNecessityKotoWaBase(opts: {
  readonly op: NegativeNecessityKotoWaIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  if (opts.preStemNeg !== null) {
    return { ok: false, reason: "V neg + ことはない needlessness is ambiguous; scope double negation path owns it" };
  }
  const stemAttr = projectBaseAttributive(
    opts.inputBase,
    opts.stemPast,
    opts.formal,
    opts.pastProjection
  );
  if (stemAttr === null) {
    return { ok: false, reason: "ことはない attributive projection 영역 외" };
  }
  const base: KoreanLemmaPredicateBase = {
    prefix: `${stemAttr} 일은 `,
    final: {
      kind: "lemma",
      lemma: opts.op.polarity === "negative" ? "없다" : "있다",
      irregular: null,
      isVerb: false
    }
  };
  const sourceTrace = hostProjectionSourceTrace({
    hostText: stemAttr,
    inputPrefix: opts.inputBase.prefix,
    basePrefix: base.prefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  if (opts.op.polarity === "negative") {
    return {
      ok: true,
      base,
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  return {
    ok: true,
    base,
    chainOnFinalSupported: false,
    finalNegationLoweringPolicy: "potential_idiom",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function onlyOptionBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly lookups: LookupTables;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  let projectionBase: KoreanLemmaPredicateBase = opts.inputBase;
  let projectionPast = opts.stemPast;
  if (opts.preStemNeg !== null) {
    const lowered = lowerFinalNegationForCommittedBase(
      { ok: true, base: opts.inputBase, chainOnFinalSupported: true },
      opts.preStemNeg,
      opts.formal,
      opts.lookups
    );
    if (lowered === null) {
      return { ok: false, reason: "only-option host negation lowering 영역 외" };
    }
    projectionBase = lowered;
    projectionPast = projectionPast || opts.preStemNeg.chainPast;
  }
  const projected = projectBaseFutureAttributive(
    projectionBase,
    projectionPast,
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: "only-option future attributive projection 영역 외" };
  }
  const basePrefix = `${projected} 수밖에 `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: projected,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "negative_nai"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function futureAttributiveNaiIdiomBase(
  idiomName: string,
  infix: string,
  requiresNeg: boolean,
  opts: {
    readonly inputBase: KoreanLemmaPredicateBase;
    readonly preStemNeg: NegationOp | null;
    readonly stemPast: boolean;
    readonly formal: boolean;
    readonly pastProjection: AttributivePastProjection;
    readonly sourceTokens?: readonly RuntimeHaruToken[];
  }
): BaseResult {
  if (requiresNeg && opts.preStemNeg === null) {
    return { ok: false, reason: `${idiomName} idiom requires negative host` };
  }
  const hostBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (hostBase === null) {
    return { ok: false, reason: `${idiomName} host negation lowering 영역 외` };
  }
  const projected = projectBaseFutureAttributive(
    hostBase,
    opts.stemPast || (requiresNeg ? opts.preStemNeg!.chainPast : (opts.preStemNeg?.chainPast ?? false)),
    opts.formal,
    opts.pastProjection
  );
  if (projected === null) {
    return { ok: false, reason: `${idiomName} future attributive projection 영역 외` };
  }
  const basePrefix = `${projected} ${infix}`;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: projected,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "negative_nai"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "없다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function inevitableZaruOEnaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("zaru-o-enai", "수밖에 ", false, opts);
}

export function cannotRefrainNegativeDewaIrarenaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("cannot-refrain", "수 ", true, opts);
}

export function methodYouGaNaiBase(opts: {
  readonly op: MethodYouGaNaiIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  const infix = opts.op.particleKind === "mo" ? "방법도 " : "방법이 ";
  return futureAttributiveNaiIdiomBase("you-ga-nai", infix, false, opts);
}

export function madeMoNaiBase(opts: {
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  return futureAttributiveNaiIdiomBase("made-mo-nai", "필요도 ", false, opts);
}

export function permissionBase(opts: {
  readonly op: PermissionIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  return concessiveDoedaBase(opts.op.connectiveSurface, opts);
}

export function sufficiencyConditionalBase(opts: {
  readonly op: SufficiencyConditionalIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const conditional: ConnectiveOp = createConnectiveOp({

    connective: "conditional",
    surface: "ば",
    conditionalFlavor: "plain",
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    conditional,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function teEvaluationBase(opts: {
  readonly op: TeEvaluationIdiomOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  const connective: ConnectiveOp = createConnectiveOp({

    connective: "te_form",
    surface: opts.op.connectiveSurface,
    teFormRole: "reason",
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    connective,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "좋다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function negativeNecessitySumuBase(opts: {
  readonly op: Extract<AuxOpNode, { readonly kind: "idiom"; readonly idiom: "negative_necessity_sumu" }>;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly lookups: LookupTables;
}): BaseResult {
  if (opts.preStemNeg === null) {
    return { ok: false, reason: "negative-necessity sumu requires negative host" };
  }
  return concessiveDoedaBase("ても", opts);
}

function concessiveDoedaBase(
  surface: string,
  opts: {
    readonly op: { readonly source: ConnectiveOp["source"] };
    readonly inputBase: KoreanLemmaPredicateBase;
    readonly preStemNeg: NegationOp | null;
    readonly stemPast: boolean;
    readonly formal: boolean;
    readonly lookups: LookupTables;
  }
): BaseResult {
  const concessive: ConnectiveOp = createConnectiveOp({

    connective: "even_if",
    surface,
    source: opts.op.source
  });
  const host = composeBaseWithConnective(
    opts.inputBase,
    concessive,
    opts.stemPast,
    false,
    opts.preStemNeg,
    opts.formal,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: host.reason };
  }
  const basePrefix = `${host.text} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: host.text,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function forbiddenBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  const { stemLemma, stemIrregular } = opts;
  const basePrefix = `${conjugate(stemLemma, stemIrregular, "면")} 안 `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : stemFusionSourceTrace(basePrefix, opts.sourceTokens, { splitFinal: "none" });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
    },
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function experienceBase(opts: {
  readonly op: ExperienceIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  let projection = opts.pastProjection;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "experience idiom pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
    if (opts.preStemNeg.chainPast) {
      projection = "committed";
    }
  }
  const attr = projectBaseAttributive(hostBase, hostPast, opts.formal, projection);
  if (attr === null) {
    return { ok: false, reason: "experience idiom attributive projection not supported" };
  }
  const particle = opts.op.particleKind === "mo" ? "적도 " : "적이 ";
  const basePrefix = `${attr} ${particle}`;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: attr,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "negative_nai"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: opts.op.polarity === "negative" ? "없다" : "있다",
        irregular: null,
        isVerb: false
      }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function decisionKotoNiSuruBase(opts: {
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly sourceTokens?: readonly RuntimeHaruToken[];
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "decision koto-ni-suru pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
  }
  const nominalized = projectBaseNominalized(hostBase, hostPast, opts.formal);
  if (nominalized === null) {
    return { ok: false, reason: "decision koto-ni-suru nominalization not supported" };
  }
  const hostWord = `${nominalized}${selectParticle(nominalized, "으로/로")}`;
  const basePrefix = `${hostWord} `;
  const sourceTrace = opts.sourceTokens === undefined
    ? undefined
    : hostProjectionSourceTrace({
      hostText: hostWord,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.sourceTokens,
      splitFinal: "last_token"
    });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true },
      capabilities: { prohibitionHost: "action" }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

export function outcomeKotoNiNaruBase(opts: {
  readonly op: OutcomeKotoNiNaruIdiomOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  let hostBase = opts.inputBase;
  let hostPast = opts.stemPast;
  let projection = opts.pastProjection;
  if (opts.preStemNeg !== null) {
    const lowered = applyExternalNegationDepthToPredicateBase(
      opts.inputBase,
      opts.preStemNeg.chainDepth,
      opts.formal,
      negationLoweringOptionsWithOpFocus(opts.preStemNeg, {})
    );
    if (lowered === null) {
      return { ok: false, reason: "outcome koto-ni-naru pre-negation lowering not supported" };
    }
    hostBase = lowered;
    hostPast = hostPast || opts.preStemNeg.chainPast;
    if (opts.preStemNeg.chainPast) {
      projection = "committed";
    }
  }
  if (opts.op.stative !== true) {
    if (hostBase.final.kind !== "lemma") {
      return { ok: false, reason: "outcome koto-ni-naru adverbial projection not supported" };
    }
    const hostGe = `${hostBase.prefix}${conjugate(hostBase.final.lemma, hostBase.final.irregular, "게")}`;
    const basePrefix = `${hostGe} `;
    const sourceTrace = hostProjectionSourceTrace({
      hostText: hostGe,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "last_token"
    });
    return {
      ok: true,
      base: {
        prefix: basePrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  let hostWord: string;
  if (hostPast) {
    const attr = projectBaseAttributive(hostBase, hostPast, opts.formal, projection);
    if (attr === null) {
      return { ok: false, reason: "outcome koto-ni-naru attributive projection not supported" };
    }
    hostWord = `${attr} 것으로`;
  } else {
    const nominalized = projectBaseNominalized(hostBase, false, opts.formal);
    if (nominalized === null) {
      return { ok: false, reason: "outcome koto-ni-naru nominalization not supported" };
    }
    hostWord = `${nominalized}${selectParticle(nominalized, "으로/로")}`;
  }
  const doeAeo = conjugate("되다", null, "아/어");
  const basePrefix = `${hostWord} ${doeAeo} `;
  const sourceTrace = hostProjectionSourceTrace({
    hostText: hostWord,
    inputPrefix: opts.inputBase.prefix,
    basePrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "last_token"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: { kind: "lemma", lemma: "있다", irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}
