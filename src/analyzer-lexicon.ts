
import type { DataLoader } from "./data-loader.js";
import type { SplitComponentRef, UserLexiconEntry } from "./analyzer/dictionary.js";

const HEADER = [
  "kind",
  "surface",
  "reading",
  "pos1",
  "pos2",
  "pos3",
  "pos4",
  "pos5",
  "pos6",
  "left_id",
  "right_id",
  "cost",
  "dictionary_form",
  "normalized_form",
  "a_unit_split_json",
  "b_unit_split_json",
  "note"
].join("\t");

const POS_DEPTH = 6;

export const CONJUGATION_TEMPLATES_FILENAME = "conjugation-templates.json";


export interface ConjugationTemplateForm {
  readonly pos6: string;
  readonly surfaceSuffixes?: readonly string[];
  readonly readingSuffixes?: readonly string[];
  readonly fusion?: "u_onbin";
  readonly costDelta: number;
  readonly terminal?: boolean;
}

export type ConjugationIdBank = Readonly<Record<string, { readonly leftId: number; readonly rightId: number }>>;

export interface ConjugationTemplateClass {
  readonly posBase: readonly string[];
  readonly stemRule: { readonly surfaceStrip: string; readonly readingStrip: string };
  readonly idBanks: Readonly<Record<string, ConjugationIdBank>>;
  readonly forms: readonly ConjugationTemplateForm[];
}

export interface ConjugationTemplates {
  readonly classes: Readonly<Record<string, ConjugationTemplateClass>>;
}

export interface LemmaRow {
  readonly fileName: string;
  readonly lineNo: number;
  readonly surface: string;
  readonly reading: string;
  readonly pos: readonly string[];
  readonly classKey: string;
  readonly cost: number;
  readonly normalizedForm?: string;
}

type ParsedRow =
  | { readonly kind: "entry"; readonly entry: UserLexiconEntry }
  | { readonly kind: "lemma"; readonly lemma: LemmaRow };

export interface SupplementalLexiconParseResult {
  readonly entries: readonly UserLexiconEntry[];
  readonly lemmaRows: readonly LemmaRow[];
}

export function parseSupplementalLexiconTsv(
  fileName: string,
  content: string
): SupplementalLexiconParseResult {
  const withoutBom = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  const lines = withoutBom.split(/\r?\n/u);
  const entries: UserLexiconEntry[] = [];
  const lemmaRows: LemmaRow[] = [];
  let headerSeen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const lineNo = index + 1;
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    if (!headerSeen) {
      if (line !== HEADER) {
        throw new Error(
          `${fileName}: unexpected supplemental lexicon header on line ${lineNo}. ` +
          `Expected the 17-column header starting with "kind\\tsurface\\treading\\t...".`
        );
      }
      headerSeen = true;
      continue;
    }
    const row = parseRow(fileName, lineNo, line);
    if (row.kind === "lemma") {
      lemmaRows.push(row.lemma);
    } else {
      entries.push(row.entry);
    }
  }

  return { entries, lemmaRows };
}

export function linkDictionaryFormIndexes(entries: readonly UserLexiconEntry[]): {
  readonly entries: readonly UserLexiconEntry[];
  readonly warnings: readonly string[];
} {
  const warnings: string[] = [];
  const indexByKey = new Map<string, number[]>();
  entries.forEach((entry, index) => {
    const key = linkKey(entry.surface, entry.pos[0]);
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, [index]);
    } else {
      existing.push(index);
    }
  });

  const linked = entries.map((entry) => {
    if (entry.dictionaryFormIndex !== undefined) {
      return entry;
    }
    if (entry.dictionaryForm === undefined || entry.dictionaryForm === entry.surface) {
      return entry;
    }
    const matches = indexByKey.get(linkKey(entry.dictionaryForm, entry.pos[0])) ?? [];
    if (matches.length === 1) {
      return { ...entry, dictionaryFormIndex: matches[0]! };
    }
    warnings.push(
      `dictionary_form "${entry.dictionaryForm}" (pos1=${entry.pos[0] ?? "*"}) for surface ` +
      `"${entry.surface}" matched ${matches.length} rows; dictionaryFormIndex left unresolved`
    );
    return entry;
  });

  return { entries: linked, warnings };
}

