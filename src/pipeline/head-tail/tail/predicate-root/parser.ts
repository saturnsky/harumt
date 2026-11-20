
import type { RuntimeHaruToken } from "../../../../types/token.js";
import { isColloquialNaiNeeSurface } from "../../../semantics/sfp-surface.js";
import { TokenCursor } from "../../../token-cursor.js";
import type { LookupTables } from "../../../lookup-tables.js";
import { conditionalQuoteEllipsisClassForSurface } from "./connective-render-table.js";
import { sourceVerbalPredicateAfterAuxOp } from "./operator-head.js";
import { isHonorificNasaruImperativeToken, teTailImperativeFormEntryForToken } from "../postverb-tail-classifier.js";
import { assertNever, type AuxOpNode, type ClassicalAuxResidueOp, type ConjectureOp, type DesireOp, type NegationOp, type NegationFocusParticle, type OpSource, type PoliteOp, type RashiiModalOp, type ConnectiveKind, type ConnectiveOp, type StemNode, type TenseOp } from "./grammar.js";
import { lookupConnectiveBySurface } from "./connective-surface-lookup.js";
import { postverbAuxiliarySourceTokenClassMatches, postverbAuxiliaryPayloadsForForm } from "./postverb-auxiliary-parser.js";
import { policyAllowsShortNegation, shortNegationPolicyForCommittedStem } from "./short-negation-policy.js";
import { srcList, srcSingle, srcSlice } from "./source.js";
import { focusedNegationShapeAt, isClassicalZuIzenkeiToken, isNaiOrNuToken, isKansaiHonorificHaruAfterVerbHost, isTagaruTailAuxToken } from "./classifiers/tokens.js";
import { negationOpAdmitsShortForm, stemHasSourceVerbalPredicateEvidence, stemSupportsProjectionCategory } from "./inspect.js";

import { POS0, POS01, POS1, POS4, POS5, POS5A, is上一段, is下一段, カ行変格, サ行変格, 意志推量形_, 仮定形_, 仮定形_一般, 仮定形_融合, 已然形_, isPastAuxConditionalForm, isRenyouInflection, isVolitionalInflection, 形容詞0, 語幹_, 語幹_サ, 終止形_, 終止形_撥音便, 助詞_終助詞, 助動詞_ジャ, 助動詞_タ, 助動詞_ダ, 助動詞_タイ, 助動詞_デス, 助動詞_ナイ, 助動詞_ヌ, 助動詞_マス, 助動詞_ヤ, 助動詞_ラシイ, 助動詞_レル, 助動詞語幹, isAdjectivalDerivationalSuffix, 動詞, 非自立可能, 文語助動詞_キ, 文語助動詞_ケリ, 文語助動詞_ズ, 文語助動詞_タリ_断定, 文語助動詞_ナリ_断定, 文語助動詞_ヌ, 文語助動詞_リ, 未然形_, 命令形_, 連体形_, 連体形_撥音便, 連用形_, 連用形_促音便, 助詞_接続助詞 } from "../../../../types/pos.js";
import { isSeruCausativeAuxToken, isShimeruCausativeAuxToken } from "./classifiers/causative-aux.js";
import { buildVoiceOp, buildPostverbAuxiliaryOp, createClassicalAuxResidueOp, createConjectureOp, createConnectiveOp, createDesireOp, createModalOp, createNegationOp, createPoliteOp, createTenseOp } from "./op-builders.js";
import type { ParseOutcome } from "./parse-tail.js";
import { connectiveFlavorFields } from "./connective-ops.js";
import { opLastSourceToken } from "./parse-stem.js";


type AuxClass =
  | "negation"
  | "tense_past"
  | "polite"
  | "classical_aux_residue"
  | "conjecture"
  | "conjecture_polite"
  | "rashii"
  | "desire"
  | "voice_passive"
  | "voice_causative"
  | "voice_honorific"
  | "connective";

export interface AuxClassResult {
  readonly classifications: readonly AuxClass[];
  readonly reason?: string;
}

