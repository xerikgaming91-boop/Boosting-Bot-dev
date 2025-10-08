// src/frontend/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./app/layout/MainLayout.jsx";
import { RequireAuth } from "./app/providers/AuthProvider.jsx";

// Pages
import RaidsList from "./features/raids/pages/RaidsList.jsx";
import RaidDetail from "./features/raids/pages/RaidDetail.jsx";
import PresetsList from "./features/presets/pages/PresetsList.jsx";
import CharsList from "./features/chars/pages/CharsList.jsx";
import UsersList from "./features/users/pages/UsersList.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Startseite → Raids */}
        <Route index element={<Navigate to="/raids" replace />} />

        {/* Raids */}
        <Route path="/raids" element={<RaidsList />} />
        <Route path="/raids/:id" element={<RaidDetail />} />

        {/* Weitere Bereiche */}
        <Route path="/presets" element={<PresetsList />} />
        <Route path="/chars" element={<CharsList />} />
        <Route
          path="/users"
          element={
            <RequireAuth roles={["raidlead", "admin", "owner"]}>
              <UsersList />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/raids" replace />} />
      </Route>
    </Routes>
  );
}
