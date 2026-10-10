import Link from 'next/link';
import { QrCode, UtensilsCrossed, ShieldAlert } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 max-w-md mx-auto text-center">
      <div className="w-full pt-12 flex flex-col items-center">
        <div className="h-16 w-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">Restaurante Demo</h1>
        <p className="mt-2 text-stone-600 text-sm leading-relaxed">
          Experiencia móvil sin fricción. Escanea el código QR de tu mesa para ver el menú, ordenar
          y pagar con Wompi o dividir la cuenta.
        </p>

        <div className="mt-8 p-6 bg-white border border-stone-200 rounded-3xl shadow-sm w-full flex flex-col items-center">
          <div className="p-4 bg-stone-50 rounded-2xl mb-4 border border-stone-100">
            <QrCode className="w-16 h-16 text-stone-800" />
          </div>
          <span className="text-sm font-semibold text-stone-900">Escanea el QR de tu mesa</span>
          <p className="text-xs text-stone-500 mt-1">
            Usa la cámara de tu celular para ingresar directamente a tu sesión de mesa.
          </p>
          <Link
            href="/m/m_mesa1_criollo_9a8b"
            className="mt-5 w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-xl text-sm transition-colors touch-target"
          >
            Ver Menú de Demostración (Mesa 1)
          </Link>
        </div>
      </div>

      <div className="w-full pb-8 pt-6">
        <Link
          href="/staff"
          className="flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 py-3 touch-target"
        >
          <ShieldAlert className="w-4 h-4" />
          Acceso Personal del Restaurante (Staff)
        </Link>
        <p className="text-[11px] text-stone-400 mt-2">
          Colombia · Soporte Wompi, DIAN y Propinas Ley 1935
        </p>
      </div>
    </main>
  );
}
