import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, Button, Card, Tag, message } from 'antd';
import { PlusOutlined, CodeSandboxOutlined, CheckSquareOutlined, DatabaseOutlined } from '@ant-design/icons';
import type { ItemType } from '../../types/inventory';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (data: {
    items: Array<{
      item_type_id: number;
      initial_quantity: number;
    }>;
  }) => Promise<void>;
  availableItemTypes: ItemType[];
  projectName?: string;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSubmitBatch,
  availableItemTypes,
  projectName,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setSelectedIds([]);
      setItemQuantities({});
    }
  }, [isOpen, form]);

  const handleSelectChange = (ids: number[]) => {
    setSelectedIds(ids);
    const newQtyMap = { ...itemQuantities };
    ids.forEach((id) => {
      if (newQtyMap[id] === undefined) {
        newQtyMap[id] = 0;
      }
    });
    setItemQuantities(newQtyMap);
  };

  const handleSelectAll = () => {
    const allIds = availableItemTypes.map((t) => t.id);
    handleSelectChange(allIds);
    form.setFieldsValue({ selected_item_ids: allIds });
  };

  const updateItemQty = (id: number, qty: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: qty,
    }));
  };

  const handleFinish = async () => {
    if (selectedIds.length === 0) {
      message.error('Please select at least one item type to add');
      return;
    }

    // Validate quantities against master central DB stock
    for (const id of selectedIds) {
      const item = availableItemTypes.find((t) => t.id === id);
      const allocatedQty = itemQuantities[id] || 0;
      const masterAvailable = item?.total_quantity || 0;

      if (allocatedQty > masterAvailable) {
        message.error(
          `Cannot allocate ${allocatedQty} ${item?.unit} for "${item?.name}". Maximum available in DB: ${masterAvailable} ${item?.unit}`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const itemsToSubmit = selectedIds.map((id) => ({
        item_type_id: id,
        initial_quantity: itemQuantities[id] || 0,
      }));

      await onSubmitBatch({ items: itemsToSubmit });
      message.success(`Successfully allocated items to ${projectName || 'project'}`);
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Failed to add items to project');
    } finally {
      setLoading(false);
    }
  };

  const selectedItemTypes = availableItemTypes.filter((t) => selectedIds.includes(t.id));

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <PlusOutlined className="text-indigo-400" />
          <span>Add Items to Project: <strong className="text-indigo-400">{projectName || 'Project'}</strong></span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={`Add ${selectedIds.length} Selected Item${selectedIds.length === 1 ? '' : 's'}`}
      destroyOnClose
      width={720}
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
        {/* Multi-Item Dropdown Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-sm font-semibold text-slate-200">
            Select Item Types from Catalog:
          </label>
          {availableItemTypes.length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAll}
              className="text-indigo-400 font-semibold p-0"
            >
              Select All Catalog Items ({availableItemTypes.length})
            </Button>
          )}
        </div>

        <Form.Item name="selected_item_ids">
          <Select
            mode="multiple"
            placeholder="Search & select items to add..."
            size="large"
            value={selectedIds}
            onChange={handleSelectChange}
            suffixIcon={<CodeSandboxOutlined className="text-gray-400" />}
            showSearch
            optionFilterProp="children"
            className="w-full"
          >
            {availableItemTypes.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                <div className="flex items-center justify-between py-0.5">
                  <div>
                    <span className="font-semibold">{item.name}</span>{' '}
                    <span className="text-xs font-mono text-indigo-400">({item.code})</span>
                  </div>
                  <Tag color="cyan" icon={<DatabaseOutlined />} className="font-mono text-xs border-none">
                    Available in DB: {(item.total_quantity || 0).toLocaleString()} {item.unit}
                  </Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Selected Items Quantities Form List */}
        {selectedItemTypes.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Enter Quantity for Selected Items ({selectedItemTypes.length}):
            </div>

            {selectedItemTypes.map((item) => {
              const maxStock = item.total_quantity || 0;
              const currentVal = itemQuantities[item.id] || 0;
              const isExceeded = currentVal > maxStock;

              return (
                <Card
                  key={item.id}
                  size="small"
                  className={`bg-slate-900/60 border rounded-xl transition-all ${
                    isExceeded ? 'border-rose-500/80 bg-rose-950/20' : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-100">{item.name}</span>
                        <span className="text-xs font-mono text-indigo-400">({item.code})</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Available in DB:{' '}
                        <strong className="text-cyan-400 font-mono">
                          {maxStock.toLocaleString()} {item.unit}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] text-slate-400 mb-0.5">
                        Enter Quantity ({item.unit})
                      </div>
                      <InputNumber
                        min={0}
                        max={maxStock}
                        value={currentVal}
                        onChange={(v) => updateItemQty(item.id, v || 0)}
                        status={isExceeded ? 'error' : ''}
                        className="w-36"
                      />
                    </div>
                  </div>
                  {isExceeded && (
                    <div className="text-[11px] text-rose-400 mt-2 font-semibold">
                      ⚠️ Error: Entered quantity exceeds available stock in DB ({maxStock} {item.unit})
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </Form>
    </Modal>
  );
};
