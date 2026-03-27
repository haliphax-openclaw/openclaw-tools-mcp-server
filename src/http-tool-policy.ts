/**
 * Default tools blocked on POST /tools/invoke unless lifted via gateway.tools.allow.
 * @see https://docs.openclaw.ai/gateway/tools-invoke-http-api
 */
export const DEFAULT_HTTP_DENY_LIST = [
  "cron",
  "gateway",
  "sessions_send",
  "sessions_spawn",
  "whatsapp_login",
] as const;

export interface GatewayToolsHttpPolicy {
  allow?: string[];
  deny?: string[];
}

/** Tool names that must not be advertised for HTTP invoke bridging. */
export function buildHttpBlockedSet(
  policy: GatewayToolsHttpPolicy | undefined,
): Set<string> {
  const blocked = new Set<string>(DEFAULT_HTTP_DENY_LIST);
  for (const a of policy?.allow ?? []) blocked.delete(a);
  for (const d of policy?.deny ?? []) blocked.add(d);
  return blocked;
}

export function filterHttpInvokableToolNames(
  names: Iterable<string>,
  policy: GatewayToolsHttpPolicy | undefined,
): string[] {
  const blocked = buildHttpBlockedSet(policy);
  return [...names].filter((n) => !blocked.has(n));
}
