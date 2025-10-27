// src/frontend/features/users/components/StrikeList.jsx
import React from "react";

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt || "-";
  }
}

export default function StrikeList({ items, onRemove }) {
  if (!items?.length) {
    return <div className="text-sm text-gray-500">Keine aktiven Strikes.</div>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((s) => {
        const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
        return (
          <li key={s.id} className={`border rounded p-2 ${expired ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-3">
              <div className="text-xs font-mono text-gray-500">#{s.id}</div>
              <div className="flex-1">
                <div className="font-semibold">
                  w={s.weight} – {s.reason}
                </div>
                <div className="text-xs text-gray-600">
                  erstellt: {fmt(s.createdAt)} {s.expiresAt ? `• läuft ab: ${fmt(s.expiresAt)}` : "• ohne Ablauf"}
                </div>
              </div>
              <button
                onClick={() => onRemove?.(s.id)}
                className="text-xs bg-gray-200 hover:bg-gray-300 rounded px-2 py-1"
                title="Strike entfernen"
              >
                Entfernen
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
