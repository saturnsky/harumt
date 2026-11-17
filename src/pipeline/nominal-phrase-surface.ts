
export interface NounPhraseSurfacePart {
  readonly korean: string;
  readonly attachLeft?: boolean | undefined;
  readonly attachRight?: boolean | undefined;
  readonly isSuffixNoun1Char: boolean;
  readonly isNominal: boolean;
}

export function shouldInsertSpaceBetweenSurfaceParts(
  prev: { readonly attachRight?: boolean | undefined; readonly isNominal: boolean },
  curr: { readonly attachLeft?: boolean | undefined; readonly isSuffixNoun1Char: boolean }
): boolean {
  if (curr.attachLeft === true) {
    return false;
  }
  if (prev.attachRight === true) {
    return false;
  }
  if (curr.isSuffixNoun1Char && prev.isNominal) {
    return false;
  }
  return true;
}

export function joinNounPhraseSurface(parts: readonly NounPhraseSurfacePart[]): string {
  if (parts.length === 0) {
    return "";
  }
  let out = parts[0]!.korean;
  for (let i = 1; i < parts.length; i++) {
    out += (shouldInsertSpaceBetweenSurfaceParts(parts[i - 1]!, parts[i]!) ? " " : "") + parts[i]!.korean;
  }
  return out;
}

export function pronominalNoNominalHeadSurface(options: {
  readonly formal: boolean;
  readonly fullForm: boolean;
}): string {
  return options.formal || options.fullForm ? "것" : "거";
}

export interface PronominalNoHeadStemBase {
  readonly prefix: string;
}

export function pronominalNoHeadStemSurface(
  base: PronominalNoHeadStemBase,
  options: { readonly formal: boolean; readonly fullForm: boolean }
): string {
  const head = pronominalNoNominalHeadSurface(options);
  if (base.prefix.length === 0) {
    return head;
  }
  return joinNounPhraseSurface([
    { korean: base.prefix, isSuffixNoun1Char: false, isNominal: false },
    { korean: head, isSuffixNoun1Char: false, isNominal: true }
  ]);
}
