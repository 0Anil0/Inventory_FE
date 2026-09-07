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
  Popover,
} from 'antd';
const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
  SendOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  CheckCircleFilled,
  AppstoreOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, ItemType } from '../../types/inventory';
import { projectApi, inventoryApi, itemTypeApi, projectAssignmentApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

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
    item_name: string;
    item_code: string;
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [form] = Form.useForm();

  // Load projects, General Store stock, catalog items, AND persisted project assignments
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [projRes, stockRes, itemRes, assignRes] = await Promise.all([
        projectApi.getAll(),
        inventoryApi.getByProject(0), // General Store Stock
        itemTypeApi.getAll(),
        projectAssignmentApi.getAll(),
      ]);

      if (projRes.success && projRes.projects) setProjects(projRes.projects);
      if (stockRes.success && stockRes.inventory) setStoreStock(stockRes.inventory);
      if (itemRes.success && itemRes.items) setCatalogItems(itemRes.items);
      if (assignRes.success && assignRes.assignments) {
        setAssignments(
          assignRes.assignments.map((a) => ({
            id: a.id,
            assignment_no: a.assignment_no,
            target_project_id: a.to_project_id,
            target_project: a.to_project,
            source_location_name: 'General Stock / Main Warehouse',
            assigned_to_person: a.assigned_to_person,
            date: a.assignment_date || a.createdAt || new Date().toISOString(),
            notes: a.notes || undefined,
            items: (a.items || []).map((i) => ({
              item_type_id: i.item_type_id,
              item_name: i.item_type?.name || 'Item',
              item_code: i.item_type?.code || 'ITM',
              unit: i.item_type?.unit || 'pcs',
              quantity: i.quantity,
            })),
          }))
        );
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleOpenCreateModal = () => {
    form.resetFields();
    setSelectedItemIds([]);
    setItemQuantities({});
    setIsModalOpen(true);
  };

  const handleItemSelectChange = (ids: number[]) => {
    setSelectedItemIds(ids);
    const newMap = { ...itemQuantities };
    ids.forEach((id) => {
      if (newMap[id] === undefined) newMap[id] = 1;
    });
    setItemQuantities(newMap);
  };

  const updateItemQty = (id: number, qty: number) => {
    setItemQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const availableStoreStock = storeStock.filter((inv) => inv.quantity > 0);

  const handleFormFinish = async (values: any) => {
    if (selectedItemIds.length === 0) {
      message.error('Please select at least one item to assign to the project');
      return;
    }

    // Validate requested quantity against available General Store stock
    for (const id of selectedItemIds) {
      const invItem = storeStock.find((inv) => inv.item_type_id === id);
      const requestedQty = itemQuantities[id] || 1;
      const maxAvailable = invItem ? invItem.quantity : 0;
      if (requestedQty > maxAvailable) {
        message.error(
          `Cannot assign ${requestedQty} for "${invItem?.item_type?.name || 'Item'}". Available in Store: ${maxAvailable}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const targetProjId = Number(values.target_project_id);
      const itemsToAssign = selectedItemIds.map((id) => ({
        item_type_id: id,
        quantity: itemQuantities[id] || 1,
      }));

      // Submit project assignment to backend API
      const res = await projectAssignmentApi.create({
        from_project_id: 0,
        to_project_id: targetProjId,
        assigned_to_person: values.assigned_to_person.trim(),
        notes: values.notes ? values.notes.trim() : undefined,
        items: itemsToAssign,
      });

      if (res.success && res.assignment) {
        message.success(
          `Successfully assigned ${selectedItemIds.length} item(s) to "${res.assignment.to_project?.name || 'Project'}"!`
        );
        setIsModalOpen(false);
        loadInitialData(); // Refresh assignments list & store stock
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to submit material assignment');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered assignments list
  const filteredAssignments = assignments.filter((rec) => {
    const q = searchQuery.toLowerCase();
    const projName = rec.target_project?.name || '';
    const projCode = rec.target_project?.code || '';

    const matchesSearch =
      !q ||
      rec.assignment_no.toLowerCase().includes(q) ||
      rec.assigned_to_person.toLowerCase().includes(q) ||
      projName.toLowerCase().includes(q) ||
      projCode.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterProjectId && rec.target_project_id !== filterProjectId) {
      return false;
    }

    if (dateRange && rec.date) {
      const recDate = new Date(rec.date).toISOString().slice(0, 10);
      if (recDate < dateRange[0] || recDate > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  // Calculate statistics
  const totalAssignmentsCount = assignments.length;
  const totalUnitsDispatched = assignments.reduce(
    (sum, a) => sum + a.items.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );
  const uniqueProjectsAssigned = new Set(assignments.map((a) => a.target_project_id)).size;

  const columns: ColumnsType<ProjectAssignmentRecord> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 80,
      align: 'center',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Assignment Ref #',
      key: 'assignment_no',
      width: 170,
      render: (_, record) => (
        <div>
          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
            {record.assignment_no}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {new Date(record.date).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      title: 'Target Project / Sub-Site',
      key: 'project',
      render: (_, record) => {
        const proj = record.target_project;
        if (!proj) return <span className="text-slate-400">Project #{record.target_project_id}</span>;
        
        const parentProj = proj.parent || projects.find((p) => p.id === proj.parent_id);
        const isSub = !!proj.parent_id || !!parentProj;

        return (
          <div className="space-y-0.5">
            {isSub && parentProj && (
              <div className="text-xs font-semibold text-purple-600 dark:text-purple-300 flex items-center gap-1 font-['Outfit']">
                <FolderOpenOutlined className="text-purple-400" />
                <span>Parent: <strong className="font-bold underline">{parentProj.name}</strong></span>
              </div>
            )}
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-base font-['Outfit']">
              {isSub ? (
                <NodeIndexOutlined className="text-purple-500" />
              ) : (
                <FolderOpenOutlined className="text-indigo-500" />
              )}
              <span>{proj.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Tag color={isSub ? 'purple' : 'blue'} className="font-mono text-[10px] font-bold border-none">
                {isSub ? 'SUB-PROJECT' : 'MAIN PROJECT'}
              </Tag>
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">({proj.code})</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Assigned Items Summary',
      key: 'items',
      render: (_, record) => (
        <Popover
          content={
            <div className="space-y-1.5 text-xs font-mono p-1">
              {record.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="text-slate-700 dark:text-slate-200">
                    • {item.item_name} ({item.item_code})
                  </span>
                  <Tag color="indigo" className="font-bold border-none">
                    {item.quantity} {item.unit}
                  </Tag>
                </div>
              ))}
            </div>
          }
          title="Assigned Material Items Detail"
        >
          <Tag icon={<FileTextOutlined />} color="purple" className="cursor-pointer font-bold py-0.5 px-2.5">
            {record.items.length} Item Line(s) Dispatched
          </Tag>
        </Popover>
      ),
    },
    {
      title: 'Assigned To (Recipient)',
      dataIndex: 'assigned_to_person',
      key: 'assigned_to_person',
      render: (person: string) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <UserOutlined className="text-emerald-500" /> {person || 'Site Engineer'}
        </span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: () => (
        <Tag icon={<CheckCircleFilled />} color="success" className="font-bold border-none py-0.5 px-2.5">
          ALLOCATED
        </Tag>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
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
                Allocate warehouse inventory items directly to main projects and sub-project child sites
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button icon={<ReloadOutlined />} onClick={loadInitialData} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreateModal}
              size="middle"
              className="shadow-lg shadow-indigo-500/30"
            >
              New Project Assignment
            </Button>
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
              <Badge count={filteredAssignments.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Assignment Records: {filteredAssignments.length}
                </Tag>
              </Badge>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search by Ref #, project, or person..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="w-full"
            />

            <Select
              placeholder="Filter by Target Project / Site"
              value={filterProjectId}
              onChange={setFilterProjectId}
              allowClear
              className="w-full"
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

            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                setSearchQuery('');
                setFilterProjectId(null);
                setDateRange(null);
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>

          <Table<ProjectAssignmentRecord>
            columns={columns}
            dataSource={filteredAssignments}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800, y: 360 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} assignments`,
            }}
          />
        </Card>
      </main>

      {/* NEW MATERIAL ASSIGNMENT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold border-b pb-3">
            <SendOutlined className="text-indigo-600" />
            <span>Create New Project Material Assignment</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={`Assign ${selectedItemIds.length} Item${selectedItemIds.length === 1 ? '' : 's'} to Project`}
        centered
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="target_project_id"
              label="Destination Project / Sub-Site"
              rules={[{ required: true, message: 'Please select target project or site' }]}
            >
              <Select placeholder="Select Target Project or Site">
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

            <Form.Item
              name="assigned_to_person"
              label="Assigned To (Site Engineer / Recipient)"
              rules={[{ required: true, message: 'Please enter recipient name' }]}
            >
              <Input placeholder="e.g. Er. Suresh Sharma / Subcontractor Team" />
            </Form.Item>
          </div>

          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="text-sm font-semibold text-slate-200">
              Select Material Items from Warehouse Stock (Available &gt; 0):
            </label>
          </div>

          <Form.Item name="selected_item_ids">
            <Select
              mode="multiple"
              placeholder={
                availableStoreStock.length === 0
                  ? 'No available stock items in General Store...'
                  : 'Search & select available stock items...'
              }
              size="large"
              value={selectedItemIds}
              onChange={handleItemSelectChange}
              showSearch
              optionFilterProp="children"
              className="w-full"
              disabled={availableStoreStock.length === 0}
            >
              {availableStoreStock.map((inv) => (
                <Select.Option key={inv.item_type_id} value={inv.item_type_id}>
                  <div className="flex items-center justify-between py-0.5">
                    <div>
                      <span className="font-semibold">{inv.item_type?.name}</span>{' '}
                      <span className="text-xs font-mono text-indigo-400">({inv.item_type?.code})</span>
                    </div>
                    <Tag color="cyan" className="font-mono text-xs border-none font-bold">
                      Avail: {inv.quantity.toLocaleString()} {inv.item_type?.unit}
                    </Tag>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Quantity Input Cards */}
          {selectedItemIds.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Set Assignment Quantity for Selected Items ({selectedItemIds.length}):
              </div>

              {selectedItemIds.map((id) => {
                const invItem = storeStock.find((inv) => inv.item_type_id === id);
                const catItem = catalogItems.find((c) => c.id === id);
                const maxAvailable = invItem ? invItem.quantity : 0;
                const currentVal = itemQuantities[id] || 1;
                const isExceeded = currentVal > maxAvailable;

                return (
                  <Card
                    key={id}
                    size="small"
                    className={`bg-slate-900/60 border rounded-xl transition-all ${
                      isExceeded ? 'border-rose-500/80 bg-rose-950/20' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-100">
                          {invItem?.item_type?.name || catItem?.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          Available in Store:{' '}
                          <strong className="text-cyan-400 font-bold font-mono">
                            {maxAvailable.toLocaleString()} {invItem?.item_type?.unit || catItem?.unit || 'pcs'}
                          </strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Quantity to Assign:</span>
                        <InputNumber
                          min={1}
                          max={maxAvailable}
                          value={currentVal}
                          onChange={(v) => updateItemQty(id, v || 1)}
                          status={isExceeded ? 'error' : ''}
                          className="w-32"
                        />
                      </div>
                    </div>
                    {isExceeded && (
                      <div className="text-[11px] text-rose-400 mt-2 font-semibold">
                        ⚠️ Entered quantity exceeds available stock in General Store ({maxAvailable}{' '}
                        {invItem?.item_type?.unit || 'pcs'})
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          <Form.Item name="notes" label="Assignment Remarks / Scope Purpose (Optional)" className="mt-4">
            <Input.TextArea placeholder="Enter dispatch notes, truck/vehicle ref, or work scope details..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ProjectAssignmentsPage;
