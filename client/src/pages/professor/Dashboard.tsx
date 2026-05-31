import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/client";
import type { StudentRequest, RequestStatus, Course, User } from "../../types";
import RequestModal from "./RequestModal";

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
  CLOSED: "Closed",
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
  CLOSED: "bg-green-50 text-green-700",
};

const STATUS_BORDER_COLORS: Record<RequestStatus, string> = {
  PENDING: "border-amber-300",
  IN_REVIEW: "border-blue-300",
  APPROVED: "border-green-300",
  DENIED: "border-red-300",
  CLOSED: "border-green-300",
};

const selectClass =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

type SortField = "createdAt" | "studentName" | "course" | "requestType" | "subject" | "status" | "assignedTo";

function getSortValue(r: StudentRequest, field: SortField): string {
  switch (field) {
    case "createdAt": return r.createdAt;
    case "studentName": return r.studentName.toLowerCase();
    case "course": return r.course.name.toLowerCase();
    case "requestType": return r.requestType.name.toLowerCase();
    case "subject": return r.subject.toLowerCase();
    case "status": return r.status;
    case "assignedTo": return r.assignedTo?.name?.toLowerCase() ?? "";
  }
}

export default function Dashboard() {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTypeId, setFilterTypeId] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [hasNew, setHasNew] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);

  const activeRequestIdRef = useRef(activeRequestId);
  activeRequestIdRef.current = activeRequestId;

  useEffect(() => {
    api.get("/courses").then((res) => setCourses(res.data));
    api.get("/users").then((res) => setStaff(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const es = new EventSource(`/api/events?token=${token}`);
    es.addEventListener("new_request", () => { fetchRequests(); setHasNew(true); });
    es.addEventListener("new_message", () => { fetchRequests(); setHasNew(true); });
    return () => es.close();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterTypeId, filterCourse]);

  function fetchRequests() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterTypeId) params.set("requestTypeId", filterTypeId);
    if (filterCourse) params.set("courseId", filterCourse);
    params.set("page", String(page));
    api.get(`/requests?${params}`).then((res) => {
      setRequests(res.data.data);
      setTotalPages(res.data.totalPages);
    });
  }

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterTypeId, filterCourse, page]);

  const typeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of requests) {
      if (!seen.has(r.requestType.id)) seen.set(r.requestType.id, r.requestType.name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [requests]);

  const sortedRequests = useMemo(() => {
    let filtered = requests;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = requests.filter((r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.course.name.toLowerCase().includes(q) ||
        r.requestType.name.toLowerCase().includes(q) ||
        STATUS_LABELS[r.status].toLowerCase().includes(q) ||
        (r.assignedTo?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [requests, search, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  async function updateStatus(id: string, status: RequestStatus) {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await api.patch(`/requests/${id}`, { status });
    } catch {
      fetchRequests();
    }
  }

  function SortHeader({ field, children }: { field: SortField; children: React.ReactNode }) {
    const active = sortField === field;
    return (
      <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort(field)}>
        <span className="inline-flex items-center gap-1">
          {children}
          {active && <span className="text-gray-400">{sortDir === "asc" ? "▲" : "▼"}</span>}
        </span>
      </th>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Student Requests</h1>

      <div className="mt-6 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requests..."
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-gray-500 focus:outline-none w-56"
        />
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={selectClass}>
          <option value="">All Courses</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={filterTypeId} onChange={(e) => setFilterTypeId(e.target.value)} className={selectClass}>
          <option value="">All Types</option>
          {typeOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          onClick={() => { fetchRequests(); setHasNew(false); }}
          className="relative rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          {hasNew && (
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
          )}
          Refresh
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <SortHeader field="createdAt">Date</SortHeader>
              <SortHeader field="studentName">Student</SortHeader>
              <SortHeader field="course">Course</SortHeader>
              <SortHeader field="requestType">Type</SortHeader>
              <SortHeader field="subject">Subject</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="assignedTo">Assigned To</SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedRequests.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => setActiveRequestId(r.id)}
              >
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-gray-900">{r.studentName}</td>
                <td className="px-4 py-3 text-gray-500">{r.course.name}</td>
                <td className="px-4 py-3 text-gray-500">{r.requestType.name}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.subject}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value as RequestStatus)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${STATUS_COLORS[r.status]} ${STATUS_BORDER_COLORS[r.status]} cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-400`}
                  >
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {r.assignedTo?.name ?? <span className="text-gray-300">Unassigned</span>}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  No requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {page} of {totalPages}</span>
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

      <RequestModal
        requestId={activeRequestId}
        staff={staff}
        onClose={() => setActiveRequestId(null)}
        onStatusChange={(id, status) =>
          setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
        }
        onAssignmentChange={(id, assignedTo) =>
          setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, assignedTo: assignedTo ?? undefined } : r)))
        }
      />
    </div>
  );
}
