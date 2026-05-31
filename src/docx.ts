import { inflateRawSync } from "node:zlib";

interface ZipEntry {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export function extractDocxText(buffer: Buffer): string {
  const documentXml = readZipTextEntry(buffer, "word/document.xml");
  if (!documentXml) {
    throw new Error("DOCX file does not contain word/document.xml");
  }

  return extractWordXmlText(documentXml);
}

function readZipTextEntry(buffer: Buffer, entryName: string): string | undefined {
  const entry = readCentralDirectory(buffer).find((item) => item.name === entryName);
  if (!entry) return undefined;

  const localOffset = entry.localHeaderOffset;
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${entryName}`);
  }

  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  const data =
    entry.compressionMethod === 0
      ? compressed
      : entry.compressionMethod === 8
        ? inflateRawSync(compressed)
        : unsupportedCompression(entry);

  if (data.length !== entry.uncompressedSize) {
    throw new Error(`Unexpected uncompressed size for ${entryName}`);
  }

  return data.toString("utf8");
}

function unsupportedCompression(entry: ZipEntry): never {
  throw new Error(
    `Unsupported DOCX ZIP compression method ${entry.compressionMethod} for ${entry.name}`,
  );
}

function readCentralDirectory(buffer: Buffer): ZipEntry[] {
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("Invalid ZIP central directory header");
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");

    entries.push({
      name,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  for (let offset = buffer.length - 22; offset >= 0; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("Invalid DOCX ZIP file");
}

function extractWordXmlText(xml: string): string {
  const lines: string[] = [];
  let current = "";
  const tokenPattern =
    /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<\/w:p>/g;

  for (const match of xml.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      current += decodeXml(match[1]);
      continue;
    }

    if (match[0].startsWith("<w:tab")) {
      current += "\t";
      continue;
    }

    if (match[0].startsWith("<w:br")) {
      current += "\n";
      continue;
    }

    if (match[0] === "</w:p>") {
      if (current.trim().length > 0) {
        lines.push(current);
      }
      current = "";
    }
  }

  if (current.trim().length > 0) {
    lines.push(current);
  }

  return `${lines.join("\n")}\n`;
}

function decodeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}
