import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const OWNER_ID = "a7951893-fbb4-4d24-b9e6-e8e94ae4c8d1";

async function main() {
  // Verify the user exists
  const owner = await prisma.user.findUnique({ where: { id: OWNER_ID } });
  if (!owner) {
    console.error(`User ${OWNER_ID} not found. Make sure you're pointing at the right database.`);
    process.exit(1);
  }
  console.log(`Creating course for: ${owner.name} (${owner.email})`);

  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const course = await prisma.course.upsert({
    where: { slug: "dev-course" },
    update: {},
    create: {
      name: "Dev Course",
      code,
      slug: "dev-course",
      ownerId: OWNER_ID,
    },
  });
  console.log(`Course: ${course.name} (code: ${course.code}, slug: ${course.slug})`);

  // Request types
  const typeNames = [
    "Extension Request",
    "Grade Appeal",
    "Exam Makeup",
    "Absence",
    "Other",
  ];

  const types: Record<string, string> = {};
  for (const name of typeNames) {
    const rt = await prisma.requestType.upsert({
      where: { id: `dev-${course.id}-${name}` },
      update: {},
      create: {
        id: `dev-${course.id}-${name}`,
        name,
        courseId: course.id,
        sortOrder: typeNames.indexOf(name),
      },
    });
    types[name] = rt.id;
  }
  console.log(`Request types: ${typeNames.join(", ")}`);

  // Sample requests
  const requests = [
    {
      studentName: "Alice Johnson",
      studentEmail: "alice@university.edu",
      subject: "Extension for final project due to illness",
      description:
        "I have been sick with the flu for the past three days and have a doctor's note. I'm requesting a 3-day extension on the final project deadline. I can provide documentation if needed.",
      requestTypeId: types["Extension Request"],
      status: "PENDING" as const,
    },
    {
      studentName: "Bob Martinez",
      studentEmail: "bob@university.edu",
      subject: "Grade appeal for Midterm 2",
      description:
        "I believe question 4 on the midterm was graded incorrectly. My answer matches the rubric criteria for full credit but I only received partial credit. I'd like to discuss this during office hours.",
      requestTypeId: types["Grade Appeal"],
      status: "IN_REVIEW" as const,
    },
    {
      studentName: "Carol Chen",
      studentEmail: "carol@university.edu",
      subject: "Makeup exam request — family emergency",
      description:
        "I had a family emergency the day of the exam and was unable to attend. I am willing to take a makeup exam at your earliest convenience. I have documentation from my family if required.",
      requestTypeId: types["Exam Makeup"],
      status: "APPROVED" as const,
    },
    {
      studentName: "David Kim",
      studentEmail: "david@university.edu",
      subject: "Absence from lecture on Thursday 5/28",
      description:
        "I had a mandatory athletic event on Thursday and will be missing lecture. I've already reviewed the slides and will get notes from a classmate. Will anything from Thursday be on the quiz?",
      requestTypeId: types["Absence"],
      status: "CLOSED" as const,
    },
    {
      studentName: "Emma Wilson",
      studentEmail: "emma@university.edu",
      subject: "Extension for assignment 3",
      description:
        "I've been dealing with a lot this week and fell behind. I know this is last minute, but would it be possible to have until Sunday? I'm almost done, just need a bit more time to polish it.",
      requestTypeId: types["Extension Request"],
      status: "DENIED" as const,
    },
    {
      studentName: "Frank Torres",
      studentEmail: "frank@university.edu",
      subject: "Question about grading on homework 5",
      description:
        "I got 7/10 on homework 5 but no feedback was left explaining the deductions. Could you let me know which parts were incorrect so I can understand what I did wrong before the final?",
      requestTypeId: types["Other"],
      status: "PENDING" as const,
    },
    {
      studentName: "Grace Lee",
      studentEmail: "grace@university.edu",
      subject: "Extension request — conference presentation",
      description:
        "I'm presenting research at a conference this weekend and won't be able to finish the assignment by Friday. I'm requesting until Monday. I can forward the conference acceptance email as proof.",
      requestTypeId: types["Extension Request"],
      status: "IN_REVIEW" as const,
    },
  ];

  for (const r of requests) {
    const req = await prisma.request.create({
      data: {
        ...r,
        courseId: course.id,
      },
    });

    // Add some messages to a couple of requests to test the thread UI
    if (r.studentName === "Bob Martinez") {
      await prisma.message.create({
        data: {
          requestId: req.id,
          sender: "STAFF",
          staffName: owner.name,
          content:
            "Hi Bob, thanks for reaching out. I've pulled up your midterm and will review question 4. I'll get back to you by end of day tomorrow.",
        },
      });
      await prisma.message.create({
        data: {
          requestId: req.id,
          sender: "STUDENT",
          content:
            "Thank you! I really appreciate it. My answer is on page 3, the second part of question 4b.",
        },
      });
    }

    if (r.studentName === "Carol Chen") {
      await prisma.message.create({
        data: {
          requestId: req.id,
          sender: "STAFF",
          staffName: owner.name,
          content:
            "Hi Carol, I'm sorry to hear about your family emergency. Your makeup exam is approved — please come to my office on Tuesday between 2-4pm. Let me know if that time works.",
        },
      });
      await prisma.message.create({
        data: {
          requestId: req.id,
          sender: "STUDENT",
          content:
            "Tuesday at 2pm works perfectly. Thank you so much, I'll see you then.",
        },
      });
    }

    console.log(`  [${req.status}] ${r.studentName} — "${r.subject}"`);
  }

  console.log(`\nDone. Visit the course at: /c/dev-course`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
