
export const POS0: number = 0b11111;
export const POS1_SHIFT: number = 5;
export const POS1: number = 0b11111 << POS1_SHIFT;
export const POS2_SHIFT: number = 10;
export const POS2: number = 0b1111 << POS2_SHIFT;
export const POS3_SHIFT: number = 14;
export const POS3: number = 0b11 << POS3_SHIFT;
export const POS4_SHIFT: number = 16;
export const POS4: number = 0b1111111 << POS4_SHIFT;
export const POS5_SHIFT: number = 23;
export const POS5: number = 0b11111111 << POS5_SHIFT;
export const POS5A_SHIFT: number = 23;
export const POS5A: number = 0b1111 << POS5A_SHIFT;
export const POS5B_SHIFT: number = 27;
export const POS5B: number = 0b1111 << POS5B_SHIFT;

export const 代名詞: number = 1;
export const 副詞: number = 2;
export const 助動詞: number = 3;
export const 助詞: number = 4;
export const 動詞: number = 5;
export const 名詞: number = 6;
export const 形容詞0: number = 7;
export const 形状詞: number = 8;
export const 感動詞: number = 9;
export const 接尾辞: number = 10;
export const 接続詞: number = 11;
export const 接頭辞: number = 12;
export const 連体詞: number = 13;
export const 補助記号: number = 14;
export const 記号: number = 15;
export const 空白: number = 16;

export const POS0_NAME: string[] = [
  "*",
  "代名詞",
  "副詞",
  "助動詞",
  "助詞",
  "動詞",
  "名詞",
  "形容詞",
  "形状詞",
  "感動詞",
  "接尾辞",
  "接続詞",
  "接頭辞",
  "連体詞",
  "補助記号",
  "記号",
  "空白",
];

export const 係助詞: number = 1 << POS1_SHIFT;
export const 副助詞: number = 2 << POS1_SHIFT;
export const 接続助詞: number = 3 << POS1_SHIFT;
export const 格助詞: number = 4 << POS1_SHIFT;
export const 準体助詞: number = 5 << POS1_SHIFT;
export const 終助詞: number = 6 << POS1_SHIFT;
export const 非自立可能: number = 7 << POS1_SHIFT;
export const 普通名詞: number = 8 << POS1_SHIFT;
export const 固有名詞: number = 9 << POS1_SHIFT;
export const 助動詞語幹: number = 10 << POS1_SHIFT;
export const 数詞: number = 11 << POS1_SHIFT;
export const タリ: number = 12 << POS1_SHIFT;
export const フィラー: number = 13 << POS1_SHIFT;
export const 動詞的: number = 14 << POS1_SHIFT;
export const 名詞的: number = 15 << POS1_SHIFT;
export const 形容詞的: number = 16 << POS1_SHIFT;
export const 形状詞的: number = 17 << POS1_SHIFT;
export const 句点: number = 18 << POS1_SHIFT;
export const 括弧閉: number = 19 << POS1_SHIFT;
export const 括弧開: number = 20 << POS1_SHIFT;
export const 読点: number = 21 << POS1_SHIFT;
export const ＡＡ: number = 22 << POS1_SHIFT;
export const 文字: number = 23 << POS1_SHIFT;

export const POS1_NAME: string[] = [
  "*",
  "係助詞",
  "副助詞",
  "接続助詞",
  "格助詞",
  "準体助詞",
  "終助詞",
  "非自立可能",
  "普通名詞",
  "固有名詞",
  "助動詞語幹",
  "数詞",
  "タリ",
  "フィラー",
  "動詞的",
  "名詞的",
  "形容詞的",
  "形状詞的",
  "句点",
  "括弧閉",
  "括弧開",
  "読点",
  "ＡＡ",
  "文字",
];

export const サ変可能: number = 1 << POS2_SHIFT;
export const サ変形状詞可能: number = 2 << POS2_SHIFT;
export const 副詞可能: number = 3 << POS2_SHIFT;
export const 助数詞可能: number = 4 << POS2_SHIFT;
export const 形状詞可能: number = 5 << POS2_SHIFT;
export const 人名: number = 6 << POS2_SHIFT;
export const 地名: number = 7 << POS2_SHIFT;
export const 助数詞: number = 8 << POS2_SHIFT;
export const 顔文字: number = 9 << POS2_SHIFT;

export const POS2_NAME: string[] = [
  "*",
  "サ変可能",
  "サ変形状詞可能",
  "副詞可能",
  "助数詞可能",
  "形状詞可能",
  "人名",
  "地名",
  "助数詞",
  "顔文字",
];

export const 名: number = 1 << POS3_SHIFT;
export const 姓: number = 2 << POS3_SHIFT;
export const 国: number = 3 << POS3_SHIFT;

export const POS3_NAME: string[] = [
  "*",
  "名",
  "姓",
  "国",
];

