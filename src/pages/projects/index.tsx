import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Popconfirm, Space, message } from 'antd';
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
import { Navbar } from '../../components/layout/Navbar';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

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
      message.error(err.message || 'Failed to load projects list');
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
        message.success('Project deleted successfully');
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete project');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (projectToEdit) {
        const res = await projectApi.update(projectToEdit.id, values);
        if (res.success && res.project) {
          setProjects(projects.map((p) => (p.id === projectToEdit.id ? res.project : p)));
          message.success('Project updated successfully');
        }
      } else {
        const res = await projectApi.create(values);
        if (res.success && res.project) {
          setProjects([...projects, res.project]);
          message.success('Project created successfully');
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      message.error(err.message || 'Failed to save project');
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  const columns: ColumnsType<Project> = [
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
    <div className="min-h-screen app-page-bg flex flex-col">
      <div className="background-decor">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>

      <Navbar />

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
          <div className="mb-6">
            <Input
              placeholder="Search projects by code, name, or location..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md w-full"
              allowClear
            />
          </div>

          <Table
            columns={columns}
            dataSource={filteredProjects}
            rowKey="id"
            loading={loading}
            scroll={{ x: 650 }}
            pagination={{ pageSize: 8 }}
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
    </div>
  );
};
export default ProjectsPage;
