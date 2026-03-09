# Discord Bot Contract: Agent Communication

**Date**: 2026-03-07 | **Branch**: `001-agent-orchestrator`

## Overview

The Discord bot (discord.js) provides two-way conversational communication between the operator and running agents. Agents behave as chat participants.

## Slash Commands (Operator → System)

| Command | Description |
|---------|-------------|
| `/status` | Show all running agents with status summary |
| `/agent <id> status` | Detailed status for specific agent |
| `/agent <id> pause` | Pause agent |
| `/agent <id> resume` | Resume agent |
| `/agent <id> terminate` | Terminate agent |
| `/agent <id> resteer <directive>` | Send resteering directive |
| `/budget <id>` | Show agent budget usage |
| `/approve <request-id>` | Approve pending approval request |
| `/deny <request-id> [reason]` | Deny pending approval request |
| `/spawn <definition> <goal>` | Spawn a new agent |

## Bot Messages (System → Operator)

### Agent Updates
- Agent spawned/terminated notifications
- Task progress milestones
- Stage transitions in pipelines

### Approval Requests (Interactive Buttons)
```text
🔔 Agent "market-researcher" requests approval:
Action: Create email account on Gmail
Justification: Need email for service registrations

[✅ Approve] [❌ Deny] [ℹ️ Details]
```

### Alerts
- Budget threshold breaches
- Security events (exfiltration attempts, integrity drift)
- Agent failures requiring attention

### Agent Conversations
- Agents send questions/updates as chat messages in designated channels
- Operator replies are routed back to the agent via Redis
- One channel per top-level workflow or agent group

## Channel Structure

```text
#orchestrator       — System-wide notifications and alerts
#approvals          — All approval requests with interactive buttons
#agent-{name}       — Per-agent or per-workflow conversation channels
```

## Message Routing

```text
Operator types in Discord
  → discord.js bot receives message
  → Bot publishes to agent:{id}:inbox via Redis Stream
  → Agent receives and processes

Agent sends update via Redis Stream
  → Orchestrator receives on orchestrator:inbox
  → Orchestrator routes to Discord bot service
  → Bot posts message in appropriate channel
```
