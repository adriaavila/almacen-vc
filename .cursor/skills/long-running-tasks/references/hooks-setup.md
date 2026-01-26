# Hooks Setup Guide

How to configure Cursor hooks for long-running agent loops (e.g., GrindUntilGreen).

## Overview

Cursor hooks allow scripts to run before or after agent actions. The `stop` hook runs when an agent finishes a loop, enabling "grind until green" patterns: run tests, if fail → continue the loop, if pass → stop.

## Hook I/O Format

**Input (stdin):** JSON object with:
```json
{
  "conversation_id": "string",
  "status": "completed" | "aborted" | "error",
  "loop_count": number
}
```

**Output (stdout):** JSON object (empty to stop, or with followup_message to continue):
```json
{}
```
or
```json
{
  "followup_message": "Continue working. Fix tests and retry."
}
```

## Setup Steps

### 1. Copy the Grind Script

Copy `scripts/grind.ts` from this skill to your project:

```bash
cp .cursor/skills/long-running-tasks/scripts/grind.ts .cursor/hooks/grind.ts
chmod +x .cursor/hooks/grind.ts
```

### 2. Configure hooks.json

Create or update `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "stop": [{ "command": "bun run .cursor/hooks/grind.ts" }]
  }
}
```

**Note:** Requires Bun runtime. If you don't have Bun, you'll need to adapt the script for Node.js or Python.

### 3. Configure Environment Variables (Optional)

Set environment variables to customize behavior:

```bash
export GRIND_MAX_ITERATIONS=10  # Default: 5
export GRIND_TEST_CMD="npm test"  # Default: "npm test"
```

Or set in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "stop": [{
      "command": "bun run .cursor/hooks/grind.ts",
      "env": {
        "GRIND_MAX_ITERATIONS": "10",
        "GRIND_TEST_CMD": "npm test"
      }
    }]
  }
}
```

## How It Works

1. Agent completes a loop (status: "completed")
2. Hook script runs:
   - Reads conversation_id, status, loop_count from stdin
   - If status !== "completed" or loop_count >= MAX_ITERATIONS → return `{}` (stop)
   - Otherwise, run test command (e.g., `npm test`)
   - If tests pass → return `{}` (stop)
   - If tests fail → return `{"followup_message": "..."}` (continue)
3. If followup_message is returned, agent continues with that message
4. Loop repeats until tests pass or max iterations reached

## Use Cases

- **GrindUntilGreen:** Run tests → if fail, fix → retry until pass
- **Iterate on UI:** Compare against design mockup → if mismatch, adjust → retry
- **Any verifiable goal:** Define success criteria → loop until met

## Troubleshooting

**Hook not running:** Check `.cursor/hooks.json` syntax and path to script.

**Tests not found:** Verify `GRIND_TEST_CMD` points to a valid test command.

**Bun not found:** Install Bun or adapt script for your runtime.

**Infinite loops:** Ensure `GRIND_MAX_ITERATIONS` is set appropriately.

## Alternative: Scratchpad Pattern

Instead of running tests, the hook can check a scratchpad file:

```typescript
const scratchpad = existsSync(".cursor/scratchpad.md")
  ? readFileSync(".cursor/scratchpad.md", "utf-8")
  : "";

if (scratchpad.includes("DONE")) {
  console.log(JSON.stringify({}));
} else {
  console.log(JSON.stringify({
    followup_message: "Continue working. Update .cursor/scratchpad.md with DONE when complete."
  }));
}
```

This pattern is useful when success isn't easily testable (e.g., UI matching a design).
