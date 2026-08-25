import React, { useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, Button } from 'antd';
import { FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { Role } from '../../types/auth';

const { RangePicker } = DatePicker;

export interface FilterValues {
  role_id?: number | null;
  dateRange?: [any, any] | null;
  keyword?: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
  roles: Role[];
  initialValues?: FilterValues;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApply,
  onReset,
  roles,
  initialValues,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({
        role_id: initialValues?.role_id || null,
        dateRange: initialValues?.dateRange || null,
        keyword: initialValues?.keyword || '',
      });
    }
  }, [isOpen, initialValues, form]);

  const handleFinish = (values: any) => {
    onApply({
      role_id: values.role_id || null,
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
        <div className="flex items-center gap-2">
          <FilterOutlined className="text-indigo-400" />
          <span>Advanced Filter</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="mt-4"
      >
        {/* Keyword Filter */}
        <Form.Item name="keyword" label="Search Keyword">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Search by name or email..."
            allowClear
          />
        </Form.Item>

        {/* Role Filter */}
        <Form.Item name="role_id" label="Filter by Role">
          <Select placeholder="All Roles" allowClear>
            <Select.Option value={null}>All Roles</Select.Option>
            {roles.map((r) => (
              <Select.Option key={r.id} value={r.id}>
                {r.name.toUpperCase()} {r.description ? `- ${r.description}` : ''}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Date Range Filter */}
        <Form.Item name="dateRange" label="Created Date Range">
          <RangePicker className="w-full" />
        </Form.Item>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button icon={<ReloadOutlined />} onClick={handleResetClick}>
            Reset
          </Button>
          <Button type="primary" htmlType="submit" icon={<FilterOutlined />}>
            Apply Filters
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
