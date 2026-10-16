import { ThinkingLevel } from "@google/genai";
import { config } from "./config.js";
import type { CostResult } from "./cost.js";
import { genai } from "./gemini.js";
import type { Cart, Profile } from "./schemas.js";

const LANGUAGE = { en: "English", id: "casual Bahasa Indonesia (pakai 'kamu')" } as const;

/** Two warm sentences built only from numbers the cost engine already computed. */
export async function writeReflection(profile: Profile, cart: Cart, cost: CostResult): Promise<string> {
  const facts = {
    items: cart.items.map((i) => i.name).slice(0, 5),
    total_idr: cost.total,
    hours_of_work: cost.hoursOfWork,
    goal_name: cost.goal.name,
    goal_delay_days: cost.goal.delayDays,
    joy_budget_left_before_idr: cost.joy.leftBefore,
    joy_budget_left_after_idr: cost.joy.leftAfter,
    paylater: cost.paylater && {
      tenor_months: cost.paylater.tenorMonths,
      monthly_installment_idr: cost.paylater.monthlyInstallment,
      extra_cost_idr: cost.paylater.extraCost,
    },
  };

  const response = await genai.models.generateContent({
    model: config.geminiModel,
    contents: [{ role: "user", parts: [{ text: JSON.stringify(facts) }] }],
    config: {
      systemInstruction: `You write a short, kind reality check for a young Indonesian about to buy something.
Write at most 2 sentences in ${LANGUAGE[profile.language]}.
Use only the numbers in the JSON; never invent, recompute or round them differently. Write rupiah like "Rp450.000".${profile.language === "id" ? ' Use a decimal comma ("20,3 hari", "14,6 jam").' : ""}
Never shame, lecture, or tell them what to do. If it fits inside their joy budget, say that's okay. Do not give financial advice or mention financial products.
Return only the two sentences.`,
      temperature: 0.7,
      maxOutputTokens: 200,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });
  return (response.text ?? "").trim();
}
