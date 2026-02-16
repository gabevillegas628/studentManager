import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import type { StudentRequest, RequestStatus, RequestType } from "../types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
};

const TYPE_LABELS: Record<RequestType, string> = {
  EXAM_MAKEUP: "Exam Makeup",
  ABSENCE: "Absence",
  GRADING_DISCREPANCY: "Grading Discrepancy",
  MISSED_ASSIGNMENT: "Missed Assignment",
  OTHER: "Other",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterType) params.set("type", filterType);

    api.get(`/requests?${params}`).then((res) => setRequests(res.data));
  }, [filterStatus, filterType]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <div className="page">
      <header className="dashboard-header">
        <h1>Student Requests</h1>
        <button onClick={handleLogout}>Log Out</button>
      </header>

      <div className="filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <table className="request-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Course</th>
            <th>Type</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Assigned To</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleDateString()}</td>
              <td>{r.studentName}</td>
              <td>{r.courseName}</td>
              <td>{TYPE_LABELS[r.type]}</td>
              <td>
                <Link to={`/requests/${r.id}`}>{r.subject}</Link>
              </td>
              <td>
                <span className={`status status-${r.status.toLowerCase()}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </td>
              <td>{r.assignedTo?.name ?? "Unassigned"}</td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No requests found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
