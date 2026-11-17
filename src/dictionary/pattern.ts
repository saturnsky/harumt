import type { IrregularType } from "../generator/conjugator.js";
import type { DataLoader } from "../data-loader.js";
import type { RuntimeHaruToken } from "../types/token.js";

import { auxHasPast } from "../pipeline/matchers.js";
import {
  looksNarrowQuestionTakingAfter,
  looksQuoteQuestionTakingAfter
} from "../pipeline/quote/embedded-question.js";
import { kaMarkerRelationAt } from "../pipeline/head-tail/boundary/marker.js";
import { kaOwnershipKindAt, selfQuestionDiscourseSfpKaRelationAt } from "../pipeline/head-tail/boundary/ka-ownership.js";
import { weakPunctuationRelation } from "../pipeline/head-tail/boundary/punctuation.js";
import { lookupSetMatches, type LookupTables } from "../pipeline/lookup-tables.js";
import { participatesInStructuralKaParallel } from "../pipeline/structural-relation/ka-parallel-ownership.js";
import { TokenCursor } from "../pipeline/token-cursor.js";
import { camelizeKeys } from "./data-section.js";

import {
  POS0,
  POS0_NAME,
  POS1,
  POS1_NAME,
  POS1_SHIFT,
  POS4,
  POS4_NAME,
  POS4_SHIFT,
  POS5A,
  POS5A_NAME,
  POS5A_SHIFT,
  POS5B,
  POS5B_NAME,
  POS5B_SHIFT,
  意志推量形_,
  助詞,
  助動詞,
  助動詞_ナイ,
  文語助動詞_ベシ,
  동사,
  KOPOS_OF_NAME,
  NOMINAL_BITS, pos0in
} from "../types/pos.js";
export class TriggerElement {
  constructor(
    readonly options: {
      pos0?: string | null;
      pos1?: string | null;
      surface?: string | null;
      reading?: string | null;
      dictionaryForm?: string | readonly string[] | null;
      conjugationForm?: string | null;
      lookupName?: string | null;
      lookupSet?: ReadonlySet<string> | null;
    } = {}
  ) { }

  get pos0(): string | null | undefined { return this.options.pos0; }
  get pos1(): string | null | undefined { return this.options.pos1; }
  get surface(): string | null | undefined { return this.options.surface; }
  get reading(): string | null | undefined { return this.options.reading; }
  get dictionaryForm(): string | readonly string[] | null | undefined { return this.options.dictionaryForm; }
  get conjugationForm(): string | null | undefined { return this.options.conjugationForm; }
  get lookupName(): string | null | undefined { return this.options.lookupName; }
  get lookupSet(): ReadonlySet<string> | null | undefined { return this.options.lookupSet; }

  withLookups(lookups: LookupTables): TriggerElement {
    if (this.options.lookupName === undefined || this.options.lookupName === null) {
      return this;
    }
    return new TriggerElement({
      ...this.options,
      lookupSet: resolveLookup(lookups, this.options.lookupName)
    });
  }

  matches(token: Pick<RuntimeHaruToken, "surface" | "dictionaryForm" | "reading" | "pos">): boolean {
    if (this.options.pos0 !== undefined && this.options.pos0 !== null && (POS0_NAME[token.pos & POS0] ?? "") !== this.options.pos0) {
      return false;
    }
    if (this.options.pos1 !== undefined && this.options.pos1 !== null && (POS1_NAME[(token.pos & POS1) >> POS1_SHIFT] ?? "") !== this.options.pos1) {
      return false;
    }
    if (this.options.surface !== undefined && this.options.surface !== null && token.surface !== this.options.surface) {
      return false;
    }
    if (this.options.reading !== undefined && this.options.reading !== null && token.reading !== this.options.reading) {
      return false;
    }
    const dictionaryForm = this.options.dictionaryForm;
    if (dictionaryForm !== undefined && dictionaryForm !== null) {
      if (Array.isArray(dictionaryForm)) {
        if (!dictionaryForm.includes(token.dictionaryForm)) {
          return false;
        }
      } else if (token.dictionaryForm !== dictionaryForm) {
        return false;
      }
    }
    if (this.options.conjugationForm !== undefined && this.options.conjugationForm !== null) {
      const pos5a = POS5A_NAME[(token.pos & POS5A) >> POS5A_SHIFT] ?? "";
      const pos5b = POS5B_NAME[(token.pos & POS5B) >> POS5B_SHIFT] ?? "";
      const pos5str = pos5a === "*" ? "" : pos5a + pos5b;
      if (!pos5str.includes(this.options.conjugationForm)) {
        return false;
      }
    }
    if (this.options.lookupSet !== undefined && this.options.lookupSet !== null && !lookupSetMatches(this.options.lookupSet, token.dictionaryForm)) {
      return false;
    }
    return true;
  }
}

