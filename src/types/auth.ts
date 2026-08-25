export interface Role {
  id: number;
  name: string;
  description?: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  role_id: number;
  role?: Role | string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface SignupCredentials {
  username: string;
  email?: string;
  password?: string;
}

export interface CreateUserData {
  username: string;
  email?: string;
  password: string;
  role_id: number;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  password?: string;
  role_id?: number;
}
