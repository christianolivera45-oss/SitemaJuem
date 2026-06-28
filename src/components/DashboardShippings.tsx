import React, { useState, useMemo } from "react";
import { ShopState, Shipping, ShippingOrigin, Order } from "../types";
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Edit2,
  Phone,
  Printer,
  X,
  Check,
  FileText,
  Settings,
  Moon,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface DashboardShippingsProps {
  store: ShopState;
  onAddShipping: (newShipping: Shipping) => void;
  onUpdateShipping: (updatedShipping: Shipping) => void;
  onDeleteShipping: (id: string) => void;
  onUpdateOrigins: (origins: ShippingOrigin[]) => void;
}

export const DashboardShippings: React.FC<DashboardShippingsProps> = ({
  store,
  onAddShipping,
  onUpdateShipping,
  onDeleteShipping,
  onUpdateOrigins
}) => {
  // Shippings from store
  const shippings = useMemo(() => store.shippings || [], [store.shippings]);
  const origins = useMemo(() => {
    // Default origins if empty
    const defaultOrigins: ShippingOrigin[] = [
      { id: "Montevideo", name: "JUEM - Montevideo", address: "Coruña 3038 Bis, Montevideo", contact: "098058775 | 096958714" },
      { id: "Pinamar", name: "JUEM - Pinamar", address: "Ruta 11 Km 320, Pinamar", contact: "098058775 | 096958714" }
    ];
    if (!store.shippingOrigins || store.shippingOrigins.length === 0) return defaultOrigins;
    return store.shippingOrigins;
  }, [store.shippingOrigins]);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryHours, setDeliveryHours] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [comments, setComments] = useState("");
  const [branch, setBranch] = useState<"Pinamar" | "Montevideo">("Montevideo");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [status, setStatus] = useState<"Pendiente" | "Entregado" | "Cancelado">("Pendiente");

  // Selection state for printing/viewing label
  const [selectedShipping, setSelectedShipping] = useState<Shipping | null>(null);

  // Label UI Customization
  const [labelTheme, setLabelTheme] = useState<"azul-oro" | "termico">("azul-oro");
  const [printFormat, setPrintFormat] = useState<"compacto" | "media-hoja" | "completa">("compacto");

  // Modals
  const [showOriginsModal, setShowOriginsModal] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);

  // Origins Modal Form State
  const [mvdName, setMvdName] = useState("");
  const [mvdAddress, setMvdAddress] = useState("");
  const [mvdContact, setMvdContact] = useState("");
  const [pinName, setPinName] = useState("");
  const [pinAddress, setPinAddress] = useState("");
  const [pinContact, setPinContact] = useState("");

  // Search/Filter Shippings list
  const [searchQuery, setSearchQuery] = useState("");

  // Sales Search in Load Modal
  const [saleSearchQuery, setSaleSearchQuery] = useState("");

  // Auto-generate order code helper
  const handleAutoGenerateCode = () => {
    const nextNum = 1000 + shippings.length + 1;
    setOrderNumber(`PE-${nextNum}`);
  };

  // Initialize auto code if form is blank
  React.useEffect(() => {
    if (!editingId && orderNumber === "") {
      handleAutoGenerateCode();
    }
  }, [editingId, shippings.length]);

  // Handle Edit click
  const startEdit = (ship: Shipping) => {
    setEditingId(ship.id);
    setOrderNumber(ship.orderNumber);
    setCustomerName(ship.customerName);
    setCustomerPhone(ship.customerPhone || "");
    setDeliveryHours(ship.deliveryHours || "");
    setDeliveryAddress(ship.deliveryAddress);
    setComments(ship.comments || "");
    setBranch(ship.branch);
    setShippingCost(ship.shippingCost);
    setStatus(ship.status);
    
    // Auto select to view label
    setSelectedShipping(ship);
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryHours("");
    setDeliveryAddress("");
    setComments("");
    setShippingCost(0);
    setStatus("Pendiente");
    handleAutoGenerateCode();
  };

  // Handle submit (Create or Save edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !customerName.trim() || !deliveryAddress.trim()) {
      alert("Por favor, complete los campos requeridos (*).");
      return;
    }

    const payload = {
      orderNumber,
      customerName,
      customerPhone,
      deliveryHours,
      deliveryAddress,
      comments,
      branch,
      shippingCost,
      status
    };

    try {
      if (editingId) {
        // Edit flow
        const response = await fetch(`/api/shippings/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
          },
          body: JSON.stringify(payload)
        });
        const d = await response.json();
        if (response.ok && d.success) {
          onUpdateShipping({
            ...payload,
            id: editingId,
            createdAt: shippings.find(s => s.id === editingId)?.createdAt || new Date().toISOString()
          });
          setEditingId(null);
          // Clear form and auto gen
          setCustomerName("");
          setCustomerPhone("");
          setDeliveryHours("");
          setDeliveryAddress("");
          setComments("");
          setShippingCost(0);
          setStatus("Pendiente");
          handleAutoGenerateCode();
        } else {
          alert(d.message || "Error al actualizar envío");
        }
      } else {
        // Create flow
        const response = await fetch("/api/shippings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
          },
          body: JSON.stringify(payload)
        });
        const d = await response.json();
        if (response.ok && d.success) {
          onAddShipping(d.shipping);
          // Clear form and auto gen
          setCustomerName("");
          setCustomerPhone("");
          setDeliveryHours("");
          setDeliveryAddress("");
          setComments("");
          setShippingCost(0);
          setStatus("Pendiente");
          handleAutoGenerateCode();
        } else {
          alert(d.message || "Error al registrar envío");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    }
  };

  // Delete Shipping
  const handleDelete = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este registro de envío?")) return;
    try {
      const response = await fetch(`/api/shippings/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        }
      });
      const d = await response.json();
      if (response.ok && d.success) {
        onDeleteShipping(id);
        if (selectedShipping?.id === id) {
          setSelectedShipping(null);
        }
      } else {
        alert(d.message || "Error al eliminar envío");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    }
  };

  // Open Origins Modal and populate forms
  const openOriginsModal = () => {
    const mvd = origins.find(o => o.id === "Montevideo") || { name: "", address: "", contact: "" };
    const pin = origins.find(o => o.id === "Pinamar") || { name: "", address: "", contact: "" };
    
    setMvdName(mvd.name);
    setMvdAddress(mvd.address);
    setMvdContact(mvd.contact);
    
    setPinName(pin.name);
    setPinAddress(pin.address);
    setPinContact(pin.contact);
    
    setShowOriginsModal(true);
  };

  // Save Origins to backend
  const handleSaveOrigins = async () => {
    const payload = {
      origins: [
        { id: "Montevideo", name: mvdName, address: mvdAddress, contact: mvdContact },
        { id: "Pinamar", name: pinName, address: pinAddress, contact: pinContact }
      ]
    };
    try {
      const response = await fetch("/api/shipping-origins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
        },
        body: JSON.stringify(payload)
      });
      const d = await response.json();
      if (response.ok && d.success) {
        onUpdateOrigins(payload.origins as ShippingOrigin[]);
        setShowOriginsModal(false);
      } else {
        alert(d.message || "Error al guardar orígenes");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    }
  };

  // Load order data into shipping registration form
  const loadOrderData = (order: Order) => {
    setOrderNumber(order.id.substring(0, 8).toUpperCase());
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || "");
    setDeliveryAddress(order.notes || ""); // Default to notes since there isn't an address, or user can input
    setComments(`Venta Web Canal: ${order.canal || "Web"}. Metodo Pago: ${order.paymentMethod || "Web"}`);
    setBranch(order.depositoOrigen === "Montevideo" ? "Montevideo" : "Pinamar");
    setShippingCost(order.shippingCost || 0);
    setStatus("Pendiente");
    setShowSalesModal(false);
  };

  // Calculations for Metrics widgets
  const metrics = useMemo(() => {
    const totalEarning = shippings
      .filter(s => s.status === "Entregado")
      .reduce((sum, s) => sum + s.shippingCost, 0);

    const mvdEarning = shippings
      .filter(s => s.branch === "Montevideo" && s.status === "Entregado")
      .reduce((sum, s) => sum + s.shippingCost, 0);

    const pinEarning = shippings
      .filter(s => s.branch === "Pinamar" && s.status === "Entregado")
      .reduce((sum, s) => sum + s.shippingCost, 0);

    return {
      totalEarning,
      mvdEarning,
      pinEarning
    };
  }, [shippings]);

  // Filtered Shippings
  const filteredShippings = useMemo(() => {
    if (!searchQuery.trim()) return shippings;
    const q = searchQuery.toLowerCase();
    return shippings.filter(s => 
      s.orderNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerPhone || "").toLowerCase().includes(q) ||
      s.deliveryAddress.toLowerCase().includes(q)
    );
  }, [shippings, searchQuery]);

  // Filtered Orders for search sales modal
  const filteredOrders = useMemo(() => {
    const ordersList = store.orders || [];
    if (!saleSearchQuery.trim()) return ordersList;
    const q = saleSearchQuery.toLowerCase();
    return ordersList.filter(o => 
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      (o.customerPhone || "").toLowerCase().includes(q) ||
      (o.customerEmail || "").toLowerCase().includes(q)
    );
  }, [store.orders, saleSearchQuery]);

  // Get active origin details for the preview label
  const activeOrigin = useMemo(() => {
    const defaultBranch = selectedShipping?.branch || "Montevideo";
    return origins.find(o => o.id === defaultBranch) || {
      id: defaultBranch,
      name: `JUEM - ${defaultBranch}`,
      address: defaultBranch === "Montevideo" ? "Coruña 3038 Bis, Montevideo" : "Ruta 11 Km 320, Pinamar",
      contact: "098058775 | 096958714"
    };
  }, [selectedShipping, origins]);

  // Function to isolatedly trigger printable version of the label
  const handlePrintLabel = () => {
    if (!selectedShipping) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor habilite las ventanas emergentes en su navegador.");
      return;
    }

    // Dynamic style based on print format
    let printStyles = "";
    if (printFormat === "compacto") {
      printStyles = `
        @page { size: 80mm 150mm; margin: 0; }
        body { width: 80mm; font-family: 'Courier New', Courier, monospace; color: #000; background: #fff; margin: 0; padding: 4mm; box-sizing: border-box; }
        .label-container { border: 1px dashed #000; padding: 3mm; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
        .title { font-size: 18px; font-weight: bold; text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 3mm; letter-spacing: 1px; }
        .subtitle { font-size: 10px; text-align: center; margin-bottom: 4mm; }
        .badge { display: block; border: 1px solid #000; text-align: center; padding: 1mm 0; font-weight: bold; font-size: 11px; margin-bottom: 4mm; }
        .section-title { font-size: 11px; font-weight: bold; text-decoration: underline; margin-bottom: 1mm; margin-top: 3mm; }
        .details { font-size: 10px; line-height: 1.3; margin-bottom: 3mm; }
        .order-meta { border-top: 1px solid #000; padding-top: 2mm; margin-top: 4mm; font-size: 9px; text-align: center; }
        .barcode-dummy { font-family: monospace; font-size: 14px; text-align: center; margin-top: 4mm; letter-spacing: 3px; font-weight: bold; }
      `;
    } else if (printFormat === "media-hoja") {
      printStyles = `
        @page { size: A5 landscape; margin: 5mm; }
        body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 10mm; }
        .label-container { border: 2px solid #000; padding: 6mm; height: 100%; border-radius: 4px; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 5mm; }
        .title { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
        .badge { border: 1.5px solid #000; padding: 1mm 3mm; font-weight: bold; font-size: 12px; border-radius: 3px; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 6mm; }
        .section { margin-bottom: 4mm; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 2mm; color: #333; }
        .details { font-size: 11px; line-height: 1.4; }
        .footer { border-top: 1.5px dashed #000; padding-top: 4mm; margin-top: 6mm; display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
        .barcode-dummy { font-size: 20px; font-family: monospace; letter-spacing: 4px; font-weight: bold; }
      `;
    } else {
      // Full A4 page
      printStyles = `
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; }
        .label-container { border: 3px solid #000; padding: 10mm; border-radius: 8px; box-sizing: border-box; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 5mm; margin-bottom: 8mm; }
        .title { font-size: 32px; font-weight: 900; letter-spacing: 1px; }
        .badge { border: 2px solid #000; padding: 2mm 5mm; font-weight: bold; font-size: 16px; border-radius: 4px; }
        .section { margin-bottom: 6mm; }
        .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }
        .details { font-size: 13px; line-height: 1.5; }
        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10mm; }
        .footer { border-top: 2px dashed #000; padding-top: 6mm; margin-top: 10mm; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
        .barcode-dummy { font-size: 24px; font-family: monospace; letter-spacing: 5px; font-weight: bold; }
      `;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Imprimir Etiqueta ${selectedShipping.orderNumber}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          <div class="label-container">
            ${printFormat === "compacto" ? `
              <div class="title">JUEM</div>
              <div class="subtitle">Tienda de Indumentaria & Accesorios</div>
              <div class="badge">ETIQUETA DE ENVÍO</div>
              
              <div class="section-title">REMITENTE</div>
              <div class="details">
                <strong>${activeOrigin.name}</strong><br/>
                ${activeOrigin.address}<br/>
                Contact: ${activeOrigin.contact}
              </div>
              
              <div class="section-title">DESTINATARIO (CLIENTE)</div>
              <div class="details">
                <strong>${selectedShipping.customerName}</strong><br/>
                ${selectedShipping.deliveryAddress}<br/>
                Tel: ${selectedShipping.customerPhone || "Sin registrar"}<br/>
                Horario: ${selectedShipping.deliveryHours || "No especificado"}
              </div>
              
              ${selectedShipping.comments ? `
                <div class="section-title">NOTAS / COMENTARIOS</div>
                <div class="details">${selectedShipping.comments}</div>
              ` : ""}
              
              <div class="order-meta">
                <strong>PEDIDO: ${selectedShipping.orderNumber}</strong> | Fecha: ${selectedShipping.createdAt.substring(0, 10).split("-").reverse().join("/")}
              </div>
              <div class="barcode-dummy">||| | | |||| | | ||| | |||</div>
            ` : `
              <div class="header">
                <div>
                  <div class="title">JUEM</div>
                  <div style="font-size:12px; color:#555;">TIENDA DE INDUMENTARIA & ACCESORIOS</div>
                </div>
                <div class="badge">ETIQUETA DE ENVÍO</div>
              </div>
              
              <div class="grid">
                <div>
                  <div class="section">
                    <div class="section-title">REMITENTE (ORIGEN)</div>
                    <div class="details">
                      <strong style="font-size:14px;">${activeOrigin.name}</strong><br/>
                      <span style="font-size:12px; display:block; margin:2px 0;">📍 ${activeOrigin.address}</span>
                      <span style="font-size:12px;">📞 ${activeOrigin.contact}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div class="section">
                    <div class="section-title">DESTINATARIO (ENTREGA)</div>
                    <div class="details">
                      <strong style="font-size:15px;">👤 ${selectedShipping.customerName}</strong><br/>
                      <span style="font-size:13px; display:block; margin:4px 0; font-weight:bold;">📍 ${selectedShipping.deliveryAddress}</span>
                      <span style="font-size:12px; display:block; margin:2px 0;">📞 Teléfono: ${selectedShipping.customerPhone || "Sin registrar"}</span>
                      <span style="font-size:12px; display:block; margin:2px 0;">🕒 Horario: ${selectedShipping.deliveryHours || "No especificado"}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              ${selectedShipping.comments ? `
                <div class="section" style="margin-top: 4mm;">
                  <div class="section-title">OBSERVACIONES / DETALLES ESPECIALES</div>
                  <div class="details" style="font-style: italic; background:#f9f9f9; padding:3mm; border-left:3px solid #000;">
                    ${selectedShipping.comments}
                  </div>
                </div>
              ` : ""}
              
              <div class="footer">
                <div>
                  <strong>N° PEDIDO:</strong> ${selectedShipping.orderNumber}<br/>
                  <strong>FECHA DE REPARTO:</strong> ${selectedShipping.createdAt.substring(0, 10).split("-").reverse().join("/")}<br/>
                  <strong>ORIGEN:</strong> Sucursal ${selectedShipping.branch}
                </div>
                <div style="text-align:right;">
                  <div class="barcode-dummy">||| | | |||| | | ||| | |||</div>
                  <span style="font-size:10px; font-family:monospace;">${selectedShipping.id.substring(0, 8).toUpperCase()}</span>
                </div>
              </div>
            `}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div id="shippings-panel-root" className="space-y-6">
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-5 w-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-zinc-100">Planificación y Etiquetas de Envío</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Registro de envíos logísticos para reparto. Busque ventas directamente para precompletar la etiqueta térmica de entrega.
          </p>
        </div>
      </div>

      {/* METRICS (3 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TOTAL DELIVERY REVENUE */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ganancia Envíos Global</div>
            <div className="text-xl font-black text-indigo-400 font-mono">
              $ {metrics.totalEarning.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
            </div>
            <p className="text-[10px] text-zinc-500">Acumulado neto por servicios logísticos activos</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Truck className="h-5 w-5" />
          </div>
        </div>

        {/* MONTEVIDEO */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Sucursal Montevideo</div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              $ {metrics.mvdEarning.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
            </div>
            <p className="text-[10px] text-zinc-500">Retornos de reparto propios en depósito Montevideo</p>
          </div>
          <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-zinc-950 text-[10px] font-bold">
            Mvd
          </div>
        </div>

        {/* PINAMAR */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Sucursal Pinamar</div>
            <div className="text-xl font-black text-amber-400 font-mono">
              $ {metrics.pinEarning.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
            </div>
            <p className="text-[10px] text-zinc-500">Retornos logísticos e intermediarios de Pinamar</p>
          </div>
          <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-zinc-950 text-[10px] font-bold">
            Pin
          </div>
        </div>
      </div>

      {/* TWO PANEL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANEL: REGISTER / EDIT FORM */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div>
              <h3 className="font-bold text-sm text-zinc-200">
                {editingId ? "✏️ EDITAR ENVÍO REGISTRADO" : "📦 REGISTRAR NUEVO ENVÍO"}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {editingId ? "Actualice la información del paquete en reparto" : "Ingrese las coordenadas de reparto o cargue una venta directamente"}
              </p>
            </div>
            
            {!editingId && (
              <button
                type="button"
                onClick={() => setShowSalesModal(true)}
                className="flex items-center gap-1.5 bg-emerald-650/10 hover:bg-emerald-650/20 border border-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Truck className="h-3.5 w-3.5" />
                <span>Cargar Datos desde Ventas</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* N° PEDIDO */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                N° Pedido (Autogenerado) *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                  required
                />
                {!editingId && (
                  <button
                    type="button"
                    onClick={handleAutoGenerateCode}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs px-2 rounded-lg border border-zinc-750 font-semibold"
                  >
                    Auto
                  </button>
                )}
              </div>
            </div>

            {/* NOMBRE CLIENTE */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                placeholder="Ej: Jaqueline"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* TELEFONO */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                placeholder="Ej: 96852242"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* HORARIO ENTREGA */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Horario de Entrega / Delivery
              </label>
              <input
                type="text"
                placeholder="Ej: Despues de las 17:00hs"
                value={deliveryHours}
                onChange={(e) => setDeliveryHours(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* DIRECCION ENTREGA */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Dirección de Entrega *
              </label>
              <input
                type="text"
                placeholder="Ej: Luis Batlle Berres 4284"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* COMENTARIOS */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Comentarios / Notas Especiales
              </label>
              <textarea
                placeholder="Ej: No tiene timbre. Llamar al llegar antes de subir."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* SUCURSAL */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Sucursal de Origen *
              </label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Montevideo">Montevideo (Mvd)</option>
                <option value="Pinamar">Pinamar (Pin)</option>
              </select>
            </div>

            {/* COSTO ENVIO */}
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Costo Envío Ganado ($) *
              </label>
              <input
                type="number"
                value={shippingCost}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500 font-mono"
                required
                min={0}
              />
            </div>

            {/* ESTADO */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 block">
                Estado *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 w-full focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            {/* ACTIONS */}
            <div className="sm:col-span-2 pt-3 flex gap-2">
              <button
                type="submit"
                className="flex-grow bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{editingId ? "Guardar Cambios de Envío" : "Registrar Envío en Sistema"}</span>
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-bold text-xs py-2.5 px-4 rounded-lg border border-zinc-700 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* RIGHT PANEL: PRINT / TICKET PREVIEW */}
        <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 lg:col-span-5 space-y-4">
          <div className="flex flex-col gap-2 pb-3 border-b border-zinc-900">
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-zinc-400 block">
                VISTA PREVIA DE ETIQUETA
              </span>
              <button
                type="button"
                onClick={openOriginsModal}
                className="flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
              >
                <Settings className="h-3 w-3" />
                <span>REMITENTES</span>
              </button>
            </div>

            {/* Label style and Print Size Selectors */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
              {/* Style selection */}
              <div className="flex bg-zinc-900 rounded border border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setLabelTheme("azul-oro")}
                  className={`px-2 py-1 text-[9px] font-bold rounded ${
                    labelTheme === "azul-oro" ? "bg-amber-550 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Azul & Oro (Marca)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelTheme("termico")}
                  className={`px-2 py-1 text-[9px] font-bold rounded ${
                    labelTheme === "termico" ? "bg-amber-550 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Térmico B&N
                </button>
              </div>

              {/* Format selection */}
              <div className="flex bg-zinc-900 rounded border border-zinc-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setPrintFormat("compacto")}
                  className={`px-2 py-1 text-[9px] font-bold rounded ${
                    printFormat === "compacto" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Compacto/Ticket
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat("media-hoja")}
                  className={`px-2 py-1 text-[9px] font-bold rounded ${
                    printFormat === "media-hoja" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Media Hoja A4
                </button>
                <button
                  type="button"
                  onClick={() => setPrintFormat("completa")}
                  className={`px-2 py-1 text-[9px] font-bold rounded ${
                    printFormat === "completa" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Pág. Completa A4
                </button>
              </div>
            </div>
          </div>

          {/* Ticket preview card itself */}
          {!selectedShipping ? (
            <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3 min-h-[350px]">
              <Truck className="h-10 w-10 text-zinc-700" />
              <p className="text-xs max-w-xs leading-relaxed">
                Seleccione un envío del registro para cargar la ticket-card térmica de entrega
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Thermal / Color mockup card */}
              <div id="thermal-label-card-container" className={`rounded-2xl border p-5 shadow-lg relative select-none ${
                labelTheme === "azul-oro" 
                  ? "bg-gradient-to-br from-zinc-950 to-indigo-950/85 border-amber-500/30 text-zinc-200" 
                  : "bg-white border-zinc-900 text-black shadow-inner font-mono"
              }`}>
                {/* Gold Accent Corner (Azul-oro only) */}
                {labelTheme === "azul-oro" && (
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-br from-transparent to-amber-500/10 rounded-tr-2xl overflow-hidden pointer-events-none" />
                )}

                {/* LOGO AND BRAND HEADER */}
                <div className="text-center pb-4 border-b border-dashed border-zinc-800/60 flex flex-col items-center justify-center">
                  {labelTheme === "azul-oro" ? (
                    <>
                      <div className="flex items-center justify-center text-amber-400 mb-1">
                        <Moon className="h-5 w-5 fill-amber-400 text-amber-400 animate-pulse" />
                      </div>
                      <span className="text-xl font-black tracking-widest text-amber-400 font-sans block">
                        Juem
                      </span>
                      <span className="text-[8px] uppercase tracking-wider text-zinc-400 block font-sans">
                        TIENDA DE INDUMENTARIA & ACCESORIOS
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black tracking-widest uppercase block">
                        JUEM
                      </span>
                      <span className="text-[9px] font-bold tracking-wider block">
                        TICKET TÉRMICO DE DESPACHO
                      </span>
                    </>
                  )}
                  
                  {/* LABEL BADGE */}
                  <span className={`inline-block text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mt-3 ${
                    labelTheme === "azul-oro" 
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" 
                      : "bg-black text-white px-4 border border-black"
                  }`}>
                    ETIQUETA DE ENVÍO
                  </span>
                </div>

                <div className="py-4 space-y-4 text-xs">
                  {/* SENDER INFO */}
                  <div className="space-y-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                      labelTheme === "azul-oro" ? "text-amber-500" : "text-zinc-600 underline"
                    }`}>
                      REMITENTE:
                    </span>
                    <div className="leading-relaxed pl-1">
                      <strong className="block text-sm">{activeOrigin.name}</strong>
                      <span className="opacity-80 block text-[10px]">📍 {activeOrigin.address}</span>
                      <span className="opacity-80 block text-[10px]">📞 {activeOrigin.contact}</span>
                    </div>
                  </div>

                  {/* DESTINATARIO INFO */}
                  <div className="space-y-1">
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                      labelTheme === "azul-oro" ? "text-amber-500" : "text-zinc-600 underline"
                    }`}>
                      DESTINATARIO (ENTREGA):
                    </span>
                    <div className="leading-relaxed pl-1 space-y-0.5">
                      <strong className="block text-sm">👤 {selectedShipping.customerName}</strong>
                      <span className="font-extrabold block text-[11px] opacity-90">📍 {selectedShipping.deliveryAddress}</span>
                      <span className="opacity-85 block text-[10px]">📞 Tel: {selectedShipping.customerPhone || "Sin registrar"}</span>
                      {selectedShipping.deliveryHours && (
                        <span className="opacity-85 block text-[10px]">🕒 Horario: {selectedShipping.deliveryHours}</span>
                      )}
                    </div>
                  </div>

                  {/* SPECIAL COMMENTS */}
                  {selectedShipping.comments && (
                    <div className="space-y-1">
                      <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                        labelTheme === "azul-oro" ? "text-amber-500" : "text-zinc-600 underline"
                      }`}>
                        NOTAS / COMENTARIOS:
                      </span>
                      <div className={`p-2.5 rounded-lg text-[10px] leading-relaxed italic ${
                        labelTheme === "azul-oro" ? "bg-zinc-900/60 border border-zinc-850" : "bg-zinc-100 border border-black"
                      }`}>
                        {selectedShipping.comments}
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTTOM METADATA BARCODE DUMMY */}
                <div className="border-t border-dashed border-zinc-800/60 pt-4 flex items-center justify-between text-[10px]">
                  <div>
                    <span className="block opacity-75 font-mono">PEDIDO: {selectedShipping.orderNumber}</span>
                    <span className="block opacity-75 font-mono">FECHA: {selectedShipping.createdAt.substring(0, 10).split("-").reverse().join("/")}</span>
                    <span className="block opacity-75 font-mono">ORIGEN: {selectedShipping.branch}</span>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    {/* BARCODE DUMMY */}
                    <div className={`font-mono text-sm tracking-wider font-bold h-6 overflow-hidden ${
                      labelTheme === "azul-oro" ? "text-zinc-500" : "text-black"
                    }`}>
                      ||| || | |||| || || | ||
                    </div>
                    <span className="text-[8px] font-mono opacity-50 block uppercase">
                      {selectedShipping.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrintLabel}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir Etiqueta ({printFormat === "compacto" ? "Ticket Térmico" : printFormat === "media-hoja" ? "Media Hoja A5" : "Hoja A4"})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: GENERAL TABLE REGISTER */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow-lg">
        {/* Table Header */}
        <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-zinc-200">PLANILLA Y REGISTRO GENERAL DE ENVÍOS</h3>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar cliente, dirección o pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 placeholder-zinc-500 text-[11px] rounded-lg px-3 py-1.5 pl-8 focus:outline-none focus:border-indigo-500 w-full"
            />
          </div>
        </div>

        {/* Table body */}
        {filteredShippings.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <FileText className="h-8 w-8 text-zinc-700 mx-auto" />
            <h4 className="font-bold text-zinc-400 text-xs">Sin registros de envíos</h4>
            <p className="text-[10px] text-zinc-500">
              No hay envíos guardados que coincidan con los criterios de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-850 font-semibold tracking-wider text-[10px]">
                  <th className="p-3">N° Pedido</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Dirección de Entrega</th>
                  <th className="p-3">Horario Delivery</th>
                  <th className="p-3">Sucursal</th>
                  <th className="p-3 text-right">Costo Envío</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredShippings.map((ship) => (
                  <tr 
                    key={ship.id} 
                    className={`hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                      selectedShipping?.id === ship.id ? "bg-indigo-600/5 border-l-2 border-indigo-500" : ""
                    }`}
                    onClick={() => setSelectedShipping(ship)}
                  >
                    {/* Order code */}
                    <td className="p-3 text-zinc-300 font-mono font-bold whitespace-nowrap">
                      {ship.orderNumber}
                    </td>

                    {/* Customer */}
                    <td className="p-3 font-semibold text-zinc-200 whitespace-nowrap">
                      {ship.customerName}
                    </td>

                    {/* Phone */}
                    <td className="p-3 text-zinc-400 whitespace-nowrap">
                      {ship.customerPhone || <span className="text-zinc-600">-</span>}
                    </td>

                    {/* Delivery address */}
                    <td className="p-3 text-zinc-300 max-w-xs truncate" title={ship.deliveryAddress}>
                      {ship.deliveryAddress}
                    </td>

                    {/* Delivery hours */}
                    <td className="p-3 text-zinc-400 max-w-xs truncate">
                      {ship.deliveryHours || <span className="text-zinc-600">-</span>}
                    </td>

                    {/* Branch */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded ${
                        ship.branch === "Montevideo" 
                          ? "bg-sky-500/15 text-sky-400" 
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}>
                        📍 {ship.branch === "Montevideo" ? "Mvd" : "Pin"}
                      </span>
                    </td>

                    {/* Logistics Fee */}
                    <td className="p-3 text-right font-mono text-zinc-100 whitespace-nowrap font-bold">
                      $ {ship.shippingCost.toLocaleString("es-UY")}
                    </td>

                    {/* Status */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2.5 py-1 rounded-full ${
                        ship.status === "Entregado"
                          ? "bg-emerald-550/15 text-emerald-400"
                          : ship.status === "Cancelado"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}>
                        {ship.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Whatsapp/Call */}
                        {ship.customerPhone && (
                          <a
                            href={`https://wa.me/${ship.customerPhone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors inline-block"
                            title="Contactar por WhatsApp"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {/* Print label */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedShipping(ship);
                            setTimeout(handlePrintLabel, 100);
                          }}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-indigo-400 transition-colors"
                          title="Imprimir Etiqueta"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => startEdit(ship)}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-yellow-400 transition-colors"
                          title="Editar Envío"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDelete(ship.id)}
                          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors"
                          title="Eliminar Envío"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORIGINS / SENDER EDIT MODAL */}
      {showOriginsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider">EDITAR ORÍGENES / REMITENTES</h3>
              <button 
                type="button"
                onClick={() => setShowOriginsModal(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* MONTEVIDEO */}
              <div className="space-y-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-850">
                <span className="text-[10px] font-black tracking-widest text-sky-400 block uppercase">
                  MONTEVIDEO (MVD)
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={mvdName}
                      onChange={(e) => setMvdName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Dirección</label>
                    <input 
                      type="text" 
                      value={mvdAddress}
                      onChange={(e) => setMvdAddress(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Contacto</label>
                    <input 
                      type="text" 
                      value={mvdContact}
                      onChange={(e) => setMvdContact(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* PINAMAR */}
              <div className="space-y-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-850">
                <span className="text-[10px] font-black tracking-widest text-emerald-400 block uppercase">
                  PINAMAR (PIN)
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Nombre</label>
                    <input 
                      type="text" 
                      value={pinName}
                      onChange={(e) => setPinName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Dirección</label>
                    <input 
                      type="text" 
                      value={pinAddress}
                      onChange={(e) => setPinAddress(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Contacto</label>
                    <input 
                      type="text" 
                      value={pinContact}
                      onChange={(e) => setPinContact(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={handleSaveOrigins}
                className="flex-grow bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer"
              >
                Guardar Orígenes
              </button>
              <button
                type="button"
                onClick={() => setShowOriginsModal(false)}
                className="bg-zinc-800 hover:bg-zinc-750 text-zinc-400 font-bold text-xs py-2 px-4 rounded-lg border border-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH SALES MODAL */}
      {showSalesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[85vh] flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-zinc-200 text-sm uppercase tracking-wider">CARGAR DESDE PEDIDOS / VENTAS</h3>
                <p className="text-[10px] text-zinc-500">Seleccione un pedido para precompletar la ficha de despacho</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowSalesModal(false)}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por cliente, mail, telefono o id de pedido..."
                value={saleSearchQuery}
                onChange={(e) => setSaleSearchQuery(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 placeholder-zinc-500 text-xs rounded-lg px-4 py-2.5 pl-10 focus:outline-none focus:border-indigo-500 w-full"
              />
            </div>

            {/* Scrollable list of orders */}
            <div className="flex-grow overflow-y-auto divide-y divide-zinc-900 min-h-0">
              {filteredOrders.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 space-y-2">
                  <FileText className="h-8 w-8 text-zinc-700 mx-auto" />
                  <p className="text-xs">No se encontraron pedidos coincidentes en el sistema.</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => loadOrderData(order)}
                    className="p-3.5 hover:bg-zinc-900/50 cursor-pointer flex items-center justify-between transition-colors rounded-xl"
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-400 text-xs">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className={`inline-flex text-[9px] px-2 py-0.5 rounded font-black ${
                          order.status === "pago_aprobado" 
                            ? "bg-emerald-500/10 text-emerald-400" 
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {order.status === "pago_aprobado" ? "Pago Aprobado" : order.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-200 font-bold">{order.customerName}</div>
                      <div className="text-[10px] text-zinc-500 flex flex-wrap gap-x-3">
                        {order.customerPhone && <span>📞 {order.customerPhone}</span>}
                        {order.customerEmail && <span>✉️ {order.customerEmail}</span>}
                        {order.createdAt && (
                          <span>📅 {order.createdAt.substring(0, 10).split("-").reverse().join("/")}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span className="block text-xs font-black text-zinc-100 font-mono">
                        $ {order.total.toLocaleString("es-UY")} UYU
                      </span>
                      <span className="text-[9px] text-zinc-500 block">
                        Cost Env: $ {order.shippingCost || 0}
                      </span>
                      <div className="inline-flex items-center gap-0.5 text-[9px] text-emerald-400 font-extrabold mt-1">
                        Cargar <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
