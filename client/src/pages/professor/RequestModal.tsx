import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import type { RequestStatus, User, Message, Comment } from "../../types";

interface ModalRequest {
  id: string;
  studentToken: string;
  studentName: string;
  studentEmail: string;
  subject: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  course: { id: string; name: string };
  requestType: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  messages: Message[];
  comments: Comment[];
}

interface Props {
  requestId: string | null;
  staff: User[];
  onClose: () => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onAssignmentChange: (id: string, assignedTo: { id: string; name: string } | null) => void;
}

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
  CLOSED: "bg-gray-100 text-gray-600",
};

export default function RequestModal({ requestId, staff, onClose, onStatusChange, onAssignmentChange }: Props) {
  const [request, setRequest] = useState<ModalRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [sendingNote, setSendingNote] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestId) {
      setRequest(null);
      return;
    }
    setLoading(true);
    setReplyContent("");
    setNoteContent("");
    api.get(`/requests/${requestId}`)
      .then((res) => setRequest(res.data))
      .finally(() => setLoading(false));
  }, [requestId]);

  // Scroll to bottom of messages when they load or a new one arrives
  useEffect(() => {
    if (request?.messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [request?.messages.length]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  async function updateStatus(status: RequestStatus) {
    if (!request) return;
    await api.patch(`/requests/${request.id}`, { status });
    setRequest((prev) => prev ? { ...prev, status } : prev);
    onStatusChange(request.id, status);
  }

  async function updateAssignment(assignedToId: string | null) {
    if (!request) return;
    const { data } = await api.patch(`/requests/${request.id}`, { assignedToId });
    setRequest((prev) => prev ? { ...prev, assignedTo: data.assignedTo } : prev);
    onAssignmentChange(request.id, data.assignedTo);
  }

  async function sendReply() {
    if (!request || !replyContent.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const { data } = await api.post(`/requests/${request.id}/messages`, { content: replyContent });
      setRequest((prev) => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
      setReplyContent("");
    } finally {
      setSendingReply(false);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!request || !noteContent.trim()) return;
    setSendingNote(true);
    try {
      const { data } = await api.post(`/requests/${request.id}/comments`, { content: noteContent });
      setRequest((prev) => prev ? { ...prev, comments: [...prev.comments, data] } : prev);
      setNoteContent("");
    } finally {
      setSendingNote(false);
    }
  }

  function copyLink() {
    if (!request?.studentToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/request/${request.studentToken}`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  if (!requestId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl" style={{ maxHeight: "96vh" }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          {loading || !request ? (
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 truncate">{request.subject}</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[request.status]}`}>
                  {request.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {request.course.name} · {request.requestType.name} · {request.studentName}
                <span className="mx-1.5 text-gray-300">·</span>
                <a href={`mailto:${request.studentEmail}`} className="hover:underline">{request.studentEmail}</a>
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="text-gray-400">{new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </p>
            </div>
          )}
          <button onClick={onClose} className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading || !request ? (
            <div className="flex items-center justify-center py-16 text-gray-400">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-gray-100" style={{ minHeight: "400px" }}>

              {/* Left column: message thread */}
              <div className="flex flex-col gap-4 p-6">
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Thread</p>

                  <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "420px" }}>
                    {/* Initial request as first student message */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-800">
                        <p className="mb-0.5 text-xs font-medium text-gray-500">{request.studentName}</p>
                        <p className="whitespace-pre-wrap">{request.description}</p>
                        <p className="mt-1 text-right text-xs text-gray-400">
                          {new Date(request.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    {request.messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "STAFF" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender === "STAFF"
                            ? "bg-gray-900 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}>
                          <p className={`mb-0.5 text-xs font-medium ${msg.sender === "STAFF" ? "text-gray-300" : "text-gray-500"}`}>
                            {msg.sender === "STUDENT" ? request.studentName : (msg.staffName ?? "Staff")}
                          </p>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className={`mt-1 text-right text-xs ${msg.sender === "STAFF" ? "text-gray-500" : "text-gray-400"}`}>
                            {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="mt-auto space-y-2">
                    <textarea
                      rows={3}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Reply to student… (Enter to send, Shift+Enter for new line)"
                      maxLength={5000}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{replyContent.length}/5000</span>
                      <button
                        type="submit"
                        disabled={sendingReply || !replyContent.trim()}
                        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
                      >
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right column: controls + notes */}
              <div className="flex flex-col gap-4 p-6">
                {/* Status + Assignment */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">Status</label>
                    <select
                      value={request.status}
                      onChange={(e) => updateStatus(e.target.value as RequestStatus)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">Assigned To</label>
                    <select
                      value={request.assignedTo?.id ?? ""}
                      onChange={(e) => updateAssignment(e.target.value || null)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Internal Notes */}
                <div className="flex flex-1 flex-col gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Internal Notes
                    {request.comments.length > 0 && (
                      <span className="ml-1 font-normal text-gray-300">({request.comments.length})</span>
                    )}
                    <span className="ml-1 font-normal normal-case text-gray-400">— staff only</span>
                  </p>

                  {request.comments.length > 0 ? (
                    <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "320px" }}>
                      {request.comments.map((c) => (
                        <div key={c.id} className="rounded-md border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span className="font-medium text-gray-700">{c.author.name}</span>
                            <span className="rounded bg-gray-200 px-1.5 py-0.5">{c.author.role}</span>
                            <span>{new Date(c.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                          <p className="text-sm text-gray-700">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No notes yet.</p>
                  )}

                  <form onSubmit={addNote} className="mt-auto space-y-2">
                    <textarea
                      rows={3}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add an internal note..."
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sendingNote || !noteContent.trim()}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40"
                    >
                      {sendingNote ? "Saving..." : "Add Note"}
                    </button>
                  </form>
                </div>

                {/* Footer links */}
                <div className="flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                  <button onClick={copyLink} className="hover:text-gray-700 underline underline-offset-2">
                    {linkCopied ? "Copied!" : "Copy student link"}
                  </button>
                  <Link to={`/dashboard/requests/${request.id}`} onClick={onClose} className="hover:text-gray-700 underline underline-offset-2">
                    Full details page →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