export const 上一段_ア行: number = 0b0000010 << POS4_SHIFT;
export const 上一段_カ行: number = 0b0000011 << POS4_SHIFT;
export const 上一段_ガ行: number = 0b0000100 << POS4_SHIFT;
export const 上一段_ザ行: number = 0b0000101 << POS4_SHIFT;
export const 上一段_タ行: number = 0b0000110 << POS4_SHIFT;
export const 上一段_ナ行: number = 0b0001000 << POS4_SHIFT;
export const 上一段_ハ行: number = 0b0001001 << POS4_SHIFT;
export const 上一段_バ行: number = 0b0001011 << POS4_SHIFT;
export const 上一段_マ行: number = 0b0001100 << POS4_SHIFT;
export const 上一段_ラ行: number = 0b0001101 << POS4_SHIFT;
export const 上一段_MIN: number = 上一段_ア行;
export const 上一段_MAX: number = 上一段_ラ行;
export const 形容詞4: number = 0b0001110 << POS4_SHIFT;
export const 無変化型: number = 0b0001111 << POS4_SHIFT;
export const 下一段_ア行: number = 0b0010010 << POS4_SHIFT;
export const 下一段_カ行: number = 0b0010011 << POS4_SHIFT;
export const 下一段_ガ行: number = 0b0010100 << POS4_SHIFT;
export const 下一段_サ行: number = 0b0010101 << POS4_SHIFT;
export const 下一段_ザ行: number = 0b0010110 << POS4_SHIFT;
export const 下一段_タ行: number = 0b0010111 << POS4_SHIFT;
export const 下一段_ダ行: number = 0b0011000 << POS4_SHIFT;
export const 下一段_ナ行: number = 0b0011001 << POS4_SHIFT;
export const 下一段_ハ行: number = 0b0011010 << POS4_SHIFT;
export const 下一段_バ行: number = 0b0011011 << POS4_SHIFT;
export const 下一段_マ行: number = 0b0011100 << POS4_SHIFT;
export const 下一段_ラ行: number = 0b0011101 << POS4_SHIFT;
export const 下一段_MIN: number = 下一段_ア行;
export const 下一段_MAX: number = 下一段_ラ行;
export const カ行変格: number = 0b0011110 << POS4_SHIFT;
export const サ行変格: number = 0b0011111 << POS4_SHIFT;
export const 五段_カ行: number = 0b0100000 << POS4_SHIFT;
export const 五段_ガ行: number = 0b0100001 << POS4_SHIFT;
export const 五段_サ行: number = 0b0100010 << POS4_SHIFT;
export const 五段_タ行: number = 0b0100011 << POS4_SHIFT;
export const 五段_ナ行: number = 0b0100100 << POS4_SHIFT;
export const 五段_バ行: number = 0b0100101 << POS4_SHIFT;
export const 五段_マ行: number = 0b0100110 << POS4_SHIFT;
export const 五段_ラ行: number = 0b0100111 << POS4_SHIFT;
export const 五段_ワア行: number = 0b0101000 << POS4_SHIFT;
export const 五段_MIN: number = 五段_カ行;
export const 五段_MAX: number = 五段_ワア行;
export const 助動詞_ジャ: number = 0b0110000 << POS4_SHIFT;
export const 助動詞_タ: number = 0b0110001 << POS4_SHIFT;
export const 助動詞_タイ: number = 0b0110010 << POS4_SHIFT;
export const 助動詞_ダ: number = 0b0110011 << POS4_SHIFT;
export const 助動詞_デス: number = 0b0110100 << POS4_SHIFT;
export const 助動詞_ドス: number = 0b0110101 << POS4_SHIFT;
export const 助動詞_ナイ: number = 0b0110110 << POS4_SHIFT;
export const 助動詞_ナンダ: number = 0b0110111 << POS4_SHIFT;
export const 助動詞_ヌ: number = 0b0111000 << POS4_SHIFT;
export const 助動詞_ヘン: number = 0b0111001 << POS4_SHIFT;
export const 助動詞_マイ: number = 0b0111010 << POS4_SHIFT;
export const 助動詞_マス: number = 0b0111011 << POS4_SHIFT;
export const 助動詞_ヤ: number = 0b0111100 << POS4_SHIFT;
export const 助動詞_ヤス: number = 0b0111101 << POS4_SHIFT;
export const 助動詞_ラシイ: number = 0b0111110 << POS4_SHIFT;
export const 助動詞_レル: number = 0b0111111 << POS4_SHIFT;
export const 助動詞_MIN: number = 助動詞_ジャ;
export const 助動詞_MAX: number = 助動詞_レル;
export const 文語カ行変格: number = 0b1000000 << POS4_SHIFT;
export const 文語サ行変格: number = 0b1000001 << POS4_SHIFT;
export const 文語ナ行変格: number = 0b1000010 << POS4_SHIFT;
export const 文語ラ行変格: number = 0b1000011 << POS4_SHIFT;
export const 文語形容詞_ク: number = 0b1000100 << POS4_SHIFT;
export const 文語形容詞_シク: number = 0b1000101 << POS4_SHIFT;
export const 文語形容詞_MIN: number = 文語形容詞_ク;
export const 文語形容詞_MAX: number = 文語形容詞_シク;
export const 文語上一段_ナ行: number = 0b1001001 << POS4_SHIFT;
export const 文語上一段_マ行: number = 0b1001010 << POS4_SHIFT;
export const 文語上一段_ワ行: number = 0b1001011 << POS4_SHIFT;
export const 文語上一段_MIN: number = 文語上一段_ナ行;
export const 文語上一段_MAX: number = 文語上一段_ワ行;
export const 文語上二段_タ行: number = 0b1001100 << POS4_SHIFT;
export const 文語上二段_ダ行: number = 0b1001101 << POS4_SHIFT;
export const 文語上二段_ハ行: number = 0b1001110 << POS4_SHIFT;
export const 文語上二段_バ行: number = 0b1001111 << POS4_SHIFT;
export const 文語上二段_ヤ行: number = 0b1010000 << POS4_SHIFT;
export const 文語上二段_ラ行: number = 0b1010001 << POS4_SHIFT;
export const 文語上二段_MIN: number = 文語上二段_タ行;
export const 文語上二段_MAX: number = 文語上二段_ラ行;
export const 文語下二段_ア行: number = 0b1010010 << POS4_SHIFT;
export const 文語下二段_カ行: number = 0b1010011 << POS4_SHIFT;
export const 文語下二段_ガ行: number = 0b1010100 << POS4_SHIFT;
export const 文語下二段_サ行: number = 0b1010101 << POS4_SHIFT;
export const 文語下二段_ザ行: number = 0b1010110 << POS4_SHIFT;
export const 文語下二段_タ行: number = 0b1010111 << POS4_SHIFT;
export const 文語下二段_ダ行: number = 0b1011000 << POS4_SHIFT;
export const 文語下二段_ナ行: number = 0b1011001 << POS4_SHIFT;
export const 文語下二段_ハ行: number = 0b1011010 << POS4_SHIFT;
export const 文語下二段_バ行: number = 0b1011011 << POS4_SHIFT;
export const 文語下二段_マ行: number = 0b1011100 << POS4_SHIFT;
export const 文語下二段_ヤ行: number = 0b1011101 << POS4_SHIFT;
export const 文語下二段_ラ行: number = 0b1011110 << POS4_SHIFT;
export const 文語下二段_ワ行: number = 0b1011111 << POS4_SHIFT;
export const 文語下二段_MIN: number = 文語下二段_ア行;
export const 文語下二段_MAX: number = 文語下二段_ワ行;
export const 文語助動詞_キ: number = 0b1100000 << POS4_SHIFT;
export const 文語助動詞_ケム: number = 0b1100001 << POS4_SHIFT;
export const 文語助動詞_ケリ: number = 0b1100010 << POS4_SHIFT;
export const 文語助動詞_ゴトシ: number = 0b1100011 << POS4_SHIFT;
export const 文語助動詞_ザマス: number = 0b1100100 << POS4_SHIFT;
export const 文語助動詞_ザンス: number = 0b1100101 << POS4_SHIFT;
export const 文語助動詞_ジ: number = 0b1100110 << POS4_SHIFT;
export const 文語助動詞_ズ: number = 0b1100111 << POS4_SHIFT;
export const 文語助動詞_タリ_完了: number = 0b1101000 << POS4_SHIFT;
export const 文語助動詞_タリ_断定: number = 0b1101001 << POS4_SHIFT;
export const 文語助動詞_ナリ_伝聞: number = 0b1101010 << POS4_SHIFT;
export const 文語助動詞_ナリ_断定: number = 0b1101011 << POS4_SHIFT;
export const 文語助動詞_ツ: number = 0b1101100 << POS4_SHIFT;
export const 文語助動詞_ヌ: number = 0b1101101 << POS4_SHIFT;
export const 文語助動詞_ベシ: number = 0b1101110 << POS4_SHIFT;
export const 文語助動詞_マジ: number = 0b1101111 << POS4_SHIFT;
export const 文語助動詞_ム: number = 0b1110000 << POS4_SHIFT;
export const 文語助動詞_ラシ: number = 0b1110001 << POS4_SHIFT;
export const 文語助動詞_ラム: number = 0b1110010 << POS4_SHIFT;
export const 文語助動詞_リ: number = 0b1110011 << POS4_SHIFT;
export const 文語助動詞_ンス: number = 0b1110100 << POS4_SHIFT;
export const 文語助動詞_MIN: number = 文語助動詞_キ;
export const 文語助動詞_MAX: number = 文語助動詞_ンス;
export const 文語四段_カ行: number = 0b1111000 << POS4_SHIFT;
export const 文語四段_ガ行: number = 0b1111001 << POS4_SHIFT;
export const 文語四段_サ行: number = 0b1111010 << POS4_SHIFT;
export const 文語四段_タ行: number = 0b1111011 << POS4_SHIFT;
export const 文語四段_ハ行: number = 0b1111100 << POS4_SHIFT;
export const 文語四段_バ行: number = 0b1111101 << POS4_SHIFT;
export const 文語四段_マ行: number = 0b1111110 << POS4_SHIFT;
export const 文語四段_ラ行: number = 0b1111111 << POS4_SHIFT;
export const 文語四段_MIN: number = 文語四段_カ行;
export const 文語四段_MAX: number = 文語四段_ラ行;

export const 文語活用_MIN: number = 文語カ行変格;
export const 文語活用_MAX: number = 文語四段_ラ行;

export function isBungoInflectClass(token: { readonly pos: number } | undefined): boolean {
  if (token === undefined) {
    return false;
  }
  const family = token.pos & POS4;
  return family >= 文語活用_MIN && family <= 文語活用_MAX;
}

