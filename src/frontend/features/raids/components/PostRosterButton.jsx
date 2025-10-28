// src/frontend/features/raids/components/PostRosterButton.jsx
import React from "react";
import { apiPostRoster } from "../../../app/api/raidDetailAPI";

export default function PostRosterButton({ raid, className = "" }) {
  const [busy, setBusy] = React.useState(false);
  const [ok, setOk] = React.useState(null);
  const [err, setErr] = React.useState(null);

  async function onClick() {
    if (!raid?.id) return;
    setBusy(true);
    setOk(null);
    setErr(null);
    try {
      const out = await apiPostRoster(raid.id, {}); // optional: { channelId, contentPrefix }
      setOk(`Gepostet → Nachricht ${out.messageId} in #${out.channelId}`);
    } catch (e) {
      setErr(e?.message || "Fehler");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onClick}
        disabled={busy || !raid?.id}
        className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm"
      >
        {busy ? "Poste Roster…" : "Roster posten"}
      </button>
      {ok && <span className="text-green-600 text-sm">{ok}</span>}
      {err && <span className="text-red-600 text-sm">{err}</span>}
    </div>
  );
}
