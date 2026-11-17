import { isKoreanPotentialLemma, potentialPhrasePrefix, shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { asIrregular, conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { isIssdaAdjective } from "../../../../attributive.js";
import { addCoda, lastSyllableForAllomorph } from "../../../../../generator/hangul.js";
import { hasAllomorphBatchim } from "../../../../../generator/particles.js";
import { usesVerbLikeFormalPlainEnding } from "../../../../../generator/predicate-register.js";
import { type LookupTables } from "../../../../lookup-tables.js";
import { renderAniTerminal } from "../../korean-terminal.js";
import { assertNever, moodBearingOpBlocksVolitionalSpeechAct, type AuxOpNode, type NegationOp, type ObligationVariant, type StemNode } from "../grammar.js";
import { applyNegationDepthToLemmaBase, lemmaPredicateBase, type AttributivePastProjection, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type RenderOutcome } from "./base-model.js";

export function obligationEmphasis(variant: ObligationVariant): string {
  switch (variant) {
    case "standard_nakute_wa":
    case "standard_nakereba":
      return "만";
    case "colloquial_nakya":
    case "colloquial_nakucha":
    case "colloquial_naito":
    case "colloquial_naito_elided":
    case "beki":
      return "";
    default:
      assertNever(variant);
  }
}

export function composeAniForm(formal: boolean, polite: boolean, past: boolean): string {
  return renderAniTerminal({ formal, polite, past });
}

export function pastNegStemAttributive(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemKind: "verb" | "adj";
  readonly past: boolean;
  readonly pastProjection?: AttributivePastProjection;
  readonly preModalNeg: NegationOp | null;
  readonly attrPolicy: "future" | "present";
  readonly useShortHint: boolean;
  readonly lookups: LookupTables;
  readonly sahenShortNegationSplit: boolean;
}): string {
  const {
    stemLemma,
    stemIrregular,
    stemKind,
    past,
    pastProjection = "lexical",
    preModalNeg,
    attrPolicy,
    useShortHint,
    lookups,
    sahenShortNegationSplit
  } = opts;
  const sourceChainDepth = preModalNeg?.chainDepth ?? 0;
  const effectivePast = past || (preModalNeg?.chainPast ?? false);

  const sourceFocusParticle = preModalNeg?.focusParticle;
  const absorbsNegationSuppletively = sourceChainDepth >= 1 && isKoreanPotentialLemma(stemLemma);
  const hostLemma = absorbsNegationSuppletively
    ? `${potentialPhrasePrefix(stemLemma).trimEnd()}${sourceFocusParticle ?? ""} 없다`
    : stemLemma;
  const hostIrregular = absorbsNegationSuppletively ? null : stemIrregular;
  const hostKind: "verb" | "adj" = absorbsNegationSuppletively ? "adj" : stemKind;
  const chainDepth = absorbsNegationSuppletively ? sourceChainDepth - 1 : sourceChainDepth;
  const hostFocusParticle = absorbsNegationSuppletively ? undefined : sourceFocusParticle;

  let prefix: string;
  let tailLemma: string;
  let tailIrregular: IrregularType | null;
  let tailIsVerb: boolean;
  if (chainDepth === 0) {
    prefix = "";
    tailLemma = hostLemma;
    tailIrregular = hostIrregular;
    tailIsVerb = hostKind === "verb";
  } else {
    const focusParticle = hostFocusParticle;
    const inability = !absorbsNegationSuppletively && preModalNeg?.inability === true;
    const useShort = hostKind === "verb" && chainDepth === 1 && useShortHint &&
      focusParticle === undefined && !inability;
    if (useShort) {
      const [shortPrefix, shortLemma, shortIrregular] = shortNegationPrefix(hostLemma, hostIrregular, lookups, {
        sahenSplit: sahenShortNegationSplit
      });
      prefix = shortPrefix;
      tailLemma = shortLemma;
      tailIrregular = shortIrregular;
      tailIsVerb = true;
    } else {
      const stemJi = conjugate(hostLemma, hostIrregular, "지");
      if (inability) {
        const lowered = applyNegationDepthToLemmaBase(
          { prefix: "", final: { kind: "lemma", lemma: hostLemma, irregular: hostIrregular, isVerb: hostKind === "verb" } },
          chainDepth,
          {
            firstNegationInability: true,
            ...(focusParticle === undefined ? {} : { firstNegationFocusParticle: focusParticle })
          }
        );
        if (lowered === null || lowered.final.kind !== "lemma") {
          throw new Error("inability negation chain must lower to a lemma final");
        }
        prefix = lowered.prefix;
        tailLemma = lowered.final.lemma;
        tailIrregular = lowered.final.irregular;
        tailIsVerb = lowered.final.isVerb;
      } else {
        const middle = chainDepth >= 2 ? " 않지".repeat(chainDepth - 1) : "";
        prefix = `${stemJi}${focusParticle ?? ""}${middle} `;
        tailLemma = "않다";
        tailIrregular = null;
        tailIsVerb = chainDepth >= 2 ? false : (hostKind === "verb");
      }
    }
  }

  if (effectivePast) {
    if (attrPolicy === "present") {
      if (tailIsVerb) {
        if (pastProjection === "committed") {
          const pastStem = tailLemma === "아니다"
            ? "아니었"
            : conjugate(tailLemma, tailIrregular, "았/었");
          return `${prefix}${pastStem}던`;
        }
        if (isKoreanPotentialLemma(tailLemma)) {
          const pastStem = conjugate(tailLemma, tailIrregular, "았/었");
          return `${prefix}${pastStem}던`;
        }
        if (isIssdaAdjective(tailLemma)) {
          const pastStem = conjugate(tailLemma, tailIrregular, "았/었");
          return `${prefix}${pastStem}던`;
        }
        return `${prefix}${conjugate(tailLemma, tailIrregular, "ㄴ/은")}`;
      }
      const pastStem = tailLemma === "아니다"
        ? "아니었"
        : conjugate(tailLemma, tailIrregular, "았/었");
      return `${prefix}${pastStem}던`;
    }
    const pastStem = tailLemma === "아니다"
      ? "아니었"
      : conjugate(tailLemma, tailIrregular, "았/었");
    return `${prefix}${pastStem}을`;
  }
  if (attrPolicy === "present") {
    const attrSuffix = tailIsVerb ? "ㄴ/는" : "ㄴ/은";
    return `${prefix}${conjugate(tailLemma, tailIrregular, attrSuffix)}`;
  }
  return `${prefix}${conjugate(tailLemma, tailIrregular, "ㄹ/을")}`;
}

export function nounToCopulaForm(
  noun: string,
  formal: boolean,
  polite: boolean,
  past = false,
  isBoundNoun = false,
  allomorphHost?: string
): string {
  if (noun.length === 0) return "";
  const lastChar = lastSyllableForAllomorph(noun);
  const noBatchim = !hasAllomorphBatchim(allomorphHost ?? noun);

  if (past) {
    const stem = noBatchim ? `${noun}였` : `${noun}이었`;
    if (formal && polite) return `${stem}습니다`;
    if (formal && !polite) return `${stem}다`;
    if (!formal && polite) return `${stem}어요`;
    return `${stem}어`;
  }
  if (formal && polite) {
    if (noBatchim && isBoundNoun && noun !== "터") {
      return noun.slice(0, -1) + addCoda(lastChar, "ㅂ") + "니다";
    }
    return `${noun}입니다`;
  }
  if (formal && !polite) {
    return noBatchim ? `${noun}다` : `${noun}이다`;
  }
  if (!formal && polite) {
    return noBatchim ? `${noun}예요` : `${noun}이에요`;
  }
  return noBatchim ? `${noun}야` : `${noun}이야`;
}

export function nounToCopulaRebukeQuestionForm(
  noun: string,
  past: boolean,
  isBoundNoun = false,
  allomorphHost?: string
): string {
  if (noun.length === 0) return "";
  if (past) {
    const plainPast = nounToCopulaForm(noun, true, false, true, isBoundNoun, allomorphHost);
    return `${plainPast.slice(0, -1)}냐`;
  }
  return `${noun}${hasAllomorphBatchim(allomorphHost ?? noun) ? "이" : ""}냐`;
}

export function irregularFrom(value: string | null): IrregularType | null {
  if (value === null) {
    return null;
  }
  return asIrregular(value);
}

export function composeFinalForm(
  lemma: string,
  irregular: IrregularType | null,
  isVerb: boolean,
  past: boolean,
  formal: boolean,
  polite: boolean,
  lookups: LookupTables
): string {
  if (past) {
    const pastStem = conjugate(lemma, irregular, "았/었");
    return composePastStemFinalForm(pastStem, formal, polite);
  }
  if (formal && polite) {
    return conjugate(lemma, irregular, "ㅂ니다/습니다");
  }
  if (formal && !polite) {
    return usesVerbLikeFormalPlainEnding(
      lemma,
      isVerb,
      lookups.FORMAL_PLAIN_ADJECTIVE_LIKE_KOREAN_LEMMAS,
      lookups.FORMAL_PLAIN_VERB_LIKE_KOREAN_LEMMAS
    )
      ? conjugate(lemma, irregular, "ㄴ다/는다")
      : lemma;
  }
  if (!formal && polite) {
    return `${conjugate(lemma, irregular, "아/어")}요`;
  }
  return conjugate(lemma, irregular, "아/어");
}

export function composePastStemFinalForm(
  pastStem: string,
  formal: boolean,
  polite: boolean
): string {
  if (formal && polite) {
    return `${pastStem}습니다`;
  }
  if (formal && !polite) {
    return `${pastStem}다`;
  }
  if (!formal && polite) {
    return `${pastStem}어요`;
  }
  return `${pastStem}어`;
}

export function composeDoublePastFinalForm(
  lemma: string,
  irregular: IrregularType | null,
  formal: boolean,
  polite: boolean
): string {
  const firstPastStem = conjugate(lemma, irregular, "았/었");
  return composePastStemFinalForm(`${firstPastStem}었`, formal, polite);
}

export function conjectureFinalForm(_formal: boolean, polite: boolean): string {
  return polite ? "죠" : "지";
}

export function renderVolitional(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly formal: boolean;
  readonly isPolite: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome {
  const { stemLemma, stemIrregular, isVerb, isPolite } = opts;
  if (!isVerb) {
    const stemEul = conjugate(stemLemma, stemIrregular, "ㄹ/을");
    const moreuda = composeFinalForm("모르다", "르", true, false           , opts.formal, isPolite, opts.lookups);
    return { ok: true, text: `${stemEul}지도 ${moreuda}`, polite: isPolite };
  }
  if (isPolite) {
    const text = opts.formal
      ? conjugate(stemLemma, stemIrregular, "(으)ㅂ시다")
      : composeFinalForm(stemLemma, stemIrregular, true, false, false, true, opts.lookups);
    return { ok: true, text, polite: true };
  }
  const stemJa = conjugate(stemLemma, stemIrregular, "자");
  return { ok: true, text: stemJa, polite: isPolite };
}

export function renderVolitionalPurposeConnective(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: conjugate(opts.stemLemma, opts.stemIrregular, "(으)려고"),
    polite: false
  };
}

export { opSourceIsVolitional, opSourceIsVolitionalInChain } from "../grammar.js";

export function renderBaseVolitionalPurposeConnective(base: KoreanLemmaPredicateBase): RenderOutcome {
  return {
    ok: true,
    text: `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "(으)려고")}`,
    polite: false
  };
}

export function renderBaseVolitionalTerminal(base: KoreanLemmaPredicateBase): RenderOutcome {
  return {
    ok: true,
    text: `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "자")}`,
    polite: false
  };
}

export function volitionalMoodBearerBlocksCohortative(
  stem: StemNode,
  moodBearingOp: AuxOpNode | undefined
): boolean {
  if (stem.absorbedPassiveAux === true && stem.stemMood === "volitional") {
    return true;
  }
  return moodBearingOpBlocksVolitionalSpeechAct(moodBearingOp);
}

export function renderBaseVolitionalConjectureTerminal(
  base: KoreanLemmaPredicateBase,
  polite: boolean
): RenderOutcome {
  const stemGet = conjugate(base.final.lemma, base.final.irregular, "겠");
  return {
    ok: true,
    text: `${base.prefix}${stemGet}${conjectureFinalForm(false, polite)}`,
    polite
  };
}

export function renderBaseVolitionalQuotative(base: KoreanLemmaPredicateBase): RenderOutcome {
  const terminal = renderBaseVolitionalTerminal(base);
  return terminal.ok
    ? { ok: true, text: `${terminal.text}고`, polite: false }
    : terminal;
}

export function volitionalConcessiveEnding(
  connective: { readonly connective: string; readonly surface: string }
): string | null {
  if (connective.surface === "が") {
    return "든";
  }
  if (connective.connective === "conditional") {
    switch (connective.surface) {
      case "ものなら":
      case "もんなら":
        return "기라도 하면";
      default:
        return null;
    }
  }
  if (connective.connective !== "even_if") {
    return null;
  }
  switch (connective.surface) {
    case "とも":
      return "더라도";
    case "と":
      return "아/어도";
    case "__paired_volitional_to":
      return "든";
    case "たって":
    case "にしても":
    case "にも":
      return "(으)려고 해도";
    default:
      return null;
  }
}

export function renderBaseVolitionalConcessive(
  base: KoreanLemmaPredicateBase,
  ending: string
): RenderOutcome {
  return {
    ok: true,
    text: `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, ending)}`,
    polite: false
  };
}

export function renderPredicateBaseVolitionalPurposeConnective(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional purpose connective on non-lemma base not supported" };
  }
  return renderBaseVolitionalPurposeConnective(lemmaBase);
}