export const POS4_NAME: (string | undefined)[] = [
  "*",
  undefined,
  "上一段-ア行",
  "上一段-カ行",
  "上一段-ガ行",
  "上一段-ザ行",
  "上一段-タ行",
  undefined,
  "上一段-ナ行",
  "上一段-ハ行",
  undefined,
  "上一段-バ行",
  "上一段-マ行",
  "上一段-ラ行",
  "形容詞",
  "無変化型",
  undefined,
  undefined,
  "下一段-ア行",
  "下一段-カ行",
  "下一段-ガ行",
  "下一段-サ行",
  "下一段-ザ行",
  "下一段-タ行",
  "下一段-ダ行",
  "下一段-ナ行",
  "下一段-ハ行",
  "下一段-バ行",
  "下一段-マ行",
  "下一段-ラ行",
  "カ行変格",
  "サ行変格",
  "五段-カ行",
  "五段-ガ行",
  "五段-サ行",
  "五段-タ行",
  "五段-ナ行",
  "五段-バ行",
  "五段-マ行",
  "五段-ラ行",
  "五段-ワア行",
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  "助動詞-ジャ",
  "助動詞-タ",
  "助動詞-タイ",
  "助動詞-ダ",
  "助動詞-デス",
  "助動詞-ドス",
  "助動詞-ナイ",
  "助動詞-ナンダ",
  "助動詞-ヌ",
  "助動詞-ヘン",
  "助動詞-マイ",
  "助動詞-マス",
  "助動詞-ヤ",
  "助動詞-ヤス",
  "助動詞-ラシイ",
  "助動詞-レル",
  "文語カ行変格",
  "文語サ行変格",
  "文語ナ行変格",
  "文語ラ行変格",
  "文語形容詞-ク",
  "文語形容詞-シク",
  undefined,
  undefined,
  undefined,
  "文語上一段-ナ行",
  "文語上一段-マ行",
  "文語上一段-ワ行",
  "文語上二段-タ行",
  "文語上二段-ダ行",
  "文語上二段-ハ行",
  "文語上二段-バ行",
  "文語上二段-ヤ行",
  "文語上二段-ラ行",
  "文語下二段-ア行",
  "文語下二段-カ行",
  "文語下二段-ガ行",
  "文語下二段-サ行",
  "文語下二段-ザ行",
  "文語下二段-タ行",
  "文語下二段-ダ行",
  "文語下二段-ナ行",
  "文語下二段-ハ行",
  "文語下二段-バ行",
  "文語下二段-マ行",
  "文語下二段-ヤ行",
  "文語下二段-ラ行",
  "文語下二段-ワ行",
  "文語助動詞-キ",
  "文語助動詞-ケム",
  "文語助動詞-ケリ",
  "文語助動詞-ゴトシ",
  "文語助動詞-ザマス",
  "文語助動詞-ザンス",
  "文語助動詞-ジ",
  "文語助動詞-ズ",
  "文語助動詞-タリ-完了",
  "文語助動詞-タリ-断定",
  "文語助動詞-ナリ-伝聞",
  "文語助動詞-ナリ-断定",
  "文語助動詞-ツ",
  "文語助動詞-ヌ",
  "文語助動詞-ベシ",
  "文語助動詞-マジ",
  "文語助動詞-ム",
  "文語助動詞-ラシ",
  "文語助動詞-ラム",
  "文語助動詞-リ",
  "文語助動詞-ンス",
  undefined,
  undefined,
  undefined,
  "文語四段-カ行",
  "文語四段-ガ行",
  "文語四段-サ行",
  "文語四段-タ行",
  "文語四段-ハ行",
  "文語四段-バ行",
  "文語四段-マ行",
  "文語四段-ラ行",
];

export function is上一段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 上一段_MIN && pos4 <= 上一段_MAX;
}
export function is下一段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 下一段_MIN && pos4 <= 下一段_MAX;
}

export function isKaHenPredicateToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 動詞 && (token.pos & POS4) === カ行変格;
}

export function isSaHenPredicateToken(token: { readonly pos: number }): boolean {
  const family = token.pos & POS4;
  return (token.pos & POS0) === 動詞 && (family === サ行変格 || family === 文語サ行変格);
}

export function isGodanRaVerbToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 動詞 && (token.pos & POS4) === 五段_ラ行;
}

export function is五段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 五段_MIN && pos4 <= 五段_MAX;
}

export function isMizenDistinctRenyouVerbToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 動詞 && (token.pos & POS5) === 連用形_一般 && is五段(token.pos);
}
export function is助動詞(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 助動詞_MIN && pos4 <= 助動詞_MAX;
}

export function isPastAuxConditionalForm(pos: number): boolean {
  return inflectionClassName(pos) === "助動詞-タ" &&
    stemFormName(pos)?.startsWith("仮定形") === true;
}

export function isPastAuxiliaryPos(pos: number): boolean {
  return inflectionClassName(pos) === "助動詞-タ";
}

export function isPoliteCopulaPos(pos: number): boolean {
  return inflectionClassName(pos) === "助動詞-デス";
}

export function isPoliteAuxiliaryPos(pos: number): boolean {
  return inflectionClassName(pos) === "助動詞-マス";
}

export function isDesireAuxiliaryPos(pos: number): boolean {
  return inflectionClassName(pos) === "助動詞-タイ";
}

export function isNegativeAuxiliaryPos(pos: number): boolean {
  const inflectionClass = inflectionClassName(pos);
  return inflectionClass === "助動詞-ナイ" || inflectionClass === "助動詞-ヌ";
}

export function isClassicalNegativeAuxiliaryToken(token: { readonly pos: number }): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  const inflectionClass = inflectionClassName(token.pos);
  return inflectionClass === "助動詞-ヌ" || inflectionClass === "文語助動詞-ズ";
}

export function isNonIndependentVerbToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 動詞_非自立可能;
}

export function isNonIndependentAdjectiveToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 形容詞_非自立可能;
}

const 形容詞_非自立可能: number = 形容詞0 | 非自立可能;

export function isParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 助詞;
}

export function isCaseParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_格助詞;
}

export function isConjunctiveParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_接続助詞;
}

export function isBindingParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_係助詞;
}

export function isTerminalParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_終助詞;
}

export function isSecondaryParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_副助詞;
}

export function isNominalScopeParticleToken(token: { readonly pos: number }): boolean {
  return isCaseParticleToken(token) || isBindingParticleToken(token) || isSecondaryParticleToken(token);
}

export function isPronounToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 代名詞;
}

export function isSubstantiveNounToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 名詞;
}

export function isCommonNounToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 名詞_普通名詞;
}

export function isAdnominalGenitiveMarkerToken(
  token: { readonly surface: string; readonly pos: number }
): boolean {
  return token.surface === "の" && (token.pos & POS01) === 助詞_格助詞;
}

export function isGeneralRenyouInflectedToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS5) === 連用形_一般;
}

export function isCopulaDaFusedRenyouToken(token: { readonly pos: number }): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 助動詞_ダ) && (token.pos & POS5) === 連用形_融合;
}

export function isNuAttachmentHostToken(token: { readonly pos: number }): boolean {
  const pos0 = token.pos & POS0;
  if (pos0 !== 動詞 && pos0 !== 助動詞) {
    return false;
  }
  if (isMizenInflection(token.pos)) {
    return !is文語助動詞(token.pos);
  }
  return stemFormName(token.pos) === "連用形-一般" &&
    (is上一段(token.pos) || is下一段(token.pos) || isRareruAuxiliaryToken(token) ||
      (pos0 === 動詞 && (token.pos & POS4) === サ行変格));
}

export function isBungoVolitionalMuHatsuonToken(token: { readonly pos: number }): boolean {
  return (token.pos & (POS0 | POS4)) === (助動詞 | 文語助動詞_ム) &&
    (token.pos & POS5B) === _撥音便;
}

export function isAuxiliarySymbolCategoryToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 補助記号;
}

export function isSymbolCharacterToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 記号_文字;
}

export function isSentenceTerminalPunctuationSubtype(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 補助記号_句点;
}

export function conjectureCopulaPoliteness(pos: number): "plain" | "polite" | null {
  if (!stemFormName(pos)?.startsWith("意志推量形")) {
    return null;
  }
  const inflectionClass = inflectionClassName(pos);
  if (inflectionClass === "助動詞-デス") {
    return "polite";
  }
  return inflectionClass === "助動詞-ダ" || inflectionClass === "助動詞-ヤ"
    ? "plain"
    : null;
}

export function isTerminalOrAttributiveInflection(pos: number): boolean {
  const form = stemFormName(pos);
  return form?.startsWith("終止形") === true || form?.startsWith("連体形") === true;
}

const BUNGO_HOMOPHONOUS_TERMINAL_CLASS_PREFIXES: readonly string[] = [
  "文語四段",
  "文語上一段",
  "文語助動詞-ム",
  "文語助動詞-ケム",
  "文語助動詞-ラム",
  "文語助動詞-ジ",
  "文語助動詞-ラシ"
];

export function isAttributiveOrHomophonousTerminalInflection(pos: number): boolean {
  if (isAttributiveInflection(pos)) {
    return true;
  }
  if (!isTerminalInflection(pos) || isAssertiveCopulaFamilyPos(pos) || isPoliteCopulaPos(pos)) {
    return false;
  }
  const inflectionClass = inflectionClassName(pos);
  if (inflectionClass?.startsWith("文語") !== true) {
    return true;
  }
  return BUNGO_HOMOPHONOUS_TERMINAL_CLASS_PREFIXES.some((prefix) => inflectionClass.startsWith(prefix));
}

export function isAdnominalOnlyInflection(pos: number): boolean {
  if (!isAttributiveInflection(pos) || isPoliteCopulaPos(pos)) {
    return false;
  }
  if (isAssertiveCopulaFamilyPos(pos)) {
    return true;
  }
  const inflectionClass = inflectionClassName(pos);
  return inflectionClass?.startsWith("文語") === true &&
    !BUNGO_HOMOPHONOUS_TERMINAL_CLASS_PREFIXES.some((prefix) => inflectionClass.startsWith(prefix));
}

export function isClauseClosingInflection(pos: number): boolean {
  return isTerminalOrAttributiveInflection(pos) || isVolitionalInflection(pos);
}

export function isTerminalInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("終止形") === true;
}

export function isAttributiveInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("連体形") === true;
}

export function isRenyouInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("連用形") === true;
}

export function isConditionalInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("仮定形") === true;
}

export function isRealisInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("已然形") === true;
}

export function isMizenInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("未然形") === true;
}

export function isAssertiveCopulaFamilyPos(pos: number): boolean {
  return (pos & POS4) === 助動詞_ダ;
}

export function isBungoAssertiveCopulaAdnominalToken(token: { readonly pos: number }): boolean {
  const pos4 = token.pos & POS4;
  return isAuxiliaryToken(token) &&
    (pos4 === 文語助動詞_タリ_断定 || pos4 === 文語助動詞_ナリ_断定) &&
    (token.pos & POS5A) === 連体形_;
}

export function isTerminalAssertiveCopulaToken(token: { readonly pos: number }): boolean {
  return isAuxiliaryToken(token) &&
    isAssertiveCopulaFamilyPos(token.pos) &&
    isTerminalInflection(token.pos);
}

export function isTerminalCopulaFamilyToken(token: { readonly pos: number }): boolean {
  if (!isAuxiliaryToken(token) || !isTerminalInflection(token.pos)) {
    return false;
  }
  const family = token.pos & POS4;
  return family === 助動詞_ダ || family === 助動詞_デス || family === 助動詞_ヤ;
}

export function isClosingCopulaFamilyToken(token: { readonly pos: number }): boolean {
  if (!isAuxiliaryToken(token)) {
    return false;
  }
  if (!isTerminalInflection(token.pos) && !isVolitionalInflection(token.pos)) {
    return false;
  }
  const family = token.pos & POS4;
  return family === 助動詞_ダ || family === 助動詞_デス || family === 助動詞_ヤ;
}

export function isUtteranceInterjectionToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 感動詞 && (token.pos & POS1) !== フィラー;
}

export function isIndependentWordToken(token: { readonly pos: number }): boolean {
  return pos0in(token.pos & POS0, INDEPENDENT_WORD_BITS);
}

export function isIndependentWordPos0Name(name: string): boolean {
  const pos0 = POS0_OF_NAME[name];
  return pos0 !== undefined && pos0in(pos0, INDEPENDENT_WORD_BITS);
}

const INDEPENDENT_WORD_BITS = (1 << 名詞) | (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) |
  (1 << 副詞) | (1 << 連体詞) | (1 << 代名詞) | (1 << 接続詞) | (1 << 感動詞);

export function isDependentWordPos0Name(name: string): boolean {
  const pos0 = POS0_OF_NAME[name];
  return pos0 !== undefined && pos0in(pos0, DEPENDENT_WORD_POS0_BITS);
}

export function isDependentWordToken(token: { readonly pos: number }): boolean {
  return pos0in(token.pos & POS0, DEPENDENT_WORD_POS0_BITS);
}

const DEPENDENT_WORD_POS0_BITS = (1 << 助詞) | (1 << 助動詞);

export function isBoundFormPos0(pos: number): boolean {
  return pos0in(pos & POS0, BOUND_FORM_POS0_BITS);
}

const BOUND_FORM_POS0_BITS = DEPENDENT_WORD_POS0_BITS | (1 << 接尾辞);

const NO_INFLECT_CLASS = "*";

export function isInflectClassName(name: string): boolean {
  return name !== NO_INFLECT_CLASS && Object.hasOwn(POS4_OF_NAME, name);
}

export function isAuxiliaryInflectClassName(name: string): boolean {
  return name.startsWith("助動詞-") || name.startsWith("文語助動詞-");
}

export function isFunctionalReadingPos(
  pos0Name: string,
  inflectClassName: string,
  functionalInflectClasses: ReadonlySet<string>
): boolean {
  if (functionalInflectClasses.has(inflectClassName) ||
    isAuxiliaryInflectClassName(inflectClassName)) {
    return true;
  }
  return inflectClassName === NO_INFLECT_CLASS && isDependentWordPos0Name(pos0Name);
}

export function particleSubtypeBit(name: string): number | undefined {
  const pos1 = POS1_OF_NAME[name];
  return pos1 === undefined || !PARTICLE_SUBTYPE_BITS.has(pos1) ? undefined : pos1;
}

const PARTICLE_SUBTYPE_BITS: ReadonlySet<number> = new Set([
  係助詞, 副助詞, 接続助詞, 格助詞, 準体助詞, 終助詞
]);

export function isParticleSubtypeToken(
  token: { readonly pos: number },
  subtypes: ReadonlySet<number>
): boolean {
  return (token.pos & POS0) === 助詞 && subtypes.has(token.pos & POS1);
}

export function isImperativeInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("命令形") === true;
}

export function isVolitionalInflection(pos: number): boolean {
  return stemFormName(pos)?.startsWith("意志推量形") === true;
}

export function isVoicedTeFormHostToken(token: { readonly pos: number }): boolean {
  if (!isVerbPredicateToken(token)) {
    return false;
  }
  const form = stemFormName(token.pos);
  if (form === "連用形-撥音便") {
    return true;
  }
  return form?.startsWith("連用形-イ音便") === true &&
    inflectionClassName(token.pos) === "五段-ガ行";
}

export function isRareruAuxiliaryToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 助動詞 && (token.pos & POS4) === 助動詞_レル;
}

