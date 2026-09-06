import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, Popconfirm, Space, Tag, Badge, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeSandboxOutlined,
  ReloadOutlined,
  TagOutlined,
  ShopOutlined,
  SafetyOutlined,
  SaveOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import type { ItemType, Make } from '../../types/inventory';
import { itemTypeApi, makeApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ItemType | null>(null);
  const [form] = Form.useForm();

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [itemRes, makeRes] = await Promise.all([
        itemTypeApi.getAll(),
        makeApi.getAll().catch(() => ({ success: false, makes: [] })),
      ]);

      if (itemRes.success && itemRes.items) setItems(itemRes.items);
      if (makeRes.success && makeRes.makes) setMakes(makeRes.makes);
    } catch (err: any) {
      message.error(err.message || 'Failed to load item master catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenAdd = () => {
    setItemToEdit(null);
    form.resetFields();
    if (makes.length > 0) {
      form.setFieldValue('make', makes[0].name);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemType) => {
    setItemToEdit(item);
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      rating: item.rating || '',
      full_description: item.full_description || '',
      cat_no: item.cat_no || '',
      make: item.make || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await itemTypeApi.delete(id);
      if (res.success) {
        setItems(items.filter((i) => i.id !== id));
        message.success('Item master deleted successfully');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete item master');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (itemToEdit) {
        const res = await itemTypeApi.update(itemToEdit.id, values);
        if (res.success && res.item) {
          setItems(items.map((i) => (i.id === itemToEdit.id ? res.item : i)));
          message.success('Item master updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(values);
        if (res.success && res.item) {
          setItems([res.item, ...items]);
          message.success('Item master created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save item master');
    }
  };

  // Auto-generate full description if user inputs name or rating
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.name || changedValues.rating) {
      const parts = [allValues.name, allValues.rating].filter(Boolean);
      if (parts.length > 0 && !form.isFieldTouched('full_description')) {
        form.setFieldValue('full_description', parts.join(' '));
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      (item.cat_no && item.cat_no.toLowerCase().includes(q)) ||
      (item.make && item.make.toLowerCase().includes(q)) ||
      (item.rating && item.rating.toLowerCase().includes(q)) ||
      (item.full_description && item.full_description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (selectedMake !== 'ALL' && item.make !== selectedMake) {
      return false;
    }

    return true;
  });

  // Table columns matching the exact 6 fields from the handwritten note
  const columns: ColumnsType<ItemType> = [
    {
      title: 'Item Number (input)',
      dataIndex: 'code',
      key: 'code',
      width: 170,
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Item (input)',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <span className="font-bold app-text-main">{name}</span>,
    },
    {
      title: 'Item description',
      dataIndex: 'rating',
      key: 'rating',
      width: 150,
      render: (rating: string | null) =>
        rating ? (
          <span className="text-sm text-indigo-500 font-semibold">{rating}</span>
        ) : (
          <span className="app-text-muted italic">-</span>
        ),
    },
    {
      title: 'Full description (input)',
      dataIndex: 'full_description',
      key: 'full_description',
      render: (fullDesc: string | null, record) => (
        <span className="text-sm app-text-secondary">{fullDesc || `${record.name} ${record.rating || ''}`.trim()}</span>
      ),
    },
    {
      title: 'Cat No (input unique)',
      dataIndex: 'cat_no',
      key: 'cat_no',
      width: 170,
      render: (catNo: string | null) =>
        catNo ? (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{catNo}</span>
        ) : (
          <span className="app-text-muted italic">N/A</span>
        ),
    },
    {
      title: 'Make (master)',
      dataIndex: 'make',
      key: 'make',
      width: 150,
      render: (makeStr: string | null) =>
        makeStr ? (
          <Tag color="blue" icon={<ShopOutlined />} className="font-bold text-sm py-0.5 px-2.5">
            {makeStr}
          </Tag>
        ) : (
          <span className="app-text-muted italic">-</span>
        ),
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
            title="Delete Item"
            description={`Delete "${record.name}"?`}
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
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CodeSandboxOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Item Master
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Form containing ONLY the 6 specified fields: Item Number, Item, Item Description, Full Description, Cat No & Make
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchInitialData} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Item Master
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredItems.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Items: {filteredItems.length} Records
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Toolbar: Keyword Search + Filter by Make */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by Cat No, Item Number, Item, Make..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />

            <Select
              value={selectedMake}
              onChange={(val) => setSelectedMake(val)}
              options={[
                { value: 'ALL', label: 'All Makes (Make Master)' },
                ...makes.map((m) => ({ value: m.name, label: m.name })),
              ]}
            />

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchQuery('');
                setSelectedMake('ALL');
              }}
            >
              Reset Filters
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            scroll={{ x: 950, y: 400 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      {/* Styled Premium Modal Form with 2-Column Grid and Custom Header/Footer */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 py-1 text-slate-800 dark:text-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <CodeSandboxOutlined className="text-lg" />
            </div>
            <span className="font-bold text-lg font-['Outfit']">
              {itemToEdit ? 'Edit Item Master' : 'Add Item Master'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        centered
        width={700}
        footer={[
          <Button key="cancel" size="large" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            icon={itemToEdit ? <CheckOutlined /> : <SaveOutlined />}
            onClick={() => form.submit()}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            {itemToEdit ? 'Update Item Master' : 'Save Item Master'}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={handleValuesChange}
          className="mt-4 pt-2 border-t border-slate-100 dark:border-white/10"
        >
          {/* Row 1: Item Number & Make (Master) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="code"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item Number (input)</span>}
              rules={[{ required: true, message: 'Item Number is required' }]}
            >
              <Input prefix={<TagOutlined className="text-slate-400" />} placeholder="e.g. 1001" size="large" />
            </Form.Item>

            <Form.Item
              name="make"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Make (master)</span>}
              rules={[{ required: true, message: 'Make is required' }]}
            >
              <Select
                placeholder="Select Make (ABB, SCHNEIDER...)"
                showSearch
                size="large"
                options={makes.map((m) => ({ value: m.name, label: m.name }))}
              />
            </Form.Item>
          </div>

          {/* Row 2: Item Name & Item Description (Rating) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="name"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item (input)</span>}
              rules={[{ required: true, message: 'Item name is required' }]}
            >
              <Input placeholder="e.g. MCB" size="large" />
            </Form.Item>

            <Form.Item
              name="rating"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item description</span>}
            >
              <Input placeholder="e.g. 2A / 4P" size="large" />
            </Form.Item>
          </div>

          {/* Row 3: Cat No & Full Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="cat_no"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Cat No (input unique)</span>}
            >
              <Input prefix={<SafetyOutlined className="text-emerald-500" />} placeholder="e.g. DS1A7A1, A9N1P02CGN" size="large" />
            </Form.Item>

            <Form.Item
              name="full_description"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Full description (input)</span>}
            >
              <Input placeholder="e.g. MCB 2A 4P" size="large" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ItemTypesPage;
