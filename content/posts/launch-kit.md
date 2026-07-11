---
title: "Launch kit — short-form blurbs"
description: "Ready-to-paste announcement copy for LinkedIn, Hacker News, Reddit, and X. Review before posting; the tone is deliberately invite-feedback, not victory-lap."
date: 2026-07-11
draft: true
tags: [launch, announcement]
---

> **Status: draft for review.** All copy below is written to *invite early
> feedback*, not to claim a finished product — because it isn't one yet. The npm
> package isn't published and nothing has run against a real org. Do not post
> anything with an `npx` install line or a "download it now" call until both are
> true. Until then, every link points at the GitHub repo.

---

## LinkedIn

Every Power Platform team has the same blind spot: nobody can say what *actually*
runs on a table. Plug-ins live in one tool, cloud flows in another, classic
workflows in a third, business rules in a fourth. The real behavior of `account`
is knowable by nobody, in one view, ever.

I built an open-source (MIT) MCP server that closes that gap. Ask your AI
assistant "what runs on the account table?" and it reads the *entire* automation
graph — plug-in steps, cloud flows, classic workflows, business rules — in one
answer. Pro-code and low-code, side by side, because to the model that
distinction was never real.

It runs locally, uses your own credentials, sends your data nowhere. 20 tools,
all free, no license key.

It's early and I'd genuinely love people to break it and tell me where it's
wrong 👇
🔗 github.com/sss-dclemente/dataverse-mcp-pro

#PowerPlatform #Dataverse #MCP #LowCode

---

## Hacker News (Show HN)

**Title:** Show HN: An MCP server that reads the whole automation graph of a Dataverse table

**Body:**

In Microsoft Dataverse / Power Platform, the automation attached to a single
table is scattered across four subsystems — plug-ins (pro-code C#), cloud flows
(Power Automate), classic workflows, and business rules — each behind its own
UI. Nobody can see all of it in one place, which makes "what happens when this
record is created?" surprisingly hard to answer.

This is an open-source (MIT) Model Context Protocol server that gives an AI
assistant tools to read all of it. The centerpiece tool, `what_runs_on_table`,
returns every automation bound to an entity as one structured graph, so you can
ask "what runs on account, and which of it is a modernization risk?" and get a
real answer. There's also a loop detector (plug-in write re-triggers a flow that
re-triggers the plug-in) and per-flow run diagnostics.

It runs locally over stdio, calls the Dataverse Web API with your own
credentials, and sends data nowhere else — no hosted service, no telemetry, no
license.

Two honest caveats: it's early, and I've exercised the tools against fixtures
more than against production orgs, so I'd value bug reports from anyone with a
real environment. Repo: github.com/sss-dclemente/dataverse-mcp-pro

---

## Reddit — r/PowerPlatform

**Title:** I built a free, open-source tool that shows *everything* running on a Dataverse table in one view (plug-ins + flows + classic workflows + business rules)

**Body:**

You know the problem: something writes to a table on create and you have to
check the plug-in registration tool, *and* the flow designer, *and* the classic
workflow list, *and* business rules to figure out what. Four places, and you're
never sure you caught all of them.

I made an MCP server (works with Claude Desktop / Claude Code) that reads all
four at once. You ask "what runs on the account table?" in plain English and it
comes back with the full list — plug-in steps, cloud flows, classic workflows,
business rules — as one structured answer. There's also a tool that spots
automation loops and one that flags modernization risks (classic workflows,
connection references tied to a single person).

It's MIT-licensed, completely free (no tiers, no key), runs on your machine with
your own credentials, and doesn't send your data anywhere.

Fair warning: it's brand new and I've tested it more against mock data than real
orgs, so if you try it against a real environment I'd really like to hear what
breaks. Repo's here: github.com/sss-dclemente/dataverse-mcp-pro

---

## X / Twitter thread

**1/**
Every Power Platform team has the same blind spot: nobody can say what actually
runs on a table.

Plug-ins, cloud flows, classic workflows, business rules — four subsystems, four
UIs. The real behavior of a table is knowable by nobody, in one view, ever.

So I built the missing view. 🧵

**2/**
It's an open-source (MIT) MCP server for Dataverse diagnostics. Runs locally,
uses your own creds, sends your data nowhere.

The centerpiece tool: ask "what runs on the account table?" and it returns the
*entire* automation graph in one answer.

**3/**
Pro-code plug-ins and low-code flows, side by side — because to an AI model that
distinction was never real. The pro-code/low-code divide is a tooling accident.
Give the model one tool that reads both and it just… dissolves.

**4/**
Follow-ups write themselves:
• "are any of these stepping on each other?" → loop detector
• "which is a modernization risk?" → flags classic workflows + single-owner
  connection references

**5/**
20 tools, all free, no license key. It's early — I've run it more against
fixtures than real orgs, so break it and tell me where it's wrong.

github.com/sss-dclemente/dataverse-mcp-pro

---

### Pre-publish checklist (remove before posting)

- [ ] npm package published, OR no install command anywhere in the copy.
- [ ] At least one real-org run behind the `what_runs_on_table` claim.
- [ ] Post from your own accounts — I won't post on your behalf.
- [ ] Stagger the posts; don't blast all four in the same minute.
