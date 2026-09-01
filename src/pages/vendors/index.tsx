import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, DatePicker, Badge, message } from 'antd';
const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  ReloadOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { Vendor } from '../../types/inventory';
import { vendorApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [form] = Form.useForm();

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await vendorApi.getAll();
      if (res.success && res.vendors) {
        setVendors(res.vendors);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load suppliers directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenAdd = () => {
    setVendorToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    form.setFieldsValue({
      name: vendor.name,
      contact_person: vendor.contact_person,
      phone: vendor.phone,
      email: vendor.email,
      tax_id: vendor.tax_id,
      address: vendor.address,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await vendorApi.delete(id);
      if (res.success) {
        setVendors(vendors.filter((v) => v.id !== id));
        message.success('Supplier removed successfully');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete vendor');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (vendorToEdit) {
        const res = await vendorApi.update(vendorToEdit.id, values);
        if (res.success && res.vendor) {
          setVendors(vendors.map((v) => (v.id === vendorToEdit.id ? res.vendor : v)));
          message.success('Supplier details updated successfully');
        }
      } else {
        const res = await vendorApi.create(values);
        if (res.success && res.vendor) {
          setVendors([res.vendor, ...vendors]);
          message.success('New supplier added successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save supplier details');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    const cp = v.contact_person || '';
    const phone = v.phone || '';
    const tax = v.tax_id || '';
    const matchesSearch =
      !q ||
      v.name.toLowerCase().includes(q) ||
      cp.toLowerCase().includes(q) ||
      phone.toLowerCase().includes(q) ||
      tax.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (dateRange && (v as any).createdAt) {
      const createdStr = new Date((v as any).createdAt).toISOString().slice(0, 10);
      if (createdStr < dateRange[0] || createdStr > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<Vendor> = [
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
      title: 'Supplier / Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div className="font-bold app-text-main font-['Outfit']">{name}</div>
          {record.tax_id && <div className="text-xs font-mono text-slate-400">GST/Tax: {record.tax_id}</div>}
        </div>
      ),
    },
    {
      title: 'Contact Person',
      dataIndex: 'contact_person',
      key: 'contact_person',
      render: (cp: string | null) =>
        cp ? (
          <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
            <UserOutlined className="text-indigo-500" /> {cp}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">N/A</span>
        ),
    },
    {
      title: 'Phone & Email',
      key: 'contact',
      render: (_, record) => (
        <div className="text-xs space-y-0.5 font-mono">
          {record.phone && (
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
              <PhoneOutlined className="text-emerald-500" /> {record.phone}
            </div>
          )}
          {record.email && (
            <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
              <MailOutlined className="text-sky-500" /> {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (addr: string | null) =>
        addr ? <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{addr}</span> : <span className="text-xs text-slate-400 italic">N/A</span>,
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
            title="Delete Vendor"
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
            <ShopOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Suppliers & Vendors Directory
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage material suppliers, contact persons, tax IDs, and vendor profiles
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchVendors} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              Add Supplier
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredVendors.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredVendors.length} Suppliers
                </Tag>
              </Badge>
              {filteredVendors.length !== vendors.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {vendors.length} total suppliers)
                </span>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              + Add New Supplier
            </Button>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by name, contact, phone, or Tax ID..."
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
            dataSource={filteredVendors}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750, y: 360 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      <Modal
        title={vendorToEdit ? 'Edit Supplier' : 'Add New Supplier'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Supplier / Business Name" rules={[{ required: true, message: 'Vendor Name is required' }]}>
            <Input placeholder="e.g. Apex Building Supplies Ltd" />
          </Form.Item>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="contact_person" label="Contact Person Name">
              <Input placeholder="e.g. Rajesh Kumar" />
            </Form.Item>

            <Form.Item name="phone" label="Phone Number">
              <Input placeholder="e.g. +91 98765 43210" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="email" label="Email Address">
              <Input placeholder="e.g. sales@apexsupplies.com" />
            </Form.Item>

            <Form.Item name="tax_id" label="GST / Tax Identification Number">
              <Input placeholder="e.g. GSTIN27AAACA0000A1Z5" />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Supplier Address">
            <Input.TextArea placeholder="Full business address..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};
export default VendorsPage;
