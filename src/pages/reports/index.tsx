import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Tabs,
  Badge,
  Popover,
  Row,
  Col,
  Statistic,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileSearchOutlined,
  DownloadOutlined,
  SearchOutlined,
  ReloadOutlined,

  DatabaseOutlined,
  ShoppingOutlined,
  HistoryOutlined,
  CheckCircleFilled,
  AlertOutlined,
  ExclamationCircleFilled,
  AppstoreOutlined,
  HomeOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { reportApi, projectApi } from '../../services/api';
import type { Project } from '../../types/inventory';
import { AppLayout } from '../../components/layout/AppLayout';

const { RangePicker } = DatePicker;

interface ProcurementItem {
  id: number;
  name: string;
  code: string;
  cat_no?: string;
  make?: string;
  rating?: string;
  unit: string;
  min_quantity: number;
  general_po_qty: number;
  project_po_qty: number;
  total_po_qty: number;
  project_po_breakdown: Array<{
    project_id: number;
    project_name: string;
    project_code: string;
    qty: number;
    po_numbers: string[];
  }>;
  central_warehouse_qty: number;
  dispatched_site_qty: number;
  total_physical_stock: number;
  dispatched_site_breakdown: Array<{
    project_id: number;
    project_name: string;
    project_code: string;
    qty: number;
  }>;
  health_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

interface ProcurementSummary {
  total_items: number;
  total_general_po_qty: number;
  total_project_po_qty: number;
  total_central_stock: number;
  total_dispatched_stock: number;
}

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('procurement-distribution');
  const [procurementData, setProcurementData] = useState<ProcurementItem[]>([]);
  const [procurementSummary, setProcurementSummary] = useState<ProcurementSummary | null>(null);
  const [otherReportData, setOtherReportData] = useState<any[]>([]);
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
      if (searchQuery) params.search = searchQuery;
      if (dateRange) {
        params.startDate = dateRange[0];
        params.endDate = dateRange[1];
      }

