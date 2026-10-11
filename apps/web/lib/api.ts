const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');

export interface TableResolutionResponse {
  table: {
    id: string;
    number: number;
    label: string;
    zone?: string;
    assignedWaiter?: {
      id: string;
      fullName: string;
    };
  };
  session: {
    id: string;
    sessionToken: string;
    status: 'ACTIVE' | 'CLOSED';
    openedAt: string;
  };
  restaurant: {
    id: string;
    name: string;
    slug: string;
    address: string;
    phone: string;
    taxType: string;
    taxPercentage: number;
    defaultTipPercentage: number;
    currency: string;
    isActive: boolean;
  };
}

export interface MenuItemOption {
  id: string;
  name: string;
  additionalPriceCop: number;
  isDefault: boolean;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  minSelectable: number;
  maxSelectable: number;
  options: MenuItemOption[];
}

export interface MenuItemModifier {
  id: string;
  name: string;
  priceCop: number;
  isAvailable: boolean;
}

export interface MenuItemImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  blurPlaceholder?: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePriceCop: number;
  prepTimeMinutes: number;
  isAvailable: boolean;
  ingredients: string[];
  allergens: string[];
  dietaryFlags: string[];
  sortOrder: number;
  images: MenuItemImage[];
  optionGroups: MenuItemOptionGroup[];
  modifiers: MenuItemModifier[];
}

export interface CategoryWithItems {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
}

export async function resolveTable(token: string): Promise<TableResolutionResponse> {
  const res = await fetch(`${API_URL}/api/tables/by-token/${encodeURIComponent(token)}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Mesa no encontrada o inactiva');
  }

  return res.json();
}

export async function fetchMenuCategories(restaurantId?: string): Promise<CategoryWithItems[]> {
  const url = new URL(`${API_URL}/api/menu/categories`);
  if (restaurantId) {
    url.searchParams.set('restaurantId', restaurantId);
  }

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error('Error al cargar las categorías del menú');
  }

  return res.json();
}

export async function searchMenuItems(params: {
  q?: string;
  categoryId?: string;
  dietaryFlags?: string;
  restaurantId?: string;
}): Promise<MenuItem[]> {
  const url = new URL(`${API_URL}/api/menu/items`);
  if (params.q) url.searchParams.set('q', params.q);
  if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
  if (params.dietaryFlags) url.searchParams.set('dietaryFlags', params.dietaryFlags);
  if (params.restaurantId) url.searchParams.set('restaurantId', params.restaurantId);

  const res = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al buscar platos en el menú');
  }

  return res.json();
}

export function getFullImageUrl(path?: string): string {
  if (!path) return '/placeholder-dish.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface CreateOrderPayload {
  tableSessionToken?: string;
  items: {
    menuItemId: string;
    quantity: number;
    comment?: string;
    selectedOptions?: {
      optionGroupId: string;
      optionGroupName: string;
      optionId: string;
      optionName: string;
      additionalPriceCop?: number;
    }[];
    selectedModifiers?: {
      modifierId: string;
      name: string;
      priceCop?: number;
    }[];
  }[];
  customerNotes?: string;
  tipPercentage?: number;
}

export interface OrderItemOption {
  id: string;
  optionGroupId: string;
  optionGroupName: string;
  optionId: string;
  optionName: string;
  additionalPriceCop: number;
}

export interface OrderItemModifier {
  id: string;
  modifierId: string;
  name: string;
  priceCop: number;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  comment?: string | null;
  isPaid: boolean;
  menuItem: {
    name: string;
    prepTimeMinutes: number;
    images?: MenuItemImage[];
  };
  options: OrderItemOption[];
  modifiers: OrderItemModifier[];
}

export interface OrderDTO {
  id: string;
  restaurantId: string;
  tableId: string;
  tableSessionId: string;
  orderNumber: number;
  status: 'PENDING_PAYMENT' | 'RECEIVED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  waiterId?: string | null;
  customerNotes?: string | null;
  subtotalCop: number;
  taxCop: number;
  tipCop: number;
  totalCop: number;
  createdAt: string;
  updatedAt: string;
  table: {
    number: number;
    label: string;
    zone?: string | null;
  };
  waiter?: {
    id: string;
    fullName: string;
  } | null;
  items: OrderItemDTO[];
  statusHistory?: {
    id: string;
    status: string;
    changedAt: string;
  }[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<OrderDTO> {
  const res = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al crear el pedido');
  }

  return res.json();
}

export async function fetchSessionOrders(tableSessionId: string): Promise<OrderDTO[]> {
  const res = await fetch(`${API_URL}/api/orders/session/${encodeURIComponent(tableSessionId)}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al cargar los pedidos de la mesa');
  }

  return res.json();
}

