import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { api } from "@/api";
import { ensureUser } from "@/auth/firebase";
import { useI18n } from "@/i18n/I18nProvider";
import { formatIDR, formatIDRCompact, formatIDRSigned } from "@/lib/format";
import {
  BagIcon,
  BookmarkIcon,
  BottomSheet,
  Button,
  CalendarIcon,
  CameraIcon,
  ChatBubble,
  Chip,
  ChoiceChip,
  CircleButton,
  Dialog,
  Disclaimer,
  EmptyState,
  FutureAvatar,
  FutureMeRobot,
  ImageIcon,
  LanguageSwitch,
  Mark,
  MarkLabel,
  Notice,
  OptionRow,
  PercentRing,
  PocketCard,
  PocketChip,
  ProgressRing,
  ProviderTile,
  Ripple,
  ScreenHeader,
  ScrollPicker,
  SettingsIcon,
  SparkleIcon,
  StatCard,
  Sticker,
  TextField,
  Toggle,
  useToast,
  Verdict,
  WalletIcon,
  WarningIcon,
} from "@/ui";

type Check = { state: "pending" } | { state: "ok"; detail: string } | { state: "fail"; detail: string };

/**
 * Developer page: every shared component, to compare with Figma "Foundations" (node 19:50),
 * plus a live check of the API and anonymous sign-in. Labels here are developer-facing.
 */