      if (reportType === 'procurement-distribution') {
        const res = await reportApi.getProcurementDistribution(params);
        if (res.success && res.report) {
          setProcurementData(res.report.items || []);
          setProcurementSummary(res.report.summary || null);
        }
      } else {
        let res: any;
        switch (reportType) {
          case 'stock-summary':
            res = await reportApi.getStockSummary(params);
            break;
          case 'purchase-orders':
            res = await reportApi.getPurchaseOrders(params);
            break;
          case 'audit-ledger':
            res = await reportApi.getAuditLedger(params);
            break;
          default:
            res = await reportApi.getStockSummary(params);
        }

        if (res.success && res.reports) {
          setOtherReportData(res.reports);
        }
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
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'procurement-distribution') {
      if (procurementData.length === 0) {
        message.warning('No procurement distribution data available to export');
        return;
      }
      headers = [
        'Item Name',
        'Item Code',
        'Cat No',
        'Make',
        'General PO Qty',
        'Project PO Qty',
        'Total PO Purchased Qty',
        'Central Warehouse Stock Qty',
        'Dispatched Site Stock Qty',
        'Total Physical Stock Qty',
        'Stock Health Status',
      ];
      rows = procurementData.map((d) => [
        `"${d.name}"`,
        `"${d.code}"`,
        `"${d.cat_no || ''}"`,
        `"${d.make || ''}"`,
        String(d.general_po_qty),
        String(d.project_po_qty),
        String(d.total_po_qty),
        String(d.central_warehouse_qty),
        String(d.dispatched_site_qty),
        String(d.total_physical_stock),
        `"${d.health_status}"`,
      ]);
    } else if (reportType === 'stock-summary') {
      if (otherReportData.length === 0) {
        message.warning('No data available to export');
        return;
      }
      headers = ['Project Site', 'Item Name', 'Item Code', 'Quantity', 'Unit', 'Min Threshold', 'Stock Status'];
      rows = otherReportData.map((d) => [
        `"${d.project?.name || 'Central Warehouse'}"`,
        `"${d.item_type?.name || ''}"`,
        `"${d.item_type?.code || ''}"`,
        String(d.quantity),
        `"${d.item_type?.unit || ''}"`,
        String(d.min_quantity || 10),
        d.quantity === 0 ? 'OUT OF STOCK' : d.quantity <= (d.min_quantity || 10) ? 'LOW STOCK' : 'IN STOCK',
      ]);
    } else if (reportType === 'purchase-orders') {
      if (otherReportData.length === 0) {
        message.warning('No data available to export');
        return;
      }
      headers = ['PO Number', 'Order Date', 'Supplier', 'Items Count', 'Total Amount', 'Status'];
      rows = otherReportData.map((d) => [
        `"${d.po_number}"`,
        d.order_date ? new Date(d.order_date).toLocaleDateString() : '',
        `"${d.vendor?.name || ''}"`,
        String(d.items?.length || 0),
        String(d.total_amount || 0),
        `"${d.status}"`,
      ]);
    } else {
      if (otherReportData.length === 0) {
        message.warning('No data available to export');
        return;
      }
      headers = ['Timestamp', 'Type', 'Project Site', 'Item Code', 'Item Name', 'Shift Quantity', 'Previous Qty', 'New Qty', 'User', 'Notes'];
      rows = otherReportData.map((d) => [
        d.createdAt ? new Date(d.createdAt).toLocaleString() : '',
        d.type,
        `"${d.project?.name || 'Central Stock'}"`,
        `"${d.item_type?.code || ''}"`,
        `"${d.item_type?.name || ''}"`,
        String(d.quantity),
        String(d.previous_quantity),
        String(d.new_quantity),
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

  // Columns for Procurement Distribution Analytics

  const procurementColumns: ColumnsType<ProcurementItem> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 60,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Item Specifications',
      key: 'item_spec',
      width: 250,
      render: (_, r) => (
        <div>
          <div className="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-['Outfit']">{r.name}</div>
          <div className="flex flex-wrap items-center gap-1 mt-1">
            <Tag className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
              {r.code}
            </Tag>
            {r.cat_no && (
              <Tag color="blue" className="font-mono text-[11px]">
                Cat: {r.cat_no}
              </Tag>
            )}
            {r.make && (
              <Tag color="purple" className="font-mono text-[11px]">
                Make: {r.make}
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'General PO Intent',
      key: 'general_po',
      align: 'center',
      width: 140,
      render: (_, r) => (
        <div>
          <Tag color="cyan" className="font-bold font-mono text-sm px-2.5 py-0.5 border-none">
            {r.general_po_qty} {r.unit}
          </Tag>
          <div className="text-[10px] text-slate-400 mt-0.5">Purchased for General</div>
        </div>
      ),
    },
    {
      title: 'Project PO Intent',
      key: 'project_po',
      align: 'center',
      width: 170,
      render: (_, r) => (
        <div>
          {r.project_po_qty > 0 ? (
            <Popover
              content={
                <div className="p-2 max-w-sm space-y-1.5">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-200 border-b pb-1">
                    PO Purchase Breakdown by Project
                  </div>
                  {r.project_po_breakdown.map((b) => (
                    <div key={b.project_id} className="text-xs flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-1">
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{b.project_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Code: {b.project_code}</div>
                        {b.po_numbers.length > 0 && (
                          <div className="text-[10px] text-indigo-500 font-mono font-semibold">
                            POs: {b.po_numbers.join(', ')}
                          </div>
                        )}
                      </div>
                      <Tag color="orange" className="font-mono font-bold">
                        {b.qty} {r.unit}
                      </Tag>
                    </div>
                  ))}
                </div>
              }
              title={null}
              trigger="hover"
            >
              <Tag color="orange" className="font-bold font-mono text-sm px-2.5 py-0.5 border-none cursor-pointer">
                {r.project_po_qty} {r.unit} ℹ️
              </Tag>
            </Popover>
          ) : (
            <Tag color="default" className="font-mono text-xs">
              0 {r.unit}
            </Tag>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">Purchased for Specific Project</div>
        </div>
      ),
    },
    {
      title: 'Central Warehouse Stock',
      key: 'central_stock',
      align: 'center',
      width: 170,
      render: (_, r) => (
        <div>
          <Tag color="blue" className="font-bold font-mono text-sm px-2.5 py-0.5 border-none">
            {r.central_warehouse_qty} {r.unit}
          </Tag>
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Physical Stock in Main Store</div>
        </div>
      ),
    },
    {
      title: 'Dispatched Site Stock',
      key: 'dispatched_stock',
      align: 'center',
      width: 170,
      render: (_, r) => (
        <div>
          {r.dispatched_site_qty > 0 ? (
            <Popover
              content={
                <div className="p-2 max-w-xs space-y-1.5">
                  <div className="font-bold text-xs text-slate-700 dark:text-slate-200 border-b pb-1">
                    Dispatched Site Locations Breakdown
                  </div>
                  {r.dispatched_site_breakdown.map((b) => (
                    <div key={b.project_id} className="text-xs flex items-center justify-between gap-4">
                      <span>
                        <strong>{b.project_name}</strong> ({b.project_code})
                      </span>
                      <Tag color="purple" className="font-mono font-bold">
                        {b.qty} {r.unit}
                      </Tag>
                    </div>
                  ))}
                </div>
              }
              title={null}
              trigger="hover"
            >
              <Tag color="purple" className="font-bold font-mono text-sm px-2.5 py-0.5 border-none cursor-pointer">
                {r.dispatched_site_qty} {r.unit} ℹ️
              </Tag>
            </Popover>
          ) : (
            <Tag color="default" className="font-mono text-xs">
              0 {r.unit}
            </Tag>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">Assigned/Dispatched to Sites</div>
        </div>
      ),
    },
    {
      title: 'Total Physical Stock',
      key: 'total_stock',
      align: 'center',
      width: 160,
      render: (_, r) => (
        <div>
          <div className="font-mono font-extrabold text-base text-slate-800 dark:text-slate-100">
            {r.total_physical_stock} {r.unit}
          </div>
          <div className="mt-1">
            {r.health_status === 'OUT_OF_STOCK' ? (
              <Tag icon={<ExclamationCircleFilled />} color="error" className="font-bold border-none text-[11px]">
                OUT OF STOCK
              </Tag>
            ) : r.health_status === 'LOW_STOCK' ? (
              <Tag icon={<AlertOutlined />} color="warning" className="font-bold border-none text-[11px]">
                LOW STOCK ({r.min_quantity})
              </Tag>
            ) : (
              <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none text-[11px]">
                IN STOCK
              </Tag>
            )}
          </div>
        </div>
      ),
    },
  ];

  // Stock Summary Columns
  const stockSummaryColumns: ColumnsType<any> = [
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
      title: 'Location / Project Site',
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

  // PO Columns
  const poColumns: ColumnsType<any> = [
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
      title: 'Purchase Intent Location',
      key: 'intent',
      render: (_, r) =>
        r.project ? (
          <Tag color="orange" className="font-bold border-none font-mono">
            {r.project.name} ({r.project.code})
          </Tag>
        ) : (
          <Tag color="cyan" className="font-bold border-none font-mono">
            General Purpose
          </Tag>
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

  // Audit Columns
  const auditColumns: ColumnsType<any> = [
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

  // Client-side filtering logic for real-time search responsiveness across all tabs
  const filteredProcurementData = procurementData.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (item.name || '').toLowerCase();
    const code = (item.code || '').toLowerCase();
    const catNo = (item.cat_no || '').toLowerCase();
    const make = (item.make || '').toLowerCase();
    const rating = (item.rating || '').toLowerCase();
    const unit = (item.unit || '').toLowerCase();

    const matchesProjectBreakdown = item.project_po_breakdown?.some(
      (b) =>
        b.project_name?.toLowerCase().includes(q) ||
        b.project_code?.toLowerCase().includes(q) ||
        b.po_numbers?.some((po) => po.toLowerCase().includes(q))
    );

    const matchesSiteBreakdown = item.dispatched_site_breakdown?.some(
      (b) =>
        b.project_name?.toLowerCase().includes(q) ||
        b.project_code?.toLowerCase().includes(q)
    );

    return (
      name.includes(q) ||
      code.includes(q) ||
      catNo.includes(q) ||
      make.includes(q) ||
      rating.includes(q) ||
      unit.includes(q) ||
      matchesProjectBreakdown ||
      matchesSiteBreakdown
    );
  });

  const filteredOtherReportData = otherReportData.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();

    if (reportType === 'stock-summary') {
      const projName = (item.project?.name || 'Central Warehouse').toLowerCase();
      const projCode = (item.project?.code || '').toLowerCase();
      const itemName = (item.item_type?.name || '').toLowerCase();
      const itemCode = (item.item_type?.code || '').toLowerCase();
      const catNo = (item.item_type?.cat_no || '').toLowerCase();
      const make = (item.item_type?.make || '').toLowerCase();
      const rating = (item.item_type?.rating || '').toLowerCase();
      const fullDesc = (item.item_type?.full_description || '').toLowerCase();
      return (
        projName.includes(q) ||
        projCode.includes(q) ||
        itemName.includes(q) ||
        itemCode.includes(q) ||
        catNo.includes(q) ||
        make.includes(q) ||
        rating.includes(q) ||
        fullDesc.includes(q)
      );
    } else if (reportType === 'purchase-orders') {
      const poNum = (item.po_number || '').toLowerCase();
      const vendorName = (item.vendor?.name || '').toLowerCase();
      const projName = (item.project?.name || '').toLowerCase();
      const projCode = (item.project?.code || '').toLowerCase();
      const status = (item.status || '').toLowerCase();
      const itemMatch = item.items?.some((pi: any) => {
        const iName = (pi.item_type?.name || '').toLowerCase();
        const iCode = (pi.item_type?.code || '').toLowerCase();
        return iName.includes(q) || iCode.includes(q);
      });

      return (
        poNum.includes(q) ||
        vendorName.includes(q) ||
        projName.includes(q) ||
        projCode.includes(q) ||
        status.includes(q) ||
        itemMatch
      );
    } else if (reportType === 'audit-ledger') {
      const type = (item.type || '').toLowerCase();
      const projName = (item.project?.name || '').toLowerCase();
      const itemCode = (item.item_type?.code || '').toLowerCase();
      const itemName = (item.item_type?.name || '').toLowerCase();
      const username = (item.user?.username || '').toLowerCase();
      const notes = (item.notes || '').toLowerCase();
      return (
        type.includes(q) ||
        projName.includes(q) ||
        itemCode.includes(q) ||
        itemName.includes(q) ||
        username.includes(q) ||
        notes.includes(q)
      );
    }

    return true;
  });

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 py-3 sm:py-4 flex flex-col min-h-full print:p-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 mb-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <FileSearchOutlined className="text-xl sm:text-2xl text-indigo-500 shrink-0" />
            <div>
              <h1 className="text-lg sm:text-xl font-bold app-text-main font-['Outfit'] mb-0">
                Stock Procurement & Allocation Analytics
              </h1>
              <p className="text-[11px] sm:text-xs app-text-muted mb-0">
                Track General vs Project PO Purchase Intents, Central Warehouse Physical Stock, and Dispatched Site Locations
              </p>
            </div>
          </div>

          <Space wrap className="justify-start sm:justify-end">
            <Button icon={<ReloadOutlined />} onClick={fetchReportData} loading={loading} size="small">
              Refresh
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleExportCSV} size="small">
              Export CSV
            </Button>
          </Space>

        </div>

        {/* Executive Summary KPI Cards (Visible for Procurement Distribution Tab) */}
        {reportType === 'procurement-distribution' && procurementSummary && (
          <Row gutter={[12, 12]} className="mb-4 print:mb-2">
            <Col xs={12} sm={8} lg={4.8}>
              <Card className="shadow-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
                <Statistic
                  title={<span className="text-xs font-bold text-slate-500 dark:text-slate-400">Total Catalog Items</span>}
                  value={procurementSummary.total_items}
                  prefix={<AppstoreOutlined className="text-indigo-500 mr-1" />}
                  valueStyle={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4.8}>
              <Card className="shadow-md rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/40 dark:bg-cyan-950/20 backdrop-blur-md">
                <Statistic
                  title={<span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">General PO Purchases</span>}
                  value={procurementSummary.total_general_po_qty}
                  prefix={<ShoppingOutlined className="text-cyan-500 mr-1" />}
                  valueStyle={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#0891b2' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4.8}>
              <Card className="shadow-md rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 backdrop-blur-md">
                <Statistic
                  title={<span className="text-xs font-bold text-amber-600 dark:text-amber-400">Project PO Purchases</span>}
                  value={procurementSummary.total_project_po_qty}
                  prefix={<RocketOutlined className="text-amber-500 mr-1" />}
                  valueStyle={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#d97706' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4.8}>
              <Card className="shadow-md rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 backdrop-blur-md">
                <Statistic
                  title={<span className="text-xs font-bold text-blue-600 dark:text-blue-400">Central Main Warehouse</span>}
                  value={procurementSummary.total_central_stock}
                  prefix={<HomeOutlined className="text-blue-500 mr-1" />}
                  valueStyle={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#2563eb' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4.8}>
              <Card className="shadow-md rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 backdrop-blur-md">
                <Statistic
                  title={<span className="text-xs font-bold text-purple-600 dark:text-purple-400">Dispatched Site Stock</span>}
                  value={procurementSummary.total_dispatched_stock}
                  prefix={<DatabaseOutlined className="text-purple-500 mr-1" />}
                  valueStyle={{ fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Outfit', color: '#9333ea' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* Report Selector Tabs */}
        <Card className="shadow-2xl flex-1 flex flex-col print:shadow-none print:border-none">
          <Tabs
            activeKey={reportType}
            onChange={setReportType}
            items={[
              {
                key: 'procurement-distribution',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <ShoppingOutlined /> General vs Project Stock Distribution
                  </span>
                ),
              },
              {
                key: 'stock-summary',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <DatabaseOutlined /> Stock Inventory Locations
                  </span>
                ),
              },
              {
                key: 'purchase-orders',
                label: (
                  <span className="font-bold flex items-center gap-2">
                    <FileSearchOutlined /> Purchase Orders History
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
            className="mb-3 shrink-0 print:hidden"
          />

          {/* Total Records Counter Header */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-200 dark:border-white/10 shrink-0 print:hidden">
            <div className="flex items-center gap-2">
              <Badge count={reportType === 'procurement-distribution' ? filteredProcurementData.length : filteredOtherReportData.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Items: {reportType === 'procurement-distribution' ? filteredProcurementData.length : filteredOtherReportData.length} Entries
                </Tag>
              </Badge>
            </div>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchQuery('');
                setSelectedProjectId(undefined);
                setHealthFilter('ALL');
                setDateRange(null);
              }}
            >
              Reset All Filters
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 shrink-0 print:hidden">
            <Input
              placeholder="Search by Item Name, Code, Cat No, Make..."
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

            {(reportType === 'procurement-distribution' || reportType === 'stock-summary') && (
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

          {/* Table Section */}

          <div className="w-full overflow-x-auto">
            <Table
              columns={
                reportType === 'procurement-distribution'
                  ? procurementColumns
                  : reportType === 'stock-summary'
                  ? stockSummaryColumns
                  : reportType === 'purchase-orders'
                  ? poColumns
                  : auditColumns
              }
              dataSource={reportType === 'procurement-distribution' ? filteredProcurementData : filteredOtherReportData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 800, y: 400 }}
              pagination={{ pageSize: 15, showSizeChanger: true }}
              size="small"
            />
          </div>
        </Card>
      </main>
    </AppLayout>
  );
};
export default ReportsPage;
