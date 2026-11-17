
export function renderAniTerminal(options: {
  readonly formal: boolean;
  readonly polite: boolean;
  readonly past: boolean;
}): string {
  if (options.past) {
    if (options.formal && options.polite) return "아니었습니다";
    if (options.formal && !options.polite) return "아니었다";
    if (!options.formal && options.polite) return "아니었어요";
    return "아니었어";
  }
  if (options.formal && options.polite) return "아닙니다";
  if (options.formal && !options.polite) return "아니다";
  if (!options.formal && options.polite) return "아니에요";
  return "아니야";
}