const VOICE_CAUSATIVE_AUXILIARY_LEMMAS: ReadonlySet<string> = new Set(["れる", "られる", "せる", "させる"]);

export function isVoiceOrCausativeAuxiliaryToken(
  token: { readonly pos: number; readonly dictionaryForm: string }
): boolean {
  if ((token.pos & POS0) !== 助動詞) {
    return false;
  }
  return (token.pos & POS4) === 助動詞_レル || VOICE_CAUSATIVE_AUXILIARY_LEMMAS.has(token.dictionaryForm);
}

export function isTeFormFusionHostToken(
  token: { readonly pos: number; readonly dictionaryForm: string }
): boolean {
  const form = stemFormName(token.pos);
  if (form === null || !form.startsWith("連用形")) {
    return false;
  }
  const pos0 = token.pos & POS0;
  if (pos0 === 動詞) {
    if (form === "連用形-促音便" || form === "連用形-撥音便" || form.startsWith("連用形-イ音便")) {
      return true;
    }
    if (form !== "連用形-一般") {
      return false;
    }
    const pos4 = token.pos & POS4;
    return is上一段(token.pos) || is下一段(token.pos) ||
      pos4 === カ行変格 || pos4 === サ行変格 || pos4 === 五段_サ行;
  }
  if (pos0 === 助動詞) {
    return form === "連用形-一般" && isVoiceOrCausativeAuxiliaryToken(token);
  }
  return false;
}

export function isAdjectivalRenyouTeFormHostToken(token: { readonly pos: number }): boolean {
  if (stemFormName(token.pos) !== "連用形-一般") {
    return false;
  }
  return (token.pos & POS0) === 形容詞0 || isDesireAuxiliaryPos(token.pos);
}

export function isAdjectivalInflectionRenyouToken(token: { readonly pos: number }): boolean {
  if (stemFormName(token.pos) !== "連用形-一般") {
    return false;
  }
  const inflectionClass = inflectionClassName(token.pos);
  return inflectionClass === "形容詞" ||
    inflectionClass === "助動詞-ナイ" ||
    inflectionClass === "助動詞-タイ" ||
    inflectionClass === "助動詞-ラシイ";
}

export function isVolitionalSpeechActInflectionToken(token: { readonly pos: number }): boolean {
  if (!isVolitionalInflection(token.pos)) {
    return false;
  }
  const inflectionClass = inflectionClassName(token.pos);
  return inflectionClass !== null &&
    (inflectionClass.includes("段") || inflectionClass.includes("変格") || isPoliteAuxiliaryPos(token.pos));
}

export function isAdjectivalTeFormFusionHostToken(token: { readonly pos: number }): boolean {
  return isAdjectivalRenyouTeFormHostToken(token);
}

export function isAuxiliaryToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 助動詞;
}

export function isReasonCopulaNegativeShellAuxiliary(pos: number): boolean {
  const inflectionClass = inflectionClassName(pos);
  if (inflectionClass === "助動詞-タ") {
    return !isPastAuxConditionalForm(pos);
  }
  return inflectionClass === "助動詞-マス" ||
    inflectionClass === "助動詞-ヌ" ||
    inflectionClass === "助動詞-デス";
}

export function isIAdjectivePredicateToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 形容詞0;
}

export function isVerbPredicateToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 動詞;
}

export function isRenyouInflectedToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS5A) === 連用形_;
}

export function isTerminalOrAttributiveFormPredicateToken(token: { readonly pos: number }): boolean {
  if (!isVerbPredicateToken(token) && !isIAdjectivePredicateToken(token)) {
    return false;
  }
  const form = token.pos & POS5A;
  return form === 終止形_ || form === 連体形_;
}

export function isClosingBracketToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 補助記号_括弧閉;
}

export function isVerbRenyouPredicateToken(token: { readonly pos: number }): boolean {
  return isVerbPredicateToken(token) && isRenyouInflectedToken(token);
}

export function is文語形容詞(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語形容詞_MIN && pos4 <= 文語形容詞_MAX;
}
export function is文語上一段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語上一段_MIN && pos4 <= 文語上一段_MAX;
}
export function is文語上二段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語上二段_MIN && pos4 <= 文語上二段_MAX;
}
export function is文語下二段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語下二段_MIN && pos4 <= 文語下二段_MAX;
}
export function is文語助動詞(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語助動詞_MIN && pos4 <= 文語助動詞_MAX;
}
export function is文語助動詞_タリ(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 === 文語助動詞_タリ_完了 || pos4 === 文語助動詞_タリ_断定;
}
export function is文語助動詞_ナリ(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 === 文語助動詞_ナリ_伝聞 || pos4 === 文語助動詞_ナリ_断定;
}
export function is文語四段(pos: number): boolean {
  const pos4 = pos & POS4;
  return pos4 >= 文語四段_MIN && pos4 <= 文語四段_MAX;
}

export const POS4_SET_OF_NAME: { [key: string]: (pos: number) => boolean } = {
  ["上一段"]: is上一段,
  ["下一段"]: is下一段,
  ["五段"]: is五段,
  ["助動詞"]: is助動詞,
  ["文語形容詞"]: is文語形容詞,
  ["文語上一段"]: is文語上一段,
  ["文語上二段"]: is文語上二段,
  ["文語下二段"]: is文語下二段,
  ["文語助動詞"]: is文語助動詞,
  ["文語助動詞-タリ"]: is文語助動詞_タリ,
  ["文語助動詞-ナリ"]: is文語助動詞_ナリ,
  ["文語四段"]: is文語四段,
};

export const ク語法_: number = 1 << POS5A_SHIFT;
export const 仮定形_: number = 2 << POS5A_SHIFT;
export const 命令形_: number = 3 << POS5A_SHIFT;
export const 已然形_: number = 4 << POS5A_SHIFT;
export const 意志推量形_: number = 5 << POS5A_SHIFT;
export const 未然形_: number = 6 << POS5A_SHIFT;
export const 終止形_: number = 7 << POS5A_SHIFT;
export const 語幹_: number = 8 << POS5A_SHIFT;
export const 連体形_: number = 9 << POS5A_SHIFT;
export const 連用形_: number = 10 << POS5A_SHIFT;

export const POS5A_NAME: string[] = [
  "*",
  "ク語法",
  "仮定形",
  "命令形",
  "已然形",
  "意志推量形",
  "未然形",
  "終止形",
  "語幹",
  "連体形",
  "連用形",
];

export const _一般: number = 0 << POS5B_SHIFT;
export const _一般_送り仮名省略: number = 1 << POS5B_SHIFT;
export const _イ音便: number = 2 << POS5B_SHIFT;
export const _イ音便_送り仮名省略: number = 3 << POS5B_SHIFT;
export const _ウ音便: number = 4 << POS5B_SHIFT;
export const _キ接続: number = 5 << POS5B_SHIFT;
export const _サ: number = 6 << POS5B_SHIFT;
export const _セ: number = 7 << POS5B_SHIFT;
export const _ト: number = 8 << POS5B_SHIFT;
export const _ニ: number = 9 << POS5B_SHIFT;
export const _促音便: number = 10 << POS5B_SHIFT;
export const _撥音便: number = 11 << POS5B_SHIFT;
export const _省略: number = 12 << POS5B_SHIFT;
export const _融合: number = 13 << POS5B_SHIFT;
export const _補助: number = 14 << POS5B_SHIFT;

export const POS5B_NAME: string[] = [
  "-一般",
  "-一般+送り仮名省略",
  "-イ音便",
  "-イ音便+送り仮名省略",
  "-ウ音便",
  "-キ接続",
  "-サ",
  "-セ",
  "-ト",
  "-ニ",
  "-促音便",
  "-撥音便",
  "-省略",
  "-融合",
  "-補助",
];

