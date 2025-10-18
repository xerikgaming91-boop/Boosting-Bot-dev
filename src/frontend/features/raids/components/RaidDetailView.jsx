import React from "react";
import useRaidDetail from "../hooks/useRaidDetail.js";

export default function RaidDetailView({ raidId }) {
  const {
    raid,
    picked,
    waiting,
    loading,
    mutating,
    error,
    pick,
    unpick,
    refresh,
  } = useRaidDetail(raidId);

  if (loading) return <div>lädt…</div>;
  if (error) return (
    <div className="error">
      Fehler beim Laden: {String(error.message || error)}
      <button className="btn ml-2" onClick={refresh}>Erneut versuchen</button>
    </div>
  );

  return (
    <div className="raid-detail">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">
          {raid?.title ?? `Raid #${raidId}`}
        </h2>
        <button className="btn" onClick={refresh} disabled={mutating}>Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Waiting / Anmeldungen */}
        <div className="card">
          <div className="card-header">Anmeldungen</div>
          <div className="card-body">
            {waiting.length === 0 ? (
              <div className="text-muted">Keine Anmeldungen</div>
            ) : (
              <ul className="space-y-2">
                {waiting.map((s) => (
                  <li key={String(s.id ?? s.signupId ?? s._id)} className="flex items-center justify-between">
                    <span>{s?.charName ?? s?.characterName ?? s?.userDisplayName ?? "—"}</span>
                    <button
                      className="btn btn-primary"
                      disabled={mutating}
                      onClick={() => pick(String(s.id ?? s.signupId ?? s._id))}
                    >
                      Pick
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Picked / Roster */}
        <div className="card">
          <div className="card-header">Roster</div>
          <div className="card-body">
            {picked.length === 0 ? (
              <div className="text-muted">Noch niemand gepickt</div>
            ) : (
              <ul className="space-y-2">
                {picked.map((s) => (
                  <li key={String(s.id ?? s.signupId ?? s._id)} className="flex items-center justify-between">
                    <span>{s?.charName ?? s?.characterName ?? s?.userDisplayName ?? "—"}</span>
                    <button
                      className="btn"
                      disabled={mutating}
                      onClick={() => unpick(String(s.id ?? s.signupId ?? s._id))}
                    >
                      Unpick
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
