import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { cx } from "@/lib/cx";
import { toUpload } from "@/lib/image";
import { useCheck } from "@/state/CheckProvider";
import { BottomSheet, Button, TextField, useToast } from "@/ui";
import { getMockScenario } from "@/services/ai";
import { CheckHeader } from "./CheckHeader";

/** Camera permission as the browser reports it. "unknown" when the Permissions API has no answer; the OS camera then asks itself. */
async function cameraPermission(): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "camera" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** 03a Snap a product, and N3 (camera off): take a photo, choose a screenshot, or paste a link. */
export function Snap() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const check = useCheck();
  const [cameraOff, setCameraOff] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const start = (input: Parameters<typeof check.begin>[0], preview: string | null = null) => {
    check.begin(input, preview);
    navigate("/check/reading");
  };

  const takePhoto = async () => {
    // N3: the browser says the camera is blocked (or the dev scenario forces it).
    if (getMockScenario() === "camera_denied" || (await cameraPermission()) === "denied") {
      setCameraOff(true);
      return;
    }
    cameraInput.current?.click();
  };

  const retryCamera = async () => {
    if (getMockScenario() === "camera_denied") return toast({ message: t("check.cameraHint") });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setCameraOff(false);
    } catch {
      // A page cannot open the system Settings; tell the person where to turn the camera on.
      toast({ message: t("check.cameraHint") });
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await toUpload(file);
      start({ kind: "image", ...img }, URL.createObjectURL(file));
    } catch {
      // The file could not be read as a picture.
      check.begin({ kind: "image", mimeType: "image/jpeg", data: "" });
      check.patch({ problem: "not_a_product" });
      navigate("/check/problem");
    }
  };

  const linkOk = /^https?:\/\/\S+\.\S+/i.test(url.trim());

  return (
    <main className="flex flex-1 flex-col bg-page px-5 pt-[max(12px,env(safe-area-inset-top))] pb-[max(32px,env(safe-area-inset-bottom))]">
      <CheckHeader onBack={() => navigate("/home")} />
      <h2 className="tt-h1 mt-2">{cameraOff ? t("check.cameraOffTitle") : t("check.snapTitle")}</h2>
      <p className="tt-body mt-2 text-ink-2">{cameraOff ? t("check.cameraOffSub") : t("check.snapSub")}</p>

      <div
        className={cx(
          "mt-4 flex h-[230px] flex-col items-center justify-center gap-3 rounded-sheet border-2 border-dashed px-8 text-center",
          cameraOff ? "border-danger bg-danger-tint" : "border-action bg-surface",
        )}
      >
        <span aria-hidden className="text-[56px] leading-none">
          {cameraOff ? "🔒" : "👟"}
        </span>
        <p className="tt-small text-ink-2">{cameraOff ? t("check.cameraOffBox") : t("check.viewfinder")}</p>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {!cameraOff && <Option emoji="📷" title={t("check.photo")} sub={t("check.photoSub")} badge={t("check.best")} onClick={() => void takePhoto()} />}
        <Option emoji="🖼️" title={t("check.screenshot")} sub={t("check.screenshotSub")} onClick={() => galleryInput.current?.click()} />
        <Option emoji="🔗" title={t("check.link")} sub={t("check.linkSub")} onClick={() => setLinkOpen(true)} />
      </div>

      <Button className="mt-3" onClick={cameraOff ? () => void retryCamera() : () => void takePhoto()}>
        {cameraOff ? t("check.openSettings") : t("check.photo")}
      </Button>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={onFile} />

      <BottomSheet open={linkOpen} onClose={() => setLinkOpen(false)} title={t("check.link")} description={t("check.linkSub")}>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!linkOk) return;
            setLinkOpen(false);
            start({ kind: "link", url: url.trim() });
          }}
        >
          <TextField
            label={t("check.link")}
            placeholder={t("check.linkPlaceholder")}
            value={url}
            onChange={setUrl}
            inputMode="url"
            autoCapitalize="none"
            autoFocus
            tone={url.trim() && !linkOk ? "danger" : "default"}
            helper={url.trim() && !linkOk ? t("check.linkInvalid") : undefined}
          />
          <Button type="submit" disabled={!linkOk}>
            {t("check.linkGo")}
          </Button>
        </form>
      </BottomSheet>
    </main>
  );
}

function Option({ emoji, title, sub, badge, onClick }: { emoji: string; title: string; sub: string; badge?: string; onClick: () => void }): ReactNode {
  return (
    <button type="button" onClick={onClick} className="flex h-[70px] items-center gap-3 rounded-card border border-line bg-page px-4 text-left active:bg-surface">
      <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface text-xl">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="tt-body-strong block text-ink">{title}</span>
        <span className="tt-small block text-ink-2">{sub}</span>
      </span>
      {badge && <span className="tt-caption shrink-0 rounded-pill bg-highlight px-3 py-1 font-semibold text-ink">{badge}</span>}
    </button>
  );
}
