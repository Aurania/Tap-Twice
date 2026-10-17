import { useRef } from "react";
import { useNavigate } from "react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useCartCheck } from "@/state/CartCheckProvider";
import { BottomSheet, Button, CameraIcon, Chip, ImageIcon, OptionRow } from "@/ui";

/**
 * 03a Pick a screenshot (sheet). Gallery or camera; picking a file starts the Cart Check
 * and opens Reading. The file stays in memory only.
 */
export function ScreenshotPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { start } = useCartCheck();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onFile = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = ""; // allow picking the same file again
    if (!file) return;
    onClose();
    start(file);
    navigate("/check/reading");
  };

  return (
    <>
      <input ref={galleryRef} type="file" accept="image/*" hidden data-testid="pick-gallery" onChange={(e) => onFile(e.currentTarget)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.currentTarget)} />
      <BottomSheet open={open} onClose={onClose} title={t("pick.title")} description={t("pick.body")}>
        <div className="space-y-2.5">
          <OptionRow
            selected={false}
            icon={<ImageIcon className="size-5" />}
            title={
              <span className="inline-flex items-center gap-2">
                {t("pick.choose")}
                <Chip tone="highlight" className="!h-[22px] !px-2.5">
                  {t("pick.best")}
                </Chip>
              </span>
            }
            detail={t("pick.chooseDetail")}
            onClick={() => galleryRef.current?.click()}
          />
          <OptionRow
            selected={false}
            icon={<CameraIcon className="size-5" />}
            title={t("pick.photo")}
            detail={t("pick.photoDetail")}
            onClick={() => cameraRef.current?.click()}
          />
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
