import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  DetectorConfig,
  PackageConfig,
  PartnerBriefConfig,
  RiskRuleConfig,
} from "./types.js";

interface RawPackageConfig {
  project: { id: string; title: string; locale: string };
  inputs?: string[];
  dictionary?: string;
  intake?: {
    mode?: unknown;
    maxFileBytes?: unknown;
    unsupportedPolicy?: unknown;
    blockedPolicy?: unknown;
  };
  detection?: {
    engine?: unknown;
    presidio?: { command: string; args: string[] };
  };
  detectors: DetectorConfig[];
  riskRules: RiskRuleConfig[];
  partnerBrief: PartnerBriefConfig;
}

export function loadPackageConfig(configPath: string): PackageConfig {
  const baseDir = dirname(configPath);
  const raw = JSON.parse(readFileSync(configPath, "utf8")) as RawPackageConfig;

  for (const detector of raw.detectors) {
    if (detector.type !== "dictionary" && detector.type !== "regex") {
      throw new Error(`Unsupported detector type: ${detector.type}`);
    }
  }

  const detectionEngine = raw.detection?.engine ?? "simple";
  if (detectionEngine !== "simple" && detectionEngine !== "presidio") {
    throw new Error(`Unsupported detection engine: ${detectionEngine}`);
  }

  return {
    project: raw.project,
    baseDir,
    inputPaths: (raw.inputs ?? []).map((input) => join(baseDir, input)),
    dictionaryPath: raw.dictionary ? join(baseDir, raw.dictionary) : undefined,
    intake: parseIntake(raw.intake, raw.inputs ? "explicit" : "folder"),
    detection: {
      engine: detectionEngine,
      presidio: raw.detection?.presidio,
    },
    detectors: raw.detectors,
    riskRules: raw.riskRules,
    partnerBrief: raw.partnerBrief,
  };
}

function parseIntake(
  raw: RawPackageConfig["intake"],
  defaultMode: "explicit" | "folder",
) {
  const rawMode = raw?.mode;
  if (
    rawMode !== undefined &&
    rawMode !== "explicit" &&
    rawMode !== "folder"
  ) {
    throw new Error(`Unsupported intake mode: ${rawMode}`);
  }
  const mode = rawMode ?? defaultMode;

  const rawUnsupportedPolicy = raw?.unsupportedPolicy;
  if (
    rawUnsupportedPolicy !== undefined &&
    rawUnsupportedPolicy !== "record"
  ) {
    throw new Error(`Unsupported unsupportedPolicy: ${rawUnsupportedPolicy}`);
  }
  const unsupportedPolicy: "record" = "record";

  const rawBlockedPolicy = raw?.blockedPolicy;
  if (rawBlockedPolicy !== undefined && rawBlockedPolicy !== "fail") {
    throw new Error(`Unsupported blockedPolicy: ${rawBlockedPolicy}`);
  }
  const blockedPolicy: "fail" = "fail";

  const rawMaxFileBytes = raw?.maxFileBytes;
  if (
    rawMaxFileBytes !== undefined &&
    (typeof rawMaxFileBytes !== "number" ||
      !Number.isInteger(rawMaxFileBytes) ||
      rawMaxFileBytes <= 0)
  ) {
    throw new Error(`Invalid maxFileBytes: ${rawMaxFileBytes}`);
  }
  const maxFileBytes = rawMaxFileBytes ?? 5 * 1024 * 1024;
  if (!Number.isInteger(maxFileBytes) || maxFileBytes <= 0) {
    throw new Error(`Invalid maxFileBytes: ${maxFileBytes}`);
  }

  return {
    mode,
    maxFileBytes,
    unsupportedPolicy,
    blockedPolicy,
  };
}
