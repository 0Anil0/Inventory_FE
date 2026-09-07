import { API_BASE_URL, AUTH_ENDPOINTS, USER_ENDPOINTS } from '../constants/api.constants';
import type { User, Role, AuthResponse, LoginCredentials, SignupCredentials } from '../types/auth';
import type {
  ItemType,
  Project,
  ProjectInventory,
  Unit,
  StockMovement,
  DashboardStats,
  Vendor,
  PurchaseOrder,
  POApprover,
  MaterialIssue,
  ItemDescription,
  TermsAndConditions,
  ProjectAssignment,
} from '../types/inventory';
import type { StorageShelf, StorageRack } from '../types/storage';


// Token Helper
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('inventory_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
};

// Auth API Client
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  signup: async (data: SignupCredentials): Promise<AuthResponse> => {
    const res = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.SIGNUP}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getMe: async (): Promise<{ success: boolean; user: User }> => {
    const res = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.ME}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// User API Client
export const userApi = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role_id?: number;
    username?: string;
    email?: string;
  }): Promise<{ success: boolean; users: User[]; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.role_id) query.append('role_id', String(params.role_id));
    if (params?.username) query.append('username', params.username);
    if (params?.email) query.append('email', params.email);

    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.USERS}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },


  getRoles: async (): Promise<{ success: boolean; roles: Role[] }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.ROLES}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createUser: async (data: {
    username: string;
    email?: string;
    password: string;
    role_id: number;
  }): Promise<{ success: boolean; message?: string; user?: User }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.USERS}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateUser: async (
    id: number,
    data: { username?: string; email?: string; password?: string; role_id?: number }
  ): Promise<{ success: boolean; message?: string; user?: User }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.USERS}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteUser: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.USERS}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createRole: async (data: { name: string; description?: string }): Promise<{ success: boolean; role?: Role }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.ROLES}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateRole: async (id: number, data: { name?: string; description?: string }): Promise<{ success: boolean; role?: Role }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.ROLES}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteRole: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.ROLES}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Make Master API Client
