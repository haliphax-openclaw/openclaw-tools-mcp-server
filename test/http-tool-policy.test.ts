import { describe, it, expect } from "vitest";
import {
  DEFAULT_HTTP_DENY_LIST,
  buildHttpBlockedSet,
  filterHttpInvokableToolNames,
} from "../src/http-tool-policy.js";

describe("http-tool-policy", () => {
  it("defaults to documented gateway HTTP deny list", () => {
    expect([...DEFAULT_HTTP_DENY_LIST].sort()).toEqual(
      [
        "cron",
        "gateway",
        "sessions_send",
        "sessions_spawn",
        "whatsapp_login",
      ].sort(),
    );
  });

  it("removes names listed in gateway.tools.allow from the HTTP deny set", () => {
    const blocked = buildHttpBlockedSet({
      allow: ["sessions_send", "gateway"],
    });
    expect(blocked.has("sessions_send")).toBe(false);
    expect(blocked.has("gateway")).toBe(false);
    expect(blocked.has("cron")).toBe(true);
  });

  it("adds gateway.tools.deny on top of the default deny set", () => {
    const blocked = buildHttpBlockedSet({ deny: ["browser", "exec"] });
    expect(blocked.has("browser")).toBe(true);
    expect(blocked.has("exec")).toBe(true);
    expect(blocked.has("cron")).toBe(true);
  });

  it("filterHttpInvokableToolNames keeps only names not HTTP-blocked", () => {
    const names = ["web_search", "sessions_spawn", "browser", "message"];
    const filtered = filterHttpInvokableToolNames(names, {
      allow: [],
      deny: ["browser"],
    });
    expect(filtered.sort()).toEqual(["message", "web_search"].sort());
  });
});
