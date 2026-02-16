import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();
const prisma = new PrismaClient();

// Public: student submits a request
router.post("/", async (req: Request, res: Response) => {
  const { type, studentName, studentEmail, courseName, subject, description } =
    req.body;

  if (
    !type ||
    !studentName ||
    !studentEmail ||
    !courseName ||
    !subject ||
    !description
  ) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const request = await prisma.request.create({
    data: { type, studentName, studentEmail, courseName, subject, description },
  });

  res.status(201).json({ id: request.id, status: request.status });
});

// Public: student checks request status
router.get("/:id/status", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const request = await prisma.request.findUnique({
    where: { id },
    select: { id: true, status: true, type: true, subject: true, createdAt: true },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(request);
});

// Protected: list all requests (staff dashboard)
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { status, type, assignedToId } = req.query;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (assignedToId) where.assignedToId = assignedToId;

  const requests = await prisma.request.findMany({
    where,
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json(requests);
});

// Protected: get request details
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(request);
});

// Protected: update request (status, assignment)
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { status, assignedToId } = req.body;

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (assignedToId !== undefined) data.assignedToId = assignedToId;

  const request = await prisma.request.update({
    where: { id },
    data,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  res.json(request);
});

// Protected: add comment to request
router.post(
  "/:id/comments",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: "Content is required" });
      return;
    }

    const requestId = req.params.id as string;
    const comment = await prisma.comment.create({
      data: {
        content,
        requestId,
        authorId: req.user!.id,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    res.status(201).json(comment);
  }
);

export default router;
