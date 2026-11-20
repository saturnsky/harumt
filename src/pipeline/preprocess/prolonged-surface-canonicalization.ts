
import { toKatakana } from "../../utils/char-class.js";
import {
  type LongVowelReductionMetadata,
  type RuntimeHaruToken,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import type { LookupTables } from "../lookup-tables.js";
import { COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA } from "../head-tail/tail/te-tail-continuation-table.js";
import {
  POS0,
  POS01,
  isDependentWordToken,
  isParticleSubtypeToken,
  particleSubtypeBit,
  POS4,
  POS5,
  形状詞_助動詞語幹,
  助動詞,
  助動詞_ダ,
  連用形_ニ,
  isAttributiveInflection,
  isAttributiveOrHomophonousTerminalInflection
} from "../../types/pos.js";
import { isPreprocessClauseTerminalBoundary, NO_WHITESPACE_BOUNDARY_EVIDENCE } from "./follower-context.js";
import { replacementTokenFrom } from "./synthetic-token.js";

const PROLONGED_SOUND_MARK = "ー";

function stripTrailingProlongation(text: string): string {
  let end = text.length;
  while (end > 0 && text[end - 1] === PROLONGED_SOUND_MARK) {
    end -= 1;
  }
  return end === 0 ? text : text.slice(0, end);
}

function reductionRemovedOnlyProlongationMarks(
  surface: string,
  reduction: LongVowelReductionMetadata
): boolean {
  return surface.length - reduction.reducedSurface.length === reduction.removedCount &&
    surface.split(PROLONGED_SOUND_MARK).join("") ===
      reduction.reducedSurface.split(PROLONGED_SOUND_MARK).join("");
}

const PROLONGED_PARTICLE_SUBTYPE_ROW = "lookup_tables prolonged_particle_canonicalization.particle_subtypes";

const PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS: ReadonlyMap<string, string> = new Map([
  ["終助詞", "src/pipeline/semantics/sfp-surface.ts — SFP 표면 자체가 서법 증거라(詠嘆 `なー` ↔ 금지 `な`) 연장을 지우면 증거가 사라진다"],
  ["準体助詞", "src/pipeline/pronominal-no-dispatch.ts — 準体 `の` 의 지시·명사화 판정 owner"]
]);

const BENEFACTIVE_TEE_RETAG_ROW = "benefactive_tee_te_retag";

function prolongedParticleSubtypeBits(lookups: LookupTables): ReadonlySet<number> {
  const bits = new Set<number>();
  for (const name of lookups.PROLONGED_PARTICLE_CANONICAL_SUBTYPES) {
    const reservedOwner = PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS.get(name);
    if (reservedOwner !== undefined) {
      throw new Error(
        `reserved particle subtype '${name}' in ${PROLONGED_PARTICLE_SUBTYPE_ROW}: 선재 owner 소유다 (${reservedOwner})`
      );
    }
    const pos1 = particleSubtypeBit(name);
    if (pos1 === undefined) {
      throw new Error(`invalid particle subtype '${name}' in ${PROLONGED_PARTICLE_SUBTYPE_ROW}`);
    }
    bits.add(pos1);
  }
  return bits;
}

function prolongedParticleReservedSubtypeBits(): ReadonlySet<number> {
  const bits = new Set<number>();
  for (const name of PROLONGED_PARTICLE_RESERVED_SUBTYPE_OWNERS.keys()) {
    const pos1 = particleSubtypeBit(name);
    if (pos1 === undefined) {
      throw new Error(`unknown reserved particle subtype '${name}' in prolonged canonicalization owner map`);
    }
    bits.add(pos1);
  }
  return bits;
}


export function canonicalizeProlongedParticles(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  const subtypeBits = prolongedParticleSubtypeBits(lookups);
  const reservedBits = prolongedParticleReservedSubtypeBits();
  const lexicalReadingLemmas =
    lookups.optionalSet(BENEFACTIVE_TEE_RETAG_ROW, "desire_lemmas");
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const canonical = analyzerReducedCanonicalToken(token, reservedBits) ??
      prosodicTailCanonicalToken(token, tokens, index, subtypeBits, lexicalReadingLemmas);
    if (canonical === undefined) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(mergeRuntimeTokenSourceIdentity(canonical, [token]));
  }
  return dirty ? result : [...tokens];
}

