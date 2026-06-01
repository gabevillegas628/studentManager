interface OtpEntry {
  code: string;
  expiresAt: number;
}

// key = "courseId:normalizedEmail"
const store = new Map<string, OtpEntry>();

function key(courseId: string, email: string): string {
  return `${courseId}:${email.toLowerCase().trim()}`;
}

export function generateOtp(courseId: string, email: string): string {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.set(key(courseId, email), { code, expiresAt: Date.now() + 10 * 60 * 1000 });
  return code;
}

export function verifyOtp(courseId: string, email: string, code: string): boolean {
  const entry = store.get(key(courseId, email));
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(key(courseId, email)); return false; }
  if (entry.code !== code) return false;
  store.delete(key(courseId, email)); // single use
  return true;
}

export function hasActiveOtp(courseId: string, email: string): boolean {
  const entry = store.get(key(courseId, email));
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(key(courseId, email)); return false; }
  return true;
}
