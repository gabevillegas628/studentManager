import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SubmitRequest() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/c/${code.trim()}`);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 pt-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900">
        Student Request Manager
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        Enter your class code to submit a request to your professor.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 flex max-w-xs gap-3">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Class code or slug"
          required
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Go
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-400">
        Already submitted? Enter your class code above to check your request status.
      </p>
    </div>
  );
}
