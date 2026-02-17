import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { authenticate, requireRole } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();
const prisma = new PrismaClient();

function generateCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// Public: lookup course by code or slug
router.get("/lookup/:code", async (req: Request, res: Response) => {
  const code = req.params.code as string;

  const course = await prisma.course.findFirst({
    where: {
      OR: [{ code }, { slug: code }],
    },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      active: true,
      owner: { select: { name: true } },
      requestTypes: {
        where: { active: true },
        select: { id: true, name: true, acceptsAttachments: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(course);
});

// Protected: list courses for current user
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const paginate = req.query.page !== undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where =
    role === "ADMIN"
      ? {}
      : { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };

  const include = {
    owner: { select: { id: true, name: true } },
    _count: { select: { requests: true, members: true } },
  } as const;

  if (!paginate) {
    const courses = await prisma.course.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
    });
    res.json(courses);
    return;
  }

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      include,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.course.count({ where }),
  ]);

  res.json({ data: courses, total, page, totalPages: Math.ceil(total / limit) });
});

// Protected: create a course
router.post(
  "/",
  authenticate,
  requireRole("PROFESSOR", "ADMIN"),
  async (req: AuthRequest, res: Response) => {
    const { name, slug } = req.body;

    if (!name) {
      res.status(400).json({ error: "Course name is required" });
      return;
    }

    if (slug) {
      const existing = await prisma.course.findUnique({ where: { slug } });
      if (existing) {
        res.status(409).json({ error: "Slug already in use" });
        return;
      }
    }

    // Generate unique code with retry
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.course.findUnique({ where: { code } });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const course = await prisma.course.create({
      data: {
        name,
        code,
        slug: slug || null,
        ownerId: req.user!.id,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(course);
  }
);

// Protected: get course details
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      },
      requestTypes: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, acceptsAttachments: true, active: true },
      },
      _count: { select: { requests: true } },
    },
  });

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  res.json(course);
});

// Protected: update course (owner or admin only)
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, slug, active } = req.body;

  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
    res.status(403).json({ error: "Only the course owner can update this course" });
    return;
  }

  if (slug && slug !== course.slug) {
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ error: "Slug already in use" });
      return;
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug || null;
  if (active !== undefined) data.active = active;

  const updated = await prisma.course.update({
    where: { id },
    data,
    include: { owner: { select: { id: true, name: true } } },
  });

  res.json(updated);
});

// Protected: add TA to course by email (owner or admin)
router.post(
  "/:id/members",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const courseId = req.params.id as string;
    const { email } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can manage members" });
      return;
    }

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ error: "No user found with that email" });
      return;
    }

    const existing = await prisma.courseMember.findUnique({
      where: { courseId_userId: { courseId, userId: user.id } },
    });
    if (existing) {
      res.status(409).json({ error: "User is already a member of this course" });
      return;
    }

    const member = await prisma.courseMember.create({
      data: { courseId, userId: user.id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });

    res.status(201).json(member);
  }
);

// Protected: remove member from course (owner or admin)
router.delete(
  "/:id/members/:userId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const courseId = req.params.id as string;
    const userId = req.params.userId as string;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can manage members" });
      return;
    }

    await prisma.courseMember.deleteMany({
      where: { courseId, userId },
    });

    res.json({ success: true });
  }
);

// Protected: duplicate a course (owner or admin only)
router.post(
  "/:id/duplicate",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const sourceId = req.params.id as string;

    const source = await prisma.course.findUnique({
      where: { id: sourceId },
      include: {
        requestTypes: true,
        members: true,
      },
    });

    if (!source) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (source.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can duplicate this course" });
      return;
    }

    const { name, slug } = req.body;
    const courseName = name || `${source.name} (Copy)`;

    if (slug) {
      const existing = await prisma.course.findUnique({ where: { slug } });
      if (existing) {
        res.status(409).json({ error: "Slug already in use" });
        return;
      }
    }

    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.course.findUnique({ where: { code } });
      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    const newCourse = await prisma.course.create({
      data: {
        name: courseName,
        code,
        slug: slug || null,
        ownerId: req.user!.id,
        requestTypes: {
          create: source.requestTypes.map((rt) => ({
            name: rt.name,
            acceptsAttachments: rt.acceptsAttachments,
            active: rt.active,
            sortOrder: rt.sortOrder,
          })),
        },
        members: {
          create: source.members.map((m) => ({
            userId: m.userId,
          })),
        },
      },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { requests: true, members: true } },
      },
    });

    res.status(201).json(newCourse);
  }
);

// Protected: create a request type for a course (owner or admin only)
router.post(
  "/:id/request-types",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const courseId = req.params.id as string;
    const { name, acceptsAttachments } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can manage request types" });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const maxOrder = await prisma.requestType.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const requestType = await prisma.requestType.create({
      data: {
        name: name.trim(),
        acceptsAttachments: acceptsAttachments ?? false,
        courseId,
        sortOrder: nextOrder,
      },
    });

    res.status(201).json(requestType);
  }
);

// Protected: update a request type (owner or admin only)
router.patch(
  "/:id/request-types/:typeId",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const courseId = req.params.id as string;
    const typeId = req.params.typeId as string;
    const { name, acceptsAttachments, active } = req.body;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can manage request types" });
      return;
    }

    const existing = await prisma.requestType.findUnique({ where: { id: typeId } });
    if (!existing || existing.courseId !== courseId) {
      res.status(404).json({ error: "Request type not found" });
      return;
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (acceptsAttachments !== undefined) data.acceptsAttachments = acceptsAttachments;
    if (active !== undefined) data.active = active;

    const updated = await prisma.requestType.update({
      where: { id: typeId },
      data,
    });

    res.json(updated);
  }
);

// Protected: reorder request types for a course (owner or admin only)
router.put(
  "/:id/request-types/reorder",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const courseId = req.params.id as string;
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: "orderedIds array is required" });
      return;
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    if (course.ownerId !== req.user!.id && req.user!.role !== "ADMIN") {
      res.status(403).json({ error: "Only the course owner can manage request types" });
      return;
    }

    await Promise.all(
      orderedIds.map((id: string, index: number) =>
        prisma.requestType.updateMany({
          where: { id, courseId },
          data: { sortOrder: index },
        })
      )
    );

    const updated = await prisma.requestType.findMany({
      where: { courseId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, acceptsAttachments: true, active: true, sortOrder: true },
    });

    res.json(updated);
  }
);

export default router;
