import { buildSyntheticAux } from "../pattern-runtime.js";
import { legacySurfaceCompositionPlan as legacyPlanRegistered } from "../../types/render-plan.js";
import { activeProtoScopedScanStart } from "../clause-layout/proto-state.js";
import { TokenCursor } from "../token-cursor.js";
import {
  caseParticleMarkerRelationForToken,
  kaMarkerRelationAt,
  nominalizerAdversativeConnectiveRelationAt
} from "../head-tail/boundary/marker.js";
import { hasHardTerminalPunctuationClass, hasWeakPunctuationRelation, type BoundaryToken } from "../head-tail/boundary/punctuation.js";
import type { ConditionalEvidenceWindow } from "../semantics/conditional.js";
import { isBaSufficiencyConditionalAt } from "../semantics/permission-idiom.js";
import type { LookupTables } from "../lookup-tables.js";
import type { PatternRuntimeToken } from "../pattern-runtime.js";
import type { LemmaRealization, RenderPlan } from "../../types/render-plan.js";
import type { LexicalTailAbsorptionLike, TeAruStateEvidence } from "./types.js";
import { POS0, POS01, POS4, 助詞_接続助詞, 助詞, 助動詞_タ, 補助記号, 동사, pos0in, PREDICATE_BITS, NOMINAL_BITS } from "../../types/pos.js";

export function buildReportingPlan(options: { readonly polite?: boolean } = {}): LemmaRealization {
  return {
    kind: "lemma",
    entry: null,
    koreanLemma: "하다",
    koreanPos: 동사,
    irregular: "여",
    auxTokens: buildSyntheticAux(options.polite === true),
    formalOverride: false
  };
}

export function contentWeakPunctuationAt(tokens: readonly BoundaryToken[], index: number): boolean {
  return hasWeakPunctuationRelation(tokens[index], index, ["content_resolver"]);
}

export function contentQuestionOrPeriodAt(tokens: readonly BoundaryToken[], index: number): boolean {
  return hasHardTerminalPunctuationClass(tokens[index], index, ["japanese_period", "question"], ["content_resolver"]);
}

export function contentSentenceEndAt(tokens: readonly BoundaryToken[], index: number): boolean {
  return hasHardTerminalPunctuationClass(tokens[index], index, ["japanese_period", "question", "exclamation"], ["content_resolver"]);
}

export function benefactiveAbsorptionKind(absorptions: readonly LexicalTailAbsorptionLike[]): string | null {
  for (const absorption of absorptions) {
    if (absorption.kind === "embedded_juda" || absorption.kind === "honorific_jusida" || absorption.kind === "recipient_side_humble" || absorption.kind === "recipientSideHumble") {
      return absorption.kind;
    }
  }
  return null;
}

export function teAruCaseParticleSurface(tokens: readonly PatternRuntimeToken[], start: number): "が" | "を" | null {
  let seenGa = false;
  const floor = activeProtoScopedScanStart(tokens, start, "clause") ?? 0;
  for (let index = start - 1; index >= floor; index -= 1) {
    const token = tokens[index];
    if (((token?.pos ?? 0) & POS0) === 補助記号) {
      break;
    }
    if (((token?.pos ?? 0) & POS0) !== 助詞) {
      continue;
    }
    if (caseParticleMarkerRelationForToken(token, index, {
      acceptedSurfaces: ["を"],
      consumers: ["content_resolver"]
    }) !== null) {
      return "を";
    }
    if (caseParticleMarkerRelationForToken(token, index, {
      acceptedSurfaces: ["が"],
      consumers: ["content_resolver"]
    }) !== null) {
      seenGa = true;
    }
  }
  return seenGa ? "が" : null;
}

export function teAruStateEvidence(
  tokens: readonly PatternRuntimeToken[],
  start: number,
  particleSurface: "が" | "を",
  lookups: LookupTables
): TeAruStateEvidence | null {
  const dictionaryForm = tokens[start]?.dictionaryForm ?? "";
  if (particleSurface === "が") {
    const koreanLemmaInfo = lookups.TE_ARU_SUBJECT_RESULTATIVE_LEMMAS.get(dictionaryForm);
    if (koreanLemmaInfo === undefined) {
      return null;
    }
    const [koreanLemma, irregular] = koreanLemmaInfo;
    return {
      particleSurface,
      koreanLemma,
      irregular,
      sourceNote: "",
      sourceMatchReason: "resultative",
      state: "resultative",
      renderStrategy: "resultative_state"
    };
  }
  const koreanLemmaInfo = lookups.TE_ARU_OBJECT_PREPARED_LEMMAS.get(dictionaryForm);
  if (koreanLemmaInfo === undefined) {
    return null;
  }
  const [koreanLemma, irregular] = koreanLemmaInfo;
  return {
    particleSurface,
    koreanLemma,
    irregular,
    sourceNote: "",
    sourceMatchReason: "prepared_te_oku",
    state: "prepared",
    renderStrategy: "prepared_te_oku"
  };
}

function conjectureCopulaOwnedBySufficiencyIdiom(
  tokens: readonly PatternRuntimeToken[],
  index: number
): boolean {
  for (let back = index - 1, steps = 0; back >= 0 && steps < 3; back -= 1, steps += 1) {
    const token = tokens[back];
    if (token === undefined) {
      return false;
    }
    if ((token.pos & POS01) === 助詞_接続助詞 && token.surface === "ば") {
      return isBaSufficiencyConditionalAt(tokens, back);
    }
  }
  return false;
}

