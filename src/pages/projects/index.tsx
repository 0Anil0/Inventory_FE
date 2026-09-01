import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, Tag, DatePicker, Badge, message } from 'antd';
const { RangePicker } = DatePicker;
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { Project } from '../../types/inventory';
import { projectApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await projectApi.getAll();
      if (res.success && res.projects) {
        setProjects(res.projects);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load project sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenAdd = () => {
    setProjectToEdit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (project: Project) => {
    setProjectToEdit(project);
    form.setFieldsValue({
      name: project.name,
      code: project.code,
      location: project.location || '',
      description: project.description || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await projectApi.delete(id);
      if (res.success) {
        setProjects(projects.filter((p) => p.id !== id));
        message.success('Project site deleted successfully');
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete project site');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (projectToEdit) {
        const res = await projectApi.update(projectToEdit.id, values);
        if (res.success && res.project) {
          setProjects(projects.map((p) => (p.id === projectToEdit.id ? res.project : p)));
          message.success('Project site updated successfully');
        }
      } else {
        const res = await projectApi.create(values);
        if (res.success && res.project) {
          setProjects([res.project, ...projects]);
          message.success('Project site created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save project site');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.location && p.location.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (dateRange && (p as any).createdAt) {
      const createdStr = new Date((p as any).createdAt).toISOString().slice(0, 10);
      if (createdStr < dateRange[0] || createdStr > dateRange[1]) {
        return false;
      }
    }

    return true;
  });

  const columns: ColumnsType<Project> = [
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
      title: 'Project Code',
      dataIndex: 'code',
      key: 'code',
      width: 140,
      render: (code: string) => <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{code}</span>,
    },
    {
      title: 'Project Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-semibold text-slate-800 dark:text-slate-100">{name}</span>,
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string | null) =>
        loc ? (
          <span className="text-slate-700 dark:text-slate-300">
            <EnvironmentOutlined className="mr-1 text-rose-500" />
            {loc}
          </span>
        ) : (
          <span className="text-slate-400 italic">No location</span>
        ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string | null) =>
        desc ? (
          <span className="text-slate-600 dark:text-slate-300">{desc}</span>
        ) : (
          <span className="text-slate-400 italic">No description</span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-400" />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Delete Project"
            description={`Delete project "${record.name}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-rose-400" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppstoreOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Projects Management
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Configure project sites, construction locations, and site warehouses
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchProjects} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} size="middle" onClick={handleOpenAdd}>
              Add Project
            </Button>
          </Space>
        </div>

        <Card className="shadow-2xl">
          {/* Total Records Counter Header & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Badge count={filteredProjects.length} overflowCount={999} color="#6366f1">
                <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                  Total Records: {filteredProjects.length} Project Sites
                </Tag>
              </Badge>
              {filteredProjects.length !== projects.length && (
                <span className="text-xs text-slate-500 font-medium">
                  (Filtered from {projects.length} total project sites)
                </span>
              )}
            </div>

            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              + Add Project Site
            </Button>
          </div>

          {/* Full Enterprise Toolbar: Keyword Search + Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
            <Input
              placeholder="Search by code, name, or location..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="w-full"
            />

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
                setDateRange(null);
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={filteredProjects}
            rowKey="id"
            loading={loading}
            scroll={{ x: 650, y: 360 }}
            pagination={{ pageSize: 15, showSizeChanger: true }}
          />
        </Card>
      </main>

      <Modal
        title={projectToEdit ? 'Edit Project Site' : 'Add New Project Site'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
          <Form.Item name="name" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Metro Line Extension" />
          </Form.Item>

          <Form.Item name="code" label="Project Code" rules={[{ required: true }]}>
            <Input placeholder="e.g. PRJ-MTR-02" />
          </Form.Item>

          <Form.Item name="location" label="Location / Site Address">
            <Input prefix={<EnvironmentOutlined className="text-gray-400" />} placeholder="e.g. Downtown Sector 4" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Project details or scope..." rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  );
};
export default ProjectsPage;
