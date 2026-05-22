/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { FlagHandler, FLAGGED_LANGUAGES_FILE_NAME } from "../../../src/languages/flagHandler";

describe("FlagHandler edge/unit", () => {
  let tempRootPath = "";
  let algorithmDirectoryPath = "";

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "flag-handler-edge-test-"));
    algorithmDirectoryPath = path.join(tempRootPath, "algo");
    await fs.mkdir(algorithmDirectoryPath, { recursive: true });
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("clearCache with no path clears all cached algorithms", async () => {
    const handler = new FlagHandler();
    const secondAlgorithmDirectoryPath = path.join(tempRootPath, "algo2");
    await fs.mkdir(secondAlgorithmDirectoryPath, { recursive: true });

    await handler.writeFlaggedLanguageKeys(algorithmDirectoryPath, new Set(["python"]));
    await handler.writeFlaggedLanguageKeys(secondAlgorithmDirectoryPath, new Set(["go"]));

    const filePath1 = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
    const filePath2 = path.join(secondAlgorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);

    await fs.writeFile(filePath1, "ruby\n", "utf8");
    await fs.writeFile(filePath2, "racket\n", "utf8");

    // No-arg clearCache should invalidate every algorithm cache entry.
    handler.clearCache();

    const firstRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    const secondRead = await handler.readFlaggedLanguageKeys(secondAlgorithmDirectoryPath);

    assert.deepStrictEqual([...firstRead], ["ruby"]);
    assert.deepStrictEqual([...secondRead], ["racket"]);
  });

  it("ignores empty keys during updates", async () => {
    const handler = new FlagHandler();

    // Whitespace-only keys should be treated as no-op input.
    await handler.updateFlaggedLanguageKey(algorithmDirectoryPath, "   ", true);
    const flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...flaggedLanguageKeys], []);

    const filePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
    await assert.rejects(async () => {
      await fs.access(filePath);
    });
  });

  it("deletes the flag file when writeFlaggedLanguageKeys receives only blank keys", async () => {
    const handler = new FlagHandler();
    const filePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);

    await fs.writeFile(filePath, "python\n", "utf8");
    await handler.writeFlaggedLanguageKeys(algorithmDirectoryPath, new Set(["   ", "\t"]));

    const flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...flaggedLanguageKeys], []);

    await assert.rejects(async () => {
      await fs.access(filePath);
    });
  });
});
