import * as assert from "assert";

import { parseSmokeStatusLine } from "../../../src/conductor/internal/outputParsing";

describe("conductor/internal — parseSmokeStatusLine", () => {
  it("parses a RUNNING status line", () => {
    const line = "SMOKE [1/5] something lang=python [RUNNING]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "python");
    assert.strictEqual(result.status, "running");
  });

  it("parses a PASS status line", () => {
    const line = "SMOKE [2/5] something lang=rust [PASS]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "rust");
    assert.strictEqual(result.status, "passed");
  });

  it("parses a FAIL status line", () => {
    const line = "SMOKE [3/5] something lang=c++ [FAIL]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "c++");
    assert.strictEqual(result.status, "failed");
  });

  it("maps TIMEOUT to failed", () => {
    const line = "SMOKE [4/5] something lang=java [TIMEOUT]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "java");
    assert.strictEqual(result.status, "failed");
  });

  it("normalizes language key to lowercase", () => {
    const line = "SMOKE [1/1] lang=TypeScript [PASS]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "typescript");
  });

  it("returns null for non-matching lines", () => {
    assert.strictEqual(parseSmokeStatusLine(""), null);
    assert.strictEqual(parseSmokeStatusLine("just some random output"), null);
    assert.strictEqual(parseSmokeStatusLine("SMOKE missing parts"), null);
  });

  it("returns null for unrecognized status tokens", () => {
    const line = "SMOKE [1/1] lang=go [UNKNOWN]";
    assert.strictEqual(parseSmokeStatusLine(line), null);
  });

  it("accepts language keys with underscores and hyphens", () => {
    const line = "SMOKE [1/1] lang=c-sharp [PASS]";
    const result = parseSmokeStatusLine(line);

    assert.ok(result !== null);
    assert.strictEqual(result.languageKey, "c-sharp");
  });
});
