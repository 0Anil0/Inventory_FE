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
  projectId?: number;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSubmitBatch,
  availableItemTypes,
  projectName,
  projectId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({});
  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false);

  const isGeneralStore = projectId === 0 || projectId === null || projectId === undefined;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setSelectedIds([]);
      setItemQuantities({});
      setIsSelectOpen(false);
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

    // Validate quantities if allocating to a project (not general store)
    if (!isGeneralStore) {
      for (const id of selectedIds) {
        const item = availableItemTypes.find((t) => t.id === id);
        const allocatedQty = itemQuantities[id] || 0;
        const masterAvailable = item?.total_quantity || 0;

        if (allocatedQty > masterAvailable) {
          message.error(
            `Cannot allocate ${allocatedQty} ${item?.unit} for "${item?.name}". Maximum available in Main Store: ${masterAvailable} ${item?.unit}`
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      const itemsToSubmit = selectedIds.map((id) => ({
        item_type_id: id,
        initial_quantity: itemQuantities[id] || 0,
      }));

      await onSubmitBatch({ items: itemsToSubmit });
      message.success(
        isGeneralStore
          ? 'Successfully updated stock items in General Store'
          : `Successfully allocated items to ${projectName || 'project'}`
      );
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Failed to update stock items');
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
          <span>
            {isGeneralStore
              ? 'Add / Update Stock Items: General Store'
              : `Allocate Items to Project: ${projectName || 'Project'}`}
          </span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={
        isGeneralStore
          ? `Add ${selectedIds.length} Stock Item${selectedIds.length === 1 ? '' : 's'}`
          : `Allocate ${selectedIds.length} Item${selectedIds.length === 1 ? '' : 's'}`
      }
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
            open={isSelectOpen}
            onDropdownVisibleChange={(open) => setIsSelectOpen(open)}
            onSelect={() => setIsSelectOpen(false)}
            maxTagCount="responsive"
            placeholder="Search & select items to add..."
            size="large"
            value={selectedIds}
            onChange={handleSelectChange}
            suffixIcon={<CodeSandboxOutlined className="text-gray-400" />}
            showSearch
            filterOption={(input, option) => {
              const item = availableItemTypes.find((t) => t.id === option?.value);
              if (!item) return false;
              const q = input.toLowerCase().trim();
              const name = (item.name || '').toLowerCase();
              const code = (item.code || '').toLowerCase();
              const fullDesc = (item.full_description || '').toLowerCase();
              const catNo = (item.cat_no || '').toLowerCase();
              const rating = (item.rating || '').toLowerCase();
              const make = (item.make || '').toLowerCase();
              const unit = (item.unit || '').toLowerCase();
              return (
                name.includes(q) ||
                code.includes(q) ||
                fullDesc.includes(q) ||
                catNo.includes(q) ||
                rating.includes(q) ||
                make.includes(q) ||
                unit.includes(q)
              );
            }}
            className="w-full"
          >
            {availableItemTypes.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-none">
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.name}</span>
                      <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        ({item.code})
                      </span>
                      {item.cat_no && (
                        <Tag color="emerald" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                          Cat: {item.cat_no}
                        </Tag>
                      )}
                      {item.make && (
                        <Tag color="blue" className="text-[11px] border-none px-1.5 py-0 font-semibold">
                          {item.make}
                        </Tag>
                      )}
                    </div>
                    {(item.full_description || item.rating) && (
                      <div className="text-xs text-slate-400 dark:text-slate-400 truncate">
                        {item.full_description || item.rating}
                      </div>
                    )}
                  </div>
                  {isGeneralStore ? (
                    <Tag color="purple" className="font-mono text-xs border-none font-bold shrink-0">
                      Unit: {item.unit}
                    </Tag>
                  ) : (
                    <Tag color="cyan" icon={<DatabaseOutlined />} className="font-mono text-xs border-none font-bold shrink-0">
                      Avail: {(item.total_quantity || 0).toLocaleString()} {item.unit}
                    </Tag>
                  )}
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Selected Items Quantities Form List */}
        {selectedItemTypes.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              {isGeneralStore
                ? `Set Initial Quantity for Stock Items (${selectedItemTypes.length}):`
                : `Enter Quantity to Allocate to Project (${selectedItemTypes.length}):`}
            </div>

            {selectedItemTypes.map((item) => {
              const maxStock = item.total_quantity || 0;
              const currentVal = itemQuantities[item.id] || 0;
              const isExceeded = !isGeneralStore && currentVal > maxStock;

              return (
                <Card
                  key={item.id}
                  size="small"
                  className={`bg-slate-50 dark:bg-slate-900/60 border rounded-xl transition-all ${
                    isExceeded
                      ? 'border-rose-500/80 bg-rose-50 dark:bg-rose-950/20'
                      : 'border-slate-200 dark:border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                        <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">({item.code})</span>
                        {item.cat_no && (
                          <Tag color="emerald" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                            Cat: {item.cat_no}
                          </Tag>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {isGeneralStore ? (
                          <span>
                            Item Unit: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{item.unit}</strong>
                          </span>
                        ) : (
                          <span>
                            Available in Main Store:{' '}
                            <strong className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                              {maxStock.toLocaleString()} {item.unit}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                        {isGeneralStore ? `New Stock Qty (${item.unit})` : `Allocate Qty (${item.unit})`}
                      </div>
                      <InputNumber
                        min={0}
                        max={isGeneralStore ? undefined : maxStock}
                        value={currentVal}
                        onChange={(v) => updateItemQty(item.id, v || 0)}
                        status={isExceeded ? 'error' : ''}
                        className="w-36"
                      />
                    </div>
                  </div>
                  {isExceeded && (
                    <div className="text-[11px] text-rose-500 dark:text-rose-400 mt-2 font-semibold">
                      ⚠️ Error: Entered quantity exceeds available stock in Main Store ({maxStock} {item.unit})
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
