import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginCredentials, SignupCredentials } from '../types/auth';
import type { Plant } from '../types/plant';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  signup: (credentials: SignupCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  activePlant: Plant | null;
  setActivePlant: (plant: Plant) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('inventory_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [activePlant, setActivePlantState] = useState<Plant | null>(null);

  const setActivePlant = (plant: Plant) => {
    const oldPlantId = localStorage.getItem('inventory_active_plant_id');
    setActivePlantState(plant);
    localStorage.setItem('inventory_active_plant_id', String(plant.id));
    if (oldPlantId && oldPlantId !== String(plant.id)) {
      window.location.reload();
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            
            // Set active plant
            const savedPlantId = localStorage.getItem('inventory_active_plant_id');
            if (res.user.plants && res.user.plants.length > 0) {
              if (savedPlantId) {
                const found = res.user.plants.find(p => p.id === Number(savedPlantId));
                if (found) {
                  setActivePlantState(found);
                } else {
                  setActivePlantState(res.user.plants[0]);
                }
              } else {
                setActivePlantState(res.user.plants[0]);
              }
            }
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to verify token', error);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const res = await authApi.login(credentials);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('inventory_token', res.token);

        if (res.user.plants && res.user.plants.length > 0) {
          setActivePlantState(res.user.plants[0]);
          localStorage.setItem('inventory_active_plant_id', String(res.user.plants[0].id));
        }

        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    try {
      const res = await authApi.signup(credentials);
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('inventory_token', res.token);
        return { success: true };
      }
      return { success: false, message: res.message || 'Signup failed' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Network error' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActivePlantState(null);
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_active_plant_id');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, activePlant, setActivePlant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
