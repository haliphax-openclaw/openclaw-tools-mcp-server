import { z } from "zod";
import type { ToolDef } from "./index.js";

export const webSearch: ToolDef = {
  name: "web_search",
  description: "Search the web and return results",
  schema: {
    query: z.string().describe("Search query"),
    count: z.number().optional().describe("Number of results to return"),
    country: z.string().optional().describe("Country code filter (e.g. US)"),
    language: z.string().optional().describe("Language code filter (e.g. en)"),
    freshness: z.string().optional().describe("Freshness filter (e.g. day, week, month)"),
    date_after: z.string().optional().describe("Only results after this date (YYYY-MM-DD)"),
    date_before: z.string().optional().describe("Only results before this date (YYYY-MM-DD)"),
  },
};
