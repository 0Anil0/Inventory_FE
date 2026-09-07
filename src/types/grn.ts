import type { ItemType, Project, PurchaseOrder, PurchaseOrderItem } from './inventory';
import type { StorageShelf, StorageRack } from './storage';

export interface GoodsReceiptNoteItem {
  id: number;
  grn_id: number;
  po_item_id: number;
  item_type_id: number;
  received_qty: number;
  shelf_id?: number | null;
  rack_id?: number | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  item_type?: ItemType;
  po_item?: PurchaseOrderItem;
  shelf?: StorageShelf;
  rack?: StorageRack;
}

export interface GoodsReceiptNote {
  id: number;
  grn_number: string;
  po_id: number;
  project_id: number;
  received_date: string;
  challan_no?: string | null;
  vehicle_no?: string | null;
  received_by_id?: number | null;
  remarks?: string | null;
  status: 'RECEIVED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
  purchase_order?: PurchaseOrder;
  project?: Project;
  received_by_user?: {
    id: number;
    username: string;
    name?: string;
  };
  items?: GoodsReceiptNoteItem[];
}

export interface CreateGRNPayload {
  po_id: number;
  received_date: string;
  challan_no?: string;
  vehicle_no?: string;
  remarks?: string;
  items: {
    po_item_id: number;
    item_type_id: number;
    received_qty: number;
    shelf_id?: number | null;
    rack_id?: number | null;
    notes?: string;
  }[];
}
