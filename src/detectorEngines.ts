import { detectFindings } from "./detectors.js";
import type { Finding, PackageConfig, SourceDocument } from "./types.js";

export interface DetectorEngineInput {
  docs: SourceDocument[];
  config: PackageConfig;
  dictionaryTerms: string[];
}

export interface DetectorEngine {
  id: string;
  detect(input: DetectorEngineInput): Finding[];
}

const simpleDetectorEngine: DetectorEngine = {
  id: "simple",
  detect(input) {
    return detectFindings(
      input.docs,
      input.config.detectors,
      input.dictionaryTerms,
    );
  },
};

const presidioDetectorEngine: DetectorEngine = {
  id: "presidio",
  detect(input) {
    if (!input.config.detection.presidio?.command) {
      throw new Error(
        "Presidio engine is configured but no adapter command was provided",
      );
    }

    throw new Error(
      "Presidio adapter execution is planned for a later v0.2 task",
    );
  },
};

export function resolveDetectorEngine(config: PackageConfig): DetectorEngine {
  if (config.detection.engine === "presidio") {
    return presidioDetectorEngine;
  }

  return simpleDetectorEngine;
}
