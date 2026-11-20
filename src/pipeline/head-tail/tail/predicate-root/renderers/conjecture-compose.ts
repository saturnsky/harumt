import { shortNegationPrefix } from "../../../../../generator/aux-map.js";
import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { isQuestionContentConnective } from "../bare-noun-stem-hosting.js";
import { hasBatchim } from "../../../../../generator/hangul.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import { isAdversativeConnectiveSurface } from "../connective-render-table.js";
import type { ConjectureOp, ConnectiveOp, NegationOp, ShortNegationPolicy } from "../grammar.js";
import { type AttributivePastProjection, type BaseResult, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NounCopulaPredicateBase, nounCopulaFinalAllomorphHost, type OkBaseResult, type RenderOutcome } from "./base-model.js";
import { applyConnectivePrefixContraction, conjectureBaseSourceTrace, lexicalPotentialStemBase, lowerPotentialFinalNegationBase, negativeNounCopulaChainBase } from "./base-support.js";
import { resolveConnectiveEnding } from "./connective-ending.js";

export function composeBaseWithConjectureQuestionConnective(
  base: KoreanPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  if (!isConjectureQuestionContinuationConnective(connective)) {
    return { ok: false, reason: "conjecture question connective requires question-content connective" };
  }
  const questionPolite = polite ||
    (connective.questionContentRole === "terminal" &&
      base.final.kind === "lemma" &&
      base.final.idiom?.kind === "conjecture" &&
      base.final.idiom.conjecturePolite === true);
  let question: string | null = null;
  if (base.final.kind === "lemma" && base.final.idiom?.kind === "conjecture") {
    const nominalized = base.final.idiom.projection === "nominalized"
      ? nominalizedConjectureStem(base.final.lemma)
      : null;
    if (nominalized !== null) {
      question = `${base.prefix}${nominalized}일까${questionPolite ? "요" : ""}`;
    } else if (base.policy?.kind === "noun_copula_interop") {
      question = composeNounCopulaConjectureQuestion(
        {
          prefix: "",
          final: {
            kind: "nounCopula",
            nounSurface: base.policy.nounSurface,
            isBoundNoun: base.policy.isBoundNoun
          }
        },
        past || base.policy.conjectureHostPast === true,
        formal,
        questionPolite
      );
    } else if (base.policy?.kind === "negative_noun_copula_interop") {
      const attr = past || base.policy.conjectureHostPast === true ? "아니었을" : "아닐";
      question = `${base.policy.conjectureSubject}${attr}까${questionPolite ? "요" : ""}`;
    } else if (base.final.idiom.sourceLemma !== undefined) {
      const sourceLemma = base.final.idiom.sourceLemma;
      const sourceIrregular = base.final.idiom.sourceIrregular ?? null;
      const lemmaQuestion = base.final.idiom.sourceNegation === "long"
        ? `${base.final.idiom.sourceNegationInability === true ? "못할까" : "않을까"}${questionPolite ? "요" : ""}`
        : past
          ? `${conjugate(sourceLemma, sourceIrregular, "았/었")}을까${questionPolite ? "요" : ""}`
          : `${conjugate(sourceLemma, sourceIrregular, "ㄹ/을까")}${questionPolite ? "요" : ""}`;
      question = `${base.prefix}${lemmaQuestion}`;
    }
  } else if (base.final.kind === "nounCopula" || base.final.kind === "negativeNounCopula") {
    question = composeNounCopulaConjectureQuestion(
      base as NounCopulaPredicateBase,
      past,
      formal,
      questionPolite
    );
  } else if (base.final.kind === "lemma") {
    const lemmaQuestion = past
      ? `${conjugate(base.final.lemma, base.final.irregular, "았/었")}을까${questionPolite ? "요" : ""}`
      : `${conjugate(base.final.lemma, base.final.irregular, "ㄹ/을까")}${questionPolite ? "요" : ""}`;
    question = `${base.prefix}${lemmaQuestion}`;
  }
  if (question === null) {
    return { ok: false, reason: "conjecture question connective on non-projectable base not supported" };
  }
  const suffix = connective.connective === "question_quotative" ? " 하고" : "";
  return { ok: true, text: `${question}${suffix}`, polite: questionPolite };
}


