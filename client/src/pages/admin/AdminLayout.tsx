import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium ${
      isActive
        ? "text-gray-900"
        : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="flex items-center justify-between border-b border-gray-200 py-4">
        <nav className="flex gap-6">
          <NavLink to="/admin" end className={linkClass}>
            Users
          </NavLink>
          <NavLink to="/admin/courses" className={linkClass}>
            Courses
          </NavLink>
        </nav>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-400">{user.name}</span>
          )}
          <NavLink
            to="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Dashboard
          </NavLink>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Log Out
          </button>
        </div>
      </div>
      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  );
}