export function renderPredicateBaseVolitionalDeliberativeRetrospective(
  base: KoreanPredicateBase
): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional deliberative retrospective on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(
      lemmaBase.final.lemma,
      lemmaBase.final.irregular,
      "ㄹ/을까"
    )} 생각했더니`,
    polite: false
  };
}

export function renderPredicateBaseVolitionalIntentAttributive(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional intent attributive on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "(으)려는")}`,
    polite: false
  };
}

export function renderPredicateBaseVolitionalCohortativeAttributive(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional cohortative attributive on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "자")}는`,
    polite: false
  };
}

export function renderPredicateBaseVolitionalQuotative(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "volitional quotative on non-lemma base not supported" };
  }
  return renderBaseVolitionalQuotative(lemmaBase);
}

export function renderPredicateBaseVolitionalPoliteTerminal(base: KoreanPredicateBase): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "polite volitional terminal on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "(으)ㅂ시다")}`,
    polite: true
  };
}

export function renderPredicateBaseVolitionalPoliteRegisterTerminal(
  base: KoreanPredicateBase,
  formal: boolean
): RenderOutcome {
  const lemmaBase = lemmaPredicateBase(base);
  if (lemmaBase === null) {
    return { ok: false, reason: "polite volitional terminal on non-lemma base not supported" };
  }
  if (formal) {
    return {
      ok: true,
      text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "(으)ㅂ시다")}`,
      polite: true
    };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "ㄹ/을")}까요`,
    polite: true
  };
}

