import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, ShieldCheck, UserCheck, Database, Server, Clock } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const roleName = typeof user?.role === 'object' ? user.role.name : (user?.role || 'user');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-logo">
          <ShieldCheck size={28} className="brand-icon" />
          <h2>RAVI INVENTORY</h2>
        </div>
        <div className="user-profile">
          <div className="avatar">
            {user?.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="username">{user?.username}</span>
            <span className="role-badge">{roleName}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <div className="welcome-icon">
            <UserCheck size={36} />
          </div>
          <div className="welcome-text">
            <h1>Welcome, {user?.username}!</h1>
            <p>You have successfully logged in to the Ravi Inventory System.</p>
          </div>
        </div>

        <div className="status-grid">
          <div className="status-card">
            <Database size={24} className="card-icon" />
            <div className="card-content">
              <h3>PostgreSQL Database</h3>
              <p>Connected to <code>Inventory_Management</code></p>
            </div>
            <span className="status-dot online"></span>
          </div>

          <div className="status-card">
            <Server size={24} className="card-icon" />
            <div className="card-content">
              <h3>Backend API</h3>
              <p>Running on <code>http://localhost:5000</code></p>
            </div>
            <span className="status-dot online"></span>
          </div>

          <div className="status-card">
            <Clock size={24} className="card-icon" />
            <div className="card-content">
              <h3>Session Active</h3>
              <p>Role: <strong>{roleName.toUpperCase()}</strong></p>
            </div>
            <span className="status-dot active"></span>
          </div>
        </div>
      </main>
    </div>
  );
};
