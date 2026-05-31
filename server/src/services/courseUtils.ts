import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

export async function getCourseIdsForUser(user: User): Promise<string[]> {
  if (user.role === "ADMIN") {
    const courses = await prisma.course.findMany({ select: { id: true } });
    return courses.map((c) => c.id);
  }

  if (user.role === "PROFESSOR") {
    const courses = await prisma.course.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    return courses.map((c) => c.id);
  }

  // TA
  const memberships = await prisma.courseMember.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });
  return memberships.map((m) => m.courseId);
}
