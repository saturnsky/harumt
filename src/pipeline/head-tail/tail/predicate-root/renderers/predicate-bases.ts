import { conjugate } from "../../../../../generator/conjugator.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import { selectParticle } from "../../../../../generator/particles.js";
import { CONNECTIVE_RENDER_MAP } from "../connective-render-table.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { derivationalHostStemRootOf, derivationalSuffixProfileById, HOST_TEMPLATE_PLACEHOLDER, type DerivationalSuffixProfile } from "../derivational-suffix-table.js";
import type { ConnectiveOp, NegationOp, PredicateProjectionCarrierOp, PredicateQuoteCarrierOp, PredicateSuffixOp, QuotedPropositionMood } from "../grammar.js";
import { HOSTLESS_QUOTE_MARKER_MAP } from "../hostless-quote-marker-table.js";
import { applyNegationChainToLemmaBase, hostProjectionSourceTrace, type AttributivePastProjection, type BaseResult, type BaseSourceTrace, type HostProjectionFinalSplit, type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, nounCopulaFinalAllomorphHost, type OpContext, predicateBasePolicyAllomorphHost } from "./base-model.js";
import { quotePlainDeclarative, quotePlainDeclarativeNominal, scopeCarrierCopulaBase, committedTerminalRoleBase, stateChangeBase } from "./base-support.js";
import { copularQuoteOption, composeBaseWithImperativeQuotative } from "./quote-complement-compose.js";
import { composeBaseWithConjectureQuestionConnective } from "./conjecture-compose.js";
import { composeBaseWithConnective } from "./connective-compose.js";
import { composeBaseWithTerminal } from "./predicate-terminal-compose.js";
import { plainDeclarativeToPointAttributive, plainDeclarativeToPointAttributiveNominal, projectBaseAttributive, projectBaseFutureAttributive } from "./predicate-base-projection.js";
import { renderBaseVolitionalPurposeConnective, renderBaseVolitionalQuotative, renderBaseVolitionalTerminal } from "./final-forms.js";
import { composeCommittedTailQuestionTerminal, composeTerminalMoodOnBase, loweredTerminalSfpEffect } from "./sfp-question.js";
import { sfpHasSelfDirectedConjectureRole } from "../inspect.js";
import { quoteProjectionForSfpEffect } from "../../../../semantics/sfp-quote-projection.js";
import { createConnectiveOp } from "../op-builders.js";

