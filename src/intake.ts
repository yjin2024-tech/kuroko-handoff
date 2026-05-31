import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";
import type {
  DocumentFormat,
  IntakeManifest,
  IntakeManifestEntry,
} from "./types.js";

const DEFAULT_MAX_FILE_BYTES = 5 * 1024 * 1024;

const SUPPORTED_FORMATS: Record<string, DocumentFormat> = {
  ".md": "md",
  ".txt": "txt",
  ".csv": "csv",
  ".docx": "docx",
};

const UNSUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".xlsx",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".zip",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
  ".sh",
]);

export interface ScanCaseFolderOptions {
  maxFileBytes?: number;
}

export function scanCaseFolder(
  rootDir: string,
  options: ScanCaseFolderOptions = {},
): IntakeManifest {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const entries = listFiles(rootDir)
    .map((path) => classifyFile(rootDir, path, maxFileBytes))
    .sort((a, b) => comparePath(a.relativePath, b.relativePath));

  return {
    rootDir,
    generatedAt: new Date().toISOString(),
    totalFiles: entries.length,
    entries,
  };
}

export function createExplicitInputManifest(
  rootDir: string,
  inputPaths: string[],
): IntakeManifest {
  const entries = inputPaths
    .map((path) => {
      const stats = statSync(path);
      const ext = extname(path).toLowerCase();
      return {
        relativePath: relative(rootDir, path).replaceAll("\\", "/"),
        status: "accepted" as const,
        reason: "configured input",
        sizeBytes: stats.size,
        format: SUPPORTED_FORMATS[ext],
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      };
    })
    .sort((a, b) => comparePath(a.relativePath, b.relativePath));

  return {
    rootDir,
    generatedAt: new Date().toISOString(),
    totalFiles: entries.length,
    entries,
  };
}

function comparePath(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function classifyFile(
  rootDir: string,
  path: string,
  maxFileBytes: number,
): IntakeManifestEntry {
  const relativePath = relative(rootDir, path).replaceAll("\\", "/");
  const name = basename(path);
  const stats = statSync(path);
  const ext = extname(path).toLowerCase();

  if (name.startsWith("~$")) {
    return {
      relativePath,
      status: "skipped",
      reason: "Office temporary file",
      sizeBytes: stats.size,
    };
  }

  if (name === ".DS_Store") {
    return {
      relativePath,
      status: "skipped",
      reason: "system metadata file",
      sizeBytes: stats.size,
    };
  }

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      relativePath,
      status: "blocked",
      reason: `${ext} files are blocked and must not be processed`,
      sizeBytes: stats.size,
    };
  }

  const format = SUPPORTED_FORMATS[ext];
  if (format) {
    if (stats.size > maxFileBytes) {
      return {
        relativePath,
        status: "blocked",
        reason: `file is larger than ${maxFileBytes} bytes`,
        sizeBytes: stats.size,
      };
    }

    return {
      relativePath,
      status: "accepted",
      reason: `supported ${ext} input`,
      sizeBytes: stats.size,
      format,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    };
  }

  const reason = UNSUPPORTED_EXTENSIONS.has(ext)
    ? `${ext} is not supported in v0.3`
    : `${ext || "extensionless file"} is not supported in v0.3`;

  return {
    relativePath,
    status: "unsupported",
    reason,
    sizeBytes: stats.size,
  };
}

function listFiles(rootDir: string): string[] {
  return readdirSync(rootDir).flatMap((entry) => {
    const path = join(rootDir, entry);
    const stats = statSync(path);
    return stats.isDirectory() ? listFiles(path) : [path];
  });
}
