import { Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { authenticate, requireRole } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();
const prisma = new PrismaClient();

// Admin only: list all staff users
router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  async (_req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    res.json(users);
  }
);

// Admin only: create a new staff user
router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  }
);

export default router;
