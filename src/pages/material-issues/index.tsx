import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Select, InputNumber, Tag, Space, DatePicker, Badge, message, Popover } from 'antd';
const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  UserOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { MaterialIssue, Project, ProjectInventory } from '../../types/inventory';
import { materialIssueApi, projectApi, inventoryApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const MaterialIssuesPage: React.FC = () => {
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [projectInventory, setProjectInventory] = useState<ProjectInventory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form] = Form.useForm();

  const fetchIssuesAndProjects = async () => {
    setLoading(true);
    try {
      const [issueRes, pRes] = await Promise.all([
        materialIssueApi.getAll(),
        projectApi.getAll(),
      ]);

      if (issueRes.success && issueRes.issues) setIssues(issueRes.issues);
      if (pRes.success && pRes.projects) {
        setProjects(pRes.projects);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load material issue vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssuesAndProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId && isModalOpen) {
      inventoryApi.getByProject(selectedProjectId).then((res) => {
        if (res.success && res.inventory) {
          setProjectInventory(res.inventory);
        }
      });
    }
  }, [selectedProjectId, isModalOpen]);

  const handleProjectSelectInForm = (projId: number) => {
    setSelectedProjectId(projId);
    inventoryApi.getByProject(projId).then((res) => {
      if (res.success && res.inventory) {
        setProjectInventory(res.inventory);
      }
    });
  };

  const handleOpenCreateModal = () => {
    form.resetFields();
    if (projects.length > 0) setSelectedProjectId(projects[0].id);
    setIsModalOpen(true);
  };

  const handleFinish = async (values: any) => {
    try {
      const res = await materialIssueApi.create(values);
      if (res.success && res.issue) {
        setIssues([res.issue, ...issues]);
        message.success(`Material Issue Voucher ${res.issue.issue_number} issued successfully! Stock updated.`);
        setIsModalOpen(false);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to issue material voucher');
    }
  };

  const filteredIssues = issues.filter((iss) => {
    const q = searchQuery.toLowerCase();
    const projName = iss.project?.name || '';
    const matchesSearch =
      !q ||
      iss.issue_number.toLowerCase().includes(q) ||
      iss.issued_to.toLowerCase().includes(q) ||
      projName.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterProjectId && iss.project_id !== filterProjectId) {
      return false;
    }

    if (dateRange && iss.issue_date) {
      const issueDateStr = new Date(iss.issue_date).toISOString().slice(0, 10);
      if (issueDateStr < dateRange[0] || issueDateStr > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  const availableStockItems = projectInventory.filter((inv) => inv.quantity > 0);

  const columns: ColumnsType<MaterialIssue> = [
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
      title: 'Voucher # & Date',
      key: 'issue_number',
      render: (_, record) => (
        <div>
          <div className="font-mono font-bold text-indigo-500 text-base">{record.issue_number}</div>
          <div className="text-xs text-slate-400 font-mono">
            {record.issue_date ? new Date(record.issue_date).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      ),
    },
    {
      title: 'Issued To (Recipient)',
      dataIndex: 'issued_to',
      key: 'issued_to',
      render: (recipient: string) => (
        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-['Outfit']">
          <UserOutlined className="text-emerald-500" /> {recipient}
        </span>
      ),
    },
    {
      title: 'Project Site',
      key: 'project',
      render: (_, record) => (
        <span className="text-slate-700 dark:text-slate-300">
          {record.project?.name || `Project #${record.project_id}`}
        </span>
      ),
    },
    {
      title: 'Issued Items List',
      key: 'items',
      render: (_, record) => (
        <Popover
          content={
            <div className="space-y-1 text-xs font-mono">
              {record.items?.map((item) => (
                <div key={item.id}>
                  • {item.item_type?.name}: <strong>{item.quantity}</strong> {item.item_type?.unit}
                </div>
              ))}
            </div>
          }
          title="Issued Materials"
        >
          <Tag icon={<FileTextOutlined />} color="purple" className="cursor-pointer font-bold">
            {record.items?.length || 0} Item(s) Issued
          </Tag>
        </Popover>
      ),
    },
    {
      title: 'Issued By User',
      key: 'user',
      render: (_, record) => (
        <span className="text-xs text-slate-400">
          {record.user?.username || 'Admin'}
        </span>
      ),
    },
  ];

  return (
    <AppLayout>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileDoneOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Material Issue Vouchers (Stock Outward)
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Issue materials to site contractors, work phases, or teams with automatic stock deduction
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchIssuesAndProjects} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
              + Issue Material Voucher
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredIssues.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredIssues.length} Vouchers
                </Tag>
              </Badge>
              {filteredIssues.length !== issues.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {issues.length} total vouchers)
                </span>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal} className="shadow-lg shadow-indigo-500/30">
              + Issue Material Voucher
            </Button>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Project Site + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search by Voucher # or Recipient..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="w-full"
            />

            <Select
              placeholder="Filter by Project Site"
              value={filterProjectId}
              onChange={setFilterProjectId}
              allowClear
              className="w-full"
            >
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </Select.Option>
              ))}
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

          <Table
            columns={columns}
            dataSource={filteredIssues}
            rowKey="id"
            loading={loading}
            scroll={{ x: 800, y: 360 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      <Modal
        title="Issue Material Voucher (Stock Outward)"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        width={700}
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="project_id"
              label="Source Project Site"
              rules={[{ required: true, message: 'Select project' }]}
            >
              <Select placeholder="Select Project" onChange={handleProjectSelectInForm}>
                {projects.map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="issued_to"
              label="Issued To (Contractor / Worker Name)"
              rules={[{ required: true, message: 'Specify recipient name' }]}
            >
              <Input placeholder="e.g. Subcontractor Anil & Team - Phase 2" />
            </Form.Item>
          </div>

          <div className="font-bold text-sm text-indigo-400 mb-2">Materials to Issue</div>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div className="space-y-3">
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className="flex flex-col md:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-white/10">
                    <Form.Item
                      {...restField}
                      name={[name, 'item_type_id']}
                      rules={[{ required: true, message: 'Select item' }]}
                      className="mb-0 flex-1 w-full"
                    >
                      <Select placeholder="Select item from site stock">
                        {availableStockItems.map((inv) => (
                          <Select.Option key={inv.item_type_id} value={inv.item_type_id}>
                            {inv.item_type?.name} ({inv.item_type?.code}) — Available: {inv.quantity} {inv.item_type?.unit}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: 'Enter Qty' }]}
                      className="mb-0 w-full md:w-36"
                    >
                      <InputNumber min={1} placeholder="Quantity" className="w-full" />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button danger type="text" onClick={() => remove(name)}>
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Add Another Material Line
                </Button>
              </div>
            )}
          </Form.List>

          <Form.Item name="notes" label="Issue Remarks / Usage Purpose (Optional)" className="mt-4">
            <Input.TextArea placeholder="e.g. Approved for Foundation Concreting Phase 1" rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};
export default MaterialIssuesPage;
