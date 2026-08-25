import { API_BASE_URL, AUTH_ENDPOINTS, USER_ENDPOINTS } from '../constants/api.constants';
import type { User, Role, AuthResponse, LoginCredentials, SignupCredentials } from '../types/auth';
import type { ItemType, Project, ProjectInventory } from '../types/inventory';

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
  getUsers: async (): Promise<{ success: boolean; users: User[] }> => {
    const res = await fetch(`${API_BASE_URL}${USER_ENDPOINTS.USERS}`, {
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
};

// Item Type API Client
export const itemTypeApi = {
  getAll: async (): Promise<{ success: boolean; items: ItemType[] }> => {
    const res = await fetch(`${API_BASE_URL}/item-types`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  create: async (data: {
    name: string;
    code: string;
    unit?: string;
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
    data: { name?: string; code?: string; unit?: string; description?: string }
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
    data: { name?: string; code?: string; location?: string; description?: string }
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
    adjustment_type: 'ADD' | 'REMOVE' | 'SET';
    amount: number;
    min_quantity?: number;
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
      quantity: number;
      min_quantity?: number;
    }>;
  }): Promise<{ success: boolean; inventoryItems: ProjectInventory[] }> => {
    const res = await fetch(`${API_BASE_URL}/inventory/batch-adjust`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
