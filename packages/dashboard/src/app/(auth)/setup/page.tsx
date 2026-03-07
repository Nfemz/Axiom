"use client";

import { useState, useCallback } from "react";
import { startRegistration } from "@simplewebauthn/browser";

const STEPS = ["passkey", "api-keys", "payment", "discord", "test-agent"] as const;
const STEP_LABELS: Record<string, string> = {
  passkey: "Register Passkey",
  "api-keys": "API Key Configuration",
  payment: "Payment Method",
  discord: "Discord Webhook",
  "test-agent": "Test Agent Spawn",
};

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    anthropicKey: "",
    openaiKey: "",
    discordWebhook: "",
  });

  const advanceStep = useCallback(async () => {
    try {
      await fetch("/api/system/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      setCurrentStep((prev) => prev + 1);
      setError(null);
    } catch {
      setError("Failed to advance setup");
    }
  }, []);

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
      if (!optionsRes.ok) throw new Error(options.error);

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "verify", response: credential }),
      });
      const result = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(result.error);

      advanceStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }, [advanceStep]);

  const handleApiKeysSubmit = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anthropicApiKey: formData.anthropicKey,
          openaiApiKey: formData.openaiKey,
        }),
      });
      advanceStep();
    } catch {
      setError("Failed to save API keys");
    } finally {
      setLoading(false);
    }
  }, [formData, advanceStep]);

  const stepName = STEPS[currentStep];

  if (currentStep >= STEPS.length) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Setup Complete</h1>
          <p>Your Axiom orchestrator is ready.</p>
          <a href="/" className="btn-primary">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Axiom Setup</h1>
        <div className="step-indicator">
          Step {currentStep + 1} of {STEPS.length}: {STEP_LABELS[stepName]}
        </div>

        {stepName === "passkey" && (
          <div>
            <p>Register a passkey to secure your dashboard.</p>
            <button onClick={handlePasskeySetup} disabled={loading} className="btn-primary">
              {loading ? "Registering..." : "Register Passkey"}
            </button>
          </div>
        )}

        {stepName === "api-keys" && (
          <div>
            <p>Configure at least one AI provider API key.</p>
            <input type="password" placeholder="Anthropic API Key"
              value={formData.anthropicKey}
              onChange={(e) => setFormData((d) => ({ ...d, anthropicKey: e.target.value }))} />
            <input type="password" placeholder="OpenAI API Key (optional)"
              value={formData.openaiKey}
              onChange={(e) => setFormData((d) => ({ ...d, openaiKey: e.target.value }))} />
            <button onClick={handleApiKeysSubmit} disabled={loading} className="btn-primary">
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {stepName === "payment" && (
          <div>
            <p>Payment method configuration (coming soon).</p>
            <button onClick={advanceStep} className="btn-primary">Skip for Now</button>
          </div>
        )}

        {stepName === "discord" && (
          <div>
            <p>Configure Discord webhook for notifications.</p>
            <input type="text" placeholder="Discord Webhook URL"
              value={formData.discordWebhook}
              onChange={(e) => setFormData((d) => ({ ...d, discordWebhook: e.target.value }))} />
            <button onClick={advanceStep} className="btn-primary">
              {formData.discordWebhook ? "Save & Continue" : "Skip for Now"}
            </button>
          </div>
        )}

        {stepName === "test-agent" && (
          <div>
            <p>Spawn a test agent to verify your setup.</p>
            <button onClick={advanceStep} className="btn-primary">Complete Setup</button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
