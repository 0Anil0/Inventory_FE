import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Row,
  Col,
  Progress,
  Modal,
  Typography,
  message,
} from 'antd';

import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  ShoppingOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PrinterOutlined,
  FilterOutlined,
  SafetyCertificateOutlined,
  PieChartOutlined,
  UnorderedListOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { reportApi, projectApi } from '../../services/api';
import type {
  Project,
  ProjectCostingReport,
  SubProjectCostingItem,
  CategoryCostingItem,
  CostingLedgerItem,
} from '../../types/inventory';
import { AppLayout } from '../../components/layout/AppLayout';

const { Title, Text } = Typography;

// Helper to format Indian Currency
const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

export const ProjectCostingPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<ProjectCostingReport | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal for Print Certificate
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch Projects List for filter
  const fetchProjects = async () => {
    try {
      const res = await projectApi.getAll();
      if (res.success && res.projects) {
        // Filter top-level main projects
        setProjects(res.projects.filter((p: Project) => !p.parent_id));
      }
    } catch (err: any) {
      console.error('Failed to fetch projects list', err);
    }
  };

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getProjectFinancialCosting({
        project_id: selectedProjectId,
        search: searchQuery,
      });
      if (res.success && res.report) {
        setReportData(res.report);
      } else {
        message.error('Failed to load project financial costing data');
      }
    } catch (err: any) {
      message.error(err.message || 'Error fetching costing report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [selectedProjectId]);

  const handleSearch = () => {
    fetchReport();
  };

  const handleReset = () => {
    setSelectedProjectId(undefined);
    setSearchQuery('');
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!reportData || !reportData.itemized_ledger || reportData.itemized_ledger.length === 0) {
      message.warning('No ledger data available to export');
      return;
    }

    const headers = [
      'Assignment No',
      'Site Code',
      'Site Name',
      'Item Code',
      'Item Name',
      'Cat No',
      'Make',
      'Category',
      'Qty Assigned',
      'Base PO Unit Price (INR)',
      'GST %',
      'Effective Net Unit Cost (INR incl GST)',
      'Total Money Invested (INR)',
    ];

    const rows = reportData.itemized_ledger.map((item) => [
      `"${item.assignment_no || ''}"`,
      `"${item.site_code || ''}"`,
      `"${item.site_name || ''}"`,
      `"${item.code || ''}"`,
      `"${item.name.replace(/"/g, '""') || ''}"`,
      `"${item.cat_no || ''}"`,
      `"${item.make || ''}"`,
      `"${item.category || ''}"`,
      item.quantity,
      item.base_unit_price,
      item.gst_percent,
      item.unit_cost,
      item.total_cost,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const projName = reportData.selected_project?.name
      ? reportData.selected_project.name.replace(/\s+/g, '_')
      : 'All_Projects';
    link.setAttribute('download', `Project_Financial_Costing_${projName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Project costing report exported to CSV successfully');
  };

  // Browser Print trigger
  const handlePrintCertificate = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const printWindow = window.open(
      windowUrl,
      `__PrintWindow_${uniqueName}`,
      'width=1000,height=800,left=100,top=100,menubar=yes,toolbar=yes,scrollbars=yes'
    );

    if (!printWindow) {
      message.error('Please allow popups to print the Financial Certificate');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Financial Costing Certificate - ${reportData?.selected_project?.name || 'All Projects'}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
            .header-box { border-bottom: 3px double #0f172a; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
            .company-name { font-size: 24px; font-weight: bold; color: #0f172a; letter-spacing: 0.5px; text-transform: uppercase; }
            .cert-title { font-size: 18px; font-weight: 600; color: #2563eb; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .kpi-row { display: flex; justify-content: space-between; margin-bottom: 25px; gap: 15px; }
            .kpi-card { flex: 1; padding: 15px; background: #f1f5f9; border-radius: 8px; border-left: 4px solid #3b82f6; text-align: center; }
            .kpi-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .kpi-val { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 8px 10px; font-weight: 600; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; color: #334155; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .amount-col { text-align: right; font-family: monospace; font-size: 13px; }
            .total-row td { font-weight: bold; background: #e2e8f0; border-top: 2px solid #0f172a; font-size: 13px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
            .sig-box { text-align: center; width: 30%; border-top: 1px dashed #94a3b8; padding-top: 8px; font-size: 12px; color: #475569; }
            .footer-note { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Columns for Sub-Projects Table
  const subProjectColumns: ColumnsType<SubProjectCostingItem> = [
    {
      title: 'Site Code',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code) => <Tag color="blue">{code || 'MAIN-SITE'}</Tag>,
    },
    {
      title: 'Sub-Project / Site Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a' }}>{name}</Text>
          {record.location && (
            <div style={{ fontSize: 11, color: '#64748b' }}>📍 {record.location}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Items Count',
      dataIndex: 'items_count',
      key: 'items_count',
      width: 120,
      align: 'center',
      render: (count) => <Tag color="purple">{count} Line Items</Tag>,
    },
    {
      title: 'Total Qty Assigned',
      dataIndex: 'total_qty',
      key: 'total_qty',
      width: 150,
      align: 'center',
      render: (qty) => <Text strong>{qty.toLocaleString()} Units</Text>,
    },
    {
      title: 'Money Invested (₹)',
      dataIndex: 'money_invested',
      key: 'money_invested',
      width: 180,
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#7c3aed', fontSize: 15, fontFamily: 'monospace' }}>
          {formatINR(val)}
        </Text>
      ),
    },
    {
      title: 'Share of Project Cost (%)',
      dataIndex: 'percent_share',
      key: 'percent_share',
      width: 220,
      render: (percent) => (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Distribution</Text>
            <Text strong style={{ color: '#2563eb' }}>{percent}%</Text>
          </div>
          <Progress percent={percent} size="small" strokeColor={{ '0%': '#3b82f6', '100%': '#7c3aed' }} showInfo={false} />
        </div>
      ),
    },
  ];

  // Columns for Category Costing Table
  const categoryColumns: ColumnsType<CategoryCostingItem> = [
    {
      title: 'Material Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag color="cyan" style={{ fontSize: 13, padding: '4px 10px' }}>{cat}</Tag>,
    },
    {
      title: 'Items Count',
      dataIndex: 'items_count',
      key: 'items_count',
      width: 120,
      align: 'center',
      render: (val) => <Text>{val}</Text>,
    },
    {
      title: 'Total Quantity',
      dataIndex: 'total_qty',
      key: 'total_qty',
      width: 130,
      align: 'center',
      render: (qty) => <Text strong>{qty.toLocaleString()}</Text>,
    },
    {
      title: 'Total Money Invested (₹)',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 220,
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#4f46e5', fontFamily: 'monospace', fontSize: 15 }}>
          {formatINR(val)}
        </Text>
      ),
    },
    {
      title: 'Category Share',
      dataIndex: 'percent_share',
      key: 'percent_share',
      width: 200,
      render: (percent) => (
        <Progress percent={percent} size="small" strokeColor="#0284c7" format={(p) => `${p}%`} />
      ),
    },
  ];

  // Columns for Itemized Ledger Table
  const itemizedColumns: ColumnsType<CostingLedgerItem> = [
    {
      title: 'Assignment',
      dataIndex: 'assignment_no',
      key: 'assignment_no',
      width: 140,
      render: (no, record) => (
        <div>
          <Tag color="geekblue">{no || 'ASSIGN-01'}</Tag>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{record.site_name}</div>
        </div>
      ),
    },
    {
      title: 'Material Item Details',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <Text strong style={{ color: '#0f172a' }}>{name}</Text>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Code: <Tag color="default" style={{ fontSize: 10 }}>{record.code}</Tag> | Make: {record.make || 'N/A'} | Cat #: {record.cat_no || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      render: (cat) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'center',
      render: (qty, record) => (
        <Text strong>{qty} {record.unit}</Text>
      ),
    },
    {
      title: 'Base PO Price (₹)',
      dataIndex: 'base_unit_price',
      key: 'base_unit_price',
      width: 140,
      align: 'right',
      render: (val) => (
        <Text style={{ fontFamily: 'monospace', color: '#475569' }}>
          {formatINR(val)}
        </Text>
      ),
    },
    {
      title: 'GST %',
      dataIndex: 'gst_percent',
      key: 'gst_percent',
      width: 90,
      align: 'center',
      render: (gst) => <Tag color="orange">+{gst}%</Tag>,
    },
    {
      title: 'Effective Unit Cost (₹ incl GST)',
      dataIndex: 'unit_cost',
      key: 'unit_cost',
      width: 200,
      align: 'right',
      render: (val) => (
        <Text strong style={{ fontFamily: 'monospace', color: '#2563eb', fontSize: 14 }}>
          {formatINR(val)}
        </Text>
      ),
    },
    {
      title: 'Total Money Invested (₹)',
      dataIndex: 'total_cost',
      key: 'total_cost',
      width: 200,
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: 15 }}>
          {formatINR(val)}
        </Text>
      ),
    },
  ];


  const summary = reportData?.summary;

  return (
    <AppLayout>
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        {/* Page Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '28px 32px',
            borderRadius: '16px',
            marginBottom: '24px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
            color: '#ffffff',
          }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                <div
                  style={{
                    background: 'rgba(124, 58, 237, 0.2)',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <DollarOutlined style={{ fontSize: '28px', color: '#a78bfa' }} />
                </div>
                <div>
                  <Title level={2} style={{ color: '#ffffff', margin: 0, fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Project Financial Costing & Investment Analysis
                  </Title>
                  <Text style={{ color: '#94a3b8', fontSize: '14px' }}>
                    Track exact money put into projects based on material items assigned and purchase unit rates
                  </Text>
                </div>
              </div>
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
              <Space wrap size="middle">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchReport}
                  loading={loading}
                  style={{ borderRadius: '8px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  Refresh
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExportCSV}
                  style={{ borderRadius: '8px', background: '#0284c7', color: '#fff', border: 'none' }}
                >
                  Export CSV
                </Button>
                <Button
                  type="primary"
                  icon={<PrinterOutlined />}
                  onClick={() => setIsPrintModalOpen(true)}
                  style={{ borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', border: 'none' }}
                >
                  Print Certificate
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Filter Controls */}
        <Card
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
          }}
          bodyStyle={{ padding: '18px 24px' }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={10}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                <FilterOutlined style={{ marginRight: 6 }} /> SELECT PROJECT / CONTRACT
              </div>
              <Select
                style={{ width: '100%' }}
                placeholder="All Projects (Overall Investment)"
                allowClear
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                size="large"
              >
                {projects.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    📦 {p.name} {p.code ? `(${p.code})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} sm={12} md={10}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                <SearchOutlined style={{ marginRight: 6 }} /> SEARCH MATERIAL ITEMS OR SITES
              </div>
              <Input
                placeholder="Search by Item Code, Name, Make, Cat No, or Sub-Project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
                size="large"
              />
            </Col>
            <Col xs={24} sm={24} md={4} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <Button type="primary" onClick={handleSearch} size="large" style={{ flex: 1, borderRadius: '8px', background: '#0f172a' }}>
                Search
              </Button>
              <Button onClick={handleReset} size="large" style={{ borderRadius: '8px' }}>
                Reset
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Executive KPI Cards */}
        <Row gutter={[20, 20]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={8}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #ddd6fe',
                background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)',
                boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6d28d9', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Total Money Invested (Cost)
                  </Text>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#5b21b6', marginTop: '6px', fontFamily: 'monospace' }}>
                    {formatINR(summary?.total_money_invested || 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Net landed purchase cost (incl. GST & Discounts)
                  </Text>
                </div>
                <div style={{ background: '#ede9fe', padding: '14px', borderRadius: '12px' }}>
                  <BankOutlined style={{ fontSize: '26px', color: '#7c3aed' }} />
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
                background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: '12px', textTransform: 'uppercase', color: '#1d4ed8', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Total Material Qty Assigned
                  </Text>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#1e40af', marginTop: '6px' }}>
                    {(summary?.total_quantity_assigned || 0).toLocaleString()} <span style={{ fontSize: 16, fontWeight: 500 }}>units</span>
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Dispatched across sub-projects
                  </Text>
                </div>
                <div style={{ background: '#dbeafe', padding: '14px', borderRadius: '12px' }}>
                  <ShoppingOutlined style={{ fontSize: '26px', color: '#2563eb' }} />
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={8}>
            <Card
              style={{
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
              bodyStyle={{ padding: '20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: '12px', textTransform: 'uppercase', color: '#475569', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Sub-Project Sites & Line Items
                  </Text>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                    {summary?.total_sub_projects || 0} <span style={{ fontSize: 16, fontWeight: 500 }}>sites</span> ({summary?.total_item_types || 0} items)
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    Active project site allocations
                  </Text>
                </div>
                <div style={{ background: '#e2e8f0', padding: '14px', borderRadius: '12px' }}>
                  <PieChartOutlined style={{ fontSize: '26px', color: '#475569' }} />
                </div>
              </div>
            </Card>
          </Col>
        </Row>


        {/* Sub-Project Site Wise Investment Summary */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PieChartOutlined style={{ color: '#7c3aed' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Sub-Project Site Wise Money Investment Summary</span>
            </div>
          }
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Table
            columns={subProjectColumns}
            dataSource={reportData?.sub_projects_costing || []}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'No sub-project material assignments found' }}
          />
        </Card>

        {/* Material Category Investment Summary */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UnorderedListOutlined style={{ color: '#0284c7' }} />
              <span style={{ fontWeight: 700, fontSize: 16 }}>Material Category Investment Breakdown</span>
            </div>
          }
          style={{
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Table
            columns={categoryColumns}
            dataSource={reportData?.category_costing || []}
            rowKey="category"
            loading={loading}
            pagination={false}
            locale={{ emptyText: 'No material categories found' }}
          />
        </Card>

        {/* Itemized Material Cost Ledger */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <DollarOutlined style={{ color: '#059669' }} />
                <span style={{ fontWeight: 700, fontSize: 16 }}>Itemized Material Cost Ledger (Line-Item Unit Cost Breakdown)</span>
              </div>
            </div>
          }
          style={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <Table
            columns={itemizedColumns}
            dataSource={reportData?.itemized_ledger || []}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} Line Items` }}
            locale={{ emptyText: 'No assigned item cost records found' }}
          />
        </Card>

        {/* PRINT FINANCIAL CERTIFICATE MODAL */}
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SafetyCertificateOutlined style={{ color: '#7c3aed', fontSize: 22 }} />
              <span>Official Project Financial Investment Certificate</span>
            </div>
          }
          open={isPrintModalOpen}

          onCancel={() => setIsPrintModalOpen(false)}
          width={900}
          footer={[
            <Button key="close" onClick={() => setIsPrintModalOpen(false)}>
              Close
            </Button>,
            <Button
              key="print"
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrintCertificate}
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', border: 'none' }}
            >
              Print Official Certificate
            </Button>,
          ]}
        >
          <div ref={printRef} style={{ padding: '20px', background: '#fff' }}>
            <div className="header-box" style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 15, marginBottom: 20 }}>
              <div className="company-name" style={{ fontSize: 22, fontWeight: 'bold', textTransform: 'uppercase', color: '#0f172a' }}>
                RAVI INVENTORY MANAGEMENT SYSTEM
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>OFFICIAL PROJECT FINANCIAL COSTING & CAPITAL INVESTMENT CERTIFICATE</div>
              <div className="cert-title" style={{ fontSize: 16, fontWeight: 600, color: '#2563eb', marginTop: 6 }}>
                Project: {reportData?.selected_project?.name || 'All Active Projects Breakdown'}
              </div>
            </div>

            <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
              <div><strong>Client Name:</strong> {reportData?.selected_project?.client?.name || 'Various Clients'}</div>
              <div><strong>Project Code:</strong> {reportData?.selected_project?.code || 'PRJ-SUMMARY'}</div>
              <div><strong>Location / Region:</strong> {reportData?.selected_project?.location || 'Rajasthan, India'}</div>
              <div><strong>Report Generation Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>

            <div className="kpi-row" style={{ display: 'flex', gap: 15, marginBottom: 20 }}>
              <div className="kpi-card" style={{ flex: 1, padding: 12, background: '#f5f3ff', borderLeft: '4px solid #7c3aed', textAlign: 'center', borderRadius: 6 }}>
                <div className="kpi-label" style={{ fontSize: 10, fontWeight: 'bold', color: '#6d28d9', textTransform: 'uppercase' }}>Total Capital Money Invested (Cost)</div>
                <div className="kpi-val" style={{ fontSize: 18, fontWeight: 'bold', color: '#5b21b6', marginTop: 4, fontFamily: 'monospace' }}>{formatINR(summary?.total_money_invested || 0)}</div>
              </div>
              <div className="kpi-card" style={{ flex: 1, padding: 12, background: '#eff6ff', borderLeft: '4px solid #2563eb', textAlign: 'center', borderRadius: 6 }}>
                <div className="kpi-label" style={{ fontSize: 10, fontWeight: 'bold', color: '#1d4ed8', textTransform: 'uppercase' }}>Total Quantity Assigned</div>
                <div className="kpi-val" style={{ fontSize: 18, fontWeight: 'bold', color: '#1e40af', marginTop: 4 }}>{(summary?.total_quantity_assigned || 0).toLocaleString()} Units</div>
              </div>
            </div>


            <h4 style={{ margin: '15px 0 8px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>Sub-Project Site Wise Capital Investment Summary</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#fff' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Site Code</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Sub-Project / Site Name</th>
                  <th style={{ padding: 6, textAlign: 'center' }}>Total Qty</th>

                  <th style={{ padding: 6, textAlign: 'right' }}>Money Invested (₹)</th>
                  <th style={{ padding: 6, textAlign: 'right' }}>Cost Share %</th>
                </tr>
              </thead>
              <tbody>
                {(reportData?.sub_projects_costing || []).map((sp) => (
                  <tr key={sp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: 6 }}>{sp.code || 'MAIN'}</td>
                    <td style={{ padding: 6 }}>{sp.name}</td>
                    <td style={{ padding: 6, textAlign: 'center' }}>{sp.total_qty}</td>
                    <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{formatINR(sp.money_invested)}</td>
                    <td style={{ padding: 6, textAlign: 'right' }}>{sp.percent_share}%</td>
                  </tr>
                ))}
                <tr style={{ background: '#e2e8f0', fontWeight: 'bold' }}>
                  <td colSpan={3} style={{ padding: 6 }}>TOTAL PROJECT CAPITAL INVESTMENT</td>
                  <td style={{ padding: 6, textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>{formatINR(summary?.total_money_invested || 0)}</td>
                  <td style={{ padding: 6, textAlign: 'right' }}>100.0%</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20 }}>
              <div style={{ textAlign: 'center', width: '28%', borderTop: '1px dashed #94a3b8', paddingTop: 6, fontSize: 11, color: '#475569' }}>
                Prepared By (Inventory Lead)
              </div>
              <div style={{ textAlign: 'center', width: '28%', borderTop: '1px dashed #94a3b8', paddingTop: 6, fontSize: 11, color: '#475569' }}>
                Reviewed By (Finance Manager)
              </div>
              <div style={{ textAlign: 'center', width: '28%', borderTop: '1px dashed #94a3b8', paddingTop: 6, fontSize: 11, color: '#475569' }}>
                Authorized Signatory
              </div>
            </div>

            <div style={{ marginTop: 25, textAlign: 'center', fontSize: 10, color: '#94a3b8', borderTop: '1px solid #cbd5e1', paddingTop: 8 }}>
              This certificate is automatically generated from verified Item Master Purchase Rates & Project Assignment Ledgers.
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
};

export default ProjectCostingPage;
