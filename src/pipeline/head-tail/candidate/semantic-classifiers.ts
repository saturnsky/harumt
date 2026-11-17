
import { parseJapaneseNumber } from "../../../generator/numerals.js";
import type { Clause, ClauseLayout, ProtoClauseLayout } from "../../clause-layout/index.js";
import type { ClausePhraseScope } from "../../clause-layout/phrase-enumeration.js";
import { activeProtoScopedScanEnd } from "../../clause-layout/proto-state.js";
import { previousNonSpaceIndex } from "../../clause-layout/trivia.js";
import { quotedJudgmentHeadBeforeMarker } from "../../clause-layout/quoted-judgment.js";
import { lookupSetMatches, type LookupTables } from "../../lookup-tables.js";
import type { MatcherToken } from "../../matchers.js";
import { isGaNoConvertedSubjectParticle } from "../../semantics/gano-conversion.js";
import { matchQuotedJudgmentPassiveTail } from "../../semantics/modality-specs.js";
import { matchQuotedSareruTailAsClauseQuote } from "../../quote/reporting-passive.js";
import { TokenCursor } from "../../token-cursor.js";
import {
  conditionalToConnectiveRelationAt,
  kaMarkerRelationAt,
  nominalLinkMarkerRelationAt
} from "../boundary/marker.js";
import { quoteMarkerRelationAt } from "../boundary/quote-marker.js";
import { isTeConnectiveToken } from "../tail/postverb-tail-classifier.js";


import {
  INFLECTABLE_AUX_BITS,
  NOMINAL_BITS,
  isSahenCapableNominal,
  isSahenVerbalizableNominal,
  POS0,
  POS01,
  pos0in,
  POS1,
  POS2,
  POS4,
  POS5,
  POS5A,
  PUNCTUATION_BITS,
  仮定形_,
  格助詞,
  形容詞0,
  固有名詞,
  終止形_一般,
  終助詞,
  準体助詞,
  助詞,
  助数詞,
  助数詞可能,
  助動詞,
  助動詞_ナイ,
  助動詞_ヌ,
  人名,
  数詞,
  接続助詞,
  接尾辞,
  接尾辞_名詞的,
  代名詞,
  地名,
  動詞,
  副詞,
  副助詞,
  補助記号,
  名詞,
  名詞_数詞,
  連体形_一般,
  連体詞,
  連用形_,
  連用形_一般,
  形状詞,
  isAdverbCapableNominal, 助詞_格助詞, 名詞_普通名詞,
} from "../../../types/pos.js";
import { IU_LEXEME_FORMS } from "../data/quoted-reporting-sets.js";
export interface SemanticClauseSpan {
  readonly start: number;
  readonly end: number;
}

export function isPredicateArgumentParticle(token: MatcherToken): boolean {
  if ((token.pos & POS0) !== 助詞) {
    return false;
  }
  if ((token.pos & POS1) === 格助詞) {
    return true;
  }
  return token.surface === "まで" && (token.pos & POS1) === 副助詞;
}

export type PredicateArgumentOrigin =
  | "owned_particle"
  | "topic_focus"
  | "borrowed_event"
  | "relative_head";

export type PredicateArgumentRole =
  | "subject"
  | "object"
  | "topic_theme"
  | "oblique"
  | "adjunct"
  | "prefixed_focus"
  | "unknown";

export class PredicateArgument {
  constructor(
    readonly particleIdx: number,
    readonly particle: MatcherToken,
    readonly referent: MatcherToken | null,
    readonly noun: MatcherToken | null,
    readonly borrowed = false,
    readonly origin: PredicateArgumentOrigin = borrowed ? "borrowed_event" : "owned_particle",
    readonly role: PredicateArgumentRole = "unknown"
  ) { }
}

export class PredicateArgumentView {
  readonly layout: ClauseLayout | null;
  readonly protoLayout: ProtoClauseLayout | null;
  readonly connectiveRoles: ReadonlyMap<number, string> | null;
  private readonly lookups: LookupTables;

  constructor(
    readonly tokens: readonly MatcherToken[],
    readonly predicatePos: number,
    options: {
      readonly lookups: LookupTables;
      readonly layout?: ClauseLayout | null;
      readonly protoLayout?: ProtoClauseLayout | null;
      readonly connectiveRoles?: ReadonlyMap<number, string> | null;
    }
  ) {
    this.lookups = options.lookups;
    this.layout = options.layout ?? null;
    this.protoLayout = options.protoLayout ?? null;
    this.connectiveRoles = options.connectiveRoles ?? null;
  }

  arguments(options: { readonly includeBorrowed?: boolean } = {}): readonly PredicateArgument[] {
    const own = this.ownArguments();
    if (options.includeBorrowed !== true || this.layout === null) {
      return own;
    }
    return [
      ...own,
      ...collectBorrowedArguments(this.tokens, this.layout, this.predicatePos, own, { connectiveRoles: this.connectiveRoles }, this.lookups)
    ];
  }

  subjectArguments(options: {
    readonly includeBorrowed?: boolean;
    readonly resolveOwnUnknownTopicAsSubject?: (argument: PredicateArgument, args: readonly PredicateArgument[]) => boolean;
  } = {}): readonly PredicateArgument[] {
    const args = this.arguments(options);
    const subjects = args.filter((argument) =>
      (argument.role === "subject" ||
        (argument.origin === "topic_focus" && argument.role === "unknown" && options.resolveOwnUnknownTopicAsSubject?.(argument, args))) &&
      (this.layout === null || !this.layout.isQuoteSealedPredicate(argument.particleIdx, this.predicatePos))
    ).map((argument) => argument.role === "subject" ? argument : { ...argument, role: "subject" as const });
    const owned = subjects.filter((subject) => !subject.borrowed);
    return owned.length > 0 ? owned : subjects;
  }

  hasUnresolvedConnectiveObjectBorrow(ownArguments: readonly PredicateArgument[]): boolean {
    const clauseIdx = this.layout?.clauseIndexOfPredicate(this.predicatePos);
    if (clauseIdx === undefined) return false;
    const [clause, previous] = [this.layout!.clauses[clauseIdx], this.layout!.clauses[clauseIdx - 1]];
    const hasObject = (sourceClause: Clause, sources: readonly number[]) => collectBorrowsFromPredicates(this.tokens, this.layout!, this.predicatePos, sourceClause, sources, ownArguments, this.lookups).some((argument) => argument.role === "object");
    if (clause !== undefined && hasObject(clause, clause.predicates.filter((predicate) => predicate < this.predicatePos && isSameClauseRenyouSource(this.tokens, predicate) && this.connectiveRoles?.has(predicate) !== true))) return true;
    for (let sourceClause = previous; sourceClause !== undefined && isBorrowableChuushiConnectiveClause(this.tokens, this.layout!, sourceClause) && this.connectiveRoles?.has(sourceClause.predicates.at(-1)!) !== true; sourceClause = this.layout!.clauses[this.layout!.clauses.indexOf(sourceClause) - 1]) if (hasObject(sourceClause, sourceClause.predicates.filter((predicate) => isSameClauseRenyouSource(this.tokens, predicate)))) return true;
    return false;
  }

