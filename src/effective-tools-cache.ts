import { readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

const MAX_SESSION_ENTRIES = 10;

function cachePath(dir: string, sessionKey: string): string {
  const id = Buffer.from(sessionKey, "utf8").toString("base64url");
  return join(dir, `${id}.json`);
}

interface CacheEnvelope {
  payload: unknown;
  touchedAt: number;
}

function listEnvelopes(dir: string): Array<{ path: string; touchedAt: number }> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: Array<{ path: string; touchedAt: number }> = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const path = join(dir, name);
    try {
      const raw = readFileSync(path, "utf8");
      const j = JSON.parse(raw) as CacheEnvelope;
      if (typeof j.touchedAt === "number") out.push({ path, touchedAt: j.touchedAt });
    } catch {
      /* skip corrupt */
    }
  }
  return out;
}

function pruneToMax(dir: string): void {
  const ents = listEnvelopes(dir);
  ents.sort((a, b) => a.touchedAt - b.touchedAt);
  while (ents.length > MAX_SESSION_ENTRIES) {
    const victim = ents.shift()!;
    try {
      unlinkSync(victim.path);
    } catch {
      /* ignore */
    }
  }
}

function nextTouchStamp(dir: string): number {
  const ents = listEnvelopes(dir);
  return ents.reduce((m, e) => Math.max(m, e.touchedAt), 0) + 1;
}

export function writeEffectiveCache(
  dir: string,
  sessionKey: string,
  payload: unknown,
): void {
  mkdirSync(dir, { recursive: true });
  const path = cachePath(dir, sessionKey);
  const env: CacheEnvelope = { payload, touchedAt: nextTouchStamp(dir) };
  writeFileSync(path, JSON.stringify(env), "utf8");
  pruneToMax(dir);
}

export function readEffectiveCache(dir: string, sessionKey: string): unknown | undefined {
  const path = cachePath(dir, sessionKey);
  try {
    const raw = readFileSync(path, "utf8");
    const j = JSON.parse(raw) as CacheEnvelope;
    return j.payload;
  } catch {
    return undefined;
  }
}
