import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/client";
import type { RequestStatus } from "../types";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

const STATUS_COLORS: Record<RequestStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  DENIED: "bg-red-50 text-red-700",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  DENIED: "Denied",
};

interface CourseRequestType {
  id: string;
  name: string;
  acceptsAttachments: boolean;
}

interface CourseInfo {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  active: boolean;
  owner: { name: string };
  requestTypes: CourseRequestType[];
}

interface StatusResult {
  id: string;
  subject: string;
  status: RequestStatus;
  createdAt: string;
  requestType: { id: string; name: string };
}

export default function ClassSubmit() {
  const { code } = useParams<{ code: string }>();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"submit" | "status">("submit");

  // Submit form state
  const [form, setForm] = useState({
    requestTypeId: "",
    studentName: "",
    studentEmail: "",
    subject: "",
    description: "",
  });

  // Status check state
  const [lookupEmail, setLookupEmail] = useState("");
  const [statusResults, setStatusResults] = useState<StatusResult[]>([]);
  const [statusError, setStatusError] = useState("");
  const [statusLoaded, setStatusLoaded] = useState(false);

  useEffect(() => {
    api
      .get(`/courses/lookup/${code}`)
      .then((res) => {
        setCourse(res.data);
        if (res.data.requestTypes?.length > 0) {
          setForm((prev) => ({ ...prev, requestTypeId: res.data.requestTypes[0].id }));
        }
      })
      .catch(() => setNotFound(true));
  }, [code]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/requests", {
        ...form,
        courseId: course!.id,
      });
      setSubmitted(data.id);
    } catch {
      setError("Failed to submit request. Please try again.");
    }
  }

  async function handleStatusCheck(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatusError("");
    setStatusResults([]);
    setStatusLoaded(false);
    try {
      const params = new URLSearchParams({
        courseId: course!.id,
        studentEmail: lookupEmail,
      });
      const { data } = await api.get(`/requests/lookup?${params}`);
      setStatusResults(data);
      setStatusLoaded(true);
    } catch {
      setStatusError("Failed to look up requests. Please try again.");
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Course Not Found
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The class code or link you used doesn't match any course. Please
          double-check with your professor.
        </p>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-gray-900 underline underline-offset-4"
        >
          Go to homepage
        </Link>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-gray-400">
        Loading...
      </div>
    );
  }

  if (!course.active) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">{course.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{course.owner.name}</p>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-800">
            This course is not currently accepting requests.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 pt-16 text-center">
        <div className="rounded-lg border border-gray-200 bg-white p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Request Submitted
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Your request has been submitted to {course.name}.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You can check the status of your requests anytime using the
            "Check Status" tab.
          </p>
          <button
            onClick={() => {
              setSubmitted(null);
              setMode("status");
              setLookupEmail(form.studentEmail);
            }}
            className="mt-4 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 ${
      active
        ? "border-gray-900 text-gray-900"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    }`;

  return (
    <div className="mx-auto max-w-lg px-6 pt-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{course.name}</h1>
        <p className="mt-1 text-sm text-gray-500">{course.owner.name}</p>
      </div>

      <div className="mb-6 flex border-b border-gray-200">
        <button
          onClick={() => setMode("submit")}
          className={tabClass(mode === "submit")}
        >
          Submit Request
        </button>
        <button
          onClick={() => setMode("status")}
          className={tabClass(mode === "status")}
        >
          Check Status
        </button>
      </div>

      {mode === "submit" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Request Type
            </label>
            <select
              value={form.requestTypeId}
              onChange={(e) => updateField("requestTypeId", e.target.value)}
              className={inputClass}
            >
              {course.requestTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                value={form.studentName}
                onChange={(e) => updateField("studentName", e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Your Email
              </label>
              <input
                type="email"
                value={form.studentEmail}
                onChange={(e) => updateField("studentEmail", e.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              value={form.subject}
              onChange={(e) => updateField("subject", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Submit Request
          </button>
        </form>
      )}

      {mode === "status" && (
        <div>
          <p className="text-sm text-gray-500">
            Enter your email to see your submitted requests for this course.
          </p>

          <form onSubmit={handleStatusCheck} className="mt-4 flex gap-3">
            <input
              type="email"
              value={lookupEmail}
              onChange={(e) => setLookupEmail(e.target.value)}
              placeholder="Your email"
              required
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Look Up
            </button>
          </form>

          {statusError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusError}
            </p>
          )}

          {statusLoaded && statusResults.length === 0 && (
            <p className="mt-6 text-center text-sm text-gray-400">
              No requests found for that email.
            </p>
          )}

          {statusResults.length > 0 && (
            <div className="mt-4 space-y-3">
              {statusResults.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{r.subject}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {r.requestType.name} &middot;{" "}
                        {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
