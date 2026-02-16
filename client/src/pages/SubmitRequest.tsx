import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import type { RequestType } from "../types";

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: "EXAM_MAKEUP", label: "Exam Makeup" },
  { value: "ABSENCE", label: "Absence" },
  { value: "GRADING_DISCREPANCY", label: "Grading Discrepancy" },
  { value: "MISSED_ASSIGNMENT", label: "Missed Assignment" },
  { value: "OTHER", label: "Other" },
];

export default function SubmitRequest() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    type: "EXAM_MAKEUP" as RequestType,
    studentName: "",
    studentEmail: "",
    courseName: "",
    subject: "",
    description: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/requests", form);
      setSubmitted(data.id);
    } catch {
      setError("Failed to submit request. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div className="page">
        <h1>Request Submitted!</h1>
        <p>Your request has been submitted successfully.</p>
        <p>
          Your tracking ID: <strong>{submitted}</strong>
        </p>
        <p>Save this ID to check the status of your request later.</p>
        <Link to={`/status/${submitted}`}>Check Status</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Submit a Request</h1>
      <p>
        Already submitted?{" "}
        <Link to="/status">Check your request status</Link>
      </p>
      <form onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}

        <label>
          Request Type
          <select
            value={form.type}
            onChange={(e) => updateField("type", e.target.value)}
          >
            {REQUEST_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Your Name
          <input
            value={form.studentName}
            onChange={(e) => updateField("studentName", e.target.value)}
            required
          />
        </label>

        <label>
          Your Email
          <input
            type="email"
            value={form.studentEmail}
            onChange={(e) => updateField("studentEmail", e.target.value)}
            required
          />
        </label>

        <label>
          Course Name
          <input
            value={form.courseName}
            onChange={(e) => updateField("courseName", e.target.value)}
            required
          />
        </label>

        <label>
          Subject
          <input
            value={form.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            required
          />
        </label>

        <label>
          Description
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            required
          />
        </label>

        <button type="submit">Submit Request</button>
      </form>
    </div>
  );
}
