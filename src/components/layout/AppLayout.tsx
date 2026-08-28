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
  AppstoreOutlined,
  CodeSandboxOutlined,
  DatabaseOutlined,
  TagsOutlined,
  SunOutlined,
  MoonOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  ShopOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const roleName = (typeof user?.role === 'object' ? user.role.name : user?.role || 'user').toUpperCase();

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

  // Nav menu items aligned in step-by-step workflow order
  const navMenuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined style={{ fontSize: '18px' }} />,
      label: 'Dashboard Overview',
      onClick: () => {
        navigate('/dashboard');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: 'sub-setup',
      icon: <AppstoreOutlined style={{ fontSize: '18px' }} />,
      label: '1. Setup Master Data',
      children: [
        {
          key: '/units',
          icon: <TagsOutlined />,
          label: 'Units of Measure',
          onClick: () => {
            navigate('/units');
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
          label: 'Suppliers Directory',
          onClick: () => {
            navigate('/vendors');
            setMobileDrawerOpen(false);
          },
        },
        {
          key: '/projects',
          icon: <AppstoreOutlined />,
          label: 'Project Sites',
          onClick: () => {
            navigate('/projects');
            setMobileDrawerOpen(false);
          },
        },
        {
          key: '/users',
          icon: <TeamOutlined />,
          label: 'User Accounts',
          onClick: () => {
            navigate('/users');
            setMobileDrawerOpen(false);
          },
        },
      ],
    },
    {
      key: 'sub-procure',
      icon: <ShoppingOutlined style={{ fontSize: '18px' }} />,
      label: '2. Purchase Orders (Stock IN)',
      children: [
        {
          key: '/purchase-orders',
          icon: <ShoppingOutlined />,
          label: 'Purchase Orders & Receiving',
          onClick: () => {
            navigate('/purchase-orders');
            setMobileDrawerOpen(false);
          },
        },
      ],
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined style={{ fontSize: '18px' }} />,
      label: '3. Stock Tracker & Transfers',
      onClick: () => {
        navigate('/inventory');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: 'sub-issue',
      icon: <FileDoneOutlined style={{ fontSize: '18px' }} />,
      label: '4. Material Issues (Stock OUT)',
      children: [
        {
          key: '/material-issues',
          icon: <FileDoneOutlined />,
          label: 'Material Issue Vouchers',
          onClick: () => {
            navigate('/material-issues');
            setMobileDrawerOpen(false);
          },
        },
      ],
    },
    {
      key: '/reports',
      icon: <FileSearchOutlined style={{ fontSize: '18px' }} />,
      label: '5. Reports & Analytics Hub',
      onClick: () => {
        navigate('/reports');
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

  // Helper to determine active root menu section title
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard': return 'Dashboard Overview';
      case '/inventory': return 'Project Stock Quantity Tracker';
      case '/purchase-orders': return 'Purchase Orders & Stock Inward';
      case '/material-issues': return 'Material Issue Vouchers';
      case '/vendors': return 'Suppliers & Vendors Directory';
      case '/item-types': return 'Catalog Items';
      case '/units': return 'Measurement Units';
      case '/projects': return 'Project Sites';
      case '/users': return 'User Accounts Management';
      default: return 'Ravi Inventory Portal';
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', maxHeight: '100vh', height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      {/* Desktop Left Collapsible Sidebar Sider (Hidden on Mobile) */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        collapsedWidth={0}
        className="hidden lg:block"
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
          borderRight: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 40,
          boxShadow: isDark ? '4px 0 24px rgba(0,0,0,0.4)' : '4px 0 16px rgba(0,0,0,0.03)',
        }}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Brand Logo */}
          <div className="shrink-0">
            <div
              className="flex items-center gap-3 px-5 h-[68px] border-b cursor-pointer select-none overflow-hidden"
              style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0' }}
              onClick={() => navigate('/dashboard')}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                <SafetyCertificateFilled className="text-xl text-white" />
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-tight overflow-hidden">
                  <span className="font-bold text-base tracking-wider app-logo-text font-['Outfit'] whitespace-nowrap">
                    RAVI INVENTORY
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">
                    Control System
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Main Navigation Menu - Independent Sidebar Scrolling */}
          <div className="flex-1 overflow-y-auto py-2">
            <Menu
              mode="inline"
              theme={isDark ? 'dark' : 'light'}
              selectedKeys={[location.pathname]}
              defaultOpenKeys={['sub-setup', 'sub-procure', 'sub-issue']}
              items={navMenuItems}
              style={{
                background: 'transparent',
                borderRight: 0,
                fontSize: '14px',
                fontWeight: 500,
              }}
            />
          </div>
        </div>
      </Sider>

      {/* Right Main Page Layout Container */}
      <Layout style={{ background: 'transparent', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top Control Header */}
        <Header
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e2e8f0',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: '68px',
            lineHeight: '68px',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {/* Header Left: Toggle & Active Section Title */}
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined className="text-lg text-indigo-500" /> : <MenuFoldOutlined className="text-lg text-indigo-500" />}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileDrawerOpen(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              className="hover:bg-indigo-500/10"
            />

            <span className="text-base font-bold app-text-main font-['Outfit'] tracking-wide">
              {getPageTitle(location.pathname)}
            </span>
          </div>

          {/* Header Right: Theme Toggle & Profile Dropdown */}
          <div className="flex items-center gap-4">
            <Tooltip title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <Button
                type="text"
                shape="circle"
                icon={isDark ? <SunOutlined className="text-amber-400 text-lg" /> : <MoonOutlined className="text-indigo-500 text-lg" />}
                onClick={toggleTheme}
                className="hover:bg-indigo-500/10"
              />
            </Tooltip>

            {user && (
              <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow>
                <div className="flex items-center gap-3 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-indigo-500/10 transition-all select-none border border-slate-200 dark:border-white/10">
                  <Avatar
                    style={{ backgroundColor: '#6366f1' }}
                    icon={<UserOutlined />}
                    className="font-bold uppercase"
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
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
        </Header>

        {/* Content Body */}
        <Content style={{ position: 'relative', zIndex: 10, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Content>
      </Layout>

      {/* Mobile Drawer Fallback */}
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
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        width={280}
      >
        <div className="flex flex-col justify-between h-full">
          <Menu
            mode="inline"
            theme={isDark ? 'dark' : 'light'}
            selectedKeys={[location.pathname]}
            defaultOpenKeys={['sub-supply', 'sub-catalog']}
            items={navMenuItems}
            style={{ background: 'transparent', borderRight: 0 }}
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
    </Layout>
  );
};
export default AppLayout;
