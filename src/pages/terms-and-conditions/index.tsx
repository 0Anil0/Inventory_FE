import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Modal, Form, Checkbox, Popconfirm, Space, Tag, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  EyeOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { TermsAndConditions } from '../../types/inventory';
import { termsApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

export const TermsAndConditionsPage: React.FC = () => {
  const [templates, setTemplates] = useState<TermsAndConditions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Responsive desktop check (>= 1024px)
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [templateToEdit, setTemplateToEdit] = useState<TermsAndConditions | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<TermsAndConditions | null>(null);
  const [form] = Form.useForm();

  const fetchTemplates = async (page = currentPage, limit = pageSize, search = searchQuery) => {
    setLoading(true);
    try {
      const res = await termsApi.getAll({
        page,
        limit,
        search: search || undefined,
      });

      if (res.success && res.templates) {
        setTemplates(res.templates);
        setTotalCount(res.total ?? res.templates.length);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load Terms & Conditions templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(1, pageSize, searchQuery);
  }, []);

  const handlePageChange = (page: number, newPageSize: number) => {
    setCurrentPage(page);
    setPageSize(newPageSize);
    fetchTemplates(page, newPageSize, searchQuery);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    fetchTemplates(1, pageSize, val);
  };

  const handleOpenAdd = () => {
    setTemplateToEdit(null);
    form.resetFields();
    form.setFieldsValue({
      title: 'Purchase Order Standard Terms & Conditions',
      payment_terms: '20% Advance with PO',
      inco_terms: 'Freight on Road',
      is_default: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: TermsAndConditions) => {
    setTemplateToEdit(template);
    form.setFieldsValue({
      title: template.title,
      payment_terms: template.payment_terms || '',
      inco_terms: template.inco_terms || '',
      content: template.content,
      is_default: template.is_default,
    });
    setIsModalOpen(true);
  };

  const handleOpenPreview = (template: TermsAndConditions) => {
    setSelectedPreview(template);
    setIsPreviewOpen(true);
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await termsApi.setDefault(id);
      if (res.success) {
        message.success('Default PO Terms & Conditions updated');
        fetchTemplates(currentPage, pageSize, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to set default template');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await termsApi.delete(id);
      if (res.success) {
        message.success('Terms & Conditions template removed');
        fetchTemplates(currentPage, pageSize, searchQuery);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to delete template');
    }
  };

  const handleFinish = async (values: any) => {
    try {
      if (templateToEdit) {
        const res = await termsApi.update(templateToEdit.id, values);
        if (res.success) {
          message.success('Template updated successfully');
        }
      } else {
        const res = await termsApi.create(values);
        if (res.success) {
          message.success('New template created successfully');
        }
      }
      setIsModalOpen(false);
      fetchTemplates(currentPage, pageSize, searchQuery);
    } catch (err: any) {
      message.error(err.message || 'Failed to save template');
    }
  };

  const columns: ColumnsType<TermsAndConditions> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 70,
      align: 'center',
      fixed: 'left',
      render: (_, __, index: number) => (
        <span className="font-mono font-bold text-slate-500">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Template Title & Scope',
      dataIndex: 'title',
      key: 'title',
      fixed: 'left',
      render: (title: string, record) => (
        <div>
          <div className="font-bold app-text-main flex items-center gap-2 font-['Outfit'] text-base">
            <FileTextOutlined className="text-indigo-500" />
            {title}
            {record.is_default && (
              <Tag color="purple" icon={<CheckCircleOutlined />} className="font-bold text-xs py-0.5 px-2.5 rounded-full border-none">
                PO DEFAULT TEMPLATE
              </Tag>
            )}
          </div>
          <div className="text-xs app-text-muted mt-0.5 line-clamp-1 font-mono">
            {record.content.slice(0, 90)}...
          </div>
        </div>
      ),
    },
    {
      title: 'Payment Terms',
      dataIndex: 'payment_terms',
      key: 'payment_terms',
      width: 180,
      render: (pt: string | null) =>
        pt ? (
          <Tag color="cyan" className="font-semibold text-xs py-0.5 px-2 font-mono">
            {pt}
          </Tag>
        ) : (
          <span className="text-xs text-slate-400 italic">N/A</span>
        ),
    },
    {
      title: 'Inco Terms',
      dataIndex: 'inco_terms',
      key: 'inco_terms',
      width: 160,
      render: (it: string | null) =>
        it ? (
          <Tag color="blue" className="font-semibold text-xs py-0.5 px-2 font-mono">
            {it}
          </Tag>
        ) : (
          <span className="text-xs text-slate-400 italic">N/A</span>
        ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      align: 'right',
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Preview Formatted Document">
            <Button
              type="text"
              icon={<EyeOutlined className="text-sky-500 text-base" />}
              onClick={() => handleOpenPreview(record)}
            />
          </Tooltip>

          {!record.is_default ? (
            <Tooltip title="Set as Default for PO PDFs">
              <Button
                type="text"
                icon={<StarOutlined className="text-amber-500 text-base" />}
                onClick={() => handleSetDefault(record.id)}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Current Active PO Default">
              <Button type="text" icon={<StarFilled className="text-amber-500 text-base" />} />
            </Tooltip>
          )}

          <Button
            type="text"
            icon={<EditOutlined className="text-indigo-600 dark:text-indigo-400 text-base" />}
            onClick={() => handleOpenEdit(record)}
          />

          <Popconfirm
            title="Delete Template"
            description={`Delete template "${record.title}"?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" icon={<DeleteOutlined className="text-rose-500 text-base" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <FileTextOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Terms & Conditions Templates
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Manage Purchase Order legal clauses, payment terms, and inco terms templates
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchTemplates(currentPage, pageSize, searchQuery)} loading={loading}>
              Refresh
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd} className="shadow-lg shadow-indigo-500/30">
              Create T&C Template
            </Button>
          </Space>
        </div>

        {/* Card & Table View */}
        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <Input
              placeholder="Search Templates by Title, Payment Terms, or Clauses..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              className="flex-1 max-w-lg"
            />
            <span className="text-xs font-bold text-indigo-500 shrink-0">Total Templates: {totalCount}</span>
          </div>

          <div className="flex-1 overflow-visible lg:overflow-hidden">
            <Table
              columns={columns}
              dataSource={templates}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 800,
                y: isDesktop ? 'calc(100vh - 480px)' : undefined,
              }}
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ['10', '15', '25', '50'],
                onChange: handlePageChange,
              }}
            />
          </div>
        </Card>
      </main>

      {/* Add / Edit Template Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FileTextOutlined className="text-indigo-500 text-lg" />
            <span className="font-bold text-lg font-['Outfit']">
              {templateToEdit ? 'Edit T&C Template' : 'Create T&C Template'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        centered
        width={750}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10">
          <Form.Item
            name="title"
            label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Template Title</span>}
            rules={[{ required: true, message: 'Template Title is required' }]}
          >
            <Input placeholder="e.g. Standard Purchase Order Terms & Conditions (Udaipur Plant)" size="large" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <Form.Item
              name="payment_terms"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Payment Terms</span>}
            >
              <Input placeholder="e.g. 20% Advance with PO" size="large" />
            </Form.Item>

            <Form.Item
              name="inco_terms"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Inco Terms</span>}
            >
              <Input placeholder="e.g. Freight on Road" size="large" />
            </Form.Item>
          </div>

          <Form.Item
            name="content"
            label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Full Terms & Conditions Clauses Text</span>}
            rules={[{ required: true, message: 'Content text is required' }]}
          >
            <Input.TextArea
              rows={12}
              placeholder="Paste or edit full 1-9 clauses of terms & conditions..."
              className="font-mono text-xs leading-relaxed"
            />
          </Form.Item>

          <Form.Item name="is_default" valuePropName="checked" className="mb-0">
            <Checkbox>
              <span className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
                Set as Default Template for Purchase Order (PO) PDFs
              </span>
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      {/* Formatted Preview Document Modal */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-6 text-slate-800 dark:text-slate-100">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-indigo-500 text-lg" />
              <span className="font-bold text-lg font-['Outfit']">{selectedPreview?.title}</span>
            </div>
            {selectedPreview?.is_default && (
              <Tag color="purple" className="font-bold text-xs py-0.5 px-2.5 border-none">
                PO DEFAULT
              </Tag>
            )}
          </div>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        centered
        width={750}
        footer={[
          <Button key="close" onClick={() => setIsPreviewOpen(false)}>
            Close Preview
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            className="bg-indigo-600"
          >
            Print Preview
          </Button>,
        ]}
      >
        {selectedPreview && (
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Payment Terms:</span>
                <span className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 font-mono">
                  {selectedPreview.payment_terms || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Inco Terms:</span>
                <span className="font-semibold text-sm text-sky-600 dark:text-sky-400 font-mono">
                  {selectedPreview.inco_terms || 'N/A'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 border-b pb-1 border-slate-200 dark:border-white/10">
                Terms & Conditions Legal Clauses:
              </h4>
              <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {selectedPreview.content}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};

export default TermsAndConditionsPage;
