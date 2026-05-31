import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";

type RequestStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "DENIED" | "CLOSED";
type MessageSender = "STUDENT" | "STAFF";

interface ThreadMessage {
  id: string;
  content: string;
  sender: MessageSender;
  staffName: string | null;
  createdAt: string;
}

interface ThreadData {
  id: string;
  subject: string;
  description: string;
  status: RequestStatus;
  studentName: string;
  createdAt: string;
  courseName: string;
  requestTypeName: string;
  messages: ThreadMessage[];
}

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
  CLOSED: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
  CLOSED: "Closed",
};

const CLOSED_STATUSES: RequestStatus[] = ["APPROVED", "DENIED", "CLOSED"];

export default function StudentThread() {
  const { token } = useParams<{ token: string }>();
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/messages/thread/${token}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null; }
        return res.json();
      })
      .then((data) => { if (data) setThread(data); })
      .catch(() => setNotFound(true));
  }, [token]);

  useEffect(() => {
    if (thread?.messages.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread?.messages.length]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setReplyError("");
    try {
      const res = await fetch(`/api/messages/thread/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!res.ok) {
        const err = await res.json();
        setReplyError(err.error || "Failed to send reply.");
        return;
      }
      const newMessage: ThreadMessage = await res.json();
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, newMessage] } : prev
      );
      setReplyContent("");
    } catch {
      setReplyError("Failed to send reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Request Not Found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This link may be invalid or expired. Check your confirmation email for the correct link.
        </p>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-gray-400">Loading...</div>
    );
  }

  const isClosed = CLOSED_STATUSES.includes(thread.status);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">{thread.courseName} · {thread.requestTypeName}</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">{thread.subject}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[thread.status]}`}>
            {STATUS_LABELS[thread.status]}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Submitted {new Date(thread.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Message thread */}
      <div className="mb-6 space-y-3">
        {/* Original request as first bubble */}
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg bg-gray-900 px-4 py-3 text-sm text-white">
            <p className="whitespace-pre-wrap">{thread.description}</p>
            <p className="mt-1.5 text-right text-xs text-gray-400">
              {new Date(thread.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {thread.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "STUDENT" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                msg.sender === "STUDENT"
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-800"
              }`}
            >
              {msg.sender === "STAFF" && msg.staffName && (
                <p className="mb-1 text-xs font-medium text-gray-500">{msg.staffName}</p>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className={`mt-1.5 text-right text-xs ${msg.sender === "STUDENT" ? "text-gray-400" : "text-gray-400"}`}>
                {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply area */}
      {isClosed ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
          This request is {STATUS_LABELS[thread.status].toLowerCase()} and no longer accepting replies.
        </div>
      ) : (
        <form onSubmit={handleReply} className="space-y-3">
          {replyError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{replyError}</p>
          )}
          <textarea
            rows={4}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            maxLength={5000}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{replyContent.length}/5000</span>
            <button
              type="submit"
              disabled={submitting || !replyContent.trim()}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
