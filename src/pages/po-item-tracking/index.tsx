import React, { useState, useEffect } from 'react';
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
  Statistic,
  Tooltip,
  Modal,
  Spin,
  Badge,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  ClearOutlined,
  ShoppingOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  InboxOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { AppLayout } from '../../components/layout/AppLayout';
import type {
  POItemTrackRecord,
  POItemTrackingResponse,
  Vendor,
  Project,
  ItemType,
  PurchaseOrder,
} from '../../types/inventory';
import { poApi, vendorApi, projectApi, itemTypeApi } from '../../services/api';

export const POItemTrackingPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<POItemTrackRecord[]>([]);
  const [summary, setSummary] = useState<POItemTrackingResponse['summary']>({
    totalRecords: 0,
    totalOrderedQty: 0,
    totalReceivedQty: 0,
    totalPendingQty: 0,
    totalSpend: 0,
  });

  // Filter state
  const [selectedItemTypeId, setSelectedItemTypeId] = useState<number | undefined>(undefined);
  const [selectedVendorId, setSelectedVendorId] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');

  // Dropdown options state
  const [itemsList, setItemsList] = useState<ItemType[]>([]);
  const [vendorsList, setVendorsList] = useState<Vendor[]>([]);
  const [projectsList, setProjectsList] = useState<Project[]>([]);

  // PO Detail Modal State
  const [poModalVisible, setPoModalVisible] = useState<boolean>(false);
  const [poModalLoading, setPoModalLoading] = useState<boolean>(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch tracking data when filters change
  useEffect(() => {
    fetchTrackingData();
  }, [selectedItemTypeId, selectedVendorId, selectedProjectId, selectedStatus]);

  const fetchFilterOptions = async () => {
    try {
      const [itemRes, vendorRes, projRes] = await Promise.all([
        itemTypeApi.getAll({ limit: 1000 }),
        vendorApi.getAll(),
        projectApi.getAll(),
      ]);
      if (itemRes.success) {
        setItemsList((itemRes as any).items || (itemRes as any).itemTypes || []);
      }
      if (vendorRes.success && vendorRes.vendors) {
        setVendorsList(vendorRes.vendors);
      }
      if (projRes.success && projRes.projects) {
        setProjectsList(projRes.projects);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchTrackingData = async (querySearch?: string) => {
    setLoading(true);
    try {
      const res = await poApi.getItemTracking({
        item_type_id: selectedItemTypeId,
        vendor_id: selectedVendorId,
        project_id: selectedProjectId,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: querySearch !== undefined ? querySearch : searchText,
      });

      if (res.success) {
        setRecords(res.items || []);
        setSummary(
          res.summary || {
            totalRecords: 0,
            totalOrderedQty: 0,
            totalReceivedQty: 0,
            totalPendingQty: 0,
            totalSpend: 0,
          }
        );
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch PO item tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTrackingData(searchText);
  };

  const handleResetFilters = () => {
    setSelectedItemTypeId(undefined);
    setSelectedVendorId(undefined);
    setSelectedProjectId(undefined);
    setSelectedStatus('ALL');
    setSearchText('');
    fetchTrackingData('');
  };

  const handleOpenPOModal = async (poId: number) => {
    setPoModalVisible(true);
    setPoModalLoading(true);
    try {
      const res = await poApi.getById(poId);
      if (res.success && res.purchaseOrder) {
        setSelectedPO(res.purchaseOrder);
      } else {
        message.error('Failed to load PO details');
      }
    } catch (err: any) {
      message.error(err.message || 'Error fetching PO details');
    } finally {
      setPoModalLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (records.length === 0) {
      message.warning('No data available to export');
      return;
    }

    const exportData = records.map((rec) => ({
      'PO Number': rec.po_number,
      'Order Date': rec.order_date ? dayjs(rec.order_date).format('YYYY-MM-DD') : '-',
      'PO Status': rec.po_status,
      'Vendor Name': rec.vendor_name,
      'Project Site': rec.project_name,
      'Item Code': rec.item_code,
      'Item Name': rec.item_name,
      'Cat No': rec.cat_no,
      'Make': rec.make,
      'HSN Code': rec.hsn_code,
      'Unit': rec.unit,
      'Ordered Qty': rec.ordered_qty,
      'Received Qty': rec.received_qty,
      'Pending Qty': rec.pending_qty,
      'Unit Rate (₹)': rec.unit_price,
      'Discount (%)': rec.discount_percent,
      'GST (%)': rec.gst_percent,
      'Tax Amount (₹)': rec.tax_amount,
      'Net Subtotal (₹)': rec.net_subtotal,
      'Total Line Price (₹)': rec.total_price,
      'Created By': rec.created_by,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PO Item History');
    XLSX.writeFile(workbook, `PO_Item_Tracking_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
    message.success('Exported to Excel successfully!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Tag color="green" icon={<CheckCircleOutlined />}>APPROVED</Tag>;
      case 'RECEIVED':
        return <Tag color="purple" icon={<InboxOutlined />}>RECEIVED</Tag>;
      case 'PARTIALLY_RECEIVED':
        return <Tag color="cyan" icon={<InboxOutlined />}>PARTIAL</Tag>;
      case 'PENDING_APPROVAL':
      case 'PENDING':
        return <Tag color="gold" icon={<ClockCircleOutlined />}>PENDING</Tag>;
      case 'REJECTED':
        return <Tag color="red" icon={<CloseCircleOutlined />}>REJECTED</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const columns: ColumnsType<POItemTrackRecord> = [
    {
      title: 'PO # & Date',
      key: 'po_details',
      width: 170,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
            <Button
              type="link"
              className="p-0 font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
              onClick={() => handleOpenPOModal(record.po_id)}
            >
              {record.po_number}
            </Button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {record.order_date ? dayjs(record.order_date).format('DD MMM YYYY') : 'N/A'}
          </div>
          <div className="mt-1">{getStatusBadge(record.po_status)}</div>
        </div>
      ),
    },
    {
      title: 'Item Code & Name',
      key: 'item_details',
      width: 220,
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1.5">
            <Tag color="blue" className="font-mono text-xs font-semibold m-0">
              {record.item_code}
            </Tag>
            <span className="text-xs text-slate-400 font-mono">({record.unit})</span>
          </div>
          <div className="font-medium text-slate-800 dark:text-slate-100 text-sm mt-1 line-clamp-2">
            {record.item_name}
          </div>
        </div>
      ),
    },
    {
      title: 'Cat No / Make / HSN',
      key: 'specs',
      width: 170,
      render: (_, record) => (
        <div className="text-xs space-y-1">
          <div>
            <span className="text-slate-400">Cat No:</span>{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
              {record.cat_no}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Make:</span>{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">{record.make}</span>
          </div>
          <div>
            <span className="text-slate-400">HSN:</span>{' '}
            <Tag color="orange" className="font-mono text-[10px] py-0 px-1 m-0">
              {record.hsn_code}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Vendor & Project',
      key: 'vendor_project',
      width: 200,
      render: (_, record) => (
        <div className="text-xs space-y-1">
          <div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {record.vendor_name}
            </span>
          </div>
          <div>
            <Tag color="geekblue" className="font-mono text-[11px] m-0">
              {record.project_name}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: 'Quantities',
      key: 'quantities',
      width: 160,
      align: 'right',
      render: (_, record) => (
        <div className="text-xs space-y-1 text-right">
          <div>
            <span className="text-slate-400">Ordered:</span>{' '}
            <span className="font-bold text-slate-900 dark:text-white font-mono">
              {record.ordered_qty} {record.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Received:</span>{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {record.received_qty} {record.unit}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Pending:</span>{' '}
            {record.pending_qty > 0 ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">
                {record.pending_qty} {record.unit}
              </span>
            ) : (
              <Tag color="green" className="m-0 text-[10px]">Fully Received</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Unit Rate (₹)',
      key: 'unit_price',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
          ₹{record.unit_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      title: 'Taxes & Disc.',
      key: 'discounts',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div className="text-xs text-right space-y-0.5 font-mono">
          <div>Disc: {record.discount_percent}%</div>
          <div>GST: {record.gst_percent}%</div>
          <div className="text-slate-400 text-[11px]">
            Tax: ₹{record.tax_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>
      ),
    },
    {
      title: 'Net Total (₹)',
      key: 'total_price',
      width: 140,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
          ₹{record.total_price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Tooltip title="View PO Details">
          <Button
            type="text"
            shape="circle"
            icon={<EyeOutlined className="text-indigo-600 hover:text-indigo-800" />}
            onClick={() => handleOpenPOModal(record.po_id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShoppingOutlined className="text-indigo-600 dark:text-indigo-400" />
              PO Item History & Tracker
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track Purchase Orders raised per item across vendors, projects, prices, quantities & fulfillment statuses.
            </p>
          </div>
          <Space wrap className="justify-end">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchTrackingData()}
              loading={loading}
              className="hover:bg-slate-50"
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-xs"
            >
              Export Excel
            </Button>
          </Space>
        </div>

        {/* Metrics Summary Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <Statistic
                title={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Line Items Tracked</span>}
                value={summary.totalRecords}
                prefix={<ShoppingOutlined className="text-indigo-500 mr-2" />}
                valueStyle={{ fontWeight: 700, fontSize: '20px' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <Statistic
                title={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Ordered Quantity</span>}
                value={summary.totalOrderedQty}
                prefix={<InboxOutlined className="text-blue-500 mr-2" />}
                valueStyle={{ fontWeight: 700, fontSize: '20px' }}
              />
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>Received: <strong className="text-emerald-600">{summary.totalReceivedQty}</strong></span>
                <span>Pending: <strong className="text-amber-600">{summary.totalPendingQty}</strong></span>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <Statistic
                title={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Item PO Value (incl. Tax)</span>}
                value={summary.totalSpend}
                precision={2}
                prefix={<DollarOutlined className="text-emerald-500 mr-2" />}
                suffix="₹"
                valueStyle={{ fontWeight: 700, fontSize: '20px', color: '#10b981' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800">
              <Statistic
                title={<span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Fulfillment Qty</span>}
                value={summary.totalPendingQty}
                prefix={<ClockCircleOutlined className="text-amber-500 mr-2" />}
                valueStyle={{
                  fontWeight: 700,
                  fontSize: '20px',
                  color: summary.totalPendingQty > 0 ? '#f59e0b' : '#10b981',
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Filter Bar */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800" bodyStyle={{ padding: '16px' }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} sm={12} md={6} lg={5}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Filter by Item Master:</div>
              <Select
                showSearch
                allowClear
                placeholder="Select Item..."
                className="w-full"
                value={selectedItemTypeId}
                onChange={(val) => setSelectedItemTypeId(val)}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={itemsList.map((item) => ({
                  value: item.id,
                  label: `${item.code} - ${item.name}`,
                }))}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={5}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Filter by Vendor:</div>
              <Select
                showSearch
                allowClear
                placeholder="Select Vendor..."
                className="w-full"
                value={selectedVendorId}
                onChange={(val) => setSelectedVendorId(val)}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={vendorsList.map((v) => ({
                  value: v.id,
                  label: v.name,
                }))}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Filter by Project:</div>
              <Select
                showSearch
                allowClear
                placeholder="Select Project..."
                className="w-full"
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={projectsList.map((p) => ({
                  value: p.id,
                  label: `${p.code} - ${p.name}`,
                }))}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={3}>
              <div className="text-xs font-semibold text-slate-500 mb-1">PO Status:</div>
              <Select
                className="w-full"
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'PENDING_APPROVAL', label: 'Pending' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'PARTIALLY_RECEIVED', label: 'Partial' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={4}>
              <div className="text-xs font-semibold text-slate-500 mb-1">Search Keywords:</div>
              <Input
                placeholder="Cat No, Make, HSN..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />
            </Col>

            <Col xs={24} sm={12} md={6} lg={3} className="flex items-end gap-2 pt-4">
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleSearch}
                className="bg-indigo-600 hover:bg-indigo-500 border-none"
              >
                Apply
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                title="Reset all filters"
              />
            </Col>
          </Row>
        </Card>

        {/* Data Table */}
        <Card
          className="shadow-xs border-slate-200 dark:border-slate-700 dark:bg-slate-800"
          bodyStyle={{ padding: '0px' }}
        >
          <Table
            columns={columns}
            dataSource={records}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1300, y: 'calc(100vh - 430px)' }}
            pagination={{
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} records`,
            }}
            size="middle"
          />
        </Card>

        {/* PO Details Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2 font-bold text-lg text-slate-800 dark:text-slate-100">
              <ShoppingOutlined className="text-indigo-600" />
              Purchase Order Details - {selectedPO?.po_number || `PO-#${selectedPO?.id}`}
            </div>
          }
          open={poModalVisible}
          onCancel={() => setPoModalVisible(false)}
          footer={[
            <Button key="close" type="primary" onClick={() => setPoModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {poModalLoading ? (
            <div className="py-12 text-center">
              <Spin size="large" tip="Loading Purchase Order details..." />
            </div>
          ) : selectedPO ? (
            <div className="space-y-4 pt-2">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="text-xs text-slate-400">Vendor Name</div>
                  <div className="font-semibold text-slate-800 text-sm">{selectedPO.vendor?.name || 'N/A'}</div>
                </Col>
                <Col span={12}>
                  <div className="text-xs text-slate-400">Project Site</div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {selectedPO.project ? `${selectedPO.project.code} - ${selectedPO.project.name}` : 'General Stock'}
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400">Order Date</div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {selectedPO.order_date ? dayjs(selectedPO.order_date).format('DD MMM YYYY') : '-'}
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400">Expected Delivery</div>
                  <div className="font-semibold text-slate-800 text-sm">
                    {selectedPO.expected_date ? dayjs(selectedPO.expected_date).format('DD MMM YYYY') : '-'}
                  </div>
                </Col>
                <Col span={8}>
                  <div className="text-xs text-slate-400">PO Status</div>
                  <div className="mt-0.5">{getStatusBadge(selectedPO.status || 'PENDING')}</div>
                </Col>
              </Row>

              <div className="border-t border-slate-200 pt-3">
                <div className="font-semibold text-sm text-slate-700 mb-2">PO Line Items</div>
                <Table
                  dataSource={selectedPO.items || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Item Code & Name',
                      key: 'item',
                      render: (_, item) => (
                        <div>
                          <div className="font-semibold text-xs text-indigo-600">{item.item_type?.code || 'N/A'}</div>
                          <div className="text-xs">{item.item_type?.name || 'N/A'}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Cat No / Make',
                      key: 'cat',
                      render: (_, item) => (
                        <div className="text-xs">
                          <div>{item.cat_no || item.item_type?.cat_no || '-'}</div>
                          <div className="text-slate-400">{item.make || item.item_type?.make || '-'}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'HSN',
                      dataIndex: 'hsn_code',
                      key: 'hsn',
                      render: (val, item) => (
                        <Tag color="orange" className="text-[10px] m-0">
                          {val || item.item_type?.hsn_code || '-'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Qty',
                      dataIndex: 'ordered_qty',
                      key: 'qty',
                      align: 'right',
                      render: (val, item) => (
                        <span className="font-mono font-bold text-xs">{val} {item.item_type?.unit || 'PCS'}</span>
                      ),
                    },
                    {
                      title: 'Unit Rate',
                      dataIndex: 'unit_price',
                      key: 'rate',
                      align: 'right',
                      render: (val) => <span className="font-mono text-xs">₹{Number(val || 0).toLocaleString('en-IN')}</span>,
                    },
                    {
                      title: 'Total',
                      dataIndex: 'total_price',
                      key: 'total',
                      align: 'right',
                      render: (val) => (
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          ₹{Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400">No PO data found</div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
};
