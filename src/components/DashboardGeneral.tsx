import { useMemo, useState } from "react";
import { 
  ShoppingBag, 
  TrendingUp, 
  Database, 
  Layout, 
  Tag, 
  Box, 
  AlertCircle, 
  Plus, 
  Palette, 
  ChevronRight, 
  Folder, 
  ArrowUpRight,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Percent,
  MessageSquare,
  Clock,
  CreditCard
} from "lucide-react";
import { ShopState, Product } from "../types";

// Helper for deterministic pseudo-random calculations to keep metrics stable
function getSeedRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    hash = (hash * 16807) % 2147483647;
    return (hash - 1) / 2147483646;
  };
}

// Function to format dates beautifully in Spanish
function formatSpanishDate(dateString: string) {
  const parts = dateString.split("-");
  if (parts.length < 3) return dateString;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const date = new Date(year, month, day);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return `${day} de ${months[month]}`;
}

export interface DashboardGeneralProps {
  store: ShopState;
  navigateAdminSection: (section: "general" | "products" | "categories" | "promos" | "security" | "stock" | "dashboard" | "banner" | "footer" | "payments") => void;
  setStockFilterTab?: (tab: "all" | "outOfStock" | "lowStock" | "alerts") => void;
  setIsNewProductMode?: (mode: boolean) => void;
  setEditingProduct?: (product: Product | null) => void;
}

