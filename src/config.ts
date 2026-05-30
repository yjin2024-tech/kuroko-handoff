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
  inputs: string[];
  dictionary: string;
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
    inputPaths: raw.inputs.map((input) => join(baseDir, input)),
    dictionaryPath: join(baseDir, raw.dictionary),
    detection: {
      engine: detectionEngine,
      presidio: raw.detection?.presidio,
    },
    detectors: raw.detectors,
    riskRules: raw.riskRules,
    partnerBrief: raw.partnerBrief,
  };
}
