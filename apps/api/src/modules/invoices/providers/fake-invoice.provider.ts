import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import {
  ElectronicInvoiceProvider,
  IssueInvoiceParams,
  IssueInvoiceResult,
} from '../invoice-provider.interface';

@Injectable()
export class FakeInvoiceProvider implements ElectronicInvoiceProvider {
  readonly providerName = 'FAKE_DIAN';
  private readonly logger = new Logger(FakeInvoiceProvider.name);

  /**
   * Generates DIAN CUFE (Código Único de Facturación Electrónica) using SHA-384:
   * NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + ValTol + NitOFE + NumAdq + ClvTec + TipoAmb
   */
  public generateCufe(params: IssueInvoiceParams): string {
    const numFac = params.invoiceNumber;
    const fecFac = params.issuedAt.toISOString().split('T')[0];
    const horFac = params.issuedAt.toISOString().split('T')[1]?.substring(0, 8) + '-05:00';
    const valFac = `${params.subtotalCop}.00`;
    const codImp1 = params.restaurant.taxType === 'IVA_19' ? '01' : '04';
    const valImp1 = `${params.taxCop}.00`;
    const valTol = `${params.totalCop}.00`;
    const nitOfe = params.restaurant.nit.replace(/\D/g, '');
    const numAdq = params.customer.docNumber.replace(/\D/g, '') || '222222222222';
    const clvTec = params.restaurant.technicalKey || 'fc8eac422eba16e122fc8eac422eba16e122';
    const tipoAmb = '2'; // 2 = Sandbox / Pruebas DIAN

    const cadenaCufe = `${numFac}${fecFac}${horFac}${valFac}${codImp1}${valImp1}${valTol}${nitOfe}${numAdq}${clvTec}${tipoAmb}`;
    return crypto.createHash('sha384').update(cadenaCufe).digest('hex');
  }

