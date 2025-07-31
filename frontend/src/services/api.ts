import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Order, 
  AuthResponse, 
  LoginData, 
  RegisterData, 
  CreateOrderData,
  PaginationResponse,
  CourierStats,
  DashboardStats
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/register', data);
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ message: string; user: User }> => {
    const response: AxiosResponse<{ message: string; user: User }> = await api.put('/auth/profile', data);
    return response.data;
  },

  updateAvailability: async (isAvailable: boolean): Promise<{ message: string; isAvailable: boolean }> => {
    const response: AxiosResponse<{ message: string; isAvailable: boolean }> = await api.patch('/auth/courier/availability', { isAvailable });
    return response.data;
  },

  updateLocation: async (lat: number, lng: number): Promise<{ message: string; location: any }> => {
    const response: AxiosResponse<{ message: string; location: any }> = await api.patch('/auth/courier/location', { lat, lng });
    return response.data;
  },

  verifyToken: async (): Promise<{ valid: boolean; user: User }> => {
    const response: AxiosResponse<{ valid: boolean; user: User }> = await api.get('/auth/verify');
    return response.data;
  },
};

// Orders API
export const ordersAPI = {
  createOrder: async (data: CreateOrderData): Promise<{ message: string; order: Order }> => {
    const response: AxiosResponse<{ message: string; order: Order }> = await api.post('/orders', data);
    return response.data;
  },

  getOrders: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginationResponse<Order>> => {
    const response: AxiosResponse<PaginationResponse<Order>> = await api.get('/orders', { params });
    return response.data;
  },

  getAvailableOrders: async (): Promise<{ orders: Order[] }> => {
    const response: AxiosResponse<{ orders: Order[] }> = await api.get('/orders/available');
    return response.data;
  },

  getOrder: async (id: string): Promise<{ order: Order }> => {
    const response: AxiosResponse<{ order: Order }> = await api.get(`/orders/${id}`);
    return response.data;
  },

  assignOrder: async (id: string): Promise<{ message: string; order: Order }> => {
    const response: AxiosResponse<{ message: string; order: Order }> = await api.patch(`/orders/${id}/assign`);
    return response.data;
  },

  updateOrderStatus: async (
    id: string, 
    status: string, 
    notes?: string, 
    location?: { lat: number; lng: number }
  ): Promise<{ message: string; order: Order }> => {
    const response: AxiosResponse<{ message: string; order: Order }> = await api.patch(`/orders/${id}/status`, {
      status,
      notes,
      location,
    });
    return response.data;
  },

  rateOrder: async (
    id: string, 
    rating: number, 
    feedback?: string
  ): Promise<{ message: string; rating: any }> => {
    const response: AxiosResponse<{ message: string; rating: any }> = await api.patch(`/orders/${id}/rate`, {
      rating,
      feedback,
    });
    return response.data;
  },

  cancelOrder: async (id: string, reason?: string): Promise<{ message: string; order: Order }> => {
    const response: AxiosResponse<{ message: string; order: Order }> = await api.patch(`/orders/${id}/cancel`, {
      reason,
    });
    return response.data;
  },
};

// Couriers API
export const couriersAPI = {
  getCouriers: async (params?: {
    page?: number;
    limit?: number;
    available?: boolean;
    active?: boolean;
  }): Promise<PaginationResponse<User>> => {
    const response: AxiosResponse<PaginationResponse<User>> = await api.get('/couriers', { params });
    return response.data;
  },

  getNearbyCouriers: async (
    lat: number, 
    lng: number, 
    radius?: number
  ): Promise<{ couriers: User[]; count: number }> => {
    const response: AxiosResponse<{ couriers: User[]; count: number }> = await api.get('/couriers/nearby', {
      params: { lat, lng, radius },
    });
    return response.data;
  },

  getCourier: async (id: string): Promise<{ courier: User; stats: CourierStats }> => {
    const response: AxiosResponse<{ courier: User; stats: CourierStats }> = await api.get(`/couriers/${id}`);
    return response.data;
  },

  getCourierOrders: async (
    id: string, 
    params?: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginationResponse<Order>> => {
    const response: AxiosResponse<PaginationResponse<Order>> = await api.get(`/couriers/${id}/orders`, { params });
    return response.data;
  },

  getDashboard: async (id: string): Promise<DashboardStats> => {
    const response: AxiosResponse<DashboardStats> = await api.get(`/couriers/${id}/dashboard`);
    return response.data;
  },

  updateVehicle: async (
    id: string, 
    vehicle: string, 
    licenseNumber?: string
  ): Promise<{ message: string; courier: User }> => {
    const response: AxiosResponse<{ message: string; courier: User }> = await api.patch(`/couriers/${id}/vehicle`, {
      vehicle,
      licenseNumber,
    });
    return response.data;
  },

  updateStatus: async (id: string, isActive: boolean): Promise<{ message: string; courier: User }> => {
    const response: AxiosResponse<{ message: string; courier: User }> = await api.patch(`/couriers/${id}/status`, {
      isActive,
    });
    return response.data;
  },
};

// Tracking API
export const trackingAPI = {
  getTracking: async (orderNumber: string): Promise<{ tracking: any }> => {
    const response: AxiosResponse<{ tracking: any }> = await api.get(`/tracking/${orderNumber}`);
    return response.data;
  },

  updateLocation: async (
    orderNumber: string, 
    lat: number, 
    lng: number
  ): Promise<{ message: string; location: any; timestamp: string }> => {
    const response: AxiosResponse<{ message: string; location: any; timestamp: string }> = await api.patch(`/tracking/${orderNumber}/location`, {
      lat,
      lng,
    });
    return response.data;
  },

  addTrackingUpdate: async (
    orderNumber: string, 
    notes: string, 
    location?: { lat: number; lng: number }
  ): Promise<{ message: string; update: any }> => {
    const response: AxiosResponse<{ message: string; update: any }> = await api.post(`/tracking/${orderNumber}/update`, {
      notes,
      location,
    });
    return response.data;
  },

  getDeliveryProof: async (orderNumber: string): Promise<{ orderNumber: string; images: any[]; status: string }> => {
    const response: AxiosResponse<{ orderNumber: string; images: any[]; status: string }> = await api.get(`/tracking/${orderNumber}/proof`);
    return response.data;
  },

  uploadDeliveryProof: async (
    orderNumber: string, 
    imageUrl: string, 
    description?: string
  ): Promise<{ message: string; image: any }> => {
    const response: AxiosResponse<{ message: string; image: any }> = await api.post(`/tracking/${orderNumber}/proof`, {
      imageUrl,
      description,
    });
    return response.data;
  },

  getETA: async (orderNumber: string): Promise<{
    orderNumber: string;
    eta: string;
    estimatedMinutes: number;
    distance: number;
    status: string;
    courierLocation?: any;
  }> => {
    const response: AxiosResponse<{
      orderNumber: string;
      eta: string;
      estimatedMinutes: number;
      distance: number;
      status: string;
      courierLocation?: any;
    }> = await api.get(`/tracking/${orderNumber}/eta`);
    return response.data;
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string; message: string }> => {
    const response: AxiosResponse<{ status: string; message: string }> = await api.get('/health');
    return response.data;
  },
};

export default api;