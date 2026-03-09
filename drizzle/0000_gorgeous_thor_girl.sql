CREATE TABLE "agent_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"mission" text NOT NULL,
	"model_provider" varchar(50) NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"default_budget" numeric(12, 2) NOT NULL,
	"capabilities" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tools" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval_policies" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retry_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"heartbeat_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "agent_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"memory_type" varchar(20) NOT NULL,
	"tags" text[],
	"source_session_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL,
	"consolidated_into" uuid
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"definition_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'spawning' NOT NULL,
	"sandbox_id" varchar(255),
	"model_provider" varchar(50) NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"current_task" text,
	"budget_total" numeric(12, 2) NOT NULL,
	"budget_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"budget_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"config_checksum" varchar(64),
	"heartbeat_at" timestamp,
	"spawn_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid NOT NULL,
	"agent_id" uuid,
	"severity" varchar(20) NOT NULL,
	"message" text NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"condition" jsonb NOT NULL,
	"severity" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"notify_discord" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"action_type" varchar(100) NOT NULL,
	"outcome" varchar(20) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"security_event" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid,
	"current_goal" text NOT NULL,
	"progress_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"decision_log" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pending_actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"working_artifacts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"handoff_prompt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"venture_id" uuid,
	"type" varchar(30) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"external_ref" varchar(255),
	"pre_auth_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"identity_type" varchar(20) NOT NULL,
	"provider" varchar(100) NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"credentials_secret_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "llm_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid,
	"model_provider" varchar(50) NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_create_tokens" integer DEFAULT 0 NOT NULL,
	"computed_cost_usd" numeric(10, 6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"credential_id" "bytea" NOT NULL,
	"public_key" "bytea" NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operator_credentials_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"goal" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_stage" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"budget_total" numeric(12, 2) NOT NULL,
	"budget_spent" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lead_agent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"secret_type" varchar(20) NOT NULL,
	"encrypted_value" "bytea" NOT NULL,
	"allowed_agents" uuid[],
	"allowed_domains" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "secrets_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "shared_knowledge" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536),
	"entry_type" varchar(30) NOT NULL,
	"tags" text[],
	"category" varchar(100) NOT NULL,
	"contributing_agent_id" uuid,
	"importance_score" real DEFAULT 0.5 NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"trigger_condition" text NOT NULL,
	"inputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outputs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"success_criteria" text NOT NULL,
	"failure_criteria" text NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"authoring_agent_id" uuid,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"invocation_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"knowledge_entry_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"setup_complete" boolean DEFAULT false NOT NULL,
	"heartbeat_interval_ms" integer DEFAULT 1800000 NOT NULL,
	"active_hours" jsonb DEFAULT '{"start":"06:00","end":"22:00","timezone":"UTC"}'::jsonb NOT NULL,
	"revenue_split_operator" real DEFAULT 0.2 NOT NULL,
	"revenue_split_reinvest" real DEFAULT 0.8 NOT NULL,
	"backup_retention_days" integer DEFAULT 90 NOT NULL,
	"discord_webhook_url" text,
	"discord_bot_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_memories" ADD CONSTRAINT "agent_memories_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_definition_id_agent_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."agent_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_events" ADD CONSTRAINT "alert_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_lead_agent_id_agents_id_fk" FOREIGN KEY ("lead_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_knowledge" ADD CONSTRAINT "shared_knowledge_contributing_agent_id_agents_id_fk" FOREIGN KEY ("contributing_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_authoring_agent_id_agents_id_fk" FOREIGN KEY ("authoring_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_knowledge_entry_id_shared_knowledge_id_fk" FOREIGN KEY ("knowledge_entry_id") REFERENCES "public"."shared_knowledge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_memories_agent_id_idx" ON "agent_memories" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_memories_importance_idx" ON "agent_memories" USING btree ("agent_id","importance_score");--> statement-breakpoint
CREATE INDEX "agent_sessions_agent_id_idx" ON "agent_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agents_parent_id_idx" ON "agents" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "agents_status_idx" ON "agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agents_definition_id_idx" ON "agents" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "alert_events_rule_id_idx" ON "alert_events" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "alert_events_created_idx" ON "alert_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_log_agent_id_idx" ON "audit_log" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_log_security_idx" ON "audit_log" USING btree ("security_event");--> statement-breakpoint
CREATE INDEX "checkpoints_agent_id_idx" ON "checkpoints" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "financial_tx_agent_id_idx" ON "financial_transactions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "financial_tx_type_idx" ON "financial_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "financial_tx_created_idx" ON "financial_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "identities_agent_id_idx" ON "identities" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "llm_usage_agent_id_idx" ON "llm_usage_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "llm_usage_created_idx" ON "llm_usage_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pipelines_status_idx" ON "pipelines" USING btree ("status");--> statement-breakpoint
CREATE INDEX "shared_knowledge_category_idx" ON "shared_knowledge" USING btree ("category");--> statement-breakpoint
CREATE INDEX "skills_status_idx" ON "skills" USING btree ("status");