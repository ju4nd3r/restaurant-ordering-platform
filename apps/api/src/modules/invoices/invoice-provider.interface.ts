export interface InvoiceCustomerData {
  isFinalConsumer: boolean;
  docType: string;
  docNumber: string;
  legalName: string;
  email?: string;
  phone?: string;
  address?: string;
  habeasDataAccepted: boolean;
}

export interface InvoiceRestaurantData {
  id: string;
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  taxType: string;
  taxPercentage: number;
  dianResolutionNumber?: string;
  dianPrefix?: string;
  technicalKey?: string;
}

export interface InvoiceItemLine {
  name: string;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  taxCop: number;
}

export interface IssueInvoiceParams {
  invoiceNumber: string;
  restaurant: InvoiceRestaurantData;
  customer: InvoiceCustomerData;
  items: InvoiceItemLine[];
  subtotalCop: number;
  taxCop: number;
  tipCop: number;
  totalCop: number;
  paymentMethod: string;
  paymentTransactionId: string;
  issuedAt: Date;
}

export interface IssueInvoiceResult {
  cufe: string;
  qrCodeData: string;
  qrCodePngBuffer: Buffer;
  xmlContent: string;
  pdfBuffer: Buffer;
  status: 'ISSUED' | 'REJECTED' | 'ERROR';
  dianResponse: Record<string, any>;
}

export interface ElectronicInvoiceProvider {
  readonly providerName: string;

  issueInvoice(params: IssueInvoiceParams): Promise<IssueInvoiceResult>;
}
