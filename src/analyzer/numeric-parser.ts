/*!
 * Portions of this file are derived from sudachi.rs
 * (https://github.com/WorksApplications/sudachi.rs), sudachi/src/plugin/path_rewrite/join_numeric/
 *
 * Copyright (c) 2021-2024 Works Applications Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * This file has been modified: ported from Rust to TypeScript and adapted
 * for HaruMT.
 */
export enum NumericParserError {
  None = "none",
  Point = "point",
  Comma = "comma"
}

const charToNum = new Map<string, number>([
  ["〇", 0],
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", -1],
  ["百", -2],
  ["千", -3],
  ["万", -4],
  ["億", -8],
  ["兆", -12],
  ["0", 0],
  ["1", 1],
  ["2", 2],
  ["3", 3],
  ["4", 4],
  ["5", 5],
  ["6", 6],
  ["7", 7],
  ["8", 8],
  ["9", 9]
]);

export class NumericParser {
  private digitLength = 0;
  private isFirstDigit = true;
  private hasComma = false;
  private hasHangingPoint = false;
  errorState = NumericParserError.None;
  private readonly total = new StringNumber();
  private readonly subtotal = new StringNumber();
  private readonly tmp = new StringNumber();

  clear(): void {
    this.digitLength = 0;
    this.isFirstDigit = true;
    this.hasComma = false;
    this.hasHangingPoint = false;
    this.errorState = NumericParserError.None;
    this.total.clear();
    this.subtotal.clear();
    this.tmp.clear();
  }

  append(char: string): boolean {
    if (char === ".") {
      this.hasHangingPoint = true;
      if (this.isFirstDigit) {
        this.errorState = NumericParserError.Point;
        return false;
      }
      if (this.hasComma && !this.checkComma()) {
        this.errorState = NumericParserError.Comma;
        return false;
      }
      if (!this.tmp.setPoint()) {
        this.errorState = NumericParserError.Point;
        return false;
      }
      this.hasComma = false;
      return true;
    }

    if (char === ",") {
      if (!this.checkComma()) {
        this.errorState = NumericParserError.Comma;
        return false;
      }
      this.hasComma = true;
      this.digitLength = 0;
      return true;
    }

    const n = charToNum.get(char);
    if (n === undefined) {
      return false;
    }
    if (NumericParser.isSmallUnit(n)) {
      this.tmp.shiftScale(-n);
      if (!this.subtotal.add(this.tmp)) {
        return false;
      }
      this.tmp.clear();
      this.isFirstDigit = true;
      this.digitLength = 0;
      this.hasComma = false;
    } else if (NumericParser.isLargeUnit(n)) {
      if (!this.subtotal.add(this.tmp) || this.subtotal.isZero()) {
        return false;
      }
      this.subtotal.shiftScale(-n);
      if (!this.total.add(this.subtotal)) {
        return false;
      }
      this.subtotal.clear();
      this.tmp.clear();
      this.isFirstDigit = true;
      this.digitLength = 0;
      this.hasComma = false;
    } else {
      this.tmp.append(n);
      this.isFirstDigit = false;
      this.digitLength += 1;
      this.hasHangingPoint = false;
    }

    return true;
  }

  done(): boolean {
    const ok = this.subtotal.add(this.tmp) && this.total.add(this.subtotal);
    if (this.hasHangingPoint) {
      this.errorState = NumericParserError.Point;
      return false;
    }
    if (this.hasComma && this.digitLength !== 3) {
      this.errorState = NumericParserError.Comma;
      return false;
    }
    return ok;
  }

  getNormalized(): string {
    return this.total.toString();
  }

  private checkComma(): boolean {
    if (this.isFirstDigit) {
      return false;
    }
    if (!this.hasComma) {
      return (
        this.digitLength <= 3 &&
        !this.tmp.isZero() &&
        !this.tmp.isAllZero
      );
    }
    return this.digitLength === 3;
  }

  private static isSmallUnit(n: number): boolean {
    return -3 <= n && n < 0;
  }

  private static isLargeUnit(n: number): boolean {
    return n < -3;
  }
}

class StringNumber {
  private significand = "";
  private scale = 0;
  private point = -1;
  isAllZero = true;

  clear(): void {
    this.significand = "";
    this.scale = 0;
    this.point = -1;
    this.isAllZero = true;
  }

  append(i: number): void {
    if (i !== 0) {
      this.isAllZero = false;
    }
    this.significand += String(i);
  }

  shiftScale(i: number): void {
    if (this.isZero()) {
      this.significand += "1";
    }
    this.scale += i;
  }

  add(number: StringNumber): boolean {
    if (number.isZero()) {
      return true;
    }

    if (this.isZero()) {
      this.significand += number.significand;
      this.scale = number.scale;
      this.point = number.point;
      return true;
    }

    this.normalizeScale();
    const length = number.intLength();
    if (this.scale >= length) {
      this.fillZero(this.scale - length);
      if (number.point >= 0) {
        this.point = this.significand.length + number.point;
      }
      this.significand += number.significand;
      this.scale = number.scale;
      return true;
    }

    return false;
  }

  setPoint(): boolean {
    if (this.scale === 0 && this.point < 0) {
      this.point = this.significand.length;
      return true;
    }
    return false;
  }

  intLength(): number {
    this.normalizeScale();
    if (this.point >= 0) {
      return this.point;
    }
    return this.significand.length + this.scale;
  }

  isZero(): boolean {
    return this.significand.length === 0;
  }

  toString(): string {
    if (this.isZero()) {
      return "0";
    }

    this.normalizeScale();
    if (this.scale > 0) {
      this.fillZero(this.scale);
      this.scale = 0;
    } else if (this.point >= 0) {
      this.significand =
        this.significand.slice(0, this.point) +
        "." +
        this.significand.slice(this.point);
      if (this.point === 0) {
        this.significand = `0${this.significand}`;
      }
      this.significand = this.significand.replace(/0+$/u, "");
      if (this.significand.endsWith(".")) {
        this.significand = this.significand.slice(0, -1);
      }
      this.point = -1;
    }

    return this.significand;
  }

  private normalizeScale(): void {
    if (this.point >= 0) {
      const nScale = this.significand.length - this.point;
      if (nScale > this.scale) {
        this.point += this.scale;
        this.scale = 0;
      } else {
        this.scale -= nScale;
        this.point = -1;
      }
    }
  }

  private fillZero(length: number): void {
    this.significand += "0".repeat(length);
  }
}
