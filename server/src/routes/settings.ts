import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

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

export default router;
