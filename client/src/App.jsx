import { Routes, Route } from 'react-router-dom';
import RoleSelectPage from './pages/RoleSelectPage';
import CashierPage from './pages/CashierPage';
import BaristaPage from './pages/BaristaPage';
import ShiftReportPage from './pages/ShiftReportPage';

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<RoleSelectPage />} />
        <Route path="/cashier" element={<CashierPage />} />
        <Route path="/barista" element={<BaristaPage />} />
        <Route path="/report" element={<ShiftReportPage />} />
      </Routes>
    </div>
  );
}
