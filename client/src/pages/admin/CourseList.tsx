import { useEffect, useState } from "react";
import api from "../../api/client";
import type { Course } from "../../types";

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadCourses();
  }, [page]);

  async function loadCourses() {
    const { data } = await api.get(`/courses?page=${page}`);
    setCourses(data.data);
    setTotalPages(data.totalPages);
  }

  async function toggleActive(course: Course) {
    await api.patch(`/courses/${course.id}`, { active: !course.active });
    loadCourses();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">All Courses</h1>

      <div className="mt-6">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
              <th className="pb-3 font-medium">Course</th>
              <th className="pb-3 font-medium">Code</th>
              <th className="pb-3 font-medium">Owner</th>
              <th className="pb-3 font-medium">Requests</th>
              <th className="pb-3 font-medium">TAs</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr
                key={c.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3">
                  <div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.slug && (
                      <span className="ml-2 text-xs text-gray-400">
                        /{c.slug}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 font-mono text-gray-600">{c.code}</td>
                <td className="py-3 text-gray-600">{c.owner?.name ?? "—"}</td>
                <td className="py-3 text-gray-600">
                  {c._count?.requests ?? 0}
                </td>
                <td className="py-3 text-gray-600">
                  {c._count?.members ?? 0}
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => toggleActive(c)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {courses.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            No courses found.
          </p>
        )}

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
    </div>
  );
}
