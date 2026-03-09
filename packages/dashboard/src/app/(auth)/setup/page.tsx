"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useState } from "react";

export default function SetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePasskeySetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const optionsRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "options" }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(options.error);
      }

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", response: credential }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(result.error);
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }, []);

  if (done) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Setup Complete</h1>
          <p>Your passkey has been registered. You're ready to go.</p>
          <a className="btn-primary" href="/">
            Go to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Axiom Setup</h1>
        <p>Register a passkey to secure your dashboard.</p>
        <button
          className="btn-primary"
          disabled={loading}
          onClick={handlePasskeySetup}
          type="button"
        >
          {loading ? "Registering..." : "Register Passkey"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
