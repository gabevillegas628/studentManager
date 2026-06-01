const baseStyles = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#374151;max-width:600px;margin:0 auto;padding:20px;`;

const ctaButton = (url: string, label: string) =>
  `<a href="${url}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 20px;text-decoration:none;border-radius:6px;font-size:14px;">${label}</a>`;

// --- OTP ---

interface OtpData {
  code: string;
  courseName: string;
}

export function renderOtpEmail(data: OtpData): { subject: string; html: string } {
  return {
    subject: `Your verification code for ${data.courseName}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyles}">
  <div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#111827;margin:0;">Verification Code</h1>
    <p style="color:#6b7280;margin:4px 0 0;font-size:14px;">${data.courseName}</p>
  </div>

  <p style="font-size:14px;color:#374151;">Enter this code to view your submitted requests:</p>

  <div style="margin:24px 0;text-align:center;">
    <span style="display:inline-block;background:#f9fafb;border:2px solid #e5e7eb;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace;">
      ${data.code}
    </span>
  </div>

  <p style="font-size:13px;color:#6b7280;">This code expires in 10 minutes and can only be used once.</p>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
    If you didn't request this code, you can ignore this email.
  </p>
</body>
</html>`,
  };
}

// --- Submission confirmation ---

interface SubmissionConfirmationData {
  studentName: string;
  subject: string;
  courseName: string;
  tokenUrl: string;
}

export function renderSubmissionConfirmationEmail(
  data: SubmissionConfirmationData
): { subject: string; html: string } {
  const firstName = data.studentName.split(" ")[0];
  return {
    subject: `Request received: ${data.subject}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyles}">
  <div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#111827;margin:0;">Request Received</h1>
    <p style="color:#6b7280;margin:4px 0 0;font-size:14px;">${data.courseName}</p>
  </div>

  <p style="font-size:14px;">Hi ${firstName},</p>
  <p style="font-size:14px;color:#374151;">
    Your request "<strong>${data.subject}</strong>" has been received and is under review.
    You can track its status and view any replies using the link below.
  </p>

  <div style="margin:24px 0;">
    ${ctaButton(data.tokenUrl, "View Your Request")}
  </div>

  <p style="font-size:13px;color:#6b7280;">
    You'll receive an email when there's a reply. Keep this link — it's your access to this request thread.
  </p>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
    ${data.courseName} · Student Request Manager
  </p>
</body>
</html>`,
  };
}

// --- Professor reply notification ---

interface ProfessorReplyData {
  studentName: string;
  subject: string;
  courseName: string;
  replyContent: string;
  tokenUrl: string;
}

export function renderProfessorReplyEmail(
  data: ProfessorReplyData
): { subject: string; html: string } {
  const firstName = data.studentName.split(" ")[0];
  const escaped = data.replyContent
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return {
    subject: `Reply on your request: ${data.subject}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyles}">
  <div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:24px;">
    <h1 style="font-size:20px;color:#111827;margin:0;">New Reply</h1>
    <p style="color:#6b7280;margin:4px 0 0;font-size:14px;">${data.courseName}</p>
  </div>

  <p style="font-size:14px;">Hi ${firstName},</p>
  <p style="font-size:14px;color:#374151;">
    You have a reply on your request "<strong>${data.subject}</strong>":
  </p>

  <div style="background:#f9fafb;border-left:3px solid #111827;padding:12px 16px;margin:16px 0;font-size:14px;color:#374151;border-radius:0 6px 6px 0;">
    ${escaped}
  </div>

  <p style="font-size:14px;color:#374151;">You can reply using the link below.</p>

  <div style="margin:24px 0;">
    ${ctaButton(data.tokenUrl, "View & Reply")}
  </div>

  <p style="font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
    ${data.courseName} · Student Request Manager
  </p>
</body>
</html>`,
  };
}
