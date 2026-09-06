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
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Make } from '../../types/inventory';
import { makeApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const MakesPage: React.FC = () => {
  const [makes, setMakes] = useState<Make[]>([]);
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
  const [pageSize, setPageSize] = useState<number>(12);
  const [totalMakes, setTotalMakes] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [makeToEdit, setMakeToEdit] = useState<Make | null>(null);
  const [form] = Form.useForm();

  const fetchMakes = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await makeApi.getAll({
        page,
        limit,
        search: search || undefined,
        name: filters.name || undefined,
        code: filters.code || undefined,
      });

      if (res.success && res.makes) {
        setMakes(res.makes);
        setTotalMakes(res.total ?? res.makes.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load brand makes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMakes(1, pageSize, appliedFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchMakes(page, newPageSize, appliedFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchMakes(1, pageSize, appliedFilters, val);
  };

  const handleApplyFilters = (values: any) => {
    setAppliedFilters(values);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchMakes(1, pageSize, values, searchQuery);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setAppliedFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchMakes(1, pageSize, {}, '');
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v).length;

  const handleOpenAdd = () => {
    setMakeToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (make: Make) => {
    setMakeToEdit(make);
    form.setFieldsValue({
      name: make.name,
      code: make.code || '',
      description: make.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await makeApi.delete(id);
      if (res.success) {
        message.success('Make deleted successfully');
        fetchMakes(currentPage, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete make');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (makeToEdit) {
        const res = await makeApi.update(makeToEdit.id, values);
        if (res.success) {
          message.success('Make updated successfully');
        }
      } else {
        const res = await makeApi.create(values);
        if (res.success) {
          message.success('Make created successfully');
        }
      }
      setIsModalOpen(false);
      fetchMakes(currentPage, pageSize, appliedFilters, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save make');
    }
  };

  const columns: ColumnsType<Make> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 80,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Brand / Make Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Tag color="blue" icon={<ShopOutlined />} className="font-bold text-sm py-1 px-3">
          {name}
        </Tag>
      ),
    },
    {
      title: 'Brand Code / Abbreviation',
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (
        <span className="font-mono text-xs text-indigo-500 font-bold">{code || '-'}</span>
      ),
    },
    {
      title: 'Description / Remarks',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) => desc || <span className="app-text-muted italic">No remarks</span>,
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
            title="Delete Make"
            description={`Delete brand "${record.name}"?`}
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
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <ShopOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Make Master (Brands)
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage manufacturer brands (ABB, Schneider, Siemens, Socomec, Esbee, Pecox, etc.)
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchMakes(currentPage, pageSize, appliedFilters, searchQuery)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Brand Make
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 shrink-0">
            <Input
              placeholder="Search Brand Make on Server..."
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

            <span className="text-xs font-bold text-indigo-500 shrink-0">Total Brands: {totalMakes}</span>
          </div>

          <div className="flex-1 overflow-visible lg:overflow-hidden">
            <Table
              columns={columns}
              dataSource={makes}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 650,
                y: isDesktop ? 'calc(100vh - 385px)' : undefined,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalMakes,
                showSizeChanger: true,
                pageSizeOptions: ['10', '12', '25', '50'],
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
            <span className="font-bold text-lg font-['Outfit']">Filter Make Master</span>
          </div>
        }
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        centered
        width={450}
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
          <Form.Item name="name" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Brand / Make Name</span>}>
            <Input placeholder="e.g. SIEMENS" allowClear />
          </Form.Item>

          <Form.Item name="code" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Brand Code</span>}>
            <Input placeholder="e.g. ABB" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        title={makeToEdit ? 'Edit Brand Make' : 'Add Brand Make'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Make / Brand Name (e.g. ABB, SCHNEIDER)" rules={[{ required: true, message: 'Brand name is required' }]}>
            <Input placeholder="e.g. ABB" />
          </Form.Item>

          <Form.Item name="code" label="Short Code / SKU Abbreviation (Optional)">
            <Input placeholder="e.g. ABB" />
          </Form.Item>

          <Form.Item name="description" label="Remarks / Notes">
            <Input.TextArea placeholder="Manufacturer description or notes..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default MakesPage;
