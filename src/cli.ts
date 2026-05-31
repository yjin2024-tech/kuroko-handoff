#!/usr/bin/env node
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { maskText } from "./masker.js";
import { runPackagePipeline } from "./pipeline.js";
import { createMaskingReport } from "./reporter.js";
import { restoreText } from "./restorer.js";
import type { MappingEntry, MappingFile } from "./types.js";

type Command = "package" | "mask" | "restore" | "restore-package";

main(process.argv.slice(2));

function main(args: string[]): void {
  const command = args[0] as Command | undefined;
  const options = parseOptions(args.slice(1));

  try {
    if (command === "package") {
      runPackage(options);
      return;
    }

    if (command === "mask") {
      runMask(options);
      return;
    }

    if (command === "restore") {
      runRestore(options);
      return;
    }

    if (command === "restore-package") {
      runRestorePackage(options);
      return;
    }

    throw new Error(usage());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

function runPackage(options: Map<string, string>): void {
  const outDir = requireOption(options, "out");
  const configPath = options.get("config");
  const inputDir = options.get("input-dir");

  if (!configPath && !inputDir) {
    throw new Error(`Missing required option --config or --input-dir\n\n${usage()}`);
  }

  runPackagePipeline({ configPath, inputDir, outDir });
}

function runMask(options: Map<string, string>): void {
  const inputPath = requireOption(options, "input");
  const outDir = requireOption(options, "out");
  const dictPath = options.get("dict");
  const input = readFileSync(inputPath, "utf8");
  const dictionaryTerms = dictPath ? readDictionary(dictPath) : [];
  const generatedAt = new Date().toISOString();
  const result = maskText(input, dictionaryTerms);
  const mappingFile: MappingFile = {
    version: 1,
    generatedAt,
    sourceFile: inputPath,
    mappings: result.mappings,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "sanitized.txt"), result.sanitized, "utf8");
  writeFileSync(
    join(outDir, "mapping.json"),
    `${JSON.stringify(mappingFile, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(outDir, "masking_report.md"),
    createMaskingReport({ inputFile: inputPath, generatedAt, result }),
    "utf8",
  );
}

function runRestore(options: Map<string, string>): void {
  const inputPath = requireOption(options, "input");
  const mappingPath = requireOption(options, "mapping");
  const outPath = requireOption(options, "out");
  const input = readFileSync(inputPath, "utf8");
  const mappings = readMappings(mappingPath);
  const restored = restoreText(input, mappings);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, restored, "utf8");
}

function runRestorePackage(options: Map<string, string>): void {
  const inputDir = requireOption(options, "input");
  const mappingPath = requireOption(options, "mapping");
  const outDir = requireOption(options, "out");
  const mappings = readMappings(mappingPath);

  for (const inputPath of listFiles(inputDir)) {
    const outputPath = join(outDir, relative(inputDir, inputPath));
    const restored = restoreText(readFileSync(inputPath, "utf8"), mappings);

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, restored, "utf8");
  }
}

function listFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path));
      continue;
    }

    files.push(path);
  }

  return files;
}

function readDictionary(path: string): string[] {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

function readMappings(path: string): MappingEntry[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as
    | MappingFile
    | MappingEntry[];

  if (Array.isArray(parsed)) {
    return parsed;
  }

  return parsed.mappings;
}

function parseOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (!key?.startsWith("--") || !value) {
      throw new Error(usage());
    }

    options.set(key.slice(2), value);
  }

  return options;
}

function requireOption(options: Map<string, string>, name: string): string {
  const value = options.get(name);

  if (!value) {
    throw new Error(`Missing required option --${name}\n\n${usage()}`);
  }

  return value;
}

function usage(): string {
  return [
    "Usage:",
    "  kuroko-handoff package --config <config.json> --out <dir>",
    "  kuroko-handoff package --input-dir <dir> --out <dir>",
    "  kuroko-handoff package --config <config.json> --input-dir <dir> --out <dir>",
    "  kuroko-handoff mask --input <file> --dict <file> --out <dir>",
    "  kuroko-handoff restore --input <file> --mapping <mapping.json> --out <file>",
    "  kuroko-handoff restore-package --input <dir> --mapping <mapping.json> --out <dir>",
  ].join("\n");
}
