import { z } from "zod";
import type { ToolDef } from "./index.js";

export const pdf: ToolDef = {
  name: "pdf",
  description: "Analyze PDF documents from file paths or URLs",
  schema: {
    pdf: z.string().optional().describe("Single PDF path or URL"),
    pdfs: z.array(z.string()).optional().describe("Multiple PDF paths or URLs"),
    prompt: z.string().optional().describe("Analysis prompt / question about the PDF"),
    pages: z.string().optional().describe("Page range (e.g. '1-5', '1,3,5')"),
    model: z.string().optional().describe("Model to use for analysis"),
  },
};
