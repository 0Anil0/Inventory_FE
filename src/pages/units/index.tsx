import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, Badge, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  TagsOutlined,
  ReloadOutlined,
  TagOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Unit } from '../../types/inventory';
import { unitApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const UnitsPage: React.FC = () => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination & Server Filtering state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [unitToEdit, setUnitToEdit] = useState<Unit | null>(null);
  const [form] = Form.useForm();

  const fetchUnits = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await unitApi.getAll({
        page,
        limit,
        search: search || undefined,
        name: filters.name || undefined,
        code: filters.code || undefined,
      });

      if (res.success && res.units) {
        setUnits(res.units);
        setTotalUnits(res.total ?? res.units.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load measurement units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits(1, pageSize, appliedFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchUnits(page, newPageSize, appliedFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchUnits(1, pageSize, appliedFilters, val);
  };

  const handleApplyFilters = (values: any) => {
    setAppliedFilters(values);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchUnits(1, pageSize, values, searchQuery);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setAppliedFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchUnits(1, pageSize, {}, '');
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v).length;

  const handleOpenAdd = () => {
    setUnitToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setUnitToEdit(unit);
    form.setFieldsValue({
      name: unit.name,
      code: unit.code,
      description: unit.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await unitApi.delete(id);
      if (res.success) {
        message.success('Unit deleted successfully');
        fetchUnits(currentPage, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete unit');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (unitToEdit) {
        const res = await unitApi.update(unitToEdit.id, values);
        if (res.success) {
          message.success('Unit updated successfully');
        }
      } else {
        const res = await unitApi.create(values);
        if (res.success) {
          message.success('Unit created successfully');
        }
      }
      setIsModalOpen(false);
      fetchUnits(currentPage, pageSize, appliedFilters, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save unit');
    }
  };

  const columns: ColumnsType<Unit> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 90,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: 'Unit Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => (
        <Tag color="purple" className="font-mono font-bold text-sm px-2.5 py-0.5">
          {code}
        </Tag>
      ),
    },
    {
      title: 'Unit Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold app-text-main">{name}</span>,
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
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-600 dark:text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Unit"
            description={`Delete unit "${record.name}" (${record.code})?`}
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
            <TagsOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Units Management
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage measurement units (e.g., PCS, KG, MTR, LTR, BOX) with Server Search, Pagination & Filter Modal
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchUnits(currentPage, pageSize, appliedFilters, searchQuery)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add Unit
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          {/* Total Records Counter */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={totalUnits} overflowCount={9999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {totalUnits} Units
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Search Bar & Filter Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <Input
              placeholder="Search Unit Code, Name, Description on Server..."
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

          <Table
            columns={columns}
            dataSource={units}
            rowKey="id"
            loading={loading}
            scroll={{ x: 600, y: 360 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalUnits,
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50'],
              onChange: handlePageChange,
            }}
          />
        </Card>
      </main>

      {/* Filter Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FilterOutlined className="text-indigo-500 text-lg" />
            <span className="font-bold text-lg font-['Outfit']">Filter Unit Master</span>
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
          <Form.Item name="code" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Unit Symbol / Code</span>}>
            <Input placeholder="e.g. PCS" allowClear />
          </Form.Item>

          <Form.Item name="name" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Unit Name</span>}>
            <Input placeholder="e.g. Pieces" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        title={unitToEdit ? 'Edit Unit' : 'Add New Unit'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Unit Name" rules={[{ required: true, message: 'Unit Name is required' }]}>
            <Input placeholder="e.g. Kilograms, Pieces, Meters" />
          </Form.Item>

          <Form.Item name="code" label="Unit Symbol / Code" rules={[{ required: true, message: 'Unit Code is required' }]}>
            <Input prefix={<TagOutlined className="text-gray-400" />} placeholder="e.g. KG, PCS, MTR" className="uppercase" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional unit description or usage notes..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default UnitsPage;
