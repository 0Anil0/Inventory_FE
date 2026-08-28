import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, message } from 'antd';
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

  const handleOpenEdit = (v: Vendor) => {
    setVendorToEdit(v);
    form.setFieldsValue({
      name: v.name,
      contact_person: v.contact_person || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      tax_id: v.tax_id || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await vendorApi.delete(id);
      if (res.success) {
        message.success('Vendor deleted successfully');
        setVendors(vendors.filter((v) => v.id !== id));
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
          message.success('Vendor updated successfully');
        }
      } else {
        const res = await vendorApi.create(values);
        if (res.success && res.vendor) {
          setVendors([...vendors, res.vendor]);
          message.success('Vendor created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save vendor details');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contact_person && v.contact_person.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q)) ||
      (v.tax_id && v.tax_id.toLowerCase().includes(q))
    );
  });

  const columns: ColumnsType<Vendor> = [
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
          <span className="text-sm font-semibold flex items-center gap-1.5 text-slate-300">
            <UserOutlined className="text-indigo-400" /> {cp}
          </span>
        ) : (
          <span className="text-xs text-slate-500 italic">N/A</span>
        ),
    },
    {
      title: 'Phone & Email',
      key: 'contact',
      render: (_, record) => (
        <div className="text-xs space-y-0.5">
          {record.phone && (
            <div className="flex items-center gap-1 text-slate-300">
              <PhoneOutlined className="text-emerald-400" /> {record.phone}
            </div>
          )}
          {record.email && (
            <div className="flex items-center gap-1 text-slate-400">
              <MailOutlined className="text-sky-400" /> {record.email}
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
        addr ? <span className="text-xs text-slate-400">{addr}</span> : <span className="text-xs text-slate-500 italic">N/A</span>,
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
          <div className="mb-6">
            <Input
              placeholder="Search vendors by name, contact person, phone, or GST/Tax ID..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredVendors}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            pagination={{ pageSize: 8 }}
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
