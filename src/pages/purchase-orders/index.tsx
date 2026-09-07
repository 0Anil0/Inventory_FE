import React, { useState, useEffect, useRef } from 'react';
import {
  Table,
  Card,
  Button,
  Input,
  Modal,
  Form,
  Select,
  DatePicker,
  Space,
  Tag,
  Badge,
  message,
  InputNumber,
  Divider,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  ShoppingOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CheckOutlined,
  FilePdfOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { PurchaseOrder, Vendor, Project, ItemType, TermsAndConditions } from '../../types/inventory';
import { poApi, vendorApi, projectApi, itemTypeApi, termsApi } from '../../services/api';
import { AppLayout } from '../../components/layout/AppLayout';

// Constant Clauses array
const ALL_CLAUSES = [
  {
    id: 1,
    title: '1. ACKNOWLEDGEMENT:',
    text: 'This Order Confirmation to be forwarded H-185, IID CENTER, RIICO INDUSTRIAL AREA, ROAD NO.3 KALADWAS, UDAIPUR-313003, In the absence of receipt of communication within fortnight from the date of this Purchase order, it will be deemed to have been accepted in to.',
    height: 48,
  },
  {
    id: 2,
    title: '2. QUALITY:',
    text: 'All Material are to be supplied strictly in accordance to with specification/Samples/Drawing given, no departure from specification/Samples/Drawing is permitted without our prior agreement in writing, if any sub standard.',
    height: 48,
  },
  {
    id: 3,
    title: '3. INSPECTION:',
    text: 'Goods will be accepted only after final examination, test & Quality approval by company, if they are not in accordance with our specification or do not fulfil the purpose, we reserve rights to reject the goods and to cancel the order if we deem it necessary. The supplier shall collect at his cost the rejected goods within 15 days of receipt of intimation of such rejection. If supplier will fail to do so, the company shall be at liberty to dispose of the material in the manner it chooses.',
    height: 85,
  },
  {
    id: 4,
    title: '4. PRICE:',
    text: 'Price set out in this order is firm and no increase will be entertained without a written request giving reason for the increases, for an open order, the price is subject to the current market rate ruling at the time of delivery and subject to verification.',
    height: 52,
  },
  {
    id: 5,
    title: '5. OTHER CHARGES:',
    text: 'Price to include all incidental charges if any, unless otherwise agreed in to the order plus GST as applicable on the date of supply.',
    height: 40,
  },
  {
    id: 6,
    title: '6. DAMAGE:',
    text: 'All material supplied must be specified as regards to Quantity, Quality, weight, dimension etc. and will be subject to inspection and approval by us after delivery. We reserve the rights to Reject and return the Damage material within 15 days of receipt of material at the risk and expenses of the supplier and any advances against that supply will be 100% refund by supplier on immediate basis.',
    height: 65,
  },
  {
    id: 7,
    title: '7. GUARANTEE / WARRANTY:',
    text: 'The Equipment /Instrument/Component/material as the case may be shall be guaranteed for a period of twelve calendar months of reliable working of the equipment’s from the date of the unit going into regular operation, you shall be liable to replace any parts/equipment/Instrument/component that may fail or show signs of defects due to faulty designed, materials or workmanship, or erection of from any acts of omission by you & All such replacement of Equipment /Component/Parts/Material shall be made free of cost at site by you and removal of defective part shall be your responsibility.',
    height: 95,
  },
  {
    id: 8,
    title: '8. INSURANCE:',
    text: 'NIL',
    height: 30,
  },
  {
    id: 9,
    title: '9. GENERAL:',
    subItems: [
      'A. Tax Invoice, E-way bills, Duplicate Copy/Transporters copy required at our stores.',
      'B. Wherever the freight is to be borne by us the consignment to be dispatched through approved transport only.',
      'C. All payment will be made by our accounts department by crossed cheque /RTGS/NEFT only.',
      'D. We reserve the right to suspend dispatches of the material covered by this order in the event of strikes or other contingencies beyond the control of the company.',
      'E. The seller shall submit a sample free of charge prior to execution of order when an advance sample is required to be approved by company.',
      'F. All specification, drawing, tools & fixtures and other data supplied by the company are to be used exclusively for our company and these are to be returned to the company on demand.',
      'G. Payment of GST taxes and filling return thereof on GST portal should be made on time for availing of GST credit by us, else we will be forced to raise debit note to that effect for non-payment of GST Taxes and or the tax component will be withholding while making final payment.',
      'H. Acceptance of Invoice of GST portal will not amount to acceptance of goods and payment liability.',
      'I. This PO will be valid till 10 days offer passing the delivery date.',
    ],
    height: 210,
  },
];

interface POPageData {
  pageNumber: number;
  tableItems: any[];
  showCalculationBox: boolean;
  showTermsHeader: boolean;
  keyTerms: { label: string; value: string }[];
  clauses: typeof ALL_CLAUSES;
  showSignatures: boolean;
}

const buildPOPages = (selectedPO: PurchaseOrder, activeTerms: TermsAndConditions | null): POPageData[] => {
  const pages: POPageData[] = [];
  const MAX_PAGE_HEIGHT = 980;

  let currentPage: POPageData = {
    pageNumber: 1,
    tableItems: [],
    showCalculationBox: false,
    showTermsHeader: false,
    keyTerms: [],
    clauses: [],
    showSignatures: false,
  };

  let currentHeight = 349 + 38; // Top Header (349) + Table Header (38)
  const items = selectedPO.items || [];

  // 1. Table Items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemHeight = item.rating ? 52 : 40;

    if (currentHeight + itemHeight > MAX_PAGE_HEIGHT) {
      pages.push(currentPage);
      currentPage = {
        pageNumber: pages.length + 1,
        tableItems: [],
        showCalculationBox: false,
        showTermsHeader: false,
        keyTerms: [],
        clauses: [],
        showSignatures: false,
      };
      currentHeight = 45 + 38; // Page 2 Header + Table Header
    }

    currentPage.tableItems.push(item);
    currentHeight += itemHeight;
  }

  // 2. Calculation Breakdown Box
  const calcBoxHeight = 150;
  if (currentHeight + calcBoxHeight > MAX_PAGE_HEIGHT) {
    pages.push(currentPage);
    currentPage = {
      pageNumber: pages.length + 1,
      tableItems: [],
      showCalculationBox: false,
      showTermsHeader: false,
      keyTerms: [],
      clauses: [],
      showSignatures: false,
    };
    currentHeight = 45;
  }
  currentPage.showCalculationBox = true;
  currentHeight += calcBoxHeight;

  // 3. Terms Header & Key Terms
  const keyTermsList = [
    { label: 'Payment Terms:', value: activeTerms?.payment_terms || '20% Advance with PO' },
    { label: 'Inco Terms:', value: activeTerms?.inco_terms || 'Freight on Road' },
    { label: 'Rejection:', value: 'Material Must be same as per Ordered, otherwise it will be rejected by us.' },
    { label: 'Invoicing:', value: 'Original invoice must be submitted along with materials, otherwise it will be not accepted.' },
    { label: 'PO Reference:', value: 'Mention Purchase order/work order No on invoice against supply of materials or submission of Invoice.' },
    { label: 'Verification:', value: 'Actual Payment Will be done as per actual measurement/qty/weight slip/Final Verification.' },
  ];

  const termsHeaderHeight = 35 + keyTermsList.length * 20;

  if (currentHeight + termsHeaderHeight > MAX_PAGE_HEIGHT) {
    pages.push(currentPage);
    currentPage = {
      pageNumber: pages.length + 1,
      tableItems: [],
      showCalculationBox: false,
      showTermsHeader: false,
      keyTerms: [],
      clauses: [],
      showSignatures: false,
    };
    currentHeight = 45;
  }

  currentPage.showTermsHeader = true;
  currentPage.keyTerms = keyTermsList;
  currentHeight += termsHeaderHeight;

  // 4. Clauses
  for (let c = 0; c < ALL_CLAUSES.length; c++) {
    const clause = ALL_CLAUSES[c];
    if (currentHeight + clause.height > MAX_PAGE_HEIGHT) {
      pages.push(currentPage);
      currentPage = {
        pageNumber: pages.length + 1,
        tableItems: [],
        showCalculationBox: false,
        showTermsHeader: false,
        keyTerms: [],
        clauses: [],
        showSignatures: false,
      };
      currentHeight = 45;
    }

    currentPage.clauses.push(clause);
    currentHeight += clause.height;
  }

  // 5. Signatures Box
  const sigHeight = 95;
  if (currentHeight + sigHeight > MAX_PAGE_HEIGHT) {
    pages.push(currentPage);
    currentPage = {
      pageNumber: pages.length + 1,
      tableItems: [],
      showCalculationBox: false,
      showTermsHeader: false,
      keyTerms: [],
      clauses: [],
      showSignatures: false,
    };
    currentHeight = 45;
  }

  currentPage.showSignatures = true;
  currentHeight += sigHeight;

  pages.push(currentPage);
  return pages;
};

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloadingPDF, setDownloadingPDF] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Master Data State for Create Modal
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<TermsAndConditions[]>([]);
  const [, setSelectedTerms] = useState<TermsAndConditions | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);

  // Responsive desktop check
  const [isDesktop, setIsDesktop] = useState<boolean>(window.innerWidth >= 1024);

  const createForm = Form.useForm()[0];
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Purchase Orders
  const fetchPurchaseOrders = async () => {
    setLoading(true);
    try {
      const res = await poApi.getAll({
        search: searchQuery || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      if (res.success && res.purchaseOrders) {
        setPurchaseOrders(res.purchaseOrders);
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to fetch Purchase Orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all reference master data
  const fetchMasters = async () => {
    try {
      const [vRes, pRes, iRes, tRes] = await Promise.all([
        vendorApi.getAll({ limit: 1000 }),
        projectApi.getAll(),
        itemTypeApi.getAll({ limit: 1000 }),
        termsApi.getAll({ limit: 100 }),
      ]);

      if (vRes.success) setVendors(vRes.vendors || []);
      if (pRes.success) setProjects(pRes.projects || []);
      if (iRes.success) setItemTypes(iRes.items || []);
      if (tRes.success) {
        setTermsTemplates(tRes.templates || []);
        const defaultTerms = (tRes.templates || []).find((t: TermsAndConditions) => t.is_default);
        if (defaultTerms) setSelectedTerms(defaultTerms);
      }
    } catch (err: any) {
      console.error('Error fetching master data:', err);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchMasters();
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [searchQuery, statusFilter]);

  // Handle Receive Stock against PO
  const handleReceiveStock = async (poId: number) => {
    setReceivingId(poId);
    try {
      const res = await poApi.receiveStock(poId);
      if (res.success) {
        message.success('Stock received and inwarded into inventory successfully!');
        fetchPurchaseOrders();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to receive stock for PO');
    } finally {
      setReceivingId(null);
    }
  };

  // Open Document Preview Modal
  const handleOpenPreview = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsPreviewModalOpen(true);
  };

  // Per-Page Clean PDF Download Handler
  const handleDownloadPDF = async () => {
    const container = printRef.current;
    if (!container || !selectedPO) return;

    setDownloadingPDF(true);
    const cleanPONumber = selectedPO.po_number ? selectedPO.po_number.replace(/[/\\?%*:|"<>]/g, '_') : 'Document';

    try {
      const pageNodes = Array.from(
        container.querySelectorAll<HTMLElement>('.po-pdf-page')
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

      pdf.save(`PO_${cleanPONumber}.pdf`);
      message.success(`Purchase Order PDF PO_${cleanPONumber}.pdf saved to your Downloads folder!`);
    } catch (err: any) {
      console.error('PDF Download Error:', err);
      message.error('Failed to download PDF: ' + (err?.message || 'Rendering error'));
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Open Create PO Modal
  const handleOpenCreate = () => {
    createForm.resetFields();
    const nextSeq = purchaseOrders.length + 55;
    const defaultPONumber = `EEEA/26-27/${nextSeq}`;
    
    const defaultTemplate = termsTemplates.find((t) => t.is_default) || termsTemplates[0];
    if (defaultTemplate) {
      setSelectedTerms(defaultTemplate);
    }

    createForm.setFieldsValue({
      po_number: defaultPONumber,
      order_date: dayjs(),
      expected_date: dayjs().add(15, 'day'),
      terms_and_conditions_id: defaultTemplate?.id,
      items: [
        {
          item_type_id: undefined,
          item_code: '',
          cat_no: '',
          ordered_qty: 1,
          unit_price: 0,
          discount_percent: 0,
          gst_percent: 0,
        },
      ],
    });
    setIsCreateModalOpen(true);
  };

  // Create PO Submission
  const handleCreateSubmit = async (values: any) => {
    try {
      const payload = {
        po_number: values.po_number,
        vendor_id: values.vendor_id,
        project_id: values.project_id,
        terms_and_conditions_id: values.terms_and_conditions_id,
        notes: values.notes,
        expected_date: values.expected_date ? values.expected_date.format('YYYY-MM-DD') : undefined,
        items: values.items.map((item: any) => ({
          item_type_id: item.item_type_id,
          ordered_qty: Number(item.ordered_qty || 1),
          unit_price: Number(item.unit_price || 0),
          discount_percent: Number(item.discount_percent || 0),
          gst_percent: Number(item.gst_percent !== undefined ? item.gst_percent : 18),
          cat_no: item.cat_no,
          make: item.make,
          rating: item.rating,
        })),
      };

      const res = await poApi.create(payload);
      if (res.success) {
        message.success('Purchase Order created successfully!');
        setIsCreateModalOpen(false);
        fetchPurchaseOrders();
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to create Purchase Order');
    }
  };

  // Status Badge Colors
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return <Tag color="green" icon={<CheckCircleOutlined />} className="px-2 py-0.5 font-bold">RECEIVED (INWARDED)</Tag>;
      case 'ORDERED':
        return <Tag color="blue" icon={<ShoppingOutlined />} className="px-2 py-0.5 font-bold">ORDERED (PENDING)</Tag>;
      case 'DRAFT':
        return <Tag color="orange" className="px-2 py-0.5 font-bold">DRAFT</Tag>;
      case 'CANCELLED':
        return <Tag color="red" className="px-2 py-0.5 font-bold">CANCELLED</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Main PO Table Columns
  const columns: ColumnsType<PurchaseOrder> = [
    {
      title: 'S.No.',
      key: 'sno',
      width: 65,
      align: 'center',
      render: (_, __, index) => <span className="font-mono font-bold text-slate-500">{index + 1}</span>,
    },
    {
      title: 'PO Number & Date',
      key: 'po_number',
      width: 190,
      render: (_, record) => (
        <div>
          <div className="font-bold font-mono text-indigo-600 dark:text-indigo-400 text-sm tracking-wide">
            {record.po_number}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <CalendarOutlined /> {dayjs(record.order_date).format('DD MMM YYYY')}
          </div>
        </div>
      ),
    },
    {
      title: 'Supplier / Vendor',
      key: 'vendor',
      render: (_, record) => (
        <div>
          <div className="font-bold text-slate-800 dark:text-slate-100 font-['Outfit'] text-sm">
            {record.vendor?.name || 'N/A'}
          </div>
          {record.vendor?.tax_id && (
            <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
              GST: {record.vendor.tax_id}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Project Site',
      key: 'project',
      width: 140,
      render: (_, record) =>
        record.project ? (
          <Tag color="cyan" className="font-bold font-mono text-xs">
            {record.project.code}
          </Tag>
        ) : (
          <span className="text-xs text-slate-400 italic">General Stock</span>
        ),
    },
    {
      title: 'Items & Total Amount',
      key: 'amount',
      width: 200,
      align: 'right',
      render: (_, record) => {
        const subtotal = record.total_amount || 0;
        const totalTax = (record.items || []).reduce((sum, item) => {
          const itemSub = item.total_price || 0;
          const gst = item.gst_percent !== undefined ? item.gst_percent : 18;
          return sum + (item.tax_amount || itemSub * (gst / 100));
        }, 0);
        const grandTotal = subtotal + totalTax;

        return (
          <div>
            <div className="font-extrabold font-mono text-slate-900 dark:text-slate-100 text-base">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Basic: ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} + ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })} GST
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 160,
      align: 'center',
      render: (_, record) => getStatusTag(record.status),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      align: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View / Save Printable PO PDF Document">
            <Button
              type="primary"
              ghost
              icon={<FilePdfOutlined />}
              onClick={() => handleOpenPreview(record)}
              size="small"
              className="border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold"
            >
              Save PDF
            </Button>
          </Tooltip>

          {record.status !== 'RECEIVED' && (
            <Popconfirm
              title="Receive PO Stock?"
              description="This will instantly inward all line item quantities into inventory stock."
              onConfirm={() => handleReceiveStock(record.id)}
              okText="Inward Stock"
              okButtonProps={{ type: 'primary', className: 'bg-emerald-600' }}
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                size="small"
                loading={receivingId === record.id}
                className="bg-emerald-600 hover:bg-emerald-500 border-none text-xs font-semibold"
              >
                Receive
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // Helper to calculate form totals dynamically
  const formItems = Form.useWatch('items', createForm) || [];
  const calculatedTotals = formItems.reduce(
    (acc: { subtotal: number; tax: number }, curr: any) => {
      const qty = Number(curr?.ordered_qty || 0);
      const rate = Number(curr?.unit_price || 0);
      const disc = Number(curr?.discount_percent || 0);
      const gst = Number(curr?.gst_percent !== undefined ? curr.gst_percent : 18);

      const lineSubtotal = qty * rate * (1 - disc / 100);
      const lineTax = lineSubtotal * (gst / 100);

      return {
        subtotal: acc.subtotal + (isNaN(lineSubtotal) ? 0 : lineSubtotal),
        tax: acc.tax + (isNaN(lineTax) ? 0 : lineTax),
      };
    },
    { subtotal: 0, tax: 0 }
  );

  const calculatedSubtotal = calculatedTotals.subtotal;
  const calculatedGST = calculatedTotals.tax;
  const calculatedGrandTotal = calculatedSubtotal + calculatedGST;

  return (
    <AppLayout>
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 flex flex-col gap-3 h-auto lg:h-[calc(100vh-68px)] overflow-y-auto lg:overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <ShoppingOutlined className="text-3xl text-indigo-500" />
            <div>
              <h1 className="text-2xl font-bold app-text-main font-['Outfit'] mb-0.5">
                Purchase Order Management
              </h1>
              <p className="text-xs sm:text-sm app-text-muted mb-0">
                Create POs with per-item GST %, print official PDF documents with T&C, and inward stock automatically
              </p>
            </div>
          </div>

          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPurchaseOrders} loading={loading}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/30"
            >
              Create Purchase Order
            </Button>
          </Space>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl flex-1 flex flex-col h-auto lg:h-full overflow-visible lg:overflow-hidden">
          {/* Top Controls: Search & Status Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
              <Input
                placeholder="Search PO Number, Vendor Name, or Project Code..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="max-w-md"
              />
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="w-40"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ORDERED', label: 'Ordered (Pending)' },
                  { value: 'RECEIVED', label: 'Received (Inwarded)' },
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
              />
            </div>

            <Badge count={purchaseOrders.length} overflowCount={999} color="#6366f1">
              <Tag color="purple" className="text-sm px-3 py-1 font-bold font-['Outfit'] border-none">
                Total POs: {purchaseOrders.length} Records
              </Tag>
            </Badge>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-visible lg:overflow-hidden">
            <Table
              columns={columns}
              dataSource={purchaseOrders}
              rowKey="id"
              loading={loading}
              scroll={{
                x: 950,
                y: isDesktop ? 'calc(100vh - 360px)' : undefined,
              }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
              }}
            />
          </div>
        </Card>
      </main>

      {/* CREATE PURCHASE ORDER MODAL */}
      <Modal
        title={
          <div className="flex items-center gap-2.5 py-1 text-slate-800 dark:text-slate-100">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ShoppingOutlined className="text-lg" />
            </div>
            <span className="font-bold text-lg font-['Outfit']">Create New Purchase Order</span>
          </div>
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        destroyOnClose
        centered
        width={1160}
        style={{ top: 20, maxWidth: '95vw' }}
        styles={{
          body: {
            maxHeight: 'calc(85vh - 100px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '8px',
          },
        }}
        footer={[
          <Button key="cancel" size="large" onClick={() => setIsCreateModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            size="large"
            icon={<CheckOutlined />}
            onClick={() => createForm.submit()}
            className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-500/20"
          >
            Create PO & Generate Document
          </Button>,
        ]}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSubmit}
          className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10"
        >
          {/* Header Row: PO #, Vendor, Project, Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Form.Item
              name="po_number"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">PO Number</span>}
              rules={[{ required: true, message: 'PO Number required' }]}
            >
              <Input placeholder="e.g. EEEA/26-27/55" className="font-mono font-bold" />
            </Form.Item>

            <Form.Item
              name="vendor_id"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Supplier / Vendor</span>}
              rules={[{ required: true, message: 'Please select vendor' }]}
            >
              <Select
                placeholder="Select Vendor"
                showSearch
                optionFilterProp="children"
                options={vendors.map((v) => ({
                  value: v.id,
                  label: `${v.name}${v.tax_id ? ` (GST: ${v.tax_id})` : ''}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="project_id"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Link Project (Optional)</span>}
            >
              <Select
                placeholder="General / Select Project"
                allowClear
                options={projects.map((p) => ({
                  value: p.id,
                  label: `${p.code} - ${p.name}`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="expected_date"
              label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Expected Delivery Date</span>}
            >
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Divider className="my-3" />

          {/* Dynamic Line Items Section with Strict CSS Grid Alignment & min-w-0 Overflow Protection */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm app-text-main font-['Outfit']">Purchase Order Line Items</span>
              <span className="text-xs text-slate-400">Select material, auto-populate item code, set rate, discount %, and GST %</span>
            </div>

            <div className="overflow-x-auto pb-1">
              <div style={{ minWidth: '950px' }}>
                {/* Pixel-Perfect CSS Grid Header Bar */}
                <div
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 border border-slate-200 dark:border-white/10 items-center"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1fr) 110px 100px 75px 110px 75px 75px 110px 36px',
                    gap: '8px',
                  }}
                >
                  <div className="truncate">Item Master (Select Name)</div>
                  <div className="truncate text-center">Item Code</div>
                  <div className="truncate text-center">Cat No.</div>
                  <div className="truncate text-center">Qty</div>
                  <div className="truncate text-center">Unit Price (₹)</div>
                  <div className="truncate text-center">Disc %</div>
                  <div className="truncate text-center">GST %</div>
                  <div className="truncate text-center">Net Subtotal</div>
                  <div className="text-center truncate">Act</div>
                </div>

                <Form.List name="items">
                  {(fields, { add, remove }) => (
                    <div className="space-y-2">
                      {fields.map(({ key, name, ...restField }) => {
                        const currentQty = createForm.getFieldValue(['items', name, 'ordered_qty']) || 0;
                        const currentRate = createForm.getFieldValue(['items', name, 'unit_price']) || 0;
                        const currentDisc = createForm.getFieldValue(['items', name, 'discount_percent']) || 0;
                        const currentGst = createForm.getFieldValue(['items', name, 'gst_percent']) || 0;
                        
                        const lineSubtotal = currentQty * currentRate * (1 - currentDisc / 100);
                        const lineTax = lineSubtotal * (currentGst / 100);
                        const lineNet = lineSubtotal + lineTax;

                        return (
                          <div
                            key={key}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 relative"
                          >
                            <div
                              className="items-center"
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(180px, 1fr) 110px 100px 75px 110px 75px 75px 110px 36px',
                                gap: '8px',
                              }}
                            >
                              {/* 1. Item Master Select */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'item_type_id']}
                                  rules={[{ required: true, message: 'Select Item' }]}
                                  className="mb-0"
                                >
                                  <Select
                                    placeholder="Select Material Item"
                                    showSearch
                                    optionFilterProp="children"
                                    style={{ width: '100%', minWidth: 0 }}
                                    onChange={(val) => {
                                      const item = itemTypes.find((i) => i.id === val);
                                      if (item) {
                                        createForm.setFieldValue(['items', name, 'item_code'], item.code || '');
                                        createForm.setFieldValue(['items', name, 'unit_price'], item.unit_rate || 0);
                                        createForm.setFieldValue(['items', name, 'discount_percent'], item.discount || 0);
                                        createForm.setFieldValue(['items', name, 'gst_percent'], 0);
                                        createForm.setFieldValue(['items', name, 'cat_no'], item.cat_no || '');
                                        createForm.setFieldValue(['items', name, 'make'], item.make || '');
                                        createForm.setFieldValue(['items', name, 'rating'], item.rating || '');
                                      }
                                    }}
                                    options={itemTypes.map((it) => ({
                                      value: it.id,
                                      label: `${it.name}${it.cat_no ? ` (${it.cat_no})` : ''}`,
                                    }))}
                                  />
                                </Form.Item>
                              </div>

                              {/* 2. Item Code / No. (Non-editable) */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'item_code']}
                                  className="mb-0"
                                >
                                  <Input placeholder="Item Code" disabled style={{ width: '100%', minWidth: 0 }} className="font-mono text-xs font-semibold text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                                </Form.Item>
                              </div>

                              {/* 3. Cat No. (Non-editable) */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'cat_no']}
                                  className="mb-0"
                                >
                                  <Input placeholder="Cat No" disabled style={{ width: '100%', minWidth: 0 }} className="font-mono text-xs text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200" />
                                </Form.Item>
                              </div>

                              {/* 4. Qty */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'ordered_qty']}
                                  rules={[{ required: true, message: 'Qty' }]}
                                  className="mb-0"
                                >
                                  <InputNumber min={1} controls={false} style={{ width: '100%', minWidth: 0 }} className="text-xs font-bold text-center" placeholder="Qty" />
                                </Form.Item>
                              </div>

                              {/* 5. Unit Price (₹) */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'unit_price']}
                                  rules={[{ required: true, message: 'Price' }]}
                                  className="mb-0"
                                >
                                  <InputNumber min={0} style={{ width: '100%', minWidth: 0 }} className="text-xs font-mono text-center" placeholder="Price" />
                                </Form.Item>
                              </div>

                              {/* 6. Disc % */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'discount_percent']}
                                  className="mb-0"
                                >
                                  <InputNumber min={0} max={100} controls={false} style={{ width: '100%', minWidth: 0 }} className="text-xs text-center" placeholder="Disc %" />
                                </Form.Item>
                              </div>

                              {/* 7. GST % */}
                              <div className="min-w-0">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'gst_percent']}
                                  rules={[{ required: true, message: 'GST %' }]}
                                  className="mb-0"
                                >
                                  <InputNumber min={0} max={100} controls={false} style={{ width: '100%', minWidth: 0 }} className="text-xs font-bold text-center text-indigo-600" placeholder="GST %" />
                                </Form.Item>
                              </div>

                              {/* 8. Net Subtotal Display */}
                              <div className="min-w-0">
                                <Form.Item className="mb-0">
                                  <Input
                                    value={`₹${(isNaN(lineNet) ? 0 : lineNet).toFixed(2)}`}
                                    disabled
                                    style={{ width: '100%', minWidth: 0 }}
                                    className="font-mono text-xs font-bold text-center bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                                  />
                                </Form.Item>
                              </div>

                              {/* 9. Action (Delete Button) */}
                              <div className="min-w-0 flex justify-center">
                                <Form.Item className="mb-0">
                                  {fields.length > 1 ? (
                                    <Button
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => remove(name)}
                                    />
                                  ) : (
                                    <div style={{ width: 32 }} />
                                  )}
                                </Form.Item>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      <Button
                        type="dashed"
                        onClick={() => add({ ordered_qty: 1, unit_price: 0, discount_percent: 0, gst_percent: 0 })}
                        block
                        icon={<PlusOutlined />}
                        className="border-indigo-400 text-indigo-600 dark:text-indigo-400 font-semibold mt-2"
                      >
                        Add Another Line Item Row
                      </Button>
                    </div>
                  )}
                </Form.List>
              </div>
            </div>
          </div>

          {/* Terms & Summary Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="lg:col-span-7">
              <Form.Item
                name="terms_and_conditions_id"
                label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Terms & Conditions Template</span>}
              >
                <Select
                  placeholder="Select Terms & Conditions Template"
                  onChange={(val) => {
                    const tmpl = termsTemplates.find((t) => t.id === val);
                    if (tmpl) setSelectedTerms(tmpl);
                  }}
                  options={termsTemplates.map((t) => ({
                    value: t.id,
                    label: `${t.title}${t.is_default ? ' (Default)' : ''}`,
                  }))}
                />
              </Form.Item>

              <Form.Item
                name="notes"
                label={<span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Special Notes / Instructions</span>}
              >
                <Input.TextArea placeholder="Enter any extra delivery notes or instructions..." rows={2} />
              </Form.Item>
            </div>

            {/* Calculations Card */}
            <div className="lg:col-span-5 bg-indigo-50/50 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex flex-col justify-between">
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Basic Subtotal Amount:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{calculatedSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Add CGST:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{(calculatedGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Add SGST:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    ₹{(calculatedGST / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <Divider className="my-1 border-indigo-200 dark:border-indigo-800" />
                <div className="flex justify-between text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                  <span>Grand Total (Incl. GST):</span>
                  <span>
                    ₹{calculatedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* PRINTABLE DOCUMENT PREVIEW MODAL */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <FilePdfOutlined className="text-indigo-500 text-lg" />
              <span className="font-bold text-lg font-['Outfit']">Purchase Order Document Preview</span>
            </div>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownloadPDF}
              loading={downloadingPDF}
              className="bg-indigo-600 hover:bg-indigo-500 font-semibold"
            >
              Download PDF
            </Button>
          </div>
        }
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        width={980}
        style={{ top: 20, maxWidth: '95vw' }}
        styles={{
          body: {
            maxHeight: 'calc(85vh - 80px)',
            overflowY: 'auto',
            paddingRight: '8px',
          },
        }}
        centered
        footer={null}
        className="po-print-modal"
      >
        {selectedPO && (() => {
          const documentSubtotal = selectedPO.total_amount || 0;
          const documentTax = (selectedPO.items || []).reduce((sum, item) => {
            const sub = item.total_price || 0;
            const gst = item.gst_percent !== undefined ? item.gst_percent : 0;
            return sum + (item.tax_amount || (sub * (gst / 100)));
          }, 0);
          const documentGrandTotal = documentSubtotal + documentTax;
          const activeTerms = selectedPO.terms_and_conditions || termsTemplates.find((t) => t.id === selectedPO.terms_and_conditions_id) || termsTemplates.find((t) => t.is_default) || termsTemplates[0];

          const pagesData = buildPOPages(selectedPO, activeTerms);

          return (
            <div className="bg-slate-100 p-4 rounded-lg space-y-6">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .po-print-modal, .po-print-modal * {
                    visibility: visible;
                  }
                  .po-print-modal {
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
                      className="po-pdf-page bg-white p-7 rounded-lg shadow-sm border border-slate-200"
                      style={{ backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'sans-serif' }}
                    >
                      {/* PAGE 1 HEADER */}
                      {pageIdx === 0 ? (
                        <>
                          {/* Document Top Header with Logo - Balanced 3-Column Grid */}
                          <div style={{ borderBottom: '2.5px solid #0f172a', paddingBottom: '14px', marginBottom: '14px' }}>
                            <div className="grid grid-cols-[100px_1fr_100px] items-center gap-3">
                              <div style={{ width: '100px', height: '100px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px' }} className="shrink-0 flex items-center justify-center">
                                <img src="/logo.png" alt="Company Logo" className="max-h-full max-w-full object-contain" />
                              </div>
                              <div className="text-center">
                                <h1 style={{ color: '#0f172a', fontFamily: 'sans-serif', fontSize: '22px', lineHeight: '1.25' }} className="font-extrabold uppercase tracking-wide mb-1.5">
                                  EFFICIENT ELECTRICAL ENERGY & AUTOMATION PVT. LTD.
                                </h1>
                                <p style={{ color: '#334155', fontSize: '13px', lineHeight: '1.4' }} className="mb-0.5 font-medium">
                                  H-185, IID CENTER, RIICO INDUSTRIAL AREA, ROAD NO.3 KALADWAS, UDAIPUR-313003 (RAJASTHAN)
                                </p>
                                <p style={{ color: '#334155', fontSize: '13px', lineHeight: '1.4' }} className="mb-0.5 font-medium">
                                  Email: eeenergyautomation@gmail.com, purchase.eeea@gmail.com | Cell: 9784534720, 9414166299
                                </p>
                                <p style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '14px' }} className="font-bold mt-1">
                                  GSTIN: 08AAECE4417C1Z4
                                </p>
                              </div>
                              <div style={{ width: '100px', height: '100px' }} className="shrink-0"></div>
                            </div>
                          </div>

                          {/* Document Title Ribbon */}
                          <div style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', padding: '6px 0', fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '14px' }}>
                            PURCHASE ORDER
                          </div>

                          {/* Vendor & PO Meta Info Grid */}
                          <div className="grid grid-cols-2 gap-4 rounded-sm" style={{ border: '1.5px solid #1e293b', padding: '14px', marginBottom: '18px', fontSize: '13.5px', fontFamily: 'sans-serif', backgroundColor: '#fafafa' }}>
                            <div style={{ borderRight: '1.5px solid #cbd5e1', paddingRight: '14px' }} className="space-y-1.5">
                              <div style={{ color: '#0f172a', fontSize: '15px' }} className="font-bold uppercase tracking-tight">{selectedPO.vendor?.name}</div>
                              <div style={{ color: '#334155' }}>{selectedPO.vendor?.address || 'KALADWAS INDUSTRIAL AREA, UDAIPUR'}</div>
                              {selectedPO.vendor?.contact_person && (
                                <div><span className="font-semibold text-slate-800">Attn:</span> {selectedPO.vendor.contact_person}</div>
                              )}
                              {selectedPO.vendor?.phone && (
                                <div><span className="font-semibold text-slate-800">Phone:</span> {selectedPO.vendor.phone}</div>
                              )}
                              {selectedPO.vendor?.tax_id && (
                                <div className="font-bold font-mono text-slate-800"><span className="font-semibold font-sans">GSTIN:</span> {selectedPO.vendor.tax_id}</div>
                              )}
                            </div>

                            <div className="space-y-1.5 pl-2">
                              <div className="grid grid-cols-2 items-center">
                                <span className="font-bold text-slate-900">PO No:</span>
                                <span style={{ color: '#312e81', fontSize: '15px' }} className="font-bold font-mono">{selectedPO.po_number}</span>
                              </div>
                              <div className="grid grid-cols-2 items-center">
                                <span className="font-semibold text-slate-800">PO Date:</span>
                                <span>{dayjs(selectedPO.order_date).format('DD/MM/YYYY')}</span>
                              </div>
                              {selectedPO.expected_date && (
                                <div className="grid grid-cols-2 items-center">
                                  <span className="font-semibold text-slate-800">Delivery Date:</span>
                                  <span>{dayjs(selectedPO.expected_date).format('DD/MM/YYYY')}</span>
                                </div>
                              )}
                              {selectedPO.project && (
                                <div className="grid grid-cols-2 items-center">
                                  <span className="font-semibold text-slate-800">Site / Project:</span>
                                  <span className="font-bold text-slate-900">{selectedPO.project.code} - {selectedPO.project.name}</span>
                                </div>
                              )}
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
                            PO No: {selectedPO.po_number} (Page {pageIdx + 1} of {pagesData.length})
                          </div>
                        </div>
                      )}

                      {/* ITEMS TABLE (If page has table items) */}
                      {pageData.tableItems.length > 0 && (
                        <table style={{ borderCollapse: 'collapse', border: '1.5px solid #1e293b', width: '100%', fontSize: '13px', fontFamily: 'sans-serif', marginBottom: '18px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', borderBottom: '1.5px solid #1e293b' }}>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '44px', fontSize: '13px' }}>S.No.</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '115px', fontSize: '13px' }}>Item Code</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '100px', fontSize: '13px' }}>Cat. No.</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 8px', textAlign: 'left', fontSize: '13px' }}>Description & Specification</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '85px', fontSize: '13px' }}>Make</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '50px', fontSize: '13px' }}>Qty</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '50px', fontSize: '13px' }}>Unit</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 8px', textAlign: 'right', width: '85px', fontSize: '13px' }}>Unit Rate</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '60px', fontSize: '13px' }}>Disc %</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 6px', textAlign: 'center', width: '60px', fontSize: '13px' }}>GST %</th>
                              <th style={{ border: '1px solid #1e293b', padding: '10px 8px', textAlign: 'right', width: '105px', fontSize: '13px' }}>Net Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageData.tableItems.map((item, idx) => {
                              const overallIndex = (selectedPO.items || []).indexOf(item) + 1;
                              return (
                                <tr key={item.id || idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', verticalAlign: 'middle' }}>{overallIndex > 0 ? overallIndex : idx + 1}</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: '#312e81', fontSize: '13px', verticalAlign: 'middle' }}>
                                    {item.item_type?.code || '-'}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', verticalAlign: 'middle' }}>
                                    {item.cat_no || item.item_type?.cat_no || '-'}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 8px', fontWeight: 500, fontSize: '13px', verticalAlign: 'middle' }}>
                                    {item.item_type?.name || 'Material Item'}
                                    {item.rating && <span style={{ display: 'block', fontSize: '12px', color: '#475569', marginTop: '2px' }}>Rating: {item.rating}</span>}
                                  </td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontWeight: 600, fontSize: '13px', verticalAlign: 'middle' }}>{item.make || item.item_type?.make || 'L&T'}</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13.5px', verticalAlign: 'middle' }}>{item.ordered_qty}</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontSize: '13px', verticalAlign: 'middle' }}>{item.item_type?.unit || 'Nos'}</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13.5px', verticalAlign: 'middle' }}>₹{item.unit_price.toFixed(2)}</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: '13px', verticalAlign: 'middle' }}>{item.discount_percent || 0}%</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 6px', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', color: '#312e81', fontSize: '13px', verticalAlign: 'middle' }}>{item.gst_percent !== undefined ? item.gst_percent : 0}%</td>
                                  <td style={{ border: '1px solid #1e293b', padding: '9px 8px', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '13.5px', verticalAlign: 'middle' }}>
                                    ₹{((item.total_price || 0) + (item.tax_amount || ((item.total_price || 0) * ((item.gst_percent || 0) / 100)))).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}

                      {/* CALCULATIONS BREAKDOWN BOX */}
                      {pageData.showCalculationBox && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px', fontFamily: 'sans-serif', fontSize: '13.5px' }}>
                          <div style={{ width: '350px', border: '1.5px solid #1e293b', padding: '10px 14px', backgroundColor: '#f8fafc' }} className="space-y-1.5 rounded-sm">
                            <div className="flex justify-between items-center">
                              <span>Sub Total (Basic Amount):</span>
                              <span className="font-mono font-bold">₹{documentSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ color: '#334155' }} className="flex justify-between items-center">
                              <span>Add CGST:</span>
                              <span className="font-mono">₹{(documentTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ color: '#334155' }} className="flex justify-between items-center">
                              <span>Add SGST:</span>
                              <span className="font-mono">₹{(documentTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ borderTop: '1.5px solid #1e293b', paddingTop: '6px', marginTop: '6px', color: '#0f172a' }} className="flex justify-between items-center font-bold text-base">
                              <span>Grand Total:</span>
                              <span className="font-mono text-base">₹{documentGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TERMS & CONDITIONS SECTION */}
                      {(pageData.showTermsHeader || pageData.clauses.length > 0) && (
                        <div style={{ border: '1.5px solid #1e293b', padding: '14px', marginBottom: '24px', fontSize: '12px', fontFamily: 'sans-serif', backgroundColor: '#ffffff' }}>
                          {pageData.showTermsHeader && (
                            <>
                              <div className="font-bold text-sm uppercase underline mb-2 tracking-wide" style={{ color: '#0f172a' }}>Terms & Conditions:</div>
                              <div style={{ color: '#1e293b' }} className="space-y-1.5 leading-normal mb-3">
                                {pageData.keyTerms.map((term, tIdx) => (
                                  <div key={tIdx}><strong>{term.label}</strong> {term.value}</div>
                                ))}
                              </div>
                            </>
                          )}

                          {pageData.clauses.length > 0 && (
                            <div className="space-y-2 leading-normal">
                              {pageData.clauses.map((clause) => (
                                <div key={clause.id} className="pt-1">
                                  <div className="font-bold text-slate-900">{clause.title}</div>
                                  {clause.text && (
                                    <div className="pl-3 text-[11.5px] text-slate-700 leading-snug">
                                      {clause.text}
                                    </div>
                                  )}
                                  {clause.subItems && (
                                    <div className="pl-3 text-[11.5px] text-slate-700 space-y-1 leading-snug">
                                      {clause.subItems.map((sub, sIdx) => (
                                        <div key={sIdx}>{sub}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* AUTHORISED SIGNATORIES */}
                      {pageData.showSignatures && (
                        <div className="flex justify-between items-end pt-6 font-sans text-xs" style={{ marginTop: '24px' }}>
                          <div style={{ width: '180px', borderTop: '1.5px solid #64748b', paddingTop: '6px' }} className="text-center font-bold text-slate-800 text-[13px]">
                            Prepared By
                          </div>
                          <div style={{ width: '180px', borderTop: '1.5px solid #64748b', paddingTop: '6px' }} className="text-center font-bold text-slate-800 text-[13px]">
                            Verified / Checked By
                          </div>
                          <div style={{ width: '280px', borderTop: '1.5px solid #0f172a', paddingTop: '6px' }} className="text-center font-bold text-slate-900 text-[13px]">
                            For EFFICIENT ELECTRICAL ENERGY & AUTOMATION PVT. LTD.
                            <span className="block font-normal text-[11px] text-slate-600 mt-6">(Authorised Signatory)</span>
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

export default PurchaseOrdersPage;
