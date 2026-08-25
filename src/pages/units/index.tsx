import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  ReloadOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { Unit } from '../../types/inventory';
import { unitApi } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';

export const UnitsPage: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);
  const [form] = Form.useForm();

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const res = await unitApi.getAll();
      if (res.success && res.units) {
        setUnits(res.units);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load units catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenAdd = () => {
    setUnitToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setUnitToEdit(unit);
    form.setFieldsValue({
      name: unit.name,
      code: unit.code,
      description: unit.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await unitApi.delete(id);
      if (res.success) {
        message.success('Unit deleted successfully');
        setUnits(units.filter((u) => u.id !== id));
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete unit');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (unitToEdit) {
        const res = await unitApi.update(unitToEdit.id, values);
        if (res.success && res.unit) {
          setUnits(units.map((u) => (u.id === unitToEdit.id ? res.unit : u)));
          message.success('Unit updated successfully');
        }
      } else {
        const res = await unitApi.create(values);
        if (res.success && res.unit) {
          setUnits([...units, res.unit]);
          message.success('Unit created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save unit');
    }
  };

  const filteredUnits = units.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      (u.description && u.description.toLowerCase().includes(q))
    );
  });

  const columns: ColumnsType<Unit> = [
    {
      title: 'Unit Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => (
        <Tag color="purple" className="font-mono font-bold text-sm px-2.5 py-0.5">
          {code}
        </Tag>
      ),
    },
    {
      title: 'Unit Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold text-slate-100">{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span className="text-slate-500 italic">No description</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Unit"
            description={`Delete unit "${record.name}" (${record.code})?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-rose-400" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TagsOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100 font-['Outfit'] mb-0.5">
                Units Management
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mb-0">
                Manage measurement units (e.g., PCS, KG, MTR, LTR, BOX) used across inventory item types
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchUnits} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd}>
              Add Unit
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="mb-6">
            <Input
              placeholder="Search units by code, name, or description..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredUnits}
            rowKey="id"
            loading={loading}
            scroll={{ x: 600 }}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </main>

      <Modal
        title={unitToEdit ? 'Edit Unit' : 'Add New Unit'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Unit Name" rules={[{ required: true, message: 'Unit Name is required' }]}>
            <Input placeholder="e.g. Kilograms, Pieces, Meters" />
          </Form.Item>

          <Form.Item name="code" label="Unit Symbol / Code" rules={[{ required: true, message: 'Unit Code is required' }]}>
            <Input prefix={<TagOutlined className="text-gray-400" />} placeholder="e.g. KG, PCS, MTR" className="uppercase" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional unit description or usage notes..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UnitsPage;
