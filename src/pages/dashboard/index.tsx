import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Avatar, Table, Button, Spin, message } from 'antd';
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
      title: 'Project',
      key: 'project',
      render: (_, record) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100 font-['Outfit']">
          {record.project?.name || `Project #${record.project_id}`}
        </span>
      ),
    },
    {
      title: 'Item Code & Name',
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
      title: 'Min Threshold',
      dataIndex: 'min_quantity',
      key: 'min_quantity',
      render: (min: number, record) => (
        <span className="font-mono text-xs text-slate-400">
          {min || 10} {record.item_type?.unit}
        </span>
      ),
    },
    {
      title: 'Status',
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
          onClick={() => navigate('/inventory')}
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
          <div className="font-bold text-slate-800 dark:text-slate-100">{record.name}</div>
          <div className="text-xs text-slate-400 font-mono">Code: {record.code}</div>
        </div>
      ),
    },
    {
      title: 'Catalog Items',
      dataIndex: 'itemCount',
      key: 'itemCount',
      render: (count: number) => <span className="font-mono font-semibold">{count}</span>,
    },
    {
      title: 'Total Stock Units',
      dataIndex: 'totalUnits',
      key: 'totalUnits',
      render: (units: number) => (
        <span className="font-mono font-bold text-indigo-500">{units.toLocaleString()}</span>
      ),
    },
    {
      title: 'Health',
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
        {/* Welcome Card */}
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
                  Ravi Inventory Control Portal • Active role:{' '}
                  <Tag color="purple" className="font-bold border-none ml-1">
                    {roleName}
                  </Tag>
                </p>
              </div>
            </div>

            <Button type="primary" icon={<RightOutlined />} onClick={() => navigate('/inventory')}>
              Go to Inventory Tracker
            </Button>
          </div>
        </Card>

        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Active Projects
                      </div>
                      <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                        {stats?.totalProjects || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 text-2xl">
                      <DatabaseOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Total Stock Units
                      </div>
                      <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                        {stats?.totalStockUnits.toLocaleString() || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 text-2xl">
                      <AppstoreOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-lg hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Catalog Item Types
                      </div>
                      <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                        {stats?.totalItemTypes || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 text-2xl">
                      <CodeSandboxOutlined />
                    </div>
                  </div>
                </Card>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-lg hover:border-rose-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                        Low Stock Alerts
                      </div>
                      <div className="text-2xl font-bold font-mono text-rose-500 mt-1">
                        {(stats?.lowStockCount || 0) + (stats?.outOfStockCount || 0)}
                      </div>
                    </div>
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 text-2xl">
                      <AlertOutlined />
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* Low Stock Alert Table Section */}
            {stats && stats.lowStockItems.length > 0 && (
              <Card
                className="shadow-2xl border-l-4 border-l-rose-500"
                title={
                  <div className="flex items-center gap-2 text-rose-500 font-bold">
                    <AlertOutlined />
                    <span>Low-Stock & Out-of-Stock Attention Items</span>
                  </div>
                }
              >
                <Table
                  columns={lowStockColumns}
                  dataSource={stats.lowStockItems}
                  rowKey="id"
                  pagination={{ pageSize: 5 }}
                  size="small"
                />
              </Card>
            )}

            {/* Main Content Grid: Project Breakdown & Recent Activity */}
            <Row gutter={[20, 20]}>
              <Col xs={24} lg={14}>
                <Card
                  title={
                    <div className="flex items-center gap-2 font-bold">
                      <DatabaseOutlined className="text-indigo-400" />
                      <span>Project Site Stock Summary</span>
                    </div>
                  }
                  className="shadow-xl"
                >
                  <Table
                    columns={projectBreakdownColumns}
                    dataSource={stats?.projectBreakdown || []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card
                  title={
                    <div className="flex items-center gap-2 font-bold">
                      <HistoryOutlined className="text-indigo-400" />
                      <span>Recent Stock Movements</span>
                    </div>
                  }
                  className="shadow-xl"
                >
                  <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {stats?.recentMovements.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getMovementTag(m.type)}
                            <span className="font-bold text-slate-200">{m.item_type?.name}</span>
                          </div>
                          <div className="text-slate-400">
                            {m.project?.name} • {m.user?.username || 'Admin'}
                          </div>
                          {m.notes && <div className="text-slate-500 italic mt-0.5">{m.notes}</div>}
                        </div>

                        <div className="text-right font-mono">
                          <div className="font-bold text-slate-100">
                            {m.quantity} {m.item_type?.unit}
                          </div>
                          <div className="text-[10px] text-slate-500">
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
    </AppLayout>
  );
};
export default DashboardPage;
