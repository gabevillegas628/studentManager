import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { buildDigestForUser, renderDigestHtml } from "../services/digestBuilder";
import { sendEmail } from "../services/email";

const router = Router();
const prisma = new PrismaClient();

// GET /api/settings/digest
router.get("/digest", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { digestEnabled: true, digestHour: true, digestTimezone: true },
  });
  res.json(user);
});

// PATCH /api/settings/digest
router.patch("/digest", authenticate, async (req: AuthRequest, res: Response) => {
  const { digestEnabled, digestHour, digestTimezone } = req.body;

  const data: Record<string, unknown> = {};

  if (typeof digestEnabled === "boolean") {
    data.digestEnabled = digestEnabled;
  }

  if (typeof digestHour === "number") {
    if (!Number.isInteger(digestHour) || digestHour < 0 || digestHour > 23) {
      res.status(400).json({ error: "digestHour must be an integer 0-23" });
      return;
    }
    data.digestHour = digestHour;
  }

  if (typeof digestTimezone === "string") {
    // Validate the timezone is a valid IANA timezone
    try {
      Intl.DateTimeFormat(undefined, { timeZone: digestTimezone });
    } catch {
      res.status(400).json({ error: "Invalid timezone" });
      return;
    }
    data.digestTimezone = digestTimezone;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { digestEnabled: true, digestHour: true, digestTimezone: true },
  });

  res.json(user);
});

// POST /api/settings/digest/test — send a test digest immediately
router.post("/digest/test", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const appUrl = process.env.APP_URL || "http://localhost:5173";

  try {
    const digestData = await buildDigestForUser(user);
    if (!digestData) {
      res.status(200).json({
        success: true,
        warning: "No activity to include — sent a digest with empty sections.",
      });
      // Send a minimal digest so we can still test email delivery
      const html = renderDigestHtml(
        { userName: user.name, newRequests: [], actionItems: [], newComments: [], totalPending: 0 },
        appUrl
      );
      await sendEmail(user.email, `[TEST] Your Daily Digest — ${new Date().toLocaleDateString()}`, html);
      return;
    }

    const html = renderDigestHtml(digestData, appUrl);
    await sendEmail(user.email, `[TEST] Your Daily Digest — ${new Date().toLocaleDateString()}`, html);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Digest Test] Failed:", err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
