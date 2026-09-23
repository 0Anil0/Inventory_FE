import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Tag,
  DatePicker,
  Badge,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Space,
  Tooltip,
  Alert,
  Spin,
} from 'antd';
const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  SendOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  CheckCircleFilled,
  AppstoreOutlined,
  ClusterOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, ItemType, InventoryLot } from '../../types/inventory';
import { projectApi, inventoryApi, itemTypeApi, projectAssignmentApi, inventoryLotApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';
import { filterSelectOption } from '../../utils/select.utils';

export interface ProjectAssignmentRecord {
  id: number;
  assignment_no: string;
  target_project_id: number;
  target_project?: Project;
  source_location_name: string;
  assigned_to_person: string;
  date: string;
  notes?: string;
  items: Array<{
    item_type_id: number;
    lot_id?: number | null;
    po_id?: number | null;
    unit_price?: number | null;
    total_cost?: number | null;
    purchase_order?: { id: number; po_number: string } | null;
    item_name: string;
    item_code: string;
    cat_no?: string;
    make?: string;
    rating?: string;
    full_description?: string;
    unit: string;
    quantity: number;
  }>;
}

export const ProjectAssignmentsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [storeStock, setStoreStock] = useState<ProjectInventory[]>([]);
  const [catalogItems, setCatalogItems] = useState<ItemType[]>([]);
  const [assignments, setAssignments] = useState<ProjectAssignmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [total, setTotal] = useState<number>(0);

  // Aggregated summary statistics
  const [totalAssignmentsCount, setTotalAssignmentsCount] = useState<number>(0);
  const [uniqueProjectsAssigned, setUniqueProjectsAssigned] = useState<number>(0);
  const [totalUnitsDispatched, setTotalUnitsDispatched] = useState<number>(0);

  // Modal & Edit states
  const [editingAssignment, setEditingAssignment] = useState<ProjectAssignmentRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isItemSelectOpen, setIsItemSelectOpen] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [lotQuantities, setLotQuantities] = useState<Record<number, number>>({}); // lot_id -> quantity to assign
  const [availableLots, setAvailableLots] = useState<InventoryLot[]>([]);
  const [loadingLots, setLoadingLots] = useState<boolean>(false);
  const [form] = Form.useForm();

  const selectedTargetProjectId = Form.useWatch('target_project_id', form);

  // Load dropdown metadata (Projects, General Store stock, catalog items)
  const loadInitialData = async () => {
    try {
      const [projRes, stockRes, itemRes] = await Promise.all([
        projectApi.getAll(),
        inventoryApi.getByProject(0),
        itemTypeApi.getAll(),
      ]);

      if (projRes.success && projRes.projects) setProjects(projRes.projects);
      if (stockRes.success && stockRes.inventory) setStoreStock(stockRes.inventory);
      if (itemRes.success && itemRes.items) setCatalogItems(itemRes.items);
    } catch (err: any) {
      message.error(err.message || 'Failed to load assignment metadata');
    }
  };

  // Fetch server-side assignments based on current search, filters, and page
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await projectAssignmentApi.getAll({
        search: searchQuery || undefined,
        to_project_id: filterProjectId || undefined,
        from_date: dateRange ? dateRange[0] : undefined,
        to_date: dateRange ? dateRange[1] : undefined,
        page,
        limit: pageSize,
      });

      if (res.success && res.assignments) {
        setAssignments(
          res.assignments.map((a: any) => ({
            id: a.id,
            assignment_no: a.assignment_no,
            target_project_id: a.to_project_id,
            target_project: a.to_project,
            source_location_name: 'General Stock / Main Warehouse',
            assigned_to_person: a.assigned_to_person,
            date: a.assignment_date || a.createdAt || new Date().toISOString(),
            notes: a.notes || undefined,
            items: (a.items || []).map((i: any) => ({
              item_type_id: i.item_type_id,
              lot_id: i.lot_id,
              po_id: i.po_id,
              unit_price: i.unit_price,
              total_cost: i.total_cost,
              purchase_order: i.purchase_order,
              item_name: i.item_type?.name || 'Item',
              item_code: i.item_type?.code || 'ITM',
              cat_no: i.item_type?.cat_no || undefined,
              make: i.item_type?.make || undefined,
              rating: i.item_type?.rating || undefined,
              full_description: i.item_type?.full_description || i.item_type?.description || undefined,
              unit: i.item_type?.unit || 'pcs',
              quantity: i.quantity,
            })),
          }))
        );
        setTotal(res.total || 0);
        if (res.totalAssignmentsCount !== undefined) setTotalAssignmentsCount(res.totalAssignmentsCount);
        if (res.uniqueProjectsAssigned !== undefined) setUniqueProjectsAssigned(res.uniqueProjectsAssigned);
        if (res.totalUnitsDispatched !== undefined) setTotalUnitsDispatched(res.totalUnitsDispatched);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load project assignment records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [searchQuery, filterProjectId, dateRange, page, pageSize]);

  // Fetch available stock lots dynamically when target project is selected
  useEffect(() => {
    if (selectedTargetProjectId && isModalOpen) {
      loadLotsForProject(selectedTargetProjectId);
    } else {
      setAvailableLots([]);
    }
  }, [selectedTargetProjectId, isModalOpen]);

  const loadLotsForProject = async (projId: number) => {
    setLoadingLots(true);
    try {
      const res = await inventoryLotApi.getAvailableLots({ project_id: projId });
      if (res.success && res.lots) {
        setAvailableLots(res.lots);
      }
    } catch (err: any) {
      console.error('Failed to load stock lots for project:', err);
      message.error('Failed to load stock lots for selected project');
    } finally {
      setLoadingLots(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingAssignment(null);
    form.resetFields();
    setSelectedItemIds([]);
    setLotQuantities({});
    setAvailableLots([]);
    setIsItemSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: ProjectAssignmentRecord) => {
    setEditingAssignment(record);
    form.setFieldsValue({
      target_project_id: record.target_project_id,
      assigned_to_person: record.assigned_to_person,
      notes: record.notes,
    });
    const idsSet = new Set<number>();
    const lMap: Record<number, number> = {};
    record.items.forEach((i) => {
      idsSet.add(i.item_type_id);
      if (i.lot_id) {
        lMap[i.lot_id] = i.quantity;
      }
    });
    setSelectedItemIds(Array.from(idsSet));
    setLotQuantities(lMap);
    setIsItemSelectOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteAssignment = async (id: number) => {
    try {
      setLoading(true);
      const res = await projectAssignmentApi.delete(id);
      if (res.success) {
        message.success(res.message || 'Assignment cancelled and stock restored');
        fetchAssignments();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete assignment');
      setLoading(false);
    }
  };

  const handleItemSelectChange = (ids: number[]) => {
    setSelectedItemIds(ids);
  };

  const updateLotQty = (lotId: number, qty: number) => {
    setLotQuantities((prev) => ({ ...prev, [lotId]: qty }));
  };

  // Build selectable items list: Only items that have available stock lots for selected target project
  const selectableItemIds = Array.from(
    new Set([
      ...availableLots.filter((l) => l.available_qty > 0).map((l) => l.item_type_id),
      ...(editingAssignment ? editingAssignment.items.map((i) => i.item_type_id) : []),
    ])
  );

  const handleFormFinish = async (values: any) => {
    if (!values.target_project_id) {
      message.error('Please select a Target Project first');
      return;
    }

    if (selectedItemIds.length === 0) {
      message.error('Please select at least one material item to assign');
      return;
    }

    // Collect items to assign across all lots with qty > 0
    const itemsToAssign: Array<{ item_type_id: number; lot_id: number; quantity: number }> = [];

    for (const itemTypeId of selectedItemIds) {
      const itemLots = availableLots.filter((l) => l.item_type_id === itemTypeId && l.available_qty > 0);
      for (const lot of itemLots) {
        const qty = Number(lotQuantities[lot.id] || 0);
        if (qty > 0) {
          if (qty > lot.available_qty) {
            message.error(
              `Entered quantity ${qty} exceeds available lot stock (${lot.available_qty}) for PO #${lot.purchase_order?.po_number || lot.id}`
            );
            return;
          }
          itemsToAssign.push({
            item_type_id: itemTypeId,
            lot_id: lot.id,
            quantity: qty,
          });
        }
      }
    }

    if (itemsToAssign.length === 0) {
      message.error('Please enter a quantity greater than 0 for at least one PO stock lot');
      return;
    }

    setSubmitting(true);
    try {
      const targetProjId = Number(values.target_project_id);

      if (editingAssignment) {
        const res = await projectAssignmentApi.update(editingAssignment.id, {
          from_project_id: 0,
          to_project_id: targetProjId,
          assigned_to_person: values.assigned_to_person.trim(),
          notes: values.notes ? values.notes.trim() : undefined,
          items: itemsToAssign,
        });

        if (res.success) {
          message.success(res.message || 'Assignment updated successfully');
          setIsModalOpen(false);
          fetchAssignments();
        }
      } else {
        const res = await projectAssignmentApi.create({
          from_project_id: 0,
          to_project_id: targetProjId,
          assigned_to_person: values.assigned_to_person.trim(),
          notes: values.notes ? values.notes.trim() : undefined,
          items: itemsToAssign,
        });

        if (res.success) {
          message.success(res.message || 'Assignment created successfully');
          setIsModalOpen(false);
          fetchAssignments();
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to save project assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleFilterProjectChange = (val: number | null) => {
    setFilterProjectId(val);
    setPage(1);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
    } else {
      setDateRange(null);
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterProjectId(null);
    setDateRange(null);
    setPage(1);
  };

  const columns: ColumnsType<ProjectAssignmentRecord> = [
    {
      title: 'Ref Assignment #',
      dataIndex: 'assignment_no',
      key: 'assignment_no',
      width: 160,
      render: (text) => (
        <Tag color="indigo" className="font-mono font-bold text-xs px-2 py-0.5 border-none">
          {text}
        </Tag>
      ),
    },
    {
      title: 'Destination Project / Site',
      key: 'target_project',
      width: 230,
      render: (_, record) => {
        const proj = record.target_project;
        const parent = proj?.parent || projects.find((p) => p.id === proj?.parent_id);

        if (!proj) {
          return <span className="text-slate-400 font-mono">Site #{record.target_project_id}</span>;
        }

        return (
          <div className="flex flex-col gap-0.5">
            {parent && (
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <FolderOpenOutlined /> {parent.name} ({parent.code})
              </span>
            )}
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-1">
              <NodeIndexOutlined className="text-indigo-500" /> {proj.name}
              <Tag color="purple" className="font-mono text-[10px] ml-1 border-none">
                {proj.code}
              </Tag>
            </span>
          </div>
        );
      },
    },
    {
      title: 'Assigned Items & PO Lot Rates',
      key: 'items',
      width: 360,
      render: (_, record) => (
        <div className="flex flex-col gap-1.5 py-1">
          {record.items.map((item, idx) => {
            const lotRate = item.unit_price ? Number(item.unit_price) : 0;
            const lineTotal = item.total_cost ? Number(item.total_cost) : (lotRate * item.quantity);

            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.item_name}</span>
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">({item.item_code})</span>
                  {item.cat_no && (
                    <Tag color="emerald" className="font-mono text-[10px] px-1 py-0 border-none font-semibold">
                      Cat: {item.cat_no}
                    </Tag>
                  )}
                  {item.purchase_order?.po_number && (
                    <Tag color="purple" className="font-mono text-[10px] px-1 py-0 border-none font-semibold">
                      {item.purchase_order.po_number}
                    </Tag>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono font-bold shrink-0">
                  <span className="text-cyan-600 dark:text-cyan-400">
                    {item.quantity} {item.unit}
                  </span>
                  {lotRate > 0 && (
                    <span className="text-slate-500 text-[11px]">
                      @ ₹{lotRate.toLocaleString('en-IN')}/unit = <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{lineTotal.toLocaleString('en-IN')}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Recipient (Engineer / Team)',
      dataIndex: 'assigned_to_person',
      key: 'assigned_to_person',
      width: 200,
      render: (text) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
          <UserOutlined className="text-slate-400" /> {text}
        </span>
      ),
    },
    {
      title: 'Dispatch Date',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (text) => <span className="font-mono text-xs text-slate-500">{new Date(text).toLocaleDateString('en-IN')}</span>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: () => (
        <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none py-0.5 px-2.5">
          ALLOCATED
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit Assignment">
            <Button
              type="text"
              icon={<EditOutlined className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400" />}
              onClick={() => handleOpenEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Cancel & Delete Assignment"
            description="Are you sure you want to delete this assignment? Assigned stock will be returned to General Stock lots."
            onConfirm={() => handleDeleteAssignment(record.id)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete & Revert Stock">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <SendOutlined className="text-2xl text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Project Material Assignment & Dispatch Master
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Allocate warehouse inventory items directly to main projects and sub-project child sites by PO stock lot & purchase rate
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip title="Refresh Material Assignments">
              <Button shape="circle" icon={<ReloadOutlined />} onClick={fetchAssignments} loading={loading} />
            </Tooltip>
            <Tooltip title="New Project Material Assignment">
              <Button
                type="primary"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={handleOpenCreateModal}
                size="middle"
                className="shadow-lg shadow-indigo-500/30"
              />
            </Tooltip>
          </div>
        </div>

        {/* Statistics Grid */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-slate-400 uppercase font-semibold">Total Assignments Made</span>}
                value={totalAssignmentsCount}
                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                prefix={<SendOutlined className="mr-2 text-indigo-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-purple-400 uppercase font-semibold font-mono">Assigned Projects & Sites</span>}
                value={uniqueProjectsAssigned}
                valueStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                prefix={<ClusterOutlined className="mr-2 text-purple-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-emerald-400 uppercase font-semibold font-mono">Total Units Dispatched</span>}
                value={totalUnitsDispatched}
                valueStyle={{ color: '#10b981', fontWeight: 'bold' }}
                prefix={<AppstoreOutlined className="mr-2 text-emerald-400" />}
              />
            </Card>
          </Col>
        </Row>

        {/* Main Content Card */}
        <Card className="shadow-2xl">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={total} overflowCount={9999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Assignment Records: {total}
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search Ref #, project..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              className="w-44 sm:w-56 max-w-xs"
            />

            <Select
              placeholder="Filter by Target Project / Site"
              value={filterProjectId}
              onChange={handleFilterProjectChange}
              allowClear
              className="w-full"
              showSearch
              filterOption={filterSelectOption}
            >
              {projects.map((p) => {
                const parent = p.parent || projects.find((parentP) => parentP.id === p.parent_id);
                return (
                  <Select.Option key={p.id} value={p.id}>
                    {p.parent_id && parent ? (
                      <span>
                        <span className="text-purple-400">📁 {parent.name}</span>
                        <span className="text-slate-400 mx-1">➔</span>
                        <span>🔀 {p.name}</span> ({p.code})
                      </span>
                    ) : (
                      <span>📁 {p.name} ({p.code})</span>
                    )}
                  </Select.Option>
                );
              })}
            </Select>

            <RangePicker onChange={handleDateRangeChange} className="w-full" />

            <Button icon={<ReloadOutlined />} onClick={handleResetFilters} className="w-full">
              Reset Filters
            </Button>
          </div>

          <Table<ProjectAssignmentRecord>
            columns={columns}
            dataSource={assignments}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1310 }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50', '100'],
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
              showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} assignments`,
            }}
          />
        </Card>
      </main>

      {/* Assignment Modal with REQUIRED PROJECT SELECTION FIRST & LOT-BASED PURCHASE RATES */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold font-['Outfit'] text-lg border-b pb-3 border-slate-200 dark:border-white/10">
            <SendOutlined />
            <span>{editingAssignment ? `Edit Assignment ${editingAssignment.assignment_no}` : 'New Project Material Assignment & Stock Dispatch'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={editingAssignment ? 'Save Changes' : 'Dispatch & Assign Material'}
        width={920}
        destroyOnClose
        className="top-6"
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish} className="mt-4 flex flex-col gap-2">
          {/* STEP 1: TARGET PROJECT SELECTION (REQUIRED FIRST) */}
          <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
              <NodeIndexOutlined /> Step 1: Select Target Project / Site First (Required)
            </div>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="target_project_id"
                  label="Target Destination Project / Sub-site"
                  rules={[{ required: true, message: 'Please select a Target Project first' }]}
                  className="mb-0"
                >
                  <Select
                    placeholder="-- Select Target Project First --"
                    size="large"
                    showSearch
                    filterOption={filterSelectOption}
                    className="w-full"
                    onChange={() => {
                      setSelectedItemIds([]);
                      setLotQuantities({});
                    }}
                  >
                    {projects.map((p) => {
                      const parent = p.parent || projects.find((parentP) => parentP.id === p.parent_id);
                      return (
                        <Select.Option key={p.id} value={p.id}>
                          {p.parent_id && parent ? (
                            <span>
                              <span className="text-purple-400 font-semibold">📁 {parent.name}</span>
                              <span className="text-slate-400 mx-1">➔</span>
                              <span className="font-bold">🔀 {p.name}</span>{' '}
                              <span className="text-xs font-mono text-indigo-400">({p.code})</span>
                            </span>
                          ) : (
                            <span>
                              <span className="font-bold">📁 {p.name}</span>{' '}
                              <span className="text-xs font-mono text-indigo-400">({p.code})</span>
                            </span>
                          )}
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  name="assigned_to_person"
                  label="Assigned To (Site Engineer / Recipient)"
                  rules={[{ required: true, message: 'Please enter recipient name' }]}
                  className="mb-0"
                >
                  <Input size="large" placeholder="e.g. Er. Suresh Sharma / Subcontractor Team" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {/* STEP 2: SELECT MATERIAL ITEMS */}
          <div className="flex items-center justify-between gap-3 mb-1">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <AppstoreOutlined className="text-indigo-500" /> Step 2: Select Material Items Available for Target Project:
            </label>
            {loadingLots && <Spin size="small" />}
          </div>

          {!selectedTargetProjectId ? (
            <Alert
              message="Please select a Target Project above first"
              description="Inventory items and PO stock lots will load specifically for the selected project once chosen."
              type="info"
              showIcon
              className="mb-3 rounded-xl"
            />
          ) : (
            <Form.Item name="selected_item_ids" className="mb-2">
              <Select
                mode="multiple"
                open={isItemSelectOpen}
                onDropdownVisibleChange={(open) => setIsItemSelectOpen(open)}
                onSelect={() => setIsItemSelectOpen(false)}
                maxTagCount="responsive"
                placeholder={
                  selectableItemIds.length === 0
                    ? 'No available PO stock lots or General stock for this project...'
                    : 'Search & select stock items...'
                }
                size="large"
                value={selectedItemIds}
                onChange={handleItemSelectChange}
                showSearch
                filterOption={(input, option) => {
                  const inv = storeStock.find((i) => i.item_type_id === option?.value);
                  const catItem = catalogItems.find((c) => c.id === option?.value);
                  if (!inv && !catItem) return false;

                  const q = input.toLowerCase().trim();
                  const name = (inv?.item_type?.name || catItem?.name || '').toLowerCase();
                  const code = (inv?.item_type?.code || catItem?.code || '').toLowerCase();
                  const catNo = (inv?.item_type?.cat_no || catItem?.cat_no || '').toLowerCase();
                  const make = (inv?.item_type?.make || catItem?.make || '').toLowerCase();

                  return name.includes(q) || code.includes(q) || catNo.includes(q) || make.includes(q);
                }}
                className="w-full"
                disabled={!selectedTargetProjectId || selectableItemIds.length === 0}
              >
                {selectableItemIds.map((itemTypeId) => {
                  const inv = storeStock.find((i) => i.item_type_id === itemTypeId);
                  const catItem = catalogItems.find((c) => c.id === itemTypeId);
                  const name = inv?.item_type?.name || catItem?.name || 'Item';
                  const code = inv?.item_type?.code || catItem?.code || '';
                  const catNo = inv?.item_type?.cat_no || catItem?.cat_no;
                  const make = inv?.item_type?.make || catItem?.make;
                  const unit = inv?.item_type?.unit || catItem?.unit || 'pcs';

                  const itemLots = availableLots.filter((l) => l.item_type_id === itemTypeId && l.available_qty > 0);
                  const totalAvail = itemLots.reduce((sum, l) => sum + Number(l.available_qty || 0), 0);

                  return (
                    <Select.Option key={itemTypeId} value={itemTypeId}>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-none">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{name}</span>
                          <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">({code})</span>
                          {catNo && (
                            <Tag color="emerald" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                              Cat: {catNo}
                            </Tag>
                          )}
                          {make && (
                            <Tag color="blue" className="text-[11px] border-none px-1.5 py-0 font-semibold">
                              {make}
                            </Tag>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Tag color="purple" className="font-mono text-xs font-bold border-none">
                            {itemLots.length} Stock Lot(s) Available
                          </Tag>
                          <Tag color="indigo" className="font-mono text-xs font-bold border-none py-0.5 px-2">
                            Total: {totalAvail} {unit}
                          </Tag>
                        </div>
                      </div>
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}

          {/* STEP 3: STOCK LOTS ASSIGNMENT QUANTITY MULTI-INPUT CARDS */}
          {selectedItemIds.length > 0 && (
            <div className="mt-2 flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                <span>Set Assignment Quantity Per PO Stock Lot ({selectedItemIds.length} items selected):</span>
                <span className="text-indigo-500 font-semibold">Assign from single or multiple PO lots as needed</span>
              </div>

              {selectedItemIds.map((id) => {
                const invItem = storeStock.find((inv) => inv.item_type_id === id);
                const catItem = catalogItems.find((c) => c.id === id);
                const itemName = invItem?.item_type?.name || catItem?.name || 'Item';
                const itemCode = invItem?.item_type?.code || catItem?.code || '';
                const catNo = invItem?.item_type?.cat_no || catItem?.cat_no;
                const unitStr = invItem?.item_type?.unit || catItem?.unit || 'pcs';

                const itemLots = availableLots.filter((l) => l.item_type_id === id && l.available_qty > 0);
                const totalAssignedForThisItem = itemLots.reduce(
                  (sum, l) => sum + Number(lotQuantities[l.id] || 0),
                  0
                );

                return (
                  <Card
                    key={id}
                    size="small"
                    className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl transition-all"
                  >
                    <div className="flex flex-col gap-3">
                      {/* Item Info Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                          <Tag color="indigo" className="font-mono text-xs font-bold border-none px-2">
                            {itemCode}
                          </Tag>
                          <span className="text-base">{itemName}</span>
                          {catNo && (
                            <Tag color="emerald" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                              Cat: {catNo}
                            </Tag>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-xs font-bold">
                          <span className="text-slate-500">Total Quantity Assigned:</span>
                          <Tag color={totalAssignedForThisItem > 0 ? 'cyan' : 'default'} className="font-mono text-sm px-2.5 py-0.5 font-bold border-none">
                            {totalAssignedForThisItem} {unitStr}
                          </Tag>
                        </div>
                      </div>

                      {/* Available PO Stock Lots with Per-Lot Quantity Inputs */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <TagOutlined className="text-purple-500" /> Enter Quantity to Take from Each Stock Lot:
                        </span>

                        {itemLots.length === 0 ? (
                          <div className="text-xs text-amber-500 italic p-2 bg-amber-500/10 rounded-lg">
                            No active PO stock lots available for this project.
                          </div>
                        ) : (
                          itemLots.map((lot) => {
                            const isTargetProjectLot = lot.project_id && lot.project_id !== 0;
                            const poNum = lot.purchase_order?.po_number || (lot.lot_number ? `Lot ${lot.lot_number}` : 'Store Batch');
                            const rate = Number(lot.unit_price || 0);
                            const currentLotQty = lotQuantities[lot.id] || 0;
                            const isLotExceeded = currentLotQty > lot.available_qty;

                            return (
                              <div
                                key={lot.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                                  currentLotQty > 0
                                    ? 'bg-purple-500/10 border-purple-500/60 shadow-sm'
                                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  {isTargetProjectLot ? (
                                    <Tag color="purple" className="font-mono text-xs font-bold border-none px-2 py-0.5">
                                      Project PO: {poNum}
                                    </Tag>
                                  ) : (
                                    <Tag color="cyan" className="font-mono text-xs font-bold border-none px-2 py-0.5">
                                      General Stock: {poNum}
                                    </Tag>
                                  )}
                                  {lot.project?.name && (
                                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                      ({lot.project.name})
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                    Avail: <strong className="text-indigo-600 dark:text-indigo-400">{lot.available_qty} {unitStr}</strong>
                                  </span>
                                  <Tag color="emerald" className="font-mono text-xs font-bold border-none py-0.5 px-2">
                                    Rate: ₹{rate.toLocaleString('en-IN')}/{unitStr}
                                  </Tag>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Assign from Lot:</span>
                                  <InputNumber
                                    min={0}
                                    max={lot.available_qty}
                                    value={currentLotQty}
                                    onChange={(v) => updateLotQty(lot.id, v || 0)}
                                    status={isLotExceeded ? 'error' : ''}
                                    className="w-28 font-bold font-mono"
                                  />
                                  <span className="text-xs font-mono text-slate-500">{unitStr}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Form.Item name="notes" label="Assignment Remarks / Scope Purpose (Optional)" className="mt-2 mb-0">
            <Input.TextArea placeholder="Enter dispatch notes, truck/vehicle ref, or work scope details..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ProjectAssignmentsPage;
