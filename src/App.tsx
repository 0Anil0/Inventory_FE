import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/login';
import { UserManagementPage } from './pages/user-management';
import { UnitsPage } from './pages/units';
import { ItemTypesPage } from './pages/item-types';
import { MakesPage } from './pages/makes';
import { VendorsPage } from './pages/vendors';
import { TermsAndConditionsPage } from './pages/terms-and-conditions';
import { PurchaseOrdersPage } from './pages/purchase-orders';
import { ApproverConfigPage } from './pages/approver-config';
import { StorageLocationsPage } from './pages/storage-locations';
import { InventoryTrackerPage } from './pages/inventory';
import { ProjectsPage } from './pages/projects';
import { ProjectAssignmentsPage } from './pages/project-assignments';
import GRNPage from './pages/grn';
import ReportsPage from './pages/reports';
import { ProjectCostingPage } from './pages/project-costing';

const RootRedirect: React.FC = () => {


  const { user, loading } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0b0f19]' : 'bg-slate-50'}`}>
        <Spin size="large" />
      </div>
    );
  }

  return user ? <Navigate to="/item-types" replace /> : <Navigate to="/login" replace />;
};

const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: isDark ? '#121826' : '#ffffff',
          colorBgElevated: isDark ? '#111827' : '#ffffff',
          borderRadius: 10,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/units" element={<UnitsPage />} />
              <Route path="/makes" element={<MakesPage />} />
              <Route path="/item-types" element={<ItemTypesPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/inventory" element={<InventoryTrackerPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/approver-config" element={<ApproverConfigPage />} />
              <Route path="/storage-locations" element={<StorageLocationsPage />} />
              <Route path="/grn" element={<GRNPage />} />
              <Route path="/project-assignments" element={<ProjectAssignmentsPage />} />
              <Route path="/project-costing" element={<ProjectCostingPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>


            <Route path="*" element={<Navigate to="/item-types" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
