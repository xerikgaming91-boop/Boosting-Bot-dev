// src/frontend/app/api/myRaidsAPI.js
export async function apiGetMyRaids({ scope = "upcoming", cycle = "all", onlyPicked = true } = {}) {
  const qs = new URLSearchParams();
  if (scope === "all") qs.set("scope", "all");
  if (["current", "next", "all"].includes(cycle)) qs.set("cycle", cycle);
  if (onlyPicked) qs.set("onlyPicked", "1");

  const res = await fetch(`/api/my-raids?${qs.toString()}`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`MY_RAIDS_${res.status}${txt ? ` ${txt}` : ""}`);
  }
  const json = await res.json();
  const upcoming = json.upcoming || { rostered: [], signups: [] };
  const past = json.past || { rostered: [], signups: [] };
  return { upcoming, past };
}
