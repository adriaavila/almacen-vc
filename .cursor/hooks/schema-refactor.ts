import { readFileSync, existsSync } from "fs";

interface StopHookInput {
  conversation_id: string;
  status: "completed" | "aborted" | "error";
  loop_count: number;
}

const input: StopHookInput = await Bun.stdin.json();
const MAX_ITERATIONS = 10;

if (input.status !== "completed" || input.loop_count >= MAX_ITERATIONS) {
  console.log(JSON.stringify({}));
  process.exit(0);
}

const scratchpad = existsSync(".cursor/scratchpad.md")
  ? readFileSync(".cursor/scratchpad.md", "utf-8")
  : "";

if (scratchpad.includes("## DONE") && scratchpad.split("## DONE")[1].includes("DONE")) {
  console.log(JSON.stringify({}));
} else {
  // Find next incomplete phase
  const phases = [
    "PHASE_1_SCHEMA",
    "PHASE_2_CONVEX_DEV", 
    "PHASE_3_MIGRATION",
    "PHASE_4_PRODUCTS",
    "PHASE_5_INVENTORY",
    "PHASE_6_MOVEMENTS",
    "PHASE_7_RUN_MIGRATION",
    "PHASE_8_VERIFY"
  ];
  
  const currentPhase = phases.find(p => scratchpad.includes(`- [ ] ${p}`)) || "UNKNOWN";
  
  console.log(JSON.stringify({
    followup_message: `[Iteration ${input.loop_count + 1}/${MAX_ITERATIONS}] Continue with ${currentPhase}. Mark phases complete with [x] in scratchpad. Write DONE in ## DONE section when all phases complete.`
  }));
}
