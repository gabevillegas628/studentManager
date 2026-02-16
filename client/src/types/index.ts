export type Role = "ADMIN" | "PROFESSOR" | "TA";

export type RequestType =
  | "EXAM_MAKEUP"
  | "ABSENCE"
  | "GRADING_DISCREPANCY"
  | "MISSED_ASSIGNMENT"
  | "OTHER";

export type RequestStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "DENIED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface StudentRequest {
  id: string;
  type: RequestType;
  studentName: string;
  studentEmail: string;
  courseName: string;
  subject: string;
  description: string;
  status: RequestStatus;
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
