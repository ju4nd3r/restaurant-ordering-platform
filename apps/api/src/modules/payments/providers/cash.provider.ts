import { Injectable, Logger } from '@nestjs/common';
import { PaymentProviderType, PaymentStatus } from '@restaurant/types';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
  WebhookResult,
} from '../payment-provider.interface';

@Injectable()
export class CashPaymentProvider implements PaymentProvider {
  readonly providerType: PaymentProviderType = 'CASH';
  private readonly logger = new Logger(CashPaymentProvider.name);

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    this.logger.log(`Registrando solicitud de pago en efectivo para referencia: ${params.reference}`);

    return {
      provider: 'CASH',
      reference: params.reference,
      amountCop: params.amountCop,
      status: 'PENDING',
      rawResponse: {
        method: 'CASH',
        note: 'Pago en efectivo pendiente de confirmación en caja',
      },
    };
  }

  async verifyTransaction(providerTransactionId: string): Promise<VerifyPaymentResult> {
    return {
      provider: 'CASH',
      providerTransactionId,
      reference: providerTransactionId,
      amountCop: 0,
      status: 'PENDING',
      method: 'CASH',
    };
  }

  async processWebhook(): Promise<WebhookResult> {
    return { isValid: false };
  }
}
