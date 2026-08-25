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
