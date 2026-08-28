import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { Project, ProjectInventory } from '../../types/inventory';
import { inventoryApi } from '../../services/api';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  currentProjectId?: number | null;
  currentInventory: ProjectInventory[];
}

export const TransferStockModal: React.FC<TransferStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
  currentProjectId,
  currentInventory,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ProjectInventory | null>(null);

  const fromProjectId = currentProjectId || projects[0]?.id;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      if (fromProjectId) {
        form.setFieldsValue({ from_project_id: fromProjectId });
      }
    }
  }, [isOpen, fromProjectId, form]);

  const availableItems = currentInventory.filter((item) => item.quantity > 0);

  const handleFinish = async (values: any) => {
    if (values.from_project_id === values.to_project_id) {
      message.error('Source and Destination projects cannot be the same!');
      return;
    }

    setLoading(true);
    try {
      await inventoryApi.transferStock({
        from_project_id: values.from_project_id,
        to_project_id: values.to_project_id,
        item_type_id: values.item_type_id,
        quantity: Number(values.quantity),
        notes: values.notes,
      });
      message.success('Stock transferred successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Stock transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SwapOutlined className="text-indigo-400" />
          <span>Inter-Project Stock Transfer</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Execute Transfer"
      destroyOnClose
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="from_project_id"
            label="Source Project (From)"
            rules={[{ required: true, message: 'Select source project' }]}
          >
            <Select disabled placeholder="Source Project">
              {projects.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="to_project_id"
            label="Destination Project (To)"
            rules={[{ required: true, message: 'Select destination project' }]}
          >
            <Select placeholder="Select Target Project">
              {projects
                .filter((p) => p.id !== fromProjectId)
                .map((p) => (
                  <Select.Option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name="item_type_id"
          label="Item to Transfer"
          rules={[{ required: true, message: 'Select item' }]}
        >
          <Select
            placeholder="Select available item"
            onChange={(val) => {
              const inv = currentInventory.find((i) => i.item_type_id === val);
              setSelectedItem(inv || null);
            }}
          >
            {availableItems.map((inv) => (
              <Select.Option key={inv.item_type_id} value={inv.item_type_id}>
                {inv.item_type?.name} ({inv.item_type?.code}) — Available: {inv.quantity}{' '}
                {inv.item_type?.unit}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {selectedItem && (
          <div className="text-xs text-indigo-400 font-semibold mb-3">
            ℹ️ Available Stock in Source Project: {selectedItem.quantity} {selectedItem.item_type?.unit}
          </div>
        )}

        <Form.Item
          name="quantity"
          label="Quantity to Transfer"
          rules={[
            { required: true, message: 'Please enter quantity' },
            {
              validator: (_, value) => {
                if (selectedItem && value > selectedItem.quantity) {
                  return Promise.reject(
                    new Error(`Cannot transfer more than available quantity (${selectedItem.quantity})`)
                  );
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber
            min={1}
            max={selectedItem ? selectedItem.quantity : undefined}
            className="w-full"
            size="large"
          />
        </Form.Item>

        <Form.Item name="notes" label="Transfer Reference / Remarks (Optional)">
          <Input.TextArea placeholder="e.g. Requested for Emergency Paving Work at Site B" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
