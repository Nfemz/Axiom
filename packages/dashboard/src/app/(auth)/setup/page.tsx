"use client";

import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { startRegistration } from "@simplewebauthn/browser";
import { AlertCircle, CheckCircle2, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

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

async function requestRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const response = await fetch("/api/auth/register", {
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

async function verifyRegistration(credential: unknown): Promise<void> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step: "verify", response: credential }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }
}

export default function SetupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handlePasskeySetup = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const options = await requestRegistrationOptions();
      const credential = await startRegistration({ optionsJSON: options });
      await verifyRegistration(credential);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }, []);

  if (done) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="size-10 text-success" />
            </div>
            <CardTitle className="font-bold text-2xl tracking-tight">
              Setup Complete
            </CardTitle>
            <CardDescription>
              Your passkey has been registered. You&apos;re ready to go.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" size="lg">
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-bold text-2xl tracking-tight">
            Axiom Setup
          </CardTitle>
          <CardDescription>
            Register a passkey to secure your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            className="w-full"
            disabled={loading}
            onClick={handlePasskeySetup}
            size="lg"
            type="button"
          >
            {loading ? (
              <>
                <Spinner className="size-4" />
                Registering...
              </>
            ) : (
              <>
                <Fingerprint className="size-4" />
                Register Passkey
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
            <Link href="/login">Already set up? Log in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
