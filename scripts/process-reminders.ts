import "dotenv/config";
import { processReminders } from "../src/services/scheduler";
import { getPrisma } from "../src/prisma/client";

try {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) throw new Error("SMTP configuration is required.");
  console.log(await processReminders({
    significantlyOverdueDays: Number(process.env.SIGNIFICANTLY_OVERDUE_DAYS),
    contractExpiringSoonDays: Number(process.env.CONTRACT_EXPIRING_SOON_DAYS),
  }));
} catch {
  console.error("Reminder processor failed. Check database, SMTP, and notification threshold configuration.");
  process.exitCode = 1;
} finally { await getPrisma().$disconnect(); }
