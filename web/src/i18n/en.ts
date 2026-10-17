/** English strings (default). Keys are shared with id.ts; use `{name}` for values. */
export const en = {
  "app.name": "Tap Twice",
  "app.tagline": "Tap once. Think twice.",

  "common.back": "Back",
  "common.close": "Close",
  "common.cancel": "Cancel",
  "common.next": "Next",
  "common.tryAgain": "Try again",
  "common.backToHome": "Back to home",
  "common.loading": "Loading…",
  "common.optional": "optional",

  "disclaimer.advice": "Tap Twice shows costs and reflections, not financial advice.",
  "disclaimer.ai": "AI can make mistakes. Double-check the numbers.",

  "language.label": "Language",
  "language.en": "EN",
  "language.id": "ID",

  "decide.buyIt": "Buy it",
  "decide.save": "Save",
  "decide.futureMe": "Future Me",
  "decide.saveForLater": "Save for later",

  "pay.inFull": "Pay in full",
  "pay.inFullDetail": "Rp 0 extra · no due dates",
  "pay.paylaterMonths": "PayLater, {n} months",
  "pay.containsInterest": "Contains interest",

  "notice.lateTitle": "Heads-up on late payments",
  "notice.lateBody": "Late payments can be reported to SLIK OJK and may affect future loans, like a mortgage.",

  "realTalk": "Real talk",
  "field.counter": "{count}/{max}",
} as const;

export type StringKey = keyof typeof en;
