import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, Popconfirm, Space, Tag, DatePicker, Badge, message } from 'antd';
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
} from '@ant-design/icons';
import type { ItemType, Unit } from '../../types/inventory';
import { itemTypeApi, unitApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
      unit_id: item.unit_id,
      unit: item.unit,
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
          message.success('Item type updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(payload);
        if (res.success && res.item) {
          setItems([res.item, ...items]);
          message.success('Item type created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save item type');
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const unitText = item.unit_details ? `${item.unit_details.name} (${item.unit_details.code})` : item.unit || '';
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      unitText.toLowerCase().includes(q);

    if (!matchesSearch) return false;

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
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Item Type Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold app-text-main">{name}</span>,
    },
    {
      title: 'Measurement Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 170,
      render: (unitStr: string, record) => {
        const displayUnit = record.unit_details ? `${record.unit_details.code}` : unitStr;
        return (
          <Tag color="purple" icon={<TagsOutlined />} className="font-mono font-bold text-xs py-0.5 px-2">
            {displayUnit.toUpperCase()}
          </Tag>
        );
      },
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

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CodeSandboxOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Item Types Catalog
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
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
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredItems.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredItems.length} Catalog Items
                </Tag>
              </Badge>
              {filteredItems.length !== items.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {items.length} total catalog items)
                </span>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              + Add Catalog Item Type
            </Button>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by code, name, or unit..."
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
            dataSource={filteredItems}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750, y: 360 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
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
          <Form.Item name="name" label="Item Name" rules={[{ required: true, message: 'Item Name is required' }]}>
            <Input placeholder="e.g. Steel Bar 12mm" />
          </Form.Item>

          <Form.Item name="code" label="Item Code / SKU" rules={[{ required: true, message: 'Item Code is required' }]}>
            <Input prefix={<TagOutlined className="text-gray-400" />} placeholder="e.g. ITM-STL-12" />
          </Form.Item>

          <Form.Item
            name="unit_id"
            label="Measurement Unit"
            rules={[{ required: true, message: 'Please select a measurement unit' }]}
          >
            <Select
              placeholder="Select measurement unit..."
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
              }
              options={units.map((u) => ({
                value: u.id,
                label: `${u.code} - ${u.name}`,
              }))}
              notFoundContent={
                <div className="p-2 text-center text-xs text-gray-400">
                  No units found. Add units in the Units menu first.
                </div>
              }
            />
          </Form.Item>

          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 mb-4 flex items-center gap-2">
            <InfoCircleOutlined className="text-base text-indigo-400 shrink-0" />
            <span>
              <strong>Catalog Item Profile:</strong> Creating an item registers its name & code in your master catalog (Stock starts at 0). Actual stock is added when you receive a <strong>Purchase Order</strong> from a supplier.
            </span>
          </div>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Item specifications or description..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ItemTypesPage;
