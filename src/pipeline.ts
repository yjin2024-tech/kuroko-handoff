import { readFileSync } from "node:fs";
import { loadPackageConfig } from "./config.js";
import { ingestDocuments } from "./ingest.js";
import { classifyDocuments } from "./classifier.js";
import { resolveDetectorEngine } from "./detectorEngines.js";
import { maskDocuments } from "./pipelineMasker.js";
import { createRiskWarnings, redactRiskWarnings } from "./risk.js";
import { createAuditLog } from "./audit.js";
import { writeHandoffPackage } from "./packageWriter.js";
import { getToolVersion } from "./version.js";

export function runPackagePipeline(configPath: string, outDir: string): void {
  const config = loadPackageConfig(configPath);
  const dictionaryTerms = readFileSync(config.dictionaryPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceDocuments = classifyDocuments(ingestDocuments(config.inputPaths));
  const detectorEngine = resolveDetectorEngine(config);
  const findings = detectorEngine.detect({
    docs: sourceDocuments,
    config,
    dictionaryTerms,
  });
  const masked = maskDocuments(sourceDocuments, findings);
  const warnings = createRiskWarnings(masked.sanitizedDocuments);
  const riskRedacted = redactRiskWarnings(masked.sanitizedDocuments, warnings);
  const mappings = [...masked.mappings, ...riskRedacted.mappings];
  const outputFiles = [
    "handoff_package/sanitized",
    "handoff_package/partner_brief.md",
    "handoff_package/masking_report.md",
    "handoff_package/risk_register.md",
    "handoff_package/review_queue.md",
    "handoff_package/acceptance_checklist.md",
    "handoff_package/DO_NOT_SHARE_mapping_notice.md",
    "handoff_package/security_review.md",
    "handoff_package/audit_log.json",
    "local_only/mapping.local.json",
  ];
  const auditLog = createAuditLog({
    projectId: config.project.id,
    toolVersion: getToolVersion(),
    sourceDocuments,
    detectors: config.detectors.map((detector) => detector.id),
    outputFiles,
    findings,
    warnings,
  });

  writeHandoffPackage({
    outDir,
    projectTitle: config.project.title,
    partnerPurpose: config.partnerBrief.purpose,
    partnerDoNotDo: config.partnerBrief.doNotDo,
    sanitizedDocuments: riskRedacted.documents,
    mappings,
    findings,
    warnings,
    auditLog,
  });
}
