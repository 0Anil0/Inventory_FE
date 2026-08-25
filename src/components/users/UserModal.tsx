import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import type { User, Role } from '../../types/auth';
import { encryptPasswordPayload } from '../../utils/crypto.utils';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    username: string;
    email?: string;
    password?: string;
    role_id: number;
  }) => Promise<void>;
  userToEdit?: User | null;
  roles: Role[];
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userToEdit,
  roles,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (userToEdit) {
        form.setFieldsValue({
          username: userToEdit.username,
          email: userToEdit.email || '',
          role_id: userToEdit.role_id,
          password: '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          role_id: roles[0]?.id || 1,
        });
      }
    }
  }, [userToEdit, isOpen, roles, form]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const encryptedPass = values.password ? encryptPasswordPayload(values.password) : undefined;
      await onSubmit({
        username: values.username,
        email: values.email?.trim() || undefined,
        password: encryptedPass,
        role_id: Number(values.role_id),
      });
      message.success(userToEdit ? 'User updated successfully' : 'User created successfully');
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={userToEdit ? 'Edit User Account' : 'Create New User'}
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={userToEdit ? 'Save Changes' : 'Create User'}
      destroyOnClose
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        className="mt-4"
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please enter a username' }]}
        >
          <Input prefix={<UserOutlined className="text-gray-400" />} placeholder="e.g. john_doe" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email Address"
          rules={[{ type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="john@company.com" />
        </Form.Item>

        <Form.Item
          name="password"
          label={userToEdit ? 'New Password (Optional)' : 'Password'}
          rules={[{ required: !userToEdit, message: 'Please enter a password' }]}
        >
          <Input.Password
            prefix={<LockOutlined className="text-gray-400" />}
            placeholder="••••••••"
          />
        </Form.Item>

        <Form.Item
          name="role_id"
          label="Assigned Role"
          rules={[{ required: true, message: 'Please select a role' }]}
        >
          <Select suffixIcon={<SafetyOutlined className="text-gray-400" />}>
            {roles.map((r) => (
              <Select.Option key={r.id} value={r.id}>
                <span className="font-semibold">{r.name.toUpperCase()}</span>
                {r.description && <span className="text-xs text-gray-400 ml-2">- {r.description}</span>}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};
