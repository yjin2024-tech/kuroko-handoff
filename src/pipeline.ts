import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadPackageConfig } from "./config.js";
import { createDefaultPackageConfig } from "./defaultProfile.js";
import { ingestDocuments } from "./ingest.js";
import {
  createExplicitInputManifest,
  scanCaseFolder,
} from "./intake.js";
import { classifyDocuments } from "./classifier.js";
import { resolveDetectorEngine } from "./detectorEngines.js";
import { maskDocuments } from "./pipelineMasker.js";
import { createRiskWarnings, redactRiskWarnings } from "./risk.js";
import { createAuditLog } from "./audit.js";
import { writeHandoffPackage } from "./packageWriter.js";
import { getToolVersion } from "./version.js";
import type { IntakeManifest, PackageConfig } from "./types.js";

export interface RunPackagePipelineOptions {
  configPath?: string;
  inputDir?: string;
  outDir: string;
}

export function runPackagePipeline(
  configPathOrOptions: string | RunPackagePipelineOptions,
  legacyOutDir?: string,
): void {
  const options =
    typeof configPathOrOptions === "string"
      ? { configPath: configPathOrOptions, outDir: requireOutDir(legacyOutDir) }
      : configPathOrOptions;
  const { config, intakeManifest } = preparePackageInputs(options);
  const dictionaryTerms = readDictionaryTerms(config.dictionaryPath);
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
    "handoff_package/input_manifest.md",
    "handoff_package/input_manifest.json",
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
    outDir: options.outDir,
    projectTitle: config.project.title,
    partnerPurpose: config.partnerBrief.purpose,
    partnerDoNotDo: config.partnerBrief.doNotDo,
    sanitizedDocuments: riskRedacted.documents,
    mappings,
    findings,
    warnings,
    intakeManifest,
    auditLog,
  });
}

function preparePackageInputs(options: RunPackagePipelineOptions): {
  config: PackageConfig;
  intakeManifest: IntakeManifest;
} {
  if (!options.configPath && !options.inputDir) {
    throw new Error("package requires --config, --input-dir, or both");
  }

  const baseConfig = options.configPath
    ? loadPackageConfig(options.configPath)
    : createDefaultPackageConfig(requireInputDir(options.inputDir));

  if (!options.inputDir) {
    if (baseConfig.inputPaths.length === 0) {
      throw new Error("No input files configured");
    }
    return {
      config: baseConfig,
      intakeManifest: createExplicitInputManifest(
        baseConfig.baseDir,
        baseConfig.inputPaths,
      ),
    };
  }

  const intakeManifest = scanCaseFolder(options.inputDir, {
    maxFileBytes: baseConfig.intake?.maxFileBytes,
  });
  const blocked = intakeManifest.entries.filter(
    (entry) => entry.status === "blocked",
  );
  if (blocked.length > 0) {
    throw new Error(
      [
        "Blocked files found during input scan:",
        ...blocked.map((entry) => `- ${entry.relativePath}: ${entry.reason}`),
      ].join("\n"),
    );
  }

  const inputPaths = intakeManifest.entries
    .filter((entry) => entry.status === "accepted")
    .map((entry) => join(requireInputDir(options.inputDir), entry.relativePath));

  if (inputPaths.length === 0) {
    throw new Error("No supported input files found in --input-dir");
  }

  return {
    config: {
      ...baseConfig,
      baseDir: requireInputDir(options.inputDir),
      inputPaths,
      intake: {
        mode: "folder",
        maxFileBytes: baseConfig.intake?.maxFileBytes ?? 5 * 1024 * 1024,
        unsupportedPolicy: "record",
        blockedPolicy: "fail",
      },
    },
    intakeManifest,
  };
}

function readDictionaryTerms(dictionaryPath: string | undefined): string[] {
  if (!dictionaryPath) return [];

  return readFileSync(dictionaryPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function requireOutDir(outDir: string | undefined): string {
  if (!outDir) throw new Error("Missing required outDir");
  return outDir;
}

function requireInputDir(inputDir: string | undefined): string {
  if (!inputDir) throw new Error("Missing required inputDir");
  return inputDir;
}
