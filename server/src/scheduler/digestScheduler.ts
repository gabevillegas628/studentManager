import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { buildDigestForUser, renderDigestHtml } from "../services/digestBuilder";
import { sendEmail } from "../services/email";

const prisma = new PrismaClient();

function getCurrentHourInTimezone(timezone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    return parseInt(formatted, 10);
  } catch {
    // Invalid timezone, fall back to UTC
    return new Date().getUTCHours();
  }
}

export function startDigestScheduler(): void {
  const appUrl = process.env.APP_URL || "http://localhost:5173";

  // Run at the top of every hour
  cron.schedule("0 * * * *", async () => {
    console.log(`[Digest] Running scheduler check at ${new Date().toISOString()}`);

    const users = await prisma.user.findMany({
      where: { digestEnabled: true },
    });

    let sent = 0;
    for (const user of users) {
      const localHour = getCurrentHourInTimezone(user.digestTimezone);
      if (localHour !== user.digestHour) continue;

      // Guard against sending twice in the same hour
      if (user.lastDigestSentAt) {
        const hoursSinceLast =
          (Date.now() - user.lastDigestSentAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < 1) continue;
      }

      try {
        const digestData = await buildDigestForUser(user);
        if (!digestData) {
          console.log(`[Digest] No activity for ${user.email}, skipping`);
          continue;
        }

        const html = renderDigestHtml(digestData, appUrl);
        await sendEmail(
          user.email,
          `Your Daily Digest — ${new Date().toLocaleDateString()}`,
          html
        );

        await prisma.user.update({
          where: { id: user.id },
          data: { lastDigestSentAt: new Date() },
        });

        sent++;
        console.log(`[Digest] Sent digest to ${user.email}`);
      } catch (err) {
        console.error(`[Digest] Failed to send to ${user.email}:`, err);
      }
    }

    console.log(`[Digest] Done — sent ${sent} digest(s)`);
  });

  console.log("[Digest] Scheduler started — runs every hour at :00");
}
