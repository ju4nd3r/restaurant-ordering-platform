import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendInvoiceEmailParams {
  to: string;
  invoiceNumber: string;
  restaurantName: string;
  customerName: string;
  totalCop: number;
  pdfBuffer: Buffer;
  xmlContent: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: nodemailer.Transporter;

  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    this.fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') || 'no-reply@mirestaurante.com.co';
    this.fromName =
      this.configService.get<string>('SMTP_FROM_NAME') || 'Plataforma Restaurante';
  }

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST') || 'localhost';
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 1025;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.logger.log(`Servicio de correo SMTP configurado en ${host}:${port}`);
  }

  async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<boolean> {
    if (!params.to || params.to.includes('dian.gov.co')) {
      return false; // Skip if no recipient or final consumer default
    }

    try {
      const formatCop = (val: number) =>
        new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(val);

      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: params.to,
        subject: `Factura Electrónica ${params.invoiceNumber} - ${params.restaurantName}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #ecfdf5; border-radius: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #a7f3d0;">
              <h2 style="color: #065f46; margin: 0 0 8px 0;">¡Hola, ${params.customerName}!</h2>
              <p style="margin: 0; font-size: 14px;">Adjunto encontrarás tu <strong>Factura Electrónica de Venta #${params.invoiceNumber}</strong> por valor de <strong>${formatCop(params.totalCop)}</strong> expedida por <strong>${params.restaurantName}</strong>.</p>
            </div>
            
            <p style="font-size: 13px; color: #475569;">
              Se adjuntan los archivos reglamentarios exigidos por la DIAN en Colombia:
            </p>
            <ul style="font-size: 13px; color: #475569;">
              <li><strong>${params.invoiceNumber}.pdf:</strong> Representación gráfica para tu visualización.</li>
              <li><strong>${params.invoiceNumber}.xml:</strong> Documento electrónico estándar UBL 2.1 con validación DIAN.</li>
            </ul>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
              Mensaje automático emitido de conformidad con la Resolución 000042 de la DIAN y la Ley 1581 de 2012 (Protección de Datos Personales).
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `${params.invoiceNumber}.pdf`,
            content: params.pdfBuffer,
            contentType: 'application/pdf',
          },
          {
            filename: `${params.invoiceNumber}.xml`,
            content: Buffer.from(params.xmlContent, 'utf-8'),
            contentType: 'application/xml',
          },
        ],
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Factura ${params.invoiceNumber} enviada a ${params.to}. MessageId: ${info.messageId}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`No se pudo enviar correo de factura a ${params.to}: ${err?.message}`);
      return false;
    }
  }
}
