import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import type { StudentRequest, RequestStatus, User } from "../types";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "DENIED", label: "Denied" },
];

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

  async function addComment(e: FormEvent) {
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

  if (!request) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <button onClick={() => navigate("/dashboard")}>&larr; Back</button>
      <h1>{request.subject}</h1>

      <div className="request-meta">
        <p>
          <strong>Student:</strong> {request.studentName} ({request.studentEmail}
          )
        </p>
        <p>
          <strong>Course:</strong> {request.courseName}
        </p>
        <p>
          <strong>Type:</strong> {request.type.replace(/_/g, " ")}
        </p>
        <p>
          <strong>Submitted:</strong>{" "}
          {new Date(request.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="request-description">
        <h3>Description</h3>
        <p>{request.description}</p>
      </div>

      <div className="request-actions">
        <label>
          Status
          <select
            value={request.status}
            onChange={(e) => updateStatus(e.target.value as RequestStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Assigned To
          <select
            value={request.assignedTo?.id ?? ""}
            onChange={(e) => assignTo(e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="comments-section">
        <h3>Comments</h3>
        {request.comments?.map((c) => (
          <div key={c.id} className="comment">
            <strong>
              {c.author.name} ({c.author.role})
            </strong>
            <span className="comment-date">
              {new Date(c.createdAt).toLocaleString()}
            </span>
            <p>{c.content}</p>
          </div>
        ))}

        <form onSubmit={addComment}>
          <textarea
            rows={3}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
          />
          <button type="submit">Add Comment</button>
        </form>
      </div>
    </div>
  );
}
