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
  Form,
  InputNumber,
  DatePicker,
  Popconfirm,
  Badge,
  message,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  FileExcelOutlined,
  ClearOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ShoppingCartOutlined,
  EyeOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { AppLayout } from '../../components/layout/AppLayout';
import type {
  PurchaseRequisition,
  Project,
  ItemType,
  Vendor,
  TermsAndConditions,
} from '../../types/inventory';
import { prApi, projectApi, itemTypeApi, vendorApi, termsApi } from '../../services/api';

export const PurchaseRequisitionsPage: React.FC = () => {
  const [prList, setPrList] = useState<PurchaseRequisition[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [terms, setTerms] = useState<TermsAndConditions[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<number | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState<boolean>(false);

  const [selectedPR, setSelectedPR] = useState<PurchaseRequisition | null>(null);

  // Form instances
  const [createForm] = Form.useForm();
  const [convertForm] = Form.useForm();

  // Temporary Items State for Create PR Modal
  const [createItems, setCreateItems] = useState<
    Array<{
      item_type_id: number;
      cat_no?: string;
      make?: string;
      hsn_code?: string;
      requested_qty: number;
      estimated_unit_price: number;
      notes?: string;
    }>
  >([]);

  // Review & Qty State for Review Modal
  const [reviewItems, setReviewItems] = useState<
    Array<{
      id: number;
      item_name: string;
      cat_no: string;
      requested_qty: number;
      central_stock: number;
      project_stock: number;
      allowed_po_qty: number;
      notes?: string;
    }>
  >([]);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // State for PO Conversion Form Items
  const [poConvertItems, setPoConvertItems] = useState<
    Array<{
      pr_item_id: number;
      item_type_id: number;
      item_name: string;
      cat_no: string;
      make: string;
      hsn_code: string;
      requested_qty: number;
      ordered_qty: number;
      unit_price: number;
      discount_percent: number;
      gst_percent: number;
    }>
  >([]);

  // Screen Width state for responsive table scroll
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPRs = async () => {
    setLoading(true);
    try {
      const res = await prApi.getAll({
        project_id: selectedProject,
        status: selectedStatus,
        priority: selectedPriority,
        search: searchQuery,
      });
      if (res.success) {
        setPrList(res.items || []);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch Purchase Requisitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [projRes, itemRes, vendorRes, termsRes] = await Promise.all([
        projectApi.getAll(),
        itemTypeApi.getAll({ limit: 500 }),
        vendorApi.getAll(),
        termsApi.getAll(),
      ]);
      if (projRes.success) setProjects(projRes.projects || []);
      if (itemRes.items) setItemTypes(itemRes.items || []);
      if (vendorRes.success) setVendors(vendorRes.vendors || []);
      if (termsRes.success) setTerms(termsRes.templates || []);
    } catch (err: any) {
      console.error('Failed to load dropdown master data', err);
    }
  };

  useEffect(() => {
    fetchPRs();
  }, [selectedProject, selectedStatus, selectedPriority]);

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Summary Metrics
  const totalPRs = prList.length;
  const pendingCount = prList.filter((p) => p.status === 'PENDING_APPROVAL').length;
  const approvedCount = prList.filter((p) => p.status === 'APPROVED' || p.status === 'PARTIALLY_APPROVED').length;
  const convertedCount = prList.filter((p) => p.status === 'PO_CREATED').length;

  // Handlers for Creating PR
  const handleAddItemToCreate = () => {
    setCreateItems((prev) => [
      ...prev,
      { item_type_id: 0, requested_qty: 1, estimated_unit_price: 0 },
    ]);
  };

  const handleRemoveItemFromCreate = (index: number) => {
    setCreateItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePRSubmit = async () => {
    try {
      const values = await createForm.validateFields();
      if (createItems.length === 0) {
        message.warning('Please add at least one line item to the requisition!');
        return;
      }
      const invalidItem = createItems.find((i) => !i.item_type_id || i.requested_qty <= 0);
      if (invalidItem) {
        message.warning('Please select valid item types and quantities (> 0)!');
        return;
      }

      const payload = {
        pr_number: values.pr_number,
        project_id: values.project_id || null,
        priority: values.priority || 'MEDIUM',
        required_date: values.required_date ? values.required_date.format('YYYY-MM-DD') : undefined,
        notes: values.notes,
        items: createItems,
      };

      const res = await prApi.create(payload);
      if (res.success) {
        message.success(res.message || 'Purchase Requisition submitted successfully!');
        setIsCreateModalOpen(false);
        createForm.resetFields();
        setCreateItems([]);
        fetchPRs();
      }
    } catch (err: any) {
      if (err.message) message.error(err.message);
    }
  };

  // Handler for Opening Review Modal (Store/Inventory Manager)
  const handleOpenReview = async (prId: number) => {
    try {
      const res = await prApi.getById(prId);
      if (res.success && res.requisition) {
        setSelectedPR(res.requisition);
        const mappedItems = (res.requisition.items || []).map((item) => ({
          id: item.id,
          item_name: item.item_type?.name || 'N/A',
          cat_no: item.cat_no || item.item_type?.cat_no || '-',
          requested_qty: Number(item.requested_qty || 0),
          central_stock: Number(item.central_stock || 0),
          project_stock: Number(item.project_stock || 0),
          allowed_po_qty: item.allowed_po_qty !== null && item.allowed_po_qty !== undefined ? Number(item.allowed_po_qty) : Number(item.requested_qty || 0),
          notes: item.notes || '',
        }));
        setReviewItems(mappedItems);
        setReviewStatus('APPROVED');
        setReviewNotes(res.requisition.notes || '');
        setIsReviewModalOpen(true);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load PR details');
    }
  };

  const handleSaveReview = async () => {
    if (!selectedPR) return;
    try {
      const payload = {
        status: reviewStatus,
        notes: reviewNotes,
        items: reviewItems.map((ri) => ({
          id: ri.id,
          allowed_po_qty: ri.allowed_po_qty,
          notes: ri.notes,
        })),
      };
      const res = await prApi.reviewAndApprove(selectedPR.id, payload);
      if (res.success) {
        message.success('Purchase Requisition review completed!');
        setIsReviewModalOpen(false);
        fetchPRs();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to complete PR review');
    }
  };

  // Handler for Convert to PO Modal
  const handleOpenConvert = async (prId: number) => {
    try {
      const res = await prApi.getById(prId);
      if (res.success && res.requisition) {
        const pr = res.requisition;
        setSelectedPR(pr);
        convertForm.setFieldsValue({
          pr_number_display: pr.pr_number,
          order_date: dayjs(),
          notes: `Generated from PR ${pr.pr_number}`,
        });

        const mappedItems = (pr.items || []).map((item) => ({
          pr_item_id: item.id,
          item_type_id: item.item_type_id,
          item_name: item.item_type?.name || 'N/A',
          cat_no: item.cat_no || item.item_type?.cat_no || '-',
          make: item.make || item.item_type?.make || '-',
          hsn_code: item.hsn_code || item.item_type?.hsn_code || '-',
          requested_qty: Number(item.requested_qty || 0),
          ordered_qty: item.allowed_po_qty !== null && item.allowed_po_qty !== undefined ? Number(item.allowed_po_qty) : Number(item.requested_qty || 0),
          unit_price: Number(item.item_type?.unit_rate || item.item_type?.base_price || item.estimated_unit_price || 0),
          discount_percent: 0,
          gst_percent: 18,
        }));

        setPoConvertItems(mappedItems);
        setIsConvertModalOpen(true);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load PR details for PO creation');
    }
  };

  const handleConvertPOSubmit = async () => {
    if (!selectedPR) return;
    try {
      const values = await convertForm.validateFields();
      if (poConvertItems.length === 0) {
        message.warning('No items in Purchase Order!');
        return;
      }

      const itemsPayload = poConvertItems.map((i) => ({
        pr_item_id: i.pr_item_id,
        item_type_id: i.item_type_id,
        ordered_qty: i.ordered_qty,
        unit_price: i.unit_price,
        discount_percent: i.discount_percent,
        gst_percent: i.gst_percent,
        cat_no: i.cat_no || undefined,
        make: i.make || undefined,
        hsn_code: i.hsn_code || undefined,
      }));

      const payload = {
        vendor_id: values.vendor_id,
        terms_and_conditions_id: values.terms_and_conditions_id,
        order_date: values.order_date ? values.order_date.format('YYYY-MM-DD') : undefined,
        expected_date: values.expected_date ? values.expected_date.format('YYYY-MM-DD') : undefined,
        notes: values.notes || `Generated from PR ${selectedPR.pr_number}`,
        items: itemsPayload,
      };

      const res = await prApi.convertToPO(selectedPR.id, payload);
      if (res.success) {
        message.success(res.message || 'Successfully created Purchase Order!');
        setIsConvertModalOpen(false);
        fetchPRs();
      }
    } catch (err: any) {
      message.error(err.message || 'PO creation failed');
    }
  };

  const handleDeletePR = async (prId: number) => {
    try {
      const res = await prApi.delete(prId);
      if (res.success) {
        message.success('Purchase Requisition deleted');
        fetchPRs();
      }
    } catch (err: any) {
      message.error(err.message || 'Delete failed');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (prList.length === 0) {
      message.warning('No PR records available to export');
      return;
    }
    const data = prList.map((pr) => ({
      'PR Number': pr.pr_number,
      Project: pr.project ? `${pr.project.code} - ${pr.project.name}` : 'General Stock',
      Status: pr.status,
      Priority: pr.priority,
      'Requested By': pr.requested_by_user?.username || 'System',
      'Required Date': pr.required_date ? dayjs(pr.required_date).format('DD/MM/YYYY') : 'N/A',
      'Items Count': pr.items?.length || 0,
      Notes: pr.notes || '',
      'Created At': dayjs(pr.createdAt).format('DD/MM/YYYY HH:mm'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Requisitions');
    XLSX.writeFile(wb, `PR_Report_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Tag color="warning" icon={<ClockCircleOutlined />}>Pending Review</Tag>;
      case 'APPROVED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Approved for PO</Tag>;
      case 'PARTIALLY_APPROVED':
        return <Tag color="processing" icon={<CheckCircleOutlined />}>Partial Approved</Tag>;
      case 'PO_CREATED':
        return <Tag color="purple" icon={<ShoppingCartOutlined />}>Converted to PO</Tag>;
      case 'REJECTED':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Rejected</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Tag color="magenta" className="font-bold">URGENT</Tag>;
      case 'HIGH':
        return <Tag color="red">HIGH</Tag>;
      case 'MEDIUM':
        return <Tag color="orange">MEDIUM</Tag>;
      default:
        return <Tag color="blue">LOW</Tag>;
    }
  };

  const columns: ColumnsType<PurchaseRequisition> = [
    {
      title: 'PR Number',
      dataIndex: 'pr_number',
      key: 'pr_number',
      width: 140,
      render: (val, record) => (
        <div>
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{val}</span>
          <div className="text-[11px] text-slate-400">
            {dayjs(record.createdAt).format('DD MMM YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      width: 220,
      render: (proj) =>
        proj ? (
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {proj.code} - {proj.name}
          </span>
        ) : (
          <Tag color="cyan">General / Central Warehouse</Tag>
        ),
    },
    {
      title: 'Created By',
      key: 'created_by',
      width: 140,
      render: (_, record) => (
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {record.created_by_user?.username || record.requested_by_user?.username || 'System User'}
        </span>
      ),
    },
    {
      title: 'Approved By',
      key: 'approved_by',
      width: 140,
      render: (_, record) => {
        const approver = record.approved_by_user?.username || record.reviewed_by_user?.username;
        if (approver && (record.status === 'APPROVED' || record.status === 'PARTIALLY_APPROVED' || record.status === 'PO_CREATED')) {
          return (
            <div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{approver}</span>
              {record.approved_at && (
                <div className="text-[10px] text-slate-400">{dayjs(record.approved_at).format('DD/MM/YY HH:mm')}</div>
              )}
            </div>
          );
        }
        return <span className="text-slate-400 text-xs">-</span>;
      },
    },
    {
      title: 'Rejected By',
      key: 'rejected_by',
      width: 140,
      render: (_, record) => {
        const rejector = record.rejected_by_user?.username || record.reviewed_by_user?.username;
        if (record.status === 'REJECTED') {
          return (
            <div>
              <span className="font-semibold text-red-600 dark:text-red-400">{rejector || 'Reviewer'}</span>
              {record.rejected_at && (
                <div className="text-[10px] text-slate-400">{dayjs(record.rejected_at).format('DD/MM/YY HH:mm')}</div>
              )}
            </div>
          );
        }
        return <span className="text-slate-400 text-xs">-</span>;
      },
    },
    {
      title: 'Required Date',
      dataIndex: 'required_date',
      key: 'required_date',
      width: 120,
      render: (val) => (val ? dayjs(val).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (prio) => getPriorityBadge(prio),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 160,
      render: (st) => getStatusBadge(st),
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      width: 90,
      align: 'center',
      render: (items) => <Badge count={items?.length || 0} overflowCount={999} showZero color="#6366f1" />,
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right',
      width: 170,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View PR Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined className="text-indigo-600" />}
              onClick={async () => {
                const res = await prApi.getById(record.id);
                if (res.success) {
                  setSelectedPR(res.requisition);
                  setIsDetailModalOpen(true);
                }
              }}
            />
          </Tooltip>

          {/* Inventory Manager Review Action */}
          <Tooltip title="Review Stock & Approve Allowed Qty">
            <Button
              type="text"
              size="small"
              icon={<SafetyCertificateOutlined className="text-amber-600 hover:text-amber-700" />}
              onClick={() => handleOpenReview(record.id)}
            />
          </Tooltip>

          {/* Convert to PO Action */}
          {(record.status === 'APPROVED' || record.status === 'PARTIALLY_APPROVED' || record.status === 'PENDING_APPROVAL') && (
            <Tooltip title="Convert PR to PO">
              <Button
                type="primary"
                size="small"
                icon={<ShoppingCartOutlined />}
                className="bg-emerald-600 hover:bg-emerald-700 text-[11px]"
                onClick={() => handleOpenConvert(record.id)}
              >
                PO
              </Button>
            </Tooltip>
          )}

          {record.status === 'PENDING_APPROVAL' && (
            <Popconfirm
              title="Delete Requisition"
              description="Are you sure you want to delete this PR?"
              onConfirm={() => handleDeletePR(record.id)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <FileTextOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Purchase Requisitions (PR)
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Submit item purchase requests, verify inventory warehouse stock & convert approved PRs directly into POs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              className="bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
            >
              Export Excel
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                createForm.resetFields();
                setCreateItems([]);
                setIsCreateModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
            >
              Create New PR
            </Button>
          </div>
        </div>

        {/* Metric Cards Summary */}
        <Row gutter={[12, 12]} className="shrink-0">
          <Col xs={12} sm={6} md={6}>
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={<span className="text-xs text-slate-500 font-medium">Total PRs Raised</span>}
                value={totalPRs}
                prefix={<FileTextOutlined className="text-indigo-500 mr-1.5" />}
                valueStyle={{ fontSize: '1.4rem', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Card className="shadow-sm border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={<span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Pending Review</span>}
                value={pendingCount}
                prefix={<ClockCircleOutlined className="text-amber-500 mr-1.5" />}
                valueStyle={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Card className="shadow-sm border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={<span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Approved for PO</span>}
                value={approvedCount}
                prefix={<CheckCircleOutlined className="text-emerald-500 mr-1.5" />}
                valueStyle={{ fontSize: '1.4rem', fontWeight: 700, color: '#059669' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Card className="shadow-sm border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20" bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title={<span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Converted to PO</span>}
                value={convertedCount}
                prefix={<ShoppingCartOutlined className="text-purple-500 mr-1.5" />}
                valueStyle={{ fontSize: '1.4rem', fontWeight: 700, color: '#7c3aed' }}
              />
            </Card>
          </Col>
        </Row>

        {/* Search & Filter Bar */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 shrink-0" bodyStyle={{ padding: '12px 16px' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <Input
                placeholder="Search PR Number or Notes..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onPressEnter={fetchPRs}
                allowClear
                className="w-full sm:w-64"
              />
              <Select
                placeholder="Select Project"
                value={selectedProject}
                onChange={(val) => setSelectedProject(val)}
                allowClear
                className="w-full sm:w-56"
              >
                {projects.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </Select.Option>
                ))}
              </Select>

              <Select
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                className="w-40"
              >
                <Select.Option value="ALL">All Statuses</Select.Option>
                <Select.Option value="PENDING_APPROVAL">Pending Review</Select.Option>
                <Select.Option value="APPROVED">Approved for PO</Select.Option>
                <Select.Option value="PARTIALLY_APPROVED">Partially Approved</Select.Option>
                <Select.Option value="PO_CREATED">Converted to PO</Select.Option>
                <Select.Option value="REJECTED">Rejected</Select.Option>
              </Select>

              <Select
                value={selectedPriority}
                onChange={(val) => setSelectedPriority(val)}
                className="w-36"
              >
                <Select.Option value="ALL">All Priorities</Select.Option>
                <Select.Option value="LOW">Low</Select.Option>
                <Select.Option value="MEDIUM">Medium</Select.Option>
                <Select.Option value="HIGH">High</Select.Option>
                <Select.Option value="URGENT">Urgent</Select.Option>
              </Select>
            </div>

            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                setSearchQuery('');
                setSelectedProject(undefined);
                setSelectedStatus('ALL');
                setSelectedPriority('ALL');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>

        {/* PR List Table */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 flex-1 min-h-0 flex flex-col overflow-hidden" bodyStyle={{ padding: '0px' }}>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-between">
            <Table
              columns={columns}
              dataSource={prList}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 1200,
                y: isDesktop ? 'calc(100vh - 490px)' : undefined,
              }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} PRs`,
              }}
            />
          </div>
        </Card>

        {/* CREATE NEW PR MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold border-b pb-3">
              <PlusOutlined className="text-indigo-600" /> Create Purchase Requisition (PR)
            </div>
          }
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={handleCreatePRSubmit}
          width={800}
          okText="Submit PR"
          centered
        >
          <Form form={createForm} layout="vertical" className="pt-2">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="pr_number" label="PR Number (Auto-generated if left empty)">
                  <Input placeholder="e.g. PR/26-27/001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="project_id" label="Target Project">
                  <Select placeholder="Select Project (or leave for General Stock)" allowClear>
                    {projects.map((p) => (
                      <Select.Option key={p.id} value={p.id}>
                        {p.code} - {p.name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="priority" label="Priority" initialValue="MEDIUM">
                  <Select>
                    <Select.Option value="LOW">Low</Select.Option>
                    <Select.Option value="MEDIUM">Medium</Select.Option>
                    <Select.Option value="HIGH">High</Select.Option>
                    <Select.Option value="URGENT">Urgent</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="required_date" label="Required Date">
                  <DatePicker className="w-full" format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="notes" label="Justification / Notes">
              <Input.TextArea rows={2} placeholder="Explain why these items are required..." />
            </Form.Item>

            <Divider className="my-3 font-semibold text-slate-700">Requisition Items List</Divider>

            <div className="max-h-60 overflow-y-auto space-y-3 mb-3 pr-1">
              {createItems.map((item, idx) => (
                <Card key={idx} size="small" className="bg-slate-50 dark:bg-slate-900 border-slate-200">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Select Item Master</span>
                      <Select
                        showSearch
                        placeholder="Choose Item..."
                        value={item.item_type_id || undefined}
                        onChange={(val) => {
                          const selected = itemTypes.find((it) => it.id === val);
                          setCreateItems((prev) =>
                            prev.map((it, i) =>
                              i === idx
                                ? {
                                    ...it,
                                    item_type_id: val,
                                    cat_no: selected?.cat_no || undefined,
                                    make: selected?.make || undefined,
                                    hsn_code: selected?.hsn_code || undefined,
                                    estimated_unit_price: selected?.unit_rate || selected?.base_price || 0,
                                  }
                                : it
                            )
                          );
                        }}
                        className="w-full"
                        optionFilterProp="children"
                      >
                        {itemTypes.map((it) => (
                          <Select.Option key={it.id} value={it.id}>
                            {it.code} - {it.name} ({it.cat_no || '-'})
                          </Select.Option>
                        ))}
                      </Select>
                    </div>

                    <div className="w-28">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Req Qty</span>
                      <InputNumber
                        min={1}
                        value={item.requested_qty}
                        onChange={(val) =>
                          setCreateItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, requested_qty: val || 1 } : it))
                          )
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="w-32">
                      <span className="text-xs font-semibold text-slate-500 block mb-1">Est. Rate (₹)</span>
                      <InputNumber
                        min={0}
                        value={item.estimated_unit_price}
                        onChange={(val) =>
                          setCreateItems((prev) =>
                            prev.map((it, i) => (i === idx ? { ...it, estimated_unit_price: val || 0 } : it))
                          )
                        }
                        className="w-full"
                      />
                    </div>

                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => handleRemoveItemFromCreate(idx)} />
                  </div>
                </Card>
              ))}
            </div>

            <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddItemToCreate} block>
              Add Item to Requisition
            </Button>
          </Form>
        </Modal>

        {/* INVENTORY MANAGER REVIEW & ALLOWED QTY MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold border-b pb-3">
              <SafetyCertificateOutlined className="text-amber-600" /> Review Inventory Stock & Approve Allowed Qty
            </div>
          }
          open={isReviewModalOpen}
          onCancel={() => setIsReviewModalOpen(false)}
          onOk={handleSaveReview}
          width={900}
          okText="Save Review & Update Allowed Qty"
          centered
        >
          {selectedPR && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg flex flex-wrap justify-between text-xs">
                <div><strong>PR Number:</strong> <span className="font-mono text-indigo-600">{selectedPR.pr_number}</span></div>
                <div><strong>Project:</strong> {selectedPR.project ? `${selectedPR.project.code} - ${selectedPR.project.name}` : 'General Stock'}</div>
                <div><strong>Requester:</strong> {selectedPR.requested_by_user?.username || 'System'}</div>
                <div><strong>Priority:</strong> {getPriorityBadge(selectedPR.priority)}</div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-semibold text-sm">Review Status Decision:</span>
                <Select
                  value={reviewStatus}
                  onChange={(val) => setReviewStatus(val as any)}
                  className="w-56"
                >
                  <Select.Option value="APPROVED">Approve All (Ready for PO)</Select.Option>
                  <Select.Option value="PARTIALLY_APPROVED">Partially Approve Qty</Select.Option>
                  <Select.Option value="REJECTED">Reject Requisition</Select.Option>
                </Select>
              </div>

              <Divider className="my-2">Line Items Stock Review</Divider>

              <Table
                dataSource={reviewItems}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Item Name', dataIndex: 'item_name', key: 'item_name' },
                  { title: 'Cat No', dataIndex: 'cat_no', key: 'cat_no', width: 110 },
                  {
                    title: 'Req Qty',
                    dataIndex: 'requested_qty',
                    key: 'requested_qty',
                    width: 90,
                    align: 'center',
                    render: (val) => <span className="font-bold text-indigo-600">{val}</span>,
                  },
                  {
                    title: 'Central Stock',
                    dataIndex: 'central_stock',
                    key: 'central_stock',
                    width: 110,
                    align: 'center',
                    render: (val) => (
                      <Tag color={val > 0 ? 'cyan' : 'default'}>{val} in Central</Tag>
                    ),
                  },
                  {
                    title: 'Project Stock',
                    dataIndex: 'project_stock',
                    key: 'project_stock',
                    width: 110,
                    align: 'center',
                    render: (val) => (
                      <Tag color={val > 0 ? 'blue' : 'default'}>{val} at Site</Tag>
                    ),
                  },
                  {
                    title: 'Allowed Qty for PO',
                    dataIndex: 'allowed_po_qty',
                    key: 'allowed_po_qty',
                    width: 140,
                    render: (val, _, idx) => (
                      <InputNumber
                        min={0}
                        value={val}
                        onChange={(newVal) =>
                          setReviewItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, allowed_po_qty: newVal || 0 } : item))
                          )
                        }
                        className="w-full font-bold border-amber-400"
                      />
                    ),
                  },
                ]}
              />

              <Input.TextArea
                rows={2}
                placeholder="Manager review notes or stock justification..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          )}
        </Modal>

        {/* CONVERT PR TO PO MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold border-b pb-3">
              <ShoppingCartOutlined className="text-emerald-600" /> Generate Purchase Order (PO) from Requisition
            </div>
          }
          open={isConvertModalOpen}
          onCancel={() => setIsConvertModalOpen(false)}
          onOk={handleConvertPOSubmit}
          width={900}
          okText="Submit & Generate Purchase Order"
          centered
        >
          {selectedPR && (
            <Form form={convertForm} layout="vertical" className="pt-2">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="pr_number_display" label="Source PR Number (Read-Only)">
                    <Input
                      disabled
                      readOnly
                      className="font-mono font-bold text-indigo-700 bg-slate-100 dark:bg-slate-800"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Target Project Reference">
                    <Input
                      disabled
                      readOnly
                      value={
                        selectedPR.project
                          ? `${selectedPR.project.code} - ${selectedPR.project.name}`
                          : 'General / Central Warehouse Stock'
                      }
                      className="font-medium bg-slate-100 dark:bg-slate-800"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="vendor_id"
                    label="Select Vendor"
                    rules={[{ required: true, message: 'Please select a vendor for this PO' }]}
                  >
                    <Select placeholder="Choose Vendor...">
                      {vendors.map((v) => (
                        <Select.Option key={v.id} value={v.id}>
                          {v.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="terms_and_conditions_id" label="Terms & Conditions Template">
                    <Select placeholder="Select Terms Template..." allowClear>
                      {terms.map((t) => (
                        <Select.Option key={t.id} value={t.id}>
                          {t.title}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="order_date" label="PO Order Date" initialValue={dayjs()}>
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="expected_date" label="Expected Delivery Date">
                    <DatePicker className="w-full" format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider className="my-2 font-semibold text-slate-700">Line Items to Include in Purchase Order</Divider>

              <Table
                dataSource={poConvertItems}
                rowKey="pr_item_id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Item Name & Specs',
                    dataIndex: 'item_name',
                    key: 'item_name',
                    render: (name, record) => (
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{name}</div>
                        <div className="text-[11px] text-slate-400">
                          Cat: {record.cat_no} | Make: {record.make}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Req Qty',
                    dataIndex: 'requested_qty',
                    key: 'requested_qty',
                    width: 80,
                    align: 'center',
                    render: (val) => <Tag color="blue" className="font-bold">{val}</Tag>,
                  },
                  {
                    title: 'PO Order Qty',
                    dataIndex: 'ordered_qty',
                    key: 'ordered_qty',
                    width: 110,
                    render: (val, _, idx) => (
                      <InputNumber
                        min={1}
                        value={val}
                        onChange={(newVal) =>
                          setPoConvertItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, ordered_qty: newVal || 1 } : item))
                          )
                        }
                        className="w-full font-bold border-emerald-500"
                      />
                    ),
                  },
                  {
                    title: 'Unit Rate (₹)',
                    dataIndex: 'unit_price',
                    key: 'unit_price',
                    width: 110,
                    render: (val, _, idx) => (
                      <InputNumber
                        min={0}
                        value={val}
                        onChange={(newVal) =>
                          setPoConvertItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, unit_price: newVal || 0 } : item))
                          )
                        }
                        className="w-full"
                      />
                    ),
                  },
                  {
                    title: 'Disc %',
                    dataIndex: 'discount_percent',
                    key: 'discount_percent',
                    width: 80,
                    render: (val, _, idx) => (
                      <InputNumber
                        min={0}
                        max={100}
                        value={val}
                        onChange={(newVal) =>
                          setPoConvertItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, discount_percent: newVal || 0 } : item))
                          )
                        }
                        className="w-full text-xs"
                      />
                    ),
                  },
                  {
                    title: 'GST %',
                    dataIndex: 'gst_percent',
                    key: 'gst_percent',
                    width: 85,
                    render: (val, _, idx) => (
                      <Select
                        value={val}
                        onChange={(newVal) =>
                          setPoConvertItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, gst_percent: newVal } : item))
                          )
                        }
                        className="w-full text-xs"
                      >
                        <Select.Option value={0}>0%</Select.Option>
                        <Select.Option value={5}>5%</Select.Option>
                        <Select.Option value={12}>12%</Select.Option>
                        <Select.Option value={18}>18%</Select.Option>
                        <Select.Option value={28}>28%</Select.Option>
                      </Select>
                    ),
                  },
                  {
                    title: 'Subtotal (₹)',
                    key: 'subtotal',
                    width: 110,
                    align: 'right',
                    render: (_, record) => {
                      const net = record.ordered_qty * record.unit_price * (1 - record.discount_percent / 100);
                      const tax = net * (record.gst_percent / 100);
                      const total = net + tax;
                      return (
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          ₹{Math.round(total).toLocaleString('en-IN')}
                        </span>
                      );
                    },
                  },
                ]}
              />

              <Form.Item name="notes" label="PO Instructions / Remarks" className="mt-3">
                <Input.TextArea rows={2} placeholder="Add any special vendor instructions..." />
              </Form.Item>
            </Form>
          )}
        </Modal>

        {/* PR DETAILS VIEW MODAL */}
        <Modal
          title={
            <div className="flex items-center gap-2 font-bold text-lg text-slate-800 dark:text-slate-100 border-b pb-3">
              <FileTextOutlined className="text-indigo-600" /> Requisition Details: {selectedPR?.pr_number}
            </div>
          }
          open={isDetailModalOpen}
          onCancel={() => setIsDetailModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>
              Close
            </Button>,
          ]}
          width={750}
          centered
        >
          {selectedPR && (
            <div className="space-y-4 pt-2">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <span className="text-xs text-slate-400 block">Project</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPR.project ? `${selectedPR.project.code} - ${selectedPR.project.name}` : 'General Stock'}
                  </span>
                </Col>
                <Col span={8}>
                  <span className="text-xs text-slate-400 block">Created / Requested By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPR.created_by_user?.username || selectedPR.requested_by_user?.username || 'System User'}
                  </span>
                </Col>
                <Col span={8}>
                  <span className="text-xs text-slate-400 block">Status</span>
                  {getStatusBadge(selectedPR.status)}
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="pt-2">
                <Col span={12}>
                  <span className="text-xs text-slate-400 block">Approved By</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedPR.approved_by_user?.username || selectedPR.reviewed_by_user?.username || 'Not Approved Yet'}
                  </span>
                  {selectedPR.approved_at && (
                    <span className="text-xs text-slate-400 block">
                      {dayjs(selectedPR.approved_at).format('DD/MM/YYYY HH:mm')}
                    </span>
                  )}
                </Col>
                <Col span={12}>
                  <span className="text-xs text-slate-400 block">Rejected By</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {selectedPR.rejected_by_user?.username || (selectedPR.status === 'REJECTED' ? 'Reviewer' : 'N/A')}
                  </span>
                  {selectedPR.rejected_at && (
                    <span className="text-xs text-slate-400 block">
                      {dayjs(selectedPR.rejected_at).format('DD/MM/YYYY HH:mm')}
                    </span>
                  )}
                  {selectedPR.rejection_reason && (
                    <span className="text-xs text-red-500 block italic">Reason: {selectedPR.rejection_reason}</span>
                  )}
                </Col>
              </Row>

              <Divider className="my-2">Items Included</Divider>

              <Table
                dataSource={selectedPR.items || []}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: 'Code', dataIndex: 'item_type', key: 'code', render: (it) => it?.code || '-' },
                  { title: 'Item Name', dataIndex: 'item_type', key: 'name', render: (it) => it?.name || '-' },
                  { title: 'Cat No', dataIndex: 'cat_no', key: 'cat_no', render: (val, record) => val || record.item_type?.cat_no || '-' },
                  { title: 'Req Qty', dataIndex: 'requested_qty', key: 'requested_qty', render: (val) => <span className="font-bold text-indigo-600">{val}</span> },
                  { title: 'Allowed PO Qty', dataIndex: 'allowed_po_qty', key: 'allowed_po_qty', render: (val) => <span className="font-bold text-emerald-600">{val !== null && val !== undefined ? val : '-'}</span> },
                ]}
              />
            </div>
          )}
        </Modal>
      </main>
    </AppLayout>
  );
};

export default PurchaseRequisitionsPage;
