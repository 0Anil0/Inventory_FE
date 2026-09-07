import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, message } from 'antd';
import { EditOutlined, DatabaseOutlined, AlertOutlined } from '@ant-design/icons';
import type { ProjectInventory } from '../../types/inventory';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    project_id: number;
    item_type_id: number;
    quantity: number;
    min_quantity?: number;
    notes?: string;
  }) => Promise<void>;
  inventoryItem: ProjectInventory | null;
  projectId: number;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  inventoryItem,
  projectId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState<boolean>(false);

  const currentProjectQty = inventoryItem?.quantity || 0;
  const itemType = inventoryItem?.item_type;

  useEffect(() => {
    if (isOpen && inventoryItem) {
      form.setFieldsValue({
        quantity: inventoryItem.quantity,
        min_quantity: inventoryItem.min_quantity || 10,
        notes: '',
      });
    }
  }, [isOpen, inventoryItem, form]);

  const handleFinish = async (values: any) => {
    const newQty = Number(values.quantity);

    setLoading(true);
    try {
      await onSubmit({
        project_id: projectId,
        item_type_id: inventoryItem!.item_type_id,
        quantity: newQty,
        min_quantity: values.min_quantity !== undefined ? Number(values.min_quantity) : undefined,
        notes: values.notes,
      });
      message.success('Item stock updated successfully');
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Failed to update quantity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EditOutlined className="text-indigo-400" />
          <span>Update Stock: <strong className="text-indigo-600 dark:text-indigo-400">{itemType?.name || 'Item'}</strong></span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Save Quantity Update"
      destroyOnClose
      centered
    >
      {/* Current Stock & Location Summary Banner */}
      <div className="bg-slate-900 p-4 rounded-xl border border-white/10 mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <DatabaseOutlined className="text-cyan-400" />
            <span>Current In-Stock Quantity</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-400">
            {currentProjectQty.toLocaleString()} {itemType?.unit || 'pcs'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Storage Location</div>
          <div className="text-xs font-semibold text-slate-200 font-mono">
            {inventoryItem?.shelf ? (
              <span>
                {inventoryItem.shelf.name} ({inventoryItem.shelf.code})
                {inventoryItem.rack && <span className="block text-indigo-400 text-[11px]">→ {inventoryItem.rack.name}</span>}
              </span>
            ) : (
              <span className="text-slate-500 italic">Unassigned</span>
            )}
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="quantity"
            label={`Updated Stock Quantity (${itemType?.unit || 'pcs'})`}
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber
              min={0}
              size="large"
              className="w-full font-mono font-bold"
            />
          </Form.Item>

          <Form.Item
            name="min_quantity"
            label={
              <span className="flex items-center gap-1">
                <AlertOutlined className="text-amber-400" /> Min Reorder Threshold
              </span>
            }
            tooltip="Triggers Low-Stock Alert when item quantity falls to or below this amount"
            rules={[{ required: true, message: 'Please enter min threshold' }]}
          >
            <InputNumber min={0} size="large" className="w-full font-mono" />
          </Form.Item>
        </div>

        <Form.Item name="notes" label="Audit Reason / Reference Notes (Optional)">
          <Input.TextArea placeholder="e.g. Physical audit count adjustment / Usage update" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
