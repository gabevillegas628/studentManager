import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="mx-auto max-w-lg px-6 pt-24 text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        Student Request Manager
      </h1>
      <p className="mt-3 text-gray-500">
        Need to submit a request to your professor? Get started by entering your
        class code.
      </p>

      <Link
        to="/submit"
        className="mt-8 inline-block rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Submit a Request
      </Link>
    </div>
  );
}
