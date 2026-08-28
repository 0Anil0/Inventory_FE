import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Tag, Dropdown, Button, Drawer, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  TagsOutlined,
  SunOutlined,
  MoonOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  ShopOutlined,
} from '@ant-design/icons';

const { Header } = Layout;

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const roleName = (typeof user?.role === 'object' ? user.role.name : user?.role || 'user').toUpperCase();

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
      key: '/purchase-orders',
      icon: <ShoppingOutlined />,
      label: 'Purchase Orders',
      onClick: () => {
        navigate('/purchase-orders');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/material-issues',
      icon: <FileDoneOutlined />,
      label: 'Material Issues',
      onClick: () => {
        navigate('/material-issues');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/item-types',
      icon: <CodeSandboxOutlined />,
      label: 'Catalog Items',
      onClick: () => {
        navigate('/item-types');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/vendors',
      icon: <ShopOutlined />,
      label: 'Suppliers',
      onClick: () => {
        navigate('/vendors');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/units',
      icon: <TagsOutlined />,
      label: 'Units',
      onClick: () => {
        navigate('/units');
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
          <div className="font-semibold text-slate-800 dark:text-gray-200">{user?.username}</div>
          <div className="text-xs text-slate-500 dark:text-gray-400">{user?.email || 'No email attached'}</div>
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
    <Header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 shadow-md">
      {/* Brand Logo */}
      <div
        className="flex items-center gap-3 cursor-pointer select-none shrink-0"
        onClick={() => navigate('/dashboard')}
      >
        <SafetyCertificateFilled className="text-2xl text-indigo-500" />
        <span className="font-bold text-lg tracking-wider app-logo-text font-['Outfit']">
          RAVI INVENTORY
        </span>
      </div>

      {/* Desktop Main Nav Menu */}
      <div className="hidden xl:flex flex-1 max-w-4xl mx-6">
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={navMenuItems}
          className="border-none w-full text-sm"
        />
      </div>

      {/* Desktop Right Controls (Theme Toggle & Profile) */}
      <div className="hidden xl:flex items-center gap-3 shrink-0">
        <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <Button
            type="text"
            shape="circle"
            icon={isDark ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-indigo-500 text-lg" />}
            onClick={toggleTheme}
            className="hover:bg-black/5 dark:hover:bg-white/10"
          />
        </Tooltip>

        {user && (
          <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow>
            <div className="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all select-none border border-slate-200 dark:border-white/10">
              <Avatar
                style={{ backgroundColor: '#6366f1' }}
                icon={<UserOutlined />}
                className="font-bold uppercase"
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold app-text-main">{user.username}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  <Tag color={getTagColor(roleName)} className="mr-0 mt-0.5 text-[10px] py-0 px-1.5 border-none font-bold">
                    {roleName}
                  </Tag>
                </span>
              </div>
            </div>
          </Dropdown>
        )}
      </div>

      {/* Mobile Right Controls */}
      <div className="flex xl:hidden items-center gap-2">
        <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
          <Button
            type="text"
            shape="circle"
            icon={isDark ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-indigo-500 text-lg" />}
            onClick={toggleTheme}
          />
        </Tooltip>

        <Button
          type="text"
          icon={<MenuOutlined className="text-lg text-slate-700 dark:text-slate-200" />}
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
              <div className="font-semibold text-sm text-slate-800 dark:text-slate-100">{user?.username}</div>
              <Tag color={getTagColor(roleName)} className="text-[10px] py-0 px-1.5 font-bold border-none">
                {roleName}
              </Tag>
            </div>
          </div>
        }
        placement="right"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={300}
      >
        <div className="flex flex-col justify-between h-full">
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={navMenuItems}
            className="border-none bg-transparent"
          />

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <Button
              block
              icon={isDark ? <SunOutlined className="text-amber-400" /> : <MoonOutlined className="text-indigo-500" />}
              onClick={toggleTheme}
            >
              {isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            </Button>

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
export default Navbar;
