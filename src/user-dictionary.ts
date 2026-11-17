import type { UserLexiconEntry } from "./analyzer/dictionary.js";

export interface UserDictEntry {
  readonly japanese: string;
  readonly korean?: string;
  readonly reading?: string;
  readonly category: string;
}

const PERSON_COST = 6000;
const PERSON_VARIANTS = [
  { subcategory: "一般", leftId: 4790, rightId: 4789 },
  { subcategory: "名", leftId: 4789, rightId: 4789 },
  { subcategory: "姓", leftId: 4790, rightId: 4790 },
] as const;

export class UserDictionary {
  readonly entries: readonly UserDictEntry[];
  private _lexicon: UserLexiconEntry[] | undefined;
  private _koreanOverrides: Map<string, string> | undefined;

  constructor(entries: readonly UserDictEntry[]) {
    this.entries = entries;
  }

  get lexiconEntries(): UserLexiconEntry[] {
    if (this._lexicon === undefined) {
      this._lexicon = this.entries.flatMap((entry) => {
        const reading = entry.reading || entry.japanese;
        return PERSON_VARIANTS.map((variant) => ({
          surface: entry.japanese,
          leftId: variant.leftId,
          rightId: variant.rightId,
          cost: PERSON_COST,
          pos: ["名詞", "固有名詞", "人名", variant.subcategory, "*", "*"] as readonly string[],
          reading,
        }));
      });
    }
    return this._lexicon;
  }

  get koreanOverrides(): Map<string, string> {
    if (this._koreanOverrides === undefined) {
      this._koreanOverrides = new Map();
      for (const entry of this.entries) {
        if (entry.korean) {
          this._koreanOverrides.set(entry.japanese, entry.korean);
        }
      }
    }
    return this._koreanOverrides;
  }

  static empty(): UserDictionary {
    return new UserDictionary([]);
  }
}
