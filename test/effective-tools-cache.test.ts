import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  readEffectiveCache,
  writeEffectiveCache,
} from "../src/effective-tools-cache.js";

describe("effective-tools-cache", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "oc-mcp-cache-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("stores and retrieves a payload for a session key", () => {
    const payload = { tools: [{ name: "web_search" }] };
    writeEffectiveCache(dir, "agent:main", payload);
    expect(readEffectiveCache(dir, "agent:main")).toEqual(payload);
  });

  it("returns undefined for unknown session keys", () => {
    expect(readEffectiveCache(dir, "missing")).toBeUndefined();
  });

  it("keeps only the 10 most recently written session keys", () => {
    for (let i = 0; i < 12; i++) {
      writeEffectiveCache(dir, `session-${i}`, { i });
    }
    expect(readEffectiveCache(dir, "session-0")).toBeUndefined();
    expect(readEffectiveCache(dir, "session-1")).toBeUndefined();
    expect(readEffectiveCache(dir, "session-11")).toEqual({ i: 11 });
    expect(readEffectiveCache(dir, "session-10")).toEqual({ i: 10 });
  });

  it("touching an existing key refreshes LRU order", () => {
    for (let i = 0; i < 10; i++) {
      writeEffectiveCache(dir, `s-${i}`, { i });
    }
    writeEffectiveCache(dir, "s-0", { bumped: true });
    writeEffectiveCache(dir, "s-new", { n: 1 });
    expect(readEffectiveCache(dir, "s-0")).toEqual({ bumped: true });
    expect(readEffectiveCache(dir, "s-1")).toBeUndefined();
    expect(readEffectiveCache(dir, "s-new")).toEqual({ n: 1 });
  });
});
