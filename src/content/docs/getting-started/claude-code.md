---
title: Claude Code
description: Add Dataverse Ops MCP to Claude Code with one command.
sidebar:
  order: 2
---

## Prerequisites

- **Node.js 20+** and the **Claude Code** CLI installed.
- A **Dataverse environment URL** plus either an Entra ID app registration
  (client id/secret/tenant) or a local Azure identity (`az login`) for the
  `DefaultAzureCredential` fallback.

## Add the server

From your project directory:

```sh
claude mcp add dataverse-ops \
  -e DATAVERSE_URL=https://yourorg.crm.dynamics.com \
  -e CLIENT_ID=<app-registration-client-id> \
  -e CLIENT_SECRET=<client-secret> \
  -e TENANT_ID=<entra-tenant-id> \
  -- npx -y @simplesmoothsafe/dataverse-ops-mcp
```

Using `DefaultAzureCredential` instead? Drop the three credential variables and
keep only `DATAVERSE_URL`. Add `-e LICENSE_KEY=<your-key>` to unlock pro tools.

Use `--scope user` if you want the server available in every project, and
`claude mcp list` to confirm it registered.

## First call

Start `claude` and ask:

> Ping the dataverse-ops server.

Then something useful:

> Show failed async jobs from the last 24 hours and group them by error.

Claude Code will call `get_failed_async_jobs` and return the grouped summary.

## Troubleshooting

- **`claude mcp list` shows the server as failed** — run
  `npx -y @simplesmoothsafe/dataverse-ops-mcp` in a terminal with the same env
  vars to see the startup error directly (it prints to stderr; stdout is
  reserved for the MCP protocol).
- **Secrets in shell history** — prefer putting the `-e` values in your
  project's `.mcp.json` via `claude mcp add --scope project` and reference
  environment variables, rather than pasting secrets on the command line.
- **403 / permission errors** — see the `hint` in the tool's error envelope;
  the connecting app user usually needs System Customizer-level read privileges.
