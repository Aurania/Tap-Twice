import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import { ai, MAX_USER_TURNS, type CheckedProduct, type ChatTurn, type FutureMeContext } from "@/services/ai";
import { useProfile } from "@/state/ProfileProvider";
import { BottomSheet, Button, ChatBubble, CircleButton, ChevronIcon } from "@/ui";
import { FutureMeHeader } from "./FutureMeHeader";

type Props = { checked?: CheckedProduct; onClose: () => void };

/**
 * Future Me chat (Figma 02b, without the alternative-product cards): a pocket-aware reflection chat.
 * It opens the conversation itself, streams replies, allows 6 of your messages, and always shows
 * "AI can make mistakes. Double-check the numbers." When it cannot be reached it says so with a
 * Try again button (07e). Every number it uses is the server's.
 */
export function FutureMeSheet({ checked, onClose }: Props) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [reply, setReply] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [checking, setChecking] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);
  const [input, setInput] = useState("");
  const ctx = useRef<FutureMeContext | null>(null);
  const history = useRef<ChatTurn[]>([]);
  const abort = useRef(new AbortController());
  const endRef = useRef<HTMLDivElement>(null);

  /** Streams one reply for `turns`. A failure at any point shows the 07e bubble. */
  const run = async (turns: ChatTurn[]) => {
    const { signal } = abort.current;
    history.current = turns;
    setStreaming(true);
    setChecking(false);
    setFailed(false);
    setReply("");
    let text = "";
    let finished = false;
    try {
      if (!ctx.current) ctx.current = await loadContext();
      for await (const ev of ai.futureMeChat(ctx.current, turns, signal)) {
        if (ev.type === "tool") setChecking(true);
        else if (ev.type === "text") {
          text += ev.text;
          setReply(text);
          setChecking(false);
        } else if (ev.type === "done") {
          finished = true;
          setMessages([...turns, { role: "model", text }]);
          if (ev.turnsLeft === 0) setEnded(true);
        } else if (ev.type === "error") throw new Error("future-me stream error");
      }
      if (!finished) {
        if (!text) throw new Error("future-me stream closed early");
        setMessages([...turns, { role: "model", text }]);
      }
    } catch {
      if (!signal.aborted) setFailed(true);
    } finally {
      if (!signal.aborted) {
        setReply("");
        setStreaming(false);
        setChecking(false);
      }
    }
  };

  /** The server's numbers for the chat: pockets from the summary, plus the checked product if any. */
  const loadContext = async (): Promise<FutureMeContext> => {
    const { summary } = await api.getSummary();
    return {
      nickname: profile?.nickname,
      currency: summary.currency,
      pockets: summary.pockets.map((p) => ({ id: p.id, name: p.name, budget: p.budget, remaining: p.remaining, wishlistPct: p.wishlistPct })),
      checked,
    };
  };

  // Future Me opens the conversation itself.
  useEffect(() => {
    // A new controller per mount: React's dev double-mount cancels the first one.
    const ctrl = new AbortController();
    abort.current = ctrl;
    void run([]);
    return () => ctrl.abort();
    // Once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages.length, reply, failed, checking]);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const canSend = !streaming && !ended && !failed && userTurns < MAX_USER_TURNS;
  const money = (n: number) => formatMoney(n, profile?.currency ?? "USD", lang);

  const send = (text: string) => {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed || !canSend) return;
    const turns: ChatTurn[] = [...messages, { role: "user", text: trimmed }];
    setMessages(turns);
    setInput("");
    void run(turns);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // TODO(design): the quick replies are not specified for the pocket-aware chat; these are plain questions with no actions.
  const chips = checked ? [t("futureMe.chipWait"), t("futureMe.chipNumbers")] : [t("futureMe.chipPockets"), t("futureMe.chipWatch")];

  return (
    <BottomSheet open onClose={onClose} header={(titleId) => <FutureMeHeader titleId={titleId} onClose={onClose} />}>
      {checked && (
        <p className="tt-caption mb-3 flex items-center gap-2 rounded-pill bg-surface px-3.5 py-2.5 font-semibold text-ink">
          <span aria-hidden>{checked.emoji}</span>
          {t("futureMe.checked", { name: checked.name, price: money(checked.price) })}
        </p>
      )}

      <div className="max-h-[42dvh] space-y-2 overflow-y-auto pr-1" aria-live="polite" aria-busy={streaming}>
        {messages.map((m, i) => (
          <div key={i} className="space-y-2">
            {splitBubbles(m.text).map((part, j) => (
              <ChatBubble key={j} from={m.role} tone="surface" className="max-w-[300px]">
                {part}
              </ChatBubble>
            ))}
          </div>
        ))}

        {streaming &&
          !failed &&
          (reply ? (
            splitBubbles(reply).map((part, j) => (
              <ChatBubble key={`r${j}`} from="model" tone="surface" className="max-w-[300px]">
                {part}
              </ChatBubble>
            ))
          ) : (
            <ChatBubble from="model" tone="surface">
              <span className="text-ink-2">{checking ? t("futureMe.checking") : <TypingDots />}</span>
            </ChatBubble>
          ))}

        {failed && (
          <ChatBubble from="model" tone="surface" className="max-w-[300px]">
            <span className="block">{t("futureMe.error")}</span>
            <Button size="small" variant="secondary" className="mt-2 bg-page!" onClick={() => void run(history.current)}>
              {t("common.tryAgain")}
            </Button>
          </ChatBubble>
        )}
        <div ref={endRef} />
      </div>

      {canSend && messages.length > 0 && userTurns === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button key={chip} type="button" onClick={() => send(chip)} className="tt-body-strong h-10 rounded-pill border border-action bg-page px-4 text-link">
              {chip}
            </button>
          ))}
        </div>
      )}

      {ended || userTurns >= MAX_USER_TURNS ? (
        <p className="tt-caption mt-4 text-center text-ink-2">{t("futureMe.ended", { n: MAX_USER_TURNS })}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2 rounded-pill border border-line bg-page py-1.5 pr-1.5 pl-4">
          <label htmlFor="future-me-input" className="sr-only">
            {t("futureMe.placeholder")}
          </label>
          <input
            id="future-me-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("futureMe.placeholder")}
            maxLength={2000}
            disabled={!canSend}
            autoComplete="off"
            className="tt-body min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-2"
          />
          <CircleButton type="submit" variant="primary" label={t("futureMe.send")} icon={<ChevronIcon className="size-5 -rotate-90" />} disabled={!canSend || !input.trim()} />
        </form>
      )}
      <p className="tt-caption mt-2 text-center text-ink-2">{t("disclaimer.ai")}</p>
    </BottomSheet>
  );
}

/** A reply can be a few short paragraphs; show each as its own bubble. */
function splitBubbles(text: string): string[] {
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="…">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-1.5 animate-bounce rounded-pill bg-ink-2" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}
