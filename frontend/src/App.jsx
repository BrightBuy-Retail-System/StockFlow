import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import CatalogPage from './pages/CatalogPage';
import AuthCartPage from './pages/AuthCartPage';
import OrdersPage from './pages/OrdersPage';
import LogisticsPage from './pages/LogisticsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PaymentPage from './pages/PaymentPage';
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
          <Route path="/auth-cart" element={<AuthCartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/logistics" element={<LogisticsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Routes guarded by JWT & Role */}
          <Route element={<ProtectedRoute allowedRoles={[1]} />}>
            <Route path="/customer-dashboard" element={<CustomerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[2, 3, 4]} />}>
            <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[3, 4]} />}>
            <Route path="/system-administrator" element={<SystemAdministrator />} />
          </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}