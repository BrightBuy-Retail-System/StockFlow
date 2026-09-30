import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  // If specific roles are required, verify user's role_id
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = Number(user.role_id);
    if (!allowedRoles.includes(userRole)) {
      // Redirect to their default dashboard based on role
      if (userRole === 1) return <Navigate to="/customer-dashboard" replace />;
      if (userRole === 2) return <Navigate to="/manager-dashboard" replace />;
      if (userRole === 3) return <Navigate to="/system-administrator" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
}