export const ク語法: number = ク語法_ | _一般;
export const 仮定形_一般: number = 仮定形_;
export const 仮定形_融合: number = 仮定形_ | _融合;
export const 命令形: number = 命令形_;
export const 已然形_一般: number = 已然形_ | _一般;
export const 已然形_補助: number = 已然形_ | _補助;
export const 意志推量形: number = 意志推量形_;
export const 未然形_一般: number = 未然形_ | _一般;
export const 未然形_サ: number = 未然形_ | _サ;
export const 未然形_セ: number = 未然形_ | _セ;
export const 未然形_撥音便: number = 未然形_ | _撥音便;
export const 未然形_補助: number = 未然形_ | _補助;
export const 終止形_一般: number = 終止形_ | _一般;
export const 終止形_ウ音便: number = 終止形_ | _ウ音便;
export const 終止形_促音便: number = 終止形_ | _促音便;
export const 終止形_撥音便: number = 終止形_ | _撥音便;
export const 終止形_融合: number = 終止形_ | _融合;
export const 終止形_補助: number = 終止形_ | _補助;
export const 語幹_一般: number = 語幹_ | _一般;
export const 語幹_サ: number = 語幹_ | _サ;
export const 連体形_一般: number = 連体形_ | _一般;
export const 連体形_一般_送り仮名省略: number = 連体形_ | _一般_送り仮名省略;
export const 連体形_イ音便: number = 連体形_ | _イ音便;
export const 連体形_ウ音便: number = 連体形_ | _ウ音便;
export const 連体形_撥音便: number = 連体形_ | _撥音便;
export const 連体形_省略: number = 連体形_ | _省略;
export const 連体形_補助: number = 連体形_ | _補助;
export const 連用形_一般: number = 連用形_ | _一般;
export const 連用形_一般_送り仮名省略: number = 連用形_ | _一般_送り仮名省略;
export const 連用形_イ音便: number = 連用形_ | _イ音便;
export const 連用形_イ音便_送り仮名省略: number = 連用形_ | _イ音便_送り仮名省略;
export const 連用形_ウ音便: number = 連用形_ | _ウ音便;
export const 連用形_キ接続: number = 連用形_ | _キ接続;
export const 連用形_ト: number = 連用形_ | _ト;
export const 連用形_ニ: number = 連用形_ | _ニ;
export const 連用形_促音便: number = 連用形_ | _促音便;
export const 連用形_撥音便: number = 連用形_ | _撥音便;
export const 連用形_省略: number = 連用形_ | _省略;
export const 連用形_融合: number = 連用形_ | _融合;
export const 連用形_補助: number = 連用形_ | _補助;

export const POS5_OF_NAME: { [key: string]: number } = {
  ["ク語法"]: ク語法,
  ["仮定形-一般"]: 仮定形_一般,
  ["仮定形-融合"]: 仮定形_融合,
  ["命令形"]: 命令形,
  ["已然形-一般"]: 已然形_一般,
  ["已然形-補助"]: 已然形_補助,
  ["意志推量形"]: 意志推量形,
  ["未然形-一般"]: 未然形_一般,
  ["未然形-サ"]: 未然形_サ,
  ["未然形-セ"]: 未然形_セ,
  ["未然形-撥音便"]: 未然形_撥音便,
  ["未然形-補助"]: 未然形_補助,
  ["終止形-一般"]: 終止形_一般,
  ["終止形-ウ音便"]: 終止形_ウ音便,
  ["終止形-促音便"]: 終止形_促音便,
  ["終止形-撥音便"]: 終止形_撥音便,
  ["終止形-融合"]: 終止形_融合,
  ["終止形-補助"]: 終止形_補助,
  ["語幹-一般"]: 語幹_一般,
  ["語幹-サ"]: 語幹_サ,
  ["連体形-一般"]: 連体形_一般,
  ["連体形-一般+送り仮名省略"]: 連体形_一般_送り仮名省略,
  ["連体形-イ音便"]: 連体形_イ音便,
  ["連体形-ウ音便"]: 連体形_ウ音便,
  ["連体形-撥音便"]: 連体形_撥音便,
  ["連体形-省略"]: 連体形_省略,
  ["連体形-補助"]: 連体形_補助,
  ["連用形-一般"]: 連用形_一般,
  ["連用形-一般+送り仮名省略"]: 連用形_一般_送り仮名省略,
  ["連用形-イ音便"]: 連用形_イ音便,
  ["連用形-イ音便+送り仮名省略"]: 連用形_イ音便_送り仮名省略,
  ["連用形-ウ音便"]: 連用形_ウ音便,
  ["連用形-キ接続"]: 連用形_キ接続,
  ["連用形-ト"]: 連用形_ト,
  ["連用形-ニ"]: 連用形_ニ,
  ["連用形-促音便"]: 連用形_促音便,
  ["連用形-撥音便"]: 連用形_撥音便,
  ["連用形-省略"]: 連用形_省略,
  ["連用形-融合"]: 連用形_融合,
  ["連用形-補助"]: 連用形_補助,
};

export const POS5_SET_OF_NAME: { [key: string]: (pos: number) => boolean } = {
  ["ク語法"]: (pos: number) => (pos & POS5A) === ク語法_,
  ["仮定形"]: (pos: number) => (pos & POS5A) === 仮定形_,
  ["命令形"]: (pos: number) => (pos & POS5A) === 命令形_,
  ["已然形"]: (pos: number) => (pos & POS5A) === 已然形_,
  ["意志推量形"]: (pos: number) => (pos & POS5A) === 意志推量形_,
  ["未然形"]: (pos: number) => (pos & POS5A) === 未然形_,
  ["終止形"]: (pos: number) => (pos & POS5A) === 終止形_,
  ["語幹"]: (pos: number) => (pos & POS5A) === 語幹_,
  ["連体形"]: (pos: number) => (pos & POS5A) === 連体形_,
  ["連体形-一般"]: (pos: number) => (pos & POS5) === 連体形_一般 || (pos & POS5) === 連体形_一般_送り仮名省略,
  ["連用形"]: (pos: number) => (pos & POS5A) === 連用形_,
  ["連用形-一般"]: (pos: number) => (pos & POS5) === 連用形_一般 || (pos & POS5) === 連用形_一般_送り仮名省略,
  ["連用形-イ音便"]: (pos: number) => (pos & POS5) === 連用形_イ音便 || (pos & POS5) === 連用形_イ音便_送り仮名省略,
};

export const 감탄사 = -1;
export const 고유명사 = -2;
export const 관형사 = -3;
export const 대명사 = -4;
export const 동사 = -5;
export const 명사 = -6;
export const 부사 = -7;
export const 수사 = -8;
export const 연체사 = -9;
export const 접두사 = -10;
export const 접미사 = -11;
export const 접속사 = -12;
export const 조사 = -13;
export const 형용사 = -14;
export const 기호 = -15;
export const 구 = -16;

export const KOPOS_NAME: { [key: number]: string } = {
  [감탄사]: "감탄사",
  [관형사]: "관형사",
  [고유명사]: "고유명사",
  [대명사]: "대명사",
  [동사]: "동사",
  [명사]: "명사",
  [부사]: "부사",
  [수사]: "수사",
  [연체사]: "연체사",
  [접두사]: "접두사",
  [접미사]: "접미사",
  [접속사]: "접속사",
  [조사]: "조사",
  [형용사]: "형용사",
  [기호]: "기호",
  [구]: "구",
};

export const POS01: number = POS0 | POS1;
export const POS012: number = POS0 | POS1 | POS2;

