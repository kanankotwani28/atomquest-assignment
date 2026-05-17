import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import EmployeeDashboard from "./pages/employee/Dashboard";
import ManagerDashboard from "./pages/manager/Dashboard";

const AdminDashboard = () => (
  <div className="p-8 text-xl">Admin Dashboard — Phase 5</div>
);
const Unauthorized = () => (
  <div className="p-8 text-red-500">403 — Access denied.</div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/employee/*"
        element={
          <ProtectedRoute roles={["EMPLOYEE"]}>
            <EmployeeDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute roles={["MANAGER"]}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