  private ownArguments(): readonly PredicateArgument[] {
    if (this.layout !== null) {
      const clause = this.layout.clauseOfPredicate(this.predicatePos);
      if (clause === undefined) {
        return [];
      }
      const compoundHeadIdx = this.layout.compoundHeadOfPredicate(this.predicatePos);
      const compoundHeadParticleIndices = compoundHeadIdx === undefined
        ? []
        : clause.particlesOf(compoundHeadIdx)
          .filter((idx) =>
            idx < compoundHeadIdx &&
            COMPOUND_SHARED_CORE_PARTICLES.has(this.tokens[idx]?.surface ?? "") &&
            !this.layout!.isQuoteTrappedArgument(idx, compoundHeadIdx));
      const ownedParticleIndices = [...new Set([
        ...compoundHeadParticleIndices,
        ...clause.particlesOf(this.predicatePos)
          .filter((idx) => idx < this.predicatePos && !this.layout!.isQuoteTrappedArgument(idx, this.predicatePos))
      ])].sort((left, right) => left - right);
      const topicParticleIndices = topicFocusArgumentsForPredicate(this.tokens, this.predicatePos, {
        layout: this.layout,
        excludedParticleIndices: ownedParticleIndices
      });
      const topicIndices = new Set(topicParticleIndices);
      return [...ownedParticleIndices, ...topicParticleIndices].map((idx) => {
        const noun = getArgumentNounBeforeParticle(this.tokens, idx, this.lookups);
        const isTopic = topicIndices.has(idx) || TOPIC_FOCUS_ARGUMENT_PARTICLES.has(this.tokens[idx]?.surface ?? "");
        return new PredicateArgument(
          idx,
          this.tokens[idx]!,
          getReferentTokenBeforeParticle(this.tokens, idx, this.lookups),
          noun,
          false,
          isTopic ? "topic_focus" : "owned_particle",
          isTopic
            ? topicFocusArgumentRole(idx, this.predicatePos, this.layout!)
            : ownedParticleArgumentRole(
              this.tokens[idx]?.surface ?? "",
              () => isGaNoConvertedSubjectParticle(this.tokens, idx, this.predicatePos, {
                clause,
                lookups: this.lookups
              })
            )
        );
      });
    }
    if (this.protoLayout !== null) {
      const protoClause = this.protoLayout.clauseContaining(this.predicatePos);
      if (protoClause === undefined) {
        return [];
      }
      return protoClause.particleIndices
        .filter((idx) => idx < this.predicatePos && !this.protoLayout!.isQuoteTrapped(idx, this.predicatePos))
        .map((idx) => new PredicateArgument(
          idx, this.tokens[idx]!, getReferentTokenBeforeParticle(this.tokens, idx, this.lookups),
          getArgumentNounBeforeParticle(this.tokens, idx, this.lookups), false, "owned_particle",
          ownedParticleArgumentRole(this.tokens[idx]?.surface ?? "", () => false)
        ));
    }
    throw new Error("PredicateArgumentView requires either `layout` or `protoLayout`");
  }

  hasArgumentNounSurface(particleSurface: string, expected: string | readonly string[], options: { readonly includeBorrowed?: boolean } = {}): boolean {
    const expectedSet = typeof expected === "string" ? new Set([expected]) : new Set(expected);
    return this.arguments({ includeBorrowed: options.includeBorrowed ?? false }).some((argument) =>
      argument.particle.surface === particleSurface &&
      argument.noun !== null &&
      expectedSet.has(argument.noun.dictionaryForm)
    );
  }

  hasArgumentCategory(particleSurface: string, categories: string | readonly string[], options: { readonly includeBorrowed?: boolean } = {}): boolean {
    const categoryList = typeof categories === "string" ? [categories] : categories;
    return this.arguments({ includeBorrowed: options.includeBorrowed ?? false }).some((argument) =>
      argument.particle.surface === particleSurface &&
      argument.noun !== null &&
      tokenInSemanticCategories(argument.noun, categoryList, this.lookups)
    );
  }
}

const isSameClauseRenyouSource = (tokens: readonly MatcherToken[], predicate: number): boolean => ((tokens[predicate]?.pos ?? 0) & POS5) === 連用形_一般 || (tokens[predicate] !== undefined && isSahenCapableNominal(tokens[predicate]!) && tokens[predicate + 1]?.dictionaryForm === "する" && ((tokens[predicate + 1]?.pos ?? 0) & POS5) === 連用形_一般);

function ownedParticleArgumentRole(
  surface: string,
  gaNoConvertedSubject: () => boolean
): PredicateArgumentRole {
  if (surface === "が") return "subject";
  if (surface === "の") return gaNoConvertedSubject() ? "subject" : "oblique";
  if (surface === "を") return "object";
  return "oblique";
}

function topicFocusArgumentRole(
  particleIdx: number,
  predicatePos: number,
  layout: ClauseLayout
): PredicateArgumentRole {
  const assignment = layout.argumentRolesOf(predicatePos)
    .find((candidate) => candidate.particleIdx === particleIdx);
  if (assignment?.role === "theme_topic" || assignment?.role === "object") return "topic_theme";
  if (assignment?.role === "oblique_topic") return "oblique";
  if (assignment?.role === "prefixed_focus") return "prefixed_focus";
  if (assignment?.role === "subject_topic") return "subject";
  return "unknown";
}

export const BORROW_PERMISSIVE_CONNECTIVE_ROLES = new Set(["linkage", "listing", "adverbial", "manner"]);
export const TOPIC_FOCUS_ARGUMENT_PARTICLES = new Set(["は", "も"]);
export const COMPOUND_SHARED_CORE_PARTICLES = new Set(["が", "を"]);

function topicFocusArgumentsForPredicate(
  tokens: readonly MatcherToken[],
  predicatePos: number,
  options: {
    readonly layout: ClauseLayout;
    readonly excludedParticleIndices: readonly number[];
  }
): readonly number[] {
  const excluded = new Set(options.excludedParticleIndices);
  return options.layout.argumentRolesOf(predicatePos)
    .map((assignment) => assignment.particleIdx)
    .filter((idx) =>
      idx < predicatePos &&
      !excluded.has(idx) &&
      TOPIC_FOCUS_ARGUMENT_PARTICLES.has(tokens[idx]?.surface ?? "")
    );
}

