export type Role = "ADMIN" | "PROFESSOR" | "TA";

export type RequestStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "DENIED" | "CLOSED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface RequestType {
  id: string;
  name: string;
  acceptsAttachments: boolean;
  active: boolean;
  courseId: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  active: boolean;
  owner: { id: string; name: string };
  _count?: { requests: number; members: number };
  members?: CourseMember[];
  requestTypes?: RequestType[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseMember {
  id: string;
  courseId: string;
  userId: string;
  user: { id: string; name: string; email: string; role: Role };
}

export interface StudentRequest {
  id: string;
  requestType: { id: string; name: string };
  studentName: string;
  studentEmail: string;
  subject: string;
  description: string;
  status: RequestStatus;
  course: { id: string; name: string; code: string };
  assignedTo?: { id: string; name: string } | null;
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: Role };
}

export interface DigestPreferences {
  digestEnabled: boolean;
  digestHour: number;
  digestTimezone: string;
}
