import { GeminiAiService } from "./gemini";
import { MockAiService } from "./mock";
import type { AiService } from "./types";

export * from "./types";
export { getMockScenario, MOCK_SCENARIOS, MockAiService, setMockScenario, type MockScenario } from "./mock";

/** The app's AI service. Screens import this and nothing provider-specific. VITE_AI_PROVIDER=gemini switches it. */
export const ai: AiService = import.meta.env.VITE_AI_PROVIDER === "gemini" ? new GeminiAiService() : new MockAiService();
