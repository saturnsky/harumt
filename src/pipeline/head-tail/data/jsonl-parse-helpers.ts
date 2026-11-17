import { irregularType, type IrregularType } from "../../../generator/conjugator.js";

export type ParseErrorContext = (field: string, lineNumber: number) => string;

export function makeParseErrorContext(label: string, relativePath: string): ParseErrorContext {
  return (field, lineNumber) => `invalid ${label} ${field} at ${relativePath}:${lineNumber}`;
}

export function parseString(value: unknown, field: string, ctx: ParseErrorContext, lineNumber: number): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw new Error(ctx(field, lineNumber));
}

export function parseBoolean(value: unknown, field: string, ctx: ParseErrorContext, lineNumber: number): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  throw new Error(ctx(field, lineNumber));
}

export function parseStringArray(
  value: unknown,
  field: string,
  ctx: ParseErrorContext,
  lineNumber: number,
  options?: { readonly allowEmpty: boolean },
): readonly string[] {
  if (
    Array.isArray(value) &&
    (options?.allowEmpty || value.length > 0) &&
    value.every((item): item is string => typeof item === "string" && item.length > 0)
  ) {
    return value;
  }
  throw new Error(ctx(field, lineNumber));
}

export function parseNullableIrregular(value: unknown, field: string, ctx: ParseErrorContext, lineNumber: number): IrregularType | null {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" && value.length > 0) {
    const parsed = irregularType(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  throw new Error(ctx(field, lineNumber));
}