export class AuxPrecondition {
  constructor(
    readonly lastPos4: string,
    readonly lastPos5Contains?: string | null,
    readonly lastSurfaceIn?: readonly string[] | null
  ) { }

  matches(auxTokens: readonly Pick<RuntimeHaruToken, "surface" | "pos">[]): boolean {
    const last = auxTokens.at(-1);
    if (last === undefined || (POS4_NAME[(last.pos & POS4) >> POS4_SHIFT] ?? "") !== this.lastPos4) {
      return false;
    }
    if (this.lastPos5Contains !== undefined && this.lastPos5Contains !== null) {
      const pos5a = POS5A_NAME[(last.pos & POS5A) >> POS5A_SHIFT] ?? "";
      const pos5b = POS5B_NAME[(last.pos & POS5B) >> POS5B_SHIFT] ?? "";
      const pos5str = pos5a === "*" ? "" : pos5a + pos5b;
      if (!pos5str.includes(this.lastPos5Contains)) {
        return false;
      }
    }
    if (this.lastSurfaceIn !== undefined && this.lastSurfaceIn !== null && !this.lastSurfaceIn.includes(last.surface)) {
      return false;
    }
    return true;
  }
}

export class PatternEntry {
  readonly triggerLength: number;
  readonly tailLemma: string | null;
  readonly tailIrregular: IrregularType | null;
  readonly tailText: string | null;
  readonly phase: string;
  readonly outputMode: string;
  readonly connectiveEnding: string | null;
  readonly middleText: string | null;
  readonly auxPrecondition: AuxPrecondition | null | undefined;
  readonly tailKoreanPos: number;
  readonly rejectFollowedBy: readonly string[];
  readonly rejectFollowedByDictForm: readonly string[];
  readonly rejectFollowedByPos0: readonly string[];
  readonly rejectPrevDictForm: readonly string[];
  readonly transparentTail: boolean;
  readonly description: string;

  constructor(
    readonly id: string,
    readonly trigger: readonly TriggerElement[],
    readonly mainVerbEnding: string,
    readonly options: {
      tailLemma?: string | null;
      tailIrregular?: IrregularType | null;
      tailText?: string | null;
      phase?: string;
      outputMode?: string;
      connectiveEnding?: string | null;
      middleText?: string | null;
      auxPrecondition?: AuxPrecondition | null;
      tailKoreanPos?: number;
      rejectFollowedBy?: readonly string[];
      rejectFollowedByDictForm?: readonly string[];
      rejectFollowedByPos0?: readonly string[];
      rejectPrevDictForm?: readonly string[];
      transparentTail?: boolean;
      description?: string;
    } = {}
  ) {
    this.triggerLength = trigger.length;
    this.tailLemma = options.tailLemma ?? null;
    this.tailIrregular = options.tailIrregular ?? null;
    this.tailText = options.tailText ?? null;
    this.phase = options.phase ?? "postVerb";
    this.outputMode = options.outputMode ?? "standard";
    this.connectiveEnding = options.connectiveEnding ?? null;
    this.middleText = options.middleText ?? null;
    this.auxPrecondition = options.auxPrecondition;
    this.tailKoreanPos = options.tailKoreanPos ?? 동사;
    this.rejectFollowedBy = options.rejectFollowedBy ?? [];
    this.rejectFollowedByDictForm = options.rejectFollowedByDictForm ?? [];
    this.rejectFollowedByPos0 = options.rejectFollowedByPos0 ?? [];
    this.rejectPrevDictForm = options.rejectPrevDictForm ?? [];
    this.transparentTail = options.transparentTail ?? false;
    this.description = options.description ?? "";
  }
}

