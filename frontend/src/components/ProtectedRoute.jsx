import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Why this component: wraps any route that requires login.
// If no user is present, redirects to /login automatically.
// The `roles` prop lets you restrict a route to specific roles.
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  // Still checking localStorage / calling /me — show nothing yet
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If roles specified, check the user has the right one
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;