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
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DatabaseOutlined,
  SearchOutlined,
  EditOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  AppstoreOutlined,
  CodeSandboxOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, ItemType } from '../../types/inventory';
import { projectApi, inventoryApi, itemTypeApi } from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { QuantityModal } from '../../components/inventory/QuantityModal';
import { AddItemModal } from '../../components/inventory/AddItemModal';

export const InventoryTrackerPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [inventoryList, setInventoryList] = useState<ProjectInventory[]>([]);
  const [catalogItemTypes, setCatalogItemTypes] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isQuantityModalOpen, setIsQuantityModalOpen] = useState<boolean>(false);
  const [selectedItemForQty, setSelectedItemForQty] = useState<ProjectInventory | null>(null);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);

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
  }) => {
    const res = await inventoryApi.adjustQuantity({
      project_id: data.project_id,
      item_type_id: data.item_type_id,
      adjustment_type: 'SET',
      amount: data.quantity,
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

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // Available catalog item types (filters items already present in current project)
  const existingItemTypeIds = new Set(inventoryList.map((i) => i.item_type_id));
  const availableItemTypes = catalogItemTypes.filter((t) => !existingItemTypeIds.has(t.id));

  const filteredInventory = inventoryList.filter((inv) => {
    const item = inv.item_type;
    if (!item) return false;
    const q = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.unit.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const totalStockUnits = inventoryList.reduce((sum, item) => sum + item.quantity, 0);
  const outOfStockCount = inventoryList.filter((item) => item.quantity === 0).length;

  const getStockStatusTag = (qty: number) => {
    if (qty === 0) {
      return (
        <Tag icon={<CloseCircleFilled />} color="error" className="font-bold border-none py-0.5 px-2.5">
          OUT OF STOCK
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
      title: 'Item Code',
      key: 'code',
      width: 140,
      render: (_, record) => (
        <span className="font-mono text-indigo-400 font-bold">
          {record.item_type?.code || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Item Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-100">{record.item_type?.name || 'Unnamed Item'}</div>
          {record.item_type?.description && (
            <div className="text-xs text-slate-400">{record.item_type.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Current Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record) => (
        <span className="text-base font-bold font-mono text-slate-100">
          {qty.toLocaleString()}{' '}
          <span className="text-xs font-normal text-slate-400">{record.item_type?.unit || 'pcs'}</span>
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => getStockStatusTag(record.quantity),
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
          Update Quantity
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Top Header & Project Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <DatabaseOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100 font-['Outfit'] mb-0.5">
                Project Stock Quantity Tracker
              </h1>
              <p className="text-xs text-slate-400 mb-0">
                Select a project site to track and update item stock quantities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">
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
          </div>
        </div>

        {/* Summary Statistics Grid */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-slate-400 uppercase font-semibold">Total Stock Units</span>}
                value={totalStockUnits}
                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                prefix={<AppstoreOutlined className="mr-2 text-indigo-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-indigo-400/80 uppercase font-semibold">Item Categories</span>}
                value={inventoryList.length}
                valueStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                prefix={<CodeSandboxOutlined className="mr-2 text-sky-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
            <Input
              placeholder="Search items by code, name, or unit..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />

            <Space className="justify-between sm:justify-end">
              <span className="text-xs text-slate-400">
                Showing <strong className="text-slate-200">{filteredInventory.length}</strong> items in{' '}
                <strong className="text-indigo-400">{selectedProject?.name || 'Project'}</strong>
              </span>

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

          <Table
            columns={columns}
            dataSource={filteredInventory}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
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
    </div>
  );
};
export default InventoryTrackerPage;
