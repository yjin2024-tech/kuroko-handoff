import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { extractDocxText } from "./docx.js";
import type { DocumentFormat, SourceDocument } from "./types.js";

export function ingestDocuments(inputPaths: string[]): SourceDocument[] {
  return inputPaths.map((sourcePath) => {
    const bytes = readFileSync(sourcePath);
    const format = detectFormat(sourcePath);
    const raw = format === "docx" ? extractDocxText(bytes) : bytes.toString("utf8");
    const csv = format === "csv" ? parseCsv(raw) : undefined;
    const fileName = basename(sourcePath);

    return {
      id: basename(sourcePath, extname(sourcePath)),
      sourcePath,
      format,
      text: raw,
      contentHash: createHash("sha256").update(bytes).digest("hex"),
      outputName: format === "docx" ? `${fileName}.md` : fileName,
      csv,
      labels: [],
    };
  });
}

function detectFormat(path: string): DocumentFormat {
  const ext = extname(path).toLowerCase();

  if (ext === ".md") return "md";
  if (ext === ".csv") return "csv";
  if (ext === ".txt") return "txt";
  if (ext === ".docx") return "docx";

  throw new Error(`Unsupported input format: ${ext}`);
}

function parseCsv(text: string) {
  const lines = text.trimEnd().split(/\r?\n/);
  const headers = splitCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""]),
    );
  });

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
        continue;
      }

      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}
