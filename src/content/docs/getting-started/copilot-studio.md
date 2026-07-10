---
title: Copilot Studio
description: Connect Dataverse Ops MCP to Microsoft Copilot Studio as a custom MCP server.
sidebar:
  order: 3
---

:::note
Copilot Studio's MCP support is evolving; the exact menu names and requirements
below may differ slightly from the current Copilot Studio release. Treat this
page as orientation and check Microsoft's documentation for the authoritative
steps.
:::

## How this differs from Claude Desktop / Claude Code

Dataverse Ops MCP is a **stdio** server: it is spawned as a local child process
by the MCP host. Copilot Studio is a cloud service and connects to MCP servers
over **HTTP (Streamable HTTP transport)** through a connector. That means
Copilot Studio cannot launch the npm package directly — you need to expose the
server over HTTP yourself.

## Prerequisites

- A Copilot Studio agent and permissions to add tools/connectors in your
  Power Platform environment.
- A host you control (VM, container, or internal service) that can run Node 20+
  and is reachable from Power Platform over HTTPS.
- The same Dataverse credentials as any other setup (`DATAVERSE_URL` plus
  client credentials or a managed identity).

## Approach: bridge stdio to Streamable HTTP

Run the server behind a stdio-to-HTTP MCP gateway on infrastructure you control.
Generic example using a community proxy (pick whichever bridge your org
prefers):

```sh
# On your host: expose the stdio server as a Streamable HTTP MCP endpoint
DATAVERSE_URL=https://yourorg.crm.dynamics.com \
CLIENT_ID=... CLIENT_SECRET=... TENANT_ID=... \
npx -y mcp-proxy --port 8808 -- npx -y @simplesmoothsafe/dataverse-ops-mcp
```

Then in Copilot Studio:

1. Open your agent, go to **Tools** (or **Actions**) and choose **Add a tool**.
2. Select **Model Context Protocol** and provide your HTTPS endpoint URL
   (e.g. `https://mcp.yourcompany.example/mcp`).
3. Configure authentication on the connector according to your gateway's setup
   (Copilot Studio connects through a custom connector under the hood).
4. Add the discovered tools (`ping`, `get_plugin_traces`, ...) to the agent and
   publish.

## First call

In the Copilot Studio test pane, ask the agent:

> Check the Dataverse ops server is reachable (ping), then list plug-in trace
> failures from the last day.

The agent should invoke `ping` and then `get_plugin_traces` via the connector.

## Troubleshooting

- **Tools don't appear after adding the server** — verify the endpoint speaks
  Streamable HTTP (not SSE-only or stdio) and is reachable from Power Platform;
  test it first with MCP Inspector against the public URL.
- **Auth loops on the connector** — connector-level auth (to your gateway) is
  separate from the server's Dataverse credentials, which stay in the gateway
  host's environment variables. Never put Dataverse secrets in the connector.
- **Data residency** — with this topology, tool *results* (summarized
  diagnostics) transit your gateway and Copilot Studio. If strict tenant-only
  residency matters, prefer the local stdio setups on
  [Claude Desktop](/getting-started/claude-desktop/) or
  [Claude Code](/getting-started/claude-code/); see [Security](/security/).
