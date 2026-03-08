"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useState } from "react";

const STEPS = [
  "passkey",
  "api-keys",
  "payment",
  "discord",
  "test-agent",
] as const;
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
        <div className="step-indicator">
          Step {currentStep + 1} of {STEPS.length}: {STEP_LABELS[stepName]}
        </div>

        {stepName === "passkey" && (
          <div>
            <p>Register a passkey to secure your dashboard.</p>
            <button
              className="btn-primary"
              disabled={loading}
              onClick={handlePasskeySetup}
              type="button"
            >
              {loading ? "Registering..." : "Register Passkey"}
            </button>
          </div>
        )}

        {stepName === "api-keys" && (
          <div>
            <p>Configure at least one AI provider API key.</p>
            <input
              onChange={(e) =>
                setFormData((d) => ({ ...d, anthropicKey: e.target.value }))
              }
              placeholder="Anthropic API Key"
              type="password"
              value={formData.anthropicKey}
            />
            <input
              onChange={(e) =>
                setFormData((d) => ({ ...d, openaiKey: e.target.value }))
              }
              placeholder="OpenAI API Key (optional)"
              type="password"
              value={formData.openaiKey}
            />
            <button
              className="btn-primary"
              disabled={loading}
              onClick={handleApiKeysSubmit}
              type="button"
            >
              {loading ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        )}

        {stepName === "payment" && (
          <div>
            <p>Payment method configuration (coming soon).</p>
            <button className="btn-primary" onClick={advanceStep} type="button">
              Skip for Now
            </button>
          </div>
        )}

        {stepName === "discord" && (
          <div>
            <p>Configure Discord webhook for notifications.</p>
            <input
              onChange={(e) =>
                setFormData((d) => ({ ...d, discordWebhook: e.target.value }))
              }
              placeholder="Discord Webhook URL"
              type="text"
              value={formData.discordWebhook}
            />
            <button className="btn-primary" onClick={advanceStep} type="button">
              {formData.discordWebhook ? "Save & Continue" : "Skip for Now"}
            </button>
          </div>
        )}

        {stepName === "test-agent" && (
          <div>
            <p>Spawn a test agent to verify your setup.</p>
            <button className="btn-primary" onClick={advanceStep} type="button">
              Complete Setup
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
