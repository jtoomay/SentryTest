export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface OrderItem {
  productId: number;
  quantity: number;
}

export interface Order {
  id: number;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped';
  createdAt: string;
}

export const products: Product[] = [
  { id: 1, name: 'Mechanical Keyboard', price: 129.99, stock: 42, category: 'peripherals' },
  { id: 2, name: '4K Monitor', price: 399.0, stock: 7, category: 'displays' },
  { id: 3, name: 'Noise-Cancelling Headphones', price: 249.5, stock: 0, category: 'audio' },
  { id: 4, name: 'USB-C Dock', price: 89.99, stock: 120, category: 'peripherals' },
  { id: 5, name: 'Ergonomic Chair', price: 549.0, stock: 3, category: 'furniture' },
  { id: 6, name: 'Webcam 1080p', price: 69.99, stock: 58, category: 'video' },
];

export const users: User[] = [
  { id: 'u_1001', name: 'Ada Lovelace', email: 'ada@example.com', plan: 'enterprise' },
  { id: 'u_1002', name: 'Grace Hopper', email: 'grace@example.com', plan: 'pro' },
  { id: 'u_1003', name: 'Alan Turing', email: 'alan@example.com', plan: 'free' },
];

export const orders: Order[] = [
  {
    id: 5001,
    userId: 'u_1001',
    items: [
      { productId: 1, quantity: 1 },
      { productId: 4, quantity: 2 },
    ],
    total: 309.97,
    status: 'shipped',
    createdAt: '2026-10-28T14:12:00Z',
  },
  {
    id: 5002,
    userId: 'u_1002',
    items: [{ productId: 2, quantity: 1 }],
    total: 399.0,
    status: 'paid',
    createdAt: '2026-11-02T09:40:00Z',
  },
  {
    id: 5003,
    userId: 'u_1003',
    items: [
      { productId: 6, quantity: 1 },
      { productId: 3, quantity: 1 },
      { productId: 5, quantity: 1 },
    ],
    total: 868.49,
    status: 'pending',
    createdAt: '2026-11-08T18:05:00Z',
  },
];

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const jitter = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
