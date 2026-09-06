import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, Popconfirm, Space, Tag, Badge, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeSandboxOutlined,
  ReloadOutlined,
  TagOutlined,
  ShopOutlined,
  SafetyOutlined,
  SaveOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import type { ItemType, Make, ItemDescription } from '../../types/inventory';
import { itemTypeApi, makeApi, itemDescriptionApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [itemDescriptions, setItemDescriptions] = useState<ItemDescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination & Server Filtering state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  // Inline creation states for dropdown search
  const [searchMakeText, setSearchMakeText] = useState<string>('');
  const [searchDescText, setSearchDescText] = useState<string>('');
  const [creatingMake, setCreatingMake] = useState<boolean>(false);
  const [creatingDesc, setCreatingDesc] = useState<boolean>(false);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ItemType | null>(null);
  const [form] = Form.useForm();

  const fetchItems = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await itemTypeApi.getAll({
        page,
        limit,
        search: search || undefined,
        make: filters.make && filters.make !== 'ALL' ? filters.make : undefined,
        rating: filters.rating || undefined,
        code: filters.code || undefined,
        cat_no: filters.cat_no || undefined,
        name: filters.name || undefined,
      });

      if (res.success && res.items) {
        setItems(res.items);
        setTotalItems(res.total ?? res.items.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load item master catalog');
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialMasterData = async () => {
    try {
      const [makeRes, descRes] = await Promise.all([
        makeApi.getAll().catch(() => ({ success: false, makes: [] })),
        itemDescriptionApi.getAll().catch(() => ({ success: false, itemDescriptions: [] })),
      ]);
      if (makeRes.success && makeRes.makes) setMakes(makeRes.makes);
      if (descRes.success && descRes.itemDescriptions) setItemDescriptions(descRes.itemDescriptions);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInitialMasterData();
    fetchItems(1, pageSize, appliedFilters, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchItems(page, newPageSize, appliedFilters, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchItems(1, pageSize, appliedFilters, val);
  };

  const handleApplyFilters = (values: any) => {
    setAppliedFilters(values);
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchItems(1, pageSize, values, searchQuery);
  };

  const handleResetFilters = () => {
    filterForm.resetFields();
    setAppliedFilters({});
    setSearchQuery('');
    setCurrentPage(1);
    setIsFilterModalOpen(false);
    fetchItems(1, pageSize, {}, '');
  };

  const activeFilterCount = Object.values(appliedFilters).filter((v) => v && v !== 'ALL').length;

  const handleOpenAdd = () => {
    setItemToEdit(null);
    form.resetFields();
    setSearchMakeText('');
    setSearchDescText('');
    if (makes.length > 0) {
      form.setFieldValue('make', makes[0].name);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemType) => {
    setItemToEdit(item);
    setSearchMakeText('');
    setSearchDescText('');
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      rating: item.rating || '',
      full_description: item.full_description || '',
      cat_no: item.cat_no || '',
      make: item.make || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await itemTypeApi.delete(id);
      if (res.success) {
        message.success('Item master deleted successfully');
        fetchItems(currentPage, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete item master');
    }
  };

  // On-the-fly Master creation handler for Make
  const handleCreateMakeInline = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;
    setCreatingMake(true);
    try {
      const res = await makeApi.create({ name: trimmed });
      if (res.success && res.make) {
        if (!makes.some((m) => m.name.toLowerCase() === res.make.name.toLowerCase())) {
          setMakes((prev) => [...prev, res.make]);
        }
        form.setFieldValue('make', res.make.name);
        setSearchMakeText('');
        message.success(`Make "${res.make.name}" created and selected!`);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create Make master');
    } finally {
      setCreatingMake(false);
    }
  };

  // On-the-fly Master creation handler for Item Description
  const handleCreateDescInline = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;
    setCreatingDesc(true);
    try {
      const res = await itemDescriptionApi.create({ name: trimmed });
      if (res.success && res.itemDescription) {
        if (!itemDescriptions.some((d) => d.name.toLowerCase() === res.itemDescription.name.toLowerCase())) {
          setItemDescriptions((prev) => [...prev, res.itemDescription]);
        }
        form.setFieldValue('rating', res.itemDescription.name);

        const nameVal = form.getFieldValue('name');
        if (nameVal && !form.isFieldTouched('full_description')) {
          form.setFieldValue('full_description', `${nameVal} ${res.itemDescription.name}`);
        }
        setSearchDescText('');
        message.success(`Item description "${res.itemDescription.name}" created and selected!`);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create Item Description master');
    } finally {
      setCreatingDesc(false);
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (itemToEdit) {
        const res = await itemTypeApi.update(itemToEdit.id, values);
        if (res.success) {
          message.success('Item master updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(values);
        if (res.success) {
          message.success('Item master created successfully');
        }
      }
      setIsModalOpen(false);
      fetchItems(currentPage, pageSize, appliedFilters, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save item master');
    }
  };

  const handleValuesChange = (changedValues: any, allValues: any) => {
    if (changedValues.name || changedValues.rating) {
      const parts = [allValues.name, allValues.rating].filter(Boolean);
      if (parts.length > 0 && !form.isFieldTouched('full_description')) {
        form.setFieldValue('full_description', parts.join(' '));
      }
    }
  };

  const columns: ColumnsType<ItemType> = [
    {
      title: 'Item Number (input)',
      dataIndex: 'code',
      key: 'code',
      width: 170,
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Item (input)',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => <span className="font-bold app-text-main">{name}</span>,
    },
    {
      title: 'Item description (master)',
      dataIndex: 'rating',
      key: 'rating',
      width: 170,
      render: (rating: string | null) =>
        rating ? (
          <Tag color="purple" icon={<ThunderboltOutlined />} className="font-semibold text-sm py-0.5 px-2">
            {rating}
          </Tag>
        ) : (
          <span className="app-text-muted italic">-</span>
        ),
    },
    {
      title: 'Full description (input)',
      dataIndex: 'full_description',
      key: 'full_description',
      render: (fullDesc: string | null, record) => (
        <span className="text-sm app-text-secondary">{fullDesc || `${record.name} ${record.rating || ''}`.trim()}</span>
      ),
    },
    {
      title: 'Cat No (input unique)',
      dataIndex: 'cat_no',
      key: 'cat_no',
      width: 170,
      render: (catNo: string | null) =>
        catNo ? (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{catNo}</span>
        ) : (
          <span className="app-text-muted italic">N/A</span>
        ),
    },
    {
      title: 'Make (master)',
      dataIndex: 'make',
      key: 'make',
      width: 150,
      render: (makeStr: string | null) =>
        makeStr ? (
          <Tag color="blue" icon={<ShopOutlined />} className="font-bold text-sm py-0.5 px-2.5">
            {makeStr}
          </Tag>
        ) : (
          <span className="app-text-muted italic">-</span>
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
            title="Delete Item"
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
                Item Master
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Item Number, Item, Item Description (Master), Full Description, Cat No & Make (Master) with Server Search, Pagination & Filter Modal
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchItems(currentPage, pageSize, appliedFilters, searchQuery)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Add New Item Master
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={totalItems} overflowCount={9999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Items: {totalItems} Records
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Search Bar & Filter Modal Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
            <Input
              placeholder="Search on Server by Cat No, Item Number, Item, Make..."
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
            dataSource={items}
            rowKey="id"
            loading={loading}
            scroll={{ x: 950, y: 400 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalItems,
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50', '100'],
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
            <span className="font-bold text-lg font-['Outfit']">Filter Item Master</span>
          </div>
        }
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        centered
        width={500}
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
          <Form.Item name="make" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Make</span>}>
            <Select
              placeholder="All Makes"
              allowClear
              options={[
                { value: 'ALL', label: 'All Makes' },
                ...makes.map((m) => ({ value: m.name, label: m.name })),
              ]}
            />
          </Form.Item>

          <Form.Item name="rating" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Item Description (Rating)</span>}>
            <Select
              placeholder="All Item Descriptions"
              allowClear
              showSearch
              options={itemDescriptions.map((d) => ({ value: d.name, label: d.name }))}
            />
          </Form.Item>

          <Form.Item name="code" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Item Number</span>}>
            <Input placeholder="e.g. 1001" allowClear />
          </Form.Item>

          <Form.Item name="cat_no" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Cat No</span>}>
            <Input placeholder="e.g. DS1A7A1" allowClear />
          </Form.Item>

          <Form.Item name="name" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Item Name</span>}>
            <Input placeholder="e.g. MCB" allowClear />
          </Form.Item>
        </Form>
      </Modal>

      {/* Styled Premium Modal Form for Item Master Add/Edit */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 py-1 text-slate-800 dark:text-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <CodeSandboxOutlined className="text-lg" />
            </div>
            <span className="font-bold text-lg font-['Outfit']">
              {itemToEdit ? 'Edit Item Master' : 'Add Item Master'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
        centered
        width={720}
        footer={[
          <Button key="cancel" size="large" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            icon={itemToEdit ? <CheckOutlined /> : <SaveOutlined />}
            onClick={() => form.submit()}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            {itemToEdit ? 'Update Item Master' : 'Save Item Master'}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onValuesChange={handleValuesChange}
          className="mt-4 pt-2 border-t border-slate-100 dark:border-white/10"
        >
          {/* Row 1: Item Number & Make */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="code"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item Number (input)</span>}
              rules={[{ required: true, message: 'Item Number is required' }]}
            >
              <Input prefix={<TagOutlined className="text-slate-400" />} placeholder="e.g. 1001" size="large" />
            </Form.Item>

            <Form.Item
              name="make"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Make (master)</span>}
              rules={[{ required: true, message: 'Make is required' }]}
            >
              <Select
                placeholder="Select or Search Make..."
                showSearch
                size="large"
                onSearch={(val) => setSearchMakeText(val)}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={makes.map((m) => ({ value: m.name, label: m.name }))}
                dropdownRender={(menu) => {
                  const trimmed = searchMakeText.trim();
                  const exists = makes.some((m) => m.name.toLowerCase() === trimmed.toLowerCase());
                  const showAddBtn = trimmed.length > 0 && !exists;

                  return (
                    <>
                      {menu}
                      {showAddBtn && (
                        <div className="p-2 border-t border-slate-100 dark:border-white/10">
                          <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            loading={creatingMake}
                            onClick={() => handleCreateMakeInline(searchMakeText)}
                            className="text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 font-semibold"
                          >
                            + Create "{trimmed}" in Make Master
                          </Button>
                        </div>
                      )}
                    </>
                  );
                }}
                notFoundContent={
                  searchMakeText.trim().length > 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-slate-400 text-xs mb-2">No matching make found</p>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        loading={creatingMake}
                        onClick={() => handleCreateMakeInline(searchMakeText)}
                        className="bg-indigo-600"
                      >
                        Create "{searchMakeText.trim()}" Master
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </Form.Item>
          </div>

          {/* Row 2: Item Name & Item Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="name"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item (input)</span>}
              rules={[{ required: true, message: 'Item name is required' }]}
            >
              <Input placeholder="e.g. MCB" size="large" />
            </Form.Item>

            <Form.Item
              name="rating"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Item description (master)</span>}
            >
              <Select
                placeholder="Select or Search Item Description..."
                showSearch
                allowClear
                size="large"
                onSearch={(val) => setSearchDescText(val)}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={itemDescriptions.map((d) => ({ value: d.name, label: d.name }))}
                dropdownRender={(menu) => {
                  const trimmed = searchDescText.trim();
                  const exists = itemDescriptions.some((d) => d.name.toLowerCase() === trimmed.toLowerCase());
                  const showAddBtn = trimmed.length > 0 && !exists;

                  return (
                    <>
                      {menu}
                      {showAddBtn && (
                        <div className="p-2 border-t border-slate-100 dark:border-white/10">
                          <Button
                            type="dashed"
                            block
                            icon={<PlusOutlined />}
                            loading={creatingDesc}
                            onClick={() => handleCreateDescInline(searchDescText)}
                            className="text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-700 font-semibold"
                          >
                            + Create "{trimmed}" in Description Master
                          </Button>
                        </div>
                      )}
                    </>
                  );
                }}
                notFoundContent={
                  searchDescText.trim().length > 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-slate-400 text-xs mb-2">No matching item description found</p>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        loading={creatingDesc}
                        onClick={() => handleCreateDescInline(searchDescText)}
                        className="bg-purple-600"
                      >
                        Create "{searchDescText.trim()}" Master
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </Form.Item>
          </div>

          {/* Row 3: Cat No & Full Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="cat_no"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Cat No (input unique)</span>}
            >
              <Input prefix={<SafetyOutlined className="text-emerald-500" />} placeholder="e.g. DS1A7A1, A9N1P02CGN" size="large" />
            </Form.Item>

            <Form.Item
              name="full_description"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Full description (input)</span>}
            >
              <Input placeholder="e.g. MCB 2A 4P" size="large" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ItemTypesPage;
