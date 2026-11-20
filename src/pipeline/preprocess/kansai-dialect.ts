
import { lazyValue } from "../../data-loader.js";
import {
  type RuntimeHaruToken,
  inheritedSourceIdentity,
  morphSurface,
  splitBoundaryRuntimeStateForPieces,
  mergeRuntimeTokenSourceIdentity,
  splitTrailingBoundaryRuntimeState
} from "../../types/token.js";
import { DETACHED_SEPARATIONS, separatedAs } from "../clause-layout/trivia.js";
import { isSugiruAuxiliaryToken } from "../compounds/compound-tail-tokens.js";
import {
  POS0,
  POS01,
  POS1,
  POS4,
  pos0in,
  POS5,
  POS5A,
  仮定形_融合,
  感動詞,
  形容詞0,
  助詞_格助詞,
  助動詞,
  助動詞_タ,
  助動詞_ダ,
  助動詞_ナイ,
  助動詞_ヌ,
  助動詞_ヘン,
  助動詞_ヤ,
  助動詞_レル,
  文語サ行変格,
  終止形_一般,
  終止形_撥音便,
  語幹_,
  連体形_撥音便,
  助詞_副助詞,
  助詞_接続助詞,
  動詞,
  副詞,
  接続詞,
  接尾辞,
  未然形_,
  未然形_一般,
  終止形_,
  連体形_一般,
  連用形_促音便,
  名詞,
  名詞的,
  名詞_普通名詞,
  連用形_,
  上一段_カ行,
  上一段_ハ行,
  五段_カ行,
  助詞_終助詞,
  助詞_準体助詞,
  補助記号_句点,
  接尾辞_名詞的,
  isNuAttachmentHostToken,
  INFLECTABLE_AUX_BITS,
  連体詞,
  isAttributiveInflection,
  isAttributiveOrHomophonousTerminalInflection,
  isPronounToken
} from "../../types/pos.js";
import { loadConnectiveSurfaceEntries } from "../head-tail/tail/predicate-root/connective-surface-table.js";
import { isCausativeAuxLemma } from "./causative-aux-lemma.js";
import { hasAttributiveFollower } from "./follower-context.js";
import { replacementTokenFrom } from "./synthetic-token.js";

export function retagKansaiAssertiveDe(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevPos0 = (prev?.pos ?? 0) & POS0;
    const prevIsYogenTerminal = prev !== undefined &&
      (pos0in(prevPos0, INFLECTABLE_AUX_BITS)) &&
      (prev.pos & POS5A) === 終止形_;
    const prevIsNegative = prev !== undefined && (
      (prev.pos & POS4) === 助動詞_ナイ || (prev.pos & POS4) === 助動詞_ヌ ||
      (prevPos0 === 形容詞0 && (prev.dictionaryForm === "ない" || prev.dictionaryForm === "無い"))
    );
    const isAssertiveDeForm = token.surface === "で" && (
      (token.pos & (POS0 | POS4 | POS5A)) === (助動詞 | 助動詞_ダ | 連用形_) ||
      (token.pos & POS01) === 助詞_終助詞 ||
      ((token.pos & POS01) === 助詞_接続助詞 && !prevIsNegative)
    );
    const next = tokens[i + 1];
    const isSentenceFinal = next === undefined || (next.pos & POS01) === 補助記号_句点;
    if (!isAssertiveDeForm || !prevIsYogenTerminal || !isSentenceFinal) {
      result.push(token);
      continue;
    }
    dirty = true;
    result.push({
      surface: "よ",
      dictionaryForm: "よ",
      reading: "ヨ",
      dictionaryFormReading: "ヨ",
      pos: 助詞_終助詞,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "kansai_assertive_de"
    });
  }
  return dirty ? result : [...tokens];
}

