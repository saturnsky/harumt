
export class TokenCursor<T = unknown> {
  readonly tokens: readonly T[];
  readonly end: number;
  private _pos: number;
  private readonly _origin: number;

  constructor(tokens: readonly T[], pos: number, end: number = tokens.length, origin: number = pos) {
    this.tokens = tokens;
    this._pos = pos;
    this.end = end;
    this._origin = origin;
  }

  get pos(): number { return this._pos; }
  get origin(): number { return this._origin; }
  get consumed(): number { return this._pos - this._origin; }
  current(): T | undefined { return this._pos >= this.end ? undefined : this.tokens[this._pos]; }

  fork(pos: number = this._pos, end: number = this.end, origin: number = this._origin): TokenCursor<T> {
    return new TokenCursor(this.tokens, pos, end, origin);
  }

  retarget<U>(tokens: readonly U[], pos: number = this._pos, end: number = this.end, origin: number = this._origin): TokenCursor<U> {
    return new TokenCursor(tokens, pos, end, origin);
  }

  peek(offset: number): T | undefined {
    const i = this._pos + offset;
    return i >= this.end ? undefined : this.tokens[i];
  }

  advance(n = 1): void { this._pos += n; }

  currentIs(pred: (token: T) => boolean): boolean {
    const token = this.current();
    return token !== undefined && pred(token);
  }

  tx<R>(f: (cursor: TokenCursor<T>) => R | null): R | null {
    const saved = this._pos;
    const result = f(this);
    if (result !== null && result !== undefined) return result;
    this._pos = saved;
    return null;
  }

  tryParse<R>(f: (cursor: TokenCursor<T>) => R | undefined): R | undefined {
    const saved = this._pos;
    const result = f(this);
    if (result !== undefined) return result;
    this._pos = saved;
    return undefined;
  }

  lookahead<R>(offset: number, f: (cursor: TokenCursor<T>) => R): R {
    const saved = this._pos;
    this._pos += offset;
    try {
      return f(this);
    } finally {
      this._pos = saved;
    }
  }
}
