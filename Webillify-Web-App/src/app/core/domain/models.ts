export interface Product {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly category: string;
  readonly price: number;
  readonly stock: number;
  readonly unit: string;
  readonly color: string;
  readonly initials: string;
}

export interface RecentSale {
  readonly invoice: string;
  readonly customer: string;
  readonly time: string;
  readonly amount: number;
  readonly status: 'Paid' | 'Credit';
}

export interface DashboardSnapshot {
  readonly recentSales: readonly RecentSale[];
  readonly salesBars: readonly number[];
}

export interface CartItem {
  readonly product: Product;
  readonly quantity: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Credit';

export interface CompleteSaleRequest {
  readonly items: readonly CartItem[];
  readonly paymentMethod: PaymentMethod;
  readonly total: number;
}

export interface CompleteSaleResult {
  readonly invoiceNumber: string;
  readonly paymentMethod: PaymentMethod;
}

export interface OrganizationContext {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly branchId: string;
  readonly branchName: string;
}