export function isConjectureQuestionContinuationConnective(connective: ConnectiveOp): boolean {
  return isQuestionContentConnective(connective) || connective.connective === "alternative";
}

export function composeCommittedBaseWithConjectureQuestionConnective(
  baseResult: BaseResult,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  if (!baseResult.ok) {
    return { ok: false, reason: baseResult.reason };
  }
  const connectiveBase = applyConnectivePrefixContraction(
    baseResult.base,
    baseResult.connectivePrefixContraction,
    formal
  );
  return composeBaseWithConjectureQuestionConnective(
    connectiveBase,
    connective,
    past,
    formal,
    isPolite
  );
}

export function conjectureBase(opts: {
  readonly conjecture: ConjectureOp;
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly shortNegationPolicy: ShortNegationPolicy | undefined;
  readonly pastProjection: AttributivePastProjection;
}): BaseResult {
  const { conjecture, stemLemma, stemIrregular, isVerb, preModalNeg, past, shortNegationPolicy, pastProjection } = opts;
  const conjecturePolite = conjecture.polite;
  const ok = (base: KoreanPredicateBase): OkBaseResult => ({
    ok: true,
    base,
    ...(() => {
      const sourceTrace = conjectureBaseSourceTrace(base, conjecture);
      return sourceTrace === undefined ? {} : { sourceTrace };
    })()
  });
  if (preModalNeg !== null) {
    if (preModalNeg.chainDepth >= 2) {
      return { ok: false, reason: "chain depth ≥ 2 + conjecture 영역 외" };
    }
    const negationFocus = preModalNeg.focusParticle ?? "";
    const negationAux = preModalNeg.inability === true ? "못하" : "않";
    if (past || preModalNeg.chainPast) {
      if (isVerb && preModalNeg.preferShortNegation) {
        if (stemLemma.endsWith("하다") && stemLemma.length > 2 && shortNegationPolicy !== "lexical_prefix") {
          const sahenPrefix = stemLemma.slice(0, -2);
          return ok({
            prefix: `${sahenPrefix} 안 했을 `,
            final: { kind: "boundNounCopula", nounSurface: "거" }
          });
        }
        return ok({
          prefix: `안 ${conjugate(stemLemma, stemIrregular, "았/었")}을 `,
          final: { kind: "boundNounCopula", nounSurface: "거" }
        });
      }
      return ok({
        prefix: `${conjugate(stemLemma, stemIrregular, "지")}${negationFocus} ${negationAux === "않" ? "않았을" : "못했을"} `,
        final: { kind: "boundNounCopula", nounSurface: "거" }
      });
    }
    const lexicalPotential = lexicalPotentialStemBase(stemLemma, stemIrregular, isVerb);
    if (lexicalPotential !== null) {
      const lowered = lowerPotentialFinalNegationBase(lexicalPotential, preModalNeg.chainDepth);
      if (lowered === null) {
        return { ok: false, reason: "lexical potential neg + conjecture invariant violation" };
      }
      const stemGet = conjugate(lowered.final.lemma, lowered.final.irregular, "겠");
      return ok({
        prefix: lowered.prefix,
        final: {
          kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: lowered.final.isVerb,
          idiom: {
            kind: "conjecture",
            conjecturePolite,
            sourceLemma: lowered.final.lemma,
            sourceIrregular: lowered.final.irregular
          }
        }
      });
    }
    if (isVerb && preModalNeg.preferShortNegation) {
      const stemGet = conjugate(stemLemma, stemIrregular, "겠");
      if (stemLemma.endsWith("하다") && stemLemma.length > 2 && shortNegationPolicy !== "lexical_prefix") {
        const sahenPrefix = stemLemma.slice(0, -2);
        return ok({
          prefix: `${sahenPrefix} 안 `,
          final: {
            kind: "lemma", lemma: "하겠다", irregular: null, isVerb: true,
            idiom: {
              kind: "conjecture",
              conjecturePolite,
              sourceLemma: "하다",
              sourceIrregular: "여",
              sourceNegation: "short"
            }
          }
        });
      }
      return ok({
        prefix: "안 ",
        final: {
          kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: true,
          idiom: {
            kind: "conjecture",
            conjecturePolite,
            sourceLemma: stemLemma,
            sourceIrregular: stemIrregular,
            sourceNegation: "short"
          }
        }
      });
    }
    const stemJi = conjugate(stemLemma, stemIrregular, "지");
    return ok({
      prefix: `${stemJi}${negationFocus} `,
      final: {
        kind: "lemma", lemma: `${negationAux}겠다`, irregular: null, isVerb: true,
        idiom: {
          kind: "conjecture",
          conjecturePolite,
          sourceLemma: stemLemma,
          sourceIrregular: stemIrregular,
          sourceNegation: "long",
          ...(preModalNeg.inability === true ? { sourceNegationInability: true } : {})
        }
      }
    });
  }
  if (past) {
    if (pastProjection === "committed") {
      const committedPast = stemLemma === "아니다"
        ? "아니었"
        : conjugate(stemLemma, stemIrregular, "았/었");
      return ok({
        prefix: "",
        final: {
          kind: "lemma", lemma: `${committedPast}겠다`, irregular: null, isVerb,
          idiom: { kind: "conjecture", conjecturePolite }
        }
      });
    }
    if (!isVerb) {
      const committedPast = conjugate(stemLemma, stemIrregular, "았/었");
      return ok({
        prefix: "",
        final: {
          kind: "lemma", lemma: `${committedPast}겠다`, irregular: null, isVerb: false,
          idiom: { kind: "conjecture", conjecturePolite }
        }
      });
    }
    const stemAttr = `${conjugate(stemLemma, stemIrregular, "았/었")}을`;
    return ok({
      prefix: `${stemAttr} `,
      final: { kind: "boundNounCopula", nounSurface: "거" }
    });
  }
  return ok(plainConjectureBase({ stemLemma, stemIrregular, isVerb, conjecturePolite }));
}

