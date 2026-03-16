import { z } from "zod";
import type { ToolDef } from "./index.js";

export const message: ToolDef = {
  name: "message",
  description:
    "Send messages and perform channel actions (Discord, Telegram, WhatsApp, etc.). Actions: send, react, search, read, poll, thread-create, thread-reply",
  schema: {
    action: z
      .string()
      .describe("Message action (send, react, search, read, poll, thread-create, thread-reply)"),
    channel: z.string().optional().describe("Channel type (discord, telegram, whatsapp, signal, slack)"),
    to: z.string().optional().describe("Recipient identifier (phone, user ID, channel ID)"),
    message: z.string().optional().describe("Message text to send"),
    emoji: z.string().optional().describe("Emoji for react action"),
    query: z.string().optional().describe("Search query for search action"),
    messageId: z.string().optional().describe("Message ID for react/reply actions"),
    threadId: z.string().optional().describe("Thread ID for thread operations"),
    account: z.string().optional().describe("Account ID when multiple accounts exist"),
    pollQuestion: z.string().optional().describe("Poll question"),
    pollOptions: z.array(z.string()).optional().describe("Poll answer options"),
    limit: z.number().optional().describe("Limit for search/read results"),
  },
};
