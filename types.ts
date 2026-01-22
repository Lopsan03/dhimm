
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
  category: 'Cremallera Hidráulica' | 'Cremallera Electrónica' | 'Bomba Hidráulica';
  brand: string;
  compatibleModels: string[];
  price: number;
  stock: number;
  image: string;
  description: string;
  estado?: string;
  compatibleModels?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export type OrderStatus = 'Pagado' | 'Enviado' | 'Completado';

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
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
