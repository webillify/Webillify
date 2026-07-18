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
  readonly taxRate?: number;
  readonly priceTaxMode?: 'INCLUSIVE' | 'EXCLUSIVE';
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
  readonly metrics?: {
    readonly productCount: number;
    readonly stockUnits: number;
    readonly purchaseBillCount: number;
    readonly outstandingPayables: number;
    readonly purchaseTotal: number;
    readonly salesInvoiceCount?: number;
    readonly salesTotal?: number;
    readonly outstandingReceivables?: number;
  };
  readonly stockAlerts?: ReadonlyArray<{ readonly name: string; readonly stock: number }>;
}

export interface CartItem {
  readonly product: Product;
  readonly quantity: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Credit';

export interface PosSession {
  readonly id: string;
  readonly registerCode: string;
  readonly status: 'OPEN' | 'CLOSED';
  readonly openingCash: number;
  readonly cashSalesAmount: number;
  readonly openedAt: string;
}

export interface PosWorkspace {
  readonly session: PosSession | null;
  readonly warehouse: { readonly id: string; readonly name: string } | null;
}

export interface OpenPosSessionRequest {
  readonly warehouseId: string;
  readonly openingCash: number;
}

export interface CompleteSaleRequest {
  readonly posSessionId: string;
  readonly idempotencyKey: string;
  readonly taxTreatment: 'INTRASTATE' | 'INTERSTATE';
  readonly placeOfSupplyStateCode: string;
  readonly items: readonly CartItem[];
  readonly paymentMethod: PaymentMethod;
  readonly total: number;
}

export interface CompleteSaleResult {
  readonly invoiceNumber: string;
  readonly paymentMethod: PaymentMethod;
  readonly totalAmount: number;
  readonly idempotent: boolean;
}

export interface OrganizationContext {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly branchId: string;
  readonly branchName: string;
}

export interface Supplier {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly gstin: string | null;
  readonly creditDays: number;
}

export interface PurchaseBill {
  readonly id: string;
  readonly supplierId: string;
  readonly supplierName: string;
  readonly reference: string;
  readonly invoiceDate: string;
  readonly status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly returnedAmount: number;
  readonly outstandingAmount: number;
}

export interface PurchaseOption {
  readonly id: string;
  readonly label: string;
  readonly sku: string;
}

export interface PurchaseWorkspace {
  readonly suppliers: readonly Supplier[];
  readonly bills: readonly PurchaseBill[];
  readonly variants: readonly PurchaseOption[];
  readonly warehouse: { readonly id: string; readonly name: string } | null;
}

export interface CreatePurchaseDraftRequest {
  readonly supplierId: string;
  readonly warehouseId: string;
  readonly variantId: string;
  readonly reference: string;
  readonly invoiceDate: string;
  readonly quantity: number;
  readonly unitCost: number;
  readonly taxRate: number;
}

export interface PurchaseCompensationRequest {
  readonly bill: PurchaseBill;
  readonly reason: string;
}

export interface SubscriptionOverview {
  readonly core: {
    readonly planName: string;
    readonly planCode: string;
    readonly status: string;
    readonly billingInterval: string;
    readonly periodEnd: string;
    readonly mutationAllowed: boolean;
    readonly branchesUsed: number;
    readonly branchLimit: number | null;
    readonly usersUsed: number;
    readonly userLimit: number | null;
  };
  readonly ai: {
    readonly planName: string;
    readonly status: string;
    readonly usable: boolean;
    readonly monthlyPrice: number;
    readonly availableCredits: number;
    readonly monthlyCredits: number;
    readonly separateFromCore: boolean;
  };
}