export function ComponentsPage() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();

  const [health, setHealth] = useState<Check>({ state: "pending" });
  const [signIn, setSignIn] = useState<Check>({ state: "pending" });
  const [profile, setProfile] = useState<Check>({ state: "pending" });

  useEffect(() => {
    api
      .health()
      .then((h) => setHealth({ state: "ok", detail: `ok · ${h.model}` }))
      .catch((e: unknown) => setHealth({ state: "fail", detail: String(e) }));
    ensureUser()
      .then((u) => {
        setSignIn({ state: "ok", detail: `anonymous uid ${u.uid.slice(0, 8)}…` });
        return api.getProfile();
      })
      .then((r) => setProfile({ state: "ok", detail: r.profile ? `profile for “${r.profile.nickname ?? "you"}”` : "profile: null (new user → /welcome)" }))
      .catch((e: unknown) => {
        const detail = String(e);
        setSignIn((s) => (s.state === "pending" ? { state: "fail", detail } : s));
        setProfile({ state: "fail", detail });
      });
  }, []);

  const [payment, setPayment] = useState<"full" | "later">("full");
  const [tenor, setTenor] = useState(6);
  const [provider, setProvider] = useState("spaylater");
  const [nickname, setNickname] = useState("Sarah");
  const [avoidInterest, setAvoidInterest] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <main className="px-5 pb-16">
      <ScreenHeader title="Components" onBack={() => navigate("/")} right={<LanguageSwitch value={lang} onChange={setLang} />} />

      <Section title="Live checks">
        <ul className="space-y-2">
          <StatusRow label="GET /api/health" check={health} />
          <StatusRow label="Firebase signInAnonymously" check={signIn} />
          <StatusRow label="GET /api/profile (with ID token)" check={profile} />
        </ul>
      </Section>

      <Section title="Type">
        <p className="tt-hero">44 hours</p>
        <p className="tt-greeting">Hey Sarah 👋</p>
        <p className="tt-h1">Pay in full, or pay more later?</p>
        <p className="tt-h2">Real talk, worth it?</p>
        <p className="tt-number">+64 days</p>
        <p className="tt-body-lg">{t("decide.saveForLater")}</p>
        <p className="tt-body">That jacket is cute, but this cart pushes your concert back about 2 months.</p>
        <p className="tt-body-strong">Paying with PayLater?</p>
        <p className="tt-small">{formatIDR(289992)}/month · 2,5% fee</p>
        <p className="tt-caption uppercase">Concert in SG</p>
        <p className="tt-link">See the real cost</p>
      </Section>

      <Section title="Button">
        <div className="space-y-3">
          <Button>{t("decide.saveForLater")}</Button>
          <Button size="small">{t("decide.save")}</Button>
          <Button variant="secondary">{t("common.backToHome")}</Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="small">
              {t("decide.buyIt")}
            </Button>
            <Button size="small" disabled>
              Disabled
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Circle button">
        <div className="flex items-center gap-4">
          <CircleButton variant="primary" size="large" label={t("decide.buyIt")} icon={<BagIcon />} />
          <CircleButton variant="primary" label={t("decide.buyIt")} icon={<BagIcon className="size-5" />} />
          <CircleButton size="large" label={t("decide.buyIt")} icon={<BagIcon />} />
          <CircleButton label={t("decide.buyIt")} icon={<BagIcon className="size-5" />} />
        </div>
        <div className="mt-5 flex justify-around">
          <CircleButton size="large" showLabel label={t("decide.buyIt")} icon={<BagIcon />} />
          <CircleButton size="large" variant="primary" showLabel label={t("decide.save")} icon={<BookmarkIcon />} />
          <CircleButton size="large" variant="primary" showLabel label={t("decide.futureMe")} icon={<SparkleIcon />} />
        </div>
      </Section>

      <Section title="Chip · Choice chip">
        <div className="flex flex-wrap gap-2">
          <Chip>{t("pay.containsInterest")}</Chip>
          <Chip tone="highlight" icon={<WarningIcon className="size-3.5" />}>
            {t("pay.containsInterest")}
          </Chip>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[3, 6, 12].map((n) => (
            <ChoiceChip key={n} selected={tenor === n} onClick={() => setTenor(n)}>
              {n} months
            </ChoiceChip>
          ))}
        </div>
      </Section>

      <Section title="Option row">
        <div className="space-y-3">
          <OptionRow
            selected={payment === "full"}
            onClick={() => setPayment("full")}
            icon={<WalletIcon className="size-5" />}
            title={t("pay.inFull")}
            detail={t("pay.inFullDetail")}
            trailing={formatIDR(1513000)}
          />
          <OptionRow
            selected={payment === "later"}
            onClick={() => setPayment("later")}
            icon={<CalendarIcon className="size-5" />}
            title={t("pay.paylaterMonths", { n: 6 })}
            detail={`${formatIDR(289992)}/month · 2,5% fee`}
            trailing={formatIDR(1739950)}
          />
        </div>
      </Section>

      <Section title="Stat card · Notice">
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Concert in SG" value="+64 days" />
          <StatCard label="Joy budget" value={formatIDRCompact(-1060000)} />
          <StatCard label="Joy budget left" value={formatIDRCompact(270000)} />
          <StatCard label="With PayLater" value={formatIDRSigned(226950)} />
        </div>
        <Notice className="mt-3" title={t("notice.lateTitle")}>
          {t("notice.lateBody")}
        </Notice>
      </Section>

      <Section title="Provider tile">
        <div className="grid grid-cols-2 gap-2.5">
          <ProviderTile name="SPayLater" detail="Detected" selected={provider === "spaylater"} onClick={() => setProvider("spaylater")} />
          <ProviderTile name="Kredivo" detail="From 1.99%/mo" selected={provider === "kredivo"} onClick={() => setProvider("kredivo")} />
        </div>
      </Section>

      <Section title="Text field · Toggle · Language">
        <TextField label="What should we call you? (optional)" value={nickname} onChange={setNickname} maxLength={20} showCounter />
        <TextField className="mt-3" label="Monthly take-home income" prefix="Rp" inputMode="numeric" value="8.500.000" onChange={() => {}} helper="A rough number is fine. Never linked to your bank 🔒" />
        <div className="mt-4 flex items-center justify-between rounded-md border border-line px-4 py-3">
          <span className="tt-body-strong">Avoid interest</span>
          <Toggle checked={avoidInterest} onChange={setAvoidInterest} label="Avoid interest" />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-card bg-action p-4">
          <LanguageSwitch value={lang} onChange={setLang} onBlue />
          <span className="tt-small text-white">on blue (W1)</span>
        </div>
      </Section>

      <Section title="Mark · Ripple · Sticker (reality hero)">
        <div className="flex items-center gap-4">
          <Mark size={24} />
          <MarkLabel>Cart Check</MarkLabel>
          <Mark size={24} tone="highlight" className="rounded-pill bg-inverse" />
        </div>
        <div className="relative mt-4 overflow-hidden rounded-card bg-action px-5 pt-4 pb-8 text-white">
          <Ripple size={360} rings={4} dot className="absolute -top-24 -right-28 text-white/60" />
          <MarkLabel tone="highlight">{t("realTalk")}</MarkLabel>
          <p className="tt-body-strong mt-4">This cart costs you</p>
          <p className="flex items-end gap-3">
            <span className="tt-hero !text-[96px]">44</span>
            <span className="tt-h1 pb-3">hours of your work</span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Sticker rotate={3}>+64 days to the concert 🎤</Sticker>
            <Sticker tone="white" rotate={-5}>
              {formatIDR(1513000)}
            </Sticker>
          </div>
        </div>
      </Section>

      <Section title="Progress ring">
        <div className="flex items-center gap-4 rounded-card bg-surface p-4">
          <ProgressRing value={0.25} label="25% of your goal">
            25%
          </ProgressRing>
          <div>
            <p className="tt-body-strong">Concert in Singapore</p>
            <p className="tt-small text-ink-2">
              {formatIDR(1225000)} of {formatIDR(4900000)}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Chat (Future Me)">
        <div className="space-y-2 rounded-card bg-soft p-4">
          <div className="mb-2 flex items-center gap-3">
            <FutureAvatar nickname={nickname} />
            <div>
              <p className="tt-body-strong">Future {nickname || "you"}</p>
              <p className="tt-small text-ink-2">Built around your goals</p>
            </div>
            <FutureAvatar className="ml-auto" size={36} />
          </div>
          <ChatBubble from="model">Hey, it's you from July 2027 👋 We made it to that concert. Barely.</ChatBubble>
          <ChatBubble from="user">but it's 50% off 🤤</ChatBubble>
          <ChatBubble from="model">Fair! Is it the jacket you want, or the discount?</ChatBubble>
          <p className="tt-caption pt-1 text-center text-ink-2">{t("disclaimer.ai")}</p>
        </div>
      </Section>

      <Section title="Bottom sheet · Toast">
        <div className="flex flex-wrap gap-2">
          <Button size="small" onClick={() => setSheetOpen(true)}>
            Open sheet
          </Button>
          <Button size="small" variant="secondary" onClick={() => toast({ message: "Saved! We'll check in with you in a week 🫶", icon: true })}>
            Toast (top)
          </Button>
          <Button
            size="small"
            variant="secondary"
            onClick={() => toast({ message: "Denim jacket removed", position: "bottom", action: { label: "Undo", onClick: () => {} } })}
          >
            Toast (undo)
          </Button>
        </div>
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Check a cart"
          description="Screenshot your cart or checkout page first, then pick it here."
        >
          <div className="space-y-3">
            <OptionRow selected={false} icon={<ImageIcon className="size-5" />} title="Choose a screenshot" detail="From your photos" onClick={() => setSheetOpen(false)} />
            <OptionRow selected={false} icon={<CameraIcon className="size-5" />} title="Take a photo" detail="Point at another screen" onClick={() => setSheetOpen(false)} />
            <Button variant="secondary" onClick={() => setSheetOpen(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </BottomSheet>
      </Section>

      <Section title="Disclaimer · icons">
        <Disclaimer />
        <div className="mt-4 flex gap-3 text-ink">
          <BagIcon /> <BookmarkIcon /> <SparkleIcon /> <WalletIcon /> <CalendarIcon /> <CameraIcon /> <ImageIcon /> <SettingsIcon />
        </div>
      </Section>
      <Section title="v2 color tokens">
        <ul className="grid grid-cols-2 gap-2">
          {V2_SWATCHES.map((s) => (
            <li key={s.name} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
              <span aria-hidden className={`size-6 shrink-0 rounded-pill border border-line ${s.swatch}`} />
              <span className="tt-caption">{s.name}</span>
            </li>
          ))}
        </ul>
      </Section>
      <V2Components />
    </main>
  );
}

