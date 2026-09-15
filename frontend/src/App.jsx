import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import OverviewPage from './pages/OverviewPage';
import CatalogPage from './pages/CatalogPage';
import AuthCartPage from './pages/AuthCartPage';
import OrdersPage from './pages/OrdersPage';
import LogisticsPage from './pages/LogisticsPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/auth-cart" element={<AuthCartPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/logistics" element={<LogisticsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}