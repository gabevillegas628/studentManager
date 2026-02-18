import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/professor/Login";
import Dashboard from "./pages/professor/Dashboard";
import Courses from "./pages/professor/Courses";
import RequestDetail from "./pages/professor/RequestDetail";
import ProfessorLayout from "./pages/professor/ProfessorLayout";
import AdminLayout from "./pages/admin/AdminLayout";
import UserManagement from "./pages/admin/UserManagement";
import CourseList from "./pages/admin/CourseList";
import Home from "./pages/Home";
import SubmitRequest from "./pages/SubmitRequest";
import ClassSubmit from "./pages/ClassSubmit";
import Settings from "./pages/professor/Settings";
import RequireAuth from "./components/RequireAuth";

function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user") || "null")
  );

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user") || "null"));
  }, [location]);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          to={user ? "/dashboard" : "/"}
          className="text-lg font-semibold text-gray-900"
        >
          Student Request Manager
        </Link>
        <div className="flex items-center gap-6 text-sm">
          {user ? (
            <>
              <span className="text-gray-500">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/submit" className="text-gray-600 hover:text-gray-900">
                Submit Request
              </Link>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                Staff Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TopNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit" element={<SubmitRequest />} />
        <Route path="/c/:code" element={<ClassSubmit />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<ProfessorLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="requests/:id" element={<RequestDetail />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
        <Route element={<RequireAuth roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<UserManagement />} />
            <Route path="courses" element={<CourseList />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
