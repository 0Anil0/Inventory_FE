import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Make } from '../../types/inventory';
import { makeApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const MakesPage: React.FC = () => {
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [makeToEdit, setMakeToEdit] = useState<Make | null>(null);
  const [form] = Form.useForm();

  const fetchMakes = async () => {
    setLoading(true);
    try {
      const res = await makeApi.getAll();
      if (res.success && res.makes) {
        setMakes(res.makes);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load brand makes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMakes();
  }, []);

  const handleOpenAdd = () => {
    setMakeToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (make: Make) => {
    setMakeToEdit(make);
    form.setFieldsValue({
      name: make.name,
      code: make.code || '',
      description: make.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await makeApi.delete(id);
      if (res.success) {
        setMakes(makes.filter((m) => m.id !== id));
        message.success('Make deleted successfully');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete make');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (makeToEdit) {
        const res = await makeApi.update(makeToEdit.id, values);
        if (res.success && res.make) {
          setMakes(makes.map((m) => (m.id === makeToEdit.id ? res.make : m)));
          message.success('Make updated successfully');
        }
      } else {
        const res = await makeApi.create(values);
        if (res.success && res.make) {
          setMakes([...makes, res.make]);
          message.success('Make created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save make');
    }
  };

  const filteredMakes = makes.filter((m) => {
    const q = searchQuery.toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || (m.code && m.code.toLowerCase().includes(q));
  });

  const columns: ColumnsType<Make> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 80,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500">{index + 1}</span>
      ),
    },
    {
      title: 'Brand / Make Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Tag color="blue" icon={<ShopOutlined />} className="font-bold text-sm py-1 px-3">
          {name}
        </Tag>
      ),
    },
    {
      title: 'Brand Code / Abbreviation',
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (
        <span className="font-mono text-xs text-indigo-500 font-bold">{code || '-'}</span>
      ),
    },
    {
      title: 'Description / Remarks',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span className="app-text-muted italic">No remarks</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-600 dark:text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Make"
            description={`Delete brand "${record.name}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-rose-500" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShopOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Make Master (Brands)
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage manufacturer brands (ABB, Schneider, Siemens, Socomec, Esbee, Pecox, etc.)
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchMakes} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Brand Make
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Input
              placeholder="Search Brand Make..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="max-w-md"
            />
            <span className="text-xs font-bold text-indigo-400">Total Brands: {filteredMakes.length}</span>
          </div>

          <Table
            columns={columns}
            dataSource={filteredMakes}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 12 }}
          />
        </Card>
      </main>

      <Modal
        title={makeToEdit ? 'Edit Brand Make' : 'Add Brand Make'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Make / Brand Name (e.g. ABB, SCHNEIDER)" rules={[{ required: true, message: 'Brand name is required' }]}>
            <Input placeholder="e.g. ABB" />
          </Form.Item>

          <Form.Item name="code" label="Short Code / SKU Abbreviation (Optional)">
            <Input placeholder="e.g. ABB" />
          </Form.Item>

          <Form.Item name="description" label="Remarks / Notes">
            <Input.TextArea placeholder="Manufacturer description or notes..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default MakesPage;
