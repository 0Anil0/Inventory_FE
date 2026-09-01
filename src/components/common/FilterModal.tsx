import React, { useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, Button } from 'antd';
import { FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { Role } from '../../types/auth';
import type { Project, Vendor } from '../../types/inventory';

const { RangePicker } = DatePicker;

export interface FilterValues {
  role_id?: number | null;
  project_id?: number | null;
  vendor_id?: number | null;
  status?: string | null;
  health?: string | null;
  dateRange?: [any, any] | null;
  keyword?: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
  roles?: Role[];
  projects?: Project[];
  vendors?: Vendor[];
  statusOptions?: Array<{ label: string; value: string }>;
  initialValues?: FilterValues;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  roles,
  projects,
  vendors,
  statusOptions,
  initialValues,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        role_id: initialValues?.role_id || null,
        project_id: initialValues?.project_id || null,
        vendor_id: initialValues?.vendor_id || null,
        status: initialValues?.status || null,
        health: initialValues?.health || null,
        dateRange: initialValues?.dateRange || null,
        keyword: initialValues?.keyword || '',
      });
    }
  }, [isOpen, initialValues, form]);

  const handleFinish = (values: any) => {
    onApply({
      role_id: values.role_id || null,
      project_id: values.project_id || null,
      vendor_id: values.vendor_id || null,
      status: values.status || null,
      health: values.health || null,
      dateRange: values.dateRange || null,
      keyword: values.keyword?.trim() || '',
    });
    onClose();
  };

  const handleResetClick = () => {
    form.resetFields();
    onReset();
    onClose();
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 font-['Outfit'] font-bold text-indigo-500">
          <FilterOutlined />
          <span>Advanced Search & Filter Options</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
        {/* Keyword Search */}
        <Form.Item name="keyword" label="Search Keyword">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search by code, title, name or details..."
            allowClear
          />
        </Form.Item>

        {/* Project Site Filter */}
        {projects && projects.length > 0 && (
          <Form.Item name="project_id" label="Filter by Project Site">
            <Select placeholder="All Project Sites" allowClear>
              <Select.Option value={null}>All Project Sites</Select.Option>
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Supplier / Vendor Filter */}
        {vendors && vendors.length > 0 && (
          <Form.Item name="vendor_id" label="Filter by Supplier / Vendor">
            <Select placeholder="All Suppliers" allowClear>
              <Select.Option value={null}>All Suppliers</Select.Option>
              {vendors.map((v) => (
                <Select.Option key={v.id} value={v.id}>
                  {v.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Custom Status Filter */}
        {statusOptions && statusOptions.length > 0 && (
          <Form.Item name="status" label="Filter by Status">
            <Select placeholder="All Statuses" allowClear>
              <Select.Option value={null}>All Statuses</Select.Option>
              {statusOptions.map((s) => (
                <Select.Option key={s.value} value={s.value}>
                  {s.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* User Role Filter */}
        {roles && roles.length > 0 && (
          <Form.Item name="role_id" label="Filter by User Role">
            <Select placeholder="All Roles" allowClear>
              <Select.Option value={null}>All Roles</Select.Option>
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  {r.name.toUpperCase()} {r.description ? `- ${r.description}` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Date Range Filter */}
        <Form.Item name="dateRange" label="Filter by Date Range">
          <RangePicker className="w-full" />
        </Form.Item>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button icon={<ReloadOutlined />} onClick={handleResetClick}>
            Reset Filters
          </Button>
          <Button type="primary" htmlType="submit" icon={<FilterOutlined />}>
            Apply Filters
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
export default FilterModal;
