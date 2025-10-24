// src/frontend/features/raids/components/RaidEditForm.jsx
import React from "react";
import useRaidEditForm from "../hooks/useRaidEditForm";

function Label({ children }) {
  return <div className="text-xs text-zinc-400 mb-1">{children}</div>;
}

function FieldRow({ children }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Select({ value, onChange, children, disabled, ...rest }) {
  return (
    <select
      className={`w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500 ${disabled ? "opacity-60" : ""}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      {...rest}
    >
      {children}
    </select>
  );
}

function Input({ value, onChange, type = "text", ...rest }) {
  return (
    <input
      type={type}
      className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    />
  );
}

function NumberInput({ value, onChange, ...rest }) {
  return (
    <input
      type="number"
      className="w-full rounded-md border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    />
  );
}

function leadLabel(l) {
  return (
    l?.displayName ||
    l?.username ||
    l?.globalName ||
    l?.tag ||
    l?.name ||
    l?.discordTag ||
    l?.discordName ||
    l?.id ||
    l?.discordId ||
    "-"
  );
}

function leadValue(l) {
  return String(l?.discordId ?? l?.id ?? l?.userId ?? "");
}

export default function RaidEditForm({ raidId, onSaved, onClose }) {
  const {
    loading, saving, error,
    me, leads, canPickLead,
    title, setTitle,
    difficulty, setDifficulty,
    lootType, setLootType,
    dateLocal, setDateLocal,
    bosses, setBosses,
    lead, setLead,
    autoTitle, setAutoTitle,
    lootOptions,
    canSave,
    submit,
    regenerateTitle,
    reload,
  } = useRaidEditForm(raidId);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const updated = await submit();
    if (updated) {
      await reload();
      onSaved?.(updated);
      onClose?.();
    }
  }

  const isMythic = String(difficulty || "").toUpperCase() === "MYTHIC";

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Raid bearbeiten</h3>
        <button
          onClick={onClose}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          Schließen
        </button>
      </div>

      {loading ? (
        <div className="text-zinc-300">Lade …</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titel</Label>
            <div className="flex items-center gap-2">
              <Input value={title} onChange={setTitle} placeholder="Raid-Titel" />
              <button
                type="button"
                className="whitespace-nowrap rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                onClick={regenerateTitle}
                title="Titel automatisch generieren"
              >
                Neu generieren
              </button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={!!autoTitle}
                onChange={(e) => setAutoTitle(e.target.checked)}
              />
              Titel automatisch aus Diff/Loot/Bossen ableiten
            </label>
          </div>

          <FieldRow>
            <div>
              <Label>Datum &amp; Uhrzeit</Label>
              <Input
                type="datetime-local"
                value={dateLocal}
                onChange={setDateLocal}
                required
              />
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onChange={setDifficulty}>
                <option value="NORMAL">Normal</option>
                <option value="HC">HC</option>
                <option value="MYTHIC">Mythic</option>
              </Select>
            </div>
          </FieldRow>

          <FieldRow>
            <div>
              <Label>Loot</Label>
              <Select
                value={lootType}
                onChange={setLootType}
                disabled={isMythic} // <- Mythic nur VIP
                title={isMythic ? "Mythic erlaubt nur VIP" : undefined}
              >
                {lootOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
              {isMythic && (
                <div className="mt-1 text-xs text-zinc-500">Mythic: nur VIP erlaubt.</div>
              )}
            </div>

            <div>
              <Label>Bosse</Label>
              <NumberInput
                value={bosses}
                onChange={setBosses}
                min={isMythic ? 1 : 8}
                max={8}
                step={1}
                disabled={!isMythic}
              />
              {!isMythic ? (
                <div className="mt-1 text-xs text-zinc-500">Bei Normal/HC immer 8.</div>
              ) : (
                <div className="mt-1 text-xs text-zinc-500">Mythic: 1–8 Bosse.</div>
              )}
            </div>
          </FieldRow>

          {canPickLead && (
            <div>
              <Label>Raidlead</Label>
              <Select value={lead} onChange={setLead}>
                <option value="">– bitte wählen –</option>
                {Array.isArray(leads) &&
                  leads.map((l) => (
                    <option key={leadValue(l)} value={leadValue(l)}>
                      {leadLabel(l)}
                    </option>
                  ))}
              </Select>
              <div className="mt-1 text-xs text-zinc-500">Nur Owner/Admin können den Lead ändern.</div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-rose-800 bg-rose-950/50 p-2 text-sm text-rose-300">
              Fehler: {String(error?.message || error)}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              onClick={onClose}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!canSave || saving}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Speichere …" : "Speichern"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
