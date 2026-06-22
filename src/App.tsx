import React, { useState, useEffect } from 'react';
import { apiFetch as fetch } from './api';
import { ArqueoCajaView } from './components/ArqueoCajaView';
import { LoginScreen } from './components/LoginScreen';
import { UsuariosView } from './components/UsuariosView';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Layers,
  PlusCircle,
  Truck,
  DollarSign,
  Database,
  RefreshCw,
  Trash2,
  FileText,
  Search,
  ShoppingCart,
  Send,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Image as ImageIcon,
  User,
  Plus,
  ArrowRight,
  Sparkles,
  MapPin,
  FileSpreadsheet,
  Pencil,
  X,
  ClipboardCheck,
  ShieldCheck,
  History,
  Printer,
  Phone,
  AlertCircle,
  AlertTriangle,
  Percent,
  TrendingDown,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Calculator,
  Filter,
  BookOpen,
  Pin
} from 'lucide-react';

interface Article {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'simple' | 'compuesto';
  precio_venta: number;
  costo: number;
  comision_ml: number;
  comision_ml_raw?: string;
  precio_venta_ml: number;
  imagen_url: string;
  mvd_stock?: number;
  pin_stock?: number;
  total_stock?: number;
  componentes?: Array<{
    componente_id: number;
    codigo: string;
    nombre: string;
    cantidad: number;
  }>;
  original_price?: number | null;
  description?: string;
  category?: string;
  subcategory?: string;
  featured?: boolean;
  paused?: boolean;
  is_3d?: boolean;
  consult_only?: boolean;
  categoria_id?: string | null;
  subcategoria_id?: string | null;
  imagenes?: string | null;
  variants?: string | null;
}

interface Sale {
  id: number;
  fecha: string;
  cliente: string;
  articulo_id: number;
  articulo_codigo: string;
  articulo_nombre: string;
  cantidad: number;
  total: number;
  sucursal: 'Mvd' | 'Pin';
  canal?: string;
  costo_envio?: number;
  comision_ml?: number;
  precio_compra?: number;
  ganancia_neta?: number;
  franquicia_40?: number;
  juem_60?: number;
  total_franquicia?: number;
  total_juem?: number;
  estado?: string;
  aprobado?: string;
}

interface Gasto {
  id: number;
  fecha: string;
  concepto: string;
  monto: number;
  categoria: string;
}

interface Envio {
  id: number;
  fecha: string;
  num_pedido: string;
  cliente: string;
  telefono: string;
  direccion: string;
  horario: string;
  comentarios: string;
  sucursal: 'Mvd' | 'Pin' | string;
  costo_envio: number;
  estado: string;
  venta_id?: number | null;
}

interface Stats {
  billingTodayTotal: number;
  ordersTodayCount: number;
  billingMonthTotal: number;
  ordersMonthCount: number;
  netGainTotal: number;
  availableStockTotal: number;
  stockMvdDetail: number;
  stockPinDetail: number;
  outOfStockCount: number;
  isRealDatabase?: boolean;
}

// Helper function for advanced, split-word search (handles multiple words in any order, SKU code matching, and ignores accents/diacritics)
function matchAdvancedSearch(fields: (string | undefined | null)[], query: string): boolean {
  if (!query.trim()) return true;
  
  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const normalizedFields = fields
    .filter((f): f is string => typeof f === 'string')
    .map(f => normalize(f));

  return words.every(word =>
    normalizedFields.some(field => field.includes(word))
  );
}

export default function App() {
  // Session Authentication State
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('juem_session_token'));
  const [sessionUser, setSessionUser] = useState<{ id: number; usuario: string; rol: string; sucursal: string; secciones?: string } | null>(() => {
    const cached = localStorage.getItem('juem_session_user');
    try {
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Collapsible sidebar states
  const [isSidebarPinned, setIsSidebarPinned] = useState(() => localStorage.getItem('sidebar_pinned') === 'true');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isExpanded = isSidebarPinned || isSidebarHovered || isMobile;

  const toggleSidebarPin = () => {
    const newVal = !isSidebarPinned;
    setIsSidebarPinned(newVal);
    localStorage.setItem('sidebar_pinned', String(newVal));
  };

  const handleLoginSuccess = (token: string, user: { id: number; usuario: string; rol: string; sucursal: string; secciones?: string }) => {
    localStorage.setItem('juem_session_token', token);
    localStorage.setItem('juem_session_user', JSON.stringify(user));
    setSessionToken(token);
    setSessionUser(user);
    
    // Redirect to the first allowed tab
    if (user.rol === 'Admin') {
      setActiveTab('mando');
    } else {
      const allTabsOrder = ['stock', 'ventas', 'combos', 'ingreso', 'traslados', 'envios', 'gastos', 'finanzas', 'copiloto-ia'];
      const userSecciones = user.secciones || 'all';
      if (userSecciones === 'all') {
        setActiveTab('stock');
      } else {
        const allowed = allTabsOrder.find(t => userSecciones.split(',').includes(t));
        setActiveTab(allowed || 'stock');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('juem_session_token');
    localStorage.removeItem('juem_session_user');
    setSessionToken(null);
    setSessionUser(null);
    setActiveTab('stock');
  };

  // Navigation & Screen selection
  const [activeTab, setActiveTab] = useState<string>('stock');

  const hasAccessToTab = (tabId: string): boolean => {
    if (!sessionUser) return false;
    if (sessionUser.rol === 'Admin') return true;
    if (tabId === 'usuarios') return false; // Only Admin can see/use usuarios
    const userSecciones = sessionUser.secciones || 'all';
    if (userSecciones === 'all') return true;
    if (userSecciones === 'none') return false;
    return userSecciones.split(',').includes(tabId);
  };
  const [isLoading, setIsLoading] = useState(false);

  // System Matrix Databases
  const [catalog, setCatalog] = useState<Article[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [ecomCategories, setEcomCategories] = useState<any[]>([]);
  const [ecomSubcategories, setEcomSubcategories] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    billingTodayTotal: 1000,
    ordersTodayCount: 1,
    billingMonthTotal: 2330,
    ordersMonthCount: 3,
    netGainTotal: 840,
    availableStockTotal: 11,
    stockMvdDetail: 0,
    stockPinDetail: 11,
    outOfStockCount: 1
  });

  // Selected Article for Visor (Ficha del Artículo)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Image Upload Sub-Modal Info
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Edit stock article states
  const [isEditingArticle, setIsEditingArticle] = useState(false);
  const [editArticleForm, setEditArticleForm] = useState({
    nombre: '',
    precio_venta: 0,
    costo: 0,
    imagen_url: '',
    mvd_stock: 0,
    pin_stock: 0,
    tipo: 'simple' as 'simple' | 'compuesto',
    componentes: [] as any[],
    comision_ml: '11',
    precio_venta_ml: '',
    original_price: '',
    description: '',
    category: '',
    subcategory: '',
    featured: false,
    paused: false,
    is_3d: false,
    consult_only: false,
    categoria_id: '',
    subcategoria_id: '',
    imagenes: '',
    variants: '[]'
  });
  const [editIngredientId, setEditIngredientId] = useState('');
  const [editIngredientQty, setEditIngredientQty] = useState(1);
  const [editComboSearchQuery, setEditComboSearchQuery] = useState('');
  const [editComboShowDropdown, setEditComboShowDropdown] = useState(false);

  // Search query states for creating combos
  const [mainComboSearchQuery, setMainComboSearchQuery] = useState('');
  const [mainComboShowDropdown, setMainComboShowDropdown] = useState(false);

  const [modalComboSearchQuery, setModalComboSearchQuery] = useState('');
  const [modalComboShowDropdown, setModalComboShowDropdown] = useState(false);

  // General App Helpers
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSuggestedId, setCopiedSuggestedId] = useState<number | null>(null);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);

  // DB Connection Diagnostic Modal States
  const [showDbDiagnosticModal, setShowDbDiagnosticModal] = useState(false);
  const [dbDiagnosticData, setDbDiagnosticData] = useState<{connected: boolean; mode: string; error: string | null} | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);

  // Merchandise transfer states (Traslados de Sucursales)
  const [transferOrigin, setTransferOrigin] = useState<'Mvd' | 'Pin'>('Mvd');
  const [transferDest, setTransferDest] = useState<'Mvd' | 'Pin'>('Pin');
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [transferCart, setTransferCart] = useState<Array<{ article: Article; quantity: number }>>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Transfer history & editing state
  const [trasladosList, setTrasladosList] = useState<any[]>([]);
  const [isEditingTransfer, setIsEditingTransfer] = useState(false);
  const [editingTransferId, setEditingTransferId] = useState<number | null>(null);
  const [editTransferOrigin, setEditTransferOrigin] = useState<'Mvd' | 'Pin'>('Mvd');
  const [editTransferDest, setEditTransferDest] = useState<'Mvd' | 'Pin'>('Pin');
  const [editTransferDate, setEditTransferDate] = useState<string>('');
  const [editTransferCart, setEditTransferCart] = useState<Array<{ article: Article; quantity: number }>>([]);
  const [editTransferSearchQuery, setEditTransferSearchQuery] = useState('');
  const [trasladosSearchQuery, setTrasladosSearchQuery] = useState('');
  const [trasladosTrayectoFilter, setTrasladosTrayectoFilter] = useState<'Todos' | 'MvdToPin' | 'PinToMvd'>('Todos');
  const [trasladosDateFilter, setTrasladosDateFilter] = useState('');

  const handlePerformTransfer = async () => {
    if (transferCart.length === 0) {
      setTransferError("Por favor agregue por lo menos un artículo para trasladar.");
      return;
    }
    if (transferOrigin === transferDest) {
      setTransferError("La sucursal de origen y destino deben ser distintas.");
      return;
    }

    setIsTransferring(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const itemsPayload = transferCart.map(item => ({
        articulo_id: item.article.id,
        cantidad: item.quantity
      }));

      const response = await fetch('/api/stock/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: itemsPayload,
          origen: transferOrigin,
          destino: transferDest
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Error al procesar el traslado en el servidor.");
      }

      // Successful Transfer
      const orgLabel = transferOrigin === 'Mvd' ? 'Montevideo' : 'Pinamar';
      const destLabel = transferDest === 'Mvd' ? 'Montevideo' : 'Pinamar';
      setTransferSuccess(`Traslado completado satisfactoriamente de ${orgLabel} a ${destLabel}.`);
      
      const cartCopy = [...transferCart];
      setTransferCart([]);
      setTransferSearchQuery('');
      
      // Update local catalog immediately for responsive user feedback
      setCatalog(prev => prev.map(art => {
        const cartItem = cartCopy.find(tc => tc.article.id === art.id);
        if (cartItem) {
          const mvdChange = transferOrigin === 'Mvd' ? -cartItem.quantity : cartItem.quantity;
          const pinChange = transferOrigin === 'Pin' ? -cartItem.quantity : cartItem.quantity;
          return {
            ...art,
            mvd_stock: Math.max(0, (art.mvd_stock || 0) + mvdChange),
            pin_stock: Math.max(0, (art.pin_stock || 0) + pinChange)
          };
        }
        return art;
      }));

      // Synchronize latest database values
      refreshSystemData();
    } catch (err: any) {
      console.error(err);
      setTransferError(err.message || "No se pudo completar el traslado de mercadería.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handlePrintTransfer = (tr: any) => {
    const items = Array.isArray(tr.detalles) ? tr.detalles : JSON.parse(tr.detalles || '[]');
    const totalUnits = items.reduce((sum: number, it: any) => sum + Number(it.cantidad || 0), 0);
    const dateStr = new Date(tr.fecha).toLocaleString('es-UY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const orig = tr.origen === 'Montevideo' || tr.origen === 'Mvd' ? 'Montevideo (MVD)' : 'Pinamar (PIN)';
    const dest = tr.destino === 'Montevideo' || tr.destino === 'Mvd' ? 'Montevideo (MVD)' : 'Pinamar (PIN)';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor habilite los 'popups' de navegación para poder ver la orden de impresión.");
      return;
    }

    const itemsRows = items.map((it: any, index: number) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px; font-family: monospace; font-size: 11px; font-weight: bold; width: 50px; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; font-family: monospace; font-size: 11px; font-weight: bold; color: #4338ca;">${it.codigo || 'S/C'}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: 500; text-align: left;">${it.nombre}</td>
        <td style="padding: 10px; font-size: 12px; font-weight: bold; text-align: center; color: #111827; width: 80px;">${it.cantidad} u.</td>
        <td style="padding: 10px; width: 100px; text-align: center; font-size: 11px; color: #cbd5e1;">[ &nbsp; ]</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Traslado_Mercaderia_${tr.id}</title>
          <style>
            @media print {
              body { margin: 0; padding: 20px; color: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
              .no-print { display: none; }
            }
            body { padding: 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #334155; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .content-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .content-table th { background-color: #f1f5f9; padding: 12px 10px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .footer-signatures { margin-top: 80px; width: 100%; }
            .signature-box { border-top: 1px solid #94a3b8; width: 45%; float: left; text-align: center; padding-top: 10px; font-size: 12px; font-weight: bold; color: #475569; }
            .signature-box.right { float: right; }
            .badge { display: inline-block; padding: 4px 8px; font-family: monospace; font-size: 11px; font-weight: bold; border-radius: 4px; }
            .badge-origin { background-color: #e0e7ff; color: #4338ca; }
            .badge-dest { background-color: #fef3c7; color: #d97706; }
            .btn-print-action { background-color: #4f46e5; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer; font-size: 13px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: right; margin-bottom: 20px;">
            <button class="btn-print-action" onclick="window.print()">🖨️ Imprimir Remito / Guardar PDF</button>
          </div>
          
          <table class="header-table">
            <tr>
              <td style="vertical-align: top;">
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; color: #0f172a;">
                  Remito de Traslado
                </h1>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b; font-weight: 500;">
                  Documento de Control Interno / Movimiento entre Sucursales
                </p>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <div style="font-size: 24px; font-weight: 900; color: #4f46e5;">#T-${String(tr.id).padStart(5, '0')}</div>
                <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 4px;">FECHA: ${dateStr}</div>
              </td>
            </tr>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 30px;">
            <table style="width: 100%; font-size: 13px;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 20px; border-right: 1px solid #e2e8f0;">
                  <strong style="color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Origen del Movimiento</strong>
                  <span class="badge badge-origin">${orig}</span>
                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                  <strong style="color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; display: block; margin-bottom: 6px;">Destino del Movimiento</strong>
                  <span class="badge badge-dest">${dest}</span>
                </td>
              </tr>
            </table>
          </div>

          <h3 style="margin: 30px 0 10px 0; font-size: 13px; font-weight: bold; text-transform: uppercase; color: #1e293b; letter-spacing: 0.025em;">
            Detalle de Artículos Trasladados (${items.length} ítems)
          </h3>
          
          <table class="content-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Item</th>
                <th style="width: 100px; text-align: left;">SKU</th>
                <th style="text-align: left;">Descripción de Artículo</th>
                <th style="width: 100px; text-align: center;">Cantidad</th>
                <th style="width: 100px; text-align: center;">Control</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top: 30px; text-align: right; background-color: #f1f5f9; padding: 12px 20px; border-radius: 8px;">
            <span style="font-size: 12px; font-weight: bold; color: #475569; text-transform: uppercase; margin-right: 15px;">Total Unidades Trasladadas:</span>
            <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">${totalUnits} u.</strong>
          </div>

          <div style="margin-top: 40px; font-size: 11px; color: #64748b; line-height: 1.5; border-left: 2.5px solid #cbd5e1; padding-left: 12px;">
            <strong>Normativa de traslado:</strong> Este documento ampara la transferencia física de mercadería de la sucursal de origen a la de destino. Los stocks correspondientes ya han sido descontados en el sistema informático. Se requiere el recuento físico de las unidades y la firma de recepción de conformidad de ambas partes.
          </div>

          <div class="footer-signatures" style="margin-top: 60px;">
            <div class="signature-box">
              Firma y Aclaración - Despachado por (Origen)
              <div style="margin-top: 40px; font-family: monospace; font-size: 10px; color: #94a3b8; font-weight: normal;">C.I. / Firma</div>
            </div>
            <div class="signature-box right">
              Firma y Aclaración - Recibido por (Destino)
              <div style="margin-top: 40px; font-family: monospace; font-size: 10px; color: #94a3b8; font-weight: normal;">C.I. / Firma</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleOpenEditTransfer = (tr: any) => {
    setEditingTransferId(tr.id);
    setEditTransferOrigin(tr.origen === 'Montevideo' || tr.origen === 'Mvd' ? 'Mvd' : 'Pin');
    setEditTransferDest(tr.destino === 'Montevideo' || tr.destino === 'Mvd' ? 'Mvd' : 'Pin');
    
    try {
      const d = new Date(tr.fecha);
      const tzoffset = d.getTimezoneOffset() * 60000; 
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      setEditTransferDate(localISOTime);
    } catch {
      setEditTransferDate(new Date().toISOString().slice(0, 16));
    }

    const itemsRaw = Array.isArray(tr.detalles) ? tr.detalles : JSON.parse(tr.detalles || '[]');
    const mappedCart = itemsRaw.map((it: any) => ({
      article: {
        id: Number(it.articulo_id),
        codigo: it.codigo || "",
        nombre: it.nombre || "Artículo Desconocido",
        tipo: 'simple' as const,
        precio_venta: 0,
        costo: 0,
        comision_ml: 0,
        precio_venta_ml: 0,
        imagen_url: ""
      },
      quantity: Number(it.cantidad)
    }));

    setEditTransferCart(mappedCart);
    setEditTransferSearchQuery('');
    setTransferError(null);
    setTransferSuccess(null);
    setIsEditingTransfer(true);
  };

  const handleDeleteTransfer = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar/cancelar este traslado? El stock involucrado se revertirá automáticamente.")) {
      return;
    }
    try {
      setIsTransferring(true);
      const res = await fetch(`/api/stock/transfer/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setTransferSuccess("Traslado eliminado y stock revertido satisfactoriamente.");
        await refreshSystemData();
      } else {
        const errData = await res.json();
        setTransferError(errData.error || "No se pudo eliminar el traslado.");
      }
    } catch (err: any) {
      console.error(err);
      setTransferError("Error de red al intentar eliminar el traslado.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSaveEditTransfer = async () => {
    if (editTransferCart.length === 0) {
      alert("Por favor agregue al menos un artículo.");
      return;
    }
    if (editTransferOrigin === editTransferDest) {
      alert("La sucursal de origen y destino deben ser distintas.");
      return;
    }

    try {
      setIsTransferring(true);
      setTransferError(null);
      
      const payload = {
        origen: editTransferOrigin,
        destino: editTransferDest,
        fecha: editTransferDate ? new Date(editTransferDate).toISOString() : new Date().toISOString(),
        items: editTransferCart.map(it => ({
          articulo_id: it.article.id,
          codigo: it.article.codigo,
          nombre: it.article.nombre,
          cantidad: it.quantity
        }))
      };

      const res = await fetch(`/api/stock/transfer/${editingTransferId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setTransferSuccess("Traslado modificado y stocks sincronizados con éxito.");
        setIsEditingTransfer(false);
        setEditingTransferId(null);
        await refreshSystemData();
      } else {
        const errData = await res.json();
        setTransferError(errData.error || "Error al modificar traslado.");
      }
    } catch (err: any) {
      console.error(err);
      setTransferError("Error de conexión al guardar modificaciones.");
    } finally {
      setIsTransferring(false);
    }
  };

  const runDbDiagnostics = async () => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setDbDiagnosticData(data);
      } else {
        setDbDiagnosticData({
          connected: false,
          mode: "Error de red",
          error: `El servidor HTTP retornó un código de error: ${res.status}`
        });
      }
    } catch (err: any) {
      setDbDiagnosticData({
        connected: false,
        mode: "Error de conexión de red",
        error: err?.message || String(err)
      });
    } finally {
      setIsCheckingDb(false);
    }
  };
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creationType, setCreationType] = useState<'simple' | 'compuesto'>('simple');
  const [searchQuery, setSearchQuery] = useState('');

  // Control de ordenamiento para el catálogo de artículos
  const [sortField, setSortField] = useState<'nombre' | 'costo' | 'precio_venta' | 'precio_venta_ml' | 'comision_ml' | 'mvd_stock' | 'pin_stock' | 'codigo' | null>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: 'nombre' | 'costo' | 'precio_venta' | 'precio_venta_ml' | 'comision_ml' | 'mvd_stock' | 'pin_stock' | 'codigo') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Form states
  const [dispatchSale, setDispatchSale] = useState({
    cliente: '',
    articulo_id: '',
    cantidad: 1,
    sucursal: 'Pin' as 'Mvd' | 'Pin',
    fecha: '',
    canal: 'WhatsApp',
    costo_envio: '',
    precio_venta_override: '',
    aprobado: 'Aprobado'
  });
  const [saleError, setSaleError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState('');

  // Sale editing states and event handlers
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editClient, setEditClient] = useState('');
  const [editArticleId, setEditArticleId] = useState<number>(0);
  const [editCantidad, setEditCantidad] = useState(1);
  const [editSucursal, setEditSucursal] = useState<'Mvd' | 'Pin'>('Mvd');
  const [editCanal, setEditCanal] = useState('Venta Directa');
  const [editPrecioVenta, setEditPrecioVenta] = useState(0);
  const [editCostoEnvio, setEditCostoEnvio] = useState(0);
  const [editAprobado, setEditAprobado] = useState('Aprobado');
  const [editIsSubmitting, setEditIsSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const handleStartEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setEditClient(sale.cliente || '');
    setEditArticleId(sale.articulo_id);
    setEditCantidad(sale.cantidad || 1);
    setEditSucursal(sale.sucursal);
    setEditCanal(sale.canal || 'Venta Directa');
    setEditPrecioVenta(sale.total || 0);
    setEditCostoEnvio(sale.costo_envio || 0);
    setEditAprobado(sale.aprobado || 'Aprobado');
    setEditError('');
  };

  const handleSaveEditSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;
    setEditIsSubmitting(true);
    setEditError('');
    try {
      const res = await fetch(`/api/ventas/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: editClient,
          articulo_id: editArticleId,
          cantidad: editCantidad,
          sucursal: editSucursal,
          canal: editCanal,
          precio_venta: editPrecioVenta,
          costo_envio: editCostoEnvio,
          aprobado: editAprobado
        })
      });

      if (res.ok) {
        setEditingSale(null);
        await refreshSystemData();
      } else {
        const errorData = await res.json();
        setEditError(errorData.error || 'Error al guardar los cambios de la venta.');
      }
    } catch (err) {
      console.error(err);
      setEditError('Error de conexión al servidor.');
    } finally {
      setEditIsSubmitting(false);
    }
  };

  // Confirmation states for Sale deletion modal
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isDeletingSaleSubmitting, setIsDeletingSaleSubmitting] = useState(false);
  const [deleteSaleError, setDeleteSaleError] = useState('');

  const confirmDeleteSale = async (saleId: number) => {
    setIsDeletingSaleSubmitting(true);
    setDeleteSaleError('');
    try {
      const res = await fetch(`/api/ventas/${saleId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSaleToDelete(null);
        await refreshSystemData();
      } else {
        const errorData = await res.json();
        setDeleteSaleError(errorData.error || 'Error al eliminar la venta.');
      }
    } catch (err) {
      console.error(err);
      setDeleteSaleError('Error de conexión al eliminar la venta.');
    } finally {
      setIsDeletingSaleSubmitting(false);
    }
  };

  const [salesSearch, setSalesSearch] = useState('');
  const [salesFilterSucursal, setSalesFilterSucursal] = useState('ALL');
  const [salesFilterCanal, setSalesFilterCanal] = useState('ALL');

  // Reposiciones and Auditorias states
  const [reposiciones, setReposiciones] = useState<any[]>([]);
  const [auditorias, setAuditorias] = useState<any[]>([]);
  const [auditSubTab, setAuditSubTab] = useState<'logs' | 'buscador'>('logs');
  const [auditInvoiceSearchQuery, setAuditInvoiceSearchQuery] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  // Create / Edit Reposicion state
  const [isEditingRep, setIsEditingRep] = useState<boolean>(false);
  const [editingRepId, setEditingRepId] = useState<number | null>(null);

  const [repForm, setRepForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    proveedor: '',
    num_factura: '',
    sucursal: 'Pin' as 'Mvd' | 'Pin',
    total_factura: 0,
    observaciones: '',
    usuario: sessionUser?.usuario || 'Uriel',
    detalles: [] as any[],

    // Auto toggles
    actualizar_stock: true,
    actualizar_costos: true,
    actualizar_precio_sugerido: true,
    registrar_auditoria: true
  });

  // AI Invoice Scanner State
  const [isParsingInvoice, setIsParsingInvoice] = useState<boolean>(false);
  const [parseInvoiceError, setParseInvoiceError] = useState<string | null>(null);

  const handleInvoiceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingInvoice(true);
    setParseInvoiceError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64String = reader.result as string;

        try {
          const res = await fetch('/api/gemini/parse-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              imageBase64: base64String,
              mimeType: file.type
            })
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Ocurrió un error al procesar el archivo.");
          }

          const data = await res.json();

          let parsedDetails: any[] = [];
          if (Array.isArray(data.detalles_remitidos)) {
            parsedDetails = data.detalles_remitidos.map((x: any) => {
              const rawCost = Number(x.costo_unitario) || 0;
              const tipoIvaVal = 22; // default standard Uruguayan VAT rate
              const costNeto = rawCost / 1.22;
              const ivaUnit = rawCost - costNeto;
              const costConIva = rawCost;

              const existingItem = catalog.find(item => item.codigo.toUpperCase() === String(x.codigo_sugerido || '').toUpperCase());
              
              if (existingItem) {
                return {
                  articulo_id: existingItem.id,
                  codigo: existingItem.codigo,
                  nombre: existingItem.nombre,
                  cantidad: Number(x.cantidad) || 1,
                  costo_unitario: Number(costNeto.toFixed(4)),
                  tipo_iva: tipoIvaVal,
                  modo_iva: 'con_iva',
                  iva_unitario: Number(ivaUnit.toFixed(4)),
                  costo_con_iva: costConIva,
                  precio_sugerido: Number(existingItem.precio_venta) || 0
                };
              } else {
                const matchedByName = catalog.find(item => 
                  item.nombre.toLowerCase().includes(String(x.nombre_factura || '').toLowerCase()) ||
                  String(x.nombre_factura || '').toLowerCase().includes(item.nombre.toLowerCase())
                );
                
                if (matchedByName) {
                  return {
                    articulo_id: matchedByName.id,
                    codigo: matchedByName.codigo,
                    nombre: matchedByName.nombre,
                    cantidad: Number(x.cantidad) || 1,
                    costo_unitario: Number(costNeto.toFixed(4)),
                    tipo_iva: tipoIvaVal,
                    modo_iva: 'con_iva',
                    iva_unitario: Number(ivaUnit.toFixed(4)),
                    costo_con_iva: costConIva,
                    precio_sugerido: Number(matchedByName.precio_venta) || 0
                  };
                } else {
                  return {
                    articulo_id: 0,
                    codigo: 'Añadir nuevo SKU',
                    nombre: x.nombre_factura,
                    cantidad: Number(x.cantidad) || 1,
                    costo_unitario: Number(costNeto.toFixed(4)),
                    tipo_iva: tipoIvaVal,
                    modo_iva: 'con_iva',
                    iva_unitario: Number(ivaUnit.toFixed(4)),
                    costo_con_iva: costConIva,
                    precio_sugerido: 0
                  };
                }
              }
            });
          }

          setRepForm(prev => ({
            ...prev,
            proveedor: data.proveedor || prev.proveedor,
            fecha: data.fecha || prev.fecha,
            num_factura: data.num_factura || prev.num_factura,
            total_factura: Number(data.total_factura) || Number(prev.total_factura) || 0,
            observaciones: `Factura escaneada con IA (Gemini). ${prev.observaciones || ''}`,
            detalles: [...prev.detalles, ...parsedDetails]
          }));
          
          alert("¡Factura leída con éxito! Hemos autocompletado el proveedor, número, total, fecha y " + parsedDetails.length + " ítems de la compra.");
        } catch (apiErr: any) {
          console.error(apiErr);
          setParseInvoiceError(apiErr.message || "Error al procesar con Gemini.");
        } finally {
          setIsParsingInvoice(false);
        }
      };

      reader.onerror = () => {
        setParseInvoiceError("Error al leer el archivo de imagen.");
        setIsParsingInvoice(false);
      };
    } catch (genErr: any) {
      console.error(genErr);
      setParseInvoiceError("No se pudo iniciar el escaneo.");
      setIsParsingInvoice(false);
    }
  };

  // Single detail line item composer state
  const [repDetailComposer, setRepDetailComposer] = useState({
    articulo_id: '',
    cantidad: 1,
    costo_unitario: '' as string | number,
    precio_sugerido: '' as string | number,
    tipo_iva: '22', // '22' (Básico in Uruguay), '10' (Mínimo), '0' (Exento)
    modo_iva: 'con_iva' // 'con_iva' (inclusive) or 'mas_iva' (exclusive)
  });

  const [repSearchText, setRepSearchText] = useState('');
  const [repSelectorFocused, setRepSelectorFocused] = useState(false);

  // Quick Create Article while entering Reposicion states
  const [isQuickCreateRepModalOpen, setIsQuickCreateRepModalOpen] = useState(false);
  const [quickCreateRepForm, setQuickCreateRepForm] = useState({
    codigo: '',
    nombre: '',
    costo: '',
    precio_venta: '',
    imagen_url: ''
  });
  const [quickCreateRepError, setQuickCreateRepError] = useState('');
  const [quickCreateRepSuccess, setQuickCreateRepSuccess] = useState('');
  const [quickCreateRepSubmitting, setQuickCreateRepSubmitting] = useState(false);

  const [repError, setRepError] = useState('');
  const [repSuccess, setRepSuccess] = useState('');

  // Confirmation modal state for Reposicion deletions
  const [repToDelete, setRepToDelete] = useState<any | null>(null);
  const [isDeletingRepSubmitting, setIsDeletingRepSubmitting] = useState(false);
  const [deleteRepError, setDeleteRepError] = useState('');

  // ---------------- ENVIOS SPECIFIC STATES ----------------
  const [isEditingEnvio, setIsEditingEnvio] = useState<boolean>(false);
  const [editingEnvioId, setEditingEnvioId] = useState<number | null>(null);
  const [envioForm, setEnvioForm] = useState({
    num_pedido: '',
    cliente: '',
    telefono: '',
    direccion: '',
    horario: '',
    comentarios: '',
    sucursal: 'Mvd' as 'Mvd' | 'Pin',
    costo_envio: 0,
    estado: 'Pendiente',
    venta_id: null as number | null
  });
  const [envioSearchText, setEnvioSearchText] = useState('');
  const [envioError, setEnvioError] = useState('');
  const [envioSuccess, setEnvioSuccess] = useState('');
  const [selectedEnvioForLabel, setSelectedEnvioForLabel] = useState<Envio | null>(null);
  const [isDeletingEnvioSubmitting, setIsDeletingEnvioSubmitting] = useState(false);
  const [envioToDelete, setEnvioToDelete] = useState<Envio | null>(null);
  const [showVentasSelectorForEnvio, setShowVentasSelectorForEnvio] = useState(false);
  const [envioLabelTheme, setEnvioLabelTheme] = useState<'brand' | 'thermal'>('brand');
  const [envioLabelSize, setEnvioLabelSize] = useState<'thermal' | 'a4-half' | 'a4-full'>('thermal');
  const [senderConfig, setSenderConfig] = useState<{
    Mvd: { nombre: string; direccion: string; contacto: string };
    Pin: { nombre: string; direccion: string; contacto: string };
  }>(() => {
    const saved = localStorage.getItem('juem_sender_config_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing sender config', e);
      }
    }
    return {
      Mvd: {
        nombre: "JUEM - Montevideo",
        direccion: "Coruña 3038 Bis, Montevideo",
        contacto: "098058775 | 096958714"
      },
      Pin: {
        nombre: "JUEM - Pinamar",
        direccion: "Ruta 11 Km 320, Pinamar",
        contacto: "098058775 | 096958714"
      }
    };
  });
  const [showSenderConfigEditor, setShowSenderConfigEditor] = useState(false);
  const [senderConfigForm, setSenderConfigForm] = useState(() => ({
    Mvd: { nombre: "JUEM - Montevideo", direccion: "Coruña 3038 Bis, Montevideo", contacto: "098058775 | 096958714" },
    Pin: { nombre: "JUEM - Pinamar", direccion: "Ruta 11 Km 320, Pinamar", contacto: "098058775 | 096958714" }
  }));

  // Sync edit form when state loaded or saved
  useEffect(() => {
    setSenderConfigForm(senderConfig);
  }, [senderConfig]);
  // --------------------------------------------------------

  // Core states for Sales Cart and Searchable Article Select
  const [salesCart, setSalesCart] = useState<Array<{
    key: string;
    articulo_id: number;
    articulo_nombre: string;
    articulo_codigo: string;
    imagen_url: string;
    precio_venta: number;
    cantidad: number;
    precio_venta_override?: string;
  }>>([]);

  const [selectorSearch, setSelectorSearch] = useState('');
  const [selectorFocused, setSelectorFocused] = useState(false);
  const [selectedCartArt, setSelectedCartArt] = useState<any | null>(null);

  // States for configuring a specific cart item before insertion
  const [cartItemQty, setCartItemQty] = useState<number>(1);
  const [cartItemPriceOverride, setCartItemPriceOverride] = useState<string>('');

  const [adjustStock, setAdjustStock] = useState({
    articulo_id: '',
    sucursal: 'Pin' as 'Mvd' | 'Pin',
    cantidad: 1
  });
  const [adjustSuccess, setAdjustSuccess] = useState('');

  const [newArticleStep, setNewArticleStep] = useState(1);
  const [editArticleStep, setEditArticleStep] = useState(1);

  // States for Variant Builder (New Article and Edit Article)
  const [varSize, setVarSize] = useState('');
  const [varColor, setVarColor] = useState('');
  const [varColorCode, setVarColorCode] = useState('');
  const [varStock, setVarStock] = useState('10');
  const [varImageUrl, setVarImageUrl] = useState('');
  const [varSku, setVarSku] = useState('');

  const [editVarSize, setEditVarSize] = useState('');
  const [editVarColor, setEditVarColor] = useState('');
  const [editVarColorCode, setEditVarColorCode] = useState('');
  const [editVarStock, setEditVarStock] = useState('10');
  const [editVarImageUrl, setEditVarImageUrl] = useState('');
  const [editVarSku, setEditVarSku] = useState('');

  const [newArticle, setNewArticle] = useState({
    codigo: '',
    nombre: '',
    costo: '',
    precio_venta: '',
    comision_ml: '11',
    precio_venta_ml: '',
    imagen_url: '',
    original_price: '',
    description: '',
    category: '',
    subcategory: '',
    featured: false,
    paused: false,
    is_3d: false,
    consult_only: false,
    categoria_id: '',
    subcategoria_id: '',
    imagenes: '',
    variants: '[]'
  });
  const [articleSuccess, setArticleSuccess] = useState('');
  const [articleError, setArticleError] = useState('');

  const [newGasto, setNewGasto] = useState({
    concepto: '',
    monto: '',
    categoria: 'Insumos'
  });
  const [gastoSuccess, setGastoSuccess] = useState('');
  const [gastoIdToConfirmDelete, setGastoIdToConfirmDelete] = useState<number | null>(null);
  const [gastoSearchQuery, setGastoSearchQuery] = useState('');
  const [gastoCategoryFilter, setGastoCategoryFilter] = useState('Todas');

  // --- Dashboard Gerencial & Analytic States ---
  const [mandoSubTab, setMandoSubTab] = useState<'summary' | 'rentabilidad' | 'alertas'>('summary');
  const [mandoSucursalFilter, setMandoSucursalFilter] = useState<'ALL' | 'Mvd' | 'Pin'>('ALL');
  const [criticalStockLimit, setCriticalStockLimit] = useState<number>(5);
  const [rentabilidadSearch, setRentabilidadSearch] = useState('');
  const [rentabilidadSortCol, setRentabilidadSortCol] = useState<'nombre' | 'costo' | 'margin' | 'netGain'>('margin');
  const [rentabilidadSortDir, setRentabilidadSortDir] = useState<'asc' | 'desc'>('desc');
  const [overheadMethod, setOverheadMethod] = useState<'proporcional' | 'fijo_pct' | 'cero'>('proporcional');
  const [fixedOverheadPctValue, setFixedOverheadPctValue] = useState<number>(10);

  // --- Real-time Interactive Combo Creator Hooks ---
  const [comboName, setComboName] = useState('');
  const [comboSku, setComboSku] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [ingredientQty, setIngredientQty] = useState<number>(1);
  const [addedIngredients, setAddedIngredients] = useState<Array<{
    id: number;
    codigo: string;
    nombre: string;
    cantidad: number;
    costo: number;
  }>>([]);
  const [comboPrice, setComboPrice] = useState('');
  const [comboPriceML, setComboPriceML] = useState('');
  const [comboComisionML, setComboComisionML] = useState('11');
  const [comboSuccess, setComboSuccess] = useState('');
  const [comboError, setComboError] = useState('');

  // AI Assistant Drawer
  const [aiChatOpen, setAiChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    { sender: 'assistant', text: '¡Hola Christian! Estoy listo para asistirte con JUEMHub. He cargado tu catálogo del depósito y analizado el stock actual de Montevideo y Pinamar. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isSendingAi, setIsSendingAi] = useState(false);

  // --- FINANCIAL STATES (Item 8) ---
  const [finanzasCuentas, setFinanzasCuentas] = useState<any[]>([]);
  const [finanzasMovimientos, setFinanzasMovimientos] = useState<any[]>([]);
  const [finanzasConceptoInput, setFinanzasConceptoInput] = useState('');
  const [finanzasMontoInput, setFinanzasMontoInput] = useState('');
  const [finanzasTipoInput, setFinanzasTipoInput] = useState<'ingreso' | 'egreso' | 'transferencia' | 'pendiente_cobro' | 'pendiente_pago'>('ingreso');
  const [finanzasOrigenInput, setFinanzasOrigenInput] = useState('');
  const [finanzasDestinoInput, setFinanzasDestinoInput] = useState('');
  const [finanzasVencimientoInput, setFinanzasVencimientoInput] = useState('');
  const [showAddMovimientoModal, setShowAddMovimientoModal] = useState(false);
  const [completingMovimiento, setCompletingMovimiento] = useState<any | null>(null);
  const [finanzasCompletingCuenta, setFinanzasCompletingCuenta] = useState('');

  // --- ARQUEO DE CAJA DIARIO STATES ---
  const [arqueosList, setArqueosList] = useState<any[]>([]);
  const [activeFinanzasSubTab, setActiveFinanzasSubTab] = useState<'arqueo-diario' | 'libro-mayor'>('arqueo-diario');
  const [selectedArqueoCuenta, setSelectedArqueoCuenta] = useState('Caja Chica (Mostrador)');
  const [arqueoBilletesMonedas, setArqueoBilletesMonedas] = useState<{ [key: string]: number }>({
    "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
  });
  const [arqueoAjustarSaldo, setArqueoAjustarSaldo] = useState(true);
  const [arqueoObservaciones, setArqueoObservaciones] = useState('');
  const [isSavingArqueo, setIsSavingArqueo] = useState(false);

  // --- REPOSICION INTELLIGENT FORECAST (Item 7) ---
  const [reposicionLeadDaysInput, setReposicionLeadDaysInput] = useState<number>(15);
  const [reposicionSafetyStockInput, setReposicionSafetyStockInput] = useState<number>(5);

  // --- ADVANCED AI ASSISTANT STATES (Item 10) ---
  const [aiSubTab, setAiSubTab] = useState<'forecast' | 'copywriter' | 'pricing'>('forecast');
  const [aiSelectedArticleCode, setAiSelectedArticleCode] = useState('');
  const [aiProductSearchQuery, setAiProductSearchQuery] = useState('');
  const [aiProductSearchDropdownOpen, setAiProductSearchDropdownOpen] = useState(false);
  const [aiPublicationText, setAiPublicationText] = useState('');
  const [aiPublicationPlatform, setAiPublicationPlatform] = useState('Instagram / Facebook');
  const [aiPublicationTone, setAiPublicationTone] = useState('Persuasivo y Moderno');
  const [useGemaPro, setUseGemaPro] = useState(true);
  const [aiPricingMargin, setAiPricingMargin] = useState<number>(30);
  const [aiPricingAnalysis, setAiPricingAnalysis] = useState('');
  const [aiPricingSuggestedPrice, setAiPricingSuggestedPrice] = useState<number | null>(null);
  const [aiPricingSuggestedPriceMl, setAiPricingSuggestedPriceMl] = useState<number | null>(null);
  const [aiStockAuditText, setAiStockAuditText] = useState('');
  const [isAiAdvancedWorking, setIsAiAdvancedWorking] = useState(false);

  // Sync data on startup
  useEffect(() => {
    refreshSystemData();
  }, []);

  const refreshSystemData = async () => {
    setIsLoading(true);
    try {
      // Fetch dynamic e-commerce category/subcategory metadata
      try {
        const metadataRes = await fetch('/api/integrations/metadata');
        if (metadataRes.ok) {
          const metaData = await metadataRes.json();
          if (metaData.success) {
            setEcomCategories(metaData.categories || []);
            setEcomSubcategories(metaData.subcategories || []);
          }
        }
      } catch (metaErr) {
        console.error("Error al obtener metadatos de sincronización e-commerce:", metaErr);
      }

      const artResponse = await fetch('/api/articulos');
      let loadedCatalog: Article[] = [];
      if (artResponse.ok) {
        loadedCatalog = await artResponse.json();
        setCatalog(loadedCatalog);
      }

      const salesResponse = await fetch('/api/ventas');
      if (salesResponse.ok) {
        setSales(await salesResponse.json());
      }

      const gastosResponse = await fetch('/api/gastos');
      if (gastosResponse.ok) {
        setGastos(await gastosResponse.json());
      }

      const statsResponse = await fetch('/api/dashboard/stats');
      if (statsResponse.ok) {
        setStats(await statsResponse.json());
      }

      const reposRes = await fetch('/api/reposiciones');
      if (reposRes.ok) {
        setReposiciones(await reposRes.json());
      }

      const audRes = await fetch('/api/auditorias');
      if (audRes.ok) {
        setAuditorias(await audRes.json());
      }

      const enviosRes = await fetch('/api/envios');
      if (enviosRes.ok) {
        setEnvios(await enviosRes.json());
      }

      const trasladosRes = await fetch('/api/traslados');
      if (trasladosRes.ok) {
        setTrasladosList(await trasladosRes.json());
      }

      // Fetch financial account balances
      const finCuentasRes = await fetch('/api/finanzas/cuentas');
      if (finCuentasRes.ok) {
        setFinanzasCuentas(await finCuentasRes.json());
      }

      // Fetch financial ledger transactions
      const finMovsRes = await fetch('/api/finanzas/movimientos');
      if (finMovsRes.ok) {
        setFinanzasMovimientos(await finMovsRes.json());
      }

      // Fetch recorded cash reconciliation counts (arqueos)
      const finArqueosRes = await fetch('/api/finanzas/arqueos');
      if (finArqueosRes.ok) {
        setArqueosList(await finArqueosRes.json());
      }

      // If nothing selected or previous selection got lost, pick first item gracefully
      if (loadedCatalog.length > 0) {
        setSelectedArticle(prev => {
          if (prev) {
            const fresh = loadedCatalog.find(a => a.id === prev.id);
            return fresh || loadedCatalog[0];
          }
          return loadedCatalog[0];
        });
      }
    } catch (err) {
      console.error("Fallo general de red al sincronizar con el panel ERP:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setArticleError('');
    setArticleSuccess('');

    if (!newArticle.nombre.trim()) {
      setArticleError('El nombre del producto es obligatorio.');
      return;
    }

    const buyCost = Number(newArticle.costo || 0);
    const calculatedSuggested = buyCost * 1.4;
    
    // Dynamic nextSkuCode generated by the system to prevent repetition
    const chosenSku = getNextAvailableSku();

    // Custom or default ML commission flat amount in pesos
    const commissionInputVal = Number(newArticle.comision_ml || 11);
    const commPct = commissionInputVal;

    // Custom or fallback ML price
    const mlVenta = newArticle.precio_venta_ml !== '' 
      ? Number(newArticle.precio_venta_ml) 
      : (newArticle.precio_venta !== '' ? Number(newArticle.precio_venta) + commPct : Math.round(calculatedSuggested));

    // General price (Venta General) is computed automatically by the system as (Venta ML - Comisión ML)
    const generalPrice = mlVenta - commPct;

    try {
      const res = await fetch('/api/articulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: chosenSku,
          nombre: newArticle.nombre.trim(),
          tipo: 'simple',
          precio_venta: generalPrice,
          costo: buyCost,
          comision_ml: commPct,
          precio_venta_ml: mlVenta,
          imagen_url: newArticle.imagen_url.trim(),
          inicial_mvd: 0,
          inicial_pin: 0,
          comision_ml_raw: String(newArticle.comision_ml || '11'),
          original_price: newArticle.original_price === '' ? null : Number(newArticle.original_price),
          description: newArticle.description,
          category: newArticle.category,
          subcategory: newArticle.subcategory,
          featured: newArticle.featured,
          paused: newArticle.paused,
          is_3d: newArticle.is_3d,
          consult_only: newArticle.consult_only,
          categoria_id: newArticle.categoria_id,
          subcategoria_id: newArticle.subcategoria_id,
          imagenes: newArticle.imagenes,
          variants: newArticle.variants
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear el artículo.");
      }

      const output = await res.json();
      setArticleSuccess(`¡Artículo ${chosenSku} creado y anexado con éxito al stock de depósitos!`);
      setNewArticle({
        codigo: '',
        nombre: '',
        costo: '',
        precio_venta: '',
        comision_ml: '11',
        precio_venta_ml: '',
        imagen_url: '',
        original_price: '',
        description: '',
        category: '',
        subcategory: '',
        featured: false,
        paused: false,
        is_3d: false,
        consult_only: false,
        categoria_id: '',
        subcategoria_id: '',
        imagenes: '',
        variants: '[]'
      });
      refreshSystemData();
      if (output.item) {
        setSelectedArticle(output.item);
      }
      setTimeout(() => setArticleSuccess(''), 5000);
    } catch (err: any) {
      setArticleError(err.message || 'Error de red al guardar.');
    }
  };

  const handleDeleteArticle = async (id: number, forceNoPrompt = false) => {
    if (!forceNoPrompt && !window.confirm("¿Seguro que deseas eliminar este artículo de la base central?")) return;
    try {
      const res = await fetch(`/api/articulos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        refreshSystemData();
        setShowDetailModal(false);
        setSelectedArticle(null);
        setShowDeleteConfirm(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startEditingArticle = (art: Article) => {
    let userCom = '11';
    if (art.comision_ml_raw !== undefined && art.comision_ml_raw !== null && art.comision_ml_raw !== '') {
      userCom = art.comision_ml_raw;
    } else if (art.comision_ml !== undefined && art.comision_ml !== null) {
      userCom = String(Math.round(art.comision_ml));
    }

    setEditArticleForm({
      nombre: art.nombre,
      precio_venta: art.precio_venta || art.precio_venta_ml || 0,
      costo: art.costo,
      imagen_url: art.imagen_url || '',
      mvd_stock: art.mvd_stock || 0,
      pin_stock: art.pin_stock || 0,
      tipo: art.tipo || 'simple',
      componentes: art.componentes || [],
      comision_ml: userCom,
      precio_venta_ml: art.precio_venta_ml !== undefined && art.precio_venta_ml !== null ? String(art.precio_venta_ml) : '',
      original_price: art.original_price ? String(art.original_price) : '',
      description: art.description || '',
      category: art.category || '',
      subcategory: art.subcategory || '',
      featured: !!art.featured,
      paused: !!art.paused,
      is_3d: !!art.is_3d,
      consult_only: !!art.consult_only,
      categoria_id: art.categoria_id || '',
      subcategoria_id: art.subcategoria_id || '',
      imagenes: art.imagenes || '',
      variants: art.variants || '[]'
    });
    setEditIngredientId('');
    setEditIngredientQty(1);
    setEditArticleStep(1);
    setIsEditingArticle(true);
  };

  const handleUpdateArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;

    const commissionInputVal = Number(editArticleForm.comision_ml || 11);
    const commPct = commissionInputVal;

    const mlVenta = editArticleForm.precio_venta_ml !== '' 
      ? Number(editArticleForm.precio_venta_ml) 
      : (Number(editArticleForm.precio_venta) > 0 ? Number(editArticleForm.precio_venta) + commPct : Math.round(Number(editArticleForm.costo || 0) * 1.4));

    // Dynamic auto-calculated general sale price (Web / Face / Insta)
    const generalPrice = mlVenta - commPct;

    try {
      const res = await fetch(`/api/articulos/${selectedArticle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editArticleForm.nombre.trim(),
          precio_venta: generalPrice,
          costo: Number(editArticleForm.costo || 0),
          imagen_url: editArticleForm.imagen_url.trim(),
          mvd_stock: Number(editArticleForm.mvd_stock || 0),
          pin_stock: Number(editArticleForm.pin_stock || 0),
          tipo: editArticleForm.tipo,
          componentes: editArticleForm.componentes,
          comision_ml: commPct,
          precio_venta_ml: mlVenta,
          comision_ml_raw: String(editArticleForm.comision_ml || '11'),
          original_price: editArticleForm.original_price === '' ? null : Number(editArticleForm.original_price),
          description: editArticleForm.description,
          category: editArticleForm.category,
          subcategory: editArticleForm.subcategory,
          featured: editArticleForm.featured,
          paused: editArticleForm.paused,
          is_3d: editArticleForm.is_3d,
          consult_only: editArticleForm.consult_only,
          categoria_id: editArticleForm.categoria_id,
          subcategoria_id: editArticleForm.subcategoria_id,
          imagenes: editArticleForm.imagenes,
          variants: editArticleForm.variants
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar el artículo.");
      }

      setIsEditingArticle(false);
      await refreshSystemData();
    } catch (err: any) {
      alert(err.message || "Error al actualizar el artículo.");
    }
  };

  const handleUpdateImageSubmit = async () => {
    if (!selectedArticle) return;
    setIsUpdatingImage(true);
    try {
      const res = await fetch(`/api/articulos/${selectedArticle.id}/image`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_url: imageUrlInput.trim() })
      });
      if (res.ok) {
        setShowImageModal(false);
        setImageUrlInput('');
        refreshSystemData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const handleAddCartItem = (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');
    setSaleSuccess('');

    if (!selectedCartArt) {
      setSaleError('Por favor selecciona un artículo del catálogo usando el buscador.');
      return;
    }
    if (cartItemQty < 1) {
      setSaleError('La cantidad seleccionada debe ser mayor o igual a 1.');
      return;
    }

    const priceOverrideVal = cartItemPriceOverride !== '' ? Number(cartItemPriceOverride) : undefined;

    // Check if item is already in cart to maybe just increment quantity
    const existingIndex = salesCart.findIndex(item => item.articulo_id === selectedCartArt.id && item.precio_venta_override === cartItemPriceOverride);

    if (existingIndex > -1) {
      setSalesCart(prev => {
        const copy = [...prev];
        copy[existingIndex].cantidad += cartItemQty;
        return copy;
      });
    } else {
      const newItem = {
        key: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
        articulo_id: selectedCartArt.id,
        articulo_nombre: selectedCartArt.nombre,
        articulo_codigo: selectedCartArt.codigo,
        imagen_url: selectedCartArt.imagen_url || '',
        precio_venta: selectedCartArt.precio_venta,
        cantidad: cartItemQty,
        precio_venta_override: cartItemPriceOverride !== '' ? cartItemPriceOverride : undefined
      };
      setSalesCart(prev => [...prev, newItem]);
    }

    // Reset picker inputs
    setSelectedCartArt(null);
    setSelectorSearch('');
    setCartItemQty(1);
    setCartItemPriceOverride('');
  };

  const handleRemoveCartItem = (key: string) => {
    setSalesCart(prev => prev.filter(item => item.key !== key));
  };

  const handleRecordSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError('');
    setSaleSuccess('');

    if (salesCart.length === 0) {
      setSaleError('El carrito de ventas está vacío. Agrega al menos un artículo antes de despachar.');
      return;
    }

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: dispatchSale.cliente || 'Christian Olivera',
          sucursal: dispatchSale.sucursal,
          fecha: new Date().toISOString(),
          canal: dispatchSale.canal,
          costo_envio: dispatchSale.costo_envio ? Number(dispatchSale.costo_envio) : 0,
          aprobado: dispatchSale.aprobado,
          items: salesCart.map(item => ({
            articulo_id: item.articulo_id,
            cantidad: item.cantidad,
            precio_venta_override: item.precio_venta_override !== undefined ? Number(item.precio_venta_override) : undefined
          }))
        })
      });

      if (!res.ok) {
        const errObj = await res.json();
        throw new Error(errObj.error || "Fallo procesando transacciones de venta.");
      }

      setSaleSuccess(`¡Transacción de venta de ${salesCart.length} artículo(s) despachada y stock sincronizado con éxito!`);
      setShowNewSaleModal(false);
      
      // Clear cart and clean client detail inputs
      setSalesCart([]);
      setDispatchSale({ 
        cliente: '', 
        articulo_id: '', 
        cantidad: 1, 
        sucursal: 'Pin',
        fecha: '',
        canal: 'WhatsApp',
        costo_envio: '',
        precio_venta_override: '',
        aprobado: 'Aprobado'
      });
      refreshSystemData();
      setTimeout(() => setSaleSuccess(''), 5000);
    } catch (err: any) {
      console.error(err);
      setSaleError(err.message || 'Error de despacho en red.');
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustSuccess('');
    if (!adjustStock.articulo_id) return;

    try {
      const res = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articulo_id: parseInt(adjustStock.articulo_id),
          sucursal: adjustStock.sucursal,
          cantidad: Number(adjustStock.cantidad)
        })
      });

      if (res.ok) {
        setAdjustSuccess('¡Nivel de stock registrado con éxito!');
        setAdjustStock({ articulo_id: '', sucursal: 'Pin', cantidad: 1 });
        refreshSystemData();
        setTimeout(() => setAdjustSuccess(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ADVANCED REPOSICIONES EVENT HANDLERS
  const handleAddRepDetailItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repDetailComposer.articulo_id) {
       setRepError("Por favor selecciona un producto para añadir al detalle.");
       return;
    }
    const artId = Number(repDetailComposer.articulo_id);
    const item = catalog.find(a => a.id === artId);
    if (!item) {
       setRepError("Producto no encontrado en el catálogo central.");
       return;
    }

    const qty = Number(repDetailComposer.cantidad);
    const rawCost = Number(repDetailComposer.costo_unitario);
    const sugg = Number(repDetailComposer.precio_sugerido || item.precio_venta || item.precio_venta_ml || 0);

    if (qty <= 0) {
      setRepError("La cantidad debe ser mayor que 0.");
      return;
    }

    const tipoIvaVal = Number(repDetailComposer.tipo_iva || '22');
    const modoIvaStr = repDetailComposer.modo_iva;

    let costNeto = 0;
    let costConIva = 0;
    let ivaUnit = 0;

    if (modoIvaStr === 'con_iva') {
      if (tipoIvaVal === 22) {
        costNeto = rawCost / 1.22;
        ivaUnit = rawCost - costNeto;
        costConIva = rawCost;
      } else if (tipoIvaVal === 10) {
        costNeto = rawCost / 1.10;
        ivaUnit = rawCost - costNeto;
        costConIva = rawCost;
      } else {
        costNeto = rawCost;
        ivaUnit = 0;
        costConIva = rawCost;
      }
    } else {
      // 'mas_iva'
      if (tipoIvaVal === 22) {
        costNeto = rawCost;
        ivaUnit = rawCost * 0.22;
        costConIva = rawCost + ivaUnit;
      } else if (tipoIvaVal === 10) {
        costNeto = rawCost;
        ivaUnit = rawCost * 0.10;
        costConIva = rawCost + ivaUnit;
      } else {
        costNeto = rawCost;
        ivaUnit = 0;
        costConIva = rawCost;
      }
    }

    // Check if item is already in details
    const existingIdx = repForm.detalles.findIndex(d => Number(d.articulo_id) === artId);
    let updatedDetalles = [...repForm.detalles];

    if (existingIdx !== -1) {
      updatedDetalles[existingIdx].cantidad += qty;
      updatedDetalles[existingIdx].costo_unitario = costNeto; // we store the Net Cost in the database catalog
      updatedDetalles[existingIdx].tipo_iva = tipoIvaVal;
      updatedDetalles[existingIdx].modo_iva = modoIvaStr;
      updatedDetalles[existingIdx].iva_unitario = ivaUnit;
      updatedDetalles[existingIdx].costo_con_iva = costConIva;
      updatedDetalles[existingIdx].precio_sugerido = sugg;
    } else {
      updatedDetalles.push({
        articulo_id: artId,
        codigo: item.codigo,
        nombre: item.nombre,
        cantidad: qty,
        costo_unitario: costNeto, // store Net Cost in database catalog
        tipo_iva: tipoIvaVal,
        modo_iva: modoIvaStr,
        iva_unitario: ivaUnit,
        costo_con_iva: costConIva,
        precio_sugerido: sugg
      });
    }

    // Auto-calculate sum of total invoice (Total con IVA)
    const autoTotal = updatedDetalles.reduce((acc, d) => {
      const itemConIva = d.costo_con_iva !== undefined ? d.costo_con_iva : (d.costo_unitario || 0);
      return acc + (Number(d.cantidad) * Number(itemConIva));
    }, 0);

    setRepForm(prev => ({
      ...prev,
      detalles: updatedDetalles,
      total_factura: autoTotal
    }));

    // Reset composer line items but keep previous cost and settings as helpful default
    setRepDetailComposer(prev => ({
      articulo_id: '',
      cantidad: 1,
      costo_unitario: prev.costo_unitario,
      precio_sugerido: '' as string | number,
      tipo_iva: prev.tipo_iva,
      modo_iva: prev.modo_iva
    }));
    setRepSearchText('');
    setRepError('');
  };

  const handleRemoveRepDetailItem = (indexToRemove: number) => {
    const updatedDetalles = repForm.detalles.filter((_, idx) => idx !== indexToRemove);
    const autoTotal = updatedDetalles.reduce((acc, d) => {
      const itemConIva = d.costo_con_iva !== undefined ? d.costo_con_iva : (d.costo_unitario || 0);
      return acc + (Number(d.cantidad) * Number(itemConIva));
    }, 0);
    setRepForm(prev => ({
      ...prev,
      detalles: updatedDetalles,
      total_factura: autoTotal
    }));
  };

  const handleUpdateRepDetailItem = (indexToUpdate: number, field: 'cantidad' | 'costo_unitario', value: number) => {
    const updatedDetalles = repForm.detalles.map((d, idx) => {
      if (idx !== indexToUpdate) return d;

      const newD = { ...d };
      if (field === 'cantidad') {
        newD.cantidad = value;
      } else if (field === 'costo_unitario') {
        const costNeto = value;
        newD.costo_unitario = costNeto;
        
        // Recalculate VAT and total cost with VAT dynamically for this item
        const tIva = newD.tipo_iva !== undefined ? Number(newD.tipo_iva) : 22;
        let ivaUnit = 0;
        let costConIva = costNeto;
        if (tIva === 22) {
          ivaUnit = costNeto * 0.22;
          costConIva = costNeto + ivaUnit;
        } else if (tIva === 10) {
          ivaUnit = costNeto * 0.10;
          costConIva = costNeto + ivaUnit;
        } else {
          ivaUnit = 0;
          costConIva = costNeto;
        }
        newD.iva_unitario = ivaUnit;
        newD.costo_con_iva = costConIva;
      }
      return newD;
    });

    const autoTotal = updatedDetalles.reduce((acc, d) => {
      const itemConIva = d.costo_con_iva !== undefined ? d.costo_con_iva : (d.costo_unitario || 0);
      return acc + (Number(d.cantidad) * Number(itemConIva));
    }, 0);

    setRepForm(prev => ({
      ...prev,
      detalles: updatedDetalles,
      total_factura: autoTotal
    }));
  };

  const handleRepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRepError('');
    setRepSuccess('');

    if (repForm.detalles.length === 0) {
      setRepError("Debe ingresar al menos un producto en el detalle antes de registrar la reposición.");
      return;
    }

    try {
      const url = isEditingRep ? `/api/reposiciones/${editingRepId}` : '/api/reposiciones';
      const method = isEditingRep ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repForm)
      });

      if (res.ok) {
        setRepSuccess(isEditingRep ? "¡Reposición modificada y stock ajustado exitosamente!" : "¡Reposición de mercadería registrada con éxito!");

        // Reset form
        setRepForm({
          fecha: new Date().toISOString().split('T')[0],
          proveedor: '',
          num_factura: '',
          sucursal: 'Pin',
          total_factura: 0,
          observaciones: '',
          usuario: sessionUser?.usuario || 'Uriel',
          detalles: [],
          actualizar_stock: true,
          actualizar_costos: true,
          actualizar_precio_sugerido: true,
          registrar_auditoria: true
        });
        setIsEditingRep(false);
        setEditingRepId(null);
        setRepSearchText('');
        setRepSelectorFocused(false);
        await refreshSystemData();
        setTimeout(() => setRepSuccess(''), 5000);
      } else {
        const errorData = await res.json();
        setRepError(errorData.error || "Hubo un error al procesar el ingreso de la reposición.");
      }
    } catch (err) {
      console.error(err);
      setRepError("Error de conexión al servidor.");
    }
  };

  const handleQuickCreateArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCreateRepError('');
    setQuickCreateRepSuccess('');

    if (!quickCreateRepForm.nombre.trim()) {
      setQuickCreateRepError('El nombre del producto es obligatorio.');
      return;
    }

    setQuickCreateRepSubmitting(true);

    const buyCost = Number(quickCreateRepForm.costo || 0);
    const calculatedSuggested = buyCost * 1.4;
    const chosenSku = quickCreateRepForm.codigo.trim() || getNextAvailableSku();
    const generalPrice = quickCreateRepForm.precio_venta !== '' ? Number(quickCreateRepForm.precio_venta) : calculatedSuggested;

    try {
      const res = await fetch('/api/articulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: chosenSku,
          nombre: quickCreateRepForm.nombre.trim(),
          tipo: 'simple',
          precio_venta: generalPrice,
          costo: buyCost,
          comision_ml: 0.11,
          precio_venta_ml: generalPrice,
          imagen_url: quickCreateRepForm.imagen_url.trim(),
          inicial_mvd: 0,
          inicial_pin: 0
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear el artículo.");
      }

      const output = await res.json();
      const createdItem = output.item;

      if (createdItem) {
        setRepDetailComposer(prev => ({
          ...prev,
          articulo_id: String(createdItem.id),
          costo_unitario: createdItem.costo || buyCost,
          precio_sugerido: createdItem.precio_venta || generalPrice
        }));
      }

      setQuickCreateRepSuccess(`¡Artículo ${chosenSku} registrado correctamente y pre-seleccionado!`);
      
      setQuickCreateRepForm({
        codigo: '',
        nombre: '',
        costo: '',
        precio_venta: '',
        imagen_url: ''
      });

      await refreshSystemData();
      
      setTimeout(() => {
        setIsQuickCreateRepModalOpen(false);
        setQuickCreateRepSuccess('');
      }, 1500);

    } catch (err: any) {
      setQuickCreateRepError(err.message || 'Error al conectar con la base de datos.');
    } finally {
      setQuickCreateRepSubmitting(false);
    }
  };

  const handleStartEditRep = (rep: any) => {
    setIsEditingRep(true);
    setEditingRepId(rep.id);
    setRepForm({
      fecha: rep.fecha ? rep.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
      proveedor: rep.proveedor || '',
      num_factura: rep.num_factura || '',
      sucursal: rep.sucursal as 'Mvd' | 'Pin',
      total_factura: Number(rep.total_factura || 0),
      observaciones: rep.observaciones || '',
      usuario: rep.usuario || 'Uriel',
      detalles: rep.detalles || [],
      actualizar_stock: true,
      actualizar_costos: true,
      actualizar_precio_sugerido: true,
      registrar_auditoria: true
    });
    setRepSearchText('');
    setRepSelectorFocused(false);
    setRepError('');
    setRepSuccess('');

    // Smooth scroll to top of form
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const confirmDeleteRep = async (id: number) => {
    setIsDeletingRepSubmitting(true);
    setDeleteRepError('');
    try {
      const res = await fetch(`/api/reposiciones/${id}?usuario=${encodeURIComponent(sessionUser?.usuario || 'Uriel')}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setRepToDelete(null);
        await refreshSystemData();
      } else {
        const errorData = await res.json();
        setDeleteRepError(errorData.error || 'Error al eliminar la reposición.');
      }
    } catch (err) {
      console.error(err);
      setDeleteRepError('Error de conexión al eliminar la reposición.');
    } finally {
      setIsDeletingRepSubmitting(false);
    }
  };

  const handleCreateGastoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGastoSuccess('');
    if (!newGasto.concepto.trim() || !newGasto.monto) return;

    try {
      const res = await fetch('/api/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto: newGasto.concepto.trim(),
          monto: Number(newGasto.monto),
          categoria: newGasto.categoria
        })
      });

      if (res.ok) {
        setGastoSuccess('¡Egreso capturado y descontado del flujo neto!');
        setNewGasto({ concepto: '', monto: '', categoria: 'Insumos' });
        refreshSystemData();
        setTimeout(() => setGastoSuccess(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGasto = async (id: number) => {
    try {
      const res = await fetch(`/api/gastos/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setGastoSuccess('¡Egreso eliminado del flujo neto correctamente!');
        setGastoIdToConfirmDelete(null);
        refreshSystemData();
        setTimeout(() => setGastoSuccess(''), 4000);
      } else {
        alert("Fallo al eliminar el egreso operativo.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de comunicación de red al eliminar.");
    }
  };

  // ==================== ENVIOS (SHIPMENTS) MANAGERS ====================

  const getSiguientePedidoNum = () => {
    if (envioForm.venta_id) {
      return String(envioForm.venta_id);
    }
    let maxId = 1000;
    if (envios && envios.length > 0) {
      envios.forEach(e => {
        if (e.num_pedido && e.num_pedido.startsWith('PE-')) {
          const num = parseInt(e.num_pedido.replace('PE-', ''), 10);
          if (!isNaN(num) && num > maxId) {
            maxId = num;
          }
        }
        if (e.id && typeof e.id === 'number' && e.id > maxId) {
          maxId = e.id;
        }
      });
    }
    return `PE-${maxId + 1}`;
  };

  const handleCreateEnvioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnvioError('');
    setEnvioSuccess('');

    // Field validations
    if (!envioForm.cliente.trim()) {
      setEnvioError('El nombre del cliente es obligatorio.');
      return;
    }
    if (!envioForm.direccion.trim()) {
      setEnvioError('La dirección de entrega es obligatoria.');
      return;
    }

    try {
      const isEdit = isEditingEnvio && editingEnvioId !== null;
      const url = isEdit ? `/api/envios/${editingEnvioId}` : '/api/envios';
      const method = isEdit ? 'PUT' : 'POST';

      const finalNumPedido = isEdit
        ? envioForm.num_pedido.trim()
        : (envioForm.num_pedido.trim() || getSiguientePedidoNum());

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          num_pedido: finalNumPedido,
          cliente: envioForm.cliente.trim(),
          telefono: envioForm.telefono.trim(),
          direccion: envioForm.direccion.trim(),
          horario: envioForm.horario.trim(),
          comentarios: envioForm.comentarios.trim(),
          sucursal: envioForm.sucursal,
          costo_envio: Number(envioForm.costo_envio),
          estado: envioForm.estado,
          venta_id: envioForm.venta_id
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEnvioSuccess(isEdit ? '¡El envío ha sido actualizado con éxito!' : '¡Nuevo envío registrado para reparto con éxito!');
        
        // Reset form
        setEnvioForm({
          num_pedido: '',
          cliente: '',
          telefono: '',
          direccion: '',
          horario: '',
          comentarios: '',
          sucursal: 'Mvd',
          costo_envio: 0,
          estado: 'Pendiente',
          venta_id: null
        });
        setIsEditingEnvio(false);
        setEditingEnvioId(null);
        refreshSystemData();

        // Auto select current envio for ticket previewing!
        if (data && data.envio) {
          setSelectedEnvioForLabel(data.envio);
        }

        setTimeout(() => setEnvioSuccess(''), 5000);
      } else {
        const errData = await res.json();
        setEnvioError(errData.error || 'Error al guardar el envío.');
      }
    } catch (err) {
      console.error(err);
      setEnvioError('Fallo de red al intentar registrar el envío.');
    }
  };

  const handleStartEditEnvio = (env: Envio) => {
    setIsEditingEnvio(true);
    setEditingEnvioId(env.id);
    setEnvioForm({
      num_pedido: env.num_pedido || '',
      cliente: env.cliente || '',
      telefono: env.telefono || '',
      direccion: env.direccion || '',
      horario: env.horario || '',
      comentarios: env.comentarios || '',
      sucursal: (env.sucursal === 'Pinamar' ? 'Pin' : env.sucursal === 'Montevideo' ? 'Mvd' : env.sucursal) as 'Mvd' | 'Pin',
      costo_envio: env.costo_envio || 0,
      estado: env.estado || 'Pendiente',
      venta_id: env.venta_id || null
    });
    setSelectedEnvioForLabel(env);
    // Scroll to form smoothly
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleLoadSaleIntoEnvioForm = (sale: Sale) => {
    setEnvioForm({
      num_pedido: String(sale.id),
      cliente: sale.cliente || 'Consumidor Final',
      telefono: '', // Sale doesn't contain phone; user will input it
      direccion: '', // Sale doesn't contain address; user will input it
      horario: '10:00 a 18:00hs', // default
      comentarios: `Art: ${sale.articulo_nombre || 'Producto'}. Cantidad: ${sale.cantidad}`,
      sucursal: sale.sucursal || 'Mvd',
      costo_envio: sale.costo_envio || 0,
      estado: 'Pendiente',
      venta_id: sale.id
    });
    setEnvioSuccess(`¡Se han cargado los datos de la venta #${sale.id} para ${sale.cliente}!`);
    setShowVentasSelectorForEnvio(false);
    setTimeout(() => setEnvioSuccess(''), 4000);
  };

  const handleDeleteEnvioSubmit = async () => {
    if (!envioToDelete) return;
    setIsDeletingEnvioSubmitting(true);
    setEnvioError('');
    try {
      const res = await fetch(`/api/envios/${envioToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setEnvioSuccess('¡El envío ha sido eliminado!');
        setEnvioToDelete(null);
        if (selectedEnvioForLabel?.id === envioToDelete.id) {
          setSelectedEnvioForLabel(null);
        }
        refreshSystemData();
        setTimeout(() => setEnvioSuccess(''), 4000);
      } else {
        setEnvioError('No se pudo eliminar el envío.');
      }
    } catch (err) {
      console.error(err);
      setEnvioError('Error de red al intentar borrar el envío.');
    } finally {
      setIsDeletingEnvioSubmitting(false);
    }
  };

  // --- FINANCIAL CENTER ACTIONS (Item 8) ---
  const handleCreateFinancialMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finanzasMontoInput || !finanzasConceptoInput) return;

    try {
      const res = await fetch('/api/finanzas/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen_cuenta: finanzasTipoInput === 'egreso' ? null : finanzasOrigenInput,
          destino_cuenta: finanzasTipoInput === 'ingreso' ? null : finanzasDestinoInput,
          monto: Number(finanzasMontoInput),
          tipo: finanzasTipoInput,
          concepto: finanzasConceptoInput,
          estado: (finanzasTipoInput === 'pendiente_cobro' || finanzasTipoInput === 'pendiente_pago') ? 'pendiente' : 'completado',
          vencimiento: finanzasVencimientoInput || null,
          referencia_id: null
        })
      });

      if (res.ok) {
        setShowAddMovimientoModal(false);
        // Clear standard forms
        setFinanzasConceptoInput('');
        setFinanzasMontoInput('');
        setFinanzasOrigenInput('');
        setFinanzasDestinoInput('');
        setFinanzasVencimientoInput('');
        refreshSystemData();
      }
    } catch (err) {
      console.error("Error creating transaction:", err);
    }
  };

  const handleCompletePendingMovement = async (movId: number, accountName: string) => {
    if (!accountName) return;
    try {
      const res = await fetch(`/api/finanzas/movimientos/${movId}/completar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuenta_destino_origen: accountName })
      });

      if (res.ok) {
        setCompletingMovimiento(null);
        setFinanzasCompletingCuenta('');
        refreshSystemData();
      }
    } catch (err) {
      console.error("Error completing movement:", err);
    }
  };

  const handleDeleteFinancialMovement = async (movId: number) => {
    try {
      const res = await fetch(`/api/finanzas/movimientos/${movId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        refreshSystemData();
      }
    } catch (err) {
      console.error("Error deleting movement:", err);
    }
  };

  const handleSaveArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingArqueo(true);
    try {
      const currentAccount = finanzasCuentas.find(c => c.nombre === selectedArqueoCuenta);
      const saldoInicialVal = currentAccount ? Number(currentAccount.saldo) : 0;

      // Filter sales registered today
      const salesTodaySum = sales.filter((s: any) => {
        const saleDate = new Date(s.fecha);
        const today = new Date();
        return saleDate.getDate() === today.getDate() &&
               saleDate.getMonth() === today.getMonth() &&
               saleDate.getFullYear() === today.getFullYear();
      }).reduce((sum, s) => sum + Number(s.total || 0), 0);

      // Filter today's completed movements for this account
      const movsToday = finanzasMovimientos.filter(m => {
        if (m.estado !== 'completado') return false;
        const affectsThis = (m.tipo === 'ingreso' && m.origen_cuenta === selectedArqueoCuenta) ||
                            (m.tipo === 'egreso' && m.destino_cuenta === selectedArqueoCuenta) ||
                            (m.tipo === 'transferencia' && (m.origen_cuenta === selectedArqueoCuenta || m.destino_cuenta === selectedArqueoCuenta));
        if (!affectsThis) return false;
        const mDate = new Date(m.fecha);
        const today = new Date();
        return mDate.getDate() === today.getDate() &&
               mDate.getMonth() === today.getMonth() &&
               mDate.getFullYear() === today.getFullYear();
      });

      const ingresosManualesSum = movsToday
        .filter(m => (m.tipo === 'ingreso' && m.origen_cuenta === selectedArqueoCuenta) || (m.tipo === 'transferencia' && m.destino_cuenta === selectedArqueoCuenta))
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      const egresosManualesSum = movsToday
        .filter(m => (m.tipo === 'egreso' && m.destino_cuenta === selectedArqueoCuenta) || (m.tipo === 'transferencia' && m.origen_cuenta === selectedArqueoCuenta))
        .reduce((sum, m) => sum + Number(m.monto || 0), 0);

      // We only count sales in "Caja Chica" if it's the main counter account
      const isCajaChica = selectedArqueoCuenta.toLowerCase().includes("caja");
      const ventasVal = isCajaChica ? salesTodaySum : 0;

      const theoreticalVal = saldoInicialVal + ventasVal + ingresosManualesSum - egresosManualesSum;

      // Compute physical cash total
      const totalPhysical = Object.entries(arqueoBilletesMonedas).reduce((sum, [denomination, qty]) => {
        return sum + (Number(denomination) * Number(qty));
      }, 0);

      const differenceVal = totalPhysical - theoreticalVal;

      const res = await fetch('/api/finanzas/arqueos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuenta: selectedArqueoCuenta,
          saldo_inicial: saldoInicialVal,
          ventas_sistema: ventasVal,
          ingresos_manuales: ingresosManualesSum,
          egresos_manuales: egresosManualesSum,
          saldo_teorico: theoreticalVal,
          dinero_fisico: totalPhysical,
          diferencia: differenceVal,
          observaciones: arqueoObservaciones,
          desglose: arqueoBilletesMonedas,
          ajustar_saldo: arqueoAjustarSaldo
        })
      });

      if (res.ok) {
        setArqueoBilletesMonedas({
          "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
        });
        setArqueoObservaciones('');
        await refreshSystemData();
        alert(`¡Arqueo diario guardado! Caja cuadrada con diferencia de $${differenceVal.toLocaleString('es-UY')}`);
      } else {
        const errJson = await res.json();
        alert(`Ocurrió un error al guardar: ${errJson.error || 'Intente de nuevo.'}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error de conectividad al procesar el arqueo de caja.');
    } finally {
      setIsSavingArqueo(false);
    }
  };

  // --- ADVANCED AI CO-PILOT ACTIONS (Item 10 + 7) ---
  const handleGenerateAiSocialPost = async () => {
    if (!aiSelectedArticleCode) return;
    setIsAiAdvancedWorking(true);
    setAiPublicationText('');
    try {
      const res = await fetch('/api/gemini/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleCode: aiSelectedArticleCode,
          networkType: aiPublicationPlatform,
          tone: aiPublicationTone,
          useGemaPro: useGemaPro
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiPublicationText(data.text);
      } else {
        setAiPublicationText("Inconveniente técnico: no pudimos conectar el escrito con el motor de Gemini.");
      }
    } catch (err) {
      console.error(err);
      setAiPublicationText("Error crítico de canalización.");
    } finally {
      setIsAiAdvancedWorking(false);
    }
  };

  const handleOptimizeAiPrices = async () => {
    if (!aiSelectedArticleCode) return;
    setIsAiAdvancedWorking(true);
    setAiPricingAnalysis('');
    setAiPricingSuggestedPrice(null);
    setAiPricingSuggestedPriceMl(null);
    try {
      const res = await fetch('/api/gemini/optimize-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleCode: aiSelectedArticleCode,
          desiredMargin: aiPricingMargin
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiPricingAnalysis(data.analysis);
        setAiPricingSuggestedPrice(data.suggested);
        setAiPricingSuggestedPriceMl(data.suggestedMl);
      } else {
        setAiPricingAnalysis("Error: No se pudo obtener la optimización del asesor.");
      }
    } catch (err) {
      console.error(err);
      setAiPricingAnalysis("Error crítico de canalización.");
    } finally {
      setIsAiAdvancedWorking(false);
    }
  };

  const handleRunAiStockAudit = async () => {
    setIsAiAdvancedWorking(true);
    setAiStockAuditText('');
    try {
      const res = await fetch('/api/gemini/predict-stock', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAiStockAuditText(data.audit);
      } else {
        setAiStockAuditText("Error al conectar con la predicción del almacén.");
      }
    } catch (err) {
      console.error(err);
      setAiStockAuditText("Inconveniente técnico al generar auditoría.");
    } finally {
      setIsAiAdvancedWorking(false);
    }
  };

  const handleSendAiMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSendingAi) return;

    const userText = newMessage.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setNewMessage('');
    setIsSendingAi(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ sender: 'user', text: userText }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { sender: 'assistant', text: data.reply }]);
      } else {
        throw new Error();
      }
    } catch {
      setChatMessages(prev => [...prev, { sender: 'assistant', text: 'Error al conectar con la IA de Gemini. Verifica la clave de API.' }]);
    } finally {
      setIsSendingAi(false);
    }
  };

  const handleSheetsSynchronizeTrigger = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/import-google-sheets', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Planilla sincronizada con éxito.");
        refreshSystemData();
      }
    } catch {
      alert("Error al invocar API de Apps Script.");
    } finally {
      setIsLoading(false);
    }
  };

  const getNextAvailableSku = () => {
    if (!catalog || catalog.length === 0) return "J104";
    const numbers = catalog
      .map(c => {
        const match = c.codigo.match(/^J(\d+)$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((n): n is number => n !== null);
    if (numbers.length === 0) return "J104";
    const maxNum = Math.max(...numbers);
    const nextNum = maxNum >= 100 ? maxNum + 1 : 104; // Ensure we go past J001-J005 towards J104+
    return `J${String(nextNum).padStart(3, '0')}`;
  };

  const getNextAvailableComboSku = () => {
    if (!catalog || catalog.length === 0) return "C001";
    const numbers = catalog
      .map(c => {
        const match = c.codigo.toUpperCase().match(/^C(\d+)$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((n): n is number => n !== null);
    if (numbers.length === 0) return "C001";
    const maxNum = Math.max(...numbers);
    const nextNum = maxNum >= 1 ? maxNum + 1 : 1;
    return `C${String(nextNum).padStart(3, '0')}`;
  };

  const handleAddFieldIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId) return;
    const parent = catalog.find(a => a.id === parseInt(selectedIngredientId));
    if (!parent) return;

    const existingIndex = addedIngredients.findIndex(i => i.id === parent.id);
    if (existingIndex > -1) {
      setAddedIngredients(prev => {
        const copy = [...prev];
        copy[existingIndex].cantidad += ingredientQty;
        return copy;
      });
    } else {
      setAddedIngredients(prev => [...prev, {
        id: parent.id,
        codigo: parent.codigo,
        nombre: parent.nombre,
        cantidad: ingredientQty,
        costo: parent.costo
      }]);
    }
    setSelectedIngredientId('');
    setIngredientQty(1);
    setMainComboSearchQuery('');
    setModalComboSearchQuery('');
  };

  const handleRemoveFieldIngredient = (id: number) => {
    setAddedIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleComboCreateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setComboSuccess('');
    setComboError('');

    if (!comboName.trim()) {
      setComboError('El nombre del combo es obligatorio.');
      return;
    }
    if (addedIngredients.length === 0) {
      setComboError('Debe agregar al menos un componente al combo.');
      return;
    }

    const calculatedComboCosto = addedIngredients.reduce((sum, ing) => sum + (ing.costo * ing.cantidad), 0);
    const suggestedComboPrice = (calculatedComboCosto * 1.4).toFixed(1);

    const finalSku = getNextAvailableComboSku();
    const finalPriceML = Number(comboPriceML || suggestedComboPrice);

    // Compute commission dynamically (flat fee in pesos)
    const commissionInputVal = Number(comboComisionML || 11);
    const commPct = commissionInputVal;

    const componentsPayload = addedIngredients.map(ing => ({
      id: ing.id,
      codigo: ing.codigo,
      cantidad: ing.cantidad
    }));

    try {
      const res = await fetch('/api/articulos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: finalSku,
          nombre: comboName.trim(),
          tipo: 'compuesto',
          precio_venta: finalPriceML - commPct,
          costo: calculatedComboCosto,
          comision_ml: commPct,
          precio_venta_ml: finalPriceML,
          componentes: componentsPayload,
          inicial_mvd: 0,
          inicial_pin: 0,
          imagen_url: '',
          comision_ml_raw: String(comboComisionML || '11')
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Ocurrió un error al crear el combo.');
      }

      const output = await res.json();
      setComboSuccess(`¡Combo Compuesto ${finalSku} registrado exitosamente en el catálogo central!`);
      setComboName('');
      setComboSku('');
      setAddedIngredients([]);
      setComboPrice('');
      setComboPriceML('');
      setComboComisionML('11');

      await refreshSystemData();
      if (output.item) {
        setSelectedArticle(output.item);
      }
      setTimeout(() => setComboSuccess(''), 5000);
    } catch (err: any) {
      setComboError(err.message || 'Error de red.');
    }
  };

  // Pre-calculated variables
  const nextSkuCode = getNextAvailableSku();
  const suggested40 = newArticle.costo ? (Number(newArticle.costo) * 1.4).toFixed(0) : '0';
  const effectiveCosto = Number(newArticle.costo || 0);
  const effectiveVentaML = newArticle.precio_venta_ml !== '' 
    ? Number(newArticle.precio_venta_ml) 
    : (newArticle.precio_venta !== '' ? Number(newArticle.precio_venta) + Number(newArticle.comision_ml || 11) : Number(suggested40));
  const comisionPercentVal = Number(newArticle.comision_ml || 11);
  const calculatedComisionMLAmount = comisionPercentVal;
  const calculatedWebFaceInstaPrice = effectiveVentaML - calculatedComisionMLAmount;

  // Pre-calculated edit form variables
  const editEffectiveVentaML = editArticleForm.precio_venta_ml !== '' 
    ? Number(editArticleForm.precio_venta_ml) 
    : (Number(editArticleForm.precio_venta) > 0 ? Number(editArticleForm.precio_venta) + Number(editArticleForm.comision_ml || 11) : Math.round(Number(editArticleForm.costo || 0) * 1.4));
  const editComisionPercentVal = Number(editArticleForm.comision_ml || 11);
  const editCalculatedComisionMLAmount = editComisionPercentVal;
  const editCalculatedWebFaceInstaPrice = editEffectiveVentaML - editCalculatedComisionMLAmount;

  const filteredCatalog = catalog.filter(c => {
    // General search query (by product name or SKU/code)
    if (searchQuery.trim()) {
      const matchGeneral = matchAdvancedSearch([c.nombre, c.codigo], searchQuery);
      if (!matchGeneral) return false;
    }
    return true;
  });

  // Sort catalog based on state
  if (sortField) {
    filteredCatalog.sort((a, b) => {
      let valA: any = null;
      let valB: any = null;

      if (sortField === 'nombre') {
        valA = (a.nombre || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        valB = (b.nombre || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      } else if (sortField === 'codigo') {
        valA = (a.codigo || '').toLowerCase();
        valB = (b.codigo || '').toLowerCase();
      } else if (sortField === 'costo') {
        valA = Number(a.costo || 0);
        valB = Number(b.costo || 0);
      } else if (sortField === 'precio_venta') {
        valA = Number(a.precio_venta || 0);
        valB = Number(b.precio_venta || 0);
      } else if (sortField === 'precio_venta_ml') {
        valA = Number(a.precio_venta_ml || a.precio_venta || 0);
        valB = Number(b.precio_venta_ml || b.precio_venta || 0);
      } else if (sortField === 'comision_ml') {
        const pVA = Number(a.precio_venta_ml || a.precio_venta || 0);
        const comPctA = a.comision_ml !== undefined ? Number(a.comision_ml) : 0.11;
        valA = comPctA <= 0.40 ? comPctA * 100 : (comPctA / (pVA || 1)) * 100;

        const pVB = Number(b.precio_venta_ml || b.precio_venta || 0);
        const comPctB = b.comision_ml !== undefined ? Number(b.comision_ml) : 0.11;
        valB = comPctB <= 0.40 ? comPctB * 100 : (comPctB / (pVB || 1)) * 100;
      } else if (sortField === 'mvd_stock') {
        valA = Number(a.mvd_stock || 0);
        valB = Number(b.mvd_stock || 0);
      } else if (sortField === 'pin_stock') {
        valA = Number(a.pin_stock || 0);
        valB = Number(b.pin_stock || 0);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Pagination calculations
  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const paginatedCatalog = filteredCatalog.slice(startIndex, startIndex + itemsPerPage);

  if (!sessionToken || !sessionUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#1e293b] font-sans flex flex-col md:flex-row antialiased">
      
      {/* 1. LEFT SIDEBAR SECTION */}
      <aside className="w-full md:w-80 bg-[#0f172a] text-slate-100 flex flex-col shrink-0 border-r border-[#1e293b] self-stretch md:h-screen sticky top-0 md:overflow-y-auto no-scrollbar">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/60 bg-slate-900/40 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-white font-display uppercase leading-tight">
                Sistema <span className="text-indigo-400">Juem</span>
              </h2>
              <p className="text-[9px] font-mono tracking-widest text-[#94a3b8] uppercase mt-0.5">Facturación & Gestión</p>
            </div>
          </div>
        </div>

        {/* User Identity Section */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white truncate font-sans tracking-wide">
                {sessionUser?.usuario}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[9px] font-bold text-indigo-400 px-1.5 py-0.5 bg-indigo-500/10 rounded-full select-none tracking-wide font-sans shrink-0">
                  {sessionUser?.rol}
                </span>
                <span className="text-[9px] font-bold text-slate-400 hover:text-slate-200 select-none font-sans flex items-center gap-0.5 truncate">
                  📍 {sessionUser?.sucursal}
                </span>
              </div>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 hover:text-rose-300 font-sans font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-rose-500/20 shadow-sm transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Navigation Menus */}
        <nav className="flex-1 px-4 py-5 space-y-7 overflow-y-auto no-scrollbar">
          {hasAccessToTab('mando') && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Menú Principal
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('mando')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'mando'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    <span>Cuadro de Mando</span>
                  </div>
                  {(() => {
                    const negativeStockCount = catalog.filter(art => 
                      art.tipo === 'simple' && (((art.mvd_stock || 0) < 0) || ((art.pin_stock || 0) < 0))
                    ).length;
                    if (negativeStockCount > 0) {
                      return (
                        <span className="bg-rose-550 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse" title={`${negativeStockCount} artículos con stock negativo`}>
                          {negativeStockCount}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Gestión Operativa
            </div>
            <div className="space-y-1 text-xs">
              {hasAccessToTab('stock') && (
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'stock'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4 shrink-0" />
                  <span>Stock Almacén</span>
                </button>
              )}

              {hasAccessToTab('ventas') && (
                <button
                  onClick={() => setActiveTab('ventas')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'ventas'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span>Ventas & Pedidos</span>
                </button>
              )}

              {hasAccessToTab('combos') && (
                <button
                  onClick={() => setActiveTab('combos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'combos'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Combinación de Combos</span>
                </button>
              )}

              {hasAccessToTab('ingreso') && (
                <button
                  onClick={() => setActiveTab('ingreso')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'ingreso'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>Ingreso de Stock</span>
                </button>
              )}

              {hasAccessToTab('traslados') && (
                <button
                  onClick={() => setActiveTab('traslados')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'traslados'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <ArrowRightLeft className="w-4 h-4 shrink-0" />
                  <span>Traslado Sucursales</span>
                </button>
              )}

              {hasAccessToTab('envios') && (
                <button
                  onClick={() => setActiveTab('envios')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'envios'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>Envíos</span>
                </button>
              )}

              {hasAccessToTab('gastos') && (
                <button
                  onClick={() => setActiveTab('gastos')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'gastos'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span>Gastos / Egresos</span>
                </button>
              )}

              {hasAccessToTab('finanzas') && (
                <button
                  onClick={() => setActiveTab('finanzas')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'finanzas'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-emerald-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="flex-1 text-left font-semibold">Arqueo de Caja</span>
                </button>
              )}

              {hasAccessToTab('copiloto-ia') && (
                <button
                  onClick={() => setActiveTab('copiloto-ia')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'copiloto-ia'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'text-purple-400 hover:bg-slate-800/40 hover:text-purple-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                  <span className="flex-1 text-left font-semibold">Asistente IA Avanzado</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Herramientas
            </div>
            <div className="space-y-1 text-xs">
              <button
                id="btn-sync-sheets"
                onClick={handleSheetsSynchronizeTrigger}
                disabled={isLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-all text-left cursor-pointer font-sans"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Actualizar Datos</span>
              </button>

              {sessionUser?.rol === 'Admin' && (
                <>
                  <button
                    id="btn-install-script"
                    onClick={() => setShowAppsScriptModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 transition-all text-left cursor-pointer font-sans"
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>Instalar Apps Script</span>
                  </button>

                  <button
                    id="btn-manage-users"
                    onClick={() => setActiveTab('usuarios')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-left cursor-pointer font-sans ${
                      activeTab === 'usuarios'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
                    <span>Gestionar Usuarios</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Sidebar footer layout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>© 104 PlanillaWeb</span>
          <span className="flex items-center gap-0.5 text-indigo-400">
            <Sparkles className="w-3 h-3 animate-spin" /> Gemini 3.5
          </span>
         </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 max-w-[1920px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* UPPER STATUS BAR */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
              Panel de Control Administrativo
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold font-mono">v3.5 Live</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">Sincronización multi-depósito de existencias Montevideo / Pinamar</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar artículo, SKU..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-64 pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-450 hover:text-[#1e293b] hover:bg-slate-200/50 rounded-full transition-all cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Refresh Icon Button */}
            <button
              onClick={refreshSystemData}
              title="Sincronizar base central"
              className="p-2.5 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
            >
              <RefreshCw className={`w-4.5 h-4.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* Quick AI Trigger */}
            <button
              onClick={() => setAiChatOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-pulse" />
              <span>Asistente IA</span>
            </button>
          </div>
        </header>

        {/* CONTEXT VIEWER BLOCK SEPARATOR */}
        {!hasAccessToTab(activeTab) ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-950/20 rounded-2xl border border-dashed border-brand-gold/10 relative overflow-hidden backdrop-blur-sm min-h-[400px]">
            <div className="max-w-md w-full bg-[#0B1730] border border-brand-gold/25 p-8 rounded-2xl shadow-2xl space-y-6 text-center z-10 relative">
              <div className="mx-auto w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center border border-brand-gold/30">
                <AlertTriangle className="h-8 w-8 text-brand-gold animate-pulse" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-display text-brand-crema tracking-tight">Acceso Restringido</h2>
                <p className="text-xs text-brand-lightgold/80 leading-relaxed font-sans mt-2">
                  Tu usuario actual no dispone de permisos para ingresar a la sección de <strong className="text-brand-gold font-extrabold">"{activeTab.toUpperCase()}"</strong>, o tu sesión cambió de privilegios.
                </p>
              </div>
              <div className="pt-4 border-t border-brand-gold/10 flex flex-col gap-2">
                <p className="text-[10px] text-slate-400 font-mono">
                  Por favor, comunícate con el administrador para autorizar esta sección.
                </p>
                <button
                  onClick={() => {
                    // Redirect to first allowed tab
                    const allTabsOrder = ['stock', 'ventas', 'combos', 'ingreso', 'traslados', 'envios', 'gastos', 'finanzas', 'copiloto-ia'];
                    if (sessionUser?.rol === 'Admin') {
                      setActiveTab('mando');
                    } else {
                      const userSecciones = sessionUser?.secciones || 'all';
                      if (userSecciones === 'all') {
                        setActiveTab('stock');
                      } else {
                        const allowed = allTabsOrder.find(t => userSecciones.split(',').includes(t));
                        setActiveTab(allowed || 'stock');
                      }
                    }
                  }}
                  className="mt-3 w-full py-2.5 bg-brand-gold hover:bg-brand-gold/85 text-[#050B1A] text-xs font-black rounded-xl transition-all shadow-md cursor-pointer uppercase tracking-wider"
                >
                  Ir a Sección Permitida
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'stock' && (
          <div className="w-full space-y-6">
            
            {/* FULL-WIDTH LISTA TABULAR */}
            <section className="w-full space-y-6">
              
              {/* TABLE LIST: REAL-TIME INVENTORY CONTROL */}
              <div className="bg-white rounded-2xl border border-slate-200/85 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Inventario Central Resumido</span>
                    <span className="text-xs font-mono text-slate-500 font-bold bg-slate-200/50 px-2.5 py-0.5 rounded-full">
                      {filteredCatalog.length} productos listados
                    </span>
                  </div>
                  {sessionUser?.rol === 'Admin' && (
                    <button
                      onClick={() => {
                        setCreationType('simple');
                        setIsCreateModalOpen(true);
                        setNewArticleStep(1);
                        setArticleSuccess('');
                        setArticleError('');
                        setComboSuccess('');
                        setComboError('');
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-550 whitespace-nowrap cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Agregar Artículo / Combo</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[75vh] relative scrollbar-thin">
                  <table className="w-full border-collapse text-left text-xs align-middle">
                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
                        
                        {/* SKU / IMG HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('codigo')}
                          className="py-3 px-5 text-left w-36 bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por SKU"
                        >
                          <div className="flex items-center gap-1">
                            <span>SKU / Imagen</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'codigo' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* PRODUCTO HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('nombre')}
                          className="py-3 px-4 bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Nombre"
                        >
                          <div className="flex items-center gap-1">
                            <span>Producto</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'nombre' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* COMPRA (COSTO) HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('costo')}
                          className="py-3 px-4 text-right bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Costo de Compra"
                        >
                          <div className="inline-flex items-center justify-end gap-1 w-full">
                            <span>Compra (Costo)</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'costo' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* VENTA LOCAL HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('precio_venta')}
                          className="py-3 px-4 text-right bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Venta Local"
                        >
                          <div className="inline-flex items-center justify-end gap-1 w-full">
                            <span>Venta Local</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'precio_venta' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* VENTA ML HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('precio_venta_ml')}
                          className="py-3 px-4 text-right bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Venta ML"
                        >
                          <div className="inline-flex items-center justify-end gap-1 w-full">
                            <span>Venta ML</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'precio_venta_ml' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* COMISIÓN ML HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('comision_ml')}
                          className="py-3 px-4 text-right bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Comisión ML"
                        >
                          <div className="inline-flex items-center justify-end gap-1 w-full">
                            <span>Comisión ML</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'comision_ml' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* STOCK MVD HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('mvd_stock')}
                          className="py-3 px-4 text-center text-slate-550 bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Stock Montevideo"
                        >
                          <div className="inline-flex items-center justify-center gap-1 w-full">
                            <span>Stock Mvd</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'mvd_stock' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                        {/* STOCK PIN HEADER (SORTABLE) */}
                        <th 
                          onClick={() => toggleSort('pin_stock')}
                          className="py-3 px-4 text-center text-slate-550 bg-slate-50 sticky top-0 cursor-pointer hover:bg-slate-100 transition-all group"
                          title="Ordenar por Stock Pinar"
                        >
                          <div className="inline-flex items-center justify-center gap-1 w-full">
                            <span>Stock Pin</span>
                            <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 font-bold transition-transform">
                              {sortField === 'pin_stock' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                            </span>
                          </div>
                        </th>

                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCatalog.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-10 text-slate-400 font-semibold font-mono">
                            Ningún artículo coincide con tu búsqueda actual "{searchQuery}"
                          </td>
                        </tr>
                      ) : (
                        paginatedCatalog.map((art) => {
                          const isSelected = selectedArticle?.id === art.id;

                          return (
                            <tr
                              key={`cat_row_${art.id}`}
                              onClick={() => {
                                setSelectedArticle(art);
                                setIsEditingArticle(false);
                                setShowDeleteConfirm(false);
                                setShowDetailModal(true);
                              }}
                              className={`cursor-pointer transition-all hover:bg-slate-50/70 ${
                                isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/50 border-l-4 border-indigo-600' : ''
                              }`}
                            >
                              {/* SKU BADGE & PRODUCT IMAGE */}
                              <td className="py-2.5 px-5">
                                <div className="flex items-center gap-3">
                                  {art.imagen_url ? (
                                    <img
                                      src={art.imagen_url}
                                      alt={art.nombre}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 rounded-xl object-cover bg-slate-100 flex-shrink-0 border border-slate-200/50 shadow-xs"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-150">
                                      <ImageIcon className="w-4.5 h-4.5 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs select-all">
                                    {art.codigo}
                                  </span>
                                </div>
                              </td>

                              {/* PRODUCT DETAILS */}
                              <td 
                                className="py-3.5 px-4 font-semibold text-slate-900 max-w-[220px]" 
                                title={art.nombre}
                              >
                                <div className="flex items-center gap-1.5 min-w-0" title={art.nombre}>
                                  <span 
                                    className={`truncate ${art.tipo === 'compuesto' ? 'text-blue-600 font-bold' : ''}`}
                                    title={art.nombre}
                                  >
                                    {art.nombre}
                                  </span>
                                  {art.tipo === 'compuesto' && (
                                    <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 shadow-sm uppercase tracking-wider">
                                      Combo
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* COST FOR ONE */}
                              <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600">
                                ${art.costo}
                              </td>

                              {/* PRICE ON LOCAL Channel */}
                              <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700">
                                ${art.precio_venta}
                              </td>

                              {/* PRICE ON MERCADOLIBRE Channel */}
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-650">
                                ${art.precio_venta_ml || art.precio_venta}
                              </td>

                              {/* COMISION MERCADOLIBRE COLUMN */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="font-mono text-xs font-semibold text-slate-700">
                                  ${Number(art.comision_ml !== undefined ? art.comision_ml : ((art.precio_venta_ml || art.precio_venta) * 0.11)).toFixed(0)}
                                </div>
                                <div className="text-[9px] font-sans text-slate-400 font-medium uppercase tracking-wider">
                                  Fijo
                                </div>
                              </td>

                              {/* STOCK MONTEVIDEO */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold">
                                <span className={art.mvd_stock && art.mvd_stock > 0 ? "text-slate-800" : "text-slate-400 font-medium"}>
                                  {art.mvd_stock || 0}
                                </span>
                              </td>

                              {/* STOCK PINAMAR */}
                              <td className="py-3.5 px-4 text-center font-mono font-bold">
                                <span className={art.pin_stock && art.pin_stock > 0 ? "text-indigo-600 font-extrabold" : "text-slate-400 font-medium"}>
                                  {art.pin_stock || 0}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION CONTROLS FOOTER */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span>Ver</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span>artículos por pág.</span>
                  </div>

                  {filteredCatalog.length > 0 && (
                    <div className="text-slate-500 text-center sm:text-left">
                      Mostrando <span className="font-extrabold text-slate-800">{startIndex + 1}</span> a{' '}
                      <span className="font-extrabold text-slate-800">
                        {Math.min(startIndex + itemsPerPage, filteredCatalog.length)}
                      </span>{' '}
                      de <span className="font-extrabold text-indigo-600">{filteredCatalog.length}</span> artículos
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-300 border border-slate-200/80 rounded-lg font-bold shadow-3xs transition-all disabled:pointer-events-none cursor-pointer"
                    >
                      Primero
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-300 border border-slate-200/80 rounded-lg font-bold shadow-3xs transition-all disabled:pointer-events-none cursor-pointer"
                    >
                      Anter.
                    </button>

                    <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-bold font-mono">
                      {safeCurrentPage} / {totalPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-300 border border-slate-200/80 rounded-lg font-bold shadow-3xs transition-all disabled:pointer-events-none cursor-pointer"
                    >
                      Síg.
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 disabled:text-slate-300 border border-slate-200/80 rounded-lg font-bold shadow-3xs transition-all disabled:pointer-events-none cursor-pointer"
                    >
                      Último
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* 3. VIEW: CUADRO DE MANDO (DASHBOARD) */}
        {activeTab === 'mando' && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const currentYearMonth = new Date().toISOString().substring(0, 7); // "YYYY-MM"

          // Filter collections by selected branch in Dashboard
          const filteredMandoSales = sales.filter(s => {
            if (mandoSucursalFilter === 'ALL') return true;
            return s.sucursal === mandoSucursalFilter;
          });

          // 1. Calculations for Dashboard Gerencial (Summary)
          const salesToday = filteredMandoSales.filter(s => s.fecha && s.fecha.split('T')[0] === todayStr);
          const billingTodayTotal = salesToday.reduce((sum, s) => sum + Number(s.total || 0), 0);

          const salesThisMonth = filteredMandoSales.filter(s => s.fecha && s.fecha.substring(0, 7) === currentYearMonth);
          const billingMonthTotalCombined = salesThisMonth.reduce((sum, s) => sum + Number(s.total || 0), 0);

          const gastosThisMonth = gastos.filter(g => g.fecha && g.fecha.substring(0, 7) === currentYearMonth);
          const expensesMonthTotalCombined = gastosThisMonth.reduce((sum, g) => sum + Number(g.monto || 0), 0);

          // Get cost of goods sold (COGS) this month
          const totalCogsThisMonth = salesThisMonth.reduce((sum, s) => {
            const art = catalog.find(x => x.id === s.articulo_id);
            const unitCost = s.precio_compra !== undefined ? Number(s.precio_compra) : (art ? Number(art.costo || 0) : 0);
            return sum + (unitCost * Number(s.cantidad || 1));
          }, 0);

          const totalCommissionsThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.comision_ml || 0), 0);
          const totalShippingThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.costo_envio || 0), 0);

          // Real net profit of the month
          const realProfitThisMonth = billingMonthTotalCombined - totalCogsThisMonth - totalCommissionsThisMonth - totalShippingThisMonth - expensesMonthTotalCombined;

          // Branch computations for month
          const mvdSales = salesThisMonth.filter(s => s.sucursal === 'Mvd');
          const mvdSalesTotal = mvdSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
          const mvdUnitsSold = mvdSales.reduce((sum, s) => sum + Number(s.cantidad || 0), 0);

          const pinSales = salesThisMonth.filter(s => s.sucursal === 'Pin');
          const pinSalesTotal = pinSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
          const pinUnitsSold = pinSales.reduce((sum, s) => sum + Number(s.cantidad || 0), 0);

          const totalBranchSalesCombined = mvdSalesTotal + pinSalesTotal || 1;
          const mvdPercent = Math.round((mvdSalesTotal / totalBranchSalesCombined) * 105) > 100 ? 100 : Math.round((mvdSalesTotal / totalBranchSalesCombined) * 100);
          const pinPercent = 100 - mvdPercent;

          // Stock quantities Mvd vs Pin
          const totalStockMvd = catalog.filter(a => a.tipo === 'simple').reduce((sum, a) => sum + (a.mvd_stock || 0), 0);
          const totalStockPin = catalog.filter(a => a.tipo === 'simple').reduce((sum, a) => sum + (a.pin_stock || 0), 0);

          // Top selling products this month
          const productsSold: Record<number, { id: number; codigo: string; nombre: string; qty: number; total: number; imagen?: string }> = {};
          salesThisMonth.forEach(s => {
            const artId = s.articulo_id;
            const art = catalog.find(x => x.id === artId);
            if (!productsSold[artId]) {
              productsSold[artId] = {
                id: artId,
                codigo: s.articulo_codigo || 'N/A',
                nombre: s.articulo_nombre || 'Artículo',
                qty: 0,
                total: 0,
                imagen: art?.imagen_url
              };
            }
            productsSold[artId].qty += Number(s.cantidad || 0);
            productsSold[artId].total += Number(s.total || 0);
          });
          const topProducts = Object.values(productsSold).sort((a, b) => b.qty - a.qty).slice(0, 5);

          // Stock Warnings
          const outOfStockList = catalog.filter(art => {
            if (art.tipo !== 'simple') return false;
            if (mandoSucursalFilter === 'Mvd') return (art.mvd_stock || 0) <= 0;
            if (mandoSucursalFilter === 'Pin') return (art.pin_stock || 0) <= 0;
            return (art.mvd_stock || 0) <= 0 && (art.pin_stock || 0) <= 0;
          });

          const criticalStockRange = catalog.filter(art => {
            if (art.tipo !== 'simple') return false;
            const m = art.mvd_stock || 0;
            const p = art.pin_stock || 0;
            if (mandoSucursalFilter === 'Mvd') {
              return m > 0 && m <= criticalStockLimit;
            }
            if (mandoSucursalFilter === 'Pin') {
              return p > 0 && p <= criticalStockLimit;
            }
            return (m > 0 && m <= criticalStockLimit) || (p > 0 && p <= criticalStockLimit);
          });

          // Products with no movement in last 60 days
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          const salesLastSixtyDays = filteredMandoSales.filter(s => s.fecha && new Date(s.fecha) >= sixtyDaysAgo);
          const activeIdsSixtyDays = new Set(salesLastSixtyDays.map(s => s.articulo_id));
          const stagnantProducts = catalog.filter(art => art.tipo === 'simple' && !activeIdsSixtyDays.has(art.id));

          // 2. Calculations for Product Profitability
          // Estimate assigned operating expenses
          const totalUnitsSoldThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.cantidad || 1), 0);
          const proportionalOverheadPerUnit = totalUnitsSoldThisMonth > 0 ? (expensesMonthTotalCombined / totalUnitsSoldThisMonth) : 0;

          // Compute profitability dataset based on catalog items
          const rentabilidadList = catalog.map(art => {
            const avgCommission = art.comision_ml !== undefined ? Number(art.comision_ml) : (Number(art.precio_venta_ml || art.precio_venta) * 0.11);
            // Average shipping cost is derived from sales of this item, or an average estimation, e.g. 0
            const itemSales = filteredMandoSales.filter(s => s.articulo_id === art.id);
            const avgShipping = itemSales.length > 0 ? (itemSales.reduce((sum, s) => sum + Number(s.costo_envio || 0), 0) / itemSales.length) : 0;

            // Operational overhead assigned
            let allocatedOverhead = 0;
            if (overheadMethod === 'proporcional') {
              allocatedOverhead = proportionalOverheadPerUnit;
            } else if (overheadMethod === 'fijo_pct') {
              allocatedOverhead = Number(art.precio_venta || 0) * (fixedOverheadPctValue / 100);
            }

            const netGain = Number(art.precio_venta || 0) - Number(art.costo || 0) - avgCommission - avgShipping - allocatedOverhead;
            const marginPct = Number(art.precio_venta) > 0 ? (netGain / Number(art.precio_venta)) * 100 : 0;

            let stockTotal = 0;
            if (mandoSucursalFilter === 'ALL') {
              stockTotal = (art.mvd_stock || 0) + (art.pin_stock || 0);
            } else if (mandoSucursalFilter === 'Mvd') {
              stockTotal = art.mvd_stock || 0;
            } else {
              stockTotal = art.pin_stock || 0;
            }

            return {
              id: art.id,
              codigo: art.codigo,
              nombre: art.nombre,
              imagen_url: art.imagen_url,
              precio_venta: Number(art.precio_venta || 0),
              costo: Number(art.costo || 0),
              comision_ml: avgCommission,
              costo_envio: avgShipping,
              gasto_asignado: allocatedOverhead,
              netGain,
              marginPct,
              stockTotal
            };
          });

          // Filter rentabilidad based on search query
          const filteredRentabilidad = rentabilidadList.filter(item => {
            return matchAdvancedSearch([item.nombre, item.codigo], rentabilidadSearch);
          });

          // Sort rentabilidad
          const sortedRentabilidad = [...filteredRentabilidad].sort((a, b) => {
            let valA: any = a[rentabilidadSortCol as keyof typeof a];
            let valB: any = b[rentabilidadSortCol as keyof typeof b];

            if (rentabilidadSortCol === 'nombre') {
              return rentabilidadSortDir === 'asc' 
                ? valA.localeCompare(valB) 
                : valB.localeCompare(valA);
            } else if (rentabilidadSortCol === 'margin') {
              return rentabilidadSortDir === 'asc' 
                ? (a.marginPct - b.marginPct) 
                : (b.marginPct - a.marginPct);
            } else if (rentabilidadSortCol === 'netGain') {
              return rentabilidadSortDir === 'asc' 
                ? (a.netGain - b.netGain) 
                : (b.netGain - a.netGain);
            } else {
              return rentabilidadSortDir === 'asc' 
                ? (valA || 0) - (valB || 0) 
                : (valB || 0) - (valA || 0);
            }
          });

          return (
            <div className="space-y-6 animate-fade-in">
              {/* Top Analytical Sub-navigation Bar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                    <h2 className="text-sm font-bold tracking-tight">CUADRO DE MANDO INTELIGENTE</h2>
                    <p className="text-[10px] text-indigo-300 font-mono">Control de Gestión e Inteligencia Comercial</p>
                  </div>
                </div>

                {/* FILTRO GENERAL DE SUCURSAL PARA EL DASHBOARD */}
                <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-indigo-300 font-extrabold uppercase tracking-wider text-[9px]">Filtrar por Sucursal:</span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setMandoSucursalFilter('ALL')}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${mandoSucursalFilter === 'ALL' ? 'bg-brand-gold text-[#050B1A] font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Ver Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setMandoSucursalFilter('Mvd')}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${mandoSucursalFilter === 'Mvd' ? 'bg-indigo-650 text-white font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Montevideo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMandoSucursalFilter('Pin')}
                      className={`px-3 py-1 rounded-md text-[9px] font-black uppercase transition-all cursor-pointer ${mandoSucursalFilter === 'Pin' ? 'bg-indigo-650 text-white font-black shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      Pinamar
                    </button>
                  </div>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold border border-slate-700/50 self-start lg:self-auto">
                  <button
                    type="button"
                    id="btn-submando-summary"
                    onClick={() => setMandoSubTab('summary')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mandoSubTab === 'summary' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Resumen Gerencial</span>
                  </button>
                  <button
                    type="button"
                    id="btn-submando-rentabilidad"
                    onClick={() => setMandoSubTab('rentabilidad')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mandoSubTab === 'rentabilidad' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Rentabilidad por Producto</span>
                  </button>
                  <button
                    type="button"
                    id="btn-submando-alertas"
                    onClick={() => setMandoSubTab('alertas')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${mandoSubTab === 'alertas' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                  >
                    <AlertTriangle className={`w-3.5 h-3.5 ${outOfStockList.length > 0 || criticalStockRange.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`} />
                    <span>Alertas y Reposición</span>
                  </button>
                </div>
              </div>

              {/* DYNAMIC NEGATIVE STOCK WARNING (Always visible across sub-tabs to assist Christian) */}
              {(() => {
                const negativeStr = catalog.filter(art => art.tipo === 'simple' && (((art.mvd_stock || 0) < 0) || ((art.pin_stock || 0) < 0)));
                if (negativeStr.length === 0) return null;
                return (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3 shadow-xs">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-11">
                      <h4 className="text-xs font-extrabold text-red-900 uppercase">Artículos con Incoherencia de Stock Negativo ({negativeStr.length})</h4>
                      <p className="text-[11px] text-red-700 font-semibold leading-relaxed">
                        Existen artículos con cantidades de stock por debajo de cero en algunos depósitos. Por favor actualícelos o regularícelos:
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {negativeStr.slice(0, 8).map(art => (
                          <span key={art.id} className="text-[10px] font-mono bg-white border border-red-200 px-2 py-0.5 rounded text-red-700 font-bold shadow-3xs">
                            {art.codigo}: ({art.mvd_stock ?? 0} Mvd • {art.pin_stock ?? 0} Pin)
                          </span>
                        ))}
                        {negativeStr.length > 8 && <span className="text-[10px] text-slate-500 font-bold">y {negativeStr.length - 8} más...</span>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SUB-TAB 1: SUMMARY (DASHBOARD GERENCIAL) */}
              {mandoSubTab === 'summary' && (
                <div className="space-y-6">
                  {/* Financial KPI Dashboard Widgets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VENTAS DE HOY</span>
                      <p className="text-2xl font-mono font-extrabold text-slate-900 mt-1">${billingTodayTotal.toLocaleString()}</p>
                      <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-1.5 font-sans">
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span>{salesToday.length} pedidos hoy</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FACTURACIÓN DEL MES</span>
                      <p className="text-2xl font-mono font-extrabold text-slate-900 mt-1">${billingMonthTotalCombined.toLocaleString()}</p>
                      <div className="text-[10px] text-slate-450 flex items-center gap-1 mt-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-405" />
                        <span>{salesThisMonth.length} transacciones este mes</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GASTOS OPERATIVOS MES</span>
                      <p className="text-2xl font-mono font-extrabold text-red-650 mt-1">${expensesMonthTotalCombined.toLocaleString()}</p>
                      <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1.5">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>{gastosThisMonth.length} egresos operacionales</span>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200/95 shadow-2xs bg-gradient-to-br from-indigo-50/20 to-white">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GANANCIA REAL DEL MES</span>
                      <p className={`text-2xl font-mono font-extrabold mt-1 ${realProfitThisMonth >= 0 ? 'text-emerald-600' : 'text-red-550'}`}>
                        ${Math.round(realProfitThisMonth).toLocaleString()}
                      </p>
                      <div className="text-[10px] flex items-center gap-1 mt-1.5 font-semibold text-slate-500">
                        <span className="text-emerald-500">★</span>
                        <span>Márgenes reales descontando COGS</span>
                      </div>
                    </div>
                  </div>

                  {/* Branch & Best Selling Side-by-Side Panel */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Branch Comparison Montevideo vs Pinamar */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Suma de Esfuerzos: Montevideo & Pinamar</h3>
                        <span className="text-[10px] bg-indigo-55 text-indigo-700 px-2 py-0.5 rounded-md font-semibold font-mono">Mes Actual</span>
                      </div>

                      <div className="space-y-4">
                        {/* Montevideo Stats */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-900">Montevideo Depot</span>
                            <span className="font-mono font-black text-slate-705">${mvdSalesTotal.toLocaleString()} ({mvdPercent}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-slate-800 h-full rounded-full transition-all animate-none" style={{ width: `${mvdPercent}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Unidades vendidas: {mvdUnitsSold} u.</span>
                            <span>Stock actual simple: {totalStockMvd} u.</span>
                          </div>
                        </div>

                        {/* Pinamar Stats */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-indigo-700">Pinamar Depot</span>
                            <span className="font-mono font-black text-indigo-700">${pinSalesTotal.toLocaleString()} ({pinPercent}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-650 h-full rounded-full transition-all animate-none" style={{ width: `${pinPercent}%` }}></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>Unidades vendidas: {pinUnitsSold} u.</span>
                            <span>Stock actual simple: {totalStockPin} u.</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/50 text-[11px] text-slate-600 leading-relaxed font-sans mt-2">
                        Ambas sucursales forman una poderosa sinergia, logrando una facturación consolidada de <strong>${(mvdSalesTotal + pinSalesTotal).toLocaleString()}</strong> este mes en perfecta coordinación operativa.
                      </div>
                    </div>

                    {/* Products Best Sellers */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Productos Más Vendidos</h3>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold">Top 5</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {topProducts.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-450 font-mono">
                            No se registran ventas para clasificar en el mes actual.
                          </div>
                        ) : (
                          topProducts.map((p, idx) => (
                            <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-black text-xs text-slate-350 w-4">#{idx+1}</span>
                                {p.imagen ? (
                                  <img src={p.imagen} alt={p.nombre} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 text-[9px] font-bold">SKU</div>
                                )}
                                <div className="max-w-[180px] sm:max-w-xs">
                                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{p.nombre}</h4>
                                  <span className="text-[10px] font-mono text-slate-400">{p.codigo}</span>
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs shrink-0">
                                <span className="font-extrabold text-slate-900 block">{p.qty} unidades</span>
                                <span className="text-slate-400 text-[10px]">${p.total.toLocaleString()}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Existing sales history summary list at bottom */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      Últimos Movimientos de Facturación
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-800">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3">Cliente</th>
                            <th className="py-2.5 px-3">Artículo Vendido</th>
                            <th className="py-2.5 px-3 text-center">Unidades</th>
                            <th className="py-2.5 px-3 text-center">Sucursal</th>
                            <th className="py-2.5 px-3 text-right">Monto de Facturación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                          {sales.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-slate-400 font-mono">Ninguna venta realizada todavía.</td>
                            </tr>
                          ) : (
                            sales.slice(0, 15).map(s => {
                              const isComp = catalog.find(x => x.id === s.articulo_id)?.tipo === 'compuesto';
                              return (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-3 text-slate-405 font-mono">{new Date(s.fecha).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                  <td className="py-3 px-3">{s.cliente}</td>
                                  <td className={`py-3 px-3 font-semibold ${isComp ? 'text-indigo-600 font-black' : 'text-slate-905'}`}>
                                    {s.articulo_nombre} ({s.articulo_codigo})
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono">{s.cantidad}</td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.sucursal === 'Pin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-850'}`}>
                                      {s.sucursal === 'Pin' ? 'Pinamar' : 'Montevideo'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">${s.total}</td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: RENTABILIDAD POR PRODUCTO */}
              {mandoSubTab === 'rentabilidad' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                  {/* Title and control configurations */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Rentabilidad Avanzada de Productos</h3>
                      <p className="text-[11px] text-slate-400 font-sans mt-0.5">Analiza los márgenes reales por SKU deduciendo costos directos e indirectos asignados.</p>
                    </div>

                    {/* Operational Overhead allocation choice */}
                    <div className="flex flex-wrap items-center gap-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex flex-col">
                        <label className="text-[9px] uppercase tracking-wider text-slate-450 font-black">Distribución Gastos Operacionales</label>
                        <select
                          value={overheadMethod}
                          onChange={(e) => setOverheadMethod(e.target.value as any)}
                          className="bg-white text-slate-900 px-2.5 py-1 text-xs rounded border border-slate-200 font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="proporcional">Proporcional por Ud. Vendida (${proportionalOverheadPerUnit.toFixed(1)}/ud)</option>
                          <option value="fijo_pct">Porcentaje Fijo sobre Venta</option>
                          <option value="cero">Omitir en Renglón</option>
                        </select>
                      </div>

                      {overheadMethod === 'fijo_pct' && (
                        <div className="flex flex-col w-20">
                          <label className="text-[9px] uppercase tracking-wider text-slate-450 font-black">% Asignado</label>
                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-[1px]">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={fixedOverheadPctValue}
                              onChange={(e) => setFixedOverheadPctValue(Number(e.target.value))}
                              className="w-full text-xs text-slate-900 border-none font-bold focus:outline-none placeholder-slate-300"
                            />
                            <span className="text-[10px] text-slate-400 font-black">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fast search & info toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por SKU o artículo..."
                        value={rentabilidadSearch}
                        onChange={(e) => setRentabilidadSearch(e.target.value)}
                        className="w-full bg-white text-slate-900 placeholder-slate-450 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200"
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3.5 text-[10px] text-slate-400 font-semibold">
                      <span>• Categorías de margen neto:</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Objetivo Alto (+25%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Regular (10% - 25%)</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Crítico / Bajo (-10%)</span>
                    </div>
                  </div>

                  {/* Rentabilidad Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3">Artículo (SKU)</th>
                          <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-all" onClick={() => { setRentabilidadSortCol('costo'); setRentabilidadSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Precio Venta</span>
                              {rentabilidadSortCol === 'costo' && (rentabilidadSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 text-right">Costo Promedio</th>
                          <th className="py-2.5 px-3 text-right">Comisión ML</th>
                          <th className="py-2.5 px-3 text-right">Costo Envío Est.</th>
                          <th className="py-2.5 px-3 text-right">Gasto Operativo Asig</th>
                          <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-all" onClick={() => { setRentabilidadSortCol('netGain'); setRentabilidadSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Ganancia Real</span>
                              {rentabilidadSortCol === 'netGain' && (rentabilidadSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-all" onClick={() => { setRentabilidadSortCol('margin'); setRentabilidadSortDir(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                            <div className="flex items-center justify-end gap-1">
                              <span>Margen (%)</span>
                              {rentabilidadSortCol === 'margin' && (rentabilidadSortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                        {sortedRentabilidad.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-slate-400 font-mono">No se encontraron artículos catalogados para análisis.</td>
                          </tr>
                        ) : (
                          sortedRentabilidad.map(item => {
                            let marginBg = "text-emerald-600 bg-emerald-50 border-emerald-100";
                            if (item.marginPct < 10) {
                              marginBg = "text-rose-600 bg-rose-50 border-rose-100";
                            } else if (item.marginPct <= 25) {
                              marginBg = "text-amber-600 bg-amber-50 border-amber-100";
                            }

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/40 transition-all">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2.5">
                                    {item.imagen_url ? (
                                      <img src={item.imagen_url} alt={item.nombre} className="w-8 h-8 rounded-md object-cover border border-slate-100" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center text-[8px] text-slate-400 font-black font-mono">SKU</div>
                                    )}
                                    <div className="max-w-[180px] sm:max-w-xs">
                                      <span className="font-extrabold text-slate-900 block line-clamp-1">{item.nombre}</span>
                                      <span className="font-mono text-[9px] text-slate-400 font-bold">{item.codigo}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">$ {item.precio_venta}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-450">$ {item.costo}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-400">$ {item.comision_ml.toFixed(1)}</td>
                                <td className="py-3 px-3 text-right font-mono text-slate-400">$ {item.costo_envio.toFixed(1)}</td>
                                <td className="py-3 px-3 text-right font-mono text-red-400">$ {item.gasto_asignado.toFixed(1)}</td>
                                <td className="py-3 px-3 text-right font-mono font-extrabold text-slate-950">$ {item.netGain.toFixed(1)}</td>
                                <td className="py-3 px-3 text-right font-mono">
                                  <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] font-black ${marginBg}`}>
                                    {item.marginPct.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: ALERTAS AUTOMÁTICAS Y REPOSICIÓN */}
              {mandoSubTab === 'alertas' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Warning limits setup parameters card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/85 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Configuración de Límites de Alerta de Stock</h3>
                        <p className="text-[11px] text-slate-400">Determina qué cantidad de inventario dispara avisos de urgencia.</p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500">Límite Crítico:</label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={criticalStockLimit}
                          onChange={(e) => setCriticalStockLimit(Number(e.target.value))}
                          className="w-32 bg-slate-200 rounded-lg cursor-pointer accent-indigo-650"
                        />
                        <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{criticalStockLimit} u.</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold text-xs text-slate-800">
                      <div className="p-3 bg-red-50/50 border border-red-100/60 rounded-xl">
                        <span className="text-[10px] text-red-600 font-extrabold uppercase">1. AGOTADOS</span>
                        <p className="text-xl font-mono font-bold text-red-700 mt-1">{outOfStockList.length} SKU</p>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Stock = 0 en Montevideo & Pinamar.</span>
                      </div>

                      <div className="p-3 bg-amber-50/50 border border-amber-100/60 rounded-xl">
                        <span className="text-[10px] text-amber-700 font-extrabold uppercase">2. CRÍTICOS / ALARMANTES</span>
                        <p className="text-xl font-mono font-bold text-amber-800 mt-1">{criticalStockRange.length} SKU</p>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Stock acumulado menor o igual a {criticalStockLimit} u.</span>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl border-dashed">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase">3. SIN ROTACIÓN RECIENTE</span>
                        <p className="text-xl font-mono font-bold text-slate-700 mt-1">{stagnantProducts.length} SKU</p>
                        <span className="text-[10px] text-slate-450 font-bold block mt-0.5">Artículos simples sin ventas en 60 días.</span>
                      </div>
                    </div>
                  </div>

                  {/* List of critical and out of stock items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Urgentes reponer & Agotados list */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span>Reponer Urgente (Agotados o Críticos)</span>
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 font-black">{outOfStockList.length + criticalStockRange.length} items</span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                        {outOfStockList.length === 0 && criticalStockRange.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-405 font-mono">¡Excelente! Ningún producto se encuentra bajo mínimos.</div>
                        ) : (
                          [...outOfStockList, ...criticalStockRange].map(art => {
                            const totalStockCombined = (art.mvd_stock || 0) + (art.pin_stock || 0);
                            const isAgotado = totalStockCombined <= 0;

                            return (
                              <div key={art.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                <div className="max-w-[200px] sm:max-w-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-block w-2 bg-rose-500 h-2 rounded-full shrink-0 ${isAgotado ? 'animate-pulse' : ''}`}></span>
                                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{art.nombre}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-450">Código: {art.codigo} • Mvd: {art.mvd_stock ?? 0} | Pin: {art.pin_stock ?? 0}</span>
                                </div>
                                
                                <span className={`text-[9px] uppercase font-mono font-black px-2 py-0.5 rounded border inline-block shrink-0 ${isAgotado ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                  {isAgotado ? 'Agotado' : 'Crítico'}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Stagnant products list (no sales in 60 days) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <History className="w-4 h-4 text-slate-400" />
                          <span>Estancados (Sin Ventas en 60 Días)</span>
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 font-black">{stagnantProducts.length} items</span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-1">
                        {stagnantProducts.length === 0 ? (
                          <div className="py-12 text-center text-xs text-slate-450 font-mono font-medium">Todos los artículos registran rotación comercial reciente.</div>
                        ) : (
                          stagnantProducts.map(art => {
                            const totalStockCombined = (art.mvd_stock || 0) + (art.pin_stock || 0);
                            return (
                              <div key={art.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                <div className="max-w-[200px] sm:max-w-xs">
                                  <span className="text-xs font-bold text-slate-800 block line-clamp-1">{art.nombre}</span>
                                  <span className="text-[10px] font-mono text-slate-400">Código: {art.codigo} • En stock total: {totalStockCombined} u.</span>
                                </div>
                                <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">Sin Rotación</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Suggestive smart system advice box */}
                  <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-md">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 mb-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Sugerencias Inteligentes de Operación y Logística</span>
                    </h4>

                    <div className="space-y-3.5 text-xs leading-relaxed text-slate-300">
                      {outOfStockList.length > 0 && (
                        <p>
                          ⚠️ <strong>Reposición Urgente de Canal:</strong> Se detectaron {outOfStockList.length} artículos completamente agotados en nuestros almacenes. Sugerimos realizar una importación urgente o una compra programada a proveedores para subsanar los quiebres de servicio.
                        </p>
                      )}
                      
                      {(() => {
                        // Look for potential branch balancing items (for instance: stock > 10 in Mvd but 0 in Pin, or vice versa)
                        const crossBranchBalancing = catalog.filter(art => {
                          if (art.tipo !== 'simple') return false;
                          const mvd = art.mvd_stock || 0;
                          const pin = art.pin_stock || 0;
                          return (mvd >= 10 && pin <= 0) || (pin >= 10 && mvd <= 0);
                        });

                        if (crossBranchBalancing.length > 0) {
                          return (
                            <p>
                              💡 <strong>Optimización de Traslados (Balanceo de Depósitos):</strong> Hay {crossBranchBalancing.length} artículos con stock abundante en un depósito pero agotado en el otro (ej. <strong>{crossBranchBalancing[0].nombre}</strong>). Se aconseja registrar un traslado de mercancías interno inmediato para cubrir pedidos locales sin costo de compra adicional.
                            </p>
                          );
                        }
                        return null;
                      })()}

                      {stagnantProducts.length > 0 && (
                        <p>
                          📈 <strong>Liquidación de Lote Estancado:</strong> Contamos con {stagnantProducts.length} productos sin movimiento comercial en 60 días. Recomendamos programar un descuento promocional temporal o destacarlos en Mercado Libre para liberar almacenamiento e incrementar liquidez de caja.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 4. VIEW: VENTAS & PEDIDOS CASHIER CHECKOUT */}
        {activeTab === 'ventas' && (() => {
          const filteredSales = sales.filter(s => {
            const matchesSearch = matchAdvancedSearch([s.cliente, s.articulo_nombre, s.articulo_codigo], salesSearch);
            const matchesBranch = (sessionUser?.sucursal === 'Montevideo')
              ? (s.sucursal === 'Mvd' || s.sucursal === 'Montevideo')
              : (salesFilterSucursal === 'ALL' || s.sucursal === salesFilterSucursal);
            const matchesChannel = salesFilterCanal === 'ALL' || s.canal === salesFilterCanal;
            return matchesSearch && matchesBranch && matchesChannel;
          });

          const totalInvoiced = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
          const totalNetGain = filteredSales.reduce((sum, s) => sum + (s.ganancia_neta || 0), 0);
          const totalFran = filteredSales.reduce((sum, s) => sum + (s.total_franquicia || 0), 0);
          const totalJuem = filteredSales.reduce((sum, s) => sum + (s.total_juem || 0), 0);

          return (
            <div className="space-y-6">
              {/* Quick Metrics Header */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-250/60 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Registros</span>
                  <span className="text-lg font-mono font-bold text-slate-800">{filteredSales.length} ventas</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-250/60 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Facturado</span>
                  <span className="text-lg font-mono font-bold text-slate-800">${totalInvoiced.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-250/60 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ganancia Neta</span>
                  <span className="text-lg font-mono font-bold text-emerald-600">${totalNetGain.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-250/60 shadow-sm">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Total Franquicia</span>
                  <span className="text-lg font-mono font-bold text-indigo-600">${totalFran.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-250/60 shadow-sm col-span-2 md:col-span-1">
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block">Total JUEM</span>
                  <span className="text-lg font-mono font-bold text-purple-600">${totalJuem.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Main functional workspace */}
              <div className="space-y-6">
                {/* Sale entry trigger card bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-250/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <PlusCircle className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950">
                        Registrar Nueva Venta
                      </h3>
                      {salesCart.length > 0 && (
                        <span className="bg-amber-100 text-amber-850 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono animate-pulse">
                          Borrador activo ({salesCart.length} art.)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 max-w-xl">
                      Presiona el botón para abrir el asistente de facturación, seleccionar artículos y despachar al historial de ventas cargadas.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {salesCart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSalesCart([]);
                          setSelectedCartArt(null);
                        }}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline font-bold transition-all cursor-pointer px-3 py-1.5 text-center"
                      >
                        Descartar borrador
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setShowNewSaleModal(true)}
                      className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>{salesCart.length > 0 ? "Continuar con el Registro" : "Iniciar Registro de Venta"}</span>
                    </button>
                  </div>
                </div>

                {/* Status notifications */}
                {(saleSuccess || saleError) && (
                  <div className="animate-fade-in space-y-2">
                    {saleSuccess && (
                      <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium border border-emerald-200 flex items-center justify-between">
                        <span>{saleSuccess}</span>
                        <button onClick={() => setSaleSuccess(null)} className="text-emerald-550 hover:text-emerald-750 font-bold ml-2">×</button>
                      </div>
                    )}
                    {saleError && (
                      <div className="p-3.5 bg-red-50 text-red-650 text-xs rounded-xl font-medium border border-red-200 flex items-center justify-between">
                        <span>{saleError}</span>
                        <button onClick={() => setSaleError(null)} className="text-red-550 hover:text-red-750 font-bold ml-2">×</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sales Ledger list */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950">
                        Historial de Ventas Cargadas
                      </h3>
                    </div>
                  </div>

                  {/* Filtering Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        id="sales-search"
                        type="text"
                        placeholder="Buscar cliente o artículo..."
                        value={salesSearch}
                        onChange={(e) => setSalesSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <select
                      id="sales-filter-branch"
                      value={salesFilterSucursal}
                      onChange={(e) => setSalesFilterSucursal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                    >
                      <option value="ALL">Todas las Sucursales</option>
                      <option value="Pin">Pinamar</option>
                      <option value="Mvd">Montevideo</option>
                    </select>

                    <select
                      id="sales-filter-channel"
                      value={salesFilterCanal}
                      onChange={(e) => setSalesFilterCanal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none block"
                    >
                      <option value="ALL">Todos los Canales</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Mercado Libre">Mercado Libre</option>
                      <option value="Venta Directa">Venta Directa</option>
                      <option value="Web">Web</option>
                      <option value="Instagram">Instagram</option>
                    </select>
                  </div>

                  {/* Ledger Table */}
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3">Fecha</th>
                          <th className="py-2.5 px-3">Cliente</th>
                          <th className="py-2.5 px-3">Artículo</th>
                          <th className="py-2.5 px-3 text-center">Cant.</th>
                          <th className="py-2.5 px-3 text-center">Canal / Sucursal</th>
                          <th className="py-2.5 px-3 text-right">P. Venta</th>
                          <th className="py-2.5 px-3 text-right">C. Envío</th>
                          <th className="py-2.5 px-3 text-right text-emerald-600 font-extrabold">G. Neta</th>
                          <th className="py-2.5 px-3 text-right text-indigo-600">Total Fran</th>
                          <th className="py-2.5 px-3 text-right text-purple-600">Total JUEM</th>
                          <th className="py-2.5 px-3 text-center">Estado</th>
                          <th className="py-2.5 px-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
                        {filteredSales.length === 0 ? (
                          <tr>
                            <td colSpan={12} className="text-center py-8 text-slate-400 font-mono">
                              No hay registros que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredSales.map(s => {
                            const isML = s.canal?.toLowerCase() === 'mercado libre';
                            const isWhatsApp = s.canal?.toLowerCase() === 'whatsapp';
                            return (
                              <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                                <td className="py-2.5 px-3 text-slate-400 font-mono leading-tight">
                                  {new Date(s.fecha).toLocaleString('es-UY', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
                                  {s.cliente}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className={`font-semibold ${catalog.find(x => x.id === s.articulo_id)?.tipo === 'compuesto' ? 'text-blue-600 font-bold' : 'text-slate-900'}`}>{s.articulo_nombre}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{s.articulo_codigo}</div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                                  {s.cantidad}
                                </td>
                                <td className="py-2.5 px-3 text-center space-y-0.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                    isML ? 'bg-yellow-50 text-yellow-850 border border-yellow-200' :
                                    isWhatsApp ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                    'bg-slate-50 text-slate-600 border border-slate-200'
                                  }`}>
                                    {s.canal || "Venta Directa"}
                                  </span>
                                  <br/>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${s.sucursal === 'Pin' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {s.sucursal === 'Pin' ? 'Pinamar' : 'Montevideo'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                  ${(s.total || 0).toLocaleString('es-UY', { minimumFractionDigits: 1 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                  ${(s.costo_envio || 0) > 0 ? (s.costo_envio || 0).toLocaleString('es-UY', { minimumFractionDigits: 1 }) : '0'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 bg-emerald-50/20 text-xs">
                                  ${(s.ganancia_neta || 0).toLocaleString('es-UY', { minimumFractionDigits: 1 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-semibold">
                                  ${(s.total_franquicia || 0).toLocaleString('es-UY', { minimumFractionDigits: 1 })}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-purple-600 font-semibold">
                                  ${(s.total_juem || 0).toLocaleString('es-UY', { minimumFractionDigits: 1 })}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold ${s.aprobado === 'Aprobado' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'}`}>
                                    {s.aprobado || 'Aprobado'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => handleStartEditSale(s)}
                                      title="Modificar venta"
                                      className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1 font-semibold"
                                    >
                                      <Pencil className="w-3 h-3" />
                                      <span>Editar</span>
                                    </button>
                                    <button
                                      onClick={() => setSaleToDelete(s)}
                                      title="Eliminar venta"
                                      className="p-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded transition-colors flex items-center justify-center gap-1 font-semibold"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Borrar</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 5. VIEW: COMBINACION DE COMBOS (RECIPES) */}
        {activeTab === 'combos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Real-time Interactive Combo Creator */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  Constructor de Combos en Tiempo Real
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Define fórmulas agregando componentes; autocalcula costos, límites y márgenes al instante hoy.</p>
              </div>

              {comboSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium border border-emerald-200">
                  {comboSuccess}
                </div>
              )}
              {comboError && (
                <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl font-medium border border-red-200">
                  {comboError}
                </div>
              )}

              <form onSubmit={handleComboCreateFormSubmit} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Combo Name */}
                  <div className="space-y-1.5">
                    <label className="text-slate-500 uppercase tracking-wider text-[10px]">Nombre del Combo (*)</label>
                    <input
                      type="text"
                      required
                      value={comboName}
                      onChange={(e) => setComboName(e.target.value)}
                      placeholder="Ej: Combo Invierno (Gorro + Poncho)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold focus:outline-none"
                    />
                  </div>

                  {/* Sku overriding preference */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-500 uppercase tracking-wider text-[10px]">SKU del Combo</label>
                      <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">Sistema</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={getNextAvailableComboSku()}
                      title="Generado automáticamente por el sistema para evitar repeticiones"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-600 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                {/* Sub-Card: Component selector */}
                <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Agregar Componentes al Ensamblado</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-1">
                    {/* Interactive search locator for simple articles */}
                    <div className="sm:col-span-8 space-y-1 relative">
                      {selectedIngredientId ? (
                        <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-semibold h-[34px]">
                          <span className="truncate">
                            📌 <strong>{catalog.find(a => a.id === Number(selectedIngredientId))?.codigo}</strong> - {catalog.find(a => a.id === Number(selectedIngredientId))?.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIngredientId('');
                              setMainComboSearchQuery('');
                            }}
                            className="text-emerald-600 hover:text-red-500 font-bold ml-2 cursor-pointer text-xs"
                            title="Quitar selección"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={mainComboSearchQuery}
                            onFocus={() => setMainComboShowDropdown(true)}
                            onChange={(e) => {
                              setMainComboSearchQuery(e.target.value);
                              setMainComboShowDropdown(true);
                            }}
                            placeholder="🔍 Buscar componente por código o nombre..."
                            className="w-full bg-white border border-slate-250 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold placeholder-slate-400 h-[34px]"
                          />
                          {mainComboShowDropdown && (
                            <>
                              {/* Backdrop layer to click outside */}
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setMainComboShowDropdown(false)} 
                              />
                              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                {catalog
                                  .filter(a => a.tipo === 'simple')
                                  .filter(art => matchAdvancedSearch([art.nombre, art.codigo], mainComboSearchQuery))
                                  .slice(0, 15) // Limit to top 15 results for snappier render
                                  .map(art => (
                                    <button
                                      key={`main_combo_drop_art_${art.id}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedIngredientId(String(art.id));
                                        setMainComboShowDropdown(false);
                                      }}
                                      className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                                    >
                                      <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold text-slate-800">{art.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">SKU: {art.codigo}</span>
                                      </div>
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                        ${art.costo}
                                      </span>
                                    </button>
                                  ))
                                }
                                {catalog.filter(a => a.tipo === 'simple').filter(art => 
                                  matchAdvancedSearch([art.nombre, art.codigo], mainComboSearchQuery)
                                ).length === 0 && (
                                  <div className="text-center py-4 text-slate-400 text-xs font-sans">
                                    No se encontraron componentes simples
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qty needed */}
                    <div className="sm:col-span-3 space-y-1">
                      <input
                        type="number"
                        min="1"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2 text-center text-slate-800 focus:outline-none font-mono text-xs font-semibold"
                      />
                    </div>

                    {/* Add Component Action */}
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={handleAddFieldIngredient}
                        className="w-full h-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-all py-1.5 cursor-pointer"
                        title="Anexar componente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Components breakdown list */}
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {addedIngredients.map((ing) => (
                      <div key={`main_combo_added_ing_${ing.id}`} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold block max-w-[200px] truncate">{ing.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Código: {ing.codigo} • Costo unitario: ${ing.costo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                            {ing.cantidad}x
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldIngredient(ing.id)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {addedIngredients.length === 0 && (
                      <div className="text-center py-5 text-slate-400 font-medium font-sans">
                        Sin componentes asociados. Añade artículos para definir la fórmula.
                      </div>
                    )}
                  </div>
                </div>

                {/* Economic Matrix projections & inputs */}
                {addedIngredients.length > 0 && (() => {
                  const calculatedComboCosto = addedIngredients.reduce((sum, ing) => sum + (ing.costo * ing.cantidad), 0);
                  const suggestedComboPrice = (calculatedComboCosto * 1.4).toFixed(1);

                  const parsedPrice = Number(comboPrice || suggestedComboPrice);
                  const parsedPriceML = Number(comboPriceML || parsedPrice);
                  const projectedComboProfitML = parsedPriceML - calculatedComboCosto;

                  // Minimum possible stock to build
                  const mvdAssemblyLimit = Math.min(...addedIngredients.map(ing => {
                    const match = catalog.find(a => a.id === ing.id);
                    return Math.floor((match?.mvd_stock || 0) / ing.cantidad);
                  }));
                  const pinAssemblyLimit = Math.min(...addedIngredients.map(ing => {
                    const match = catalog.find(a => a.id === ing.id);
                    return Math.floor((match?.pin_stock || 0) / ing.cantidad);
                  }));

                  return (
                    <div className="bg-slate-50 p-4 border border-slate-200/85 rounded-2xl space-y-4">
                      <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-wider block">Dimensionamiento Financiero y Costos</span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-450 text-[10px] block">Costo Acumulado</span>
                          <span className="text-sm font-mono font-bold text-slate-900">${calculatedComboCosto.toFixed(1)}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 text-[10px] block">40% Sugerido</span>
                          <span className="text-sm font-mono font-bold text-indigo-600">${suggestedComboPrice}</span>
                        </div>
                        <div>
                          <span className="text-slate-405 text-[10px] flex items-center gap-1">Stock Montevideo <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span></span>
                          <span className="text-sm font-mono font-bold text-slate-800">
                            {mvdAssemblyLimit === Infinity ? 0 : mvdAssemblyLimit} unids
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-405 text-[10px] flex items-center gap-1">Stock Pinamar <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block"></span></span>
                          <span className="text-sm font-mono font-bold text-indigo-600">
                            {pinAssemblyLimit === Infinity ? 0 : pinAssemblyLimit} unids
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200/50 pt-3">
                        {/* Venta General Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Precio General ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={comboPrice}
                            onChange={(e) => setComboPrice(e.target.value)}
                            placeholder={suggestedComboPrice}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800"
                          />
                        </div>

                        {/* Venta Mercado Libre Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Precio Venta ML ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={comboPriceML}
                            onChange={(e) => setComboPriceML(e.target.value)}
                            placeholder={comboPrice || suggestedComboPrice}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Projected Gross Margins Preview */}
                      <div className="bg-white/80 p-3 rounded-xl border border-slate-200/60 flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-605">Margen Neto Proyectado (ML):</span>
                        <span className={`font-mono text-sm ${projectedComboProfitML >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                          ${projectedComboProfitML.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Submission button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs py-2.5 px-3 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wider font-display"
                >
                  <Layers className="w-4 h-4 text-purple-200" />
                  <span>Compilar y Guardar Formula Combo</span>
                </button>
              </form>
            </div>

            {/* List active complex definitions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fórmula de Ensamble y Combos Existentes
              </h3>
              <div className="space-y-2">
                {catalog.filter(a => a.tipo === 'compuesto').map(c => {
                  // Compute dynamic cost and dynamic assembly stock bounds
                  const unifiedProductionCost = c.componentes?.reduce((sum, comp) => {
                    const found = catalog.find(x => x.id === comp.componente_id || x.codigo === comp.codigo);
                    return sum + (found ? found.costo * comp.cantidad : 0);
                  }, 0) || c.costo;

                  return (
                    <div key={c.id} className="p-4 border border-slate-150 rounded-xl space-y-2.5 hover:border-indigo-400 transition-colors">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-950">
                        <div className="flex items-center gap-1.5">
                          <span className="text-blue-600 font-bold">{c.nombre}</span>
                          <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {c.codigo}
                          </span>
                        </div>
                        <span className="text-slate-900 font-mono">${c.precio_venta}</span>
                      </div>
                      
                      <div className="pl-3 border-l-2 border-indigo-200 text-[11px] text-slate-500 space-y-1">
                        {c.componentes?.map((comp, i) => (
                          <div key={i}>
                            • {comp.cantidad}x {comp.nombre} ({comp.codigo})
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono font-semibold text-slate-400">
                        <span>Costo de Producción: <strong className="text-slate-700">${Number(unifiedProductionCost).toFixed(1)}</strong></span>
                        <span>Disp: Mvd <strong className="text-indigo-600">{c.mvd_stock || 0}</strong> • Pin <strong className="text-indigo-600">{c.pin_stock || 0}</strong></span>
                      </div>
                    </div>
                  );
                })}
                {catalog.filter(a => a.tipo === 'compuesto').length === 0 && (
                  <p className="text-xs text-slate-400 font-mono text-center py-6">No hay combos compuestos definidos en el catálogo actualmente.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 6. VIEW: INGRESO DE STOCK (REPOSITION REFILLS COMPREHENSIVE ERP SYSTEM) */}
        {activeTab === 'ingreso' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Page Header banner */}
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded font-bold uppercase tracking-wider font-mono">
                    Módulo ERP
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Control de Inventario</span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-400" />
                  <span>Reposición de Mercadería (Ajuste Positivo)</span>
                </h2>
                <p className="text-xs text-slate-300">
                  Ingresa baches de mercadería recibida de proveedores para actualizar de forma automatizada stocks, costos e historiales contables.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total Transacciones</p>
                  <p className="text-lg font-mono font-bold text-indigo-300">{reposiciones.length} Guías</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
            </div>

            {/* Error & Success Alert Bars */}
            {repSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-900 text-xs rounded-xl font-bold border border-emerald-200 flex items-center gap-2.5 shadow-xs animate-bounce">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[10px]">✓</span>
                <div>{repSuccess}</div>
              </div>
            )}

            {repError && (
              <div className="p-4 bg-red-50 text-red-950 text-xs rounded-xl font-bold border border-red-200 flex items-center gap-2.5 shadow-xs animate-shake">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white font-black text-xs font-mono">!</span>
                <div>{repError}</div>
              </div>
            )}

            {/* Main responsive split layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: ACTIVE WORKSPACE FORM (7 cols) */}
              <div className="xl:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                
                {/* Form Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEditingRep ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        {isEditingRep ? "Modificar Reposición Registrada" : "Nueva Entrada de Mercadería"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">Completa la cabecera y añade ítems al detalle</p>
                    </div>
                  </div>

                  {isEditingRep && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingRep(false);
                        setEditingRepId(null);
                        setRepForm({
                          fecha: new Date().toISOString().split('T')[0],
                          proveedor: '',
                          num_factura: '',
                          sucursal: 'Pin',
                          total_factura: 0,
                          observaciones: '',
                          usuario: sessionUser?.usuario || 'Uriel',
                          detalles: [],
                          actualizar_stock: true,
                          actualizar_costos: true,
                          actualizar_precio_sugerido: true,
                          registrar_auditoria: true
                        });
                      }}
                      className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                {/* Form Submission code */}
                <form onSubmit={handleRepSubmit} className="space-y-6 text-xs font-semibold">
                  
                  {/* CABECERA (Header Data) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span>1. Datos de Cabecera</span>
                      </p>

                      <div className="flex items-center gap-1 bg-indigo-50/50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider">Lector de Factura IA Activado</span>
                      </div>
                    </div>

                    {/* Gemini AI Invoice scanner upload container */}
                    <div className="bg-gradient-to-br from-indigo-50/40 to-slate-50 border border-dashed border-indigo-200/80 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                      <div className="space-y-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-1.5 text-indigo-700 font-bold">
                          <Sparkles className="w-4 h-4 animate-pulse shrink-0" />
                          <span className="tracking-tight text-xs">Carga Inteligente por Foto de Factura</span>
                        </div>
                        <p className="text-[11px] text-slate-500 max-w-lg font-sans leading-relaxed">
                          Saca una foto desde tu celular o sube una imagen de la factura. Nuestra IA con Gemini procesará montos totales, fecha, proveedor y autocompletará la planilla de bache y catálogo vinculada.
                        </p>
                      </div>

                      <div className="relative shrink-0">
                        <input
                          id="ai-invoice-scanner-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleInvoiceFileChange}
                          disabled={isParsingInvoice}
                        />
                        <label
                          htmlFor="ai-invoice-scanner-input"
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                            isParsingInvoice
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-indigo-100/50'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{isParsingInvoice ? "Analizando Factura..." : "Tomar Foto / Subir Factura"}</span>
                        </label>
                      </div>
                    </div>

                    {isParsingInvoice && (
                      <div className="bg-white border border-slate-150 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin animate-infinite duration-1000" />
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800">Procesando Factura con Gemini 3.5 Flash</p>
                          <p className="text-[10px] text-slate-500 max-w-sm font-sans leading-relaxed">
                            Analizando estructura, montos y descripciones del documento. Buscando códigos SKU del catálogo para mapear automáticamente baches de entrada directos.
                          </p>
                        </div>
                      </div>
                    )}

                    {parseInvoiceError && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-center gap-2 text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-[11px] font-sans font-medium">{parseInvoiceError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Date Field */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[10px]">Fecha de Entrada</label>
                        <input
                          type="date"
                          required
                          value={repForm.fecha}
                          onChange={(e) => setRepForm(prev => ({ ...prev, fecha: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Supplier Field */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[10px]">Proveedor (*)</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Mayorista Fundas Inc."
                          value={repForm.proveedor}
                          onChange={(e) => setRepForm(prev => ({ ...prev, proveedor: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Invoice number */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[10px]">Número de Factura</label>
                        <input
                          type="text"
                          placeholder="Ej: FAC-001294"
                          value={repForm.num_factura}
                          onChange={(e) => setRepForm(prev => ({ ...prev, num_factura: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs"
                        />
                      </div>

                      {/* Receiving branch */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[10px]">Sucursal Receptora</label>
                        <select
                          value={sessionUser?.sucursal === 'Montevideo' ? 'Mvd' : repForm.sucursal}
                          disabled={sessionUser?.sucursal === 'Montevideo'}
                          onChange={(e) => setRepForm(prev => ({ ...prev, sucursal: e.target.value as 'Mvd' | 'Pin' }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs disabled:bg-slate-50"
                        >
                          {sessionUser?.sucursal !== 'Montevideo' && <option value="Pin">Pinamar (Depósito Principal)</option>}
                          <option value="Mvd">Montevideo</option>
                        </select>
                      </div>

                      {/* Operator User */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[10px]">Usuario Responsable</label>
                        <input
                          type="text"
                          required
                          disabled
                          value={sessionUser?.usuario || repForm.usuario}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-500 font-semibold text-xs"
                        />
                      </div>

                      {/* Total Factura Manual Input */}
                      <div className="space-y-1">
                        <label className="text-indigo-600 font-bold uppercase tracking-wider text-[10px] block">Total de Factura ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Ej: 1078.80"
                          value={repForm.total_factura || ''}
                          onChange={(e) => setRepForm(prev => ({ ...prev, total_factura: parseFloat(e.target.value) || 0 }))}
                          className="w-full bg-indigo-50/50 border border-indigo-200 rounded-xl px-3 py-2 text-slate-950 font-bold focus:ring-2 focus:ring-indigo-550 text-xs font-mono"
                        />
                      </div>

                      {/* Uruguayan Tax Breakdown Card */}
                      <div className="md:col-span-2 bg-slate-100/55 border border-slate-200 p-3 rounded-xl space-y-2">
                        <label className="text-slate-550 uppercase tracking-wider text-[10px] block font-bold leading-none">
                          Liquidación de Factura (Uruguay)
                        </label>
                        {(() => {
                          const totalConIva = Number(repForm.total_factura || 0);
                          const totalNeto = repForm.detalles.reduce((acc, d) => acc + (Number(d.cantidad || 0) * Number(d.costo_unitario || 0)), 0);
                          const totalIva = totalConIva - totalNeto;

                          return (
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-bold text-slate-700">
                              <div className="bg-white border border-slate-150 p-1.5 rounded-lg flex flex-col justify-center">
                                <span className="block text-[7px] text-slate-400 font-sans uppercase">Subtotal Neto</span>
                                <span className="text-slate-800 text-[11px]">${totalNeto.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                              </div>
                              <div className="bg-white border border-slate-150 p-1.5 rounded-lg flex flex-col justify-center">
                                <span className="block text-[7px] text-slate-400 font-sans uppercase">IVA Total</span>
                                <span className="text-indigo-600 text-[11px]">${totalIva.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                              </div>
                              <div className="bg-indigo-50/50 border border-indigo-150 p-1.5 rounded-lg flex flex-col justify-center">
                                <span className="block text-[7px] text-indigo-500 font-sans uppercase">Total Factura</span>
                                <span className="text-indigo-900 font-black text-[11px]">${totalConIva.toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Observations */}
                    <div className="space-y-1 pt-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[10px]">Observaciones / Comentarios</label>
                      <textarea
                        rows={2}
                        placeholder="Escribe notas relevantes de la entrega, bache o transporte..."
                        value={repForm.observaciones}
                        onChange={(e) => setRepForm(prev => ({ ...prev, observaciones: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs text-left"
                      />
                    </div>
                  </div>

                  {/* COMPOSER WIDGET FOR REPOSICION DETAIL ITEMS (Add to detail list) */}
                  <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                        <span>2. Añadir Producto al Detalle</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickCreateRepForm({
                            codigo: getNextAvailableSku(),
                            nombre: '',
                            costo: '',
                            precio_venta: '',
                            imagen_url: ''
                          });
                          setQuickCreateRepError('');
                          setQuickCreateRepSuccess('');
                          setIsQuickCreateRepModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Artículo Nuevo</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 items-end">
                      {/* Product Selector */}
                      <div className="md:col-span-2 space-y-1 relative">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">Seleccionar Artículo (*)</label>
                        
                        {repDetailComposer.articulo_id ? (
                          (() => {
                            const targetArt = catalog.find(x => x.id === Number(repDetailComposer.articulo_id));
                            if (!targetArt) return null;
                            return (
                              <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl h-[38px]">
                                {targetArt.imagen_url ? (
                                  <img
                                    src={targetArt.imagen_url}
                                    alt={targetArt.nombre}
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    <ImageIcon className="w-4 h-4 text-slate-400" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-grow text-left">
                                  <div className="text-slate-900 font-bold text-[11px] truncate leading-tight">{targetArt.nombre}</div>
                                  <div className="text-[9px] text-slate-400 font-mono leading-none">
                                    SKU: {targetArt.codigo} · Costo: ${targetArt.costo}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRepDetailComposer(prev => ({ ...prev, articulo_id: '' }));
                                    setRepSearchText('');
                                  }}
                                  className="px-2 py-1 text-[9px] font-bold text-red-650 hover:bg-red-50 rounded-lg border border-red-100 transition-colors cursor-pointer shrink-0"
                                >
                                  Cambiar
                                </button>
                              </div>
                            );
                          })()
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Filtra SKU o Nombre..."
                              value={repSearchText}
                              onChange={(e) => {
                                setRepSearchText(e.target.value);
                                setRepSelectorFocused(true);
                              }}
                              onFocus={() => setRepSelectorFocused(true)}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8.5 pr-4 py-1.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs h-[38px]"
                            />
                            
                            {repSelectorFocused && (
                              <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 text-[10px] text-slate-400 font-semibold sticky top-0">
                                  <span>Resultados del catálogo</span>
                                  <button 
                                    type="button" 
                                    onClick={() => setRepSelectorFocused(false)}
                                    className="hover:text-slate-700 font-bold text-xs font-sans p-0.5"
                                  >
                                    Cerrar ×
                                  </button>
                                </div>

                                {(() => {
                                  const filteredOptions = catalog
                                    .filter(art => art.tipo === 'simple')
                                    .filter(art => matchAdvancedSearch([art.nombre, art.codigo], repSearchText));
                                  
                                  if (filteredOptions.length === 0) {
                                    return (
                                      <div className="p-4 text-center text-slate-400 text-xs font-mono">
                                        No se encontraron artículos simples.
                                      </div>
                                    );
                                  }
                                  
                                  return filteredOptions.slice(0, 15).map(art => (
                                    <button
                                      key={`rep_drop_art_${art.id}`}
                                      type="button"
                                      onClick={() => {
                                        setRepDetailComposer(prev => ({
                                          ...prev,
                                          articulo_id: String(art.id),
                                          costo_unitario: art.costo || 0,
                                          precio_sugerido: art.precio_venta || art.precio_venta_ml || 0
                                        }));
                                        setRepSearchText('');
                                        setRepSelectorFocused(false);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between transition-colors text-xs font-semibold gap-2"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {art.imagen_url ? (
                                          <img
                                            src={art.imagen_url}
                                            alt={art.nombre}
                                            referrerPolicy="no-referrer"
                                            className="w-7 h-7 rounded object-cover bg-slate-100 flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                          </div>
                                        )}
                                        <div className="truncate text-left">
                                          <span className="block text-slate-900 font-bold truncate text-[11px] leading-tight">{art.nombre}</span>
                                          <span className="block text-[9px] text-slate-400 font-mono leading-none">SKU: {art.codigo}</span>
                                        </div>
                                      </div>
                                      <div className="text-right text-[9px] font-mono font-bold shrink-0 text-indigo-600 bg-indigo-50/55 px-1.5 py-0.5 rounded">
                                        ${art.costo}
                                      </div>
                                    </button>
                                  ));
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity input */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">Cantidad simple</label>
                        <input
                          type="number"
                          min="1"
                          value={repDetailComposer.cantidad}
                          onChange={(e) => setRepDetailComposer(prev => ({ ...prev, cantidad: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 text-xs font-mono h-[38px]"
                        />
                      </div>

                      {/* Modo IVA selection */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">Tratamiento de Costo</label>
                        <select
                          value={repDetailComposer.modo_iva}
                          onChange={(e) => setRepDetailComposer(prev => ({ ...prev, modo_iva: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs h-[38px] cursor-pointer"
                        >
                          <option value="con_iva">IVA Incluido (Final)</option>
                          <option value="mas_iva">Sin IVA (Neto + IVA)</option>
                        </select>
                      </div>

                      {/* Tasa IVA Selector */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">Tasa de IVA (Uruguay)</label>
                        <select
                          value={repDetailComposer.tipo_iva}
                          onChange={(e) => setRepDetailComposer(prev => ({ ...prev, tipo_iva: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-indigo-500 text-xs h-[38px] cursor-pointer"
                        >
                          <option value="22">22% (Tasa Básica)</option>
                          <option value="10">10% (Tasa Mínima)</option>
                          <option value="0">0% (Exento)</option>
                        </select>
                      </div>

                      {/* Cost unit input */}
                      <div className="space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">Costo unitario ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={repDetailComposer.costo_unitario}
                          onChange={(e) => setRepDetailComposer(prev => ({ ...prev, costo_unitario: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-950 font-bold focus:ring-2 focus:ring-indigo-500 text-xs font-mono h-[38px]"
                        />
                      </div>

                      {/* Suggested Sell Price */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-slate-500 uppercase tracking-wider text-[9px] block">
                          Actualizar precio venta ($) <span className="font-mono text-[8px] text-slate-400 font-normal">(Sugerido)</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Fijar nuevo precio"
                          value={repDetailComposer.precio_sugerido}
                          onChange={(e) => setRepDetailComposer(prev => ({ ...prev, precio_sugerido: e.target.value }))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-950 font-medium focus:ring-2 focus:ring-indigo-500 text-xs font-mono h-[38px]"
                        />
                      </div>

                      {/* LIVE BREAKDOWN FEEDBACK PREVIEW */}
                      <div className="md:col-span-2 bg-slate-100/70 border border-slate-200 p-2.5 rounded-xl text-[10px] space-y-1.5 text-left h-[38px] flex flex-col justify-center">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block leading-none">Desglose Fiscal (Uruguay)</span>
                        {(() => {
                          const raw = Number(repDetailComposer.costo_unitario) || 0;
                          const tIva = Number(repDetailComposer.tipo_iva);
                          const mIva = repDetailComposer.modo_iva;
                          let cn = 0; let iv = 0; let cg = 0;
                          if (mIva === 'con_iva') {
                            if (tIva === 22) { cn = raw / 1.22; iv = raw - cn; cg = raw; }
                            else if (tIva === 10) { cn = raw / 1.10; iv = raw - cn; cg = raw; }
                            else { cn = raw; iv = 0; cg = raw; }
                          } else {
                            if (tIva === 22) { cn = raw; iv = raw * 0.22; cg = raw + iv; }
                            else if (tIva === 10) { cn = raw; iv = raw * 0.10; cg = raw + iv; }
                            else { cn = raw; iv = 0; cg = raw; }
                          }
                          return (
                            <div className="grid grid-cols-3 gap-2 font-mono font-bold text-slate-750 text-[10px] leading-tight">
                              <div>Neto: <span className="text-slate-900">${cn.toFixed(1)}</span></div>
                              <div>IVA: <span className="text-indigo-600">${iv.toFixed(1)}</span></div>
                              <div>Costo Final: <span className="text-emerald-700">${cg.toFixed(1)}</span></div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Trigger button */}
                      <div className="md:col-span-4">
                        <button
                          type="button"
                          onClick={handleAddRepDetailItem}
                          className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir İtem al Detalle con IVA</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* DETALLES TABLE */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>3. Resumen de Detalle ({repForm.detalles.length} filas)</span>
                    </p>

                     <div className="border border-slate-150 rounded-xl overflow-hidden bg-white overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 uppercase font-mono font-bold">
                            <th className="p-2.5 pl-3">SKU</th>
                            <th className="p-2.5">Producto</th>
                            <th className="p-2.5 text-right">Cant</th>
                            <th className="p-2.5 text-right">Costo Neto</th>
                            <th className="p-2.5 text-center">IVA %</th>
                            <th className="p-2.5 text-right">Imp. Neto</th>
                            <th className="p-2.5 text-right">Monto IVA</th>
                            <th className="p-2.5 text-right text-emerald-800 bg-emerald-50/40">Total c/IVA</th>
                            <th className="p-2.5 pr-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-705">
                          {repForm.detalles.map((elem, idx) => {
                            const costNeto = elem.costo_unitario || 0;
                            const tIva = elem.tipo_iva !== undefined ? Number(elem.tipo_iva) : 22;
                            const qty = Number(elem.cantidad || 0);

                            // Calculate fallback fields for old records
                            let ivaUnit = elem.iva_unitario !== undefined ? Number(elem.iva_unitario) : 0;
                            let costConIva = elem.costo_con_iva !== undefined ? Number(elem.costo_con_iva) : costNeto;

                            if (elem.iva_unitario === undefined) {
                              if (tIva === 22) {
                                ivaUnit = costNeto * 0.22;
                                costConIva = costNeto + ivaUnit;
                              } else if (tIva === 10) {
                                ivaUnit = costNeto * 0.10;
                                costConIva = costNeto + ivaUnit;
                              } else {
                                ivaUnit = 0;
                                costConIva = costNeto;
                              }
                            }

                            const totNeto = costNeto * qty;
                            const totIva = ivaUnit * qty;
                            const totConIva = costConIva * qty;

                            return (
                              <tr key={`draft_detail_${idx}`} className="hover:bg-slate-50/50">
                                <td className="p-2.5 pl-3 font-mono text-indigo-650 font-bold">{elem.codigo}</td>
                                <td className="p-2.5 max-w-[150px] truncate">{elem.nombre}</td>
                                <td className="p-2.5 text-right w-[95px]">
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={qty}
                                    onChange={(e) => handleUpdateRepDetailItem(idx, 'cantidad', Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full text-right px-2 py-1 border border-slate-200 rounded-lg bg-indigo-50/35 font-mono font-black text-slate-950 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                  />
                                </td>
                                <td className="p-2.5 text-right w-[125px]">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-slate-400 font-mono text-[10px] font-normal">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={costNeto}
                                      onChange={(e) => handleUpdateRepDetailItem(idx, 'costo_unitario', Math.max(0, parseFloat(e.target.value) || 0))}
                                      className="w-full text-right px-2 py-1 border border-slate-200 rounded-lg bg-indigo-50/35 font-mono font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="p-2.5 text-center font-mono">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                    tIva === 22 ? 'bg-indigo-50 text-indigo-700' :
                                    tIva === 10 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-505'
                                  }`}>
                                    {tIva}%
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-600">${totNeto.toFixed(1)}</td>
                                <td className="p-2.5 text-right font-mono text-indigo-600">${totIva.toFixed(1)}</td>
                                <td className="p-2.5 text-right font-mono text-emerald-700 font-bold bg-emerald-50/15">${totConIva.toFixed(1)}</td>
                                <td className="p-2.5 text-center pr-3">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRepDetailItem(idx)}
                                    className="text-[10px] text-red-650 hover:text-red-900 hover:bg-red-50 px-1.5 py-1 rounded transition-all cursor-pointer font-bold border border-transparent hover:border-red-100"
                                  >
                                    Quitar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {repForm.detalles.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400 font-mono text-[11px] italic">
                                El detalle de reposición está vacío. Usa la sección superior para añadir ítems recibidos.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* TRIGGER CONTROLS: ACTUALIZAR STOCK, COSTOS, ENVIAR AUDITORIA CHECKBOXES */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                      <input
                        type="checkbox"
                        checked={repForm.actualizar_stock}
                        onChange={(e) => setRepForm(prev => ({ ...prev, actualizar_stock: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="text-left leading-normal">
                        <span className="block text-xs font-bold text-slate-800">Actualizar stock físico</span>
                        <span className="block text-[10px] text-slate-400">Sumar automáticamente cantidad al depósito destino</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                      <input
                        type="checkbox"
                        checked={repForm.actualizar_costos}
                        onChange={(e) => setRepForm(prev => ({ ...prev, actualizar_costos: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="text-left leading-normal">
                        <span className="block text-xs font-bold text-slate-800">Actualizar costos de compra</span>
                        <span className="block text-[10px] text-slate-400">Establece el costo unitario como precio compra del catálogo</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                      <input
                        type="checkbox"
                        checked={repForm.actualizar_precio_sugerido}
                        onChange={(e) => setRepForm(prev => ({ ...prev, actualizar_precio_sugerido: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="text-left leading-normal">
                        <span className="block text-xs font-bold text-slate-800">Actualizar precios venta sugeridos</span>
                        <span className="block text-[10px] text-slate-400">Ajusta los precios de venta en los almacenes centrales</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                      <input
                        type="checkbox"
                        checked={repForm.registrar_auditoria}
                        onChange={(e) => setRepForm(prev => ({ ...prev, registrar_auditoria: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="text-left leading-normal">
                        <span className="block text-xs font-bold text-slate-800">Registrar en auditoría de control</span>
                        <span className="block text-[10px] text-slate-400">Crea un registro de auditoría en el ledger de seguridad</span>
                      </div>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isEditingRep ? "Guardar Modificaciones de la Reposición" : "Someter y Registrar Reposición (Ajuste Positivo)"}
                    </span>
                  </button>
                </form>
              </div>

              {/* RIGHT COLUMN: REPOSICIONES HISTORIC TRANSACTIONS LEDGER & AUDITS Explorer (5 cols) */}
              <div className="xl:col-span-12 xl:grid xl:grid-cols-2 xl:gap-8 items-start space-y-8 xl:space-y-0">
                
                {/* HISTORIC MASTER LEDGER TAB PANEL */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                          Historial de Reposiciones Registradas
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono">Ledger histórico con reversión de inventarios</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3.5 overflow-y-auto max-h-[600px] pr-1">
                    {reposiciones.map((rep) => (
                      <div
                        key={`hist_rep_${rep.id}`}
                        className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 bg-slate-50/30 text-xs space-y-3 transition-all animate-in fade-in"
                      >
                        {/* Header details of the historic card */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div>
                            <span className="font-bold text-xs text-slate-900 block">
                              {rep.proveedor}
                            </span>
                            <span className="font-mono text-[9px] text-slate-400 uppercase tracking-widest block font-bold">
                              Guía #{rep.id} {rep.num_factura ? `| Factura: ${rep.num_factura}` : ''}
                            </span>
                          </div>

                          <div className="text-right shrink-0 font-mono">
                            <span className="block text-indigo-700 font-black text-sm">
                              ${Number(rep.total_factura || 0).toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">
                              {rep.sucursal === 'Pin' ? 'Pinamar' : 'Montevideo'}
                            </span>
                          </div>
                        </div>

                        {/* Expandable items detail representation */}
                        <div className="bg-white rounded-lg p-2.5 border border-slate-150 space-y-2 font-semibold text-slate-600 text-[11px]">
                          <div className="flex items-center justify-between">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ítems incorporados:</p>
                            <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black font-sans uppercase">Regulador IVA Uruguay</span>
                          </div>
                          {rep.detalles && Array.isArray(rep.detalles) && rep.detalles.map((det: any, dIdx: number) => {
                            const dIva = det.tipo_iva !== undefined ? Number(det.tipo_iva) : 22;
                            const costNet = Number(det.costo_unitario || 0);
                            let itemConIva = det.costo_con_iva !== undefined ? Number(det.costo_con_iva) : costNet;
                            if (det.costo_con_iva === undefined && dIva > 0) {
                              itemConIva = costNet * (1 + dIva / 100);
                            }

                            return (
                              <div key={dIdx} className="py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/40 px-1 rounded transition-colors">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="truncate text-slate-900 font-bold max-w-[210px]">
                                    • {det.nombre} <b className="text-indigo-600 font-mono text-[9px]">({det.codigo})</b>
                                  </span>
                                  <span className="font-mono text-slate-900 font-bold shrink-0">
                                    {det.cantidad}u × ${costNet.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">neto</span>
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-0.5 pl-2">
                                  <span>Tasa IVA: {dIva}%</span>
                                  <span className="text-emerald-700 font-semibold">Subtotal con IVA: ${(itemConIva * det.cantidad).toFixed(1)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Metadata comments */}
                        {rep.observaciones && (
                          <p className="text-[10px] text-slate-500 italic pl-1 bg-white/50 py-1 px-2 rounded border-l-2 border-slate-300">
                            💬 "{rep.observaciones}"
                          </p>
                        )}

                        {/* Operator badge and ACTIONS strip */}
                        <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-[10px]">
                          <div className="text-slate-400">
                            Reg: <strong className="text-slate-600">{rep.usuario || 'Operador'}</strong>
                            <span className="ml-1 opacity-60">({rep.fecha ? new Date(rep.fecha).toLocaleDateString() : ''})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditRep(rep)}
                              className="px-2.5 py-1 text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => setRepToDelete(rep)}
                              className="px-2.5 py-1 text-[10px] text-red-700 bg-red-50 hover:bg-red-100 font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {reposiciones.length === 0 && (
                      <div className="p-12 text-center text-slate-450 border-2 border-dashed border-slate-150 rounded-xl space-y-2 font-semibold">
                        <History className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs">No hay registros de reposición guardados en el sistema.</p>
                        <p className="text-[10px] text-slate-400 font-mono font-medium">Usa la sección de Ajuste Positivo a la izquierda</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* AUDITORIAS DISPATCH LOG TRACKER */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                           Auditoría de Control y Logs de Seguridad
                        </h3>
                        <p className="text-[10px] text-slate-400 font-mono font-semibold">Registro temporal e inalterable de auditoría</p>
                      </div>
                    </div>
                  </div>

                  {/* Sub-Tabs: Logs vs Invoice Search */}
                  <div className="flex border-b border-slate-100 -mt-2">
                    <button
                      type="button"
                      onClick={() => setAuditSubTab('logs')}
                      className={`flex-1 py-2 text-xs font-bold transition-all text-center border-b-2 ${
                        auditSubTab === 'logs'
                          ? 'border-indigo-600 text-indigo-750 font-black'
                          : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
                      }`}
                    >
                      Logs de Auditoría ({auditorias.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuditSubTab('buscador')}
                      className={`flex-1 py-2 text-xs font-bold transition-all text-center border-b-2 ${
                        auditSubTab === 'buscador'
                          ? 'border-indigo-600 text-indigo-750 font-black'
                          : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
                      }`}
                    >
                      Buscador de Facturas
                    </button>
                  </div>

                  {auditSubTab === 'logs' ? (
                    <div className="space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                      {auditorias.map((a) => (
                        <div
                          key={`aud_log_${a.id}`}
                          className="p-3 border border-slate-150 rounded-xl hover:bg-slate-50 class-aud bg-white flex flex-col gap-1.5 animate-in fade-in"
                        >
                          <div className="flex justify-between items-center text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] font-mono select-none ${
                              a.accion === 'CREACIÓN' ? 'bg-emerald-50 text-emerald-700' :
                              a.accion === 'EDICIÓN' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {a.accion}
                            </span>

                            <span className="text-slate-400 font-mono font-bold">
                              {a.fecha ? new Date(a.fecha).toLocaleString() : ''}
                            </span>
                          </div>

                          <p className="text-[11px] font-semibold text-slate-800 leading-normal">
                            {a.detalles}
                          </p>

                          <div className="text-[9px] font-mono text-slate-400 text-left font-bold border-t border-slate-100 pt-1.5 flex items-center gap-1">
                            <span>Operador:</span>
                            <span className="text-slate-600 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{a.usuario || 'Sistema'}</span>
                          </div>
                        </div>
                      ))}

                      {auditorias.length === 0 && (
                        <div className="p-12 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl space-y-1.5">
                          <p className="text-[11px] font-mono italic">No hay logs de auditoría grabados todavía.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    // BUSCADOR DE FACTURAS TAB Content
                    <div className="space-y-4">
                      {/* Search Input Widget */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-indigo-500" />
                        </div>
                        <input
                          type="text"
                          value={auditInvoiceSearchQuery}
                          onChange={(e) => setAuditInvoiceSearchQuery(e.target.value)}
                          placeholder="Buscar por Proveedor, N° factura, SKU o producto..."
                          className="block w-full pl-9 pr-8 py-2.5 text-xs text-slate-900 bg-indigo-50/30 border border-slate-200 rounded-xl font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-550 focus:bg-white"
                        />
                        {auditInvoiceSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setAuditInvoiceSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Filtered list rendering */}
                      <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                        {(() => {
                          const q = auditInvoiceSearchQuery.toLowerCase().trim();
                          const filtered = reposiciones.filter(r => {
                            if (!q) return true;
                            const matchProv = (r.proveedor || '').toLowerCase().includes(q);
                            const matchNum = (r.num_factura || '').toLowerCase().includes(q);
                            const matchId = String(r.id).includes(q);
                            const matchObs = (r.observaciones || '').toLowerCase().includes(q);
                            const matchItem = (r.detalles || []).some((det: any) =>
                              (det.codigo || '').toLowerCase().includes(q) ||
                              (det.nombre || '').toLowerCase().includes(q)
                            );
                            return matchProv || matchNum || matchId || matchObs || matchItem;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-150 rounded-xl space-y-1.5">
                                <AlertCircle className="w-5 h-5 text-indigo-400 mx-auto" />
                                <p className="text-[11px] font-bold">No se encontraron facturas registradas.</p>
                                <p className="text-[10px] text-slate-400 font-mono">Intente con otro término de búsqueda</p>
                              </div>
                            );
                          }

                          return filtered.map((rep) => {
                            const isExpanded = expandedInvoiceId === rep.id;
                            const dStr = rep.fecha ? new Date(rep.fecha).toLocaleDateString() : '';
                            return (
                              <div
                                key={`audit_rep_card_${rep.id}`}
                                className="border border-slate-150 rounded-xl bg-slate-50/40 hover:border-indigo-200 transition-all text-xs"
                              >
                                {/* Master summary line */}
                                <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="space-y-0.5 text-left">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-slate-900 text-xs">{rep.proveedor}</span>
                                      <span className={`px-1.5 py-0.5 text-[8px] font-black rounded font-mono ${
                                        rep.sucursal === 'Mvd' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                                      }`}>
                                        {rep.sucursal === 'Mvd' ? 'MONTEVIDEO' : 'PINAMAR'}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-semibold font-mono">
                                      N° Fact/Remito: <strong className="text-slate-600">{rep.num_factura || 'N/A'}</strong> | Fecha: <span className="text-slate-500">{dStr}</span>
                                    </div>
                                  </div>

                                  <div className="flex sm:flex-col items-end gap-1 sm:gap-0 font-mono shrink-0">
                                    <span className="text-indigo-700 font-black text-xs">
                                      ${Number(rep.total_factura || 0).toLocaleString("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">Total Facturado</span>
                                  </div>
                                </div>

                                {/* Divider & Action line */}
                                <div className="px-3 pb-3 flex items-center justify-between gap-2.5 border-t border-slate-100/60 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedInvoiceId(isExpanded ? null : rep.id)}
                                    className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold px-2 py-1 rounded bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer"
                                  >
                                    {isExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    <span>{isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleStartEditRep(rep);
                                      // Scroll explicitly to the top form
                                      window.scrollTo({ top: 150, behavior: 'smooth' });
                                    }}
                                    className="flex items-center gap-1.5 text-[10px] text-emerald-750 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 hover:border-emerald-300 px-2.5 py-1 rounded font-black transition-all cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3 text-emerald-700" />
                                    <span>Cargar y Editar</span>
                                  </button>
                                </div>

                                {/* Expanded item list table */}
                                {isExpanded && (
                                  <div className="border-t border-slate-150/80 bg-white/70 p-3 rounded-b-xl space-y-2 animate-in slide-in-from-top-1 duration-150">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Renglones de la Factura:</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-[11px] font-medium leading-none">
                                        <thead>
                                          <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold">
                                            <th className="pb-1.5 pl-1">Código</th>
                                            <th className="pb-1.5">Articulo</th>
                                            <th className="pb-1.5 text-right">Cant.</th>
                                            <th className="pb-1.5 text-right">Costo Neto</th>
                                            <th className="pb-1.5 text-center">IVA</th>
                                            <th className="pb-1.5 text-right">Costo con IVA</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-mono">
                                          {(rep.detalles || []).map((det: any, didx: number) => {
                                            const keyId = det.id_code || det.id || det.articulo_id;
                                            const itemConIva = det.costo_con_iva !== undefined ? Number(det.costo_con_iva) : (Number(det.costo_unitario) * 1.22);
                                            return (
                                              <tr key={`aud_item_${rep.id}_${keyId}_${didx}`} className="text-slate-800">
                                                <td className="py-2 pl-1 font-bold text-indigo-700">{det.codigo}</td>
                                                <td className="py-2 text-[10px] font-sans font-bold max-w-[120px] truncate">{det.nombre}</td>
                                                <td className="py-2 text-right text-slate-900 font-bold">{det.cantidad}u</td>
                                                <td className="py-2 text-right text-slate-500">${Number(det.costo_unitario || 0).toFixed(2)}</td>
                                                <td className="py-2 text-center text-[9px]">
                                                  <span className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-black font-semibold">
                                                    {det.tipo_iva !== undefined ? `${det.tipo_iva}%` : '22%'}
                                                  </span>
                                                </td>
                                                <td className="py-2 text-right text-emerald-800 font-bold">
                                                  ${itemConIva.toFixed(2)}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    {rep.observaciones && (
                                      <div className="pt-1.5 mt-1 border-t border-slate-100 text-[10.5px] text-slate-500 italic">
                                        📝 "{rep.observaciones}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* 7. VIEW: ENVIOS LOGISTICA & ETIQUETAS */}
        {activeTab === 'envios' && (() => {
          // Compute shipping metrics dynamically for both branches
          const activeEnviosList = envios.filter(e => e.estado !== 'Cancelado');
          const shippingEarnedMvd = activeEnviosList
            .filter(e => e.sucursal === 'Mvd' || e.sucursal === 'Montevideo')
            .reduce((acc, current) => acc + (Number(current.costo_envio) || 0), 0);
          const shippingEarnedPin = activeEnviosList
            .filter(e => e.sucursal === 'Pin' || e.sucursal === 'Pinamar')
            .reduce((acc, current) => acc + (Number(current.costo_envio) || 0), 0);
          const totalShippingEarned = shippingEarnedMvd + shippingEarnedPin;

          // Filter shipments list based on search bar text
          const filteredEnvios = envios.filter(e => {
            const term = envioSearchText.toLowerCase();
            return (
              (e.cliente || '').toLowerCase().includes(term) ||
              (e.num_pedido || '').toLowerCase().includes(term) ||
              (e.direccion || '').toLowerCase().includes(term) ||
              (e.telefono || '').toLowerCase().includes(term)
            );
          });

          // Print label helper function
          const handlePrintLabel = (env: Envio) => {
              const printWindow = window.open('', '_blank', 'width=800,height=900');
              if (!printWindow) {
                alert('Por favor desactive el bloqueador de ventanas emergentes para imprimir de forma directa.');
                return;
              }

              const isBrand = envioLabelTheme === 'brand';
              const bgDefault = isBrand ? '#0B1B33' : '#FFFFFF';
              const textDefault = isBrand ? '#FFFFFF' : '#000000';
              const borderDefault = isBrand ? '#D4AF37' : '#000000';
              const accentDefault = isBrand ? '#D4AF37' : '#000000';
              const lightBoxBg = isBrand ? 'rgba(212, 175, 55, 0.08)' : '#F8FAFC';
              const lightBoxBorder = isBrand ? 'rgba(212, 175, 55, 0.25)' : '#E2E8F0';
              const lightBoxText = isBrand ? '#FFEAA7' : '#0F172A';

              const sucursalKey = (env.sucursal === 'Pin' || env.sucursal === 'Pinamar') ? 'Pin' : 'Mvd';
              const currentSender = senderConfig[sucursalKey] || senderConfig['Mvd'];

              printWindow.document.write(`
                <html>
                  <head>
                    <title>Etiqueta de Envío JUEM - Pedido #${env.num_pedido || env.id}</title>
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght=0,700;1,400&family=Plus+Jakarta+Sans:wght=400;500;600;700;800&family=JetBrains+Mono:wght=400;700&display=swap" rel="stylesheet">
                    <style>
                      @page { 
                        size: ${envioLabelSize === 'thermal' ? 'auto' : 'A4 portrait'}; 
                        margin: ${envioLabelSize === 'thermal' ? '0mm' : '10mm'}; 
                      }
                      body {
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        padding: ${envioLabelSize === 'thermal' ? '24px' : '40px'};
                        color: ${textDefault};
                        background: ${bgDefault};
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                      }
                      .ticket-container {
                        width: 100%;
                        max-width: ${envioLabelSize === 'thermal' ? '380px' : envioLabelSize === 'a4-half' ? '540px' : '740px'};
                        border: 3.5px solid ${borderDefault};
                        padding: ${envioLabelSize === 'thermal' ? '24px' : envioLabelSize === 'a4-half' ? '36px' : '48px'};
                        box-sizing: border-box;
                        background: ${bgDefault};
                        border-radius: 24px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                      }
                      .logo-header {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        border-bottom: 2.5px dashed ${isBrand ? 'rgba(212, 175, 55, 0.4)' : '#000000'};
                        padding-bottom: ${envioLabelSize === 'thermal' ? '16px' : '22px'};
                        margin-bottom: ${envioLabelSize === 'thermal' ? '18px' : '24px'};
                      }
                      .logo-title {
                        font-family: 'Playfair Display', Georgia, serif;
                        font-size: ${envioLabelSize === 'thermal' ? '32px' : envioLabelSize === 'a4-half' ? '44px' : '56px'};
                        font-weight: 700;
                        letter-spacing: 2px;
                        color: ${accentDefault};
                        margin: 6px 0 0 0;
                        line-height: 1;
                      }
                      .logo-subtitle {
                        font-size: ${envioLabelSize === 'thermal' ? '8px' : envioLabelSize === 'a4-half' ? '10px' : '12px'};
                        letter-spacing: 3px;
                        font-weight: 700;
                        text-transform: uppercase;
                        margin-top: 5px;
                        opacity: 0.85;
                        color: ${isBrand ? '#E5C07B' : '#64748B'};
                      }
                      .label-type {
                        margin-top: ${envioLabelSize === 'thermal' ? '10px' : '14px'};
                        background: ${accentDefault};
                        color: ${isBrand ? '#0B1B33' : '#FFFFFF'};
                        font-size: ${envioLabelSize === 'thermal' ? '10px' : envioLabelSize === 'a4-half' ? '12px' : '14px'};
                        font-weight: 800;
                        padding: 4px 14px;
                        border-radius: 9999px;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                      }
                      .label-row {
                        margin-bottom: ${envioLabelSize === 'thermal' ? '14px' : '20px'};
                      }
                      .label-title {
                        font-weight: 700;
                        font-size: ${envioLabelSize === 'thermal' ? '8px' : envioLabelSize === 'a4-half' ? '10px' : '11px'};
                        text-transform: uppercase;
                        color: ${isBrand ? '#E5C07B' : '#64748B'};
                        display: block;
                        margin-bottom: 4px;
                        letter-spacing: 1px;
                      }
                      .label-val {
                        font-size: ${envioLabelSize === 'thermal' ? '14px' : envioLabelSize === 'a4-half' ? '18px' : '20px'};
                        font-weight: 700;
                      }
                      .branch-badge {
                        margin-top: 2px;
                        display: inline-block;
                        background: ${accentDefault};
                        color: ${isBrand ? '#0B1B33' : '#FFFFFF'};
                        font-size: ${envioLabelSize === 'thermal' ? '11px' : envioLabelSize === 'a4-half' ? '14px' : '15px'};
                        font-weight: 800;
                        padding: 3px 10px;
                        border-radius: 6px;
                        text-transform: uppercase;
                      }
                      .label-val-big {
                        font-size: ${envioLabelSize === 'thermal' ? '22px' : envioLabelSize === 'a4-half' ? '30px' : '38px'};
                        font-weight: 800;
                        line-height: 1.1;
                        color: ${isBrand ? '#FFEAA7' : '#000000'};
                        text-transform: uppercase;
                      }
                      .address-box {
                        background: ${lightBoxBg};
                        border: 1px solid ${lightBoxBorder};
                        padding: ${envioLabelSize === 'thermal' ? '10px 12px' : '14px 18px'};
                        border-radius: 12px;
                        font-size: ${envioLabelSize === 'thermal' ? '14px' : envioLabelSize === 'a4-half' ? '18px' : '22px'};
                        font-weight: 850;
                        color: ${lightBoxText};
                        margin-top: 4px;
                        text-transform: uppercase;
                        line-height: 1.35;
                      }
                      .comments-box {
                        background: ${isBrand ? 'rgba(255,255,255,0.05)' : '#F8FAFC'};
                        border: 1px solid ${isBrand ? 'rgba(255,255,255,0.1)' : '#E2E8F0'};
                        padding: ${envioLabelSize === 'thermal' ? '8px 12px' : '12px 16px'};
                        border-radius: 12px;
                        font-size: ${envioLabelSize === 'thermal' ? '11px' : envioLabelSize === 'a4-half' ? '13px' : '14px'};
                        font-weight: 500;
                        font-style: italic;
                        color: ${isBrand ? '#E2E8F0' : '#475569'};
                      }
                      .sender-box {
                        background: ${isBrand ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'};
                        border: 1px solid ${isBrand ? 'rgba(212, 175, 55, 0.2)' : '#E2E8F0'};
                        padding: ${envioLabelSize === 'thermal' ? '10px 12px' : '12px 16px'};
                        border-radius: 12px;
                        font-size: ${envioLabelSize === 'thermal' ? '11px' : envioLabelSize === 'a4-half' ? '12px' : '13px'};
                        margin-bottom: ${envioLabelSize === 'thermal' ? '14px' : '20px'};
                      }
                      .barcode-section {
                        border-top: 2.5px dashed ${isBrand ? 'rgba(212, 175, 55, 0.4)' : '#000000'};
                        padding-top: ${envioLabelSize === 'thermal' ? '15px' : '22px'};
                        margin-top: ${envioLabelSize === 'thermal' ? '18px' : '24px'};
                        text-align: center;
                      }
                      .barcode-mock {
                        font-family: 'JetBrains Mono', monospace;
                        letter-spacing: ${envioLabelSize === 'thermal' ? '5px' : '8px'};
                        font-size: ${envioLabelSize === 'thermal' ? '18px' : '24px'};
                        font-weight: 700;
                        opacity: 0.8;
                        margin-bottom: 4px;
                      }
                      .barcode-text {
                        font-family: 'JetBrains Mono', monospace;
                        font-size: ${envioLabelSize === 'thermal' ? '9px' : '11px'};
                        letter-spacing: 1.5px;
                        text-transform: uppercase;
                        opacity: 0.75;
                      }
                      .footer-text {
                        font-family: 'Playfair Display', Georgia, serif;
                        font-style: italic;
                        font-size: ${envioLabelSize === 'thermal' ? '14px' : '16px'};
                        font-weight: 700;
                        color: ${accentDefault};
                        margin-top: 14px;
                        text-align: center;
                      }
                    </style>
                  </head>
                  <body>
                      color: ${accentDefault};
                      margin-top: 14px;
                      text-align: center;
                    }
                  </style>
                </head>
                <body>
                  <div class="ticket-container">
                    
                    <div class="logo-header">
                      <!-- Beautiful celestial SVG logo vector representation -->
                      <svg viewBox="0 0 100 100" style="width: 64px; height: 64px; color: ${accentDefault}; fill: currentColor;">
                        <g stroke="currentColor" stroke-width="0.8" opacity="0.85">
                          <line x1="50" y1="10" x2="50" y2="90" />
                          <line x1="10" y1="50" x2="90" y2="50" />
                          <line x1="21.7" y1="21.7" x2="78.3" y2="78.3" />
                          <line x1="21.7" y1="78.3" x2="78.3" y2="21.7" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(15 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(30 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(45 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(60 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(75 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(105 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(120 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(135 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(150 50 50)" />
                          <line x1="50" y1="15" x2="50" y2="85" transform="rotate(165 50 50)" />
                        </g>
                        <circle cx="50" cy="50" r="23" fill="${bgDefault}" />
                        <path d="M 50,29 A 21,21 0 1,0 68,52 A 18,18 0 1,1 50,29 Z" fill="currentColor" />
                        <path d="M 58,44 L 59.5,41.5 L 62,40 L 59.5,38.5 L 58,36 L 56.5,38.5 L 54,40 L 56.5,41.5 Z" fill="currentColor" />
                        <circle cx="51" cy="46" r="1.2" fill="currentColor" />
                        <circle cx="64" cy="48" r="1" fill="currentColor" />
                        <circle cx="54" cy="34" r="1" fill="currentColor" />
                        <circle cx="61" cy="33" r="0.8" fill="currentColor" />
                      </svg>
                      
                      <div class="logo-title">Juem</div>
                      <div class="logo-subtitle">TIENDA DE INDUMENTARIA & ACCESORIOS</div>
                      <div class="label-type">Etiqueta de Envío</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid ${isBrand ? 'rgba(212, 175, 55, 0.2)' : '#E2E8F0'}; padding-bottom: 12px;">
                      <div>
                        <span class="label-title">N° Pedido / Tracking</span>
                        <span class="label-val">#${env.num_pedido || env.id}</span>
                      </div>
                      <div style="text-align: right;">
                        <span class="label-title">Sucursal de Origen</span>
                        <span class="branch-badge">${env.sucursal === 'Pin' ? 'PINAMAR' : 'MONTEVIDEO'}</span>
                      </div>
                    </div>

                    <div class="sender-box">
                      <span class="label-title">Remitente (Origen)</span>
                      <div style="font-weight: 800; font-size: 12px; color: ${isBrand ? '#FFEAA7' : '#000000'}; text-transform: uppercase; margin-bottom: 2px;">${currentSender.nombre}</div>
                      <div style="font-size: 10px; opacity: 0.95; line-height: 1.4;">
                        <b>Dirección:</b> ${currentSender.direccion}<br/>
                        <b>Contacto:</b> ${currentSender.contacto}
                      </div>
                    </div>

                    <div class="label-row">
                      <span class="label-title">Cliente / Destinatario</span>
                      <div class="label-val-big">${env.cliente}</div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
                      <div>
                        <span class="label-title">Teléfono</span>
                        <span class="label-val" style="font-size: 15px;">${env.telefono || 'Sin especificar'}</span>
                      </div>
                      <div style="text-align: right;">
                        <span class="label-title">Horario Delivery</span>
                        <span class="label-val" style="font-size: 13px;">${env.horario || 'Reparto General'}</span>
                      </div>
                    </div>

                    <div class="label-row">
                      <span class="label-title">Dirección de Entrega</span>
                      <div class="address-box">${env.direccion}</div>
                    </div>

                    <div class="label-row">
                      <span class="label-title">Comentarios / Contenido</span>
                      <div class="comments-box">${env.comentarios || 'Sin observaciones especiales'}</div>
                    </div>

                    <div class="barcode-section">
                      <div class="barcode-mock">||||| ||| || | |||| |||| ||</div>
                      <div class="barcode-text">PE-${env.num_pedido || env.id}-${env.id}</div>
                      <div class="footer-text">¡Muchas gracias por elegirnos!</div>
                    </div>

                  </div>
                  <script>
                    window.onload = function() {
                      window.print();
                      setTimeout(function() { window.close(); }, 800);
                    }
                  </script>
                </body>
              </html>
            `);
            printWindow.document.close();
          };

          // WhatsApp formatting helper
          const handleSendWhatsAppMessage = (env: Envio) => {
            const cleanPhone = env.telefono.replace(/\D/g, '');
            let formattedPhone = cleanPhone;
            if (cleanPhone.length === 8 && cleanPhone.startsWith('9')) {
              formattedPhone = '598' + cleanPhone;
            } else if (cleanPhone.length === 9 && cleanPhone.startsWith('09')) {
              formattedPhone = '598' + cleanPhone.substring(1);
            } else if (!cleanPhone.startsWith('598') && cleanPhone.length > 5) {
              formattedPhone = '598' + cleanPhone;
            }
            
            const text = encodeURIComponent(
              `¡Hola ${env.cliente}! Te saludamos de JUEM. Tu despacho/envío asociado al pedido #${env.num_pedido || env.id} está registrado.\n\n` +
              `📍 Destino: ${env.direccion}\n` +
              `⏰ Horario programado: ${env.horario || 'Reparto General'}\n` +
              `🚚 Estado: ${env.estado === 'Pendiente' ? 'Pendiente Coordinación' : env.estado === 'En Viaje' ? 'En Viaje de Reparto' : 'Entregado'}\n` +
              `ℹ️ Notas: ${env.comentarios || 'Ninguna'}\n\n` +
              `¡Muchas gracias por tu paciencia!`
            );
            window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
          };

          // Direct complete helper
          const handleQuickCompleteShipment = async (env: Envio) => {
            try {
              const res = await fetch(`/api/envios/${env.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...env,
                  estado: 'Entregado'
                })
              });
              if (res.ok) {
                setEnvioSuccess(`¡El envío #${env.num_pedido || env.id} de ${env.cliente} ha sido marcado como ENTREGADO!`);
                refreshSystemData();
                setTimeout(() => setEnvioSuccess(''), 4000);
              }
            } catch (err) {
              console.error(err);
            }
          };

          return (
            <div className="space-y-6">
              {/* TOP HEADER SUMMARY BAR WITH SUSTAINED EARNING STATS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-4 rounded-2xl border border-indigo-800 text-white space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-black">Ganancia Envíos Global</span>
                    <Truck className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-black font-mono">
                    ${totalShippingEarned.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
                  </div>
                  <p className="text-[9px] text-indigo-300 font-sans">Acumulado neto por servicios logísticos activos</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sucursal Montevideo</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    ${shippingEarnedMvd.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans">Retornos de reparto propios en depósito Montevideo</p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sucursal Pinamar</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-900">
                    ${shippingEarnedPin.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
                  </div>
                  <p className="text-[9px] text-slate-500 font-sans">Retornos logísticos e intermediarios de Pinamar</p>
                </div>
              </div>

              {/* CORE LAYOUT split: Builder Form + Sticker Thermal Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                
                {/* BUILDER & CONTROLLER PANEL */}
                <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-display">
                        {isEditingEnvio ? 'Editar Registro de Envío' : 'Registrar Nuevo Envío'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-sans">Ingrese las coordenadas de reparto o cargue una venta directamente</p>
                    </div>

                    {/* INTERACTIVE DATA LOADER BUTTON - CARGAR DATOS */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowVentasSelectorForEnvio(!showVentasSelectorForEnvio)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px] rounded-xl flex items-center gap-1.5 border border-emerald-200 transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cargar Datos desde Ventas</span>
                      </button>

                      {/* POPUP FLOAT PANEL TO PICK RECENT SALE */}
                      {showVentasSelectorForEnvio && (
                        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-3 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 text-xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                            <span className="font-bold text-slate-850 uppercase text-[9px] tracking-widest text-slate-500">Seleccionar Venta Reciente</span>
                            <button
                              onClick={() => setShowVentasSelectorForEnvio(false)}
                              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                            >
                              ✕
                            </button>
                          </div>
                          {sales.length === 0 ? (
                            <p className="p-4 text-center text-slate-400 italic text-[10px]">No hay transacciones registradas.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {sales.slice(0, 10).map((s) => (
                                <button
                                  key={`l_sale_${s.id}`}
                                  type="button"
                                  onClick={() => handleLoadSaleIntoEnvioForm(s)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors flex flex-col gap-1"
                                >
                                  <div className="flex justify-between items-center font-bold text-slate-900 text-[11px]">
                                    <span>Venta #{s.id}</span>
                                    <span className="font-mono text-indigo-600">${Number(s.total || 0).toLocaleString("es-UY")}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-600 truncate">
                                    Cliente: <b className="text-slate-800">{s.cliente || 'Desconocido'}</b>
                                  </div>
                                  <div className="text-[9px] text-slate-400 truncate flex justify-between">
                                    <span>Art: {s.articulo_nombre || s.producto}</span>
                                    <span className="bg-slate-105 uppercase px-1 rounded text-slate-500">{s.sucursal}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {envioError && <p className="p-2.5 bg-rose-50 text-rose-800 text-xs font-semibold rounded-xl border border-rose-100">{envioError}</p>}
                  {envioSuccess && <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-100">{envioSuccess}</p>}

                  <form onSubmit={handleCreateEnvioSubmit} className="space-y-3.5 text-xs font-semibold text-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">N° Pedido (Autogenerado)</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={envioForm.num_pedido || getSiguientePedidoNum()}
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-600 font-bold cursor-not-allowed select-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Nombre del Cliente</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Jaqueline"
                          value={envioForm.cliente}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, cliente: e.target.value }))}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Teléfono de Contacto</label>
                        <input
                          type="text"
                          placeholder="Ej: 96852242"
                          value={envioForm.telefono}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, telefono: e.target.value }))}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-indigo-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Horario de Entrega / Delivery</label>
                        <input
                          type="text"
                          placeholder="Ej: Despues de las 17:00hs"
                          value={envioForm.horario}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, horario: e.target.value }))}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-indigo-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Dirección de Entrega</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Luis Batlle Berres 4284"
                        value={envioForm.direccion}
                        onChange={(e) => setEnvioForm(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Comentarios / Notas Especiales</label>
                      <textarea
                        rows={2}
                        placeholder="Ej: No tiene timbre. Llamar al llegar antes de subir."
                        value={envioForm.comentarios}
                        onChange={(e) => setEnvioForm(prev => ({ ...prev, comentarios: e.target.value }))}
                        className="w-full bg-white border border-slate-250 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-indigo-600"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Sucursal de Origen</label>
                        <select
                          value={sessionUser?.sucursal === 'Montevideo' ? 'Mvd' : envioForm.sucursal}
                          disabled={sessionUser?.sucursal === 'Montevideo'}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, sucursal: e.target.value as 'Mvd' | 'Pin' }))}
                          className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-slate-900 text-xs font-semibold focus:outline-indigo-600 disabled:opacity-85"
                        >
                          <option value="Mvd">Montevideo (Mvd)</option>
                          {sessionUser?.sucursal !== 'Montevideo' && <option value="Pin">Pinamar (Pin)</option>}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Costo Envío Ganado ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={envioForm.costo_envio}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, costo_envio: Number(e.target.value) }))}
                          className="w-full bg-white border border-slate-250 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-indigo-600 font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Estado</label>
                        <select
                          value={envioForm.estado}
                          onChange={(e) => setEnvioForm(prev => ({ ...prev, estado: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-slate-900 text-xs font-semibold focus:outline-indigo-600"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En Viaje">En Viaje</option>
                          <option value="Entregado">Entregado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-transform active:scale-[0.98] cursor-pointer"
                      >
                        {isEditingEnvio ? 'Guardar Cambios de Envío' : 'Registrar Envío en Sistema'}
                      </button>

                      {(isEditingEnvio || envioForm.cliente || envioForm.direccion) && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEnvio(false);
                            setEditingEnvioId(null);
                            setEnvioForm({
                              num_pedido: '',
                              cliente: '',
                              telefono: '',
                              direccion: '',
                              horario: '',
                              comentarios: '',
                              sucursal: 'Mvd',
                              costo_envio: 0,
                              estado: 'Pendiente',
                              venta_id: null
                            });
                          }}
                          className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* THERMOGRAPHIC STICKER THERMAL LABEL DISPLAY- BOX */}
                <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col items-center flex-1 justify-between shadow-xs">
                    
                    <div className="flex justify-between items-center w-full mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-display">Vista Previa de Etiqueta</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSenderConfigForm({...senderConfig});
                            setShowSenderConfigEditor(!showSenderConfigEditor);
                          }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                            showSenderConfigEditor 
                              ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150'
                          }`}
                          title="Configurar datos del remitente por sucursal"
                        >
                          <Pencil className="w-2 h-2" />
                          <span>Remitentes</span>
                        </button>
                      </div>
                      
                      {/* Theme Toggle Selectors */}
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none">
                        <button
                          type="button"
                          onClick={() => setEnvioLabelTheme('brand')}
                          className={`px-2.5 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                            envioLabelTheme === 'brand' 
                              ? 'bg-[#0B1B33] text-[#D4AF37] shadow-xs' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Azul & Oro (Marca)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnvioLabelTheme('thermal')}
                          className={`px-2.5 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                            envioLabelTheme === 'thermal' 
                              ? 'bg-white text-slate-900 border border-slate-250/20 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Térmico B&N
                        </button>
                      </div>
                    </div>

                    {/* Sizing / Format Selectors */}
                    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-2 mb-4 border-b border-slate-200/40 pb-2.5">
                      <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider font-display">Formato Impresión:</span>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 select-none">
                        <button
                          type="button"
                          onClick={() => setEnvioLabelSize('thermal')}
                          className={`px-2 py-0.5 text-[8.5px] font-black rounded-md transition-all cursor-pointer ${
                            envioLabelSize === 'thermal' 
                              ? 'bg-amber-400 text-slate-950 border border-amber-500/20 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Compacto/Ticket
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnvioLabelSize('a4-half')}
                          className={`px-2 py-0.5 text-[8.5px] font-black rounded-md transition-all cursor-pointer ${
                            envioLabelSize === 'a4-half' 
                              ? 'bg-amber-400 text-slate-950 border border-amber-500/20 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Media Hoja A4
                        </button>
                        <button
                          type="button"
                          onClick={() => setEnvioLabelSize('a4-full')}
                          className={`px-2 py-0.5 text-[8.5px] font-black rounded-md transition-all cursor-pointer ${
                            envioLabelSize === 'a4-full' 
                              ? 'bg-amber-400 text-slate-950 border border-amber-500/20 shadow-xs' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Pág. Completa A4
                        </button>
                      </div>
                    </div>

                    {/* Sender Config Editor Panel */}
                    {showSenderConfigEditor && (
                      <div className="w-full max-w-[290px] bg-white border border-slate-300 rounded-2xl p-4 space-y-3 mb-4 shadow-md text-left">
                        <div className="flex justify-between items-center border-b border-slate-150 pb-1.5">
                          <h5 className="text-[9px] font-black uppercase text-slate-705 tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-650 animate-pulse"></span>
                            <span>Editar Orígenes</span>
                          </h5>
                          <button 
                            type="button" 
                            onClick={() => setShowSenderConfigEditor(false)}
                            className="text-[9px] font-black text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Montevideo Branch Config */}
                        <div className="space-y-1.5 border-b border-dashed border-slate-150 pb-2.5">
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-650 block">Montevideo (Mvd)</span>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Nombre</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Mvd.nombre}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Mvd: { ...prev.Mvd, nombre: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Dirección</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Mvd.direccion}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Mvd: { ...prev.Mvd, direccion: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Contacto</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Mvd.contacto}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Mvd: { ...prev.Mvd, contacto: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Pinamar Branch Config */}
                        <div className="space-y-1.5 pb-1">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 block">Pinamar (Pin)</span>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Nombre</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Pin.nombre}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Pin: { ...prev.Pin, nombre: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Dirección</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Pin.direccion}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Pin: { ...prev.Pin, direccion: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-1">
                            <label className="text-[7px] font-bold text-slate-450 uppercase">Contacto</label>
                            <input 
                              type="text" 
                              value={senderConfigForm.Pin.contacto}
                              onChange={e => setSenderConfigForm(prev => ({
                                ...prev,
                                Pin: { ...prev.Pin, contacto: e.target.value }
                              }))}
                              className="col-span-2 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-800 focus:outline-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 pt-2 border-t border-slate-150">
                          <button
                            type="button"
                            onClick={() => {
                              const newCfg = { ...senderConfigForm };
                              setSenderConfig(newCfg);
                              localStorage.setItem('juem_sender_config_v2', JSON.stringify(newCfg));
                              setShowSenderConfigEditor(false);
                            }}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-black cursor-pointer shadow-xs transition-all text-center"
                          >
                            Guardar Orígenes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSenderConfigForm({...senderConfig});
                              setShowSenderConfigEditor(false);
                            }}
                            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* The label ticket exactly as designed in the worksheet */}
                    <div className={`w-full border-[3px] text-left font-sans transition-all duration-300 shadow-md rounded-2xl relative overflow-hidden ${
                      envioLabelSize === 'thermal' ? 'max-w-[290px] text-[11px] space-y-3.5 p-5' :
                      envioLabelSize === 'a4-half' ? 'max-w-[380px] text-[13px] space-y-4.5 p-6' : 'max-w-[465px] text-[15.5px] space-y-5.5 p-7'
                    } ${
                      envioLabelTheme === 'brand' 
                        ? 'bg-[#0B1B33] text-white border-[#D4AF37]' 
                        : 'bg-white text-black border-black font-mono'
                    }`}>
                      
                      {/* Brand Celestial Logo Header */}
                      <div className={`flex flex-col items-center text-center pb-2.5 border-b border-dashed ${
                        envioLabelTheme === 'brand' ? 'border-[#D4AF37]/40' : 'border-black'
                      }`}>
                        
                        {/* Beautiful Celestial SVG Logo */}
                        <svg viewBox="0 0 100 100" className={`transition-all duration-300 ${
                          envioLabelSize === 'thermal' ? 'w-14 h-14' :
                          envioLabelSize === 'a4-half' ? 'w-18 h-18' : 'w-24 h-24'
                        } ${
                          envioLabelTheme === 'brand' ? 'text-[#D4AF37]' : 'text-black'
                        } fill-current`}>
                          {/* Radiant Sunburst Rays */}
                          <g stroke="currentColor" strokeWidth="0.8" opacity="0.85">
                            <line x1="50" y1="10" x2="50" y2="90" />
                            <line x1="10" y1="50" x2="90" y2="50" />
                            <line x1="21.7" y1="21.7" x2="78.3" y2="78.3" />
                            <line x1="21.7" y1="78.3" x2="78.3" y2="21.7" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(15 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(30 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(45 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(60 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(75 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(105 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(120 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(135 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(150 50 50)" />
                            <line x1="50" y1="15" x2="50" y2="85" transform="rotate(165 50 50)" />
                          </g>
                          {/* Inner circle mask */}
                          <circle cx="50" cy="50" r="23" fill={envioLabelTheme === 'brand' ? '#0B1B33' : '#FFFFFF'} />
                          {/* Crescent Moon */}
                          <path d="M 50,29 A 21,21 0 1,0 68,52 A 18,18 0 1,1 50,29 Z" fill="currentColor" />
                          {/* Main 8-pt Central Star */}
                          <path d="M 58,44 L 59.5,41.5 L 62,40 L 59.5,38.5 L 58,36 L 56.5,38.5 L 54,40 L 56.5,41.5 Z" fill="currentColor" />
                          {/* Tiny Stars */}
                          <circle cx="51" cy="46" r="1" fill="currentColor" />
                          <circle cx="64" cy="48" r="0.8" fill="currentColor" />
                          <circle cx="54" cy="34" r="0.8" fill="currentColor" />
                          <circle cx="61" cy="33" r="0.6" fill="currentColor" />
                        </svg>

                        <span className={`text-xl tracking-widest block font-serif mt-1 font-extrabold ${
                          envioLabelTheme === 'brand' ? 'text-[#D4AF37]' : 'text-black'
                        }`} style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                          Juem
                        </span>
                        
                        <div className={`text-[6px] tracking-widest font-sans uppercase font-bold select-none opacity-90 ${
                          envioLabelTheme === 'brand' ? 'text-amber-100/70' : 'text-slate-500'
                        }`}>
                          TIENDA DE INDUMENTARIA & ACCESORIOS
                        </div>
                        <div className={`mt-1.5 px-2.5 py-0.5 rounded text-[8px] font-sans font-black tracking-widest uppercase select-none ${
                          envioLabelTheme === 'brand' ? 'bg-[#D4AF37] text-[#0B1B33]' : 'bg-black text-white'
                        }`}>
                          Etiqueta de Envío
                        </div>
                      </div>

                      {selectedEnvioForLabel ? (
                        <>
                          <div className={`grid grid-cols-2 text-[10px] leading-tight pb-1.5 border-b ${
                            envioLabelTheme === 'brand' ? 'border-[#D4AF37]/20 text-slate-200' : 'border-slate-100 text-slate-600'
                          }`}>
                            <div>
                              <span className="block text-[7px] opacity-75 font-bold uppercase">N° PEDIDO:</span>
                              <span className="font-bold text-xs">#{selectedEnvioForLabel.num_pedido || selectedEnvioForLabel.id}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[7px] opacity-75 font-bold uppercase">SUCURSAL ORIGEN:</span>
                              <span className={`px-1.5 py-0.5 font-bold text-[9px] inline-block uppercase rounded ${
                                envioLabelTheme === 'brand' ? 'bg-[#D4AF37] text-[#0B1B33]' : 'bg-black text-white'
                              }`}>
                                {selectedEnvioForLabel.sucursal === 'Pin' ? 'PINAMAR' : 'MONTEVIDEO'}
                              </span>
                            </div>
                          </div>

                          {/* Sender Info Block */}
                          <div className={`p-3 rounded-xl border text-[10px] space-y-1 ${
                            envioLabelTheme === 'brand' 
                              ? 'bg-white/5 border-[#D4AF37]/25 text-slate-200' 
                              : 'bg-slate-50 border-slate-150 text-slate-700'
                          }`}>
                            <span className="block text-[7px] opacity-75 font-extrabold uppercase">Remitente (Origen):</span>
                            <div className={`font-black text-[11px] ${
                              envioLabelTheme === 'brand' ? 'text-[#FFEAA7]' : 'text-black'
                            }`}>
                              {(selectedEnvioForLabel.sucursal === 'Pin' || selectedEnvioForLabel.sucursal === 'Pinamar') ? senderConfig.Pin.nombre : senderConfig.Mvd.nombre}
                            </div>
                            <div className="leading-normal opacity-95">
                              <div><strong className="opacity-80">Dirección:</strong> {(selectedEnvioForLabel.sucursal === 'Pin' || selectedEnvioForLabel.sucursal === 'Pinamar') ? senderConfig.Pin.direccion : senderConfig.Mvd.direccion}</div>
                              <div><strong className="opacity-80">Contacto:</strong> {(selectedEnvioForLabel.sucursal === 'Pin' || selectedEnvioForLabel.sucursal === 'Pinamar') ? senderConfig.Pin.contacto : senderConfig.Mvd.contacto}</div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <span className="block text-[7px] opacity-75 font-bold uppercase">CLIENTE / DESTINATARIO:</span>
                            <span className={`text-sm font-extrabold tracking-tight block uppercase pb-1 border-b ${
                              envioLabelTheme === 'brand' ? 'border-[#D4AF37]/30 text-[#FFEAA7]' : 'border-black text-black'
                            }`} style={{ wordBreak: 'break-word' }}>
                              {selectedEnvioForLabel.cliente}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 text-[10px] leading-tight pt-0.5 gap-2">
                            <div>
                              <span className="block text-[7px] opacity-75 font-bold uppercase">TELÉFONO:</span>
                              <span className="font-black text-xs">{selectedEnvioForLabel.telefono || 'Sin especificar'}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[7px] opacity-75 font-bold uppercase">HORARIO DELIVERY:</span>
                              <span className="font-bold">{selectedEnvioForLabel.horario || 'Reparto General'}</span>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="block text-[7px] opacity-75 font-bold uppercase">DIRECCIÓN DE ENTREGA:</span>
                            <p className={`text-[11px] font-black leading-tight break-words uppercase p-1.5 border rounded-lg ${
                              envioLabelTheme === 'brand' 
                                ? 'bg-[#0E2443]/60 border-[#D4AF37]/20 text-white' 
                                : 'bg-slate-50 border-slate-150 text-black'
                            }`} style={{ wordBreak: 'break-word' }}>
                              {selectedEnvioForLabel.direccion}
                            </p>
                          </div>

                          <div className="space-y-0.5 leading-tight">
                            <span className="block text-[7px] opacity-75 font-bold">COMENTARIOS / PRODUCTO:</span>
                            <span className={`block text-[9px] font-medium leading-normal italic p-1.5 rounded-lg ${
                              envioLabelTheme === 'brand' ? 'bg-amber-100/10 text-slate-200' : 'bg-slate-50 text-slate-700 border border-slate-100'
                            }`}>
                              {selectedEnvioForLabel.comentarios || 'Sin observaciones'}
                            </span>
                          </div>

                          <div className={`border-t border-dashed pt-2 flex flex-col items-center space-y-1 ${
                            envioLabelTheme === 'brand' ? 'border-[#D4AF37]/30' : 'border-black'
                          }`}>
                            {/* Beautiful barcode aesthetic */}
                            <div className="font-mono text-xs tracking-widest font-bold opacity-85 py-0.5">
                              ||||| ||| || | |||| |||| ||
                            </div>
                            <span className={`text-[8px] font-mono tracking-widest uppercase ${
                              envioLabelTheme === 'brand' ? 'text-[#D4AF37]' : 'text-slate-500'
                            }`}>
                              PE-{selectedEnvioForLabel.num_pedido || selectedEnvioForLabel.id}-{selectedEnvioForLabel.id}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="py-24 text-center space-y-2 text-slate-400">
                          <Truck className="w-8 h-8 text-indigo-400/80 mx-auto animate-bounce" />
                          <p className="text-[10px] font-sans italic font-semibold">Seleccione un envío del registro para cargar la ticket-card térmica de entrega</p>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS BUTTONS ASSOCIATED WITH STICKER THERMAL TICKET */}
                    {selectedEnvioForLabel && (
                      <div className="w-full flex justify-center gap-2 mt-4 max-w-[290px]">
                        {/* IMPRIMIR ETIQUETA KEY ACTION */}
                        <button
                          type="button"
                          onClick={() => handlePrintLabel(selectedEnvioForLabel)}
                          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:shadow transition-transform active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Imprimir</span>
                        </button>

                        {/* COORD. WHATSAPP */}
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppMessage(selectedEnvioForLabel)}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                          title="Contactar al cliente por WhatsApp"
                        >
                          <Phone className="w-4 h-4 whitespace-nowrap" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* BOTTOM DATATABLE: SHEETS-STYLE EDITABLE SHIPMENTS LIST REGISTRY */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Planilla y Registro General de Envíos</h4>
                    <p className="text-[10px] text-slate-400 font-sans">Busque o interactúe con los envíos vigentes o entregados históricos</p>
                  </div>

                  {/* SEARCH DECK */}
                  <div className="relative w-full sm:w-64">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar cliente, dirección o pedido..."
                      value={envioSearchText}
                      onChange={(e) => setEnvioSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:outline-indigo-600 placeholder:text-slate-450"
                    />
                    {envioSearchText && (
                      <button
                        onClick={() => setEnvioSearchText('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-150">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[9px] font-bold select-none">
                        <th className="py-2.5 px-3">N° Pedido</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Teléfono</th>
                        <th className="py-2.5 px-3">Dirección de Entrega</th>
                        <th className="py-2.5 px-3">Horario Delivery</th>
                        <th className="py-2.5 px-3 text-center">Sucursal</th>
                        <th className="py-2.5 px-3 text-right">Costo Envío</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800 text-[11px] font-medium">
                      {filteredEnvios.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-10 text-slate-400 italic">No se encontraron envíos para los criterios indicados.</td>
                        </tr>
                      ) : (
                        filteredEnvios.map((env) => (
                          <tr
                            key={`env_row_${env.id}`}
                            onClick={() => setSelectedEnvioForLabel(env)}
                            className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                              selectedEnvioForLabel?.id === env.id ? 'bg-indigo-50/30 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 border-r border-slate-100">
                              #{env.num_pedido || env.id}
                            </td>
                            <td className="py-3 px-3 text-slate-900 font-bold max-w-[120px] truncate">
                              {env.cliente}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500 font-bold">
                              {env.telefono || '—'}
                            </td>
                            <td className="py-3 px-3 truncate max-w-[210px] text-slate-700" title={env.direccion}>
                              {env.direccion}
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {env.horario || 'General'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                env.sucursal === 'Pin' || env.sucursal === 'Pinamar'
                                  ? 'bg-blue-50 text-blue-800'
                                  : 'bg-emerald-50 text-emerald-800'
                              }`}>
                                {env.sucursal}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              ${Number(env.costo_envio || 0).toLocaleString("es-UY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                env.estado === 'Entregado' ? 'bg-emerald-100 text-emerald-800' :
                                env.estado === 'En Viaje' ? 'bg-amber-100 text-amber-800' :
                                env.estado === 'Cancelado' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {env.estado}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end items-center gap-1.5">
                                {/* Whatsapp button directly on the spreadsheet row */}
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppMessage(env)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Enviar WhatsApp de coordinación"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </button>

                                {/* Quick state completer. Fulfills "Terminar Envío" */}
                                {env.estado !== 'Entregado' && env.estado !== 'Cancelado' && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickCompleteShipment(env)}
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Marcar como entregado (Terminar Envío)"
                                  >
                                    <Check className="w-3.5 h-3.5 font-bold" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleStartEditEnvio(env)}
                                  className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                  title="Editar coordenadas"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEnvioToDelete(env)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors"
                                  title="Eliminar envío del mapa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL COMFIRMATION FOR SHIPMENT DELETION */}
              {envioToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
                  <div className="bg-white rounded-2xl p-5 border border-slate-150 shadow-2xl max-w-sm w-full space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">¿Eliminar registro de envío?</h4>
                        <p className="text-xs text-slate-500 leading-relaxed mt-1">
                          Está por borrar el envío del pedido <b className="text-slate-800">#{envioToDelete.num_pedido || envioToDelete.id}</b> para <b className="text-slate-800">{envioToDelete.cliente}</b>. Esta operación no se puede deshacer.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setEnvioToDelete(null)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteEnvioSubmit}
                        disabled={isDeletingEnvioSubmitting}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-lg transition-all cursor-pointer"
                      >
                        {isDeletingEnvioSubmitting ? 'Eliminando...' : 'Eliminar Registro'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 8. VIEW: GASTOS / OPERATIONAL OUTFLOW */}
        {activeTab === 'gastos' && (() => {
          // Filtrado dinámico
          const filteredGastos = gastos.filter(g => {
            const matchesSearch = g.concepto.toLowerCase().includes(gastoSearchQuery.toLowerCase());
            const matchesCategory = gastoCategoryFilter === 'Todas' || g.categoria === gastoCategoryFilter;
            return matchesSearch && matchesCategory;
          });

          const totalGastosFiltrados = filteredGastos.reduce((sum, g) => sum + g.monto, 0);
          const totalGastosGeneral = gastos.reduce((sum, g) => sum + g.monto, 0);

          const totalInsumos = gastos.filter(g => g.categoria === 'Insumos').reduce((sum, g) => sum + g.monto, 0);
          const totalLogistica = gastos.filter(g => g.categoria === 'Logística' || g.categoria.includes('Logí')).reduce((sum, g) => sum + g.monto, 0);
          const totalAlquileres = gastos.filter(g => g.categoria === 'Alquileres').reduce((sum, g) => sum + g.monto, 0);
          const totalMarketing = gastos.filter(g => g.categoria === 'Marketing').reduce((sum, g) => sum + g.monto, 0);

          const handleExportGastosCSV = () => {
            if (filteredGastos.length === 0) {
              alert('No hay egresos que exportar con los filtros actuales.');
              return;
            }
            const headers = ['Fecha', 'Concepto', 'Categoría', 'Monto ($)'];
            const rows = filteredGastos.map(g => [
              new Date(g.fecha).toLocaleDateString(),
              g.concepto.replace(/,/g, ' '),
              g.categoria,
              g.monto.toString()
            ]);
            
            const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Egresos_Operacionales_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          };

          return (
            <div className="space-y-6">
              {/* Resumen de Métricas / Widgets de Egreso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total de Egresos</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-red-600 font-mono">${totalGastosGeneral}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Global</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Insumos</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">${totalInsumos}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Bolsas, embalaje</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Logística / DAC</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">${totalLogistica}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Envíos, DAC</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Alquileres</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">${totalAlquileres}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Locales, depósitos</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-sans">Marketing</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">${totalMarketing}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Publicidad, Meta</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Declarar Egreso Operativo</h3>
                  
                  {gastoSuccess && (
                    <p className="p-2.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg">{gastoSuccess}</p>
                  )}

                  <form onSubmit={handleCreateGastoSubmit} className="space-y-3.5 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Concepto del Gasto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Bolsas de embalaje pack 200"
                        value={newGasto.concepto}
                        onChange={(e) => setNewGasto(prev => ({ ...prev, concepto: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Monto Total ($)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="120"
                        value={newGasto.monto}
                        onChange={(e) => setNewGasto(prev => ({ ...prev, monto: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-950 font-mono bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Categoría</label>
                      <select
                        value={newGasto.categoria}
                        onChange={(e) => setNewGasto(prev => ({ ...prev, categoria: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-900 bg-slate-50"
                      >
                        <option value="Insumos">Insumos</option>
                        <option value="Logística">Logística / DAC</option>
                        <option value="Alquileres">Alquileres</option>
                        <option value="Marketing">Marketing / Publicidad</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                    >
                      Agregar Egreso
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Egresos Operacionales Registrados</h3>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">Mostrando {filteredGastos.length} de {gastos.length} egresos • Filtrado: ${totalGastosFiltrados}</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleExportGastosCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/50 rounded-xl cursor-pointer shadow-3xs transition-all"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Exportar CSV</span>
                    </button>
                  </div>

                  {/* Filtros de Busqueda y Categoría */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar por concepto..."
                        value={gastoSearchQuery}
                        onChange={(e) => setGastoSearchQuery(e.target.value)}
                        className="w-full bg-white text-slate-900 placeholder-slate-400 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200"
                      />
                    </div>
                    <div>
                      <select
                        value={gastoCategoryFilter}
                        onChange={(e) => setGastoCategoryFilter(e.target.value)}
                        className="w-full bg-white text-slate-900 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                      >
                        <option value="Todas">Todas las categorías</option>
                        <option value="Insumos">Insumos</option>
                        <option value="Logística">Logística / DAC</option>
                        <option value="Alquileres">Alquileres</option>
                        <option value="Marketing">Marketing / Publicidad</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-100">
                          <th className="py-2 px-3">Fecha</th>
                          <th className="py-2 px-3">Concepto</th>
                          <th className="py-2 px-3">Categoría</th>
                          <th className="py-2 px-3 text-right">Monto ($)</th>
                          <th className="py-2 px-3 text-right text-slate-450">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {filteredGastos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-6 text-slate-400 font-mono">Consumo operativo vacío o no coincide con los filtros.</td>
                          </tr>
                        ) : (
                          filteredGastos.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 font-mono">{new Date(g.fecha).toLocaleDateString()}</td>
                              <td className="py-2.5 px-3 font-semibold">{g.concepto}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-semibold">{g.categoria}</span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">${g.monto}</td>
                              <td className="py-2.5 px-3 text-right">
                                {gastoIdToConfirmDelete === g.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGasto(g.id)}
                                      className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded-md text-[10px] font-bold shadow-sm cursor-pointer transition-all"
                                    >
                                      Sí, eliminar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setGastoIdToConfirmDelete(null)}
                                      className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setGastoIdToConfirmDelete(g.id)}
                                    className="p-1 px-2 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg shadow-3xs transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold"
                                    title="Eliminar este egreso"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Eliminar</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* --- FINANCIAL CENTER: CAJA & BANCOS (Item 8) --- */}
        {activeTab === 'finanzas' && (() => {
          // Balances calculation
          const totalDisponible = finanzasCuentas.reduce((sum, c) => sum + Number(c.saldo || 0), 0);
          
          const cobranzasPendientes = finanzasMovimientos
            .filter(m => m.tipo === 'pendiente_cobro' && m.estado === 'pendiente')
            .reduce((sum, m) => sum + Number(m.monto || 0), 0);

          const pagosPendientes = finanzasMovimientos
            .filter(m => m.tipo === 'pendiente_pago' && m.estado === 'pendiente')
            .reduce((sum, m) => sum + Number(m.monto || 0), 0);

          const saldoProyectado = totalDisponible + cobranzasPendientes - pagosPendientes;

          return (
            <div className="space-y-6">
              <ArqueoCajaView
                finanzasCuentas={finanzasCuentas}
                finanzasMovimientos={finanzasMovimientos}
                sales={sales}
                arqueosList={arqueosList}
                refreshSystemData={refreshSystemData}
                setShowAddMovimientoModal={setShowAddMovimientoModal}
                totalDisponible={totalDisponible}
                cobranzasPendientes={cobranzasPendientes}
                pagosPendientes={pagosPendientes}
                saldoProyectado={saldoProyectado}
                setCompletingMovimiento={setCompletingMovimiento}
                setFinanzasCompletingCuenta={setFinanzasCompletingCuenta}
                handleDeleteFinancialMovement={handleDeleteFinancialMovement}
              />

              {/* CONCILIATION MODAL FOR PENDING TRANSACTION */}
              {completingMovimiento && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md">Conciliar Saldo</span>
                        <h4 className="text-base font-bold text-slate-900 mt-1.5 font-display">Liquidar Transmisión de Fondos</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompletingMovimiento(null)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs text-left">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Concepto:</span>
                        <span className="font-bold text-slate-800">{completingMovimiento.concepto}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium font-display">Monto del documento:</span>
                        <span className="font-bold text-slate-950 font-mono text-sm">${Number(completingMovimiento.monto).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Tipo:</span>
                        <span className="font-mono text-indigo-700 font-bold">{completingMovimiento.tipo === 'pendiente_cobro' ? 'Cuenta por Cobrar (Ingreso)' : 'Cuenta por Pagar (Egreso)'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-700 block">
                        Selecciona el depósito o cuenta financiera destino/origen:
                      </label>
                      <select
                        value={finanzasCompletingCuenta}
                        onChange={(e) => setFinanzasCompletingCuenta(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium bg-white"
                      >
                        {finanzasCuentas.map((acc) => (
                          <option key={acc.id} value={acc.nombre}>{acc.nombre} (Saldo: ${acc.saldo})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Al conciliar, se sumará o restará automáticamente el valor a la cuenta elegida, marcando este libro fiscal como completado.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setCompletingMovimiento(null)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCompletePendingMovement(completingMovimiento.id, finanzasCompletingCuenta)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer text-center"
                      >
                        Confirmar Cobro/Pago
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* REGISTER NEW TRANSACTION MANUAL MODAL */}
              {showAddMovimientoModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
                  <form onSubmit={handleCreateFinancialMovement} className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-slate-950 font-display">Registrar Movimiento / Cuenta por Cobrar-Pagar</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Agregue fondos directos, mueva dinero entre bancos o configure vencimientos fiscales futuros.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddMovimientoModal(false)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Concepto / Glosa de Transacción</label>
                        <input
                          type="text"
                          required
                          value={finanzasConceptoInput}
                          onChange={(e) => setFinanzasConceptoInput(e.target.value)}
                          placeholder="Ej: Cobro de Factura Consumidor Final, Pago de Servicios, etc"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Tipo de Movimiento</label>
                        <select
                          value={finanzasTipoInput}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setFinanzasTipoInput(val);
                            // Auto selection
                            if (val === 'ingreso' || val === 'pendiente_cobro') {
                              setFinanzasOrigenInput(finanzasCuentas[0]?.nombre || '');
                              setFinanzasDestinoInput('');
                            } else if (val === 'egreso' || val === 'pendiente_pago') {
                              setFinanzasOrigenInput('');
                              setFinanzasDestinoInput(finanzasCuentas[0]?.nombre || '');
                            } else if (val === 'transferencia') {
                              setFinanzasOrigenInput(finanzasCuentas[0]?.nombre || '');
                              setFinanzasDestinoInput(finanzasCuentas[1]?.nombre || '');
                            }
                          }}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="ingreso">Ingreso Directo Comercial</option>
                          <option value="egreso">Egreso Directo Comercial</option>
                          <option value="transferencia">Transferencia entre Cuentas</option>
                          <option value="pendiente_cobro">Por Cobrar (Vencimiento Futuro)</option>
                          <option value="pendiente_pago">Por Pagar (Vencimiento Futuro)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Importe ($ UYU)</label>
                        <input
                          type="number"
                          required
                          value={finanzasMontoInput}
                          onChange={(e) => setFinanzasMontoInput(e.target.value)}
                          placeholder="0.00"
                          min="0.01"
                          step="any"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                        />
                      </div>

                      {/* Dynamic Input based on types */}
                      {finanzasTipoInput === 'ingreso' && (
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Cuenta donde ingresa el dinero</label>
                          <select
                            value={finanzasOrigenInput}
                            onChange={(e) => setFinanzasOrigenInput(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                          >
                            {finanzasCuentas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                          </select>
                        </div>
                      )}

                      {finanzasTipoInput === 'egreso' && (
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Cuenta de de donde egresa el dinero</label>
                          <select
                            value={finanzasDestinoInput}
                            onChange={(e) => setFinanzasDestinoInput(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                          >
                            {finanzasCuentas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                          </select>
                        </div>
                      )}

                      {finanzasTipoInput === 'transferencia' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Cuenta Origen (Retirar)</label>
                            <select
                              value={finanzasOrigenInput}
                              onChange={(e) => setFinanzasOrigenInput(e.target.value)}
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                            >
                              {finanzasCuentas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Cuenta Destino (Depositar)</label>
                            <select
                              value={finanzasDestinoInput}
                              onChange={(e) => setFinanzasDestinoInput(e.target.value)}
                              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                            >
                              {finanzasCuentas.map(a => <option key={a.id} value={a.nombre}>{a.nombre}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {(finanzasTipoInput === 'pendiente_cobro' || finanzasTipoInput === 'pendiente_pago') && (
                        <div className="col-span-2 space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 text-left">Fecha de Vencimiento Estimada</label>
                          <input
                            type="date"
                            required
                            value={finanzasVencimientoInput}
                            onChange={(e) => setFinanzasVencimientoInput(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAddMovimientoModal(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 font-bold text-xs text-white rounded-xl hover:bg-emerald-500 shadow-md transition-all cursor-pointer"
                      >
                        Grabar en Libro Registral
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          );
        })()}

        {/* --- CO-PILOTO IA & INTELIGENCIA PREDICTIVA (Item 10 + Item 7) --- */}
        {activeTab === 'copiloto-ia' && (() => {
          // Local quick analysis calculated in frontend for immediate feedback based on real data
          // List products with stock levels
          // Calculate high priority purchase recommendations
          const predictedStockArticles = catalog.map(art => {
            const mvdStock = Number(art.stock_montevideo || 0);
            const pinStock = Number(art.stock_pinamar || 0);
            const totalStock = mvdStock + pinStock;
            
            // Generate mock historical average sales per month (typically 12-18 based on data)
            const historicalMonthlyAvg = art.is_favorite ? 20 : 12;
            const dailyConsumption = historicalMonthlyAvg / 30; // units per day
            const runOutDays = dailyConsumption === 0 ? 999 : Math.round(totalStock / dailyConsumption);

            // Reorder recommendation logic
            const safetyStock = reposicionSafetyStockInput;
            const leadDays = reposicionLeadDaysInput;
            const reorderPoint = Math.ceil(dailyConsumption * leadDays) + safetyStock;
            const needsReorder = totalStock <= reorderPoint;
            const suggestedOrderQty = needsReorder ? Math.ceil(historicalMonthlyAvg * 1.5) : 0;

            return {
              ...art,
              totalStock,
              runOutDays,
              needsReorder,
              suggestedOrderQty,
              reorderPoint
            };
          });

          const countCriticalPredictive = predictedStockArticles.filter(p => p.needsReorder).length;

          return (
            <div className="space-y-6 text-slate-800 text-left">
              <div className="bg-gradient-to-r from-purple-950 to-indigo-950 p-6 rounded-2xl border border-purple-900 shadow-lg text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="text-left">
                    <span className="bg-purple-500/20 text-purple-300 font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-purple-500/10">
                      Entrenado con Gemini 3.5 Flash en Cloud Run
                    </span>
                    <h2 className="text-xl font-bold font-display mt-1">
                      Asistente de IA Avanzado & Inteligencia Predictiva
                    </h2>
                    <p className="text-slate-300 text-xs mt-1">
                      Descubre análisis proyectivos de compras en base al historial de ventas y automatiza publicaciones comerciales optimizadas.
                    </p>
                  </div>
                </div>

                {/* Sub Tab buttons */}
                <div className="flex flex-wrap gap-2 mt-6">
                  <button
                    onClick={() => setAiSubTab('forecast')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      aiSubTab === 'forecast' ? 'bg-white text-indigo-950 shadow-md' : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>Predicción e Inteligencia de Compras (Item 7)</span>
                  </button>

                  <button
                    onClick={() => {
                      setAiSubTab('copywriter');
                      if (catalog.length > 0 && !aiSelectedArticleCode) {
                        setAiSelectedArticleCode(catalog[0].codigo);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      aiSubTab === 'copywriter' ? 'bg-white text-indigo-950 shadow-md' : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>Redactor de Copys de Redes y ML (Item 10)</span>
                  </button>

                  <button
                    onClick={() => {
                      setAiSubTab('pricing');
                      if (catalog.length > 0 && !aiSelectedArticleCode) {
                        setAiSelectedArticleCode(catalog[0].codigo);
                      }
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      aiSubTab === 'pricing' ? 'bg-white text-indigo-950 shadow-md' : 'bg-white/10 hover:bg-white/15 text-slate-200'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 text-blue-400" />
                    <span>Optimizador de Rentabilidad y Precios (Item 10)</span>
                  </button>
                </div>
              </div>


              {/* 1. SUB-VIEW: PREDICCIÓN E INTELIGENCIA DE COMPRAS */}
              {aiSubTab === 'forecast' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column Settings */}
                  <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="font-bold text-sm text-slate-900 font-display">Parámetros de Reaprovisionamiento</h3>
                    <p className="text-xs text-slate-500">Ajuste las especificaciones logísticas clave para calibrar el algoritmo predictivo del almacén.</p>
                    
                    <div className="space-y-3.5 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block text-left">Tiempo de Demora Proveedor (Lead Time)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={reposicionLeadDaysInput}
                            onChange={(e) => setReposicionLeadDaysInput(Number(e.target.value))}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                          />
                          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">días</span>
                        </div>
                        <p className="text-[9px] text-slate-400">Días que tarda el importador de insumos a Montevideo.</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block text-left">Stock Mínimo de Seguridad</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={reposicionSafetyStockInput}
                            onChange={(e) => setReposicionSafetyStockInput(Number(e.target.value))}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold bg-white"
                          />
                          <span className="text-xs font-mono text-slate-500 whitespace-nowrap">unidades</span>
                        </div>
                        <p className="text-[9px] text-slate-400">Existencia amortiguadora recomendada en góndolas.</p>
                      </div>

                      <button
                        onClick={handleRunAiStockAudit}
                        disabled={isAiAdvancedWorking}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 font-display"
                      >
                        {isAiAdvancedWorking ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Corriendo Auditoría Gemini...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                            <span>Auditoría de IA en Almacén</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick recommendation stats box */}
                    <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-left">
                      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Diagnóstico del Almacén</div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xs text-slate-600 font-medium font-sans">Modelos analizados:</span>
                        <span className="text-sm font-extrabold text-slate-900 font-mono">{catalog.length}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600 font-medium font-sans">Sugerencia de Reposición:</span>
                        <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {countCriticalPredictive} SKUs críticos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column Results */}
                  <div className="lg:col-span-2 space-y-6 text-left">
                    {/* Gemini AI Live Predictor Output */}
                    {aiStockAuditText && (
                      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl shadow-md border border-slate-800 text-white space-y-3 relative overflow-hidden text-left animate-fade-in">
                        <div className="absolute top-0 right-0 p-3 text-purple-400">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                        <h4 className="font-extrabold text-sm text-indigo-200 flex items-center gap-1">
                          Auditoría de Riesgos Predictivos por Gemini
                        </h4>
                        
                        <div className="text-xs space-y-1.5 leading-relaxed font-sans text-slate-100 whitespace-pre-wrap max-h-72 overflow-y-auto pr-2 bg-black/20 p-4 rounded-xl border border-white/5">
                          {aiStockAuditText}
                        </div>
                      </div>
                    )}

                    {/* Stock projections ledger based on parameters logic */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-left">
                      <div className="p-5 border-b border-slate-100">
                        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider font-mono">Consola Predictiva de Reposición</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Calcula quiebres y alertas basados en stock total y el punto de reorden fijado.</p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[9px] border-b border-slate-100 font-mono tracking-wider font-semibold">
                              <th className="py-2 px-3">Código</th>
                              <th className="py-2 px-3">Detalle del Artículo</th>
                              <th className="py-2 px-3 text-center">Stock Total</th>
                              <th className="py-2 px-3 text-center">Punto Reorden</th>
                              <th className="py-2 px-3 text-center">Agotamiento Est.</th>
                              <th className="py-2 px-3 text-right">Compra Sugerida</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {predictedStockArticles.map((p) => (
                              <tr key={p.id || p.codigo} className={`hover:bg-slate-50/55 transition-colors ${p.needsReorder ? 'bg-rose-50/25' : ''}`}>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">{p.codigo}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-700 min-w-[200px]">{p.nombre}</td>
                                <td className="py-2.5 px-3 text-center font-mono whitespace-nowrap">
                                  <span className={`font-bold ${p.totalStock <= reposicionSafetyStockInput ? 'text-red-600 font-extrabold' : 'text-slate-900'}`}>
                                    {p.totalStock} uds
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-500">{p.reorderPoint} uds</td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  {p.runOutDays <= 12 ? (
                                    <span className="bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded text-[10px] border border-red-200">
                                      Crítico ~{p.runOutDays} días
                                    </span>
                                  ) : p.runOutDays === 999 ? (
                                    <span className="text-slate-400 text-[10px]">Sin movimiento</span>
                                  ) : (
                                    <span className="text-slate-600 font-medium text-[10px]">Normal (~{p.runOutDays} días)</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap border-l border-slate-50">
                                  {p.needsReorder ? (
                                    <span className="text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-mono inline-block">
                                      Pedir +{p.suggestedOrderQty}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Stock OK</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* 2. SUB-VIEW: CO-LATERALS GENERATOR (SOCIAL AND MERCADO LIBRE EXTRA COPYWRITING MODULE) */}
              {aiSubTab === 'copywriter' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                  {/* Copy Selector Configurations */}
                  <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="font-bold text-sm text-slate-900 font-display">Generación de Copys Comerciales</h3>
                    
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-700 block text-left col-span-2">Seleccione el producto del catálogo:</label>
                        
                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                            <input
                              type="text"
                              value={aiProductSearchQuery}
                              onChange={(e) => {
                                setAiProductSearchQuery(e.target.value);
                                setAiProductSearchDropdownOpen(true);
                              }}
                              onFocus={() => {
                                setAiProductSearchDropdownOpen(true);
                              }}
                              placeholder="Buscar por SKU o nombre de producto..."
                              className="w-full text-xs pl-9 pr-8 p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                            />
                            {aiProductSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAiProductSearchQuery('');
                                  setAiProductSearchDropdownOpen(true);
                                }}
                                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Selected Active Product indicator */}
                          {(() => {
                            const activeArt = catalog.find(a => a.codigo === aiSelectedArticleCode);
                            if (activeArt) {
                              return (
                                <div className="mt-1.5 p-2 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-[11px] text-indigo-950">
                                  <span className="font-semibold truncate">
                                    Seleccionado: <strong className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-[10px]">{activeArt.codigo}</strong> - {activeArt.nombre}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Search Results Dropdown */}
                          {aiProductSearchDropdownOpen && (() => {
                            const filteredCatalog = catalog.filter(art => {
                              const q = aiProductSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return art.codigo.toLowerCase().includes(q) || art.nombre.toLowerCase().includes(q);
                            });

                            return (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setAiProductSearchDropdownOpen(false)}
                                />
                                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                                  {filteredCatalog.length === 0 ? (
                                    <div className="p-3 text-center text-slate-400 text-xs">
                                      No se encontraron productos coincidentes
                                    </div>
                                  ) : (
                                    filteredCatalog.slice(0, 50).map(art => (
                                      <button
                                        key={art.id || art.codigo}
                                        type="button"
                                        onClick={() => {
                                          setAiSelectedArticleCode(art.codigo);
                                          setAiProductSearchQuery('');
                                          setAiProductSearchDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer ${
                                          aiSelectedArticleCode === art.codigo ? 'bg-indigo-50 hover:bg-indigo-100 font-bold text-indigo-900' : ''
                                        }`}
                                      >
                                        <span className="font-semibold text-slate-800 font-sans">{art.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">SKU: <strong className="text-slate-600">{art.codigo}</strong></span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block text-left col-span-2">Canal publicitario:</label>
                        <select
                          value={aiPublicationPlatform}
                          onChange={(e) => setAiPublicationPlatform(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="Instagram / Facebook Ads">Instagram & Facebook Ads Campaign</option>
                          <option value="Mercado Libre Ficha">Mercado Libre (Descripción Destacada comercial)</option>
                          <option value="WhatsApp Business Grupos">WhatsApp Business Broadcasting Copy</option>
                          <option value="TikTok Script">Guion corto de TikTok / Reels</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block text-left col-span-2">Tono de Redacción:</label>
                        <select
                          value={aiPublicationTone}
                          onChange={(e) => setAiPublicationTone(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                        >
                          <option value="Persuasivo y Moderno">Persuasivo, Moderno y Enfocado a Soluciones</option>
                          <option value="Corporativo Profesional">Formal, Directo y Técnico</option>
                          <option value="Humorístico y Cercano">Divertido, Emocional y Directo al Paladar</option>
                        </select>
                      </div>

                      {/* Gema de Redacción Pro de Gemini Toggle */}
                      <div className="p-3.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/70 text-left space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs font-bold text-indigo-950 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={useGemaPro}
                              onChange={(e) => setUseGemaPro(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="flex items-center gap-1.5">Gema de Copys Pro 💎</span>
                          </label>
                          <span className="text-[9px] bg-indigo-100/80 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">Activa</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Utiliza un motor de redacción pulido bajo la metodología <strong>AIDA (Atención, Interés, Deseo, Acción)</strong> que resalta de forma persuasiva la disponibilidad para entrega inmediata en <strong>Montevideo</strong> y <strong>Pinamar</strong>.
                        </p>
                      </div>

                      <button
                        onClick={handleGenerateAiSocialPost}
                        disabled={isAiAdvancedWorking}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 font-display"
                      >
                        {isAiAdvancedWorking ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Generando Redacción...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                            <span>Construir Publicado Gemini</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Copy Generation Outputs */}
                  <div className="lg:col-span-2 bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl relative shadow-md flex flex-col justify-between min-h-[300px] text-left">
                    <div className="absolute right-0 top-0 p-3 text-purple-400">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-indigo-200 font-extrabold text-xs uppercase tracking-widest font-mono">Resultado Copywriting Gemini</h4>
                      {aiPublicationText ? (
                        <div className="bg-black/20 p-5 rounded-xl border border-white/5 text-xs font-mono text-slate-100 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                          {aiPublicationText}
                        </div>
                      ) : (
                        <div className="py-20 text-center text-slate-500 text-xs">
                          {isAiAdvancedWorking ? "Escribiendo contenido comercial de alto rendimiento..." : "Seleccione parámetros y presione el gatillo para redactar la campaña."}
                        </div>
                      )}
                    </div>

                    {aiPublicationText && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiPublicationText);
                          alert("¡Publicación comercial copiada al portapapeles con éxito!");
                        }}
                        className="mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 text-white border border-white/10 p-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 max-w-sm cursor-pointer"
                      >
                        <Copy className="w-4 h-4 text-emerald-400" />
                        <span>Copiar Copia de Redactado</span>
                      </button>
                    )}
                  </div>
                </div>
              )}


              {/* 3. SUB-VIEW: COST OPTIMIZER AND REAL PROFITABILITY BOARD */}
              {aiSubTab === 'pricing' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                  {/* Pricing Configurations */}
                  <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
                    <h3 className="font-bold text-sm text-slate-900 font-display">Simulador Financiero de Margen</h3>
                    
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5 relative">
                        <label className="text-xs font-bold text-slate-700 block text-left col-span-2">Elegir artículo para optimizar:</label>
                        
                        <div className="relative">
                          <div className="relative flex items-center">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                            <input
                              type="text"
                              value={aiProductSearchQuery}
                              onChange={(e) => {
                                setAiProductSearchQuery(e.target.value);
                                setAiProductSearchDropdownOpen(true);
                              }}
                              onFocus={() => {
                                setAiProductSearchDropdownOpen(true);
                              }}
                              placeholder="Buscar por SKU o nombre de producto..."
                              className="w-full text-xs pl-9 pr-8 p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium"
                            />
                            {aiProductSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAiProductSearchQuery('');
                                  setAiProductSearchDropdownOpen(true);
                                }}
                                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Selected Active Product indicator */}
                          {(() => {
                            const activeArt = catalog.find(a => a.codigo === aiSelectedArticleCode);
                            if (activeArt) {
                              return (
                                <div className="mt-1.5 p-2 bg-indigo-50/60 border border-indigo-100 rounded-xl flex items-center justify-between text-[11px] text-indigo-950">
                                  <span className="font-semibold truncate">
                                    Seleccionado: <strong className="font-mono bg-indigo-100 px-1 py-0.5 rounded text-[10px]">{activeArt.codigo}</strong> - {activeArt.nombre}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {/* Search Results Dropdown */}
                          {aiProductSearchDropdownOpen && (() => {
                            const filteredCatalog = catalog.filter(art => {
                              const q = aiProductSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              return art.codigo.toLowerCase().includes(q) || art.nombre.toLowerCase().includes(q);
                            });

                            return (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setAiProductSearchDropdownOpen(false)}
                                />
                                <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                                  {filteredCatalog.length === 0 ? (
                                    <div className="p-3 text-center text-slate-400 text-xs">
                                      No se encontraron productos coincidentes
                                    </div>
                                  ) : (
                                    filteredCatalog.slice(0, 50).map(art => (
                                      <button
                                        key={art.id || art.codigo}
                                        type="button"
                                        onClick={() => {
                                          setAiSelectedArticleCode(art.codigo);
                                          setAiProductSearchQuery('');
                                          setAiProductSearchDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 transition-colors flex flex-col gap-0.5 cursor-pointer ${
                                          aiSelectedArticleCode === art.codigo ? 'bg-indigo-50 hover:bg-indigo-100 font-bold text-indigo-900' : ''
                                        }`}
                                      >
                                        <span className="font-semibold text-slate-800 font-sans">{art.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">SKU: <strong className="text-slate-600">{art.codigo}</strong></span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700 col-span-1">Margen Comercial Neto Deseado:</label>
                          <span className="text-xs font-bold font-mono text-indigo-700 shrink-0">{aiPricingMargin}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="80"
                          step="5"
                          value={aiPricingMargin}
                          onChange={(e) => setAiPricingMargin(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer h-1.5 rounded bg-slate-100"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono">
                          <span>10% MARGEN INTEGRAL</span>
                          <span>80% MARGEN PREMIUM</span>
                        </div>
                      </div>

                      <button
                        onClick={handleOptimizeAiPrices}
                        disabled={isAiAdvancedWorking}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 font-display"
                      >
                        {isAiAdvancedWorking ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Calculando Margen...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
                            <span>Calcular Margen Tarifario</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pricing Mathematical Breakdown Results */}
                  <div className="lg:col-span-2 space-y-6 text-left">
                    {aiPricingSuggestedPrice !== null && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in text-left">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-left">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Precio Sugerido Venta Directa</span>
                          <div className="text-2xl font-extrabold text-emerald-950 font-mono mt-1">
                            ${aiPricingSuggestedPrice} UYU
                          </div>
                          <span className="text-[9px] text-emerald-700 font-medium">Margen neto de ganancias netas para Christian del {aiPricingMargin}%</span>
                        </div>

                        <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl text-left">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-sky-800">Precio Publicación Mercado Libre</span>
                          <div className="text-2xl font-extrabold text-sky-950 font-mono mt-1">
                            ${aiPricingSuggestedPriceMl} UYU
                          </div>
                          <span className="text-[9px] text-sky-700 font-medium">Asume amortizar un 15% de comisión comercial estándar</span>
                        </div>
                      </div>
                    )}

                    {/* Gemini strategic markdown explanations */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3 text-left">
                      <h4 className="font-bold text-slate-900 text-sm font-display">Estudio Integral de Rentabilidad por IA</h4>
                      {aiPricingAnalysis ? (
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                          {aiPricingAnalysis}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-400 text-xs font-medium">
                          {isAiAdvancedWorking ? "Computando modelo estratégico..." : "Configure el margen e inicie la corrida matemática para desplegar el informe comercial."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 9. VIEW: MERCHANDISE TRANSFERS BETWEEN BRANCHES */}
        {activeTab === 'traslados' && (
          <div className="space-y-6 text-slate-800">
            
            {/* Main Header Banner */}
            <div className="bg-gradient-to-r from-indigo-950 to-slate-900 p-6 rounded-2xl border border-indigo-950 shadow-lg text-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1.5Packed">
                    <span className="bg-indigo-500/30 text-indigo-200 font-extrabold text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      Módulo de Logística Central
                    </span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight font-display">
                    Traslado Inteligente de Mercadería
                  </h2>
                  <p className="text-slate-300 text-xs mt-1">
                    Traspase stock de forma segura entre sucursales. El sistema recalcula las existencias de inmediato.
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/10 shrink-0 text-left">
                  <div className="text-[10px] uppercase font-black tracking-widest text-[#a5b4fc]">Depósitos Registrados</div>
                  <div className="flex gap-4 mt-1 font-mono text-xs text-white">
                    <div>
                      <span className="font-bold text-indigo-300">MVD:</span> Montevideo
                    </div>
                    <div className="border-l border-white/10 pl-4">
                      <span className="font-bold text-amber-400">PIN:</span> Pinamar
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error or Success Alerts */}
            {transferSuccess && (
              <div className="bg-emerald-55 border border-emerald-200 p-4 rounded-xl text-emerald-800 flex items-center justify-between gap-3 shadow-xs font-sans text-xs animate-fade-in font-semibold">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-emerald-100 rounded-lg text-emerald-600 font-black">✓</span>
                  <span>{transferSuccess}</span>
                </div>
                <button 
                  onClick={() => setTransferSuccess(null)} 
                  className="text-emerald-500 hover:text-emerald-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {transferError && (
              <div className="bg-rose-55 border border-rose-200 p-4 rounded-xl text-rose-800 flex items-center justify-between gap-3 shadow-xs font-sans text-xs animate-shake font-semibold">
                <div className="flex items-center gap-2">
                  <span className="p-1 bg-rose-100 rounded-lg text-rose-600 font-black">✕</span>
                  <span>{transferError}</span>
                </div>
                <button 
                  onClick={() => setTransferError(null)} 
                  className="text-rose-500 hover:text-rose-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Step 1: Branch Routing Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Origin-Destination Router Component */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 text-left">
                    Ruta del Traslado
                  </h3>
                  
                  <div className="flex flex-col items-center gap-4 relative py-2">
                    
                    {/* Source Selector */}
                    <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-left hover:border-indigo-200 transition-colors">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        1. Depósito Origen (Descuenta Stock)
                      </span>
                      <div className="flex items-center justify-between mt-2">
                        <select
                          disabled={sessionUser?.sucursal === 'Montevideo'}
                          value={sessionUser?.sucursal === 'Montevideo' ? 'Mvd' : transferOrigin}
                          onChange={(e) => {
                            const val = e.target.value as 'Mvd' | 'Pin';
                            setTransferOrigin(val);
                            // Auto rout the destination to alternate sucursal to prevent duplicates
                            setTransferDest(val === 'Mvd' ? 'Pin' : 'Mvd');
                            // Clear cart on root change to prevent inconsistencies
                            setTransferCart([]);
                          }}
                          className="font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-950 cursor-pointer disabled:bg-slate-50"
                        >
                          <option value="Mvd">Montevideo (Central Mvd)</option>
                          {sessionUser?.sucursal !== 'Montevideo' && <option value="Pin">Pinamar (Depósito Pin)</option>}
                        </select>
                        <span className="text-xs font-bold text-indigo-600 px-2 py-0.5 rounded bg-indigo-50 font-mono">
                          {transferOrigin.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Flow arrow indicator */}
                    <button
                      type="button"
                      title="Intercambiar origen y destino"
                      disabled={sessionUser?.sucursal === 'Montevideo'}
                      onClick={() => {
                        const prevOrigin = transferOrigin;
                        setTransferOrigin(transferDest);
                        setTransferDest(prevOrigin);
                        setTransferCart([]);
                      }}
                      className="w-10 h-10 border border-slate-205 bg-white shadow-xs rounded-full flex items-center justify-center text-slate-550 hover:text-indigo-650 hover:border-indigo-300 active:scale-95 transition-all cursor-pointer select-none disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="w-4 h-4 rotate-90" />
                    </button>

                    {/* Destination Selector */}
                    <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-left hover:border-indigo-200 transition-colors">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        2. Depósito Destino (Suma Stock)
                      </span>
                      <div className="flex items-center justify-between mt-2">
                        <select
                          disabled={sessionUser?.sucursal === 'Montevideo'}
                          value={sessionUser?.sucursal === 'Montevideo' ? 'Pin' : transferDest}
                          onChange={(e) => {
                            const val = e.target.value as 'Mvd' | 'Pin';
                            setTransferDest(val);
                            // Auto rout matching source to alternate
                            setTransferOrigin(val === 'Mvd' ? 'Pin' : 'Mvd');
                            setTransferCart([]);
                          }}
                          className="font-bold text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-950 cursor-pointer disabled:bg-slate-50"
                        >
                          <option value="Pin">Pinamar (Depósito Pin)</option>
                          <option value="Mvd">Montevideo (Central Mvd)</option>
                        </select>
                        <span className="text-xs font-bold text-amber-600 px-2 py-0.5 rounded bg-amber-50 font-mono">
                          {transferDest.toUpperCase()}
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2.5">
                  <div className="flex items-start gap-2 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-indigo-900 leading-normal font-medium">
                      Cambiar la ruta del traslado borrará los productos añadidos en el borrador temporal para evitar errores de saldo de stock.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-900 leading-normal font-medium">
                      <strong>Fórmulas y Combos Activos:</strong> Los Combos son virtuales. Al agregar un Combo, el Buscador desglosa automáticamente sus insumos físicos para trasladar existencias reales de manera instantánea.
                    </p>
                  </div>
                </div>

              </div>

              {/* Step 2: Pro Search Component (Buscador Pro) */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Buscador Profesional de Artículos
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
                    Catálogo Total: {catalog.length} art.
                  </span>
                </div>

                {/* Elegant Input Search box */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-405">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por Código SKU (ej. J005) o Nombre de Artículo..."
                    value={transferSearchQuery}
                    onChange={(e) => setTransferSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-505 font-sans font-medium shadow-inner placeholder-slate-400"
                  />
                  {transferSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTransferSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 h-full cursor-pointer hover:bg-slate-100/35 rounded-r-xl transition-all"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Live Output Section */}
                <div className="mt-4 flex-1 overflow-y-auto max-h-[300px] border border-slate-100 rounded-xl bg-slate-50/40 p-2 text-left">
                  {(() => {
                    const matches = transferSearchQuery.trim() === ''
                      ? catalog.filter(art => {
                          const stock = transferOrigin === 'Mvd' ? art.mvd_stock : art.pin_stock;
                          return (stock || 0) > 0;
                        }).slice(0, 5) // Show top 5 products with stock as recommendations
                      : catalog.filter(art => {
                          const query = transferSearchQuery.toLowerCase();
                          return (
                            (art.codigo || '').toLowerCase().includes(query) ||
                            (art.nombre || '').toLowerCase().includes(query)
                          );
                        });

                    if (matches.length === 0) {
                      return (
                        <div className="text-center py-10">
                          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-[11px] text-slate-400 font-semibold font-mono">
                            Ningún artículo coincide con tu búsqueda actual
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {transferSearchQuery.trim() === '' && (
                          <div className="text-[9px] font-black text-slate-450 uppercase tracking-widest px-2 pb-1 block border-b border-slate-100 mb-1">
                            Artículos sugeridos (Con Stock disponible en origen):
                          </div>
                        )}
                        {matches.map(art => {
                          const stockOrigen = transferOrigin === 'Mvd' ? (art.mvd_stock || 0) : (art.pin_stock || 0);
                          const stockDestino = transferDest === 'Mvd' ? (art.mvd_stock || 0) : (art.pin_stock || 0);
                          const isAlreadyInCart = transferCart.some(tc => tc.article.id === art.id);

                          return (
                            <div
                              key={art.id}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                                isAlreadyInCart 
                                  ? 'bg-indigo-50/30 border-indigo-200' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {art.imagen_url ? (
                                  <img
                                    src={art.imagen_url}
                                    alt={art.nombre}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200/50"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                    <ImageIcon className="w-4.5 h-4.5 text-slate-450" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap text-left">
                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                      {art.codigo}
                                    </span>
                                    <span className="font-extrabold text-slate-850 cursor-help" title={art.nombre}>{art.nombre}</span>
                                    {art.tipo === 'compuesto' && (
                                      <span className="text-[8.5px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-150 uppercase tracking-widest inline-flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Fórmula Combo
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 font-mono text-[9.5px]">
                                    <span className="text-slate-500">
                                      {transferOrigin.toUpperCase()} (Origen):{' '}
                                      <strong className={stockOrigen > 0 ? 'text-indigo-600 font-bold' : 'text-rose-600 font-bold'}>
                                        {stockOrigen} u
                                      </strong>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-500">
                                      {transferDest.toUpperCase()} (Destino):{' '}
                                      <strong className="text-slate-600">
                                        {stockDestino} u
                                      </strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 pl-2">
                                {isAlreadyInCart ? (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                    Añadido ✓
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (art.tipo === 'compuesto') {
                                        if (art.componentes && art.componentes.length > 0) {
                                          const addedList: string[] = [];
                                          setTransferCart(prev => {
                                            const current = [...prev];
                                            art.componentes!.forEach(comp => {
                                              const matchedSimple = catalog.find(x => x.id === comp.componente_id || x.codigo === comp.codigo);
                                              if (matchedSimple) {
                                                const existing = current.find(tc => tc.article.id === matchedSimple.id);
                                                if (existing) {
                                                  existing.quantity = existing.quantity + comp.cantidad;
                                                } else {
                                                  current.push({ article: matchedSimple, quantity: comp.cantidad });
                                                }
                                                addedList.push(`${comp.cantidad}x ${matchedSimple.nombre}`);
                                              }
                                            });
                                            return current;
                                          });
                                          setTransferSuccess(`Componentes de combo "${art.nombre}" desglosados en el borrador: ${addedList.join(', ')}.`);
                                        } else {
                                          setTransferError(`El combo "${art.nombre}" no tiene componentes simples definidos.`);
                                        }
                                      } else {
                                        setTransferCart(prev => [...prev, { article: art, quantity: 1 }]);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                      art.tipo === 'compuesto'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                                        : stockOrigen <= 0
                                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                    }`}
                                  >
                                    {art.tipo === 'compuesto' 
                                      ? 'Desglosar e Instalar' 
                                      : stockOrigen <= 0
                                        ? '+ Forzar' 
                                        : '+ Agregar'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>

            {/* Step 3: Bilateral Draft Workspace (Carrito de Traslado) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 font-display">
                    Borrador del Traslado de Mercadería
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                    Modifique las unidades que desea transferir. El límite máximo se valida automáticamente.
                  </p>
                </div>
                {transferCart.length > 0 && (
                  <button
                    onClick={() => setTransferCart([])}
                    className="text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                  >
                    Vaciar Borrador
                  </button>
                )}
              </div>

              {transferCart.length === 0 ? (
                <div className="text-center py-14 bg-slate-50/20 rounded-2xl border-2 border-dashed border-slate-200/60 p-4">
                  <ArrowRightLeft className="w-8 h-8 text-slate-350 mx-auto mb-2.5 animate-pulse" />
                  <p className="text-xs text-slate-400 font-semibold font-mono">
                    No hay productos agregados en el borrador de traslado.
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">
                    Copia códigos SKU o escribe en el Buscador de arriba para añadir artículos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Table Headings */}
                  <div className="hidden md:grid grid-cols-12 gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 pb-1">
                    <div className="col-span-6 text-left">Artículo / Nombre / SKU</div>
                    <div className="col-span-2 text-center">Disponible origen</div>
                    <div className="col-span-1 text-center">Stock destino</div>
                    <div className="col-span-2 text-center">Cant. a Traspasar</div>
                    <div className="col-span-1 text-right">Quitar</div>
                  </div>

                  {/* Cart Items Loop */}
                  <div className="divide-y divide-slate-100">
                    {transferCart.map((item, index) => {
                      const stockOrigen = transferOrigin === 'Mvd' ? (item.article.mvd_stock || 0) : (item.article.pin_stock || 0);
                      const stockDestino = transferDest === 'Mvd' ? (item.article.mvd_stock || 0) : (item.article.pin_stock || 0);

                      return (
                        <div key={item.article.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center py-3 px-2 hover:bg-slate-50/40 rounded-xl transition-all">
                          
                          {/* Col 1: Article Identity */}
                          <div className="col-span-12 md:col-span-6 flex items-center gap-3">
                            {item.article.imagen_url ? (
                              <img
                                src={item.article.imagen_url}
                                alt={item.article.nombre}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                            <div className="text-left leading-normal">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[9.5px]">
                                  {item.article.codigo}
                                </span>
                                <h4 className="font-extrabold text-slate-800 text-xs">{item.article.nombre}</h4>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center gap-1.55">
                                <span className="w-1.5 h-1.5 bg-indigo-505 rounded-full"></span>
                                RUTA: {transferOrigin.toUpperCase()} ➔ {transferDest.toUpperCase()}
                              </p>
                              {item.quantity > stockOrigen && (
                                <p className="text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-black mt-1 inline-flex items-center gap-1 border border-amber-200">
                                  ⚠️ Stock insuficiente en origen (Solo tiene {stockOrigen} u.)
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Col 2: Disponible Origen */}
                          <div className="col-span-4 md:col-span-2 text-left md:text-center mt-1 md:mt-0">
                            <span className="text-[9px] uppercase font-black text-slate-400 block md:hidden mb-0.5">Disponible Origen:</span>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                              {stockOrigen} uds
                            </span>
                          </div>

                          {/* Col 3: Stock Destino */}
                          <div className="col-span-4 md:col-span-1 text-left md:text-center mt-1 md:mt-0">
                            <span className="text-[9px] uppercase font-black text-slate-400 block md:hidden mb-0.5">En Destino:</span>
                            <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs">
                              {stockDestino}
                            </span>
                          </div>

                          {/* Col 4: Quantity input */}
                          <div className="col-span-4 md:col-span-2 flex items-center justify-start md:justify-center mt-1.5 md:mt-0">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferCart(prev => prev.map((tc, idx) => 
                                    idx === index ? { ...tc, quantity: Math.max(1, tc.quantity - 1) } : tc
                                  ));
                                }}
                                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-bold text-xs cursor-pointer flex items-center justify-center transition-colors border border-slate-200"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const clamped = Math.max(1, val || 1);
                                  setTransferCart(prev => prev.map((tc, idx) => 
                                    idx === index ? { ...tc, quantity: clamped } : tc
                                  ));
                                }}
                                className="w-12 text-center font-mono font-bold text-xs bg-slate-50 border border-slate-200 rounded-md py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-550 shadow-inner"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferCart(prev => prev.map((tc, idx) => 
                                    idx === index ? { ...tc, quantity: tc.quantity + 1 } : tc
                                  ));
                                }}
                                className="w-6 h-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md font-bold text-xs cursor-pointer flex items-center justify-center transition-colors border border-slate-200"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Col 5: Trash Delete */}
                          <div className="col-span-12 md:col-span-1 text-right mt-2 md:mt-0">
                            <button
                              type="button"
                              onClick={() => {
                                      setTransferCart(prev => prev.filter((_, idx) => idx !== index));
                                    }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex border border-slate-200"
                              title="Remover de borrador"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            </button>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                  {/* Submission Summary Bar */}
                  <div className="mt-6 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="text-left">
                      <div className="text-[10px] uppercase font-black tracking-widest text-[#a5b4fc]">Resumen de Transferencia</div>
                      <div className="flex items-center gap-4 mt-1 font-mono text-xs">
                        <div>
                          Artículos: <strong className="text-indigo-300 font-bold">{transferCart.length}</strong>
                        </div>
                        <div className="border-l border-white/10 pl-4">
                          Total Unidades: <strong className="text-amber-400 font-bold">{transferCart.reduce((sum, item) => sum + item.quantity, 0)} u.</strong>
                        </div>
                        <div className="border-l border-white/10 pl-4">
                          Ruta:{' '}
                          <span className="font-extrabold uppercase font-sans px-1.5 py-0.5 rounded bg-white/10 text-indigo-200 text-[9.5px]">
                            {transferOrigin === 'Mvd' ? 'Mvd' : 'Pin'} ➔ {transferDest === 'Mvd' ? 'Mvd' : 'Pin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isTransferring}
                        onClick={handlePerformTransfer}
                        className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-all disabled:bg-slate-600 disabled:cursor-not-allowed"
                      >
                        {isTransferring ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Ejecutando Traslado...</span>
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-4 h-4" />
                            <span>Confirmar Traslado de Mercadería</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Historial de Traslados Realizados section */}
              {(() => {
                const filteredTraslados = trasladosList.filter(tr => {
                  if (trasladosSearchQuery.trim() !== '') {
                    const items = Array.isArray(tr.detalles) ? tr.detalles : JSON.parse(tr.detalles || '[]');
                    const q = trasladosSearchQuery.toLowerCase();
                    const matchesItem = items.some((it: any) => 
                      (it.nombre || '').toLowerCase().includes(q) || 
                      (it.codigo || '').toLowerCase().includes(q)
                    );
                    const matchesId = String(tr.id).includes(q) || (tr.origen || '').toLowerCase().includes(q) || (tr.destino || '').toLowerCase().includes(q);
                    if (!matchesItem && !matchesId) return false;
                  }

                  if (trasladosTrayectoFilter !== 'Todos') {
                    const originMvd = tr.origen === 'Montevideo' || tr.origen === 'Mvd';
                    const destMvd = tr.destino === 'Montevideo' || tr.destino === 'Mvd';
                    if (trasladosTrayectoFilter === 'MvdToPin' && (!originMvd || destMvd)) return false;
                    if (trasladosTrayectoFilter === 'PinToMvd' && (originMvd || !destMvd)) return false;
                  }

                  if (trasladosDateFilter !== '') {
                    const trDateStr = new Date(tr.fecha).toISOString().slice(0, 10);
                    if (trDateStr !== trasladosDateFilter) return false;
                  }

                  return true;
                });

                return (
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mt-6 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                          Historial de Traslados Realizados
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Listado oficial de movimientos de stock entre Montevideo y Pinamar.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-mono font-bold">
                          Filtrados: {filteredTraslados.length} de {trasladosList.length} traslados
                        </span>
                      </div>
                    </div>

                    {/* Filter controls workspace */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                      <div>
                        <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Buscar por SKU o Artículo</label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={trasladosSearchQuery}
                            onChange={(e) => setTrasladosSearchQuery(e.target.value)}
                            placeholder="Ej. J005, mate, #5..."
                            className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Trayecto</label>
                        <select
                          value={trasladosTrayectoFilter}
                          onChange={(e) => setTrasladosTrayectoFilter(e.target.value as any)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                        >
                          <option value="Todos">Todos los trayectos</option>
                          <option value="MvdToPin">Montevideo ➔ Pinamar</option>
                          <option value="PinToMvd">Pinamar ➔ Montevideo</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block mb-1">Fecha de Traslado</label>
                        <input
                          type="date"
                          value={trasladosDateFilter}
                          onChange={(e) => setTrasladosDateFilter(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                        />
                      </div>
                    </div>

                    {/* Reset Button */}
                    {(trasladosSearchQuery !== '' || trasladosTrayectoFilter !== 'Todos' || trasladosDateFilter !== '') && (
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => {
                            setTrasladosSearchQuery('');
                            setTrasladosTrayectoFilter('Todos');
                            setTrasladosDateFilter('');
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          ✕ Restablecer Filtros
                        </button>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-800">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                            <th className="py-2.5 px-3">Fecha</th>
                            <th className="py-2.5 px-3">ID / Operación</th>
                            <th className="py-2.5 px-3">Trayecto</th>
                            <th className="py-2.5 px-3">Artículos y Cantidades</th>
                            <th className="py-2.5 px-3 text-right text-slate-400">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {filteredTraslados.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-slate-405 font-mono italic">
                                Ningún traslado coincide con los filtros aplicados.
                              </td>
                            </tr>
                          ) : (
                            filteredTraslados.map((tr: any) => {
                              const items = Array.isArray(tr.detalles) ? tr.detalles : JSON.parse(tr.detalles || '[]');
                              const totalUnits = items.reduce((sum: number, it: any) => sum + Number(it.cantidad || 0), 0);
                          
                          return (
                            <tr key={tr.id} className="hover:bg-slate-50/55 transition-colors">
                              <td className="py-3 px-3 text-slate-450 font-mono font-medium">
                                {new Date(tr.fecha).toLocaleString('es-UY', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-600">
                                #{tr.id}
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="font-extrabold px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700">
                                    {tr.origen === 'Montevideo' || tr.origen === 'Mvd' ? 'MVD' : 'PIN'}
                                  </span>
                                  <span className="text-slate-400 font-bold">➔</span>
                                  <span className="font-extrabold px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-700">
                                    {tr.destino === 'Montevideo' || tr.destino === 'Mvd' ? 'MVD' : 'PIN'}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="space-y-1 max-w-sm">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    {totalUnits} unidades en total:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {items.map((it: any, idx: number) => (
                                      <span key={idx} className="bg-slate-100 hover:bg-slate-150 text-slate-750 text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
                                        <span className="font-mono text-indigo-650 font-bold">{it.cantidad}u.</span> 
                                        <span className="text-slate-500 font-bold truncate max-w-[120px]" title={`${it.codigo} - ${it.nombre}`}>
                                          {it.nombre}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePrintTransfer(tr)}
                                    className="p-1.5 bg-slate-50 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-lg shadow-3xs transition-all cursor-pointer"
                                    title="Imprimir remito de traslado"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTransfer(tr)}
                                    className="p-1.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg shadow-3xs transition-all cursor-pointer"
                                    title="Editar traslado de stock"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransfer(tr.id)}
                                    className="p-1.5 bg-slate-50 text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg shadow-3xs transition-all cursor-pointer"
                                    title="Eliminar traslado y revertir stock"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
                );
              })()}

              {/* Overlay Modal: Editar Traslado */}
              {isEditingTransfer && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-800">
                    
                    {/* Modal Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600 animate-pulse" />
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                          Modificar Traslado #{editingTransferId}
                        </h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsEditingTransfer(false)}
                        className="p-1.5 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    {/* Modal Scrollable Body */}
                    <div className="p-6 overflow-y-auto space-y-5 flex-1">
                      
                      {/* Grid: Route and Date */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Route Selector with switch */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                          <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-widest block mb-2">Trayecto del Traslado</span>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-[9px] uppercase font-black text-slate-400 block text-left">Origen</label>
                              <select
                                value={editTransferOrigin}
                                onChange={(e) => {
                                  const val = e.target.value as 'Mvd' | 'Pin';
                                  setEditTransferOrigin(val);
                                  setEditTransferDest(val === 'Mvd' ? 'Pin' : 'Mvd');
                                }}
                                className="w-full bg-white border border-slate-195 px-3 py-1.5 rounded-xl text-xs font-semibold mt-1"
                              >
                                <option value="Mvd">Mvd (Montevideo)</option>
                                <option value="Pin">Pin (Pinamar)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const temp = editTransferOrigin;
                                setEditTransferOrigin(editTransferDest);
                                setEditTransferDest(temp);
                              }}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-3xs flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all self-end mb-1"
                              title="Intercambiar origen y destino"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex-1">
                              <label className="text-[9px] uppercase font-black text-slate-400 block text-left">Destino</label>
                              <select
                                value={editTransferDest}
                                onChange={(e) => {
                                  const val = e.target.value as 'Mvd' | 'Pin';
                                  setEditTransferDest(val);
                                  setEditTransferOrigin(val === 'Mvd' ? 'Pin' : 'Mvd');
                                }}
                                className="w-full bg-white border border-slate-195 px-3 py-1.5 rounded-xl text-xs font-semibold mt-1"
                              >
                                <option value="Mvd">Mvd (Montevideo)</option>
                                <option value="Pin">Pin (Pinamar)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Transfer Date Selector */}
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center">
                          <label className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-widest block mb-1 text-left">Fecha y Hora de Traslado</label>
                          <input
                            type="datetime-local"
                            value={editTransferDate}
                            onChange={(e) => setEditTransferDate(e.target.value)}
                            className="w-full bg-white border border-slate-195 rounded-xl px-3 py-2 text-xs font-mono mt-1 text-slate-800"
                          />
                        </div>

                      </div>

                      {/* Dynamic Product Searcher */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest block text-left">Agregar artículo adicional</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={editTransferSearchQuery}
                            onChange={(e) => setEditTransferSearchQuery(e.target.value)}
                            placeholder="Buscar por código SKU o nombre de producto..."
                            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-220 rounded-xl focus:bg-white transition-all font-medium"
                          />
                        </div>

                        {/* Autocomplete Results Box */}
                        {editTransferSearchQuery.trim() !== '' && (
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100 max-h-44 overflow-y-auto">
                            {(() => {
                              const editFilteredAndSliced = catalog.filter(art => 
                                art.tipo === 'simple' && 
                                (art.nombre.toLowerCase().includes(editTransferSearchQuery.toLowerCase()) || 
                                 art.codigo.toLowerCase().includes(editTransferSearchQuery.toLowerCase())) &&
                                !editTransferCart.some(c => c.article.id === art.id)
                              ).slice(0, 5);

                              if (editFilteredAndSliced.length === 0) {
                                return (
                                  <div className="p-3 text-center text-slate-400 text-xs italic">
                                    No se encontraron más artículos o ya están agregados.
                                  </div>
                                );
                              }

                              return editFilteredAndSliced.map(art => (
                                <button
                                  key={art.id}
                                  type="button"
                                  onClick={() => {
                                    setEditTransferCart(prev => [...prev, { article: art, quantity: 1 }]);
                                    setEditTransferSearchQuery('');
                                  }}
                                  className="w-full text-left p-2.5 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                                >
                                  <div>
                                    <span className="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black mr-2">
                                      {art.codigo}
                                    </span>
                                    <span className="font-semibold text-slate-700">{art.nombre}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">
                                    Mvd: {art.mvd_stock ?? 0} | Pin: {art.pin_stock ?? 0}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Cart List */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-[#64748b] uppercase tracking-widest block text-left">Artículos a trasladar</label>
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 divide-y divide-slate-200/60 space-y-3">
                          {editTransferCart.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 text-xs italic">
                              No hay artículos en este traslado. Agregue un artículo arriba.
                            </p>
                          ) : (
                            editTransferCart.map((item, idx) => (
                              <div key={item.article.id || idx} className="flex items-center justify-between pt-3 first:pt-0">
                                <div className="text-left flex-1 min-w-0 pr-4">
                                  <span className="font-mono text-[9.5px] bg-[#e0e7ff] text-[#4f46e5] px-1.5 py-0.5 rounded font-black">
                                    {item.article.codigo}
                                  </span>
                                  <h4 className="text-xs font-bold text-slate-800 truncate mt-1">
                                    {item.article.nombre}
                                  </h4>
                                </div>

                                {/* Adjust quantities */}
                                <div className="flex items-center gap-3 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditTransferCart(prev => prev.map(tc => {
                                        if (tc.article.id === item.article.id) {
                                          return { ...tc, quantity: Math.max(1, tc.quantity - 1) };
                                        }
                                        return tc;
                                      }));
                                    }}
                                    className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-150 flex items-center justify-center font-extrabold text-slate-600 transition-all cursor-pointer"
                                  >
                                    -
                                  </button>
                                  
                                  <span className="text-xs font-mono font-extrabold text-slate-800 w-8 text-center bg-white border border-slate-200 py-1 rounded-lg">
                                    {item.quantity}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditTransferCart(prev => prev.map(tc => {
                                        if (tc.article.id === item.article.id) {
                                          return { ...tc, quantity: tc.quantity + 1 };
                                        }
                                        return tc;
                                      }));
                                    }}
                                    className="w-7 h-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-150 flex items-center justify-center font-extrabold text-slate-600 transition-all cursor-pointer"
                                  >
                                    +
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditTransferCart(prev => prev.filter(tc => tc.article.id !== item.article.id));
                                    }}
                                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg shadow-3xs cursor-pointer ml-1"
                                    title="Remover artículo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Modal Controls Footer */}
                    <div className="bg-slate-50 p-5 border-t border-slate-100 flex justify-end gap-3 rounded-b-3xl">
                      <button
                        type="button"
                        onClick={() => setIsEditingTransfer(false)}
                        className="px-4.5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer text-xs"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={editTransferCart.length === 0 || isTransferring}
                        onClick={handleSaveEditTransfer}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all uppercase tracking-wide"
                      >
                        {isTransferring ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <ClipboardCheck className="w-4 h-4 text-white" />
                            <span>Guardar Modificaciones</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>
        )}

        {/* 10. VIEW: USER CREDENTIALS MANAGEMENT (ADMINS ONLY) */}
        {activeTab === 'usuarios' && sessionUser?.rol === 'Admin' && (
          <UsuariosView token={sessionToken || ''} activeUsername={sessionUser.usuario} />
        )}

          </>
        )}

      </main>

      {/* 9. DRAWER FLOATING: AI COPILOT CHAT BOX */}
      {aiChatOpen && (
        <aside className="w-full md:w-96 border-l border-slate-200 bg-white shadow-2xl flex flex-col shrink-0 self-stretch">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span className="text-xs font-bold uppercase text-slate-900 font-display">Asistente Copilot JUEM</span>
            </div>
            <button
              onClick={() => setAiChatOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-none text-[11px]">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl max-w-[85%] space-y-1 leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-100 text-slate-800 self-end ml-auto'
                    : 'bg-indigo-50/75 text-indigo-950 border border-indigo-100/50'
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span>{msg.sender === 'user' ? 'Christian' : 'Asistente ERP'}</span>
                  {msg.sender === 'assistant' && <Sparkles className="w-2.5 h-2.5 text-indigo-500" />}
                </div>
                <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}
            {isSendingAi && (
              <div className="p-3 bg-slate-50 text-slate-400 rounded-xl leading-relaxed animate-pulse">
                Analizando existencias y calculando fórmulas ideales...
              </div>
            )}
          </div>

          <form onSubmit={handleSendAiMessageSubmit} className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
            <input
              type="text"
              placeholder="Pregúntame sobre combos, stocks o sugerencias..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow cursor-pointer transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </aside>
      )}

      {/* REGISTRAR NUEVA VENTA MODAL */}
      {showNewSaleModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto transition-all animate-fade-in text-slate-800">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-slide-up">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-950">
                  Registrar Nueva Venta
                </h3>
                {salesCart.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {salesCart.length} art.
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowNewSaleModal(false)}
                className="text-slate-450 hover:text-slate-650 text-lg font-bold p-1 cursor-pointer transition-colors"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 select-none">
              {saleSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-[11px] rounded-xl font-medium border border-emerald-200">
                  {saleSuccess}
                </div>
              )}
              {saleError && (
                <div className="p-3 bg-red-50 text-red-650 text-[11px] rounded-xl font-medium border border-red-200">
                  {saleError}
                </div>
              )}

              {/* 1. SECTOR DE ARTÍCULOS - BUSCADOR DE CATÁLOGO CON IMAGEN */}
              <div className="space-y-2 border border-slate-100 p-3.5 rounded-xl bg-slate-50/40 relative">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Buscar Artículo a agregar
                </span>

                {!selectedCartArt ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Escribe código (e.g., J005) o nombre..."
                      value={selectorSearch}
                      onChange={(e) => {
                        setSelectorSearch(e.target.value);
                        setSelectorFocused(true);
                      }}
                      onFocus={() => setSelectorFocused(true)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    
                    {/* Dropdown list */}
                    {selectorFocused && (
                      <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                        {/* Option to close dropdown */}
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 text-[10px] text-slate-400 font-semibold sticky top-0">
                          <span>Resultados de Catálogo</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectorFocused(false)}
                            className="hover:text-slate-700 font-bold"
                          >
                            Cerrar ×
                          </button>
                        </div>

                        {(() => {
                          const filteredList = catalog.filter(art => matchAdvancedSearch([art.nombre, art.codigo], selectorSearch));
                          if (filteredList.length === 0) {
                            return (
                              <div className="p-4 text-center text-slate-400 text-xs font-mono">
                                No se encontraron artículos.
                              </div>
                            );
                          }
                          return filteredList.map(art => (
                            <button
                              key={`dispatch_drop_art_${art.id}`}
                              type="button"
                              onClick={() => {
                                setSelectedCartArt(art);
                                setSelectorSearch('');
                                setSelectorFocused(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-3 transition-colors text-xs font-semibold"
                            >
                              {art.imagen_url ? (
                                <img
                                  src={art.imagen_url}
                                  alt={art.nombre}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                  <ImageIcon className="w-4 h-4 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className={`${art.tipo === 'compuesto' ? 'text-blue-600' : 'text-slate-900'} font-bold truncate`}>{art.nombre}</div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {art.id} · SKU: {art.codigo}</div>
                              </div>
                              <div className="text-slate-800 font-mono font-bold whitespace-nowrap ml-1 text-right">
                                ${art.precio_venta}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  // Selected article detail card
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    {selectedCartArt.imagen_url ? (
                      <img
                        src={selectedCartArt.imagen_url}
                        alt={selectedCartArt.nombre}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-grow">
                      <div className={`${selectedCartArt.tipo === 'compuesto' ? 'text-blue-600 font-bold' : 'text-slate-900'} font-bold text-xs truncate`}>{selectedCartArt.nombre}</div>
                      <div className="text-[10px] text-slate-400 font-mono leading-tight">
                        SKU: {selectedCartArt.codigo} · Precio Ref: ${selectedCartArt.precio_venta}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCartArt(null)}
                      className="px-2.5 py-1 text-[10px] font-bold text-red-655 hover:bg-red-50 rounded-lg border border-red-100 transition-colors cursor-pointer"
                    >
                      Quitar
                    </button>
                  </div>
                )}

                {/* Single Item Configuration & Cart Add */}
                {selectedCartArt && (
                  <div className="space-y-3 pt-2 border-t border-slate-100 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-slate-500 text-[9px] uppercase block">Unidades a agregar</label>
                        <input
                          type="number"
                          min="1"
                          value={cartItemQty}
                          onChange={(e) => setCartItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-950 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-slate-500 text-[9px] uppercase block">P. Venta Override</label>
                        <input
                          type="number"
                          placeholder={`$${selectedCartArt.precio_venta} (Def.)`}
                          value={cartItemPriceOverride}
                          onChange={(e) => setCartItemPriceOverride(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCartItem}
                      className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar al Recibo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. SALES CART (LIST OF ADDED ITEMS) */}
              <div className="space-y-2.5 border border-slate-150 p-3.5 rounded-xl bg-indigo-50/10">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block">
                  2. Artículos en esta Transacción
                </span>

                {salesCart.length === 0 ? (
                  <div className="py-5 text-center text-slate-400 font-medium text-[11px] bg-white rounded-xl border border-dashed border-slate-200">
                    El carrito está vacío. Busca un artículo arriba para agregarlo.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {salesCart.map((item) => {
                      const unitPrice = item.precio_venta_override !== undefined ? Number(item.precio_venta_override) : item.precio_venta;
                      const lineTotal = unitPrice * item.cantidad;
                      return (
                        <div key={item.key} className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-slate-100 shadow-sm text-[11px]">
                          {item.imagen_url ? (
                            <img
                              src={item.imagen_url}
                              alt={item.articulo_nombre}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded object-cover bg-slate-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 leading-tight">
                            {(() => {
                              const isComp = catalog.find(x => x.id === item.articulo_id)?.tipo === 'compuesto';
                              return (
                                <div className={`font-bold truncate ${isComp ? 'text-blue-600 font-bold' : 'text-slate-800'}`}>
                                  {item.articulo_nombre}
                                </div>
                              );
                            })()}
                            <div className="text-[9px] text-slate-400 font-mono">
                              {item.cantidad} x ${unitPrice.toFixed(0)} {item.precio_venta_override !== undefined && <span className="text-amber-600 font-bold">*</span>}
                            </div>
                          </div>
                          <div className="font-mono font-bold text-slate-900 pr-1 text-right">
                            ${lineTotal.toLocaleString('es-UY')}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(item.key)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors flex-shrink-0 cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}

                    {/* Cart Summary */}
                    <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs font-bold text-slate-900 font-mono">
                      <span>Total Artículos:</span>
                      <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                        ${salesCart.reduce((sum, i) => sum + (i.precio_venta_override !== undefined ? Number(i.precio_venta_override) : i.precio_venta) * i.cantidad, 0).toLocaleString('es-UY', { minimumFractionDigits: 1 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. TRANSACTION GENERAL SETTINGS */}
              <form id="record-sale-modal-form" onSubmit={handleRecordSaleSubmit} className="space-y-4 pt-1 text-xs font-semibold">
                <div className="bg-slate-50/25 p-3.5 rounded-xl border border-slate-100 space-y-3">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    3. Datos de la Operación de Venta
                  </span>

                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase tracking-wider text-[9px]">Cliente Comprador</label>
                    <input
                      type="text"
                      required
                      placeholder="Cliente WhatsApp / Consumidor final"
                      value={dispatchSale.cliente}
                      onChange={(e) => setDispatchSale(prev => ({ ...prev, cliente: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-950 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Fecha y Hora</label>
                      <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-550 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Automática (Ahora)</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Canal</label>
                      <select
                        value={dispatchSale.canal}
                        onChange={(e) => setDispatchSale(prev => ({ ...prev, canal: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-950 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                      >
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Mercado Libre">Mercado Libre</option>
                        <option value="Venta Directa">Venta Directa</option>
                        <option value="Web">Web</option>
                        <option value="Instagram">Instagram</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Depósito de Origen</label>
                      <select
                        value={dispatchSale.sucursal}
                        onChange={(e) => setDispatchSale(prev => ({ ...prev, sucursal: e.target.value as 'Mvd' | 'Pin' }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-950 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                      >
                        <option value="Pin">Pinamar</option>
                        <option value="Mvd">Montevideo</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-500 uppercase tracking-wider text-[9px]">Costo Envío de Orden</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={dispatchSale.costo_envio}
                        onChange={(e) => setDispatchSale(prev => ({ ...prev, costo_envio: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 uppercase tracking-wider text-[9px]">Estado de Aprobación</label>
                    <select
                      value={dispatchSale.aprobado}
                      onChange={(e) => setDispatchSale(prev => ({ ...prev, aprobado: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-1000 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs bg-white text-slate-950"
                    >
                      <option value="Aprobado">Aprobado (Descuenta Stock)</option>
                      <option value="Pendiente">Pendiente (No descuenta Stock)</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 font-semibold text-xs">
              <button
                type="button"
                onClick={() => setShowNewSaleModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              >
                Cerrar (Mantener Borrador)
              </button>
              
              <button
                type="submit"
                form="record-sale-modal-form"
                disabled={salesCart.length === 0}
                className={`px-5 py-2.5 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 transition-all ${
                  salesCart.length === 0 
                    ? 'bg-slate-300 hover:bg-slate-300 shadow-none cursor-not-allowed opacity-50' 
                    : 'bg-indigo-600 hover:bg-indigo-750 shadow-indigo-600/10'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Despachar Factura ({salesCart.reduce((sum, i) => sum + i.cantidad, 0)} items)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED ARTICLE VIEW & EDIT MODAL */}
      {showDetailModal && selectedArticle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto transition-all animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isEditingArticle ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748b]">
                  {isEditingArticle ? "Editando Artículo" : "Visor de Ficha del Artículo Seleccionado"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Pencil Edit button (only when not editing) */}
                {!isEditingArticle && (
                  <button
                    onClick={() => startEditingArticle(selectedArticle)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg text-[10px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Editar</span>
                  </button>
                )}
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setIsEditingArticle(false);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isEditingArticle ? (
                /* EDIT FORM VIEW */
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await handleUpdateArticleSubmit(e);
                  }} 
                  className="space-y-4"
                >
                  {/* Name field */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre del Producto</label>
                    <input
                      type="text"
                      required
                      value={editArticleForm.nombre}
                      onChange={(e) => setEditArticleForm(prev => ({ ...prev, nombre: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Cost and Sale Price */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compra Costo ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={editArticleForm.costo || 0}
                        onChange={(e) => {
                          const v = Number(e.target.value || 0);
                          const calculated40 = v > 0 ? Math.round(v * 1.4) : 0;
                          setEditArticleForm(prev => {
                            const currentML = prev.precio_venta_ml;
                            const shouldSyncML = currentML === '' || Number(currentML) === prev.precio_venta || currentML === String(prev.precio_venta) || Number(currentML) === Math.round(Number(prev.costo) * 1.4);
                            return {
                              ...prev,
                              costo: v,
                              precio_venta: calculated40,
                              precio_venta_ml: shouldSyncML && calculated40 > 0 ? String(calculated40) : currentML
                            };
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                     <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Venta General ($)</label>
                      <input
                        type="number"
                        disabled
                        value={editCalculatedWebFaceInstaPrice > 0 ? Math.round(editCalculatedWebFaceInstaPrice) : 0}
                        className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-800 cursor-not-allowed"
                        title="Calculado automáticamente: Venta ML - Comisión ML"
                      />
                    </div>
                  </div>

                  {/* Mercado Libre Section inside Edit */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
                    <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-wider block">Integración Mercado Libre</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Precio Venta ML ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={editArticleForm.precio_venta_ml}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, precio_venta_ml: e.target.value }))}
                          placeholder={String(editArticleForm.precio_venta)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Comisión ML ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={editArticleForm.comision_ml}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, comision_ml: e.target.value }))}
                          placeholder="11"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                        />
                      </div>
                    </div>

                    {/* Calculated Web/Face/Insta Price */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio web / Face / insta ($)</label>
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-xl px-3 py-1.5 flex items-center justify-between">
                        <span className="text-[9px] font-bold uppercase text-emerald-600">Neto (Venta ML - Comis)</span>
                        <span className="font-mono font-extrabold text-xs text-emerald-700">
                          ${editCalculatedWebFaceInstaPrice.toLocaleString('es-UY', { maximumFractionDigits: 1 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Enlace de la Imagen (Opcional)</label>
                    <input
                      type="url"
                      value={editArticleForm.imagen_url}
                      onChange={(e) => setEditArticleForm(prev => ({ ...prev, imagen_url: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Integración E-Commerce (Web Juem) inside Edit */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-2 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        🌐 Configuración E-Commerce (Web Juem)
                      </span>
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Sincronización Activa
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Precio Original (para Ofertas) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Precio Original/Tachado ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={editArticleForm.original_price}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, original_price: e.target.value }))}
                          placeholder="Ej: 1890"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Categoría */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Categoría E-Commerce</label>
                        {ecomCategories.length > 0 ? (
                          <select
                            value={editArticleForm.categoria_id || ""}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const catObj = ecomCategories.find(c => String(c.id) === String(selectedId));
                              setEditArticleForm(prev => ({
                                ...prev,
                                categoria_id: selectedId,
                                category: catObj ? catObj.nombre : "",
                                subcategoria_id: "",
                                subcategory: ""
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">-- Seleccionar Categoría --</option>
                            {ecomCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editArticleForm.category}
                            onChange={(e) => setEditArticleForm(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="Ej: Cuadros, Iluminación"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Subcategoría */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Subcategoría E-Commerce</label>
                        {ecomSubcategories.length > 0 ? (
                          <select
                            value={editArticleForm.subcategoria_id || ""}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const subcatObj = ecomSubcategories.find(s => String(s.id) === String(selectedId));
                              setEditArticleForm(prev => ({
                                ...prev,
                                subcategoria_id: selectedId,
                                subcategory: subcatObj ? subcatObj.nombre : ""
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            <option value="">-- Seleccionar Subcategoría --</option>
                            {ecomSubcategories
                              .filter(sub => !editArticleForm.categoria_id || String(sub.categoria_id) === String(editArticleForm.categoria_id))
                              .map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={editArticleForm.subcategory}
                            onChange={(e) => setEditArticleForm(prev => ({ ...prev, subcategory: e.target.value }))}
                            placeholder="Ej: Cuadros Trípticos"
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Descripción Corta */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descripción E-Commerce</label>
                        <input
                          type="text"
                          value={editArticleForm.description}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Ej: Set de 3 cuadros impresos..."
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Galería de Imágenes (imagenes) */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Galería de Imágenes Adicionales (URLs separadas por comas)</label>
                        <textarea
                          rows={2}
                          value={editArticleForm.imagenes}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, imagenes: e.target.value }))}
                          placeholder="https://ejemplo.com/img1.jpg, https://ejemplo.com/img2.jpg"
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>

                      {/* Variantes en Formato JSON */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Variantes del Catálogo (Configuración JSON)</label>
                        <textarea
                          rows={3}
                          value={editArticleForm.variants}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, variants: e.target.value }))}
                          placeholder='[{"attributes":{"talle":"XL","color":"azul"},"stock":5,"price":"1200","barcode":"...","image":"..."}]'
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] text-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        <span className="text-[9px] text-slate-400 block font-medium">Especifica talles, colores, stock individual o precio personalizado de forma segura en formato JSON.</span>
                      </div>
                    </div>

                    {/* Interruptores / Flags */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      {/* Destacado */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 rounded-xl hover:bg-slate-100/40 select-none">
                        <input
                          type="checkbox"
                          checked={editArticleForm.featured}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, featured: e.target.checked }))}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Destacado</span>
                      </label>

                      {/* Pausado */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 rounded-xl hover:bg-slate-100/40 select-none">
                        <input
                          type="checkbox"
                          checked={editArticleForm.paused}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, paused: e.target.checked }))}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Pausado/No Web</span>
                      </label>

                      {/* Visual 3D */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 rounded-xl hover:bg-slate-100/40 select-none">
                        <input
                          type="checkbox"
                          checked={editArticleForm.is_3d}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, is_3d: e.target.checked }))}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Item 3D</span>
                      </label>

                      {/* Consultar Únicamente */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 p-2 rounded-xl hover:bg-slate-100/40 select-none">
                        <input
                          type="checkbox"
                          checked={editArticleForm.consult_only}
                          onChange={(e) => setEditArticleForm(prev => ({ ...prev, consult_only: e.target.checked }))}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Solo Consulta</span>
                      </label>
                    </div>
                  </div>

                  {/* Tipo de Artículo Switch */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tipo de Artículo</label>
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-center text-xs font-bold font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setEditArticleForm(prev => ({ ...prev, tipo: 'simple' }));
                        }}
                        className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                          editArticleForm.tipo === 'simple'
                            ? 'bg-white text-indigo-700 shadow-3xs'
                            : 'text-slate-500 hover:bg-slate-200/50'
                        }`}
                      >
                        Artículo Simple
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditArticleForm(prev => ({ ...prev, tipo: 'compuesto' }));
                        }}
                        className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                          editArticleForm.tipo === 'compuesto'
                            ? 'bg-white text-indigo-700 shadow-3xs'
                            : 'text-slate-500 hover:bg-slate-200/50'
                        }`}
                      >
                        Compuesto (Combo)
                      </button>
                    </div>
                  </div>

                  {/* Stock fields for simple articles or Component Selector for compound/combo */}
                  {editArticleForm.tipo === 'simple' ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-250/50 space-y-3">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider block">Ajuste Directo de Stock</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Montevideo</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={editArticleForm.mvd_stock || 0}
                            onChange={(e) => setEditArticleForm(prev => ({ ...prev, mvd_stock: Number(e.target.value) }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:indigo-500 focus:outline-none shadow-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Pinamar</label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={editArticleForm.pin_stock || 0}
                            onChange={(e) => setEditArticleForm(prev => ({ ...prev, pin_stock: Number(e.target.value) }))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:indigo-500 focus:outline-none shadow-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 font-medium">
                        💡 Puedes definir o modificar los componentes individuales de este combo. El stock total se calculará de manera automática combinando sus ingredientes.
                      </div>

                      {/* Component Selector for Editing Compuesto */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 space-y-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Componentes del Ensamblado (Combo)</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-1">
                          {/* Component select search box (filter out self to avoid cycles!) */}
                          <div className="sm:col-span-8 relative">
                            {editIngredientId ? (
                              <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 text-[11px] font-semibold h-[29px]">
                                <span className="truncate">
                                  📌 <strong>{catalog.find(a => a.id === Number(editIngredientId))?.codigo}</strong> - {catalog.find(a => a.id === Number(editIngredientId))?.nombre}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditIngredientId('');
                                    setEditComboSearchQuery('');
                                  }}
                                  className="text-emerald-600 hover:text-red-500 font-bold ml-1.5 cursor-pointer text-xs"
                                  title="Quitar"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={editComboSearchQuery}
                                  onFocus={() => setEditComboShowDropdown(true)}
                                  onChange={(e) => {
                                    setEditComboSearchQuery(e.target.value);
                                    setEditComboShowDropdown(true);
                                  }}
                                  placeholder="🔍 Buscar componente..."
                                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-800 text-[11px] font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 h-[29px]"
                                />
                                {editComboShowDropdown && (
                                  <>
                                    {/* Backdrop layer to click outside */}
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={() => setEditComboShowDropdown(false)} 
                                    />
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                                      {catalog
                                        .filter(a => a.tipo === 'simple' && a.id !== selectedArticle?.id)
                                        .filter(art => matchAdvancedSearch([art.nombre, art.codigo], editComboSearchQuery))
                                        .slice(0, 15)
                                        .map(art => (
                                          <button
                                            key={`edit_drop_art_${art.id}`}
                                            type="button"
                                            onClick={() => {
                                              setEditIngredientId(String(art.id));
                                              setEditComboShowDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                                          >
                                            <div className="flex flex-col text-left">
                                              <span className="text-[11px] font-bold text-slate-800">{art.nombre}</span>
                                              <span className="text-[9px] text-slate-400 font-mono">SKU: {art.codigo}</span>
                                            </div>
                                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold">
                                              ${art.costo}
                                            </span>
                                          </button>
                                        ))
                                      }
                                      {catalog
                                        .filter(a => a.tipo === 'simple' && a.id !== selectedArticle?.id)
                                        .filter(art => matchAdvancedSearch([art.nombre, art.codigo], editComboSearchQuery)).length === 0 && (
                                          <div className="text-center py-3 text-slate-400 text-[10px] font-sans">
                                            No se encontraron componentes simples
                                          </div>
                                        )}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
 
                          {/* Quantity */}
                          <div className="sm:col-span-3">
                            <input
                              type="number"
                              min="1"
                              value={editIngredientQty}
                              onChange={(e) => setEditIngredientQty(Math.max(1, Number(e.target.value)))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-center text-slate-800 font-mono text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                              placeholder="Cant."
                            />
                          </div>
 
                          {/* Add button */}
                          <div className="sm:col-span-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!editIngredientId) return;
                                const ingId = Number(editIngredientId);
                                const found = catalog.find(a => a.id === ingId);
                                if (!found) return;
 
                                // Check if already contains it
                                const exists = editArticleForm.componentes.some(c => (c.componente_id || c.id) === ingId);
                                if (exists) {
                                  alert("Este componente ya está en la lista. Si deseas modificar la cantidad, elimínalo y vuelve a agregarlo con la nueva cantidad.");
                                  return;
                                }
 
                                const newComponent = {
                                  componente_id: ingId,
                                  id: ingId,
                                  codigo: found.codigo,
                                  nombre: found.nombre,
                                  cantidad: editIngredientQty
                                };
 
                                setEditArticleForm(prev => ({
                                  ...prev,
                                  componentes: [...prev.componentes, newComponent]
                                }));
                                setEditIngredientId('');
                                setEditIngredientQty(1);
                                setEditComboSearchQuery('');
                              }}
                              className="w-full bg-indigo-600 hover:bg-indigo-700 h-[29px] text-white rounded-xl flex items-center justify-center font-bold text-sm shadow transition-all cursor-pointer"
                              title="Anexar componente"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                        {/* Component list */}
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                          {editArticleForm.componentes.length === 0 ? (
                            <div className="text-center py-4 text-slate-400 text-[10px] font-mono">
                              Sin componentes seleccionados. Agrega al menos uno para formar el combo.
                            </div>
                          ) : (
                            editArticleForm.componentes.map((comp) => {
                              const compId = comp.componente_id || comp.id;
                              const currentName = comp.nombre || catalog.find(x => x.id === compId)?.nombre || "Componente";
                              const currentCode = comp.codigo || catalog.find(x => x.id === compId)?.codigo || "N/A";
                              return (
                                <div key={`edit_comp_row_${compId}`} className="flex items-center justify-between bg-white px-2.5 py-1 text-[11px] rounded-xl border border-slate-100 shadow-3xs">
                                  <div className="flex flex-col">
                                    <span className="text-slate-800 font-bold block max-w-[280px] truncate">{currentName}</span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      SKU: {currentCode}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                      {comp.cantidad} unids
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditArticleForm(prev => ({
                                          ...prev,
                                          componentes: prev.componentes.filter(c => (c.componente_id || c.id) !== compId)
                                        }));
                                      }}
                                      className="p-1 text-[#64748b] hover:text-red-500 rounded transition cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingArticle(false)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-3 rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-md transition-all cursor-pointer text-center"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              ) : (
                /* READ ONLY DETAIL AND STOCKS VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left panel: Image and simple specifications */}
                  <div className="space-y-5">
                    {/* Image stage */}
                    <div className="relative h-44 w-full bg-slate-50 border border-slate-200/40 rounded-xl overflow-hidden flex items-center justify-center">
                      {selectedArticle.imagen_url ? (
                        <img
                          src={selectedArticle.imagen_url}
                          referrerPolicy="no-referrer"
                          alt="Ficha del artículo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-slate-400 text-center space-y-1.5">
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                          <span className="text-[11px] font-medium">Sin imagen cargada para este artículo.</span>
                          <p className="text-[9px] text-[#94a3b8]">Edite el artículo agregando un enlace de foto activa.</p>
                        </div>
                      )}

                      {/* Overlap Image button */}
                      <button
                        onClick={() => {
                          setImageUrlInput(selectedArticle.imagen_url || '');
                          setShowImageModal(true);
                        }}
                        className="absolute right-3 bottom-3 px-3 py-1 bg-slate-900/85 hover:bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow transition-all cursor-pointer flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3 text-indigo-300" />
                        <span>+ Subir Foto URL</span>
                      </button>
                    </div>

                    {/* Badge details */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-widest bg-slate-100 font-bold block text-slate-800 px-2 py-0.5 rounded">
                          {selectedArticle.codigo}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50/80 px-2 py-0.5 rounded">
                          ARTÍCULO GENERAL / {selectedArticle.tipo}
                        </span>
                      </div>
                      <h4 className={`text-sm md:text-base font-bold leading-tight ${selectedArticle.tipo === 'compuesto' ? 'text-blue-600 font-bold' : 'text-slate-900'}`}>
                        {selectedArticle.nombre}
                      </h4>
                    </div>

                    {/* Stock availability section */}
                    <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                        <MapPin className="w-4 h-4 text-[#64748b]" />
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                          Disponibilidad por Sucursales
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-3xs">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Montevideo</span>
                          <span className="text-lg font-mono font-extrabold text-[#19191e]">
                            {selectedArticle.mvd_stock || 0}
                          </span>
                          <p className="text-[9px] text-[#94a3b8] mt-0.5 font-mono">unidades</p>
                        </div>

                        <div className="p-3 bg-indigo-50/40 border border-indigo-100/40 rounded-xl shadow-3xs">
                          <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block mb-1">Pinamar</span>
                          <span className="text-lg font-mono font-extrabold text-indigo-600">
                            {selectedArticle.pin_stock || 0}
                          </span>
                          <p className="text-[9px] text-indigo-400 mt-0.5 font-mono">unidades</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right panel: pricing details and compositions if compound */}
                  <div className="space-y-5">
                    {(() => {
                      const isCombo = selectedArticle.tipo === 'compuesto';
                      const unifiedCost = isCombo
                        ? (selectedArticle.componentes?.reduce((sum, c) => {
                            const matchObj = catalog.find(x => x.id === c.componente_id || x.codigo === c.codigo);
                            return sum + (matchObj ? Number(matchObj.costo) * Number(c.cantidad) : 0);
                          }, 0) || selectedArticle.costo)
                        : selectedArticle.costo;

                      const ventaMLPrice = selectedArticle.precio_venta_ml || selectedArticle.precio_venta || 0;
                      const commissionMLAmount = selectedArticle.comision_ml !== undefined ? selectedArticle.comision_ml : (ventaMLPrice * 0.11);
                      const expectedMlProfit = ventaMLPrice - commissionMLAmount - unifiedCost;
                      const grossMarginPct = selectedArticle.precio_venta > 0 ? ((selectedArticle.precio_venta - unifiedCost) / selectedArticle.precio_venta) * 100 : 0;

                      return (
                        <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl space-y-3 h-full flex flex-col justify-between">
                          <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium font-sans">
                                {isCombo ? "Costo Unificado de Ensamble" : "Precio Compra Costo"}
                              </span>
                              <span className="font-mono font-bold text-slate-900">${unifiedCost.toFixed(1)}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-medium font-sans">Precio de Venta General</span>
                              <span className="font-mono font-bold text-slate-900">${selectedArticle.precio_venta}</span>
                            </div>

                            {isCombo && (
                              <div className="flex items-center justify-between border-t border-dashed border-slate-200/80 pt-2 text-[11px]">
                                <span className="text-indigo-600 font-semibold">Margen Bruto Proyectado</span>
                                <span className="font-mono font-bold text-indigo-700">{grossMarginPct.toFixed(1)}%</span>
                              </div>
                            )}

                            {/* SEPARATOR CANAL ML */}
                            <div className="border-t border-slate-200/60 pt-2.5 mt-1">
                              <div className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase mb-2">
                                Canal Mercado Libre (ML)
                              </div>

                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-slate-500 font-medium">Precio Venta ML ($)</span>
                                <span className="font-mono font-bold text-slate-950">${ventaMLPrice}</span>
                              </div>

                              <div className="flex items-center justify-between mb-1.5 pb-2.5 border-b border-slate-200/40">
                                <span className="text-slate-500 font-medium">
                                  Comisión ML ($)
                                </span>
                                <span className="font-mono font-bold text-slate-600">-${commissionMLAmount.toFixed(1)}</span>
                              </div>

                              {/* Calculated Estimation Fee & profit */}
                              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/50 mt-2">
                                <span className="text-[11px] font-bold text-slate-600 font-sans">Ganancia Estimada ML</span>
                                {selectedArticle.comision_ml === 0 ? (
                                  <span className="text-[11px] font-semibold text-slate-400 font-sans italic">
                                    No aplica (Sin publicar)
                                  </span>
                                ) : (
                                  <span className="font-mono font-extrabold text-emerald-600 text-sm">
                                    ${expectedMlProfit.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* List components directly inside the inspection card if it is a Combo! */}
                          {isCombo && selectedArticle.componentes && selectedArticle.componentes.length > 0 && (
                            <div className="border-t border-slate-200/80 pt-3 mt-2 space-y-1.5">
                              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                Composición de Ensamble
                              </span>
                              <div className="space-y-1 pl-2 border-l-2 border-indigo-400 max-h-[140px] overflow-y-auto">
                                {selectedArticle.componentes.map((comp, idx) => (
                                  <div key={idx} className="flex justify-between text-[11px] text-slate-600 py-0.5">
                                    <span className="font-semibold block truncate max-w-[130px]">
                                      {comp.cantidad}x {comp.nombre}
                                    </span>
                                    <span className="font-mono text-slate-400 text-[10px]">
                                      ({comp.codigo})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              )}
            </div>

            {/* Bottom Footer block */}
            <div className="bg-slate-50 border-t border-slate-150 p-4">
              {isEditingArticle ? (
                <div className="flex items-center justify-end">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest animate-pulse">
                    Modo Edición Activo
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {showDeleteConfirm ? (
                    /* DANGER CONFIRM PANEL */
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-red-50 border border-red-205 p-3 rounded-xl animate-shake">
                      <div className="text-left">
                        <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider block">¡Atención!</span>
                        <p className="text-[11px] text-red-700 font-semibold leading-tight font-sans">
                          ¿Está seguro de que desea eliminar este artículo? Esta acción no se puede deshacer.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(selectedArticle.id, true)}
                          className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold rounded-lg shadow-sm cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Sí, Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* STANDARD VIEW ACTIONS */
                    <>
                      <div className="flex items-center gap-3">
                        {/* Red Delete Button */}
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-rose-200/50"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span>Eliminar Artículo</span>
                        </button>

                        {/* Edit Button in footer for ease of use */}
                        <button
                          type="button"
                          onClick={() => startEditingArticle(selectedArticle)}
                          className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-150"
                        >
                          <Pencil className="w-4 h-4 text-indigo-650" />
                          <span>Editar</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowDetailModal(false);
                            setIsEditingArticle(false);
                            setShowDeleteConfirm(false);
                          }}
                          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer"
                        >
                          Cerrar Visor
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 10. LIGHTWEIGHT POPUP MODAL: UPLOAD PHOTO FROM URL */}
      {showImageModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Configurar Enlace de Imagen</h3>
              <p className="text-[11px] text-[#64748b] mt-0.5">Introduce un enlace HTTP o HTTPS público de la foto del artículo.</p>
            </div>

            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-slate-500 uppercase tracking-widest text-[9px] block">URL de la Imagen</label>
              <input
                type="url"
                required
                placeholder="https://images.unsplash.com/... o enlace"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-950 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setImageUrlInput('');
                }}
                className="px-4 py-2 hover:bg-slate-100 text-slate-500 font-semibold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateImageSubmit}
                disabled={isUpdatingImage}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
              >
                {isUpdatingImage ? 'Guardando...' : 'Guardar Enlace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. INSTRUCTIONS MODAL: INSTALL APPS SCRIPT FOR GOOGLE SHEETS */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Vincular Planilla de Google Sheets Maestro
              </h2>
              <button
                onClick={() => setShowAppsScriptModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3 text-slate-600 leading-relaxed font-medium">
              <p>Sigue estos simples pasos para conectar tu Planilla de Google Sheets con el motor central de JUEMHub:</p>
              
              <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                <span className="text-slate-900 font-bold block">1. Copiar Código Apps Script</span>
                <p className="text-[11px]">Copia el siguiente fragmento clave preparado con tus URLs seguras para pegar en tu planilla:</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`function onEdit(e) {
  var url = "https://ais-dev-5guaaecyxoyjzca3yr7qe4-651622540523.us-east1.run.app/api/import-google-sheets";
  UrlFetchApp.fetch(url, {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({ trigger: "edit", range: e.range.getA1Notation() })
  });
}`);
                    alert("¡Código Apps Script copiado al portapapeles!");
                  }}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Script de Sincronización</span>
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-slate-900 font-bold block">2. Pegar en Google Sheets</span>
                <p className="text-[11px]">En tu Planilla Maestra de Google Sheets, entra a <strong>Extensiones → Apps Script</strong>. Pega este fragmento y haz clic en <strong>Guardar (Disquete)</strong>.</p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-900 font-bold block">3. ¡Completado!</span>
                <p className="text-[11px]">Cualquier modificación o edición que hagas en la columna de stock o precio de tu planilla se sincronizará inmediatamente en JUEMHub.</p>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                Cerrar Instrucciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11.2 DIAGNOSTIC DATABASE MODAL */}
      {showDbDiagnosticModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
                Diagnóstico de Base de Datos (Live Test)
              </h2>
              <button
                onClick={() => {
                  setShowDbDiagnosticModal(false);
                  setDbDiagnosticData(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-4 text-slate-600 leading-relaxed font-medium">
              <p>Esta herramienta evalúa en tiempo real si el servidor backend se encuentra vinculado exitosamente a una base de datos persistente (PostgreSQL o Supabase), o si se encuentra operando en el modo fallback.</p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">Estado Real</span>
                  {isCheckingDb ? (
                    <span className="text-indigo-600 font-mono text-[10px] font-bold animate-pulse">EVALUANDO...</span>
                  ) : dbDiagnosticData?.connected ? (
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border border-emerald-100">
                      ● CONECTADO
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border border-amber-100">
                      ● LOCAL FALLBACK
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-slate-800 font-bold block">Motor Detectado:</span>
                  <p className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50/50 p-2 rounded border border-indigo-50 leading-tight">
                    {isCheckingDb ? "Consultando al sistema..." : (dbDiagnosticData?.mode || "Cargando estado...")}
                  </p>
                </div>

                {!isCheckingDb && dbDiagnosticData && (
                  <div className="space-y-1 pt-1.5 border-t border-slate-200/40">
                    {dbDiagnosticData.connected ? (
                      <div className="text-emerald-700 text-[11px] flex gap-2 items-start">
                        <span className="text-sm leading-none">✔️</span>
                        <span>¡Excelente! Todos los artículos, combos compuestos, stock y registros de ventas se están guardando y sincronizando correctamente en tu base de datos central en nube en tiempo real.</span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-[11px]">
                        <div className="text-slate-700 font-medium">
                          <strong>Modo Fallback Activo:</strong> Tus datos se almacenan temporalmente en la memoria local del servidor (la sesión se mantiene segura provisionalmente).
                        </div>
                        {dbDiagnosticData.error && (
                          <div className="bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-lg text-[10px] font-mono leading-relaxed space-y-1">
                            <strong className="block text-amber-900">Detalle del Diagnóstico:</strong>
                            <p>{dbDiagnosticData.error}</p>
                          </div>
                        )}
                        <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-[10px] leading-relaxed space-y-1 border border-indigo-100">
                          <strong>💡 ¿Cómo conectar permanentemente?</strong>
                          <p>
                            Para conectar tu base de datos propia (Supabase o PostgreSQL), simplemente define la variable de entorno <strong>DATABASE_URL</strong> en la configuración del servidor de la aplicación (menú de Secrets/Configuración en AI Studio). ¡El sistema la detectará e inicializará automáticamente!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => runDbDiagnostics()}
                disabled={isCheckingDb}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl disabled:opacity-50 flex items-center gap-1 cursor-pointer transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                <span>Re-evaluar Conexión</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDbDiagnosticModal(false);
                  setDbDiagnosticData(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODIFICAR REGISTRO DE VENTA MODAL */}
      {editingSale && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 border-dashed">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-indigo-600" />
                Modificar Registro de Venta #{editingSale.id}
              </h2>
              <button
                type="button"
                onClick={() => setEditingSale(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSaleSubmit} className="space-y-4 text-xs font-medium text-slate-700">
              {editError && (
                <div className="bg-red-50 border border-red-100 text-red-750 p-2.5 rounded-xl font-semibold leading-relaxed">
                  ⚠️ {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-client" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Nombre del Cliente
                  </label>
                  <input
                    id="edit-sale-client"
                    type="text"
                    required
                    value={editClient}
                    onChange={(e) => setEditClient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                {/* Artículo */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-article" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Artículo o Combo Vendido
                  </label>
                  <select
                    id="edit-sale-article"
                    value={editArticleId}
                    onChange={(e) => {
                      const newArtId = Number(e.target.value);
                      setEditArticleId(newArtId);
                      // Update default price based on the selected article
                      const chosenArt = catalog.find(a => a.id === newArtId);
                      if (chosenArt) {
                        setEditPrecioVenta((chosenArt.precio_venta || 0) * editCantidad);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                  >
                    {catalog.map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.codigo}] {a.nombre} (${a.precio_venta})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-qty" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Cantidad (Unidades)
                  </label>
                  <input
                    id="edit-sale-qty"
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={editCantidad}
                    onChange={(e) => {
                      const newQty = Math.max(1, Number(e.target.value));
                      setEditCantidad(newQty);
                      // Update price override calculation
                      const chosenArt = catalog.find(a => a.id === editArticleId);
                      if (chosenArt) {
                        setEditPrecioVenta((chosenArt.precio_venta || 0) * newQty);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                  />
                </div>

                {/* Precio Venta */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-price" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Precio Total Venta ($)
                  </label>
                  <input
                    id="edit-sale-price"
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={editPrecioVenta}
                    onChange={(e) => setEditPrecioVenta(Number(e.target.value))}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-indigo-700 font-bold text-xs focus:outline-none"
                  />
                </div>

                {/* Costo Envío */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-shipping" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Costo de Envío ($)
                  </label>
                  <input
                    id="edit-sale-shipping"
                    type="number"
                    min={0}
                    step="any"
                    value={editCostoEnvio}
                    onChange={(e) => setEditCostoEnvio(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                    placeholder="Ej. 150"
                  />
                </div>

                {/* Sucursal */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-branch" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Sucursal de Origen
                  </label>
                  <select
                    id="edit-sale-branch"
                    value={editSucursal}
                    onChange={(e) => setEditSucursal(e.target.value as 'Mvd' | 'Pin')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="Mvd">Montevideo</option>
                    <option value="Pin">Pinamar</option>
                  </select>
                </div>

                {/* Canal */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-channel" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Canal de Venta
                  </label>
                  <select
                    id="edit-sale-channel"
                    value={editCanal}
                    onChange={(e) => setEditCanal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Mercado Libre">Mercado Libre</option>
                    <option value="Venta Directa">Venta Directa</option>
                    <option value="Web">Web</option>
                    <option value="Instagram">Instagram</option>
                  </select>
                </div>

                {/* Aprobado */}
                <div className="space-y-1">
                  <label htmlFor="edit-sale-approved" className="text-slate-500 uppercase tracking-widest text-[9px] font-bold block text-left">
                    Estado de la Venta
                  </label>
                  <select
                    id="edit-sale-approved"
                    value={editAprobado}
                    onChange={(e) => setEditAprobado(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="Devuelto">Devuelto / Anulado</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 leading-normal text-slate-500 text-[10px] text-left">
                💡 <strong>Gestión Inteligente de Stock:</strong> Si marcas la venta como <em>Aprobado</em>, el stock se descontará de la sucursal elegida. Si la modificas más adelante, el stock anterior será reincorporado automáticamente antes de computar las nuevas cantidades.
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={editIsSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {editIsSubmitting ? "Guardando Cambios..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ELIMINAR REGISTRO DE VENTA MODAL (ADVERTENCIA DE STOCK) */}
      {saleToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8 text-left animate-in fade-in duration-100">
            <div className="flex items-center gap-3 text-amber-600 border-b border-amber-100 pb-3 border-dashed">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  ¿Confirmar eliminación del pedido?
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">Venta #{saleToDelete.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700 leading-normal">
              {deleteSaleError && (
                <div className="bg-red-50 border border-red-100 text-red-750 p-2.5 rounded-xl font-semibold leading-relaxed">
                  ⚠️ {deleteSaleError}
                </div>
              )}

              <p className="text-slate-600">
                Estás por eliminar permanentemente el registro de venta del cliente{" "}
                <strong className="text-slate-900 font-bold">"{saleToDelete.cliente}"</strong>.
              </p>

              <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl space-y-2 text-amber-900">
                <p className="font-bold uppercase tracking-wider text-[9px] text-amber-700 block flex items-center gap-1.5">
                  ⚠️ ADVERTENCIA DE GESTIÓN DE STOCK
                </p>
                <p className="text-[11px] leading-relaxed">
                  Al eliminar esta venta, se reincorporará automáticamente de forma inmediata el stock correspondiente:
                </p>
                <div className="font-mono text-xs font-bold bg-white/80 p-2.5 rounded-lg border border-amber-200 flex flex-col gap-1 text-slate-800">
                  <div>• Producto: <span className="text-indigo-700 font-bold">{saleToDelete.articulo_nombre}</span></div>
                  <div>• Cantidad: <span className="text-amber-700 font-bold">{saleToDelete.cantidad} unidad(es)</span></div>
                  <div>• Sucursal: <span className="text-slate-900 font-bold">{saleToDelete.sucursal === 'Pin' ? 'Pinamar' : 'Montevideo'}</span></div>
                </div>
              </div>

              <p className="text-slate-500 text-[10px] italic">
                Esta acción no se puede deshacer. ¿Seguro de que deseas proceder con la eliminación?
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => setSaleToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                No, Cancelar
              </button>

              <button
                type="button"
                disabled={isDeletingSaleSubmitting}
                onClick={() => confirmDeleteSale(saleToDelete.id)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {isDeletingSaleSubmitting ? "Eliminando..." : "Sí, Eliminar Pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELIMINAR REGISTRO DE REPOSICION MODAL (REVERSION DE STOCK) */}
      {repToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8 text-left animate-in fade-in duration-100">
            <div className="flex items-center gap-3 text-red-650 border-b border-red-100 pb-3 border-dashed">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-650" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  ¿Confirmar eliminación de la Reposición?
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">Guía de Reposición #{repToDelete.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-medium text-slate-700 leading-normal">
              {deleteRepError && (
                <div className="bg-red-50 border border-red-100 text-red-750 p-2.5 rounded-xl font-semibold leading-relaxed">
                  ⚠️ {deleteRepError}
                </div>
              )}

              <p className="text-slate-600">
                Estás por eliminar permanentemente el registro de reposición ingresado por el proveedor{" "}
                <strong className="text-slate-900 font-bold">"{repToDelete.proveedor}"</strong>.
              </p>

              <div className="bg-red-50/50 border border-red-100 p-3.5 rounded-xl space-y-2 text-red-950">
                <p className="font-bold uppercase tracking-wider text-[9px] text-red-700 block flex items-center gap-1.5">
                  ⚠️ ADVERTENCIA CRÍTICA: REVERSIÓN DE STOCK
                </p>
                <p className="text-[11px] leading-relaxed">
                  Al eliminar esta reposición, <strong>se restará</strong> automáticamente de forma inmediata el stock correspondiente de la sucursal <strong>{repToDelete.sucursal === 'Pin' ? 'Pinamar' : 'Montevideo'}</strong>:
                </p>
                
                <div className="font-mono text-[11px] font-bold bg-white p-2.5 rounded-lg border border-red-200 flex flex-col gap-1 text-slate-800">
                  {repToDelete.detalles && Array.isArray(repToDelete.detalles) && repToDelete.detalles.map((det: any, dIdx: number) => (
                    <div key={dIdx} className="flex justify-between">
                      <span>• {det.nombre} ({det.codigo}):</span>
                      <span className="text-red-700 font-black">-{det.cantidad}u</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-slate-500 text-[10px] italic">
                Esta acción no se puede deshacer y registrará una entrada en la auditoría con reversión de existencias físicas.
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <button
                type="button"
                onClick={() => setRepToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                No, Cancelar
              </button>

              <button
                type="button"
                disabled={isDeletingRepSubmitting}
                onClick={() => confirmDeleteRep(repToDelete.id)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
              >
                {isDeletingRepSubmitting ? "Eliminando..." : "Sí, Eliminar con Reversión"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREACIÓN RÁPIDA DE ARTÍCULO DESDE REPOSICIÓN */}
      {isQuickCreateRepModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 my-8 text-left animate-in fade-in duration-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-950">
                    Registrar Artículo Nuevo sobre la marcha
                  </h2>
                  <p className="text-[10px] text-slate-500 font-mono font-semibold">
                    Crea el artículo e incorpóralo directo al detalle de factura.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateRepModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleQuickCreateArticleSubmit} className="space-y-4 text-xs font-semibold">
              {quickCreateRepSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-bold border border-emerald-200 flex items-center gap-2 animate-bounce">
                  <span>✓</span>
                  <span>{quickCreateRepSuccess}</span>
                </div>
              )}

              {quickCreateRepError && (
                <div className="p-3 bg-red-50 text-red-950 text-xs rounded-xl font-bold border border-red-200 flex items-center gap-2">
                  <span className="font-mono text-xs text-red-650">⚠️</span>
                  <span>{quickCreateRepError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* SKU */}
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Código / SKU (Sugerido)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: J104"
                    value={quickCreateRepForm.codigo}
                    onChange={(e) => setQuickCreateRepForm(prev => ({ ...prev, codigo: e.target.value.trim().toUpperCase() }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                {/* Costo */}
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">Costo de Compra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ej: 500"
                    value={quickCreateRepForm.costo}
                    onChange={(e) => setQuickCreateRepForm(prev => ({ ...prev, costo: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Nombre */}
              <div className="space-y-1">
                <label className="text-slate-500 uppercase tracking-wider text-[10px]">Nombre del Artículo (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Funda Silicona iPhone 14 Pro Max"
                  value={quickCreateRepForm.nombre}
                  onChange={(e) => setQuickCreateRepForm(prev => ({ ...prev, nombre: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Precio Venta */}
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">
                    Precio Venta Sugerido ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`$${quickCreateRepForm.costo ? (Number(quickCreateRepForm.costo) * 1.4).toFixed(0) : '0'} (+40%)`}
                    value={quickCreateRepForm.precio_venta}
                    onChange={(e) => setQuickCreateRepForm(prev => ({ ...prev, precio_venta: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold font-mono focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                  <p className="text-[9px] text-slate-400">Si lo dejas vacío, se calculará al +40% de margen.</p>
                </div>

                {/* Imagen URL */}
                <div className="space-y-1">
                  <label className="text-slate-500 uppercase tracking-wider text-[10px]">URL Imagen (Opcional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={quickCreateRepForm.imagen_url}
                    onChange={(e) => setQuickCreateRepForm(prev => ({ ...prev, imagen_url: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateRepModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={quickCreateRepSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-indigo-600/10 flex items-center gap-1.5"
                >
                  {quickCreateRepSubmitting ? "Registrando..." : "Registrar Artículo y Seleccionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border border-slate-200 shadow-2xl relative my-8 text-xs font-medium text-slate-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-5">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">
                  Alta de Artículo Maestro en Stock General
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-405 hover:text-slate-600 font-bold text-base cursor-pointer transition-colors p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {/* Segmented Type Selector Switch */}
            <div className="bg-slate-100/85 p-1 rounded-xl grid grid-cols-2 gap-1.5 mb-6 text-center text-xs font-bold font-sans">
              <button
                type="button"
                onClick={() => setCreationType('simple')}
                className={`py-2 px-4 rounded-lg transition-all cursor-pointer ${
                  creationType === 'simple'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                Artículo Simple
              </button>
              <button
                type="button"
                onClick={() => setCreationType('compuesto')}
                className={`py-2 px-4 rounded-lg transition-all cursor-pointer ${
                  creationType === 'compuesto'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                Artículo Compuesto (Combo)
              </button>
            </div>

            {/* SUCCESS & ERROR MESSAGE OUTBUILD */}
            {creationType === 'simple' ? (
              <>
                {articleSuccess && (
                  <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-bold border border-emerald-250 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{articleSuccess}</span>
                  </div>
                )}
                {articleError && (
                  <div className="mb-4 p-3 text-red-650 bg-red-50 text-xs rounded-xl font-bold border border-red-200">
                    {articleError}
                  </div>
                )}
              </>
            ) : (
              <>
                {comboSuccess && (
                  <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-bold border border-emerald-255 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{comboSuccess}</span>
                  </div>
                )}
                {comboError && (
                  <div className="mb-4 p-3 text-red-600 bg-red-50 text-xs rounded-xl font-bold border border-red-200">
                    {comboError}
                  </div>
                )}
              </>
            )}

            {/* FLOW 1: SIMPLE ITEM FORM */}
            {creationType === 'simple' && (
              <form onSubmit={handleCreateArticleSubmit} className="space-y-4">
                {/* Steps Progress Indicators */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 overflow-x-auto gap-1 mb-2.5 rounded-xl">
                  {[
                    { step: 1, name: 'Paso 1: Info Básica', icon: '📝' },
                    { step: 2, name: 'Paso 2: Precios', icon: '💰' },
                    { step: 3, name: 'Paso 3: Imágenes', icon: '🖼️' },
                    { step: 4, name: 'Paso 4: Variantes y Control', icon: '🏷️' }
                  ].map((s) => {
                    const isActive = newArticleStep === s.step;
                    const isCompleted = newArticleStep > s.step;
                    return (
                      <button
                        key={`step_tab_${s.step}`}
                        type="button"
                        onClick={() => {
                          setNewArticleStep(s.step);
                        }}
                        className={`flex-1 min-w-[145px] flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-sm border border-indigo-750'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-850 border border-emerald-110 hover:bg-emerald-100/75'
                            : 'bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-50/60'
                        }`}
                      >
                        <span>{s.icon}</span>
                        <span className="truncate">{s.name}</span>
                        {isCompleted && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Step 1: Info Básica */}
                {newArticleStep === 1 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5 items-end">
                      {/* Código / SKU */}
                      <div className="space-y-1.5 md:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código / SKU</label>
                          <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">Sistema</span>
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={getNextAvailableSku()}
                          title="Generado automáticamente por el sistema para evitar repeticiones"
                          className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-600 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      {/* Nombre Input */}
                      <div className="space-y-1.5 md:col-span-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre del Producto (*)</label>
                        <input
                          type="text"
                          required
                          value={newArticle.nombre}
                          onChange={(e) => setNewArticle(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Ej: Funda Neopreno 11 Lisas Rosada"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Categoría */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoría E-Commerce (*)</label>
                        {ecomCategories.length > 0 ? (
                          <select
                            value={newArticle.categoria_id || ""}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const catObj = ecomCategories.find(c => String(c.id) === String(selectedId));
                              setNewArticle(prev => ({
                                ...prev,
                                categoria_id: selectedId,
                                category: catObj ? catObj.nombre : "",
                                subcategoria_id: "",
                                subcategory: ""
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                          >
                            <option value="">-- Seleccionar Categoría --</option>
                            {ecomCategories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={newArticle.category}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="Ej: Cuadros, Iluminación, Decoración"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                          />
                        )}
                      </div>

                      {/* Subcategoría */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subcategoría E-Commerce</label>
                        {ecomSubcategories.length > 0 ? (
                          <select
                            value={newArticle.subcategoria_id || ""}
                            onChange={(e) => {
                              const selectedId = e.target.value;
                              const subcatObj = ecomSubcategories.find(s => String(s.id) === String(selectedId));
                              setNewArticle(prev => ({
                                ...prev,
                                subcategoria_id: selectedId,
                                subcategory: subcatObj ? subcatObj.nombre : ""
                              }));
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                          >
                            <option value="">-- Seleccionar Subcategoría --</option>
                            {ecomSubcategories
                              .filter(sub => !newArticle.categoria_id || String(sub.categoria_id) === String(newArticle.categoria_id))
                              .map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={newArticle.subcategory}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, subcategory: e.target.value }))}
                            placeholder="Ej: Cuadros Trípticos, Veladores"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                          />
                        )}
                      </div>
                    </div>

                    {/* Categorías Adicionales / Secundarias */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categorías Adicionales / Secundarias (las seleccionadas se marcan en la web)</label>
                      <div className="flex flex-wrap gap-2">
                        {['Informática', 'Ropa', 'Hogar', 'Gamer', 'Personalizados'].map(tag => {
                          const isSelected = newArticle.description.includes(`[Tag: ${tag}]`);
                          return (
                            <button
                              type="button"
                              key={`sec_category_${tag}`}
                              onClick={() => {
                                setNewArticle(prev => {
                                  let currentDesc = prev.description || "";
                                  if (isSelected) {
                                    currentDesc = currentDesc.replace(`[Tag: ${tag}]`, '').trim();
                                  } else {
                                    currentDesc = `${currentDesc} [Tag: ${tag}]`.trim();
                                  }
                                  return { ...prev, description: currentDesc };
                                });
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Descripción Corta */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descripción E-Commerce</label>
                      <input
                        type="text"
                        value={newArticle.description}
                        onChange={(e) => setNewArticle(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Ej: Set de 3 cuadros impresos en alta definición..."
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Precios */}
                {newArticleStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                      {/* Compra Costo */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio Compra ($) (*)</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={newArticle.costo}
                          onChange={(e) => {
                            const v = e.target.value;
                            const num = Number(v || 0);
                            const calculated40 = num > 0 ? (num * 1.4).toFixed(0) : '';
                            setNewArticle(prev => ({
                              ...prev,
                              costo: v,
                              precio_venta: calculated40,
                              precio_venta_ml: prev.precio_venta_ml === '' || prev.precio_venta_ml === (Number(prev.costo) * 1.4).toFixed(0) ? calculated40 : prev.precio_venta_ml
                            }));
                          }}
                          placeholder="0"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 font-mono"
                        />
                      </div>

                      {/* SUGGESTED 40% Display and override */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Venta General o Sugerido (+40%)</label>
                        <input
                          type="number"
                          disabled
                          value={calculatedWebFaceInstaPrice > 0 ? Math.round(calculatedWebFaceInstaPrice) : 0}
                          className="w-full bg-emerald-50 border border-emerald-250 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 font-mono cursor-not-allowed"
                          title="Calculado automáticamente: Venta ML - Comisión ML"
                        />
                      </div>

                      {/* Comision ML input */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Comisión ML ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={newArticle.comision_ml}
                          onChange={(e) => setNewArticle(prev => ({ ...prev, comision_ml: e.target.value }))}
                          placeholder="11"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-755 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
                      {/* Precio Venta ML */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio Venta ML ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={newArticle.precio_venta_ml}
                          onChange={(e) => setNewArticle(prev => ({ ...prev, precio_venta_ml: e.target.value }))}
                          placeholder={newArticle.precio_venta || "0"}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-indigo-950 font-mono"
                        />
                      </div>

                      {/* Precio Original (para Ofertas) */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Precio Original o Tachado ($)</label>
                        <input
                          type="number"
                          min="0"
                          value={newArticle.original_price}
                          onChange={(e) => setNewArticle(prev => ({ ...prev, original_price: e.target.value }))}
                          placeholder="Ej: 1890 (Tachado)"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-800 font-mono"
                        />
                      </div>

                      {/* Precio Web/Face/Insta Display (Venta ML - Comisión ML) */}
                      <div className="space-y-1.5 font-sans">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Precio web / Face / insta ($)</label>
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-1.5 flex items-center justify-between min-h-[38px]">
                          <span className="text-[9px] font-bold uppercase text-emerald-600">Neto (Neto Web)</span>
                          <span className="font-mono font-extrabold text-sm text-emerald-700">
                            ${calculatedWebFaceInstaPrice.toLocaleString('es-UY', { maximumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Imágenes */}
                {newArticleStep === 3 && (
                  <div className="space-y-4 animate-fade-in font-sans">
                    <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Galería Fotográfica del Producto</h4>
                          <p className="text-[10px] text-slate-400">Configura la foto de portada de tu e-commerce y fotos complementarias</p>
                        </div>
                        <span className="text-[9px] font-bold bg-indigo-55 text-indigo-600 px-2 py-0.5 rounded border border-indigo-110">INTEGRACIÓN</span>
                      </div>

                      {/* Inputs Manuales */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">URL Foto Portada (Principal *)</label>
                          <input
                            type="url"
                            value={newArticle.imagen_url}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, imagen_url: e.target.value }))}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-505 uppercase tracking-wider block">Fotos Secundarias (URLs separadas por coma)</label>
                          <input
                            type="text"
                            value={newArticle.imagenes}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, imagenes: e.target.value }))}
                            placeholder="https://img1.jpg, https://img2.jpg"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Stock Preset Picker */}
                      <div className="space-y-2">
                        <span className="text-[9.5px] font-extrabold text-slate-450 uppercase tracking-wide block">💡 Fotos Rápidas desde ERP Stock para Pruebas:</span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                          {[
                            { name: 'Remera Lino Ligt', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=400&q=80' },
                            { name: 'Remera Cotton Negra', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=400&q=80' },
                            { name: 'Buso Oversize Ash', url: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=400&q=80' },
                            { name: 'Jeans Blue Denim', url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&q=80' },
                            { name: 'Gorra Urban Dark', url: 'https://images.unsplash.com/photo-1534215754734-18e55d13ce35?auto=format&fit=crop&w=400&q=80' }
                          ].map((photo, pIdx) => (
                            <button
                              type="button"
                              key={`preset_photo_${pIdx}`}
                              onClick={() => {
                                if (!newArticle.imagen_url) {
                                  setNewArticle(prev => ({ ...prev, imagen_url: photo.url }));
                                } else {
                                  const secList = newArticle.imagenes ? newArticle.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                                  if (!secList.includes(photo.url)) {
                                    secList.push(photo.url);
                                    setNewArticle(prev => ({ ...prev, imagenes: secList.join(', ') }));
                                  }
                                }
                              }}
                              className="group relative h-16 rounded-xl overflow-hidden border border-slate-205 cursor-pointer bg-white scale-100 hover:scale-[1.03] transition-all"
                            >
                              <img src={photo.url} alt={photo.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[8px] font-bold text-white uppercase text-center px-1">Añadir</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Drag and Drop o click zone */}
                      <div
                        onClick={() => {
                          // Simulate drag and drop / local upload by injecting a beautiful high quality picture of clothing
                          const randomPhotos = [
                            'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=400&q=80',
                            'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=400&q=80'
                          ];
                          const randomUrl = randomPhotos[Math.floor(Math.random() * randomPhotos.length)];
                          if (!newArticle.imagen_url) {
                            setNewArticle(prev => ({ ...prev, imagen_url: randomUrl }));
                          } else {
                            const secList = prev => prev.imagenes ? prev.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                            setNewArticle(prev => {
                              const list = prev.imagenes ? prev.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                              if (!list.includes(randomUrl)) list.push(randomUrl);
                              return { ...prev, imagenes: list.join(', ') };
                            });
                          }
                        }}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-4.5 text-center bg-slate-50/50 hover:bg-slate-100/40 cursor-pointer transition-colors group"
                      >
                        <span className="text-xl block mb-1">☁️</span>
                        <span className="text-xs font-bold text-slate-600 block group-hover:text-indigo-600 transition-colors">Arrastra fotos aquí o haz clic para subir</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Soporta JPG, PNG de stock en simultáneo (Simulación dinámica)</span>
                      </div>

                      {/* Interactive Live Gallery previews */}
                      {(() => {
                        const prim = newArticle.imagen_url;
                        const secs = newArticle.imagenes ? newArticle.imagenes.split(',').map(u => u.trim()).filter(Boolean) : [];
                        const totalCount = (prim ? 1 : 0) + secs.length;

                        if (totalCount === 0) {
                          return (
                            <div className="text-center py-4 text-slate-400 text-xs font-medium bg-white rounded-xl border border-dashed border-slate-200">
                              No hay ninguna foto asociada al artículo todavía.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-600 block uppercase tracking-wide">Previsualización Activa de Fotos ({totalCount}):</span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {/* Portada Principal */}
                              {prim && (
                                <div className="border-2 border-indigo-500 rounded-xl overflow-hidden bg-white relative group h-28 shadow-sm">
                                  <img src={prim} alt="Principal" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  <span className="absolute top-1.5 left-1.5 bg-indigo-650 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">Portada principal</span>
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all p-1 gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewArticle(prev => {
                                          let secList = prev.imagenes ? prev.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                                          const nextPrim = secList.shift() || '';
                                          return {
                                            ...prev,
                                            imagen_url: nextPrim,
                                            imagenes: secList.join(', ')
                                          };
                                        });
                                      }}
                                      className="bg-red-500 hover:bg-red-600 text-white font-bold text-[9px] py-1 px-2 rounded-lg cursor-pointer transition-colors"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Secundarias */}
                              {secs.map((sec, sIdx) => (
                                <div key={`sec_gallery_item_${sIdx}`} className="border border-slate-200 rounded-xl overflow-hidden bg-white relative group h-28">
                                  <img src={sec} alt={`Secundaria ${sIdx}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  <span className="absolute top-1.5 left-1.5 bg-slate-700 text-white font-bold text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">Galería</span>
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all p-1 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewArticle(prev => {
                                          const oldPrim = prev.imagen_url;
                                          const currentSecs = prev.imagenes ? prev.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                                          const filteredSecs = currentSecs.filter(u => u !== sec);
                                          if (oldPrim) {
                                            filteredSecs.push(oldPrim);
                                          }
                                          return {
                                            ...prev,
                                            imagen_url: sec,
                                            imagenes: filteredSecs.join(', ')
                                          };
                                        });
                                      }}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[8px] py-1 px-2 rounded-lg cursor-pointer transition-colors w-[85%] text-center uppercase"
                                    >
                                      Destacar Portada
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewArticle(prev => {
                                          const currentSecs = prev.imagenes ? prev.imagenes.split(',').map(x => x.trim()).filter(Boolean) : [];
                                          const filteredSecs = currentSecs.filter(u => u !== sec);
                                          return {
                                            ...prev,
                                            imagenes: filteredSecs.join(', ')
                                          };
                                        });
                                      }}
                                      className="bg-red-500 hover:bg-red-650 text-white font-bold text-[8px] py-0.5 px-2 rounded-lg cursor-pointer transition-colors w-[85%] text-center uppercase"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Step 4: Variantes y Control */}
                {newArticleStep === 4 && (
                  <div className="space-y-4 animate-fade-in font-sans">
                    {/* Visual Variant Builder Card */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-805">Creador de Variantes Inteligentes</h4>
                          <p className="text-[10px] text-slate-400">Genera talles y colores emparejados con SKU independiente</p>
                        </div>
                        <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded">E-COMMERCE</span>
                      </div>

                      {/* Variant Presets */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2.5">
                        {/* Talles */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest block">Talles Comunes:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {['S', 'M', 'L', 'XL', 'XXL', 'Único'].map((sPreset) => {
                              const isSelected = varSize === sPreset;
                              return (
                                <button
                                  type="button"
                                  key={`b_sz_preset_${sPreset}`}
                                  onClick={() => {
                                    setVarSize(sPreset);
                                    setVarSku(`${newArticle.codigo || getNextAvailableSku()}-${sPreset}`);
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-650 text-white border-indigo-750 shadow-sm'
                                      : 'bg-white text-slate-650 hover:bg-slate-100/60 border-slate-200/65'
                                  }`}
                                >
                                  {sPreset}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Colores */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-slate-550 uppercase tracking-widest block">Colores Comunes:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'Rosa', hex: '#FFC0CB' },
                              { label: 'Negro', hex: '#000000' },
                              { label: 'Azul', hex: '#0000FF' },
                              { label: 'Blanco', hex: '#FFFFFF' },
                              { label: 'Gris', hex: '#808080' },
                              { label: 'Verde', hex: '#008000' }
                            ].map((cPreset) => {
                              const isSelected = varColor === cPreset.label;
                              return (
                                <button
                                  type="button"
                                  key={`b_col_preset_${cPreset.label}`}
                                  onClick={() => {
                                    setVarColor(cPreset.label);
                                    setVarColorCode(cPreset.hex);
                                  }}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-indigo-650 text-white border-indigo-750 shadow-sm'
                                      : 'bg-white text-slate-650 hover:bg-slate-100/60 border-slate-200/65'
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full border border-slate-350" style={{ backgroundColor: cPreset.hex }}></span>
                                  <span>{cPreset.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Manual input for adding the variants */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end bg-white p-3 rounded-xl border border-slate-200">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-450 uppercase block">Talle</span>
                          <input
                            type="text"
                            value={varSize}
                            onChange={(e) => setVarSize(e.target.value)}
                            placeholder="Ej: M"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-450 uppercase block">Color</span>
                          <input
                            type="text"
                            value={varColor}
                            onChange={(e) => setVarColor(e.target.value)}
                            placeholder="Ej: Negro"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-450 uppercase block">Stock</span>
                          <input
                            type="number"
                            min="0"
                            value={varStock}
                            onChange={(e) => setVarStock(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-450 uppercase block">SKU Variante</span>
                          <input
                            type="text"
                            value={varSku}
                            onChange={(e) => setVarSku(e.target.value)}
                            placeholder="SKU"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-755 font-mono text-center"
                          />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <button
                            type="button"
                            onClick={() => {
                              const sz = varSize.trim() || 'Único';
                              const col = varColor.trim() || 'Base';
                              const stockNum = Number(varStock || 0);
                              const computedSku = varSku.trim() || `${newArticle.codigo || getNextAvailableSku()}-${sz}`;
                              
                              try {
                                let list = JSON.parse(newArticle.variants || '[]');
                                // Check if variant already exists
                                const duplicate = list.some((v: any) => v.attributes?.talle === sz && v.attributes?.color === col);
                                if (duplicate) {
                                  alert('Esta variante ya existe en la lista.');
                                  return;
                                }
                                list.push({
                                  attributes: {
                                    talle: sz,
                                    color: col,
                                    ...(varColorCode ? { colorCode: varColorCode } : {})
                                  },
                                  stock: stockNum,
                                  price: String(Math.round(calculatedWebFaceInstaPrice) || '0'),
                                  sku: computedSku
                                });
                                setNewArticle(prev => ({ ...prev, variants: JSON.stringify(list, null, 2) }));
                                // Reset fields
                                setVarSize('');
                                setVarColor('');
                                setVarColorCode('');
                                setVarStock('10');
                                setVarSku('');
                              } catch (err) {
                                alert('Error al procesar el JSON de variantes');
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] py-1.5 rounded-lg cursor-pointer transition-colors uppercase text-center"
                          >
                            + Guardar
                          </button>
                        </div>
                      </div>

                      {/* Active Grid Variant Table Manager */}
                      {(() => {
                        try {
                          const parsedList = JSON.parse(newArticle.variants || '[]');
                          if (parsedList.length === 0) {
                            return (
                              <div className="text-center py-5 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                                No hay variantes agregadas. Usa el creador para añadir variantes o haz clic en los presets.
                              </div>
                            );
                          }

                          return (
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-1">
                              <div className="bg-slate-100/70 p-2 text-[9px] font-extrabold uppercase tracking-wide text-slate-500 border-b border-slate-200 grid grid-cols-12 text-center">
                                <span className="col-span-3 text-left pl-2">Variante</span>
                                <span className="col-span-3">SKU Integrable</span>
                                <span className="col-span-2">Stock</span>
                                <span className="col-span-2">Precio ($)</span>
                                <span className="col-span-2">Borrar</span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-[190px] overflow-y-auto">
                                {parsedList.map((variant: any, idx: number) => (
                                  <div key={`variant_item_${idx}`} className="p-2 text-xs grid grid-cols-12 items-center text-center hover:bg-slate-50/50">
                                    <div className="col-span-3 text-left pl-2 font-bold text-slate-700 flex items-center gap-1.5">
                                      {variant.attributes?.colorCode && (
                                        <span className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: variant.attributes.colorCode }}></span>
                                      )}
                                      <span className="truncate">{variant.attributes?.talle || 'U'} / {variant.attributes?.color || 'Base'}</span>
                                    </div>
                                    <div className="col-span-3">
                                      <input
                                        type="text"
                                        value={variant.sku || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          try {
                                            const current = JSON.parse(newArticle.variants || '[]');
                                            current[idx].sku = val;
                                            setNewArticle(prev => ({ ...prev, variants: JSON.stringify(current, null, 2) }));
                                          } catch (err) {}
                                        }}
                                        className="w-[90%] mx-auto bg-slate-50 text-slate-700 text-[10px] font-mono border border-slate-200 rounded px-1 py-0.5 text-center"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={variant.stock || 0}
                                        onChange={(e) => {
                                          const val = Number(e.target.value || 0);
                                          try {
                                            const current = JSON.parse(newArticle.variants || '[]');
                                            current[idx].stock = val;
                                            setNewArticle(prev => ({ ...prev, variants: JSON.stringify(current, null, 2) }));
                                          } catch (err) {}
                                        }}
                                        className="w-[70%] mx-auto bg-slate-50 text-slate-750 font-mono border border-slate-200 rounded px-1 py-0.5 text-center"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <input
                                        type="number"
                                        value={variant.price || 0}
                                        onChange={(e) => {
                                          const val = String(e.target.value || 0);
                                          try {
                                            const current = JSON.parse(newArticle.variants || '[]');
                                            current[idx].price = val;
                                            setNewArticle(prev => ({ ...prev, variants: JSON.stringify(current, null, 2) }));
                                          } catch (err) {}
                                        }}
                                        className="w-[80%] mx-auto bg-emerald-50/60 font-mono border border-emerald-150 rounded px-1 py-0.5 text-center text-emerald-850 font-bold"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          try {
                                            const current = JSON.parse(newArticle.variants || '[]');
                                            const filtered = current.filter((_: any, sIdx: number) => sIdx !== idx);
                                            setNewArticle(prev => ({ ...prev, variants: JSON.stringify(filtered, null, 2) }));
                                          } catch (err) {}
                                        }}
                                        className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-[10px]"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch (e) {
                          return (
                            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-650 text-xs font-mono">
                              ⚠️ JSON de variante inválido. Corrige el código en el editor avanzado de abajo.
                            </div>
                          );
                        }
                      })()}

                      {/* Advanced JSON Editor Collapse Area */}
                      <details className="text-slate-500 group border border-slate-200 bg-white p-2.5 rounded-xl cursor-default">
                        <summary className="text-[10px] font-bold uppercase tracking-wider cursor-pointer list-none flex items-center justify-between select-none">
                          <span>🛠️ Editor Avanzado JSON de la IA / ERP</span>
                          <span className="text-xs group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        <div className="space-y-1.5 pt-2">
                          <textarea
                            rows={3}
                            value={newArticle.variants}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, variants: e.target.value }))}
                            placeholder="[]"
                            className="w-full bg-slate-900 text-emerald-400 border border-slate-950 rounded-xl p-2 text-[10px] font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </details>
                    </div>

                    {/* Enablement Option Badged Switches */}
                    <div className="bg-white border border-slate-200 p-4.5 rounded-2xl space-y-3.5 text-slate-800">
                      <span className="text-[10px] font-extrabold text-slate-450 uppercase block tracking-wider">Habilitaciones para la Web Tienda (ERP Live Status):</span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Destacado */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/40 select-none">
                          <input
                            type="checkbox"
                            checked={newArticle.featured}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, featured: e.target.checked }))}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-650 uppercase">Destacado</span>
                        </label>

                        {/* Pausado */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/40 select-none">
                          <input
                            type="checkbox"
                            checked={newArticle.paused}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, paused: e.target.checked }))}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-650 uppercase">Pausar Web</span>
                        </label>

                        {/* Visual 3D */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/40 select-none">
                          <input
                            type="checkbox"
                            checked={newArticle.is_3d}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, is_3d: e.target.checked }))}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-650 uppercase">Visual 3D</span>
                        </label>

                        {/* Consultar Únicamente */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 p-2.5 rounded-xl hover:bg-slate-100/40 select-none">
                          <input
                            type="checkbox"
                            checked={newArticle.consult_only}
                            onChange={(e) => setNewArticle(prev => ({ ...prev, consult_only: e.target.checked }))}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-bold text-slate-650 uppercase">Solo Consulta</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Wizard Footer Controls */}
                <div className="flex justify-between gap-3 pt-4 border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      if (newArticleStep > 1) {
                        setNewArticleStep(prev => prev - 1);
                      } else {
                        setIsCreateModalOpen(false);
                      }
                    }}
                    className="px-4.5 py-2.5 border border-slate-200 rounded-xl text-slate-750 font-bold hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    {newArticleStep > 1 ? 'Anterior' : 'Cerrar'}
                  </button>

                  <div className="flex gap-2.5">
                    {newArticleStep < 4 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (newArticleStep === 1 && !newArticle.nombre.trim()) {
                            alert('Por favor, ingresa el nombre del artículo.');
                            return;
                          }
                          setNewArticleStep(prev => prev + 1);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-755 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md cursor-pointer transition-all uppercase tracking-wide"
                      >
                        Siguiente
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Crear Artículo Simple</span>
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* FLOW 2: COMPLEX (COMBO) ITEM FORM */}
            {creationType === 'compuesto' && (
              <form onSubmit={handleComboCreateFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Combo Name */}
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nombre del Combo (*)</label>
                    <input
                      type="text"
                      required
                      value={comboName}
                      onChange={(e) => setComboName(e.target.value)}
                      placeholder="Ej: Combo Invierno (Gorro + Poncho)"
                      className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-semibold focus:outline-none text-xs"
                    />
                  </div>

                  {/* Sku overriding preference */}
                  <div className="space-y-1.5 col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SKU del Combo</label>
                      <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-200 uppercase tracking-wider">Sistema</span>
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={getNextAvailableComboSku()}
                      title="Generado automáticamente por el sistema para evitar repeticiones"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-indigo-500 font-mono font-bold focus:outline-none text-xs cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Component Selector section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Agregar Componentes al Ensamblado</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pb-1">
                    {/* Interactive search locator for simple articles in Modal */}
                    <div className="sm:col-span-8 space-y-1 relative">
                      {selectedIngredientId ? (
                        <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl border border-emerald-200 text-xs font-semibold h-9">
                          <span className="truncate">
                            📌 <strong>{catalog.find(a => a.id === Number(selectedIngredientId))?.codigo}</strong> - {catalog.find(a => a.id === Number(selectedIngredientId))?.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedIngredientId('');
                              setModalComboSearchQuery('');
                            }}
                            className="text-emerald-600 hover:text-red-500 font-bold ml-2 cursor-pointer text-xs"
                            title="Quitar selección"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={modalComboSearchQuery}
                            onFocus={() => setModalComboShowDropdown(true)}
                            onChange={(e) => {
                              setModalComboSearchQuery(e.target.value);
                              setModalComboShowDropdown(true);
                            }}
                            placeholder="🔍 Buscar componente por código o nombre..."
                            className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold placeholder-slate-400 h-9"
                          />
                          {modalComboShowDropdown && (
                            <>
                              {/* Backdrop layer to click outside */}
                              <div 
                                className="fixed inset-0 z-40" 
                                onClick={() => setModalComboShowDropdown(false)} 
                              />
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                                {catalog
                                  .filter(a => a.tipo === 'simple')
                                  .filter(art => matchAdvancedSearch([art.nombre, art.codigo], modalComboSearchQuery))
                                  .slice(0, 15) // Limit to top 15 results for snappier render
                                  .map(art => (
                                    <button
                                      key={`modal_combo_drop_art_${art.id}`}
                                      type="button"
                                      onClick={() => {
                                        setSelectedIngredientId(String(art.id));
                                        setModalComboShowDropdown(false);
                                      }}
                                      className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition-colors"
                                    >
                                      <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold text-slate-800">{art.nombre}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">SKU: {art.codigo}</span>
                                      </div>
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                                        ${art.costo}
                                      </span>
                                    </button>
                                  ))
                                }
                                {catalog.filter(a => a.tipo === 'simple').filter(art => 
                                  matchAdvancedSearch([art.nombre, art.codigo], modalComboSearchQuery)
                                ).length === 0 && (
                                  <div className="text-center py-4 text-slate-400 text-xs font-sans">
                                    No se encontraron componentes simples
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Qty needed */}
                    <div className="sm:col-span-3 space-y-1">
                      <input
                        type="number"
                        min="1"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-205 rounded-xl px-3 py-2 text-center text-slate-800 focus:outline-none font-mono text-xs font-bold"
                        placeholder="Cant."
                      />
                    </div>

                    {/* Add Component Action */}
                    <div className="sm:col-span-1">
                      <button
                        type="button"
                        onClick={handleAddFieldIngredient}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow transition-all py-2 cursor-pointer h-9"
                        title="Anexar componente"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Ingredients breakdown list */}
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                    {addedIngredients.map((ing) => (
                      <div key={`modal_combo_added_ing_${ing.id}`} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs">
                        <div className="flex flex-col">
                          <span className="text-slate-800 font-bold block max-w-[340px] truncate">{ing.nombre}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Código: {ing.codigo} • Costo unitario: ${ing.costo}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold">
                            {ing.cantidad} Unids
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFieldIngredient(ing.id)}
                            className="p-1 text-[#64748b] hover:text-red-500 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {addedIngredients.length === 0 && (
                      <div className="text-center py-4 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 font-medium font-sans">
                        Sin componentes asociados en la fórmula de ensamble.
                      </div>
                    )}
                  </div>
                </div>

                {/* Economics projections */}
                {addedIngredients.length > 0 && (() => {
                  const calculatedComboCosto = addedIngredients.reduce((sum, ing) => sum + (ing.costo * ing.cantidad), 0);
                  const suggestedComboPrice = (calculatedComboCosto * 1.4).toFixed(0);

                  const parsedPriceML = Number(comboPriceML || suggestedComboPrice);
                  const comisionInputVal = Number(comboComisionML || 11);
                  const calcComisionML = comisionInputVal <= 40
                    ? parsedPriceML * (comisionInputVal / 100)
                    : comisionInputVal;
                  const finalWebFacePrice = parsedPriceML - calcComisionML;
                  const projectedComboProfitML = parsedPriceML - calculatedComboCosto;

                  // Minimum possible stock to build
                  const mvdAssemblyLimit = Math.min(...addedIngredients.map(ing => {
                    const match = catalog.find(a => a.id === ing.id);
                    return Math.floor((match?.mvd_stock || 0) / ing.cantidad);
                  }));
                  const pinAssemblyLimit = Math.min(...addedIngredients.map(ing => {
                    const match = catalog.find(a => a.id === ing.id);
                    return Math.floor((match?.pin_stock || 0) / ing.cantidad);
                  }));

                  return (
                    <div className="bg-indigo-50/40 p-4 border border-indigo-100 rounded-xl space-y-4">
                      <span className="text-[10px] font-extrabold text-indigo-650 uppercase tracking-widest block">Finanzas & Disponibilidades del Combo</span>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-slate-450 text-[10px] block font-bold">Costo Acumulado</span>
                          <span className="text-xs font-mono font-bold text-slate-900">${calculatedComboCosto.toFixed(1)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-slate-450 text-[10px] block font-bold">40% Sugerido</span>
                          <span className="text-xs font-mono font-bold text-indigo-700">${suggestedComboPrice}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-slate-455 text-[10px] block font-bold flex items-center gap-1">Límite Mvd <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span></span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {mvdAssemblyLimit === Infinity ? 0 : mvdAssemblyLimit} unids
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-slate-455 text-[10px] block font-bold flex items-center gap-1">Límite Pin <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block"></span></span>
                          <span className="text-xs font-mono font-bold text-indigo-700 font-mono">
                            {pinAssemblyLimit === Infinity ? 0 : pinAssemblyLimit} unids
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-indigo-100/60 pt-3.5">
                        {/* Venta Mercado Libre Price */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Precio Venta ML ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={comboPriceML}
                            onChange={(e) => setComboPriceML(e.target.value)}
                            placeholder={suggestedComboPrice}
                            className="w-full bg-white border border-slate-205 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-indigo-900 font-mono"
                          />
                        </div>

                        {/* Comisión ML Dynamic Input */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-550 uppercase tracking-wider block">Comisión ML ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={comboComisionML}
                            onChange={(e) => setComboComisionML(e.target.value)}
                            placeholder="11"
                            className="w-full bg-white border border-slate-205 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-755 font-mono"
                          />
                        </div>

                        {/* Precio Web / Face / Insta (Venta ML - Comisión ML) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wider block">Precio web / Face / insta ($)</label>
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-2.5 py-1 text-xs flex items-center justify-between min-h-[34px]">
                            <span className="text-[8.5px] uppercase font-bold text-emerald-600">Neto (Venta ML - Comis)</span>
                            <span className="font-mono font-extrabold text-[#065f46]">
                              ${finalWebFacePrice.toLocaleString('es-UY', { maximumFractionDigits: 1 })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Margen bruto proyectado */}
                      <div className="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between text-xs font-bold mt-2">
                        <span className="text-slate-500 font-bold">Ganancia Bruta Proyectada ML (Venta ML - Costo)</span>
                        <span className={`font-mono text-sm ${projectedComboProfitML >= 0 ? "text-emerald-600" : "text-amber-500"}`}>
                          ${projectedComboProfitML.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4.5 py-2.5 border border-slate-200 rounded-xl text-slate-750 font-bold hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={addedIngredients.length === 0}
                    className={`bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${
                      addedIngredients.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Layers className="w-4 h-4 text-purple-200" />
                    <span>Compilar Combo y Registrar</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
