import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { api, type WishlistItem } from "@/api";
import { useI18n } from "@/i18n/I18nProvider";
import { pauseDaysLeft } from "@/lib/dates";
import { formatHours, formatIDR } from "@/lib/format";
import { BottomSheet, Button, ChevronIcon, Chip, Ripple, ScreenHeader, useToast } from "@/ui";

type ListState = { status: "loading" } | { status: "error" } | { status: "ready"; items: WishlistItem[] };

/** 08 Saved for later (08a toast after saving, 08c item sheet, 08b removed + undo) and 09 empty state. */
export function Saved() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang } = useI18n();
  const toast = useToast();
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [hours, setHours] = useState<number | null>(null);
  const [open, setOpen] = useState<WishlistItem | null>(null);
  const toastShown = useRef(false);

  useEffect(() => {
    if ((location.state as { justSaved?: boolean } | null)?.justSaved && !toastShown.current) {
      toastShown.current = true;
      toast({ message: t("saved.toast"), icon: true });
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate, t, toast]);

  const load = useCallback(() => {
    api
      .listWishlist()
      .then((r) => setList({ status: "ready", items: r.items }))
      .catch(() => setList({ status: "error" }));
  }, []);
  useEffect(load, [load]);

  // 08b: remove right away, offer Undo (re-POST the item) in a toast.
  const remove = async (item: WishlistItem) => {
    setOpen(null);
    setList((l) => (l.status === "ready" ? { status: "ready", items: l.items.filter((w) => w.id !== item.id) } : l));
    try {
      await api.removeWishlist(item.id);
      toast({
        message: t("saved.removed", { name: item.name }),
        position: "bottom",
        durationMs: 5000,
        action: {
          label: t("saved.undo"),
          onClick: () => {
            api.addWishlist({ name: item.name, price: item.price, merchant: item.merchant }).then(load, load);
          },
        },
      });
    } catch {
      load();
      toast({ message: t("common.error"), position: "bottom" });
    }
  };

  const items = list.status === "ready" ? list.items : [];
  const heldOff = items.reduce((sum, w) => sum + w.price, 0); // summing for display

  // "That's N hours of work you kept": hours come from the API, not the client (BACKEND_GAPS.md #14).
  useEffect(() => {
    if (heldOff <= 0) return setHours(null);
    let alive = true;
    api
      .cost({ cart: { items: [{ name: "Held off", quantity: 1, unitPrice: heldOff }], total: heldOff } })
      .then((r) => alive && setHours(r.cost.hoursOfWork))
      .catch(() => alive && setHours(null));
    return () => {
      alive = false;
    };
  }, [heldOff]);

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))]">
      <ScreenHeader title={t("saved.header")} onBack={() => navigate("/home")} />

      {list.status === "loading" && <p className="tt-body mt-10 text-center text-ink-2">{t("common.loading")}</p>}
      {list.status === "error" && (
        <div className="mt-10 space-y-3 text-center">
          <p className="tt-body text-ink-2">{t("saved.loadError")}</p>
          <Button size="small" onClick={load}>
            {t("common.tryAgain")}
          </Button>
        </div>
      )}

      {list.status === "ready" && items.length === 0 && (
        <div className="flex flex-1 flex-col">
          <div aria-hidden className="relative mx-auto mt-10 flex size-[250px] items-center justify-center">
            <Ripple size={250} rings={4} className="absolute text-action/25" />
            <span className="size-6 rounded-pill bg-action/60 ring-8 ring-action/15" />
          </div>
          <h1 className="tt-h2 mt-6 text-center">{t("saved.emptyTitle")}</h1>
          <p className="tt-body mt-2 text-center text-ink-2">{t("saved.emptyBody")}</p>
          <Button className="mt-auto" onClick={() => navigate("/home", { state: { pick: true } })}>
            {t("saved.emptyCta")}
          </Button>
        </div>
      )}

      {list.status === "ready" && items.length > 0 && (
        <>
          <section className="relative mt-3 overflow-hidden rounded-card bg-inverse p-5 text-white">
            <div aria-hidden className="absolute -top-[40px] -right-[90px]">
              <Ripple size={240} rings={4} className="text-white/30" />
              <span className="absolute top-1/2 left-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-highlight/55" />
            </div>
            <div className="relative">
              <p className="tt-body text-white/90">{t("saved.heldOff")}</p>
              <p className="tt-hero !text-[40px] text-highlight">{formatIDR(heldOff)}</p>
              {hours !== null && <p className="tt-body mt-1 max-w-[290px]">{t("saved.hours", { hours: formatHours(hours, lang) })}</p>}
            </div>
          </section>

          <h2 className="tt-h2 mt-6">{t("saved.checkAgain")}</h2>
          <ul className="mt-3 space-y-3">
            {items.map((item) => {
              const left = pauseDaysLeft(item.createdAt);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(item)}
                    className="flex w-full items-center gap-3 rounded-card border border-line p-3.5 text-left"
                  >
                  <span aria-hidden className="inline-flex size-[60px] shrink-0 items-center justify-center rounded-md bg-soft text-[28px]">
                    🛍️
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="tt-body-strong break-words">{item.name}</p>
                    <p className="tt-small text-ink-2">{formatIDR(item.price)}</p>
                    <Chip tone={left > 0 ? "highlight" : "soft"} className="mt-1">
                      {left > 0 ? `⏳ ${left === 1 ? t("saved.dayLeft") : t("saved.daysLeft", { n: left })}` : t("saved.ready")}
                    </Chip>
                  </div>
                  <span aria-hidden className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-surface">
                    <ChevronIcon className="size-5" />
                  </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="tt-small mt-4 text-center text-ink-2">{t("saved.footer")}</p>
        </>
      )}

      {/* 08c Saved item */}
      <BottomSheet
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${open.name} · ${formatIDR(open.price)}` : ""}
        description={
          open
            ? pauseDaysLeft(open.createdAt) > 0
              ? t("saved.sheetBody", { n: pauseDaysLeft(open.createdAt) })
              : t("saved.sheetBodyReady")
            : undefined
        }
      >
        <div className="space-y-2.5">
          <Button onClick={() => setOpen(null)}>{t("saved.keepWaiting")}</Button>
          <Button variant="secondary" onClick={() => open && remove(open)}>
            {t("saved.remove")}
          </Button>
        </div>
      </BottomSheet>
    </main>
  );
}