function V2Components() {
  const [hours, setHours] = useState(8);
  const [pocket, setPocket] = useState("fashion");
  const [dialog, setDialog] = useState(false);
  const pockets = [
    { id: "fashion", name: "Fashion", pct: 47 },
    { id: "gadgets", name: "Gadgets", pct: 54 },
    { id: "entertainment", name: "Entertainment", pct: 22 },
    { id: "travel", name: "Travel", pct: 65 },
  ];
  return (
    <>
      <Section title="v2 · Future Me robot (20 / 30 / 56 / 96)">
        <div className="flex items-end gap-4">
          {[20, 30, 56, 96].map((n) => (
            <FutureMeRobot key={n} size={n} />
          ))}
        </div>
      </Section>
      <Section title="v2 · Percent rings">
        <div className="flex items-center gap-4">
          <PercentRing
            label="Allocation 100%"
            segments={[
              { pct: 30, color: "var(--tt-color-pocket-fashion-ring)" },
              { pct: 20, color: "var(--tt-color-pocket-gadgets-ring)" },
              { pct: 25, color: "var(--tt-color-pocket-entertainment-ring)" },
              { pct: 25, color: "var(--tt-color-pocket-travel-ring)" },
            ]}
            track="var(--tt-color-bg-surface)"
          >
            <span className="tt-number">100%</span>
          </PercentRing>
          <PercentRing label="Over-allocated 110%" tone="danger" segments={[{ pct: 110, color: "var(--tt-color-action-primary)" }]} track="var(--tt-color-bg-surface)">
            <span className="tt-number text-danger">110%</span>
          </PercentRing>
          <PercentRing label="Wishlist 47%" segments={[{ pct: 47, color: "var(--tt-color-action-primary)" }]} track="var(--tt-color-bg-surface)">
            <span className="tt-number">47%</span>
          </PercentRing>
        </div>
      </Section>
      <Section title="v2 · Scroll picker (hours per day)">
        <ScrollPicker
          label="Hours per day"
          value={hours}
          onChange={setHours}
          options={[6, 7, 8, 9, 10].map((n) => ({ value: n, label: `${n} hrs` }))}
        />
        <p className="tt-small mt-2 text-ink-2">Selected: {hours}</p>
      </Section>
      <Section title="v2 · Pocket cards and chips">
        <div className="grid grid-cols-2 gap-2">
          {pockets.map((p) => (
            <PocketCard key={p.id} pocketId={p.id} name={p.name} pct={p.pct} detail="sample" />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {pockets.map((p) => (
            <PocketChip key={p.id} pocketId={p.id} name={p.name} selected={pocket === p.id} onClick={() => setPocket(p.id)} />
          ))}
        </div>
      </Section>
      <Section title="v2 · Verdict">
        <div className="flex flex-col gap-2">
          <Verdict status="healthy" title="Healthy" subtitle="Fashion stays at 73% after this buy" barLabel="Fashion pocket" barValue="$240.10 left of $330" barPct={73} />
          <Verdict status="not_healthy" title="Not healthy" subtitle="Fashion would be over by $37.90" barLabel="Fashion pocket" barValue="$52 left of $330" barPct={0} />
          <Verdict status="pocket_empty" title="Pocket empty" subtitle="Nothing left in Fashion this month" barLabel="Fashion pocket" barValue="$0 left of $330" barPct={0} />
        </div>
      </Section>
      <Section title="v2 · Dialog and empty state">
        <Button size="small" variant="secondary" onClick={() => setDialog(true)}>Open dialog</Button>
        <Dialog
          open={dialog}
          onClose={() => setDialog(false)}
          title="Already on your wishlist"
          description="You saved this one before."
          actions={
            <>
              <Button onClick={() => setDialog(false)}>View wishlist</Button>
              <Button variant="secondary" onClick={() => setDialog(false)}>Add anyway</Button>
            </>
          }
        />
        <EmptyState art={<FutureMeRobot size={96} />} title="Nothing here yet" description="Check a product to start your wishlist." action={<Button>Check a product</Button>} />
      </Section>
    </>
  );
}

/** Full class names so Tailwind can see them. */
const V2_SWATCHES = [
  { name: "pocket-fashion", swatch: "bg-pocket-fashion" },
  { name: "pocket-gadgets", swatch: "bg-pocket-gadgets" },
  { name: "pocket-entertainment", swatch: "bg-pocket-entertainment" },
  { name: "pocket-travel", swatch: "bg-pocket-travel" },
  { name: "robot-body", swatch: "bg-robot-body" },
  { name: "robot-screen", swatch: "bg-robot-screen" },
  { name: "success", swatch: "bg-success" },
  { name: "success-tint", swatch: "bg-success-tint" },
  { name: "danger", swatch: "bg-danger" },
  { name: "danger-tint", swatch: "bg-danger-tint" },
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line py-6 first-of-type:border-t-0">
      <h2 className="tt-caption mb-3 uppercase tracking-wide text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

function StatusRow({ label, check }: { label: string; check: Check }) {
  const dot = check.state === "ok" ? "bg-action" : check.state === "fail" ? "bg-warn" : "bg-line";
  return (
    <li className="flex items-start gap-3 rounded-md bg-surface px-4 py-3">
      <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-pill ${dot}`} />
      <span className="min-w-0">
        <span className="tt-body-strong block">{label}</span>
        <span className="tt-small block break-words text-ink-2">
          {check.state === "pending" ? "checking…" : check.detail}
        </span>
      </span>
    </li>
  );
}
