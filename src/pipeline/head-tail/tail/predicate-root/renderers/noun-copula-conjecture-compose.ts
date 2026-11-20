import { hasBatchim } from "../../../../../generator/hangul.js";
import type { LookupTables } from "../../../../lookup-tables.js";
import type { ConnectiveOp } from "../grammar.js";
import { type KoreanFinalForm, type KoreanLemmaPredicateBase, type KoreanPredicateBase, type NounCopulaPredicateBase, nounCopulaFinalAllomorphHost, type RenderOutcome } from "./base-model.js";
import { negativeNounCopulaChainBase } from "./base-support.js";
import { composeBaseWithConnective } from "./connective-compose.js";
import { projectBaseFutureAttributive } from "./predicate-base-projection.js";
import { composeBaseWithConjectureQuestionConnective, isConjectureQuestionContinuationConnective, plainConjectureBase } from "./conjecture-compose.js";
import { composeBaseWithTerminal } from "./predicate-terminal-compose.js";

function lemmaCopulaConjectureBase(
  prefix: string,
  final: Extract<KoreanFinalForm, { readonly kind: "lemma" }>,
  conjecturePolite: boolean
): KoreanPredicateBase {
  return {
    ...plainConjectureBase({
      stemLemma: final.lemma,
      stemIrregular: final.irregular,
      isVerb: final.isVerb,
      conjecturePolite
    }),
    prefix
  };
}

export function composeNounCopulaBaseWithConjecture(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  past: boolean,
  formal: boolean,
  isPolite: boolean,
  conjecturePolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  const polite = isPolite || conjecturePolite;
  if (base.final.kind === "lemma") {
    return composeBaseWithTerminal(lemmaCopulaConjectureBase(base.prefix, base.final, conjecturePolite), past, formal, polite, lookups);
  }
  if (base.final.kind === "nounCopula") {
    return composeNounCopulaConjecture(base.prefix, base.final, past, formal, polite);
  }
  return composeNegativeNounCopulaConjecture(base.prefix, base.final, past, formal, polite);
}

export function composeNounCopulaBaseWithConjectureConnective(
  base: NounCopulaPredicateBase | KoreanLemmaPredicateBase,
  connective: ConnectiveOp,
  past: boolean,
  formal: boolean,
  isPolite: boolean,
  lookups: LookupTables
): RenderOutcome {
  if (isConjectureQuestionContinuationConnective(connective)) {
    return composeBaseWithConjectureQuestionConnective(
      base,
      connective,
      past,
      formal,
      isPolite
    );
  }
  if (base.final.kind === "lemma") {
    if (connective.connective === "quotative") {
      const attributive = projectBaseFutureAttributive(base, past, formal);
      if (attributive !== null) {
        return { ok: true, text: `${attributive} 거라고`, polite: false };
      }
    }
    return composeBaseWithConnective(
      lemmaCopulaConjectureBase(base.prefix, base.final, false),
      connective,
      past,
      isPolite,
      null,
      formal,
      lookups
    );
  }
  const nounCopulaBase: NounCopulaPredicateBase = { ...base, final: base.final };
  if (connective.connective === "quotative") {
    return composeNounCopulaConjectureQuotative(nounCopulaBase, past, formal, isPolite);
  }
  const lowered = nounCopulaConjectureConnectiveBase(nounCopulaBase, past, formal);
  return composeBaseWithConnective(lowered, connective, false, isPolite, null, formal, lookups);
}

function composeNounCopulaConjectureQuotative(
  base: NounCopulaPredicateBase,
  past: boolean,
  formal: boolean,
  isPolite: boolean
): RenderOutcome {
  void isPolite;
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const attr = past
      ? (noBatchim ? `${noun}였을` : `${noun}이었을`)
      : `${noun}일`;
    return { ok: true, text: `${base.prefix}${attr} 거라고`, polite: false };
  }
  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const chainFinalLemma = chainBase.final.kind === "lemma" ? chainBase.final.lemma : "아니다";
  const attr = chainFinalLemma === "않다"
    ? (past ? "않았을" : "않을")
    : (past ? "아니었을" : "아닐");
  return { ok: true, text: `${base.prefix}${chainBase.prefix}${attr} 거라고`, polite: false };
}

function nounCopulaConjectureConnectiveBase(
  base: NounCopulaPredicateBase,
  past: boolean,
  formal: boolean
): KoreanPredicateBase {
  if (base.final.kind === "nounCopula") {
    const noun = base.final.nounSurface;
    const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(base.final)) === false;
    const stem = past
      ? (noBatchim ? `${noun}였겠` : `${noun}이었겠`)
      : (noBatchim ? `${noun}겠` : `${noun}이겠`);
    return {
      prefix: base.prefix,
      final: { kind: "lemma", lemma: `${stem}다`, irregular: null, isVerb: false }
    };
  }

  const chainBase = negativeNounCopulaChainBase(base.final, formal);
  const chainFinalLemma =
    chainBase.final.kind === "lemma" ? chainBase.final.lemma : "아니다";
  const stem = chainFinalLemma === "않다"
    ? (past ? "않았겠" : "않겠")
    : (past ? "아니었겠" : "아니겠");
  return {
    prefix: `${base.prefix}${chainBase.prefix}`,
    final: { kind: "lemma", lemma: `${stem}다`, irregular: null, isVerb: false }
  };
}

function composeNounCopulaConjecture(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "nounCopula" }>,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  const noun = final.nounSurface;
  const noBatchim = hasBatchim(nounCopulaFinalAllomorphHost(final)) === false;
  const stem = past
    ? `${noun}${noBatchim ? "였겠" : "이었겠"}`
    : `${noun}${noBatchim ? "겠" : "이겠"}`;
  const ending = polite ? "죠" : "지";
  return { ok: true, text: `${prefix}${stem}${ending}`, polite };
}

function composeNegativeNounCopulaConjecture(
  prefix: string,
  final: Extract<KoreanFinalForm, { kind: "negativeNounCopula" }>,
  past: boolean,
  formal: boolean,
  polite: boolean
): RenderOutcome {
  const base = negativeNounCopulaChainBase(final, formal);
  if (base.final.kind === "lemma" && base.final.lemma === "아니다") {
    const stem = past ? "아니었겠" : "아니겠";
    return { ok: true, text: `${prefix}${base.prefix}${stem}${polite ? "죠" : "지"}`, polite };
  }
  if (base.final.kind === "lemma" && base.final.lemma === "않다") {
    const stem = past ? "않았겠" : "않겠";
    return { ok: true, text: `${prefix}${base.prefix}${stem}${polite ? "죠" : "지"}`, polite };
  }
  return { ok: false, reason: "negative noun copula conjecture base invariant violation" };
}
