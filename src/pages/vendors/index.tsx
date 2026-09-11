import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, Badge, message } from 'antd';
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
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Vendor } from '../../types/inventory';
import { vendorApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const VendorsPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Responsive desktop check (>= 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pagination & Server Filtering state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalVendors, setTotalVendors] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [form] = Form.useForm();

  const fetchVendors = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await vendorApi.getAll({
        page,
        limit,
        search: search || undefined,
        name: filters.name || undefined,
        contact_person: filters.contact_person || undefined,
        phone: filters.phone || undefined,
        email: filters.email || undefined,
      });

      if (res.success && res.vendors) {
        setVendors(res.vendors);
        setTotalVendors(res.total ?? res.vendors.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load suppliers directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors(1, pageSize, appliedFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchVendors(page, newPageSize, appliedFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchVendors(1, pageSize, appliedFilters, val);
  };

  const handleApplyFilters = (values: any) => {
    setAppliedFilters(values);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchVendors(1, pageSize, values, searchQuery);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setAppliedFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchVendors(1, pageSize, {}, '');
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v).length;

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
        message.success('Supplier removed successfully');
        fetchVendors(currentPage, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete vendor');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (vendorToEdit) {
        const res = await vendorApi.update(vendorToEdit.id, values);
        if (res.success) {
          message.success('Supplier details updated successfully');
        }
      } else {
        const res = await vendorApi.create(values);
        if (res.success) {
          message.success('New supplier added successfully');
        }
      }
      setIsModalOpen(false);
      fetchVendors(currentPage, pageSize, appliedFilters, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save supplier details');
    }
  };

  const columns: ColumnsType<Vendor> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 80,
      align: 'center',
      fixed: 'left',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Supplier / Vendor Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
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
      fixed: 'right',
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
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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
            <Button icon={<ReloadOutlined />} onClick={() => fetchVendors(currentPage, pageSize, appliedFilters, searchQuery)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Vendor
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <Badge count={totalVendors} overflowCount={9999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Suppliers: {totalVendors} Records
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Search Bar & Filter Modal Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 shrink-0">
            <Input
              placeholder="Search Vendor Name, Contact, Phone, Email on Server..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              className="flex-1"
            />

            <Button
              icon={<FilterOutlined />}
              onClick={() => setIsFilterModalOpen(true)}
              className={activeFilterCount > 0 ? 'border-indigo-500 text-indigo-600 font-bold' : ''}
            >
              Filter Modal {activeFilterCount > 0 && <Badge count={activeFilterCount} className="ml-1" />}
            </Button>

            {activeFilterCount > 0 && (
              <Button icon={<ClearOutlined />} danger onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-visible lg:overflow-hidden">
            <Table
              columns={columns}
              dataSource={vendors}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 850,
                y: isDesktop ? 'calc(100vh - 480px)' : undefined,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalVendors,
                showSizeChanger: true,
                pageSizeOptions: ['10', '15', '25', '50'],
                onChange: handlePageChange,
              }}
            />
          </div>
        </Card>
      </main>

      {/* Filter Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FilterOutlined className="text-indigo-500 text-lg" />
            <span className="font-bold text-lg font-['Outfit']">Filter Vendor Master</span>
          </div>
        }
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        centered
        width={480}
        footer={[
          <Button key="reset" icon={<ClearOutlined />} onClick={handleResetFilters}>
            Reset Filters
          </Button>,
          <Button
            key="apply"
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => filterForm.submit()}
            className="bg-indigo-600"
          >
            Apply Filters
          </Button>,
        ]}
      >
        <Form
          form={filterForm}
          layout="vertical"
          initialValues={appliedFilters}
          onFinish={handleApplyFilters}
          className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10"
        >
          <Form.Item name="name" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Vendor Name</span>}>
            <Input placeholder="e.g. AMTECH" allowClear />
          </Form.Item>

          <Form.Item name="contact_person" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Contact Person</span>}>
            <Input placeholder="e.g. Rajesh" allowClear />
          </Form.Item>

          <Form.Item name="phone" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Phone Number</span>}>
            <Input placeholder="e.g. 98765" allowClear />
          </Form.Item>

          <Form.Item name="email" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Email</span>}>
            <Input placeholder="e.g. sales@vendor.com" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Modal */}
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
