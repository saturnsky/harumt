import type { AnnotatedText, AnnotationEntry } from "../types/annotation.js";
import * as interpunct from "./interpunct.js";
import * as rubyEmph from "./ruby-emph.js";
import * as transparentPause from "./transparent-pause.js";

export type TransformForwardOptions = transparentPause.TransparentPauseForwardOptions;
export const provisionalTransparentPauseRunSpans = transparentPause.provisionalTransparentPauseRunSpans;

export function forward<A extends AnnotationEntry>(
  input: AnnotatedText<A>,
  options: TransformForwardOptions = {},
): AnnotatedText<AnnotationEntry> {
  let result: AnnotatedText<AnnotationEntry> = input;
  result = rubyEmph.forward(result);
  result = transparentPause.forward(result, options);
  result = interpunct.forward(result);
  return result;
}

export function backward(
  input: AnnotatedText<AnnotationEntry>
): AnnotatedText<AnnotationEntry> {
  let result: AnnotatedText<AnnotationEntry> = input;
  result = interpunct.backward(result);
  result = transparentPause.backward(result);
  result = rubyEmph.backward(result);
  return result;
}
