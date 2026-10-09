import { Navigate, Outlet } from 'react-router-dom';

// Helper to decode JWT claims without external libraries
function getClaimsFromToken(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token');
  const claims = getClaimsFromToken(token);

  // 1. If no token, invalid token, or expired token -> Send to Login
  const isExpired = claims?.exp && Date.now() >= claims.exp * 1000;
  if (!claims || isExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  // 2. Extract verified role from the cryptographically signed JWT
  const userRole = Number(claims.role_id);

  // 3. If route requires specific roles and user's role does not match
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect user to their own role-appropriate dashboard
    if (userRole === 1) return <Navigate to="/customer-dashboard" replace />;
    if (userRole === 2) return <Navigate to="/manager-dashboard" replace />;
    if (userRole === 3 || userRole === 4) return <Navigate to="/system-administrator" replace />;
    return <Navigate to="/" replace />;
  }

  // 4. Authenticated & authorized
  return <Outlet />;
}
