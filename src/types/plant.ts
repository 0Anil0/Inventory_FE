export interface Plant {
  id: number;
  name: string;
  code: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}
