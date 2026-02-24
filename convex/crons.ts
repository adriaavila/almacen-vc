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

// Daily Cafetin RAW Export to n8n
// Every day at 3:00 PM VET (Venezuela Time is UTC-4)
// Cron uses UTC. 3:00 PM VET + 4 hours = 7:00 PM (19:00) UTC.
crons.daily(
    "Daily Cafetin RAW Export",
    { hourUTC: 19, minuteUTC: 0 },
    internal.billing.sendDailyRawData,
);

export default crons;
