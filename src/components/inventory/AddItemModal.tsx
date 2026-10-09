import React, { useEffect, useState } from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, Card, Tag, Row, Col, message } from 'antd';
import { PlusOutlined, CodeSandboxOutlined, CheckSquareOutlined, TagOutlined } from '@ant-design/icons';
import type { ItemType } from '../../types/inventory';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitBatch: (data: {
    items: Array<{
      item_type_id: number;
      initial_quantity: number;
      unit_price?: number;
      lot_number?: string;
      min_quantity?: number;
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
  const [itemRates, setItemRates] = useState<Record<number, number>>({});
  const [itemLots, setItemLots] = useState<Record<number, string>>({});
  const [itemMinQtys, setItemMinQtys] = useState<Record<number, number>>({});
  const [isSelectOpen, setIsSelectOpen] = useState<boolean>(false);

  const isGeneralStore = projectId === 0 || projectId === null || projectId === undefined;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setSelectedIds([]);
      setItemQuantities({});
      setItemRates({});
      setItemLots({});
      setItemMinQtys({});
      setIsSelectOpen(false);
    }
  }, [isOpen, form]);

  const handleSelectChange = (ids: number[]) => {
    setSelectedIds(ids);
    const newQtyMap = { ...itemQuantities };
    const newRateMap = { ...itemRates };
    const newLotMap = { ...itemLots };
    const newMinMap = { ...itemMinQtys };

    ids.forEach((id) => {
      if (newQtyMap[id] === undefined) {
        newQtyMap[id] = 0;
      }
      const item = availableItemTypes.find((t) => t.id === id);
      if (newRateMap[id] === undefined) {
        newRateMap[id] = Number(item?.unit_rate || 0);
      }
      if (newLotMap[id] === undefined) {
        newLotMap[id] = `LOT-OPENING-${Date.now().toString().slice(-4)}`;
      }
      if (newMinMap[id] === undefined) {
        newMinMap[id] = 10;
      }
    });

    setItemQuantities(newQtyMap);
    setItemRates(newRateMap);
    setItemLots(newLotMap);
    setItemMinQtys(newMinMap);
  };

  const handleSelectAll = () => {
    const allIds = availableItemTypes.map((t) => t.id);
    handleSelectChange(allIds);
    form.setFieldsValue({ selected_item_ids: allIds });
  };

  const updateItemQty = (id: number, qty: number) => {
    setItemQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const updateItemRate = (id: number, rate: number) => {
    setItemRates((prev) => ({ ...prev, [id]: rate }));
  };

  const updateItemLot = (id: number, lotNo: string) => {
    setItemLots((prev) => ({ ...prev, [id]: lotNo }));
  };

  const updateItemMinQty = (id: number, minQty: number) => {
    setItemMinQtys((prev) => ({ ...prev, [id]: minQty }));
  };

  const handleFinish = async () => {
    if (selectedIds.length === 0) {
      message.error('Please select at least one item type to add');
      return;
    }

    // Removed maxStock validation since this is for direct/opening stock entry at any location.

    setLoading(true);
    try {
      const itemsToSubmit = selectedIds.map((id) => ({
        item_type_id: id,
        initial_quantity: itemQuantities[id] || 0,
        unit_price: itemRates[id] !== undefined ? itemRates[id] : undefined,
        lot_number: itemLots[id] || undefined,
        min_quantity: itemMinQtys[id] !== undefined ? itemMinQtys[id] : undefined,
      }));

      await onSubmitBatch({ items: itemsToSubmit });
      message.success(
        isGeneralStore
          ? 'Successfully updated stock items & lots in General Store'
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
              ? 'Add / Update Opening Stock: General Store'
              : `Add Opening Stock to Project: ${projectName || 'Project'}`}
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
      width={840}
      centered
      className="top-6"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-4">
        {/* Multi-Item Dropdown Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Select Item Types from Catalog:
          </label>
          {availableItemTypes.length > 0 && (
            <Button
              type="link"
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAll}
              className="text-indigo-500 font-semibold p-0"
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
                  </div>
                  {/* Removed max stock display since it's opening stock */}
                  <Tag color="purple" className="font-mono text-xs border-none font-bold shrink-0">
                    Unit: {item.unit}
                  </Tag>
                </div>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Selected Items Quantities & Batch Rate Form Cards */}
        {selectedItemTypes.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Set Initial Quantity, Purchase Rate & Batch Info ({selectedItemTypes.length}):
            </div>

            {selectedItemTypes.map((item) => {
              const currentVal = itemQuantities[item.id] || 0;
              const currentRate = itemRates[item.id] !== undefined ? itemRates[item.id] : Number(item.unit_rate || 0);
              const currentLot = itemLots[item.id] || `LOT-OPENING-${Date.now().toString().slice(-4)}`;
              const currentMin = itemMinQtys[item.id] !== undefined ? itemMinQtys[item.id] : 10;

              return (
                <Card
                  key={item.id}
                  size="small"
                  className={`bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 rounded-xl transition-all`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                        <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">({item.code})</span>
                        {item.cat_no && (
                          <Tag color="emerald" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                            Cat: {item.cat_no}
                          </Tag>
                        )}
                        {item.unit && (
                          <Tag color="purple" className="font-mono text-[11px] border-none px-1.5 py-0 font-semibold">
                            Unit: {item.unit}
                          </Tag>
                        )}
                      </div>
                      {/* Removed maxStock display here */}
                    </div>

                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={6}>
                        <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                          Opening Stock Qty ({item.unit})
                        </div>
                        <InputNumber
                          min={0}
                          value={currentVal}
                          onChange={(v) => updateItemQty(item.id, v || 0)}
                          className="w-full"
                        />
                      </Col>

                          <Col xs={12} sm={6}>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Purchase Rate (₹/unit)
                            </div>
                            <InputNumber
                              min={0}
                              prefix="₹"
                              value={currentRate}
                              onChange={(v) => updateItemRate(item.id, v || 0)}
                              className="w-full font-mono font-bold"
                            />
                          </Col>

                          <Col xs={12} sm={6}>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Batch / Lot #
                            </div>
                            <Input
                              prefix={<TagOutlined className="text-slate-400" />}
                              value={currentLot}
                              onChange={(e) => updateItemLot(item.id, e.target.value)}
                              className="w-full font-mono text-xs"
                              placeholder="e.g. LOT-01"
                            />
                          </Col>

                          <Col xs={12} sm={6}>
                            <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                              Min Reorder Qty
                            </div>
                            <InputNumber
                              min={0}
                              value={currentMin}
                              onChange={(v) => updateItemMinQty(item.id, v || 0)}
                              className="w-full font-mono"
                            />
                          </Col>
                    </Row>
                  </div>
                  {/* Error display removed */}
                </Card>
              );
            })}
          </div>
        )}
      </Form>
    </Modal>
  );
};
