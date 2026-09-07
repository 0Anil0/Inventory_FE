import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Select,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Avatar,
} from 'antd';
import {
  SafetyCertificateOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { poApproverApi, userApi } from '../../services/api';
import type { POApprover } from '../../types/inventory';
import type { User } from '../../types/auth';
import { AppLayout } from '../../components/layout/AppLayout';

export const ApproverConfigPage: React.FC = () => {
  const [approvers, setApprovers] = useState<POApprover[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingApprover, setEditingApprover] = useState<POApprover | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [form] = Form.useForm();

  const fetchApprovers = async () => {
    setLoading(true);
    try {
      const res = await poApproverApi.getAll();
      if (res.success && res.approvers) {
        setApprovers(res.approvers);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch PO approvers');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await userApi.getUsers({ limit: 1000 });
      if (res.success && res.users) {
        setUsers(res.users);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    fetchApprovers();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      if (editingApprover) {
        form.setFieldsValue({
          user_id: editingApprover.user_id,
          is_active: Boolean(editingApprover.is_active),
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          is_active: true,
        });
      }
    }
  }, [isModalOpen, editingApprover, form]);

  const handleEdit = (record: POApprover) => {
    setEditingApprover(record);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingApprover) {
        const res = await poApproverApi.update(editingApprover.id, {
          is_active: Boolean(values.is_active),
        });
        if (res.success) {
          message.success('PO Approver updated successfully!');
          setIsModalOpen(false);
          setEditingApprover(null);
          form.resetFields();
          fetchApprovers();
        }
      } else {
        const res = await poApproverApi.create({
          user_id: values.user_id,
        });
        if (res.success) {
          message.success('PO Approver designated successfully!');
          setIsModalOpen(false);
          form.resetFields();
          fetchApprovers();
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to save PO approver configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await poApproverApi.delete(id);
      if (res.success) {
        message.success('Approver configuration removed successfully');
        fetchApprovers();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to remove approver');
    }
  };

  const columns: ColumnsType<POApprover> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 70,
      align: 'center',
      render: (_, __, index) => <span className="font-mono font-bold text-slate-500">{index + 1}</span>,
    },
    {
      title: 'Approver User',
      key: 'user',
      render: (_, record) => {
        const username = record.user?.username || `User #${record.user_id}`;
        const email = record.user?.email || 'No email attached';
        const roleName = (typeof record.user?.role === 'object' ? record.user.role.name : record.user?.role || 'user').toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar style={{ backgroundColor: '#6366f1' }} icon={<UserOutlined />}>
              {username.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{username}</span>
                <Tag color={roleName === 'ADMIN' ? 'purple' : 'blue'} className="text-[10px] font-bold px-1.5 py-0">
                  {roleName}
                </Tag>
              </div>
              <div className="text-xs text-slate-400 font-mono">{email}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      align: 'center',
      render: (_, record) =>
        record.is_active ? (
          <Tag color="green" icon={<CheckCircleOutlined />} className="px-2.5 py-0.5 font-bold">
            ACTIVE
          </Tag>
        ) : (
          <Tag color="default" className="px-2.5 py-0.5 font-bold">
            INACTIVE
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div className="flex items-center justify-center gap-1">
          <Tooltip title="Edit Approver Status">
            <Button
              type="text"
              icon={<EditOutlined />}
              size="small"
              className="text-indigo-600 hover:text-indigo-800"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Remove Approver"
            description="Are you sure you want to remove this user from the PO Approvers list?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Remove"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Remove Approver Rights">
              <Button type="text" danger icon={<DeleteOutlined />} size="small" />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Filter users who are not yet added as approvers (unless currently editing)
  const configuredUserIds = approvers.map((a) => a.user_id);
  const eligibleUsers = users.filter(
    (u) => !configuredUserIds.includes(u.id) || (editingApprover && u.id === editingApprover.user_id)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl shrink-0">
              <SafetyCertificateOutlined />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1">
                PO Approver Configuration
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Designate and manage users authorized to review, approve, or reject Purchase Orders
              </p>
            </div>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="middle"
            className="bg-indigo-600 hover:bg-indigo-500 font-bold border-none shadow-md"
            onClick={() => {
              setEditingApprover(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Add PO Approver
          </Button>
        </div>

        {/* Approver List Table */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden">
          <Table
            columns={columns}
            dataSource={approvers}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            className="rounded-lg overflow-hidden"
          />
        </Card>

        {/* Add / Edit Approver Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              <SafetyCertificateOutlined />
              <span>{editingApprover ? 'Edit PO Approver Status' : 'Designate New PO Approver'}</span>
            </div>
          }
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingApprover(null);
          }}
          footer={null}
          destroyOnClose
          centered
        >
          <Form form={form} layout="vertical" onFinish={handleFormSubmit} className="mt-4">
            <Form.Item
              name="user_id"
              label="Select System User"
              rules={[{ required: true, message: 'Please select a user to designate as approver' }]}
            >
              <Select
                placeholder="Choose user from list..."
                showSearch
                optionFilterProp="children"
                size="large"
                disabled={!!editingApprover}
              >
                {eligibleUsers.map((u) => {
                  const roleName = (typeof u.role === 'object' ? u.role.name : u.role || 'user').toUpperCase();
                  return (
                    <Select.Option key={u.id} value={u.id}>
                      <span className="font-bold">{u.username}</span> ({u.email || 'No email'}) -{' '}
                      <span className="text-indigo-500 font-medium">[{roleName}]</span>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>

            {editingApprover && (
              <Form.Item
                name="is_active"
                label="Approver Status"
                rules={[{ required: true, message: 'Please select status' }]}
              >
                <Select size="large">
                  <Select.Option value={true}>
                    <span className="font-bold text-emerald-600">ACTIVE</span>
                  </Select.Option>
                  <Select.Option value={false}>
                    <span className="font-bold text-slate-500">INACTIVE</span>
                  </Select.Option>
                </Select>
              </Form.Item>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingApprover(null);
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} className="bg-indigo-600 hover:bg-indigo-500 font-bold">
                {editingApprover ? 'Update Approver' : 'Designate Approver'}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default ApproverConfigPage;
