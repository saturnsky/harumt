
import {
  type RuntimeHaruToken,
  splitBoundaryRuntimeStateForPieces,
  mergeRuntimeTokenSourceIdentity,
  rewriteRuntimeTokenSurface
} from "../../types/token.js";
import { SEPARATION_BREAKS_MORPHEME_CHAIN, separatedAs } from "../clause-layout/trivia.js";
import type { LookupTables } from "../lookup-tables.js";
import {
  POS0,
  POS5,
  POS5A,
  仮定形_一般,
  仮定形_融合,
  助動詞,
  助詞_接続助詞,
  動詞,
  未然形_一般,
  連用形_一般,
  命令形_,
  連用形_,
  is上一段,
  is下一段,
  動詞_非自立可能,
  isPoliteCopulaPos,
  isAssertiveCopulaFamilyPos,
  isTeFormFusionHostToken,
  isVoiceOrCausativeAuxiliaryToken,
  isVoicedTeFormHostToken,
  isNegativeAuxiliaryPos,
  isClassicalNegativeAuxiliaryToken
} from "../../types/pos.js";
import {
  collapsedAspectAuxContraction,
  collapsedPotentialAspectAuxContraction,
  isFusedNegativeStateChangeVerbToken,
  teConnectiveFusedAspectContraction,
  type CollapsedAspectAuxContraction
} from "../head-tail/tail/predicate-root/classifiers/tokens.js";
import { isTeAuxActivationAccepted } from "../head-tail/tail/predicate-root/postverb-auxiliary-parser.js";
import { teParticleToken, replacementTokenFrom } from "./synthetic-token.js";

export function expandCollapsedAspectAuxContraction(
  tokens: readonly RuntimeHaruToken[],
  lookups: LookupTables
): RuntimeHaruToken[] {
  let dirty = false;
  const result: RuntimeHaruToken[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    const contraction = collapsedAspectAuxContraction(token);
    const prev = result[result.length - 1];
    const connectiveFused = expandConnectiveFusedAspectAux(tokens, index, prev);
    if (connectiveFused !== null) {
      dirty = true;
      if (connectiveFused.host !== prev) {
        result[result.length - 1] = connectiveFused.host;
      }
      result.push(...connectiveFused.pieces);
      continue;
    }
    const host = prev === undefined ? null : collapsedAspectAuxTeFormHost(prev);
    const potential = collapsedPotentialAspectAuxRestoration(tokens, index, lookups);
    if (
      potential !== null && host !== null &&
      isVoicedTeFormHostToken(host) === potential.contraction.voiced &&
      potential.source.surface.startsWith(potential.contraction.fusedSurface) &&
      potential.source.reading.startsWith(potential.contraction.fusedReading)
    ) {
      dirty = true;
      if (host !== prev) {
        result[result.length - 1] = host;
      }
      result.push(...potentialAspectAuxPieces(potential));
      index += potential.consumed - 1;
      continue;
    }
    const imperative = (token.pos & POS5A) === 命令形_ && !hasStemSelectingAuxiliaryFollower(tokens, index + 1, lookups);
    const fusedConditional = (token.pos & POS5) === 仮定形_融合;
    if (
      contraction === null || (!imperative && !fusedConditional) ||
      host === null || isVoicedTeFormHostToken(host) !== contraction.voiced ||
      !token.surface.startsWith(contraction.fusedSurface) ||
      !token.reading.startsWith(contraction.fusedReading)
    ) {
      result.push(token);
      continue;
    }
    dirty = true;
    if (host !== prev) {
      result[result.length - 1] = host;
    }
    const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
    const reason = "collapsed_aspect_aux_contraction";
    result.push(withoutSubSplits(teParticleToken(contraction.voiced, head as RuntimeHaruToken, `${reason}:te`)));
    const auxPos = 動詞_非自立可能 | contraction.auxInflectionClass;
    if (imperative) {
      const source = { ...inner, ...tail } as RuntimeHaruToken;
      const stripped = rewriteRuntimeTokenSurface(source, { kind: "remove_prefix", prefix: contraction.fusedSurface });
      const restored = rewriteRuntimeTokenSurface(stripped, { kind: "prefix", prefix: contraction.auxOnsetSurface });
      const aux: RuntimeHaruToken = {
        ...restored,
        dictionaryForm: contraction.auxLemma,
        reading: `${contraction.auxOnsetReading}${token.reading.slice(contraction.fusedReading.length)}`,
        dictionaryFormReading: contraction.auxLemmaReading,
        pos: auxPos | (token.pos & POS5),
        dictionaryId: 0,
        syntheticReason: `${reason}:aux`
      };
      delete aux.normalizedForm;
      result.push(withoutSubSplits(aux));
      continue;
    }
    result.push(withoutSubSplits(replacementTokenFrom(inner as RuntimeHaruToken, {
      surface: contraction.auxHypotheticalSurface,
      dictionaryForm: contraction.auxLemma,
      reading: contraction.auxHypotheticalReading,
      dictionaryFormReading: contraction.auxLemmaReading,
      pos: auxPos | 仮定形_一般,
      syntheticReason: `${reason}:aux`
    })));
    result.push(withoutSubSplits(replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
      surface: "ば",
      dictionaryForm: "ば",
      reading: "バ",
      dictionaryFormReading: "バ",
      pos: 助詞_接続助詞,
      syntheticReason: `${reason}:ba`
    })));
  }
  return dirty ? result : [...tokens];
}

