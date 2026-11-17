import { getDataLoader } from "../data-loader.js";

export interface DataPathOptions {
  dataDir?: string;
}

export function resolveDataDir(options: DataPathOptions = {}): string {
  if (options.dataDir !== undefined) {
    return options.dataDir;
  }
  return getDataLoader().getDataDir();
}