function collectBorrowedArguments(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  ownArguments: readonly PredicateArgument[],
  options: { readonly connectiveRoles: ReadonlyMap<number, string> | null },
  lookups: LookupTables
): readonly PredicateArgument[] {
  const currentClauseIdx = layout.clauseIndexOfPredicate(predicatePos);
  if (currentClauseIdx === undefined) {
    return [];
  }
  const borrowed: PredicateArgument[] = [];
  if (currentClauseIdx > 0) {
    const prevClause = layout.clauses[currentClauseIdx - 1];
    if (prevClause?.terminatedBy === "connective") {
      borrowed.push(...collectTeConnectiveBorrows(tokens, layout, predicatePos, prevClause, ownArguments, options.connectiveRoles, lookups));
    } else if (prevClause?.terminatedBy === "punctuation") {
      borrowed.push(...collectPunctuationNominalFragmentBorrows(tokens, layout, predicatePos, prevClause, ownArguments, lookups));
      borrowed.push(...collectPunctuationChuushiBorrows(tokens, layout, predicatePos, prevClause, ownArguments, lookups));
    }
  }
  const ownClause = layout.clauses[currentClauseIdx];
  if (ownClause !== undefined && ownClause.predicates.length > 1) {
    borrowed.push(...collectSameClauseChuushiBorrows(
      tokens, layout, predicatePos, ownClause, ownArguments, options.connectiveRoles, lookups
    ));
  }
  if (ownClause !== undefined) {
    borrowed.push(...collectAttributiveHeadBorrows(tokens, layout, predicatePos, ownClause, ownArguments, lookups));
  }
  return borrowed;
}

function collectAttributiveHeadBorrows(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  ownClause: Clause,
  ownArguments: readonly PredicateArgument[],
  lookups: LookupTables
): readonly PredicateArgument[] {
  const chainRelative = renyouChuushiChainRelativeClause(layout, ownClause);
  if (chainRelative !== null) {
    const relativePredicate = chainRelative.predicates.at(-1);
    if (relativePredicate === undefined || !layout.canBindAttributiveHead(relativePredicate)) {
      return [];
    }
    ownClause = chainRelative;
  } else if (!layout.canBindAttributiveHead(predicatePos)) {
    return [];
  }
  const ownParticleSurfaces = new Set(ownArguments.map((argument) => argument.particle.surface));
  if (ownParticleSurfaces.has("を")) {
    return [];
  }
  const ownToken = tokens[predicatePos];
  const ownPos5 = ownToken !== undefined ? ownToken.pos & POS5 : 0;
  const isAttributiveForm = ownPos5 === 連体形_一般 || ownPos5 === 終止形_一般;
  if (ownClause.kind !== "relative" && !isAttributiveForm) {
    return [];
  }
  let headIdx = ownClause.kind === "relative" ? ownClause.end : predicatePos + 1;
  while (headIdx < tokens.length) {
    const pos0 = tokens[headIdx] !== undefined ? tokens[headIdx]!.pos & POS0 : -1;
    if (pos0 !== 助動詞) {
      break;
    }
    headIdx += 1;
  }
  const headToken = tokens[headIdx];
  if (headToken === undefined || !pos0in(headToken.pos, NOMINAL_BITS)) {
    return [];
  }
  const role: PredicateArgumentRole = isSettingAdjunctAttributiveHead(headToken, lookups)
    ? "adjunct"
    : "object";
  return [new PredicateArgument(headIdx, fakeWoParticle(), headToken, headToken, true, "relative_head", role)];
}

function renyouChuushiChainRelativeClause(layout: ClauseLayout, clause: Clause): Clause | null {
  let current = clause;
  let walked = false;
  while (current.terminatedBy === "connective" && layout.chuushiClosureAt(current.end)?.hostKind === "renyou") {
    const next = layout.clauses[layout.clauses.indexOf(current) + 1];
    if (next === undefined || next.start !== current.end) {
      return null;
    }
    current = next;
    walked = true;
  }
  return walked && current.kind === "relative" ? current : null;
}

function collectSameClauseChuushiBorrows(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  ownClause: Clause,
  ownArguments: readonly PredicateArgument[],
  connectiveRoles: ReadonlyMap<number, string> | null,
  lookups: LookupTables
): readonly PredicateArgument[] {
  const sources = ownClause.predicates.filter((prevPredIdx) =>
    prevPredIdx < predicatePos && (
      ((tokens[prevPredIdx]?.pos ?? 0) & POS5) === 連用形_一般 ||
      BORROW_PERMISSIVE_CONNECTIVE_ROLES.has(connectiveRoles?.get(prevPredIdx) ?? "")
    )
  );
  return collectBorrowsFromPredicates(tokens, layout, predicatePos, ownClause, sources, ownArguments, lookups);
}

function collectPunctuationNominalFragmentBorrows(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  prevClause: Clause,
  ownArguments: readonly PredicateArgument[],
  lookups: LookupTables
): readonly PredicateArgument[] {
  if (prevClause.predicates.length > 0 || !clauseEndsWithWeakComma(tokens, prevClause)) {
    return [];
  }
  const ownParticleSurfaces = new Set(ownArguments.map((argument) => argument.particle.surface));
  const borrowed: PredicateArgument[] = [];
  for (const particleIdx of prevClause.particleIndices) {
    if (tokens[particleIdx]?.surface !== "が") {
      continue;
    }
    if (!isBorrowCandidateParticle(tokens, layout, particleIdx, predicatePos, ownParticleSurfaces)) {
      continue;
    }
    borrowed.push(buildBorrowedArgument(tokens, particleIdx, lookups));
  }
  return borrowed;
}

function clauseEndsWithWeakComma(tokens: readonly MatcherToken[], clause: Clause): boolean {
  const boundary = tokens[clause.end - 1];
  return boundary?.surface === "、" || boundary?.surface === ",";
}

function collectBorrowsFromPredicates(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  sourceClause: Clause,
  sourcePredicates: readonly number[],
  ownArguments: readonly PredicateArgument[],
  lookups: LookupTables
): readonly PredicateArgument[] {
  const ownSurfaces = new Set(ownArguments.map((argument) => argument.particle.surface));
  return sourcePredicates.flatMap((sourcePredicate) =>
    [...new Set([
      ...sourceClause.particlesOf(sourcePredicate),
      ...layout.argumentRolesOf(sourcePredicate).map((assignment) => assignment.particleIdx)
    ])]
      .filter((particle) => isBorrowCandidateParticle(tokens, layout, particle, predicatePos, ownSurfaces))
      .map((particle) => buildBorrowedArgument(tokens, particle, lookups, layout, sourcePredicate))
  );
}

function buildBorrowedArgument(
  tokens: readonly MatcherToken[],
  particleIdx: number,
  lookups: LookupTables,
  layout?: ClauseLayout,
  sourcePredicatePos?: number
): PredicateArgument {
  const role = layout !== undefined && sourcePredicatePos !== undefined &&
    TOPIC_FOCUS_ARGUMENT_PARTICLES.has(tokens[particleIdx]?.surface ?? "")
    ? topicFocusArgumentRole(particleIdx, sourcePredicatePos, layout)
    : ownedParticleArgumentRole(tokens[particleIdx]?.surface ?? "", () => false);
  return new PredicateArgument(
    particleIdx,
    tokens[particleIdx]!,
    getReferentTokenBeforeParticle(tokens, particleIdx, lookups),
    getArgumentNounBeforeParticle(tokens, particleIdx, lookups),
    true,
    "borrowed_event",
    role
  );
}

