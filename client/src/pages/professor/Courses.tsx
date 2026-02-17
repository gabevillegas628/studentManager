import { useEffect, useState } from "react";
import api from "../../api/client";
import type { Course, RequestType } from "../../types";

const inputClass =
  "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [error, setError] = useState("");

  // TA management
  const [managingCourseId, setManagingCourseId] = useState<string | null>(null);
  const [taEmail, setTaEmail] = useState("");
  const [taError, setTaError] = useState("");
  const [courseDetail, setCourseDetail] = useState<Course | null>(null);

  // Request type management
  const [managingTypesId, setManagingTypesId] = useState<string | null>(null);
  const [typesDetail, setTypesDetail] = useState<RequestType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeAttachments, setNewTypeAttachments] = useState(false);
  const [typeError, setTypeError] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    const { data } = await api.get("/courses");
    setCourses(data);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/courses", {
        name: newName,
        slug: newSlug || undefined,
      });
      setNewName("");
      setNewSlug("");
      setShowCreate(false);
      loadCourses();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response.data
              .error
          : "Failed to create course";
      setError(msg);
    }
  }

  async function toggleActive(course: Course) {
    await api.patch(`/courses/${course.id}`, { active: !course.active });
    loadCourses();
  }

  async function openManage(courseId: string) {
    setManagingCourseId(courseId);
    setTaEmail("");
    setTaError("");
    const { data } = await api.get(`/courses/${courseId}`);
    setCourseDetail(data);
  }

  async function addTA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTaError("");
    try {
      await api.post(`/courses/${managingCourseId}/members`, {
        email: taEmail,
      });
      setTaEmail("");
      // Refresh detail
      const { data } = await api.get(`/courses/${managingCourseId}`);
      setCourseDetail(data);
      loadCourses();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response.data
              .error
          : "Failed to add TA";
      setTaError(msg);
    }
  }

  async function removeTA(userId: string) {
    await api.delete(`/courses/${managingCourseId}/members/${userId}`);
    const { data } = await api.get(`/courses/${managingCourseId}`);
    setCourseDetail(data);
    loadCourses();
  }

  async function openManageTypes(courseId: string) {
    setManagingTypesId(courseId);
    setNewTypeName("");
    setNewTypeAttachments(false);
    setTypeError("");
    const { data } = await api.get(`/courses/${courseId}`);
    setTypesDetail(data.requestTypes || []);
  }

  async function addRequestType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTypeError("");
    try {
      await api.post(`/courses/${managingTypesId}/request-types`, {
        name: newTypeName,
        acceptsAttachments: newTypeAttachments,
      });
      setNewTypeName("");
      setNewTypeAttachments(false);
      const { data } = await api.get(`/courses/${managingTypesId}`);
      setTypesDetail(data.requestTypes || []);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response.data
              .error
          : "Failed to add request type";
      setTypeError(msg);
    }
  }

  async function toggleTypeActive(typeId: string, active: boolean) {
    await api.patch(`/courses/${managingTypesId}/request-types/${typeId}`, { active });
    const { data } = await api.get(`/courses/${managingTypesId}`);
    setTypesDetail(data.requestTypes || []);
  }

  async function toggleTypeAttachments(typeId: string, acceptsAttachments: boolean) {
    await api.patch(`/courses/${managingTypesId}/request-types/${typeId}`, { acceptsAttachments });
    const { data } = await api.get(`/courses/${managingTypesId}`);
    setTypesDetail(data.requestTypes || []);
  }

  async function duplicateCourse(courseId: string) {
    try {
      await api.post(`/courses/${courseId}/duplicate`);
      loadCourses();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response: { data: { error: string } } }).response.data
              .error
          : "Failed to duplicate course";
      setError(msg);
    }
  }

  function getShareableUrl(course: Course) {
    const base = window.location.origin;
    return `${base}/c/${course.slug || course.code}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">My Courses</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          {showCreate ? "Cancel" : "New Course"}
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mt-4 rounded-lg border border-gray-200 p-4 space-y-3"
        >
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Course Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="CS 101 - Intro to Computer Science"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custom Slug{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="cs101-spring-2026"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">
              Creates a friendly URL like /c/cs101-spring-2026
            </p>
          </div>
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Create Course
          </button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {courses.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-medium text-gray-900">{c.name}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {c.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Code: <span className="font-mono">{c.code}</span>
                  {c.slug && (
                    <>
                      {" "}
                      &middot; Slug: <span className="font-mono">{c.slug}</span>
                    </>
                  )}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {c._count?.requests ?? 0} requests &middot;{" "}
                  {c._count?.members ?? 0} TAs
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleActive(c)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => duplicateCourse(c.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Duplicate
                </button>
                <button
                  onClick={() => openManageTypes(c.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Request Types
                </button>
                <button
                  onClick={() => openManage(c.id)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  Manage TAs
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-400">Share link:</span>
              <code className="rounded bg-gray-50 px-2 py-0.5 text-xs text-gray-700 select-all">
                {getShareableUrl(c)}
              </code>
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <p className="py-12 text-center text-sm text-gray-400">
            No courses yet. Create one to get started.
          </p>
        )}
      </div>

      {/* TA Management Modal */}
      {managingCourseId && courseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Manage TAs
              </h2>
              <button
                onClick={() => setManagingCourseId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-500">{courseDetail.name}</p>

            <form onSubmit={addTA} className="mt-4 flex gap-2">
              <input
                value={taEmail}
                onChange={(e) => setTaEmail(e.target.value)}
                placeholder="TA email address"
                type="email"
                required
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Add
              </button>
            </form>
            {taError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {taError}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {courseDetail.members?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {m.user.name}
                    </p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                  <button
                    onClick={() => removeTA(m.user.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {(!courseDetail.members || courseDetail.members.length === 0) && (
                <p className="text-sm text-gray-400">No TAs assigned yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Request Types Management Modal */}
      {managingTypesId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Request Types
              </h2>
              <button
                onClick={() => setManagingTypesId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={addRequestType} className="mt-4 space-y-2">
              <div className="flex gap-2">
                <input
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder="New request type name"
                  required
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Add
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newTypeAttachments}
                  onChange={(e) => setNewTypeAttachments(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Accepts attachments
              </label>
            </form>
            {typeError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {typeError}
              </p>
            )}

            <div className="mt-4 space-y-2">
              {typesDetail.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2"
                >
                  <div>
                    <p className={`text-sm font-medium ${t.active ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {t.name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <label className="flex items-center gap-1 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={t.acceptsAttachments}
                          onChange={(e) => toggleTypeAttachments(t.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        Attachments
                      </label>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTypeActive(t.id, !t.active)}
                    className={`text-xs ${t.active ? "text-red-600 hover:text-red-800" : "text-green-600 hover:text-green-800"}`}
                  >
                    {t.active ? "Disable" : "Enable"}
                  </button>
                </div>
              ))}
              {typesDetail.length === 0 && (
                <p className="text-sm text-gray-400">No request types yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