export class PatternDictionary {
  postVerb: PatternEntry[] = [];
  postAux: PatternEntry[] = [];
  private lookups!: LookupTables;

  get patterns(): PatternEntry[] {
    return [...this.postVerb, ...this.postAux];
  }

  cloneShallow(): PatternDictionary {
    const clone = new PatternDictionary();
    clone.postVerb = this.postVerb;
    clone.postAux = this.postAux;
    clone.lookups = this.lookups;
    return clone;
  }

  withLookups(lookups: LookupTables): PatternDictionary {
    const clone = new PatternDictionary();
    clone.postVerb = this.postVerb.map((pattern) => patternWithLookups(pattern, lookups));
    clone.postAux = this.postAux.map((pattern) => patternWithLookups(pattern, lookups));
    clone.lookups = lookups;
    return clone;
  }

  async load(loader: DataLoader, dirPath: string, lookups: LookupTables): Promise<void> {
    this.lookups = lookups;
    const dirEntries = await loader.readDir(dirPath);
    const fileNames = dirEntries.filter((entry) => entry.isFile && entry.name.endsWith(".jsonl")).map((entry) => entry.name).sort();
    for (const fileName of fileNames) {
      const content = await loader.readTextFile(loader.joinPath(dirPath, fileName));
      for (const line of content.split(/\r?\n/u)) {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) {
          continue;
        }
        const entry = parseEntry(normalizeRawPatternEntry(camelizeKeys(JSON.parse(trimmed)) as RawPatternEntry), lookups);
        if (entry.phase === "postAux") {
          this.postAux.push(entry);
        } else {
          this.postVerb.push(entry);
        }
      }
    }
    this.postVerb.sort((left, right) => right.triggerLength - left.triggerLength);
    this.postAux.sort((left, right) => right.triggerLength - left.triggerLength);
  }

  matchAt(tokens: readonly RuntimeHaruToken[], pos: number): PatternEntry | undefined {
    return this.matchPostVerb(tokens, pos);
  }

  matchPostVerb(tokens: readonly RuntimeHaruToken[], pos: number): PatternEntry | undefined {
    return this.postVerb.find((pattern) => matchPattern(pattern, tokens, pos));
  }

  matchPostAux(
    tokens: readonly RuntimeHaruToken[],
    pos: number,
    auxTokens: readonly RuntimeHaruToken[] = []
  ): PatternEntry | undefined {
    let result: PatternEntry | undefined;
    if (auxTokens.length > 0) {
      const preconditioned = this.postAux.find((pattern) =>
        pattern.auxPrecondition !== undefined &&
        pattern.auxPrecondition !== null &&
        pattern.auxPrecondition.matches(auxTokens) &&
        matchPattern(pattern, tokens, pos)
      );
      if (preconditioned !== undefined) {
        result = preconditioned;
      }
    }
    if (result === undefined) {
      result = this.postAux.find((pattern) =>
        (pattern.auxPrecondition === undefined || pattern.auxPrecondition === null) &&
        matchPattern(pattern, tokens, pos)
      );
    }
    if (result !== undefined && result.id === "conn_ka" && connKaShouldYield(tokens, pos, this.lookups)) {
      return undefined;
    }
    if (result !== undefined && result.id === "conn_kato" && !connKatoFollowedByQuestionTaking(tokens, pos, this.lookups)) {
      return undefined;
    }
    if (result !== undefined && result.id === "conn_kadouka" && auxTokens.length > 0 && auxHasObligationForKadouka(auxTokens)) {
      return patternWithTailText(result, auxHasPast(auxTokens) ? " 안 맞았는지" : " 말지");
    }
    return result;
  }
}

