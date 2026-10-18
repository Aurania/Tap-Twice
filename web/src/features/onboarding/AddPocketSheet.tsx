import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { BottomSheet, Button, TextField } from "@/ui";

/** TODO(design): custom pocket rules (empty, duplicate, limit) are not designed. Minimal: a name is required and unique, up to 12 pockets. */
export function AddPocketSheet({ open, onClose, taken, onAdd }: { open: boolean; onClose: () => void; taken: string[]; onAdd: (name: string) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const duplicate = taken.includes(trimmed.toLowerCase());
  return (
    <BottomSheet open={open} onClose={onClose} title={t("onboarding.addPocketTitle")}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!trimmed || duplicate) return;
          onAdd(trimmed);
          setName("");
          onClose();
        }}
      >
        <TextField
          label={t("onboarding.pocketName")}
          placeholder={t("onboarding.pocketNamePlaceholder")}
          value={name}
          onChange={setName}
          maxLength={30}
          autoFocus
          tone={duplicate ? "danger" : "default"}
          helper={duplicate ? t("onboarding.pocketNameTaken") : undefined}
        />
        <Button type="submit" disabled={!trimmed || duplicate}>
          {t("onboarding.pocketAdd")}
        </Button>
      </form>
    </BottomSheet>
  );
}
