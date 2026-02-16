import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SubmitRequest from "./pages/SubmitRequest";
import RequestDetail from "./pages/RequestDetail";
import CheckStatus from "./pages/CheckStatus";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <nav className="main-nav">
        <Link to="/" className="nav-brand">
          Student Request Manager
        </Link>
        <div className="nav-links">
          <Link to="/">Submit Request</Link>
          <Link to="/status">Check Status</Link>
          <Link to="/login">Staff Login</Link>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<SubmitRequest />} />
        <Route path="/status" element={<CheckStatus />} />
        <Route path="/status/:id" element={<CheckStatus />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
