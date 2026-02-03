import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekly Low Stock Report
// Mondays at 8:00 AM VET (Venezuela Time is UTC-4)
// Cron uses UTC. 8:00 AM VET + 4 hours = 12:00 PM UTC.
crons.weekly(
    "Weekly Low Stock Report",
    { hourUTC: 12, minuteUTC: 0, dayOfWeek: "monday" },
    internal.telegram.sendWeeklyLowStockReport,
);

export default crons;
