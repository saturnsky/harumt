
export type StreamDecision =
  | { stream: "narration" }
  | { stream: "dialogue"; register: "formal" | "casual" };

export function decideRegisters(sentences: string[]): StreamDecision[] {
  let quoteDepth = 0;
  const results: StreamDecision[] = [];

  for (const sentence of sentences) {
    const trimmed = sentence.trim();

    if (terminalIsInQuote(trimmed, quoteDepth)) {
      results.push({ stream: "dialogue", register: decideDialogueRegister(trimmed) });
    } else {
      results.push({ stream: "narration" });
    }

    quoteDepth += quoteBalance(trimmed);
    if (quoteDepth < 0) quoteDepth = 0;
  }

  return results;
}

function quoteBalance(text: string): number {
  let b = 0;
  for (const ch of text) {
    if (ch === "「" || ch === "『") b++;
    else if (ch === "」" || ch === "』") b--;
  }
  return b;
}

function terminalIsInQuote(text: string, initialDepth: number): boolean {
  let depth = initialDepth;
  let lastContentInQuote = false;
  for (const ch of text) {
    if (ch === "「" || ch === "『") {
      depth++;
    } else if (ch === "」" || ch === "』") {
      depth--;
    } else if (depth > 0 && !isPunctOrSpace(ch)) {
      lastContentInQuote = true;
    } else if (depth <= 0 && !isPunctOrSpace(ch)) {
      lastContentInQuote = false;
    }
  }
  return lastContentInQuote;
}

const PUNCT_SPACE = new Set(" \t　。、！？!?）】》〉〕");
function isPunctOrSpace(ch: string): boolean {
  return PUNCT_SPACE.has(ch);
}

function decideDialogueRegister(sentence: string): "formal" | "casual" {
  const inner = sentence.replace(/[。！？!?」』）】》〉〕"')\]\s]+$/, "");

  if (/(?:ます|です|ました|でした)[よねかわさ]?$/.test(inner)) {
    return "casual";
  }

  if (/[のん](?:だ|な)[よねわ]$/.test(inner)) {
    return "formal";
  }

  if (/[のん](?:だ|だった)$/.test(inner)) {
    return "formal";
  }

  return "casual";
}