export function plainConjectureBase(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly conjecturePolite: boolean;
}): KoreanPredicateBase {
  const stemGet = conjugate(opts.stemLemma, opts.stemIrregular, "겠");
  return {
    prefix: "",
    final: {
      kind: "lemma", lemma: `${stemGet}다`, irregular: null, isVerb: opts.isVerb,
      idiom: {
        kind: "conjecture",
        conjecturePolite: opts.conjecturePolite,
        sourceLemma: opts.stemLemma,
        sourceIrregular: opts.stemIrregular
      }
    }
  };
}

function nominalizedConjectureStem(lemma: string): string | null {
  return lemma.endsWith("이겠다")
    ? lemma.slice(0, -"이겠다".length)
    : null;
}

export function composeNominalizedConjectureTerminal(
  base: KoreanPredicateBase,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "nominalized conjecture terminal invariant violation" };
  }
  const nominal = nominalizedConjectureStem(base.final.lemma);
  if (nominal === null) {
    return { ok: false, reason: "nominalized conjecture base invariant violation" };
  }
  const polite = isPolite || base.final.idiom?.conjecturePolite === true;
  if (
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    base.policy.style === "emphasis"
  ) {
    return {
      ok: true,
      text: `${base.prefix}${nominal}이겠${polite ? "죠" : "지"}`,
      polite
    };
  }
  const casualNominal = !formal && nominal.endsWith("것")
    ? `${nominal.slice(0, -"것".length)}거`
    : nominal;
  const stem = casualNominal.endsWith("거")
    ? `${casualNominal}겠`
    : `${casualNominal}이겠`;
  return {
    ok: true,
    text: `${base.prefix}${stem}${polite ? "죠" : "지"}`,
    polite
  };
}

export function composeNounCopulaConjectureQuestion(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  past: boolean,
  formal: boolean,
  polite: boolean
): string {
  if (base.final.kind === "lemma") {
    const lemmaQuestion = past
      ? `${conjugate(base.final.lemma, base.final.irregular, "았/었")}을까`
      : conjugate(base.final.lemma, base.final.irregular, "ㄹ/을까");
    return `${base.prefix}${lemmaQuestion}${polite ? "요" : ""}`;
  }
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const attr = past
      ? `${noun}${noBatchim ? "였" : "이었"}을`
      : `${noun}일`;
    return `${base.prefix}${attr}까${polite ? "요" : ""}`;
  }

  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const attr = chainBase.final.kind === "lemma" && chainBase.final.lemma === "않다"
    ? (past ? "않았을" : "않을")
    : (past ? "아니었을" : "아닐");
  return `${base.prefix}${chainBase.prefix}${attr}까${polite ? "요" : ""}`;
}