function isKyotoHinNegativePastTail(
  token: RuntimeHaruToken | undefined,
  next: RuntimeHaruToken | undefined
): boolean {
  return token !== undefined &&
    (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
    (token.pos & POS5) === 連用形_促音便 &&
    token.surface.startsWith("ん") &&
    next !== undefined &&
    (next.pos & POS4) === 助動詞_タ;
}

export function retagKyotoNegativeHin(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const isMistaggedHin = (token.pos & (POS0 | POS4)) === (動詞 | 上一段_ハ行) && token.dictionaryForm === "ひる" && prev !== undefined && (prev.pos & POS0) === 動詞 && (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (!isMistaggedHin) {
      result.push(token);
      continue;
    }
    dirty = true;
    const pastTail = isKyotoHinNegativePastTail(tokens[i + 1], tokens[i + 2])
      ? tokens[i + 1]!
      : null;
    if (pastTail !== null) {
      i += 1;
    }
    const retagged: RuntimeHaruToken = {
      ...token,
      dictionaryForm: "へん",
      dictionaryFormReading: "ヘン",
      pos: 助動詞 | 助動詞_ヘン | 終止形_一般,
      syntheticReason: "kyoto_hin_negation"
    };
    result.push(
      pastTail !== null && token.sourceSpan != null && pastTail.sourceSpan != null
        ? mergeRuntimeTokenSourceIdentity(retagged, [token, pastTail])
        : retagged
    );
  }
  return dirty ? result : [...tokens];
}

export function expandKansaiNegativeHen(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const isHen = token.dictionaryForm === "へん" && (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヘン);
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const hasVerbHost = prev !== undefined && (prev.pos & POS0) === 動詞 &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    const hasVoiceAuxHost = prev !== undefined && (prev.pos & POS0) === 助動詞 &&
      ((prev.pos & POS4) === 助動詞_レル || isCausativeAuxLemma(prev)) &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (!isHen || !(hasVerbHost || hasVoiceAuxHost)) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (prevPos5A !== 未然形_) {
      result[result.length - 1] = { ...prev, pos: (prev.pos & ~POS5) | 未然形_一般 };
    }
    const next = tokens[i + 1];
    const isPast = next !== undefined &&
      (next.pos & POS4) === 助動詞_タ && next.dictionaryForm === "た";
    const naiPos5 = isPast ? 連用形_促音便 : hasAttributiveFollower(next) ? 連体形_一般 : 終止形_一般;
    result.push({
      surface: isPast ? "なかっ" : "ない",
      dictionaryForm: "ない",
      reading: isPast ? "ナカッ" : "ナイ",
      dictionaryFormReading: "ナイ",
      pos: 助動詞 | 助動詞_ナイ | naiPos5,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "kansai_hen_negation"
    });
  }
  return dirty ? result : [...tokens];
}

export async function expandKansaiExplanatoryNen(
  tokens: readonly RuntimeHaruToken[],
  isRestorableIAdjective: (candidate: RuntimeHaruToken) => Promise<boolean>
): Promise<RuntimeHaruToken[]> {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  let expandedAt: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const prev = result[result.length - 1];
    if (expandedAt === i - 1 && !separatedAs(tokens, i, DETACHED_SEPARATIONS)) {
      const restored = (token.pos & POS0) === 接続詞 && isAdversativeConnectiveToken(token)
        ? [{ ...token, pos: 助詞_接続助詞, dictionaryId: 0 }]
        : predicateHostFollowerParticle(token)?.filter((piece) => (piece.pos & POS01) !== 助詞_終助詞) ?? null;
      if (restored !== null && restored.length === 1) {
        result.push({ ...restored[0]!, syntheticReason: "kansai_explanatory_nen_follower" });
        continue;
      }
    }
    if (
      (token.pos & POS01) !== 助詞_終助詞 || morphSurface(token) !== "ねん" ||
      prev === undefined || !isExplanatoryNenHostToken(result, result.length - 1) ||
      ((prev.pos & POS0) === 形容詞0 && !await isRestorableIAdjective(prev))
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    expandedAt = i;
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
    const pieces = [
      { ...head, surface: "の", dictionaryForm: "の", reading: "ノ", dictionaryFormReading: "ノ", pos: 助詞_準体助詞 },
      { ...inner, ...tail, surface: "や", dictionaryForm: "や", reading: "ヤ", dictionaryFormReading: "ヤ", pos: 助動詞 | 助動詞_ヤ | 終止形_一般 }
    ];
    pieces.forEach((piece, offset) => {
      const synthetic: Record<string, unknown> = { ...piece, dictionaryId: 0, syntheticReason: "kansai_explanatory_nen" };
      delete synthetic.normalizedForm;
      delete synthetic.longVowelReduction;
      const span = token.sourceCharSpan;
      if (span != null && span.end - span.start === 2) {
        synthetic.sourceCharSpan = { start: span.start + offset, end: span.start + offset + 1 };
      } else {
        delete synthetic.sourceCharSpan;
      }
      result.push(synthetic as unknown as RuntimeHaruToken);
    });
  }
  return dirty ? result : [...tokens];
}

