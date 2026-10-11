import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PaymentMethod, PaymentProviderType, PaymentStatus } from '@restaurant/types';
import {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentProvider,
  VerifyPaymentResult,
  WebhookResult,
} from '../payment-provider.interface';

@Injectable()
export class WompiPaymentProvider implements PaymentProvider {
  readonly providerType: PaymentProviderType = 'WOMPI';
  private readonly logger = new Logger(WompiPaymentProvider.name);

  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly eventsSecret: string;
  private readonly integritySecret: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.publicKey =
      this.configService.get<string>('NEXT_PUBLIC_WOMPI_PUBLIC_KEY') ||
      'pub_stag_test_g2u0q2587829a2829a829a';
    this.privateKey =
      this.configService.get<string>('WOMPI_PRIVATE_KEY') ||
      'prv_stag_test_9281a829a8291a8291a8291a';
    this.eventsSecret =
      this.configService.get<string>('WOMPI_EVENTS_SECRET') ||
      'stag_events_secret_mock_test_key_colombia';
    this.integritySecret =
      this.configService.get<string>('WOMPI_INTEGRITY_SECRET') ||
      'stag_integrity_secret_mock_test_key_colombia';
    this.apiUrl =
      this.configService.get<string>('WOMPI_API_URL') ||
      'https://sandbox.wompi.co/v1';
  }

  /**
   * Generates SHA256 integrity signature required by Wompi hosted checkout:
   * SHA256(reference + amountInCents + currency + integritySecret)
   */
  public generateIntegritySignature(
    reference: string,
    amountCop: number,
    currency: string = 'COP',
  ): string {
    const amountInCents = amountCop * 100;
    const chain = `${reference}${amountInCents}${currency}${this.integritySecret}`;
    return crypto.createHash('sha256').update(chain).digest('hex');
  }

  /**
   * Generates hosted checkout URL for Wompi
   */
  public generateCheckoutUrl(
    reference: string,
    amountCop: number,
    redirectUrl: string,
  ): string {
    const amountInCents = amountCop * 100;
    const integritySignature = this.generateIntegritySignature(reference, amountCop);

    const params = new URLSearchParams({
      'public-key': this.publicKey,
      currency: 'COP',
      'amount-in-cents': amountInCents.toString(),
      reference,
      'signature:integrity': integritySignature,
      'redirect-url': redirectUrl,
    });

    return `https://checkout.wompi.co/p/?${params.toString()}`;
  }

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const paymentUrl = this.generateCheckoutUrl(
      params.reference,
      params.amountCop,
      params.redirectUrl,
    );

    this.logger.log(
      `Generado Checkout URL Wompi para referencia: ${params.reference}, COP: ${params.amountCop}`,
    );

    return {
      provider: 'WOMPI',
      reference: params.reference,
      amountCop: params.amountCop,
      status: 'PENDING',
      paymentUrl,
      rawResponse: {
        paymentUrl,
        amountCop: params.amountCop,
        amountInCents: params.amountCop * 100,
        currency: 'COP',
      },
    };
  }

  async verifyTransaction(providerTransactionId: string): Promise<VerifyPaymentResult> {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${providerTransactionId}`, {
        headers: {
          Authorization: `Bearer ${this.privateKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Wompi API error: ${response.status} ${response.statusText}`);
      }

      const body = (await response.json()) as { data: Record<string, any> };
      const transaction = body.data;

      return {
        provider: 'WOMPI',
        providerTransactionId: transaction.id,
        reference: transaction.reference,
        amountCop: Math.round(Number(transaction.amount_in_cents || 0) / 100),
        status: this.mapWompiStatus(transaction.status),
        method: this.mapWompiMethod(transaction.payment_method_type),
        rawResponse: transaction,
      };
    } catch (error) {
      this.logger.error(`Error verificando transacción Wompi ${providerTransactionId}:`, error);
      throw error;
    }
  }

  /**
   * Validates Wompi webhook signature and extracts transaction status.
   * Checksum calculation:
   * Values of properties concatenated + timestamp + eventsSecret -> SHA256 hex
   */
  async processWebhook(payload: Record<string, any>): Promise<WebhookResult> {
    try {
      if (!payload || !payload.signature || !payload.data) {
        return { isValid: false };
      }

      const { signature, timestamp, data } = payload;
      const properties: string[] = signature.properties || [];
      const expectedChecksum = signature.checksum;

      let concatenated = '';
      for (const prop of properties) {
        const value = this.extractNestedProperty(data, prop);
        concatenated += String(value ?? '');
      }
      concatenated += String(timestamp);
      concatenated += this.eventsSecret;

      const calculatedChecksum = crypto.createHash('sha256').update(concatenated).digest('hex');
      const calculatedBuf = Buffer.from(calculatedChecksum, 'utf-8');
      const expectedBuf = Buffer.from(expectedChecksum, 'utf-8');

      const isValid =
        calculatedBuf.length === expectedBuf.length &&
        crypto.timingSafeEqual(calculatedBuf, expectedBuf);

      if (!isValid) {
        this.logger.warn('Firma de webhook Wompi no válida');
        return { isValid: false };
      }

      const transaction = data.transaction || {};
      const status = this.mapWompiStatus(transaction.status);
      const amountCop = Math.round(Number(transaction.amount_in_cents || 0) / 100);

      return {
        isValid: true,
        providerTransactionId: transaction.id,
        reference: transaction.reference,
        amountCop,
        status,
        rawPayload: payload,
      };
    } catch (error) {
      this.logger.error('Error al procesar webhook de Wompi:', error);
      return { isValid: false };
    }
  }

  private extractNestedProperty(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  public mapWompiStatus(status: string): PaymentStatus {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'APPROVED';
      case 'DECLINED':
        return 'DECLINED';
      case 'VOIDED':
        return 'VOIDED';
      case 'ERROR':
        return 'ERROR';
      case 'PENDING':
      default:
        return 'PENDING';
    }
  }

  private mapWompiMethod(methodType?: string): PaymentMethod {
    switch (methodType?.toUpperCase()) {
      case 'CARD':
        return 'CARD';
      case 'PSE':
        return 'PSE';
      case 'NEQUI':
        return 'NEQUI';
      case 'BANCOLOMBIA':
      case 'BANCOLOMBIA_TRANSFER':
      case 'BANCOLOMBIA_QR':
        return 'BANCOLOMBIA';
      default:
        return 'CARD';
    }
  }
}
