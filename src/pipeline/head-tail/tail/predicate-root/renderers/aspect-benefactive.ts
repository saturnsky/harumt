import { conjugate, type IrregularType } from "../../../../../generator/conjugator.js";
import { type BenefactiveAspectOp } from "../grammar.js";
import { lemmaPredicateBase, type KoreanLemmaPredicateBase, type RenderOutcome } from "./base-model.js";
import { predicateBaseInfinitiveForm } from "./base-support.js";
import { renderBaseVolitionalQuestionQuotative } from "./final-forms.js";
import { benefactiveBase } from "./predicate-bases.js";

export function renderBenefactiveVolitional(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly benefactive: BenefactiveAspectOp;
  readonly formal: boolean;
}): RenderOutcome {
  const { stemLemma, stemIrregular, benefactive, formal } = opts;
  const payload = benefactive.benefactive;
  if (payload.potential) {
    return { ok: false, reason: "potential benefactive volitional is outside current subset" };
  }
  if (payload.kind === "morau" || payload.kind === "itadaku") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    const requestHost = payload.kind === "itadaku" ? "부탁하다" : "하다";
    const requestTail = formal
      ? conjugate(requestHost, "여", "(으)ㅂ시다")
      : conjugate(requestHost, "여", "자");
    return {
      ok: true,
      text: `${stemAe} 달라고 ${requestTail}`,
      polite: formal
    };
  }

  const baseRes = benefactiveBase(benefactive, stemLemma, stemIrregular);
  if (!baseRes.ok) {
    return baseRes;
  }
  const lemmaBase = lemmaPredicateBase(baseRes.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "benefactive volitional on non-lemma base not supported" };
  }
  const ending = formal ? "(으)ㅂ시다" : "자";
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, ending)}`,
    polite: formal
  };
}

export function renderBenefactiveVolitionalPurpose(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly benefactive: BenefactiveAspectOp;
}): RenderOutcome {
  const { stemLemma, stemIrregular, benefactive } = opts;
  const payload = benefactive.benefactive;
  if (payload.potential) {
    return { ok: false, reason: "potential benefactive volitional purpose is outside current subset" };
  }
  if (payload.kind === "morau" || payload.kind === "itadaku") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    const requestHost = payload.kind === "itadaku" ? "부탁하다" : "하다";
    return {
      ok: true,
      text: `${stemAe} 달라고 ${conjugate(requestHost, "여", "(으)려고")}`,
      polite: false
    };
  }
  const baseRes = benefactiveBase(benefactive, stemLemma, stemIrregular);
  if (!baseRes.ok) {
    return baseRes;
  }
  const lemmaBase = lemmaPredicateBase(baseRes.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "benefactive volitional purpose on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "(으)려고")}`,
    polite: false
  };
}

export function renderBenefactiveVolitionalResolution(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemPrefix?: string | null;
  readonly benefactive: BenefactiveAspectOp;
}): RenderOutcome {
  const { stemLemma, stemIrregular, stemPrefix, benefactive } = opts;
  const payload = benefactive.benefactive;
  if (payload.potential) {
    return { ok: false, reason: "potential benefactive volitional resolution is outside current subset" };
  }
  const prefix = stemPrefix ?? "";
  if (payload.kind === "morau" || payload.kind === "itadaku") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    const requestHost = payload.kind === "itadaku" ? "부탁하다" : "하다";
    return {
      ok: true,
      text: `${prefix}${stemAe} 달라고 ${conjugate(requestHost, "여", "아/어야지")}`,
      polite: false
    };
  }
  const baseRes = benefactiveBase(benefactive, stemLemma, stemIrregular);
  if (!baseRes.ok) {
    return baseRes;
  }
  const lemmaBase = lemmaPredicateBase(baseRes.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "benefactive volitional resolution on non-lemma base not supported" };
  }
  return {
    ok: true,
    text: `${prefix}${lemmaBase.prefix}${conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "아/어야지")}`,
    polite: false
  };
}

export function renderBenefactiveVolitionalQuestionQuotative(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly benefactive: BenefactiveAspectOp;
}): RenderOutcome {
  const question = renderBenefactiveVolitionalQuestion({ ...opts, polite: false });
  return question.ok ? { ok: true, text: `${question.text} 하고`, polite: false } : question;
}

function benefactiveRequestQuestionTail(family: "morau" | "itadaku"): string {
  return `달라고 ${conjugate(family === "itadaku" ? "부탁하다" : "하다", "여", "ㄹ/을")}`;
}

export function renderChainVolitionalQuestionQuotative(base: KoreanLemmaPredicateBase): RenderOutcome {
  const policy = base.policy;
  if (policy?.kind !== "benefactive" || (policy.family !== "morau" && policy.family !== "itadaku")) {
    return renderBaseVolitionalQuestionQuotative(base);
  }
  const complement = policy.requestComplementBase;
  if (complement === undefined || policy.potential) {
    return { ok: false, reason: "request-less benefactive volitional question is outside current subset" };
  }
  const body = `${complement.prefix}${predicateBaseInfinitiveForm(complement)}`;
  return { ok: true, text: `${body} ${benefactiveRequestQuestionTail(policy.family)}까 하고`, polite: false };
}

export function renderBenefactiveVolitionalQuestion(opts: {
  readonly stemLemma: string;
  readonly stemIrregular: IrregularType | null;
  readonly stemPrefix?: string | null;
  readonly benefactive: BenefactiveAspectOp;
  readonly polite: boolean;
}): RenderOutcome {
  const { stemLemma, stemIrregular, stemPrefix, benefactive, polite } = opts;
  const payload = benefactive.benefactive;
  if (payload.potential) {
    return { ok: false, reason: "potential benefactive volitional question is outside current subset" };
  }
  const prefix = stemPrefix ?? "";
  if (payload.kind === "morau" || payload.kind === "itadaku") {
    const stemAe = conjugate(stemLemma, stemIrregular, "아/어");
    return {
      ok: true,
      text: `${prefix}${stemAe} ${benefactiveRequestQuestionTail(payload.kind)}${polite ? "까요" : "까"}`,
      polite
    };
  }

  const baseRes = benefactiveBase(benefactive, stemLemma, stemIrregular);
  if (!baseRes.ok) {
    return baseRes;
  }
  const lemmaBase = lemmaPredicateBase(baseRes.base);
  if (lemmaBase === null) {
    return { ok: false, reason: "benefactive volitional question on non-lemma base not supported" };
  }
  const attr = conjugate(lemmaBase.final.lemma, lemmaBase.final.irregular, "ㄹ/을");
  return {
    ok: true,
    text: `${prefix}${lemmaBase.prefix}${attr}${polite ? "까요" : "까"}`,
    polite
  };
}
