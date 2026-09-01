import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, DatePicker, Badge, message } from 'antd';
const { RangePicker } = DatePicker;
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
import { AppLayout } from '../../components/layout/AppLayout';

export const UnitsPage: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

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
      message.error(err.message || 'Failed to load measurement units');
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
        setUnits(units.filter((u) => u.id !== id));
        message.success('Unit deleted successfully');
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
          setUnits([res.unit, ...units]);
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
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      (u.description && u.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (dateRange && (u as any).createdAt) {
      const createdStr = new Date((u as any).createdAt).toISOString().slice(0, 10);
      if (createdStr < dateRange[0] || createdStr > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<Unit> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 70,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {index + 1}
        </span>
      ),
    },
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
      render: (name: string) => <span className="font-semibold app-text-main">{name}</span>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) =>
        desc ? (
          <span className="app-text-secondary">{desc}</span>
        ) : (
          <span className="app-text-muted italic">No description</span>
        ),
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
            icon={<EditOutlined className="text-indigo-600 dark:text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Unit"
            description={`Delete unit "${record.name}" (${record.code})?`}
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

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TagsOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Units Management
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
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
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredUnits.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredUnits.length} Units
                </Tag>
              </Badge>
              {filteredUnits.length !== units.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {units.length} total units)
                </span>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              + Add New Unit
            </Button>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by code, name, or description..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="w-full"
            />

            <RangePicker
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
                } else {
                  setDateRange(null);
                }
              }}
              className="w-full"
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchQuery('');
                setDateRange(null);
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={filteredUnits}
            rowKey="id"
            loading={loading}
            scroll={{ x: 600, y: 360 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
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
    </AppLayout>
  );
};

export default UnitsPage;