function analyzerReducedCanonicalToken(
  token: RuntimeHaruToken,
  reservedBits: ReadonlySet<number>
): RuntimeHaruToken | undefined {
  const reduction = token.longVowelReduction;
  if (reduction === undefined || reduction.reducedSurface === token.surface) {
    return undefined;
  }
  if (!reductionRemovedOnlyProlongationMarks(token.surface, reduction) ||
    !isDependentWordToken(token)) {
    return undefined;
  }
  if (isParticleSubtypeToken(token, reservedBits)) {
    return undefined;
  }
  return {
    ...rewriteRuntimeTokenSurface(token, { kind: "replace", surface: reduction.reducedSurface }),
    syntheticReason: "prolonged_particle_canonicalization"
  };
}

function prosodicTailCanonicalToken(
  token: RuntimeHaruToken,
  tokens: readonly RuntimeHaruToken[],
  index: number,
  subtypeBits: ReadonlySet<number>,
  lexicalReadingLemmas: ReadonlySet<string> | undefined
): RuntimeHaruToken | undefined {
  const surface = stripTrailingProlongation(token.surface);
  if (surface === token.surface || !isParticleSubtypeToken(token, subtypeBits)) {
    return undefined;
  }
  const admitQuoteMarker =
    lexicalReadingLemmas !== undefined && !lexicalReadingLemmas.has(token.dictionaryForm);
  if (!isPreprocessClauseTerminalBoundary(tokens, index + 1, {
    admittedSeparations: NO_WHITESPACE_BOUNDARY_EVIDENCE,
    admitQuoteMarker
  })) {
    return undefined;
  }
  return replacementTokenFrom(token, {
    surface,
    dictionaryForm: stripTrailingProlongation(token.dictionaryForm),
    reading: stripTrailingProlongation(token.reading),
    dictionaryFormReading: stripTrailingProlongation(token.dictionaryFormReading),
    pos: token.pos,
    syntheticReason: "prolonged_particle_canonicalization"
  });
}

export function restoreProlongedCollapsedAspectVariant(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result = tokens.map((token) => {
    const canonical = token.normalizedForm;
    if ((token.pos & POS0) !== 助動詞 || token.longVowelReduction !== undefined ||
      canonical === undefined || canonical === token.dictionaryForm ||
      !COLLAPSED_ASPECT_AUX_CONTRACTION_BY_LEMMA.has(canonical) ||
      !token.surface.startsWith(canonical)) {
      return token;
    }
    const prolongation = token.surface.slice(canonical.length);
    if (prolongation.length === 0 || ![...prolongation].every((char) => PROLONGATION_CHARS.has(char))) {
      return token;
    }
    dirty = true;
    return {
      ...token,
      dictionaryForm: canonical,
      dictionaryFormReading: toKatakana(canonical),
      longVowelReduction: { removedCount: prolongation.length, reducedSurface: canonical },
      syntheticReason: "prolonged_collapsed_aspect_variant"
    };
  });
  return dirty ? result : [...tokens];
}

const PROLONGATION_CHARS: ReadonlySet<string> = new Set([PROLONGED_SOUND_MARK, "ぁ", "ぃ", "ぅ", "ぇ", "ぉ", "ァ", "ィ", "ゥ", "ェ", "ォ"]);

export function restoreProlongedYouComparison(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const prev = result[result.length - 1];
    const next = tokens[index + 1];
    if (
      (token.pos & POS01) !== 形状詞_助動詞語幹 || token.surface !== "よー" ||
      prev === undefined || !isAttributiveOrHomophonousTerminalInflection(prev.pos) ||
      next === undefined || (next.pos & (POS0 | POS4)) !== (助動詞 | 助動詞_ダ) ||
      !((next.surface === "な" && isAttributiveInflection(next.pos)) ||
        (next.surface === "に" && (next.pos & POS5) === 連用形_ニ))
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push(replacementTokenFrom(token, {
      surface: "よう",
      dictionaryForm: "よう",
      reading: "ヨウ",
      dictionaryFormReading: "ヨウ",
      pos: token.pos,
      syntheticReason: "prolonged_you_comparison_restore"
    }));
  }
  return dirty ? result : [...tokens];
}
