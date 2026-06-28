import React, { useState } from "react";
import { ShopState, Order, Product, ProductVariant } from "../types";
import { 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Phone, 
  Mail, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  DollarSign, 
  ShoppingBag,
  ExternalLink,
  Tag as TagIcon,
  Trash2,
  Plus,
  X,
  Percent,
  Store,
  Filter,
  ArrowRight,
  User,
  MapPin,
  AlertCircle
} from "lucide-react";

interface DashboardOrdersProps {
  store: ShopState;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDeleteOrder: (id: string) => Promise<void>;
  onOrderCreated?: (newOrder: Order) => void;
}

export const DashboardOrders: React.FC<DashboardOrdersProps> = ({ 
  store, 
  onUpdateStatus, 
  onDeleteOrder,
  onOrderCreated 
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // New sale modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSaleCustomerName, setNewSaleCustomerName] = useState("Cliente WhatsApp / Consumidor final");
  const [newSaleCustomerEmail, setNewSaleCustomerEmail] = useState("cliente@gmail.com");
  const [newSaleCustomerPhone, setNewSaleCustomerPhone] = useState("");
  const [newSaleShippingCost, setNewSaleShippingCost] = useState<number>(0);
  const [newSaleCouponCode, setNewSaleCouponCode] = useState("");
  const [newSaleNotes, setNewSaleNotes] = useState("");
  const [newSaleDeposito, setNewSaleDeposito] = useState<"Pinamar" | "Montevideo">("Pinamar");
  const [newSaleCanal, setNewSaleCanal] = useState("WhatsApp");
  const [newSaleStatus, setNewSaleStatus] = useState<"pago_aprobado" | "pago_pendiente" | "pago_rechazado">("pago_aprobado");
  const [newSaleItems, setNewSaleItems] = useState<any[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSubmittingNewSale, setIsSubmittingNewSale] = useState(false);
  const [newSaleErrorMessage, setNewSaleErrorMessage] = useState<string | null>(null);

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState<string | null>(null);

  const orders: Order[] = store.orders || [];
  const productsList: Product[] = store.products || [];

  // Formula helper to compute cost, net profit, and shipping cost for an order
  const getOrderCostAndProfit = (order: Order, products: Product[]) => {
    let totalCost = 0;
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const prod = products.find(p => String(p.id) === String(item.productId));
        const itemCostPerUnit = prod?.precioCompra || 0;
        totalCost += (item.quantity * itemCostPerUnit);
      }
    }
    const totalPriceProducts = order.subtotal - order.discountAmount;
    const gananciaNeta = totalPriceProducts - totalCost;
    return { totalCost, gananciaNeta, totalPriceProducts };
  };

  // Metrics (computed over ALL APPROVED sales)
  const approvedOrders = orders.filter(o => o.status === "pago_aprobado");
  
  // REGISTROS (Approved sales count)
  const totalApprovedCount = approvedOrders.length;

  // TOTAL FACTURADO (Sum of sold products price = subtotal - discountAmount)
  const totalFacturado = approvedOrders.reduce((acc, o) => {
    const { totalPriceProducts } = getOrderCostAndProfit(o, productsList);
    return acc + totalPriceProducts;
  }, 0);

  // GANANCIA NETA (Sum of gananciaNeta = totalPriceProducts - productCost)
  const totalGananciaNeta = approvedOrders.reduce((acc, o) => {
    const { gananciaNeta } = getOrderCostAndProfit(o, productsList);
    return acc + gananciaNeta;
  }, 0);

  // Split calculations
  let totalFranquicia = 0;
  let totalJuem = 0;

  for (const o of approvedOrders) {
    const { totalCost, gananciaNeta, totalPriceProducts } = getOrderCostAndProfit(o, productsList);
    const isMontevideo = o.depositoOrigen === "Montevideo";
    
    if (isMontevideo) {
      // Montevideo (Franquicia): 40% of net profit + 100% of shipping cost
      totalFranquicia += (0.4 * gananciaNeta) + (o.shippingCost || 0);
      // Pinamar (JUEM): product cost + 60% of net profit
      totalJuem += totalCost + (0.6 * gananciaNeta);
    } else {
      // Pinamar (JUEM): 100% of net profit + product cost + shipping cost = totalPriceProducts + shippingCost
      totalFranquicia += 0;
      totalJuem += totalPriceProducts + (o.shippingCost || 0);
    }
  }

  // Human-readable status badges
  const getStatusLabelAndStyle = (status: string) => {
    switch (status) {
      case "pago_aprobado":
        return {
          label: "Aprobado ✓",
          colors: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
          icon: <CheckCircle className="h-3 w-3 inline mr-1" />
        };
      case "pago_pendiente":
        return {
          label: "Pendiente ⌚",
          colors: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
          icon: <Clock className="h-3 w-3 inline mr-1" />
        };
      case "pedido_iniciado":
        return {
          label: "Lead 📝",
          colors: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50",
          icon: <Clock className="h-3 w-3 inline mr-1" />
        };
      case "pago_rechazado":
        return {
          label: "Rechazado ✗",
          colors: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50",
          icon: <XCircle className="h-3 w-3 inline mr-1" />
        };
      default:
        return {
          label: status || "Registrado",
          colors: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
          icon: null
        };
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  // Autocomplete / suggestions search inside the modal
  const handleProductSearch = (query: string) => {
    setProductSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const matches: any[] = [];
    const normalizedQuery = query.toLowerCase();

    for (const prod of productsList) {
      if (prod.active === false) continue;
      
      const prodNameMatches = prod.name.toLowerCase().includes(normalizedQuery);
      const prodCodeMatches = (prod.codigo || "").toLowerCase().includes(normalizedQuery);

      if (prod.variants && prod.variants.length > 0) {
        // Search in variants
        for (const variant of prod.variants) {
          const varSkuMatches = (variant.sku || "").toLowerCase().includes(normalizedQuery);
          if (prodNameMatches || prodCodeMatches || varSkuMatches) {
            matches.push({
              product: prod,
              variant: variant,
              displayName: `${prod.name} (${variant.size} / ${variant.color})`,
              sku: variant.sku || prod.codigo,
              price: variant.price || prod.precioWeb || prod.price || 0,
              cost: prod.precioCompra || 0
            });
          }
        }
      } else {
        if (prodNameMatches || prodCodeMatches) {
          matches.push({
            product: prod,
            variant: null,
            displayName: prod.name,
            sku: prod.codigo,
            price: prod.precioWeb || prod.price || 0,
            cost: prod.precioCompra || 0
          });
        }
      }
    }

    setSearchResults(matches.slice(0, 8)); // Max 8 suggestions
  };

  // Add suggestion to transaction cart
  const handleAddProductToSale = (item: any) => {
    const isAlreadyAdded = newSaleItems.some(
      i => i.productId === item.product.id && 
           (!item.variant || i.variantId === item.variant.id)
    );

    if (isAlreadyAdded) {
      // Just increment quantity of existing item
      setNewSaleItems(prev => prev.map(i => {
        if (i.productId === item.product.id && (!item.variant || i.variantId === item.variant.id)) {
          return { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice };
        }
        return i;
      }));
    } else {
      setNewSaleItems(prev => [
        ...prev,
        {
          productId: item.product.id,
          variantId: item.variant?.id || undefined,
          productName: item.product.name,
          sku: item.sku || undefined,
          sizeSelected: item.variant?.size || undefined,
          colorSelected: item.variant?.color || undefined,
          unitPrice: item.price,
          costPrice: item.cost, // kept for preview calculation
          quantity: 1,
          totalPrice: item.price
        }
      ]);
    }

    setProductSearchQuery("");
    setSearchResults([]);
  };

  // Remove item from transaction cart
  const handleRemoveItemFromSale = (index: number) => {
    setNewSaleItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Update item price or quantity in transaction cart
  const handleUpdateSaleItem = (index: number, field: "quantity" | "unitPrice", value: number) => {
    setNewSaleItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updatedVal = Math.max(0, value);
        const updatedItem = { ...item, [field]: updatedVal };
        updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  // Dispatch sale/invoice creation
  const handleDispatchSale = async () => {
    if (newSaleItems.length === 0) {
      setNewSaleErrorMessage("Debe agregar al menos un artículo a la transacción.");
      return;
    }

    if (!newSaleCustomerName.trim() || !newSaleCustomerEmail.trim()) {
      setNewSaleErrorMessage("El nombre y el correo electrónico del cliente son obligatorios.");
      return;
    }

    setIsSubmittingNewSale(true);
    setNewSaleErrorMessage(null);

    const subtotal = newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0);
    // Discount amount calculation helper
    const discountAmount = 0; // standard manual cart discount is 0 unless coupon applied

    const payload = {
      customerName: newSaleCustomerName,
      customerEmail: newSaleCustomerEmail,
      customerPhone: newSaleCustomerPhone,
      shippingCost: newSaleShippingCost,
      couponCode: newSaleCouponCode || undefined,
      notes: newSaleNotes,
      paymentMethod: "Venta Directa",
      depositoOrigen: newSaleDeposito,
      canal: newSaleCanal,
      status: newSaleStatus, // converted server-side or immediate deduction
      items: newSaleItems.map(i => ({
        productId: i.productId,
        variantId: i.variantId,
        productName: i.productName,
        sku: i.sku,
        sizeSelected: i.sizeSelected,
        colorSelected: i.colorSelected,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        totalPrice: i.totalPrice
      }))
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Construct Order object for local React state inclusion
        const createdOrder: Order = {
          id: data.orderId || "manual-" + Math.random().toString(36).substring(2, 9),
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone || undefined,
          subtotal: subtotal,
          discountAmount: discountAmount,
          shippingCost: Number(payload.shippingCost),
          total: subtotal + Number(payload.shippingCost),
          couponCode: payload.couponCode,
          status: payload.status,
          notes: payload.notes || undefined,
          paymentMethod: payload.paymentMethod,
          depositoOrigen: payload.depositoOrigen,
          canal: payload.canal,
          createdAt: new Date().toISOString(),
          items: payload.items.map((it, idx) => ({
            id: `manual-item-${idx}`,
            productId: it.productId,
            variantId: it.variantId,
            productName: it.productName,
            sku: it.sku,
            sizeSelected: it.sizeSelected,
            colorSelected: it.colorSelected,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            totalPrice: it.totalPrice
          }))
        };

        if (onOrderCreated) {
          onOrderCreated(createdOrder);
        }

        // Reset state
        setNewSaleItems([]);
        setNewSaleCustomerPhone("");
        setNewSaleNotes("");
        setNewSaleShippingCost(0);
        setNewSaleCouponCode("");
        setIsModalOpen(false);
      } else {
        setNewSaleErrorMessage(data.message || "Error al registrar la venta en el servidor.");
      }
    } catch (err: any) {
      setNewSaleErrorMessage("Error de comunicación con el servidor. Verifique su conexión.");
    } finally {
      setIsSubmittingNewSale(false);
    }
  };

  // Filter orders according to UI dropdowns
  const filteredOrders = orders.filter(order => {
    // Search filter
    const matchesSearch = 
      (order.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerPhone || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.couponCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.canal || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "aprobado") matchesStatus = order.status === "pago_aprobado";
      else if (statusFilter === "pendiente") matchesStatus = order.status === "pago_pendiente" || order.status === "pedido_iniciado";
      else if (statusFilter === "rechazado") matchesStatus = order.status === "pago_rechazado";
    }

    // Branch filter (Sucursal)
    let matchesBranch = true;
    if (branchFilter !== "all") {
      const orderBranch = order.depositoOrigen || "Pinamar";
      matchesBranch = orderBranch.toLowerCase() === branchFilter.toLowerCase();
    }

    // Channel filter (Canal)
    let matchesChannel = true;
    if (channelFilter !== "all") {
      const orderChannel = order.canal || "Web";
      matchesChannel = orderChannel.toLowerCase() === channelFilter.toLowerCase();
    }

    return matchesSearch && matchesStatus && matchesBranch && matchesChannel;
  });

  // Pagination Logic
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Adjust page index if filters reduce item count below page threshold
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const toggleRow = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  const handleWhatsAppChat = (order: Order) => {
    const rawNum = order.customerPhone || "";
    const cleanNum = rawNum.replace(/[^0-9]/g, "");
    const textMsg = `Hola ${order.customerName}, nos contactamos de la tienda por tu pedido N° ${(order.id || "").substring(0, 6).toUpperCase()}.`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(textMsg)}`, "_blank");
  };

  // Page index helper array generator
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", safeCurrentPage, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="w-full space-y-6">
      
      {/* 5 METRIC KPI HEADER OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 - Registros */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Registros</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-lg">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 font-mono">
              {totalApprovedCount}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1">Ventas aprobadas registradas</p>
          </div>
        </div>

        {/* Metric 2 - Facturado */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Facturado</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 font-mono">
              $ {totalFacturado.toLocaleString("es-AR")}
            </h3>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">P. VENTA de artículos</p>
          </div>
        </div>

        {/* Metric 3 - Ganancia Neta */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Ganancia Neta</span>
            <div className="p-2 bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 rounded-lg">
              <Percent className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 font-mono">
              $ {totalGananciaNeta.toLocaleString("es-AR")}
            </h3>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold mt-1">Excluyendo costo de productos</p>
          </div>
        </div>

        {/* Metric 4 - Total Franquicia */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Franquicia</span>
            <div className="p-2 bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg">
              <Store className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 font-mono">
              $ {totalFranquicia.toLocaleString("es-AR")}
            </h3>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">40% Ganancia MVD + Envíos</p>
          </div>
        </div>

        {/* Metric 5 - Total Juem */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total JUEM</span>
            <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-lg">
              <Store className="h-4.5 w-4.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-zinc-50 font-mono">
              $ {totalJuem.toLocaleString("es-AR")}
            </h3>
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">Pinamar 100% + 60% MVD</p>
          </div>
        </div>

      </div>

      {/* REGISTRAR NUEVA VENTA CONTROL PANEL */}
      <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-xl">
            <Plus className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-400 uppercase tracking-wider">Registrar Nueva Venta Manual</h4>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5">Permite iniciar un registro, calcular su comisión, elegir depósito, canal de venta y actualizar existencias automáticamente.</p>
          </div>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setNewSaleItems([]);
          }}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-transform hover:scale-102 active:scale-98 shadow-md shadow-indigo-600/10 cursor-pointer flex items-center gap-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Iniciar Registro de Venta</span>
        </button>
      </div>

      {/* FILTER & CONTAINER HEADER */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        
        {/* Controls bar */}
        <div className="p-5 border-b border-slate-100 dark:border-zinc-800/80 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 bg-slate-50/50 dark:bg-zinc-900/10">
          
          {/* Status Tabs Navigation */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-extrabold"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm"
              }`}
            >
              Todos ({orders.length})
            </button>
            <button
              onClick={() => { setStatusFilter("aprobado"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "aprobado"
                  ? "bg-emerald-500 text-white font-extrabold"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm"
              }`}
            >
              ✓ Aprobados ({orders.filter(o => o.status === "pago_aprobado").length})
            </button>
            <button
              onClick={() => { setStatusFilter("pendiente"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "pendiente"
                  ? "bg-amber-500 text-zinc-950 font-extrabold"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm"
              }`}
            >
              ⌚ Pendientes ({orders.filter(o => o.status === "pago_pendiente" || o.status === "pedido_iniciado").length})
            </button>
            <button
              onClick={() => { setStatusFilter("rechazado"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "rechazado"
                  ? "bg-rose-500 text-white font-extrabold"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 shadow-sm"
              }`}
            >
              ✗ Cancelados ({orders.filter(o => o.status === "pago_rechazado").length})
            </button>
          </div>

          {/* Quick Select Dropdowns and Search */}
          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
            
            {/* Search Box */}
            <div className="relative w-full md:w-64 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cliente, ID..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white shadow-sm"
              />
            </div>

            {/* Branch filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase shrink-0">Sucursal</span>
              <select
                value={branchFilter}
                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white shadow-sm font-semibold"
              >
                <option value="all">Todas</option>
                <option value="pinamar">Pinamar</option>
                <option value="montevideo">Montevideo</option>
              </select>
            </div>

            {/* Channel filter */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase shrink-0">Canal</span>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setCurrentPage(1); }}
                className="px-2.5 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white shadow-sm font-semibold"
              >
                <option value="all">Todos</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="mercado libre">Mercado Libre</option>
                <option value="venta directa">Venta Directa</option>
                <option value="web">Web</option>
              </select>
            </div>

          </div>

        </div>

        {/* LIST TABLE CONTAINER */}
        {paginatedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-semibold">No se encontraron ventas registradas con los filtros seleccionados.</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-[11px] mt-1">Ajuste los criterios de búsqueda, sucursal o canal para ubicar las órdenes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-zinc-900/40 border-b border-slate-150 dark:border-zinc-800">
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ID / FECHA</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">CANAL / ORIGEN</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">CLIENTE</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ITEMS</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">COSTO ENVÍO</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">P. VENTA</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">COSTO PROD.</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">GANANCIA NETA</th>
                  <th className="p-4 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-right bg-emerald-500/[0.02]">TOTAL FRAN</th>
                  <th className="p-4 text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-right bg-indigo-500/[0.02]">TOTAL JUEM</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">ESTADO</th>
                  <th className="p-4 text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-850">
                {paginatedOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const statusInfo = getStatusLabelAndStyle(order.status);
                  
                  // Math breakdowns
                  const { totalCost, gananciaNeta, totalPriceProducts } = getOrderCostAndProfit(order, productsList);
                  const isMvd = (order.depositoOrigen || "Pinamar") === "Montevideo";
                  
                  const rowFran = isMvd ? ((0.4 * gananciaNeta) + (order.shippingCost || 0)) : 0;
                  const rowJuem = isMvd ? (totalCost + (0.6 * gananciaNeta)) : (totalPriceProducts + (order.shippingCost || 0));

                  const itemsCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;

                  return (
                    <React.Fragment key={order.id}>
                      <tr 
                        className={`hover:bg-slate-50/40 dark:hover:bg-zinc-900/10 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-500/[0.02]' : ''}`} 
                        onClick={() => toggleRow(order.id)}
                      >
                        {/* ID / FECHA */}
                        <td className="p-4 font-mono">
                          <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            #{order.id.substring(0, 6).toUpperCase()}
                          </p>
                          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric"
                            }) : "N/A"}
                          </p>
                        </td>

                        {/* CANAL / ORIGEN */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded bg-slate-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400">
                            {order.canal || "Web"}
                          </span>
                          <span className="block text-[9.5px] font-bold text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 inline text-red-500" />
                            {order.depositoOrigen || "Pinamar"}
                          </span>
                        </td>

                        {/* CLIENTE */}
                        <td className="p-4">
                          <p className="text-xs font-bold text-slate-900 dark:text-white max-w-[150px] truncate">{order.customerName}</p>
                          <p className="text-[9.5px] text-zinc-450 dark:text-zinc-500 truncate max-w-[150px]">{order.customerEmail}</p>
                        </td>

                        {/* ITEMS */}
                        <td className="p-4">
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {itemsCount} {itemsCount === 1 ? "art." : "arts."}
                          </span>
                        </td>

                        {/* COSTO ENVÍO */}
                        <td className="p-4 text-right font-mono text-xs text-slate-600 dark:text-zinc-400">
                          $ {(order.shippingCost || 0).toLocaleString("es-AR")}
                        </td>

                        {/* P. VENTA */}
                        <td className="p-4 text-right font-mono text-xs font-bold text-slate-900 dark:text-white">
                          $ {totalPriceProducts.toLocaleString("es-AR")}
                        </td>

                        {/* COSTO PROD. */}
                        <td className="p-4 text-right font-mono text-xs text-slate-600 dark:text-zinc-400">
                          $ {totalCost.toLocaleString("es-AR")}
                        </td>

                        {/* GANANCIA NETA */}
                        <td className={`p-4 text-right font-mono text-xs font-bold ${gananciaNeta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          $ {gananciaNeta.toLocaleString("es-AR")}
                        </td>

                        {/* TOTAL FRAN */}
                        <td className="p-4 text-right font-mono text-xs font-bold bg-emerald-500/[0.01] text-emerald-600">
                          $ {rowFran.toLocaleString("es-AR")}
                        </td>

                        {/* TOTAL JUEM */}
                        <td className="p-4 text-right font-mono text-xs font-bold bg-indigo-500/[0.01] text-indigo-600">
                          $ {rowJuem.toLocaleString("es-AR")}
                        </td>

                        {/* ESTADO */}
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold border ${statusInfo.colors}`}>
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* ACCIONES */}
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* WhatsApp */}
                            <button
                              onClick={() => handleWhatsAppChat(order)}
                              title="Contactar por WhatsApp"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-transform hover:scale-105 cursor-pointer"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.998h.003c4.368 0 7.927-3.558 7.93-7.926a7.86 7.86 0 0 0-2.33-5.596ZM7.994 14.52a6.57 6.57 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                              </svg>
                            </button>

                            {/* Delete Confirmation workflow */}
                            {deletingId === order.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={async () => {
                                    setIsDeletingLoading(order.id);
                                    try {
                                      await onDeleteOrder(order.id);
                                    } finally {
                                      setIsDeletingLoading(null);
                                      setDeletingId(null);
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-600 text-white text-[9.5px] uppercase font-black rounded cursor-pointer"
                                >
                                  {isDeletingLoading === order.id ? "..." : "Sí"}
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-1.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-350 text-[9.5px] rounded cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(order.id)}
                                title="Eliminar venta"
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-all cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Expand toggle */}
                            <button
                              onClick={() => toggleRow(order.id)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-650 dark:text-zinc-300 rounded-lg cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>

                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED SECTION */}
                      {isExpanded && (
                        <tr className="bg-indigo-500/[0.01]">
                          <td colSpan={12} className="p-5 border-l-2 border-indigo-500">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                              
                              {/* Items Breakdown list */}
                              <div className="lg:col-span-8 space-y-3">
                                <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-400 uppercase tracking-wider border-b border-slate-150 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                                  <span>Desglose de Artículos de la Venta</span>
                                </h4>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                  {order.items && order.items.map((item, idx) => {
                                    const p = productsList.find(x => String(x.id) === String(item.productId));
                                    const c = p?.precioCompra || 0;
                                    const n = item.unitPrice - c;
                                    return (
                                      <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white dark:bg-zinc-950 p-3 rounded-lg border border-slate-150 dark:border-zinc-850 gap-3 shadow-sm">
                                        <div>
                                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                                            {item.productName}
                                          </p>
                                          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500 dark:text-zinc-450 font-bold mt-1">
                                            {item.sku && <span className="bg-slate-100 dark:bg-zinc-900 px-1 py-0.5 rounded">SKU: {item.sku}</span>}
                                            {item.sizeSelected && <span className="bg-slate-100 dark:bg-zinc-900 px-1 py-0.5 rounded">Talle: {item.sizeSelected}</span>}
                                            {item.colorSelected && <span className="bg-slate-100 dark:bg-zinc-900 px-1 py-0.5 rounded">Color: {item.colorSelected}</span>}
                                            <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1 py-0.5 rounded font-mono">
                                              {item.quantity} x $ {item.unitPrice.toLocaleString("es-AR")}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-0 pt-2 sm:pt-0 border-slate-100">
                                          <p className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                            $ {item.totalPrice.toLocaleString("es-AR")} P. Venta
                                          </p>
                                          <p className="text-[10px] font-mono text-slate-500 dark:text-zinc-400">
                                            Costo: $ {(c * item.quantity).toLocaleString("es-AR")}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="p-3 bg-slate-100 dark:bg-zinc-900 rounded-lg flex flex-wrap gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 justify-between items-center font-bold">
                                  <p>Subtotal: <span className="font-mono text-xs text-slate-900 dark:text-white">$ {order.subtotal?.toLocaleString("es-AR")}</span></p>
                                  {order.discountAmount > 0 && (
                                    <p className="text-rose-500">
                                      Descuento: <span className="font-mono">-$ {order.discountAmount?.toLocaleString("es-AR")}</span>
                                    </p>
                                  )}
                                  <p className="text-slate-950 dark:text-white font-extrabold text-xs">
                                    Total Facturado: <span className="font-mono text-sm">$ {order.total?.toLocaleString("es-AR")}</span>
                                  </p>
                                  {order.couponCode && (
                                    <p className="bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded font-mono font-extrabold">
                                      Cupón: {order.couponCode}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Manual Status updates and other data */}
                              <div className="lg:col-span-4 space-y-4">
                                <div>
                                  <h4 className="text-xs font-extrabold text-indigo-950 dark:text-indigo-400 uppercase tracking-wider border-b border-slate-150 dark:border-zinc-800 pb-2 flex items-center gap-1.5">
                                    <User className="h-4 w-4 text-indigo-600" />
                                    <span>Datos de la Operación</span>
                                  </h4>
                                  <div className="mt-2 text-xs text-slate-700 dark:text-zinc-300 space-y-1.5 font-semibold">
                                    <p><strong className="text-slate-450 dark:text-zinc-500">Cliente:</strong> {order.customerName}</p>
                                    <p><strong className="text-slate-450 dark:text-zinc-500">Email:</strong> {order.customerEmail}</p>
                                    {order.customerPhone && <p><strong className="text-slate-450 dark:text-zinc-500">Teléfono:</strong> {order.customerPhone}</p>}
                                    {order.notes && <p className="bg-slate-100 dark:bg-zinc-900 p-2 rounded text-[10.5px] italic mt-1 font-normal">"{order.notes}"</p>}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <h5 className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider">
                                    Modificar Estado Manualmente
                                  </h5>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_aprobado")}
                                      className={`px-3 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_aprobado"
                                          ? "bg-emerald-600 text-white font-extrabold scale-[1.01]"
                                          : "bg-white hover:bg-emerald-50 dark:bg-zinc-900 dark:hover:bg-emerald-950 text-emerald-600 border border-slate-200 dark:border-zinc-800"
                                      }`}
                                    >
                                      ✓ Aprobado
                                    </button>
                                    
                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_pendiente")}
                                      className={`px-3 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_pendiente"
                                          ? "bg-amber-500 text-zinc-950 font-extrabold scale-[1.01]"
                                          : "bg-white hover:bg-amber-50 dark:bg-zinc-900 dark:hover:bg-amber-950/40 text-amber-600 border border-slate-200 dark:border-zinc-800"
                                      }`}
                                    >
                                      ⌚ Pendiente
                                    </button>

                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pago_rechazado")}
                                      className={`px-3 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                        order.status === "pago_rechazado"
                                          ? "bg-rose-600 text-white font-extrabold scale-[1.01]"
                                          : "bg-white hover:bg-rose-50 dark:bg-zinc-900 dark:hover:bg-rose-950/40 text-rose-600 border border-slate-200 dark:border-zinc-800"
                                      }`}
                                    >
                                      ✗ Rechazado
                                    </button>

                                    <button
                                      disabled={updatingId !== null}
                                      onClick={() => handleUpdateStatus(order.id, "pedido_iniciado")}
                                      className={`px-3 py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                        order.status === "pedido_iniciado"
                                          ? "bg-sky-650 text-white font-extrabold scale-[1.01]"
                                          : "bg-white hover:bg-sky-50 dark:bg-zinc-900 dark:hover:bg-sky-950/40 text-sky-600 border border-slate-200 dark:border-zinc-800"
                                      }`}
                                    >
                                      📝 Lead
                                    </button>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/10 flex items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
              Mostrando registros <strong>{startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)}</strong> de un total de <strong>{totalItems}</strong>
            </span>
            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  safeCurrentPage === 1
                    ? "bg-slate-100 border-slate-200 text-slate-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-white border-slate-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-850 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                Anterior
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((p, idx) => {
                if (p === "...") {
                  return <span key={`dots-${idx}`} className="px-2 text-zinc-450">...</span>;
                }
                const pageNum = p as number;
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      safeCurrentPage === pageNum
                        ? "bg-indigo-600 text-white font-extrabold"
                        : "bg-white border border-slate-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-850 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next */}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={safeCurrentPage === totalPages}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  safeCurrentPage === totalPages
                    ? "bg-slate-100 border-slate-200 text-slate-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                    : "bg-white border-slate-200 text-zinc-650 dark:bg-zinc-900 dark:border-zinc-850 hover:bg-slate-50 cursor-pointer"
                }`}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

      </div>

      {/* REGISTRAR NUEVA VENTA MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800/80 flex justify-between items-center bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider">Registrar Nueva Venta (Asistente de Facturación)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {newSaleErrorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2.5 font-bold animate-pulse">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{newSaleErrorMessage}</span>
                </div>
              )}

              {/* 1. PRODUCT AUTOCOMPLETE SEARCH */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-indigo-600" />
                  <span>1. Buscar Artículo a Agregar</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => handleProductSearch(e.target.value)}
                    placeholder="Escriba nombre de producto, código o SKU para agregar..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  
                  {/* Suggestions List */}
                  {searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-xl z-[110] max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-900 overflow-hidden">
                      {searchResults.map((res, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleAddProductToSale(res)}
                          className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer text-xs flex justify-between items-center transition-colors"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{res.displayName}</p>
                            <p className="text-[9.5px] text-zinc-450 dark:text-zinc-500 font-mono mt-0.5">SKU: {res.sku || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                              $ {res.price.toLocaleString("es-AR")}
                            </span>
                            <span className="block text-[8px] uppercase tracking-wider text-slate-400 mt-0.5">
                              Stock: {res.variant ? (res.variant.stock ?? res.product.stock) : res.product.stock}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. ADDED ITEMS IN THIS TRANSACTION */}
              <div className="space-y-2">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-indigo-600" />
                  <span>2. Artículos en esta Transacción ({newSaleItems.length})</span>
                </label>

                {newSaleItems.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-center bg-slate-50/50 dark:bg-zinc-900/10">
                    <ShoppingBag className="h-8 w-8 text-slate-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold">La transacción está vacía.</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Busque y agregue artículos utilizando el buscador de arriba.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {newSaleItems.map((item, idx) => {
                      const itemSubtotal = item.quantity * item.unitPrice;
                      const itemCostoTotal = item.quantity * item.costPrice;
                      const itemProfit = itemSubtotal - itemCostoTotal;
                      return (
                        <div key={idx} className="p-3.5 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{item.productName}</p>
                            <div className="flex flex-wrap gap-1.5 text-[9.5px] text-zinc-500 dark:text-zinc-450 font-bold">
                              {item.sku && <span className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded border border-slate-100">SKU: {item.sku}</span>}
                              {item.sizeSelected && <span className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded border border-slate-100">Talle: {item.sizeSelected}</span>}
                              {item.colorSelected && <span className="bg-white dark:bg-zinc-950 px-1 py-0.5 rounded border border-slate-100">Color: {item.colorSelected}</span>}
                              <span className="bg-sky-50 text-sky-600 px-1 py-0.5 rounded">Costo Unit: $ {item.costPrice}</span>
                            </div>
                          </div>

                          {/* Controls (quantity and price override) */}
                          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:shrink-0 justify-between md:justify-end">
                            
                            {/* Quantity */}
                            <div className="flex items-center gap-1">
                              <span className="text-[9.5px] font-extrabold uppercase text-slate-400">Cant</span>
                              <div className="flex items-center border border-slate-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSaleItem(idx, "quantity", item.quantity - 1)}
                                  className="px-2 py-1 text-xs hover:bg-slate-100 rounded-l cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateSaleItem(idx, "quantity", parseInt(e.target.value) || 0)}
                                  className="w-10 text-center text-xs font-bold outline-none border-x border-slate-250 font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSaleItem(idx, "quantity", item.quantity + 1)}
                                  className="px-2 py-1 text-xs hover:bg-slate-100 rounded-r cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Custom selling price override */}
                            <div className="flex items-center gap-1">
                              <span className="text-[9.5px] font-extrabold uppercase text-slate-400">P. Venta UYU</span>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateSaleItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                className="w-20 px-1.5 py-1 text-xs font-bold outline-none border border-slate-200 rounded font-mono text-right bg-white"
                              />
                            </div>

                            {/* Subtotal of row */}
                            <div className="text-right min-w-[90px] font-mono">
                              <span className="block text-xs font-extrabold text-slate-900 dark:text-white">
                                $ {itemSubtotal.toLocaleString("es-AR")}
                              </span>
                              <span className="block text-[8.5px] text-emerald-600 font-bold">
                                Profit: +$ {itemProfit.toLocaleString("es-AR")}
                              </span>
                            </div>

                            {/* Remove item button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromSale(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. TRANSACTION OPERATION METADATA */}
              <div className="space-y-4">
                <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 border-b pb-1.5 border-slate-100">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span>3. Datos de la Operación de Venta</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Customer name */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Cliente Comprador</span>
                    <input
                      type="text"
                      value={newSaleCustomerName}
                      onChange={(e) => setNewSaleCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  {/* Customer email */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Correo Electrónico</span>
                    <input
                      type="email"
                      value={newSaleCustomerEmail}
                      onChange={(e) => setNewSaleCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  {/* Customer phone */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Teléfono de Contacto</span>
                    <input
                      type="text"
                      value={newSaleCustomerPhone}
                      placeholder="e.g. +598 99123456"
                      onChange={(e) => setNewSaleCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  {/* Deposito origen (Sucursal/Origen) */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Depósito de Origen</span>
                    <select
                      value={newSaleDeposito}
                      onChange={(e) => setNewSaleDeposito(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="Pinamar">Pinamar (Uruguay Principal)</option>
                      <option value="Montevideo">Montevideo (Franquicia)</option>
                    </select>
                  </div>

                  {/* Canal de venta */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Canal de Venta</span>
                    <select
                      value={newSaleCanal}
                      onChange={(e) => setNewSaleCanal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Mercado Libre">Mercado Libre</option>
                      <option value="Venta Directa">Venta Directa</option>
                      <option value="Web">Página Web</option>
                    </select>
                  </div>

                  {/* Shipping Cost */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Costo Envío de Orden ($ UYU)</span>
                    <input
                      type="number"
                      value={newSaleShippingCost}
                      onChange={(e) => setNewSaleShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold font-mono text-right"
                    />
                  </div>

                  {/* Coupon optional */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Cupón Aplicado (Opcional)</span>
                    <input
                      type="text"
                      placeholder="e.g. APEX50"
                      value={newSaleCouponCode}
                      onChange={(e) => setNewSaleCouponCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-indigo-600"
                    />
                  </div>

                  {/* Operational status */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Estado de Aprobación</span>
                    <select
                      value={newSaleStatus}
                      onChange={(e) => setNewSaleStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-slate-800"
                    >
                      <option value="pago_aprobado">Aprobado (Descuenta Stock)</option>
                      <option value="pago_pendiente">Pendiente (No descuenta stock)</option>
                      <option value="pago_rechazado">Rechazado</option>
                    </select>
                  </div>

                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">Notas Adicionales de la Venta</span>
                  <textarea
                    rows={2}
                    value={newSaleNotes}
                    onChange={(e) => setNewSaleNotes(e.target.value)}
                    placeholder="Escriba especificaciones del despacho, aclaraciones, etc..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              {/* LIVE SIMULATED REVENUE DISTRIBUTION PREVIEW */}
              {newSaleItems.length > 0 && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-200/50 rounded-xl space-y-2 text-xs font-semibold text-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600">Simulación de Distribución de Comisión para esta Operación</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 font-mono">
                    <div>
                      <span className="block text-[9px] text-slate-450 uppercase font-sans font-bold">Monto Venta</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        $ {newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0).toLocaleString("es-AR")} UYU
                      </span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-slate-450 uppercase font-sans font-bold">Costo de Prod</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        $ {newSaleItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0).toLocaleString("es-AR")} UYU
                      </span>
                    </div>
                    {newSaleDeposito === "Montevideo" ? (
                      <>
                        <div>
                          <span className="block text-[9px] text-emerald-600 uppercase font-sans font-bold">40% Fran. + Envíos</span>
                          <span className="text-sm font-extrabold text-emerald-600">
                            $ {Math.round(
                              0.4 * (
                                newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0) - 
                                newSaleItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0)
                              ) + Number(newSaleShippingCost)
                            ).toLocaleString("es-AR")} UYU
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-indigo-600 uppercase font-sans font-bold">Cost + 60% JUEM</span>
                          <span className="text-sm font-extrabold text-indigo-600">
                            $ {Math.round(
                              newSaleItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0) +
                              0.6 * (
                                newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0) - 
                                newSaleItems.reduce((acc, it) => acc + (it.quantity * it.costPrice), 0)
                              )
                            ).toLocaleString("es-AR")} UYU
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="block text-[9px] text-emerald-600 uppercase font-sans font-bold">Total Fran</span>
                          <span className="text-sm font-extrabold text-emerald-600">$ 0 UYU</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-indigo-600 uppercase font-sans font-bold">100% JUEM + Envío</span>
                          <span className="text-sm font-extrabold text-indigo-600">
                            $ {Math.round(
                              newSaleItems.reduce((acc, it) => acc + it.totalPrice, 0) + Number(newSaleShippingCost)
                            ).toLocaleString("es-AR")} UYU
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-150 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 cursor-pointer w-full sm:w-auto text-center"
              >
                Cerrar (Mantener Borrador)
              </button>
              
              <button
                type="button"
                disabled={isSubmittingNewSale || newSaleItems.length === 0}
                onClick={handleDispatchSale}
                className={`px-6 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shadow-md ${
                  isSubmittingNewSale || newSaleItems.length === 0
                    ? "bg-indigo-300 dark:bg-indigo-950 text-indigo-100 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 active:scale-98 transition-all"
                }`}
              >
                {isSubmittingNewSale ? (
                  <span>Procesando venta...</span>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    <span>Despachar Factura ({newSaleItems.reduce((acc, it) => acc + it.quantity, 0)} items)</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
