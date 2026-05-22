/// <reference types="node" />
/// <reference types="mocha" />
import * as assert from "node:assert";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { FlagHandler, FLAGGED_LANGUAGES_FILE_NAME } from "../../../src/languages/flagHandler";

describe("FlagHandler integration", () => {
  let tempRootPath = "";
  let algorithmDirectoryPath = "";
  let secondAlgorithmDirectoryPath = "";

  beforeEach(async () => {
    tempRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "flag-handler-test-"));
    algorithmDirectoryPath = path.join(tempRootPath, "algo");
    secondAlgorithmDirectoryPath = path.join(tempRootPath, "algo-2");
    await fs.mkdir(algorithmDirectoryPath, { recursive: true });
    await fs.mkdir(secondAlgorithmDirectoryPath, { recursive: true });
  });

  afterEach(async () => {
    if (tempRootPath.length > 0) {
      await fs.rm(tempRootPath, { recursive: true, force: true });
    }
  });

  it("returns an empty set when .flag-lang does not exist", async () => {
    const handler = new FlagHandler();

    const flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...flaggedLanguageKeys], []);
  });

  it("writes normalized sorted keys and reads them back", async () => {
    const handler = new FlagHandler();
    await handler.writeFlaggedLanguageKeys(
      algorithmDirectoryPath,
      new Set([" Python ", "racket", "PYTHON", " go "]),
    );

    const filePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
    const fileText = await fs.readFile(filePath, "utf8");
    assert.strictEqual(fileText, "go\npython\nracket\n");

    const flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...flaggedLanguageKeys].sort(), ["go", "python", "racket"]);
  });

  it("updateFlaggedLanguageKey adds and removes one key", async () => {
    const handler = new FlagHandler();

    await handler.updateFlaggedLanguageKey(algorithmDirectoryPath, " Ruby ", true);
    let flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.strictEqual(flaggedLanguageKeys.has("ruby"), true);

    await handler.updateFlaggedLanguageKey(algorithmDirectoryPath, "ruby", false);
    flaggedLanguageKeys = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.strictEqual(flaggedLanguageKeys.has("ruby"), false);

    const filePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
    await assert.rejects(async () => {
      await fs.access(filePath);
    });
  });

  it("serves cached values until cache is cleared", async () => {
    const handler = new FlagHandler();
    const filePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);

    await fs.writeFile(filePath, "python\n", "utf8");
    const firstRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...firstRead], ["python"]);

    await fs.writeFile(filePath, "go\n", "utf8");
    // Read should stay pinned to cache until explicit invalidation.
    const secondRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...secondRead], ["python"]);

    handler.clearCache(algorithmDirectoryPath);
    const thirdRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...thirdRead], ["go"]);
  });

  it("returns cloned sets so callers cannot mutate internal cache", async () => {
    const handler = new FlagHandler();
    await handler.writeFlaggedLanguageKeys(algorithmDirectoryPath, new Set(["python"]));

    const readSet = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    readSet.add("go");

    // Mutating the returned set should not affect cached state.
    const rereadSet = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    assert.deepStrictEqual([...rereadSet], ["python"]);
  });

  it("keeps caches isolated per algorithm directory and refreshes only the cleared entry", async () => {
    const handler = new FlagHandler();
    const firstFilePath = path.join(algorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);
    const secondFilePath = path.join(secondAlgorithmDirectoryPath, FLAGGED_LANGUAGES_FILE_NAME);

    await fs.writeFile(firstFilePath, "python\n", "utf8");
    await fs.writeFile(secondFilePath, "go\n", "utf8");

    const firstRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    const secondRead = await handler.readFlaggedLanguageKeys(secondAlgorithmDirectoryPath);
    assert.deepStrictEqual([...firstRead], ["python"]);
    assert.deepStrictEqual([...secondRead], ["go"]);

    await fs.writeFile(firstFilePath, "ruby\n", "utf8");
    await fs.writeFile(secondFilePath, "elixir\n", "utf8");

    handler.clearCache(algorithmDirectoryPath);

    const refreshedFirstRead = await handler.readFlaggedLanguageKeys(algorithmDirectoryPath);
    const cachedSecondRead = await handler.readFlaggedLanguageKeys(secondAlgorithmDirectoryPath);
    assert.deepStrictEqual([...refreshedFirstRead], ["ruby"]);
    assert.deepStrictEqual([...cachedSecondRead], ["go"]);
  });
});
