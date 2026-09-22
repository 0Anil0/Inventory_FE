import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  DatePicker,
  Badge,
  message,
} from 'antd';

const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  DatabaseOutlined,
  SearchOutlined,
  EditOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  AlertOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  DownloadOutlined,
  HistoryOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, ItemType } from '../../types/inventory';
import { projectApi, inventoryApi, itemTypeApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { filterSelectOption } from '../../utils/select.utils';
import { QuantityModal } from '../../components/inventory/QuantityModal';
import { AddItemModal } from '../../components/inventory/AddItemModal';
import { StockLedgerDrawer } from '../../components/inventory/StockLedgerDrawer';
import { TransferStockModal } from '../../components/inventory/TransferStockModal';

export const InventoryTrackerPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number>(-1);
  const [inventoryList, setInventoryList] = useState<ProjectInventory[]>([]);
  const [catalogItemTypes, setCatalogItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalStockUnits, setTotalStockUnits] = useState<number>(0);
  const [outOfStockCount, setOutOfStockCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Modals & Drawer states
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState<boolean>(false);
  const [selectedItemForQty, setSelectedItemForQty] = useState<ProjectInventory | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);

  // Fetch all projects and item types on mount
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [projRes, itemRes] = await Promise.all([
          projectApi.getAll(),
          itemTypeApi.getAll(),
        ]);

        if (projRes.success && projRes.projects) {
          setProjects(projRes.projects);
        }

        if (itemRes.success && itemRes.items) {
          setCatalogItemTypes(itemRes.items);
        }
      } catch (err: any) {
        message.error(err.message || 'Failed to load inventory projects');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Server-side fetch project inventory with search, filterMode, dateRange, and pagination
  const fetchProjectInventory = async (
    projectId: number = selectedProjectId,
    page: number = currentPage,
    size: number = pageSize,
    q: string = searchQuery,
    mode: 'ALL' | 'LOW_STOCK' = filterMode,
    dates: [string, string] | null = dateRange
  ) => {
    setLoading(true);
    try {
      const res = await inventoryApi.getByProject(projectId, {
        search: q,
        filterMode: mode,
        startDate: dates ? dates[0] : undefined,
        endDate: dates ? dates[1] : undefined,
        page,
        limit: size,
      });
      if (res.success && res.inventory) {
        setInventoryList(res.inventory);
        if (res.total !== undefined) setTotalRecords(res.total);
        if (res.totalStockUnits !== undefined) setTotalStockUnits(res.totalStockUnits);
        if (res.outOfStockCount !== undefined) setOutOfStockCount(res.outOfStockCount);
        if (res.lowStockCount !== undefined) setLowStockCount(res.lowStockCount);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch project stock quantity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectInventory(selectedProjectId, 1, pageSize, searchQuery, filterMode, dateRange);
    setCurrentPage(1);
  }, [selectedProjectId, searchQuery, filterMode, dateRange]);

  const handleOpenQuantityModal = (item: ProjectInventory) => {
    setSelectedItemForQty(item);
    setIsQuantityModalOpen(true);
  };

  const handleQuantitySubmit = async (data: {
    project_id: number;
    item_type_id: number;
    quantity: number;
    min_quantity?: number;
    notes?: string;
  }) => {
    const res = await inventoryApi.adjustQuantity({
      project_id: data.project_id,
      item_type_id: data.item_type_id,
      adjustment_type: 'SET',
      amount: data.quantity,
      min_quantity: data.min_quantity,
      notes: data.notes,
    });
    if (res.success && res.inventoryItem) {
      fetchProjectInventory();
    } else {
      throw new Error('Failed to update stock quantity');
    }
  };

  const handleBatchAddItemsSubmit = async (data: {
    items: Array<{
      item_type_id: number;
      initial_quantity: number;
      unit_price?: number;
      lot_number?: string;
      min_quantity?: number;
    }>;
  }) => {
    if (selectedProjectId === undefined || selectedProjectId === null) throw new Error('No active project selected');

    const res = await inventoryApi.batchAdjustQuantity({
      project_id: selectedProjectId,
      items: data.items.map((i) => ({
        item_type_id: i.item_type_id,
        quantity: i.initial_quantity,
        unit_price: i.unit_price,
        lot_number: i.lot_number,
        min_quantity: i.min_quantity,
      })),
      notes: 'Added to project stock catalog & opening lot register',
    });

    if (res.success && res.inventoryItems) {
      fetchProjectInventory(selectedProjectId);
    } else {
      throw new Error('Failed to add items to project');
    }
  };

  const exportCSV = () => {
    if (!inventoryList.length) {
      message.warning('No inventory data to export');
      return;
    }
    const headers = ['Item Code', 'Item Name', 'Current Quantity', 'Unit', 'Min Threshold', 'Status'];
    const rows = inventoryList.map((i) => [
      `"${i.item_type?.code || ''}"`,
      `"${i.item_type?.name || ''}"`,
      i.quantity,
      `"${i.item_type?.unit || ''}"`,
      i.min_quantity || 0,
      i.quantity === 0
        ? 'OUT OF STOCK'
        : i.quantity <= (i.min_quantity || 10)
        ? 'LOW STOCK'
        : 'IN STOCK',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const projName = selectedProjectId === -1 ? 'All_Locations' : selectedProjectId === 0 ? 'General_Stock' : projects.find((p) => p.id === selectedProjectId)?.name || 'Project';
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${projName}_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Stock report CSV downloaded!');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Available catalog item types from catalog master
  const availableItemTypes = catalogItemTypes;

  const getStockStatusTag = (qty: number, minQty: number = 10) => {
    if (qty === 0) {
      return (
        <Tag icon={<CloseCircleFilled />} color="error" className="font-bold border-none py-0.5 px-2.5">
          OUT OF STOCK
        </Tag>
      );
    }
    if (qty <= minQty) {
      return (
        <Tag icon={<AlertOutlined />} color="warning" className="font-bold border-none py-0.5 px-2.5">
          LOW STOCK
        </Tag>
      );
    }
    return (
      <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none py-0.5 px-2.5">
        IN STOCK
      </Tag>
    );
  };

  const columns: ColumnsType<ProjectInventory> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 90,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Item Code',
      key: 'code',
      width: 130,
      fixed: 'left',
      render: (_, record) => (
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
          {record.item_type?.code || 'N/A'}
        </span>
      ),
    },
    {
      title: 'CAT NO.',
      key: 'cat_no',
      width: 140,
      render: (_, record) => (
        <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
          {record.item_type?.cat_no || '-'}
        </span>
      ),
    },
    {
      title: 'Item Name',
      key: 'name',
      render: (_, record) => {
        const item = record.item_type;
        const subtext = item?.full_description || item?.description || item?.rating;
        return (
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {item?.name || 'Unnamed Item'}
            </div>
            {subtext && (
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{subtext}</div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Current Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record) => (
        <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-100">
          {qty.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            {record.item_type?.unit || 'pcs'}
          </span>
        </span>
      ),
    },
    {
      title: 'Min Reorder Threshold',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      render: (min: number, record) => (
        <span className="text-xs font-mono text-slate-400">
          {min || 10} {record.item_type?.unit || 'pcs'}
        </span>
      ),
    },
    {
      title: 'Storage Location',
      key: 'location',
      render: (_, record) => (
        <div>
          {record.shelf ? (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {record.shelf.name} <span className="font-mono text-xs text-slate-500">({record.shelf.code})</span>
              {record.rack && (
                <span className="block text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                  → {record.rack.name} ({record.rack.rack_code})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 italic text-xs">Unassigned</span>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => getStockStatusTag(record.quantity, record.min_quantity || 10),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleOpenQuantityModal(record)}
        >
          Update Stock
        </Button>
      ),
    },
  ];

  return (
    <AppLayout>

      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        {/* Top Header & Stock Location Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <DatabaseOutlined className="text-2xl text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Inventory Stock Items & Tracker
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Central stock database, item locations, movement audit logs, and project transfers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Location:
              </span>
              <Select
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                className="w-72"
                size="middle"
                variant="borderless"
                loading={loading}
                showSearch
                filterOption={filterSelectOption}
              >
                <Select.Option key={-1} value={-1}>
                  <span className="font-semibold text-emerald-600">🌐 All Locations (Total Stock)</span>
                </Select.Option>
                <Select.Option key={0} value={0}>
                  <span className="font-semibold text-indigo-600">📦 General Stock / Main Store</span>
                </Select.Option>
                {projects.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">🏗️ {p.name}</span>{' '}
                    <span className="text-xs text-slate-400">({p.code})</span>
                  </Select.Option>
                ))}
              </Select>
            </div>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchProjectInventory(selectedProjectId)}
              loading={loading}
              title="Refresh stock list"
            />

            <Button
              icon={<SwapOutlined />}
              onClick={() => setIsTransferModalOpen(true)}
              type="primary"
              className="bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-md border-none"
            >
              Transfer Stock
            </Button>

            <Button
              icon={<HistoryOutlined />}
              onClick={() => setIsLedgerOpen(true)}
              className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-medium"
            >
              Stock Ledger
            </Button>
          </div>
        </div>

        {/* Summary Statistics Grid */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-slate-400 uppercase font-semibold">Total Stock Units</span>}
                value={totalStockUnits}
                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                prefix={<AppstoreOutlined className="mr-2 text-indigo-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-indigo-400/80 uppercase font-semibold">Item Categories</span>}
                value={inventoryList.length}
                valueStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                prefix={<CodeSandboxOutlined className="mr-2 text-sky-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-amber-400 uppercase font-semibold">Low Stock Items</span>}
                value={lowStockCount}
                valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }}
                prefix={<AlertOutlined className="mr-2 text-amber-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-rose-400/80 uppercase font-semibold">Out of Stock Items</span>}
                value={outOfStockCount}
                valueStyle={{ color: '#f43f5e', fontWeight: 'bold' }}
                prefix={<CloseCircleFilled className="mr-2 text-rose-400" />}
              />
            </Card>
          </Col>
        </Row>

        {/* Inventory Items Table Card */}
        <Card className="shadow-2xl">
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={totalRecords} overflowCount={9999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {totalRecords} Items
                </Tag>
              </Badge>
            </div>

            <Space className="justify-between sm:justify-end flex-wrap">
              <Button
                icon={<SwapOutlined />}
                onClick={() => setIsTransferModalOpen(true)}
                className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-semibold"
              >
                Transfer Stock
              </Button>

              <Button icon={<DownloadOutlined />} onClick={exportCSV}>
                Export CSV Report
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddItemModalOpen(true)}
                disabled={selectedProjectId === undefined || selectedProjectId === null}
                className="shadow-lg shadow-indigo-500/30"
              >
                {selectedProjectId === 0 ? 'Add Stock Items' : 'Add Items to Project'}
              </Button>
            </Space>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range + Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search by code, CAT NO, name, location, rating..."
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
              type={filterMode === 'LOW_STOCK' ? 'primary' : 'default'}
              danger={filterMode === 'LOW_STOCK'}
              icon={<AlertOutlined />}
              onClick={() => setFilterMode(filterMode === 'ALL' ? 'LOW_STOCK' : 'ALL')}
              className="w-full"
            >
              {filterMode === 'LOW_STOCK' ? 'Showing Low Stock' : 'Filter Low Stock Only'}
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchQuery('');
                setDateRange(null);
                setFilterMode('ALL');
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={inventoryList}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalRecords,
              showSizeChanger: true,
              onChange: (page, size) => {
                setCurrentPage(page);
                setPageSize(size);
                fetchProjectInventory(selectedProjectId, page, size, searchQuery, filterMode, dateRange);
              },
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} stock items`,
            }}
          />
        </Card>
      </main>

      <QuantityModal
        isOpen={isQuantityModalOpen}
        onClose={() => setIsQuantityModalOpen(false)}
        onSubmit={handleQuantitySubmit}
        inventoryItem={selectedItemForQty}
        projectId={selectedProjectId}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSubmitBatch={handleBatchAddItemsSubmit}
        availableItemTypes={availableItemTypes}
        projectName={selectedProject?.name || 'General Stock / Main Store'}
        projectId={selectedProjectId}
      />

      <StockLedgerDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        projectId={selectedProjectId}
        projectName={selectedProject?.name || 'General Stock / Main Store'}
      />

      <TransferStockModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => fetchProjectInventory(selectedProjectId)}
        projects={projects}
        currentProjectId={selectedProjectId}
        currentInventory={inventoryList}
      />
    </AppLayout>
  );
};
export default InventoryTrackerPage;