interface PotentialAspectAuxRestoration {
  readonly contraction: CollapsedAspectAuxContraction;
  readonly source: RuntimeHaruToken;
  readonly consumed: 1 | 2;
  readonly pos5: number;
}

function collapsedPotentialAspectAuxRestoration(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  lookups: LookupTables
): PotentialAspectAuxRestoration | null {
  const token = tokens[index]!;
  const derived = collapsedPotentialAspectAuxContraction(token);
  if (derived !== null) {
    if ((token.pos & POS5) !== 仮定形_融合 && !isTeAuxActivationAccepted(token, tokens[index + 1])) {
      return null;
    }
    return { contraction: derived, source: token, consumed: 1, pos5: token.pos & POS5 };
  }
  const base = collapsedAspectAuxContraction(token);
  const potential = base?.potential;
  if (
    base === null || potential === undefined ||
    (token.pos & POS5A) !== 命令形_ || !hasStemSelectingAuxiliaryFollower(tokens, index + 1, lookups)
  ) {
    return null;
  }
  const contraction: CollapsedAspectAuxContraction = {
    ...base,
    auxLemma: potential.auxLemma,
    auxLemmaReading: potential.auxLemmaReading,
    auxInflectionClass: potential.auxInflectionClass,
    auxHypotheticalSurface: potential.auxHypotheticalSurface,
    auxHypotheticalReading: potential.auxHypotheticalReading,
    derivation: "potential"
  };
  const next = tokens[index + 1]!;
  if ((next.pos & POS0) === 助動詞 && next.surface === "る" && next.reading === "ル") {
    const merged = mergeRuntimeTokenSourceIdentity(
      { ...token, surface: `${token.surface}${next.surface}`, reading: `${token.reading}${next.reading}` },
      [token, next]
    );
    return { contraction, source: merged, consumed: 2, pos5: next.pos & POS5 };
  }
  const selectsMizen = isNegativeAuxiliaryPos(next.pos) || isClassicalNegativeAuxiliaryToken(next) ||
    isFusedNegativeStateChangeVerbToken(next, lookups);
  return { contraction, source: token, consumed: 1, pos5: selectsMizen ? 未然形_一般 : 連用形_一般 };
}

