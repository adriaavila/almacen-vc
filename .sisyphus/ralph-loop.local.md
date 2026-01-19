---
active: true
iteration: 1
max_iterations: 100
completion_promise: "DONE"
started_at: "2026-01-19T15:56:16.494Z"
session_id: "ses_42907613fffeKCSXozEPJZFevf"
---
We are building the almacen-vc internal inventory and order management system in this repository.

This project has a strict task-driven workflow.

FIRST:
- Read `activity.md` to understand current progress and what was last completed.
- Do NOT assume anything is done unless explicitly logged in `activity.md`.

LOCAL SETUP:
- Start the app locally and keep it localhost-only.
- Use one of the following depending on the stack:
  - `npm run dev` (for Next.js )

TASK SELECTION:
- Open `plan.md`.
- Identify the single highest-priority task whose Status is marked as failing.
- Work on EXACTLY ONE task at a time.

IMPLEMENTATION RULES:
- Implement only what is required to satisfy the acceptance criteria of the selected task.
- Do NOT refactor unrelated code.
- Do NOT add new features beyond the task scope.
- Prefer simple, explicit solutions over abstractions.

VERIFICATION:
- Run available checks:
  - `npm run lint` (if present)
  - `npm run typecheck` (if present)
  - `npm run build` (if present)
- Reload the app in Chrome.
- Manually verify all task steps listed in `plan.md` for this task.
- Check the browser console for errors.

LOGGING (MANDATORY):
- Append a dated entry to `activity.md` using the required format:
  - Task completed
  - Steps verified
  - Files created or modified
  - Commands executed
  - What was verified in Chrome
  - Blockers (or "None")

STATUS UPDATE:
- After verification, update the task Status in `plan.md` from failing to passing.
- Do NOT update any other task statuses.

VERSION CONTROL:
- Make exactly ONE git commit for this task.
- Commit message must be a single clear line describing the task.
- Do NOT run `git init`.
- Do NOT change git remotes.
- Do NOT push.

LOOP BEHAVIOR (RALPH):
- Repeat the process:
  1. Re-read `activity.md`
  2. Select the next failing task in `plan.md`
  3. Implement, verify, log, commit
- Stop immediately if a blocker prevents task completion and log it.

COMPLETION CONDITION:
- When ALL tasks in `plan.md` are marked as passing:
  - Output EXACTLY the word: COMPLETE.

CONSTRAINTS:
- Max iterations: 20
- One task per iteration
- No parallel work
- No skipped logging
