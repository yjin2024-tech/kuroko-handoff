import assert from "node:assert/strict";
import test from "node:test";
import { restoreText } from "../src/restorer.ts";
import type { MappingEntry } from "../src/types.ts";

test("restores placeholders from mapping entries", () => {
  const mapping: MappingEntry[] = [
    { placeholder: "{{CUSTOM_001}}", value: "青葉商事", type: "CUSTOM" },
    { placeholder: "{{EMAIL_001}}", value: "demo@example.jp", type: "EMAIL" },
  ];

  const restored = restoreText("{{CUSTOM_001}} / {{EMAIL_001}}", mapping);

  assert.equal(restored, "青葉商事 / demo@example.jp");
});
