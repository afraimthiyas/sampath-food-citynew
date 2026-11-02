export type Role = 'ADMIN' | 'MANAGER' | 'CUSTOMER';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PACKED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD';
export type StockReason = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'DAMAGE' | 'CANCELLATION';

export interface User { id: string; email: string; fullName: string; phone: string | null; role: Role }

export interface Category { id: string; name: string; slug: string; description: string | null; productCount: number }

export interface Product {
  id: string; sku: string; name: string; description: string | null; price: number; unit: string;
  imageUrl: string | null; stock: number; reorderLevel: number; isActive: boolean;
  category: { id: string; name: string; slug: string };
}

export interface Paginated<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }

export interface OrderItem {
  id: string; productId: string; productName: string; imageUrl: string | null;
  unitPrice: number; quantity: number; lineTotal: number;
}

export interface Order {
  id: string; orderNumber: string; status: OrderStatus; paymentMethod: PaymentMethod;
  deliveryAddress: string; deliveryCity: string; phone: string; note: string | null;
  subtotal: number; deliveryFee: number; total: number; createdAt: string; updatedAt: string;
  customer?: { id: string; fullName: string; email: string; phone: string | null };
  items: OrderItem[];
}

export interface Customer {
  id: string; fullName: string; email: string; phone: string | null; isActive: boolean; createdAt: string;
  orderCount: number; totalSpent: number; lastOrderAt: string | null;
}

export interface StockMovement {
  id: string; delta: number; balanceAfter: number; reason: StockReason; note: string | null; createdAt: string;
  product: { id: string; name: string; imageUrl: string | null };
  createdBy: { id: string; fullName: string } | null;
}

export interface DashboardSummary {
  totals: {
    revenue: number; totalOrders: number; pendingOrders: number; averageOrderValue: number;
    customers: number; products: number; lowStock: number;
  };
  revenueByDay: { day: string; revenue: number; orders: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: { id: string; name: string; imageUrl: string | null; quantity: number; revenue: number }[];
  salesByCategory: { name: string; revenue: number }[];
  recentOrders: { id: string; orderNumber: string; status: OrderStatus; total: number; createdAt: string; customer: string }[];
  lowStock: { id: string; name: string; imageUrl: string | null; stock: number; reorderLevel: number }[];
}
