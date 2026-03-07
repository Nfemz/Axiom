import { NextRequest, NextResponse } from "next/server";
import type { SetupWizardState } from "@axiom/shared/schemas/api";

export const dynamic = "force-dynamic";

const STEP_NAMES = ["passkey", "api-keys", "payment", "discord", "test-agent"];

// In-memory setup state (will be persisted to DB later)
let setupState: SetupWizardState = {
  currentStep: 0,
  steps: STEP_NAMES.map((name) => ({ name, completed: false })),
  setupComplete: false,
};

export async function GET() {
  return NextResponse.json(setupState);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const stepIndex = body.step as number | undefined;

  // Mark the current step as completed and advance
  const idx = stepIndex ?? setupState.currentStep;
  if (idx >= 0 && idx < setupState.steps.length) {
    setupState.steps[idx].completed = true;
  }

  // Find next incomplete step
  const nextIncomplete = setupState.steps.findIndex((s) => !s.completed);
  if (nextIncomplete === -1) {
    setupState.currentStep = setupState.steps.length;
    setupState.setupComplete = true;
  } else {
    setupState.currentStep = nextIncomplete;
  }

  return NextResponse.json(setupState);
}
