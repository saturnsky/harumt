import type { RuntimeHaruToken } from "../../../../types/token.js";
import type { Warning } from "../../../../types/warning.js";
import type { TailChainPartialArtifact } from "../chain.js";
import type { ClauseBoundary } from "./commit.js";

export function partialTailSuffixUnresolvedWarning(
  tokens: readonly RuntimeHaruToken[],
  suffixStart: number,
  scanEnd: number
): Warning {
  const suffixSurface = tokens
    .slice(suffixStart, scanEnd + 1)
    .map((token) => token.surface)
    .join("");
  return {
    type: "partial_tail_suffix_unresolved",
    severity: "warning",
    opKind: "tail_suffix_attachment",
    span: { start: suffixStart, end: scanEnd },
    message: `source-bearing tail prefix preserved, but suffix attachment is unresolved: ${suffixSurface}`
  };
}

export function tailBoundaryAttachmentWeakPartial(
  _tokens: readonly RuntimeHaruToken[],
  start: number,
  scanEnd: number,
  boundary: ClauseBoundary
): TailChainPartialArtifact {
  const attachmentSpan = boundary.kind === "terminal"
    ? undefined
    : {
      start: boundary.tokenSpan.start,
      end: boundary.tokenSpan.end,
      surface: boundary.surface
    };
  return {
    kind: "source_bearing_connective_prefix",
    decision: "weak_attachment_warning",
    parsedPrefixSpan: { start, end: scanEnd + 1 },
    unresolvedSuffixSpan: { start: scanEnd + 1, end: scanEnd + 1 },
    ...(attachmentSpan === undefined ? {} : { attachmentSpan }),
    suffixCanStayInAssembler: false,
    auditReason: "source-bearing connective boundary preserved; following attachment evidence is weak"
  };
}

export function tailFunctionalSuffixHandoffPartial(
  start: number,
  end: number,
  scanEnd: number
): TailChainPartialArtifact {
  return {
    kind: "source_bearing_connective_prefix",
    decision: "functional_suffix_handoff",
    parsedPrefixSpan: { start, end: end + 1 },
    unresolvedSuffixSpan: { start: end + 1, end: scanEnd + 1 },
    suffixCanStayInAssembler: true,
    auditReason: "source-bearing connective prefix preserved; functional suffix left for assembler"
  };
}

export function tailUnresolvedFunctionalResidualPartial(
  start: number,
  end: number,
  scanEnd: number
): TailChainPartialArtifact {
  return {
    kind: "source_bearing_tail_prefix",
    decision: "unresolved_suffix_warning",
    parsedPrefixSpan: { start, end: end + 1 },
    unresolvedSuffixSpan: { start: end + 1, end: scanEnd + 1 },
    suffixCanStayInAssembler: false,
    auditReason: "source-bearing tail prefix preserved; unresolved functional residual warning"
  };
}
