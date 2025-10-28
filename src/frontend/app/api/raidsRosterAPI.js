// src/frontend/app/api/raidsRosterAPI.js
export async function apiPostRoster(raidId, opts = {}) {
  const res = await fetch(`/api/raids/${raidId}/discord/post-roster`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    const msg = data?.detail || data?.error || "server_error";
    throw new Error(msg);
  }
  return data; // {ok, channelId, messageId, counts, preview, postedAt}
}
