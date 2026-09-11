import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Select,
  Tag,
  Row,
  Col,
  Statistic,
  Space,
  Modal,
  Form,
  Radio,
  Popconfirm,
  message,
  Tooltip,
  Badge,
  Segmented,
  Tree,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ClusterOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FolderOutlined,
  NodeIndexOutlined,
  EnvironmentOutlined,
  FolderOpenOutlined,
  TableOutlined,
  ApartmentOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import type { Project } from '../../types/inventory';
import { projectApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MAIN' | 'SUB'>('ALL');
  const [viewMode, setViewMode] = useState<'TREE_TABLE' | 'NODE_TREE'>('TREE_TABLE');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [subProjectParentId, setSubProjectParentId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [form] = Form.useForm();
  const projectTypeWatch = Form.useWatch('project_category', form);

  // Fetch all projects on mount
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll();
      if (res.success && res.projects) {
        setProjects(res.projects);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load projects list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Open modal for Create / Edit
  const handleOpenCreateModal = (parentId?: number) => {
    setEditingProject(null);
    form.resetFields();
    if (parentId) {
      setSubProjectParentId(parentId);
      form.setFieldsValue({
        project_category: 'SUB',
        parent_id: parentId,
      });
    } else {
      setSubProjectParentId(null);
      form.setFieldsValue({
        project_category: 'MAIN',
        parent_id: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      code: project.code,
      name: project.name,
      location: project.location || '',
      description: project.description || '',
      project_category: project.parent_id ? 'SUB' : 'MAIN',
      parent_id: project.parent_id || undefined,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await projectApi.delete(id);
      if (res.success) {
        message.success('Project deleted successfully');
        fetchProjects();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete project');
    }
  };

  const handleFormFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const isSub = values.project_category === 'SUB';
      const payload = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        location: values.location ? values.location.trim() : undefined,
        description: values.description ? values.description.trim() : undefined,
        parent_id: isSub ? Number(values.parent_id) : null,
      };

      if (editingProject) {
        const res = await projectApi.update(editingProject.id, payload);
        if (res.success) {
          message.success('Project updated successfully');
          setIsModalOpen(false);
          fetchProjects();
        }
      } else {
        const res = await projectApi.create(payload);
        if (res.success) {
          message.success(
            isSub ? 'Sub-project created successfully' : 'Main project created successfully'
          );
          setIsModalOpen(false);
          fetchProjects();
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Main projects (candidates to be parents)
  const mainProjects = projects.filter((p) => !p.parent_id);

  // Build Hierarchical Tree Data Structure for Table & Tree View
  const buildTreeData = (allProjects: Project[]): Project[] => {
    const q = searchQuery.toLowerCase();
    const filtered = allProjects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (typeFilter === 'MAIN') return !p.parent_id;
      if (typeFilter === 'SUB') return !!p.parent_id;
      return true;
    });

    if (typeFilter === 'SUB') {
      return filtered.map((p) => ({ ...p, children: undefined }));
    }

    const mainNodes = filtered.filter((p) => !p.parent_id);
    const subNodes = allProjects.filter((p) => !!p.parent_id);

    return mainNodes.map((main) => {
      const children = subNodes.filter((sub) => sub.parent_id === main.id);
      return {
        ...main,
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  const treeTableData: Project[] = buildTreeData(projects);

  // Calculate Stats
  const totalProjectsCount = projects.length;
  const mainProjectsCount = projects.filter((p) => !p.parent_id).length;
  const subProjectsCount = projects.filter((p) => !!p.parent_id).length;

  const columns: ColumnsType<Project> = [
    {
      title: 'Project Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      fixed: 'left',
      render: (code: string, record) => (
        <Tag color={record.parent_id ? 'purple' : 'indigo'} className="font-mono font-bold px-2 py-0.5 border-none text-sm">
          {code}
        </Tag>
      ),
    },
    {
      title: 'Project / Site Name (Hierarchy)',
      key: 'name',
      render: (_, record) => {
        const isSub = !!record.parent_id;
        return (
          <div className="inline-flex items-center gap-2">
            {isSub ? (
              <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                <span className="text-slate-300 font-mono">└──</span>
                <BranchesOutlined className="text-purple-500" />
                <span>{record.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-base">
                <FolderOpenOutlined className="text-indigo-500 text-lg" />
                <span>{record.name}</span>
              </span>
            )}
            {record.description && (
              <span className="text-xs text-slate-400 font-normal">({record.description})</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Category',
      key: 'category',
      width: 170,
      render: (_, record) =>
        record.parent_id ? (
          <Tag icon={<NodeIndexOutlined />} color="purple" className="font-bold border-none py-0.5 px-2.5">
            SUB-PROJECT / SITE
          </Tag>
        ) : (
          <Tag icon={<FolderOutlined />} color="blue" className="font-bold border-none py-0.5 px-2.5">
            MAIN PROJECT
          </Tag>
        ),
    },
    {
      title: 'Parent Project',
      key: 'parent',
      width: 200,
      render: (_, record) => {
        if (!record.parent_id) {
          return <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider">Top-Level Main</span>;
        }
        const parentProj = record.parent || projects.find((p) => p.id === record.parent_id);
        return (
          <div>
            {parentProj ? (
              <Tag color="cyan" className="font-medium text-xs border-none py-0.5 px-2">
                <FolderOutlined className="mr-1" />
                {parentProj.name} ({parentProj.code})
              </Tag>
            ) : (
              <span className="text-slate-400 text-xs font-mono">Parent ID: {record.parent_id}</span>
            )}
          </div>
        );
      },
    },
    {
      title: 'Child Sites',
      key: 'sub_projects',
      width: 130,
      align: 'center',
      render: (_, record) => {
        const childCount = record.sub_projects
          ? record.sub_projects.length
          : projects.filter((p) => p.parent_id === record.id).length;

        if (childCount === 0) {
          return <span className="text-slate-400 text-xs">-</span>;
        }
        return (
          <Badge count={`${childCount} Sub-Sites`} style={{ backgroundColor: '#8b5cf6', fontWeight: 'bold' }} />
        );
      },
    },
    {
      title: 'Site Location',
      dataIndex: 'location',
      key: 'location',
      width: 180,
      render: (loc: string) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
          <EnvironmentOutlined className="text-rose-400" />
          {loc || 'Not Specified'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {!record.parent_id && (
            <Tooltip title="Add Sub-Project / Child Site under this main project">
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => handleOpenCreateModal(record.id)}
                className="text-xs text-purple-600 border-purple-300 hover:text-purple-700 font-semibold"
              >
                Sub-Site
              </Button>
            </Tooltip>
          )}

          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditModal(record)}
          />

          <Popconfirm
            title="Delete Project & Child Sites?"
            description={
              record.children || projects.some((p) => p.parent_id === record.id)
                ? `Deleting "${record.name}" will ALSO delete all of its child sub-projects!`
                : `Are you sure you want to delete "${record.name}"?`
            }
            onConfirm={() => handleDelete(record.id)}
            okText="Yes, Delete All"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Map data to Ant Tree Format for Visual Node Diagram Mode
  const getAntTreeData = () => {
    return mainProjects.map((main) => {
      const children = projects.filter((p) => p.parent_id === main.id);
      return {
        title: (
          <div className="flex items-center gap-3 p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 my-1">
            <FolderOpenOutlined className="text-indigo-600 text-lg" />
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] text-base mr-2">
                {main.name}
              </span>
              <Tag color="indigo" className="font-mono font-bold">
                {main.code}
              </Tag>
              {main.location && (
                <span className="text-xs text-slate-500 ml-2 font-medium">
                  📍 {main.location}
                </span>
              )}
            </div>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreateModal(main.id);
              }}
              className="ml-auto text-xs"
            >
              Add Child Site
            </Button>
          </div>
        ),
        key: `main-${main.id}`,
        children: children.map((sub) => ({
          title: (
            <div className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 my-1">
              <BranchesOutlined className="text-purple-500 text-base" />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mr-2">
                  {sub.name}
                </span>
                <Tag color="purple" className="font-mono">
                  {sub.code}
                </Tag>
                {sub.location && (
                  <span className="text-xs text-slate-500 ml-2">📍 {sub.location}</span>
                )}
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(sub);
                  }}
                />
                <Popconfirm
                  title="Delete Sub-Project?"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(sub.id);
                  }}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            </div>
          ),
          key: `sub-${sub.id}`,
        })),
      };
    });
  };

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-4 flex flex-col gap-4 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <ApartmentOutlined className="text-2xl text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Project & Sub-Project Tree Master
              </h1>
              <p className="text-xs app-text-muted mb-0">
                Hierarchical tree view of main projects, child sites, and site location nodes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenCreateModal()}
              size="middle"
              className="shadow-lg shadow-indigo-500/30"
            >
              Add Project Master
            </Button>
          </div>
        </div>

        {/* Statistics Grid */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-slate-400 uppercase font-semibold">Total Registered Nodes</span>}
                value={totalProjectsCount}
                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                prefix={<ClusterOutlined className="mr-2 text-indigo-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-blue-400 uppercase font-semibold font-mono">Main / Parent Projects</span>}
                value={mainProjectsCount}
                valueStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                prefix={<FolderOpenOutlined className="mr-2 text-blue-400" />}
              />
            </Card>
          </Col>

          <Col xs={12} sm={8}>
            <Card className="shadow-lg">
              <Statistic
                title={<span className="text-xs text-purple-400 uppercase font-semibold font-mono">Sub-Projects / Child Sites</span>}
                value={subProjectsCount}
                valueStyle={{ color: '#a855f7', fontWeight: 'bold' }}
                prefix={<NodeIndexOutlined className="mr-2 text-purple-400" />}
              />
            </Card>
          </Col>
        </Row>

        {/* Projects Tree View Card */}
        <Card className="shadow-2xl">
          {/* Action & View Mode Toolbar - Single Compact Line */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={projects.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Tree Nodes: {projects.length} Items
                </Tag>
              </Badge>
            </div>

            <div className="flex items-center gap-3 justify-end flex-wrap sm:flex-nowrap">
              <Input
                placeholder="Search by code, name, location..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="w-64"
              />

              {viewMode === 'TREE_TABLE' && (
                <Select value={typeFilter} onChange={setTypeFilter} className="w-44">
                  <Select.Option value="ALL">All Categories</Select.Option>
                  <Select.Option value="MAIN">Main Projects</Select.Option>
                  <Select.Option value="SUB">Sub-Projects</Select.Option>
                </Select>
              )}

              <Segmented
                options={[
                  { label: 'Nested Tree Table', value: 'TREE_TABLE', icon: <TableOutlined /> },
                  { label: 'Node Diagram View', value: 'NODE_TREE', icon: <ApartmentOutlined /> },
                ]}
                value={viewMode}
                onChange={(val) => setViewMode(val as any)}
                className="bg-slate-100 dark:bg-slate-800 p-1 shrink-0"
              />
            </div>
          </div>

          {/* VIEW MODE 1: NESTED TREE TABLE VIEW (Expandable Rows with Indentation) */}
          {viewMode === 'TREE_TABLE' && (
            <Table<Project>
              columns={columns}
              dataSource={treeTableData}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1100, y: 'calc(100vh - 490px)' }}
              defaultExpandAllRows={true}
              expandable={{
                defaultExpandAllRows: true,
                indentSize: 24,
              }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} projects`,
              }}
            />
          )}

          {/* VIEW MODE 2: INTERACTIVE HIERARCHY NODE DIAGRAM VIEW */}
          {viewMode === 'NODE_TREE' && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/10 min-h-[350px]">
              {mainProjects.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">
                  No project hierarchy tree nodes available. Create a Main Project to get started!
                </div>
              ) : (
                <Tree
                  showLine={{ showLeafIcon: false }}
                  defaultExpandAll={true}
                  treeData={getAntTreeData()}
                  selectable={false}
                  className="bg-transparent font-sans"
                />
              )}
            </div>
          )}
        </Card>
      </main>

      {/* CREATE / EDIT PROJECT MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold border-b pb-3">
            <ClusterOutlined className="text-indigo-600" />
            <span>
              {editingProject
                ? `Edit Project: ${editingProject.code}`
                : subProjectParentId || projectTypeWatch === 'SUB'
                ? 'Create Sub-Project / Child Site'
                : 'Create Main Project'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={
          editingProject
            ? 'Update Project'
            : projectTypeWatch === 'SUB'
            ? 'Create Sub-Project'
            : 'Create Main Project'
        }
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormFinish} className="mt-4">
          {mainProjects.length === 0 ? (
            <>
              <Form.Item name="project_category" initialValue="MAIN" hidden>
                <Input value="MAIN" />
              </Form.Item>
              <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                <FolderOpenOutlined className="text-indigo-500 text-base shrink-0" />
                <span>
                  Creating initial <strong>Main Project</strong>. (Sub-projects / child sites can be created under a main project once a parent project exists).
                </span>
              </div>
            </>
          ) : (
            <Form.Item
              name="project_category"
              label="Project Category / Type"
              rules={[{ required: true, message: 'Please select project category' }]}
            >
              <Radio.Group
                buttonStyle="solid"
                className="w-full grid grid-cols-2 text-center"
                onChange={(e) => {
                  if (e.target.value === 'MAIN') {
                    form.setFieldsValue({ parent_id: undefined });
                  }
                }}
              >
                <Radio.Button value="MAIN" className="text-center font-semibold">
                  <FolderOpenOutlined className="mr-1" /> Main Project
                </Radio.Button>
                <Radio.Button value="SUB" className="text-center font-semibold">
                  <NodeIndexOutlined className="mr-1" /> Sub-Project / Child Site
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {projectTypeWatch === 'SUB' && mainProjects.length > 0 && (
            <Form.Item
              name="parent_id"
              label="Select Parent Main Project"
              rules={[{ required: true, message: 'Please select parent project' }]}
              tooltip="The main project under which this sub-project/site belongs"
            >
              <Select placeholder="Select Parent Project">
                {mainProjects
                  .filter((p) => !editingProject || p.id !== editingProject.id)
                  .map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      <span className="font-semibold text-slate-800">{p.name}</span>{' '}
                      <span className="text-xs font-mono text-indigo-600">({p.code})</span>
                    </Select.Option>
                  ))}
              </Select>
            </Form.Item>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="code"
              label="Project Code"
              rules={[{ required: true, message: 'Please enter unique project code' }]}
            >
              <Input
                placeholder="e.g. PRJ-SOLAR-01 / SITE-A"
                className="font-mono font-bold uppercase"
              />
            </Form.Item>

            <Form.Item
              name="name"
              label="Project / Site Name"
              rules={[{ required: true, message: 'Please enter project name' }]}
            >
              <Input placeholder="e.g. Udaipur Solar Power Station Phase 1" />
            </Form.Item>
          </div>

          <Form.Item name="location" label="Site Location / Address">
            <Input placeholder="e.g. Plot No. 42, Kaladwas Industrial Area, Udaipur" />
          </Form.Item>

          <Form.Item name="description" label="Project Description / Scope (Optional)">
            <Input.TextArea placeholder="Enter project scope, capacity, or reference details..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};

export default ProjectsPage;
