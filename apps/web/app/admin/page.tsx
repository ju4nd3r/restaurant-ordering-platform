'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  fetchAdminCategories,
  createAdminCategory,
  deleteAdminCategory,
  createAdminMenuItem,
  toggleMenuItemAvailability,
  deleteAdminMenuItem,
  uploadMenuItemImage,
  deleteMenuItemImage,
  fetchAdminTables,
  createAdminTable,
  fetchTableQr,
  fetchAdminOrderHistory,
  fetchAdminDailySales,
  StaffUserDTO,
  fetchStaffMe,
} from '@/lib/api';
import { formatMoneyCop } from '@/lib/format';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Table as TableIcon,
  Receipt,
  Plus,
  Trash2,
  QrCode,
  Download,
  Camera,
  Check,
  TrendingUp,
  DollarSign,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [user, setUser] = useState<StaffUserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'metrics' | 'menu' | 'tables' | 'history'>('metrics');

  // Categories & Items
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');

  // New Item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('25000');
  const [newItemPrepTime, setNewItemPrepTime] = useState('15');
  const [creatingItem, setCreatingItem] = useState(false);

  // Tables & QR
  const [tables, setTables] = useState<any[]>([]);
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableLabel, setNewTableLabel] = useState('');
  const [newTableZone, setNewTableZone] = useState('Principal');
  const [selectedQr, setSelectedQr] = useState<any | null>(null);

  // History & Sales
  const [salesSummary, setSalesSummary] = useState<any | null>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffMe()
      .then((me) => {
        setUser(me);
        if (me && me.roles.includes('ADMIN')) {
          loadData();
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loadData = async () => {
    try {
      const [cats, tbls, sales, hist] = await Promise.all([
        fetchAdminCategories().catch(() => []),
        fetchAdminTables().catch(() => []),
        fetchAdminDailySales().catch(() => null),
        fetchAdminOrderHistory().catch(() => ({ orders: [] })),
      ]);

      setCategories(cats);
      if (cats.length > 0 && !selectedCatId) setSelectedCatId(cats[0].id);
      setTables(tbls);
      setSalesSummary(sales);
      setOrderHistory(hist.orders || []);
    } catch (err) {
      console.warn('Error loading admin data:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await createAdminCategory({ name: newCatName.trim() });
      setNewCatName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await deleteAdminCategory(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar categoría (debe estar vacía)');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !newItemName.trim()) return;

    setCreatingItem(true);
    try {
      await createAdminMenuItem({
        categoryId: selectedCatId,
        name: newItemName.trim(),
        description: newItemDesc.trim(),
        basePriceCop: parseInt(newItemPrice) || 0,
        prepTimeMinutes: parseInt(newItemPrepTime) || 15,
        ingredients: ['Ingrediente de la casa'],
        allergens: [],
        dietaryFlags: [],
      });
      setNewItemName('');
      setNewItemDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear plato');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleToggleAvailability = async (itemId: string, current: boolean) => {
    try {
      await toggleMenuItemAvailability(itemId, !current);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este plato del menú?')) return;
    try {
      await deleteAdminMenuItem(itemId);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadClick = (itemId: string) => {
    setUploadingItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingItemId) return;

    try {
      await uploadMenuItemImage(uploadingItemId, file);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al subir foto');
    } finally {
      setUploadingItemId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(newTableNum);
    if (isNaN(num)) return;

    try {
      await createAdminTable({
        number: num,
        label: newTableLabel.trim() || `Mesa ${num}`,
        zone: newTableZone.trim() || 'Principal',
      });
      setNewTableNum('');
      setNewTableLabel('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al crear mesa');
    }
  };

  const handleViewQr = async (tableId: string) => {
    try {
      const qrData = await fetchTableQr(tableId);
      setSelectedQr(qrData);
    } catch (err: any) {
      alert(err.message || 'Error al obtener código QR');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user || !user.roles.includes('ADMIN')) {
    return (
      <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold">Acceso Administrativo Requerido</h2>
        <p className="text-sm text-stone-400 mt-2 max-w-sm">
          Debes iniciar sesión con rol ADMIN en el portal de personal para acceder a la gestión de menú, mesas y reportes.
        </p>
        <Link
          href="/staff"
          className="mt-4 px-6 py-3 bg-amber-500 text-stone-950 font-bold rounded-xl text-sm"
        >
          Ir al Login de Personal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white font-sans safe-bottom">
      {/* Hidden file input with mobile camera capture support */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-stone-900 border-b border-stone-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black">
              A
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white">Panel Administrativo</h1>
              <p className="text-[11px] text-stone-400">Restaurante Demo · Colombia</p>
            </div>
          </div>
          <Link
            href="/staff"
            className="text-xs font-semibold px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-amber-400 border border-stone-700"
          >
            Volver a Operaciones
          </Link>
        </div>

        {/* Tab Pills */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
          <button
            onClick={() => setTab('metrics')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tab === 'metrics' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
            }`}
          >
            📊 Resumen de Ventas
          </button>
          <button
            onClick={() => setTab('menu')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tab === 'menu' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
            }`}
          >
            🍔 Menú & Platos
          </button>
          <button
            onClick={() => setTab('tables')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tab === 'tables' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
            }`}
          >
            🪑 Mesas & Códigos QR
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              tab === 'history' ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-300'
            }`}
          >
            🧾 Historial Pedidos
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: METRICS */}
        {tab === 'metrics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-black text-white">Métricas y Ventas del Día</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
                <span className="text-xs text-stone-400">Total Pedidos</span>
                <div className="text-2xl font-black text-white mt-1">
                  {salesSummary?.totalOrders ?? 0}
                </div>
              </div>
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
                <span className="text-xs text-stone-400">Venta Neta (Subtotal)</span>
                <div className="text-2xl font-black text-white mt-1">
                  {formatMoneyCop(salesSummary?.totalSubtotalCop ?? 0)}
                </div>
              </div>
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
                <span className="text-xs text-stone-400">Impuestos (INC/IVA)</span>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {formatMoneyCop(salesSummary?.totalTaxCop ?? 0)}
                </div>
              </div>
              <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
                <span className="text-xs text-stone-400">Propinas Recaudadas</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {formatMoneyCop(salesSummary?.totalTipCop ?? 0)}
                </div>
              </div>
            </div>

            <div className="p-5 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-stone-400 uppercase font-bold tracking-wider">
                  Ingreso Total Facturado
                </span>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {formatMoneyCop(salesSummary?.totalRevenueCop ?? 0)}
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-full text-xs font-bold">
                Cierre Automático Diario
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: MENU & ITEMS */}
        {tab === 'menu' && (
          <div className="space-y-6">
            {/* Create Category Form */}
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-3">Categorías de Menú</h3>
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría (ej. Bebidas Artesanales)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </form>

              <div className="flex flex-wrap gap-2 mt-3">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                      selectedCatId === c.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-stone-800 border-stone-700 text-stone-300'
                    }`}
                    onClick={() => setSelectedCatId(c.id)}
                  >
                    <span>
                      {c.name} ({c.items?.length || 0})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(c.id);
                      }}
                      className="text-stone-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Menu Item Form */}
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-3">
                Agregar Nuevo Plato a la Categoría Seleccionada
              </h3>
              <form onSubmit={handleCreateItem} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-stone-400">Nombre del Plato</label>
                    <input
                      type="text"
                      placeholder="ej. Bandeja Paisa Especial"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-stone-400">Precio en COP (Entero)</label>
                    <input
                      type="number"
                      placeholder="35000"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      required
                      className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-stone-400">Descripción & Ingredientes</label>
                  <textarea
                    placeholder="Descripción detallada del plato para el menú del cliente"
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingItem}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition-all"
                >
                  {creatingItem ? 'Creando...' : 'Guardar Plato en Menú'}
                </button>
              </form>
            </div>

            {/* List of Items in Selected Category */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3">
                Platos Registrados ({categories.find((c) => c.id === selectedCatId)?.items?.length || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categories
                  .find((c) => c.id === selectedCatId)
                  ?.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-white text-base leading-tight">
                              {item.name}
                            </h4>
                            <span className="text-emerald-400 font-bold text-sm">
                              {formatMoneyCop(item.basePriceCop)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.isAvailable
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {item.isAvailable ? 'Disponible' : 'Agotado'}
                          </button>
                        </div>
                        <p className="text-xs text-stone-400 mt-2 line-clamp-2">{item.description}</p>

                        {/* Image Thumbnails */}
                        {item.images && item.images.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                            {item.images.map((img: any) => (
                              <img
                                key={img.id}
                                src={img.thumbnailUrl || img.url}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover border border-stone-700"
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-800">
                        <button
                          type="button"
                          onClick={() => handleUploadClick(item.id)}
                          className="flex-1 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          <span>Subir Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TABLES & QR */}
        {tab === 'tables' && (
          <div className="space-y-6">
            <div className="p-4 bg-stone-900 border border-stone-800 rounded-2xl">
              <h3 className="text-sm font-bold text-white mb-3">Registrar Nueva Mesa</h3>
              <form onSubmit={handleCreateTable} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="number"
                  placeholder="Número (ej. 5)"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  required
                  className="px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="Etiqueta (ej. Mesa 5 Terraza)"
                  value={newTableLabel}
                  onChange={(e) => setNewTableLabel(e.target.value)}
                  className="px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-sm text-white"
                />
                <button
                  type="submit"
                  className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm"
                >
                  Crear Mesa & Generar QR
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-white">Mesa {t.number}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                        {t.zone || 'Principal'}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{t.label}</div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-3 border-t border-stone-800">
                    <button
                      onClick={() => handleViewQr(t.id)}
                      className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-amber-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Ver Código QR</span>
                    </button>
                    <a
                      href={`/m/${t.qrToken}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl"
                      title="Probar vista cliente"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* QR Modal preview */}
            {selectedQr && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4">
                  <h3 className="text-lg font-black text-white">
                    Código QR - Mesa {selectedQr.tableNumber}
                  </h3>
                  <div className="bg-white p-4 rounded-2xl inline-block shadow-lg">
                    <img
                      src={selectedQr.dataUrl}
                      alt={`QR Mesa ${selectedQr.tableNumber}`}
                      className="w-56 h-56 mx-auto"
                    />
                  </div>
                  <p className="text-xs text-stone-400 break-all">{selectedQr.targetUrl}</p>
                  <div className="flex gap-2">
                    <a
                      href={selectedQr.dataUrl}
                      download={`qr-mesa-${selectedQr.tableNumber}.png`}
                      className="flex-1 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      Descargar PNG
                    </a>
                    <button
                      onClick={() => setSelectedQr(null)}
                      className="py-2.5 px-4 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ORDER HISTORY */}
        {tab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">Historial de Pedidos Recientes</h2>
            <div className="space-y-3">
              {orderHistory.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 bg-stone-900 border border-stone-800 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Mesa {ord.table?.number || '?'} · #{ord.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono">
                        {ord.status}
                      </span>
                    </div>
                    <div className="text-stone-400 mt-1">
                      {new Date(ord.createdAt).toLocaleString()} · Mesero:{' '}
                      {ord.waiter?.fullName || 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-400 text-sm">
                      {formatMoneyCop(ord.totalCop)}
                    </div>
                    <span className="text-stone-500 text-[11px]">{ord.paymentStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
