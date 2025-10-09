// src/frontend/features/raids/components/RaidEditToggle.jsx
import React, { useState } from "react";
import useRaidDetail from "../hooks/useRaidDetail";
import RaidEditForm from "./RaidEditForm";

/**
 * Kleiner Wrapper:
 * - zeigt einen "Bearbeiten"-Button
 * - blendet beim Klick das Edit-Formular ein
 * - keine Styles zerstören; du kannst es überall im Detail einfügen
 *
 * Props:
 *  - canEditLead (boolean) -> Raidlead-Feld erlauben
 *  - buttonClassName (optional)
 */
export default function RaidEditToggle({ canEditLead = false, buttonClassName = "" }) {
  const { raid, setRaid } = useRaidDetail();
  const [open, setOpen] = useState(false);

  if (!raid) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className={buttonClassName || "rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"}
          title={open ? "Editor schließen" : "Raid bearbeiten"}
        >
          {open ? "Editor schließen" : "Bearbeiten"}
        </button>
      </div>

      {open && (
        <RaidEditForm
          raid={raid}
          setRaid={setRaid}
          canEditLead={canEditLead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