function isBorrowCandidateParticle(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  particleIdx: number,
  predicatePos: number,
  ownParticleSurfaces: ReadonlySet<string>
): boolean {
  if (particleIdx >= predicatePos) {
    return false;
  }
  if (layout.isQuoteTrappedArgument(particleIdx, predicatePos)) {
    return false;
  }
  if (layout.quoteSpans.some(([start, end]) => particleIdx < start && end < predicatePos)) {
    return false;
  }
  return !ownParticleSurfaces.has(tokens[particleIdx]?.surface ?? "");
}

function borrowableChuushiClauseHost(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  clause: Clause
): "te" | "renyou" | null {
  if (clause.terminatedBy !== "connective" || layout.closesAsDetachedUtterance(clause)) {
    return null;
  }
  if (isTeConnectiveToken(tokens[clause.end - 1])) {
    return "te";
  }
  return layout.chuushiClosureAt(clause.end)?.hostKind === "renyou" ? "renyou" : null;
}

function isBorrowableChuushiConnectiveClause(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  clause: Clause
): boolean {
  return borrowableChuushiClauseHost(tokens, layout, clause) !== null;
}

function collectTeConnectiveBorrows(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  prevClause: Clause,
  ownArguments: readonly PredicateArgument[],
  connectiveRoles: ReadonlyMap<number, string> | null,
  lookups: LookupTables
): readonly PredicateArgument[] {
  const borrowed: PredicateArgument[] = [];
  let sourceClause: Clause | undefined = prevClause;
  let walkedRenyou = false;
  for (;;) {
    const host = sourceClause === undefined ? null : borrowableChuushiClauseHost(tokens, layout, sourceClause);
    if (sourceClause !== undefined && host === null && walkedRenyou && sourceClause.terminatedBy === "punctuation") {
      borrowed.push(...collectPunctuationChuushiBorrows(tokens, layout, predicatePos, sourceClause, [...ownArguments, ...borrowed], lookups));
      break;
    }
    if (sourceClause === undefined || host === null) break;
    walkedRenyou ||= host === "renyou";
    const terminal = sourceClause.predicates.at(-1);
    if (terminal === undefined) break;
    const terminalRole = connectiveRoles?.get(terminal);
    if (terminalRole === undefined ? host === "te" : !BORROW_PERMISSIVE_CONNECTIVE_ROLES.has(terminalRole)) break;
    const sources = sourceClause.predicates.filter((predicate) => ((tokens[predicate]?.pos ?? 0) & POS5) === 連用形_一般 || BORROW_PERMISSIVE_CONNECTIVE_ROLES.has(connectiveRoles?.get(predicate) ?? ""));
    borrowed.push(...collectBorrowsFromPredicates(tokens, layout, predicatePos, sourceClause, sources, [...ownArguments, ...borrowed], lookups));
    sourceClause = layout.clauses[layout.clauses.indexOf(sourceClause) - 1];
  }
  return borrowed;
}

function collectPunctuationChuushiBorrows(
  tokens: readonly MatcherToken[],
  layout: ClauseLayout,
  predicatePos: number,
  prevClause: Clause,
  ownArguments: readonly PredicateArgument[],
  lookups: LookupTables
): readonly PredicateArgument[] {
  if (!clauseEndsInRenyouChuushi(tokens, prevClause)) {
    return [];
  }
  return collectBorrowsFromPredicates(
    tokens, layout, predicatePos, prevClause, prevClause.predicates, ownArguments, lookups
  );
}

function clauseEndsInRenyouChuushi(tokens: readonly MatcherToken[], clause: Clause): boolean {
  let idx = clause.end - 1;
  while (idx >= clause.start) {
    const token = tokens[idx];
    const tp0 = token !== undefined ? token.pos & POS0 : -1;
    if (tp0 === 補助記号) {
      idx -= 1;
      continue;
    }
    return token !== undefined && (token.pos & POS5) === 連用形_一般;
  }
  return false;
}

function fakeWoParticle(): MatcherToken {
  return {
    surface: "を",
    dictionaryForm: "を",
    reading: "",
    dictionaryFormReading: "",
    pos: 助詞_格助詞,
    dictionaryId: -1
  };
}

export function getArgumentNounBeforeParticle(tokens: readonly MatcherToken[], particleIdx: number, lookups: LookupTables): MatcherToken | null {
  const combined = numericCounterArgumentToken(tokens, particleIdx - 1);
  if (combined !== null) {
    return combined;
  }
  const token = getReferentTokenBeforeParticle(tokens, particleIdx, lookups);
  if (token === null) {
    return null;
  }
  if ((token.pos & POS01) === 接尾辞_名詞的) {
    let suffixIdx = particleIdx - 1;
    while (suffixIdx >= 0 && tokens[suffixIdx] !== token) {
      suffixIdx -= 1;
    }
    let idx = suffixIdx - 1;
    while (idx >= 0) {
      const prev = tokens[idx];
      if (prev === undefined) {
        return null;
      }
      if ((prev.pos & POS01) === 接尾辞_名詞的) {
        idx -= 1;
        continue;
      }
      if (pos0in(prev.pos, NOMINAL_BITS)) {
        return prev;
      }
      break;
    }
    return null;
  }
  if (pos0in(token.pos, NOMINAL_BITS)) {
    return token;
  }
  return null;
}

export function numericCounterArgumentToken(tokens: readonly MatcherToken[], idx: number): MatcherToken | null {
  if (idx <= 0 || idx >= tokens.length) {
    return null;
  }
  const counter = tokens[idx];
  const number = tokens[idx - 1];
  if (counter === undefined || (counter.pos & POS0) !== 接尾辞 || number === undefined || (number.pos & POS01) !== 名詞_数詞) {
    return null;
  }
  const surface = `${number.surface}${counter.surface}`;
  if (surface.length === 0) {
    return null;
  }
  return {
    ...counter,
    surface,
    dictionaryForm: surface,
    numericCounterHeadForm: counter.dictionaryForm || counter.surface,
    pos: 名詞_普通名詞
  };
}

export interface ArgumentNounLookupToken {
  readonly surface: string;
  readonly dictionaryForm: string;
  readonly numericCounterHeadForm?: string;
}

export function argumentNounLookupForms(token: ArgumentNounLookupToken): readonly string[] {
  const forms: string[] = [];
  const seen = new Set<string>();
  const add = (form: string | undefined): void => {
    if (form === undefined || form.length === 0 || seen.has(form)) {
      return;
    }
    seen.add(form);
    forms.push(form);
  };
  add(token.dictionaryForm);
  add(token.surface);
  add(token.numericCounterHeadForm);
  return forms;
}