export function predicateProjectionCarrierBase(opts: {
  readonly op: PredicateProjectionCarrierOp;
  readonly inputBase: KoreanLemmaPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly formal: boolean;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const loweredBase = applyNegationChainToLemmaBase(opts.inputBase, opts.preStemNeg);
  if (loweredBase === null) {
    return { ok: false, reason: "predicate projection carrier host chain lowering not supported" };
  }
  const effectivePast = opts.stemPast || (opts.preStemNeg?.chainPast ?? false);
  const futureAttr = projectBaseFutureAttributive(
    loweredBase,
    effectivePast,
    opts.formal,
    opts.pastProjection
  );
  if (futureAttr === null) {
    return { ok: false, reason: "predicate projection carrier future attributive projection not supported" };
  }
  const trace = (
    hostText: string,
    basePrefix: string,
    splitFinal: HostProjectionFinalSplit
  ): { readonly sourceTrace?: BaseSourceTrace } => {
    const sourceTrace = hostProjectionSourceTrace({
      hostText,
      inputPrefix: opts.inputBase.prefix,
      basePrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal
    });
    return sourceTrace === undefined ? {} : { sourceTrace };
  };
  if (
    opts.op.carrier === "degree_extent" ||
    opts.op.carrier === "degree_extent_amount" ||
    opts.op.carrier === "until_extent"
  ) {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} `,
        final: {
          kind: "nounCopula",
          nounSurface: opts.op.carrier === "degree_extent_amount"
            ? "만큼"
            : opts.op.carrier === "until_extent" ? "때까지" : "정도",
          isBoundNoun: false
        }
      },
      chainOnFinalSupported: false,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "limit_dake") {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} `,
        final: { kind: "boundNounCopula", nounSurface: "뿐" }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "limit_dake_negative") {
    return {
      ok: true,
      base: {
        prefix: `${futureAttr} 뿐이 `,
        final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} 뿐이 `, "negative_nai")
    };
  }
  if (opts.op.carrier === "limit_dokoro_negative") {
    const hostNoun = loweredBase.policy?.kind === "noun_copula_interop" ? loweredBase.prefix : null;
    const attributive = projectBaseAttributive(
      loweredBase,
      effectivePast,
      opts.formal,
      opts.pastProjection
    );
    const situationHost = opts.op.sourceAllomorph === "dokoro_situation_deictic"
      ? opts.op.hostSituationBase ?? null
      : opts.op.sourceAllomorph === "dokoro_situation_sahen" && hostNoun !== null
        ? `${hostNoun}할`
        : opts.op.sourceAllomorph === "dokoro_situation_sahen" ||
          opts.op.sourceAllomorph === "dokoro_situation_verb"
          ? futureAttr
          : null;
    const scalarHost = opts.op.sourceAllomorph === "dokoro_scalar"
      ? hostNoun ?? attributive
      : null;
    const hostText = situationHost ?? scalarHost;
    if (hostText === null) {
      return { ok: false, reason: "dokoro negative carrier host projection not supported" };
    }
    const prefix = situationHost !== null ? `${hostText} 상황이 ` : `${hostText} 정도가 `;
    return {
      ok: true,
      base: {
        prefix,
        final: { kind: "lemma", lemma: "아니다", irregular: "아니", isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(hostText, prefix, "negative_nai")
    };
  }
  if (opts.op.carrier === "recent_past_bakari") {
    const hostAttr = projectBaseAttributive(
      loweredBase,
      true,
      opts.formal,
      opts.pastProjection
    );
    if (hostAttr === null) {
      return { ok: false, reason: "recent past bakari attributive projection not supported" };
    }
    return {
      ok: true,
      base: {
        prefix: `${hostAttr} 지 얼마 안 `,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      ...trace(hostAttr, `${hostAttr} 지 얼마 안 `, "none")
    };
  }
  if (opts.op.carrier === "imminent_nbakari") {
    const imminentBase = {
      prefix: `${futureAttr} `,
      final: { kind: "lemma", lemma: "듯하다", irregular: "여", isVerb: false }
    } as const;
    return {
      ok: true,
      base: {
        ...imminentBase,
        policy: { kind: "likeness", adverbialLexicalization: imminentBase }
      },
      chainOnFinalSupported: true,
      ...trace(futureAttr, `${futureAttr} `, "none")
    };
  }
  if (opts.op.carrier === "equivalence_douzen") {
    const hostAttr = projectBaseAttributive(
      loweredBase,
      effectivePast,
      opts.formal,
      opts.pastProjection
    );
    if (hostAttr === null) {
      return { ok: false, reason: "equivalence douzen attributive projection not supported" };
    }
    return {
      ok: true,
      base: {
        prefix: `${hostAttr} 것이나 `,
        final: { kind: "lemma", lemma: "다름없다", irregular: null, isVerb: false }
      },
      chainOnFinalSupported: true,
      ...trace(hostAttr, `${hostAttr} 것이나 `, "none")
    };
  }
  const certaintyFinalLemma = opts.op.carrier === "certainty_ni_kimatte_iru" ? "뻔하다" : "틀림없다";
  return {
    ok: true,
    base: {
      prefix: `${futureAttr} 게 `,
      final: { kind: "lemma", lemma: certaintyFinalLemma, irregular: null, isVerb: false }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...trace(futureAttr, `${futureAttr} 게 `, "negative_nai")
  };
}

export function predicateQuoteCarrierRestoredHost(op: PredicateQuoteCarrierOp): KoreanFinalForm {
  const hostlessRule = op.sourceTerminal === true
    ? HOSTLESS_QUOTE_MARKER_MAP.get(op.surface)
    : undefined;
  return hostlessRule === undefined
    ? { kind: "lemma", lemma: "하다", irregular: "여", isVerb: true }
    : {
      kind: "lemma",
      lemma: hostlessRule.restoredHost.lemma,
      irregular: hostlessRule.restoredHost.irregular,
      isVerb: hostlessRule.restoredHost.isVerb
    };
}

export function predicateQuoteCarrierBase(opts: {
  readonly op: PredicateQuoteCarrierOp;
  readonly inputBase: KoreanPredicateBase;
  readonly preStemNeg: NegationOp | null;
  readonly stemPast: boolean;
  readonly volitionalHost?: boolean;
  readonly nominalQuoteStem?: string;
  readonly lookups: LookupTables;
}): BaseResult {
  const quoteInputBase: KoreanPredicateBase = opts.stemPast && opts.inputBase.policy?.kind === "noun_copula_interop"
    ? {
      prefix: "",
      final: {
        kind: "nounCopula",
        nounSurface: opts.inputBase.policy.nounSurface,
        isBoundNoun: opts.inputBase.policy.isBoundNoun
      },
      policy: opts.inputBase.policy
    }
    : opts.inputBase;
  const host = committedTerminalRoleBase(
    { ok: true, base: quoteInputBase },
    opts.preStemNeg,
    opts.stemPast,
    true,
    opts.lookups
  );
  if (!host.ok) {
    return { ok: false, reason: `predicate quote carrier host lowering failed: ${host.reason}` };
  }
  if (opts.op.style === "suru_attributive" && opts.op.tosuruMode === "resultative_make") {
    if (opts.preStemNeg !== null) {
      return { ok: false, reason: "resultative to-suru carrier host negation lowering not supported" };
    }
    if (opts.stemPast) {
      return { ok: false, reason: "resultative to-suru carrier host past lowering not supported" };
    }
    if (host.base.final.kind !== "lemma") {
      return { ok: false, reason: "resultative to-suru carrier requires lemma host base" };
    }
    const hostBase: KoreanLemmaPredicateBase = { ...host.base, final: host.base.final };
    const projected = stateChangeBase(hostBase, "adverbial");
    const sourceTrace = hostProjectionSourceTrace({
      hostText: projected.prefix.trimEnd(),
      inputPrefix: opts.inputBase.prefix,
      basePrefix: projected.prefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        ...projected,
        final: { kind: "lemma", lemma: "만들다", irregular: "ㄹ", isVerb: true }
      },
      chainOnFinalSupported: true,
      ...(sourceTrace === undefined ? {} : { sourceTrace })
    };
  }
  const rendered = composeBaseWithTerminal(host.base, host.past, true, false, opts.lookups);
  if (!rendered.ok) {
    return { ok: false, reason: `predicate quote carrier host render failed: ${rendered.reason}` };
  }
  const restoredHost: KoreanFinalForm = predicateQuoteCarrierRestoredHost(opts.op);
  const quotedSfp = opts.op.quotedSfp;
  const quotedSfpProjection = quotedSfp === undefined
    ? "assertive"
    : quoteProjectionForSfpEffect(quotedSfp.effect, false);
  const volitionalContentAttributive = opts.op.volitionalContentAttributive;
  const quotedMoodConsumedHere: QuotedPropositionMood | null =
    opts.op.quotedMood === "imperative" && quotedSfpProjection !== "prohibitive"
      ? "imperative"
      : opts.op.quotedMood === "volitional" &&
          (opts.op.sourceTerminal === true || volitionalContentAttributive !== undefined)
        ? "volitional"
        : null;
  if (
    quotedMoodConsumedHere !== null &&
    opts.op.style !== "naru_result" &&
    opts.nominalQuoteStem === undefined &&
    opts.preStemNeg === null &&
    !host.past &&
    host.base.final.kind === "lemma" &&
    host.base.final.isVerb
  ) {
    const moodBase: KoreanLemmaPredicateBase = { ...host.base, final: host.base.final };
    const moodForms = quotedMoodConsumedHere === "imperative"
      ? {
        terminal: composeBaseWithImperativeQuotative(moodBase),
        attributive: `${moodBase.prefix}${conjugate(moodBase.final.lemma, moodBase.final.irregular, "(으)라는")}`
      }
      : volitionalContentAttributive === "intentional_modifier"
        ? {
          terminal: renderBaseVolitionalPurposeConnective(moodBase),
          attributive: `${moodBase.prefix}${conjugate(moodBase.final.lemma, moodBase.final.irregular, "(으)려는")}`
        }
        : {
          terminal: renderBaseVolitionalQuotative(moodBase),
          attributive: (() => {
            const volitional = renderBaseVolitionalTerminal(moodBase);
            return volitional.ok ? `${volitional.text}는` : null;
          })()
        };
    if (moodForms.terminal.ok && moodForms.attributive !== null) {
      const moodQuoted = moodForms.terminal.text;
      const moodQuotedPrefix = `${moodQuoted} `;
      const moodTrace = hostProjectionSourceTrace({
        hostText: moodQuoted,
        inputPrefix: opts.inputBase.prefix,
        basePrefix: moodQuotedPrefix,
        sourceTokens: opts.op.source.tokens,
        splitFinal: "none"
      });
      return {
        ok: true,
        base: {
          prefix: moodQuotedPrefix,
          final: restoredHost,
          policy: { kind: "quoted_proposition", attributive: moodForms.attributive }
        },
        chainOnFinalSupported: true,
        interOpPastProjection: "committed",
        ...(moodTrace === undefined ? {} : { sourceTrace: moodTrace })
      };
    }
  }
  if (opts.op.style === "naru_result") {
    const proposition = opts.nominalQuoteStem === undefined
      ? plainDeclarativeToPointAttributive(rendered.text, { ...copularQuoteOption(host.base) })
      : plainDeclarativeToPointAttributiveNominal(rendered.text, opts.nominalQuoteStem, undefined, { ...copularQuoteOption(host.base) });
    const propositionPrefix = `${proposition} 것이 `;
    const propositionTrace = hostProjectionSourceTrace({
      hostText: proposition,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: propositionPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: propositionPrefix,
        final: { kind: "lemma", lemma: "되다", irregular: null, isVerb: true }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(propositionTrace === undefined ? {} : { sourceTrace: propositionTrace })
    };
  }
  if (quotedSfp !== undefined && quotedSfpProjection === "terminal_mood") {
    const moodInputBase: KoreanPredicateBase =
      quoteInputBase.policy?.kind === "scope_carrier" &&
        quoteInputBase.policy.carrier === "noda" &&
        quoteInputBase.policy.hostPrefix !== undefined &&
        quoteInputBase.final.kind === "lemma" &&
        quoteInputBase.final.lemma === "이다"
        ? scopeCarrierCopulaBase("noda", quoteInputBase.policy.nounSurface, quoteInputBase.policy.hostPrefix)
        : quoteInputBase;
    const moodBaseResult: BaseResult = { ok: true, base: moodInputBase };
    const realizedQuotedSfp = loweredTerminalSfpEffect(quotedSfp);
    const selfDirectedConjecture = sfpHasSelfDirectedConjectureRole(realizedQuotedSfp);
    const selfDirectedConjectureKana = realizedQuotedSfp.effect === "kana" &&
      selfDirectedConjecture &&
      moodInputBase.final.kind === "lemma" &&
      moodInputBase.final.idiom?.kind === "conjecture";
    const composeQuotedMood = (quotationForm: "terminal" | "attributive") =>
      selfDirectedConjectureKana
        ? composeCommittedTailQuestionTerminal(
          moodBaseResult, opts.preStemNeg, opts.stemPast, true, false, "ka", true, opts.lookups, quotationForm
        )
        : composeTerminalMoodOnBase(
          moodBaseResult, opts.preStemNeg, opts.stemPast, true, false, realizedQuotedSfp, opts.lookups,
          { quotationForm, selfDirectedConjecture }
        );
    const moodTerminal = composeQuotedMood("terminal");
    const moodAttributive = composeQuotedMood("attributive");
    if (moodTerminal === null || !moodTerminal.ok || moodAttributive === null || !moodAttributive.ok) {
      return {
        ok: false,
        reason: `quoted terminal mood realization not supported for SFP ${quotedSfp.effect ?? "null"}`
      };
    }
    const moodPrefix = `${moodTerminal.text} `;
    const moodTrace = hostProjectionSourceTrace({
      hostText: moodTerminal.text,
      inputPrefix: opts.inputBase.prefix,
      basePrefix: moodPrefix,
      sourceTokens: opts.op.source.tokens,
      splitFinal: "none"
    });
    return {
      ok: true,
      base: {
        prefix: moodPrefix,
        final: restoredHost,
        policy: { kind: "quoted_proposition", attributive: moodAttributive.text }
      },
      chainOnFinalSupported: true,
      interOpPastProjection: "committed",
      ...(moodTrace === undefined ? {} : { sourceTrace: moodTrace })
    };
  }
  const interrogativeNounQuote = opts.op.style === "question_toiu"
    ? nounCopulaInterrogativeQuote(host.base, host.past, quoteCarrierMarkerSurface(opts.op), opts.nominalQuoteStem)
    : null;
  const quoted = interrogativeNounQuote ?? (opts.nominalQuoteStem === undefined
    ? quotePlainDeclarative(rendered.text, { ...copularQuoteOption(host.base) })
    : quotePlainDeclarativeNominal(rendered.text, opts.nominalQuoteStem, undefined, { ...copularQuoteOption(host.base) }));
  const attributive = predicateQuoteCarrierAttributive(
    opts.op.style,
    host.base,
    host.past,
    rendered.text,
    opts.lookups,
    opts.volitionalHost === true,
    opts.nominalQuoteStem,
    interrogativeNounQuote
  );
  if (attributive === null) {
    return { ok: false, reason: "predicate quote carrier attributive projection failed" };
  }
  const quotedPrefix = `${quoted} `;
  const quotedTrace = hostProjectionSourceTrace({
    hostText: quoted,
    inputPrefix: opts.inputBase.prefix,
    basePrefix: quotedPrefix,
    sourceTokens: opts.op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: quotedPrefix,
      final: restoredHost,
      policy: {
        kind: "quoted_proposition",
        attributive: attributive.text,
        ...(attributive.quote === null ? {} : { attributiveQuote: attributive.quote })
      }
    },
    chainOnFinalSupported: true,
    interOpPastProjection: "committed",
    ...(quotedTrace === undefined ? {} : { sourceTrace: quotedTrace })
  };
}

function quoteCarrierMarkerSurface(op: PredicateQuoteCarrierOp): string {
  const tokens = op.source.tokens;
  return tokens.slice(0, Math.max(0, tokens.length - 1)).map((token) => token.surface).join("");
}

function nounCopulaInterrogativeQuote(
  hostBase: KoreanPredicateBase,
  hostPast: boolean,
  markerSurface: string,
  nominalQuoteStem?: string
): string | null {
  if (hostPast) {
    return null;
  }
  const particleKey = CONNECTIVE_RENDER_MAP.get(markerSurface)?.copulaParticleKey;
  if (particleKey === undefined) {
    return null;
  }
  if (nominalQuoteStem !== undefined) {
    return `${hostBase.prefix}${nominalQuoteStem}${selectParticle(nominalQuoteStem, particleKey)}`;
  }
  if (hostBase.final.kind !== "nounCopula" && hostBase.final.kind !== "boundNounCopula") {
    return null;
  }
  const noun = hostBase.final.nounSurface;
  return `${hostBase.prefix}${noun}${selectParticle(nounCopulaFinalAllomorphHost(hostBase.final), particleKey)}`;
}

function predicateQuoteCarrierAttributive(
  style: PredicateQuoteCarrierOp["style"],
  hostBase: KoreanPredicateBase,
  hostPast: boolean,
  renderedText: string,
  lookups: LookupTables,
  volitionalHost: boolean,
  nominalQuoteStem?: string,
  interrogativeNounQuote?: string | null
) : {
  readonly text: string;
  readonly quote: { readonly prefix: string; readonly realizesInterrogativeMood: boolean } | null;
} | null {
  if (style === "question_toiu" && interrogativeNounQuote !== null && interrogativeNounQuote !== undefined) {
    const quotePrefix = `${interrogativeNounQuote} `;
    return { text: `${quotePrefix}하는`, quote: { prefix: quotePrefix, realizesInterrogativeMood: true } };
  }
  if (
    style === "question_toiu" &&
    volitionalHost &&
    !hostPast &&
    nominalQuoteStem === undefined &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.isVerb
  ) {
    const quotePrefix = `${hostBase.prefix}${conjugate(
      hostBase.final.lemma,
      hostBase.final.irregular,
      "ㄹ/을까"
    )} `;
    return { text: `${quotePrefix}하는`, quote: { prefix: quotePrefix, realizesInterrogativeMood: true } };
  }
  if (
    style === "compact_toiu" &&
    hostBase.policy?.kind === "noun_copula_interop" &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.idiom?.kind === "conjecture"
  ) {
    const noun = hostBase.policy.nounSurface;
    return {
      text: hostPast || hostBase.policy.conjectureHostPast === true
        ? `${noun}${hasBatchim(predicateBasePolicyAllomorphHost(hostBase)) ? "이었" : "였"}을 거라는`
        : `${noun}일 거라는`,
      quote: null
    };
  }
  if (
    style === "compact_toiu" &&
    hostBase.policy?.kind === "negative_noun_copula_interop" &&
    hostBase.final.kind === "lemma" &&
    hostBase.final.idiom?.kind === "conjecture"
  ) {
    const conjecturePast = hostPast || hostBase.policy.conjectureHostPast === true;
    return {
      text: `${hostBase.policy.conjectureSubject}${conjecturePast ? "아니었을" : "아닐"} 거라는`,
      quote: null
    };
  }
  if (style === "compact_toiu") {
    return {
      text: nominalQuoteStem === undefined
        ? plainDeclarativeToPointAttributive(renderedText, { ...copularQuoteOption(hostBase) })
        : plainDeclarativeToPointAttributiveNominal(renderedText, nominalQuoteStem, undefined, { ...copularQuoteOption(hostBase) }),
      quote: null
    };
  }
  if (style === "suru_attributive") {
    const quoted = nominalQuoteStem === undefined
      ? quotePlainDeclarative(renderedText, { ...copularQuoteOption(hostBase) })
      : quotePlainDeclarativeNominal(renderedText, nominalQuoteStem, undefined, { ...copularQuoteOption(hostBase) });
    return { text: `${quoted} 하는`, quote: { prefix: `${quoted} `, realizesInterrogativeMood: false } };
  }
  const questionConnective: ConnectiveOp = createConnectiveOp({

    connective: "question_content",
    surface: "か",
    source: { tokens: [], tokenIndices: [] }
  });
  const question = hostBase.final.kind === "lemma" && hostBase.final.idiom?.kind === "conjecture"
    ? composeBaseWithConjectureQuestionConnective(hostBase, questionConnective, hostPast, true, false)
    : composeBaseWithConnective(hostBase, questionConnective, hostPast, false, null, true, lookups);
  if (!question.ok) {
    return null;
  }
  return { text: `${question.text} 하는`, quote: { prefix: `${question.text} `, realizesInterrogativeMood: true } };
}

export function predicateSuffixBaseResult(
  op: PredicateSuffixOp,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): BaseResult {
  if (!predicateSuffixHasInflectingHost(inputBase, ctx)) {
    return { ok: false, reason: "predicate suffix requires a verb-final or stem-adjacent inflecting host" };
  }
  if (ctx.preModalNeg !== null) {
    return { ok: false, reason: "V neg + predicate suffix 영역 외" };
  }
  if (ctx.past) {
    return { ok: false, reason: "V past + predicate suffix 영역 외" };
  }
  const profile = derivationalSuffixProfileById(op.profileId);
  if (
    profile === undefined ||
    profile.template === undefined ||
    profile.finalLemma === undefined
  ) {
    return { ok: false, reason: `predicate suffix profile '${op.profileId}' does not declare an in-chain derivation` };
  }
  const hostText = inChainDerivationalHostProjection(profile, inputBase, ctx);
  if (hostText === null) {
    return { ok: false, reason: `predicate suffix profile '${op.profileId}' host form '${profile.hostForm}' is not projectable in chain` };
  }
  const basePrefix = profile.template
    .slice(0, profile.template.length - profile.finalLemma.length)
    .replace(HOST_TEMPLATE_PLACEHOLDER, hostText);
  const sourceTrace = hostProjectionSourceTrace({
    hostText,
    inputPrefix: inputBase.prefix,
    basePrefix,
    sourceTokens: op.source.tokens,
    splitFinal: "none"
  });
  return {
    ok: true,
    base: {
      prefix: basePrefix,
      final: {
        kind: "lemma",
        lemma: profile.finalLemma,
        irregular: profile.irregular ?? null,
        isVerb: profile.resultStemKind === "verb"
      }
    },
    chainOnFinalSupported: true,
    ...(sourceTrace === undefined ? {} : { sourceTrace })
  };
}

function inChainDerivationalHostProjection(
  profile: DerivationalSuffixProfile,
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): string | null {
  switch (profile.hostForm) {
    case "nominal_ki":
      return `${inputBase.prefix}${conjugate(inputBase.final.lemma, inputBase.final.irregular, "기")}`;
    case "attributive_present":
      return projectBaseAttributive(inputBase, false, ctx.formal);
    case "stem_root":
      return derivationalHostStemRootOf({
        lemma: inputBase.final.lemma,
        koreanPrefix: inputBase.prefix
      });
    case "nominal_m":
    case "attributive_completed":
    case "noun_compound":
      return null;
  }
}

function predicateSuffixHasInflectingHost(
  inputBase: KoreanLemmaPredicateBase,
  ctx: OpContext
): boolean {
  return inputBase.final.isVerb ||
    inputBase.policy?.kind === "potential" ||
    (ctx.chainIndex ?? 0) === 0;
}
