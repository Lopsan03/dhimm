
export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  addresses: string[];
}

export interface Product {
  id: string;
  name: string;
  category: 'Cremallera Hidráulica' | 'Cremallera Electrónica' | 'Bomba Hidráulica' | 'Transmisión' | 'Motor' | 'Diferencial' | 'Marcha' | 'Alternador';
  brand: string;
  compatibleModels: string[];
  price: number;
  stock: number;
  image: string;
  description: string;
  compatibleModels?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Pendiente' | 'Pagado' | 'Enviado' | 'Completado' | 'Refunded' | 'ChargedBack' | 'InDispute' | 'rejected';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  date: string;
  shippingAddress: string;
  // Payment tracking fields (production)
  payment_id?: string;
  merchant_order_id?: string;
  currency?: string;
  transaction_amount?: number;
  payment_status?: string;
  paid_at?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
