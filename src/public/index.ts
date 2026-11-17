
import {
  clearProviderCaches as clearNodeProviderCaches,
  createTranslationPipeline as createNodeTranslationPipeline
} from "../default-provider.js";
import type { TranslationPipeline, TranslationPipelineOptions } from "../pipeline/core.js";
import { translationPipelineCacheKey, withPublicPipelineDefaults } from "../pipeline-cache-key.js";

export type HaruOptions = Pick<
  TranslationPipelineOptions,
  "register" | "dataDir" | "systemDictPath" | "userDictPath" | "readingFallbackRule" | "annotateOov" | "annotateUserDict"
>;

export type { TranslationPipeline };
export type { ReadingRule } from "../generator/readings.js";

const pipelines = new Map<string, Promise<TranslationPipeline>>();

export function createTranslationPipeline(requested: HaruOptions = {}): Promise<TranslationPipeline> {
  const options = withPublicPipelineDefaults(requested);
  const key = translationPipelineCacheKey(options);
  const cached = pipelines.get(key);
  if (cached !== undefined) return cached;
  const created = createNodeTranslationPipeline(options);
  pipelines.set(key, created);
  created.catch(() => {
    if (pipelines.get(key) === created) pipelines.delete(key);
  });
  return created;
}

export function clearProviderCaches(): void {
  pipelines.clear();
  clearNodeProviderCaches();
}

export { UserDictionary, type UserDictEntry } from "../user-dictionary.js";
export { buildUserDict } from "../analyzer/node-helpers.js";

export type { Warning, WarningSeverity, WarningType } from "../types/warning.js";

export {
  ANNOTATION_KEY_OOV,
  ANNOTATION_KEY_USER_DICT,
  type AnnotatedResult,
  type AnnotatedSegment,
  type AnnotatedText,
  type AnnotationEntry,
  type AnnotationMetadata,
  type AnnotationTableAction,
  type AnnotationTableUpdate,
  type CharPointAnnotationMetadata,
  type InterpunctAnnotation,
  type RangeAnnotation,
  type ReplaceAnnotation,
  type RubyAnnotation,
  type RubyBaseAnnotation,
  type RubyEmphAnnotation,
  type TransparentPauseAnnotation
} from "../types/annotation.js";
export {
  EMPTY_TABLE_UPDATE,
  applyTableUpdate,
  composeTableUpdates,
  diffTableUpdate,
  nextAnnotationKey
} from "../transform/table-update.js";

export type { DataLoader, DataLoaderEntry, DataLoaderStat } from "../data-loader.js";

export { decideRegisters, type StreamDecision } from "../stateful/register-stream.js";