export async function loadSupplementalLexicon(
  loader: DataLoader,
  dir: string
): Promise<readonly UserLexiconEntry[]> {
  if (!(await loader.exists(dir))) {
    return [];
  }
  const dirEntries = await loader.readDir(dir);
  const tsvNames = dirEntries
    .filter((entry) => entry.isFile && entry.name.endsWith(".tsv"))
    .map((entry) => entry.name)
    .sort();

  const combined: UserLexiconEntry[] = [];
  const lemmaRows: LemmaRow[] = [];
  for (const name of tsvNames) {
    const content = await loader.readTextFile(loader.joinPath(dir, name));
    const result = parseSupplementalLexiconTsv(name, content);
    combined.push(...result.entries);
    lemmaRows.push(...result.lemmaRows);
  }

  if (lemmaRows.length > 0) {
    await expandLemmaRowsInto(combined, lemmaRows, loader, dir);
  }

  const { entries, warnings: linkWarnings } = linkDictionaryFormIndexes(combined);
  if (linkWarnings.length > 0) {
    console.warn(
      `[supplemental-lexicon] dictionary_form 링크 ${linkWarnings.length}건 미연결: ` +
      linkWarnings.slice(0, 10).join("; ") +
      (linkWarnings.length > 10 ? "; …" : "")
    );
  }
  return entries;
}

async function expandLemmaRowsInto(
  combined: UserLexiconEntry[],
  lemmaRows: readonly LemmaRow[],
  loader: DataLoader,
  dir: string
): Promise<void> {
  const templatesPath = loader.joinPath(dir, CONJUGATION_TEMPLATES_FILENAME);
  if (!(await loader.exists(templatesPath))) {
    console.warn(
      `[supplemental-lexicon] ${CONJUGATION_TEMPLATES_FILENAME} 없음 — lemma ${lemmaRows.length}행 스킵`
    );
    return;
  }
  const templates = parseConjugationTemplates(await loader.readTextFile(templatesPath), templatesPath);

  const unknownClasses: string[] = [];
  let expandedLemmaCount = 0;
  for (const lemma of lemmaRows) {
    const classDef = templates.classes[lemma.classKey];
    if (classDef === undefined) {
      unknownClasses.push(`${lemma.fileName}:${lemma.lineNo} (${lemma.classKey})`);
      continue;
    }
    const terminalIndex = combined.length;
    combined.push(...expandLemma(lemma, classDef, terminalIndex));
    expandedLemmaCount += 1;
  }

  if (unknownClasses.length > 0) {
    console.warn(
      `[supplemental-lexicon] 미지 활용 클래스 ${unknownClasses.length}행 스킵: ` +
      unknownClasses.slice(0, 10).join("; ") +
      (unknownClasses.length > 10 ? "; …" : "")
    );
  }
  void expandedLemmaCount;
}

