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
  Tabs,
  Badge,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  message,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FolderOpenOutlined,
  NodeIndexOutlined,
  SearchOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  SwapOutlined,
  AlertOutlined,
  ClusterOutlined,
  ShopOutlined,
  CheckCircleFilled,
  WarningFilled,
  TableOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, ItemType } from '../../types/inventory';
import { projectApi, inventoryApi, itemTypeApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

const { Text } = Typography;

interface ProjectTreeNode {
  key: string;
  id: number | null; // null = General Store, number = project_id
  name: string;
  code: string;
  type: 'STORE' | 'MAIN' | 'SUB';
  parentName?: string;
  itemCount: number;
  totalUnits: number;
  lowStockCount: number;
  items: ProjectInventory[];
  children?: ProjectTreeNode[];
}

export const ProjectStockTrackerPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [allInventory, setAllInventory] = useState<ProjectInventory[]>([]);
  const [catalogItems, setCatalogItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<number | 'STORE' | null>(null);
  const [activeTab, setActiveTab] = useState<string>('hierarchy');

  // Transfer Modal states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferSource, setTransferSource] = useState<ProjectTreeNode | null>(null);
  const [transferItem, setTransferItem] = useState<ProjectInventory | null>(null);
  const [transferSubmitting, setTransferSubmitting] = useState<boolean>(false);
  const [transferForm] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, invRes, itemRes] = await Promise.all([
        projectApi.getAll(),
        inventoryApi.getAll(),
        itemTypeApi.getAll(),
      ]);

      if (projRes.success && projRes.projects) setProjects(projRes.projects);
      if (invRes.success && invRes.inventory) setAllInventory(invRes.inventory);
      if (itemRes.success && itemRes.items) setCatalogItems(itemRes.items);
    } catch (err: any) {
      message.error(err.message || 'Failed to load project stock data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build Project Tree Nodes (Main Projects with Child Sub-Sites nested)
  const buildTreeData = (): ProjectTreeNode[] => {
    const storeItems = allInventory.filter((i) => !i.project_id || i.project_id === 0);
    const storeNode: ProjectTreeNode = {
      key: 'store',
      id: 0,
      name: 'General Store / Main Warehouse',
      code: 'STORE-MAIN',
      type: 'STORE',
      itemCount: storeItems.filter((i) => i.quantity > 0).length,
      totalUnits: storeItems.reduce((sum, i) => sum + i.quantity, 0),
      lowStockCount: storeItems.filter((i) => i.quantity > 0 && i.quantity <= (i.min_quantity || 10)).length,
      items: storeItems,
    };

    const mainProjects = projects.filter((p) => !p.parent_id);

    const projectNodes: ProjectTreeNode[] = mainProjects.map((mainProj) => {
      const mainItems = allInventory.filter((i) => i.project_id === mainProj.id);
      const childProjects = projects.filter((p) => p.parent_id === mainProj.id);

      const childrenNodes: ProjectTreeNode[] = childProjects.map((childProj) => {
        const childItems = allInventory.filter((i) => i.project_id === childProj.id);
        return {
          key: `proj-${childProj.id}`,
          id: childProj.id,
          name: childProj.name,
          code: childProj.code,
          type: 'SUB',
          parentName: mainProj.name,
          itemCount: childItems.filter((i) => i.quantity > 0).length,
          totalUnits: childItems.reduce((sum, i) => sum + i.quantity, 0),
          lowStockCount: childItems.filter((i) => i.quantity > 0 && i.quantity <= (i.min_quantity || 10)).length,
          items: childItems,
        };
      });

      const childTotalUnits = childrenNodes.reduce((sum, c) => sum + c.totalUnits, 0);

      return {
        key: `proj-${mainProj.id}`,
        id: mainProj.id,
        name: mainProj.name,
        code: mainProj.code,
        type: 'MAIN',
        itemCount: mainItems.filter((i) => i.quantity > 0).length,
        totalUnits: mainItems.reduce((sum, i) => sum + i.quantity, 0) + childTotalUnits,
        lowStockCount: mainItems.filter((i) => i.quantity > 0 && i.quantity <= (i.min_quantity || 10)).length,
        items: mainItems,
        children: childrenNodes.length > 0 ? childrenNodes : undefined,
      };
    });

    return [storeNode, ...projectNodes];
  };

  const treeNodes = buildTreeData();

  // Filtered Tree Nodes
  const filteredTreeNodes = treeNodes.filter((node) => {
    if (filterProjectId === 'STORE' && node.type !== 'STORE') return false;
    if (typeof filterProjectId === 'number' && node.id !== filterProjectId) {
      if (node.type === 'MAIN') {
        const hasChildMatch = node.children?.some((c) => c.id === filterProjectId);
        if (!hasChildMatch) return false;
      } else {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
      const itemMatch = node.items.some(
        (i) => i.item_type?.name?.toLowerCase().includes(q) || i.item_type?.code?.toLowerCase().includes(q)
      );
      const childMatch = node.children?.some(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.items.some((ci) => ci.item_type?.name?.toLowerCase().includes(q))
      );
      return nameMatch || itemMatch || childMatch;
    }

    return true;
  });

  // Calculate Overall Statistics
  const totalLocations = projects.length + 1; // Projects + General Store
  const totalStockUnits = allInventory.reduce((sum, i) => sum + i.quantity, 0);
  const totalProjectStockUnits = allInventory
    .filter((i) => i.project_id && i.project_id !== 0)
    .reduce((sum, i) => sum + i.quantity, 0);
  const lowStockCount = allInventory.filter(
    (i) => i.quantity > 0 && i.quantity <= (i.min_quantity || 10)
  ).length;

  // Open Transfer Modal
  const handleOpenTransfer = (node: ProjectTreeNode, invItem: ProjectInventory) => {
    setTransferSource(node);
    setTransferItem(invItem);
    transferForm.resetFields();
    transferForm.setFieldsValue({
      from_project_id: node.id || 0,
      quantity: 1,
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferSubmit = async (values: any) => {
    if (!transferItem || !transferSource) return;

    setTransferSubmitting(true);
    try {
      const res = await inventoryApi.transferStock({
        from_project_id: Number(values.from_project_id),
        to_project_id: Number(values.to_project_id),
        item_type_id: transferItem.item_type_id,
        quantity: Number(values.quantity),
        notes: values.notes ? values.notes.trim() : `Stock transfer requested via Hierarchy Tracker`,
      });

      if (res.success) {
        message.success('Stock transferred successfully!');
        setIsTransferModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      message.error(err.message || 'Transfer failed');
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Tree Table Columns
  const treeColumns: ColumnsType<ProjectTreeNode> = [
    {
      title: 'Project / Sub-Site Hierarchy',
      key: 'name',
      width: 320,
      render: (_, record) => {
        if (record.type === 'STORE') {
          return (
            <div className="flex items-center gap-2 py-1">
              <ShopOutlined className="text-amber-500 text-xl" />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-base font-['Outfit']">
                  {record.name}
                </div>
                <Tag color="gold" className="font-mono text-[10px] font-bold border-none">
                  MAIN WAREHOUSE / STORE
                </Tag>
              </div>
            </div>
          );
        }

        if (record.type === 'MAIN') {
          return (
            <div className="flex items-center gap-2 py-1">
              <FolderOpenOutlined className="text-indigo-500 text-lg" />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 text-base font-['Outfit']">
                  {record.name}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Tag color="blue" className="font-mono text-[10px] font-bold border-none">
                    MAIN PROJECT
                  </Tag>
                  <span className="text-xs font-mono text-indigo-400">({record.code})</span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 py-1 pl-4 border-l-2 border-purple-500/40">
            <NodeIndexOutlined className="text-purple-500 text-base" />
            <div>
              <div className="font-bold text-purple-900 dark:text-purple-200 text-sm font-['Outfit']">
                {record.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Tag color="purple" className="font-mono text-[10px] font-bold border-none">
                  SUB-PROJECT (Parent: {record.parentName})
                </Tag>
                <span className="text-xs font-mono text-purple-400">({record.code})</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Active Item Types',
      key: 'itemCount',
      width: 140,
      align: 'center',
      render: (_, record) => (
        <Badge count={record.itemCount} overflowCount={999} showZero color="#6366f1">
          <Tag color="geekblue" className="font-bold font-mono px-2 py-0.5">
            {record.itemCount} SKUs
          </Tag>
        </Badge>
      ),
    },
    {
      title: 'Total Held Quantity',
      key: 'totalUnits',
      width: 160,
      align: 'right',
      render: (_, record) => (
        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
          {record.totalUnits.toLocaleString()} units
        </div>
      ),
    },
    {
      title: 'Stock Status',
      key: 'status',
      width: 160,
      render: (_, record) => {
        if (record.totalUnits === 0) {
          return (
            <Tag color="default" className="font-bold border-none">
              NO STOCK
            </Tag>
          );
        }
        if (record.lowStockCount > 0) {
          return (
            <Tag icon={<WarningFilled />} color="warning" className="font-bold border-none">
              {record.lowStockCount} LOW STOCK
            </Tag>
          );
        }
        return (
          <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none">
            HEALTHY
          </Tag>
        );
      },
    },
  ];

  // Render Inner Table for Sub-Items held at a location
  const expandedRowRender = (record: ProjectTreeNode) => {
    const itemColumns: ColumnsType<ProjectInventory> = [
      {
        title: 'Item Description',
        key: 'item_name',
        render: (_, inv) => (
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {inv.item_type?.name || `Item #${inv.item_type_id}`}
            </div>
            <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
              <span>Code: {inv.item_type?.code || 'N/A'}</span>
              {inv.item_type?.description && <span>• {inv.item_type.description}</span>}
            </div>
          </div>
        ),
      },
      {
        title: 'Current Stock Qty',
        key: 'quantity',
        width: 160,
        render: (_, inv) => {
          const isLow = inv.quantity > 0 && inv.quantity <= (inv.min_quantity || 10);
          const isZero = inv.quantity === 0;
          return (
            <div className="flex items-center gap-2">
              <span
                className={`font-mono font-bold text-base ${
                  isZero
                    ? 'text-rose-500'
                    : isLow
                    ? 'text-amber-500 font-extrabold'
                    : 'text-emerald-500'
                }`}
              >
                {inv.quantity.toLocaleString()} {inv.item_type?.unit || 'pcs'}
              </span>
              {isLow && <Tag color="warning" className="text-[10px] font-bold">LOW</Tag>}
              {isZero && <Tag color="error" className="text-[10px] font-bold">EMPTY</Tag>}
            </div>
          );
        },
      },
      {
        title: 'Min Level Alert',
        dataIndex: 'min_quantity',
        key: 'min_quantity',
        width: 130,
        render: (minQty: number, inv) => (
          <span className="font-mono text-xs text-slate-400">
            {minQty || 10} {inv.item_type?.unit || 'pcs'}
          </span>
        ),
      },
      {
        title: 'Action',
        key: 'action',
        width: 140,
        align: 'center',
        render: (_, inv) => (
          <Button
            type="primary"
            ghost
            size="small"
            icon={<SwapOutlined />}
            onClick={() => handleOpenTransfer(record, inv)}
            disabled={inv.quantity <= 0}
          >
            Transfer
          </Button>
        ),
      },
    ];

    return (
      <Card size="small" className="bg-slate-950/40 border border-slate-800 rounded-xl my-2">
        <div className="flex items-center justify-between mb-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
            📦 Stock Items Assigned at "{record.name}" ({record.items.filter((i) => i.quantity > 0).length} Active Items)
          </Text>
        </div>
        <Table<ProjectInventory>
          columns={itemColumns}
          dataSource={record.items}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  // Build Cross-Tabulation Matrix (Rows: Items, Columns: Projects/Locations)
  const allLocationsList = [
    { id: 0, name: 'General Store / Main Warehouse', code: 'STORE', isSub: false, parentName: undefined },
    ...projects.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      isSub: !!p.parent_id,
      parentName: p.parent?.name || projects.find((parentP) => parentP.id === p.parent_id)?.name,
    })),
  ];

  const matrixColumns: ColumnsType<ItemType> = [
    {
      title: 'Item Name & Code',
      key: 'item_info',
      fixed: 'left',
      width: 220,
      render: (_, item) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
          <div className="text-xs font-mono text-indigo-500">
            {item.code} ({item.unit})
          </div>
        </div>
      ),
    },
    ...allLocationsList.map((loc) => ({
      title: (
        <Tooltip title={loc.isSub ? `Sub-Project under ${loc.parentName}` : loc.name}>
          <div className="text-center font-mono text-xs">
            <div className="font-bold text-slate-700 dark:text-slate-200">
              {loc.isSub ? `🔀 ${loc.name}` : loc.id === 0 ? `🏭 Warehouse` : `📁 ${loc.name}`}
            </div>
            {loc.isSub && (
              <div className="text-[10px] text-purple-400 font-semibold">
                Parent: {loc.parentName}
              </div>
            )}
          </div>
        </Tooltip>
      ),
      key: `loc_${loc.id}`,
      width: 140,
      align: 'center' as const,
      render: (_: any, item: ItemType) => {
        const invRecord = allInventory.find(
          (inv) =>
            (loc.id === 0 ? !inv.project_id || inv.project_id === 0 : inv.project_id === loc.id) &&
            inv.item_type_id === item.id
        );
        const qty = invRecord ? invRecord.quantity : 0;
        if (qty === 0) {
          return <span className="text-slate-500 text-xs font-mono">-</span>;
        }
        return (
          <Tag color={loc.id === 0 ? 'amber' : loc.isSub ? 'purple' : 'blue'} className="font-mono font-bold">
            {qty.toLocaleString()} {item.unit}
          </Tag>
        );
      },
    })),
    {
      title: 'Total Across Sites',
      key: 'total_matrix',
      fixed: 'right',
      width: 160,
      align: 'right',
      render: (_, item) => {
        const total = allInventory
          .filter((inv) => inv.item_type_id === item.id)
          .reduce((sum, inv) => sum + inv.quantity, 0);
        return (
          <span className="font-mono font-bold text-emerald-500 text-sm">
            {total.toLocaleString()} {item.unit}
          </span>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <BranchesOutlined className="text-2xl text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Project Stock Hierarchy & Item Matrix Tracker
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Track stock allocation across Main Projects and Child Sub-Sites in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Statistics Banner */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-slate-400 uppercase font-semibold">Total Sites Tracked</span>}
                value={totalLocations}
                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                prefix={<ClusterOutlined className="mr-2 text-indigo-400" />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-purple-400 uppercase font-semibold font-mono">Project Stock Units</span>}
                value={totalProjectStockUnits}
                valueStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                prefix={<AppstoreOutlined className="mr-2 text-purple-400" />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-emerald-400 uppercase font-semibold font-mono">Total Organization Units</span>}
                value={totalStockUnits}
                valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
                prefix={<ShopOutlined className="mr-2 text-emerald-400" />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-amber-400 uppercase font-semibold font-mono">Low Stock Alerts</span>}
                value={lowStockCount}
                valueStyle={{ color: lowStockCount > 0 ? '#f59e0b' : '#10b981', fontWeight: 'bold' }}
                prefix={<AlertOutlined className="mr-2 text-amber-400" />}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Tabs Container */}
        <Card className="shadow-2xl">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            items={[
              {
                key: 'hierarchy',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <BranchesOutlined /> Parent & Sub-Site Tree Hierarchy
                  </span>
                ),
                children: (
                  <div className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        placeholder="Search project name, code, or item..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        allowClear
                      />
                      <Select
                        placeholder="Filter by Project or Sub-Site"
                        value={filterProjectId}
                        onChange={setFilterProjectId}
                        allowClear
                      >
                        <Select.Option value="STORE">🏭 General Store / Main Warehouse</Select.Option>
                        {projects.map((p) => {
                          const parent = p.parent || projects.find((parentP) => parentP.id === p.parent_id);
                          return (
                            <Select.Option key={p.id} value={p.id}>
                              {p.parent_id && parent ? (
                                <span>📁 {parent.name} ➔ 🔀 {p.name} ({p.code})</span>
                              ) : (
                                <span>📁 {p.name} ({p.code})</span>
                              )}
                            </Select.Option>
                          );
                        })}
                      </Select>
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                          setSearchQuery('');
                          setFilterProjectId(null);
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>

                    <Table<ProjectTreeNode>
                      columns={treeColumns}
                      dataSource={filteredTreeNodes}
                      rowKey="key"
                      loading={loading}
                      expandable={{
                        expandedRowRender,
                        defaultExpandAllRows: true,
                      }}
                      pagination={false}
                    />
                  </div>
                ),
              },
              {
                key: 'matrix',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <TableOutlined /> Item Location Stock Matrix
                  </span>
                ),
                children: (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Text className="text-xs font-mono text-slate-400">
                        Cross-tabulated view of each material SKU across Central Warehouse, Main Projects & Sub-Sites
                      </Text>
                      <Input
                        placeholder="Filter items..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                        allowClear
                      />
                    </div>
                    <Table<ItemType>
                      columns={matrixColumns}
                      dataSource={catalogItems.filter((i) =>
                        !searchQuery ||
                        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        i.code.toLowerCase().includes(searchQuery.toLowerCase())
                      )}
                      rowKey="id"
                      scroll={{ x: 1000, y: 500 }}
                      pagination={{ pageSize: 15 }}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </main>

      {/* STOCK TRANSFER MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold border-b pb-3">
            <SwapOutlined className="text-indigo-600" />
            <span>Transfer Stock Between Projects / Sub-Sites</span>
          </div>
        }
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        confirmLoading={transferSubmitting}
        okText="Confirm Stock Transfer"
        centered
        destroyOnClose
        width={600}
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit} className="mt-4">
          <Card size="small" className="bg-slate-900/60 border border-white/10 mb-4">
            <div className="text-xs text-slate-400 uppercase font-semibold font-mono mb-1">
              Selected Item to Transfer:
            </div>
            <div className="font-bold text-base text-slate-100">{transferItem?.item_type?.name}</div>
            <div className="text-xs text-indigo-400 font-mono mt-0.5">
              Available at Source ({transferSource?.name}):{' '}
              <strong className="text-cyan-400 font-bold">
                {transferItem?.quantity} {transferItem?.item_type?.unit || 'pcs'}
              </strong>
            </div>
          </Card>

          <Form.Item name="from_project_id" label="Source Location" rules={[{ required: true }]}>
            <Select disabled>
              <Select.Option value={transferSource?.id || 0}>{transferSource?.name}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="to_project_id"
            label="Destination Location (Parent Project or Child Sub-Site)"
            rules={[{ required: true, message: 'Please select destination project or site' }]}
          >
            <Select placeholder="Select Destination Project or Site">
              <Select.Option value={0}>🏭 General Store / Main Warehouse</Select.Option>
              {projects
                .filter((p) => p.id !== transferSource?.id)
                .map((p) => {
                  const parent = p.parent || projects.find((parentP) => parentP.id === p.parent_id);
                  return (
                    <Select.Option key={p.id} value={p.id}>
                      {p.parent_id && parent ? (
                        <span>📁 {parent.name} ➔ 🔀 {p.name} ({p.code})</span>
                      ) : (
                        <span>📁 {p.name} ({p.code})</span>
                      )}
                    </Select.Option>
                  );
                })}
            </Select>
          </Form.Item>

          <Form.Item
            name="quantity"
            label={`Transfer Quantity (${transferItem?.item_type?.unit || 'units'})`}
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber
              min={1}
              max={transferItem?.quantity || 1}
              className="w-full"
              size="large"
            />
          </Form.Item>

          <Form.Item name="notes" label="Transfer Remarks / Reason (Optional)">
            <Input.TextArea placeholder="Enter transfer notes or reference details..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ProjectStockTrackerPage;
