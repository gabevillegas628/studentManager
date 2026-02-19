import { PrismaClient, User } from "@prisma/client";

const prisma = new PrismaClient();

interface DigestRequest {
  id: string;
  subject: string;
  studentName: string;
  status: string;
  courseName: string;
  createdAt: Date;
}

interface DigestComment {
  requestId: string;
  requestSubject: string;
  authorName: string;
  contentPreview: string;
}

interface DigestData {
  userName: string;
  newRequests: DigestRequest[];
  actionItems: DigestRequest[];
  newComments: DigestComment[];
  totalPending: number;
}

async function getCourseIdsForUser(user: User): Promise<string[]> {
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

export async function buildDigestForUser(
  user: User
): Promise<DigestData | null> {
  const courseIds = await getCourseIdsForUser(user);
  if (courseIds.length === 0) return null;

  const since = user.lastDigestSentAt ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [newRequests, actionItems, newComments, totalPending] =
    await Promise.all([
      // New requests since last digest
      prisma.request.findMany({
        where: {
          courseId: { in: courseIds },
          createdAt: { gt: since },
        },
        include: {
          course: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),

      // Requests assigned to this user that need attention
      prisma.request.findMany({
        where: {
          assignedToId: user.id,
          status: { in: ["PENDING", "IN_REVIEW"] },
        },
        include: {
          course: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // New comments on requests in user's courses
      prisma.comment.findMany({
        where: {
          createdAt: { gt: since },
          authorId: { not: user.id },
          request: { courseId: { in: courseIds } },
        },
        include: {
          author: { select: { name: true } },
          request: { select: { id: true, subject: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 15,
      }),

      // Total pending count
      prisma.request.count({
        where: {
          courseId: { in: courseIds },
          status: "PENDING",
        },
      }),
    ]);

  if (
    newRequests.length === 0 &&
    actionItems.length === 0 &&
    newComments.length === 0
  ) {
    return null;
  }

  return {
    userName: user.name,
    newRequests: newRequests.map((r) => ({
      id: r.id,
      subject: r.subject,
      studentName: r.studentName,
      status: r.status,
      courseName: r.course.name,
      createdAt: r.createdAt,
    })),
    actionItems: actionItems.map((r) => ({
      id: r.id,
      subject: r.subject,
      studentName: r.studentName,
      status: r.status,
      courseName: r.course.name,
      createdAt: r.createdAt,
    })),
    newComments: newComments.map((c) => ({
      requestId: c.request.id,
      requestSubject: c.request.subject,
      authorName: c.author.name,
      contentPreview:
        c.content.length > 100 ? c.content.slice(0, 100) + "..." : c.content,
    })),
    totalPending,
  };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
  CLOSED: "Closed",
};

export function renderDigestHtml(data: DigestData, appUrl: string): string {
  const dashboardUrl = `${appUrl}/dashboard`;

  let sections = "";

  if (data.newRequests.length > 0) {
    const rows = data.newRequests
      .map(
        (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.studentName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.subject}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.courseName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.createdAt.toLocaleDateString()}</td>
      </tr>`
      )
      .join("");

    sections += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px;color:#111827;margin-bottom:4px;">New Requests (${data.newRequests.length})</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Submitted since your last digest.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Student</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Subject</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Course</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  if (data.actionItems.length > 0) {
    const rows = data.actionItems
      .map(
        (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.studentName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.subject}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${r.courseName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${STATUS_LABELS[r.status] || r.status}</td>
      </tr>`
      )
      .join("");

    sections += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px;color:#111827;margin-bottom:4px;">Needs Your Attention (${data.actionItems.length})</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Assigned to you and awaiting action.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Student</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Subject</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Course</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  if (data.newComments.length > 0) {
    const items = data.newComments
      .map(
        (c) => `
      <li style="padding:6px 0;border-bottom:1px solid #f3f4f6;">
        <strong>${c.authorName}</strong> noted on <em>${c.requestSubject}</em>: ${c.contentPreview}
      </li>`
      )
      .join("");

    sections += `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px;color:#111827;margin-bottom:4px;">New Staff Notes (${data.newComments.length})</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 8px;">Internal notes from staff on requests in your courses.</p>
      <ul style="list-style:none;padding:0;margin:0;font-size:14px;">${items}</ul>
    </div>`;
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#374151;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#111827;margin:0;">Daily Digest</h1>
    <p style="color:#6b7280;margin:4px 0 0;font-size:14px;">Student Request Manager</p>
  </div>

  <p style="font-size:14px;">Hi ${data.userName},</p>
  <p style="font-size:14px;color:#6b7280;">Here's your daily summary. You have <strong>${data.totalPending}</strong> pending request${data.totalPending === 1 ? "" : "s"} total.</p>

  ${sections}

  <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:6px;font-size:14px;">Open Dashboard</a>
  </div>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;">
    You're receiving this because you enabled digest emails.
    <a href="${dashboardUrl}/settings" style="color:#6b7280;">Manage preferences</a>
  </p>
</body>
</html>`;
}
