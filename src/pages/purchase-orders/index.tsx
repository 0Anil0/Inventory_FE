import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, InputNumber, Tag, Space, message, Popover } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  ShoppingOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  FileTextOutlined,
} from '@ant-design/icons';
import type { PurchaseOrder, Vendor, Project, ItemType } from '../../types/inventory';
import { poApi, vendorApi, projectApi, itemTypeApi } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';

export const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [poRes, vRes, pRes, iRes] = await Promise.all([
        poApi.getAll(),
        vendorApi.getAll(),
        projectApi.getAll(),
        itemTypeApi.getAll(),
      ]);

      if (poRes.success && poRes.purchaseOrders) setOrders(poRes.purchaseOrders);
      if (vRes.success && vRes.vendors) setVendors(vRes.vendors);
      if (pRes.success && pRes.projects) setProjects(pRes.projects);
      if (iRes.success && iRes.items) setItemTypes(iRes.items);
    } catch (err: any) {
      message.error(err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenCreatePO = () => {
    form.resetFields();
    if (vendors.length > 0) form.setFieldValue('vendor_id', vendors[0].id);
    if (projects.length > 0) form.setFieldValue('project_id', projects[0].id);
    // Set default item row
    form.setFieldsValue({
      items: [{ item_type_id: itemTypes[0]?.id, ordered_qty: 100, unit_price: 10 }],
    });
    setIsModalOpen(true);
  };

  const handleFinish = async (values: any) => {
    try {
      const res = await poApi.create(values);
      if (res.success && res.purchaseOrder) {
        setOrders([res.purchaseOrder, ...orders]);
        message.success(`Purchase order ${res.purchaseOrder.po_number} created successfully`);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create purchase order');
    }
  };

  const handleReceiveStock = async (poId: number) => {
    try {
      const res = await poApi.receiveStock(poId);
      if (res.success && res.purchaseOrder) {
        message.success('Stock received and automatically added to inventory stock!');
        setOrders(orders.map((po) => (po.id === poId ? res.purchaseOrder : po)));
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to receive stock');
    }
  };

  const filteredOrders = orders.filter((po) => {
    const q = searchQuery.toLowerCase();
    const vendorName = po.vendor?.name || '';
    const projName = po.project?.name || '';
    return (
      po.po_number.toLowerCase().includes(q) ||
      vendorName.toLowerCase().includes(q) ||
      projName.toLowerCase().includes(q)
    );
  });

  const getStatusTag = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none">
            STOCK RECEIVED
          </Tag>
        );
      case 'ORDERED':
        return (
          <Tag icon={<ClockCircleOutlined />} color="processing" className="font-bold border-none">
            ORDERED (PENDING)
          </Tag>
        );
      case 'CANCELLED':
        return <Tag color="error" className="font-bold border-none">CANCELLED</Tag>;
      default:
        return <Tag color="default" className="font-bold border-none">{status}</Tag>;
    }
  };

  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'PO Number & Date',
      key: 'po_number',
      render: (_, record) => (
        <div>
          <div className="font-mono font-bold text-indigo-500 text-base">{record.po_number}</div>
          <div className="text-xs text-slate-400 font-mono">
            {record.order_date ? new Date(record.order_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Supplier / Vendor',
      key: 'vendor',
      render: (_, record) => (
        <span className="font-semibold text-slate-200">
          {record.vendor?.name || `Vendor #${record.vendor_id}`}
        </span>
      ),
    },
    {
      title: 'Destination Site',
      key: 'project',
      render: (_, record) => (
        <span className="text-slate-300">
          {record.project?.name || 'Central Warehouse'}
        </span>
      ),
    },
    {
      title: 'PO Items Summary',
      key: 'items',
      render: (_, record) => (
        <Popover
          content={
            <div className="space-y-1 text-xs font-mono">
              {record.items?.map((item) => (
                <div key={item.id}>
                  • {item.item_type?.name}: <strong>{item.ordered_qty}</strong> {item.item_type?.unit} @ ₹{item.unit_price}
                </div>
              ))}
            </div>
          }
          title="PO Line Items"
        >
          <Tag icon={<FileTextOutlined />} color="purple" className="cursor-pointer font-bold">
            {record.items?.length || 0} Item(s)
          </Tag>
        </Popover>
      ),
    },
    {
      title: 'Total Value',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amt: number) => (
        <span className="font-mono font-bold text-emerald-400">
          ₹{(amt || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PurchaseOrder['status']) => getStatusTag(status),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'ORDERED' && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              size="small"
              onClick={() => handleReceiveStock(record.id)}
              className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-md"
            >
              Receive Stock Inward
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen app-page-bg flex flex-col">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShoppingOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Purchase Orders & Stock Inward
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Issue vendor purchase orders and receive incoming stock into central inventory or project sites
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchInitialData} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreatePO}>
              + Create Purchase Order
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="mb-6">
            <Input
              placeholder="Search purchase orders by PO Number, Supplier, or Project Site..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            scroll={{ x: 850 }}
            pagination={{ pageSize: 8 }}
          />
        </Card>
      </main>

      <Modal
        title="Create New Vendor Purchase Order"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        width={700}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="vendor_id"
              label="Select Supplier / Vendor"
              rules={[{ required: true, message: 'Select supplier' }]}
            >
              <Select placeholder="Select Supplier">
                {vendors.map((v) => (
                  <Select.Option key={v.id} value={v.id}>
                    {v.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="project_id" label="Destination Project Site (Optional)">
              <Select placeholder="Select Project (or Central Stock)">
                {projects.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="font-bold text-sm text-indigo-400 mb-2">PO Line Items</div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                    <Form.Item
                      {...restField}
                      name={[name, 'item_type_id']}
                      rules={[{ required: true, message: 'Select item' }]}
                      className="mb-0 flex-1 w-full"
                    >
                      <Select placeholder="Select Item Type">
                        {itemTypes.map((item) => (
                          <Select.Option key={item.id} value={item.id}>
                            {item.name} ({item.code}) — [{item.unit}]
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'ordered_qty']}
                      rules={[{ required: true, message: 'Enter Qty' }]}
                      className="mb-0 w-full md:w-32"
                    >
                      <InputNumber min={1} placeholder="Ordered Qty" className="w-full" />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'unit_price']}
                      rules={[{ required: true, message: 'Enter Price' }]}
                      className="mb-0 w-full md:w-32"
                    >
                      <InputNumber min={0} placeholder="Unit Price (₹)" className="w-full" />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button danger type="text" onClick={() => remove(name)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Another Line Item
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item name="notes" label="PO Terms & Remarks (Optional)" className="mt-4">
            <Input.TextArea placeholder="e.g. Payment due within 30 days of GRN" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
export default PurchaseOrdersPage;
