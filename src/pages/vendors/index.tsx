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
  SaveOutlined,
  CheckOutlined,
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
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      tax_id: vendor.tax_id || '',
      address: vendor.address || '',
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
      width: 80,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500">{index + 1}</span>
      ),
    },
    {
      title: 'Supplier / Vendor Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div>
          <div className="font-bold app-text-main font-['Outfit'] text-base">{name}</div>
          {record.tax_id && <div className="text-xs font-mono text-emerald-500 font-semibold">GSTIN: {record.tax_id}</div>}
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
            title="Delete Supplier"
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
            <ShopOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Vendor Master Directory
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
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Vendor
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredVendors.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Suppliers: {filteredVendors.length} Records
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by name, contact, phone, or Tax ID..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
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
            >
              Reset Filters
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={filteredVendors}
            rowKey="id"
            loading={loading}
            scroll={{ x: 850, y: 400 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      <Modal
        title={
          <div className="flex items-center gap-2.5 py-1 text-slate-800 dark:text-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ShopOutlined className="text-lg" />
            </div>
            <span className="font-bold text-lg font-['Outfit']">
              {vendorToEdit ? 'Edit Vendor Supplier' : 'Add New Vendor Supplier'}
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
            icon={vendorToEdit ? <CheckOutlined /> : <SaveOutlined />}
            onClick={() => form.submit()}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            {vendorToEdit ? 'Update Supplier' : 'Save Supplier'}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4 pt-2 border-t border-slate-100 dark:border-white/10">
          <Form.Item name="name" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Supplier / Business Name</span>} rules={[{ required: true, message: 'Vendor Name is required' }]}>
            <Input placeholder="e.g. AMTECH INDIA" size="large" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item name="contact_person" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Contact Person Name</span>}>
              <Input placeholder="e.g. Rajesh Kumar" size="large" />
            </Form.Item>

            <Form.Item name="phone" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Phone Number</span>}>
              <Input placeholder="e.g. +91 98765 43210" size="large" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item name="email" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Email Address</span>}>
              <Input placeholder="e.g. sales@amtech.com" size="large" />
            </Form.Item>

            <Form.Item name="tax_id" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">GST / Tax Identification Number</span>}>
              <Input placeholder="e.g. GSTIN27AAACA0000A1Z5" size="large" />
            </Form.Item>
          </div>

          <Form.Item name="address" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Supplier Address</span>}>
            <Input.TextArea placeholder="Full business address..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};
export default VendorsPage;