export function expandLemma(
  lemma: LemmaRow,
  classDef: ConjugationTemplateClass,
  terminalIndex: number
): UserLexiconEntry[] {
  const { surfaceStrip, readingStrip } = classDef.stemRule;
  if (!lemma.surface.endsWith(surfaceStrip)) {
    throw new Error(
      `${lemma.fileName}:${lemma.lineNo}: lemma surface "${lemma.surface}" must end with ` +
      `"${surfaceStrip}" for class ${lemma.classKey}.`
    );
  }
  if (!lemma.reading.endsWith(readingStrip)) {
    throw new Error(
      `${lemma.fileName}:${lemma.lineNo}: lemma reading "${lemma.reading}" must end with ` +
      `"${readingStrip}" for class ${lemma.classKey}.`
    );
  }
  const stemSurface = lemma.surface.slice(0, lemma.surface.length - surfaceStrip.length);
  const stemReading = lemma.reading.slice(0, lemma.reading.length - readingStrip.length);
  const bank = selectIdBank(classDef, lemma, stemSurface);

  const [pos1, pos2, pos3, pos4] = lemma.pos;
  const posOf = (pos6: string): string[] => [
    pos1 ?? "*", pos2 ?? "*", pos3 ?? "*", pos4 ?? "*", lemma.classKey, pos6
  ];

  const makeRow = (
    pos6: string,
    surface: string,
    reading: string,
    costDelta: number,
    isTerminal: boolean
  ): UserLexiconEntry => {
    const ids = bank[pos6];
    if (ids === undefined) {
      throw new Error(
        `${lemma.fileName}:${lemma.lineNo}: conjugation template for ${lemma.classKey} has no ` +
        `connection ID bank entry for form "${pos6}".`
      );
    }
    return {
      surface,
      reading,
      pos: posOf(pos6),
      leftId: ids.leftId,
      rightId: ids.rightId,
      cost: lemma.cost + costDelta,
      dictionaryForm: lemma.surface,
      normalizedForm: lemma.normalizedForm ?? lemma.surface,
      ...(isTerminal ? {} : { dictionaryFormIndex: terminalIndex })
    };
  };

  const expandForm = (form: ConjugationTemplateForm): UserLexiconEntry[] => {
    const isTerminal = form.terminal === true;
    if (form.fusion === "u_onbin") {
      const surface = fuseUOnbinSurface(stemSurface);
      const reading = fuseUOnbinReading(stemReading);
      return [makeRow(form.pos6, surface, reading, form.costDelta, isTerminal)];
    }
    const surfaceSuffixes = form.surfaceSuffixes ?? [];
    const readingSuffixes = form.readingSuffixes ?? [];
    return surfaceSuffixes.map((surfaceSuffix, i) =>
      makeRow(
        form.pos6,
        stemSurface + surfaceSuffix,
        stemReading + (readingSuffixes[i] ?? ""),
        form.costDelta,
        isTerminal
      )
    );
  };

  const terminalForm = classDef.forms.find((form) => form.terminal === true);
  if (terminalForm === undefined) {
    throw new Error(`conjugation template for ${lemma.classKey} has no terminal form.`);
  }
  const rows: UserLexiconEntry[] = [...expandForm(terminalForm)];
  for (const form of classDef.forms) {
    if (form.terminal === true) {
      continue;
    }
    rows.push(...expandForm(form));
  }
  return rows;
}

function selectIdBank(
  classDef: ConjugationTemplateClass,
  lemma: LemmaRow,
  stemSurface: string
): ConjugationIdBank {
  const banks = classDef.idBanks;
  if (banks.common !== undefined) {
    return banks.common;
  }
  const hasKatakana = /[゠-ヿ]/u.test(stemSurface);
  const bank = hasKatakana ? banks.katakana : banks.kanji;
  if (bank === undefined) {
    throw new Error(
      `${lemma.fileName}:${lemma.lineNo}: conjugation template for ${lemma.classKey} has no ` +
      `${hasKatakana ? "katakana" : "kanji"} ID bank.`
    );
  }
  return bank;
}


const A_TO_O_HIRAGANA: Readonly<Record<string, string>> = {
  あ: "お", か: "こ", が: "ご", さ: "そ", ざ: "ぞ", た: "と", だ: "ど",
  な: "の", は: "ほ", ば: "ぼ", ぱ: "ぽ", ま: "も", や: "よ", ら: "ろ", わ: "お"
};
const A_TO_O_KATAKANA: Readonly<Record<string, string>> = {
  ア: "オ", カ: "コ", ガ: "ゴ", サ: "ソ", ザ: "ゾ", タ: "ト", ダ: "ド",
  ナ: "ノ", ハ: "ホ", バ: "ボ", パ: "ポ", マ: "モ", ヤ: "ヨ", ラ: "ロ", ワ: "オ"
};
const I_ROW_HIRAGANA = new Set(["い", "き", "ぎ", "し", "じ", "ち", "ぢ", "に", "ひ", "び", "ぴ", "み", "り"]);
const I_ROW_KATAKANA = new Set(["イ", "キ", "ギ", "シ", "ジ", "チ", "ヂ", "ニ", "ヒ", "ビ", "ピ", "ミ", "リ"]);

