

const lineCaches = new WeakMap<object, Map<string, unknown>>();
const scopedLineCaches = new WeakMap<object, WeakMap<object, Map<string, unknown>>>();
const NO_SCOPE = {};

export function lineMemo<T>(tokens: object, key: string, compute: () => T, scope?: object | null): T {
  const cache = scope === undefined ? unscopedLineCache(tokens) : scopedLineCache(tokens, scope ?? NO_SCOPE);
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  const value = compute();
  cache.set(key, value);
  return value;
}

function unscopedLineCache(tokens: object): Map<string, unknown> {
  let cache = lineCaches.get(tokens);
  if (cache === undefined) {
    cache = new Map();
    lineCaches.set(tokens, cache);
  }
  return cache;
}

function scopedLineCache(tokens: object, scope: object): Map<string, unknown> {
  let byScope = scopedLineCaches.get(tokens);
  if (byScope === undefined) {
    byScope = new WeakMap();
    scopedLineCaches.set(tokens, byScope);
  }
  let cache = byScope.get(scope);
  if (cache === undefined) {
    cache = new Map();
    byScope.set(scope, cache);
  }
  return cache;
}
