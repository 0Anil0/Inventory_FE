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
import { QuantityModal } from '../../components/inventory/QuantityModal';
import { AddItemModal } from '../../components/inventory/AddItemModal';
import { StockLedgerDrawer } from '../../components/inventory/StockLedgerDrawer';
import { TransferStockModal } from '../../components/inventory/TransferStockModal';

export const InventoryTrackerPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [inventoryList, setInventoryList] = useState<ProjectInventory[]>([]);
  const [catalogItemTypes, setCatalogItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW_STOCK'>('ALL');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

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
          if (projRes.projects.length > 0) {
            setSelectedProjectId(projRes.projects[0].id);
          }
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

  // Fetch project inventory whenever selectedProjectId changes
  const fetchProjectInventory = async (projectId: number) => {
    setLoading(true);
    try {
      const res = await inventoryApi.getByProject(projectId);
      if (res.success && res.inventory) {
        setInventoryList(res.inventory);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch project stock quantity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectInventory(selectedProjectId);
    }
  }, [selectedProjectId]);

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
      setInventoryList((prev) => {
        const index = prev.findIndex((i) => i.item_type_id === data.item_type_id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = res.inventoryItem;
          return updated;
        }
        return [...prev, res.inventoryItem];
      });
    } else {
      throw new Error('Failed to update stock quantity');
    }
  };

  const handleBatchAddItemsSubmit = async (data: {
    items: Array<{
      item_type_id: number;
      initial_quantity: number;
    }>;
  }) => {
    if (!selectedProjectId) throw new Error('No active project selected');

    const res = await inventoryApi.batchAdjustQuantity({
      project_id: selectedProjectId,
      items: data.items.map((i) => ({
        item_type_id: i.item_type_id,
        quantity: i.initial_quantity,
      })),
      notes: 'Added to project stock catalog',
    });

    if (res.success && res.inventoryItems) {
      setInventoryList((prev) => {
        const existingMap = new Map(prev.map((item) => [item.item_type_id, item]));
        res.inventoryItems.forEach((newRecord) => {
          existingMap.set(newRecord.item_type_id, newRecord);
        });
        return Array.from(existingMap.values());
      });
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
    const rows = filteredInventory.map((i) => [
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
    const projName = projects.find((p) => p.id === selectedProjectId)?.name || 'Project';
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${projName}_Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Stock report CSV downloaded!');
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Available catalog item types (filters items already present in current project)
  const existingItemTypeIds = new Set(inventoryList.map((i) => i.item_type_id));
  const availableItemTypes = catalogItemTypes.filter((t) => !existingItemTypeIds.has(t.id));

  const filteredInventory = inventoryList.filter((inv) => {
    const item = inv.item_type;
    if (!item) return false;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterMode === 'LOW_STOCK') {
      const isLow = inv.quantity <= (inv.min_quantity || 10);
      if (!isLow) return false;
    }

    if (dateRange && (inv as any).updatedAt) {
      const itemDate = new Date((inv as any).updatedAt).toISOString().slice(0, 10);
      if (itemDate < dateRange[0] || itemDate > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics
  const totalStockUnits = inventoryList.reduce((sum, item) => sum + item.quantity, 0);
  const outOfStockCount = inventoryList.filter((item) => item.quantity === 0).length;
  const lowStockCount = inventoryList.filter(
    (item) => item.quantity > 0 && item.quantity <= (item.min_quantity || 10)
  ).length;

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
      width: 70,
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
      width: 140,
      render: (_, record) => (
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
          {record.item_type?.code || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Item Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            {record.item_type?.name || 'Unnamed Item'}
          </div>
          {record.item_type?.description && (
            <div className="text-xs text-slate-500 dark:text-slate-400">{record.item_type.description}</div>
          )}
        </div>
      ),
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
      title: 'Status',
      key: 'status',
      render: (_, record) => getStockStatusTag(record.quantity, record.min_quantity || 10),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
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

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Top Header & Project Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3">
            <DatabaseOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Project Stock Quantity Tracker
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Manage stock allocations, threshold alerts, transfers, and movement history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider">
              Selected Project:
            </span>
            <Select
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              className="w-64"
              size="large"
              loading={loading}
            >
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  <span className="font-semibold">{p.name}</span>{' '}
                  <span className="text-xs text-slate-400">({p.code})</span>
                </Select.Option>
              ))}
            </Select>

            <Button
              icon={<ReloadOutlined />}
              onClick={() => selectedProjectId && fetchProjectInventory(selectedProjectId)}
              loading={loading}
            />

            <Button
              icon={<HistoryOutlined />}
              onClick={() => setIsLedgerOpen(true)}
              className="border-indigo-500/50 text-indigo-400 hover:text-indigo-300"
            >
              Stock Ledger History
            </Button>

            <Button
              icon={<SwapOutlined />}
              onClick={() => setIsTransferModalOpen(true)}
              disabled={projects.length < 2}
            >
              Transfer Stock
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
              <Badge count={filteredInventory.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredInventory.length} Items
                </Tag>
              </Badge>
              {filteredInventory.length !== inventoryList.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {inventoryList.length} total items)
                </span>
              )}
            </div>

            <Space className="justify-between sm:justify-end flex-wrap">
              <Button icon={<DownloadOutlined />} onClick={exportCSV}>
                Export CSV Report
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsAddItemModalOpen(true)}
                disabled={!selectedProjectId}
                className="shadow-lg shadow-indigo-500/30"
              >
                + Add Items to Project
              </Button>
            </Space>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range + Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search by code, name, or unit..."
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
            dataSource={filteredInventory}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800, y: 360 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
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
        projectId={selectedProjectId || 1}
      />

      <AddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSubmitBatch={handleBatchAddItemsSubmit}
        availableItemTypes={availableItemTypes}
        projectName={selectedProject?.name}
      />

      <StockLedgerDrawer
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        projectId={selectedProjectId}
        projectName={selectedProject?.name}
      />

      <TransferStockModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => selectedProjectId && fetchProjectInventory(selectedProjectId)}
        projects={projects}
        currentProjectId={selectedProjectId}
        currentInventory={inventoryList}
      />
    </AppLayout>
  );
};
export default InventoryTrackerPage;
