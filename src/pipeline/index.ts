export { TranslationPipeline } from "./core.js";
export type { TranslationPipelineOptions, TranslationPipelineResources } from "./core.js";

export interface TranslationResult {
  text: string;
  register: "casual" | "formal";
}
