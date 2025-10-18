import { useMemo } from "react";
import useRaidBootstrap from "../hooks/useRaid.js";
import { buildRaidRowsVm } from "../VM/raidListVM.js";
import RaidCreateForm from "../components/RaidCreateForm.jsx";
import { canSeeRaids, canCreateRaids, canPickLead } from "../../../app/utils/authz.js";

export default function RaidsList() {
  const { me, leads, raids, loading, error, createRaid } = useRaidBootstrap();

  const rowsVm = useMemo(() => buildRaidRowsVm(raids, leads), [raids, leads]);

  if (!me) {
    return <div className="callout callout-warn">Bitte einloggen, um die Raids zu sehen.</div>;
  }

  if (!canSeeRaids(me)) {
    return (
      <div className="callout callout-warn">
        Kein Zugriff. Dir fehlt eine der Rollen: Lootbuddy/Booster/Lead/Admin/Owner.
      </div>
    );
  }

  return (
    <div className="container">
      <h2>Raids</h2>

      {canCreateRaids(me) && (
        <div className="card mb-6">
          <div className="card-header">Raid erstellen</div>
          <div className="card-body">
            <RaidCreateForm
              me={me}
              leads={leads}
              canPickLead={canPickLead(me)}
              onCreate={createRaid}
            />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">Geplante Raids</div>
        <div className="card-body">
          {loading ? (
            <div className="text-dim">Lade…</div>
          ) : error ? (
            <div className="text-error">Fehler: {String(error)}</div>
          ) : rowsVm.length === 0 ? (
            <div className="text-dim">Keine Raids vorhanden.</div>
          ) : (
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Titel</th>
                  <th>Datum</th>
                  <th>Diff</th>
                  <th>Loot</th>
                  <th>Lead</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rowsVm.map((r) => (
                  <tr key={r.id ?? r.title}>
                    <td>{r.title}</td>
                    <td>{r.dateLabel}</td>
                    <td>{r.difficultyLabel}</td>
                    <td>{r.lootLabel}</td>
                    <td>{r.leadLabel}</td>
                    <td>
                      <a className="btn btn-sm" href={`/raids/${r.id}`}>Details</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
