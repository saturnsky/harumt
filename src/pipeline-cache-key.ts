import type { TranslationPipelineOptions } from "./pipeline-factory.js";

export function withPublicPipelineDefaults(options: TranslationPipelineOptions = {}): TranslationPipelineOptions {
  return { ...options, register: options.register ?? "casual", readingFallbackRule: options.readingFallbackRule ?? "common" };
}

export function translationPipelineCacheKey(
  options: TranslationPipelineOptions = {}
): string {
  return JSON.stringify({
    register: options.register,
    dataDir: options.dataDir,
    dictDir: options.dictDir,
    patternDir: options.patternDir,
    collocationDir: options.collocationDir,
    numericSplitsDir: options.numericSplitsDir,
    reanalysisDir: options.reanalysisDir,
    supplementalLexiconDir: options.supplementalLexiconDir,
    systemDictPath: options.systemDictPath,
    userDictPath: options.userDictPath,
    sudachiConfigPath: options.sudachiConfigPath,
    readingFallbackRule: options.readingFallbackRule,
    useCommittedKoreanFallback: options.useCommittedKoreanFallback ?? false,
    annotateOov: options.annotateOov ?? false,
    annotateUserDict: options.annotateUserDict ?? false,
  });
}
