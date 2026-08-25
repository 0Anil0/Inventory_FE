import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const roleName = typeof user?.role === 'object' ? user.role.name : (user?.role || 'user');

  return (
    <header className="dashboard-header">
      <div className="brand-logo">
        <ShieldCheck size={28} className="brand-icon" />
        <h2>RAVI INVENTORY</h2>
      </div>
      {user && (
        <div className="user-profile">
          <div className="avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="username">{user.username}</span>
            <span className="role-badge">{roleName}</span>
          </div>
          <button className="logout-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};