export const makeApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    name?: string;
    code?: string;
  }): Promise<{ success: boolean; makes: Array<{ id: number; name: string; code?: string; description?: string }>; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.name) query.append('name', params.name);
    if (params?.code) query.append('code', params.code);

    const res = await fetch(`${API_BASE_URL}/makes?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: { name: string; code?: string; description?: string }): Promise<{ success: boolean; make: { id: number; name: string; code?: string; description?: string } }> => {
    const res = await fetch(`${API_BASE_URL}/makes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: number, data: { name?: string; code?: string; description?: string }): Promise<{ success: boolean; make: any }> => {
    const res = await fetch(`${API_BASE_URL}/makes/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/makes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Item Description Master API Client
export const itemDescriptionApi = {
  getAll: async (): Promise<{ success: boolean; itemDescriptions: ItemDescription[] }> => {
    const res = await fetch(`${API_BASE_URL}/item-descriptions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: { name: string; code?: string; description?: string }): Promise<{ success: boolean; itemDescription: ItemDescription }> => {
    const res = await fetch(`${API_BASE_URL}/item-descriptions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id: number, data: { name?: string; code?: string; description?: string }): Promise<{ success: boolean; itemDescription: ItemDescription }> => {
    const res = await fetch(`${API_BASE_URL}/item-descriptions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/item-descriptions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};


// Item Type API Client
export const itemTypeApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    make?: string;
    rating?: string;
    code?: string;
    cat_no?: string;
    name?: string;
    unit?: string;
  }): Promise<{ success: boolean; items: ItemType[]; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.make) query.append('make', params.make);
    if (params?.rating) query.append('rating', params.rating);
    if (params?.code) query.append('code', params.code);
    if (params?.cat_no) query.append('cat_no', params.cat_no);
    if (params?.name) query.append('name', params.name);
    if (params?.unit) query.append('unit', params.unit);

    const res = await fetch(`${API_BASE_URL}/item-types?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },


  create: async (data: {
    name: string;
    code: string;
    rating?: string;
    full_description?: string;
    cat_no?: string;
    make?: string;
    unit?: string;
    unit_id?: number;
    unit_rate?: number;
    discount?: number;
    description?: string;
  }): Promise<{ success: boolean; item: ItemType }> => {
    const res = await fetch(`${API_BASE_URL}/item-types`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: any
  ): Promise<{ success: boolean; item: ItemType }> => {
    const res = await fetch(`${API_BASE_URL}/item-types/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/item-types/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Project API Client
export const projectApi = {
  getAll: async (): Promise<{ success: boolean; projects: Project[] }> => {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    name: string;
    code: string;
    location?: string;
    description?: string;
    parent_id?: number | null;
  }): Promise<{ success: boolean; project: Project }> => {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: { name?: string; code?: string; location?: string; description?: string; parent_id?: number | null }
  ): Promise<{ success: boolean; project: Project }> => {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Inventory API Client
export const inventoryApi = {
  getAll: async (): Promise<{ success: boolean; inventory: ProjectInventory[] }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/all`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getByProject: async (
    projectId: number
  ): Promise<{ success: boolean; inventory: ProjectInventory[] }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  adjustQuantity: async (data: {
    project_id: number;
    item_type_id: number;
    adjustment_type?: 'ADD' | 'REMOVE' | 'SET';
    amount: number;
    min_quantity?: number;
    notes?: string;
  }): Promise<{ success: boolean; inventoryItem: ProjectInventory }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  batchAdjustQuantity: async (data: {
    project_id: number;
    items: Array<{
      item_type_id: number;
      quantity?: number;
      initial_quantity?: number;
      min_quantity?: number;
    }>;
    notes?: string;
  }): Promise<{ success: boolean; inventoryItems: ProjectInventory[] }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/batch-adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  transferStock: async (data: {
    from_project_id: number;
    to_project_id: number;
    item_type_id: number;
    quantity: number;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// Dashboard API Client
export const dashboardApi = {
  getStats: async (): Promise<{ success: boolean; stats: DashboardStats }> => {
    const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Stock Movement Ledger API Client
export const stockMovementApi = {
  getAll: async (params?: {
    project_id?: number;
    item_type_id?: number;
    limit?: number;
  }): Promise<{ success: boolean; movements: StockMovement[] }> => {
    const query = new URLSearchParams();
    if (params?.project_id) query.append('project_id', String(params.project_id));
    if (params?.item_type_id) query.append('item_type_id', String(params.item_type_id));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE_URL}/stock-movements?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Vendor API Client
export const vendorApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    name?: string;
    contact_person?: string;
    phone?: string;
    email?: string;
  }): Promise<{ success: boolean; vendors: Vendor[]; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.name) query.append('name', params.name);
    if (params?.contact_person) query.append('contact_person', params.contact_person);
    if (params?.phone) query.append('phone', params.phone);
    if (params?.email) query.append('email', params.email);

    const res = await fetch(`${API_BASE_URL}/vendors?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },


  create: async (data: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
    tax_id?: string;
  }): Promise<{ success: boolean; vendor: Vendor }> => {
    const res = await fetch(`${API_BASE_URL}/vendors`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: {
      name?: string;
      contact_person?: string;
      phone?: string;
      email?: string;
      address?: string;
      tax_id?: string;
    }
  ): Promise<{ success: boolean; vendor: Vendor }> => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Purchase Order API Client
export const poApi = {
  getAll: async (params?: {
    project_id?: number;
    vendor_id?: number;
    search?: string;
    status?: string;
  }): Promise<{ success: boolean; purchaseOrders: PurchaseOrder[] }> => {
    const query = new URLSearchParams();
    if (params?.project_id) query.append('project_id', String(params.project_id));
    if (params?.vendor_id) query.append('vendor_id', String(params.vendor_id));
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);

    const res = await fetch(`${API_BASE_URL}/purchase-orders?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id: number): Promise<{ success: boolean; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    po_number?: string;
    vendor_id: number;
    project_id?: number;
    terms_and_conditions_id?: number;
    notes?: string;
    expected_date?: string;
    items: Array<{
      item_type_id: number;
      ordered_qty: number;
      unit_price: number;
      discount_percent?: number;
      gst_percent?: number;
      cat_no?: string;
      make?: string;
      rating?: string;
    }>;
  }): Promise<{ success: boolean; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: {
      po_number?: string;
      vendor_id?: number;
      project_id?: number;
      terms_and_conditions_id?: number;
      notes?: string;
      expected_date?: string;
      items?: Array<{
        item_type_id: number;
        ordered_qty: number;
        unit_price: number;
        discount_percent?: number;
        gst_percent?: number;
        cat_no?: string;
        make?: string;
        rating?: string;
      }>;
    }
  ): Promise<{ success: boolean; message: string; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  approve: async (id: number): Promise<{ success: boolean; message: string; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  reject: async (id: number): Promise<{ success: boolean; message: string; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  receiveStock: async (id: number): Promise<{ success: boolean; message: string; purchaseOrder: PurchaseOrder }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}/receive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// PO Approver API Client
export const poApproverApi = {
  getAll: async (): Promise<{ success: boolean; approvers: POApprover[] }> => {
    const res = await fetch(`${API_BASE_URL}/po-approvers`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    user_id: number;
    min_amount?: number;
    max_amount?: number;
  }): Promise<{ success: boolean; approver: POApprover }> => {
    const res = await fetch(`${API_BASE_URL}/po-approvers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: {
      min_amount?: number;
      max_amount?: number | null;
      is_active?: boolean;
    }
  ): Promise<{ success: boolean; approver: POApprover }> => {
    const res = await fetch(`${API_BASE_URL}/po-approvers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/po-approvers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Material Issue Voucher API Client
export const materialIssueApi = {
  getAll: async (params?: {
    project_id?: number;
  }): Promise<{ success: boolean; issues: MaterialIssue[] }> => {
    const query = new URLSearchParams();
    if (params?.project_id) query.append('project_id', String(params.project_id));

    const res = await fetch(`${API_BASE_URL}/material-issues?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    project_id: number;
    issued_to: string;
    notes?: string;
    items: Array<{
      item_type_id: number;
      quantity: number;
    }>;
  }): Promise<{ success: boolean; issue: MaterialIssue }> => {
    const res = await fetch(`${API_BASE_URL}/material-issues`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};

// Unit API Client
export const unitApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    name?: string;
    code?: string;
  }): Promise<{ success: boolean; units: Unit[]; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.name) query.append('name', params.name);
    if (params?.code) query.append('code', params.code);

    const res = await fetch(`${API_BASE_URL}/units?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },


  getById: async (id: number): Promise<{ success: boolean; unit: Unit }> => {
    const res = await fetch(`${API_BASE_URL}/units/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    name: string;
    code: string;
    description?: string;
  }): Promise<{ success: boolean; message: string; unit: Unit }> => {
    const res = await fetch(`${API_BASE_URL}/units`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: { name?: string; code?: string; description?: string }
  ): Promise<{ success: boolean; message: string; unit: Unit }> => {
    const res = await fetch(`${API_BASE_URL}/units/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/units/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Reports API Client
export const reportApi = {
  getStockSummary: async (params?: any): Promise<{ success: boolean; reports: any[] }> => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE_URL}/reports/stock-summary?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getPurchaseOrders: async (params?: any): Promise<{ success: boolean; reports: any[] }> => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE_URL}/reports/purchase-orders?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getMaterialIssues: async (params?: any): Promise<{ success: boolean; reports: any[] }> => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE_URL}/reports/material-issues?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getStockTransfers: async (params?: any): Promise<{ success: boolean; reports: any[] }> => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE_URL}/reports/stock-transfers?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getAuditLedger: async (params?: any): Promise<{ success: boolean; reports: any[] }> => {
    const query = new URLSearchParams(params || {}).toString();
    const res = await fetch(`${API_BASE_URL}/reports/audit-ledger?${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Terms & Conditions API Client
export const termsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ success: boolean; templates: TermsAndConditions[]; total?: number; page?: number; limit?: number; totalPages?: number }> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE_URL}/terms-and-conditions?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getDefault: async (): Promise<{ success: boolean; template: TermsAndConditions }> => {
    const res = await fetch(`${API_BASE_URL}/terms-and-conditions/default`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    title: string;
    payment_terms?: string;
    inco_terms?: string;
    content: string;
    is_default?: boolean;
  }): Promise<{ success: boolean; message: string; template: TermsAndConditions }> => {
    const res = await fetch(`${API_BASE_URL}/terms-and-conditions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (
    id: number,
    data: {
      title?: string;
      payment_terms?: string;
      inco_terms?: string;
      content?: string;
      is_default?: boolean;
    }
  ): Promise<{ success: boolean; message: string; template: TermsAndConditions }> => {
    const res = await fetch(`${API_BASE_URL}/terms-and-conditions/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  setDefault: async (id: number): Promise<{ success: boolean; message: string; template: TermsAndConditions }> => {
    const res = await fetch(`${API_BASE_URL}/terms-and-conditions/${id}/set-default`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/terms-and-conditions/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// Storage Locations API Client
export const storageApi = {
  getAllShelves: async (): Promise<{ success: boolean; shelves: StorageShelf[] }> => {
    const res = await fetch(`${API_BASE_URL}/storage-shelves`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createShelf: async (data: {
    code: string;
    name: string;
    zone?: string;
    description?: string;
  }): Promise<{ success: boolean; shelf: StorageShelf }> => {
    const res = await fetch(`${API_BASE_URL}/storage-shelves`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateShelf: async (
    id: number,
    data: {
      code?: string;
      name?: string;
      zone?: string;
      description?: string;
    }
  ): Promise<{ success: boolean; shelf: StorageShelf }> => {
    const res = await fetch(`${API_BASE_URL}/storage-shelves/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteShelf: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/storage-shelves/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createRack: async (data: {
    shelf_id: number;
    rack_code: string;
    name: string;
    capacity_notes?: string;
  }): Promise<{ success: boolean; rack: StorageRack }> => {
    const res = await fetch(`${API_BASE_URL}/storage-racks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  updateRack: async (
    id: number,
    data: {
      rack_code?: string;
      name?: string;
      capacity_notes?: string;
    }
  ): Promise<{ success: boolean; rack: StorageRack }> => {
    const res = await fetch(`${API_BASE_URL}/storage-racks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  deleteRack: async (id: number): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/storage-racks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};

// GRN API Client
export const grnApi = {
  getGRNs: async (params?: {
    vendor_id?: number;
    project_id?: number;
    po_id?: number;
    from_date?: string;
    to_date?: string;
    search?: string;
  }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.vendor_id) query.append('vendor_id', String(params.vendor_id));
    if (params?.project_id) query.append('project_id', String(params.project_id));
    if (params?.po_id) query.append('po_id', String(params.po_id));
    if (params?.from_date) query.append('from_date', params.from_date);
    if (params?.to_date) query.append('to_date', params.to_date);
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/grn${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getGRNById: async (id: number): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/grn/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createGRN: async (payload: any): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/grn`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },
};

// Project Material Assignment API Client
export const projectAssignmentApi = {
  getAll: async (params?: { to_project_id?: number }): Promise<{ success: boolean; assignments: ProjectAssignment[] }> => {
    const query = new URLSearchParams();
    if (params?.to_project_id) query.append('to_project_id', String(params.to_project_id));

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/project-assignments${queryString}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getById: async (id: number): Promise<{ success: boolean; assignment: ProjectAssignment }> => {
    const res = await fetch(`${API_BASE_URL}/project-assignments/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    from_project_id?: number | null;
    to_project_id: number;
    assigned_to_person: string;
    notes?: string;
    items: Array<{
      item_type_id: number;
      quantity: number;
    }>;
  }): Promise<{ success: boolean; message: string; assignment: ProjectAssignment }> => {
    const res = await fetch(`${API_BASE_URL}/project-assignments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
      });
    return handleResponse(res);
  },
};

