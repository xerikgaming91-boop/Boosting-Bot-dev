// src/frontend/app/layout/TopNav.jsx
import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider.jsx";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
          "border border-zinc-800/80 hover:border-zinc-700",
          isActive ? "bg-zinc-800/70 text-white" : "text-zinc-300 hover:text-white",
        ].join(" ")
      }
    >
      {children}
    </NavLink>
  );
}

export default function TopNav() {
  const { user, isRaidlead, isAdmin, isOwner, login, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
      <div className="app-container flex items-center justify-between h-14">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-600" />
            <span className="text-sm font-semibold tracking-wide text-zinc-100">
              Boosting Bot
            </span>
          </Link>

          {/* Main Nav */}
          <nav className="hidden sm:flex items-center gap-2 ml-4">
            <NavItem to="/raids">Raids</NavItem>
            <NavItem to="/presets">Presets</NavItem>
            <NavItem to="/chars">Chars</NavItem>
            {(isRaidlead || isAdmin || isOwner) && <NavItem to="/users">Users</NavItem>}
          </nav>
        </div>

        {/* Right side: user / auth */}
        <div className="flex items-center gap-2">
          {/* Role badges */}
          {(isOwner || isAdmin || isRaidlead) && (
            <div className="hidden md:flex items-center gap-2 mr-1">
              {isOwner && <span className="pill">Owner</span>}
              {!isOwner && isAdmin && <span className="pill">Admin</span>}
              {!isOwner && !isAdmin && isRaidlead && <span className="pill">Raidlead</span>}
            </div>
          )}

          {/* User avatar / login */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username || user.discordId}
                    className="h-8 w-8 rounded-full border border-zinc-700"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700" />
                )}
                <span className="hidden sm:block text-sm text-zinc-300">
                  {user.displayName || user.username || user.discordId}
                </span>
              </div>
              <button className="btn" onClick={logout}>Logout</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={login}>Login</button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="sm:hidden border-t border-zinc-800 px-3 pb-3">
        <nav className="flex items-center gap-2 pt-3">
          <NavItem to="/raids">Raids</NavItem>
          <NavItem to="/presets">Presets</NavItem>
          <NavItem to="/chars">Chars</NavItem>
          {(isRaidlead || isAdmin || isOwner) && <NavItem to="/users">Users</NavItem>}
        </nav>
      </div>
    </header>
  );
}