export function composeNominalizedConjectureConnective(
  base: KoreanPredicateBase,
  connectiveSurface: string,
  isPolite: boolean,
  formal: boolean,
  connectiveType?: string
): RenderOutcome {
  if (base.final.kind !== "lemma") {
    return { ok: false, reason: "nominalized conjecture connective invariant violation" };
  }
  const nominal = nominalizedConjectureStem(base.final.lemma);
  if (nominal === null) {
    return { ok: false, reason: "nominalized conjecture connective invariant violation" };
  }
  if (
    connectiveType === "question_content" ||
    connectiveType === "question_quotative" ||
    connectiveType === "alternative"
  ) {
    return { ok: true, text: `${base.prefix}${nominal}일지`, polite: false };
  }
  const connectivePolite = isPolite || (
    !formal &&
    base.policy?.kind === "scope_carrier" &&
    base.policy.carrier === "noda" &&
    base.final.idiom?.kind === "conjecture" &&
    base.final.idiom.conjecturePolite === true
  );
  const politeSuffix = connectivePolite ? "요" : "";
  if (connectiveSurface === "から" || connectiveSurface === "ので") {
    return { ok: true, text: `${base.prefix}${nominal}일 테니까${politeSuffix}`, polite: connectivePolite };
  }
  if (isAdversativeConnectiveSurface(connectiveSurface)) {
    return { ok: true, text: `${base.prefix}${nominal}이겠지만${politeSuffix}`, polite: connectivePolite };
  }
  if (
    connectiveSurface === "し" &&
    base.final.idiom?.kind === "conjecture" &&
    base.final.idiom.sourceLemma !== undefined
  ) {
    const hostAttr = conjugate(
      base.final.idiom.sourceLemma,
      base.final.idiom.sourceIrregular ?? null,
      "ㄹ/을"
    );
    const listingPoliteSuffix = isPolite ? "요" : "";
    return {
      ok: true,
      text: `${base.prefix}${hostAttr} 테고${listingPoliteSuffix}`,
      polite: isPolite
    };
  }
  const ending = resolveConnectiveEnding(connectiveSurface, false, false);
  if (ending === null || !ending.pastViaEnding) {
    return { ok: false, reason: `nominalized conjecture + connective '${connectiveSurface}' 영역 외` };
  }
  const finalText = conjugate(`${nominal}이겠다`, null, ending.ending);
  return {
    ok: true,
    text: `${base.prefix}${finalText}${ending.suffixText ?? ""}${politeSuffix}`,
    polite: connectivePolite
  };
}

export function renderConjectureQuotativeFromStem(options: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly isVerb: boolean;
  readonly preModalNeg: NegationOp | null;
  readonly past: boolean;
  readonly lookups: LookupTables;
}): RenderOutcome {
  const { stemLemma, stemIrregular, preModalNeg, past, lookups } = options;
  if (preModalNeg !== null && preModalNeg.chainDepth >= 2) {
    return { ok: false, reason: "chain depth ≥ 2 + conjecture quotative 영역 외" };
  }
  if (preModalNeg?.chainPast === true) {
    return { ok: false, reason: "past negative conjecture quotative 영역 외" };
  }
  let future: string;
  if (preModalNeg !== null) {
    if (preModalNeg.preferShortNegation && options.isVerb) {
      const [prefix, negLemma, negIrregular] = shortNegationPrefix(stemLemma, stemIrregular, lookups);
      future = prefix + conjugate(negLemma, negIrregular, "ㄹ/을");
    } else {
      future = `${conjugate(stemLemma, stemIrregular, "지")} ${conjugate("않다", null, "ㄹ/을")}`;
    }
  } else if (past) {
    future = conjugate(`${conjugate(stemLemma, stemIrregular, "았/었")}다`, null, "ㄹ/을");
  } else {
    future = conjugate(stemLemma, stemIrregular, "ㄹ/을");
  }
  return {
    ok: true,
    text: `${future} 거라고`,
    polite: false
  };
}