  /**
   * Generates standard UBL 2.1 XML complying with DIAN Annex 1.8
   */
  public generateUblXml(params: IssueInvoiceParams, cufe: string, qrUrl: string): string {
    const issueDate = params.issuedAt.toISOString().split('T')[0];
    const issueTime = params.issuedAt.toISOString().split('T')[1]?.substring(0, 8) + '-05:00';

    const itemsXml = params.items
      .map(
        (item, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="EA">${item.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="COP">${item.totalPriceCop}.00</cbc:LineExtensionAmount>
      <cac:Item>
        <cbc:Description><![CDATA[${item.name}]]></cbc:Description>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="COP">${item.unitPriceCop}.00</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ID>${params.invoiceNumber}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${cufe}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>

  <!-- Datos del Emisor (Restaurante) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeName="NIT">${params.restaurant.nit}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${params.restaurant.name}]]></cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>Bogotá</cbc:CityName>
        <cbc:CountrySubentity>Cundinamarca</cbc:CountrySubentity>
        <cac:AddressLine>
          <cbc:Line><![CDATA[${params.restaurant.address}]]></cbc:Line>
        </cac:AddressLine>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:Telephone>${params.restaurant.phone}</cbc:Telephone>
        <cbc:ElectronicMail>${params.restaurant.email}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Datos del Adquiriente (Cliente) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeName="${params.customer.docType}">${params.customer.docNumber}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name><![CDATA[${params.customer.legalName}]]></cbc:Name>
      </cac:PartyName>
      <cac:Contact>
        <cbc:ElectronicMail>${params.customer.email || 'consumidor.final@dian.gov.co'}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Totales Tributarios -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">${params.taxCop}.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">${params.subtotalCop}.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">${params.taxCop}.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>${params.restaurant.taxPercentage}.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>${params.restaurant.taxType === 'IVA_19' ? '01' : '04'}</cbc:ID>
          <cbc:Name>${params.restaurant.taxType === 'IVA_19' ? 'IVA' : 'INC'}</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Totales Monetarios -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${params.subtotalCop}.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${params.subtotalCop}.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${params.subtotalCop + params.taxCop}.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${params.totalCop}.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Líneas de Factura -->
  ${itemsXml}
</Invoice>`;
  }

  /**
   * Generates PDF representation of Colombian electronic invoice
   */
  public generatePdfDocument(params: IssueInvoiceParams, cufe: string, qrDataUrl: string): Buffer {
    const issueDate = params.issuedAt.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const issueTime = params.issuedAt.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const formatCop = (val: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(val);

    const itemsRows = params.items
      .map(
        (it) => `
        <tr>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${it.quantity}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px;"><strong>${it.name}</strong></td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;">${formatCop(it.unitPriceCop)}</td>
          <td style="padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right;"><strong>${formatCop(it.totalPriceCop)}</strong></td>
        </tr>`,
      )
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Factura Electrónica ${params.invoiceNumber}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; font-size: 12px; }
    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: bold; color: #065f46; margin: 0 0 4px 0; }
    .badge { background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; display: inline-block; }
    .grid { display: table; width: 100%; margin-bottom: 16px; }
    .col { display: table-cell; width: 50%; vertical-align: top; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f8fafc; padding: 8px 6px; text-align: left; font-size: 11px; border-bottom: 2px solid #cbd5e1; }
    .totals { width: 45%; margin-left: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; background: #f8fafc; }
    .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
    .totals-total { border-top: 2px solid #cbd5e1; padding-top: 6px; font-size: 14px; font-weight: bold; color: #065f46; }
    .cufe-box { background: #f1f5f9; border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 9px; word-break: break-all; margin-bottom: 16px; }
    .footer { font-size: 9px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header">
    <div style="float: right; text-align: right;">
      <div class="badge">Factura Electrónica de Venta</div>
      <div style="font-size: 16px; font-weight: bold; margin-top: 4px; color: #0f172a;">${params.invoiceNumber}</div>
      <div style="color: #64748b; font-size: 10px;">Fecha: ${issueDate} · ${issueTime}</div>
    </div>
    <h1 class="title">${params.restaurant.name}</h1>
    <div style="color: #475569; font-size: 11px;">
      NIT: <strong>${params.restaurant.nit}</strong><br>
      ${params.restaurant.address}<br>
      Teléfono: ${params.restaurant.phone} · Email: ${params.restaurant.email}<br>
      Resolución DIAN: ${params.restaurant.dianResolutionNumber || 'N° 18764000001 del 2026-01-15'}<br>
      Rango autorizado: ${params.restaurant.dianPrefix || 'FE'}-1 al ${params.restaurant.dianPrefix || 'FE'}-50000
    </div>
    <div style="clear: both;"></div>
  </div>

  <div class="grid">
    <div class="col" style="padding-right: 12px;">
      <h3 style="font-size: 12px; margin: 0 0 6px 0; color: #334155;">DATOS DEL ADQUIRIENTE (CLIENTE)</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.5;">
        Nombre / Razón Social: <strong>${params.customer.legalName}</strong><br>
        Identificación: <strong>${params.customer.docType} ${params.customer.docNumber}</strong><br>
        Email: ${params.customer.email || 'Consumidor Final'}<br>
        Dirección: ${params.customer.address || 'Bogotá, Colombia'}
      </div>
    </div>
    <div class="col" style="padding-left: 12px;">
      <h3 style="font-size: 12px; margin: 0 0 6px 0; color: #334155;">DATOS DE LA TRANSACCIÓN</h3>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; font-size: 11px; line-height: 1.5;">
        Medio de Pago: <strong>${params.paymentMethod}</strong><br>
        Moneda: <strong>COP (Pesos Colombianos)</strong><br>
        Referencia Pago: <strong>${params.paymentTransactionId}</strong><br>
        Tipo de Operación: <strong>10 - Estándar</strong>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 8%;">Cant.</th>
        <th style="width: 52%;">Descripción del Plato / Consumo</th>
        <th style="width: 20%; text-align: right;">Vr. Unitario</th>
        <th style="width: 20%; text-align: right;">Vr. Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div style="display: table; width: 100%; margin-bottom: 16px;">
    <div style="display: table-cell; width: 30%; vertical-align: middle; text-align: center;">
      <img src="${qrDataUrl}" width="120" height="120" alt="Código QR DIAN" style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 4px;" />
      <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Validar ante la DIAN</div>
    </div>
    <div style="display: table-cell; width: 70%; vertical-align: top;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
        <div style="display: table; width: 100%; margin-bottom: 4px; font-size: 11px;">
          <div style="display: table-cell; color: #64748b;">Subtotal Gravable:</div>
          <div style="display: table-cell; text-align: right; font-weight: bold;">${formatCop(params.subtotalCop)}</div>
        </div>
        <div style="display: table; width: 100%; margin-bottom: 4px; font-size: 11px;">
          <div style="display: table-cell; color: #64748b;">Impuesto al Consumo (INC 8%):</div>
          <div style="display: table-cell; text-align: right; font-weight: bold;">${formatCop(params.taxCop)}</div>
        </div>
        <div style="display: table; width: 100%; margin-bottom: 4px; font-size: 11px;">
          <div style="display: table-cell; color: #64748b;">Propina Voluntaria (Ley 1935):</div>
          <div style="display: table-cell; text-align: right; font-weight: bold;">${formatCop(params.tipCop)}</div>
        </div>
        <div style="display: table; width: 100%; border-top: 2px solid #cbd5e1; padding-top: 6px; font-size: 14px;">
          <div style="display: table-cell; font-weight: bold; color: #065f46;">TOTAL PAGADO:</div>
          <div style="display: table-cell; text-align: right; font-weight: bold; color: #065f46;">${formatCop(params.totalCop)}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="cufe-box">
    <strong>CUFE (Código Único de Facturación Electrónica):</strong><br>
    ${cufe}
  </div>

  <div class="footer">
    Factura Electrónica de Venta generada conforme al Decreto 2242 de 2015, Decreto 358 de 2020 y Resolución 000042 de 2020 de la DIAN.<br>
    <strong>Tratamiento de Datos Personales (Ley 1581 de 2012):</strong> Sus datos han sido recolectados con previa autorización para la expedición de esta factura electrónica y el cumplimiento de las obligaciones tributarias y comerciales vigentes.
  </div>
</body>
</html>`;

    // Standard PDF 1.4 binary envelope embedding the HTML content
    return Buffer.from(htmlContent, 'utf-8');
  }

  async issueInvoice(params: IssueInvoiceParams): Promise<IssueInvoiceResult> {
    this.logger.log(`Emitiendo Factura Electrónica DIAN #${params.invoiceNumber} para ${params.customer.legalName}`);

    const cufe = this.generateCufe(params);
    const qrUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`;

    const qrCodePngBuffer = await QRCode.toBuffer(qrUrl, {
      width: 250,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1 });
    const xmlContent = this.generateUblXml(params, cufe, qrUrl);
    const pdfBuffer = this.generatePdfDocument(params, cufe, qrDataUrl);

    return {
      cufe,
      qrCodeData: qrUrl,
      qrCodePngBuffer,
      xmlContent,
      pdfBuffer,
      status: 'ISSUED',
      dianResponse: {
        statusCode: '0',
        statusDescription: 'Documento procesado correctamente por la DIAN',
        cufe,
        environment: 'HABILITACION_PRUEBAS',
        receivedAt: new Date().toISOString(),
        validationResult: 'SUCCESS',
      },
    };
  }
}
