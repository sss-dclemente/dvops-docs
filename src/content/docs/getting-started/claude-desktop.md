---
title: Claude Desktop
description: Run Dataverse Ops MCP inside Claude Desktop over stdio.
sidebar:
  order: 1
---

## Prerequisites

- **Node.js 20+** on your machine (`node --version`).
- A **Dataverse environment URL**, e.g. `https://yourorg.crm.dynamics.com`.
- Credentials, either of:
  - An **Entra ID app registration** with a client secret and an application
    user in your Dataverse environment (recommended for unattended use), or
  - A locally signed-in identity that `DefaultAzureCredential` can pick up
    (e.g. `az login`) — in that case omit the `CLIENT_ID`/`CLIENT_SECRET`/`TENANT_ID` variables.
- Claude Desktop installed.

## Configuration

Edit your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server under `mcpServers`:

```json
{
  "mcpServers": {
    "dataverse-ops": {
      "command": "npx",
      "args": ["-y", "@simplesmoothsafe/dataverse-ops-mcp"],
      "env": {
        "DATAVERSE_URL": "https://yourorg.crm.dynamics.com",
        "CLIENT_ID": "<app-registration-client-id>",
        "CLIENT_SECRET": "<client-secret>",
        "TENANT_ID": "<entra-tenant-id>"
      }
    }
  }
}
```

Restart Claude Desktop. The server runs locally over stdio — nothing is hosted
and no ports are opened.

To unlock the pro tools, add `"LICENSE_KEY": "<your-key>"` to the `env` block.

## First call

Ask Claude:

> Use the `ping` tool from dataverse-ops.

You should get `{ "ok": true }` back without any Dataverse call. Then try a real
diagnostic:

> Which plug-ins failed in my Dataverse org in the last 24 hours?

Claude will call `get_plugin_traces` and summarize the failing plug-in types and
exception excerpts.

## Troubleshooting

- **Server does not appear in Claude Desktop** — make sure `npx` is on the PATH
  Claude Desktop sees (on macOS, GUI apps may not inherit your shell PATH; use an
  absolute path to `npx` in `command` if needed), then check the MCP logs in
  Claude Desktop's developer settings.
- **403 errors from tools** — the connecting principal is missing a privilege
  (for traces: `prvReadPluginTraceLog`). Each tool's error includes a `hint` and
  a `docsUrl`; see the individual [tool pages](/tools/get_plugin_traces/).
- **Empty trace results** — plug-in trace logging may be disabled in the org
  (Settings → Administration → System Settings → Customization).
