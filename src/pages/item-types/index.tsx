import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, InputNumber, Modal, Form, Popconfirm, Space, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeSandboxOutlined,
  ReloadOutlined,
  TagOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import type { ItemType } from '../../types/inventory';
import { itemTypeApi } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ItemType | null>(null);
  const [form] = Form.useForm();

  const fetchItemTypes = async () => {
    setLoading(true);
    try {
      const res = await itemTypeApi.getAll();
      if (res.success && res.items) {
        setItems(res.items);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load item types catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemTypes();
  }, []);

  const handleOpenAdd = () => {
    setItemToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemType) => {
    setItemToEdit(item);
    form.setFieldsValue({
      name: item.name,
      code: item.code,
      unit: item.unit,
      total_quantity: item.total_quantity || 0,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await itemTypeApi.delete(id);
      if (res.success) {
        message.success('Item type deleted successfully');
        setItems(items.filter((i) => i.id !== id));
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete item type');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (itemToEdit) {
        const res = await itemTypeApi.update(itemToEdit.id, values);
        if (res.success && res.item) {
          setItems(items.map((i) => (i.id === itemToEdit.id ? res.item : i)));
          message.success('Item type updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(values);
        if (res.success && res.item) {
          setItems([...items, res.item]);
          message.success('Item type created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save item type');
    }
  };

  const filteredItems = items.filter((i) => {
    const q = searchQuery.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.code.toLowerCase().includes(q) ||
      i.unit.toLowerCase().includes(q)
    );
  });

  const columns: ColumnsType<ItemType> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <span className="font-mono font-bold text-indigo-400">{code}</span>,
    },
    {
      title: 'Item Type Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold text-slate-100">{name}</span>,
    },
    {
      title: 'Measurement Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 150,
      render: (unit: string) => (
        <span className="font-mono bg-slate-800 text-slate-300 py-1 px-2.5 rounded-md border border-white/10 text-xs">
          {unit}
        </span>
      ),
    },
    {
      title: 'Central Available Stock',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      render: (qty: number | undefined, record) => (
        <Tag color="cyan" icon={<DatabaseOutlined />} className="font-mono font-bold text-sm py-0.5 px-2.5">
          {(qty || 0).toLocaleString()} {record.unit}
        </Tag>
      ),
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
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Item Type"
            description={`Delete "${record.name}"?`}
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
            <CodeSandboxOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100 font-['Outfit'] mb-0.5">
                Item Types Catalog
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mb-0">
                Define catalog items, central stock availability, SKU codes, and measurement units
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchItemTypes} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd}>
              Add Item Type
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="mb-6">
            <Input
              placeholder="Search item types by code, name, or unit..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </main>

      <Modal
        title={itemToEdit ? 'Edit Item Type' : 'Add New Item Type'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Item Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Steel Bar 12mm" />
          </Form.Item>

          <Form.Item name="code" label="Item Code / SKU" rules={[{ required: true }]}>
            <Input prefix={<TagOutlined className="text-gray-400" />} placeholder="e.g. ITM-STL-12" />
          </Form.Item>

          <Form.Item name="unit" label="Measurement Unit" rules={[{ required: true }]}>
            <Input placeholder="e.g. pcs, kg, meters, bags, boxes" />
          </Form.Item>

          <Form.Item
            name="total_quantity"
            label="Central Catalog Available Quantity"
            rules={[{ required: true, message: 'Please specify available stock' }]}
            tooltip="Master stock quantity available in central inventory for allocation to projects"
          >
            <InputNumber min={0} className="w-full" size="large" placeholder="Enter initial quantity (e.g. 50, 100)" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Item specifications or description..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default ItemTypesPage;
