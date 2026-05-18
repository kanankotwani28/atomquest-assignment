import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login              from './pages/Login';
import ProtectedRoute     from './components/ProtectedRoute';
import ErrorBoundary      from './components/ErrorBoundary';
import EmployeeDashboard  from './pages/employee/Dashboard';
import EmployeeCheckIns   from './pages/employee/CheckIns';
import ManagerDashboard   from './pages/manager/Dashboard';
import ManagerCheckIns    from './pages/manager/CheckIns';
import AdminDashboard     from './pages/admin/Dashboard';

const Unauthorized = () => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#020817", color: "#EF4444", fontSize: 18 }}>
    403 — Access denied.
  </div>
);

/**
 * Toast timing constants (BRD spec):
 *   success = 3 000 ms
 *   error   = 5 000 ms
 *   warning = 4 000 ms  (custom toasts use toast() with duration)
 */
const TOAST_OPTIONS = {
  className: "toast-dark",
  success: {
    duration: 3000,
    className: "toast-dark toast-dark-success",
  },
  error: {
    duration: 5000,
    className: "toast-dark toast-dark-error",
  },
  // Custom / default toast (used for warnings)
  duration: 4000,
};

export default function App() {
  return (
    <ErrorBoundary>
      {/* Centralized Toaster — no per-page Toasters needed */}
      <Toaster
        position="top-right"
        toastOptions={TOAST_OPTIONS}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        <Route path="/employee/dashboard" element={
          <ProtectedRoute roles={['EMPLOYEE']}><EmployeeDashboard /></ProtectedRoute>
        } />
        <Route path="/employee/checkins" element={
          <ProtectedRoute roles={['EMPLOYEE']}><EmployeeCheckIns /></ProtectedRoute>
        } />

        <Route path="/manager/dashboard" element={
          <ProtectedRoute roles={['MANAGER']}><ManagerDashboard /></ProtectedRoute>
        } />
        <Route path="/manager/checkins" element={
          <ProtectedRoute roles={['MANAGER']}><ManagerCheckIns /></ProtectedRoute>
        } />

        <Route path="/admin/*" element={
          <ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
