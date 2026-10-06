import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, Badge, Tooltip, message, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { Plant } from '../../types/plant';
import { plantApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const PlantsPage: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
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
  const [totalPlants, setTotalPlants] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [plantToEdit, setPlantToEdit] = useState<Plant | null>(null);
  const [form] = Form.useForm();

  const fetchPlants = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await plantApi.getAll({
        page,
        limit,
        search: search || undefined,
        status: filters.status || undefined,
      });

      if (res.success && res.plants) {
        setPlants(res.plants);
        setTotalPlants(res.total ?? res.plants.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants(1, pageSize, appliedFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchPlants(page, newPageSize, appliedFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchPlants(1, pageSize, appliedFilters, val);
  };

  const handleApplyFilters = (values: any) => {
    setAppliedFilters(values);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchPlants(1, pageSize, values, searchQuery);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setAppliedFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchPlants(1, pageSize, {}, '');
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v).length;

  const handleOpenAdd = () => {
    setPlantToEdit(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plant: Plant) => {
    setPlantToEdit(plant);
    form.setFieldsValue({
      name: plant.name,
      code: plant.code || '',
      address: plant.address || '',
      status: plant.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await plantApi.delete(id);
      if (res.success) {
        message.success('Plant deleted successfully');
        fetchPlants(currentPage, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete plant');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (plantToEdit) {
        const res = await plantApi.update(plantToEdit.id, values);
        if (res.success) {
          message.success('Plant updated successfully');
        }
      } else {
        const res = await plantApi.create(values);
        if (res.success) {
          message.success('Plant created successfully');
        }
      }
      setIsModalOpen(false);
      fetchPlants(currentPage, pageSize, appliedFilters, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save plant');
    }
  };

  const columns: ColumnsType<Plant> = [
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
      title: 'Plant Name',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      render: (name: string) => (
        <Tag color="geekblue" icon={<EnvironmentOutlined />} className="font-bold text-sm py-1 px-3">
          {name}
        </Tag>
      ),
    },
    {
      title: 'Plant Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string | null) => (
        <span className="font-mono text-xs text-indigo-500 font-bold">{code || '-'}</span>
      ),
    },
    {
      title: 'Address / Location',
      dataIndex: 'address',
      key: 'address',
      render: (address: string | null) => address || <span className="app-text-muted italic">No address</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      )
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
            title="Delete Plant"
            description={`Delete plant "${record.name}"?`}
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
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <EnvironmentOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Plant Master
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage manufacturing plants and site locations
              </p>
            </div>
          </div>

          <Space>
            <Tooltip title="Refresh Plants">
              <Button shape="circle" icon={<ReloadOutlined />} onClick={() => fetchPlants(currentPage, pageSize, appliedFilters, searchQuery)} loading={loading} />
            </Tooltip>
            <Tooltip title="Add New Plant">
              <Button type="primary" shape="circle" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30" />
            </Tooltip>
          </Space>
        </div>

        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 shrink-0">
            <Input
              placeholder="Search Plant..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              className="w-44 sm:w-52 max-w-xs"
            />

            <Tooltip title="Open Advanced Filters">
              <Badge count={activeFilterCount} offset={[-3, 3]}>
                <Button
                  shape="circle"
                  icon={<FilterOutlined />}
                  onClick={() => setIsFilterModalOpen(true)}
                  className={activeFilterCount > 0 ? 'border-indigo-500 text-indigo-600 font-bold' : ''}
                />
              </Badge>
            </Tooltip>

            {activeFilterCount > 0 && (
              <Tooltip title="Reset Filters">
                <Button shape="circle" icon={<ClearOutlined />} danger onClick={handleResetFilters} />
              </Tooltip>
            )}

            <span className="text-xs font-bold text-indigo-500 shrink-0">Total Plants: {totalPlants}</span>
          </div>

          <div className="flex-1 overflow-visible lg:overflow-hidden">
            <Table
              columns={columns}
              dataSource={plants}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 650,
                y: isDesktop ? 'calc(100vh - 480px)' : undefined,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalPlants,
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
            <span className="font-bold text-lg font-['Outfit']">Filter Plant Master</span>
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
          <Form.Item name="status" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Status</span>}>
            <Select placeholder="Select status" allowClear>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal
        title={plantToEdit ? 'Edit Plant' : 'Add Plant'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4" initialValues={{ status: 'active' }}>
          <Form.Item name="name" label="Plant Name" rules={[{ required: true, message: 'Plant name is required' }]}>
            <Input placeholder="e.g. Main Plant" />
          </Form.Item>

          <Form.Item name="code" label="Plant Code" rules={[{ required: true, message: 'Plant code is required' }]}>
            <Input placeholder="e.g. P01" />
          </Form.Item>

          <Form.Item name="address" label="Address / Location">
            <Input.TextArea placeholder="Plant physical address..." rows={2} />
          </Form.Item>

          <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Status is required' }]}>
            <Select>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default PlantsPage;