// ==============================================================================
// PAYMENTS & BILL SPLITTING API
// ==============================================================================

export interface PaymentResponseDTO {
  transactionId: string;
  orderId?: string;
  billSplitId?: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
  amountCop: number;
  provider: 'WOMPI' | 'CASH';
  method: string;
  reference: string;
  paymentUrl?: string;
}

export interface BillSplitItemAllocationDTO {
  id: string;
  billSplitId: string;
  orderItemId: string;
  participantId: string;
  fraction: number;
}

export interface BillSplitTransactionDTO {
  id: string;
  amountCop: number;
  method: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
  createdAt: string;
}

export interface BillSplitDTO {
  id: string;
  tableSessionId: string;
  mode: 'BY_ITEMS' | 'EQUAL_PARTS' | 'CUSTOM_AMOUNT';
  totalAmountCop: number;
  tipAmountCop: number;
  taxAmountCop: number;
  status: 'OPEN' | 'COMPLETED';
  allocations: BillSplitItemAllocationDTO[];
  transactions: BillSplitTransactionDTO[];
  createdAt: string;
}

export async function createOrderPayment(payload: {
  orderId: string;
  provider?: 'WOMPI' | 'CASH';
  method?: string;
  customerBillingData?: any;
}): Promise<PaymentResponseDTO> {
  const res = await fetch(`${API_URL}/api/payments/order`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al iniciar el pago');
  }

  return res.json();
}

export async function initBillSplit(payload: {
  tableSessionId: string;
  mode: 'BY_ITEMS' | 'EQUAL_PARTS' | 'CUSTOM_AMOUNT';
  totalPersons?: number;
}): Promise<BillSplitDTO> {
  const res = await fetch(`${API_URL}/api/payments/bill-split/init`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al iniciar la división de cuenta');
  }

  return res.json();
}

