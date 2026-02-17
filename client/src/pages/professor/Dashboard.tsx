import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/client";
import type { StudentRequest, RequestStatus, Course } from "../../types";

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
};

const selectClass =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

export default function Dashboard() {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    api.get("/courses").then((res) => setCourses(res.data));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterTypeId, filterCourse]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterTypeId) params.set("requestTypeId", filterTypeId);
    if (filterCourse) params.set("courseId", filterCourse);
    params.set("page", String(page));

    api.get(`/requests?${params}`).then((res) => {
      setRequests(res.data.data);
      setTotalPages(res.data.totalPages);
    });
  }, [filterStatus, filterTypeId, filterCourse, page]);

  // Build unique type options from loaded requests
  const typeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of requests) {
      if (!seen.has(r.requestType.id)) {
        seen.set(r.requestType.id, r.requestType.name);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [requests]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Student Requests
      </h1>

      <div className="mt-6 flex gap-3">
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className={selectClass}
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterTypeId}
          onChange={(e) => setFilterTypeId(e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {typeOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {requests.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-900">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-500">
                  {r.course.name}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.requestType.name}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/dashboard/requests/${r.id}`}
                    className="font-medium text-gray-900 underline underline-offset-4 decoration-gray-300 hover:decoration-gray-900"
                  >
                    {r.subject}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                  >
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.assignedTo?.name ?? (
                    <span className="text-gray-300">Unassigned</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-gray-400"
                >
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
