// src/frontend/features/raids/components/RaidListTable.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";

/**
 * Erwartete Raid-Form (tolerant):
 * {
 *   id: string|number,
 *   title: string,
 *   date: string|number (ISO/epoch),
 *   startTime?: string, // "20:00"
 *   difficulty?: "normal"|"heroic"|"mythic"|"m+"|"custom",
 *   lootType?: "vip"|"armorstack"|"split"|"gdkp"|"srv"|"any",
 *   leadName?: string,
 *   channelId?: string,
 *   signupsCount?: number,
 *   capacity?: number
 * }
 */

const cell = "px-3 py-2 align-middle";
const th =
  "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300/90";
const row =
  "border-b border-zinc-800/70 hover:bg-zinc-900/40 transition-colors";

const badgeBase =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
const diffStyles = {
  normal: "border-zinc-600/60 text-zinc-300",
  heroic: "border-indigo-600/50 text-indigo-300",
  mythic: "border-emerald-600/50 text-emerald-300",
  "m+": "border-fuchsia-600/50 text-fuchsia-300",
  custom: "border-amber-600/50 text-amber-300",
};
const btn =
  "inline-flex items-center gap-1 rounded-lg border border-zinc-700/70 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-zinc-600/50";

/** Robuste native Datum/Zeit-Formatierung (ohne dayjs) */
function formatWhen(raid) {
  const raw = raid?.date;
  if (raw == null) return "—";

  const d =
    typeof raw === "number"
      ? new Date(raw)
      : typeof raw === "string"
      ? new Date(raw)
      : null;

  if (!(d instanceof Date) || isNaN(d.getTime())) return "—";

  // Datum (de-DE)
  const dateStr = d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Zeit aus startTime überschreibt ggf. die aus date
  let timeStr;
  if (raid?.startTime && /^\d{1,2}:\d{2}$/.test(raid.startTime)) {
    timeStr = raid.startTime;
  } else {
    timeStr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  return `${dateStr} ${timeStr}`;
}

function DifficultyBadge({ value }) {
  const v = String(value || "custom").toLowerCase();
  const style = diffStyles[v] || diffStyles.custom;
  return <span className={`${badgeBase} ${style}`}>{v}</span>;
}

function LootBadge({ value }) {
  const v = (value && String(value)) || "—";
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700/60 px-2 py-0.5 text-xs text-zinc-300">
      {v}
    </span>
  );
}

export default function RaidListTable({ raids = [], onRefresh }) {
  const rows = useMemo(() => {
    return Array.isArray(raids) ? raids : [];
  }, [raids]);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-300">
        Keine Raids gefunden.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/70 bg-zinc-950/40">
      <table className="min-w-full table-fixed">
        <thead className="bg-zinc-950/60">
          <tr>
            <th className={th} style={{ width: "16rem" }}>
              Wann
            </th>
            <th className={th}>Titel</th>
            <th className={th} style={{ width: "8rem" }}>
              Schwierigkeit
            </th>
            <th className={th} style={{ width: "7rem" }}>
              Loot
            </th>
            <th className={th} style={{ width: "10rem" }}>
              Lead
            </th>
            <th className={th} style={{ width: "8rem" }}>
              Anmeldungen
            </th>
            <th className={th} style={{ width: "10rem" }}>
              Aktionen
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const id = r?.id ?? r?._id ?? "";
            const title = r?.title || "—";
            const when = formatWhen(r);
            const lead = r?.leadName || r?.lead || "—";
            const sCount =
              typeof r?.signupsCount === "number" ? r.signupsCount : undefined;
            const cap =
              typeof r?.capacity === "number" ? r.capacity : undefined;

            return (
              <tr key={String(id)} className={row}>
                <td className={`${cell} text-zinc-200 whitespace-nowrap`}>
                  {when}
                </td>
                <td className={`${cell} text-zinc-100`}>
                  <div className="line-clamp-2 break-words">{title}</div>
                </td>
                <td className={cell}>
                  <DifficultyBadge value={r?.difficulty} />
                </td>
                <td className={cell}>
                  <LootBadge value={r?.lootType} />
                </td>
                <td className={`${cell} text-zinc-300`}>{lead}</td>
                <td className={`${cell} text-zinc-300`}>
                  {typeof sCount === "number" && typeof cap === "number"
                    ? `${sCount}/${cap}`
                    : typeof sCount === "number"
                    ? sCount
                    : "—"}
                </td>
                <td className={`${cell}`}>
                  <div className="flex gap-2">
                    <Link to={`/raids/${encodeURIComponent(id)}`} className={btn}>
                      Öffnen
                    </Link>
                    {onRefresh ? (
                      <button type="button" onClick={onRefresh} className={btn}>
                        Refresh
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
