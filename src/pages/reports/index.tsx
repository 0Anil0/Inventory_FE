import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, DatePicker, Tag, Space, Tabs, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileSearchOutlined,
  DownloadOutlined,
  PrinterOutlined,
  SearchOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  ShoppingOutlined,
  FileDoneOutlined,
  SwapOutlined,
  HistoryOutlined,
  CheckCircleFilled,
  AlertOutlined,
  ExclamationCircleFilled,
  UserOutlined,
} from '@ant-design/icons';
import { reportApi, projectApi } from '../../services/api';
import type { Project } from '../../types/inventory';
import { AppLayout } from '../../components/layout/AppLayout';

const { RangePicker } = DatePicker;

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('stock-summary');
  const [data, setData] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [healthFilter, setHealthFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const fetchInitialData = async () => {
    try {
      const pRes = await projectApi.getAll();
      if (pRes.success && pRes.projects) setProjects(pRes.projects);
    } catch (err: any) {
      console.error('Failed to load project sites for report filters');
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (healthFilter !== 'ALL') params.health = healthFilter;
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }

      let res: any;
      switch (reportType) {
        case 'stock-summary':
          res = await reportApi.getStockSummary(params);
          break;
        case 'purchase-orders':
          res = await reportApi.getPurchaseOrders(params);
          break;
        case 'material-issues':
          res = await reportApi.getMaterialIssues(params);
          break;
        case 'stock-transfers':
          res = await reportApi.getStockTransfers(params);
          break;
        case 'audit-ledger':
          res = await reportApi.getAuditLedger(params);
          break;
        default:
          res = await reportApi.getStockSummary(params);
      }

      if (res.success && res.reports) {
        setData(res.reports);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [reportType, selectedProjectId, healthFilter, dateRange]);

  // Export CSV Helper
  const handleExportCSV = () => {
    if (data.length === 0) {
      message.warning('No data available to export');
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'stock-summary') {
      headers = ['Project Site', 'Item Name', 'Item Code', 'Quantity', 'Unit', 'Min Threshold', 'Stock Status'];
      rows = filteredData.map((d) => [
        `"${d.project?.name || 'Central Warehouse'}"`,
        `"${d.item_type?.name || ''}"`,
        `"${d.item_type?.code || ''}"`,
        d.quantity,
        `"${d.item_type?.unit || ''}"`,
        d.min_quantity || 10,
        d.quantity === 0 ? 'OUT OF STOCK' : d.quantity <= (d.min_quantity || 10) ? 'LOW STOCK' : 'IN STOCK',
      ]);
    } else if (reportType === 'purchase-orders') {
      headers = ['PO Number', 'Order Date', 'Supplier', 'Items Count', 'Total Amount', 'Status'];
      rows = filteredData.map((d) => [
        `"${d.po_number}"`,
        d.order_date ? new Date(d.order_date).toLocaleDateString() : '',
        `"${d.vendor?.name || ''}"`,
        d.items?.length || 0,
        d.total_amount || 0,
        `"${d.status}"`,
      ]);
    } else if (reportType === 'material-issues') {
      headers = ['Voucher Number', 'Issue Date', 'Project Site', 'Recipient', 'Issued Items Count', 'Issued By'];
      rows = filteredData.map((d) => [
        `"${d.issue_number}"`,
        d.issue_date ? new Date(d.issue_date).toLocaleDateString() : '',
        `"${d.project?.name || ''}"`,
        `"${d.issued_to}"`,
        d.items?.length || 0,
        `"${d.user?.username || ''}"`,
      ]);
    } else {
      headers = ['Timestamp', 'Type', 'Project Site', 'Item Code', 'Item Name', 'Shift Quantity', 'Previous Qty', 'New Qty', 'User', 'Notes'];
      rows = filteredData.map((d) => [
        d.createdAt ? new Date(d.createdAt).toLocaleString() : '',
        d.type,
        `"${d.project?.name || 'Central Stock'}"`,
        `"${d.item_type?.code || ''}"`,
        `"${d.item_type?.name || ''}"`,
        d.quantity,
        d.previous_quantity,
        d.new_quantity,
        `"${d.user?.username || 'Admin'}"`,
        `"${d.notes || ''}"`,
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Report exported as CSV successfully!');
  };

  const handlePrint = () => {
    window.print();
  };

  // Search Filter
  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return JSON.stringify(item).toLowerCase().includes(q);
  });

  // Columns per Report Type
  const stockSummaryColumns: ColumnsType<any> = [
    {
      title: 'Project Site',
      key: 'project',
      render: (_, r) => <span className="font-semibold font-['Outfit']">{r.project?.name || 'Central Warehouse'}</span>,
    },
    {
      title: 'Item Name & Code',
      key: 'item',
      render: (_, r) => (
        <div>
          <div className="font-bold text-indigo-600 dark:text-indigo-400">{r.item_type?.name}</div>
          <div className="text-xs text-slate-400 font-mono">{r.item_type?.code}</div>
        </div>
      ),
    },
    {
      title: 'Stock Quantity',
      key: 'qty',
      render: (_, r) => (
        <span className="font-mono font-bold text-base">
          {r.quantity} {r.item_type?.unit}
        </span>
      ),
    },
    {
      title: 'Min Alert Threshold',
      dataIndex: 'min_quantity',
      key: 'min',
      render: (m, r) => <span className="font-mono text-xs text-slate-400">{m || 10} {r.item_type?.unit}</span>,
    },
    {
      title: 'Health Status',
      key: 'status',
      render: (_, r) =>
        r.quantity === 0 ? (
          <Tag icon={<ExclamationCircleFilled />} color="error" className="font-bold border-none">
            OUT OF STOCK
          </Tag>
        ) : r.quantity <= (r.min_quantity || 10) ? (
          <Tag icon={<AlertOutlined />} color="warning" className="font-bold border-none">
            LOW STOCK
          </Tag>
        ) : (
          <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none">
            IN STOCK
          </Tag>
        ),
    },
  ];

  const poColumns: ColumnsType<any> = [
    {
      title: 'PO Number & Date',
      key: 'po',
      render: (_, r) => (
        <div>
          <div className="font-mono font-bold text-indigo-500">{r.po_number}</div>
          <div className="text-xs text-slate-400 font-mono">
            {r.order_date ? new Date(r.order_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Supplier',
      key: 'vendor',
      render: (_, r) => <span className="font-semibold text-slate-800 dark:text-slate-200">{r.vendor?.name}</span>,
    },
    {
      title: 'Line Items Summary',
      key: 'items',
      render: (_, r) => (
        <div className="text-xs font-mono space-y-0.5">
          {r.items?.map((i: any) => (
            <div key={i.id}>
              • {i.item_type?.name}: <strong>{i.ordered_qty}</strong> {i.item_type?.unit}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Total Value',
      dataIndex: 'total_amount',
      key: 'total',
      render: (amt: number) => <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{(amt || 0).toLocaleString()}</span>,
    },
    {
      title: 'PO Status',
      dataIndex: 'status',
      key: 'status',
      render: (st: string) =>
        st === 'RECEIVED' ? (
          <Tag color="success" className="font-bold border-none">STOCK RECEIVED</Tag>
        ) : (
          <Tag color="processing" className="font-bold border-none">ORDERED (PENDING)</Tag>
        ),
    },
  ];

  const issueColumns: ColumnsType<any> = [
    {
      title: 'Voucher # & Date',
      key: 'issue',
      render: (_, r) => (
        <div>
          <div className="font-mono font-bold text-indigo-500">{r.issue_number}</div>
          <div className="text-xs text-slate-400 font-mono">
            {r.issue_date ? new Date(r.issue_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Recipient Name',
      dataIndex: 'issued_to',
      key: 'issued_to',
      render: (rec: string) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
          <UserOutlined className="text-emerald-500" /> {rec}
        </span>
      ),
    },
    {
      title: 'Project Site',
      key: 'project',
      render: (_, r) => <span className="text-slate-700 dark:text-slate-300">{r.project?.name}</span>,
    },
    {
      title: 'Issued Items',
      key: 'items',
      render: (_, r) => (
        <div className="text-xs font-mono space-y-0.5">
          {r.items?.map((i: any) => (
            <div key={i.id}>
              • {i.item_type?.name}: <strong>{i.quantity}</strong> {i.item_type?.unit}
            </div>
          ))}
        </div>
      ),
    },
  ];

  const auditColumns: ColumnsType<any> = [
    {
      title: 'Timestamp & User',
      key: 'time',
      render: (_, r) => (
        <div>
          <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}
          </div>
          <div className="text-[11px] text-indigo-500">By {r.user?.username || 'Admin'}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag color={t === 'IN' ? 'success' : t === 'OUT' ? 'error' : 'purple'} className="font-bold border-none">{t}</Tag>,
    },
    {
      title: 'Project Site',
      key: 'project',
      render: (_, r) => <span className="text-xs font-semibold">{r.project?.name || 'Central Stock'}</span>,
    },
    {
      title: 'Item Name & SKU',
      key: 'item',
      render: (_, r) => (
        <div>
          <div className="font-bold text-xs">{r.item_type?.name}</div>
          <div className="text-[10px] font-mono text-slate-400">{r.item_type?.code}</div>
        </div>
      ),
    },
    {
      title: 'Quantity Shift',
      key: 'shift',
      render: (_, r) => (
        <span className="font-mono font-bold text-sm">
          {r.quantity} {r.item_type?.unit}
        </span>
      ),
    },
    {
      title: 'Audit Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (n: string) => <span className="text-xs text-slate-500 dark:text-slate-400">{n || 'N/A'}</span>,
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 print:p-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <FileSearchOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Enterprise Reports & Analytics Center
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Generate, filter, print, and export CSV reports for Stock Valuation, Procurement, Material Issues, and Audit Trail
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading}>
              Refresh Data
            </Button>
            <Button icon={<PrinterOutlined />} onClick={handlePrint}>
              Print Report
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCSV}>
              Export CSV Report
            </Button>
          </Space>
        </div>

        {/* Report Selector Tabs */}
        <Card className="shadow-2xl print:shadow-none print:border-none">
          <Tabs
            activeKey={reportType}
            onChange={setReportType}
            items={[
              {
                key: 'stock-summary',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <DatabaseOutlined /> Stock Inventory Report
                  </span>
                ),
              },
              {
                key: 'purchase-orders',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <ShoppingOutlined /> Purchase Orders Report
                  </span>
                ),
              },
              {
                key: 'material-issues',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <FileDoneOutlined /> Material Issues Report
                  </span>
                ),
              },
              {
                key: 'stock-transfers',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <SwapOutlined /> Stock Transfers Report
                  </span>
                ),
              },
              {
                key: 'audit-ledger',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <HistoryOutlined /> Movement Audit Trail
                  </span>
                ),
              },
            ]}
            className="mb-4 print:hidden"
          />

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 print:hidden">
            <Input
              placeholder="Search in report data..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />

            <Select
              placeholder="Filter by Project Site"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              allowClear
              className="w-full"
            >
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </Select.Option>
              ))}
            </Select>

            {reportType === 'stock-summary' && (
              <Select value={healthFilter} onChange={setHealthFilter} className="w-full">
                <Select.Option value="ALL">All Stock Health Levels</Select.Option>
                <Select.Option value="IN_STOCK">🟢 Optimal In Stock</Select.Option>
                <Select.Option value="LOW_STOCK">🟡 Low Stock Warning</Select.Option>
                <Select.Option value="OUT_OF_STOCK">🔴 Out of Stock</Select.Option>
              </Select>
            )}

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
          </div>

          {/* Print Header */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <div className="text-2xl font-bold font-['Outfit']">RAVI INVENTORY CONTROL PORTAL</div>
            <div className="text-sm font-bold uppercase text-indigo-600 mt-1">Official {reportType.replace('-', ' ')} Report</div>
            <div className="text-xs text-gray-500 mt-0.5">Generated on: {new Date().toLocaleString()}</div>
          </div>

          {/* Report Table */}
          <Table
            columns={
              reportType === 'stock-summary'
                ? stockSummaryColumns
                : reportType === 'purchase-orders'
                ? poColumns
                : reportType === 'material-issues'
                ? issueColumns
                : auditColumns
            }
            dataSource={filteredData}
            rowKey="id"
            loading={loading}
            scroll={{ x: 750 }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </main>
    </AppLayout>
  );
};
export default ReportsPage;