const OUT_OF_SUBSET = (reason: string): AuxClassResult => ({ classifications: [], reason });
const POLITE_OK: AuxClassResult = { classifications: ["polite"] };
const CLASSICAL_AUX_RESIDUE_OK: AuxClassResult = { classifications: ["classical_aux_residue"] };
export const NEGATION_OK: AuxClassResult = { classifications: ["negation"] };
const TENSE_PAST_OK: AuxClassResult = { classifications: ["tense_past"] };
const FUSED_POLITE_NEGATION: AuxClassResult = { classifications: ["polite", "negation"] };
const FUSED_NEGATION_CONJECTURE: AuxClassResult = { classifications: ["negation", "conjecture"] };
const FUSED_PAST_CONJECTURE: AuxClassResult = { classifications: ["tense_past", "conjecture"] };
const CONJECTURE_OK: AuxClassResult = { classifications: ["conjecture"] };
const CONJECTURE_POLITE_OK: AuxClassResult = { classifications: ["conjecture_polite"] };
const RASHII_OK: AuxClassResult = { classifications: ["rashii"] };
const DESIRE_OK: AuxClassResult = { classifications: ["desire"] };
const VOICE_PASSIVE_OK: AuxClassResult = { classifications: ["voice_passive"] };
const FUSED_VOICE_NEGATION: AuxClassResult = { classifications: ["voice_passive", "negation"] };
const VOICE_CAUSATIVE_OK: AuxClassResult = { classifications: ["voice_causative"] };
const VOICE_HONORIFIC_OK: AuxClassResult = { classifications: ["voice_honorific"] };
const CONNECTIVE_OK: AuxClassResult = { classifications: ["connective"] };

interface VariantSpec {
  readonly when: (token: RuntimeHaruToken, next: RuntimeHaruToken | undefined) => boolean;
  readonly result: AuxClassResult;
}

interface AuxKindEntry {
  readonly when: (token: RuntimeHaruToken) => boolean;
  readonly variants: readonly VariantSpec[];
  readonly default: AuxClassResult;
}

const pos5Includes = (form: number) => (t: RuntimeHaruToken) => (t.pos & POS5A) === form;

