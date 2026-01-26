# Long-Run Prompt Patterns

Canonical prompt template for long-horizon tasks that require persistence and strict plan adherence.

## Core Prompt Template

Use this prompt block when initiating a long-running task:

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

## Persistence Files

### plan.md

**Purpose:** Living document containing the hierarchical plan.

**Structure:**
- High-level architecture
- Task breakdown (atomic subtasks)
- Dependencies and execution order
- Acceptance criteria/tests per task

**When to update:**
- Only when the plan intentionally changes (new requirements, discovered blockers)
- Do not update for progress tracking (use progress_log.md)

**Template:** See `assets/plan-template.md`

### progress_log.md

**Purpose:** Append-only log of agent decisions, status, and next steps.

**Structure:**
- Timestamp
- Task/subtask identifier
- Status (completed, in-progress, blocked, escalated)
- Next steps or blockers

**When to update:**
- After each subtask completion
- When encountering blockers
- When escalating or asking for user input
- After test runs (pass/fail status)

**Template:** See `assets/progress_log-template.md`

### todo.md (or task-queue file)

**Purpose:** Current work queue for active tasks.

**Structure:**
- Unchecked checkboxes for pending tasks
- Checked boxes for completed tasks
- Priority indicators (optional)
- Subtask breakdown

**When to update:**
- At start of execution (populate from plan.md)
- After completing each task (check off)
- When new tasks are discovered (add)

**Template:** See `assets/todo-template.md`

## Usage Pattern

1. **Before execution:** Create `plan.md` from template, populate `todo.md` from plan.
2. **During execution:** After each subtask:
   - Commit changes
   - Run test suite
   - Append to `progress_log.md`
   - Update `todo.md` (check off completed)
3. **On blockers:** Log to `progress_log.md`, escalate if >3 attempts.
4. **On completion:** Final entry in `progress_log.md` marking 100% completion.
