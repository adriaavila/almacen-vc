#!/usr/bin/env -S bun run
/**
 * GrindUntilGreen stop hook — run tests; if fail, return followup_message to
 * continue the loop until pass or max iterations.
 *
 * Config: GRIND_MAX_ITERATIONS (default 5), GRIND_TEST_CMD (default "npm test").
 * Copy to .cursor/hooks/grind.ts and wire in .cursor/hooks.json (stop hook).
 */

interface StopHookInput {
  conversation_id: string;
  status: "completed" | "aborted" | "error";
  loop_count: number;
}

const input: StopHookInput = await Bun.stdin.json();
const MAX_ITERATIONS = parseInt(process.env.GRIND_MAX_ITERATIONS ?? "5", 10);
const TEST_CMD = process.env.GRIND_TEST_CMD ?? "npm test";

if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

const proc = Bun.spawn(TEST_CMD.split(" "), {
  cwd: process.cwd(),
  stdout: "pipe",
  stderr: "pipe",
});
const exitCode = await proc.exited;

if (exitCode === 0) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

console.log(
  JSON.stringify({
    followup_message: `[Iteration ${input.loop_count + 1}/${MAX_ITERATIONS}] Tests failed. Analyze failures, fix the code, run \`${TEST_CMD}\` again, then continue. Do not stop until all tests pass or you reach ${MAX_ITERATIONS} iterations.`,
  })
);
