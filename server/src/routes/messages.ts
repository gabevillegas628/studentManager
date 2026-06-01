import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { emitToCourses } from "../services/sseManager";

const router = Router();
const prisma = new PrismaClient();

// Public: get thread data for student token page
router.get("/thread/:token", async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const request = await prisma.request.findUnique({
    where: { studentToken: token },
    include: {
      course: { select: { id: true, name: true, code: true, slug: true } },
      requestType: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json({
    id: request.id,
    subject: request.subject,
    description: request.description,
    status: request.status,
    studentName: request.studentName,
    createdAt: request.createdAt,
    courseId: request.course.id,
    courseName: request.course.name,
    courseCode: request.course.slug ?? request.course.code,
    requestTypeName: request.requestType.name,
    messages: request.messages,
  });
});

// Public: student posts a reply on their thread
router.post("/thread/:token", async (req: Request, res: Response) => {
  const token = req.params.token as string;
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    res.status(400).json({ error: "Content is required" });
    return;
  }
  if (content.length > 5000) {
    res.status(400).json({ error: "Message too long (max 5000 characters)" });
    return;
  }

  const request = await prisma.request.findUnique({
    where: { studentToken: token },
    select: { id: true, courseId: true, subject: true, studentName: true, status: true },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  if (["APPROVED", "DENIED", "CLOSED"].includes(request.status)) {
    res.status(400).json({ error: "This request is closed and no longer accepting replies" });
    return;
  }

  const message = await prisma.message.create({
    data: {
      content,
      sender: "STUDENT",
      requestId: request.id,
    },
  });

  emitToCourses([request.courseId], "new_message", {
    requestId: request.id,
    subject: request.subject,
    studentName: request.studentName,
  });

  res.status(201).json(message);
});

export default router;
