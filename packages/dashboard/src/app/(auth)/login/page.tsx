"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "options" }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(options.error);
      }

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", response: credential }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(result.error);
      }

      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Axiom</h1>
        <p>Autonomous Agent Orchestrator</p>
        <button
          className="btn-primary"
          disabled={loading}
          onClick={handleLogin}
          type="button"
        >
          {loading ? "Authenticating..." : "Login with Passkey"}
        </button>
        {error && <p className="error">{error}</p>}
        <a className="setup-link" href="/setup">
          First time? Set up your system
        </a>
      </div>
    </div>
  );
}