function potentialAspectAuxPieces(restoration: PotentialAspectAuxRestoration): RuntimeHaruToken[] {
  const { contraction, source, pos5 } = restoration;
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(source);
  const reason = "collapsed_potential_aspect_aux_contraction";
  const te = withoutSubSplits(teParticleToken(contraction.voiced, head as RuntimeHaruToken, `${reason}:te`));
  const auxPos = 動詞_非自立可能 | contraction.auxInflectionClass;
  if (pos5 === 仮定形_融合) {
    return [
      te,
      withoutSubSplits(replacementTokenFrom(inner as RuntimeHaruToken, {
        surface: contraction.auxHypotheticalSurface,
        dictionaryForm: contraction.auxLemma,
        reading: contraction.auxHypotheticalReading,
        dictionaryFormReading: contraction.auxLemmaReading,
        pos: auxPos | 仮定形_一般,
        syntheticReason: `${reason}:aux`
      })),
      withoutSubSplits(replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
        surface: "ば",
        dictionaryForm: "ば",
        reading: "バ",
        dictionaryFormReading: "バ",
        pos: 助詞_接続助詞,
        syntheticReason: `${reason}:ba`
      }))
    ];
  }
  const stripped = rewriteRuntimeTokenSurface(
    { ...inner, ...tail } as RuntimeHaruToken,
    { kind: "remove_prefix", prefix: contraction.fusedSurface }
  );
  const restored = rewriteRuntimeTokenSurface(stripped, { kind: "prefix", prefix: contraction.auxOnsetSurface });
  const aux: RuntimeHaruToken = {
    ...restored,
    dictionaryForm: contraction.auxLemma,
    reading: `${contraction.auxOnsetReading}${source.reading.slice(contraction.fusedReading.length)}`,
    dictionaryFormReading: contraction.auxLemmaReading,
    pos: auxPos | pos5,
    dictionaryId: 0,
    syntheticReason: `${reason}:aux`
  };
  delete aux.normalizedForm;
  return [te, withoutSubSplits(aux)];
}

function expandConnectiveFusedAspectAux(
  tokens: readonly RuntimeHaruToken[],
  index: number,
  prev: RuntimeHaruToken | undefined
): { readonly host: RuntimeHaruToken; readonly pieces: readonly RuntimeHaruToken[] } | null {
  const token = tokens[index]!;
  const contraction = teConnectiveFusedAspectContraction(token, tokens[index + 1]);
  if (contraction === null || prev === undefined) {
    return null;
  }
  const host = collapsedAspectAuxTeFormHost(prev);
  if (
    host === null || isVoicedTeFormHostToken(host) !== contraction.voiced ||
    separatedAs(tokens, index, SEPARATION_BREAKS_MORPHEME_CHAIN) ||
    separatedAs(tokens, index + 1, SEPARATION_BREAKS_MORPHEME_CHAIN)
  ) {
    return null;
  }
  const { head, inner, tail } = splitBoundaryRuntimeStateForPieces(token);
  const aux = replacementTokenFrom({ ...inner, ...tail } as RuntimeHaruToken, {
    surface: contraction.auxOnsetSurface,
    dictionaryForm: contraction.auxLemma,
    reading: contraction.auxOnsetReading,
    dictionaryFormReading: contraction.auxLemmaReading,
    pos: 動詞_非自立可能 | contraction.auxInflectionClass | 連用形_一般,
    syntheticReason: "connective_fused_aspect_aux_contraction:aux"
  });
  return { host, pieces: [withoutSubSplits(head as RuntimeHaruToken), withoutSubSplits(aux)] };
}

function collapsedAspectAuxTeFormHost(token: RuntimeHaruToken): RuntimeHaruToken | null {
  if (isTeFormFusionHostToken(token)) {
    return token;
  }
  const form = token.pos & POS5A;
  if (form === 連用形_ && collapsedAspectAuxContraction(token)?.kind === "te_shimau") {
    return token;
  }
  const ichidanVerb = (token.pos & POS0) === 動詞 && (is上一段(token.pos) || is下一段(token.pos));
  if ((token.pos & POS5) === 未然形_一般 && (ichidanVerb || isVoiceOrCausativeAuxiliaryToken(token))) {
    return { ...token, pos: (token.pos & ~POS5) | 連用形_一般 };
  }
  return null;
}

function hasStemSelectingAuxiliaryFollower(
  tokens: readonly RuntimeHaruToken[],
  nextIndex: number,
  lookups: LookupTables
): boolean {
  const next = tokens[nextIndex];
  if (next === undefined || separatedAs(tokens, nextIndex, SEPARATION_BREAKS_MORPHEME_CHAIN)) {
    return false;
  }
  if ((next.pos & POS0) === 助動詞) {
    return !isAssertiveCopulaFamilyPos(next.pos) && !isPoliteCopulaPos(next.pos);
  }
  return isFusedNegativeStateChangeVerbToken(next, lookups);
}

function withoutSubSplits(token: RuntimeHaruToken): RuntimeHaruToken {
  if (token.splitA === undefined && token.splitB === undefined) {
    return token;
  }
  const { splitA: _splitA, splitB: _splitB, ...rest } = token;
  return rest as RuntimeHaruToken;
}
