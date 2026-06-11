import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import { loadNearestEnvFile } from "./index";

const testEnvKey = "BOSS_JOBPILOT_ENV_LOADER_TEST";

describe("loadNearestEnvFile", () => {
  afterEach(() => {
    delete process.env[testEnvKey];
  });

  it("loads the nearest .env file from a parent directory", () => {
    const root = mkdtempSync(join(tmpdir(), "boss-jobpilot-env-"));
    const nested = join(root, "apps", "api");

    mkdirSync(nested, { recursive: true });
    writeFileSync(join(root, ".env"), `${testEnvKey}=loaded-from-parent\n`);

    try {
      expect(loadNearestEnvFile(nested)).toBe(join(root, ".env"));
      expect(process.env[testEnvKey]).toBe("loaded-from-parent");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("returns undefined when no .env file exists", () => {
    const root = mkdtempSync(join(tmpdir(), "boss-jobpilot-env-"));

    try {
      expect(loadNearestEnvFile(root)).toBeUndefined();
      expect(process.env[testEnvKey]).toBeUndefined();
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
