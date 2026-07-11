---
title: "Talk abstract & session outline — 'Dissolving the pro-code/low-code divide'"
description: "CFP-ready abstract, bio, and a 30/45-minute session outline built around a single live demo."
date: 2026-07-11
draft: true
tags: [talk, cfp, speaking]
---

> **Status: draft for review.** CFP-ready copy. Swap in your real bio and social
> links, and rehearse the live demo against a real org before submitting — the
> whole talk rests on that one demo landing.

## Title

**Dissolving the pro-code/low-code divide: what an AI assistant sees that we
can't**

Alternate titles:
- What actually runs on this table? Reading the whole Power Platform automation graph
- The pro-code/low-code divide is a tooling accident (and AI erases it)

## Abstract (≈150 words, for the program)

In Microsoft Dataverse, the automation attached to a single table is scattered
across four subsystems — plug-ins, cloud flows, classic workflows, and business
rules — each behind its own tool, each owned by a different tribe. The result:
nobody in the org can say what actually happens when a record is created. That
gap isn't a skills gap between pro-code developers and low-code makers. It's a
tooling gap.

In this talk I'll show that gap closing in real time. Using an open-source MCP
server and an AI assistant, I ask one plain-English question — "what runs on this
table?" — and get the entire automation graph back in one view: plug-ins and
flows and workflows, side by side. Then I let the model reason over it: find the
loops, flag the modernization risks. You'll leave understanding why the
pro-code/low-code divide is an artifact of our tools, and what it means that AI
tooling makes it disappear.

## Shorter abstract (≈50 words, for a lightning slot)

Nobody in your org can say what actually runs on a Dataverse table — plug-ins,
flows, classic workflows, and business rules each hide behind their own tool. I'll
show an AI assistant read the whole automation graph in one question, live, and
explain why the pro-code/low-code divide was a tooling accident all along.

## Audience & level

Power Platform architects, Dataverse developers, and low-code makers.
Intermediate. No AI/ML background required — the point is that you don't need
one.

## Takeaways

1. Why table-level automation is structurally invisible in Power Platform today,
   and the specific subsystems that hide it.
2. How the Model Context Protocol lets an AI assistant read across all of them
   as one graph — with a working, MIT-licensed example you can run locally.
3. A concrete mental model: the pro-code/low-code divide is an artifact of
   tooling, not of the platform, and AI tooling collapses it.

## Session outline — 30 min

- **0:00 – 4:00 — The blind spot.** A record gets created; something writes to
  `account`. Four places to look, four different owners. Nobody sees all of it.
- **4:00 – 8:00 — Why this happens.** A quick tour of the four subsystems and why
  each got its own tool and its own tribe. Frame the thesis: this is a tooling
  gap, not a skills gap.
- **8:00 – 18:00 — The demo (the whole talk).** Live: "what runs on the account
  table?" → the full graph. Then "are any of these stepping on each other?" →
  loop detection. Then "which of these is a modernization risk?" → the report.
  One conversation, no context switch.
- **18:00 – 24:00 — How it works.** MCP over stdio, local, your own creds, no
  hosted service. The server is thin; the intelligence is the model. Why that
  split matters.
- **24:00 – 28:00 — The bigger point.** The divide dissolves because to the model
  it was never real. What that implies for how we staff and tool Power Platform
  teams.
- **28:00 – 30:00 — Q&A / where to get it.** MIT, free, repo link.

## Session outline — 45 min

Same spine, expanded:

- **+ Deep-dive on the data model** (5 min after the demo): how each subsystem is
  represented in Dataverse (workflow categories, SDK message processing steps,
  connection references) and what makes them queryable as one graph.
- **+ Failure-mode gallery** (5 min): the loop that nobody drew, the flow bound
  to a departed employee's connection, the classic workflow still firing —
  walked through live.
- **+ Extended Q&A** (5 min).

## Demo requirements

- A Dataverse environment with a mix of real automation on one table (ideally
  the loop + a classic workflow + a single-owner connection reference, so the
  diagnostic tools have something to find).
- Claude Desktop or Claude Code with the MCP server configured.
- A recorded fallback of the same demo in case conference wifi / the org is
  unreachable.

## Speaker bio (placeholder — replace)

> Duarte Clemente builds open-source tooling for Microsoft Power Platform. He's
> the author of Dataverse Ops MCP, an MIT-licensed diagnostics server that lets
> AI assistants read across the entire Power Platform automation stack.
> _[Add your real one-liner, employer if relevant, and links.]_

---

### Pre-submit checklist (remove before submitting)

- [ ] Real bio + headshot + social links in.
- [ ] Demo rehearsed end-to-end against a real org, recorded fallback captured.
- [ ] Pick target CFPs (Power Platform community conferences, local user groups,
      MCP/AI-tooling tracks) and tailor the title per event.
