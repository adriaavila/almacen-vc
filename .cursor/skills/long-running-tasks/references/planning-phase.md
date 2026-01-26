# Planning Phase Checklist

Mandatory planning phase for long-running tasks. Planning is the foundation — skip at your peril.

## Step 1: Enter Plan Mode

**In Cursor:**
- Press `Shift+Tab` in the agent input to toggle Plan Mode, OR
- Prompt: "Enter Plan Mode"

**What happens:**
- Agent researches codebase to find relevant files
- Agent asks clarifying questions about requirements
- Agent creates a detailed implementation plan
- Agent waits for approval before building

## Step 2: Explore and Understand

**Agent should:**
- Use `@codebase` or semantic search to explore the codebase
- Understand existing patterns and architecture
- Identify relevant files, dependencies, and integration points
- Ask clarifying questions if requirements are ambiguous

**User should:**
- Provide context about the task
- Answer clarifying questions
- Point to relevant examples or constraints

## Step 3: Generate Hierarchical Plan

The plan must include:

### High-Level Architecture
- System design overview
- Component relationships
- Data flow
- Integration points

### Task Breakdown
- Decompose into 100s of atomic subtasks if needed
- Each subtask should be:
  - Independently verifiable
  - Small enough to complete in one focused session
  - Clear in scope

### Dependencies and Order
- Map task dependencies
- Establish execution order
- Identify parallelizable work
- Note critical path items

### Acceptance Criteria per Task
- How to verify completion
- Test cases or checkpoints
- Success criteria
- Edge cases to handle

## Step 4: Review and Refine

**Review the plan:**
- Check completeness (all requirements covered?)
- Verify task granularity (not too large, not too small)
- Validate dependencies (order makes sense?)
- Confirm acceptance criteria (verifiable?)

**Refine if needed:**
- Remove unnecessary steps
- Adjust approach based on feedback
- Add context the agent missed
- Clarify ambiguous requirements

**Save to workspace:**
- Click "Save to workspace" to store in `.cursor/plans/`
- Creates documentation for your team
- Makes it easy to resume interrupted work
- Provides context for future agents

## Step 5: Approve and Execute

**Once satisfied:**
- Approve the plan
- Agent proceeds to execution phase
- Plan becomes the source of truth (`plan.md`)

**If not satisfied:**
- Refine the plan further
- Ask for clarification
- Do not approve until ready

## Common Pitfalls

**Skipping planning:** Leads to drift, incomplete work, wasted iterations.

**Too vague:** Plans without atomic subtasks are hard to execute and verify.

**Too rigid:** Plans that don't allow for discovery can't adapt to reality.

**No acceptance criteria:** Without clear success criteria, completion is ambiguous.

## Starting Over from a Plan

If execution doesn't match expectations:
1. Revert the changes
2. Refine the plan to be more specific
3. Run the plan again

This is often faster than fixing an in-progress agent and produces cleaner results.
