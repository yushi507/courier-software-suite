export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'courier' | 'admin';
  address?: Address;
  isActive: boolean;
  profileImage?: string;
  vehicle?: 'bike' | 'motorcycle' | 'car' | 'van';
  licenseNumber?: string;
  isAvailable?: boolean;
  currentLocation?: Location;
  rating: Rating;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: Coordinates;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location extends Coordinates {
  lastUpdated?: string;
}

export interface Rating {
  average: number;
  count: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: User;
  courier?: User;
  pickupLocation: LocationDetails;
  deliveryLocation: LocationDetails;
  packageDetails: PackageDetails;
  status: OrderStatus;
  priority: 'standard' | 'express' | 'urgent';
  pricing: Pricing;
  estimatedTime: {
    pickup?: string;
    delivery?: string;
  };
  actualTime: {
    pickup?: string;
    delivery?: string;
  };
  tracking: TrackingUpdate[];
  rating: OrderRating;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'cash' | 'card' | 'digital_wallet';
  images: OrderImage[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationDetails {
  address: Address;
  coordinates: Coordinates;
  contactName: string;
  contactPhone: string;
  instructions?: string;
}

export interface PackageDetails {
  description: string;
  weight: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  value?: number;
  fragile: boolean;
  category: 'documents' | 'electronics' | 'food' | 'clothing' | 'medical' | 'other';
}

export type OrderStatus = 
  | 'pending' 
  | 'assigned' 
  | 'picked_up' 
  | 'in_transit' 
  | 'delivered' 
  | 'cancelled' 
  | 'failed';

export interface Pricing {
  baseFare: number;
  distanceFare: number;
  priorityFare: number;
  totalAmount: number;
}

export interface TrackingUpdate {
  status: string;
  timestamp: string;
  location?: Coordinates;
  notes?: string;
}

export interface OrderRating {
  customerRating?: number;
  courierRating?: number;
  customerFeedback?: string;
  courierFeedback?: string;
}

export interface OrderImage {
  type: string;
  timestamp: string;
  description?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  errors?: any[];
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CourierStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: string;
}

export interface DashboardStats {
  today: {
    orders: number;
    completed: number;
  };
  week: {
    orders: number;
    completed: number;
  };
  month: {
    orders: number;
    completed: number;
    earnings: number;
  };
  activeOrders: Order[];
  recentOrders: Order[];
  rating: Rating;
}

export interface CreateOrderData {
  pickupLocation: LocationDetails;
  deliveryLocation: LocationDetails;
  packageDetails: PackageDetails;
  priority?: 'standard' | 'express' | 'urgent';
  notes?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'customer' | 'courier';
  address?: Address;
  vehicle?: 'bike' | 'motorcycle' | 'car' | 'van';
  licenseNumber?: string;
}

export interface SocketEvents {
  'location-updated': {
    orderNumber: string;
    location: Coordinates;
    timestamp: string;
    courier: {
      name: string;
      vehicle: string;
    };
  };
  'tracking-updated': {
    orderNumber: string;
    update: TrackingUpdate;
    courier: {
      name: string;
      vehicle: string;
    };
  };
  'proof-uploaded': {
    orderNumber: string;
    image: OrderImage;
    courier: {
      name: string;
      vehicle: string;
    };
  };
}