import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { formatMoney } from "@/lib/format";
import type { CheckedProduct } from "@/services/ai";
import { useProfile } from "@/state/ProfileProvider";
import { BottomSheet, Button, ChatBubble } from "@/ui";
import { FutureMeHeader } from "./FutureMeHeader";
import { FutureMeSheet } from "./FutureMeSheet";

type FutureMeControl = {
  /** Opens the chat. With a checked product the chat is about it; without, about the pockets. */
  openChat: (checked?: CheckedProduct) => void;
  /** Queues the Home nudge for a product that did not fit. It shows once the person is on Home. */
  queueNudge: (checked: CheckedProduct) => void;
};

const Ctx = createContext<FutureMeControl | null>(null);

export function useFutureMe(): FutureMeControl {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFutureMe must be used inside <FutureMeProvider>");
  return ctx;
}

/** Owns the Future Me chat sheet and the Home nudge, so the robot, the Reality card and the nudge all open the same thing. */
export function FutureMeProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [chat, setChat] = useState<{ id: number; checked?: CheckedProduct } | null>(null);
  const [nudge, setNudge] = useState<CheckedProduct | null>(null);

  const openChat = useCallback((checked?: CheckedProduct) => {
    setNudge(null);
    setChat({ id: Date.now(), checked });
  }, []);
  const queueNudge = useCallback((checked: CheckedProduct) => setNudge(checked), []);
  const value = useMemo(() => ({ openChat, queueNudge }), [openChat, queueNudge]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {chat && <FutureMeSheet key={chat.id} checked={chat.checked} onClose={() => setChat(null)} />}
      <Nudge checked={nudge} open={nudge !== null && chat === null && pathname === "/home"} onClose={() => setNudge(null)} onTalk={() => nudge && openChat(nudge)} />
    </Ctx.Provider>
  );
}

/**
 * Figma 02a. A short, pocket-aware message after a product that did not fit (Not healthy or Pocket empty).
 * TODO(design): the handoff does not say when the nudge appears; this shows it once, on Home, after leaving such a card with "Not now".
 * The Figma text offers cheaper alternatives; that feature was dropped, so it asks to talk it through.
 */
function Nudge({ checked, open, onClose, onTalk }: { checked: CheckedProduct | null; open: boolean; onClose: () => void; onTalk: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useProfile();
  if (!checked || !profile) return null;
  const money = (n: number) => formatMoney(n, profile.currency, lang);
  const text =
    checked.status === "pocket_empty"
      ? t("futureMe.nudgeEmpty", { name: checked.name, price: money(checked.price), pocket: checked.pocketName })
      : t("futureMe.nudgeNotHealthy", { name: checked.name, price: money(checked.price), pocket: checked.pocketName, amount: money(checked.overBy) });
  return (
    <BottomSheet open={open} onClose={onClose} header={(titleId) => <FutureMeHeader titleId={titleId} onClose={onClose} />}>
      <ChatBubble from="model" tone="surface" className="max-w-full">
        {text}
      </ChatBubble>
      {/* "Let's talk" on the right, as the main action. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={onClose}>
          {t("futureMe.nudgeLater")}
        </Button>
        <Button onClick={onTalk}>{t("futureMe.nudgeYes")}</Button>
      </div>
    </BottomSheet>
  );
}
