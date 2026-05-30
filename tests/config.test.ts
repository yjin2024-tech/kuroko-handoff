import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { loadPackageConfig } from "../src/config.ts";

test("loads package config and resolves input paths relative to config file", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-config-"));
  const configPath = join(dir, "config.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      project: {
        id: "shigyo-demo",
        title: "士業相談資料整理デモ",
        locale: "ja-JP",
      },
      inputs: ["consultation_email.md", "client_records.csv"],
      dictionary: "dictionary.txt",
      detectors: [
        { id: "custom_dictionary", type: "dictionary", entity: "CUSTOM" },
        { id: "email", type: "regex", entity: "EMAIL" },
      ],
      riskRules: [
        { id: "possible_address", label: "住所らしき記載", severity: "medium" },
      ],
      partnerBrief: {
        purpose: "相談内容の要約",
        doNotDo: ["原文情報やmappingの提供を求めない"],
      },
    }),
    "utf8",
  );

  const config = loadPackageConfig(configPath);

  assert.equal(config.project.id, "shigyo-demo");
  assert.equal(config.baseDir, dir);
  assert.deepEqual(config.inputPaths, [
    join(dir, "consultation_email.md"),
    join(dir, "client_records.csv"),
  ]);
  assert.equal(config.dictionaryPath, join(dir, "dictionary.txt"));
  assert.equal(config.detectors[1].entity, "EMAIL");
});

test("defaults detection engine to simple when omitted", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-config-engine-"));
  writeFileSync(join(dir, "input.md"), "本文", "utf8");
  writeFileSync(join(dir, "dictionary.txt"), "山田太郎\n", "utf8");
  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({
      project: { id: "demo", title: "Demo", locale: "ja-JP" },
      inputs: ["input.md"],
      dictionary: "dictionary.txt",
      detectors: [{ id: "email", type: "regex", entity: "EMAIL" }],
      riskRules: [],
      partnerBrief: { purpose: "要約", doNotDo: ["原文確認"] },
    }),
    "utf8",
  );

  const config = loadPackageConfig(join(dir, "config.json"));

  assert.equal(config.detection.engine, "simple");
});

test("throws a clear error for unsupported detector type", () => {
  const dir = mkdtempSync(join(tmpdir(), "kuroko-config-invalid-"));
  const configPath = join(dir, "config.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      project: { id: "bad-demo", title: "Bad Demo", locale: "ja-JP" },
      inputs: ["input.md"],
      dictionary: "dictionary.txt",
      detectors: [{ id: "bad", type: "model", entity: "CUSTOM" }],
      riskRules: [],
      partnerBrief: { purpose: "demo", doNotDo: [] },
    }),
    "utf8",
  );

  assert.throws(
    () => loadPackageConfig(configPath),
    /Unsupported detector type: model/,
  );
});
