// Zentrale Rollenlogik – robust gegen verschiedene Shapes/Benennungen

export function normalizeRoles(me) {
  const set = new Set();
  if (!me) return set;

  const raw = [
    ...(Array.isArray(me.roles) ? me.roles : []),
    me.role,
    ...(Array.isArray(me?.permissions?.roles) ? me.permissions.roles : []),
  ]
    .filter(Boolean)
    .map((r) => String(r).toLowerCase());

  raw.forEach((r) => {
    set.add(r);
    // ein paar Synonyme/Abkürzungen abfangen
    if (r === "leader" || r === "raidlead" || r === "raid-lead") set.add("lead");
    if (r === "lb" || r === "loot" || r === "looter") set.add("lootbuddy");
  });

  if (me.isOwner) set.add("owner");
  if (me.isAdmin) set.add("admin");
  if (me.isLead || me.lead) set.add("lead");
  if (me.isBooster) set.add("booster");
  if (me.isLootbuddy) set.add("lootbuddy");

  return set;
}

export function hasAnyRole(me, roles) {
  const set = normalizeRoles(me);
  return roles.some((r) => set.has(String(r).toLowerCase()));
}

export const canSeeRaids   = (me) => hasAnyRole(me, ["lootbuddy", "booster", "lead", "admin", "owner"]);
export const canCreateRaids= (me) => hasAnyRole(me, ["lead", "admin", "owner"]);
export const canPickLead   = (me) => hasAnyRole(me, ["admin", "owner"]);