export const 助詞_格助詞: number = 助詞 | 格助詞;
export const 助詞_接続助詞: number = 助詞 | 接続助詞;
export const 助詞_終助詞: number = 助詞 | 終助詞;
export const 助詞_係助詞: number = 助詞 | 係助詞;
export const 助詞_副助詞: number = 助詞 | 副助詞;
export const 助詞_準体助詞: number = 助詞 | 準体助詞;
export const 名詞_普通名詞: number = 名詞 | 普通名詞;
export const 名詞_固有名詞: number = 名詞 | 固有名詞;
export const 名詞_数詞: number = 名詞 | 数詞;
export const 動詞_非自立可能: number = 動詞 | 非自立可能;
export const 接尾辞_名詞的: number = 接尾辞 | 名詞的;
export const 接尾辞_形容詞的: number = 接尾辞 | 形容詞的;
export const 接尾辞_動詞的: number = 接尾辞 | 動詞的;
export const 接尾辞_形状詞的: number = 接尾辞 | 形状詞的;
export const 補助記号_句点: number = 補助記号 | 句点;
export const 補助記号_括弧閉: number = 補助記号 | 括弧閉;
export const 補助記号_括弧開: number = 補助記号 | 括弧開;
export const 補助記号_読点: number = 補助記号 | 読点;
export const 形状詞_タリ: number = 形状詞 | タリ;
export const 形状詞_助動詞語幹: number = 形状詞 | 助動詞語幹;
export const 記号_文字: number = 記号 | 文字;

export const 名詞_普通名詞_サ変可能: number = 名詞 | 普通名詞 | サ変可能;
export const 名詞_普通名詞_サ変形状詞可能: number = 名詞 | 普通名詞 | サ変形状詞可能;
export const 名詞_普通名詞_副詞可能: number = 名詞 | 普通名詞 | 副詞可能;
export const 名詞_普通名詞_助数詞可能: number = 名詞 | 普通名詞 | 助数詞可能;
export const 名詞_普通名詞_形状詞可能: number = 名詞 | 普通名詞 | 形状詞可能;
export const 名詞_固有名詞_人名: number = 名詞 | 固有名詞 | 人名;
export const 名詞_固有名詞_地名: number = 名詞 | 固有名詞 | 地名;

export const PREDICATE_BITS: number = (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞);
export const PREDICATE_AUX_BITS: number = (1 << 動詞) | (1 << 形容詞0) | (1 << 形状詞) | (1 << 助動詞);
export const NOMINAL_BITS: number = (1 << 名詞) | (1 << 代名詞);
export const NOMINAL_ATTR_BITS: number = (1 << 名詞) | (1 << 代名詞) | (1 << 形容詞0) | (1 << 連体詞);
export const INFLECTABLE_BITS: number = (1 << 動詞) | (1 << 形容詞0);
export const INFLECTABLE_AUX_BITS: number = (1 << 動詞) | (1 << 形容詞0) | (1 << 助動詞);
export const PUNCTUATION_BITS: number = (1 << 補助記号) | (1 << 記号);
export const TRIVIA_BITS: number = (1 << 補助記号) | (1 << 記号);
export const NON_INFLECTING_HOST_BITS: number = (1 << 名詞) | (1 << 代名詞) | (1 << 形状詞) | (1 << 副詞);
export const NOMINAL_KEIJOU_BITS: number = (1 << 名詞) | (1 << 形状詞);
export const NOMINAL_KEIJOU_AUX_BITS: number = (1 << 名詞) | (1 << 形状詞) | (1 << 助動詞);

export const POS_DEPTH_MASK: readonly number[] = [
  0,
  POS0,
  POS0 | POS1,
  POS0 | POS1 | POS2,
  POS0 | POS1 | POS2 | POS3,
  POS0 | POS1 | POS2 | POS3 | POS4,
  POS0 | POS1 | POS2 | POS3 | POS4 | POS5,
];

export const POS0_OF_NAME: { [key: string]: number } = {};
export const POS1_OF_NAME: { [key: string]: number } = { ["一般"]: 0 };
export const POS2_OF_NAME: { [key: string]: number } = { ["一般"]: 0 };
export const POS3_OF_NAME: { [key: string]: number } = { ["一般"]: 0 };
export const POS4_OF_NAME: { [key: string]: number } = {};
export const POS5A_OF_NAME: { [key: string]: number } = {};
export const POS5B_OF_NAME: { [key: string]: number } = { [""]: 0 };
export const KOPOS_OF_NAME: { [key: string]: number } = {};

for (let i = 0; i < POS0_NAME.length; i++) POS0_OF_NAME[POS0_NAME[i]!] = i;
for (let i = 0; i < POS1_NAME.length; i++) POS1_OF_NAME[POS1_NAME[i]!] = i << POS1_SHIFT;
for (let i = 0; i < POS2_NAME.length; i++) POS2_OF_NAME[POS2_NAME[i]!] = i << POS2_SHIFT;
for (let i = 0; i < POS3_NAME.length; i++) POS3_OF_NAME[POS3_NAME[i]!] = i << POS3_SHIFT;
for (let i = 0; i < POS4_NAME.length; i++) {
  const name = POS4_NAME[i];
  if (name !== undefined) POS4_OF_NAME[name] = i << POS4_SHIFT;
}
for (let i = 0; i < POS5A_NAME.length; i++) POS5A_OF_NAME[POS5A_NAME[i]!] = i << POS5A_SHIFT;
for (let i = 0; i < POS5B_NAME.length; i++) POS5B_OF_NAME[POS5B_NAME[i]!] = i << POS5B_SHIFT;
for (const [pos, name] of Object.entries(KOPOS_NAME)) KOPOS_OF_NAME[name] = Number(pos);

export function pos0in(pos: number, bits: number): boolean {
  return ((1 << (pos & POS0)) & bits) !== 0;
}

export interface InflectClassSpec {
  readonly pos0Bits: number;
  readonly nounPos2: readonly number[];
}

export function matchesInflectClass(pos: number, spec: InflectClassSpec): boolean {
  if (pos0in(pos, spec.pos0Bits)) {
    return true;
  }
  if ((pos & POS0) !== 名詞) {
    return false;
  }
  return spec.nounPos2.includes(pos & POS2);
}

export function isSahenCapableNominal(token: { readonly pos: number }): boolean {
  const pos2 = token.pos & POS2;
  if (pos2 !== サ変可能 && pos2 !== サ変形状詞可能) {
    return false;
  }
  return (token.pos & POS0) === 名詞 || (token.pos & POS01) === 接尾辞_名詞的;
}

export function isSahenVerbalizableNominal(token: { readonly pos: number }): boolean {
  if ((token.pos & POS2) !== サ変可能) {
    return false;
  }
  return (token.pos & POS0) === 名詞 || (token.pos & POS01) === 接尾辞_名詞的;
}

export function isSahenVerbalizableNominalOrCompound(
  token: {
    readonly pos: number;
    readonly splitA?: readonly { readonly pos: number }[];
    readonly splitB?: readonly { readonly pos: number }[];
  }
): boolean {
  if (isSahenVerbalizableNominal(token)) {
    return true;
  }
  const subs = token.splitB ?? token.splitA;
  if (subs === undefined || subs.length === 0) {
    return false;
  }
  return isSahenVerbalizableNominal(subs[subs.length - 1]!);
}

export function isCounterCapableToken(token: { readonly pos: number }): boolean {
  const pos2 = token.pos & POS2;
  return pos2 === 助数詞可能 || pos2 === 助数詞;
}

export function isNumeralToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 名詞_数詞;
}

export function isAuxiliaryStemToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS1) === 助動詞語幹;
}

export function isSahenLightVerbToken(token: { readonly pos: number }): boolean {
  if ((token.pos & POS0) !== 動詞) {
    return false;
  }
  const pos4 = token.pos & POS4;
  return pos4 === サ行変格 || pos4 === 文語サ行変格;
}

export function isSahenCapableNominalOrCompound(
  token: {
    readonly pos: number;
    readonly splitA?: readonly { readonly pos: number }[];
    readonly splitB?: readonly { readonly pos: number }[];
  }
): boolean {
  if (isSahenCapableNominal(token)) {
    return true;
  }
  const subs = token.splitB ?? token.splitA;
  if (subs === undefined || subs.length === 0) {
    return false;
  }
  return isSahenCapableNominal(subs[subs.length - 1]!);
}

