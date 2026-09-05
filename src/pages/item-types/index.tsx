import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, Popconfirm, Space, Tag, DatePicker, Badge, InputNumber, message } from 'antd';
const { RangePicker } = DatePicker;
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
  TagsOutlined,
  InfoCircleOutlined,
  ShopOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import type { ItemType, Unit } from '../../types/inventory';
import { itemTypeApi, unitApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

const POPULAR_MAKES = [
  'SCHNEIDER',
  'ABB',
  'SOCOMEC',
  'SIEMENS',
  'ESBEE',
  'PECOX',
  'LAPP',
  'ELMEASURE',
  'MULTISPAN',
  'E91E GRADE',
  'CONECTWELL',
];

const POPULAR_FAMILIES = [
  'MCB',
  'MCCB',
  'Power Contactor',
  'Changeover',
  'Indication Lamp',
  'Terminal Blocks',
  'Busbar (Cu.)',
  'Metering CT',
  'Accessory',
];

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ItemType | null>(null);
  const [form] = Form.useForm();

  const fetchItemTypes = async () => {
    setLoading(true);
    try {
      const [itemRes, unitRes] = await Promise.all([
        itemTypeApi.getAll(),
        unitApi.getAll().catch(() => ({ success: false, units: [] })),
      ]);

      if (itemRes.success && itemRes.items) {
        setItems(itemRes.items);
      }
      if (unitRes.success && unitRes.units) {
        setUnits(unitRes.units);
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
    if (units.length > 0) {
      form.setFieldsValue({ unit_id: units[0].id, unit: units[0].code });
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
      switchgear_family: item.switchgear_family || '',
      unit_id: item.unit_id,
      unit: item.unit,
      unit_rate: item.unit_rate || 0,
      discount: item.discount || 0,
      description: item.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await itemTypeApi.delete(id);
      if (res.success) {
        setItems(items.filter((i) => i.id !== id));
        message.success('Item type deleted successfully');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete item type');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      const selectedUnitObj = units.find((u) => u.id === values.unit_id);
      const payload = {
        ...values,
        total_quantity: values.total_quantity !== undefined ? values.total_quantity : 0,
        unit: selectedUnitObj ? selectedUnitObj.code : values.unit || 'PCS',
      };

      if (itemToEdit) {
        const res = await itemTypeApi.update(itemToEdit.id, payload);
        if (res.success && res.item) {
          setItems(items.map((i) => (i.id === itemToEdit.id ? res.item : i)));
          message.success('Item master updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(payload);
        if (res.success && res.item) {
          setItems([res.item, ...items]);
          message.success('Item master created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save item type');
    }
  };

  // Auto-generate full description if fields change
  const handleValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.name || changedValues.rating || changedValues.make) {
      const parts = [allValues.name, allValues.rating, allValues.make].filter(Boolean);
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

    if (dateRange && (item as any).createdAt) {
      const createdStr = new Date((item as any).createdAt).toISOString().slice(0, 10);
      if (createdStr < dateRange[0] || createdStr > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<ItemType> = [
    {
      title: 'Item No / Code',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Make (Brand)',
      dataIndex: 'make',
      key: 'make',
      width: 140,
      render: (make: string | null) =>
        make ? (
          <Tag color="blue" icon={<ShopOutlined />} className="font-bold text-xs">
            {make}
          </Tag>
        ) : (
          <span className="app-text-muted italic">-</span>
        ),
    },
    {
      title: 'Cat No.',
      dataIndex: 'cat_no',
      key: 'cat_no',
      width: 140,
      render: (catNo: string | null) =>
        catNo ? (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{catNo}</span>
        ) : (
          <span className="app-text-muted italic">N/A</span>
        ),
    },
    {
      title: 'Item & Rating',
      key: 'item_rating',
      render: (_, record) => (
        <div className="flex flex-col leading-tight">
          <span className="font-bold app-text-main">{record.name}</span>
          {record.rating && <span className="text-xs text-indigo-500 font-semibold">{record.rating}</span>}
        </div>
      ),
    },
    {
      title: 'Full Description',
      dataIndex: 'full_description',
      key: 'full_description',
      render: (desc: string | null, record) => (
        <span className="text-xs app-text-secondary">{desc || record.description || record.name}</span>
      ),
    },
    {
      title: 'Unit Rate (₹)',
      dataIndex: 'unit_rate',
      key: 'unit_rate',
      width: 120,
      align: 'right',
      render: (rate: number | undefined) => (
        <span className="font-mono font-semibold">₹{(rate || 0).toLocaleString()}</span>
      ),
    },
    {
      title: 'Discount %',
      dataIndex: 'discount',
      key: 'discount',
      width: 100,
      align: 'right',
      render: (disc: number | undefined) => (
        <Tag color="orange" className="font-mono font-bold">
          {(disc || 0)}%
        </Tag>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 90,
      render: (unitStr: string, record) => {
        const displayUnit = record.unit_details ? record.unit_details.code : unitStr;
        return (
          <Tag color="purple" className="font-mono font-bold text-xs py-0.5 px-2">
            {(displayUnit || 'pcs').toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Stock Qty',
      dataIndex: 'total_quantity',
      key: 'total_quantity',
      width: 110,
      render: (qty: number | undefined, record) => (
        <Tag color="cyan" icon={<DatabaseOutlined />} className="font-mono font-bold text-xs py-0.5 px-2">
          {(qty || 0).toLocaleString()} {record.unit}
        </Tag>
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
            title="Delete Item Type"
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
                Item Master Directory
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage Item Number, Short Name, Rating, Catalogue Numbers (Cat No), Brand Makes & Base Pricing
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchItemTypes} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Item
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          {/* Header & Filter Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredItems.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Items: {filteredItems.length} Products
                </Tag>
              </Badge>
              {filteredItems.length !== items.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {items.length} total products)
                </span>
              )}
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search Cat No, Code, Name, Make..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />

            <Select
              value={selectedMake}
              onChange={(val) => setSelectedMake(val)}
              options={[
                { value: 'ALL', label: 'All Makes (Brands)' },
                ...POPULAR_MAKES.map((m) => ({ value: m, label: m })),
              ]}
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
                setSelectedMake('ALL');
                setDateRange(null);
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
            scroll={{ x: 900, y: 400 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      <Modal
        title={itemToEdit ? 'Edit Master Item' : 'Add Master Item'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={handleValuesChange}
          className="mt-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="code" label="Item Number (Code)" rules={[{ required: true, message: 'Item Number is required' }]}>
              <Input prefix={<TagOutlined className="text-gray-400" />} placeholder="e.g. 1001 or ITM-1001" />
            </Form.Item>

            <Form.Item name="make" label="Make (Brand Master)">
              <Select
                placeholder="Select or enter Make (e.g. SCHNEIDER)"
                showSearch
                allowClear
                options={POPULAR_MAKES.map((m) => ({ value: m, label: m }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="name" label="Item Name / Family" rules={[{ required: true, message: 'Item Name is required' }]}>
              <Input placeholder="e.g. MCB, MCCB, Plug" />
            </Form.Item>

            <Form.Item name="rating" label="Item Rating / Spec">
              <Input placeholder="e.g. 2A / 4P, 100A 36kA" />
            </Form.Item>
          </div>

          <Form.Item name="full_description" label="Full Description">
            <Input placeholder="e.g. Miniature Circuit Breaker (MCB) SP 10kA 2A" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="cat_no" label="Cat No. (Catalogue Number)">
              <Input prefix={<SafetyOutlined className="text-emerald-500" />} placeholder="e.g. DS1A7A1, A9N1P02CGN" />
            </Form.Item>

            <Form.Item
              name="unit_id"
              label="Measurement Unit"
              rules={[{ required: true, message: 'Please select a unit' }]}
            >
              <Select
                placeholder="Select unit..."
                showSearch
                options={units.map((u) => ({
                  value: u.id,
                  label: `${u.code} - ${u.name}`,
                }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="unit_rate" label="Base Unit Rate (₹)">
              <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g. 2025" />
            </Form.Item>

            <Form.Item name="discount" label="Discount (%)">
              <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="e.g. 43.50" />
            </Form.Item>
          </div>

          <Form.Item name="description" label="Additional Notes">
            <Input.TextArea placeholder="Internal specs or notes..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ItemTypesPage;
