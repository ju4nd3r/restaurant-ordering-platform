'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  resolveTable,
  fetchMenuCategories,
  TableResolutionResponse,
  CategoryWithItems,
  MenuItem,
} from '../../../lib/api';
import { useCartStore } from '../../../lib/store/cart-store';
import { MenuHeader } from '../../../components/menu/menu-header';
import { CategoryTabs } from '../../../components/menu/category-tabs';
import { SearchFilterBar } from '../../../components/menu/search-filter-bar';
import { DishCard } from '../../../components/menu/dish-card';
import { DishDetailSheet } from '../../../components/menu/dish-detail-sheet';
import { BottomNav, ActiveTab } from '../../../components/navigation/bottom-nav';
import { Utensils, AlertCircle, RefreshCw } from 'lucide-react';
import { CartSheet } from '../../../components/cart/cart-sheet';
import { OrderTracker } from '../../../components/orders/order-tracker';
import { PaymentSheet } from '../../../components/payments/payment-sheet';
import { BillSplitSheet } from '../../../components/payments/bill-split-sheet';
import { PaymentCallbackModal } from '../../../components/payments/payment-callback-modal';
import { OrderDTO } from '../../../lib/api';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function TableMenuPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;

  // Selected dish for detail bottom sheet
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);

  // Cart bottom sheet open state
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietaryFlag, setSelectedDietaryFlag] = useState<string | null>(null);

  // Active navigation tab ('menu' | 'orders' | 'cart')
  const [activeTab, setActiveTab] = useState<ActiveTab>('menu');

  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  // Payment & Bill Split state
  const [paymentOrder, setPaymentOrder] = useState<OrderDTO | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [splitOrder, setSplitOrder] = useState<OrderDTO | null>(null);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [callbackModal, setCallbackModal] = useState<{
    isOpen: boolean;
    orderId?: string | null;
    reference?: string | null;
  }>({ isOpen: false });

  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'callback') {
      const orderId = searchParams.get('orderId');
      const ref = searchParams.get('ref');
      setCallbackModal({
        isOpen: true,
        orderId,
        reference: ref,
      });
      setActiveTab('orders');
    }
  }, [searchParams]);

  const setTableContext = useCartStore((state) => state.setTableContext);

  // 1. Resolve Table & Session
  const {
    data: tableData,
    isLoading: isTableLoading,
    error: tableError,
    refetch: refetchTable,
  } = useQuery<TableResolutionResponse>({
    queryKey: ['table', token],
    queryFn: () => resolveTable(token),
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Menu Categories & Items
  const {
    data: categoriesData,
    isLoading: isMenuLoading,
    error: menuError,
    refetch: refetchMenu,
  } = useQuery<CategoryWithItems[]>({
    queryKey: ['menu', tableData?.restaurant.id],
    queryFn: () => fetchMenuCategories(tableData?.restaurant.id),
    enabled: !!tableData?.restaurant.id,
    staleTime: 60 * 1000,
  });

  // Sync table context into Zustand store once resolved
  useEffect(() => {
    if (tableData) {
      setTableContext({
        qrToken: token,
        tableId: tableData.table.id,
        tableNumber: tableData.table.number,
        tableLabel: tableData.table.label,
        tableZone: tableData.table.zone,
        sessionId: tableData.session.id,
        sessionToken: tableData.session.sessionToken,
        restaurantId: tableData.restaurant.id,
        restaurantName: tableData.restaurant.name,
        taxPercentage: tableData.restaurant.taxPercentage,
        defaultTipPercentage: tableData.restaurant.defaultTipPercentage,
        waiterName: tableData.table.assignedWaiter?.fullName,
      });
    }
  }, [tableData, token, setTableContext]);

  // Set initial active category
  useEffect(() => {
    if (categoriesData && categoriesData.length > 0 && !activeCategoryId) {
      const firstCat = categoriesData[0];
      if (firstCat) {
        setActiveCategoryId(firstCat.id);
      }
    }
  }, [categoriesData, activeCategoryId]);

  // Filtered categories and dishes
  const filteredCategories = useMemo(() => {
    if (!categoriesData) return [];

    return categoriesData
      .map((category) => {
        const filteredItems = category.items.filter((item) => {
          // Dietary filter
          if (selectedDietaryFlag && !item.dietaryFlags.includes(selectedDietaryFlag)) {
            return false;
          }

          // Search query filter
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const matchesName = item.name.toLowerCase().includes(query);
            const matchesDesc = item.description.toLowerCase().includes(query);
            const matchesIng = item.ingredients.some((ing) => ing.toLowerCase().includes(query));
            return matchesName || matchesDesc || matchesIng;
          }

          return true;
        });

        return {
          ...category,
          items: filteredItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categoriesData, searchQuery, selectedDietaryFlag]);

  // Handle smooth scroll when category tab clicked
  const handleSelectCategory = (catId: string) => {
    setActiveCategoryId(catId);
    const element = document.getElementById(`cat-${catId}`);
    if (element) {
      const offset = 145; // Sticky header + tabs height
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Loading State
  if (isTableLoading || (isMenuLoading && !categoriesData)) {
    return (
      <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center animate-bounce shadow-lg shadow-amber-500/30 mb-4">
          <Utensils className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-base font-bold text-stone-800">Cargando menú de la mesa...</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-xs">
          Conectando de forma segura con la cocina y el restaurante.
        </p>
      </main>
    );
  }

  // Error State: Invalid or inactive table
  if (tableError || !tableData) {
    return (
      <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-100 rounded-3xl flex items-center justify-center text-rose-600 mb-4 border border-rose-200">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-lg font-black text-stone-900 tracking-tight">
          Mesa no encontrada o inactiva
        </h1>
        <p className="text-xs text-stone-600 mt-2 leading-relaxed">
          {tableError ? (tableError as Error).message : 'El código QR escaneado no es válido.'}
        </p>
        <div className="mt-6 flex flex-col gap-3 w-full">
          <button
            onClick={() => refetchTable()}
            className="w-full bg-stone-900 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 touch-target"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar conexión
          </button>
          <Link
            href="/"
            className="w-full bg-white border border-stone-200 text-stone-700 font-semibold py-3 px-4 rounded-xl text-xs touch-target"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-28 max-w-lg mx-auto relative shadow-xl shadow-stone-900/5">
      {/* 1. Restaurant & Table Header */}
      <MenuHeader
        tableContext={{
          qrToken: token,
          tableId: tableData.table.id,
          tableNumber: tableData.table.number,
          tableLabel: tableData.table.label,
          tableZone: tableData.table.zone,
          sessionId: tableData.session.id,
          sessionToken: tableData.session.sessionToken,
          restaurantId: tableData.restaurant.id,
          restaurantName: tableData.restaurant.name,
          taxPercentage: tableData.restaurant.taxPercentage,
          defaultTipPercentage: tableData.restaurant.defaultTipPercentage,
          waiterName: tableData.table.assignedWaiter?.fullName,
        }}
      />

      {/* Main View Router based on activeTab */}
      {activeTab === 'orders' ? (
        <OrderTracker
          tableSessionId={tableData.session.id}
          tableNumber={tableData.table.number}
          restaurantName={tableData.restaurant.name}
          onOrderMore={() => setActiveTab('menu')}
          onGoToBill={() => setIsCartOpen(true)}
          onPayOrder={(order) => {
            setPaymentOrder(order);
            setIsPaymentOpen(true);
          }}
          onSplitOrder={(order) => {
            setSplitOrder(order);
            setIsSplitOpen(true);
          }}
        />
      ) : (
        <>
          {/* 2. Sticky Category Tabs */}
          {categoriesData && categoriesData.length > 0 && (
            <CategoryTabs
              categories={categoriesData}
              activeCategoryId={activeCategoryId}
              onSelectCategory={handleSelectCategory}
            />
          )}

          {/* 3. Search & Dietary Filter Bar */}
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDietaryFlag={selectedDietaryFlag}
            onSelectDietaryFlag={setSelectedDietaryFlag}
          />

          {/* 4. Menu Dishes Content */}
          <main className="px-4 pt-4 space-y-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200/80 my-4">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-stone-800">No se encontraron platos</h3>
                <p className="text-xs text-stone-500 mt-1">
                  Prueba cambiando los filtros dietéticos o el término de búsqueda.
                </p>
                {(searchQuery || selectedDietaryFlag) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDietaryFlag(null);
                    }}
                    className="mt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 underline touch-target"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              filteredCategories.map((category, catIndex) => (
                <section
                  key={category.id}
                  id={`cat-${category.id}`}
                  className="scroll-mt-36"
                >
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="text-base font-black text-stone-900 tracking-tight">
                      {category.name}
                    </h2>
                    <span className="text-[11px] font-semibold text-stone-400">
                      {category.items.length} opciones
                    </span>
                  </div>

                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <DishCard
                        key={item.id}
                        item={item}
                        onSelect={(dish) => setSelectedDish(dish)}
                        isLcpCandidate={catIndex === 0 && itemIndex === 0}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </>
      )}

      {/* 5. Dish Detail Bottom Sheet */}
      <DishDetailSheet
        item={selectedDish}
        isOpen={!!selectedDish}
        onClose={() => setSelectedDish(null)}
      />

      {/* 6. Cart Review Sheet */}
      <CartSheet
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOrderCreated={() => {
          setIsCartOpen(false);
          setActiveTab('orders');
        }}
      />

      {/* 7. Fixed Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'cart') {
            setIsCartOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* 8. Payment Sheet */}
      <PaymentSheet
        order={paymentOrder}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onOpenSplit={() => {
          setSplitOrder(paymentOrder);
          setIsSplitOpen(true);
        }}
      />

      {/* 9. Bill Split Sheet */}
      <BillSplitSheet
        order={splitOrder}
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
      />

      {/* 10. Payment Return Callback Modal */}
      {callbackModal.isOpen && (
        <PaymentCallbackModal
          orderId={callbackModal.orderId}
          reference={callbackModal.reference}
          onClose={() => setCallbackModal({ isOpen: false })}
          onPaymentConfirmed={() => {
            // Refetch orders
            setActiveTab('orders');
          }}
        />
      )}
    </div>
  );
}
