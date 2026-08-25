import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Tag, Dropdown, Button, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../context/AuthContext';
import {
  SafetyCertificateFilled,
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';

const { Header } = Layout;

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const roleName = (typeof user?.role === 'object' ? user.role.name : (user?.role || 'user')).toUpperCase();

  const navMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => {
        navigate('/dashboard');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined />,
      label: 'Stock Tracker',
      onClick: () => {
        navigate('/inventory');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/item-types',
      icon: <CodeSandboxOutlined />,
      label: 'Item Types',
      onClick: () => {
        navigate('/item-types');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/projects',
      icon: <AppstoreOutlined />,
      label: 'Projects',
      onClick: () => {
        navigate('/projects');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/users',
      icon: <TeamOutlined />,
      label: 'Users',
      onClick: () => {
        navigate('/users');
        setMobileDrawerOpen(false);
      },
    },
  ];

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div className="py-1 px-1">
          <div className="font-semibold text-gray-200">{user?.username}</div>
          <div className="text-xs text-gray-400">{user?.email || 'No email attached'}</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined className="text-red-400" />,
      danger: true,
      label: 'Sign Out',
      onClick: logout,
    },
  ];

  const getTagColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'purple';
      case 'MANAGER':
        return 'cyan';
      default:
        return 'green';
    }
  };

  return (
    <Header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 shadow-lg">
      {/* Brand Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => navigate('/dashboard')}
      >
        <SafetyCertificateFilled className="text-2xl text-indigo-500" />
        <span className="font-bold text-lg tracking-wider text-white font-['Outfit']">
          RAVI INVENTORY
        </span>
      </div>

      {/* Desktop Main Nav Menu */}
      <div className="hidden lg:flex flex-1 max-w-xl mx-6">
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navMenuItems}
          className="border-none w-full text-sm"
        />
      </div>

      {/* Desktop Right User Profile Dropdown */}
      {user && (
        <div className="hidden lg:flex items-center">
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow>
            <div className="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-white/5 transition-all select-none border border-white/10">
              <Avatar
                style={{ backgroundColor: '#6366f1' }}
                icon={<UserOutlined />}
                className="font-bold uppercase"
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold text-slate-200">{user.username}</span>
                <span className="text-[10px] text-slate-400">
                  <Tag color={getTagColor(roleName)} className="mr-0 mt-0.5 text-[10px] py-0 px-1.5 border-none font-bold">
                    {roleName}
                  </Tag>
                </span>
              </div>
            </div>
          </Dropdown>
        </div>
      )}

      {/* Mobile Hamburger Button */}
      <div className="flex lg:hidden items-center gap-2">
        <Button
          type="text"
          icon={<MenuOutlined className="text-lg text-slate-200" />}
          onClick={() => setMobileDrawerOpen(true)}
        />
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-3">
            <Avatar style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />}>
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div className="font-semibold text-sm text-slate-100">{user?.username}</div>
              <Tag color={getTagColor(roleName)} className="text-[10px] py-0 px-1.5 font-bold border-none">
                {roleName}
              </Tag>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
      >
        <div className="flex flex-col justify-between h-full">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={navMenuItems}
            className="border-none bg-transparent"
          />

          <div className="pt-4 border-t border-white/10">
            <Button
              danger
              block
              icon={<LogoutOutlined />}
              onClick={() => {
                setMobileDrawerOpen(false);
                logout();
              }}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Drawer>
    </Header>
  );
};
