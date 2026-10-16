import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

// Vertex AI through the service account: no API keys anywhere.
export const genai = new GoogleGenAI({
  vertexai: true,
  project: config.projectId,
  location: config.geminiLocation,
});
