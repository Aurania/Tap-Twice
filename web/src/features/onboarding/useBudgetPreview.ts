import { useEffect, useState } from "react";
import { api, type BudgetPreview, type BudgetPreviewInput } from "@/api";

type State = { status: "idle" | "loading" | "ready" | "error"; preview: BudgetPreview | null };

/**
 * Money amounts for the draft come from the server (`/api/preview/budget`), never computed here.
 * Debounced; keeps the last good preview while a new one loads so numbers do not flash away.
 * Pass null while the inputs are not valid yet.
 */
export function useBudgetPreview(input: BudgetPreviewInput | null): State {
  const [state, setState] = useState<State>({ status: "idle", preview: null });
  const key = input ? JSON.stringify(input) : "";

  useEffect(() => {
    if (!input) {
      setState({ status: "idle", preview: null });
      return;
    }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading" }));
    const timer = window.setTimeout(() => {
      api
        .previewBudget(input, ctrl.signal)
        .then((r) => setState({ status: "ready", preview: r.preview }))
        .catch(() => {
          if (!ctrl.signal.aborted) setState((s) => ({ ...s, status: "error" }));
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
    // `key` stands for the whole input object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
