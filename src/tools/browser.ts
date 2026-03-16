import { z } from "zod";
import type { ToolDef } from "./index.js";

export const browser: ToolDef = {
  name: "browser",
  description:
    "Control a web browser. Actions: status, start, stop, tabs, open, snapshot, screenshot, navigate, act, click, type, scroll, select, hover, wait, evaluate, close, pdf",
  schema: {
    action: z
      .string()
      .describe(
        "Browser action to perform (e.g. navigate, snapshot, screenshot, click, type, act, status, start, stop, tabs, open, scroll, select, hover, wait, evaluate, close, pdf)",
      ),
    url: z.string().optional().describe("URL for navigate/open actions"),
    selector: z.string().optional().describe("CSS selector for element actions"),
    text: z.string().optional().describe("Text to type or instruction for act"),
    coordinate: z
      .array(z.number())
      .optional()
      .describe("[x, y] coordinate for click actions"),
    ref: z.string().optional().describe("Element reference ID"),
    script: z.string().optional().describe("JavaScript to evaluate"),
    fullPage: z.boolean().optional().describe("Full page screenshot"),
    tabId: z.number().optional().describe("Tab ID for tab operations"),
    profile: z.string().optional().describe("Browser profile name"),
    width: z.number().optional().describe("Viewport width"),
    height: z.number().optional().describe("Viewport height"),
  },
};
