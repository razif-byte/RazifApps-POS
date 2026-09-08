export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  created_at?: string;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  total_purchases?: number;
  total_spent?: number;
  created_at?: string;
}

export interface Product {
  id: number;
  barcode: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  product_id: number;
  name?: string;
  quantity: number;
  price_at_sale: number;
}

export interface Sale {
  id: number;
  total_amount: number;
  discount: number;
  payment_method: string;
  customer_id?: number | null;
  customer_name?: string | null;
  cashier_username?: string | null;
  points_earned?: number;
  points_redeemed?: number;
  timestamp: string;
  items?: SaleItem[];
  item_count?: number;
}

export interface SaleReport {
  date: string;
  revenue: number;
  total_discount?: number;
  transactions: number;
}

export interface TopProduct {
  name: string;
  total_sold: number;
}

export type PrinterConnectionType = 'usb' | 'network' | 'bluetooth' | 'system';
export type PaperWidth = '58mm' | '80mm';

export interface ConnectedPrinter {
  id: string;
  name: string;
  type: PrinterConnectionType;
  address?: string;
  paperWidth: PaperWidth;
  isDefault: boolean;
  status: 'connected' | 'offline' | 'ready';
  autoCut?: boolean;
  openDrawer?: boolean;
  model?: string;
  addedAt?: string;
}
