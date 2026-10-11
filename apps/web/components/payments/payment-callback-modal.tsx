'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, Clock } from 'lucide-react';
import { verifyPayment, PaymentResponseDTO } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface PaymentCallbackModalProps {
  orderId?: string | null;
  reference?: string | null;
  onPaymentConfirmed?: () => void;
  onClose: () => void;
}

export function PaymentCallbackModal({
  orderId,
  reference,
  onPaymentConfirmed,
  onClose,
}: PaymentCallbackModalProps) {
  const [status, setStatus] = useState<'VERIFYING' | 'APPROVED' | 'DECLINED' | 'PENDING'>('VERIFYING');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let attempts = 0;

    // Listen to WebSocket for immediate push notification
    const socket = getSocket();
    const handlePaymentUpdated = (payload: any) => {
      if (payload.orderId === orderId || payload.transaction?.reference === reference) {
        if (payload.paymentStatus === 'PAID' || payload.transaction?.status === 'APPROVED') {
          setStatus('APPROVED');
          if (onPaymentConfirmed) onPaymentConfirmed();
        }
      }
    };

    socket.on('order:payment-updated', handlePaymentUpdated);

    // Polling verification fallback (Wompi webhook might take 1-3 seconds)
    interval = setInterval(async () => {
      attempts += 1;
      if (attempts > 15) {
        // After 15 attempts (~30 seconds), show pending message
        clearInterval(interval);
        if (status === 'VERIFYING') {
          setStatus('PENDING');
        }
        return;
      }

      if (orderId) {
        try {
          const res = await verifyPayment(orderId);
          if (res.status === 'APPROVED') {
            setStatus('APPROVED');
            clearInterval(interval);
            if (onPaymentConfirmed) onPaymentConfirmed();
          } else if (res.status === 'DECLINED') {
            setStatus('DECLINED');
            clearInterval(interval);
          }
        } catch {
          // Keep polling
        }
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      socket.off('order:payment-updated', handlePaymentUpdated);
    };
  }, [orderId, reference, onPaymentConfirmed, status]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl">
        {status === 'VERIFYING' && (
          <div className="py-4 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Verificando tu pago</h3>
              <p className="text-xs text-slate-500 mt-1">
                Estamos confirmando la transacción con Wompi de manera segura...
              </p>
            </div>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="py-4 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">¡Pago Confirmado!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tu pago ha sido procesado exitosamente. La cocina ya está preparando tu pedido.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md active:scale-95 transition-all"
            >
              Ver estado del pedido
            </button>
          </div>
        )}

        {status === 'PENDING' && (
          <div className="py-4 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Clock className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pago en proceso</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tu transacción se está validando. Si pagaste por PSE o Nequi, puede demorar unos instantes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-sm"
            >
              Entendido
            </button>
          </div>
        )}

        {status === 'DECLINED' && (
          <div className="py-4 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <XCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Pago no completado</h3>
              <p className="text-xs text-slate-500 mt-1">
                La pasarela declinó la transacción. Puedes intentar nuevamente o pagar en caja.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-slate-800 text-white font-bold text-sm"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
