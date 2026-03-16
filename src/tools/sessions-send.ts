import { z } from "zod";
import type { ToolDef } from "./index.js";

export const sessionsSend: ToolDef = {
  name: "sessions_send",
  description:
    "Send a message into another OpenClaw session. Use for agent-to-agent communication. Either sessionKey or label must be provided to identify the target session.",
  schema: {
    sessionKey: z.string().optional().describe("Target session key (e.g. agent:openclaw-expert:discord:channel:123456)"),
    label: z.string().optional().describe("Target session label"),
    message: z.string().describe("Message content to send"),
    timeoutSeconds: z.number().optional().describe("How long to wait for a response"),
  },
};
