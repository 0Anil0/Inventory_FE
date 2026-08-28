import React, { useEffect } from 'react';
import { Modal, Form, InputNumber, Input, Tag, message } from 'antd';
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
  const [inputVal, setInputVal] = React.useState<number>(0);

  const currentProjectQty = inventoryItem?.quantity || 0;
  const itemType = inventoryItem?.item_type;
  const centralDbStock = itemType?.total_quantity || 0;

  // Maximum quantity that can be allocated to this project
  const maxAvailableForProject = centralDbStock + currentProjectQty;

  useEffect(() => {
    if (isOpen && inventoryItem) {
      form.setFieldsValue({
        quantity: inventoryItem.quantity,
        min_quantity: inventoryItem.min_quantity || 10,
        notes: '',
      });
      setInputVal(inventoryItem.quantity);
    }
  }, [isOpen, inventoryItem, form]);

  const handleFinish = async (values: any) => {
    const qtyToAllocate = Number(values.quantity);

    if (qtyToAllocate > maxAvailableForProject) {
      message.error(
        `Cannot allocate ${qtyToAllocate} ${itemType?.unit || 'pcs'}. Maximum available in Database: ${maxAvailableForProject} ${itemType?.unit || 'pcs'}`
      );
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        project_id: projectId,
        item_type_id: inventoryItem!.item_type_id,
        quantity: qtyToAllocate,
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

  const isExceeded = inputVal > maxAvailableForProject;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EditOutlined className="text-indigo-400" />
          <span>Update Stock: <strong className="text-indigo-400">{itemType?.name || 'Item'}</strong></span>
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
      {/* Central Database Available Stock Display */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mb-1">
            <DatabaseOutlined className="text-cyan-400" />
            <span>Available Stock in Central Database</span>
          </div>
          <Tag color="cyan" className="text-sm font-bold font-mono py-0.5 px-2.5 border-none">
            {centralDbStock.toLocaleString()} {itemType?.unit || 'pcs'}
          </Tag>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Currently Allocated</div>
          <div className="text-lg font-bold text-slate-200 font-mono">
            {currentProjectQty.toLocaleString()} {itemType?.unit || 'pcs'}
          </div>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item
            name="quantity"
            label={`Allocated Quantity (${itemType?.unit || 'pcs'})`}
            rules={[
              { required: true, message: 'Please enter quantity' },
              {
                validator: (_, value) => {
                  if (value !== undefined && value > maxAvailableForProject) {
                    return Promise.reject(
                      new Error(`Exceeds maximum available stock in DB (${maxAvailableForProject} ${itemType?.unit || 'pcs'})`)
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={0}
              max={maxAvailableForProject}
              size="large"
              className="w-full"
              onChange={(v) => setInputVal(v || 0)}
              status={isExceeded ? 'error' : ''}
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
            <InputNumber min={0} size="large" className="w-full" />
          </Form.Item>
        </div>

        <Form.Item name="notes" label="Audit Reason / Reference Notes (Optional)">
          <Input.TextArea placeholder="e.g. Received Delivery Batch #401 or Usage for Phase 2" rows={2} />
        </Form.Item>

        {isExceeded && (
          <div className="text-xs text-rose-400 font-semibold mb-2">
            ⚠️ Allocated quantity cannot exceed maximum available stock in Database ({maxAvailableForProject} {itemType?.unit})
          </div>
        )}
      </Form>
    </Modal>
  );
};
