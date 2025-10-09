// src/frontend/features/raids/components/RaidEditPanel.jsx
import React from "react";
import useRaidEditForm from "../hooks/useRaidEditForm";
import RaidEditForm from "./RaidEditForm";

export default function RaidEditPanel({ raidId, onSaved, onCancel }) {
  const vm = useRaidEditForm(raidId);

  return (
    <RaidEditForm
      me={vm.me}
      leads={vm.leads}
      canPickLead={vm.canPickLead}
      title={vm.title} setTitle={vm.setTitle}
      difficulty={vm.difficulty} setDifficulty={vm.setDifficulty}
      lootType={vm.lootType} setLootType={vm.setLootType}
      dateLocal={vm.dateLocal} setDateLocal={vm.setDateLocal}
      bosses={vm.bosses} setBosses={vm.setBosses}
      lead={vm.lead} setLead={vm.setLead}
      autoTitle={vm.autoTitle} setAutoTitle={vm.setAutoTitle}
      lootOptions={vm.lootOptions}
      canSave={vm.canSave}
      saving={vm.saving}
      error={vm.error}
      onCancel={onCancel}
      submit={async () => {
        const updated = await vm.submit();
        if (updated) onSaved?.(updated);
      }}
    />
  );
}
