import { lookupSetMatches, type LookupTables } from "../../../lookup-tables.js";
import type { AttributiveBoundaryPayload, QuoteAttributiveFlavor } from "./grammar.js";

const COHORTATIVE_HEAD_LOOKUP = "quote_attributive_cohortative_heads";
const BARE_CARRIER_VOLITIONAL_QUOTE_CONTENT_HEAD_LOOKUP =
  "quote_attributive_bare_carrier_volitional_quote_content_heads";
const BARE_CARRIER_VOLITIONAL_INTENT_CONTENT_HEAD_LOOKUP =
  "quote_attributive_bare_carrier_volitional_intent_content_heads";
const BARE_CARRIER_UTTERANCE_CONTENT_HEAD_LOOKUP =
  "quote_attributive_bare_carrier_utterance_content_heads";

export interface QuoteAttributiveHeadFrame {
  readonly headSurface: string;
  readonly headDictionaryForm: string;
  readonly flavor: QuoteAttributiveFlavor;
  readonly bareQuoteVolitionalContentFlavor?: QuoteAttributiveFlavor;
  readonly quotedContentHeadBinding?: true;
}

function namedLookup(lookups: LookupTables, name: string): ReadonlySet<string> {
  const set = lookups.named(name);
  if (set === undefined) {
    throw new Error(`missing named lookup: ${name}`);
  }
  return set;
}

function headMatches(
  set: ReadonlySet<string>,
  head: { readonly surface: string; readonly dictionaryForm: string }
): boolean {
  return lookupSetMatches(set, head.dictionaryForm || head.surface) || lookupSetMatches(set, head.surface);
}

export function quoteAttributiveHeadFrameForBoundary(
  boundary: AttributiveBoundaryPayload | undefined,
  lookups: LookupTables
): QuoteAttributiveHeadFrame | undefined {
  if (boundary === undefined) return undefined;
  const head = boundary.head;
  const cohortativeHeads = namedLookup(lookups, COHORTATIVE_HEAD_LOOKUP);
  const headDictionaryForm = head.dictionaryForm || head.surface;
  return {
    headSurface: head.surface,
    headDictionaryForm,
    flavor: headMatches(cohortativeHeads, head) ? "cohortative_quote" : "intentional_modifier",
    ...(boundary.bareQuoteVolitionalContentFlavor === undefined
      ? {}
      : { bareQuoteVolitionalContentFlavor: boundary.bareQuoteVolitionalContentFlavor }),
    ...(boundary.quotedContentHeadBinding === true ? { quotedContentHeadBinding: true } as const : {})
  };
}

export function bareQuoteCarrierVolitionalContentFlavor(
  head: { readonly surface: string; readonly dictionaryForm: string },
  lookups: LookupTables
): QuoteAttributiveFlavor | null {
  if (headMatches(namedLookup(lookups, BARE_CARRIER_VOLITIONAL_INTENT_CONTENT_HEAD_LOOKUP), head)) {
    return "intentional_modifier";
  }
  if (headMatches(namedLookup(lookups, BARE_CARRIER_VOLITIONAL_QUOTE_CONTENT_HEAD_LOOKUP), head)) {
    return "cohortative_quote";
  }
  return null;
}

export function bareQuoteCarrierBindsUtteranceContentHead(
  head: { readonly surface: string; readonly dictionaryForm: string },
  lookups: LookupTables
): boolean {
  return headMatches(namedLookup(lookups, BARE_CARRIER_UTTERANCE_CONTENT_HEAD_LOOKUP), head);
}
