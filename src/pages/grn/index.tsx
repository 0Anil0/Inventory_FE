import React, { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Space,
  Card,
  message,
  Typography,
  Row,
  Col,
  DatePicker,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  DatabaseOutlined,
  CheckOutlined,
  FilterOutlined,
  ClearOutlined,
  DeleteOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AppLayout } from '../../components/layout/AppLayout';
import { grnApi, poApi, storageApi, itemTypeApi, vendorApi, projectApi, unitApi, makeApi } from '../../services/api';
import type { GoodsReceiptNote } from '../../types/grn';
import type { PurchaseOrder, ItemType, Vendor, Project, Unit } from '../../types/inventory';
import type { StorageShelf } from '../../types/storage';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExtraGRNItem {
  key: string;
  item_type_id: number | null;
  receivedQty: number;
  shelfId: number | null;
  rackId: number | null;
  notes: string;
}

const GRNPage: React.FC = () => {
  const [grns, setGrns] = useState<GoodsReceiptNote[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [shelves, setShelves] = useState<StorageShelf[]>([]);
  const [masterItems, setMasterItems] = useState<ItemType[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [makes, setMakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Filter Modal State
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterVendorId, setFilterVendorId] = useState<number | null>(null);
  const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
  const [filterPoId, setFilterPoId] = useState<number | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // PO Line item inputs
  const [itemInputs, setItemInputs] = useState<{
    [poItemId: number]: {
      receivedQty: number;
      shelfId: number | null;
      rackId: number | null;
      notes: string;
    };
  }>({});

  // Additional / Extra Unlisted Items added by Stock Person
  const [extraItems, setExtraItems] = useState<ExtraGRNItem[]>([]);

  // Quick Create New Item Master Sub-Modal State
  const [newItemModalVisible, setNewItemModalVisible] = useState(false);
  const [newItemSubmitting, setNewItemSubmitting] = useState(false);

  // View / Print Modal State
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceiptNote | null>(null);

  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [newItemForm] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (filterParams?: {
    vendor_id?: number;
    project_id?: number;
    po_id?: number;
    from_date?: string;
    to_date?: string;
    search?: string;
  }) => {
    setLoading(true);
    try {
      const [grnRes, poRes, shelfRes, itemRes, vendorRes, projRes, unitRes, makeRes] = await Promise.all([
        grnApi.getGRNs(filterParams),
        poApi.getAll(),
        storageApi.getAllShelves(),
        itemTypeApi.getAll(),
        vendorApi.getAll(),
        projectApi.getAll(),
        unitApi.getAll(),
        makeApi.getAll(),
      ]);
      setGrns(grnRes || []);
      setPos(poRes.purchaseOrders || []);
      setShelves(shelfRes.shelves || []);
      setMasterItems(itemRes.items || []);
      setVendors(vendorRes.vendors || []);
      setProjects(projRes.projects || []);
      setUnits(unitRes.units || []);
      setMakes(makeRes.makes || []);
    } catch (err: any) {
      message.error(err.message || 'Failed to load GRN data');
    } finally {
      setLoading(false);
    }
  };

  const handlePoChange = async (poId: number) => {
    try {
      const poRes = await poApi.getById(poId);
      const poDetail = poRes.purchaseOrder;
      setSelectedPo(poDetail);

      // Initialize inputs for items
      const initialInputs: { [key: number]: any } = {};
      (poDetail.items || []).forEach((item: any) => {
        const pending = Math.max(0, item.ordered_qty - (item.received_qty || 0));
        initialInputs[item.id] = {
          receivedQty: pending,
          shelfId: null,
          rackId: null,
          notes: '',
        };
      });
      setItemInputs(initialInputs);
      setExtraItems([]); // reset extra items for new PO
    } catch (err: any) {
      message.error('Failed to load PO details');
    }
  };

  const handleItemInputChange = (poItemId: number, field: string, value: any) => {
    setItemInputs((prev) => {
      const current = prev[poItemId] || { receivedQty: 0, shelfId: null, rackId: null, notes: '' };
      let updated = { ...current, [field]: value };
      if (field === 'shelfId') {
        updated.rackId = null; // Reset rack when shelf changes
      }
      return { ...prev, [poItemId]: updated };
    });
  };

  // Extra Items Handlers
  const handleAddExtraItem = () => {
    setExtraItems((prev) => [
      ...prev,
      {
        key: `extra_${Date.now()}_${Math.random()}`,
        item_type_id: null,
        receivedQty: 1,
        shelfId: null,
        rackId: null,
        notes: '',
      },
    ]);
  };

  const handleRemoveExtraItem = (key: string) => {
    setExtraItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleExtraItemChange = (key: string, field: keyof ExtraGRNItem, value: any) => {
    setExtraItems((prev) =>
      prev.map((item) => {
        if (item.key === key) {
          const updated = { ...item, [field]: value };
          if (field === 'shelfId') {
            updated.rackId = null;
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Quick Create New Item Master
  const handleCreateNewItemMaster = async () => {
    try {
      const values = await newItemForm.validateFields();
      setNewItemSubmitting(true);

      const res = await itemTypeApi.create({
        name: values.name,
        code: values.code,
        rating: values.rating || '',
        cat_no: values.cat_no || '',
        make: values.make || '',
        unit: values.unit || 'Nos',
        unit_rate: Number(values.unit_rate || 0),
        description: values.description || '',
      });

      message.success(`New Item Master "${res.item.name}" created!`);
      setNewItemModalVisible(false);
      newItemForm.resetFields();

      // Refresh master items list
      const itemRes = await itemTypeApi.getAll();
      const updatedItems = itemRes.items || [];
      setMasterItems(updatedItems);

      // Automatically append to Extra Items list in GRN modal
      setExtraItems((prev) => [
        ...prev,
        {
          key: `extra_${Date.now()}_${Math.random()}`,
          item_type_id: res.item.id,
          receivedQty: 1,
          shelfId: null,
          rackId: null,
          notes: 'Newly created item',
        },
      ]);
    } catch (err: any) {
      message.error(err.message || 'Failed to create Item Master');
    } finally {
      setNewItemSubmitting(false);
    }
  };

  const handleCreateGRN = async () => {
    try {
      const values = await form.validateFields();
      if (!selectedPo) {
        message.error('Please select a valid Purchase Order');
        return;
      }

      const itemsPayload: any[] = [];
      let totalReceivedQty = 0;

      // 1. PO items
      (selectedPo.items || []).forEach((item: any) => {
        const input = itemInputs[item.id] || { receivedQty: 0, shelfId: null, rackId: null, notes: '' };
        const qty = Number(input.receivedQty || 0);

        if (qty > 0) {
          totalReceivedQty += qty;
          itemsPayload.push({
            po_item_id: item.id,
            item_type_id: item.item_type_id,
            received_qty: qty,
            shelf_id: input.shelfId || null,
            rack_id: input.rackId || null,
            notes: input.notes || '',
          });
        }
      });

      // 2. Extra / Unlisted items added by stock person
      extraItems.forEach((extra) => {
        const qty = Number(extra.receivedQty || 0);
        if (extra.item_type_id && qty > 0) {
          totalReceivedQty += qty;
          itemsPayload.push({
            po_item_id: null, // no PO line ID
            item_type_id: extra.item_type_id,
            received_qty: qty,
            shelf_id: extra.shelfId || null,
            rack_id: extra.rackId || null,
            notes: extra.notes || 'Extra item received during stock inward',
          });
        }
      });

      if (totalReceivedQty <= 0) {
        message.error('Please enter received quantity for at least one item');
        return;
      }

      setSubmitting(true);
      const payload = {
        po_id: selectedPo.id,
        received_date: values.received_date ? values.received_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        challan_no: values.challan_no || '',
        vehicle_no: values.vehicle_no || '',
        remarks: values.remarks || '',
        items: itemsPayload,
      };

      await grnApi.createGRN(payload);
      message.success('Stock Inward GRN created successfully!');
      setCreateModalVisible(false);
      form.resetFields();
      setSelectedPo(null);
      setItemInputs({});
      setExtraItems([]);
      fetchData();
    } catch (err: any) {
      message.error(err.message || 'Failed to create GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModalForPO = (poId?: number) => {
    form.resetFields();
    setSelectedPo(null);
    setItemInputs({});
    setExtraItems([]);
    setCreateModalVisible(true);
    if (poId) {
      form.setFieldsValue({ po_id: poId, received_date: dayjs() });
      handlePoChange(poId);
    } else {
      form.setFieldsValue({ received_date: dayjs() });
    }
  };

  // Filter application
  const activeFiltersCount =
    (filterVendorId ? 1 : 0) +
    (filterProjectId ? 1 : 0) +
    (filterPoId ? 1 : 0) +
    (filterDateRange ? 1 : 0);

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    const params: any = {};
    if (filterVendorId) params.vendor_id = filterVendorId;
    if (filterProjectId) params.project_id = filterProjectId;
    if (filterPoId) params.po_id = filterPoId;
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      params.from_date = filterDateRange[0].format('YYYY-MM-DD');
      params.to_date = filterDateRange[1].format('YYYY-MM-DD');
    }
    if (searchText) params.search = searchText;
    fetchData(params);
  };

  const resetFilters = () => {
    setFilterVendorId(null);
    setFilterProjectId(null);
    setFilterPoId(null);
    setFilterDateRange(null);
    filterForm.resetFields();
    fetchData();
  };

  const eligiblePOs = pos.filter((po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED');

  const filteredGRNs = grns.filter((g) => {
    // Search text matching
    const q = searchText.toLowerCase();
    const matchesSearch =
      !q ||
      g.grn_number?.toLowerCase().includes(q) ||
      g.purchase_order?.po_number?.toLowerCase().includes(q) ||
      g.purchase_order?.vendor?.name?.toLowerCase().includes(q) ||
      g.challan_no?.toLowerCase().includes(q);

    // Vendor filter
    const matchesVendor = !filterVendorId || g.purchase_order?.vendor_id === filterVendorId;

    // Project filter
    const matchesProject = !filterProjectId || g.project_id === filterProjectId || g.purchase_order?.project_id === filterProjectId;

    // PO filter
    const matchesPo = !filterPoId || g.po_id === filterPoId;

    // Date range filter
    let matchesDate = true;
    if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
      const gDate = dayjs(g.received_date);
      matchesDate =
        gDate.isAfter(filterDateRange[0].startOf('day')) && gDate.isBefore(filterDateRange[1].endOf('day'));
    }

    return matchesSearch && matchesVendor && matchesProject && matchesPo && matchesDate;
  });

  const columns = [
    {
      title: 'GRN Number',
      dataIndex: 'grn_number',
      key: 'grn_number',
      fixed: 'left' as const,
      render: (text: string, record: GoodsReceiptNote) => (
        <div>
          <Text strong style={{ color: '#312e81', fontSize: '14px', fontFamily: 'monospace' }}>
            {text}
          </Text>
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            {dayjs(record.received_date).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'PO Number',
      dataIndex: 'purchase_order',
      key: 'po_number',
      render: (po: any) => (
        <Tag color="geekblue" className="font-mono font-semibold">
          {po?.po_number || '-'}
        </Tag>
      ),
    },
    {
      title: 'Vendor & Site',
      key: 'vendor',
      render: (record: GoodsReceiptNote) => (
        <div>
          <div className="font-semibold text-slate-800">{record.purchase_order?.vendor?.name || 'Vendor N/A'}</div>
          <div className="text-xs text-slate-500">
            {record.project?.name ? `${record.project.code} - ${record.project.name}` : (record.purchase_order?.project?.name ? `${record.purchase_order.project.code} - ${record.purchase_order.project.name}` : 'General Stock')}
          </div>
        </div>
      ),
    },
    {
      title: 'Challan / Vehicle',
      key: 'challan',
      render: (record: GoodsReceiptNote) => (
        <div>
          <div><Text type="secondary" className="text-xs">Challan:</Text> <span className="font-mono font-medium">{record.challan_no || '-'}</span></div>
          {record.vehicle_no && <div><Text type="secondary" className="text-xs">Vehicle:</Text> <span className="font-mono text-xs">{record.vehicle_no}</span></div>}
        </div>
      ),
    },
    {
      title: 'Items Received',
      key: 'items',
      render: (record: GoodsReceiptNote) => (
        <Tag color="cyan" icon={<DatabaseOutlined />}>
          {(record.items || []).reduce((acc, i) => acc + i.received_qty, 0)} Units ({(record.items || []).length} items)
        </Tag>
      ),
    },
    {
      title: 'Received By',
      dataIndex: 'received_by_user',
      key: 'received_by_user',
      render: (user: any) => user?.username || 'Admin',
    },
    {
      title: 'Action',
      key: 'action',
      fixed: 'right' as const,
      render: (record: GoodsReceiptNote) => (
        <Space>
          <Button
            type="primary"
            ghost
            size="middle"
            icon={<PrinterOutlined />}
            onClick={() => {
              setSelectedGrn(record);
              setViewModalVisible(true);
            }}
          >
            GRN Slip
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-4 flex flex-col gap-4 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        {/* Header Ribbon */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm gap-4 shrink-0">
          <div>
            <Title level={3} style={{ margin: 0, color: '#0f172a' }} className="flex items-center gap-2">
              <CheckOutlined className="text-indigo-600" /> Stock Inward & GRN Master
            </Title>
            <Text type="secondary">
              Record goods receipts against approved POs, partial shipments, unlisted item additions, and bind stock to Shelves & Racks.
            </Text>
          </div>
          <Button
            type="primary"
            size="middle"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#312e81', borderColor: '#312e81' }}
            onClick={() => openCreateModalForPO()}
          >
            Create GRN / Stock Inward
          </Button>
        </div>

        {/* Filter & Search Bar Controls */}
        <Card className="shadow-sm border-slate-200 shrink-0" bodyStyle={{ padding: '16px' }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col xs={24} sm={16} md={12} className="flex gap-2">
              <Input
                placeholder="Search GRN No, PO No, Vendor, Challan..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                className="w-full"
              />
              <Badge count={activeFiltersCount} offset={[-5, 5]}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFilterModalVisible(true)}
                  type={activeFiltersCount > 0 ? 'primary' : 'default'}
                  style={activeFiltersCount > 0 ? { backgroundColor: '#312e81', borderColor: '#312e81' } : {}}
                >
                  Filters
                </Button>
              </Badge>
              {activeFiltersCount > 0 && (
                <Tooltip title="Clear Active Filters">
                  <Button icon={<ClearOutlined />} onClick={resetFilters} danger />
                </Tooltip>
              )}
            </Col>
            <Col>
              <Text type="secondary">
                Total GRNs: <strong className="text-slate-900">{filteredGRNs.length}</strong>
              </Text>
            </Col>
          </Row>

          {/* Active Filter Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-semibold flex items-center">Active Filters:</span>
              {filterVendorId && (
                <Tag closable onClose={() => setFilterVendorId(null)} color="indigo">
                  Vendor: {vendors.find((v) => v.id === filterVendorId)?.name}
                </Tag>
              )}
              {filterProjectId && (
                <Tag closable onClose={() => setFilterProjectId(null)} color="purple">
                  Site: {projects.find((p) => p.id === filterProjectId)?.name}
                </Tag>
              )}
              {filterPoId && (
                <Tag closable onClose={() => setFilterPoId(null)} color="blue">
                  PO: {pos.find((p) => p.id === filterPoId)?.po_number}
                </Tag>
              )}
              {filterDateRange && (
                <Tag closable onClose={() => setFilterDateRange(null)} color="cyan">
                  Date: {filterDateRange[0].format('DD/MM/YY')} - {filterDateRange[1].format('DD/MM/YY')}
                </Tag>
              )}
            </div>
          )}
        </Card>

        {/* GRN List Table */}
        <Card className="shadow-sm border-slate-200 flex-1 overflow-hidden" bodyStyle={{ padding: '0px' }}>
          <Table
            columns={columns}
            dataSource={filteredGRNs}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000, y: 'calc(100vh - 485px)' }}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </main>

      {/* FILTER MODAL */}
      <Modal
        centered
        title={
          <div className="flex items-center gap-2 text-indigo-900 font-bold border-b pb-3">
            <FilterOutlined /> Filter Stock Inward & GRNs
          </div>
        }
        open={filterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={[
          <Button key="reset" icon={<ClearOutlined />} onClick={resetFilters}>
            Reset Filters
          </Button>,
          <Button
            key="apply"
            type="primary"
            style={{ backgroundColor: '#312e81', borderColor: '#312e81' }}
            onClick={handleApplyFilters}
          >
            Apply Filters
          </Button>,
        ]}
      >
        <Form form={filterForm} layout="vertical" className="mt-4">
          <Form.Item label="Date Range">
            <RangePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={filterDateRange}
              onChange={(val) => setFilterDateRange(val as any)}
            />
          </Form.Item>

          <Form.Item label="Filter by Vendor">
            <Select
              placeholder="All Vendors"
              showSearch
              optionFilterProp="children"
              value={filterVendorId}
              onChange={(val) => setFilterVendorId(val)}
              allowClear
            >
              {vendors.map((v) => (
                <Option key={v.id} value={v.id}>
                  {v.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Filter by Project / Site">
            <Select
              placeholder="All Projects / General Stock"
              showSearch
              optionFilterProp="children"
              value={filterProjectId}
              onChange={(val) => setFilterProjectId(val)}
              allowClear
            >
              {projects.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Filter by PO Number">
            <Select
              placeholder="All Purchase Orders"
              showSearch
              optionFilterProp="children"
              value={filterPoId}
              onChange={(val) => setFilterPoId(val)}
              allowClear
            >
              {pos.map((p) => (
                <Option key={p.id} value={p.id}>
                  {p.po_number} ({p.vendor?.name})
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* CREATE GRN MODAL */}
      <Modal
        centered
        title={
          <div className="flex items-center justify-between text-indigo-900 font-bold text-lg border-b pb-3 pr-6">
            <div className="flex items-center gap-2">
              <PlusOutlined /> Create Goods Receipt Note (GRN) - Stock Inward
            </div>
            <Button
              size="small"
              type="dashed"
              icon={<AppstoreAddOutlined />}
              onClick={() => setNewItemModalVisible(true)}
              className="text-xs"
            >
              + New Item Master
            </Button>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setCreateModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            style={{ backgroundColor: '#1e1b4b', borderColor: '#1e1b4b' }}
            onClick={handleCreateGRN}
          >
            Save & Inward Stock
          </Button>,
        ]}
        width={950}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="po_id"
                label={<span className="font-semibold text-slate-700">Select Approved / Partial Purchase Order (PO)</span>}
                rules={[{ required: true, message: 'Please select a Purchase Order' }]}
              >
                <Select
                  placeholder="Select Approved PO"
                  showSearch
                  optionFilterProp="children"
                  onChange={handlePoChange}
                >
                  {eligiblePOs.map((po) => (
                    <Option key={po.id} value={po.id}>
                      <span className="font-mono font-bold text-indigo-700">{po.po_number}</span> - {po.vendor?.name} ({po.status})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="received_date"
                label={<span className="font-semibold text-slate-700">Receipt Date</span>}
                rules={[{ required: true, message: 'Please select date' }]}
              >
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="challan_no" label={<span className="font-semibold text-slate-700">Invoice / Delivery Challan No</span>}>
                <Input placeholder="e.g. INV-99023 / CH-102" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="vehicle_no" label={<span className="font-semibold text-slate-700">Vehicle No</span>}>
                <Input placeholder="e.g. RJ 27 GA 1234" />
              </Form.Item>
            </Col>
          </Row>

          {/* Selected PO Meta Summary Box */}
          {selectedPo && (
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mb-5 text-sm space-y-1">
              <div><strong className="text-slate-800">Vendor:</strong> {selectedPo.vendor?.name}</div>
              <div><strong className="text-slate-800">Project / Site:</strong> {selectedPo.project?.code ? `${selectedPo.project.code} - ${selectedPo.project.name}` : 'General Stock'}</div>
              <div><strong className="text-slate-800">Current Status:</strong> <Tag color="orange">{selectedPo.status}</Tag></div>
            </div>
          )}

          {/* 1. Standard PO Items Table */}
          {selectedPo && selectedPo.items && selectedPo.items.length > 0 && (
            <div className="mb-6">
              <Title level={5} className="text-slate-800 mb-2">
                1. Receive PO Items & Assign Storage Locations (Shelf & Rack)
              </Title>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 border-r border-slate-200">Item Description</th>
                      <th className="p-2.5 border-r border-slate-200 text-center w-16">Ordered</th>
                      <th className="p-2.5 border-r border-slate-200 text-center w-16">Prev Recv</th>
                      <th className="p-2.5 border-r border-slate-200 text-center w-16">Pending</th>
                      <th className="p-2.5 border-r border-slate-200 w-28 text-center bg-indigo-50 text-indigo-900">Recv Now</th>
                      <th className="p-2.5 border-r border-slate-200 w-36">Store Shelf</th>
                      <th className="p-2.5 border-r border-slate-200 w-36">Rack Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPo.items.map((item: any) => {
                      const prevRecv = item.received_qty || 0;
                      const pending = Math.max(0, item.ordered_qty - prevRecv);
                      const currentInput = itemInputs[item.id] || {
                        receivedQty: pending,
                        shelfId: null,
                        rackId: null,
                        notes: '',
                      };

                      // Get racks for selected shelf
                      const activeShelf = shelves.find((s) => s.id === currentInput.shelfId);
                      const availableRacks = activeShelf?.racks || [];

                      return (
                        <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="font-semibold text-slate-900">{item.item_type?.name}</div>
                            <div className="font-mono text-[11px] text-slate-500">
                              {item.item_type?.code} {item.cat_no ? `| Cat: ${item.cat_no}` : ''} | Make: {item.make || item.item_type?.make || '-'}
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono font-semibold">{item.ordered_qty}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-600">{prevRecv}</td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono font-bold text-amber-700">{pending}</td>
                          <td className="p-2.5 border-r border-slate-200 bg-indigo-50/50">
                            <InputNumber
                              min={0}
                              max={pending}
                              value={currentInput.receivedQty}
                              onChange={(val) => handleItemInputChange(item.id, 'receivedQty', val || 0)}
                              className="w-full font-mono font-bold text-indigo-900"
                              size="small"
                            />
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <Select
                              placeholder="Select Shelf"
                              size="small"
                              className="w-full"
                              value={currentInput.shelfId}
                              onChange={(val) => handleItemInputChange(item.id, 'shelfId', val)}
                              allowClear
                            >
                              {shelves.map((shelf) => (
                                <Option key={shelf.id} value={shelf.id}>
                                  {shelf.name} ({shelf.code})
                                </Option>
                              ))}
                            </Select>
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <Select
                              placeholder="Select Rack"
                              size="small"
                              className="w-full"
                              value={currentInput.rackId}
                              disabled={!currentInput.shelfId}
                              onChange={(val) => handleItemInputChange(item.id, 'rackId', val)}
                              allowClear
                            >
                              {availableRacks.map((rack) => (
                                <Option key={rack.id} value={rack.id}>
                                  {rack.name} ({rack.rack_code})
                                </Option>
                              ))}
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Additional / Unlisted Stock Inward Items Section */}
          {selectedPo && (
            <div className="mb-6 bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-bold text-amber-900 text-sm mb-0 flex items-center gap-1.5">
                    <PlusOutlined className="text-amber-700" /> 2. Add Extra / Unlisted Items Received (Optional)
                  </h4>
                  <p className="text-xs text-amber-700 mb-0">
                    If vendor delivered additional items not listed on original PO lines, select them from Item Master below.
                  </p>
                </div>
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    ghost
                    icon={<PlusOutlined />}
                    onClick={handleAddExtraItem}
                  >
                    + Add Extra Item
                  </Button>
                </Space>
              </div>

              {extraItems.length > 0 ? (
                <div className="border border-amber-200 rounded-lg overflow-x-auto bg-white">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-amber-100/70 text-slate-800 font-bold border-b border-amber-200">
                      <tr>
                        <th className="p-2.5 border-r border-amber-200 w-64">Select Inventory Item</th>
                        <th className="p-2.5 border-r border-amber-200 w-24 text-center">Recv Qty</th>
                        <th className="p-2.5 border-r border-amber-200 w-36">Store Shelf</th>
                        <th className="p-2.5 border-r border-amber-200 w-36">Rack Position</th>
                        <th className="p-2.5 border-r border-amber-200">Notes / Remarks</th>
                        <th className="p-2.5 text-center w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extraItems.map((extra) => {
                        const activeShelf = shelves.find((s) => s.id === extra.shelfId);
                        const availableRacks = activeShelf?.racks || [];

                        return (
                          <tr key={extra.key} className="border-b border-amber-100 hover:bg-amber-50/30">
                            <td className="p-2 border-r border-amber-200">
                              <Select
                                placeholder="Search & Select Item Master"
                                size="small"
                                className="w-full"
                                showSearch
                                optionFilterProp="children"
                                value={extra.item_type_id}
                                onChange={(val) => handleExtraItemChange(extra.key, 'item_type_id', val)}
                              >
                                {masterItems.map((m) => (
                                  <Option key={m.id} value={m.id}>
                                    <span className="font-mono text-indigo-800">{m.code}</span> - {m.name} ({m.make || 'Gen'})
                                  </Option>
                                ))}
                              </Select>
                            </td>
                            <td className="p-2 border-r border-amber-200 text-center">
                              <InputNumber
                                min={1}
                                value={extra.receivedQty}
                                onChange={(val) => handleExtraItemChange(extra.key, 'receivedQty', val || 1)}
                                className="w-full font-mono font-bold"
                                size="small"
                              />
                            </td>
                            <td className="p-2 border-r border-amber-200">
                              <Select
                                placeholder="Select Shelf"
                                size="small"
                                className="w-full"
                                value={extra.shelfId}
                                onChange={(val) => handleExtraItemChange(extra.key, 'shelfId', val)}
                                allowClear
                              >
                                {shelves.map((shelf) => (
                                  <Option key={shelf.id} value={shelf.id}>
                                    {shelf.name} ({shelf.code})
                                  </Option>
                                ))}
                              </Select>
                            </td>
                            <td className="p-2 border-r border-amber-200">
                              <Select
                                placeholder="Select Rack"
                                size="small"
                                className="w-full"
                                value={extra.rackId}
                                disabled={!extra.shelfId}
                                onChange={(val) => handleExtraItemChange(extra.key, 'rackId', val)}
                                allowClear
                              >
                                {availableRacks.map((rack) => (
                                  <Option key={rack.id} value={rack.id}>
                                    {rack.name} ({rack.rack_code})
                                  </Option>
                                ))}
                              </Select>
                            </td>
                            <td className="p-2 border-r border-amber-200">
                              <Input
                                placeholder="e.g. Free sample / Extra delivery"
                                size="small"
                                value={extra.notes}
                                onChange={(e) => handleExtraItemChange(extra.key, 'notes', e.target.value)}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={() => handleRemoveExtraItem(extra.key)}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-3 text-xs text-amber-700 italic border border-dashed border-amber-300 rounded-lg">
                  No extra unlisted items added. Click "+ Add Extra Item" above if vendor supplied extra stock.
                </div>
              )}
            </div>
          )}

          <Form.Item name="remarks" label={<span className="font-semibold text-slate-700">Remarks / Inspection Notes</span>}>
            <Input.TextArea rows={2} placeholder="Any notes regarding condition of goods, package box numbers..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* QUICK CREATE ITEM MASTER SUB-MODAL */}
      <Modal
        centered
        title={
          <div className="flex items-center gap-2 text-indigo-900 font-bold border-b pb-2">
            <AppstoreAddOutlined /> Create New Master Inventory Item Type
          </div>
        }
        open={newItemModalVisible}
        onCancel={() => setNewItemModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setNewItemModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={newItemSubmitting}
            style={{ backgroundColor: '#1e1b4b', borderColor: '#1e1b4b' }}
            onClick={handleCreateNewItemMaster}
          >
            Create & Add to Inward
          </Button>,
        ]}
        width={650}
        destroyOnClose
      >
        <Form form={newItemForm} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={<span className="font-semibold text-slate-700">Item Name / Title</span>}
                rules={[{ required: true, message: 'Item name is required' }]}
              >
                <Input placeholder="e.g. 4 POLE MCB 63A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label={<span className="font-semibold text-slate-700">Item Code / SKU</span>}
                rules={[{ required: true, message: 'Item code is required' }]}
              >
                <Input placeholder="e.g. MCB-63A-4P" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="make" label={<span className="font-semibold text-slate-700">Make / Brand</span>}>
                <Select placeholder="Select Brand / Make" allowClear showSearch optionFilterProp="children">
                  {makes.map((m) => (
                    <Option key={m.id} value={m.name}>
                      {m.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label={<span className="font-semibold text-slate-700">Rating / Specs</span>}>
                <Input placeholder="e.g. 10kA / C-Curve" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cat_no" label={<span className="font-semibold text-slate-700">Cat No</span>}>
                <Input placeholder="e.g. LEG-405021" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit" label={<span className="font-semibold text-slate-700">Unit of Measure</span>}>
                <Select placeholder="Select Unit" defaultValue="Nos">
                  {units.map((u) => (
                    <Option key={u.id} value={u.name}>
                      {u.name} ({u.code})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unit_rate" label={<span className="font-semibold text-slate-700">Standard Rate (₹)</span>}>
                <InputNumber min={0} className="w-full font-mono" placeholder="0.00" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={<span className="font-semibold text-slate-700">Full Description / Specification</span>}>
            <Input.TextArea rows={2} placeholder="Enter full specifications..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* VIEW / PRINT GRN SLIP MODAL */}
      <Modal
        title={null}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        centered
        width={850}
        styles={{
          body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' },
        }}
        footer={[
          <Button key="close" size="large" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="print"
            type="primary"
            size="large"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#1e1b4b', borderColor: '#1e1b4b' }}
            onClick={() => window.print()}
          >
            Print GRN Slip
          </Button>,
        ]}
      >
        {selectedGrn && (
          <div className="p-4 bg-white font-sans text-slate-900" id="grn-print-area">
            {/* Header Block */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
              <h2 className="text-xl font-extrabold uppercase text-slate-900 mb-1 tracking-tight">
                EFFICIENT ELECTRICAL ENERGY AND AUTOMATION PRIVATE LIMITED
              </h2>
              <p className="text-xs text-slate-700 mb-0.5 font-medium">
                ROAD NO. 3 H-185 IID CENTER RIICO INDUSTRIAL AREA KALADWAS UDAIPUR 313003
              </p>
              <p className="text-xs text-slate-700 font-medium">
                Email: purchase@efficientelectrical.in, efficient.eeea@gmail.com | Cell: 9694645256, 8209545801
              </p>
              <div className="font-bold text-sm font-mono text-slate-900 mt-1">
                GST NO.: 08AAHCE7406Q1Z2
              </div>
            </div>

            {/* GRN Banner */}
            <div className="bg-slate-900 text-white font-bold text-center py-1.5 text-base uppercase tracking-widest mb-4">
              GOODS RECEIPT NOTE (GRN)
            </div>

            {/* GRN Meta Info Grid */}
            <div className="grid grid-cols-2 gap-4 border border-slate-900 p-3 mb-4 text-xs bg-slate-50">
              <div className="space-y-1 border-r border-slate-300 pr-3">
                <div><span className="font-bold text-slate-900">GRN No:</span> <span className="font-mono font-bold text-indigo-900">{selectedGrn.grn_number}</span></div>
                <div><span className="font-semibold text-slate-700">Receipt Date:</span> {dayjs(selectedGrn.received_date).format('DD/MM/YYYY')}</div>
                <div><span className="font-semibold text-slate-700">Supplier / Vendor:</span> {selectedGrn.purchase_order?.vendor?.name}</div>
                <div><span className="font-semibold text-slate-700">Project / Site:</span> {selectedGrn.project?.name || selectedGrn.purchase_order?.project?.name || 'General Stock'}</div>
              </div>
              <div className="space-y-1 pl-2">
                <div><span className="font-bold text-slate-900">PO Ref No:</span> <span className="font-mono font-bold text-indigo-900">{selectedGrn.purchase_order?.po_number}</span></div>
                <div><span className="font-semibold text-slate-700">Invoice / Challan No:</span> {selectedGrn.challan_no || 'N/A'}</div>
                <div><span className="font-semibold text-slate-700">Vehicle No:</span> {selectedGrn.vehicle_no || 'N/A'}</div>
                <div><span className="font-semibold text-slate-700">Received By:</span> {selectedGrn.received_by_user?.username || 'Admin'}</div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border border-slate-900 text-xs mb-6">
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-900">
                  <th className="border border-slate-900 p-2 text-center w-10">S.No</th>
                  <th className="border border-slate-900 p-2 text-center w-28">Item Code</th>
                  <th className="border border-slate-900 p-2">Description & Make</th>
                  <th className="border border-slate-900 p-2 text-center w-20">Received Qty</th>
                  <th className="border border-slate-900 p-2 text-center w-16">Unit</th>
                  <th className="border border-slate-900 p-2 w-44">Storage Location (Shelf / Rack)</th>
                </tr>
              </thead>
              <tbody>
                {(selectedGrn.items || []).map((item, idx) => (
                  <tr key={item.id} className="border-b border-slate-400">
                    <td className="border border-slate-900 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-bold text-indigo-900">
                      {item.item_type?.code || '-'}
                    </td>
                    <td className="border border-slate-900 p-2 font-medium">
                      {item.item_type?.name}
                      {item.item_type?.cat_no && <span className="block text-[11px] text-slate-600">Cat: {item.item_type.cat_no}</span>}
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-bold text-slate-900">{item.received_qty}</td>
                    <td className="border border-slate-900 p-2 text-center">{item.item_type?.unit || 'Nos'}</td>
                    <td className="border border-slate-900 p-2 font-semibold text-slate-800">
                      {item.shelf ? (
                        <span>
                          {item.shelf.name} ({item.shelf.code})
                          {item.rack && <span className="block text-[11px] text-indigo-700">→ {item.rack.name} ({item.rack.rack_code})</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Remarks */}
            {selectedGrn.remarks && (
              <div className="border border-slate-300 p-2.5 mb-6 text-xs bg-slate-50 rounded">
                <strong>Remarks:</strong> {selectedGrn.remarks}
              </div>
            )}

            {/* Signatures */}
            <div className="flex justify-between items-end pt-8 text-xs font-semibold text-center">
              <div className="w-40 border-t border-slate-700 pt-1">
                Store Incharge / Receiver
              </div>
              <div className="w-40 border-t border-slate-700 pt-1">
                Verified By
              </div>
              <div className="w-56 border-t border-slate-900 pt-1 font-bold">
                For EFFICIENT ELECTRICAL ENERGY AND AUTOMATION PRIVATE LIMITED
                <span className="block text-[10px] font-normal text-slate-600 mt-4">(Authorised Signatory)</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};

export default GRNPage;
