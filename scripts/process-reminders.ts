import { services } from "@/services/container";
import config from "../src/config";
import { getPrisma } from "../src/prisma/client";

/**
 * the worker performs one processing run each time it is executed. 
 * A cron job or another external mechanism would be responsible for executing it repeatedly.
 */

try {
  /** The script checks that these two environment variables are present before starting the scheduler.
      this is only a presence check. It doesn't prove that the SMTP server is reachable or that the credentials are valid.
    */
  if (!config.smtp.host || !config.smtp.from) throw new Error("SMTP configuration is required.");
  console.log(await services.scheduler.processReminders({
    significantlyOverdueDays: config.reminders.significantlyOverdueDays,
    contractExpiringSoonDays: config.reminders.contractExpiringSoonDays,
  }));
} catch(error) {
  console.error("Reminder processor failed. Check database, SMTP, and notification threshold configuration. error : ", error);
  process.exitCode = 1;
} finally { await getPrisma().$disconnect(); }
