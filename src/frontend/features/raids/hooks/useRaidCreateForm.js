import { useCallback, useMemo, useState } from "react";

const LOOT = ["Unsaved", "Saved", "VIP"];
const DIFFS = ["Normal", "Heroic", "Mythic"];

export default function useRaidCreateForm({ leads = [], me, onCreate, canPickLead }) {
  const [date, setDate] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loot, setLoot] = useState("Unsaved");
  const [leadId, setLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [okMsg, setOkMsg] = useState(null);

  // vorauswahl Raidlead
  const initialLead = useMemo(() => {
    if (canPickLead) return "";
    if (me?.discordId) return me.discordId;
    return "";
  }, [canPickLead, me?.discordId]);

  // Defaults setzen, sobald me verfügbar ist
  useState(() => {
    if (!leadId && initialLead) setLeadId(initialLead);
  });

  const reset = useCallback(() => {
    setDate("");
    setDifficulty("");
    setLoot("Unsaved");
    setLeadId(canPickLead ? "" : (me?.discordId ?? ""));
    setError(null);
    setOkMsg(null);
  }, [canPickLead, me?.discordId]);

  const submit = useCallback(async () => {
    setError(null);
    setOkMsg(null);

    if (!date) {
      setError("Bitte Datum & Zeit wählen.");
      return;
    }
    if (!difficulty) {
      setError("Bitte Schwierigkeit wählen.");
      return;
    }
    if (!leadId) {
      setError("Bitte Raidlead auswählen.");
      return;
    }
    if (difficulty === "Mythic" && loot !== "VIP") {
      setError("Bei Mythic ist nur 'VIP' erlaubt.");
      return;
    }

    const payload = {
      date,                // ISO oder dein gewünschtes Format – Backend nimmt bei dir beide an
      difficulty,
      loot,
      lead: leadId,        // wichtig: Lead-ID aus dem Dropdown
    };

    setSaving(true);
    try {
      const res = await onCreate(payload); // erwartet { ok, raid? }
      if (res?.ok) {
        setOkMsg("Raid wurde erstellt.");
        // Felder leeren für nächsten Eintrag
        reset();
      } else {
        setError("Erstellen fehlgeschlagen.");
      }
    } catch (e) {
      setError(e?.message || "Erstellen fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }, [date, difficulty, loot, leadId, onCreate, reset]);

  return {
    fields: {
      date,
      difficulty,
      loot,
      leadId,
      leads,
      me,
      diffs: DIFFS,
      lootTypes: LOOT,
    },
    setDate,
    setDifficulty,
    setLoot,
    setLeadId,
    submit,
    reset,
    saving,
    error,
    okMsg,
  };
}
