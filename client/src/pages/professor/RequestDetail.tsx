import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/client";
import type { StudentRequest, RequestStatus, User, Message } from "../../types";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED", label: "Denied" },
  { value: "CLOSED", label: "Closed" },
];

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
  CLOSED: "bg-green-50 text-green-700",
};

const selectClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StudentRequest | null>(null);
  const [newComment, setNewComment] = useState("");
  const [newReply, setNewReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [staff, setStaff] = useState<User[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    api.get(`/requests/${id}`).then((res) => {
      setRequest(res.data);
      api.post(`/requests/${id}/mark-read`).catch(() => {});
    });
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

  async function addComment(e: React.FormEvent) {
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

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!newReply.trim()) return;
    setSendingReply(true);
    setReplyError("");
    try {
      const { data } = await api.post(`/requests/${id}/messages`, {
        content: newReply,
      });
      setRequest((prev) =>
        prev ? { ...prev, messages: [...(prev.messages || []), data as Message] } : prev
      );
      setNewReply("");
    } catch {
      setReplyError("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  }

  function copyThreadLink() {
    if (!request?.studentToken) return;
    const url = `${window.location.origin}/request/${request.studentToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  if (!request) {
    return <div className="text-gray-400">Loading...</div>;
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
        <h1 className="text-2xl font-semibold text-gray-900">{request.subject}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status]}`}>
          {request.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <div>
          <span className="text-gray-500">Student</span>
          <div className="flex items-center gap-2">
            <p className="text-gray-900">
              {request.studentName} ({request.studentEmail})
            </p>
            <button
              onClick={copyThreadLink}
              className="text-xs text-gray-400 hover:text-gray-700 underline underline-offset-2"
            >
              {linkCopied ? "Copied!" : "Copy thread link"}
            </button>
          </div>
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
          <p className="text-gray-900">{new Date(request.createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-700">Description</h3>
        <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{request.description}</p>
      </div>

      <div className="mt-6 flex items-end gap-6">
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={request.status}
            onChange={(e) => updateStatus(e.target.value as RequestStatus)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700">Assigned To</label>
          <select
            value={request.assignedTo?.id ?? ""}
            onChange={(e) => assignTo(e.target.value || null)}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Messages */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900">Student Messages</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Visible to the student. Replies are sent to their email with a link to the thread.
        </p>

        <div className="mt-4 space-y-3">
          {request.messages && request.messages.length > 0 ? (
            request.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "STUDENT" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                    msg.sender === "STUDENT"
                      ? "bg-gray-100 text-gray-800"
                      : "border border-gray-200 bg-white text-gray-800"
                  }`}
                >
                  <p className="mb-0.5 text-xs font-medium text-gray-500">
                    {msg.sender === "STUDENT" ? request.studentName : (msg.staffName ?? "Staff")}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className="mt-1.5 text-right text-xs text-gray-400">
                    {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No messages yet.</p>
          )}
        </div>

        <form onSubmit={sendReply} className="mt-4">
          {replyError && (
            <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{replyError}</p>
          )}
          <textarea
            rows={3}
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Reply to student..."
            maxLength={5000}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sendingReply || !newReply.trim()}
            className="mt-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {sendingReply ? "Sending..." : "Send Reply"}
          </button>
        </form>
      </div>

      {/* Internal Notes */}
      <div className="mt-8 border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900">Internal Notes</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Only visible to staff. Students cannot see these notes.
        </p>

        <div className="mt-4 space-y-3">
          {request.comments?.map((c) => (
            <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">{c.author.name}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                  {c.author.role}
                </span>
                <span className="text-gray-400">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-gray-700">{c.content}</p>
            </div>
          ))}
          {(!request.comments || request.comments.length === 0) && (
            <p className="text-sm text-gray-400">No notes yet.</p>
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