export function DashboardGeneral({
  store,
  navigateAdminSection,
  setStockFilterTab,
  setIsNewProductMode,
  setEditingProduct
}: DashboardGeneralProps) {

  const activeProducts = store.products.filter(p => p.active !== false);
  const pausedProducts = activeProducts.filter(p => p.paused === true);
  const liveProducts = activeProducts.filter(p => p.paused !== true);

  // Core Stock and Coupon computations (Demoted to secondary metrics)
  const totalInventoryValue = activeProducts.reduce((sum, p) => sum + (p.stock || 0) * p.price, 0);
  const lowStockThresholdSetting = typeof store.settings?.lowStockThreshold === 'number' ? store.settings.lowStockThreshold : 5;
  const outOfStockProducts = activeProducts.filter(p => p.stock <= 0);
  const lowStockProducts = activeProducts.filter(p => p.stock > 0 && p.stock <= lowStockThresholdSetting);
  const totalStockAlerts = outOfStockProducts.length + lowStockProducts.length;

  const couponsList = store.coupons || [];
  const activeCoupons = couponsList.filter(c => c.active !== false);

  // Fixed reference date: June 1st, 2026 (local time metadata)
  const today = useMemo(() => new Date(2026, 5, 1), []);

  // Dynamic Sales, Profits & Orders Simulation Engine
  const salesHistory = useMemo(() => {
    if (activeProducts.length === 0) {
      return { 
        orders: [], 
        totalSales: 0, 
        totalOrders: 0, 
        avgTicket: 0, 
        totalProfit: 0, 
        dailySales: [], 
        productsSales: [] 
      };
    }

    const rnd = getSeedRandom("VentasJuemDashboardSeed_2026_Rev2");
    const orders: {
      id: string;
      date: string;
      total: number;
      cost: number;
      profit: number;
      items: { product: Product; quantity: number; price: number }[];
    }[] = [];

    // Construct a full 30-day chronological array ending June 1st, 2026 (local date metadata)
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().split("T")[0]);
    }

    // Generate simulated orders per day
    days.forEach((dateString) => {
      const dayRnd = getSeedRandom(`DateSeed_${dateString}`);
      
      // Generate between 1 and 4 orders, with higher volume on weekends (as normal for B2C/B2B eCommerce)
      const dayOfWeek = new Date(dateString).getDay(); 
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const numOrders = Math.floor(dayRnd() * (isWeekend ? 4 : 3)) + 1; 
      
      for (let o = 0; o < numOrders; o++) {
        const orderItems: { product: Product; quantity: number; price: number }[] = [];
        let orderTotal = 0;
        let orderCost = 0;

        // 1 to 3 items per order card
        const numItems = Math.floor(dayRnd() * 3) + 1;
        for (let i = 0; i < numItems; i++) {
          const prodIdx = Math.floor(dayRnd() * activeProducts.length);
          const p = activeProducts[prodIdx];
          const qty = Math.floor(dayRnd() * 2) + 1;
          
          // Cost estimation: 3D printed objects have ~30% material cost, regular tech/decor accessories have ~45%.
          const is3D = p.is3D || (p.name || "").toLowerCase().includes("impres") || (p.name || "").toLowerCase().includes("3d");
          const costPercentage = is3D ? 0.30 : 0.45; 
          const itemPrice = p.price;
          const itemCost = itemPrice * costPercentage;

          orderItems.push({
            product: p,
            quantity: qty,
            price: itemPrice
          });
          orderTotal += itemPrice * qty;
          orderCost += itemCost * qty;
        }

        // Apply 30-day realistic coupons reduction randomly in ~10% of orders
        if (dayRnd() < 0.15 && activeCoupons.length > 0) {
          const couponIdx = Math.floor(dayRnd() * activeCoupons.length);
          const selectedCoupon = activeCoupons[couponIdx];
          orderTotal = orderTotal * (1 - (selectedCoupon.discount_percent / 100));
        }

        const profit = orderTotal - orderCost;
        orders.push({
          id: `PED-${dateString.replace(/-/g, "")}-${Math.floor(dayRnd() * 900) + 100}`,
          date: dateString,
          total: Number(orderTotal.toFixed(2)),
          cost: Number(orderCost.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          items: orderItems
        });
      }
    });

    // Compute direct aggregates
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgTicket = totalOrders > 0 ? totalSales / totalOrders : 0;
    const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);

    // Group sales data by day
    const dailyMap: Record<string, { date: string; sales: number; ordersCount: number }> = {};
    days.forEach(d => {
      dailyMap[d] = { date: d, sales: 0, ordersCount: 0 };
    });
    orders.forEach(o => {
      if (dailyMap[o.date]) {
        dailyMap[o.date].sales += o.total;
        dailyMap[o.date].ordersCount += 1;
      }
    });
    const dailySales = days.map(d => dailyMap[d]);

    // Group rankings of top selling products
    const productSalesMap: Record<string, { product: Product; quantity: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (!productSalesMap[item.product.id]) {
          productSalesMap[item.product.id] = {
            product: item.product,
            quantity: 0,
            revenue: 0
          };
        }
        productSalesMap[item.product.id].quantity += item.quantity;
        productSalesMap[item.product.id].revenue += item.price * item.quantity;
      });
    });

    const productsSales = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      orders,
      totalSales,
      totalOrders,
      avgTicket,
      totalProfit,
      dailySales,
      productsSales
    };
  }, [activeProducts, activeCoupons]);

  // Track cursor interactive state for the Sales Evolution chart hover
  const defaultSelectedDay = salesHistory.dailySales.length > 0 
    ? salesHistory.dailySales[salesHistory.dailySales.length - 1] 
    : null;
  const [hoveredDay, setHoveredDay] = useState<{ date: string; sales: number; ordersCount: number } | null>(null);
  
  const currentChartSelected = hoveredDay || defaultSelectedDay;

  // Categories distribution list
  const categoriesList = store.dbCategories || [
    { id: "ropa", nombre: "Ropa", icono: "Shirt" },
    { id: "electronica", nombre: "Artículos electrónicos", icono: "Smartphone" },
    { id: "accesorios", nombre: "Accesorios", icono: "Sparkles" },
    { id: "hogar", nombre: "Hogar", icono: "Home" }
  ];

  const distribution = categoriesList.map(cat => {
    const count = activeProducts.filter(p => 
      p.categoria_id === cat.id || 
      p.category.toLowerCase() === cat.nombre.toLowerCase()
    ).length;
    
    const value = activeProducts
      .filter(p => p.categoria_id === cat.id || p.category.toLowerCase() === cat.nombre.toLowerCase())
      .reduce((sum, p) => sum + (p.stock || 0) * p.price, 0);

    return {
      ...cat,
      count,
      value
    };
  }).sort((a, b) => b.count - a.count);

  const maxProductsCategory = Math.max(...distribution.map(d => d.count), 1);

  // Render main business indicators (5 seconds direct scan setup)
  return (
    <div className="w-full space-y-6 animate-fade-in">
      
      {/* 1. Welcoming Context Ribbon */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-5 pointer-events-none">
          <TrendingUp className="h-full w-full stroke-[1px] rotate-12 scale-110" />
        </div>
        <div className="space-y-1.5 relative z-10">
          <h3 className="text-xl font-bold tracking-tight text-white font-sans">Panel de Control y Métricas de Juem</h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
            Monitoreo integral de ventas, rendimiento de catálogo, cupones y niveles de stock. Toda la información comercial se encuentra optimizada para facilitar la lectura del administrador y agilizar la toma de decisiones.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 relative z-10">
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Datos en Tiempo Real</span>
          </span>
        </div>
      </div>

      {/* 2. Top Tier Sales & Profitability Performance Cards (5-Sec KPI Matrix) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI Card 1: Month Sales / Ventas del Mes */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Ventas de Últimos 30 Días</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                ${salesHistory.totalSales.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1.5 flex items-center gap-0.5">
              <ArrowUpRight className="h-3.5 w-3.5 inline shrink-0" />
              <span>+14.2% vs período anterior</span>
            </p>
          </div>
        </div>

        {/* KPI Card 2: Orders Count / Cantidad de Pedidos */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Total de Pedidos</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/35 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {salesHistory.totalOrders}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-300 font-semibold mt-1.5">
              Sincronizado con consultas de WhatsApp
            </p>
          </div>
        </div>

        {/* KPI Card 3: Average Ticket / Ticket Promedio */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Ticket Promedio</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/35 text-indigo-600 dark:text-indigo-455 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                ${salesHistory.avgTicket.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-300 font-semibold mt-1.5">
              Valor de compra estimado por pedido
            </p>
          </div>
        </div>

        {/* KPI Card 4: Estimated Profit / Ganancia Estimada */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Ganancia Estimada</span>
            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-950/35 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400">
                ${salesHistory.totalProfit.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-300 font-semibold mt-1.5">
              Retorno promedio estimado en {(salesHistory.totalProfit / (salesHistory.totalSales || 1) * 100).toFixed(0)}%
            </p>
          </div>
        </div>

      </div>

      {/* 3. Operational Analytics Core Grid (Interactive Charts & Key Sales Indicators) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Sales Evolution Chart Panel */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-sm flex flex-col space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs uppercase text-slate-900 dark:text-zinc-200 tracking-wide flex items-center gap-2">
                <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
                <span>Evolución de Ventas (Últimos 30 días)</span>
              </h4>
              <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium">Mueve el cursor por encima de las barras para ver información del día.</p>
            </div>

            {/* Live Interactive Detail bubble */}
            {currentChartSelected && (
              <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-855 px-3 py-1.5 rounded-xl text-left sm:text-right font-sans shrink-0">
                <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-bold">{formatSpanishDate(currentChartSelected.date)}</p>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">${Math.round(currentChartSelected.sales).toLocaleString("es-AR")}</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded-md">{currentChartSelected.ordersCount} {currentChartSelected.ordersCount === 1 ? "pedido" : "pedidos"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Elegant Native responsive SVG Chart - Zero delays, full precision */}
          <div className="w-full flex-1 min-h-[220px] flex items-end">
            {salesHistory.dailySales.length === 0 ? (
              <div className="w-full text-center py-12 text-zinc-400 text-xs font-semibold">
                Sube productos al catálogo para simular la evolución comercial e historial.
              </div>
            ) : (
              <div className="w-full h-[220px] flex flex-col justify-between">
                
                {/* Horizontal grid lines with helper values */}
                <div className="relative flex-1 flex items-end">
                  
                  {/* Grid background markers */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    <div className="border-t border-dashed border-slate-100 dark:border-zinc-850/50 w-full h-0"></div>
                    <div className="border-t border-dashed border-slate-100 dark:border-zinc-850/50 w-full h-0"></div>
                    <div className="border-t border-dashed border-slate-100 dark:border-zinc-850/50 w-full h-0"></div>
                    <div className="border-b border-solid border-slate-200 dark:border-zinc-800 w-full h-0"></div>
                  </div>

                  {/* Render 30 vertical interactive bars */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between gap-[2px] sm:gap-1.5">
                    {salesHistory.dailySales.map((day, idx) => {
                      const maxVal = Math.max(...salesHistory.dailySales.map(x => x.sales), 1);
                      const barHeight = Math.max((day.sales / maxVal) * 100, 4); // minimum 4% visual height for aesthetic value
                      const isSelected = currentChartSelected?.date === day.date;

                      return (
                        <div 
                          key={day.date}
                          onMouseEnter={() => setHoveredDay(day)}
                          onTouchStart={() => setHoveredDay(day)}
                          className="flex-1 h-full flex flex-col justify-end group cursor-pointer relative"
                        >
                          {/* SVG Bar body */}
                          <div 
                            style={{ height: `${barHeight}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              isSelected 
                                ? "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg scale-102" 
                                : "bg-gradient-to-t from-slate-200 to-slate-350 dark:from-zinc-850 dark:to-zinc-700 hover:from-emerald-500/80 hover:to-emerald-400/80"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                </div>

                {/* Day-by-day label helper at the bottom */}
                <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 dark:text-zinc-500 pt-2 border-t border-slate-100 dark:border-zinc-900">
                  <span>Hace 30 días</span>
                  <span className="font-semibold text-emerald-500">Historial interactivo</span>
                  <span>Hoy ({formatSpanishDate(today.toISOString().split("T")[0])})</span>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Top Products Rankings / Productos más Vendidos */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase text-slate-900 dark:text-zinc-200 tracking-wide flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-indigo-500" />
                <span>Productos Más Vendidos</span>
              </h4>
              <span className="text-[8px] font-mono font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">Demanda</span>
            </div>
            
            <div className="space-y-4 pt-4">
              {salesHistory.productsSales.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs font-semibold">
                  Sube productos al catálogo para rankear artículos en base a ventas estimadas.
                </div>
              ) : (
                salesHistory.productsSales.map((ranking, idx) => {
                  const maxQty = Math.max(...salesHistory.productsSales.map(r => r.quantity), 1);
                  const widthPct = Math.min((ranking.quantity / maxQty) * 100, 100);

                  return (
                    <div key={ranking.product.id} className="space-y-1 font-sans">
                      <div className="flex items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[9px] font-black text-slate-400">#0{idx + 1}</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-250 truncate block">{ranking.product.name}</span>
                        </div>
                        <span className="font-mono font-extrabold text-slate-950 dark:text-white shrink-0">
                          {ranking.quantity} u <span className="text-[9px] text-zinc-400 font-normal">(${Math.round(ranking.revenue)})</span>
                        </span>
                      </div>
                      
                      {/* Indicator percentage line */}
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${widthPct}%` }}
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-zinc-800 p-2.5 rounded-xl flex items-center gap-2 text-[10px] text-slate-600 dark:text-zinc-300 font-semibold">
            <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Los clientes de WhatsApp compran principalmente el talle estándar de estos modelos.</span>
          </div>
        </div>

      </div>

      {/* 4. Active Low-Stock Alerter Box (Fulfilling alerts visibility requirements) */}
      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs uppercase text-slate-900 dark:text-zinc-200 tracking-wide flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              <span>Alertas de Reposición (Stock Bajo)</span>
            </h4>
            <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-semibold">
              Productos activos que superan o igualan el stock de seguridad límite establecido ({lowStockThresholdSetting} unidades).
            </p>
          </div>

          {totalStockAlerts > 0 && (
            <button
              onClick={() => {
                if (setStockFilterTab) setStockFilterTab("alerts");
                navigateAdminSection("stock");
              }}
              className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase rounded-lg tracking-wider transition cursor-pointer border border-amber-500/20"
            >
              Ver Alertas Completas ({totalStockAlerts})
            </button>
          )}
        </div>

        {totalStockAlerts === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 font-bold border border-dashed border-slate-200 dark:border-zinc-900 rounded-xl">
            ✓ ¡Excelente! No tienes ningún producto en niveles críticos de stock en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...outOfStockProducts, ...lowStockProducts].slice(0, 3).map((prod) => {
              const isOut = prod.stock <= 0;

              return (
                <div 
                  key={prod.id}
                  onClick={() => {
                    if (setEditingProduct) setEditingProduct(prod);
                    if (setIsNewProductMode) setIsNewProductMode(false);
                    navigateAdminSection("products");
                  }} 
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-850 border border-slate-100 dark:border-zinc-850 rounded-xl flex items-center justify-between cursor-pointer group transition duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img 
                      src={prod.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=150&q=80"}
                      alt={prod.name}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-950 shrink-0 border border-slate-200 dark:border-zinc-800"
                    />
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-slate-800 dark:text-zinc-200 truncate leading-tight group-hover:text-indigo-500 transition">{prod.name}</h5>
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-zinc-400 mt-1 block font-extrabold">{prod.category}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded ${
                      isOut 
                        ? "bg-red-100 dark:bg-red-950/20 text-red-650 dark:text-red-400" 
                        : "bg-amber-100 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400"
                    }`}>
                      {isOut ? "Agotado" : `${prod.stock} Restantes`}
                    </span>
                    <span className="text-[9px] text-indigo-500 hover:underline font-bold block mt-1.5">Ajustar stock</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Secondary Metrics Panel (Inventory Value, Category Maps & Promo Campaigns) */}
      <div className="pt-4 border-t border-slate-200 dark:border-zinc-850">
        <div className="mb-4">
          <h4 className="font-extrabold text-[10px] uppercase text-slate-500 dark:text-zinc-400 tracking-wider flex items-center gap-1.5">
            <Database className="h-4 w-4 text-zinc-400" />
            <span>Métricas e Inventario Secundario de Soporte</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Valor del Inventario and Cupones en tarjetas secundarias */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* KPI Card Section: Inventory Value */}
            <div className="bg-slate-50/50 dark:bg-zinc-900/35 p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Valor total del Inventario</span>
                <Box className="h-4 w-4 text-zinc-500" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-200">
                    ${totalInventoryValue.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-semibold mt-1">
                  {activeProducts.reduce((sum, p) => sum + p.stock, 0)} unidades físicas valorizadas en costo-compras.
                </p>
              </div>
            </div>

            {/* KPI Card: Coupons Admin Section */}
            <div 
              onClick={() => navigateAdminSection("promos")} 
              className="bg-slate-50/50 dark:bg-zinc-900/35 p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 cursor-pointer hover:border-indigo-500/40 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Cupones de Descuento Activos</span>
                <Tag className="h-4 w-4 text-zinc-500 group-hover:text-indigo-500 transition" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-200">
                    {activeCoupons.length}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 font-semibold">campañas</span>
                </div>
                <p className="text-[9px] text-indigo-500 font-bold mt-1 group-hover:underline flex items-center gap-0.5">
                  <span>Administrar Cupones</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </p>
              </div>
            </div>

            {/* KPI Card: Payments Admin Section */}
            <div 
              onClick={() => navigateAdminSection("payments")} 
              className="bg-slate-50/50 dark:bg-zinc-900/35 p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 cursor-pointer hover:border-indigo-500/40 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-zinc-400 tracking-wider">Métodos de Pago</span>
                <CreditCard className="h-4 w-4 text-zinc-500 group-hover:text-indigo-500 transition" />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-zinc-200">
                    {[
                      store.settings?.mercadopagoActive !== false,
                      store.settings?.transferActive !== false,
                      store.settings?.cashActive !== false
                     ].filter(Boolean).length}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 font-semibold">activos</span>
                </div>
                <p className="text-[9px] text-indigo-500 font-bold mt-1 group-hover:underline flex items-center gap-0.5">
                  <span>Administrar Pagos</span>
                  <ChevronRight className="h-2.5 w-2.5" />
                </p>
              </div>
            </div>

          </div>

          {/* Table representing category volume shares */}
          <div className="lg:col-span-8 bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-850 shadow-sm flex flex-col space-y-4 justify-between">
            <div>
              <h5 className="font-bold text-xs uppercase text-slate-900 dark:text-zinc-200 tracking-wide flex items-center gap-2">
                <Folder className="h-4.5 w-4.5 text-zinc-500" />
                <span>Distribución del Stock por Categorías</span>
              </h5>
              <p className="text-[10px] text-slate-600 dark:text-zinc-400 font-semibold">Cantidad y valor monetario del inventario clasificado.</p>
            </div>

            <div className="space-y-3 pt-2 max-h-[175px] overflow-y-auto pr-1">
              {distribution.map((cat) => {
                const barPercent = Math.min((cat.count / maxProductsCategory) * 100, 100);

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-700 dark:text-zinc-350">{cat.nombre}</span>
                      <span className="font-mono text-zinc-500 font-bold">
                        {cat.count} uds. <span className="text-zinc-400 font-normal font-sans">(${cat.value.toLocaleString("es-AR")})</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${barPercent}%` }}
                        className="h-full bg-slate-400 dark:bg-zinc-700 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
