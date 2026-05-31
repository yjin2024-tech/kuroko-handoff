import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cachedVersion: string | undefined;

export function getToolVersion(): string {
  if (!cachedVersion) {
    const packageJsonPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    );
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };

    if (!packageJson.version) {
      throw new Error("package.json is missing version");
    }

    cachedVersion = packageJson.version;
  }

  return cachedVersion;
}
