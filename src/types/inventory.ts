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
  unit: string;
  unit_id?: number | null;
  unit_details?: Unit;
  total_quantity?: number;
  description?: string | null;
  createdAt?: string;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  location?: string | null;
  description?: string | null;
  createdAt?: string;
}

export interface ProjectInventory {
  id: number;
  project_id: number;
  item_type_id: number;
  quantity: number;
  min_quantity: number;
  createdAt?: string;
  updatedAt?: string;
  item_type?: ItemType;
  project?: Project;
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
  ordered_qty: number;
  received_qty: number;
  unit_price: number;
  total_price: number;
  item_type?: ItemType;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  project_id?: number | null;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  total_amount: number;
  order_date: string;
  expected_date?: string | null;
  notes?: string | null;
  vendor?: Vendor;
  project?: Project;
  items?: PurchaseOrderItem[];
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
