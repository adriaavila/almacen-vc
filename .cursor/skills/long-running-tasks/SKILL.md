---
name: long-running-tasks
description: Orchestrate long-horizon, multi-step tasks at project/repo level with mandatory planning, decompose-and-delegate patterns, grind loops, and persistence files. Use when users request long-running or multi-day tasks, "execute the plan", "grind until green", run agents for hours/days, orchestrate sub-agents or worktrees, set up grind/retry loops, or create/maintain plan.md / progress_log.md / todo.md-style persistence. "Global level" means project/repo-wide orchestration, not single-file work.
---

# Long-Running Tasks

Guide for orchestrating long-horizon, multi-step tasks that require persistence, coordination, and iterative execution until completion.

## Overview

Long-running tasks require a plan-first approach where coordination happens through shared plans rather than heavy inter-agent chat. Planning is mandatory—skip at your peril. Use strong models for long persistence (GPT-5.2 family variants or Claude Opus 4.5 / similar) when available for best long-run coherence.

## Planning Phase (Mandatory)

Start with Plan Mode. Press `Shift+Tab` in the agent input or prompt "Enter Plan Mode". The agent will:

1. Research the codebase to find relevant files
2. Ask clarifying questions about requirements
3. Create a detailed implementation plan with:
   - High-level architecture
   - Task breakdown (100s of atomic subtasks if needed)
   - Dependencies and execution order
   - Acceptance criteria/tests per task
4. Wait for approval before building

Review and refine the plan. Remove unnecessary steps, adjust the approach, or add context the agent missed. Click "Save to workspace" to store plans in `.cursor/plans/` for documentation and resumability.

**Reference:** [planning-phase.md](references/planning-phase.md) for the complete checklist.

## Decompose and Delegate

Once the plan is approved, tell the main agent: "Execute the plan using sub-agents / workers. Spawn specialized agents for each major category."

Cursor auto-manages parallel git worktrees. Run multiple agents simultaneously on different subtasks without conflicts. Workers are narrow: one task end-to-end → code, test, commit/push to branch/worktree.

No direct worker-to-worker chat—avoids bottlenecks and drift. The main orchestrator/planner coordinates cycles. Optionally, a Judge/Verifier agent runs periodically to check progress, run tests/linters, and decide continue/abort/fix.

## Grind Mode and Long-Running Loops

Use Skills + hooks for persistence. Create a hook that keeps an agent working until a goal is achieved (e.g., all tests pass, UI matches design mockup).

**Script:** [scripts/grind.ts](scripts/grind.ts) — GrindUntilGreen pattern: runs tests → if fail, analyze → fix → retry until pass or max iterations.

**Setup:** [references/hooks-setup.md](references/hooks-setup.md) — Configure `.cursor/hooks.json` to wire the stop hook.

The hook triggers when an agent finishes a loop. It reads status and loop_count from stdin, runs tests (or checks a scratchpad), and returns `{"followup_message": "..."}` to continue the loop, or `{}` to stop.

## Prompt Pattern for Long Persistence

Use this canonical prompt block when initiating a long-running task:

```
This is a long-horizon task — potentially hours/days.
Follow the plan in plan.md strictly.
Work in small, verifiable steps.
After each subtask: commit to worktree branch, run full test suite, log status to progress_log.md.
If stuck >3 attempts: ask for user input or escalate to planner.
Never shortcut or yield early — push until 100% complete per plan.
Use GPT-5.2 for best long-run coherence (or Claude Opus 4.5 / similar if GPT-5.2 unavailable).
Begin execution now.
```

**Reference:** [long-run-prompt-patterns.md](references/long-run-prompt-patterns.md) for the exact template and persistence file usage.

## Persistence Files

Maintain external memory files that become the source of truth:

- **plan.md** — Living document containing the hierarchical plan. Update only when the plan intentionally changes (new requirements, discovered blockers). Do not update for progress tracking.

- **progress_log.md** / **agent_decisions.md** — Append-only log of status, decisions, and next steps. Update after each subtask, when encountering blockers, or when escalating.

- **todo.md** (or task-queue file) — Current work queue. Populate from plan.md at start, check off tasks as completed, add new tasks discovered during execution.

**Templates:** [assets/plan-template.md](assets/plan-template.md), [assets/progress_log-template.md](assets/progress_log-template.md), [assets/todo-template.md](assets/todo-template.md)

## Parallelism and Multi-Instance

Cursor makes it easy to run many agents in parallel without interference. Use git worktrees (Cursor auto-creates/manages) for parallel Cursor instances. Each agent runs in its own worktree with isolated files and changes.

Run the same prompt across multiple models simultaneously (e.g., GPT-5.2 + Gemini experimental) → pick the best result. This is especially useful for hard problems where different models might take different approaches.

Delegate to cloud agents via Slack ("@Cursor do X") for non-blocking parts. Cloud agents run in remote sandboxes, so you can close your laptop and check results later.

## Review and Safety

Watch the agent work. The diff view shows changes as they happen. If you see the agent heading in the wrong direction, press **Escape** to interrupt and redirect.

After the agent finishes, click **Review** → **Find Issues** to run a dedicated review pass. For all local changes, open the Source Control tab and run Agent Review to compare against your main branch.

Push to source control to get automated reviews on pull requests. Bugbot applies advanced analysis to catch issues early.

For significant changes, ask the agent to generate architecture diagrams. Try prompting: "Create a Mermaid diagram showing the data flow for [system], including [components]."

If the agent stalls or seems confused, start a fresh conversation. Use `@Past Chats` to reference previous work rather than copy-pasting the whole conversation.

## Resources

### Scripts

- **grind.ts** — GrindUntilGreen stop hook script. Runs tests; if fail, returns followup_message to continue the loop until pass or max iterations. Copy to `.cursor/hooks/grind.ts` and wire in `.cursor/hooks.json`. See [references/hooks-setup.md](references/hooks-setup.md) for setup.

### References

- **long-run-prompt-patterns.md** — Canonical long-horizon prompt template and persistence file usage patterns. Load when crafting the initial prompt for a long-running task.

- **planning-phase.md** — Mandatory planning checklist: Plan Mode usage, hierarchical plan structure, review/refine process. Load when entering the planning phase.

- **hooks-setup.md** — How to configure `.cursor/hooks.json` for stop hooks, hook I/O format, troubleshooting. Load when setting up grind loops.

### Assets

- **plan-template.md** — Template for high-level architecture, task breakdown, dependencies, acceptance criteria. Use to seed `plan.md` at start of execution.

- **progress_log-template.md** — Template for append-only log format (timestamp, task, status, next steps). Use to seed `progress_log.md` at start of execution.

- **todo-template.md** — Template for task-queue format (unchecked checkboxes, priority). Use to seed `todo.md` at start of execution.
