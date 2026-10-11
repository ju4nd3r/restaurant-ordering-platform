import { PaymentMethod, PaymentProviderType, PaymentStatus } from '@restaurant/types';

export interface CreatePaymentParams {
  reference: string;
  amountCop: number;
  currency: 'COP';
  method: PaymentMethod;
  redirectUrl: string;
  customerEmail?: string;
  customerFullName?: string;
  customerDocType?: string;
  customerDocNumber?: string;
}

export interface CreatePaymentResult {
  provider: PaymentProviderType;
  reference: string;
  amountCop: number;
  status: PaymentStatus;
  providerTransactionId?: string;
  paymentUrl?: string;
  rawResponse?: Record<string, any>;
}

export interface VerifyPaymentResult {
  provider: PaymentProviderType;
  providerTransactionId: string;
  reference: string;
  amountCop: number;
  status: PaymentStatus;
  method?: PaymentMethod;
  rawResponse?: Record<string, any>;
}

export interface WebhookResult {
  isValid: boolean;
  providerTransactionId?: string;
  reference?: string;
  amountCop?: number;
  status?: PaymentStatus;
  rawPayload?: Record<string, any>;
}

export interface PaymentProvider {
  readonly providerType: PaymentProviderType;

  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;

  verifyTransaction(providerTransactionId: string): Promise<VerifyPaymentResult>;

  processWebhook(payload: Record<string, any>): Promise<WebhookResult>;
}
