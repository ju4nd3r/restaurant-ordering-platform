// ==============================================================================
// CORE DOMAIN TYPES & ENUMS
// ==============================================================================

export type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'WAITER';

export type OrderStatus =
  'PENDING_PAYMENT' | 'RECEIVED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';

export type PaymentMethod = 'CARD' | 'PSE' | 'NEQUI' | 'BANCOLOMBIA' | 'CASH';

export type PaymentProviderType = 'WOMPI' | 'CASH';

export type SplitMode = 'BY_ITEMS' | 'EQUAL_PARTS' | 'CUSTOM_AMOUNT';

export type InvoiceStatus = 'PENDING' | 'ISSUED' | 'REJECTED' | 'ERROR';

export type TaxType = 'INC_8' | 'IVA_19' | 'EXEMPT';

export type TipDistributionRuleType = 'ASSIGNED_WAITER' | 'POOL_SHIFT' | 'CUSTOM_PERCENTAGE';

export type TableSessionStatus = 'ACTIVE' | 'CLOSED';

export type ShiftStatus = 'OPEN' | 'CLOSED';

export type CustomerDocType = 'CC' | 'NIT' | 'CE' | 'PASSPORT' | 'FINAL_CONSUMER';

export type Allergen =
  'GLUTEN' | 'DAIRY' | 'EGGS' | 'PEANUTS' | 'TREE_NUTS' | 'FISH' | 'SHELLFISH' | 'SOY' | 'SESAME';

export type DietaryFlag = 'VEGETARIAN' | 'VEGAN' | 'GLUTEN_FREE' | 'KETO' | 'HALAL';

// ==============================================================================
// DOMAIN ENTITIES & DTOS
// ==============================================================================

export interface RestaurantSettingsDTO {
  taxType: TaxType;
  taxPercentage: number; // e.g. 8 for INC 8%
  defaultTipPercentage: number; // e.g. 10 for 10%
  tipDistributionRule: TipDistributionRuleType;
  currency: 'COP';
  dianResolutionNumber?: string;
  dianPrefix?: string;
}

export interface MenuItemOptionDTO {
  id: string;
  name: string;
  additionalPriceCop: number; // Integer COP
  isDefault?: boolean;
}

export interface MenuItemOptionGroupDTO {
  id: string;
  name: string;
  minSelectable: number;
  maxSelectable: number;
  options: MenuItemOptionDTO[];
}

export interface MenuItemModifierDTO {
  id: string;
  name: string;
  priceCop: number; // Integer COP
  isAvailable: boolean;
}

export interface MenuItemImageDTO {
  id: string;
  url: string;
  thumbnailUrl: string;
  blurPlaceholder?: string;
  sortOrder: number;
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceCop: number; // Integer COP
  prepTimeMinutes: number;
  isAvailable: boolean;
  ingredients: string[];
  allergens: Allergen[];
  dietaryFlags: DietaryFlag[];
  images: MenuItemImageDTO[];
  optionGroups: MenuItemOptionGroupDTO[];
  modifiers: MenuItemModifierDTO[];
}

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  items?: MenuItemDTO[];
}

export interface RestaurantTableDTO {
  id: string;
  number: number;
  label: string;
  zone?: string;
  qrToken: string;
  isActive: boolean;
  assignedWaiter?: {
    id: string;
    fullName: string;
  };
}

export interface OrderItemModifierSelectionDTO {
  modifierId: string;
  name: string;
  priceCop: number;
}

export interface OrderItemOptionSelectionDTO {
  optionGroupId: string;
  optionGroupName: string;
  optionId: string;
  optionName: string;
  additionalPriceCop: number;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  comment?: string;
  selectedOptions: OrderItemOptionSelectionDTO[];
  selectedModifiers: OrderItemModifierSelectionDTO[];
  isPaid: boolean;
}

export interface OrderDTO {
  id: string;
  orderNumber: number;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  tableSessionId: string;
  status: OrderStatus;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  waiterId?: string;
  waiterName?: string;
  customerNotes?: string;
  subtotalCop: number;
  taxCop: number;
  tipCop: number;
  totalCop: number;
  items: OrderItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBillingDataDTO {
  isFinalConsumer: boolean;
  docType: CustomerDocType;
  docNumber: string;
  fullNameOrLegalName: string;
  email: string;
  phone?: string;
  address?: string;
  habeasDataAccepted: boolean;
}

export interface PaymentTransactionDTO {
  id: string;
  orderId?: string;
  billSplitId?: string;
  provider: PaymentProviderType;
  providerTransactionId?: string;
  method: PaymentMethod;
  amountCop: number;
  tipCop: number;
  taxCop: number;
  status: PaymentStatus;
  paymentUrl?: string;
  createdAt: string;
}

export interface ElectronicInvoiceDTO {
  id: string;
  invoiceNumber: string;
  cufe: string;
  qrCodeUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  status: InvoiceStatus;
  customerDocNumber: string;
  customerLegalName: string;
  totalCop: number;
  issuedAt: string;
}

export interface BillSplitItemAllocationDTO {
  id: string;
  billSplitId: string;
  orderItemId: string;
  participantId: string;
  fraction: number;
}

export interface BillSplitDTO {
  id: string;
  tableSessionId: string;
  mode: SplitMode;
  totalAmountCop: number;
  tipAmountCop: number;
  taxAmountCop: number;
  status: 'OPEN' | 'COMPLETED';
  allocations: BillSplitItemAllocationDTO[];
  transactions: PaymentTransactionDTO[];
  createdAt: string;
}

export interface CreatePaymentResponseDTO {
  transactionId: string;
  orderId?: string;
  billSplitId?: string;
  status: PaymentStatus;
  amountCop: number;
  provider: PaymentProviderType;
  method: PaymentMethod;
  reference: string;
  paymentUrl?: string;
}

// ==============================================================================
// REALTIME SOCKET EVENT CONTRACTS
// ==============================================================================

export interface ServerToClientEvents {
  'order:created': (order: OrderDTO) => void;
  'order:status-changed': (payload: {
    orderId: string;
    newStatus: OrderStatus;
    updatedAt: string;
  }) => void;
  'order:payment-updated': (payload: {
    orderId: string;
    paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
    transaction: PaymentTransactionDTO;
  }) => void;
  'table:item-locked': (payload: {
    orderItemId: string;
    participantId: string;
    expiresAt: string;
  }) => void;
  'table:item-unlocked': (payload: { orderItemId: string }) => void;
  'table:split-updated': (payload: {
    tableSessionId: string;
    billSplit: BillSplitDTO;
  }) => void;
}

export interface ClientToServerEvents {
  'join:table': (tableSessionId: string) => void;
  'leave:table': (tableSessionId: string) => void;
  'join:kitchen': () => void;
  'join:waiter': (waiterId: string) => void;
}