export function argumentNounLookupMatches(token: ArgumentNounLookupToken, expected: ReadonlySet<string>): boolean {
  return argumentNounLookupForms(token).some((form) => lookupSetMatches(expected, form));
}

const ARGUMENT_MODIFIER_CONTENT_BITS: number =
  (1 << 名詞) | (1 << 代名詞) | (1 << 連体詞) | (1 << 動詞) |
  (1 << 形容詞0) | (1 << 形状詞) | (1 << 助動詞) | (1 << 接尾辞);

export function nounArgumentModifierEvidence(
  tokens: readonly MatcherToken[],
  headIdx: number,
  layout: ClauseLayout | null
): boolean | null {
  if (headIdx < 0 || headIdx >= tokens.length) {
    return null;
  }
  if (headIdx === 0) {
    return false;
  }
  if (layout !== null) {
    const clauseIndex = layout.clauseIndexOfToken(headIdx);
    const previousClause = layout.clauseOfToken(headIdx - 1);
    if (
      previousClause !== undefined &&
      previousClause.kind === "relative" &&
      previousClause.end === headIdx &&
      previousClause.parentIdx === clauseIndex
    ) {
      return true;
    }
  }
  const previousIndex = previousNonSpaceIndex(tokens, headIdx);
  if (previousIndex === null) {
    return false;
  }
  if (nominalLinkMarkerRelationAt(tokens, previousIndex, { consumers: ["semantic_helpers"] }) !== null) {
    return true;
  }
  const previous = tokens[previousIndex];
  return previous !== undefined && pos0in(previous.pos, ARGUMENT_MODIFIER_CONTENT_BITS);
}

export function isLightVerbActionNounToken(token: MatcherToken, lookups: LookupTables): boolean {
  return isSahenVerbalizableNominal(token) ||
    getReferentForms(token.dictionaryForm, lookups).some((form) => lookups.LIGHT_VERB_SPEECH_OBJECT_NOUNS.has(form));
}

export function tokenInSemanticCategories(token: MatcherToken, categories: readonly string[], lookups: LookupTables): boolean {
  return categories.some((category) => {
    if (category === "person") {
      return isHumanReferentToken(token, lookups);
    }
    if (category === "place") {
      return isPlaceNoun(token, lookups);
    }
    if (category === "time") {
      return isTemporalArgumentToken(token, lookups);
    }
    if (category === "role") {
      return isRoleNoun(token, lookups);
    }
    if (category === "animate") {
      return isAnimateReferentToken(token, lookups);
    }
    if (category === "action_noun") {
      return isLightVerbActionNounToken(token, lookups);
    }
    return false;
  });
}

export function getReferentIndexBeforeParticle(tokens: readonly MatcherToken[], particleIdx: number, lookups: LookupTables): number | null {
  let idx = particleIdx - 1;
  while (idx >= 0) {
    const token = tokens[idx];
    if (token === undefined) {
      return null;
    }
    if (isPluralSuffixToken(token, lookups)) {
      idx -= 1;
      continue;
    }
    const pos0 = token.pos & POS0;
    const pos1 = token.pos & POS1;
    if (pos0 === 助詞 && pos1 === 副助詞) {
      idx -= 1;
      continue;
    }
    if (
      pos0 === 助詞 &&
      kaMarkerRelationAt(tokens, idx, ["semantic_helpers"])?.particleSubtype1 === 終助詞 &&
      idx > 0 &&
      tokens[idx - 1] !== undefined && (tokens[idx - 1]!.pos & POS0) === 代名詞
    ) {
      idx -= 1;
      continue;
    }
    if (pos0 === 助詞 && pos1 === 格助詞 && nominalLinkMarkerRelationAt(tokens, idx, { consumers: ["semantic_helpers"] }) === null) {
      idx -= 1;
      continue;
    }
    return idx;
  }
  return null;
}

export function getReferentTokenBeforeParticle(tokens: readonly MatcherToken[], particleIdx: number, lookups: LookupTables): MatcherToken | null {
  const idx = getReferentIndexBeforeParticle(tokens, particleIdx, lookups);
  return idx === null ? null : (tokens[idx] ?? null);
}

export function isObliqueCaseChain(tokens: readonly MatcherToken[], particlePos: number, lookups: LookupTables): boolean {
  let idx = particlePos - 1;
  while (idx >= 0) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    if (isPluralSuffixToken(token, lookups)) {
      idx -= 1;
      continue;
    }
    const pos0 = token.pos & POS0;
    const pos1 = token.pos & POS1;
    if (pos0 === 助詞 && pos1 === 副助詞) {
      idx -= 1;
      continue;
    }
    return pos0 === 助詞 && pos1 === 格助詞 && nominalLinkMarkerRelationAt(tokens, idx, { consumers: ["semantic_helpers"] }) === null;
  }
  return false;
}


