export interface StorageRack {
  id: number;
  shelf_id: number;
  rack_code: string;
  name: string;
  capacity_notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StorageShelf {
  id: number;
  code: string;
  name: string;
  zone?: string | null;
  description?: string | null;
  racks?: StorageRack[];
  createdAt?: string;
  updatedAt?: string;
}