function isExplanatoryNenHostToken(result: readonly RuntimeHaruToken[], hostIndex: number): boolean {
  const host = result[hostIndex]!;
  const pos0 = host.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 形容詞0 && pos0 !== 助動詞) {
    return false;
  }
  if (!isAttributiveOrHomophonousTerminalInflection(host.pos)) {
    return false;
  }
  if (pos0 !== 助動詞) {
    return true;
  }
  const beforeHost = result[hostIndex - 1];
  return beforeHost !== undefined && pos0in(beforeHost.pos & POS0, INFLECTABLE_AUX_BITS);
}

export function resplitMisparsedDekiHen(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    const isDekiHen = (token.pos & POS0) === 接続詞 && token.dictionaryForm === "で" &&
      next !== undefined && (next.pos & POS0) === 名詞 && next.dictionaryForm === "きへん";
    if (!isDekiHen) {
      result.push(token);
      continue;
    }
    dirty = true;
    i += 1;
    result.push({
      surface: "でき",
      dictionaryForm: "できる",
      reading: "デキ",
      dictionaryFormReading: "デキル",
      pos: 動詞 | 上一段_カ行 | 連用形_,
      dictionaryId: 0,
      ...inheritedSourceIdentity(token),
      syntheticReason: "deki_hen_resplit"
    });
    result.push({
      surface: "へん",
      dictionaryForm: "へん",
      reading: "ヘン",
      dictionaryFormReading: "ヘン",
      pos: 助動詞 | 助動詞_ヘン | 終止形_一般,
      dictionaryId: 0,
      ...inheritedSourceIdentity(next),
      syntheticReason: "deki_hen_resplit"
    });
  }
  return dirty ? result : [...tokens];
}