export function isQuotativeToTokens(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  const { tokens, pos: toPos } = cursor;
  const n = cursor.end;
  if (toPos + 1 >= n) {
    return false;
  }
  if (isQuotedJudgmentPassiveQuotationContext(cursor)) {
    return true;
  }
  if (matchQuotedSareruTailAsClauseQuote(cursor) !== null) {
    return true;
  }
  const next = tokens[toPos + 1];
  if (next !== undefined && (next.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(next.dictionaryForm)) {
    return true;
  }
  if (next !== undefined && (next.pos & POS0) === 助詞 && toPos + 2 < n) {
    const afterParticle = tokens[toPos + 2];
    if (afterParticle !== undefined && (afterParticle.pos & POS0) === 動詞 && lookups.SPEECH_VERBS.has(afterParticle.dictionaryForm)) {
      return true;
    }
  }
  return next !== undefined && (next.pos & POS0) === 名詞 && lookups.QUOTATIVE_NOUNS.has(next.dictionaryForm);
}

export function isQuotedJudgmentPassiveQuotationContext(
  cursor: TokenCursor<MatcherToken>
): boolean {
  const head = quotedJudgmentHeadBeforeMarker(cursor.tokens, cursor.pos, (t) => pos0in(t.pos, PUNCTUATION_BITS));
  return matchQuotedJudgmentPassiveTail(cursor, {
    hasCopulaBeforeMarker: head.hasCopula,
    nominalHead: head.nominalHead
  }) !== null;
}

export function isQuotativeToTokensWide(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables,
  options: { readonly scope?: ClausePhraseScope } = {}
): boolean {
  const toPos = cursor.pos;
  const n = cursor.end;
  if (toPos >= n) {
    return false;
  }
  if (isQuotativeToTokens(cursor, lookups)) {
    return true;
  }
  if (toPos + 1 >= n) {
    return false;
  }
  return cursor.lookahead(1, c => scansToSpeechPredicate(c, lookups, {
    toPos,
    ...(options.scope === undefined ? {} : { scope: options.scope })
  }));
}

const SPEECH_PREDICATE_SCAN_DEFAULT_SCOPE: ClausePhraseScope = "evidence_window";

export function scansToSpeechPredicate(
  cursor: TokenCursor<MatcherToken>,
  lookups: LookupTables,
  options: { readonly toPos?: number | null; readonly scope?: ClausePhraseScope } = {}
): boolean {
  const { tokens } = cursor;
  let idx = cursor.pos;
  const scopedEnd = activeProtoScopedScanEnd(tokens, cursor.pos, options.scope ?? SPEECH_PREDICATE_SCAN_DEFAULT_SCOPE);
  const limit = Math.min(scopedEnd ?? cursor.end, cursor.end, cursor.pos + 15);
  const suppressOnNeg = options.toPos === undefined || options.toPos === null
    ? true
    : toPrecededByNegativeVerb(tokens, options.toPos);
  while (idx < limit) {
    const token = tokens[idx];
    if (token === undefined) {
      return false;
    }
    const pos0 = token.pos & POS0;
    if (pos0 === 補助記号) {
      return false;
    }
    if (pos0 === 助詞) {
      const pos1 = token.pos & POS1;
      if (pos1 === 終助詞 || pos1 === 接続助詞 || pos1 === 準体助詞) {
        return false;
      }
      const quoteMarker = quoteMarkerRelationAt(tokens, idx, { consumers: ["semantic_helpers"] });
      if (
        (quoteMarker?.canonicalSurface === "と" || quoteMarker?.canonicalSurface === "って") &&
        (pos1 === 格助詞 || pos1 === 副助詞)
      ) {
        const prevP0 = idx - 1 >= 0 && tokens[idx - 1] !== undefined ? tokens[idx - 1]!.pos & POS0 : -1;
        if (pos0in(prevP0, NOMINAL_BITS) || prevP0 === 副詞) {
          idx += 1;
          continue;
        }
        return false;
      }
      idx += 1;
      continue;
    }
    if (pos0 === 動詞) {
      if (lookups.SPEECH_VERBS.has(token.dictionaryForm)) {
        return suppressOnNeg ? !verbAuxHasNegation(tokens, idx + 1, limit) : true;
      }
      if ((token.dictionaryForm === "する" || token.dictionaryForm === "付ける") && idx > cursor.pos) {
        const prev = tokens[idx - 1];
        if (prev !== undefined && (prev.pos & POS0) === 名詞 && lookups.QUOTATIVE_NOUNS.has(prev.dictionaryForm)) {
          return suppressOnNeg ? !verbAuxHasNegation(tokens, idx + 1, limit) : true;
        }
      }
      return false;
    }
    if (pos0 === 形容詞0) {
      if ((token.pos & POS5A) === 連用形_) {
        idx += 1;
        continue;
      }
      return false;
    }
    if (pos0 === 名詞 && lookups.QUOTATIVE_NOUNS.has(token.dictionaryForm)) {
      idx += 1;
      continue;
    }
    idx += 1;
  }
  return false;
}


export function nextVerbDictForm(
  cursor: TokenCursor<MatcherToken>,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): string | null {
  const { tokens, pos: niPos } = cursor;
  const limit = Math.min(niPos + 6, cursor.end, options.clause?.end ?? cursor.end);
  for (let idx = niPos + 1; idx < limit; idx += 1) {
    const token = tokens[idx];
    if (token !== undefined && (token.pos & POS0) === 動詞) {
      return token.dictionaryForm;
    }
  }
  return null;
}

export function isPersonCountBeforeDe(tokens: readonly MatcherToken[], dePos: number, lookups: LookupTables): boolean {
  if (dePos === 0) {
    return false;
  }
  const prev = tokens[dePos - 1];
  if (
    prev !== undefined &&
    lookups.PERSON_COUNT_COUNTERS.has(prev.dictionaryForm) &&
    pos0in(prev.pos, (1 << 接尾辞) | (1 << 名詞)) &&
    dePos >= 2 &&
    ((tokens[dePos - 2]?.pos ?? 0) & POS1) === 数詞
  ) {
    return true;
  }
  return prev !== undefined && isPersonCountToken(prev, lookups);
}

export function isPersonCountToken(token: MatcherToken, lookups: LookupTables): boolean {
  return (token.pos & POS0) === 名詞 &&
    isAdverbCapableNominal(token) &&
    Array.from(lookups.PERSON_COUNT_COUNTERS).some((counter) => token.surface.endsWith(counter));
}

export function isQuantityMeasureToken(token: MatcherToken, lookups: LookupTables): boolean {
  if ((token.pos & POS01) === 名詞_数詞) {
    return true;
  }
  if ((token.pos & POS0) === 名詞 && ((token.pos & POS2) === 助数詞可能 || (token.pos & POS2) === 助数詞)) {
    return true;
  }
  if ((token.pos & POS01) === 接尾辞_名詞的 && ((token.pos & POS2) === 助数詞 || (token.pos & POS2) === 助数詞可能)) {
    return true;
  }
  const form = token.dictionaryForm || token.surface;
  return Array.from(lookups.TEMPORAL_COUNTER_NOUNS).some((suffix) => {
    if (!form.endsWith(suffix) || form === suffix) {
      return false;
    }
    const prefix = form.slice(0, -suffix.length);
    return parseJapaneseNumber(prefix) !== undefined || /^[0-9０-９]+$/u.test(prefix);
  });
}

export function isTimeExpressionBeforeParticle(
  tokens: readonly MatcherToken[],
  particlePos: number,
  lookups: LookupTables,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  if (particlePos === 0) {
    return false;
  }
  let foundTemporalSignal = false;
  let passedSuffix = false;
  let scanned = 0;
  const lower = options.clause?.start ?? 0;
  for (let idx = particlePos - 1; idx >= lower; idx -= 1) {
    if (scanned >= 6) {
      break;
    }
    const token = tokens[idx];
    if (token === undefined) {
      break;
    }
    if (isTemporalExpressionToken(token, lookups)) {
      foundTemporalSignal = true;
      scanned += 1;
      continue;
    }
    if (isNumericTimeComponent(token)) {
      scanned += 1;
      continue;
    }
    if (lookups.TEMPORAL_SUFFIX_NOUNS.has(token.dictionaryForm)) {
      passedSuffix = true;
      scanned += 1;
      continue;
    }
    if (passedSuffix && pos0in(token.pos, INFLECTABLE_AUX_BITS)) {
      foundTemporalSignal = true;
      scanned += 1;
      continue;
    }
    if (passedSuffix && nominalLinkMarkerRelationAt(tokens, idx, { consumers: ["semantic_helpers"] }) !== null) {
      scanned += 1;
      continue;
    }
    if (passedSuffix && isSahenCapableNominal(token)) {
      foundTemporalSignal = true;
      scanned += 1;
      continue;
    }
    break;
  }
  return foundTemporalSignal;
}

export const isTimeExpressionBeforeKara = isTimeExpressionBeforeParticle;

export function hasModifierBeforeTokiHead(tokens: readonly MatcherToken[], headIdx: number): boolean {
  if (headIdx <= 0) {
    return false;
  }
  const prev = tokens[headIdx - 1];
  if (nominalLinkMarkerRelationAt(tokens, headIdx - 1, { consumers: ["semantic_helpers"] }) !== null) {
    return true;
  }
  return prev !== undefined && pos0in(prev.pos, INFLECTABLE_AUX_BITS | (1 << 連体詞));
}

export function isTemporalConditionHeadNiContext(tokens: readonly MatcherToken[], particleIdx: number, lookups: LookupTables): boolean {
  if (particleIdx <= 0) {
    return false;
  }
  const headIdx = particleIdx - 1;
  const prevForm = tokens[headIdx]?.dictionaryForm;
  if (prevForm !== undefined && lookups.TEMPORAL_CONDITION_NI_HEADS.has(prevForm)) {
    if (prevForm === "時" || prevForm === "とき") {
      return hasModifierBeforeTokiHead(tokens, headIdx);
    }
    return true;
  }
  return prevForm !== undefined &&
    lookups.TEMPORAL_SUFFIX_NOUNS.has(prevForm) &&
    isTimeExpressionBeforeParticle(tokens, particleIdx, lookups);
}

export function isQuantityPeriodPhraseBeforeNo(
  tokens: readonly MatcherToken[],
  noPos: number,
  lookups: LookupTables,
  options: { readonly clause?: SemanticClauseSpan | null } = {}
): boolean {
  if (noPos < 1) {
    return false;
  }
  const prev = tokens[noPos - 1];
  if (prev === undefined || !Array.from(lookups.NO_KEEP_QUANTITY_SUFFIXES).some((suffix) => prev.dictionaryForm.endsWith(suffix))) {
    return false;
  }
  const lowerExclusive = Math.max(noPos - 5, options.clause === undefined || options.clause === null ? -1 : options.clause.start - 1);
  for (let idx = noPos - 2; idx > lowerExclusive; idx -= 1) {
    const token = tokens[idx];
    if (token === undefined) {
      continue;
    }
    if (isNumericTimeComponent(token) || isTemporalExpressionToken(token, lookups)) {
      return true;
    }
    if ((token.pos & POS0) === 名詞 && ((token.pos & POS2) === 助数詞可能 || (token.pos & POS2) === 助数詞)) {
      return true;
    }
  }
  return false;
}

export function isAnimateReferentBeforeNi(tokens: readonly MatcherToken[], niPos: number, lookups: LookupTables): boolean {
  if (niPos === 0) {
    return false;
  }
  const referent = getReferentTokenBeforeParticle(tokens, niPos, lookups);
  return referent !== null && isAnimateReferentToken(referent, lookups);
}

export function isHumanCollectiveToken(token: MatcherToken, lookups: LookupTables): boolean {
  return lookups.HUMAN_COLLECTIVE_NOUNS.has(token.dictionaryForm);
}

export function isPersonByContext(tokens: readonly MatcherToken[], particlePos: number, lookups: LookupTables): boolean {
  if (particlePos < 2) {
    return false;
  }
  let referentPos = particlePos - 1;
  if (tokens[referentPos] !== undefined && isPluralSuffixToken(tokens[referentPos]!, lookups) && referentPos >= 2) {
    referentPos -= 1;
  }
  const referent = tokens[referentPos];
  if (
    referent === undefined ||
    !((referent.pos & POS1) === 固有名詞 && (referent.pos & POS2) !== 人名)
  ) {
    return false;
  }
  const noPos = referentPos - 1;
  return noPos >= 1 &&
    nominalLinkMarkerRelationAt(tokens, noPos, { consumers: ["semantic_helpers"] }) !== null &&
    tokens[noPos - 1] !== undefined &&
    isPersonToken(tokens[noPos - 1]!, lookups);
}

export function isProperPersonToken(token: MatcherToken, lookups: LookupTables): boolean {
  if ((token.pos & POS2) === 人名) {
    return true;
  }
  if ((token.pos & POS0) !== 名詞) {
    return false;
  }
  return Array.from(lookups.PERSON_SUFFIXES).some((suffix) => token.dictionaryForm.endsWith(suffix) && token.dictionaryForm.length > suffix.length);
}

export function precedingIsIdiomNoun(tokens: readonly MatcherToken[], niPos: number, lookups: LookupTables): boolean {
  if (niPos === 0) {
    return false;
  }
  return lookups.NI_SURU_IDIOM_NOUNS.has(tokens[niPos - 1]?.dictionaryForm ?? "");
}

export function isKaraMitePerspectiveTail(cursor: TokenCursor<MatcherToken>): boolean {
  const { tokens, pos: karaPos } = cursor;
  const n = cursor.end;
  if (karaPos + 2 >= n) {
    return false;
  }
  const miru = tokens[karaPos + 1];
  const tail = tokens[karaPos + 2];
  if (miru === undefined || (miru.pos & POS0) !== 動詞 || miru.dictionaryForm !== "見る") {
    return false;
  }
  if (tail === undefined || (tail.pos & POS0) !== 助詞) {
    return false;
  }
  if (isTeConnectiveToken(tail) || conditionalToConnectiveRelationAt(tokens, karaPos + 2, { consumers: ["semantic_helpers"] }) !== null) {
    return true;
  }
  const miruConjForm = (miru as MatcherToken & { readonly conjugationForm?: number }).conjugationForm;
  const miruIsKatei = miruConjForm !== undefined ? (miruConjForm & POS5A) === 仮定形_ : (miru.pos & POS5A) === 仮定形_;
  return tail.surface === "ば" && miruIsKatei;
}

export function isKaraIttePerspectiveTail(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  const { tokens, pos: karaPos } = cursor;
  const n = cursor.end;
  if (karaPos + 2 >= n) {
    return false;
  }
  const referent = getReferentTokenBeforeParticle(tokens, karaPos, lookups);
  if (referent !== null && isPlaceNoun(referent, lookups)) {
    return false;
  }
  const iu = tokens[karaPos + 1];
  const tail = tokens[karaPos + 2];
  if (iu === undefined || (iu.pos & POS0) !== 動詞 || !IU_LEXEME_FORMS.has(iu.dictionaryForm)) {
    return false;
  }
  if (tail === undefined || (tail.pos & POS0) !== 助詞) {
    return false;
  }
  if (isTeConnectiveToken(tail)) {
    const after = karaPos + 3;
    if (after < n) {
      const afterToken = tokens[after];
      if (afterToken?.surface === "は" || (afterToken !== undefined && (afterToken.pos & POS0) === 動詞)) {
        return false;
      }
    }
    return true;
  }
  if (conditionalToConnectiveRelationAt(tokens, karaPos + 2, { consumers: ["semantic_helpers"] }) !== null) {
    return true;
  }
  const iuConjForm = (iu as MatcherToken & { readonly conjugationForm?: number }).conjugationForm;
  const iuIsKatei = iuConjForm !== undefined ? (iuConjForm & POS5A) === 仮定形_ : (iu.pos & POS5A) === 仮定形_;
  return tail.surface === "ば" && iuIsKatei;
}

export function isQuotationContext(cursor: TokenCursor<MatcherToken>, lookups: LookupTables): boolean {
  if (cursor.pos > 0 && cursor.tokens[cursor.pos - 1]?.surface === "」") {
    return true;
  }
  return isQuotativeToTokens(cursor, lookups);
}

export function isTemporalArgumentToken(token: MatcherToken, lookups: LookupTables): boolean {
  if (isTemporalExpressionToken(token, lookups)) {
    return true;
  }
  return Array.from(lookups.TEMPORAL_COUNTER_NOUNS).some((suffix) => token.dictionaryForm.endsWith(suffix));
}

export function isPlaceNoun(token: MatcherToken, lookups: LookupTables): boolean {
  if ((token.pos & POS2) === 地名) {
    return true;
  }
  if (lookups.PLACE_NOUNS.has(token.dictionaryForm)) {
    return true;
  }
  return (token.pos & POS0) === 名詞 &&
    !lookups.PLACE_NOUN_SUFFIX_EXACT_EXCLUSIONS.has(token.dictionaryForm) &&
    Array.from(lookups.PLACE_NOUN_SUFFIXES).some((suffix) => token.dictionaryForm.endsWith(suffix));
}

export function isSettingAdjunctAttributiveHead(token: MatcherToken, lookups: LookupTables): boolean {
  return isPlaceNoun(token, lookups) || isTemporalExpressionToken(token, lookups);
}

export function isPlaceScopeNoun(token: MatcherToken, lookups: LookupTables): boolean {
  return isPlaceNoun(token, lookups) ||
    (
      (token.pos & POS01) === 接尾辞_名詞的 && lookups.PLACE_SCOPE_SUFFIX_HEADS.has(token.dictionaryForm || token.surface)
    );
}

export function isInstrumentNounToken(token: MatcherToken, lookups: LookupTables): boolean {
  return lookups.INSTRUMENT_NOUNS.has(token.dictionaryForm);
}

export function isRoleNoun(token: MatcherToken, lookups: LookupTables): boolean {
  return lookups.ROLE_NOUNS.has(token.dictionaryForm);
}

export function isPersonToken(token: MatcherToken, lookups: LookupTables): boolean {
  const forms = getReferentForms(token.dictionaryForm, lookups);
  if ((token.pos & POS2) === 人名) {
    return true;
  }
  if ((token.pos & POS0) === 名詞 && forms.some((form) => lookups.PERSON_NOUNS.has(form))) {
    return true;
  }
  if (
    (token.pos & POS0) === 名詞 &&
    forms.every((form) => !lookups.PERSON_NOUN_SUFFIX_EXACT_EXCLUSIONS.has(form)) &&
    forms.some((form) => Array.from(lookups.PERSON_NOUN_SUFFIXES).some((suffix) => form.endsWith(suffix)))
  ) {
    return true;
  }
  return forms.some((form) => Array.from(lookups.PERSON_SUFFIXES).some((suffix) => form.endsWith(suffix)));
}

export function isAnimateReferentToken(token: MatcherToken, lookups: LookupTables): boolean {
  if (isHumanReferentToken(token, lookups)) {
    return true;
  }
  const forms = getReferentForms(token.dictionaryForm, lookups);
  if (forms.some((form) => lookups.ANIMATE_NOUNS.has(form))) {
    return true;
  }
  return (token.pos & POS0) === 名詞 &&
    forms.some((form) =>
      !lookups.ANIMATE_NOUN_SUFFIX_EXACT_EXCLUSIONS.has(form) &&
      Array.from(lookups.ANIMATE_NOUN_SUFFIXES).some((suffix) => form.endsWith(suffix) && form.length > suffix.length)
    );
}

export function isTemporalExpressionToken(token: MatcherToken, lookups: LookupTables): boolean {
  return lookups.TEMPORAL_NOUNS.has(token.dictionaryForm) ||
    lookups.TEMPORAL_RANGE_NOUNS.has(token.dictionaryForm) ||
    lookups.TEMPORAL_COUNTER_NOUNS.has(token.dictionaryForm) ||
    token.dictionaryForm.endsWith("曜日");
}

export function isNumericTimeComponent(token: MatcherToken): boolean {
  return (token.pos & POS01) === 名詞_数詞;
}

export function isHumanReferentToken(token: MatcherToken, lookups: LookupTables): boolean {
  const forms = getReferentForms(token.dictionaryForm, lookups);
  if (/^[\p{Script=Katakana}ー]+$/u.test(token.surface) && forms.some((form) => lookups.HONORIFIC_FIRST_PERSON_PRONOUNS.has(form))) return true;
  if ((token.pos & POS0) === 代名詞 && forms.some((form) => lookups.HUMAN_PRONOUN_BASES.has(form))) return true;
  if (lookups.HUMAN_COLLECTIVE_NOUNS.has(token.dictionaryForm)) {
    return true;
  }
  return isPersonToken(token, lookups);
}

export function isPluralSuffixToken(token: MatcherToken, lookups: LookupTables): boolean {
  return (token.pos & POS0) === 接尾辞 && lookups.PLURAL_SUFFIXES.has(token.dictionaryForm);
}

export function getReferentForms(dictionaryForm: string, lookups: LookupTables): readonly string[] {
  const forms = [dictionaryForm];
  for (const suffix of lookups.PLURAL_SUFFIXES) {
    if (dictionaryForm.endsWith(suffix) && dictionaryForm.length > suffix.length) {
      forms.push(dictionaryForm.slice(0, -suffix.length));
    }
  }
  return forms;
}

function toPrecededByNegativeVerb(tokens: readonly MatcherToken[], toPos: number): boolean {
  if (toPos <= 0) {
    return false;
  }
  const prev = tokens[toPos - 1];
  return prev !== undefined && (prev.pos & POS0) === 助動詞 && ((prev.pos & POS4) === 助動詞_ナイ || (prev.pos & POS4) === 助動詞_ヌ);
}

function verbAuxHasNegation(tokens: readonly MatcherToken[], start: number, end: number): boolean {
  let idx = start;
  while (idx < end) {
    const token = tokens[idx];
    if (token === undefined || (token.pos & POS0) !== 助動詞) {
      return false;
    }
    if ((token.pos & POS4) === 助動詞_ナイ || (token.pos & POS4) === 助動詞_ヌ) {
      return true;
    }
    idx += 1;
  }
  return false;
}