export function hasCounterfactualCueAfter(
  cursor: Pick<TokenCursor<PatternRuntimeToken>, "tokens" | "pos" | "end">,
  evidenceWindow: ConditionalEvidenceWindow | undefined
): boolean {
  if (evidenceWindow === undefined) {
    return false;
  }
  const { tokens } = cursor;
  const n = Math.min(cursor.end, evidenceWindow.end);
  let seenContent = false;
  let index = Math.max(cursor.pos, evidenceWindow.start);
  while (index < n) {
    if (contentWeakPunctuationAt(tokens, index)) {
      index += 1;
      continue;
    }
    if (contentSentenceEndAt(tokens, index)) {
      return false;
    }
    break;
  }

  while (index < n) {
    const token = tokens[index];
    const surface = token?.surface;
    const pos0 = (token?.pos ?? 0) & POS0;
    if (contentSentenceEndAt(tokens, index)) {
      return false;
    }
    if (contentWeakPunctuationAt(tokens, index)) {
      index += 1;
      continue;
    }
    if (nominalizerAdversativeConnectiveRelationAt(tokens, index, { consumers: ["content_resolver"] }) !== null) {
      return true;
    }
    if (surface === "だろう" || surface === "でしょう") {
      return conjectureCopulaOwnedBySufficiencyIdiom(tokens, index) ? false : true;
    }
    if (
      kaMarkerRelationAt(tokens, index, ["content_resolver"]) !== null &&
      index + 2 < n &&
      tokens[index + 1]?.surface === "も" &&
      ["知れる", "しれる"].includes(tokens[index + 2]?.dictionaryForm ?? "")
    ) {
      return true;
    }
    if (((token?.pos ?? 0) & POS4) === 助動詞_タ) {
      return true;
    }
    if (pos0in(pos0, PREDICATE_BITS)) {
      seenContent = true;
    }
    if (seenContent && (pos0in(pos0, NOMINAL_BITS)) && index + 1 < n) {
      const nextPos0 = (tokens[index + 1]?.pos ?? 0) & POS0;
      if (nextPos0 === 助詞 || pos0in(nextPos0, NOMINAL_BITS)) {
        return false;
      }
    }
    index += 1;
  }
  return false;
}

export function legacySurfaceCompositionPlan(
  text: string,
  options: {
    koreanPos: number;
    prefix?: RenderPlan | string | null;
    suffix?: RenderPlan | string | null;
    rewritePrefixOnLemmaReplace?: boolean;
    rewriteSuffixOnLemmaReplace?: boolean;
    rewritePrefixOnConnectiveReplace?: boolean;
    rewriteSuffixOnConnectiveReplace?: boolean;
    connectiveRoleSource?: "semantic";
  }
): RenderPlan {
  return legacyPlanRegistered("content_resolver_runtime", {
    korean: text,
    koreanPos: options.koreanPos,
    ...(options.prefix === undefined || options.prefix === null ? {} : { prefix: options.prefix }),
    ...(options.suffix === undefined || options.suffix === null ? {} : { suffix: options.suffix }),
    ...(options.connectiveRoleSource === undefined ? {} : { connectiveRoleSource: options.connectiveRoleSource }),
    ...(options.rewritePrefixOnLemmaReplace === undefined ? {} : { rewritePrefixOnLemmaReplace: options.rewritePrefixOnLemmaReplace }),
    ...(options.rewriteSuffixOnLemmaReplace === undefined ? {} : { rewriteSuffixOnLemmaReplace: options.rewriteSuffixOnLemmaReplace }),
    ...(options.rewritePrefixOnConnectiveReplace === undefined ? {} : { rewritePrefixOnConnectiveReplace: options.rewritePrefixOnConnectiveReplace }),
    ...(options.rewriteSuffixOnConnectiveReplace === undefined ? {} : { rewriteSuffixOnConnectiveReplace: options.rewriteSuffixOnConnectiveReplace })
  });
}

export function composePrefixWithPredicate(prefix: RenderPlan | string | null | undefined, predicate: RenderPlan, options: { readonly koreanPos: number }): RenderPlan {
  return legacySurfaceCompositionPlan("", {
    koreanPos: options.koreanPos,
    ...(prefix === undefined || prefix === null ? {} : { prefix }),
    suffix: predicate,
    rewritePrefixOnLemmaReplace: true,
    rewriteSuffixOnLemmaReplace: false,
    rewritePrefixOnConnectiveReplace: false,
    rewriteSuffixOnConnectiveReplace: true
  });
}

export function composePredicateWithSuffix(predicate: RenderPlan, suffix: RenderPlan | string, options: { readonly koreanPos: number }): RenderPlan {
  return legacySurfaceCompositionPlan("", {
    koreanPos: options.koreanPos,
    prefix: predicate,
    suffix,
    rewritePrefixOnLemmaReplace: false,
    rewriteSuffixOnLemmaReplace: false,
    rewritePrefixOnConnectiveReplace: true,
    rewriteSuffixOnConnectiveReplace: false
  });
}
