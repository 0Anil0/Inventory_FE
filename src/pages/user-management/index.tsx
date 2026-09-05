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

  // Search & Filter state for Users
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // User Add/Edit modal state
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Role Add/Edit modal state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        userApi.getUsers(),
        userApi.getRoles(),
      ]);

      if (usersRes.success && usersRes.users) {
        setUsers(usersRes.users);
      }
      if (rolesRes.success && rolesRes.roles) {
        setRoles(rolesRes.roles);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load user and role data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  // --- USER HANDLERS ---
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
        setUsers(users.filter((u) => u.id !== id));
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
      if (res.success && res.user) {
        setUsers(users.map((u) => (u.id === userToEdit.id ? res.user! : u)));
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
      if (res.success && res.user) {
        setUsers([...users, res.user]);
        message.success('User created successfully');
      }
    }
  };

  // --- ROLE HANDLERS ---
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
  };

  // Filter application logic
  const handleApplyFilter = (filters: FilterValues) => {
    setActiveFilters(filters);
    if (filters.keyword !== undefined) {
      setSearchQuery(filters.keyword);
    }
  };

  const handleResetFilter = () => {
    setActiveFilters({});
    setSearchQuery('');
  };

  const activeFilterCount =
    (activeFilters.role_id ? 1 : 0) +
    (activeFilters.dateRange ? 1 : 0) +
    (activeFilters.keyword ? 1 : 0);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const roleName = typeof u.role === 'object' ? u.role.name : u.role || '';
    const matchesQuery =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      roleName.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (activeFilters.role_id && u.role_id !== activeFilters.role_id) {
      return false;
    }

    if (activeFilters.dateRange && activeFilters.dateRange[0] && activeFilters.dateRange[1] && u.createdAt) {
      const userDate = new Date(u.createdAt).getTime();
      const startDate = activeFilters.dateRange[0].startOf('day').valueOf();
      const endDate = activeFilters.dateRange[1].endOf('day').valueOf();
      if (userDate < startDate || userDate > endDate) {
        return false;
      }
    }

    return true;
  });

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
          {index + 1}
        </span>
      ),
    },
    {
      title: 'User ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <span className="text-gray-400 font-mono">#{id}</span>,
    },
    {
      title: 'User Name',
      dataIndex: 'username',
      key: 'username',
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
      render: (id: number) => <span className="font-mono text-gray-400">#{id}</span>,
    },
    {
      title: 'Role Identifier',
      dataIndex: 'name',
      key: 'name',
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
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TeamOutlined className="text-2xl sm:text-3xl text-indigo-500" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold app-text-main font-['Outfit'] tracking-tight mb-0.5">
                User & Access Control Center
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage system user accounts, credentials, and custom system roles
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUsersAndRoles} loading={loading}>
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
        <Card className="shadow-2xl">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'users',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <UserOutlined /> User Accounts ({users.length})
                  </span>
                ),
                children: (
                  <div className="pt-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        <Badge count={filteredUsers.length} overflowCount={999} color="#6366f1">
                          <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                            Total Records: {filteredUsers.length} Users
                          </Tag>
                        </Badge>
                        {filteredUsers.length !== users.length && (
                          <span className="text-xs text-slate-500 font-medium">
                            (Filtered from {users.length} total users)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 max-w-lg">
                        <Input
                          placeholder="Search users by name, email, or role..."
                          prefix={<SearchOutlined className="text-gray-400" />}
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                          className="w-full"
                          allowClear
                        />

                        <Badge count={activeFilterCount} offset={[-4, 4]}>
                          <Button
                            icon={<FilterOutlined />}
                            onClick={() => setIsFilterModalOpen(true)}
                            className={activeFilterCount > 0 ? 'border-indigo-500 text-indigo-400' : ''}
                          >
                            Filter
                          </Button>
                        </Badge>
                      </div>
                    </div>

                    <Table
                      columns={userColumns}
                      dataSource={filteredUsers}
                      rowKey="id"
                      loading={loading}
                      scroll={{ x: 750, y: 360 }}
                      pagination={{ pageSize: 15, showSizeChanger: true }}
                    />
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
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-xs text-slate-400 mb-0">
                        Configure system access roles (e.g., admin, manager, engineer, auditor) to assign permissions.
                      </p>
                      <Button type="primary" ghost icon={<PlusOutlined />} onClick={handleOpenAddRole}>
                        Add Role
                      </Button>
                    </div>

                    <Table
                      columns={roleColumns}
                      dataSource={roles}
                      rowKey="id"
                      loading={loading}
                      scroll={{ x: 700, y: 360 }}
                      pagination={false}
                    />
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