export async function fetchBillSplit(tableSessionId: string): Promise<BillSplitDTO | null> {
  const res = await fetch(`${API_URL}/api/payments/bill-split/${encodeURIComponent(tableSessionId)}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function lockBillSplitItem(payload: {
  tableSessionId: string;
  orderItemId: string;
  participantId: string;
}): Promise<{ acquired: boolean; expiresAt: string }> {
  const res = await fetch(`${API_URL}/api/payments/bill-split/lock-item`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'No se pudo reservar el ítem');
  }

  return res.json();
}

export async function unlockBillSplitItem(payload: {
  tableSessionId: string;
  orderItemId: string;
  participantId: string;
}): Promise<{ released: boolean }> {
  const res = await fetch(`${API_URL}/api/payments/bill-split/unlock-item`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return { released: false };
  }

  return res.json();
}

export async function payBillSplit(payload: {
  billSplitId: string;
  participantId: string;
  provider?: 'WOMPI' | 'CASH';
  method?: string;
  selectedItemIds?: string[];
  customAmountCop?: number;
  customerBillingData?: any;
}): Promise<PaymentResponseDTO> {
  const res = await fetch(`${API_URL}/api/payments/bill-split/pay`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al procesar pago de cuota');
  }

  return res.json();
}

export async function verifyPayment(transactionId: string): Promise<PaymentResponseDTO> {
  const res = await fetch(`${API_URL}/api/payments/${encodeURIComponent(transactionId)}/verify`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al verificar el estado del pago');
  }

  return res.json();
}

// ==============================================================================
// ELECTRONIC INVOICING API (DIAN)
// ==============================================================================

export interface ElectronicInvoiceDTO {
  id: string;
  invoiceNumber: string;
  cufe: string;
  qrCodeUrl?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  customerDocType: string;
  customerDocNumber: string;
  customerLegalName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  subtotalCop: number;
  taxCop: number;
  tipCop: number;
  totalCop: number;
  status: 'PENDING' | 'ISSUED' | 'REJECTED' | 'ERROR';
  issuedAt: string;
}

export async function requestElectronicInvoice(payload: {
  orderId: string;
  transactionId?: string;
  billingData: {
    isFinalConsumer: boolean;
    docType?: string;
    docNumber?: string;
    fullNameOrLegalName?: string;
    email?: string;
    phone?: string;
    address?: string;
    habeasDataAccepted?: boolean;
  };
}): Promise<ElectronicInvoiceDTO> {
  const res = await fetch(`${API_URL}/api/invoices/request`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al solicitar factura electrónica');
  }

  return res.json();
}

export async function fetchOrderInvoice(orderId: string): Promise<ElectronicInvoiceDTO | null> {
  const res = await fetch(`${API_URL}/api/invoices/by-order/${encodeURIComponent(orderId)}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

// ==============================================================================
// STAFF OPERATIONAL API (KDS, WAITER, CASHIER, SHIFTS)
// ==============================================================================

export interface StaffUserDTO {
  id: string;
  email: string;
  fullName: string;
  roles: ('ADMIN' | 'CASHIER' | 'KITCHEN' | 'WAITER')[];
  restaurantId: string;
}

export interface ShiftInfoDTO {
  activeShift: any;
  isUserCheckedIn: boolean;
  userCheckInTime: string | null;
}

export interface WaiterSummaryDTO {
  waiterId: string;
  assignedTablesCount: number;
  assignedTables: any[];
  totalTipsCop: number;
  tipAllocations: any[];
}

export async function staffLogin(email: string, password: string): Promise<StaffUserDTO> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Credenciales inválidas');
  }

  const data = await res.json();
  return data.user;
}

export async function fetchStaffMe(): Promise<StaffUserDTO | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) return null;
  return res.json();
}

export async function staffLogout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function fetchActiveKitchenOrders(): Promise<OrderDTO[]> {
  const res = await fetch(`${API_URL}/api/orders/kitchen/active`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al cargar pedidos activos de cocina');
  }

  return res.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: 'RECEIVED' | 'IN_PREPARATION' | 'READY' | 'DELIVERED' | 'CANCELLED',
): Promise<OrderDTO> {
  const res = await fetch(`${API_URL}/api/orders/${encodeURIComponent(orderId)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al cambiar estado del pedido');
  }

  return res.json();
}

export async function fetchReadyOrders(): Promise<OrderDTO[]> {
  const res = await fetch(`${API_URL}/api/orders/waiter/ready`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al consultar pedidos listos');
  }

  return res.json();
}

export async function fetchPendingCashOrders(): Promise<any[]> {
  const res = await fetch(`${API_URL}/api/orders/cashier/pending-cash`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al consultar pagos en caja');
  }

  return res.json();
}

export async function fetchCurrentShift(): Promise<ShiftInfoDTO> {
  const res = await fetch(`${API_URL}/api/shifts/current`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al consultar turno');
  }

  return res.json();
}

export async function startStaffShift(notes?: string): Promise<ShiftInfoDTO> {
  const res = await fetch(`${API_URL}/api/shifts/start`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al iniciar turno');
  }

  return res.json();
}

export async function endStaffShift(notes?: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/shifts/end`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Error al finalizar turno');
  }

  return res.json();
}

export async function fetchWaiterSummary(): Promise<WaiterSummaryDTO> {
  const res = await fetch(`${API_URL}/api/shifts/waiter/summary`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Error al consultar resumen de mesero');
  }

  return res.json();
}


