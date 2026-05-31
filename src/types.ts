export type EntityType =
  | "CUSTOM"
  | "PERSON_NAME"
  | "COMPANY_NAME"
  | "DEPARTMENT"
  | "ROLE_TITLE"
  | "EMAIL"
  | "PHONE"
  | "POSTAL_CODE"
  | "ADDRESS"
  | "AMOUNT"
  | "DATE"
  | "CUSTOMER_ID"
  | "CASE_ID"
  | "INVOICE_ID"
  | "CONTRACT_ID"
  | "PROJECT_NAME"
  | "REVIEW_REQUIRED";
export type DocumentFormat = "txt" | "md" | "csv" | "docx";
export type Confidence = "high" | "medium" | "low";
export type RiskSeverity = "high" | "medium" | "low";
export type DetectionEngineId = "simple" | "presidio";
export type IntakeEntryStatus =
  | "accepted"
  | "skipped"
  | "unsupported"
  | "blocked";

export interface DetectedMatch {
  type: EntityType;
  value: string;
  start: number;
  end: number;
}

export interface MappingEntry {
  placeholder: string;
  value: string;
  type: EntityType;
}

export interface MappingFile {
  version: 1;
  generatedAt: string;
  sourceFile: string;
  mappings: MappingEntry[];
}

export interface MaskResult {
  sanitized: string;
  mappings: MappingEntry[];
  acceptedMatches: DetectedMatch[];
}

export interface PackageProjectConfig {
  id: string;
  title: string;
  locale: string;
}

export interface DetectorConfig {
  id: string;
  type: "dictionary" | "regex";
  entity: EntityType;
}

export interface RiskRuleConfig {
  id: string;
  label: string;
  severity: RiskSeverity;
}

export interface PartnerBriefConfig {
  purpose: string;
  doNotDo: string[];
}

export interface DetectionConfig {
  engine: DetectionEngineId;
  presidio?: {
    command: string;
    args: string[];
  };
}

export interface IntakeConfig {
  mode: "explicit" | "folder";
  maxFileBytes: number;
  unsupportedPolicy: "record";
  blockedPolicy: "fail";
}

export interface PackageConfig {
  project: PackageProjectConfig;
  baseDir: string;
  inputPaths: string[];
  dictionaryPath?: string;
  intake?: IntakeConfig;
  detection: DetectionConfig;
  detectors: DetectorConfig[];
  riskRules: RiskRuleConfig[];
  partnerBrief: PartnerBriefConfig;
}

export interface CsvDocumentData {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface SourceDocument {
  id: string;
  sourcePath: string;
  format: DocumentFormat;
  text: string;
  contentHash: string;
  outputName?: string;
  csv?: CsvDocumentData;
  labels: string[];
}

export interface IntakeManifestEntry {
  relativePath: string;
  status: IntakeEntryStatus;
  reason: string;
  sizeBytes: number;
  format?: DocumentFormat;
  sha256?: string;
}

export interface IntakeManifest {
  rootDir: string;
  generatedAt: string;
  totalFiles: number;
  entries: IntakeManifestEntry[];
}

export interface Finding {
  id: string;
  documentId: string;
  entity: EntityType;
  value: string;
  start: number;
  end: number;
  detectorId: string;
  confidence: Confidence;
}

export interface RiskWarning {
  id: string;
  documentId: string;
  ruleId: string;
  label: string;
  severity: RiskSeverity;
  excerpt: string;
}

export interface AuditLog {
  runId: string;
  generatedAt: string;
  projectId: string;
  toolVersion: string;
  inputHashes: Array<{ documentId: string; sha256: string }>;
  detectors: string[];
  outputFiles: string[];
  findingCounts: Record<string, number>;
  riskWarningCounts: Record<string, number>;
}
