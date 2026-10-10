import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import CatalogPage from './pages/CatalogPage';
import AuthCartPage from './pages/AuthCartPage';
import OrdersPage from './pages/OrdersPage';
import LogisticsPage from './pages/LogisticsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import LoginPage from './pages/Login';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import SystemAdministrator from './pages/SystemAdministrator';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/products" element={<CatalogPage />} />
          <Route path="/auth-cart" element={<AuthCartPage />} />
          <Route path="/cart" element={<AuthCartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/checkout" element={<OrdersPage defaultTab="checkout" />} />
          <Route path="/payment" element={<Navigate to="/checkout" replace />} />
          <Route path="/logistics" element={<LogisticsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes guarded by JWT & Role */}
          <Route element={<ProtectedRoute allowedRoles={[1]} />}>
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[2]} />}>
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[3]} />}>
            <Route path="/system-administrator" element={<SystemAdministrator />} />
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}