const AUX_DISPATCH: readonly AuxKindEntry[] = [
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 助動詞_ナイ || p4 === 助動詞_ヌ;
    },
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_一般, result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_融合, result: NEGATION_OK },
      {
        when: (t, next) =>
          (t.pos & POS5A) === 語幹_ && next !== undefined && isSoudaAuxiliaryStemToken(next),
        result: NEGATION_OK
      },
      { when: pos5Includes(意志推量形_), result: FUSED_NEGATION_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("助動詞-ナイ/ヌ 仮定形-促音便 / 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 文語助動詞_ズ,
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      {
        when: (t, next) =>
          isClassicalZuIzenkeiToken(t) &&
          next !== undefined &&
          (next.pos & POS01) === 助詞_接続助詞 &&
          next.surface === "ば",
        result: NEGATION_OK
      }
    ],
    default: OUT_OF_SUBSET("文語助動詞-ズ 未然形/仮定形/고립 命令形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 文語助動詞_キ || p4 === 文語助動詞_ケリ || p4 === 文語助動詞_ヌ;
    },
    variants: [
      {
        when: (t, next) =>
          (t.pos & POS4) === 文語助動詞_ヌ &&
          (t.pos & POS5A) === 連用形_ &&
          next !== undefined &&
          ((next.pos & POS4) === 文語助動詞_ケリ || (next.pos & POS4) === 文語助動詞_キ),
        result: CLASSICAL_AUX_RESIDUE_OK
      },
      { when: pos5Includes(終止形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連体形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連用形_), result: TENSE_PAST_OK },
      { when: pos5Includes(已然形_), result: TENSE_PAST_OK }
    ],
    default: OUT_OF_SUBSET("文語助動詞-キ/ケリ/ヌ 未然形/命令形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 文語助動詞_ナリ_断定 || p4 === 文語助動詞_リ || p4 === 文語助動詞_タリ_断定;
    },
    variants: [
      { when: pos5Includes(終止形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(連体形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(連用形_), result: CLASSICAL_AUX_RESIDUE_OK },
      { when: pos5Includes(已然形_), result: CLASSICAL_AUX_RESIDUE_OK }
    ],
    default: OUT_OF_SUBSET("文語助動詞-ナリ/リ 未然形/命令形 등 — 미구현")
  },
  {
    when: (t) =>
      (t.pos & POS01) === (形容詞0 | 非自立可能) &&
      (t.dictionaryForm === "ない" || t.dictionaryForm === "無い" || isColloquialNaiNeeSurface(t.surface)),
    variants: [
      { when: pos5Includes(終止形_), result: NEGATION_OK },
      { when: pos5Includes(連体形_), result: NEGATION_OK },
      { when: pos5Includes(連用形_), result: NEGATION_OK },
      { when: (t) => (t.pos & POS5) === 仮定形_一般, result: NEGATION_OK },
      {
        when: (t, next) =>
          (t.pos & POS5) === 語幹_サ && next !== undefined && isSoudaAuxiliaryStemToken(next),
        result: NEGATION_OK
      },
      { when: pos5Includes(意志推量形_), result: FUSED_NEGATION_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("adjectival ない/無い 仮定形 등 — Phase 3+")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_タ,
    variants: [
      { when: pos5Includes(終止形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連体形_), result: TENSE_PAST_OK },
      { when: pos5Includes(連用形_), result: TENSE_PAST_OK },
      { when: pos5Includes(仮定形_), result: CONNECTIVE_OK },
      { when: pos5Includes(意志推量形_), result: FUSED_PAST_CONJECTURE }
    ],
    default: OUT_OF_SUBSET("助動詞-タ 意志推量形·仮定形 외 — Phase 3+")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_マス,
    variants: [
      { when: pos5Includes(終止形_), result: POLITE_OK },
      { when: pos5Includes(連体形_), result: POLITE_OK },
      { when: pos5Includes(連用形_), result: POLITE_OK },
      { when: pos5Includes(意志推量形_), result: POLITE_OK },
      {
        when: (t) => pos5Includes(未然形_)(t) && t.surface.endsWith("ん"),
        result: FUSED_POLITE_NEGATION
      },
      {
        when: (t, next) =>
          pos5Includes(未然形_)(t) &&
          next !== undefined &&
          (next.pos & POS4) === 助動詞_ヌ,
        result: POLITE_OK
      },
      { when: pos5Includes(命令形_), result: POLITE_OK },
      { when: pos5Includes(未然形_), result: POLITE_OK },
      {
        when: (t, next) =>
          pos5Includes(仮定形_)(t) &&
          next !== undefined &&
          (next.pos & POS01) === 助詞_接続助詞 &&
          next.surface === "ば",
        result: POLITE_OK
      }
    ],
    default: OUT_OF_SUBSET("助動詞-マス 고립 仮定形 등 — 미구현")
  },
  {
    when: (t) => {
      const p4 = t.pos & POS4;
      return p4 === 助動詞_デス || p4 === 助動詞_ダ || p4 === 助動詞_ジャ || p4 === 助動詞_ヤ;
    },
    variants: [
      {
        when: (t) =>
          ((t.pos & POS4) === 助動詞_ダ || (t.pos & POS4) === 助動詞_ヤ) &&
          (t.pos & POS5A) === 意志推量形_,
        result: CONJECTURE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 意志推量形_),
        result: CONJECTURE_POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 終止形_),
        result: POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_デス | 連用形_),
        result: POLITE_OK
      },
      {
        when: (t) =>
          (t.pos & (POS4 | POS5A)) === (助動詞_ダ | 仮定形_),
        result: CONNECTIVE_OK
      }
    ],
    default: OUT_OF_SUBSET("copula 계열 (助動詞-デス/-ダ/-ジャ/-ヤ) 의 미구현 활용형")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_ラシイ,
    variants: [
      { when: pos5Includes(終止形_), result: RASHII_OK },
      { when: pos5Includes(連体形_), result: RASHII_OK },
      { when: pos5Includes(連用形_), result: RASHII_OK },
      { when: pos5Includes(仮定形_), result: RASHII_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-ラシイ 命令形 등 — 미구현")
  },
  {
    when: (t) =>
      isAdjectivalDerivationalSuffix(t) &&
      t.dictionaryForm === "らしい",
    variants: [
      { when: pos5Includes(終止形_), result: RASHII_OK },
      { when: pos5Includes(連体形_), result: RASHII_OK },
      { when: pos5Includes(連用形_), result: RASHII_OK },
      { when: pos5Includes(仮定形_), result: RASHII_OK }
    ],
    default: OUT_OF_SUBSET("接尾辞-形容詞的 らしい 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_タイ,
    variants: [
      { when: pos5Includes(終止形_), result: DESIRE_OK },
      { when: pos5Includes(連体形_), result: DESIRE_OK },
      { when: pos5Includes(連用形_), result: DESIRE_OK },
      { when: pos5Includes(仮定形_), result: DESIRE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-タイ 命令形 등 — 미구현")
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_レル,
    variants: [
      { when: (t) => (t.pos & POS5) === 終止形_撥音便, result: FUSED_VOICE_NEGATION },
      { when: pos5Includes(終止形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(連体形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(連用形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(意志推量形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(未然形_), result: VOICE_PASSIVE_OK },
      { when: pos5Includes(仮定形_), result: VOICE_PASSIVE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞-レル 命令形 등 — 미구현")
  },
  {
    when: (t) => isSeruCausativeAuxToken(t) || isShimeruCausativeAuxToken(t),
    variants: [
      { when: pos5Includes(終止形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(連体形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(連用形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(意志推量形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(未然形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(仮定形_), result: VOICE_CAUSATIVE_OK },
      { when: pos5Includes(命令形_), result: VOICE_CAUSATIVE_OK }
    ],
    default: OUT_OF_SUBSET("助動詞 下一段-サ行 (せる/させる) 미구현 활용형")
  },
  {
    when: (t) =>
      (t.pos & POS01) === 助詞_接続助詞 &&
      lookupConnectiveBySurface(t.surface) !== undefined,
    variants: [],
    default: CONNECTIVE_OK
  },
  {
    when: (t) => (t.pos & POS4) === 助動詞_ダ && pos5Includes(仮定形_)(t),
    variants: [],
    default: CONNECTIVE_OK
  }
];

export function classifyAux(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined
): AuxClassResult {
  for (const entry of AUX_DISPATCH) {
    if (entry.when(token)) {
      for (const variant of entry.variants) {
        if (variant.when(token, next)) {
          return variant.result;
        }
      }
      return entry.default;
    }
  }
  return OUT_OF_SUBSET(`unrecognized aux: pos=${JSON.stringify(token.pos)}`);
}

export function classifySingleAuxTokenOps(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined,
  pos: number
): readonly AuxOpNode[] {
  const classified = classifyAux(token, next).classifications.map((cls) => buildOpFromClassification(cls, token, pos));
  if (classified.length > 0) {
    return classified;
  }
  const auxiliary = postverbAuxiliaryPayloadsForForm(token.dictionaryForm).find((payload) =>
    payload.sourceTokenClass === "auxiliary_verb" && postverbAuxiliarySourceTokenClassMatches(payload, token)
  );
  return auxiliary === undefined ? [] : [buildPostverbAuxiliaryOp(srcSingle(token, pos), auxiliary)];
}

function isUnclaimedCausativePassiveVolitionalTail(
  token: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  return (token.pos & POS4) === 助動詞_レル &&
    (token.pos & POS5A) === 意志推量形_ &&
    ops.some((op) => op.kind === "voice" && op.voice === "causative");
}

function isHonorificNasaiAfterImperativeFormAspect(
  token: RuntimeHaruToken,
  ops: readonly AuxOpNode[]
): boolean {
  const last = ops.at(-1);
  if (last?.kind !== "aspect" || last.terminalMood !== "imperative") {
    return false;
  }
  const carrier = last.source.tokens.at(-1);
  return carrier !== undefined &&
    teTailImperativeFormEntryForToken(carrier) !== undefined &&
    isHonorificNasaruImperativeToken(token);
}

export function classifyTailAux(
  token: RuntimeHaruToken,
  next: RuntimeHaruToken | undefined,
  stemNode: StemNode,
  precedingToken: RuntimeHaruToken | undefined,
  ops: readonly AuxOpNode[]
): AuxClassResult {
  if (
    isTagaruTailAuxToken(token) &&
    precedingToken !== undefined &&
    isRenyouInflection(precedingToken.pos) &&
    ops.reduce(sourceVerbalPredicateAfterAuxOp, stemHasSourceVerbalPredicateEvidence(stemNode))
  ) {
    return DESIRE_OK;
  }
  if (!adjacentNegationClosesBeforeColloquialNe(ops) && isColloquialNaiTailAux(token, precedingToken, stemNode)) {
    return NEGATION_OK;
  }
  if (isUnclaimedCausativePassiveVolitionalTail(token, ops)) {
    return OUT_OF_SUBSET("사역수동 意志推量形 — 미claim (사전 흡수 방향 역전 회피)");
  }
  if (isHonorificNasaiAfterImperativeFormAspect(token, ops)) {
    return POLITE_OK;
  }
  if (isKansaiHonorificHaruAfterVerbHost(token, precedingToken)) {
    return VOICE_HONORIFIC_OK;
  }
  const result = classifyAux(token, next);
  if (result.classifications.length > 0 || stemNode.commitment !== "suppletive_negation") {
    return result;
  }
  if (isSuppletivePoliteNegativePoliteCarrier(token)) {
    return POLITE_OK;
  }
  return result;
}

export function adjacentNegationClosesBeforeColloquialNe(ops: readonly AuxOpNode[]): boolean {
  const adjacent = ops.at(-1);
  if (adjacent === undefined) return false;
  if (adjacent.kind !== "negation") return false;
  const form = (adjacent.source.tokens.at(-1)?.pos ?? 0) & POS5A;
  return form === 終止形_;
}

function isColloquialNaiTailAux(
  token: RuntimeHaruToken,
  precedingToken: RuntimeHaruToken | undefined,
  stemNode: StemNode
): boolean {
  if (
    !isColloquialNaiNeeSurface(token.surface) ||
    (token.pos & POS01) !== 助詞_終助詞 ||
    precedingToken === undefined ||
    !isColloquialNaiConnectionForm(precedingToken)
  ) {
    return false;
  }
  return stemSupportsProjectionCategory(stemNode, "verbal_predicate");
}

export function isColloquialNaiConnectionForm(host: RuntimeHaruToken): boolean {
  const form = host.pos & POS5A;
  if (form === 未然形_) {
    return true;
  }
  if ((host.pos & (POS0 | POS1 | POS5)) === (動詞 | 非自立可能 | 連体形_撥音便)) {
    return true;
  }
  if (form !== 連用形_) {
    return false;
  }
  if ((host.pos & POS4) === 助動詞_タイ || (host.pos & POS4) === 助動詞_ナイ) {
    return true;
  }
  const conj = host.pos & POS4;
  return is上一段(host.pos) || is下一段(host.pos) ||
    ((host.pos & POS0) === 動詞 && (conj === サ行変格 || conj === カ行変格));
}

function isSuppletivePoliteNegativePoliteCarrier(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS4 | POS5A)) === (助動詞_マス | 未然形_);
}

export function isNegationToken(
  token: RuntimeHaruToken,
  next?: RuntimeHaruToken | undefined
): boolean {
  if (!isNaiOrNuToken(token)) {
    return false;
  }
  const result = classifyAux(token, next);
  return result.classifications.length === 1 && result.classifications[0] === "negation";
}

export function mergeNegationOps(
  previous: NegationOp,
  support: NegationOp
): NegationOp {
  return {
    ...previous,
    source: srcList(
      [...previous.source.tokens, ...support.source.tokens],
      [...previous.source.tokenIndices, ...support.source.tokenIndices]
    ),
    chainDepth: previous.chainDepth + support.chainDepth,
    chainPast: previous.chainPast || support.chainPast,
    stemAux: [...previous.stemAux, ...support.stemAux],
    preferShortNegation: false
  };
}

export function matchFocusedNegation(
  cursor: TokenCursor<RuntimeHaruToken>
): readonly AuxOpNode[] | null {
  const { tokens } = cursor;
  const pos = cursor.pos;
  const shape = focusedNegationShapeAt(tokens, pos);
  if (shape === null) {
    return null;
  }
  const markerSpan = 1 + shape.supportConsumed;
  const politeOps: AuxOpNode[] = [];
  for (let i = 0; i < shape.politeConsumed; i += 1) {
    const politeIdx = pos + markerSpan + i;
    const politeToken = tokens[politeIdx];
    if (politeToken === undefined) {
      return null;
    }
    politeOps.push(buildOpFromClassification("polite", politeToken, politeIdx));
  }
  const negationStart = pos + markerSpan + shape.politeConsumed;
  const negationToken = tokens[negationStart];
  if (negationToken === undefined || !isNegationToken(negationToken, tokens[negationStart + 1])) {
    return null;
  }
  cursor.advance(markerSpan + shape.politeConsumed);
  const negation = collectNegationChain(cursor);
  if (negation.chainDepth === 0) {
    return null;
  }
  return [
    ...politeOps,
    buildFocusedNegationOp(negation, srcSlice(tokens, pos, markerSpan), shape.focusParticle)
  ];
}

export function buildFocusedNegationOp(
  negation: NegationOp,
  markerSource: OpSource,
  focusParticle: NegationFocusParticle
): NegationOp {
  return {
    ...negation,
    source: srcList(
      [...markerSource.tokens, ...negation.source.tokens],
      [...markerSource.tokenIndices, ...negation.source.tokenIndices]
    ),
    focusParticle
  };
}

export function isSoudaAuxiliaryStemToken(token: RuntimeHaruToken): boolean {
  if (token.surface !== "そう") {
    return false;
  }
  if ((token.pos & POS1) === 助動詞語幹) {
    return true;
  }
  return false;
}

export function validateNegationChainStart(
  input: {
    readonly pos: number;
    readonly start: number;
    readonly stemTok: RuntimeHaruToken;
    readonly token: RuntimeHaruToken;
    readonly previousOp: AuxOpNode | undefined;
  }
): ParseOutcome | null {
  const { pos, start, stemTok, token, previousOp } = input;
  if (pos === start + 1) {
    const stemPos5A = stemTok.pos & POS5A;
    const isStemTerminal = stemPos5A === 終止形_ || stemPos5A === 連体形_;
    if (isStemTerminal) {
      return {
        ok: false,
        reason: `position ${pos} (surface=${token.surface}): chain 시작 비정상 — stem '${stemTok.surface}' (활용형 ${stemPos5A}) + 부정 토큰 의 비표준 합성. 정상 chain stem = 連用/未然.`,
        position: pos
      };
    }
  }

  if (previousOp?.kind === "copula" && previousOp.polarity === "negative") {
    const anchor = opLastSourceToken(previousOp);
    const anchorPos5A = (anchor?.pos ?? 0) & POS5A;
    if (anchorPos5A !== 連用形_) {
      return {
        ok: false,
        reason: `position ${pos} (surface=${token.surface}): N+Copula negative chain 시작 비정상 — 직전 copula 부정 token '${anchor?.surface ?? "<none>"}' (활용형 ${anchorPos5A}) 뒤 부정 토큰. 정상 chain anchor = 連用形 (例: ではなくない).`,
        position: pos
      };
    }
  }

  return null;
}

export function applyNegationInabilityPolicy(
  ops: readonly AuxOpNode[],
  stem: StemNode,
  lookups: LookupTables
): readonly AuxOpNode[] {
  const negIdx = ops.findIndex((op) => op.kind !== "polite");
  const first = negIdx < 0 ? undefined : ops[negIdx];
  if (first?.kind !== "negation" || first.inability === true) {
    return ops;
  }
  const verbs = lookups.NEGATION_INABILITY_VERBS;
  const lexical = [...stem.semanticAnchors, stem.conjugationAnchor].some((anchorIdx) => {
    const token = stem.source.tokens[anchorIdx];
    return token !== undefined && verbs.has(token.dictionaryForm);
  });
  if (!lexical) {
    return ops;
  }
  const result = [...ops];
  result[negIdx] = { ...first, inability: true, preferShortNegation: false };
  return result;
}

export function applyShortTailPolicy(
  ops: readonly AuxOpNode[],
  stemKind: "verb" | "adj",
  stem: StemNode,
  lookups: LookupTables
): readonly AuxOpNode[] {
  if (stemKind !== "verb") {
    return ops;
  }
  if (stemPrefersLongNegation(stem, lookups) || !stemHasKnownShortNegationPolicy(stem)) {
    return ops;
  }
  const negIdx = ops.findIndex((op) => op.kind === "negation");
  if (negIdx === -1) {
    return ops;
  }
  const neg = ops[negIdx];
  if (neg === undefined || neg.kind !== "negation") {
    return ops;
  }
  if (neg.chainDepth !== 1 || !negationOpAdmitsShortForm(neg)) {
    return ops;
  }
  const allShortTail = ops.every(
    (op) => op.kind === "negation" || op.kind === "tense" || op.kind === "polite"
  );
  if (!allShortTail) {
    return ops;
  }
  const updated: NegationOp = { ...neg, preferShortNegation: true };
  const result = [...ops];
  result[negIdx] = updated;
  return result;
}

function stemPrefersLongNegation(stem: StemNode, lookups: LookupTables): boolean {
  if (stem.kind === "verb") {
    return lookups.LONG_NEGATION_PREFERRED_KOREAN_LEMMAS.has(stem.lemma);
  }
  return false;
}

function stemHasKnownShortNegationPolicy(stem: StemNode): boolean {
  if (stem.kind === "verb") {
    return policyAllowsShortNegation(shortNegationPolicyForCommittedStem(stem.lemma, stem.shortNegationPolicy));
  }
  if (stem.kind === "candidateSet") {
    return false;
  }
  return false;
}

export function buildOpFromClassification(
  cls: AuxClass,
  token: RuntimeHaruToken,
  pos: number,
  previousOps: readonly AuxOpNode[] = []
): AuxOpNode {
  switch (cls) {
    case "negation": {
      return buildNegationOp(srcSingle(token, pos), 1, false);
    }
    case "tense_past": {
      return buildTenseOp(srcSingle(token, pos));
    }
    case "polite": {
      return buildPoliteOp(srcSingle(token, pos));
    }
    case "classical_aux_residue": {
      return buildClassicalAuxResidueOp(
        srcSingle(token, pos),
        classicalAuxResidueKindForToken(token)
      );
    }
    case "conjecture": {
      return buildConjectureOp(srcSingle(token, pos), false);
    }
    case "conjecture_polite": {
      return buildConjectureOp(srcSingle(token, pos), true);
    }
    case "rashii": {
      return buildRashiiModalOp(srcSingle(token, pos));
    }
    case "desire": {
      return buildDesireOp(srcSingle(token, pos));
    }
    case "voice_passive": {
      return buildVoiceOp(srcSingle(token, pos), "passive", [
        "passive",
        "potential",
        "honorific"
      ]);
    }
    case "voice_causative": {
      return buildVoiceOp(srcSingle(token, pos), "causative");
    }
    case "voice_honorific": {
      return buildVoiceOp(srcSingle(token, pos), "honorific");
    }
    case "connective": {
      return buildClassifiedConnectiveOp(token, pos, previousOps);
    }
    default:
      return assertNever(cls);
  }
}

export function buildTenseOp(source: OpSource): TenseOp {
  return createTenseOp({  source, tense: "past" });
}

export function buildPoliteOp(source: OpSource): PoliteOp {
  return createPoliteOp({  source });
}

export function buildClassicalAuxResidueOp(
  source: OpSource,
  residue: ClassicalAuxResidueOp["residue"]
): ClassicalAuxResidueOp {
  return createClassicalAuxResidueOp({  residue, source });
}

export function buildConjectureOp(source: OpSource, polite: boolean): ConjectureOp {
  return createConjectureOp({  source, polite });
}

export function buildDesireOp(source: OpSource): DesireOp {
  return createDesireOp({ source, ...(isTagaruTailAuxToken(source.tokens.at(-1)) ? { form: "tagaru" as const } : {}) });
}

export function buildRashiiModalOp(source: OpSource): RashiiModalOp {
  return createModalOp({

    modal: "rashii",
    source,
    reading: "likeness",
    candidates: ["likeness"],
    polite: false,
    past: false
  });
}

export function buildClassifiedConnectiveOp(
  token: RuntimeHaruToken,
  pos: number,
  previousOps: readonly AuxOpNode[] = [],
  source: OpSource = srcSingle(token, pos)
): ConnectiveOp {
  const surface = token.surface;
  const kind = inferConnectiveKind(token, surface);
  const conditionalQuoteEllipsis = conditionalQuoteEllipsisClassForSurface(surface);
  return createConnectiveOp({

    connective: kind,
    surface,
    ...connectiveFlavorFields(token, previousOps),
    ...(conditionalQuoteEllipsis === undefined
      ? {}
      : { conditionalQuoteEllipsis }),
    source
  });
}

function classicalAuxResidueKindForToken(token: RuntimeHaruToken): ClassicalAuxResidueOp["residue"] {
  const pos4 = token.pos & POS4;
  if (pos4 === 文語助動詞_リ) {
    return "resultative_ri";
  }
  if (pos4 === 文語助動詞_ヌ) {
    return "perfective_nu";
  }
  return "assertive_nari";
}

function inferConnectiveKind(token: RuntimeHaruToken, surface: string): ConnectiveKind {
  if (isPastAuxConditionalForm(token.pos)) {
    return "conditional";
  }
  const kind = lookupConnectiveBySurface(surface);
  if (kind !== undefined) return kind;
  return "adversative";
}

function canAttachPastToNegationChainFinal(
  negationToken: RuntimeHaruToken,
  pastToken: RuntimeHaruToken | undefined
): pastToken is RuntimeHaruToken {
  if ((negationToken.pos & POS5) !== 連用形_促音便) return false;
  if (pastToken === undefined) return false;
  if ((pastToken.pos & POS4) !== 助動詞_タ) return false;
  const pastInflection5A = pastToken.pos & POS5A;
  return pastInflection5A === 終止形_ || pastInflection5A === 連体形_;
}

export function collectNegationChain(
  cursor: TokenCursor<RuntimeHaruToken>,
  admitPairedVolitionalFinal = false
): NegationOp {
  const { tokens, pos: start, end: n } = cursor;
  let depth = 0;
  let pos = start;
  let chainPast = false;
  const sourceTokens: RuntimeHaruToken[] = [];
  const sourceIndices: number[] = [];

  while (pos < n) {
    const token = tokens[pos];
    if (token === undefined) {
      break;
    }
    const pairedVolitionalFinal =
      admitPairedVolitionalFinal &&
      pos === start &&
      isNaiOrNuToken(token) &&
      isVolitionalInflection(token.pos);
    if (!isNegationToken(token, tokens[pos + 1]) && !pairedVolitionalFinal) {
      break;
    }
    const pos5A = token.pos & POS5A;

    depth += 1;
    sourceTokens.push(token);
    sourceIndices.push(pos);
    pos += 1;
    const pastToken = tokens[pos];
    if (canAttachPastToNegationChainFinal(token, pastToken)) {
      sourceTokens.push(pastToken);
      sourceIndices.push(pos);
      pos += 1;
      chainPast = true;
      break;
    }
    if (pos5A === 連用形_) {
      continue;
    }
    break;
  }

  const op = buildNegationOp(srcList(sourceTokens, sourceIndices), depth, chainPast);
  cursor.advance(pos - start);
  return op;
}

export function buildNegationOp(
  source: OpSource,
  chainDepth: number,
  chainPast: boolean,
  preferShortNegation = false
): NegationOp {
  return createNegationOp({

    source,
    chainDepth,
    chainPast,
    stemAux: [],
    preferShortNegation
  });
}
