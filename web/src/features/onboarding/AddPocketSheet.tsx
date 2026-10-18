import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { BottomSheet, Button, TextField } from "@/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Lower-cased names already in use (the pocket being edited excluded). */
  taken: string[];
  /** Add a new pocket, or rename the one being edited. */
  onAdd: (name: string) => void;
  /** Edit mode: the pocket's current name, prefilled. */
  initialName?: string;
  /** Edit mode: remove this pocket (built-in pockets too). */
  onRemove?: () => void;
  /** At least one pocket must stay. */
  canRemove?: boolean;
};

/**
 * Add a custom pocket, or edit / remove any pocket (built-in ones too). A name is required and unique, up to 30 characters.
 * Renaming keeps the pocket's id, so its color and anything filed under it stay the same.
 */
export function AddPocketSheet({ open, onClose, taken, onAdd, initialName, onRemove, canRemove = true }: Props) {
  const { t } = useI18n();
  const editing = initialName !== undefined;
  const [name, setName] = useState(initialName ?? "");
  useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  const trimmed = name.trim();
  const duplicate = taken.includes(trimmed.toLowerCase());
  return (
    <BottomSheet open={open} onClose={onClose} title={t(editing ? "onboarding.editPocketTitle" : "onboarding.addPocketTitle")}>
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
          {t(editing ? "onboarding.pocketSave" : "onboarding.pocketAdd")}
        </Button>
        {editing && onRemove && (
          <>
            <Button
              variant="secondary"
              disabled={!canRemove}
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              {t("onboarding.pocketRemoveButton")}
            </Button>
            {!canRemove && <p className="tt-small -mt-2 text-center text-ink-2">{t("onboarding.pocketKeepOne")}</p>}
          </>
        )}
      </form>
    </BottomSheet>
  );
}
