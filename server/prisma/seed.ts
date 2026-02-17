import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@school.edu" },
    update: {},
    create: {
      email: "admin@school.edu",
      password: hashedPassword,
      name: "System Admin",
      role: "ADMIN",
    },
  });
  console.log("Seeded admin user:", admin.email);

  // Seed a sample professor + course
  const profPassword = await bcrypt.hash("prof123", 10);
  const professor = await prisma.user.upsert({
    where: { email: "prof@school.edu" },
    update: {},
    create: {
      email: "prof@school.edu",
      password: profPassword,
      name: "Dr. Smith",
      role: "PROFESSOR",
    },
  });
  console.log("Seeded professor:", professor.email);

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const course = await prisma.course.upsert({
    where: { slug: "cs101-spring-2026" },
    update: {},
    create: {
      name: "CS 101 - Intro to Computer Science",
      code,
      slug: "cs101-spring-2026",
      ownerId: professor.id,
    },
  });
  console.log("Seeded course:", course.name, `(code: ${course.code}, slug: ${course.slug})`);

  // Create default request types for the course
  const defaultTypes = [
    "Exam Makeup",
    "Absence",
    "Grading Discrepancy",
    "Missed Assignment",
    "Other",
  ];

  for (const name of defaultTypes) {
    await prisma.requestType.upsert({
      where: { id: `${course.id}-${name}` },
      update: {},
      create: {
        id: `${course.id}-${name}`,
        name,
        courseId: course.id,
      },
    });
  }
  console.log("Seeded request types for course:", defaultTypes.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
