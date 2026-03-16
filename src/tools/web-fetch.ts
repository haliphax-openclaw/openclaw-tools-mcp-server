import { z } from "zod";
import type { ToolDef } from "./index.js";

export const webFetch: ToolDef = {
  name: "web_fetch",
  description:
    "Fetch and extract readable content from a URL (HTML converted to markdown or text)",
  schema: {
    url: z.string().describe("URL to fetch"),
    extractMode: z
      .enum(["markdown", "text"])
      .optional()
      .describe("Content extraction mode"),
    maxChars: z
      .number()
      .optional()
      .describe("Maximum characters to return"),
  },
};
