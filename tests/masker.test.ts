import assert from "node:assert/strict";
import test from "node:test";
import { maskText } from "../src/masker.ts";

test("masks repeated sensitive values with stable semantic placeholders", () => {
  const input =
    "青葉商事の連絡先は demo@example.jp、電話は03-1234-5678です。青葉商事には2026年4月12日に1,200万円を提示しました。";
  const result = maskText(input, ["青葉商事"]);

  assert.equal(
    result.sanitized,
    "{{CUSTOM_001}}の連絡先は {{EMAIL_001}}、電話は{{PHONE_001}}です。{{CUSTOM_001}}には{{DATE_001}}に{{AMOUNT_001}}を提示しました。",
  );
  assert.deepEqual(
    result.mappings.map((entry) => [
      entry.placeholder,
      entry.value,
      entry.type,
    ]),
    [
      ["{{CUSTOM_001}}", "青葉商事", "CUSTOM"],
      ["{{EMAIL_001}}", "demo@example.jp", "EMAIL"],
      ["{{PHONE_001}}", "03-1234-5678", "PHONE"],
      ["{{DATE_001}}", "2026年4月12日", "DATE"],
      ["{{AMOUNT_001}}", "1,200万円", "AMOUNT"],
    ],
  );
});

test("prefers dictionary matches over overlapping broad matches", () => {
  const input = "案件A-2026-0412の期日は2026-04-12です。";
  const result = maskText(input, ["案件A-2026-0412"]);

  assert.equal(result.sanitized, "{{CUSTOM_001}}の期日は{{DATE_001}}です。");
  assert.deepEqual(
    result.mappings.map((entry) => [
      entry.placeholder,
      entry.value,
      entry.type,
    ]),
    [
      ["{{CUSTOM_001}}", "案件A-2026-0412", "CUSTOM"],
      ["{{DATE_001}}", "2026-04-12", "DATE"],
    ],
  );
});