const NA_ADJ_CAPABLE: InflectClassSpec = { pos0Bits: 1 << 形状詞, nounPos2: [形状詞可能, サ変形状詞可能] };
const NA_ADJ_CAPABLE_NOUN: InflectClassSpec = { pos0Bits: 0, nounPos2: [形状詞可能, サ変形状詞可能] };
const NA_ADJ_BARE: InflectClassSpec = { pos0Bits: 1 << 形状詞, nounPos2: [形状詞可能] };
const NA_ADJ_PURE: InflectClassSpec = { pos0Bits: 1 << 形状詞, nounPos2: [] };

export function isNaAdjCapable(token: { readonly pos: number }): boolean {
  return matchesInflectClass(token.pos, NA_ADJ_CAPABLE);
}

export function isNaAdjCapableNoun(token: { readonly pos: number }): boolean {
  return matchesInflectClass(token.pos, NA_ADJ_CAPABLE_NOUN);
}

export function isAttributiveCapableNominalHostToken(token: { readonly pos: number }): boolean {
  return isCommonNounToken(token) && !isNaAdjCapableNoun(token);
}

export function isPureNaAdjStem(token: { readonly pos: number }): boolean {
  return matchesInflectClass(token.pos, NA_ADJ_PURE);
}

export function isLexicalBareNaAdjStem(token: { readonly pos: number }): boolean {
  return isBareNaAdjSet(token) &&
    (token.pos & POS01) !== 形状詞_タリ &&
    !isAuxiliaryStemToken(token);
}

export function isLexicalPureNaAdjStem(token: { readonly pos: number }): boolean {
  return isPureNaAdjStem(token) &&
    (token.pos & POS01) !== 形状詞_タリ &&
    !isAuxiliaryStemToken(token);
}

export function isTariNaAdjStem(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 形状詞_タリ;
}

export function isNominalUseBareNaAdjStem(token: { readonly pos: number }): boolean {
  return isBareNaAdjSet(token) && !isAuxiliaryStemToken(token);
}

export function isNominalizerParticleToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 助詞_準体助詞;
}

export function isKoreanNounAble(koreanPos: number | undefined | null, nominalized?: string | null): boolean {
  return koreanPos === 명사 ||
    ((koreanPos === 형용사 || koreanPos === 동사) && typeof nominalized === "string" && nominalized.length > 0);
}

export function isKoreanCoordinableNominalPos(koreanPos: number | undefined | null): boolean {
  return koreanPos === 명사 || koreanPos === 대명사 || koreanPos === 고유명사 || koreanPos === 수사;
}

export function koreanNounLemma(korean: string, koreanPos: number | undefined | null, nominalized?: string | null): string {
  if ((koreanPos === 형용사 || koreanPos === 동사) && typeof nominalized === "string" && nominalized.length > 0) {
    return nominalized;
  }
  return korean;
}

export function isBareNaAdjSet(token: { readonly pos: number }): boolean {
  return matchesInflectClass(token.pos, NA_ADJ_BARE);
}

export function isAdverbCapableNominal(token: { readonly pos: number }): boolean {
  return (token.pos & POS2) === 副詞可能 &&
    ((token.pos & POS0) === 名詞 || (token.pos & POS01) === 接尾辞_名詞的);
}

export function isAdverbCapable(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 副詞 || isAdverbCapableNominal(token);
}

export function isLexicalAdverb(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 副詞;
}

export function isConjunctionToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 接続詞;
}

export function isNominalLike(token: { readonly pos: number }): boolean {
  return pos0in(token.pos, NOMINAL_BITS) || (token.pos & POS01) === 接尾辞_名詞的;
}

export function isProperPersonNameToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS012) === 名詞_固有名詞_人名;
}

export function isProperPlaceNameToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS012) === 名詞_固有名詞_地名;
}

export function isNaAdjectiveDerivationalSuffix(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 接尾辞_形状詞的;
}

export function isAdjectivalDerivationalSuffix(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 接尾辞_形容詞的;
}

export function isNominalDerivationalSuffix(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 接尾辞_名詞的;
}

export function isNonInflectingHostToken(token: { readonly pos: number }): boolean {
  return pos0in(token.pos, NON_INFLECTING_HOST_BITS);
}

export function isPrefixAffixToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 接頭辞;
}

export function isRentaishiToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS0) === 連体詞;
}

export function isVerbalDerivationalSuffixToken(token: { readonly pos: number }): boolean {
  return (token.pos & POS01) === 接尾辞_動詞的;
}

export function inflectionClassName(pos: number): string | null {
  const index = (pos & POS4) >> POS4_SHIFT;
  const name = POS4_NAME[index];
  return name === undefined || name === "*" ? null : name;
}

export function stemFormName(pos: number): string | null {
  const formIndex = (pos & POS5A) >> POS5A_SHIFT;
  const form = POS5A_NAME[formIndex];
  if (form === undefined || form === "*") {
    return null;
  }
  const suffixIndex = (pos & POS5B) >> POS5B_SHIFT;
  const suffix = POS5B_NAME[suffixIndex] ?? "";
  return `${form}${suffix}`;
}


export function posFromStrings(parts: readonly string[]): number {
  let result = 0;
  if (parts.length > 0 && parts[0] !== "*") result |= POS0_OF_NAME[parts[0]!] ?? 0;
  if (parts.length > 1 && parts[1] !== "*" && parts[1] !== "一般") result |= POS1_OF_NAME[parts[1]!] ?? 0;
  if (parts.length > 2 && parts[2] !== "*" && parts[2] !== "一般") result |= POS2_OF_NAME[parts[2]!] ?? 0;
  if (parts.length > 3 && parts[3] !== "*" && parts[3] !== "一般") result |= POS3_OF_NAME[parts[3]!] ?? 0;
  if (parts.length > 4 && parts[4] !== "*") {
    const exact = POS4_OF_NAME[parts[4]!];
    if (exact !== undefined) {
      result |= exact;
    } else {
      const setFn = POS4_SET_OF_NAME[parts[4]!];
      if (setFn !== undefined) {
        result |= POS4_OF_NAME[parts[4]! + "-*"] ?? 0;
      }
    }
  }
  if (parts.length > 5 && parts[5] !== "*") result |= POS5_OF_NAME[parts[5]!] ?? 0;
  return result;
}

export function posDepthFromStrings(parts: readonly string[]): number {
  let depth = 0;
  for (const part of parts) {
    if (part === "*") break;
    depth += 1;
  }
  return depth;
}

export function posToString(pos: number): string {
  if (pos < 0) return KOPOS_NAME[pos]!;
  const pos0 = pos & POS0;
  const pos1 = pos & POS1;
  const pos2 = pos & POS2;
  const pos3 = pos & POS3;
  const pos4 = pos & POS4;
  const pos5a = pos & POS5A;
  const pos5b = pos & POS5B;
  const pos5bCanBeEmpty = pos5a === 0 || pos5a === ク語法_ || pos5a === 命令形_;
  const name0 = POS0_NAME[pos0]!;
  const name1 = POS1_NAME[pos1 >> POS1_SHIFT]!;
  const name2 = POS2_NAME[pos2 >> POS2_SHIFT]!;
  const name3 = POS3_NAME[pos3 >> POS3_SHIFT]!;
  const name4 = POS4_NAME[pos4 >> POS4_SHIFT]!;
  const name5 = POS5A_NAME[pos5a >> POS5A_SHIFT]! + (pos5bCanBeEmpty && pos5b === 0 ? "" : POS5B_NAME[pos5b >> POS5B_SHIFT]!);
  return `${name0}|${name1}|${name2}|${name3}|${name4}|${name5}`;
}
