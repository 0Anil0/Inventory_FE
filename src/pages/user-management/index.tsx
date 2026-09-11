import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Tag, Popconfirm, Avatar, Space, Badge, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  UserAddOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  ReloadOutlined,
  FilterOutlined,
  SafetyCertificateOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { User, Role } from '../../types/auth';
import { userApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { UserModal } from '../../components/users/UserModal';
import { RoleModal } from '../../components/users/RoleModal';
import { FilterModal } from '../../components/common/FilterModal';
import type { FilterValues } from '../../components/common/FilterModal';

export const UserManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Responsive desktop check (>= 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pagination & Server Filtering state for Users
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // User Add/Edit modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Role Add/Edit modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  const fetchUsers = async (page = currentPage, limit = pageSize, filters = activeFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await userApi.getUsers({
        page,
        limit,
        search: search || undefined,
        role_id: filters.role_id || undefined,
      });

      if (res.success && res.users) {
        setUsers(res.users);
        setTotalUsers(res.total ?? res.users.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await userApi.getRoles();
      if (res.success && res.roles) {
        setRoles(res.roles);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers(1, pageSize, activeFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchUsers(page, newPageSize, activeFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchUsers(1, pageSize, activeFilters, val);
  };

  const handleOpenAddUser = () => {
    setUserToEdit(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: User) => {
    setUserToEdit(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await userApi.deleteUser(id);
      if (res.success) {
        message.success('User deleted successfully');
        fetchUsers(currentPage, pageSize, activeFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete user');
    }
  };

  const handleUserFormSubmit = async (data: {
    username: string;
    email?: string;
    password?: string;
    role_id: number;
  }) => {
    if (userToEdit) {
      const res = await userApi.updateUser(userToEdit.id, data);
      if (res.success) {
        message.success('User updated successfully');
      }
    } else {
      if (!data.password) throw new Error('Password is required');
      const res = await userApi.createUser({
        username: data.username,
        email: data.email,
        password: data.password,
        role_id: data.role_id,
      });
      if (res.success) {
        message.success('User created successfully');
      }
    }
    setIsUserModalOpen(false);
    fetchUsers(currentPage, pageSize, activeFilters, searchQuery);
  };

  const handleOpenAddRole = () => {
    setRoleToEdit(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: Role) => {
    setRoleToEdit(role);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const res = await userApi.deleteRole(id);
      if (res.success) {
        message.success('Role deleted successfully');
        setRoles(roles.filter((r) => r.id !== id));
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete role');
    }
  };

  const handleRoleFormSubmit = async (data: { name: string; description?: string }) => {
    if (roleToEdit) {
      const res = await userApi.updateRole(roleToEdit.id, data);
      if (res.success && res.role) {
        setRoles(roles.map((r) => (r.id === roleToEdit.id ? res.role! : r)));
        message.success(`Role '${res.role.name}' updated successfully`);
      }
    } else {
      const res = await userApi.createRole(data);
      if (res.success && res.role) {
        setRoles([...roles, res.role]);
        message.success(`Role '${res.role.name}' created successfully`);
      }
    }
    setIsRoleModalOpen(false);
  };

  const handleApplyFilter = (filters: FilterValues) => {
    setActiveFilters(filters);
    const newSearch = filters.keyword !== undefined ? filters.keyword : searchQuery;
    if (filters.keyword !== undefined) {
      setSearchQuery(filters.keyword);
    }
    setCurrentPage(1);
    fetchUsers(1, pageSize, filters, newSearch);
  };

  const handleResetFilter = () => {
    setActiveFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    fetchUsers(1, pageSize, {}, '');
  };

  const activeFilterCount =
    (activeFilters.role_id ? 1 : 0) +
    (activeFilters.dateRange ? 1 : 0) +
    (activeFilters.keyword ? 1 : 0);

  const getRoleTagColor = (roleName: string) => {
    switch (roleName.toUpperCase()) {
      case 'ADMIN':
        return 'purple';
      case 'MANAGER':
        return 'cyan';
      default:
        return 'green';
    }
  };

  const userColumns: ColumnsType<User> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 90,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      fixed: 'left',
      render: (id: number) => <span className="text-gray-400 font-mono">#{id}</span>,
    },
    {
      title: 'User Name',
      dataIndex: 'username',
      key: 'username',
      fixed: 'left',
      render: (username: string) => (
        <Space className="py-1">
          <Avatar style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />}>
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <span className="font-semibold text-slate-800 dark:text-slate-100 font-['Outfit']">{username}</span>
        </Space>
      ),
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) =>
        email ? (
          <span className="text-slate-600 dark:text-slate-300">{email}</span>
        ) : (
          <span className="text-slate-400 italic">No email attached</span>
        ),
    },
    {
      title: 'Assigned Role',
      key: 'role',
      render: (_: any, record: User) => {
        const roleName = (
          typeof record.role === 'object' ? record.role.name : record.role || 'user'
        ).toUpperCase();
        return (
          <Tag color={getRoleTagColor(roleName)} className="font-bold py-0.5 px-2.5 rounded-full border-none">
            {roleName}
          </Tag>
        );
      },
    },
    {
      title: 'Created Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt?: string) =>
        createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_: any, record: User) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-500" />}
            onClick={() => handleOpenEditUser(record)}
          />
          <Popconfirm
            title="Delete User"
            description={`Delete user account "${record.username}"?`}
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-rose-500" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const roleColumns: ColumnsType<Role> = [
    {
      title: 'Role ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      fixed: 'left',
      render: (id: number) => <span className="font-mono text-gray-400">#{id}</span>,
    },
    {
      title: 'Role Identifier',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      render: (name: string) => (
        <Tag color={getRoleTagColor(name)} className="font-bold uppercase py-0.5 px-3 rounded-full border-none text-xs font-mono">
          {name}
        </Tag>
      ),
    },
    {
      title: 'Description & Scope',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) =>
        desc ? (
          <span className="text-slate-700 dark:text-slate-300 text-xs">{desc}</span>
        ) : (
          <span className="text-slate-400 italic text-xs">No description provided</span>
        ),
    },
    {
      title: 'Assigned Users Count',
      key: 'usersCount',
      render: (_, record: any) => {
        const count = record.users ? record.users.length : users.filter((u) => u.role_id === record.id).length;
        return (
          <Badge count={count} style={{ backgroundColor: count > 0 ? '#6366f1' : '#94a3b8' }} showZero />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, record: Role) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-500" />}
            onClick={() => handleOpenEditRole(record)}
          />
          {record.name.toLowerCase() !== 'admin' && (
            <Popconfirm
              title="Delete Role"
              description={`Delete system role "${record.name}"?`}
              onConfirm={() => handleDeleteRole(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" icon={<DeleteOutlined className="text-rose-500" />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <TeamOutlined className="text-2xl sm:text-3xl text-indigo-500" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold app-text-main font-['Outfit'] tracking-tight mb-0.5">
                User & Access Control Center
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage system user accounts, credentials, and system roles
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(currentPage, pageSize, activeFilters, searchQuery)} loading={loading}>
              Refresh
            </Button>

            {activeTab === 'users' ? (
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={handleOpenAddUser}
              >
                Add New User
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenAddRole}
              >
                Create System Role
              </Button>
            )}
          </Space>
        </div>

        {/* Tabbed Card Layout */}
        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden"
            items={[
              {
                key: 'users',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <UserOutlined /> User Accounts ({totalUsers})
                  </span>
                ),
                children: (
                  <div className="pt-2 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
                      <div className="flex items-center gap-3">
                        <Badge count={totalUsers} overflowCount={9999} color="#6366f1">
                          <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                            Total Records: {totalUsers} Users
                          </Tag>
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 max-w-lg">
                        <Input
                          placeholder="Search users by name or email on server..."
                          prefix={<SearchOutlined className="text-gray-400" />}
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                          className="w-full"
                          allowClear
                        />

                        <Badge count={activeFilterCount} offset={[-4, 4]}>
                          <Button
                            icon={<FilterOutlined />}
                            onClick={() => setIsFilterModalOpen(true)}
                            className={activeFilterCount > 0 ? 'border-indigo-500 text-indigo-400 font-bold' : ''}
                          >
                            Filter Modal
                          </Button>
                        </Badge>
                      </div>
                    </div>

                    <div className="flex-1 overflow-visible lg:overflow-hidden">
                      <Table
                        columns={userColumns}
                        dataSource={users}
                        rowKey="id"
                        loading={loading}
                        scroll={{
                          x: 750,
                          y: isDesktop ? 'calc(100vh - 490px)' : undefined,
                        }}
                        pagination={{
                          current: currentPage,
                          pageSize: pageSize,
                          total: totalUsers,
                          showSizeChanger: true,
                          pageSizeOptions: ['10', '15', '25', '50'],
                          onChange: handlePageChange,
                        }}
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: 'roles',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <SafetyCertificateOutlined /> System Roles & Permissions ({roles.length})
                  </span>
                ),
                children: (
                  <div className="pt-2 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
                    <div className="flex justify-between items-center mb-3 shrink-0">
                      <p className="text-xs text-slate-400 mb-0">
                        Configure system access roles (e.g., admin, manager, user) to assign permissions.
                      </p>
                      <Button type="primary" ghost icon={<PlusOutlined />} onClick={handleOpenAddRole}>
                        Add Role
                      </Button>
                    </div>

                    <div className="flex-1 overflow-visible lg:overflow-hidden">
                      <Table
                        columns={roleColumns}
                        dataSource={roles}
                        rowKey="id"
                        loading={loading}
                        scroll={{
                          x: 700,
                          y: isDesktop ? 'calc(100vh - 430px)' : undefined,
                        }}
                        pagination={false}
                      />
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </main>

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSubmit={handleUserFormSubmit}
        userToEdit={userToEdit}
        roles={roles}
      />

      <RoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onSubmit={handleRoleFormSubmit}
        roleToEdit={roleToEdit}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilter}
        onReset={handleResetFilter}
        roles={roles}
        initialValues={activeFilters}
      />
    </AppLayout>
  );
};
export default UserManagementPage;
