import type { ComponentProps } from "react";
import { reformatRupiahInput } from "@/lib/money";
import { TextField } from "./TextField";

type Props = Omit<ComponentProps<typeof TextField>, "prefix" | "inputMode" | "onChange"> & {
  onChange: (value: string) => void;
};

/** Rupiah input: "Rp" prefix, numeric keyboard, thousands dots while typing ("1.513.000"). */
export function MoneyField({ onChange, ...rest }: Props) {
  return (
    <TextField
      prefix="Rp"
      inputMode="numeric"
      autoComplete="off"
      onChange={(raw) => onChange(reformatRupiahInput(raw))}
      {...rest}
    />
  );
}
