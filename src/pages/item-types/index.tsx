import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, InputNumber, Modal, Form, Select, Popconfirm, Space, Tag, Badge, Upload, message, Typography } from 'antd';
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
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { ItemType, Make, ItemDescription, Unit } from '../../types/inventory';
import { itemTypeApi, makeApi, itemDescriptionApi, unitApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

const { Text } = Typography;

export const ItemTypesPage: React.FC = () => {
  const [items, setItems] = useState<ItemType[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [itemDescriptions, setItemDescriptions] = useState<ItemDescription[]>([]);
  const [unitsList, setUnitsList] = useState<Unit[]>([]);
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
  const [totalItems, setTotalItems] = useState<number>(0);
  const [appliedFilters, setAppliedFilters] = useState<any>({});

  // Filter Modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filterForm] = Form.useForm();

  // Inline creation states for dropdown search
  const [searchMakeText, setSearchMakeText] = useState<string>('');
  const [searchDescText, setSearchDescText] = useState<string>('');
  const [searchUnitText, setSearchUnitText] = useState<string>('');
  const [creatingMake, setCreatingMake] = useState<boolean>(false);
  const [creatingDesc, setCreatingDesc] = useState<boolean>(false);
  const [creatingUnit, setCreatingUnit] = useState<boolean>(false);

  // Add/Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [itemToEdit, setItemToEdit] = useState<ItemType | null>(null);
  const [form] = Form.useForm();

  // Excel Bulk Import Modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [parsedImportData, setParsedImportData] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);

  const fetchItems = async (page = currentPage, limit = pageSize, filters = appliedFilters, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await itemTypeApi.getAll({
        page,
        limit,
        search: search || undefined,
        make: filters.make && filters.make !== 'ALL' ? filters.make : undefined,
        unit: filters.unit && filters.unit !== 'ALL' ? filters.unit : undefined,
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
      const [makeRes, descRes, unitRes] = await Promise.all([
        makeApi.getAll().catch(() => ({ success: false, makes: [] })),
        itemDescriptionApi.getAll().catch(() => ({ success: false, itemDescriptions: [] })),
        unitApi.getAll().catch(() => ({ success: false, units: [] })),
      ]);
      if (makeRes.success && makeRes.makes) setMakes(makeRes.makes);
      if (descRes.success && descRes.itemDescriptions) setItemDescriptions(descRes.itemDescriptions);
      if (unitRes.success && unitRes.units) setUnitsList(unitRes.units);
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
    setSearchUnitText('');
    if (makes.length > 0) {
      form.setFieldValue('make', makes[0].name);
    }
    if (unitsList.length > 0) {
      form.setFieldValue('unit', unitsList[0].code);
    } else {
      form.setFieldValue('unit', 'PCS');
    }
    form.setFieldValue('base_price', 0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ItemType) => {
    setItemToEdit(item);
    setSearchMakeText('');
    setSearchDescText('');
    setSearchUnitText('');
    form.setFieldsValue({
      code: item.code,
      name: item.name,
      rating: item.rating || '',
      full_description: item.full_description || '',
      cat_no: item.cat_no || '',
      hsn_code: item.hsn_code || '',
      make: item.make || '',
      unit: item.unit || 'PCS',
      base_price: item.base_price ?? item.unit_rate ?? 0,
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

  const handleCreateUnitInline = async (codeToCreate: string) => {
    const trimmed = codeToCreate.trim().toUpperCase();
    if (!trimmed) return;
    setCreatingUnit(true);
    try {
      const res = await unitApi.create({ code: trimmed, name: trimmed });
      if (res.success && res.unit) {
        if (!unitsList.some((u) => u.code.toUpperCase() === res.unit.code.toUpperCase())) {
          setUnitsList((prev) => [...prev, res.unit]);
        }
        form.setFieldValue('unit', res.unit.code);
        setSearchUnitText('');
        message.success(`Unit "${res.unit.code}" created and selected!`);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create Unit master');
    } finally {
      setCreatingUnit(false);
    }
  };

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
      const payload = {
        ...values,
        unit_rate: values.base_price ?? 0,
      };

      if (itemToEdit) {
        const res = await itemTypeApi.update(itemToEdit.id, payload);
        if (res.success) {
          message.success('Item master updated successfully');
        }
      } else {
        const res = await itemTypeApi.create(payload);
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

  // Excel Download Template Handler
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Item Code': '1001',
        'Item Name': 'MCB 1P',
        'Category': '6A C-Curve',
        'Cat No': 'DS1A7A1',
        'HSN Code': '8536',
        'Make': 'L&T',
        'Unit': 'PCS',
        'Base Price (INR)': 185.50,
        'Description': 'MCB 1P 6A C-Curve L&T',
      },
      {
        'Item Code': '1002',
        'Item Name': 'MCCB 3P',
        'Category': '100A 25kA',
        'Cat No': 'DS2B8B2',
        'HSN Code': '8537',
        'Make': 'Schneider',
        'Unit': 'NOS',
        'Base Price (INR)': 4250.00,
        'Description': 'MCCB 3P 100A 25kA Schneider',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Item Code
      { wch: 20 }, // Item Name
      { wch: 20 }, // Category
      { wch: 18 }, // Cat No
      { wch: 14 }, // HSN Code
      { wch: 15 }, // Make
      { wch: 10 }, // Unit
      { wch: 18 }, // Base Price (INR)
      { wch: 30 }, // Description
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Item Master Template');
    XLSX.writeFile(workbook, 'Item_Master_Import_Template.xlsx');
    message.success('Excel import template downloaded successfully!');
  };

  // File Parse Handler for Upload
  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          message.error('Uploaded file contains no valid data rows!');
          return;
        }

        // Normalize keys and map fields flexibly
        const formattedItems = rawJson.map((row) => {
          const keys = Object.keys(row);
          const getVal = (...possibleHeaders: string[]) => {
            for (const header of possibleHeaders) {
              const matchedKey = keys.find(
                (k) => k.trim().toLowerCase() === header.trim().toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
                return row[matchedKey];
              }
            }
            return undefined;
          };

          const code = String(getVal('item code', 'code', 'item number', 'itemno', 'item_code') || '').trim();
          const name = String(getVal('item name', 'name', 'item', 'item_name') || '').trim();
          const rating = String(getVal('category', 'rating', 'item description', 'item_description') || '').trim();
          const cat_no = String(getVal('cat no', 'cat_no', 'catno', 'catalog no', 'catalog_no') || '').trim();
          const hsn_code = String(getVal('hsn code', 'hsn_code', 'hsn') || '').trim();
          const make = String(getVal('make', 'brand') || '').trim();
          const unit = String(getVal('unit', 'uom') || 'PCS').trim().toUpperCase();
          const rawPrice = getVal('base price (inr)', 'base price (₹)', 'base price', 'unit rate', 'price', 'rate', 'base_price', 'unit_rate');
          const base_price = rawPrice !== undefined && rawPrice !== '' ? Number(rawPrice) : 0;
          const description = String(getVal('description', 'full description', 'full_description') || '').trim();

          return {
            code,
            name,
            rating,
            cat_no,
            hsn_code,
            make,
            unit,
            base_price,
            description,
          };
        }).filter((item) => item.code && item.name); // Require code and name

        if (formattedItems.length === 0) {
          message.error('No valid rows with Item Code and Item Name found in file!');
          return;
        }

        setParsedImportData(formattedItems);
        message.success(`Successfully parsed ${formattedItems.length} items from file!`);
      } catch (err: any) {
        message.error(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExecuteBulkImport = async () => {
    if (parsedImportData.length === 0) {
      message.warning('No parsed data available to import!');
      return;
    }
    setUploading(true);
    try {
      const res = await itemTypeApi.bulkImport(parsedImportData);
      if (res.success) {
        message.success(res.message || `Imported ${(res.createdCount || 0) + (res.updatedCount || 0) || parsedImportData.length} items!`);
        setIsUploadModalOpen(false);
        setParsedImportData([]);
        setFileList([]);
        fetchItems(1, pageSize, appliedFilters, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Bulk import failed');
    } finally {
      setUploading(false);
    }
  };

  const columns: ColumnsType<ItemType> = [
    {
      title: 'Item Number (input)',
      dataIndex: 'code',
      key: 'code',
      width: 170,
      fixed: 'left',
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Item (input)',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      render: (name: string) => <span className="font-bold app-text-main">{name}</span>,
    },
    {
      title: 'Base Price (₹)',
      dataIndex: 'base_price',
      key: 'base_price',
      width: 140,
      align: 'right',
      render: (val: number | null, record) => {
        const price = val ?? record.unit_rate ?? 0;
        return (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      title: 'Item description (master)',
      dataIndex: 'rating',
      key: 'rating',
      width: 210,
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
      width: 220,
      render: (fullDesc: string | null, record) => (
        <span className="text-sm app-text-secondary">{fullDesc || `${record.name} ${record.rating || ''}`.trim()}</span>
      ),
    },
    {
      title: 'Cat No (input unique)',
      dataIndex: 'cat_no',
      key: 'cat_no',
      width: 180,
      render: (catNo: string | null) =>
        catNo ? (
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{catNo}</span>
        ) : (
          <span className="app-text-muted italic">N/A</span>
        ),
    },
    {
      title: 'HSN Code',
      dataIndex: 'hsn_code',
      key: 'hsn_code',
      width: 130,
      render: (hsn: string | null) =>
        hsn ? (
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{hsn}</span>
        ) : (
          <span className="app-text-muted italic">-</span>
        ),
    },
    {
      title: 'Unit (master)',
      dataIndex: 'unit',
      key: 'unit',
      width: 130,
      render: (unitStr: string | null) => (
        <Tag color="orange" className="font-mono font-bold text-xs py-0.5 px-2">
          {unitStr || 'PCS'}
        </Tag>
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
      fixed: 'right',
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
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <CodeSandboxOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Item Master
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage item numbers, base prices, brand makes & bulk Excel imports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAdd}
              className="bg-indigo-600 shadow-md shadow-indigo-500/20 font-semibold"
            >
              Add New Item
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => {
                setParsedImportData([]);
                setFileList([]);
                setIsUploadModalOpen(true);
              }}
              className="border-indigo-500 text-indigo-600 font-semibold"
            >
              Upload Excel Data
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              className="border-emerald-500 text-emerald-600 hover:text-emerald-500 font-semibold"
            >
              Download Template
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchItems(currentPage, pageSize, appliedFilters, searchQuery)}
              loading={loading}
            >
              Refresh
            </Button>
          </div>
        </div>

        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none flex items-center gap-1.5">
                <span>Total Items:</span>
                <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs font-mono">{totalItems} Records</span>
              </Tag>
            </div>
          </div>

          {/* Search Bar & Filter Modal Trigger */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-3 shrink-0">
            <Input
              placeholder="Search on Server by Cat No, Item Number, Item, Make, Unit..."
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

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
            <Table
              columns={columns}
              dataSource={items}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 1400,
                y: isDesktop ? 'calc(100vh - 495px)' : undefined,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalItems,
                showSizeChanger: true,
                pageSizeOptions: ['10', '15', '25', '50', '100'],
                onChange: handlePageChange,
                className: '!mb-1 !mt-2 px-2',
              }}
            />
          </div>
        </Card>
      </main>

      {/* Upload Excel Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100">
            <FileExcelOutlined className="text-emerald-500 text-xl" />
            <span className="font-bold text-lg font-['Outfit']">Upload & Import Item Master Data</span>
          </div>
        }
        open={isUploadModalOpen}
        onCancel={() => {
          if (!uploading) setIsUploadModalOpen(false);
        }}
        centered
        width={750}
        footer={[
          <Button key="cancel" onClick={() => setIsUploadModalOpen(false)} disabled={uploading}>
            Cancel
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            loading={uploading}
            disabled={parsedImportData.length === 0}
            onClick={handleExecuteBulkImport}
            className="bg-indigo-600"
          >
            Import {parsedImportData.length > 0 ? `${parsedImportData.length} Items` : ''}
          </Button>,
        ]}
      >
        <div className="py-3 flex flex-col gap-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-white/10">
            <div className="text-xs app-text-secondary">
              Need the standard structure? Download our pre-formatted template.
            </div>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              className="text-emerald-600 border-emerald-400 font-semibold"
            >
              Download Template
            </Button>
          </div>

          <Upload.Dragger
            accept=".xlsx, .xls, .csv"
            maxCount={1}
            beforeUpload={(file) => {
              setFileList([file]);
              handleFileRead(file);
              return false; // Prevent automatic HTTP upload
            }}
            onRemove={() => {
              setFileList([]);
              setParsedImportData([]);
            }}
            fileList={fileList}
          >
            <p className="ant-upload-drag-icon text-indigo-500 text-4xl mb-2">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text text-sm font-semibold">Click or drag Excel/CSV file to this area</p>
            <p className="ant-upload-hint text-xs app-text-muted">
              Supports .xlsx, .xls, and .csv files. Columns: Item Code, Item Name, Category, Cat No, Make, Unit, Base Price (INR), Description
            </p>
          </Upload.Dragger>

          {parsedImportData.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center justify-between">
                <Text className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  Preview ({parsedImportData.length} Items Parsed)
                </Text>
                <Tag color="blue">{parsedImportData.length} Records Ready</Tag>
              </div>

              <Table
                dataSource={parsedImportData}
                rowKey={(r, index) => r.code || index?.toString()}
                size="small"
                pagination={{ pageSize: 5 }}
                columns={[
                  { title: 'Code', dataIndex: 'code', key: 'code', render: (c) => <span className="font-mono font-bold text-indigo-600">{c}</span> },
                  { title: 'Name', dataIndex: 'name', key: 'name', render: (n) => <span className="font-bold">{n}</span> },
                  { title: 'Cat No', dataIndex: 'cat_no', key: 'cat_no' },
                  { title: 'Make', dataIndex: 'make', key: 'make' },
                  { title: 'Unit', dataIndex: 'unit', key: 'unit' },
                  {
                    title: 'Base Price (₹)',
                    dataIndex: 'base_price',
                    key: 'base_price',
                    align: 'right',
                    render: (p: number) => <span className="font-mono text-emerald-600">₹{(p || 0).toFixed(2)}</span>,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Modal>

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

          <Form.Item name="unit" label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Filter by Unit</span>}>
            <Select
              placeholder="All Units"
              allowClear
              options={[
                { value: 'ALL', label: 'All Units' },
                ...unitsList.map((u) => ({ value: u.code, label: `${u.name} (${u.code})` })),
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
        width={750}
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

          {/* Row 3: Unit (master), Base Price (₹) & Cat No (input unique) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
            <Form.Item
              name="unit"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Unit (master)</span>}
              rules={[{ required: true, message: 'Unit is required' }]}
            >
              <Select
                placeholder="Select or Search Unit..."
                showSearch
                size="large"
                onSearch={(val) => setSearchUnitText(val)}
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={unitsList.map((u) => ({ value: u.code, label: `${u.name} (${u.code})` }))}
                dropdownRender={(menu) => {
                  const trimmed = searchUnitText.trim().toUpperCase();
                  const exists = unitsList.some((u) => u.code.toUpperCase() === trimmed);
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
                            loading={creatingUnit}
                            onClick={() => handleCreateUnitInline(searchUnitText)}
                            className="text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700 font-semibold"
                          >
                            + Create "{trimmed}" in Unit Master
                          </Button>
                        </div>
                      )}
                    </>
                  );
                }}
                notFoundContent={
                  searchUnitText.trim().length > 0 ? (
                    <div className="p-3 text-center">
                      <p className="text-slate-400 text-xs mb-2">No matching unit found</p>
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        loading={creatingUnit}
                        onClick={() => handleCreateUnitInline(searchUnitText)}
                        className="bg-orange-600"
                      >
                        Create "{searchUnitText.trim().toUpperCase()}" Unit Master
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </Form.Item>

            <Form.Item
              name="base_price"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Base Price (₹)</span>}
            >
              <InputNumber
                className="w-full"
                size="large"
                prefix="₹"
                min={0}
                step={0.01}
                placeholder="e.g. 150.00"
              />
            </Form.Item>

            <Form.Item
              name="cat_no"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Cat No (input unique)</span>}
            >
              <Input prefix={<SafetyOutlined className="text-emerald-500" />} placeholder="e.g. DS1A7A1" size="large" />
            </Form.Item>
          </div>

          {/* Row 4: HSN Code & Full Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
            <Form.Item
              name="hsn_code"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">HSN Code</span>}
            >
              <Input placeholder="e.g. 8536" size="large" className="font-mono" />
            </Form.Item>

            <Form.Item
              name="full_description"
              className="sm:col-span-2"
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
