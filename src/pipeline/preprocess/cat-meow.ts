
import type { RuntimeHaruToken } from "../../types/token.js";
import { convertPunctuation } from "../rendering/punctuation.js";
import { POS0, 助詞, 補助記号, 名詞, 名詞_普通名詞 } from "../../types/pos.js";

const meowSpacePattern = /냐 (?=냐)/gu;
const pureMeowRunPattern = /^(?<body>(?:にゃ|ニャ)+)(?<punct>[。！？!?]+)?$/u;
const literalMeowRunPattern = /(?<![가-힣])냐{2,}(?![가-힣])/gu;

export function collapseMeowSpacing(text: string): string {
  return text.replace(meowSpacePattern, "냐").replace(literalMeowRunPattern, (match) => `${"냐".repeat(Math.max(0, match.length - 1))}냥`);
}

export function translatePureMeowRun(text: string): string | undefined {
  const match = pureMeowRunPattern.exec(text);
  if (match?.groups === undefined) {
    return undefined;
  }
  const body = match.groups.body ?? "";
  const punct = match.groups.punct ?? "";
  const count = Math.floor(body.length / 2);
  if (count <= 0) {
    return undefined;
  }
  return convertPunctuation(`${"냐".repeat(Math.max(0, count - 1))}냥${punct}`);
}

export function normalizeCatMeowTokens(tokens: RuntimeHaruToken[]): void {
  for (const [index, token] of tokens.entries()) {
    if (!isMeowParticle(token)) {
      continue;
    }
    const prev = index > 0 ? tokens[index - 1] : undefined;
    const next = index + 1 < tokens.length ? tokens[index + 1] : undefined;
    if (!(isMeowLike(prev) || isMeowLike(next) || (isPunctOrNone(prev) && isPunctOrNone(next)))) {
      continue;
    }
    token.surface = "냐";
    token.dictionaryForm = "냐";
    token.reading = "냐";
    token.pos = 名詞_普通名詞;
  }
}

function isMeowParticle(token: RuntimeHaruToken | undefined): boolean {
  return token !== undefined && (token.surface === "にゃ" || token.surface === "ニャ") && (token.pos & POS0) === 助詞;
}

function isMeowLike(token: RuntimeHaruToken | undefined): boolean {
  return isMeowParticle(token) || (token !== undefined && token.surface === "냐" && (token.pos & POS0) === 名詞);
}

function isPunctOrNone(token: RuntimeHaruToken | undefined): boolean {
  return token === undefined || (token.pos & POS0) === 補助記号;
}
