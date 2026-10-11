'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import {
  FileText,
  Download,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { ElectronicInvoiceDTO } from '@/lib/api';
import { formatCOP } from '@/lib/format';

interface InvoiceViewSheetProps {
  invoice: ElectronicInvoiceDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceViewSheet({
  invoice,
  isOpen,
  onClose,
}: InvoiceViewSheetProps) {
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const handleCopyCufe = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(invoice.cufe);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:4000`
      : 'http://localhost:4000');

  const pdfUrl = invoice.pdfUrl?.startsWith('http')
    ? invoice.pdfUrl
    : `${API_URL}${invoice.pdfUrl}`;

  const xmlUrl = invoice.xmlUrl?.startsWith('http')
    ? invoice.xmlUrl
    : `${API_URL}${invoice.xmlUrl}`;

  const qrUrl = invoice.qrCodeUrl?.startsWith('http')
    ? invoice.qrCodeUrl
    : `${API_URL}${invoice.qrCodeUrl}`;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92vh] flex-col rounded-t-[28px] bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <div className="p-5 pb-8 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{invoice.invoiceNumber}</h2>
                  <p className="text-xs text-slate-500">
                    {new Date(invoice.issuedAt).toLocaleDateString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>DIAN Válida</span>
              </div>
            </div>

            {/* Customer & Totals Summary */}
            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 mb-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Adquiriente:</span>
                <span className="font-bold text-slate-900">{invoice.customerLegalName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Identificación:</span>
                <span className="font-semibold text-slate-800">
                  {invoice.customerDocType} {invoice.customerDocNumber}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm">
                <span className="font-bold text-slate-900">Total Facturado:</span>
                <span className="font-black text-emerald-700">{formatCOP(invoice.totalCop)}</span>
              </div>
            </div>

            {/* CUFE Box */}
            <div className="rounded-2xl bg-slate-100 p-3 mb-4 text-[10px]">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-bold">CUFE (Código Único DIAN):</span>
                <button
                  type="button"
                  onClick={handleCopyCufe}
                  className="flex items-center gap-1 text-emerald-700 font-bold active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
              <div className="font-mono text-slate-700 break-all select-all leading-tight">
                {invoice.cufe}
              </div>
            </div>

            {/* QR Code & Verification Link */}
            {invoice.qrCodeUrl && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-white mb-5">
                <div className="flex items-center gap-3">
                  <img
                    src={qrUrl}
                    alt="QR DIAN"
                    className="h-14 w-14 rounded-lg border border-slate-100 p-1"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900">Validación DIAN</div>
                    <div className="text-[10px] text-slate-500">Consulta directa en el catálogo fiscal</div>
                  </div>
                </div>

                <a
                  href={`https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${invoice.cufe}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:text-emerald-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )}

            {/* Action Download Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={pdfUrl}
                download={`${invoice.invoiceNumber}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all text-center"
              >
                <Download className="h-4 w-4" />
                <span>Descargar PDF</span>
              </a>

              <a
                href={xmlUrl}
                download={`${invoice.invoiceNumber}.xml`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs active:scale-95 transition-all text-center"
              >
                <Download className="h-4 w-4" />
                <span>Descargar XML</span>
              </a>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