function patternOptions(pattern: PatternEntry) {
  return {
    tailText: pattern.tailText,
    phase: pattern.phase,
    outputMode: pattern.outputMode,
    tailKoreanPos: pattern.tailKoreanPos,
    rejectFollowedBy: pattern.rejectFollowedBy,
    rejectFollowedByDictForm: pattern.rejectFollowedByDictForm,
    rejectFollowedByPos0: pattern.rejectFollowedByPos0,
    rejectPrevDictForm: pattern.rejectPrevDictForm,
    transparentTail: pattern.transparentTail,
    description: pattern.description,
    tailLemma: pattern.tailLemma,
    tailIrregular: pattern.tailIrregular,
    connectiveEnding: pattern.connectiveEnding,
    middleText: pattern.middleText,
    ...(pattern.auxPrecondition === undefined ? {} : { auxPrecondition: pattern.auxPrecondition }),
  };
}

function patternWithTailText(pattern: PatternEntry, tailText: string): PatternEntry {
  return new PatternEntry(pattern.id, pattern.trigger, pattern.mainVerbEnding, { ...patternOptions(pattern), tailText });
}

function patternWithLookups(pattern: PatternEntry, lookups: LookupTables): PatternEntry {
  return new PatternEntry(pattern.id, pattern.trigger.map((element) => element.withLookups(lookups)), pattern.mainVerbEnding, patternOptions(pattern));
}

function connKatoFollowedByQuestionTaking(tokens: readonly RuntimeHaruToken[], pos: number, lookups: LookupTables): boolean {
  const n = tokens.length;
  if (pos >= 1) {
    const host = tokens[pos - 1];
    const hostDict = host?.dictionaryForm || host?.surface || "";
    if (lookups.EMBEDDED_QUESTION_WH_INDEFINITE_HOSTS.has(hostDict)) {
      return looksNarrowQuestionTakingAfter(new TokenCursor(tokens, pos + 2, n), lookups);
    }
  }
  return looksQuoteQuestionTakingAfter(new TokenCursor(tokens, pos + 2, n), lookups);
}

function auxHasObligationForKadouka(auxTokens: readonly RuntimeHaruToken[]): boolean {
  for (const token of auxTokens) {
    const pos4 = token.pos & POS4;
    if (pos4 === 文語助動詞_ベシ) {
      return true;
    }
    if (pos4 === 助動詞_ナイ && (token.surface === "なきゃ" || token.surface === "なけりゃ")) {
      return true;
    }
  }
  return false;
}


function connKaShouldYield(
  tokens: readonly RuntimeHaruToken[],
  pos: number,
  lookups: LookupTables
): boolean {
  if (kaOwnershipKindAt(tokens, pos, lookups) !== "question") {
    return true;
  }
  if (selfQuestionDiscourseSfpKaRelationAt(tokens, pos)?.subtype === "ne") {
    return true;
  }
  if (pos >= 1) {
    const hostPos = tokens[pos - 1]?.pos ?? 0;
    if ((hostPos & POS5A) === 意志推量形_) {
      return true;
    }
  }
  const n = tokens.length;
  if (pos + 1 < n) {
    const nextToken = tokens[pos + 1];
    const nextPos = nextToken?.pos ?? 0;
    const nextPos0 = nextPos & POS0;
    const next2Pos = pos + 2 < n ? tokens[pos + 2]?.pos ?? 0 : 0;
    const next2Pos0 = next2Pos & POS0;
    const structuralKaParallel = participatesInStructuralKaParallel(new TokenCursor(tokens, pos, n), lookups);

    if (pos0in(nextPos0, NOMINAL_BITS) && structuralKaParallel) {
      return true;
    }
    if (
      pos0in(nextPos0, NOMINAL_BITS) &&
      next2Pos0 === 助詞 &&
      kaMarkerRelationAt(tokens, pos + 2, ["dictionary_pattern"]) === null
    ) {
      return true;
    }
    if (
      weakPunctuationRelation(nextToken, pos + 1, ["dictionary_pattern"]) !== null &&
      structuralKaParallel
    ) {
      return true;
    }
  }
  return false;
}

