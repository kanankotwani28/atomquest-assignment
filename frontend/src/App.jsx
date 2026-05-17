import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder dashboards — we'll build these in Phase 2-4
const EmployeeDashboard = () => <div className="p-8 text-xl">Employee Dashboard — Phase 2</div>;
const ManagerDashboard  = () => <div className="p-8 text-xl">Manager Dashboard — Phase 3</div>;
const AdminDashboard    = () => <div className="p-8 text-xl">Admin Dashboard — Phase 5</div>;
const Unauthorized      = () => <div className="p-8 text-red-500">403 — You don't have access to this page.</div>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route path="/employee/*" element={
        <ProtectedRoute roles={['EMPLOYEE']}>
          <EmployeeDashboard />
        </ProtectedRoute>
      } />

      <Route path="/manager/*" element={
        <ProtectedRoute roles={['MANAGER']}>
          <ManagerDashboard />
        </ProtectedRoute>
      } />

      <Route path="/admin/*" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Root redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}