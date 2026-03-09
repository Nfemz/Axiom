"use client";

import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import { AlertCircle, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

async function requestAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "options" }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }
  return data;
}

async function verifyAuthentication(credential: unknown): Promise<void> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "verify", response: credential }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const options = await requestAuthenticationOptions();
      const credential = await startAuthentication({ optionsJSON: options });
      await verifyAuthentication(credential);
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-bold text-2xl tracking-tight">
            Axiom
          </CardTitle>
          <CardDescription>Autonomous Agent Orchestrator</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            disabled={loading}
            onClick={handleLogin}
            size="lg"
            type="button"
          >
            {loading ? (
              <>
                <Spinner className="size-4" />
                Authenticating...
              </>
            ) : (
              <>
                <Fingerprint className="size-4" />
                Login with Passkey
              </>
            )}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="link">
            <Link href="/setup">First time? Set up your system</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
