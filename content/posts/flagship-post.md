---
title: "AI assistants dissolve the pro-code/low-code divide in Power Platform"
description: "A local MCP server that reads the entire automation graph of a Dataverse table — plug-ins, cloud flows, classic workflows, business rules — in one call. The demo is the argument."
date: 2026-07-11
draft: true
tags: [dataverse, power-platform, mcp, claude, low-code, pro-code]
---

> **Status: draft for review.** This is a talk narrative and a blog post in one
> file. See the pre-publish checklist at the bottom before posting anywhere — in
> particular, the npm package has to be published first for the install line to
> work, and the "run it yourself" numbers need one real org behind them.

## The moment that started this

Every Power Platform team eventually hits the same wall. Something writes to the
`account` table when a record is created, and nobody can say what. Is it a
plug-in? A cloud flow? A classic workflow somebody built in 2019? A business
rule? A Power Automate flow triggered by a connection reference that left the
building with its owner?

The answer lives in four different places, behind three different UIs, in two
different maker portals. A pro-code developer knows the plug-in registration
tool. A low-code maker knows the flow designer. Neither can see the other half.
So the real behavior of a single table — the thing the business actually cares
about — is knowable by nobody, in one view, ever.

That gap between pro-code and low-code isn't a skills gap. It's a **tooling**
gap. And it turns out an AI assistant with the right tools closes it in one
sentence.

## What I built

**[Dataverse Ops MCP](https://github.com/sss-dclemente/dataverse-mcp-pro)** is
an open-source ([MIT](https://opensource.org/license/mit)) [Model Context
Protocol](https://modelcontextprotocol.io) server for Dataverse diagnostics. It
runs locally over stdio inside your MCP host (Claude Desktop, Claude Code, …),
talks to the Dataverse Web API v9.2 with your own credentials, and never sends
your data anywhere but your own tenant. No hosted service, no telemetry, no
license key. Twenty tools, all free.

Most of the tools do one honest job each: pull failed plug-in traces, group
stuck async jobs by error, explain an import failure, document a cloud flow,
report on its last runs. Useful, unglamorous plumbing.

But one tool is the whole thesis.

## `what_runs_on_table`

Ask your assistant:

> **What runs on the `account` table?**

`what_runs_on_table` queries Dataverse for *every* automation bound to that
entity and returns it as one structured graph:

- **Plug-in steps** — registered SDK message processing steps, with stage,
  mode, and filtering attributes.
- **Cloud flows** — Power Automate flows (workflow category 5) triggered by the
  table, with their trigger message and state.
- **Classic workflows** — the 2019 stuff (category 0), still firing.
- **Business rules** (category 2) and **BPFs** (category 4) scoped to the table.

Pro-code and low-code, side by side, in a single answer. The maker sees the
plug-ins they never had access to. The developer sees the flows they didn't know
existed. And the AI assistant reads all of it natively, because to the model
it's just structured data — the pro-code/low-code distinction was never real to
it in the first place. That distinction is an artifact of *our* tools, and it
dissolves the moment a single tool can read both.

Then the follow-ups write themselves:

> **Are any of these stepping on each other?**

`detect_automation_loops` walks that same graph looking for a plug-in whose
write re-triggers a flow whose write re-triggers the plug-in — the cascade
nobody drew on a whiteboard.

> **Which of these is a modernization risk?**

`modernization_report` flags the classic workflows and the connection references
bound to a single owner, the two things that turn into a 2 a.m. incident.

## Why an MCP server and not a script

I could have written this as a PowerShell module. People have. The difference is
what happens *after* the data comes back.

A script hands you a table and stops. An MCP tool hands the model structured
data the model can reason over, cross-reference, and explain in the same breath
you asked the question. "What runs on `account`, and which of it would break if
we deprecated the classic workflow engine?" is one conversation, not a script
plus a spreadsheet plus a meeting.

The MCP server is deliberately thin: it maps Dataverse's Web API into clean
structured JSON and gets out of the way. The intelligence isn't in the server.
It's in the model, and the server's whole job is to give the model eyes.

## The bet

I'm not selling this. It's MIT, every tool is free, and the licensing service I
built for it earlier is now just a reference project sitting in another repo.
The bet is that the most valuable thing I can build here isn't a product — it's
the clearest possible demonstration that **the pro-code/low-code divide is a
tooling accident, and AI tooling is what erases it.** That demonstration is
worth more as a talk, a repo, and a conversation than as a paywall.

If that thesis is right, the demo above is the mic drop: one question, one view,
the whole automation graph of a table that no single human in the org could see
before.

Try it, break it, tell me where it's wrong:
**[github.com/sss-dclemente/dataverse-mcp-pro](https://github.com/sss-dclemente/dataverse-mcp-pro)**

---

### Pre-publish checklist (remove this section before posting)

- [ ] **Publish the npm package first.** `@simplesmoothsafe/dataverse-ops-mcp`
      is not on npm yet, so any `npx -y @simplesmoothsafe/dataverse-ops-mcp`
      instruction won't work until you `npm publish`. Until then this post links
      to the repo only — keep it that way, or publish and add the install line.
- [ ] **Run `what_runs_on_table` against one real org and screen-record it.**
      The post claims the graph view works end to end; I've only exercised it
      against fixtures. Get one honest GIF before this goes out — the demo *is*
      the argument, so it has to be real.
- [ ] Soften or cut any number you can't back with that real run.
- [ ] Pick a home for it (dev.to / your blog / LinkedIn article) and set
      `draft: false`.
