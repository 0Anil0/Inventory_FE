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