export function retagMistaggedHenNounNegation(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (const token of tokens) {
    const prev = result[result.length - 1];
    const prevPos5A = (prev?.pos ?? 0) & POS5A;
    const isMistaggedHen = (token.pos & POS0) === 名詞 && token.dictionaryForm === "へん" &&
      prev !== undefined && (prev.pos & POS0) === 動詞 &&
      (prevPos5A === 連用形_ || prevPos5A === 未然形_);
    if (isMistaggedHen) {
      dirty = true;
      result.push({ ...token, pos: 助動詞 | 助動詞_ヘン | 終止形_一般, syntheticReason: "mistagged_hen_noun_retag" });
      continue;
    }
    const prevIsHen = prev !== undefined && (prev.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヘン);
    if (prevIsHen && (token.pos & POS01) === 接尾辞_名詞的) {
      dirty = true;
      result.push({ ...token, pos: 名詞 | 名詞_普通名詞, syntheticReason: "mistagged_hen_suffix_retag" });
      continue;
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}

export function restoreMisparsedFusedConditionalAkan(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const host = result[result.length - 1];
    if (host === undefined || !isNuAttachmentHostToken(host)) {
      result.push(token);
      continue;
    }
    const next = tokens[index + 1];
    const afterNext = tokens[index + 2];
    const isNegativeStemNa = token.surface === "な" &&
      (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ナイ) &&
      (token.pos & POS5A) === 語幹_;
    const isSfpNaa = token.surface === "なあ" && (token.pos & (POS0 | POS1)) === 助詞_終助詞;
    let fragments: readonly RuntimeHaruToken[] | null = null;
    if (isSfpNaa && next?.surface === "かん") {
      fragments = [token, next];
    } else if (
      isNegativeStemNa &&
      next?.surface === "あ" && (next.pos & POS0) === 感動詞 &&
      afterNext?.surface === "かん"
    ) {
      fragments = [token, next, afterNext];
    }
    if (fragments === null) {
      if (isNegativeStemNa && next !== undefined && (next.pos & POS0) === 動詞 && !isSugiruAuxiliaryToken(next)) {
        dirty = true;
        normalizeNuAttachmentHostToMizen(result);
        result.push(fusedConditionalNaToken(token));
        continue;
      }
      result.push(token);
      continue;
    }
    dirty = true;
    normalizeNuAttachmentHostToMizen(result);
    const follower = tokens[index + fragments.length];
    result.push(...fusedConditionalAkanPieces(fragments, follower));
    index += fragments.length - 1;
    const retaggedFollower = follower === undefined ? null : predicateHostFollowerParticle(follower);
    if (retaggedFollower !== null) {
      result.push(...retaggedFollower);
      index += 1;
    }
  }
  return dirty ? result : [...tokens];
}

function predicateHostFollowerParticle(follower: RuntimeHaruToken): readonly RuntimeHaruToken[] | null {
  if (follower.surface === "やん" && (follower.pos & POS01) === (接尾辞 | 名詞的)) {
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(follower);
    const pieces = [
      { ...head, surface: "や", dictionaryForm: "や", reading: "ヤ", dictionaryFormReading: "ヤ", pos: 助動詞 | 助動詞_ヤ | 終止形_一般 },
      { ...inner, ...tail, surface: "ん", dictionaryForm: "ん", reading: "ン", dictionaryFormReading: "ン", pos: 助詞_終助詞 }
    ];
    return pieces.map((piece, offset) => {
      const token: Record<string, unknown> = { ...piece, dictionaryId: 0, syntheticReason: FUSED_CONDITIONAL_AKAN_REASON };
      delete token.normalizedForm;
      const span = follower.sourceCharSpan;
      if (span != null && span.end - span.start === 2) {
        token.sourceCharSpan = { start: span.start + offset, end: span.start + offset + 1 };
      } else {
        delete token.sourceCharSpan;
      }
      return token as unknown as RuntimeHaruToken;
    });
  }
  const pos01 = follower.pos & POS01;
  let retaggedPos: number | null = null;
  if (pos01 === 助詞_格助詞) {
    if (follower.surface === "の") retaggedPos = 助詞_準体助詞;
    else if (follower.surface === "で" || follower.surface === "から") retaggedPos = 助詞_接続助詞;
  } else if (pos01 === 助詞_副助詞 && follower.surface === "し") {
    retaggedPos = 助詞_接続助詞;
  }
  if (retaggedPos === null) return null;
  return [{ ...follower, pos: retaggedPos, dictionaryId: 0, syntheticReason: FUSED_CONDITIONAL_AKAN_REASON }];
}

function normalizeNuAttachmentHostToMizen(result: RuntimeHaruToken[]): void {
  const host = result[result.length - 1]!;
  if ((host.pos & POS5A) !== 未然形_) {
    result[result.length - 1] = { ...host, pos: (host.pos & ~POS5) | 未然形_一般 };
  }
}

const FUSED_CONDITIONAL_AKAN_REASON = "fused_conditional_akan_resplit";

function fusedConditionalNaToken(token: RuntimeHaruToken): RuntimeHaruToken {
  const retagged: Record<string, unknown> = {
    ...token,
    dictionaryForm: "ぬ",
    dictionaryFormReading: "ヌ",
    pos: 助動詞 | 助動詞_ヌ | 仮定形_融合,
    dictionaryId: 0,
    syntheticReason: FUSED_CONDITIONAL_AKAN_REASON
  };
  delete retagged.normalizedForm;
  return retagged as unknown as RuntimeHaruToken;
}

function fusedConditionalAkanPieces(
  fragments: readonly RuntimeHaruToken[],
  follower: RuntimeHaruToken | undefined
): RuntimeHaruToken[] {
  const first = fragments[0]!;
  const merged = fragments.length > 1 && fragments.every((fragment) => fragment.sourceSpan != null)
    ? mergeRuntimeTokenSourceIdentity(first, fragments as [RuntimeHaruToken, ...RuntimeHaruToken[]])
    : first;
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(merged);
  const charSpan = merged.sourceCharSpan;
  const pieceSpecs = [
    {
      state: head,
      surface: "な", dictionaryForm: "ぬ", reading: "ナ", dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | 仮定形_融合
    },
    {
      state: inner,
      surface: "あか", dictionaryForm: "あく", reading: "アカ", dictionaryFormReading: "アク",
      pos: 動詞 | 五段_カ行 | 未然形_一般
    },
    {
      state: { ...inner, ...tail },
      surface: "ん", dictionaryForm: "ぬ", reading: "ン", dictionaryFormReading: "ヌ",
      pos: 助動詞 | 助動詞_ヌ | (hasAttributiveFollower(follower) ? 連体形_撥音便 : 終止形_撥音便)
    }
  ] as const;
  const charAligned = charSpan != null && charSpan.end - charSpan.start === "なあかん".length;
  let offset = 0;
  return pieceSpecs.map(({ state, ...fields }) => {
    const piece: Record<string, unknown> = {
      ...state,
      ...fields,
      dictionaryId: 0,
      syntheticReason: FUSED_CONDITIONAL_AKAN_REASON
    };
    for (const field of ["normalizedForm", "longVowelReduction", "splitA", "splitB"]) {
      delete piece[field];
    }
    if (charAligned) {
      piece.sourceCharSpan = { start: charSpan.start + offset, end: charSpan.start + offset + fields.surface.length };
    } else {
      delete piece.sourceCharSpan;
    }
    offset += fields.surface.length;
    return piece as unknown as RuntimeHaruToken;
  });
}

function isDialectYaCopula(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ヤ);
}