export function renderVolitionalQuestionContent(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: `${conjugate(opts.stemLemma, opts.stemIrregular, "ㄹ/을")}지`,
    polite: false
  };
}

export function renderVolitionalQuestionQuotative(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return renderBaseVolitionalQuestionQuotative({
    prefix: "",
    final: { kind: "lemma", lemma: opts.stemLemma, irregular: opts.stemIrregular, isVerb: true }
  });
}

export function renderBaseVolitionalQuestionQuotative(base: KoreanLemmaPredicateBase): RenderOutcome {
  return {
    ok: true,
    text: `${base.prefix}${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을까")} 하고`,
    polite: false
  };
}

export function renderVolitionalQuestionReformulation(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: `${conjugate(opts.stemLemma, opts.stemIrregular, "ㄹ/을까")} 하면`,
    polite: false
  };
}

export function renderVolitionalQuestionQuotativeEllipsis(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: `${conjugate(opts.stemLemma, opts.stemIrregular, "ㄹ/을까")} 해서`,
    polite: false
  };
}

export function renderVolitionalQuestionAlternative(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: `${conjugate(opts.stemLemma, opts.stemIrregular, "ㄹ/을까")} 말까`,
    polite: false
  };
}

export function renderVolitionalQuotedQuestionContent(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
}): RenderOutcome {
  return {
    ok: true,
    text: conjugate(opts.stemLemma, opts.stemIrregular, "ㄹ/을까"),
    polite: false
  };
}
