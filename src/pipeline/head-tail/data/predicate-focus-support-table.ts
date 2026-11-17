import { lazyValue, type DataLoader } from "../../../data-loader.js";
import { resolveDataSection } from "../../../dictionary/data-section.js";

const PREDICATE_FOCUS_SUPPORT_TABLE_RELATIVE_PATH = "head-tail/predicate_focus_support.jsonl";

export type NegationFocusParticle = "는" | "도" | "조차";
export const NEGATION_FOCUS_PARTICLE_VALUES = [
  "는",
  "도",
  "조차"
] as const satisfies readonly NegationFocusParticle[];

export type AffirmativeSupportFocus = "contrastive" | "extreme" | "sufficiency";
export const AFFIRMATIVE_SUPPORT_FOCUS_VALUES = [
  "contrastive",
  "extreme",
  "sufficiency"
] as const satisfies readonly AffirmativeSupportFocus[];

export type FocusSupportForm = "hypothetical";
export const FOCUS_SUPPORT_FORM_VALUES = [
  "hypothetical"
] as const satisfies readonly FocusSupportForm[];

const NEGATION_FOCUS_PARTICLES: ReadonlySet<string> = new Set<string>(NEGATION_FOCUS_PARTICLE_VALUES);
const AFFIRMATIVE_SUPPORT_FOCUSES: ReadonlySet<string> = new Set<string>(AFFIRMATIVE_SUPPORT_FOCUS_VALUES);
const FOCUS_SUPPORT_FORMS: ReadonlySet<string> = new Set<string>(FOCUS_SUPPORT_FORM_VALUES);
const ROW_KEYS = new Set(["marker", "polarity", "focus", "supportForm"]);

interface PredicateFocusSupportTable {
  readonly negative: ReadonlyMap<string, NegationFocusParticle>;
  readonly affirmative: ReadonlyMap<string, ReadonlyMap<FocusSupportForm | "", AffirmativeSupportFocus>>;
}

let _cache: string | undefined;

export async function initPredicateFocusSupportData(loader: DataLoader): Promise<void> {
  const filePath = loader.joinPath(resolveDataSection("dict"), PREDICATE_FOCUS_SUPPORT_TABLE_RELATIVE_PATH);
  _cache = await loader.readTextFile(filePath);
}

const PREDICATE_FOCUS_SUPPORT_TABLE: PredicateFocusSupportTable = lazyValue(() => loadPredicateFocusSupportTable());

export function negationFocusParticleForMarker(
  markerSurface: string | undefined
): NegationFocusParticle | null {
  return markerSurface === undefined
    ? null
    : PREDICATE_FOCUS_SUPPORT_TABLE.negative.get(markerSurface) ?? null;
}

export function affirmativeSupportFocusForMarker(
  markerSurface: string | undefined,
  supportForm: FocusSupportForm | null
): AffirmativeSupportFocus | null {
  if (markerSurface === undefined) {
    return null;
  }
  const byForm = PREDICATE_FOCUS_SUPPORT_TABLE.affirmative.get(markerSurface);
  if (byForm === undefined) {
    return null;
  }
  return (supportForm === null ? undefined : byForm.get(supportForm)) ?? byForm.get("") ?? null;
}

export function predicateFocusSupportMarkers(): ReadonlySet<string> {
  return PREDICATE_FOCUS_SUPPORT_MARKERS;
}

const PREDICATE_FOCUS_SUPPORT_MARKERS: ReadonlySet<string> = lazyValue(() => new Set([
  ...PREDICATE_FOCUS_SUPPORT_TABLE.negative.keys(),
  ...PREDICATE_FOCUS_SUPPORT_TABLE.affirmative.keys()
]));

function loadPredicateFocusSupportTable(): PredicateFocusSupportTable {
  if (_cache === undefined) throw new Error("Data not initialized");
  const negative = new Map<string, NegationFocusParticle>();
  const affirmative = new Map<string, Map<FocusSupportForm | "", AffirmativeSupportFocus>>();
  const fail = (message: string, lineNumber: number): never => {
    throw new Error(`${message} at ${PREDICATE_FOCUS_SUPPORT_TABLE_RELATIVE_PATH}:${lineNumber}`);
  };
  for (const [index, rawLine] of _cache.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }
    const lineNumber = index + 1;
    const raw = JSON.parse(line) as { readonly [key: string]: unknown };
    for (const key of Object.keys(raw)) {
      if (!ROW_KEYS.has(key)) {
        fail(`unknown predicate focus support key '${key}'`, lineNumber);
      }
    }
    const marker = raw.marker;
    if (typeof marker !== "string" || marker.length === 0) {
      return fail("invalid predicate focus support marker", lineNumber);
    }
    if (raw.polarity === "negative") {
      if (raw.supportForm !== undefined) {
        fail("negative predicate focus support row cannot declare supportForm", lineNumber);
      }
      if (typeof raw.focus !== "string" || !NEGATION_FOCUS_PARTICLES.has(raw.focus)) {
        fail("invalid negative predicate focus", lineNumber);
      }
      if (negative.has(marker)) {
        fail(`duplicate negative predicate focus marker '${marker}'`, lineNumber);
      }
      negative.set(marker, raw.focus as NegationFocusParticle);
      continue;
    }
    if (raw.polarity !== "affirmative") {
      fail("invalid predicate focus support polarity", lineNumber);
    }
    if (typeof raw.focus !== "string" || !AFFIRMATIVE_SUPPORT_FOCUSES.has(raw.focus)) {
      fail("invalid affirmative predicate focus", lineNumber);
    }
    if (raw.supportForm !== undefined && (typeof raw.supportForm !== "string" || !FOCUS_SUPPORT_FORMS.has(raw.supportForm))) {
      fail("invalid predicate focus supportForm", lineNumber);
    }
    const formKey = (raw.supportForm ?? "") as FocusSupportForm | "";
    const byForm = affirmative.get(marker) ?? new Map<FocusSupportForm | "", AffirmativeSupportFocus>();
    if (byForm.has(formKey)) {
      fail(`duplicate affirmative predicate focus '${marker}'/${formKey || "*"}`, lineNumber);
    }
    byForm.set(formKey, raw.focus as AffirmativeSupportFocus);
    affirmative.set(marker, byForm);
  }
  return { negative, affirmative };
}
