import React, { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  DownloadOutlined,
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
import { filterSelectOption } from '../../utils/select.utils';
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

  // Pagination states
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

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
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Helper to split GRN line items cleanly across A4 pages (matches PO concept)
  const getGrnPagesData = (grn: GoodsReceiptNote) => {
    const items = grn.items || [];
    if (items.length === 0) {
      return [{ tableItems: [], showSignature: true }];
    }

    const pages = [];
    const firstPageLimit = 5;
    const subPageLimit = 10;

    const page1Items = items.slice(0, firstPageLimit);
    const remainingItems = items.slice(firstPageLimit);

    const totalPages = Math.ceil(remainingItems.length / subPageLimit) + 1;

    pages.push({
      tableItems: page1Items,
      showSignature: totalPages === 1,
    });

    for (let i = 0; i < remainingItems.length; i += subPageLimit) {
      const chunk = remainingItems.slice(i, i + subPageLimit);
      const isLastPage = i + subPageLimit >= remainingItems.length;
      pages.push({
        tableItems: chunk,
        showSignature: isLastPage,
      });
    }

    return pages;
  };

  // Clean Per-Page A4 PDF Download Handler (Matches PO concept)
  const handleDownloadPDF = async () => {
    const container = printRef.current;
    if (!container || !selectedGrn) return;

    setDownloadingPDF(true);
    const grnNo = selectedGrn.grn_number ? selectedGrn.grn_number.replace(/[/\\?%*:|"<>]/g, '_') : 'Document';

    try {
      const pageNodes = Array.from(
        container.querySelectorAll<HTMLElement>('.grn-pdf-page')
      );

      if (pageNodes.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidthMm = pdf.internal.pageSize.getWidth();   // 210mm
      const pdfHeightMm = pdf.internal.pageSize.getHeight(); // 297mm
      const marginMm = 8;
      const printableWidthMm = pdfWidthMm - marginMm * 2;   // 194mm
      const printableHeightMm = pdfHeightMm - marginMm * 2; // 281mm

      for (let i = 0; i < pageNodes.length; i++) {
        const pageNode = pageNodes[i];

        const canvas = await html2canvas(pageNode, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            Array.from(clonedDoc.querySelectorAll('style')).forEach((styleTag) => {
              if (styleTag.innerHTML && styleTag.innerHTML.includes('oklch')) {
                styleTag.innerHTML = styleTag.innerHTML.replace(/oklch\([^)]+\)/g, '#1e293b');
              }
            });
          },
        });

        const sliceData = canvas.toDataURL('image/png');
        const sliceHeightMm = (canvas.height * printableWidthMm) / canvas.width;
        const actualHeightMm = Math.min(sliceHeightMm, printableHeightMm);

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(sliceData, 'PNG', marginMm, marginMm, printableWidthMm, actualHeightMm);
      }

      pdf.save(`GRN_${grnNo}.pdf`);
      message.success(`GRN Slip PDF GRN_${grnNo}.pdf saved to your Downloads folder!`);
    } catch (err: any) {
      console.error('PDF Download Error:', err);
      message.error('Failed to download PDF: ' + (err?.message || 'Rendering error'));
    } finally {
      setDownloadingPDF(false);
    }
  };

  const [form] = Form.useForm();
  const [filterForm] = Form.useForm();
  const [newItemForm] = Form.useForm();

  // Load dropdown metadata once
  const fetchMetadata = async () => {
    try {
      const [poRes, shelfRes, itemRes, vendorRes, projRes, unitRes, makeRes] = await Promise.all([
        poApi.getAll(),
        storageApi.getAllShelves(),
        itemTypeApi.getAll(),
        vendorApi.getAll(),
        projectApi.getAll(),
        unitApi.getAll(),
        makeApi.getAll(),
      ]);
      setPos(poRes.purchaseOrders || []);
      setShelves(shelfRes.shelves || []);
      setMasterItems(itemRes.items || []);
      setVendors(vendorRes.vendors || []);
      setProjects(projRes.projects || []);
      setUnits(unitRes.units || []);
      setMakes(makeRes.makes || []);
    } catch (err: any) {
      message.error(err.message || 'Failed to load master metadata');
    }
  };

  // Fetch GRNs with server-side search, filters, and pagination
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pageSize,
      };
      if (filterVendorId) params.vendor_id = filterVendorId;
      if (filterProjectId) params.project_id = filterProjectId;
      if (filterPoId) params.po_id = filterPoId;
      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        params.from_date = filterDateRange[0].format('YYYY-MM-DD');
        params.to_date = filterDateRange[1].format('YYYY-MM-DD');
      }
      if (searchText) params.search = searchText;

      const res = await grnApi.getGRNs(params);

      if (Array.isArray(res)) {
        setGrns(res);
        setTotal(res.length);
      } else if (res && res.grns) {
        setGrns(res.grns);
        setTotal(res.total || 0);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load GRN records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchGRNs();
  }, [searchText, filterVendorId, filterProjectId, filterPoId, filterDateRange, page, pageSize]);

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
      fetchGRNs();
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

  const handleSearchChange = (val: string) => {
    setSearchText(val);
    setPage(1);
  };

  const handleApplyFilters = () => {
    setFilterModalVisible(false);
    setPage(1);
  };

  const resetFilters = () => {
    setFilterVendorId(null);
    setFilterProjectId(null);
    setFilterPoId(null);
    setFilterDateRange(null);
    setSearchText('');
    filterForm.resetFields();
    setPage(1);
  };

  const eligiblePOs = pos.filter((po) => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED');

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
          <Tooltip title="View & Download GRN Slip PDF">
            <Button
              type="primary"
              ghost
              size="middle"
              shape="circle"
              icon={<PrinterOutlined style={{ fontSize: '15px' }} />}
              onClick={() => {
                setSelectedGrn(record);
                setViewModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-4 flex flex-col gap-4 min-h-screen overflow-y-auto pb-12">
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
          <Tooltip title="Create Goods Receipt Note / Stock Inward">
            <Button
              type="primary"
              shape="circle"
              size="middle"
              icon={<PlusOutlined />}
              style={{ backgroundColor: '#312e81', borderColor: '#312e81' }}
              onClick={() => openCreateModalForPO()}
            />
          </Tooltip>
        </div>

        {/* Filter & Search Bar Controls */}
        <Card className="shadow-sm border-slate-200 shrink-0" bodyStyle={{ padding: '16px' }}>
          <Row gutter={[16, 16]} justify="space-between" align="middle">
            <Col xs={24} sm={16} md={12} className="flex gap-2">
              <Input
                placeholder="Search GRN, PO, Vendor..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                allowClear
                className="w-44 sm:w-52 max-w-xs"
              />
              <Tooltip title="Open Filter Dialog">
                <Badge count={activeFiltersCount} offset={[-3, 3]}>
                  <Button
                    shape="circle"
                    icon={<FilterOutlined />}
                    onClick={() => setFilterModalVisible(true)}
                    type={activeFiltersCount > 0 ? 'primary' : 'default'}
                    style={activeFiltersCount > 0 ? { backgroundColor: '#312e81', borderColor: '#312e81' } : {}}
                  />
                </Badge>
              </Tooltip>
              {activeFiltersCount > 0 && (
                <Tooltip title="Clear Active Filters">
                  <Button shape="circle" icon={<ClearOutlined />} onClick={resetFilters} danger />
                </Tooltip>
              )}
            </Col>
            <Col>
              <Text type="secondary">
                Total GRNs: <strong className="text-slate-900">{total}</strong>
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
        <Card className="shadow-sm border-slate-200" bodyStyle={{ padding: '0px' }}>
          <Table
            columns={columns}
            dataSource={grns}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1000 }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50', '100'],
              onChange: (newPage, newPageSize) => {
                setPage(newPage);
                setPageSize(newPageSize);
              },
              showTotal: (tot, range) => `${range[0]}-${range[1]} of ${tot} GRNs`,
            }}
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
              filterOption={filterSelectOption}
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
              filterOption={filterSelectOption}
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
              filterOption={filterSelectOption}
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
                  filterOption={filterSelectOption}
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
                              showSearch
                              filterOption={filterSelectOption}
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
                              showSearch
                              filterOption={filterSelectOption}
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
                                filterOption={filterSelectOption}
                                value={extra.item_type_id}
                                onChange={(val) => handleExtraItemChange(extra.key, 'item_type_id', val)}
                              >
                                 {masterItems.map((m) => (
                                   <Option key={m.id} value={m.id}>
                                     <span className="font-mono text-indigo-800">{m.code}</span> - {m.name} {m.full_description ? `| ${m.full_description}` : ''} {m.cat_no ? `(Cat No: ${m.cat_no})` : ''} [{m.make || 'Gen'}]
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
                                showSearch
                                filterOption={filterSelectOption}
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
                                showSearch
                                filterOption={filterSelectOption}
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
        width={950}
        styles={{
          body: { maxHeight: '80vh', overflowY: 'auto', paddingRight: '8px' },
        }}
        footer={[
          <Button key="close" size="large" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            loading={downloadingPDF}
            style={{ backgroundColor: '#1e1b4b', borderColor: '#1e1b4b' }}
            onClick={handleDownloadPDF}
          >
            Download GRN Slip PDF
          </Button>,
        ]}
      >
        {selectedGrn && (() => {
          const pagesData = getGrnPagesData(selectedGrn);
          return (
            <div className="bg-slate-100 p-4 rounded-lg space-y-6">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .grn-print-modal, .grn-print-modal * {
                    visibility: visible;
                  }
                  .grn-print-modal {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                  }
                  .ant-modal-close, .ant-modal-header {
                    display: none !important;
                  }
                }
              `}</style>

              {/* Master print container wrapper */}
              <div ref={printRef} className="space-y-6">
                {pagesData.map((pageData, pageIdx) => (
                  <div key={pageIdx} className="space-y-2">
                    {/* Page Break / Indicator Badge */}
                    <div className="flex items-center gap-4 my-2 print:hidden">
                      <div className="flex-1 border-t border-dashed border-slate-300"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 py-1 bg-white border border-slate-300 rounded-full shadow-xs">
                        Page {pageIdx + 1} of {pagesData.length}
                      </span>
                      <div className="flex-1 border-t border-dashed border-slate-300"></div>
                    </div>

                    {/* Printable A4 Page Frame */}
                    <div
                      className="grn-pdf-page bg-white p-7 rounded-lg shadow-sm border border-slate-200"
                      style={{ backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}
                    >
                      {/* PAGE 1 HEADER */}
                      {pageIdx === 0 ? (
                        <>
                          {/* Document Top Header with Logo */}
                          <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '14px', marginBottom: '14px' }}>
                            <div className="grid grid-cols-[100px_1fr_100px] items-center gap-3">
                              <div style={{ width: '100px', height: '100px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px' }} className="shrink-0 flex items-center justify-center">
                                <img src="/logo.png" alt="Company Logo" className="max-h-full max-w-full object-contain" />
                              </div>
                              <div className="text-center">
                                <h1 style={{ color: '#0f172a', fontFamily: 'sans-serif', fontSize: '20px', lineHeight: '1.25' }} className="font-extrabold uppercase tracking-wide mb-1.5">
                                  EFFICIENT ELECTRICAL ENERGY AND AUTOMATION PRIVATE LIMITED
                                </h1>
                                <p style={{ color: '#334155', fontSize: '12.5px', lineHeight: '1.4' }} className="mb-0.5 font-medium">
                                  ROAD NO. 3 H-185 IID CENTER RIICO INDUSTRIAL AREA KALADWAS UDAIPUR 313003
                                </p>
                                <p style={{ color: '#334155', fontSize: '12.5px', lineHeight: '1.4' }} className="mb-0.5 font-medium">
                                  Email: purchase@efficientelectrical.in, efficient.eeea@gmail.com | Cell: 9694645256, 8209545801
                                </p>
                                <p style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '14px' }} className="font-bold mt-1">
                                  GST NO.: 08AAHCE7406Q1Z2
                                </p>
                              </div>
                              <div style={{ width: '100px', height: '100px' }} className="shrink-0"></div>
                            </div>
                          </div>

                          {/* Document Title Ribbon */}
                          <div style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', padding: '6px 0', fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
                            GOODS RECEIPT NOTE (GRN)
                          </div>

                          {/* GRN Meta Info Grid */}
                          <div className="grid grid-cols-2 gap-4 rounded-sm" style={{ border: '1.5px solid #1e293b', padding: '14px', marginBottom: '18px', fontSize: '13.5px', fontFamily: 'sans-serif', backgroundColor: '#fafafa' }}>
                            <div style={{ borderRight: '1.5px solid #cbd5e1', paddingRight: '14px' }} className="space-y-1.5">
                              <div><span style={{ color: '#0f172a', fontWeight: 'bold' }}>GRN No:</span> <span style={{ color: '#312e81', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px' }}>{selectedGrn.grn_number}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Receipt Date:</span> <span style={{ color: '#334155' }}>{dayjs(selectedGrn.received_date).format('DD/MM/YYYY')}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Supplier / Vendor:</span> <span style={{ color: '#334155' }}>{selectedGrn.purchase_order?.vendor?.name || 'N/A'}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Project / Site:</span> <span style={{ color: '#334155' }}>{selectedGrn.project?.name || selectedGrn.purchase_order?.project?.name || 'General Stock'}</span></div>
                            </div>
                            <div className="space-y-1.5 pl-2">
                              <div><span style={{ color: '#0f172a', fontWeight: 'bold' }}>PO Ref No:</span> <span style={{ color: '#312e81', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '15px' }}>{selectedGrn.purchase_order?.po_number || 'N/A'}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Invoice / Challan No:</span> <span style={{ color: '#334155' }}>{selectedGrn.challan_no || 'N/A'}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Vehicle No:</span> <span style={{ color: '#334155' }}>{selectedGrn.vehicle_no || 'N/A'}</span></div>
                              <div><span style={{ color: '#0f172a', fontWeight: '600' }}>Received By:</span> <span style={{ color: '#334155' }}>{selectedGrn.received_by_user?.username || 'Admin'}</span></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* PAGE 2+ HEADER BAR */
                        <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '10px', marginBottom: '14px' }} className="flex justify-between items-center">
                          <div style={{ fontSize: '15px', color: '#0f172a' }} className="font-extrabold uppercase">
                            EFFICIENT ELECTRICAL ENERGY & AUTOMATION PVT. LTD.
                          </div>
                          <div style={{ fontSize: '13px', color: '#312e81' }} className="font-bold font-mono">
                            GRN No: {selectedGrn.grn_number} (Page {pageIdx + 1} of {pagesData.length})
                          </div>
                        </div>
                      )}

                      {/* ITEMS TABLE */}
                      {pageData.tableItems.length > 0 && (
                        <table style={{ borderCollapse: 'collapse', border: '1.5px solid #1e293b', width: '100%', fontSize: '13px', fontFamily: 'sans-serif', marginBottom: '18px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', borderBottom: '1.5px solid #1e293b' }}>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '45px', fontSize: '13px' }}>S.No</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '110px', fontSize: '13px' }}>Item Code</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 8px', textAlign: 'left', fontSize: '13px' }}>Description & Specification</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '80px', fontSize: '13px' }}>Received Qty</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '60px', fontSize: '13px' }}>Unit</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 8px', textAlign: 'left', width: '160px', fontSize: '13px' }}>Storage Location</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageData.tableItems.map((item, idx) => {
                              const overallIndex = (selectedGrn.items || []).indexOf(item) + 1;
                              return (
                                <tr key={item.id || idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', color: '#0f172a' }}>
                                    {overallIndex > 0 ? overallIndex : idx + 1}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#312e81', fontSize: '13px' }}>
                                    {item.item_type?.code || '-'}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 8px', color: '#0f172a' }}>
                                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{item.item_type?.full_description || item.item_type?.name || 'Material Item'}</div>
                                    {item.item_type?.cat_no && (
                                      <div style={{ fontSize: '11.5px', color: '#475569' }}>Cat No: {item.item_type.cat_no}</div>
                                    )}
                                    {item.item_type?.make && (
                                      <div style={{ fontSize: '11.5px', color: '#312e81', fontWeight: '600' }}>Make: {item.item_type.make}</div>
                                    )}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#0f172a', fontSize: '13.5px' }}>
                                    {item.received_qty}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', color: '#334155' }}>
                                    {item.item_type?.unit || 'Nos'}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 8px', color: '#0f172a' }}>
                                    {item.shelf ? (
                                      <div>
                                        <span style={{ fontWeight: '600' }}>{item.shelf.name} ({item.shelf.code})</span>
                                        {item.rack && <div style={{ fontSize: '11.5px', color: '#312e81' }}>→ {item.rack.name} ({item.rack.rack_code})</div>}
                                      </div>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* SIGNATURE & REMARKS BLOCK ON LAST PAGE */}
                      {pageData.showSignature && (
                        <div style={{ marginTop: '20px' }}>
                          {selectedGrn.remarks && (
                            <div style={{ border: '1px solid #cbd5e1', padding: '10px', marginBottom: '24px', fontSize: '12px', backgroundColor: '#f8fafc', color: '#0f172a', borderRadius: '4px' }}>
                              <strong style={{ color: '#0f172a' }}>Remarks:</strong> {selectedGrn.remarks}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '35px', fontSize: '12px', color: '#0f172a' }}>
                            <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #0f172a', paddingTop: '6px', fontWeight: '600' }}>
                              Store Incharge / Receiver
                            </div>
                            <div style={{ textAlign: 'center', width: '180px', borderTop: '1px solid #0f172a', paddingTop: '6px', fontWeight: '600' }}>
                              Verified By
                            </div>
                            <div style={{ textAlign: 'center', width: '220px' }}>
                              <div style={{ borderTop: '1px solid #0f172a', paddingTop: '6px', fontWeight: 'bold' }}>
                                For EFFICIENT ELECTRICAL ENERGY AND AUTOMATION PRIVATE LIMITED
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '20px' }}>(Authorised Signatory)</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </AppLayout>
  );
};

export default GRNPage;
