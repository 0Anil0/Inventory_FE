import React, { useEffect } from 'react';
import { Modal, Form, Input, message } from 'antd';
import type { Role } from '../../types/auth';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string }) => Promise<void>;
  roleToEdit?: Role | null;
}

export const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  roleToEdit,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen) {
      if (roleToEdit) {
        form.setFieldsValue({
          name: roleToEdit.name,
          description: roleToEdit.description || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [isOpen, roleToEdit, form]);

  const handleFinish = async (values: { name: string; description?: string }) => {
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Failed to save role');
    }
  };

  return (
    <Modal
      title={roleToEdit ? `Edit System Role: ${roleToEdit.name}` : 'Create New System Role'}
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      destroyOnClose
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
        <Form.Item
          name="name"
          label="Role Name / Identifier"
          rules={[
            { required: true, message: 'Role name is required' },
            { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Role name should only contain letters, numbers, hyphens or underscores' },
          ]}
        >
          <Input placeholder="e.g. site_engineer, store_keeper, auditor" className="lowercase" />
        </Form.Item>

        <Form.Item name="description" label="Role Description & Access Summary">
          <Input.TextArea placeholder="Describe the responsibilities or permission scope of this role..." rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default RoleModal;
