// src/frontend/features/users/components/StrikeForm.jsx
import React, { useState } from "react";

export default function StrikeForm({ onSubmit }) {
  const [reason, setReason] = useState("");
  const [weight, setWeight] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          reason: reason.trim(),
          weight: Number(weight) || 1,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        setReason("");
        setWeight(1);
        setExpiresAt("");
      }}
    >
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder="Grund (z.B. NoShow, flame, …)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <input
          className="w-24 border rounded px-2 py-1"
          type="number"
          min={1}
          max={5}
          step={1}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          title="Gewicht (1–5)"
        />
      </div>
      <div className="flex gap-2 items-center">
        <label className="text-sm text-gray-600">Ablauf (optional):</label>
        <input
          className="border rounded px-2 py-1"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <button className="ml-auto bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1" type="submit">
          Strike vergeben
        </button>
      </div>
    </form>
  );
}
