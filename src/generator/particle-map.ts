
import { selectParticle, type ParticleKey } from "./particles.js";


import { POS1, 終助詞, 準体助詞, 接続助詞 } from "../types/pos.js";
export interface ParticleMapToken {
  readonly surface: string;
  readonly pos: number;
}

export const NI_ABSORB_ENDINGS: ReadonlySet<string> = new Set([
  "까지",
  "바로",
  "함께",
  "곧",
  "동시에",
  "마다",
  "먼저",
  "서로",
  "대로",
  "데다가",
  "점차",
  "위해",
  "때문에"
]);

export const NI_REMAP_EURO: ReadonlySet<string> = new Set(["실제", "정말"]);

export const ALLOMORPH_MAP: Readonly<Record<string, ParticleKey>> = {
  "は": "은/는",
  "が": "이/가",
  "を": "을/를",
  "と": "과/와",
  "や": "이나/나",
  "の": "의",
  "も": "도",
  "だけ": "만",
  "へ": "으로/로",
  "として": "으로서/로서",
  "であれば": "이라면/라면",
  "であっても": "이더라도/더라도",
  "こそ": "이야말로/야말로",
  "たりとも": "이라도/라도",
  "をもって": "으로써/로써",
  "をもとに": "을 바탕으로/를 바탕으로",
  "をはじめ": "을 비롯해/를 비롯해",
  "を問わず": "을 불문하고/를 불문하고",
  "を中心に": "을 중심으로/를 중심으로",
  "を中心として": "을 중심으로/를 중심으로",
  "を通して": "을 통해/를 통해",
  "を通し": "을 통해/를 통해",
  "をめぐって": "을 둘러싸고/를 둘러싸고",
  "をめぐっ": "을 둘러싸고/를 둘러싸고"
};

export const FIXED_MAP: Readonly<Record<string, string>> = {
  "に": "에",
  "だって": "도",
  "で": "에서",
  "から": "에서",
  "からして": "부터가",
  "まで": "까지",
  "より": "보다",
  "など": "등",
  "しか": "밖에",
  "のみ": "만",
  "ばかり": "만",
  "ずつ": "씩",
  "さえ": "조차",
  "すら": "조차",
  "のように": "처럼",
  "によって": "에 의해",
  "について": "에 대해",
  "については": "에 대해서는",
  "についても": "에 대해서도",
  "にとって": "에 있어서",
  "にとっては": "에 있어서는",
  "にとっても": "에 있어서도",
  "によっては": "에 따라서는",
  "によっても": "에 따라서도",
  "において": "에서",
  "における": "에서의",
  "にて": "에서",
  "に応じて": "에 따라",
  "に応じては": "에 따라서는",
  "に応じても": "에 따라서도",
  "に応じて_response": "에 응해",
  "に応じ_response": "에 응해",
  "に関して": "에 관해",
  "に関しては": "에 관해서는",
  "に関しても": "에 관해서도",
  "にしては": "치고는",
  "にしても": "치고도",
  "にもかかわらず": "에도 불구하고",
  "にかかわらず": "에 관계없이",
  "のほか": " 외에",
  "のほかに": " 외에",
  "のほかにも": " 외에도",
  "にしてみれば": " 입장에서는"
};

export const SKIP_SUBPOS: ReadonlySet<number> = new Set([接続助詞, 終助詞, 準体助詞]);

export function mapParticle(
  token: ParticleMapToken,
  precedingKorean: string,
  canonicalSurface?: string
): string | null {
  const pos1 = token.pos & POS1;
  if (pos1 !== 0 && SKIP_SUBPOS.has(pos1)) {
    return null;
  }

  const surface = canonicalSurface ?? token.surface;

  if ((surface === "に" || surface === "で") && Array.from(NI_ABSORB_ENDINGS).some((ending) => precedingKorean.endsWith(ending))) {
    return null;
  }

  if (surface === "に" && Array.from(NI_REMAP_EURO).some((ending) => precedingKorean.endsWith(ending))) {
    return selectParticle(precedingKorean, "으로/로");
  }

  const particleKey = ALLOMORPH_MAP[surface];
  if (particleKey !== undefined) {
    return selectParticle(precedingKorean, particleKey);
  }

  const fixed = FIXED_MAP[surface];
  if (fixed !== undefined) {
    return fixed;
  }

  for (const [key, allomorph] of Object.entries(ALLOMORPH_MAP)) {
    if (surface.startsWith(key) && surface.length > key.length) {
      const tail = particleTail(surface.slice(key.length));
      return `${selectParticle(precedingKorean, allomorph)}${tail}`;
    }
  }
  for (const [key, fixedValue] of Object.entries(FIXED_MAP)) {
    if (surface.startsWith(key) && surface.length > key.length) {
      const tail = particleTail(surface.slice(key.length));
      return `${fixedValue}${tail}`;
    }
  }

  return null;
}

const PARTICLE_ELONGATION_TAIL = /^[ぁぃぅぇぉァィゥェォー]+$/u;

function particleTail(tail: string): string {
  return PARTICLE_ELONGATION_TAIL.test(tail) ? "~" : tail;
}
