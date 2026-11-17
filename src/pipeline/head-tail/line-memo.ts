
const lineCaches = new WeakMap<object, Map<string, unknown>>();

export function lineMemo<T>(tokens: object, key: string, compute: () => T): T {
  let cache = lineCaches.get(tokens);
  if (cache === undefined) {
    cache = new Map();
    lineCaches.set(tokens, cache);
  }
  if (cache.has(key)) {
    return cache.get(key) as T;
  }
  const value = compute();
  cache.set(key, value);
  return value;
}
