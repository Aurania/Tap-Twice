import { useEffect, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError, type ChatMessage } from "@/api";
import { PaylaterFlow } from "@/features/check/PaylaterFlow";
import { PaySheet } from "@/features/check/PaySheet";
import { useSaveForLater } from "@/features/check/useSaveForLater";
import { useI18n } from "@/i18n/I18nProvider";
import { formatIDR } from "@/lib/format";
import { useCartCheck } from "@/state/CartCheckProvider";
import { useProfile } from "@/state/ProfileProvider";
import { BackIcon, Button, ChatBubble, ChevronIcon, CircleButton, FutureAvatar } from "@/ui";

const MAX_USER_TURNS = 6;

/**
 * 07 Future Me · Chat over SSE (POST /api/future-me). The first call sends no messages and the
 * server opens; later calls send the whole history. Buy it / Save for later are always visible.
 * States: 07b reply, 07c end of chat, 07e can't reach. The debt-stress reply (07d) shows as a
 * normal bubble until the API flags it (BACKEND_GAPS.md #8).
 */
export function FutureMe() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { profile } = useProfile();
  const { cart, paylater, result, chat, setChat } = useCartCheck();
  const { save, saving, leaving } = useSaveForLater();

  const [streaming, setStreaming] = useState(false);
  const [checking, setChecking] = useState(false);
  const [reply, setReply] = useState(""); // the reply being streamed
  const [failed, setFailed] = useState(false);
  const [input, setInput] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [paylaterOpen, setPaylaterOpen] = useState(false);
  const started = useRef(false);
  const lastHistory = useRef<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const run = async (history: ChatMessage[]) => {
    if (!cart) return;
    lastHistory.current = history;
    setStreaming(true);
    setChecking(false);
    setFailed(false);
    setReply("");
    let text = "";
    let finished = false;
    try {
      for await (const ev of api.futureMe({ cart, paylater, messages: history })) {
        if (ev.type === "tool") setChecking(true);
        else if (ev.type === "text") {
          text += ev.text;
          setReply(text);
          setChecking(false);
        } else if (ev.type === "done") {
          finished = true;
          setChat(() => ({ messages: [...history, { role: "model", text }], turnsLeft: ev.turnsLeft, ended: ev.turnsLeft === 0 }));
        } else if (ev.type === "error") {
          throw new Error("future-me stream error");
        }
      }
      if (!finished) {
        if (!text) throw new Error("future-me stream closed early");
        setChat((c) => ({ ...c, messages: [...history, { role: "model", text }] }));
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "conversation_over") setChat((c) => ({ ...c, ended: true }));
      else if (!(err instanceof ApiError && err.code === "no_profile")) setFailed(true);
    } finally {
      setReply("");
      setStreaming(false);
      setChecking(false);
    }
  };

  // Future Me opens the conversation itself (first call with no messages). Once per cart.
  useEffect(() => {
    if (!cart || started.current || chat.messages.length > 0) return;
    started.current = true;
    void run([]);
    // Runs once when the screen opens; `run` reads the latest cart itself.
  }, [cart]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [chat.messages.length, reply, failed, checking]);

  if (!cart) return leaving.current ? null : <Navigate to="/home" replace />;
  if (!result) return <Navigate to="/check/reality" replace />;

  const userTurns = chat.messages.filter((m) => m.role === "user").length;
  const ended = chat.ended || userTurns >= MAX_USER_TURNS;
  const canSend = !streaming && !ended && !failed;
  const name = profile?.nickname?.trim();

  const send = (text: string) => {
    const trimmed = text.trim().slice(0, 2000);
    if (!trimmed || !canSend) return;
    const history: ChatMessage[] = [...chat.messages, { role: "user", text: trimmed }];
    setChat((c) => ({ ...c, messages: history }));
    setInput("");
    void run(history);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const plan = result.cost.paylater;
  const firstModel = chat.messages.findIndex((m) => m.role === "model");

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-soft">
      <header className="flex shrink-0 items-center gap-3 px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <CircleButton label={t("common.back")} icon={<BackIcon className="size-5" />} onClick={() => navigate("/check/reality")} className="bg-white/80" />
        <FutureAvatar nickname={name} />
        <div className="min-w-0">
          <h1 className="tt-body-strong break-words text-ink">{name ? t("futureMe.title", { name }) : t("futureMe.titleAnon")}</h1>
          <p className="tt-small text-ink-2">{t("futureMe.sub")}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-4" aria-live="polite" aria-busy={streaming}>
        <p className="tt-caption py-2 text-center text-ink-2">{t("futureMe.today")}</p>
        <div className="space-y-2">
          {chat.messages.map((m, i) => (
            <div key={i} className="space-y-2">
              {splitBubbles(m.text).map((part, j) => (
                <ChatBubble key={j} from={m.role}>
                  {part}
                </ChatBubble>
              ))}
              {/* Pay in full vs PayLater, from the reality-card numbers (BACKEND_GAPS.md #16). */}
              {i === firstModel && plan && (
                <div className="max-w-[280px] rounded-[20px] bg-page p-3 shadow-sm">
                  <div className="rounded-md bg-surface p-3">
                    <CompareBar label={t("pay.inFull")} amount={formatIDR(result.cost.total)} share={result.cost.total / plan.totalPaid} tone="action" />
                    <CompareBar label={t("futureMe.compareLater", { n: plan.tenorMonths })} amount={formatIDR(plan.totalPaid)} share={1} tone="highlight" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {streaming &&
            (reply ? (
              splitBubbles(reply).map((part, j) => (
                <ChatBubble key={`r${j}`} from="model">
                  {part}
                </ChatBubble>
              ))
            ) : (
              <ChatBubble from="model">
                <span className="text-ink-2">{checking ? t("futureMe.checking") : <TypingDots />}</span>
              </ChatBubble>
            ))}

          {failed && (
            <ChatBubble from="model">
              <span className="block">{t("futureMe.error")}</span>
              <Button size="small" variant="secondary" className="mt-2" onClick={() => void run(lastHistory.current)}>
                {t("common.tryAgain")}
              </Button>
            </ChatBubble>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <footer className="shrink-0 rounded-t-sheet bg-page px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-lg">
        {ended ? (
          <p className="tt-caption mb-3 text-center text-ink-2">{t("futureMe.ended", { n: MAX_USER_TURNS })}</p>
        ) : (
          <>
            {canSend && chat.messages.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <QuickReply onClick={save} disabled={saving}>
                  {t("futureMe.chipSave")}
                </QuickReply>
                <QuickReply onClick={() => send(t("futureMe.chipNeed"))}>{t("futureMe.chipNeed")}</QuickReply>
                <QuickReply onClick={() => send(t("futureMe.chipWorth"))}>{t("futureMe.chipWorth")}</QuickReply>
              </div>
            )}
            <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-pill bg-surface py-1.5 pr-1.5 pl-4">
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
              <CircleButton
                type="submit"
                variant="primary"
                label={t("futureMe.send")}
                icon={<ChevronIcon className="size-5" />}
                disabled={!canSend || !input.trim()}
              />
            </form>
            <p className="tt-caption mt-2 text-center text-ink-2">{t("disclaimer.ai")}</p>
          </>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Button variant="secondary" onClick={() => setPayOpen(true)} disabled={saving}>
            {t("decide.buyIt")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t("decide.saveForLater")}
          </Button>
        </div>
      </footer>

      <PaySheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        cost={result.cost}
        onPickPlan={() => {
          setPayOpen(false);
          setPaylaterOpen(true);
        }}
      />
      <PaylaterFlow open={paylaterOpen} onClose={() => setPaylaterOpen(false)} />
    </main>
  );
}

/** Future Me sometimes sends a few short paragraphs; show each as its own bubble, like the design. */
function splitBubbles(text: string): string[] {
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

function CompareBar({ label, amount, share, tone }: { label: string; amount: string; share: number; tone: "action" | "highlight" }) {
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="tt-small text-ink-2">{label}</span>
        <span className="tt-body-strong text-ink">{amount}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-pill bg-line">
        <div className={tone === "action" ? "h-full rounded-pill bg-action" : "h-full rounded-pill bg-highlight"} style={{ width: `${Math.min(1, share) * 100}%` }} />
      </div>
    </div>
  );
}

function QuickReply({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="tt-caption rounded-pill bg-soft px-3 py-1.5 text-ink disabled:opacity-50">
      {children}
    </button>
  );
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