function dialectYaCopulaAsDa(token: RuntimeHaruToken): RuntimeHaruToken | undefined {
  if (!token.surface.startsWith("や") || !token.reading.startsWith("ヤ")) {
    return undefined;
  }
  return replacementTokenFrom(token, {
    surface: `だ${token.surface.slice(1)}`,
    dictionaryForm: "だ",
    reading: `ダ${token.reading.slice(1)}`,
    dictionaryFormReading: "ダ",
    pos: 助動詞 | 助動詞_ダ | (token.pos & POS5),
    syntheticReason: "dialect_deictic_copula:da"
  });
}

function deicticSouAdverbToken(source: RuntimeHaruToken): RuntimeHaruToken {
  return replacementTokenFrom(source, {
    surface: "そう",
    dictionaryForm: "そう",
    reading: "ソウ",
    dictionaryFormReading: "ソウ",
    pos: 副詞,
    syntheticReason: "dialect_deictic_copula:sou"
  });
}

function deicticSonnaAdnominalToken(
  pronoun: RuntimeHaruToken,
  attributive: RuntimeHaruToken
): RuntimeHaruToken {
  return mergeRuntimeTokenSourceIdentity(
    replacementTokenFrom(pronoun, {
      surface: "そんな",
      dictionaryForm: "そんな",
      reading: "ソンナ",
      dictionaryFormReading: "ソンナ",
      pos: 連体詞,
      syntheticReason: "dialect_deictic_copula:sonna"
    }),
    [pronoun, attributive]
  );
}

function isHonDeicticFragment(token: RuntimeHaruToken): boolean {
  return isPronounToken(token) && token.surface === "ほん" && token.dictionaryForm === "ほん";
}

function isAttributiveDaCopula(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) &&
    token.dictionaryForm === "だ" && isAttributiveInflection(token.pos);
}

function isSeDeicticFragment(token: RuntimeHaruToken): boolean {
  return (token.pos & (POS0 | POS4)) === (動詞 | 文語サ行変格) &&
    token.surface === "せ" && token.dictionaryForm === "す";
}

function isSoDeicticFragment(token: RuntimeHaruToken): boolean {
  return (token.pos & POS0) === 副詞 && token.surface === "そ" && token.dictionaryForm === "そ";
}

const ADVERSATIVE_CONNECTIVE_SURFACES: ReadonlySet<string> = lazyValue(() => new Set(
  loadConnectiveSurfaceEntries({
    isSupportedKind: (value: string): value is string => typeof value === "string" && value.length > 0
  })
    .filter((entry) => entry.kind === "adversative")
    .flatMap((entry) => entry.surfaces)
));

function isAdversativeConnectiveToken(token: RuntimeHaruToken): boolean {
  const pos01 = token.pos & POS01;
  if (pos01 !== 助詞_接続助詞 && (token.pos & POS0) !== 接続詞) {
    return false;
  }
  return ADVERSATIVE_CONNECTIVE_SURFACES.has(token.surface);
}

export function expandDialectDeicticCopula(tokens: readonly RuntimeHaruToken[]): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    const next = tokens[i + 1];
    if (
      (isSeDeicticFragment(token) || isSoDeicticFragment(token)) &&
      next !== undefined && isDialectYaCopula(next)
    ) {
      const copula = dialectYaCopulaAsDa(next);
      if (copula !== undefined) {
        dirty = true;
        result.push(deicticSouAdverbToken(splitTrailingBoundaryRuntimeState(token).leading));
        result.push(copula);
        i += 1;
        continue;
      }
    }
    const afterNext = tokens[i + 2];
    if (
      isHonDeicticFragment(token) &&
      next !== undefined && isAttributiveDaCopula(next) &&
      hasAttributiveFollower(afterNext)
    ) {
      dirty = true;
      result.push(deicticSonnaAdnominalToken(token, next));
      i += 1;
      continue;
    }
    if (
      (token.pos & POS0) === 名詞 && token.surface === "ほや" &&
      next !== undefined && isAdversativeConnectiveToken(next)
    ) {
      dirty = true;
      const { leading, trailing } = splitTrailingBoundaryRuntimeState(token);
      result.push(deicticSouAdverbToken(leading));
      result.push({
        surface: "だ",
        dictionaryForm: "だ",
        reading: "ダ",
        dictionaryFormReading: "ダ",
        pos: 助動詞 | 助動詞_ダ | 終止形_一般,
        dictionaryId: 0,
        ...inheritedSourceIdentity(token),
        ...trailing,
        syntheticReason: "dialect_deictic_copula:da"
      });
      continue;
    }
    result.push(token);
  }
  return dirty ? result : [...tokens];
}
