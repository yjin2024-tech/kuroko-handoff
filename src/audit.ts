import type { AuditLog, Finding, RiskWarning, SourceDocument } from "./types.js";

export function createAuditLog(args: {
  projectId: string;
  toolVersion: string;
  sourceDocuments: SourceDocument[];
  detectors: string[];
  outputFiles: string[];
  findings: Finding[];
  warnings: RiskWarning[];
}): AuditLog {
  return {
    runId: `${args.projectId}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    projectId: args.projectId,
    toolVersion: args.toolVersion,
    inputHashes: args.sourceDocuments.map((doc) => ({
      documentId: doc.id,
      sha256: doc.contentHash,
    })),
    detectors: args.detectors,
    outputFiles: args.outputFiles,
    findingCounts: countBy(args.findings.map((finding) => finding.entity)),
    riskWarningCounts: countBy(args.warnings.map((warning) => warning.ruleId)),
  };
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}
