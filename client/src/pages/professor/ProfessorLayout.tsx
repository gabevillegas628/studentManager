import { NavLink, Outlet } from "react-router-dom";

export default function ProfessorLayout() {
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
          <NavLink to="/dashboard" end className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/dashboard/courses" className={linkClass}>
            Courses
          </NavLink>
          <NavLink to="/dashboard/settings" className={linkClass}>
            Settings
          </NavLink>
        </nav>
      </div>
      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  );
}
