import type { BenefactiveContext } from "../../../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../../../types/token.js";

import type { ContentResult, RareruReading } from "../../../content-types.js";
import type { LookupTables } from "../../../lookup-tables.js";
import type { BenefactiveAspectOp, StemNode, TailRoot, VoiceOp } from "./grammar.js";
import { hasFollowingNegationAfter } from "./grammar.js";
import {
  firstAuxLayer,
  tailRootBenefactiveOps,
  tailRootHasQuestionSfp,
  tailRootVoiceOps
} from "./inspect.js";
import { caseParticleMarkerRelationForToken, copulaNiMarkerRelationForToken } from "../../boundary/marker.js";

import { NOMINAL_KEIJOU_BITS, pos0in, POS4, POS4_NAME, POS4_SHIFT, PUNCTUATION_BITS, 形容詞0 } from "../../../../types/pos.js";
export function singleRareruReading(readings: ReadonlySet<RareruReading>): RareruReading | null {
  if (readings.size !== 1) {
    return null;
  }
  return [...readings][0] ?? null;
}

export function tailRootRareruReadings(
  root: TailRoot,
  fallback: ReadonlySet<RareruReading>
): ReadonlySet<RareruReading> {
  const readings = new Set<RareruReading>();
  for (const voice of tailRootVoiceOps(root)) {
    for (const candidate of voice.candidates ?? []) {
      readings.add(candidate);
    }
  }
  if (readings.size === 0 || fallback.size === 0) {
    return readings.size > 0 ? readings : fallback;
  }
  const narrowed = new Set<RareruReading>();
  for (const reading of readings) {
    if (fallback.has(reading)) {
      narrowed.add(reading);
    }
  }
  return narrowed.size > 0 ? narrowed : readings;
}

export function tailRootVoiceOpen(options: {
  readonly root: TailRoot;
  readonly fallbackVoice: ContentResult["voice"];
  readonly readings: ReadonlySet<RareruReading>;
  readonly tokens: readonly RuntimeHaruToken[];
  readonly index: number;
  readonly lookups: LookupTables;
}): boolean {
  void options.fallbackVoice;
  if (options.readings.size === 1) {
    return false;
  }
  const layer = firstAuxLayer(options.root.tail);
  if (layer === null) {
    return false;
  }
  const voiceIdx = layer.ops.findIndex((op) => op.kind === "voice" && op.candidates !== undefined);
  const voice = voiceIdx < 0 ? undefined : layer.ops[voiceIdx] as VoiceOp | undefined;
  if (voice === undefined || !voice.candidates?.includes("potential") || !voice.candidates.includes("passive")) {
    return false;
  }
  const previous = layer.ops[voiceIdx - 1];
  if (previous?.kind === "voice" && previous.voice === "causative") {
    return false;
  }
  if (previous?.kind === "postverbAuxiliary" && previous.auxiliary.followingRareruDefault === "potential") {
    return true;
  }
  const anchor = tailStemConjugationToken(layer.stem);
  if (tailStemIsSahenSuru(layer.stem, anchor)) {
    return false;
  }
  if (anchor !== undefined && options.lookups.RARERU_PASSIVE_PREFERRED.has(anchor.dictionaryForm)) {
    return false;
  }
  const hasFollowingNegation = hasFollowingNegationAfter(layer.ops, voiceIdx);
  if (hasFollowingNegation) {
    if (anchor !== undefined && options.lookups.RARERU_NEGATIVE_POTENTIAL_PREFERRED.has(anchor.dictionaryForm)) {
      return true;
    }
    const verbConjType = anchor !== undefined ? (POS4_NAME[(anchor.pos & POS4) >> POS4_SHIFT] ?? "") : "";
    if (verbConjType.startsWith("五段") || verbConjType.startsWith("サ行変格")) {
      return false;
    }
    return true;
  }
  if (tailRootHasQuestionSfp(options.root)) {
    return true;
  }
  return hasPrecedingVoiceDisambiguationParticle(options.tokens, options.index) ||
    hasPrecedingAdverbialModifier(options.tokens, options.index);
}

export function tailRootSpanVoice(
  root: TailRoot,
  fallback: ContentResult["voice"],
  readings: ReadonlySet<RareruReading>
): ContentResult["voice"] {
  const reading = singleRareruReading(readings);
  if (reading === "passive" || reading === "potential") {
    return reading;
  }
  const voice = tailRootVoiceOps(root).find((op) => op.voice === "passive" || op.voice === "potential");
  if (voice?.voice === "passive" || voice?.voice === "potential") {
    return voice.voice;
  }
  return fallback;
}

export function tailRootBenefactiveContext(root: TailRoot): BenefactiveContext | undefined {
  const op = tailRootBenefactiveOps(root)[0];
  if (op === undefined) {
    return undefined;
  }
  return {
    patternId: benefactivePatternIdForAspect(op.aspect),
    needsBenefactivePivot: op.benefactive.needsBenefactivePivot,
    agentParticleIdx: op.benefactive.agentParticleIdx,
    recipientParticleIdx: op.benefactive.recipientParticleIdx,
    honorificLevel: op.benefactive.honorific ? "respect" : "none",
    recipientSideHumble: op.benefactive.recipientSideHumble,
    causativeAgentPolicy: op.benefactive.causativeAgentPolicy
  };
}

export function benefactivePatternIdForAspect(aspect: BenefactiveAspectOp["aspect"]): BenefactiveAspectOp["aspect"] {
  switch (aspect) {
    case "te_morau":
      return "te_morau";
    case "te_ageru":
      return "te_ageru";
    case "te_kureru":
      return "te_kureru";
    case "te_kudasaru":
      return "te_kudasaru";
    case "te_itadaku":
      return "te_itadaku";
    case "te_moraeru":
      return "te_moraeru";
    case "te_itadakeru":
      return "te_itadakeru";
  }
}

function tailStemConjugationToken(stem: StemNode): RuntimeHaruToken | undefined {
  if (stem.kind === "noun") {
    return undefined;
  }
  return stem.source.tokens[stem.conjugationAnchor];
}

function tailStemIsSahenSuru(stem: StemNode, anchor: RuntimeHaruToken | undefined): boolean {
  if (anchor?.dictionaryForm !== "する") {
    return false;
  }
  if (stem.kind === "verb") {
    return stem.conj === "sahen";
  }
  if (stem.kind === "candidateSet") {
    return stem.candidates.some((candidate) => candidate.conj === "sahen");
  }
  return false;
}

function hasPrecedingVoiceDisambiguationParticle(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token === undefined) {
      continue;
    }
    if (pos0in(token.pos, PUNCTUATION_BITS)) {
      break;
    }
    if (caseParticleMarkerRelationForToken(token, cursor, {
      acceptedSurfaces: ["を", "が", "に"],
      consumers: ["tail_boundary_readiness"]
    }) !== null) {
      return true;
    }
  }
  return false;
}

function hasPrecedingAdverbialModifier(tokens: readonly RuntimeHaruToken[], index: number): boolean {
  const prevIdx = index - 1;
  const prev = tokens[prevIdx];
  const before = tokens[prevIdx - 1];
  return prev !== undefined &&
    before !== undefined &&
    copulaNiMarkerRelationForToken(prev, prevIdx, {
      consumers: ["tail_boundary_readiness"]
    }) !== null &&
    pos0in(before.pos, NOMINAL_KEIJOU_BITS | (1 << 形容詞0));
}
