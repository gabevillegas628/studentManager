import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import type { StudentRequest, RequestStatus, User } from "../../types";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED", label: "Denied" },
];

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
};

const selectClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StudentRequest | null>(null);
  const [newComment, setNewComment] = useState("");
  const [staff, setStaff] = useState<User[]>([]);

  useEffect(() => {
    api.get(`/requests/${id}`).then((res) => setRequest(res.data));
    api.get("/users").then((res) => setStaff(res.data)).catch(() => {});
  }, [id]);

  async function updateStatus(status: RequestStatus) {
    const { data } = await api.patch(`/requests/${id}`, { status });
    setRequest((prev) => (prev ? { ...prev, ...data } : prev));
  }

  async function assignTo(assignedToId: string | null) {
    const { data } = await api.patch(`/requests/${id}`, { assignedToId });
    setRequest((prev) => (prev ? { ...prev, ...data } : prev));
  }

  async function addComment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newComment.trim()) return;
    const { data } = await api.post(`/requests/${id}/comments`, {
      content: newComment,
    });
    setRequest((prev) =>
      prev ? { ...prev, comments: [...(prev.comments || []), data] } : prev
    );
    setNewComment("");
  }

  if (!request) {
    return (
      <div className="text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/dashboard")}
        className="text-sm text-gray-500 hover:text-gray-900"
      >
        &larr; Back to dashboard
      </button>

      <div className="mt-4 flex items-start justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {request.subject}
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status]}`}
        >
          {request.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500">Student</span>
          <p className="text-gray-900">
            {request.studentName} ({request.studentEmail})
          </p>
        </div>
        <div>
          <span className="text-gray-500">Course</span>
          <p className="text-gray-900">{request.course.name}</p>
        </div>
        <div>
          <span className="text-gray-500">Type</span>
          <p className="text-gray-900">{request.requestType.name}</p>
        </div>
        <div>
          <span className="text-gray-500">Submitted</span>
          <p className="text-gray-900">
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Description</h3>
        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
          {request.description}
        </p>
      </div>

      <div className="mt-6 flex items-end gap-6">
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={request.status}
            onChange={(e) => updateStatus(e.target.value as RequestStatus)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700">
            Assigned To
          </label>
          <select
            value={request.assignedTo?.id ?? ""}
            onChange={(e) => assignTo(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <a
          href={`mailto:${request.studentEmail}?subject=${encodeURIComponent(
            `Re: ${request.subject} — ${request.course.name}`
          )}&body=${encodeURIComponent(
            `Hi ${request.studentName},\n\n\n\n` +
            `---\n` +
            `Regarding your ${request.requestType.name} request:\n` +
            `${request.description}\n`
          )}`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Reply to Student
        </a>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900">Internal Notes</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Only visible to staff. Students cannot see these notes.
        </p>

        <div className="mt-4 space-y-3">
          {request.comments?.map((c) => (
            <div
              key={c.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">
                  {c.author.name}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {c.author.role}
                </span>
                <span className="text-gray-400">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{c.content}</p>
            </div>
          ))}

          {(!request.comments || request.comments.length === 0) && (
            <p className="text-sm text-gray-400">No comments yet.</p>
          )}
        </div>

        <form onSubmit={addComment} className="mt-4">
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add an internal note..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Add Note
          </button>
        </form>
      </div>
    </div>
  );
}
