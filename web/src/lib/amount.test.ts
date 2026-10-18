import { describe, expect, it } from "vitest";
import { amountFormat, amountToInput, formatAmountInput, parseAmount } from "./amount";

describe("amountFormat", () => {
  it("knows symbol, decimals and separators per currency and language", () => {
    expect(amountFormat("USD", "en")).toEqual({ symbol: "$", decimals: 2, group: ",", decimal: "." });
    expect(amountFormat("IDR", "id")).toMatchObject({ symbol: "Rp", decimals: 0, group: ".", decimal: "," });
    expect(amountFormat("JPY", "en").decimals).toBe(0);
  });
});

describe("formatAmountInput", () => {
  it("groups thousands while typing", () => {
    expect(formatAmountInput("3200", "USD", "en")).toBe("3,200");
    expect(formatAmountInput("1234567", "USD", "en")).toBe("1,234,567");
  });
  it("keeps a trailing decimal point and limits to 2 decimals", () => {
    expect(formatAmountInput("122.", "USD", "en")).toBe("122.");
    expect(formatAmountInput("122.5", "USD", "en")).toBe("122.5");
    expect(formatAmountInput("122.509", "USD", "en")).toBe("122.50");
  });
  it("starts a decimal with 0 and drops leading zeros", () => {
    expect(formatAmountInput(".5", "USD", "en")).toBe("0.5");
    expect(formatAmountInput("007", "USD", "en")).toBe("7");
  });
  it("has no decimals for IDR and JPY", () => {
    // A decimal point typed into a zero-decimal currency is ignored along with anything after it.
    expect(formatAmountInput("1500.5", "JPY", "en")).toBe("1,500");
    expect(formatAmountInput("90000", "IDR", "id")).toBe("90.000");
  });
  it("uses the Indonesian separators in ID", () => {
    expect(formatAmountInput("1234,5", "USD", "id")).toBe("1.234,5");
  });
  it("is empty for empty or junk input", () => {
    expect(formatAmountInput("", "USD", "en")).toBe("");
    expect(formatAmountInput("abc", "USD", "en")).toBe("");
  });
});

describe("parseAmount", () => {
  it("reads formatted input back", () => {
    expect(parseAmount("3,200", "USD", "en")).toBe(3200);
    expect(parseAmount("122.50", "USD", "en")).toBe(122.5);
    expect(parseAmount("1.234,5", "USD", "id")).toBe(1234.5);
    expect(parseAmount("90.000", "IDR", "id")).toBe(90000);
  });
  it("is null for empty or a lone point", () => {
    expect(parseAmount("", "USD", "en")).toBeNull();
    expect(parseAmount(".", "USD", "en")).toBeNull();
  });
});

describe("amountToInput", () => {
  it("formats stored numbers for an input", () => {
    expect(amountToInput(3200, "USD", "en")).toBe("3,200");
    expect(amountToInput(122.5, "USD", "en")).toBe("122.5");
    expect(amountToInput(90000, "IDR", "id")).toBe("90.000");
  });
});
