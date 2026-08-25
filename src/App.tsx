import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { UserManagementPage } from './pages/user-management';
import { InventoryTrackerPage } from './pages/inventory';
import { ItemTypesPage } from './pages/item-types';
import { UnitsPage } from './pages/units';
import { ProjectsPage } from './pages/projects';

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

  return user ? <Navigate to="/inventory" replace /> : <Navigate to="/login" replace />;
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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryTrackerPage />} />
              <Route path="/item-types" element={<ItemTypesPage />} />
              <Route path="/units" element={<UnitsPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
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
