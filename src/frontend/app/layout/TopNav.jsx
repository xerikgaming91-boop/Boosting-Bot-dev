// src/frontend/app/layout/TopNav.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";

/**
 * Obere Navigation inkl. Login/Logout.
 * - Wenn keine Session → "Login mit Discord" (Link zu /api/auth/login)
 * - Wenn eingeloggt → Avatar/Name + "Logout" (Link zu /api/auth/logout)
 * - Einfache Nav-Tabs zu Raids / Presets / Chars / Users
 */
export default function TopNav() {
  const { user, loading } = useAuth();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/60">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="size-7 rounded bg-indigo-600/80 grid place-items-center font-bold text-xs text-white">
            BB
          </div>
          <span className="text-zinc-100 font-semibold tracking-wide">
            Boosting Bot
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Tab to="/raids" label="Raids" />
          <Tab to="/presets" label="Presets" />
          <Tab to="/chars" label="Chars" />
           <Tab to="/MyRaids" label="myRaids" />
          {/* Users nur zeigen, wenn Rolle vorhanden */}
          {!loading && (user?.isRaidlead || user?.isAdmin || user?.isOwner) && (
            <Tab to="/users" label="Users" />
          )}
          
        </nav>

        {/* Auth-Bereich */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="text-xs text-zinc-400">lädt…</div>
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition"
            >
              <DiscordIcon />
              Login mit Discord
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function Tab({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "px-3 py-1.5 rounded-md text-sm",
          isActive
            ? "bg-zinc-800 text-zinc-100"
            : "text-zinc-300 hover:text-white hover:bg-zinc-800/60",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

function UserMenu({ user }) {
  const name = user.displayName || user.username || user.discordId;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={name}
            className="size-7 rounded-full ring-1 ring-zinc-700 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="size-7 rounded-full bg-zinc-800 grid place-items-center text-xs text-zinc-300">
            {name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div className="hidden sm:block">
          <div className="text-sm text-zinc-100 leading-4">{name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            {user.isOwner && <RoleBadge color="from-amber-500 to-amber-400" label="Owner" />}
            {user.isAdmin && <RoleBadge color="from-red-500 to-pink-500" label="Admin" />}
            {user.isRaidlead && <RoleBadge color="from-sky-500 to-indigo-500" label="Lead" />}
          </div>
        </div>
      </div>
      <a
        href="/api/auth/logout"
        className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-zinc-800 text-zinc-200 text-sm hover:bg-zinc-700 transition"
        title="Logout"
      >
        Logout
      </a>
    </div>
  );
}

function RoleBadge({ label, color }) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] leading-4 font-medium text-white",
        "bg-gradient-to-r",
        color,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function DiscordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="currentColor"
    >
      <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.249-1.84-.276-3.68-.276-5.486 0-.164-.398-.398-.874-.622-1.249a.077.077 0 00-.079-.037 19.736 19.736 0 00-4.885 1.515.07.07 0 00-.032.027C1.578 8.061.943 11.62 1.186 15.14a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.027c.461-.63.873-1.295 1.226-1.994a.076.076 0 00-.041-.105 12.94 12.94 0 01-1.853-.878.077.077 0 01-.008-.128c.125-.094.25-.192.369-.291a.074.074 0 01.078-.011c3.891 1.778 8.108 1.778 11.965 0a.074.074 0 01.079.01c.12.099.244.197.369.292a.077.077 0 01-.007.128c-.59.345-1.211.635-1.854.878a.076.076 0 00-.04.106c.36.699.773 1.364 1.226 1.994a.078.078 0 00.084.027 19.876 19.876 0 005.993-3.03.08.08 0 00.031-.057c.5-6.18-.838-9.705-3.548-10.744a.061.061 0 00-.031-.006zm-12.125 9.14c-1.183 0-2.157-1.086-2.157-2.421 0-1.334.955-2.42 2.157-2.42 1.21 0 2.177 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42zm7.61 0c-1.183 0-2.157-1.086-2.157-2.421 0-1.334.955-2.42 2.157-2.42 1.21 0 2.177 1.095 2.157 2.42 0 1.335-.947 2.42-2.157 2.42z" />
    </svg>
  );
}