export function parseEntry(raw: RawPatternEntry, lookups: LookupTables): PatternEntry {
  const normalized = normalizeRawPatternEntry(raw);
  const trigger = normalized.trigger.map((element) => new TriggerElement(compactTriggerOptions(element, lookups)));
  const aux = normalized.auxPrecondition === undefined ? undefined : new AuxPrecondition(
    normalized.auxPrecondition.lastPos4,
    normalized.auxPrecondition.lastPos5Contains,
    normalized.auxPrecondition.lastSurfaceIn
  );
  return new PatternEntry(normalized.id, trigger, normalized.mainVerbEnding, {
    ...(normalized.tailLemma === undefined ? {} : { tailLemma: normalized.tailLemma }),
    ...(normalized.tailIrregular === undefined ? {} : { tailIrregular: normalized.tailIrregular }),
    ...(normalized.tailText === undefined ? {} : { tailText: normalized.tailText }),
    phase: normalized.phase ?? "postVerb",
    outputMode: normalized.outputMode ?? "standard",
    ...(normalized.connectiveEnding === undefined ? {} : { connectiveEnding: normalized.connectiveEnding }),
    ...(normalized.middleText === undefined ? {} : { middleText: normalized.middleText }),
    ...(aux === undefined ? {} : { auxPrecondition: aux }),
    tailKoreanPos: normalized.tailKoreanPos ?? 동사,
    rejectFollowedBy: normalized.rejectFollowedBy ?? [],
    rejectFollowedByDictForm: normalized.rejectFollowedByDictForm ?? [],
    rejectFollowedByPos0: normalized.rejectFollowedByPos0 ?? [],
    rejectPrevDictForm: normalized.rejectPrevDictForm ?? [],
    transparentTail: normalized.transparentTail ?? false,
    description: normalized.description ?? ""
  });
}


interface RawPatternEntry {
  id: string;
  trigger: readonly RawTriggerElement[];
  mainVerbEnding: string;
  tailLemma?: string | null;
  tailIrregular?: IrregularType | null;
  tailText?: string | null;
  phase?: string;
  outputMode?: string;
  connectiveEnding?: string | null;
  middleText?: string | null;
  auxPrecondition?: RawAuxPrecondition;
  tailKoreanPos?: number;
  rejectFollowedBy?: readonly string[];
  rejectFollowedByDictForm?: readonly string[];
  rejectFollowedByPos0?: readonly string[];
  rejectPrevDictForm?: readonly string[];
  transparentTail?: boolean;
  description?: string;
}

interface RawTriggerElement {
  pos0?: string | null;
  pos1?: string | null;
  surface?: string | null;
  reading?: string | null;
  dictionaryForm?: string | readonly string[] | null;
  conjugationForm?: string | null;
  lookup?: string | null;
}

interface RawAuxPrecondition {
  lastPos4: string;
  lastPos5Contains?: string | null;
  lastSurfaceIn?: readonly string[] | null;
}

function normalizeRawPatternEntry(raw: RawPatternEntry): RawPatternEntry {
  return {
    id: raw.id,
    trigger: raw.trigger.map(normalizeRawTriggerElement),
    mainVerbEnding: raw.mainVerbEnding,
    ...(raw.tailLemma === undefined ? {} : { tailLemma: raw.tailLemma }),
    ...(raw.tailIrregular === undefined ? {} : { tailIrregular: raw.tailIrregular }),
    ...(raw.tailText === undefined ? {} : { tailText: raw.tailText }),
    ...(raw.phase === undefined ? {} : { phase: normalizePatternPhase(raw.phase) }),
    ...(raw.outputMode === undefined ? {} : { outputMode: raw.outputMode }),
    ...(raw.connectiveEnding === undefined ? {} : { connectiveEnding: raw.connectiveEnding }),
    ...(raw.middleText === undefined ? {} : { middleText: raw.middleText }),
    ...(raw.auxPrecondition === undefined ? {} : { auxPrecondition: normalizeRawAuxPrecondition(raw.auxPrecondition) }),
    ...(raw.tailKoreanPos === undefined ? {} : { tailKoreanPos: typeof raw.tailKoreanPos === "string" ? KOPOS_OF_NAME[raw.tailKoreanPos] : raw.tailKoreanPos }),
    ...(raw.rejectFollowedBy === undefined ? {} : { rejectFollowedBy: raw.rejectFollowedBy }),
    ...(raw.rejectFollowedByDictForm === undefined ? {} : { rejectFollowedByDictForm: raw.rejectFollowedByDictForm }),
    ...(raw.rejectFollowedByPos0 === undefined ? {} : { rejectFollowedByPos0: raw.rejectFollowedByPos0 }),
    ...(raw.rejectPrevDictForm === undefined ? {} : { rejectPrevDictForm: raw.rejectPrevDictForm }),
    ...(raw.transparentTail === undefined ? {} : { transparentTail: raw.transparentTail }),
    ...(raw.description === undefined ? {} : { description: raw.description })
  };
}

