import type { StorageShelf, StorageRack } from './storage';

export interface Make {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemDescription {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface Unit {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemType {
  id: number;
  name: string;
  code: string;
  cat_no?: string | null;
  hsn_code?: string | null;
  make?: string | null;
  rating?: string | null;
  switchgear_family?: string | null;
  full_description?: string | null;
  unit: string;
  unit_id?: number | null;
  unit_details?: Unit;
  total_quantity?: number;
  description?: string | null;
  unit_rate?: number;
  base_price?: number;
  discount?: number;
  createdAt?: string;
}


export interface Project {
  id: number;
  name: string;
  code: string;
  location?: string | null;
  description?: string | null;
  parent_id?: number | null;
  parent?: Project | null;
  client_id?: number | null;
  client?: {
    id: number;
    name: string;
    code?: string;
  } | null;
  sub_projects?: Project[];
  children?: Project[];
  createdAt?: string;
  updatedAt?: string;
}


export interface ProjectInventory {
  id: number;
  project_id?: number | null;
  item_type_id: number;
  shelf_id?: number | null;
  rack_id?: number | null;
  quantity: number;
  min_quantity: number;
  createdAt?: string;
  updatedAt?: string;
  item_type?: ItemType;
  project?: Project;
  shelf?: StorageShelf;
  rack?: StorageRack;
}

export interface StockMovement {
  id: number;
  project_id: number;
  item_type_id: number;
  user_id?: number | null;
  type: 'IN' | 'OUT' | 'SET' | 'TRANSFER';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes?: string | null;
  createdAt?: string;
  project?: Project;
  item_type?: ItemType;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
}

export interface ProjectBreakdown {
  id: number;
  name: string;
  code: string;
  itemCount: number;
  totalUnits: number;
  outCount: number;
  lowCount: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalItemTypes: number;
  totalStockUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  lowStockItems: ProjectInventory[];
  projectBreakdown: ProjectBreakdown[];
  recentMovements: StockMovement[];
}

export interface Vendor {
  id: number;
  name: string;
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  item_type_id: number;
  cat_no?: string | null;
  make?: string | null;
  rating?: string | null;
  hsn_code?: string | null;
  ordered_qty: number;
  received_qty: number;
  unit_price: number;
  discount_percent?: number;
  gst_percent?: number;
  tax_amount?: number;
  total_price: number;
  item_type?: ItemType;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  project_id?: number | null;
  terms_and_conditions_id?: number | null;
  created_by_id?: number | null;
  approved_by_id?: number | null;
  approved_at?: string | null;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED' | 'REJECTED';
  total_amount: number;
  order_date: string;
  expected_date?: string | null;
  notes?: string | null;
  vendor?: Vendor;
  project?: Project;
  terms_and_conditions?: TermsAndConditions | null;
  created_by_user?: {
    id: number;
    username: string;
    email?: string;
  } | null;
  approved_by_user?: {
    id: number;
    username: string;
    email?: string;
  } | null;
  items?: PurchaseOrderItem[];
  createdAt?: string;
}

export interface POApprover {
  id: number;
  user_id: number;
  min_amount?: number;
  max_amount?: number | null;
  is_active: boolean;
  user?: {
    id: number;
    username: string;
    email?: string;
    role?: {
      id: number;
      name: string;
    };
  };
  createdAt?: string;
}

export interface MaterialIssueItem {
  id: number;
  material_issue_id: number;
  item_type_id: number;
  quantity: number;
  item_type?: ItemType;
}

export interface MaterialIssue {
  id: number;
  issue_number: string;
  project_id: number;
  issued_to: string;
  issued_by_user_id?: number | null;
  issue_date: string;
  notes?: string | null;
  project?: Project;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
  items?: MaterialIssueItem[];
  createdAt?: string;
}

export interface TermsAndConditions {
  id: number;
  title: string;
  payment_terms?: string | null;
  inco_terms?: string | null;
  content: string;
  is_default: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectAssignmentItem {
  id: number;
  assignment_id: number;
  item_type_id: number;
  quantity: number;
  item_type?: ItemType;
  createdAt?: string;
}

export interface ProjectAssignment {
  id: number;
  assignment_no: string;
  from_project_id?: number | null;
  to_project_id: number;
  assigned_to_person: string;
  created_by_user_id?: number | null;
  assignment_date?: string;
  notes?: string | null;
  to_project?: Project;
  user?: {
    id: number;
    username: string;
    email?: string;
  };
  items?: ProjectAssignmentItem[];
  createdAt?: string;
}

export interface SubProjectCostingItem {
  id: number;
  name: string;
  code: string;
  location?: string;
  items_count: number;
  total_qty: number;
  money_invested: number;
  percent_share: number;
}

export interface CategoryCostingItem {
  category: string;
  items_count: number;
  total_qty: number;
  total_cost: number;
  percent_share: number;
}

export interface CostingLedgerItem {
  id: number;
  assignment_id: number;
  assignment_no: string;
  site_id: number;
  site_name: string;
  site_code: string;
  item_type_id: number;
  code: string;
  name: string;
  cat_no: string;
  make: string;
  unit: string;
  category: string;
  quantity: number;
  base_unit_price: number;
  disc_percent: number;
  gst_percent: number;
  unit_cost: number; // Effective purchase rate incl. GST
  total_cost: number;
  status: string;
  assigned_at?: string;
}

export interface ProjectCostingReport {
  summary: {
    total_projects: number;
    total_money_invested: number;
    total_project_cost: number;
    total_quantity_assigned: number;
    total_item_types: number;
    total_sub_projects: number;
  };
  sub_projects_costing: SubProjectCostingItem[];
  category_costing: CategoryCostingItem[];
  itemized_ledger: CostingLedgerItem[];
  selected_project?: Project | null;
}

export interface POItemTrackRecord {
  id: number;
  po_id: number;
  po_number: string;
  order_date?: string;
  expected_date?: string;
  po_status: string;
  vendor_id?: number;
  vendor_name: string;
  project_id?: number;
  project_name: string;
  created_by: string;

  item_type_id: number;
  item_code: string;
  item_name: string;
  cat_no: string;
  make: string;
  rating: string;
  unit: string;
  hsn_code: string;

  ordered_qty: number;
  received_qty: number;
  pending_qty: number;
  unit_price: number;
  discount_percent: number;
  gst_percent: number;
  tax_amount: number;
  net_subtotal: number;
  total_price: number;
}

export interface POItemTrackingResponse {
  success: boolean;
  summary: {
    totalRecords: number;
    totalOrderedQty: number;
    totalReceivedQty: number;
    totalPendingQty: number;
    totalSpend: number;
  };
  items: POItemTrackRecord[];
}


