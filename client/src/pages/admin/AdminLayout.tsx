import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${
      isActive
        ? "text-gray-900"
        : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="border-b border-gray-200 py-4">
        <nav className="flex gap-6">
          <NavLink to="/admin" end className={linkClass}>
            Users
          </NavLink>
          <NavLink to="/admin/courses" className={linkClass}>
            Courses
          </NavLink>
          <NavLink to="/admin/settings" className={linkClass}>
            Settings
          </NavLink>
          <NavLink
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Dashboard
          </NavLink>
        </nav>
      </div>
      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  );
}
