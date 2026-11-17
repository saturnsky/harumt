import type { RuleTraceEvent } from "../../types/pipeline.js";
import type { RuntimeHaruToken } from "../../types/token.js";
import { type ContentCtx, RuleResult, RuleTraceEvent as ContentRuleTraceEvent } from "../content-types.js";
import {
  type ContentResolverEntryAuxResolver,
  type ContentResolverRuntimeAccess,
  type RuleResultLike
} from "./types.js";
import { normalizeContentPostAuxPattern } from "./adapter-helpers.js";
import type { ModalityResolver } from "../rules/modality.js";
import type { PostAuxPatternResolverLike as PostAuxResolverLike } from "../rules/postaux-types.js";
import type { TailResolver } from "../rules/tail-types.js";

export interface ContentResolverRuleAdapterBridge {
  sahenInfoFromRuntime(resolver: ContentResolverRuntimeAccess, tokens: readonly RuntimeHaruToken[], start: number): Promise<readonly [isSahen: boolean, sahenNoun: string | null]>;
  resolveYoudaCase(resolver: ContentResolverRuntimeAccess, ctx: ContentCtx, options?: { readonly isPotential?: boolean }): RuleResultLike | null;
  resolveAdverbialAdjectiveCase(resolver: ContentResolverRuntimeAccess, ctx: ContentCtx): Promise<RuleResultLike | null>;
}

export function contentRuleResultFromLike(result: RuleResultLike | null): RuleResult | null {
  if (result === null) {
    return null;
  }
  const renderPlan = result.renderPlan ?? null;
  return new RuleResult(
    result.consumed,
    result.korean,
    result.spaceAfter,
    renderPlan,
    result.traceTag ?? null,
    (result.traceEvents ?? []).map(contentTraceEventFromLike),
    result.benefactive ?? {},
    result.warnings ?? [],
    result.renderPlanPolicy ?? "normal",
    result.sourceVerbalPredicateVerdict ?? null,
    result.rawSourceSurface
  );
}

export function postAuxResolverAdapter(resolver: ContentResolverRuntimeAccess): Required<PostAuxResolverLike> {
  return {
    patterns: {
      matchPostAux: (tokens, after, auxTokens) => {
        const matched = resolver.patterns.matchPostAux(tokens, after, auxTokens) ?? null;
        return matched === null ? null : normalizeContentPostAuxPattern(matched);
      }
    }
  };
}

export function modalityResolverAdapter(resolver: ContentResolverRuntimeAccess, bridge: ContentResolverRuleAdapterBridge): ModalityResolver {
  return {
    lookups: resolver.lookups,
    _resolveYoudaCase: (ctx, options) =>
      contentRuleResultFromLike(bridge.resolveYoudaCase(resolver, ctx, options ?? {})),
    _resolveAdverbialAdjectiveCase: async (ctx) =>
      contentRuleResultFromLike(await bridge.resolveAdverbialAdjectiveCase(resolver, ctx))
  };
}

export function tailResolverAdapter(resolver: ContentResolverRuntimeAccess, bridge: ContentResolverRuleAdapterBridge): TailResolver {
  const sahenInfo = (tokens: readonly RuntimeHaruToken[], start: number): Promise<readonly [isSahen: boolean, sahenNoun: string | null]> =>
    bridge.sahenInfoFromRuntime(resolver, tokens, start);
  return {
    numeric: resolver.numeric,
    ...(resolver.dictionary === undefined ? {} : {
      dictionary: {
        lookupTokenRelaxed: async (token) => {
          const relaxed = await resolver.dictionary?.lookupTokenRelaxed?.(token);
          if (relaxed !== undefined && relaxed !== null) {
            return relaxed;
          }
          return (await resolver.dictionary?.lookup(token.dictionaryForm, token.dictionaryFormReading ?? token.reading ?? "", token.pos)) ?? undefined;
        }
      }
    }),
    patterns: resolver.patterns as NonNullable<TailResolver["patterns"]>,
    _sahenInfo: sahenInfo
  };
}

export function entryAuxResolverAdapter(resolver: ContentResolverRuntimeAccess, bridge: ContentResolverRuleAdapterBridge): ContentResolverEntryAuxResolver {
  return {
    ...modalityResolverAdapter(resolver, bridge),
    ...postAuxResolverAdapter(resolver)
  };
}

function contentTraceEventFromLike(event: RuleTraceEvent | null): ContentRuleTraceEvent {
  if (event === null) {
    return new ContentRuleTraceEvent("postverb_shadow", {});
  }
  return new ContentRuleTraceEvent(
    event.ruleName,
    event.detail,
    event.phase ?? "special",
    event.matched ?? true,
    event.tokenIdx ?? null
  );
}
