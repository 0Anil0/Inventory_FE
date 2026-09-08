import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Tag, Dropdown, Button, Drawer, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  CodeSandboxOutlined,
  TagsOutlined,
  SunOutlined,
  MoonOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  HddOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DatabaseOutlined,
  ClusterOutlined,
  SendOutlined,
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

  // Menu hierarchy: Unit Master -> Make Master -> Item Master -> Vendor Master -> User Management -> Terms & Conditions
  const navMenuItems: MenuProps['items'] = [
    {
      key: '/units',
      icon: <TagsOutlined style={{ fontSize: '18px' }} />,
      label: 'Unit Master',
      onClick: () => {
        navigate('/units');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/makes',
      icon: <ShopOutlined style={{ fontSize: '18px' }} />,
      label: 'Make Master',
      onClick: () => {
        navigate('/makes');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/item-types',
      icon: <CodeSandboxOutlined style={{ fontSize: '18px' }} />,
      label: 'Item Master',
      onClick: () => {
        navigate('/item-types');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/projects',
      icon: <ClusterOutlined style={{ fontSize: '18px' }} />,
      label: 'Project Master',
      onClick: () => {
        navigate('/projects');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/project-assignments',
      icon: <SendOutlined style={{ fontSize: '18px' }} />,
      label: 'Project Stock Assignments',
      onClick: () => {
        navigate('/project-assignments');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/inventory',
      icon: <DatabaseOutlined style={{ fontSize: '18px' }} />,
      label: 'Inventory Stock Items',
      onClick: () => {
        navigate('/inventory');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/grn',
      icon: <AuditOutlined style={{ fontSize: '18px' }} />,
      label: 'Stock Inward (GRN)',
      onClick: () => {
        navigate('/grn');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/vendors',
      icon: <ShopOutlined style={{ fontSize: '18px' }} />,
      label: 'Vendor Master',
      onClick: () => {
        navigate('/vendors');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/users',
      icon: <TeamOutlined style={{ fontSize: '18px' }} />,
      label: 'User Management',
      onClick: () => {
        navigate('/users');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/terms-and-conditions',
      icon: <FileTextOutlined style={{ fontSize: '18px' }} />,
      label: 'Terms & Conditions',
      onClick: () => {
        navigate('/terms-and-conditions');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/purchase-orders',
      icon: <ShoppingOutlined style={{ fontSize: '18px' }} />,
      label: 'Purchase Orders',
      onClick: () => {
        navigate('/purchase-orders');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/approver-config',
      icon: <SafetyCertificateOutlined style={{ fontSize: '18px' }} />,
      label: 'PO Approvers',
      onClick: () => {
        navigate('/approver-config');
        setMobileDrawerOpen(false);
      },
    },
    {
      key: '/storage-locations',
      icon: <HddOutlined style={{ fontSize: '18px' }} />,
      label: 'Store Shelves & Racks',
      onClick: () => {
        navigate('/storage-locations');
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
      case '/units': return 'Unit Master';
      case '/makes': return 'Make Master';
      case '/item-types': return 'Item Master';
      case '/projects': return 'Project & Sub-Project Master';
      case '/project-assignments': return 'Project Material Assignment & Dispatch Master';
      case '/inventory': return 'Inventory Stock Items & Tracker';
      case '/vendors': return 'Vendor Master';
      case '/users': return 'User Management';
      case '/terms-and-conditions': return 'Terms & Conditions Templates';
      case '/purchase-orders': return 'Purchase Orders & PDF Documents';
      case '/approver-config': return 'PO Approver Configuration';
      case '/storage-locations': return 'Store Shelves & Racks Layout';
      case '/grn': return 'Stock Inward (GRN) Master';
      default: return 'Inventory Management System';
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
              <div className="w-10 h-10 rounded-xl bg-white/10 dark:bg-white/5 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 border border-slate-200 dark:border-white/10">
                <img src="/logo.png" alt="App Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              {!collapsed && (
                <div className="flex flex-col leading-tight overflow-hidden">
                  <span className="font-bold text-sm tracking-wider app-logo-text font-['Outfit'] whitespace-nowrap">
                    INVENTORY MANAGEMENT
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">
                    SYSTEM PORTAL
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
              defaultOpenKeys={['sub-master']}
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
            defaultOpenKeys={['sub-master']}
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
