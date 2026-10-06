import React from 'react';
import { Select } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';
import { EnvironmentOutlined } from '@ant-design/icons';

export const Header: React.FC = () => {
  const { user, logout, activePlant, setActivePlant } = useAuth();
  const roleName = typeof user?.role === 'object' ? user.role.name : (user?.role || 'user');

  return (
    <header className="dashboard-header">
      <div className="brand-logo">
        <ShieldCheck size={28} className="brand-icon" />
        <h2>RAVI INVENTORY</h2>
      </div>

      {user && (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingRight: '24px' }}>
          {user.plants && user.plants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '24px', background: '#f8fafc', padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <EnvironmentOutlined size={16} style={{ color: '#6366f1', marginRight: '8px' }} />
              <Select
                value={activePlant?.id}
                onChange={(val) => {
                  const plant = user.plants!.find(p => p.id === val);
                  if (plant) setActivePlant(plant);
                }}
                variant="borderless"
                style={{ width: 200 }}
                dropdownStyle={{ minWidth: 200 }}
                options={user.plants.map(p => ({ label: `${p.name} (${p.code})`, value: p.id }))}
              />
            </div>
          )}
        </div>
      )}

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
