// src/frontend/features/my-raids/pages/MyRaids.jsx
import React, { useEffect, useState } from "react";
import { apiGet } from "../../../app/api/client.js";

export default function MyRaidsPage() {
  const [data, setData] = useState({
    ok: true,
    userId: null,
    upcoming: { rostered: [], signups: [] },
    past: { rostered: [], signups: [] },
  });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const j = await apiGet("/api/users/me/raids");
        if (alive) {
          setData({
            ok: !!j?.ok,
            userId: j?.userId ?? null,
            upcoming: j?.upcoming ?? { rostered: [], signups: [] },
            past: j?.past ?? { rostered: [], signups: [] },
          });
        }
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="card">
      <h2>Meine Raids</h2>

      {loading && <p className="hint">Lade…</p>}
      {err && <p className="hint">Fehler: {err}</p>}

      {!loading && !err && (
        <div className="grid">
          <Block title="Demnächst – Im Roster" items={data.upcoming.rostered} />
          <Block title="Demnächst – Angemeldet" items={data.upcoming.signups} />
          <Block title="Vergangenheit – Im Roster" items={data.past.rostered} />
          <Block title="Vergangenheit – Angemeldet" items={data.past.signups} />
        </div>
      )}
    </section>
  );
}

function Block({ title, items }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      {Array.isArray(items) && items.length ? (
        <ul>
          {items.map((it) => (
            <li key={it.id || `${it.raidId}-${it.charId || it.userId || Math.random()}`}>
              <Line it={it} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Keine Einträge.</p>
      )}
    </article>
  );
}

function Line({ it }) {
  // Unterstützt einfache Strukturen wie:
  // { raidId, title, date, difficulty, lootType, status, role, charName, itemLevel }
  const date = it.date ? new Date(it.date) : null;
  const dateStr = date && isFinite(date) ? date.toLocaleString("de-DE") : null;

  const bits = [
    it.title,
    it.difficulty,
    it.lootType,
    dateStr,
    it.role,
    it.charName ? `(${it.charName}${it.itemLevel ? ` • ${it.itemLevel}ilvl` : ""})` : null,
    it.status,
  ].filter(Boolean);

  return <span className="hint">{bits.join(" • ")}</span>;
}
