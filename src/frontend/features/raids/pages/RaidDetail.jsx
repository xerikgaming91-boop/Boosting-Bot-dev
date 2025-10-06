// src/frontend/features/raids/pages/RaidsList.jsx
import React from "react";
import { useRaidBootstrap } from "../hooks/useRaidBootstrap";
import RaidCreateForm from "../components/RaidCreateForm";
import RaidListTable from "../components/RaidListTable";

export default function RaidsList() {
  const {
    loading,
    canPickLead,
    presets,
    leads,
    raids,
    busy,
    createRaid,
    deleteRaid,
  } = useRaidBootstrap();

  if (loading) return null;

  return (
    <div className="bb-page bb-page-raids">
      <div className="bb-container">

        <div className="bb-card">
          <div className="bb-card-body">
            <RaidCreateForm
              presets={presets}
              leads={leads}
              canPickLead={canPickLead}
              onSubmit={createRaid}
              busy={busy}
            />
          </div>
        </div>

        <div className="bb-card">
          <div className="bb-card-header">Geplante Raids</div>
          <div className="bb-card-body">
            <RaidListTable raids={raids} onDelete={deleteRaid} />
          </div>
        </div>

      </div>
    </div>
  );
}
