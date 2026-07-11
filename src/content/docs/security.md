---
title: Security
description: Stdio architecture, data residency, and what (little) ever leaves your machine.
---

## Architecture: local stdio, no hosted service

Dataverse Ops MCP is an npm package that your MCP host (Claude Desktop, Claude
Code, ...) spawns as a **local child process** and talks to over **stdio**.

- There is **no hosted service** and the server **opens no network ports**.
- The only network connections the server makes are **outbound** to your own
  Dataverse environment (Web API v9.2) and to Microsoft Entra ID for tokens.
- Access tokens are cached **in memory only** and are never logged or written
  to disk. Secrets are supplied by you via environment variables.

## Data residency

All Dataverse data — trace logs, async job details, import job XML, performance
metrics — is fetched directly from your tenant to your machine and returned to
your MCP host. **It never transits any third-party server of ours.** What your
AI assistant then does with tool results is governed by the assistant you chose
to run.

There are **no exceptions**: the server is free and open source (MIT), makes no
licensing, analytics or telemetry calls of any kind, and never contacts any
server of ours.

## No telemetry by default

The server sends **no telemetry, crash reports, or usage analytics**. There is
no opt-out to configure because there is nothing to opt out of.

(This documentation website uses Cloudflare Web Analytics — cookie-free page
counts on the website only; the MCP server itself phones home to nothing.)

## Credentials

- **Client credentials mode**: `DATAVERSE_URL`, `CLIENT_ID`, `CLIENT_SECRET`,
  `TENANT_ID`. Scope the app user's security role to the read privileges the
  tools need (plug-in trace logs, system jobs, import jobs, step registrations)
  rather than full admin.
- **DefaultAzureCredential fallback**: omit the client secret trio and the
  server uses your ambient Azure identity (Azure CLI login, managed identity,
  etc.) via `@azure/identity`.

Questions or disclosures: [support@simplesmoothsafe.com](mailto:support@simplesmoothsafe.com).
