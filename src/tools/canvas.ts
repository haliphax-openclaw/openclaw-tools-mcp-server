import { z } from "zod";
import type { ToolDef } from "./index.js";

export const canvas: ToolDef = {
  name: "canvas",
  description:
    "Control the Canvas visual workspace. Actions: present, hide, navigate, eval, snapshot, a2ui_push, a2ui_reset",
  schema: {
    action: z
      .string()
      .describe("Canvas action (present, hide, navigate, eval, snapshot, a2ui_push, a2ui_reset)"),
    url: z.string().optional().describe("URL for present/navigate actions"),
    target: z.string().optional().describe("Target for present action (URL or HTML)"),
    script: z.string().optional().describe("JavaScript to evaluate"),
    html: z.string().optional().describe("HTML content for a2ui_push"),
    format: z.string().optional().describe("Snapshot format (png, jpeg)"),
    node: z.string().optional().describe("Target node ID"),
  },
};