export function fuseUOnbinReading(stemReading: string): string {
  if (stemReading.length === 0) {
    return "ウ";
  }
  const last = stemReading[stemReading.length - 1]!;
  const head = stemReading.slice(0, -1);
  const oRow = A_TO_O_KATAKANA[last];
  if (oRow !== undefined) {
    return head + oRow + "ウ";
  }
  if (I_ROW_KATAKANA.has(last)) {
    return stemReading + "ュウ";
  }
  return stemReading + "ウ";
}

export function fuseUOnbinSurface(stemSurface: string): string {
  if (stemSurface.length === 0) {
    return "う";
  }
  const last = stemSurface[stemSurface.length - 1]!;
  const head = stemSurface.slice(0, -1);
  const oRow = A_TO_O_HIRAGANA[last];
  if (oRow !== undefined) {
    return head + oRow + "う";
  }
  if (I_ROW_HIRAGANA.has(last)) {
    return stemSurface + "ゅう";
  }
  return stemSurface + "う";
}

export function parseConjugationTemplates(content: string, source: string): ConjugationTemplates {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`${source}: not valid JSON (${(error as Error).message}).`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${source}: expected a JSON object.`);
  }
  const classes = (parsed as Record<string, unknown>).classes;
  if (typeof classes !== "object" || classes === null) {
    throw new Error(`${source}: missing "classes" object.`);
  }
  return { classes: classes as ConjugationTemplates["classes"] };
}

function parseRow(fileName: string, lineNo: number, line: string): ParsedRow {
  const fields = line.split("\t").map((cell) => cell.trim());
  if (fields.length !== 16 && fields.length !== 17) {
    throw new Error(
      `${fileName}:${lineNo}: expected 16 or 17 tab-separated columns, got ${fields.length}.`
    );
  }
  if (fields[3] === "空白") {
    throw new Error(`${fileName}:${lineNo}: pos1="空白" is not allowed (whitespace is not a token).`);
  }
  const kind = fields[0]!;
  if (kind === "lemma") {
    return { kind: "lemma", lemma: parseLemmaRow(fileName, lineNo, fields) };
  }
  if (kind !== "entry") {
    throw new Error(`${fileName}:${lineNo}: unknown kind "${kind}" (expected "entry" or "lemma").`);
  }

  const surface = fields[1]!;
  const reading = fields[2]!;
  const pos1 = fields[3]!;
  if (surface === "") {
    throw new Error(`${fileName}:${lineNo}: surface is required for kind=entry rows.`);
  }
  if (reading === "") {
    throw new Error(`${fileName}:${lineNo}: reading is required for kind=entry rows.`);
  }
  if (pos1 === "") {
    throw new Error(`${fileName}:${lineNo}: pos1 is required for kind=entry rows.`);
  }
  const pos = [pos1, fields[4]!, fields[5]!, fields[6]!, fields[7]!, fields[8]!].map((cell) =>
    cell === "" ? "*" : cell
  );
  const leftId = parseIntStrict(fields[9]!, fileName, lineNo, "left_id");
  const rightId = parseIntStrict(fields[10]!, fileName, lineNo, "right_id");
  const cost = parseIntStrict(fields[11]!, fileName, lineNo, "cost");
  const dictionaryForm = emptyToUndefined(fields[12]!);
  const normalizedForm = emptyToUndefined(fields[13]!);
  const aUnitSplit = parseSplitJson(fields[14]!, fileName, lineNo, "a_unit_split_json");
  const bUnitSplit = parseSplitJson(fields[15]!, fileName, lineNo, "b_unit_split_json");

  return {
    kind: "entry",
    entry: {
      surface,
      leftId,
      rightId,
      cost,
      pos,
      reading,
      ...(dictionaryForm !== undefined ? { dictionaryForm } : {}),
      ...(normalizedForm !== undefined ? { normalizedForm } : {}),
      ...(aUnitSplit !== undefined ? { aUnitSplit } : {}),
      ...(bUnitSplit !== undefined ? { bUnitSplit } : {})
    }
  };
}

function parseLemmaRow(fileName: string, lineNo: number, fields: readonly string[]): LemmaRow {
  const surface = fields[1]!;
  const reading = fields[2]!;
  const pos1 = fields[3]!;
  const classKey = fields[7]!;
  if (surface === "") {
    throw new Error(`${fileName}:${lineNo}: surface (사전형) is required for kind=lemma rows.`);
  }
  if (reading === "") {
    throw new Error(`${fileName}:${lineNo}: reading is required for kind=lemma rows.`);
  }
  if (pos1 === "") {
    throw new Error(`${fileName}:${lineNo}: pos1 is required for kind=lemma rows.`);
  }
  if (classKey === "") {
    throw new Error(`${fileName}:${lineNo}: pos5 (활용 클래스) is required for kind=lemma rows.`);
  }
  requireEmptyCell(fields[9]!, "left_id", fileName, lineNo,
    "kind=lemma rows carry no connection IDs; leave left_id empty (IDs come from the template).");
  requireEmptyCell(fields[10]!, "right_id", fileName, lineNo,
    "kind=lemma rows carry no connection IDs; leave right_id empty (IDs come from the template).");
  requireEmptyCell(fields[12]!, "dictionary_form", fileName, lineNo,
    "kind=lemma rows use surface as the dictionary form; leave dictionary_form empty.");
  requireEmptyCell(fields[14]!, "a_unit_split_json", fileName, lineNo,
    "kind=lemma rows are single morphemes; leave a_unit_split_json empty.");
  requireEmptyCell(fields[15]!, "b_unit_split_json", fileName, lineNo,
    "kind=lemma rows are single morphemes; leave b_unit_split_json empty.");

  const cost = parseIntStrict(fields[11]!, fileName, lineNo, "cost");
  const pos = [pos1, fields[4]!, fields[5]!, fields[6]!].map((cell) => (cell === "" ? "*" : cell));
  const normalizedForm = emptyToUndefined(fields[13]!);
  return {
    fileName, lineNo, surface, reading, pos, classKey, cost,
    ...(normalizedForm !== undefined ? { normalizedForm } : {})
  };
}

function requireEmptyCell(
  value: string,
  column: string,
  fileName: string,
  lineNo: number,
  reason: string
): void {
  if (value !== "") {
    throw new Error(`${fileName}:${lineNo}: ${column} must be empty for kind=lemma rows — ${reason}`);
  }
}

function parseIntStrict(raw: string, fileName: string, lineNo: number, column: string): number {
  if (!/^-?\d+$/u.test(raw)) {
    throw new Error(
      `${fileName}:${lineNo}: ${column} must be a base-10 integer, got "${raw}".`
    );
  }
  return Number.parseInt(raw, 10);
}

function parseSplitJson(
  raw: string,
  fileName: string,
  lineNo: number,
  column: string
): SplitComponentRef[] | undefined {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "[]") {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `${fileName}:${lineNo}: ${column} is not valid JSON (${(error as Error).message}).`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName}:${lineNo}: ${column} must be a JSON array.`);
  }
  if (parsed.length === 0) {
    return undefined;
  }
  return parsed.map((item, componentIndex) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`${fileName}:${lineNo}: ${column}[${componentIndex}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    const { surface, reading, pos } = record;
    if (typeof surface !== "string") {
      throw new Error(`${fileName}:${lineNo}: ${column}[${componentIndex}].surface must be a string.`);
    }
    if (typeof reading !== "string") {
      throw new Error(`${fileName}:${lineNo}: ${column}[${componentIndex}].reading must be a string.`);
    }
    if (!Array.isArray(pos) || pos.length !== POS_DEPTH || !pos.every((value) => typeof value === "string")) {
      throw new Error(
        `${fileName}:${lineNo}: ${column}[${componentIndex}].pos must be an array of exactly ${POS_DEPTH} strings.`
      );
    }
    return { surface, reading, pos: pos as string[] };
  });
}

function emptyToUndefined(raw: string): string | undefined {
  return raw === "" ? undefined : raw;
}

function linkKey(surface: string, pos1: string | undefined): string {
  return `${surface}\t${pos1 ?? ""}`;
}
