import { useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import api from "../api/client";

interface StatusResult {
  id: string;
  status: string;
  type: string;
  subject: string;
  createdAt: string;
}

export default function CheckStatus() {
  const { id: paramId } = useParams<{ id: string }>();
  const [requestId, setRequestId] = useState(paramId || "");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState("");

  async function handleCheck(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      const { data } = await api.get(`/requests/${requestId}/status`);
      setResult(data);
    } catch {
      setError("Request not found. Please check your tracking ID.");
    }
  }

  return (
    <div className="page">
      <h1>Check Request Status</h1>
      <form onSubmit={handleCheck}>
        <label>
          Tracking ID
          <input
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            placeholder="Enter your request tracking ID"
            required
          />
        </label>
        <button type="submit">Check Status</button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="status-result">
          <h2>{result.subject}</h2>
          <p>
            <strong>Type:</strong> {result.type.replace(/_/g, " ")}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            <span className={`status status-${result.status.toLowerCase()}`}>
              {result.status.replace(/_/g, " ")}
            </span>
          </p>
          <p>
            <strong>Submitted:</strong>{" "}
            {new Date(result.createdAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
