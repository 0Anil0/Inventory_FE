import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  InputNumber,
  Input,
  Card,
  Tag,
  Button,
  Table,
  Badge,
  Tabs,
  Steps,
  Divider,
  message,
} from 'antd';
import {
  SwapOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  UserOutlined,
  InfoCircleOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { Project, ProjectInventory, InventoryLot } from '../../types/inventory';
import { inventoryApi, inventoryLotApi, reportApi } from '../../services/api';
import { filterSelectOption } from '../../utils/select.utils';

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
  const [activeTab, setActiveTab] = useState<string>('transfer');
  const [loading, setLoading] = useState<boolean>(false);

  // Form selections
  const initialFromId =
    currentProjectId !== undefined && currentProjectId !== null && currentProjectId !== -1
      ? currentProjectId
      : undefined;

  const [selectedFromProjectId, setSelectedFromProjectId] = useState<number | undefined>(initialFromId);
  const [selectedToProjectId, setSelectedToProjectId] = useState<number | undefined>(undefined);
  const [sourceInventory, setSourceInventory] = useState<ProjectInventory[]>([]);
  const [loadingSourceInv, setLoadingSourceInv] = useState<boolean>(false);
  const [selectedItemTypeId, setSelectedItemTypeId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<ProjectInventory | null>(null);
  const [availableLots, setAvailableLots] = useState<InventoryLot[]>([]);
  const [loadingLots, setLoadingLots] = useState<boolean>(false);
  const [selectedLotId, setSelectedLotId] = useState<number | undefined>(undefined);
  const [selectedLot, setSelectedLot] = useState<InventoryLot | null>(null);
  const [transferQty, setTransferQty] = useState<number | undefined>(undefined);

  // Audit History state
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      const defaultFrom =
        currentProjectId !== undefined && currentProjectId !== null && currentProjectId !== -1
          ? currentProjectId
          : undefined;

      setSelectedFromProjectId(defaultFrom);
      setSelectedToProjectId(undefined);
      form.setFieldsValue({ from_project_id: defaultFrom, to_project_id: undefined });
      setSelectedItemTypeId(null);
      setSelectedItem(null);
      setSelectedLotId(undefined);
      setSelectedLot(null);
      setTransferQty(undefined);
      setAvailableLots([]);

      if (defaultFrom !== undefined) {
        fetchSourceInventory(defaultFrom);
      } else {
        setSourceInventory([]);
      }
      loadTransferHistory();
    }
  }, [isOpen, currentProjectId, form]);

  const fetchSourceInventory = async (projId: number) => {
    setLoadingSourceInv(true);
    try {
      const res = await inventoryApi.getByProject(projId);
      if (res.success && res.inventory) {
        setSourceInventory(res.inventory);
      }
    } catch (err: any) {
      console.error('Failed to fetch source location inventory', err);
    } finally {
      setLoadingSourceInv(false);
    }
  };

  const loadTransferHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await reportApi.getStockTransfers();
      if (res.success && res.reports) {
        setTransferHistory(res.reports);
      }
    } catch (err: any) {
      console.error('Failed to fetch transfer audit history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleFromLocationChange = (val: number) => {
    setSelectedFromProjectId(val);
    setSelectedItemTypeId(null);
    setSelectedItem(null);
    setSelectedLotId(undefined);
    setSelectedLot(null);
    setTransferQty(undefined);
    setAvailableLots([]);
    form.setFieldsValue({ item_type_id: undefined, lot_id: undefined, quantity: undefined });
    fetchSourceInventory(val);
  };

  const handleToLocationChange = (val: number) => {
    setSelectedToProjectId(val);
  };

  const handleItemTypeChange = async (itemTypeId: number) => {
    setSelectedItemTypeId(itemTypeId);
    const inv = sourceInventory.find((i) => i.item_type_id === itemTypeId);
    setSelectedItem(inv || null);
    setSelectedLotId(undefined);
    setSelectedLot(null);
    setTransferQty(undefined);
    form.setFieldsValue({ lot_id: undefined, quantity: undefined });

    if (selectedFromProjectId !== undefined) {
      setLoadingLots(true);
      try {
        const res = await inventoryLotApi.getAvailableLots({
          project_id: selectedFromProjectId,
          item_type_id: itemTypeId,
        });
        if (res.success && res.lots) {
          setAvailableLots(res.lots.filter((l) => l.available_qty > 0));
        }
      } catch (err) {
        console.error('Failed to load lots for item:', err);
      } finally {
        setLoadingLots(false);
      }
    }
  };

  const handleLotChange = (lotId: number | undefined) => {
    setSelectedLotId(lotId);
    if (lotId) {
      const lot = availableLots.find((l) => l.id === lotId);
      setSelectedLot(lot || null);
      if (lot && transferQty && transferQty > lot.available_qty) {
        setTransferQty(lot.available_qty);
        form.setFieldsValue({ quantity: lot.available_qty });
      }
    } else {
      setSelectedLot(null);
    }
  };

  const allLocations = [
    { id: 0, name: 'General Stock / Main Store', code: 'MAIN-STORE' },
    ...projects,
  ];

  const sourceLocationName =
    selectedFromProjectId !== undefined
      ? allLocations.find((l) => l.id === selectedFromProjectId)?.name || 'Source Location'
      : 'Source Location';

  const targetLocationName =
    selectedToProjectId !== undefined
      ? allLocations.find((l) => l.id === selectedToProjectId)?.name || 'Destination Location'
      : 'Destination Location';

  const availableItems = sourceInventory.filter((item) => item.quantity > 0);

  const maxAllowedQty = selectedLot
    ? selectedLot.available_qty
    : selectedItem
    ? selectedItem.quantity
    : 0;

  const unitRate = selectedLot
    ? Number(selectedLot.unit_price || 0)
    : Number(selectedItem?.item_type?.unit_rate || 0);

  const estimatedValuation = (transferQty || 0) * unitRate;

  // Compute Current Form Step
  let currentStep = 0;
  if (selectedFromProjectId !== undefined && selectedToProjectId !== undefined) currentStep = 1;
  if (selectedItemTypeId) currentStep = 2;
  if (transferQty && transferQty > 0 && transferQty <= maxAllowedQty) currentStep = 3;

  const handleFinish = async (values: any) => {
    if (values.from_project_id === values.to_project_id) {
      message.error('Source and Destination locations must be different!');
      return;
    }

    setLoading(true);
    try {
      const res = await inventoryApi.transferStock({
        from_project_id: values.from_project_id,
        to_project_id: values.to_project_id,
        item_type_id: values.item_type_id,
        quantity: Number(values.quantity),
        lot_id: values.lot_id ? Number(values.lot_id) : undefined,
        notes: values.notes,
      });

      message.success(
        res.message || `Stock transferred successfully! [Ref: ${res.transfer_ref || 'TRF-2026'}]`
      );
      onSuccess();
      loadTransferHistory();
      onClose();
    } catch (err: any) {
      message.error(err.message || 'Stock transfer failed');
    } finally {
      setLoading(false);
    }
  };

  // Filter audit history by search query
  const filteredHistory = transferHistory.filter((item) => {
    const q = historySearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.item_type?.name || '').toLowerCase().includes(q) ||
      (item.item_type?.code || '').toLowerCase().includes(q) ||
      (item.notes || '').toLowerCase().includes(q) ||
      (item.user?.username || '').toLowerCase().includes(q) ||
      (item.project?.name || '').toLowerCase().includes(q)
    );
  });

  const parseTransferNotes = (notes?: string) => {
    if (!notes) return { ref: null, movementText: 'Inter-Project Stock Transfer', lot: null, remarks: null };

    const refMatch = notes.match(/\[Ref:\s*([^\]]+)\]/);
    const ref = refMatch ? refMatch[1] : null;
    const cleanNotes = notes.replace(/\[Ref:\s*([^\]]+)\]/, '').trim();

    const parts = cleanNotes.split('|').map((s) => s.trim());
    const movementText = parts[0] || 'Stock Transfer';
    const lotPart = parts.find((p) => p.startsWith('Lot #'));
    const remarksPart = parts.slice(1).filter((p) => !p.startsWith('Lot #')).join(' | ');

    return {
      ref,
      movementText,
      lot: lotPart,
      remarks: remarksPart,
    };
  };

  const historyColumns = [
    {
      title: 'Ref No.',
      key: 'ref',
      width: 120,
      render: (_: any, r: any) => {
        const parsed = parseTransferNotes(r.notes);
        return (
          <Tag color="purple" className="font-mono font-bold text-xs px-2 py-0.5 border-none">
            {parsed.ref || 'TRF-2026'}
          </Tag>
        );
      },
    },
    {
      title: 'Timestamp & User',
      key: 'time',
      width: 160,
      render: (_: any, r: any) => (
        <div>
          <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
            {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : 'N/A'}
          </div>
          <div className="text-[11px] text-indigo-500 font-medium flex items-center gap-1 mt-0.5">
            <UserOutlined /> {r.user?.username || 'System User'}
          </div>
        </div>
      ),
    },
    {
      title: 'Item Description',
      key: 'item',
      width: 180,
      render: (_: any, r: any) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 text-xs font-['Outfit']">
            {r.item_type?.name || 'Item'}
          </div>
          <div className="text-[11px] font-mono text-indigo-500 font-semibold">
            {r.item_type?.code} ({r.item_type?.unit || 'pcs'})
          </div>
        </div>
      ),
    },
    {
      title: 'Shifted Qty',
      key: 'quantity',
      width: 100,
      align: 'center' as const,
      render: (_: any, r: any) => (
        <Tag color="cyan" className="font-mono font-bold text-xs px-2 py-0.5 border-none">
          {r.quantity} {r.item_type?.unit || 'pcs'}
        </Tag>
      ),
    },
    {
      title: 'Audit Movement & Lot Details',
      key: 'notes',
      render: (_: any, r: any) => {
        const parsed = parseTransferNotes(r.notes);
        return (
          <div className="flex flex-col gap-1 text-xs">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {parsed.movementText}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {parsed.lot && (
                <Tag color="gold" className="font-mono text-[10px] border-none px-1.5 py-0">
                  {parsed.lot}
                </Tag>
              )}
              {parsed.remarks && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Note: {parsed.remarks}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-white/10 pr-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <SwapOutlined className="text-lg text-indigo-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-['Outfit'] mb-0 leading-tight">
                Inter-Project Stock Transfer
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0">
                Shift material items & PO lots between project locations with full audit tracking
              </p>
            </div>
          </div>
          <Badge count={transferHistory.length} overflowCount={99} color="#6366f1">
            <Tag color="indigo" className="font-mono font-semibold px-2.5 py-0.5 border-none text-xs">
              Audit Logs: {transferHistory.length}
            </Tag>
          </Badge>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      centered
      width={1020}
      style={{ top: 20 }}
      bodyStyle={{ padding: '12px 20px 20px 20px' }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="custom-transfer-tabs"
        items={[
          {
            key: 'transfer',
            label: (
              <span className="flex items-center gap-2 font-semibold px-1">
                <SwapOutlined /> Execute New Stock Transfer
              </span>
            ),
            children: (
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto pr-1">
                {/* Visual Step Progress Bar */}
                <div className="mb-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-white/10">
                  <Steps
                    size="small"
                    current={currentStep}
                    items={[
                      { title: 'Locations', description: 'Source & Target' },
                      { title: 'Material Item', description: 'Item & PO Lot' },
                      { title: 'Quantity', description: 'Transfer Amount' },
                      { title: 'Execute', description: 'Confirm' },
                    ]}
                  />
                </div>

                <Form form={form} layout="vertical" onFinish={handleFinish}>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* LEFT COLUMN: FORM CONTROLS (7 Cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-3">
                      {/* SECTION 1: ROUTING LOCATIONS (INLINE GRID) */}
                      <Card
                        size="small"
                        title={
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <DatabaseOutlined /> 1. Location Routing
                          </span>
                        }
                        className="shadow-sm border-slate-200 dark:border-white/10"
                        bodyStyle={{ padding: '12px' }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-2 items-center">
                          <Form.Item
                            name="from_project_id"
                            label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Source Location (From)</span>}
                            rules={[{ required: true, message: 'Select source' }]}
                            className="mb-0"
                          >
                            <Select
                              placeholder="Select Source Location"
                              showSearch
                              filterOption={filterSelectOption}
                              onChange={handleFromLocationChange}
                              size="middle"
                            >
                              {allLocations.map((loc) => (
                                <Select.Option key={loc.id} value={loc.id}>
                                  <span className="font-bold text-xs">{loc.name}</span>{' '}
                                  <span className="text-[10px] font-mono text-indigo-500">({loc.code})</span>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>

                          <div className="flex items-center justify-center pt-4 sm:pt-4">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 text-xs">
                              <ArrowRightOutlined className="rotate-90 sm:rotate-0" />
                            </div>
                          </div>

                          <Form.Item
                            name="to_project_id"
                            label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Destination Location (To)</span>}
                            rules={[{ required: true, message: 'Select destination' }]}
                            className="mb-0"
                          >
                            <Select
                              placeholder="Select Target Location"
                              showSearch
                              filterOption={filterSelectOption}
                              onChange={handleToLocationChange}
                              size="middle"
                            >
                              {allLocations
                                .filter((loc) => selectedFromProjectId === undefined || loc.id !== selectedFromProjectId)
                                .map((loc) => (
                                  <Select.Option key={loc.id} value={loc.id}>
                                    <span className="font-bold text-xs">{loc.name}</span>{' '}
                                    <span className="text-[10px] font-mono text-indigo-500">({loc.code})</span>
                                  </Select.Option>
                                ))}
                            </Select>
                          </Form.Item>
                        </div>
                      </Card>

                      {/* SECTION 2: MATERIAL ITEM & PO LOT */}
                      <Card
                        size="small"
                        title={
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <DatabaseOutlined className="text-indigo-500" /> 2. Material & Stock Lot Selection
                            </span>
                            {loadingSourceInv && <span className="text-xs text-indigo-500">Loading stock...</span>}
                          </div>
                        }
                        className="shadow-sm border-slate-200 dark:border-white/10"
                        bodyStyle={{ padding: '12px' }}
                      >
                        <Form.Item
                          name="item_type_id"
                          label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Material Item Available in Source Location</span>}
                          rules={[{ required: true, message: 'Please select material item' }]}
                          className="mb-2"
                        >
                          <Select
                            placeholder={
                              selectedFromProjectId === undefined
                                ? 'First select source location above...'
                                : availableItems.length === 0
                                ? 'No stock available in selected location...'
                                : 'Search material item code, name...'
                            }
                            showSearch
                            filterOption={filterSelectOption}
                            onChange={handleItemTypeChange}
                            size="middle"
                            disabled={selectedFromProjectId === undefined || availableItems.length === 0}
                          >
                            {availableItems.map((inv) => (
                              <Select.Option key={inv.item_type_id} value={inv.item_type_id}>
                                <div className="flex items-center justify-between py-0.5">
                                  <span>
                                    <strong className="text-slate-900 dark:text-slate-100 text-xs">{inv.item_type?.name}</strong>{' '}
                                    <span className="text-xs font-mono text-indigo-500 font-semibold">({inv.item_type?.code})</span>
                                  </span>
                                  <Tag color="cyan" className="font-mono font-bold text-[11px] border-none">
                                    Stock: {inv.quantity} {inv.item_type?.unit}
                                  </Tag>
                                </div>
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>

                        {selectedItemTypeId && (
                          <Form.Item
                            name="lot_id"
                            label={
                              <div className="flex items-center justify-between w-full">
                                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                  Specific Source PO Stock Lot (Optional / Auto-Picked)
                                </span>
                                {loadingLots && <span className="text-xs text-indigo-500 font-normal">Loading lots...</span>}
                              </div>
                            }
                            className="mb-0"
                          >
                            <Select
                              placeholder="-- Select Specific PO Stock Lot (Optional) --"
                              allowClear
                              showSearch
                              filterOption={filterSelectOption}
                              onChange={handleLotChange}
                              size="middle"
                            >
                              {availableLots.map((lot) => (
                                <Select.Option key={lot.id} value={lot.id}>
                                  <div className="flex items-center justify-between py-0.5 font-mono text-xs">
                                    <span>
                                      📦 <strong>Lot #{lot.lot_number || lot.id}</strong>
                                      {lot.purchase_order?.po_number && (
                                        <Tag color="purple" className="font-mono text-[10px] ml-2 border-none">
                                          PO: {lot.purchase_order.po_number}
                                        </Tag>
                                      )}
                                      <span className="text-slate-400 text-[11px] ml-2">@ ₹{lot.unit_price}/unit</span>
                                    </span>
                                    <Tag color="emerald" className="font-mono font-bold text-[11px] border-none">
                                      Lot Avail: {lot.available_qty} {selectedItem?.item_type?.unit}
                                    </Tag>
                                  </div>
                                </Select.Option>
                              ))}
                            </Select>
                          </Form.Item>
                        )}
                      </Card>

                      {/* SECTION 3: QUANTITY & REMARKS */}
                      {selectedItemTypeId && (
                        <Card
                          size="small"
                          title={
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <InfoCircleOutlined className="text-indigo-500" /> 3. Transfer Quantity & Remarks
                            </span>
                          }
                          className="shadow-sm border-slate-200 dark:border-white/10"
                          bodyStyle={{ padding: '12px' }}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Form.Item
                              name="quantity"
                              label={
                                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                                  Quantity to Transfer ({selectedItem?.item_type?.unit || 'pcs'})
                                </span>
                              }
                              rules={[
                                { required: true, message: 'Enter quantity' },
                                {
                                  validator: (_, value) => {
                                    if (value && value > maxAllowedQty) {
                                      return Promise.reject(
                                        new Error(`Max available transfer limit is ${maxAllowedQty}`)
                                      );
                                    }
                                    return Promise.resolve();
                                  },
                                },
                              ]}
                              className="mb-0"
                            >
                              <InputNumber
                                min={0.01}
                                max={maxAllowedQty}
                                onChange={(val) => setTransferQty(val || undefined)}
                                className="w-full font-mono font-bold text-base"
                                size="middle"
                                placeholder={`Max: ${maxAllowedQty}`}
                              />
                            </Form.Item>

                            <Form.Item
                              name="notes"
                              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-300">Purpose / Remarks (Optional)</span>}
                              className="mb-0"
                            >
                              <Input.TextArea placeholder="e.g. Urgent site requirement" rows={1} />
                            </Form.Item>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* RIGHT COLUMN: EXECUTIVE LIVE PREVIEW CARD (5 Cols) */}
                    <div className="lg:col-span-5">
                      <Card
                        className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-2xl h-full flex flex-col justify-between"
                        bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between', height: '100%' }}
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                              <SafetyCertificateOutlined /> Transfer Summary
                            </span>
                            <Tag color="purple" className="font-mono text-[10px] font-bold border-none px-2">
                              TRF-2026-AUTO
                            </Tag>
                          </div>

                          {/* ROUTING FLOW */}
                          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                            <div className="text-[10px] text-slate-400 uppercase font-medium mb-1">Stock Movement Route</div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="font-bold text-indigo-300 max-w-[100px] truncate" title={sourceLocationName}>
                                🏬 {sourceLocationName}
                              </div>
                              <ArrowRightOutlined className="text-indigo-400 text-xs" />
                              <div className="font-bold text-emerald-300 max-w-[100px] truncate" title={targetLocationName}>
                                🏗️ {targetLocationName}
                              </div>
                            </div>
                          </div>

                          {/* SELECTED MATERIAL ITEM */}
                          {selectedItem ? (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1">
                              <div className="text-[10px] text-slate-400 uppercase font-medium">Selected Material Item</div>
                              <div className="font-bold text-xs text-white font-['Outfit']">
                                {selectedItem.item_type?.name}
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300">
                                <span>Code: {selectedItem.item_type?.code}</span>
                                <span>Unit: {selectedItem.item_type?.unit || 'pcs'}</span>
                              </div>
                              {selectedLot && (
                                <div className="mt-1 pt-1 border-t border-white/10 text-[10px] font-mono text-amber-300 flex items-center justify-between">
                                  <span>Lot #{selectedLot.lot_number || selectedLot.id}</span>
                                  <span>₹{selectedLot.unit_price}/unit</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-3 text-center text-slate-400 text-xs">
                              Select a material item to view valuation summary
                            </div>
                          )}

                          {/* FINANCIAL VALUATION STATS */}
                          {selectedItem && transferQty && transferQty > 0 ? (
                            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">Transfer Qty:</span>
                                <span className="font-mono font-bold text-white">
                                  {transferQty} {selectedItem.item_type?.unit || 'pcs'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300">Unit Price:</span>
                                <span className="font-mono text-slate-200">
                                  ₹{unitRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <Divider className="my-0.5 border-white/10" />
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-indigo-300 flex items-center gap-1">
                                  <DollarOutlined /> Total Valuation:
                                </span>
                                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                                  ₹{estimatedValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="mt-3 pt-2 border-t border-white/10">
                          <Button
                            type="primary"
                            size="large"
                            icon={<SwapOutlined />}
                            onClick={() => form.submit()}
                            loading={loading}
                            disabled={!selectedToProjectId || !selectedItemTypeId || !transferQty || transferQty <= 0}
                            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 h-10 text-xs font-bold shadow-xl border-none rounded-xl flex items-center justify-center"
                          >
                            Execute Stock Transfer Now
                          </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                </Form>
              </div>
            ),
          },
          {
            key: 'history',
            label: (
              <span className="flex items-center gap-2 font-semibold px-1">
                <HistoryOutlined /> Transfer History & Audit Trail
              </span>
            ),
            children: (
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto pr-1 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
                  <Input
                    placeholder="Search history by item name, code, user, or reference..."
                    prefix={<SearchOutlined className="text-gray-400" />}
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    allowClear
                    className="max-w-md"
                  />
                  <Button icon={<ReloadOutlined />} onClick={loadTransferHistory} loading={loadingHistory} size="middle">
                    Refresh Audit Logs
                  </Button>
                </div>

                <Table
                  columns={historyColumns}
                  dataSource={filteredHistory}
                  rowKey="id"
                  loading={loadingHistory}
                  pagination={{ pageSize: 7, showSizeChanger: true }}
                  scroll={{ x: 600 }}
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10"
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};
