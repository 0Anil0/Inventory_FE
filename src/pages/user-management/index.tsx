import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Tag, Popconfirm, Avatar, Space, Badge, message } from 'antd';
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
} from '@ant-design/icons';
import type { User, Role } from '../../types/auth';
import { userApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { UserModal } from '../../components/users/UserModal';
import { FilterModal } from '../../components/common/FilterModal';
import type { FilterValues } from '../../components/common/FilterModal';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<FilterValues>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);

  // User Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

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
      message.error(err.message || 'Failed to load user management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const handleOpenAddModal = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    try {
      const res = await userApi.deleteUser(id);
      if (res.success) {
        message.success('User deleted successfully');
        setUsers(users.filter((u) => u.id !== id));
      } else {
        message.error(res.message || 'Failed to delete user');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete user');
    }
  };

  const handleFormSubmit = async (data: {
    username: string;
    email?: string;
    password?: string;
    role_id: number;
  }) => {
    if (userToEdit) {
      const res = await userApi.updateUser(userToEdit.id, data);
      if (res.success && res.user) {
        setUsers(users.map((u) => (u.id === userToEdit.id ? res.user! : u)));
      } else {
        throw new Error(res.message || 'Failed to update user');
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
      } else {
        throw new Error(res.message || 'Failed to create user');
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

  // Calculate active filter badge count
  const activeFilterCount =
    (activeFilters.role_id ? 1 : 0) +
    (activeFilters.dateRange ? 1 : 0) +
    (activeFilters.keyword ? 1 : 0);

  const filteredUsers = users.filter((u) => {
    // 1. Search Query Filter
    const q = searchQuery.toLowerCase();
    const roleName = typeof u.role === 'object' ? u.role.name : u.role || '';
    const matchesQuery =
      !q ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      roleName.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    // 2. Role Filter
    if (activeFilters.role_id && u.role_id !== activeFilters.role_id) {
      return false;
    }

    // 3. Date Range Filter
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

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id: number) => <span className="text-gray-400 font-mono">#{id}</span>,
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      render: (username: string) => (
        <Space className="py-1">
          <Avatar style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />}>
            {username.charAt(0).toUpperCase()}
          </Avatar>
          <span className="font-semibold text-slate-800 dark:text-slate-100">{username}</span>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) =>
        email ? (
          <span className="text-slate-600 dark:text-slate-300">{email}</span>
        ) : (
          <span className="text-slate-400 italic">No email</span>
        ),
    },
    {
      title: 'Role',
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
            icon={<EditOutlined className="text-indigo-400" />}
            onClick={() => handleOpenEditModal(record)}
            className="hover:bg-indigo-500/10"
          />
          <Popconfirm
            title="Delete User"
            description={`Are you sure you want to delete "${record.username}"?`}
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button
              type="text"
              icon={<DeleteOutlined className="text-rose-400" />}
              className="hover:bg-rose-500/10"
            />
          </Popconfirm>
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
                User Management
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage system accounts, assign roles, and configure credentials
              </p>
            </div>
          </div>

          <Space className="w-full sm:w-auto justify-end">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsersAndRoles}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              size="middle"
              onClick={handleOpenAddModal}
              className="shadow-lg shadow-indigo-500/30"
            >
              Add New User
            </Button>
          </Space>
        </div>

        {/* Table Container Card */}
        <Card className="shadow-2xl">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
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

            <span className="text-xs text-slate-400 text-right">
              Showing <strong className="text-slate-200">{filteredUsers.length}</strong> of{' '}
              <strong className="text-slate-200">{users.length}</strong> users
            </span>
          </div>

          {/* User Table with Horizontal Scrolling */}
          <Table
            columns={columns}
            dataSource={filteredUsers}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
              showTotal: (total: number, range: [number, number]) => `${range[0]}-${range[1]} of ${total} users`,
            }}
          />
        </Card>
      </main>

      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        userToEdit={userToEdit}
        roles={roles}
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