function normalizePatternPhase(phase: string): string {
  if (phase === "post_aux") {
    return "postAux";
  }
  if (phase === "post_verb") {
    return "postVerb";
  }
  return phase;
}

function normalizeRawTriggerElement(raw: RawTriggerElement): RawTriggerElement {
  return {
    ...(raw.pos0 === undefined ? {} : { pos0: raw.pos0 }),
    ...(raw.pos1 === undefined ? {} : { pos1: raw.pos1 }),
    ...(raw.surface === undefined ? {} : { surface: raw.surface }),
    ...(raw.reading === undefined ? {} : { reading: raw.reading }),
    ...(raw.dictionaryForm === undefined ? {} : { dictionaryForm: raw.dictionaryForm }),
    ...(raw.conjugationForm === undefined ? {} : { conjugationForm: raw.conjugationForm }),
    ...(raw.lookup === undefined ? {} : { lookup: raw.lookup })
  };
}

function normalizeRawAuxPrecondition(raw: RawAuxPrecondition): RawAuxPrecondition {
  return {
    lastPos4: raw.lastPos4,
    ...(raw.lastPos5Contains === undefined ? {} : { lastPos5Contains: raw.lastPos5Contains }),
    ...(raw.lastSurfaceIn === undefined ? {} : { lastSurfaceIn: raw.lastSurfaceIn })
  };
}

function matchPattern(pattern: PatternEntry, tokens: readonly RuntimeHaruToken[], pos: number): boolean {
  const triggerLength = pattern.triggerLength;
  if (triggerLength > tokens.length - pos) {
    return false;
  }
  if (!pattern.trigger.every((element, index) => element.matches(tokens[pos + index] as RuntimeHaruToken))) {
    return false;
  }
  const next = tokens[pos + triggerLength];
  if (next !== undefined) {
    if (pattern.rejectFollowedBy.includes(next.surface)) {
      return false;
    }
    if (pattern.rejectFollowedByDictForm.includes(next.dictionaryForm)) {
      return false;
    }
    if (pattern.rejectFollowedByPos0.includes(POS0_NAME[next.pos & POS0] ?? "")) {
      return false;
    }
  }
  const prev = tokens[pos - 1];
  if (prev !== undefined && pattern.rejectPrevDictForm.includes(prev.dictionaryForm)) {
    return false;
  }
  return true;
}

function resolveLookup(lookups: LookupTables, name: string | null | undefined): ReadonlySet<string> | null {
  if (name === undefined || name === null) {
    return null;
  }
  const set = lookups.named(name);
  if (set === undefined) {
    throw new Error(`unknown lookup set name in pattern trigger: ${JSON.stringify(name)}`);
  }
  return set;
}

function compactTriggerOptions(element: RawTriggerElement, lookups: LookupTables): ConstructorParameters<typeof TriggerElement>[0] {
  return {
    ...(element.pos0 === undefined ? {} : { pos0: element.pos0 }),
    ...(element.pos1 === undefined ? {} : { pos1: element.pos1 }),
    ...(element.surface === undefined ? {} : { surface: element.surface }),
    ...(element.reading === undefined ? {} : { reading: element.reading }),
    ...(element.dictionaryForm === undefined ? {} : {
      dictionaryForm: Array.isArray(element.dictionaryForm)
        ? element.dictionaryForm.map(String)
        : element.dictionaryForm
    }),
    ...(element.conjugationForm === undefined ? {} : { conjugationForm: element.conjugationForm }),
    ...(element.lookup === undefined ? {} : { lookupName: element.lookup }),
    lookupSet: resolveLookup(lookups, element.lookup)
  };
}
