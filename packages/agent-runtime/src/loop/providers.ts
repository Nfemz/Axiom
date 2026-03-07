import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";

export interface ProviderConfig {
  provider: string; // "anthropic" | "openai" | "google" | "openrouter"
  modelId: string; // e.g. "claude-sonnet-4-20250514"
  apiKey?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModel(config: ProviderConfig): any {
  switch (config.provider) {
    case "anthropic":
      return anthropic(config.modelId);

    case "openai":
      return openai(config.modelId);

    case "google":
      return google(config.modelId);

    case "openrouter": {
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: config.apiKey,
      });
      return openrouter(config.modelId);
    }

    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

const PROVIDER_API_KEY_ENV_VARS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_AI_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export function getProviderApiKeyEnvVar(provider: string): string {
  const envVar = PROVIDER_API_KEY_ENV_VARS[provider];
  if (!envVar) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return envVar;
}
