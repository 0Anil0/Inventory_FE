import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Avatar, Table, Button, Spin, Modal, message } from 'antd';
import {
  UserOutlined,
  DatabaseOutlined,
  AlertOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  HistoryOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  RightOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { dashboardApi } from '../../services/api';
import type { DashboardStats, ProjectInventory, StockMovement, ProjectBreakdown } from '../../types/inventory';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal inspection states for interactive cards
  const [activeModal, setActiveModal] = useState<'PROJECTS' | 'STOCK' | 'ALERTS' | null>(null);

  const roleName = (typeof user?.role === 'object' ? user.role.name : user?.role || 'user').toUpperCase();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load dashboard analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const lowStockColumns: ColumnsType<ProjectInventory> = [
    {
      title: 'Project Site',
      key: 'project',
      render: (_, record) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100 font-['Outfit']">
          {record.project?.name || `Project #${record.project_id}`}
        </span>
      ),
    },
    {
      title: 'Item Name & SKU Code',
      key: 'item',
      render: (_, record) => (
        <div>
          <div className="font-bold text-indigo-600 dark:text-indigo-400">
            {record.item_type?.name || 'Item'}
          </div>
          <div className="text-xs text-slate-400 font-mono">{record.item_type?.code}</div>
        </div>
      ),
    },
    {
      title: 'Current Qty',
      key: 'qty',
      render: (_, record) => (
        <span className="font-mono font-bold text-rose-500">
          {record.quantity} {record.item_type?.unit}
        </span>
      ),
    },
    {
      title: 'Min Alert Threshold',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      render: (min: number, record) => (
        <span className="font-mono text-xs text-slate-400">
          {min || 10} {record.item_type?.unit}
        </span>
      ),
    },
    {
      title: 'Stock Status',
      key: 'status',
      render: (_, record) =>
        record.quantity === 0 ? (
          <Tag color="error" className="font-bold border-none">
            OUT OF STOCK
          </Tag>
        ) : (
          <Tag color="warning" className="font-bold border-none">
            LOW STOCK
          </Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      align: 'right',
      render: () => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setActiveModal(null);
            navigate('/inventory');
          }}
          icon={<RightOutlined />}
        >
          Manage Stock
        </Button>
      ),
    },
  ];

  const projectBreakdownColumns: ColumnsType<ProjectBreakdown> = [
    {
      title: 'Project Name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 font-['Outfit']">{record.name}</div>
          <div className="text-xs text-slate-400 font-mono">Code: {record.code}</div>
        </div>
      ),
    },
    {
      title: 'Catalog Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      render: (count: number) => <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{count}</span>,
    },
    {
      title: 'Total Stock Units',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      render: (units: number) => (
        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{units.toLocaleString()}</span>
      ),
    },
    {
      title: 'Site Health Status',
      key: 'health',
      render: (_, record) =>
        record.outCount > 0 ? (
          <Tag icon={<ExclamationCircleFilled />} color="error" className="font-bold border-none">
            {record.outCount} Out of Stock
          </Tag>
        ) : record.lowCount > 0 ? (
          <Tag icon={<AlertOutlined />} color="warning" className="font-bold border-none">
            {record.lowCount} Low Stock
          </Tag>
        ) : (
          <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none">
            Optimal Stock
          </Tag>
        ),
    },
  ];

  const getMovementTag = (type: StockMovement['type']) => {
    switch (type) {
      case 'IN':
        return (
          <Tag icon={<ArrowUpOutlined />} color="success" className="font-bold border-none">
            IN
          </Tag>
        );
      case 'OUT':
        return (
          <Tag icon={<ArrowDownOutlined />} color="error" className="font-bold border-none">
            OUT
          </Tag>
        );
      case 'TRANSFER':
        return (
          <Tag icon={<SwapOutlined />} color="processing" className="font-bold border-none">
            TRANSFER
          </Tag>
        );
      default:
        return <Tag color="purple" className="font-bold border-none">SET</Tag>;
    }
  };

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Welcome Banner Card */}
        <Card className="shadow-md dark:shadow-2xl border border-slate-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                size={56}
                style={{ backgroundColor: '#6366f1' }}
                icon={<UserOutlined />}
                className="font-bold text-2xl"
              >
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>

              <div>
                <h1 className="text-xl font-bold app-text-main font-['Outfit'] mb-0.5">
                  Welcome back, {user?.username}!
                </h1>
                <p className="text-xs app-text-muted mb-0">
                  Inventory Management Portal • Active role:{' '}
                  <Tag color="purple" className="font-bold border-none ml-1">
                    {roleName}
                  </Tag>
                </p>
              </div>
            </div>

            <Button type="primary" icon={<RightOutlined />} onClick={() => navigate('/inventory')}>
              Go to Stock Tracker
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Interactive High-Contrast Stat Cards Grid */}
            <Row gutter={[16, 16]}>
              {/* Card 1: Active Projects */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  onClick={() => setActiveModal('PROJECTS')}
                  className="shadow-lg hover:shadow-indigo-500/10 border border-slate-200 dark:border-white/10 hover:border-indigo-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Active Projects
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100 mt-1">
                        {stats?.totalProjects || 0}
                      </div>
                      <div className="text-[11px] text-indigo-500 font-semibold mt-1 flex items-center gap-1">
                        View Projects Breakdown <RightOutlined className="text-[9px]" />
                      </div>
                    </div>
                    <div className="p-3.5 bg-indigo-500/10 rounded-2xl text-indigo-500 text-2xl shrink-0">
                      <DatabaseOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Card 2: Total Stock Units */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  onClick={() => setActiveModal('STOCK')}
                  className="shadow-lg hover:shadow-sky-500/10 border border-slate-200 dark:border-white/10 hover:border-sky-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Total Stock Units
                      </div>
                      <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-1">
                        {stats?.totalStockUnits.toLocaleString() || 0}
                      </div>
                      <div className="text-[11px] text-sky-500 font-semibold mt-1 flex items-center gap-1">
                        View Stock Summary <RightOutlined className="text-[9px]" />
                      </div>
                    </div>
                    <div className="p-3.5 bg-sky-500/10 rounded-2xl text-sky-500 text-2xl shrink-0">
                      <AppstoreOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Card 3: Catalog Item Types */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  onClick={() => navigate('/item-types')}
                  className="shadow-lg hover:shadow-emerald-500/10 border border-slate-200 dark:border-white/10 hover:border-emerald-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Catalog Item Types
                      </div>
                      <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {stats?.totalItemTypes || 0}
                      </div>
                      <div className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                        Manage Master Catalog <RightOutlined className="text-[9px]" />
                      </div>
                    </div>
                    <div className="p-3.5 bg-emerald-500/10 rounded-2xl text-emerald-500 text-2xl shrink-0">
                      <CodeSandboxOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              {/* Card 4: Low Stock Alerts */}
              <Col xs={24} sm={12} lg={6}>
                <Card
                  onClick={() => setActiveModal('ALERTS')}
                  className="shadow-lg hover:shadow-rose-500/10 border border-rose-300 dark:border-rose-500/30 hover:border-rose-500 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-rose-500/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        Low Stock Alerts
                      </div>
                      <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
                        {(stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
                      </div>
                      <div className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                        View Low Stock Items <RightOutlined className="text-[9px]" />
                      </div>
                    </div>
                    <div className="p-3.5 bg-rose-500/10 rounded-2xl text-rose-500 text-2xl shrink-0">
                      <AlertOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Low Stock Attention Panel */}
            {stats && (stats.lowStockItems.length > 0 || stats.outOfStockCount > 0) && (
              <Card
                title={
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold font-['Outfit']">
                      <AlertOutlined /> Urgent Stock Replenishment Needed
                    </span>
                    <Tag color="error" className="font-bold border-none">
                      {stats.lowStockItems.length} Item(s) Require Reorder
                    </Tag>
                  </div>
                }
                className="shadow-xl border border-rose-200 dark:border-rose-500/20"
              >
                <Table
                  columns={lowStockColumns}
                  dataSource={stats.lowStockItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 650 }}
                />
              </Card>
            )}

            {/* Projects Overview & Activity Grid */}
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card
                  title={
                    <span className="flex items-center gap-2 app-text-main font-bold font-['Outfit']">
                      <DatabaseOutlined className="text-indigo-500" /> Project Sites Overview
                    </span>
                  }
                  className="shadow-lg h-full"
                >
                  <Table
                    columns={projectBreakdownColumns}
                    dataSource={stats?.projectBreakdown || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    scroll={{ x: 600 }}
                  />
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card
                  title={
                    <span className="flex items-center gap-2 app-text-main font-bold font-['Outfit']">
                      <HistoryOutlined className="text-indigo-500" /> Recent Audit Activity
                    </span>
                  }
                  className="shadow-lg h-full"
                >
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {stats?.recentMovements.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No movement audit logs recorded yet.
                      </div>
                    )}
                    {stats?.recentMovements.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          {getMovementTag(m.type)}
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {m.item_type?.name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {m.project?.name || 'Central Stock'} • By {m.user?.username || 'Admin'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {m.quantity} {m.item_type?.unit}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </main>

      {/* Modal 1: Projects Breakdown Inspection */}
      <Modal
        title={
          <span className="flex items-center gap-2 font-bold font-['Outfit'] text-indigo-500">
            <DatabaseOutlined /> Active Project Sites Summary
          </span>
        }
        open={activeModal === 'PROJECTS'}
        onCancel={() => setActiveModal(null)}
        footer={[
          <Button key="close" onClick={() => setActiveModal(null)}>
            Close
          </Button>,
          <Button key="manage" type="primary" onClick={() => { setActiveModal(null); navigate('/projects'); }}>
            Manage Projects
          </Button>,
        ]}
        width={700}
        centered
      >
        <Table
          columns={projectBreakdownColumns}
          dataSource={stats?.projectBreakdown || []}
          rowKey="id"
          pagination={false}
          size="small"
          className="mt-4"
        />
      </Modal>

      {/* Modal 2: Stock Units Breakdown Inspection */}
      <Modal
        title={
          <span className="flex items-center gap-2 font-bold font-['Outfit'] text-sky-500">
            <AppstoreOutlined /> Total Stock Units Summary
          </span>
        }
        open={activeModal === 'STOCK'}
        onCancel={() => setActiveModal(null)}
        footer={[
          <Button key="close" onClick={() => setActiveModal(null)}>
            Close
          </Button>,
          <Button key="manage" type="primary" onClick={() => { setActiveModal(null); navigate('/inventory'); }}>
            Go to Stock Tracker
          </Button>,
        ]}
        width={650}
        centered
      >
        <div className="py-3">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Stock Across All Locations</div>
              <div className="text-3xl font-bold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                {stats?.totalStockUnits.toLocaleString() || 0} Units
              </div>
            </div>
            <Tag color="cyan" className="font-bold border-none">
              {stats?.totalProjects || 0} Active Project Sites
            </Tag>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            Click below to inspect or manage quantities for specific project sites in the Stock Tracker.
          </p>
        </div>
      </Modal>

      {/* Modal 3: Low Stock Alerts Detailed Breakdown */}
      <Modal
        title={
          <span className="flex items-center gap-2 font-bold font-['Outfit'] text-rose-500">
            <AlertOutlined /> Low Stock & Out-of-Stock Alert Details
          </span>
        }
        open={activeModal === 'ALERTS'}
        onCancel={() => setActiveModal(null)}
        footer={[
          <Button key="close" onClick={() => setActiveModal(null)}>
            Close
          </Button>,
          <Button key="po" type="primary" className="bg-emerald-600 hover:bg-emerald-500 border-none" onClick={() => { setActiveModal(null); navigate('/purchase-orders'); }}>
            + Create Purchase Order
          </Button>,
        ]}
        width={750}
        centered
      >
        <div className="mt-4 space-y-4">
          {stats?.lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-emerald-500 font-semibold bg-emerald-500/10 rounded-xl">
              <CheckCircleFilled className="text-2xl mb-1" />
              <div>All items are currently at optimal stock levels across all project sites!</div>
            </div>
          ) : (
            <Table
              columns={lowStockColumns}
              dataSource={stats?.lowStockItems || []}
              rowKey="id"
              pagination={false}
              size="small"
              scroll={{ x: 650 }}
            />
          )}
        </div>
      </Modal>
    </AppLayout>
  );
};

export default DashboardPage;
