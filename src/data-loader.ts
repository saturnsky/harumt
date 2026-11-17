export interface DataLoaderEntry {
  readonly name: string;
  readonly isDirectory: boolean;
  readonly isFile: boolean;
}

export interface DataLoaderStat {
  readonly size: number;
  readonly mtimeNs: bigint;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
}

export interface DataLoader {
  readTextFile(path: string): Promise<string>;
  readBinaryFile(path: string): Promise<Uint8Array>;
  readDir(path: string): Promise<readonly DataLoaderEntry[]>;
  stat(path: string): Promise<DataLoaderStat>;
  exists(path: string): Promise<boolean>;
  joinPath(...segments: string[]): string;
  dirName(path: string): string;
  getDataDir(): string;
  getHomeDir(): string;
}

export async function collectJsonlFiles(loader: DataLoader, root: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await loader.readDir(root)) {
    const path = loader.joinPath(root, entry.name);
    if (entry.isDirectory) {
      files.push(...await collectJsonlFiles(loader, path));
    } else if (entry.isFile && entry.name.endsWith(".jsonl")) {
      files.push(path);
    }
  }
  return files.sort();
}

let globalLoader: DataLoader | undefined;

export function setDataLoader(loader: DataLoader): void {
  globalLoader = loader;
}

export function getDataLoader(): DataLoader {
  if (globalLoader === undefined) {
    throw new Error(
      "DataLoader not initialized. Call setDataLoader() before using the translation pipeline."
    );
  }
  return globalLoader;
}

export function lazyValue<T extends object>(factory: () => T): T {
  let resolved: T | undefined;
  return new Proxy(Object.create(null) as T, {
    get(_, prop) {
      resolved ??= factory();
      const v = Reflect.get(resolved, prop, resolved);
      return typeof v === "function" ? v.bind(resolved) : v;
    },
    has(_, prop) {
      resolved ??= factory();
      return Reflect.has(resolved, prop);
    },
    ownKeys() {
      resolved ??= factory();
      return Reflect.ownKeys(resolved);
    },
    getOwnPropertyDescriptor(_, prop) {
      resolved ??= factory();
      return Reflect.getOwnPropertyDescriptor(resolved, prop);
    },
    getPrototypeOf() {
      resolved ??= factory();
      return Reflect.getPrototypeOf(resolved);
    }
  });
}
