import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { sendEmail } from "../services/email";
import { renderSubmissionConfirmationEmail, renderProfessorReplyEmail, renderOtpEmail } from "../services/emailTemplates";
import { emitToCourses } from "../services/sseManager";
import { generateOtp, verifyOtp, hasActiveOtp } from "../services/otpStore";

const router = Router();
const prisma = new PrismaClient();

// Public: student submits a request
router.post("/", async (req: Request, res: Response) => {
  const { requestTypeId, studentName, studentEmail, courseId, subject, description } =
    req.body;

  if (!requestTypeId || !studentName || !studentEmail || !courseId || !subject || !description) {
    res.status(400).json({ error: "All fields are required" });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  if (!course.active) {
    res.status(400).json({ error: "This course is not currently accepting requests" });
    return;
  }

  const requestType = await prisma.requestType.findUnique({ where: { id: requestTypeId } });
  if (!requestType || requestType.courseId !== courseId || !requestType.active) {
    res.status(400).json({ error: "Invalid request type" });
    return;
  }

  const request = await prisma.request.create({
    data: { requestTypeId, studentName, studentEmail, courseId, subject, description },
    include: { course: { select: { name: true } } },
  });

  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const tokenUrl = `${appUrl}/request/${request.studentToken}`;
  const { subject: emailSubject, html } = renderSubmissionConfirmationEmail({
    studentName,
    subject,
    courseName: request.course.name,
    tokenUrl,
  });
  sendEmail(studentEmail, emailSubject, html).catch((err) =>
    console.error("[Email] Failed to send submission confirmation:", err)
  );

  emitToCourses([courseId], "new_request", {
    requestId: request.id,
    subject,
    studentName,
    courseId,
  });

  res.status(201).json({
    id: request.id,
    status: request.status,
    studentToken: request.studentToken,
  });
});

// Public: send OTP to student email for status lookup
router.post("/lookup/otp", async (req: Request, res: Response) => {
  const { courseId, studentEmail } = req.body;
  if (!courseId || !studentEmail) {
    res.status(400).json({ error: "courseId and studentEmail are required" });
    return;
  }

  // Don't spam — if a valid code already exists, don't issue another
  if (hasActiveOtp(courseId, studentEmail)) {
    res.json({ sent: true });
    return;
  }

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { name: true } });
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const code = generateOtp(courseId, studentEmail);
  const { subject, html } = renderOtpEmail({ code, courseName: course.name });
  sendEmail(studentEmail, subject, html).catch((err) =>
    console.error("[Email] Failed to send OTP:", err)
  );

  res.json({ sent: true });
});

// Public: verify OTP and return requests
router.post("/lookup/verify", async (req: Request, res: Response) => {
  const { courseId, studentEmail, code } = req.body;
  if (!courseId || !studentEmail || !code) {
    res.status(400).json({ error: "courseId, studentEmail, and code are required" });
    return;
  }

  if (!verifyOtp(courseId, studentEmail, code)) {
    res.status(401).json({ error: "Invalid or expired code" });
    return;
  }

  const requests = await prisma.request.findMany({
    where: {
      courseId,
      studentEmail: { equals: studentEmail, mode: "insensitive" },
    },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      studentToken: true,
      requestType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(requests);
});

// Public: student looks up their requests by email + course
router.get("/lookup", async (req: Request, res: Response) => {
  const { courseId, studentEmail } = req.query;

  if (!courseId || !studentEmail) {
    res.status(400).json({ error: "courseId and studentEmail are required" });
    return;
  }

  const requests = await prisma.request.findMany({
    where: {
      courseId: courseId as string,
      studentEmail: {
        equals: studentEmail as string,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      requestType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(requests);
});

// Public: student checks request status
router.get("/:id/status", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const request = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      requestType: { select: { id: true, name: true } },
      subject: true,
      createdAt: true,
      course: { select: { name: true } },
    },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  res.json(request);
});

// Protected: list requests scoped to user's courses
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { status, requestTypeId, courseId } = req.query;
  const userId = req.user!.id;
  const role = req.user!.role;

  const where: Record<string, unknown> = { course: { active: true } };
  if (status) where.status = status;
  if (requestTypeId) where.requestTypeId = requestTypeId;
  if (courseId) where.courseId = courseId;

  // Scope by role
  if (role === "PROFESSOR") {
    const courseIds = await prisma.course.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    where.courseId = courseId || { in: courseIds.map((c) => c.id) };
  } else if (role === "TA") {
    const memberships = await prisma.courseMember.findMany({
      where: { userId },
      select: { courseId: true },
    });
    where.courseId = courseId || { in: memberships.map((m) => m.courseId) };
  }
  // ADMIN sees all (no extra scoping)

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true } },
        course: { select: { id: true, name: true, code: true } },
        requestType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.request.count({ where }),
  ]);

  res.json({ data: requests, total, page, totalPages: Math.ceil(total / limit) });
});

// Protected: get request details (with authorization)
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      requestType: { select: { id: true, name: true, acceptsAttachments: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
      course: {
        select: {
          id: true,
          name: true,
          code: true,
          ownerId: true,
          members: { select: { userId: true } },
        },
      },
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: "asc" },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) {
    res.status(404).json({ error: "Request not found" });
    return;
  }

  // Authorization: admin, course owner, or course member
  const userId = req.user!.id;
  const role = req.user!.role;
  const isOwner = request.course.ownerId === userId;
  const isMember = request.course.members.some((m) => m.userId === userId);

  if (role !== "ADMIN" && !isOwner && !isMember) {
    res.status(403).json({ error: "You don't have access to this request" });
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
    include: {
      assignedTo: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
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

// Protected: professor/TA posts a reply to a student
router.post(
  "/:id/messages",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const { content } = req.body;
    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: "Content is required" });
      return;
    }
    if (content.length > 5000) {
      res.status(400).json({ error: "Message too long (max 5000 characters)" });
      return;
    }

    const requestId = req.params.id as string;
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        course: {
          select: { id: true, name: true, ownerId: true, members: { select: { userId: true } } },
        },
      },
    });

    if (!request) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    const userId = req.user!.id;
    const role = req.user!.role;
    const isOwner = request.course.ownerId === userId;
    const isMember = request.course.members.some((m) => m.userId === userId);
    if (role !== "ADMIN" && !isOwner && !isMember) {
      res.status(403).json({ error: "You don't have access to this request" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        content,
        sender: "STAFF",
        staffName: req.user!.name,
        requestId,
      },
    });

    const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
    const tokenUrl = `${appUrl}/request/${request.studentToken}`;
    const { subject: emailSubject, html } = renderProfessorReplyEmail({
      studentName: request.studentName,
      subject: request.subject,
      courseName: request.course.name,
      replyContent: content,
      tokenUrl,
    });
    sendEmail(request.studentEmail, emailSubject, html).catch((err) =>
      console.error("[Email] Failed to send professor reply notification:", err)
    );

    res.status(201).json(message);
  }
);

export default router;
