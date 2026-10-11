'use client';

import { useState } from 'react';
import { Drawer } from 'vaul';
import { FileText, CheckCircle2, ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { OrderDTO, requestElectronicInvoice, ElectronicInvoiceDTO } from '@/lib/api';

interface InvoiceRequestModalProps {
  order: OrderDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: ElectronicInvoiceDTO) => void;
}

export function InvoiceRequestModal({
  order,
  isOpen,
  onClose,
  onInvoiceCreated,
}: InvoiceRequestModalProps) {
  const [isFinalConsumer, setIsFinalConsumer] = useState(false);
  const [docType, setDocType] = useState('CC');
  const [docNumber, setDocNumber] = useState('');
  const [fullNameOrLegalName, setFullNameOrLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [habeasDataAccepted, setHabeasDataAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFinalConsumer) {
      if (!docNumber.trim()) {
        setError('El número de documento es obligatorio');
        return;
      }
      if (!fullNameOrLegalName.trim()) {
        setError('El nombre o razón social es obligatorio');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('Debe ingresar un correo electrónico válido para recibir la factura');
        return;
      }
      if (!habeasDataAccepted) {
        setError('Debe autorizar el tratamiento de datos personales (Habeas Data Ley 1581 de 2012)');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const invoice = await requestElectronicInvoice({
        orderId: order.id,
        billingData: {
          isFinalConsumer,
          docType: isFinalConsumer ? 'FINAL_CONSUMER' : docType,
          docNumber: isFinalConsumer ? '222222222222' : docNumber.trim(),
          fullNameOrLegalName: isFinalConsumer ? 'Consumidor Final' : fullNameOrLegalName.trim(),
          email: isFinalConsumer ? undefined : email.trim(),
          phone: isFinalConsumer ? undefined : phone.trim(),
          address: isFinalConsumer ? undefined : address.trim(),
          habeasDataAccepted: isFinalConsumer ? true : habeasDataAccepted,
        },
      });

      setIsSubmitting(false);
      onInvoiceCreated(invoice);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al emitir la factura electrónica');
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[92vh] flex-col rounded-t-[28px] bg-white outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />

          <div className="p-5 pb-8 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Factura Electrónica DIAN</h2>
                <p className="text-xs text-slate-500">Pedido #{order.orderNumber} · Mesa {order.table.number}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsFinalConsumer(false)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    !isFinalConsumer
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  A mis Datos / Empresa
                </button>
                <button
                  type="button"
                  onClick={() => setIsFinalConsumer(true)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                    isFinalConsumer
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Consumidor Final
                </button>
              </div>

              {isFinalConsumer ? (
                <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p>
                    Se emitirá la factura electrónica bajo el identificador estándar de la DIAN:
                  </p>
                  <div className="font-semibold text-slate-900">
                    NIT / Cédula: 222222222222<br />
                    Nombre: Consumidor Final
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Podrás descargar el PDF y el XML estándar UBL 2.1 directamente al completar la solicitud.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipo Doc.</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-white"
                      >
                        <option value="CC">Cédula (CC)</option>
                        <option value="NIT">NIT</option>
                        <option value="CE">Extranjería (CE)</option>
                        <option value="PASSPORT">Pasaporte</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Número de Documento</label>
                      <input
                        type="text"
                        placeholder="Ej. 1020304050"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre Completo o Razón Social</label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Pérez o Mi Empresa S.A.S."
                      value={fullNameOrLegalName}
                      onChange={(e) => setFullNameOrLegalName(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Correo Electrónico (Para recibir PDF y XML)</label>
                    <input
                      type="email"
                      placeholder="cliente@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Teléfono (Opcional)</label>
                      <input
                        type="tel"
                        placeholder="3001234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Dirección (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Bogotá, Colombia"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {/* Habeas Data Checkbox */}
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-left">
                    <input
                      type="checkbox"
                      checked={habeasDataAccepted}
                      onChange={(e) => setHabeasDataAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-[11px] text-slate-600 leading-tight">
                      <span className="font-semibold text-slate-900 block mb-0.5">Autorización de Tratamiento de Datos (Ley 1581 de 2012)</span>
                      Autorizo el tratamiento de mis datos personales para la emisión y envío de mi factura electrónica DIAN conforme a la política de Habeas Data.
                    </div>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Emitir Factura Electrónica</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
