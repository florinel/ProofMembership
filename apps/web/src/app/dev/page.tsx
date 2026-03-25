"use client";

import { useState } from "react";

import { setDevRole } from "@/lib/auth/session";

const roles = ["public", "member", "owner", "admin"] as const;

export default function DevRolePage() {
  const [status, setStatus] = useState("Pick a role to set the session cookie.");

  return (
    <main className="container">
      <h1>Dev Role Switcher</h1>
      <p className="kicker">Sets cookie-based role used by route middleware.</p>
      <div className="stats-grid">
        {roles.map((role) => (
          <button
            key={role}
            className="btn-primary"
            onClick={async () => {
              try {
                await setDevRole(role);
                setStatus(`Role set to ${role}. Navigate to /admin, /owner, or /storefront.`);
              } catch {
                setStatus("Failed to set role.");
              }
            }}
            type="button"
          >
            Set {role}
          </button>
        ))}
      </div>
      <div className="panel">
        <p>{status}</p>
      </div>
    </main>
  );
}
