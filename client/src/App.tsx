import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/professor/Login";
import Dashboard from "./pages/professor/Dashboard";
import Courses from "./pages/professor/Courses";
import RequestDetail from "./pages/professor/RequestDetail";
import ProfessorLayout from "./pages/professor/ProfessorLayout";
import AdminLayout from "./pages/admin/AdminLayout";
import UserManagement from "./pages/admin/UserManagement";
import CourseList from "./pages/admin/CourseList";
import SubmitRequest from "./pages/SubmitRequest";
import ClassSubmit from "./pages/ClassSubmit";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <BrowserRouter>
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            Student Request Manager
          </Link>
          <div className="flex gap-6 text-sm">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Submit Request
            </Link>
            <Link to="/login" className="text-gray-600 hover:text-gray-900">
              Staff Login
            </Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<SubmitRequest />} />
        <Route path="/c/:code" element={<ClassSubmit />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<ProfessorLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="requests/:id" element={<RequestDetail />} />
          </Route>
        </Route>
        <Route element={<RequireAuth roles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<UserManagement />} />
            <Route path="courses" element={<CourseList />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
